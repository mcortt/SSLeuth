// Stores security data for each tab, keyed by tabId.
var tabSecurityInfo = {};

// Captures security and connection details when a page request's headers are received.
function fetchSecurityInfo(details) {
  if (details.type !== "main_frame") {
    return;
  }

  return browser.webRequest.getSecurityInfo(details.requestId, {
    certificateChain: true
  }).then(securityInfo => {
    tabSecurityInfo[details.tabId] = {
      info: securityInfo,
      statusLine: details.statusLine || null
    };
  }).catch(error => {
    console.error(`Error fetching security info for tab ${details.tabId}:`, error);
    delete tabSecurityInfo[details.tabId];
  });
}

browser.webRequest.onHeadersReceived.addListener(
  fetchSecurityInfo,
  { urls: ["<all_urls>"] },
  ["blocking"]
);

// Cleans up data when a tab is closed.
browser.tabs.onRemoved.addListener((tabId) => {
  delete tabSecurityInfo[tabId];
});