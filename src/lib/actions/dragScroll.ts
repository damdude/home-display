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
 * Two extra behaviours layer on top:
 *   • Edge bands (top/bottom) are reserved for the window-level Control /
 *     Notification Center swipes. A drag that STARTS in a band is ignored here
 *     so this action never captures the pointer and steals that gesture.
 *   • Rubber-band overscroll + pull-to-refresh at the scroll boundaries, using
 *     Apple's resistance curve and a critically-damped spring settle
 *     (see ~/.claude/skills/apple-design/SKILL.md §9 and §4).
 *
 * Usage:
 *   <div use:dragScroll>
 *   <div use:dragScroll={{ onRefresh, refreshThreshold: 90 }}>
 */
import type { Action } from 'svelte/action';

const MOVE_THRESHOLD = 6; // px before a pointerdown counts as a drag, not a tap

// Edge bands reserved for window-level Control Center (top) / Notification
// Center (bottom) swipes. A drag that STARTS in these bands is left for the
// window handler — dragScroll ignores it so it never captures the pointer.
export const EDGE_BAND_TOP    = 90;
export const EDGE_BAND_BOTTOM = 150;

interface DragScrollOptions {
  onRefresh?: () => void | Promise<void>;
  refreshThreshold?: number;   // px of top-overscroll to trigger refresh (default 90)
}

/**
 * Apple's rubber-band resistance (WWDC 2018 "Designing Fluid Interfaces").
 * The further past the boundary, the less the content follows.
 */
function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

export const dragScroll: Action<HTMLElement, DragScrollOptions | undefined> =
  (node, opts = {}) => {
    const onRefresh        = opts?.onRefresh;
    const refreshThreshold = opts?.refreshThreshold ?? 90;

    const prevTouchAction = node.style.touchAction;
    node.style.touchAction = 'none';

    let dragging        = false;
    let moved           = false;
    let startY          = 0;
    let startScrollTop  = 0;
    let activePointerId: number | null = null;
    let startedInEdge   = false;

    let overscroll = 0;   // current elastic translate in px (+down / -up)
    let raf = 0;
    const prefersReduced =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    function suppressNextClick(e: MouseEvent) {
      e.preventDefault();
      e.stopPropagation();
    }

    /** Apply/clear the elastic translate, managing will-change for the compositor. */
    function setOverscroll(v: number) {
      overscroll = v;
      if (v) {
        node.style.transform  = `translateY(${v}px)`;
        node.style.willChange = 'transform';
      } else {
        node.style.transform  = '';
        node.style.willChange = '';
      }
    }

    function onPointerDown(e: PointerEvent) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      cancelAnimationFrame(raf);   // interrupt any in-flight spring settle

      // If the gesture begins in a reserved edge band, let the window-level
      // Control/Notification swipe own it — do not track or capture here.
      const h = window.innerHeight;
      startedInEdge = e.clientY <= EDGE_BAND_TOP || e.clientY >= h - EDGE_BAND_BOTTOM;

      dragging        = true;
      moved           = false;
      startY          = e.clientY;
      startScrollTop  = node.scrollTop;
      activePointerId = e.pointerId;
    }

    function onPointerMove(e: PointerEvent) {
      if (!dragging || e.pointerId !== activePointerId) return;
      if (startedInEdge) return;   // window swipe owns this gesture — never capture

      const dy = e.clientY - startY;
      if (!moved && Math.abs(dy) > MOVE_THRESHOLD) {
        moved = true;
        // Confirmed drag (not a tap): capture so move/up keep arriving even if
        // the finger leaves this element, and swallow the click pointerup fires.
        try { node.setPointerCapture(e.pointerId); } catch { /* ignore */ }
        node.addEventListener('click', suppressNextClick, { capture: true, once: true });
      }
      if (!moved) return;

      const maxTop   = node.scrollHeight - node.clientHeight;
      const atTop    = startScrollTop - dy <= 0;
      const atBottom = startScrollTop - dy >= maxTop;
      const dim      = node.clientHeight || 800;

      if (!prefersReduced && atTop && dy > 0) {
        // Pulling down at the top → elastic rubber-band with resistance.
        setOverscroll(rubberband(dy, dim));
      } else if (!prefersReduced && atBottom && dy < 0) {
        // Pulling up at the bottom → elastic rubber-band (negative translate).
        setOverscroll(-rubberband(-dy, dim));
      } else {
        if (overscroll) setOverscroll(0);
        node.scrollTop = startScrollTop - dy;
      }
    }

    function onPointerUp(e: PointerEvent) {
      if (e.pointerId !== activePointerId) return;
      dragging        = false;
      activePointerId = null;
      startedInEdge   = false;
      try { node.releasePointerCapture(e.pointerId); } catch { /* ignore */ }

      if (overscroll !== 0) {
        const shouldRefresh = overscroll >= refreshThreshold;  // top pull only (positive)
        springBack(shouldRefresh);
      }
    }

    /**
     * Spring the elastic translate back to rest. Critically damped (no
     * overshoot) per the apple-design skill's default UI spring
     * (damping ≈ 1.0, response ≈ 0.4s). Interruptible — a new pointerdown
     * cancels this rAF and takes over from the live value.
     */
    function springBack(triggerRefresh: boolean) {
      if (triggerRefresh && onRefresh) void onRefresh();

      let value    = overscroll;
      let velocity = 0;
      const k = 220;   // stiffness → response ≈ 0.42s
      const c = 30;    // ≈ 2·√k → critically damped (no bounce)
      let last = performance.now();
      cancelAnimationFrame(raf);

      const tick = (now: number) => {
        const dt = Math.min((now - last) / 1000, 1 / 30);   // clamp dt on frame drops
        last = now;
        const accel = -k * value - c * velocity;
        velocity += accel * dt;
        value    += velocity * dt;
        if (Math.abs(value) < 0.5) { setOverscroll(0); return; }
        setOverscroll(value);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    node.addEventListener('pointerdown', onPointerDown);
    node.addEventListener('pointermove', onPointerMove);
    node.addEventListener('pointerup', onPointerUp);
    node.addEventListener('pointercancel', onPointerUp);

    return {
      destroy() {
        cancelAnimationFrame(raf);
        node.style.touchAction = prevTouchAction;
        node.style.transform   = '';
        node.style.willChange  = '';
        node.removeEventListener('pointerdown', onPointerDown);
        node.removeEventListener('pointermove', onPointerMove);
        node.removeEventListener('pointerup', onPointerUp);
        node.removeEventListener('pointercancel', onPointerUp);
        node.removeEventListener('click', suppressNextClick, true);
      },
    };
  };
