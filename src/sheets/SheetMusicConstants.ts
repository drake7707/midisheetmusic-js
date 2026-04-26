import { Clef } from './Clef';
import { AccidSymbol } from './AccidSymbol';
import type { KeySignature } from '@/midi/KeySignature';

export const LineWidth   = 1;
export const LeftMargin  = 4;
export const LineSpace   = 7;
export const StaffHeight = LineSpace * 4 + LineWidth * 5;  // 33
export const NoteHeight  = LineSpace + LineWidth;           // 8
export const NoteWidth   = Math.floor(3 * LineSpace / 2);  // 10
export const PageWidth   = 800;

export function KeySignatureWidth(key: KeySignature): number {
  void AccidSymbol;
  const keys = key.GetSymbols(Clef.Treble);
  const n = keys.length;
  return Math.floor(n * 3 * NoteHeight / 2) + LeftMargin * 3;
}
