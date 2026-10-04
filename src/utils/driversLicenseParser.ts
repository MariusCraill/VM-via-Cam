import { DriverLicenseData } from '../types';
import { decodeSADriversLicence, type SADriversLicence } from '../lib/saDriversLicence';

export interface SampleDriverLicense {
  label: string;
  category: 'Resident Guest' | 'Delivery Driver' | 'Contractor' | 'Taxi Driver' | 'Resident' | 'Visitor';
  data: DriverLicenseData;
}

export const SAMPLE_DRIVER_LICENSES: SampleDriverLicense[] = [
  {
    label: 'Sipho Dlamini (Resident Guest)',
    category: 'Resident Guest',
    data: {
      fullName: 'Sipho Nhlanhla Dlamini',
      initials: 'S N',
      surname: 'Dlamini',
      idNumber: '8805145023087',
      licenseNumber: 'DL49201948',
      licenseCodes: 'Code EB',
      licenseExpiryDate: '2027-04-15',
      firstIssueDate: '2010-03-20',
      gender: 'M',
      dateOfBirth: '1988-05-14',
      countryOfIssue: 'South Africa',
      documentType: 'drivers_license',
      format: 'BARCODE_PDF417',
      confidence: 0.99,
    },
  },
  {
    label: 'Bongani Sithole (Courier Driver)',
    category: 'Delivery Driver',
    data: {
      fullName: 'Bongani Kenneth Sithole',
      initials: 'B K',
      surname: 'Sithole',
      idNumber: '9208225890081',
      licenseNumber: 'DL88129031',
      licenseCodes: 'Code B',
      licenseExpiryDate: '2028-09-10',
      firstIssueDate: '2014-07-11',
      gender: 'M',
      dateOfBirth: '1992-08-22',
      countryOfIssue: 'South Africa',
      documentType: 'drivers_license',
      format: 'BARCODE_PDF417',
      confidence: 0.98,
    },
  },
  {
    label: 'Pieter Coetzee (Contractor / Electrician)',
    category: 'Contractor',
    data: {
      fullName: 'Pieter Willem Coetzee',
      initials: 'P W',
      surname: 'Coetzee',
      idNumber: '7911045091084',
      licenseNumber: 'DL33901928',
      licenseCodes: 'Code EB, C1',
      licenseExpiryDate: '2026-12-05',
      firstIssueDate: '1999-10-18',
      gender: 'M',
      dateOfBirth: '1979-11-04',
      countryOfIssue: 'South Africa',
      documentType: 'drivers_license',
      format: 'OCR_VISION',
      confidence: 0.96,
    },
  },
  {
    label: 'Amina Patel (Uber / Rideshare)',
    category: 'Taxi Driver',
    data: {
      fullName: 'Amina Fatima Patel',
      initials: 'A F',
      surname: 'Patel',
      idNumber: '9403190123089',
      licenseNumber: 'DL77410291',
      licenseCodes: 'Code B',
      licenseExpiryDate: '2028-02-28',
      firstIssueDate: '2016-01-14',
      gender: 'F',
      dateOfBirth: '1994-03-19',
      countryOfIssue: 'South Africa',
      documentType: 'drivers_license',
      format: 'OCR_VISION',
      confidence: 0.97,
    },
  },
];

export const SAMPLE_ID_CARDS: SampleDriverLicense[] = [
  {
    label: 'Marius Craill (Smart ID Card)',
    category: 'Resident',
    data: {
      fullName: 'Marius Craill',
      initials: 'M',
      surname: 'Craill',
      idNumber: '8204125192083',
      licenseNumber: 'ID-CARD',
      idCardNumber: 'ZA-99182341',
      licenseCodes: 'ID Document',
      licenseExpiryDate: undefined,
      gender: 'M',
      dateOfBirth: '1982-04-12',
      countryOfIssue: 'South Africa',
      citizenship: 'South African Citizen (RSA)',
      documentType: 'id_card',
      format: 'OCR_VISION',
      confidence: 0.99,
    },
  },
  {
    label: 'Thabo Mokoena (Smart ID Card)',
    category: 'Resident Guest',
    data: {
      fullName: 'Thabo Goodwill Mokoena',
      initials: 'T G',
      surname: 'Mokoena',
      idNumber: '9107155234088',
      licenseNumber: 'ID-CARD',
      idCardNumber: 'ZA-41829033',
      licenseCodes: 'ID Document',
      licenseExpiryDate: undefined,
      gender: 'M',
      dateOfBirth: '1991-07-15',
      countryOfIssue: 'South Africa',
      citizenship: 'South African Citizen (RSA)',
      documentType: 'id_card',
      format: 'OCR_VISION',
      confidence: 0.98,
    },
  },
  {
    label: 'Zanele Khumalo (Smart ID Card)',
    category: 'Visitor',
    data: {
      fullName: 'Zanele Nomvula Khumalo',
      initials: 'Z N',
      surname: 'Khumalo',
      idNumber: '9512030384089',
      licenseNumber: 'ID-CARD',
      idCardNumber: 'ZA-77218392',
      licenseCodes: 'ID Document',
      licenseExpiryDate: undefined,
      gender: 'F',
      dateOfBirth: '1995-12-03',
      countryOfIssue: 'South Africa',
      citizenship: 'South African Citizen (RSA)',
      documentType: 'id_card',
      format: 'OCR_VISION',
      confidence: 0.97,
    },
  },
];

