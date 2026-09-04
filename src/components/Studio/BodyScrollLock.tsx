'use client';

import { useEffect } from 'react';

// Route-scoped body scroll lock for the fixed 100vh studio. The landing page
// keeps normal document scrolling; this only pins the body while /app mounts.
export function BodyScrollLock() {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarCompensation = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    // Compensate for the disappearing scrollbar so the page doesn't shift.
    if (scrollbarCompensation > 0) {
      document.body.style.paddingRight = `${scrollbarCompensation}px`;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, []);

  return null;
}
