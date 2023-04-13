import { IPosition, MapKey, MonsterKey, NpcKey } from "typed-adventureland";
import { isIPosition, isPositionReal } from "./TypeChecks.js";
import Rectangle from "./Utils/Rectangle.js";
import { Vector } from "./Utils/Vector.js";

interface PathActionMove {
  action: "Move";
  x: number;
  y: number;
}

interface PathActionTeleport {
  action: "Teleport";
  action_target: string;
  target_spawn: string;
}

interface PathActionTown {
  action: "Town";
}

type PathAction = PathActionMove | PathActionTeleport | PathActionTown;

export type MoverDestination = SmartMoveToDestination | "market";

interface FetchPathResponse {
  path: PathAction[];
  time: number;
  error?: string;
  cached?: boolean;
}

interface ErrorResponse {
  error: string;
  [key: string]: any;
}

function isErrorResponse(data: any): data is ErrorResponse {
  if (data.error) return true;
  return false;
}

export class Mover {
  // Should errors/messages be logged to the console (Game Inspector)?
  static logToConsole: boolean = true;

  // Should errors/messages be displayed in the window?
  static logToWindow: boolean = false;

  static path: PathAction[] | null = null;

  static currentStep: number = 0;

  // The position of the potion shop on the winter map.
  static _winterPotionsPosition: IPosition = {x: -84, y: -173, map: "winter_inn"};

  // A collection of custom positions, based on the list from smart_move.
  static _customPositions: {[key: string]: {[key: string]: IPosition}} = {
    any: {
      upgrade:    {x: -204, y: -129, map: "main"},
      compound:   {x: -204, y: -129, map: "main"},
      exchange:   {x: -26, y: -432, map: "main"},
      potions:    {x: 56, y: -122, map: "main"},
      scrolls:    {x: -465, y: -71, map: "main"},
      market:     {x: -97, y: -87, map: "main"}
    },
    halloween: {
      potions:    {x: 149, y: -182, map: "halloween"}
    },
    winterland: {
      potions:    Mover._winterPotionsPosition,
    },
    winter_inn: {
      potions:    Mover._winterPotionsPosition,
    },
    winter_cave: {
      potions:    Mover._winterPotionsPosition,
    }
  }

  static _stopping: boolean = false;

  static stopped: boolean = true;

  static async stop() {
    Mover._stopping = true;
    stop("move");

    while (!Mover.stopped)
      await sleep(100);
  }

  static async move(destination: IPosition | string) {
    if (is_string(destination)) {
      await Mover.move_by_path(<MoverDestination>destination);
      return true;
    }

    var realPos = Mover.get_coord(destination);
    if (!realPos) return false;
    realPos.map = realPos.map || character.map;

    if(character.map == realPos.map && can_move_to(realPos.x, realPos.y))
      return await Mover.moveX(realPos.x, realPos.y);
    else {
      await Mover.move_by_path(realPos);
      return character.map == realPos.map && character.x >= realPos.x - 10 && character.x <= realPos.x + 10 && character.y >= realPos.y - 10 && character.y <= realPos.y + 10;
    }
  }

