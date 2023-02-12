import { ItemInfo, SlotType, TradeSlotType } from "typed-adventureland";
import { CharacterEntitySlotsInfos } from "typed-adventureland/dist/src/entities/character-entity";

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
  slots: CharacterEntitySlotsInfos;
  items: ItemInfo[];
  isize: number;
  time: Date;
}

export type CMTask = CMRequestInfo | CMRequestInfoReply | CMRequestItems | CMRequestItemsReply | CMRequestGold | CMRequestGoldReply;

export interface CMRequestInfo {
  task: "request_info";
  data: null;
}

export interface CMRequestInfoReply {
  task: "request_info_reply";
  data: LocalChacterInfo;
}

export interface CMRequestItems {
  task: "request_items";
  data: [number, number][];
}

export interface CMRequestItemsReply {
  task: "request_items_reply";
  data: boolean[];
}

export interface CMRequestGold {
  task: "request_gold";
  data: number;
}

export interface CMRequestGoldReply {
  task: "request_gold_reply";
  data: boolean;
}