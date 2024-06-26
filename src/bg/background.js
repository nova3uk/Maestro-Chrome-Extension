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
    async function (request, sender, sendResponse) {
        if (request.getEnvironment) {
            return new Promise((resolve, reject) => {

                chrome.management.get(chrome.runtime.id, function (app_info) {
                    if (app_info.installType == "development") {
                        resolve(sendResponse(true));
                    }
                    else {
                        resolve(sendResponse(false));
                    }
                });
            });
        }
        if (request.audioLevel) {
            request.time = Date.now();
            chrome.storage.local.set({ audioLevel: request.audioLevel });
        }
        if (request.globalStateNotification) {
            request.globalStateNotification.time = Date.now();
            chrome.storage.local.set({ globalStateNotification: request.globalStateNotification });
        }
        if (request.liveStateNotification) {
            request.liveStateNotification.time = Date.now();
            chrome.storage.local.set({ liveStateNotification: request.liveStateNotification });
        }
        if (request.showStateNotification) {
            request.showStateNotification.time = Date.now();
            chrome.storage.local.set({ showStateNotification: request.showStateNotification });
        }
        if (request.getMacros) {
            return await this.getLocalSetting("macros").then(macros => {
                return sendResponse(macros);
            });
        }

        if (request.ping) {
            return new Promise((resolve, reject) => {
                chrome.storage.local.set({ activeTab: sender.tab.id }).then(() => {
                    resolve(sendResponse(true));
                });
            });
        };
        if (request.getStrobeFixtures) {
            this.retrieveAllKeys().then(keys => {
                let response = [];
                for (let key in keys) {
                    if (key.includes("strobe_")) {
                        let item = {};
                        item[key] = keys[key];

                        response.push(item);
                    }
                }
                return sendResponse(response);
            });
        }
        if (request.getIgnoreFixtures) {
            this.retrieveAllKeys().then(keys => {
                let response = [];
                for (let key in keys) {
                    if (key.includes("fixture_ignore_")) {
                        let item = {};
                        item[key] = keys[key];

                        response.push(item);
                    }
                }
                return sendResponse(response);
            });
        }
        if (request.getLocalSetting) {
            let value = await this.getLocalSetting(request.key);
            return sendResponse(value);
        };
        if (request.saveLocalSetting) {
            return new Promise((resolve, reject) => {
                chrome.storage.local.set({ [request.key]: request.value }).then(() => {
                    resolve(sendResponse(true));
                });
            });
        };
        if (request.getAutoProgramParams) {
            let autoFogEnabled = await this.getSetting("autoFogToggle");
            let autoFogOnActivityPeak = await this.getLocalSetting("autoFogOnActivityPeak");
            let autoFogOnActivityPeakPercent = await this.getLocalSetting("autoFogOnActivityPeakPercent");
            let autoFogOnActivityPeakDuration = await this.getLocalSetting("autoFogOnActivityPeakDuration");
            let autoFogOnActivityPeakInterval = await this.getLocalSetting("autoFogOnActivityPeakInterval");
            let autoFogOnTimer = await this.getLocalSetting("autoFogOnTimer");
            let fogTimer = await this.getLocalSetting("fogTimer");
            let fogTimerDuration = await this.getLocalSetting("fogTimerDuration");

            let autoEffectsEnabled = await this.getLocalSetting("autoEffectsEnabled");
            let autoEffectsOnActivityPeakPercent = await this.getLocalSetting("autoEffectsOnActivityPeakPercent");
            let autoEffectsOnActivityPeakDuration = await this.getLocalSetting("autoEffectsOnActivityPeakDuration");
            let autoEffectsOnActivityPeakInterval = await this.getLocalSetting("autoEffectsOnActivityPeakInterval");
            let autoStrobeEnabled = await this.getLocalSetting("autoStrobeEnabled");
            let autoStrobeOnActivityPeakPercent = await this.getLocalSetting("autoStrobeOnActivityPeakPercent");
            let autoStrobeOnActivityPeakDuration = await this.getLocalSetting("autoStrobeOnActivityPeakDuration");
            let autoStrobeOnActivityPeakInterval = await this.getLocalSetting("autoStrobeOnActivityPeakInterval");



            let response = {};
            response.autoFogEnabled = autoFogEnabled;
            response.autoFogOnActivityPeak = autoFogOnActivityPeak;
            response.autoFogOnActivityPeakPercent = autoFogOnActivityPeakPercent;
            response.autoFogOnActivityPeakDuration = autoFogOnActivityPeakDuration;
            response.autoFogOnActivityPeakInterval = autoFogOnActivityPeakInterval;
            response.autoFogOnTimer = autoFogOnTimer;
            response.fogTimer = fogTimer;
            response.fogTimerDuration = fogTimerDuration;
            response.autoEffectsEnabled = autoEffectsEnabled;
            response.autoEffectsOnActivityPeakPercent = autoEffectsOnActivityPeakPercent;
            response.autoEffectsOnActivityPeakDuration = autoEffectsOnActivityPeakDuration;
            response.autoEffectsOnActivityPeakInterval = autoEffectsOnActivityPeakInterval;
            response.autoStrobeEnabled = autoStrobeEnabled;
            response.autoStrobeOnActivityPeakPercent = autoStrobeOnActivityPeakPercent;
            response.autoStrobeOnActivityPeakDuration = autoStrobeOnActivityPeakDuration;
            response.autoStrobeOnActivityPeakInterval = autoStrobeOnActivityPeakInterval;


            return sendResponse(response);
        }
        if (request.openSettingsWindow) {
            let url = chrome.runtime.getURL(`src/settings/settings.html?maestro_url=${encodeURIComponent(request.openSettingsWindow)}`);
            chrome.tabs.query({ url: url }, function (tabs) {
                if (tabs && tabs.length > 0) {
                    chrome.tabs.update(tabs[0].id, { active: true });
                } else {
                    chrome.tabs.create({ url: url });
                }
            });
        }
    });
