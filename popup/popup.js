// Extracts the Common Name (CN) from a certificate subject string.
function getCN(subject) {
  const cnMatch = subject.match(/CN=([^,]+)/);
  return cnMatch ? cnMatch[1] : 'Details';
}

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
  if (suiteName.includes('_RC4_')) {
    return 'Uses the insecure RC4 cipher.';
  }
  if (suiteName.includes('_3DES_')) {
    return 'Uses the outdated 3DES cipher.';
  }
  return null; // Considered secure by our checks
}

// Creates a list of key/value pairs from a certificate's subject or issuer string.
function parseDistinguishedName(dn) {
  const list = document.createElement('ul');
  list.className = 'dn-list';
  const sanitizedDn = dn.replace(/"([^"]+)"/g, (match, p1) => p1.replace(/,/g, '&#44;'));
  const parts = sanitizedDn.split(',');
  parts.forEach(part => {
    if (part.includes('=')) {
      const [key, ...valueParts] = part.split('=');
      const value = valueParts.join('=').replace(/&#44;/g, ',');
      const listItem = document.createElement('li');
      const keyStrong = document.createElement('strong');
      keyStrong.textContent = key.trim();
      const valueSpan = document.createElement('span');
      valueSpan.textContent = value.trim();
      listItem.appendChild(keyStrong);
      listItem.appendChild(valueSpan);
      list.appendChild(listItem);
    }
  });
  return list;
}

// Builds the DOM element containing the details for a single certificate.
function formatCertDetails(cert) {
  const formatDate = (epoch) => new Date(epoch).toLocaleDateString();
  const dl = document.createElement('dl');

  const addRow = (term, description, ...classes) => {
    const dt = document.createElement('dt');
    dt.textContent = term;
    const dd = document.createElement('dd');
    if (typeof description === 'string') {
      dd.textContent = description;
    } else {
      dd.appendChild(description);
    }
    if (classes.length) {
      dd.classList.add(...classes);
    }
    dl.appendChild(dt);
    dl.appendChild(dd);
  };

  const addHeader = (text) => {
    const dt = document.createElement('dt');
    dt.className = 'group-header';
    dt.textContent = text;
    dl.appendChild(dt);
  };
  
  addHeader('Subject & Issuer');
  addRow('Subject', parseDistinguishedName(cert.subject));
  addRow('Issuer', parseDistinguishedName(cert.issuer));
  addHeader('Period of Validity');
  addRow('Not Before', formatDate(cert.validity.start));
  addRow('Not After', formatDate(cert.validity.end));
  addHeader('Fingerprints & Serial');
  addRow('Serial', cert.serialNumber, 'fingerprint');
  addRow('SHA-256', cert.fingerprint.sha256, 'fingerprint');
  addRow('SHA-1', cert.fingerprint.sha1, 'fingerprint');

  return dl;
}

