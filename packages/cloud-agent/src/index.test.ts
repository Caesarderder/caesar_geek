import { describe, expect, it } from "vitest";
import { CloudAgent, normalizeGatewayAgentUrl, parseAllowedProbe, runConstrainedCommand, type AgentCommand } from "./index.js";

const command: AgentCommand = { version: 1, type: "command", requestId: "req_1", commandId: "cmd_1", command: "pwd" };

describe("cloud Mac Agent", () => {
  it("normalizes public Gateway URLs to the outbound /agent websocket endpoint", () => {
    expect(normalizeGatewayAgentUrl("http://47.93.141.241:8787", "secret", "mac-mini").toString()).toBe(
      "ws://47.93.141.241:8787/agent?token=secret&agentId=mac-mini"
    );
    expect(normalizeGatewayAgentUrl("https://example.test/base", "secret", "mac-mini").toString()).toBe(
      "wss://example.test/agent?token=secret&agentId=mac-mini"
    );
  });

  it("returns constrained local command output through the websocket client", async () => {
    const sent: unknown[] = [];
    const agent = new CloudAgent({ gatewayUrl: "ws://localhost:8787/agent", token: "secret", agentId: "mac-mini-test", cwd: process.cwd() });
    Reflect.set(agent, "socket", { send: (value: string) => sent.push(JSON.parse(value)) });

    await agent.handleMessage(JSON.stringify(command));

    expect(sent).toEqual([
      expect.objectContaining({ version: 1, type: "command_result", requestId: "req_1", commandId: "cmd_1", status: "completed" })
    ]);
    expect(String((sent[0] as { stdout: string }).stdout)).toContain(process.cwd());
  });

  it("allows only pwd, whoami, and codex probe commands", async () => {
    expect(parseAllowedProbe("pwd")).toMatchObject({ allowed: true, file: "pwd" });
    expect(parseAllowedProbe("whoami")).toMatchObject({ allowed: true, file: "whoami" });
    expect(parseAllowedProbe("codex")).toMatchObject({ allowed: true, file: "codex", args: ["--version"] });
    expect(parseAllowedProbe("echo hi")).toMatchObject({ allowed: false });
    expect(parseAllowedProbe("cat ~/.ssh/id_rsa")).toMatchObject({ allowed: false });
    expect(parseAllowedProbe("rm -rf /")).toMatchObject({ allowed: false });

    await expect(runConstrainedCommand({ ...command, command: "echo hi" }, process.cwd())).resolves.toMatchObject({
      status: "failed",
      exitCode: 2,
      stderr: expect.stringContaining("Only pwd")
    });
  });
});
