import AL, { Character, ItemData } from "alclient";
import { BankPosition } from "../Bank.js";
import { MerchantCharacter } from "../Character.js";
import { Items } from "../Items.js";
import { BackgroundTask, Task, MerchantTaskController } from "../MerchantTasks.js";
import { getFreeSlots, getItemPosition } from "../Utils/Functions.js";
import { MerchantController } from "../Controllers.js";

export class CheckUpgrade extends BackgroundTask {
  name = "upgrade_check";

  displayName = "Upgrade Check";

  msinterval = 30_000;

  mc: MerchantController;
  controller: MerchantTaskController;

  constructor(mc: MerchantController, controller: MerchantTaskController) {
    super(mc);
    this.mc = mc;
    this.controller = controller;
  }

  isUpgradable(item: ItemData): boolean {
    let i = Items[item.name];
    if (i && i.upgrade) return true;
    return false;
  }

  findUpgradables(): [getTo: number, items: BankPosition[]][] {
    let positions = this.mc.bank.findItems(this.isUpgradable);
    let items: {[name: string]: [BankPosition, number][]} = {};
    positions.forEach((pos) => {
      let name = pos[2].name;
      if (items[name] === undefined) items[name] = [];
      items[name].push([pos, <number>pos[2].level]);
    });

    let positions_to_return: [getTo: number, items: BankPosition[]][] = [];

    for (var iname in items) {
      let item = items[iname];
      let data = Items[iname];
      let bankPos: BankPosition[] = [];
      if (data.upgrade === undefined) continue;
      if (item.length <= data.upgrade.keep) continue;
      item.sort((a, b) => b[1] - a[1]);
      // New items may become the new top items, this stops that.
      let max = Math.min(data.upgrade.max, item[data.upgrade.keep-1][1] + 1);
      let pruned = item.slice(data.upgrade.keep);

      pruned.forEach((pos) => bankPos.push(pos[0]))
      positions_to_return.push([max, bankPos]);
    }
    return positions_to_return;
  }

  async run_task(): Promise<void> {
    if (this.controller.taskEnqueued("upgrade_items")) return;

    let items = this.findUpgradables();
    if (items.length > 0)
      this.controller.enqueueTask(new UpgradeItems(this.mc, items), 100);
  }
}

export class UpgradeItems extends Task {
  name = "upgrade_items";

  displayName = "Upgrade Items";

  cancellable: boolean = false;

  mc: MerchantController;
  items: [getTo: number, items: BankPosition[]][];

  constructor(char: MerchantController, items: [getTo: number, items: BankPosition[]][]) {
    super(char);
    this.mc = char;
    this.items = items;
  }

  getPriority(): number {
    return this._priority + Math.min(this.items.length * 10, 100);
  }

  isUpgradable(item: ItemData): boolean {
    let meta = AL.Game.G.items[item.name];
    if (meta.grades && meta.grades[0] > 0) {
      if (meta.upgrade && meta.grades[0] > <number>item.level) return true;
    }
    return false;
  }

  getUpgradableItemsInBank() {
    return this.mc.bank.findItems(this.isUpgradable);
  }

  /**
   * 
   * @returns Returns an array of number pairs: [islot, times_to_upgrade]
   */
  getUpgradableItems(character: Character): [number, number][] {
    var items: [number, number][] = [];
    for (let i = 0; i < character.isize; i++) {
      let item = character.items[i];
      if (item) {
        let meta = AL.Game.G.items[item.name];
        if (this.isUpgradable(item) && meta.grades) 
          items.push([i, meta.grades[0] - <number>item.level]);
      }
    }
    return items;
  }

  async run_task(): Promise<void> {
    var normalAttempts = 0;
    var highAttempts = 0;
    var toUpgrade: [getTo: number, invPositions: number[]][] = [];

    for (let [getTo, positions] of this.items) {
      if (getFreeSlots(this.mc.merchant.ch.items, this.mc.merchant.ch.isize).length - 2 >= positions.length) {
        let invPositions = await this.mc.bank.getItemFromPositions(this.mc.merchant, positions);
        toUpgrade.push([getTo, invPositions]);

        // To determine quantity of scrolls to buy.
        for (let i of invPositions) {
          let item = this.mc.merchant.ch.items[i];
          if (!item) continue;
          let data = Items[item.name];
          let meta = AL.Game.G.items[item.name];
          if (meta.grades === undefined || item.level === undefined) continue;

          for (let x = item.level; x < getTo; x++) {
            if (x < meta.grades[0])
              normalAttempts++;
            else if (x < meta.grades[1])
              highAttempts++;
          }

        }
      }
    }
    
    // Get possible scrolls from bank
    var grabbed0, grabbed1;
    var grabbedPos0, grabbedPos1;
    if (normalAttempts > 0)
      grabbed0 = await this.mc.bank.items["scroll0"]?.getItem(this.mc.merchant, normalAttempts);
    if (highAttempts > 0)
      grabbed1 = await this.mc.bank.items["scroll1"]?.getItem(this.mc.merchant, highAttempts);
    if (grabbed0) {
      let item = this.mc.merchant.ch.items[grabbed0[0]];
      if (item && item.q) normalAttempts -= item.q;
      grabbedPos0 = grabbed0[0];
    }
    if (grabbed1) {
      let item = this.mc.merchant.ch.items[grabbed1[0]];
      if (item && item.q) highAttempts -= item.q;
      grabbedPos1 = grabbed1[0];
    }

    // Buy remainder
    await this.mc.merchant.bulk_buy([["scroll0", normalAttempts], ["scroll1", highAttempts]]);
    let scroll0 = getItemPosition("scroll0", this.mc.merchant.ch.items, this.mc.merchant.ch.isize);
    let scroll1 = getItemPosition("scroll1", this.mc.merchant.ch.items, this.mc.merchant.ch.isize);

    // Begin upgrading
    console.log("Upgrading");
    await this.mc.merchant.move("market");

    let returnItems = [];
    for (let [getTo, positions] of toUpgrade) {
      for (let pos of positions) {
        let item = this.mc.merchant.ch.items[pos];
        if (!item) continue;
        let meta = AL.Game.G.items[item.name];
        if (item.level === undefined || meta.grades === undefined) continue;

        let result;
        for (let i = item.level; i < getTo; i++) {
          let scrollPos;
          let level = <number>this.mc.merchant.ch.items[pos]?.level;
          console.log("Item Level: ", item.level);
          if (level < meta.grades[0]) {
            scrollPos = <number>scroll0;
          } else if (level < meta.grades[1]) {
            scrollPos = <number>scroll1;
          } else continue;
          
          result = await this.mc.merchant.ch.upgrade(pos, scrollPos);
          if (result !== true) break;
        }
        if (result === true)
          returnItems.push(pos);
      }
    }

    if (scroll0 !== null && this.mc.merchant.ch.items[scroll0]) returnItems.push(scroll0);
    if (scroll1 !== null && this.mc.merchant.ch.items[scroll1]) returnItems.push(scroll1);

    if (returnItems.length > 0)
      await this.mc.merchant.storeItems(returnItems);
  }
}