// Builds the entire UI for the popup.
function generateFullHtml(data) {
  const securityInfo = data.info;
  const fragment = document.createDocumentFragment();

  // Determine the final display state and reason message.
  let displayState = 'secure';
  let displayMessage = 'SECURE';
  let reason = null;

  const isCipherWeak = getCipherWeaknessReason(securityInfo.cipherSuite);
  const hasNoCerts = !securityInfo.certificates || securityInfo.certificates.length === 0;

  if (securityInfo.state === 'insecure') {
    displayState = 'insecure';
    displayMessage = 'INSECURE';
    reason = 'This connection is not encrypted.';
  } else if (securityInfo.state === 'broken' || (securityInfo.state === 'secure' && hasNoCerts)) {
    displayState = 'broken';
    displayMessage = 'BROKEN';
    reason = 'The certificate has an issue (e.g., expired, self-signed, hostname mismatch, etc.).';
  } else if (securityInfo.state === 'weak' || isCipherWeak) {
    displayState = 'weak';
    displayMessage = 'WEAK';
    reason = isCipherWeak || 'The connection is using a weak protocol.';
  }

  // Create the status badge
  const statusDiv = document.createElement('div');
  statusDiv.className = `status-badge status-${displayState}`;
  statusDiv.textContent = displayMessage;
  fragment.appendChild(statusDiv);

  // If there's a reason for the non-secure state, display it
  if (reason) {
    const reasonDiv = document.createElement('div');
    reasonDiv.className = `reason-box reason-${displayState}`;
    reasonDiv.textContent = reason;
    fragment.appendChild(reasonDiv);
  }

  // Always show Connection Details
  const h2Details = document.createElement('h2');
  h2Details.textContent = 'Connection Details';
  fragment.appendChild(h2Details);

  const dlDetails = document.createElement('dl');
  dlDetails.className = 'connection-details';
  
  const addConnectionRow = (term, description) => {
    const dt = document.createElement('dt');
    dt.textContent = term;
    const dd = document.createElement('dd');
    dd.textContent = description;
    dlDetails.appendChild(dt);
    dlDetails.appendChild(dd);
  };

  if (data.statusLine) addConnectionRow('HTTP Status', data.statusLine);
  addConnectionRow('Protocol', securityInfo.protocolVersion || 'N/A');
  if (securityInfo.cipherSuite) addConnectionRow('Cipher Suite', `${securityInfo.cipherSuite} (${securityInfo.secretKeyLength || 'N/A'}-bit)`);
  if (securityInfo.keaGroupName) addConnectionRow('Key Exchange', securityInfo.keaGroupName);
  if (securityInfo.signatureSchemeName) addConnectionRow('Signature', securityInfo.signatureSchemeName);
  if (securityInfo.usedEch !== undefined) addConnectionRow('Encrypted Hello', securityInfo.usedEch ? 'Yes' : 'No');
  if (securityInfo.usedPrivateDns !== undefined) addConnectionRow('Private DNS', securityInfo.usedPrivateDns ? 'Yes' : 'No');
  if (securityInfo.hsts !== undefined) addConnectionRow('HSTS Active', securityInfo.hsts ? 'Yes' : 'No');
  if (securityInfo.isExtendedValidation !== undefined) addConnectionRow('EV Cert', securityInfo.isExtendedValidation ? 'Yes' : 'No');
  if (securityInfo.certificateTransparencyStatus) {
    const ctStatus = securityInfo.certificateTransparencyStatus.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    addConnectionRow('Transparency', ctStatus);
  }
  fragment.appendChild(dlDetails);

  // Only show Certificate Chain if certificates exist.
  if (securityInfo.certificates && securityInfo.certificates.length > 0) {
    const h2Chain = document.createElement('h2');
    h2Chain.textContent = 'Certificate Chain';
    fragment.appendChild(h2Chain);

    securityInfo.certificates.forEach((cert, index) => {
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = getCN(cert.subject);
      details.appendChild(summary);
      details.appendChild(formatCertDetails(cert));
      fragment.appendChild(details);
    });
  }

  return fragment;
}

// Main function that runs when the popup is opened.
async function displayInfoForActiveTab() {
  const contentDiv = document.getElementById('content');
  contentDiv.textContent = ''; // Clear previous content

  const showError = (message) => {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    contentDiv.appendChild(errorDiv);
  };

  try {
    const background = await browser.runtime.getBackgroundPage();
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      showError('No active tab found.');
      return;
    }
    
    const storedData = background.tabSecurityInfo[tab.id];

    // Check if the "core URL" (origin) matches, not the full URL.
    let isDataValid = false;
    if (storedData && storedData.url && storedData.info) {
      try {
        const currentOrigin = new URL(tab.url).origin;
        const storedOrigin = new URL(storedData.url).origin;
        if (currentOrigin === storedOrigin) {
          isDataValid = true;
        }
      } catch (e) {
        isDataValid = false;
      }
    }

    if (isDataValid) {
      contentDiv.appendChild(generateFullHtml(storedData));
    } else {
      if (tab.url.startsWith('http:')) {
        contentDiv.appendChild(generateFullHtml({ info: { state: 'insecure' } }));
      } else {
        showError('No certificate information captured for this page. Please reload to update.');
      }
    }
  } catch (error) {
    console.error("Error retrieving security info from background script:", error);
    showError('Could not retrieve certificate information.');
  }
}

displayInfoForActiveTab();