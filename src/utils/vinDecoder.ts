/**
 * ISO 3779 VIN Decoder and Validator
 */
import { VehicleSpecs } from '../types';

const TRANSLITERATION_MAP: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4,
  '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
};

const POSITION_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

// Model Year character mapping (10th character)
const YEAR_CODES: Record<string, number> = {
  A: 2010, B: 2011, C: 2012, D: 2013, E: 2014, F: 2015, G: 2016, H: 2017,
  J: 2018, K: 2019, L: 2020, M: 2021, N: 2022, P: 2023, R: 2024, S: 2025,
  T: 2026, V: 2027, W: 2028, X: 2029, Y: 2030,
  '1': 2031, '2': 2032, '3': 2033, '4': 2034, '5': 2035, '6': 2036, '7': 2037, '8': 2038, '9': 2039,
};

// Common WMI (First 3 characters)
const WMI_MAP: Record<string, { make: string; country: string }> = {
  // South Africa (Local manufacturers)
  AAV: { make: 'Volkswagen', country: 'South Africa' },
  ACV: { make: 'BMW', country: 'South Africa' },
  ADD: { make: 'Mercedes-Benz', country: 'South Africa' },
  ADM: { make: 'Isuzu / GM', country: 'South Africa' },
  AFA: { make: 'Toyota', country: 'South Africa' },
  AFV: { make: 'Ford', country: 'South Africa' },
  AHM: { make: 'Honda', country: 'South Africa' },
  AHV: { make: 'Nissan', country: 'South Africa' },
  AHL: { make: 'Hyundai', country: 'South Africa' },

  // Germany
  WAU: { make: 'Audi', country: 'Germany' },
  WBA: { make: 'BMW', country: 'Germany' },
  WBY: { make: 'BMW i', country: 'Germany' },
  WDB: { make: 'Mercedes-Benz', country: 'Germany' },
  WDC: { make: 'DaimlerChrysler', country: 'Germany' },
  WDD: { make: 'Mercedes-Benz', country: 'Germany' },
  WP0: { make: 'Porsche', country: 'Germany' },
  WVW: { make: 'Volkswagen', country: 'Germany' },
  WV1: { make: 'Volkswagen Commercial', country: 'Germany' },
  WV2: { make: 'Volkswagen Bus', country: 'Germany' },
  WOL: { make: 'Opel', country: 'Germany' },

  // Japan
  JHM: { make: 'Honda', country: 'Japan' },
  JTD: { make: 'Toyota', country: 'Japan' },
  JTE: { make: 'Toyota', country: 'Japan' },
  JT1: { make: 'Toyota', country: 'Japan' },
  JT2: { make: 'Toyota', country: 'Japan' },
  JN1: { make: 'Nissan', country: 'Japan' },
  JM1: { make: 'Mazda', country: 'Japan' },
  JS1: { make: 'Suzuki', country: 'Japan' },
  JS2: { make: 'Suzuki', country: 'Japan' },
  JF1: { make: 'Subaru', country: 'Japan' },
  JMB: { make: 'Mitsubishi', country: 'Japan' },

  // Korea
  KMH: { make: 'Hyundai', country: 'South Korea' },
  KNA: { make: 'Kia', country: 'South Korea' },
  KND: { make: 'Kia', country: 'South Korea' },

  // United Kingdom
  SAJ: { make: 'Jaguar', country: 'United Kingdom' },
  SAL: { make: 'Land Rover', country: 'United Kingdom' },
  SAR: { make: 'Rover', country: 'United Kingdom' },
  SCC: { make: 'Lotus', country: 'United Kingdom' },
  SHS: { make: 'Honda', country: 'United Kingdom' },

  // United States
  '1FA': { make: 'Ford', country: 'United States' },
  '1FB': { make: 'Ford', country: 'United States' },
  '1FC': { make: 'Ford', country: 'United States' },
  '1FD': { make: 'Ford', country: 'United States' },
  '1FM': { make: 'Ford', country: 'United States' },
  '1FT': { make: 'Ford Truck', country: 'United States' },
  '1G1': { make: 'Chevrolet', country: 'United States' },
  '1GC': { make: 'Chevrolet Truck', country: 'United States' },
  '1GM': { make: 'Pontiac', country: 'United States' },
  '1HG': { make: 'Honda', country: 'United States' },
  '1J4': { make: 'Jeep', country: 'United States' },
  '1N4': { make: 'Nissan', country: 'United States' },
  '5YJ': { make: 'Tesla', country: 'United States' },
  '7SA': { make: 'Tesla', country: 'United States' },

  // France
  VF1: { make: 'Renault', country: 'France' },
  VF3: { make: 'Peugeot', country: 'France' },
  VF7: { make: 'Citroën', country: 'France' },

  // Italy
  ZFA: { make: 'Fiat', country: 'Italy' },
  ZAR: { make: 'Alfa Romeo', country: 'Italy' },
  ZFF: { make: 'Ferrari', country: 'Italy' },

  // Sweden
  YV1: { make: 'Volvo', country: 'Sweden' },
  YS3: { make: 'Saab', country: 'Sweden' },

  // India
  MA3: { make: 'Suzuki (Maruti)', country: 'India' },
  MAL: { make: 'Hyundai', country: 'India' },
  MAT: { make: 'Tata', country: 'India' },
};

