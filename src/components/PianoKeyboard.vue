<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import type { Piano } from '@/midi/Piano';

const props = defineProps<{
  piano: Piano | null;
}>();

const canvasEl = ref<HTMLCanvasElement | null>(null);

function getCtx(): CanvasRenderingContext2D | null {
  return canvasEl.value?.getContext('2d') ?? null;
}

function drawPiano(): void {
  const ctx = getCtx();
  if (!ctx || !props.piano) return;
  const canvas = canvasEl.value!;
  canvas.width  = props.piano.getWidth();
  canvas.height = props.piano.getHeight();
  props.piano.Draw(ctx);
}

watch(() => props.piano, drawPiano);
onMounted(drawPiano);

defineExpose({ getCtx, drawPiano });
</script>

<template>
  <div class="piano-wrapper">
    <canvas ref="canvasEl" class="piano-canvas"></canvas>
  </div>
</template>

<style scoped>
.piano-wrapper {
  overflow-x: auto;
  background: #404040;
  flex-shrink: 0;
}
.piano-canvas {
  display: block;
}
</style>
