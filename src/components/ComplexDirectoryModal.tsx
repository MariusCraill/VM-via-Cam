import React, { useState } from 'react';
import { ComplexUnit } from '../types';
import { X, Search, Phone, Home, Building2, User } from 'lucide-react';

interface ComplexDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  units: ComplexUnit[];
  complexName: string;
  onSelectUnit?: (unitNumber: string) => void;
}

export const ComplexDirectoryModal: React.FC<ComplexDirectoryModalProps> = ({
  isOpen,
  onClose,
  units,
  complexName,
  onSelectUnit,
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filtered = units.filter(
    (u) =>
      u.unitNumber.toLowerCase().includes(search.toLowerCase()) ||
      u.residentName.toLowerCase().includes(search.toLowerCase()) ||
      (u.block && u.block.toLowerCase().includes(search.toLowerCase())) ||
      u.residentPhone.includes(search)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-sm sm:text-base">Complex Residents Directory</h2>
              <p className="text-[11px] text-slate-400">{complexName} · {units.length} Units</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-800 bg-slate-900">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by unit number, resident name, or phone..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* List of Units */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.map((u) => (
            <div
              key={u.unitNumber}
              className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 font-mono font-bold text-emerald-300 text-xs shrink-0">
                  {u.unitNumber}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-white text-xs truncate">{u.residentName}</div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>{u.block || 'Main Complex'}</span>
                    <span className="text-slate-600">·</span>
                    <span className="flex items-center gap-1 text-slate-300">
                      <Phone className="w-3 h-3 text-slate-500" />
                      {u.residentPhone}
                    </span>
                  </div>
                </div>
              </div>

              {onSelectUnit && (
                <button
                  onClick={() => {
                    onSelectUnit(u.unitNumber);
                    onClose();
                  }}
                  className="py-1.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-semibold text-[11px] border border-emerald-500/30 transition shrink-0"
                >
                  Select Unit
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
