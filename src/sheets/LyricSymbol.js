/** A lyric to display at a specific start time. */
export class LyricSymbol {
    starttime;
    text;
    x = 0;
    constructor(starttime, text) {
        this.starttime = starttime;
        this.text = text;
    }
    getStartTime() { return this.starttime; }
    setStartTime(value) { this.starttime = value; }
    getText() { return this.text; }
    setText(value) { this.text = value; }
    getX() { return this.x; }
    setX(value) { this.x = value; }
    getMinWidth() {
        const widthPerChar = 10.0 * 2.0 / 3.0;
        let width = this.text.length * widthPerChar;
        if (this.text.includes('i'))
            width -= widthPerChar / 2;
        if (this.text.includes('j'))
            width -= widthPerChar / 2;
        if (this.text.includes('l'))
            width -= widthPerChar / 2;
        return Math.floor(width);
    }
    toString() {
        return `Lyric start=${this.starttime} x=${this.x} text=${this.text}`;
    }
}
