import AL, { GItem, ItemName, MapName, MonsterName } from "alclient";
import { MoverDestination } from "./Mover.js";

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
    upgrade: GabrialVendorUpgradeInstructions,
    vendor: GabrialVendorInstructions
  },

  shoes: {
    name: "shoes",
    upgrade: GabrialVendorUpgradeInstructions,
    vendor: GabrialVendorInstructions
  },

  gloves: {
    name: "gloves",
    upgrade: GabrialVendorUpgradeInstructions,
    vendor: GabrialVendorInstructions
  },

  pants: {
    name: "pants",
    upgrade: GabrialVendorUpgradeInstructions,
    vendor: GabrialVendorInstructions
  },

  coat: {
    name: "coat",
    upgrade: GabrialVendorUpgradeInstructions,
    vendor: GabrialVendorInstructions
  },

  // Wanderer's Set
  wcap: {
    name: "wcap",
    crafting: true,
    upgrade: WanderersUpgradeInstructions
  },

  wattire: {
    name: "wattire",
    crafting: true,
    upgrade: WanderersUpgradeInstructions
  },

  wbreeches: {
    name: "wbreeches",
    crafting: true,
    upgrade: WanderersUpgradeInstructions
  },

  wgloves: {
    name: "wgloves",
    crafting: true,
    upgrade: WanderersUpgradeInstructions
  },

  wshoes: {
    name: "wshoes",
    crafting: true,
    upgrade: WanderersUpgradeInstructions
  },

  // Rugged Set
  helmet1: {
    name: "helmet1",
    crafting: true,
    upgrade: RuggedUpgradeInstructions
  },

  coat1: {
    name: "coat1",
    crafting: true,
    upgrade: RuggedUpgradeInstructions
  },

  pants1: {
    name: "pants1",
    crafting: true,
    upgrade: RuggedUpgradeInstructions
  },

  gloves1: {
    name: "gloves1",
    crafting: true,
    upgrade: RuggedUpgradeInstructions
  },

  shoes1: {
    name: "shoes1",
    crafting: true,
    upgrade: RuggedUpgradeInstructions
  },

  // Weapons
  staff: {
    name: "staff",
    upgrade: GabrialVendorUpgradeInstructions,
    vendor: GabrialVendorInstructions
  },

  stinger: {
    name: "stinger",
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
    vendor: LucasVendorInstructions
  },

  mpot0: {
    name: "mpot0",
    vendor: LucasVendorInstructions
  },

  scroll0: {
    name: "scroll0",
    vendor: LucasVendorInstructions
  },

  scroll1: {
    name: "scroll1",
    vendor: LucasVendorInstructions
  },

  cscroll0: {
    name: "cscroll0",
    vendor: LucasVendorInstructions
  },

  cscroll1: {
    name: "cscroll1",
    vendor: LucasVendorInstructions
  },

  // Materials
  spores: {
    name: "spores",
    vendor: {
      sell: true,
      buy: false,
      keep: 9_999,
      buyLocation: "market"
    }
  },

  beewings: {
    name: "beewings",
    vendor: {
      sell: true,
      buy: false,
      keep: 9_999,
      buyLocation: "market"
    }
  },

  seashell: {
    name: "seashell",
    vendor: {
      sell: true,
      buy: false,
      keep: 9_999,
      buyLocation: "market"
    }
  },

  cscale: {
    name: "cscale",
    vendor: {
      sell: true,
      buy: false,
      keep: 9_999,
      buyLocation: "market"
    }
  },

  essenceoffire: {
    name: "essenceoffire",
    trade: {
      buyMax: 88_000,
      sellPrice: 0
    }
  },
}