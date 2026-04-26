import type { KeySignature } from '@/midi/KeySignature';

export interface ISheetMusic {
  getShowNoteLetters(): number;
  NoteColor(notenumber: number): number;
  getMainKey(): KeySignature;
  getTextColor(): number;
}
