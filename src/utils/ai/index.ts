/**
 * src/utils/ai/index.ts — AI domain module (S681)
 *
 * Consolidated from:
 *   ai-suggest.js · ai-client.js · ai-commands.js · ai-panel.js · ai-streaming.js
 *
 * @module ai
 * @owner ai
 */

import { t } from "../../core/i18n.js";

// ══════════════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════════════

// ── ai-suggest ────────────────────────────────────────────────────────────────

export type SuggestionDomain = "seating" | "menu" | "vendor" | "budget" | "timeline";

export interface Suggestion {
  id: string;
  domain: SuggestionDomain;
  title: string;
  description: string;
  confidence: number;
  priority: "low" | "medium" | "high";
  dismissed: boolean;
  applied: boolean;
}

// ── ai-client ─────────────────────────────────────────────────────────────────

export interface AiSettings {
  provider: string;
  apiKey: string;
  model: string;
  enabled: boolean;
  proxyUrl: string;
}

// ── ai-commands ───────────────────────────────────────────────────────────────

export interface ParsedCommand {
  name: string;
  args: string[];
  flags: Record<string, string>;
  raw: string;
}

export interface CommandDef {
  name: string;
  description: string;
  usage: string;
  minArgs: number;
}

// ── ai-panel ──────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "ai" | "error";
  text: string;
}

// ── ai-streaming ──────────────────────────────────────────────────────────────

export type AiProvider = "openai" | "anthropic" | "gemini" | "ollama";

export interface StreamChunk {
  text: string;
  done: boolean;
  provider?: string;
  tokenCount?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// ai-suggest implementation
// ══════════════════════════════════════════════════════════════════════════════

let _idCounter = 0;

/** Reset ID counter (testing only). */
export function resetIdCounter(start = 0): void {
  _idCounter = start;
}

export function createSuggestion({
  domain,
  title,
  description,
  confidence,
  priority,
}: {
  domain: SuggestionDomain;
  title: string;
  description: string;
  confidence?: number;
  priority?: "low" | "medium" | "high";
}): Suggestion {
  return {
    id: `sug_${++_idCounter}`,
    domain,
    title: (title || "").trim(),
    description: (description || "").trim(),
    confidence: Math.min(1, Math.max(0, confidence ?? 0.5)),
    priority: priority || "medium",
    dismissed: false,
    applied: false,
  };
}

export function dismissSuggestion(suggestion: Suggestion): Suggestion {
  return { ...suggestion, dismissed: true };
}

export function applySuggestion(suggestion: Suggestion): Suggestion {
  return { ...suggestion, applied: true };
}

export function suggestSeating(
  guests: Array<{ id: string; name: string; group?: string; plusOne?: boolean }>,
  tableSize: number,
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const groups: Record<string, typeof guests> = {};

  for (const g of guests) {
    const key = g.group || "ungrouped";
    if (!groups[key]) groups[key] = [];
    groups[key].push(g);
  }

  for (const [group, members] of Object.entries(groups)) {
    if (group === "ungrouped") continue;
    if (members.length > tableSize) {
      suggestions.push(
        createSuggestion({
          domain: "seating",
          title: `Split group "${group}"`,
          description: `Group "${group}" has ${members.length} members but table fits ${tableSize}. Consider splitting.`,
          confidence: 0.8,
          priority: "high",
        }),
      );
    }
  }

  const ungrouped = groups["ungrouped"] || [];
  if (ungrouped.length > 0) {
    suggestions.push(
      createSuggestion({
        domain: "seating",
        title: "Assign ungrouped guests",
        description: `${ungrouped.length} guests have no group assignment.`,
        confidence: 0.6,
        priority: "medium",
      }),
    );
  }

  return suggestions;
}

export function suggestBudget({
  totalBudget,
  spent,
  committed,
  guestCount,
}: {
  totalBudget: number;
  spent: number;
  committed: number;
  guestCount: number;
}): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const remaining = totalBudget - spent - committed;
  const perGuest = guestCount > 0 ? totalBudget / guestCount : 0;

