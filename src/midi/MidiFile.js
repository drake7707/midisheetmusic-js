/*
 * Copyright (c) 2007-2012 Madhav Vaidyanathan
 * Ported to TypeScript from Java (Android MidiSheetMusic).
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License version 2.
 */
import { MidiEvent } from './MidiEvent';
import { MidiNote } from './MidiNote';
import { MidiTrack } from './MidiTrack';
import { TimeSignature } from './TimeSignature';
export const NoteNameNone = 0;
export const NoteNameLetter = 1;
export const NoteNameFixedDoReMi = 2;
export const NoteNameMovableDoReMi = 3;
export const NoteNameFixedNumber = 4;
export const NoteNameMovableNumber = 5;
// ---------------------------------------------------------------------------
// MidiDataReader – replaces Java's MidiFileReader / DataInputStream
// ---------------------------------------------------------------------------
export class MidiDataReader {
    data;
    offset;
    constructor(buffer) {
        this.data = new Uint8Array(buffer);
        this.offset = 0;
    }
    checkRead(amount) {
        if (this.offset + amount > this.data.length) {
            throw new Error(`MidiFile truncated at offset ${this.offset}`);
        }
    }
    Peek() {
        this.checkRead(1);
        return this.data[this.offset] & 0xff;
    }
    ReadByte() {
        this.checkRead(1);
        return this.data[this.offset++] & 0xff;
    }
    ReadBytes(amount) {
        this.checkRead(amount);
        const result = this.data.slice(this.offset, this.offset + amount);
        this.offset += amount;
        return result;
    }
    ReadShort() {
        this.checkRead(2);
        const x = ((this.data[this.offset] & 0xff) << 8) | (this.data[this.offset + 1] & 0xff);
        this.offset += 2;
        return x;
    }
    ReadInt() {
        this.checkRead(4);
        const x = ((this.data[this.offset] & 0xff) * 0x1000000) +
            ((this.data[this.offset + 1] & 0xff) << 16) +
            ((this.data[this.offset + 2] & 0xff) << 8) +
            (this.data[this.offset + 3] & 0xff);
        this.offset += 4;
        return x >>> 0;
    }
    ReadAscii(len) {
        this.checkRead(len);
        let s = '';
        for (let i = 0; i < len; i++) {
            s += String.fromCharCode(this.data[this.offset + i]);
        }
        this.offset += len;
        return s;
    }
    ReadVarlen() {
        let result = 0;
        let b = this.ReadByte();
        result = b & 0x7f;
        for (let i = 0; i < 3; i++) {
            if ((b & 0x80) !== 0) {
                b = this.ReadByte();
                result = (result << 7) + (b & 0x7f);
            }
            else {
                break;
            }
        }
        return result;
    }
    Skip(amount) {
        this.checkRead(amount);
        this.offset += amount;
    }
    GetOffset() {
        return this.offset;
    }
    GetData() {
        return this.data;
    }
}
// ---------------------------------------------------------------------------
// ListInt – simple growable int array (replaces Java's ListInt helper)
// ---------------------------------------------------------------------------
class ListInt {
    data;
    constructor() {
        this.data = [];
    }
    size() {
        return this.data.length;
    }
    add(x) {
        this.data.push(x);
    }
    get(index) {
        return this.data[index];
    }
    set(index, x) {
        this.data[index] = x;
    }
    contains(x) {
        return this.data.includes(x);
    }
    sort() {
        this.data.sort((a, b) => a - b);
    }
}
// ---------------------------------------------------------------------------
// MidiFile – main class
// ---------------------------------------------------------------------------
/* MIDI event flag constants */
export const EventNoteOff = 0x80;
export const EventNoteOn = 0x90;
export const EventKeyPressure = 0xa0;
export const EventControlChange = 0xb0;
export const EventProgramChange = 0xc0;
export const EventChannelPressure = 0xd0;
export const EventPitchBend = 0xe0;
export const SysexEvent1 = 0xf0;
export const SysexEvent2 = 0xf7;
export const MetaEvent = 0xff;
/* Meta-event sub-type constants */
export const MetaEventSequence = 0x00;
export const MetaEventText = 0x01;
export const MetaEventCopyright = 0x02;
export const MetaEventSequenceName = 0x03;
export const MetaEventInstrument = 0x04;
export const MetaEventLyric = 0x05;
export const MetaEventMarker = 0x06;
export const MetaEventEndOfTrack = 0x2f;
export const MetaEventTempo = 0x51;
export const MetaEventSMPTEOffset = 0x54;
export const MetaEventTimeSignature = 0x58;
export const MetaEventKeySignature = 0x59;
/** General MIDI instrument names (index 0–127) plus Percussion at index 128. */
export const Instruments = [
    'Acoustic Grand Piano',
    'Bright Acoustic Piano',
    'Electric Grand Piano',
    'Honky-tonk Piano',
    'Electric Piano 1',
    'Electric Piano 2',
    'Harpsichord',
    'Clavi',
    'Celesta',
    'Glockenspiel',
    'Music Box',
    'Vibraphone',
    'Marimba',
    'Xylophone',
    'Tubular Bells',
    'Dulcimer',
    'Drawbar Organ',
    'Percussive Organ',
    'Rock Organ',
    'Church Organ',
    'Reed Organ',
    'Accordion',
    'Harmonica',
    'Tango Accordion',
    'Acoustic Guitar (nylon)',
    'Acoustic Guitar (steel)',
    'Electric Guitar (jazz)',
    'Electric Guitar (clean)',
    'Electric Guitar (muted)',
    'Overdriven Guitar',
    'Distortion Guitar',
    'Guitar harmonics',
    'Acoustic Bass',
    'Electric Bass (finger)',
    'Electric Bass (pick)',
    'Fretless Bass',
    'Slap Bass 1',
    'Slap Bass 2',
    'Synth Bass 1',
    'Synth Bass 2',
    'Violin',
    'Viola',
    'Cello',
    'Contrabass',
    'Tremolo Strings',
    'Pizzicato Strings',
    'Orchestral Harp',
    'Timpani',
    'String Ensemble 1',
    'String Ensemble 2',
    'SynthStrings 1',
    'SynthStrings 2',
    'Choir Aahs',
    'Voice Oohs',
    'Synth Voice',
    'Orchestra Hit',
    'Trumpet',
    'Trombone',
    'Tuba',
    'Muted Trumpet',
    'French Horn',
    'Brass Section',
    'SynthBrass 1',
    'SynthBrass 2',
    'Soprano Sax',
    'Alto Sax',
    'Tenor Sax',
    'Baritone Sax',
    'Oboe',
    'English Horn',
    'Bassoon',
    'Clarinet',
    'Piccolo',
    'Flute',
    'Recorder',
    'Pan Flute',
    'Blown Bottle',
    'Shakuhachi',
    'Whistle',
    'Ocarina',
    'Lead 1 (square)',
    'Lead 2 (sawtooth)',
    'Lead 3 (calliope)',
    'Lead 4 (chiff)',
    'Lead 5 (charang)',
    'Lead 6 (voice)',
    'Lead 7 (fifths)',
    'Lead 8 (bass + lead)',
    'Pad 1 (new age)',
    'Pad 2 (warm)',
    'Pad 3 (polysynth)',
    'Pad 4 (choir)',
    'Pad 5 (bowed)',
    'Pad 6 (metallic)',
    'Pad 7 (halo)',
    'Pad 8 (sweep)',
    'FX 1 (rain)',
    'FX 2 (soundtrack)',
    'FX 3 (crystal)',
    'FX 4 (atmosphere)',
    'FX 5 (brightness)',
    'FX 6 (goblins)',
    'FX 7 (echoes)',
    'FX 8 (sci-fi)',
    'Sitar',
    'Banjo',
    'Shamisen',
    'Koto',
    'Kalimba',
    'Bag pipe',
    'Fiddle',
    'Shanai',
    'Tinkle Bell',
    'Agogo',
    'Steel Drums',
    'Woodblock',
    'Taiko Drum',
    'Melodic Tom',
    'Synth Drum',
    'Reverse Cymbal',
    'Guitar Fret Noise',
    'Breath Noise',
    'Seashore',
    'Bird Tweet',
    'Telephone Ring',
    'Helicopter',
    'Applause',
    'Gunshot',
    'Percussion',
];
/** Abbreviated instrument names, parallel to Instruments[]. */
export const InstrumentAbbreviations = [
    'Pno.A', // Acoustic Grand Piano
    'Pno.B', // Bright Acoustic Piano
    'Pno.EG', // Electric Grand Piano
    'Pno.HT', // Honky-tonk Piano
    'EP1', // Electric Piano 1
    'EP2', // Electric Piano 2
    'Hps.', // Harpsichord
    'Clv.', // Clavinet
    'Cel.', // Celesta
    'Glo.', // Glockenspiel
    'Mbx.', // Music Box
    'Vib.', // Vibraphone
    'Mar.', // Marimba
    'Xyl.', // Xylophone
    'Tbel.', // Tubular Bells
    'Dul.', // Dulcimer
    'Org.D', // Drawbar Organ
    'Org.P', // Percussive Organ
    'Org.R', // Rock Organ
    'Org.C', // Church Organ
    'Org.Re', // Reed Organ
    'Acc.', // Accordion
    'Hrm.', // Harmonica
    'Acc.T', // Tango Accordion
    'Gtr.N', // Acoustic Guitar (nylon)
    'Gtr.S', // Acoustic Guitar (steel)
    'EG.J', // Electric Guitar (jazz)
    'EG.C', // Electric Guitar (clean)
    'EG.M', // Electric Guitar (muted)
    'EG.O', // Overdriven Guitar
    'EG.D', // Distortion Guitar
    'Gtr.H', // Guitar Harmonics
    'Bs.A', // Acoustic Bass
    'Bs.EF', // Electric Bass (finger)
    'Bs.EP', // Electric Bass (pick)
    'Bs.Fr', // Fretless Bass
    'Bs.S1', // Slap Bass 1
    'Bs.S2', // Slap Bass 2
    'Bs.Sy1', // Synth Bass 1
    'Bs.Sy2', // Synth Bass 2
    'Vln.', // Violin
    'Vla.', // Viola
    'Vc.', // Cello
    'Cb.', // Contrabass
    'Str.Tr', // Tremolo Strings
    'Str.Pz', // Pizzicato Strings
    'Hp.', // Orchestral Harp
    'Tmp.', // Timpani
    'Str.E1', // String Ensemble 1
    'Str.E2', // String Ensemble 2
    'Str.Sy1', // Synth Strings 1
    'Str.Sy2', // Synth Strings 2
    'Chr.A', // Choir Aahs
    'Chr.O', // Voice Oohs
    'Chr.S', // Synth Choir
    'Orch.H', // Orchestra Hit
    'Tpt.', // Trumpet
    'Tbn.', // Trombone
    'Tba.', // Tuba
    'Tpt.M', // Muted Trumpet
    'Hn.', // French Horn
    'Brs.S', // Brass Section
    'Brs.Sy1', // Synth Brass 1
    'Brs.Sy2', // Synth Brass 2
    'Sax.S', // Soprano Sax
    'Sax.A', // Alto Sax
    'Sax.T', // Tenor Sax
    'Sax.B', // Baritone Sax
    'Ob.', // Oboe
    'EHn.', // English Horn
    'Bsn.', // Bassoon
    'Cl.', // Clarinet
    'Picc.', // Piccolo
    'Fl.', // Flute
    'Rec.', // Recorder
    'PFl.', // Pan Flute
    'Bot.', // Blown Bottle
    'Shk.', // Shakuhachi
    'Whs.', // Whistle
    'Oca.', // Ocarina
    'Ld.Sq', // Lead 1 (square)
    'Ld.Sw', // Lead 2 (sawtooth)
    'Ld.Cal', // Lead 3 (calliope)
    'Ld.Ch', // Lead 4 (chiff)
    'Ld.Char', // Lead 5 (charang)
    'Ld.Vo', // Lead 6 (voice)
    'Ld.5th', // Lead 7 (fifths)
    'Ld.BL', // Lead 8 (bass+lead)
    'Pd.NA', // Pad 1 (new age)
    'Pd.W', // Pad 2 (warm)
    'Pd.P', // Pad 3 (polysynth)
    'Pd.C', // Pad 4 (choir)
    'Pd.B', // Pad 5 (bowed)
    'Pd.M', // Pad 6 (metallic)
    'Pd.H', // Pad 7 (halo)
    'Pd.Sw', // Pad 8 (sweep)
    'FX.R', // FX 1 (rain)
    'FX.ST', // FX 2 (soundtrack)
    'FX.Cr', // FX 3 (crystal)
    'FX.At', // FX 4 (atmosphere)
    'FX.Br', // FX 5 (brightness)
    'FX.Gb', // FX 6 (goblins)
    'FX.Ec', // FX 7 (echoes)
    'FX.SF', // FX 8 (sci-fi)
    'Sit.', // Sitar
    'Bjo.', // Banjo
    'Shm.', // Shamisen
    'Koto', // Koto
    'Kal.', // Kalimba
    'Bag.', // Bagpipe
    'Fid.', // Fiddle
    'Sha.', // Shanai
    'Tnk.B', // Tinkle Bell
    'Ago.', // Agogo
    'Stl.D', // Steel Drums
    'Wblk.', // Woodblock
    'Tko.', // Taiko Drum
    'M.Tom', // Melodic Tom
    'Syn.D', // Synth Drum
    'Cym.R', // Reverse Cymbal
    'Gtr.FN', // Guitar Fret Noise
    'Br.No', // Breath Noise
    'Sea.', // Seashore
    'Brd.', // Bird Tweet
    'Tel.', // Telephone Ring
    'Heli.', // Helicopter
    'Appl.', // Applause
    'Gun.', // Gunshot
    'Perc.', // Percussion (channel 9)
];
// ---------------------------------------------------------------------------
// MidiFile
// ---------------------------------------------------------------------------
export class MidiFile {
    filename;
    allevents;
    tracks;
    trackmode;
    timesig;
    quarternote;
    totalpulses;
    trackPerChannel;
    constructor(data, filename) {
        this.filename = filename;
        this.allevents = [];
        this.tracks = [];
        this.trackmode = 0;
        this.quarternote = 0;
        this.totalpulses = 0;
        this.trackPerChannel = false;
        // Provide a safe default; will be replaced in parse()
        this.timesig = new TimeSignature(4, 4, 240, 500000);
        this.parse(data);
    }
    // ---- Public accessors --------------------------------------------------
    getTracks() { return this.tracks; }
    getTime() { return this.timesig; }
    getFileName() { return this.filename; }
    getTotalPulses() { return this.totalpulses; }
    // ---- Parsing -----------------------------------------------------------
    parse(buffer) {
        this.tracks = [];
        this.trackPerChannel = false;
        const file = new MidiDataReader(buffer);
        const id = file.ReadAscii(4);
        if (id !== 'MThd') {
            throw new Error('MidiFile: Does not start with MThd');
        }
        const len = file.ReadInt();
        if (len !== 6) {
            throw new Error('MidiFile: Bad MThd header length');
        }
        this.trackmode = file.ReadShort();
        const numTracks = file.ReadShort();
        this.quarternote = file.ReadShort();
        this.allevents = [];
        for (let tracknum = 0; tracknum < numTracks; tracknum++) {
            const events = this.readTrack(file);
            this.allevents.push(events);
            const track = new MidiTrack(events, tracknum);
            if (track.getNotes().length > 0) {
                this.tracks.push(track);
            }
        }
        for (const track of this.tracks) {
            const notes = track.getNotes();
            const last = notes[notes.length - 1];
            const end = last.getStartTime() + last.getDuration();
            if (this.totalpulses < end) {
                this.totalpulses = end;
            }
        }
        if (this.tracks.length === 1 && MidiFile.HasMultipleChannels(this.tracks[0])) {
            this.tracks = MidiFile.SplitChannels(this.tracks[0], this.allevents[this.tracks[0].trackNumber()]);
            this.trackPerChannel = true;
        }
        MidiFile.CheckStartTimes(this.tracks);
        // Determine time signature and tempo
        let tempo = 0;
        let foundMidSongTempo = false;
        let numer = 0;
        let denom = 0;
        for (const list of this.allevents) {
            for (const mevent of list) {
                if (mevent.Metaevent === MetaEventTempo) {
                    if (mevent.StartTime === 0) {
                        tempo = mevent.Tempo;
                    }
                    else if (!foundMidSongTempo) {
                        tempo = mevent.Tempo;
                        foundMidSongTempo = true;
                    }
                }
                if (mevent.Metaevent === MetaEventTimeSignature && numer === 0) {
                    numer = mevent.Numerator;
                    denom = mevent.Denominator;
                }
            }
        }
        if (tempo === 0)
            tempo = 500000;
        if (numer === 0) {
            numer = 4;
            denom = 4;
        }
        this.timesig = new TimeSignature(numer, denom, this.quarternote, tempo);
    }
    readTrack(file) {
        const result = [];
        let starttime = 0;
        const id = file.ReadAscii(4);
        if (id !== 'MTrk') {
            throw new Error(`MidiFile: Bad MTrk header at offset ${file.GetOffset() - 4}`);
        }
        const tracklen = file.ReadInt();
        const trackend = tracklen + file.GetOffset();
        let eventflag = 0;
        while (file.GetOffset() < trackend) {
            let deltatime;
            let peekevent;
            try {
                deltatime = file.ReadVarlen();
                starttime += deltatime;
                peekevent = file.Peek();
            }
            catch (_e) {
                return result;
            }
            const mevent = new MidiEvent();
            result.push(mevent);
            mevent.DeltaTime = deltatime;
            mevent.StartTime = starttime;
            // If the top bit is set, this byte is an event flag
            if (peekevent >= 0x80) {
                mevent.HasEventflag = true;
                eventflag = file.ReadByte();
            }
            if (eventflag >= EventNoteOn && eventflag < EventNoteOn + 16) {
                mevent.EventFlag = EventNoteOn;
                mevent.Channel = eventflag - EventNoteOn;
                mevent.Notenumber = file.ReadByte();
                mevent.Velocity = file.ReadByte();
            }
            else if (eventflag >= EventNoteOff && eventflag < EventNoteOff + 16) {
                mevent.EventFlag = EventNoteOff;
                mevent.Channel = eventflag - EventNoteOff;
                mevent.Notenumber = file.ReadByte();
                mevent.Velocity = file.ReadByte();
            }
            else if (eventflag >= EventKeyPressure && eventflag < EventKeyPressure + 16) {
                mevent.EventFlag = EventKeyPressure;
                mevent.Channel = eventflag - EventKeyPressure;
                mevent.Notenumber = file.ReadByte();
                mevent.KeyPressure = file.ReadByte();
            }
            else if (eventflag >= EventControlChange && eventflag < EventControlChange + 16) {
                mevent.EventFlag = EventControlChange;
                mevent.Channel = eventflag - EventControlChange;
                mevent.ControlNum = file.ReadByte();
                mevent.ControlValue = file.ReadByte();
            }
            else if (eventflag >= EventProgramChange && eventflag < EventProgramChange + 16) {
                mevent.EventFlag = EventProgramChange;
                mevent.Channel = eventflag - EventProgramChange;
                mevent.Instrument = file.ReadByte();
            }
            else if (eventflag >= EventChannelPressure && eventflag < EventChannelPressure + 16) {
                mevent.EventFlag = EventChannelPressure;
                mevent.Channel = eventflag - EventChannelPressure;
                mevent.ChanPressure = file.ReadByte();
            }
            else if (eventflag >= EventPitchBend && eventflag < EventPitchBend + 16) {
                mevent.EventFlag = EventPitchBend;
                mevent.Channel = eventflag - EventPitchBend;
                mevent.PitchBend = file.ReadShort();
            }
            else if (eventflag === SysexEvent1) {
                mevent.EventFlag = SysexEvent1;
                mevent.Metalength = file.ReadVarlen();
                mevent.Value = file.ReadBytes(mevent.Metalength);
            }
            else if (eventflag === SysexEvent2) {
                mevent.EventFlag = SysexEvent2;
                mevent.Metalength = file.ReadVarlen();
                mevent.Value = file.ReadBytes(mevent.Metalength);
            }
            else if (eventflag === MetaEvent) {
                mevent.EventFlag = MetaEvent;
                mevent.Metaevent = file.ReadByte();
                mevent.Metalength = file.ReadVarlen();
                mevent.Value = file.ReadBytes(mevent.Metalength);
                if (mevent.Metaevent === MetaEventTimeSignature) {
                    if (mevent.Metalength < 2) {
                        throw new Error(`MidiFile: Meta Event Time Signature len == ${mevent.Metalength} != 4`);
                    }
                    mevent.Numerator = mevent.Value[0];
                    mevent.Denominator = Math.pow(2, mevent.Value[1]);
                }
                else if (mevent.Metaevent === MetaEventTempo) {
                    if (mevent.Metalength !== 3) {
                        throw new Error(`MidiFile: Meta Event Tempo len == ${mevent.Metalength} != 3`);
                    }
                    mevent.Tempo =
                        ((mevent.Value[0] & 0xff) << 16) |
                            ((mevent.Value[1] & 0xff) << 8) |
                            (mevent.Value[2] & 0xff);
                }
                // MetaEventEndOfTrack – nothing extra to read
            }
            else {
                throw new Error(`MidiFile: Unknown event 0x${eventflag.toString(16)} at offset ${file.GetOffset() - 1}`);
            }
        }
        return result;
    }
    // ---- Static helpers ----------------------------------------------------
    static HasMultipleChannels(track) {
        const notes = track.getNotes();
        if (notes.length === 0)
            return false;
        const channel = notes[0].getChannel();
        for (const note of notes) {
            if (note.getChannel() !== channel)
                return true;
        }
        return false;
    }
    /** Write a variable-length integer into buf at offset; return bytes written. */
    static VarlenToBytes(num, buf, offset) {
        const b1 = (num >> 21) & 0x7f;
        const b2 = (num >> 14) & 0x7f;
        const b3 = (num >> 7) & 0x7f;
        const b4 = num & 0x7f;
        if (b1 > 0) {
            buf[offset] = b1 | 0x80;
            buf[offset + 1] = b2 | 0x80;
            buf[offset + 2] = b3 | 0x80;
            buf[offset + 3] = b4;
            return 4;
        }
        else if (b2 > 0) {
            buf[offset] = b2 | 0x80;
            buf[offset + 1] = b3 | 0x80;
            buf[offset + 2] = b4;
            return 3;
        }
        else if (b3 > 0) {
            buf[offset] = b3 | 0x80;
            buf[offset + 1] = b4;
            return 2;
        }
        else {
            buf[offset] = b4;
            return 1;
        }
    }
    static intToBytes(value, data, offset) {
        data[offset] = (value >>> 24) & 0xff;
        data[offset + 1] = (value >>> 16) & 0xff;
        data[offset + 2] = (value >>> 8) & 0xff;
        data[offset + 3] = value & 0xff;
    }
    static getTrackLength(events) {
        let len = 0;
        const buf = new Uint8Array(16);
        for (const mevent of events) {
            len += MidiFile.VarlenToBytes(mevent.DeltaTime, buf, 0);
            len += 1; // eventflag byte
            switch (mevent.EventFlag) {
                case EventNoteOn:
                case EventNoteOff:
                case EventKeyPressure:
                case EventControlChange:
                case EventPitchBend:
                    len += 2;
                    break;
                case EventProgramChange:
                case EventChannelPressure:
                    len += 1;
                    break;
                case SysexEvent1:
                case SysexEvent2:
                    len += MidiFile.VarlenToBytes(mevent.Metalength, buf, 0);
                    len += mevent.Metalength;
                    break;
                case MetaEvent:
                    len += 1; // metaevent byte
                    len += MidiFile.VarlenToBytes(mevent.Metalength, buf, 0);
                    len += mevent.Metalength;
                    break;
                default:
                    break;
            }
        }
        return len;
    }
    /**
     * Serialize the given event lists to a MIDI binary Uint8Array suitable for playback.
     */
    static writeEvents(allevents, trackmode, quarter) {
        // First pass: compute total size
        const buf = new Uint8Array(16);
        let totalSize = 14; // MThd (4) + len(4) + mode(2) + numtracks(2) + quarter(2)
        for (const list of allevents) {
            totalSize += 8; // MTrk header + length field
            totalSize += MidiFile.getTrackLength(list);
        }
        const out = new Uint8Array(totalSize);
        let pos = 0;
        // MThd header
        out[pos++] = 0x4d;
        out[pos++] = 0x54;
        out[pos++] = 0x68;
        out[pos++] = 0x64; // 'MThd'
        MidiFile.intToBytes(6, out, pos);
        pos += 4;
        out[pos++] = (trackmode >> 8) & 0xff;
        out[pos++] = trackmode & 0xff;
        out[pos++] = 0;
        out[pos++] = allevents.length & 0xff;
        out[pos++] = (quarter >> 8) & 0xff;
        out[pos++] = quarter & 0xff;
        for (const list of allevents) {
            // MTrk header
            out[pos++] = 0x4d;
            out[pos++] = 0x54;
            out[pos++] = 0x72;
            out[pos++] = 0x6b; // 'MTrk'
            const trackLen = MidiFile.getTrackLength(list);
            MidiFile.intToBytes(trackLen, out, pos);
            pos += 4;
            for (const mevent of list) {
                const varlen = MidiFile.VarlenToBytes(mevent.DeltaTime, buf, 0);
                for (let i = 0; i < varlen; i++)
                    out[pos++] = buf[i];
                // Event flag byte
                if (mevent.EventFlag === SysexEvent1 ||
                    mevent.EventFlag === SysexEvent2 ||
                    mevent.EventFlag === MetaEvent) {
                    out[pos++] = mevent.EventFlag & 0xff;
                }
                else {
                    out[pos++] = (mevent.EventFlag + mevent.Channel) & 0xff;
                }
                if (mevent.EventFlag === EventNoteOn || mevent.EventFlag === EventNoteOff) {
                    out[pos++] = mevent.Notenumber & 0xff;
                    out[pos++] = mevent.Velocity & 0xff;
                }
                else if (mevent.EventFlag === EventKeyPressure) {
                    out[pos++] = mevent.Notenumber & 0xff;
                    out[pos++] = mevent.KeyPressure & 0xff;
                }
                else if (mevent.EventFlag === EventControlChange) {
                    out[pos++] = mevent.ControlNum & 0xff;
                    out[pos++] = mevent.ControlValue & 0xff;
                }
                else if (mevent.EventFlag === EventProgramChange) {
                    out[pos++] = mevent.Instrument & 0xff;
                }
                else if (mevent.EventFlag === EventChannelPressure) {
                    out[pos++] = mevent.ChanPressure & 0xff;
                }
                else if (mevent.EventFlag === EventPitchBend) {
                    out[pos++] = (mevent.PitchBend >> 8) & 0xff;
                    out[pos++] = mevent.PitchBend & 0xff;
                }
                else if (mevent.EventFlag === SysexEvent1 || mevent.EventFlag === SysexEvent2) {
                    const vl = MidiFile.VarlenToBytes(mevent.Metalength, buf, 0);
                    for (let i = 0; i < vl; i++)
                        out[pos++] = buf[i];
                    for (let i = 0; i < mevent.Value.length; i++)
                        out[pos++] = mevent.Value[i];
                }
                else if (mevent.EventFlag === MetaEvent && mevent.Metaevent === MetaEventTempo) {
                    out[pos++] = mevent.Metaevent & 0xff;
                    out[pos++] = 3;
                    out[pos++] = (mevent.Tempo >> 16) & 0xff;
                    out[pos++] = (mevent.Tempo >> 8) & 0xff;
                    out[pos++] = mevent.Tempo & 0xff;
                }
                else if (mevent.EventFlag === MetaEvent) {
                    out[pos++] = mevent.Metaevent & 0xff;
                    const vl = MidiFile.VarlenToBytes(mevent.Metalength, buf, 0);
                    for (let i = 0; i < vl; i++)
                        out[pos++] = buf[i];
                    for (let i = 0; i < mevent.Value.length; i++)
                        out[pos++] = mevent.Value[i];
                }
            }
        }
        return out;
    }
    static createTempoEvent(tempo) {
        const mevent = new MidiEvent();
        mevent.DeltaTime = 0;
        mevent.StartTime = 0;
        mevent.HasEventflag = true;
        mevent.EventFlag = MetaEvent;
        mevent.Metaevent = MetaEventTempo;
        mevent.Metalength = 3;
        mevent.Tempo = tempo;
        return mevent;
    }
    static updateControlChange(newevents, changeEvent) {
        for (const mevent of newevents) {
            if (mevent.EventFlag === changeEvent.EventFlag &&
                mevent.Channel === changeEvent.Channel &&
                mevent.ControlNum === changeEvent.ControlNum) {
                mevent.ControlValue = changeEvent.ControlValue;
                return;
            }
        }
        newevents.push(changeEvent);
    }
    static updateProgramChange(newevents, changeEvent) {
        for (const mevent of newevents) {
            if (mevent.EventFlag === EventProgramChange && mevent.Channel === changeEvent.Channel) {
                mevent.Instrument = changeEvent.Instrument;
                return;
            }
        }
        newevents.push(changeEvent);
    }
    static startAtPauseTime(list, pauseTime) {
        const newlist = [];
        for (const events of list) {
            const newevents = [];
            newlist.push(newevents);
            let foundEventAfterPause = false;
            for (const mevent of events) {
                if (mevent.StartTime < pauseTime) {
                    if (mevent.EventFlag === EventNoteOn ||
                        mevent.EventFlag === EventNoteOff ||
                        mevent.EventFlag === SysexEvent1 ||
                        mevent.EventFlag === SysexEvent2) {
                        // skip
                    }
                    else if (mevent.EventFlag === EventControlChange) {
                        mevent.DeltaTime = 0;
                        MidiFile.updateControlChange(newevents, mevent);
                    }
                    else if (mevent.EventFlag === EventProgramChange) {
                        mevent.DeltaTime = 0;
                        MidiFile.updateProgramChange(newevents, mevent);
                    }
                    else {
                        mevent.DeltaTime = 0;
                        newevents.push(mevent);
                    }
                }
                else if (!foundEventAfterPause) {
                    mevent.DeltaTime = mevent.StartTime - pauseTime;
                    newevents.push(mevent);
                    foundEventAfterPause = true;
                }
                else {
                    newevents.push(mevent);
                }
            }
        }
        return newlist;
    }
    // ---- ChangeSound -------------------------------------------------------
    /**
     * Apply the given options to the MIDI events and return a Uint8Array
     * containing a valid MIDI file that can be played back.
     */
    ChangeSound(options) {
        const newevents = options ? this.applyOptionsToEvents(options) : this.allevents;
        return MidiFile.writeEvents(newevents, this.trackmode, this.quarternote);
    }
    applyOptionsToEvents(options) {
        if (this.trackPerChannel) {
            return this.applyOptionsPerChannel(options);
        }
        const numTracks = this.allevents.length;
        const instruments = new Array(numTracks).fill(0);
        const keeptracks = new Array(numTracks).fill(true);
        const trackVolume = new Array(numTracks).fill(100);
        for (let tracknum = 0; tracknum < this.tracks.length; tracknum++) {
            const track = this.tracks[tracknum];
            const realtrack = track.trackNumber();
            instruments[realtrack] = options.instruments[tracknum] ?? 0;
            if (options.mute[tracknum]) {
                keeptracks[realtrack] = false;
            }
            if (options.volume != null && tracknum < options.volume.length) {
                trackVolume[realtrack] = options.volume[tracknum];
            }
        }
        const newevents = [];
        for (let tracknum = 0; tracknum < numTracks; tracknum++) {
            const original = this.allevents[tracknum];
            const filtered = [];
            let channel = -1;
            let origInstrument = 0;
            let foundPC = false;
            let endOfTrackEvent = null;
            for (const e of original) {
                if (channel < 0 &&
                    (e.EventFlag === EventNoteOn ||
                        e.EventFlag === EventNoteOff ||
                        e.EventFlag === EventProgramChange ||
                        e.EventFlag === EventControlChange)) {
                    channel = e.Channel;
                }
                if (!foundPC && e.EventFlag === EventProgramChange) {
                    origInstrument = e.Instrument;
                    foundPC = true;
                }
                if (e.EventFlag === MetaEvent && e.Metaevent === MetaEventEndOfTrack) {
                    endOfTrackEvent = e;
                }
            }
            filtered.push(MidiFile.createTempoEvent(options.tempo));
            if (channel >= 0) {
                const instrument = options.useDefaultInstruments
                    ? origInstrument
                    : (instruments[tracknum] ?? 0);
                const pc = new MidiEvent();
                pc.DeltaTime = 0;
                pc.StartTime = 0;
                pc.HasEventflag = true;
                pc.EventFlag = EventProgramChange;
                pc.Channel = channel;
                pc.Instrument = instrument;
                filtered.push(pc);
            }
            const vol = trackVolume[tracknum];
            let prevST = 0;
            for (const e of original) {
                if (e.EventFlag !== EventNoteOn && e.EventFlag !== EventNoteOff)
                    continue;
                if (!keeptracks[tracknum])
                    continue;
                const copy = e.Clone();
                let num = copy.Notenumber + options.transpose;
                if (num < 0)
                    num = 0;
                if (num > 127)
                    num = 127;
                copy.Notenumber = num;
                copy.Velocity = Math.min(127, Math.floor((copy.Velocity * vol) / 100));
                copy.DeltaTime = copy.StartTime - prevST;
                prevST = copy.StartTime;
                filtered.push(copy);
            }
            const eot = new MidiEvent();
            eot.DeltaTime = endOfTrackEvent != null
                ? Math.max(0, endOfTrackEvent.StartTime - prevST)
                : 0;
            eot.StartTime = endOfTrackEvent != null ? endOfTrackEvent.StartTime : prevST;
            eot.HasEventflag = true;
            eot.EventFlag = MetaEvent;
            eot.Metaevent = MetaEventEndOfTrack;
            eot.Metalength = 0;
            eot.Value = new Uint8Array(0);
            filtered.push(eot);
            newevents.push(filtered);
        }
        let result = newevents;
        if (options.pauseTime !== 0) {
            result = MidiFile.startAtPauseTime(result, options.pauseTime);
        }
        // Remove muted tracks
        return result.filter((_, i) => keeptracks[i]);
    }
    applyOptionsPerChannel(options) {
        const instruments = new Array(16).fill(0);
        const keepchannel = new Array(16).fill(true);
        const channelVolume = new Array(16).fill(100);
        for (let tracknum = 0; tracknum < this.tracks.length; tracknum++) {
            const track = this.tracks[tracknum];
            const notes = track.getNotes();
            const channel = notes[0].getChannel();
            instruments[channel] = options.instruments[tracknum] ?? 0;
            if (options.mute[tracknum]) {
                keepchannel[channel] = false;
            }
            if (options.volume != null && tracknum < options.volume.length) {
                channelVolume[channel] = options.volume[tracknum];
            }
        }
        const newevents = [];
        for (const original of this.allevents) {
            const filtered = [];
            let trackChannel = -1;
            let origInstrument = 0;
            let foundPC = false;
            let endOfTrackEvent = null;
            for (const e of original) {
                if (trackChannel < 0 &&
                    (e.EventFlag === EventNoteOn ||
                        e.EventFlag === EventNoteOff ||
                        e.EventFlag === EventProgramChange ||
                        e.EventFlag === EventControlChange)) {
                    trackChannel = e.Channel;
                }
                if (!foundPC && e.EventFlag === EventProgramChange) {
                    origInstrument = e.Instrument;
                    foundPC = true;
                }
                if (e.EventFlag === MetaEvent && e.Metaevent === MetaEventEndOfTrack) {
                    endOfTrackEvent = e;
                }
            }
            filtered.push(MidiFile.createTempoEvent(options.tempo));
            if (trackChannel >= 0) {
                const instrument = options.useDefaultInstruments
                    ? origInstrument
                    : (instruments[trackChannel] ?? 0);
                const pc = new MidiEvent();
                pc.DeltaTime = 0;
                pc.StartTime = 0;
                pc.HasEventflag = true;
                pc.EventFlag = EventProgramChange;
                pc.Channel = trackChannel;
                pc.Instrument = instrument;
                filtered.push(pc);
            }
            const vol = trackChannel >= 0 ? channelVolume[trackChannel] : 100;
            const keep = trackChannel < 0 || keepchannel[trackChannel];
            let prevST = 0;
            for (const e of original) {
                if (e.EventFlag !== EventNoteOn && e.EventFlag !== EventNoteOff)
                    continue;
                if (!keep)
                    continue;
                const copy = e.Clone();
                let num = copy.Notenumber + options.transpose;
                if (num < 0)
                    num = 0;
                if (num > 127)
                    num = 127;
                copy.Notenumber = num;
                copy.Velocity = Math.min(127, Math.floor((copy.Velocity * vol) / 100));
                copy.DeltaTime = copy.StartTime - prevST;
                prevST = copy.StartTime;
                filtered.push(copy);
            }
            const eot = new MidiEvent();
            eot.DeltaTime = endOfTrackEvent != null
                ? Math.max(0, endOfTrackEvent.StartTime - prevST)
                : 0;
            eot.StartTime = endOfTrackEvent != null ? endOfTrackEvent.StartTime : prevST;
            eot.HasEventflag = true;
            eot.EventFlag = MetaEvent;
            eot.Metaevent = MetaEventEndOfTrack;
            eot.Metalength = 0;
            eot.Value = new Uint8Array(0);
            filtered.push(eot);
            newevents.push(filtered);
        }
        if (options.pauseTime !== 0) {
            return MidiFile.startAtPauseTime(newevents, options.pauseTime);
        }
        return newevents;
    }
    // ---- ChangeMidiNotes ---------------------------------------------------
    ChangeMidiNotes(options) {
        const newtracks = [];
        const trackMapping = [];
        for (let track = 0; track < this.tracks.length; track++) {
            if (options.tracks[track]) {
                newtracks.push(this.tracks[track].Clone());
                trackMapping.push(track);
            }
        }
        let time = this.timesig;
        if (options.time != null) {
            time = options.time;
        }
        MidiFile.RoundStartTimes(newtracks, options.combineInterval, this.timesig);
        MidiFile.RoundDurations(newtracks, time.getQuarter());
        if (options.trackOctaveShift != null) {
            for (let i = 0; i < newtracks.length && i < trackMapping.length; i++) {
                const origTrack = trackMapping[i];
                if (origTrack < options.trackOctaveShift.length &&
                    options.trackOctaveShift[origTrack] !== 0) {
                    const shift = options.trackOctaveShift[origTrack] * 12;
                    for (const note of newtracks[i].getNotes()) {
                        let newNum = note.getNumber() + shift;
                        if (newNum < 0)
                            newNum = 0;
                        if (newNum > 127)
                            newNum = 127;
                        note.setNumber(newNum);
                    }
                }
            }
        }
        if (options.twoStaffs) {
            const combined = MidiFile.CombineToTwoTracks(newtracks, this.timesig.getMeasure());
            newtracks.length = 0;
            newtracks.push(...combined);
        }
        if (options.shifttime !== 0) {
            MidiFile.ShiftTime(newtracks, options.shifttime);
        }
        if (options.transpose !== 0) {
            MidiFile.Transpose(newtracks, options.transpose);
        }
        return newtracks;
    }
    // ---- Static track-manipulation methods ---------------------------------
    static ShiftTime(tracks, amount) {
        for (const track of tracks) {
            for (const note of track.getNotes()) {
                note.setStartTime(note.getStartTime() + amount);
            }
        }
    }
    static Transpose(tracks, amount) {
        for (const track of tracks) {
            for (const note of track.getNotes()) {
                let n = note.getNumber() + amount;
                if (n < 0)
                    n = 0;
                note.setNumber(n);
            }
        }
    }
    static findHighLowNotes(notes, measurelen, startindex, starttime, endtime, pair) {
        let i = startindex;
        if (starttime + measurelen < endtime) {
            endtime = starttime + measurelen;
        }
        while (i < notes.length && notes[i].getStartTime() < endtime) {
            if (notes[i].getEndTime() < starttime) {
                i++;
                continue;
            }
            if (notes[i].getStartTime() + measurelen < starttime) {
                i++;
                continue;
            }
            if (pair.high < notes[i].getNumber())
                pair.high = notes[i].getNumber();
            if (pair.low > notes[i].getNumber())
                pair.low = notes[i].getNumber();
            i++;
        }
    }
    static findExactHighLowNotes(notes, startindex, starttime, pair) {
        let i = startindex;
        while (i < notes.length && notes[i].getStartTime() < starttime)
            i++;
        while (i < notes.length && notes[i].getStartTime() === starttime) {
            if (pair.high < notes[i].getNumber())
                pair.high = notes[i].getNumber();
            if (pair.low > notes[i].getNumber())
                pair.low = notes[i].getNumber();
            i++;
        }
    }
    static SplitTrack(track, measurelen) {
        const notes = track.getNotes();
        const count = notes.length;
        const top = new MidiTrack(1);
        const bottom = new MidiTrack(2);
        const result = [top, bottom];
        if (count === 0)
            return result;
        let prevhigh = 76; // E5
        let prevlow = 45; // A3
        let startindex = 0;
        for (const note of notes) {
            const number = note.getNumber();
            while (notes[startindex].getEndTime() < note.getStartTime()) {
                startindex++;
            }
            const pair = { high: number, low: number };
            const pairExact = { high: number, low: number };
            MidiFile.findHighLowNotes(notes, measurelen, startindex, note.getStartTime(), note.getEndTime(), pair);
            MidiFile.findExactHighLowNotes(notes, startindex, note.getStartTime(), pairExact);
            const high = pair.high;
            const low = pair.low;
            const highExact = pairExact.high;
            const lowExact = pairExact.low;
            if (highExact - number > 12 || number - lowExact > 12) {
                if (highExact - number <= number - lowExact)
                    top.AddNote(note);
                else
                    bottom.AddNote(note);
            }
            else if (high - number > 12 || number - low > 12) {
                if (high - number <= number - low)
                    top.AddNote(note);
                else
                    bottom.AddNote(note);
            }
            else if (highExact - lowExact > 12) {
                if (highExact - number <= number - lowExact)
                    top.AddNote(note);
                else
                    bottom.AddNote(note);
            }
            else if (high - low > 12) {
                if (high - number <= number - low)
                    top.AddNote(note);
                else
                    bottom.AddNote(note);
            }
            else {
                if (prevhigh - number <= number - prevlow)
                    top.AddNote(note);
                else
                    bottom.AddNote(note);
            }
            if (high - low > 12) {
                prevhigh = high;
                prevlow = low;
            }
        }
        top.getNotes().sort(MidiNote.compare);
        bottom.getNotes().sort(MidiNote.compare);
        return result;
    }
    static CombineToSingleTrack(tracks) {
        const result = new MidiTrack(1);
        if (tracks.length === 0)
            return result;
        if (tracks.length === 1) {
            for (const note of tracks[0].getNotes())
                result.AddNote(note);
            return result;
        }
        const noteindex = new Array(tracks.length).fill(0);
        const notecount = tracks.map(t => t.getNotes().length);
        let prevnote = null;
        while (true) {
            let lowestnote = null;
            let lowestTrack = -1;
            for (let tracknum = 0; tracknum < tracks.length; tracknum++) {
                if (noteindex[tracknum] >= notecount[tracknum])
                    continue;
                const note = tracks[tracknum].getNotes()[noteindex[tracknum]];
                if (lowestnote === null) {
                    lowestnote = note;
                    lowestTrack = tracknum;
                }
                else if (note.getStartTime() < lowestnote.getStartTime()) {
                    lowestnote = note;
                    lowestTrack = tracknum;
                }
                else if (note.getStartTime() === lowestnote.getStartTime() &&
                    note.getNumber() < lowestnote.getNumber()) {
                    lowestnote = note;
                    lowestTrack = tracknum;
                }
            }
            if (lowestnote === null)
                break;
            noteindex[lowestTrack]++;
            if (prevnote !== null &&
                prevnote.getStartTime() === lowestnote.getStartTime() &&
                prevnote.getNumber() === lowestnote.getNumber()) {
                if (lowestnote.getDuration() > prevnote.getDuration()) {
                    prevnote.setDuration(lowestnote.getDuration());
                }
            }
            else {
                result.AddNote(lowestnote);
                prevnote = lowestnote;
            }
        }
        return result;
    }
    static CombineToTwoTracks(tracks, measurelen) {
        const single = MidiFile.CombineToSingleTrack(tracks);
        const result = MidiFile.SplitTrack(single, measurelen);
        const lyrics = [];
        for (const track of tracks) {
            const tl = track.getLyrics();
            if (tl != null)
                lyrics.push(...tl);
        }
        if (lyrics.length > 0) {
            lyrics.sort(MidiEvent.compare);
            result[0].setLyrics(lyrics);
        }
        return result;
    }
    static CheckStartTimes(tracks) {
        for (const track of tracks) {
            let prevtime = -1;
            for (const note of track.getNotes()) {
                if (note.getStartTime() < prevtime) {
                    throw new Error('MidiFile: Internal parsing error – notes not in order');
                }
                prevtime = note.getStartTime();
            }
        }
    }
    static RoundStartTimes(tracks, millisec, time) {
        const starttimes = new ListInt();
        for (const track of tracks) {
            for (const note of track.getNotes()) {
                starttimes.add(note.getStartTime());
            }
        }
        starttimes.sort();
        const interval = Math.floor((time.getQuarter() * millisec * 1000) / time.getTempo());
        for (let i = 0; i < starttimes.size() - 1; i++) {
            if (starttimes.get(i + 1) - starttimes.get(i) <= interval) {
                starttimes.set(i + 1, starttimes.get(i));
            }
        }
        MidiFile.CheckStartTimes(tracks);
        for (const track of tracks) {
            let i = 0;
            for (const note of track.getNotes()) {
                while (i < starttimes.size() && note.getStartTime() - interval > starttimes.get(i)) {
                    i++;
                }
                if (i < starttimes.size() &&
                    note.getStartTime() > starttimes.get(i) &&
                    note.getStartTime() - starttimes.get(i) <= interval) {
                    note.setStartTime(starttimes.get(i));
                }
            }
            track.getNotes().sort(MidiNote.compare);
        }
    }
    static RoundDurations(tracks, quarternote) {
        for (const track of tracks) {
            let prevNote = null;
            for (let i = 0; i < track.getNotes().length - 1; i++) {
                const note1 = track.getNotes()[i];
                if (prevNote === null)
                    prevNote = note1;
                let note2 = note1;
                for (let j = i + 1; j < track.getNotes().length; j++) {
                    note2 = track.getNotes()[j];
                    if (note1.getStartTime() < note2.getStartTime())
                        break;
                }
                const maxduration = note2.getStartTime() - note1.getStartTime();
                let dur = 0;
                if (quarternote <= maxduration)
                    dur = quarternote;
                else if (quarternote / 2 <= maxduration)
                    dur = Math.floor(quarternote / 2);
                else if (quarternote / 3 <= maxduration)
                    dur = Math.floor(quarternote / 3);
                else if (quarternote / 4 <= maxduration)
                    dur = Math.floor(quarternote / 4);
                if (dur < note1.getDuration())
                    dur = note1.getDuration();
                if (prevNote.getStartTime() + prevNote.getDuration() === note1.getStartTime() &&
                    prevNote.getDuration() === note1.getDuration()) {
                    dur = note1.getDuration();
                }
                if (dur > note1.getDuration()) {
                    note1.setSoundingDuration(note1.getDuration());
                }
                note1.setDuration(dur);
                if (track.getNotes()[i + 1].getStartTime() !== note1.getStartTime()) {
                    prevNote = note1;
                }
            }
        }
    }
    static SplitChannels(origtrack, events) {
        const channelInstruments = new Array(16).fill(0);
        for (const mevent of events) {
            if (mevent.EventFlag === EventProgramChange) {
                channelInstruments[mevent.Channel] = mevent.Instrument;
            }
        }
        channelInstruments[9] = 128; // Percussion
        const result = [];
        for (const note of origtrack.getNotes()) {
            let foundchannel = false;
            for (const track of result) {
                if (note.getChannel() === track.getNotes()[0].getChannel()) {
                    foundchannel = true;
                    track.AddNote(note);
                }
            }
            if (!foundchannel) {
                const track = new MidiTrack(result.length + 1);
                track.AddNote(note);
                track.setInstrument(channelInstruments[note.getChannel()]);
                result.push(track);
            }
        }
        const lyrics = origtrack.getLyrics();
        if (lyrics != null) {
            for (const lyricEvent of lyrics) {
                for (const track of result) {
                    if (lyricEvent.Channel === track.getNotes()[0].getChannel()) {
                        track.AddLyric(lyricEvent);
                    }
                }
            }
        }
        return result;
    }
    // ---- Miscellaneous public methods --------------------------------------
    GuessMeasureLength() {
        const result = [];
        const pulsesPerSecond = Math.floor((1000000.0 / this.timesig.getTempo()) * this.timesig.getQuarter());
        const minmeasure = Math.floor(pulsesPerSecond / 2);
        const maxmeasure = pulsesPerSecond * 4;
        let firstnote = this.timesig.getMeasure() * 5;
        for (const track of this.tracks) {
            const t = track.getNotes()[0].getStartTime();
            if (firstnote > t)
                firstnote = t;
        }
        const interval = Math.floor((this.timesig.getQuarter() * 60000) / this.timesig.getTempo());
        for (const track of this.tracks) {
            let prevtime = 0;
            for (const note of track.getNotes()) {
                if (note.getStartTime() - prevtime <= interval)
                    continue;
                prevtime = note.getStartTime();
                let timeFromFirst = note.getStartTime() - firstnote;
                timeFromFirst = Math.floor(timeFromFirst / 4) * 4;
                if (timeFromFirst < minmeasure)
                    continue;
                if (timeFromFirst > maxmeasure)
                    break;
                if (!result.includes(timeFromFirst)) {
                    result.push(timeFromFirst);
                }
            }
        }
        result.sort((a, b) => a - b);
        return result;
    }
    EndTime() {
        let lastStart = 0;
        for (const track of this.tracks) {
            if (track.getNotes().length === 0)
                continue;
            const last = track.getNotes()[track.getNotes().length - 1].getStartTime();
            if (last > lastStart)
                lastStart = last;
        }
        return lastStart;
    }
    hasLyrics() {
        for (const track of this.tracks) {
            if (track.getLyrics() != null)
                return true;
        }
        return false;
    }
    static hasMidiHeader(data) {
        if (data.length < 4)
            return false;
        return (data[0] === 0x4d && // 'M'
            data[1] === 0x54 && // 'T'
            data[2] === 0x68 && // 'h'
            data[3] === 0x64 // 'd'
        );
    }
    toString() {
        let s = `MidiFile tracks=${this.tracks.length} quarter=${this.quarternote}\n`;
        s += this.timesig.toString() + '\n';
        for (const track of this.tracks) {
            s += track.toString();
        }
        return s;
    }
}
