import AL, { Entity, ItemName, LimitDCReportData, Mage, MapName, Merchant, MonsterName, Player, PullMerchantsCharData, TradeSlotType } from "alclient";
import { Character, IPosition, ItemData } from "alclient";
import { CustomCharacter, FarmerGoal } from "./Types.js";
import { getFreeSlots, getItemPosition, getItemQuantity } from "./Utils/Functions.js";
import { Bank } from "./Bank.js";
import { MerchantTaskController } from "./MerchantTasks.js";
import { ReplenishFarmersTask } from "./Tasks/ReplenishFarmers.js";
import { Items } from "./Items.js";
import Location from "./Utils/Location.js";
import { isIPosition } from "./TypeChecks.js";
import { GameController } from "./Controllers.js";

export class BaseCharacter {
  game: GameController;
  ch: Character;
  class: string;
  name: string;
  //CM: CharacterMessager;
  working: boolean = false;
  leader: string | null = null;

  potionUseTask: NodeJS.Timer | null = null;
  lootTask: NodeJS.Timer | null = null;
  respawnTask: NodeJS.Timer | null = null;

  constructor(gc: GameController, ch: Character) {
    this.game = gc;
    this.ch = ch;
    this.class = ch.ctype;
    this.name = ch.name;
    this.registerEvents();
    //this.CM = new CharacterMessager(this);
    
  }

  get Position(): Location {
    return Location.fromEntity(this.ch);
  }

  get x(): number {
    return this.ch.x;
  }

  get y(): number {
    return this.ch.y;
  }

  get map(): MapName {
    return this.ch.map;
  }

  logLimitDCReport(data: LimitDCReportData) {
    console.debug(`=== START LIMITDCREPORT (${this.ch.id}) ===`)
    console.debug(data)
    console.debug(`=== END LIMITDCREPORT ${this.ch.id} ===`)
  }

  registerEvents() {
    this.ch.socket.on("disconnect", (data) => {
      console.error(this.name, "Disconnected!", data);
    });
    this.ch.socket.on("disconnect_reason", (data) => {
      console.error(this.name, "Disconnected!", data);
    });

    this.ch.socket.on("limitdcreport", this.logLimitDCReport)
  }

  startTasks() {
    if (this.potionUseTask === null)
      this.potionUseTask = setInterval(() => { this.smartUseHpOrMp(); }, 250);
    if (this.lootTask === null)
      this.lootTask = setInterval(() => { this.lootAll(); }, 250);
    if (this.respawnTask === null)
      this.respawnTask = setInterval(() => { this.respawn(); }, 15_000);
  }

  async startRun() {
    this.startTasks();
    try {
      await this.run();
    } catch (e) {
      console.error("Error in run: ", e);
    }
    setTimeout(() => { this.startRun() }, 500);
  }

  async run() {}

  setLeader(leader: string) {
    this.leader = leader;
  }

  getEntity(id: string): Entity | Player | null {
    let entities = this.ch.getEntities();
    for (let e of entities) {
      if (e.id === id) return e;
    }
    return null;
  }

  getPlayer(id: string): Player | null {
    let entities = this.ch.getPlayers({});
    for (let e of entities) {
      if (e.id === id) return e;
    }
    return null;
  }

  getItemPosition(name: ItemName) {
    return getItemPosition(name, this.ch.items, this.ch.isize);
  }

  getItemQuantity(name: ItemName) {
    return getItemQuantity(name, this.ch.items, this.ch.isize);
  }

  getFreeSlots() {
    return getFreeSlots(this.ch.items, this.ch.isize);
  }

  /**
   * Get an array of all instances of an item in your inventory.
   * @param name The name of the item.
   * @returns An array of item info and positions for each instance of the item in your inventory.
   */
  getItem(name: string): {item: ItemData, pos: number}[] {
    var items: {item: ItemData, pos: number}[] = [];
    for (let i = 0; i < this.ch.isize; i++) {
      let item = this.ch.items[i];
      if (item && item.name==name)
        items.push({item: item, pos: i});
      }
    return items;
  }

