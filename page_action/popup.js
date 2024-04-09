let storeSetting = function (key, value) {
    chrome.storage.sync.set({ [key]: value }, function () {
        console.log('Value is set to ' + value);
    });
};
let handleCheckboxChange = function (event) {
    let checkbox = event.target;
    storeSetting(checkbox.id, checkbox.checked);
    // Reload the current tab
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.reload(tabs[0].id);
    });
};
let checkboxes = document.querySelectorAll('input[type=checkbox]');
checkboxes.forEach(function (checkbox) {
    checkbox.addEventListener('change', handleCheckboxChange);
});
let loadSettings = function () {
    let checkboxes = document.querySelectorAll('input[type=checkbox]');
    checkboxes.forEach(function (checkbox) {
        chrome.storage.sync.get([checkbox.id], function (result) {
            checkbox.checked = result[checkbox.id] || false;
        });
    });
};

// Call loadSettings when the page loads
window.addEventListener('DOMContentLoaded', loadSettings);