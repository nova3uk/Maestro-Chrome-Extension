"use strict";
var maestro = maestro || {};
class Effects extends Globals {
    constructor(scriptSource, loggingOn = false) {
        super()
        this.scriptSource = scriptSource;
        this.loggingOn = loggingOn;
        this.maestroUrl = this.parseMaestroUrl();
    }
    circleAnimationRunning = false;
    figureEightAnimationRunning = false;
    verticalLineAnimationRunning = false;

    animateFigureEight = async (startPan, startTilt, delay, radius, numSteps, startOrStop) => {
        if (startOrStop === 'start') {
            this.figureEightAnimationRunning = true;
        } else if (startOrStop === 'stop') {
            this.figureEightAnimationRunning = false;
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
    
        while (this.figureEightAnimationRunning) {
            for (let step = 0; step < numSteps; step++) {
                if(!this.figureEightAnimationRunning) return;
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
    animateCircle = async (startPan, startTilt, delay, radius, numSteps, startOrStop) => {
        if (startOrStop === 'start') {
            this.circleAnimationRunning = true;
        } else if (startOrStop === 'stop') {
            this.circleAnimationRunning = false;
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
    
        while (this.circleAnimationRunning) {
            for (let step = 0; step < numSteps; step++) {
                if(!this.circleAnimationRunning) return;
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
            this.circleAnimationRunning = true;
        } else if (startOrStop === 'stop') {
            this.circleAnimationRunning = false;
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
    
        while (this.circleAnimationRunning) {
            for (let step = 0; step < numSteps; step++) {
                if(!this.circleAnimationRunning) return;
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
    animateUpDown = async (startTilt, delay, amplitude, numSteps, startOrStop) => {
        if (startOrStop === 'start') {
            this.verticalLineAnimationRunning = true;
        } else if (startOrStop === 'stop') {
            this.verticalLineAnimationRunning = false;
            this.resetPanTiltD();
            return;
        }
    
        startTilt = Number(startTilt);
        delay = Number(delay);
        amplitude = Number(amplitude);
        numSteps = Number(numSteps);
    
        let fixtures = maestro.SettingsApp.getAllMovers();
        let numFixtures = fixtures.length;
    
        while (this.verticalLineAnimationRunning) {
            for (let step = 0; step < numSteps; step++) {
                if(!this.verticalLineAnimationRunning) return;
                for (let i = 0; i < numFixtures; i++) {
                    // Calculate the tilt setting for this fixture using a sine wave function
                    let t = step / numSteps;
                    let tilt = startTilt + amplitude * Math.sin(t * 2 * Math.PI);
    
                    // Apply the tilt setting to the fixture
                    await maestro.Effects.setTiltD(fixtures[i].id, tilt);
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

        //console.log(`Fixture ${fixture.name}: Pan = ${panValue}, Tilt = ${tiltValue}`);

        await maestro.Effects.putAttribute(id, fixturePanIndex, { attribute: { range: panRange } }, maestro.SettingsApp.stageId);
        await maestro.Effects.putAttribute(id, fixtureTiltIndex, { attribute: { range: tiltRange } }, maestro.SettingsApp.stageId);
    };

    resetPanTiltD = async () => {
        let numFixtures = fixtures.length;
        let panRange = this.calculateRange({ lowValue: 0, highValue: 255 });
        let titRange = this.calculateRange({ lowValue: 0, highValue: 255 });

        for (let i = 0; i < numFixtures; i++) {
            const fixtureTiltIndex = numFixtures[i].attribute.findIndex(ele => ele.type == 'TILT');
            const tiltRange = this.calculateRange({ lowValue: tiltValue, highValue: tiltValue });
    
            await maestro.Effects.putAttribute(id, fixtureTiltIndex, { attribute: { range: tiltRange } }, maestro.SettingsApp.stageId);           

        }
    };
};
maestro.Effects = new Effects(document.currentScript.src);