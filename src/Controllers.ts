import AL, { ItemName, MonsterName } from "alclient";
import { MerchantCharacter } from "./Character.js";
import { FarmerCharacter, PriestCharacter } from "./FarmerCharacter.js";
import { CustomCharacter, FarmerGoal } from "./Types.js";
import { Bank } from "./Bank.js";
import { Items } from "./Items.js";

export class GameController {
  loaded: boolean = false;
  bank: Bank;
  characterController: CharacterController;
  constructor() {
    this.bank = new Bank();
    this.characterController = new CharacterController(this);
  }

  async setup() {
    await this.characterController.deploy();
    let merch = this.characterController.Merchant;
    if (!merch) throw new Error("Merchant didn't start.")
    await this.bank.updateInfo(merch);
    this.loaded = true;
  }


}

export class MerchantController {
  game: GameController;
  bank: Bank;
  merchant: MerchantCharacter;

  constructor(gc: GameController, merchant: MerchantCharacter) {
    this.game = gc;
    this.bank = gc.bank;
    this.merchant = merchant;
  }

  async cleanInventory() {
    let keep = ["hpot0", "mpot0", "stand0"]
    let pos: number[] = [];
    let sellPos: [number, number][] = [];
    for (let i in this.merchant.ch.items) {
      let item = this.merchant.ch.items[i];
      if (item && !keep.includes(item.name)) {
        let quantity = item.q ?? 1;
        let data = Items[item.name];
        if (data && data.vendor?.sell === true) {
          let total = this.bank.items[item.name]?.getTotal() ?? 0 + quantity;
          if (total >= data.vendor.keep) {
            let sell = total - data.vendor.keep;
            if (sell >= quantity) {
              sellPos.push([Number(i), quantity]);
              continue;
            } else {
              sellPos.push([Number(i), sell])
            }
          }
        }
        pos.push(Number(i));
      }
    }

    console.log(sellPos);
    if (sellPos.length > 0) {
      await this.merchant.move("market");
      for (let pos of sellPos) {
        try {
          await this.merchant.ch.sell(pos[0], pos[1]);
        } catch {
          console.error("Item not present.");
        }
      }
    }

    await this.bank.storeItems(this.merchant, pos);

    if (this.merchant.ch.gold > 2_000_000) {
      await this.bank.depositGold(this.merchant, this.merchant.ch.gold - 2_000_000);
    }
  }

  async addFarmerGoal(item: ItemName, quantity: number) {
    let mobs: [name: MonsterName, rate: number][] = [];
    for (let mname in AL.Game.G.drops.monsters) {
      let drops = AL.Game.G.drops.monsters[<MonsterName>mname];
      if (!drops) continue;
      for (let drop of drops) {
        let [rate, iname] = drop;
        if (iname === item) {
          mobs.push([<MonsterName>mname, rate]);
        }
      }
    }
    if (mobs.length <= 0) return false;
    mobs.sort((a, b) => { return b[1] - a[1]; });
    let chosen = mobs[0];
    let goal: FarmerGoal = {name: chosen[0], for: {name: item, amount: quantity}, issued: Date.now()};
    // TODO: Finish Implementation
  }
}

export class CharacterController {
  game: GameController;
  characters: {[name: string]: CustomCharacter} = {};
  characterNames: string[] = [];
  selectedCharacters: string[] = ["Dezchant", "Dezara", "Deziest", "Dezanger"];
  constructor(gc: GameController) {
    this.game = gc;

    for (let name in AL.Game.characters) {
      this.characterNames.push(name);
    }
  }

  get Merchant(): MerchantCharacter | null {
    for (let name in this.characters) {
      let c = this.characters[name];
      if (c.ch.ctype === "merchant") return <MerchantCharacter>c;
    }

    return null;
  }

  async deploy() {
    for (let name of this.selectedCharacters) {
      if (AL.Game.characters[name]?.type === "merchant") {
        let c = await AL.Game.startMerchant(name, "US", "I");
        this.characters[name] = new MerchantCharacter(this.game, c);
      } else if (AL.Game.characters[name]?.type === "mage") {
        let c = await AL.Game.startMage(name, "US", "I");
        this.characters[name] = new FarmerCharacter(this.game, c);
      } else if (AL.Game.characters[name]?.type === "ranger") {
        let c = await AL.Game.startRanger(name, "US", "I");
        this.characters[name] = new FarmerCharacter(this.game, c);
      } else if (AL.Game.characters[name]?.type === "priest") {
        let c = await AL.Game.startPriest(name, "US", "I");
        this.characters[name] = new PriestCharacter(this.game, c);
      } else {
        throw new Error(`Class type not supported for character: ${name}`);
      }
    }
  }
}
