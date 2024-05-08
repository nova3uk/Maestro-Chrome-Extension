"use strict";
var maestro = maestro || {};
class Effects extends Globals {
    constructor(scriptSource, loggingOn = false) {
        super();
        this.scriptSource = scriptSource;
        this.loggingOn = loggingOn;
        this.maestroUrl = this.parseMaestroUrl();
        if (!this.stage) this.getStages();
    }
    animationRunning = false;

    canRun = () => {
        if (!this.animationRunning) return true;
    };
    startEffect = async (effect, ...args) => {
        if (typeof this[effect] === "function") {
            await this[effect](...args);
        }
    };
    animateFigureEight = async (startPan, startTilt, delay, radius, numSteps, startOrStop) => {
        if (startOrStop === "start") {
            if (!this.canRun()) return;
            this.animationRunning = true;
        } else {
            this.animationRunning = false;
            setTimeout(() => { this.resetPanTiltD(); }, 200);
            return;
        }

        startPan = Number(startPan);
        startTilt = Number(startTilt);
        delay = Number(delay);
        radius = Number(radius);
        numSteps = Number(numSteps);

        let fixtures = await this.getAllMovers();
        let numFixtures = fixtures.length;

        // Calculate the angle between each step
        let angleStep = (2 * Math.PI) / numSteps;

        while (this.animationRunning) {
            for (let step = 0; step < numSteps; step++) {
                if (!this.animationRunning) return;
                for (let i = 0; i < numFixtures; i++) {
                    // Calculate the current angle of this fixture
                    let angle = step * angleStep;

                    // Calculate the pan and tilt settings for this fixture
                    let pan = startPan + radius * Math.cos(angle);
                    let tilt = startTilt + (radius * Math.sin(2 * angle)) / 2;

                    // Apply the pan and tilt settings to the fixture
                    await maestro.Effects.setPanTiltD(fixtures[i].id, pan, tilt);
                }

                // Wait for the specified delay before moving to the next step
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    };
    animateFigureEightWithFan = async (startPan, startTilt, delay, radius, numSteps, fanRate, startOrStop) => {
        if (startOrStop === "start") {
            if (!this.canRun()) return;
            this.animationRunning = true;
        } else {
            this.animationRunning = false;
            setTimeout(() => { this.resetPanTiltD(); }, 200);
            return;
        }

        startPan = Number(startPan);
        startTilt = Number(startTilt);
        delay = Number(delay);
        radius = Number(radius);
        numSteps = Number(numSteps);
        fanRate = Number(fanRate);

        let fixtures = await this.getAllMovers();
        let numFixtures = fixtures.length;

        // Calculate the angle between each step
        let angleStep = (2 * Math.PI) / numSteps;

        while (this.animationRunning) {
            for (let step = 0; step < numSteps; step++) {
                if (!this.animationRunning) return;
                for (let i = 0; i < numFixtures; i++) {
                    // Calculate the current angle of this fixture
                    let angle = step * angleStep;

                    // Calculate the pan and tilt settings for this fixture
                    let pan = startPan + radius * Math.cos(angle) + i * fanRate;
                    let tilt = startTilt + (radius * Math.sin(2 * angle)) / 2 + i * fanRate;

                    // Apply the pan and tilt settings to the fixture
                    await maestro.Effects.setPanTiltD(fixtures[i].id, pan, tilt);
                }

                // Wait for the specified delay before moving to the next step
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    };
    animateCircle = async (startPan, startTilt, delay, radius, numSteps, startOrStop) => {
        if (startOrStop === "start") {
            if (!this.canRun()) return;
            this.animationRunning = true;
        } else {
            this.animationRunning = false;
            setTimeout(() => { this.resetPanTiltD(); }, 200);
            return;
        }

        startPan = Number(startPan);
        startTilt = Number(startTilt);
        delay = Number(delay);
        radius = Number(radius);
        numSteps = Number(numSteps);

        let fixtures = await this.getAllMovers();
        let numFixtures = fixtures.length;

        // Calculate the angle between each step
        let angleStep = (2 * Math.PI) / numSteps;

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
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    };
    animateCircleWithFan = async (startPan, startTilt, delay, radius, numSteps, fanRate, startOrStop) => {
        if (startOrStop === "start") {
            if (!this.canRun()) return;
            this.animationRunning = true;
        } else {
            this.animationRunning = false;
            setTimeout(() => { this.resetPanTiltD(); }, 200);
            return;
        }

        startPan = Number(startPan);
        startTilt = Number(startTilt);
        delay = Number(delay);
        radius = Number(radius);
        numSteps = Number(numSteps);
        fanRate = Number(fanRate);

        let fixtures = await this.getAllMovers();
        let numFixtures = fixtures.length;

        // Calculate the angle between each step
        let angleStep = (2 * Math.PI) / numSteps;

        while (this.animationRunning) {
            for (let step = 0; step < numSteps; step++) {
                if (!this.animationRunning) return;
                for (let i = 0; i < numFixtures; i++) {
                    // Calculate the current angle of this fixture, adjusted by the fan rate
                    let angle = ((step + i * fanRate) % numSteps) * angleStep;

                    // Calculate the pan and tilt settings for this fixture
                    let pan = startPan + radius * Math.cos(angle);
                    let tilt = startTilt + radius * Math.sin(angle);

                    // Apply the pan and tilt settings to the fixture
                    await maestro.Effects.setPanTiltD(fixtures[i].id, pan, tilt);
                }

                // Wait for the specified delay before moving to the next step
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    };
    animateUpDown = async (startPan, startTilt, delay, range, numSteps, startOrStop) => {
        if (startOrStop === "start") {
            if (!this.canRun()) return;
            this.animationRunning = true;
        } else {
            this.animationRunning = false;
            setTimeout(() => { this.resetPanTiltD(); }, 200);
            return;
        }

        startTilt = Number(startTilt);
        delay = Number(delay);
        range = Number(range);
        numSteps = Number(numSteps);

        let fixtures = await this.getAllMovers();
        let numFixtures = fixtures.length;

        //set initial Pan/Tilt
        for (let i = 0; i < numFixtures; i++) {
            await maestro.Effects.setPanTiltD(fixtures[i].id, startPan, startTilt);
        }

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
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    };
    animateUpDownWithFan = async (startPan, startTilt, delay, range, numSteps, fanRate, startOrStop) => {
        if (startOrStop === "start") {
            if (!this.canRun()) return;
            this.animationRunning = true;
        } else {
            this.animationRunning = false;
            setTimeout(() => { this.resetPanTiltD(); }, 200);
            return;
        }

        startTilt = Number(startTilt);
        delay = Number(delay);
        range = Number(range);
        numSteps = Number(numSteps);
        fanRate = Number(fanRate);

        let fixtures = await this.getAllMovers();
        let numFixtures = fixtures.length;

        //set initial Pan/Tilt
        for (let i = 0; i < numFixtures; i++) {
            await maestro.Effects.setPanTiltD(fixtures[i].id, startPan, startTilt);
        }

        while (this.animationRunning) {
            for (let step = 0; step < numSteps; step++) {
                if (!this.animationRunning) return;
                for (let i = 0; i < numFixtures; i++) {
                    // Calculate the tilt setting for this fixture using a sine wave function
                    // Adjust t by the fixture's index and the fan rate to create the fan effect
                    let t = (step + i * fanRate) / numSteps;
                    let tilt = startTilt + range * Math.sin(t * 2 * Math.PI);

                    // Apply the tilt setting to the fixture
                    await maestro.Effects.setTiltD(fixtures[i].id, tilt);
                }

                // Wait for the specified delay before moving to the next step
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    };
    animateLeftRight = async (startPan, startTilt, delay, range, numSteps, startOrStop) => {
        if (startOrStop === "start") {
            if (!this.canRun()) return;
            this.animationRunning = true;
        } else {
            this.animationRunning = false;
            setTimeout(() => { this.resetPanTiltD(); }, 200);
            return;
        }

        startPan = Number(startPan);
        delay = Number(delay);
        range = Number(range) / 2; // Divide the range by 2
        numSteps = Number(numSteps);

        let fixtures = await this.getAllMovers();
        let numFixtures = fixtures.length;

        // Calculate the angle between each step
        let angleStep = (2 * Math.PI) / numSteps;

        //set initial Pan/Tilt
        for (let i = 0; i < numFixtures; i++) {
            await maestro.Effects.setPanTiltD(fixtures[i].id, startPan, startTilt);
        }

        while (this.animationRunning) {
            for (let step = 0; step < numSteps; step++) {
                if (!this.animationRunning) return;
                for (let i = 0; i < numFixtures; i++) {
                    // Calculate the pan setting for this fixture based on a sine wave
                    let pan = startPan + range * Math.sin(step * angleStep);

                    // Apply the pan setting to the fixture
                    await maestro.Effects.setPanTiltD(fixtures[i].id, pan, fixtures[i].tilt);
                }

                // Wait for the specified delay before moving to the next step
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    };
    setTiltD = async (id, tiltValue) => {
        const fixture = this.fixtures.find((ele) => ele.id == id);
        const ignoreFixtures = await this.getLocalSetting("fixture_ignore_" + fixture.id);
        if (ignoreFixtures) return;

        const fixtureTiltIndex = fixture.attribute.findIndex((ele) => ele.type == "TILT");

        const tiltRange = this.calculateRange({
            lowValue: tiltValue,
            highValue: tiltValue,
        });

        await maestro.Effects.putAttribute(
            id,
            fixtureTiltIndex,
            { attribute: { range: tiltRange } },
            maestro.Effects.stageId
        );
    };
    setPanTiltD = async (id, panValue, tiltValue) => {
        const fixture = this.fixtures.find((ele) => ele.id == id);
        const ignoreFixtures = await this.getLocalSetting("fixture_ignore_" + fixture.id);
        if (ignoreFixtures) return;

        const fixturePanIndex = fixture.attribute.findIndex((ele) => ele.type === "PAN");
        const fixtureTiltIndex = fixture.attribute.findIndex((ele) => ele.type == "TILT");

        const panRange = this.calculateRange({
            lowValue: panValue,
            highValue: panValue,
        });
        const tiltRange = this.calculateRange({
            lowValue: tiltValue,
            highValue: tiltValue,
        });

        await Promise.all([
            maestro.Effects.putAttribute(
                id,
                fixturePanIndex,
                { attribute: { range: panRange } },
                maestro.Effects.stageId
            ),
            maestro.Effects.putAttribute(
                id,
                fixtureTiltIndex,
                { attribute: { range: tiltRange } },
                maestro.Effects.stageId
            ),
        ]);
    };

    resetPanTiltD = async () => {
        let fixtures = await this.getAllMovers();

        let panRange = this.calculateRange({ lowValue: 0, highValue: 255 });
        let titRange = this.calculateRange({ lowValue: 0, highValue: 255 });

        for (let fixture of fixtures) {
            const fixturePanIndex = fixture.attribute.findIndex((ele) => ele.type === "PAN");
            const fixtureTiltIndex = fixture.attribute.findIndex((ele) => ele.type == "TILT");
            await this.putAttribute(
                fixture.id,
                fixturePanIndex,
                { attribute: { range: panRange } },
                maestro.Effects.stageId
            );
            await this.putAttribute(
                fixture.id,
                fixtureTiltIndex,
                { attribute: { range: titRange } },
                maestro.Effects.stageId
            );
        }
    };
}
maestro.Effects = new Effects(document.currentScript.src);
