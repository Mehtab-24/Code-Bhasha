'use client';

import { useEffect } from 'react';

// Route-scoped body scroll lock for the fixed 100vh studio — DESKTOP ONLY.
// Below 1024px the studio uses natural document scrolling (two-tab mobile
// layout), so the body must stay scrollable there. The landing page keeps
// normal document scrolling regardless.
const DESKTOP_QUERY = '(min-width: 1024px)';

export function BodyScrollLock() {
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;

    const lock = () => {
      document.body.style.overflow = 'hidden';
      // Compensate for the disappearing scrollbar so the page doesn't shift.
      const scrollbarCompensation = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarCompensation > 0) {
        document.body.style.paddingRight = `${scrollbarCompensation}px`;
      }
    };

    const unlock = () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };

    const update = () => (mq.matches ? lock() : unlock());
    update();
    mq.addEventListener('change', update);
    return () => {
      mq.removeEventListener('change', update);
      unlock();
    };
  }, []);

  return null;
}
