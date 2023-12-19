import AL, { ChestLootData, DeathData, Entity, IPosition, ItemName, MonsterName, Player } from "alclient";
import { MerchantCharacter } from "./Character.js";
import { FarmerCharacter } from "./FarmerCharacter.js";
import { CustomCharacter, FarmerGoal, FarmingCharacter } from "./Types.js";
import { Bank } from "./Bank.js";
import { Items } from "./Items.js";
import { Vector } from "./Utils/Vector.js";
import { getFreeSlots, getItemQuantity, sleep } from "./Utils/Functions.js";
import Location from "./Utils/Location.js";
import { MerchantTaskController } from "./MerchantTasks.js";
import { ReplenishFarmersTask } from "./Tasks/ReplenishFarmers.js";
import { CheckCompound } from "./Tasks/CompoundItems.js";
import { CheckUpgrade } from "./Tasks/UpgradeItems.js";

export class GameController {
  loaded: boolean = false;
  bank: Bank;
  characterController: CharacterController;
  farmerController: FarmerController;
  merchantController: MerchantController;
  constructor() {
    this.bank = new Bank();
    this.characterController = new CharacterController(this);
    this.farmerController = new FarmerController(this);
    this.merchantController = new MerchantController(this);
  }

  get characters() {
    return this.characterController.characters;
  }

  async setup() {
    await this.characterController.deployMerchant()
    let merch = this.characterController.Merchant;
    if (!merch) throw new Error("Merchant didn't start.")
    await AL.Pathfinder.prepare(AL.Game.G);
    await this.bank.updateInfo(merch);
    if (merch.getFreeSlots().length < 20) await this.merchantController.cleanInventory();
    await this.characterController.deploy();
    this.loaded = true;

    await sleep(5000);

    this.characterController.run();
    this.farmerController.run();
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
    this.farmerController.goals.push(goal);
  }
}

export class MerchantController {
  game: GameController;
  bank: Bank;
  #canceling: boolean = false;
  tasks: MerchantTaskController;

  constructor(gc: GameController) {
    this.game = gc;
    this.bank = gc.bank;
    this.tasks = new MerchantTaskController(this)
    this.tasks.run();
  }

  get merchant(): MerchantCharacter | null {
    return this.game.characterController.Merchant;
  }

