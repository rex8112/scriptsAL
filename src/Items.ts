import AL, { GItem, ItemName, MapName, MonsterName } from "alclient";
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
  map: MapName;
  rate: number;
}

export interface MonsterDropRate {
  monster: MonsterName;
  rate: number;
}

export interface Item {
  name: ItemName;
  meta: GItem;
  price: number;
  upgrade?: UpgradeInstructions;
  compound?: CompoundInstructions;
  vendor?: VendorInstructions;
  trade?: TradeInstructions;
  crafting?: true;
}

export function getMapDrops(item: ItemName): MapDropRate[] {
  let drops: MapDropRate[] = [];
  for (let mname in AL.Game.G.drops.maps) {
    let map = AL.Game.G.drops.maps[<MapName>mname];
    if (map === undefined) continue;

    for (let drop of map) {
      let name = drop[1];
      if (name === item) drops.push({map: <MapName>mname, rate: drop[0]});
    }
  }
  return drops;
}

export function getMonsterDrops(item: ItemName): MonsterDropRate[] {
  let drops: MonsterDropRate[] = [];
  for (let mname in AL.Game.G.drops.monsters) {
    let monster = AL.Game.G.drops.monsters[<MonsterName>mname];
    if (monster === undefined) continue;

    for (let drop of monster) {
      let name = drop[1];
      if (name === item) drops.push({monster: <MonsterName>mname, rate: drop[0]});
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
    meta: AL.Game.G.items["helmet"],
    price: AL.Game.G.items["helmet"].g,
    upgrade: GabrialVendorUpgradeInstructions,
    vendor: GabrialVendorInstructions
  },

  shoes: {
    name: "shoes",
    meta: AL.Game.G.items["shoes"],
    price: AL.Game.G.items["shoes"].g,
    upgrade: GabrialVendorUpgradeInstructions,
    vendor: GabrialVendorInstructions
  },

  gloves: {
    name: "gloves",
    meta: AL.Game.G.items["gloves"],
    price: AL.Game.G.items["gloves"].g,
    upgrade: GabrialVendorUpgradeInstructions,
    vendor: GabrialVendorInstructions
  },

  pants: {
    name: "pants",
    meta: AL.Game.G.items["pants"],
    price: AL.Game.G.items["pants"].g,
    upgrade: GabrialVendorUpgradeInstructions,
    vendor: GabrialVendorInstructions
  },

  coat: {
    name: "coat",
    meta: AL.Game.G.items["coat"],
    price: AL.Game.G.items["coat"].g,
    upgrade: GabrialVendorUpgradeInstructions,
    vendor: GabrialVendorInstructions
  },

  // Wanderer's Set
  wcap: {
    name: "wcap",
    meta: AL.Game.G.items["wcap"],
    price: AL.Game.G.items["wcap"].g,
    crafting: true,
    upgrade: WanderersUpgradeInstructions
  },

  wattire: {
    name: "wattire",
    meta: AL.Game.G.items["wattire"],
    price: AL.Game.G.items["wattire"].g,
    crafting: true,
    upgrade: WanderersUpgradeInstructions
  },

  wbreeches: {
    name: "wbreeches",
    meta: AL.Game.G.items["wbreeches"],
    price: AL.Game.G.items["wbreeches"].g,
    crafting: true,
    upgrade: WanderersUpgradeInstructions
  },

  wgloves: {
    name: "wgloves",
    meta: AL.Game.G.items["wgloves"],
    price: AL.Game.G.items["wgloves"].g,
    crafting: true,
    upgrade: WanderersUpgradeInstructions
  },

  wshoes: {
    name: "wshoes",
    meta: AL.Game.G.items["wshoes"],
    price: AL.Game.G.items["wshoes"].g,
    crafting: true,
    upgrade: WanderersUpgradeInstructions
  },

  // Rugged Set
  helmet1: {
    name: "helmet1",
    meta: AL.Game.G.items["helmet1"],
    price: AL.Game.G.items["helmet1"].g,
    crafting: true,
    upgrade: RuggedUpgradeInstructions
  },

  coat1: {
    name: "coat1",
    meta: AL.Game.G.items["coat1"],
    price: AL.Game.G.items["coat1"].g,
    crafting: true,
    upgrade: RuggedUpgradeInstructions
  },

  pants1: {
    name: "pants1",
    meta: AL.Game.G.items["pants1"],
    price: AL.Game.G.items["pants1"].g,
    crafting: true,
    upgrade: RuggedUpgradeInstructions
  },

  gloves1: {
    name: "gloves1",
    meta: AL.Game.G.items["gloves1"],
    price: AL.Game.G.items["gloves1"].g,
    crafting: true,
    upgrade: RuggedUpgradeInstructions
  },

  shoes1: {
    name: "shoes1",
    meta: AL.Game.G.items["shoes1"],
    price: AL.Game.G.items["shoes1"].g,
    crafting: true,
    upgrade: RuggedUpgradeInstructions
  },

  // Weapons
  staff: {
    name: "staff",
    meta: AL.Game.G.items["staff"],
    price: AL.Game.G.items["staff"].g,
    upgrade: GabrialVendorUpgradeInstructions,
    vendor: GabrialVendorInstructions
  },

  stinger: {
    name: "stinger",
    meta: AL.Game.G.items["stinger"],
    price: AL.Game.G.items["stinger"].g,
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
    meta: AL.Game.G.items["mushroomstaff"],
    price: AL.Game.G.items["mushroomstaff"].g,
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
    meta: AL.Game.G.items["cclaw"],
    price: AL.Game.G.items["cclaw"].g,
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
    meta: AL.Game.G.items["firestaff"],
    price: AL.Game.G.items["firestaff"].g,
    upgrade: {
      keep: 3,
      max: 8,
      primling: 20,
      primordial: 20
    },
    crafting: true,
  },

  fireblade: {
    name: "fireblade",
    meta: AL.Game.G.items["fireblade"],
    price: AL.Game.G.items["fireblade"].g,
    upgrade: {
      keep: 3,
      max: 8,
      primling: 20,
      primordial: 20
    },
    crafting: true,
  },

  // Accessories
  ringsj: {
    name: "ringsj",
    meta: AL.Game.G.items["ringsj"],
    price: AL.Game.G.items["ringsj"].g,
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
    meta: AL.Game.G.items["hpamulet"],
    price: AL.Game.G.items["hpamulet"].g,
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
    meta: AL.Game.G.items["hpbelt"],
    price: AL.Game.G.items["hpbelt"].g,
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
    meta: AL.Game.G.items["intamulet"],
    price: AL.Game.G.items["intamulet"].g,
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
    meta: AL.Game.G.items["stramulet"],
    price: AL.Game.G.items["stramulet"].g,
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
    meta: AL.Game.G.items["dexamulet"],
    price: AL.Game.G.items["dexamulet"].g,
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
    meta: AL.Game.G.items["dexring"],
    price: AL.Game.G.items["dexring"].g,
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
    meta: AL.Game.G.items["orbg"],
    price: AL.Game.G.items["orbg"].g,
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
    meta: AL.Game.G.items["hpot0"],
    price: AL.Game.G.items["hpot0"].g,
    vendor: LucasVendorInstructions
  },

  mpot0: {
    name: "mpot0",
    meta: AL.Game.G.items["mpot0"],
    price: AL.Game.G.items["mpot0"].g,
    vendor: LucasVendorInstructions
  },

  scroll0: {
    name: "scroll0",
    meta: AL.Game.G.items["scroll0"],
    price: AL.Game.G.items["scroll0"].g,
    vendor: LucasVendorInstructions
  },

  scroll1: {
    name: "scroll1",
    meta: AL.Game.G.items["scroll1"],
    price: AL.Game.G.items["scroll1"].g,
    vendor: LucasVendorInstructions
  },

  cscroll0: {
    name: "cscroll0",
    meta: AL.Game.G.items["cscroll0"],
    price: AL.Game.G.items["cscroll0"].g,
    vendor: LucasVendorInstructions
  },

  cscroll1: {
    name: "cscroll1",
    meta: AL.Game.G.items["cscroll1"],
    price: AL.Game.G.items["cscroll1"].g,
    vendor: LucasVendorInstructions
  },

  // Materials
  spores: {
    name: "spores",
    meta: AL.Game.G.items["spores"],
    price: AL.Game.G.items["spores"].g,
    vendor: {
      sell: true,
      buy: false,
      keep: 9_999,
      buyLocation: "market"
    }
  },

  beewings: {
    name: "beewings",
    meta: AL.Game.G.items["beewings"],
    price: AL.Game.G.items["beewings"].g,
    vendor: {
      sell: true,
      buy: false,
      keep: 9_999,
      buyLocation: "market"
    }
  },

  seashell: {
    name: "seashell",
    meta: AL.Game.G.items["seashell"],
    price: AL.Game.G.items["seashell"].g,
    vendor: {
      sell: true,
      buy: false,
      keep: 9_999,
      buyLocation: "market"
    }
  },

  cscale: {
    name: "cscale",
    meta: AL.Game.G.items["cscale"],
    price: AL.Game.G.items["cscale"].g,
    vendor: {
      sell: true,
      buy: false,
      keep: 9_999,
      buyLocation: "market"
    }
  },

  essenceoffire: {
    name: "essenceoffire",
    meta: AL.Game.G.items["essenceoffire"],
    price: AL.Game.G.items["essenceoffire"].g,
    trade: {
      buyMax: 88_000,
      sellPrice: 0
    }
  },
}