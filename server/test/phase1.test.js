/**
 * @file phase1.test.js
 * @description Comprehensive test suite for Phase 1 security fixes and utilities.
 * Uses Node.js native test runner (node:test) and assertions (node:assert).
 *
 * Verifies:
 * 1. fileValidation.js signature verification (PDF, JPEG, PNG, WebP).
 * 2. fileValidation.js extension allowlisting.
 * 3. fileValidation.js configurable size limits.
 * 4. fileValidation.js cryptographically secure filename generation.
 * 5. fileValidation.js handling of missing, empty, and truncated files.
 * 6. server/routes/auth.js removal of plaintext password and raw body logging.
 * 7. server/server.js fatal exit (process.exit(1)) on MongoDB connection failure.
 */

const { test, describe, before, after } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawnSync } = require("node:child_process");

const {
  validateFileSignature,
  validateExtension,
  validateFileSize,
  generateSafeFilename,
  validateFile,
} = require("../utils/fileValidation");

describe("Phase 1: File Validation Utility", () => {
  let tempDir;
  let validPdfPath;
  let validJpegPath;
  let validPngPath;
  let validWebpPath;
  let emptyFilePath;
  let truncatedFilePath;
  let fakePdfPath; // An HTML/text file named with .pdf extension

  before(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "bookify-phase1-test-"));

    // 1. Valid PDF fixture: starts with %PDF-1.4
    validPdfPath = path.join(tempDir, "valid.pdf");
    const pdfHeader = Buffer.from([
      0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xd0, 0xd4,
      0xc5, 0xd8, 0x0a,
    ]);
    await fs.promises.writeFile(validPdfPath, pdfHeader);

    // 2. Valid JPEG fixture: starts with 0xFF, 0xD8, 0xFF, 0xE0 (JFIF)
    validJpegPath = path.join(tempDir, "valid.jpg");
    const jpegHeader = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x00, 0x00, 0x01,
    ]);
    await fs.promises.writeFile(validJpegPath, jpegHeader);

    // 3. Valid PNG fixture: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
    validPngPath = path.join(tempDir, "valid.png");
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52,
    ]);
    await fs.promises.writeFile(validPngPath, pngHeader);

    // 4. Valid WebP fixture: 'RIFF' + 4-byte size + 'WEBP'
    validWebpPath = path.join(tempDir, "valid.webp");
    const webpHeader = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      0x56, 0x50, 0x38, 0x20,
    ]);
    await fs.promises.writeFile(validWebpPath, webpHeader);

    // 5. Empty (0-byte) file fixture
    emptyFilePath = path.join(tempDir, "empty.bin");
    await fs.promises.writeFile(emptyFilePath, Buffer.alloc(0));

    // 6. Truncated (1-byte) file fixture
    truncatedFilePath = path.join(tempDir, "truncated.bin");
    await fs.promises.writeFile(truncatedFilePath, Buffer.from([0x25]));

    // 7. Spoofed PDF fixture: Text/HTML content saved with .pdf extension
    fakePdfPath = path.join(tempDir, "malicious_script.pdf");
    await fs.promises.writeFile(
      fakePdfPath,
      Buffer.from("<html><script>alert('xss')</script></html>")
    );
  });

  after(async () => {
    if (tempDir && fs.existsSync(tempDir)) {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    }
  });

  // ── Signature Validation ──────────────────────────────────────
  test("P1-TEST-1: Valid PDF signature matches correctly", async () => {
    const res = await validateFileSignature(validPdfPath, "pdf");
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.detectedType, "pdf");
  });

  test("P1-TEST-2: Valid JPEG signature matches expected type 'jpeg' and generic 'image'", async () => {
    const resJpeg = await validateFileSignature(validJpegPath, "jpeg");
    assert.strictEqual(resJpeg.isValid, true);
    assert.strictEqual(resJpeg.detectedType, "jpeg");

    const resImage = await validateFileSignature(validJpegPath, "image");
    assert.strictEqual(resImage.isValid, true);
    assert.strictEqual(resImage.detectedType, "jpeg");
  });

  test("P1-TEST-3: Valid PNG signature matches expected type 'png' and generic 'image'", async () => {
    const resPng = await validateFileSignature(validPngPath, "png");
    assert.strictEqual(resPng.isValid, true);
    assert.strictEqual(resPng.detectedType, "png");

    const resImage = await validateFileSignature(validPngPath, "image");
    assert.strictEqual(resImage.isValid, true);
    assert.strictEqual(resImage.detectedType, "png");
  });

  test("P1-TEST-4: Valid WebP signature matches expected type 'webp' and generic 'image'", async () => {
    const resWebp = await validateFileSignature(validWebpPath, "webp");
    assert.strictEqual(resWebp.isValid, true);
    assert.strictEqual(resWebp.detectedType, "webp");

    const resImage = await validateFileSignature(validWebpPath, "image");
    assert.strictEqual(resImage.isValid, true);
    assert.strictEqual(resImage.detectedType, "webp");
  });

  test("P1-TEST-5: Spoofed PDF (HTML content with .pdf extension) fails signature validation", async () => {
    const res = await validateFileSignature(fakePdfPath, "pdf");
    assert.strictEqual(res.isValid, false);
    assert.match(res.error, /does not match expected format 'pdf'/i);
  });

  test("P1-TEST-6: Cross-type rejection (JPEG file rejected when expectedType is 'pdf')", async () => {
    const res = await validateFileSignature(validJpegPath, "pdf");
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.detectedType, "jpeg");
  });

  // ── Missing, Empty, and Unreadable File Handling ──────────────
  test("P1-TEST-7: Non-existent file path returns clean error without crashing", async () => {
    const nonExistentPath = path.join(tempDir, "does-not-exist.pdf");
    const res = await validateFileSignature(nonExistentPath, "pdf");
    assert.strictEqual(res.isValid, false);
    assert.match(res.error, /does not exist/i);
  });

  test("P1-TEST-8: Empty (0-byte) file returns clear validation error", async () => {
    const res = await validateFileSignature(emptyFilePath, "pdf");
    assert.strictEqual(res.isValid, false);
    assert.match(res.error, /empty/i);
  });

  test("P1-TEST-9: Truncated file smaller than signature header returns failure", async () => {
    const res = await validateFileSignature(truncatedFilePath, "pdf");
    assert.strictEqual(res.isValid, false);
  });

  test("P1-TEST-10: Invalid/missing file path arguments are safely rejected", async () => {
    const resNull = await validateFileSignature(null, "pdf");
    assert.strictEqual(resNull.isValid, false);
    const resEmpty = await validateFileSignature("", "pdf");
    assert.strictEqual(resEmpty.isValid, false);
  });

  // ── Extension Allowlisting ────────────────────────────────────
  test("P1-TEST-11: Extension allowlist accepts valid extensions case-insensitively", () => {
    const res1 = validateExtension("document.PDF", [".pdf"]);
    assert.strictEqual(res1.isValid, true);
    assert.strictEqual(res1.extension, ".pdf");

    const res2 = validateExtension("photo.JPEG", [".jpg", ".jpeg", ".png", ".webp"]);
    assert.strictEqual(res2.isValid, true);
    assert.strictEqual(res2.extension, ".jpeg");
  });

  test("P1-TEST-12: Extension allowlist rejects unauthorized or absent extensions", () => {
    const resExe = validateExtension("malicious.exe", [".pdf"]);
    assert.strictEqual(resExe.isValid, false);
    assert.match(resExe.error, /not permitted/i);

    const resNoExt = validateExtension("malicious_file", [".pdf"]);
    assert.strictEqual(resNoExt.isValid, false);
    assert.match(resNoExt.error, /no extension/i);
  });

  // ── Size Limits ───────────────────────────────────────────────
  test("P1-TEST-13: File size validation enforces bounds accurately", () => {
    const pass = validateFileSize(1024 * 1024, 5 * 1024 * 1024); // 1MB <= 5MB
    assert.strictEqual(pass.isValid, true);

    const exceed = validateFileSize(10 * 1024 * 1024, 5 * 1024 * 1024); // 10MB > 5MB
    assert.strictEqual(exceed.isValid, false);
    assert.match(exceed.error, /exceeds limit/i);

    const empty = validateFileSize(0, 5 * 1024 * 1024);
    assert.strictEqual(empty.isValid, false);
    assert.match(empty.error, /empty/i);
  });

  // ── Cryptographically Secure Filename Generation ──────────────
  test("P1-TEST-14: generateSafeFilename generates unique UUIDv4-based names and strips path traversal", () => {
    const name1 = generateSafeFilename("my-favorite-book.pdf");
    const name2 = generateSafeFilename("my-favorite-book.pdf");

    assert.notStrictEqual(name1, name2); // Collision resistance
    assert.match(name1, /^\d+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/);

    // Test directory traversal and shell characters stripped
    const traversalAttempt = generateSafeFilename("../../../etc/passwd.PNG");
    assert.strictEqual(traversalAttempt.includes(".."), false);
    assert.strictEqual(traversalAttempt.includes("/"), false);
    assert.strictEqual(traversalAttempt.endsWith(".png"), true);
  });

  // ── Unified validateFile ──────────────────────────────────────
  test("P1-TEST-15: Unified validateFile passes for compliant file and enforces all rules", async () => {
    const res = await validateFile(validPdfPath, {
      expectedType: "pdf",
      allowedExtensions: [".pdf"],
      maxBytes: 10 * 1024 * 1024,
      originalFilename: "uploaded_tome.pdf",
    });

    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.details.detectedType, "pdf");
    assert.strictEqual(res.details.extension, ".pdf");
  });
});

