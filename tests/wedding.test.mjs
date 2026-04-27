// =============================================================================
// Wedding Manager — Repo Sanity Suite v12.5.7
// Keeps high-level repo assertions aligned with the current src/ architecture.
// =============================================================================

import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function read(relativePath) {
  return readFileSync(resolve(ROOT, relativePath), "utf8");
}

function readHtmlDir(relativeDir) {
  const dir = resolve(ROOT, relativeDir);
  if (!existsSync(dir)) return "";
  return readdirSync(dir)
    .filter((file) => file.endsWith(".html"))
    .map((file) => readFileSync(resolve(dir, file), "utf8"))
    .join("\n");
}

const indexHtml = read("index.html");
const readme = read("README.md");
const architecture = read("ARCHITECTURE.md");
const copilotInstructions = read(".github/copilot-instructions.md");
const contributing = read("CONTRIBUTING.md");
const roadmap = read("ROADMAP.md");
const packageJson = JSON.parse(read("package.json"));
const serviceWorker = read("public/sw.js");
const mainSource = read("src/main.js");
const typesSource = read("src/types.d.ts");
const constantsSource = read("src/core/constants.js");
const runtimeSources = [
  read("src/main.js"),
  read("src/core/config.js"),
  read("src/core/i18n.js"),
  read("src/core/nav.js"),
  read("src/core/store.js"),
  read("src/services/auth.js"),
  read("src/services/sheets.js"),
].join("\n");
const allHtml = [indexHtml, readHtmlDir("src/templates"), readHtmlDir("src/modals")].join("\n");

describe("Version alignment", function () {
  it("package.json is v12.5.7", function () {
    assert.equal(packageJson.version, "12.5.7");
  });

  it("src/core/config.js exports APP_VERSION v12.5.7", function () {
    assert.ok(read("src/core/config.js").includes('APP_VERSION = "12.5.7"'));
  });

  it("public/sw.js uses wedding-v12.5.7 cache", function () {
    assert.ok(serviceWorker.includes("wedding-v12.5.7"));
  });

  it("README version badge references v12.5.7", function () {
    assert.ok(readme.includes("version-v12.5.7"));
  });

  it("Copilot instructions title references v12.5.7", function () {
    assert.ok(
      copilotInstructions.includes(
        "# GitHub Copilot Instructions — Wedding Manager v12.5.7",
      ),
    );
  });

  it("ARCHITECTURE.md header references v12.5.7", function () {
    assert.ok(architecture.includes("# Wedding Manager — Architecture (v12.5.7)"));
  });

  it("src/types.d.ts header references v12.5.7", function () {
    assert.ok(
      typesSource.includes(
        "src/types.d.ts — Shared type definitions for the Wedding Manager (v12.5.7)",
      ),
    );
  });
});

describe("Repo structure", function () {
  it("uses src/main.js as the runtime entry", function () {
    assert.ok(
      indexHtml.includes('src="/src/main.js"') ||
        indexHtml.includes('src="./src/main.js"') ||
        indexHtml.includes('src="src/main.js"'),
    );
  });

  it("includes current runtime directories", function () {
    ["src/core", "src/sections", "src/services", "src/templates", "src/modals"].forEach((dir) => {
      assert.ok(existsSync(resolve(ROOT, dir)), `${dir} missing`);
    });
  });

  it("does not depend on a legacy js/ runtime tree in repo docs", function () {
    assert.ok(!readme.includes("js/ directory"));
  });
});

describe("HTML shell", function () {
  it("uses RTL Hebrew defaults", function () {
    assert.ok(indexHtml.includes('lang="he"'));
    assert.ok(indexHtml.includes('dir="rtl"'));
  });

  it("includes PWA manifest", function () {
    assert.ok(indexHtml.includes("manifest.json"));
  });

  it("contains the core public and admin sections", function () {
    ["landing", "dashboard", "guests", "tables", "whatsapp", "rsvp", "settings", "analytics", "changelog"].forEach((section) => {
      assert.ok(
        allHtml.includes(`id="sec-${section}"`) || allHtml.includes(`data-template="${section}"`),
        `missing section ${section}`,
      );
    });
  });
});

