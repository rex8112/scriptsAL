import { BankPackTypeItemsOnly, CharacterBankInfos, ClassKey, Entity, IPosition, ItemInfo, ItemKey, LootEvent, MonsterKey, TradeItemInfo, TradeSlotType } from "typed-adventureland";
import { Mover } from "./Mover";
import { CMRequests } from "./CMRequests";
import { FarmerGoal, LocalChacterInfo } from "./Types";
import { CharacterMessager } from "./CharacterMessager";
import { getItemPosition, getItemQuantity, smartUseHpOrMp } from "./Utils/Functions";
import { Bank, BankPosition } from "./Bank";
import { TaskController } from "./Tasks";
import { CheckCompound, CompoundItems } from "./Tasks/CompoundItems";
import { CheckUpgrade, UpgradeItems } from "./Tasks/UpgradeItems";
import { ReplenishFarmersTask } from "./Tasks/ReplenishFarmers";
import { Vector } from "./Utils/Vector";
import { Items } from "./Items";
import { Location } from "./Utils/Location";
import { isIPosition } from "./TypeChecks";

export class BaseCharacter {
  original: Character;
  class: ClassKey;
  name: string;
  CM: CharacterMessager;
  working: boolean = false;
  bank: Bank;
  taskController: TaskController;
  leader: string | null = null;

  potionUseTask: NodeJS.Timer | null = null;
  lootTask: NodeJS.Timer | null = null;
  respawnTask: NodeJS.Timer | null = null;

  constructor(ch: Character) {
    this.original = ch;
    this.class = ch.ctype;
    this.name = ch.name;
    this.CM = new CharacterMessager(this);
    this.bank = new Bank(this);
    this.taskController = new TaskController(this);
    this.taskController.run();
  }

  get Position(): Location {
    return Location.fromEntity(character);
  }

  startTasks() {
    if (this.potionUseTask === null)
      this.potionUseTask = setInterval(smartUseHpOrMp, 250);
    if (this.lootTask === null)
      this.lootTask = setInterval(loot, 250);
    if (this.respawnTask === null)
      this.respawnTask = setInterval(autoRespawn, 15_000);
  }

  async startRun() {
    this.startTasks();
    await this.run();
    setTimeout(() => { this.startRun() }, 500);
  }

  async run() {}

  setLeader(leader: string) {
    this.leader = leader;
  }

  /**
   * Get an array of all instances of an item in your inventory.
   * @param name The name of the item.
   * @returns An array of item info and positions for each instance of the item in your inventory.
   */
  getItem(name: string): {item: ItemInfo, pos: number}[] {
    var items: {item: ItemInfo, pos: number}[] = [];
    for (let i = 0; i < character.isize; i++) {
    if (character.items[i] && character.items[i].name==name)
      items.push({item: character.items[i], pos: i});
    }
    return items;
  }

  /**
   * A shortcut method to use Mover.move().
   * @param dest Destination to move character.
   * @returns The promise returned by Mover.move().
   */
  move(dest: IPosition | string) {
    if (isIPosition(dest) && can_move_to(dest.x, dest.y))
      return move(dest.x, dest.y);
    return Mover.move(dest);
  }

  oneAtATime(func: () => Promise<void>) {
    if (this.working === true) return;
    this.working = true;
    func().finally(() => {this.working = false});
  }
}

export class FarmerCharacter extends BaseCharacter {
  mode: "leader" | "follower" | "none" = "none";
  attack_mode: "single" | "multiple" = "single";
  default_type: MonsterKey = "crabx";
  current_type: MonsterKey = this.default_type;
  goals: {[name: string]: FarmerGoal} = {};

  constructor(ch: Character) {
    super(ch);
    ch.on("loot", (data) => { this.onLoot(data); });
  }