//onUpdate or Install
chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason == "install") {
        var thisVersion = chrome.runtime.getManifest().version;
        chrome.storage.local.set({ version: thisVersion });

        //sync settings
        chrome.storage.sync.set({ enabledToggle: true });
        chrome.storage.sync.set({ loggingToggle: false });
        chrome.storage.sync.set({ colorToggle: false });
        chrome.storage.sync.set({ footerToggle: true });
        chrome.storage.sync.set({ blinderToggle: false });
        chrome.storage.sync.set({ autoFogToggle: false });

        //local settings
        chrome.storage.local.set({ autoFogOnActivityPeak: false });
        chrome.storage.local.set({ autoFogOnActivityPeakPercent: 95 });
        chrome.storage.local.set({ autoFogOnActivityPeakDuration: 3 });
        chrome.storage.local.set({ autoFogOnActivityPeakInterval: 2 });
        chrome.storage.local.set({ autoFogOnTimer: false });
        chrome.storage.local.set({ fogTimer: 10 });
        chrome.storage.local.set({ fogTimerDuration: 3 });

        chrome.storage.local.set({ autoEffectsEnabled: false });
        chrome.storage.local.set({ autoEffectsOnActivityPeakPercent: 95 });
        chrome.storage.local.set({ autoEffectsOnActivityPeakDuration: 2 });
        chrome.storage.local.set({ autoEffectsOnActivityPeakInterval: 2 });

        chrome.storage.local.set({ autoStrobeEnabled: false });
        chrome.storage.local.set({ autoStrobeOnActivityPeakPercent: 95 });
        chrome.storage.local.set({ autoStrobeOnActivityPeakDuration: 2 });
        chrome.storage.local.set({ autoStrobeOnActivityPeakInterval: 2 });

        chrome.storage.local.set({ autoMacroInterval: 5 });
        chrome.storage.local.set({ autoMacroRunTime: 30 });
        chrome.storage.local.set({ autoMacroEnabled: false });

        let internalUrl = chrome.runtime.getURL("src/settings/settings.html?maestro_url=*%3A%2F%2Fmaestro.local%2F*");
        chrome.tabs.create({ url: internalUrl }, function (tab) { });

    } else if (details.reason == "update") {
        var thisVersion = chrome.runtime.getManifest().version;
        chrome.storage.local.set({ version: thisVersion });
        switch (thisVersion) {
            case "1.3.2":
                chrome.storage.sync.set({ autoFogToggle: false });

                //local settings
                chrome.storage.local.set({ autoFogOnActivityPeak: false });
                chrome.storage.local.set({ autoFogOnActivityPeakPercent: 95 });
                chrome.storage.local.set({ autoFogOnActivityPeakDuration: 3 });
                chrome.storage.local.set({ autoFogOnActivityPeakInterval: 2 });
                chrome.storage.local.set({ autoFogOnTimer: false });
                chrome.storage.local.set({ fogTimer: 10 });
                chrome.storage.local.set({ fogTimerDuration: 3 });

                chrome.storage.local.set({ autoEffectsEnabled: false });
                chrome.storage.local.set({ autoEffectsOnActivityPeakPercent: 95 });
                chrome.storage.local.set({ autoEffectsOnActivityPeakDuration: 2 });
                chrome.storage.local.set({ autoEffectsOnActivityPeakInterval: 2 });

                chrome.storage.local.set({ autoStrobeEnabled: false });
                chrome.storage.local.set({ autoStrobeOnActivityPeakPercent: 95 });
                chrome.storage.local.set({ autoStrobeOnActivityPeakDuration: 2 });
                chrome.storage.local.set({ autoStrobeOnActivityPeakInterval: 2 });
                break;
            case "1.3.16":
                chrome.storage.local.set({ autoMacroInterval: 5 });
                chrome.storage.local.set({ autoMacroRunTime: 30 });
                chrome.storage.local.set({ autoMacroEnabled: false });
                break;
        }
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
getLocalSetting = async (key) => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([key], function (result) {
            if (result[key] === undefined) {
                resolve(null);
            } else {
                resolve(result[key]);
            }
        });
    });
};
getSetting = async (key) => {
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