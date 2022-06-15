export var socketlibSocket = undefined;

export let setupSocket = () => {
    socketlibSocket = globalThis.socketlib.registerModule("RuleSystems");
    socketlibSocket.register("MVPDialog", MVPDialog);
    socketlibSocket.register("MVPDialogUpdate", MVPDialogUpdate);
    socketlibSocket.register("cookingMama", cookingMama);
    socketlibSocket.register("updateItemQuantity", updateItemQuantity);
    socketlibSocket.register("playVS", playVS);
}


/* ------------------------------------ */
/* 		*/
/* ------------------------------------ */
async function MVPDialog(){
    const nvpDialog = new Dialog({
        title: "MVP",
        content: `<style>.mvp-name{background: rgba(0,0,0,0.5);font-size: xxx-large;vertical-align: -350px; padding: 0.05em 0.3em; color:white } .mvp-avatar:hover{opacity: 1; box-shadow: 0 0 10px white !important;} .mvp-avatar{opacity: 0.75}}</style><div style="display: flex;flex-direction: row;min-height: 500px;">${game.users.filter(x => !x.isOwner && x.character && x.active && !x.isGM).map(x => `<button class="mvp-avatar" value="${x.id}" style="background:url(${x.avatar}); background-repeat: no-repeat; background-position: center;"/><span class="mvp-name">${x.name}</span>`).join("")}</div>`,
        buttons: {},
        render: html => {
            html.find('.mvp-avatar').on("click", (ev) => {
                nvpDialog.close();
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