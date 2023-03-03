import { GCraft, GItem, ItemKey, MapKey, MonsterKey } from "typed-adventureland";
import { MoverDestination } from "./Mover";

export interface UpgradeInstructions {
  /** Highest x to keep. */
  keep: number;
  /** Once item is this level, start using primlings. */
  primling: number;
  /** Once item is this level, start using primordial essence. */
  primordial: number;
  /** Max level to upgrade an item to. */
  max: number;
}

export interface CompoundInstructions {
  /** Highest x to keep. */
  keep: number;
  /** Once item is this level, start using primlings. */
  primling: number;
  /** Once item is this level, start using primordial essence. */
  primordial: number;
  /** Max level to upgrade an item to. */
  max: number;
}

export interface VendorInstructions {
  /** Where this item can be bought/sold. */
  location: MoverDestination;
  /** Whether or not to allow buying this item. */
  buy: boolean;
  /** Whether or not to allow vendor selling this item. */
  sell: boolean;
  /** If selling is allowed, how many should be kept. -1 disables this.*/
  keep: number;
}

export interface MapDropRate {
  map: MapKey;
  rate: number;
}

export interface MonsterDropRate {
  monster: MonsterKey;
  rate: number;
}

export interface Item {
  name: ItemKey;
  meta: GItem;
  price: number;
  upgrade?: UpgradeInstructions;
  compound?: CompoundInstructions;
  vendor?: VendorInstructions;
  crafting?: GCraft;
}

export function getMapDrops(item: ItemKey): MapDropRate[] {
  let drops: MapDropRate[] = [];
  for (let mname in G.drops.maps) {
    let map = G.drops.maps[<MapKey>mname];
    if (map === undefined) continue;

    for (let drop of map) {
      let name = drop[1];
      if (name === item) drops.push({map: <MapKey>mname, rate: drop[0]});
    }
  }
  return drops;
}

export function getMonsterDrops(item: ItemKey): MonsterDropRate[] {
  let drops: MonsterDropRate[] = [];
  for (let mname in G.drops.monsters) {
    let monster = G.drops.monsters[<MonsterKey>mname];
    if (monster === undefined) continue;

    for (let drop of monster) {
      let name = drop[1];
      if (name === item) drops.push({monster: <MonsterKey>mname, rate: drop[0]});
    }
  }
  return drops;
}

var GabrialVendorUpgradeInstructions: UpgradeInstructions = {
  keep: 3,
  max: 9,
  primling: 90,
  primordial: 90
}

var GabrialVendorInstructions: VendorInstructions = {
  location: "market",
  buy: true,
  sell: false,
  keep: 5
}

var LucasVendorInstructions: VendorInstructions = {
  location: "market",
  buy: true,
  sell: false,
  keep: 1000
}

export var Items: {[name: string]: Item} = {
  // Equipment
  helmet: {
    name: "helmet",
    meta: G.items["helmet"],
    price: G.items["helmet"].g,
    upgrade: GabrialVendorUpgradeInstructions,
    vendor: GabrialVendorInstructions
  },

  shoes: {
    name: "shoes",
    meta: G.items["shoes"],
    price: G.items["shoes"].g,
    upgrade: GabrialVendorUpgradeInstructions,
    vendor: GabrialVendorInstructions
  },

  gloves: {
    name: "gloves",
    meta: G.items["gloves"],
    price: G.items["gloves"].g,
    upgrade: GabrialVendorUpgradeInstructions,
    vendor: GabrialVendorInstructions
  },

  pants: {
    name: "pants",
    meta: G.items["pants"],
    price: G.items["pants"].g,
    upgrade: GabrialVendorUpgradeInstructions,
    vendor: GabrialVendorInstructions
  },

  coat: {
    name: "coat",
    meta: G.items["coat"],
    price: G.items["coat"].g,
    upgrade: GabrialVendorUpgradeInstructions,
    vendor: GabrialVendorInstructions
  },

  stinger: {
    name: "stinger",
    meta: G.items["stinger"],
    price: G.items["stinger"].g,
    upgrade: {
      keep: 3,
      max: 8,
      primling: 20,
      primordial: 20
    },
    vendor: {
      location: "market",
      buy: false,
      sell: true,
      keep: 3
    }
  },

  ringsj: {
    name: "ringsj",
    meta: G.items["ringsj"],
    price: G.items["ringsj"].g,
    compound: {
      keep: 6,
      max: 5,
      primling: 20,
      primordial: 20
    }
  },

  firestaff: {
    name: "firestaff",
    meta: G.items["firestaff"],
    price: G.items["firestaff"].g,
    upgrade: {
      keep: 6,
      max: 8,
      primling: 20,
      primordial: 20
    },
    crafting: G.craft["firestaff"]
  },

  fireblade: {
    name: "fireblade",
    meta: G.items["fireblade"],
    price: G.items["fireblade"].g,
    upgrade: {
      keep: 6,
      max: 8,
      primling: 20,
      primordial: 20
    },
    crafting: G.craft["fireblade"]
  },

  // Consumables
  hpot0: {
    name: "hpot0",
    meta: G.items["hpot0"],
    price: G.items["hpot0"].g,
    vendor: LucasVendorInstructions
  },

  mpot0: {
    name: "mpot0",
    meta: G.items["mpot0"],
    price: G.items["mpot0"].g,
    vendor: LucasVendorInstructions
  },

  scroll0: {
    name: "scroll0",
    meta: G.items["scroll0"],
    price: G.items["scroll0"].g,
    vendor: LucasVendorInstructions
  },

  scroll1: {
    name: "scroll1",
    meta: G.items["scroll1"],
    price: G.items["scroll1"].g,
    vendor: LucasVendorInstructions
  },

  cscroll0: {
    name: "cscroll0",
    meta: G.items["cscroll0"],
    price: G.items["cscroll0"].g,
    vendor: LucasVendorInstructions
  },

  cscroll1: {
    name: "cscroll1",
    meta: G.items["cscroll1"],
    price: G.items["cscroll1"].g,
    vendor: LucasVendorInstructions
  }
}