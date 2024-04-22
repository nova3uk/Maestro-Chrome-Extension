var maestro = maestro || {};
class SettingsApp extends Globals {
    constructor(scriptSource, loggingOn = false) {
        super()
        this.scriptSource = scriptSource;
        this.loggingOn = loggingOn;
        this.maestroUrl = this.parseMaestroUrl();
    }
    currentFixture;
    activeStageId;
    ignoredFixtures = [];

    init = async () => {
        this.logging = await this.getSetting("loggingToggle");

        if (!await this.watchOffline()) {
            return;
        }

        await this.getStages();
        this.activeStageId = this.stageId;

        this.controlPageLink();
        this.stageTable(this.stage);
        this.fixtureTable(this.activeStage, this.activeStageFixtureGroups);
        this.bindMacroBtn();
        this.cuesTable();
        this.togglesTable(this.activeStage, this.activeStageFixtureGroups);
        this.loadBackupRestoreBtns();
        this.bindAutoFog();
        this.bindAutoEffects();
        this.tabObserver();

        await this.loadMacros(async (macros) => {
            await maestro.SettingsApp.macroTable(macros);
            await maestro.SettingsApp.checkRunningMacros(macros)
        });

        setInterval(() => {
            this.watchForStageChange();
        }, 5000);
        setInterval(() => {
            this.watchOffline();
        }, 5000);

        setTimeout(() => {
            var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
            var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl)
            });
        }, 1000);
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
            let state = await this.getShowState();
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
        let fixtures = await this.getActiveStage();
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
    applyMacro = async (macroName, stageId) => {
        try {
            var promiseArray = [];
            var keys = await this.retrieveAllKeys()
            this.currentCue = await this.getShowState();

            let macros = await this.loadMacros();
            macros = macros.filter(macro => macro.macro.name == macroName && macro.macro.stageId == stageId);

            if (macros) {
                const pendingMacroIds = macros.flatMap(macro => macro.macro.fixtures.map(fixture => fixture.id));
                const runningMacroIds = keys.filter(key => pendingMacroIds.some(id => key == (`macro_active_${id}`)));

                if (runningMacroIds.length > 0) {
                    return alert('Another Macro is already running on fixtures with the same id as contained in this macro!\n\nRunning multiple macros on the same fixture simultaneously can cause issues!');
                }
            }

            for (let macro of macros) {
                for (let fixture of macro.macro.fixtures) {
                    let currentProfile = await this.getFixture(fixture.id);

                    if (!currentProfile) continue;

                    let diff = this.getObjectDiff(fixture.attribute, currentProfile.attribute);
                    if (diff.length == 0) {
                        return alert('Macro is the same as the currently running Profile, and would have no effect.')
                    }

                    //save original profile prior to modification
                    promiseArray.push(new Promise((resolve, reject) => {
                        try {
                            this.processAttributeChanges(diff, fixture.id, fixture, currentProfile).then(() => {
                                resolve();
                            });
                        } catch (e) {
                            reject(e)
                        }
                    }));

                    await Promise.all(promiseArray).then(() => {
                        this.storeFixtureProfile(macroName, currentProfile);
                    });

                    if (macro.macro.cueId) {
                        await this.getCues().then(async (cues) => {
                            let cueIndex = cues.findIndex(cue => cue.uuid === macro.macro.cueId);
                            await this.startCue(cueIndex);
                        })
                    }
                }
            }
            const deleteButton = document.querySelector('button[name="btn_delete"][data-id="' + macroName + '"]');
            deleteButton.disabled = true;
            const applyButton = document.querySelector('button[name="btn_apply"][data-id="' + macroName + '"]');
            applyButton.disabled = true;
            const clearButton = document.querySelector('button[name="btn_clr"][data-id="' + macroName + '"]');
            clearButton.disabled = false;

            document.querySelector(`[data-id="${macroName}"][data-stageid="${stageId}"]`).classList.add('macro-active');
        } catch (e) {
            if (this.logging)
                console.error('Error applying Macro:', e);
        }
    }
    revertMacro = async (macroName, stageId) => {
        this.currentCue = await this.getShowState();
        var macros = await this.loadMacros();
        macros = macros.filter(macro => macro.macro.name == macroName && macro.macro.stageId == stageId);
        var promiseArray = [];

        if (macros) {
            var fixtures = macros[0].macro.fixtures;

            for (let fixture of fixtures) {
                let originalProfile = await maestro.SettingsApp.retrieveFixtureProfile(fixture.id);

                if (originalProfile) {
                    //get diff between original and current profile
                    let diff = this.getObjectDiff(originalProfile.fixture.attribute, fixture.attribute);
                    promiseArray.push(new Promise((resolve, reject) => {
                        try {
                            maestro.SettingsApp.processAttributeChanges(diff, fixture.id, originalProfile.fixture, fixture).then(() => {
                                resolve();
                            });
                        } catch (e) {
                            reject(e)
                        }
                    }))
                } else {
                    maestro.SettingsApp.deleteFixtureProfile(fixture.id);
                }

                await Promise.all(promiseArray).then(() => {
                    maestro.SettingsApp.deleteFixtureProfile(fixture.id);
                });
            }

            const applyButton = document.querySelector('button[name="btn_apply"][data-id="' + macroName + '"]');
            applyButton.disabled = false;
            const deleteButton = document.querySelector('button[name="btn_delete"][data-id="' + macroName + '"]');
            deleteButton.disabled = false;
            const clearButton = document.querySelector('button[name="btn_clr"][data-id="' + macroName + '"]');
            clearButton.disabled = true;

            document.querySelector(`[data-id="${macroName}"][data-stageid="${stageId}"]`).classList.remove('macro-active');
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
                if (fixtureProfile && fixtureProfile.macroName == macro.macro.name) {
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

                for (let prop of attrDiff) {
                    let update = {
                        attribute: {
                            [prop]: attrNew[prop]
                        }
                    };
                    await this.putAttribute(fixtureId, attr, update);
                }
            };
        } catch (e) {
            console.error('Error processing attribute changes:', e);
        }
    };
    putAttribute = async (fixtureId, attributeId, attribute) => {
        let url = `${maestro.SettingsApp.maestroUrl}api/${this.apiVersion}/output/stage/${this.stageId}/fixture/${fixtureId}/attribute/${attributeId}`;

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
            return response.json();
        } catch (error) {
            if (this.logging)
                console.error('Fatal error updating fixture data:', error);
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
        document.getElementById('addMacro').addEventListener('click', async () => {
            const checkboxes = document.querySelectorAll('input[name="fixture_cbx"]:checked');
            if (checkboxes.length == 0) {
                return alert('Please select at least one fixture');
            }
            const values = Array.from(checkboxes).map(checkbox => checkbox.value);

            await this.getActiveStage();

            let macroFixtures = maestro.SettingsApp.activeStage.fixture.filter(fixture => values.includes(fixture.id.toString()));

            var macroName = prompt('Enter a name for the macro', 'Macro Name');
            if (macroName == null || macroName == "") {
                return;
            }

            await maestro.SettingsApp.getLocalSetting("macros").then(macros => {
                if (!macros) {
                    macros = [];
                }
                let macroExists = macros.find(macro => macro.macro.name == macroName && macro.macro.stageId == this.stageId);
                if (macroExists) {
                    return alert('Macro name already exists');
                }
                macros.push({ "macro": { name: macroName, stageId: this.stageId, fixtures: macroFixtures } });
                maestro.SettingsApp.saveLocalSetting("macros", macros);
                document.location.reload();
            });
        });
    };
    changeStrobeParam = async (id) => {
        let newStrobeValue = this.safeMinMax(document.getElementById('strobe_val_' + id).value, 0, 255);
        let newShutterValue = this.safeMinMax(document.getElementById('shutter_val_' + id).value, 0, 255);

        this.saveLocalSetting("strobe_" + id, { strobe: newStrobeValue, shutter: newShutterValue });
    };
    fixtureTable = async (activeStage, activeFixtureGroups) => {
        var tData = [];
        for (let group of activeFixtureGroups) {
            let i = 0;
            if (group.fixtureId) {
                for (let fixtureId of group.fixtureId) {
                    let fixture = activeStage.fixture.find(ele => ele.id == fixtureId);
                    let panOrTilt = fixture.attribute.some(ele => ele.type === 'PAN' || ele.type === 'TILT');
                    let hasShutterOrStrobe = fixture.attribute.find(ele => ele.type === 'SHUTTER' || ele.type === 'STROBE');
                    let shutterParams = await this.getLocalSetting("strobe_" + fixture.id);
                    let normalValue = shutterParams ? shutterParams.shutter : "";
                    let strobeValue = shutterParams ? shutterParams.strobe : "";
                    let ignoreParam = await this.getLocalSetting("fixture_ignore_" + fixture.id);
                    let ignore = ignoreParam ? ignoreParam.ignore : false;

                    if (ignore == true)
                        maestro.SettingsApp.ignoredFixtures.push({ id: fixture.id });

                    tData.push({
                        id: fixture.id,
                        name: fixture.name,
                        fixtureGroup: this.groups.find(ele => ele.id == fixture.fixtureGroupId).name,
                        fixturePosition: i,
                        active: fixture.enabled,
                        shutter: normalValue,
                        strobe: strobeValue,
                        fixtureGroupId: fixture.fixtureGroupId,
                        index: fixture.index,
                        pantilt: panOrTilt,
                        hasShutterOrStrobe: hasShutterOrStrobe,
                        ignore: ignore
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

                document.getElementById('cb_' + row.id).checked = !document.getElementById('cb_' + row.id).checked;
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
                        if (row.hasShutterOrStrobe)
                            return `<span class="text-capitalize">${row.hasShutterOrStrobe.type.charAt(0).toUpperCase() + row.hasShutterOrStrobe.type.slice(1).toLowerCase()}</span>`;
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
                        if (!row.hasShutterOrStrobe)
                            return;
                        return `<input type="number" style="width:70px;" name="shutter_val" data-id="${row.id}" id="shutter_val_${row.id}" min="0" max="255" value="${row.shutter}">`;
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
                        if (!row.hasShutterOrStrobe)
                            return;

                        return `<input type="number" style="width:70px;" name="shutter_strobe" data-id="${row.id}" id="strobe_val_${row.id}" min="0" max="255" value="${row.strobe}">`;
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
                                'background-color': '#66ffcc'
                            }
                        }
                    } else {
                        return {
                            css: {
                                'background-color': '#ffcce0'
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
        $('input[name="shutter_val"]').on('change', function (btn) {
            maestro.SettingsApp.changeStrobeParam(this.dataset.id);
        });
        $('input[name="shutter_strobe"]').on('change', function (btn) {
            maestro.SettingsApp.changeStrobeParam(this.dataset.id);
        });
        $('.panOrTilt').on('click', function (btn) {
            let id = this.dataset.id;
            let fixtureNames = "";
            let fixtureIds = [];

            if (id == "panOrTiltAll") {
                let fixtures = maestro.SettingsApp.getAllMovers();

                for (let f of fixtures) {
                    if (maestro.SettingsApp.ignoredFixtures.find(ele => ele.id == f.id)) {
                        fixtureNames += `<span class="text-danger">(ignored)${f.name}</span><br>`;
                    } else {
                        fixtureNames += `<span>${f.name}</span><br>`;
                        fixtureIds.push(f.id);
                    }
                }
                document.getElementById('panTiltFinder').dataset.id = JSON.stringify(fixtureIds);
                document.getElementById('fixtureName').innerHTML = fixtureNames;
            } else {
                fixtureIds.push(id);
                let fixture = maestro.SettingsApp.fixtures.find(ele => ele.id == id);

                document.getElementById('panTiltFinder').dataset.id = JSON.stringify(id);
                document.getElementById('fixtureName').innerText = fixture.name;
            }

            $('#panTiltFinder').modal('show');

            document.getElementById('panRange').addEventListener('input', function () {
                document.getElementById('panRangeVal').value = maestro.SettingsApp.safeMinMax(this.value, 0, 255);
                maestro.SettingsApp.panTiltHandler(document.getElementById('panTiltFinder').dataset.id);
            });
            document.getElementById('tiltRange').addEventListener('input', function () {
                document.getElementById('tiltRangeVal').value = maestro.SettingsApp.safeMinMax(this.value, 0, 255);;
                maestro.SettingsApp.panTiltHandler(document.getElementById('panTiltFinder').dataset.id);
            });
            document.getElementById('tiltRangeVal').addEventListener('change', function (ele) {
                document.getElementById('tiltRange').value = maestro.SettingsApp.safeMinMax(this.value, 0, 255);
            });
            document.getElementById('panRangeVal').addEventListener('change', function (ele) {
                document.getElementById('panRange').value = maestro.SettingsApp.safeMinMax(this.value, 0, 255);
            });
            document.getElementById('panTiltReset').addEventListener('click', function () {
                document.getElementById('panRange').value = 0;
                document.getElementById('tiltRange').value = 0;
                document.getElementById('panRangeVal').value = "";
                document.getElementById('tiltRangeVal').value = "";
                maestro.SettingsApp.resetPanTiltHandler(document.getElementById('panTiltFinder').dataset.id);
            });
        });
    }
    resetPanTiltHandler = async (id) => {
        let ids = JSON.parse(id);
        if (Array.isArray(ids)) {
            return this.resetPanTiltAll(ids);
        } else {
            return this.resetPanTilt(ids);
        }
    }
    panTiltHandler = async (id) => {
        let ids = JSON.parse(id);
        if (Array.isArray(ids)) {
            return this.panTiltAll(ids);
        } else {
            return this.setPanTilt(ids);
        }
    };
    resetPanTiltAll = async (ids) => {
        for (let id of ids) {
            await this.resetPanTilt(id);
        }
    }
    panTiltAll = async (ids) => {
        for (let id of ids) {
            await this.setPanTilt(id);
        }
    };
    setPanTilt = async (id) => {
        let fixture = maestro.SettingsApp.fixtures.find(ele => ele.id == id);
        let ignoreFixtures = await this.getLocalSetting("fixture_ignore_" + fixture.id);
        if (ignoreFixtures) return;

        let fixturePanIndex = fixture.attribute.findIndex(ele => ele.type === 'PAN');
        let fixtureTiltIndex = fixture.attribute.findIndex(ele => ele.type == 'TILT');

        let panValue = document.getElementById('panRange').value;
        let tiltValue = document.getElementById('tiltRange').value;

        let panRange = this.calculateRange({ lowValue: panValue, highValue: panValue });
        let titRange = this.calculateRange({ lowValue: tiltValue, highValue: tiltValue });
        await this.putAttribute(id, fixturePanIndex, { attribute: { range: panRange } });
        await this.putAttribute(id, fixtureTiltIndex, { attribute: { range: titRange } });
    };
    resetPanTilt = async (id) => {
        let fixture = maestro.SettingsApp.fixtures.find(ele => ele.id == id);
        let fixturePanIndex = fixture.attribute.findIndex(ele => ele.type === 'PAN');
        let fixtureTiltIndex = fixture.attribute.findIndex(ele => ele.type == 'TILT');

        let panRange = this.calculateRange({ lowValue: 0, highValue: 255 });
        let titRange = this.calculateRange({ lowValue: 0, highValue: 255 });
        await this.putAttribute(id, fixturePanIndex, { attribute: { range: panRange } });
        await this.putAttribute(id, fixtureTiltIndex, { attribute: { range: titRange } });
    };
    getAllMovers = () => {
        return maestro.SettingsApp.fixtures.filter(fixture => fixture.attribute.some(attr => attr.type === 'PAN' || attr.type === 'TILT'));
    }
    macroTable = async (macros) => {
        let cues = await this.getCues();

        var tData = [];
        for (let macro of macros) {
            //make sure the fixture affected by the macro is still in the stage
            var fixtures = macro.macro.fixtures.filter(fixture => this.activeStage.fixture.some(activeFixture => activeFixture.id === fixture.id));
            let cue = cues.find(cue => cue.uuid == macro.macro.cueId);

            tData.push({
                macro: macro,
                stageId: macro.macro.stageId,
                name: macro.macro.name,
                length: fixtures.length,
                fixtureName: fixtures.map(fixture => fixture.name),
                cueId: macro.macro.cueId,
                cueName: cue ? cue.name : ""
            });
        };
        //'let diff = this.getObjectDiff(fixture.attribute, currentProfile.attribute);

        $('#macros').bootstrapTable({
            columns: [{
                field: 'name',
                title: 'Macro Name'
            }, {
                field: 'fixtures',
                title: 'Fixtures Affected'
            }, {
                field: 'length',
                title: '#'
            }],
            data: tData,
            columns: [
                {
                    field: 'name',
                    title: 'Macro Name',
                    align: 'left',
                    valign: 'middle',
                    clickToSelect: false,
                    formatter: function (value, row, index) {
                        return `<span>${row.name}</span><span name="editMacroName" role="button" class="cursor-pointer ms-1" style="position:relative;bottom:5px;" data-stageid="${row.stageId}" data-name="${row.name}" data-bs-toggle="tooltip" data-bs-placement="top" title="Rename Macro"><img src="pencil-fill.svg" width="14" height="14"></span>`;
                    }
                }, {},
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
                        if (row.cueId)
                            return `<span class="badge text-bg-warning" name="remove_cue" role="button" style="position:relative; top:-0px;" data-bs-toggle="tooltip" data-bs-placement="top" title="Remove Cue Trigger" data-macroName="${row.name}" data-stageId="${row.stageId}">${row.cueName}&nbsp;<img src="/src/img/x.svg" width="20" height="20"></span>`;
                    }
                },
                {
                    field: 'button_apply',
                    title: '',
                    align: 'center',
                    valign: 'middle',
                    clickToSelect: false,
                    formatter: function (value, row, index) {
                        return `<button class="btn btn-danger" name="btn_apply" data-id="${row.name}" data-stageid="${row.stageId}">Apply</button>`;
                    }
                },
                {
                    field: 'button_clear',
                    title: '',
                    align: 'center',
                    valign: 'middle',
                    clickToSelect: false,
                    formatter: function (value, row, index) {
                        return `<button class="btn btn-success" name="btn_clr" data-id="${row.name}" data-stageid="${row.stageId}" disabled>Clear</button>`;
                    }
                },
                {
                    field: 'button_delete',
                    title: '',
                    align: 'center',
                    valign: 'middle',
                    clickToSelect: false,
                    formatter: function (value, row, index) {
                        return `<button class="btn btn-warning" name="btn_delete" data-id="${row.name}" data-stageid="${row.stageId}">Delete</button>`;
                    }
                }],
            rowAttributes: function (row, index) {
                return {
                    'data-id': row.name,
                    'data-stageid': row.stageId,
                }
            }
        });
        $('span[name="editMacroName"]').on('click', function (btn) {
            var macro = this.dataset.name
            var newName = prompt('Enter a new name for the macro', macro);
            if (newName == null || newName == "") {
                return;
            }
            maestro.SettingsApp.loadMacros().then(macros => {
                if (macros.find(macro => macro.macro.name == newName && macro.macro.stageId == this.dataset.stageid)) {
                    return alert('Macro name already exists');
                }
                for (let m of macros) {
                    if (m.macro.name == macro && m.macro.stageId == this.dataset.stageid) {
                        m.macro.name = newName;
                    }
                }
                maestro.SettingsApp.saveLocalSetting("macros", macros);
                document.location.reload();
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
        $('span[name="remove_cue"]').on('click', async function (btn) {
            let row = document.querySelector(`[data-id="${this.dataset.macroname}"][data-stageid="${this.dataset.stageid}"]`);
            if (row.classList.contains('macro-active')) return;

            if (confirm('Are you sure you want to remove the Cue from this Macro?')) {
                await maestro.SettingsApp.removeCueFromMacro(this.dataset.macroname, this.dataset.stageid);
                await maestro.SettingsApp.saveLocalSetting('activeSettingsTab', 'tabpanel-macros');
                document.location.reload();
            }
        });
    };
    stageTable = (stages) => {
        var tData = [];
        let activeStage = stages.activeStageId;

        for (let stage of stages.stage) {
            tData.push({
                id: stage.id,
                name: stage.name,
                fixtures: stage.fixture.length,
                active: stage.id == activeStage ? "Yes" : ""
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
                            'background-color': '#66ffcc'
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
        let cues = await this.getCues();
        let showState = await this.getShowState();
        const activeCue = cues.find(cue => cue.uuid == showState.currentCue.uuid);
        let macroNames = [];

        for (let cue of cues) {
            if (cue.uuid === activeCue.uuid) {
                cue.active = true;
                cue.playInder = activeCue.playIndex;
                cue.playTime = activeCue.playTime;
                cue.type = activeCue.type;
            }
        }

        await this.loadMacros().then((macros) => {
            for (let macro of macros) {
                macroNames.push({ value: macro.macro.stageId, text: macro.macro.name });
            }
        });

        var tData = [];

        for (let cue of cues) {
            tData.push({
                id: cue.uuid,
                cueName: cue.name,
                active: cue.active,
                status: cue.active ? "Running" : "",
                groupModes: `${cue.params.patternId} / ${cue.secondaryParams.patternId} / ${cue.tertiaryParams.patternId}`,
                list: macroNames
            });
        }

        $('#cues').bootstrapTable({
            data: tData,
            columns: [{}, {}, {},
            {
                field: 'applyCue',
                title: 'Select Macro',
                align: 'center',
                valign: 'middle',
                clickToSelect: false,
                formatter: function (value, row, index) {
                    let select = `<select name="macroList" data-id="${row.id}" class="form-select" style="width: 100%;">`;
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
                    return `<button class="btn btn-primary" name="btn_show_apply" data-id="${row.id}">Apply</button>`;
                }
            },
            {
                field: 'color_wheel',
                title: '',
                align: 'center',
                valign: 'middle',
                clickToSelect: false,
                formatter: function (value, row, index) {
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
                            'background-color': '#66ffcc'
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
            let macro = document.querySelector(`select[name="macroList"][data-id="${this.dataset.id}"]`).value;
            let stageId = document.querySelector(`select[name="macroList"][data-id="${this.dataset.id}"] option:checked`).dataset.stageid;
            if (macro == "") return alert('Please select a macro');
            let cue = cues.find(cue => cue.uuid == this.dataset.id);

            await maestro.SettingsApp.applyCueToMacro(macro, stageId, cue.uuid);
        });

    };
    removeCueFromMacro = async (macroName, stageId) => {
        let macros = await this.loadMacros();
        let macro = macros.find(macro => macro.macro.name == macroName && macro.macro.stageId == stageId);
        if (macro) {
            delete macro.macro.cueId;
            this.saveLocalSetting("macros", macros);
        }
    }
    applyCueToMacro = async (macroName, stageId, cueId) => {
        let row = document.querySelector(`[data-id="${macroName}"][data-stageid="${stageId}"]`);
        if (row.classList.contains('macro-active')) {
            alert("The Macro is active, you need to clear the running macro before you can edit the cue.");
            return false;
        }

        let macros = await this.loadMacros();
        let macro = macros.find(macro => macro.macro.stageId == stageId && macro.macro.name == macroName);
        if (macro) {
            macro.macro.cueId = cueId;
            maestro.SettingsApp.saveLocalSetting("macros", macros);
            await maestro.SettingsApp.saveLocalSetting('activeSettingsTab', 'tabpanel-macros');
            document.location.reload();
        }
    }
    getCues = async () => {
        const show = await this.getUrl(`${this.maestroUrl}api/${this.apiVersion}/show`);
        return show.patternCue;
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
            let i = 0;
            if (group.fixtureId) {
                for (let fixtureId of group.fixtureId) {
                    let fixture = activeStage.fixture.find(ele => ele.id == fixtureId);
                    let attributeTypes = fixture.attribute.map(attr => attr.type);
                    let goboState = await this.getLocalSetting("gobo_state_" + fixtureId);
                    let prismState = await this.getLocalSetting("prism_state_" + fixtureId);

                    tData.push({
                        id: fixture.id,
                        name: fixture.name,
                        active: fixture.enabled,
                        attributes: attributeTypes,
                        goboState: goboState ? goboState.gobo : false,
                        prismState: prismState ? prismState.prism : false
                    });
                }
            }
        }

        $('#toggles').bootstrapTable({
            data: tData,
            columns: [
                {},
                {
                    field: 'toggles',
                    align: 'center',
                    valign: 'middle',
                    clickToSelect: false,
                    formatter: function (value, row, index) {
                        if (row.active == false) return;
                        let btns = "";
                        let btnState = false;
                        if (row.attributes.includes('GOBO')) {
                            if (row.goboState)
                                btnState = row.goboState;
                            btns += `<div class="d-inline">`;
                            btns += `<button class="btn btn-warning my-1 mr-2" style="width:120px;" name="btn_disable_gobos" data-id="${row.id}"${btnState == false ? ' disabled' : ''}>Gobos Off</button>&nbsp;`;
                            btns += `<button class="btn btn-success my-1 mr-2" style="width:120px;" name="btn_enable_gobos" data-id="${row.id}"${btnState == true ? ' disabled' : ''}>Gobos On</button>&nbsp;`;
                            btns += `</div><br>`;
                        }
                        if (row.attributes.includes('PRISM')) {
                            if (row.prismState)
                                btnState = row.prismState;
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
                            'background-color': '#66ffcc'
                        }
                    }
                } else {
                    return {
                        css: {
                            'background-color': '#ffcce0'
                        }
                    }

                }
            }
        });
        $('button[name="btn_disable_gobos"]').on('click', async function (btn) {
            btn.currentTarget.disabled = true;
            $('button[name="btn_enable_gobos"][data-id="' + this.dataset.id + '"]').prop('disabled', false);
            await maestro.SettingsApp.switchGobos(this.dataset.id, false);
        });
        $('button[name="btn_enable_gobos"]').on('click', async function (btn) {
            btn.currentTarget.disabled = true;
            $('button[name="btn_disable_gobos"][data-id="' + this.dataset.id + '"]').prop('disabled', false);
            await maestro.SettingsApp.switchGobos(this.dataset.id);
        });
        $('button[name="btn_disable_prism"]').on('click', async function (btn) {
            btn.currentTarget.disabled = true;
            $('button[name="btn_enable_prism"][data-id="' + this.dataset.id + '"]').prop('disabled', false);
            await maestro.SettingsApp.switchPrisms(this.dataset.id, false);
        });
        $('button[name="btn_enable_prism"]').on('click', async function (btn) {
            btn.currentTarget.disabled = true;
            $('button[name="btn_disable_prism"][data-id="' + this.dataset.id + '"]').prop('disabled', false);
            await maestro.SettingsApp.switchPrisms(this.dataset.id);

        });
    }
    switchGobos = async (fixtureId, onOrOff = true, exceptOpen = true) => {
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
                    await this.putAttribute(fixture.id, index, { attribute: attr });
                    await this.saveLocalSetting("gobo_state_" + fixture.id, { stageId: stage.stageId, gobo: onOrOff })
                }
                index++;
            }
        }
    }
    switchPrisms = async (fixtureId, onOrOff = true, exceptOpen = true) => {
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
    }
    switchColorWheel = async (fixtureId, onOrOff = true, color = [...this.allColors]) => {
        let stage = await this.getActiveStage();
        let fixtures = stage.fixture.filter(fixture => fixture.id == fixtureId);

        for (let fixture of fixtures) {
            let index = 0;
            for (let attr of fixture.attribute) {
                if (attr.type == "COLOR_WHEEL") {
                    // attr.colorWheelSetting.colors.forEach(setting => {
                    //     if (onOrOff == false) {
                    //         setting["enabled"] = false;
                    //     } else {
                    //         setting["enabled"] = true;
                    //     }
                    // });
                    //attr.colorWheelSetting.colors = _.uniqBy(attr.colorWheelSetting.colors, 'name');
                    await this.saveLocalSetting("color_wheel_state_" + fixture.id, { stageId: stage.stageId, prism: onOrOff, profile: fixture })
                    await this.patchFixture(fixture.id, { fixture: fixture });
                }
                index++;
            }
        }
    }
};
maestro.SettingsApp = new SettingsApp(document.currentScript.src, true);
maestro.SettingsApp.init();