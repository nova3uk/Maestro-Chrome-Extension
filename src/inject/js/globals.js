"use strict";
var maestro = maestro || {};
class Globals {
    constructor(scriptSource, debugFetch = false) {
        if (debugFetch) this.replaceFetch();
        this.init(scriptSource);
    }

    init = async (scriptSource = null, logging = false) => {
        if (scriptSource) {
            if (scriptSource.indexOf("main=true") !== -1) {
                var src = new URL(scriptSource);
                this.ExtensionId = src.host;
                this.Origin = src.origin;
                this.Search = src.search;
                this.systemInfo = await this.getSystemInfo();

                this.loadScript(`${this.Origin}/src/inject/js/v/${this.systemInfo.version}/api.js`, this.Search).then(() => {
                    this.loadScript(`${this.Origin}/src/inject/js/maestro-main.js`, this.Search);
                });
            };
        }
    };

    // Public variables
    fatalErrorMsg = "Sorry, there was a problem processing your request.\n\nPlease reload the page and try again."
    systemInfo;
    apiVersion = "v1";
    logging;
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
    cues;
    activeStageFixtureGroups = [];
    eventManual;
    pageObserver;
    maxDmxVal = 1;
    minDmxVal = 0;
    audioLevel = 0;
    activityLevel = 0;

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
    };
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
    };
    httpMethods = {
        GET: 'GET',
        POST: 'POST',
        PUT: 'PUT',
        DELETE: 'DELETE',
        PATCH: 'PATCH'
    };
    macro = {
        name: "",
        fixtures: []
    };


    // Variable to be monitored
    activityLevelRoot = 0;
    arrActivityLevelCallbacks = []
    replaceFetch = () => {
        const originalFetch = window.fetch;

        window.fetch = async (url, options) => {
            console.log(Date.now() + ' Request:', url, options);
            let startTime = Date.now();
            const response = await originalFetch(url, options);
            let endTime = Date.now();
            let execTime = endTime - startTime;
            if (execTime < 1000)
                execTime = execTime + 'ms';
            if (execTime >= 1000)
                execTime = (execTime / 1000).toFixed(2) + 's';

            console.log(`${Date.now()} ${execTime} Response:'`, response);

            return response;
        };
    };
    createTableCell = (text, className = null, data = null, isHtmlContent = true, style = null, colspan = null, rowspan = null) => {
        let cell = document.createElement("td");

        isHtmlContent ? cell.innerHTML = text : cell.textContent = text;
        className ? cell.className = className : null;
        data ? cell.dataset = data : null;
        style ? cell.style = style : null;
        colspan ? cell.colSpan = colspan : null;
        rowspan ? cell.rowSpan = rowspan : null;

        return cell;
    }
    getContrastColor = (color) => {
        // Calculate the contrast ratio between the color and white
        const luminance = (0.299 * parseInt(color.substr(1, 2), 16) + 0.587 * parseInt(color.substr(3, 2), 16) + 0.114 * parseInt(color.substr(5, 2), 16)) / 255;
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }
    getFilePath = (fileName) => `${this.Origin}/${fileName}`;
    loadScript = (scriptUrl, params = null) => {
        const script = document.createElement('script');
        script.src = scriptUrl + params;
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
    injectOverlay = function () {
        var s = document.createElement("script");
        s.src = this.getFilePath("src/inject/js/overlay.js");
        (document.head || document.documentElement).appendChild(s);
    };

    // Handler for the proxy
    activityLevelHdlr = {
        async set(target, property, value) {
            for (let i = 0; i < maestro.Globals.arrActivityLevelCallbacks.length; i++) {
                if (typeof maestro.Globals.arrActivityLevelCallbacks[i] === 'function') {
                    await maestro.Globals.arrActivityLevelCallbacks[i](value);
                }
            }

            target[property] = value;
            return true;
        }
    };

    // Create a proxy for the variable
    activityLevel = new Proxy({ value: this.activityLevelRoot }, this.activityLevelHdlr);

    getAttributeType = (type) => this.attributeTypes[type];
    getAttributeTypes = () => this.attributeTypes;
    getHttpMethods = () => this.httpMethods;

    safeMinMax = (obj, minNumber, maxNumber) => {
        try {
            obj = Number(obj);
        } catch (e) {
            if (this.logging)
                console.error(e);
        }

        if (typeof obj === 'number' && !isNaN(obj)) {
            if (obj < minNumber)
                return minNumber;
            if (obj > maxNumber)
                return maxNumber;

            return obj;
        } else {
            return minNumber;
        }
    };
    debounce = (callback, wait = 1000) => {
        let timeoutId = null;
        return (...args) => {
            window.clearTimeout(timeoutId);
            timeoutId = window.setTimeout(() => {
                callback(...args);
            }, wait);
        };
    };
    leftMouseClick = (evt) => {
        if ("button" in evt) {
            return evt.button == 0;
        }
        var button = evt.which || evt.button;
        return button == 0;
    };
    getUuid = () => {
        return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
            (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
        );;
    }
    getFilePath = (fileName) => `${this.Origin}/${fileName}`;
    isNumeric = (value) => {
        return !isNaN(parseFloat(value)) && isFinite(value);
    };
    getQueryStringParameter = (key, url = window.location.search) => {
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
    formatDate = (d, withSeconds = false) => {
        return d.getFullYear().toString() + "-" + ((d.getMonth() + 1).toString().length == 2 ? (d.getMonth() + 1).toString() : "0" + (d.getMonth() + 1).toString()) + "-" + (d.getDate().toString().length == 2 ? d.getDate().toString() : "0" + d.getDate().toString()) + " " + (d.getHours().toString().length == 2 ? d.getHours().toString() : "0" + d.getHours().toString()) + ":" + ((parseInt(d.getMinutes() / 5) * 5).toString().length == 2 ? (parseInt(d.getMinutes() / 5) * 5).toString() : "0" + (parseInt(d.getMinutes() / 5) * 5).toString()) + (withSeconds ? ":" + (d.getSeconds().toString().length == 2 ? d.getSeconds().toString() : "0" + d.getSeconds().toString()) : "");
    }
    getScaledValue = (value, sourceRangeMin, sourceRangeMax, targetRangeMin, targetRangeMax) => {
        var targetRange = targetRangeMax - targetRangeMin;
        var sourceRange = sourceRangeMax - sourceRangeMin;
        return (value - sourceRangeMin) * targetRange / sourceRange + targetRangeMin;
    }
    getObjectDiff = (obj1, obj2) => {
        const diff = Object.keys(obj1).reduce((result, key) => {
            if (!obj2.hasOwnProperty(key)) {
                result.push(key);
            } else if (_.isEqual(obj1[key], obj2[key])) {
                const resultKeyIndex = result.indexOf(key);
                result.splice(resultKeyIndex, 1);
            }
            return result;
        }, Object.keys(obj2));

        return diff;
    };
    upprageShutterParams = async (fixtureId, shutterParams) => {
        //new
        //"strobe_373bdc30-c32e-409d-91e7-70cdde906b95" :[{"channelId" : "6", "shutter" : 200, "strobe" : 255}, {"channelId" : "13", "shutter" : 100, "strobe" : 255}]
        //old
        //strobe_1fa611c0-6f81-43cf-9153-5d01b9c2d2ee": {"shutter": 255,"strobe": 200}

        try {
            if (shutterParams) {
                if (shutterParams.shutter || shutterParams.strobe) {
                    let fixture = this.activeStage.fixture.find(ele => ele.id == fixtureId);
                    let channel = fixture.attribute.filter(channel => channel.type === "SHUTTER" || channel.type === "STROBE")
                        .map((channel) => ({ index: fixture.attribute.indexOf(channel), channel }));
                    if (channel) {
                        let newShutterParams = [];

                        newShutterParams.push({ channelId: channel[0].index, shutter: shutterParams.shutter, strobe: shutterParams.strobe });
                        this.saveLocalSetting("strobe_" + fixtureId, newShutterParams);

                        return newShutterParams;
                    }
                }
            }
        } catch (e) {
            if (this.logging)
                console.error('Error upgrading shutter params:', e);
        }
        return shutterParams;
    }
    openNewTab = (page) => {
        let url = chrome.runtime.getURL(page);
        chrome.tabs.query({ url: url }, function (tabs) {
            if (tabs.length > 0) {
                chrome.tabs.update(tabs[0].id, { active: true });
            } else {
                chrome.tabs.create({ url: url });
            }
        });
    };
    calculateRange = (range = this.attributeTypes.range) => {
        return { lowValue: range.lowValue / 255, highValue: range.highValue / 255 };
    };

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
    };

    getSystemInfo = async () => {
        try {
            return await this.getUrl(`/api/${this.apiVersion}/system_info`);
        } catch (e) {
            if (this.logging) {
                console.error("Cannot connect to the API, is Maestro running?", e);
            }
        }
    };
    getBrightness = async () => {
        if (this.brightness) {
            if (this.brightnessUpdate) {
                if (this.brightnessUpdate + 5000 > Date.now()) {
                    return this.brightness;
                }
            }
        }

        this.brightness = await this.getUrl(`${this.maestroUrl}api/${this.apiVersion}/brightness`);
        this.brightnessUpdate = Date.now();
        return this.brightness;
    };
    getShows = async () => {
        try {
            return await this.getUrl(`${this.maestroUrl}api/${this.apiVersion}/show`);
        } catch (e) {
            if (this.logging) {
                console.error("Cannot connect to the API, is Maestro running?", e);
            }
        }
    };
    getShowState = async () => {
        try {
            return await this.getUrl(`${this.maestroUrl}api/${this.apiVersion}/show/state`);
        } catch (e) {
            if (this.logging) {
                console.error("Cannot connect to the API, is Maestro running?", e);
            }
            throw e;
        }
    };
    startCue = async (cue) => {
        return await this.prepareFetch(this.httpMethods.POST, `${this.maestroUrl}api/${this.apiVersion}/show/start_cue`, { value: cue }, false);
    };
    stopShow = async () => {
        return await this.prepareFetch(this.httpMethods.POST, `${this.maestroUrl}api/${this.apiVersion}/show/stop`, {}, false);
    };
    getFixture = async (fixtureId) => {
        return await this.getUrl(`${this.maestroUrl}api/${this.apiVersion}/output/stage/${this.stageId}/fixture/${fixtureId}`);
    };
    getStages = async (forceRefresh = false) => {
        if (!this.stage || forceRefresh) {
            const stage = await this.getUrl(`${this.maestroUrl}api/${this.apiVersion}/output/stage`);

            this.stageId = stage.activeStageId;
            this.fixtures = stage.stage.find(ele => ele.id == stage.activeStageId).fixture;
            this.stage = stage;
            this.groups = stage.stage.find(ele => ele.id == stage.activeStageId).fixtureGroup;
            this.activeStage = stage.stage.find(ele => ele.id == stage.activeStageId);
            this.activeStageFixtureGroups = this.activeStage.fixtureGroup;
        }
        return this.stage;
    };
    getActiveStage = async (forceRefresh = false) => {
        if (!this.stage || forceRefresh) {
            const stage = await this.getUrl(`${this.maestroUrl}api/${this.apiVersion}/output/stage/${this.stageId}`);
            this.activeStage = stage;
            return this.activeStage;
        }
        return this.activeStage;
    }
    storeFixtureProfile = async (macroName, fixture) => {
        try {
            await this.saveLocalSetting("macro_active_" + fixture.id, { "macroName": macroName, "fixture": fixture });
        } catch (e) {
            console.error(e);
            return null;
        }
    };
    retrieveFixtureProfile = async (fixtureId) => {
        return await this.getLocalSetting("macro_active_" + fixtureId);
    };
    retrieveAllKeys = async () => {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(null, function (items) {
                resolve(items);
            });
        });
    };
    deleteFixtureProfile = async (fixtureId) => {
        this.deleteLocalSetting("macro_active_" + fixtureId);
    };
    injectOverlay = () => {
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
    };
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
        return new Promise((resolve, reject) => {
            chrome.storage.local.set({ [key]: value }, function () {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(true);
                }
            });
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
    getRemoteSetting = async (key) => {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(this.ExtensionId, { getLocalSetting: true, key: key },
                function (result) {
                    if (result === undefined) {
                        resolve(null);
                    } else {
                        resolve(result);
                    }
                });
        });
    };
    saveRemoteSetting = async (key, value) => {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(this.ExtensionId, { saveLocalSetting: true, key: key, value: value },
                function (result) {
                    resolve(result);
                });
        });
    }
    prettyJSON = (data) => {
        return JSON.stringify(data, null, '\t');
    };
    injectCSS = (css) => {
        let el = document.createElement('style');
        el.innerText = css;
        document.head.appendChild(el);
        return el;
    };
    openSettingsWindow = async () => {
        chrome.runtime.sendMessage(this.ExtensionId, { openSettingsWindow: this.maestroUrl },
            function (response) {
                if (response) {
                    if (this.logging)
                        console.log("Settings window opened.");
                }
            });
    };
}
maestro.Globals = new Globals(document.currentScript.src);