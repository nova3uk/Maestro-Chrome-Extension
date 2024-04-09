var overlayApp = overlayApp || {};

// Function to create an overlay
overlayApp.createOverlay = function () {
    let overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.bottom = '0';
    overlay.style.width = '100%';
    overlay.style.height = '30px';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.8)';
    overlay.style.zIndex = '100000';
    document.body.appendChild(overlay);
    return overlay;
}

// Function to create a container for the checkboxes and labels
overlayApp.createContainer = function (overlay, leftOrRight = 'right') {
    let container = document.createElement('div');
    container.style.display = 'flex';
    container.style.justifyContent = leftOrRight == "right" ? 'flex-end' : 'flex-start';
    container.style.marginRight = '30px';
    container.innerHTML = '<span style="color: white; margin-right: 10px;font-weight:bold;">Latching Manual Overrides:</span>';
    overlay.appendChild(container);
    return container;
}
// Create the overlay and container for right items
overlayApp.overlay = overlayApp.createOverlay();
overlayApp.container = overlayApp.createContainer(overlayApp.overlay);

overlayApp.createText = function (text) {
    let textElement = document.createElement('span');
    textElement.textContent = text;
    textElement.style.color = 'white';
    textElement.style.marginLeft = '10px';
    return textElement;
}

// Function to create a checkbox with a label and an event listener
overlayApp.createCheckbox = function (id, text, onChange) {
    let checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = id;
    checkbox.style.cursor = 'pointer';
    checkbox.addEventListener('change', function () {
        overlayApp.clearCheckboxes(id);
        onChange(this.checked);
    });

    let label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = text;
    label.style.cursor = 'pointer';

    let checkboxContainer = document.createElement('div');
    checkboxContainer.style.marginRight = '10px';
    checkboxContainer.appendChild(checkbox);
    checkboxContainer.appendChild(label);

    return checkboxContainer;
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

// Create the checkboxes
overlayApp.blackoutCheckbox = overlayApp.createCheckbox('maestro_ext_blackout', 'Blackout', function (checked) {
    maestro.App.manualOverride("BLACKOUT", checked);
});
overlayApp.blinderCheckbox = overlayApp.createCheckbox('maestro_ext_blinder', 'Blinder', function (checked) {
    maestro.App.manualOverride("WHITEOUT", checked);
});
overlayApp.strobeCheckbox = overlayApp.createCheckbox('maestro_ext_strobe', 'Strobe', function (checked) {
    maestro.App.manualOverride("STROBE_ON", checked);
});
overlayApp.fogCheckbox = overlayApp.createCheckbox('maestro_ext_fog', 'Fog', function (checked) {
    maestro.App.manualOverride("FOG_ON", checked);
});
overlayApp.effectCheckbox = overlayApp.createCheckbox('maestro_ext_effect', 'Effect', function (checked) {
    maestro.App.manualOverride("EFFECT_ON", checked);
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
        if (checkbox)
            checkbox.checked = false;
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
    cornerText.style.bottom = '0';
    cornerText.style.left = '20px';
    cornerText.style.color = 'white';
    cornerText.style.width = '100px';
    cornerText.style.height = '30px';
    cornerText.style.backgroundColor = 'rgba(0,0,0,0.8)';
    cornerText.style.zIndex = '100001';
    document.body.appendChild(cornerText);

    let systemInfo = await maestro.App.getSystemInfo();
    if (systemInfo) {
        let systemInfoContainer = overlayApp.createText(`v${systemInfo.version}`);
        cornerText.appendChild(systemInfoContainer);
    }
})();