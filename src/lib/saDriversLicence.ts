/**
 * South African driver's licence (card) PDF417 decoder.
 *
 * Why the licence "does not scan" while the ID card and the vehicle licence
 * disc do: the ID and disc barcodes hold plain text, but the barcode on the
 * back of the driver's licence card holds 720 bytes of RSA-encrypted binary
 * data. A barcode reader *does* read it, but the result is unreadable bytes
 * unless it is decrypted with the (publicly known) RTMC public keys and then
 * parsed as the binary layout below.
 *
 * Layout reference: https://github.com/ugommirikwe/sa-license-decoder/blob/master/SPEC.md
 * Ported from the `south-africa-driving-license` (sadl) Python package.
 *
 * Zero dependencies — uses BigInt for the RSA step, so it runs in any modern
 * browser or Node 18+.
 */

export interface SADriversLicence {
  surname: string;
  initials: string;
  idNumber: string;
  /** "02" = South African ID number. */
  idNumberType: string;
  licenceNumber: string;
  /** Licence codes, e.g. ["B", "EB"]. */
  vehicleCodes: string[];
  vehicleRestrictions: string[];
  /** Professional Driving Permit category, empty when none. */
  prdpCode: string;
  prdpExpiryDate: string;
  idCountryOfIssue: string;
  licenceCountryOfIssue: string;
  /** One date (YYYY/MM/DD) per vehicle code. */
  licenceCodeIssueDates: string[];
  /** Two digits, each 0 = none, 1 = glasses, 2 = artificial limb. */
  driverRestrictionCodes: string;
  licenceIssueNumber: string;
  birthDate: string;
  /** Card valid from (YYYY/MM/DD). */
  validFrom: string;
  /** Card valid to (YYYY/MM/DD). */
  validTo: string;
  gender: 'male' | 'female';
}

export const SA_DL_ENCRYPTED_LENGTH = 720;

interface RsaKey {
  n: bigint;
  e: bigint;
}

interface KeySet {
  header: readonly number[];
  k128: RsaKey;
  k74: RsaKey;
}

const KEY_SETS: readonly KeySet[] = [
  {
    // Version 1 cards
    header: [0x01, 0xe1, 0x02, 0x45],
    k128: {
      n: 0xfed2e1c27e3363316e77317a7a52c54981395186be4974760c72518d63e0544a48d088b332c5b0c370c765d65d983c1f9de0a42b310ccc07ae770bd2b61d6a4dcceac757689bdcbf608478faf312f6087cc496c3762cf5c4651caecda3499fae7edb7eb40e3e18eb304170e91ed5b156aace6f432d6eca6cc35851de8c678f67n,
      e: 0xbb797ffdec7f9e42c9d6f79b137059dbn,
    },
    k74: {
      n: 0xff3cec6b5f40e3c3661451b9fcfaef3aeb06dc2329c0e6f4dccc9279726716ce15bbe05eed2c5711bcf8f5b6c8f7276db5c43bfaa3040dc01ab14b9c4d16f71c0ce5ea953f0c754c6b17n,
      e: 0xdb05ba822d9acc33fab7d8f427f9ce65n,
    },
  },
  {
    // Version 2 cards (most cards in circulation today)
    header: [0x01, 0x9b, 0x09, 0x45],
    k128: {
      n: 0xca9f18ef6c3f3fa4c5a461fea54ab19406ba5ecd746d60a27492dca3d74e3b5c1d315f7b10383241809b029ebbd5de4d116030cc57f7d5a6c9a16f373bb14a508523f7e80a4c744d9085663a4a1472d7af2c56ae41b5065f7efa0293bd3278ad693546f9f16219b79ff471a3636824cffcdb63a8ed8059e6b9a4f0db895381cbn,
      e: 0x187092da6454ceb1853e6915f8466a05n,
    },
    k74: {
      n: 0xb404a0df11d1cacff1a1a048d4d573f953a62c583d74925927561a6d7a1e2b14042526af70b550547390ea6ec748d30fdb81adb490e0c36a1986b404b2f5f69ef5da1b663e59509130e7n,
      e: 0x309cfed9719fe2a5e20c9bb44765382bn,
    },
  },
];

// ---------------------------------------------------------------------------
// Input normalisation
// ---------------------------------------------------------------------------

/**
 * Browsers' TextDecoder('iso-8859-1') is really windows-1252, which turns
 * bytes 0x80-0x9F into characters like '€' (U+20AC). Map them back so a text
 * result from @zxing/library still yields the original bytes.
 */
