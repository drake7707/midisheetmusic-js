import { NoteDuration } from './NoteDuration';
import { Accid } from '../sheets/Accid';
import { WhiteNote } from '../sheets/WhiteNote';
/** Data describing a single note within a chord, used for sheet music rendering. */
export class NoteData {
    number = 0;
    whitenote = new WhiteNote(2, 4); // default to C4
    duration = NoteDuration.Quarter;
    leftside = true;
    accid = Accid.None;
}
