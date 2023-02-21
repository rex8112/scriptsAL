import { ItemInfo } from "typed-adventureland";
import { MerchantCharacter } from "../Character";
import { ITask, Task } from "../Tasks";
import { getItemPosition, getItemQuantity, get_position } from "../Utils";

export class UpgradeItems extends Task {
  name = "upgrade_items";

  displayName = "Upgrade Items";

  cancellable: boolean = false;

  char: MerchantCharacter;

  constructor(char: MerchantCharacter) {
    super(char);
    this.char = char;
  }

  getPriority(): number {
    return this._priority;
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
    var totalAttempts = 0;
    await this.char.bank.getItems(this.isUpgradable);
    var items = this.getUpgradableItems();
    for (var i in items) totalAttempts += items[i][1];
    var scrolls = getItemQuantity("scroll0", character.items, character.isize);
    if (scrolls < totalAttempts) {
      set_message("Restocking");
      let grabbed = 0;
      if (this.char.bank.items["scroll0"]) {
        grabbed += await this.char.bank.items["scroll0"].getItem(totalAttempts - scrolls);
      }
      if (scrolls + grabbed < totalAttempts) {
        await this.char.move("market");
        buy("scroll0", totalAttempts - (scrolls + grabbed));
      }
    }
    await this.char.move("market");
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
      await this.char.bank.storeItems(returnItems);
    await this.char.cleanInventory();
  }
}