const CP1252_TO_BYTE = new Map<number, number>([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84], [0x2026, 0x85], [0x2020, 0x86],
  [0x2021, 0x87], [0x02c6, 0x88], [0x2030, 0x89], [0x0160, 0x8a], [0x2039, 0x8b], [0x0152, 0x8c],
  [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92], [0x201c, 0x93], [0x201d, 0x94], [0x2022, 0x95],
  [0x2013, 0x96], [0x2014, 0x97], [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b],
  [0x0153, 0x9c], [0x017e, 0x9e], [0x0178, 0x9f],
]);

/**
 * Converts whatever the barcode library returned into raw bytes.
 *
 * Use the scanner's raw bytes where available (zxing-wasm `result.bytes`).
 * A Latin-1 / windows-1252 text result (@zxing/library `getText()`) is also
 * fine. A UTF-8 decoded string (native `BarcodeDetector.rawValue`) is lossy
 * and cannot be recovered.
 */
export function toBytes(input: Uint8Array | ArrayBuffer | number[] | string): Uint8Array {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (Array.isArray(input)) return Uint8Array.from(input, (b) => b & 0xff);
  const out = new Uint8Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    out[i] = code <= 0xff ? code : (CP1252_TO_BYTE.get(code) ?? code & 0xff);
  }
  return out;
}

/** True when the payload looks like an encrypted SA driver's licence barcode. */
export function isSADriversLicence(input: Uint8Array | ArrayBuffer | number[] | string): boolean {
  const data = toBytes(input);
  return data.length === SA_DL_ENCRYPTED_LENGTH && findKeySet(data) !== undefined;
}

// ---------------------------------------------------------------------------
// Decryption
// ---------------------------------------------------------------------------

function findKeySet(data: Uint8Array): KeySet | undefined {
  return KEY_SETS.find((ks) => ks.header.every((b, i) => data[i] === b));
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  base %= mod;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % mod;
    exp >>= 1n;
    base = (base * base) % mod;
  }
  return result;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex ? BigInt('0x' + hex) : 0n;
}

