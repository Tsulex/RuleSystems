export var socketlibSocket = undefined;

export let setupSocket = () => {
    socketlibSocket = globalThis.socketlib.registerModule("RuleSystems");
    socketlibSocket.register("PokerPlayerConfirm", pokerPlayerConfirm);
    socketlibSocket.register("PokerPlayerDiscardDialog", pokerPlayerDiscardDialog);
    socketlibSocket.register("PokerAllHandsDialog", pokerAllHandsDialog);
    socketlibSocket.register("PokerDialog", pokerDialog);
    socketlibSocket.register("MVPDialog", MVPDialog);
    socketlibSocket.register("MVPDialogUpdate", MVPDialogUpdate);
    socketlibSocket.register("cookingMama", cookingMama);
    socketlibSocket.register("updateItemQuantity", updateItemQuantity);
    socketlibSocket.register("playVS", playVS);
}

/*5 CARTAS - APUESTA 1 VEZ (A IGUALAR LA MAS ALTA) - DESCARTE DE CARTAS - APUESTA AL ALZA (RENDICION / IGUALAR) - FIN*/

/* ------------------------------------ */
/* Poker System Player Discard          */
/* ------------------------------------ */
async function pokerPlayerDiscardDialog(charname, discard){
    const journal = game.journal.getName("Poker Game");
    const pokerData = JSON.parse(journal.data.content);
    discard.forEach(x => {
        pokerData.hands[charname].cards[x] = pokerData.deck.pop();
    })
    journal.update({content : JSON.stringify(pokerData)});
    socketlibSocket.executeForUsers("PokerDialog", [pokerData.hands[charname].id], pokerData.hands[charname].cards, false);
}

/* ------------------------------------ */
/* Poker System Confirm                 */
/* ------------------------------------ */
async function pokerPlayerConfirm(charname){
    const journal = game.journal.getName("Poker Game");
    const pokerData = JSON.parse(journal.data.content);
    pokerData.hands[charname].confirmed = true;
    journal.update({content : JSON.stringify(pokerData)});

    if (Object.keys(pokerData.hands).every(x => pokerData.hands[x].confirmed)){
        const PokerDialog = new Dialog({
            title: "Poker Game - Waiting",
            content: `Esperando a las apuestas finales de todo el mundo.`,
            buttons: { confirm : {icon : ``, label : `Confirm`, callback : (html) => socketlibSocket.executeForEveryone("PokerAllHandsDialog", pokerData.hands)} }
        }).render(true);
    }
}

/* ------------------------------------ */
/* Poker System Hands                   */
/* ------------------------------------ */
async function pokerAllHandsDialog(hands){
    let a = [];
    Object.keys(hands).forEach(x => { hands[x].cards.forEach(x => a.push(x))});

    const PokerDialog = new Dialog({
        title: "Poker Game - Final Hands",
        content: `<style>.poker-card:hover{box-shadow: 0 0 10px white !important;} </style> <div style="display: flex;flex-direction: row;min-height: 192px;">${a.map((x, index) => `<button class="poker-card" value="${index}" style="background:url(/cards/dark-gold/${x}.webp); background-repeat: no-repeat; background-size: contain;"/>`).join("")}</div>`,
        buttons: {}
    },{width : 640, height : 250}).render(true);
}

/* ------------------------------------ */
/* Poker System Players                 */
/* ------------------------------------ */
async function pokerDialog(cards, discard){
    
    let contentButtons = {};
    if (discard){
        contentButtons = { discard : {icon : ``, label : `Discard`, callback : (html) => socketlibSocket.executeAsGM("PokerPlayerDiscardDialog", game.user.charname, discards)} }
    }
    else{
        contentButtons = { confirm : {icon : ``, label : `Confirm`, callback : (html) => socketlibSocket.executeAsGM("PokerPlayerConfirm", game.user.charname)} }
    }

    let discards = [];

    const pokerDialog = new Dialog({
        title: "Poker Hand",
        content: `<style>.poker-card:hover{box-shadow: 0 0 10px white !important;} </style><div style="display: flex;flex-direction: row;min-height: 384px;">${cards.map((x, index) => `<button class="poker-card" value="${index}" style="background:url(/cards/dark-gold/${x}.webp); background-repeat: no-repeat; background-size: contain;"/>`).join("")}</div>`,
        buttons: contentButtons,
        render: html => {
            if (discard){
                html.find('.poker-card').on("click", (ev) => {
                    let indexCard = ev.target.value;
    
                    if (!discards.includes(indexCard)){
                        discards.push(indexCard)
                        ev.target.style.backgroundImage = 'url("/cards/backs/dark-gold.webp")';
                    }
                    else{
                        ev.target.style.backgroundImage = `url("/cards/dark-gold/${cards[indexCard]}.webp")`;
                        discards = discards.filter(x => x != indexCard);
                    }
                })
            }
        }
    },{width : 1280, height : 500}).render(true);
}

