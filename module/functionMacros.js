import { socketlibSocket } from "./GMAction.js";

export class RS {
    constructor() {

    }

    /* ------------------------------------ */
    /* Macro de Start Poker Game	       	*/
    /* ------------------------------------ */
    static async startPokerGame(players) {

        let cards = ["clubs-02", "clubs-03", "clubs-04", "clubs-05", "clubs-06", "clubs-07", "clubs-08", "clubs-09", "clubs-10", "clubs-ace", "clubs-jack", "clubs-king", "clubs-queen",
            "diamonds-02", "diamonds-03", "diamonds-04", "diamonds-05", "diamonds-06", "diamonds-07", "diamonds-08", "diamonds-09", "diamonds-10", "diamonds-ace", "diamonds-jack", "diamonds-king", "diamonds-queen",
            "hearts-02", "hearts-03", "hearts-04", "hearts-05", "hearts-06", "hearts-07", "hearts-08", "hearts-09", "hearts-10", "hearts-ace", "hearts-jack", "hearts-king", "hearts-queen",
            "spades-02", "spades-03", "spades-04", "spades-05", "spades-06", "spades-07", "spades-08", "spades-09", "spades-10", "spades-ace", "spades-jack", "spades-king", "spades-queen", "joker"];

        let shuffled = cards.sort(() => Math.random() - 0.5);
        let hands = {};

        (players || game.users.filter(x => x.character && x.active && !x.isGM)).forEach(x => {
            hands[x.charname] = { cards: [shuffled.pop(), shuffled.pop(), shuffled.pop(), shuffled.pop(), shuffled.pop()], id: x.id };
        })

        Object.keys(hands).forEach(x => {
            let player = hands[x];
            socketlibSocket.executeForUsers("PokerDialog", [player.id], player.cards, true);
        })

        if (!game.journal.getName("Poker Game")) {
            JournalEntry.create({ name: "Poker Game", folder: game.folders.getName("Cosos de GM").id, content: JSON.stringify({ hands: hands, deck: shuffled }) });
        }
        else {
            game.journal.getName("Poker Game").pages.find(x => x).update({ text: { content: JSON.stringify({ hands: hands, deck: shuffled }) } })
        }

        return hands;
    }

    /* ------------------------------------ */
    /* Macro de Long Rest 7 Days (V2)    	*/
    /* ------------------------------------ */
    static async longRest() {
        const lifeStyle = JSON.parse(game.journal.getName(game.settings.get("RuleSystems", "long-rest-life-style")).pages.find(x => x.name == canvas.scene.name).text.content.replaceAll("&nbsp;", "").replace(/<\/?[^>]+(>|$)/g, ""))
        const rollData = _token.actor.getRollData();
        const gold = getGold(rollData);
        const affordableOptions = lifeStyle.filter(style => style.price <= gold);

        let confirmed;

        new Dialog({
            title: `${canvas.scene.name} Long Rest (7 Days)`,
            content: createForm(affordableOptions, rollData),
            buttons: {
                one: {
                    icon: '<i class="fas fa-check"></i>',
                    label: "Confirm",
                    callback: () => confirmed = true
                },
                two: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel",
                    callback: () => confirmed = false
                }
            },
            default: "Cancel",
            render: html => {
                html.find('[name="long-rest"]').on("change", (ev) => {
                    html.find('.rest-stats').hide();
                    html.find('.rest-stats')[parseInt(ev.target.value)].style.display = 'table'
                });
            },
            close: html => {
                if (confirmed) {
                    let styleSelected = affordableOptions[html.find("[name='long-rest']")[0].value];
                    doRest(styleSelected, rollData);
                }
            }
        }).render(true);


