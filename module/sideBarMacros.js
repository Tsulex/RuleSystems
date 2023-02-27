export const mvp = function () {
    let msg = game.messages.find(x => x.data.content.includes("<i>MVP of the Match</i>"));

    if (msg){
        msg.delete();
    }

    let users = game.users.filter(x => x.isOwner && x.character && x.active && !x.isGM).map(x => `${x.name} : <span id="${x.id}">` + 0 + `</span>`).join("<br>");
    ChatMessage.create({
        speaker: ChatMessage.getSpeaker(),
        content: "<i>MVP of the Match</i><br>" + users
    });

    RuleSystemsGM.socket().executeForOthers("MVPDialog");
}

export const whisper = function () {
    let users = game.users.filter(user => user.active && user.id !== game.user.id);
    let checkOptions = ""
    let playerTokenIds = users.map(u => u.character?.id).filter(id => id !== undefined);
    let selectedPlayerIds = canvas.tokens.controlled.map(token => {
    if (playerTokenIds.includes(token.actor.id)) return token.actor.id;
    });

    users.forEach(user => {
        let checked = !!user.character && selectedPlayerIds.includes(user.character.id) && 'checked';

        checkOptions+=`
            <br>
            <input type="checkbox" name="${user.id}" value="${user.name}" ${checked}>\n
            <label for="${user.id}">${user.name}</label>
        `;
    });

    new Dialog({
        title:"Whisper",
        content:`Whisper To: ${checkOptions} <br>
            <label for="message">Message:</label>
            <textarea id="message" style="color:yellow" name="message" rows="4" cols="50"></textarea><br>`,
        buttons:{
            whisper: {   
            label:"Whisper",
            callback: (html) => createMessage(html)
            }
    }
    }).render(true);

    function createMessage(html) {
        var targets = [];
        for ( let user of users ) {
            if (html.find('[name="'+user.id+'"]')[0].checked){
            targets.push(user.id);
            }
            var messageText = '<p style="color:white">';
            messageText += html.find('[name="message"]')[0].value;
            messageText += '</p>';
        }

        if (targets.length > 0) {
            ChatMessage.create({
                content: messageText,
                whisper: targets
            });
        } else {
            return ui.notifications.error(`You must select a target to your private message.`)
        }
    }
}

export const travel = function () {
    RuleSystemsGM.socket().executeForEveryone("TravelActivities")
}

export const camp = function () {
    RuleSystemsGM.socket().executeForEveryone("CampActivities")
}