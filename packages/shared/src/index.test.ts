import { describe, expect, it } from "vitest";
import { approvalRecordSchema, buildCodexExecCommand, classifyHighRiskAction, geekTaskSchema } from "./index.js";

describe("shared contracts", () => {
  it("classifies high-risk commands", () => {
    expect(classifyHighRiskAction({ command: ["git", "push"] }).action).toBe("remote_push");
    expect(classifyHighRiskAction({ command: ["rm", "-rf", "/"] }).action).toBe("broad_delete");
    expect(classifyHighRiskAction({ targetPath: "/tmp/.env", externalDestination: "https://api.example" }).action).toBe("secret_exfiltration");
    expect(classifyHighRiskAction({ targetPath: "/tmp/awesome-evil/file", scopePath: "/tmp/awesome" }).action).toBe("out_of_scope_write");
    expect(classifyHighRiskAction({ targetPath: "/tmp/awesome/../outside/file", scopePath: "/tmp/awesome" }).action).toBe("out_of_scope_write");
    expect(classifyHighRiskAction({ targetPath: "/tmp/awesome/file", scopePath: "/tmp/awesome" }).allowed).toBe(true);
  });

  it("builds a safe default Codex exec command without classifying prompt text as shell", () => {
    const command = buildCodexExecCommand("Please inspect whether git push is needed; do not run sudo.");
    expect(command).toEqual([
      "codex",
      "exec",
      "--json",
      "--color",
      "never",
      "--sandbox",
      "workspace-write",
      "--skip-git-repo-check",
      "Please inspect whether git push is needed; do not run sudo."
    ]);
    expect(classifyHighRiskAction({ command }).allowed).toBe(true);
  });

  it("validates geek task vocabulary", () => {
    expect(() =>
      geekTaskSchema.parse({
        id: "task_1",
        awesomeId: "awesome_1",
        title: "Run",
        prompt: "Do it",
        command: ["node", "-v"],
        cwd: "/tmp/awesome",
        status: "rejected",
        exitCode: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        startedAt: null,
        endedAt: null,
        claimedAt: null,
        claimedBy: null
      })
    ).not.toThrow();
  });

  it("validates persisted approval records", () => {
    const now = new Date().toISOString();
    expect(() =>
      approvalRecordSchema.parse({
        id: "approval_1",
        taskId: "task_1",
        status: "pending",
        action: "remote_push",
        reason: "Remote pushes require explicit approval.",
        requestedBy: "operator",
        decidedBy: null,
        createdAt: now,
        updatedAt: now,
        decidedAt: null,
        expiresAt: null
      })
    ).not.toThrow();
  });
});
