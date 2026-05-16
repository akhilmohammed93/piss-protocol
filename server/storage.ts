import { users, highscores, levelConfigs, type User, type InsertUser, type Highscore, type InsertHighscore, type LevelData } from "@shared/schema";
import { db } from "./db";
import { desc, eq, asc } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getHighscores(): Promise<Highscore[]>;
  saveHighscore(highscore: InsertHighscore): Promise<Highscore>;
  getLevelBatch(batchNumber: number): Promise<LevelData[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(_id: number): Promise<User | undefined> {
    return undefined;
  }

  async getUserByUsername(_username: string): Promise<User | undefined> {
    return undefined;
  }

  async createUser(_insertUser: InsertUser): Promise<User> {
    throw new Error("Not implemented");
  }

  async getHighscores(): Promise<Highscore[]> {
    return db
      .select()
      .from(highscores)
      .orderBy(desc(highscores.score))
      .limit(20);
  }

  async saveHighscore(insertHighscore: InsertHighscore): Promise<Highscore> {
    const [result] = await db
      .insert(highscores)
      .values(insertHighscore)
      .returning();
    return result;
  }

  async getLevelBatch(batchNumber: number): Promise<LevelData[]> {
    const rows = await db
      .select()
      .from(levelConfigs)
      .where(eq(levelConfigs.batchNumber, batchNumber))
      .orderBy(asc(levelConfigs.levelNumber));

    return rows.map(row => JSON.parse(row.config) as LevelData);
  }
}

export const storage = new DatabaseStorage();
