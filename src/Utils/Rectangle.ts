import { Vector } from "./Vector";

export default class Rectangle {
  x: number;
  y: number;
  h: number;
  w: number;
  
  constructor(x: number, y: number, h: number, w: number) {
    this.x = x;
    this.y = y;
    this.h = h;
    this.w = w;
  }
  
  getCorners(): [bottomLeft: Vector, topLeft: Vector, topRight: Vector, bottomRight: Vector] {
    let v1 = new Vector(this.x, this.y);
    let v2 = new Vector(this.x, this.y + this.h);
    let v3 = new Vector(this.x + this.w, this.y + this.h);
    let v4 = new Vector(this.x + this.w, this.y);
    return [v1, v2, v3, v4];
  }

  isInside(point: Vector): boolean {
    let xBound = point.x > this.x && point.x < this.x + this.w;
    let yBound = point.y > this.y && point.y < this.y + this.h;
    return xBound && yBound;
  }

  nearestOutside(point: Vector, padding: number = 0): Vector {
    if (!this.isInside(point)) return Vector.fromPosition(point);
    let oppositeCorner = this.getCorners()[2];
    let left = this.x - point.x;
    let right = oppositeCorner.x - point.x;
    let down = this.y - point.y;
    let up = oppositeCorner.y - point.y;
    let x, y;
    if (Math.abs(left) < Math.abs(right)) {
      x = left;
    } else {
      x = right;
    }
    if (Math.abs(down) < Math.abs(up)) {
      y = down;
    } else {
      y = up;
    }

    if (Math.abs(x) < Math.abs(y)) {
      return point.pointTowards(new Vector(point.x + x, point.y), padding + Math.abs(x));
    } else {
      return point.pointTowards(new Vector(point.x, point.y + y), padding + Math.abs(y));
    }
  }

  static fromVectors(corner1: Vector, corner2: Vector): Rectangle {
    let x = Math.min(corner1.x, corner2.x);
    let y = Math.min(corner1.y, corner2.y);
    let w = Math.max(corner1.x, corner2.x) - x;
    let h = Math.max(corner1.y, corner2.y) - y;
    return new Rectangle(x, y, h, w);
  }

  static fromBoundary(x: [number, number, number, number], y: any, x2: any, y2: any): Rectangle;
  static fromBoundary(x: number | [number, number, number, number], y: number, x2: number, y2: number): Rectangle {
    if (typeof x === "object") {
      let tmp = x;
      x = tmp[0];
      y = tmp[1];
      x2 = tmp[2];
      y2 = tmp[3]
    }
    let v1 = new Vector(x, y);
    let v2 = new Vector(x2, y2);
    return this.fromVectors(v1, v2);
  }
}