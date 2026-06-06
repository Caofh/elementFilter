const selectorInput = document.getElementById("selector");
const keywordInput = document.getElementById("keyword");
const modeInputs = document.querySelectorAll('input[name="mode"]');
const modeHintEl = document.getElementById("mode-hint");
const enabledInput = document.getElementById("enabled");
const watchDomInput = document.getElementById("watchDom");
const applyButton = document.getElementById("apply");
const resetButton = document.getElementById("reset");
const statusEl = document.getElementById("status");

function setStatus(message) {
  statusEl.textContent = message;
}

function getSelectedMode() {
  return (
    document.querySelector('input[name="mode"]:checked')?.value || "highlight"
  );
}

function setSelectedMode(mode) {
  const input = document.querySelector(`input[name="mode"][value="${mode}"]`);
  if (input) input.checked = true;
  updateModeHint();
}

function updateModeHint() {
  modeHintEl.hidden = getSelectedMode() !== "show";
}

function onModeChange() {
  enabledInput.checked = false;
  updateModeHint();
  applyFilter();
}

function getConfig() {
  return {
    selector: selectorInput.value.trim(),
    keyword: keywordInput.value.trim(),
    mode: getSelectedMode(),
    enabled: enabledInput.checked,
    watchDom: watchDomInput.checked,
  };
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function sendToActiveTab(config) {
  const tab = await getActiveTab();
  if (!tab?.id) {
    throw new Error("未找到当前标签页");
  }

  const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
  let anyOk = false;
  const stats = { total: 0, matched: 0 };

  for (const frame of frames) {
    try {
      const result = await chrome.tabs.sendMessage(
        tab.id,
        { type: "APPLY_FILTER", config },
        { frameId: frame.frameId },
      );
      if (!result?.ok) continue;
      anyOk = true;
      stats.total += result.total || 0;
      stats.matched += result.matched || 0;
    } catch {
      // 该 frame 未注入 content script，跳过
    }
  }

  if (!anyOk) {
    throw new Error("未找到当前标签页");
  }

  return stats;
}

async function saveConfig(config) {
  await chrome.storage.sync.set(config);
}

async function loadConfig() {
  const config = await chrome.storage.sync.get([
    "selector",
    "keyword",
    "mode",
    "enabled",
    "watchDom",
  ]);

  selectorInput.value = config.selector || "";
  keywordInput.value = config.keyword || "";
  setSelectedMode(config.mode || "highlight");
  enabledInput.checked = Boolean(config.enabled);
  watchDomInput.checked = Boolean(config.watchDom);
}

async function applyFilter() {
  const config = getConfig();

  if (config.enabled && !config.selector && !config.keyword) {
    setStatus("请填写选择器或关键词");
    return;
  }

  try {
    await saveConfig(config);
    const stats = await sendToActiveTab(config);

    if (!config.enabled) {
      setStatus("已关闭");
      return;
    }

    if (stats.total === 0) {
      setStatus("已应用，未找到元素（可能在 Shadow DOM 内，请刷新后重试）");
      return;
    }

    if (stats.matched === 0) {
      setStatus(`已应用，找到 ${stats.total} 个元素，无关键词匹配`);
      return;
    }

    setStatus(`已应用，匹配 ${stats.matched} / 共 ${stats.total} 个`);
  } catch (error) {
    setStatus("无法在当前页面运行，请刷新后重试");
    console.error(error);
  }
}

async function resetFilter() {
  selectorInput.value = "";
  keywordInput.value = "";
  setSelectedMode("highlight");
  enabledInput.checked = false;
  watchDomInput.checked = false;

  const config = getConfig();
  await saveConfig(config);

  try {
    await sendToActiveTab(config);
    setStatus("已清除");
  } catch (error) {
    setStatus("已清除配置");
    console.error(error);
  }
}

applyButton.addEventListener("click", applyFilter);
resetButton.addEventListener("click", resetFilter);
enabledInput.addEventListener("change", applyFilter);
watchDomInput.addEventListener("change", applyFilter);
modeInputs.forEach((input) => {
  input.addEventListener("change", onModeChange);
});

loadConfig();
