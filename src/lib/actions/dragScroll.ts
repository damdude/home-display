/**
 * dragScroll — Svelte action that manually drives scrollTop from pointer
 * drag deltas, instead of relying on the browser's native touch-scroll
 * gesture recognition.
 *
 * Why this exists: on the Waveshare DSI touchscreen, dragging a finger over
 * a CSS `overflow-y: auto` region inside several nested containers (fixed →
 * absolute → flex) does not trigger native touch-scrolling — Chromium falls
 * back to drag-selecting text instead. Pointer events (pointerdown/move/up)
 * still fire correctly regardless of how the input is classified, so driving
 * scrollTop directly from them sidesteps the gesture-recognition issue
 * entirely. `touch-action: none` on the node (set by this action) tells the
 * browser not to even attempt its own gesture handling here.
 *
 * Taps still work normally: a pointer down/up with no meaningful movement
 * is left alone so clicks on rows/buttons inside fire as usual. Only when
 * the pointer moves past a small threshold do we treat it as a scroll drag
 * and swallow the resulting click so a drag doesn't also "select" a row.
 *
 * Usage:
 *   <div class="step-body" use:dragScroll>
 */
import type { Action } from 'svelte/action';

const MOVE_THRESHOLD = 6; // px before a pointerdown counts as a drag, not a tap

export const dragScroll: Action<HTMLElement> = (node) => {
  const prevTouchAction = node.style.touchAction;
  node.style.touchAction = 'none';

  let dragging       = false;
  let moved           = false;
  let startY          = 0;
  let startScrollTop  = 0;
  let activePointerId: number | null = null;

  function suppressNextClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function onPointerDown(e: PointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragging          = true;
    moved             = false;
    startY            = e.clientY;
    startScrollTop    = node.scrollTop;
    activePointerId   = e.pointerId;
    // Deliberately do NOT capture the pointer here. Capturing on a plain tap
    // reroutes the resulting `click` event to this container instead of the
    // button the user actually touched, so onclick handlers on rows never
    // fire. Capture is only taken once a drag is confirmed, below.
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging || e.pointerId !== activePointerId) return;
    const dy = e.clientY - startY;
    if (!moved && Math.abs(dy) > MOVE_THRESHOLD) {
      moved = true;
      // Now that this is a confirmed drag (not a tap), capture the pointer
      // so move/up events keep arriving even if the finger leaves this
      // element's bounds, and swallow the click pointerup would otherwise
      // fire on whatever row is under the finger.
      try { node.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      node.addEventListener('click', suppressNextClick, { capture: true, once: true });
    }
    if (moved) {
      node.scrollTop = startScrollTop - dy;
    }
  }

  function onPointerUp(e: PointerEvent) {
    if (e.pointerId !== activePointerId) return;
    dragging        = false;
    activePointerId = null;
    try { node.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  }

  node.addEventListener('pointerdown', onPointerDown);
  node.addEventListener('pointermove', onPointerMove);
  node.addEventListener('pointerup', onPointerUp);
  node.addEventListener('pointercancel', onPointerUp);

  return {
    destroy() {
      node.style.touchAction = prevTouchAction;
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('pointermove', onPointerMove);
      node.removeEventListener('pointerup', onPointerUp);
      node.removeEventListener('pointercancel', onPointerUp);
      node.removeEventListener('click', suppressNextClick, true);
    },
  };
};
