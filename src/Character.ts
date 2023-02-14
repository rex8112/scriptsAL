import { BankPackTypeItemsOnly, CharacterBankInfos, ClassKey, IPosition, ItemInfo, ItemKey, TradeItemInfo, TradeSlotType } from "typed-adventureland";
import { Mover } from "./Mover";
import { CMRequests } from "./CMRequests";
import { LocalChacterInfo } from "./Types";
import { CharacterMessager } from "./CharacterMessager";
import { getItemPosition, getItemQuantity } from "./Utils";
import { Bank, BankPosition } from "./Bank";

var globalAny: any = globalThis;

export class BaseCharacter {
  original: Character;
  class: ClassKey;
  name: string;
  CM: CharacterMessager;
  working: boolean = false;
  bank: Bank;

  constructor(ch: Character) {
    this.original = ch;
    this.class = ch.ctype;
    this.name = ch.name;
    this.CM = new CharacterMessager();
    this.bank = new Bank(this);
    globalAny.char = this;
  }

  async run() {}

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
  move(dest: SmartMoveToDestination) {
    return Mover.move(dest);
  }

  oneAtATime(func: () => Promise<void>) {
    if (this.working === true) return;
    this.working = true;
    func().finally(() => {this.working = false});
  }
}

export class MerchantCharacter extends BaseCharacter {
  static itemsToTake: ItemKey[] = [
    "beewings", "crabclaw", "gslime", "gem0", "seashell", "stinger", "hpbelt",
    "ringsj", "hpamulet", "wcap", "wshoes", "intscroll"
  ];
  characterInfo: {[name: string]: LocalChacterInfo} = {};
  updateTask: NodeJS.Timer | null = null;
  potionUseTask: NodeJS.Timer | null = null;
  standTask: NodeJS.Timer | null = null;
  inspectMerchantTask: NodeJS.Timer | null = null;

  constructor(ch: Character) {
    super(ch);
    this.startTasks();
    this.updateCharacterInfo();
  }

  startTasks() {
    if (this.updateTask === null)
      this.updateTask = setInterval(this.updateCharacterInfo.bind(this), 30_000);
    if (this.potionUseTask === null)
      this.potionUseTask = setInterval(use_hp_or_mp, 250);
    if (this.standTask === null)
      this.standTask = setInterval(this.open_close_stand.bind(this), 150);
    if (this.inspectMerchantTask === null)
      this.inspectMerchantTask = setInterval(this.inspectNearbyMerchants.bind(this), 5_000);
  }

  async run() {
    if (this.bank.noInfo()) await this.bank.updateInfo();

    if (this.getCompoundableItemsFromBank().length > 0) await this.compoundItems();

    if (this.getUpgradableItems().length > 0 
        || this.getUpgradableItemsInBank().length > 0)
      await this.upgradeItems();

    if (this.needRestock()) await this.restock();

    if (this.needFarmerRun()) await this.farmerRun();

    setTimeout(this.run.bind(this), 1_000);
  }

  needRestock() {
    let hpots = getItemQuantity("hpot0", character.items, character.isize);
    let mpots = getItemQuantity("mpot0", character.items, character.isize)
    if (hpots < 1_000) return true;
    if (mpots < 1_000) return true;
    return false;
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

  async restock() {
    await this.move("potions");

    let hpots = getItemQuantity("hpot0", character.items, character.isize);
    let mpots = getItemQuantity("mpot0", character.items, character.isize)
    if (hpots < 1_000) buy("hpot0", 1_000 - hpots);
    if (mpots < 1_000) buy("mpot0", 1_000 - mpots);
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

  async upgradeItems() {
    var totalAttempts = 0;
    await this.bank.getItems(this.isUpgradable);
    var items = this.getUpgradableItems();
    for (var i in items) totalAttempts += items[i][1];
    var scrolls = getItemQuantity("scroll0", character.items, character.isize);
    if (scrolls < totalAttempts) {
      set_message("Restocking");
      let grabbed = 0;
      if (this.bank.items["scroll0"]) {
        grabbed += await this.bank.items["scroll0"].getItem(totalAttempts - scrolls);
      }
      if (scrolls + grabbed < totalAttempts) {
        await this.move("scrolls");
        buy("scroll0", totalAttempts - scrolls);
      }
    }
    await this.move("upgrade");
    set_message("Upgrading");
    let returnItems = [];
    for (var i in items) {
      let pair = items[i];
      let lastResult;
      for (var y = 0; y < pair[1]; y++) {
        lastResult = await upgrade(pair[0], <number>getItemPosition("scroll0", character.items, character.isize));
        if (lastResult.success === false) break;
      }
      if (lastResult?.success) {
        returnItems.push(lastResult.num);
      }
    }
    if (returnItems.length > 0)
      await this.bank.storeItems(returnItems);
    await this.cleanInventory();
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
        if (item.name === pos[0][2].name && item.level === pos[0][2].level) {
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
      await this.move("scrolls");
      buy("cscroll0", totalAttempts - scrolls);
    }
    await this.move("compound");
    set_message("Compounding");
    let returnItems = [];
    for (var i in items) {
      let pos = items[i];
      let result = await compound(pos[0], pos[1], pos[2], <number>getItemPosition("cscroll0", character.items, character.isize));
      if (result.success) {
        returnItems.push(result.num);
      }
    }
    if (returnItems.length > 0)
      await this.bank.storeItems(returnItems);
    await this.cleanInventory();
  }

  /* async sortBank() {
    if (this.bank === null) return;
    console.log("Building index");
    var items: {[name in ItemKey]: [BankPackTypeItemsOnly, number, number][]} = {};
    for (var pack in this.bank) {
      let bank = this.bank[<BankPackTypeItemsOnly>pack];
      for (var i in bank) {
        var item = bank[i];
        if (item === null) continue;

        if (items[item.name]) {
          items[item.name].push([<BankPackTypeItemsOnly>pack, Number(i), item.q || 1]);
        } else {
          items[item.name] = [[<BankPackTypeItemsOnly>pack, Number(i), item.q || 1]];
        }
      }
    }

    await this.move("bank");

    console.log("Beginning Sort", items);
    for (var name in items) {
      let item = items[name];
      if (G.items[name].s > 1 && item.length > 1) {
        let first = item[0];
        let rest = item.splice(1);
        for (let i = rest.length - 1; i >= 0; i--) {
          console.log("Sorting");
          let int = rest[i];
          let res: any = await bank_retrieve(int[0], int[1], 41);
          if (res.success) {
            await bank_store(41, first[0]);
          } else {
            await bank_store(41, int[0], int[1]);
          }
        }
      }
    }

    console.log("Sort Finished");
    this.sorted = true;
    await this.updateBankInfo();
  } */

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
    for (let i = 0; i < char.isize; i++) {
      if (char.items[i] && MerchantCharacter.itemsToTake.includes(char.items[i].name))
        items.push([i, char.items[i].q || 1]);
    }
    return items;
  }

  async updateCharacterInfo() {
    var cData = await this.CM.gatherAllCharacterInfo();
    this.characterInfo = cData;
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

function get_position(char: LocalChacterInfo): IPosition {
  return get(`${char.name}_pos`);
}