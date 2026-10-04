/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import {
  X,
  Check,
  Clipboard,
  ShieldCheck,
  Disc,
  QrCode,
  Tag,
  Hash,
  Sparkles,
} from 'lucide-react';
import { LicenseDiscData } from '../types';
import { parseLicenseDiscPayload, SAMPLE_LICENSE_DISCS } from '../utils/discParser';
import { sanitizeVin, isValidVinFormat } from '../utils/vinDecoder';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitDisc: (disc: LicenseDiscData) => void;
}

export const ManualEntryModal: React.FC<ManualEntryModalProps> = ({
  isOpen,
  onClose,
  onSubmitDisc,
}) => {
  const [activeTab, setActiveTab] = useState<'fields' | 'barcode'>('fields');
  const [rawBarcodeText, setRawBarcodeText] = useState('');

  // Individual fields
  const [licenceNumber, setLicenceNumber] = useState('');
  const [vin, setVin] = useState('');
  const [make, setMake] = useState('');
  const [seriesName, setSeriesName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [colour, setColour] = useState('WHITE');
  const [engineNumber, setEngineNumber] = useState('');
  const [vehicleRegisterNumber, setVehicleRegisterNumber] = useState('');
  const [controlNumber, setControlNumber] = useState('');

  const [errorText, setErrorText] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle parsing pasted raw barcode payload
  const handleParseRawBarcode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawBarcodeText.trim()) {
      setErrorText('Please enter or paste a barcode payload string');
      return;
    }
    try {
      const parsed = parseLicenseDiscPayload(rawBarcodeText.trim(), 'MANUAL_BARCODE');
      onSubmitDisc(parsed);
      onClose();
    } catch {
      setErrorText('Failed to parse barcode payload. Please verify the format.');
    }
  };

  // Handle form submission of fields
  const handleSubmitFields = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanVin = sanitizeVin(vin);
    if (!cleanVin || cleanVin.length < 5) {
      setErrorText('Please enter a valid VIN (17 characters recommended)');
      return;
    }

    const syntheticRaw = `%MVL%${licenceNumber || 'UNREGISTERED'}%${vehicleRegisterNumber || '980000000000'}%${controlNumber || 'A00000000'}%${cleanVin}%${engineNumber || ''}%${make || 'VEHICLE'}%${seriesName || 'STANDARD'}%${colour || 'WHITE'}%${expiryDate || '2026-12-31'}%LIGHT MOTOR VEHICLE%`;
    const parsed = parseLicenseDiscPayload(syntheticRaw, 'MANUAL_INPUT');

    onSubmitDisc(parsed);
    onClose();
  };

  // Paste raw barcode from clipboard
  const handlePasteBarcode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRawBarcodeText(text);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="modal-sheet w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-5 sm:p-6 text-slate-100 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* HEADER */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Disc className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Manual License Disc Entry</h3>
            <p className="text-xs text-slate-400">
              Paste a barcode string or fill in printed disc details
            </p>
          </div>
        </div>

        {/* TABS */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl mb-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('fields')}
            className={`py-2 rounded-lg transition ${
              activeTab === 'fields'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Form Fields
          </button>
          <button
            onClick={() => setActiveTab('barcode')}
            className={`py-2 rounded-lg transition ${
              activeTab === 'barcode'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Paste Raw %MVL% / QR Code
          </button>
        </div>

        {errorText && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
            {errorText}
          </div>
        )}

        {/* TAB 1: FORM FIELDS */}
        {activeTab === 'fields' && (
          <form onSubmit={handleSubmitFields} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Licence Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CA 123-456"
                  value={licenceNumber}
                  onChange={(e) => setLicenceNumber(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-mono tracking-wider text-white uppercase focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  17-Char VIN *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AAVZZZ6RZHY..."
                  maxLength={17}
                  value={vin}
                  onChange={(e) => setVin(e.target.value.toUpperCase().replace(/[\s-]/g, ''))}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-mono tracking-wider text-white uppercase focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Vehicle Make *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TOYOTA"
                  value={make}
                  onChange={(e) => setMake(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Model / Series *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HILUX 2.8 GD-6"
                  value={seriesName}
                  onChange={(e) => setSeriesName(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Expiry Date (YYYY-MM-DD)
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Colour
                </label>
                <input
                  type="text"
                  placeholder="e.g. WHITE"
                  value={colour}
                  onChange={(e) => setColour(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Engine Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1GD-FTV892019"
                  value={engineNumber}
                  onChange={(e) => setEngineNumber(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Control / Disc No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. A84920194"
                  value={controlNumber}
                  onChange={(e) => setControlNumber(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Generate & View License Disc</span>
            </button>
          </form>
        )}

        {/* TAB 2: RAW BARCODE PAYLOAD */}
        {activeTab === 'barcode' && (
          <form onSubmit={handleParseRawBarcode} className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                Raw Barcode Payload (%MVL% or JSON)
              </label>
              <button
                type="button"
                onClick={handlePasteBarcode}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Paste</span>
              </button>
            </div>

            <textarea
              rows={4}
              value={rawBarcodeText}
              onChange={(e) => setRawBarcodeText(e.target.value)}
              placeholder="%MVLX%ND 682-419%980145293810%A84920194%AFAZZZ4RZHY812345%TOYOTA%HILUX%WHITE%2026-11-30%..."
              className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl p-3 font-mono text-xs text-emerald-300 focus:outline-none leading-relaxed"
            />

            <p className="text-[11px] text-slate-400">
              South African licence discs use PDF417 barcodes starting with <code>%MVL%</code> or <code>%MVLX%</code>, separating values by <code>%</code> symbols.
            </p>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Parse & Display Disc Results</span>
            </button>
          </form>
        )}

        {/* QUICK PRESET SAMPLES */}
        <div className="mt-5 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              Quick Test Discs
            </span>
            <span className="text-[10px] text-slate-500">1-Click</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SAMPLE_LICENSE_DISCS.slice(0, 4).map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => {
                  onSubmitDisc(sample);
                  onClose();
                }}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition group flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-mono font-bold text-white group-hover:text-emerald-300">
                    {sample.licenceNumber}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {sample.make} {sample.seriesName}
                  </div>
                </div>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    sample.expiryStatus === 'valid'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : sample.expiryStatus === 'expiring_soon'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {sample.expiryStatus.replace('_', ' ')}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
