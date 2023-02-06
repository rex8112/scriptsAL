// Hey there!
// This is CODE, lets you control your character with code.
// If you don't know how to code, don't worry, It's easy.
// Just set attack_mode to true and ENGAGE!

import { smart_use_hp_or_mp, replenish_potions } from "./utils";

var attack_mode=true;
var mon_type = "bee";

setInterval(async function(){
  smart_use_hp_or_mp();
  loot();
  replenish_potions();

  if(!attack_mode || character.rip || is_moving(character)) return;

  const target = get_nearest_monster({type: mon_type});
  
  if (target) {
    change_target(target);
    if (can_attack(target)) {
        attack(target);
    } else {
      const dist = simple_distance(target,character);
      if(!is_moving(character) 
          && dist > character.range - 10) {
        if(can_move_to(target.real_x,target.real_y)) {
          move((target.real_x + character.real_x) / 2, (target.real_y + character.real_y) / 2);
        } else {
          smart_move(target);
        }
      }
    }
  } else if(!is_moving(character)) {
    smart_move(<SmartMoveToDestination>mon_type);
  }

},1000/4); // Loops every 1/4 seconds.

// Learn Javascript: https://www.codecademy.com/learn/introduction-to-javascript
// Write your own CODE: https://github.com/kaansoral/adventureland
