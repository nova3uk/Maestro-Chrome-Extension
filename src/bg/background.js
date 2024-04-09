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
//onUpdate or Install
chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason == "install") {
        chrome.storage.sync.set({ enabledToggle: true });
        chrome.storage.sync.set({ loggingToggle: false });
        chrome.storage.sync.set({ footerToggle: true });
    } else if (details.reason == "update") {
        var thisVersion = chrome.runtime.getManifest().version;
        console.log(
            "Updated from " + details.previousVersion + " to " + thisVersion + "!"
        );
    }
});