import { describe, it, expect } from "vitest";
import { prompts } from "../prompts";

describe("prompts", () => {
  describe("plan", () => {
    it("mentions PLAN MODE", () => {
      expect(prompts.plan).toContain("[PLAN MODE ACTIVE]");
    });
    it("mentions PLAN.md as the only editable file", () => {
      expect(prompts.plan).toContain("PLAN.md");
    });
    it("tells the model to suggest /mode build for edits", () => {
      expect(prompts.plan).toContain("/mode build");
    });
    it("blocks git commands", () => {
      expect(prompts.plan).toMatch(/cannot.*git|git.*blocked/i);
    });
  });

  describe("build", () => {
    it("mentions BUILD MODE", () => {
      expect(prompts.build).toContain("[BUILD MODE ACTIVE]");
    });
    it("allows file editing", () => {
      expect(prompts.build).toMatch(/create.*edit|edit.*create/i);
    });
    it("tells the model to suggest /mode git for git operations", () => {
      expect(prompts.build).toContain("/mode git");
    });
  });

  describe("git", () => {
    it("mentions GIT MODE", () => {
      expect(prompts.git).toContain("[GIT MODE ACTIVE]");
    });
    it("allows git commands", () => {
      expect(prompts.git).toMatch(/git commands/i);
    });
    it("blocks file editing", () => {
      expect(prompts.git).toMatch(/cannot edit|not edit/i);
    });
    it("tells the model to suggest /mode build for file edits", () => {
      expect(prompts.git).toContain("/mode build");
    });
  });

  describe("helpMessage", () => {
    it("lists all four modes", () => {
      expect(prompts.helpMessage).toContain("/mode plan");
      expect(prompts.helpMessage).toContain("/mode build");
      expect(prompts.helpMessage).toContain("/mode git");
      expect(prompts.helpMessage).toContain("/mode help");
    });
  });

  describe("help()", () => {
    it("mentions HELP MODE", () => {
      expect(prompts.help("/ext/dir/", "/ext/")).toContain("[HELP MODE ACTIVE]");
    });
    it("includes the extensionDir path", () => {
      expect(prompts.help("/my/ext/dir/", "/my/ext/")).toContain("/my/ext/dir/");
    });
    it("includes the extensionsRoot path", () => {
      expect(prompts.help("/my/ext/dir/", "/my/ext/")).toContain("/my/ext/");
    });
    it("lists the expected source files", () => {
      const result = prompts.help("/a/", "/b/");
      expect(result).toContain("index.ts");
      expect(result).toContain("utils.ts");
      expect(result).toContain("prompts.ts");
      expect(result).toContain("tracker.ts");
    });
  });
});
