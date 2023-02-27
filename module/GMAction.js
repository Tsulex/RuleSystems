export var socketlibSocket = undefined;

export let setupSocket = () => {
    socketlibSocket = globalThis.socketlib.registerModule("RuleSystems");
    socketlibSocket.register("PokerPlayerConfirm", pokerPlayerConfirm);
    socketlibSocket.register("PokerPlayerDiscardDialog", pokerPlayerDiscardDialog);
    socketlibSocket.register("PokerAllHandsDialog", pokerAllHandsDialog);
    socketlibSocket.register("PokerDialog", pokerDialog);
    socketlibSocket.register("MVPDialog", MVPDialog);
    socketlibSocket.register("MVPDialogUpdate", MVPDialogUpdate);
    socketlibSocket.register("UpdateJournal", updateJournal);
    socketlibSocket.register("TravelActivities", travelActivities);
    socketlibSocket.register("CampActivities", campActivities);
    socketlibSocket.register("ResetHistory", resetHistory);
}

/* ------------------------------------ */
/* Poker System Player Discard          */
/* ------------------------------------ */
async function pokerPlayerDiscardDialog(charname, discard) {
    const journal = game.journal.getName("Poker Game");
    const pokerData = JSON.parse(journal.pages.contents[0].text.content);
    discard.forEach(x => {
        pokerData.hands[charname].cards[x] = pokerData.deck.pop();
    })
    journal.pages.find(x => x).update({ text: { content: JSON.stringify(pokerData) } });
    socketlibSocket.executeForUsers("PokerDialog", [pokerData.hands[charname].id], pokerData.hands[charname].cards, false);
}

/* ------------------------------------ */
/* Poker System Confirm                 */
/* ------------------------------------ */
async function pokerPlayerConfirm(charname) {
    const journal = game.journal.getName("Poker Game");
    const pokerData = JSON.parse(journal.pages.contents[0].text.content);
    pokerData.hands[charname].confirmed = true;
    journal.pages.find(x => x).update({ text: { content: JSON.stringify(pokerData) } });

    if (Object.keys(pokerData.hands).every(x => pokerData.hands[x].confirmed)) {
        const PokerDialog = new Dialog({
            title: "Poker Game - Waiting",
            content: `Esperando a las apuestas finales de todo el mundo.`,
            buttons: { confirm: { icon: ``, label: `Confirm`, callback: (html) => socketlibSocket.executeForEveryone("PokerAllHandsDialog", pokerData.hands) } }
        }).render(true);
    }
}

/* ------------------------------------ */
/* Poker System Hands                   */
/* ------------------------------------ */
async function pokerAllHandsDialog(hands) {
    //let a = [];
    //Object.keys(hands).forEach(x => { hands[x].cards.forEach(x => a.push(x))});

    const PokerDialog = new Dialog({
        title: "Poker Game - Final Hands",
        content: `${Object.keys(hands).map(x => `<span>${x}</span><div style="display: flex;flex-direction: row;min-height: 180px;">
        ${hands[x].cards.map((x, index) => `<button class="poker-card" value="${index}" style="background:url(/cards/dark-gold/${x}.webp);
        background-repeat: no-repeat; background-size: contain;"/>`).join("")}</div>`).join("")}`,
        buttons: {}
    }, { width: 640, height: 220 * Object.keys(hands).length }).render(true);
}

/* ------------------------------------ */
/* Poker System Players                 */
/* ------------------------------------ */
async function pokerDialog(cards, discard) {

    let contentButtons = {};
    if (discard) {
        contentButtons = { discard: { icon: ``, label: `Discard`, callback: (html) => socketlibSocket.executeAsGM("PokerPlayerDiscardDialog", game.user.charname, discards) } }
    }
    else {
        contentButtons = { confirm: { icon: ``, label: `Confirm`, callback: (html) => socketlibSocket.executeAsGM("PokerPlayerConfirm", game.user.charname) } }
    }

    let discards = [];

    const pokerDialog = new Dialog({
        title: "Poker Hand",
        content: `<div style="display: flex;flex-direction: row;min-height: 384px;">${cards.map((x, index) => `<button class="poker-card" value="${index}" style="background:url(/cards/dark-gold/${x}.webp); background-repeat: no-repeat; background-size: contain;"/>`).join("")}</div>`,
        buttons: contentButtons,
        render: html => {
            if (discard) {
                html.find('.poker-card').on("click", (ev) => {
                    let indexCard = ev.target.value;

                    if (!discards.includes(indexCard)) {
                        discards.push(indexCard)
                        ev.target.style.backgroundImage = 'url("/cards/backs/dark-gold.webp")';
                    }
                    else {
                        ev.target.style.backgroundImage = `url("/cards/dark-gold/${cards[indexCard]}.webp")`;
                        discards = discards.filter(x => x != indexCard);
                    }
                })
            }
        }
    }, { width: 1280, height: 500 }).render(true);
}

