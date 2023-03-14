// Hey there!
// This is CODE, lets you control your character with code.
// If you don't know how to code, don't worry, It's easy.
// Just set attack_mode to true and ENGAGE!

import { savePosition } from "./Utils/Functions";
import { MerchantCharacter } from "./Character";
import { FarmerCharacter, PriestCharacter } from "./FarmerCharacter";

let globalAny = <any>globalThis;
var char: MerchantCharacter | PriestCharacter | FarmerCharacter | null = null;

if (character.ctype == "merchant") {
  char = new MerchantCharacter(character);
} else if (character.ctype == "priest") {
  char = new PriestCharacter(character);
  char.mode = "leader";
} else {
  char = new FarmerCharacter(character);
  char.mode = "leader";
}
char.startRun();
globalAny.c = char;

setInterval(async () => {
  set(`${character.name}_pos`, {map: character.map, x: character.x, y: character.y});
  savePosition();
},1000);
