import { mkdtemp, mkdir, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assertInsideScope, createAwesomeLayout, slugify } from "./index.js";

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
});
