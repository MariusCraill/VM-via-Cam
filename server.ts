import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { visitorDb } from './src/server/visitorDb';
import { settingsDb, SettingsValidationError } from './src/server/settingsDb';

const PORT = 3000;

// Lazy initialize Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  // Behind Cloud Run / AI Studio proxy: use the client IP for login rate limiting.
  app.set('trust proxy', 1);

  app.use(express.json({ limit: '15mb' }));

  // ------------------------------------------------------------------ admin auth
  const bearerToken = (req: express.Request): string | undefined => {
    const header = req.headers.authorization || '';
    return header.startsWith('Bearer ') ? header.slice(7) : undefined;
  };

  const requireAdmin: express.RequestHandler = (req, res, next) => {
    if (!settingsDb.isValidSession(bearerToken(req))) {
      return res.status(401).json({ error: 'Admin login required' });
    }
    next();
  };

  // Public site settings (branding, units/residents, gate lanes, officers)
  app.get('/api/settings', (req, res) => {
    res.json(settingsDb.getPublic());
  });

  app.get('/api/admin/status', (req, res) => {
    res.json({
      passwordSet: settingsDb.isPasswordSet(),
      authenticated: settingsDb.isValidSession(bearerToken(req)),
    });
  });

  // First-run only: create the admin password when none exists yet.
  app.post('/api/admin/setup', (req, res) => {
    if (settingsDb.isPasswordSet()) {
      return res.status(409).json({ error: 'Admin password is already set' });
    }
    const password = req.body?.password;
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    settingsDb.setPassword(password);
    return res.json({ success: true, token: settingsDb.createSession() });
  });

  app.post('/api/admin/login', (req, res) => {
    const clientKey = req.ip || 'unknown';
    if (!settingsDb.canAttemptLogin(clientKey)) {
      return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
    }
    if (!settingsDb.verifyPassword(req.body?.password)) {
      settingsDb.recordFailedLogin(clientKey);
      return res.status(401).json({ error: 'Incorrect password' });
    }
    settingsDb.clearFailedLogins(clientKey);
    return res.json({ success: true, token: settingsDb.createSession() });
  });

  app.post('/api/admin/logout', (req, res) => {
    settingsDb.endSession(bearerToken(req));
    res.json({ success: true });
  });

  app.post('/api/admin/password', requireAdmin, (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!settingsDb.verifyPassword(currentPassword)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    settingsDb.setPassword(newPassword); // also signs out all sessions
    return res.json({ success: true, token: settingsDb.createSession() });
  });

  app.put('/api/admin/settings', requireAdmin, (req, res) => {
    try {
      return res.json({ success: true, settings: settingsDb.updateSettings(req.body || {}) });
    } catch (err: any) {
      if (err instanceof SettingsValidationError) {
        return res.status(400).json({ error: err.message });
      }
      console.error('Settings update failed:', err);
      return res.status(500).json({ error: 'Failed to save settings' });
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      timestamp: Date.now(),
    });
  });

  // Server-side AI Vehicle & VIN OCR extraction endpoint
  app.post('/api/scan-license-disc', async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'imageBase64 is required' });
      }

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY is not configured on server',
        });
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      const mimeType = imageBase64.startsWith('data:image/png')
        ? 'image/png'
        : imageBase64.startsWith('data:image/webp')
        ? 'image/webp'
        : 'image/jpeg';

      const prompt = `You are an expert South African and international vehicle documentation vision scanner.
Task: Inspect this photo of a vehicle license disc (e.g., circular windscreen MVL/MVLX disc) or vehicle QR/PDF417 barcode.
Carefully read and extract every field present:
1. "licenceNumber": Vehicle registration plate / licence number (e.g. "CA 123-456", "JM 44 TR GP", "ND 789 012", etc. - this is the license plate number).
2. "vehicleRegisterNumber": Vehicle register number (usually 10-12 digits)
3. "controlNumber": Licence disc / control number (e.g. "A12345678" or similar)
4. "vin": 17-character VIN / chassis number (no I, O, Q)
5. "engineNumber": Engine serial number stamped on the vehicle engine (e.g. "1GD-FTV123456", "CWV819230"). IMPORTANT: DO NOT set engineNumber to the licence plate / registration number!
6. "make": Vehicle make (e.g. TOYOTA, VOLKSWAGEN, FORD, BMW, NISSAN, etc.)
7. "seriesName": Series name / model (e.g. HILUX 2.8 GD-6, POLO VIVO, RANGER, 320I, etc.)
8. "colour": Vehicle colour (e.g. WHITE, SILVER, GREY, BLACK, BLUE, RED)
9. "vehicleCategory": Vehicle description (e.g. LIGHT MOTOR VEHICLE, STATION WAGON, BAKKIE, DOUBLE CAB, etc.)
10. "tare": Tare weight in kg as number
11. "gvm": Gross vehicle mass in kg as number
12. "expiryDate": Expiration date in format YYYY-MM-DD
13. "rawBarcode": Any barcode payload text if readable
14. "confidence": Score between 0.0 and 1.0

CRITICAL RULES:
- "licenceNumber" is the licence plate / registration number (e.g. "CA 123-456", "JM 77 TR GP").
- Under NO circumstance should "engineNumber" be equal to or contain the licence plate number.
Return JSON ONLY with these keys. If a field cannot be seen, set it to null.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: cleanBase64,
                },
              },
              { text: prompt },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const rawText = response.text || '{}';
      let parsed: any = {};
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = {};
      }

      // Safeguard against engineNumber showing the license plate number
      if (parsed.engineNumber) {
        const eng = String(parsed.engineNumber).trim();
        const lic = String(parsed.licenceNumber || '').trim();
        const isPlateLike = /^[A-Z]{1,3}\s*[-–]?\s*\d{2,6}(\s*[A-Z]{0,2})?$/i.test(eng) ||
          /^[A-Z]{2,3}\s*\d{2,4}\s*[A-Z]{0,2}\s*(GP|EC|FS|MP|NC|NW|LP|ZN|WP)$/i.test(eng);

        if (eng === lic || isPlateLike) {
          if (!parsed.licenceNumber || parsed.licenceNumber === 'UNREGISTERED') {
            parsed.licenceNumber = eng;
          }
          parsed.engineNumber = null;
        }
      }

      const hasDiscData = !!(parsed.licenceNumber || parsed.vin || parsed.make || parsed.controlNumber);

      return res.json({
        success: hasDiscData,
        data: parsed,
      });
    } catch (err: any) {
      console.error('API /api/scan-license-disc error:', err);
      return res.status(500).json({ error: err.message || 'Scan failed' });
    }
  });

  // Server-side AI Vehicle & VIN OCR extraction endpoint
  app.post('/api/scan-vin', async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'imageBase64 is required' });
      }

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY is not configured on server',
          needsClientOcr: true,
        });
      }

      // Clean base64 header if present
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      const mimeType = imageBase64.startsWith('data:image/png')
        ? 'image/png'
        : imageBase64.startsWith('data:image/webp')
        ? 'image/webp'
        : 'image/jpeg';

      const prompt = `You are a specialized automotive computer vision expert.
