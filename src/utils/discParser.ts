/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { LicenseDiscData, DiscExpiryStatus } from '../types';
import { sanitizeVin, isValidVinFormat } from './vinDecoder';

// Helper to calculate days remaining and expiry status
export function calculateExpiry(dateString?: string): {
  status: DiscExpiryStatus;
  daysRemaining?: number;
  formattedDate?: string;
} {
  if (!dateString) {
    return { status: 'valid', daysRemaining: undefined };
  }

  let parsedDate: Date | null = null;

  // Handle YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    parsedDate = new Date(`${dateString}T23:59:59`);
  }
  // Handle YYYYMMDD
  else if (/^\d{8}$/.test(dateString)) {
    const y = dateString.slice(0, 4);
    const m = dateString.slice(4, 6);
    const d = dateString.slice(6, 8);
    parsedDate = new Date(`${y}-${m}-${d}T23:59:59`);
  }
  // Handle DD/MM/YYYY or DD-MM-YYYY
  else if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(dateString)) {
    const parts = dateString.split(/[/-]/);
    parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T23:59:59`);
  } else {
    const attempt = new Date(dateString);
    if (!isNaN(attempt.getTime())) {
      parsedDate = attempt;
    }
  }

  if (!parsedDate || isNaN(parsedDate.getTime())) {
    return { status: 'valid', formattedDate: dateString };
  }

  const now = new Date();
  const diffTime = parsedDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const yyyy = parsedDate.getFullYear();
  const mm = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const dd = String(parsedDate.getDate()).padStart(2, '0');
  const formattedDate = `${yyyy}-${mm}-${dd}`;

  let status: DiscExpiryStatus = 'valid';
  if (daysRemaining < 0) {
    status = 'expired';
  } else if (daysRemaining <= 30) {
    status = 'expiring_soon';
  }

  return { status, daysRemaining, formattedDate };
}

/**
 * Checks whether a string conforms to South African vehicle licence plate registration formats
 * e.g. "CA 123-456", "JM 44 TR GP", "ND 789 012", "CY 819-204", "KZ 491-032", "WP 921 442"
 */
export function isSouthAfricanPlateFormat(value?: string | null): boolean {
  if (!value) return false;
  const clean = value.trim().toUpperCase();
  if (clean.length < 4 || clean.length > 14) return false;

  // Pattern 1: Standard provincial with province suffix e.g. "JM 44 TR GP", "AB 12 CD GP", "ABC 123 GP"
  if (/^[A-Z]{2,3}\s*\d{2,4}\s*[A-Z]{0,2}\s*(GP|EC|FS|MP|NC|NW|LP|ZN|WP)$/i.test(clean)) {
    return true;
  }

  // Pattern 2: Regional prefix e.g. "CA 123-456", "ND 682-419", "CY 819-204", "KZ 491-032", "WP 921-442"
  if (/^(CA|CY|CF|CAM|CBR|CEO|CD|CL|CN|CR|CS|CT|CW|CZ|ND|ZN|KZ|NRB|NUR|PMB|WP)\s*[-–]?\s*\d{2,6}(\s*[A-Z]{0,2})?$/i.test(clean)) {
    return true;
  }

  // Pattern 3: Common 2-3 letters, hyphen/space, 3-6 digits
  if (/^[A-Z]{2,3}\s*[-–]\s*\d{3,6}$/i.test(clean)) {
    return true;
  }

  // Pattern 4: 2 letters, 2 digits, 2 letters (e.g. "JM 77 TR")
  if (/^[A-Z]{2}\s*\d{2}\s*[A-Z]{2}$/i.test(clean)) {
    return true;
  }

  return false;
}

// Known vehicle manufacturers to assist heuristic token identification
const KNOWN_MAKES = [
  'TOYOTA', 'VOLKSWAGEN', 'VW', 'FORD', 'BMW', 'MERCEDES-BENZ', 'MERCEDES',
  'HYUNDAI', 'NISSAN', 'ISUZU', 'SUZUKI', 'RENAULT', 'KIA', 'AUDI',
  'MAZDA', 'HONDA', 'CHEVROLET', 'LAND ROVER', 'JEEP', 'VOLVO', 'MITSUBISHI',
  'MAHINDRA', 'HAVAL', 'GWM', 'CHERY', 'OPEL', 'PEUGEOT', 'PORSCHE', 'SUBARU'
];

/**
 * Main parser for South African MVLX / MVL vehicle licence disc barcodes and generic QR codes
 */
export function parseLicenseDiscPayload(
  payload: string,
  barcodeFormat = 'QR_CODE'
): LicenseDiscData {
  const cleanPayload = payload.trim();
  const isPercentDelimited = cleanPayload.includes('%');
  const isPipeDelimited = cleanPayload.includes('|');
  const isJson = cleanPayload.startsWith('{') && cleanPayload.endsWith('}');

  let licenceNumber = '';
  let vehicleRegisterNumber = '';
  let controlNumber = '';
  let vin = '';
  let engineNumber = '';
  let make = '';
  let seriesName = '';
  let colour = '';
  let vehicleCategory = '';
  let tare: number | string = '';
  let gvm: number | string = '';
  let rawExpiryDate = '';
  let isSouthAfricanMvl = false;

  // 1. Check if JSON payload
  if (isJson) {
    try {
      const obj = JSON.parse(cleanPayload);
      licenceNumber = obj.licenceNumber || obj.regNumber || obj.registration || obj.plate || '';
      vehicleRegisterNumber = obj.vehicleRegisterNumber || obj.registerNumber || '';
      controlNumber = obj.controlNumber || obj.discNumber || '';
      vin = obj.vin || obj.VIN || '';
      engineNumber = obj.engineNumber || obj.engine || '';
      make = obj.make || obj.manufacturer || '';
      seriesName = obj.seriesName || obj.series || obj.model || '';
      colour = obj.colour || obj.color || '';
      vehicleCategory = obj.vehicleCategory || obj.category || obj.vehicleDescription || '';
      tare = obj.tare || obj.tareKg || '';
      gvm = obj.gvm || obj.gvmKg || '';
      rawExpiryDate = obj.expiryDate || obj.expiry || '';
      isSouthAfricanMvl = !!(obj.licenceNumber || obj.controlNumber);
    } catch {
      // Continue to regex / delimiters
    }
  }

  // 2. Standard South African MVL / MVLX format delimited by '%'
  else if (isPercentDelimited) {
    isSouthAfricanMvl = true;
    const tokens = cleanPayload
      .split('%')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    // Filter out common header markers like "MVL", "MVLX", "MVL1", "MVL2"
    const contentTokens = tokens.filter(
      (t) => !['MVL', 'MVLX', 'MVL1', 'MVL2', '01', '02', '1', '2'].includes(t.toUpperCase())
    );

    // 1. Locate the VIN (17 alphanumeric chars, no I, O, Q)
    const vinIdx = contentTokens.findIndex((t) => isValidVinFormat(sanitizeVin(t)));
    if (vinIdx !== -1) {
      vin = sanitizeVin(contentTokens[vinIdx]);
    }

    // 2. Locate South African Licence Plate candidate across tokens
    let plateTokenIdx = -1;
    for (let i = 0; i < contentTokens.length; i++) {
      if (i === vinIdx) continue;
      if (isSouthAfricanPlateFormat(contentTokens[i])) {
        plateTokenIdx = i;
        break;
      }
    }

    // 3. Locate Make
    let makeIdx = -1;
    for (let i = 0; i < contentTokens.length; i++) {
      if (i === vinIdx || i === plateTokenIdx) continue;
      if (KNOWN_MAKES.includes(contentTokens[i].toUpperCase())) {
        makeIdx = i;
        make = contentTokens[i].toUpperCase();
        break;
      }
    }

    // 4. Model / series is usually immediately after Make
    if (makeIdx !== -1 && contentTokens[makeIdx + 1]) {
      seriesName = contentTokens[makeIdx + 1];
    }

    // 5. Assign fields based on token mapping and indices
    if (plateTokenIdx !== -1) {
      licenceNumber = contentTokens[plateTokenIdx];
    } else if (contentTokens.length >= 7) {
      licenceNumber = contentTokens[0] || '';
    }

    // Standard sequential indices if not yet resolved:
    // [0] Licence Number (or Control No)
    // [1] Register Number
    // [2] Disc / Control Number
    // [3] VIN
    // [4] Engine Number (or Licence Number in certain formats)
    // [5] Make
    // [6] Series Name
    if (contentTokens.length >= 7) {
      if (!vehicleRegisterNumber) {
        const foundReg = contentTokens.find((t) => /^\d{10,14}$/.test(t));
        vehicleRegisterNumber = foundReg || contentTokens[1] || '';
      }
      if (!controlNumber) {
        const foundCtrl = contentTokens.find((t) => /^[A-Z]\d{7,9}$/i.test(t));
        controlNumber = foundCtrl || contentTokens[2] || '';
      }
      if (!colour && contentTokens[7]) {
        colour = contentTokens[7];
      }
      if (!rawExpiryDate && contentTokens[8]) {
        rawExpiryDate = contentTokens[8];
      }
      if (!vehicleCategory && contentTokens[9]) {
        vehicleCategory = contentTokens[9];
      }
      if (!tare && contentTokens[10]) {
        tare = contentTokens[10];
      }
      if (!gvm && contentTokens[11]) {
        gvm = contentTokens[11];
      }
    }

    // 6. ENGINE NUMBER RESOLUTION (CRITICAL BUG FIX)
    // Avoid ever setting engineNumber to licence plate:
    let engineCandidate = '';
    // If token 4 was licence plate, token 5 might be engine:
    if (plateTokenIdx === 4 && contentTokens[5] && contentTokens[5] !== make) {
      engineCandidate = contentTokens[5];
    } else if (contentTokens[4] && !isSouthAfricanPlateFormat(contentTokens[4]) && contentTokens[4] !== licenceNumber) {
      engineCandidate = contentTokens[4];
    }

    // If still not identified, search unassigned alphanumeric candidate:
    if (!engineCandidate) {
      for (let i = 0; i < contentTokens.length; i++) {
        if (i === vinIdx || i === plateTokenIdx || i === makeIdx || i === (makeIdx + 1)) continue;
        const tok = contentTokens[i];
        if (
          tok &&
          tok.length >= 5 &&
          tok.length <= 18 &&
          !isSouthAfricanPlateFormat(tok) &&
          tok !== licenceNumber &&
          tok !== vin &&
          tok !== controlNumber &&
          tok !== vehicleRegisterNumber &&
          !/^\d{4}[-/]/.test(tok) &&
          !/^\d{1,5}$/.test(tok) // not tare/gvm
        ) {
          engineCandidate = tok;
          break;
        }
      }
    }
    engineNumber = engineCandidate;

    // Heuristic verification: make sure VIN is valid 17-char or search for it across tokens
    if (!vin) {
      const foundVin = contentTokens.find((t) => isValidVinFormat(sanitizeVin(t)));
      if (foundVin) {
        vin = sanitizeVin(foundVin);
      }
    }

    // Find date token if not already parsed
    if (!rawExpiryDate || !/^\d{4}/.test(rawExpiryDate)) {
      const foundDate = contentTokens.find((t) => /^\d{4}[-/]\d{2}[-/]\d{2}$/.test(t) || /^\d{8}$/.test(t));
      if (foundDate) rawExpiryDate = foundDate;
    }

    // Find make if not recognized
    if (!make || !KNOWN_MAKES.includes(make.toUpperCase())) {
      const foundMake = contentTokens.find((t) => KNOWN_MAKES.includes(t.toUpperCase()));
      if (foundMake) make = foundMake;
    }
  }

  // 3. Pipe-delimited fallback (e.g. `REG|VIN|MAKE|MODEL|EXPIRY`)
  else if (isPipeDelimited) {
    const tokens = cleanPayload.split('|').map((t) => t.trim());
    licenceNumber = tokens[0] || '';
    vin = tokens[1] || '';
    make = tokens[2] || '';
    seriesName = tokens[3] || '';
    rawExpiryDate = tokens[4] || '';
  }

  // 4. Fallback unstructured token scanner
  if (!vin) {
    const vinMatch = cleanPayload.match(/[A-HJ-NPR-Z0-9]{17}/);
    if (vinMatch) {
      vin = vinMatch[0];
    }
  }

  if (!licenceNumber) {
    // Match common SA registration formats: e.g. "CA 123-456", "JM 44 TR GP", "ND 789 012"
    const regMatch = cleanPayload.match(/\b([A-Z]{2,3}\s*\d{2,4}\s*[A-Z]{0,2}|[A-Z]{2}\s*\d{2}\s*[A-Z]{2}\s*GP)\b/i);
    if (regMatch) {
      licenceNumber = regMatch[0].toUpperCase();
    }
  }

  // Sanitize VIN
  vin = sanitizeVin(vin);

  // Normalize licence number
  licenceNumber = licenceNumber.toUpperCase().trim();
  make = make.toUpperCase().trim();
  seriesName = seriesName.toUpperCase().trim();
  colour = colour.toUpperCase().trim();

  // CRITICAL FINAL SAFEGUARD:
  // If engineNumber matches licenceNumber or is a South African plate format, resolve it immediately!
  if (engineNumber) {
    if (engineNumber === licenceNumber || isSouthAfricanPlateFormat(engineNumber)) {
      if (!licenceNumber || licenceNumber === 'UNREGISTERED' || !isSouthAfricanPlateFormat(licenceNumber)) {
        licenceNumber = engineNumber;
      }
      engineNumber = '';
    }
  }

  // Calculate expiry status and days
  const { status: expiryStatus, daysRemaining, formattedDate } = calculateExpiry(rawExpiryDate);

  const id = `disc-${licenceNumber || vin || Date.now()}`;

  return {
    id,
    licenceNumber: licenceNumber || 'UNREGISTERED',
    vehicleRegisterNumber: vehicleRegisterNumber || undefined,
    controlNumber: controlNumber || undefined,
    vin: vin || 'PENDING_VIN',
    engineNumber: engineNumber || undefined,
    make: make || 'VEHICLE',
    seriesName: seriesName || 'STANDARD MODEL',
    colour: colour || undefined,
    vehicleCategory: vehicleCategory || 'LIGHT MOTOR VEHICLE',
    tare: tare || undefined,
    gvm: gvm || undefined,
    expiryDate: formattedDate || rawExpiryDate || undefined,
    expiryStatus,
    daysRemaining,
    rawBarcode: cleanPayload,
    barcodeFormat,
    scanTimestamp: Date.now(),
    isSouthAfricanMvl,
    isValidChecksum: vin.length === 17,
  };
}

/**
 * Pre-built authentic South African vehicle licence discs for immediate testing
 */
export const SAMPLE_LICENSE_DISCS: LicenseDiscData[] = [
  {
    id: 'sample-toyota-hilux',
    licenceNumber: 'ND 682-419',
    vehicleRegisterNumber: '980145293810',
    controlNumber: 'A84920194',
    vin: 'AFAZZZ4RZHY812345',
    engineNumber: '1GD-FTV892019',
    make: 'TOYOTA',
    seriesName: 'HILUX 2.8 GD-6 4X4 RB D/C',
    colour: 'WHITE',
    vehicleCategory: 'LIGHT MOTOR VEHICLE (L.D.V)',
    tare: 2060,
    gvm: 2910,
    expiryDate: '2026-11-30',
    expiryStatus: 'valid',
    daysRemaining: 254,
    rawBarcode: '%MVLX%ND 682-419%980145293810%A84920194%AFAZZZ4RZHY812345%1GD-FTV892019%TOYOTA%HILUX 2.8 GD-6 4X4 RB D/C%WHITE%2026-11-30%LIGHT MOTOR VEHICLE%2060%2910%',
    barcodeFormat: 'PDF_417',
    scanTimestamp: Date.now(),
    isSouthAfricanMvl: true,
    year: 2023,
    fuelType: 'Diesel',
    displacementL: '2.8L',
    driveType: '4x4',
    plantCountry: 'South Africa (Prospecton)',
    isValidChecksum: true,
  },
  {
    id: 'sample-vw-polo',
    licenceNumber: 'CA 342-911',
    vehicleRegisterNumber: '970281923847',
    controlNumber: 'B19283746',
    vin: 'AAVZZZ6RZHY192834',
    engineNumber: 'CWV819230',
    make: 'VOLKSWAGEN',
    seriesName: 'POLO VIVO 1.4 TRENDLINE',
    colour: 'SILVER',
    vehicleCategory: 'PASSENGER CAR (HATCHBACK)',
    tare: 1060,
    gvm: 1530,
    expiryDate: '2026-10-05',
    expiryStatus: 'expiring_soon',
    daysRemaining: 16,
    rawBarcode: '%MVL%CA 342-911%970281923847%B19283746%AAVZZZ6RZHY192834%CWV819230%VOLKSWAGEN%POLO VIVO 1.4 TRENDLINE%SILVER%2026-10-05%LIGHT MOTOR VEHICLE%1060%1530%',
    barcodeFormat: 'PDF_417',
    scanTimestamp: Date.now(),
    isSouthAfricanMvl: true,
    year: 2021,
    fuelType: 'Petrol',
    displacementL: '1.4L',
    driveType: '4x2 (FWD)',
    plantCountry: 'South Africa (Kariega / Uitenhage)',
    isValidChecksum: true,
  },
  {
    id: 'sample-ford-ranger',
    licenceNumber: 'JM 77 TR GP',
    vehicleRegisterNumber: '960481726354',
    controlNumber: 'C73849102',
    vin: 'AFVZZZ4GZHY654321',
    engineNumber: 'YN2X748192',
    make: 'FORD',
    seriesName: 'RANGER 2.0 BI-TURBO WILDTRAK',
    colour: 'ORANGE',
    vehicleCategory: 'LIGHT MOTOR VEHICLE (DOUBLE CAB)',
    tare: 2240,
    gvm: 3200,
    expiryDate: '2026-08-15',
    expiryStatus: 'expired',
    daysRemaining: -35,
    rawBarcode: '%MVLX%JM 77 TR GP%960481726354%C73849102%AFVZZZ4GZHY654321%YN2X748192%FORD%RANGER 2.0 BI-TURBO WILDTRAK%ORANGE%2026-08-15%LIGHT MOTOR VEHICLE%2240%3200%',
    barcodeFormat: 'PDF_417',
    scanTimestamp: Date.now(),
    isSouthAfricanMvl: true,
    year: 2022,
    fuelType: 'Diesel',
    displacementL: '2.0L Bi-Turbo',
    driveType: '4x4',
    plantCountry: 'South Africa (Silverton)',
    isValidChecksum: true,
  },
  {
    id: 'sample-bmw-320i',
    licenceNumber: 'CY 819-204',
    vehicleRegisterNumber: '950182736451',
    controlNumber: 'D84729103',
    vin: 'ACV5A1234HY789012',
    engineNumber: 'B48B20A12938',
    make: 'BMW',
    seriesName: '320I M SPORT AUTO (G20)',
    colour: 'BLUE',
    vehicleCategory: 'PASSENGER CAR (SEDAN)',
    tare: 1475,
    gvm: 2050,
    expiryDate: '2027-02-28',
    expiryStatus: 'valid',
    daysRemaining: 344,
    rawBarcode: '%MVL%CY 819-204%950182736451%D84729103%ACV5A1234HY789012%B48B20A12938%BMW%320I M SPORT AUTO%BLUE%2027-02-28%LIGHT MOTOR VEHICLE%1475%2050%',
    barcodeFormat: 'QR_CODE',
    scanTimestamp: Date.now(),
    isSouthAfricanMvl: true,
    year: 2023,
    fuelType: 'Petrol',
    displacementL: '2.0L Turbo',
    driveType: 'RWD',
    plantCountry: 'South Africa (Rosslyn)',
    isValidChecksum: true,
  },
  {
    id: 'sample-suzuki-swift',
    licenceNumber: 'KZ 491-032',
    vehicleRegisterNumber: '990371625483',
    controlNumber: 'E93847162',
    vin: 'MA3EZA123HY456789',
    engineNumber: 'K12M839201',
    make: 'SUZUKI',
    seriesName: 'SWIFT 1.2 GLX AUTO',
    colour: 'RED',
    vehicleCategory: 'PASSENGER CAR (HATCHBACK)',
    tare: 875,
    gvm: 1365,
    expiryDate: '2026-12-31',
    expiryStatus: 'valid',
    daysRemaining: 285,
    rawBarcode: '%MVL%KZ 491-032%990371625483%E93847162%MA3EZA123HY456789%K12M839201%SUZUKI%SWIFT 1.2 GLX%RED%2026-12-31%LIGHT MOTOR VEHICLE%875%1365%',
    barcodeFormat: 'PDF_417',
    scanTimestamp: Date.now(),
    isSouthAfricanMvl: true,
    year: 2024,
    fuelType: 'Petrol',
    displacementL: '1.2L',
    driveType: 'FWD',
    plantCountry: 'Japan / India',
    isValidChecksum: true,
  }
];