  storeItems(ipos: number[]) {
    return this.game.bank.storeItems(this, ipos);
  }

  withdrawGold(amount: number) {
    return this.game.bank.withdrawGold(this, amount);
  }

  depositGold(amount: number) {
    return this.game.bank.depositGold(this, amount);
  }

  async buy(item: ItemName, amount: number): Promise<number> {
    if (amount === 0) return -1;
    let i = Items[item];
    let d = AL.Game.G.items[item];
    if (i === undefined || !i.vendor?.buy) return -1;
    let neededGold = amount * d.g;
    if (neededGold > this.ch.gold) {
      if (this.game.bank.gold >= neededGold - this.ch.gold)
        await this.withdrawGold(neededGold - this.ch.gold);
      else
        return -1;
    }
    await this.move(i.vendor.buyLocation);
    let data = await this.ch.buy(item, amount);
    return data;
  }

  async bulk_buy(items: [item: ItemName, amount: number][], allowBank: boolean = false): Promise<number[]> {
    let totalGold = 0;
    let nums: number[] = [];
    for (let index in items) {
      let [item, amount] = items[index];
      let i = Items[item];
      let d = AL.Game.G.items[item];
      if (i === undefined || !i.vendor?.buy) return [];

      if (allowBank && amount > 0) {
        let b = this.game.bank.items[item];
        if (b !== undefined) {
          let results = await b.getItem(this, amount);
          results.forEach((pos) => { 
            let item = <ItemData>this.ch.items[pos];
            amount -= item.q || 1;
            items[index][1] -= item.q || 1;
            if (nums.indexOf(pos) === -1)
              nums.push(pos);
          });
        }
      }
      totalGold += amount * d.g;
    }

    if (totalGold > this.ch.gold) {
      if (this.game.bank.gold >= totalGold - this.ch.gold)
        await this.withdrawGold(totalGold - this.ch.gold);
      else
        return [];
    }
    
    for (let [item, amount] of items) {
      if (amount <= 0) {
        nums.push(-1);
        continue;
      }
      let i = Items[item];
      if (i.vendor) await this.move(i.vendor.buyLocation);
      let data = await this.ch.buy(item, amount);
      if (nums.indexOf(data) === -1)
        nums.push(data);
    }
    return nums;
  }

  /**
   * A shortcut method to use Mover.move().
   * @param dest Destination to move character.
   * @returns The promise returned by Mover.move().
   */
  move(dest: IPosition | string) {
    if (isIPosition(dest) && AL.Pathfinder.canWalkPath(this.ch, dest))
      return this.ch.move(dest.x, dest.y);
    return this.ch.smartMove(<IPosition>dest); // Not actually an IPosition but there is no alias for all the possible string movements.
  }

  oneAtATime(func: () => Promise<void>) {
    if (this.working === true) return;
    this.working = true;
    func().finally(() => {this.working = false});
  }

  smartUseHpOrMp() {
    var heal = this.ch.locateItem("hpot0");
    var mana = this.ch.locateItem("mpot0");

    if (this.ch.isOnCooldown("use_hp")) {
      return new Promise((resolve) => {resolve("On Cooldown")});
    }
    if (this.ch.hp < this.ch.max_hp / 2 && heal !== undefined) 
      return this.ch.useHPPot(heal)
    else if (this.ch.mp < this.ch.max_mp-300 && mana !== undefined)
      return this.ch.useMPPot(mana)
  }

  async lootAll() {
    let chests = this.ch.chests;
    for (let chest of chests) {
      await this.ch.openChest(chest[0]);
    }
  }

  respawn() {
    if (this.ch.rip) {
      this.ch.respawn();
    }
  }
}

export class MerchantCharacter extends BaseCharacter {
  static itemsToTake: ItemName[] = [
    "beewings", "crabclaw", "gslime", "gem0", "seashell", "stinger", "hpbelt",
    "ringsj", "hpamulet", "wcap", "wshoes", "intscroll"
  ];
  updateTask: NodeJS.Timer | null = null;
  standTask: NodeJS.Timer | null = null;
  inspectMerchantTask: NodeJS.Timer | null = null;
  ch: Merchant;

