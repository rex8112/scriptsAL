export class Point {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

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

  static fromTwoPoints(a: Point, b: Point): Line {
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