import { BankPackTypeItemsOnly, CharacterBankInfos, ClassKey, Entity, IPosition, ItemInfo, ItemKey, TradeItemInfo, TradeSlotType } from "typed-adventureland";
import { Mover } from "./Mover";
import { CMRequests } from "./CMRequests";
import { LocalChacterInfo } from "./Types";
import { CharacterMessager } from "./CharacterMessager";
import { getItemPosition, getItemQuantity, smartUseHpOrMp } from "./Utils";
import { Bank, BankPosition } from "./Bank";
import { TaskController } from "./Tasks";
import { CheckCompound, CompoundItems } from "./Tasks/CompoundItems";
import { CheckUpgrade, UpgradeItems } from "./Tasks/UpgradeItems";
import { ReplenishFarmersTask } from "./Tasks/ReplenishFarmers";
import { Vector } from "./Utils/Vector";
import { Items } from "./Items";

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
  mon_type = "minimush";

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
      let target = get_targeted_monster();
      if (target === null) {
        target = get_nearest_monster({no_target: true, type: this.mon_type});
      }
      if (target === null) {
        await this.move(this.mon_type);
        target = get_nearest_monster({no_target: true, type: this.mon_type});
      }
      if (target === null) return;

      await this.attack(target);
    }
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
    let pos = Vector.fromRealPosition(character);

    for (let id in parent.entities) {
      let entity = parent.entities[id];
      if (entity.type !== "monster") continue;
      let entityPos = Vector.fromRealPosition(entity);
      let distanceToBe;
      if (character.range > entity.range) {
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
    for (let i in character.items) {
      let item = character.items[i];
      if (item && !keep.includes(item.name)) {
        pos.push(Number(i));
      }
    }

    await this.bank.storeItems(pos);

    if (character.gold > 2_000_000) {
      await this.bank.depositGold(character.gold - 2_000_000);
    }
  }

  async farmerRun() {
    var characterCopy = this.characterInfo;
    for (var name in characterCopy) {
      var char = characterCopy[name];
      if (name == character.name || !Object.keys(this.characterInfo).includes(name)) continue;
      set_message("Restocking");
      let position = get_position(char);
      while (simple_distance(character, position) > 100) {
        position = get_position(char);
        await this.move(position);
        game_log("Move Finished");
        await sleep(150);
      }
      let promises = [];
      let items = this.getTakableItems(char).slice(0, 10);

      promises.push(this.CM.requestGold(name, char.gold));
      promises.push(this.CM.requestItems(name, items));

      let hpots = getItemPosition("hpot0", character.items, character.isize);
      let hneeded = 300 - getItemQuantity("hpot0", char.items, char.isize)
      let mpots = getItemPosition("mpot0", character.items, character.isize);
      let mneeded = 300 - getItemQuantity("mpot0", char.items, char.isize);

      if (hpots != null && hneeded > 0) await send_item(name, hpots, hneeded);
      if (mpots != null && mneeded > 0) await send_item(name, mpots, mneeded);

      set_message("Waiting");
      await Promise.all(promises);
    }
    await this.updateCharacterInfo();
    await this.cleanInventory();
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
    await this.move(i.vendor.location);
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
      if (i.vendor) await this.move(i.vendor.location);
      let data = await buy_with_gold(item, amount);
      if (nums.indexOf(data.num) === -1)
        nums.push(data.num);
    }
    return nums;
  }

  async compoundItems() {
    var positions = this.getCompoundableItemsFromBank();
    let items: [number, number, number][] = [];
    let lastInv = 0;
    for (let i in positions) {
      let pos = positions[i];
      await this.bank.getItemFromPositions(pos);
      let compItems = [];
      while (true) {
        if (lastInv > 41 || compItems.length >= 3) break;

        let item = character.items[lastInv];
        if (item && item.name === pos[0][2].name && item.level === pos[0][2].level) {
          compItems.push(lastInv);
        }
        lastInv++;
      }
      items.push(<[number, number, number]>compItems);
    }
    var totalAttempts = items.length;
    var scrolls = getItemQuantity("cscroll0", character.items, character.isize);
    if (scrolls < totalAttempts) {
      set_message("Restocking");
      await this.move("market");
      buy("cscroll0", totalAttempts - scrolls);
    }
    await this.move("market");
    set_message("Compounding");
    let returnItems = [];
    for (var i in items) {
      let pos = items[i];
      let result = await compound(pos[0], pos[1], pos[2], <number>getItemPosition("cscroll0", character.items, character.isize));
      if (result.success) {
        returnItems.push(Math.min(...pos));
      }
    }
    if (returnItems.length > 0)
      await this.bank.storeItems(returnItems);
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

  isUpgradable(item: ItemInfo): boolean {
    let meta = G.items[item.name];
    if (meta.grades && meta.grades[0] > 0) {
      if (meta.upgrade && meta.grades[0] > <number>item.level) return true;
    }
    return false;
  }

  getUpgradableItemsInBank() {
    return this.bank.findItems(this.isUpgradable);
  }

  /**
   * 
   * @returns Returns an array of number pairs: [islot, times_to_upgrade]
   */
  getUpgradableItems(): [number, number][] {
    var items: [number, number][] = [];
    for (let i = 0; i < character.isize; i++) {
      if (character.items[i]) {
        let item = character.items[i];
        let meta = G.items[item.name];
        if (this.isUpgradable(item) && meta.grades) 
          items.push([i, meta.grades[0] - <number>item.level]);
      }
    }
    return items;
  }

  getCompoundableItemsFromBank(): [BankPosition, BankPosition, BankPosition][] {
    let positions = this.bank.findItems((item) => {
      let meta = G.items[item.name];
      if (meta.grades && (meta.grades[0] < 1 || meta.grades[0] < <number>item.level)) return false;
      if (meta.compound) return true;
      return false;
    })
    var items: {[name: string]: BankPosition[]} = {};
    for (let i in positions) {
      let pos = positions[i];
      let item = pos[2];
      let name = `${item.name}${item.level}`;
      if (items[name] === undefined)
        items[name] = [pos];
      else
        items[name].push(pos);
    }

    let pos: [BankPosition, BankPosition, BankPosition][] = [];
    for (var name in items) {
      let positions = items[name];
      if (positions.length < 3) continue;
      let compounds = Math.floor(positions.length / 3);
      for (let i = 0; i < compounds; i++) {
        let start = i * 3;
        pos.push([positions[start], positions[start+1], positions[start+2]])
      }
    }
    return pos;
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