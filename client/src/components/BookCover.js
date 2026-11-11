import React, { useState } from 'react';
import { getOptimizedImageUrl } from '../utils/api';

/**
 * Optimized Book Cover Component
 * - Lazy loaded with async decoding
 * - Responsive WebP thumbnail sizing (thumb: 120w, card: 240w, large: 480w)
 * - Shimmer skeleton placeholder preventing layout shifts (CLS = 0)
 * - Tactile spine shadow
 * - Graceful fallback to inline Antiquarian Tech book cover
 */
export default function BookCover({
  coverImage,
  title = 'Untitled Tome',
  author = 'Unknown Author',
  variant = 'card', // 'thumb' | 'card' | 'large'
  className = '',
  imgClassName = '',
  aspectRatio = 'aspect-[2/3]',
  showSpine = true,
  badge = null,
  onClick,
}) {
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Map variant to target pixel width
  const widthMap = {
    thumb: 120,
    card: 240,
    large: 480,
  };
  const targetWidth = widthMap[variant] || 240;

  // Resolve image source URL (WebP optimized via server)
  const resolvedSrc =
    coverImage && !hasError
      ? getOptimizedImageUrl(coverImage, { width: targetWidth, format: 'webp', quality: 82 })
      : null;

  // Clean title for fallback rendering
  const displayTitle = (title || 'Book').slice(0, 48);
  const displayAuthor = (author || 'Author').slice(0, 32);

  return (
    <div
      onClick={onClick}
      className={`relative ${aspectRatio} shrink-0 rounded-lg overflow-hidden bg-surface-container-highest border border-outline-variant/30 select-none ${className}`}
    >
      {/* 1. Shimmer Loading Skeleton (shown until image loads) */}
      {!loaded && !hasError && resolvedSrc && (
        <div className="absolute inset-0 z-0 bg-surface-container-high animate-pulse flex flex-col items-center justify-center p-3 text-center">
          <div className="w-8 h-8 rounded-full border border-primary/20 flex items-center justify-center mb-2">
            <span className="material-symbols-outlined text-primary/40 text-sm">auto_stories</span>
          </div>
          <div className="h-2 w-3/4 bg-surface-container-highest rounded mb-1.5 opacity-60"></div>
          <div className="h-1.5 w-1/2 bg-surface-container-highest rounded opacity-40"></div>
        </div>
      )}

      {/* 2. Main Image */}
      {resolvedSrc ? (
        <img
          src={resolvedSrc}
          alt={title || 'Book cover'}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => {
            setHasError(true);
            setLoaded(true);
          }}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0'
          } ${imgClassName}`}
        />
      ) : (
        /* 3. Antiquarian Fallback Cover (No network request, instantly rendered) */
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#181d2a] via-[#10141d] to-[#0a0d14] flex flex-col justify-between p-3 border border-[#d4a373]/25 text-center">
          {/* Top Ornamental Flourish */}
          <div className="flex items-center justify-center gap-1 opacity-50">
            <span className="h-[1px] w-6 bg-[#d4a373]"></span>
            <span className="text-[9px] text-[#f2be8c]">✦</span>
            <span className="h-[1px] w-6 bg-[#d4a373]"></span>
          </div>

          {/* Book Title & Author */}
          <div className="my-auto px-1">
            <p className="font-headline-sm font-garamond text-xs sm:text-sm font-bold text-[#f2be8c] leading-tight line-clamp-3 uppercase tracking-wide">
              {displayTitle}
            </p>
            <div className="w-8 h-[1px] bg-[#d4a373]/40 mx-auto my-1.5"></div>
            <p className="text-[10px] text-[#d4a373]/80 italic line-clamp-1">
              {displayAuthor}
            </p>
          </div>

          {/* Bottom Seal */}
          <div className="text-[8px] uppercase tracking-widest text-[#d4a373]/50 font-label-sm">
            ATHENAEUM
          </div>
        </div>
      )}

      {/* 4. Tactile Book Spine Shadow */}
      {showSpine && (
        <div className="absolute inset-y-0 left-0 w-2.5 sm:w-3 bg-gradient-to-r from-black/75 via-black/25 to-transparent pointer-events-none z-10" />
      )}

      {/* 5. Optional Badge Overlay */}
      {badge && <div className="absolute top-2 left-2 z-20 pointer-events-none">{badge}</div>}
    </div>
  );
}
