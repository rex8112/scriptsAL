import { IPosition, PositionReal } from "typed-adventureland";
import { FarmerCharacter } from "./FarmerCharacter";

export function isSmartMoveToDestination(destination: any): destination is SmartMoveToDestination {
  if (typeof destination == "string") return true;
  if (destination.x != undefined) return true;
  return false;
}

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