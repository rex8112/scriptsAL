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
  /** Whether or not level zero should be auto compounded */
  allowZero: boolean;
}

export interface VendorInstructions {
  /** Where this item can be bought. */
  buyLocation: MoverDestination;
  /** Whether or not to allow buying this item. */
  buy: boolean;
  /** Whether or not to allow vendor selling this item. */
  sell: boolean;
  /** If selling is allowed, how many should be kept. -1 disables this.*/
  keep: number;
}

export interface TradeInstructions {
  /** The maximum allowed money to buy this for */
  buyMax: number;
  /** The price to sell this for. 0 disables. */
  sellPrice: number;
  /** An object specifying a sell price per item level. This will override sellPrice. */
  levelPrice?: {[level: number]: number};
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
  trade?: TradeInstructions;
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
  keep: 1,
  max: 9,
  primling: 90,
  primordial: 90
}

var GabrialVendorInstructions: VendorInstructions = {
  buyLocation: "market",
  buy: true,
  sell: false,
  keep: 5
}

var LucasVendorInstructions: VendorInstructions = {
  buyLocation: "market",
  buy: true,
  sell: false,
  keep: 1000
}

var WanderersUpgradeInstructions: UpgradeInstructions = {
  keep: 3,
  max: 9,
  primling: 20,
  primordial: 20
}

