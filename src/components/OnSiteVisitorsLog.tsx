import React, { useState } from 'react';
import {
  Car,
  User,
  Home,
  Clock,
  LogOut,
  Search,
  ShieldAlert,
  QrCode,
  FileText,
  AlertCircle,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { VisitorEntry, VisitPurpose } from '../types';

interface OnSiteVisitorsLogProps {
  visitors: VisitorEntry[];
  onCheckout: (id: string) => void;
  onViewPass: (visitor: VisitorEntry) => void;
  onFlag: (id: string) => void;
}

export const OnSiteVisitorsLog: React.FC<OnSiteVisitorsLogProps> = ({
  visitors,
  onCheckout,
  onViewPass,
  onFlag,
}) => {
  const [search, setSearch] = useState('');
  const [purposeFilter, setPurposeFilter] = useState<string>('ALL');

  // Filter only ON_SITE or FLAGGED visitors
  const onSiteVisitors = visitors.filter(
    (v) => v.status === 'ON_SITE' || v.status === 'FLAGGED'
  );

  const filteredVisitors = onSiteVisitors.filter((v) => {
    // Purpose filter
    if (purposeFilter !== 'ALL' && v.destination.purpose !== purposeFilter) {
      return false;
    }
    // Search query
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      v.vehicle.licenceNumber.toLowerCase().includes(q) ||
      v.vehicle.make.toLowerCase().includes(q) ||
      v.vehicle.seriesName.toLowerCase().includes(q) ||
      v.driver.fullName.toLowerCase().includes(q) ||
      v.driver.idNumber.toLowerCase().includes(q) ||
      v.destination.unitVisited.toLowerCase().includes(q) ||
      v.destination.residentName.toLowerCase().includes(q) ||
      v.passNumber.toLowerCase().includes(q)
    );
  });

  const getElapsedDuration = (entryTime: number): string => {
    const diffMs = Date.now() - entryTime;
    const mins = Math.max(1, Math.floor(diffMs / 60000));
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return `${hrs}h ${rem}m`;
  };

  const getPurposeLabel = (purpose: VisitPurpose) => {
    switch (purpose) {
      case 'RESIDENT_VISIT':
        return { text: 'Resident Guest', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' };
      case 'DELIVERY':
        return { text: 'Delivery / Courier', color: 'bg-amber-500/10 text-amber-300 border-amber-500/30' };
      case 'CONTRACTOR':
        return { text: 'Contractor', color: 'bg-orange-500/10 text-orange-300 border-orange-500/30' };
      case 'TAXI_RIDESHARE':
        return { text: 'Uber / Taxi', color: 'bg-purple-500/10 text-purple-300 border-purple-500/30' };
      default:
        return { text: 'Services', color: 'bg-blue-500/10 text-blue-300 border-blue-500/30' };
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls: Search & Filters */}
      <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search plate, driver, unit, pass..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              Active On-Site: <strong className="text-emerald-300">{onSiteVisitors.length}</strong>
            </span>
          </div>
        </div>

        {/* Purpose Filter Pills */}
        <div className="flex items-center gap-1.5 pt-1 text-xs overflow-x-auto no-scrollbar -mx-1 px-1 sm:flex-wrap">
          <span className="shrink-0 text-[11px] text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          {['ALL', 'RESIDENT_VISIT', 'DELIVERY', 'CONTRACTOR', 'TAXI_RIDESHARE'].map((p) => (
            <button
              key={p}
              onClick={() => setPurposeFilter(p)}
              className={`shrink-0 whitespace-nowrap px-3 py-2 sm:py-1 rounded-xl text-xs sm:text-[11px] font-semibold transition ${
                purposeFilter === p
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {p === 'ALL'
                ? 'All Vehicles'
                : p === 'RESIDENT_VISIT'
                ? 'Guests'
                : p === 'DELIVERY'
                ? 'Deliveries'
                : p === 'CONTRACTOR'
                ? 'Contractors'
                : 'Taxis'}
            </button>
          ))}
        </div>
      </div>

      {/* List of On-Site Visitors */}
      {filteredVisitors.length === 0 ? (
        <div className="py-16 text-center rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center p-6">
          <div className="p-4 rounded-full bg-slate-800 text-slate-500 mb-3">
            <Car className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-white text-base">No Matching On-Site Visitors</h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            {search
              ? 'No active visitors match your current search terms.'
              : 'There are currently no active visitor vehicles on the premises.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredVisitors.map((v) => {
            const purposeBadge = getPurposeLabel(v.destination.purpose);
            const isLongStay = Date.now() - v.entryTime > 4 * 3600 * 1000;

            return (
              <div
                key={v.id}
                className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 transition shadow-xl space-y-3.5 flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Pass Number & Duration */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-emerald-400">
                        {v.passNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${purposeBadge.color}`}
                      >
                        {purposeBadge.text}
                      </span>
                      {v.isFlagged && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" /> FLAGGED
                        </span>
                      )}
                    </div>

                    <div
                      className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-xl ${
                        isLongStay
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-950 text-slate-300 border border-slate-800'
                      }`}
                    >
                      <Clock className="w-3 h-3 text-emerald-400" />
                      <span>Inside {getElapsedDuration(v.entryTime)}</span>
                    </div>
                  </div>

                  {/* Vehicle Details */}
                  <div className="mt-3 p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0 whitespace-nowrap px-2.5 py-1 rounded bg-amber-400 text-slate-950 font-mono font-black text-sm tracking-wider">
                        {v.vehicle.licenceNumber}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">
                          {v.vehicle.make} {v.vehicle.seriesName}
                        </div>
                        <div className="text-xs text-slate-400">
                          {v.vehicle.colour || 'White'} · in at {v.entryTimeFormatted}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Driver & Unit Details */}
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 flex items-center gap-2.5">
                      {v.driver.photoUrl ? (
                        <img
                          src={v.driver.photoUrl}
                          alt={v.driver.fullName}
                          className="w-10 h-10 rounded-xl object-cover border border-emerald-500/40 shrink-0 bg-slate-900"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-blue-950/60 border border-blue-800/40 flex items-center justify-center text-blue-400 shrink-0">
                          <User className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                          <span className="truncate">Driver</span>
                          {v.driver.documentType === 'id_card' && (
                            <span className="text-[9px] px-1 rounded bg-indigo-500/20 text-indigo-300 font-bold">ID</span>
                          )}
                        </div>
                        <div className="font-semibold text-white truncate mt-0.5">
                          {v.driver.fullName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          ID: {v.driver.idNumber || v.driver.licenseNumber}
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                      <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                        <Home className="w-3 h-3 text-emerald-400" /> Visiting
                      </div>
                      <div className="font-semibold text-white truncate mt-0.5">
                        {v.destination.unitVisited}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {v.destination.residentName}
                      </div>
                    </div>
                  </div>

                  {v.destination.notes && (
                    <div className="mt-2 text-[11px] text-slate-400 italic bg-slate-950/40 p-2 rounded-lg border border-slate-800/40 truncate">
                      "{v.destination.notes}"
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onViewPass(v)}
                    className="h-11 sm:h-auto py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition active:scale-95"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>View Pass</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onFlag(v.id)}
                      className={`touch-target flex items-center justify-center p-2 rounded-xl transition ${
                        v.isFlagged
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-300'
                      }`}
                      title="Toggle Security Alert"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onCheckout(v.id)}
                      className="h-11 sm:h-auto py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm sm:text-xs flex items-center gap-1.5 shadow-md shadow-amber-950 transition active:scale-95"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Check Out</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