/* ------------------------------------ */
/* 		*/
/* ------------------------------------ */
async function MVPDialog() {
    const mvpDialog = new Dialog({
        title: "MVP",
        content: `<div style="display: flex;flex-direction: row;min-height: 500px;">${game.users.filter(x => !x.isOwner && x.character && x.active && !x.isGM).map(x => `<button class="mvp-avatar" value="${x.id}" style="background:url(${x.avatar}); background-repeat: no-repeat; background-position: center;"/><span class="mvp-name">${x.name}</span>`).join("")}</div>`,
        buttons: {},
        render: html => {
            html.find('.mvp-avatar').on("click", (ev) => {
                mvpDialog.close();
                socketlibSocket.executeAsGM("MVPDialogUpdate", ev.target.value);
            })
        }
    }, { width: game.users.filter(x => !x.isOwner && x.character && x.active && !x.isGM).length * 260 }).render(true);
}

/* ------------------------------------ */
/* 			*/
/* ------------------------------------ */
async function MVPDialogUpdate(ev) {
    let msg = game.messages.find(x => x.data.content.includes("<i>MVP of the Match</i>"));
    let msgContent = new DOMParser().parseFromString(msg.data.content, 'text/html')
    let update = msgContent.getElementById(ev);
    update.innerHTML = parseInt(update.innerHTML) + 1;
    await msg.update({ content: msgContent.body.innerHTML });
}

/* ------------------------------------ */
/* 			*/
/* ------------------------------------ */
async function updateJournal(remitente, destinatario, mensaje) {
    let time = SimpleCalendar.api.timestampToDate(game.time.worldTime).display.date;

    if (!game.journal.getName(`Mensajeria ${remitente}`).pages.find(j => j.name == `${remitente + " to " + destinatario}`)) {
        game.journal.getName(`Mensajeria ${remitente}`).createEmbeddedDocuments("JournalEntryPage", [{ name: `${remitente + " to " + destinatario}`, type: "text", "text.content": `<h2>${time}</h2><p style="text-align: justify;">` + mensaje.replaceAll("\n", "<br />") + "</p>" }])
    }
    else {
        let update = { _id: game.journal.getName(`Mensajeria ${remitente}`).pages.find(j => j.name == `${remitente + " to " + destinatario}`)._id, "text.content": `<h2>${time}</h2><p style="text-align: justify;">` + mensaje.replaceAll("\n", "<br />") + "</p>" + game.journal.getName(`Mensajeria ${remitente}`).pages.find(j => j.name == `${remitente + " to " + destinatario}`).text.content };
        game.journal.getName(`Mensajeria ${remitente}`).updateEmbeddedDocuments("JournalEntryPage", [update])
    }
}