describe("Current architecture", function () {
  it("main.js imports sections from src/sections", function () {
    assert.ok(mainSource.includes('from "./sections/dashboard.js"'));
    assert.ok(mainSource.includes('from "./sections/guests.js"'));
    assert.ok(mainSource.includes('from "./sections/tables.js"'));
  });

  it("main.js reuses canonical defaults and public section config", function () {
    assert.ok(mainSource.includes('from "./core/defaults.js"'));
    assert.ok(mainSource.includes('from "./core/constants.js"'));
    assert.ok(mainSource.includes("buildStoreDefs("));
    assert.ok(!mainSource.includes("const _defaultWeddingInfo = {"));
    assert.ok(!mainSource.includes("const PUBLIC_SECTIONS = new Set(["));
  });

  it("main.js reuses auth UI helpers from src/core", function () {
    assert.ok(mainSource.includes('from "./core/nav-auth.js"'));
    assert.ok(mainSource.includes('from "./core/status-bar.js"'));
    assert.ok(!mainSource.includes("function _maybeShowWhatsNew(user)"));
  });

  it("constants define centralized guest enums", function () {
    assert.ok(constantsSource.includes("GUEST_STATUSES"));
    assert.ok(constantsSource.includes("GUEST_GROUPS"));
    assert.ok(constantsSource.includes("neighbors"));
  });

  it("centralizes remaining direct-storage keys for auth, diagnostics, and push cache", function () {
    assert.ok(constantsSource.includes('PUSH_SUBSCRIPTION_CACHE: "wedding_v1_push_sub"'));
    assert.ok(constantsSource.includes('REVOKED_TOKENS: "wedding_v1_revoked_tokens"'));
    assert.ok(constantsSource.includes('SUPABASE_AUTH: "wedding_v1_supabase_auth"'));
    assert.ok(constantsSource.includes('IDB_MIGRATED: "wedding_v1_idb_migrated"'));
    assert.ok(read("src/services/push-notifications.js").includes("STORAGE_KEYS.PUSH_SUBSCRIPTION_CACHE"));
    assert.ok(read("src/services/guest-token.js").includes("STORAGE_KEYS.REVOKED_TOKENS"));
    assert.ok(read("src/services/supabase-auth.js").includes("STORAGE_KEYS.SUPABASE_SESSION"));
    assert.ok(read("src/services/backend.js").includes("STORAGE_KEYS.SHEETS_MIRROR"));
    assert.ok(read("src/core/supabase-client.js").includes("STORAGE_KEYS.SUPABASE_AUTH"));
    assert.ok(read("src/main.js").includes("STORAGE_KEYS.IDB_MIGRATED"));
  });

  it("defaults and constants include canonical campaign store support", function () {
    assert.ok(read("src/core/defaults.js").includes('campaigns: { value: load("campaigns", []), storageKey: "campaigns" }'));
    assert.ok(constantsSource.includes('campaigns: DATA_CLASS.ADMIN_SENSITIVE'));
  });

  it("defaults and constants include canonical appErrors support", function () {
    assert.ok(read("src/core/defaults.js").includes('appErrors: { value: load("appErrors", []), storageKey: "appErrors" }'));
    assert.ok(constantsSource.includes('appErrors: DATA_CLASS.OPERATIONAL'));
  });

  it("defaults, constants, and types include canonical support for runtime service domains", function () {
    const defaultsSource = read("src/core/defaults.js");
    const typesSource = read("src/types.d.ts");

    [
      'approvedEmails: {',
      'auditLog: {',
      'budgetEnvelopes: {',
      'checkinSessions: {',
      'deliveries: {',
      'donationGoals: {',
      'donations: {',
      'notificationPreferences: {',
      'offline_queue: {',
      'push_subscriptions: {',
      'rsvp_log: {',
      'seatingConstraints: {',
      'webhookDeliveries: {',
      'webhooks: {',
    ].forEach((snippet) => {
      assert.ok(defaultsSource.includes(snippet), `missing default ${snippet}`);
    });

    [
      'approvedEmails: DATA_CLASS.ADMIN_SENSITIVE',
      'auditLog: DATA_CLASS.ADMIN_SENSITIVE',
      'notificationPreferences: DATA_CLASS.GUEST_PRIVATE',
      'offline_queue: DATA_CLASS.GUEST_PRIVATE',
      'rsvp_log: DATA_CLASS.ADMIN_SENSITIVE',
      'webhooks: DATA_CLASS.ADMIN_SENSITIVE',
    ].forEach((snippet) => {
      assert.ok(constantsSource.includes(snippet), `missing data class ${snippet}`);
    });

    [
      'commLog: CommunicationLogEntry[];',
      'rsvp_log: RsvpLogEntry[];',
      'notificationPreferences: Record<string, NotificationPrefs>;',
      'webhooks: Webhook[];',
    ].forEach((snippet) => {
      assert.ok(typesSource.includes(snippet), `missing type ${snippet}`);
    });
  });

  it("store-backed services rely on canonical bootstrap instead of local initStore calls", function () {
    assert.ok(!read("src/services/seating-constraints.js").includes("initStore("));
  });

  it("multi-event state relies on the global state layer instead of event-scoped store keys", function () {
    const multiEvent = read("src/services/multi-event.js");
    const stateSource = read("src/core/state.js");
    assert.ok(multiEvent.includes('from "../core/state.js"'));
    assert.ok(multiEvent.includes("loadGlobal"));
    assert.ok(multiEvent.includes("saveGlobal"));
    assert.ok(!multiEvent.includes('storeGet("events")'));
    assert.ok(!multiEvent.includes('storeSet("events"'));
    assert.ok(stateSource.includes("export function loadGlobal"));
    assert.ok(stateSource.includes("export function saveGlobal"));
  });

  it("default wedding info includes registryLinks for landing and registry views", function () {
    assert.ok(read("src/core/defaults.js").includes('registryLinks: "[]"'));
    assert.ok(read("src/services/sheets-impl.js").includes('"registryLinks"'));
  });

  it("runtime sources still include Google Sheets write queue semantics", function () {
    assert.ok(runtimeSources.includes("enqueueWrite"));
    assert.ok(runtimeSources.includes("appendToRsvpLog") || runtimeSources.includes("syncStoreKeyToSheets"));
  });

  it("keeps src/i18n locale files", function () {
    ["src/i18n/he.json", "src/i18n/en.json"].forEach((file) => {
      assert.ok(existsSync(resolve(ROOT, file)), `${file} missing`);
    });
  });
});

describe("Docs sanity", function () {
  it("README and ARCHITECTURE describe src/main.js", function () {
    assert.ok(readme.includes("src/main.js"));
    assert.ok(architecture.includes("src/main.js"));
  });

  it("CONTRIBUTING does not require deleted CLAUDE.md", function () {
    assert.ok(!contributing.includes("CLAUDE.md"));
  });

  it("ROADMAP no longer points to GUIDE.md as a current deliverable", function () {
    assert.ok(!roadmap.includes("GUIDE.md"));
  });
});

describe("Quality scripts", function () {
  it("package.json exposes lint, test, build, i18n parity, and ci scripts", function () {
    ["lint", "test", "build", "check:i18n", "sync:version", "ci"].forEach(
      (script) => {
        assert.ok(packageJson.scripts[script], `missing script ${script}`);
      },
    );
  });

  it("package.json targets Node 22+", function () {
    assert.equal(packageJson.engines.node, ">=22.0.0");
  });

  it("CI workflow uses npm ci and npm test", function () {
    const ci = read(".github/workflows/ci.yml");
    assert.ok(ci.includes("npm ci"));
    assert.ok(ci.includes("npm test"));
  });
});
