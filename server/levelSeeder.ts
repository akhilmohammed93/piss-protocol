import { createHash } from "crypto";
import { db } from "./db";
import { levelConfigs } from "@shared/schema";
import { generateLevel } from "@shared/levelGenerator";
import { sql } from "drizzle-orm";

const TOTAL_LEVELS = 500;
const LEVELS_PER_BATCH = 5;

function batchForLevel(level: number): number {
  return Math.ceil(level / LEVELS_PER_BATCH);
}

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

export async function seedLevels(): Promise<void> {
  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(levelConfigs);

  const existingCount = countRow?.count ?? 0;

  if (existingCount >= TOTAL_LEVELS) {
    console.log(`[seeder] level_configs already has ${existingCount} rows — skipping seed.`);
    return;
  }

  console.log(`[seeder] Seeding ${TOTAL_LEVELS} levels (existing: ${existingCount})…`);

  // Track hashes we've already used to prefer unique configs (best-effort)
  const usedHashes = new Set<string>();

  // Load existing hashes from DB so we don't repeat configs that are already stored
  const existing = await db.select({ configHash: levelConfigs.configHash }).from(levelConfigs);
  for (const row of existing) usedHashes.add(row.configHash);

  let inserted = 0;

  for (let level = 1; level <= TOTAL_LEVELS; level++) {
    let bestConfig = null;
    let bestHash = "";

    // Try multiple seeds — pick first config with a unique hash
    for (let attempt = 0; attempt < 50; attempt++) {
      const seed = level * 31337 + attempt * 997;
      const candidate = generateLevel(level, seed);
      const candidateJson = JSON.stringify(candidate);
      const candidateHash = sha256(candidateJson);

      if (!usedHashes.has(candidateHash)) {
        bestConfig = candidate;
        bestHash = candidateHash;
        usedHashes.add(candidateHash);
        break;
      }
      // Keep first config as fallback if all attempts collide
      if (!bestConfig) {
        bestConfig = candidate;
        bestHash = candidateHash;
      }
    }

    if (!bestConfig) continue;

    const configJson = JSON.stringify(bestConfig);
    const batch = batchForLevel(level);

    await db
      .insert(levelConfigs)
      .values({
        levelNumber: level,
        batchNumber: batch,
        config: configJson,
        configHash: bestHash,
        difficulty: bestConfig.difficulty,
      })
      .onConflictDoNothing(); // Skip if level_number already exists
    inserted++;
  }

  console.log(`[seeder] Done. Inserted: ${inserted} / ${TOTAL_LEVELS}`);
}
