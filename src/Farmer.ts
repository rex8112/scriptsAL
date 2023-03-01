import { BaseCharacter, FarmerCharacter } from "./Character";
import { Mover } from "./Mover";
import { replenishPotions, smartUseHpOrMp } from "./Utils";

const attack_mode=true;
const mon_type = "bee";
const farmer = new FarmerCharacter(character);
farmer.mode = "leader";

export async function RunFarmer() {
  smartUseHpOrMp();
  loot();
  replenishPotions();

  if(!attack_mode || character.rip || is_moving(character)) return;

  farmer.run();
}