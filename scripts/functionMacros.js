class RS {

    static async craftingStation() {
        const myRecipes = game.folders.getName("Bought Recipes").contents.filter(j => j.permission >= 2).map(j => {
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
        
        const myMaterials = _token.actor.items.filter(i => i.data.flags["craftMaterials"]).map(i => {
            return Object.assign({
                id: i.data._id,
                name: i.data.name,
                quantity: i.data.data.quantity
            }, i.data.flags["craftMaterials"]);
        });
        
        const craftingData = _token.actor.getRollData().crafting || {days: 0, recipe: null, progress: 0};
        
        let consumedMaterials = [];
        let canCraft = false;
        
        if (myRecipes.length > 0)
            if(craftingData.days > 0)
                new Dialog({
                    title: 'Crafting',
                    content: dialogContent(myRecipes, myMaterials, craftingData),
                    buttons: {
                
                        one: {
                            label: "Craft",
                            callback: (html) => {
                                
                                let msgContent;
                                let craftData = _token.actor.getRollData().crafting || {days: 0, recipe: null, progress: 0};
                                const craftTime = html.find('#craft-time').val();
                                
                                if(!craftData.recipe) {
                                    const recipeChoosen = myRecipes.find(r => r.id == html.find('#recipes')[0].value);
                
                                    if(!canCraft)  msgContent = `Don't have enought materials to craft a ${recipeChoosen.name}.`;
                                    else {
                                        craftData.recipe = recipeChoosen.id;
                                        _token.actor.update({'data.crafting': craftData});
                                        msgContent = `Started the crafting of ${recipeChoosen.name}<br/>
                                        Consumed items:<br/>
                                        ${consumedMaterials.map(c => `${c.quantity}x ${c.name}`).join("<br/>")}`;
                                        
                                        // Eliminar los materiales consumidos...
                                        removeMaterials(consumedMaterials);
                                        
                                        this.execute();
                                    }
                                
                                } else if(craftData.days >= craftTime) {
                                    
                                    const recipeChoosen = myRecipes.find(r => r.id == craftingData.recipe);
                                    const totalCraft = parseFloat(craftingData.progress) + parseFloat(craftTime);
                                    
                                    craftData.days -= craftTime;
                                    craftData.progress += parseFloat(craftTime);
                                    
                                    if(totalCraft < recipeChoosen.days){
                                        msgContent = `Still crafting ${recipeChoosen.name} (${totalCraft}/${recipeChoosen.days})`;
                                        _token.actor.update({'data.crafting': craftData});
                                    
                                        
                                    } else {
                                        craftData.progress = 0;
                                        craftData.recipe = null;
                                        
                                        msgContent = `Has completed the crafting of ${recipeChoosen.name}!`;
                                        _token.actor.update({'data.crafting': craftData});
                                        
                                        //Dar el item crafteado y anotar dias en el caso de que sobre alguno
                                        game.packs.get("world.crafting-recipes").getDocument(recipeChoosen.result).then((result) => {
                                            _token.actor.createEmbeddedDocuments("Item", [result.toObject()]);
                                        });
                                    }
                                }
                                
                                if(msgContent) ChatMessage.create({content: msgContent, speaker: ChatMessage.getSpeaker()});
                                
                            }
                        }
                    },
                    render: html => {
                        if(!craftingData?.recipe){
                            html.find('#filter').on("change", (ev) => {
                                html.find('#recipes').html(filteredOptions(myRecipes, ev.target.value));
                                let recipe = myRecipes.find(x => x.id == html.find('#recipes').val());
                                if(recipe) html.find('#materials').html(recipeContent(recipe));
                            })
                            html.find('#recipes').on("change", (ev) => {
                                let recipe = myRecipes.find(x => x.id == ev.target.value);
                                html.find('#materials').html(recipeContent(recipe, myMaterials));
                            })
                        }
                        else
                            html.find('#craft-time').on("change", (ev) => {
                                html.find('#craft-progress').width(`${ev.target.value*100/$(ev.target).attr('fullcraft')}%`);
                            })
                        
                    }
                
                }).render(true);
            else
                ui.notifications.info(`You can't craft more today.`);
        
        
        function dialogContent(myRecipes, myMaterials, craftingData) {
            
            if(craftingData?.recipe) {
                const recipe = myRecipes.find(r => r.id == craftingData.recipe);
                return `<form style="flex-direction: column; align-items: flex-start; margin: 0.2em">
                        <div class="form-group" style="display: block">
                            <h3 style="background: #111; width: 100%; padding: 5px 15px; margin: 0.5em 0">${recipe.name}</h3>
                        </div>
                        <div id="materials" class="form-group" style="flex-direction: column; align-items: flex-start; margin: 0.2em">
                            <div style="background-color: black;width: 100%;padding: 0.3em;margin-bottom: 8px;display: flex;position: relative;">
                                <span style="position: absolute;width: 100%;text-align: center;height: 25px;line-height: 1.5;color: white;">${craftingData.progress}/${recipe.days} days</span>
                                <div style="background: green;width: ${craftingData.progress*100/recipe.days}%;height: 22px;display: inline-block;"></div>
                                <div style="background: orange;width: ${0.5*100/recipe.days}%;height: 22px;display: inline-block;" id="craft-progress"></div>
                            </div>
                        </div>
                        <div class="form-group" style="display: block">
                            <h3 style="background: #111; width: 100%; padding: 5px 15px; margin: 0.5em 0">Crafting Time</h3>
                        </div>
                        <div class="form-group" style="margin-bottom: 1.5em;">
                            <select id="craft-time" fullcraft="${recipe.days}" style="margin: 0.2em 0.5em;">
                                ${Array.from({length: (craftingData.days < recipe.days-craftingData.progress ? craftingData.days : recipe.days-craftingData.progress)*2}, (_, i) => i * 0.5 + 0.5).map(ct => `<option value="${ct}">+${ct} days</option>`).join()}
                            </select>
                        </div>
                    </form>`;
            }
            
            return `<form style="min-height: 500px; flex-direction: column; align-items: flex-start; margin: 0.2em" onsubmit="return false;">
                <div class="form-group" style="display: block">
                    <h3 style="background: #111; width: 100%; padding: 5px 15px; margin: 0.5em 0">Selector</h3>
                    <div style="padding: 0.5em">
                        <input id="filter" type="text" style="width: 35%;" placeholder="Filter" autocomplete="off">
                        <select id="recipes" name="recipe" style="margin-left: 2%;width: 62%;">
                            ${myRecipes.map(r => `<option value="${r.id}">${r.name}</option>`).join("\n                    ")}
                        </select>
                    </div>
                </div>
                <div id="materials" class="form-group" style="flex-direction: column; align-items: flex-start; margin: 0.2em">
                    ${recipeContent(myRecipes[0], myMaterials)}
                </div>
            </form>`;
        }
        
        function filteredOptions(myRecipes, filter) {
            return `\n                    ${myRecipes.filter(x => x.name.toLowerCase().includes(filter.toLowerCase()) || 
                getRecipeRarity(x.profession).toLowerCase().includes(filter.toLowerCase().replace("very rare", "veryrare")))
                .map(r => `<option value="${r.id}">${r.name}</option>`).join("\n                    ")}`;
        }
        
        function recipeContent(recipe, myMaterials) {
            const myCores = myMaterials.filter(m => m.type == "Core" && rarityValue(m.rarity) >= rarityValue(recipe.cores.rarity)).sort((a, b) => rarityValue(a.rarity) - rarityValue(b.rarity)).reduce((result, actual) => {
                if (result.need > 0) {
                    if (actual.quantity <= result.need) {
                        result.need -= actual.quantity;
                        result.chosen.push(actual)
                    } else {
                        const newMat = JSON.parse(JSON.stringify(actual));
                        newMat.quantity = result.need;
                        result.chosen.push(newMat);
                        result.need = 0;
                    }
                }
                return result;
            }, {
                need: recipe.cores.quantity,
                chosen: []
            }).chosen;
        
            const totalCores = myCores.reduce((total, current) => total + current.quantity, 0);
        
            const myDust = myMaterials.filter(m => m.type == "Dust").reduce((result, actual) => {
                if (result.need > 0) {
                    if (actual.quantity <= result.need) {
                        result.need -= actual.quantity;
                        result.chosen.push(actual);
                    } else {
                        const newDust = JSON.parse(JSON.stringify(actual));
                        newDust.quantity = result.need;
                        result.chosen.push(newDust);
                        result.need = 0;
                    }
                }
                return result;
            }, {
                need: recipe.dust,
                chosen: []
            }).chosen;
            
            consumedMaterials = [];
            consumedMaterials = consumedMaterials.concat(myDust).concat(myCores)
        
            const totalDust = myDust.reduce((total, current) => total + current.quantity, 0);
            let usedMaterials = [];
            
            canCraft = recipe.cores.quantity == totalCores && recipe.dust == totalDust;
            
            return `
                <h3 style="background: #111; width: 100%; padding: 5px 15px; margin: 0.5em 0">Consumed Materials</h3>
                <div style="padding: 0.5em 1em">
                <span style="color:${recipe.cores.quantity == totalCores ? "green" : "red"}">
                    ${getCoreName(recipe.cores.rarity)} ${totalCores}/${recipe.cores.quantity}
                </span><br/>
                ${myCores.map(c => `${c.quantity}x ${c.name}`).join("<br/>")}<br/><br/>
                
                ${recipe.dust > 0 ? `
                    <span style="color:${recipe.dust == totalDust ? "green" : "red"}">
                        Dust: ${totalDust} / ${recipe.dust}
                    </span><br/>
                ${myDust.map(d => `${d.quantity}x ${d.name}`).join("<br/>")}<br/><br/>` :``}
                
                ${recipe.materials.map((rm, i) => {
                    let useMaterials = myMaterials.map(m => {
                        const newMat = JSON.parse(JSON.stringify(m));
                        const usedMaterial = usedMaterials.find(um => um.id == m.id);
                        if(usedMaterial) newMat.quantity -= usedMaterial.quantity;
                        return newMat;
                    }).filter(m => m.quantity > 0 && m.type == rm.type && m.essence == rm.essence && rarityValue(m.rarity) >= rarityValue(rm.rarity)).reduce((result, actual) => {
                    if (result.need > 0) {
                        if (actual.quantity <= result.need) {
                            result.need -= actual.quantity;
                            result.chosen.push(actual);
                        } else {
                            const newMat = JSON.parse(JSON.stringify(actual));
                            newMat.quantity = result.need;
                            result.chosen.push(newMat);
                            result.need = 0;
                        }
                    }
                    return result;
                }, {
                    need: rm.quantity,
                    chosen: []
                }).chosen.sort((a, b) => rarityValue(a.rarity) - rarityValue(b.rarity));
        
                    usedMaterials = usedMaterials.concat(useMaterials).reduce((mats, mat) => {
                        let usedMat = mats.find(m => m.id == mat.id);
                        if(usedMat) usedMat.quantity += mat.quantity;
                        else mats.push(mat);
                        return mats;
                    },[]);
                    
                    if(recipe.materials.length == i+1) consumedMaterials = consumedMaterials.concat(usedMaterials);
                    
                    let totalUseMaterials = useMaterials.reduce((total, current) => total + current.quantity, 0);
        
                    canCraft = canCraft && totalUseMaterials == rm.quantity;
        
                    return `<span style="color:${totalUseMaterials == rm.quantity ? "green" : "red"}">
                            ${rm.rarity} ${rm.essence} ${rm.type} ${totalUseMaterials}/${rm.quantity}<br/>
                        </span>
                        ${useMaterials.map(m => `${m.quantity}x ${m.name}`).join("<br/>")}
                    `;
                    
                }).join("<br/><br/>")}</div>
                
                <h3 style="background: #111; width: 100%; padding: 5px 15px; margin: 0.5em 0">Required Time</h3>
                <div style="padding: 0.5em 1em">${recipe.days} Days.</div><br/>
            `;
        }
        
        
        function removeMaterials(mats){
            let deleteItems = [];
            let updateItems = [];
            
            mats.forEach(delItem => {
            
            let aDataItem = _token.actor.items.get(delItem.id).data;
            
            if(aDataItem.data.quantity == delItem.quantity) deleteItems.push(delItem.id);
            else {
        
                updateItems.push({_id: delItem.id,
                    data: {
                        quantity: aDataItem.data.quantity - delItem.quantity
                    }});
                }
            
            });
            
            _token.actor.deleteEmbeddedDocuments("Item", deleteItems);
            _token.actor.updateEmbeddedDocuments("Item", updateItems);
        }
        
        function rarityValue(rarity) {
            switch (rarity.toLowerCase()) {
                case 'common':
                    return 1;
                case 'uncommon':
                    return 2;
                case 'rare':
                    return 3;
                case 'veryrare':
                    return 4;
                case 'legendary':
                    return 5;
                default:
                    return 0;
            }
        }
        
        function getCoreName(rarity){
            switch(rarity){
                case "Common": return "Cloudy Cores"
                case "Uncommon": return "Pristine Cores"
                case "Rare": return "Royal Cores"
                case "VeryRare": return "Lucent Cores"
                case "Legendary": return "Astral Cores"
            }
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
    }

    
    
}
window.RuleSystems = RS