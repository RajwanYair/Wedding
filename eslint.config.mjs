export default [
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        fetch: "readonly",
        AbortController: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        console: "readonly",
        requestAnimationFrame: "readonly",
        getComputedStyle: "readonly",
        Map: "readonly",
        Set: "readonly",
        Promise: "readonly",
        URLSearchParams: "readonly",
        URL: "readonly",
        Intl: "readonly",
        performance: "readonly",
        HTMLElement: "readonly",
        KeyboardEvent: "readonly",
        Event: "readonly",
        CustomEvent: "readonly",
        DOMParser: "readonly",
        location: "readonly",
        requestIdleCallback: "readonly",
        Blob: "readonly",
        alert: "readonly",
        prompt: "readonly",
        history: "readonly",
        Notification: "readonly",
        CSS: "readonly",
        AbortSignal: "readonly",
        MutationObserver: "readonly",
        ResizeObserver: "readonly",
        IntersectionObserver: "readonly",
        confirm: "readonly",
        FormData: "readonly",
        FileReader: "readonly",
        btoa: "readonly",
        atob: "readonly",
        structuredClone: "readonly",
      },
    },
    rules: {
      // ── Security ──────────────────────────────────────────────────
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",

      // ── Correctness ───────────────────────────────────────────────
      "no-undef": "error",
      "no-dupe-args": "error",
      "no-dupe-keys": "error",
      "no-duplicate-case": "error",
      "no-unreachable": "error",
      "use-isnan": "error",
      "valid-typeof": "error",
      "no-constant-condition": ["error", { checkLoops: false }],
      "no-redeclare": "error",
      "no-empty": ["error", { allowEmptyCatch: true }],
      eqeqeq: ["error", "smart"],

      // ── Modernisation ─────────────────────────────────────────────
      "no-var": "error",
      "prefer-const": "error",

      // ── Unused variables ──────────────────────────────────────────
      // Functions used as HTML inline event handlers (onclick, oninput…)
      // are never "called" from JS so ESLint marks them unused.
      // Each prefix corresponds to a naming convention in index.html.
      "no-unused-vars": [
        "error",
        {
          varsIgnorePattern:
            "^_|^load|^render|^init|^toggle|^update|^handle" +
            "|^show|^hide|^open|^close|^add|^remove|^save|^delete" +
            "|^export|^import|^send|^cycle|^filter|^set|^sort|^edit" +
            "|^submit|^download|^clear|^print|^login|^sign|^sync",
          argsIgnorePattern: "^_|^e$|^k$",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // ── Style ─────────────────────────────────────────────────────
      "no-prototype-builtins": "error",
      "no-inner-declarations": "error",
    },
  },
];
