//initilise extension
chrome.runtime.onMessage.addListener(function (
    request,
    sender,
    sendResponse
) {
    //chrome.pageAction.show(sender.tab.id);
    sendResponse(
        ({ name, version, description } = chrome.runtime.getManifest())
    );
});
chrome.runtime.onMessageExternal.addListener(
    function (request, sender, sendResponse) {
        if(request.getStrobeFixtures){
            this.retrieveAllKeys().then(keys => {
                let response = [];
                for(let key in keys){
                    if(key.includes("strobe_")){
                        let item = {};
                        item[key] = keys[key];

                        response.push(item);
                    }
                }
                return sendResponse(response);
            });
        }
        if(request.getIgnoreFixtures){
            this.retrieveAllKeys().then(keys => {
                let response = [];
                for(let key in keys){
                    if(key.includes("fixture_ignore_")){
                        let item = {};
                        item[key] = keys[key];

                        response.push(item);
                    }
                }
                return sendResponse(response);
            });
        }
    });
//onUpdate or Install
chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason == "install") {
        chrome.storage.sync.set({ enabledToggle: true });
        chrome.storage.sync.set({ loggingToggle: false });
        chrome.storage.sync.set({ colorToggle: false });
        chrome.storage.sync.set({ footerToggle: true });
        chrome.storage.sync.set({ blinderToggle: false });

        let internalUrl = chrome.runtime.getURL("src/settings/settings.html?maestro_url=*%3A%2F%2Fmaestro.local%2F*");
        chrome.tabs.create({ url: internalUrl }, function (tab) { });

    } else if (details.reason == "update") {
        var thisVersion = chrome.runtime.getManifest().version;
        console.log(
            "Updated from " + details.previousVersion + " to " + thisVersion + "!"
        );
    }
});
retrieveAllKeys = async () => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(null, function (items) {
            resolve(items);
        });
    });
};