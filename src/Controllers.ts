import AL, { Entity, IPosition, ItemName, MonsterName } from "alclient";
import { MerchantCharacter } from "./Character.js";
import { FarmerCharacter, PriestCharacter } from "./FarmerCharacter.js";
import { CustomCharacter, FarmerGoal, FarmingCharacter } from "./Types.js";
import { Bank } from "./Bank.js";
import { Items } from "./Items.js";
import { Vector } from "./Utils/Vector.js";
import { sleep } from "./Utils/Functions.js";

export class GameController {
  loaded: boolean = false;
  bank: Bank;
  characterController: CharacterController;
  farmerController: FarmerController;
  constructor() {
    this.bank = new Bank();
    this.characterController = new CharacterController(this);
    this.farmerController = new FarmerController(this);
  }

  get characters() {
    return this.characterController.characters;
  }

  async setup() {
    await this.characterController.deploy();
    let merch = this.characterController.Merchant;
    if (!merch) throw new Error("Merchant didn't start.")
    await this.bank.updateInfo(merch);
    this.loaded = true;

    await sleep(5000);

    this.farmerController.run();
  }


}

export class MerchantController {
  game: GameController;
  bank: Bank;
  merchant: MerchantCharacter;
  #canceling: boolean = false;

  constructor(gc: GameController, merchant: MerchantCharacter) {
    this.game = gc;
    this.bank = gc.bank;
    this.merchant = merchant;
  }

  async run() {
    try {
      await this.loop();
    } catch (e) {
      console.error("Error in Farmer Controller: ", e);
    }
    if (this.#canceling === false) {
      setTimeout(() => { this.run(); }, 250);
      return;
    }
    this.#canceling = false; // Set to false after it has been canceled.
  }

  async loop() {

  }

  async cancel() {
    this.#canceling = true;
    
  }

  async cleanInventory() {
    let keep = ["hpot0", "mpot0", "stand0"]
    let pos: number[] = [];
    let sellPos: [number, number][] = [];
    for (let i in this.merchant.ch.items) {
      let item = this.merchant.ch.items[i];
      if (item && !keep.includes(item.name)) {
        let quantity = item.q ?? 1;
        let data = Items[item.name];
        if (data && data.vendor?.sell === true) {
          let total = this.bank.items[item.name]?.getTotal() ?? 0 + quantity;
          if (total >= data.vendor.keep) {
            let sell = total - data.vendor.keep;
            if (sell >= quantity) {
              sellPos.push([Number(i), quantity]);
              continue;
            } else {
              sellPos.push([Number(i), sell])
            }
          }
        }
        pos.push(Number(i));
      }
    }

    console.log(sellPos);
    if (sellPos.length > 0) {
      await this.merchant.move("market");
      for (let pos of sellPos) {
        try {
          await this.merchant.ch.sell(pos[0], pos[1]);
        } catch {
          console.error("Item not present.");
        }
      }
    }

    await this.bank.storeItems(this.merchant, pos);

    if (this.merchant.ch.gold > 2_000_000) {
      await this.bank.depositGold(this.merchant, this.merchant.ch.gold - 2_000_000);
    }
  }

  async addFarmerGoal(item: ItemName, quantity: number) {
    let mobs: [name: MonsterName, rate: number][] = [];
    for (let mname in AL.Game.G.drops.monsters) {
      let drops = AL.Game.G.drops.monsters[<MonsterName>mname];
      if (!drops) continue;
      for (let drop of drops) {
        let [rate, iname] = drop;
        if (iname === item) {
          mobs.push([<MonsterName>mname, rate]);
        }
      }
    }
    if (mobs.length <= 0) return false;
    mobs.sort((a, b) => { return b[1] - a[1]; });
    let chosen = mobs[0];
    let goal: FarmerGoal = {name: chosen[0], for: {name: item, amount: quantity}, issued: Date.now()};
    // TODO: Finish Implementation
  }
}

export class FarmerController {
  game: GameController;
  goals: FarmerGoal[] = [];
  default: MonsterName = "crabx";
  #canceling: boolean = false;

  constructor(gc: GameController) {
    this.game = gc;
  }

  async run() {
    try {
      await this.loop();
    } catch (e) {
      console.error("Error in Farmer Controller: ", e);
    }
    if (this.#canceling === false) {
      setTimeout(() => { this.run(); }, 250);
      return;
    }
    this.#canceling = false; // Set to false after it has been canceled.
  }

  async loop() {
    let farmers = this.getFarmers();
    let leader = Object.values(farmers)[0];

    // Figure out what to have the Farmers do. (Cancel their current task if applicable.)
    let target = this.goals[0]?.name ?? this.default;

    // Find the location of the something.
    let monster = this.find_target(target);
    if (!monster) {
      let location = AL.Pathfinder.locateMonster(target);
      if (!location) {
        throw new Error(`Couldn't find location for monster of type ${target}`);
      }
      let moves = [];
      for (let name in farmers) {
        let farmer = farmers[name];
        moves.push(farmer.move(location[0]));
      }

      await Promise.all(moves);
      monster = this.find_target(target);
      if (!monster) {
        throw new Error(`${leader.name} couldn't find monster of type ${target}`);
      }
    }

    // Make them do something.
    let attacks = [];
    for (let name in farmers) {
      let farmer = farmers[name];
      if (farmer.ch.rip) continue;
      attacks.push(farmer.attack(monster));
    }
    await Promise.all(attacks);
  }

