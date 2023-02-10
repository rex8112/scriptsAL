import { IPosition, PositionReal } from "typed-adventureland";

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