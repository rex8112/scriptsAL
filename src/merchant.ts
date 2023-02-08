import { IPosition, XOnlineCharacter } from "typed-adventureland";
import { Mover } from "./mover";
import { CMRequests } from "./requests";
import { CharacterData } from "./types";
import { get_item_quantity } from "./utils";

const characters: {[key: string]: XOnlineCharacter} = {};
const characterData: CharacterData[] = [];

let busy = false;
let CMR: CMRequests;

export async function RunMerchant(cmr: CMRequests) {
    CMR = cmr;
    use_hp_or_mp();
    if (busy) return;
    busy = true;
    await restock();
    await open_stand()
    await new Promise(res => setTimeout(res, 1000))
    await close_stand()
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
        game_log("Announcing Arrival.", "green");
        await CMR.request(char.name, {task:"merchant_arrived"});
        game_log("Moving on.", "green");
        await sleep(1000);
    }
}

async function restock() {
    await Mover.move("potions");
    var healing_pots = get_item_quantity("hpot0");
	var mana_pots = get_item_quantity("mpot0");
	var healing_target = 1000;
	var mana_target = 1000;
    try {
        if (healing_pots < healing_target) await buy("hpot0", healing_target-healing_pots);
        if (mana_pots < mana_target) await buy("mpot0", mana_target-mana_pots);
    } catch (data: any) {
        if (data.reason === "distance") await restock();
    }
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