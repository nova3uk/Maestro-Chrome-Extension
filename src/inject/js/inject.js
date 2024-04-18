(async () => {
    getFromStore = async (key) => {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.get([key], function (result) {
                if (result[key] === undefined) {
                    resolve(null);
                } else {
                    resolve(result[key]);
                }
            });
        });
    };
    loadScript = (scriptUrl) => {
        const script = document.createElement('script');
        script.src = scriptUrl;
        document.body.appendChild(script);

        return new Promise((res, rej) => {
            script.onload = function () {
                res();
            }
            script.onerror = function () {
                rej();
            }
        });
    };
    try {
        var enabled = await getFromStore("enabledToggle");
        var logging = await getFromStore("loggingToggle");
        var footer = await getFromStore("footerToggle");
        var color = await getFromStore("colorToggle");
        var blinder = await getFromStore("blinderToggle");
        var autoFog = await getFromStore("autoFogToggle");

        if (enabled) {
            await loadScript(chrome.runtime.getURL(`src/inject/js/globals.js?main=true&extension_id=${chrome.runtime.id}&logging=${logging}&footer=${footer}&color=${color}&blinder=${blinder}&autofog=${autoFog}`));
        }
    } catch {
        console.log('error');
    };
})();   