        function createForm(options, data) {

            let html = `<style>
            .rest-stats { width:100%;text-align: center;font-family: monospace;border: 0;line-height: 1.5; }
            .rest-water-food {
                width: 180px;
                display: inline-block;
                margin-top: 5px;
            }
            </style>
            <form>
                <div class="form-group">
                    <select name="long-rest">
                        ${options.map((style, index) => `<option value="${index}">${style.label} ${style.price}gp</option>`).join('\n')}
                    </select>
                </div>
                <div class="form-group">
                    <div name="new-stats">
                        ${options.map(style => getStats(style, data)).map((s, index) => `<table class="rest-stats" style="display: ${index == 0 ? 'table' : 'none'}">
            <tr>
                <td style="width: 10%;"><i class="fas fa-dice-d20"></i></td>
                <td style="width: 35%;">Hit Dice</td>
                <td style="width: 20%;">${s.hd.old}</td>
                <td style="width: 10%;">=&gt;</td>
                <td style="width: 25%;">${s.hd.new} (<span style="color: ${s.hd.inc == 0 ? '' : s.hd.inc > 0 ? '#67a481' : '#ff7265'}">${s.hd.inc > 0 ? '+' : ''}${s.hd.inc}</span>)</td>
            </tr><tr>
                <td style="width: 10%;"><i class="fas fa-heart"></i></td>
                <td style="width: 35%;">Max Hit Points</td>
                <td style="width: 20%;">${s.hp.old}</td>
                <td style="width: 10%;">=&gt;</td>
                <td style="width: 25%;">${s.hp.new} (<span style="color: ${s.hp.inc == 0 ? '' : s.hp.inc > 0 ? '#67a481' : '#ff7265'}">${s.hp.inc > 0 ? '+' : ''}${s.hp.inc}</span>)</td>
            </tr><tr>
                <td style="width: 10%;"><i class="fas fa-face-tired"></i></td>
                <td style="width: 35%;">Exhaustion</td>
                <td style="width: 20%;">${s.exhaustion.old}</td>
                <td style="width: 10%;">=&gt;</td>
                <td style="width: 25%;">${s.exhaustion.new} (<span style="color: ${s.exhaustion.inc == 0 ? '' : s.exhaustion.inc < 0 ? '#67a481' : '#ff7265'}">${s.exhaustion.inc > 0 ? '+' : ''}${s.exhaustion.inc}</span>)</td>
            </tr><tr>
                <td style="width: 10%;"><i class="fa-regular fa-wheat-awn-circle-exclamation"></i></td>
                <td style="width: 35%;">Starvation</td>
                <td style="width: 20%;">${s.starvation.old}</td>
                <td style="width: 10%;">=&gt;</td>
                <td style="width: 25%;">${s.starvation.new} (<span style="color: ${s.starvation.inc == 0 ? '' : s.starvation.inc < 0 ? '#67a481' : '#ff7265'}">${s.starvation.inc > 0 ? '+' : ''}${s.starvation.inc}</span>)</td>
            </tr><tr>
                <td colspan="5"><span class="rest-water-food" style="color: ${s.hunger ? '#67a481' : '#ff7265'}"><i class="fas fa-utensils"></i> Food ${s.hunger ? "" : "NOT "}Included</span> <span class="rest-water-food" style="color: ${s.thirst ? '#67a481' : '#ff7265'}"><i class="fas fa-tint"></i> Water ${s.thirst ? "" : "NOT "}Included</span></td>
            </tr>
        </table>`).join('\n')}
                    </div>
                </div>
            </form>`;
            return html;
        }

        function getStats(style, data) {

            //let enoughFood = actor.flags["rest-recovery"].data.sated.food >= (actor.flags.dnd5e?.foodUnits || 1);
            //let enoughWater = actor.flags["rest-recovery"].data.sated.water >= (actor.flags.dnd5e?.waterUnits || 2);

            return {

                hd: {
                    new: Math.round(style.hitDice * data.details.level),
                    old: data.details.level - Object.keys(data.classes).reduce((totalUsed, c) => totalUsed + data.classes[c].hitDiceUsed, 0),
                    inc: Math.round(style.hitDice * data.details.level) - (data.details.level - Object.keys(data.classes).reduce((totalUsed, c) => totalUsed + data.classes[c].hitDiceUsed, 0))
                },
                hp: {
                    new: Math.round(style.hitPoints * data.attributes.hp.max),
                    old: data.attributes.hp.max + data.attributes.hp.tempmax,
                    inc: Math.round(style.hitPoints * data.attributes.hp.max) - (data.attributes.hp.max + data.attributes.hp.tempmax)
                },
                exhaustion: {
                    new: !style.thirst && !style.hunger ? 3 : !style.hunger ? 1 : 0,
                    old: data.attributes.exhaustion,
                    inc: (!style.thirst && !style.hunger ? 3 : !style.hunger ? 1 : 0) - data.attributes.exhaustion
                },
                starvation: {
                    new: style.thirst && style.hunger ? 0 : (data.flags["rest-recovery"]?.data?.starvation || 0) + !style.hunger * 1,
                    old: (data.flags["rest-recovery"]?.data?.starvation || 0),
                    inc: (style.thirst && style.hunger ? 0 : (data.flags["rest-recovery"]?.data?.starvation || 0) + !style.hunger * 1) - (data.flags["rest-recovery"]?.data?.starvation || 0)
                },
                thirst: style.thirst,
                hunger: style.hunger
            }
        }

        async function doRest(style, data) {

            const newStats = getStats(style, data);
            await game.restrecovery.setActorConsumableValues(_token.actor, { food: newStats.hunger ? 1e11 : 0, water: newStats.thirst ? 1e11 : 0, starvation: newStats.starvation.old });

            const newData = {
                'system.attributes.exhaustion': newStats.exhaustion.new,
                'system.attributes.hp.tempmax': newStats.hp.new - data.attributes.hp.max,
                'system.attributes.hp.value': newStats.hp.new,
                'system.currency': getCurrencyAfterPay(data, style.price)
            };

            let dices2Waste = data.details.level - newStats.hd.new;

            const newItemData = [];

            _token.actor.itemTypes.class.sort((a, b) => a.system.hitDice.replace('d', '') - b.system.hitDice.replace('d', '')).forEach(async item => {
                if (dices2Waste >= item.system.levels) {
                    newItemData.push({ _id: item.id, "system.hitDiceUsed": item.system.levels });
                    dices2Waste -= item.system.levels;
                } else {
                    newItemData.push({ _id: item.id, "system.hitDiceUsed": dices2Waste });
                    dices2Waste = 0;
                }

            });

            await game.user.character.longRest({ dialog: false, chat: false, newDay: true });
            await new Roll("1d10").roll({ async: false }).toMessage({ speaker: ChatMessage.getSpeaker(), flavor: `Paid ${style.price}gp and takes a long rest. (${style.label})` });

            await game.user.character.update(newData);
            await game.user.character.updateEmbeddedDocuments("Item", newItemData);

            game.macros.getName("Long Rest Activities").execute();
        }

