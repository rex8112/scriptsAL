import { EventKey, ItemInfo, ItemKey, MapKey, MonsterKey } from "typed-adventureland";
import { CharacterEntitySlotsInfos } from "typed-adventureland/dist/src/entities/character-entity";
import Location from "./Utils/Location";

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
  party: string | null;
  leader?: string;
}

export interface FarmerGoal {
  name: MonsterKey;
  for: {name: ItemKey | "gold" | "kills", amount: number};
  issued: number;
  focus?: true;
}

export interface EventData {
  name: EventKey;
  entity: MonsterKey;
  location?: Location | Location[];
}

export interface EventLocation {
  name: string;
  map: MapKey;
  x: number;
  y: number;
}

export interface Party {
  members: string[];
  leader: string;
  /** Current goal */
  goal?: FarmerGoal;
  tank?: string;
}

export type CMTask = CMRequestInfo | CMRequestInfoReply | CMRequestItems 
                      | CMRequestItemsReply | CMRequestGold | CMRequestGoldReply 
                      | CMRequestPartyAccept | CMRequestPartyAcceptReply | CMRequestLeaveParty
                      | CMRequestLeavePartyReply | CMRequestSetLeader | CMRequestAddFarmerGoal;

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

export interface CMRequestPartyAccept {
  task: "request_party_accept";
  data: string;
}

export interface CMRequestPartyAcceptReply {
  task: "request_party_accept_reply";
  data: boolean;
}

export interface CMRequestLeaveParty {
  task: "request_leave_party";
  data: null;
}

export interface CMRequestLeavePartyReply {
  task: "request_leave_party_reply";
  data: boolean;
}

export interface CMRequestSetLeader {
  task: "request_set_leader";
  data: string;
}

export interface CMRequestSetLeaderReply {
  task: "request_set_leader_reply";
  data: boolean;
}

export interface CMRequestAddFarmerGoal {
  task: "request_add_goal";
  data: FarmerGoal;
}

export interface CMRequestAddFarmerGoalReply {
  task: "request_add_goal_reply";
  data: boolean;
}
