export type Country = {
  code: string
  name: string
  currency: string
  phone: string
  region: 'west-africa' | 'central-africa' | 'east-africa' | 'north-africa' | 'south-africa' | 'middle-east' | 'europe' | 'americas' | 'oceania'
}

/**
 * Liste standardisée ISO 3166-1 alpha-2.
 * Afrique complète (54 pays UA) + Moyen-Orient + diaspora Europe / Amériques / Océanie.
 */
export const COUNTRIES: Country[] = [
  // ── Afrique de l'Ouest ──────────────────────────────────────────────────
  { code: 'BJ', name: 'Bénin',                  currency: 'XOF', phone: '+229', region: 'west-africa' },
  { code: 'BF', name: 'Burkina Faso',            currency: 'XOF', phone: '+226', region: 'west-africa' },
  { code: 'CV', name: 'Cap-Vert',                currency: 'CVE', phone: '+238', region: 'west-africa' },
  { code: 'CI', name: "Côte d'Ivoire",           currency: 'XOF', phone: '+225', region: 'west-africa' },
  { code: 'GM', name: 'Gambie',                  currency: 'GMD', phone: '+220', region: 'west-africa' },
  { code: 'GH', name: 'Ghana',                   currency: 'GHS', phone: '+233', region: 'west-africa' },
  { code: 'GN', name: 'Guinée',                  currency: 'GNF', phone: '+224', region: 'west-africa' },
  { code: 'GW', name: 'Guinée-Bissau',           currency: 'XOF', phone: '+245', region: 'west-africa' },
  { code: 'LR', name: 'Liberia',                 currency: 'LRD', phone: '+231', region: 'west-africa' },
  { code: 'ML', name: 'Mali',                    currency: 'XOF', phone: '+223', region: 'west-africa' },
  { code: 'MR', name: 'Mauritanie',              currency: 'MRU', phone: '+222', region: 'west-africa' },
  { code: 'NE', name: 'Niger',                   currency: 'XOF', phone: '+227', region: 'west-africa' },
  { code: 'NG', name: 'Nigeria',                 currency: 'NGN', phone: '+234', region: 'west-africa' },
  { code: 'SN', name: 'Sénégal',                 currency: 'XOF', phone: '+221', region: 'west-africa' },
  { code: 'SL', name: 'Sierra Leone',            currency: 'SLE', phone: '+232', region: 'west-africa' },
  { code: 'TG', name: 'Togo',                    currency: 'XOF', phone: '+228', region: 'west-africa' },

  // ── Afrique Centrale ────────────────────────────────────────────────────
  { code: 'AO', name: 'Angola',                  currency: 'AOA', phone: '+244', region: 'central-africa' },
  { code: 'CF', name: 'Centrafrique',            currency: 'XAF', phone: '+236', region: 'central-africa' },
  { code: 'CM', name: 'Cameroun',                currency: 'XAF', phone: '+237', region: 'central-africa' },
  { code: 'CG', name: 'Congo',                   currency: 'XAF', phone: '+242', region: 'central-africa' },
  { code: 'CD', name: 'RD Congo',                currency: 'CDF', phone: '+243', region: 'central-africa' },
  { code: 'GQ', name: 'Guinée équatoriale',      currency: 'XAF', phone: '+240', region: 'central-africa' },
  { code: 'GA', name: 'Gabon',                   currency: 'XAF', phone: '+241', region: 'central-africa' },
  { code: 'ST', name: 'São Tomé-et-Príncipe',    currency: 'STN', phone: '+239', region: 'central-africa' },
  { code: 'TD', name: 'Tchad',                   currency: 'XAF', phone: '+235', region: 'central-africa' },

  // ── Afrique de l'Est ────────────────────────────────────────────────────
  { code: 'BI', name: 'Burundi',                 currency: 'BIF', phone: '+257', region: 'east-africa' },
  { code: 'KM', name: 'Comores',                 currency: 'KMF', phone: '+269', region: 'east-africa' },
  { code: 'DJ', name: 'Djibouti',                currency: 'DJF', phone: '+253', region: 'east-africa' },
  { code: 'ER', name: 'Érythrée',                currency: 'ERN', phone: '+291', region: 'east-africa' },
  { code: 'ET', name: 'Éthiopie',                currency: 'ETB', phone: '+251', region: 'east-africa' },
  { code: 'KE', name: 'Kenya',                   currency: 'KES', phone: '+254', region: 'east-africa' },
  { code: 'MG', name: 'Madagascar',              currency: 'MGA', phone: '+261', region: 'east-africa' },
  { code: 'MW', name: 'Malawi',                  currency: 'MWK', phone: '+265', region: 'east-africa' },
  { code: 'MU', name: 'Maurice',                 currency: 'MUR', phone: '+230', region: 'east-africa' },
  { code: 'MZ', name: 'Mozambique',              currency: 'MZN', phone: '+258', region: 'east-africa' },
  { code: 'RW', name: 'Rwanda',                  currency: 'RWF', phone: '+250', region: 'east-africa' },
  { code: 'SC', name: 'Seychelles',              currency: 'SCR', phone: '+248', region: 'east-africa' },
  { code: 'SO', name: 'Somalie',                 currency: 'SOS', phone: '+252', region: 'east-africa' },
  { code: 'SS', name: 'Soudan du Sud',           currency: 'SSP', phone: '+211', region: 'east-africa' },
  { code: 'TZ', name: 'Tanzanie',                currency: 'TZS', phone: '+255', region: 'east-africa' },
  { code: 'UG', name: 'Ouganda',                 currency: 'UGX', phone: '+256', region: 'east-africa' },
  { code: 'ZM', name: 'Zambie',                  currency: 'ZMW', phone: '+260', region: 'east-africa' },
  { code: 'ZW', name: 'Zimbabwe',                currency: 'ZWG', phone: '+263', region: 'east-africa' },

  // ── Afrique du Nord ─────────────────────────────────────────────────────
  { code: 'DZ', name: 'Algérie',                 currency: 'DZD', phone: '+213', region: 'north-africa' },
  { code: 'EG', name: 'Égypte',                  currency: 'EGP', phone: '+20',  region: 'north-africa' },
  { code: 'LY', name: 'Libye',                   currency: 'LYD', phone: '+218', region: 'north-africa' },
  { code: 'MA', name: 'Maroc',                   currency: 'MAD', phone: '+212', region: 'north-africa' },
  { code: 'SD', name: 'Soudan',                  currency: 'SDG', phone: '+249', region: 'north-africa' },
  { code: 'TN', name: 'Tunisie',                 currency: 'TND', phone: '+216', region: 'north-africa' },

  // ── Afrique Australe ────────────────────────────────────────────────────
  { code: 'BW', name: 'Botswana',                currency: 'BWP', phone: '+267', region: 'south-africa' },
  { code: 'LS', name: 'Lesotho',                 currency: 'LSL', phone: '+266', region: 'south-africa' },
  { code: 'NA', name: 'Namibie',                 currency: 'NAD', phone: '+264', region: 'south-africa' },
  { code: 'ZA', name: 'Afrique du Sud',          currency: 'ZAR', phone: '+27',  region: 'south-africa' },
  { code: 'SZ', name: 'Eswatini',                currency: 'SZL', phone: '+268', region: 'south-africa' },

  // ── Moyen-Orient (diaspora africaine) ───────────────────────────────────
  { code: 'AE', name: 'Émirats arabes unis',     currency: 'AED', phone: '+971', region: 'middle-east' },
  { code: 'BH', name: 'Bahreïn',                 currency: 'BHD', phone: '+973', region: 'middle-east' },
  { code: 'IQ', name: 'Irak',                    currency: 'IQD', phone: '+964', region: 'middle-east' },
  { code: 'JO', name: 'Jordanie',                currency: 'JOD', phone: '+962', region: 'middle-east' },
  { code: 'KW', name: 'Koweït',                  currency: 'KWD', phone: '+965', region: 'middle-east' },
  { code: 'LB', name: 'Liban',                   currency: 'LBP', phone: '+961', region: 'middle-east' },
  { code: 'OM', name: 'Oman',                    currency: 'OMR', phone: '+968', region: 'middle-east' },
  { code: 'QA', name: 'Qatar',                   currency: 'QAR', phone: '+974', region: 'middle-east' },
  { code: 'SA', name: 'Arabie saoudite',         currency: 'SAR', phone: '+966', region: 'middle-east' },

  // ── Europe ───────────────────────────────────────────────────────────────
  { code: 'AT', name: 'Autriche',                currency: 'EUR', phone: '+43',  region: 'europe' },
  { code: 'BE', name: 'Belgique',                currency: 'EUR', phone: '+32',  region: 'europe' },
  { code: 'CH', name: 'Suisse',                  currency: 'CHF', phone: '+41',  region: 'europe' },
  { code: 'DE', name: 'Allemagne',               currency: 'EUR', phone: '+49',  region: 'europe' },
  { code: 'DK', name: 'Danemark',                currency: 'DKK', phone: '+45',  region: 'europe' },
  { code: 'ES', name: 'Espagne',                 currency: 'EUR', phone: '+34',  region: 'europe' },
  { code: 'FI', name: 'Finlande',                currency: 'EUR', phone: '+358', region: 'europe' },
  { code: 'FR', name: 'France',                  currency: 'EUR', phone: '+33',  region: 'europe' },
  { code: 'GB', name: 'Royaume-Uni',             currency: 'GBP', phone: '+44',  region: 'europe' },
  { code: 'IE', name: 'Irlande',                 currency: 'EUR', phone: '+353', region: 'europe' },
  { code: 'IT', name: 'Italie',                  currency: 'EUR', phone: '+39',  region: 'europe' },
  { code: 'LU', name: 'Luxembourg',              currency: 'EUR', phone: '+352', region: 'europe' },
  { code: 'NL', name: 'Pays-Bas',                currency: 'EUR', phone: '+31',  region: 'europe' },
  { code: 'NO', name: 'Norvège',                 currency: 'NOK', phone: '+47',  region: 'europe' },
  { code: 'PT', name: 'Portugal',                currency: 'EUR', phone: '+351', region: 'europe' },
  { code: 'SE', name: 'Suède',                   currency: 'SEK', phone: '+46',  region: 'europe' },

  // ── Amériques ────────────────────────────────────────────────────────────
  { code: 'BR', name: 'Brésil',                  currency: 'BRL', phone: '+55',  region: 'americas' },
  { code: 'CA', name: 'Canada',                  currency: 'CAD', phone: '+1',   region: 'americas' },
  { code: 'HT', name: 'Haïti',                   currency: 'HTG', phone: '+509', region: 'americas' },
  { code: 'US', name: 'États-Unis',              currency: 'USD', phone: '+1',   region: 'americas' },

  // ── Océanie ──────────────────────────────────────────────────────────────
  { code: 'AU', name: 'Australie',               currency: 'AUD', phone: '+61',  region: 'oceania' },
]

/** Codes des pays UEMOA (zone XOF principale) */
export const UEMOA_CODES = ['BJ', 'BF', 'CI', 'GW', 'ML', 'NE', 'SN', 'TG']

/** Codes des pays CEMAC (zone XAF) */
export const CEMAC_CODES = ['CM', 'CF', 'CG', 'GA', 'GQ', 'TD']

/** Récupère un pays par son code ISO */
export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find(c => c.code === code)
}

/** Groupes régionaux pour affichage */
export const REGION_LABELS: Record<Country['region'], string> = {
  'west-africa':    'Afrique de l\'Ouest',
  'central-africa': 'Afrique Centrale',
  'east-africa':    'Afrique de l\'Est',
  'north-africa':   'Afrique du Nord',
  'south-africa':   'Afrique Australe',
  'middle-east':    'Moyen-Orient',
  'europe':         'Europe',
  'americas':       'Amériques',
  'oceania':        'Océanie',
}
