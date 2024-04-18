; (async () => {
    maestro.Globals.manualOverride = async (mode, onOrOff) => {
        let url = `api/${maestro.App.apiVersion}/global/manual_override`;
        let method = onOrOff == true ? 'PUT' : 'DELETE';
        let dimmer = 0;
        let data;

        if (this.strobeAt100Percent) {
            dimmer = 1;
        } else {
            let brightness = await maestro.Globals.getBrightness();
            dimmer = brightness.value;
        }

        data = {
            "highValue": dimmer,
            "mode": mode.toUpperCase()
        };

        let options = {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        };

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }

            //now set manual strobes
            if (mode == "STROBE_ON") {
                maestro.App.latchedOn = onOrOff;
                maestro.App.setStrobe(onOrOff, true)
            } else {
                maestro.App.latchedOn = false;
                maestro.App.setStrobe(false);
            }

            if (maestro.Globals.logging)
                console.log(`Manual override ${mode} set to ${onOrOff}`);
        } catch (error) {
            if (maestro.Globals.logging)
                console.error('Fatal error sending manual overide:', error);
        }
    }
})();
