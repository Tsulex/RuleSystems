export const craftingBook = function () {

    if (game.folders.some(x => x.name == game.settings.get("RuleSystems", "craftingBookName"))){

        const myRecipes = game.folders.getName(game.settings.get("RuleSystems", "craftingBookName")).contents.filter(j => j.permission >= 2).map(j => {
            return Object.assign(JSON.parse(j.data.content.replace(/<\/?[^>]+(>|$)/g, "").replace(/(&nbsp;|\n)/g, '').replace(/\s\s+/g, ' ')),
            {
                id: j.data._id,
                name: j.data.name
            });
        }).sort((a,b) => {
        if ( a.name < b.name ) return -1;
        if ( a.name > b.name ) return 1;
        return 0;
        });
        
        if (myRecipes.length > 0)
            new Dialog({
                title: 'Crafting Book',
                content: dialogContent(myRecipes),
                buttons: {},
                render: html => {
                    html.find('#filter').on("change", (ev) => {
                        html.find('#recipes').html(filteredOptions(myRecipes, ev.target.value));
                        let recipe = myRecipes.find(x => x.id == html.find('#recipes').val());
                        if(recipe) html.find('#materials').html(recipeContent(recipe));
                    })
        
                    html.find('#recipes').on("change", (ev) => {
                        let recipe = myRecipes.find(x => x.id == ev.target.value);
                        html.find('#materials').html(recipeContent(recipe));
                    })
                }
            
            }, {width: 555}).render(true);
        else
            ui.notifications.info(`You haven't learned any recipes yet.`);
        
        
        function dialogContent(myRecipes) {
            
            return `<form style="min-height: 580px; flex-direction: column; align-items: flex-start; margin: 0.2em" onsubmit="return false;">
                <div class="form-group" style="display: block">
                    <h3 style="background: #111; width: 100%; padding: 5px 15px; margin: 0.5em 0">Selector</h3>
                    <div style="padding: 0.5em">
                        <input id="filter" type="text" style="width: 35%;" placeholder="Filter" autocomplete="off">
                        <select id="recipes" name="recipe" style="margin-left: 2%;width: 62%;">
                            ${myRecipes.map(r => `<option value="${r.id}">${r.name}</option>`).join("\n                    ")}
                        </select>
                    </div>
                </div>
                <h3 style="background: #111; width: 100%; padding: 5px 15px; margin: 0.5em 0">Recipe</h3>
                <div id="materials" class="form-group" style="flex-direction: column; align-items: flex-start; margin: 0.2em">
                    ${recipeContent(myRecipes[0])}
                </div>
            </form>`;
        }
        
        function filteredOptions(myRecipes, filter) {
            return `\n                    ${myRecipes.filter(x => x.name.toLowerCase().includes(filter.toLowerCase()) || 
                getRecipeRarity(x.profession).toLowerCase().includes(filter.toLowerCase().replace("very rare", "veryrare")))
                .map(r => `<option value="${r.id}">${r.name}</option>`).join("\n                    ")}`;
        }
        
        function recipeContent(recipe) {
            return `<div class="card ${getRecipeRarity(recipe.profession)}">
            <div class="header">
                <h2>${recipe.name}</h2>
                <i class="icon ${getProfessionIcon(recipe.profession)}"></i>
            </div>
        
            <div class="container">
                <p>
                    <b>Profession:</b> ${recipe.profession}<br/>
                    <b>Requeriments:</b> ${recipe.requeriments}, Arcane Dust (${recipe.dust})<br/>
                    <b>Crafting Time:</b> ${recipe.days} days
                </p>
        
                <ul class="materials">
                    <li><div class="quantity">${recipe.cores.quantity}</div><h3>${getCoreName(recipe.cores.rarity)}</h3><span class="icons">${recipe.cores.rarity[0]}</span><span class="icons"><i class="fas fa-atom-alt"></i></span><span class="icons"><i class="fas fa-gem"></i></span></li>
                    ${recipe.materials.map(x => `<li><div class="quantity">${x.quantity}</div><h3>${x.rarity.replace("VeryRare", "Very Rare")} ${x.type} ${x.essence}</h3><span class="icons">${x.rarity[0]}</span><span class="icons"><i class="${getMaterialTypeIcon(x.type)}"></i></span><span class="icons"><i class="${getMaterialEssenceIcon(x.essence)}"></i></span></li>`).join("\n")}
                    
                </ul>
            </div>
        </div>
        
        <h3 style="background: #111; width: 100%; padding: 5px 15px; margin: 1em 0 0.2em 0">Result</h3>
        <div style="padding: 0.5em">
            <a class="entity-link content-link" draggable="true" data-pack="world.crafting-recipes" data-id="${recipe.result}" style="padding: 0.2em 0.6em;"><i style="padding: 0.1em 0.1em;" class="${getProfessionIcon(recipe.profession)}"></i> ${recipe.name}</a>
        </div>`;
        }
        
        function getRecipeRarity(name){
            switch(name.split(" ")[0]){
                case "Apprentice": return "common"
                case "Expert": return "uncommon"
                case "Artisan": return "rare"
                case "Master": return "veryrare"
                case "Grandmaster": return "legendary"
            }
        }
        
        function getCoreName(rarity){
            switch(rarity){
                case "Common": return "Cloudy Core"
                case "Uncommon": return "Pristine Core"
                case "Rare": return "Royal Core"
                case "VeryRare": return "Lucent Core"
                case "Legendary": return "Astral Core"
            }
        }
        
        function getMaterialEssenceIcon(name){
            switch(name){
                case "Aberrant": return "fas fa-eye-evil"
                case "Air": return "fas fa-wind"
                case "Arcane": return "fas fa-sparkles"
                case "Earth": return "fas fa-mountain"
                case "Fire": return "fas fa-fire-alt"
                case "Necrotic": return "fas fa-skull"
                case "Radiant": return "fas fa-sun"
                case "Water": return "fas fa-tint"
            }
        }
        
        function getMaterialTypeIcon(name){
            switch(name){
                case "Chemical": return "fas fa-vial"
                case "Creative": return "fas fa-paint-brush-alt"
                case "Curio": return "fas fa-bahai"
                case "Durable": return "fas fa-cube"
                case "Edible": return "fas fa-apple-alt"
                case "Fabric": return "fas fa-scarf"
            }
        }
        
        function getProfessionIcon(name){
            switch(name.split(" ").pop()){
                case "Apothecary": return "fas fa-flask-potion"
                case "Artist": return "fas fa-palette"
                case "Builder": return "fas fa-hammer"
                case "Culinarian": return "fas fa-hat-chef"
                case "Tailor": return "fas fa-tshirt"
                case "Tinkerer": return "fas fa-tools"
            }
        }

    }
    else{
        ui.notifications.info("No existe la carpeta de las recetas.")
    }
}

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
    console.log("PRUEBA")
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
            <textarea id="message" name="message" rows="4" cols="50"></textarea><br>`,
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
            var messageText = '<p style="color:yellow">';
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