function bigIntToBytes(value: bigint, length: number): Uint8Array {
  const hex = value.toString(16).padStart(length * 2, '0');
  const out = new Uint8Array(length);
  for (let i = 0; i < length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

function rsaBlock(block: Uint8Array, key: RsaKey): Uint8Array {
  return bigIntToBytes(modPow(bytesToBigInt(block), key.e, key.n), block.length);
}

/** Decrypts the 720-byte barcode payload into the 714-byte plaintext. */
export function decryptSADriversLicence(input: Uint8Array | ArrayBuffer | number[] | string): Uint8Array {
  const data = toBytes(input);
  if (data.length !== SA_DL_ENCRYPTED_LENGTH) {
    throw new Error(
      `Expected ${SA_DL_ENCRYPTED_LENGTH} bytes from the licence barcode, got ${data.length}. ` +
        'Make sure the scanner returns raw bytes (not UTF-8 text) and the whole PDF417 code was read.',
    );
  }
  const keys = findKeySet(data);
  if (!keys) throw new Error('Unrecognised driver\'s licence barcode version.');

  const out = new Uint8Array(5 * 128 + 74);
  let offset = 6;
  for (let i = 0; i < 5; i++, offset += 128) {
    out.set(rsaBlock(data.subarray(offset, offset + 128), keys.k128), i * 128);
  }
  out.set(rsaBlock(data.subarray(offset, offset + 74), keys.k74), 5 * 128);
  return out;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

const DELIM_FIELD = 0xe0;
const DELIM_EMPTY = 0xe1;

class Reader {
  private readonly data: Uint8Array;
  index: number;

  constructor(data: Uint8Array, index: number) {
    this.data = data;
    this.index = index;
  }

  byte(): number {
    if (this.index >= this.data.length) throw new Error('Driver\'s licence data ended unexpectedly.');
    return this.data[this.index++];
  }

  /** Reads one delimited string; returns it with the delimiter that ended it. */
  string(): [string, number] {
    let value = '';
    for (;;) {
      const b = this.byte();
      if (b === DELIM_FIELD || b === DELIM_EMPTY) return [value, b];
      value += String.fromCharCode(b);
    }
  }

  /** Reads a fixed-count group of strings where 0xE1 marks empty slots. */
  strings(count: number): string[] {
    const values: string[] = [];
    for (let i = 0; i < count; i++) {
      let value = '';
      for (;;) {
        const b = this.byte();
        if (b === DELIM_FIELD) break;
        if (b === DELIM_EMPTY) {
          if (value !== '') i++;
          break;
        }
        value += String.fromCharCode(b);
      }
      if (value !== '') values.push(value);
    }
    return values;
  }
}

class NibbleQueue {
  private readonly nibbles: number[];
  private pos = 0;

  constructor(nibbles: number[]) {
    this.nibbles = nibbles;
  }

  next(): number {
    if (this.pos >= this.nibbles.length) throw new Error('Driver\'s licence date data ended unexpectedly.');
    return this.nibbles[this.pos++];
  }

  /** A date is 8 nibbles (YYYYMMDD) or a single 0xA nibble meaning "none". */
  date(): string {
    const y1 = this.next();
    if (y1 === 10) return '';
    const n = [y1];
    for (let i = 0; i < 7; i++) n.push(this.next());
    return `${n[0]}${n[1]}${n[2]}${n[3]}/${n[4]}${n[5]}/${n[6]}${n[7]}`;
  }

  dates(count: number): string[] {
    const out: string[] = [];
    for (let i = 0; i < count; i++) {
      const d = this.date();
      if (d) out.push(d);
    }
    return out;
  }

  pair(): string {
    return `${this.next()}${this.next()}`;
  }
}

/** Parses decrypted licence bytes into fields. */
export function parseSADriversLicence(plain: Uint8Array): SADriversLicence {
  const start = plain.indexOf(0x82);
  if (start < 0) throw new Error('Driver\'s licence data is not in the expected format.');
  const r = new Reader(plain, start + 2);

  // Section 1: strings
  const vehicleCodes = r.strings(4);
  const [surname] = r.string();
  const [initials, delim] = r.string();
  let prdpCode = '';
  if (delim === DELIM_FIELD) [prdpCode] = r.string();
  const [idCountryOfIssue] = r.string();
  const [licenceCountryOfIssue] = r.string();
  const vehicleRestrictions = r.strings(4);
  const [licenceNumber] = r.string();
  let idNumber = '';
  for (let i = 0; i < 13; i++) idNumber += String.fromCharCode(r.byte());

  // Section 2: binary (nibble-packed) data
  const idNumberType = String(r.byte()).padStart(2, '0');
  const nibbles: number[] = [];
  for (;;) {
    const b = r.byte();
    if (b === 0x57) break;
    nibbles.push(b >> 4, b & 0x0f);
  }
  const q = new NibbleQueue(nibbles);
  const licenceCodeIssueDates = q.dates(4);
  const driverRestrictionCodes = q.pair();
  const prdpExpiryDate = q.date();
  const licenceIssueNumber = q.pair();
  const birthDate = q.date();
  const validFrom = q.date();
  const validTo = q.date();
  const gender = q.pair() === '01' ? 'male' : 'female';

  return {
    surname: surname.trim(),
    initials: initials.trim(),
    idNumber,
    idNumberType,
    licenceNumber: licenceNumber.trim(),
    vehicleCodes,
    vehicleRestrictions,
    prdpCode,
    prdpExpiryDate,
    idCountryOfIssue,
    licenceCountryOfIssue,
    licenceCodeIssueDates,
    driverRestrictionCodes,
    licenceIssueNumber,
    birthDate,
    validFrom,
    validTo,
    gender,
  };
}

/**
 * One-shot helper: raw scanner output -> licence fields.
 * Returns null when the payload is not an SA driver's licence barcode, so it
 * can sit in front of the existing ID / licence-disc parsers:
 *
 *   const dl = decodeSADriversLicence(scan.bytes);
 *   if (dl) return handleDriversLicence(dl);
 *   // ...fall through to existing ID / vehicle disc handling
 */
export function decodeSADriversLicence(
  input: Uint8Array | ArrayBuffer | number[] | string,
): SADriversLicence | null {
  const data = toBytes(input);
  if (!isSADriversLicence(data)) return null;
  return parseSADriversLicence(decryptSADriversLicence(data));
}

/** True when the licence card's valid-to date has passed. */
export function isLicenceExpired(dl: SADriversLicence, now: Date = new Date()): boolean {
  if (!dl.validTo) return false;
  const [y, m, d] = dl.validTo.split('/').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59) < now;
}
