var last_potion = new Date()
export function smart_use_hp_or_mp() {
	var heal = 0
	var mana = 0
	for (let i = 0; i < character.isize; i++) {
		if (character.items[i] && character.items[i].name=="hpot0") heal = 200
		else if (character.items[i] && character.items[i].name=="mpot0") mana = 300
	}
	if(mssince(last_potion)<min(200,character.ping*3)) 
		return resolving_promise({reason:"safeties",success:false,used:false})
	var used=true
	if(is_on_cooldown("use_hp")) 
		return resolving_promise({success:false,reason:"cooldown"})
	if (character.hp < character.max_hp-heal) 
		return use_skill("use_hp")
	else if (character.mp < character.max_mp-mana)
		return use_skill("use_mp")
	else used = false
	if (used)
		last_potion = new Date()
	else
		return resolving_promise({reason:"full",success:false,used:false});
}

export function get_item_quantity(name: string) {
	var quantity = 0
	for (let i = 0; i < character.isize; i++) {
		if (character.items[i] && character.items[i].name==name)
			quantity += character.items[i].q || 0
	}
	return quantity
}

var replenishing = false
export function replenish_potions() {
	if (replenishing) return

	var healing_pots = get_item_quantity("hpot0")
	var mana_pots = get_item_quantity("mpot0")
	var healing_target = 200
	var mana_target = 300

	if (healing_pots < 100 || mana_pots < 100) {
		replenishing = true
		var x = character.x
		var y = character.y
		smart_move({to:"potions"})
			.then(function () {
				if (healing_pots < healing_target) buy("hpot0", healing_target-healing_pots)
				if (mana_pots < mana_target) buy("mpot0", mana_target-mana_pots)
				replenishing = false
			})
			.then(function () {
				smart_move({x, y})
			})
	}
}

function min(arg0: number, arg1: number): number {
    if (arg0 < arg1) 
        return arg0
    return arg1
}
