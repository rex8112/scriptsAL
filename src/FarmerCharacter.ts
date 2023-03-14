import { Entity, LootEvent, MonsterKey } from "typed-adventureland";
import { FarmerGoal } from "./Types";
import { Vector } from "./Utils/Vector";
import { BaseCharacter, get_position } from "./Character";


export class FarmerCharacter extends BaseCharacter {
  mode: "leader" | "follower" | "none" = "none";
  attack_mode: "single" | "multiple" = "single";
  default_type: MonsterKey = "crabx";
  current_type: MonsterKey = this.default_type;
  goals: { [name: string]: FarmerGoal; } = {};

  constructor(ch: Character) {
    super(ch);
    ch.on("loot", (data) => { this.onLoot(data); });
  }

  onLoot(loot: LootEvent) {
    let goal = this.goals[this.current_type];
    if (!goal)
      return;

    for (let f of goal.for) {
      if (f.name === "gold") {
        f.amount -= loot.gold;
      } else if (Object.keys(loot.items).includes(f.name)) {
        let items = loot.items.filter(i => { i.name === f.name; });
        if (!items)
          continue;
        // I don't know, maybe you can loot multiple of an item.
        for (let item of items)
          f.amount -= item.q ?? 1;
      }
    }
  }

  setLeader(leader: string) {
    super.setLeader(leader);
    if (leader === this.name) {
      this.mode = "leader";
      game_log("Becoming Leader", "orange");
    } else {
      this.mode = "follower";
      game_log(`Becoming Follower to ${this.leader}`, "orange");
    }
  }

  async run() {
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
      let target = await this.find_target();
      if (target === null) {
        await this.move(this.current_type);
        target = await this.find_target();
      }
      if (target === null)
        return;

      await this.attack(target);
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
      if (entity.mtype !== this.current_type)
        continue;
      if (!entity.target)
        new_target = entity;
      else if (parent.entities[entity.target]?.ctype === "merchant") {
        // Override any future checks. SAVE THE MERCHANT!
        target = entity;
        break;
      } else if (this.attack_mode === "single" && Object.keys(get_party()).includes(entity.target)) {
        new_target = entity;
      } else if (this.attack_mode === "multiple" && !Object.keys(get_party()).includes(entity.target)) {
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
    while (target.dead === undefined) {
      if (can_attack(target)) {
        set_message("Attacking");
        attack(target);
      }
      await sleep(250);
    }
    clearInterval(k);
  }

  async kite(target: Entity) {
    let tries = 0;
    let free = false;
    let pos = Vector.fromEntity(character);

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
        pos = entityPos.pointTowards(pos, distanceToBe);
      }
    }

    move(pos.x, pos.y);
  }
}
