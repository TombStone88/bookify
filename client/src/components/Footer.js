import React from 'react';

export default function Footer({ className = '' }) {
  return (
    <footer className={`w-full bg-surface-container-lowest border-t border-outline-variant/20 mt-auto py-8 px-4 sm:px-6 lg:px-12 ${className}`}>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-headline-sm font-garamond text-lg text-primary font-semibold">
            Bookify
          </span>
          <span className="text-outline text-xs">•</span>
          <span className="text-xs text-on-surface-variant">
            A sanctuary for discerning readers and literary clubs.
          </span>
        </div>
        <p className="text-xs text-outline font-medium">
          © 2026 Bookify. All literary rights preserved.
        </p>
      </div>
    </footer>
  );
}
