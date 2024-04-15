var maestro = maestro || {};
class SettingsApp extends Globals {
    constructor(scriptSource, loggingOn = false) {
        super()
        this.scriptSource = scriptSource;
        this.loggingOn = loggingOn;
        this.maestroUrl = this.parseMaestroUrl();
    }
    currentFixture;

    start = async () => {
        await this.getStages();
        this.controlPageLink();

        this.stageTable(this.stage);

        this.fixtureTable(this.activeStage, this.activeStageFixtureGroups);

        this.bindMacroBtn();
        await this.loadMacros(function (macros) {
            maestro.SettingsApp.macroTable(macros);
            maestro.SettingsApp.checkRunningMacros(macros)
        });
        this.getBackupDate();
    }
    getBackupDate = async (stageId = this.stageId) => {
        let backupDate = await this.getLocalSetting("fixture_backup").then(backupData => {
            if (backupData && backupData.stageId == stageId) {
                return backupData.date;
            }
        });
        if (backupDate) {
            backupDate = this.formatDate(new Date(JSON.parse(backupDate)));
            backupDate = `${backupDate} - <a href="#" id="restoreBackup">Restore</a>`;
            document.getElementById('backupDate').innerHTML = backupDate;

            document.getElementById('restoreBackup').addEventListener('click', async () => {
                if (confirm('Are you sure you want to restore this backup?\n\nALL CURRENT FIXTURE SETTINGS IN THIS STAGE WILL BE OVERWRITTEN!!!\n\nIf a Show Cue is currently running, it will be stopped by resoring this backup.')) {
                    await this.restoreAllFixtures();
                }
            });
        } else {
            document.getElementById('backupDate').innerText = "Never";
        }

        document.getElementById('backupFixtures').addEventListener('click', async () => {
            if (confirm('Are you sure you want to backup all fixtures?\n\nThis will overwrite the current backup.')) {
                await this.backupAllFixtures();
                this.getBackupDate();
            }
        });
    }
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
    applyMacro = async (macroName) => {
        var keys = await this.retrieveAllKeys()
        this.currentCue = await this.getShowState();

        let macros = await this.loadMacros();
        macros = macros.filter(macro => macro.macro.name == macroName && macro.macro.stageId == this.stageId);

        if (macros) {
            const pendingMacroIds = macros.flatMap(macro => macro.macro.fixtures.map(fixture => fixture.id));
            const runningMacroIds = keys.filter(key => pendingMacroIds.some(id => key.endsWith(id)));

            if (runningMacroIds.length > 0) {
                return alert('Another Macro is already running on fixtures with the same id as contained in this macro!\n\nRunning multiple macros on the same fixture simultaneously can cause issues!');
            }
        }

        for (let macro of macros) {
            for (let fixture of macro.macro.fixtures) {
                let currentProfile = await this.getFixture(fixture.id);

                //await this.patchFixture(fixture.id, fixtureProfile);

                let diff = this.getObjectDiff(fixture.attribute, currentProfile.attribute);
                if (diff.length == 0) {
                    return alert('Macro is the same as the currently running Profile, and would have no effect.')
                }

                //save original profile prior to modification
                await this.storeFixtureProfile(macroName, currentProfile)
                this.processAttributeChanges(diff, fixture.id, fixture, currentProfile);
            }
        }
        const deleteButton = document.querySelector('button[name="btn_delete"][data-id="' + macroName + '"]');
        deleteButton.disabled = true;
        const applyButton = document.querySelector('button[name="btn_apply"][data-id="' + macroName + '"]');
        applyButton.disabled = true;
        const clearButton = document.querySelector('button[name="btn_clr"][data-id="' + macroName + '"]');
        clearButton.disabled = false;
    }
    revertMacro = async (macroName) => {
        this.currentCue = await this.getShowState();
        var macros = await this.loadMacros();
        macros = macros.filter(macro => macro.macro.name == macroName && macro.macro.stageId == this.stageId);

        if (macros) {
            var fixtures = macros[0].macro.fixtures;

            for (let fixture of fixtures) {
                let originalProfile = await maestro.SettingsApp.retrieveFixtureProfile(macroName, fixture.id);

                //get diff between original and current profile
                let diff = this.getObjectDiff(originalProfile.fixture.attribute, fixture.attribute);

                //revert changes
                this.processAttributeChanges(diff, fixture.id, originalProfile.fixture, fixture);
                maestro.SettingsApp.deleteFixtureProfile(macroName, fixture.id);
            }

            const applyButton = document.querySelector('button[name="btn_apply"][data-id="' + macroName + '"]');
            applyButton.disabled = false;
            const deleteButton = document.querySelector('button[name="btn_delete"][data-id="' + macroName + '"]');
            deleteButton.disabled = false;
            const clearButton = document.querySelector('button[name="btn_clr"][data-id="' + macroName + '"]');
            clearButton.disabled = true;
        }
    };
    deleteMacro = async (macroName) => {
        await this.loadMacros().then(macros => {
            macros = macros.filter(macro => macro.macro.name !== macroName && macro.macro.stageId == this.stageId);
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
                this.retrieveFixtureProfile(macro.macro.name, fixture.id).then(fixtureProfile => {
                    if (fixtureProfile) {
                        const deleteButton = document.querySelector('button[name="btn_delete"][data-id="' + macro.macro.name + '"]');
                        deleteButton.disabled = true;
                        const applyButton = document.querySelector('button[name="btn_apply"][data-id="' + macro.macro.name + '"]');
                        applyButton.disabled = true;
                        const clearButton = document.querySelector('button[name="btn_clr"][data-id="' + macro.macro.name + '"]');
                        clearButton.disabled = false;
                    }
                });
            }
        }
    };
    processAttributeChanges = (diff, fixtureId, newProfile, oldProfile) => {
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

                //we do not need the response, so not awaiting this function
                this.putAttribute(fixtureId, attr, update);
            }
        };
    }
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

            //make sure we have updated profiles
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
                window.location.reload();
            });
        });
    };
    changeStrobeParam = async (id) => {
        let fixture = await this.getFixture(id);

        let newStrobeValue = document.getElementById('strobe_val_' + id).value;
        let newShutterValue = document.getElementById('shutter_val_' + id).value;

        var updatedName = "";
        let [fixtureName, dmxValues] = fixture.name.split("_");

        if (!newStrobeValue && !newShutterValue) {
            updatedName = `${fixtureName}`
        } else {
            updatedName = `${fixtureName}_${newShutterValue}:${newStrobeValue}`;
            fixture.name = updatedName;
        }

        fixture.name = updatedName;

        document.getElementById('name_' + id).innerText = updatedName;

        let fixtureProfile = {
            fixture: fixture
        };

        this.patchFixture(id, fixtureProfile);

    };
    fixtureTable = (activeStage, activeFixtureGroups) => {
        var tData = [];
        for (let group of activeFixtureGroups) {
            let i = 0;
            if (group.fixtureId) {
                for (let fixtureId of group.fixtureId) {
                    let fixture = activeStage.fixture.find(ele => ele.id == fixtureId);
                    let [fixtureName, dmxValues] = fixture.name.split("_");
                    let [normalValue, strobeValue] = dmxValues ? dmxValues.split(":") : [];
                    let panOrTilt = fixture.attribute.some(ele => ele.type === 'PAN' || ele.type === 'TILT');

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
                        pantilt: panOrTilt
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
                if ($element == "shutter" || $element == "strobe" || $element == "pantilt")
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
                        if (row.pantilt) {
                            return '<span role="button" class="panOrTilt cursor-pointer" data-id="' + row.id + '"><img src="pan_tilt.svg"></span>';
                        }
                    }
                },
                {
                    field: 'name',
                    title: 'Fixture Name',
                    align: 'left',
                    valign: 'middle',
                    clickToSelect: false,
                    formatter: function (value, row, index) {
                        return '<span id="name_' + row.id + '">' + value + '</span>';
                    }
                },
                {}, {}, {},
                {
                    field: 'shutter',
                    title: 'Shutter Open',
                    align: 'center',
                    valign: 'middle',
                    clickToSelect: false,
                    formatter: function (value, row, index) {
                        if (row.name.toUpperCase().includes("IGNORE")) {
                            return "";
                        }
                        return '<input type="number" name="shutter_val" data-id="' + row.id + '" id="shutter_val_' + row.id + '" min="0" max="255" value="' + (row.shutter || "") + '">';
                    }
                },
                {
                    field: 'strobe',
                    title: 'Strobe',
                    align: 'center',
                    valign: 'middle',
                    clickToSelect: false,
                    formatter: function (value, row, index) {
                        if (row.name.toUpperCase().includes("IGNORE")) {
                            return "";
                        }
                        return '<input type="number" name="shutter_strobe" data-id="' + row.id + '" id="strobe_val_' + row.id + '" min="0" max="255" value="' + (row.strobe || "") + '">';
                    }
                },
                {
                    field: 'active',
                    title: '',
                    align: 'center',
                    valign: 'middle',
                    clickToSelect: false,
                    formatter: function (value, row, index) {
                        if (row.name.toUpperCase().includes("IGNORE")) {
                            return "";
                        }
                        return '<input type="checkbox" name="fixture_cbx" value="' + row.id + '" id="cb_' + row.id + '" class="checkbox">';
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
                if (row.name.toUpperCase().includes("IGNORE")) {
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
        $('input[name="shutter_val"]').on('change', function (btn) {
            maestro.SettingsApp.changeStrobeParam(this.dataset.id);
        });
        $('input[name="shutter_strobe"]').on('change', function (btn) {
            maestro.SettingsApp.changeStrobeParam(this.dataset.id);
        });
        $('.panOrTilt').on('click', function (btn) {
            let id = this.dataset.id;
            
            $('#panTiltFinder').modal('show');
            document.getElementById('panTiltFinder').dataset.id = id;

            document.getElementById('panRange').addEventListener('input', function () {
                document.getElementById('panRangeVal').innerText = this.value;
                maestro.SettingsApp.setPanTilt(document.getElementById('panTiltFinder').dataset.id);
            });
            document.getElementById('panRange').addEventListener('change', function () {
                document.getElementById('panRangeVal').innerText = this.value;
                maestro.SettingsApp.setPanTilt(document.getElementById('panTiltFinder').dataset.id);
            });
            document.getElementById('tiltRange').addEventListener('input', function () {
                document.getElementById('tiltRangeVal').innerText = this.value;
                maestro.SettingsApp.setPanTilt(document.getElementById('panTiltFinder').dataset.id);
            });
            document.getElementById('tiltRange').addEventListener('change', function (id) {
                document.getElementById('tiltRangeVal').innerText = this.value;
                maestro.SettingsApp.setPanTilt(document.getElementById('panTiltFinder').dataset.id);
            });
            document.getElementById('panTiltReset').addEventListener('click', function () {
                document.getElementById('panTiltReset').disabled = true;

                maestro.SettingsApp.resetPanTilt(document.getElementById('panTiltFinder').dataset.id);

                document.getElementById('panTiltReset').disabled = false;
            });           
        });
    }
    setPanTilt = async (id) => {
        if(!this.currentFixture)    
            this.currentFixture = await this.getFixture(id);

        let fixture = this.currentFixture;

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
        let fixture = await this.getFixture(id);
        let fixturePanIndex = fixture.attribute.findIndex(ele => ele.type === 'PAN');
        let fixtureTiltIndex = fixture.attribute.findIndex(ele => ele.type == 'TILT');

        let panRange = this.calculateRange({ lowValue: 0, highValue: 255 });
        let titRange = this.calculateRange({ lowValue: 0, highValue: 255 });
        await this.putAttribute(id, fixturePanIndex, { attribute: { range: panRange } });
        await this.putAttribute(id, fixtureTiltIndex, { attribute: { range: titRange } });
    }
    macroTable = (macros) => {
        var tData = [];

        for (let macro of macros) {
            var fixtures = macro.macro.fixtures;
            tData.push({
                name: macro.macro.name,
                length: fixtures.length,
            });
        };


        $('#macros').bootstrapTable({
            columns: [{
                field: 'name',
                title: 'Macro Name'
            }, {
                field: 'length',
                title: 'Number of Fixtures'
            }],
            data: tData,
            columns: [{}, {},
            {
                field: 'button_apply',
                title: '',
                align: 'center',
                valign: 'middle',
                clickToSelect: false,
                formatter: function (value, row, index) {
                    return `<button class="btn btn-danger" name="btn_apply" data-id="${row.name}">Apply</button>`;
                }
            },
            {
                field: 'button_clear',
                title: '',
                align: 'center',
                valign: 'middle',
                clickToSelect: false,
                formatter: function (value, row, index) {
                    return `<button class="btn btn-success" name="btn_clr" data-id="${row.name}" disabled>Clear</button>`;
                }
            },
            {
                field: 'button_delete',
                title: '',
                align: 'center',
                valign: 'middle',
                clickToSelect: false,
                formatter: function (value, row, index) {
                    return `<button class="btn btn-warning" name="btn_delete" data-id="${row.name}">Delete</button>`;
                }
            }],
            rowAttributes: function (row, index) {
                return {
                    'data-id': row.name
                }
            }
        });
        $('button[name="btn_apply"]').on('click', function (btn) {
            var macro = this.dataset.id
            maestro.SettingsApp.applyMacro(macro);
        });
        $('button[name="btn_clr"]').on('click', function (btn) {
            var macro = this.dataset.id
            maestro.SettingsApp.revertMacro(macro);
        });
        $('button[name="btn_delete"]').on('click', function (btn) {
            if (confirm('Are you sure you want to delete this macro?')) {
                var macro = this.dataset.id
                maestro.SettingsApp.deleteMacro(macro);
            }
        });
    }
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
                            'background-color': '#ffcce0'
                        }
                    }

                }
            },
            sortName: 'active',
            sortOrder: 'desc'
        });

    }
};
maestro.SettingsApp = new SettingsApp(document.currentScript.src);
maestro.SettingsApp.start();