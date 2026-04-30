import { defineConfig } from "vite";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { copyFileSync, readFileSync } from "node:fs";

// Suppress Node.js '--localstorage-file' warning emitted in Vitest worker forks.
// NODE_NO_WARNINGS is inherited by child_process.fork() workers.
if (process.env.VITEST !== undefined) {
  process.env.NODE_NO_WARNINGS = "1";
}

const TEMP_BASE = join(tmpdir(), "wedding-dev");

/** Simple Vite plugin to copy CHANGELOG.md into dist/ for runtime fetch. */
function copyChangelog() {
  return {
    name: "copy-changelog",
    configureServer(server) {
      // Serve CHANGELOG.md from root during dev (`/CHANGELOG.md`).
      server.middlewares.use((req, res, next) => {
        if (req.url === "/CHANGELOG.md" || req.url === "/Wedding/CHANGELOG.md") {
          res.setHeader("Content-Type", "text/markdown; charset=utf-8");
          res.end(readFileSync("CHANGELOG.md", "utf-8"));
          return;
        }
        next();
      });
    },
    closeBundle() {
      copyFileSync("CHANGELOG.md", join("dist", "CHANGELOG.md"));
    },
  };
}

export default defineConfig({
  // Override via VITE_BASE for environments that serve at root (E2E preview,
  // Lighthouse static-dist server). Production GH Pages deploys under /Wedding/.
  base: process.env.VITE_BASE ?? "/Wedding/",
  plugins: [copyChangelog()],
  cacheDir: join(TEMP_BASE, "vite-cache"),
  build: {
    outDir: "dist",
    emptyOutDir: true,
    minify: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        /* B8 (ROADMAP §6 Phase B): Auto code splitting — Vite splits on dynamic
         * import() boundaries introduced by section/modal/template lazy loaders
         * and locale dictionaries. No manual config — survives file renames and
         * stays correct as the section/template surface evolves. */
        /* Keep asset filenames stable for SRI hashing */
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  server: {
    open: true,
  },
  test: {
    include: ["tests/**/*.test.mjs"],
    pool: "vmThreads",
    // Vitest 4: poolOptions moved to top-level per-pool options
    vmThreads: { execArgv: ["--no-warnings"] },
    cacheDir: join(TEMP_BASE, "vitest-cache"),
    // Stub optional peer deps that are not installed in the test environment.
    // @sentry/browser is lazy-imported in observability.js; the .catch(() => null)
    // handles the runtime case, but vite:import-analysis needs a resolvable path.
    alias: [{ find: "@sentry/browser", replacement: resolve("tests/stubs/sentry-browser.mjs") }],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html", "json-summary"],
      include: ["src/**"],
      exclude: [
        "tests/**",
        "scripts/**",
        "vite.config.js",
        // TypeScript declaration files: type-only, no executable code
        "src/**/*.d.ts",
        "src/types/**",
        // Locale data: JSON imported as data, not executable code
        "src/i18n/**/*.json",
        // HTML templates: lazy-loaded markup, not JS
        "src/**/*.html",
        // Bootstrap entry: integration-tested via Playwright E2E (tests/e2e/)
        "src/main.js",
      ],
      // Per-directory thresholds (ratchet model): each tier reflects what is
      // realistically unit-testable. Section UI rendering and external-API
      // service wrappers are partially covered here and topped up via E2E.
      // Current floors: any drop fails CI; tests can only push these higher.
      thresholds: {
        // S303: ratcheted to floor(actual). Stmts | Branch | Funcs | Lines column order.
        // Measured: stmts 49.84%, branches 45.46%, functions 55.98%, lines 50.27%.
        // S314 uplift (v13.13.0): stmts ~50.8%, branches ~45.6%, functions ~56.6%, lines ~51.3%.
        // S324 uplift (v13.14.0): stmts ~52.62%, branches ~46.76%, functions ~59.31%, lines ~53.17%.
        // S333 uplift (v13.15.0): stmts ~55.8%, branches ~49.04%, functions ~64.03%, lines ~56.27%.
        // S344 uplift (v13.16.0): stmts ~57.22%, branches ~50.5%, functions ~65.25%, lines ~57.75%.
        // S346 fix (v13.16.0 corrected): re-measured floor(actual) — lower by ~1% variance.
        // S354 uplift (v13.17.0): stmts ~57.79%, branches ~50.57%, functions ~66.17%, lines ~57.39%.
        // S364 uplift (v13.18.0): stmts 57.42%, branches 50.57%, functions 66.2%, lines 57.76%.
        // S373 uplift (v13.19.0): stmts 58.33%, branches 51.61%, functions 66.73%, lines 58.81%.
        lines: 58,
        branches: 51,
        functions: 66,
        statements: 58,
        // S234 + S289: per-directory ratchet to measured floors (floor(actual)).
        // S354 uplift: utils stmts 93→93(stable), utils lines 94→96;
        //              repos stmts 71→82, repos lines 83→94;
        //              services stmts 73→74, services lines 75→76;
        //              core stmts 67→70, core branches 60→64, core functions 62→64, core lines 67→74.
        // S364 uplift: utils stmts 93→94, utils lines 96→97;
        //              repos stmts 82→83, repos lines 94→95;
        //              services stmts 74→75, services lines 76→77;
        //              core stmts 70→71, core branches 64→65, core functions 64→65, core lines 74→75;
        //              sections stmts 27→28 (all others stable).
        // S373 uplift: utils stmts 94(stable), utils lines 97(stable);
        //              repos stmts 83(stable), repos lines 95(stable);
        //              services stmts 75→76, services branches 65→66, services lines 77(stable);
        //              core stmts 71→74, core branches 65→67, core functions 65→66, core lines 75→78;
        //              sections stmts 28→29, sections branches 25→27, sections fns 41→43, sections lines 27→29.
        "src/utils/**": { lines: 97, branches: 82, functions: 94, statements: 94 },
        "src/repositories/**": { lines: 95, branches: 54, functions: 97, statements: 83 },
        "src/services/**": { lines: 77, branches: 66, functions: 77, statements: 76 },
        "src/core/**": { lines: 78, branches: 67, functions: 66, statements: 74 },
        "src/sections/**": { lines: 29, branches: 27, functions: 43, statements: 29 },
      },
    },
  },
});
