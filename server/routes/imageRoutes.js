const express = require("express");
const router = express.Router();
const { getOptimizedImage } = require("../utils/imageOptimizer");

router.get("/optimize", async (req, res) => {
  try {
    const { url, w, width, fmt, format, q, quality } = req.query;

    if (!url) {
      return res.status(400).json({ error: "Missing required query parameter: url" });
    }

    // Determine target format with content negotiation if not explicitly provided
    let targetFormat = fmt || format;
    if (!targetFormat || targetFormat === "auto") {
      const accept = req.headers.accept || "";
      if (accept.includes("image/avif")) {
        targetFormat = "avif";
      } else if (accept.includes("image/webp")) {
        targetFormat = "webp";
      } else {
        targetFormat = "jpeg";
      }
    }

    const targetWidth = parseInt(w || width, 10) || 240;
    const targetQuality = parseInt(q || quality, 10) || 80;

    const { buffer, contentType, etag } = await getOptimizedImage({
      sourceUrl: url,
      width: targetWidth,
      format: targetFormat,
      quality: targetQuality,
    });

    // Check client conditional request (ETag / 304)
    if (req.headers["if-none-match"] === etag) {
      return res.status(304).end();
    }

    res.set({
      "Content-Type": contentType,
      "Content-Length": buffer.length,
      "Cache-Control": "public, max-age=2592000, immutable", // 30 days immutable browser cache
      ETag: etag,
    });

    return res.send(buffer);
  } catch (err) {
    if (err.message && err.message.includes("not found")) {
      return res.status(404).json({ error: err.message });
    }
    return res.status(400).json({ error: err.message || "Image optimization failed" });
  }
});

module.exports = router;
