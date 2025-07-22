// Stores security data for each tab, keyed by tabId.
var tabSecurityInfo = {};
const ICON_SIZE = 64;
let whiteIconImage = null;
let blackIconImage = null;

// --- Icon Generation ---

// Pre-load the white and black icons into Image objects
const whiteIconUrl = browser.runtime.getURL("icons/icon-white.svg");
const imageWhite = new Image();
imageWhite.src = whiteIconUrl;
imageWhite.onload = () => { whiteIconImage = imageWhite; };

const blackIconUrl = browser.runtime.getURL("icons/icon-black.svg");
const imageBlack = new Image();
imageBlack.src = blackIconUrl;
imageBlack.onload = () => { blackIconImage = imageBlack; };

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
  
  // This logic now perfectly matches the final version in popup.js
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
    imageData = generateIcon('#30d158', blackIconImage); // Green background, BLACK icon
  } else if (displayState === 'weak') {
    imageData = generateIcon('#ffcc00', blackIconImage); // Yellow background, BLACK icon
  } else { // Covers both 'broken' and 'insecure'
    imageData = generateIcon('#ff453a', whiteIconImage); // Red background, WHITE icon
  }

  if (imageData) {
    browser.browserAction.setIcon({ imageData: imageData, tabId: tabId });
  } else {
    resetIcon(tabId); // Fallback if images haven't loaded yet
  }
}

// --- Event Listeners ---

// Captures security info when a request completes.
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

// Updates the icon whenever the user switches to a different tab.
browser.tabs.onActivated.addListener((activeInfo) => {
  updateIcon(activeInfo.tabId);
});

browser.webRequest.onHeadersReceived.addListener(
  fetchSecurityInfo,
  { urls: ["<all_urls>"] },
  ["blocking"]
);

// When a tab starts loading or is updated, reset or update the icon.
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    resetIcon(tabId);
  } else {
    browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
        if (tabs[0] && tabs[0].id === tabId) {
            updateIcon(tabId);
        }
    });
  }
});

// Cleans up data when a tab is closed.
browser.tabs.onRemoved.addListener((tabId) => {
  delete tabSecurityInfo[tabId];
});