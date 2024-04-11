//load main script
const getFromStore = async (key) => {
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
(async function () {
    try {
        var enabled = await getFromStore("enabledToggle");
        var logging = await getFromStore("loggingToggle");
        var footer = await getFromStore("footerToggle");
        var color = await getFromStore("colorToggle");

        if (enabled) {
            let g = document.createElement("script");
            g.src = chrome.runtime.getURL('src/inject/js/globals.js');
            (document.head || document.documentElement).appendChild(g);
            g.onload = function () {
                let s = document.createElement("script");
                s.src = chrome.runtime.getURL(`src/inject/js/maestro-main.js?logging=${logging}&footer=${footer}&color=${color}`);
                (document.head || document.documentElement).appendChild(s);
            };
        }
    } catch (e) { console.error(e); }
})();   
