export function isSmartMoveToDestination(destination: any): destination is SmartMoveToDestination {
    if (typeof destination == "string") return true;
    if (destination.x != undefined) return true;
    return false;
}