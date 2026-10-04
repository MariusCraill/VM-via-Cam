import React, { useEffect, useState } from 'react';
import {
  Car,
  UserCheck,
  Home,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Phone,
  ArrowRight,
  Plus,
  Minus,
  Save,
  Check,
  FileCheck,
  ChevronDown,
  CreditCard,
} from 'lucide-react';
import { VehicleEntryData, DriverLicenseData, VisitPurpose, ComplexUnit, VisitorEntry, SiteSettings } from '../types';
import { VehicleScannerModal } from './VehicleScannerModal';
import { DriverLicenseScannerModal } from './DriverLicenseScannerModal';
import { parseSouthAfricanIdNumber } from '../utils/driversLicenseParser';

interface VisitorEntryFlowProps {
  units: ComplexUnit[];
  settings: Pick<SiteSettings, 'complexName' | 'gateLanes' | 'securityOfficers'>;
  onVisitorSaved: (visitor: VisitorEntry) => void;
}

const LANE_KEY = 'gatepass_gate_lane';
const OFFICER_KEY = 'gatepass_security_officer';

function readPref(key: string): string {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

function writePref(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable
  }
}

export const VisitorEntryFlow: React.FC<VisitorEntryFlowProps> = ({ units, settings, onVisitorSaved }) => {
  // Scanned / entered vehicle data
  const [vehicle, setVehicle] = useState<VehicleEntryData | null>(null);
  // Scanned / entered driver data
  const [driver, setDriver] = useState<DriverLicenseData | null>(null);
  // Selected driver document scanning mode (Driver's License vs ID Card)
  const [driverScanMode, setDriverScanMode] = useState<'drivers_license' | 'id_card'>('drivers_license');

  // Visit destination form state
  const complexName = settings.complexName;
  const [unitVisited, setUnitVisited] = useState('');
  const [residentName, setResidentName] = useState('');
  const [residentPhone, setResidentPhone] = useState('');
  const [purpose, setPurpose] = useState<VisitPurpose>('RESIDENT_VISIT');
  const [passengersCount, setPassengersCount] = useState(1);
  // Gate lane & officer: chosen per device, remembered between sessions
  const [gateLane, setGateLane] = useState(() => readPref(LANE_KEY));
  const [securityOfficer, setSecurityOfficer] = useState(() => readPref(OFFICER_KEY));

  // Fall back to the first configured option if the saved one was removed by an admin
  useEffect(() => {
    if (settings.gateLanes.length && !settings.gateLanes.includes(gateLane)) setGateLane(settings.gateLanes[0]);
  }, [settings.gateLanes, gateLane]);
  useEffect(() => {
    if (settings.securityOfficers.length && !settings.securityOfficers.includes(securityOfficer)) {
      setSecurityOfficer(settings.securityOfficers[0]);
    }
  }, [settings.securityOfficers, securityOfficer]);
  const [notes, setNotes] = useState('');

  // Modals state
  const [isVehicleScannerOpen, setIsVehicleScannerOpen] = useState(false);
  const [isDriverScannerOpen, setIsDriverScannerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Handle unit selection with resident auto-fill
  const handleUnitSelect = (selectedUnit: string) => {
    setUnitVisited(selectedUnit);
    const match = units.find((u) => u.unitNumber.toLowerCase() === selectedUnit.toLowerCase());
    if (match) {
      setResidentName(match.residentName);
      setResidentPhone(match.residentPhone);
    }
  };

  // Reset check-in form
  const handleReset = () => {
    setVehicle(null);
    setDriver(null);
    setNotes('');
    setPassengersCount(1);
    setUnitVisited('');
    setResidentName('');
    setResidentPhone('');
    setSaveError(null);
    setSaveSuccess(null);
  };

  // Record Entry & Save to Database
  const handleRecordEntry = async () => {
    if (!vehicle?.licenceNumber) {
      setSaveError('Please scan or enter the vehicle registration before saving.');
      return;
    }
    if (!driver?.fullName && !driver?.idNumber && !driver?.licenseNumber) {
      setSaveError("Please scan or enter the driver's license before saving.");
      return;
    }
    if (!unitVisited) {
      setSaveError('Please select or specify the unit visited.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const payload = {
        vehicle: {
          licenceNumber: vehicle.licenceNumber,
          make: vehicle.make || 'GENERIC',
          seriesName: vehicle.seriesName || 'VEHICLE',
          colour: vehicle.colour || 'WHITE',
          vin: vehicle.vin,
          engineNumber: vehicle.engineNumber,
          vehicleCategory: vehicle.vehicleCategory,
          expiryDate: vehicle.expiryDate,
          expiryStatus: vehicle.expiryStatus || 'valid',
          confidence: vehicle.confidence || 0.95,
        },
        driver: {
          fullName: driver.fullName || 'Visitor Driver',
          initials: driver.initials,
          surname: driver.surname,
          idNumber: driver.idNumber,
          licenseNumber: driver.licenseNumber || 'DL-PENDING',
          licenseCodes: driver.licenseCodes || 'Code B',
          licenseExpiryDate: driver.licenseExpiryDate,
          gender: driver.gender || 'M',
          dateOfBirth: driver.dateOfBirth,
          countryOfIssue: driver.countryOfIssue || 'South Africa',
          format: driver.format || 'OCR_VISION',
          confidence: driver.confidence || 0.95,
        },
        destination: {
          complexName,
          unitVisited,
          residentName: residentName || 'Resident',
          residentPhone,
          purpose,
          passengersCount,
          gateLane,
          securityOfficer,
          notes,
        },
      };

      const res = await fetch('/api/visitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to record visitor entry into database');
      }

      const json = await res.json();
      if (json.success && json.visitor) {
        // Clear vehicle and driver for next visitor
        const savedLicence = json.visitor.vehicle?.licenceNumber || vehicle.licenceNumber;
        const savedDriver = json.visitor.driver?.fullName || driver.fullName;
        setVehicle(null);
        setDriver(null);
        setNotes('');
        setPassengersCount(1);
        setUnitVisited('');
        setResidentName('');
        setResidentPhone('');
        setSaveSuccess(`Entry recorded successfully for ${savedDriver} · Vehicle: ${savedLicence}`);
        // Trigger parent callback (returns to main screen, updates DB records)
        onVisitorSaved(json.visitor);
      }
    } catch (err: any) {
      setSaveError(err.message || 'Error recording visitor entry');
    } finally {
      setIsSaving(false);
    }
  };

  const idValidation = driver?.idNumber ? parseSouthAfricanIdNumber(driver.idNumber) : null;

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 flex flex-wrap items-center justify-between gap-3 sm:gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="hidden sm:block p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">Complex Gate Check-In</h2>
              <span className="hidden sm:inline px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ACTIVE GATE
              </span>
            </div>
            <p className="hidden sm:block text-xs text-slate-400">
              Scan vehicle QR code & driver's license to log authorized entry into database
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs min-w-0 max-w-full">
          <label className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-700 text-slate-300 flex items-center gap-1 min-w-0 max-w-full">
            <span className="text-slate-400">Lane:</span>
            <select
              value={gateLane}
              onChange={(e) => {
                setGateLane(e.target.value);
                writePref(LANE_KEY, e.target.value);
              }}
              className="bg-transparent font-semibold text-white focus:outline-none min-w-0 max-w-[12rem] truncate"
            >
              {settings.gateLanes.map((l) => (
                <option key={l} value={l} className="bg-slate-900">
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-700 text-slate-300 flex items-center gap-1 min-w-0 max-w-full">
            <span className="text-slate-400">Officer:</span>
            <select
              value={securityOfficer}
              onChange={(e) => {
                setSecurityOfficer(e.target.value);
                writePref(OFFICER_KEY, e.target.value);
              }}
              className="bg-transparent font-semibold text-white focus:outline-none min-w-0 max-w-[10rem] truncate"
            >
              {settings.securityOfficers.map((o) => (
                <option key={o} value={o} className="bg-slate-900">
                  {o}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Success Notification */}
      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-600/70 text-emerald-100 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Gate Check-In Completed</div>
              <div className="text-sm font-semibold text-white">{saveSuccess}</div>
            </div>
          </div>
          <button
            onClick={() => setSaveSuccess(null)}
            className="px-3 py-1.5 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-xs text-emerald-200 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Two Scanning Panels (Vehicle QR & Driver License) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* PANEL 1: Vehicle QR / Disc Scan */}
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${vehicle ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'}`}>
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">1. Vehicle Registration</h3>
                  <p className="text-[11px] text-slate-400">Scan MVLX license disc QR or barcode</p>
                </div>
              </div>

              {vehicle ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Captured
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Awaiting Scan
                </span>
              )}
            </div>

            {/* Scanned Vehicle Content (only shown after scan) */}
            {vehicle && (
              <div className="mt-4 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3.5">
                {/* Car & Make / Color */}
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <Car className="w-7 h-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Vehicle Make &amp; Model
                    </div>
                    <div className="text-base font-bold text-white truncate">
                      {vehicle.make} {vehicle.seriesName}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Colour: <span className="text-slate-200 font-bold uppercase">{vehicle.colour || 'White'}</span>
                    </div>
                  </div>
                </div>

                {/* Licence Plate Registration Number */}
                <div className="pt-3 border-t border-slate-800/80">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Registration / Licence Plate Number
                  </div>
                  <div className="w-full py-3 px-4 rounded-xl bg-amber-400 border border-amber-300 text-slate-950 font-mono text-2xl font-black tracking-widest text-center shadow-md">
                    {vehicle.licenceNumber}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Trigger for Vehicle Scan */}
          <div className={`${vehicle ? 'mt-5 pt-3 border-t border-slate-800/80' : 'mt-4'} flex items-center gap-2`}>
            <button
              onClick={() => setIsVehicleScannerOpen(true)}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950"
            >
              <QrCode className="w-4 h-4" />
              <span>{vehicle ? 'Re-scan Vehicle' : 'Scan Vehicle QR / Disc'}</span>
            </button>

            {vehicle && (
              <button
                onClick={() => setVehicle(null)}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Clear vehicle"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* PANEL 2: Driver / Identity Scan (Optional: Driver's License or ID Card) */}
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl ${
                    driver
                      ? driver.documentType === 'id_card'
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                      : 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                  }`}
                >
                  {driver?.documentType === 'id_card' ? (
                    <CreditCard className="w-5 h-5" />
                  ) : (
                    <UserCheck className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">2. Driver / Identity Verification</h3>
                  <p className="text-[11px] text-slate-400">
                    Scan Driver's License or ID Card (optional)
                  </p>
                </div>
              </div>

              {driver ? (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    driver.documentType === 'id_card'
                      ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                      : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {driver.documentType === 'id_card' ? 'ID Verified' : 'License Verified'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  Awaiting Scan
                </span>
              )}
            </div>

            {/* Document Selection Tabs (when awaiting scan) */}
            {!driver && (
              <div className="mt-4 p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span>Choose verification method:</span>
                  <span className="text-[10px] text-indigo-400 font-semibold">Driver's License or ID Card</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDriverScanMode('drivers_license');
                      setIsDriverScannerOpen(true);
                    }}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      driverScanMode === 'drivers_license'
                        ? 'bg-blue-600/15 border-blue-500/40 text-blue-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Car className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-bold text-white">Driver's License</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Driving licence card / codes
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDriverScanMode('id_card');
                      setIsDriverScannerOpen(true);
                    }}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      driverScanMode === 'id_card'
                        ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-bold text-white">ID Card Scan</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Smart ID / Green Book
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Scanned Driver Content (only shown after scan) */}
            {driver && (
              <div className="mt-4 space-y-3">
                {/* Driver Name & Badge */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {driver.documentType === 'id_card' ? 'ID Holder Full Name' : 'Driver Full Name'}
                      </div>
                      <div className="text-base font-bold text-white mt-0.5">
                        {driver.fullName}
                      </div>
                    </div>
                    {driver.documentType === 'id_card' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                        <CreditCard className="w-3 h-3" />
                        Smart ID Card
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                        <Car className="w-3 h-3" />
                        {driver.licenseCodes || 'Code B'}
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">13-Digit RSA ID:</div>
                      <div className="font-mono text-slate-200 font-semibold mt-0.5">
                        {driver.idNumber || 'Recorded'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">
                        {driver.documentType === 'id_card' ? 'Card / Doc Number:' : 'License Number:'}
                      </div>
                      <div className="font-mono text-slate-200 font-semibold mt-0.5">
                        {driver.documentType === 'id_card'
                          ? driver.idCardNumber || driver.licenseNumber || 'ID-CARD'
                          : driver.licenseNumber}
                      </div>
                    </div>
                  </div>

                  {idValidation?.isValid && (
                    <div className="mt-1 p-2 rounded-xl bg-emerald-950/40 border border-emerald-800/50 flex items-center gap-2 text-[11px] text-emerald-300">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>
                        Valid RSA ID: Born {idValidation.dateOfBirth} · Gender:{' '}
                        {idValidation.gender === 'M' ? 'Male' : 'Female'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      {driver.documentType === 'id_card' ? 'Status / Citizenship:' : 'License Expiry:'}
                    </span>
                    <div className="font-semibold text-slate-200 text-[11px] mt-0.5 truncate">
                      {driver.documentType === 'id_card'
                        ? driver.citizenship || 'South African Citizen (RSA)'
                        : driver.licenseExpiryDate || 'Active'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Country of Issue:</span>
                    <div className="font-semibold text-slate-200 text-[11px] mt-0.5">
                      {driver.countryOfIssue || 'South Africa'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Trigger for Driver / ID Scan */}
          <div className={`${driver ? 'mt-5 pt-3 border-t border-slate-800/80' : 'mt-4'} flex flex-wrap items-center gap-2`}>
            {!driver ? (
              <div className="w-full grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDriverScanMode('drivers_license');
                    setIsDriverScannerOpen(true);
                  }}
                  className="py-3 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-950"
                >
                  <Car className="w-4 h-4" />
                  <span>Scan Driver's License</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDriverScanMode('id_card');
                    setIsDriverScannerOpen(true);
                  }}
                  className="py-3 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-950"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Scan ID Card</span>
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setDriverScanMode(driver.documentType || 'drivers_license');
                    setIsDriverScannerOpen(true);
                  }}
                  className={`flex-1 py-3 px-4 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg ${
                    driver.documentType === 'id_card'
                      ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-950'
                      : 'bg-blue-600 hover:bg-blue-500 shadow-blue-950'
                  }`}
                >
                  {driver.documentType === 'id_card' ? (
                    <CreditCard className="w-4 h-4" />
                  ) : (
                    <Car className="w-4 h-4" />
                  )}
                  <span>
                    {driver.documentType === 'id_card' ? 'Re-scan ID Card' : "Re-scan Driver's License"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const altMode = driver.documentType === 'id_card' ? 'drivers_license' : 'id_card';
                    setDriverScanMode(altMode);
                    setIsDriverScannerOpen(true);
                  }}
                  className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
                  title="Switch scan method"
                >
                  {driver.documentType === 'id_card' ? <Car className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}
                  <span>{driver.documentType === 'id_card' ? "Scan License" : 'Scan ID Card'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDriver(null)}
                  className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Clear identity data"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Destination & Visit Details */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">3. Complex Visit Destination</h3>
            <p className="text-[11px] text-slate-400">Select residential unit, resident & visit purpose</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Unit Visited */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Unit Number Visited <span className="text-emerald-400">*</span>
            </label>
            <div className="relative">
              <select
                value={unitVisited}
                onChange={(e) => handleUnitSelect(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 appearance-none font-medium"
              >
                <option value="" disabled>
                  Select unit…
                </option>
                {units.map((u) => (
                  <option key={u.unitNumber} value={u.unitNumber}>
                    {u.unitNumber}
                    {u.residentName || u.block
                      ? ` (${[u.residentName, u.block].filter(Boolean).join(' - ')})`
                      : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Resident Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Resident Contact Person <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              value={residentName}
              onChange={(e) => setResidentName(e.target.value)}
              placeholder="Resident name"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          {/* Resident Phone */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Resident Phone Number
            </label>
            <div className="relative">
              <input
                type="tel"
                inputMode="tel"
                value={residentPhone}
                onChange={(e) => setResidentPhone(e.target.value)}
                placeholder="+27 82 555 3821"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-medium"
              />
              <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>
        </div>

        {/* Visit Purpose selector pills */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Visit Purpose
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'RESIDENT_VISIT', label: 'Resident Guest' },
              { id: 'DELIVERY', label: 'Delivery / Courier' },
              { id: 'CONTRACTOR', label: 'Contractor / Trades' },
              { id: 'TAXI_RIDESHARE', label: 'Uber / Bolt / Taxi' },
              { id: 'ESTATE_SERVICES', label: 'Estate Services' },
              { id: 'OTHER', label: 'Other' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPurpose(p.id as VisitPurpose)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition active:scale-95 ${
                  purpose === p.id
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                    : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Passengers & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Passenger count */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Passengers in Vehicle
            </label>
            <div className="flex items-center gap-3 bg-slate-950 border border-slate-700 rounded-xl p-1.5 w-fit">
              <button
                type="button"
                onClick={() => setPassengersCount(Math.max(1, passengersCount - 1))}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-bold text-white text-sm px-2">{passengersCount}</span>
              <button
                type="button"
                onClick={() => setPassengersCount(passengersCount + 1)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Security / Gate Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Authorized by resident via intercom, delivering groceries..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-normal"
            />
          </div>
        </div>
      </div>

      {/* Error display */}
      {saveError && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <div className="font-semibold">{saveError}</div>
        </div>
      )}

      {/* Bottom Master Save Button (sticks above the bottom nav on phones) */}
      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] sm:static z-30 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 p-3 sm:p-4 rounded-3xl bg-slate-900/95 backdrop-blur-md border border-slate-700 sm:border-slate-800 shadow-2xl">
        <div className="text-xs text-slate-400 flex items-center gap-2 min-w-0 max-w-full truncate">
          <div className={`w-2.5 h-2.5 rounded-full ${vehicle && driver ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          <span>
            Ready to log: <strong className="text-white">{vehicle ? vehicle.licenceNumber : 'Vehicle pending'}</strong> + <strong className="text-white">{driver ? driver.fullName : 'Driver pending'}</strong>
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleReset}
            className="h-12 sm:h-auto py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Clear All
          </button>

          <button
            type="button"
            onClick={handleRecordEntry}
            disabled={isSaving}
            className="flex-1 sm:flex-initial h-12 sm:h-auto py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-950 disabled:opacity-50"
          >
            {isSaving ? (
              <span className="inline-flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Saving to Database...
              </span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span className="sm:hidden">RECORD ENTRY</span>
                <span className="hidden sm:inline">RECORD ENTRY & SAVE TO DB</span>
                <ArrowRight className="hidden sm:block w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Scanner Modals */}
      <VehicleScannerModal
        isOpen={isVehicleScannerOpen}
        onClose={() => setIsVehicleScannerOpen(false)}
        onVehicleDetected={(v) => {
          setVehicle(v);
          setSaveError(null);
        }}
      />

      <DriverLicenseScannerModal
        isOpen={isDriverScannerOpen}
        onClose={() => setIsDriverScannerOpen(false)}
        initialMode={driverScanMode}
        onDriverDetected={(d) => {
          setDriver(d);
          setSaveError(null);
        }}
      />
    </div>
  );
};
