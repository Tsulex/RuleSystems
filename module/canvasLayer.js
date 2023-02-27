export const canvasLayer = function () {
    CONFIG.Canvas.layers["ruleSystems"] = {group: "primary", layerClass: RSLayer}
    
    if (!Object.is(Canvas.layers, CONFIG.Canvas.layers)) {
        console.error('Possible incomplete layer injection by other module detected! Trying workaround...')

        const layers = Canvas.layers
        Object.defineProperty(Canvas, 'layers', {
            get: function () {
                return foundry.utils.mergeObject(layers, CONFIG.Canvas.layers)
            }
        })
    }
}

class RSLayer extends InteractionLayer {
    constructor() {
        super();
    }

    static documentName = "RuleSystems";
}