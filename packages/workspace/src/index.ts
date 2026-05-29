import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readdir, realpath, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { Awesome, RegistryRecord, Ultrawork } from "@caesar-geek/shared";
import { nowIso } from "@caesar-geek/shared";

const execFileAsync = promisify(execFile);

type GitExec = (file: string, args: string[]) => Promise<{ stdout: string; stderr: string }>;

export type WorkspacePaths = {
  appDataDir: string;
  registryDbPath: string;
  localRepoRootPath: string;
  issueRootPath: string;
};

export type WorldIssue = {
  id: string;
  title: string;
  slug: string;
  path: string;
  worktreesPath: string;
  createdAt: string;
};

export type WorldRepoRecord = {
  id: string;
  name: string;
  path: string;
  defaultBranch: string | null;
  headSha: string | null;
};

export type WorldWorktree = {
  id: string;
  issueId: string;
  repoId: string;
  name: string;
  branch: string;
  path: string;
  createdAt: string;
};

export function defaultWorkspacePaths(): WorkspacePaths {
  const appDataDir = process.env.CAESAR_GEEK_HOME ?? path.join(homedir(), ".caesar-geek");
  const caesarHomeDir = process.env.CAESAR_HOME ?? path.join(homedir(), ".caesar");
  return {
    appDataDir,
    registryDbPath: path.join(appDataDir, "registry.sqlite"),
    localRepoRootPath: process.env.CAESAR_REPO_ROOT ?? path.join(homedir(), "workspace", "repos"),
    issueRootPath: process.env.CAESAR_ISSUE_ROOT ?? path.join(caesarHomeDir, "issues")
  };
}

export function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "item";
}

