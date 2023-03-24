import { Entity, MapKey } from "typed-adventureland";
import { Vector } from "./Vector";

export class Location {
  vector: Vector;
  map: MapKey;
  instance: unknown;

  constructor(position: Vector, map: MapKey, instance: unknown = undefined) {
    this.vector = position;
    this.map = map;
    this.instance = instance;
  }

  static fromEntity(ent: Entity) {
    let v = Vector.fromEntity(ent);
    return new Location(v, ent.map, ent.in);
  }

  static fromPosition(pos: {x:number,y:number,map:MapKey,instance?:unknown}) {
    let v = Vector.fromPosition(pos);
    return new Location(v, pos.map, pos.instance);
  }

  asPosition() {
    return {
      x: this.vector.x,
      y: this.vector.y,
      map: this.map,
      instance: this.instance
    }
  }
}