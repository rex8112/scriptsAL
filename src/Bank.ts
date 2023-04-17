import AL, { BankInfo, BankPackName, ItemData, ItemName, MapName } from "alclient";
import { BaseCharacter } from "./Character.js";
import { getFreeSlot, sleep } from "./Utils/Functions.js";
import { CustomCharacter } from "./Types.js";

export type BankPosition = [pack: BankPack, pos: number, item: BankItemData];

export interface BankItemData extends ItemData {
  bank_item: BankItem;
}

export class Bank {
  gold: number = 0;
  items: {[name: string]: BankItem} = {};
  packs: {[name: string]: BankPack} = {};
  constructor() {}

  /**
   * Go the the map that contains the bank pack.
   * @param pack The pack to go to.
   */
  async moveToPack(char: BaseCharacter, pack: BankPack | BankPackName | "gold") {
    let map: MapName;
    try {
      map = "bank";
      /* if (pack === "gold") {
        map = "bank";
      } else if (pack instanceof BankPack) {
        map = bank_packs[pack.name][0];
      } else {
        map = bank_packs[pack][0];
      } */
    } catch (error) {
      console.error("Error in moveToPack: ", pack);
      throw(error);
    }
    while (char.ch.map !== map) {
      console.log(char.ch.map, map);
      await char.move(map);
      console.log("Done Moving");
      await sleep(500);
    }
  }

  async updateInfo(char: CustomCharacter) {
    console.log("Updating Information");
    await this.moveToPack(char, "items0");
    await sleep(500);
    let bankInfo = char.ch.bank;
    if (bankInfo === null) {
      await this.updateInfo(char);
      return;
    }
    this.gold = bankInfo?.gold || 0;
    console.log("Building Items");
    this.buildItems(bankInfo);
    console.log("Bank Initialization Finished");
  }

  buildItems(data: BankInfo) {
    this.items = {};
    for (let pname in data) {
      let pack = new BankPack(this, <BankPackName>pname);
      this.packs[pack.name] = pack;
      let pack_data = data[<BankPackName>pname];
      for (let i in pack_data) {
        let item = pack_data[Number(i)];
        if (item !== null) {
          this._addItemPosition(pack, Number(i), item);
        }
      }
    }
  }

  _addItemPosition(pack: BankPack, pos: number, item: ItemData) {
    if (this.items[item.name] === undefined)
      this.items[item.name] = new BankItem(this, item.name);

    let itemTemp: any = { ...item };
    itemTemp.bank_item = this.items[item.name];

    this.items[item.name].addPosition([pack, pos, <BankItemData>itemTemp]);
  }

  async depositGold(char: BaseCharacter, amount: number): Promise<void> {
    let amt = amount;
    if (amt > char.ch.gold) {
      amt = char.ch.gold;
    } else if (amt < 1) {
      amt = 1;
    }

    await this.moveToPack(char, "gold");
    await char.ch.depositGold(amt);
    this.gold += amt;
  }

  async withdrawGold(char: BaseCharacter, amount: number): Promise<number> {
    let amt = amount;
    if (amt > this.gold) {
      amt = this.gold;
    } else if (amt < 1) {
      amt = 1;
    }

    await this.moveToPack(char, "gold");
    await char.ch.withdrawGold(amt);
    this.gold -= amt;
    return amt;
  }

