/**
 * @file fileValidation.js
 * @description Secure file validation utility for the Bookify platform.
 *
 * Provides:
 * - Magic-byte signature (header) verification for PDF, JPEG, PNG, and WebP formats.
 * - File extension allowlisting and normalization.
 * - Configurable byte-size boundaries.
 * - Cryptographically random filename generation using crypto.randomUUID().
 * - Robust handling of missing, empty, locked, and unreadable files.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CRITICAL SECURITY & ARCHITECTURAL LIMITATION NOTICE:
 * Signature / magic-byte validation verifies ONLY that the leading byte sequence
 * matches the standardized header magic numbers for the expected format.
 *
 * Magic-byte verification does NOT establish that a file is:
 * 1. Structurally intact or well-formed according to complete format specifications.
 * 2. Free from malicious embedded payloads (e.g., PDF JavaScript, macro exploits,
 *    embedded executable streams, or font parser exploits).
 * 3. Safe against parser memory-corruption or denial-of-service vulnerabilities.
 *
 * Applications processing user uploads in high-trust or public environments must
 * pair this validation with sandboxed execution, content security policies (CSP),
 * isolated storage boundaries, and dedicated rendering workers.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/**
 * Known file signatures (magic bytes).
 */
const MAGIC_SIGNATURES = {
  // PDF: %PDF- (0x25, 0x50, 0x44, 0x46)
  pdf: {
    bytes: [0x25, 0x50, 0x44, 0x46],
    offset: 0,
    minFileSize: 4,
  },
  // JPEG / JFIF / EXIF: 0xFF, 0xD8, 0xFF
  jpeg: {
    bytes: [0xff, 0xd8, 0xff],
    offset: 0,
    minFileSize: 3,
  },
  // PNG: 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'
  png: {
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    offset: 0,
    minFileSize: 8,
  },
  // WebP: 'RIFF' at 0..3 and 'WEBP' at 8..11
  webp: {
    minFileSize: 12,
    check: (buffer) => {
      if (buffer.length < 12) return false;
      const isRiff =
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46; // "RIFF"
      const isWebp =
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50; // "WEBP"
      return isRiff && isWebp;
    },
  },
};

/**
 * Standardized extension allowlists.
 */
const DEFAULT_ALLOWLISTS = {
  pdf: [".pdf"],
  image: [".jpg", ".jpeg", ".png", ".webp"],
};

/**
 * Normalizes and validates a file extension against an allowlist.
 *
 * @param {string} filename - The filename to inspect.
 * @param {string[]} allowedExtensions - Array of allowed extensions (e.g. ['.pdf']).
 * @returns {{ isValid: boolean, extension: string, error?: string }}
 */
function validateExtension(filename, allowedExtensions) {
  if (typeof filename !== "string" || !filename.trim()) {
    return {
      isValid: false,
      extension: "",
      error: "Filename must be a non-empty string.",
    };
  }

  if (!Array.isArray(allowedExtensions) || allowedExtensions.length === 0) {
    return {
      isValid: false,
      extension: "",
      error: "Allowed extensions must be a non-empty array.",
    };
  }

  const rawExt = path.extname(filename).toLowerCase();
  if (!rawExt) {
    return {
      isValid: false,
      extension: "",
      error: "File has no extension.",
    };
  }

  const normalizedAllowed = allowedExtensions.map((e) =>
    (e.startsWith(".") ? e : `.${e}`).toLowerCase()
  );

  const isAllowed = normalizedAllowed.includes(rawExt);
  return {
    isValid: isAllowed,
    extension: rawExt,
    error: isAllowed ? undefined : `Extension '${rawExt}' is not permitted. Allowed: ${normalizedAllowed.join(", ")}`,
  };
}

/**
 * Validates that file size is non-zero and within configured byte limits.
 *
 * @param {number} fileSizeInBytes - The actual file size.
 * @param {number} maxBytes - Maximum permitted size in bytes.
 * @returns {{ isValid: boolean, error?: string }}
 */
function validateFileSize(fileSizeInBytes, maxBytes) {
  if (typeof fileSizeInBytes !== "number" || isNaN(fileSizeInBytes) || fileSizeInBytes < 0) {
    return {
      isValid: false,
      error: "Invalid file size provided.",
    };
  }

  if (fileSizeInBytes === 0) {
    return {
      isValid: false,
      error: "File is empty (0 bytes).",
    };
  }

  if (typeof maxBytes === "number" && maxBytes > 0 && fileSizeInBytes > maxBytes) {
    return {
      isValid: false,
      error: `File size (${fileSizeInBytes} bytes) exceeds limit of ${maxBytes} bytes.`,
    };
  }

  return { isValid: true };
}

