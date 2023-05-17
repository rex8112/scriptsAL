import { EventData, EventLocation, FarmerGoal } from "./Types.js";
import { Vector } from "./Utils/Vector.js";
import Location from "./Utils/Location.js";
import { BaseCharacter } from "./Character.js";
import { canUseSkill, get_position, sleep } from "./Utils/Functions.js";
import GameEvent from "./GameEvents.js";
import AL, { Character, Entity, MonsterName } from "alclient";
import { GameController } from "./Controllers.js";


export class FarmerCharacter extends BaseCharacter {
  mode: "leader" | "follower" | "none" = "none";
  attackMode: "single" | "multiple" = "single";
  defaultType: MonsterName = "crabx";
  currentType: MonsterName = this.defaultType;
  goals: FarmerGoal[] = [];
  event?: EventData;
  gettingUnstuck: boolean = false;

  supportInterval?: NodeJS.Timer;

  constructor(gc: GameController, ch: Character) {
    super(gc, ch);
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
    let k = setInterval(() => { this.kite(target); }, 250);
    try {
      while (target.hp > 0 && !this.ch.rip) {
        if (!this.ch.isOnCooldown("attack") && Vector.fromPosition(this.ch).distanceFromSqr(Vector.fromPosition(target)) <= (this.ch.range * this.ch.range)) {
          console.log(`Attacking ${target.id}`);
          await this.ch.basicAttack(target.id);
          console.log(`Finished Attacking`)
        }
        await sleep(250);
      }
    } catch (e) {
      console.error("Error in attack: ", e);
    } finally {
      clearInterval(k);
    }
  }

  async kite(target: Entity) {
    if (this.gettingUnstuck) return;
    let pos = Vector.fromPosition(this.ch);
    let targetPos = Vector.fromPosition(target);

    let entities = this.ch.getEntities();
    for (let id in entities) {
      let entity = entities[id];
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
      if (entity == target) {
        if (distanceSquared !== squared)
          move = true;
      } else {
        if (distanceSquared < squared)
          move = true;
      }

      if (move) {
        if (entityPos.isEqual(pos)) {
          let u = targetPos.vectorTowards(pos);
          if (Math.random() >= 0.5 ? 1 : -1) {
            u = u.perpendicular();
          } else {
            u = u.perpendicular(true);
          }
          let d = u.multiply(distanceToBe);
          pos = pos.addVector(d);
        }
        pos = entityPos.pointTowards(pos, distanceToBe);
      }
    }

    if (AL.Pathfinder.canWalkPath(this.ch, {x: pos.x, y: pos.y})) {
      this.ch.move(pos.x, pos.y);

    } else if(AL.Pathfinder.canStand({x: pos.x, y: pos.y, map: this.ch.map})) {
      this.gettingUnstuck = true;
      try {
        await this.move(pos);
      } finally {
        this.gettingUnstuck = false;
      }
    } else {
      this.ch.move(pos.x+(100 * Math.random() - 50), pos.y+(100 * Math.random() - 50))
        .catch((e) => {console.error(e)});
    }
  }
}

export class PriestCharacter extends FarmerCharacter {
  supportRunning: boolean = false;
  needsHeal: string[] = [];
  async supportSkills(): Promise<void> {
    try {
      if (this.supportRunning) return;
      this.supportRunning = true;
  
      let members = Object.keys(get_party()).map((m) => get_player(m)).filter((m) => m)
                    .sort((a, b) => { return (b.max_hp - b.hp) - (a.max_hp - a.hp)});
  
      let totalLow = 0;
      for (let member of members) {
        if (member.hp <= member.max_hp - (character.heal / 2)) {
          if (this.needsHeal.includes(member.name)) {
            this.needsHeal.push(member.name);
          }
        }
        if (member.name !== character.name && getMonstersThatTarget(member).length > 0) {
          if (canUseSkill("absorb") && is_in_range(member, "absorb")) {
            await use_skill("absorb", member);
          }
        }
  
        // If they are still low, mark them as a party heal candidate.
        if (member.hp <= member.max_hp - 500) totalLow++;
      }
  
      if (totalLow >= 1 && canUseSkill("partyheal")) await use_skill("partyheal");
    } catch {}
    this.supportRunning = false;
  }

  async attack(target: Entity) {
    change_target(target);
    let k = setInterval(() => { this.kite(target); }, 250);
    while (target.dead === undefined && !character.rip) {
      try{
        if (!target.s["cursed"] && canUseSkill("curse") && is_in_range(target, "curse")) await use_skill("curse");
      }
      catch (error) {
        console.error("Error in skill", error);
      }
      let healTarget;
      if (this.needsHeal.length > 0) {
        healTarget = get_player(this.needsHeal[0]);
      }
      if (healTarget && canUseSkill("heal") && is_in_range(healTarget, "heal")) {
        set_message("Healing");
        use_skill("heal", healTarget);
        this.needsHeal.splice(0, 1);
      } else if (can_attack(target)) {
        set_message("Attacking");
        attack(target);
      }
      await sleep(250);
    }
    clearInterval(k);
  }
}
