<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import type { SheetMusic } from '@/midi/SheetMusic';

const props = defineProps<{
  sheet: SheetMusic | null;
}>();

const containerEl = ref<HTMLDivElement | null>(null);
const canvasEl    = ref<HTMLCanvasElement | null>(null);

function getCtx(): CanvasRenderingContext2D | null {
  return canvasEl.value?.getContext('2d') ?? null;
}

function drawSheet(): void {
  const ctx = getCtx();
  if (!ctx || !props.sheet) return;
  const s = props.sheet;
  const canvas = canvasEl.value!;
  canvas.width  = s.getWidth();
  canvas.height = s.getHeight();
  s.Draw(ctx);
}

function scrollTo(_x: number, y: number, _immediate: boolean): void {
  const el = containerEl.value;
  if (!el) return;
  const targetTop = Math.max(0, y - el.clientHeight / 3);
  el.scrollTo({ top: targetTop, behavior: 'instant' });
}

watch(() => props.sheet, drawSheet);
onMounted(drawSheet);

defineExpose({ getCtx, drawSheet, scrollTo });
</script>

<template>
  <div ref="containerEl" class="sheet-container">
    <canvas ref="canvasEl" class="sheet-canvas"></canvas>
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
