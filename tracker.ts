import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const WIDGET_KEY = "prompt-tracker";
const STATUS_KEY = "prompt-tracker";

export function registerPromptTracker(pi: ExtensionAPI) {
  let startTime: Date | null = null;
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens = 0;

  pi.on("agent_start", (_event, ctx) => {
    startTime = new Date();
    inputTokens = 0;
    outputTokens = 0;
    cacheReadTokens = 0;

    if (!ctx.hasUI) return;
    const t = ctx.ui.theme;
    ctx.ui.setWidget(WIDGET_KEY, [
      `${t.fg("muted", "started")}  ${t.fg("text", startTime.toISOString())}`,
    ]);
    ctx.ui.setStatus(STATUS_KEY, t.fg("warning", "⏳ processing…"));
  });

  // Accumulate token usage from every assistant message across all turns in this prompt.
  pi.on("message_end", (event) => {
    // AgentMessage is AssistantMessage | UserMessage | ToolResultMessage.
    // Only AssistantMessage carries a usage object.
    const msg = event.message as { role: string; usage?: { input: number; output: number; cacheRead: number } };
    if (msg.role === "assistant" && msg.usage) {
      inputTokens += msg.usage.input ?? 0;
      outputTokens += msg.usage.output ?? 0;
      cacheReadTokens += msg.usage.cacheRead ?? 0;
    }
  });

  pi.on("agent_end", (_event, ctx) => {
    const endTime = new Date();
    const durationMs = startTime ? endTime.getTime() - startTime.getTime() : 0;
    const durationSec = (durationMs / 1000).toFixed(1);

    if (!ctx.hasUI) return;
    const t = ctx.ui.theme;

    const cacheNote =
      cacheReadTokens > 0 ? `  ${t.fg("muted", `(${cacheReadTokens} cache read)`)}` : "";

    const lines = [
      `${t.fg("muted", "started")}  ${t.fg("text", startTime?.toISOString() ?? "—")}`,
      `${t.fg("muted", "finished")} ${t.fg("text", endTime.toISOString())}  ${t.fg("muted", `(${durationSec}s)`)}`,
      `${t.fg("muted", "tokens")}   ${t.fg("accent", String(inputTokens))} in  /  ${t.fg("accent", String(outputTokens))} out${cacheNote}`,
    ];

    ctx.ui.setWidget(WIDGET_KEY, lines);
    ctx.ui.setStatus(STATUS_KEY, "");
  });
}
