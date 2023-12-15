import { ItemData } from "alclient";
import { BaseCharacter } from "../Character.js"
import Location from "./Location.js"
import { Vector } from "./Vector.js"

type Inventory = (ItemData | null)[]

/**
 * Get an array of all instances of an item in your inventory.
 * @param name The name of the item.
 * @returns An array of item info and positions for each instance of the item in your inventory.
 */
export function getItem(name: string, inventory: Inventory, isize: number): {item: ItemData, pos: number}[] {
  var items: {item: ItemData, pos: number}[] = [];
  for (let i = 0; i < isize; i++) {
    let item = inventory[i];
    if (item && item.name==name)
      items.push({item: item, pos: i});
  }
  return items;
}

export function getItemQuantity(name: string, inventory: Inventory, isize: number) {
  var quantity = 0
  for (let i = 0; i < isize; i++) {
    let item = inventory[i];
    if (item && item.name==name)
      quantity += item.q || 0
  }
  return quantity
}

export function getItemPosition(name: string, inventory: Inventory, isize: number) {
  for (let i = 0; i < isize; i++) {
    let item = inventory[i];
    if (item && item.name==name)
      return i;
  }
  return null
}

export function getFreeSlot(inventory: Inventory, isize: number) {
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

export function getFreeSlots(inventory: Inventory, isize: number): number[] {
  let slots = [];
  for (let i = 0; i < isize; i++) {
    if (!inventory[i]) {
      slots.push(i);
    }
  }
  return slots
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

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => { setTimeout(resolve, ms) });
}

function min(arg0: number, arg1: number): number {
    if (arg0 < arg1) 
        return arg0
    return arg1
}
