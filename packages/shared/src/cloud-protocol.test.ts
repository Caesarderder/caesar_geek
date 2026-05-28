import { describe, expect, it } from "vitest";
import { cloudMessageTypeSchema, cloudProtocolVersion, parseCloudProtocolMessage } from "./index.js";

const validImportRequest = {
  version: cloudProtocolVersion,
  type: "repo.import.request",
  requestId: "req_1",
  worldId: "world_1",
  payload: {
    gitUrl: "https://example.com/repo.git",
    ref: "main",
    name: "repo"
  }
} as const;

describe("cloud protocol schemas", () => {
  it("accepts the World/Issue/repo/session MVP message vocabulary", () => {
    expect(cloudMessageTypeSchema.options).toEqual([
      "world.status",
      "world.error",
      "world.audit",
      "issue.list.request",
      "issue.list.result",
      "issue.create.request",
      "issue.create.result",
      "issue.select.request",
      "repo.scan.request",
      "repo.scan.result",
      "repo.import.request",
      "repo.import.result",
      "branch.list.request",
      "branch.list.result",
      "worktree.create.request",
      "worktree.create.result",
      "session.start.request",
      "session.started",
      "session.list.request",
      "session.list.result",
      "session.select.request",
      "session.input.request",
      "session.output",
      "session.status",
      "session.interrupt.request",
      "session.terminate.request"
    ]);
  });

  it("requires request correlation and scoped IDs for browser initiated operations", () => {
    expect(() => parseCloudProtocolMessage(validImportRequest)).not.toThrow();
    expect(() => parseCloudProtocolMessage({ ...validImportRequest, requestId: "" })).toThrow(/requestId/i);
    expect(() => parseCloudProtocolMessage({ ...validImportRequest, worldId: undefined })).toThrow(/worldId/i);
    expect(() =>
      parseCloudProtocolMessage({
        version: cloudProtocolVersion,
        type: "session.input.request",
        requestId: "req_2",
        worldId: "world_1",
        issueId: "issue_1",
        payload: { text: "hello" }
      })
    ).toThrow(/sessionId/i);
  });

  it("rejects browser-supplied git credentials and malformed import URLs", () => {
    expect(() => parseCloudProtocolMessage({ ...validImportRequest, payload: { gitUrl: "notaurl" } })).toThrow(/gitUrl/i);
    expect(() => parseCloudProtocolMessage({ ...validImportRequest, payload: { gitUrl: "https://user:pass@example.com/repo.git" } })).toThrow(/credentials|gitUrl/i);
    expect(() => parseCloudProtocolMessage({ ...validImportRequest, payload: { gitUrl: "https://example.com/repo.git", token: "secret" } })).toThrow(/credentials|Unsupported/i);
    expect(() => parseCloudProtocolMessage({ ...validImportRequest, payload: { gitUrl: "git@example.com:org/repo.git" } })).not.toThrow();
  });
});
