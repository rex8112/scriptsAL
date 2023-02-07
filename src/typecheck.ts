import { IPosition } from "typed-adventureland";

export function isSmartMoveToDestination(destination: any): destination is SmartMoveToDestination {
    if (typeof destination == "string") return true;
    if (destination.x != undefined) return true;
    return false;
}

export function isIPosition(pos: any): pos is IPosition {
    if (typeof pos == "object") {
        let keys = Object.keys(pos);
        if (keys.includes("x") && keys.includes("y")) return true;
    }
    return false;
}