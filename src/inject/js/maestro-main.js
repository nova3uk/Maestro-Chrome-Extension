var maestro = maestro || {};

class App {
    constructor(scriptSource, loggingOn = false) {
        if (scriptSource) {
            var src = new URL(scriptSource);
            this.ExtensionId = src.host;
            this.Origin = src.origin;
        }
        if (scriptSource.indexOf("logging=true") !== -1) {
            this.logging = true
            console.log("Maestro Interceptor Logging Enabled!")
        };
        if (scriptSource.indexOf("footer=true") !== -1) {
            this.injectOverlay();
            if (this.logging)
                console.log("Footer loaded.")
        };
        if (scriptSource.indexOf("color=true") !== -1) {
            this.colorPicker = true;
            if (this.logging)
                console.log("Color picker loaded.")
        }
    }

    // Public variables
    logging = false;
    overlay = false;
    colorPicker = false;
    latchedOn = false;
    btnTimer;
    strobeBtn;
    strobeActive = false;
    stageId = null;
    stage = null;
    fixtures = [];
    shutterFixtures = [];
    strobeFixtures = [];
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

    getFilePath = (fileName) => `${this.Origin}/${fileName}`;

    getUrl = async (url) => {
        try {
            const response = await fetch(url);
            const responseJson = await response.json();
            return responseJson;
        } catch (e) {
            if (this.logging)
                console.error("Cannot connect to the API, is Maestro running?", e);
        }
    }
    isNumeric = function (value) {
        return !isNaN(parseFloat(value)) && isFinite(value);
    };
    getQueryStringParameter = function (querystring = window.Location.search, key) {
        const urlParams = new URLSearchParams(querystring);
        return urlParams.get(key);
    };
    clearStage = () => {
        this.strobeBtn = null;
        this.stageId = null;
        this.stage = null;
        this.fixtures = [];
        this.shutterFixtures = [];
    };
    getStage = async () => {
        this.clearStage();
        const stage = await this.getUrl("/api/v1/output/stage");
        this.stageId = stage.activeStageId;
        this.fixtures = stage.stage.find(ele => ele.id == stage.activeStageId).fixture;

        //Shutter channel based Strobing Fixtures with a Colorwheel
        //we do not need to worry about max dimmer or setting to whiter as the maestro does this already
        this.shutterFixtures = this.fixtures.filter(fixture =>
            fixture.enabled &&
            ["SHUTTER", "COLOR_WHEEL"].every(type =>
                fixture.attribute.some(attr => attr.type === type)
            )
        );

        //Strobe channel based Fixtures
        this.strobeFixtures = this.fixtures.filter(fixture =>
            fixture.enabled &&
            ["STROBE"].every(type =>
                fixture.attribute.some(attr => attr.type === type)
            )
        );
    };
    getSystemInfo = async () => {
        const info = await this.getUrl("/api/v1/system_info");
        return info;
    }
    setColorAll = async (onOrOff, color = [...this.allColors]) => {
        const delay = ms => new Promise(res => setTimeout(res, ms));
        for (let fixture of this.fixtures) {
            for (let attr in fixture.attribute) {
                if (this.allColors.includes(fixture.attribute[attr].type)) {
                    if (onOrOff == 1) {
                        if (fixture.attribute[attr].type == color) {
                            await this.updateAttributeRange(fixture.id, attr, this.maxDmxVal, this.maxDmxVal);
                        } else {
                            await this.updateAttributeRange(fixture.id, attr, this.minDmxVal, this.minDmxVal);
                        }
                    } else {
                        await this.updateAttributeRange(fixture.id, attr, this.minDmxVal, this.maxDmxVal);
                    }
                    //await delay(50);
                }
            }
        }
    };
    setStrobe = async (onOrOff, latched = false) => {
        if (this.strobeActive == false && onOrOff == false) return;
        if (this.latchedOn == true && onOrOff == false) return;

        this.strobeActive = onOrOff;

        this.latchedOn = latched;

        const allFixtures = [
            { fixtures: this.shutterFixtures, attributeType: "SHUTTER" },
            { fixtures: this.strobeFixtures, attributeType: "STROBE" }
        ];

        for (let { fixtures, attributeType } of allFixtures) {
            try {
                for (let fixture of fixtures) {
                    try {
                        let [fixtureName, dmxValues] = fixture.name.split("_");
                        let [normalValue, strobeValue] = dmxValues ? dmxValues.split(":") : [];

                        if (!dmxValues || fixtureName.toUpperCase().includes("IGNORE")) continue;

                        if (!this.isNumeric(normalValue) || !this.isNumeric(strobeValue)) {
                            throw new Error(`Fixture ${fixture.name} normalValue and strobeValue must be numeric.`);
                        }

                        let attributeId = fixture.attribute.findIndex(attr => attr.type === attributeType);
                        if (!attributeId) continue;

                        let setValue = onOrOff == 1 ? strobeValue : normalValue;

                        this.updateAttribute(fixture.id, attributeId, setValue);

                        if (this.logging)
                            console.log(`Fixture ${fixture.name}, attribue ${attributeId} set to ${setValue}`);
                    } catch (e) {
                        if (this.logging)
                            console.log("Error setting strobe:", e);
                    }
                }
            } catch (e) {
                if (this.logging)
                    console.error("Error setting strobe:", e);
            }
        }
    };
    updateAttributeRange = async (fixtureId, attributeId, lowValue, highValue) => {
        let url = `/api/v1/output/stage/${this.stageId}/fixture/${fixtureId}/attribute/${attributeId}`;

        let options = {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "attribute": {
                    "range": {
                        "lowValue": lowValue, "highValue": highValue
                    }
                }
            })
        };
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            return response.json();
        } catch (error) {
            if (this.logging)
                console.error('Fatal error updating fixture data:', error);
        }
    };
    updateAttribute = async (fixtureId, attributeId, value) => {
        let url = `/api/v1/output/stage/${this.stageId}/fixture/${fixtureId}/attribute/${attributeId}`;

        let options = {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "attribute": {
                    "staticValue": {
                        "value": value
                    }
                }
            })
        };

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            return response.json();
        } catch (error) {
            if (this.logging)
                console.error('Fatal error updating fixture data:', error);
        }
    };

    manualOverride = async (mode, onOrOff) => {
        let url = 'api/v1/global/manual_override';

        let options = {
            method: onOrOff == true ? 'PUT' : 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "mode": mode.toUpperCase()
            })
        };

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }

            //now set manual strobes
            if (mode == "STROBE_ON") {
                this.latchedOn = onOrOff;
                this.setStrobe(onOrOff, true)
            } else {
                this.latchedOn = false;
                this.setStrobe(false);
            }

            if (this.logging)
                console.log(`Manual override ${mode} set to ${onOrOff}`);
        } catch (error) {
            if (this.logging)
                console.error('Fatal error sending manual overide:', error);
        }
    };


    //the document is using dynamic css and labels, without ids.
    //so its required to search for the button by text
    findByText = (needle, query = "*", haystack = document) => {
        return [...haystack.querySelectorAll(query)].filter(val =>
            Array.from(val.childNodes).some(({ nodeType, textContent, parentElement }) =>
                nodeType === 3 && textContent.includes(needle) && !(parentElement.tagName === 'SCRIPT')
            )
        );
    };
    bindStrobeButton = () => {
        try {
            this.pageObserver = new MutationObserver((mutations) => {
                let strobeBtn = this.findByText('Strobe', 'button')[0];

                if (strobeBtn && !strobeBtn.mousedownEventAdded) {
                    strobeBtn.addEventListener('mousedown', () => this.setStrobe(true, false), false);
                    strobeBtn.mousedownEventAdded = true;
                    if (this.logging) console.log('Strobe button found.');
                }
                if (!document.mouseupEventAdded) {
                    document.addEventListener('mouseup', () => this.setStrobe(false), false);
                    document.mouseupEventAdded = true;
                    if (this.logging) console.log('Document mouseup event added.');
                }
            });

            this.pageObserver.observe(document, { childList: true, subtree: true });

            if (this.logging)
                console.log("Maestro Interceptor Loaded OK!");
        } catch (e) {
            if (this.logging)
                console.error("Could not bind Strobe Button onClick event!")
        }
    };
    startTimer = () => {
        this.btnTimer = setTimeout(this.startUp, 1000);
    };
    clearTimer = () => {
        clearTimeout(this.btnTimer);
    };
    injectOverlay = function () {
        var s = document.createElement("script");
        s.src = this.getFilePath("src/inject/js/overlay.js");
        (document.head || document.documentElement).appendChild(s);
    };
    startUp = async () => {
        try {
            this.getStage();
            this.bindStrobeButton();
            this.reloadMonitor();
        } catch (e) {
            this.startTimer();
            if (this.logging)
                console.error(e, "Error loading stage!");
        }
    };
    reloadMonitor = function () {
        if (window.maestroOnReloadMonitor) return;

        window.onload = function () {
            if (isPageReloaded()) {
                this.startUp();
            }
        };
        window.maestroOnReloadMonitor = true;
    }
    isPageReloaded = function () {
        var perfEntries = performance.getEntriesByType("navigation");

        for (var i = 0; i < perfEntries.length; i++) {
            if (perfEntries[i].type === "reload") {
                return true;
            }
        }
        return false;
    }
    clearCheckboxes = function () {
        if (overlayApp && overlayApp.clearCheckboxes)
            overlayApp.clearCheckboxes();
    }
}

// Initialize & assign to global object
maestro.App = new App(document.currentScript.src);
maestro.App.startUp();