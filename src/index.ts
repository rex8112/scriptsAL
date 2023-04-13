import AL from "alclient";
import { Bank } from "./Bank";
import CharacterController from "./CharacterController";

async function run() {
  await Promise.all([AL.Game.loginJSONFile("./credentials.json"), AL.Game.getGData()]);
  await AL.Pathfinder.prepare(AL.Game.G);

  let bank = new Bank();
  let cc = new CharacterController();
  console.log("Deploying Characters");
  await cc.deploy();
  let merchant = cc.characters["Dezchant"];
  console.log("Updating Bank Info");
  await bank.updateInfo(merchant);
}

run();
