import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import api, { resolveFileUrl } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// ── Configure PDF.js worker ─────────────────────────────────
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PDFViewer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);

  // Query parameters: bookId / id & file
  const bookId = query.get('bookId') || query.get('id');
  const initialFile = query.get('file');

  const [fileUrl, setFileUrl] = useState(initialFile ? resolveFileUrl(initialFile) : null);
  const [bookDetails, setBookDetails] = useState(null);
  const [loadingBook, setLoadingBook] = useState(!initialFile && !!bookId);

  // PDF Document State
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfOutline, setPdfOutline] = useState([]);
  const [pdfError, setPdfError] = useState(null);
  const [pageAspectRatio, setPageAspectRatio] = useState(0.707); // Default A4 ~1:1.414

  // Reading Progress & Sync
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef(null);
  const initialPageRestored = useRef(false);

  // Sizing & Fit Modes: 'page' (Fit Page) | 'width' (Fit Width) | 'height' (Fit Height) | 'custom'
  const [fitMode, setFitMode] = useState('page');
  const [userZoom, setUserZoom] = useState(1.0); // Multiplier: 0.5x to 3.0x
  const [isContinuous, setIsContinuous] = useState(false);

  // Fullscreen & Distraction-Free State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(true);
  const [pinFloatingToolbar, setPinFloatingToolbar] = useState(false);
  const hideToolbarTimer = useRef(null);

  // Appearance Mode: 'original' | 'sepia' | 'night'
  const [appearanceMode, setAppearanceMode] = useState('original');
  const [showAppearanceMenu, setShowAppearanceMenu] = useState(false);

  // Side Drawer: null | 'marginalia' | 'index' | 'bookmarks'
  const [activeDrawer, setActiveDrawer] = useState(null);

  // Archivist Personal Notes (Marginalia)
  const [personalNote, setPersonalNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Local Bookmarks
  const [bookmarks, setBookmarks] = useState([]);

  // Container measurement refs
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 1200, height: 800 });

  // ── 1. Fetch Book Details from API if needed ───────────────
  useEffect(() => {
    if (!bookId) return;
    api
      .get(`/api/books/details/${bookId}`)
      .then((res) => {
        const book = res.data;
        setBookDetails(book);
        if (!fileUrl && book.fileUrl) {
          setFileUrl(resolveFileUrl(book.fileUrl));
        }
        if (book.note) {
          setPersonalNote(book.note);
        }
        if (book.progress !== undefined) {
          setProgress(book.progress);
        }
        if (book.currentPage) {
          setPageNumber(book.currentPage);
        }
      })
      .catch(() => {
        api
          .get('/api/books/user/books')
          .then((res) => {
            const found = res.data.find((b) => b._id === bookId);
            if (found) {
              setBookDetails(found);
              if (!fileUrl && found.fileUrl) {
                setFileUrl(resolveFileUrl(found.fileUrl));
              }
              if (found.note) setPersonalNote(found.note);
              if (found.progress) setProgress(found.progress);
              if (found.currentPage) setPageNumber(found.currentPage);
            }
          })
          .catch(() => {});
      })
      .finally(() => setLoadingBook(false));
  }, [bookId, fileUrl]);

  // ── 2. Load Bookmarks from Local Storage (Namespaced by User) ──
  const bookmarkKey = useMemo(() => {
    if (!bookId) return null;
    return user?.userId
      ? `bookify_bookmarks_${user.userId}_${bookId}`
      : `bookify_bookmarks_${bookId}`;
  }, [bookId, user?.userId]);

  useEffect(() => {
    if (!bookmarkKey) return;
    try {
      let stored = localStorage.getItem(bookmarkKey);
      if (!stored && bookId) {
        stored = localStorage.getItem(`bookify_bookmarks_${bookId}`);
      }
      if (stored) {
        setBookmarks(JSON.parse(stored));
      } else {
        setBookmarks([]);
      }
    } catch {}
  }, [bookmarkKey, bookId]);

  // ── 3. Monitor Container & Window Sizing ───────────────────
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateSize();

    // ResizeObserver for reliable dimension calculation
    let observer;
    if (window.ResizeObserver && containerRef.current) {
      observer = new ResizeObserver(() => updateSize());
      observer.observe(containerRef.current);
    }

    window.addEventListener('resize', updateSize);
    return () => {
      window.removeEventListener('resize', updateSize);
      if (observer) observer.disconnect();
    };
  }, [isFullscreen]);

  // ── 4. Fullscreen State Sync with Browser ──────────────────
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (fs) {
        // Default to Fit Page when entering fullscreen so complete page is visible
        setFitMode('page');
        setUserZoom(1.0);
        setShowFloatingToolbar(true);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // ── 5. Fullscreen Toggle Actions ───────────────────────────
  const enterFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Fallback if browser blocks requestFullscreen
      setIsFullscreen(true);
    }
    setFitMode('page');
    setUserZoom(1.0);
    toast.success('Fullscreen: Folio fitted to screen', { icon: '⛶' });
  };

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {}
    setIsFullscreen(false);
    setFitMode('page');
    setUserZoom(1.0);
  };

  // ── 6. Fullscreen Floating Toolbar Inactivity Timer ───────
  const handleMouseMove = () => {
    if (!isFullscreen) return;
    setShowFloatingToolbar(true);
    clearTimeout(hideToolbarTimer.current);

    if (!pinFloatingToolbar) {
      hideToolbarTimer.current = setTimeout(() => {
        setShowFloatingToolbar(false);
        setShowAppearanceMenu(false);
      }, 3500);
    }
  };

  // ── 7. Calculate Dynamic Page Width & Height ───────────────
  const calculatedPageDimensions = useMemo(() => {
    const containerW = containerSize.width || window.innerWidth;
    const containerH = containerSize.height || window.innerHeight;
    const ratio = pageAspectRatio > 0 ? pageAspectRatio : 0.707;

    // Responsive padding
    const padX = isFullscreen ? 32 : 48;
    const padY = isFullscreen ? 32 : 48;

    const availW = Math.max(300, containerW - padX);
    const availH = Math.max(300, containerH - padY);

    let baseWidth;

    if (fitMode === 'page') {
      // Fit Page: complete page remains visible in both width and height without cropping
      const widthByHeight = availH * ratio;
      if (widthByHeight <= availW) {
        baseWidth = widthByHeight;
      } else {
        baseWidth = availW;
      }
    } else if (fitMode === 'width') {
      baseWidth = availW;
    } else if (fitMode === 'height') {
      baseWidth = availH * ratio;
    } else {
      // Custom zoom: use Fit Page as baseline, scaled by userZoom
      const widthByHeight = availH * ratio;
      const fitPageW = widthByHeight <= availW ? widthByHeight : availW;
      baseWidth = fitPageW;
    }

    const finalWidth = Math.round(baseWidth * userZoom);
    return Math.max(280, finalWidth);
  }, [containerSize, pageAspectRatio, fitMode, userZoom, isFullscreen]);

  // ── 8. Manual Zoom Handlers ────────────────────────────────
  const handleZoomIn = () => {
    setUserZoom((prev) => {
      const next = Math.min(3.0, +(prev + 0.15).toFixed(2));
      return next;
    });
    setFitMode('custom');
  };

  const handleZoomOut = () => {
    setUserZoom((prev) => {
      const next = Math.max(0.5, +(prev - 0.15).toFixed(2));
      return next;
    });
    setFitMode('custom');
  };

  const handleFitPage = () => {
    setFitMode('page');
    setUserZoom(1.0);
    toast.success('Fitted to full page');
  };

  const handleFitWidth = () => {
    setFitMode('width');
    setUserZoom(1.0);
    toast.success('Fitted to canvas width');
  };

  // ── 9. Ctrl + Mouse Wheel for Smooth Zooming ───────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        setUserZoom((prev) => {
          const next = Math.min(3.0, Math.max(0.5, +(prev + delta).toFixed(2)));
          return next;
        });
        setFitMode('custom');
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  // ── 10. Restore Saved Reading Position on Load ────────────
  const onDocumentLoadSuccess = async (pdfDoc) => {
    setNumPages(pdfDoc.numPages);
    setPdfError(null);

    // Extract native embedded outline
    try {
      const outline = await pdfDoc.getOutline();
      if (outline && Array.isArray(outline) && outline.length > 0) {
        setPdfOutline(outline);
      } else {
        setPdfOutline([]);
      }
    } catch {
      setPdfOutline([]);
    }

    // Restore saved page once
    if (!initialPageRestored.current) {
      initialPageRestored.current = true;
      let targetPage = 1;
      if (bookDetails?.currentPage && bookDetails.currentPage >= 1) {
        targetPage = Math.min(bookDetails.currentPage, pdfDoc.numPages);
      } else if (bookDetails?.progress && bookDetails.progress > 0) {
        targetPage = Math.max(1, Math.min(pdfDoc.numPages, Math.round((bookDetails.progress / 100) * pdfDoc.numPages)));
      }

      setPageNumber(targetPage);
      const initialPct = Math.round((targetPage / pdfDoc.numPages) * 100);
      setProgress(initialPct);

      if (targetPage > 1) {
        toast.success(`Resumed at Page ${targetPage} of ${pdfDoc.numPages} (${initialPct}%)`, {
          icon: '📖',
        });
      }
    }
  };

  // Inspect page aspect ratio on load
  const onPageLoadSuccess = (page) => {
    const { originalWidth, originalHeight } = page;
    if (originalWidth && originalHeight) {
      const ratio = originalWidth / originalHeight;
      setPageAspectRatio(ratio);
    }
  };

  // ── 11. Synchronize Reading Progress with Backend ──────────
  const persistProgress = useCallback(
    (page, total) => {
      if (!bookId || !total) return;
      const pct = Math.min(100, Math.max(0, Math.round((page / total) * 100)));
      setProgress(pct);
      setSaved(false);
      clearTimeout(saveTimer.current);

      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        try {
          await api.put(`/api/books/progress/${bookId}`, {
            progress: pct,
            currentPage: page,
            totalPages: total,
          });
          setSaving(false);
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
        } catch {
          setSaving(false);
        }
      }, 1000);
    },
    [bookId]
  );

  // ── 12. Page Navigation Handler ────────────────────────────
  const goToPage = useCallback(
    (p) => {
      if (!numPages) return;
      const clamped = Math.min(Math.max(1, p), numPages);
      setPageNumber(clamped);
      persistProgress(clamped, numPages);

      if (isContinuous) {
        const el = document.getElementById(`pdf-page-${clamped}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    },
    [numPages, persistProgress, isContinuous]
  );

  // ── 13. Keyboard Shortcuts ─────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === 'l') {
        e.preventDefault();
        goToPage(pageNumber + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'h') {
        e.preventDefault();
        goToPage(pageNumber - 1);
      } else if (e.key === 'Escape') {
        if (isFullscreen) {
          exitFullscreen();
        } else {
          setActiveDrawer(null);
          setShowAppearanceMenu(false);
        }
      } else if (e.key === 'f' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (isFullscreen) {
          exitFullscreen();
        } else {
          enterFullscreen();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pageNumber, numPages, goToPage, isFullscreen]);

  // ── 14. Continuous Scroll Intersection Tracking ────────────
  useEffect(() => {
    if (!isContinuous || !numPages) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageAttr = entry.target.getAttribute('data-page-number');
            if (pageAttr) {
              const p = Number(pageAttr);
              setPageNumber(p);
              persistProgress(p, numPages);
            }
          }
        });
      },
      { root: containerRef.current, threshold: 0.5 }
    );

    const pageElements = document.querySelectorAll('.continuous-page-node');
    pageElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [isContinuous, numPages, persistProgress]);

  // ── 15. Bookmark Actions (Preserves & Toggles) ─────────────
  const isCurrentPageBookmarked = bookmarks.some((b) => b.page === pageNumber);

  const toggleBookmark = () => {
    if (!bookId) return;
    let next;
    if (isCurrentPageBookmarked) {
      next = bookmarks.filter((b) => b.page !== pageNumber);
      toast.success(`Bookmark for Page ${pageNumber} removed`);
    } else {
      next = [...bookmarks, { page: pageNumber, createdAt: new Date().toISOString() }].sort(
        (a, b) => a.page - b.page
      );
      toast.success(`Page ${pageNumber} bookmarked! 🔖`);
    }
    setBookmarks(next);
    try {
      if (bookmarkKey) {
        localStorage.setItem(bookmarkKey, JSON.stringify(next));
      }
    } catch {}
  };

  // ── 16. Save Personal Notes ───────────────────────────────
  const handleSaveNote = async () => {
    if (!bookId) return;
    setSavingNote(true);
    try {
      await api.put(`/api/books/progress/${bookId}`, { note: personalNote });
      toast.success('Personal notes saved! ✍️');
    } catch {
      toast.error('Failed to save notes');
    } finally {
      setSavingNote(false);
    }
  };

  // ── 17. Back Navigation Action ─────────────────────────────
  const handleBackToBookshelf = () => {
    if (window.opener) {
      window.close();
    }
    navigate('/dashboard');
  };

  const displayTitle = bookDetails?.title || 'Literary Volume';
  const displayAuthor = bookDetails?.author || '';

  // Active zoom display string
  const currentZoomPercent = Math.round(
    fitMode === 'page' && userZoom === 1.0
      ? 100
      : fitMode === 'width' && userZoom === 1.0
      ? 100
      : userZoom * 100
  );

  return (
    <div
      onMouseMove={handleMouseMove}
      className={`h-screen w-screen overflow-hidden flex flex-col font-body-md text-on-surface select-none antialiased relative ${
        appearanceMode === 'night'
          ? 'bg-surface-container-lowest'
          : appearanceMode === 'sepia'
          ? 'bg-[#181512]'
          : 'bg-surface'
      }`}
    >
      {/* ── STANDARD HEADER (Hidden in Fullscreen) ───────────── */}
      {!isFullscreen && (
        <header className="h-16 flex-shrink-0 z-40 bg-surface-container-lowest/90 backdrop-blur-xl border-b border-outline-variant/20 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 shadow-[0_1px_8px_rgba(0,0,0,0.3)]">
          {/* Left: Back + Volume Title & Author */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={handleBackToBookshelf}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors cursor-pointer group flex-shrink-0"
              title="Return to Personal Bookshelf"
            >
              <span className="material-symbols-outlined text-[20px] transition-transform group-hover:-translate-x-0.5">
                arrow_back
              </span>
              <span className="hidden md:inline font-label-sm text-xs uppercase tracking-wider font-semibold">
                Bookshelf
              </span>
            </button>

            <div className="h-4 w-[1px] bg-outline-variant/30 hidden sm:block flex-shrink-0" />

            <div className="flex items-baseline gap-2 truncate">
              <span className="font-headline-sm font-garamond text-base sm:text-lg text-primary truncate font-medium tracking-tight">
                {displayTitle}
              </span>
              {displayAuthor && (
                <span className="hidden lg:inline text-xs text-on-surface-variant/70 italic truncate">
                  — {displayAuthor}
                </span>
              )}
            </div>

            {numPages && (
              <span className="hidden xl:inline-flex items-center px-2 py-0.5 rounded bg-surface-container-high text-secondary text-[10px] uppercase font-mono tracking-widest flex-shrink-0">
                Page {pageNumber} of {numPages}
              </span>
            )}
          </div>

          {/* Center: Layout & Zoom Controls */}
          <div className="hidden md:flex items-center gap-1.5 bg-surface-container-low border border-outline-variant/25 rounded-lg p-1">
            {/* Single vs Continuous View */}
            <button
              onClick={() => setIsContinuous(false)}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                !isContinuous
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              title="Single Page Mode"
            >
              <span className="material-symbols-outlined text-[15px]">filter_none</span>
              <span className="hidden lg:inline text-[11px]">Single</span>
            </button>
            <button
              onClick={() => setIsContinuous(true)}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                isContinuous
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              title="Continuous Scroll Mode"
            >
              <span className="material-symbols-outlined text-[15px]">view_day</span>
              <span className="hidden lg:inline text-[11px]">Continuous</span>
            </button>

            <div className="h-3 w-[1px] bg-outline-variant/30 mx-0.5" />

            {/* Fit Controls */}
            <button
              onClick={handleFitPage}
              className={`px-2 py-1 rounded text-xs transition-colors cursor-pointer flex items-center gap-1 ${
                fitMode === 'page'
                  ? 'bg-surface-container-high text-primary font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              title="Fit Page (Fit Height & Width)"
            >
              <span className="material-symbols-outlined text-[16px]">crop_free</span>
              <span className="hidden xl:inline text-[11px]">Fit Page</span>
            </button>

            <button
              onClick={handleFitWidth}
              className={`px-2 py-1 rounded text-xs transition-colors cursor-pointer flex items-center gap-1 ${
                fitMode === 'width'
                  ? 'bg-surface-container-high text-primary font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              title="Fit Width"
            >
              <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
              <span className="hidden xl:inline text-[11px]">Fit Width</span>
            </button>

            <div className="h-3 w-[1px] bg-outline-variant/30 mx-0.5" />

            {/* Zoom Controls */}
            <button
              onClick={handleZoomOut}
              className="p-1 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
              title="Zoom Out (−)"
            >
              <span className="material-symbols-outlined text-[16px]">remove</span>
            </button>
            <span className="text-[11px] font-mono text-outline min-w-[42px] text-center font-semibold">
              {currentZoomPercent}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
              title="Zoom In (+)"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
            </button>
          </div>

          {/* Right: Appearance Modes, Bookmark, Notes, Fullscreen, Download */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Appearance Palette Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowAppearanceMenu((p) => !p)}
                className={`p-2 rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
                  appearanceMode !== 'original'
                    ? 'bg-secondary-container/40 border-secondary text-secondary'
                    : 'bg-surface-container border-outline-variant/20 text-on-surface-variant hover:text-primary hover:bg-surface-container-high'
                }`}
                title="Reading Appearance Mode"
              >
                <span className="material-symbols-outlined text-[18px]">palette</span>
                <span className="hidden xl:inline text-xs capitalize font-medium">
                  {appearanceMode}
                </span>
              </button>

              {showAppearanceMenu && (
                <div
                  className="absolute right-0 top-12 w-64 bg-surface-container-high border border-outline-variant/30 rounded-xl shadow-2xl p-3 z-50 animate-fadeIn flex flex-col gap-2"
                  onMouseLeave={() => setShowAppearanceMenu(false)}
                >
                  <span className="text-[10px] uppercase font-bold text-outline tracking-wider px-1">
                    Reading Appearance
                  </span>

                  <button
                    onClick={() => {
                      setAppearanceMode('original');
                      setShowAppearanceMenu(false);
                      toast.success('Original Page: clean white paper');
                    }}
                    className={`w-full p-2.5 rounded-lg flex items-center justify-between text-left text-xs transition-colors cursor-pointer ${
                      appearanceMode === 'original'
                        ? 'bg-surface-container-lowest border border-primary text-primary font-semibold'
                        : 'hover:bg-surface-container text-on-surface'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-white border border-outline/30 shadow-sm" />
                      <div>
                        <div className="font-semibold">Original Page</div>
                        <div className="text-[10px] text-outline">Unaltered white page & colors</div>
                      </div>
                    </div>
                    {appearanceMode === 'original' && (
                      <span className="material-symbols-outlined text-primary text-base">check</span>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setAppearanceMode('sepia');
                      setShowAppearanceMenu(false);
                      toast.success('Warm Sepia: relaxed reading atmosphere');
                    }}
                    className={`w-full p-2.5 rounded-lg flex items-center justify-between text-left text-xs transition-colors cursor-pointer ${
                      appearanceMode === 'sepia'
                        ? 'bg-surface-container-lowest border border-primary text-primary font-semibold'
                        : 'hover:bg-surface-container text-on-surface'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#f4ecd8] border border-[#c4a47c] shadow-sm" />
                      <div>
                        <div className="font-semibold">Warm Sepia</div>
                        <div className="text-[10px] text-outline">Warm tint for relaxed reading</div>
                      </div>
                    </div>
                    {appearanceMode === 'sepia' && (
                      <span className="material-symbols-outlined text-primary text-base">check</span>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setAppearanceMode('night');
                      setShowAppearanceMenu(false);
                      toast.success('Night Mode: dark reading contrast');
                    }}
                    className={`w-full p-2.5 rounded-lg flex items-center justify-between text-left text-xs transition-colors cursor-pointer ${
                      appearanceMode === 'night'
                        ? 'bg-surface-container-lowest border border-primary text-primary font-semibold'
                        : 'hover:bg-surface-container text-on-surface'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#111827] border border-outline-variant shadow-sm" />
                      <div>
                        <div className="font-semibold">Night Mode</div>
                        <div className="text-[10px] text-outline">Dark contrast for low light</div>
                      </div>
                    </div>
                    {appearanceMode === 'night' && (
                      <span className="material-symbols-outlined text-primary text-base">check</span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Bookmark Current Page */}
            <button
              onClick={toggleBookmark}
              className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                isCurrentPageBookmarked
                  ? 'bg-primary text-on-primary border-primary shadow'
                  : 'bg-surface-container border-outline-variant/20 text-on-surface-variant hover:text-primary hover:bg-surface-container-high'
              }`}
              title={isCurrentPageBookmarked ? 'Remove Bookmark' : 'Bookmark Current Page'}
            >
              <span className="material-symbols-outlined text-[18px]">
                {isCurrentPageBookmarked ? 'bookmark' : 'bookmark_border'}
              </span>
            </button>

            {/* Bookmarks Drawer Trigger */}
            <button
              onClick={() => setActiveDrawer((prev) => (prev === 'bookmarks' ? null : 'bookmarks'))}
              className={`p-2 rounded-lg border transition-colors relative cursor-pointer ${
                activeDrawer === 'bookmarks'
                  ? 'bg-surface-container-highest border-primary text-primary'
                  : 'bg-surface-container border-outline-variant/20 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
              title="Saved Bookmarks"
            >
              <span className="material-symbols-outlined text-[18px]">collections_bookmark</span>
              {bookmarks.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-secondary text-on-secondary text-[9px] font-bold flex items-center justify-center">
                  {bookmarks.length}
                </span>
              )}
            </button>

            {/* Notes Drawer Trigger */}
            <button
              onClick={() => setActiveDrawer((prev) => (prev === 'marginalia' ? null : 'marginalia'))}
              className={`p-2 rounded-lg border transition-colors relative cursor-pointer ${
                activeDrawer === 'marginalia'
                  ? 'bg-surface-container-highest border-primary text-primary'
                  : 'bg-surface-container border-outline-variant/20 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
              title="Personal Notes"
            >
              <span className="material-symbols-outlined text-[18px]">edit_note</span>
              {personalNote && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
              )}
            </button>

            {/* Embedded TOC Chapter Index Trigger */}
            {pdfOutline.length > 0 && (
              <button
                onClick={() => setActiveDrawer((prev) => (prev === 'index' ? null : 'index'))}
                className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                  activeDrawer === 'index'
                    ? 'bg-surface-container-highest border-primary text-primary'
                    : 'bg-surface-container border-outline-variant/20 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                }`}
                title="Table of Contents"
              >
                <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
              </button>
            )}

            {/* Enter Fullscreen Trigger */}
            <button
              onClick={enterFullscreen}
              className="p-2 rounded-lg bg-surface-container border border-outline-variant/20 text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors cursor-pointer"
              title="Enter Fullscreen (F)"
            >
              <span className="material-symbols-outlined text-[18px]">fullscreen</span>
            </button>

            {/* Download PDF */}
            {fileUrl && (
              <a
                href={fileUrl}
                download={`${displayTitle || 'manuscript'}.pdf`}
                className="p-2 rounded-lg bg-surface-container border border-outline-variant/20 text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors cursor-pointer"
                title="Download PDF"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
              </a>
            )}
          </div>
        </header>
      )}

      {/* ── FULLSCREEN MINIMAL FLOATING READING CONTROLS ──────── */}
      {isFullscreen && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
            showFloatingToolbar || pinFloatingToolbar
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          <div className="bg-surface-container-lowest/90 backdrop-blur-xl border border-primary/30 rounded-2xl px-3 py-2 shadow-2xl flex items-center gap-2 sm:gap-3 text-xs">
            {/* Bookmark Current Page */}
            <button
              onClick={toggleBookmark}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center ${
                isCurrentPageBookmarked
                  ? 'bg-primary text-on-primary shadow'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
              }`}
              title={isCurrentPageBookmarked ? 'Remove Bookmark' : 'Bookmark Current Page'}
            >
              <span className="material-symbols-outlined text-[18px]">
                {isCurrentPageBookmarked ? 'bookmark' : 'bookmark_border'}
              </span>
            </button>

            <div className="h-4 w-[1px] bg-outline-variant/30" />

            {/* Page Navigation */}
            <button
              onClick={() => goToPage(pageNumber - 1)}
              disabled={pageNumber <= 1}
              className="p-1 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors disabled:opacity-30 cursor-pointer"
              title="Previous Page (←)"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>

            <div className="flex items-center gap-1 font-mono text-[11px] font-semibold text-primary px-1">
              <span>{pageNumber}</span>
              <span className="text-outline">/</span>
              <span className="text-outline">{numPages || '–'}</span>
            </div>

            <button
              onClick={() => goToPage(pageNumber + 1)}
              disabled={pageNumber >= numPages}
              className="p-1 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors disabled:opacity-30 cursor-pointer"
              title="Next Page (→)"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>

            <div className="h-4 w-[1px] bg-outline-variant/30" />

            {/* Zoom Controls */}
            <button
              onClick={handleZoomOut}
              className="p-1 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
              title="Zoom Out (−)"
            >
              <span className="material-symbols-outlined text-[16px]">remove</span>
            </button>
            <span className="font-mono text-[11px] text-outline min-w-[38px] text-center font-semibold">
              {currentZoomPercent}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
              title="Zoom In (+)"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
            </button>

            <div className="h-4 w-[1px] bg-outline-variant/30" />

            {/* Fit Controls */}
            <button
              onClick={handleFitPage}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                fitMode === 'page'
                  ? 'bg-surface-container-high text-primary border border-primary/30'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              title="Fit Full Page"
            >
              <span className="material-symbols-outlined text-[14px]">crop_free</span>
              <span>Fit Page</span>
            </button>

            <button
              onClick={handleFitWidth}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                fitMode === 'width'
                  ? 'bg-surface-container-high text-primary border border-primary/30'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              title="Fit Width"
            >
              <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
              <span>Fit Width</span>
            </button>

            <div className="h-4 w-[1px] bg-outline-variant/30" />

            {/* Reading Appearance Swatches */}
            <div className="flex items-center gap-1 bg-surface-container-low px-1.5 py-1 rounded-lg">
              <button
                onClick={() => setAppearanceMode('original')}
                className={`w-4 h-4 rounded-full bg-white border cursor-pointer transition-transform ${
                  appearanceMode === 'original' ? 'ring-2 ring-primary scale-110' : 'opacity-70'
                }`}
                title="Original Page"
              />
              <button
                onClick={() => setAppearanceMode('sepia')}
                className={`w-4 h-4 rounded-full bg-[#f4ecd8] border border-[#c4a47c] cursor-pointer transition-transform ${
                  appearanceMode === 'sepia' ? 'ring-2 ring-primary scale-110' : 'opacity-70'
                }`}
                title="Warm Sepia"
              />
              <button
                onClick={() => setAppearanceMode('night')}
                className={`w-4 h-4 rounded-full bg-[#111827] border border-outline cursor-pointer transition-transform ${
                  appearanceMode === 'night' ? 'ring-2 ring-primary scale-110' : 'opacity-70'
                }`}
                title="Night Mode"
              />
            </div>

            <div className="h-4 w-[1px] bg-outline-variant/30" />

            {/* Pin Toolbar */}
            <button
              onClick={() => setPinFloatingToolbar((p) => !p)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                pinFloatingToolbar
                  ? 'bg-secondary text-on-secondary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              title={pinFloatingToolbar ? 'Unpin Floating Toolbar' : 'Keep Toolbar Always Visible'}
            >
              <span className="material-symbols-outlined text-[16px]">push_pin</span>
            </button>

            {/* Exit Fullscreen */}
            <button
              onClick={exitFullscreen}
              className="p-1.5 rounded-lg bg-surface-container text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors cursor-pointer"
              title="Exit Fullscreen (Esc)"
            >
              <span className="material-symbols-outlined text-[18px]">fullscreen_exit</span>
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN READING CANVAS & SIDE DRAWER ─────────────────── */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* PDF Reading Canvas Container */}
        <div
          ref={containerRef}
          className={`flex-1 overflow-auto flex flex-col items-center py-6 px-4 relative scroll-smooth ${
            appearanceMode === 'sepia'
              ? 'reader-mode-sepia'
              : appearanceMode === 'night'
              ? 'reader-mode-night'
              : 'reader-mode-original'
          }`}
        >
          {loadingBook ? (
            <div className="m-auto flex flex-col items-center justify-center min-h-[400px] gap-3">
              <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="font-headline-sm font-garamond text-base text-outline">
                Loading book…
              </p>
            </div>
          ) : !fileUrl ? (
            <div className="m-auto text-center p-8 max-w-md bg-surface-container-low border border-outline-variant/20 rounded-2xl shadow-xl">
              <span className="material-symbols-outlined text-4xl text-error mb-2">menu_book</span>
              <h3 className="font-headline-md font-garamond text-xl text-on-surface font-semibold">
                Volume Unavailable
              </h3>
              <p className="text-xs text-outline mt-1 mb-4">
                The book file could not be located in the library.
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 bg-primary text-on-primary font-label-lg text-xs font-semibold rounded-lg shadow hover:bg-secondary transition-all cursor-pointer"
              >
                Return to Bookshelf
              </button>
            </div>
          ) : (
            <div className="m-auto flex flex-col items-center min-w-min">
              <Document
                file={fileUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={(err) => {
                  console.error('PDF load error:', err);
                  setPdfError('Failed to parse PDF document.');
                }}
                loading={
                  <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
                    <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <p className="font-headline-sm font-garamond text-base text-outline">
                      Loading pages…
                    </p>
                  </div>
                }
                error={
                  <div className="text-center p-8 max-w-md bg-surface-container-low border border-error/30 rounded-2xl shadow-xl">
                    <span className="material-symbols-outlined text-4xl text-error mb-2">
                      warning
                    </span>
                    <h3 className="font-headline-md font-garamond text-xl text-on-surface font-semibold">
                      Document Parsing Failed
                    </h3>
                    <p className="text-xs text-outline mt-1 mb-4">
                      {pdfError || 'The file may be corrupted or in an incompatible format.'}
                    </p>
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="px-4 py-2 bg-surface-container-high text-primary border border-primary/30 text-xs font-semibold rounded-lg hover:bg-surface-container-highest transition-colors cursor-pointer"
                    >
                      Back to Bookshelf
                    </button>
                  </div>
                }
              >
                {/* ── SINGLE PAGE VIEW ── */}
                {!isContinuous && numPages && (
                  <div className="flex flex-col items-center transition-all duration-200">
                    <div
                      style={{ width: calculatedPageDimensions }}
                      className="relative shadow-2xl rounded-sm overflow-hidden bg-white mx-auto"
                    >
                      <Page
                        pageNumber={pageNumber}
                        width={calculatedPageDimensions}
                        onLoadSuccess={onPageLoadSuccess}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                      />
                    </div>
                    {/* Subtle Page Counter Footnote */}
                    {!isFullscreen && (
                      <div className="mt-4 text-xs font-mono text-outline/70">
                        Page {pageNumber} of {numPages}
                      </div>
                    )}
                  </div>
                )}

                {/* ── CONTINUOUS SCROLL VIEW ── */}
                {isContinuous && numPages && (
                  <div className="flex flex-col items-center gap-8 pb-16">
                    {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
                      <div
                        key={p}
                        id={`pdf-page-${p}`}
                        data-page-number={p}
                        className="continuous-page-node flex flex-col items-center"
                      >
                        <div
                          style={{ width: calculatedPageDimensions }}
                          className="relative shadow-2xl rounded-sm overflow-hidden bg-white"
                        >
                          <Page
                            pageNumber={p}
                            width={calculatedPageDimensions}
                            onLoadSuccess={p === 1 ? onPageLoadSuccess : undefined}
                            renderTextLayer={true}
                            renderAnnotationLayer={true}
                            loading={
                              <div
                                style={{
                                  width: calculatedPageDimensions,
                                  height: Math.round(calculatedPageDimensions / (pageAspectRatio || 0.707)),
                                  background: '#ffffff',
                                }}
                                className="flex items-center justify-center text-xs text-outline"
                              >
                                Rendering Page {p}…
                              </div>
                            }
                          />
                        </div>
                        <span className="text-[11px] font-mono text-outline/70 mt-2">
                          Page {p} of {numPages}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Document>
            </div>
          )}
        </div>

        {/* ── SLIDE-OUT SIDE DRAWER (Bookmarks, Marginalia, Index) ─ */}
        {activeDrawer && (
          <aside className="w-80 md:w-96 flex-shrink-0 bg-surface-container-low border-l border-outline-variant/20 z-40 flex flex-col shadow-2xl animate-fadeIn">
            {/* Drawer Header */}
            <div className="h-16 px-4 border-b border-outline-variant/15 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">
                  {activeDrawer === 'marginalia'
                    ? 'edit_note'
                    : activeDrawer === 'index'
                    ? 'format_list_bulleted'
                    : 'collections_bookmark'}
                </span>
                <h3 className="font-headline-sm font-garamond text-base text-on-surface font-semibold capitalize">
                  {activeDrawer === 'marginalia'
                    ? 'Personal Notes'
                    : activeDrawer === 'index'
                    ? 'Table of Contents'
                    : 'Bookmarks'}
                </h3>
              </div>
              <button
                onClick={() => setActiveDrawer(null)}
                className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                title="Close Drawer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* TAB 1: NOTES */}
              {activeDrawer === 'marginalia' && (
                <div className="flex flex-col gap-3">
                  <div>
                    <span className="text-[11px] font-semibold uppercase text-primary tracking-wider">
                      Personal Reading Notes
                    </span>
                    <p className="text-xs text-outline mt-0.5">
                      Record reflections, key passages, or personal thoughts for this book.
                    </p>
                  </div>

                  <textarea
                    value={personalNote}
                    onChange={(e) => setPersonalNote(e.target.value)}
                    rows={8}
                    placeholder="Record notes, chapter impressions, or key quotes..."
                    className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface placeholder:text-outline/50 p-3 rounded-lg text-xs leading-relaxed focus:outline-none focus:border-primary shadow-inner resize-none"
                  />

                  <button
                    onClick={handleSaveNote}
                    disabled={savingNote}
                    className="w-full py-2.5 bg-primary text-on-primary font-label-lg text-xs font-semibold rounded-lg shadow hover:bg-secondary transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {savingNote ? 'hourglass_empty' : 'save'}
                    </span>
                    <span>{savingNote ? 'Saving…' : 'Save Notes'}</span>
                  </button>
                </div>
              )}

              {/* TAB 2: CHAPTER INDEX */}
              {activeDrawer === 'index' && (
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-semibold uppercase text-primary tracking-wider mb-1">
                    Table of Contents
                  </span>

                  {pdfOutline.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {pdfOutline.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            if (typeof item.dest === 'number') {
                              goToPage(item.dest);
                            }
                          }}
                          className="p-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors flex items-center justify-between text-xs cursor-pointer group"
                        >
                          <span className="truncate group-hover:text-primary transition-colors">
                            {item.title}
                          </span>
                          <span className="material-symbols-outlined text-xs text-outline group-hover:text-primary">
                            arrow_forward
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-outline italic py-4 text-center">
                      This book contains no embedded table of contents.
                    </p>
                  )}
                </div>
              )}

              {/* TAB 3: BOOKMARKS */}
              {activeDrawer === 'bookmarks' && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold uppercase text-primary tracking-wider">
                      Saved Bookmarks
                    </span>
                    <button
                      onClick={toggleBookmark}
                      className="text-xs text-secondary hover:underline cursor-pointer"
                    >
                      + Bookmark Page {pageNumber}
                    </button>
                  </div>

                  {bookmarks.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {bookmarks.map((bm) => (
                        <div
                          key={bm.page}
                          onClick={() => goToPage(bm.page)}
                          className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                            bm.page === pageNumber
                              ? 'bg-surface-container-high border-primary text-primary'
                              : 'bg-surface-container border-outline-variant/15 text-on-surface hover:border-primary/40'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm text-secondary">
                              bookmark
                            </span>
                            <span className="text-xs font-semibold">Page {bm.page}</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const next = bookmarks.filter((b) => b.page !== bm.page);
                              setBookmarks(next);
                              if (bookmarkKey) {
                                localStorage.setItem(
                                  bookmarkKey,
                                  JSON.stringify(next)
                                );
                              }
                              toast.success(`Removed bookmark for Page ${bm.page}`);
                            }}
                            className="text-outline hover:text-error p-1 rounded transition-colors"
                            title="Remove Bookmark"
                          >
                            <span className="material-symbols-outlined text-xs">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-outline italic py-4 text-center">
                      No bookmarks saved for this book. Click the bookmark icon to save any page.
                    </p>
                  )}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ── BOTTOM READING CONTROLS & SCRUB BAR ───────────────── */}
      {!isFullscreen && numPages && (
        <footer className="h-16 flex-shrink-0 z-40 bg-surface-container-lowest/90 backdrop-blur-xl border-t border-outline-variant/20 px-3 sm:px-6 flex items-center justify-between gap-3 shadow-[0_-1px_12px_rgba(0,0,0,0.35)]">
          {/* Previous Page Button */}
          <button
            onClick={() => goToPage(pageNumber - 1)}
            disabled={pageNumber <= 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container text-on-surface-variant hover:text-primary hover:bg-surface-container-high font-label-sm text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Previous Page (←)"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            <span className="hidden sm:inline">Prev Page</span>
          </button>

          {/* Central Progress Scrub Area */}
          <div className="flex-1 max-w-xl mx-auto flex flex-col items-center justify-center gap-1">
            <div className="w-full flex items-center justify-between text-xs text-on-surface-variant/80 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="text-primary font-bold">{progress}%</span>
                <span>•</span>
                <span>
                  Page {pageNumber} of {numPages}
                </span>
              </span>

              {/* Live Saving Status Indicator */}
              <span className="flex items-center gap-1 text-[11px]">
                {saving ? (
                  <span className="text-primary flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span>Saving…</span>
                  </span>
                ) : saved ? (
                  <span className="text-secondary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">check</span>
                    <span>Saved</span>
                  </span>
                ) : (
                  <span className="text-outline">
                    {progress === 100 ? 'Completed' : 'Reading in progress'}
                  </span>
                )}
              </span>
            </div>

            {/* Slider Scrubber */}
            <div className="w-full flex items-center h-4">
              <input
                type="range"
                min={1}
                max={numPages}
                value={pageNumber}
                onChange={(e) => goToPage(Number(e.target.value))}
                className="w-full h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-[#f2be8c] focus:outline-none"
                aria-label="Page scrubber"
              />
            </div>
          </div>

          {/* Next Page Button */}
          <button
            onClick={() => goToPage(pageNumber + 1)}
            disabled={pageNumber >= numPages}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container text-on-surface-variant hover:text-primary hover:bg-surface-container-high font-label-sm text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Next Page (→)"
          >
            <span className="hidden sm:inline">Next Page</span>
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </footer>
      )}

      {/* ── SCOPED READER APPEARANCE STYLES ───────────────────── */}
      <style>{`
        /* Original: Untouched white pages */
        .reader-mode-original .react-pdf__Page {
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.45);
          border-radius: 2px;
          background-color: #ffffff;
        }

        /* Sepia: Warm vellum atmosphere (non-destructive CSS filter) */
        .reader-mode-sepia .react-pdf__Page {
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.55);
          border-radius: 2px;
          filter: sepia(0.38) contrast(0.96) brightness(0.98);
        }

        /* Night: Obsidian nocturnal contrast (non-destructive CSS filter) */
        .reader-mode-night .react-pdf__Page {
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.7);
          border-radius: 2px;
          filter: invert(0.88) hue-rotate(180deg) contrast(0.95);
        }

        .react-pdf__Page canvas {
          display: block;
          max-width: 100%;
          height: auto !important;
        }

        .react-pdf__Page__textContent {
          user-select: text;
        }

        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #f2be8c;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(242, 190, 140, 0.5);
        }
      `}</style>
    </div>
  );
}