  if (remaining < 0) {
    suggestions.push(
      createSuggestion({
        domain: "budget",
        title: "Over budget",
        description: `You are ₪${Math.abs(Math.round(remaining))} over budget.`,
        confidence: 1,
        priority: "high",
      }),
    );
  } else if (remaining < totalBudget * 0.1) {
    suggestions.push(
      createSuggestion({
        domain: "budget",
        title: "Budget nearly exhausted",
        description: `Only ₪${Math.round(remaining)} remaining (${Math.round((remaining / totalBudget) * 100)}%).`,
        confidence: 0.9,
        priority: "high",
      }),
    );
  }

  if (perGuest > 800) {
    suggestions.push(
      createSuggestion({
        domain: "budget",
        title: "High per-guest cost",
        description: `Cost per guest is ₪${Math.round(perGuest)}. Average wedding is ₪400-600.`,
        confidence: 0.7,
        priority: "low",
      }),
    );
  }

  return suggestions;
}

export function suggestVendor(
  vendors: Array<{ id: string; name: string; paid: number; total: number; dueDate?: number }>,
  now = Date.now(),
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  for (const v of vendors) {
    const remaining = v.total - v.paid;
    if (remaining > 0 && v.dueDate && v.dueDate < now) {
      suggestions.push(
        createSuggestion({
          domain: "vendor",
          title: `Payment overdue: ${v.name}`,
          description: `₪${remaining} overdue for ${v.name}.`,
          confidence: 1,
          priority: "high",
        }),
      );
    }
    if (v.paid === 0 && v.total > 0) {
      suggestions.push(
        createSuggestion({
          domain: "vendor",
          title: `No deposit: ${v.name}`,
          description: `Consider paying deposit to secure ${v.name}.`,
          confidence: 0.6,
          priority: "medium",
        }),
      );
    }
  }

  return suggestions;
}

export function getActiveSuggestions(suggestions: Suggestion[]): Suggestion[] {
  return suggestions.filter((s) => !s.dismissed && !s.applied);
}

export function sortSuggestions(suggestions: Suggestion[]): Suggestion[] {
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return [...suggestions].sort((a, b) => {
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    return b.confidence - a.confidence;
  });
}

export function getSuggestionStats(suggestions: Suggestion[]): {
  total: number;
  active: number;
  dismissed: number;
  applied: number;
  highPriority: number;
} {
  let active = 0;
  let dismissed = 0;
  let applied = 0;
  let highPriority = 0;

  for (const s of suggestions) {
    if (s.applied) applied++;
    else if (s.dismissed) dismissed++;
    else active++;
    if (s.priority === "high" && !s.dismissed && !s.applied) highPriority++;
  }

  return { total: suggestions.length, active, dismissed, applied, highPriority };
}

// ══════════════════════════════════════════════════════════════════════════════
// ai-client implementation
// ══════════════════════════════════════════════════════════════════════════════

const AI_STORAGE_KEY = "wedding_v1_ai_settings";

const PROVIDER_ENDPOINTS: Record<string, string> = {
  openai: "https://api.openai.com/v1/chat/completions",
  anthropic: "https://api.anthropic.com/v1/messages",
  ollama: "http://localhost:11434/v1/chat/completions",
};

const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-haiku-20240307",
  ollama: "llama3",
};

function getAiSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(AI_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AiSettings>;
      return {
        provider: parsed.provider ?? "openai",
        apiKey: parsed.apiKey ?? "",
        model: parsed.model ?? "",
        enabled: parsed.enabled ?? false,
        proxyUrl: parsed.proxyUrl ?? "",
      };
    }
  } catch {
    /* storage disabled or corrupt */
  }
  return { provider: "openai", apiKey: "", model: "", enabled: false, proxyUrl: "" };
}

