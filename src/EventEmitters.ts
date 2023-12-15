import { ChestLootData } from "alclient";
import { TypedEmitter } from "tiny-typed-emitter";

interface ICharacterEvents {
  'onLoot': (data: ChestLootData) => void;
}

let CharacterEvents = TypedEmitter<ICharacterEvents>;

export { CharacterEvents }