/** ISO region codes — aligned with Machon HaRuach Mobile / group country fields. */
const COUNTRY_CODES = [
  "ZW", "ZM", "ZA", "BW", "NA", "MZ", "MW", "TZ", "KE", "UG", "RW", "BI", "NG", "GH", "ET", "EG", "SD", "AO", "CD", "CM", "SN", "CI", "DZ",
  "US", "CA", "MX", "BR", "AR", "CL", "CO", "PE", "UY", "VE",
  "GB", "IE", "FR", "DE", "NL", "BE", "ES", "PT", "IT", "CH", "AT", "SE", "NO", "DK", "FI", "PL", "CZ", "HU", "RO", "GR", "UA", "RU",
  "AE", "SA", "QA", "KW", "OM", "BH", "IL", "TR", "IN", "PK", "BD", "LK", "NP", "CN", "JP", "KR", "SG", "MY", "TH", "VN", "PH", "ID",
  "AU", "NZ"
] as const;

/** Full English names — matches values saved from Machon HaRuach Mobile profile / join group. */
const COUNTRY_ENGLISH_NAMES: Record<string, string> = {
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

export interface CountryOption {
  code: string;
  name: string;
}

let cachedOptions: CountryOption[] | undefined;

export function getCountryOptions(): CountryOption[] {
  if (cachedOptions) return cachedOptions;

  let intlOf: ((code: string) => string | undefined) | undefined;
  if (typeof Intl !== "undefined" && "DisplayNames" in Intl) {
    const dn = new Intl.DisplayNames(["en"], { type: "region" });
    intlOf = (code: string) => {
      const n = dn.of(code);
      return n && n.length > 2 && n !== code ? n : undefined;
    };
  }

  cachedOptions = [...COUNTRY_CODES]
    .map(code => ({
      code,
      name: COUNTRY_ENGLISH_NAMES[code] ?? intlOf?.(code) ?? code
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return cachedOptions;
}
