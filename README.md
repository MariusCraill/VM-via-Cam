<div align="center">

<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

  <h1>Built with AI Studio</h2>

  <p>The fastest path from prompt to production with Gemini.</p>

  <a href="https://aistudio.google.com/apps">Start building</a>

</div>

## Driver's licence scanning (South Africa)

The ID card and vehicle licence disc barcodes contain plain text, but the PDF417
barcode on the back of the **driver's licence card is RSA-encrypted binary data
(720 bytes)**. Reading it as text gives garbage, which is why it "does not scan".

`src/lib/saDriversLicence.ts` decrypts and parses it (no dependencies):

```ts
import { decodeSADriversLicence } from './lib/saDriversLicence';

// Pass the scanner's RAW BYTES (e.g. zxing-wasm / barcode-detector polyfill `result.bytes`).
const dl = decodeSADriversLicence(rawBytes);
if (dl) {
  // dl.surname, dl.initials, dl.idNumber, dl.licenceNumber, dl.vehicleCodes, dl.validTo, ...
} else {
  // not a driver's licence -> existing ID / licence disc parsing
}
```

Scanner requirements:
- Return **raw bytes**, not a UTF-8 string. The native `BarcodeDetector.rawValue` and
  some html5-qrcode builds UTF-8 decode the payload, which destroys it. A Latin-1 string
  (`@zxing/library` `getText()`) also works.
- Enable the **PDF417** format and use a high camera resolution (≥1280×720). The licence
  barcode is dense, so use autofocus or tap-to-focus and have the user hold the card close.
- Gemini/vision-model OCR can't decrypt this barcode. If OCR is used as a fallback,
  read the printed text on the **front** of the card instead.
