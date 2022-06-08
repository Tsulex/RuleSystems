/* ------------------------------------ */
/* Import modules   					*/
/* ------------------------------------ */
import { registerSettings } from "./module/settings.js";
import { canvasLayer } from "./module/canvasLayer.js";

/* ------------------------------------ */
/* Initialize module					*/
/* ------------------------------------ */
Hooks.once('init', async function () {
    console.log('RuleSystems | Initializing ruleSystems');
    registerSettings();
    canvasLayer();
});