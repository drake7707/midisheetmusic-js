<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import type { SheetMusic } from '@/midi/SheetMusic';
import { ImmediateScroll } from '@/midi/SheetMusic';

const props = defineProps<{
  sheet: SheetMusic | null;
}>();

const emit = defineEmits<{
  (e: 'canvasClick', x: number, y: number): void;
  (e: 'drawError', msg: string): void;
}>();

const containerEl = ref<HTMLDivElement | null>(null);
const canvasEl    = ref<HTMLCanvasElement | null>(null);

// Current scroll offsets, kept in sync with the container's scrollLeft/scrollTop.
const scrollX = ref(0);
const scrollY = ref(0);

// ---- Context helper ----
// Returns the raw 2D context (no transforms applied – callers set transforms
// themselves so that the same ctx works for both Draw and ShadeNotes).
function getRawCtx(): CanvasRenderingContext2D | null {
  return canvasEl.value?.getContext('2d') ?? null;
}

// Public getCtx() used by MidiPlayer legacy path (non-viewport). With
// viewport rendering the viewportShadeFn is used instead, but we keep this
// for backward-compat.
function getCtx(): CanvasRenderingContext2D | null {
  return getRawCtx();
}

// ---- Sizing helpers ----
function viewportWidth(): number  { return containerEl.value?.clientWidth  ?? window.innerWidth; }
function viewportHeight(): number { return containerEl.value?.clientHeight ?? window.innerHeight; }

// ---- Core draw helpers ----

/** Size the canvas to the current container viewport (no-op if already correct). */
function resizeCanvas(): void {
  const canvas = canvasEl.value;
  if (!canvas) return;
  const vw = viewportWidth();
  const vh = viewportHeight();
  if (canvas.width !== vw || canvas.height !== vh) {
    canvas.width  = vw;
    canvas.height = vh;
  }
}

/** Draw the full sheet at the current scroll offset, then optionally shade notes. */
function drawSheet(currentPulse = -1, prevPulse = -1): void {
  const ctx = getRawCtx();
  if (!ctx || !props.sheet) return;
  const s = props.sheet;

  resizeCanvas();

  // Translate so that sheet coordinates map to viewport coordinates.
  ctx.save();
  ctx.translate(-scrollX.value, -scrollY.value);
  try {
    s.Draw(ctx);
    if (currentPulse >= 0) {
      s.ShadeNotes(ctx, currentPulse, prevPulse);
    }
  } catch (e) {
    emit('drawError', `Canvas draw failed: ${(e as Error).message}`);
  } finally {
    ctx.restore();
  }
}

// Track the last shade state so we can redraw correctly after a scroll.
let lastShadePulse = -1;
let lastPrevPulse  = -1;

// ---- Public: viewport-aware shade + scroll (called by MidiPlayer callback) ----
/** Draw the visible viewport with shading and optionally scroll to the shaded note. */
function renderAndScroll(currentPulse: number, prevPulse: number, scrollType: number): void {
  const s = props.sheet;
  const el = containerEl.value;
  if (!s || !el) return;

  lastShadePulse = currentPulse;
  lastPrevPulse  = prevPulse;

  if (currentPulse >= 0) {
    // Compute the position of the current note and scroll there first so the
    // canvas is drawn at the correct viewport before we apply shading.
    const { xShade, yShade } = s.getShadePosition(currentPulse);

    const immediate = scrollType === ImmediateScroll;
    const targetTop  = Math.max(0, yShade - el.clientHeight / 3);
    const targetLeft = Math.max(0, xShade - el.clientWidth  / 3);

    if (Math.abs(el.scrollTop - targetTop) > 1 || Math.abs(el.scrollLeft - targetLeft) > 1) {
      el.scrollTop  = targetTop;
      el.scrollLeft = targetLeft;
      scrollY.value = el.scrollTop;
      scrollX.value = el.scrollLeft;
    }
    void immediate; // kept for future smooth-scroll support
  }

  drawSheet(currentPulse, prevPulse);
}

// ---- scrollTo (called by MidiPlayer legacy scroll path) ----
function scrollTo(_x: number, y: number, _immediate: boolean): void {
  const el = containerEl.value;
  if (!el) return;
  const targetTop = Math.max(0, y - el.clientHeight / 3);
  el.scrollTop  = targetTop;
  scrollY.value = el.scrollTop;
  drawSheet(lastShadePulse, lastPrevPulse);
}

// ---- Scroll event (user drags scrollbar) ----
function onScroll(): void {
  const el = containerEl.value;
  if (!el) return;
  scrollX.value = el.scrollLeft;
  scrollY.value = el.scrollTop;
  drawSheet(lastShadePulse, lastPrevPulse);
}

// ---- Canvas click ----
function onCanvasClick(event: MouseEvent): void {
  const canvas = canvasEl.value;
  if (!canvas || !props.sheet) return;
  const rect = canvas.getBoundingClientRect();
  // Add scroll offsets to convert viewport coords → sheet coords.
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (event.clientX - rect.left) * scaleX + scrollX.value;
  const y = (event.clientY - rect.top)  * scaleY + scrollY.value;
  emit('canvasClick', x, y);
}

// ---- ResizeObserver to redraw when container is resized ----
let resizeObserver: ResizeObserver | null = null;

function setupResizeObserver(): void {
  if (!containerEl.value) return;
  resizeObserver = new ResizeObserver(() => {
    drawSheet(lastShadePulse, lastPrevPulse);
  });
  resizeObserver.observe(containerEl.value);
}

// ---- Lifecycle ----
watch(() => props.sheet, () => {
  // Reset shade state and scroll to top whenever a new sheet is loaded.
  lastShadePulse = -1;
  lastPrevPulse  = -1;
  scrollX.value  = 0;
  scrollY.value  = 0;
  if (containerEl.value) {
    containerEl.value.scrollTop  = 0;
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

defineExpose({ getCtx, drawSheet, scrollTo, renderAndScroll });
</script>

<template>
  <div ref="containerEl" class="sheet-container" @scroll.passive="onScroll">
    <!-- Spacer div sized to the full sheet so the container is scrollable. -->
    <div
      v-if="sheet"
      class="sheet-spacer"
      :style="{ width: sheet.getWidth() + 'px', height: sheet.getHeight() + 'px' }"
    ></div>
    <!-- Canvas is sticky so it always fills the visible viewport. -->
    <canvas ref="canvasEl" class="sheet-canvas" @click="onCanvasClick"></canvas>
    <div v-if="!sheet" class="sheet-empty">
      <p>Load a MIDI file to display sheet music</p>
    </div>
  </div>
</template>

<style scoped>
.sheet-container {
  flex: 1;
  overflow: auto;
  background: #fff;
  position: relative;
}
.sheet-spacer {
  /* Pure placeholder that gives the container its scrollable dimensions.
     It sits at the top-left in normal flow but has no visible content. */
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}
.sheet-canvas {
  /* Sticky positioning keeps the canvas visible in the viewport at all times
     while the spacer div (which is the same size as the full sheet) provides
     the scrollable area. */
  position: sticky;
  top: 0;
  left: 0;
  display: block;
  /* Canvas pixel dimensions are set via JS; CSS dimensions match the container. */
  width: 100%;
  height: 100%;
  z-index: 1;
}
.sheet-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
  font-size: 1.1rem;
  position: relative;
  z-index: 2;
}
</style>

