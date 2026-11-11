const { test, describe, before, after } = require("node:test");
const assert = require("node:assert");
const path = require("path");
const fs = require("fs-extra");
const sharp = require("sharp");
const express = require("express");
const http = require("http");

const {
  processProfileImage,
  processCoverImage,
  getOptimizedImage,
} = require("../utils/imageOptimizer");
const imageRoutes = require("../routes/imageRoutes");

describe("Image Optimizer & Performance Suite", () => {
  const testDir = path.join(__dirname, "fixtures");
  const sampleImagePath = path.join(testDir, "sample.png");
  const sampleSvgPath = path.join(testDir, "sample.svg");
  let server;
  let baseUrl;

  before(async () => {
    await fs.ensureDir(testDir);

    // Create a sample 500x500 PNG test fixture
    await sharp({
      create: {
        width: 500,
        height: 500,
        channels: 4,
        background: { r: 212, g: 163, b: 115, alpha: 1 },
      },
    })
      .png()
      .toFile(sampleImagePath);

    // Create a sample SVG test fixture
    await fs.writeFile(
      sampleSvgPath,
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#131722"/></svg>',
      "utf8"
    );

    // Create lightweight express test app and bind to random ephemeral port
    const app = express();
    app.use(express.json());
    app.use("/api/images", imageRoutes);

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, "127.0.0.1", () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await fs.remove(testDir).catch(() => {});
  });

  test("1. processProfileImage creates standard 256x256 WebP avatar and 64x64 thumbnail", async () => {
    const rawAvatarPath = path.join(testDir, "raw-avatar.png");
    await fs.copy(sampleImagePath, rawAvatarPath);

    const result = await processProfileImage(rawAvatarPath);

    assert.ok(result.url.endsWith(".webp"));
    assert.ok(result.thumbUrl.endsWith("-thumb.webp"));

    const fullAvatarDisk = path.join(__dirname, "..", result.url);
    const thumbAvatarDisk = path.join(__dirname, "..", result.thumbUrl);

    assert.ok(await fs.pathExists(fullAvatarDisk), "Standard avatar file exists");
    assert.ok(await fs.pathExists(thumbAvatarDisk), "Thumb avatar file exists");

    // Verify metadata
    const fullMeta = await sharp(fullAvatarDisk).metadata();
    assert.strictEqual(fullMeta.format, "webp");
    assert.strictEqual(fullMeta.width, 256);
    assert.strictEqual(fullMeta.height, 256);

    const thumbMeta = await sharp(thumbAvatarDisk).metadata();
    assert.strictEqual(thumbMeta.format, "webp");
    assert.strictEqual(thumbMeta.width, 64);
    assert.strictEqual(thumbMeta.height, 64);

    // Clean up
    await fs.remove(fullAvatarDisk).catch(() => {});
    await fs.remove(thumbAvatarDisk).catch(() => {});
  });

  test("2. processCoverImage creates WebP cover and 200x300 thumbnail", async () => {
    const testCoverSrc = path.join(testDir, "raw-cover.png");
    await fs.copy(sampleImagePath, testCoverSrc);

    const baseName = `test-cover-${Date.now()}`;
    const result = await processCoverImage(testCoverSrc, baseName);

    assert.ok(result.url.includes(`${baseName}.webp`));
    assert.ok(result.thumbUrl.includes(`${baseName}-thumb.webp`));

    const coverDisk = path.join(__dirname, "..", result.url);
    const thumbDisk = path.join(__dirname, "..", result.thumbUrl);

    const coverMeta = await sharp(coverDisk).metadata();
    assert.strictEqual(coverMeta.format, "webp");
    assert.ok(coverMeta.width <= 600);

    const thumbMeta = await sharp(thumbDisk).metadata();
    assert.strictEqual(thumbMeta.format, "webp");
    assert.strictEqual(thumbMeta.width, 200);
    assert.strictEqual(thumbMeta.height, 300);

    // Clean up
    await fs.remove(testCoverSrc).catch(() => {});
    await fs.remove(coverDisk).catch(() => {});
    await fs.remove(thumbDisk).catch(() => {});
  });

  test("3. getOptimizedImage resizes, encodes to WebP, and serves from disk cache", async () => {
    const relativeSrc = path.relative(path.join(__dirname, ".."), sampleImagePath);

    const firstRun = await getOptimizedImage({
      sourceUrl: relativeSrc,
      width: 120,
      format: "webp",
      quality: 80,
    });

    assert.strictEqual(firstRun.contentType, "image/webp");
    assert.ok(firstRun.buffer.length > 0);
    assert.ok(firstRun.etag);

    const meta = await sharp(firstRun.buffer).metadata();
    assert.strictEqual(meta.format, "webp");
    assert.strictEqual(meta.width, 120);

    // Second run should hit cache and return identical ETag
    const secondRun = await getOptimizedImage({
      sourceUrl: relativeSrc,
      width: 120,
      format: "webp",
      quality: 80,
    });

    assert.strictEqual(secondRun.etag, firstRun.etag);
    assert.strictEqual(secondRun.buffer.length, firstRun.buffer.length);
  });

  test("4. getOptimizedImage preserves SVGs directly without raster degradation", async () => {
    const relativeSvg = path.relative(path.join(__dirname, ".."), sampleSvgPath);

    const result = await getOptimizedImage({
      sourceUrl: relativeSvg,
      width: 240,
    });

    assert.strictEqual(result.contentType, "image/svg+xml");
    assert.ok(result.buffer.toString("utf8").includes("<svg"));
  });

  test("5. getOptimizedImage prevents directory traversal attacks", async () => {
    await assert.rejects(
      async () => {
        await getOptimizedImage({
          sourceUrl: "../../../../../Windows/System32/drivers/etc/hosts",
          width: 100,
        });
      },
      /Invalid path traversal|Local file not found|Access denied/i
    );
  });

  test("6. GET /api/images/optimize returns 400 when url param is missing", async () => {
    const res = await fetch(`${baseUrl}/api/images/optimize`);
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.ok(body.error);
  });

  test("7. GET /api/images/optimize returns 200, WebP, and 30-day Cache-Control header", async () => {
    const relativeSrc = path.relative(path.join(__dirname, ".."), sampleImagePath);

    const res = await fetch(
      `${baseUrl}/api/images/optimize?url=${encodeURIComponent(relativeSrc)}&w=180&fmt=webp`
    );

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get("content-type"), "image/webp");

    const cacheControl = res.headers.get("cache-control");
    assert.ok(cacheControl.includes("public"));
    assert.ok(cacheControl.includes("max-age=2592000"));
    assert.ok(cacheControl.includes("immutable"));

    const etag = res.headers.get("etag");
    assert.ok(etag);

    // Test conditional request (ETag 304 Not Modified)
    const cachedRes = await fetch(
      `${baseUrl}/api/images/optimize?url=${encodeURIComponent(relativeSrc)}&w=180&fmt=webp`,
      {
        headers: { "If-None-Match": etag },
      }
    );

    assert.strictEqual(cachedRes.status, 304);
  });
});
