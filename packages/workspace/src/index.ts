import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, realpath, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { Awesome, RegistryRecord, Ultrawork } from "@caesar-geek/shared";
import { nowIso } from "@caesar-geek/shared";

const execFileAsync = promisify(execFile);

export type WorkspacePaths = {
  appDataDir: string;
  registryDbPath: string;
};

export function defaultWorkspacePaths(): WorkspacePaths {
  const appDataDir = process.env.CAESAR_GEEK_HOME ?? path.join(homedir(), ".caesar-geek");
  return {
    appDataDir,
    registryDbPath: path.join(appDataDir, "registry.sqlite")
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

export async function resolveUltraworkDestination(input: {
  awesomePath: string;
  sourcePath: string;
  name?: string;
}): Promise<{ name: string; slug: string; destinationPath: string; sourcePath: string }> {
  const sourceRealPath = await realpath(input.sourcePath);
  const repoName = input.name ?? path.basename(sourceRealPath);
  const slug = slugify(repoName);
  const destinationPath = path.join(path.resolve(input.awesomePath), "ultraworks", slug);
  await assertInsideScope(destinationPath, path.join(input.awesomePath, "ultraworks"));
  return { name: repoName, slug, destinationPath, sourcePath: sourceRealPath };
}

export async function cloneUltrawork(input: {
  awesome: Awesome;
  sourcePath: string;
  name?: string;
  id?: string;
  execGit?: typeof execFileAsync;
}): Promise<Ultrawork> {
  const git = input.execGit ?? execFileAsync;
  const source = await resolveUltraworkDestination({
    awesomePath: input.awesome.path,
    sourcePath: input.sourcePath,
    ...(input.name ? { name: input.name } : {})
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
