const sharp = require("sharp");
const path = require("path");
const fs = require("fs-extra");
const crypto = require("crypto");

const cacheDir = path.join(__dirname, "../uploads/cache");
fs.ensureDirSync(cacheDir);

/**
 * Optimizes an uploaded profile image:
 * Resizes and converts to WebP:
 * - Full avatar: 256x256
 * - Thumbnail: 64x64
 * Removes the original raw upload file.
 *
 * @param {string} filePath - Absolute path to uploaded raw image
 * @returns {Promise<{ url: string, thumbUrl: string }>}
 */
async function processProfileImage(filePath) {
  const profileDir = path.join(__dirname, "../uploads/profile");
  await fs.ensureDir(profileDir);

  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);

  const webpFilename = `${base}.webp`;
  const thumbFilename = `${base}-thumb.webp`;

  const webpPath = path.join(profileDir, webpFilename);
  const thumbPath = path.join(profileDir, thumbFilename);

  // 1. Generate full avatar (256x256 WebP)
  await sharp(filePath)
    .resize(256, 256, { fit: "cover", position: "center" })
    .webp({ quality: 82, effort: 4 })
    .toFile(webpPath);

  // 2. Generate thumb avatar (64x64 WebP)
  await sharp(filePath)
    .resize(64, 64, { fit: "cover", position: "center" })
    .webp({ quality: 80, effort: 4 })
    .toFile(thumbPath);

  // Clean up raw upload if it was not already a webp with the same name in profileDir
  if (path.resolve(filePath) !== path.resolve(webpPath)) {
    await fs.remove(filePath).catch(() => {});
  }

  return {
    url: `/uploads/profile/${webpFilename}`,
    thumbUrl: `/uploads/profile/${thumbFilename}`,
  };
}

/**
 * Optimizes a book cover:
 * Creates standard cover (max 600w) and thumbnail (200x300 WebP)
 */
async function processCoverImage(filePath, baseName) {
  const coversDir = path.join(__dirname, "../uploads/covers");
  await fs.ensureDir(coversDir);

  const fullFilename = `${baseName}.webp`;
  const thumbFilename = `${baseName}-thumb.webp`;

  const fullPath = path.join(coversDir, fullFilename);
  const thumbPath = path.join(coversDir, thumbFilename);

  await sharp(filePath)
    .resize(600, 900, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(fullPath);

  await sharp(filePath)
    .resize(200, 300, { fit: "cover" })
    .webp({ quality: 80 })
    .toFile(thumbPath);

  return {
    url: `/uploads/covers/${fullFilename}`,
    thumbUrl: `/uploads/covers/${thumbFilename}`,
  };
}

/**
 * Retrieves or generates an optimized thumbnail from an image buffer or file.
 * Returns { buffer, contentType, etag }
 */
async function getOptimizedImage({ sourceUrl, width = 240, format = "webp", quality = 80 }) {
  if (!sourceUrl || typeof sourceUrl !== "string") {
    throw new Error("Invalid source URL");
  }

  const safeWidth = Math.min(1200, Math.max(32, parseInt(width, 10) || 240));
  const safeQuality = Math.min(100, Math.max(20, parseInt(quality, 10) || 80));
  const targetFormat = ["webp", "avif", "jpeg", "png"].includes(format) ? format : "webp";

  // Determine cache key
  const hash = crypto
    .createHash("md5")
    .update(`${sourceUrl}_${safeWidth}_${targetFormat}_${safeQuality}`)
    .digest("hex");
  const cachedFile = path.join(cacheDir, `${hash}.${targetFormat}`);
  const etag = `"${hash}"`;

  if (await fs.pathExists(cachedFile)) {
    const buffer = await fs.readFile(cachedFile);
    return { buffer, contentType: `image/${targetFormat}`, etag };
  }

  // Check if sourceUrl is a local /uploads path or points to loopback
  let cleanUrl = sourceUrl;
  try {
    if (/^https?:\/\//i.test(sourceUrl)) {
      const parsed = new URL(sourceUrl);
      if (parsed.pathname.startsWith("/uploads/")) {
        cleanUrl = parsed.pathname;
      }
    }
  } catch (e) {}

  // Fetch or read image
  let inputBuffer;
  if (/^https?:\/\//i.test(cleanUrl)) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(cleanUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Bookify-ImageOptimizer/1.0" },
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`Failed to fetch source image: ${res.status}`);
    const arrayBuf = await res.arrayBuffer();
    inputBuffer = Buffer.from(arrayBuf);
  } else {
    // Relative local path - enforce directory traversal safety
    const localClean = cleanUrl.replace(/^\/?/, "");
    const allowedRoot = path.resolve(__dirname, "..");
    const fullPath = path.resolve(allowedRoot, localClean);
    if (!fullPath.startsWith(allowedRoot)) {
      throw new Error("Access denied: Invalid path traversal");
    }
    if (!(await fs.pathExists(fullPath))) {
      throw new Error("Local file not found");
    }
    inputBuffer = await fs.readFile(fullPath);
  }

  // If already SVG, serve as SVG without re-encoding
  if (cleanUrl.toLowerCase().endsWith(".svg") || inputBuffer.slice(0, 100).includes("<svg")) {
    return { buffer: inputBuffer, contentType: "image/svg+xml", etag };
  }

  let pipeline = sharp(inputBuffer).resize(safeWidth, null, {
    withoutEnlargement: true,
  });

  if (targetFormat === "avif") {
    pipeline = pipeline.avif({ quality: safeQuality });
  } else if (targetFormat === "webp") {
    pipeline = pipeline.webp({ quality: safeQuality, effort: 4 });
  } else if (targetFormat === "png") {
    pipeline = pipeline.png({ quality: safeQuality });
  } else {
    pipeline = pipeline.jpeg({ quality: safeQuality, mozjpeg: true });
  }

  const outputBuffer = await pipeline.toBuffer();
  await fs.writeFile(cachedFile, outputBuffer).catch(() => {});

  return { buffer: outputBuffer, contentType: `image/${targetFormat}`, etag };
}

module.exports = {
  processProfileImage,
  processCoverImage,
  getOptimizedImage,
};
