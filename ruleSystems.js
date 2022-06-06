// Import TypeScript modules
import { registerSettings } from "./module/settings.js";

Hooks.once('init', async function () {
    console.log('ruleSystems | Initializing ruleSystems');
    registerSettings();
});