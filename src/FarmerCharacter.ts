import { FarmerGoal } from "./Types.js";
import { Vector } from "./Utils/Vector.js";
import Location from "./Utils/Location.js";
import { BaseCharacter } from "./Character.js";
import { sleep } from "./Utils/Functions.js";
import AL, { Character, ChestLootData, ChestOpenedData, DeathData, Entity, IPosition, MonsterName, Player } from "alclient";
import { GameController } from "./Controllers.js";
import { EventEmitter } from "events";
import { CharacterEvents } from "./EventEmitters.js";


export class FarmerCharacter extends BaseCharacter {
  mode: "leader" | "follower" | "none" = "none";
  attackMode: "single" | "multiple" = "single";
  defaultType: MonsterName = "crabx";
  currentType: MonsterName = this.defaultType;
  goals: FarmerGoal[] = [];
  target?: Entity;
  gettingUnstuck: boolean = false;

  events = new CharacterEvents();

  supportInterval?: NodeJS.Timer;
  #attacking: boolean = false;
  #kiting: boolean = false;

  constructor(gc: GameController, ch: Character) {
    super(gc, ch);
    this.ch.socket.on("death", (data) => { this.onDeath(data); })
    this.ch.socket.on("chest_opened", (data) => { this.onLoot(data); });
    //ch.on("loot", (data) => { this.onLoot(data); });
    //game.on("event", (data) => { this.onEvent(data); });
  }

  startTasks(): void {
    super.startTasks();

    if (!this.supportInterval) this.supportInterval = setInterval(() => { this.supportSkills(); }, 250);
  }

  async supportSkills() {}

  async run() {}

  startAttack() {
    if (!this.#attacking) {
      this.#attacking = true;
      this.runAttack();
    }
  }

  stopAttack() {
    this.#attacking = false;
  }

  async runAttack() {
    if (this.#attacking) {
      await this.attack();
      setTimeout(() => this.runAttack(), 250);
    }
  }

  async attack() {
    let target = this.target;
    if (!target) return;
    try {
      if (!this.ch.isOnCooldown("attack") && Vector.fromPosition(this.ch).distanceFromSqr(Vector.fromPosition(target)) <= (this.ch.range * this.ch.range) && this.ch.mp >= this.ch.mp_cost) {
        await this.ch.basicAttack(target.id);
      }
    } catch (e) {
      console.error("Error in attack: ", e);
    }
  }

  startKite() {
    if (!this.#kiting) {
      this.#kiting = true;
      this.runKite();
    }
  }

  async stopKite() {
    this.#kiting = false;
    do {
      await sleep(250);
    } while (this.gettingUnstuck || this.ch.moving);
  }

  async runKite() {
    if (this.#kiting) {
      await this.kite();
      setTimeout(() => this.runKite(), 250)
    }
  }

  async kite() {
    if (this.gettingUnstuck || !this.#kiting) return;
    let target = this.target;
    let pos = Vector.fromPosition(this.ch);
    if (Number.isNaN(pos.x)) return;
    let lpos: IPosition;
    let move = false;

    let entities = this.ch.getEntities();
    let players = this.ch.getPlayers();
    let both: (Player | Entity)[] = new Array().concat(entities, players);
    for (let id in both) {
      let entity = both[id];
      if (entity.id !== target?.id) {
        pos = this.moveKitePoint(pos, entity);
      }
    }

    if (target) pos = this.moveKitePoint(pos, target);

    if (!pos.isEqual(Vector.fromPosition(this.ch))) move = true;

    if (move && this.#kiting) {
      await this.kiteMove(pos);
    }
  }

  async kiteMove(point: Vector) {
    let lpos = Location.fromPosition({...point, map: this.ch.map}).asPosition()
  
      if (AL.Pathfinder.canWalkPath(this.ch, lpos)) {
        this.ch.move(lpos.x, lpos.y, {resolveOnStart: true}).catch((e) => console.debug("Error in Kite Movement"));
  
      } else if (AL.Pathfinder.canStand(lpos)) {
        this.gettingUnstuck = true;
        try {
          await this.move(lpos);
        } finally {
          this.gettingUnstuck = false;
        }
      } else {
        this.ch.move(lpos.x+(100 * Math.random() - 50), lpos.y+(100 * Math.random() - 50), {resolveOnStart: true})
          .catch((e) => {console.debug("How??", e)});
      }
  }

  moveKitePoint(point: Vector, entity: Entity | Player): Vector {
    let target = this.target;
    let entityPos = Vector.fromPosition(entity);
    let distanceToBe;
    let distanceCapSqr = Math.pow(this.ch.range - 10, 2);
    if (this.name === entity.name) {
      return point;
    } else if ("ctype" in entity) {
      distanceToBe = 30;
    } else if (this.ch.range > entity.range) {
      distanceToBe = (this.ch.range + entity.range) / 2;
    } else {
      distanceToBe = this.ch.range - 10;
    }
    
    let movePoint = false;
    let squared = distanceToBe * distanceToBe;
    let distanceSquared = entityPos.distanceFromSqr(point);
    if (entity.id == target?.id) {
      if (distanceCapSqr <= distanceSquared || distanceSquared <= squared)
        movePoint = true;
    } else {
      if (distanceSquared < squared)
        movePoint = true;
    }

    if (movePoint) {
      if (entityPos.isEqual(point) && target) {
        let targetPos = Vector.fromPosition(target);
        let u = targetPos.vectorTowards(point);
        if (Math.random() >= 0.5 ? 1 : -1) {
          u = u.perpendicular();
        } else {
          u = u.perpendicular(true);
        }
        let d = u.multiply(distanceToBe);
        point = point.addVector(d);
      }
      
      if (entity.id === target?.id) {
        point = this.rotateUntilClear(point, Vector.fromEntity(target), distanceToBe);
      }
      return entityPos.pointTowards(point, distanceToBe);
    }
    return point;
  }

  rotateUntilClear(point: Vector, target: Vector, distance: number): Vector {
    let newPoint = point;
    let tries = 0;
    while (!AL.Pathfinder.canWalkPath(this.ch, new Location(newPoint, this.ch.map).asPosition()) && tries < 500) {
      let direction = newPoint.vectorTowards(target);
      let perp = direction.perpendicular();
      let length = perp.multiply(20);
      let moved = newPoint.addVector(length);
      newPoint = target.pointTowards(moved, distance);
      tries++;
    }
    return newPoint;
  }

  onDeath(data: DeathData) {
    this.game.farmerController.onDeath(data);
    if (data.id === this.target?.id) this.target = undefined;
  }

  onLoot(data: ChestOpenedData) {
    if ("gone" in data) return;
    if (data.opener === this.name) {
      this.events.emit("onLoot", data);
    }
  }
}
