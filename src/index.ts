// Hey there!
// This is CODE, lets you control your character with code.
// If you don't know how to code, don't worry, It's easy.
// Just set attack_mode to true and ENGAGE!

import { savePosition } from "./Utils/Functions";
import { FarmerCharacter, MerchantCharacter } from "./Character";

let globalAny = <any>globalThis;
if (globalAny.char === undefined)
  globalAny.char = {};
var char: MerchantCharacter | FarmerCharacter | null = null;

if (character.ctype == "merchant") {
  if (char === null) char = new MerchantCharacter(character);
  globalAny.char[character.name] = char;
  char.startRun();
} else {
  if (char === null) char = new FarmerCharacter(character);
  char.mode = "leader";
  char.startRun();
}

setInterval(async () => {
  set(`${character.name}_pos`, {map: character.map, x: character.x, y: character.y});
  savePosition();
},1000);
