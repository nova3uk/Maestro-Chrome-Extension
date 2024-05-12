"use strict";
var maestro = maestro || {};
class OverlayApp extends Globals {
    constructor(scriptSource, loggingOn = false) {
        super()
        if (scriptSource) {
            var src = new URL(scriptSource);
            this.ExtensionId = src.host;
            this.Origin = src.origin;
        }
        this.scriptSource = scriptSource;
        this.loggingOn = loggingOn;

        this.maestroUrl = (document.location.origin).endsWith("/") ? document.location.origin : document.location.origin + "/";
        this.maestroHost = new URL(this.maestroUrl).host;
    };
    btnColors = {};
    cornerText;

    start = async () => {
        this.btnColors = {
            backgroundColor: "#308fe8",
            hover: "#0f1827",
            active: "#0f1827",
            font: "#b21aac"
        };
        this.audioLevelColors = { low: "#308fe8", normal: "#4baf4f", high: "#fed835" };

        // Create the overlay and container for right items
        this.overlay = this.createOverlay();
        this.container = this.createContainer(this.overlay);

        this.loadCornerText();

        await this.getButtonNames();

        // Create the dropdown
        this.colorDropdown = this.createDropdown('maestro_ext_color', function (selectedColor) {
            if (selectedColor === "") {
                maestro.App.setColorAll(false);
            } else {
                maestro.App.setColorAll(true, selectedColor);
            }
        });

        this.createCheckboxes()
    }
    checkForRunningMacros = async () => {
        if (!document.getElementById('maestroMacrosRunning')) {
            let macros = this.createText('', 'maestroMacrosRunning');
            macros.style.color = 'red';
            this.cornerText.appendChild(macros);
        }
        var msg = { checkRunningMacros: true };
        await chrome.runtime.sendMessage(this.ExtensionId, msg,
            function (response) {
                if (response) {
                    document.getElementById('maestroMacrosRunning').textContent = response.length > 0 ? response.length + ' macro' + (response.length > 1 ? 's' : '') + ' active!' : '';
                } else {
                    document.getElementById('maestroMacrosRunning').textContent = "";
                }
            });
    };
    // Function to create an overlay
    createOverlay = () => {
        let overlay = document.createElement('div');
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.justifyContent = 'center';
        overlay.style.position = 'fixed';
        overlay.style.bottom = '0';
        overlay.style.width = '100%';
        overlay.style.height = '50px';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.8)';
        overlay.style.zIndex = '100000';
        overlay.style.fontSize = '1.1em';
        document.body.appendChild(overlay);
        return overlay;
    };

    // Function to create a container for the checkboxes and labels
    createContainer = (overlay, leftOrRight = 'right') => {
        let container = document.createElement('div');
        container.style.display = 'flex';
        container.style.justifyContent = leftOrRight == "right" ? 'flex-end' : 'flex-start';
        container.style.marginRight = '30px';
        overlay.appendChild(container);
        return container;
    };
    createDropdown = (id, onChange) => {
        let select = document.createElement('select');
        select.id = id;

        let option = document.createElement('option');
        option.value = "";
        option.text = "-";
        select.appendChild(option);

        for (let color of maestro.App.commonColors) {
            let option = document.createElement('option');
            option.value = color;
            option.text = color;
            select.appendChild(option);
        }

        select.addEventListener('change', function () {
            onChange(this.value);
        });

        return select;
    };
    createText = (text, id, cssClass = null) => {
        let textElement = document.createElement('span');
        textElement.textContent = text;
        textElement.style.color = '#f4f5f5';
        textElement.style.marginLeft = '10px';
        textElement.className = (cssClass || '');
        textElement.id = (id || '');
        return textElement;
    };
    createHtml = (html, id) => {
        let textElement = document.createElement('span');
        textElement.innerHTML = html;
        textElement.style.color = '#f4f5f5';
        textElement.id = (id || '');
        return textElement;
    };
    // Function to create a checkbox with a label and an event listener
    createCheckbox = (id, text, onChange) => {
        let checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = id;
        checkbox.style.cursor = 'pointer';
        checkbox.style.width = '0px';
        checkbox.style.height = '0px';
        checkbox.addEventListener('change', function (event) {
            maestro.OverlayApp.clearCheckboxes(id);
            onChange(this.checked, event);
        });

        let checkboxContainer = document.createElement('div');
        checkboxContainer.id = `div_${id}`;
        //checkboxContainer.style.display = 'flex';
        checkboxContainer.style.justifyContent = 'center';
        checkboxContainer.style.alignItems = 'center';
        checkboxContainer.style.width = '150px';
        checkboxContainer.style.marginLeft = '10px';
        checkboxContainer.style.backgroundColor = this.btnColors.backgroundColor;
        checkboxContainer.style.padding = '5px';
        checkboxContainer.style.borderRadius = '3px';
        checkboxContainer.style.cursor = 'pointer';

        checkboxContainer.onmouseover = function () {
            this.style.backgroundColor = maestro.OverlayApp.btnColors.hover;
        }
        checkboxContainer.onmouseout = function () {
            let checkbox = document.getElementById(id);
            if (!checkbox.checked)
                this.style.backgroundColor = maestro.OverlayApp.btnColors.backgroundColor;
        }
        checkboxContainer.onclick = function () {
            let checkbox = document.getElementById(id);
            checkbox.checked = !checkbox.checked;

            let event = new Event('change');
            checkbox.dispatchEvent(event);
        }
        let label = document.createElement('label');
        label.textContent = text;
        label.style.userSelect = 'none';
        label.style.cursor = 'pointer';

        let svg = this.getIcon(text);
        checkboxContainer.appendChild(svg);
        checkboxContainer.appendChild(checkbox);
        checkboxContainer.appendChild(label);

        return checkboxContainer;
    };
    getIcon = (iconName) => {
        let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.stroke = 'currentColor';
        svg.style.fill = 'currentColor';
        svg.style.strokeWidth = '0';
        svg.style.width = '1em';
        svg.style.height = '1em';

        let path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

        switch (iconName.toLowerCase()) {
            case 'blackout':
                svg.style.position = 'relative';
                svg.style.top = '3px';
                svg.setAttribute('viewBox', '0 0 16 16');
                path.setAttribute('d', 'M2 6a6 6 0 1 1 10.174 4.31c-.203.196-.359.4-.453.619l-.762 1.769A.5.5 0 0 1 10.5 13a.5.5 0 0 1 0 1 .5.5 0 0 1 0 1l-.224.447a1 1 0 0 1-.894.553H6.618a1 1 0 0 1-.894-.553L5.5 15a.5.5 0 0 1 0-1 .5.5 0 0 1 0-1 .5.5 0 0 1-.46-.302l-.761-1.77a1.964 1.964 0 0 0-.453-.618A5.984 5.984 0 0 1 2 6zm6-5a5 5 0 0 0-3.479 8.592c.263.254.514.564.676.941L5.83 12h4.342l.632-1.467c.162-.377.413-.687.676-.941A5 5 0 0 0 8 1z');
                svg.appendChild(path);
                return svg;
            case 'blinder':
                svg.setAttribute('viewBox', '0 0 16 16');
                path.setAttribute('d', 'M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z');
                svg.appendChild(path);
                return svg;
            case 'strobe':
                svg.setAttribute('viewBox', '0 0 512 512');
                path.setAttribute('d', 'M315.27 33L96 304h128l-31.51 173.23a2.36 2.36 0 002.33 2.77h0a2.36 2.36 0 001.89-.95L416 208H288l31.66-173.25a2.45 2.45 0 00-2.44-2.75h0a2.42 2.42 0 00-1.95 1z');
                svg.appendChild(path);
                return svg;
            case 'fog':
                svg.setAttribute('viewBox', '0 0 16 16');
                path.setAttribute('d', 'M4 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm-3 2a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm2 2a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zM13.405 4.027a5.001 5.001 0 0 0-9.499-1.004A3.5 3.5 0 1 0 3.5 10H13a3 3 0 0 0 .405-5.973zM8.5 1a4 4 0 0 1 3.976 3.555.5.5 0 0 0 .5.445H13a2 2 0 0 1 0 4H3.5a2.5 2.5 0 1 1 .605-4.926.5.5 0 0 0 .596-.329A4.002 4.002 0 0 1 8.5 1z');
                svg.appendChild(path);
                return svg;
            case 'effect':
                svg.setAttribute('viewBox', '0 0 512 512');

                let path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');

                path.setAttribute('d', 'M112 320c0-93 124-165 96-272 66 0 192 96 192 272a144 144 0 01-288 0z');
                path.setAttribute('fill', 'none');
                path.setAttribute('stroke-linecap', 'round');
                path.setAttribute('stroke-linejoin', 'round');
                path.setAttribute('stroke-width', '32');

                path2.setAttribute('d', 'M320 368c0 57.71-32 80-64 80s-64-22.29-64-80 40-86 32-128c42 0 96 70.29 96 128z');
                path2.setAttribute('fill', 'none');
                path2.setAttribute('stroke-linecap', 'round');
                path2.setAttribute('stroke-linejoin', 'round');
                path2.setAttribute('stroke-width', '32');

                svg.appendChild(path);
                svg.appendChild(path2);
                return svg;
        }
    };
    checkBoxClick = async (item, status, id) => {
        let checkbox = document.querySelector(`#${id} > input[type='checkbox']`);
        checkbox.checked = status;

        try {
            if (status === true) {
                let div = document.getElementById(id);
                div.style.color = this.btnColors.font;
                div.style.backgroundColor = this.btnColors.active;
            } else {
                let div = document.getElementById(id);
                div.checked = false;
                div.style.color = '';
                div.style.backgroundColor = this.btnColors.backgroundColor;
            }
        } catch (e) {
            if (this.logging)
                console.error("Error setting checkbox color", e);
        }

        await maestro.Globals.manualOverride(item, status);

        if (this.logging)
            console.log('Checkbox clicked:', item, status);
    };
    createCheckboxes = () => {
        this.injectCSS('div[role=presentation]:not([id=basic-menu]) {height: calc(100vh - 150px); top:-100px;};#div_maestro_ext_blackout {display: flex;} @media screen and (max-width: 1500px) {#div_maestro_ext_blackout {display: none !important;}}#div_maestro_ext_blinder {display: flex;} @media screen and (max-width: 1341px) {#div_maestro_ext_blinder {display: none !important;}}#div_maestro_ext_strobe {display: flex;} @media screen and (max-width: 1182px) {#div_maestro_ext_strobe {display: none !important;}}#div_maestro_ext_fog {display: flex;} @media screen and (max-width: 1023px) {#div_maestro_ext_fog {display: none !important;}}#div_maestro_ext_effect {display: flex;} @media screen and (max-width: 824px) {#div_maestro_ext_effect {display: none !important;}}');

        // Create the checkboxes
        this.blackoutCheckbox = this.createCheckbox('maestro_ext_blackout', 'BLACKOUT', function (checked) {
            maestro.OverlayApp.checkBoxClick("BLACKOUT", checked, 'div_maestro_ext_blackout');
        });
        this.blinderCheckbox = this.createCheckbox('maestro_ext_blinder', 'BLINDER', function (checked) {
            maestro.OverlayApp.checkBoxClick("WHITEOUT", checked, 'div_maestro_ext_blinder');
        });
        this.strobeCheckbox = this.createCheckbox('maestro_ext_strobe', 'STROBE', function (checked, e) {
            maestro.OverlayApp.checkBoxClick("STROBE_ON", checked, 'div_maestro_ext_strobe');
        });
        this.fogCheckbox = this.createCheckbox('maestro_ext_fog', 'FOG', function (checked) {
            maestro.OverlayApp.checkBoxClick("FOG_ON", checked, 'div_maestro_ext_fog');
        });
        this.effectCheckbox = this.createCheckbox('maestro_ext_effect', 'EFFECT', function (checked) {
            maestro.OverlayApp.checkBoxClick("EFFECT_ON", checked, 'div_maestro_ext_effect');
        });

        // Append the controls to the container
        if (maestro.App.colorPicker)
            this.container.appendChild(this.colorDropdown);

        this.container.appendChild(this.blackoutCheckbox);
        this.container.appendChild(this.blinderCheckbox);
        this.container.appendChild(this.strobeCheckbox);
        this.container.appendChild(this.fogCheckbox);
        this.container.appendChild(this.effectCheckbox);

        if (maestro.App.logging)
            console.log('Checkboxes created');
    };
    clearCheckbox = (btnId) => {
        let checkbox = document.getElementById(btnId);
        checkbox.checked = false;
    };
    clearCheckboxes = (checkedBox) => {
        if (checkedBox !== "maestro_ext_strobe" && checkedBox.toLowerCase() !== "strobe") {
            maestro.App.latchedOn = false;
            maestro.App.setStrobe(
                false, false);
        }
        const buttonNames = ['Blackout', 'Blinder', 'Strobe', 'Fog', 'Effect'];
        for (let item of buttonNames) {
            let btnId = 'maestro_ext_' + item.toLowerCase();

            if (btnId === checkedBox)
                continue;

            let checkbox = document.getElementById(btnId);
            if (checkbox) {
                checkbox.checked = false;

                let parentDiv = checkbox.parentNode;
                parentDiv.style.backgroundColor = this.btnColors.backgroundColor;
                parentDiv.style.color = '';
            }
        }
        if (maestro.App.logging)
            console.log('Cleared checkboxes');
    };
    getButtonNames = async function () {
        let buttonNames = ['Blackout', 'Blinder', 'Strobe', 'Fog', 'Effect'];

        buttonNames.forEach((buttonName) => {
            let observer = new MutationObserver(function (mutations) {
                let btn = maestro.App.findByText(buttonName, 'button')[0];
                if (btn && !btn.clearCheckboxesMousedownEventAdded) {
                    btn.addEventListener('mousedown', () => maestro.OverlayApp.clearCheckboxes(buttonName), false);
                    btn.clearCheckboxesMousedownEventAdded = true;

                    if (maestro.App.logging) console.log('Overlay button found:', buttonName);

                }
            });
            observer.observe(document, { childList: true, subtree: true });
        });
    };
    autoEffectsActive = async () => {
        try {
            if (!maestro.App.autoParams) return;

            let autoFogEnabled = maestro.App.autoParams.autoFogEnabled;
            let autoFogOnActivityPeak = maestro.App.autoParams.autoFogOnActivityPeak;
            let autoFogOnTimer = maestro.App.autoParams.autoFogOnTimer;
            let autoEffectsEnabled = maestro.App.autoParams.autoEffectsEnabled;
            let autoStrobeEnabled = maestro.App.autoParams.autoStrobeEnabled;
            let lightning;

            if (!document.getElementById('effectsActiveIcon')) {
                lightning = this.createText('', 'effectsActiveIcon');
                this.cornerText.appendChild(lightning);
            } else {
                lightning = document.getElementById('effectsActiveIcon');
            }

            lightning.innerHTML = '';

            if ((autoFogEnabled && (autoFogOnActivityPeak || autoFogOnTimer)) || autoEffectsEnabled || autoStrobeEnabled) {
                if (autoEffectsEnabled || autoStrobeEnabled) {
                    lightning.innerHTML = '<span class="tooltip" data-toggle="tooltip" data-placement="top" title="Auto programs active"><svg width="26" height="26" title="Auto programs active" stroke="currentColor" xstyle="animation: 0.525s ease-in-out 0s infinite normal none running strobeAnimation;" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M315.27 33 96 304h128l-31.51 173.23a2.36 2.36 0 0 0 2.33 2.77h0a2.36 2.36 0 0 0 1.89-.95L416 208H288l31.66-173.25a2.45 2.45 0 0 0-2.44-2.75h0a2.42 2.42 0 0 0-1.95 1z"></path></svg></span>';
                }
                if (autoFogEnabled && (autoFogOnActivityPeak || autoFogOnTimer)) {
                    lightning.innerHTML += '<span class="tooltip ms-2" data-toggle="tooltip" data-placement="top" title="Auto Fog active"><svg width="26" height="26" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 16 16" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M4 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5m-3 2a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5m2 2a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5M13.405 4.027a5.001 5.001 0 0 0-9.499-1.004A3.5 3.5 0 1 0 3.5 10H13a3 3 0 0 0 .405-5.973M8.5 1a4 4 0 0 1 3.976 3.555.5.5 0 0 0 .5.445H13a2 2 0 0 1 0 4H3.5a2.5 2.5 0 1 1 .605-4.926.5.5 0 0 0 .596-.329A4 4 0 0 1 8.5 1"></path></svg></span>';
                }
            }
        } catch (e) {
            if (this.logging)
                console.error("Error checking for auto effects active", e);
        }
    }
    loadCornerText = async () => {
        try {
            this.cornerText = document.createElement('div');
            this.cornerText.style.position = 'fixed';
            this.cornerText.style.bottom = '10px';
            this.cornerText.style.left = '10px';
            this.cornerText.style.color = '#f4f5f5';
            //this.cornerText.style.width = '340px';
            this.cornerText.style.height = '30px';
            this.cornerText.style.zIndex = '100001';
            this.cornerText.style.display = 'flex';

            document.body.appendChild(this.cornerText);

            let settingsIconContainer = this.createHtml(`<span id="openSettingsBtn" role="button" style="cursor:pointer;"><img src="${this.Origin}/src/img/settings.svg" width="30" height="30"></span>`, 'maestroSettingsIcon');
            settingsIconContainer.onclick = function () {
                maestro.OverlayApp.openSettingsWindow();
            }
            this.cornerText.appendChild(settingsIconContainer);


            let systemInfoContainer = this.createText(`v${maestro.Globals.systemInfo.version} -  `, 'maestroSystemInfo');
            this.cornerText.appendChild(systemInfoContainer);

            let clock = this.createText('', 'maestroClock');
            this.cornerText.appendChild(clock);

            let audioLevelContainer = document.createElement('div');
            audioLevelContainer.id = 'audioLevelContainer';
            audioLevelContainer.style.width = '120px';
            audioLevelContainer.style.height = '22px';
            audioLevelContainer.style.display = 'inline-block';
            audioLevelContainer.style.marginLeft = '14px';
            audioLevelContainer.style.position = 'relative';
            audioLevelContainer.style.top = '3px';
            this.cornerText.appendChild(audioLevelContainer);

            let cueControlsContainer = document.createElement('div');
            cueControlsContainer.id = 'playControlsContainer';
            //cueControlsContainer.style.width = '120px';
            cueControlsContainer.style.height = '22px';
            cueControlsContainer.style.display = 'inline-block';
            cueControlsContainer.style.marginLeft = '10px';
            this.cornerText.appendChild(cueControlsContainer);

            maestro.OverlayApp.startNotifications();
            maestro.OverlayApp.cueControls();

            function updateClock() {
                let now = new Date();
                let hours = now.getHours().toString().padStart(2, '0');
                let minutes = now.getMinutes().toString().padStart(2, '0');
                let seconds = now.getSeconds().toString().padStart(2, '0');
                clock.textContent = `${hours}:${minutes}`;
            }

            updateClock();
            setInterval(updateClock, 1000);
        } catch (e) {
            if (this.logging)
                console.error("Error loading corner text", e);
        }
    };
    cueControls = async () => {
        try {
            let playControlsContainer = document.getElementById('playControlsContainer');
            playControlsContainer.style.marginLeft = '20px';

            if (!playControlsContainer) return;

            let prevBtn = this.createHtml(`<button id="maestroPrevBtn" role="button" class="cueControlbtn" style="cursor:pointer;height:30px;width:60px;background-color: #778798;color:white;border-top-left-radius: 5px;border-bottom-left-radius: 5px;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-skip-start-fill" viewBox="0 0 16 16"><path d="M4 4a.5.5 0 0 1 1 0v3.248l6.267-3.636c.54-.313 1.232.066 1.232.696v7.384c0 .63-.692 1.01-1.232.697L5 8.753V12a.5.5 0 0 1-1 0z"/></svg></button>`, 'maestroPrevBtnSpan');
            prevBtn.onclick = function () {
                maestro.OverlayApp.postUrl(`${maestro.OverlayApp.maestroUrl}api/${maestro.OverlayApp.apiVersion}/show/cue/previous`);
            }

            playControlsContainer.appendChild(prevBtn);
            let stopBtn = this.createHtml(`<button id="maestroStopBtn" role="button" class="cueControlbtn" style="cursor:pointer;height:30px;width:60px;position:relative;left:-6px;background-color: #778798;color:white;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-stop-fill" viewBox="0 0 16 16"><path d="M5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5"/></svg></button>`, 'maestroStopBtnSpan');

            stopBtn.onclick = function () {
                maestro.OverlayApp.postUrl(`${maestro.OverlayApp.maestroUrl}api/${maestro.OverlayApp.apiVersion}/show/stop`);
            }
            playControlsContainer.appendChild(stopBtn);

            let playBtn = this.createHtml(`<button id="maestroPlayBtn" role="button" class="cueControlbtn" style="cursor:pointer;height:30px;width:60px;position:relative;left:-8px;background-color: #778798;color:white;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393"/></svg></button>`, 'maestroPlayBtnSpan');
            playBtn.onclick = function () {
                maestro.OverlayApp.postUrl(`${maestro.OverlayApp.maestroUrl}api/${maestro.OverlayApp.apiVersion}/show/play`);
            }
            playControlsContainer.appendChild(playBtn);

            let pauseBtn = this.createHtml(`<button id="maestroPauseBtn" role="button" class="cueControlbtn" style="cursor:pointer;height:30px;width:60px;position:relative;left:-8px;background-color: #778798;color:white;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pause-fill" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5m5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5"/></svg>`, 'maestroPauseBtnSpan');
            pauseBtn.style.display = 'none';

            pauseBtn.onclick = function () {
                maestro.OverlayApp.postUrl(`${maestro.OverlayApp.maestroUrl}api/${maestro.OverlayApp.apiVersion}/show/pause`);
            }
            playControlsContainer.appendChild(pauseBtn);

            let nextBtn = this.createHtml(`<button id="maestroNextBtn" role="button" class="cueControlbtn" style="cursor:pointer;height:30px;width:60px;position:relative;left:-10px;background-color: #778798;color:white;border-top-right-radius: 5px;border-bottom-right-radius: 5px;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-skip-end-fill" viewBox="0 0 16 16"><path d="M12.5 4a.5.5 0 0 0-1 0v3.248L5.233 3.612C4.693 3.3 4 3.678 4 4.308v7.384c0 .63.692 1.01 1.233.697L11.5 8.753V12a.5.5 0 0 0 1 0z"/></svg></button>`, 'maestroNextBtnSpan');
            nextBtn.onclick = function () {
                maestro.OverlayApp.postUrl(`${maestro.OverlayApp.maestroUrl}api/${maestro.OverlayApp.apiVersion}/show/cue/next`);
            }
            playControlsContainer.appendChild(nextBtn);

            let cueName = this.createHtml('<span id="maestroCueName" style="font-size:14px;position:relative;top:-2px;color:white;"></span>', 'maestroCueNameSpan');
            playControlsContainer.appendChild(cueName);

            let showState = await this.getUrl(`${this.maestroUrl}api/${this.apiVersion}/show/state`);
            this.cueControlsNotificationHdlr(showState);
        } catch (e) {
            if (this.logging)
                console.error("Error creating cue controls", e);
        }
    };
    cueControlsNotificationHdlr = async (msg) => {
        try {
            document.getElementById("maestroCueName").textContent = msg.currentCue.name;
        } catch (e) {
            document.getElementById("maestroCueName").textContent = "";
        }

        if (msg.type == "SHOW_STOPPED") {
            document.getElementById("maestroPlayBtnSpan").style.display = '';
            document.getElementById("maestroPauseBtnSpan").style.display = 'none';
            document.getElementById("maestroPauseBtn").style.color = 'white';
            document.getElementById("maestroStopBtn").disabled = true;
            document.getElementById("maestroStopBtn").style.backgroundColor = '#434647';
            document.getElementById("maestroStopBtn").style.color = '#6d7071';
        }
        if (msg.type == "SHOW_PLAYING") {
            document.getElementById("maestroPlayBtnSpan").style.display = 'none';
            document.getElementById("maestroPauseBtnSpan").style.display = '';
            document.getElementById("maestroStopBtn").disabled = false;
            document.getElementById("maestroStopBtn").style.backgroundColor = '#778798';
            document.getElementById("maestroStopBtn").style.color = '#ffffff';
        }
        if (msg.type == "SHOW_PAUSED") {
            document.getElementById("maestroPlayBtnSpan").style.display = '';
            document.getElementById("maestroPauseBtnSpan").style.display = 'none';
            document.getElementById("maestroStopBtn").disabled = false;
            document.getElementById("maestroStopBtn").style.backgroundColor = '#778798';
            document.getElementById("maestroStopBtn").style.color = '#ffffff';

        }
    };
    startNotifications = async () => {
        var ws = new WebSocket("ws://" + this.maestroHost + "/notifications");

        ws.onopen = (event) => {
            if (this.logging)
                console.log("Opening Notifications WebSocket", event);
        };
        ws.onerror = (event) => {
            if (this.logging)
                console.log("Opening Notifications WebSocket", event);
        };
        ws.onmessage = (event) => {
            let data = JSON.parse(event.data);
            if (data.type == "AUDIO_LEVEL_NOTIFICATION") {
                this.audioLevelMeter(data.msg);

                chrome.runtime.sendMessage(this.ExtensionId, { audioLevel: data.msg });
            }
            if (data.type == "GLOBAL_STATE_NOTIFICATION") {
                chrome.runtime.sendMessage(this.ExtensionId, { globalStateNotification: data.msg });
                //not used now
            }
            if (data.type == "SHOW_STATE_NOTIFICATION") {
                chrome.runtime.sendMessage(this.ExtensionId, { showStateNotification: data.msg });
                this.cueControlsNotificationHdlr(data.msg);
            }
            if (data.type == "LIVE_STATE_NOTIFICATION") {
                chrome.runtime.sendMessage(this.ExtensionId, { liveStateNotification: data.msg });
            }

        };
    }
    audioLevelMeter = async (msg) => {
        let soundLevel = Math.floor(((msg.inputLevel + 37) / 37) * 100);
        let activityLevel = Math.floor((msg.activityLevel * 100));
        let container = document.getElementById('audioLevelContainer');
        this.soundLevel = soundLevel;
        this.activityLevel.value = activityLevel;

        if (soundLevel < 5) soundLevel = 0;
        if (activityLevel < 5) activityLevel = 0;

        if (!document.getElementById('audioLevelMeter')) {
            let audioLevelWrapper = document.createElement('div');
            audioLevelWrapper.id = 'audioLevelWrapper';
            audioLevelWrapper.style.width = '120px';
            audioLevelWrapper.style.height = '10px';
            audioLevelWrapper.style.backgroundColor = '#37383a';
            audioLevelWrapper.style.borderRadius = '6px';
            audioLevelWrapper.style.backgroundImage = `url('${this.Origin}/src/img/volume-up.svg')`
            audioLevelWrapper.style.backgroundSize = `14px 14px`
            audioLevelWrapper.style.backgroundRepeat = `no-repeat`
            audioLevelWrapper.style.backgroundPosition = `center center`
            container.appendChild(audioLevelWrapper);

            let audioLevelMeter = document.createElement('div');
            audioLevelMeter.id = 'audioLevelMeter';
            audioLevelMeter.style.width = '0%';
            audioLevelMeter.style.height = '10px';
            audioLevelMeter.style.backgroundColor = 'green';
            audioLevelMeter.style.borderRadius = '6px';
            audioLevelMeter.style.transition = "width 300ms linear";
            audioLevelMeter.style.opacity = '0.7';

            audioLevelWrapper.appendChild(audioLevelMeter);;
        }
        if (!document.getElementById('activityLevelMeter')) {
            let activityLevelWrapper = document.createElement('div');
            activityLevelWrapper.id = 'activityLevelWrapper';
            activityLevelWrapper.style.width = '120px';
            activityLevelWrapper.style.height = '10px';
            activityLevelWrapper.style.marginTop = '2px';
            activityLevelWrapper.style.backgroundColor = '#37383a';
            activityLevelWrapper.style.borderRadius = '6px';
            activityLevelWrapper.style.backgroundImage = `url('${this.Origin}/src/img/activity.svg')`
            activityLevelWrapper.style.backgroundSize = `14px 14px`
            activityLevelWrapper.style.backgroundRepeat = `no-repeat`
            activityLevelWrapper.style.backgroundPosition = `center center`
            container.appendChild(activityLevelWrapper);

            let activityLevelMeter = document.createElement('div');
            activityLevelMeter.id = 'activityLevelMeter';
            activityLevelMeter.style.backgroundColor = this.audioLevelColors.low;
            activityLevelMeter.style.width = '0%';
            activityLevelMeter.style.height = '10px';
            activityLevelMeter.style.borderRadius = '6px';
            activityLevelMeter.style.transition = "width 300ms linear";
            activityLevelMeter.style.opacity = '0.7';
            activityLevelWrapper.appendChild(activityLevelMeter);;
        }

        try {
            let audioLevelMeter = document.getElementById('audioLevelMeter');
            if (audioLevelMeter) {
                audioLevelMeter.style.width = soundLevel + '%';
                audioLevelMeter.style.backgroundColor = soundLevel < 61 ? this.audioLevelColors.low : soundLevel < 96 ? this.audioLevelColors.normal : this.audioLevelColors.high;
            }
            let activityLevelMeter = document.getElementById('activityLevelMeter');
            if (activityLevelMeter) {
                activityLevelMeter.style.width = activityLevel + '%';
            }
        } catch (e) {
            if (this.logging)
                console.error("Error updating audio level meter", e);
        }

        if (this.logging)
            console.log('Audio level meter updated');
    }
};

maestro.OverlayApp = new OverlayApp(document.currentScript.src);
maestro.OverlayApp.start();