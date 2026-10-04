import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Lock,
  LogOut,
  Palette,
  Users,
  DoorOpen,
  KeyRound,
  Upload,
  Trash2,
  Plus,
  Save,
  Search,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Download,
  FileUp,
} from 'lucide-react';
import { ComplexUnit, SiteSettings } from '../types';
import {
  adminLogin,
  adminLogout,
  changeAdminPassword,
  fetchAdminStatus,
  resizeImageToDataUrl,
  saveSiteSettings,
} from '../utils/adminApi';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SiteSettings;
  onSettingsChange: (settings: SiteSettings) => void;
  isAdmin: boolean;
  onAuthChange: (isAdmin: boolean) => void;
}

type Section = 'branding' | 'residents' | 'gate' | 'security';

const inputClass =
  'w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500';
const labelClass = 'block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  isAdmin,
  onAuthChange,
}) => {
  const [section, setSection] = useState<Section>('branding');
  const [draft, setDraft] = useState<SiteSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  // Login state
  const [passwordSet, setPasswordSet] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDraft(settings);
    setMessage(null);
    setLoginError(null);
    setPassword('');
    setConfirmPassword('');
    fetchAdminStatus()
      .then((s) => {
        setPasswordSet(s.passwordSet);
        onAuthChange(s.authenticated);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const isDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(settings), [draft, settings]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isDirty && !window.confirm('Discard unsaved changes?')) return;
    onClose();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!passwordSet) {
      if (password.length < 6) return setLoginError('Password must be at least 6 characters');
      if (password !== confirmPassword) return setLoginError('Passwords do not match');
    }
    setIsLoggingIn(true);
    try {
      await adminLogin(password, !passwordSet);
      setPassword('');
      setConfirmPassword('');
      setPasswordSet(true);
      onAuthChange(true);
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await adminLogout();
    onAuthChange(false);
    onClose();
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const saved = await saveSiteSettings({
        siteName: draft.siteName,
        tagline: draft.tagline,
        complexName: draft.complexName,
        complexShortName: draft.complexShortName,
        logoDataUrl: draft.logoDataUrl,
        gateLanes: draft.gateLanes,
        securityOfficers: draft.securityOfficers,
        units: draft.units,
      });
      onSettingsChange(saved);
      setDraft(saved);
      setMessage({ type: 'ok', text: 'Settings saved' });
    } catch (err: any) {
      if (err.status === 401) onAuthChange(false);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="modal-sheet relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl border bg-amber-500/10 border-amber-500/30 text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-sm sm:text-base">Admin Settings</h2>
              <p className="text-[11px] text-slate-400">Site branding, complex, residents and gate setup</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isAdmin && (
              <button
                onClick={handleLogout}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Log out</span>
              </button>
            )}
            <button onClick={handleClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {!isAdmin ? (
          <form onSubmit={handleLogin} className="p-6 sm:p-8 max-w-sm w-full mx-auto space-y-4">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white">{passwordSet ? 'Admin Login' : 'Create Admin Password'}</h3>
              <p className="text-xs text-slate-400">
                {passwordSet
                  ? 'Enter the admin password to edit site settings.'
                  : 'No admin password has been set yet. Choose one now. You will need it to edit settings.'}
              </p>
            </div>
            <div>
              <label className={labelClass}>Password</label>
              <input
                type="password"
                autoFocus
                autoComplete={passwordSet ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            {!passwordSet && (
              <div>
                <label className={labelClass}>Confirm password</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
            )}
            {loginError && (
              <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {loginError}
              </div>
            )}
            <button
              type="submit"
              disabled={isLoggingIn || !password}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm disabled:opacity-50"
            >
              {isLoggingIn ? 'Please wait…' : passwordSet ? 'Log in' : 'Set password & continue'}
            </button>
          </form>
        ) : (
          <>
            {/* Section tabs */}
            <div className="px-4 pt-3 bg-slate-900 border-b border-slate-800 flex gap-1 overflow-x-auto no-scrollbar">
              {(
                [
                  ['branding', 'Site & Complex', Palette],
                  ['residents', `Residents (${draft.units.length})`, Users],
                  ['gate', 'Gates & Officers', DoorOpen],
                  ['security', 'Password', KeyRound],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  onClick={() => setSection(id)}
                  className={`px-3 py-2 rounded-t-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
                    section === id
                      ? 'text-white border-emerald-500 bg-slate-800/60'
                      : 'text-slate-400 border-transparent hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {section === 'branding' && <BrandingSection draft={draft} setDraft={setDraft} />}
              {section === 'residents' && <ResidentsSection draft={draft} setDraft={setDraft} />}
              {section === 'gate' && <GateSection draft={draft} setDraft={setDraft} />}
              {section === 'security' && <SecuritySection onUnauthorized={() => onAuthChange(false)} />}
            </div>

            {section !== 'security' && (
              <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
                <div className="text-xs min-h-[1rem]">
                  {message ? (
                    <span
                      className={`flex items-center gap-1.5 ${message.type === 'ok' ? 'text-emerald-400' : 'text-rose-400'}`}
                    >
                      {message.type === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      {message.text}
                    </span>
                  ) : isDirty ? (
                    <span className="text-amber-400">Unsaved changes</span>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  {isDirty && (
                    <button
                      onClick={() => setDraft(settings)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                    >
                      Discard
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={!isDirty || isSaving}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// --------------------------------------------------------------------------- sections

interface SectionProps {
  draft: SiteSettings;
  setDraft: React.Dispatch<React.SetStateAction<SiteSettings>>;
}

const BrandingSection: React.FC<SectionProps> = ({ draft, setDraft }) => {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  const set = (key: keyof SiteSettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((d) => ({ ...d, [key]: e.target.value }));

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLogoError(null);
    try {
      const url = await resizeImageToDataUrl(file, 256);
      setDraft((d) => ({ ...d, logoDataUrl: url }));
    } catch (err: any) {
      setLogoError(err.message);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <label className={labelClass}>Logo</label>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-700 flex items-center justify-center overflow-hidden">
            {draft.logoDataUrl ? (
              <img src={draft.logoDataUrl} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <ShieldCheck className="w-7 h-7 text-emerald-500" />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              Upload logo
            </button>
            {draft.logoDataUrl && (
              <button
                onClick={() => setDraft((d) => ({ ...d, logoDataUrl: null }))}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-300 text-xs font-semibold flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Remove
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
          </div>
        </div>
        <p className="text-[11px] text-slate-500 mt-1.5">Square images work best. Resized to 256 px automatically.</p>
        {logoError && <p className="text-xs text-rose-400 mt-1">{logoError}</p>}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>App / site name</label>
          <input value={draft.siteName} onChange={set('siteName')} className={inputClass} maxLength={60} />
        </div>
        <div>
          <label className={labelClass}>Tagline</label>
          <input value={draft.tagline} onChange={set('tagline')} className={inputClass} maxLength={120} />
        </div>
        <div>
          <label className={labelClass}>Complex name (on passes)</label>
          <input value={draft.complexName} onChange={set('complexName')} className={inputClass} maxLength={100} />
        </div>
        <div>
          <label className={labelClass}>Short name (header badge)</label>
          <input
            value={draft.complexShortName}
            onChange={set('complexShortName')}
            className={inputClass}
            maxLength={40}
          />
        </div>
      </div>
    </div>
  );
};

const emptyUnit = (): ComplexUnit => ({ unitNumber: '', residentName: '', residentPhone: '', block: '' });

/** Minimal CSV line splitter supporting quoted fields. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',' || c === ';' || c === '\t') {
      out.push(cur.trim());
      cur = '';
    } else cur += c;
  }
  out.push(cur.trim());
  return out;
}

const ResidentsSection: React.FC<SectionProps> = ({ draft, setDraft }) => {
  const [search, setSearch] = useState('');
  const csvRef = useRef<HTMLInputElement | null>(null);
  const [csvMessage, setCsvMessage] = useState<string | null>(null);

  const q = search.trim().toLowerCase();
  const rows = draft.units
    .map((u, index) => ({ u, index }))
    .filter(
      ({ u }) =>
        !q ||
        u.unitNumber.toLowerCase().includes(q) ||
        u.residentName.toLowerCase().includes(q) ||
        (u.block || '').toLowerCase().includes(q) ||
        u.residentPhone.includes(q)
    );

  const update = (index: number, key: keyof ComplexUnit, value: string) =>
    setDraft((d) => ({ ...d, units: d.units.map((u, i) => (i === index ? { ...u, [key]: value } : u)) }));

  const remove = (index: number) => setDraft((d) => ({ ...d, units: d.units.filter((_, i) => i !== index) }));

  const add = () => {
    setSearch('');
    setDraft((d) => ({ ...d, units: [...d.units, emptyUnit()] }));
  };

  const exportCsv = () => {
    const esc = (v?: string) => `"${(v || '').replace(/"/g, '""')}"`;
    const lines = ['Unit,Resident,Phone,Block,Intercom'].concat(
      draft.units.map((u) => [u.unitNumber, u.residentName, u.residentPhone, u.block, u.intercomCode].map(esc).join(','))
    );
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'residents.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length && /unit/i.test(lines[0]) && /resident|name/i.test(lines[0])) lines.shift();
    const imported: ComplexUnit[] = lines
      .map(splitCsvLine)
      .filter((c) => c[0])
      .map(([unitNumber, residentName = '', residentPhone = '', block = '', intercomCode = '']) => ({
        unitNumber,
        residentName,
        residentPhone,
        block,
        intercomCode,
      }));
    if (!imported.length) return setCsvMessage('No rows found in the file.');
    const replace = window.confirm(
      `Import ${imported.length} units.\n\nOK = replace the whole list\nCancel = merge (update matching units, add new ones)`
    );
    setDraft((d) => {
      if (replace) return { ...d, units: imported };
      const merged = [...d.units];
      for (const u of imported) {
        const i = merged.findIndex((m) => m.unitNumber.toLowerCase() === u.unitNumber.toLowerCase());
        if (i >= 0) merged[i] = u;
        else merged.push(u);
      }
      return { ...d, units: merged };
    });
    setCsvMessage(`Imported ${imported.length} units. Review, then Save changes.`);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search units or residents…"
            className={`${inputClass} pl-9`}
          />
        </div>
        <button
          onClick={add}
          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add unit
        </button>
        <button
          onClick={() => csvRef.current?.click()}
          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
          title="CSV columns: Unit, Resident, Phone, Block, Intercom"
        >
          <FileUp className="w-4 h-4" />
          Import CSV
        </button>
        <button
          onClick={exportCsv}
          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
        <input ref={csvRef} type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={importCsv} />
      </div>
      {csvMessage && <p className="text-xs text-emerald-400">{csvMessage}</p>}

      <div className="space-y-2">
        {rows.map(({ u, index }) => (
          <div
            key={index}
            className="grid grid-cols-2 sm:grid-cols-[0.8fr_1.6fr_1.2fr_0.8fr_auto] gap-2 p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800"
          >
            <input
              value={u.unitNumber}
              onChange={(e) => update(index, 'unitNumber', e.target.value)}
              placeholder="Unit no."
              className={inputClass}
            />
            <input
              value={u.residentName}
              onChange={(e) => update(index, 'residentName', e.target.value)}
              placeholder="Resident name"
              className={inputClass}
            />
            <input
              value={u.residentPhone}
              onChange={(e) => update(index, 'residentPhone', e.target.value)}
              placeholder="Phone"
              type="tel"
              className={inputClass}
            />
            <input
              value={u.block || ''}
              onChange={(e) => update(index, 'block', e.target.value)}
              placeholder="Block"
              className={inputClass}
            />
            <button
              onClick={() => remove(index)}
              className="col-span-2 sm:col-span-1 p-2 rounded-xl text-slate-400 hover:text-rose-300 hover:bg-rose-950/50 flex items-center justify-center"
              title="Remove unit"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-center text-xs text-slate-500 py-6">
            {draft.units.length ? 'No units match your search.' : 'No units yet. Add one or import a CSV.'}
          </p>
        )}
      </div>
    </div>
  );
};

const ListEditor: React.FC<{
  title: string;
  placeholder: string;
  items: string[];
  onChange: (items: string[]) => void;
}> = ({ title, placeholder, items, onChange }) => {
  const [newItem, setNewItem] = useState('');
  const addItem = () => {
    const v = newItem.trim();
    if (!v || items.includes(v)) return;
    onChange([...items, v]);
    setNewItem('');
  };
  return (
    <div>
      <label className={labelClass}>{title}</label>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={item}
              onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
              className={inputClass}
            />
            <button
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-300 hover:bg-rose-950/50"
              title="Remove"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem())}
            placeholder={placeholder}
            className={inputClass}
          />
          <button
            onClick={addItem}
            className="px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200"
            title="Add"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const GateSection: React.FC<SectionProps> = ({ draft, setDraft }) => (
  <div className="grid sm:grid-cols-2 gap-6">
    <ListEditor
      title="Gates / lanes"
      placeholder="e.g. Main Gate - Inbound Lane 1"
      items={draft.gateLanes}
      onChange={(gateLanes) => setDraft((d) => ({ ...d, gateLanes }))}
    />
    <ListEditor
      title="Security officers"
      placeholder="e.g. Officer S. Ndlovu"
      items={draft.securityOfficers}
      onChange={(securityOfficers) => setDraft((d) => ({ ...d, securityOfficers }))}
    />
    <p className="sm:col-span-2 text-[11px] text-slate-500">
      Guards choose their gate and name on the check-in screen. Each device remembers its last choice.
    </p>
  </div>
);

const SecuritySection: React.FC<{ onUnauthorized: () => void }> = ({ onUnauthorized }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    if (next.length < 6) return setStatus({ type: 'error', text: 'New password must be at least 6 characters' });
    if (next !== confirm) return setStatus({ type: 'error', text: 'New passwords do not match' });
    setBusy(true);
    try {
      await changeAdminPassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      setStatus({ type: 'ok', text: 'Password changed. Other admin sessions were signed out.' });
    } catch (err: any) {
      if (err.status === 401 && err.message !== 'Current password is incorrect') onUnauthorized();
      setStatus({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-sm space-y-4">
      <div>
        <label className={labelClass}>Current password</label>
        <input
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>New password</label>
        <input
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Confirm new password</label>
        <input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputClass}
        />
      </div>
      {status && (
        <p className={`text-xs ${status.type === 'ok' ? 'text-emerald-400' : 'text-rose-400'}`}>{status.text}</p>
      )}
      <button
        type="submit"
        disabled={busy || !current || !next}
        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50"
      >
        {busy ? 'Saving…' : 'Change password'}
      </button>
    </form>
  );
};
