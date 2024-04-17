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

    start = async () => {
        if (!await this.watchOffline()) {
            return;
        }

        await this.getStages();
        this.activeStageId = this.stageId;

        this.controlPageLink();

        this.stageTable(this.stage);

        this.fixtureTable(this.activeStage, this.activeStageFixtureGroups);

        this.bindMacroBtn();
        await this.loadMacros(function (macros) {
            maestro.SettingsApp.macroTable(macros);
            maestro.SettingsApp.checkRunningMacros(macros)
        });
        this.getBackupDate();
        setInterval(() => {
            this.watchForStageChange();
        }, 5000);
        setInterval(() => {
            this.watchOffline();
        }, 5000);

    }
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
    watchForStageChange = async () => {
        const loadedStage = await this.getUrl(`${this.maestroUrl}api/${this.apiVersion}/output/stage`);
        if (this.activeStageId != loadedStage.activeStageId) {
            document.getElementById('panTiltFinder').style.display = "none";
            $('#modalStageReloaded').modal({ backdrop: 'static', keyboard: false });
            $('#modalStageReloaded').modal('show');

            document.getElementById('btnReloadPage').addEventListener('click', function () {
                window.location.reload();
            });
        }
    };
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
            const runningMacroIds = keys.filter(key => pendingMacroIds.some(id => key == (`macro_active_${id}`)));

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
                let originalProfile = await maestro.SettingsApp.retrieveFixtureProfile(fixture.id);

                //get diff between original and current profile
                let diff = this.getObjectDiff(originalProfile.fixture.attribute, fixture.attribute);

                //revert changes
                this.processAttributeChanges(diff, fixture.id, originalProfile.fixture, fixture);
                maestro.SettingsApp.deleteFixtureProfile(fixture.id);
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

                let fixtureProfile = await this.retrieveFixtureProfile(fixture.id);

                if (fixtureProfile) {
                    if (fixtureProfile.macroName == macro.macro.name) {
                        const deleteButton = document.querySelector('button[name="btn_delete"][data-id="' + macro.macro.name + '"]');
                        deleteButton.disabled = true;
                        const applyButton = document.querySelector('button[name="btn_apply"][data-id="' + macro.macro.name + '"]');
                        applyButton.disabled = true;
                        const clearButton = document.querySelector('button[name="btn_clr"][data-id="' + macro.macro.name + '"]');
                        clearButton.disabled = false;
                    }
                }

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
                document.location.reload();
            });
        });
    };
    changeStrobeParam = async (id) => {
        let newStrobeValue = document.getElementById('strobe_val_' + id).value;
        let newShutterValue = document.getElementById('shutter_val_' + id).value;

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
                    let hasShutterOrStrobe = fixture.attribute.some(ele => ele.type === 'SHUTTER' || ele.type === 'STROBE');
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
                if ($element == "shutter" || $element == "strobe" || $element == "pantilt" || $element == "ignore")
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
                            return '<span role="button" class="panOrTilt cursor-pointer" data-id="' + row.id + '" data-toggle="tooltip" data-placement="top" title="Set Pan/Tilt"><img src="pan_tilt.svg"></span>';
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
                {}, {}, {
                    field: 'active',
                    title: 'Active',
                    align: 'center',
                    valign: 'middle',
                    clickToSelect: false,
                    formatter: function (value, row, index) {
                        return row.active == true ? 'Yes' : 'No';
                    }
                },
                {
                    field: 'shutter',
                    title: 'Shutter Open',
                    align: 'center',
                    valign: 'middle',
                    clickToSelect: false,
                    formatter: function (value, row, index) {
                        if (row.ignore)
                            return "";
                        if (!row.hasShutterOrStrobe)
                            return;
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
                        if (row.ignore)
                            return "";
                        if (!row.hasShutterOrStrobe)
                            return;

                        return '<input type="number" name="shutter_strobe" data-id="' + row.id + '" id="strobe_val_' + row.id + '" min="0" max="255" value="' + (row.strobe || "") + '">';
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
                let s = $('<span role="button" class="panOrTilt cursor-pointer" data-id="panOrTiltAll" data-toggle="tooltip" data-placement="top" title="Set Pan/Tilt for All Movers"><img src="pan_tilt.svg">');
                $(this).find(".th-inner").append(s)
            }
        })
        $('.checkbox[name="fixture_ignore"]').on('change', function () {
            if ($(this).is(':checked')) {
                maestro.SettingsApp.saveLocalSetting("fixture_ignore_" + $(this).data('id'), { ignore: true })
            } else {
                maestro.SettingsApp.deleteLocalSetting("fixture_ignore_" + $(this).data('id'))
            }
            document.location.reload();
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
                document.getElementById('panRangeVal').innerText = this.value;
                maestro.SettingsApp.panTiltHandler(document.getElementById('panTiltFinder').dataset.id);
            });
            document.getElementById('tiltRange').addEventListener('input', function () {
                document.getElementById('tiltRangeVal').innerText = this.value;
                maestro.SettingsApp.panTiltHandler(document.getElementById('panTiltFinder').dataset.id);
            });
            document.getElementById('panTiltReset').addEventListener('click', function () {
                document.getElementById('panRange').value = 0;
                document.getElementById('tiltRange').value = 0;
                document.getElementById('panRangeVal').innerText = "";
                document.getElementById('tiltRangeVal').innerText = "";
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
                            'background-color': '#ffcce0'
                        }
                    }

                }
            },
            sortName: 'active',
            sortOrder: 'desc'
        });

    };
};
maestro.SettingsApp = new SettingsApp(document.currentScript.src);
maestro.SettingsApp.start();