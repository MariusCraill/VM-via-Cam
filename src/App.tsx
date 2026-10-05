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
  Settings,
  Sun,
  Moon,
} from 'lucide-react';
import { VisitorEntry, ComplexStats, LicenseDiscData, SiteSettings } from './types';
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
import { AdminPanel } from './components/AdminPanel';
import { adminFetch, fetchAdminStatus, getAdminToken } from './utils/adminApi';

// Shown until /api/settings loads (and if it fails)
const FALLBACK_SETTINGS: SiteSettings = {
  siteName: 'GatePass VMS',
  tagline: 'Complex Visitor Access Control & Database',
  complexName: 'Residential Estate',
  complexShortName: '',
  logoDataUrl: null,
  gateLanes: ['Main Gate'],
  securityOfficers: ['Security Officer'],
  units: [],
};

type ActiveTab = 'checkin' | 'onsite' | 'audit' | 'tool';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('checkin');

  // Theme state: start by default in light mode, restore user preference if saved
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('gatepass_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      const meta = document.getElementById('theme-color-meta');
      if (meta) meta.setAttribute('content', '#020617');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      const meta = document.getElementById('theme-color-meta');
      if (meta) meta.setAttribute('content', '#f8fafc');
    }
    localStorage.setItem('gatepass_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Database state
  const [visitors, setVisitors] = useState<VisitorEntry[]>([]);
  const [stats, setStats] = useState<ComplexStats | null>(null);
  const [settings, setSettings] = useState<SiteSettings>(FALLBACK_SETTINGS);
  const units = settings.units;
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
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
      const [resVisitors, resSettings] = await Promise.all([
        fetch('/api/visitors'),
        fetch('/api/settings'),
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

      if (resSettings.ok) {
        setSettings(await resSettings.json());
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

  // Restore an admin session from this browser tab, if still valid
  useEffect(() => {
    if (!getAdminToken()) return;
    fetchAdminStatus()
      .then((s) => setIsAdmin(s.authenticated))
      .catch(() => setIsAdmin(false));
  }, []);

  useEffect(() => {
    document.title = settings.complexShortName
      ? `${settings.siteName} · ${settings.complexShortName}`
      : settings.siteName;
  }, [settings.siteName, settings.complexShortName]);

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
      await adminFetch(`/api/visitors/${id}`, { method: 'DELETE' });
      setVisitors((prev) => prev.filter((v) => v.id !== id));
      fetchDatabaseData();
    } catch (err: any) {
      console.error('Delete failed:', err);
      if (err.status === 401) {
        setIsAdmin(false);
        window.alert('Your admin session has expired. Please log in again.');
      }
    }
  };

  const onSiteCount = visitors.filter((v) => v.status === 'ON_SITE' || v.status === 'FLAGGED').length;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-12 transition-colors duration-200">
      <OfflineIndicator />

      {/* TOP APPLICATION HEADER */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          {/* COMPLEX BRANDING */}
          <div className="flex items-center gap-3 min-w-0">
            {settings.logoDataUrl ? (
              <img
                src={settings.logoDataUrl}
                alt={`${settings.complexName} logo`}
                className="w-10 h-10 shrink-0 rounded-2xl object-contain bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-transparent"
              />
            ) : (
              <div className="w-10 h-10 shrink-0 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-950/20 dark:shadow-emerald-950">
                <ShieldCheck className="w-6 h-6" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white truncate">
                  {settings.siteName}
                </span>
                {settings.complexShortName && (
                  <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30">
                    {settings.complexShortName}
                  </span>
                )}
              </div>
              {settings.tagline && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">{settings.tagline}</p>
              )}
            </div>
          </div>

          {/* TOP ACTIONS & ON-SITE BADGE */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Live On-Site Visitors Button */}
            <button
              onClick={() => setActiveTab('onsite')}
              className={`hidden sm:flex px-3 py-1.5 rounded-xl border text-xs font-bold transition items-center gap-1.5 ${
                activeTab === 'onsite'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
              <span>
                {onSiteCount}
                <span className="hidden sm:inline"> On-Site</span>
              </span>
            </button>

            {/* Resident Directory Modal Trigger */}
            <button
              onClick={() => setIsDirectoryOpen(true)}
              className="touch-target flex items-center justify-center p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition shadow-xs"
              title="Complex Resident Directory"
            >
              <Building2 className="w-4 h-4" />
            </button>

            {/* Light / Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="touch-target flex items-center justify-center p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition shadow-xs"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              aria-label="Toggle light/dark theme"
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4 text-slate-700" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </button>

            {/* Admin settings */}
            <button
              onClick={() => setIsAdminOpen(true)}
              className={`touch-target flex items-center justify-center p-2 rounded-xl border transition shadow-xs ${
                isAdmin
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25'
                  : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={isAdmin ? 'Admin settings (logged in)' : 'Admin login'}
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Refresh DB */}
            <button
              onClick={fetchDatabaseData}
              disabled={isLoading}
              className="touch-target flex items-center justify-center p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-50 transition shadow-xs"
              title="Sync Database"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* NAVIGATION TABS (tablet / desktop; phones use the bottom bar) */}
      <div className="hidden sm:block bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800/80 px-4 sm:px-6 pt-2">
        <div className="max-w-5xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setActiveTab('checkin')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'checkin'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Entry Check-In</span>
          </button>

          <button
            onClick={() => setActiveTab('onsite')}
            className={`relative px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'onsite'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>On-Site Visitors</span>
            {onSiteCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[10px] font-black">
                {onSiteCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'audit'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Visitor History &amp; Audit DB</span>
          </button>

          <button
            onClick={() => setActiveTab('tool')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'tool'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
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
            settings={settings}
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
            onDelete={isAdmin ? handleDeleteVisitor : undefined}
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

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4">
          {(
            [
              ['checkin', 'Check-In', PlusCircle],
              ['onsite', 'On-Site', Users],
              ['audit', 'History', History],
              ['tool', 'Vehicle', Disc],
            ] as const
          ).map(([tab, label, Icon]) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                window.scrollTo({ top: 0 });
                if (tab === 'onsite' || tab === 'audit') fetchDatabaseData();
              }}
              className={`relative flex flex-col items-center justify-center gap-1 h-16 text-[11px] font-semibold transition ${
                activeTab === tab
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400 active:text-slate-900 dark:active:text-slate-200'
              }`}
            >
              {activeTab === tab && (
                <span className="absolute top-0 inset-x-6 h-0.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
              )}
              <span className="relative">
                <Icon className="w-5 h-5" />
                {tab === 'onsite' && onSiteCount > 0 && (
                  <span className="absolute -top-1.5 -right-3 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center">
                    {onSiteCount}
                  </span>
                )}
              </span>
              {label}
            </button>
          ))}
        </div>
      </nav>

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
        logoDataUrl={settings.logoDataUrl}
      />

      {/* COMPLEX DIRECTORY MODAL */}
      <ComplexDirectoryModal
        isOpen={isDirectoryOpen}
        onClose={() => setIsDirectoryOpen(false)}
        units={units}
        complexName={settings.complexName}
      />

      {/* ADMIN SETTINGS */}
      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
        isAdmin={isAdmin}
        onAuthChange={setIsAdmin}
        theme={theme}
        onThemeChange={setTheme}
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