  async run() {
    try {
      await this.loop();
    } catch (e) {
      console.error("Error in Merchant Controller: ", e);
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

  replenishFarmers() {
    this.tasks.enqueueTask(new ReplenishFarmersTask(this));
  }

  checkCompound() {
    this.tasks.enqueueTask(new CheckCompound(this, this.tasks));
  }

  checkUpgrade() {
    this.tasks.enqueueTask(new CheckUpgrade(this, this.tasks));
  }

  async cleanInventory() {
    let merchant = this.merchant
    if (!merchant) return;
    let keep = ["hpot0", "mpot0", "stand0"]
    let pos: number[] = [];
    let sellPos: [number, number][] = [];
    for (let i in merchant.ch.items) {
      let item = merchant.ch.items[i];
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
      await merchant.move({x: 30, y: -40, map: "main"});
      for (let pos of sellPos) {
        try {
          await merchant.ch.sell(pos[0], pos[1]);
        } catch {
          console.error("Item not present.");
        }
      }
    }

    await this.bank.storeItems(merchant, pos);

    if (merchant.ch.gold > 2_000_000) {
      await this.bank.depositGold(merchant, merchant.ch.gold - 2_000_000);
    }
  }
}

export class FarmerController {
  game: GameController;
  goals: FarmerGoal[] = [];
  default: MonsterName = "crabx";
  
  farmers: FarmerCharacter[] = [];
  fighting: FarmerCharacter[] = [];
  targets: Entity[] = [];

  #canceling: boolean = false;

  boundOnLoot = (data: ChestLootData) => { this.onLoot(data); };

  constructor(gc: GameController) {
    this.game = gc;
  }

  addFarmer(farmer: FarmerCharacter) {
    this.farmers.push(farmer);
    this.fighting.push(farmer);
    farmer.startKite();
    farmer.startAttack();
    farmer.events.on("onLoot", this.boundOnLoot );
  }

  removeFarmer(farmer: FarmerCharacter) {
    let index = this.farmers.indexOf(farmer);
    let findex = this.fighting.indexOf(farmer);

    if (index == -1) return;

    this.farmers.splice(index, 1);
    if (findex != -1) this.fighting.splice(index, 1);

    farmer.stopKite();
    farmer.stopAttack();
    farmer.events.off("onLoot", this.boundOnLoot );
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
    let farmers = this.farmers;
    let leader = Object.values(farmers)[0];

    this.inspectFarmers();

    // Figure out what to have the Farmers do. (Cancel their current task if applicable.)
    let target = this.goals[0]?.name ?? this.default;

    // Find the location of the something.
    if (this.targets.length == 0) {
      let monster = this.find_target(target);
      if (!monster) {
        let location = AL.Pathfinder.locateMonster(target);
        if (!location) {
          throw new Error(`Couldn't find location for monster of type ${target}`);
        }
        let moves = [];
        for (let name in farmers) {
          let farmer: FarmerCharacter = farmers[name];
          await farmer.stopKite();
          moves.push(farmer.move(location[0]).catch((e)=>console.error("Error in find move", e)).finally(()=>farmer.startKite()));
        }
        
        try {
          await Promise.all(moves);
        } catch (error) {
          console.error("Error in move", error);
        }
        monster = this.find_target(target);
        if (!monster) {
          throw new Error(`${leader.name} couldn't find monster of type ${target}`);
        }
      }
      this.targets.push(monster);
    }
      
      // Make them do something.
      await this.party_attack();
    }

  async cancel() {
    this.#canceling = true;
  }

  inspectFarmers() {
    let needMerchant = false;
    for (let farmer of this.farmers) {
      let hpots = farmer.getItemQuantity("hpot0");
      let mpots = farmer.getItemQuantity("mpot0");
      let free = farmer.getFreeSlots();

      if (hpots < 100 || mpots < 100 || free.length < 30) needMerchant = true;
    }

    if (needMerchant) this.game.merchantController.replenishFarmers();
  }

  async party_find_target() {

  }

  async party_attack() {
    if (this.targets.length == 0) return;
    
    let to_move: FarmerCharacter[] = []
    for (let i in this.fighting) {
      let farmer = this.fighting[i];
      let target = farmer.getEntity(this.targets[0].id);
      if (target == null) {
        console.log("Could not find monster", farmer.name);
        to_move.push(farmer);
      } /* else {
        let range = farmer.ch.range * farmer.ch.range;
        let distance = farmer.Position.vector.distanceFromSqr(Vector.fromEntity(target));
        if (distance > range && !AL.Pathfinder.canWalkPath(farmer.ch, target) && !farmer.gettingUnstuck) {
          console.log("Can not move to monster", farmer.name);
          to_move.push(farmer);
        }
      } */
    }

    if (to_move.length >= this.fighting.length) {
      this.targets.length = 0;
      this.fighting.length = 0;
      this.fighting = new Array(...this.farmers);
      return;
    }

    for (let i in to_move) {
      let farmer = to_move[i];
      console.log("Removing Distant Character", farmer.name);
      let index = this.fighting.indexOf(farmer);
      this.fighting.splice(index, 1);
      await farmer.stopKite();
    }

    for (let i in this.fighting) {
      let farmer = this.fighting[i];
      farmer.target = this.targets[0];
    }

    for (let i in to_move) {
      let farmer = to_move[i];
      let target: Entity | FarmerCharacter = this.targets[0] ?? this.fighting[0];

      console.log("Moving Distant Character", farmer.name);
      farmer.move(target)
      .catch((error) => console.error("Error in Distant Move", error))
      .finally(() => {
        this.fighting.push(farmer);
        farmer.startKite();
        console.log("Character arrived", farmer.name);
      });
    }
  }

  get_attack_position(fighter: CustomCharacter, target: Entity | Player): Location {
    let fpos = Vector.fromPosition(fighter.ch);
    let tpos = Vector.fromEntity(target);
    let distanceToBe;

    if (fighter.ch.range > target.range) {
      distanceToBe = (fighter.ch.range + target.range) / 2;
    } else {
      distanceToBe = fighter.ch.range - 10;
    }
    
    let pos = tpos.pointTowards(fpos, distanceToBe);
    
    return new Location(pos, target.map);
  }

  clear_status() {

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

  onLoot(loot: ChestLootData) {
    let toRemove: number[] = [];
    for (let i = 0; i < this.goals.length; i++) {
      let goal = this.goals[i];

      let f = goal.for
      if (f.name === "gold") {
        f.amount -= loot.gold;
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
  }

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

  onDeath(data: DeathData) {
    let remove = [];
    for (let i in this.targets) {
      let target = this.targets[i];
      if (target.id == data.id) remove.push(target);
    }

    for (let target of remove) {
      this.targets.splice(this.targets.indexOf(target), 1);
    }
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

  run() {
    //setInterval(() => { this.checkParty(); }, 1_000);
  }

  async checkParty() {
    let merchant = this.Merchant;
    if (!merchant) return;

    for (let name in this.characters) {
      let char = this.characters[name];
      if (!char.ch.ready || !merchant.ch.ready) continue;

      if (!merchant.ch.party && char.ch.party) await char.ch.leaveParty();

      if (!char.ch.party) {
        merchant.ch.sendPartyInvite(char.ch.id).then(() => { if (merchant) char.ch.acceptPartyInvite(merchant.ch.id); console.log("Joined"); });
      }
    }
  }

  async deployMerchant() {
    for (let name of this.selectedCharacters) {
      let c;
      if (AL.Game.characters[name]?.type === "merchant") {
        let c = await AL.Game.startMerchant(name, "US", "I");
        this.characters[name] = new MerchantCharacter(this.game, c);
        this.characters[name].startRun();
      }
    }
  }

  async deploy() {
    for (let name of this.selectedCharacters) {
      let c;
      if (this.characters[name]) continue;
      if (AL.Game.characters[name]?.type === "merchant") {
        let c = await AL.Game.startMerchant(name, "US", "I");
        this.characters[name] = new MerchantCharacter(this.game, c);
      } else if (AL.Game.characters[name]?.type === "mage") {
        let c = await AL.Game.startMage(name, "US", "I");
        let fc = new FarmerCharacter(this.game, c);
        this.characters[name] = fc;
        this.game.farmerController.addFarmer(fc);
      } else if (AL.Game.characters[name]?.type === "ranger") {
        let c = await AL.Game.startRanger(name, "US", "I");
        let fc = new FarmerCharacter(this.game, c);
        this.characters[name] = fc;
        this.game.farmerController.addFarmer(fc);
      } else if (AL.Game.characters[name]?.type === "priest") {
        let c = await AL.Game.startPriest(name, "US", "I");
        let fc = new FarmerCharacter(this.game, c);
        this.characters[name] = fc;
        this.game.farmerController.addFarmer(fc);
      } else {
        throw new Error(`Class type not supported for character: ${name}`);
      }
      this.characters[name].startRun();
    }
  }
}
