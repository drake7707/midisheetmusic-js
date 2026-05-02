/** A music symbol that draws nothing; used for alignment. */
export class BlankSymbol {
    starttime;
    width;
    constructor(starttime, width) {
        this.starttime = starttime;
        this.width = width;
    }
    getStartTime() { return this.starttime; }
    getMinWidth() { return 0; }
    getWidth() { return this.width; }
    setWidth(value) { this.width = value; }
    getAboveStaff() { return 0; }
    getBelowStaff() { return 0; }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    Draw(_ctx, _ytop) { }
    toString() {
        return `BlankSymbol starttime=${this.starttime} width=${this.width}`;
    }
}
