import { MerchantCharacter } from "../Character";
import { Task } from "../Tasks";
import { getItemPosition, getItemQuantity, get_position } from "../Utils";

export class ReplenishFarmersTask implements Task {
  name = "replenish_farmers";

  displayName = "Replenish Farmers";

  id = 0;
  priority = 0;
  background = true;
  paused = null;
  cancellable = true;
  char: MerchantCharacter;
  cancelling: boolean = false;

  constructor(char: MerchantCharacter) {
    this.char = char;
  }

  initialize(id: number) {
    this.id = id;
  }

  canPause() {
    return this.paused !== null;
  }

  getPriority(): number {
    return this.priority;
  }

  async getPotions(hpots: number, mpots: number): Promise<void> {
    let bh = this.char.bank.items["hpot0"]?.getTotal() || 0;
    let bm = this.char.bank.items["mpot0"]?.getTotal() || 0;

    let grabbedH = 0;
    let grabbedM = 0;

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

  async run(): Promise<void> {
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
        if (this.cancelling) return;

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

  async pause(): Promise<boolean> {
    return false;
  }

  async cancel(): Promise<boolean> {
    this.cancelling = true;
    return true;
  }
}