  onLoot(loot: LootEvent) {
    let goal = this.goals[this.current_type];
    if (!goal) return;

    for (let f of goal.for) {
      if (f.name === "gold") {
        f.amount -= loot.gold;
      } else if (Object.keys(loot.items).includes(f.name)) {
        let items = loot.items.filter(i=>{i.name === f.name});
        if (!items) continue;
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
      game_log("Becoming Leader");
    } else {
      this.mode = "follower";
      game_log(`Becoming Follower to ${this.leader}`);
    }
  }

  async run() {
    if (this.mode == "follower") {
      if (this.leader === null) return;

      let l = get_player(this.leader);
      if (l === null) { 
        await this.move(get_position(this.leader));
        return;
      }
      while (simple_distance(character, l) > Math.max(character.range, 200))
        await this.move(l);

      let t = get_target_of(l);
      if (t === null) return;

      await this.attack(t);
    } else if (this.mode == "leader") {
      let target = await this.find_target();
      if (target === null) {
        await this.move(this.current_type);
        target = await this.find_target();
      }
      if (target === null) return;

      await this.attack(target);
    }
  }

  async find_target() {
    let cpos = Vector.fromEntity(character);
    let target = get_targeted_monster();
    if (target !== null) return target;

    for (let id in parent.entities) {
      let entity = parent.entities[id];
      let epos = Vector.fromEntity(entity);
      let new_target = null;
      if (entity.mtype !== this.current_type) continue;
      if (!entity.target) new_target = entity;
      else if (parent.entities[entity.target]?.ctype === "merchant") {
        // Override any future checks. SAVE THE MERCHANT!
        target = entity;
        break;
      } else if (this.attack_mode === "single" && Object.keys(get_party()).includes(entity.target)) {
        new_target = entity;
      } else if (this.attack_mode === "multiple" && !Object.keys(get_party()).includes(entity.target)) {
        new_target = entity;
      }
      if (target === null) target = new_target;
      else if (new_target && cpos.distanceFromSqr(epos) < cpos.distanceFromSqr(Vector.fromEntity(target))) target = new_target;
    }
    return target;
  }

  async attack(target: Entity) {
    change_target(target);
    let k = setInterval(() => { this.kite(target) }, 250);
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
        if (distanceSquared !== squared) move = true;
      } else {
        if (distanceSquared < squared) move = true;
      }

      if (move) {
        pos = entityPos.pointTowards(pos, distanceToBe);
      }
    }

    move(pos.x, pos.y);
  }
}

export class MerchantCharacter extends BaseCharacter {
  static itemsToTake: ItemKey[] = [
    "beewings", "crabclaw", "gslime", "gem0", "seashell", "stinger", "hpbelt",
    "ringsj", "hpamulet", "wcap", "wshoes", "intscroll"
  ];
  characterInfo: {[name: string]: LocalChacterInfo} = {};
  updateTask: NodeJS.Timer | null = null;
  standTask: NodeJS.Timer | null = null;
  inspectMerchantTask: NodeJS.Timer | null = null;

  constructor(ch: Character) {
    super(ch);
    this.updateCharacterInfo();
  }

  startTasks() {
    super.startTasks();

    if (this.updateTask === null)
      this.updateTask = setInterval(() => { this.updateCharacterInfo() }, 30_000);
    if (this.standTask === null)
      this.standTask = setInterval(() => { this.open_close_stand() }, 150);
    if (this.inspectMerchantTask === null)
      this.inspectMerchantTask = setInterval(() => { this.inspectNearbyMerchants() }, 5_000);
    
    this.taskController.enqueueTask(new CheckUpgrade(this, this.taskController));
    this.taskController.enqueueTask(new CheckCompound(this, this.taskController));
  }

  async run() {
    if (this.bank.noInfo()) {
      await this.bank.updateInfo();
      await sleep(1_000);
    }

    //if (this.getCompoundableItemsFromBank().length > 0) this.taskController.enqueueTask(new CompoundItems(this), 100);

    if (this.needFarmerRun()) this.taskController.enqueueTask(new ReplenishFarmersTask(this), 500);
  }

  open_close_stand() {
    if (is_moving(character) && character.standed) {
      close_stand();
    } else if (!is_moving(character) && !character.standed) {
      open_stand();
    }
  }

  async cleanInventory() {
    let keep = ["hpot0", "mpot0", "stand0"]
    let pos: number[] = [];
    let sellPos: number[] = [];
    for (let i in character.items) {
      let item = character.items[i];
      if (item && !keep.includes(item.name)) {
        let data = Items[item.name];
        if (data && data.vendor?.sell === true) {
          if (this.bank.items[item.name]?.getTotal() ?? 0 >= data.vendor.keep) {
            sellPos.push(Number(i));
            continue;
          }
        }
        pos.push(Number(i));
      }
    }

    console.log(sellPos);
    if (sellPos.length > 0) {
      await this.move("market");
      for (let pos of sellPos) {
        try {
          await sell(pos, character.items[pos].q ?? 1);
        } catch {
          console.error("Item not present.");
        }
      }
    }

    await this.bank.storeItems(pos);

    if (character.gold > 2_000_000) {
      await this.bank.depositGold(character.gold - 2_000_000);
    }
  }

