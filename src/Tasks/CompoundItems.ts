import AL, { ItemData } from "alclient";
import { BankPosition } from "../Bank.js";
import { MerchantCharacter } from "../Character.js";
import { Items } from "../Items.js";
import { BackgroundTask, Task, MerchantTaskController } from "../MerchantTasks.js";
import { MerchantController } from "../Controllers.js";

export class CheckCompound extends BackgroundTask {
  name = "compound_check";

  displayName = "Compound Check";

  msinterval = 30_000;

  mc: MerchantController;
  controller: MerchantTaskController;

  constructor(mc: MerchantController, controller: MerchantTaskController) {
    super(mc);
    this.mc = mc;
    this.controller = controller;
  }

  isCompoundable(item: ItemData): boolean {
    let i = Items[item.name];
    if (i && i.compound) return true;
    return false;
  }

  findCompoundables(): [first: BankPosition, second: BankPosition, third: BankPosition][] {
    let positions = this.mc.bank.findItems(this.isCompoundable);
    let items: {[name: string]: [BankPosition, number][]} = {};
    positions.forEach((pos) => {
      let name = pos[2].name;
      if (items[name] === undefined) items[name] = [];
      items[name].push([pos, <number>pos[2].level]);
    });

    let positionsToReturn: [first: BankPosition, second: BankPosition, third: BankPosition][] = [];
    let leveledItems: {[key: string]: BankPosition[]} = {};

    for (var iname in items) {
      let item = items[iname];
      let data = Items[iname];
      if (data.compound === undefined) continue;
      if (item.length <= data.compound.keep) continue;
      item.sort((a, b) => b[1] - a[1]);
      let firstZero = item.findIndex(i=>i[1] === 0);
      if (firstZero === -1 || data.compound.allowZero === true) firstZero = 9999;

      let pruned = item.slice(Math.min(data.compound.keep, firstZero));
      pruned = pruned.filter((pos) => { return pos[1] < (data.compound?.max || 0) });

      for (let pos of pruned) {
        let key = pos[0][2].name + pos[0][2].level;
        if (leveledItems[key] === undefined) leveledItems[key] = [];
        leveledItems[key].push(pos[0]);
      }
    }

    for (let key in leveledItems) {
      let positions = leveledItems[key];
      let length = Math.floor(positions.length / 3);
      if (length < 1) continue;

      for (let i = 0; i < length; i++) {
        let x = i * 3;
        positionsToReturn.push([positions[x], positions[x+1], positions[x+2]]);
      }
    }
    return positionsToReturn;
  }

  async run_task(): Promise<void> {
    if (this.controller.taskEnqueued("compound_items")) return;

    let items = this.findCompoundables();
    if (items.length > 0)
      this.controller.enqueueTask(new CompoundItems(this.mc, items), 100);
  }
}

export class CompoundItems extends Task {
  name = "compound_items";

  displayName = "Compound Items";

  cancellable = true;

  mc: MerchantController;
  items: [first: BankPosition, second: BankPosition, third: BankPosition][];

  constructor(mc: MerchantController, items: [first: BankPosition, second: BankPosition, third: BankPosition][]) {
    super(mc);
    this.mc = mc;
    this.items = items;
  }

  getPriority(): number {
    return this._priority + Math.min(this.items.length * 30, 300);
  }

  async run_task(): Promise<void> {
    let merchant = this.mc.merchant;
    if (!merchant) return;
    let items: [number, number, number][] = [];
    let normalAttempts = 0;
    let highAttempts = 0;
    for (let pos of this.items) {
      let result = await this.mc.bank.getItemFromPositions(merchant, pos);
      let item = merchant.ch.items[result[0]];
      if (!item) continue;
      let data = Items[item.name];
      let meta = AL.Game.G.items[item.name];
      if (data === undefined || meta.grades === undefined || item.level === undefined) continue;

      if (item.level < meta.grades[0]) {
        normalAttempts++;
      } else if (item.level < meta.grades[1]) {
        highAttempts++;
      } else continue;

      items.push(<[number, number, number]>result);
    }

    let [cscroll0, cscroll1] = await merchant.bulk_buy([["cscroll0", normalAttempts], ["cscroll1", highAttempts]], true);
    
    await merchant.move({x: 30, y: -40, map: "main"});
    console.log("Compounding");
    let returnItems = [];
    for (var i in items) {
      let pos = items[i];
      let item = merchant.ch.items[pos[0]];
      if (!item) continue;
      let data = Items[item.name];
      let meta = AL.Game.G.items[item.name];
      if (data === undefined || meta.grades === undefined || item.level === undefined) continue;

      let scrollPos;
      if (item.level < meta.grades[0])
        scrollPos = cscroll0;
      else if (item.level < meta.grades[1])
        scrollPos = cscroll1;
      else continue;

      let result = await merchant.ch.compound(pos[0], pos[1], pos[2], scrollPos);
      if (result) {
        returnItems.push(Math.min(...pos));
      }
    }
    if (returnItems.length > 0)
      await merchant.storeItems(returnItems);
  }
}