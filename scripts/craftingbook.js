Hooks.on("getSceneControlButtons", (controls) => {
  
	const craftinBook = {
        icon: "fas fa-books",
        name: "craftingbook",
        title: "Crafting Book",
        button: true,
        visible: true,
        onClick: () => {
            game.macros.getName("Crafting Book").execute();
        }
    };
  
	controls.find(c => c.name === "token").tools.push({
        icon: "fas fa-books",
        name: "craftingbook",
        title: "Crafting Book",
        button: true,
        visible: true,
        onClick: () => {
            game.macros.getName("Crafting Book").execute();
        }
    });
});