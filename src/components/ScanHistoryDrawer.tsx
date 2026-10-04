/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useMemo } from 'react';
import {
  X,
  History,
  Trash2,
  Copy,
  Check,
  ChevronRight,
  Disc,
  Search,
  Download,
  ShieldCheck,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { ScanHistoryItem, LicenseDiscData } from '../types';

interface ScanHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: ScanHistoryItem[];
  onSelectDisc: (disc: LicenseDiscData) => void;
  onClearHistory: () => void;
}

export const ScanHistoryDrawer: React.FC<ScanHistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onSelectDisc,
  onClearHistory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'expiring_soon' | 'expired'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const filteredHistory = history.filter((item) => {
    const d = item.disc;
    const matchesSearch =
      !searchTerm ||
      d.licenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.vin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.seriesName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || d.expiryStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Export history to CSV
  const handleExportCsv = () => {
    if (history.length === 0) return;
    const headers = [
      'LicenceNumber',
      'Make',
      'Model',
      'VIN',
      'EngineNumber',
      'ControlNumber',
      'RegisterNumber',
      'Colour',
      'Category',
      'TareKg',
      'GvmKg',
      'ExpiryDate',
      'Status',
      'ScannedAt',
    ];
    const rows = history.map((h) => [
      `"${h.disc.licenceNumber}"`,
      `"${h.disc.make}"`,
      `"${h.disc.seriesName}"`,
      `"${h.disc.vin}"`,
      `"${h.disc.engineNumber || ''}"`,
      `"${h.disc.controlNumber || ''}"`,
      `"${h.disc.vehicleRegisterNumber || ''}"`,
      `"${h.disc.colour || ''}"`,
      `"${h.disc.vehicleCategory || ''}"`,
      `"${h.disc.tare || ''}"`,
      `"${h.disc.gvm || ''}"`,
      `"${h.disc.expiryDate || ''}"`,
      `"${h.disc.expiryStatus}"`,
      `"${new Date(h.timestamp).toISOString()}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `license-discs-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-lg bg-slate-900 border-t sm:border border-slate-700 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 text-slate-100 max-h-[85vh] flex flex-col">
        {/* HEADER */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Scanned License Discs</h3>
              <p className="text-xs text-slate-400">
                {history.length} saved {history.length === 1 ? 'vehicle' : 'vehicles'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <>
                <button
                  onClick={handleExportCsv}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  title="Export to CSV"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={onClearHistory}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-400 transition"
                  title="Clear all history"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SEARCH & FILTERS */}
        {history.length > 0 && (
          <div className="py-3 space-y-2 border-b border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search licence number, make, or VIN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-semibold py-1">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition shrink-0 ${
                  statusFilter === 'all'
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({history.length})
              </button>
              <button
                onClick={() => setStatusFilter('valid')}
                className={`px-2.5 py-1 rounded-lg transition shrink-0 flex items-center gap-1 ${
                  statusFilter === 'valid'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-950 text-emerald-400 hover:bg-slate-800'
                }`}
              >
                <ShieldCheck className="w-3 h-3" /> Valid
              </button>
              <button
                onClick={() => setStatusFilter('expiring_soon')}
                className={`px-2.5 py-1 rounded-lg transition shrink-0 flex items-center gap-1 ${
                  statusFilter === 'expiring_soon'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-950 text-amber-400 hover:bg-slate-800'
                }`}
              >
                <AlertTriangle className="w-3 h-3" /> Expiring Soon
              </button>
              <button
                onClick={() => setStatusFilter('expired')}
                className={`px-2.5 py-1 rounded-lg transition shrink-0 flex items-center gap-1 ${
                  statusFilter === 'expired'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-950 text-rose-400 hover:bg-slate-800'
                }`}
              >
                <XCircle className="w-3 h-3" /> Expired
              </button>
            </div>
          </div>
        )}

        {/* LIST */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
          {history.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Disc className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold">No scanned license discs yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Scan a vehicle licence disc QR/PDF417 code or select a sample disc to populate history.
              </p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No matching records found for &ldquo;{searchTerm}&rdquo;
            </div>
          ) : (
            filteredHistory.map((item) => {
              const d = item.disc;
              const isExp = d.expiryStatus === 'expired';
              const isSoon = d.expiryStatus === 'expiring_soon';

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectDisc(d);
                    onClose();
                  }}
                  className="p-3.5 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 transition cursor-pointer group flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-black text-white group-hover:text-emerald-300">
                        {d.licenceNumber}
                      </span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          isExp
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : isSoon
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {d.expiryStatus.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-300">
                      {d.make} {d.seriesName}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                      <span>VIN: {d.vin.slice(0, 10)}...</span>
                      {d.expiryDate && <span>· Exp: {d.expiryDate}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleCopy(d.licenceNumber, item.id, e)}
                      className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-slate-700 transition"
                      title="Copy registration"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
