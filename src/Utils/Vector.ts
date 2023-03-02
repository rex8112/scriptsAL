export class Vector {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  static fromPosition(pos: {x: number, y: number}): Vector {
    return new Vector(pos.x, pos.y);
  }

  static fromRealPosition(pos: {real_x: number, real_y: number}): Vector {
    return new Vector(pos.real_x, pos.real_y);
  }

  static fromList(li: [number, number]): Vector {
    return new Vector(li[0], li[1]);
  }

  add(a: number): Vector {
    return new Vector(this.x + a, this.y + a);
  }
  
  addVector(other: Vector): Vector {
    return new Vector(this.x + other.x, this.y + other.y);
  }

  multiply(m: number): Vector {
    return new Vector(this.x * m, this.y * m);
  }

  multiplyVector(other: Vector): Vector {
    return new Vector(this.x * other.x, this.y * other.y);
  }

  distanceFromSqr(other: Vector): number {
    let x = Math.pow(other.x - this.x, 2);
    let y = Math.pow(other.y - this.y, 2);
    return x + y;
  }

  distanceFrom(other: Vector): number {
    return Math.sqrt(this.distanceFromSqr(other));
  }

  /**
   * Get a point that's distance away from this towards the target.
   * @param target The vector to move towards.
   * @param distance How far you want to be from this in the direction of the target.
   * @returns The new vector.
   */
  pointTowards(target: Vector, distance: number): Vector {
    let v = new Vector(target.x - this.x, target.y - this.y);
    let length = Math.sqrt(Math.pow(v.x, 2) + Math.pow(v.y, 2));
    let u = new Vector(v.x / length, v.y / length);
    let d = u.multiply(distance);
    return this.addVector(d);
  }
}