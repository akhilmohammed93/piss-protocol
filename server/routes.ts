import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getGitHubUser, listUserRepos, pushToGitHub } from "./github";

export async function registerRoutes(app: Express): Promise<Server> {
  // ── Game highscores ──────────────────────────────────────────────────────────
  app.get('/api/game/highscores', async (req, res) => {
    try {
      const highscores = await storage.getHighscores();
      res.json(highscores);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch highscores' });
    }
  });

  app.post('/api/game/highscores', async (req, res) => {
    try {
      const { playerName, score } = req.body;
      if (!playerName || typeof score !== 'number') {
        return res.status(400).json({ error: 'Invalid highscore data' });
      }
      const newHighscore = await storage.saveHighscore({ playerName, score });
      res.json(newHighscore);
    } catch (error) {
      res.status(500).json({ error: 'Failed to save highscore' });
    }
  });

  // ── Level batch endpoint ─────────────────────────────────────────────────────
  app.get('/api/game/levels/batch/:n', async (req, res) => {
    try {
      const n = parseInt(req.params.n, 10);
      if (isNaN(n) || n < 1) {
        return res.status(400).json({ error: 'Invalid batch number' });
      }
      const levels = await storage.getLevelBatch(n);
      if (levels.length === 0) {
        return res.status(404).json({ error: 'Batch not found' });
      }
      res.json(levels);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch level batch' });
    }
  });

  // ── GitHub integration ───────────────────────────────────────────────────────
  // Returns the authenticated GitHub user's login + name
  app.get('/api/github/user', async (_req, res) => {
    try {
      const user = await getGitHubUser();
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Failed to fetch GitHub user' });
    }
  });

  // Returns the user's repositories (name + html_url)
  app.get('/api/github/repos', async (_req, res) => {
    try {
      const repos = await listUserRepos();
      res.json(repos);
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Failed to list repos' });
    }
  });

  // Push the project to a GitHub repo (creates it if it doesn't exist)
  // Body: { repoName: string }
  app.post('/api/github/push', async (req, res) => {
    try {
      const { repoName } = req.body;
      if (!repoName || typeof repoName !== 'string') {
        return res.status(400).json({ error: 'repoName is required' });
      }
      // Sanitise: GitHub repo names allow alphanumeric, hyphens, underscores, dots
      const safeName = repoName.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 100);
      const result = await pushToGitHub(safeName);
      res.json(result);
    } catch (error: any) {
      console.error('GitHub push error:', error);
      res.status(500).json({ error: error?.message || 'Failed to push to GitHub' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
