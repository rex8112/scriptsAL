import { BaseCharacter, MerchantCharacter } from "./Character.js";
import { FarmerCharacter } from "./FarmerCharacter.js";
import { CMRequests, Request } from "./CMRequests.js";
import { CMRequestAddFarmerGoal, CMRequestAddFarmerGoalReply, CMRequestGold, CMRequestGoldReply, CMRequestInfo, CMRequestInfoReply, CMRequestItems, CMRequestItemsReply, CMRequestLeaveParty, CMRequestLeavePartyReply, CMRequestPartyAccept, CMRequestPartyAcceptReply, CMRequestSetLeader, CMRequestSetLeaderReply, CMTask, FarmerGoal, LocalChacterInfo } from "./Types.js";
import { isFarmerCharacter } from "./TypeChecks.js";

export class CharacterMessager {
  cmr: CMRequests;
  char: FarmerCharacter | MerchantCharacter | BaseCharacter;
  constructor(char: FarmerCharacter | MerchantCharacter | BaseCharacter) {
    this.char = char;
    this.cmr = new CMRequests(this.handler.bind(this));
  }

  async handler(message: Request<CMTask>) {
    if (message.message.task === "request_info") {
      this.requestInfoReceived(<Request<CMRequestInfo>>message);
    } else if (message.message.task === "request_items") {
      this.requestItemsReceived(<Request<CMRequestItems>>message);
    } else if (message.message.task === "request_gold") {
      this.requestGoldReceived(<Request<CMRequestGold>>message);
    } else if (message.message.task === "request_party_accept") {
      this.requestPartyAcceptReceived(<Request<CMRequestPartyAccept>>message);
    } else if (message.message.task === "request_leave_party") {
      this.requestLeavePartyReceived(<Request<CMRequestLeaveParty>>message);
    } else if (message.message.task === "request_set_leader") {
      this.requestSetLeaderReceived(<Request<CMRequestSetLeader>>message);
    } else if (message.message.task === "request_add_goal") {
      this.requestAddFarmerGoalReceived(<Request<CMRequestAddFarmerGoal>>message);
    } else {
      message.respond({status: 400, message: `Invalid Request: ${message.message?.task} not recognized.`});
    }
  }

  async gatherAllCharacterInfo(): Promise<{[name: string]: LocalChacterInfo}> {
    var cData: {[name: string]: LocalChacterInfo} = {};
    var promises = [];
    let status = get_active_characters();
    if (Object.keys(status).length > 1) {
      for (let char in status) {
        if (status[char] !== "code") continue;
        promises.push(this.requestInfo(char));
      }
    } else {
      let allCharacters = get_characters();
      for (let char of allCharacters) {
        if (char.name == character.name) continue;
        promises.push(this.requestInfo(char.name));
      }
    }
    var resolved = await Promise.all(promises);
    for (let data of resolved) {
      if (data === null) continue;
      var info = data.data;
      cData[info.name] = info;
    }
    return cData;
    }

  async requestInfo(name: string) {
    var resp = await this.cmr.request(name, {task: "request_info", data: null}, 5_000);
    if (resp.status == 200) {
      return <CMRequestInfoReply>resp.message;
    }
    return null;
  }

  requestInfoReceived(request: Request<CMRequestInfo>) {
    var info: LocalChacterInfo = {
      name: character.name,
      gold: character.gold,
      slots: character.slots,
      items: character.items,
      isize: character.isize,
      party: character.party || null,
      time: new Date()
    };

    if (this.char.leader) info.leader = this.char.leader;

    var response: CMRequestInfoReply = {
      task: "request_info_reply",
      data: info
    };

    request.respondOK(response);
  }

  /**
   * 
   * @param name Name of the character to send the request.
   * @param items An array of number pairs to specify [islot, quantity].
   */
  async requestItems(name: string, items: [number, number][]) {
    var request: CMRequestItems = {task: "request_items", data: items};
    var resp = await this.cmr.request(name, request, 5_000);
    if (resp.status == 200) {
      return <CMRequestItemsReply>resp.message;
    }
    game_log("Items Timed Out")
    return null;
  }

  requestItemsReceived(request: Request<CMRequestItems>) {
    var target = request.from;
    var results: boolean[] = [];
    for (let i in request.message.data) {
      let pair = request.message.data[i];
      let slot = pair[0];
      let quantity = pair[1];

      if (character.items[slot] != null) {
        send_item(target, slot, quantity);
        results.push(true);
      } else {
        results.push(false);
      }
    }
    var response: CMRequestItemsReply = {
      task: "request_items_reply",
      data: results
    };
    request.respondOK(response);
  }

  async requestGold(name: string, gold: number) {
    var request: CMRequestGold = {
      task: "request_gold",
      data: gold
    };
    var resp = await this.cmr.request(name, request, 5_000);
    if (resp.status == 200) {
      return <CMRequestGoldReply>resp.message;
    }
    return null;
  }

  requestGoldReceived(request: Request<CMRequestGold>) {
    var target = request.from;
    try {
      send_gold(target, request.message.data);
      request.respondOK(true);
    } catch {
      request.respondOK(false);
    }
  }

  async requestPartyAccept(name: string) {
    var request: CMRequestPartyAccept = {
      task: "request_party_accept",
      data: character.name
    }
    var resp = await this.cmr.request(name, request, 5_000);
    if (resp.status == 200) {
      return <CMRequestPartyAcceptReply>resp.message;
    }
    return null;
  }

  requestPartyAcceptReceived(request: Request<CMRequestPartyAccept>) {
    var target = request.message.data;
    try {
      accept_party_invite(target);
      request.respondOK(true);
    } catch {
      request.respondOK(false);
    }
  }

  async requestLeaveParty(name: string) {
    var request: CMRequestLeaveParty = {
      task: "request_leave_party",
      data: null
    }
    var resp = await this.cmr.request(name, request, 5_000);
    if (resp.status == 200) {
      return <CMRequestLeavePartyReply>resp.message;
    }
    return null;
  }

  requestLeavePartyReceived(request: Request<CMRequestLeaveParty>) {
    try {
      leave_party();
      request.respondOK(true);
    } catch {
      request.respondOK(false);
    }
  }

  async requestSetLeader(name: string, leader: string) {
    var request: CMRequestSetLeader = {
      task: "request_set_leader",
      data: leader
    }
    var resp = await this.cmr.request(name, request, 5_000);
    if (resp.status == 200) {
      return <CMRequestLeavePartyReply>resp.message;
    }
    return null;
  }

  requestSetLeaderReceived(request: Request<CMRequestSetLeader>) {
    this.char.setLeader(request.message.data);
    request.respondOK(true);
  }

  async requestAddFarmerGoal(name: string, goal: FarmerGoal) {
    var request: CMRequestAddFarmerGoal = {
      task: "request_add_goal",
      data: goal
    }
    var resp = await this.cmr.request(name, request, 5_000);
    if (resp.status == 200) {
      return <CMRequestAddFarmerGoalReply>resp.message;
    }
    return null;
  }

  requestAddFarmerGoalReceived(request: Request<CMRequestAddFarmerGoal>) {
    if (!isFarmerCharacter(this.char)) {
      request.respond({status: 400, message: "Character is not a farmer"});
      return;
    }

    this.char.addGoal(request.message.data);
    request.respondOK(true);
  }
}