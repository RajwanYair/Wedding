/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isFileSystemApiSupported,
  ACCEPTED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  validateFileType,
  validateFileSize,
  formatBytes,
  parseDroppedFiles,
  splitCsvFile,
  buildFileMetadata,
  getMimeTypeForExtension,
  readFileAsText,
  readFileAsJson,
} from "../../src/utils/file-handler.js";

// ── isFileSystemApiSupported ──────────────────────────────────────────────

describe("isFileSystemApiSupported()", () => {
  it("returns false when showOpenFilePicker is absent", () => {
    expect(isFileSystemApiSupported()).toBe(false);
  });

  it("returns true when showOpenFilePicker is present", () => {
    window.showOpenFilePicker = () => {};
    expect(isFileSystemApiSupported()).toBe(true);
    delete window.showOpenFilePicker;
  });
});

// ── ACCEPTED_MIME_TYPES ───────────────────────────────────────────────────

describe("ACCEPTED_MIME_TYPES", () => {
  it("is frozen", () => expect(Object.isFrozen(ACCEPTED_MIME_TYPES)).toBe(true));
  it("includes CSV", () => expect(ACCEPTED_MIME_TYPES["text/csv"]).toContain(".csv"));
  it("includes JSON", () => expect(ACCEPTED_MIME_TYPES["application/json"]).toContain(".json"));
  it("includes PDF", () => expect(ACCEPTED_MIME_TYPES["application/pdf"]).toContain(".pdf"));
});

// ── validateFileType ──────────────────────────────────────────────────────

describe("validateFileType()", () => {
  it("accepts text/csv", () => expect(validateFileType("text/csv")).toBe(true));
  it("accepts application/json", () => expect(validateFileType("application/json")).toBe(true));
  it("accepts image/png", () => expect(validateFileType("image/png")).toBe(true));
  it("rejects unknown type", () => expect(validateFileType("application/zip")).toBe(false));
  it("rejects empty string", () => expect(validateFileType("")).toBe(false));
});

// ── validateFileSize ──────────────────────────────────────────────────────

describe("validateFileSize()", () => {
  it("accepts 0 bytes", () => expect(validateFileSize(0)).toBe(true));
  it("accepts exact max", () => expect(validateFileSize(MAX_FILE_SIZE_BYTES)).toBe(true));
  it("rejects above max", () => expect(validateFileSize(MAX_FILE_SIZE_BYTES + 1)).toBe(false));
  it("rejects negative", () => expect(validateFileSize(-1)).toBe(false));
  it("rejects non-number", () => expect(validateFileSize("big")).toBe(false));
  it("accepts custom max", () => expect(validateFileSize(500, 1000)).toBe(true));
});

// ── formatBytes ───────────────────────────────────────────────────────────

describe("formatBytes()", () => {
  it("returns '0 B' for 0", () => expect(formatBytes(0)).toBe("0 B"));
  it("returns '0 B' for negative", () => expect(formatBytes(-1)).toBe("0 B"));
  it("returns bytes for < 1024", () => expect(formatBytes(512)).toBe("512 B"));
  it("returns KB for 1024+", () => expect(formatBytes(1024)).toBe("1.0 KB"));
  it("returns MB for 1024*1024", () => expect(formatBytes(1024 * 1024)).toBe("1.0 MB"));
  it("returns GB for 1024^3", () => expect(formatBytes(1024 ** 3)).toBe("1.0 GB"));
  it("returns '0 B' for non-number", () => expect(formatBytes("big")).toBe("0 B"));
});

// ── parseDroppedFiles ─────────────────────────────────────────────────────

const makeFile = (name, type, size) => ({ name, type, size });

describe("parseDroppedFiles()", () => {
  it("returns empty for null", () => expect(parseDroppedFiles(null)).toEqual([]));
  it("returns empty for unknown shape", () => expect(parseDroppedFiles({})).toEqual([]));

  it("accepts array of file stubs", () => {
    const files = [makeFile("data.csv", "text/csv", 100)];
    const result = parseDroppedFiles(files);
    expect(result).toHaveLength(1);
    expect(result[0].valid).toBe(true);
  });

  it("marks unsupported type as invalid", () => {
    const files = [makeFile("archive.zip", "application/zip", 100)];
    const result = parseDroppedFiles(files);
    expect(result[0].valid).toBe(false);
    expect(result[0].reason).toBe("unsupported_type");
  });

  it("marks too-large file as invalid", () => {
    const files = [makeFile("huge.csv", "text/csv", MAX_FILE_SIZE_BYTES + 1)];
    const result = parseDroppedFiles(files);
    expect(result[0].valid).toBe(false);
    expect(result[0].reason).toBe("too_large");
  });

  it("processes DataTransfer with .files property", () => {
    const fakeTransfer = { files: [makeFile("data.json", "application/json", 200)] };
    expect(parseDroppedFiles(fakeTransfer)[0].valid).toBe(true);
  });

  it("processes DataTransfer with .items property", () => {
    const item = { kind: "file", getAsFile: () => makeFile("data.json", "application/json", 200) };
    const fakeTransfer = { items: [item] };
    expect(parseDroppedFiles(fakeTransfer)[0].valid).toBe(true);
  });

  it("ignores non-file items", () => {
    const items = [
      { kind: "string", getAsFile: () => null },
      { kind: "file", getAsFile: () => makeFile("x.csv", "text/csv", 50) },
    ];
    const result = parseDroppedFiles({ items });
    expect(result).toHaveLength(1);
  });
});

