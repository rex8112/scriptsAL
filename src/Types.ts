import { BaseCharacter, MerchantCharacter } from "./Character.js";
import { FarmerCharacter } from "./FarmerCharacter.js";
import Location from "./Utils/Location.js";
import { ItemName, MonsterName } from "alclient";

export type CustomCharacter = BaseCharacter | MerchantCharacter | FarmingCharacter;
export type FarmingCharacter = FarmerCharacter ;

export interface CharacterData {
  gold: number;
  items: number;
  hpots: number;
  mpots: number;
  name: string;
}

export interface FarmerGoal {
  name: MonsterName;
  for: {name: ItemName | "gold" | "kills", amount: number};
  issued: number;
  focus?: true;
}

export interface Party {
  members: string[];
  leader: string;
  /** Current goal */
  goal?: FarmerGoal;
  tank?: string;
}
