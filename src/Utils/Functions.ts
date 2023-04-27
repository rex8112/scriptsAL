import { ApiCalls, IPosition, ItemInfo, SkillKey } from "typed-adventureland"
import { BaseCharacter } from "../Character.js"
import { LocalChacterInfo } from "../Types.js"
import Location from "./Location.js"
import { Vector } from "./Vector.js"

var lastPotion = new Date()
export function smartUseHpOrMp() {
  var heal = 0
  var mana = 0
  for (let i = 0; i < character.isize; i++) {
    if (character.items[i] && character.items[i].name=="hpot0") heal = 200
    else if (character.items[i] && character.items[i].name=="mpot0") mana = 300
  }
  if(mssince(lastPotion)<min(200,character.ping*3)) 
    return resolving_promise({reason:"safeties",success:false,used:false})
  var used=true
  if(is_on_cooldown("use_hp")) 
    return resolving_promise({success:false,reason:"cooldown"})
  if (character.hp < character.max_hp / 2) 
    return use_skill("use_hp")
  else if (character.mp < character.max_mp-mana)
    return use_skill("use_mp")
  else used = false
  if (used)
    lastPotion = new Date()
  else
    return resolving_promise({reason:"full",success:false,used:false});
}

/**
 * Get an array of all instances of an item in your inventory.
 * @param name The name of the item.
 * @returns An array of item info and positions for each instance of the item in your inventory.
 */
export function getItem(name: string): {item: ItemInfo, pos: number}[] {
  var items: {item: ItemInfo, pos: number}[] = [];
  for (let i = 0; i < character.isize; i++) {
    if (character.items[i] && character.items[i].name==name)
      items.push({item: character.items[i], pos: i});
  }
  return items;
}

export function getItemQuantity(name: string, inventory: ItemInfo[], isize: number) {
  var quantity = 0
  for (let i = 0; i < isize; i++) {
    if (inventory[i] && inventory[i].name==name)
      quantity += inventory[i].q || 0
  }
  return quantity
}

export function getItemPosition(name: string, inventory: ItemInfo[], isize: number) {
  for (let i = 0; i < isize; i++) {
    if (inventory[i] && inventory[i].name==name)
      return i;
  }
  return null
}

export function getFreeSlot(inventory: ItemInfo[], isize: number) {
  let slot = null;
  for (let i = 0; i < isize; i++) {
    if (inventory[i] == null) {
      slot = i;
      break;
    }
  }
  if (slot === null && inventory.length < isize) {
    slot = inventory.length;
  }
  return slot
}

export function getFreeSlots(inventory: ItemInfo[], isize: number): number[] {
  let slots = [];
  for (let i = 0; i < isize; i++) {
    if (!inventory[i]) {
      slots.push(i);
    }
  }
  return slots
}

var replenishing = false
export function replenishPotions() {
  if (replenishing) return

  var healing_pots = getItemQuantity("hpot0", character.items, character.isize)
  var mana_pots = getItemQuantity("mpot0", character.items, character.isize)
  var healing_target = 200
  var mana_target = 300

  if (healing_pots < 10 || mana_pots < 10) {
    replenishing = true
    var x = character.x
    var y = character.y
    smart_move({to:"potions"})
      .then(function () {
        if (healing_pots < healing_target) buy("hpot0", healing_target-healing_pots)
        if (mana_pots < mana_target) buy("mpot0", mana_target-mana_pots)
        replenishing = false
      })
      .then(function () {
        smart_move({x, y})
      })
  }
}

export function get_position(char: LocalChacterInfo): IPosition {
  return get(`${char.name}_pos`);
}

export async function moveToCharacter(char: BaseCharacter, target: BaseCharacter, id: string, distance: number = 50): Promise<boolean> {
  let position = Location.fromPosition(target.ch);
  if (!position) return false;
  while (char.ch.map !== position.map || Vector.fromPosition(char.ch).distanceFromSqr(position.vector) > distance * distance) {
    await char.move(position.asPosition());
    await sleep(100);
    position = Location.fromPosition(target.ch);
    if (!position) return false;
  }
  return true;
}

export function getCharacter(id: string): Character | null {
  if (!top) return null;
  for (let i of top.$("iframe")) {
    let iframe = <any>i;
    let char: Character = iframe.contentWindow.character;
    if (!char) continue;
    if (char.name == id) return char;
  }
  return null;
}

export function getPosition(id: string): Location | null {
  if(parent.entities[id]) return Location.fromEntity(parent.entities[id]);
  let char = getCharacter(id);
  if (char) return Location.fromEntity(char);
  
  if (get(`${id}_position`)) {
    return Location.fromPosition(get(`${id}_position`));
  } else return null;
}

export function savePosition() {
  let loc = Location.fromEntity(character);
  return set(`${character.id}_position`, loc.asPosition());
}

export function canUseSkill(skill: SkillKey): boolean {
  let data = G.skills[skill];
  let cooldownDone = !is_on_cooldown(skill);
  let correctLevel = data.level === undefined || data.level <= character.level;
  let hasMana = data.mp === undefined || data.mp <= character.mp;
  let result = cooldownDone && correctLevel && hasMana && !character.rip;
  return result;
}

export function callAPI<K extends keyof ApiCalls = keyof ApiCalls>(call: K): Promise<[ApiCalls[K]]> {
  let p: Promise<[ApiCalls[K]]> = new Promise((resolve) => {
    let dataReceived = (data: [ApiCalls[K]]) => { resolve(data) };
    
    parent.api_call(call, {}, {callback: (data) => { dataReceived(data); }});
  });

  return p;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => { setTimeout(resolve, ms) });
}

function min(arg0: number, arg1: number): number {
    if (arg0 < arg1) 
        return arg0
    return arg1
}
