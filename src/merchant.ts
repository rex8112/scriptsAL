import { IPosition, XOnlineCharacter } from "typed-adventureland";
import { CharacterData } from "./types";
import { get_item_quantity } from "./utils";

const characters: {[key: string]: XOnlineCharacter} = {};
const characterData: CharacterData[] = [];

let busy = false;

export async function RunMerchant() {
    use_hp_or_mp();
    if (busy) return;
    busy = true;
    await restock();
    await open_stand()
    await new Promise(res => setTimeout(res, 30000))
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
        var position = get_position(char);
        while (simple_distance(character, char) > character.range) {
            update_characters();
            if (position.map == character.map && can_move_to({real_x: position.x, real_y: position.y})) {
                await move(position.x, position.y);
            } else {
                await smart_move(position);
            }
            sleep(150);
        }
        send_cm(char.name, {task:"merchant_arrived"});
        await new Promise(res => setTimeout(res, 1000))
    }
}

async function restock() {
    await smart_move("potions");
    var healing_pots = get_item_quantity("hpot0");
	var mana_pots = get_item_quantity("mpot0");
	var healing_target = 1000;
	var mana_target = 1000;
    if (healing_pots < healing_target) buy("hpot0", healing_target-healing_pots);
    if (mana_pots < mana_target) buy("mpot0", mana_target-mana_pots);
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