export function saveAiSettings(opts: Partial<AiSettings>): void {
  const current = getAiSettings();
  const next: AiSettings = {
    provider: opts.provider ?? current.provider,
    apiKey: opts.apiKey ?? current.apiKey,
    model: opts.model ?? current.model,
    enabled: opts.enabled ?? current.enabled,
    proxyUrl: opts.proxyUrl ?? current.proxyUrl,
  };
  try {
    localStorage.setItem(AI_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage disabled */
  }
}

function _buildBody(provider: string, model: string, prompt: string, system?: string): string {
  if (provider === "anthropic") {
    return JSON.stringify({
      model,
      max_tokens: 1024,
      system: system ?? "You are a helpful wedding planning assistant.",
      messages: [{ role: "user", content: prompt }],
    });
  }
  const messages: Array<{ role: string; content: string }> = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });
  return JSON.stringify({ model, messages, max_tokens: 1024 });
}

function _buildHeaders(provider: string, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (provider === "anthropic") {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
  } else if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  return headers;
}

function _extractText(provider: string, json: unknown): string {
  if (!json || typeof json !== "object") return "";
  const j = json as Record<string, unknown>;
  if (provider === "anthropic") {
    const content = j["content"];
    if (Array.isArray(content) && content.length > 0) {
      const first = content[0] as Record<string, unknown>;
      return typeof first["text"] === "string" ? first["text"] : "";
    }
    return "";
  }
  const choices = j["choices"];
  if (Array.isArray(choices) && choices.length > 0) {
    const msg = (choices[0] as Record<string, unknown>)["message"] as Record<string, unknown>;
    return typeof msg?.["content"] === "string" ? (msg["content"] as string) : "";
  }
  return "";
}

export async function askAi(prompt: string, opts: { system?: string } = {}): Promise<string> {
  const { provider, apiKey, model, enabled } = getAiSettings();
  if (!enabled) throw new Error("AI assistant is not enabled.");
  const endpoint = PROVIDER_ENDPOINTS[provider] ?? PROVIDER_ENDPOINTS["openai"];
  const resolvedModel = model || DEFAULT_MODELS[provider] || "gpt-4o-mini";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: _buildHeaders(provider, apiKey),
    body: _buildBody(provider, resolvedModel, prompt, opts.system),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => String(res.status));
    throw new Error(`AI error ${res.status}: ${errText.slice(0, 200)}`);
  }
  const json = await res.json();
  return _extractText(provider, json);
}

export async function testAiConnection(): Promise<{ ok: boolean; message: string }> {
  const { apiKey, enabled } = getAiSettings();
  if (!enabled || !apiKey) {
    return { ok: false, message: "no_key" };
  }
  try {
    await askAi("Reply with the single word: ok", {});
    return { ok: true, message: "ok" };
  } catch (err) {
    const msg = err instanceof Error ? err.message.slice(0, 100) : String(err);
    return { ok: false, message: msg };
  }
}