  static async move_by_path(destination: MoverDestination) {
    Mover._stopping = false;
    Mover.stopped = false;
    console.log("Fetching Location", destination);
    let data = await Mover.get_path({x: Math.round(character.x), y: Math.round(character.y), map: character.map}, destination);

    if (data == null || data.path ==  null) {
      Mover._log("Failed to get path: Invalid response: ", data);
      let retryPos = Mover.get_coord(destination);
      if (retryPos) await Mover.smart_moveX(retryPos);
      Mover.stopped = true;
      return;
    }
    if(isErrorResponse(data))
    {
      Mover._log("Failed to get path: ", data.error);
      let retryPos = Mover.get_coord(destination);
      if (retryPos) await Mover.smart_moveX(retryPos);
      Mover.stopped = true;
      return;
    }

    Mover.path = data.path;
    Mover.currentStep = 0;

    for(let i in data.path)
    {
      if(Mover._stopping)
        break;

      Mover.currentStep = Number(i);

      if(character.dead || character.rip)
      {
        Mover.path = null;
        Mover.stopped = true;
        return;
      }

      let step = data.path[i];
      if(step.action == "Move")
      {
        let moved = await Mover.moveX(step.x, step.y);
        if(!moved)
        {
          Mover._log("Failed to move to ", step);
          let retryPos = Mover.get_coord(destination);
          if (retryPos) await Mover.smart_moveX(retryPos);
          Mover.path = null;
          Mover.stopped = true;
          return;
        }
      }
      else if(step.action == "Teleport")
      {
        await transport(<MapKey>step.action_target, Number(step.target_spawn));
        await sleep(100);
        while(is_transporting(character))
          await sleep(100);
        await sleep(500);
      }
      else if(step.action == "Town")
      {
        await Mover.useTown();
      }
    }

    Mover.path = null;
    Mover.stopped = true;
  }

  static async leaveMonsterArea(): Promise<boolean> {
    let map = G.maps[character.map];
    let pos = Vector.fromEntity(character);
    if (!map.monsters) return true;
    for (let monster of map.monsters) {
      if (monster.boundary) {
        let rect = Rectangle.fromBoundary(monster.boundary);
        if (rect.isInside(pos)){
          let point = rect.nearestOutside(pos, 10);
          console.log(pos, point, rect);
          return await Mover.moveX(point.x, point.y);
        }
      } else if (monster.boundaries) {
        for (let boundary of monster.boundaries) {
          let rect = Rectangle.fromBoundary(boundary[1], boundary[2], boundary[3], boundary[4]);
          if (rect.isInside(pos)) {
            let point = rect.nearestOutside(pos, 10);
            console.log(pos, point, rect);
            return await Mover.moveX(point.x, point.y);
          }
        }
      }
    }
    return true;
  }

  static async useTown()
  {
    await Mover.leaveMonsterArea();
    
    while(is_on_cooldown("use_town"))
      await sleep(100);

    await use_skill("use_town");

    // Attempt to move away from enemies before portaling.
    let monster = get_nearest_monster({});
    while (monster && simple_distance(character, monster) < character.range) {
      await Mover.moveX(
        character.x-(monster.x-character.x),
        character.y-(monster.y-character.y)
        );
      monster = get_nearest_monster({});
      await sleep(150);
    }

    await sleep(1000);
    while(is_transporting(character))
      await sleep(500);
    await sleep(250);
  }

  static get_coord(destination: MoverDestination): IPosition | null {
    let endPos;
    if (isPositionReal(destination)) {
      endPos = {x: Math.round(destination.real_x), y: Math.round(destination.real_y), map: destination.map};
    } else if (isIPosition(destination)) {
      endPos = {x: Math.round(destination.x), y: Math.round(destination.y), map: destination.map || character.map};
    } else {
      endPos = Mover.find_coords(destination);
    }
    return endPos
  }

