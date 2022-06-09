import { craftingBook } from "../scripts/craftingBook.js";

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
                    icon: "fas fa-books",
                    name: "craftingbook",
                    title: "Crafting Book",
                    button: true,
                    visible: game.settings.get("RuleSystems", "craftingBook"),
                    onClick: () => {
                        craftingBook();
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