  async cancel() {
    this.#canceling = true;

  }

  move_party(dest: string | IPosition) {
    let farmers = this.getFarmers();
    let moves = [];
    for (let name in farmers) {
      let farmer = farmers[name];
      moves.push(farmer.move(dest));
    }

    return Promise.all(moves);
  }

  /* onLoot(loot) {
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
  } */

  find_target(monType: MonsterName, noTarget: boolean = true): Entity | null {
    let farmers = this.getFarmers();
    let positions = [];
    let targets = [];
    for (let name in farmers) {
      let farmer = farmers[name];
      positions.push(Vector.fromPosition(farmer.ch));
    }

    for (let name in farmers) {
      let farmer = farmers[name];

      let target = this.find_target_from_character(farmer, monType, noTarget);
      if (target != null) {
        targets.push(target);
      }
    }

    let target = null;
    let distance = null;
    for (let t of targets) {
      let pos = Vector.fromEntity(t);

      let distances = [];
      for (let name in farmers) {
        let farmer = farmers[name];
        let farmPos = Vector.fromEntity(farmer.ch);
        let distance = farmPos.distanceFromSqr(pos);
        distances.push(distance);
      }
      let avg = distances.reduce((a, b) => { return a+b; }) / distances.length;
      if (distance == null || avg < distance) {
        target = t;
        distance = avg;
      }
    }

    return target;
  }

  find_target_from_character(char: CustomCharacter, monType: MonsterName, noTarget: boolean = true): Entity | null {
    let cpos = Vector.fromPosition(char.ch);
    let target = char.ch.getTargetEntity();
    console.log("Current Target: ", target);

    let entities = char.ch.getEntities();
    for (let id in entities) {
      let entity = entities[id];
      console.log(`Checking Entity: ${entity.name} ${entity.type} | ${id}`);
      let epos = Vector.fromPosition(entity);
      let new_target = null;
      if (entity.type !== monType)
        continue;
      if (noTarget == false || !entity.target)
        new_target = entity;
      else if (char.getPlayer(entity.target)?.ctype === "merchant") {
        // Override any future checks. SAVE THE MERCHANT!
        target = entity;
        break;
      } else if (Object.keys(this.getFarmers()).includes(entity.target)) {
        console.log("Entity targetting party.");
        new_target = entity;
      }
      if (!target && new_target)
        target = new_target;
      else if (new_target && cpos.distanceFromSqr(epos) < cpos.distanceFromSqr(Vector.fromPosition(target)))
        target = new_target;
    }
    return target;
  }

  getFarmers(): {[name: string]: FarmingCharacter} {
    let farmers: {[name: string]: FarmingCharacter} = {};
    for (let name in this.game.characters) {
      let char = this.game.characters[name];
      if (char.ch.ctype !== "merchant") {
        farmers[char.name] = <FarmingCharacter>char;
      }
    }
    return farmers;
  }
}

export class CharacterController {
  game: GameController;
  characters: {[name: string]: CustomCharacter} = {};
  characterNames: string[] = [];
  selectedCharacters: string[] = ["Dezchant", "Dezara", "Deziest", "Dezanger"];
  constructor(gc: GameController) {
    this.game = gc;

    for (let name in AL.Game.characters) {
      this.characterNames.push(name);
    }
  }

  get Merchant(): MerchantCharacter | null {
    for (let name in this.characters) {
      let c = this.characters[name];
      if (c.ch.ctype === "merchant") return <MerchantCharacter>c;
    }

    return null;
  }

  async deploy() {
    for (let name of this.selectedCharacters) {
      let c;
      if (AL.Game.characters[name]?.type === "merchant") {
        let c = await AL.Game.startMerchant(name, "US", "I");
        this.characters[name] = new MerchantCharacter(this.game, c);
      } else if (AL.Game.characters[name]?.type === "mage") {
        let c = await AL.Game.startMage(name, "US", "I");
        this.characters[name] = new FarmerCharacter(this.game, c);
      } else if (AL.Game.characters[name]?.type === "ranger") {
        let c = await AL.Game.startRanger(name, "US", "I");
        this.characters[name] = new FarmerCharacter(this.game, c);
      } else if (AL.Game.characters[name]?.type === "priest") {
        let c = await AL.Game.startPriest(name, "US", "I");
        this.characters[name] = new FarmerCharacter(this.game, c);
      } else {
        throw new Error(`Class type not supported for character: ${name}`);
      }
      this.characters[name].startRun();
    }
  }
}
