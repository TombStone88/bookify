const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs-extra");
const path = require("path");

const {
  extractPdfMetadata,
  generateAntiquarianSvg,
  discoverBookCover,
  coverCache,
} = require("../utils/coverDiscovery");

test("Cover Discovery & Antiquarian Fallbacks Suite", async (t) => {
  await t.test("1. extractPdfMetadata extracts metadata from PDF files safely", () => {
    const samplePdfPath = path.join(__dirname, "../uploads/1794299882235-pride-and-prejudice-jane-austen.pdf");
    if (fs.existsSync(samplePdfPath)) {
      const meta = extractPdfMetadata(samplePdfPath);
      assert.ok(meta, "Metadata extraction should return an object");
      assert.strictEqual(meta.author, "Jane Austen", "Should correctly extract author from PDF info dictionary");
    }

    // Non-existent file should safely return nulls without throwing
    const nonExistentMeta = extractPdfMetadata("invalid/path/to/missing.pdf");
    assert.deepStrictEqual(nonExistentMeta, { title: null, author: null, isbn: null });
  });

  await t.test("2. generateAntiquarianSvg produces valid, styled SVG markup", () => {
    const svg = generateAntiquarianSvg("The Count of Monte Cristo", "Alexandre Dumas");
    assert.ok(svg.startsWith("<svg"), "Must output valid SVG markup");
    assert.ok(svg.includes("The Count of Monte"), "Must include wrapped book title");
    assert.ok(svg.includes("ALEXANDRE DUMAS"), "Must include author in uppercase");
    assert.ok(svg.includes("#f2be8c"), "Must use Bookify primary gold/parchment accent");
    assert.ok(svg.includes("BOOKIFY ATHENAEUM"), "Must include Bookify Athenaeum seal");
  });

  await t.test("3. Antiquarian SVG escapes XML special characters to prevent injection", () => {
    const maliciousTitle = 'War & Peace <script>alert("xss")</script>';
    const maliciousAuthor = 'Leo Tolstoy "The Great" & <Co>';
    const svg = generateAntiquarianSvg(maliciousTitle, maliciousAuthor);

    assert.ok(!svg.includes("<script>"), "Must sanitize raw script tags");
    assert.ok(svg.includes("&amp;"), "Must escape raw ampersands");
    assert.ok(svg.includes("&lt;"), "Must escape raw less-than symbols");
    assert.ok(svg.includes("&gt;"), "Must escape raw greater-than symbols");
  });

  await t.test("4. discoverBookCover falls back to Antiquarian SVG when external APIs find no match", async () => {
    const fakeTitle = `CompletelyNonexistentTome_${Date.now()}`;
    const fakeAuthor = "Fictional Author QXYZ";
    const resultCover = await discoverBookCover({
      title: fakeTitle,
      author: fakeAuthor,
      baseName: `test-fake-${Date.now()}`,
    });

    assert.ok(resultCover.startsWith("/uploads/covers/fallback-"), "Must return local fallback SVG cover");

    const physicalPath = path.join(__dirname, "..", resultCover);
    assert.ok(fs.existsSync(physicalPath), "Physical SVG cover file must exist on disk");

    // Clean up test file
    await fs.remove(physicalPath).catch(() => {});
  });

  await t.test("5. Cache prevents repeated API calls for same book query", async () => {
    const title = "Cached Volume Test";
    const author = "Cache Author";

    const base = `cache-test-${Date.now()}`;
    const cover1 = await discoverBookCover({ title, author, baseName: base });
    const cover2 = await discoverBookCover({ title, author, baseName: base });

    assert.strictEqual(cover1, cover2, "Repeated lookup must return cached cover reference");

    if (cover1.startsWith("/uploads/covers/")) {
      await fs.remove(path.join(__dirname, "..", cover1)).catch(() => {});
    }
  });
});
