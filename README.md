_An open-source browser extension that provides a detailed, easy-to-read view of any website's TLS/SSL certificate and connection security._

### Why SSLeuth?

Modern browsers, especially on mobile, often hide important security details. SSLeuth brings this crucial information back, allowing developers, security professionals, and curious users to see exactly how their connection is secured.

### Features

* **At-a-Glance Security Status**
    > A prominent, color-coded badge clearly labels the connection as **SECURE** (Green), **WARNING** (Yellow), or **INSECURE** (Red). It provides a simple, clear reason for any non-secure status.

* **Detailed Connection Analysis**
    > Get a complete picture of the TLS connection with details that are normally hidden, including the HTTP protocol version, cipher suite, key exchange group, HSTS status, and more.

* **Full Certificate Chain Inspection**
    > Dive deep into the certificate chain with a clean, collapsible interface. Each certificate's **Subject**, **Issuer**, **Validity Period**, and **Fingerprints** are parsed into an easy-to-read format.

* **Robust and Accurate**
    > SSLeuth uses background listeners to capture security information directly from network requests and intelligently handles cached navigations (like using the back/forward buttons) to prevent showing stale data.

## Installation
Get it from Mozilla Add-Ons: https://addons.mozilla.org/en-US/firefox/addon/ssleuth/
-or-
Download the latest release `.zip` file "SSLeuth.zip" from above.