  async farmerRun() {
    this.taskController.enqueueTask(new ReplenishFarmersTask(this), 600);
  }

  async buy(item: ItemKey, amount: number): Promise<number> {
    if (amount === 0) return -1;
    let i = Items[item];
    if (i === undefined || !i.vendor?.buy) return -1;
    let neededGold = amount * i.price;
    if (neededGold > character.gold) {
      if (this.bank.gold >= neededGold - character.gold)
        await this.bank.withdrawGold(neededGold - character.gold);
      else
        return -1;
    }
    await this.move(i.vendor.buyLocation);
    let data = await buy_with_gold(item, amount);
    return data.num;
  }

  async bulk_buy(items: [item: ItemKey, amount: number][], allowBank: boolean = false): Promise<number[]> {
    let totalGold = 0;
    let nums: number[] = [];
    for (let index in items) {
      let [item, amount] = items[index];
      let i = Items[item];
      if (i === undefined || !i.vendor?.buy) return [];

      if (allowBank && amount > 0) {
        let b = this.bank.items[item];
        if (b !== undefined) {
          let results = await b.getItem(amount);
          results.forEach((pos) => { 
            let item = character.items[pos];
            amount -= item.q || 1;
            items[index][1] -= item.q || 1;
            if (nums.indexOf(pos) === -1)
              nums.push(pos);
          });
        }
      }
      totalGold += amount * i.price;
    }

    if (totalGold > character.gold) {
      if (this.bank.gold >= totalGold - character.gold)
        await this.bank.withdrawGold(totalGold - character.gold);
      else
        return [];
    }
    
    for (let [item, amount] of items) {
      if (amount <= 0) {
        nums.push(-1);
        continue;
      }
      let i = Items[item];
      if (i.vendor) await this.move(i.vendor.buyLocation);
      let data = await buy_with_gold(item, amount);
      if (nums.indexOf(data.num) === -1)
        nums.push(data.num);
    }
    return nums;
  }

  needFarmerRun(): boolean {
    var go = false;
    for (var name in this.characterInfo) {
      let char = this.characterInfo[name];
      if (this.getTakableItems(char).length > 10) go = true;
      if (char.gold >= 100_000) go = true;
      if (getItemQuantity("hpot0", char.items, char.isize) < 100) go = true;
      if (getItemQuantity("mpot0", char.items, char.isize) < 100) go = true;
    }
    return go;
  }

  getTakableItems(char: LocalChacterInfo): [number, number][] {
    var items: [number, number][] = [];
    let save = ["hpot0", "mpot0"];
    for (let i = 0; i < char.isize; i++) {
      if (char.items[i] && !save.includes(char.items[i].name))
        items.push([i, char.items[i].q || 1]);
    }
    return items;
  }

  async updateCharacterInfo() {
    var cData = await this.CM.gatherAllCharacterInfo();
    this.characterInfo = cData;
    if (this.leader !== null && !Object.keys(cData).includes(this.leader)) {
      this.leader = null;
    }
    for (let name in cData) {
      let char = cData[name];
      let invite = false;
      if (this.leader == null) {
        this.leader = char.name;
      }
      if (char.leader !== this.leader) {
        this.CM.requestSetLeader(char.name, this.leader);
      }
      if (char.party === null) {
        invite = true;
      } else if (char.party !== character.name) {
        invite = true;
        await this.CM.requestLeaveParty(char.name);
      }

      if (invite) {
        send_party_invite(name);
        this.CM.requestPartyAccept(name);
      }
    }
  }

  inspectNearbyMerchants() {
    for (var name in parent.entities) {
      let char = parent.entities[name];
      if (!char.player || char.ctype != "merchant") continue;
      for (var ename in char.slots) {
        if (!ename.startsWith("trade")) continue;
        let item = char.slots[<TradeSlotType>ename];
        if (item && item.giveaway && !Object.values(<Record<string, string>>item.registry).includes(character.name)) {
          join_giveaway(name, <TradeSlotType>ename, item.rid);
        }
      }
    }
  }
}

function autoRespawn() {
  if (character.rip) {
    respawn();
  }
}

function get_position(char: LocalChacterInfo | string): IPosition {
  if (typeof char != "string")
    char = char.name;
  return get(`${char}_pos`);
}