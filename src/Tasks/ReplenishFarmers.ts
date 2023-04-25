import { MerchantCharacter } from "../Character.js";
import { Task } from "../MerchantTasks.js";
import { LocalChacterInfo } from "../Types.js";
import { getFreeSlots, getItemPosition, getItemQuantity, moveToCharacter } from "../Utils/Functions.js";

export class ReplenishFarmersTask extends Task {
  name = "replenish_farmers";

  displayName = "Replenish Farmers";

  mc: MerchantCharacter;
  
  cancellable: boolean = true;

  constructor(char: MerchantCharacter) {
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

    let grabbedH = getItemQuantity("hpot0", character.items, character.isize);
    let grabbedM = getItemQuantity("mpot0", character.items, character.isize);

    if (bh > 0) {
      let newPositions = await this.mc.bank.items["hpot0"].getItem(hpots);
      newPositions.forEach((pos) => { grabbedH += character.items[pos].q || 1 })
    }
    if (bm > 0) {
      let newPositions = await this.mc.bank.items["mpot0"].getItem(mpots);
      newPositions.forEach((pos) => { grabbedM += character.items[pos].q || 1 })
    }
    let buyList = [];
    if (grabbedH < hpots) {
      buyList.push(["hpot0", hpots - grabbedH]);
    }
    if (grabbedM < mpots) {
      buyList.push(["mpot0", mpots - grabbedM]);
    }
    await this.mc.bulk_buy([["hpot0", hpots - grabbedH], ["mpot0", mpots - grabbedM]])
  }

  getTakableItems(char: LocalChacterInfo): [number, number][] {
    var items: [number, number][] = [];
    let save = ["hpot0", "mpot0"];
    for (let i = 0; i < char.isize; i++) {
      if (char.items[i] && !save.includes(char.items[i].name))
        items.push([i, char.items[i].q || 1]);
    }
    return items;
  }

  async run_task(): Promise<void> {
    var characterInfo = await this.mc.CM.gatherAllCharacterInfo();

    let potsNeeded: {[name: string]: [number, number]} = {};

    let totalHPots = 0;
    let totalMPots = 0;
    Object.values(characterInfo).forEach((char) => {
      let hneeded = Math.max(500 - getItemQuantity("hpot0", char.items, char.isize), 0);
      let mneeded = Math.max(800 - getItemQuantity("mpot0", char.items, char.isize), 0);
      potsNeeded[char.name] = [hneeded, mneeded];
      totalHPots += hneeded;
      totalMPots += mneeded;
    });

    await this.getPotions(totalHPots, totalMPots);

    for (var name in characterInfo) {
      var char = characterInfo[name];
      if (name == character.name || !Object.keys(this.mc.characterInfo).includes(name)) continue;
      if (!await moveToCharacter(this.mc, char.name, 200)) continue;
      let promises = [];
      let free = getFreeSlots(character.items, character.isize).length;
      let items = this.getTakableItems(char).slice(0, free-2);

      promises.push(this.mc.CM.requestGold(name, char.gold));
      promises.push(this.mc.CM.requestItems(name, items));

      let hpots = getItemPosition("hpot0", character.items, character.isize);
      let mpots = getItemPosition("mpot0", character.items, character.isize);
      let [hneeded, mneeded] = potsNeeded[char.name];

      if (hpots != null && hneeded > 0) await send_item(name, hpots, hneeded);
      if (mpots != null && mneeded > 0) await send_item(name, mpots, mneeded);

      await Promise.all(promises);
    }
    await this.mc.updateCharacterInfo();
    await sleep(500);
    await this.mc.cleanInventory();
  }
}