/**
 * Minimal TypeScript declarations for the WebAudioFont library
 * (https://github.com/surikov/webaudiofont).
 *
 * The library is served as a plain script from /WebAudioFontPlayer.js and
 * registers `WebAudioFontPlayer` as a global browser variable.
 */

interface WafPreset {
  zones: WafZone[];
}

interface WafZone {
  keyRangeLow: number;
  keyRangeHigh: number;
  originalPitch: number;
  coarseTune: number;
  fineTune: number;
  loopStart: number;
  loopEnd: number;
  sampleRate: number;
  buffer?: AudioBuffer;
  delay?: number;
  ahdsr?: boolean | Array<{ duration: number; volume: number }>;
  sample?: string;
  file?: string;
}

interface WafEnvelope {
  when: number;
  duration: number;
  pitch: number;
  preset: WafPreset;
  target: AudioNode;
  audioBufferSourceNode?: AudioBufferSourceNode | null;
  cancel(): void;
}

interface WafChannel {
  input: GainNode;
  output: GainNode;
}

interface WafPresetInfo {
  variable: string;
  url: string;
  title: string;
  pitch: number;
}

interface WafLoader {
  findInstrument(program: number): number;
  instrumentInfo(n: number): WafPresetInfo;
  findDrum(pitch: number): number;
  drumInfo(n: number): WafPresetInfo;
  startLoad(ctx: AudioContext, url: string, variable: string): void;
  waitLoad(callback: () => void): void;
  loaded(variable: string): boolean;
}

interface WafPlayer {
  envelopes: WafEnvelope[];
  loader: WafLoader;
  createChannel(ctx: AudioContext): WafChannel;
  resumeContext(ctx: AudioContext): void;
  queueWaveTable(
    ctx: AudioContext,
    dest: AudioNode,
    preset: WafPreset,
    when: number,
    pitch: number,
    duration: number,
    volume?: number,
  ): WafEnvelope | null;
  cancelQueue(ctx: AudioContext): void;
}

declare var WebAudioFontPlayer: new () => WafPlayer;
