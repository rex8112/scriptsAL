import AL, { Entity, ItemName, Mage, Merchant, MonsterName, Player, PullMerchantsCharData, TradeSlotType } from "alclient";
import { Character, IPosition, ItemData } from "alclient";
import { Mover } from "./Mover.js";
import { FarmerGoal, LocalChacterInfo } from "./Types.js";
import { CharacterMessager } from "./CharacterMessager.js";
import { callAPI, getItemQuantity, sleep, smartUseHpOrMp } from "./Utils/Functions.js";
import { Bank } from "./Bank.js";
import { MerchantTaskController } from "./MerchantTasks.js";
import { CheckCompound } from "./Tasks/CompoundItems.js";
import { CheckUpgrade } from "./Tasks/UpgradeItems.js";
import { ReplenishFarmersTask } from "./Tasks/ReplenishFarmers.js";
import { Items } from "./Items.js";
import Location from "./Utils/Location.js";
import { isIPosition } from "./TypeChecks.js";

export class BaseCharacter {
  ch: Character;
  class: string;
  name: string;
  //CM: CharacterMessager;
  working: boolean = false;
  leader: string | null = null;

  potionUseTask: NodeJS.Timer | null = null;
  lootTask: NodeJS.Timer | null = null;
  respawnTask: NodeJS.Timer | null = null;

  constructor(ch: Character) {
    this.ch = ch;
    this.class = ch.ctype;
    this.name = ch.name;
    //this.CM = new CharacterMessager(this);
    
  }

  get Position(): Location {
    return Location.fromEntity(this.ch);
  }

