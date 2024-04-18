var maestro = maestro || {};

class App extends Globals {
    constructor(scriptSource, loggingOn = false) {
        super();
        this.maestroUrl = (document.location.origin).endsWith("/") ? document.location.origin : document.location.origin + "/";
        this.maestroHost = new URL(this.maestroUrl).host;

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
        };
        if (scriptSource.indexOf("blinder=true") !== -1) {
            this.strobeAt100Percent = true;
            if (this.logging)
                console.log("Blinder toggle active.")
        };
        if (scriptSource.indexOf("autofog=true") !== -1) {
            this.autoFog = true;
            if (this.logging)
                console.log("AutoFog toggle active.")
        };
    }
    strobeParams;
    getAutoParams;
    startUp = async () => {
        try {
            this.getStrobeParams();
            this.getIgnoreFixtures();
            this.getAutoParams();
            this.getStage();
            this.bindStrobeButton();
            this.reloadMonitor();
        } catch (e) {
            this.startTimer();
            if (this.logging)
                console.error(e, "Error loading stage!");
        }
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
        const stage = await this.getUrl(`/api/${this.apiVersion}/output/stage`);
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
    setColorAll = async (onOrOff, color = [...this.allColors]) => {
        //const delay = ms => new Promise(res => setTimeout(res, ms));
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
                }
            }
        }
    };
    setStrobe = async (onOrOff, latched = false) => {
        if (this.strobeActive == false && onOrOff == false) return;
        if (this.latchedOn == true && onOrOff == false) return;

        //no fixtures to strobe
        if (this.strobeParams.length == 0)
            return;

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
                        let normalValue = 0;
                        let strobeValue = 0;
                        let ignore = false;

                        for (let i = 0; i < this.ignoreFixtures.length; i++) {
                            if (this.ignoreFixtures[i]["fixture_ignore_" + fixture.id] != null) {
                                ignore = true;
                                break;
                            }
                        }
                        if (ignore) continue;

                        let paramsFound = false
                        for (let i = 0; i < this.strobeParams.length; i++) {
                            if (this.strobeParams[i]["strobe_" + fixture.id] != null) {
                                normalValue = this.strobeParams[i]["strobe_" + fixture.id].shutter;
                                strobeValue = this.strobeParams[i]["strobe_" + fixture.id].strobe;
                                paramsFound = true;
                                break;
                            }
                        }

                        //no params set for this fixture, skip
                        if (!paramsFound) continue;

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
        let url = `/api/${this.apiVersion}/output/stage/${this.stageId}/fixture/${fixtureId}/attribute/${attributeId}`;

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
        let url = `/api/${this.apiVersion}/output/stage/${this.stageId}/fixture/${fixtureId}/attribute/${attributeId}`;

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
        let url = `api/${this.apiVersion}/global/manual_override`;

        var dimmer = 0;
        if (this.strobeAt100Percent) {
            dimmer = 1;
        } else {
            let brightness = await this.getBrightness();
            dimmer = brightness.value;
        }
        let options = {
            method: onOrOff == true ? 'PUT' : 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "highValue": dimmer,
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
    getStrobeParams = async () => {
        // get strobe fixtures from backend
        chrome.runtime.sendMessage(this.ExtensionId, { getStrobeFixtures: true },
            function (response) {
                if (response) {
                    maestro.App.strobeParams = response;
                    if (this.logging)
                        console.log("Strobe fixtures loaded.");
                }
            });
    };
    getIgnoreFixtures = async () => {
        // get strobe fixtures from backend
        chrome.runtime.sendMessage(this.ExtensionId, { getIgnoreFixtures: true },
            function (response) {
                if (response) {
                    maestro.App.ignoreFixtures = response;
                    if (this.logging)
                        console.log("Ignore fixtures loaded.");
                }
            });
    };
    getAutoParams = async () => {
        // get autofog params from backend
        setInterval(() => {
            chrome.runtime.sendMessage(this.ExtensionId, { getAutoProgramParams: true },
                function (response) {
                    if (response) {
                        maestro.App.getAutoParams = { ...maestro.App.getAutoParams, ...response };

                        maestro.App.getAutoParams.activityPeakFogMinimumDelay = maestro.App.getAutoParams.autoFogOnActivityPeakInterval * 60000;
                        maestro.App.getAutoParams.activityPeakStrobeMinimumDelay = maestro.App.getAutoParams.autoStrobeOnActivityPeakInterval * 60000;
                        maestro.App.getAutoParams.activityPeakEffectsMinimumDelay = maestro.App.getAutoParams.autoEffectsOnActivityPeakInterval * 60000;

                        if (maestro.App.getAutoParams.autoFogEnabled || maestro.App.getAutoParams.autoEffectsEnabled || maestro.App.getAutoParams.autoStrobeEnabled)
                            maestro.App.switchAutoPrograms();

                        if (this.logging)
                            console.log("Auto params loaded.");
                    }
                });
        }, 3000);
    }
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
    switchAutoPrograms = async () => {
        let autoFogOnActivityPeak = this.getAutoParams.autoFogOnActivityPeak;
        let autoFogOnTimer = this.getAutoParams.autoFogOnTimer;
        let fogTimer = this.getAutoParams.fogTimer;
        let fogTimerDuration = this.getAutoParams.fogTimerDuration;
        let autoEffectsEnabled = this.getAutoParams.autoEffectsEnabled;
        let autoStrobeEnabled = this.getAutoParams.autoStrobeEnabled;
        let autoFogEnabled = this.getAutoParams.autoFogEnabled;

        if (autoEffectsEnabled) {
            var index = maestro.Globals.arrActivityLevelCallbacks.indexOf(this.autoEffectsOnPeak);
            if (index == -1)
                maestro.Globals.arrActivityLevelCallbacks.push(this.autoEffectsOnPeak);
        } else {
            //remove the callback as its switched off.
            var index = maestro.Globals.arrActivityLevelCallbacks.indexOf(this.autoEffectsOnPeak);
            if (index !== -1)
                maestro.Globals.arrActivityLevelCallbacks.splice(this.autoEffectsOnPeak);
        }

        if (autoStrobeEnabled) {
            var index = maestro.Globals.arrActivityLevelCallbacks.indexOf(this.autoStrobeOnPeak);
            if (index == -1)
                maestro.Globals.arrActivityLevelCallbacks.push(this.autoStrobeOnPeak);
        } else {
            //remove the callback as its switched off.
            var index = maestro.Globals.arrActivityLevelCallbacks.indexOf(this.autoStrobeOnPeak);
            if (index !== -1)
                maestro.Globals.arrActivityLevelCallbacks.splice(this.autoStrobeOnPeak);
        }

        if (autoFogEnabled) {
            if (autoFogOnActivityPeak) {
                var index = maestro.Globals.arrActivityLevelCallbacks.indexOf(this.autoFogOnPeak);
                if (index == -1)
                    maestro.Globals.arrActivityLevelCallbacks.push(this.autoFogOnPeak);
            } else {
                //remove the callback as its switched off.
                var index = maestro.Globals.arrActivityLevelCallbacks.indexOf(this.autoFogOnPeak);
                if (index !== -1)
                    maestro.Globals.arrActivityLevelCallbacks.splice(this.autoFogOnPeak);
            }

            if (autoFogOnTimer) {
                if (this.autoFogTimer) {
                    if (this.getAutoParams.activeFogTimer != fogTimer || this.getAutoParams.activeFogTimerDuration != fogTimerDuration) {
                        //time or duration has been modified, kill and restart the timer
                        clearInterval(this.autoFogTimer);
                        this.autoFogTimer = null;

                        this.autoFogOnTimer();
                    }
                } else {
                    this.autoFogOnTimer();
                }
            }
        } else {
            clearInterval(this.autoFogTimer);
        }
    };
    autoStrobeOnPeak = (level) => {
        if (!this.getAutoParams.autoStrobeEnabled) {
            return;
        }

        //no reactivation before minimum delay
        if ((maestro.App.getAutoParams.activityPeakStrobeLastExecution + maestro.App.getAutoParams.activityPeakStrobeMinimumDelay) > Date.now()) return;

        let autoStrobeOnActivityPeakPercent = maestro.App.getAutoParams.autoStrobeOnActivityPeakPercent;
        let autoStrobeOnActivityPeakDuration = maestro.App.getAutoParams.autoStrobeOnActivityPeakDuration * 1000;

        if (level >= autoStrobeOnActivityPeakPercent) {
            if (this.autoStrobeOnPeakTimer) return;

            //activate Strobe
            maestro.OverlayApp.checkBoxClick("STROBE_ON", true, 'div_maestro_ext_strobe');

            maestro.App.getAutoParams.activityPeakStrobeLastExecution = Date.now();
            this.autoStrobeOnPeakTimer = setTimeout(() => {
                //deactivate Strobe
                maestro.OverlayApp.checkBoxClick("STROBE_ON", false, 'div_maestro_ext_strobe');
                this.autoStrobeOnPeakTimer = null;
            }, autoStrobeOnActivityPeakDuration);
        }
    };
    autoEffectsOnPeak = (level) => {
        if (!this.getAutoParams.autoEffectsEnabled) {
            return;
        }

        //no reactivation before minimum delay
        if ((maestro.App.getAutoParams.activityPeakEffectsLastExecution + maestro.App.getAutoParams.activityPeakEffectsMinimumDelay) > Date.now()) return;

        let autoEffectsOnActivityPeakPercent = maestro.App.getAutoParams.autoEffectsOnActivityPeakPercent;
        let autoEffectsOnActivityPeakDuration = maestro.App.getAutoParams.autoEffectsOnActivityPeakDuration * 1000;

        if (level >= autoEffectsOnActivityPeakPercent) {
            if (this.autoEffectsOnPeakTimer) return;

            //activate Effect
            maestro.OverlayApp.checkBoxClick("EFFECT_ON", true, 'div_maestro_ext_effect');

            maestro.App.getAutoParams.activityPeakEffectsLastExecution = Date.now();
            this.autoEffectsOnPeakTimer = setTimeout(() => {
                //deactivate Effect
                maestro.OverlayApp.checkBoxClick("EFFECT_ON", false, 'div_maestro_ext_effect');
                this.autoEffectsOnPeakTimer = null;
            }, autoEffectsOnActivityPeakDuration);
        }
    }
    autoFogOnTimer = async () => {
        //from minutes to ms
        let frequency = this.getAutoParams.fogTimer * 60000;
        let duration = this.getAutoParams.fogTimerDuration * 1000;

        this.getAutoParams.activeFogTimer = this.getAutoParams.fogTimer;
        this.getAutoParams.activeFogTimerDuration = this.getAutoParams.fogTimerDuration;

        this.autoFogTimer = setInterval(async () => {
            //check its still active...
            if (!this.getAutoParams.autoFogEnabled || !this.getAutoParams.autoFogOnTimer) {
                clearInterval(this.autoFogTimer);
                this.autoFogTimer = null;
                return;
            }

            //activate fog
            maestro.OverlayApp.checkBoxClick("FOG_ON", true, 'div_maestro_ext_fog');
            setTimeout(() => {
                //deactivate fog
                maestro.OverlayApp.checkBoxClick("FOG_ON", false, 'div_maestro_ext_fog');
            }, duration);
        }, frequency);
    };
    autoFogOnPeak = (level) => {

        if (!this.getAutoParams.autoFogEnabled || !this.getAutoParams.autoFogOnActivityPeak) {
            return;
        }
        //no reactivation before minimum delay
        if ((maestro.App.getAutoParams.activityPeakFogLastExecution + maestro.App.getAutoParams.activityPeakFogMinimumDelay) > Date.now()) return;

        let autoFogOnActivityPeakPercent = maestro.App.getAutoParams.autoFogOnActivityPeakPercent;
        let autoFogOnActivityPeakDuration = maestro.App.getAutoParams.autoFogOnActivityPeakDuration * 1000;

        if (level >= autoFogOnActivityPeakPercent) {
            if (this.autoFogOnPeakTimer) return;

            //activate fog
            maestro.OverlayApp.checkBoxClick("FOG_ON", true, 'div_maestro_ext_fog');

            maestro.App.getAutoParams.activityPeakFogLastExecution = Date.now();
            this.autoFogOnPeakTimer = setTimeout(() => {
                //deactivate fog
                maestro.OverlayApp.checkBoxClick("FOG_ON", false, 'div_maestro_ext_fog');
                this.autoFogOnPeakTimer = null;
            }, autoFogOnActivityPeakDuration);
        }
    };
}

// Initialize & assign to global object
maestro.App = new App(document.currentScript.src);
maestro.App.startUp();