        function getGold(data) {
            const currency = data.currency;
            let total = 0;
            for (const key in currency) {
                total += currency[key] * getCoinValue(key) / getCoinValue("gp");
            }
            return total;
        }

        function getCurrencyAfterPay(data, gold) {

            let finalValues = duplicate(data.currency);
            let gold2Copper = gold * getCoinValue('gp');

            let missing = Object.keys(data.currency).map(key => {

                return { name: key, total: data.currency[key] }

            }).sort((a, b) => getCoinValue(a.name) - getCoinValue(b.name)).reduce((acc, curr) => {

                if (acc.left >= getCoinValue(curr.name)) {
                    if (acc.left >= curr.total * getCoinValue(curr.name)) {
                        finalValues[curr.name] = 0;
                        return { left: acc.left - (curr.total * getCoinValue(curr.name)), currency: curr.name };
                    } else {
                        finalValues[curr.name] -= Math.trunc(acc.left / getCoinValue(curr.name));
                        return { left: acc.left - (Math.trunc(acc.left / getCoinValue(curr.name)) * getCoinValue(curr.name)), currency: curr.name }
                    }
                } else {
                    if (finalValues[acc.currency] >= 1) {
                        return acc;
                    } else {
                        return { left: acc.left, currency: curr.name }
                    }
                }

            }, { left: gold2Copper, currency: '' });

            if (missing.left > 0)

                Object.keys(finalValues).map(key => {

                    return { name: key, total: finalValues[key] }

                }).filter(x => getCoinValue(x.name) <= getCoinValue(missing.currency)).sort((a, b) => getCoinValue(b.name) - getCoinValue(a.name)).reduce((acc, curr) => {

                    if (curr.name != acc.currency) {
                        let paid = Math.trunc(acc.left / getCoinValue(curr.name));
                        finalValues[acc.currency] -= 1;
                        finalValues[curr.name] += getCoinValue(acc.currency) / getCoinValue(curr.name) - paid;
                        return { left: acc.left - paid * getCoinValue(curr.name), currency: curr.name }
                    } else {
                        return acc;
                    }

                }, missing)

            return finalValues;
        }