/**
 * Validates the magic-byte file signature of a file on disk.
 *
 * Handles:
 * - Missing or invalid file paths.
 * - Non-existent files (ENOENT).
 * - Empty (0-byte) files.
 * - Files smaller than signature header length.
 * - Unreadable / permission-locked files (EACCES).
 *
 * @param {string} filePath - Absolute or relative path to the file.
 * @param {'pdf' | 'jpeg' | 'png' | 'webp' | 'image'} expectedType - Expected format type.
 * @returns {Promise<{ isValid: boolean, detectedType?: string, error?: string }>}
 */
async function validateFileSignature(filePath, expectedType) {
  if (typeof filePath !== "string" || !filePath.trim()) {
    return {
      isValid: false,
      error: "File path must be a non-empty string.",
    };
  }

  const targetType = (expectedType || "").toLowerCase();
  if (!["pdf", "jpeg", "png", "webp", "image"].includes(targetType)) {
    return {
      isValid: false,
      error: `Unsupported expected type: '${expectedType}'. Supported: pdf, jpeg, png, webp, image.`,
    };
  }

  // 1. Inspect file stats (existence, file vs dir, non-empty)
  let stats;
  try {
    stats = await fs.promises.stat(filePath);
  } catch (err) {
    if (err.code === "ENOENT") {
      return { isValid: false, error: "File does not exist at specified path." };
    }
    if (err.code === "EACCES" || err.code === "EPERM") {
      return { isValid: false, error: "File is unreadable: permission denied." };
    }
    return { isValid: false, error: `Unable to access file: ${err.message}` };
  }

  if (!stats.isFile()) {
    return { isValid: false, error: "Specified path is not a regular file." };
  }

  if (stats.size === 0) {
    return { isValid: false, error: "File is empty (0 bytes)." };
  }

  // 2. Read first 16 bytes for signature inspection
  const bytesToRead = Math.min(16, stats.size);
  const buffer = Buffer.alloc(bytesToRead);

  let fileHandle;
  try {
    fileHandle = await fs.promises.open(filePath, "r");
    await fileHandle.read(buffer, 0, bytesToRead, 0);
  } catch (err) {
    return { isValid: false, error: `Failed to read file header: ${err.message}` };
  } finally {
    if (fileHandle) {
      await fileHandle.close();
    }
  }

  // 3. Match signatures
  const isPdf =
    stats.size >= MAGIC_SIGNATURES.pdf.minFileSize &&
    buffer.slice(0, 4).equals(Buffer.from(MAGIC_SIGNATURES.pdf.bytes));

  const isJpeg =
    stats.size >= MAGIC_SIGNATURES.jpeg.minFileSize &&
    buffer.slice(0, 3).equals(Buffer.from(MAGIC_SIGNATURES.jpeg.bytes));

  const isPng =
    stats.size >= MAGIC_SIGNATURES.png.minFileSize &&
    buffer.slice(0, 8).equals(Buffer.from(MAGIC_SIGNATURES.png.bytes));

  const isWebp =
    stats.size >= MAGIC_SIGNATURES.webp.minFileSize &&
    MAGIC_SIGNATURES.webp.check(buffer);

  let detected = null;
  if (isPdf) detected = "pdf";
  else if (isJpeg) detected = "jpeg";
  else if (isPng) detected = "png";
  else if (isWebp) detected = "webp";

  if (targetType === "image") {
    if (detected === "jpeg" || detected === "png" || detected === "webp") {
      return { isValid: true, detectedType: detected };
    }
    return {
      isValid: false,
      detectedType: detected || "unknown",
      error: `File signature does not match allowed image formats (JPEG, PNG, WebP).`,
    };
  }

  if (detected === targetType) {
    return { isValid: true, detectedType: detected };
  }

  return {
    isValid: false,
    detectedType: detected || "unknown",
    error: `File signature does not match expected format '${targetType}'. Detected: '${detected || "unknown"}'.`,
  };
}

