import { BankPackTypeItemsOnly, CharacterBankInfos, ItemInfo, ItemKey, MapKey } from "typed-adventureland";
import { BaseCharacter } from "./Character";

export type BankPosition = [pack: BankPack, pos: number, item: ItemData];

export interface ItemData extends ItemInfo {
  bank_item: BankItem;
}

export class Bank {
  char: BaseCharacter;
  bank: CharacterBankInfos = <CharacterBankInfos>{};
  gold: number = 0;
  items: {[name: string]: BankItem} = {};
  packs: {[name: string]: BankPack} = {};
  constructor(ch: BaseCharacter) {
    this.char = ch;
  }

  /**
   * Go the the map that contains the bank pack.
   * @param pack The pack to go to.
   */
  async moveToPack(pack: BankPack | BankPackTypeItemsOnly | "gold") {
    let map: MapKey;
    if (pack === "gold") {
      map = "bank";
    } else if (pack instanceof BankPack) {
      map = bank_packs[pack.name][0];
    } else {
      map = bank_packs[pack][0];
    }
    while (character.map !== map) {
      console.log(character.map, map);
      await this.char.move(map);
      console.log("Done Moving");
      await sleep(500);
    }
  }

  async updateInfo() {
    console.log("Updating Information");
    await this.moveToPack("items0");
    await sleep(500);
    let bankInfo = <CharacterBankInfos>character.bank;
    if (bankInfo === null) {
      await this.updateInfo();
      return;
    }
    this.bank = bankInfo;
    this.gold = bankInfo?.gold || 0;
    console.log("Building Items");
    this.buildItems();
    console.log(this.bank);
  }

  buildItems() {
    this.items = {};
    for (let pname in this.bank) {
      let pack = new BankPack(this, <BankPackTypeItemsOnly>pname);
      this.packs[pack.name] = pack;
      let pack_data = this.bank[<BankPackTypeItemsOnly>pname];
      for (let i in pack_data) {
        let item = pack_data[i];
        if (item !== null) {
          console.log("Adding: ", item.name);
          this._addItemPosition(pack, Number(i), item);
        }
      }
    }
  }

  _addItemPosition(pack: BankPack, pos: number, item: ItemInfo) {
    if (this.items[item.name] === undefined)
      this.items[item.name] = new BankItem(this, item.name);

    let itemTemp: any = { ...item };
    itemTemp.bank_item = this.items[item.name];

    this.items[item.name].addPosition([pack, pos, <ItemData>itemTemp]);
  }

  async depositGold(amount: number): Promise<void> {
    let amt = amount;
    if (amt > character.gold) {
      amt = character.gold;
    } else if (amt < 1) {
      amt = 1;
    }

    await this.moveToPack("gold");
    bank_deposit(amt);
    this.gold += amt;
  }

  async withdrawGold(amount: number): Promise<void> {
    let amt = amount;
    if (amt > this.gold) {
      amt = this.gold;
    } else if (amt < 1) {
      amt = 1;
    }

    await this.moveToPack("gold");
    bank_withdraw(amt);
    this.gold -= amt;
  }

  findItems(filter: ((i: ItemInfo) => boolean)): BankPosition[] {
    let positions: BankPosition[] = [];
    for (let name in this.items) {
      let item = this.items[name];
      positions = positions.concat(item.findItem(filter));
    }
    return positions;
  }

  /**
   * 
   * @param pos The BankPosition of the item
   * @param quantity The amount of items to fetch, leave blank for entire stack.
   * @returns The quantity of items grabbed.
   */
  async _getItemFromPosition(pos: BankPosition, quantity: number = 0): Promise<number> {
    if (pos[1] > 41 || pos[1] < 0) {
      console.log(`${pos[1]} is outside of allowed range!`);
      return 0;
    }
    await this.moveToPack(pos[0]);
    if (quantity > 0 && quantity < (pos[2].q || 1)) {
      await bank_retrieve(pos[0].name, pos[1], 41);
      split(41, quantity);
      await bank_store(41, pos[0].name, pos[1]);

      if (pos[2].q) 
        pos[2].q -= quantity;

      return quantity;
    }
    await bank_retrieve(pos[0].name, pos[1]);
    this.items[pos[2].name].removePosition(pos);

    return pos[2].q || 1;
  }

  /**
   * Get items from an array of BankPositions
   * @param positions An array of BankPosition to grab from.
   * @param quantity The total quantity of items to grab. 0 disables.
   * @returns Returns the quantity grabbed.
   */
  async getItemFromPositions(positions: BankPosition[], quantity: number = 0) {
    let grabbed = 0;
    for (var i in positions) {
      let pos = positions[i];
      grabbed += await this._getItemFromPosition(pos, quantity);
      if (quantity > 0 && grabbed >= quantity) break;
    }
    return grabbed;
  }

  /**
   * Gets all items that match the filter from the bank. For quantity support 
   * use `Bank.items["itemname"].getItem(quantity, filter?)`.
   * @param filter The filter that determines if an item should be grabbed.
   */
  async getItems(filter: ((i: ItemInfo) => boolean)) {
    let positions = this.findItems(filter);
    if (positions.length > 0) {
      await this.getItemFromPositions(positions);
    }
  }

