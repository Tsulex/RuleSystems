export const registerSettings = function () {
    // Register any custom module settings here
    let modulename = "ruleSystems";

    game.settings.register(modulename, "craftingBook", {
        name: "Crafting Book",
        hint: "Activa el Crafting Book",
        default: false,
        type: Boolean,
        scope: 'world',
        config: true
    });
}