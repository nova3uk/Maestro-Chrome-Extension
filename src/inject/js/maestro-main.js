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
    strobeFixtures = [];

    getFilePath = (fileName) => `chrome-extension://${this.ExtensionId}/${fileName}`;

    getUrl = async (url) => {
        try {
            const response = await fetch(url);
            const responseJson = await response.json();
            return responseJson;
        } catch (e) {
            console.log("Cannot connect to the API, is Maestro running?", e);
        }
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
    setStrobe = async (onOrOff) => {
        const allFixtures = [
            { fixtures: this.shutterFixtures, attributeType: "SHUTTER" },
            { fixtures: this.strobeFixtures, attributeType: "STROBE" }
        ];

        for (let { fixtures, attributeType } of allFixtures) {
            for (let fixture of fixtures) {
                let [fixtureName, shutterValues] = fixture.name.split("_");
                let [normalValue, strobeValue] = shutterValues ? shutterValues.split(":") : [];

                if (!shutterValues || fixtureName.toUpperCase().includes("IGNORE")) continue;

                let attributeId = fixture.attribute.findIndex(attr => attr.type === attributeType);
                if (!attributeId) continue;

                let setValue = onOrOff == 1 ? strobeValue : normalValue;

                this.putAttribute(fixture.id, attributeId, setValue);
            }
        }
    };
    putAttribute = async (fixtureId, attributeId, value) => {
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
            console.error('Fatal error updating fixture data:', error);
        }
    };
    findByText = (needle, haystack = document) => {
        return [...haystack.querySelectorAll('*')].filter(val =>
            Array.from(val.childNodes).some(({ nodeType, textContent, parentElement }) =>
                nodeType === 3 && textContent.includes(needle) && !(parentElement.tagName === 'SCRIPT')
            )
        );
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
            return true;
        } catch (e) {
            return false;
        }
    };
    startTimer = () => {
        this.btnTimer = setTimeout(this.startUp, 1000);
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
            //console.log("Strobe Button Lost!")
            this.clearTimer();
            this.ready = false;
            this.clearStage();
            this.startTimer();
        }
    };
    startUp = async () => {
        try {
            // Try to find the Strobe buttono then load the stage and fixtures.
            let btnFound = await this.findButton(this.bindButton);
            if (btnFound) {
                this.getStage();
            }else{
                this.startTimer();
            }
        } catch (e) {
            this.startTimer();
            console.log(e, "Error loading stage!");
        }
    };
    onReady = () => {
        this.timerInterval = setInterval(this.buttonLostWatcher, 1000);
    }
}

// Initialize & assign to global object
maestro.App = new App(document.currentScript.src);
maestro.App.startUp();