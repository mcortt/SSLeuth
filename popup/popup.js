/**
 * Helper to get the Common Name (CN) from a subject string.
 */
function getCN(subject) {
  const cnMatch = subject.match(/CN=([^,]+)/);
  return cnMatch ? cnMatch[1] : 'Details';
}

/**
 * Parses a Distinguished Name string (Subject or Issuer) into a formatted HTML list.
 */
function parseDistinguishedName(dn) {
  const sanitizedDn = dn.replace(/"([^"]+)"/g, (match, p1) => p1.replace(/,/g, '&#44;'));
  const parts = sanitizedDn.split(',');
  let html = '<ul class="dn-list">';
  parts.forEach(part => {
    if (part.includes('=')) {
      const [key, ...valueParts] = part.split('=');
      const value = valueParts.join('=').replace(/&#44;/g, ',');
      html += `<li><strong>${key.trim()}</strong><span>${value.trim()}</span></li>`;
    }
  });
  html += '</ul>';
  return html;
}

/**
 * Formats the details for a single certificate.
 */
function formatCertDetails(cert) {
  const formatDate = (epoch) => new Date(epoch).toLocaleDateString();

  return `
    <dl>
      <dt class="group-header">Subject & Issuer</dt>
      <dt>Subject</dt> <dd>${parseDistinguishedName(cert.subject)}</dd>
      <dt>Issuer</dt> <dd>${parseDistinguishedName(cert.issuer)}</dd>
      
      <dt class="group-header">Period of Validity</dt>
      <dt>Not Before</dt> <dd>${formatDate(cert.validity.start)}</dd>
      <dt>Not After</dt> <dd>${formatDate(cert.validity.end)}</dd>

      <dt class="group-header">Fingerprints & Serial</dt>
      <dt>Serial</dt> <dd class="fingerprint">${cert.serialNumber}</dd>
      <dt>SHA-256</dt> <dd class="fingerprint">${cert.fingerprint.sha256}</dd>
      <dt>SHA-1</dt> <dd class="fingerprint">${cert.fingerprint.sha1}</dd>
    </dl>
  `;
}

/**
 * Generates the complete HTML for the certificate chain and connection details.
 */
function generateFullHtml(securityInfo) {
  let html = '<h2>Connection Details</h2>';
  html += '<dl class="connection-details">';
  html += `<dt>Protocol</dt> <dd>${securityInfo.protocolVersion || 'N/A'}</dd>`;
  html += `<dt>Cipher Suite</dt> <dd>${securityInfo.cipherSuite || 'N/A'}</dd>`;
  html += `<dt>Key Exchange</dt> <dd>${securityInfo.keaGroupName || 'N/A'}</dd>`;
  if (securityInfo.signatureSchemeName) {
    html += `<dt>Signature</dt> <dd>${securityInfo.signatureSchemeName}</dd>`;
  }
  if (securityInfo.hsts !== undefined) {
    html += `<dt>HSTS Active</dt> <dd>${securityInfo.hsts ? 'Yes' : 'No'}</dd>`;
  }
  if (securityInfo.isExtendedValidation !== undefined) {
    html += `<dt>EV Cert</dt> <dd>${securityInfo.isExtendedValidation ? 'Yes' : 'No'}</dd>`;
  }
  if (securityInfo.certificateTransparencyStatus) {
    const ctStatus = securityInfo.certificateTransparencyStatus.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    html += `<dt>Transparency</dt> <dd>${ctStatus}</dd>`;
  }
  html += '</dl>';

  html += '<h2>Certificate Chain</h2>';
  securityInfo.certificates.forEach((cert, index) => {
    const isOpen = index === 0 ? 'open' : '';
    html += `
      <details ${isOpen}>
        <summary>${getCN(cert.subject)}</summary>
        ${formatCertDetails(cert)}
      </details>
    `;
  });
  return html;
}

// Main function to get stored security info
async function displayInfoForActiveTab() {
  const contentDiv = document.getElementById('content');
  try {
    const background = await browser.runtime.getBackgroundPage();
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      contentDiv.innerHTML = '<div class="error">No active tab found.</div>';
      return;
    }
    
    if (!tab.url.startsWith('https')) {
      contentDiv.innerHTML = '<div class="error">This page is not secure (HTTP).<br>No certificate to show.</div>';
      return;
    }

    const securityInfo = background.tabSecurityInfo[tab.id];

    if (securityInfo && securityInfo.state !== 'insecure') {
      contentDiv.innerHTML = generateFullHtml(securityInfo);
    } else {
      contentDiv.innerHTML = '<div class="error">No certificate information captured yet. Please reload the page and try again.</div>';
    }
  } catch (error) {
    console.error("Error retrieving security info from background script:", error);
    contentDiv.innerHTML = '<div class="error">Could not retrieve certificate information.</div>';
  }
}

// Run the function when the popup opens
displayInfoForActiveTab();