import js from "@eslint/js";

// Load shared base from parent tooling dir (local dev + CI with setup step)
let shared;
try {
  shared = await import("../tooling/eslint/base.mjs");
} catch {
  shared = null;
}

const linterOpts = shared?.baseLinterOptions ?? {
  reportUnusedDisableDirectives: "error",
};
const langOpts = shared?.baseLanguageOptions ?? {
  ecmaVersion: 2025,
  sourceType: "module",
};
const rules = shared?.baseRules ?? {
  "no-eval": "error",
  "no-implied-eval": "error",
  "no-new-func": "error",
  "no-undef": "error",
  "no-dupe-args": "error",
  "no-dupe-keys": "error",
  "no-duplicate-case": "error",
  "no-unreachable": "error",
  "use-isnan": "error",
  "valid-typeof": "error",
  "no-constant-condition": ["error", { checkLoops: false }],
  "no-redeclare": ["error", { builtinGlobals: false }],
  "no-empty": ["error", { allowEmptyCatch: true }],
  eqeqeq: ["error", "smart"],
  "no-var": "error",
  "prefer-const": "error",
  "prefer-template": "error",
  "object-shorthand": ["error", "always"],
  "no-console": ["error", { allow: ["error", "warn"] }],
  "no-unused-vars": [
    "error",
    {
      varsIgnorePattern: "^_",
      argsIgnorePattern: "^_|^e$|^k$",
      caughtErrors: "all",
      caughtErrorsIgnorePattern: "^_",
    },
  ],
  "no-prototype-builtins": "error",
  "no-inner-declarations": "error",
  "no-throw-literal": "error",
  "no-self-compare": "error",
  "no-sequences": "error",
  "no-useless-concat": "error",
  "no-useless-return": "error",
  "no-lone-blocks": "error",
  "no-lonely-if": "error",
};
const browserGlobals = shared?.browserGlobals ?? {
  window: "readonly",
  document: "readonly",
  navigator: "readonly",
  localStorage: "readonly",
  sessionStorage: "readonly",
  fetch: "readonly",
  Headers: "readonly",
  AbortController: "readonly",
  AbortSignal: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
  console: "readonly",
  requestAnimationFrame: "readonly",
  requestIdleCallback: "readonly",
  getComputedStyle: "readonly",
  Map: "readonly",
  Set: "readonly",
  Promise: "readonly",
  URLSearchParams: "readonly",
  URL: "readonly",
  Intl: "readonly",
  performance: "readonly",
  PerformanceObserver: "readonly",
  PerformanceEventTiming: "readonly",
  HTMLElement: "readonly",
  HTMLInputElement: "readonly",
  HTMLTextAreaElement: "readonly",
  HTMLFormElement: "readonly",
  HTMLSelectElement: "readonly",
  HTMLButtonElement: "readonly",
  HTMLAnchorElement: "readonly",
  HTMLImageElement: "readonly",
  HTMLCanvasElement: "readonly",
  KeyboardEvent: "readonly",
  Event: "readonly",
  MouseEvent: "readonly",
  CustomEvent: "readonly",
  DOMParser: "readonly",
  location: "readonly",
  history: "readonly",
  Blob: "readonly",
  alert: "readonly",
  prompt: "readonly",
  confirm: "readonly",
  Notification: "readonly",
  CSS: "readonly",
  MutationObserver: "readonly",
  ResizeObserver: "readonly",
  IntersectionObserver: "readonly",
  FormData: "readonly",
  FileReader: "readonly",
  btoa: "readonly",
  atob: "readonly",
  structuredClone: "readonly",
  WebSocket: "readonly",
  crypto: "readonly",
  indexedDB: "readonly",
  IDBDatabase: "readonly",
  IDBRequest: "readonly",
  TextEncoder: "readonly",
  TextDecoder: "readonly",
  ServiceWorkerRegistration: "readonly",
};
const nodeGlobals = shared?.nodeGlobals ?? {
  process: "readonly",
  __dirname: "readonly",
  __filename: "readonly",
  Buffer: "readonly",
};
const testDomGlobals = shared?.testDomGlobals ?? {
  HTMLSpanElement: "readonly",
  HTMLInputElement: "readonly",
  HTMLButtonElement: "readonly",
  HTMLDivElement: "readonly",
  HTMLFormElement: "readonly",
  HTMLSelectElement: "readonly",
  HTMLTextAreaElement: "readonly",
  HTMLImageElement: "readonly",
  HTMLAnchorElement: "readonly",
  HTMLLIElement: "readonly",
  HTMLUListElement: "readonly",
  HTMLOListElement: "readonly",
  HTMLTableElement: "readonly",
  HTMLTableRowElement: "readonly",
  HTMLTableCellElement: "readonly",
  HTMLParagraphElement: "readonly",
  HTMLHeadingElement: "readonly",
  TouchEvent: "readonly",
  Touch: "readonly",
  HashChangeEvent: "readonly",
  PopStateEvent: "readonly",
  StorageEvent: "readonly",
  MessageEvent: "readonly",
  CloseEvent: "readonly",
  ProgressEvent: "readonly",
  ErrorEvent: "readonly",
  FocusEvent: "readonly",
  InputEvent: "readonly",
  DragEvent: "readonly",
  WheelEvent: "readonly",
};

export default [
  js.configs.recommended,
  {
    linterOptions: linterOpts,
    languageOptions: {
      ...langOpts,
      globals: {
        ...browserGlobals,
        // Wedding-specific OAuth provider globals
        FB: "readonly",
        AppleID: "readonly",
        google: "readonly",
        // Service Worker API globals (not in all shared configs)
        ServiceWorkerRegistration: "readonly",
        caches: "readonly",
        // Additional browser globals
        Image: "readonly",
        File: "readonly",
        // Web Vitals / performance observers (monitoring.js)
        PerformanceObserver: "readonly",
        PerformanceEventTiming: "readonly",
      },
    },
    rules,
  },
  // Build/utility scripts + vite config — Node environment, console and process allowed
  {
    files: ["scripts/**", "vite.config.js"],
    languageOptions: {
      globals: nodeGlobals,
    },
    rules: { "no-console": "off" },
  },
  // Section files — enforce arch boundary: sections must not statically import heavy services
  // (B9 ROADMAP Phase B). Use src/core/sync.js bridge, src/repositories/, or dynamic import().
  {
    files: ["src/sections/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "../services/sheets.js",
              message: "Sections must import sync primitives via ../core/sync.js (B9 arch rule).",
            },
            {
              name: "../services/backend.js",
              message:
                "Sections must use ../repositories/ or dynamic import() for backend calls (B9 arch rule).",
            },
            {
              name: "../services/supabase.js",
              message:
                "Sections must use ../repositories/ or dynamic import() for Supabase access (B9 arch rule).",
            },
          ],
        },
      ],
    },
  },
  // Test files — happy-dom + Node globals (vi, global, browser APIs not in root config)
  {
    files: ["tests/**"],
    languageOptions: {
      globals: {
        ...nodeGlobals,
        global: "readonly",
        globalThis: "readonly",
        ...testDomGlobals,
      },
    },
    rules: {
      "no-console": "off",
    },
  },
];
