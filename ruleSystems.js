// Import TypeScript modules
import { registerSettings } from "./module/settings.js";
import { canvasLayer } from "./module/canvasLayer.js";
//import { boughtRecipes } from "./module/craftingBook.js";

/* ------------------------------------ */
/* Initialize module					*/
/* ------------------------------------ */
Hooks.once('init', async function () {
    console.log('ruleSystems | Initializing ruleSystems');
    registerSettings();
    canvasLayer();
    boughtRecipes();
});