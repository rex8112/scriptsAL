import { ItemInfo } from "typed-adventureland";
import { BankPosition } from "../Bank";
import { MerchantCharacter } from "../Character";
import { Task } from "../Tasks";
import { getItemPosition, getItemQuantity, get_position } from "../Utils";

export class CompoundItems extends Task {
  name = "compound_items";

  displayName = "Compound Items";

  cancellable = true;

  char: MerchantCharacter;

  constructor(char: MerchantCharacter) {
    super(char);
    this.char = char;
  }

  getPriority(): number {
    return this._priority;
  }

  getCompoundableItemsFromBank(): [BankPosition, BankPosition, BankPosition][] {
    let positions = this.char.bank.findItems((item) => {
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

  async run_task(): Promise<void> {
    var positions = this.getCompoundableItemsFromBank();
    let items: [number, number, number][] = [];
    let lastInv = 0;
    for (let i in positions) {
      let pos = positions[i];
      await this.char.bank.getItemFromPositions(pos);
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
      await this.char.buy("cscroll0", totalAttempts - scrolls);
    }
    await this.char.move("market");
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
      await this.char.bank.storeItems(returnItems);
  }
}