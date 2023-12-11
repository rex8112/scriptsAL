import { MapName, Entity } from "alclient";
import { Vector } from "./Vector.js";

export default class Location {
  vector: Vector;
  map: MapName;
  instance: unknown;

  constructor(position: Vector, map: MapName, instance: unknown = undefined) {
    this.vector = position;
    this.map = map;
    this.instance = instance;
  }

  static fromEntity(ent: Entity) {
    let v = Vector.fromEntity(ent);
    return new Location(v, ent.map, ent.in);
  }

  static fromPosition(pos: {x:number,y:number,map:MapName,instance?:unknown}) {
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