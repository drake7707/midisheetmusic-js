import type { MusicSymbol } from './MusicSymbol';
import { BarSymbol } from './BarSymbol';
import { LyricSymbol } from './LyricSymbol';
import { DictInt } from './DictInt';

/** Vertically aligns notes in different tracks that occur at the same time. */
export class SymbolWidths {
  private widths: DictInt[];
  private maxwidths: DictInt;
  private starttimes: number[];

  constructor(tracks: MusicSymbol[][], tracklyrics: (LyricSymbol[] | null)[] | null) {
    this.widths = tracks.map(t => SymbolWidths.GetTrackWidths(t));
    this.maxwidths = new DictInt();

    for (const dict of this.widths) {
      for (let i = 0; i < dict.count(); i++) {
        const time = dict.getKey(i);
        if (!this.maxwidths.contains(time) || this.maxwidths.get(time) < dict.get(time)) {
          this.maxwidths.set(time, dict.get(time));
        }
      }
    }

    if (tracklyrics != null) {
      for (const lyrics of tracklyrics) {
        if (lyrics == null) continue;
        for (const lyric of lyrics) {
          const width = lyric.getMinWidth();
          const time  = lyric.getStartTime();
          if (!this.maxwidths.contains(time) || this.maxwidths.get(time) < width) {
            this.maxwidths.set(time, width);
          }
        }
      }
    }

    this.starttimes = new Array(this.maxwidths.count()).fill(0);
    for (let i = 0; i < this.maxwidths.count(); i++) {
      this.starttimes[i] = this.maxwidths.getKey(i);
    }
    this.starttimes.sort((a, b) => a - b);
  }

  private static GetTrackWidths(symbols: MusicSymbol[]): DictInt {
    const widths = new DictInt();
    for (const m of symbols) {
      const start = m.getStartTime();
      const w     = m.getMinWidth();
      if (m instanceof BarSymbol) continue;
      if (widths.contains(start)) {
        widths.set(start, widths.get(start) + w);
      } else {
        widths.set(start, w);
      }
    }
    return widths;
  }

  GetExtraWidth(track: number, start: number): number {
    if (!this.widths[track].contains(start)) {
      return this.maxwidths.get(start);
    }
    return this.maxwidths.get(start) - this.widths[track].get(start);
  }

  getStartTimes(): number[] { return this.starttimes; }
}
