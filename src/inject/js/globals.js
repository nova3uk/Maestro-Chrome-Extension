var maestro = maestro || {};
class Globals {
    // Public variables
    apiVersion = "v1";
    logging = false;
    overlay = false;
    colorPicker = false;
    strobeAt100Percent = false;
    latchedOn = false;
    overlayApp = {};
    btnTimer;
    strobeBtn;
    strobeActive = false;
    stageId = null;
    stage = null;
    fixtures = [];
    shutterFixtures = [];
    strobeFixtures = [];
    currentCue = [];
    eventManual;
    pageObserver;
    maxDmxVal = 1;
    minDmxVal = 0;
    allColors = [
        "RED",
        "GREEN",
        "BLUE",
        "COOL_WHITE",
        "WARM_WHITE",
        "CYAN",
        "MAGENTA",
        "YELLOW",
        "AMBER",
        "UV"
    ];
    commonColors = [
        "RED",
        "GREEN",
        "BLUE",
        "COOL_WHITE",
        "AMBER",
        "UV"
    ];
    moverTypes = {
        pan: "PAN",
        tilt: "TILT",
        panFine: "PAN_FINE",
        tiltFine: "TILT_FINE",
    }
    attributeTypes = {
        panSetting: {
            width: 0,
            offset: 0
        },
        tiltSetting: {
            width: 0,
            offset: 0
        },
        staticValue: {
            value: 0
        },
        range: {
            lowValue: 0,
            highValue: 0
        }
    }
    httpMethods = {
        GET: 'GET',
        POST: 'POST',
        PUT: 'PUT',
        DELETE: 'DELETE',
        PATCH: 'PATCH'
    }
    macro = {
        name: "",
        fixtures: []
    }

    getAttributeType = (type) => this.attributeTypes[type];
    getAttributeTypes = () => this.attributeTypes;
    getHttpMethods = () => this.httpMethods;


    getFilePath = (fileName) => `${this.Origin}/${fileName}`;
    isNumeric = function (value) {
        return !isNaN(parseFloat(value)) && isFinite(value);
    };
    getQueryStringParameter(key, url = window.location.search) {
        const urlParams = new URLSearchParams(url);
        return urlParams.get(key);
    };
    getUrl = async (url) => {
        try {
            const response = await fetch(url);
            const responseJson = await response.json();
            return responseJson;
        } catch (e) {
            if (this.logging)
                console.error("Cannot connect to the API, is Maestro running?", e);
        }
    };
    openNewTab = function (page) {
        let url = chrome.runtime.getURL(page);
        chrome.tabs.query({ url: url }, function (tabs) {
            if (tabs.length > 0) {
                chrome.tabs.update(tabs[0].id, { active: true });
            } else {
                chrome.tabs.create({ url: url });
            }
        });
    };
    setAttributeRange = function (range) {
        return {
            attribute: {
                range: {
                    ...this.attributeTypes.range,
                    lowValue: range.lowValue,
                    highValue: range.highValue
                }
            }
        };
    }

    calculateRange = function (range = this.attributeTypes.range) {
        return { lowValue: range.lowValue / 255, highValue: range.highValue / 255 };
    }

    prepareFetch = async function (method = this.httpMethods, url, params = {}, returnJson = true) {
        let options = {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        };

        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }

        try {
            if (returnJson)
                return response.json();
        } catch (e) { }
    }

    getSystemInfo = async () => {
        const info = await this.getUrl(`/api/${this.apiVersion}/system_info`);
        return info;
    }
    getBrightness = async (fixtureId) => {
        return await this.getUrl(`${this.maestroUrl}api/${this.apiVersion}/brightness`);
    };
    getShows = async () => {
        return await this.getUrl(`${this.maestroUrl}api/${this.apiVersion}/show`);
    }
    getShowState = async () => {
        return await this.getUrl(`${this.maestroUrl}api/${this.apiVersion}/show/state`);
    }
    startCue = async (cue) => {
        return await this.prepareFetch(this.httpMethods.POST, `${this.maestroUrl}api/${this.apiVersion}/show/start_cue`, cue, false);
    }
    getFixture = async (fixtureId) => {
        return await this.getUrl(`${this.maestroUrl}api/${this.apiVersion}/output/stage/${this.stageId}/fixture/${fixtureId}`);
    };
    getStages = async (force = false) => {
        if (!this.stage || force) {
            const stage = await this.getUrl(`${this.maestroUrl}api/${this.apiVersion}/output/stage`);
            this.stageId = stage.activeStageId;
            this.fixtures = stage.stage.find(ele => ele.id == stage.activeStageId).fixture;
            this.stage = stage;
            this.groups = stage.stage.find(ele => ele.id == stage.activeStageId).fixtureGroup;

            await this.getActiveStage();
        }
        return this.stage;
    };
    getActiveStage = async () => {
        const stage = await this.getUrl(`${this.maestroUrl}api/${this.apiVersion}/output/stage/${this.stageId}`);
        this.activeStage = stage;
        this.activeStageFixtureGroups = stage.fixtureGroup
        return this.activeStage;
    }
    storeFixtureProfile = async (macroName, fixture) => {
        let currentSetting = await this.getFixture(fixture.id);
        await this.saveLocalSetting("fixtureProfile_" + macroName + "_" + fixture.id, { "fixture": currentSetting });
    };
    retrieveFixtureProfile = async (macroName, fixtureId) => {
        return await this.getLocalSetting("fixtureProfile_" + macroName + "_" + fixtureId);
    };
    retrieveAllKeys = async () => {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(null, function (items) {
                resolve(Object.keys(items));
            });
        });
    }
    deleteFixtureProfile = async (macroName, fixtureId) => {
        this.deleteLocalSetting("fixtureProfile_" + macroName + "_" + fixtureId);
    };
    injectOverlay = function () {
        var s = document.createElement("script");
        s.src = this.getFilePath("src/inject/js/overlay.js");
        (document.head || document.documentElement).appendChild(s);
    };
    parseMaestroUrl = (url) => {
        var url = this.getQueryStringParameter("maestro_url");
        if (url) {
            url = url.replace("*://", "http://");
            url = url.replace("*", "");
            return url;
        }
    }
    saveSetting = (key, value) => {
        chrome.storage.sync.set({ [key]: value }, function () {
            return true;
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
    saveSyncSetting = (key, value) => {
        chrome.storage.sync.set({ [key]: value }, function () {
            return true;
        });
    };
    getSyncSetting = async (key) => {
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
    saveLocalSetting = (key, value) => {
        chrome.storage.local.set({ [key]: value }, function () {
            return true;
        });
    };
    deleteLocalSetting = (key) => {
        chrome.storage.local.remove(key, function () {
            return true;
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
}
maestro.Globals = new Globals(document.currentScript.src);