//load main script
(function () {
    var s = document.createElement("script");
    s.src = chrome.runtime.getURL("src/inject/js/maestro-main.js");
    (document.head || document.documentElement).appendChild(s);

    // //overlay
    // if (maestro.App.overlay) {
    //     var s = document.createElement("script");
    //     s.src = chrome.runtime.getURL("src/inject/js/overlay.js");
    //     (document.head || document.documentElement).appendChild(s);
    // }
})();