export async function* streamAi(
  prompt: string,
  opts: { system?: string } = {},
): AsyncGenerator<string, void, void> {
  const { provider, apiKey, model, enabled, proxyUrl } = getAiSettings();
  if (!enabled) throw new Error("AI assistant is not enabled.");
  const resolvedModel = model || DEFAULT_MODELS[provider] || "gpt-4o-mini";
  const messages: Array<{ role: string; content: string }> = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push({ role: "user", content: prompt });

  if (!proxyUrl) {
    const text = await askAi(prompt, opts);
    yield text;
    return;
  }

  const res = await fetch(`${proxyUrl.replace(/\/$/, "")}/ai/chat?stream=1`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ provider, model: resolvedModel, messages }),
  });
  if (!res.ok || !res.body) {
    throw new Error(`AI stream error ${res.status}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line || !line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const obj = JSON.parse(payload) as Record<string, unknown>;
        if (typeof obj["text"] === "string") yield obj["text"] as string;
      } catch {
        /* ignore malformed line */
      }
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ai-commands implementation
// ══════════════════════════════════════════════════════════════════════════════

export const COMMANDS: ReadonlyArray<CommandDef> = Object.freeze([
  { name: "add-guest", description: "Add a guest by name", usage: "/add-guest <name> [--table=N]", minArgs: 1 },
  { name: "find-guest", description: "Search for a guest", usage: "/find-guest <query>", minArgs: 1 },
  { name: "set-table", description: "Assign guest to table", usage: "/set-table <guestId> <tableNum>", minArgs: 2 },
  { name: "stats", description: "Show guest/RSVP stats", usage: "/stats [--type=guests|rsvp|budget]", minArgs: 0 },
  { name: "export", description: "Export data", usage: "/export <format> [--section=guests]", minArgs: 1 },
  { name: "theme", description: "Switch theme", usage: "/theme <name>", minArgs: 1 },
  { name: "lang", description: "Switch language", usage: "/lang <code>", minArgs: 1 },
  { name: "goto", description: "Navigate to section", usage: "/goto <section>", minArgs: 1 },
  { name: "undo", description: "Undo last action", usage: "/undo", minArgs: 0 },
  { name: "help", description: "List commands", usage: "/help [command]", minArgs: 0 },
]);

export function parseCommand(input: string): ParsedCommand | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return null;

  const parts = trimmed.split(/\s+/);
  const name = parts[0].slice(1).toLowerCase();
  if (!name) return null;

  const args: string[] = [];
  const flags: Record<string, string> = {};

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (part.startsWith("--")) {
      const eq = part.indexOf("=");
      if (eq > 2) {
        flags[part.slice(2, eq)] = part.slice(eq + 1);
      } else {
        flags[part.slice(2)] = "true";
      }
    } else {
      args.push(part);
    }
  }

  return { name, args, flags, raw: trimmed };
}

export function getCommandDef(name: string): CommandDef | null {
  return COMMANDS.find((c) => c.name === name) ?? null;
}

export function validateCommand(parsed: ParsedCommand | null): { valid: boolean; error?: string } {
  if (!parsed) return { valid: false, error: "Invalid command" };

  const def = getCommandDef(parsed.name);
  if (!def) return { valid: false, error: `Unknown command: /${parsed.name}` };

  if (parsed.args.length < def.minArgs) {
    return {
      valid: false,
      error: `/${parsed.name} requires at least ${def.minArgs} argument(s). Usage: ${def.usage}`,
    };
  }

  return { valid: true };
}

export function autocomplete(partial: string): Array<{ name: string; description: string }> {
  if (typeof partial !== "string") return [];
  const trimmed = partial.trim().toLowerCase();
  const query = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;

  if (!query) return COMMANDS.map(({ name, description }) => ({ name, description }));

  return COMMANDS.filter((c) => c.name.startsWith(query)).map(({ name, description }) => ({
    name,
    description,
  }));
}

export function helpText(commandName?: string): string {
  if (commandName) {
    const def = getCommandDef(commandName);
    if (!def) return `Unknown command: /${commandName}`;
    return `${def.usage}\n  ${def.description}`;
  }
  return COMMANDS.map((c) => `${c.usage}  — ${c.description}`).join("\n");
}

export function buildCommand(
  name: string,
  args: string[] = [],
  flags: Record<string, string> = {},
): string {
  const parts = [`/${name}`, ...args];
  for (const [key, val] of Object.entries(flags)) {
    parts.push(val === "true" ? `--${key}` : `--${key}=${val}`);
  }
  return parts.join(" ");
}

// ══════════════════════════════════════════════════════════════════════════════
// ai-panel implementation
// ══════════════════════════════════════════════════════════════════════════════

let _dialog: HTMLDialogElement | null = null;
let _messagesEl: HTMLDivElement | null = null;
let _inputEl: HTMLTextAreaElement | null = null;
let _thinking = false;
const _history: ChatMessage[] = [];

function _appendBubble(msg: ChatMessage): void {
  if (!_messagesEl) return;
  const row = document.createElement("div");
  row.className = `ai-msg ai-msg--${msg.role}`;
  row.style.cssText = [
    "display:flex",
    "gap:0.5rem",
    `justify-content:${msg.role === "user" ? "flex-end" : "flex-start"}`,
    "margin-bottom:0.5rem",
  ].join(";");

  const bubble = document.createElement("div");
  bubble.className = "ai-bubble";
  bubble.style.cssText = [
    "max-width:80%",
    "padding:0.5rem 0.75rem",
    "border-radius:0.75rem",
    msg.role === "user"
      ? "background:var(--color-primary,#7c3aed);color:#fff"
      : msg.role === "error"
        ? "background:rgba(220,38,38,0.2);color:var(--color-danger,#ef4444)"
        : "background:rgba(255,255,255,0.1);color:var(--color-text,#fff)",
    "white-space:pre-wrap",
    "word-break:break-word",
    "font-size:0.875rem",
    "line-height:1.5",
  ].join(";");

  const label = document.createElement("span");
  label.className = "u-visually-hidden";
  label.textContent = msg.role === "user" ? t("ai_panel_you") : t("ai_panel_ai");
  bubble.appendChild(label);
  bubble.appendChild(document.createTextNode(msg.text));
  row.appendChild(bubble);
  _messagesEl.appendChild(row);
  _messagesEl.scrollTop = _messagesEl.scrollHeight;
}

function _buildDialog(initialPrompt?: string): void {
  _dialog = document.createElement("dialog") as HTMLDialogElement;
  _dialog.id = "aiPanelDialog";
  _dialog.setAttribute("aria-label", t("ai_panel_title"));
  _dialog.style.cssText = [
    "padding:0",
    "border:none",
    "border-radius:1rem",
    "width:min(420px,92vw)",
    "height:min(520px,80vh)",
    "background:var(--color-surface,#1a1a2e)",
    "color:var(--color-text,#fff)",
    "box-shadow:0 8px 40px rgba(0,0,0,0.6)",
    "display:flex",
    "flex-direction:column",
    "overflow:hidden",
    "top:5vh",
    "margin:0 auto",
  ].join(";");

  const header = document.createElement("div");
  header.style.cssText =
    "display:flex;align-items:center;justify-content:space-between;padding:0.75rem 1rem;border-bottom:1px solid rgba(255,255,255,0.1);flex-shrink:0";

  const titleEl = document.createElement("span");
  titleEl.style.cssText = "font-weight:600;font-size:0.95rem";
  titleEl.textContent = `🤖 ${t("ai_panel_title")}`;

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", t("close"));
  closeBtn.style.cssText =
    "background:none;border:none;color:inherit;cursor:pointer;font-size:1.2rem;padding:0.25rem;line-height:1";
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", closeAiPanel);

  header.appendChild(titleEl);
  header.appendChild(closeBtn);

  _messagesEl = document.createElement("div");
  _messagesEl.id = "aiMessages";
  _messagesEl.setAttribute("aria-live", "polite");
  _messagesEl.setAttribute("aria-label", t("ai_panel_title"));
  _messagesEl.style.cssText =
    "flex:1;overflow-y:auto;padding:1rem;display:flex;flex-direction:column";

  for (const msg of _history) _appendBubble(msg);

  const inputRow = document.createElement("div");
  inputRow.style.cssText =
    "display:flex;gap:0.5rem;padding:0.75rem;border-top:1px solid rgba(255,255,255,0.1);flex-shrink:0;align-items:flex-end";

  _inputEl = document.createElement("textarea");
  _inputEl.id = "aiInput";
  _inputEl.rows = 2;
  _inputEl.placeholder = t("ai_panel_placeholder");
  _inputEl.setAttribute("aria-label", t("ai_panel_placeholder"));
  _inputEl.style.cssText =
    "flex:1;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:0.5rem;color:inherit;padding:0.5rem;font-size:0.875rem;resize:none;outline:none;font-family:inherit;line-height:1.4;max-height:100px;overflow-y:auto";

  const sendBtn = document.createElement("button");
  sendBtn.type = "button";
  sendBtn.style.cssText =
    "background:var(--color-primary,#7c3aed);color:#fff;border:none;border-radius:0.5rem;padding:0.5rem 0.75rem;cursor:pointer;font-size:0.9rem;white-space:nowrap;align-self:flex-end";
  sendBtn.textContent = t("ai_panel_send");

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.setAttribute("title", t("ai_panel_clear"));
  clearBtn.style.cssText =
    "background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:0.5rem;color:inherit;padding:0.5rem;cursor:pointer;font-size:0.85rem;align-self:flex-end";
  clearBtn.textContent = "🗑";

  const handleSend = () => _sendMessage();
  sendBtn.addEventListener("click", handleSend);
  clearBtn.addEventListener("click", () => {
    _history.length = 0;
    if (_messagesEl) _messagesEl.textContent = "";
  });

  _inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  inputRow.appendChild(_inputEl);
  inputRow.appendChild(clearBtn);
  inputRow.appendChild(sendBtn);

  _dialog.appendChild(header);
  _dialog.appendChild(_messagesEl);
  _dialog.appendChild(inputRow);
  document.body.appendChild(_dialog);

  _dialog.addEventListener("click", (e: MouseEvent) => {
    if (e.target === _dialog) closeAiPanel();
  });
  _dialog.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape") closeAiPanel();
  });

  _dialog.showModal();

  if (initialPrompt && _inputEl) {
    _inputEl.value = initialPrompt;
  }
  _inputEl?.focus();
}

async function _sendMessage(): Promise<void> {
  if (_thinking || !_inputEl) return;
  const text = _inputEl.value.trim();
  if (!text) return;
  _inputEl.value = "";

  const userMsg: ChatMessage = { role: "user", text };
  _history.push(userMsg);
  _appendBubble(userMsg);

  _thinking = true;
  const thinkingMsg: ChatMessage = { role: "ai", text: t("ai_panel_thinking") };
  _history.push(thinkingMsg);
  _appendBubble(thinkingMsg);

  try {
    const response = await askAi(text);
    _history[_history.length - 1] = { role: "ai", text: response };
    if (_messagesEl) {
      const last = _messagesEl.lastElementChild;
      if (last) last.remove();
    }
    _appendBubble({ role: "ai", text: response });
  } catch (err) {
    const errText = err instanceof Error ? err.message : String(err);
    _history[_history.length - 1] = { role: "error", text: errText };
    if (_messagesEl) {
      const last = _messagesEl.lastElementChild;
      if (last) last.remove();
    }
    _appendBubble({ role: "error", text: errText });
  } finally {
    _thinking = false;
    _inputEl?.focus();
  }
}

export function openAiPanel(initialPrompt?: string): void {
  if (_dialog) {
    _dialog.showModal();
    if (initialPrompt && _inputEl) _inputEl.value = initialPrompt;
    _inputEl?.focus();
    return;
  }
  _buildDialog(initialPrompt);
}

export function closeAiPanel(): void {
  if (_dialog) {
    _dialog.close();
    _dialog.remove();
    _dialog = null;
    _messagesEl = null;
    _inputEl = null;
  }
}

export function initAiPanel(): () => void {
  function _onKey(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "A") {
      e.preventDefault();
      openAiPanel();
    }
  }
  document.addEventListener("keydown", _onKey);
  return () => document.removeEventListener("keydown", _onKey);
}

// ══════════════════════════════════════════════════════════════════════════════
// ai-streaming implementation
// ══════════════════════════════════════════════════════════════════════════════

export function parseSseLine(line: string): StreamChunk | null {
  if (!line || typeof line !== "string") return null;
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;

  const payload = trimmed.slice(5).trim();
  if (payload === "[DONE]") return { text: "", done: true };

  try {
    const obj = JSON.parse(payload) as Record<string, unknown>;
    const choices = obj["choices"];
    const delta =
      Array.isArray(choices) && choices.length > 0
        ? ((choices[0] as Record<string, unknown>)["delta"] as Record<string, unknown>)
        : undefined;
    const candidateText =
      (() => {
        const candidates = obj["candidates"];
        if (Array.isArray(candidates) && candidates.length > 0) {
          const c = candidates[0] as Record<string, unknown>;
          const content = c["content"] as Record<string, unknown> | undefined;
          const parts = content?.["parts"];
          if (Array.isArray(parts) && parts.length > 0) {
            const p = parts[0] as Record<string, unknown>;
            return typeof p["text"] === "string" ? p["text"] : "";
          }
        }
        return "";
      })();
    const text =
      (typeof delta?.["content"] === "string" ? (delta["content"] as string) : undefined) ??
      (() => {
        const d = obj["delta"] as Record<string, unknown> | undefined;
        return typeof d?.["text"] === "string" ? (d["text"] as string) : undefined;
      })() ??
      candidateText ??
      (() => {
        const m = obj["message"] as Record<string, unknown> | undefined;
        return typeof m?.["content"] === "string" ? (m["content"] as string) : "";
      })();
    return { text, done: false };
  } catch {
    return { text: payload, done: false };
  }
}

export function parseSseBody(body: string): StreamChunk[] {
  if (!body || typeof body !== "string") return [];
  return body
    .split(/\r?\n/)
    .map(parseSseLine)
    .filter((c): c is StreamChunk => c !== null);
}

export function concatChunks(chunks: StreamChunk[]): string {
  if (!Array.isArray(chunks)) return "";
  return chunks.map((c) => c.text).join("");
}

export function estimateTokens(text: string): number {
  if (!text || typeof text !== "string") return 0;
  return Math.ceil(text.length / 4);
}

export function exceedsTokenLimit(tokenCount: number, provider: string): boolean {
  const limits: Record<string, number> = {
    openai: 128000,
    anthropic: 200000,
    gemini: 1000000,
    ollama: 32000,
  };
  const limit = limits[provider] ?? 32000;
  return tokenCount > limit;
}

export function createAbortable(timeoutMs: number): {
  signal: AbortSignal;
  abort: () => void;
  timeoutMs: number;
} {
  const controller = new AbortController();
  const ms = typeof timeoutMs === "number" && timeoutMs > 0 ? timeoutMs : 30000;
  return { signal: controller.signal, abort: () => controller.abort(), timeoutMs: ms };
}

export function normalizeChunk(raw: Record<string, unknown>, provider: AiProvider): StreamChunk {
  if (!raw || typeof raw !== "object") return { text: "", done: false, provider };

  switch (provider) {
    case "openai": {
      const choices = raw["choices"];
      const delta =
        Array.isArray(choices) && choices.length > 0
          ? ((choices[0] as Record<string, unknown>)["delta"] as Record<string, unknown>)
          : {};
      return {
        text: String(delta?.["content"] ?? ""),
        done:
          Array.isArray(choices) && choices.length > 0
            ? (choices[0] as Record<string, unknown>)["finish_reason"] === "stop"
            : false,
        provider,
      };
    }
    case "anthropic": {
      const d = raw["delta"] as Record<string, unknown> | undefined;
      return {
        text: String(d?.["text"] ?? ""),
        done: raw["type"] === "message_stop",
        provider,
      };
    }
    case "gemini": {
      const candidates = raw["candidates"];
      const first =
        Array.isArray(candidates) && candidates.length > 0
          ? (candidates[0] as Record<string, unknown>)
          : undefined;
      const content = first?.["content"] as Record<string, unknown> | undefined;
      const parts = content?.["parts"];
      const text =
        Array.isArray(parts) && parts.length > 0
          ? String((parts[0] as Record<string, unknown>)["text"] ?? "")
          : "";
      return {
        text,
        done: first?.["finishReason"] === "STOP",
        provider,
      };
    }
    case "ollama": {
      const m = raw["message"] as Record<string, unknown> | undefined;
      return {
        text: String(m?.["content"] ?? ""),
        done: raw["done"] === true,
        provider,
      };
    }
    default:
      return { text: "", done: false, provider };
  }
}

export function buildStreamHeaders(provider: AiProvider, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  switch (provider) {
    case "openai":
      headers["authorization"] = `Bearer ${apiKey}`;
      break;
    case "anthropic":
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
      break;
    case "gemini":
      headers["x-goog-api-key"] = apiKey;
      break;
    case "ollama":
      if (apiKey) headers["authorization"] = `Bearer ${apiKey}`;
      break;
  }
  return headers;
}

export function streamSummary(chunks: StreamChunk[]): {
  totalChunks: number;
  totalText: string;
  estimatedTokens: number;
  done: boolean;
} {
  if (!Array.isArray(chunks)) {
    return { totalChunks: 0, totalText: "", estimatedTokens: 0, done: false };
  }
  const totalText = concatChunks(chunks);
  return {
    totalChunks: chunks.length,
    totalText,
    estimatedTokens: estimateTokens(totalText),
    done: chunks.some((c) => c.done),
  };
}
