// Hey there!
// This is CODE, lets you control your character with code.
// If you don't know how to code, don't worry, It's easy.
// Just set attack_mode to true and ENGAGE!

import { CodeMessageEvent } from "typed-adventureland";
import { RunFarmer } from "./farmer";
import { RunMerchant } from "./merchant";
import { CMRequests } from "./requests";
import { CMTask } from "./types";
import { get_item_position, get_item_quantity } from "./utils";
var CMR = new CMRequests(async (request) => {
  var message: CMTask = request.message;
  if (message.task == "merchant_arrived") {
    send_gold(request.from, character.gold);
    request.respondOK("Sent");
    game_log("Requesting Potions", "green");
    await CMR.request(request.from, {task: "request_potion", data: {hpots: 300 - get_item_quantity("hpot0"), mpots: 300 - get_item_quantity("mpot0")}});
    game_log(`Successfully Requested Hpots, Mpots: ${300 - get_item_quantity("hpot0")}, ${300 - get_item_quantity("mpot0")}`)
  } else if (message.task == "request_potion") {
    if (message.data.hpots > 0) {
      game_log(`Sending HPotions: ${message.data.hpots}`);
      var position = get_item_position("hpot0");
      if (position != undefined) send_item(request.from, position, message.data.hpots);
    }
    if (message.data.mpots > 0) {
      game_log(`Sending MPotions: ${message.data.mpots}`);
      var position = get_item_position("mpot0");
      if (position != undefined) send_item(request.from, position, message.data.mpots);
    }
    request.respondOK("Sent");
  }
  request.respond({status: 400, message: "Task not recognized."});
});
character.on("cm", (data: CodeMessageEvent<CMTask>) => {
  const trusted: string[] = []
  get_characters().forEach((c) => {trusted.push(c.name)})

  if (!trusted.includes(data.name)) {
    game_log("CM Received from Bad Party: " + data.name + ": " + data.message, "red");
    return;
  }

  var message = data.message;
  if (message.task == "merchant_arrived") {
    send_gold(data.name, character.gold);
    send_cm(data.name, {task: "request_potion", data: {hpots: 300 - get_item_quantity("hpot0"), mpots: 300 - get_item_quantity("mpot0")}});
    game_log(`Requesting Hpots, Mpots: ${300 - get_item_quantity("hpot0")}, ${300 - get_item_quantity("mpot0")}`)
  } else if (message.task == "request_potion") {
    if (message.data.hpots > 0) {
      game_log(`Sending HPotions: ${message.data.hpots}`);
      var position = get_item_position("hpot0");
      if (position != undefined) send_item(data.name, position, message.data.hpots);
    }
    if (message.data.mpots > 0) {
      game_log(`Sending MPotions: ${message.data.mpots}`);
      var position = get_item_position("mpot0");
      if (position != undefined) send_item(data.name, position, message.data.mpots);
    }
  }
});

setInterval(async function(){
  if (character.ctype == "merchant") {
    RunMerchant(CMR);
  } else {
    RunFarmer();
  }

},1000/4); // Loops every 1/4 seconds.

setInterval(async () => {
  set(`${character.name}_pos`, {map: character.map, x: character.x, y: character.y})
},1000);

// Learn Javascript: https://www.codecademy.com/learn/introduction-to-javascript
// Write your own CODE: https://github.com/kaansoral/adventureland