/**
 * Cleans a candidate string and standardizes it to VIN format
 */
export function sanitizeVin(raw: string): string {
  if (!raw) return '';
  return raw
    .toUpperCase()
    .replace(/[\s\-_.:]/g, '')
    .trim();
}

/**
 * Validates whether a candidate string is a plausible 17-character VIN
 */
export function isValidVinFormat(vin: string): boolean {
  if (!vin || vin.length !== 17) return false;
  // VINs never contain letters I, O, or Q (to prevent confusion with 1 and 0)
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(vin);
}

/**
 * Calculates and verifies the ISO 3779 checksum (check digit at index 8)
 */
export function verifyVinChecksum(vin: string): boolean {
  if (!isValidVinFormat(vin)) return false;

  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const char = vin[i];
    const val = TRANSLITERATION_MAP[char];
    if (val === undefined) return false;
    sum += val * POSITION_WEIGHTS[i];
  }

  const remainder = sum % 11;
  const expectedCheckDigit = remainder === 10 ? 'X' : remainder.toString();
  return vin[8] === expectedCheckDigit;
}

/**
 * Local fast ISO decoder for VIN
 */
export function decodeVinLocally(vin: string): VehicleSpecs {
  const clean = sanitizeVin(vin);
  const isValid = isValidVinFormat(clean);
  const isValidChecksum = isValid ? verifyVinChecksum(clean) : false;

  const wmi = clean.substring(0, 3);
  const yearCode = clean.length >= 10 ? clean[9] : '';
  const year = YEAR_CODES[yearCode] || undefined;

  let make: string | undefined;
  let plantCountry: string | undefined;

  // Exact WMI match
  if (WMI_MAP[wmi]) {
    make = WMI_MAP[wmi].make;
    plantCountry = WMI_MAP[wmi].country;
  } else {
    // Determine region from first character
    const c1 = clean[0];
    if (c1 === 'A' || c1 === 'B' || c1 === 'C') {
      plantCountry = c1 === 'A' ? 'South Africa / Africa' : 'Africa';
    } else if (c1 >= '1' && c1 <= '5') {
      plantCountry = 'North America';
    } else if (c1 === 'J') {
      plantCountry = 'Japan';
    } else if (c1 === 'K') {
      plantCountry = 'South Korea';
    } else if (c1 === 'L') {
      plantCountry = 'China';
    } else if (c1 === 'M') {
      plantCountry = 'India';
    } else if (c1 === 'S') {
      plantCountry = 'United Kingdom';
    } else if (c1 === 'W') {
      plantCountry = 'Germany';
    } else if (c1 === 'V') {
      plantCountry = 'France / Spain';
    } else if (c1 === 'Z') {
      plantCountry = 'Italy';
    }
  }

  return {
    vin: clean,
    isValidChecksum,
    make,
    year,
    plantCountry,
    source: 'iso_decoder',
  };
}

/**
 * Extracts potential 17-character VIN candidates from noisy OCR text.
 * Also handles common OCR mistakes (e.g., lowercase, spaces, confusing O/0 or I/1).
 */