  startTasks() {
    if (this.potionUseTask === null)
      this.potionUseTask = setInterval(smartUseHpOrMp, 250);
    if (this.lootTask === null)
      this.lootTask = setInterval(() => {}, 250);
    if (this.respawnTask === null)
      this.respawnTask = setInterval(() => { this.respawn() }, 15_000);
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
  characterInfo: {[name: string]: LocalChacterInfo} = {};
  updateTask: NodeJS.Timer | null = null;
  standTask: NodeJS.Timer | null = null;
  inspectMerchantTask: NodeJS.Timer | null = null;
  taskController: MerchantTaskController;
  ch: Merchant;

  constructor(ch: Merchant) {
    super(ch);
    this.ch = ch;
    this.taskController = new MerchantTaskController(this);
    this.taskController.run();
    this.updateCharacterInfo();
  }

  startTasks() {
    super.startTasks();

    //if (this.updateTask === null)
    //  this.updateTask = setInterval(() => { this.updateCharacterInfo() }, 30_000);
    if (this.standTask === null)
      this.standTask = setInterval(() => { this.open_close_stand() }, 150);
    if (this.inspectMerchantTask === null)
      this.inspectMerchantTask = setInterval(() => { this.inspectNearbyMerchants() }, 5_000);
    
    this.taskController.enqueueTask(new CheckUpgrade(this, this.taskController));
    this.taskController.enqueueTask(new CheckCompound(this, this.taskController));
  }

  async run() {
    if (this.bank.noInfo()) {
      await this.bank.updateInfo();
      await sleep(1_000);
    }

    //if (this.getCompoundableItemsFromBank().length > 0) this.taskController.enqueueTask(new CompoundItems(this), 100);

    if (this.needFarmerRun()) this.taskController.enqueueTask(new ReplenishFarmersTask(this), 500);
  }

  open_close_stand() {
    if (this.taskController.running) return;

    if (this.ch.moving && this.ch.stand) {
      this.ch.closeMerchantStand();
    } else if (!this.ch.moving && !this.ch.stand) {
      this.ch.openMerchantStand();
    }
  }

  async cleanInventory() {
    let keep = ["hpot0", "mpot0", "stand0"]
    let pos: number[] = [];
    let sellPos: [number, number][] = [];
    for (let i in this.ch.items) {
      let item = this.ch.items[i];
      if (item && !keep.includes(item.name)) {
        let quantity = item.q ?? 1;
        let data = Items[item.name];
        if (data && data.vendor?.sell === true) {
          let total = this.bank.items[item.name]?.getTotal() ?? 0 + quantity;
          if (total >= data.vendor.keep) {
            let sell = total - data.vendor.keep;
            if (sell >= quantity) {
              sellPos.push([Number(i), quantity]);
              continue;
            } else {
              sellPos.push([Number(i), sell])
            }
          }
        }
        pos.push(Number(i));
      }
    }

    console.log(sellPos);
    if (sellPos.length > 0) {
      await this.move("market");
      for (let pos of sellPos) {
        try {
          await this.ch.sell(pos[0], pos[1]);
        } catch {
          console.error("Item not present.");
        }
      }
    }

    await this.bank.storeItems(pos);

    if (this.ch.gold > 2_000_000) {
      await this.bank.depositGold(this.ch.gold - 2_000_000);
    }
  }

  async farmerRun() {
    this.taskController.enqueueTask(new ReplenishFarmersTask(this), 600);
  }

  async buy(item: ItemName, amount: number): Promise<number> {
    if (amount === 0) return -1;
    let i = Items[item];
    let d = AL.Game.G.items[item];
    if (i === undefined || !i.vendor?.buy) return -1;
    let neededGold = amount * d.g;
    if (neededGold > this.ch.gold) {
      if (this.bank.gold >= neededGold - this.ch.gold)
        await this.bank.withdrawGold(neededGold - this.ch.gold);
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
        let b = this.bank.items[item];
        if (b !== undefined) {
          let results = await b.getItem(amount);
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
      if (this.bank.gold >= totalGold - this.ch.gold)
        await this.bank.withdrawGold(totalGold - this.ch.gold);
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
      if (this.bank.gold < totalGold) {
        return;
      }
      await this.bank.withdrawGold(totalGold - this.ch.gold);
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

  async addFarmerGoal(item: ItemName, quantity: number) {
    if (!this.leader) return false;
    let mobs: [name: MonsterName, rate: number][] = [];
    for (let mname in AL.Game.G.drops.monsters) {
      let drops = AL.Game.G.drops.monsters[<MonsterName>mname];
      if (!drops) continue;
      for (let drop of drops) {
        let [rate, iname] = drop;
        if (iname === item) {
          mobs.push([<MonsterName>mname, rate]);
        }
      }
    }
    if (mobs.length <= 0) return false;
    mobs.sort((a, b) => { return b[1] - a[1]; });
    let chosen = mobs[0];
    let goal: FarmerGoal = {name: chosen[0], for: {name: item, amount: quantity}, issued: Date.now()};
    let resp = await this.CM.requestAddFarmerGoal(this.leader, goal);
    return resp?.data ?? false;
  }

  needFarmerRun(): boolean {
    var go = false;
    for (var name in this.characterInfo) {
      let char = this.characterInfo[name];
      if (this.getTakableItems(char).length > 10) go = true;
      if (char.gold >= 100_000) go = true;
      if (getItemQuantity("hpot0", char.items, char.isize) < 100) go = true;
      if (getItemQuantity("mpot0", char.items, char.isize) < 100) go = true;
    }
    return go;
  }

  getTakableItems(char: LocalChacterInfo): [number, number][] {
    var items: [number, number][] = [];
    let save = ["hpot0", "mpot0"];
    for (let i = 0; i < char.isize; i++) {
      if (char.items[i] && !save.includes(char.items[i].name))
        items.push([i, char.items[i].q || 1]);
    }
    return items;
  }

  async updateCharacterInfo() {
    return;
    //var cData = await this.CM.gatherAllCharacterInfo();
    this.characterInfo = cData;
    if (this.leader !== null && !Object.keys(cData).includes(this.leader)) {
      this.leader = null;
    }
    for (let name in cData) {
      let char = cData[name];
      let invite = false;
      if (this.leader == null) {
        this.leader = char.name;
      }
      if (char.leader !== this.leader) {
        this.CM.requestSetLeader(char.name, this.leader);
      }
      if (char.party === null) {
        invite = true;
      } else if (char.party !== this.ch.name) {
        invite = true;
        await this.CM.requestLeaveParty(char.name);
      }

      if (invite) {
        this.ch.sendPartyInvite(name);
        this.CM.requestPartyAccept(name);
      }
    }
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
}