/* ------------------------------------ */
/* 			*/
/* ------------------------------------ */
async function travelActivities() {
    let travelActivity = [
        {
            label: "Draw a Map",
            desc: `<p style="text-align: justify">Distracting, Focused</p>
        <p style="text-align: justify">Skill: Intelligence (Cartographer's tools)</p>
        <p style="text-align: justify">While your companions keep watch, hunt for food and guide the party, you focus on documenting your journey. Drawing a map won't help you on your journey forward, but might prove useful once you try to find your way back. Good maps are also a highly soughtafter commodity.</p>
        <p style="text-align: justify">Make an Intelligence (Cartographer's tools) check against the Navigation DC.</p>
        <ul style="text-align:justify">
            <li><span style="font-family: var(--font-primary)"><span style="font-family:var(--font-primary);font-size:var(--font-size-14)">If your guide succeeded on their navigation check, you gain a +5 bonus to your check.</span></span></li>
            <li>If they failed by less than 5, you suffer a 5 penalty.</li>
            <li>If you got lost, your check automatically fails.</li>
            <li>For each travel leg, note if you succeeded or failed your cartography check.</li>
        </ul>
        <p style="text-align: justify">Once you have reached your destination, divide the number of successful cartography checks by the total number of legs travelled, and compare the result on the following table:</p>
        <table border="1">
            <tbody>
                <tr>
                    <td style="width:50%;text-align:center">Success per Travel Leg</td>
                    <td style="width:50%;text-align:center">Result</td>
                </tr>
                <tr>
                    <td style="width:50%;text-align:center">0.75</td>
                    <td style="width:50%;text-align:center">Detailed Map</td>
                </tr>
                <tr>
                    <td style="width:50%;text-align:center">0.5</td>
                    <td style="width:50%;text-align:center">Simple Map</td>
                </tr>
                <tr>
                    <td style="width:50%;text-align:center">0.25</td>
                    <td style="width:50%;text-align:center">Crude Map</td>
                </tr>
                <tr>
                    <td style="width:50%;text-align:center">0</td>
                    <td style="width:50%;text-align:center">Wasted Effort</td>
                </tr>
            </tbody>
        </table>`,
            skill: "Cartographer's Tools",
            icon: "fas fa-compass-drafting",
            success: "",
            failed: "",
            kit: true
        },
        {
            label: "Hunt & Forage",
            desc: `<p style="text-align: justify">Dangerous</p>
            <p style="text-align: justify">Skill: Wisdom (Survival)</p>
            <p style="text-align: justify">During your travels, you keep an eye out for nearby sources of food and water, such as roots, fruits, small game, and hidden springs. You must pick one: either plants, game or water.</p>
            <p style="text-align: justify">Make a Wisdom (Survival) check and compare the result with the region's abundance level on the following table to determine the number of fresh rations (for 1 day) you can manage to provide, or gallons of water (8 pints) you gather.</p>
            <table border="1">
                <tbody>
                    <tr>
                        <td style="width:20%;text-align:center"> </td>
                        <td style="text-align:center" colspan="8">Number of Rations / Gallons</td>
                    </tr>
                    <tr>
                        <td style="width:20%;text-align:center">Abundance</td>
                        <td style="width:10%;text-align:center">1</td>
                        <td style="width:10%;text-align:center">2</td>
                        <td style="width:10%;text-align:center">3</td>
                        <td style="width:10%;text-align:center">4</td>
                        <td style="width:10%;text-align:center">5</td>
                        <td style="width:10%;text-align:center">6</td>
                        <td style="width:10%;text-align:center">7</td>
                        <td style="width:10%;text-align:center">8</td>
                    </tr>
                    <tr>
                        <td style="width:20%;text-align:center">Plenty</td>
                        <td style="width:10%;text-align:center">10</td>
                        <td style="width:10%;text-align:center">12</td>
                        <td style="width:10%;text-align:center">14</td>
                        <td style="width:10%;text-align:center">16</td>
                        <td style="width:10%;text-align:center">18</td>
                        <td style="width:10%;text-align:center">20</td>
                        <td style="width:10%;text-align:center">22</td>
                        <td style="width:10%;text-align:center">24</td>
                    </tr>
                    <tr>
                        <td style="width:20%;text-align:center">Average</td>
                        <td style="width:10%;text-align:center">10</td>
                        <td style="width:10%;text-align:center">13</td>
                        <td style="width:10%;text-align:center">16</td>
                        <td style="width:10%;text-align:center">19</td>
                        <td style="width:10%;text-align:center">22</td>
                        <td style="width:10%;text-align:center">25</td>
                        <td style="width:10%;text-align:center">28</td>
                        <td style="width:10%;text-align:center">31</td>
                    </tr>
                    <tr>
                        <td style="width:20%;text-align:center">Scarce</td>
                        <td style="width:10%;text-align:center">12</td>
                        <td style="width:10%;text-align:center">16</td>
                        <td style="width:10%;text-align:center">20</td>
                        <td style="width:10%;text-align:center">24</td>
                        <td style="width:10%;text-align:center">28</td>
                        <td style="width:10%;text-align:center">30</td>
                        <td style="width:10%;text-align:center">36</td>
                        <td style="width:10%;text-align:center">40</td>
                    </tr>
                    <tr>
                        <td style="width:20%;text-align:center">Barren</td>
                        <td style="width:10%;text-align:center">15</td>
                        <td style="width:10%;text-align:center">20</td>
                        <td style="width:10%;text-align:center">25</td>
                        <td style="width:10%;text-align:center">30</td>
                        <td style="width:10%;text-align:center">35</td>
                        <td style="width:10%;text-align:center">40</td>
                        <td style="width:10%;text-align:center">45</td>
                        <td style="width:10%;text-align:center">50</td>
                    </tr>
                </tbody>
            </table>`,
            skill: "sur",
            icon: "fas fa-crosshairs",
            success: "",
            failed: "",
            kit: false
        },
        {
            label: "Keep Watch",
            desc: `<p style="text-align: justify">Skill: Wisdom (Perception)</p>
            <p style="text-align: justify">You keep your eyes peeled and your ears open for any sign of approaching danger, as well as signs of close by pursuers.</p>
            <p style="text-align: justify">Make a Wisdom (Perception) check. If you roll 7 or less, you take 8 as your result. The <span style="font-family: var(--font-primary)"><span style="font-family:var(--font-primary);font-size:var(--font-size-14)">DM determines the DC for any threat or other suspicious activity along your path and compares it to the result of all watching players.</span></span></p>
            <p style="text-align: justify">If you travel at a Fast Pace, you do not benefit from the minimum result of 8 on your Keep Watch die roll.</p>`,
            skill: "prc",
            icon: "fas fa-eye",
            success: "",
            failed: "",
            kit: false
        },
        {
            label: "Navigate",
            desc: `<p style="text-align: justify">Distracting, Focused</p>
            <p style="text-align: justify">Skill: Intelligence (Navigator's tools)</p>
            <p style="text-align: justify">More often than not, a location of interest for a group of adventurers is not situated along a well trodden path, but hidden in the wilds behind obscure hints and directions.</p>
            <p style="text-align: justify">If you wish to find your way through the wilds towards a specific location, you need to make a Navigation check at the Navigation <span style="font-family: var(--font-primary)"><span style="font-family:var(--font-primary);font-size:var(--font-size-14)">DC . The Navigation DC is additionally modified by the information you possess to reach your destination:</span></span></p>
            <table border="1">
                <tbody>
                    <tr>
                        <td style="width:75%;text-align:center">Detail of Information</td>
                        <td style="width:25%;text-align:center">DC</td>
                    </tr>
                    <tr>
                        <td style="width:75%;text-align:center">Detailed map with travel hints</td>
                        <td style="width:25%;text-align:center">-5</td>
                    </tr>
                    <tr>
                        <td style="width:75%;text-align:center">Outdated or simple map</td>
                        <td style="width:25%;text-align:center">0</td>
                    </tr>
                    <tr>
                        <td style="width:75%;text-align:center">Crude Map or general directions (e.g. 40 miles north-west, near a small lake)</td>
                        <td style="width:25%;text-align:center">+5</td>
                    </tr>
                    <tr>
                        <td style="width:75%;text-align:center">Obscure information (e.g. follow the rising sun for 2 moons as the owl flies)</td>
                        <td style="width:25%;text-align:center">+10</td>
                    </tr>
                </tbody>
            </table>
            <p style="text-align: justify">If your navigation check fails by less than 5, you roughly travel towards your target, but not in the most direct way. Your travel speed is halved (rounded down) for this travel leg.</p>
            <p style="text-align: justify">If your navigation check fails by 5 or more, you have made a mistake. Your travel speed is halved (rounded down) for this travel leg, however, you moved away from your location.</p>
            <p style="text-align: justify">If you rolled a total of 5 or lower, you got lost. Depending on the nature of your surroundings, getting lost might entail additional complications and dangers.</p>`,
            skill: "Navigator's Tools",
            icon: "fas fa-compass",
            success: "",
            failed: "",
            kit: true
        },
        {
            label: "Scout",
            desc: `<p style="text-align: justify">Dangerous, Exhausting, Focused</p>
            <p style="text-align: justify">Skill: Wisdom (Survival)</p>
            <p style="text-align: justify">If your travel information is rather vague, or you are simply curious to see what else there is to see, you can scout ahead of the group. Make an Intelligence (Investigation or Nature) or Wisdom (Survival) check. If you are approaching stealthily, also make a Dexterity (Stealth) check. The <span style="font-family: var(--font-primary)"><span style="font-family:var(--font-primary);font-size:var(--font-size-14)">DM determines the DC for any noticeable things in the vicinity and whether you are noticed scouting.</span></span></p>
            <p style="text-align: justify">You might find such things as creatures waiting in ambush, favorable paths, or hidden locations.</p>`,
            skill: "sur",
            icon: "fas fa-horse",
            success: "",
            failed: "",
            kit: false
        },
        {
            label: "Sneak",
            desc: `<p style="text-align: justify">Skill: Dexterity (Stealth)</p>
            <p style="text-align: justify">Sometimes you need to move quietly for a while to avert the eyes and ears of nearby enemies or to cover your tracks and take detours to shake off possible pursuers. Doing so does not require the whole party to perform the Sneak activity, as the party members that do so, can try to keep everyone else as stealthy as possible.</p>
            <p style="text-align: justify">Add the Dexterity (Stealth) check results of all sneaking party members together and divide the sum by the number of players in the group (rounding down). This is the final and effective result for the group's efforts.</p>`,
            skill: "ste",
            icon: "fas fa-user-ninja",
            success: "",
            failed: "",
            kit: false
        },
        {
            label: "Track",
            desc: `<p style="text-align: justify">Focused</p>
            <p style="text-align: justify">Skill: Wisdom (Survival)</p>
            <p style="text-align: justify">Sometimes you don't try to find a specific location, but follow or chase another creature or group. Instead of the Navigation activity, make a Wisdom (Survival) check against the terrain <span style="font-family: var(--font-primary)"><span style="font-family:var(--font-primary);font-size:var(--font-size-14)">DC to find and follow the tracks of your quarry. If your quarry is trying to cover their tracks, use the higher of their Sneak result or the terrain DC.</span></span></p>
            <p style="text-align: justify">If your check fails by less than 5, you are having trouble following your quarry. Your travel speed is halved (rounded down) for this travel leg.</p>
            <p style="text-align: justify">If your check fails by 5 or more, you have made a mistake. Your travel speed is halved (rounded down) for this travel leg, however, you moved away from your quarry.If you rolled a total of 5 or lower, you got lost. Depending on the nature of your surroundings, getting lost might entail additional complications and dangers.</p>
            <p style="text-align: justify">A different use for the Track activity is to read the tracks your group crosses during their travel, in order to glean what kind of creatures are roaming nearby. Make a Wisdom (Survival) check. The DM determines the DC for any possible tracks you might find and to which creatures they might belong.</p>`,
            skill: "sur",
            icon: "fas fa-shoe-prints",
            success: "",
            failed: "",
            kit: false
        },
        {
            label: "Trailblaze",
            desc: `<p style="text-align: justify">Distracting, Exhausting, Focused</p>
            <p style="text-align: justify">Skill: Strength (Athletics)</p>
            <p style="text-align: justify">Traveling through difficult terrain slows you significantly. You can help your companions by clearing a clear path for them to follow. Make a Strength (Athletics) check against the terrain DC. If you succeed, the terrain's travel speed penalty is reduced by 1 mile per hour (to a minimum of 0).</p>
            <p style="text-align: justify">If you succeed by 5 or more, the terrain's travel speed penalty is reduced by 2 miles per hour instead.</p>
            <p style="text-align: justify">If you fail the check by less than 5, you still reduce the terrain's travel speed penalty by 1 mile per hour (to a minimum of 0), but you automatically suffer one level of exhaustion at the end of the activity.</p>`,
            skill: "ath",
            icon: "fas fa-dumbbell",
            success: "",
            failed: "",
            kit: false
        },
        {
            label: "Drive Wagon",
            desc: `<p style="text-align: justify">Skill: Animal Handling</p>
            <p style="text-align: justify">You stay at the front of the wagon, maintaining a steady pace for the animals and avoiding road obstacles that slow down or damage the carriage. Make a Dexterity (Animal Handling) check against the Navigation DC. Increase the DC by 5 if you are traveling offroad, without a clear trail or road.</p>
            <p style="text-align: justify">If your check succeeds by 5 or more, you may increase the travel pace by 1 mile per hour for the rest of the travel leg.</p>
            <p style="text-align: justify">If your check fails by 10 or more or is a critical failure, a cart wheel breaks. Repairing a cart is a Focused activity requiring a successful DC 15 Intelligence check and takes a full travel leg. Players with proficiency in Smith, Carpenter, Woodcarver, or Tinker's tools add their proficiency bonus.</p>`,
            skill: "ani",
            icon: "fas fa-wagon-covered",
            success: "",
            failed: "",
            kit: false
        },
        {
            label: "Free Action",
            desc: `<p style="text-align: justify">You can describe a complete action and the GM will dictate what kind of roll you need to make if necessary to complete this action.</p>`,
            skill: "",
            icon: "fas fa-question",
            success: "",
            failed: "",
            kit: false
        }];

    let selectedTravelActivity = null;

    const tDialog = new Dialog({
        title: "Travel Activities",
        content: getDialogContent(),
        buttons: {
            one: {
                label: "Roll Activities",
                icon: "<i class=\"fas fa-dice-d20\"></i>",
                callback: (html, e) => {
                    if (!selectedTravelActivity) {
                        tDialog.execute();
                        return;
                    } else {
                        let activity = JSON.parse(game.journal.getName("Activities").pages.find(x => x.name == "Travel").text.content.replaceAll("&nbsp;", "").replace(/<\/?[^>]+(>|$)/g, ""));
                        window.RuleSystems.campActivity(selectedTravelActivity.skill, activity.difficulty, selectedTravelActivity.label, selectedTravelActivity.success, selectedTravelActivity.failed, selectedTravelActivity.kit);
                    }
                }
            }

        },
        render: html => {

            let tooltip = html.find('#activities-tooltip');

            html.find('.activity').on("click", (ev) => {
                if (ev.target.tagName == "I") ev.target = ev.target.parentElement;
                if (ev.target.className.includes("selected")) return;

                if (ev.target.parentElement.id == "primary") {
                    if (selectedTravelActivity != null) html.find(`div:contains("${selectedTravelActivity.label}")`).removeClass("selected")
                    selectedTravelActivity = travelActivity.find(x => x.label == ev.target.innerText.trim());
                }
                $(ev.target).addClass("selected");

            });

            html.find('.activity').hover((ev) => {

                if (ev.target.tagName == "I") ev.target = ev.target.parentElement;

                let selectedActivity = travelActivity.find(x => x.label == ev.target.innerText.trim());

                tooltip.html(`<h3>${selectedActivity.label}</h3><p>${selectedActivity.desc}</p>`);
                tooltip.show(100);


            }, () => tooltip.hide());
        }
    }, { width: 555 }).render(true);

    function getDialogContent() {
        return `<h2>Activities</h2>
            <div class="activity-container" id="primary">${travelActivity.map(x => `<div class="activity"><i class="${x.icon}"></i><br/>${x.label}</div>`).join("")}</div>
            <div id="activities-tooltip"></div>`;
    }
}

