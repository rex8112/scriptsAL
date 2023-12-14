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

  static fromEntity(pos: {x: number, y: number}): Vector {
    return new Vector(pos.x, pos.y);
  }

  static fromList(li: [number, number]): Vector {
    return new Vector(li[0], li[1]);
  }

  isEqual(other: Vector) {
    return this.x === other.x && this.y === other.y;
  }

  /**
   * Adds a number to each coordinate in the vector.
   * @param a Number to add.
   * @returns New vector with added values.
   */
  add(a: number): Vector {
    return new Vector(this.x + a, this.y + a);
  }
  
  /**
   * Adds two vectors together.
   * @param other Vector to add.
   * @returns New vector with added values.
   */
  addVector(other: Vector): Vector {
    return new Vector(this.x + other.x, this.y + other.y);
  }


  multiply(m: number): Vector {
    return new Vector(this.x * m, this.y * m);
  }

  multiplyVector(other: Vector): Vector {
    return new Vector(this.x * other.x, this.y * other.y);
  }

  /**
   * Return the same vector but rotated to be perpendicular.
   * @param right Should this point right from the point?
   * @returns A new vector that is perpendicular.
   */
  perpendicular(right: boolean = false): Vector {
    let v = new Vector(this.y, this.x);
    if (right) {
      v.x *= -1;
    } else {
      v.y *= -1;
    }
    return v;
  }

  /**
   * Get the squared distance between vectors. If you need the exact distance either
   * get the square root of this number or use `Vector.distanceFrom()`.
   * @param target The vector to get the distance from.
   * @returns The squared distance betwwen vectors.
   */
  distanceFromSqr(target: Vector): number {
    let x = Math.pow(target.x - this.x, 2);
    let y = Math.pow(target.y - this.y, 2);
    return x + y;
  }

  /**
   * Get the distance between this and the target vector.
   * 
   * This method uses square root to get the accurate distance.
   * This is a computationally heavy operation. If you're using distances
   * just to compare and find the closest/furthest, consider using 
   * `Vector.distanceFromSqr()` for quicker comparisons.
   * @param target The vector to get the distance from.
   * @returns The distance between vectors.
   */
  distanceFrom(target: Vector): number {
    return Math.sqrt(this.distanceFromSqr(target));
  }

  /**
   * Get a normalize vector keeping the direction from this pointing towards the target.
   * @param target the vector to point towards.
   * @returns A normalized vector.
   */
  vectorTowards(target: Vector): Vector {
    let v = new Vector(target.x - this.x, target.y - this.y);
    let length = Math.sqrt(Math.pow(v.x, 2) + Math.pow(v.y, 2));
    return new Vector(v.x / length, v.y / length);
  }

  /**
   * Get a point that's distance away from this towards the target.
   * @param target The vector to move towards.
   * @param distance How far you want to be from this in the direction of the target.
   * @returns The new vector.
   */
  pointTowards(target: Vector, distance: number): Vector {
    let u = this.vectorTowards(target);
    let d = u.multiply(distance);
    return this.addVector(d);
  }
}