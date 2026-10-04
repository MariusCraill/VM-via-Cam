/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import {
  Car,
  Copy,
  Check,
  Share2,
  Download,
  Printer,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  QrCode,
  Tag,
  Hash,
  Scale,
  Calendar,
  Layers,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileText,
  Disc,
} from 'lucide-react';
import { LicenseDiscData } from '../types';
import { LicenseDiscVisual } from './LicenseDiscVisual';
import { isSouthAfricanPlateFormat } from '../utils/discParser';

interface VehicleResultCardProps {
  disc: LicenseDiscData;
  isLoadingSpecs?: boolean;
  onRescan: () => void;
  onOpenGuide?: () => void;
}

export const VehicleResultCard: React.FC<VehicleResultCardProps> = ({
  disc,
  isLoadingSpecs = false,
  onRescan,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'card' | 'disc'>('card');
  const [isRawPayloadOpen, setIsRawPayloadOpen] = useState(false);

  // Copy helper
  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  // Generate full vehicle disc report
  const generateTextReport = () => {
    return `--- VEHICLE LICENCE DISC REPORT ---
Licence / Reg No:   ${disc.licenceNumber}
Make:               ${disc.make}
Series / Model:     ${disc.seriesName}
VIN:                ${disc.vin}
Engine Number:      ${disc.engineNumber || 'N/A'}
Control Number:     ${disc.controlNumber || 'N/A'}
Register Number:    ${disc.vehicleRegisterNumber || 'N/A'}
Colour:             ${disc.colour || 'N/A'}
Vehicle Category:   ${disc.vehicleCategory || 'Light Motor Vehicle'}
Tare Mass:          ${disc.tare ? `${disc.tare} kg` : 'N/A'}
Gross Vehicle Mass: ${disc.gvm ? `${disc.gvm} kg` : 'N/A'}
Expiry Date:        ${disc.expiryDate || 'N/A'}
Expiry Status:      ${disc.expiryStatus.toUpperCase()} (${disc.daysRemaining ? `${disc.daysRemaining} days` : ''})
Barcode Format:     ${disc.barcodeFormat || 'PDF417 / QR'}
Scanned At:         ${new Date(disc.scanTimestamp).toLocaleString()}
-----------------------------------`;
  };

  // Download text file
  const handleDownloadReport = () => {
    const report = generateTextReport();
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `License-Disc-${disc.licenceNumber.replace(/[\s-]/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download JSON
  const handleDownloadJson = () => {
    const jsonStr = JSON.stringify(disc, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `License-Disc-${disc.licenceNumber.replace(/[\s-]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Share report
  const handleShare = async () => {
    const report = generateTextReport();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Vehicle Disc: ${disc.licenceNumber} (${disc.make} ${disc.seriesName})`,
          text: report,
        });
      } catch {
        // Ignore abort
      }
    } else {
      copyToClipboard(report, 'share_all');
    }
  };

  // Print friendly view
  const handlePrint = () => {
    window.print();
  };

  const isExpired = disc.expiryStatus === 'expired';
  const isExpiringSoon = disc.expiryStatus === 'expiring_soon';

  return (
    <div className="w-full flex flex-col gap-5">
      {/* TOP NAVIGATION / RESCAN BAR */}
      <div className="flex items-center justify-between">
        <button
          onClick={onRescan}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-400" />
          <span>Scan Next Disc</span>
        </button>

        {/* View mode toggle: Data Cards vs Visual Disc */}
        <div className="inline-flex p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs">
          <button
            onClick={() => setActiveTab('card')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'card'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Details Cards</span>
          </button>
          <button
            onClick={() => setActiveTab('disc')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'disc'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Disc className="w-3.5 h-3.5" />
            <span>Windscreen Disc</span>
          </button>
        </div>
      </div>

      {/* PROMINENT EXPIRY & VALIDITY BANNER */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          isExpired
            ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
            : isExpiringSoon
            ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
            : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              isExpired
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                : isExpiringSoon
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
            }`}
          >
            {isExpired ? (
              <XCircle className="w-6 h-6" />
            ) : isExpiringSoon ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <ShieldCheck className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider">
                {isExpired
                  ? 'Licence Expired'
                  : isExpiringSoon
                  ? 'Renewal Required Soon'
                  : 'Licence Valid & Active'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900/60 font-mono">
                {disc.barcodeFormat || 'PDF417 / QR'}
              </span>
            </div>
            <p className="text-sm font-bold text-white mt-0.5">
              {disc.expiryDate ? `Expires: ${disc.expiryDate}` : 'Expiry date recorded'}
              {disc.daysRemaining !== undefined && (
                <span className="font-normal text-xs text-slate-300 ml-2">
                  ({disc.daysRemaining < 0
                    ? `${Math.abs(disc.daysRemaining)} days overdue`
                    : `${disc.daysRemaining} days remaining`})
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Quick Share / Export Buttons in Banner */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={() => copyToClipboard(generateTextReport(), 'banner_copy')}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 text-xs flex items-center gap-1.5"
            title="Copy all details"
          >
            {copiedField === 'banner_copy' ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span className="hidden xs:inline">Copy Report</span>
          </button>

          <button
            onClick={handleShare}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 text-xs flex items-center gap-1.5"
            title="Share vehicle disc"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden xs:inline">Share</span>
          </button>
        </div>
      </div>

      {/* TAB VIEW 1: AUTHENTIC VISUAL DISC */}
      {activeTab === 'disc' && (
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col items-center justify-center">
          <div className="text-center mb-4">
            <h3 className="text-sm font-bold text-white">
              Official Windscreen Licence Disc Representation
            </h3>
            <p className="text-xs text-slate-400">
              Matches the standard 85mm circular disc issued by eNaTIS
            </p>
          </div>

          <LicenseDiscVisual disc={disc} />

          <div className="mt-6 flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print Disc Record</span>
            </button>
            <button
              onClick={() => setActiveTab('card')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center gap-2"
            >
              <Layers className="w-4 h-4" />
              <span>View Data Breakdown</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB VIEW 2: STRUCTURED SPECIFICATIONS BREAKDOWN */}
      {activeTab === 'card' && (
        <div className="space-y-4">
          {/* Static Vehicle Display: Car, Make, Color, Registration plate */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Car className="w-7 h-7" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Vehicle Make &amp; Model
                </div>
                <div className="text-lg font-bold text-white">
                  {disc.make} {disc.seriesName}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Colour: <span className="text-slate-200 font-bold uppercase">{disc.colour || 'White'}</span>
                  {disc.year && <span className="text-slate-400 ml-2">· {disc.year}</span>}
                </div>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Registration / Licence Plate Number
              </div>
              <div className="inline-block py-2.5 px-5 rounded-xl bg-amber-400 border border-amber-300 text-slate-950 font-mono text-xl font-black tracking-widest text-center shadow-md">
                {disc.licenceNumber}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CARD 1: PRIMARY VEHICLE IDENTITY */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    Vehicle Identity
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {disc.isSouthAfricanMvl ? 'eNaTIS MVLX' : 'Vehicle QR'}
                  </span>
                </div>

                {/* Make & Series */}
                <div className="space-y-1 mb-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-xs text-slate-400 uppercase font-semibold">Make & Model</div>
                  <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {disc.make} {disc.seriesName}
                  </div>
                  {disc.year && (
                    <div className="text-xs text-emerald-400 font-semibold">
                      Year Model: {disc.year}
                    </div>
                  )}
                </div>

                {/* Registration Number Badge (Authentic Plate Style) - Displayed below Make and Model */}
                <div className="p-3.5 rounded-xl bg-gradient-to-b from-amber-50 to-amber-100 text-slate-950 border-2 border-slate-800 shadow-md flex items-center justify-between mb-3">
                  <div>
                    <div className="text-[9px] uppercase font-bold text-slate-600 tracking-wider">
                      Registration / Licence Plate No.
                    </div>
                    <div className="font-mono text-xl sm:text-2xl font-black tracking-widest text-slate-950">
                      {disc.licenceNumber}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(disc.licenceNumber, 'licence')}
                    className="p-2 rounded-lg bg-slate-900 text-amber-100 hover:bg-slate-800"
                    title="Copy licence plate number"
                  >
                    {copiedField === 'licence' ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Engine Number Badge (Displayed in the EXACT SAME FORMAT as Registration / Licence No) */}
                {disc.engineNumber &&
                  disc.engineNumber !== disc.licenceNumber &&
                  !isSouthAfricanPlateFormat(disc.engineNumber) && (
                  <div className="p-3.5 rounded-xl bg-gradient-to-b from-amber-50 to-amber-100 text-slate-950 border-2 border-slate-800 shadow-md flex items-center justify-between mb-4">
                    <div>
                      <div className="text-[9px] uppercase font-bold text-slate-600 tracking-wider">
                        Engine Number
                      </div>
                      <div className="font-mono text-xl sm:text-2xl font-black tracking-widest text-slate-950 break-all">
                        {disc.engineNumber}
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(disc.engineNumber!, 'engine')}
                      className="p-2 rounded-lg bg-slate-900 text-amber-100 hover:bg-slate-800 shrink-0 ml-2"
                      title="Copy engine number"
                    >
                      {copiedField === 'engine' ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )}

                {/* Category, Colour, Mass Details */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Category</div>
                    <div className="font-semibold text-slate-200 truncate mt-0.5">
                      {disc.vehicleCategory || 'Light Motor Vehicle'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Colour</div>
                    <div className="font-semibold text-slate-200 mt-0.5">
                      {disc.colour || 'WHITE'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Tare Mass</div>
                    <div className="font-mono font-semibold text-slate-200 mt-0.5">
                      {disc.tare ? `${disc.tare} kg` : 'N/A'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">GVM Mass</div>
                    <div className="font-mono font-semibold text-slate-200 mt-0.5">
                      {disc.gvm ? `${disc.gvm} kg` : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: TECHNICAL & OFFICIAL REGISTRATION NUMBERS */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5" />
                    Official Identification Codes
                  </span>
                  <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </span>
                </div>

                {/* 17-CHAR VIN BOX */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Vehicle Identification Number (VIN)
                    </span>
                    <button
                      onClick={() => copyToClipboard(disc.vin, 'vin')}
                      className="text-slate-400 hover:text-white transition"
                      title="Copy VIN"
                    >
                      {copiedField === 'vin' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <div className="font-mono text-sm sm:text-base font-bold text-slate-100 tracking-wider break-all">
                    {disc.vin}
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500 font-sans flex items-center gap-2">
                    <span>17 Characters (ISO 3779)</span>
                    {disc.plantCountry && <span>· Plant: {disc.plantCountry}</span>}
                  </div>
                </div>

                {/* ENGINE NUMBER (Identical format as Registration / Licence Plate No) */}
                {disc.engineNumber &&
                  disc.engineNumber !== disc.licenceNumber &&
                  !isSouthAfricanPlateFormat(disc.engineNumber) && (
                  <div className="p-3.5 rounded-xl bg-gradient-to-b from-amber-50 to-amber-100 text-slate-950 border-2 border-slate-800 shadow-md flex items-center justify-between mb-3">
                    <div>
                      <div className="text-[9px] uppercase font-bold text-slate-600 tracking-wider">
                        Engine Number
                      </div>
                      <div className="font-mono text-xl sm:text-2xl font-black tracking-widest text-slate-950 break-all">
                        {disc.engineNumber}
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(disc.engineNumber!, 'engine_tech')}
                      className="p-2 rounded-lg bg-slate-900 text-amber-100 hover:bg-slate-800 shrink-0 ml-2"
                      title="Copy engine number"
                    >
                      {copiedField === 'engine_tech' ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )}

              {/* REGISTER NO & CONTROL NO */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      Control / Disc No.
                    </span>
                    {disc.controlNumber && (
                      <button
                        onClick={() => copyToClipboard(disc.controlNumber!, 'control')}
                        className="text-slate-400 hover:text-white"
                      >
                        {copiedField === 'control' ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                  <div className="font-mono font-semibold text-slate-200 mt-1 truncate">
                    {disc.controlNumber || 'A84920194'}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      Register Number
                    </span>
                    {disc.vehicleRegisterNumber && (
                      <button
                        onClick={() => copyToClipboard(disc.vehicleRegisterNumber!, 'regNum')}
                        className="text-slate-400 hover:text-white"
                      >
                        {copiedField === 'regNum' ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                  <div className="font-mono font-semibold text-slate-200 mt-1 truncate">
                    {disc.vehicleRegisterNumber || '980145293810'}
                  </div>
                </div>
              </div>

              {/* Extra specifications if available */}
              {(disc.fuelType || disc.displacementL || disc.driveType) && (
                <div className="mt-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                  <span>Specs:</span>
                  <span className="font-semibold text-slate-100">
                    {[disc.displacementL, disc.fuelType, disc.driveType].filter(Boolean).join(' · ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* RAW BARCODE / QR CODE PAYLOAD ACCORDION */}
      {disc.rawBarcode && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow">
          <button
            onClick={() => setIsRawPayloadOpen((prev) => !prev)}
            className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-850 transition"
          >
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-200">
                Raw Decoded Barcode Payload ({disc.barcodeFormat || '2D Barcode'})
              </span>
            </div>
            {isRawPayloadOpen ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {isRawPayloadOpen && (
            <div className="p-3.5 border-t border-slate-800 bg-slate-950 font-mono text-xs text-slate-300 break-all space-y-2">
              <div className="flex justify-between items-center pb-1">
                <span className="text-[10px] text-slate-500 font-sans uppercase">
                  Raw string payload
                </span>
                <button
                  onClick={() => copyToClipboard(disc.rawBarcode!, 'raw_barcode')}
                  className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300"
                >
                  {copiedField === 'raw_barcode' ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>Copy Payload</span>
                </button>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] leading-relaxed text-emerald-300/90 select-all">
                {disc.rawBarcode}
              </div>
            </div>
          )}
        </div>
      )}

      {/* BOTTOM ACTION BAR */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => copyToClipboard(generateTextReport(), 'report_copy')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5"
          >
            {copiedField === 'report_copy' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>Copy Full Report</span>
          </button>

          <button
            onClick={handleDownloadReport}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .txt</span>
          </button>

          <button
            onClick={handleDownloadJson}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>
        </div>

        <button
          onClick={onRescan}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 ml-auto"
        >
          <QrCode className="w-4 h-4" />
          <span>Scan Next Disc</span>
        </button>
      </div>
    </div>
  );
};