/**
 * Validates a South African 13-digit ID number using the Luhn checksum algorithm
 * and extracts date of birth & gender.
 */
export function parseSouthAfricanIdNumber(idStr: string): {
  isValid: boolean;
  dateOfBirth?: string;
  gender?: 'M' | 'F';
  isCitizen?: boolean;
} {
  const clean = idStr.replace(/\D/g, '');
  if (clean.length !== 13) {
    return { isValid: false };
  }

  // Luhn algorithm check
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    let digit = parseInt(clean.charAt(i), 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }

  const isValid = sum % 10 === 0;

  // Extract DOB: YYMMDD
  const yy = parseInt(clean.substring(0, 2), 10);
  const mm = clean.substring(2, 4);
  const dd = clean.substring(4, 6);
  // Assume year > 25 is 1900s, <= 25 is 2000s
  const fullYear = yy > 25 ? 1900 + yy : 2000 + yy;
  const dateOfBirth = `${fullYear}-${mm}-${dd}`;

  // Gender: digits 7-10 (4000-4999 = Female, 5000-9999 = Male)
  const genderCode = parseInt(clean.substring(6, 10), 10);
  const gender: 'M' | 'F' = genderCode >= 5000 ? 'M' : 'F';

  // Citizenship: digit 11 (0 = SA citizen, 1 = permanent resident)
  const isCitizen = clean.charAt(10) === '0';

  return {
    isValid,
    dateOfBirth,
    gender,
    isCitizen,
  };
}

/**
 * Parses raw barcode payload or OCR output from Driver's License or ID Card.
 */
export function parseDriverLicenseRawText(
  rawText: string,
  preferredType: 'drivers_license' | 'id_card' = 'drivers_license'
): DriverLicenseData {
  const clean = rawText.trim();

  // Try JSON first (if returned from Gemini API)
  try {
    const json = JSON.parse(clean);
    if (json.fullName || json.licenseNumber || json.idNumber || json.surname) {
      const docType = json.documentType || preferredType;
      const isIdCard = docType === 'id_card';
      return {
        fullName:
          json.fullName ||
          `${json.initials || json.givenNames || ''} ${json.surname || ''}`.trim() ||
          (isIdCard ? 'ID Card Holder' : 'Driver'),
        initials: json.initials,
        surname: json.surname,
        idNumber: json.idNumber || '',
        licenseNumber: isIdCard ? json.idCardNumber || 'ID-CARD' : json.licenseNumber || 'DL-PENDING',
        idCardNumber: json.idCardNumber,
        licenseCodes: isIdCard ? 'ID Document' : json.licenseCodes || 'Code B',
        licenseExpiryDate: json.expiryDate || json.licenseExpiryDate,
        firstIssueDate: json.firstIssueDate,
        gender: json.gender || 'M',
        dateOfBirth: json.dateOfBirth,
        countryOfIssue: json.countryOfIssue || 'South Africa',
        citizenship: json.citizenship || 'South African Citizen (RSA)',
        documentType: docType,
        format: 'OCR_VISION',
        confidence: json.confidence || 0.95,
      };
    }
  } catch {
    // Continue to text parsing
  }

  // Look for 13-digit South African ID number
  const idMatch = clean.match(/\b\d{13}\b/);
  const idNumber = idMatch ? idMatch[0] : '';
  const parsedId = idNumber ? parseSouthAfricanIdNumber(idNumber) : { isValid: false };

  // Look for License number pattern (e.g. DL12345678 or alphanumeric 8-12 chars)
  const licMatch = clean.match(/\b[A-Z0-9]{8,12}\b/i);
  const licenseNumber = licMatch ? licMatch[0].toUpperCase() : '';

  // Look for date in YYYY-MM-DD or DD/MM/YYYY
  const dateMatch = clean.match(/\b(19|20)\d{2}[-/.]\d{2}[-/.]\d{2}\b/);
  const expiryDate = dateMatch ? dateMatch[0].replace(/[/.]/g, '-') : undefined;

  const isIdCard = preferredType === 'id_card';

  return {
    fullName: clean.split('\n')[0].substring(0, 40) || (isIdCard ? 'ID Card Visitor' : 'Visitor Driver'),
    idNumber,
    licenseNumber: isIdCard ? 'ID-CARD' : licenseNumber || 'DL-PENDING',
    idCardNumber: isIdCard ? licenseNumber || undefined : undefined,
    licenseCodes: isIdCard ? 'ID Document' : 'Code B',
    licenseExpiryDate: isIdCard ? undefined : expiryDate,
    gender: parsedId.gender || 'M',
    dateOfBirth: parsedId.dateOfBirth,
    countryOfIssue: 'South Africa',
    citizenship: 'South African Citizen (RSA)',
    documentType: preferredType,
    rawPayload: clean,
    format: 'BARCODE_PDF417',
    confidence: 0.88,
  };
}

