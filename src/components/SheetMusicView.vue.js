/// <reference types="../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
const props = defineProps();
const emit = defineEmits();
const containerEl = ref(null);
const canvasEl = ref(null);
// Current scroll offsets, kept in sync with the container's scrollLeft/scrollTop.
const scrollX = ref(0);
const scrollY = ref(0);
// ---- Context helper ----
// Returns the raw 2D context (no transforms applied – callers set transforms
// themselves so that the same ctx works for both Draw and ShadeNotes).
function getRawCtx() {
    return canvasEl.value?.getContext('2d') ?? null;
}
// Public getCtx() used by MidiPlayer legacy path (non-viewport). With
// viewport rendering the viewportShadeFn is used instead, but we keep this
// for backward-compat.
function getCtx() {
    return getRawCtx();
}
// ---- Sizing helpers ----
function viewportWidth() { return containerEl.value?.clientWidth ?? window.innerWidth; }
function viewportHeight() { return containerEl.value?.clientHeight ?? window.innerHeight; }
// ---- Core draw helpers ----
/** Size the canvas to the current container viewport (no-op if already correct). */
function resizeCanvas() {
    const canvas = canvasEl.value;
    if (!canvas)
        return;
    const vw = viewportWidth();
    const vh = viewportHeight();
    if (canvas.width !== vw || canvas.height !== vh) {
        canvas.width = vw;
        canvas.height = vh;
    }
}
/** Draw the full sheet at the current scroll offset, then optionally shade notes.
 *  `_prevPulse` is accepted for API compatibility with callers that track both
 *  pulse times, but is intentionally not forwarded to ShadeNotes — after a full
 *  Draw there is nothing to unshade (see comment inside). */
function drawSheet(currentPulse = -1, _prevPulse = -1) {
    const ctx = getRawCtx();
    if (!ctx || !props.sheet)
        return;
    const s = props.sheet;
    resizeCanvas();
    // Translate so that sheet coordinates map to viewport coordinates.
    ctx.save();
    ctx.translate(-scrollX.value, -scrollY.value);
    try {
        s.Draw(ctx);
        if (currentPulse >= 0) {
            // After a full Draw, there is nothing to "unshade" (Draw already cleared
            // all previous highlights). Pass -1 as prevPulse so ShadeNotes skips the
            // "unshade previous note" step and, crucially, bypasses the early-return
            // optimisation that skips drawing the highlight when both prevPulse and
            // currentPulse fall within the same note's time range.
            s.ShadeNotes(ctx, currentPulse, -1);
        }
    }
    catch (e) {
        emit('drawError', `Canvas draw failed: ${e.message}`);
    }
    finally {
        ctx.restore();
    }
}
// Track the last shade state so we can redraw correctly after a scroll.
let lastShadePulse = -1;
let lastPrevPulse = -1;
// ---- Public: viewport-aware shade + scroll (called by MidiPlayer callback) ----
/** Draw the visible viewport with shading and optionally scroll to the shaded note.
 *  `scrollType` is ImmediateScroll or GradualScroll; both currently scroll
 *  synchronously (smooth-scroll animation is not yet implemented). */
function renderAndScroll(currentPulse, prevPulse, _scrollType) {
    const s = props.sheet;
    const el = containerEl.value;
    if (!s || !el)
        return;
    lastShadePulse = currentPulse;
    lastPrevPulse = prevPulse;
    if (currentPulse >= 0) {
        // Compute the position of the current note and scroll there first so the
        // canvas is drawn at the correct viewport before we apply shading.
        const { xShade, yShade } = s.getShadePosition(currentPulse);
        const targetTop = Math.max(0, yShade - el.clientHeight / 3);
        const targetLeft = Math.max(0, xShade - el.clientWidth / 3);
        if (Math.abs(el.scrollTop - targetTop) > 1 || Math.abs(el.scrollLeft - targetLeft) > 1) {
            el.scrollTop = targetTop;
            el.scrollLeft = targetLeft;
            scrollY.value = el.scrollTop;
            scrollX.value = el.scrollLeft;
        }
    }
    drawSheet(currentPulse, prevPulse);
}
// ---- scrollTo (called by MidiPlayer legacy scroll path) ----
function scrollTo(_x, y, _immediate) {
    const el = containerEl.value;
    if (!el)
        return;
    const targetTop = Math.max(0, y - el.clientHeight / 3);
    el.scrollTop = targetTop;
    scrollY.value = el.scrollTop;
    drawSheet(lastShadePulse, lastPrevPulse);
}
// ---- Scroll event (user drags scrollbar) ----
function onScroll() {
    const el = containerEl.value;
    if (!el)
        return;
    scrollX.value = el.scrollLeft;
    scrollY.value = el.scrollTop;
    drawSheet(lastShadePulse, lastPrevPulse);
}
// ---- Canvas click ----
function onCanvasClick(event) {
    const canvas = canvasEl.value;
    if (!canvas || !props.sheet)
        return;
    const rect = canvas.getBoundingClientRect();
    // Add scroll offsets to convert viewport coords → sheet coords.
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX + scrollX.value;
    const y = (event.clientY - rect.top) * scaleY + scrollY.value;
    emit('canvasClick', x, y);
}
// ---- ResizeObserver to redraw when container is resized ----
let resizeObserver = null;
function setupResizeObserver() {
    if (!containerEl.value)
        return;
    resizeObserver = new ResizeObserver(() => {
        drawSheet(lastShadePulse, lastPrevPulse);
    });
    resizeObserver.observe(containerEl.value);
}
// ---- Lifecycle ----
watch(() => props.sheet, () => {
    // Reset shade state and scroll to top whenever a new sheet is loaded.
    lastShadePulse = -1;
    lastPrevPulse = -1;
    scrollX.value = 0;
    scrollY.value = 0;
    if (containerEl.value) {
        containerEl.value.scrollTop = 0;
        containerEl.value.scrollLeft = 0;
    }
    nextTick(() => drawSheet());
});
onMounted(() => {
    setupResizeObserver();
    drawSheet();
});
onBeforeUnmount(() => {
    resizeObserver?.disconnect();
    resizeObserver = null;
});
const __VLS_exposed = { getCtx, drawSheet, scrollTo, renderAndScroll, viewportWidth };
defineExpose(__VLS_exposed);
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onScroll: (__VLS_ctx.onScroll) },
    ref: "containerEl",
    ...{ class: "sheet-container" },
});
/** @type {__VLS_StyleScopedClasses['sheet-container']} */ ;
if (__VLS_ctx.sheet) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "sheet-spacer" },
        ...{ style: ({ width: __VLS_ctx.sheet.getWidth() + 'px', height: __VLS_ctx.sheet.getHeight() + 'px' }) },
    });
    /** @type {__VLS_StyleScopedClasses['sheet-spacer']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.canvas, __VLS_intrinsics.canvas)({
    ...{ onClick: (__VLS_ctx.onCanvasClick) },
    ref: "canvasEl",
    ...{ class: "sheet-canvas" },
});
/** @type {__VLS_StyleScopedClasses['sheet-canvas']} */ ;
if (!__VLS_ctx.sheet) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "sheet-empty" },
    });
    /** @type {__VLS_StyleScopedClasses['sheet-empty']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
}
// @ts-ignore
[onScroll, sheet, sheet, sheet, sheet, onCanvasClick,];
const __VLS_export = (await import('vue')).defineComponent({
    setup: () => (__VLS_exposed),
    __typeEmits: {},
    __typeProps: {},
});
export default {};
