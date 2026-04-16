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
        /* S4.5 + S1.8 + F1.6.4: Manual chunk splitting — per-section + templates + public bundle */
        manualChunks(id) {
          if (id.includes("i18n/en.json")) return "locale-en";
          if (id.includes("i18n/ar.json")) return "locale-ar";
          if (id.includes("i18n/ru.json")) return "locale-ru";

          // S1.8: Public bundle — RSVP, landing, guest-landing load without admin
          if (
            id.includes("src/sections/rsvp") ||
            id.includes("src/sections/landing") ||
            id.includes("src/sections/guest-landing") ||
            id.includes("src/sections/contact-collector") ||
            id.includes("src/sections/registry")
          )
            return "chunk-public";

          // F1.6.4: Per-section chunks for admin sections
          if (id.includes("src/sections/dashboard")) return "sec-dashboard";
          if (id.includes("src/sections/guests")) return "sec-guests";
          if (id.includes("src/sections/tables")) return "sec-tables";
          if (id.includes("src/sections/vendors")) return "sec-vendors";
          if (id.includes("src/sections/whatsapp")) return "sec-whatsapp";
          if (id.includes("src/sections/checkin")) return "sec-checkin";
          if (id.includes("src/sections/settings")) return "sec-settings";
          if (id.includes("src/sections/invitation")) return "sec-invitation";
          if (id.includes("src/sections/changelog")) return "sec-changelog";

          // S1.8: Lazy section templates — each in its own chunk
          if (id.includes("src/templates/")) {
            const match = id.match(/src\/templates\/([^/]+)\.html/);
            return match ? `template-${match[1]}` : "templates";
          }

          if (id.includes("src/sections/analytics")) return "sec-analytics";
          if (id.includes("src/sections/budget")) return "sec-budget";
          if (id.includes("src/sections/expenses")) return "sec-expenses";
          if (id.includes("src/sections/gallery")) return "sec-gallery";
          if (id.includes("src/sections/timeline")) return "sec-timeline";
          if (
            id.includes("sheets") ||
            id.includes("auth") ||
            id.includes("push") ||
            id.includes("email")
          )
            return "chunk-services";

          // Plugin modules
          if (id.includes("src/plugins/")) return "chunk-plugins";
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
