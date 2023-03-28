import { Entity, EventKey, LootEvent, MonsterKey } from "typed-adventureland";
import { FarmerGoal } from "./Types";
import { Vector } from "./Utils/Vector";
import { BaseCharacter, get_position } from "./Character";
import { canUseSkill } from "./Utils/Functions";


export class FarmerCharacter extends BaseCharacter {
  mode: "leader" | "follower" | "none" = "none";
  attackMode: "single" | "multiple" = "single";
  defaultType: MonsterKey = "crabx";
  currentType: MonsterKey = this.defaultType;
  goals: FarmerGoal[] = [];
  gettingUnstuck: boolean = false;

  supportInterval?: NodeJS.Timer;

  constructor(ch: Character) {
    super(ch);
    ch.on("loot", (data) => { this.onLoot(data); });
  }

  startTasks(): void {
    super.startTasks();

    if (!this.supportInterval) this.supportInterval = setInterval(() => { this.supportSkills(); }, 250);
  }

  addGoal(goal: FarmerGoal) {
    this.goals.push(goal);
    this.saveGoals();
  }

  saveGoals() {
    set("farmGoals", this.goals);
  }

  loadGoals() {
    this.goals = get("farmGoals") ?? [];
  }

  onEvent(event: EventKey) {

  }

  onLoot(loot: LootEvent) {
    let toRemove: number[] = [];
    for (let i = 0; i < this.goals.length; i++) {
      let goal = this.goals[i];
      if (goal.name !== this.currentType) continue;

      let f = goal.for
      if (f.name === "gold") {
        f.amount -= loot.gold;
      } else if (f.name === "kills") {
        f.amount -= 1;
      } else if (loot.items) {
        let items = loot.items.filter(i => { return i.name === f.name; });
        if (!items) continue;
        // I don't know, maybe you can loot multiple of an item.
        for (let item of items) {
          console.log(item);
          f.amount -= item.q ?? 1;
        }
      }
      if (f.amount <= 0) toRemove.push(i);
    }

    if (toRemove.length > 0) {
      toRemove.sort((a, b) => { return b - a });
      for (let i of toRemove) {
        this.goals.splice(i, 1);
      }
    }
    if (this.mode === "leader")
      this.saveGoals();
  }

  setLeader(leader: string) {
    super.setLeader(leader);
    if (leader === this.name) {
      this.mode = "leader";
      this.loadGoals();
      game_log("Becoming Leader", "orange");
    } else {
      this.mode = "follower";
      game_log(`Becoming Follower to ${this.leader}`, "orange");
    }
  }

  async supportSkills() {}

  async run() {
    if (character.rip) return;
    if (this.mode == "follower") {
      if (this.leader === null)
        return;

      let l = get_player(this.leader);
      if (l === null) {
        await this.move(get_position(this.leader));
        return;
      }
      while (simple_distance(character, l) > Math.max(character.range, 200))
        await this.move(l);

      let t = get_target_of(l);
      if (t === null)
        return;

      await this.attack(t);
    } else if (this.mode == "leader") {
      this.checkTargetType();
      let target = await this.find_target();
      if (target === null) {
        await this.move(this.currentType);
        target = await this.find_target();
      }
      if (target === null)
        return;

      await this.attack(target);
    }
  }

  checkTargetType() {
    if (this.goals.length) {
      this.currentType = this.goals[0].name;
    } else {
      this.currentType = this.defaultType;
    }
  }

  async find_target() {
    let cpos = Vector.fromEntity(character);
    let target = get_targeted_monster();
    if (target !== null)
      return target;

    for (let id in parent.entities) {
      let entity = parent.entities[id];
      let epos = Vector.fromEntity(entity);
      let new_target = null;
      if (entity.mtype !== this.currentType)
        continue;
      if (!entity.target)
        new_target = entity;
      else if (parent.entities[entity.target]?.ctype === "merchant") {
        // Override any future checks. SAVE THE MERCHANT!
        target = entity;
        break;
      } else if (this.attackMode === "single" && Object.keys(get_party()).includes(entity.target)) {
        new_target = entity;
      } else if (this.attackMode === "multiple" && !Object.keys(get_party()).includes(entity.target)) {
        new_target = entity;
      }
      if (target === null)
        target = new_target;
      else if (new_target && cpos.distanceFromSqr(epos) < cpos.distanceFromSqr(Vector.fromEntity(target)))
        target = new_target;
    }
    return target;
  }

  async attack(target: Entity) {
    change_target(target);
    let k = setInterval(() => { this.kite(target); }, 250);
    while (target.dead === undefined && !character.rip) {
      if (can_attack(target)) {
        set_message("Attacking");
        attack(target);
      }
      await sleep(250);
    }
    clearInterval(k);
  }

  async kite(target: Entity) {
    if (this.gettingUnstuck) return;
    let pos = Vector.fromEntity(character);
    let targetPos = Vector.fromEntity(target);

    for (let id in parent.entities) {
      let entity = parent.entities[id];
      let entityPos = Vector.fromEntity(entity);
      let distanceToBe;
      if (entity.type !== "monster") {
        distanceToBe = 10;
      } else if (character.range > entity.range) {
        distanceToBe = (character.range + entity.range) / 2;
      } else {
        distanceToBe = character.range - 10;
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

    if (can_move_to(pos.x, pos.y)) {
      move(pos.x, pos.y);

    } else if(can_move({map: character.map, x: targetPos.x, y: targetPos.y, going_x: pos.x, going_y: pos.y, base: character.base}) &&
              pos.distanceFromSqr(Vector.fromEntity(character)) > 100) {
      this.gettingUnstuck = true;
      try {
        await this.move(pos);
      } finally {
        this.gettingUnstuck = false;
      }
    } else {
      move(pos.x+(100 * Math.random() - 50), pos.y+(100 * Math.random() - 50));
    }
  }
}

function getMonstersThatTarget(entity: Entity) {
  let monsters = [];
  for (let ename in parent.entities) {
    let monster = parent.entities[ename];
    if (monster.type !== "monster") continue;
    if (monster.target === entity.name) {
      monsters.push(monster);
    }
  }

  return monsters;
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