export function extractVinCandidatesFromText(text: string): string[] {
  if (!text) return [];

  const candidates: string[] = [];

  // Match sequences of alphanumeric characters of length ~17
  const cleanedText = text.toUpperCase();

  // Pattern 1: Exact 17-character VIN pattern without I, O, Q
  const exactRegex = /\b[A-HJ-NPR-Z0-9]{17}\b/g;
  let match;
  while ((match = exactRegex.exec(cleanedText)) !== null) {
    if (!candidates.includes(match[0])) {
      candidates.push(match[0]);
    }
  }

  // Pattern 2: Barcode format or continuous text where OCR might have substituted O with 0 or I with 1
  const fuzzyRegex = /\b[A-Z0-9]{17}\b/g;
  while ((match = fuzzyRegex.exec(cleanedText)) !== null) {
    const sanitized = match[0]
      .replace(/I/g, '1')
      .replace(/O/g, '0')
      .replace(/Q/g, '0');
    if (isValidVinFormat(sanitized) && !candidates.includes(sanitized)) {
      candidates.push(sanitized);
    }
  }

  // Pattern 3: Look for VIN labeled lines (e.g., "VIN: 1HGCR2F83HA000000" or "CHASSIS NO: ...")
  const labeledRegex = /(?:VIN|CHASSIS|CHASSIS\s*NO|VIN\/CHASSIS)\s*[:.\s-]*([A-Z0-9\s-]{17,22})/i;
  const labeledMatch = cleanedText.match(labeledRegex);
  if (labeledMatch && labeledMatch[1]) {
    const sanitized = sanitizeVin(labeledMatch[1]).substring(0, 17);
    if (isValidVinFormat(sanitized) && !candidates.includes(sanitized)) {
      candidates.push(sanitized);
    }
  }

  return candidates;
}

/**
 * Cleans and formats a vehicle registration / license plate number
 */
export function sanitizeRegNumber(raw: string): string {
  if (!raw) return '';
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts possible South African and international vehicle registration plate numbers from OCR text
 */
export function extractRegNumberFromText(text: string): string | null {
  if (!text) return null;
  const upper = text.toUpperCase();

  // Pattern 1: Explicitly labeled Reg / Licence number (e.g. from MVLX disc: "LICENCE NUMBER / REG NO: CA 123-456")
  const labeled = /(?:LICENCE\s*(?:NO|NUMBER)|REG\s*(?:NO|NUMBER)|REGISTRATION|PLATE)\s*[:.\s-]*([A-Z0-9\s-]{4,12})/i;
  const matchLabeled = upper.match(labeled);
  if (matchLabeled && matchLabeled[1]) {
    const cleaned = sanitizeRegNumber(matchLabeled[1]);
    if (cleaned.length >= 4 && cleaned.length <= 12) {
      return cleaned;
    }
  }

  // Pattern 2: South African province standard formats:
  // e.g. CA 123-456, CY 123456, ND 123-456, GP plates like BB 12 CC GP, etc.
  const saPlates = [
    /\b([A-Z]{2}\s*\d{2,3}[-\s]*\d{2,3})\b/, // Western Cape / KZN e.g. CA 123-456, ND 123-456
    /\b([A-Z]{2}\s*\d{2}\s*[A-Z]{2}\s*GP)\b/, // Gauteng format: AA 11 BB GP
    /\b(\d{3}[-\s]*\d{3}\s*[A-Z]{1,2})\b/, // Other provincial formats
    /\b([A-Z]{1,3}\s*\d{3,6})\b/, // General plate e.g. WP 123456
  ];

  for (const regex of saPlates) {
    const plateMatch = upper.match(regex);
    if (plateMatch && plateMatch[1]) {
      return sanitizeRegNumber(plateMatch[1]);
    }
  }

  return null;
}

/**
 * Generates a clean text summary of vehicle details for sharing, copying or printing
 */
export function formatVehicleSummary(specs: VehicleSpecs): string {
  const parts: string[] = [
    '=== VEHICLE REPORT ===',
    `Make: ${specs.make || 'Not specified'}`,
    `Model: ${specs.model || 'Not specified'}`,
    `Year: ${specs.year || 'Not specified'}`,
  ];

  if (specs.regNumber) {
    parts.push(`Registration No: ${specs.regNumber}`);
  }

  parts.push(`VIN: ${specs.vin}`);

  if (specs.engineNumber) {
    parts.push(`Engine Number: ${specs.engineNumber}`);
  }
  if (specs.bodyClass || specs.vehicleType) {
    parts.push(`Body / Type: ${specs.bodyClass || specs.vehicleType}`);
  }
  if (specs.displacementL || specs.fuelType) {
    parts.push(`Engine / Fuel: ${specs.displacementL || ''} ${specs.fuelType || ''}`.trim());
  }
  if (specs.plantCountry) {
    parts.push(`Origin / Plant: ${specs.plantCountry}`);
  }
  if (specs.color) {
    parts.push(`Color: ${specs.color}`);
  }
  if (specs.registerNumber) {
    parts.push(`Register No: ${specs.registerNumber}`);
  }
  if (specs.expiryDate) {
    parts.push(`Disc Expiry: ${specs.expiryDate}`);
  }

  return parts.join('\n');
}
