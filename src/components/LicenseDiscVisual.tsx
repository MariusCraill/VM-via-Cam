/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { LicenseDiscData } from '../types';
import { ShieldCheck, AlertTriangle, XCircle, QrCode } from 'lucide-react';

interface LicenseDiscVisualProps {
  disc: LicenseDiscData;
  className?: string;
  showStatusBadge?: boolean;
}

export const LicenseDiscVisual: React.FC<LicenseDiscVisualProps> = ({
  disc,
  className = '',
  showStatusBadge = true,
}) => {
  // Format expiry date for header (e.g. "OCT 2026" or "2026-10")
  let expiryMonthYear = 'VALID';
  if (disc.expiryDate) {
    try {
      const parts = disc.expiryDate.split('-');
      if (parts.length >= 2) {
        const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
        const month = dateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase();
        expiryMonthYear = `${month} ${parts[0]}`;
      }
    } catch {
      expiryMonthYear = disc.expiryDate;
    }
  }

  const isExpired = disc.expiryStatus === 'expired';
  const isExpiringSoon = disc.expiryStatus === 'expiring_soon';

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* Outer Glow / Circular Ring */}
      <div className="relative w-72 sm:w-80 h-72 sm:h-80 rounded-full p-2 bg-gradient-to-b from-emerald-600/30 via-slate-800 to-slate-950 border border-emerald-500/40 shadow-2xl flex items-center justify-center">
        {/* Cut guide dash circle */}
        <div className="absolute inset-2.5 rounded-full border border-dashed border-emerald-400/40 pointer-events-none" />

        {/* The Authentic Circular License Disc Surface */}
        <div className="relative w-full h-full rounded-full bg-[#f4f7f4] text-slate-900 overflow-hidden shadow-inner flex flex-col justify-between p-3.5 sm:p-4 text-[9px] font-sans border-2 border-emerald-800/80">
          {/* Subtle Guilloche Watermark Pattern */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none flex items-center justify-center"
            style={{
              backgroundImage: 'radial-gradient(#065f46 1px, transparent 1px)',
              backgroundSize: '12px 12px',
            }}
          />

          {/* Central Crest Watermark Emblem */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.07] pointer-events-none">
            <svg viewBox="0 0 100 100" className="w-40 h-40 fill-emerald-950">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M50 15 L58 35 L80 38 L63 52 L68 74 L50 62 L32 74 L37 52 L20 38 L42 35 Z" />
            </svg>
          </div>

          {/* TOP DISC HEADER */}
          <div className="text-center z-10 pt-0.5">
            <div className="text-[7.5px] tracking-widest font-black uppercase text-emerald-900/90 leading-tight">
              REPUBLIC OF SOUTH AFRICA
            </div>
            <div className="text-[6.5px] tracking-wider uppercase font-semibold text-emerald-800/80 leading-none mt-0.5">
              MOTOR VEHICLE LICENCE DISC
            </div>

            {/* EXPIRATION MONTH/YEAR PROMINENT BANNER */}
            <div className="mt-1 inline-flex items-center justify-center px-4 py-0.5 rounded bg-emerald-800 text-white font-mono font-black text-xs sm:text-sm tracking-wider shadow-sm">
              {expiryMonthYear}
            </div>
          </div>

          {/* MIDDLE FIELDS CONTAINER */}
          <div className="z-10 px-2 space-y-0.5 my-auto font-mono text-[8px] sm:text-[8.5px] leading-tight">
            {/* Registration Number (Bold Plate) */}
            <div className="flex justify-between items-baseline border-b border-emerald-900/20 pb-0.5">
              <span className="text-[6.5px] font-sans font-bold text-emerald-950 uppercase tracking-tight">
                Licence No:
              </span>
              <span className="font-extrabold text-xs text-slate-950 tracking-wider">
                {disc.licenceNumber}
              </span>
            </div>

            {/* Vehicle Register & Control No */}
            <div className="flex justify-between items-center text-[7px] text-slate-700">
              <span>
                <strong className="text-emerald-950">REG:</strong> {disc.vehicleRegisterNumber || '980145293810'}
              </span>
              <span>
                <strong className="text-emerald-950">CTRL:</strong> {disc.controlNumber || 'A84920194'}
              </span>
            </div>

            {/* VIN / Chassis Number */}
            <div className="flex justify-between items-center">
              <span className="text-[6.5px] font-sans font-bold text-emerald-950 uppercase">
                VIN:
              </span>
              <span className="font-bold text-[8.5px] sm:text-[9px] text-slate-900 tracking-wider">
                {disc.vin}
              </span>
            </div>

            {/* Engine Number */}
            {disc.engineNumber && disc.engineNumber !== disc.licenceNumber && (
              <div className="flex justify-between items-center text-[7.5px]">
                <span className="text-[6.5px] font-sans font-semibold text-emerald-950 uppercase">
                  Engine:
                </span>
                <span className="text-slate-800 font-semibold">{disc.engineNumber}</span>
              </div>
            )}

            {/* Make & Series Name */}
            <div className="flex justify-between items-baseline pt-0.5 border-t border-emerald-900/15">
              <span className="font-black text-[9px] sm:text-[10px] text-slate-950 uppercase truncate max-w-[170px]">
                {disc.make} {disc.seriesName}
              </span>
              <span className="text-[7.5px] font-semibold text-slate-700">
                {disc.colour || 'WHITE'}
              </span>
            </div>

            {/* Vehicle Category & Tare/GVM */}
            <div className="flex justify-between items-center text-[7px] text-slate-700 pt-0.5">
              <span className="truncate max-w-[130px]">{disc.vehicleCategory || 'LIGHT MOTOR VEHICLE'}</span>
              <span>
                {disc.tare ? `T:${disc.tare}kg ` : ''}
                {disc.gvm ? `GVM:${disc.gvm}kg` : ''}
              </span>
            </div>
          </div>

          {/* BOTTOM BARCODE & SECURITY WATERMARK STRIP */}
          <div className="z-10 pb-1 text-center">
            {/* Simulated 2D PDF417 / QR Barcode strip */}
            <div className="mx-auto w-44 sm:w-48 h-5 bg-slate-950 rounded flex items-center justify-between px-1 py-0.5 overflow-hidden opacity-90 shadow-sm">
              <QrCode className="w-3.5 h-3.5 text-white/90 shrink-0" />
              <div className="flex-1 mx-1 flex gap-0.5 h-full items-center justify-around overflow-hidden">
                {Array.from({ length: 42 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-full bg-white"
                    style={{
                      width: `${(i % 3) + 1}px`,
                      opacity: i % 2 === 0 ? 1 : 0.4,
                    }}
                  />
                ))}
              </div>
              <span className="text-[6px] font-mono text-emerald-400 shrink-0 uppercase font-bold">
                {disc.barcodeFormat || 'PDF417'}
              </span>
            </div>

            <div className="text-[6px] font-mono tracking-widest text-emerald-900/80 uppercase mt-0.5">
              EXPIRY: {disc.expiryDate || 'N/A'} · NATIS OFFICIAL
            </div>
          </div>
        </div>
      </div>

      {/* Floating Expiry Status Pill */}
      {showStatusBadge && (
        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-md">
          {isExpired ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/50">
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
              Expired ({Math.abs(disc.daysRemaining || 0)} days overdue)
            </span>
          ) : isExpiringSoon ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Expiring Soon ({disc.daysRemaining} days left)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Valid & Active ({disc.daysRemaining ? `${disc.daysRemaining} days left` : 'Current'})
            </span>
          )}
        </div>
      )}
    </div>
  );
};
