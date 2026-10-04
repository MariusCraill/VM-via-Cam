import React, { useState } from 'react';
import {
  History,
  Download,
  Search,
  Filter,
  Car,
  User,
  Home,
  Clock,
  Trash2,
  FileText,
  ShieldCheck,
  CheckCircle2,
  ArrowUpDown,
} from 'lucide-react';
import { VisitorEntry, ComplexStats } from '../types';

interface VisitorHistoryAuditProps {
  visitors: VisitorEntry[];
  stats: ComplexStats | null;
  onViewPass: (visitor: VisitorEntry) => void;
  /** Omit to hide the delete button (only admins may delete records). */
  onDelete?: (id: string) => void;
}

export const VisitorHistoryAudit: React.FC<VisitorHistoryAuditProps> = ({
  visitors,
  stats,
  onViewPass,
  onDelete,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredVisitors = visitors.filter((v) => {
    if (statusFilter !== 'ALL' && v.status !== statusFilter) {
      return false;
    }
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      v.vehicle.licenceNumber.toLowerCase().includes(q) ||
      v.vehicle.make.toLowerCase().includes(q) ||
      v.vehicle.seriesName.toLowerCase().includes(q) ||
      v.driver.fullName.toLowerCase().includes(q) ||
      v.driver.idNumber.toLowerCase().includes(q) ||
      v.driver.licenseNumber.toLowerCase().includes(q) ||
      v.destination.unitVisited.toLowerCase().includes(q) ||
      v.destination.residentName.toLowerCase().includes(q) ||
      v.passNumber.toLowerCase().includes(q)
    );
  });

  const handleExportCsv = () => {
    window.location.href = '/api/export-csv';
  };

  return (
    <div className="space-y-4">
      {/* Real-time KPI Stats Ribbon */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Today</div>
            <div className="text-xl font-bold text-white mt-0.5">{stats.totalToday}</div>
            <div className="text-[10px] text-slate-500">entries recorded</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-emerald-900/40 shadow-md">
            <div className="text-[10px] uppercase font-bold text-emerald-400">Currently On-Site</div>
            <div className="text-xl font-bold text-emerald-300 mt-0.5">{stats.currentlyOnSite}</div>
            <div className="text-[10px] text-emerald-500">inside complex</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
            <div className="text-[10px] uppercase font-bold text-slate-400">Exited Today</div>
            <div className="text-xl font-bold text-slate-200 mt-0.5">{stats.checkedOutToday}</div>
            <div className="text-[10px] text-slate-500">departures logged</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
            <div className="text-[10px] uppercase font-bold text-slate-400">Avg Visit Length</div>
            <div className="text-xl font-bold text-white mt-0.5">{stats.averageDurationMinutes}m</div>
            <div className="text-[10px] text-slate-500">average duration</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
            <div className="text-[10px] uppercase font-bold text-amber-400">Deliveries</div>
            <div className="text-xl font-bold text-amber-300 mt-0.5">{stats.deliveriesToday}</div>
            <div className="text-[10px] text-slate-500">courier vehicles</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
            <div className="text-[10px] uppercase font-bold text-orange-400">Contractors</div>
            <div className="text-xl font-bold text-orange-300 mt-0.5">{stats.contractorsToday}</div>
            <div className="text-[10px] text-slate-500">trades & services</div>
          </div>
        </div>
      )}

      {/* Filter & Export Bar */}
      <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search all records (plate, driver, unit...)"
            className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs">
            {['ALL', 'ON_SITE', 'CHECKED_OUT', 'FLAGGED'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 sm:py-1 rounded-xl text-xs sm:text-[11px] font-semibold transition ${
                  statusFilter === s
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s === 'ALL' ? 'All' : s === 'ON_SITE' ? 'On-Site' : s === 'CHECKED_OUT' ? 'Exited' : 'Flagged'}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCsv}
            className="py-2 px-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition active:scale-95"
            title="Export CSV for HOA / Compliance"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Records: cards on phones */}
      <div className="sm:hidden space-y-3">
        {filteredVisitors.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500 rounded-3xl bg-slate-900/90 border border-slate-800">
            No visitor records found matching your filters.
          </div>
        ) : (
          filteredVisitors.map((v) => (
            <div key={v.id} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-white text-sm">{v.passNumber}</span>
                <StatusBadge status={v.status} />
              </div>
              <div className="flex items-center gap-3">
                <span className="shrink-0 whitespace-nowrap px-2 py-1 rounded bg-amber-400 text-slate-950 font-mono font-black text-sm">
                  {v.vehicle.licenceNumber}
                </span>
                <span className="text-sm text-slate-300 font-semibold truncate">
                  {v.vehicle.make} {v.vehicle.seriesName}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="min-w-0">
                  <div className="text-xs text-slate-500">Driver</div>
                  <div className="font-semibold text-white truncate">{v.driver.fullName}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-slate-500">Visiting</div>
                  <div className="font-semibold text-white truncate">
                    {v.destination.unitVisited} · {v.destination.residentName}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">In / Out</div>
                  <div className="text-slate-200">
                    {v.entryTimeFormatted} – {v.exitTimeFormatted || 'inside'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Duration</div>
                  <div className={v.durationMinutes ? 'text-slate-200' : 'text-emerald-400 font-semibold'}>
                    {v.durationMinutes ? `${v.durationMinutes} mins` : 'Active'}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onViewPass(v)}
                  className="flex-1 h-11 rounded-xl bg-slate-800 active:bg-slate-700 text-slate-200 text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4 text-emerald-400" />
                  View Pass
                </button>
                {onDelete && (
                  <button
                    onClick={() => onDelete(v.id)}
                    className="w-11 h-11 rounded-xl bg-slate-800 active:bg-rose-900/60 text-slate-400 flex items-center justify-center"
                    title="Delete Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Records Table (tablet / desktop) */}
      <div className="hidden sm:block rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Pass & Status</th>
                <th className="py-3 px-4">Vehicle</th>
                <th className="py-3 px-4">Driver</th>
                <th className="py-3 px-4">Destination</th>
                <th className="py-3 px-4">Entry / Exit</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredVisitors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No visitor records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredVisitors.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/40 transition">
                    {/* Pass & Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-white text-xs">{v.passNumber}</div>
                      <div className="mt-0.5">
                        {v.status === 'ON_SITE' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            ON-SITE
                          </span>
                        ) : v.status === 'FLAGGED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            FLAGGED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400">
                            EXITED
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Vehicle */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="inline-block px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-mono font-black text-xs">
                        {v.vehicle.licenceNumber}
                      </div>
                      <div className="text-[11px] text-slate-300 font-semibold mt-0.5">
                        {v.vehicle.make} {v.vehicle.seriesName}
                      </div>
                      <div className="text-[10px] text-slate-500">{v.vehicle.colour || 'White'}</div>
                    </td>

                    {/* Driver */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-white text-xs">{v.driver.fullName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        ID: {v.driver.idNumber || v.driver.licenseNumber}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {v.driver.documentType === 'id_card' ? (
                          <span className="text-indigo-400 font-semibold">Smart ID Card</span>
                        ) : (
                          v.driver.licenseCodes || 'Code B'
                        )}
                      </div>
                    </td>

                    {/* Destination */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-white text-xs">{v.destination.unitVisited}</div>
                      <div className="text-[11px] text-slate-300">{v.destination.residentName}</div>
                      <div className="text-[10px] text-emerald-400 font-medium">
                        {v.destination.purpose.replace(/_/g, ' ')}
                      </div>
                    </td>

                    {/* Entry / Exit */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-slate-200 text-xs">In: {v.entryTimeFormatted}</div>
                      <div className="text-[10px] text-slate-400">
                        {v.exitTimeFormatted ? `Out: ${v.exitTimeFormatted}` : 'Still inside'}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                        {v.destination.gateLane.split('-')[0]}
                      </div>
                    </td>

                    {/* Duration */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {v.durationMinutes ? (
                        <span className="font-semibold text-slate-200 text-xs">
                          {v.durationMinutes} mins
                        </span>
                      ) : (
                        <span className="text-emerald-400 text-xs font-semibold">Active</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onViewPass(v)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                          title="View Digital Pass"
                        >
                          <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        </button>
                        {onDelete && (
                          <button
                            onClick={() => onDelete(v.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 transition"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: VisitorEntry['status'] }> = ({ status }) =>
  status === 'ON_SITE' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
      ON-SITE
    </span>
  ) : status === 'FLAGGED' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
      FLAGGED
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">
      EXITED
    </span>
  );