Task: Inspect this photo of a vehicle, vehicle license disc (e.g. South African MVLX windscreen disc), license plate / registration plate, or VIN plate/sticker/barcode.
Extract all available vehicle details:
1. "vin": The 17-character Vehicle Identification Number. Standard VINs DO NOT contain I, O, or Q (convert to 1 or 0 if appropriate). Must be uppercase without spaces.
2. "regNumber": Vehicle registration number / licence plate / licence number (e.g., "CA 123-456", "BB 12 CC GP", "ND 789 012", or standard number plate format).
3. "make": Vehicle manufacturer/make (e.g., Volkswagen, Toyota, Ford, BMW, Hyundai, Mercedes-Benz, Nissan, etc.).
4. "model": Vehicle model/series (e.g., Polo, Hilux, Ranger, 320i, i20, Golf, Corolla, etc.).
5. "year": Model year or registration year as a 4-digit number or string.
6. "engineNumber": Engine number if visible on licence disc or documents.
7. "bodyClass": Body type or description (e.g., Hatchback, Double Cab Bakkie, Sedan, SUV, Station Wagon).
8. "color": Vehicle color if noted on disc or visible in image.
9. "registerNumber": Vehicle register number if seen on vehicle licence disc.
10. "expiryDate": Licence expiry date if on disc (e.g. YYYY-MM-DD).
11. "detectedType": "license_disc" | "license_plate" | "vin_barcode" | "vin_stamped" | "general_vehicle"
12. "confidence": A score between 0.0 and 1.0.
13. "locationFound": Brief string description (e.g., "Windscreen Licence Disc", "Licence Plate", "Windshield VIN", "Door Jamb B-Pillar", "Firewall").
14. "notes": Brief helpful observation.

