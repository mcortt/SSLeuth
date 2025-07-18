/**
 * Helper to get the Common Name (CN) from a subject string.
 */
function getCN(subject) {
  const cnMatch = subject.match(/CN=([^,]+)/);
  return cnMatch ? cnMatch[1] : 'Details';
}

/**
 * Parses a Distinguished Name string into a <ul> element for side-by-side display.
 */
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

/**
 * Formats the details for a single certificate into a <dl> element.
 */
function formatCertDetails(cert) {
  const formatDate = (epoch) => new Date(epoch).toLocaleDateString();
  
  const dl = document.createElement('dl');

  // Helper to add a row to the description list
  const addRow = (term, description, ...classes) => {
    const dt = document.createElement('dt');
    dt.textContent = term;
    
    const dd = document.createElement('dd');
    if (typeof description === 'string') {
      dd.textContent = description;
    } else {
      dd.appendChild(description); // Append if it's already a DOM element
    }

    if (classes.length) {
      dd.classList.add(...classes);
    }
    
    dl.appendChild(dt);
    dl.appendChild(dd);
  };

  // Helper to add a full-width group header
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

/**
 * Generates the complete UI from the securityInfo object.
 */
function generateFullHtml(securityInfo) {
  const fragment = document.createDocumentFragment();

  // Create Connection Details section
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

  addConnectionRow('Protocol', securityInfo.protocolVersion || 'N/A');
  addConnectionRow('Cipher Suite', securityInfo.cipherSuite || 'N/A');
  addConnectionRow('Key Exchange', securityInfo.keaGroupName || 'N/A');
  if (securityInfo.signatureSchemeName) {
    addConnectionRow('Signature', securityInfo.signatureSchemeName);
  }
  if (securityInfo.hsts !== undefined) {
    addConnectionRow('HSTS Active', securityInfo.hsts ? 'Yes' : 'No');
  }
  if (securityInfo.isExtendedValidation !== undefined) {
    addConnectionRow('EV Cert', securityInfo.isExtendedValidation ? 'Yes' : 'No');
  }
  if (securityInfo.certificateTransparencyStatus) {
    const ctStatus = securityInfo.certificateTransparencyStatus.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    addConnectionRow('Transparency', ctStatus);
  }
  fragment.appendChild(dlDetails);

  // Create Certificate Chain section
  const h2Chain = document.createElement('h2');
  h2Chain.textContent = 'Certificate Chain';
  fragment.appendChild(h2Chain);

  securityInfo.certificates.forEach((cert, index) => {
    const details = document.createElement('details');
    if (index === 0) {
      details.open = true;
    }
    
    const summary = document.createElement('summary');
    summary.textContent = getCN(cert.subject);
    
    details.appendChild(summary);
    details.appendChild(formatCertDetails(cert));
    fragment.appendChild(details);
  });

  return fragment;
}

// Main function to get stored security info
async function displayInfoForActiveTab() {
  const contentDiv = document.getElementById('content');
  contentDiv.textContent = ''; // Clear previous content safely

  // Helper to display an error message
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
    
    if (!tab.url.startsWith('https')) {
      showError('This page is not secure (HTTP). No certificate to show.');
      return;
    }

    const securityInfo = background.tabSecurityInfo[tab.id];

    if (securityInfo && securityInfo.state !== 'insecure') {
      contentDiv.appendChild(generateFullHtml(securityInfo));
    } else {
      showError('No certificate information captured yet. Please reload the page and try again.');
    }
  } catch (error) {
    console.error("Error retrieving security info from background script:", error);
    showError('Could not retrieve certificate information.');
  }
}

// Run the function when the popup opens
displayInfoForActiveTab();