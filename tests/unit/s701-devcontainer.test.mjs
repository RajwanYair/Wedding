/**
 * tests/unit/s701-devcontainer.test.mjs
 * S701 — DevContainer + Codespaces: devcontainer.json shape,
 *         required extensions, port forwarding, lifecycle hooks.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

function getDevContainer() {
  const raw = readFileSync(resolve(ROOT, ".devcontainer/devcontainer.json"), "utf8");
  return JSON.parse(raw);
}

describe("S701 .devcontainer/devcontainer.json", () => {
  it("file exists", () => {
    expect(existsSync(resolve(ROOT, ".devcontainer/devcontainer.json"))).toBe(true);
  });

  it("is valid JSON", () => {
    expect(() => getDevContainer()).not.toThrow();
  });

  it("uses Node 22 image", () => {
    const dc = getDevContainer();
    expect(dc.image).toContain("node:22");
  });

  it("postCreateCommand runs npm ci", () => {
    const dc = getDevContainer();
    expect(dc.postCreateCommand).toContain("npm ci");
  });

  it("postCreateCommand installs Playwright browser", () => {
    const dc = getDevContainer();
    expect(dc.postCreateCommand).toContain("playwright install");
  });

  it("forwards port 5173 for Vite", () => {
    const dc = getDevContainer();
    expect(dc.forwardPorts).toContain(5173);
  });

  it("forwards port 4173 for Vite preview", () => {
    const dc = getDevContainer();
    expect(dc.forwardPorts).toContain(4173);
  });

  it("has portsAttributes for 5173", () => {
    const dc = getDevContainer();
    expect(dc.portsAttributes?.["5173"]).toBeTruthy();
    expect(dc.portsAttributes["5173"].label).toBeTruthy();
  });

  it("includes ESLint extension", () => {
    const dc = getDevContainer();
    const exts = dc.customizations?.vscode?.extensions ?? [];
    expect(exts.some((e) => e.toLowerCase().includes("eslint"))).toBe(true);
  });

  it("includes Stylelint extension", () => {
    const dc = getDevContainer();
    const exts = dc.customizations?.vscode?.extensions ?? [];
    expect(exts.some((e) => e.toLowerCase().includes("stylelint"))).toBe(true);
  });

  it("includes GitHub Copilot extension", () => {
    const dc = getDevContainer();
    const exts = dc.customizations?.vscode?.extensions ?? [];
    expect(exts.some((e) => e.toLowerCase().includes("copilot"))).toBe(true);
  });

  it("includes Playwright extension", () => {
    const dc = getDevContainer();
    const exts = dc.customizations?.vscode?.extensions ?? [];
    expect(exts.some((e) => e.toLowerCase().includes("playwright"))).toBe(true);
  });

  it("sets formatOnSave to true", () => {
    const dc = getDevContainer();
    expect(dc.customizations?.vscode?.settings?.["editor.formatOnSave"]).toBe(true);
  });

  it("uses flat config for ESLint", () => {
    const dc = getDevContainer();
    expect(dc.customizations?.vscode?.settings?.["eslint.useFlatConfig"]).toBe(true);
  });

  it("has github-cli feature", () => {
    const dc = getDevContainer();
    const featureKeys = Object.keys(dc.features ?? {});
    expect(featureKeys.some((k) => k.includes("github-cli"))).toBe(true);
  });

  it("sets NODE_NO_WARNINGS env var", () => {
    const dc = getDevContainer();
    expect(dc.remoteEnv?.NODE_NO_WARNINGS).toBe("1");
  });
});

describe("S701 README Codespaces badge", () => {
  it("README has Codespaces badge", () => {
    const readme = readFileSync(resolve(ROOT, "README.md"), "utf8");
    expect(readme.toLowerCase()).toContain("codespaces");
  });
});
