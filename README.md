## SSLeuth: Certificate & Security Viewer

SSLeuth is a Firefox for Android browser extension that provides a detailed, easy-to-read view of the current page's TLS connection and certificate chain. Activated from the toolbar, it presents complex security information in a clean, user-friendly popup.

### Key Features

    Connection Details: Displays a summary of the TLS connection, including:

        Protocol Version (e.g., TLSv1.3)

        Cipher Suite

        Key Exchange and Signature Schemes

        Status of HSTS, Extended Validation (EV), and Certificate Transparency.

    Full Certificate Chain: Shows every certificate from the website's own certificate up to the root authority in individual, collapsible sections.

    In-Depth Certificate Info: For each certificate in the chain, it neatly displays:

        Subject and Issuer names, parsed for readability.

        The Validity Period (Not Before / Not After dates).

        The Serial Number and SHA-256 / SHA-1 Fingerprints.

    Robust and Accurate: The add-on uses background listeners to capture security data directly from network requests and intelligently clears stale data during cached (back/forward) navigations to ensure the information displayed is always for the current page.

    Custom Design: Features a polished dark theme for easy viewing and a self-theming SVG icon that automatically adapts to your browser's light or dark mode.
