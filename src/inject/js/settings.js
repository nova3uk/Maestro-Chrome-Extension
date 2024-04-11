

var maestro = maestro || {};
class SettingsApp extends Globals {
    constructor(scriptSource, loggingOn = false) {
        super()
        this.scriptSource = scriptSource;
        this.loggingOn = loggingOn;
        this.maestroUrl = this.parseMaestroUrl();
    }
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
    }
    backupAllFixtures = async () => {
        let fixtures = await this.getActiveStage();
        await this.saveLocalSetting("fixtures", fixtures);
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
    storeFixtureProfile = async (macroName, fixture) => {
        let currentSetting = await this.getFixture(fixture.id);
        await this.saveLocalSetting("fixtureProfile_" + macroName + "_" + fixture.id, { "fixture": currentSetting });
    };
    retrieveFixtureProfile = async (macroName, fixtureId) => {
        return await this.getLocalSetting("fixtureProfile_" + macroName + "_" + fixtureId);
    };
    deleteFixtureProfile = async (macroName, fixtureId) => {
        this.deleteLocalSetting("fixtureProfile_" + macroName + "_" + fixtureId);
    };
    applyMacro = async (macroName) => {
        await this.loadMacros().then(macros => {
            macros = macros.filter(macro => macro.macro.name == macroName && macro.macro.stageId == this.stageId);

            if (macros) {
                for (let macro of macros) {
                    for (let fixture of macro.macro.fixtures) {
                        this.storeFixtureProfile(macroName, fixture).then(nextAction => {
                            let fixtureProfile = {
                                fixture: fixture
                            };

                            this.patchFixture(fixture.id, fixtureProfile);

                            const applyButton = document.querySelector('button[name="btn_apply"][data-id="' + macroName + '"]');
                            applyButton.disabled = true;
                            const clearButton = document.querySelector('button[name="btn_clr"][data-id="' + macroName + '"]');
                            clearButton.disabled = false;
                        });


                    }
                }
            }
        });
    };
    revertMacro = async (macroName) => {

        await this.loadMacros().then(macros => {
            macros = macros.filter(macro => macro.macro.name == macroName && macro.macro.stageId == this.stageId);
            if (macros) {
                var fixtures = macros[0].macro.fixtures;
                for (let fixture of fixtures) {
                    maestro.SettingsApp.retrieveFixtureProfile(macroName, fixture.id).then(fixtureProfile => {
                        maestro.SettingsApp.patchFixture(fixture.id, fixtureProfile);
                        maestro.SettingsApp.deleteFixtureProfile(macroName, fixture.id);
                    });
                }
                const applyButton = document.querySelector('button[name="btn_apply"][data-id="' + macroName + '"]');
                applyButton.disabled = false;
                const clearButton = document.querySelector('button[name="btn_clr"][data-id="' + macroName + '"]');
                clearButton.disabled = true;
            }
        });
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
                        const applyButton = document.querySelector('button[name="btn_apply"][data-id="' + macro.macro.name + '"]');
                        applyButton.disabled = true;
                        const clearButton = document.querySelector('button[name="btn_clr"][data-id="' + macro.macro.name + '"]');
                        clearButton.disabled = false;
                    }
                });
            }
        }
    };
    patchFixture = async (fixtureId, fixture) => {
        delete fixture.fixture.fixtureProfileModeId;
        delete fixture.fixture.id;

        await this.prepareFetch(
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
    fixtureTable = function (activeStage, activeFixtureGroups) {
        var tData = [];
        for (let group of activeFixtureGroups) {
            let i = 0;
            if (group.fixtureId) {
                for (let fixtureId of group.fixtureId) {
                    let fixture = activeStage.fixture.find(ele => ele.id == fixtureId);
                    tData.push({
                        id: fixture.id,
                        name: fixture.name,
                        active: fixture.enabled,
                        fixtureGroup: this.groups.find(ele => ele.id == fixture.fixtureGroupId).name,
                        fixtureGroupId: fixture.fixtureGroupId,
                        fixturePosition: i,
                        index: fixture.index
                    });
                    i++;
                }
            }
        }
        tData = tData.sort((a, b) => {
            return a.fixtureGroup.localeCompare(b.fixtureGroup);
        });

        $('#fixtures').bootstrapTable({
            onClickRow: function (row) {
                document.getElementById('cb_' + row.id).checked = !document.getElementById('cb_' + row.id).checked;
            },
            columns: [{
                field: 'name',
                title: 'Fixture Name'
            }, {
                field: 'fixtureGroup',
                title: 'Fixture Group'
            }, {
                field: 'fixturePosition',
                title: 'Arrangement'
            }, {
                field: 'active',
                title: 'Enabled'
            }, {
                field: 'fixtureGroupId',
                title: ''
            }],
            data: tData,
            columns: [{}, {}, {}, {},
            {
                field: 'operate',
                title: '',
                align: 'center',
                valign: 'middle',
                clickToSelect: false,
                formatter: function (value, row, index) {
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
    macroTable = function (macros) {
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
    stageTable = function (stages) {
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