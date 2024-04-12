// Load plugins defined in public/plugins:
// - parsejson/plugin.js - function parseJson()
//
declare global {
    interface Window {
        parseJSON: any,
        importJSON: any,
    }
}

// Get a plugin function
export function getPluginFunc(pluginFunc: "parseJSON" | "importJSON") {
    return window[pluginFunc];
}

// Load all the plugins
function loadPlugins() {
    for (const pluginName of ["parsejson", "importjson"]) {
        const script = document.createElement('script');
        script.src = "plugins/" + pluginName + "/plugin.js";
        script.async = true;
        document.body.appendChild(script);
    }
}

loadPlugins(); // Load all the plugin scripts