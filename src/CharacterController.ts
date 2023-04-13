import AL from "alclient";
import { MerchantCharacter } from "./Character.js";
import { FarmerCharacter, PriestCharacter } from "./FarmerCharacter.js";
import { CustomCharacter } from "./Types.js";

export default class CharacterController {
  characters: {[name: string]: CustomCharacter} = {};
  characterNames: string[] = [];
  selectedCharacters: string[] = ["Dezchant", "Dezara", "Deziest", "Dezanger"];
  constructor() {
    for (let name in AL.Game.characters) {
      this.characterNames.push(name);
    }
  }

  async deploy() {
    for (let name of this.selectedCharacters) {
      if (AL.Game.characters[name]?.type === "merchant") {
        let c = await AL.Game.startMerchant(name, "US", "I");
        this.characters[name] = new MerchantCharacter(c);
      } else if (AL.Game.characters[name]?.type === "mage") {
        let c = await AL.Game.startMage(name, "US", "I");
        this.characters[name] = new FarmerCharacter(c);
      } else if (AL.Game.characters[name]?.type === "ranger") {
        let c = await AL.Game.startRanger(name, "US", "I");
        this.characters[name] = new FarmerCharacter(c);
      } else if (AL.Game.characters[name]?.type === "priest") {
        let c = await AL.Game.startPriest(name, "US", "I");
        this.characters[name] = new PriestCharacter(c);
      } else {
        throw new Error(`Class type not supported for character: ${name}`);
      }
    }
  }
}