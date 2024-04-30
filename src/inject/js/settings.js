"use strict";
var maestro = maestro || {};
class SettingsApp extends Globals {
    constructor(scriptSource, loggingOn = false) {
        super()
        this.scriptSource = scriptSource;
        this.loggingOn = loggingOn;
        this.maestroUrl = this.parseMaestroUrl();
    }

    activeStageId;
    ignoredFixtures = [];
    holdFire = false;
    autoMacrosTimer = null;
    storageWatcher = null;
    autoMacroRoutineRunning = false;

    init = async () => {
        this.version = await this.getLocalSetting("version");
        this.logging = await this.getSetting("loggingToggle");

        document.getElementById('versionNumber').innerText = `${this.version ? "v" + this.version : ""}`

        await this.getStages();
        this.activeStageId = this.stageId;

        this.controlPageLink();
        this.injectEffects();
        this.stageTable();
        this.fixtureTable(this.activeStage, this.activeStageFixtureGroups);
        this.bindMacroBtn();
        this.cuesTable();
        this.togglesTable(this.activeStage, this.activeStageFixtureGroups);
        this.dimmerTable(this.activeStage, this.activeStageFixtureGroups);
        this.focusTable(this.activeStage, this.activeStageFixtureGroups);
        this.loadBackupRestoreBtns();
        this.bindAutoMacros();
        this.bindAutoFog();
        this.bindAutoEffects();
        this.tabObserver();
        this.autoMacrosWatcher();
        this.bindEffects();

        await this.loadMacros(async (macros) => {
            if (macros) {
                await maestro.SettingsApp.macroTable(macros);
                await maestro.SettingsApp.checkRunningMacros(macros)
            }
            this.hideLoader();
        });

        setInterval(async () => {
            this.watchForStageChange();
            await this.getBrightness().then(() => {
                let val = Math.floor(this.brightness.value * 255);
                document.getElementById('master_dimmer').value = val;
                maestro.SettingsApp.setDimmerValue(val);
            });
        }, 60000);

        setTimeout(() => {
            var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
            tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl)
            });
        }, 1000);
    };
    injectEffects = () => {
        var s = document.createElement("script");
        s.src = "/src/inject/js/effects.js";
        (document.head || document.documentElement).appendChild(s);
    };
    bindEffects = async () => {
        document.querySelectorAll('[data-type="effectBtn"]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                let table = document.getElementById("effects");
                let inputElements = table.querySelectorAll("input");

                if (e.target.innerText == "Stop") {
                    document.querySelectorAll('[data-type="effectBtn"]').forEach(btn => {
                        if (e.target.id != btn.id) {
                            btn.disabled = false;
                        }
                    });
                    e.target.innerText = "Start";
                    e.target.classList.remove('btn-danger');
                    e.target.classList.add('btn-primary');

                    await this.deleteLocalSetting("activeEffect");

                    function getById(id) {
                        return document.getElementById(id).value;
                    }

                    switch (e.target.id) {
                        case "effectCircle":
                            maestro.Effects.startEffect(e.target.dataset.effect, getById('efCPanStart'), getById('efCTiltStart'), getById('efCDelay'), getById('efCRadius'), getById('efCSteps'), 'stop');
                            break;
                        case "effectCircleFan":
                            maestro.Effects.startEffect(e.target.dataset.effect, getById('efCFPanStart'), getById('efCFTiltStart'), getById('efCFDelay'), getById('efCFRadius'), getById('efCFSteps'), getById('efCFFan'), 'stop');
                            break;
                        case "effectEight":
                            maestro.Effects.startEffect(e.target.dataset.effect, getById('ef8PanStart'), getById('ef8TiltStart'), getById('ef8Delay'), getById('ef8Radius'), getById('ef8Steps'), 'stop');
                            break;
                        case "effectEightFan":
                            maestro.Effects.startEffect(e.target.dataset.effect, getById('ef8FPanStart'), getById('ef8FTiltStart'), getById('ef8FDelay'), getById('ef8FRadius'), getById('ef8FSteps'), getById('ef8FFan'), 'stop');
                            break;
                        case "effectUpDown":
                            maestro.Effects.startEffect(e.target.dataset.effect, getById('efUDTiltStart'), getById('efUDDelay'), getById('efUDRadius'), getById('efUDSteps'), 'stop');
                            break;
                        case "effectLeftRight":
                            maestro.Effects.startEffect(e.target.dataset.effect, getById('efLRPanStart'), getById('efLRDelay'), getById('efLRRadius'), getById('efLRSteps'), 'stop');
                            break;
                    }
                    inputElements.forEach(async input => {
                        input.disabled = false;
                    });
                    return;
                }
                if (e.target.innerText == "Start") {
                    let macros = await this.loadMacros();
                    macros = await macros.filter(macro => macro.macro.stageId == this.stageId);
                    let hasRunningMacro = macros.some(macro => macro.macro.macroRunning);
                    if (hasRunningMacro) {
                        if (!confirm('There are Macros Active, if you start this effect whilst a macro is running which also controls the pan/til on the same fixtures it will cause conflicts.\n\nProceed or cancel?')) {
                            return;
                        }
                    }

                    document.querySelectorAll('[data-type="effectBtn"]').forEach(btn => {
                        if (e.target.id != btn.id) {
                            btn.disabled = true;
                        }
                    });
                    e.target.innerText = "Stop";
                    e.target.classList.remove('btn-primary');
                    e.target.classList.add('btn-danger');

                    await this.saveLocalSetting("activeEffect", e.target.id);

                    function getById(id) {
                        return document.getElementById(id).value;
                    }

                    switch (e.target.id) {
                        case "effectCircle":
                            maestro.Effects.startEffect(e.target.dataset.effect, getById('efCPanStart'), getById('efCTiltStart'), getById('efCDelay'), getById('efCRadius'), getById('efCSteps'), 'start');
                            break;
                        case "effectCircleFan":
                            maestro.Effects.startEffect(e.target.dataset.effect, getById('efCFPanStart'), getById('efCFTiltStart'), getById('efCFDelay'), getById('efCFRadius'), getById('efCFSteps'), getById('efCFFan'), 'start');
                            break;
                        case "effectEight":
                            maestro.Effects.startEffect(e.target.dataset.effect, getById('ef8PanStart'), getById('ef8TiltStart'), getById('ef8Delay'), getById('ef8Radius'), getById('ef8Steps'), 'start');
                            break;
                        case "effectEightFan":
                            maestro.Effects.startEffect(e.target.dataset.effect, getById('ef8FPanStart'), getById('ef8FTiltStart'), getById('ef8FDelay'), getById('ef8FRadius'), getById('ef8FSteps'), getById('ef8FFan'), 'start');
                            break;
                        case "effectUpDown":
                            maestro.Effects.startEffect(e.target.dataset.effect, getById('efUDTiltStart'), getById('efUDDelay'), getById('efUDRadius'), getById('efUDSteps'), 'start');
                            break;
                        case "effectLeftRight":
                            maestro.Effects.startEffect(e.target.dataset.effect, getById('efLRPanStart'), getById('efLRDelay'), getById('efLRRadius'), getById('efLRSteps'), 'start');
                            break;
                    }

                    inputElements.forEach(async input => {
                        input.disabled = true;
                    });
                    return;
                }

            });
        });

        let activeEffect = await this.getLocalSetting("activeEffect");
        let table = document.getElementById("effects");
        let inputElements = table.querySelectorAll("input");
        inputElements.forEach(async input => {
            let s = await this.getLocalSetting(input.id);
            if (s) input.value = s;
            input.addEventListener('change', async (e) => await maestro.SettingsApp.saveLocalSetting(e.target.id, e.target.value));

            if (activeEffect) {
                if (input.id !== activeEffect)
                    input.disabled = true;
            }
        });

        if (activeEffect) {
            document.querySelectorAll('[data-type="effectBtn"]').forEach(btn => {
                if (btn.id != activeEffect) {
                    btn.disabled = true;
                } else {
                    let event = new Event('click');
                    btn.dispatchEvent(event);
                }
            });
        }
    };
    coordFinderSetPosition = async (x, y) => {
        if (!document.getElementById('dot')) return;
        const box = document.getElementById('box');

        const boxWidth = box.offsetWidth;
        const boxHeight = box.offsetHeight;
        const xPixel = (x / 255) * boxWidth;
        const yPixel = (y / 255) * boxHeight;
        document.getElementById('dot').style.left = xPixel + 'px';
        document.getElementById('dot').style.top = yPixel + 'px';
    };
    loadCoordFinder = async (callback = null) => {
        const box = document.getElementById('box');
        const dot = document.getElementById('dot');
        const coordinates = document.getElementById('coordinates');

        dot.addEventListener('mousedown', function (event) {
            event.preventDefault();

            let shiftX = event.clientX - dot.getBoundingClientRect().left;
            let shiftY = event.clientY - dot.getBoundingClientRect().top;

            function onMouseMove(event) {
                let newLeft = event.clientX - shiftX - box.getBoundingClientRect().left;
                let newTop = event.clientY - shiftY - box.getBoundingClientRect().top;

                if (newLeft < 0) newLeft = 0;
                let rightEdge = box.offsetWidth;
                if (newLeft > rightEdge) newLeft = rightEdge;

                if (newTop < 0) newTop = 0;
                let bottomEdge = box.offsetHeight;
                if (newTop > bottomEdge) newTop = bottomEdge;

                dot.style.left = newLeft + 'px';
                dot.style.top = newTop + 'px';

                let scaledX = Math.round(maestro.SettingsApp.getScaledValue(newLeft, 0, box.offsetWidth, 0, 255));
                let scaledY = Math.round(maestro.SettingsApp.getScaledValue(newTop, 0, box.offsetHeight, 0, 255));

                if (typeof callback == "function") {
                    callback(scaledX, scaledY);
                }
            }

            document.addEventListener('mousemove', onMouseMove);

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mouseup', onMouseUp);
        });

        dot.ondragstart = function () {
            return false;
        };
    };
    setDimmerValue = async (value) => {
        let brightness = maestro.SettingsApp.getScaledValue(value, 0, 255, 50, 100) + '%'
        if (value == 0) {
            document.getElementById('masterDimmerVal').innerHTML = `${Math.floor(Math.round((value / 255) * 100))}% <svg xmlns="http://www.w3.org/2000/svg" style="position:relative;top:-2px" width="16" height="16" fill="currentColor" class="bi bi-lightbulb-off-fill" viewBox="0 0 16 16"><path d="M2 6c0-.572.08-1.125.23-1.65l8.558 8.559A.5.5 0 0 1 10.5 13h-5a.5.5 0 0 1-.46-.302l-.761-1.77a2 2 0 0 0-.453-.618A5.98 5.98 0 0 1 2 6m10.303 4.181L3.818 1.697a6 6 0 0 1 8.484 8.484zM5 14.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1l-.224.447a1 1 0 0 1-.894.553H6.618a1 1 0 0 1-.894-.553L5.5 15a.5.5 0 0 1-.5-.5M2.354 1.646a.5.5 0 1 0-.708.708l12 12a.5.5 0 0 0 .708-.708z"/></svg>`;
        } else {
            document.getElementById('masterDimmerVal').innerHTML = `${Math.floor(Math.round((value / 255) * 100))}% <svg xmlns="http://www.w3.org/2000/svg" style="position:relative;top:-2px" width="16" height="16" fill="currentColor" class="bi bi-lightbulb-fill" viewBox="0 0 16 16"><path d="M2 6a6 6 0 1 1 10.174 4.31c-.203.196-.359.4-.453.619l-.762 1.769A.5.5 0 0 1 10.5 13h-5a.5.5 0 0 1-.46-.302l-.761-1.77a2 2 0 0 0-.453-.618A5.98 5.98 0 0 1 2 6m3 8.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1l-.224.447a1 1 0 0 1-.894.553H6.618a1 1 0 0 1-.894-.553L5.5 15a.5.5 0 0 1-.5-.5"/></svg>`;
        }
        document.getElementById('masterDimmerVal').style.filter = "brightness(" + brightness + ")";
    }
    audioLevelHdlr = async (audioLevel) => {
        this.logging = true;

        try {
            let soundLevel = Math.floor(((audioLevel.inputLevel + 37) / 37) * 100);
            let activityLevel = Math.floor((audioLevel.activityLevel * 100));

            if (soundLevel < 5) soundLevel = 0;
            if (activityLevel < 5) activityLevel = 0;

            let macros = await this.loadMacros();
            macros = macros.filter(macro => macro.macro.stageId == this.stageId);
            macros = macros.filter(macro => macro.macro.activityLevelOn !== null || macro.macro.activityLevelOff !== null);

            for (let macro of macros) {
                if (macro.macro.activityLevelOn && (macro.macro.macroRunning == false || !macro.macro.macroRunning)) {
                    if (macro.macro.activityLevelOn !== null && activityLevel >= macro.macro.activityLevelOn) {
                        let autoMacroInterval = await this.getLocalSetting("autoMacroInterval");
                        autoMacroInterval = maestro.SettingsApp.safeMinMax(autoMacroInterval, 1, 30) * 60000;
                        if (macro.macro.autoMacroLastRun + autoMacroInterval > Date.now()) return;

                        await maestro.SettingsApp.applyMacro(macro.macro.name, maestro.SettingsApp.activeStageId, false);

                        if (this.logging)
                            console.log('AutoMacro Applying Macro:', macro.macro.name);
                    }
                }
                if (macro.macro.activityLevelOff) {
                    let autoMacroRunTime = await this.getLocalSetting("autoMacroRunTime");
                    autoMacroRunTime = maestro.SettingsApp.safeMinMax(autoMacroRunTime, 1, 600) * 1000;
                    if (macro.macro.autoMacroLastRun + autoMacroRunTime > Date.now()) return;

                    if (macro.macro.activityLevelOff !== null & macro.macro.activityLevelOff >= activityLevel) {
                        if (macro.macro.macroRunning == true) {
                            document.querySelector(`button[name="btn_clr"][data-id="${macro.macro.name}"]`).click();

                            if (this.logging)
                                console.log('AutoMacro Reverting Macro:', macro.macro.name);
                        }
                    }
                }
            }
        } catch (e) {
            if (this.logging)
                console.error('Error handling audio level:', e);
        } finally {
            this.autoMacroRoutineRunning = false;
        }
    };
    autoMacrosWatcher = () => {
        this.autoMacrosTimer = setInterval(async () => {
            this.getLocalSetting("autoMacrosEnabled").then(async (autoMacrosEnabled) => {
                if (autoMacrosEnabled) {
                    if (!maestro.SettingsApp.storageWatcher)
                        maestro.SettingsApp.storageWatcher = setInterval(async () => {
                            if (this.autoMacroRoutineRunning) return;
                            this.autoMacroRoutineRunning = true;
                            let audioLevel = await this.getLocalSetting("audioLevel");
                            maestro.SettingsApp.audioLevelHdlr(audioLevel)
                        }, 1000);
                } else {
                    clearInterval(maestro.SettingsApp.storageWatcher);
                    maestro.SettingsApp.storageWatcher = null;
                }
            });
        }, 10000);
    }
    showLoader = () => {
        return;
        document.body.style.overflow = "hidden";
        document.getElementById('modalLoading').style.display = "block";
    };
    hideLoader = () => {
        document.getElementById('modalLoading').style.display = "none";
        document.body.style.overflow = "auto";
    };
    tabObserver = () => {
        $('.nav-tabs a').click(function (e) {
            e.preventDefault();
            $(this).tab('show');
        });
        $("ul.nav-tabs > li > a").on("shown.bs.tab", async (e) => {
            var id = $(e.target).attr("href").substr(1);
            await this.saveLocalSetting('activeSettingsTab', id);
        });
        this.getLocalSetting('activeSettingsTab').then(tab => {
            $('.nav-tabs a[href="#' + tab + '"]').tab('show');
        });
    };
    watchOffline = async () => {
        try {
            await this.getShowState();
            $('#modalDown').modal('hide');
            return true;
        } catch (e) {
            if ($('#modalDown').hasClass('show')) {
                return false
            };
            setTimeout(() => {
                $('#modalDown').modal('show');
            }, 500);
            return false;
        }
    };
    cleanupStorage = async () => {
        this.retrieveAllKeys().then(keys => {
            let strobeParams = [];
            for (let key in keys) {
                if (key.includes("strobe_")) {
                    strobeParams.push({ key: key, value: keys[key] });
                }
            }

            strobeParams.forEach(async (param) => {
                let fixtureId = param.key.split('_')[1];
                let stageId = param.value[0].stageId;
            });
        });
    };
    sendReloadStage = async () => {
        let tabId = await this.getLocalSetting("activeTab");
        if (tabId) {
            await chrome.runtime.sendMessage(tabId, { updateStage: true },
                (response) => {
                    if (response) {
                        if (maestro.App.logging)
                            console.log(response, "Sent reload stage message to content script");
                    }
                });
        }
    };
    sendReloadStrobeParams = async () => {
        let tabId = await this.getLocalSetting("activeTab");
        if (tabId) {
            await chrome.runtime.sendMessage(tabId, { updateStrobeParams: true },
                (response) => {
                    if (response) {
                        if (maestro.App.logging)
                            console.log(response, "Sent reload strobe params message to content script");
                    }
                });
        }
    };
    watchForStageChange = async () => {
        try {
            const loadedStage = await this.getUrl(`${this.maestroUrl}api/${this.apiVersion}/output/stage`);
            if (this.activeStageId != loadedStage.activeStageId) {
                document.getElementById('panTiltFinder').style.display = "none";
                $('#modalStageReloaded').modal({ backdrop: 'static', keyboard: false });
                $('#modalStageReloaded').modal('show');

                document.getElementById('btnReloadPage').addEventListener('click', function () {
                    window.location.reload();
                });
            }
        } catch (e) {
            if (this.logging)
                console.error('Error watching for stage change:', e);
        }
    };
    loadBackupRestoreBtns = async (stageId = this.stageId, bindBtns = true) => {
        if (bindBtns) {
            this.bindBackupBtn();
            this.bindRestoreBackupBtn();
            this.bindConfigBtn();
            this.bindClearConfigBtn();
        }

        let backupDate = await this.getLocalSetting("fixture_backup").then(backupData => {
            if (backupData && backupData.stageId == stageId) {
                return backupData.date;
            }
        });
        if (backupDate) {
            backupDate = this.formatDate(new Date(JSON.parse(backupDate)));
            backupDate = `${backupDate} - <a href="#" id="restoreBackup">Restore</a>`;
            document.getElementById('backupDate').innerHTML = backupDate;
        } else {
            document.getElementById('backupDate').innerText = "Never";
        }
        document.getElementById('backupFixtures').addEventListener('click', async () => {
            if (confirm('Are you sure you want to backup all fixtures?\n\nThis will overwrite the current backup.')) {
                await this.backupAllFixtures();
                this.loadBackupRestoreBtns(this.stageId, false);
            }
        });
    }
    bindClearConfigBtn = async () => {
        document.getElementById('clearConfig').addEventListener('click', async () => {
            if (confirm('Are you sure you want to clear the current config?')) {
                chrome.storage.local.clear(function () {
                    //local settings
                    chrome.storage.local.set({ version: chrome.runtime.getManifest().version });

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

                    document.location.reload();
                });
            };
        });
    };
    //download eveyrthign except fixture backup
    bindConfigBtn = async () => {
        document.getElementById('downloadConfig').addEventListener('click', async () => {
            chrome.storage.local.get(null, function (items) {
                delete items.fixture_backup;
                var result = maestro.SettingsApp.prettyJSON(items);
                var url = 'data:application/json;base64,' + btoa(result);
                chrome.downloads.download({
                    url: url,
                    filename: `backup_config_${Date.now()}_${maestro.SettingsApp.activeStage.name.replace(/[^a-z0-9]/gi, '_')}.json`
                });
            });
        });
    };
    bindBackupBtn = async () => {
        document.getElementById('downloadBackup').addEventListener('click', async () => {
            chrome.storage.local.get(null, function (items) {
                var result = maestro.SettingsApp.prettyJSON(items);
                var url = 'data:application/json;base64,' + btoa(result);
                chrome.downloads.download({
                    url: url,
                    filename: `backup_stage_${Date.now()}_${maestro.SettingsApp.activeStage.name.replace(/[^a-z0-9]/gi, '_')}.json`
                });
            });
        });
    };
    bindRestoreBackupBtn = async () => {
        try {
            document.getElementById('restoreBackup').addEventListener('click', async () => {
                var input = document.createElement('input');
                input.id = 'fileInput';
                input.type = 'file';
                input.accept = ".json"
                input.click();
                input.onchange = e => {
                    var file = e.target.files[0];
                    var reader = new FileReader();

                    reader.readAsText(file);

                    reader.onload = readerEvent => {
                        var content = readerEvent.target.result;
                        var parse = JSON.parse(content);
                        if (parse.fixture_backup) {
                            if (!confirm('This backup contains fixture data.\n\nIf you continue, all current fixture settings in this stage will be overwritten!\n\nTo continue, press OK.\n\nTo remove the Fixture Backup and continue with macros and settings only click cancel.')) {
                                delete parse.fixture_backup
                            }
                        }
                        if (parse.macros) {
                            const foreignStageMacros = parse.macros.some(macro => macro.macro.stageId !== maestro.SettingsApp.stageId);
                            if (foreignStageMacros) {
                                const confirmMessage = 'This backup contains macros from a different stage.\n\nIf you continue, these macros will be reassigned to the currently active stage.';
                                if (!confirm(confirmMessage)) {
                                    return;
                                } else {
                                    parse.macros.forEach(macro => {
                                        macro.macro.stageId = maestro.SettingsApp.stageId;
                                    });
                                }
                            }
                            let currentFixtureIds = maestro.SettingsApp.fixtures.map(fixture => fixture.id);
                            let foreignFixtures = [...new Set(parse.macros.flatMap(macro => macro.macro.fixtures.map(fixture => fixture.id)).filter(fixtureId => !currentFixtureIds.includes(fixtureId)))];

                            if (foreignFixtures.length > 0) {
                                return alert('This backup contains macros for fixtures that are not present in the currently active stage.\n\nRestoring this backup would have no effect on the current stage, and cannot continue.')
                            }

                            if (confirm("Config file is ready to import.\n\nDo you want to continue and apply the new config?")) {
                                chrome.storage.local.clear(function () {
                                    chrome.storage.local.set(parse);
                                    chrome.storage.local.set({ version: chrome.runtime.getManifest().version });
                                    if (!alert('Config restored successfully.')) { window.location.reload(); }
                                });
                            }
                        }
                    }

                };
            });
        } catch (e) {
            if (this.logging)
                console.error('Error binding restoreConfig:', e);

            return alert('Error processing Config File\n\n' + e);
        }
    };
    backupAllFixtures = async () => {
        let fixtures = await this.getActiveStage(true);
        let backupData = {
            stageId: this.stageId,
            date: JSON.stringify(new Date().getTime()),
            fixtures: fixtures,
        }
        await this.saveLocalSetting("fixture_backup", backupData);
    };
    restoreAllFixtures = async (stageId = this.stageId) => {
        let backup = await this.getLocalSetting("fixture_backup").then(backupData => {
            if (backupData && backupData.stageId == stageId) {
                return backupData;
            }
        });
        for (let fixture of backup.fixtures.fixture) {
            let data = {
                fixture: fixture
            };
            await this.patchFixture(fixture.id, data);
        }

        return alert('All fixtures have been restored to the backup state');
    };
    bindAutoMacros = async () => {
        let autoMacrosEnabled = await this.getLocalSetting("autoMacrosEnabled");
        document.getElementById('autoMacrosEnabled').checked = autoMacrosEnabled;

        document.getElementById('autoMacrosEnabled').addEventListener('change', async () => {
            let autoMacrosEnabled = document.getElementById('autoMacrosEnabled').checked;
            await this.saveLocalSetting("autoMacrosEnabled", autoMacrosEnabled);
        });

        let autoMacroInterval = await this.getLocalSetting("autoMacroInterval");
        document.getElementById('autoMacroInterval').value = autoMacroInterval;

        document.getElementById('autoMacroInterval').addEventListener('change', async () => {
            document.getElementById('autoMacroInterval').value = maestro.SettingsApp.safeMinMax(document.getElementById('autoMacroInterval').value, 1, 60);
            let autoMacroInterval = Number(document.getElementById('autoMacroInterval').value);
            await this.saveLocalSetting("autoMacroInterval", autoMacroInterval);
        });

        let autoMacroRunTime = await this.getLocalSetting("autoMacroRunTime");
        document.getElementById('autoMacroRunTime').value = autoMacroRunTime;

        document.getElementById('autoMacroRunTime').addEventListener('change', async () => {
            document.getElementById('autoMacroRunTime').value = maestro.SettingsApp.safeMinMax(document.getElementById('autoMacroRunTime').value, 1, 600);
            let autoMacroRunTime = Number(document.getElementById('autoMacroRunTime').value);
            await this.saveLocalSetting("autoMacroRunTime", autoMacroRunTime);
        });
    };
    bindAutoEffects = async () => {
        let autoEffectsEnabled = await this.getLocalSetting("autoEffectsEnabled");
        let autoEffectsOnActivityPeakPercent = await this.getLocalSetting("autoEffectsOnActivityPeakPercent");
        let autoEffectsOnActivityPeakDuration = await this.getLocalSetting("autoEffectsOnActivityPeakDuration");
        let autoEffectsOnActivityPeakInterval = await this.getLocalSetting("autoEffectsOnActivityPeakInterval");

        let autoStrobeEnabled = await this.getLocalSetting("autoStrobeEnabled");
        let autoStrobeOnActivityPeakPercent = await this.getLocalSetting("autoStrobeOnActivityPeakPercent");
        let autoStrobeOnActivityPeakDuration = await this.getLocalSetting("autoStrobeOnActivityPeakDuration");
        let autoStrobeOnActivityPeakInterval = await this.getLocalSetting("autoStrobeOnActivityPeakInterval");

        document.getElementById('autoEffectsEnabled').checked = autoEffectsEnabled;
        document.getElementById('autoEffectsOnActivityPeakPercent').value = autoEffectsOnActivityPeakPercent
        document.getElementById('autoEffectsOnActivityPeakDuration').value = autoEffectsOnActivityPeakDuration
        document.getElementById('autoEffectsOnActivityPeakInterval').value = autoEffectsOnActivityPeakInterval

        document.getElementById('autoStrobeEnabled').checked = autoStrobeEnabled
        document.getElementById('autoStrobeOnActivityPeakPercent').value = autoStrobeOnActivityPeakPercent
        document.getElementById('autoStrobeOnActivityPeakDuration').value = autoStrobeOnActivityPeakDuration
        document.getElementById('autoStrobeOnActivityPeakInterval').value = autoStrobeOnActivityPeakInterval

        if (!autoEffectsEnabled) {
            document.getElementById('autoEffectsOnActivityPeakPercent').disabled = !autoEffectsEnabled;
            document.getElementById('autoEffectsOnActivityPeakDuration').disabled = !autoEffectsEnabled;
            document.getElementById('autoEffectsOnActivityPeakInterval').disabled = !autoEffectsEnabled;
        }
        if (!autoStrobeEnabled) {
            document.getElementById('autoStrobeOnActivityPeakPercent').disabled = !autoStrobeEnabled;
            document.getElementById('autoStrobeOnActivityPeakDuration').disabled = !autoStrobeEnabled;
            document.getElementById('autoStrobeOnActivityPeakInterval').disabled = !autoStrobeEnabled;
        }

        document.getElementById('autoEffectsEnabled').addEventListener('change', async () => {
            let autoEffectsEnabled = document.getElementById('autoEffectsEnabled').checked;
            document.getElementById('autoEffectsOnActivityPeakPercent').disabled = !autoEffectsEnabled;
            document.getElementById('autoEffectsOnActivityPeakDuration').disabled = !autoEffectsEnabled;
            document.getElementById('autoEffectsOnActivityPeakInterval').disabled = !autoEffectsEnabled;

            await this.saveLocalSetting("autoEffectsEnabled", autoEffectsEnabled);
        });
        document.getElementById('autoEffectsOnActivityPeakPercent').addEventListener('change', async () => {
            let autoEffectsOnActivityPeakPercent = this.safeMinMax(document.getElementById('autoEffectsOnActivityPeakPercent').value, 80, 99);
            await this.saveLocalSetting("autoEffectsOnActivityPeakPercent", autoEffectsOnActivityPeakPercent);
        });
        document.getElementById('autoEffectsOnActivityPeakDuration').addEventListener('change', async () => {
            let autoEffectsOnActivityPeakDuration = this.safeMinMax(document.getElementById('autoEffectsOnActivityPeakDuration').value, 1, 30);
            await this.saveLocalSetting("autoEffectsOnActivityPeakDuration", autoEffectsOnActivityPeakDuration);
        });
        document.getElementById('autoEffectsOnActivityPeakInterval').addEventListener('change', async () => {
            let autoEffectsOnActivityPeakInterval = this.safeMinMax(document.getElementById('autoEffectsOnActivityPeakInterval').value, 1, 30);
            await this.saveLocalSetting("autoEffectsOnActivityPeakInterval", autoEffectsOnActivityPeakInterval);
        });

        document.getElementById('autoStrobeEnabled').addEventListener('change', async () => {
            let autoStrobeEnabled = document.getElementById('autoStrobeEnabled').checked;
            document.getElementById('autoStrobeOnActivityPeakPercent').disabled = !autoStrobeEnabled;
            document.getElementById('autoStrobeOnActivityPeakDuration').disabled = !autoStrobeEnabled;
            document.getElementById('autoStrobeOnActivityPeakInterval').disabled = !autoStrobeEnabled;

            await this.saveLocalSetting("autoStrobeEnabled", autoStrobeEnabled);
        });
        document.getElementById('autoStrobeOnActivityPeakPercent').addEventListener('change', async () => {
            let autoStrobeOnActivityPeakPercent = this.safeMinMax(document.getElementById('autoStrobeOnActivityPeakPercent').value, 80, 99);
            await this.saveLocalSetting("autoStrobeOnActivityPeakPercent", autoStrobeOnActivityPeakPercent);
        });
        document.getElementById('autoStrobeOnActivityPeakDuration').addEventListener('change', async () => {
            let autoStrobeOnActivityPeakDuration = this.safeMinMax(document.getElementById('autoStrobeOnActivityPeakDuration').value, 1, 30);
            await this.saveLocalSetting("autoStrobeOnActivityPeakDuration", autoStrobeOnActivityPeakDuration);
        });
        document.getElementById('autoStrobeOnActivityPeakInterval').addEventListener('change', async () => {
            let autoStrobeOnActivityPeakInterval = this.safeMinMax(document.getElementById('autoStrobeOnActivityPeakInterval').value, 1, 30);
            await this.saveLocalSetting("autoStrobeOnActivityPeakInterval", autoStrobeOnActivityPeakInterval);
        });
    };
    bindAutoFog = async () => {
        let fogOn = await this.getSetting("autoFogToggle");
        let autoFogOnTimer = await this.getLocalSetting("autoFogOnTimer");
        let autoFogOnActivityPeak = await this.getLocalSetting("autoFogOnActivityPeak");

        document.getElementById('autoFogEnabled').checked = fogOn;
        document.getElementById('autoFogOnActivityPeak').checked = autoFogOnActivityPeak;
        document.getElementById('autoFogOnActivityPeakPercent').value = await this.getLocalSetting("autoFogOnActivityPeakPercent");
        document.getElementById('autoFogOnActivityPeakDuration').value = await this.getLocalSetting("autoFogOnActivityPeakDuration");
        document.getElementById('autoFogOnActivityPeakInterval').value = await this.getLocalSetting("autoFogOnActivityPeakInterval");
        document.getElementById('autoFogOnTimer').checked = autoFogOnTimer;
        document.getElementById('fogTimer').value = await this.getLocalSetting("fogTimer");
        document.getElementById('fogTimerDuration').value = await this.getLocalSetting("fogTimerDuration");

        if (!fogOn) {
            document.getElementById('autoFogOnActivityPeak').disabled = !fogOn;
            document.getElementById('autoFogOnTimer').disabled = !fogOn;
            document.getElementById('fogTimer').disabled = !fogOn;
            document.getElementById('fogTimerDuration').disabled = !fogOn;
            document.getElementById('autoFogOnActivityPeakPercent').disabled = !fogOn;
            document.getElementById('autoFogOnActivityPeakDuration').disabled = !fogOn;
            document.getElementById('autoFogOnActivityPeakInterval').disabled = !fogOn;
        } else {
            document.getElementById('fogTimer').disabled = !autoFogOnTimer;
            document.getElementById('fogTimerDuration').disabled = !autoFogOnTimer;
            document.getElementById('autoFogOnActivityPeakPercent').disabled = !autoFogOnActivityPeak;
            document.getElementById('autoFogOnActivityPeakDuration').disabled = !autoFogOnActivityPeak;
            document.getElementById('autoFogOnActivityPeakInterval').disabled = !autoFogOnActivityPeak;
        }


        document.getElementById('autoFogEnabled').addEventListener('change', async () => {
            let autoFogEnabled = document.getElementById('autoFogEnabled').checked;
            let autoFogOnTimer = document.getElementById('autoFogOnTimer').checked;
            let autoFogOnActivityPeak = document.getElementById('autoFogOnActivityPeak').checked;

            await this.saveSetting("autoFogToggle", autoFogEnabled);

            document.getElementById('autoFogOnTimer').disabled = !autoFogEnabled;
            document.getElementById('fogTimer').disabled = (autoFogEnabled == false ? true : !autoFogOnTimer);
            document.getElementById('fogTimerDuration').disabled = (autoFogEnabled == false ? true : !autoFogOnTimer);

            document.getElementById('autoFogOnActivityPeak').disabled = !autoFogEnabled;
            document.getElementById('autoFogOnActivityPeakPercent').disabled = (autoFogEnabled == false ? true : !autoFogOnActivityPeak);
            document.getElementById('autoFogOnActivityPeakDuration').disabled = (autoFogEnabled == false ? true : !autoFogOnActivityPeak);
            document.getElementById('autoFogOnActivityPeakInterval').disabled = (autoFogEnabled == false ? true : !autoFogOnActivityPeak);
        });
        document.getElementById('autoFogOnActivityPeak').addEventListener('change', async () => {
            let autoFogOnActivityPeak = document.getElementById('autoFogOnActivityPeak').checked;

            document.getElementById('autoFogOnActivityPeakPercent').disabled = !autoFogOnActivityPeak;
            document.getElementById('autoFogOnActivityPeakDuration').disabled = !autoFogOnActivityPeak;
            document.getElementById('autoFogOnActivityPeakInterval').disabled = !autoFogOnActivityPeak;

            await this.saveLocalSetting("autoFogOnActivityPeak", autoFogOnActivityPeak);
        });
        document.getElementById('autoFogOnTimer').addEventListener('change', async () => {
            let autoFogOnTimer = document.getElementById('autoFogOnTimer').checked;

            document.getElementById('fogTimer').disabled = !autoFogOnTimer;
            document.getElementById('fogTimerDuration').disabled = !autoFogOnTimer;

            await this.saveLocalSetting("autoFogOnTimer", autoFogOnTimer);
        });
        document.getElementById('fogTimer').addEventListener('change', async () => {
            let fogTimer = this.safeMinMax(document.getElementById('fogTimer').value, 1, 15);
            await this.saveLocalSetting("fogTimer", fogTimer);
        });
        document.getElementById('fogTimerDuration').addEventListener('change', async () => {
            let fogTimerDuration = this.safeMinMax(document.getElementById('fogTimerDuration').value, 1, 30);
            await this.saveLocalSetting("fogTimerDuration", fogTimerDuration);
        });
        document.getElementById('autoFogOnActivityPeakPercent').addEventListener('change', async () => {
            let autoFogOnActivityPeakPercent = this.safeMinMax(document.getElementById('autoFogOnActivityPeakPercent').value, 80, 99);
            await this.saveLocalSetting("autoFogOnActivityPeakPercent", autoFogOnActivityPeakPercent);
        });
        document.getElementById('autoFogOnActivityPeakDuration').addEventListener('change', async () => {
            let autoFogOnActivityPeakDuration = this.safeMinMax(document.getElementById('autoFogOnActivityPeakDuration').value, 80, 99);
            await this.saveLocalSetting("autoFogOnActivityPeakDuration", autoFogOnActivityPeakDuration);
        });
        document.getElementById('autoFogOnActivityPeakInterval').addEventListener('change', async () => {
            let autoFogOnActivityPeakInterval = this.safeMinMax(document.getElementById('autoFogOnActivityPeakInterval').value, 1, 30);
            await this.saveLocalSetting("autoFogOnActivityPeakInterval", autoFogOnActivityPeakInterval);
        });
    }
    controlPageLink = function () {
        var link = document.getElementById('controlPageLink')
        link.setAttribute("href", `${maestro.SettingsApp.maestroUrl}/#/stages/${maestro.SettingsApp.stageId}/control/`);
    };
    loadMacros = (callback) => {
        return this.getLocalSetting("macros").then(macros => {
            if (!macros) {
                if (typeof callback == "function") {
                    callback(macros);
                }
                return;
            }
            //only for currently active stage
            macros = macros.filter(macro => macro.macro.stageId == this.stageId);

            if (typeof callback == "function") {
                callback(macros);
            }
            return macros;
        });
    };
    applyMacro = async (macroName, stageId, showLoader = true) => {
        try {
            if (showLoader) {
                this.showLoader();
            }
            let effectActive = await this.getLocalSetting("activeEffect");
            if (effectActive) {
                if (!confirm('There is an Effect active, if you start this macro whilst an Effect is running which also controls the pan/til on the same fixtures it will cause conflicts.\n\nProceed or cancel?')) {
                    return;
                }
            }

            const deleteButton = document.querySelector(`button[name="btn_delete"][data-id="${macroName}"]`);
            const applyButton = document.querySelector(`button[name="btn_apply"][data-id="${macroName}"]`);
            const clearButton = document.querySelector(`button[name="btn_clr"][data-id="${macroName}"]`);

            deleteButton.disabled = true;
            applyButton.disabled = true;

            const keys = await this.retrieveAllKeys();
            this.currentCue = await this.getShowState();
            const ignoredFixtures = [];

            let macros = await this.loadMacros();
            macros = macros.filter(macro => macro.macro.name === macroName && macro.macro.stageId === stageId);

            if (macros[0]?.macro.macroRunning) {
                return;
            }

            if (macros) {
                const pendingMacroIds = macros.flatMap(macro => macro.macro.fixtures.map(fixture => fixture.id));
                const runningMacroIds = Object.keys(keys).filter(key => pendingMacroIds.some(id => key === `macro_active_${id}`));

                if (runningMacroIds.length > 0) {
                    deleteButton.disabled = false;
                    applyButton.disabled = false;
                    this.hideLoader();

                    if (showLoader) {
                        return alert('Another Macro is already running on fixtures with the same id as contained in this macro!\n\nRunning multiple macros on the same fixture simultaneously can cause issues!');
                    } else {
                        return false;
                    }
                }
            }

            for (let fixture of macros[0]?.macro.fixtures || []) {
                let currentProfile = await this.getFixture(fixture.id);

                if (!currentProfile) {
                    continue;
                }

                let diff = this.getObjectDiff(fixture.attribute, currentProfile.attribute);
                if (diff.length === 0) {
                    ignoredFixtures.push({ fixtureId: fixture.id, name: fixture.name });
                    continue;
                }

                await this.processAttributeChanges(diff, fixture.id, fixture, currentProfile);
                this.storeFixtureProfile(macroName, currentProfile);
            }

            if (ignoredFixtures.length > 0) {
                if (ignoredFixtures.length === macros[0]?.macro.fixtures.length) {
                    deleteButton.disabled = false;
                    applyButton.disabled = false;
                    this.hideLoader();

                    if (showLoader) {
                        alert(`The macro will not be applied because all fixtures have the same settings as currently live!`);
                    }

                    return false;
                }

                if (showLoader) {
                    let ignoredFixtureNames = ignoredFixtures.map(fixture => fixture.name).join('\n');
                    alert(`The following fixtures were ignored because they have the same settings as the macro:\n\n${ignoredFixtureNames}`);
                }
            }

            await maestro.SettingsApp.loadMacros().then(macros => {
                let m = macros.find(macro => macro.macro.name === macroName && macro.macro.stageId === stageId)
                if (m) {
                    m.macro.autoMacroLastRun = Date.now();
                    m.macro.macroRunning = true;
                    maestro.SettingsApp.saveLocalSetting("macros", macros);

                    document.querySelector(`span[name="macroLastRunTime"][data-id="${macroName}"][data-stageid="${stageId}"]`).innerHTML = maestro.SettingsApp.formatDate(new Date(m.macro.autoMacroLastRun + 1000), true);
                }
            });

            clearButton.disabled = false;
            document.querySelector(`[data-id="${macroName}"][data-stageid="${stageId}"]`).classList.add('macro-active');

            if (macros[0]?.macro.cueId) {
                await this.getCues().then(async (cues) => {
                    let cueIndex = cues.findIndex(cue => cue.uuid === macros[0].macro.cueId);
                    await this.startCue(cueIndex);
                })
            }

            this.hideLoader();
        } catch (e) {
            if (this.logging) {
                console.error('Error applying Macro:', e);
            }

            alert(this.fatalErrorMsg);
        } finally {
            this.hideLoader();
        }
    }
    revertMacro = async (macroName, stageId, showLoader = true) => {
        try {
            if (showLoader) {
                this.showLoader();
            }
            const clearButton = document.querySelector(`button[name="btn_clr"][data-id="${macroName}"]`);
            clearButton.disabled = true;

            this.currentCue = await this.getShowState();
            const macros = await this.loadMacros();
            const filteredMacros = macros.filter(macro => macro.macro.name === macroName && macro.macro.stageId === stageId);

            if (filteredMacros.length > 0) {
                const fixtures = filteredMacros[0].macro.fixtures;
                const promiseArray = [];

                for (const fixture of fixtures) {
                    const originalProfile = await maestro.SettingsApp.retrieveFixtureProfile(fixture.id);

                    if (originalProfile) {
                        const diff = this.getObjectDiff(originalProfile.fixture.attribute, fixture.attribute);
                        promiseArray.push(
                            new Promise((resolve, reject) => {
                                try {
                                    maestro.SettingsApp.processAttributeChanges(diff, fixture.id, originalProfile.fixture, fixture)
                                        .then(() => {
                                            resolve();
                                        })
                                        .catch(e => {
                                            reject(e);
                                        });
                                } catch (e) {
                                    reject(e);
                                }
                            })
                        );
                    } else {
                        maestro.SettingsApp.deleteFixtureProfile(fixture.id);
                    }
                }

                await Promise.all(promiseArray);

                for (const fixture of fixtures) {
                    maestro.SettingsApp.deleteFixtureProfile(fixture.id);
                }

                const applyButton = document.querySelector(`button[name="btn_apply"][data-id="${macroName}"]`);
                applyButton.disabled = false;
                const deleteButton = document.querySelector(`button[name="btn_delete"][data-id="${macroName}"]`);
                deleteButton.disabled = false;

                const macroElement = document.querySelector(`[data-id="${macroName}"][data-stageid="${stageId}"]`);
                macroElement.classList.remove('macro-active');

                if (filteredMacros[0].macro.cueIdEnd) {
                    const cues = await this.getCues();
                    const cueIndex = cues.findIndex(cue => cue.uuid === filteredMacros[0].macro.cueIdEnd);
                    await this.startCue(cueIndex);
                }

                await maestro.SettingsApp.loadMacros().then(macros => {
                    const m = macros.find(macro => macro.macro.name === macroName && macro.macro.stageId === stageId);
                    if (m) {
                        m.macro.autoMacroLastStopped = Date.now();
                        m.macro.macroRunning = false;
                        maestro.SettingsApp.saveLocalSetting("macros", macros);

                        const macroLastStopTimeElement = document.querySelector(`span[name="macroLastStopTime"][data-id="${macroName}"][data-stageid="${stageId}"]`);
                        macroLastStopTimeElement.innerHTML = maestro.SettingsApp.formatDate(new Date(m.macro.autoMacroLastStopped + 1000), true);
                    }
                });
            }
        } catch (e) {
            if (this.logging) {
                console.error('Error reverting Macro:', e);
            }

            alert(this.fatalErrorMsg);
        } finally {
            this.hideLoader();
        }
    };
    deleteMacro = async (macroName, stageId) => {
        await this.loadMacros().then(macros => {
            macros = macros.filter(macro => macro.macro.name !== macroName && macro.macro.stageId == stageId);
            maestro.SettingsApp.saveLocalSetting("macros", macros);

            const macroRow = document.querySelector('tr[data-id="' + macroName + '"]');
            if (macroRow) {
                macroRow.remove();
            }
        });
    };
    checkRunningMacros = async (macros) => {
        if (!macros)
            macros = await this.loadMacros();

        macros = macros.filter(macro => macro.macro.stageId == this.stageId);

        for (let macro of macros) {
            for (let fixture of macro.macro.fixtures) {
                let fixtureProfile = await this.retrieveFixtureProfile(fixture.id);
                if (fixtureProfile && fixtureProfile.macroName == macro.macro.name || macro.macro.macroRunning == true) {
                    const deleteButton = document.querySelector(`button[name="btn_delete"][data-id="${macro.macro.name}"]`);
                    deleteButton.disabled = true;
                    const applyButton = document.querySelector(`button[name="btn_apply"][data-id="${macro.macro.name}"]`);
                    applyButton.disabled = true;
                    const clearButton = document.querySelector(`button[name="btn_clr"][data-id="${macro.macro.name}"]`);
                    clearButton.disabled = false;
                    document.querySelector(`[data-id="${macro.macro.name}"][data-stageid="${macro.macro.stageId}"]`).classList.add('macro-active');
                }
            }
        }
    }
    processAttributeChanges = async (diff, fixtureId, newProfile, oldProfile) => {
        try {
            for (let attr of diff) {
                let attrNew = newProfile.attribute[attr];
                let attrOld = oldProfile.attribute[attr];
                let attrDiff = this.getObjectDiff(attrNew, attrOld);

                //should never edit colorwheel, its not modifiable via attribute updates
                if (attrNew.colorWheelSetting || attrOld.colorWheelSetting) continue;

                for (let prop of attrDiff) {
                    let update = {
                        attribute: {
                            [prop]: attrNew[prop]
                        }
                    };
                    this.putAttribute(fixtureId, attr, update);
                }
            };
        } catch (e) {
            console.error('Error processing attribute changes:', e);
        }
    };
    patchFixture = async (fixtureId, fixture) => {
        delete fixture.fixture.fixtureProfileModeId;
        delete fixture.fixture.id;

        return await this.prepareFetch(
            this.httpMethods.PATCH,
            `${maestro.SettingsApp.maestroUrl}api/${this.apiVersion}/output/stage/${this.stageId}/fixture/${fixtureId}`,
            fixture
        );
    }
    bindMacroBtn = async () => {
        const addMacroBtn = document.getElementById('addMacro');
        addMacroBtn.addEventListener('click', async () => {
            const checkboxes = document.querySelectorAll('input[name="fixture_cbx"]:checked');
            if (checkboxes.length === 0) {
                return alert('Please select at least one fixture');
            }
            const values = Array.from(checkboxes).map(checkbox => checkbox.value);

            await this.getActiveStage(true);

            let macroFixtures = maestro.SettingsApp.activeStage.fixture.filter(fixture => values.includes(fixture.id.toString()));

            var macroName = prompt('Enter a name for the macro', 'Macro Name');
            if (!macroName) {
                return;
            }

            const macros = await maestro.SettingsApp.getLocalSetting("macros") || [];
            const macroExists = macros.find(macro => macro.macro.name === macroName && macro.macro.stageId === this.stageId);
            if (macroExists) {
                return alert('Macro name already exists');
            }

            macros.push({ "macro": { name: macroName, stageId: this.stageId, fixtures: macroFixtures } });
            await maestro.SettingsApp.saveLocalSetting("macros", macros);
            await maestro.SettingsApp.saveLocalSetting("activeSettingsTab", "tabpanel-macros");
            document.location.reload();
        });
    };
    changeStrobeParam = async (id, channelId, type, stageId = null) => {
        let newStrobeValue, newShutterValue;
        if (channelId) {
            newStrobeValue = this.safeMinMax(document.getElementById(`strobe_val_${channelId}_${id}`).value, 0, 255);
            newShutterValue = this.safeMinMax(document.getElementById(`open_val_${channelId}_${id}`).value, 0, 255);
            if (newStrobeValue === 0 && newShutterValue === 0) {
                newShutterValue = "";
                newStrobeValue = "";
            }
            let strobeParams = await this.getLocalSetting(`strobe_${id}`);
            if (strobeParams) {
                const channel = strobeParams.find(channel => channel.channelId === channelId);
                if (channel) {
                    channel.strobe = newStrobeValue;
                    channel.shutter = newShutterValue;
                    channel.stageId = stageId;
                } else {
                    strobeParams.push({ channelId, type, strobe: newStrobeValue, shutter: newShutterValue, stageId });
                }
                await this.saveLocalSetting(`strobe_${id}`, strobeParams);
            } else {
                let channel = [{ channelId, type, strobe: newStrobeValue, shutter: newShutterValue, stageId }];
                await this.saveLocalSetting(`strobe_${id}`, channel);
            }
        } else {
            newStrobeValue = this.safeMinMax(document.getElementById(`strobe_val_${id}`).value, 0, 255);
            newShutterValue = this.safeMinMax(document.getElementById(`open_val_${id}`).value, 0, 255);
            this.saveLocalSetting(`strobe_${id}`, { type, strobe: newStrobeValue, shutter: newShutterValue, stageId });
        }
    };
    fixtureTable = async (activeStage, activeFixtureGroups) => {
        var tData = [];
        for (let group of activeFixtureGroups) {
            let i = 0;
            if (group.fixtureId) {
                for (let fixtureId of group.fixtureId) {
                    let fixture = activeStage.fixture.find(ele => ele.id == fixtureId);
                    let panOrTilt = fixture.attribute.some(ele => ele.type === 'PAN' || ele.type === 'TILT');
                    let channels = fixture.attribute.filter(channel => channel.type === "SHUTTER" || channel.type === "STROBE")
                        .map((channel) => ({ index: fixture.attribute.indexOf(channel), channel }));

                    let shutterParams = await this.getLocalSetting("strobe_" + fixture.id);
                    let normalValue = shutterParams ? shutterParams.shutter : "";
                    let strobeValue = shutterParams ? shutterParams.strobe : "";
                    let ignoreParam = await this.getLocalSetting("fixture_ignore_" + fixture.id);
                    let ignore = ignoreParam ? ignoreParam.ignore : false;

                    shutterParams = await this.upprageShutterParams(fixture.id, shutterParams);

                    if (ignore == true)
                        maestro.SettingsApp.ignoredFixtures.push({ id: fixture.id });

                    tData.push({
                        id: fixture.id,
                        stageId: activeStage.id,
                        name: fixture.name,
                        fixtureGroup: this.groups.find(ele => ele.id == fixture.fixtureGroupId).name,
                        fixturePosition: i,
                        active: fixture.enabled,
                        shutter: normalValue,
                        strobe: strobeValue,
                        fixtureGroupId: fixture.fixtureGroupId,
                        index: fixture.index,
                        pantilt: panOrTilt,
                        channels: channels,
                        ignore: ignore,
                        shutterParams: shutterParams
                    });
                    i++;
                }
            }
        }
        tData = tData.sort((a, b) => {
            return a.fixtureGroup.localeCompare(b.fixtureGroup);
        });

        $('#fixtures').bootstrapTable({
            onClickRow: function (row, field, $element) {
                if ($element == "shutter" || $element == "strobe" || $element == "pantilt" || $element == "ignore" || $element == "colorWheel")
                    return false;

                let checkbox = document.getElementById('cb_' + row.id);
                checkbox.checked = !document.getElementById('cb_' + row.id).checked;

                let event = new Event('change');
                checkbox.dispatchEvent(event);
            },
            data: tData,
            columns: [
                {
                    field: 'pantilt',
                    title: '',
                    align: 'center',
                    valign: 'middle',
                    clickToSelect: false,
                    formatter: function (value, row, index) {
                        if (row.pantilt && !row.ignore) {
                            return '<span role="button" name="panOrTilt" class="panOrTilt cursor-pointer" data-id="' + row.id + '" data-bs-toggle="tooltip" data-bs-placement="top" title="Set Pan/Tilt"><img src="pan_tilt.svg"></span>';
                        }
                    }
                },
                {
                    field: 'name',
                    align: 'left',
                    valign: 'middle',
                    clickToSelect: false,
                    formatter: function (value, row, index) {
                        return '<span id="name_' + row.id + '">' + value + '</span>';
                    }
                },
                {}, {}, {
                    field: 'active',
                    align: 'center',
                    valign: 'middle',
                    clickToSelect: false,
                    formatter: function (value, row, index) {
                        return row.active == true ? 'Yes' : 'No';
                    }
                }, {
                    field: 'channelType',
                    align: 'center',
                    valign: 'middle',
                    clickToSelect: false,
                    formatter: function (value, row, index) {
                        if (row.channels) {
                            if (row.channels.length > 1) {
                                return `<span class="text-capitalize">Multiple</span>`;
                            } else {
                                if (row.channels.length == 1)
                                    return `<span class="text-capitalize">${row.channels[0].channel.type.charAt(0).toUpperCase() + row.channels[0].channel.type.slice(1).toLowerCase()}</span>`;
                            }
                        }
                    }
                },
                {
                    field: 'shutter',
                    align: 'center',
                    valign: 'middle',
                    clickToSelect: false,
                    formatter: function (value, row, index) {
                        if (row.ignore)
                            return "";
                        if (!row.channels)
                            return;

                        let response = "";

                        for (let channel of row.channels) {
                            let values = null;
                            if (row.shutterParams)
                                values = row.shutterParams.find(ele => ele.channelId == channel.index);
                            response += `<label style="font-size:10px;position:relative;top:-10px;" for="strobe_val_${channel.index}_${row.id}">Ch ${channel.index + 1}</label><br>`;
                            response += `<input class="text-center" type="number" style="width:70px;position:relative;top:-10px;" name="open_val" data-id="${row.id}" data-type="${channel.channel.type}" data-stageid="${row.stageId}" data-channelid="${channel.index}" id="open_val_${channel.index}_${row.id}" min="0" max="255" value="${values ? values.shutter : ""}">`;
                        }
                        return response;
                    }
                },
                {
                    field: 'strobe',
                    align: 'center',
                    valign: 'middle',
                    clickToSelect: false,
                    formatter: function (value, row, index) {
                        if (row.ignore)
                            return "";
                        if (!row.channels)
                            return;

                        let response = "";

                        for (let channel of row.channels) {
                            let values = null;
                            if (row.shutterParams)
                                values = row.shutterParams.find(ele => ele.channelId == channel.index);

                            response += `<label style="font-size:10px;position:relative;top:-10px;" for="strobe_val_${channel.index}_${row.id}">Ch ${channel.index + 1}</label><br>`;
                            response += `<input class="text-center" type="number" style="width:70px;position:relative;top:-10px;" name="shutter_strobe" data-id="${row.id}" data-type="${channel.channel.type}" data-stageid="${row.stageId}" data-channelid="${channel.index}" id="strobe_val_${channel.index}_${row.id}" min="0" max="255" value="${values ? values.strobe : ""}">`;
                        }
                        return response;

                    }
                },
                {
                    field: 'ignore',
                    title: 'Ignore',
                    align: 'center',
                    valign: 'middle',
                    clickToSelect: false,
                    formatter: function (value, row, index) {
                        return `<input type="checkbox" name="fixture_ignore" value="${row.id}" data-id="${row.id}" class="checkbox"${row.ignore == true ? " checked" : ""}>`;
                    }
                },
                {
                    field: 'active',
                    title: 'Select',
                    align: 'center',
                    valign: 'middle',
                    clickToSelect: false,
                    formatter: function (value, row, index) {
                        if (row.ignore || row.active == false) {
                            return "";
                        }
                        return `<input type="checkbox" name="fixture_cbx" value="${row.id}" id="cb_${row.id}" class="checkbox"}>`;
                    }
                }],
            rowAttributes: function (row, index) {
                return {
                    'data-id': row.id,
                    'data-fixture-active': row.active,
                    'data-fixture-group': row.fixtureGroup,
                    'data-fixture-group-id:': row.fixtureGroupId,
                }
            },
            rowStyle: function (row, index) {
                if (row.ignore == true) {
                    return {
                        css: {
                            'background-color': '#cccccc'
                        }
                    }
                } else {
                    if (row.active) {
                        return {
                            css: {
                                'background-color': '',
                                'cursor': 'pointer',
                            }
                        }
                    } else {
                        return {
                            css: {
                                'background-color': '#cccccc'
                            }
                        }

                    }
                }
            }
        });
        $('#fixtures thead th').each(function (tr) {
            if (tr == 0) {
                let s = $('<span role="button" class="panOrTilt cursor-pointer" data-id="panOrTiltAll" data-bs-toggle="tooltip" data-bs-placement="top" title="Set Pan/Tilt for All Movers"><img src="pan_tilt.svg">');
                $(this).find(".th-inner").append(s)
            }
        })
        $('.checkbox[name="fixture_ignore"]').on('change', function () {
            if ($(this).is(':checked')) {
                maestro.SettingsApp.saveLocalSetting("fixture_ignore_" + $(this).data('id'), { ignore: true })
            } else {
                maestro.SettingsApp.deleteLocalSetting("fixture_ignore_" + $(this).data('id'))
            }
        });

        $('input[name="fixture_cbx"]').on('change', function (btn) {
            let checkbox = document.getElementById(this.id);
            let row = document.querySelector(`table[id='fixtures'] tr[data-id="${checkbox.value}"]`);
            let tds = row.getElementsByTagName('td');
            for (let td of tds) {
                if (checkbox.checked) {
                    td.style.backgroundColor = 'lightgreen';
                } else {
                    td.style.backgroundColor = '';
                }
            }
        });
        $('input[name="open_val"]').on('change', function (btn) {
            maestro.SettingsApp.changeStrobeParam(this.dataset.id, this.dataset.channelid, this.dataset.type, this.dataset.stageid);
        });
        $('input[name="shutter_strobe"]').on('change', function (btn) {
            maestro.SettingsApp.changeStrobeParam(this.dataset.id, this.dataset.channelid, this.dataset.type, this.dataset.stageid);
        });
        $('.panOrTilt').on('click', async function (btn) {
            let effectActive = await maestro.SettingsApp.getLocalSetting("activeEffect");
            if (effectActive) {
                alert('There is an Effect active, you cannot modify the pan/tilt settings whilst an Effect is active.');
                return;
            }
            maestro.SettingsApp.panOrTiltOpen(this);
            return false;
        });
    }
    panOrTiltOpen = (btn) => {
        let id = btn.dataset.id;
        let fixtureNames = "";
        let fixtureIds = [];

        let boxResponse = (x, y) => {
            document.getElementById('panRange').value = x;
            document.getElementById('tiltRange').value = y;
            document.getElementById('panRangeVal').value = x;
            document.getElementById('tiltRangeVal').value = y;
            maestro.SettingsApp.panTiltHandler(document.getElementById('panTiltFinder').dataset.id);
        }

        maestro.SettingsApp.loadCoordFinder(boxResponse);

        if (id == "panOrTiltAll") {
            maestro.SettingsApp.preloadPanTilValues(id);
            let fixtures = maestro.SettingsApp.getAllMovers();

            for (let f of fixtures) {
                if (maestro.SettingsApp.ignoredFixtures.find(ele => ele.id == f.id)) {
                    fixtureNames += `<div class="text-danger">(ignored)${f.name}</div><br>`;
                } else {
                    fixtureNames += `<div class="border-bottom" name="panTiltFixtureNameField">${f.name}<span class="ms-2 float-end" name="fixtureNameValsSpan" id="fixtureNameVals_${f.id}"></span></div>`;
                    fixtureIds.push(f.id);
                }
            }

            document.getElementById('panTiltFinder').dataset.id = JSON.stringify(fixtureIds);
            document.getElementById('fixtureName').innerHTML = fixtureNames;
            document.getElementById('panFanRow').style.display = "";
        } else {
            maestro.SettingsApp.preloadPanTilValues(id);

            fixtureIds.push(id);
            let fixture = maestro.SettingsApp.fixtures.find(ele => ele.id == id);

            document.getElementById('panTiltFinder').dataset.id = JSON.stringify(id);
            document.getElementById('fixtureName').innerText = fixture.name;
            document.getElementById('panFanRow').style.display = "none";
        }

        $('#panTiltFinder').modal('show');

        setTimeout(() => {
            maestro.SettingsApp.coordFinderSetPosition(maestro.SettingsApp.safeZero(document.getElementById('panRangeVal').value), maestro.SettingsApp.safeZero(document.getElementById('tiltRangeVal').value));
        }, 200);

        document.getElementById('panRange').addEventListener('input', function () {
            document.getElementById('panRangeVal').value = maestro.SettingsApp.safeMinMax(this.value, 0, 255);
            maestro.SettingsApp.panTiltHandler(document.getElementById('panTiltFinder').dataset.id)
            maestro.SettingsApp.coordFinderSetPosition(maestro.SettingsApp.safeZero(document.getElementById('panRangeVal').value), maestro.SettingsApp.safeZero(document.getElementById('tiltRangeVal').value));

            maestro.SettingsApp.setPanFanLimits();
        });
        document.getElementById('tiltRange').addEventListener('input', function () {
            document.getElementById('tiltRangeVal').value = maestro.SettingsApp.safeMinMax(this.value, 0, 255);;
            maestro.SettingsApp.panTiltHandler(document.getElementById('panTiltFinder').dataset.id)
            maestro.SettingsApp.coordFinderSetPosition(maestro.SettingsApp.safeZero(document.getElementById('panRangeVal').value), maestro.SettingsApp.safeZero(document.getElementById('tiltRangeVal').value));
        });
        document.getElementById('tiltRangeVal').addEventListener('change', function () {
            document.getElementById('tiltRange').value = maestro.SettingsApp.safeMinMax(this.value, 0, 255);
            maestro.SettingsApp.panTiltHandler(document.getElementById('panTiltFinder').dataset.id);
            maestro.SettingsApp.coordFinderSetPosition(maestro.SettingsApp.safeZero(document.getElementById('panRangeVal').value), maestro.SettingsApp.safeZero(document.getElementById('tiltRangeVal').value));
        });
        document.getElementById('panRangeVal').addEventListener('change', function (ele) {
            document.getElementById('panRange').value = maestro.SettingsApp.safeMinMax(this.value, 0, 255);
            maestro.SettingsApp.panTiltHandler(document.getElementById('panTiltFinder').dataset.id);
            maestro.SettingsApp.coordFinderSetPosition(maestro.SettingsApp.safeZero(document.getElementById('panRangeVal').value), maestro.SettingsApp.safeZero(document.getElementById('tiltRangeVal').value));

            maestro.SettingsApp.setPanFanLimits();

        });
        document.getElementById('panFanRange').addEventListener('input', function () {
            document.getElementById('panFanRangeVal').value = maestro.SettingsApp.safeMinMax(this.value, -127, 127);
            maestro.SettingsApp.panFanning(document.getElementById('panRangeVal').value, this.value);
        });
        document.getElementById('panFanRangeVal').addEventListener('input', function () {
            document.getElementById('panFanRange').value = maestro.SettingsApp.safeMinMax(this.value, -127, 127);
            maestro.SettingsApp.panFanning(document.getElementById('panRangeVal').value, this.value);
        });
        document.getElementById('panTiltReset').addEventListener('click', function () {
            document.getElementById('panRange').value = 0;
            document.getElementById('tiltRange').value = 0;
            document.getElementById('panRangeVal').value = "";
            document.getElementById('tiltRangeVal').value = "";
            maestro.SettingsApp.coordFinderSetPosition(0, 0);
            maestro.SettingsApp.resetPanTiltHandler(document.getElementById('panTiltFinder').dataset.id);

            let panTiltFixtureNameFields = document.querySelectorAll('span[name="fixtureNameValsSpan"]');
            panTiltFixtureNameFields.forEach(field => {
                field.textContent = '';
            });
            document.getElementById('panFanRange').value = 0;
            document.getElementById('panFanRangeVal').value = 0;
        });
    };
    setPanFanLimits = () => {
        document.getElementById('panFanRange').value = 0;
        document.getElementById('panFanRangeVal').value = 0;

        let panTiltFixtureNameFields = document.querySelectorAll('span[name="fixtureNameValsSpan"]');
        panTiltFixtureNameFields.forEach(field => {
            field.textContent = '';
        });

        let numFixtures = document.querySelectorAll('[name="panTiltFixtureNameField"]').length;
        let pan = Number(document.getElementById('panRangeVal').value);

        let halfNumFixtures = Math.floor(numFixtures / 2);
        let distanceToLeftEdge = Math.floor(pan / halfNumFixtures);
        let distanceToRightEdge = Math.floor((255 - pan) / halfNumFixtures);

        let maxRange = Math.min(distanceToLeftEdge, distanceToRightEdge);
        let minRange = -maxRange;

        document.getElementById('panFanRange').min = minRange;
        document.getElementById('panFanRange').max = maxRange;
        document.getElementById('panFanRangeVal').min = minRange;
        document.getElementById('panFanRangeVal').max = maxRange;
    };
    panFanning = async (midPoint, fanRate) => {
        midPoint = Number(midPoint);
        fanRate = Number(fanRate);

        let panFixtures = maestro.SettingsApp.getAllMovers();

        let numFixtures = panFixtures.length;
        let values = [];

        const halfNumFixtures = Math.floor(numFixtures / 2);
        for (let i = 0; i < numFixtures; i++) {
            let offset;
            if (i < halfNumFixtures) {
                // Left side
                offset = (halfNumFixtures - i) * fanRate;
                let value = Math.floor(midPoint - offset);
                value = Math.max(0, Math.min(value, 255));
                values.push(value);
            } else if (numFixtures % 2 !== 0 && i === halfNumFixtures) {
                // Middle fixture when numFixtures is odd
                values.push(midPoint);
            } else {
                // Right side
                offset = (numFixtures % 2 === 0 ? i - halfNumFixtures + 1 : i - halfNumFixtures) * fanRate;
                let value = Math.floor(midPoint + offset);
                value = Math.max(0, Math.min(value, 255));
                values.push(value);
            }
        }
        this.setPanFan(panFixtures, values);
    };
    setPanFan = async (panFixtures, order) => {
        let i = 0;
        for (let fixture of panFixtures) {
            const fixturePanIndex = fixture.attribute.findIndex(ele => ele.type === 'PAN');
            const panRange = this.calculateRange({ lowValue: order[i], highValue: order[i] });

            document.getElementById(`fixtureNameVals_${fixture.id}`).innerText = order[i];
            this.putAttribute(fixture.id, fixturePanIndex, { attribute: { range: panRange } });
            i++;
        }
    };
    preloadPanTilValues = async (id) => {
        let currentSetting;
        if (id == "panOrTiltAll") {
            currentSetting = await maestro.SettingsApp.getLocalSetting("panTiltAll");
            if (currentSetting) {
                document.getElementById('panRange').value = currentSetting.pan;
                document.getElementById('tiltRange').value = currentSetting.tilt;
                document.getElementById('panRangeVal').value = currentSetting.pan;
                document.getElementById('tiltRangeVal').value = currentSetting.tilt;
            }
            maestro.SettingsApp.setPanFanLimits();
        } else {
            currentSetting = await maestro.SettingsApp.getLocalSetting("panTilt_" + id);
            if (currentSetting) {
                document.getElementById('panRange').value = currentSetting.pan;
                document.getElementById('tiltRange').value = currentSetting.tilt;
                document.getElementById('panRangeVal').value = currentSetting.pan;
                document.getElementById('tiltRangeVal').value = currentSetting.tilt;
            }
        }
    };
    resetPanTiltHandler = async (id) => {
        let ids = JSON.parse(id);
        if (Array.isArray(ids)) {
            return this.resetPanTiltAll(ids);
        } else {
            return this.resetPanTilt(ids);
        }
    }
    panTiltHandler = this.debounce((id) => {
        let ids = JSON.parse(id);
        if (Array.isArray(ids)) {
            this.panTiltAll(ids);
        } else {
            this.setPanTilt(ids);
        }
    }, 50);
    resetPanTiltAll = async (ids) => {
        this.deleteLocalSetting("panTiltAll");
        for (let id of ids) {
            await this.resetPanTilt(id);
        }
    }
    panTiltAll = async (ids) => {
        this.saveLocalSetting("panTiltAll", { pan: this.safeMinMax(document.getElementById('panRange').value, 0, 255), tilt: this.safeMinMax(document.getElementById('tiltRange').value, 0, 255) });
        for (let id of ids) {
            await this.setPanTilt(id);
        }
    };
    setPanTilt = async (id) => {
        const panRangeValue = document.getElementById('panRange').value;
        const tiltRangeValue = document.getElementById('tiltRange').value;
        const panValue = this.safeMinMax(panRangeValue, 0, 255);
        const tiltValue = this.safeMinMax(tiltRangeValue, 0, 255);

        this.saveLocalSetting("panTilt_" + id, { pan: panValue, tilt: tiltValue });

        const fixture = maestro.SettingsApp.fixtures.find(ele => ele.id == id);
        const ignoreFixtures = await this.getLocalSetting("fixture_ignore_" + fixture.id);
        if (ignoreFixtures) return;

        const fixturePanIndex = fixture.attribute.findIndex(ele => ele.type === 'PAN');
        const fixtureTiltIndex = fixture.attribute.findIndex(ele => ele.type == 'TILT');

        const panRange = this.calculateRange({ lowValue: panValue, highValue: panValue });
        const tiltRange = this.calculateRange({ lowValue: tiltValue, highValue: tiltValue });

        await this.putAttribute(id, fixturePanIndex, { attribute: { range: panRange } });
        await this.putAttribute(id, fixtureTiltIndex, { attribute: { range: tiltRange } });
    };
    resetPanTilt = async (id) => {
        this.saveLocalSetting("panTilt_" + id, { pan: 0, tilt: 0 });
        let fixture = maestro.SettingsApp.fixtures.find(ele => ele.id == id);
        let fixturePanIndex = fixture.attribute.findIndex(ele => ele.type === 'PAN');
        let fixtureTiltIndex = fixture.attribute.findIndex(ele => ele.type == 'TILT');

        let panRange = this.calculateRange({ lowValue: 0, highValue: 255 });
        let titRange = this.calculateRange({ lowValue: 0, highValue: 255 });
        await this.putAttribute(id, fixturePanIndex, { attribute: { range: panRange } });
        await this.putAttribute(id, fixtureTiltIndex, { attribute: { range: titRange } });
    };
    getAllMovers = () => {
        return maestro.SettingsApp.activeStage.fixture.filter(fixture => fixture.attribute.some(attr => attr.type === 'PAN' || attr.type === 'TILT'));
    }
    macroTable = async (macros) => {
        let cues = await this.getCues();

        var tData = [];
        for (let macro of macros) {
            //make sure the fixture affected by the macro is still in the stage
            var fixtures = macro.macro.fixtures.filter(fixture => this.activeStage.fixture.some(activeFixture => activeFixture.id === fixture.id));
            let cue = cues.find(cue => cue.uuid == macro.macro.cueId);

            if (!cue) {
                macro.macro.cueId = null;
            }

            tData.push({
                macro: macro,
                stageId: macro.macro.stageId,
                name: macro.macro.name,
                activityLevelOn: macro.macro.activityLevelOn,
                activityLevelOff: macro.macro.activityLevelOff,
                length: fixtures.length,
                fixtureName: fixtures.map(fixture => fixture.name),
                cueId: macro.macro.cueId,
                cueName: cue ? cue.name : "",
                cues: cues
            });
        };

        $('#macros').bootstrapTable({
            data: tData,
            columns: [
                {
                    field: 'name',
                    align: 'left',
                    valign: 'top',
                    cellStyle: function (value, row, index, field) {
                        return {
                            css: {
                                'position': 'relative',
                                'background-color': ''
                            }
                        };
                    },
                    clickToSelect: false,
                    formatter: function (value, row, index) {
                        let response = "";
                        response = `<span name="editMacroName" role="button" class="cursor-pointer me-1" style="position:absolute;top:5px;right:5px;" data-stageid="${row.stageId}" data-name="${row.name}" data-bs-toggle="tooltip" data-bs-placement="top" title="Rename Macro"><img src="pencil-fill.svg" width="14" height="14"></span>`
                        response += `<span style="display:inline-block;width: 150px;overflow-wrap: break-word;">${row.name}</span><br>`;
                        response += `<span style="font-size:10px;display:block;position:absolute;bottom:12px;">Last Start: <span name="macroLastRunTime" data-id="${row.name}" data-stageid="${row.stageId}">${row.macro.macro.autoMacroLastRun == null ? 'Never' : maestro.SettingsApp.formatDate(new Date(row.macro.macro.autoMacroLastRun + 1000), true)}</span></span>`;
                        response += `<span style="font-size:10px;display:block;position:absolute;bottom:0px;">Last Stop: <span name="macroLastStopTime" data-id="${row.name}" data-stageid="${row.stageId}">${row.macro.macro.autoMacroLastStopped == null ? 'Never' : maestro.SettingsApp.formatDate(new Date(row.macro.macro.autoMacroLastStopped + 1000), true)}</span></span>`;
                        return response;
                    }
                },
                {
                    field: 'length',
                    align: 'center',
                    valign: 'middle',
                },
                {
                    field: 'fixtures',
                    align: 'left',
                    valign: 'middle',
                    clickToSelect: false,
                    formatter: function (value, row, index) {
                        let fixtureNames = "";
                        for (let fixture of row.fixtureName) {
                            fixtureNames += `<span>${fixture}</span><br>`;
                        }
                        return fixtureNames;
                    }
                },
                {
                    field: 'cue',
                    align: 'center',
                    valign: 'middle',
                    clickToSelect: false,
                    formatter: function (value, row, index) {
                        if (!cues) return;

                        let select = `<select name="startCueList" data-bs-toggle="tooltip" data-bs-placement="top" title="Select Cue to trigger on Macro Start" id="startCueList_${row.name}" data-id="${row.name}" data-stageid="${row.stageId}" class="form-select text-center text-primary" style="width: 100%;">`;
                        select += '<option value="">-- Start Cue --</option>';
                        for (let cue of row.cues) {
                            select += `<option value="${cue.name}" data-id="{row.name}" data-uuid="${cue.uuid}" ${row.macro.macro.cueId == cue.uuid ? " selected" : ""}>${cue.name}</option>`;
                        }
                        select += '</select><br>';

                        select += `<select name="endCueList" data-bs-toggle="tooltip" data-bs-placement="top" title="Select Cue to trigger on Macro Stop" id="endCueList_${row.name}" data-id="${row.name}" data-stageid="${row.stageId}" class="form-select text-center text-primary" style="width: 100%;">`;
                        select += '<option value="">-- End Cue --</option>';
                        for (let cue of row.cues) {
                            select += `<option value="${cue.name}" data-id="{row.name}" data-uuid="${cue.uuid}" ${row.macro.macro.cueIdEnd == cue.uuid ? " selected" : ""}>${cue.name}</option>`;
                        }
                        select += '</select>';

                        return select;
                    }
                },
                {
                    field: 'activityTriggerHigh',
                    align: 'center',
                    valign: 'middle',
                    clickToSelect: false,
                    formatter: function (value, row, index) {
                        return `<label style="font-size:10px;font-weight:bold;position:relative;top:-7px;">On Level</label><br><input type="number" name="activityLevel" data-type="on" data-id="${row.name}" data-stageid="${row.stageId}" class="" data-bs-toggle="tooltip" data-bs-placement="top" title="Set the audio Activity Level at which the trigger will come on. Leave blank to disable!" style="position:relative;top:-7px;width: 50px;" min="50" max="99" value="${row.activityLevelOn == null ? '' : row.activityLevelOn}">`;
                    }
                },
                {
                    field: 'activityTriggerLow',
                    align: 'center',
                    valign: 'middle',
                    clickToSelect: false,
                    formatter: function (value, row, index) {
                        return `<label style="font-size:10px;font-weight:bold;position:relative;top:-7px;">Off Level</label><br><input type="number" name="activityLevel" data-type="off" data-id="${row.name}" data-stageid="${row.stageId}" class="" data-bs-toggle="tooltip" data-bs-placement="top" title="Set the audio Activity Level at which the trigger will switch off. Leave blank to disable!" style="position:relative;top:-7px;width: 50px;" min="10" max="99" value="${row.activityLevelOff == null ? '' : row.activityLevelOff}">`;
                    }
                },
                {
                    field: 'button_apply',
                    align: 'center',
                    valign: 'middle',
                    clickToSelect: false,
                    formatter: function (value, row, index) {
                        return `<button class="btn btn-danger" name="btn_apply" data-id="${row.name}" data-stageid="${row.stageId}"><img src="/src/img/play.svg" width="30" height="30"></button>`;
                    }
                },
                {
                    field: 'button_clear',
                    align: 'center',
                    valign: 'middle',
                    clickToSelect: false,
                    formatter: function (value, row, index) {
                        return `<button class="btn btn-success" name="btn_clr" data-id="${row.name}" data-stageid="${row.stageId}" disabled><img src="/src/img/stop-fill.svg" width="30" height="30"></button>`;
                    }
                },
                {
                    field: 'button_delete',
                    align: 'center',
                    valign: 'middle',
                    clickToSelect: false,
                    formatter: function (value, row, index) {
                        return `<button class="btn btn-warning" name="btn_delete" data-id="${row.name}" data-stageid="${row.stageId}"><img src="/src/img/trash.svg" width="30" height="30"></button>`;
                    }
                }],
            rowAttributes: function (row, index) {
                return {
                    'data-id': row.name,
                    'data-stageid': row.stageId,
                }
            },
            rowStyle: function (row, index) {
                return {
                    css: {
                        'background-color': ''
                    }
                }
            }
        });
        $('input[name="activityLevel"]').on('change', function (btn) {
            var macro = this.dataset.id;
            var level = this.value;
            var stageId = this.dataset.stageid;

            if (level == "") {
                level = null;
            }

            if (Number(this.value) < Number(this.min)) {
                this.value = this.min;
            }
            if (Number(this.value) > Number(this.max)) {
                this.value = this.max;
            }


            maestro.SettingsApp.loadMacros().then(macros => {
                for (let m of macros) {
                    if (m.macro.name == macro && m.macro.stageId == stageId) {
                        if (this.dataset.type == "on")
                            m.macro.activityLevelOn = (this.value > 100 ? 100 : this.value);
                        if (this.dataset.type == "off")
                            m.macro.activityLevelOff = (this.value > 100 ? 100 : this.value);
                    }
                }
                maestro.SettingsApp.saveLocalSetting("macros", macros);
            });
        });
        $('span[name="editMacroName"]').on('click', async function (btn) {
            var macroName = this.dataset.name

            await maestro.SettingsApp.loadMacros().then(async macros => {
                let m = macros.find(macro => macro.macro.name == macroName && macro.macro.stageId == maestro.SettingsApp.activeStageId)

                if (m.macro.macroRunning == true) {
                    return alert('Cannot rename a macro while it is running');
                }

                var newName = prompt('Enter a new name for the macro', macroName);
                if (newName == null || newName == "") {
                    return;
                }

                if (newName == macroName) return;

                if (newName.length > 50) {
                    return alert('Macro name must be less than 50 characters');
                }

                maestro.SettingsApp.loadMacros().then(macros => {
                    if (macros.find(macro => macro.macro.name == newName && macro.macro.stageId == maestro.SettingsApp.activeStageId)) {
                        return alert('Macro name already exists');
                    }
                    for (let m of macros) {
                        if (m.macro.name == macroName && m.macro.stageId == maestro.SettingsApp.activeStageId) {
                            m.macro.name = newName;
                        }
                    }
                    maestro.SettingsApp.saveLocalSetting("macros", macros);
                    document.location.reload();
                });


            });
        });
        $('button[name="btn_apply"]').on('click', function (btn) {
            maestro.SettingsApp.applyMacro(this.dataset.id, this.dataset.stageid);
        });
        $('button[name="btn_clr"]').on('click', function (btn) {
            maestro.SettingsApp.revertMacro(this.dataset.id, this.dataset.stageid);
        });
        $('button[name="btn_delete"]').on('click', function (btn) {
            if (confirm('Are you sure you want to delete this macro?')) {
                maestro.SettingsApp.deleteMacro(this.dataset.id, this.dataset.stageid);
            }
        });
        $('select[name="startCueList"]').on('change', async function (btn) {
            if (this.value == "") {
                await maestro.SettingsApp.removeCueFromMacro(this.dataset.id, this.dataset.stageid);
            } else {
                let cues = await maestro.SettingsApp.getCues(true);
                let uuid = document.querySelector(`select[name="startCueList"][data-id="${this.dataset.id}"] option:checked`).dataset.uuid;

                if (uuid == "") return alert('Please select a macro');

                let cue = cues.find(cue => cue.uuid == uuid);
                await maestro.SettingsApp.applyCueToMacro(this.dataset.id, this.dataset.stageid, cue.uuid, false, false);
            }
            $(this).blur();
        });
        $('select[name="endCueList"]').on('change', async function (btn) {
            if (this.value == "") {
                await maestro.SettingsApp.removeCueFromMacro(this.dataset.id, this.dataset.stageid, true);
            } else {
                let cues = await maestro.SettingsApp.getCues(true);
                let uuid = document.querySelector(`select[name="endCueList"][data-id="${this.dataset.id}"] option:checked`).dataset.uuid;

                if (uuid == "") return alert('Please select a macro');

                let cue = cues.find(cue => cue.uuid == uuid);
                await maestro.SettingsApp.applyCueToMacro(this.dataset.id, this.dataset.stageid, cue.uuid, true, false);
            }
            $(this).blur();
        });
    };
    stageTable = () => {
        let stages = this.stage;
        let activeStage = this.activeStage;
        var tData = [];

        for (let stage of stages.stage) {
            tData.push({
                id: stage.id,
                name: stage.name,
                active: stage.id == activeStage.id ? "Yes" : "",
                fixtures: (stage.fixture ? stage.fixture.length : 0),
            });
        }

        $('#stages').bootstrapTable({
            columns: [{
                field: 'name',
                title: 'Stage Name'
            }, {
                field: 'fixtures',
                title: 'Fixtures'
            }, {
                field: 'active',
                title: 'Active'
            }],
            data: tData,
            rowAttributes: function (row, index) {
                return {
                    'data-id': row.id,
                    'data-stage-active': row.active
                }
            },
            rowStyle: function (row, index) {
                if (row.active) {
                    return {
                        css: {
                            'background-color': ''
                        }
                    }
                } else {
                    return {
                        css: {
                            'background-color': '#edebe6'
                        }
                    }

                }
            },
            sortName: 'active',
            sortOrder: 'desc'
        });

    };
    cuesTable = async (stages) => {
        try {
            let activeCue;
            let cues = await this.getCues();
            let showState = await this.getShowState();

            if (showState.currentCue)
                activeCue = cues.find(cue => cue.uuid == showState.currentCue.uuid);

            let macroNames = [];

            if (activeCue) {
                for (let cue of cues) {

                    if (cue.uuid === activeCue.uuid) {
                        cue.active = true;
                        cue.playInder = activeCue.playIndex;
                        cue.playTime = activeCue.playTime;
                        cue.type = activeCue.type;
                    }
                }
            }

            await this.loadMacros().then((macros) => {
                if (macros) {
                    for (let macro of macros) {
                        macroNames.push({ value: macro.macro.stageId, text: macro.macro.name });
                    };
                }
            });

            var tData = [];

            for (let cue of cues) {
                tData.push({
                    id: cue.uuid,
                    cueName: cue.name,
                    active: cue.active,
                    status: cue.active ? "Active" : "",
                    groupModes: `${cue.params.patternId} / ${cue.secondaryParams.patternId} / ${cue.tertiaryParams.patternId}`,
                    list: macroNames
                });
            }

            $('#cues').bootstrapTable({
                data: tData,
                columns: [{}, {}, {},
                {
                    field: 'applyCue',
                    align: 'center',
                    valign: 'middle',
                    clickToSelect: false,
                    formatter: function (value, row, index) {
                        if (row.list.length == 0) return;
                        let select = `<select name="macroList" data-id="${row.id}" class="form-select text-center text-primary" style="width: 100%;">`;
                        select += '<option value="">-</option>';
                        for (let item of row.list) {
                            select += `<option value="${item.text}" data-stageid="${item.value}">${item.text}</option>`;
                        }
                        select += '</select>';

                        return select;
                    }
                },
                {
                    field: 'applyCueEnd',
                    align: 'center',
                    valign: 'middle',
                    clickToSelect: false,
                    formatter: function (value, row, index) {
                        if (row.list.length == 0) return;
                        let select = `<select name="macroListEnd" data-id="${row.id}" class="form-select text-center text-primary" style="width: 100%;">`;
                        select += '<option value="">-</option>';
                        for (let item of row.list) {
                            select += `<option value="${item.text}" data-stageid="${item.value}">${item.text}</option>`;
                        }
                        select += '</select>';

                        return select;
                    }
                },
                {
                    field: 'button_apply',
                    title: '',
                    align: 'center',
                    valign: 'middle',
                    clickToSelect: false,
                    formatter: function (value, row, index) {
                        if (row.list.length == 0) {
                            return `<button class="btn btn-primary" disabled>Apply</button>`;
                        }
                        return `<button class="btn btn-primary" name="btn_show_apply" data-id="${row.id}">Apply</button>`;
                    }
                }],
                rowAttributes: function (row, index) {
                    return {
                        'data-id': row.id,
                        'data-stage-active': row.active
                    }
                },
                rowStyle: function (row, index) {
                    if (row.active) {
                        return {
                            css: {
                                'background-color': ''
                            }
                        }
                    } else {
                        return {
                            css: {
                                'background-color': '#edebe6'
                            }
                        }

                    }
                }
            });
            $('button[name="btn_show_apply"]').on('click', async function (btn) {
                let cues = await maestro.SettingsApp.getCues();
                let macroStart = document.querySelector(`select[name="macroList"][data-id="${this.dataset.id}"]`).value;
                let macroEnd = document.querySelector(`select[name="macroListEnd"][data-id="${this.dataset.id}"]`).value;


                if (macroStart == "" && macroEnd == "") return alert('Please select a macro');

                if (macroStart != "") {
                    let stageId = document.querySelector(`select[name="macroList"][data-id="${this.dataset.id}"] option:checked`).dataset.stageid;
                    let cue = cues.find(cue => cue.uuid == this.dataset.id);
                    await maestro.SettingsApp.applyCueToMacro(macroStart, stageId, cue.uuid, false, true);
                }
                if (macroEnd != "") {
                    let stageId = document.querySelector(`select[name="macroListEnd"][data-id="${this.dataset.id}"] option:checked`).dataset.stageid;
                    let cue = cues.find(cue => cue.uuid == this.dataset.id);
                    await maestro.SettingsApp.applyCueToMacro(macroEnd, stageId, cue.uuid, true, true);
                }
            });
        } catch (e) {
            if (this.logging)
                console.error('Error loading cues:', e);
        };
    };
    removeCueFromMacro = async (macroName, stageId, endCue = false) => {
        let macros = await this.loadMacros();
        let macro = macros.find(macro => macro.macro.name == macroName && macro.macro.stageId == stageId);
        if (macro) {
            if (endCue) {
                delete macro.macro.cueIdEnd;
            } else {
                delete macro.macro.cueId;
            }
            this.saveLocalSetting("macros", macros);
        }
    }
    applyCueToMacro = async (macroName, stageId, cueId, endCue = false, reload = true) => {
        let row = document.querySelector(`[data-id="${macroName}"][data-stageid="${stageId}"]`);
        if (row.classList.contains('macro-active')) {
            alert("The Macro is active, you need to clear the running macro before you can edit the cue.");
            return false;
        }

        let macros = await this.loadMacros();
        let macro = macros.find(macro => macro.macro.stageId == stageId && macro.macro.name == macroName);
        if (macro) {
            if (endCue) {
                macro.macro.cueIdEnd = cueId;
            } else {
                macro.macro.cueId = cueId;
            }

            maestro.SettingsApp.saveLocalSetting("macros", macros);
            await maestro.SettingsApp.saveLocalSetting('activeSettingsTab', 'tabpanel-macros');
            if (reload) document.location.reload();
        }
    }
    getCues = async (forceRefresh = false) => {
        if (!this.cues || forceRefresh) {
            const show = await this.getUrl(`${this.maestroUrl}api/${this.apiVersion}/show`);
            this.cues = show.patternCue;
            return this.cues;
        }
        return this.cues;
    }
    createShowDropdown = (id, data, onChange) => {
        let select = document.createElement('select');
        select.id = id;

        let option = document.createElement('option');
        option.value = "";
        option.text = "-";
        select.appendChild(option);

        for (let item of data) {
            let option = document.createElement('option');
            option.value = data.value;
            option.text = data.text;
            select.appendChild(option);
        }

        select.addEventListener('change', function () {
            onChange(this.value);
        });

        return select;
    };
    togglesTable = async (activeStage, activeFixtureGroups) => {
        var tData = [];

        for (let group of activeFixtureGroups) {
            if (group.fixtureId) {
                for (let fixtureId of group.fixtureId) {
                    let fixture = activeStage.fixture.find(ele => ele.id == fixtureId);
                    let attributeTypes = fixture.attribute.map(attr => attr.type);
                    let goboState = await this.getLocalSetting("gobo_state_" + fixtureId);
                    let prismState = await this.getLocalSetting("prism_state_" + fixtureId);
                    if (attributeTypes.includes('GOBO') || attributeTypes.includes('PRISM')) {
                        tData.push({
                            id: fixture.id,
                            name: fixture.name,
                            active: fixture.enabled,
                            attributeList: attributeTypes,
                            attributes: fixture.attribute,
                            goboState: goboState,
                            prismState: prismState
                        });
                    }
                }
            }
        }

        $('#toggles').bootstrapTable({
            data: tData,
            columns: [
                {
                    field: 'name',
                    formatter: function (value, row, index) {
                        return `<h6>${row.name}</h6>`;
                    }
                },
                {
                    field: 'switches',
                    formatter: function (value, row, index) {
                        let response = "";

                        if (row.attributeList.includes('GOBO')) {
                            let i = 0;
                            for (let attr of row.attributes) {
                                if (attr.type == 'GOBO') {
                                    let x = 0;

                                    response += `<span style="display:inline-block;"><h6>${attr.name}</h6></span></br>`
                                    for (let setting of attr.goboSetting.steps) {
                                        response += `<span class="me-2 mb-2 p-2" style="display:inline-block;">`
                                        response += `<span class="form-check form-switch">`
                                        response += `    <input name="goboSwitch" ${row.active == false ? "disabled " : ""}class="form-check-input" type="checkbox" data-name="${setting.name}" data-type="${attr.type}" data-channel="${i}" data-index="${x}" data-fixtureid="${row.id}" id="gobo_${row.id}_${i}_${x}"${setting.enabled == true ? " checked" : ""}>`
                                        response += `    <label class="form-check-label" for="gobo_${row.id}_${i}_${x}">${setting.name}</label>`
                                        response += `</span>`
                                        response += `</span>`
                                        x++;
                                    }
                                    response += `</br>`;
                                }
                                i++;
                            }
                        }
                        if (row.attributeList.includes('PRISM')) {
                            let i = 0;
                            for (let attr of row.attributes) {
                                if (attr.type == 'PRISM') {
                                    let x = 0;
                                    response += `<span style="display:inline-block;"><h6>${attr.name}</h6></span></br>`
                                    for (let setting of attr.prismSetting.steps) {
                                        response += `<span class="me-2 mb-2 p-2" style="display:inline-block;zwidth:120px;zheight:50px;">`
                                        response += `<span class="form-check form-switch">`
                                        response += `    <input name="prismSwitch"  ${row.active == false ? "disabled " : ""}class="form-check-input" type="checkbox" data-name="${setting.name}" data-type="${attr.type}" data-channel="${i}" data-index="${x}" data-fixtureid="${row.id}" id="prism_${row.id}_${i}_${x}"${setting.enabled == true ? " checked" : ""}>`
                                        response += `    <label class="form-check-label" for="prism_${row.id}_${i}_${x}">${setting.name}</label>`
                                        response += `</span>`
                                        response += `</span>`
                                        x++;
                                    }

                                }
                                i++;
                            }
                        }
                        return response;
                    }
                },
                {
                    field: 'toggles',
                    align: 'center',
                    valign: 'middle',
                    clickToSelect: false,
                    formatter: function (value, row, index) {
                        if (row.active == false) return;
                        let btns = "";
                        let btnState = false;
                        if (row.attributeList.includes('GOBO')) {
                            if (row.goboState) {
                                btnState = row.goboState.gobo;
                            } else {
                                btnState = true;
                            }
                            btns += `<div class="d-inline">`;
                            btns += `<button class="btn btn-warning my-1 mr-2" style="width:120px;" name="btn_disable_gobos" data-id="${row.id}"${btnState == false ? ' disabled' : ''}>Gobos Off</button>&nbsp;`;
                            btns += `<button class="btn btn-success my-1 mr-2" style="width:120px;" name="btn_enable_gobos" data-id="${row.id}"${btnState == true ? ' disabled' : ''}>Gobos On</button>&nbsp;`;
                            btns += `</div><br>`;
                        }
                        if (row.attributeList.includes('PRISM')) {
                            if (row.prismState) {
                                btnState = row.prismState.prism;
                            } else {
                                btnState = true;
                            }
                            btns += `<div class="d-inline">`;
                            btns += `<button class="btn btn-warning my-1" style="width:120px;" name="btn_disable_prism" data-id="${row.id}"${row.id}"${btnState == false ? ' disabled' : ''}>Prism Off</button>&nbsp;`;
                            btns += `<button class="btn btn-success my-1" style="width:120px;" name="btn_enable_prism" data-id="${row.id}"${row.id}"${btnState == true ? ' disabled' : ''}>Prism On</button>&nbsp;`;
                            btns += `</div>`;
                        }

                        if (btns == "") return
                        return btns;
                    }
                }],
            rowAttributes: function (row, index) {
                return {
                    'data-id': row.id,
                    'data-stage-active': row.active
                }
            },
            rowStyle: function (row, index) {
                if (row.active) {
                    return {
                        css: {
                            'background-color': ''
                        }
                    }
                } else {
                    return {
                        css: {
                            'background-color': '#d1d1d1'
                        }
                    }

                }
            }
        });
        $('input[name="goboSwitch"]').on('change', async function (btn) {
            let index = this.dataset.index;
            let channel = this.dataset.channel;
            let fixtureId = this.dataset.fixtureid;
            let fixture = maestro.SettingsApp.fixtures.find(ele => ele.id == fixtureId);
            let attr = fixture.attribute[channel];
            let setting = attr.goboSetting.steps[index];
            setting.enabled = this.checked;
            maestro.SettingsApp.putAttribute(fixture.id, channel, { attribute: attr });
        });
        $('input[name="prismSwitch"]').on('change', async function (btn) {
            let index = this.dataset.index;
            let channel = this.dataset.channel;
            let fixtureId = this.dataset.fixtureid;
            let fixture = maestro.SettingsApp.fixtures.find(ele => ele.id == fixtureId);
            let attr = fixture.attribute[channel];
            let setting = attr.prismSetting.steps[index];
            setting.enabled = this.checked;
            maestro.SettingsApp.putAttribute(fixture.id, channel, { attribute: attr });
        });
        $('button[name="btn_disable_gobos"]').on('click', async function (btn) {
            btn.currentTarget.disabled = true;
            $('button[name="btn_enable_gobos"][data-id="' + this.dataset.id + '"]').prop('disabled', false);
            $('input[name="goboSwitch"][data-fixtureid="' + this.dataset.id + '"]').each(function () {
                let name = this.dataset.name;
                if (name.toLowerCase() == "open" || name.toLowerCase() == "no gobo" || name.toLowerCase() == "gobo off" || name.toLowerCase() == "gobo open" || name.toLowerCase() == "none") {
                    return;
                }
                this.checked = false;
            });
            await maestro.SettingsApp.switchGobos(this.dataset.id, false);
        });
        $('button[name="btn_enable_gobos"]').on('click', async function (btn) {
            btn.currentTarget.disabled = true;
            $('button[name="btn_disable_gobos"][data-id="' + this.dataset.id + '"]').prop('disabled', false);
            $('input[name="goboSwitch"][data-fixtureid="' + this.dataset.id + '"]').prop('checked', true);
            await maestro.SettingsApp.switchGobos(this.dataset.id);
        });
        $('button[name="btn_disable_prism"]').on('click', async function (btn) {
            btn.currentTarget.disabled = true;
            $('button[name="btn_enable_prism"][data-id="' + this.dataset.id + '"]').prop('disabled', false);
            $('input[name="prismSwitch"][data-fixtureid="' + this.dataset.id + '"]').each(function () {
                let name = this.dataset.name;
                if (name.toLowerCase() == "open" || name.toLowerCase() == "no prism" || name.toLowerCase() == "prism off" || name.toLowerCase() == "prism open" || name.toLowerCase() == "none") {
                    return;
                }
                this.checked = false;
            });
            await maestro.SettingsApp.switchPrisms(this.dataset.id, false);
        });
        $('button[name="btn_enable_prism"]').on('click', async function (btn) {
            btn.currentTarget.disabled = true;
            $('input[name="prismSwitch"][data-fixtureid="' + this.dataset.id + '"]').prop('checked', true);
            $('button[name="btn_disable_prism"][data-id="' + this.dataset.id + '"]').prop('disabled', false);
            await maestro.SettingsApp.switchPrisms(this.dataset.id);

        });
        document.getElementById('toggleAllGobo').addEventListener('click', async function () {
            let disableButtons = $('button[name="btn_disable_gobos"]:not(:disabled)');
            let enableButtons = $('button[name="btn_enable_gobos"]:not(:disabled)');

            for (let i = 0; i < disableButtons.length; i++) {
                await disableButtons[i].click();
            }

            for (let i = 0; i < enableButtons.length; i++) {
                await enableButtons[i].click();
            }
        })
        document.getElementById('toggleAllPrism').addEventListener('click', async function () {
            let disableButtons = $('button[name="btn_disable_prism"]:not(:disabled)');
            let enableButtons = $('button[name="btn_enable_prism"]:not(:disabled)');

            for (let i = 0; i < disableButtons.length; i++) {
                await disableButtons[i].click();
            }

            for (let i = 0; i < enableButtons.length; i++) {
                await enableButtons[i].click();
            }
        })
    };
    switchGobos = async (fixtureId, onOrOff = true, exceptOpen = true) => {
        this.showLoader();
        let stage = await this.getActiveStage();
        let fixtures = stage.fixture.filter(fixture => fixture.id == fixtureId);

        for (let fixture of fixtures) {
            let index = 0;
            for (let attr of fixture.attribute) {
                if (attr.type == "GOBO") {
                    attr.goboSetting.steps.forEach(setting => {
                        if (onOrOff == false) {
                            if (exceptOpen && (setting.name.toLowerCase() == "open" || setting.name.toLowerCase() == "no gobo" || setting.name.toLowerCase() == "gobo off" || setting.name.toLowerCase() == "gobo open" || setting.name.toLowerCase() == "none")) {
                                setting.enabled = true;
                            } else {
                                setting.enabled = false;
                            }
                        } else {
                            setting.enabled = true;
                        }
                    });
                    this.putAttribute(fixture.id, index, { attribute: attr });
                    this.saveLocalSetting("gobo_state_" + fixture.id, { stageId: stage.stageId, gobo: onOrOff })
                }
                index++;
            }
        }
        this.hideLoader();
    };
    switchPrisms = async (fixtureId, onOrOff = true, exceptOpen = true) => {
        this.showLoader();
        let stage = await this.getActiveStage();
        let fixtures = stage.fixture.filter(fixture => fixture.id == fixtureId);

        for (let fixture of fixtures) {
            let index = 0;
            for (let attr of fixture.attribute) {
                if (attr.type == "PRISM") {
                    attr.prismSetting.steps.forEach(setting => {
                        if (onOrOff == false) {
                            if (exceptOpen && (setting.name.toLowerCase() == "open" || setting.name.toLowerCase() == "no prism" || setting.name.toLowerCase() == "prism off" || setting.name.toLowerCase() == "none")) {
                                setting.enabled = true;
                            } else {
                                setting.enabled = false;
                            }
                        } else {
                            setting.enabled = true;
                        }
                    });
                    await this.putAttribute(fixture.id, index, { attribute: attr });
                    await this.saveLocalSetting("prism_state_" + fixture.id, { stageId: stage.stageId, prism: onOrOff })
                }
                index++;
            }
        }
        this.hideLoader();
    };
    getGroupAvgDimmer = (activeStage, fixtureGroup, currGroupName) => {
        let values = [];
        let group = fixtureGroup.find(ele => ele.name == currGroupName);
        for (let fixtureId of group.fixtureId) {
            let fixture = activeStage.fixture.find(ele => ele.id == fixtureId);
            for (let attr of fixture.attribute) {
                if (attr.type == "DIMMER") {
                    values.push(Math.floor(255 * attr.range.highValue));
                }
                if (attr.type == "MASTER_DIMMER") {
                    values.push(attr.staticValue.value);
                }
            }
        }
        return values.reduce((a, b) => a + b, 0) / values.length;

    };
    getGroupAvgFocus = (activeStage, fixtureGroup, currGroupName) => {
        let values = [];
        let group = fixtureGroup.find(ele => ele.name == currGroupName);
        for (let fixtureId of group.fixtureId) {
            let fixture = activeStage.fixture.find(ele => ele.id == fixtureId);
            for (let attr of fixture.attribute) {
                if (attr.type == "STATIC" && (attr.name.toUpperCase() == "FOCUS" || attr.name.toUpperCase().indexOf("FOCUS") !== -1)) {
                    values.push(attr.staticValue.value);
                }
                if (attr.type == "ZOOM") {
                    values.push(Math.floor(255 * attr.range.highValue));
                }
            }
        }
        return values.reduce((a, b) => a + b, 0) / values.length;

    };
    focusTable = async (activeStage, activeFixtureGroups) => {
        var tData = [];

        for (let group of activeFixtureGroups) {
            if (group.fixtureId) {
                for (let fixtureId of group.fixtureId) {
                    let fixture = activeStage.fixture.find(ele => ele.id == fixtureId);
                    let index = 0;
                    for (let attribute of fixture.attribute) {
                        if (!attribute.range && attribute.type == "ZOOM") {
                            attribute.range = this.calculateRange({ lowValue: 0, highValue: 255 });
                        }
                        if (attribute.type == "ZOOM" || attribute.name.toUpperCase() == "FOCUS" || attribute.name.toUpperCase().indexOf("FOCUS") !== -1) {
                            tData.push(
                                {
                                    id: fixture.id,
                                    uuid: maestro.SettingsApp.getUuid(),
                                    active: fixture.enabled,
                                    name: fixture.name,
                                    attributes: attribute,
                                    channel: index,
                                    type: attribute.type,
                                    groupName: group.name
                                });
                        }
                        index++;
                    }
                }
            }
        }

        //table builder
        let table = document.getElementById('focus');
        let tbody = document.createElement('tbody');
        table.appendChild(tbody);
        let groupName;

        let rowIndex = 0;
        for (let data of tData) {
            if (rowIndex == 0 || groupName != data.groupName) {
                let avgHighValue = this.getGroupAvgFocus(activeStage, activeFixtureGroups, data.groupName);
                groupName = data.groupName;
                // append Group Header
                let groupHeader = document.createElement('tr');
                groupHeader.style.backgroundColor = 'rgb(245, 240, 245)';
                let row = document.createElement('tr');

                let header = this.createTableCell(`<h5 class="fst-italic">${data.groupName} Group</h5>`, null, null, true, `text-align: center; vertical-align: middle;`, 4);
                row.appendChild(header);
                tbody.appendChild(row);

                let groupFocus = document.createElement('tr');
                groupFocus.style.backgroundColor = 'rgb(245, 240, 245)';

                let focus = `<div class="m-1 p-1">`
                focus += `<input type="range" name="groupFocus" data-group="${groupName}" class="form-range" min="0" max="255" steps="1" id="group_focus_${groupName}" value="${avgHighValue}">`
                focus += `</div>`

                let focusCell = this.createTableCell(focus, "focusRow", null, true, `text-align: center; vertical-align: middle;`, 4);
                groupFocus.appendChild(focusCell);
                tbody.appendChild(groupFocus);
            }
            let row = document.createElement('tr');
            row.dataset.id = data.id;

            let fixtureNameCelll = this.createTableCell(`<b>${data.name}</b>`, null, null, true, `background-color: ${data.active == true ? '' : '#d1d1d1'}; text-align: left; vertical-align: middle; `);
            row.appendChild(fixtureNameCelll);

            let channelCell = this.createTableCell(`<span>${data.attributes.name}</span><br><span style="font-size:10px;">${data.attributes.type}<br>Channel: ${data.channel + 1}</span>`, null, null, true, `background-color: ${data.active == true ? '' : '#d1d1d1'}; text-align: center; vertical-align: middle;`);
            row.appendChild(channelCell);

            let response = "";
            if (data.attributes.staticValue && !data.attributes.range) {
                response += `<table class="table table-borderless bg-lightgrey">`;
                response += `<tr>`;
                response += `   <td width="15%">`;
                response += `   </td>`;
                response += `   <td width="70%">`;
                response += `       <span class="me-2">0</span><input type="range" ${data.active == false ? "disabled" : ""} name="focusRange" class="form-range me-2 custom-range" style="min-width:200px;width:300px;position:relative;display:inline-block;top:5px" min="0" max="255" steps="1" data-type="int" data-fixtureid="${data.id}" id="${data.id}_${data.uuid}_focus" data-group="${groupName}" data-uuid="${data.uuid}" data-channel="${data.channel}" value="${data.attributes.staticValue.value}"><span class="me-2">255</span>`;
                response += `   </td>`;
                response += `   <td width="15%" style="text-align:left">`;
                response += `       <input type="number" name="focusRangeNum" ${data.active == false ? "disabled" : ""} min="0" max="255" style="width:70px;display:inline-block;" class="form-control" id="${data.id}_${data.uuid}_focusVal" data-fixtureid="${data.id}" data-uuid="${data.uuid}" data-type="int" data-group="${groupName}" data-channel="${data.channel}" value="${data.attributes.staticValue.value}">`;
                response += `   </td>`;
                response += `</tr>`;
                response += `</table>`;
            } else if (data.attributes.range) {
                response += `<table class="table table-borderless bg-lightgrey">`;
                response += `<tr>`;
                response += `   <td width="15%" style="text-align:right">`;
                response += `       <input type="number" name="focusRangeNum" ${data.active == false ? "disabled" : ""} min="0" max="255" style="width:70px;display:inline-block;" class="form-control" id="${data.id}_${data.uuid}_focusValLow" data-fixtureid="${data.id}" data-uuid="${data.uuid}" data-type="dec" data-val="Low" data-group="${groupName}" data-uuid="${data.uuid}" data-channel="${data.channel}" value="${Math.floor(255 * data.attributes.range.lowValue)}">`;
                response += `   </td>`;
                response += `   <td width="70%">`;
                response += `       <span class="me-2">0</span><input type="range" name="focusRange" ${data.active == false ? "disabled" : ""} class="form-range me-2 custom-range" style="min-width:200px;width:300px;position:relative;display:inline-block;top:5px" min="0" max="255" steps="1" data-type="dec" data-val="Low" data-group="${groupName}" data-uuid="${data.uuid}" data-fixtureid="${data.id}" id="${data.id}_${data.uuid}_focus_low" data-channel="${data.channel}" value="${Math.floor(255 * data.attributes.range.lowValue)}"><span class="me-2">255</span>`;
                response += `   </td>`;
                response += `   <td width="15%">`;
                response += `   </td>`;
                response += `</tr>`;
                response += `<tr>`;
                response += `   <td width="15%">`;
                response += `   </td>`;
                response += `   <td with="70%">`;
                response += `       <span class="me-2">0</span><input type="range" name="focusRange" ${data.active == false ? "disabled" : ""} class="form-range me-2 custom-range" style="min-width:200px;width:300px;position:relative;display:inline-block;top:5px" min="0" max="255" steps="1" data-type="dec" data-val="High" data-group="${groupName}" data-fixtureid="${data.id}" data-uuid="${data.uuid}" id="${data.id}_${data.uuid}_focus_high" data-channel="${data.channel}" value="${Math.floor(255 * data.attributes.range.highValue)}"><span class="me-2">255</span>`;
                response += `   </td>`;
                response += `   <td width="15%" style="text-align:left">`;
                response += `       <input type="number" name="focusRangeNum" ${data.active == false ? "disabled" : ""} min="0" max="255" style="width:70px;display:inline-block;" class="form-control" id="${data.id}_${data.uuid}_focusValHigh" data-fixtureid="${data.id}" data-uuid="${data.uuid}" data-type="dec" data-val="High" data-group="${groupName}" data-channel="${data.channel}" value="${Math.floor(255 * data.attributes.range.highValue)}">`;
                response += `    </td>`;
                response += `</tr>`;
                response += `</table>`;
            }
            let focusCell = this.createTableCell(response, null, null, true, `background-color: ${data.active == true ? '' : '#d1d1d1'};; text-align: center; vertical-align: middle;`);
            row.appendChild(focusCell);

            tbody.appendChild(row);

            rowIndex++;
        };
        $('input[name="focusRangeNum"]').on('change', function (ele) {
            const { type, fixtureid, uuid, val } = this.dataset;

            if (type === "int") {
                const value = maestro.SettingsApp.safeMinMax(this.value, 0, 255);
                document.getElementById(`${fixtureid}_${uuid}_focus`).value = value;
                maestro.SettingsApp.setFocus(fixtureid, this.dataset.channel, value);
            }

            if (type === "dec") {
                const lowValue = document.getElementById(`${fixtureid}_${uuid}_focus_low`);
                const highValue = document.getElementById(`${fixtureid}_${uuid}_focus_high`);
                const lowValueInput = document.getElementById(`${fixtureid}_${uuid}_focusValLow`);
                const highValueInput = document.getElementById(`${fixtureid}_${uuid}_focusValHigh`);

                if (val === "Low") {
                    if (Number(this.value) > Number(highValue.value)) {
                        lowValue.value = highValue.value;
                        lowValueInput.value = highValue.value;
                    } else {
                        lowValueInput.value = maestro.SettingsApp.safeMinMax(this.value, 0, 255);
                    }
                }

                if (val === "High") {
                    if (Number(this.value) < Number(lowValue.value)) {
                        highValue.value = lowValue.value;
                        highValueInput.value = lowValue.value;
                    } else {
                        highValueInput.value = maestro.SettingsApp.safeMinMax(this.value, 0, 255);
                    }
                }

                maestro.SettingsApp.setFocus(fixtureid, this.dataset.channel, highValue.value, lowValue.value);
            }
        });
        $('input[name="focusRange"]').on('input', function (ele) {
            const { type, fixtureid, uuid, val } = this.dataset;

            if (type === "int") {
                const value = maestro.SettingsApp.safeMinMax(this.value, 0, 255);
                document.getElementById(`${fixtureid}_${uuid}_focusVal`).value = value;
            }

            if (type === "dec") {
                const lowValue = document.getElementById(`${fixtureid}_${uuid}_focus_low`);
                const highValue = document.getElementById(`${fixtureid}_${uuid}_focus_high`);
                const lowValueInput = document.getElementById(`${fixtureid}_${uuid}_focusValLow`);
                const highValueInput = document.getElementById(`${fixtureid}_${uuid}_focusValHigh`);

                if (val === "Low") {
                    if (Number(this.value) > Number(highValue.value)) {
                        lowValue.value = highValue.value;
                        lowValueInput.value = highValue.value;
                    } else {
                        lowValueInput.value = maestro.SettingsApp.safeMinMax(this.value, 0, 255);
                    }
                }

                if (val === "High") {
                    if (Number(this.value) < Number(lowValue.value)) {
                        highValue.value = lowValue.value;
                        highValueInput.value = lowValue.value;
                    } else {
                        highValueInput.value = maestro.SettingsApp.safeMinMax(this.value, 0, 255);
                    }
                }
            }
        });
        $('input[name="focusRange"]').on('mouseup', function (ele) {
            if (!maestro.SettingsApp.leftMouseClick(ele)) return;

            let type = this.dataset.type;
            let fixtureId = this.dataset.fixtureid;
            let uuid = this.dataset.uuid;
            let val = this.dataset.val;

            if (type == "int") {
                let input = document.getElementById(`${fixtureId}_${uuid}_focusVal`);
                let event = new Event('change');
                input.dispatchEvent(event);
            }
            if (type == "dec") {
                let input = document.getElementById(`${fixtureId}_${uuid}_focusVal${val}`);
                let event = new Event('change');
                input.dispatchEvent(event);
            }
        });
        $('input[name="groupFocus"]').on('mouseup', function (ele) {
            if (!maestro.SettingsApp.leftMouseClick(ele)) return;
            let groupName = this.dataset.group;
            $(`input[name="focusRangeNum"][data-group="${groupName}"]`).each(function (index, ele) {
                if (ele.disabled) return;

                let event = new Event('change');
                this.dispatchEvent(event);
            });

        });
        $('input[name="groupFocus"]').on('input', function (ele) {
            let highValue = this.value;
            let lowValue = 0;
            let groupName = this.dataset.group;

            $(`input[name="focusRangeNum"][data-group="${groupName}"]`).each(function (index, ele) {
                let fixtureId = ele.dataset.fixtureid;
                let type = ele.dataset.type;
                let uuid = ele.dataset.uuid;

                if (ele.disabled) return;

                if (type == "int") {
                    document.getElementById(`${fixtureId}_${uuid}_focusVal`).value = highValue;
                    document.getElementById(`${fixtureId}_${uuid}_focus`).value = highValue;
                }
                if (type == "dec") {
                    document.getElementById(`${fixtureId}_${uuid}_focusValLow`).value = lowValue;
                    document.getElementById(`${fixtureId}_${uuid}_focusValHigh`).value = highValue;
                    document.getElementById(`${fixtureId}_${uuid}_focus_low`).value = lowValue;
                    document.getElementById(`${fixtureId}_${uuid}_focus_high`).value = highValue;
                }

            }).promise().done(function () {
                $('button[name="allFocussBtn"]').prop('disabled', false);
            });
        });
    };
    dimmerTable = async (activeStage, activeFixtureGroups) => {
        var tData = [];

        for (let group of activeFixtureGroups) {
            if (group.fixtureId) {
                for (let fixtureId of group.fixtureId) {
                    let fixture = activeStage.fixture.find(ele => ele.id == fixtureId);
                    let index = 0;
                    for (let attribute of fixture.attribute) {
                        if (attribute.type == "DIMMER" || attribute.type == "MASTER_DIMMER") {
                            if (!attribute.range && attribute.type == "DIMMER") {
                                attribute.range = this.calculateRange({ lowValue: 0, highValue: 255 });
                            }
                            tData.push(
                                {
                                    id: fixture.id,
                                    uuid: maestro.SettingsApp.getUuid(),
                                    active: fixture.enabled,
                                    name: fixture.name,
                                    attributes: attribute,
                                    channel: index,
                                    type: attribute.type,
                                    groupName: group.name
                                });
                        }
                        index++;
                    }
                }
            }
        }

        //table builder
        let table = document.getElementById('dimmers');
        let tbody = document.createElement('tbody');
        table.appendChild(tbody);
        let groupName;

        let rowIndex = 0;
        for (let data of tData) {


            if (rowIndex == 0 || groupName != data.groupName) {
                let avgHighValue = this.getGroupAvgDimmer(activeStage, activeFixtureGroups, data.groupName);
                groupName = data.groupName;
                // append Group Header
                let groupHeader = document.createElement('tr');
                groupHeader.style.backgroundColor = 'rgb(245, 240, 245)';

                let header = this.createTableCell(`<h5 class="fst-italic">${data.groupName} Group</h5>`, null, null, true, `text-align: center; vertical-align: middle;`, 4);
                groupHeader.appendChild(header);
                tbody.appendChild(groupHeader);

                let groupDimmer = document.createElement('tr');
                groupDimmer.style.backgroundColor = 'rgb(245, 240, 245)';

                let dimmer = `<div class="m-1 p-1">`
                dimmer += `<input type="range" name="groupDimmer" data-group="${groupName}" class="form-range" min="0" max="255" steps="1" id="group_dimmer_${groupName}" value="${avgHighValue}">`
                dimmer += `</div>`

                let dimmerCell = this.createTableCell(dimmer, "dimmerRow", null, true, `text-align: center; vertical-align: middle;`, 4);
                groupDimmer.appendChild(dimmerCell);
                tbody.appendChild(groupDimmer);
            }

            let row = document.createElement('tr');
            row.dataset.id = data.id;

            let fixtureNameCelll = this.createTableCell(`<b>${data.name}</b>`, null, null, true, `background-color: ${data.active == true ? '' : '#d1d1d1'};; text-align: left; vertical-align: middle; `);
            row.appendChild(fixtureNameCelll);

            let channelCell = this.createTableCell(`<span>${data.attributes.name}</span><br><span style="font-size:10px;">${data.attributes.type}<br>Channel: ${data.channel + 1}</span>`, null, null, true, `background-color: ${data.active == true ? '' : '#d1d1d1'};; text-align: center; vertical-align: middle;`);
            row.appendChild(channelCell);

            let response = "";


            if (data.attributes.staticValue) {
                response += `<table class="table table-borderless bg-lightgrey">`;
                response += `<tr>`;
                response += `   <td width="15%">`;
                response += `   </td>`;
                response += `   <td width="70%">`;
                response += `       <span class="me-2">0</span><input type="range" name="dimmerRange" ${data.active == false ? "disabled" : ""} class="form-range me-2 custom-range" style="min-width:200px;width:300px;position:relative;display:inline-block;top:5px" min="0" max="255" steps="1" data-type="int" data-fixtureid="${data.id}" id="${data.id}_${data.uuid}_dimmer" data-group="${groupName}" data-uuid="${data.uuid}" data-channel="${data.channel}" value="${data.attributes.staticValue.value}"><span class="me-2">255</span>`;
                response += `   </td>`;
                response += `   <td width="15%" style="text-align:left">`;
                response += `       <input type="number" name="dimmerRangeNum" ${data.active == false ? "disabled" : ""} min="0" max="255" style="width:70px;display:inline-block;" class="form-control" id="${data.id}_${data.uuid}_dimmerVal" data-fixtureid="${data.id}" data-uuid="${data.uuid}" data-type="int" data-group="${groupName}" data-channel="${data.channel}" value="${data.attributes.staticValue.value}">`;
                response += `   </td>`;
                response += `</tr>`;
                response += `</table>`;
            }
            if (data.attributes.range) {
                response += `<table class="table table-borderless bg-lightgrey">`;
                response += `<tr>`;
                response += `   <td width="15%" style="text-align:right">`;
                response += `       <input type="number" name="dimmerRangeNum" ${data.active == false ? "disabled" : ""} min="0" max="255" style="width:70px;display:inline-block;" class="form-control" id="${data.id}_${data.uuid}_dimmerValLow" data-fixtureid="${data.id}" data-uuid="${data.uuid}" data-type="dec" data-val="Low" data-group="${groupName}" data-uuid="${data.uuid}" data-channel="${data.channel}" value="${Math.floor(255 * data.attributes.range.lowValue)}">`;
                response += `   </td>`;
                response += `   <td width="70%">`;
                response += `       <span class="me-2">0</span><input type="range" name="dimmerRange" ${data.active == false ? "disabled" : ""} class="form-range me-2 custom-range" style="min-width:200px;width:300px;position:relative;display:inline-block;top:5px" min="0" max="255" steps="1" data-type="dec" data-val="Low" data-group="${groupName}" data-uuid="${data.uuid}" data-fixtureid="${data.id}" id="${data.id}_${data.uuid}_dimmer_low" data-channel="${data.channel}" value="${Math.floor(255 * data.attributes.range.lowValue)}"><span class="me-2">255</span>`;
                response += `   </td>`;
                response += `   <td width="15%">`;
                response += `   </td>`;
                response += `</tr>`;
                response += `<tr>`;
                response += `   <td width="15%">`;
                response += `   </td>`;
                response += `   <td with="70%">`;
                response += `       <span class="me-2">0</span><input type="range" name="dimmerRange" ${data.active == false ? "disabled" : ""} class="form-range me-2 custom-range" style="min-width:200px;width:300px;position:relative;display:inline-block;top:5px" min="0" max="255" steps="1" data-type="dec" data-val="High" data-group="${groupName}" data-fixtureid="${data.id}" data-uuid="${data.uuid}" id="${data.id}_${data.uuid}_dimmer_high" data-channel="${data.channel}" value="${Math.floor(255 * data.attributes.range.highValue)}"><span class="me-2">255</span>`;
                response += `   </td>`;
                response += `   <td width="15%" style="text-align:left">`;
                response += `       <input type="number" name="dimmerRangeNum" ${data.active == false ? "disabled" : ""} min="0" max="255" style="width:70px;display:inline-block;" class="form-control" id="${data.id}_${data.uuid}_dimmerValHigh" data-fixtureid="${data.id}" data-uuid="${data.uuid}" data-type="dec" data-val="High" data-group="${groupName}" data-channel="${data.channel}" value="${Math.floor(255 * data.attributes.range.highValue)}">`;
                response += `    </td>`;
                response += `</tr>`;
                response += `</table>`;
            }
            let dimmersCell = this.createTableCell(response, null, null, true, `background-color: ${data.active == true ? '' : '#d1d1d1'}; text-align: center; vertical-align: middle;`);
            row.appendChild(dimmersCell);

            tbody.appendChild(row);

            rowIndex++;
        }

        $('input[name="dimmerRangeNum"]').on('change', function (ele) {
            const fixtureId = this.dataset.fixtureid;
            const uuid = this.dataset.uuid;
            const type = this.dataset.type;
            const val = this.value;

            if (type === "int") {
                const newValue = maestro.SettingsApp.safeMinMax(val, 0, 255);
                document.getElementById(`${fixtureId}_${uuid}_dimmer`).value = newValue;
                maestro.SettingsApp.setDimmer(fixtureId, this.dataset.channel, newValue);
            }

            if (type === "dec") {
                const lowValue = document.getElementById(`${fixtureId}_${uuid}_dimmer_low`).value;
                const highValue = document.getElementById(`${fixtureId}_${uuid}_dimmer_high`).value;

                if (this.dataset.val === "Low") {
                    if (Number(val) > Number(highValue)) {
                        document.getElementById(`${fixtureId}_${uuid}_dimmer_low`).value = highValue;
                        document.getElementById(`${fixtureId}_${uuid}_dimmerValLow`).value = highValue;
                    } else {
                        document.getElementById(`${fixtureId}_${uuid}_dimmer_low`).value = maestro.SettingsApp.safeMinMax(val, 0, 255);
                    }
                }

                if (this.dataset.val === "High") {
                    if (Number(val) < Number(lowValue)) {
                        document.getElementById(`${fixtureId}_${uuid}_dimmer_high`).value = lowValue;
                        document.getElementById(`${fixtureId}_${uuid}_dimmerValHigh`).value = lowValue;
                    } else {
                        document.getElementById(`${fixtureId}_${uuid}_dimmerValHigh`).value = maestro.SettingsApp.safeMinMax(val, 0, 255);
                    }
                }

                maestro.SettingsApp.setDimmer(fixtureId, this.dataset.channel, highValue, lowValue);
            }
        });
        $('input[name="dimmerRange"]').on('input', function (ele) {
            const fixtureId = this.dataset.fixtureid;
            const uuid = this.dataset.uuid;
            const type = this.dataset.type;
            const val = this.value;

            if (type === "int") {
                document.getElementById(`${fixtureId}_${uuid}_dimmerVal`).value = maestro.SettingsApp.safeMinMax(val, 0, 255);
            }

            if (type === "dec") {
                const lowValue = document.getElementById(`${fixtureId}_${uuid}_dimmer_low`).value;
                const highValue = document.getElementById(`${fixtureId}_${uuid}_dimmer_high`).value;

                if (this.dataset.val === "Low") {
                    if (Number(val) > Number(highValue)) {
                        document.getElementById(`${fixtureId}_${uuid}_dimmer_low`).value = highValue;
                        document.getElementById(`${fixtureId}_${uuid}_dimmerValLow`).value = maestro.SettingsApp.safeMinMax(highValue, 0, 255);
                    } else {
                        document.getElementById(`${fixtureId}_${uuid}_dimmerValLow`).value = maestro.SettingsApp.safeMinMax(val, 0, 255);
                    }
                }

                if (this.dataset.val === "High") {
                    if (Number(val) < Number(lowValue)) {
                        document.getElementById(`${fixtureId}_${uuid}_dimmer_high`).value = lowValue;
                        document.getElementById(`${fixtureId}_${uuid}_dimmerValHigh`).value = maestro.SettingsApp.safeMinMax(lowValue, 0, 255);
                    } else {
                        document.getElementById(`${fixtureId}_${uuid}_dimmerValHigh`).value = maestro.SettingsApp.safeMinMax(val, 0, 255);
                    }
                }
            }
        });

        $('input[name="dimmerRange"]').on('mouseup', function (ele) {
            if (!maestro.SettingsApp.leftMouseClick(ele)) return;

            let type = this.dataset.type;
            let fixtureId = this.dataset.fixtureid;
            let uuid = this.dataset.uuid;

            if (type == "int") {
                let input = document.getElementById(`${fixtureId}_${uuid}_dimmerVal`);
                let event = new Event('change');
                input.dispatchEvent(event);
            }
            if (type == "dec") {
                let val = this.dataset.val;
                let input = document.getElementById(`${fixtureId}_${uuid}_dimmerVal${val}`);
                let event = new Event('change');
                input.dispatchEvent(event);
            }

        });
        $('input[name="groupDimmer"]').on('mouseup', function (ele) {
            if (!maestro.SettingsApp.leftMouseClick(ele)) return;
            let groupName = this.dataset.group;
            $(`input[name="dimmerRangeNum"][data-group="${groupName}"]`).each(function (index, ele) {
                if (ele.disabled) return;
                let event = new Event('change');
                this.dispatchEvent(event);
            });

        });
        $('input[name="groupDimmer"]').on('input', function (ele) {
            let highValue = this.value;
            let lowValue = 0;
            let groupName = this.dataset.group;

            $(`input[name="dimmerRangeNum"][data-group="${groupName}"]`).each(function (index, ele) {
                let fixtureId = ele.dataset.fixtureid;
                let type = ele.dataset.type;
                let uuid = ele.dataset.uuid;

                if (ele.disabled) return;

                if (type == "int") {
                    document.getElementById(`${fixtureId}_${uuid}_dimmerVal`).value = highValue;
                    document.getElementById(`${fixtureId}_${uuid}_dimmer`).value = highValue;
                }
                if (type == "dec") {
                    document.getElementById(`${fixtureId}_${uuid}_dimmerValLow`).value = lowValue;
                    document.getElementById(`${fixtureId}_${uuid}_dimmerValHigh`).value = highValue;
                    document.getElementById(`${fixtureId}_${uuid}_dimmer_low`).value = lowValue;
                    document.getElementById(`${fixtureId}_${uuid}_dimmer_high`).value = highValue;
                }

            }).promise().done(function () {
                $('button[name="allDimmersBtn"]').prop('disabled', false);
            });
        });

        $('button[name="allDimmersBtn"]').on('click', async function (ele) {
            let highValue = this.dataset.value;
            $('button[name="allDimmersBtn"]').prop('disabled', true);

            //group dimmers
            document.getElementById(`group_dimmer_Primary`).value = highValue;
            document.getElementById(`group_dimmer_Secondary`).value = highValue;
            document.getElementById(`group_dimmer_Tertiary`).value = highValue;

            $('input[name="dimmerRangeNum"]').each(function (index, ele) {
                let fixtureId = ele.dataset.fixtureid;
                let type = ele.dataset.type;
                let uuid = ele.dataset.uuid;

                if (type == "int") {
                    document.getElementById(`${fixtureId}_${uuid}_dimmerVal`).value = highValue;
                    document.getElementById(`${fixtureId}_${uuid}_dimmer`).value = highValue;
                }
                if (type == "dec") {
                    document.getElementById(`${fixtureId}_${uuid}_dimmerValLow`).value = 0;
                    document.getElementById(`${fixtureId}_${uuid}_dimmerValHigh`).value = highValue;
                    document.getElementById(`${fixtureId}_${uuid}_dimmer_low`).value = 0;
                    document.getElementById(`${fixtureId}_${uuid}_dimmer_high`).value = highValue;
                }

                let event = new Event('change');
                ele.dispatchEvent(event);

            }).promise().done(function () {
                $('button[name="allDimmersBtn"]').prop('disabled', false);
            });
        });

        await this.getBrightness().then(() => {
            let val = Math.floor(this.brightness.value * 255);
            document.getElementById('master_dimmer').value = val;
            maestro.SettingsApp.setDimmerValue(val);
        });

        document.getElementById('master_dimmer').addEventListener('change', function (ele) {
            maestro.SettingsApp.setMasterDimmer(this.value);
        });
        document.getElementById('master_dimmer').addEventListener('input', function (ele) {
            maestro.SettingsApp.setDimmerValue(this.value);
        })
    };
    setMasterDimmer = async (value) => {
        let url = `${maestro.SettingsApp.maestroUrl}api/${this.apiVersion}/brightness`;

        value = value / 255;

        let options = {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: value })
        };

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            return true
        } catch (error) {
            if (this.logging)
                console.error('Fatal error updating master dimmer:', error);
        }
    };
    setDimmer = async (fixtureId, channel, valueHigh, valueLow = null) => {
        let stage = await this.getActiveStage();
        let fixtures = stage.fixture.filter(fixture => fixture.id == fixtureId);

        for (let fixture of fixtures) {
            let index = 0;
            for (let attr of fixture.attribute) {
                if (attr.type == "DIMMER") {
                    if (index == channel) {
                        attr.range = this.calculateRange({ highValue: valueHigh, lowValue: valueLow });
                        this.putAttribute(fixture.id, index, { attribute: attr });
                    }
                }
                if (attr.type == "MASTER_DIMMER") {
                    if (index == channel) {
                        attr.staticValue.value = valueHigh;
                        this.putAttribute(fixture.id, index, { attribute: attr });
                    }
                }
                index++;
            }
        }
    };
    setFocus = async (fixtureId, channel, valueHigh, valueLow = null) => {
        let stage = await this.getActiveStage();
        let fixtures = stage.fixture.filter(fixture => fixture.id == fixtureId);

        for (let fixture of fixtures) {
            let index = 0;
            for (let attr of fixture.attribute) {
                if (attr.type == "STATIC" && (attr.name.toUpperCase() == "FOCUS" || attr.name.toUpperCase().indexOf("FOCUS") !== -1)) {
                    if (index == channel) {
                        attr.staticValue.value = valueHigh;
                        this.putAttribute(fixture.id, index, { attribute: attr });
                    }
                }
                if (attr.type == "ZOOM") {
                    if (index == channel) {
                        attr.range = this.calculateRange({ highValue: valueHigh, lowValue: valueLow });
                        this.putAttribute(fixture.id, index, { attribute: attr });
                    }
                }
                index++;
            }
        }
    };
};
maestro.SettingsApp = new SettingsApp(document.currentScript.src);
maestro.SettingsApp.init();