/** "YYYY/MM/DD" (licence barcode) -> "YYYY-MM-DD". */
function slashDateToIso(d: string): string | undefined {
  return d ? d.replace(/\//g, '-') : undefined;
}

/** Maps a decrypted SA driver's licence barcode into the app's driver model. */
export function driverDataFromSALicence(dl: SADriversLicence): DriverLicenseData {
  const parsedId = parseSouthAfricanIdNumber(dl.idNumber);
  const initials = dl.initials.split('').join(' ').replace(/\s+/g, ' ').trim();
  return {
    fullName: `${initials} ${titleCase(dl.surname)}`.trim(),
    initials,
    surname: titleCase(dl.surname),
    idNumber: dl.idNumber,
    licenseNumber: dl.licenceNumber,
    licenseCodes: dl.vehicleCodes.length ? `Code ${dl.vehicleCodes.join(', ')}` : undefined,
    licenseExpiryDate: slashDateToIso(dl.validTo),
    firstIssueDate: slashDateToIso(dl.licenceCodeIssueDates[0] || dl.validFrom),
    gender: dl.gender === 'male' ? 'M' : 'F',
    dateOfBirth: slashDateToIso(dl.birthDate) || parsedId.dateOfBirth,
    countryOfIssue: dl.licenceCountryOfIssue === 'ZA' ? 'South Africa' : dl.licenceCountryOfIssue,
    citizenship: parsedId.isValid
      ? parsedId.isCitizen
        ? 'South African Citizen (RSA)'
        : 'Permanent Resident'
      : undefined,
    documentType: 'drivers_license',
    format: 'BARCODE_PDF417',
    confidence: 1,
  };
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (m) => m.toUpperCase());
}

/**
 * Smart ID card (reverse PDF417) payload, pipe-delimited:
 * SURNAME|NAMES|SEX|NATIONALITY|ID NUMBER|DOB|COUNTRY OF BIRTH|STATUS|ISSUE DATE|...
 */
export function parseSmartIdBarcode(raw: string): DriverLicenseData | null {
  const parts = raw.split('|').map((p) => p.trim());
  if (parts.length < 6) return null;
  const idIndex = parts.findIndex((p) => /^\d{13}$/.test(p));
  if (idIndex < 0) return null;

  const idNumber = parts[idIndex];
  const parsedId = parseSouthAfricanIdNumber(idNumber);
  const surname = titleCase(parts[0] || '');
  const names = titleCase(parts[1] || '');
  const sex = (parts[2] || '').toUpperCase();
  const status = parts[7] || '';

  return {
    fullName: `${names} ${surname}`.trim() || 'ID Card Holder',
    initials: names
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => n[0])
      .join(' '),
    surname,
    idNumber,
    licenseNumber: 'ID-CARD',
    licenseCodes: 'ID Document',
    gender: sex === 'M' || sex === 'F' ? sex : parsedId.gender || 'M',
    dateOfBirth: parsedId.dateOfBirth,
    countryOfIssue: 'South Africa',
    citizenship: /citizen/i.test(status)
      ? 'South African Citizen (RSA)'
      : status || (parsedId.isCitizen ? 'South African Citizen (RSA)' : 'Permanent Resident'),
    documentType: 'id_card',
    format: 'BARCODE_PDF417',
    confidence: parsedId.isValid ? 0.99 : 0.9,
  };
}

/** True when a decoded barcode string is binary data rather than readable text. */
export function looksBinary(raw: string): boolean {
  if (raw.includes('�')) return true;
  let control = 0;
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i);
    if ((c < 0x20 && c !== 0x0a && c !== 0x0d && c !== 0x09) || (c >= 0x7f && c < 0xa0) || c > 0x2000) {
      control++;
    }
  }
  return raw.length > 0 && control / raw.length > 0.1;
}

export type DocumentBarcodeResult =
  | { status: 'ok'; data: DriverLicenseData }
  /** A barcode was read but is binary and not decodable (partial / UTF-8 mangled read). */
  | { status: 'unreadable' };

/**
 * Interprets any document barcode: encrypted SA driver's licence, Smart ID
 * card, green ID book (13-digit ID) or other text payloads.
 */
export function interpretDocumentBarcode(
  raw: string,
  preferredType: 'drivers_license' | 'id_card' = 'drivers_license'
): DocumentBarcodeResult {
  const dl = decodeSADriversLicence(raw);
  if (dl) return { status: 'ok', data: driverDataFromSALicence(dl) };
  if (looksBinary(raw)) return { status: 'unreadable' };

  const smartId = parseSmartIdBarcode(raw);
  if (smartId) return { status: 'ok', data: smartId };

  return { status: 'ok', data: parseDriverLicenseRawText(raw, preferredType) };
}
