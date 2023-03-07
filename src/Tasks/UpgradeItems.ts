import { ItemInfo, ItemKey } from "typed-adventureland";
import { BankPosition } from "../Bank";
import { MerchantCharacter } from "../Character";
import { Items } from "../Items";
import { BackgroundTask, Task, TaskController } from "../Tasks";
import { getFreeSlots, getItemPosition, getItemQuantity } from "../Utils/Functions";

export class CheckUpgrade extends BackgroundTask {
  name = "upgrade_check";

  displayName = "Upgrade Check";

  msinterval = 30_000;

  char: MerchantCharacter;
  controller: TaskController;

  constructor(char: MerchantCharacter, controller: TaskController) {
    super(char);
    this.char = char;
    this.controller = controller;
  }

  isUpgradable(item: ItemInfo): boolean {
    let i = Items[item.name];
    if (i && i.upgrade) return true;
    return false;
  }

  findUpgradables(): [getTo: number, items: BankPosition[]][] {
    let positions = this.char.bank.findItems(this.isUpgradable);
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
      this.controller.enqueueTask(new UpgradeItems(this.char, items), 100);
  }
}

export class UpgradeItems extends Task {
  name = "upgrade_items";

  displayName = "Upgrade Items";

  cancellable: boolean = false;

  char: MerchantCharacter;
  items: [getTo: number, items: BankPosition[]][];

  constructor(char: MerchantCharacter, items: [getTo: number, items: BankPosition[]][]) {
    super(char);
    this.char = char;
    this.items = items;
  }

  getPriority(): number {
    return this._priority + Math.min(this.items.length * 10, 100);
  }

  isUpgradable(item: ItemInfo): boolean {
    let meta = G.items[item.name];
    if (meta.grades && meta.grades[0] > 0) {
      if (meta.upgrade && meta.grades[0] > <number>item.level) return true;
    }
    return false;
  }

  getUpgradableItemsInBank() {
    return this.char.bank.findItems(this.isUpgradable);
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

  async run_task(): Promise<void> {
    var normalAttempts = 0;
    var highAttempts = 0;
    var toUpgrade: [getTo: number, invPositions: number[]][] = [];

    for (let [getTo, positions] of this.items) {
      if (getFreeSlots(character.items, character.isize).length - 2 >= positions.length) {
        let invPositions = await this.char.bank.getItemFromPositions(positions);
        toUpgrade.push([getTo, invPositions]);

        // To determine quantity of scrolls to buy.
        for (let i of invPositions) {
          let item = character.items[i];
          let data = Items[item.name];
          if (data.meta.grades === undefined || item.level === undefined) continue;

          for (let x = item.level; x < getTo; x++) {
            if (x < data.meta.grades[0])
              normalAttempts++;
            else if (x < data.meta.grades[1])
              highAttempts++;
          }

        }
      }
    }
    
    // Get possible scrolls from bank
    var grabbed0, grabbed1;
    var grabbedPos0, grabbedPos1;
    if (normalAttempts > 0)
      grabbed0 = await this.char.bank.items["scroll0"]?.getItem(normalAttempts);
    if (highAttempts > 0)
      grabbed1 = await this.char.bank.items["scroll1"]?.getItem(highAttempts);
    if (grabbed0) {
      let item = character.items[grabbed0[0]];
      if (item && item.q) normalAttempts -= item.q;
      grabbedPos0 = grabbed0[0];
    }
    if (grabbed1) {
      let item = character.items[grabbed1[0]];
      if (item && item.q) highAttempts -= item.q;
      grabbedPos1 = grabbed1[0];
    }

    // Buy remainder
    await this.char.bulk_buy([["scroll0", normalAttempts], ["scroll1", highAttempts]]);
    let scroll0 = getItemPosition("scroll0", character.items, character.isize);
    let scroll1 = getItemPosition("scroll1", character.items, character.isize);

    // Begin upgrading
    set_message("Upgrading");
    await this.char.move("market");

    let returnItems = [];
    for (let [getTo, positions] of toUpgrade) {
      for (let pos of positions) {
        let item = character.items[pos];
        let data = Items[item.name];
        if (item.level === undefined || data.meta.grades === undefined) continue;

        let result;
        for (let i = item.level; i < getTo; i++) {
          let scrollPos;
          if (item.level < data.meta.grades[0]) {
            scrollPos = <number>scroll0;
          } else if (item.level < data.meta.grades[1]) {
            scrollPos = <number>scroll1;
          } else continue;
          
          result = await upgrade(pos, scrollPos);
          if (result.success !== true) break;
        }
        if (result && result.success === true)
          returnItems.push(pos);
      }
    }

    if (scroll0 !== null && character.items[scroll0]) returnItems.push(scroll0);
    if (scroll1 !== null && character.items[scroll1]) returnItems.push(scroll1);

    if (returnItems.length > 0)
      await this.char.bank.storeItems(returnItems);
  }
}