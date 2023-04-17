import AL from "alclient";
import { Bank } from "./Bank.js";
import { CharacterController, GameController } from "./Controllers.js";

async function run() {
  await Promise.all([AL.Game.loginJSONFile("./credentials.json"), AL.Game.getGData()]);
  await AL.Pathfinder.prepare(AL.Game.G);

  let gc = new GameController();
  console.log("Setting Up GameController");
  await gc.setup();
}

run();
