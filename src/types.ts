import { ItemInfo, SlotType } from "typed-adventureland";

export interface CharacterData {
    gold: number;
    items: number;
    hpots: number;
    mpots: number;
    name: string;
}

export interface LocalChacterInfo {
    name: string;
    gold: number;
    slots: {[key in SlotType]: ItemInfo};
    items: ItemInfo[];
    isize: 42;
    time: Date;
}

export interface CMTask {
    task: string;
    data: any;
}

export interface CMRequestInfo {
    task: "request_info";
    data: null;
}

export interface CMRequestInfoReply {
    task: "request_info_reply";
    data: LocalChacterInfo;
}