async function campActivities() {

    const maxActivities = game.user.isGM ? 0 : game.user.character.system.details.race.includes("Elf") ? 4 : 2;

    const campActivity = [
        /*{
            label: "Attune Magic",
            desc: `<p style="text-align: justify">Item Skill: none</p>
            <p style="text-align: justify">Attuning to one magical item takes time and concentration. You must have identified the items magical properties before you can attune to it.</p>`,
            skill: "",
            icon: "fas fa-compass-drafting",
            success: "",
            failed: "",
            kit: false
        },*/
        {
            label: "Camouflage",
            desc: `<p style="text-align: justify">Camp Skill: Dexterity (Stealth)</p>
            <p style="text-align: justify">You can gather and use natural materials like rocks or foliage to hide your campsite. A successful DC Dexterity (Stealth) check adds the Hidden property to your campsite if it doesn't have it.</p>`,
            skill: "ste",
            icon: "fas fa-compass-slash",
            success: "",
            failed: "",
            kit: false
        },
        /*{
            label: "Cook Hearty Meal",
            desc: `<p style="text-align: justify">Skill: Wisdom (Cook's utensils)</p>
            <p style="text-align: justify">A good night's rest is not guaranteed when camping in the wilds and a fine cooked meal can go a long way to remedy this fact. Make a DC Wisdom (Cook's utensils) check.You need one fresh ration of food for every person that will partake of the meal, as well as a reasonable amount of seasoning. If you provide at least 50% more fresh rations than necessary, you gain advantage on this check. If you can only provide half the required amount of rations (but not less), you gain disadvantage.</p>
            <p style="text-align: justify">If you succeed, each person partaking of your meal regains a quarter of their maximum hit dice (rounded down, min 1). If you fail, the meal is edible, but not refreshing. If you rolled a total of 5 or lower, the whole meal is spoiled and its rations are wasted.</p>
            <p style="text-align: justify">You can only benefit from one hearty meal per long rest.</p>`,
            skill: "Cook's utensils",
            icon: "fas fa-compass-drafting",
            success: "",
            failed: "",
            kit: true
        },*/
        {
            label: "Fortify Camp",
            desc: `<p style="text-align: justify">Skill: Strength (Athletics)</p>
            <p style="text-align: justify">You can use wooden spikes or large boulders to barricade your campsite or dig a ditch and build ramparts. A successful DC Strength (Athletics) check adds the Defendable property to your campsite if it doesn't already have it.</p>`,
            skill: "ath",
            icon: "fas fa-shield-plus",
            success: "",
            failed: "",
            kit: false
        },
        {
            label: "Hunt & Forage",
            desc: `<p style="text-align: justify">Skill: Wisdom (Survival)</p>
            <p style="text-align: justify">Gather food and water or hunt local game. This is the same action as the Hunt & Forage travel activity. However, since you are not traveling at this point, you may make the corresponding Wisdom (Survival) check with advantage.</p>`,
            skill: "sur",
            icon: "fas fa-crosshairs",
            success: "",
            failed: "",
            kit: false
        },
        /*{
            label: "Identify Magic Item",
            desc: `<p style="text-align: justify">Skill: proficient Intelligence (Arcana)</p>
            <p style="text-align: justify">If you lack the magic abilities to use the identify spell, you can try to ascertain the nature of a magic item by focusing on its aura and trying to decipher its glyphs and markings. Make an Intelligence (Arcana) check. The DC depends on the rarity of the magic item you wish to identify.</p>
            <table border="1">
                <tbody>
                    <tr>
                        <td style="width:75%;text-align:center">Magic Item Rarity</td>
                        <td style="width:25%;text-align:center">DC</td>
                    </tr>
                    <tr>
                        <td style="width:75%;text-align:center">Common</td>
                        <td style="width:25%;text-align:center">10</td>
                    </tr>
                    <tr>
                        <td style="width:75%;text-align:center">Uncommon</td>
                        <td style="width:25%;text-align:center">15</td>
                    </tr>
                    <tr>
                        <td style="width:75%;text-align:center">Rare</td>
                        <td style="width:25%;text-align:center">20</td>
                    </tr>
                    <tr>
                        <td style="width:75%;text-align:center">Very Rare</td>
                        <td style="width:25%;text-align:center">25</td>
                    </tr>
                    <tr>
                        <td style="width:75%;text-align:center">Legendary</td>
                        <td style="width:25%;text-align:center">30</td>
                    </tr>
                    <tr>
                        <td style="width:75%;text-align:center">Artifact</td>
                        <td style="width:25%;text-align:center">35</td>
                    </tr>
                </tbody>
            </table>`,
            skill: "arc",
            icon: "fas fa-compass-drafting",
            success: "",
            failed: "",
            kit: false
        },*/
        {
            label: "Keep Watch",
            desc: `<p style="text-align: justify">Skill: Wisdom (Perception)</p>
            <p style="text-align: justify">A long rest requires at least 6 hours of sleep and 2 hours of light activity. Depending on the size of the traveling party, you are advised to take shifts keeping watch whilst the others try to gain some sleep. Make a Wisdom (Perception) check. If your result is 7 or lower, you can take 8 instead. Players who perform one of the other camp activities (i.e. not sleeping or keeping watch) do not benefit from a minimum of 8 on the roll.</p>
            <p style="text-align: justify">The DM determines the DC for any threat or approaching danger (hostile creatures or natural phenomena) and compares it to all Wisdom (Perception) results. On a success, the watchers are able to wake and warn the rest of the party, and prevent being surprised.</p>`,
            skill: "prc",
            icon: "fas fa-eye",
            success: "",
            failed: "",
            kit: false
        },
        {
            label: "Set up Traps",
            desc: `<p style="text-align: justify">Skill: Wisdom (Survival)</p>
            <p style="text-align: justify">You can set a number of small traps like caltrops, slings, and small pits around your camp. Make a Wisdom (Survival) check. The DC to find these traps with an Intelligence (Investigation) or Wisdom (Perception) check, as well as the DC for any saving throw made to resist their effects is equal to the result of your Wisdom (Survival) check.</p>`,
            skill: "sur",
            icon: "fas fa-land-mine-on",
            success: "",
            failed: "",
            kit: false
        },
        {
            label: "Rest and Recuperate",
            desc: `<p style="text-align: justify">Skill: Wisdom (Medicine)</p>
            <p style="text-align: justify">You take your time to catch your breath properly, eat and drink, and dress your wounds. Make a Wisdom (Medicine) check. The DC depends on the severity of your wounds (see the Dress Wounds table). If you succeed, treat any hit dice rolled to determine the hit points you regain as having rolled their maximum value during this rest. If you suffer from a sickness or disease, you gain advantage to one related Constitution saving throw during your long rest.</p>`,
            skill: "med",
            icon: "fas fa-kit-medical",
            success: "",
            failed: "",
            kit: false
        },
        {
            label: "Tend to the Wounded",
            desc: `<p style="text-align: justify">Skill: Wisdom (Medicine)</p>
            <p style="text-align: justify">You go around camp, making sure that the wounds of up to six creatures other than yourself are properly cleaned and dressed. Make a Wisdom (Medicine) check for each patient, in order to assess the wounds and properly dress them. The DC depends on the severity of their wounds (see the Dress Wounds table).</p>
            <p style="text-align: justify">If you succeed, your patient can treat any hit dice rolled to determine the hit points they regain as having rolled their maximum value, during this rest. If your patient suffers from a sickness or disease, it gains advantage to one related Constitution saving throw during your long rest.</p>`,
            skill: "med",
            icon: "fas fa-house-medical-flag",
            success: "",
            failed: "",
            kit: false
        },
        {
            label: "Free Action",
            desc: `<p style="text-align: justify">You can describe a complete action and the GM will dictate what kind of roll you need to make if necessary to complete this action.</p>`,
            skill: "",
            icon: "fas fa-question",
            success: "",
            failed: "",
            kit: false
        }
    ];

    const selectedActivities = []

    const tDialog = new Dialog({
        title: "Camp Activities",
        content: getDialogContent(),
        buttons: {
            one: {
                label: "Roll Activities",
                icon: "<i class=\"fas fa-dice-d20\"></i>",
                callback: (html, e) => {
                    if (selectedActivities.some(x => !x)) {
                        tDialog.execute();
                        return;
                    } else {
                        selectedActivities.forEach(selectedCampActivity => {
                            let activity = JSON.parse(game.journal.getName("Activities").pages.find(x => x.name == "Travel").text.content.replaceAll("&nbsp;", "").replace(/<\/?[^>]+(>|$)/g, ""));
                            window.RuleSystems.campActivity(selectedCampActivity.skill, activity.difficulty, selectedCampActivity.label, selectedCampActivity.success, selectedCampActivity.failed, selectedCampActivity.kit);
                        })

                    }
                }
            }

        },
        render: html => {

            let tooltip = html.find('#activities-tooltip');

            html.find('.activity').on("click", (ev) => {
                if (ev.target.tagName == "I") ev.target = ev.target.parentElement;

                let selectedActivity = campActivity.find(x => x.label == ev.target.innerText.trim().substring(1).trim());
                selectedActivities.push(selectedActivity);

                let counter = html.find(`div:contains("${selectedActivity.label}") > span.count`)[0];
                counter.innerText = parseInt(counter.innerText) + 1;

                if (selectedActivities.length > maxActivities) {
                    let oldSelection = html.find(`div.activity:contains("${selectedActivities[0].label}")`)[0];
                    let oldCounter = html.find(`div:contains("${selectedActivities[0].label}") > span.count`)[0];

                    oldCounter.innerText = parseInt(oldCounter.innerText) - 1;
                    if (oldCounter.innerText == 0) $(oldSelection).removeClass("selected");
                    selectedActivities.shift()
                }

                $(ev.target).addClass("selected");

            });

            html.find('.activity').hover((ev) => {

                if (ev.target.tagName == "I") ev.target = ev.target.parentElement;
                let selectedActivity = campActivity.find(x => x.label == ev.target.innerText.trim().substring(1).trim());

                tooltip.html(`<h3>${selectedActivity.label}</h3><p>${selectedActivity.desc}</p>`);
                tooltip.show(100);


            }, () => tooltip.hide());
        }
    }, { width: 555 }).render(true);

    function getDialogContent() {
        return `<h2>Activities</h2>
            <div class="activity-container" id="primary">${campActivity.map(x => `<div class="activity"><i class="${x.icon}"></i><span class="count">0</span>${x.label}</div>`).join("")}</div>
            <div id="activities-tooltip"></div>`;
    }
}

async function resetHistory(tokenid) {
    const longResTile = Array.from(canvas.scene.tiles).find(x => x.texture.src.includes("LongRest.png"));
    longResTile.resetHistory(tokenid);
}