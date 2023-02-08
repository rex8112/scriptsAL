import { Mover } from "./mover";
import { replenish_potions, smart_use_hp_or_mp } from "./utils";

const attack_mode=true;
const mon_type = "goo";

export async function RunFarmer() {
  smart_use_hp_or_mp();
  loot();
  replenish_potions();

  if(!attack_mode || character.rip || is_moving(character)) return;

  const target = get_nearest_monster({type: mon_type});
  
  if (target) {
    change_target(target);
    if (can_attack(target)) {
      set_message("Attacking");
      attack(target);
    } else {
      const dist = simple_distance(target,character);
      if(!is_moving(character) 
          && dist > character.range - 10) {
        if(can_move_to(target.real_x,target.real_y)) {
          move((target.real_x + character.real_x) / 2, (target.real_y + character.real_y) / 2);
        } else {
          set_message("Seeking");
          Mover.move(target);
        }
      }
    }
  } else if(!is_moving(character)) {
    set_message("Finding");
    Mover.move(<SmartMoveToDestination>mon_type);
  }
}