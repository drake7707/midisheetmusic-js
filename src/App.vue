<script setup lang="ts">
import { ref, shallowRef, nextTick } from 'vue';
import { MidiFile, InstrumentAbbreviations } from '@/midi/MidiFile';
import type { MidiOptions } from '@/midi/MidiFile';
import { SheetMusic, createDefaultOptions } from '@/midi/SheetMusic';
import { Piano } from '@/midi/Piano';
import { MidiPlayer, PlayerState } from '@/midi/MidiPlayer';
import type { PlayerStateValue } from '@/midi/MidiPlayer';
import SheetMusicView from '@/components/SheetMusicView.vue';
import PianoKeyboard from '@/components/PianoKeyboard.vue';

const player = new MidiPlayer();

const midiFile    = shallowRef<MidiFile    | null>(null);
const options     = shallowRef<MidiOptions | null>(null);
const sheet       = shallowRef<SheetMusic  | null>(null);
const piano       = shallowRef<Piano       | null>(null);
const fileName    = ref('');
const errorMsg    = ref('');
const playState   = ref<PlayerStateValue>(PlayerState.Stopped);
const speedPct    = ref(100);

const sheetViewRef = ref<InstanceType<typeof SheetMusicView>  | null>(null);
const pianoViewRef = ref<InstanceType<typeof PianoKeyboard>   | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

// ---- polling for play state (lightweight) ----
let pollHandle: ReturnType<typeof setInterval> | null = null;
function startPolling() {
  if (pollHandle !== null) return;
  pollHandle = setInterval(() => {
    playState.value = player.getPlayState();
  }, 200);
}
function stopPolling() {
  if (pollHandle !== null) { clearInterval(pollHandle); pollHandle = null; }
}

// ---- file loading ----
async function onFileChange(evt: Event) {
  const input = evt.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  await loadFile(file);
  input.value = '';
}

async function loadFile(file: File) {
  errorMsg.value = '';
  try {
    const buf  = await file.arrayBuffer();
    const midi = new MidiFile(buf, file.name);
    const opts = createDefaultOptions(midi, InstrumentAbbreviations);
    const s    = new SheetMusic(midi, opts);
    const p    = new Piano();
    p.init(window.innerWidth);
    p.SetMidiFile(midi, opts);
    p.SetShadeColors(opts.shade1Color, opts.shade2Color);

    fileName.value = file.name;
    midiFile.value = midi;
    options.value  = opts;
    sheet.value    = s;
    piano.value    = p;

    await nextTick();
    setupPlayer(midi, opts, s, p);
    startPolling();
  } catch (e) {
    errorMsg.value = `Failed to load MIDI: ${(e as Error).message}`;
  }
}

function setupPlayer(midi: MidiFile, opts: MidiOptions, s: SheetMusic, p: Piano): void {
  player.setSheetCtxProvider(() => sheetViewRef.value?.getCtx() ?? null);
  player.setPianoCtxProvider(() => pianoViewRef.value?.getCtx() ?? null);
  player.setRedrawFn(() => {
    const ctx = sheetViewRef.value?.getCtx();
    if (ctx) s.Draw(ctx);
  });
  player.setScrollFn((x, y, immediate) => {
    sheetViewRef.value?.scrollTo(x, y, immediate);
  });
  player.SetPiano(p);
  player.SetMidiFile(midi, opts, s);

  // Initial draw
  const sheetCtx = sheetViewRef.value?.getCtx();
  if (sheetCtx) s.Draw(sheetCtx);
  const pianoCtx = pianoViewRef.value?.getCtx();
  if (pianoCtx) p.Draw(pianoCtx);
}

// ---- playback controls ----
function play()        { player.Play();       playState.value = player.getPlayState(); }
function pause()       { player.Pause();      playState.value = player.getPlayState(); }
function stop()        { player.Reset();      playState.value = player.getPlayState(); stopPolling(); startPolling(); }
function rewind()      { player.Rewind();     playState.value = player.getPlayState(); }
function fastForward() { player.FastForward(); playState.value = player.getPlayState(); }

function onSpeedChange(evt: Event) {
  const v = parseInt((evt.target as HTMLInputElement).value, 10);
  speedPct.value = v;
  player.setSpeedPercent(v);
}

function isPlaying(): boolean { return playState.value === PlayerState.Playing; }
function hasMidi():   boolean { return midiFile.value !== null; }
</script>

<template>
  <div class="app">
    <!-- ---- Toolbar ---- -->
    <header class="toolbar">
      <div class="toolbar-left">
        <button class="btn-icon" title="Open MIDI file" @click="fileInputRef?.click()">
          📂
        </button>
        <input
          ref="fileInputRef"
          type="file"
          accept=".mid,.midi"
          style="display:none"
          @change="onFileChange"
        />
        <span class="filename">{{ fileName || 'No file loaded' }}</span>
      </div>

      <div class="toolbar-center" v-if="hasMidi()">
        <button class="btn-control" title="Rewind" @click="rewind">⏮</button>
        <button class="btn-control btn-play" :title="isPlaying() ? 'Pause' : 'Play'"
                @click="isPlaying() ? pause() : play()">
          {{ isPlaying() ? '⏸' : '▶' }}
        </button>
        <button class="btn-control" title="Stop" @click="stop">⏹</button>
        <button class="btn-control" title="Fast Forward" @click="fastForward">⏭</button>
      </div>

      <div class="toolbar-right" v-if="hasMidi()">
        <label class="speed-label">
          Speed: {{ speedPct }}%
          <input
            type="range" min="10" max="200" step="5"
            :value="speedPct"
            @input="onSpeedChange"
            class="speed-slider"
          />
        </label>
      </div>
    </header>

    <!-- ---- Error ---- -->
    <div v-if="errorMsg" class="error-bar">{{ errorMsg }}</div>

    <!-- ---- Main content ---- -->
    <main class="main-content">
      <SheetMusicView ref="sheetViewRef" :sheet="sheet" />
    </main>

    <!-- ---- Piano ---- -->
    <footer v-if="options?.showPiano && piano" class="piano-footer">
      <PianoKeyboard ref="pianoViewRef" :piano="piano" />
    </footer>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  font-family: sans-serif;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.4rem 0.75rem;
  background: #2c2c2c;
  color: #eee;
  flex-shrink: 0;
  flex-wrap: wrap;
}
.toolbar-left  { display: flex; align-items: center; gap: 0.5rem; flex: 1; min-width: 0; }
.toolbar-center { display: flex; align-items: center; gap: 0.4rem; }
.toolbar-right  { display: flex; align-items: center; gap: 0.5rem; }

.filename {
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
  color: #ccc;
}

.btn-icon,
.btn-control {
  background: #444;
  border: none;
  border-radius: 4px;
  color: #eee;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 0.25rem 0.5rem;
  line-height: 1;
}
.btn-icon:hover,
.btn-control:hover { background: #666; }
.btn-play { background: #1a6e1a; }
.btn-play:hover { background: #28a228; }

.speed-label {
  font-size: 0.8rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.1rem;
}
.speed-slider { width: 100px; }

.error-bar {
  background: #b00;
  color: #fff;
  padding: 0.4rem 1rem;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.main-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.piano-footer {
  flex-shrink: 0;
  border-top: 2px solid #333;
}
</style>

