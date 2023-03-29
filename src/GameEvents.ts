import { FarmerCharacter } from "./FarmerCharacter";

let GameEvent: {[event: string]: {[mode: string]: (ch: FarmerCharacter) => Promise<void>}} = {
  "wabbit": {
    "leader": async (ch: FarmerCharacter) => {
      
    }
  }
}
export default GameEvent;