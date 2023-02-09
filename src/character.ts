import { ClassKey, ItemInfo, ItemKey } from "typed-adventureland";
import { Mover } from "./mover";
import { CMRequests } from "./requests";
import { LocalChacterInfo } from "./types";

class BaseCharacter {
    original: Character;
    class: ClassKey;
    name: string;
    CMR: CMRequests;
    working: boolean = false;

    constructor(ch: Character, cmr: CMRequests) {
        this.original = ch;
        this.class = ch.ctype;
        this.name = ch.name;
        this.CMR = cmr;
    }

    /**
     * Get an array of all instances of an item in your inventory.
     * @param name The name of the item.
     * @returns An array of item info and positions for each instance of the item in your inventory.
     */
    get_item(name: string): {item: ItemInfo, pos: number}[] {
        var items: {item: ItemInfo, pos: number}[] = [];
        for (let i = 0; i < character.isize; i++) {
        if (character.items[i] && character.items[i].name==name)
            items.push({item: character.items[i], pos: i});
        }
        return items;
    }

    /**
     * A shortcut method to use Mover.move().
     * @param dest Destination to move character.
     * @returns The promise returned by Mover.move().
     */
    move(dest: SmartMoveToDestination) {
        return Mover.move(dest);
    }

    one_at_a_time(func: () => Promise<void>) {
        this.working = true;
        func().finally(() => this.working = false);
    }
}

class MerchantCharacter extends BaseCharacter {
    static items_to_take: ItemKey[] = [
        "beewings", "crabclaw", "gslime", "gem0", "seashell", "stinger", "hpbelt",
        "ringsj", "hpamulet", "wcap", "wshoes", "intscroll"
    ];
    character_info: {[name: string]: LocalChacterInfo} = {};
    update_task: NodeJS.Timer | null = null;

    constructor(ch: Character, cmr: CMRequests) {
        super(ch, cmr);
        this.start_tasks();
    }

    start_tasks() {
        if (this.update_task === null)
            this.update_task = setInterval(this.update_character_info, 30_000);
    }

    async run() {
        if (this.working === true) return;


    }

    get_takable_items(char: LocalChacterInfo): number[] {

    }

    async update_character_info() {
        var cData: {[name: string]: LocalChacterInfo} = {};
        var promises = [];
        for (var char of get_characters()) {
            promises.push(this.CMR.request(char.name, {task: "request_info", data: null}, 5_000));
        }
        var resolved = await Promise.all(promises);
        for (let data of resolved) {
            if (data.status != 200) continue;
            var resp = <LocalChacterInfo>data.message;
            cData[resp.name] = resp;
        }
        this.last_update = new Date();
        this.character_info = cData;
    }
}