export const registerSettings = function () {

    /* ------------------------------------ */
    /* CRAFTING         					*/
    /* ------------------------------------ */
    game.settings.register("RuleSystems", "craftingBook", {
        name: "Crafting Book",
        hint: "Activa el Crafting Book para su uso.",
        default: true,
        type: Boolean,
        scope: 'world',
        config: true,
        onChange: debouncedReload
    });

    game.settings.register("RuleSystems", "craftingBookName", {
        name: "Crafting Book Name",
        hint: "Poner el nombre de la carpeta que contendra las recetas.",
        default: "Bought Recipes",
        type: String,
        scope: 'world',
        config: true
    });

    game.settings.register("RuleSystems", "mvp", {
        name: "MVP Mode",
        hint: "Activa el sistema de MVP para combates unicos.",
        default: true,
        type: Boolean,
        scope: 'world',
        config: true,
        onChange: debouncedReload
    });
}

const debouncedReload = debounce(() => {
    window.location.reload()
}, 100)