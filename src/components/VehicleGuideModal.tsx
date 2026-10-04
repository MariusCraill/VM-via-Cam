/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import {
  X,
  Disc,
  QrCode,
  ShieldCheck,
  Lightbulb,
  FileText,
  Car,
  CheckCircle2,
} from 'lucide-react';

interface VehicleGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VehicleGuideModal: React.FC<VehicleGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-5 sm:p-6 text-slate-100 relative max-h-[90vh] overflow-y-auto">
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
            <h3 className="text-base font-bold text-white">License Disc Scanning Guide</h3>
            <p className="text-xs text-slate-400">
              How to scan South African and vehicle license disc barcodes
            </p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-slate-300">
          {/* Section 1: Where to find the disc */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <h4 className="font-bold text-white flex items-center gap-1.5 mb-2 text-sm">
              <Car className="w-4 h-4 text-emerald-400" />
              1. Windscreen Location
            </h4>
            <p className="leading-relaxed text-slate-400 mb-2">
              In South Africa, the circular 85mm Motor Vehicle Licence Disc (MVLX) must be affixed to the <strong>lower left corner of the front windscreen</strong> inside a transparent holder, facing outwards.
            </p>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-emerald-300 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>You can scan the disc directly from outside through the windscreen glass.</span>
            </div>
          </div>

          {/* Section 2: Barcode format & encoded fields */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <h4 className="font-bold text-white flex items-center gap-1.5 mb-2 text-sm">
              <QrCode className="w-4 h-4 text-emerald-400" />
              2. Encoded Barcode Standard (PDF417 & QR)
            </h4>
            <p className="leading-relaxed text-slate-400 mb-2.5">
              The rectangular barcode at the bottom of the disc is a high-density 2D PDF417 or QR code encoding eNaTIS record data separated by <code>%</code> delimiters:
            </p>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-bold text-white block">Licence / Reg No.</span>
                <span className="text-slate-400">e.g. CA 123-456, ND 682-419</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-bold text-white block">17-Digit VIN</span>
                <span className="text-slate-400">Vehicle Chassis Number</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-bold text-white block">Make & Model</span>
                <span className="text-slate-400">Manufacturer & Series</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-bold text-white block">Engine Number</span>
                <span className="text-slate-400">Engine Block Identifier</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-bold text-white block">Expiry Date</span>
                <span className="text-slate-400">Valid date and status</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-bold text-white block">Tare & GVM Mass</span>
                <span className="text-slate-400">Vehicle mass in kg</span>
              </div>
            </div>
          </div>

          {/* Section 3: Pro Tips for scanning */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <h4 className="font-bold text-white flex items-center gap-1.5 mb-2 text-sm">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              3. Tips for Fast, Accurate Scanning
            </h4>
            <ul className="space-y-1.5 text-slate-400 text-[11px]">
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Avoid Windscreen Glare:</strong> Tilt the phone at a slight 15-degree angle to eliminate direct sun reflections off the glass.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Hold Steady:</strong> Position the bottom barcode strip horizontally inside the green targeting box.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Night / Shaded Areas:</strong> Toggle the built-in flashlight using the torch button.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Damaged Barcodes:</strong> Tap the &ldquo;AI Read Disc&rdquo; button or upload a photo to let Gemini AI read the printed circular disc text directly.</span>
              </li>
            </ul>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition"
        >
          Got It, Start Scanning
        </button>
      </div>
    </div>
  );
};
