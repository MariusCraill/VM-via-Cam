import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { ComplexUnit, SiteSettings } from '../types';
import { COMPLEX_UNITS } from './visitorDb';

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_LOGO_CHARS = 700_000; // ~500 KB image as a data URL
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 8;

interface StoredSettings extends SiteSettings {
  admin?: { salt: string; hash: string };
}

const DEFAULT_SETTINGS: SiteSettings = {
  siteName: 'GatePass VMS',
  tagline: 'Complex Visitor Access Control & Database',
  complexName: 'Silver Oaks Residential Estate',
  complexShortName: 'Silver Oaks Estate',
  logoDataUrl: null,
  gateLanes: ['Main Gate - Inbound Lane 1', 'North Visitors Gate', 'Contractors Gate Lane 2'],
  securityOfficers: ['Officer S. Ndlovu', 'Officer K. Khanyile'],
  units: COMPLEX_UNITS,
};

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function cleanString(value: unknown, max = 200): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function cleanList(value: unknown, maxItems = 50): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const item of value) {
    const s = cleanString(item, 120);
    if (s) seen.add(s);
    if (seen.size >= maxItems) break;
  }
  return [...seen];
}

export class SettingsValidationError extends Error {}

class SettingsDatabase {
  private settings: StoredSettings;
  private sessions = new Map<string, number>();
  private loginAttempts = new Map<string, { count: number; first: number }>();

  constructor() {
    this.settings = this.load();
    // ADMIN_PASSWORD (AI Studio secret / env var) sets or resets the admin password on start.
    const envPassword = process.env.ADMIN_PASSWORD;
    if (envPassword && envPassword.length >= 6) {
      this.setPassword(envPassword);
    }
  }

  private load(): StoredSettings {
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        const raw = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
        return { ...DEFAULT_SETTINGS, ...raw };
      }
    } catch (err) {
      console.error('Error loading settings file, using defaults:', err);
    }
    return { ...DEFAULT_SETTINGS };
  }

  private save(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      const tmp = `${SETTINGS_FILE}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.settings, null, 2), 'utf-8');
      fs.renameSync(tmp, SETTINGS_FILE);
    } catch (err) {
      console.error('Error saving settings file:', err);
    }
  }

  /** Settings safe to send to any client (no password hash). */
  getPublic(): SiteSettings {
    const { admin: _admin, ...rest } = this.settings;
    return rest;
  }

  getUnits(): ComplexUnit[] {
    return this.settings.units;
  }

  // ---------------------------------------------------------------- auth

  isPasswordSet(): boolean {
    return !!this.settings.admin;
  }

  setPassword(password: string): void {
    const salt = crypto.randomBytes(16).toString('hex');
    this.settings.admin = { salt, hash: hashPassword(password, salt) };
    this.sessions.clear();
    this.save();
  }

  verifyPassword(password: string): boolean {
    const admin = this.settings.admin;
    if (!admin || typeof password !== 'string') return false;
    const expected = Buffer.from(admin.hash, 'hex');
    const actual = Buffer.from(hashPassword(password, admin.salt), 'hex');
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  }

  /** Returns false when this client has made too many failed attempts recently. */
  canAttemptLogin(clientKey: string): boolean {
    const entry = this.loginAttempts.get(clientKey);
    if (!entry) return true;
    if (Date.now() - entry.first > LOGIN_WINDOW_MS) {
      this.loginAttempts.delete(clientKey);
      return true;
    }
    return entry.count < MAX_LOGIN_ATTEMPTS;
  }

  recordFailedLogin(clientKey: string): void {
    const entry = this.loginAttempts.get(clientKey);
    if (!entry || Date.now() - entry.first > LOGIN_WINDOW_MS) {
      this.loginAttempts.set(clientKey, { count: 1, first: Date.now() });
    } else {
      entry.count++;
    }
  }

  clearFailedLogins(clientKey: string): void {
    this.loginAttempts.delete(clientKey);
  }

  createSession(): string {
    const token = crypto.randomBytes(32).toString('hex');
    this.sessions.set(token, Date.now() + SESSION_TTL_MS);
    return token;
  }

  isValidSession(token: string | undefined): boolean {
    if (!token) return false;
    const expires = this.sessions.get(token);
    if (!expires) return false;
    if (expires < Date.now()) {
      this.sessions.delete(token);
      return false;
    }
    return true;
  }

  endSession(token: string | undefined): void {
    if (token) this.sessions.delete(token);
  }

  // ---------------------------------------------------------------- updates

  updateSettings(input: Partial<SiteSettings>): SiteSettings {
    const next = { ...this.settings };

    if (input.siteName !== undefined) {
      next.siteName = cleanString(input.siteName, 60) || DEFAULT_SETTINGS.siteName;
    }
    if (input.tagline !== undefined) next.tagline = cleanString(input.tagline, 120);
    if (input.complexName !== undefined) {
      const name = cleanString(input.complexName, 100);
      if (!name) throw new SettingsValidationError('Complex name is required');
      next.complexName = name;
    }
    if (input.complexShortName !== undefined) next.complexShortName = cleanString(input.complexShortName, 40);

    if (input.logoDataUrl !== undefined) {
      if (input.logoDataUrl === null || input.logoDataUrl === '') {
        next.logoDataUrl = null;
      } else if (
        typeof input.logoDataUrl === 'string' &&
        /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(input.logoDataUrl)
      ) {
        if (input.logoDataUrl.length > MAX_LOGO_CHARS) {
          throw new SettingsValidationError('Logo is too large (max ~500 KB)');
        }
        next.logoDataUrl = input.logoDataUrl;
      } else {
        throw new SettingsValidationError('Logo must be a PNG, JPEG, WebP or GIF image');
      }
    }

    if (input.gateLanes !== undefined) {
      const lanes = cleanList(input.gateLanes);
      if (!lanes.length) throw new SettingsValidationError('Add at least one gate / lane');
      next.gateLanes = lanes;
    }
    if (input.securityOfficers !== undefined) {
      const officers = cleanList(input.securityOfficers);
      if (!officers.length) throw new SettingsValidationError('Add at least one security officer');
      next.securityOfficers = officers;
    }

    if (input.units !== undefined) {
      next.units = this.validateUnits(input.units);
    }

    this.settings = next;
    this.save();
    return this.getPublic();
  }

  private validateUnits(input: unknown): ComplexUnit[] {
    if (!Array.isArray(input)) throw new SettingsValidationError('Units must be a list');
    if (input.length > 2000) throw new SettingsValidationError('Too many units (max 2000)');
    const seen = new Set<string>();
    const units: ComplexUnit[] = [];
    for (const raw of input) {
      const unitNumber = cleanString(raw?.unitNumber, 40);
      if (!unitNumber) throw new SettingsValidationError('Every unit needs a unit number');
      const key = unitNumber.toLowerCase();
      if (seen.has(key)) throw new SettingsValidationError(`Duplicate unit: ${unitNumber}`);
      seen.add(key);
      units.push({
        unitNumber,
        residentName: cleanString(raw?.residentName, 100),
        residentPhone: cleanString(raw?.residentPhone, 40),
        block: cleanString(raw?.block, 40) || undefined,
        intercomCode: cleanString(raw?.intercomCode, 20) || undefined,
      });
    }
    return units;
  }
}

export const settingsDb = new SettingsDatabase();
