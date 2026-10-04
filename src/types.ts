/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DiscExpiryStatus = 'valid' | 'expiring_soon' | 'expired';

export interface LicenseDiscData {
  id: string;
  licenceNumber: string; // Registration number e.g. "CA 123-456"
  vehicleRegisterNumber?: string; // NaTIS register number e.g. "980123456789"
  controlNumber?: string; // Disc control number e.g. "A12345678"
  vin: string; // 17-char VIN
  engineNumber?: string; // Engine number e.g. "CWV123456"
  make: string; // Make e.g. "VOLKSWAGEN"
  seriesName: string; // Model / Series e.g. "POLO VIVO 1.4"
  colour?: string; // Colour e.g. "WHITE"
  vehicleCategory?: string; // e.g. "LIGHT MOTOR VEHICLE"
  tare?: number | string; // Tare weight in kg e.g. 1060
  gvm?: number | string; // Gross vehicle mass in kg e.g. 1530
  expiryDate?: string; // ISO date "YYYY-MM-DD"
  expiryStatus: DiscExpiryStatus;
  daysRemaining?: number;
  rawBarcode?: string; // Raw decoded payload
  barcodeFormat?: string; // 'QR_CODE' | 'PDF_417' | 'DATA_MATRIX' | 'AI_VISION' | 'MANUAL'
  scanTimestamp: number;
  isSouthAfricanMvl: boolean;
  confidence?: number;
  // Extra decoded specs from VIN / automotive database
  year?: string | number;
  fuelType?: string;
  displacementL?: string;
  driveType?: string;
  plantCountry?: string;
  isValidChecksum?: boolean;
}

export type VisitorStatus = 'ON_SITE' | 'CHECKED_OUT' | 'FLAGGED';

export type VisitPurpose =
  | 'RESIDENT_VISIT'
  | 'DELIVERY'
  | 'CONTRACTOR'
  | 'TAXI_RIDESHARE'
  | 'ESTATE_SERVICES'
  | 'OTHER';

export interface DriverLicenseData {
  fullName: string;
  initials?: string;
  surname?: string;
  idNumber: string; // RSA ID or Passport
  licenseNumber: string;
  licenseCodes?: string; // e.g. "EB", "B", "C1" or "ID Document"
  licenseExpiryDate?: string;
  firstIssueDate?: string;
  gender?: 'M' | 'F' | 'OTHER' | string;
  dateOfBirth?: string;
  countryOfIssue?: string;
  rawPayload?: string;
  format?: 'BARCODE_PDF417' | 'OCR_VISION' | 'MANUAL';
  confidence?: number;
  documentType?: 'drivers_license' | 'id_card';
  idCardNumber?: string;
  citizenship?: string;
}

export interface VehicleEntryData {
  licenceNumber: string; // Registration number e.g. "CA 492-311"
  make: string; // e.g. "TOYOTA"
  seriesName: string; // Model e.g. "HILUX 2.8 GD-6"
  colour?: string; // e.g. "WHITE"
  vin?: string; // 17-char VIN
  engineNumber?: string;
  vehicleCategory?: string;
  vehicleRegisterNumber?: string;
  controlNumber?: string;
  tare?: number | string;
  gvm?: number | string;
  expiryDate?: string;
  expiryStatus?: DiscExpiryStatus;
  rawBarcode?: string;
  barcodeFormat?: string;
  confidence?: number;
}

export interface VisitDestinationData {
  complexName: string;
  unitVisited: string; // e.g. "Unit 42", "Block B - 204"
  residentName: string;
  residentPhone?: string;
  purpose: VisitPurpose;
  passengersCount: number;
  gateLane: string;
  securityOfficer: string;
  notes?: string;
}

export interface VisitorEntry {
  id: string;
  passNumber: string; // e.g. "VIS-2609-082"
  entryTime: number; // epoch ms
  entryTimeFormatted: string; // ISO or human string
  exitTime?: number | null; // epoch ms when checked out
  exitTimeFormatted?: string | null;
  status: VisitorStatus;
  durationMinutes?: number;
  vehicle: VehicleEntryData;
  driver: DriverLicenseData;
  destination: VisitDestinationData;
  isFlagged?: boolean;
  flagReason?: string;
  qrPassCode?: string; // Pass payload for quick gate checkout scan
}

export interface ComplexStats {
  totalToday: number;
  currentlyOnSite: number;
  checkedOutToday: number;
  averageDurationMinutes: number;
  deliveriesToday: number;
  contractorsToday: number;
}

export interface ComplexUnit {
  unitNumber: string;
  residentName: string;
  residentPhone: string;
  intercomCode?: string;
  block?: string;
}

/** Admin-editable site configuration (served publicly, without the admin password hash). */
export interface SiteSettings {
  siteName: string;
  tagline: string;
  complexName: string;
  complexShortName: string;
  /** Logo image as a data URL, or null to use the default shield icon. */
  logoDataUrl: string | null;
  gateLanes: string[];
  securityOfficers: string[];
  units: ComplexUnit[];
}

export interface ScanHistoryItem {
  id: string;
  disc: LicenseDiscData;
  timestamp: number;
}

// Backward compatibility interfaces for any legacy references
export interface VehicleSpecs extends Partial<LicenseDiscData> {
  model?: string;
  regNumber?: string;
  color?: string;
  registerNumber?: string;
  bodyClass?: string;
  engineCylinders?: string | number;
  vehicleType?: string;
  manufacturer?: string;
  series?: string;
  isValidChecksum: boolean;
  source?: 'nhtsa' | 'iso_decoder' | 'gemini_ai' | 'disc_scan';
}

export interface VehicleScanDetection {
  vin: string;
  regNumber?: string;
  make?: string;
  model?: string;
  year?: string | number;
  engineNumber?: string;
  bodyClass?: string;
  color?: string;
  confidence: number;
  method: 'barcode_native' | 'ocr_native' | 'ocr_tesseract' | 'gemini_ai' | 'manual';
  timestamp: number;
  notes?: string;
  detectedType?: 'license_disc' | 'license_plate' | 'vin_barcode' | 'vin_stamped' | 'manual';
}

export type VinScanDetection = VehicleScanDetection;
