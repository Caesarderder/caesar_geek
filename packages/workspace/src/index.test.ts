import { execFile } from "node:child_process";
import { mkdtemp, mkdir, realpath, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import {
  assertInsideScope,
  assertIssueSessionCwd,
  createAwesomeLayout,
  createIssueWorktree,
  createWorldIssueLayout,
  importGitRepository,
  listGitBranches,
  scanGitRepositories,
  slugify
} from "./index.js";

const execFileAsync = promisify(execFile);

describe("workspace service", () => {
  it("creates the expected awesome layout", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "awesome-"));
    await createAwesomeLayout({ name: "My Awesome", rootPath: root });

    await expect(stat(path.join(root, ".caesar-geek", "tasks"))).resolves.toBeTruthy();
    await expect(stat(path.join(root, ".caesar-geek", "logs"))).resolves.toBeTruthy();
    await expect(stat(path.join(root, ".caesar-geek", "sessions"))).resolves.toBeTruthy();
    await expect(stat(path.join(root, "ultraworks"))).resolves.toBeTruthy();
    await expect(stat(path.join(root, "artifacts"))).resolves.toBeTruthy();
  });

  it("normalizes slugs and rejects path escapes", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "scope-"));
    await mkdir(path.join(root, "inside"));

    expect(slugify("Local AI Workspace!")).toBe("local-ai-workspace");
    await expect(assertInsideScope(path.join(root, "inside"), root)).resolves.toBe(path.join(root, "inside"));
    await expect(assertInsideScope(path.join(root, "..", "outside"), root)).rejects.toThrow("outside scope");
  });

  it("creates Issue-controlled workspace layout and enforces session cwd scope", async () => {
    const worldRoot = await mkdtemp(path.join(tmpdir(), "world-"));
    const issue = await createWorldIssueLayout({ worldRootPath: worldRoot, title: "Fix Cloud Agent" });

    await expect(stat(issue.worktreesPath)).resolves.toBeTruthy();
    expect(issue.path).toContain(path.join(worldRoot, "issues"));
    await expect(assertIssueSessionCwd({ issueRootPath: issue.path, worktreePaths: [] })).rejects.toThrow("at least one worktree");
    await expect(assertIssueSessionCwd({ issueRootPath: issue.path, worktreePaths: [path.join(issue.worktreesPath, "repo")], cwd: issue.path })).resolves.toBe(
      issue.path
    );
    await expect(
      assertIssueSessionCwd({ issueRootPath: issue.path, worktreePaths: [path.join(issue.worktreesPath, "repo")], cwd: path.join(worldRoot, "..") })
    ).rejects.toThrow("outside scope");
  });

  it("scans fixed roots, lists branches, and creates Issue-scoped git worktrees", async () => {
    const worldRoot = await mkdtemp(path.join(tmpdir(), "world-git-"));
    const repoPath = path.join(worldRoot, "repos", "fixture");
    await createFixtureRepo(repoPath);
    const issue = await createWorldIssueLayout({ worldRootPath: worldRoot, title: "Branch Work", id: "issue_test" });

    const repos = await scanGitRepositories({ rootPath: worldRoot, maxDepth: 3 });
    expect(repos).toEqual([expect.objectContaining({ name: "fixture", path: await realpath(repoPath), defaultBranch: "main" })]);

    const branches = await listGitBranches({ repoPath });
    expect(branches).toEqual(["feature/cloud-agent", "main"]);

    const worktree = await createIssueWorktree({
      issue,
      repo: repos[0]!,
      branch: "feature/cloud-agent",
      id: "worktree_test"
    });
    expect(worktree.path).toContain(issue.worktreesPath);
    await expect(stat(path.join(worktree.path, "README.md"))).resolves.toBeTruthy();
  });

  it("imports git URLs without accepting browser-supplied credentials", async () => {
    const worldRoot = await mkdtemp(path.join(tmpdir(), "world-import-"));
    const execGitCalls: string[][] = [];
    const execGit = async (_file: string, args: string[]) => {
      execGitCalls.push(args);
      return { stdout: "", stderr: "" };
    };

    await expect(importGitRepository({ worldRootPath: worldRoot, gitUrl: "https://user:pass@example.test/repo.git", execGit })).rejects.toThrow(
      "credentials"
    );
    await expect(
      importGitRepository({ worldRootPath: worldRoot, gitUrl: "https://example.test/repo.git", execGit, ...( { token: "secret" } as object) })
    ).rejects.toThrow("credentials");
    expect(execGitCalls).toEqual([]);
  });
});

async function createFixtureRepo(repoPath: string): Promise<void> {
  await mkdir(repoPath, { recursive: true });
  await execFileAsync("git", ["init", "--initial-branch=main"], { cwd: repoPath });
  await execFileAsync("git", ["config", "user.email", "test@example.test"], { cwd: repoPath });
  await execFileAsync("git", ["config", "user.name", "Test User"], { cwd: repoPath });
  await writeFile(path.join(repoPath, "README.md"), "# Fixture\n");
  await execFileAsync("git", ["add", "README.md"], { cwd: repoPath });
  await execFileAsync("git", ["commit", "-m", "initial"], { cwd: repoPath });
  await execFileAsync("git", ["branch", "feature/cloud-agent"], { cwd: repoPath });
}
