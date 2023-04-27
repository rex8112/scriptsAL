import { BaseCharacter, MerchantCharacter } from "../Character.js";
import { MerchantController } from "../Controllers.js";
import { Task } from "../MerchantTasks.js";
import { LocalChacterInfo } from "../Types.js";
import { getFreeSlots, getItemPosition, getItemQuantity, moveToCharacter } from "../Utils/Functions.js";

export class ReplenishFarmersTask extends Task {
  name = "replenish_farmers";

  displayName = "Replenish Farmers";

  mc: MerchantController;
  
  cancellable: boolean = true;

  constructor(char: MerchantController) {
    super(char);
    this.mc = char;
  }

  initialize(id: number) {
    this.id = id;
  }

  getPriority(): number {
    return this._priority;
  }

  async getPotions(hpots: number, mpots: number): Promise<void> {
    let bh = this.mc.bank.items["hpot0"]?.getTotal() || 0;
    let bm = this.mc.bank.items["mpot0"]?.getTotal() || 0;

    let grabbedH = this.mc.merchant.getItemQuantity("hpot0");
    let grabbedM = this.mc.merchant.getItemQuantity("mpot0");

    if (bh > 0) {
      let newPositions = await this.mc.bank.items["hpot0"].getItem(this.mc.merchant, hpots);
      newPositions.forEach((pos) => { grabbedH += <number>this.mc.merchant.ch.items[pos]?.q || 1 })
    }
    if (bm > 0) {
      let newPositions = await this.mc.bank.items["mpot0"].getItem(this.mc.merchant, mpots);
      newPositions.forEach((pos) => { grabbedM += <number>this.mc.merchant.ch.items[pos]?.q || 1 })
    }
    let buyList = [];
    if (grabbedH < hpots) {
      buyList.push(["hpot0", hpots - grabbedH]);
    }
    if (grabbedM < mpots) {
      buyList.push(["mpot0", mpots - grabbedM]);
    }
    await this.mc.merchant.bulk_buy([["hpot0", hpots - grabbedH], ["mpot0", mpots - grabbedM]])
  }

  getTakableItems(character: BaseCharacter): [number, number][] {
    let char = character.ch;
    var items: [number, number][] = [];
    let save = ["hpot0", "mpot0"];
    for (let i = 0; i < char.isize; i++) {
      let item = char.items[i];
      if (item && !save.includes(item.name))
        items.push([i, item.q || 1]);
    }
    return items;
  }

  async run_task(): Promise<void> {
    var farmers = this.mc.game.farmerController.getFarmers();

    let potsNeeded: {[name: string]: [number, number]} = {};

    let totalHPots = 0;
    let totalMPots = 0;
    Object.values(farmers).forEach((char) => {
      let hneeded = Math.max(500 - char.getItemQuantity("hpot0"), 0);
      let mneeded = Math.max(800 - char.getItemQuantity("mpot0"), 0);
      potsNeeded[char.name] = [hneeded, mneeded];
      totalHPots += hneeded;
      totalMPots += mneeded;
    });

    await this.getPotions(totalHPots, totalMPots);

    for (var name in farmers) {
      var char = farmers[name];

      if (!await moveToCharacter(this.mc.merchant, char, char.name, 200)) continue;
      let promises = [];
      let free = getFreeSlots(this.mc.merchant.ch.items, this.mc.merchant.ch.isize).length;
      let items = this.getTakableItems(char).slice(0, free-2);

      promises.push(char.ch.sendGold(this.mc.merchant.name, char.ch.gold));
      items.forEach((item) => {
        promises.push(char.ch.sendItem(this.mc.merchant.name, item[0], item[1]));
      });

      let hpots = this.mc.merchant.getItemPosition("hpot0");
      let mpots = this.mc.merchant.getItemPosition("mpot0");
      let [hneeded, mneeded] = potsNeeded[char.name];

      if (hpots != null && hneeded > 0) await this.mc.merchant.ch.sendItem(name, hpots, hneeded);
      if (mpots != null && mneeded > 0) await this.mc.merchant.ch.sendItem(name, mpots, mneeded);

      await Promise.all(promises);
    }
    await this.mc.cleanInventory();
  }
}