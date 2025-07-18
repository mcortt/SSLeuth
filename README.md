# SSLeuth: Certificate & Security Viewer

_A Firefox for Android browser extension that provides a detailed, easy-to-read view of the current page's TLS connection and certificate chain. Activated from the toolbar, it presents complex security information in a clean, user-friendly popup._
---
## Features

* **Comprehensive Connection Details**
    > Displays protocol version, cipher suite, key exchange, signature scheme, and the status for HSTS, Extended Validation (EV), and Certificate Transparency.

* **Full Certificate Chain Inspection**
    > Shows the entire certificate chain in collapsible sections. Each certificate's details are available, including Subject and Issuer names, validity period, serial number, and SHA-256/SHA-1 fingerprints.

* **Robust and Accurate**
    > Uses background listeners to capture fresh data directly from network requests. It intelligently clears stale information during cached (back/forward) navigations to ensure accuracy.

* **Polished Design**
    > Features a custom-built dark theme for readability and a self-theming toolbar icon that automatically adapts to your browser's light or dark mode.

---

## Installation

1.  Download the latest release `.zip` file from the `[Releases](https://github.com/your-username/your-repo/releases)` page.
2.  Follow the guide for `[testing on Android](https://extensionworkshop.com/documentation/develop/testing-on-android/)` to install the add-on through a custom add-on collection.
