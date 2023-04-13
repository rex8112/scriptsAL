import { IPosition, SMonsterEventLiveWithCoordinates } from "typed-adventureland";
import { FarmerCharacter } from "./FarmerCharacter.js";
import Location from "./Utils/Location.js";
import { Vector } from "./Utils/Vector.js";

let GameEvent: {[event: string]: {[mode: string]: (ch: FarmerCharacter) => Promise<void>}} = {
  "wabbit": {
    "leader": async (ch: FarmerCharacter) => {
      if (!ch.event) {
        ch.event = undefined;
        return;
      }
      let data = <SMonsterEventLiveWithCoordinates>parent.S[ch.event.name];
      while (data.x === undefined && data.live === true) {
        data = <SMonsterEventLiveWithCoordinates>parent.S[ch.event.name];
        console.log(data);
        await sleep(250);
      }
      if (data.live !== true) {
        ch.event = undefined;
        return;
      }
      let vector = Vector.fromPosition(data);
      console.log(vector);
      let location = new Location(vector, data.map);
      console.log(location);
      let t = ch.find_target(ch.event.entity, false);
      console.log(t);
      if (!t) {
        console.log(location.asPosition());
        await ch.move(location.asPosition());
        t = ch.find_target(ch.event.entity, false);
        console.log(t);
      }
      if (!t) {
        ch.event = undefined;
        return;
      }

      console.log(t);
      await ch.attack(t);
      ch.event = undefined;
    }
  }
}
export default GameEvent;