  /**
   * Store items into the bank.
   * @param ipos An array of inventory positions to store.
   * @returns The amount of stacks stored. Should be the same as ipos.length if everything worked.
   */
  async storeItems(ipos: number[]): Promise<number> {
    let stored = 0;
    for (let pos of ipos) {
      let item = character.items[pos];
      if (item === undefined) {
        console.log("Can't store undefined: ", pos);
        continue;
      }

      // If the item is stackable AND this item already has a BankItem associated with it.
      if (item.q !== undefined && this.items[item.name]) {
        let cont = false;
        let meta = G.items[item.name];
        let spots = this.items[item.name].findItem();
        for (let i in spots) {
          let spot = spots[i];
          if (<number>meta.s - <number>spot[2].q >= item.q) {
            // By pulling this item into the character inventory, we will cause it to stack the items.
            await this._getItemFromPosition(spot);
            item = character.items[pos];
            break;
          }
        }
      }


      for (let name in this.packs) {
        let pack = this.packs[name];
        let free = pack.getFreeSlot();
        if (free !== null) {
          await this.moveToPack(pack);
          this._addItemPosition(pack, free, item);
          await bank_store(pos, pack.name, free);
          stored++;
          break;
        }
      }
    }
    return stored;
  }

  noInfo() {
    if (Object.keys(<object>this.bank).length > 0) 
      return false;
    return true;
  }
}

class BankPack {
  bank: Bank;
  name: BankPackTypeItemsOnly;
  items: (ItemData | null)[] = [];
  size: number = 42;
  constructor(bank: Bank, name: BankPackTypeItemsOnly) {
    this.bank = bank;
    this.name = name;

    for (var i = 0; i < 42; i++) this.items.push(null);
  }

  _addItem(item: ItemData, pos: number): ItemData | null {
    let current = this.items[pos];
    this.items[pos] = item;
    return current;
  }

  _removeItem(pos: number): ItemData | null {
    let current = this.items[pos];
    this.items[pos] = null;
    return current;
  }

  /**
   * Get a free slot in the pack.
   * @returns The slot number that's free or null.
   */
  getFreeSlot(): number | null {
    for (let i in this.items) {
      let item = this.items[i];
      if (item === null) return Number(i);
    }
    if (this.items.length > 41) return null;
    return this.items.length;
  }

  /**
   * Gets the total amount of slots that are empty.
   * @returns The total number of slots available.
   */
  getTotalFreeSlots(): number {
    let total = 42 - this.items.length;
    for (let i in this.items) {
      if (this.items[i] === null) total++;
    }

    return total;
  }
}

class BankItem {
  bank: Bank;
  name: ItemKey;
  positions: BankPosition[] = [];

  constructor(bank: Bank, name: ItemKey) {
    this.bank = bank;
    this.name = name;
  }

  /**
   * Find all the positions of the items. Optionally filtered.
   * @param filter Filters the results
   * @returns An array of BankPosition of the item.
   */
  findItem(filter: ((i: ItemInfo) => boolean) | null = null): BankPosition[] {
    let positions: BankPosition[] = [];

    for (let i in this.positions) {
      let pos = this.positions[i];
      let add = true;
      if (filter !== null) {
        if (!filter(pos[2]))
          add = false;
      }

      if (add) {
        positions.push(pos);
      }
    }

    return positions;
  }

  /**
   * Gets one or more of the item that fits the filter.
   * @param quantity Quantity of the item to grab. Defaults to 1.
   * @param filter A filter of the items to grab. Defaults to null.
   * @returns Returns quantity grabbed.
   */
  async getItem(quantity: number = 1, filter: ((i: ItemInfo) => boolean) | null = null) {
    if (character.map !== "bank")
      await this.bank.char.move("bank");
    let positions = this.findItem(filter);
    let grabbed = await this.bank.getItemFromPositions(positions, quantity);
    return grabbed;
  }

  getTotal(filter: ((i: ItemInfo) => boolean) | null = null): number {
    let total = 0;
    let positions = this.findItem(filter);
    
    for (var i in positions) {
      let pos = positions[i];
      total += pos[2].q || 1;
    }

    return total;
  }

  hasItem(item: ItemInfo): boolean {
    if (item.name !== this.name) return false;
    for (let i in this.positions) {
      let pos = this.positions[i];
      if (item.level !== undefined) {
        if (item.level === pos[2].level) return true;
      } else {
        return true;
      }
    }
    return false;
  }

  addPosition(position: BankPosition) {
    this.positions.push(position);
    position[0]._addItem(position[2], position[1]);
  }

  removePosition(position: BankPosition): boolean {
    for (let i in this.positions) {
      let pos = this.positions[i];
      if (pos[0].name === position[0].name && pos[1] === position[1]) {
        this.positions.splice(Number(i), 1);
        pos[0]._removeItem(pos[1]);
        return true;
      }
    }
    return false;
  }
}