/**
 * vite-plugin-legacy-globals — Sprint 0 ES-module bridge
 *
 * Transforms global-scope <script> files into ES modules by:
 *   1. Stripping 'use strict'; (modules are strict by default)
 *   2. Extracting top-level function declarations → registers them on window
 *   3. Extracting top-level const/let declarations → registers them on window
 *
 * This allows the existing codebase to work as ES modules imported by main.js
 * without rewriting every cross-file reference. Each file's public API is
 * automatically exposed on `window` so other modules can use `window.xxx`.
 */

/** @returns {import('vite').Plugin} */
export function legacyGlobalsPlugin() {
  return {
    name: "legacy-globals",
    enforce: "pre",

    transform(code, id) {
      // Only process our own JS files in the js/ directory
      if (!id.endsWith(".js") || !id.includes("/js/")) return null;
      // Skip main.js (the entry point we create)
      const filename = id.split(/[/\\]/).pop();
      if (filename === "main.js") return null;
      if (filename === "store.js") return null;
      if (filename === "events.js") return null;

      let result = code;

      // 1. Strip 'use strict'; (modules are strict by default)
      result = result.replace(/^'use strict';\s*\n?/m, "");

      // 2. Extract top-level function declarations
      const fnNames = [];
      const fnRegex = /^(?:async\s+)?function\s+(\w+)\s*\(/gm;
      let m;
      while ((m = fnRegex.exec(result)) !== null) {
        fnNames.push(m[1]);
      }

      // 3. Extract top-level const/let variable names
      //    (only those at column 0 — not inside functions)
      const varNames = [];
      const varRegex = /^(?:const|let)\s+(\w+)\s*=/gm;
      while ((m = varRegex.exec(result)) !== null) {
        varNames.push(m[1]);
      }

      // 4. Build the window registration block
      const allNames = [...new Set([...fnNames, ...varNames])];
      if (allNames.length > 0) {
        result += "\n\n/* == legacy-globals bridge (Sprint 0) == */\n";
        result += "Object.assign(window, { " + allNames.join(", ") + " });\n";
      }

      return { code: result, map: null };
    },
  };
}
