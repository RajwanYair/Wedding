import { defineConfig } from "vite";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { copyFileSync } from "node:fs";

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
    closeBundle() {
      copyFileSync("CHANGELOG.md", join("dist", "CHANGELOG.md"));
    },
  };
}

export default defineConfig({
  base: "/Wedding/",
  plugins: [copyChangelog()],
  cacheDir: join(TEMP_BASE, "vite-cache"),
  build: {
    outDir: "dist",
    emptyOutDir: true,
    minify: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        /* S4.5 + S1.8: Manual chunk splitting — section templates + public bundle */
        manualChunks(id) {
          if (id.includes("i18n/en.json")) return "locale-en";

          // S1.8: Public bundle — RSVP, landing, guest-landing load without admin
          if (
            id.includes("src/sections/rsvp") ||
            id.includes("src/sections/landing") ||
            id.includes("src/sections/guest-landing") ||
            id.includes("src/sections/contact-collector") ||
            id.includes("src/sections/registry")
          )
            return "chunk-public";

          // S1.8: Lazy section templates — each in its own chunk
          if (id.includes("src/templates/")) {
            const match = id.match(/src\/templates\/([^/]+)\.html/);
            return match ? `template-${match[1]}` : "templates";
          }

          if (
            id.includes("analytics") ||
            id.includes("budget") ||
            id.includes("expenses")
          )
            return "chunk-analytics";
          if (
            id.includes("gallery") ||
            id.includes("timeline") ||
            id.includes("registry")
          )
            return "chunk-gallery";
          if (
            id.includes("sheets") ||
            id.includes("auth") ||
            id.includes("push") ||
            id.includes("email")
          )
            return "chunk-services";
        },
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
    cacheDir: join(TEMP_BASE, "vitest-cache"),
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**"],
      exclude: [
        "tests/**",
        "scripts/**",
        "vite-plugin-legacy-globals.mjs",
        "vite.config.js",
      ],
      thresholds: {
        lines: 80,
        branches: 70,
        functions: 80,
        statements: 80,
      },
    },
  },
});
