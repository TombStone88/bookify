const fs = require("fs-extra");
const path = require("path");
const crypto = require("crypto");

// In-memory cache for cover resolution: key -> { coverUrl, expiresAt }
const coverCache = new Map();
const CACHE_TTL_SUCCESS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CACHE_TTL_FAILURE = 24 * 60 * 60 * 1000;      // 24 hours

/**
 * Normalizes text for similarity comparison
 */
function normalizeText(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Clean up PDF literal and octal string escapes
 */
function cleanPdfString(raw) {
  if (!raw) return null;
  let str = raw.trim();

  // If hex encoded <FEFF...>
  if (/^[0-9a-fA-F]+$/.test(str) && str.length % 2 === 0) {
    try {
      const buf = Buffer.from(str, "hex");
      if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
        // UTF-16BE
        str = buf.swap16().toString("utf16le", 2);
      } else {
        str = buf.toString("utf8");
      }
    } catch {
      // fallback to raw
    }
  }

  // Handle octal escapes: \050 -> '(', \051 -> ')', etc.
  str = str.replace(/\\([0-7]{1,3})/g, (match, oct) =>
    String.fromCharCode(parseInt(oct, 8))
  );

  // Handle escaped characters
  str = str.replace(/\\([()\\])/g, "$1");

  return str.trim() || null;
}

/**
 * Extracts embedded title, author, and ISBN metadata directly from PDF header/trailer
 */
function extractPdfMetadata(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { title: null, author: null, isbn: null };
    }

    const stat = fs.statSync(filePath);
    const fd = fs.openSync(filePath, "r");

    // Read first 64KB (XMP metadata / colophon) and last 256KB (/Info dictionary)
    const headSize = Math.min(65536, stat.size);
    const headBuf = Buffer.alloc(headSize);
    fs.readSync(fd, headBuf, 0, headSize, 0);

    const tailSize = Math.min(262144, stat.size);
    const tailBuf = Buffer.alloc(tailSize);
    fs.readSync(fd, tailBuf, 0, tailSize, Math.max(0, stat.size - tailSize));
    fs.closeSync(fd);

    const text = headBuf.toString("latin1") + "\n" + tailBuf.toString("latin1");

    // 1. Info dictionary /Title & /Author
    const titleMatch = text.match(/\/Title\s*(?:\(([^)]+)\)|<([0-9a-fA-F]+)>)/i);
    const authorMatch = text.match(/\/Author\s*(?:\(([^)]+)\)|<([0-9a-fA-F]+)>)/i);

    let title = cleanPdfString(titleMatch ? (titleMatch[1] || titleMatch[2]) : null);
    let author = cleanPdfString(authorMatch ? (authorMatch[1] || authorMatch[2]) : null);

    // Filter out generic software titles
    if (title && /(microsoft word|untitled|unnamed|chapter\s*\d+|calibre)/i.test(title)) {
      title = null;
    }

    // 2. ISBN pattern match (ISBN-10 or ISBN-13)
    const isbnMatch = text.match(
      /(?:ISBN(?:-1[03])?:?\s*)(97[89][- ]?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]|[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X])/i
    );
    let isbn = isbnMatch ? isbnMatch[1].replace(/[- ]/g, "").toUpperCase() : null;

    return { title, author, isbn };
  } catch (err) {
    return { title: null, author: null, isbn: null };
  }
}

/**
 * Searches Google Books API for matching book cover
 */
