// GitHub integration via Replit connectors-sdk
// Uses the OAuth token established through the Replit GitHub connector

import { ReplitConnectors } from "@replit/connectors-sdk";
import fs from "fs";
import path from "path";

const connectors = new ReplitConnectors();

interface GitHubUser {
  login: string;
  name: string | null;
}

interface GitHubRepo {
  full_name: string;
  html_url: string;
  default_branch: string;
}

async function ghGet(endpoint: string) {
  const res = await connectors.proxy("github", endpoint, { method: "GET" });
  const data = await res.json() as any;
  if (data?.message === "Not Found" || data?.message === "Bad credentials") {
    throw new Error(data.message);
  }
  return data;
}

async function ghPost(endpoint: string, body: unknown) {
  const res = await connectors.proxy("github", endpoint, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
  return res.json();
}

async function ghPut(endpoint: string, body: unknown) {
  const res = await connectors.proxy("github", endpoint, {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
  return res.json();
}

// Collect all project source files, returning { path, content (base64) }[]
function collectFiles(dir: string, baseDir: string, skipDirs: Set<string>): Array<{ path: string; content: string }> {
  const results: Array<{ path: string; content: string }> = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".gitignore") continue;
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) continue;
      results.push(...collectFiles(fullPath, baseDir, skipDirs));
    } else {
      // Skip very large files (> 800 KB) and binary extensions
      const ext = path.extname(entry.name).toLowerCase();
      const binaryExts = new Set([".png", ".jpg", ".jpeg", ".gif", ".ico", ".woff", ".woff2", ".ttf", ".eot", ".mp3", ".mp4", ".wav", ".webp", ".svg.bak"]);
      if (binaryExts.has(ext)) continue;

      let rawContent: Buffer;
      try {
        rawContent = fs.readFileSync(fullPath);
      } catch {
        continue;
      }
      if (rawContent.byteLength > 800_000) continue;

      results.push({
        path: relPath,
        content: rawContent.toString("base64"),
      });
    }
  }
  return results;
}

export async function getGitHubUser(): Promise<GitHubUser> {
  return ghGet("/user");
}

export async function listUserRepos(): Promise<GitHubRepo[]> {
  return ghGet("/user/repos?per_page=100&sort=updated");
}

export async function pushToGitHub(repoName: string): Promise<{ repoUrl: string; created: boolean }> {
  const user = await getGitHubUser() as GitHubUser;
  const login = user.login;

  // Check if repo already exists
  let repo: GitHubRepo;
  let created = false;
  try {
    repo = await ghGet(`/repos/${login}/${repoName}`) as GitHubRepo;
  } catch {
    // Create it
    repo = await ghPost("/user/repos", {
      name: repoName,
      description: "🚽 Urinal Protocol — the ultimate bathroom etiquette puzzle game with 250 levels!",
      private: false,
      auto_init: false,
    }) as GitHubRepo;
    created = true;
  }

  const skipDirs = new Set(["node_modules", ".git", "dist", ".cache", ".local", "coverage", ".replit", "__pycache__"]);
  const projectRoot = process.cwd();
  const files = collectFiles(projectRoot, projectRoot, skipDirs);

  // Get or create the default branch ref
  let baseSha: string | null = null;
  let branch = repo.default_branch || "main";
  try {
    const refData = await ghGet(`/repos/${login}/${repoName}/git/refs/heads/${branch}`);
    baseSha = (refData as any).object?.sha ?? null;
  } catch {
    // Brand new repo — no commits yet
    baseSha = null;
  }

  // Create a tree with all files
  const treeItems = files.map((f) => ({
    path: f.path.replace(/\\/g, "/"),
    mode: "100644",
    type: "blob",
    content: Buffer.from(f.content, "base64").toString("utf8"),
  }));

  const treePayload: Record<string, unknown> = { tree: treeItems };
  if (baseSha) treePayload.base_tree = baseSha;

  const treeResult = await ghPost(`/repos/${login}/${repoName}/git/trees`, treePayload) as any;

  // Create commit
  const commitPayload: Record<string, unknown> = {
    message: "🚽 Push from Replit — Urinal Protocol game",
    tree: treeResult.sha,
  };
  if (baseSha) commitPayload.parents = [baseSha];

  const commitResult = await ghPost(`/repos/${login}/${repoName}/git/commits`, commitPayload) as any;

  // Update (or create) the branch ref
  if (baseSha) {
    await ghPost(`/repos/${login}/${repoName}/git/refs`, {
      ref: `refs/heads/${branch}`,
      sha: commitResult.sha,
    }).catch(() =>
      // ref already exists — force-update it
      connectors.proxy("github", `/repos/${login}/${repoName}/git/refs/heads/${branch}`, {
        method: "PATCH",
        body: JSON.stringify({ sha: commitResult.sha, force: true }),
        headers: { "Content-Type": "application/json" },
      })
    );
  } else {
    await ghPost(`/repos/${login}/${repoName}/git/refs`, {
      ref: `refs/heads/${branch}`,
      sha: commitResult.sha,
    });
  }

  return { repoUrl: repo.html_url, created };
}