        function getCoinValue(coin) {
            switch (coin) {
                case "pp":
                    return 99999999999999999999999999;
                case "gp":
                    return 100;
                case "ep":
                    return 25;
                case "sp":
                    return 25;
                case "cp":
                    return 1;
            }
        }
    }

    /* ------------------------------------ */
    /* Macro de Medium Rest             	*/
    /* ------------------------------------ */
    static async mediumRest() {
        //const lifeStyle = JSON.parse(game.journal.getName(game.settings.get("RuleSystems", "medium-rest-life-style")).pages.find(x => x.name == canvas.scene.name).text.content.replaceAll("&nbsp;", "").replace(/<\/?[^>]+(>|$)/g, ""))

        const cityData = game.journal.getName("City Stats").pages.find(x => x.name == canvas.scene.name).text.content.replaceAll("&nbsp;", "").replace(/<\/?[^>]+(>|$)/g, "");
        const lifeStyle = JSON.parse(game.journal.getName(game.settings.get("RuleSystems", "medium-rest-life-style")).pages.find(x => x.name == canvas.scene.name).text.content.replaceAll("&nbsp;", "").replace(/<\/?[^>]+(>|$)/g, ""));

        const rollData = _token.actor.getRollData();
        const gold = getGold(rollData);
        const affordableOptions = lifeStyle.filter(style => style.price <= gold);

        let confirmed;

        new Dialog({
            title: `${canvas.scene.name} Medium Rest (1 Day)`,
            content: createForm(affordableOptions, rollData),
            buttons: {
                one: {
                    icon: '<i class="fas fa-check"></i>',
                    label: "Confirm",
                    callback: () => confirmed = true
                },
                two: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel",
                    callback: () => confirmed = false
                }
            },
            default: "Cancel",
            render: html => {
                html.find('[name="long-rest"]').on("change", (ev) => {
                    html.find('.rest-stats').hide();
                    html.find('.rest-stats')[parseInt(ev.target.value)].style.display = 'table'
                });
            },
            close: html => {
                if (confirmed) {
                    let styleSelected = affordableOptions[html.find("[name='long-rest']")[0].value];
                    doRest(styleSelected, rollData);
                }
            }
        }).render(true);


        function createForm(options, data) {

            let html = `<style>
            .rest-stats { width:100%;text-align: center;font-family: monospace;border: 0;line-height: 1.5; }
            .rest-water-food {
                width: 180px;
                display: inline-block;
                margin-top: 5px;
            }
            </style>
            <form>
                <div class="form-group">
                    <select name="long-rest">
                        ${options.map((style, index) => `<option value="${index}">${style.label} $${style.price}</option>`).join('\n')}
                    </select>
                </div>
                <div class="form-group">
                    <div name="new-stats">
                        ${options.map(style => getStats(style, data)).map((s, index) => `<table class="rest-stats" style="display: ${index == 0 ? 'table' : 'none'}">
            <tr>
                <td style="width: 10%;"><i class="fas fa-dice-d20"></i></td>
                <td style="width: 35%;">Hit Dice</td>
                <td style="width: 20%;">${s.hd.old}</td>
                <td style="width: 10%;">=&gt;</td>
                <td style="width: 25%;">${s.hd.new} (<span style="color: ${s.hd.inc == 0 ? '' : s.hd.inc > 0 ? '#67a481' : '#ff7265'}">${s.hd.inc > 0 ? '+' : ''}${s.hd.inc}</span>)</td>
            </tr><tr>
                <td style="width: 10%;"><i class="fas fa-heart"></i></td>
                <td style="width: 35%;">Hit Points</td>
                <td style="width: 20%;">${s.hp.old}</td>
                <td style="width: 10%;">=&gt;</td>
                <td style="width: 25%;">${s.hp.new} (<span style="color: ${s.hp.inc == 0 ? '' : s.hp.inc > 0 ? '#67a481' : '#ff7265'}">${s.hp.inc > 0 ? '+' : ''}${s.hp.inc}</span>)</td>
            </tr><tr>
                <td style="width: 10%;"><i class="fas fa-face-tired"></i></td>
                <td style="width: 35%;">Exhaustion</td>
                <td style="width: 20%;">${s.exhaustion.old}</td>
                <td style="width: 10%;">=&gt;</td>
                <td style="width: 25%;">${s.exhaustion.new} (<span style="color: ${s.exhaustion.inc == 0 ? '' : s.exhaustion.inc < 0 ? '#67a481' : '#ff7265'}">${s.exhaustion.inc > 0 ? '+' : ''}${s.exhaustion.inc}</span>)</td>
            </tr><tr>
                <td style="width: 10%;"><i class="fa-regular fa-wheat-awn-circle-exclamation"></i></td>
                <td style="width: 35%;">Starvation</td>
                <td style="width: 20%;">${s.starvation.old}</td>
                <td style="width: 10%;">=&gt;</td>
                <td style="width: 25%;">${s.starvation.new} (<span style="color: ${s.starvation.inc == 0 ? '' : s.starvation.inc < 0 ? '#67a481' : '#ff7265'}">${s.starvation.inc > 0 ? '+' : ''}${s.starvation.inc}</span>)</td>
            </tr><tr>
                <td colspan="5"><span class="rest-water-food" style="color: ${s.hunger ? '#67a481' : '#ff7265'}"><i class="fas fa-utensils"></i> Food ${s.hunger ? "" : "NOT "}Included</span> <span class="rest-water-food" style="color: ${s.thirst ? '#67a481' : '#ff7265'}"><i class="fas fa-tint"></i> Water ${s.thirst ? "" : "NOT "}Included</span></td>
            </tr>
        </table>`).join('\n')}
                    </div>
                </div>
            </form>`;
            return html;
        }

        function getStats(style, data) {

            let enoughFood = _token.actor.flags["rest-recovery"].data.sated.food >= (_token.actor.flags.dnd5e?.foodUnits || 1)
            let starveLimit = Math.max(0, data.abilities.con.mod) + 3 < data.attributes.starvation.value;
            let enoughWater = _token.actor.flags["rest-recovery"].data.sated.water >= (_token.actor.flags.dnd5e?.waterUnits || 1);
            let hpMult = cityData.confort == 1 ? 0.5 : 0.25;
            
            return {

                hd: {
                    new: Math.round(Math.min(data.details.level, style.hitDice + data.details.level - Object.keys(data.classes).reduce((totalUsed, c) => totalUsed + data.classes[c].hitDiceUsed, 0))),
                    old: data.details.level - Object.keys(data.classes).reduce((totalUsed, c) => totalUsed + data.classes[c].hitDiceUsed, 0),
                    inc: Math.round((Math.min(data.details.level, style.hitDice + data.details.level - Object.keys(data.classes).reduce((totalUsed, c) => totalUsed + data.classes[c].hitDiceUsed, 0))) - (data.details.level - Object.keys(data.classes).reduce((totalUsed, c) => totalUsed + data.classes[c].hitDiceUsed, 0)))
                },
                hp: {
                    new: Math.round(style.fullHP ? data.attributes.hp.max + data.attributes.hp.tempmax : Math.min(data.attributes.hp.max + data.attributes.hp.tempmax, data.attributes.hp.value + (data.attributes.hp.max + data.attributes.hp.tempmax) * hpMult)),
                    old: data.attributes.hp.value,
                    inc: Math.round((style.fullHP ? data.attributes.hp.max + data.attributes.hp.tempmax : Math.min(data.attributes.hp.max + data.attributes.hp.tempmax, data.attributes.hp.value + (data.attributes.hp.max + data.attributes.hp.tempmax) * hpMult)) - data.attributes.hp.value)
                },
                exhaustion: {
                    new: Math.min(Math.max(0, data.attributes.exhaustion + Math.max(0, !style.thirst * 2 - enoughWater * 2) + Math.max(0, !style.hunger * starveLimit - enoughFood) - style.exhaustion), 6),
                    old: data.attributes.exhaustion,
                    inc: Math.min(Math.max(0, data.attributes.exhaustion + Math.max(0, !style.thirst * 2 - enoughWater * 2) + Math.max(0, !style.hunger * starveLimit - enoughFood) - style.exhaustion), 6) - data.attributes.exhaustion
                },
                starvation: {
                    new: (data.flags["rest-recovery"]?.data?.starvation || 0) + Math.max(0, !style.hunger - enoughFood),
                    old: (data.flags["rest-recovery"]?.data?.starvation || 0),
                    inc: Math.max(0, !style.hunger - enoughFood)
                },
                thirst: style.thirst,
                hunger: style.hunger
            }
        }

        async function doRest(style, data) {

            const newStats = getStats(style, data);
            await game.restrecovery.setActorConsumableValues(_token.actor, { food: newStats.hunger ? 1e11 : 0, water: newStats.thirst ? 1e11 : 0, starvation: newStats.starvation.old });

            const newData = {
                'system.attributes.exhaustion': newStats.exhaustion.new,
                'system.attributes.hp.tempmax': data.attributes.hp.tempmax,
                'system.attributes.hp.value': newStats.hp.new,
                'system.currency': getCurrencyAfterPay(data, style.price)
            };

            let dices2Waste = data.details.level - newStats.hd.new;

            const newItemData = [];

            _token.actor.itemTypes.class.sort((a, b) => a.system.hitDice.replace('d', '') - b.system.hitDice.replace('d', '')).forEach(async item => {
                if (dices2Waste >= item.system.levels) {
                    newItemData.push({ _id: item.id, "system.hitDiceUsed": item.system.levels });
                    dices2Waste -= item.system.levels;
                } else {
                    newItemData.push({ _id: item.id, "system.hitDiceUsed": dices2Waste });
                    dices2Waste = 0;
                }

            });

            await game.user.character.longRest({ dialog: false, chat: false, newDay: true });
            await game.user.character.update(newData);
            await game.user.character.updateEmbeddedDocuments("Item", newItemData);

            ChatMessage.create({
                content: `${game.user.character.name} ha realizado un descanso medio.`
              });

        }

        function getGold(data) {
            const currency = data.currency;
            let total = 0;
            for (const key in currency) {
                total += currency[key] * getCoinValue(key) / getCoinValue("gp");
            }
            return total;
        }

        function getCurrencyAfterPay(data, gold) {

            let finalValues = duplicate(data.currency);
            let gold2Copper = gold * getCoinValue('gp');

            let missing = Object.keys(data.currency).map(key => {

                return { name: key, total: data.currency[key] }

            }).sort((a, b) => getCoinValue(a.name) - getCoinValue(b.name)).reduce((acc, curr) => {

                if (acc.left >= getCoinValue(curr.name)) {
                    if (acc.left >= curr.total * getCoinValue(curr.name)) {
                        finalValues[curr.name] = 0;
                        return { left: acc.left - (curr.total * getCoinValue(curr.name)), currency: curr.name };
                    } else {
                        finalValues[curr.name] -= Math.trunc(acc.left / getCoinValue(curr.name));
                        return { left: acc.left - (Math.trunc(acc.left / getCoinValue(curr.name)) * getCoinValue(curr.name)), currency: curr.name }
                    }
                } else {
                    if (finalValues[acc.currency] >= 1) {
                        return acc;
                    } else {
                        return { left: acc.left, currency: curr.name }
                    }
                }

            }, { left: gold2Copper, currency: '' });

            if (missing.left > 0)

                Object.keys(finalValues).map(key => {

                    return { name: key, total: finalValues[key] }

                }).filter(x => getCoinValue(x.name) <= getCoinValue(missing.currency)).sort((a, b) => getCoinValue(b.name) - getCoinValue(a.name)).reduce((acc, curr) => {

                    if (curr.name != acc.currency) {
                        let paid = Math.trunc(acc.left / getCoinValue(curr.name));
                        finalValues[acc.currency] -= 1;
                        finalValues[curr.name] += getCoinValue(acc.currency) / getCoinValue(curr.name) - paid;
                        return { left: acc.left - paid * getCoinValue(curr.name), currency: curr.name }
                    } else {
                        return acc;
                    }

                }, missing)

            return finalValues;
        }

        function getCoinValue(coin) {
            switch (coin) {
                case "pp":
                    return 99999999999999999999999999;
                case "gp":
                    return 100;
                case "ep":
                    return 25;
                case "sp":
                    return 25;
                case "cp":
                    return 1;
            }
        }
    }

    /* ------------------------------------ */
    /* Macro de Mailbox & Messaging        	*/
    /* ------------------------------------ */
    static async mailbox() {
        const myMessages = game.folders.getName("Mensajeria").contents.filter(j => j.permission >= 2);
        let message = {};

        if (game.user.isGM) {
            for (var i = 0; i < myMessages.length; i++) {
                for (let index = 0; index < myMessages[i].pages.size; index++) {
                    message[myMessages[i].pages.map(j => j.name)[index]] = myMessages[0].pages.map(j => j)[index].text.content;
                }
            }
        }
        else {
            for (var i = 0; i < myMessages[0].pages.size; i++) {
                message[myMessages[0].pages.map(j => j.name)[i]] = myMessages[0].pages.map(j => j)[i].text.content;
            }
        }

        new Dialog({
            title: "Ponny Express",
            content: dialogContent(message),
            buttons: {},
            render: html => {
                html.find('#mails').on("change", (ev) => {
                    let mail = Object.entries(message).find(x => x[0] == ev.target.value);
                    html.find('#content').html(messageContent(Object.entries(mail)[1]));
                })
            },
            default: "Cancel",
        }, { width: 555, height: 630 }).render(true);

        function dialogContent(message) {

            return `<form style="min-height: 580px; flex-direction: column; align-items: flex-start; margin: 0.2em" onsubmit="return false;">
                <div class="">
                    <h3 style="background: #111; width: 100%; padding: 5px 15px; margin: 0.5em 0">From</h3>
                    <div class="form-group" style="padding: 01em 0.75em 1em;">
                        <select id="mails" name="recipe" class="form-group">
                            ${Object.entries(message).map(([name, content]) => `<option value="${name}">${name}</option>`).join()}
                        </select>
                    </div>
                </div>
                <h3 style="background: #111; width: 100%; padding: 5px 15px; margin: 0.5em 0">Mail Content</h3>
                <div id="content" class="form-group" style="flex-direction: column; align-items: flex-start; margin: 0.2em">
                    ${messageContent(Object.entries(message)[0])}
                </div>
            </form>`;
        }

        function messageContent(message) {
            return `<div style="min-height:40px; padding-top:10px; padding: 0.75em; width: 100%">${message[1]}</div>`;
        }
    }

    static async messaging() {
        let userCharacter = game.user.character.name;
        const rollData = _token.actor.getRollData();
        const gold = getGold(rollData);

        let cities = [{ label: "Envio Nacional", value: 2 }, { label: "Envio Internacional Continente", value: 4 }, { label: "Envio Internacional Exterior", value: 8 }]

        new Dialog({
            title: "Correo Postal",
            content: `
            <form>
                <div class="msg">
                    <label for="Remitente">Remitente:<label>
                    <textarea id="Remitente" disabled="true" name="Remitente" rows="1" style="color:white">${userCharacter}</textarea>
                    <label for="Destinatario">Destinatario:<label>
                    <textarea id="Destinatario" name="Destinatario" rows="1" style="color:white"></textarea>
                    <label for="cities">Localidad del destinatario:<label>
                    <select name="cities"> ${cities.map(o => `<option value="${o.value}" name="${o.label}">${o.label} - ${o.value} gp</option>`).join()} </select><br>
                    <label for="Mensaje">Mensaje:<label>
                    <textarea id="Mensaje" name="Mensaje" rows="7" style="color:white"></textarea>
                </div>
            </form>
            `,
            buttons: {
                one: {
                    icon: '<i class="fas fa-check"></i>',
                    label: "Confirm",
                    callback: (html) => {
                        let remitente = html.find('[name="Remitente"]')[0].value;
                        let destinatario = html.find('[name="Destinatario"]')[0].value;
                        let mensaje = html.find('[name="Mensaje"]')[0].value;
                        let coste = parseFloat(html.find('[name="cities"]')[0].value);

                        const newData = { 'system.currency': getCurrencyAfterPay(rollData, coste) };
                        _token.actor.update(newData);

                        socketlibSocket.executeAsGM("UpdateJournal", remitente, destinatario, mensaje);
                        //game.macros.getName("GM Create Journal").execute(remitente,destinatario,mensaje);
                    }
                },
                two: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel"
                }
            }
        }).render(true);

        function getGold(data) {
            const currency = data.currency;
            let total = 0;
            for (const key in currency) {
                total += currency[key] * getCoinValue(key) / getCoinValue("gp");
            }
            return total;
        }

        function getCurrencyAfterPay(data, gold) {

            let finalValues = duplicate(data.currency);
            let gold2Copper = gold * getCoinValue('gp');
            let missing = Object.keys(data.currency).map(key => {

                return { name: key, total: data.currency[key] }

            }).sort((a, b) => getCoinValue(a.name) - getCoinValue(b.name)).reduce((acc, curr) => {

                if (acc.left >= getCoinValue(curr.name)) {
                    if (acc.left >= curr.total * getCoinValue(curr.name)) {
                        finalValues[curr.name] = 0;
                        return { left: acc.left - (curr.total * getCoinValue(curr.name)), currency: curr.name };
                    } else {
                        finalValues[curr.name] -= Math.trunc(acc.left / getCoinValue(curr.name));
                        return { left: acc.left - (Math.trunc(acc.left / getCoinValue(curr.name)) * getCoinValue(curr.name)), currency: curr.name }
                    }
                } else {
                    if (finalValues[acc.currency] >= 1) {
                        return acc;
                    } else {
                        return { left: acc.left, currency: curr.name }
                    }
                }

            }, { left: gold2Copper, currency: '' });

            if (missing.left > 0)

                Object.keys(finalValues).map(key => {

                    return { name: key, total: finalValues[key] }

                }).filter(x => getCoinValue(x.name) <= getCoinValue(missing.currency)).sort((a, b) => getCoinValue(b.name) - getCoinValue(a.name)).reduce((acc, curr) => {

                    if (curr.name != acc.currency) {
                        let paid = Math.trunc(acc.left / getCoinValue(curr.name));
                        finalValues[acc.currency] -= 1;
                        finalValues[curr.name] += getCoinValue(acc.currency) / getCoinValue(curr.name) - paid;
                        return { left: acc.left - paid * getCoinValue(curr.name), currency: curr.name }
                    } else {
                        return acc;
                    }

                }, missing)


            return finalValues;

        }

        function getCoinValue(coin) {
            switch (coin) {
                case "pp":
                    return 1000;
                case "gp":
                    return 100;
                case "ep":
                    return 50;
                case "sp":
                    return 25;
                case "cp":
                    return 1;
            }
        }
    }

    /* ------------------------------------ */
    /* Macro de Wanted          	       	*/
    /* ------------------------------------ */
    static async wanted() {
        const outlaws = JSON.parse(game.journal.getName("Wanted").pages.find(j => j.name == canvas.scene.name).text.content.replaceAll("&nbsp;", "").replace(/<\/?[^>]+(>|$)/g, ""));

        const wantedDialog = new Dialog({
            title: "Wanted Board - " + canvas.scene.name,
            content: dialogContent(outlaws),
            buttons: {},
            render: (html) => onRender(html)
        }, { width: 900, height: 400 }).render(true);


        function onRender(html) {

            html.find('div.wanted-poster').on("click", (ev) => {
                let element = ev.target.className.includes("wanted-poster") ? ev.target : $(ev.target).closest(".wanted-poster")[0];

                if (element.className.includes("delivered")) return;
                if (element.className.includes("selected")) {
                    $(element).removeClass("selected");
                    element.children[0].style.display = 'none';
                } else {
                    $(element).addClass("selected");
                    element.children[0].style.display = 'block';
                }
            })

            if (game.user.isGM) {
                html.find('.wanted-pay').on("click", (ev) => {
                    let dineroARepartir = parseInt(ev.target.textContent.replace("$", ""));
                    console.log($(ev.target.parentElement).find(".wanted-name")[0].textContent)
                    // Macro de dar dinero
                    // Y marcar como entregado en el journal

                    game.users.filter(x => x.isOwner && x.character && x.active && !x.isGM).map(x => x.character).forEach(x => {
                        const newData = {
                            'system.currency.gp': x.getRollData().currency.gp + Math.ceil(dineroARepartir / 6)
                        }
                        console.log(x.system.currency.gp)
                        x.update(newData)

                    });

                    let targetName = $(ev.target.parentElement).find(".wanted-name")[0].textContent;
                    outlaws.filter(x => x.name == targetName)[0].delivered = true;

                    let update = { _id: game.journal.getName("Wanted").pages.find(j => j.name == `${canvas.scene.name}`)._id, "text.content": `<pre>${JSON.stringify(outlaws, null, "    ")}</pre>` };
                    game.journal.getName("Wanted").updateEmbeddedDocuments("JournalEntryPage", [update]);
                    wantedDialog.close();
                });
            }
        }

        function dialogContent(outlaws) {
            return `
            <div class="wanted-board">
                <div class="wanted-board-content" style="width: ${outlaws.length * 248 - 8}px">
                    ${outlaws.sort((a, b) => Number(a.delivered) - Number(b.delivered)).map(x => `<div class="wanted-poster${x.delivered ? " delivered" : ""}" style="background-image:url('${x.poster}');">
                    ${x.delivered ? `<i class="fa-solid fa-xmark"></i>` : `
                        <div class="wanted-information">
                            <h3 class="wanted-name">${x.name}</h3>
                            <p class="wanted-text">${x.information}</p>
                            <p class="wanted-pay">&#36;${x.reward}</p>
                            <span class="wanted-request-by">${x.requestBy}</span>
                        </div>`}
                    </div>`).join("")}
                </div>
            </div>`;
        }
    }

    /* ------------------------------------ */
    /* City Macros                 	       	*/
    /* ------------------------------------ */
    static async enterCity() {
        const longResTile = Array.from(canvas.scene.tiles).find(x => x.texture.src.includes("LongRest.png"));
        const tileActions = longResTile.getFlag("monks-active-tiles", "actions");
        tileActions[0].data.args = "";
        longResTile.setFlag("monks-active-tiles", "actions", tileActions);
        longResTile.setFlag("monks-active-tiles", "active", false);
        longResTile.unsetFlag("monks-active-tiles", "history");
    }

    /* ------------------------------------ */
    /* Camp Macros                 	       	*/
    /* ------------------------------------ */
    static async enterCamp() {
        game.restrecovery.setActiveProfile("Outside Rest");
        const longResTile = Array.from(canvas.scene.tiles).find(x => x.texture.src.includes("LongRest.png"));
        const tileActions = longResTile.getFlag("monks-active-tiles", "actions");
        tileActions[0].data.args = "RuleSystems.outsideRest()";
        longResTile.setFlag("monks-active-tiles", "actions", tileActions);
        longResTile.unsetFlag("monks-active-tiles", "history");
    }

    static async outsideRest() {

        const cityData = JSON.parse(game.journal.getName("City Stats").pages.find(x => x.name == canvas.scene.name).text.content.replaceAll("&nbsp;", "").replace(/<\/?[^>]+(>|$)/g, ""));
        const rollData = game.user.character.getRollData();
        let hpMult = cityData.confort == 1 ? 0.5 : 0.25;
        let maxHP = rollData.attributes.hp.max + rollData.attributes.hp.tempmax;

        const newData = {
            'system.attributes.hp.tempmax': rollData.attributes.hp.tempmax,
            'system.attributes.hp.value': Math.round(Math.min(maxHP, rollData.attributes.hp.value + maxHP * hpMult))
        };

        await game.user.character.longRest({ dialog: false, chat: false, newDay: true });
        await game.user.character.update(newData);

        ChatMessage.create({
            content: `${game.user.character.name} ha realizado un descanso en el campamento.`
        });
    }

    static async campActivity(skill, dc, abilityName, success, fail, kit) {
        let actor = game.user.character;
        let context;

        if (kit) {
            if (actor.items.getName(skill)) {
                context = await actor.items.getName(skill).rollToolCheck({ fastForward: true, chatMessage: false })
            }
        }
        else if(skill != "") {
            context = await actor.rollSkill(skill, { chatMessage: false });
        }

        if (context != null) {
            context.toMessage({
                flavor: `<div class="dnd5e chat-card item-card midi-qol-item-card" style="padding-bottom: 0;"><header class="card-header flexrow">
            <img src="worlds/westernlandspirits/Icons/${abilityName.replaceAll(" ", "")}.png" width="36" height="36">
            <h3 class="item-name"><span style="font-size:large;float:right;color:${dc <= context.total ? "green\">✔" : "red\">✕"}</span>${abilityName}</h3>
            </header>
            <div class="card-content" style="font-weight: normal;">${dc <= context.total ? success : fail}</div></div>
            <span style="${context.options.advantageMode == 0 ? `display:block; text-align:center` : `padding-left: 15%`}">${context.options.flavor}</span>`
            })
        }
        else{
            ChatMessage.create({
                content: `<div class="dnd5e chat-card item-card midi-qol-item-card" style="padding-bottom: 0;"><header class="card-header flexrow">
                <img src="worlds/westernlandspirits/Icons/${abilityName.replaceAll(" ", "")}.png" width="36" height="36">
                <h3 class="item-name">${abilityName}</h3>
                </header>
                <div class="card-content" style="font-weight: normal;"></div></div>`
            });
        }
    }

    /* ------------------------------------ */
    /* Player Screen                       	*/
    /* ------------------------------------ */
    static async playerScreen(name) {
        let result = name.replace(/([A-Z])/gm, " $1").trim();
        const journal = game.journal.getName("Personajes de la historia");
        new Dialog({ title: journal.pages.getName(result).name, content: journal.pages.getName(result).text.content, buttons: {} }, { resizable: false, width: 480, height: window.innerHeight * 0.50 }).render(true);
    }

    /* ------------------------------------ */
    /* Reset History                      	*/
    /* ------------------------------------ */

    //Implementado ya en el Token Tile

    /*static async resetHistory() {
        let tokenid = Array.from(canvas.scene.tokens).find(x => x.actor._id === game.user.character._id)._id;
        socketlibSocket.executeAsGM("ResetHistory", tokenid);
    }*/
}