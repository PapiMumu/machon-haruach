/** ISO region codes — same coverage as Admin / group join country field. */
export const COUNTRY_CODES = [
  "ZW", "ZM", "ZA", "BW", "NA", "MZ", "MW", "TZ", "KE", "UG", "RW", "BI", "NG", "GH", "ET", "EG", "SD", "AO", "CD", "CM", "SN", "CI", "DZ",
  "US", "CA", "MX", "BR", "AR", "CL", "CO", "PE", "UY", "VE",
  "GB", "IE", "FR", "DE", "NL", "BE", "ES", "PT", "IT", "CH", "AT", "SE", "NO", "DK", "FI", "PL", "CZ", "HU", "RO", "GR", "UA", "RU",
  "AE", "SA", "QA", "KW", "OM", "BH", "IL", "TR", "IN", "PK", "BD", "LK", "NP", "CN", "JP", "KR", "SG", "MY", "TH", "VN", "PH", "ID",
  "AU", "NZ"
] as const;

/** Full English names — RN/Hermes often lacks `Intl.DisplayNames` for regions. */
export const COUNTRY_ENGLISH_NAMES: Record<string, string> = {
  ZW: "Zimbabwe",
  ZM: "Zambia",
  ZA: "South Africa",
  BW: "Botswana",
  NA: "Namibia",
  MZ: "Mozambique",
  MW: "Malawi",
  TZ: "Tanzania",
  KE: "Kenya",
  UG: "Uganda",
  RW: "Rwanda",
  BI: "Burundi",
  NG: "Nigeria",
  GH: "Ghana",
  ET: "Ethiopia",
  EG: "Egypt",
  SD: "Sudan",
  AO: "Angola",
  CD: "Democratic Republic of the Congo",
  CM: "Cameroon",
  SN: "Senegal",
  CI: "Côte d'Ivoire",
  DZ: "Algeria",
  US: "United States",
  CA: "Canada",
  MX: "Mexico",
  BR: "Brazil",
  AR: "Argentina",
  CL: "Chile",
  CO: "Colombia",
  PE: "Peru",
  UY: "Uruguay",
  VE: "Venezuela",
  GB: "United Kingdom",
  IE: "Ireland",
  FR: "France",
  DE: "Germany",
  NL: "Netherlands",
  BE: "Belgium",
  ES: "Spain",
  PT: "Portugal",
  IT: "Italy",
  CH: "Switzerland",
  AT: "Austria",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
  PL: "Poland",
  CZ: "Czechia",
  HU: "Hungary",
  RO: "Romania",
  GR: "Greece",
  UA: "Ukraine",
  RU: "Russia",
  AE: "United Arab Emirates",
  SA: "Saudi Arabia",
  QA: "Qatar",
  KW: "Kuwait",
  OM: "Oman",
  BH: "Bahrain",
  IL: "Israel",
  TR: "Turkey",
  IN: "India",
  PK: "Pakistan",
  BD: "Bangladesh",
  LK: "Sri Lanka",
  NP: "Nepal",
  CN: "China",
  JP: "Japan",
  KR: "South Korea",
  SG: "Singapore",
  MY: "Malaysia",
  TH: "Thailand",
  VN: "Vietnam",
  PH: "Philippines",
  ID: "Indonesia",
  AU: "Australia",
  NZ: "New Zealand"
};

