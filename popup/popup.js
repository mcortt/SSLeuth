// Extracts the Common Name (CN) from a certificate subject string.
function getCN(subject) {
  const cnMatch = subject.match(/CN=([^,]+)/);
  return cnMatch ? cnMatch[1] : 'Details';
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

  if (data.statusLine) {
    addConnectionRow('HTTP Status', data.statusLine);
  }
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
    
    if (!tab.url.startsWith('https')) {
      showError('This page is not secure (HTTP). No certificate to show.');
      return;
    }

    const storedData = background.tabSecurityInfo[tab.id];

    if (storedData && storedData.info && storedData.info.state !== 'insecure') {
      contentDiv.appendChild(generateFullHtml(storedData));
    } else {
      showError('No certificate information captured yet. Please reload the page and try again.');
    }
  } catch (error) {
    console.error("Error retrieving security info from background script:", error);
    showError('Could not retrieve certificate information.');
  }
}

displayInfoForActiveTab();