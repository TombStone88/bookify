import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import api from '../utils/api';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PDFViewer() {
  const query  = new URLSearchParams(useLocation().search);
  const file   = query.get('file');
  const bookId = query.get('bookId');

  const [numPages, setNumPages]   = useState(null);
  const [pageNumber, setPage]     = useState(1);
  const [progress, setProgress]   = useState(0);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [scale, setScale]         = useState(1.2);
  const [bookTitle, setBookTitle] = useState('');
  const saveTimer                 = useRef(null);

  // Load saved progress on mount
  useEffect(() => {
    if (!bookId) return;
    api.get('/api/books/user/books')
      .then(res => {
        const book = res.data.find(b => b._id === bookId);
        if (book) {
          setBookTitle(book.title || '');
          const savedProgress = book.progress || 0;
          setProgress(savedProgress);
          // We'll jump to saved page once numPages loads
        }
      })
      .catch(() => {});
  }, [bookId]);

  // Once we know numPages AND have a saved progress, jump to that page
  useEffect(() => {
    if (!numPages || !progress) return;
    const savedPage = Math.max(1, Math.round((progress / 100) * numPages));
    setPage(savedPage);
  }, [numPages]); // only run when numPages first loads, not on every progress change

  // Auto-save progress whenever page changes (debounced 1s)
  const saveProgress = useCallback((page, total) => {
    if (!bookId || !total) return;
    const pct = Math.round((page / total) * 100);
    setProgress(pct);
    setSaved(false);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await api.put(`/api/books/progress/${bookId}`, { progress: pct });
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch {
        setSaving(false);
      }
    }, 1000);
  }, [bookId]);

  const onDocumentLoadSuccess = ({ numPages: total }) => {
    setNumPages(total);
  };

  const goTo = (p) => {
    const clamped = Math.min(Math.max(1, p), numPages || 1);
    setPage(clamped);
    saveProgress(clamped, numPages);
  };

  const handleBack = () => {
    window.close();
    setTimeout(() => { window.location.href = '/dashboard'; }, 300);
  };

  const pct = numPages ? Math.round((pageNumber / numPages) * 100) : 0;

  // Responsive width
  const viewerWidth = Math.min(window.innerWidth - 48, 860);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f0f0f5' }}>

      {/* ── TOP BAR ── */}
      <div style={{
        height: 56, flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 1.25rem',
        background: '#ffffff', borderBottom: '1px solid #ececf3',
        boxShadow: '0 1px 4px rgba(20,20,40,0.07)',
        zIndex: 10,
      }}>
        {/* Close / Back */}
        <button onClick={handleBack} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: '#f7f5ff', border: '1px solid #e2d6fc', borderRadius: 8,
          padding: '6px 14px', cursor: 'pointer', color: '#7c3aed',
          fontSize: '0.875rem', fontWeight: 600, flexShrink: 0,
        }}>
          ← Close
        </button>

        <div style={{ width: 1, height: 24, background: '#ececf3', flexShrink: 0 }} />

        {/* Book title */}
        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1f2230', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          📚 {bookTitle || 'Bookify Reader'}
        </span>

        {/* Page controls */}
        {numPages && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button onClick={() => goTo(pageNumber - 1)} disabled={pageNumber <= 1}
              style={{
                width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e2ee',
                background: pageNumber <= 1 ? '#fafafe' : '#ffffff',
                cursor: pageNumber <= 1 ? 'not-allowed' : 'pointer',
                color: pageNumber <= 1 ? '#c4c4d4' : '#1f2230',
                fontWeight: 700, fontSize: '1rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>‹</button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="number" min={1} max={numPages}
                value={pageNumber}
                onChange={e => goTo(Number(e.target.value))}
                style={{
                  width: 52, textAlign: 'center', padding: '4px 6px',
                  border: '1px solid #e2e2ee', borderRadius: 7,
                  fontSize: '0.875rem', fontWeight: 600, color: '#1f2230',
                  background: '#fafafe', outline: 'none',
                }}
              />
              <span style={{ fontSize: '0.8rem', color: '#8a8aa0' }}>/ {numPages}</span>
            </div>

            <button onClick={() => goTo(pageNumber + 1)} disabled={pageNumber >= numPages}
              style={{
                width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e2ee',
                background: pageNumber >= numPages ? '#fafafe' : '#ffffff',
                cursor: pageNumber >= numPages ? 'not-allowed' : 'pointer',
                color: pageNumber >= numPages ? '#c4c4d4' : '#1f2230',
                fontWeight: 700, fontSize: '1rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>›</button>
          </div>
        )}

        <div style={{ width: 1, height: 24, background: '#ececf3', flexShrink: 0 }} />

        {/* Zoom controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button onClick={() => setScale(s => Math.max(0.6, +(s - 0.2).toFixed(1)))}
            style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #e2e2ee', background: '#ffffff', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', color: '#44445a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
          <span style={{ fontSize: '0.78rem', color: '#8a8aa0', minWidth: 36, textAlign: 'center' }}>{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(2.5, +(s + 0.2).toFixed(1)))}
            style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #e2e2ee', background: '#ffffff', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', color: '#44445a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
        </div>

        <div style={{ width: 1, height: 24, background: '#ececf3', flexShrink: 0 }} />

        {/* Progress */}
        {numPages && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{ width: 80, height: 5, background: '#ececf3', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${pct}%`, borderRadius: 99, transition: 'width .4s ease',
                background: pct === 100 ? 'linear-gradient(90deg,#22c55e,#4ade80)' : 'linear-gradient(90deg,#7c3aed,#a78bfa)',
              }} />
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: pct === 100 ? '#22c55e' : '#7c3aed', minWidth: 34 }}>
              {pct}%
            </span>
            <span style={{ fontSize: '0.72rem', color: saving ? '#a78bfa' : saved ? '#22c55e' : 'transparent', minWidth: 48, fontWeight: 500 }}>
              {saving ? 'Saving…' : saved ? '✓ Saved' : '.'}
            </span>
          </div>
        )}
      </div>

      {/* ── PDF CONTENT ── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 24px' }}>
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={(err) => console.error('PDF load error:', err)}
          loading={
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, gap: 16 }}>
              <div style={{ width: 44, height: 44, border: '3px solid #ece4ff', borderTop: '3px solid #7c3aed', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ color: '#8a8aa0', fontSize: '0.9rem' }}>Loading PDF…</p>
            </div>
          }
          error={
            <div style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚠️</div>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>Failed to load PDF</p>
              <p style={{ fontSize: '0.85rem', color: '#8a8aa0' }}>The file may be unavailable or in an unsupported format.</p>
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            width={viewerWidth}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </Document>

        {/* Bottom page nav for convenience */}
        {numPages && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20, marginBottom: 8 }}>
            <button onClick={() => goTo(pageNumber - 1)} disabled={pageNumber <= 1}
              className="btn-ghost"
              style={{ padding: '0.5rem 1.25rem', opacity: pageNumber <= 1 ? 0.4 : 1 }}>
              ← Previous
            </button>
            <span style={{ fontSize: '0.85rem', color: '#8a8aa0' }}>
              Page {pageNumber} of {numPages}
            </span>
            <button onClick={() => goTo(pageNumber + 1)} disabled={pageNumber >= numPages}
              className="btn-ghost"
              style={{ padding: '0.5rem 1.25rem', opacity: pageNumber >= numPages ? 0.4 : 1 }}>
              Next →
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .react-pdf__Page { box-shadow: 0 4px 24px rgba(20,20,40,0.15); border-radius: 4px; }
        .react-pdf__Page canvas { display: block; border-radius: 4px; }
      `}</style>
    </div>
  );
}