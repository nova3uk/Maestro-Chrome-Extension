; (async () => {
    maestro.Globals.manualOverride = async (mode, onOrOff) => {
        let url = `api/${maestro.App.apiVersion}/triggers/state`;
        let data;
        method = "PATCH";

        switch (mode) {
            case "FOG_ON":
                data = { fogActive: onOrOff }
                break;
            case "EFFECT_ON":
                data = { effectActive: onOrOff }
                break;
            case "WHITEOUT":
                mode = "BLINDER"
            default:
                data = { lightMode: onOrOff ? mode : "NORMAL" }
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

            if (maestro.App.logging)
                console.log(`Manual override ${mode} set to ${onOrOff}`);
        } catch (error) {
            if (maestro.App.logging)
                console.error('Fatal error sending manual overide:', error);
        }
    };
})();