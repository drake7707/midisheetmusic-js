/** A sorted integer→integer dictionary. */
export class DictInt {
    keys;
    values;
    size;
    lastpos;
    constructor() {
        this.size = 0;
        this.lastpos = 0;
        this.keys = new Array(23).fill(0);
        this.values = new Array(23).fill(0);
    }
    resize() {
        const nc = this.keys.length * 2;
        const nk = new Array(nc).fill(0);
        const nv = new Array(nc).fill(0);
        for (let i = 0; i < this.keys.length; i++) {
            nk[i] = this.keys[i];
            nv[i] = this.values[i];
        }
        this.keys = nk;
        this.values = nv;
    }
    add(key, value) {
        if (this.size === this.keys.length)
            this.resize();
        let pos = this.size - 1;
        while (pos >= 0 && key < this.keys[pos]) {
            this.keys[pos + 1] = this.keys[pos];
            this.values[pos + 1] = this.values[pos];
            pos--;
        }
        this.keys[pos + 1] = key;
        this.values[pos + 1] = value;
        this.size++;
    }
    set(key, value) {
        if (this.contains(key)) {
            this.keys[this.lastpos] = key;
            this.values[this.lastpos] = value;
        }
        else {
            this.add(key, value);
        }
    }
    contains(key) {
        if (this.size === 0)
            return false;
        if (this.lastpos < 0 || this.lastpos >= this.size || key < this.keys[this.lastpos])
            this.lastpos = 0;
        while (this.lastpos < this.size && key > this.keys[this.lastpos])
            this.lastpos++;
        return this.lastpos < this.size && key === this.keys[this.lastpos];
    }
    get(key) {
        return this.contains(key) ? this.values[this.lastpos] : 0;
    }
    count() { return this.size; }
    getKey(index) { return this.keys[index]; }
}
