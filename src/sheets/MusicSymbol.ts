export interface MusicSymbol {
  getStartTime(): number;
  getMinWidth(): number;
  getWidth(): number;
  setWidth(value: number): void;
  getAboveStaff(): number;
  getBelowStaff(): number;
  Draw(ctx: CanvasRenderingContext2D, ytop: number): void;
}
