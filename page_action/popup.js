function popup(msg) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { message: msg }, function (response) {
      if (response !== "ok" && msg == "start") {
        window.close();
        return false;
      }
      window.close();
      return true;
    });
  });
}
popup("start");
