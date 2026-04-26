import { NoteDuration } from './NoteDuration';
import { Accid } from '../sheets/Accid';
import { WhiteNote } from '../sheets/WhiteNote';

/** Data describing a single note within a chord, used for sheet music rendering. */
export class NoteData {
  number: number = 0;
  whitenote: WhiteNote = new WhiteNote(2, 4); // default to C4
  duration: NoteDuration = NoteDuration.Quarter;
  leftside: boolean = true;
  accid: Accid = Accid.None;
}
