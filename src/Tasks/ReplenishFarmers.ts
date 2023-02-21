import { MerchantCharacter } from "../Character";
import { ITask, Task } from "../Tasks";
import { getItemPosition, getItemQuantity, get_position } from "../Utils";

export class ReplenishFarmersTask extends Task {
  name = "replenish_farmers";

  displayName = "Replenish Farmers";

  char: MerchantCharacter;
  
  cancellable: boolean = true;

  constructor(char: MerchantCharacter) {
    super(char);
    this.char = char;
  }

  initialize(id: number) {
    this.id = id;
  }

  getPriority(): number {
    return this._priority;
  }

  async getPotions(hpots: number, mpots: number): Promise<void> {
    let bh = this.char.bank.items["hpot0"]?.getTotal() || 0;
    let bm = this.char.bank.items["mpot0"]?.getTotal() || 0;

    let grabbedH = getItemQuantity("hpot0", character.items, character.isize);
    let grabbedM = getItemQuantity("mpot0", character.items, character.isize);

    if (bh > 0) {
      grabbedH = await this.char.bank.items["hpot0"].getItem(hpots);
    }
    if (bm > 0) {
      grabbedM = await this.char.bank.items["mpot0"].getItem(mpots);
    }
    if (grabbedH < hpots) {
      await this.char.move("market");
      buy("hpot0", hpots - grabbedH);
    }
    if (grabbedM < mpots) {
      await this.char.move("market");
      buy("mpot0", mpots - grabbedM);
    }
  }

  async run_task(): Promise<void> {
    var characterInfo = await this.char.CM.gatherAllCharacterInfo();

    let totalHPots = 0;
    let totalMPots = 0;
    Object.values(characterInfo).forEach((char) => {
      let hneeded = 300 - getItemQuantity("hpot0", char.items, char.isize);
      let mneeded = 300 - getItemQuantity("mpot0", char.items, char.isize);
      totalHPots += hneeded;
      totalMPots += mneeded;
    });

    await this.getPotions(totalHPots, totalMPots);

    for (var name in characterInfo) {
      var char = characterInfo[name];
      if (name == character.name || !Object.keys(this.char.characterInfo).includes(name)) continue;
      let position = get_position(char);
      while (simple_distance(character, position) > 200) {
        if (this._cancelling) return;

        position = get_position(char);
        await this.char.move(position);
        await sleep(150);
      }
      let promises = [];
      let items = this.char.getTakableItems(char).slice(0, 10);

      promises.push(this.char.CM.requestGold(name, char.gold));
      promises.push(this.char.CM.requestItems(name, items));

      let hpots = getItemPosition("hpot0", character.items, character.isize);
      let mpots = getItemPosition("mpot0", character.items, character.isize);
      let hneeded = 300 - getItemQuantity("hpot0", char.items, char.isize);
      let mneeded = 300 - getItemQuantity("mpot0", char.items, char.isize);

      if (hpots != null && hneeded > 0) await send_item(name, hpots, hneeded);
      if (mpots != null && mneeded > 0) await send_item(name, mpots, mneeded);

      await Promise.all(promises);
    }
    await this.char.updateCharacterInfo();
  }
}