import { IPosition, ItemInfo, SlotType, XOnlineCharacter } from "typed-adventureland";
import { Mover } from "./Mover";
import { CMRequests } from "./CMRequests";
import { CharacterData, LocalChacterInfo } from "./Types";
import { getItemQuantity } from "./Utils";

const characters: {[key: string]: XOnlineCharacter} = {};

let characterData: {[name: string]: LocalChacterInfo} = {};

let busy = false;
let CMR: CMRequests;

export async function RunMerchant(cmr: CMRequests) {
  CMR = cmr;
  use_hp_or_mp();
  if (busy) return;
  busy = true;
  await restock();
  await open_stand();
  await sleep(15_000);
  characterData = await gather_info();
  await close_stand();
  await restock_farmers();
  busy = false;
}

async function restock_farmers() {
  update_characters();
  for (var name in characters) {
    var char = characters[name];
    if (name == character.name || char.online == 0) continue;
    set_message("Restocking " + char.name)
    let position = get_position(char);
    while (simple_distance(character, position) > 100) {
      position = get_position(char);
      await Mover.move(position);
      game_log("Move Finished.");
      await sleep(150);
    }
    await CMR.request(char.name, {task:"merchant_arrived"});
    await sleep(1000);
  }
}

async function restock() {
  await Mover.move("potions");
  var healing_pots = getItemQuantity("hpot0");
  var mana_pots = getItemQuantity("mpot0");
  var healing_target = 1000;
  var mana_target = 1000;
  try {
    if (healing_pots < healing_target) await buy("hpot0", healing_target-healing_pots);
    if (mana_pots < mana_target) await buy("mpot0", mana_target-mana_pots);
  } catch (data: any) {
    if (data.reason === "distance") await restock();
  }
}

async function gather_info(): Promise<{[name: string]: LocalChacterInfo}> {
  var cData: {[name: string]: LocalChacterInfo} = {};
  var promises = [];
  for (var name in characters) {
    promises.push(CMR.request(name, {task: "request_info", data: null}, 5_000));
  }
  var resolved = await Promise.all(promises);
  for (let data of resolved) {
    if (data.status != 200) continue;
    var resp = <LocalChacterInfo>data.message;
    cData[resp.name] = resp;
  }
  return cData;
}

function get_position(char: XOnlineCharacter): IPosition {
  return get(`${char.name}_pos`);
}

function update_characters() {
  for (var name in characters) {
    delete characters[name];
  }
  var OCharacters = get_characters();
  for (var char of OCharacters) {
    characters[char.name] = char;
  }
}