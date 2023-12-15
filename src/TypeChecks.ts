import { IPosition, PositionReal } from "alclient";
import { FarmerCharacter } from "./FarmerCharacter.js";

export function isIPosition(pos: any): pos is IPosition {
  if (pos.x != undefined) {
    let keys = Object.keys(pos);
    if (keys.includes("x") && keys.includes("y")) return true;
  }
  return false;
}

export function isPositionReal(pos: any): pos is PositionReal {
  if (pos.real_x != undefined) {
    let keys = Object.keys(pos);
    if (keys.includes("real_x") && keys.includes("real_y")) return true;
  }
  return false;
}

export function isFarmerCharacter(char: any): char is FarmerCharacter {
  if (typeof char === "object") {
    return char.attackMode !== undefined;
  }
  return false;
}