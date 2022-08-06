import { craftingBook, mvp } from "./sideBarMacros.js";

export const canvasLayer = function () {
    CONFIG.Canvas.layers["ruleSystems"] = {group: "effects", layerClass: RSLayer}
    
    if (!Object.is(Canvas.layers, CONFIG.Canvas.layers)) {
        console.error('Possible incomplete layer injection by other module detected! Trying workaround...')

        const layers = Canvas.layers
        Object.defineProperty(Canvas, 'layers', {
            get: function () {
                return foundry.utils.mergeObject(layers, CONFIG.Canvas.layers)
            }
        })
    }

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
                    icon: "fas fa-books",
                    name: "craftingbook",
                    title: "Crafting Book",
                    button: true,
                    visible: game.settings.get("RuleSystems", "craftingBook"),
                    onClick: () => {
                        craftingBook();
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
                }
            ]
        })
    });
}

class RSLayer extends CanvasLayer {
    constructor() {
        super();
    }
}