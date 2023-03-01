import { Vector } from "./Vector";

export class Line {
  slope: number;
  intercept: number;

  /**
   * A line following y=mx+b
   * @param m Slope
   * @param b Y Intercept
   */
  constructor(m: number, b: number) {
    this.slope = m;
    this.intercept = b;
  }

  static fromTwoPoints(a: Vector, b: Vector): Line {
    let slope = (b.y - a.y) / (b.x - a.x); // m = rise/run
    let intercept = a.y - (slope * a.x); // b = y-mx
    return new Line(slope, intercept)
  }

  getY(x: number): number {
    return this.slope * x + this.intercept;
  }

  getX(y: number): number {
    return y / this.slope - this.intercept;
  }
}