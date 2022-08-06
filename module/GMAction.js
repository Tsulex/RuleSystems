export var socketlibSocket = undefined;

export let setupSocket = () => {
    socketlibSocket = globalThis.socketlib.registerModule("RuleSystems");
    socketlibSocket.register("PokerPlayerDiscardDialog", PokerPlayerDiscardDialog);
    socketlibSocket.register("PokerHandsDialog", PokerHandsDialog);
    socketlibSocket.register("PokerDialog", PokerDialog);
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
async function PokerPlayerDiscardDialog(charname, discard){
    const journal = game.journal.getName("Poker Game");
    const pokerData = JSON.parse(journal.data.content);
    discard.forEach(x => {
        pokerData.hands[charname].cards[x] = pokerData.deck.pop();
    })
    journal.update({content : JSON.stringify(pokerData)});
    socketlibSocket.executeForUsers("PokerDialog", [pokerData.hands[charname].id], pokerData.hands[charname].cards);
}

/* ------------------------------------ */
/* Poker System Hands                   */
/* ------------------------------------ */
async function PokerHandsDialog(hands){

    const PokerDialog = new Dialog({
        title: "Poker Game - Players Hands",
        content: `${JSON.stringify(hands)}`,
        buttons: {}
        //aqui llamar a PokerPlayerDiscardDialog (pasar charname)
    }).render(true);
}

/* ------------------------------------ */
/* Poker System Players                 */
/* ------------------------------------ */
async function PokerDialog(cards){

    const PokerDialog = new Dialog({
        title: "Poker Game",
        content: `${cards[0]} - ${cards[1]} - ${cards[2]} - ${cards[3]} - ${cards[4]}`,
        buttons: {}
    }).render(true);
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