async function searchGoogleBooks(title, author, isbn) {
  try {
    const queryParts = [];
    if (isbn) {
      queryParts.push(`isbn:${isbn}`);
    } else {
      if (title) queryParts.push(`intitle:${encodeURIComponent(title)}`);
      if (author) queryParts.push(`inauthor:${encodeURIComponent(author)}`);
    }

    if (queryParts.length === 0) return null;

    let apiUrl = `https://www.googleapis.com/books/v1/volumes?q=${queryParts.join("+")}&maxResults=3`;
    if (process.env.GOOGLE_BOOKS_API_KEY) {
      apiUrl += `&key=${process.env.GOOGLE_BOOKS_API_KEY}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (!data.items || data.items.length === 0) {
      return null;
    }

    const normalizedInputTitle = normalizeText(title);
    const normalizedInputAuthor = normalizeText(author);

    for (const item of data.items) {
      const volumeInfo = item.volumeInfo || {};
      const candidateTitle = normalizeText(volumeInfo.title);
      const candidateAuthors = (volumeInfo.authors || []).map(normalizeText);

      // Check match reliability:
      // If matched by ISBN -> high confidence
      // If matched by title/author -> verify candidate title shares core terms
      const isIsbnMatch = Boolean(isbn);
      const isTitleMatch =
        candidateTitle.includes(normalizedInputTitle) ||
        normalizedInputTitle.includes(candidateTitle);
      const isAuthorMatch =
        !normalizedInputAuthor ||
        candidateAuthors.some(
          (a) => a.includes(normalizedInputAuthor) || normalizedInputAuthor.includes(a)
        );

      if (isIsbnMatch || (isTitleMatch && isAuthorMatch)) {
        const imageLinks = volumeInfo.imageLinks || {};
        let cover =
          imageLinks.extraLarge ||
          imageLinks.large ||
          imageLinks.medium ||
          imageLinks.thumbnail ||
          imageLinks.smallThumbnail;

        if (cover) {
          // Upgrade to https and strip curl edge
          cover = cover.replace(/^http:\/\//i, "https://").replace(/&edge=curl/gi, "");
          return cover;
        }
      }
    }

    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Fallback to Open Library when Google Books is unavailable/rate-limited
 */
async function searchOpenLibrary(title, author, isbn) {
  try {
    if (isbn) {
      const isbnCover = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
      const headRes = await fetch(isbnCover, { method: "HEAD" });
      if (headRes.ok) return isbnCover;
    }

    if (!title) return null;

    let olUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&limit=3`;
    if (author) {
      olUrl += `&author=${encodeURIComponent(author)}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(olUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.docs || data.docs.length === 0) return null;

    const normalizedInputTitle = normalizeText(title);

    for (const doc of data.docs) {
      const candidateTitle = normalizeText(doc.title);
      if (
        candidateTitle.includes(normalizedInputTitle) ||
        normalizedInputTitle.includes(candidateTitle)
      ) {
        if (doc.cover_i) {
          return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
        }
      }
    }

    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Generates a polished Antiquarian Tech SVG cover adhering to Bookify's aesthetic.
 */
function generateAntiquarianSvg(title, author) {
  const cleanTitle = (title || "Untitled Volume").trim();
  const cleanAuthor = (author || "Anonymous").trim();

  function escapeXml(unsafe) {
    return String(unsafe || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function wrapText(text, maxChars = 20, maxLines = 4) {
    const words = text.split(/\s+/);
    const lines = [];
    let current = "";
    for (const word of words) {
      if ((current + " " + word).trim().length <= maxChars) {
        current = (current + " " + word).trim();
      } else {
        if (current) lines.push(current);
        current = word;
        if (lines.length >= maxLines - 1) break;
      }
    }
    if (current && lines.length < maxLines) lines.push(current);
    return lines;
  }

  const titleLines = wrapText(cleanTitle, 18, 4);
  const authorLines = wrapText(cleanAuthor, 24, 2);
  const startY = 240 - (titleLines.length * 15);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 580" width="100%" height="100%">
  <defs>
    <linearGradient id="coverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#11151f"/>
      <stop offset="50%" stop-color="#181e2b"/>
      <stop offset="100%" stop-color="#0f121a"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#c99a6b"/>
      <stop offset="50%" stop-color="#f2be8c"/>
      <stop offset="100%" stop-color="#c99a6b"/>
    </linearGradient>
    <linearGradient id="spineShadow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#000" stop-opacity="0.65"/>
      <stop offset="30%" stop-color="#000" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Leather Background -->
  <rect width="400" height="580" fill="url(#coverGrad)"/>

  <!-- Subtle Antiquarian Geometric Border -->
  <rect x="20" y="20" width="360" height="540" rx="4" fill="none" stroke="url(#goldGrad)" stroke-width="1.5" stroke-opacity="0.38"/>
  <rect x="26" y="26" width="348" height="528" rx="2" fill="none" stroke="#f2be8c" stroke-width="0.75" stroke-opacity="0.18"/>

  <!-- Corner Filigree Accents -->
  <path d="M 30 42 L 42 42 L 42 30" fill="none" stroke="url(#goldGrad)" stroke-width="1.5" stroke-opacity="0.6"/>
  <path d="M 370 42 L 358 42 L 358 30" fill="none" stroke="url(#goldGrad)" stroke-width="1.5" stroke-opacity="0.6"/>
  <path d="M 30 538 L 42 538 L 42 550" fill="none" stroke="url(#goldGrad)" stroke-width="1.5" stroke-opacity="0.6"/>
  <path d="M 370 538 L 358 538 L 358 550" fill="none" stroke="url(#goldGrad)" stroke-width="1.5" stroke-opacity="0.6"/>

  <!-- Embossed Book Spine Edge -->
  <rect x="0" y="0" width="24" height="580" fill="url(#spineShadow)"/>

  <!-- Top Emblem -->
  <g transform="translate(200, 105)">
    <circle r="22" fill="#1b2130" stroke="url(#goldGrad)" stroke-width="1" stroke-opacity="0.4"/>
    <path d="M -9 -3 L 0 -11 L 9 -3 L 9 9 L 0 5 L -9 9 Z" fill="none" stroke="#f2be8c" stroke-width="1.2"/>
    <circle cx="0" cy="-1" r="2" fill="#f2be8c"/>
  </g>

  <!-- Title Center Typography -->
  <g transform="translate(200, ${startY})">
    ${titleLines.map((line, i) => `<text x="0" y="${i * 32}" text-anchor="middle" font-family="'EB Garamond', Garamond, Georgia, serif" font-size="23" font-weight="600" fill="#f5eedc" letter-spacing="0.5">${escapeXml(line)}</text>`).join("\n    ")}
  </g>

  <!-- Decorative Divider Ribbon -->
  <g transform="translate(200, 360)">
    <line x1="-55" y1="0" x2="55" y2="0" stroke="url(#goldGrad)" stroke-width="1" stroke-opacity="0.4"/>
    <polygon points="0,-3 3,0 0,3 -3,0" fill="#f2be8c"/>
  </g>

  <!-- Author Field -->
  <g transform="translate(200, 400)">
    ${authorLines.map((line, i) => `<text x="0" y="${i * 20}" text-anchor="middle" font-family="'Cinzel', 'Georgia', serif" font-size="12" font-weight="500" fill="#d4a373" letter-spacing="2">${escapeXml(line.toUpperCase())}</text>`).join("\n    ")}
  </g>

  <!-- Seal -->
  <g transform="translate(200, 520)">
    <text x="0" y="0" text-anchor="middle" font-family="'Cinzel', 'Georgia', serif" font-size="8.5" fill="#f2be8c" opacity="0.4" letter-spacing="3">BOOKIFY ATHENAEUM</text>
  </g>
</svg>`;
}

/**
 * Creates and writes a fallback SVG cover on disk
 */
async function createFallbackCoverFile(title, author, baseName) {
  const coversDir = path.join(__dirname, "../uploads/covers");
  await fs.ensureDir(coversDir);

  const safeFilename = `fallback-${baseName}.svg`;
  const fullPath = path.join(coversDir, safeFilename);

  const svgContent = generateAntiquarianSvg(title, author);
  await fs.writeFile(fullPath, svgContent, "utf8");

  return `/uploads/covers/${safeFilename}`;
}

/**
 * Resolves a book cover through metadata extraction, Google Books, Open Library,
 * and Antiquarian Tech fallback generation with caching.
 */
async function discoverBookCover({
  title = "",
  author = "",
  pdfPath = null,
  baseName = null,
}) {
  const safeBaseName = baseName || `${Date.now()}-${crypto.randomUUID()}`;

  // 1. Extract embedded PDF metadata if file is present
  let extracted = { title: null, author: null, isbn: null };
  if (pdfPath) {
    extracted = extractPdfMetadata(pdfPath);
  }

  // Prefer explicit user inputs, fall back to extracted metadata
  const resolvedTitle = (title && title.trim()) || extracted.title || "Book";
  const resolvedAuthor = (author && author.trim()) || extracted.author || "";
  const resolvedIsbn = extracted.isbn;

  // 2. Check memory cache
  const cacheKey = `${normalizeText(resolvedTitle)}|${normalizeText(resolvedAuthor)}|${resolvedIsbn || ""}`;
  const cached = coverCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.coverUrl;
  }

  let resolvedCoverUrl = null;

  // 3. Search Google Books API
  resolvedCoverUrl = await searchGoogleBooks(resolvedTitle, resolvedAuthor, resolvedIsbn);

  // 4. Fallback: Search Open Library API
  if (!resolvedCoverUrl) {
    resolvedCoverUrl = await searchOpenLibrary(resolvedTitle, resolvedAuthor, resolvedIsbn);
  }

  // 5. If reliable cover found, cache and return
  if (resolvedCoverUrl) {
    coverCache.set(cacheKey, {
      coverUrl: resolvedCoverUrl,
      expiresAt: Date.now() + CACHE_TTL_SUCCESS,
    });
    return resolvedCoverUrl;
  }

  // 6. Otherwise, generate Antiquarian Tech SVG fallback
  const fallbackCoverUrl = await createFallbackCoverFile(
    resolvedTitle,
    resolvedAuthor,
    safeBaseName
  );

  coverCache.set(cacheKey, {
    coverUrl: fallbackCoverUrl,
    expiresAt: Date.now() + CACHE_TTL_FAILURE,
  });

  return fallbackCoverUrl;
}

module.exports = {
  discoverBookCover,
  extractPdfMetadata,
  searchGoogleBooks,
  searchOpenLibrary,
  generateAntiquarianSvg,
  createFallbackCoverFile,
  coverCache,
};
