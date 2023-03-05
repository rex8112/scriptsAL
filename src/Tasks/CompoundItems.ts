import { ItemInfo } from "typed-adventureland";
import { BankPosition } from "../Bank";
import { MerchantCharacter } from "../Character";
import { Items } from "../Items";
import { BackgroundTask, Task, TaskController } from "../Tasks";

export class CheckCompound extends BackgroundTask {
  name = "compound_check";

  displayName = "Compound Check";

  msinterval = 30_000;

  char: MerchantCharacter;
  controller: TaskController;

  constructor(char: MerchantCharacter, controller: TaskController) {
    super(char);
    this.char = char;
    this.controller = controller;
  }

  isCompoundable(item: ItemInfo): boolean {
    let i = Items[item.name];
    if (i && i.compound) return true;
    return false;
  }

  findCompoundables(): [first: BankPosition, second: BankPosition, third: BankPosition][] {
    let positions = this.char.bank.findItems(this.isCompoundable);
    let items: {[name: string]: [BankPosition, number][]} = {};
    console.log(positions);
    positions.forEach((pos) => {
      let name = pos[2].name;
      if (items[name] === undefined) items[name] = [];
      items[name].push([pos, <number>pos[2].level]);
    });
    console.log(items);

    let positionsToReturn: [first: BankPosition, second: BankPosition, third: BankPosition][] = [];
    let leveledItems: {[key: string]: BankPosition[]} = {};

    for (var iname in items) {
      let item = items[iname];
      let data = Items[iname];
      if (data.compound === undefined) continue;
      if (item.length <= data.compound.keep) continue;
      item.sort((a, b) => b[1] - a[1]);
      let firstZero = item.findIndex(i=>i[1] === 0);
      if (firstZero === -1) firstZero = 9999;

      let pruned = item.slice(Math.min(data.compound.keep, firstZero));
      pruned = pruned.filter((pos) => { return pos[1] < (data.compound?.max || 0) });

      for (let pos of pruned) {
        let key = pos[0][2].name + pos[0][2].level;
        if (leveledItems[key] === undefined) leveledItems[key] = [];
        leveledItems[key].push(pos[0]);
      }
    }
    console.log(leveledItems);

    for (let key in leveledItems) {
      let positions = leveledItems[key];
      let length = Math.floor(positions.length / 3);
      if (length < 1) continue;

      for (let i = 0; i < length; i++) {
        let x = i * 3;
        positionsToReturn.push([positions[x], positions[x+1], positions[x+2]]);
      }
    }
    console.log(positionsToReturn);
    return positionsToReturn;
  }

  async run_task(): Promise<void> {
    if (this.controller.taskEnqueued("compound_items")) return;

    let items = this.findCompoundables();
    if (items.length > 0)
      this.controller.enqueueTask(new CompoundItems(this.char, items), 100);
  }
}

export class CompoundItems extends Task {
  name = "compound_items";

  displayName = "Compound Items";

  cancellable = true;

  char: MerchantCharacter;
  items: [first: BankPosition, second: BankPosition, third: BankPosition][];

  constructor(char: MerchantCharacter, items: [first: BankPosition, second: BankPosition, third: BankPosition][]) {
    super(char);
    this.char = char;
    this.items = items;
  }

  getPriority(): number {
    return this._priority + Math.min(this.items.length * 30, 300);
  }

  async run_task(): Promise<void> {
    let items: [number, number, number][] = [];
    let normalAttempts = 0;
    let highAttempts = 0;
    for (let pos of this.items) {
      let result = await this.char.bank.getItemFromPositions(pos);
      let item = character.items[result[0]];
      let data = Items[item.name];
      if (data === undefined || data.meta.grades === undefined || item.level === undefined) continue;

      if (item.level < data.meta.grades[0]) {
        normalAttempts++;
      } else if (item.level < data.meta.grades[1]) {
        highAttempts++;
      } else continue;

      items.push(<[number, number, number]>result);
    }

    let [cscroll0, cscroll1] = await this.char.bulk_buy([["cscroll0", normalAttempts], ["cscroll1", highAttempts]], true);
    
    await this.char.move("market");
    set_message("Compounding");
    let returnItems = [];
    for (var i in items) {
      let pos = items[i];
      let item = character.items[pos[0]];
      let data = Items[item.name];
      if (data === undefined || data.meta.grades === undefined || item.level === undefined) continue;

      let scrollPos;
      if (item.level < data.meta.grades[0])
        scrollPos = cscroll0;
      else if (item.level < data.meta.grades[1])
        scrollPos = cscroll1;
      else continue;

      let result = await compound(pos[0], pos[1], pos[2], scrollPos);
      if (result.success) {
        returnItems.push(Math.min(...pos));
      }
    }
    if (returnItems.length > 0)
      await this.char.bank.storeItems(returnItems);
  }
}