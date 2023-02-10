import { ItemInfo } from "typed-adventureland"

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
  if (character.hp < character.max_hp-heal) 
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

export function getItemQuantity(name: string) {
  var quantity = 0
  for (let i = 0; i < character.isize; i++) {
    if (character.items[i] && character.items[i].name==name)
      quantity += character.items[i].q || 0
  }
  return quantity
}

export function getItemPosition(name: string) {
  for (let i = 0; i < character.isize; i++) {
    if (character.items[i] && character.items[i].name==name)
      return i;
  }
}

var replenishing = false
export function replenishPotions() {
  if (replenishing) return

  var healing_pots = getItemQuantity("hpot0")
  var mana_pots = getItemQuantity("mpot0")
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

function min(arg0: number, arg1: number): number {
    if (arg0 < arg1) 
        return arg0
    return arg1
}