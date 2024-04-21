"use strict";
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
        this.init();
    }

    strobeParams = [];
    getAutoParams;
    autoStrobeOnPeakTimer = null;
    autoEffectsOnPeakTimer = null;
    autoFogOnPeakTimer = null;
    autoFogOnTimerTimer = null;
    autoFogTimer = null;
    autoFogInterval = null;
    autoFogDuration = null;
    activePeakStrobeLastExecution = null;
    activePeakEffectsLastExecution = null;
    activePeakFogLastExecution = null;
    activeFogOnTimerLastExecution = null;

    init = async () => {
        try {
            this.messageHdlr();
            this.getIgnoreFixtures();
            this.getAutoParams();
            this.getStage();
            this.bindStrobeButton();
            this.reloadMonitor();
        } catch (e) {
            if (this.logging)
                console.error(e, "Error loading stage!");
        }
    };
    messageHdlr = async () => {
        try {
            await chrome.runtime.sendMessage(this.ExtensionId, { ping: true },
                (response) => {
                    if (response) {
                        if (maestro.App.logging)
                            console.log(response, "Ping");
                    }
                });
        } catch (e) {
            if (this.logging)
                console.error(e, "Error loading messageHdlr.");
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
        this.getStrobeParams();

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
                    const rangeValue = onOrOff === 1 ? (fixture.attribute[attr].type === color ? this.maxDmxVal : this.minDmxVal) : (onOrOff === 0 ? this.minDmxVal : this.maxDmxVal);
                    await this.updateAttributeRange(fixture.id, attr, rangeValue, rangeValue);
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

        await this.getStrobeParams();

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
    getStrobeParams = async () => {
        // get strobe fixtures from backend
        await chrome.runtime.sendMessage(this.ExtensionId, { getStrobeFixtures: true },
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
    reloadMonitor = () => {
        if (window.maestroOnReloadMonitor) return;

        window.onload = function () {
            if (maestro.App.isPageReloaded()) {
                maestro.App.init();
            }
        };
        window.maestroOnReloadMonitor = true;
    };
    isPageReloaded = () => {
        var perfEntries = performance.getEntriesByType("navigation");

        for (var i = 0; i < perfEntries.length; i++) {
            if (perfEntries[i].type === "reload") {
                return true;
            }
        }
        return false;
    };
    getAutoParams = async () => {
        // get autofog params from backend
        try {
            setInterval(() => {
                chrome.runtime.sendMessage(this.ExtensionId, { getAutoProgramParams: true },
                    function (response) {
                        if (response) {
                            //maestro.App.getAutoParams = { ...maestro.App.getAutoParams, ...response };
                            maestro.App.getAutoParams = response;
                            maestro.App.getAutoParams.activePeakFogMinimumDelay = maestro.App.getAutoParams.autoFogOnActivityPeakInterval * 60000;
                            maestro.App.getAutoParams.activePeakStrobeMinimumDelay = maestro.App.getAutoParams.autoStrobeOnActivityPeakInterval * 60000;
                            maestro.App.getAutoParams.activePeakEffectsMinimumDelay = maestro.App.getAutoParams.autoEffectsOnActivityPeakInterval * 60000;

                            Object.freeze(maestro.App.getAutoParams);

                            if (maestro.App.getAutoParams.autoFogEnabled || maestro.App.getAutoParams.autoEffectsEnabled || maestro.App.getAutoParams.autoStrobeEnabled)
                                maestro.App.switchAutoPrograms();

                            if (this.logging)
                                console.log("Auto params loaded.");
                        }
                    });
                maestro.OverlayApp.autoEffectsActive();
            }, 3000);
        } catch (e) {
            if (this.logging)
                console.error(e, "Error loading auto params!");
        }
    };
    switchAutoPrograms = () => {
        let autoFogEnabled = this.getAutoParams.autoFogEnabled;
        let autoFogOnActivityPeak = this.getAutoParams.autoFogOnActivityPeak;
        let autoFogOnTimer = this.getAutoParams.autoFogOnTimer;
        let autoEffectsEnabled = this.getAutoParams.autoEffectsEnabled;
        let autoStrobeEnabled = this.getAutoParams.autoStrobeEnabled;

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
                this.autoFogOnTimer();
            };
        };
    };
    autoStrobeOnPeak = async (level) => {
        if (!this.getAutoParams.autoStrobeEnabled) {
            return;
        }

        if (!Number(maestro.App.getAutoParams.autoStrobeOnActivityPeakPercent) > 0)
            maestro.App.getAutoParams.autoStrobeOnActivityPeakPercent = 95;
        if (!Number(maestro.App.getAutoParams.autoStrobeOnActivityPeakDuration) > 0)
            maestro.App.getAutoParams.autoStrobeOnActivityPeakDuration = 2;
        if (!Number(maestro.App.getAutoParams.autoStrobeOnActivityPeakInterval) > 0)
            maestro.App.getAutoParams.autoStrobeOnActivityPeakInterval = 2;

        //debounce - no reactivation before minimum delay
        if (!this.activePeakStrobeLastExecution)
            this.activePeakStrobeLastExecution = await maestro.Globals.getRemoteSetting("activePeakStrobeLastExecution") || 0;

        if ((this.activePeakStrobeLastExecution + maestro.App.getAutoParams.activePeakStrobeMinimumDelay) > Date.now()) return;

        let autoStrobeOnActivityPeakPercent = maestro.App.getAutoParams.autoStrobeOnActivityPeakPercent;
        let autoStrobeOnActivityPeakDuration = (maestro.App.getAutoParams.autoStrobeOnActivityPeakDuration || 2) * 1000;

        if (level >= autoStrobeOnActivityPeakPercent) {
            if (this.autoStrobeOnPeakTimer) return;

            //activate Strobe
            this.activePeakStrobeLastExecution = Date.now();
            await maestro.Globals.saveRemoteSetting("activePeakStrobeLastExecution", this.activePeakStrobeLastExecution);

            await maestro.OverlayApp.checkBoxClick("STROBE_ON", true, 'div_maestro_ext_strobe');

            this.autoStrobeOnPeakTimer = setTimeout(async () => {
                //deactivate Strobe
                await maestro.OverlayApp.checkBoxClick("STROBE_ON", false, 'div_maestro_ext_strobe').then(() => {
                    this.autoStrobeOnPeakTimer = null;
                });

                if (maestro.App.logging)
                    console.log('Auto Strobe Finished!');
            }, autoStrobeOnActivityPeakDuration);

            if (this.logging)
                console.log('Auto Strobe Started!');
        }
    };
    autoEffectsOnPeak = async (level) => {
        if (!this.getAutoParams.autoEffectsEnabled) {
            return;
        }

        if (!Number(maestro.App.getAutoParams.autoEffectsOnActivityPeakPercent) > 0)
            this.getAutoParams.autoEffectsOnActivityPeakPercent = 95;
        if (!Number(maestro.App.getAutoParams.autoEffectsOnActivityPeakDuration) > 0)
            this.getAutoParams.autoEffectsOnActivityPeakDuration = 2;
        if (!Number(maestro.App.getAutoParams.autoEffectsOnActivityPeakInterval) > 0)
            this.getAutoParams.autoEffectsOnActivityPeakInterval = 2;

        //debounce - no reactivation before minimum delay
        if (!this.activePeakEffectsLastExecution)
            this.activePeakEffectsLastExecution = await maestro.Globals.getRemoteSetting("activePeakEffectsLastExecution") || 0;

        if ((this.activePeakEffectsLastExecution + this.getAutoParams.activePeakEffectsMinimumDelay) > Date.now()) return;

        let autoEffectsOnActivityPeakPercent = this.getAutoParams.autoEffectsOnActivityPeakPercent;
        let autoEffectsOnActivityPeakDuration = this.getAutoParams.autoEffectsOnActivityPeakDuration * 1000;

        if (level >= autoEffectsOnActivityPeakPercent) {
            if (this.autoEffectsOnPeakTimer) return;

            //activate Effect
            this.activePeakEffectsLastExecution = Date.now();
            await maestro.Globals.saveRemoteSetting("activePeakEffectsLastExecution", this.activePeakEffectsLastExecution);
            await maestro.OverlayApp.checkBoxClick("EFFECT_ON", true, 'div_maestro_ext_effect');

            this.autoEffectsOnPeakTimer = setTimeout(async () => {
                //deactivate Effect
                await maestro.OverlayApp.checkBoxClick("EFFECT_ON", false, 'div_maestro_ext_effect').then(() => {
                    this.autoEffectsOnPeakTimer = null;
                });

                if (maestro.App.logging)
                    console.log('Auto Effects Finished!');
            }, autoEffectsOnActivityPeakDuration);

            if (this.logging)
                console.log('Auto Effects Started!');
        }
    };
    autoFogOnTimer = () => {
        if (!this.getAutoParams.autoFogEnabled || !this.getAutoParams.autoFogOnTimer) {
            return;
        }

        if (!Number(this.getAutoParams.fogTimer) > 0)
            this.getAutoParams.fogTimer = 10;
        if (!Number(this.getAutoParams.fogTimerDuration) > 0)
            this.getAutoParams.fogTimerDuration = 3;

        //from minutes to ms
        let frequency = this.getAutoParams.fogTimer * 60000;
        let duration = this.getAutoParams.fogTimerDuration * 1000;

        //already running
        if (this.autoFogTimer) return;

        try {
            this.autoFogTimer = setInterval(async () => {
                //check its still active...
                if (!this.getAutoParams.autoFogEnabled || !this.getAutoParams.autoFogOnTimer) {
                    clearInterval(this.autoFogTimer);
                    this.autoFogTimer = null;
                    return;
                }

                if (this.autoFogInterval || this.autoFogDuration) {
                    if (this.autoFogInterval !== frequency || this.autoFogDuration !== duration) {
                        // time or duration has been modified, kill and restart the timer
                        clearInterval(this.autoFogTimer);
                        this.autoFogTimer = null;
                    }
                }
                this.autoFogInterval = frequency;
                this.autoFogDuration = duration;

                //debounce - no reactivation before minimum delay
                //we also check fog on timer - as we don't want to execute this if the timer has run also within the time limit
                if (!this.activePeakFogLastExecution)
                    this.activePeakFogLastExecution = await maestro.Globals.getRemoteSetting("activePeakFogLastExecution") || 0;

                if (!this.activeFogOnTimerLastExecution)
                    this.activeFogOnTimerLastExecution = await maestro.Globals.getRemoteSetting("activeFogOnTimerLastExecution") || 0;

                if ((this.activePeakFogLastExecution + this.autoFogInterval) > Date.now()) return;
                if ((this.activeFogOnTimerLastExecution + this.autoFogInterval) > Date.now()) return;

                this.activeFogOnTimerLastExecution = Date.now();
                await maestro.Globals.saveRemoteSetting("activeFogOnTimerLastExecution", this.activeFogOnTimerLastExecution);

                //activate fog
                await maestro.OverlayApp.checkBoxClick("FOG_ON", true, 'div_maestro_ext_fog');

                if (this.logging)
                    console.log('Auto FogOnTimer Started!');

                this.autoFogOnTimerTimer = setTimeout(() => {
                    //deactivate fog
                    maestro.OverlayApp.checkBoxClick("FOG_ON", false, 'div_maestro_ext_fog').then(() => {
                        this.autoFogOnTimerTimer = null;
                    });

                    if (maestro.App.logging)
                        console.log('Auto FogOnTimer Finished!');
                }, duration);
            }, frequency);
        } catch (e) {
            if (this.logging)
                console.error('Fatal error starting auto fog timer:', e);
        }
    };
    autoFogOnPeak = async (level) => {

        if (!this.getAutoParams.autoFogEnabled || !this.getAutoParams.autoFogOnActivityPeak) {
            return;
        }
        try {
            //local settings
            if (!Number(this.getAutoParams.autoFogOnActivityPeakPercent) > 0)
                this.getAutoParams.autoFogOnActivityPeakPercent = 95;
            if (!Number(this.getAutoParams.autoFogOnActivityPeakDuration) > 0)
                this.getAutoParams.autoFogOnActivityPeakDuration = 3;
            if (!Number(this.getAutoParams.autoFogOnActivityPeakInterval) > 0)
                this.getAutoParams.autoFogOnActivityPeakInterval = 2;

            //debounce - no reactivation before minimum delay
            //we also check fog on timer - as we don't want to execute this if the timer has run also within the time limit
            if (!this.activePeakFogLastExecution)
                this.activePeakFogLastExecution = await maestro.Globals.getRemoteSetting("activePeakFogLastExecution") || 0;

            if (!this.activeFogOnTimerLastExecution)
                this.activeFogOnTimerLastExecution = await maestro.Globals.getRemoteSetting("activeFogOnTimerLastExecution") || 0;

            if ((this.activePeakFogLastExecution + this.getAutoParams.activePeakFogMinimumDelay) > Date.now()) return;
            if ((this.activeFogOnTimerLastExecution + this.getAutoParams.activePeakFogMinimumDelay) > Date.now()) return;

            let autoFogOnActivityPeakPercent = this.getAutoParams.autoFogOnActivityPeakPercent;
            let autoFogOnActivityPeakDuration = this.getAutoParams.autoFogOnActivityPeakDuration * 1000;

            if (level >= autoFogOnActivityPeakPercent) {
                if (this.autoFogOnPeakTimer) return;

                //activate fog
                this.activePeakFogLastExecution = Date.now();
                await maestro.Globals.saveRemoteSetting("activePeakFogLastExecution", this.activePeakFogLastExecution);

                await maestro.OverlayApp.checkBoxClick("FOG_ON", true, 'div_maestro_ext_fog');

                this.autoFogOnPeakTimer = setTimeout(async () => {
                    //deactivate fog
                    await maestro.OverlayApp.checkBoxClick("FOG_ON", false, 'div_maestro_ext_fog').then(() => {
                        this.autoFogOnPeakTimer = null;
                    });

                    if (this.logging)
                        console.log('Auto FogOnPeak Finished!');
                }, autoFogOnActivityPeakDuration);

                if (this.logging)
                    console.log('Auto FogOnPeak Started!');
            }
        } catch (e) {
            if (this.logging)
                console.error('Fatal error starting auto fog on peak:', e);
        }
    }
};

// Initialize & assign to global object
maestro.App = new App(document.currentScript.src);