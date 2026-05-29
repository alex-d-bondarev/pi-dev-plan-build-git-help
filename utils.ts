import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { prompts } from "./prompts";

type Mode = "plan" | "build" | "git" | "help";

const PLAN_TOOLS = ["read", "bash", "edit", "write", "grep", "find", "ls"];
const BUILD_TOOLS = ["read", "bash", "edit", "write", "grep", "find", "ls"];
const GIT_TOOLS = ["read", "bash", "grep", "find", "ls"];

export function isMutatingGitCommand(command: string): boolean {
  const gitCommands = /^\s*git\s+(commit|push|pull|merge|rebase|reset|checkout|branch|stash|apply|cherry-pick|tag|revert)\b/i;
  return gitCommands.test(command);
}

function updateStatus(mode: Mode, ctx: ExtensionContext) {
  const statusMap = {
    plan: { text: "plan", color: "warning" as const },
    build: { text: "build", color: "accent" as const },
    git: { text: "git", color: "success" as const },
    help: { text: "help", color: "muted" as const },
  };

  const status = statusMap[mode];
  ctx.ui.setStatus("modes-extension", ctx.ui.theme.fg(status.color, `[ ${status.text} ]`));
}

export function registerModeCommands(pi: ExtensionAPI, getCurrentMode: () => Mode, setMode: (mode: Mode, ctx: ExtensionContext) => void) {
  pi.registerCommand("mode", {
    description: "Switch between plan, build, and git modes.",
    handler: async (args, ctx) => {
      const argument = (args || "help").trim().toLowerCase();
      const requestedMode = argument as Mode;
      if (["plan", "build", "git", "help"].includes(requestedMode)) {
        setMode(requestedMode, ctx);
      } else {
        setMode("help", ctx);
      }
    },
  });
}

export function registerToolInterceptors(pi: ExtensionAPI, getCurrentMode: () => Mode) {
  const extensionsRoot = new URL("..", import.meta.url).pathname;

  pi.on("tool_call", async (event) => {
    const mode = getCurrentMode();

    if (mode === "plan") {
      if ((event.toolName === "edit" || event.toolName === "write")) {
        const input = event.input as { path?: string };
        if (!input.path?.toUpperCase().endsWith("PLAN.MD")) {
          return {
            block: true,
            reason: "In 'plan' mode, only PLAN.md can be edited. Suggest switching to '/mode build' to apply changes.",
          };
        }
      }
      if (event.toolName === "bash") {
        const input = event.input as { command?: string };
        if (isMutatingGitCommand(input.command || "")) {
          return {
            block: true,
            reason: "Git commands are blocked in 'plan' mode.",
          };
        }
      }
    }

    if (mode === "build") {
      if (event.toolName === "bash") {
        const input = event.input as { command?: string };
        if (isMutatingGitCommand(input.command || "")) {
          return {
            block: true,
            reason: "In 'build' mode, git commands are blocked. Suggest switching to '/mode git' to perform git actions.",
          };
        }
      }
    }

    if (mode === "git") {
      if (event.toolName === "edit" || event.toolName === "write") {
        return {
          block: true,
          reason: "In 'git' mode, file editing is blocked. Suggest switching to '/mode build' to edit files.",
        };
      }
    }

    if (mode === "help") {
      if (event.toolName === "edit" || event.toolName === "write") {
        const input = event.input as { path?: string };
        const filePath = input.path || "";
        if (!filePath.startsWith(extensionsRoot)) {
          return {
            block: true,
            reason: `In 'help' mode, only files under ${extensionsRoot} can be edited. Switch to '/mode build' to edit other files.`,
          };
        }
      }
    }
  });
}

export function registerSystemPrompt(pi: ExtensionAPI, getCurrentMode: () => Mode) {
  const extensionDir = new URL(".", import.meta.url).pathname;
  const extensionsRoot = new URL("..", import.meta.url).pathname;

  pi.on("before_agent_start", async () => {
    const mode = getCurrentMode();
    const content = mode === "help"
      ? prompts.help(extensionDir, extensionsRoot)
      : prompts[mode];

    if (content) {
      return {
        message: {
          customType: "mode-context",
          content,
          display: false,
        },
      };
    }
  });
}

export function activateMode(mode: Mode, ctx: ExtensionContext, pi: ExtensionAPI) {
  switch (mode) {
    case "plan":
      pi.setActiveTools(PLAN_TOOLS);
      break;
    case "build":
      pi.setActiveTools(BUILD_TOOLS);
      break;
    case "git":
      pi.setActiveTools(GIT_TOOLS);
      break;
    case "help":
      pi.setActiveTools(BUILD_TOOLS);
      ctx.ui.notify(prompts.helpMessage, "info");
      break;
  }
  if (ctx.hasUI) {
    updateStatus(mode, ctx);
  }
}
