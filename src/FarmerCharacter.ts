import { EventData, EventLocation, FarmerGoal } from "./Types.js";
import { Vector } from "./Utils/Vector.js";
import Location from "./Utils/Location.js";
import { BaseCharacter } from "./Character.js";
import { sleep } from "./Utils/Functions.js";
import GameEvent from "./GameEvents.js";
import AL, { Character, DeathData, Entity, IPosition, MonsterName, Player } from "alclient";
import { GameController } from "./Controllers.js";


export class FarmerCharacter extends BaseCharacter {
  mode: "leader" | "follower" | "none" = "none";
  attackMode: "single" | "multiple" = "single";
  defaultType: MonsterName = "crabx";
  currentType: MonsterName = this.defaultType;
  goals: FarmerGoal[] = [];
  event?: EventData;
  target?: Entity;
  gettingUnstuck: boolean = false;

  supportInterval?: NodeJS.Timer;
  #kiting: boolean = false;

  constructor(gc: GameController, ch: Character) {
    super(gc, ch);
    this.ch.socket.on("death", (data) => { this.onDeath(data); })
    //ch.on("loot", (data) => { this.onLoot(data); });
    //game.on("event", (data) => { this.onEvent(data); });
  }

  startTasks(): void {
    super.startTasks();

    if (!this.supportInterval) this.supportInterval = setInterval(() => { this.supportSkills(); }, 250);
  }

  async supportSkills() {}

  async run() {}

  async attack(target: Entity) {
    console.log(this.name, "Preparing to attack", target.id);
    try {
      if (!this.ch.isOnCooldown("attack") && Vector.fromPosition(this.ch).distanceFromSqr(Vector.fromPosition(target)) <= (this.ch.range * this.ch.range)) {
        console.log(`Attacking ${target.id}`);
        await this.ch.basicAttack(target.id);
        console.log(`Finished Attacking`)
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

  stopKite() {
    this.#kiting = false;
  }

  async runKite() {
    if (this.#kiting) {
      await this.kite();
      setTimeout(() => this.runKite(), 250)
    }
  }

  async kite() {
    if (this.gettingUnstuck) return;
    let target = this.target;
    let pos = Vector.fromPosition(this.ch);
    let lpos: IPosition;

    let entities = this.ch.getEntities();
    let players = this.ch.getPlayers();
    let both: (Player | Entity)[] = new Array().concat(entities, players);
    for (let id in both) {
      let entity = both[id];
      let entityPos = Vector.fromPosition(entity);
      let distanceToBe;
      if (this.ch.range > entity.range) {
        distanceToBe = (this.ch.range + entity.range) / 2;
      } else {
        distanceToBe = this.ch.range - 10;
      }
      
      let move = false;
      let squared = distanceToBe * distanceToBe;
      let distanceSquared = entityPos.distanceFromSqr(pos);
      if (entity.id == target?.id) {
        if (distanceSquared !== squared)
          move = true;
      } else {
        if (distanceSquared < squared)
          move = true;
      }

      if (move) {
        if (entityPos.isEqual(pos) && target) {
          let targetPos = Vector.fromPosition(target);
          let u = targetPos.vectorTowards(pos);
          if (Math.random() >= 0.5 ? 1 : -1) {
            u = u.perpendicular();
          } else {
            u = u.perpendicular(true);
          }
          let d = u.multiply(distanceToBe);
          pos = pos.addVector(d);
        }
        
        if ("ctype" in entity) {
          pos = entityPos.pointTowards(pos, 30);
        } else {
          pos = entityPos.pointTowards(pos, distanceToBe);
        }
      }
    }

    lpos = Location.fromPosition({...pos, map: this.ch.map}).asPosition()

    if (AL.Pathfinder.canWalkPath(this.ch, lpos)) {
      this.ch.move(lpos.x, lpos.y).catch((e) => console.error("Error in Kite Movement"));

    } else if(AL.Pathfinder.canStand(lpos)) {
      this.gettingUnstuck = true;
      try {
        await this.move(lpos);
      } finally {
        this.gettingUnstuck = false;
      }
    } else {
      this.ch.move(lpos.x+(100 * Math.random() - 50), lpos.y+(100 * Math.random() - 50))
        .catch((e) => {console.error(e)});
    }
  }

  onDeath(data: DeathData) {
    this.game.farmerController.onDeath(data);
  }
}