  findItems(filter: ((i: ItemData) => boolean)): BankPosition[] {
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
   * @returns The slot of the retrieved item and the quantity retrieved.
   */
  async _getItemFromPosition(char: BaseCharacter, pos: BankPosition, quantity: number = 0): Promise<[number | null, number]> {
    if (pos[1] > 41 || pos[1] < 0) {
      console.log(`${pos[1]} is outside of allowed range!`);
      return [null, 0];
    }
    await this.moveToPack(char, pos[0]);
    let num = getFreeSlot(char.ch.items, char.ch.isize);
    if (num === null || num >= 41)
      return [null, 0];
    if (quantity > 0 && quantity < (pos[2].q || 1)) {
      await char.ch.withdrawItem(pos[0].name, pos[1], 41);
      await char.ch.splitItem(41, quantity); // As long as the inventory doesn't change this split should put in the free slot found above.
      await char.ch.depositItem(41, pos[0].name, pos[1]);

      if (pos[2].q)
        pos[2].q -= quantity;

      return [num, quantity];
    }
    await char.ch.withdrawItem(pos[0].name, pos[1], num);
    this.items[pos[2].name].removePosition(pos);

    return [num, pos[2].q || 1];
  }

  /**
   * Get items from an array of BankPositions
   * @param positions An array of BankPosition to grab from.
   * @param quantity The total quantity of items to grab. 0 disables.
   * @returns Returns list of positions.
   */
  async getItemFromPositions(char: BaseCharacter, positions: BankPosition[], quantity: number = 0): Promise<number[]> {
    let grabbed = [];
    let qGrabbed = 0;
    for (var i in positions) {
      let pos = positions[i];
      let [num, q] = await this._getItemFromPosition(char, pos, quantity);
      if (num !== null) {
        qGrabbed += q;
        grabbed.push(num);
      }
      if (quantity > 0 && qGrabbed >= quantity) break;
    }
    return grabbed;
  }

  /**
   * Gets all items that match the filter from the bank. For quantity support 
   * use `Bank.items["itemname"].getItem(quantity, filter?)`.
   * @param filter The filter that determines if an item should be grabbed.
   */
  async getItems(char: BaseCharacter, filter: ((i: ItemData) => boolean)) {
    let positions = this.findItems(filter);
    if (positions.length > 0) {
      await this.getItemFromPositions(char, positions);
    }
  }

  /**
   * Store items into the bank.
   * @param ipos An array of inventory positions to store.
   * @returns The amount of stacks stored. Should be the same as ipos.length if everything worked.
   */
  async storeItems(char: BaseCharacter, ipos: number[]): Promise<number> {
    ipos.sort((a, b) => a - b);
    let stored = 0;
    let length = ipos.length;
    for (let i = 0; i < length; i++) {
      let orgPos = ipos[i];
      let item = char.ch.items[orgPos];
      if (item === null) {
        console.log("Can't store undefined: ", orgPos);
        continue;
      }

      // If the item is stackable AND this item already has a BankItem associated with it.
      if (item.q !== undefined && this.items[item.name]) {
        let cont = false;
        let meta = AL.Game.G.items[item.name];
        let spots = this.items[item.name].findItem();
        let left = item.q;
        for (let i in spots) {
          let spot = spots[i];
          if (<number>meta.s > item.q) {
            // By pulling this item into the character inventory, then using swap, we can stack the items.
            let [newPos, q] = await this._getItemFromPosition(char, spot);
            if (newPos !== null) {
              let newItem = <ItemData>char.ch.items[newPos]; // This slot was just filled, it isn't null.
              let room = <number>meta.s - <number>newItem.q;
              if (room >= left) {
                await char.ch.swapItems(orgPos, newPos);
                item = <ItemData>char.ch.items[orgPos]; // This can't be null since it couldn't all fit in new spot.
                break;
              } else {
                let freeSlot = getFreeSlot(char.ch.items, char.ch.isize);
                if (freeSlot) {
                  await char.ch.splitItem(orgPos, room);
                  await char.ch.swapItems(newPos, freeSlot);
                }
                length = ipos.push(newPos);
                left -= room;
              }
            }
          }
        }
      }


      for (let name in this.packs) {
        let pack = this.packs[name];
        let free = pack.getFreeSlot();
        if (free !== null) {
          await this.moveToPack(char, pack);
          this._addItemPosition(pack, free, item);
          await char.ch.depositItem(orgPos, pack.name, free);
          stored++;
          break;
        }
      }
    }
    return stored;
  }

  noInfo() {
    if (Object.keys(<object>this.packs).length > 0) 
      return false;
    return true;
  }
}

class BankPack {
  bank: Bank;
  name: BankPackName;
  items: (BankItemData | null)[] = [];
  size: number = 42;
  constructor(bank: Bank, name: BankPackName) {
    this.bank = bank;
    this.name = name;

    for (var i = 0; i < 42; i++) this.items.push(null);
  }

  _addItem(item: BankItemData, pos: number): BankItemData | null {
    let current = this.items[pos];
    this.items[pos] = item;
    return current;
  }

  _removeItem(pos: number): BankItemData | null {
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
  name: ItemName;
  positions: BankPosition[] = [];

  constructor(bank: Bank, name: ItemName) {
    this.bank = bank;
    this.name = name;
  }

  /**
   * Find all the positions of the items. Optionally filtered.
   * @param filter Filters the results
   * @returns An array of BankPosition of the item.
   */
  findItem(filter: ((i: ItemData) => boolean) | null = null): BankPosition[] {
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
   * @returns Returns new positions.
   */
  async getItem(char: BaseCharacter, quantity: number = 1, filter: ((i: ItemData) => boolean) | null = null): Promise<number[]> {
    if (char.ch.map !== "bank")
      await char.move("bank");
    let positions = this.findItem(filter);
    let grabbed = await this.bank.getItemFromPositions(char, positions, quantity);
    return grabbed;
  }

  getTotal(filter: ((i: ItemData) => boolean) | null = null): number {
    let total = 0;
    let positions = this.findItem(filter);
    
    for (var i in positions) {
      let pos = positions[i];
      total += pos[2].q || 1;
    }

    return total;
  }

  hasItem(item: ItemData): boolean {
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