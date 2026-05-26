import { describe, expect, it } from "vitest";
import { classifyHighRiskAction, geekTaskSchema } from "./index.js";

describe("shared contracts", () => {
  it("classifies high-risk commands", () => {
    expect(classifyHighRiskAction({ command: ["git", "push"] }).action).toBe("remote_push");
    expect(classifyHighRiskAction({ command: ["rm", "-rf", "/"] }).action).toBe("broad_delete");
    expect(classifyHighRiskAction({ targetPath: "/tmp/.env", externalDestination: "https://api.example" }).action).toBe("secret_exfiltration");
    expect(classifyHighRiskAction({ targetPath: "/tmp/awesome-evil/file", scopePath: "/tmp/awesome" }).action).toBe("out_of_scope_write");
    expect(classifyHighRiskAction({ targetPath: "/tmp/awesome/../outside/file", scopePath: "/tmp/awesome" }).action).toBe("out_of_scope_write");
    expect(classifyHighRiskAction({ targetPath: "/tmp/awesome/file", scopePath: "/tmp/awesome" }).allowed).toBe(true);
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
        status: "running",
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
});
