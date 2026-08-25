import { useEffect, useRef } from 'react';
import { AppViewMode } from '../components/Header';

export const VALID_VIEW_MODES: AppViewMode[] = [
  'laptop_pos',
  'mobile_pos',
  'kot_display',
  'inventory',
  'sales',
  'customers',
  'setup',
];

interface KioskProtectionOptions {
  currentView: AppViewMode;
  onViewResetToDefault: () => void;
  hasActiveModals?: boolean;
  onCloseActiveModal?: () => void;
}

/**
 * Hook to enforce strict Kiosk-style POS behavior:
 * - Traps browser history and disables back/forward navigation within the PWA
 * - Prevents touchpad two-finger horizontal back gestures
 * - Prevents mouse back/forward auxiliary buttons (Buttons 3 & 4)
 * - Intercepts Alt + Left Arrow, Alt + Right Arrow, and non-input Backspace
 * - Prevents edge-swipe navigation on touch devices
 * - Safeguards active billing session, cart, inventory, and orders
 * - Auto-redirects invalid states back to the main Billing/Home view
 */
export function useKioskProtection({
  currentView,
  onViewResetToDefault,
  hasActiveModals = false,
  onCloseActiveModal,
}: KioskProtectionOptions) {
  const currentViewRef = useRef<AppViewMode>(currentView);
  const hasActiveModalsRef = useRef<boolean>(hasActiveModals);
  const onCloseActiveModalRef = useRef<(() => void) | undefined>(onCloseActiveModal);

  // Keep refs fresh
  useEffect(() => {
    currentViewRef.current = currentView;
  }, [currentView]);

  useEffect(() => {
    hasActiveModalsRef.current = hasActiveModals;
  }, [hasActiveModals]);

  useEffect(() => {
    onCloseActiveModalRef.current = onCloseActiveModal;
  }, [onCloseActiveModal]);

  // Validate current view and fallback if state becomes corrupted
  useEffect(() => {
    if (!VALID_VIEW_MODES.includes(currentView)) {
      console.warn(`[Kiosk] Invalid view mode "${currentView}" detected. Resetting to Billing/Home.`);
      onViewResetToDefault();
    }
  }, [currentView, onViewResetToDefault]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Initial State Initialization & Clean Kiosk URL
    try {
      const stateObj = { kiosk: true, view: currentViewRef.current, timestamp: Date.now() };
      window.history.replaceState(stateObj, document.title, window.location.pathname);
      window.history.pushState(stateObj, document.title, window.location.pathname);
    } catch (err) {
      console.warn('[Kiosk] History initialization warning:', err);
    }

    // 2. Trapped PopState (Browser Back / Gesture Back Trap)
    const handlePopState = (e: PopStateEvent) => {
      // Re-push state immediately to keep user trapped inside the PWA session
      try {
        const stateObj = { kiosk: true, view: currentViewRef.current, timestamp: Date.now() };
        window.history.pushState(stateObj, document.title, window.location.pathname);
      } catch (err) {
        console.warn('[Kiosk] PushState error:', err);
      }

      // If a modal is open, dismiss it gracefully without navigating away
      if (hasActiveModalsRef.current && onCloseActiveModalRef.current) {
        onCloseActiveModalRef.current();
        return;
      }

      // Ensure current view is valid; if corrupted or undefined, reset to Billing/Home
      if (!VALID_VIEW_MODES.includes(currentViewRef.current)) {
        onViewResetToDefault();
      }
    };

    // 3. Prevent Keyboard Navigation Shortcuts (Alt+Left, Alt+Right, BrowserBack, Backspace outside inputs)
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + Left Arrow or Alt + Right Arrow (Browser Back / Forward)
      if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'Left' || e.key === 'ArrowRight' || e.key === 'Right')) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // BrowserBack & BrowserForward keys (Media/Special keys)
      if (e.key === 'BrowserBack' || e.key === 'BrowserForward') {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Backspace navigation outside input/textarea
      if (e.key === 'Backspace') {
        const target = e.target as HTMLElement | null;
        const isInputField =
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'SELECT' ||
            target.isContentEditable ||
            target.getAttribute('contenteditable') === 'true');

        if (!isInputField) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    // 4. Prevent Mouse Back & Forward Buttons (Mouse Buttons 3 and 4)
    const handleMouseButton = (e: MouseEvent | PointerEvent) => {
      // Button 3 = Back button, Button 4 = Forward button on mice
      if (e.button === 3 || e.button === 4) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // 5. Prevent Touchpad 2-finger horizontal swipe navigation
    const handleWheel = (e: WheelEvent) => {
      // If horizontal scrolling is dominant
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 5) {
        // Check if event target or any ancestor is a horizontally scrollable element
        let el = e.target as HTMLElement | null;
        let canScrollX = false;
        while (el && el !== document.body) {
          if (el.scrollWidth > el.clientWidth) {
            const overflowX = window.getComputedStyle(el).overflowX;
            if (overflowX === 'auto' || overflowX === 'scroll') {
              canScrollX = true;
              break;
            }
          }
          el = el.parentElement;
        }

        // If not inside an element intentionally designed for horizontal scrolling, cancel browser navigation
        if (!canScrollX) {
          e.preventDefault();
        }
      }
    };

    // 6. Prevent Edge Touch Swipes on Touchscreens (iOS Safari / Chrome edge gesture navigation)
    let touchStartX = 0;
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touchX = e.touches[0].clientX;
        const windowWidth = window.innerWidth;
        
        // If swiping from the extreme left (<= 25px) or extreme right (>= windowWidth - 25px)
        if (touchStartX <= 25 && touchX > touchStartX + 10) {
          // Prevent left edge back gesture
          e.preventDefault();
        } else if (touchStartX >= windowWidth - 25 && touchX < touchStartX - 10) {
          // Prevent right edge forward gesture
          e.preventDefault();
        }
      }
    };

    // Register all event listeners with capture phase to guarantee interception
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('auxclick', handleMouseButton as EventListener, { capture: true });
    window.addEventListener('mouseup', handleMouseButton as EventListener, { capture: true });
    window.addEventListener('pointerup', handleMouseButton as EventListener, { capture: true });
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown, { capture: true } as any);
      window.removeEventListener('auxclick', handleMouseButton as EventListener, { capture: true } as any);
      window.removeEventListener('mouseup', handleMouseButton as EventListener, { capture: true } as any);
      window.removeEventListener('pointerup', handleMouseButton as EventListener, { capture: true } as any);
      window.removeEventListener('wheel', handleWheel as EventListener);
      window.removeEventListener('touchstart', handleTouchStart as EventListener);
      window.removeEventListener('touchmove', handleTouchMove as EventListener);
    };
  }, [onViewResetToDefault]);
}
