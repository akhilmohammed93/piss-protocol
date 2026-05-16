import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { LevelData } from "./levelGenerator";
export type { LevelData };

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const highscores = pgTable("highscores", {
  id: serial("id").primaryKey(),
  playerName: text("player_name").notNull(),
  score: integer("score").notNull(),
});

export const levelConfigs = pgTable("level_configs", {
  id: serial("id").primaryKey(),
  levelNumber: integer("level_number").notNull().unique(),
  batchNumber: integer("batch_number").notNull(),
  config: text("config").notNull(),
  configHash: text("config_hash").notNull(),
  difficulty: integer("difficulty").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertHighscoreSchema = createInsertSchema(highscores).pick({
  playerName: true,
  score: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertHighscore = z.infer<typeof insertHighscoreSchema>;
export type Highscore = typeof highscores.$inferSelect;

export const insertLevelConfigSchema = createInsertSchema(levelConfigs).omit({ id: true });
export type InsertLevelConfig = z.infer<typeof insertLevelConfigSchema>;
export type LevelConfig = typeof levelConfigs.$inferSelect;

// Game state interfaces
export interface GameLevel {
  urinalCount: number;
  occupiedPositions: number[];
  bossPosition: number | null; // The index of the boss character if present
  pervPositions: number[]; // Array of indexes for perv characters (can be multiple in rare cases)
  uncleanPositions: number[]; // Indexes of urinals that are unclean
}

export interface GameState {
  currentLevel: number;
  score: number;
  levelComplete: boolean;
  selectedUrinal: number | null;
  lives: number;
  playerName: string;
  gameOver: boolean;
  maxLevel: number;
  waitingForTurn: boolean; // Track if player is "holding it in"
  isPissmaster: boolean; // Track if player has completed all 250 levels
  devMode: boolean; // Special developer testing mode
  devFeedback: string; // Feedback for the current level in dev mode
}

export interface SelectionResult {
  valid: boolean;
  message: string;
  score?: number; // Points awarded for this selection (only for valid selections)
  isBossFailure?: boolean; // Special flag for boss-related failures
  isPervFailure?: boolean; // Special flag for perv-related failures (eye contact)
  isUnclean?: boolean; // Flag for unclean urinal selections
  needToWait?: boolean; // Flag for when user should "hold it in"
}
