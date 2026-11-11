import React, { useState } from 'react';
import { getOptimizedImageUrl } from '../utils/api';

/**
 * UserAvatar Component
 * - Serves optimized WebP avatars with lazy loading & async decoding
 * - Responsive sizing (sm: 32px, md: 40px, lg: 64px, xl: 112-128px, or numeric px)
 * - Shimmer placeholder preventing layout shifts
 * - Elegant monogram fallback with Antiquarian styling
 */
export default function UserAvatar({
  user,
  profileImage,
  username,
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl' | number
  className = '',
  imgClassName = '',
  showHalo = false,
}) {
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const rawImage = profileImage || user?.profileImage;
  const name = username || user?.username || user?.name || 'Reader';
  const initial = (name.charAt(0) || 'R').toUpperCase();

  const sizeDimensions = {
    sm: { container: 'w-8 h-8 text-xs', px: 64 },
    md: { container: 'w-10 h-10 text-sm', px: 96 },
    lg: { container: 'w-16 h-16 text-lg', px: 128 },
    xl: { container: 'w-28 h-28 lg:w-32 lg:h-32 text-3xl lg:text-4xl', px: 256 },
  };

  let containerClass = 'w-10 h-10 text-sm';
  let targetPx = 96;
  let customStyle = undefined;

  if (typeof size === 'number') {
    containerClass = 'text-xs';
    targetPx = Math.max(32, size * 2);
    customStyle = { width: `${size}px`, height: `${size}px` };
  } else if (sizeDimensions[size]) {
    containerClass = sizeDimensions[size].container;
    targetPx = sizeDimensions[size].px;
  }

  const optimizedSrc =
    rawImage && !hasError
      ? getOptimizedImageUrl(rawImage, {
          width: targetPx,
          format: 'webp',
          quality: 85,
        })
      : null;

  const avatarCore = (
    <div
      style={customStyle}
      className={`relative rounded-full overflow-hidden bg-surface-container-high border border-outline-variant/30 flex items-center justify-center select-none shrink-0 ${containerClass} ${className}`}
    >
      {/* 1. Shimmer Loading State */}
      {!loaded && !hasError && optimizedSrc && (
        <div className="absolute inset-0 bg-surface-container-highest animate-pulse rounded-full" />
      )}

      {/* 2. Optimized Image */}
      {optimizedSrc ? (
        <img
          src={optimizedSrc}
          alt={name}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => {
            setHasError(true);
            setLoaded(true);
          }}
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            loaded ? 'opacity-100' : 'opacity-0'
          } ${imgClassName}`}
        />
      ) : (
        /* 3. Antiquarian Monogram Fallback */
        <span className="font-headline-lg font-garamond font-bold text-primary">
          {initial}
        </span>
      )}
    </div>
  );

  if (showHalo) {
    return (
      <div className="w-28 h-28 lg:w-32 lg:h-32 rounded-full p-1 bg-gradient-to-tr from-secondary-container via-primary-container to-secondary shadow-[0_0_24px_rgba(212,163,115,0.25)] flex items-center justify-center transition-transform group-hover:scale-[1.02]">
        <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
          {avatarCore}
        </div>
      </div>
    );
  }

  return avatarCore;
}
