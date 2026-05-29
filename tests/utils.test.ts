import { describe, it, expect, vi, beforeEach } from "vitest";
import { isMutatingGitCommand, registerToolInterceptors } from "../utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ToolCallEvent = {
  toolName: string;
  toolCallId?: string;
  input: Record<string, unknown>;
};

type BlockResult = { block: true; reason: string } | undefined;

/**
 * Minimal mock of ExtensionAPI.
 * Captures the tool_call handler registered by registerToolInterceptors
 * so we can invoke it directly in tests.
 */
function createMockPi() {
  let toolCallHandler: ((event: ToolCallEvent) => Promise<BlockResult>) | null = null;

  const pi = {
    on: vi.fn((event: string, handler: (e: ToolCallEvent) => Promise<BlockResult>) => {
      if (event === "tool_call") toolCallHandler = handler;
    }),
    setActiveTools: vi.fn(),
    registerCommand: vi.fn(),
    // Simulate firing a tool_call event
    fireToolCall: async (event: ToolCallEvent): Promise<BlockResult> => {
      if (!toolCallHandler) throw new Error("No tool_call handler registered");
      return toolCallHandler(event);
    },
  };

  return pi;
}

// ---------------------------------------------------------------------------
// isMutatingGitCommand
// ---------------------------------------------------------------------------

describe("isMutatingGitCommand", () => {
  const mutating = [
    "git commit -m 'msg'",
    "git push origin main",
    "git pull",
    "git merge feature-branch",
    "git rebase main",
    "git reset --hard HEAD",
    "git checkout main",
    "git branch -d feature",
    "git stash",
    "git cherry-pick abc123",
    "git tag v1.0.0",
    "git revert HEAD",
    "  git commit -m 'leading spaces'",   // leading whitespace
    "GIT COMMIT -m 'uppercase'",          // case-insensitive
  ];

  const nonMutating = [
    "git commit -m 'this should fail'",
    "git log --oneline",
    "git diff HEAD",
    "git fetch origin",
    "git show abc123",
    "git blame file.ts",
    "echo 'git commit'",                  // git not at the start
    "npm run build",
    "",
  ];

  it.each(mutating)("blocks: %s", (cmd) => {
    expect(isMutatingGitCommand(cmd)).toBe(true);
  });

  it.each(nonMutating)("allows: %s", (cmd) => {
    expect(isMutatingGitCommand(cmd)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tool interceptors — per-mode blocking rules
// ---------------------------------------------------------------------------

describe("registerToolInterceptors", () => {
  let pi: ReturnType<typeof createMockPi>;
  let currentMode: string;

  beforeEach(() => {
    pi = createMockPi();
    currentMode = "plan";
    registerToolInterceptors(pi as any, () => currentMode as any);
  });

  // --- plan mode ---

  describe("plan mode", () => {
    beforeEach(() => { currentMode = "plan"; });

    it("blocks edit on non-PLAN.md files", async () => {
      const result = await pi.fireToolCall({
        toolName: "edit",
        input: { path: "src/index.ts" },
      });
      expect(result?.block).toBe(true);
      expect(result?.reason).toMatch(/PLAN\.md/);
    });

    it("blocks write on non-PLAN.md files", async () => {
      const result = await pi.fireToolCall({
        toolName: "write",
        input: { path: "README.md" },
      });
      expect(result?.block).toBe(true);
    });

    it("allows edit on PLAN.md", async () => {
      const result = await pi.fireToolCall({
        toolName: "edit",
        input: { path: "PLAN.MD" },   // case-insensitive check via toUpperCase
      });
      expect(result).toBeUndefined();
    });

    it("blocks mutating git commands in bash", async () => {
      const result = await pi.fireToolCall({
        toolName: "bash",
        input: { command: "git commit -m 'oops'" },
      });
      expect(result?.block).toBe(true);
      expect(result?.reason).toMatch(/plan.*mode|git.*blocked/i);
    });

    it("allows non-mutating bash commands", async () => {
      const result = await pi.fireToolCall({
        toolName: "bash",
        input: { command: "git status" },
      });
      expect(result).toBeUndefined();
    });

    it("allows read tool", async () => {
      const result = await pi.fireToolCall({
        toolName: "read",
        input: { path: "src/index.ts" },
      });
      expect(result).toBeUndefined();
    });
  });

  // --- build mode ---

  describe("build mode", () => {
    beforeEach(() => { currentMode = "build"; });

    it("blocks mutating git commands in bash", async () => {
      const result = await pi.fireToolCall({
        toolName: "bash",
        input: { command: "git push origin main" },
      });
      expect(result?.block).toBe(true);
      expect(result?.reason).toMatch(/build.*mode|git.*blocked/i);
    });

    it("allows non-mutating bash commands", async () => {
      const result = await pi.fireToolCall({
        toolName: "bash",
        input: { command: "npm run build" },
      });
      expect(result).toBeUndefined();
    });

    it("allows file editing", async () => {
      const result = await pi.fireToolCall({
        toolName: "edit",
        input: { path: "src/index.ts" },
      });
      expect(result).toBeUndefined();
    });
  });

  // --- git mode ---

  describe("git mode", () => {
    beforeEach(() => { currentMode = "git"; });

    it("blocks edit tool", async () => {
      const result = await pi.fireToolCall({
        toolName: "edit",
        input: { path: "src/index.ts" },
      });
      expect(result?.block).toBe(true);
      expect(result?.reason).toMatch(/git.*mode|edit.*blocked/i);
    });

    it("blocks write tool", async () => {
      const result = await pi.fireToolCall({
        toolName: "write",
        input: { path: "newfile.ts" },
      });
      expect(result?.block).toBe(true);
    });

    it("allows bash (git commands)", async () => {
      const result = await pi.fireToolCall({
        toolName: "bash",
        input: { command: "git push origin main" },
      });
      expect(result).toBeUndefined();
    });

    it("allows read tool", async () => {
      const result = await pi.fireToolCall({
        toolName: "read",
        input: { path: "src/index.ts" },
      });
      expect(result).toBeUndefined();
    });
  });
});
