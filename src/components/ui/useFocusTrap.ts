import { useEffect, useRef, type RefObject } from 'react';

const TABBABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Keeps Tab inside a modal surface while it is open, and restores focus when
 * it closes.
 *
 * <p>Neither dialog in this app trapped focus before: tabbing out of the
 * invite modal walked into the page behind it, which is invisible to a sighted
 * mouse user and completely disorienting for anyone on a keyboard or a screen
 * reader.</p>
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  options: { initialFocusRef?: RefObject<HTMLElement | null>; fallbackFocusId?: string } = {},
) {
  const { initialFocusRef, fallbackFocusId } = options;
  // Read through a ref so a re-render cannot change where focus returns to.
  const restoreToRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) {
      return;
    }
    const container = containerRef.current;
    if (!container) {
      return;
    }

    restoreToRef.current = document.activeElement as HTMLElement | null;

    const focusables = () => Array.from(container.querySelectorAll<HTMLElement>(TABBABLE));
    (initialFocusRef?.current ?? focusables()[0])?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Tab') {
        return;
      }
      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;

      if (event.shiftKey && (current === first || !container?.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);

      // The trigger may be gone — revoking removes the row that held the
      // button — so only return focus if it is still in the document.
      const restoreTo = restoreToRef.current;
      if (restoreTo?.isConnected) {
        restoreTo.focus();
      } else if (fallbackFocusId) {
        document.getElementById(fallbackFocusId)?.focus();
      }
    };
  }, [active, containerRef, initialFocusRef, fallbackFocusId]);
}
