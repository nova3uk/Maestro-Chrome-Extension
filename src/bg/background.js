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
        if (request.checkRunningMacros) {
            this.retrieveAllKeys().then(keys => {
                return sendResponse(keys.filter(key => key.includes("fixtureProfile_")));
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
            resolve(Object.keys(items));
        });
    });
}