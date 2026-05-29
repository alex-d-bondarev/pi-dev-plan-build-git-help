import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { prompts } from "./prompts";
import { registerModeCommands, registerToolInterceptors, registerSystemPrompt, activateMode } from "./utils";
import { registerPromptTracker } from "./tracker";

type Mode = "plan" | "build" | "git" | "help";

export default function (pi: ExtensionAPI) {
  let currentMode: Mode = "plan"; // Default mode

  const setMode = (mode: Mode, context: ExtensionContext) => {
    currentMode = mode;
    activateMode(mode, context, pi);
  };

  const getCurrentMode = () => currentMode;

  // Register all components of the extension
  registerModeCommands(pi, getCurrentMode, setMode);
  registerToolInterceptors(pi, getCurrentMode);
  registerSystemPrompt(pi, getCurrentMode);
  registerPromptTracker(pi);

  // Set the initial mode on startup
  pi.on("session_start", (_event, ctx) => {
    setMode("plan", ctx);
    const content = prompts['plan'];
    if (content && ctx.hasUI) {
      // It's a system message, not a notification
      // ctx.ui.notify(content, "info");
    }
  });

  // Expose a way for other extensions to interact with this one, if needed
  return {
    setMode,
    getCurrentMode,
  };
}
