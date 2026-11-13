const rateLimitMap = new Map();

/**
 * In-memory sliding window rate limiter middleware for sensitive endpoints.
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds (default: 15 minutes)
 * @param {number} options.max - Maximum requests allowed per IP per window (default: 30)
 * @param {string} options.message - Error message when rate limit is exceeded
 */
function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000;
  const max = options.max || 30;
  const message = options.message || "Too many authentication requests. Please try again later.";

  return function rateLimiter(req, res, next) {
    if (!req || typeof next !== "function") return;

    // Bypass in test mode unless explicitly testing rate limits
    if (process.env.NODE_ENV === "test" && !process.env.TEST_RATE_LIMIT) {
      return next();
    }

    const ip =
      req.ip ||
      (req.headers && req.headers["x-forwarded-for"] ? req.headers["x-forwarded-for"].split(",")[0].trim() : null) ||
      (req.socket && req.socket.remoteAddress) ||
      "127.0.0.1";

    const now = Date.now();
    let timestamps = rateLimitMap.get(ip);
    if (!timestamps) {
      timestamps = [];
      rateLimitMap.set(ip, timestamps);
    }

    // Retain only requests within the active window
    const recent = timestamps.filter((t) => now - t < windowMs);
    rateLimitMap.set(ip, recent);

    if (recent.length >= max) {
      const oldest = recent[0];
      const timeRemainingMs = windowMs - (now - oldest);
      const retryAfterSec = Math.max(1, Math.ceil(timeRemainingMs / 1000));
      res.setHeader("Retry-After", retryAfterSec);
      return res.status(429).json({
        message,
        retryAfter: retryAfterSec,
      });
    }

    recent.push(now);
    next();
  };
}

const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many authentication attempts. Please wait a few minutes before trying again.",
});

module.exports = {
  createRateLimiter,
  authRateLimiter,
  _rateLimitMap: rateLimitMap, // exposed for testing cache reset
};