  constructor(gc: GameController, ch: Merchant) {
    super(gc, ch);
    this.ch = ch;
  }

  startTasks() {
    super.startTasks();

    //if (this.updateTask === null)
    //  this.updateTask = setInterval(() => { this.updateCharacterInfo() }, 30_000);
    
    //this.taskController.enqueueTask(new CheckUpgrade(this, this.taskController));
    //this.taskController.enqueueTask(new CheckCompound(this, this.taskController));
  }

  async tradeBuy(items: {item: ItemName, level?: number, amount: number}[], allow_cross_server: boolean = false) {
    let data: PullMerchantsCharData[] = await AL.Game.getMerchants()
    let chars = data;
    let merchantOrders: {[merchant: string]: {location: Location, buy: {slot: TradeSlotType, rid: string, quantity: number}[]}} = {};
    let results = [];
    items.forEach(_ => results.push(false));
    let totalGold = 0;
    for (let merch of chars) {
      if (allow_cross_server === false && merch.server !== `${this.ch.serverData.region} ${this.ch.serverData.name}`) continue;

      let buyOrders: {slot: TradeSlotType, rid: string, quantity: number}[] = [];
      for (let i = 0; i < items.length; i++) {
        let item = items[i];
        let data = Items[item.item];
        if (data === undefined || data.trade === undefined) continue;
        for (let slot in merch.slots) {
          let trade = merch.slots[<TradeSlotType>slot];
          if (!trade) continue;
          if (trade.name !== item.item) continue;
          if (item.level !== undefined && item.level !== trade.level) continue;
          if (trade.q && trade.q < item.amount) continue;
          if (trade.price > data.trade.buyMax) continue;
          buyOrders.push({slot: <TradeSlotType>slot, rid: trade.rid, quantity: item.amount});
          totalGold += trade.price * item.amount;
        }
      }
      if (buyOrders.length > 0) {
        let order = {location: Location.fromPosition(merch), buy: buyOrders};
        merchantOrders[merch.name] = order;
      }
    }

    if (this.ch.gold < totalGold) {
      if (this.game.bank.gold < totalGold) {
        return;
      }
      await this.withdrawGold(totalGold - this.ch.gold);
    }

    for (let mname in merchantOrders) {
      let order = merchantOrders[mname];
      await this.move(order.location.asPosition());
      let merchant = this.getPlayer(mname);
      if (!merchant) continue;
      
      for (let buyOrder of order.buy) {
        await this.ch.buyFromMerchant(merchant.id, buyOrder.slot, buyOrder.rid, buyOrder.quantity);
      }
    }
  }

  /* needFarmerRun(): boolean {
    var go = false;
    for (var name in this.characterInfo) {
      let char = this.characterInfo[name];
      if (this.getTakableItems(char).length > 10) go = true;
      if (char.gold >= 100_000) go = true;
      if (getItemQuantity("hpot0", char.items, char.isize) < 100) go = true;
      if (getItemQuantity("mpot0", char.items, char.isize) < 100) go = true;
    }
    return go;
  } */

  getTakableItems(char: CustomCharacter): [number, number][] {
    var items: [number, number][] = [];
    let save = ["hpot0", "mpot0"];
    for (let i = 0; i < char.ch.isize; i++) {
      let item = char.ch.items[i];
      if (item && !save.includes(item.name))
        items.push([i, item.q || 1]);
    }
    return items;
  }

  inspectNearbyMerchants() {
    let merchants = this.ch.getPlayers({ctype: "merchant"});
    for (var i in merchants) {
      let char = merchants[i];
      if (!char || char.ctype != "merchant") continue;
      for (var ename in char.slots) {
        if (!ename.startsWith("trade")) continue;
        let item = char.slots[<TradeSlotType>ename];
        if (item && item.giveaway && !Object.values(<Record<string, string>>item.registry).includes(this.ch.name)) {
          this.ch.joinGiveaway(<TradeSlotType>ename, char.id, item.rid);
        }
      }
    }
  }
}