/** ITU country calling codes (digits only, without +). */
export const COUNTRY_DIAL_CODES: Record<string, string> = {
  ZW: "263",
  ZM: "260",
  ZA: "27",
  BW: "267",
  NA: "264",
  MZ: "258",
  MW: "265",
  TZ: "255",
  KE: "254",
  UG: "256",
  RW: "250",
  BI: "257",
  NG: "234",
  GH: "233",
  ET: "251",
  EG: "20",
  SD: "249",
  AO: "244",
  CD: "243",
  CM: "237",
  SN: "221",
  CI: "225",
  DZ: "213",
  US: "1",
  CA: "1",
  MX: "52",
  BR: "55",
  AR: "54",
  CL: "56",
  CO: "57",
  PE: "51",
  UY: "598",
  VE: "58",
  GB: "44",
  IE: "353",
  FR: "33",
  DE: "49",
  NL: "31",
  BE: "32",
  ES: "34",
  PT: "351",
  IT: "39",
  CH: "41",
  AT: "43",
  SE: "46",
  NO: "47",
  DK: "45",
  FI: "358",
  PL: "48",
  CZ: "420",
  HU: "36",
  RO: "40",
  GR: "30",
  UA: "380",
  RU: "7",
  AE: "971",
  SA: "966",
  QA: "974",
  KW: "965",
  OM: "968",
  BH: "973",
  IL: "972",
  TR: "90",
  IN: "91",
  PK: "92",
  BD: "880",
  LK: "94",
  NP: "977",
  CN: "86",
  JP: "81",
  KR: "82",
  SG: "65",
  MY: "60",
  TH: "66",
  VN: "84",
  PH: "63",
  ID: "62",
  AU: "61",
  NZ: "64"
};

export interface CountryOption {
  code: string;
  name: string;
  dialCode: string;
}

let cachedCountryOptions: CountryOption[] | undefined;

export function getCountryOptions(): CountryOption[] {
  if (cachedCountryOptions) return cachedCountryOptions;

  let intlOf: ((code: string) => string | undefined) | undefined;
  if (typeof Intl !== "undefined" && "DisplayNames" in Intl) {
    const dn = new Intl.DisplayNames(["en"], { type: "region" });
    intlOf = (code: string) => {
      const n = dn.of(code);
      return n && n.length > 2 && n !== code ? n : undefined;
    };
  }

  cachedCountryOptions = [...COUNTRY_CODES]
    .map(code => {
      const dialDigits = COUNTRY_DIAL_CODES[code] ?? "";
      return {
        code,
        name: COUNTRY_ENGLISH_NAMES[code] ?? intlOf?.(code) ?? code,
        dialCode: dialDigits ? `+${dialDigits}` : ""
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return cachedCountryOptions;
}

export function findCountryByName(name: string | undefined | null): CountryOption | undefined {
  const trimmed = name?.trim();
  if (!trimmed) return undefined;
  return getCountryOptions().find(item => item.name === trimmed);
}

export function findCountryByDialCode(dialCode: string | undefined | null): CountryOption | undefined {
  const digits = dialCode?.replace(/\D/g, "") ?? "";
  if (!digits) return undefined;
  return getCountryOptions().find(item => item.dialCode.replace(/\D/g, "") === digits);
}

export interface PhoneParts {
  dialCode: string;
  national: string;
}

function getDialMatchEntries(): { dialDigits: string; display: string }[] {
  const seen = new Set<string>();
  const entries: { dialDigits: string; display: string }[] = [];
  for (const option of getCountryOptions()) {
    const dialDigits = option.dialCode.replace(/\D/g, "");
    if (!dialDigits || seen.has(dialDigits)) continue;
    seen.add(dialDigits);
    entries.push({ dialDigits, display: option.dialCode });
  }
  return entries.sort((a, b) => b.dialDigits.length - a.dialDigits.length);
}

export function parsePhoneNumber(phone: string | undefined | null, defaultDialCode = "+263"): PhoneParts {
  const trimmed = phone?.trim() ?? "";
  if (!trimmed) return { dialCode: defaultDialCode, national: "" };

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return { dialCode: defaultDialCode, national: "" };

  for (const entry of getDialMatchEntries()) {
    if (digits.startsWith(entry.dialDigits)) {
      return {
        dialCode: entry.display,
        national: digits.slice(entry.dialDigits.length)
      };
    }
  }

  if (digits.length === 10 && defaultDialCode.replace(/\D/g, "") === "1") {
    return { dialCode: "+1", national: digits };
  }

  return { dialCode: defaultDialCode, national: digits };
}

export function formatPhoneNumber(dialCode: string, national: string): string {
  const dialDigits = dialCode.replace(/\D/g, "");
  const nationalDigits = national.replace(/\D/g, "");
  if (!dialDigits && !nationalDigits) return "";
  if (!nationalDigits) return "";
  return `+${dialDigits}${nationalDigits}`;
}

export function flagImageUri(countryCode: string): string {
  return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
}
