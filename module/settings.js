export const registerSettings = function () {
    // Register any custom module settings here
    let modulename = "RuleSystems";
    game.settings.register("ruleSystems", "craftingBook", {
        name: "Crafting Book",
        hint: "Activa el Crafting Book",
        default: false,
        type: Boolean,
        scope: 'world',
        config: true,
        onChange: debouncedReload,
    });
}

const debouncedReload = debounce(() => {
    window.location.reload()
}, 100)