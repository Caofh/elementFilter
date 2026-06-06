chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    selector: "",
    keyword: "",
    mode: "highlight",
    enabled: false,
    watchDom: false,
  });
});