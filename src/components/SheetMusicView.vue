<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import type { SheetMusic } from '@/midi/SheetMusic';

const props = defineProps<{
  sheet: SheetMusic | null;
}>();

const emit = defineEmits<{
  (e: 'canvasClick', x: number, y: number): void;
  (e: 'drawError', msg: string): void;
}>();

const containerEl = ref<HTMLDivElement | null>(null);
const canvasEl    = ref<HTMLCanvasElement | null>(null);

// Most browsers cap canvas dimensions at 32767 × 32767 px.
// Exceeding this causes the context to enter a permanent error state.
const MAX_CANVAS_DIM = 16384;

function getCtx(): CanvasRenderingContext2D | null {
  return canvasEl.value?.getContext('2d') ?? null;
}

function drawSheet(): void {
  const ctx = getCtx();
  if (!ctx || !props.sheet) return;
  const s = props.sheet;
  const w = s.getWidth();
  const h = s.getHeight();
  if (w > MAX_CANVAS_DIM || h > MAX_CANVAS_DIM) {
    emit('drawError',
      `Sheet music is too large to render (${w}×${h} px). ` +
      `Try enabling vertical scrolling or reducing the number of visible tracks.`);
    return;
  }
  const canvas = canvasEl.value!;
  canvas.width  = w;
  canvas.height = h;
  try {
    s.Draw(ctx);
  } catch (e) {
    emit('drawError', `Canvas draw failed: ${(e as Error).message}`);
  }
}

function scrollTo(_x: number, y: number, _immediate: boolean): void {
  const el = containerEl.value;
  if (!el) return;
  const targetTop = Math.max(0, y - el.clientHeight / 3);
  el.scrollTo({ top: targetTop, behavior: 'instant' });
}

function onCanvasClick(event: MouseEvent): void {
  const canvas = canvasEl.value;
  if (!canvas || !props.sheet) return;
  const rect = canvas.getBoundingClientRect();
  // Compute coordinates in canvas space (accounting for CSS scaling)
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top)  * scaleY;
  emit('canvasClick', x, y);
}

watch(() => props.sheet, drawSheet);
onMounted(drawSheet);

defineExpose({ getCtx, drawSheet, scrollTo });
</script>

<template>
  <div ref="containerEl" class="sheet-container">
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
.sheet-canvas {
  display: block;
}
.sheet-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
  font-size: 1.1rem;
}
</style>