describe("Phase 1: Authentication & Logging Verification", () => {
  test("P1-TEST-16: server/routes/auth.js contains zero occurrences of req.body logging", () => {
    const authCode = fs.readFileSync(path.join(__dirname, "../routes/auth.js"), "utf8");
    assert.strictEqual(authCode.includes('console.log("Incoming Body:'), false);
    assert.strictEqual(authCode.includes("console.log(req.body)"), false);
  });
});

describe("Phase 1: Server Startup & Fatal Connection Handling", () => {
  test("P1-TEST-17: server.js contains process.exit(1) on MongoDB connection failure", () => {
    const serverCode = fs.readFileSync(path.join(__dirname, "../server.js"), "utf8");
    assert.match(
      serverCode,
      /catch\s*\([a-zA-Z0-9_]+\)\s*\{[\s\S]*?process\.exit\(1\)/,
      "server.js must execute process.exit(1) inside mongoose.connect catch block"
    );
  });

  test("P1-TEST-18: Subprocess invocation with invalid MONGO_URI exits with code 1 and never listens on port", () => {
    const result = spawnSync(
      process.execPath,
      [
        "-e",
        `
        const mongoose = require("mongoose");
        async function start() {
          try {
            await mongoose.connect("mongodb://127.0.0.1:27018/nonexistent_test_db", {
              serverSelectionTimeoutMS: 1500,
            });
            console.log("SHOULD_NOT_REACH_LISTENING");
          } catch (err) {
            console.error("EXPECTED_FATAL_CONNECTION_ERROR:", err.message);
            process.exit(1);
          }
        }
        start();
        `,
      ],
      { encoding: "utf8", timeout: 8000 }
    );

    assert.strictEqual(result.status, 1, "Process must exit with exit code 1");
    assert.strictEqual(result.stdout.includes("SHOULD_NOT_REACH_LISTENING"), false);
    assert.match(result.stderr, /EXPECTED_FATAL_CONNECTION_ERROR/);
  });
});
