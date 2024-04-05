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