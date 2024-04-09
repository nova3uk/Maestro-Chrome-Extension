var maestro = maestro || {};
var overlayApp = maestro.App.overlayApp;

overlayApp.btnColors = {};
overlayApp.btnColors.backgroundColor = "#308fe8";
overlayApp.btnColors.hover = "#0f1827";
overlayApp.btnColors.active = "#0f1827";
overlayApp.btnColors.font = "#b21aac";

// Function to create an overlay
overlayApp.createOverlay = function () {
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
}

// Function to create a container for the checkboxes and labels
overlayApp.createContainer = function (overlay, leftOrRight = 'right') {
    let container = document.createElement('div');
    container.style.display = 'flex';
    container.style.justifyContent = leftOrRight == "right" ? 'flex-end' : 'flex-start';
    container.style.marginRight = '30px';
    overlay.appendChild(container);
    return container;
}
// Create the overlay and container for right items
overlayApp.overlay = overlayApp.createOverlay();
overlayApp.container = overlayApp.createContainer(overlayApp.overlay);

overlayApp.createText = function (text) {
    let textElement = document.createElement('span');
    textElement.textContent = text;
    textElement.style.color = '#f4f5f5';
    textElement.style.marginLeft = '10px';
    return textElement;
}

// Function to create a checkbox with a label and an event listener
overlayApp.createCheckbox = function (id, text, onChange) {
    let checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = id;
    checkbox.style.cursor = 'pointer';
    checkbox.style.width = '0px';
    checkbox.style.height = '0px';
    checkbox.addEventListener('change', function () {
        overlayApp.clearCheckboxes(id);
        onChange(this.checked);
    });

    let checkboxContainer = document.createElement('div');
    checkboxContainer.id = `div_${id}`;
    checkboxContainer.style.display = 'flex';
    checkboxContainer.style.justifyContent = 'center';
    checkboxContainer.style.alignItems = 'center';
    checkboxContainer.style.width = '150px';
    checkboxContainer.style.marginLeft = '10px';
    checkboxContainer.style.backgroundColor = overlayApp.btnColors.backgroundColor;
    checkboxContainer.style.padding = '5px';
    checkboxContainer.style.borderRadius = '3px';
    checkboxContainer.style.cursor = 'pointer';

    checkboxContainer.onmouseover = function () {
        this.style.backgroundColor = overlayApp.btnColors.hover;
    }
    checkboxContainer.onmouseout = function () {
        let checkbox = document.getElementById(id);
        if (!checkbox.checked)
            this.style.backgroundColor = overlayApp.btnColors.backgroundColor;
    }
    checkboxContainer.onclick = function () {
        let checkbox = document.getElementById(id);
        checkbox.checked = !checkbox.checked;

        let event = new Event('change');
        checkbox.dispatchEvent(event);
    }
    let label = document.createElement('label');
    label.textContent = text;
    label.style.cursor = 'pointer';

    let svg = overlayApp.getIcon(text);
    checkboxContainer.appendChild(svg);
    checkboxContainer.appendChild(checkbox);
    checkboxContainer.appendChild(label);

    return checkboxContainer;
}
overlayApp.getIcon = function (iconName) {
    let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.stroke = 'currentColor';
    svg.style.fill = 'currentColor';
    svg.style.strokeWidth = '0';
    svg.style.width = '1em';
    svg.style.height = '1em';

    let path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    switch (iconName.toLowerCase()) {
        case 'blackout':
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
}
//Create dropdown
overlayApp.createDropdown = function (id, onChange) {
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
// Create the dropdown
overlayApp.colorDropdown = overlayApp.createDropdown('maestro_ext_color', function (selectedColor) {
    if (selectedColor === "") {
        maestro.App.setColorAll(false);
    } else {
        maestro.App.setColorAll(true, selectedColor);
    }
});
overlayApp.checkBoxClick = function (item, status, id) {
    if (status === true) {
        let div = document.getElementById(id);
        div.style.color = maestro.App.overlayApp.btnColors.font;
        div.style.backgroundColor = maestro.App.overlayApp.btnColors.active;
    } else {
        let div = document.getElementById(id);
        div.style.color = '';
        div.style.backgroundColor = maestro.App.overlayApp.btnColors.backgroundColor;
    }

    maestro.App.manualOverride(item, status);
};
// Create the checkboxes
overlayApp.blackoutCheckbox = overlayApp.createCheckbox('maestro_ext_blackout', 'BLACKOUT', function (checked) {
    overlayApp.checkBoxClick("BLACKOUT", checked, 'div_maestro_ext_blackout');
});
overlayApp.blinderCheckbox = overlayApp.createCheckbox('maestro_ext_blinder', 'BLINDER', function (checked) {
    overlayApp.checkBoxClick("WHITEOUT", checked, 'div_maestro_ext_blinder');
});
overlayApp.strobeCheckbox = overlayApp.createCheckbox('maestro_ext_strobe', 'STROBE', function (checked) {
    overlayApp.checkBoxClick("STROBE_ON", checked, 'div_maestro_ext_strobe');
});
overlayApp.fogCheckbox = overlayApp.createCheckbox('maestro_ext_fog', 'FOG', function (checked) {
    overlayApp.checkBoxClick("FOG_ON", checked, 'div_maestro_ext_fog');
});
overlayApp.effectCheckbox = overlayApp.createCheckbox('maestro_ext_effect', 'EFFECT', function (checked) {
    overlayApp.checkBoxClick("EFFECT_ON", checked, 'div_maestro_ext_effect');
});

// Append the controls to the container
if (maestro.App.colorPicker)
    overlayApp.container.appendChild(overlayApp.colorDropdown);

overlayApp.container.appendChild(overlayApp.blackoutCheckbox);
overlayApp.container.appendChild(overlayApp.blinderCheckbox);
overlayApp.container.appendChild(overlayApp.strobeCheckbox);
overlayApp.container.appendChild(overlayApp.fogCheckbox);
overlayApp.container.appendChild(overlayApp.effectCheckbox);

overlayApp.clearCheckbox = function (btnId) {
    let checkbox = document.getElementById(btnId);
    checkbox.checked = false;
};
overlayApp.clearCheckboxes = function (checkedBox) {
    if (checkedBox !== "maestro_ext_strobe" && checkedBox.toLowerCase() !== "strobe") {
        maestro.App.latchedOn = false;
        maestro.App.setStrobe(false, false);
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
            parentDiv.style.backgroundColor = overlayApp.btnColors.backgroundColor;
            parentDiv.style.color = '';
        }
    }
    if (maestro.App.logging)
        console.log('Cleared checkboxes');
};
(async function () {
    let buttonNames = ['Blackout', 'Blinder', 'Strobe', 'Fog', 'Effect'];

    buttonNames.forEach((buttonName) => {
        let observer = new MutationObserver(function (mutations) {
            let btn = maestro.App.findByText(buttonName, 'button')[0];
            if (btn && !btn.clearCheckboxesMousedownEventAdded) {
                btn.addEventListener('mousedown', () => overlayApp.clearCheckboxes(buttonName), false);
                btn.clearCheckboxesMousedownEventAdded = true;

                if (maestro.App.logging) console.log('Overlay button found:', buttonName);

            }
        });
        observer.observe(document, { childList: true, subtree: true });
    });
})();
(async function () {
    let cornerText = document.createElement('div');
    cornerText.style.position = 'fixed';
    cornerText.style.bottom = '10px';
    cornerText.style.left = '20px';
    cornerText.style.color = '#f4f5f5';
    cornerText.style.width = '200px';
    cornerText.style.height = '30px';
    cornerText.style.backgroundColor = 'rgba(0,0,0,0.8)';
    cornerText.style.zIndex = '100001';
    document.body.appendChild(cornerText);

    let systemInfo = await maestro.App.getSystemInfo();
    if (systemInfo) {
        let systemInfoContainer = overlayApp.createText(`v${systemInfo.version} -  `);
        cornerText.appendChild(systemInfoContainer);

        let clock = document.createElement('span');
        cornerText.appendChild(clock);

        function updateClock() {
            let now = new Date();
            let hours = now.getHours().toString().padStart(2, '0');
            let minutes = now.getMinutes().toString().padStart(2, '0');
            let seconds = now.getSeconds().toString().padStart(2, '0');
            clock.textContent = `${hours}:${minutes}:${seconds}`;
        }

        setInterval(updateClock, 1000);
    }
})();