  static find_coords(destination: string): IPosition | null {
    var endPos: IPosition | null = null;
    if(destination == "town")
      destination = "main";
    if(G.monsters[<MonsterKey>destination]) {
      // Find if string is a monster and their location. If multiple, picks one randomly.
      let locations: [MapKey, number, number][] = [],  theone: [MapKey, number, number];
      for(let name in G.maps) {
        let pack_dict: {[key: string]: number} = {};
        (G.maps[<MapKey>name].monsters || []).forEach(function(pack){
          if(pack.type != destination || G.maps[<MapKey>name].ignore ||  G.maps[<MapKey>name].instance)
            return;
          if(pack.boundaries) {
            pack_dict[pack.type] = pack_dict[pack.type] || 0;
            let boundary = pack.boundaries[pack_dict[pack.type] % pack.boundaries.length];
            pack_dict[pack.type]++;
            locations.push([boundary[0], (boundary[1] + boundary[3]) / 2, (boundary[2]  + boundary[4]) / 2]);
          }
          else if(pack.boundary) {
            let boundary = pack.boundary;
            locations.push([<MapKey>name, (boundary[0] + boundary[2]) / 2, (boundary[1] + boundary[3]) / 2]);
          }
        });
      }

      if(locations.length) {
        theone = random_one(locations);
        endPos = {x: theone[1], y: theone[2], map: theone[0]};
      }
    } else if(G.maps[<MapKey>destination]) {
      // If string is a map, finds the location of the first spawn of that map.
      let mapName = <MapKey>destination;
      endPos = {x: G.maps[mapName].spawns[0][0], y: G.maps[mapName].spawns[0][1], map: mapName};
    } else if((character.map in Mover._customPositions && destination in Mover._customPositions[character.map]) || destination in Mover._customPositions.any) {
      // Search custom positions for that string.
      if(character.map in Mover._customPositions && destination in Mover._customPositions[character.map])
        endPos = Mover._customPositions[character.map][destination];
      else
        endPos = Mover._customPositions.any[destination];
    } else if(find_npc(<NpcKey>destination)) {
      // Search for NPCs with that name.
      var l = find_npc(<NpcKey>destination);
      endPos = {x: l.x, y: l.y + 15, map: l.map};
    }
    return endPos;
  }

  static async get_path(start: IPosition, destination: MoverDestination): Promise<FetchPathResponse | ErrorResponse> {
    let startPos = start;
    let endPos = null;

    endPos = Mover.get_coord(destination);

    if (!endPos) return {error: "Unrecognized location"};

    if (!get('maptoken')) return {error: "Please set maptoken"};

    try {
      let res = await fetch("https://almapper.zinals.tech:42805/FindPath/", {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${get('maptoken')}`
        },
        body: JSON.stringify({
          fromMap: startPos.map,
          fromX: startPos.x,
          fromY: startPos.y,
          toMap: endPos.map,
          toX: endPos.x,
          toY: endPos.y,
          useTown: true,
          runspd: character.speed
        })
      });

      let result = await res.json();

      //console.log("Got response", result);

      if(result == null || typeof(result) != "object")
        return {error: "Invalid response"};

      return result;
    }
    catch(ex) {
      if(!is_string(ex))
        ex = JSON.stringify(ex);
      return {error: <string>ex};
    }
  }

  static async moveX(x: number, y: number) {
    if(x == Math.round(character.x) && y == Math.round(character.y))
      return true;

    let tries = 0;
    let pos = [character.x, character.y, character.map];
    while(true) {
      if(tries >= 5)
        return false;

      await move(x, y);
      await sleep(5);
      if(Math.round(character.x) == pos[0] && Math.round(character.y) == pos[1] && character.map == pos[2]) {
        // If character hasn't moved.
        if(x == pos[0] && y == pos[1])
          return true;
        tries++;

        await sleep(250);
      } else break;
    }

    return true;
  }

  static async smart_moveX(position: SmartMoveToDestination)
  {
    let done = false;

    smart_move(position).then((data) => {
      done = true;
    }).catch((data) => {
      done = true;
    });

    while(!done)
      await sleep(250);

    while(smart != null && smart.moving)
      await sleep(250);
  }

  static _log(...args: any[]) {
    if(Mover.logToConsole)
      console.log.apply(this, args);

    if(Mover.logToWindow) {
      let str = "";
      for(let i in args) {
        let arg = args[i];
        if(typeof(arg) == "object")
          str += JSON.stringify(arg);
        else
          str += arg;
      }
      console.log(str);
    }
  }
}

function random_one<T>(arr: Array<T>): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function is_string(x: any): x is string {
  if (typeof x == "string") return true;
  return false;
}

function is_number(x: any): x is number {
  if (typeof x == "number") return true;
  return false;
}