// ── splitCsvFile ──────────────────────────────────────────────────────────

describe("splitCsvFile()", () => {
  it("returns empty for empty string", () => expect(splitCsvFile("")).toEqual([]));
  it("returns empty for null", () => expect(splitCsvFile(null)).toEqual([]));
  it("returns the whole file when data rows <= chunkSize", () => {
    const csv = "name,age\nAlice,30\nBob,25";
    expect(splitCsvFile(csv, 200)).toHaveLength(1);
  });

  it("splits into multiple chunks", () => {
    const header = "name,age";
    const rows = Array.from({ length: 10 }, (_, i) => `Row${i},${i}`);
    const csv = [header, ...rows].join("\n");
    const chunks = splitCsvFile(csv, 3);
    expect(chunks).toHaveLength(4);
    expect(chunks[0]).toMatch(/^name,age/);
  });

  it("each chunk preserves header", () => {
    const header = "a,b";
    const rows = Array.from({ length: 6 }, (_, i) => `${i},${i}`);
    const csv = [header, ...rows].join("\n");
    const chunks = splitCsvFile(csv, 2);
    for (const chunk of chunks) {
      expect(chunk.split("\n")[0]).toBe("a,b");
    }
  });

  it("returns empty for header-only CSV", () => {
    expect(splitCsvFile("name,age\n")).toEqual([]);
  });
});

// ── buildFileMetadata ─────────────────────────────────────────────────────

describe("buildFileMetadata()", () => {
  it("throws for null", () => expect(() => buildFileMetadata(null)).toThrow());

  it("returns correct shape", () => {
    const meta = buildFileMetadata({ name: "data.csv", size: 1024, type: "text/csv", lastModified: 1700000000 });
    expect(meta.extension).toBe(".csv");
    expect(meta.sizeFormatted).toBe("1.0 KB");
    expect(meta.valid).toBe(true);
    expect(meta.lastModified).toBe(1700000000);
  });

  it("marks invalid type in metadata", () => {
    const meta = buildFileMetadata({ name: "file.bin", size: 100, type: "application/octet-stream" });
    expect(meta.valid).toBe(false);
  });

  it("extension defaults to empty string for no extension", () => {
    const meta = buildFileMetadata({ name: "README", size: 50, type: "text/csv" });
    expect(meta.extension).toBe("");
  });
});

// ── getMimeTypeForExtension ───────────────────────────────────────────────

describe("getMimeTypeForExtension()", () => {
  it("returns mime type for .csv", () => expect(getMimeTypeForExtension(".csv")).toBe("text/csv"));
  it("returns mime type for csv without dot", () => expect(getMimeTypeForExtension("csv")).toBe("text/csv"));
  it("returns mime type for .json", () => expect(getMimeTypeForExtension(".json")).toBe("application/json"));
  it("returns null for unknown extension", () => expect(getMimeTypeForExtension(".xyz")).toBeNull());
});

// ── readFileAsText ────────────────────────────────────────────────────────

describe("readFileAsText()", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("resolves with file content", async () => {
    const mockResult = "hello,world\n1,2";
    class FakeReader {
      constructor() {
        this.result = mockResult;
      }
      readAsText(_blob, _enc) {
        Promise.resolve().then(() => this.onload?.());
      }
    }
    vi.stubGlobal("FileReader", FakeReader);
    const text = await readFileAsText(new Blob(["hello,world\n1,2"]));
    expect(text).toBe(mockResult);
  });

  it("rejects on read error", async () => {
    class FakeReaderErr {
      constructor() {
        this.result = null;
        this.error = { message: "disk error" };
      }
      readAsText(_blob, _enc) {
        Promise.resolve().then(() => this.onerror?.());
      }
    }
    vi.stubGlobal("FileReader", FakeReaderErr);
    await expect(readFileAsText(new Blob([]))).rejects.toThrow("Failed to read file");
  });
});

// ── readFileAsJson ────────────────────────────────────────────────────────

describe("readFileAsJson()", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("parses valid JSON", async () => {
    const data = { foo: "bar" };
    class FakeReaderJson {
      constructor() { this.result = JSON.stringify(data); }
      readAsText(_blob, _enc) { Promise.resolve().then(() => this.onload?.()); }
    }
    vi.stubGlobal("FileReader", FakeReaderJson);
    const result = await readFileAsJson(new Blob([JSON.stringify(data)]));
    expect(result).toEqual(data);
  });

  it("rejects for invalid JSON", async () => {
    class FakeReaderBadJson {
      constructor() { this.result = "not json {{"; }
      readAsText(_blob, _enc) { Promise.resolve().then(() => this.onload?.()); }
    }
    vi.stubGlobal("FileReader", FakeReaderBadJson);
    await expect(readFileAsJson(new Blob(["not json {{"]))).rejects.toThrow("valid JSON");
  });
});
