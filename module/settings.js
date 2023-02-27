import { mvp, travel, whisper, camp } from "./sideBarMacros.js";

export const registerSettings = function () {

    /* ------------------------------------ */
    /* CRAFTING         					*/
    /* ------------------------------------ */
    game.settings.register("RuleSystems", "mvp", {
        name: "MVP Mode",
        hint: "Activa el sistema de MVP para combates unicos.",
        default: true,
        type: Boolean,
        scope: 'world',
        config: true,
        onChange: debouncedReload
    });

    game.settings.register("RuleSystems", "medium-rest-life-style", {
        name: "Medium Rest Life Style",
        hint: "Nombre para el journal del descanso medio.",
        default: "Medium Rest Life Style",
        type: String,
        scope: 'world',
        config: true
    });

    game.settings.register("RuleSystems", "long-rest-life-style", {
        name: "Long Rest Life Style",
        hint: "Nombre para el journal del descanso largo.",
        default: "Long Rest Life Style",
        type: String,
        scope: 'world',
        config: true
    });

    Hooks.on("getSceneControlButtons", (controls) => {
        controls.push({
            name: "ruleSystems",
            title: "Rule Systems",
            icon: "fas fa-game-console-handheld",
            layer: "ruleSystems",
            tools: [
                {
                    icon: "fas fa-volume",
                    name: "whisper",
                    title: "Whisper",
                    button: true,
                    visible: true,
                    onClick: () => {
                        whisper();
                    }
                },
                {
                    icon: "fas fa-award",
                    name: "mvp",
                    title: "MVP",
                    button: true,
                    visible: game.settings.get("RuleSystems", "mvp") && game.user.isGM,
                    onClick: () => {
                        mvp();
                    }
                },
                {
                    icon: "fas fa-caravan",
                    name: "travel",
                    title: "Travel Activities",
                    button: true,
                    visible: game.user.isGM,
                    onClick: () => {
                        travel();
                    }
                },
                {
                    icon: "fas fa-campfire",
                    name: "camp",
                    title: "Camp Activities",
                    button: true,
                    visible: game.user.isGM,
                    onClick: () => {
                        camp();
                    }
                }
            ]
        })
    });
}

const debouncedReload = debounce(() => {
    window.location.reload()
}, 100)