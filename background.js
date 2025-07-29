// Stores security data for each tab, keyed by tabId.
var tabSecurityInfo = {};
const ICON_SIZE = 64;
let blackIconImage = null;
let brokenIconImage = null;

// --- Icon Generation ---

// Pre-load all three icon versions into Image objects
const blackIconUrl = browser.runtime.getURL("icons/icon-black.svg");
const imageBlack = new Image();
imageBlack.src = blackIconUrl;
imageBlack.onload = () => { blackIconImage = imageBlack; };

const brokenIconUrl = browser.runtime.getURL("icons/icon-white.svg");
const imageBroken = new Image();
imageBroken.src = brokenIconUrl;
imageBroken.onload = () => { brokenIconImage = imageBroken; };

// Checks a cipher suite for weaknesses and returns the reason, or null if it's secure.
function getCipherWeaknessReason(suiteName) {
  if (!suiteName || !suiteName.startsWith('TLS_')) {
    return null; // Not a classic TLS suite name or not provided.
  }
  if (suiteName.startsWith('TLS_RSA_WITH_')) {
    return 'Lacks Perfect Forward Secrecy (PFS).';
  }
  if (suiteName.includes('_CBC_')) {
    return 'Uses an outdated CBC encryption mode.';
  }
  return null; // Considered secure by our checks
}

// Generates a dynamic icon by drawing a colored circle and the chosen icon on a canvas.
function generateIcon(backgroundColor, iconImage) {
  if (!iconImage) return null;
  const canvas = new OffscreenCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = backgroundColor;
  ctx.beginPath();
  ctx.arc(ICON_SIZE / 2, ICON_SIZE / 2, ICON_SIZE / 2, 0, 2 * Math.PI);
  ctx.fill();
  ctx.drawImage(iconImage, 0, 0, ICON_SIZE, ICON_SIZE);
  return ctx.getImageData(0, 0, ICON_SIZE, ICON_SIZE);
}

// Resets the icon for a given tab to the default, theme-aware SVG.
function resetIcon(tabId) {
    browser.browserAction.setIcon({ path: "icons/icon.svg", tabId: tabId });
}

// Determines the security state and updates the icon.
function updateIcon(tabId) {
  const storedData = tabSecurityInfo[tabId];

  if (!storedData || !storedData.info) {
    resetIcon(tabId);
    return;
  }

  const securityInfo = storedData.info;
  let displayState = 'secure';
  const isCipherWeak = getCipherWeaknessReason(securityInfo.cipherSuite);
  const hasNoCerts = !securityInfo.certificates || securityInfo.certificates.length === 0;

  if (securityInfo.state === 'insecure') {
    displayState = 'insecure';
  } else if (securityInfo.state === 'broken' || (securityInfo.state === 'secure' && hasNoCerts)) {
    displayState = 'broken';
  } else if (securityInfo.state === 'weak' || isCipherWeak) {
    displayState = 'weak';
  }
  
  let imageData;
  if (displayState === 'secure') {
    imageData = generateIcon('#30d158', blackIconImage);
  } else if (displayState === 'weak') {
    imageData = generateIcon('#ffcc00', blackIconImage);
  } else { // Covers both 'broken' and 'insecure'
    imageData = generateIcon('#ff453a', brokenIconImage);
  }

  if (imageData) {
    browser.browserAction.setIcon({ imageData: imageData, tabId: tabId });
  } else {
    resetIcon(tabId);
  }
}

// --- Event Listeners ---

function fetchSecurityInfo(details) {
  if (details.type !== "main_frame") {
    return;
  }
  return browser.webRequest.getSecurityInfo(details.requestId, {
    certificateChain: true
  }).then(securityInfo => {
    tabSecurityInfo[details.tabId] = {
      info: securityInfo,
      statusLine: details.statusLine || null,
      url: details.url
    };
    updateIcon(details.tabId);
  }).catch(error => {
    console.error(`Error fetching security info for tab ${details.tabId}:`, error);
    delete tabSecurityInfo[details.tabId];
  });
}

browser.tabs.onActivated.addListener((activeInfo) => {
  updateIcon(activeInfo.tabId);
});

browser.webRequest.onHeadersReceived.addListener(
  fetchSecurityInfo,
  { urls: ["<all_urls>"] },
  ["blocking"]
);

browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    resetIcon(tabId);
  } else if (changeInfo.status === 'complete') {
    browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
        if (tabs[0] && tabs[0].id === tabId) {
            updateIcon(tabId);
        }
    });
  }
});

browser.tabs.onRemoved.addListener((tabId) => {
  delete tabSecurityInfo[tabId];
});