Return JSON ONLY matching the keys above. If a field is not found, omit it or set it to null.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: cleanBase64,
                },
              },
              { text: prompt },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const rawText = response.text || '{}';
      let parsed: any = {
        vin: null,
        regNumber: null,
        make: null,
        model: null,
        year: null,
        engineNumber: null,
        bodyClass: null,
        color: null,
        registerNumber: null,
        expiryDate: null,
        detectedType: 'general_vehicle',
        confidence: 0,
        locationFound: '',
        notes: '',
      };

      try {
        parsed = JSON.parse(rawText);
      } catch {
        // Fallback regex for 17-character VIN
        const match = rawText.match(/[A-HJ-NPR-Z0-9]{17}/);
        if (match) {
          parsed.vin = match[0];
          parsed.confidence = 0.85;
        }
      }

      if (parsed.vin) {
        parsed.vin = String(parsed.vin).toUpperCase().replace(/[\s-]/g, '').trim();
      }
      if (parsed.regNumber) {
        parsed.regNumber = String(parsed.regNumber).toUpperCase().trim();
      }

      const hasVehicleData = !!(parsed.vin || parsed.regNumber || (parsed.make && parsed.model));

      return res.json({
        success: hasVehicleData,
        data: parsed,
      });
    } catch (err: any) {
      console.error('API /api/scan-vin error:', err);
      return res.status(500).json({
        error: err.message || 'Failed to scan image',
      });
    }
  });

  // Vehicle VIN & Specifications decode endpoint (NHTSA VPIC API + Gemini automotive database fallback)
  app.get('/api/decode-vin/:vin', async (req, res) => {
    const rawVin = req.params.vin || '';
    const cleanVin = rawVin.toUpperCase().replace(/[\s-]/g, '').trim();

    if (!cleanVin || cleanVin.length !== 17) {
      return res.status(400).json({ error: 'Invalid VIN length. Expected 17 characters.' });
    }

    // Attempt 1: NHTSA VPIC API
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const nhtsaUrl = `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${encodeURIComponent(cleanVin)}?format=json`;
      const response = await fetch(nhtsaUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const json: any = await response.json();
        const item = json?.Results?.[0];
        if (item && item.Make && item.Make.trim() !== '') {
          return res.json({
            vin: cleanVin,
            make: item.Make || undefined,
            model: item.Model || undefined,
            year: item.ModelYear || undefined,
            vehicleType: item.VehicleType || undefined,
            bodyClass: item.BodyClass || undefined,
            engineCylinders: item.EngineCylinders || undefined,
            displacementL: item.DisplacementL ? `${item.DisplacementL}L` : undefined,
            fuelType: item.FuelTypePrimary || undefined,
            driveType: item.DriveType || undefined,
            plantCountry: item.PlantCountry || undefined,
            manufacturer: item.Manufacturer || undefined,
            source: 'nhtsa',
          });
        }
      }
    } catch {
      // Continue to Gemini fallback
    }

    // Attempt 2: If NHTSA doesn't have the make/model (common for South African built vehicles like VW AAV, Toyota AFA, Ford AFV, BMW ACV, or foreign specs), use Gemini AI to decode
    const ai = getGeminiClient();
    if (ai) {
      try {
        const prompt = `Decode this 17-character vehicle VIN number: "${cleanVin}".
Provide precise automotive specifications based on the WMI, VDS, and VIS pattern (support South African, European, Asian, and American manufacturers).
Return JSON with keys:
- "make": string (e.g. "Toyota", "Volkswagen", "BMW", "Ford", "Mercedes-Benz")
- "model": string (e.g. "Hilux", "Polo", "320i", "Ranger", "C-Class")
- "year": number or string (e.g. 2018)
- "vehicleType": string (e.g. "Passenger Car", "Truck / L.D.V.", "SUV")
- "bodyClass": string (e.g. "Hatchback", "Double Cab", "Sedan", "SUV")
- "displacementL": string (e.g. "2.0L", "2.8L", "1.4L")
- "engineCylinders": number or string
- "fuelType": string (e.g. "Diesel", "Petrol", "Hybrid")
- "driveType": string (e.g. "4x4", "4x2", "FWD", "RWD")
- "plantCountry": string (e.g. "South Africa", "Germany", "Japan", "United States")
- "manufacturer": string`;

        const aiResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        const text = aiResponse.text || '{}';
        const parsed = JSON.parse(text);
        if (parsed.make) {
          return res.json({
            vin: cleanVin,
            ...parsed,
            source: 'gemini_ai',
          });
        }
      } catch (geminiErr) {
        console.warn('Gemini VIN decode fallback error:', geminiErr);
      }
    }

    // Fallback response with basic vehicle details
    return res.json({
      vin: cleanVin,
      source: 'iso_decoder',
    });
  });

  // Vehicle lookup by Registration Number and/or VIN
  app.post('/api/lookup-vehicle', async (req, res) => {
    try {
      const { vin, regNumber } = req.body;
      if (!vin && !regNumber) {
        return res.status(400).json({ error: 'vin or regNumber is required' });
      }

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(503).json({ error: 'Gemini client unavailable' });
      }

      const prompt = `Vehicle lookup query:
VIN: ${vin || 'Unknown'}
Registration Number: ${regNumber || 'Unknown'}

Please provide vehicle specifications for this vehicle.
Return JSON with keys:
- "make": Vehicle make
- "model": Vehicle model
- "year": Year
- "bodyClass": Body type
- "displacementL": Engine capacity
- "fuelType": Fuel type
- "driveType": Drive type
- "plantCountry": Country of origin/assembly
- "notes": Short summary`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const data = JSON.parse(response.text || '{}');
      return res.json({
        success: true,
        data: {
          vin: vin || undefined,
          regNumber: regNumber || undefined,
          ...data,
          source: 'gemini_ai',
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Lookup failed' });
    }
  });

  // ==========================================
  // COMPLEX VISITOR MANAGEMENT SYSTEM & DB API
  // ==========================================

  // OCR Scanner endpoint for Driver's License cards or ID Cards / Smart ID
  const scanIdentityDocument = async (req: express.Request, res: express.Response, scanType: string) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'imageBase64 is required' });
      }

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on server' });
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      const mimeType = imageBase64.startsWith('data:image/png')
        ? 'image/png'
        : imageBase64.startsWith('data:image/webp')
        ? 'image/webp'
        : 'image/jpeg';

      const isIdCardMode = scanType === 'id_card';

      const prompt = isIdCardMode
        ? `You are an expert identity document OCR vision specialist.
Task: Inspect this photo of an Identity Card (e.g. South African Smart ID Card, Green ID Book, or National ID Card).
Carefully read and extract the person's identity information:
1. "fullName": Full name (Given names + Surname, e.g. "Marius Craill", "Thabo Goodwill Mokoena", "Zanele Nomvula Khumalo")
2. "surname": Family name / Surname
3. "givenNames": First name(s) / Given names
4. "initials": Initials
5. "idNumber": The 13-digit South African ID number (vital; extract all 13 digits)
6. "dateOfBirth": Date of birth in YYYY-MM-DD format (or derive from first 6 digits of RSA ID)
7. "gender": "M" or "F"
8. "citizenship": Citizenship / nationality status (e.g. "South African Citizen (RSA)")
9. "idCardNumber": Document / Smart ID card number printed on card (e.g. "ZA-12345678" or number above barcode)
10. "countryOfIssue": Country of issue (e.g. "South Africa")
11. "confidence": Confidence score between 0.0 and 1.0

Return valid JSON ONLY with these keys. If any field is unreadable, set it to null.`
        : `You are an expert automotive and driver's licence OCR vision specialist.
Task: Inspect this photo of a driver's license (South African driving licence card, or international driver license).
Read the PRINTED text on the card. Note: the PDF417 barcode on the back of a South African licence card is encrypted and cannot be read visually, so ignore it; if only the back is visible, extract what is printed there and leave the rest null.
South African card layout hints: surname and initials at the top, ID number (13 digits), licence number (12 characters, e.g. "1234567890AB"), "Valid" from - to dates, codes (A1, A, B, EB, C1, C, EC1, EC), and a date for each code.
Carefully read and extract the driver information:
1. "fullName": Full name of the driver (e.g. "Sipho Nhlanhla Dlamini", "Amanda van der Merwe")
2. "surname": Driver surname / family name
3. "initials": Initials (e.g. "S N")
4. "idNumber": The 13-digit South African ID number or passport number
5. "licenseNumber": Driver's license number / card number (alphanumeric code, e.g. "DL49201948")
6. "licenseCodes": Vehicle category code(s) (e.g. "Code B", "Code EB", "Code C1", "Code EC", "Code A")
7. "expiryDate": Validity / expiry date in YYYY-MM-DD format (Valid to)
8. "firstIssueDate": First issue date in YYYY-MM-DD format (Valid from / First issued)
9. "gender": "M" or "F"
10. "dateOfBirth": Date of birth in YYYY-MM-DD format
11. "countryOfIssue": Country of issue (e.g. "South Africa")
12. "confidence": Confidence score between 0.0 and 1.0

Return valid JSON ONLY matching these keys. If any field is unreadable, set it to null.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: cleanBase64,
                },
              },
              { text: prompt },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const rawText = response.text || '{}';
      let parsed: any = {};
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = {};
      }

      parsed.documentType = isIdCardMode ? 'id_card' : 'drivers_license';
      if (isIdCardMode) {
        parsed.licenseCodes = 'ID Document';
        parsed.licenseNumber = parsed.idCardNumber || 'ID-CARD';
      }

      const hasDriverData = !!(
        parsed.fullName ||
        parsed.idNumber ||
        parsed.licenseNumber ||
        parsed.surname ||
        parsed.givenNames
      );

      return res.json({
        success: hasDriverData,
        data: parsed,
      });
    } catch (err: any) {
      console.error('API /api/scan-drivers-license error:', err);
      return res.status(500).json({ error: err.message || 'Identity document scan failed' });
    }
  };

  app.post('/api/scan-drivers-license', (req, res) =>
    scanIdentityDocument(req, res, req.body?.scanType === 'id_card' ? 'id_card' : 'drivers_license')
  );
  app.post('/api/scan-id-card', (req, res) => scanIdentityDocument(req, res, 'id_card'));

  // Get all visitors (with optional search query & status filter) + statistics
  app.get('/api/visitors', (req, res) => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const visitors = visitorDb.getAllVisitors(search, status);
      const stats = visitorDb.getStats();
      return res.json({
        success: true,
        count: visitors.length,
        visitors,
        stats,
      });
    } catch (err: any) {
      console.error('Error fetching visitors:', err);
      return res.status(500).json({ error: 'Failed to retrieve visitors' });
    }
  });

  // Record a new visitor entry and save to DB
  app.post('/api/visitors', (req, res) => {
    try {
      const { vehicle, driver, destination } = req.body;

      if (!vehicle?.licenceNumber) {
        return res.status(400).json({ error: 'Vehicle licence/registration number is required' });
      }
      if (!driver?.fullName && !driver?.idNumber && !driver?.licenseNumber) {
        return res.status(400).json({ error: 'Driver identity information is required' });
      }
      if (!destination?.unitVisited) {
        return res.status(400).json({ error: 'Destination unit number is required' });
      }

      const newVisitor = visitorDb.createVisitor({
        vehicle: {
          licenceNumber: vehicle.licenceNumber.toUpperCase().trim(),
          make: (vehicle.make || 'GENERIC').toUpperCase().trim(),
          seriesName: (vehicle.seriesName || 'VEHICLE').toUpperCase().trim(),
          colour: (vehicle.colour || 'WHITE').toUpperCase().trim(),
          vin: vehicle.vin ? vehicle.vin.toUpperCase().trim() : undefined,
          engineNumber: vehicle.engineNumber ? vehicle.engineNumber.trim() : undefined,
          vehicleCategory: vehicle.vehicleCategory || 'LIGHT MOTOR VEHICLE',
          expiryDate: vehicle.expiryDate,
          expiryStatus: vehicle.expiryStatus || 'valid',
          confidence: vehicle.confidence || 0.95,
        },
        driver: {
          fullName: (driver.fullName || 'Visitor Driver').trim(),
          initials: driver.initials?.trim(),
          surname: driver.surname?.trim(),
          idNumber: (driver.idNumber || '').trim(),
          licenseNumber: (driver.licenseNumber || 'DL-PENDING').trim(),
          licenseCodes: driver.licenseCodes || 'Code B',
          licenseExpiryDate: driver.licenseExpiryDate,
          gender: driver.gender || 'M',
          dateOfBirth: driver.dateOfBirth,
          countryOfIssue: driver.countryOfIssue || 'South Africa',
          format: driver.format || 'OCR_VISION',
          confidence: driver.confidence || 0.95,
        },
        destination: {
          complexName: destination.complexName || 'Silver Oaks Residential Estate',
          unitVisited: destination.unitVisited.trim(),
          residentName: destination.residentName?.trim() || 'Resident',
          residentPhone: destination.residentPhone?.trim() || '',
          purpose: destination.purpose || 'RESIDENT_VISIT',
          passengersCount: Number(destination.passengersCount) || 1,
          gateLane: destination.gateLane || 'Main Gate - Inbound Lane 1',
          securityOfficer: destination.securityOfficer || 'Officer S. Ndlovu',
          notes: destination.notes?.trim() || '',
        },
      });

      return res.status(201).json({
        success: true,
        message: 'Visitor entry recorded into database successfully',
        visitor: newVisitor,
        stats: visitorDb.getStats(),
      });
    } catch (err: any) {
      console.error('Error creating visitor entry:', err);
      return res.status(500).json({ error: err.message || 'Failed to record entry' });
    }
  });

  // Record visitor departure / check out
  app.patch('/api/visitors/:id/checkout', (req, res) => {
    try {
      const { id } = req.params;
      const updated = visitorDb.checkoutVisitor(id);
      if (!updated) {
        return res.status(404).json({ error: 'Visitor record not found' });
      }
      return res.json({
        success: true,
        message: `Visitor ${updated.passNumber} (${updated.vehicle.licenceNumber}) checked out successfully`,
        visitor: updated,
        stats: visitorDb.getStats(),
      });
    } catch (err: any) {
      console.error('Error checking out visitor:', err);
      return res.status(500).json({ error: 'Failed to record exit' });
    }
  });

  // Toggle security flag / watch on visitor
  app.patch('/api/visitors/:id/flag', (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const updated = visitorDb.toggleFlagVisitor(id, reason);
      if (!updated) {
        return res.status(404).json({ error: 'Visitor record not found' });
      }
      return res.json({
        success: true,
        visitor: updated,
        stats: visitorDb.getStats(),
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to update flag' });
    }
  });

  // Delete a visitor record
  app.delete('/api/visitors/:id', requireAdmin, (req, res) => {
    try {
      const { id } = req.params;
      const deleted = visitorDb.deleteVisitor(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Visitor record not found' });
      }
      return res.json({
        success: true,
        message: 'Visitor record deleted',
        stats: visitorDb.getStats(),
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to delete record' });
    }
  });

  // Real-time Complex Stats
  app.get('/api/complex-stats', (req, res) => {
    return res.json(visitorDb.getStats());
  });

  // Complex units directory for resident lookup
  app.get('/api/units', (req, res) => {
    return res.json(settingsDb.getUnits());
  });

  // CSV Export endpoint for body corporate & security compliance
  app.get('/api/export-csv', (req, res) => {
    try {
      const visitors = visitorDb.getAllVisitors();
      const headers = [
        'Pass Number',
        'Status',
        'Entry Time',
        'Exit Time',
        'Duration (Mins)',
        'Vehicle Reg',
        'Make',
        'Model',
        'Colour',
        'Driver Name',
        'Driver ID Number',
        'Driver License No',
        'Unit Visited',
        'Resident Name',
        'Purpose',
        'Passengers',
        'Gate Lane',
        'Security Officer',
        'Notes',
      ];

      // Quote every field, escape quotes, and neutralise spreadsheet formula injection.
      const csvCell = (value: unknown) => {
        let text = value == null ? '' : String(value);
        if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
        return `"${text.replace(/"/g, '""')}"`;
      };

      const rows = visitors.map((v) =>
        [
          v.passNumber,
          v.status,
          new Date(v.entryTime).toISOString(),
          v.exitTime ? new Date(v.exitTime).toISOString() : '',
          v.durationMinutes || '',
          v.vehicle.licenceNumber,
          v.vehicle.make,
          v.vehicle.seriesName,
          v.vehicle.colour,
          v.driver.fullName,
          v.driver.idNumber,
          v.driver.licenseNumber,
          v.destination.unitVisited,
          v.destination.residentName,
          v.destination.purpose,
          v.destination.passengersCount,
          v.destination.gateLane,
          v.destination.securityOfficer,
          v.destination.notes,
        ].map(csvCell)
      );

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=complex-visitors-${Date.now()}.csv`);
      return res.send(csvContent);
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to export CSV' });
    }
  });

  // Vite development middleware vs production static
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
