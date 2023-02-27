/* ------------------------------------ */
/* Import modules   					*/
/* ------------------------------------ */
import { registerSettings } from "./module/settings.js";
import { canvasLayer } from "./module/canvasLayer.js";
import { RS } from "./module/functionMacros.js";
import { setupSocket, socketlibSocket } from "./module/GMAction.js";

/* ------------------------------------ */
/* Initialize module					*/
/* ------------------------------------ */
Hooks.once('init', async function () {
    console.log('RuleSystems | Initializing ruleSystems');
    registerSettings();
    canvasLayer();
    window.RuleSystems = RS;
});

/* ------------------------------------ */
/* Setup module							*/
/* ------------------------------------ */
Hooks.once('setup', function () {
    setupSocket();
});

/* ------------------------------------ */
/* When ready							*/
/* ------------------------------------ */
Hooks.once('ready', function () {
    globalThis.RuleSystemsGM = {
        socket: () => { return socketlibSocket; }
    }
});

/* ------------------------------------ */
/* Update of Water						*/
/* ------------------------------------ */
Hooks.on("updateItem", async function (item) {
    if(game.user.isGM && item.flags["rest-recovery"]?.data?.consumable?.type === 'water' && item.flags["rest-recovery"]?.data?.consumable?.enabled)
        item.update({'system.uses.max' : item.system.quantity, 'system.weight' : item.system.uses.value * 5 / item.system.quantity});
});

Hooks.on("item-piles-transferItems", async function (pile, actor, items, userId, interactionId) {
    if (game.user.isGM && game.users.filter(x => x.character && x.active && !x.isGM).map(x => x.id).includes(userId)) {
        const waterItem = items.find(x => x.item.name === "Water");
        if (waterItem) {
            const waterSkin = actor.itemTypes.consumable.find(x => x.flags["rest-recovery"]?.data?.consumable?.enabled && x.flags["rest-recovery"]?.data?.consumable?.type === 'water');
            const waterSpace = waterSkin.system.uses.max - waterSkin.system.uses.value;
            let waterUsed = waterItem.quantity > waterSpace ? waterSpace : waterItem.quantity;
            if (waterUsed < waterItem.quantity) {
                waterItem.quantity = waterItem.quantity - waterUsed;
                ItemPiles.API.addItems(pile, [waterItem]);
            }
            if (waterSpace > 0) 
                waterSkin.update({ 'system.uses.value': waterSkin.system.uses.value + waterUsed });
            actor.items.getName("Water").delete();
            setTimeout((waterUsed, interactionId) => {
                const chatMsg = Array.from(game.messages).find(x => x.flags["item-piles"]?.data?.interactionId === interactionId);
                const newFlag = chatMsg.getFlag("item-piles","data");
                let waterFlag = newFlag.items.find(x => x.name === "Water");
                waterFlag.quantity = waterFlag.quantity - waterUsed;
                chatMsg.setFlag("item-piles","data",newFlag);
                chatMsg.update({content: chatMsg.content.replace(/(<label>Water<\/label>[^\<]*<small>)\d+(<\/small>)/gm, `$1${waterFlag.quantity}$2`)})
            }, 1000, waterItem.quantity, interactionId);
        }
    }
});

Hooks.on("updateActor", async function (actor, updateData, options, userId) {
    if (updateData.flags && updateData.flags["rest-recovery"]) {
        if (Array.from(game.users).find(u => u.character?.id === game.user.character?.id).active && game.user.character?.id === actor.id || game.user.isGM)
            updateSurvivalValues(actor);

        if (updateData.flags["rest-recovery"].data?.sated?.food &&
            actor.flags["rest-recovery"]?.data?.sated?.food - updateData.flags["rest-recovery"].data?.sated?.food < (actor.flags.dnd5e?.foodUnits || 1) &&
            actor.flags["rest-recovery"]?.data?.sated?.food >= (actor.flags.dnd5e?.foodUnits || 1))
            addHitDice(actor);
    }

});


function updateSurvivalValues(actor) {
    actor.update({
        'system.attributes.hunger.value': actor.flags["rest-recovery"].data.sated.food,
        'system.attributes.hunger.max': (actor.flags.dnd5e?.foodUnits || 1),
        'system.attributes.thirst.value': actor.flags["rest-recovery"].data.sated.water,
        'system.attributes.thirst.max': (actor.flags.dnd5e?.waterUnits || 1),
        'system.attributes.starvation.value': actor.flags["rest-recovery"].data.starvation,
        'system.attributes.starvation.max': Math.max(0, actor.system.abilities.con.mod) + 3
    });
}


function addHitDice(actor) {
    const classItem = actor.itemTypes.class.filter(x => x.system.hitDiceUsed > 0).sort((a, b) => b.system.hitDice.replace('d', '') - a.system.hitDice.replace('d', ''))[0];
    if (classItem)
        classItem.update({ "system.hitDiceUsed": classItem.system.hitDiceUsed - 1 });
}