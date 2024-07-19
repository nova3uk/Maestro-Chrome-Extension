"use strict";
var maestro = maestro || {};
class Globals {
    constructor(scriptSource, debugFetch = false) {
        if (debugFetch) this.replaceFetch();
        this.init(scriptSource);
    }

    init = async (scriptSource = null, logging = false) => {
        if (scriptSource) {
            var src = new URL(scriptSource);
            this.ExtensionId = src.host;
            this.Origin = src.origin;
            this.Search = src.search;

            if (scriptSource.indexOf("logging=true") !== -1) {
                this.logging = true
            };
            if (scriptSource.indexOf("main=true") !== -1) {
                this.maestroUrl = (document.location.origin).endsWith("/") ? document.location.origin : document.location.origin + "/";
                this.maestroHost = new URL(this.maestroUrl).host;
                this.saveRemoteSetting("maestroUrl", this.maestroUrl);
                this.saveRemoteSetting("maestroHost", this.maestroHost);

                this.systemInfo = await this.getSystemInfo();

                this.loadScript(`${this.Origin}/src/inject/js/v/${this.systemInfo.version}/api.js`, this.Search).then(() => {
                    this.loadScript(`${this.Origin}/src/inject/js/maestro-main.js`, this.Search).then(() => {
                        maestro.App.logging = this.logging;
                    });
                });
            } else {
                this.maestroUrl = await this.getLocalSetting('maestroUrl');
                this.maestroHost = await this.getLocalSetting('maestroHost');
                this.logging = await this.getLocalSetting('loggingToggle');
                this.systemInfo = await this.getSystemInfo();
            }
            if (scriptSource.indexOf("info=true") !== -1) {
                this.loadScript(`${this.Origin}/src/inject/js/info.js`)
            }
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
    activeStage;
    stageId;
    fixtures;
    stage;
    groups;
    activeStageFixtureGroups;
    stageId = null;
    stage = null;
    fixtures = [];
    shutterFixtures = [];
    strobeFixtures = [];
    currentCue = [];
    cues;
    macros;
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
    rgbTypes = {
        'RED': 'red',
        'GREEN': 'green',
        'BLUE': 'blue',
        'AMBER': 'orange',
        'WARM_WHITE': 'yellow',
        'COOL_WHITE': 'white',
        'UV': 'purple',
        'CYAN': 'cyan',
        'MAGENTA': 'magenta',
        'YELLOW': 'yellow',
        'RED_FINE': 'red',
        'GREEN_FINE': 'green',
        'BLUE_FINE': 'blue',
        'AMBER_FINE': 'orange',
        'WARM_WHITE_FINE': 'yellow',
        'COOL_WHITE_FINE': 'white',
        'UV_FINE': 'purple',
        'CYAN_FINE': 'cyan',
        'MAGENTA_FINE': 'magenta',
        'YELLOW_FINE': 'yellow'
    };
    moveEffects = {
        animateCircle: "Circles",
        animateCircleWithFan: "Circles with Fan",
        animateFigureEight: "Figure 8",
        animateFigureEightWithFan: "Figure 8 with Fan",
        animateUpDown: "Up and Down",
        animateLeftRight: "Left and Right"
    };

    // Variable to be monitored
    activityLevelRoot = 0;
    arrActivityLevelCallbacks = []
    showLoader = () => {
        return;
        document.body.style.overflow = "hidden";
        document.getElementById('modalLoading').style.display = "block";
    };
    hideLoader = () => {
        document.getElementById('modalLoading').style.display = "none";
        document.body.style.overflow = "auto";
    };
    timeAgo = (time) => {
        const currentTime = new Date();
        const diff = currentTime - time;

        const minute = 60 * 1000;
        const hour = 60 * minute;
        const day = 24 * hour;
        const week = 7 * day;
        const month = 30 * day;

        if (diff < minute) {
            return Math.floor(diff / 1000) + " seconds ago";
        } else if (diff < hour) {
            return Math.floor(diff / minute) + " minutes ago";
        } else if (diff < day) {
            return Math.floor(diff / hour) + " hours ago";
        } else if (diff < week) {
            return Math.floor(diff / day) + " days ago";
        } else if (diff < month) {
            return Math.floor(diff / week) + " weeks ago";
        } else {
            return Math.floor(diff / month) + " months ago";
        }
    };
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
        script.src = scriptUrl + (params !== null ? params : '');
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
    injectOverlay = () => {
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

    safeZero = (obj) => {
        try {
            obj = Number(obj);
        } catch (e) {
            if (this.logging)
                console.error(e);
        }

        if (typeof obj === 'number' && !isNaN(obj)) {
            return obj;
        } else {
            return 0;
        }
    };
    safeMinMax = (obj, minNumber, maxNumber) => {
        try {
            obj = Number(obj);
        } catch (e) {
            if (this.logging)
                console.error(e);
        }

        if (typeof obj === 'number' && !isNaN(obj)) {
            return Math.min(Math.max(obj, minNumber), maxNumber);
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
    throttle = (func, delay) => {
        let lastCall = 0;
        return function (...args) {
            const now = new Date().getTime();
            if (now - lastCall >= delay) {
                func(...args);
                lastCall = now;
            }
        };
    }
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
    postUrl = async (url, params = null) => {
        try {
            let options = {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            };

            const response = await fetch(url, options);
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
    getScaledValue = (value, inMin, inMax, outMin, outMax) => {
        return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
    }
    getScaledValue2 = (value, sourceRangeMin, sourceRangeMax, targetRangeMin, targetRangeMax) => {
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
    logChanges = async (stageId, changeSet) => {
        try {
            if (!this.logging) return;

            const changeLogItem = {
                stageId: stageId,
                timestamp: new Date().toISOString(),
                changeSet: changeSet
            };

            let changeLog = await this.getLocalSetting('changeLog');
            if (!changeLog) {
                changeLog = [];
            }
            changeLog.push(changeLogItem);

            this.saveLocalSetting('changeLog', changeLog);
        } catch (e) {
            if (this.logging)
                console.error('Error logging changes:', e);
        }
    };
    upprageShutterParams = async (fixtureId, shutterParams) => {
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
    putAttribute = async (fixtureId, attributeId, attribute, stageId) => {
        let url = `${maestro.SettingsApp.maestroUrl}api/${this.apiVersion}/output/stage/${stageId ? stageId : this.stageId}/fixture/${fixtureId}/attribute/${attributeId}`;

        let options = {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(attribute)
        };

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            if (this.logging)
                this.logChanges(stageId, { fixtureId: fixtureId, attributeId: attributeId, attribute: attribute });

            return response.json();
        } catch (error) {
            if (this.logging)
                console.error('Fatal error updating fixture data:', error);
        }
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
            return await this.getUrl(`${this.maestroUrl}api/${this.apiVersion}/system_info`);
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
    getFixtures = async (stageId) => {
        const fixtures = await this.getUrl(`${this.maestroUrl}api/${this.apiVersion}/output/stage/${stageId}`);
        return fixtures;
    };
    getAllMovers = async () => {
        if (!this.activeStage)
            await this.getStages();
        if (!this.activeStage.fixture)
            return [];

        return await this.activeStage.fixture.filter(fixture => fixture.attribute.some(attr => attr.type === 'PAN' || attr.type === 'TILT'));
    }
    getFixtureSettings = async (stageId, fixtureId, setting) => {
        let fx = await this.getLocalSetting(`${stageId}_${fixtureId}`);
        if (fx) {
            return fx[setting] ? fx[setting] : null;
        }
    };
    saveFixtureSettings = async (stageId, fixtureId, setting, value) => {
        try {
            let fx = await this.getLocalSetting(`${stageId}_${fixtureId}`);
            if (!fx) {
                fx = {};
            }
            fx[setting] = value;
            await this.saveLocalSetting(`${stageId}_${fixtureId}`, fx);
        } catch (e) {
            console.log(e);
        }
    };
    getStages = async (forceRefresh = false) => {
        if (!this.stage || forceRefresh) {
            const stage = await this.getUrl(`${this.maestroUrl}api/${this.apiVersion}/output/stage`);

            this.stageId = stage.activeStageId;
            let fixtures = await this.getFixtures(this.stageId);
            this.fixtures = fixtures.fixture;
            this.stage = stage;
            this.groups = fixtures.fixtureGroup;
            this.activeStage = stage.stage.find(ele => ele.id == stage.activeStageId);
            this.activeStage.fixture = fixtures.fixture;
            this.activeStageFixtureGroups = fixtures.fixtureGroup;
            this.saveLocalSetting("activeStage", this.activeStage);
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
    sendRemoteMessage = (type, message) => {
        try {
            chrome.runtime.sendMessage(this.ExtensionId, { type: type, message: message },
                function (response) {
                    return response;
                });
        } catch (e) {
            if (logging)
                console.error(e);
        }
    }
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
    findByText = (needle, query = "*", haystack = document) => {
        return [...haystack.querySelectorAll(query)].filter(val =>
            Array.from(val.childNodes).some(({ nodeType, textContent, parentElement }) =>
                nodeType === 3 && textContent.includes(needle) && !(parentElement.tagName === 'SCRIPT')
            )
        );
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