var RuggedUpgradeInstructions: UpgradeInstructions = {
  keep: 1,
  max: 7,
  primling: 20,
  primordial: 20
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

  // Wanderer's Set
  wcap: {
    name: "wcap",
    meta: G.items["wcap"],
    price: G.items["wcap"].g,
    crafting: G.craft["wcap"],
    upgrade: WanderersUpgradeInstructions
  },

  wattire: {
    name: "wattire",
    meta: G.items["wattire"],
    price: G.items["wattire"].g,
    crafting: G.craft["wattire"],
    upgrade: WanderersUpgradeInstructions
  },

  wbreeches: {
    name: "wbreeches",
    meta: G.items["wbreeches"],
    price: G.items["wbreeches"].g,
    crafting: G.craft["wbreeches"],
    upgrade: WanderersUpgradeInstructions
  },

  wgloves: {
    name: "wgloves",
    meta: G.items["wgloves"],
    price: G.items["wgloves"].g,
    crafting: G.craft["wgloves"],
    upgrade: WanderersUpgradeInstructions
  },

  wshoes: {
    name: "wshoes",
    meta: G.items["wshoes"],
    price: G.items["wshoes"].g,
    crafting: G.craft["wshoes"],
    upgrade: WanderersUpgradeInstructions
  },

  // Rugged Set
  helmet1: {
    name: "helmet1",
    meta: G.items["helmet1"],
    price: G.items["helmet1"].g,
    crafting: G.craft["helmet1"],
    upgrade: RuggedUpgradeInstructions
  },

  coat1: {
    name: "coat1",
    meta: G.items["coat1"],
    price: G.items["coat1"].g,
    crafting: G.craft["coat1"],
    upgrade: RuggedUpgradeInstructions
  },

  pants1: {
    name: "pants1",
    meta: G.items["pants1"],
    price: G.items["pants1"].g,
    crafting: G.craft["pants1"],
    upgrade: RuggedUpgradeInstructions
  },

  gloves1: {
    name: "gloves1",
    meta: G.items["gloves1"],
    price: G.items["gloves1"].g,
    crafting: G.craft["gloves1"],
    upgrade: RuggedUpgradeInstructions
  },

  shoes1: {
    name: "shoes1",
    meta: G.items["shoes1"],
    price: G.items["shoes1"].g,
    crafting: G.craft["shoes1"],
    upgrade: RuggedUpgradeInstructions
  },

  // Weapons
  staff: {
    name: "staff",
    meta: G.items["staff"],
    price: G.items["staff"].g,
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
      buyLocation: "market",
      buy: false,
      sell: true,
      keep: 3
    }
  },

  mushroomstaff: {
    name: "mushroomstaff",
    meta: G.items["mushroomstaff"],
    price: G.items["mushroomstaff"].g,
    upgrade: {
      keep: 2,
      max: 8,
      primling: 20,
      primordial: 20
    },
    vendor: {
      buyLocation: "market",
      buy: false,
      sell: true,
      keep: 2
    }
  },
  
  cclaw: {
    name: "cclaw",
    meta: G.items["cclaw"],
    price: G.items["cclaw"].g,
    vendor: {
      buyLocation: "market",
      buy: false,
      sell: true,
      keep: -1
    }
  },

  // Fire Weapons
  firestaff: {
    name: "firestaff",
    meta: G.items["firestaff"],
    price: G.items["firestaff"].g,
    upgrade: {
      keep: 3,
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
      keep: 3,
      max: 8,
      primling: 20,
      primordial: 20
    },
    crafting: G.craft["fireblade"]
  },

  // Accessories
  ringsj: {
    name: "ringsj",
    meta: G.items["ringsj"],
    price: G.items["ringsj"].g,
    compound: {
      keep: 3,
      max: 4,
      primling: 20,
      primordial: 20,
      allowZero: false
    },
    vendor: {
      buyLocation: "market",
      buy: false,
      sell: true,
      keep: 0
    }
  },

  hpamulet: {
    name: "hpamulet",
    meta: G.items["hpamulet"],
    price: G.items["hpamulet"].g,
    compound: {
      keep: 3,
      max: 4,
      primling: 20,
      primordial: 20,
      allowZero: false
    },
    vendor: {
      buyLocation: "market",
      buy: false,
      sell: true,
      keep: 0
    }
  },

  hpbelt: {
    name: "hpbelt",
    meta: G.items["hpbelt"],
    price: G.items["hpbelt"].g,
    compound: {
      keep: 3,
      max: 4,
      primling: 20,
      primordial: 20,
      allowZero: false
    },
    vendor: {
      buyLocation: "market",
      buy: false,
      sell: true,
      keep: 0
    }
  },

  intamulet: {
    name: "intamulet",
    meta: G.items["intamulet"],
    price: G.items["intamulet"].g,
    compound: {
      keep: 2,
      max: 4,
      primling: 20,
      primordial: 20,
      allowZero: false
    }
  },

  stramulet: {
    name: "stramulet",
    meta: G.items["stramulet"],
    price: G.items["stramulet"].g,
    compound: {
      keep: 1,
      max: 4,
      primling: 20,
      primordial: 20,
      allowZero: false
    }
  },

  dexamulet: {
    name: "dexamulet",
    meta: G.items["dexamulet"],
    price: G.items["dexamulet"].g,
    compound: {
      keep: 1,
      max: 4,
      primling: 20,
      primordial: 20,
      allowZero: false
    }
  },

  dexring: {
    name: "dexring",
    meta: G.items["dexring"],
    price: G.items["dexring"].g,
    compound: {
      keep: 1,
      max: 4,
      primling: 20,
      primordial: 20,
      allowZero: false
    },
    vendor: {
      buyLocation: "market",
      buy: false,
      sell: true,
      keep: 0
    }
  },

  orbg: {
    name: "orbg",
    meta: G.items["orbg"],
    price: G.items["orbg"].g,
    compound: {
      keep: 3,
      max: 3,
      primling: 20,
      primordial: 20,
      allowZero: false
    }
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
  },

  // Materials
  spores: {
    name: "spores",
    meta: G.items["spores"],
    price: G.items["spores"].g,
    vendor: {
      sell: true,
      buy: false,
      keep: 9_999,
      buyLocation: "market"
    }
  },

  beewings: {
    name: "beewings",
    meta: G.items["beewings"],
    price: G.items["beewings"].g,
    vendor: {
      sell: true,
      buy: false,
      keep: 9_999,
      buyLocation: "market"
    }
  },

  seashell: {
    name: "seashell",
    meta: G.items["seashell"],
    price: G.items["seashell"].g,
    vendor: {
      sell: true,
      buy: false,
      keep: 9_999,
      buyLocation: "market"
    }
  },

  cscale: {
    name: "cscale",
    meta: G.items["cscale"],
    price: G.items["cscale"].g,
    vendor: {
      sell: true,
      buy: false,
      keep: 9_999,
      buyLocation: "market"
    }
  },

  essenceoffire: {
    name: "essenceoffire",
    meta: G.items["essenceoffire"],
    price: G.items["essenceoffire"].g,
    trade: {
      buyMax: 88_000,
      sellPrice: 0
    }
  },
}