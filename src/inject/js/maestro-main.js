var maestro = maestro || {};

class App {
    constructor(scriptSource) {
        if (scriptSource) {
            var src = new URL(scriptSource);
            this.ExtensionId = src.host;
        }
    }

    // Public variables
    btnTimer;
    timerInterval;
    ready = false;
    strobeBtn;
    stageId = null;
    stage = null;
    fixtures = [];
    shutterFixtures = [];

    getFilePath = (fileName) => `chrome-extension://${this.ExtensionId}/${fileName}`;

    getUrl = async (url) => {
        const response = await fetch(url);
        const responseJson = await response.json();
        return responseJson;
    }

    clearStage = () => {
        this.ready = false;
        this.strobeBtn = null;
        this.stageId = null;
        this.stage = null;
        this.fixtures = [];
        this.shutterFixtures = [];
    };

    getStage = async () => {
        this.clearStage();
        const state = await this.getUrl("/api/v1/output/stage");
        this.stageId = state.activeStageId;
        this.stage = state;
        this.fixtures = state.stage.filter(ele => ele.id == state.activeStageId)[0].fixture;

        for (let fixture of this.fixtures) {
            let hasColorWheel = false;
            let hasShutter = false;

            if (fixture.enabled == false)
                continue;

            for (let attr of fixture.attribute) {
                if (attr.type == "SHUTTER") {
                    hasShutter = true;
                }
                if (attr.type == "COLOR_WHEEL") {
                    hasColorWheel = true;
                }
                if (hasColorWheel == true && hasShutter == true) {
                    this.shutterFixtures.push(fixture);
                    break;
                }
            }
        }
    };

    setStrobe = async (onOrOff) => {
        let fixtures = this.shutterFixtures;

        for (let fixture of fixtures) {
            let fixtureId = fixture.id;
            let fixtureName = fixture.name;
            let hasProps = fixtureName.indexOf("_");
            let ignore = fixtureName.toUpperCase().indexOf("IGNORE");
            let shutterValues;
            let strobeValue;
            let normalValue;
            let attributeId;
            let setValue;

            // Get shutter value to set from name
            if (hasProps !== -1) {
                shutterValues = fixtureName.split("_")[1].split(":");
                normalValue = shutterValues[0];
                strobeValue = shutterValues[1];
            } else {
                continue;
            }

            // Find the attribute, fixed.
            for (let attr in fixture.attribute) {
                if (fixture.attribute[attr].type == "SHUTTER") {
                    attributeId = attr;
                    break;
                }
            }

            // Skip on if no attributeid found
            if (!attributeId || ignore !== -1) continue;

            if (onOrOff == 1) {
                setValue = strobeValue;
            } else {
                setValue = normalValue;
            }

            let url = `/api/v1/output/stage/${this.stageId}/fixture/${fixtureId}/attribute/${attributeId}`;

            let dataToUpdate = {
                "attribute": {
                    "staticValue": {
                        "value": setValue
                    }
                }
            };
            let jsonString = JSON.stringify(dataToUpdate);

            let options = {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: jsonString
            };

            try {
                const response = await fetch(url, options);
                if (!response.ok) {
                    throw new Error(`HTTP error ${response.status}`);
                }
                const updatedData = await response.json();
            } catch (error) {
                console.error('Error updating data:', error);
            }
        }
    };

    findByText = (needle, haystack = document) => {
        return [...haystack.querySelectorAll('*')].reduce((acc, val) => {
            for (const { nodeType, textContent, parentElement } of val.childNodes) {
                if (nodeType === 3 && textContent.includes(needle) && !(parentElement.tagName === 'SCRIPT')) acc.push(parentElement);
            }
            return acc;
        }, []);
    };

    bindButton = () => {
        if (this.ready) return;

        try {
            this.strobeBtn.addEventListener('mousedown', () => this.setStrobe(1), false);
            this.strobeBtn.addEventListener('mouseup', () => this.setStrobe(0), false);
            this.ready = true;
            this.onReady();
            console.log("Maestro Interceptor Loaded!")
        } catch (e) {
            console.log("Could not bind Strobe Button onClick event!")
        }
    };

    findButton = (callback) => {
        try {
            this.strobeBtn = this.findByText('Strobe')[0];

            if (this.strobeBtn === undefined) {
                throw new Error("Strobe button not found");
            }

            if (typeof callback === 'function') {
                callback();
            }
        } catch (e) {
            //console.log("Couldn't find the Strobe button!");
            this.startTimer();
        }
    };

    startTimer = () => {
        this.btnTimer = setTimeout(this.startup, 1000);
    };

    clearTimer = () => {
        clearTimeout(this.btnTimer);
        clearInterval(this.timerInterval);
    };

    buttonLostWatcher = () => {
        try {
            let btn = this.findByText('Strobe')[0];
            if (btn === undefined) {
                throw new Error
            }
        } catch (e) {
            // Button has been lost
            console.log("Strobe Button Lost!")
            this.clearTimer();
            this.ready = false;
            this.clearStage();
            this.startTimer();
        }
    };

    startup = () => {
        try {
            // Try to load the stage and fixtures.
            this.getStage();
            this.findButton(this.bindButton);
        } catch (e) {
            //console.log(e, "Error loading stage!");
        }
    };

    onReady = () => {
        this.timerInterval = setInterval(this.buttonLostWatcher, 1000);
    }
}

// Initialize & assign to global object
maestro.App = new App(document.currentScript.src);
maestro.App.startup();