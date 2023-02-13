import { BankPackTypeItemsOnly, CharacterBankInfos, ItemInfo, ItemKey, MapKey } from "typed-adventureland";
import { BaseCharacter } from "./Character";

export type BankPosition = [pack: BankPackTypeItemsOnly, pos: number, item: ItemInfo];

export class Bank {
  char: BaseCharacter;
  bank: CharacterBankInfos = <CharacterBankInfos>{};
  items: {[name: string]: BankItem} = {};
  constructor(ch: BaseCharacter) {
    this.char = ch;
  }

  async moveToPack(pack: BankPackTypeItemsOnly | "gold") {
    let map: MapKey;
    if (pack === "gold") {
      map = "bank";
    } else {
      map = bank_packs[pack][0];
    }
    if (character.map !== map) {
      await this.char.move(map);
    }
  }

  async updateInfo() {
    if (character.map != "bank") {
      await this.char.move("bank");
    }
    let bankInfo = <CharacterBankInfos>character.bank;
    this.bank = bankInfo;
    this.buildItems();
  }

  buildItems() {
    let items: {[name: string]: BankItem} = {};
    for (let pname in this.bank) {
      let pack = this.bank[<BankPackTypeItemsOnly>pname];
      for (let i in pack) {
        let item = pack[i];
        if (item) {
          if (items[item.name] === undefined)
            items[item.name] = new BankItem(this, item.name);

          items[item.name].addPosition([<BankPackTypeItemsOnly>pname, Number(i), item]);
        }
      }
    }
    this.items = items;
  }

  getFreeSlots(): {[pack in BankPackTypeItemsOnly]: number} {
    let slots: {[pack in BankPackTypeItemsOnly]: number} = <{[pack in BankPackTypeItemsOnly]: number}>{};

    for (let name in this.bank) {
      let info = this.bank[<BankPackTypeItemsOnly>name];
      let free = 42 - info.length;
      for (let islot in info) {
        let slot = info[islot];
        if (slot === null) free += 1;
      }
      slots[<BankPackTypeItemsOnly>name] = free;
    }
    return slots;
  }

  findItems(filter: ((i: ItemInfo) => boolean)): BankPosition[] {
    let positions: BankPosition[] = [];
    for (let name in this.items) {
      let item = this.items[name];
      positions = positions.concat(item.findItem(filter));
    }
    return positions;
  }

  async _getItemFromPosition(pos: BankPosition, quantity: number = 0): Promise<number> {
    await this.moveToPack(pos[0]);
    if (quantity > 0 && quantity < (pos[2].q || 1)) {
      await bank_retrieve(pos[0], pos[1], 41);
      split(41, quantity);
      await bank_store(41, pos[0], pos[1]);
      return quantity;
    }
    await bank_retrieve(pos[0], pos[1]);
    return pos[2].q || 1;
  }

  async _getItemFromPositions(positions: BankPosition[], quantity: number = 0) {
    let grabbed = 0;
    for (var i in positions) {
      let pos = positions[i];
      grabbed += await this._getItemFromPosition(pos, quantity);
      if (quantity > 0 && grabbed >= quantity) break;
    }
    return grabbed;
  }

  async getItems(filter: ((i: ItemInfo) => boolean)) {
    let positions = this.findItems(filter);
    if (positions.length > 0) {
      await this._getItemFromPositions(positions);
      await this.updateInfo();
    }
  }

  async storeItems(ipos: number[]) {
    let freeSlots = this.getFreeSlots();
    let stored = 0;
    for (let pos of ipos) {
      for (let name in freeSlots) {
        let free = freeSlots[<BankPackTypeItemsOnly>name];
        if (free > 0) {
          await this.moveToPack(<BankPackTypeItemsOnly>name);
          await bank_store(pos, <BankPackTypeItemsOnly>name);
          freeSlots[<BankPackTypeItemsOnly>name]--;
          stored++;
          break;
        }
      }
    }
    await this.updateInfo();
    return stored;
  }

  noInfo() {
    if (Object.keys(<object>this.bank).length > 0) 
      return false;
    return true;
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

  async getItem(quantity: number = 1, filter: ((i: ItemInfo) => boolean) | null = null) {
    if (character.map !== "bank")
      await this.bank.char.move("bank");
    let positions = this.findItem(filter);
    let grabbed = await this.bank._getItemFromPositions(positions, quantity);
    await this.bank.updateInfo();
    return grabbed;
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
  }
}