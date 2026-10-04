/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Building2,
  Users,
  Car,
  History,
  QrCode,
  UserCheck,
  PlusCircle,
  RefreshCw,
  Clock,
  LogOut,
  Sparkles,
  Phone,
  Search,
  CheckCircle2,
  AlertCircle,
  Disc,
} from 'lucide-react';
import { VisitorEntry, ComplexStats, ComplexUnit, LicenseDiscData } from './types';
import { VisitorEntryFlow } from './components/VisitorEntryFlow';
import { OnSiteVisitorsLog } from './components/OnSiteVisitorsLog';
import { VisitorHistoryAudit } from './components/VisitorHistoryAudit';
import { DigitalVisitorPassModal } from './components/DigitalVisitorPassModal';
import { ComplexDirectoryModal } from './components/ComplexDirectoryModal';
import { CameraViewfinder } from './components/CameraViewfinder';
import { VehicleResultCard } from './components/VehicleResultCard';
import { ManualEntryModal } from './components/ManualEntryModal';
import { VehicleGuideModal } from './components/VehicleGuideModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { OfflineIndicator } from './components/OfflineIndicator';

type ActiveTab = 'checkin' | 'onsite' | 'audit' | 'tool';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('checkin');

  // Database state
  const [visitors, setVisitors] = useState<VisitorEntry[]>([]);
  const [stats, setStats] = useState<ComplexStats | null>(null);
  const [units, setUnits] = useState<ComplexUnit[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Digital pass modal state
  const [selectedPassVisitor, setSelectedPassVisitor] = useState<VisitorEntry | null>(null);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);

  // Auxiliary single-vehicle scanner state
  const [activeDisc, setActiveDisc] = useState<LicenseDiscData | null>(null);
  const [isLoadingSpecs, setIsLoadingSpecs] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  // Fetch visitors & stats from database
  const fetchDatabaseData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [resVisitors, resUnits] = await Promise.all([
        fetch('/api/visitors'),
        fetch('/api/units'),
      ]);

      if (resVisitors.ok) {
        const json = await resVisitors.json();
        if (json.visitors) {
          setVisitors(json.visitors);
        }
        if (json.stats) {
          setStats(json.stats);
        }
      }

      if (resUnits.ok) {
        const uJson = await resUnits.json();
        setUnits(uJson);
      }
    } catch (err) {
      console.error('Error loading visitors database:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDatabaseData();
  }, [fetchDatabaseData]);

  // Handle new visitor saved from entry flow - default back to main screen
  const handleVisitorSaved = (newVisitor: VisitorEntry) => {
    setVisitors((prev) => [newVisitor, ...prev.filter((v) => v.id !== newVisitor.id)]);
    // Default back to main screen, keep pass modal closed
    setActiveTab('checkin');
    setIsPassModalOpen(false);
    setSelectedPassVisitor(null);
    // Refresh stats
    fetchDatabaseData();
  };

  // Handle visitor checkout
  const handleCheckoutVisitor = async (id: string) => {
    try {
      const res = await fetch(`/api/visitors/${id}/checkout`, {
        method: 'PATCH',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.visitor) {
          setVisitors((prev) =>
            prev.map((v) => (v.id === id ? json.visitor : v))
          );
        }
        if (json.stats) {
          setStats(json.stats);
        }
      }
    } catch (err) {
      console.error('Checkout failed:', err);
    }
  };

  // Handle security flag toggle
  const handleFlagVisitor = async (id: string) => {
    try {
      const res = await fetch(`/api/visitors/${id}/flag`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Flagged by Gate Officer' }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.visitor) {
          setVisitors((prev) =>
            prev.map((v) => (v.id === id ? json.visitor : v))
          );
        }
      }
    } catch (err) {
      console.error('Flag toggle failed:', err);
    }
  };

  // Handle delete visitor record
  const handleDeleteVisitor = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this visitor log from the database?')) return;
    try {
      const res = await fetch(`/api/visitors/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setVisitors((prev) => prev.filter((v) => v.id !== id));
        fetchDatabaseData();
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const onSiteCount = visitors.filter((v) => v.status === 'ON_SITE' || v.status === 'FLAGGED').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white pb-12">
      <OfflineIndicator />

      {/* TOP APPLICATION HEADER */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          {/* COMPLEX BRANDING */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-950">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                  GatePass VMS
                </span>
                <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  Silver Oaks Estate
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Complex Visitor Access Control &amp; Database
              </p>
            </div>
          </div>

          {/* TOP ACTIONS & ON-SITE BADGE */}
          <div className="flex items-center gap-2">
            {/* Live On-Site Visitors Button */}
            <button
              onClick={() => setActiveTab('onsite')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'onsite'
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-600'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{onSiteCount} On-Site</span>
            </button>

            {/* Resident Directory Modal Trigger */}
            <button
              onClick={() => setIsDirectoryOpen(true)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white"
              title="Complex Resident Directory"
            >
              <Building2 className="w-4 h-4" />
            </button>

            {/* Refresh DB */}
            <button
              onClick={fetchDatabaseData}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-50"
              title="Sync Database"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* NAVIGATION TABS */}
      <div className="bg-slate-950 border-b border-slate-800/80 px-4 sm:px-6 pt-2">
        <div className="max-w-5xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setActiveTab('checkin')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'checkin'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Entry Check-In</span>
          </button>

          <button
            onClick={() => setActiveTab('onsite')}
            className={`relative px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'onsite'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>On-Site Visitors</span>
            {onSiteCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-black">
                {onSiteCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Visitor History &amp; Audit DB</span>
          </button>

          <button
            onClick={() => setActiveTab('tool')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'tool'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Disc className="w-4 h-4" />
            <span>Vehicle / VIN Inspector</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-5">
        {activeTab === 'checkin' && (
          <VisitorEntryFlow
            units={units}
            onVisitorSaved={handleVisitorSaved}
          />
        )}

        {activeTab === 'onsite' && (
          <OnSiteVisitorsLog
            visitors={visitors}
            onCheckout={handleCheckoutVisitor}
            onViewPass={(v) => {
              setSelectedPassVisitor(v);
              setIsPassModalOpen(true);
            }}
            onFlag={handleFlagVisitor}
          />
        )}

        {activeTab === 'audit' && (
          <VisitorHistoryAudit
            visitors={visitors}
            stats={stats}
            onViewPass={(v) => {
              setSelectedPassVisitor(v);
              setIsPassModalOpen(true);
            }}
            onDelete={handleDeleteVisitor}
          />
        )}

        {activeTab === 'tool' && (
          <div className="space-y-4">
            {activeDisc ? (
              <VehicleResultCard
                disc={activeDisc}
                isLoadingSpecs={isLoadingSpecs}
                onRescan={() => setActiveDisc(null)}
                onOpenGuide={() => setIsGuideModalOpen(true)}
              />
            ) : (
              <div className="space-y-4">
                <CameraViewfinder
                  onDiscDetected={(d) => setActiveDisc(d)}
                  onOpenManualEntry={() => setIsManualModalOpen(true)}
                  onOpenGuide={() => setIsGuideModalOpen(true)}
                  isProcessing={isLoadingSpecs}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* PWA INSTALL BANNER */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-6">
        <PWAInstallBanner />
      </div>

      {/* DIGITAL VISITOR PASS MODAL */}
      <DigitalVisitorPassModal
        visitor={selectedPassVisitor}
        isOpen={isPassModalOpen}
        onClose={() => setIsPassModalOpen(false)}
        onCheckout={handleCheckoutVisitor}
      />

      {/* COMPLEX DIRECTORY MODAL */}
      <ComplexDirectoryModal
        isOpen={isDirectoryOpen}
        onClose={() => setIsDirectoryOpen(false)}
        units={units}
      />

      {/* AUXILIARY MODALS */}
      <ManualEntryModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSubmitDisc={(disc) => setActiveDisc(disc)}
      />

      <VehicleGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />
    </div>
  );
}
