import fs from 'fs';
import path from 'path';
import { VisitorEntry, ComplexStats, ComplexUnit } from '../types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'visitors.json');

// Directory of residential complex units for Silver Oaks Residential Estate
export const COMPLEX_UNITS: ComplexUnit[] = [
  { unitNumber: 'Unit 1', residentName: 'Dr. Johan van Zyl', residentPhone: '+27 82 441 9021', block: 'Block A' },
  { unitNumber: 'Unit 2', residentName: 'Thabo & Naledi Mokoena', residentPhone: '+27 83 229 1145', block: 'Block A' },
  { unitNumber: 'Unit 4', residentName: 'Sarah Jenkins', residentPhone: '+27 71 889 0042', block: 'Block A' },
  { unitNumber: 'Unit 7', residentName: 'Marius Craill', residentPhone: '+27 82 555 3821', block: 'Block A' },
  { unitNumber: 'Unit 12', residentName: 'Kagiso Sithole', residentPhone: '+27 84 901 7733', block: 'Block B' },
  { unitNumber: 'Unit 15', residentName: 'Elena Rostova', residentPhone: '+27 79 123 4488', block: 'Block B' },
  { unitNumber: 'Unit 18', residentName: 'David & Liezel Naidoo', residentPhone: '+27 82 776 2200', block: 'Block B' },
  { unitNumber: 'Unit 24', residentName: 'Pravin Chetty', residentPhone: '+27 83 456 9912', block: 'Block C' },
  { unitNumber: 'Unit 31', residentName: 'Zandile Zulu', residentPhone: '+27 72 341 8820', block: 'Block C' },
  { unitNumber: 'Unit 42', residentName: 'Francois & Anke du Plessis', residentPhone: '+27 82 990 1456', block: 'Block D' },
  { unitNumber: 'Unit 45', residentName: 'Estate Management Office', residentPhone: '+27 11 400 9000', block: 'Clubhouse' },
];

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getInitialSeedVisitors(): VisitorEntry[] {
  const now = Date.now();
  const oneHourAgo = now - 65 * 60 * 1000;
  const twoHoursAgo = now - 130 * 60 * 1000;
  const threeHoursAgo = now - 195 * 60 * 1000;
  const fourHoursAgo = now - 240 * 60 * 1000;

  return [
    {
      id: 'vis_seed_01',
      passNumber: 'VIS-2609-001',
      entryTime: twoHoursAgo,
      entryTimeFormatted: new Date(twoHoursAgo).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      exitTime: null,
      status: 'ON_SITE',
      vehicle: {
        licenceNumber: 'CA 492-311',
        make: 'TOYOTA',
        seriesName: 'HILUX 2.8 GD-6',
        colour: 'WHITE',
        vin: 'AFA111A00K1234567',
        vehicleCategory: 'LIGHT MOTOR VEHICLE',
        expiryDate: '2026-11-30',
        expiryStatus: 'valid',
        confidence: 0.98,
      },
      driver: {
        fullName: 'Sipho Nhlanhla Dlamini',
        initials: 'S N',
        surname: 'Dlamini',
        idNumber: '8805145023087',
        licenseNumber: 'DL49201948',
        licenseCodes: 'Code EB',
        licenseExpiryDate: '2027-04-15',
        gender: 'M',
        format: 'BARCODE_PDF417',
      },
      destination: {
        complexName: 'Silver Oaks Residential Estate',
        unitVisited: 'Unit 7',
        residentName: 'Marius Craill',
        residentPhone: '+27 82 555 3821',
        purpose: 'RESIDENT_VISIT',
        passengersCount: 2,
        gateLane: 'Main Gate - Inbound Lane 1',
        securityOfficer: 'Officer S. Ndlovu',
        notes: 'Family visit for weekend braai',
      },
      qrPassCode: 'VIS-2609-001|CA492311|UNIT7',
    },
    {
      id: 'vis_seed_02',
      passNumber: 'VIS-2609-002',
      entryTime: oneHourAgo,
      entryTimeFormatted: new Date(oneHourAgo).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      exitTime: null,
      status: 'ON_SITE',
      vehicle: {
        licenceNumber: 'JM 44 TR GP',
        make: 'VOLKSWAGEN',
        seriesName: 'CADDY 2.0 TDI',
        colour: 'YELLOW',
        vin: 'WV2ZZZ2KZCX091244',
        vehicleCategory: 'LIGHT DELIVERY VEHICLE',
        expiryDate: '2027-01-31',
        expiryStatus: 'valid',
        confidence: 0.95,
      },
      driver: {
        fullName: 'Bongani Kenneth Sithole',
        initials: 'B K',
        surname: 'Sithole',
        idNumber: '9208225890081',
        licenseNumber: 'DL88129031',
        licenseCodes: 'Code B',
        licenseExpiryDate: '2028-09-10',
        gender: 'M',
        format: 'OCR_VISION',
      },
      destination: {
        complexName: 'Silver Oaks Residential Estate',
        unitVisited: 'Unit 12',
        residentName: 'Kagiso Sithole',
        residentPhone: '+27 84 901 7733',
        purpose: 'DELIVERY',
        passengersCount: 1,
        gateLane: 'North Visitors Gate',
        securityOfficer: 'Officer S. Ndlovu',
        notes: 'DHL Express courier package delivery',
      },
      qrPassCode: 'VIS-2609-002|JM44TRGP|UNIT12',
    },
    {
      id: 'vis_seed_03',
      passNumber: 'VIS-2609-003',
      entryTime: threeHoursAgo,
      entryTimeFormatted: new Date(threeHoursAgo).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      exitTime: null,
      status: 'ON_SITE',
      vehicle: {
        licenceNumber: 'ND 881 204',
        make: 'FORD',
        seriesName: 'RANGER 2.2 TDCi',
        colour: 'WHITE',
        vin: 'AFABXXMJ2BK901844',
        vehicleCategory: 'BAKKIE / PICK-UP',
        expiryDate: '2026-08-31',
        expiryStatus: 'valid',
        confidence: 0.96,
      },
      driver: {
        fullName: 'Pieter Willem Coetzee',
        initials: 'P W',
        surname: 'Coetzee',
        idNumber: '7911045091084',
        licenseNumber: 'DL33901928',
        licenseCodes: 'Code EB',
        licenseExpiryDate: '2026-12-05',
        gender: 'M',
        format: 'BARCODE_PDF417',
      },
      destination: {
        complexName: 'Silver Oaks Residential Estate',
        unitVisited: 'Unit 24',
        residentName: 'Pravin Chetty',
        residentPhone: '+27 83 456 9912',
        purpose: 'CONTRACTOR',
        passengersCount: 3,
        gateLane: 'Contractors Gate Lane 2',
        securityOfficer: 'Officer K. Khanyile',
        notes: 'Solar inverter maintenance & electrical installation',
      },
      qrPassCode: 'VIS-2609-003|ND881204|UNIT24',
    },
    {
      id: 'vis_seed_04',
      passNumber: 'VIS-2609-004',
      entryTime: fourHoursAgo,
      entryTimeFormatted: new Date(fourHoursAgo).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      exitTime: fourHoursAgo + 42 * 60 * 1000,
      exitTimeFormatted: new Date(fourHoursAgo + 42 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'CHECKED_OUT',
      durationMinutes: 42,
      vehicle: {
        licenceNumber: 'CY 332-901',
        make: 'HYUNDAI',
        seriesName: 'I20 1.2 FLUID',
        colour: 'SILVER',
        vin: 'MALAA51BLFM123891',
        vehicleCategory: 'LIGHT MOTOR VEHICLE',
        expiryDate: '2027-03-31',
        expiryStatus: 'valid',
        confidence: 0.99,
      },
      driver: {
        fullName: 'Amina Fatima Patel',
        initials: 'A F',
        surname: 'Patel',
        idNumber: '9403190123089',
        licenseNumber: 'DL77410291',
        licenseCodes: 'Code B',
        licenseExpiryDate: '2028-02-28',
        gender: 'F',
        format: 'OCR_VISION',
      },
      destination: {
        complexName: 'Silver Oaks Residential Estate',
        unitVisited: 'Unit 4',
        residentName: 'Sarah Jenkins',
        residentPhone: '+27 71 889 0042',
        purpose: 'TAXI_RIDESHARE',
        passengersCount: 1,
        gateLane: 'Main Gate - Inbound Lane 1',
        securityOfficer: 'Officer S. Ndlovu',
        notes: 'Uber passenger drop-off completed',
      },
      qrPassCode: 'VIS-2609-004|CY332901|UNIT4',
    },
  ];
}

class VisitorDatabase {
  private visitors: VisitorEntry[] = [];
  private isLoaded = false;

  constructor() {
    this.load();
  }

  private load(): void {
    ensureDataDir();
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.visitors = JSON.parse(raw);
      } else {
        // Seed initial visitors
        this.visitors = getInitialSeedVisitors();
        this.save();
      }
      this.isLoaded = true;
    } catch (err) {
      console.error('Error loading visitors database from file:', err);
      this.visitors = getInitialSeedVisitors();
    }
  }

  private save(): void {
    ensureDataDir();
    try {
      const json = JSON.stringify(this.visitors, null, 2);
      fs.writeFileSync(DB_FILE, json, 'utf-8');
    } catch (err) {
      console.error('Error saving visitors database to file:', err);
    }
  }

  public getAllVisitors(search?: string, status?: string): VisitorEntry[] {
    let list = [...this.visitors];

    if (status && status !== 'all') {
      list = list.filter((v) => v.status === status);
    }

    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (v) =>
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
    }

    // Sort by entryTime descending (newest first)
    list.sort((a, b) => b.entryTime - a.entryTime);
    return list;
  }

  public getVisitorById(id: string): VisitorEntry | undefined {
    return this.visitors.find((v) => v.id === id);
  }

  public createVisitor(data: {
    vehicle: VisitorEntry['vehicle'];
    driver: VisitorEntry['driver'];
    destination: VisitorEntry['destination'];
  }): VisitorEntry {
    const entryTime = Date.now();
    const dateObj = new Date(entryTime);
    const dayStr = String(dateObj.getDate()).padStart(2, '0');
    const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
    const randomSeq = Math.floor(100 + Math.random() * 900);
    const passNumber = `VIS-${dayStr}${monthStr}-${randomSeq}`;
    const id = `vis_${entryTime}_${Math.random().toString(36).substring(2, 7)}`;

    const newVisitor: VisitorEntry = {
      id,
      passNumber,
      entryTime,
      entryTimeFormatted: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      exitTime: null,
      status: 'ON_SITE',
      vehicle: data.vehicle,
      driver: data.driver,
      destination: data.destination,
      qrPassCode: `${passNumber}|${data.vehicle.licenceNumber.replace(/\s+/g, '')}|${data.destination.unitVisited.replace(/\s+/g, '')}`,
    };

    this.visitors.unshift(newVisitor);
    this.save();
    return newVisitor;
  }

  public checkoutVisitor(id: string): VisitorEntry | null {
    const item = this.visitors.find((v) => v.id === id);
    if (!item) return null;

    const exitTime = Date.now();
    item.exitTime = exitTime;
    item.exitTimeFormatted = new Date(exitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    item.status = 'CHECKED_OUT';
    item.durationMinutes = Math.max(1, Math.round((exitTime - item.entryTime) / 60000));

    this.save();
    return item;
  }

  public toggleFlagVisitor(id: string, reason?: string): VisitorEntry | null {
    const item = this.visitors.find((v) => v.id === id);
    if (!item) return null;

    item.isFlagged = !item.isFlagged;
    item.flagReason = item.isFlagged ? reason || 'Security watch alert noted by gate officer' : undefined;
    if (item.isFlagged) {
      item.status = 'FLAGGED';
    } else {
      item.status = item.exitTime ? 'CHECKED_OUT' : 'ON_SITE';
    }

    this.save();
    return item;
  }

  public deleteVisitor(id: string): boolean {
    const idx = this.visitors.findIndex((v) => v.id === id);
    if (idx === -1) return false;
    this.visitors.splice(idx, 1);
    this.save();
    return true;
  }

  public getStats(): ComplexStats {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const todayVisitors = this.visitors.filter((v) => v.entryTime >= startOfDay);
    const onSite = this.visitors.filter((v) => v.status === 'ON_SITE');
    const checkedOutToday = todayVisitors.filter((v) => v.status === 'CHECKED_OUT');

    let totalDuration = 0;
    let durationCount = 0;
    for (const v of checkedOutToday) {
      if (v.durationMinutes) {
        totalDuration += v.durationMinutes;
        durationCount++;
      }
    }

    const averageDurationMinutes = durationCount > 0 ? Math.round(totalDuration / durationCount) : 35;
    const deliveriesToday = todayVisitors.filter((v) => v.destination.purpose === 'DELIVERY').length;
    const contractorsToday = todayVisitors.filter((v) => v.destination.purpose === 'CONTRACTOR').length;

    return {
      totalToday: todayVisitors.length,
      currentlyOnSite: onSite.length,
      checkedOutToday: checkedOutToday.length,
      averageDurationMinutes,
      deliveriesToday,
      contractorsToday,
    };
  }

  public getUnits(): ComplexUnit[] {
    return COMPLEX_UNITS;
  }
}

export const visitorDb = new VisitorDatabase();
