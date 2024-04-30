"use strict";
var maestro = maestro || {};
class Effects extends Globals {
    constructor(scriptSource, loggingOn = false) {
        super()
        this.scriptSource = scriptSource;
        this.loggingOn = loggingOn;
        this.maestroUrl = this.parseMaestroUrl();
    }
    //maestro.Effects.animateFigureEight(128, 80, 50,50,180, 'start')
    //maestro.Effects.animateFigureEightWithFan(128, 80, 50,50,180, 10, 'start')
    //maestro.Effects.animateCircle(128, 80, 50,50,180, 'start')
    //maestro.Effects.animateCircleWithFan(128, 80, 50, 50, 180, 10, 'start')
    //maestro.Effects.animateUpDown(80, 50, 50, 180, 'start')
    //maestro.Effects.animateLeftRight(128, 50, 50, 180, 'start')

    animationRunning = false;

    canRun = () => {
        if (!this.animationRunning) return true;
    };
    startEffect = async (effect, ...args) => {
        if (typeof this[effect] === 'function') {
            await this[effect](...args);
        }
    }
    animateFigureEight = async (startPan, startTilt, delay, radius, numSteps, startOrStop) => {
        if (startOrStop === 'start') {
            if (!this.canRun()) return;
            this.animationRunning = true;
        } else {
            this.animationRunning = false;
            this.resetPanTiltD();
            return;
        }

        startPan = Number(startPan);
        startTilt = Number(startTilt);
        delay = Number(delay);
        radius = Number(radius);
        numSteps = Number(numSteps);

        let fixtures = maestro.SettingsApp.getAllMovers();
        let numFixtures = fixtures.length;

        // Calculate the angle between each step
        let angleStep = 2 * Math.PI / numSteps;

        while (this.animationRunning) {
            for (let step = 0; step < numSteps; step++) {
                if (!this.animationRunning) return;
                for (let i = 0; i < numFixtures; i++) {
                    // Calculate the current angle of this fixture
                    let angle = step * angleStep;

                    // Calculate the pan and tilt settings for this fixture
                    let pan = startPan + radius * Math.cos(angle);
                    let tilt = startTilt + radius * Math.sin(2 * angle) / 2;

                    // Apply the pan and tilt settings to the fixture
                    await maestro.Effects.setPanTiltD(fixtures[i].id, pan, tilt);
                }

                // Wait for the specified delay before moving to the next step
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    };
    animateFigureEightWithFan = async (startPan, startTilt, delay, radius, numSteps, fanRate, startOrStop) => {
        if (startOrStop === 'start') {
            if (!this.canRun()) return;
            this.animationRunning = true;
        } else {
            this.animationRunning = false;
            this.resetPanTiltD();
            return;
        }

        startPan = Number(startPan);
        startTilt = Number(startTilt);
        delay = Number(delay);
        radius = Number(radius);
        numSteps = Number(numSteps);
        fanRate = Number(fanRate);

        let fixtures = maestro.SettingsApp.getAllMovers();
        let numFixtures = fixtures.length;

        // Calculate the angle between each step
        let angleStep = 2 * Math.PI / numSteps;

        while (this.animationRunning) {
            for (let step = 0; step < numSteps; step++) {
                if (!this.animationRunning) return;
                for (let i = 0; i < numFixtures; i++) {
                    // Calculate the current angle of this fixture
                    let angle = step * angleStep;

                    // Calculate the pan and tilt settings for this fixture
                    let pan = startPan + radius * Math.cos(angle) + i * fanRate;
                    let tilt = startTilt + radius * Math.sin(2 * angle) / 2 + i * fanRate;

                    // Apply the pan and tilt settings to the fixture
                    await maestro.Effects.setPanTiltD(fixtures[i].id, pan, tilt);
                }

                // Wait for the specified delay before moving to the next step
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    };
    animateCircle = async (startPan, startTilt, delay, radius, numSteps, startOrStop) => {
        if (startOrStop === 'start') {
            if (!this.canRun()) return;
            this.animationRunning = true;
        } else {
            this.animationRunning = false;
            this.resetPanTiltD();
            return;
        }

        startPan = Number(startPan);
        startTilt = Number(startTilt);
        delay = Number(delay);
        radius = Number(radius);
        numSteps = Number(numSteps);

        let fixtures = maestro.SettingsApp.getAllMovers();
        let numFixtures = fixtures.length;

        // Calculate the angle between each step
        let angleStep = 2 * Math.PI / numSteps;

        while (this.animationRunning) {
            for (let step = 0; step < numSteps; step++) {
                if (!this.animationRunning) return;
                for (let i = 0; i < numFixtures; i++) {
                    // Calculate the current angle of this fixture
                    let angle = step * angleStep;

                    // Calculate the pan and tilt settings for this fixture
                    let pan = startPan + radius * Math.cos(angle);
                    let tilt = startTilt + radius * Math.sin(angle);

                    // Apply the pan and tilt settings to the fixture
                    await maestro.Effects.setPanTiltD(fixtures[i].id, pan, tilt);
                }

                // Wait for the specified delay before moving to the next step
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    };
    animateCircleWithFan = async (startPan, startTilt, delay, radius, numSteps, fanRate, startOrStop) => {
        if (startOrStop === 'start') {
            if (!this.canRun()) return;
            this.animationRunning = true;
        } else {
            this.animationRunning = false;
            this.resetPanTiltD();
            return;
        }

        startPan = Number(startPan);
        startTilt = Number(startTilt);
        delay = Number(delay);
        radius = Number(radius);
        numSteps = Number(numSteps);
        fanRate = Number(fanRate);

        let fixtures = maestro.SettingsApp.getAllMovers();
        let numFixtures = fixtures.length;

        // Calculate the angle between each step
        let angleStep = 2 * Math.PI / numSteps;

        while (this.animationRunning) {
            for (let step = 0; step < numSteps; step++) {
                if (!this.animationRunning) return;
                for (let i = 0; i < numFixtures; i++) {
                    // Calculate the current angle of this fixture, adjusted by the fan rate
                    let angle = (step + i * fanRate) % numSteps * angleStep;

                    // Calculate the pan and tilt settings for this fixture
                    let pan = startPan + radius * Math.cos(angle);
                    let tilt = startTilt + radius * Math.sin(angle);

                    // Apply the pan and tilt settings to the fixture
                    await maestro.Effects.setPanTiltD(fixtures[i].id, pan, tilt);
                }

                // Wait for the specified delay before moving to the next step
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    };
    animateUpDown = async (startTilt, delay, range, numSteps, startOrStop) => {
        if (startOrStop === 'start') {
            if (!this.canRun()) return;
            this.animationRunning = true;
        } else {
            this.animationRunning = false;
            this.resetPanTiltD();
            return;
        }

        startTilt = Number(startTilt);
        delay = Number(delay);
        range = Number(range);
        numSteps = Number(numSteps);

        let fixtures = maestro.SettingsApp.getAllMovers();
        let numFixtures = fixtures.length;

        while (this.animationRunning) {
            for (let step = 0; step < numSteps; step++) {
                if (!this.animationRunning) return;
                for (let i = 0; i < numFixtures; i++) {
                    // Calculate the tilt setting for this fixture using a sine wave function
                    let t = step / numSteps;
                    let tilt = startTilt + range * Math.sin(t * 2 * Math.PI);

                    // Apply the tilt setting to the fixture
                    await maestro.Effects.setTiltD(fixtures[i].id, tilt);
                }

                // Wait for the specified delay before moving to the next step
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    };
    animateLeftRight = async (startPan, delay, range, numSteps, startOrStop) => {
        if (startOrStop === 'start') {
            if (!this.canRun()) return;
            this.animationRunning = true;
        } else {
            this.animationRunning = false;
            this.resetPanTiltD();
            return;
        }

        startPan = Number(startPan);
        delay = Number(delay);
        range = Number(range);
        numSteps = Number(numSteps);

        let fixtures = maestro.SettingsApp.getAllMovers();
        let numFixtures = fixtures.length;

        // Calculate the angle between each step
        let angleStep = 2 * Math.PI / numSteps;

        while (this.animationRunning) {
            for (let step = 0; step < numSteps; step++) {
                if (!this.animationRunning) return;
                for (let i = 0; i < numFixtures; i++) {
                    // Calculate the pan setting for this fixture based on a sine wave
                    let pan = startPan + range * (Math.sin(step * angleStep) / 2 + 0.5);

                    // Apply the pan setting to the fixture
                    await maestro.Effects.setPanTiltD(fixtures[i].id, pan, fixtures[i].tilt);
                }

                // Wait for the specified delay before moving to the next step
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    };
    setTiltD = async (id, tiltValue) => {
        const fixture = maestro.SettingsApp.fixtures.find(ele => ele.id == id);
        const ignoreFixtures = await this.getLocalSetting("fixture_ignore_" + fixture.id);
        if (ignoreFixtures) return;

        const fixtureTiltIndex = fixture.attribute.findIndex(ele => ele.type == 'TILT');

        const tiltRange = this.calculateRange({ lowValue: tiltValue, highValue: tiltValue });

        await maestro.Effects.putAttribute(id, fixtureTiltIndex, { attribute: { range: tiltRange } }, maestro.SettingsApp.stageId);
    };
    setPanTiltD = async (id, panValue, tiltValue) => {
        const fixture = maestro.SettingsApp.fixtures.find(ele => ele.id == id);
        const ignoreFixtures = await this.getLocalSetting("fixture_ignore_" + fixture.id);
        if (ignoreFixtures) return;

        const fixturePanIndex = fixture.attribute.findIndex(ele => ele.type === 'PAN');
        const fixtureTiltIndex = fixture.attribute.findIndex(ele => ele.type == 'TILT');

        const panRange = this.calculateRange({ lowValue: panValue, highValue: panValue });
        const tiltRange = this.calculateRange({ lowValue: tiltValue, highValue: tiltValue });

        await maestro.Effects.putAttribute(id, fixturePanIndex, { attribute: { range: panRange } }, maestro.SettingsApp.stageId);
        await maestro.Effects.putAttribute(id, fixtureTiltIndex, { attribute: { range: tiltRange } }, maestro.SettingsApp.stageId);
    };

    resetPanTiltD = async () => {
        let fixtures = maestro.SettingsApp.getAllMovers();

        let panRange = this.calculateRange({ lowValue: 0, highValue: 255 });
        let titRange = this.calculateRange({ lowValue: 0, highValue: 255 });

        for (let fixture of fixtures) {
            const fixtureTiltIndex = fixture.attribute.findIndex(ele => ele.type == 'TILT');
            await maestro.Effects.putAttribute(fixture.id, fixtureTiltIndex, { attribute: { range: tiltRange } }, maestro.SettingsApp.stageId);

        }
    };
};
maestro.Effects = new Effects(document.currentScript.src);