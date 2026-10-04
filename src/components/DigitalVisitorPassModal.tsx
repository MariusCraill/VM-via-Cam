import React from 'react';
import {
  ShieldCheck,
  X,
  Printer,
  Copy,
  Check,
  Clock,
  Car,
  User,
  Home,
  QrCode,
  Share2,
} from 'lucide-react';
import { VisitorEntry } from '../types';

interface DigitalVisitorPassModalProps {
  visitor: VisitorEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onCheckout?: (id: string) => void;
}

export const DigitalVisitorPassModal: React.FC<DigitalVisitorPassModalProps> = ({
  visitor,
  isOpen,
  onClose,
  onCheckout,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !visitor) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(
      `VISITOR PASS: ${visitor.passNumber}\nVehicle: ${visitor.vehicle.licenceNumber} (${visitor.vehicle.make} ${visitor.vehicle.seriesName})\nDriver: ${visitor.driver.fullName}\nVisiting: ${visitor.destination.unitVisited} (${visitor.destination.residentName})\nTime: ${visitor.entryTimeFormatted}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white/10 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="text-xs uppercase font-bold tracking-widest text-emerald-200">
                Official Visitor Pass
              </div>
              <div className="font-bold text-base leading-tight">
                {visitor.destination.complexName}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-black/20 hover:bg-black/40 text-emerald-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Big Pass Number & Status */}
          <div className="text-center p-4 bg-slate-950 rounded-2xl border border-slate-800/80">
            <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Pass Authorization Code
            </div>
            <div className="font-mono text-3xl font-black text-emerald-400 tracking-wider my-1">
              {visitor.passNumber}
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{visitor.status === 'ON_SITE' ? 'AUTHORIZED · ON-SITE' : 'CHECKED OUT'}</span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="space-y-3 text-xs">
            {/* Destination */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 flex items-start gap-3">
              <div className="p-2 bg-emerald-950 text-emerald-400 rounded-lg shrink-0">
                <Home className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase font-bold text-slate-400">Visiting Destination</div>
                <div className="text-sm font-bold text-white">
                  {visitor.destination.unitVisited} · {visitor.destination.residentName}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Purpose: <span className="text-emerald-300 font-medium">{visitor.destination.purpose.replace(/_/g, ' ')}</span>
                  {visitor.destination.residentPhone && ` · ${visitor.destination.residentPhone}`}
                </div>
              </div>
            </div>

            {/* Vehicle */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 flex items-start gap-3">
              <div className="p-2 bg-amber-950 text-amber-400 rounded-lg shrink-0">
                <Car className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase font-bold text-slate-400">Registered Vehicle</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="px-2 py-0.5 rounded font-mono font-black text-xs bg-amber-400 text-slate-950">
                    {visitor.vehicle.licenceNumber}
                  </span>
                  <span className="font-semibold text-slate-200 truncate">
                    {visitor.vehicle.make} {visitor.vehicle.seriesName}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Colour: {visitor.vehicle.colour || 'White'} · Cat: {visitor.vehicle.vehicleCategory || 'Light Vehicle'}
                </div>
              </div>
            </div>

            {/* Driver */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 flex items-start gap-3">
              <div className="p-2 bg-blue-950 text-blue-400 rounded-lg shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase font-bold text-slate-400">
                  {visitor.driver.documentType === 'id_card' ? 'Identity (Smart ID Card)' : "Driver's Licence"}
                </div>
                <div className="text-sm font-bold text-white truncate">{visitor.driver.fullName}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                  ID: {visitor.driver.idNumber || 'N/A'}
                  {visitor.driver.documentType === 'id_card'
                    ? ''
                    : ` · Lic: ${visitor.driver.licenseNumber}`}
                </div>
              </div>
            </div>

            {/* Gate Lane & Entry Time */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/60">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Entry Time</div>
                <div className="font-semibold text-slate-200 mt-0.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  {visitor.entryTimeFormatted}
                </div>
              </div>
              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/60">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Gate Lane</div>
                <div className="font-semibold text-slate-200 mt-0.5 truncate">
                  {visitor.destination.gateLane}
                </div>
              </div>
            </div>
          </div>

          {/* Barcode Mock Visual for Gate Exit Scanner */}
          <div className="p-3 bg-white rounded-xl text-slate-950 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-1 h-8">
              {Array.from({ length: 38 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-full bg-black ${
                    (i * 7) % 3 === 0 ? 'w-1' : (i * 5) % 2 === 0 ? 'w-0.5' : 'w-1.5'
                  }`}
                />
              ))}
            </div>
            <div className="text-[10px] font-mono tracking-widest mt-1 font-semibold text-slate-700">
              *{visitor.passNumber}*
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={handleCopy}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
            </button>

            {visitor.status === 'ON_SITE' && onCheckout ? (
              <button
                onClick={() => {
                  onCheckout(visitor.id);
                  onClose();
                }}
                className="py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <span>Record Exit / Checkout</span>
              </button>
            ) : (
              <button
                onClick={handlePrint}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Print Gate Slip</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