/* ------------------------------------ */
/* 		*/
/* ------------------------------------ */
async function MVPDialog(){
    const mvpDialog = new Dialog({
        title: "MVP",
        content: `<style>.mvp-name{background: rgba(0,0,0,0.5);font-size: xxx-large;vertical-align: -350px; padding: 0.05em 0.3em; color:white } .mvp-avatar:hover{opacity: 1; box-shadow: 0 0 10px white !important;} .mvp-avatar{opacity: 0.75}}</style><div style="display: flex;flex-direction: row;min-height: 500px;">${game.users.filter(x => !x.isOwner && x.character && x.active && !x.isGM).map(x => `<button class="mvp-avatar" value="${x.id}" style="background:url(${x.avatar}); background-repeat: no-repeat; background-position: center;"/><span class="mvp-name">${x.name}</span>`).join("")}</div>`,
        buttons: {},
        render: html => {
            html.find('.mvp-avatar').on("click", (ev) => {
                mvpDialog.close();
                socketlibSocket.executeAsGM("MVPDialogUpdate", ev.target.value);
            })
        }
    },{width:game.users.filter(x => !x.isOwner && x.character && x.active && !x.isGM).length*260}).render(true);
}

/* ------------------------------------ */
/* 			*/
/* ------------------------------------ */
async function MVPDialogUpdate(ev){
    let msg = game.messages.find(x => x.data.content.includes("<i>MVP of the Match</i>"));
    let msgContent = new DOMParser().parseFromString(msg.data.content, 'text/html')
    let update = msgContent.getElementById(ev);
    update.innerHTML = parseInt(update.innerHTML) + 1;
    await msg.update({content: msgContent.body.innerHTML});
}

/* ------------------------------------ */
/* 			*/
/* ------------------------------------ */
async function cookingMama(selectedCraft, craftedQuantity){
    const refri = game.actors.getName(game.settings.get("RuleSystems", "refigeratorName"));
    const craftQuantity = refri.items.filter(item => item.name === selectedCraft.typeOut).reduce((prev, curr, index) => {
        let res = prev + curr.data.data.quantity
        if (index > 0) curr.delete();
        return res;
    }, craftedQuantity);

    let craftedItem = refri.items.getName(selectedCraft.typeOut);

    if (!craftedItem) {
        let cloneItem = game.items.getName(selectedCraft.typeOut).clone();
        refri.createEmbeddedDocuments("Item", [cloneItem.data]).then(() => {
            craftedItem = refri.items.getName(selectedCraft.typeOut);
        }).then(() => socketlibSocket.executeAsGM("updateItemQuantity", craftedItem, craftQuantity));
    } else socketlibSocket.executeAsGM("updateItemQuantity", craftedItem, craftQuantity);
}

/* ------------------------------------ */
/* 			*/
/* ------------------------------------ */
async function updateItemQuantity(item, quantity) {
    if (quantity === 0) {
        item.delete();
    } else {
        item.update({ 'data.quantity': quantity });
    }
}

/* ------------------------------------ */
/* 			*/
/* ------------------------------------ */
async function playVS(msg, token){
    game.MonksTokenBar.requestContestedRoll({token: canvas.scene.tokens.get(msg)._object, request: 'ability:int'}, {token: canvas.scene.tokens.get(token)._object, request: 'ability:int'}, {silent: true, rollMode:'roll'});
    game.messages.find(x => x.data.content === "<i>Wants to play a duo game...</i>").delete();
}