/**
 * Generates a cryptographically random, collision-resistant, and sanitized filename.
 * Eliminates directory traversal (`../`), null-byte injection, and shell meta-characters.
 *
 * @param {string} originalFilenameOrExt - The original file name or extension.
 * @returns {string} Safe filename format: `<timestamp>-<uuidv4>.<sanitized-ext>`
 */
function generateSafeFilename(originalFilenameOrExt) {
  const rawExt = typeof originalFilenameOrExt === "string"
    ? path.extname(originalFilenameOrExt) || originalFilenameOrExt
    : "";

  // Sanitize extension: keep only alphanumeric characters, lowercased, trimmed to max 10 chars
  const sanitizedExt = rawExt
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase()
    .slice(0, 10);

  const uuid = crypto.randomUUID();
  const timestamp = Date.now();

  return sanitizedExt ? `${timestamp}-${uuid}.${sanitizedExt}` : `${timestamp}-${uuid}`;
}

/**
 * Unified comprehensive validator for an uploaded file.
 *
 * Runs sequentially:
 * 1. Existence and readability check.
 * 2. Non-empty check.
 * 3. File size check against maxBytes (if configured).
 * 4. Extension allowlist check against original filename (if configured).
 * 5. Magic-byte signature verification.
 *
 * @param {string} filePath - Path to file on disk.
 * @param {Object} options
 * @param {'pdf' | 'jpeg' | 'png' | 'webp' | 'image'} options.expectedType - Expected signature format.
 * @param {string[]} [options.allowedExtensions] - Optional extension allowlist.
 * @param {number} [options.maxBytes] - Optional maximum allowed file size.
 * @param {string} [options.originalFilename] - Optional original filename for extension checking.
 * @returns {Promise<{ isValid: boolean, error?: string, details?: Object }>}
 */
async function validateFile(filePath, optionsOrFilename = {}, maybeOptions = {}) {
  let options = {};
  if (typeof optionsOrFilename === "string") {
    options = { ...maybeOptions, originalFilename: optionsOrFilename };
  } else if (optionsOrFilename && typeof optionsOrFilename === "object") {
    options = { ...optionsOrFilename };
  }

  const expectedType = options.expectedType;
  const originalFilename = options.originalFilename;
  const maxBytes =
    options.maxBytes !== undefined ? options.maxBytes : options.maxSizeBytes;
  const allowedExtensions =
    options.allowedExtensions ||
    (expectedType && DEFAULT_ALLOWLISTS[expectedType]
      ? DEFAULT_ALLOWLISTS[expectedType]
      : undefined);

  if (!expectedType) {
    return {
      isValid: false,
      valid: false,
      error: "Validation options must specify an expectedType.",
    };
  }

  // 1. Extension check (if original filename provided)
  let extensionInfo = null;
  if (originalFilename && allowedExtensions) {
    extensionInfo = validateExtension(originalFilename, allowedExtensions);
    if (!extensionInfo.isValid) {
      return {
        isValid: false,
        valid: false,
        error: extensionInfo.error,
        details: { extension: extensionInfo.extension },
      };
    }
  }

  // 2. Stat file for size check
  let stats;
  try {
    stats = await fs.promises.stat(filePath);
  } catch (err) {
    if (err.code === "ENOENT") {
      return { isValid: false, valid: false, error: "File does not exist at specified path." };
    }
    return { isValid: false, valid: false, error: `Unable to access file: ${err.message}` };
  }

  // 3. Size check
  const sizeValidation = validateFileSize(stats.size, maxBytes);
  if (!sizeValidation.isValid) {
    return {
      isValid: false,
      valid: false,
      error: sizeValidation.error,
      details: { size: stats.size, maxBytes },
    };
  }

  // 4. Magic-byte signature check
  const signatureValidation = await validateFileSignature(filePath, expectedType);
  if (!signatureValidation.isValid) {
    return {
      isValid: false,
      valid: false,
      error: signatureValidation.error,
      details: {
        size: stats.size,
        extension: extensionInfo?.extension,
        detectedType: signatureValidation.detectedType,
      },
    };
  }

  return {
    isValid: true,
    valid: true,
    details: {
      size: stats.size,
      extension: extensionInfo?.extension,
      detectedType: signatureValidation.detectedType,
    },
  };
}

module.exports = {
  validateFileSignature,
  validateExtension,
  validateFileSize,
  generateSafeFilename,
  validateFile,
  DEFAULT_ALLOWLISTS,
  MAGIC_SIGNATURES,
};
