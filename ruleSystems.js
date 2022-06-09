/* ------------------------------------ */
/* Import modules   					*/
/* ------------------------------------ */
import { registerSettings } from "./module/settings.js";
import { canvasLayer } from "./module/canvasLayer.js";
import { RS } from "./module/functionMacros.js";
import { setupSocket, socketlibSocket } from "./module/GMAction.js";

/* ------------------------------------ */
/* Initialize module					*/
/* ------------------------------------ */
Hooks.once('init', async function () {
    console.log('RuleSystems | Initializing ruleSystems');
    registerSettings();
    canvasLayer();
    window.RuleSystems = RS;
});

/* ------------------------------------ */
/* Setup module							*/
/* ------------------------------------ */
Hooks.once('setup', function () {
    setupSocket();
});

/* ------------------------------------ */
/* When ready							*/
/* ------------------------------------ */
Hooks.once('ready', function () {
    globalThis.RuleSystemsGM = {
        socket: () => { return socketlibSocket; }
    }
});