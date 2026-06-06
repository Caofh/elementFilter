const STYLE_ID = "element-filter-style";
const MARK_CLASS = "element-filter-mark";
const HIDDEN_CLASS = "element-filter-hidden";
const OBSERVER_DEBOUNCE_MS = 200;

const FILTER_STYLE = `
  .${MARK_CLASS} {
    outline: 2px solid #ff6b35 !important;
    outline-offset: 2px;
    background-color: rgba(255, 107, 53, 0.12) !important;
  }
  .${HIDDEN_CLASS} {
    display: none !important;
  }
`;

let currentConfig = {
  selector: "",
  keyword: "",
  mode: "highlight",
  enabled: false,
  watchDom: false,
};

let applyGeneration = 0;
let isApplying = false;
let debounceTimer = null;
let domObserver = null;
let observedRoots = new WeakSet();

function* walkRoots(root = document) {
  yield root;
  const scope = root instanceof Document ? root.documentElement : root;
  if (!scope?.querySelectorAll) return;

  for (const el of scope.querySelectorAll("*")) {
    if (el.shadowRoot) {
      yield* walkRoots(el.shadowRoot);
    }
  }
}

function queryAll(selector) {
  const seen = new Set();
  const results = [];

  for (const root of walkRoots(document)) {
    const scope =
      root instanceof Document ? root.documentElement : root;
    if (!scope?.querySelectorAll) continue;

    try {
      for (const el of scope.querySelectorAll(selector)) {
        if (!seen.has(el)) {
          seen.add(el);
          results.push(el);
        }
      }
    } catch {
      // 某些 root 内选择器可能无效，跳过
    }
  }

  return results;
}

function queryAllElements() {
  const seen = new Set();
  const results = [];

  for (const root of walkRoots(document)) {
    const scope = root instanceof Document ? root.body || root.documentElement : root;
    if (!scope?.querySelectorAll) continue;

    for (const el of scope.querySelectorAll("*")) {
      if (!seen.has(el)) {
        seen.add(el);
        results.push(el);
      }
    }
  }

  return results;
}

function queryAllMarked() {
  return queryAll(`.${MARK_CLASS}, .${HIDDEN_CLASS}`);
}

function ensureStyleInRoot(root) {
  const host = root instanceof Document ? root.documentElement : root;
  if (!host?.appendChild) return;

  let style = host.querySelector(`#${STYLE_ID}`);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    host.appendChild(style);
  }
  style.textContent = FILTER_STYLE;
}

function ensureStyleForElement(el) {
  const root = el.getRootNode();
  ensureStyleInRoot(root instanceof Document ? root : root);
}

function clearMarks() {
  queryAllMarked().forEach((el) => {
    el.classList.remove(MARK_CLASS, HIDDEN_CLASS);
    delete el.dataset.elementFilterHidden;
  });
}

function matchesKeyword(el, keyword) {
  if (!keyword) return true;

  const kw = keyword.toLowerCase();
  if ((el.textContent || "").toLowerCase().includes(kw)) return true;
  if ((el.innerText || "").toLowerCase().includes(kw)) return true;

  for (const attr of el.attributes || []) {
    if (attr.value.toLowerCase().includes(kw)) return true;
  }

  return false;
}

function isStale(generation) {
  return generation !== applyGeneration;
}

function applyFilter() {
  const generation = ++applyGeneration;
  let total = 0;
  let matched = 0;

  isApplying = true;
  try {
    clearMarks();
    if (isStale(generation)) return { total: 0, matched: 0 };
    if (!currentConfig.enabled) return { total: 0, matched: 0 };

    ensureStyleInRoot(document);

    const { selector, keyword, mode } = currentConfig;
    if (!selector && !keyword) return { total: 0, matched: 0 };

    const candidates = selector ? queryAll(selector) : queryAllElements();
    total = candidates.length;

    if (isStale(generation)) return { total, matched: 0 };

    for (const el of candidates) {
      if (isStale(generation)) break;

      const matches = matchesKeyword(el, keyword);
      ensureStyleForElement(el);

      if (mode === "show") {
        if (matches) {
          matched += 1;
          el.classList.remove(HIDDEN_CLASS);
        } else {
          el.classList.add(HIDDEN_CLASS);
        }
        continue;
      }

      if (!matches) continue;

      matched += 1;
      el.classList.add(MARK_CLASS);
      if (mode === "hide") {
        el.classList.add(HIDDEN_CLASS);
      }
    }
  } finally {
    isApplying = false;
  }

  return { total, matched };
}

function scheduleApplyFilter() {
  if (!currentConfig.enabled || !currentConfig.watchDom) return;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    applyFilter();
  }, OBSERVER_DEBOUNCE_MS);
}

function isOwnMutation(mutation) {
  const target = mutation.target;
  if (!(target instanceof Element)) return false;

  if (target.id === STYLE_ID) return true;

  if (
    target.classList?.contains(MARK_CLASS) ||
    target.classList?.contains(HIDDEN_CLASS)
  ) {
    return true;
  }

  return false;
}

function onDomMutation(mutations) {
  if (isApplying || !currentConfig.enabled || !currentConfig.watchDom) return;
  if (mutations.every(isOwnMutation)) return;

  for (const mutation of mutations) {
    for (const node of mutation.addedNodes || []) {
      if (!(node instanceof Element)) continue;
      if (node.shadowRoot) observeRoot(node.shadowRoot);
      node.querySelectorAll("*").forEach((el) => {
        if (el.shadowRoot) observeRoot(el.shadowRoot);
      });
    }
  }

  scheduleApplyFilter();
}

function observeRoot(root) {
  if (!root || observedRoots.has(root)) return;
  observedRoots.add(root);

  if (!domObserver) {
    domObserver = new MutationObserver(onDomMutation);
  }

  const target =
    root instanceof Document ? root.body || root.documentElement : root;
  if (!target) return;

  domObserver.observe(target, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["class"],
  });

  for (const el of target.querySelectorAll?.("*") || []) {
    if (el.shadowRoot) observeRoot(el.shadowRoot);
  }
}

function stopDomObserver() {
  clearTimeout(debounceTimer);
  debounceTimer = null;
  if (domObserver) {
    domObserver.disconnect();
    domObserver = null;
  }
  observedRoots = new WeakSet();
}

function syncDomObserver() {
  if (currentConfig.watchDom && currentConfig.enabled) {
    observeRoot(document);
    return;
  }
  stopDomObserver();
}

function init() {
  syncDomObserver();
  applyFilter();
}

chrome.storage.sync.get(
  ["selector", "keyword", "mode", "enabled", "watchDom"],
  (result) => {
    currentConfig = { ...currentConfig, ...result };
    init();
  },
);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "APPLY_FILTER") return;
  currentConfig = { ...currentConfig, ...message.config };
  syncDomObserver();
  const stats = applyFilter();
  sendResponse({ ok: true, ...stats });
});