export async function assertInsideScope(candidate: string, scope: string): Promise<string> {
  const resolvedCandidate = path.resolve(candidate);
  const resolvedScope = path.resolve(scope);
  const relative = path.relative(resolvedScope, resolvedCandidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path ${candidate} is outside scope ${scope}`);
  }
  return resolvedCandidate;
}

export async function createWorldIssueLayout(input: {
  worldRootPath: string;
  title: string;
  id?: string;
}): Promise<WorldIssue> {
  const createdAt = nowIso();
  const id = input.id ?? `issue_${randomUUID()}`;
  const slug = slugify(input.title);
  const issuesRoot = path.join(path.resolve(input.worldRootPath), "issues");
  const issuePath = path.join(issuesRoot, `${slug}-${id}`);
  await assertInsideScope(issuePath, issuesRoot);

  const worktreesPath = path.join(issuePath, "worktrees");
  await mkdir(worktreesPath, { recursive: true });
  await mkdir(path.join(issuePath, "sessions"), { recursive: true });

  return {
    id,
    title: input.title,
    slug,
    path: issuePath,
    worktreesPath,
    createdAt
  };
}

export async function scanGitRepositories(input: {
  rootPath: string;
  maxDepth?: number;
}): Promise<WorldRepoRecord[]> {
  const rootPath = path.resolve(input.rootPath);
  const rootRealPath = await realpath(rootPath);
  const maxDepth = input.maxDepth ?? 2;
  const repos: WorldRepoRecord[] = [];

  async function visit(currentPath: string, depth: number): Promise<void> {
    await assertInsideScope(currentPath, rootRealPath);
    if (await isGitRepository(currentPath)) {
      const metadata = await readGitMetadata(currentPath);
      repos.push({
        id: `repo_${slugify(path.basename(currentPath))}`,
        name: path.basename(currentPath),
        path: currentPath,
        defaultBranch: metadata.defaultBranch,
        headSha: metadata.headSha
      });
      return;
    }
    if (depth >= maxDepth) return;

    const entries = await readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || shouldSkipRepoScanDirectory(entry.name)) continue;
      await visit(path.join(currentPath, entry.name), depth + 1);
    }
  }

  await visit(rootRealPath, 0);
  return repos.sort((left, right) => left.path.localeCompare(right.path));
}

export async function importGitRepository(input: {
  worldRootPath: string;
  gitUrl: string;
  ref?: string;
  name?: string;
  execGit?: GitExec;
}): Promise<WorldRepoRecord> {
  rejectCredentialFields(input as Record<string, unknown>);
  assertGitUrlHasNoCredentials(input.gitUrl);

  const git = input.execGit ?? execFileAsync;
  const repoCacheRoot = path.join(path.resolve(input.worldRootPath), "repos");
  const repoName = input.name ? slugify(input.name) : slugify(path.basename(input.gitUrl.replace(/\.git$/i, "")));
  const destinationPath = path.join(repoCacheRoot, repoName);
  await assertInsideScope(destinationPath, repoCacheRoot);
  await mkdir(repoCacheRoot, { recursive: true });

  await git("git", ["clone", input.gitUrl, destinationPath]);
  if (input.ref) {
    await git("git", ["-C", destinationPath, "checkout", input.ref]);
  }
  const metadata = await readGitMetadata(destinationPath);
  return {
    id: `repo_${repoName}`,
    name: repoName,
    path: destinationPath,
    defaultBranch: metadata.defaultBranch,
    headSha: metadata.headSha
  };
}

export async function createAwesomeLayout(input: {
  name: string;
  rootPath: string;
  id?: string;
}): Promise<Awesome> {
  const createdAt = nowIso();
  const awesomePath = path.resolve(input.rootPath);
  const awesome: Awesome = {
    id: input.id ?? `awesome_${randomUUID()}`,
    name: input.name,
    slug: slugify(input.name),
    path: awesomePath,
    createdAt,
    updatedAt: createdAt
  };

  await mkdir(path.join(awesomePath, ".caesar-geek", "tasks"), { recursive: true });
  await mkdir(path.join(awesomePath, ".caesar-geek", "logs"), { recursive: true });
  await mkdir(path.join(awesomePath, ".caesar-geek", "sessions"), { recursive: true });
  await mkdir(path.join(awesomePath, "repos"), { recursive: true });
  await mkdir(path.join(awesomePath, "ultraworks"), { recursive: true });
  await mkdir(path.join(awesomePath, "artifacts"), { recursive: true });

  return awesome;
}

export async function detectAwesomeAvailability(record: RegistryRecord): Promise<RegistryRecord> {
  try {
    const info = await stat(record.path);
    if (!info.isDirectory()) {
      return { ...record, availability: "corrupt" };
    }
    await stat(path.join(record.path, ".caesar-geek"));
    return { ...record, availability: "available" };
  } catch {
    return { ...record, availability: "missing" };
  }
}

export async function isGitRepository(repoPath: string): Promise<boolean> {
  try {
    await execFileAsync("git", ["-C", repoPath, "rev-parse", "--is-inside-work-tree"]);
    return true;
  } catch {
    return false;
  }
}

export async function readGitMetadata(repoPath: string): Promise<{
  defaultBranch: string | null;
  headSha: string | null;
}> {
  const defaultBranch = await execFileAsync("git", ["-C", repoPath, "branch", "--show-current"])
    .then(({ stdout }) => stdout.trim() || null)
    .catch(() => null);
  const headSha = await execFileAsync("git", ["-C", repoPath, "rev-parse", "HEAD"])
    .then(({ stdout }) => stdout.trim() || null)
    .catch(() => null);
  return { defaultBranch, headSha };
}

export async function listGitBranches(input: {
  repoPath: string;
  execGit?: GitExec;
}): Promise<string[]> {
  const git = input.execGit ?? execFileAsync;
  if (!(await isGitRepository(input.repoPath))) {
    throw new Error(`Path is not a git repository: ${input.repoPath}`);
  }
  const { stdout } = await git("git", ["-C", input.repoPath, "branch", "--format=%(refname:short)"]);
  return stdout
    .split("\n")
    .map((branch) => branch.trim())
    .filter(Boolean)
    .sort();
}

export async function createIssueWorktree(input: {
  issue: Pick<WorldIssue, "id" | "worktreesPath">;
  repo: Pick<WorldRepoRecord, "id" | "path" | "defaultBranch">;
  branch: string;
  name?: string;
  id?: string;
  execGit?: GitExec;
}): Promise<WorldWorktree> {
  if (!(await isGitRepository(input.repo.path))) {
    throw new Error(`Repo path is not a git repository: ${input.repo.path}`);
  }

  const git = input.execGit ?? execFileAsync;
  const id = input.id ?? `worktree_${randomUUID()}`;
  const name = input.name ?? input.branch;
  const destinationPath = path.join(path.resolve(input.issue.worktreesPath), `${slugify(name)}-${id}`);
  await assertInsideScope(destinationPath, input.issue.worktreesPath);
  await mkdir(input.issue.worktreesPath, { recursive: true });
  const branches = await listGitBranches({ repoPath: input.repo.path, execGit: git });
  const worktreeArgs = branches.includes(input.branch)
    ? ["-C", input.repo.path, "worktree", "add", destinationPath, input.branch]
    : ["-C", input.repo.path, "worktree", "add", "-b", input.branch, destinationPath, input.repo.defaultBranch ?? "HEAD"];
  await git("git", worktreeArgs);

  return {
    id,
    issueId: input.issue.id,
    repoId: input.repo.id,
    name,
    branch: input.branch,
    path: destinationPath,
    createdAt: nowIso()
  };
}

export async function assertIssueSessionCwd(input: {
  issueRootPath: string;
  worktreePaths: string[];
  cwd?: string;
}): Promise<string> {
  if (input.worktreePaths.length === 0) {
    throw new Error("Issue-scope Agent sessions require at least one worktree repo.");
  }
  const cwd = path.resolve(input.cwd ?? input.issueRootPath);
  await assertInsideScope(cwd, input.issueRootPath);
  return cwd;
}

export async function resolveUltraworkDestination(input: {
  awesomePath: string;
  sourcePath: string;
  name?: string;
  targetDir?: "repos" | "ultraworks";
}): Promise<{ name: string; slug: string; destinationPath: string; sourcePath: string }> {
  const sourceRealPath = await realpath(input.sourcePath);
  const repoName = input.name ?? path.basename(sourceRealPath);
  const slug = slugify(repoName);
  const targetDir = input.targetDir ?? "ultraworks";
  const targetRoot = path.join(path.resolve(input.awesomePath), targetDir);
  const destinationPath = path.join(targetRoot, slug);
  await assertInsideScope(destinationPath, targetRoot);
  return { name: repoName, slug, destinationPath, sourcePath: sourceRealPath };
}

export async function cloneUltrawork(input: {
  awesome: Awesome;
  sourcePath: string;
  name?: string;
  id?: string;
  execGit?: typeof execFileAsync;
  targetDir?: "repos" | "ultraworks";
}): Promise<Ultrawork> {
  const git = input.execGit ?? execFileAsync;
  const source = await resolveUltraworkDestination({
    awesomePath: input.awesome.path,
    sourcePath: input.sourcePath,
    ...(input.name ? { name: input.name } : {}),
    ...(input.targetDir ? { targetDir: input.targetDir } : {})
  });
  if (!(await isGitRepository(source.sourcePath))) {
    throw new Error(`Source path is not a git repository: ${source.sourcePath}`);
  }

  await git("git", ["clone", source.sourcePath, source.destinationPath]);
  const metadata = await readGitMetadata(source.destinationPath);

  return {
    id: input.id ?? `ultrawork_${randomUUID()}`,
    awesomeId: input.awesome.id,
    name: source.name,
    slug: source.slug,
    sourcePath: source.sourcePath,
    destinationPath: source.destinationPath,
    cloneStrategy: "clone",
    defaultBranch: metadata.defaultBranch,
    headSha: metadata.headSha,
    createdAt: nowIso()
  };
}

function shouldSkipRepoScanDirectory(name: string): boolean {
  return name === ".git" || name === "node_modules" || name === ".caesar-geek";
}

function rejectCredentialFields(value: Record<string, unknown>): void {
  const credentialKeyPattern = /token|password|passwd|privatekey|private_key|credential|secret|sshkey|ssh_key/i;
  for (const [key, nested] of Object.entries(value)) {
    if (credentialKeyPattern.test(key)) {
      throw new Error("Browser-supplied git credentials are not allowed.");
    }
    if (nested && typeof nested === "object") {
      rejectCredentialFields(nested as Record<string, unknown>);
    }
  }
}

function assertGitUrlHasNoCredentials(value: string): void {
  try {
    const url = new URL(value);
    if (url.username || url.password) {
      throw new Error("gitUrl must not contain credentials.");
    }
  } catch (error) {
    if (error instanceof TypeError) return;
    throw error;
  }
}
