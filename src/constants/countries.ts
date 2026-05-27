export type Country = {
  code: string
  name: string
  currency: string
  phone: string
  region:
    | 'west-africa' | 'central-africa' | 'east-africa' | 'north-africa' | 'south-africa'
    | 'middle-east'
    | 'europe'
    | 'north-america' | 'central-america' | 'caribbean' | 'south-america'
    | 'central-asia' | 'south-asia' | 'east-asia' | 'southeast-asia'
    | 'oceania'
}

/**
 * Liste complète ISO 3166-1 alpha-2 — 195 pays reconnus par l'ONU.
 */
export const COUNTRIES: Country[] = [

  // ── Afrique de l'Ouest (16) ──────────────────────────────────────────────
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

  // ── Afrique Centrale (9) ─────────────────────────────────────────────────
  { code: 'AO', name: 'Angola',                  currency: 'AOA', phone: '+244', region: 'central-africa' },
  { code: 'CF', name: 'Centrafrique',            currency: 'XAF', phone: '+236', region: 'central-africa' },
  { code: 'CM', name: 'Cameroun',                currency: 'XAF', phone: '+237', region: 'central-africa' },
  { code: 'CG', name: 'Congo',                   currency: 'XAF', phone: '+242', region: 'central-africa' },
  { code: 'CD', name: 'RD Congo',                currency: 'CDF', phone: '+243', region: 'central-africa' },
  { code: 'GQ', name: 'Guinée équatoriale',      currency: 'XAF', phone: '+240', region: 'central-africa' },
  { code: 'GA', name: 'Gabon',                   currency: 'XAF', phone: '+241', region: 'central-africa' },
  { code: 'ST', name: 'São Tomé-et-Príncipe',    currency: 'STN', phone: '+239', region: 'central-africa' },
  { code: 'TD', name: 'Tchad',                   currency: 'XAF', phone: '+235', region: 'central-africa' },

  // ── Afrique de l'Est (18) ────────────────────────────────────────────────
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

  // ── Afrique du Nord (6) ──────────────────────────────────────────────────
  { code: 'DZ', name: 'Algérie',                 currency: 'DZD', phone: '+213', region: 'north-africa' },
  { code: 'EG', name: 'Égypte',                  currency: 'EGP', phone: '+20',  region: 'north-africa' },
  { code: 'LY', name: 'Libye',                   currency: 'LYD', phone: '+218', region: 'north-africa' },
  { code: 'MA', name: 'Maroc',                   currency: 'MAD', phone: '+212', region: 'north-africa' },
  { code: 'SD', name: 'Soudan',                  currency: 'SDG', phone: '+249', region: 'north-africa' },
  { code: 'TN', name: 'Tunisie',                 currency: 'TND', phone: '+216', region: 'north-africa' },

  // ── Afrique Australe (5) ─────────────────────────────────────────────────
  { code: 'BW', name: 'Botswana',                currency: 'BWP', phone: '+267', region: 'south-africa' },
  { code: 'LS', name: 'Lesotho',                 currency: 'LSL', phone: '+266', region: 'south-africa' },
  { code: 'NA', name: 'Namibie',                 currency: 'NAD', phone: '+264', region: 'south-africa' },
  { code: 'ZA', name: 'Afrique du Sud',          currency: 'ZAR', phone: '+27',  region: 'south-africa' },
  { code: 'SZ', name: 'Eswatini',                currency: 'SZL', phone: '+268', region: 'south-africa' },

  // ── Moyen-Orient (15) ────────────────────────────────────────────────────
  { code: 'AE', name: 'Émirats arabes unis',     currency: 'AED', phone: '+971', region: 'middle-east' },
  { code: 'BH', name: 'Bahreïn',                 currency: 'BHD', phone: '+973', region: 'middle-east' },
  { code: 'CY', name: 'Chypre',                  currency: 'EUR', phone: '+357', region: 'middle-east' },
  { code: 'IL', name: 'Israël',                  currency: 'ILS', phone: '+972', region: 'middle-east' },
  { code: 'IQ', name: 'Irak',                    currency: 'IQD', phone: '+964', region: 'middle-east' },
  { code: 'IR', name: 'Iran',                    currency: 'IRR', phone: '+98',  region: 'middle-east' },
  { code: 'JO', name: 'Jordanie',                currency: 'JOD', phone: '+962', region: 'middle-east' },
  { code: 'KW', name: 'Koweït',                  currency: 'KWD', phone: '+965', region: 'middle-east' },
  { code: 'LB', name: 'Liban',                   currency: 'LBP', phone: '+961', region: 'middle-east' },
  { code: 'OM', name: 'Oman',                    currency: 'OMR', phone: '+968', region: 'middle-east' },
  { code: 'PS', name: 'Palestine',               currency: 'ILS', phone: '+970', region: 'middle-east' },
  { code: 'QA', name: 'Qatar',                   currency: 'QAR', phone: '+974', region: 'middle-east' },
  { code: 'SA', name: 'Arabie saoudite',         currency: 'SAR', phone: '+966', region: 'middle-east' },
  { code: 'SY', name: 'Syrie',                   currency: 'SYP', phone: '+963', region: 'middle-east' },
  { code: 'YE', name: 'Yémen',                   currency: 'YER', phone: '+967', region: 'middle-east' },

  // ── Europe (47) ──────────────────────────────────────────────────────────
  { code: 'AD', name: 'Andorre',                 currency: 'EUR', phone: '+376', region: 'europe' },
  { code: 'AL', name: 'Albanie',                 currency: 'ALL', phone: '+355', region: 'europe' },
  { code: 'AM', name: 'Arménie',                 currency: 'AMD', phone: '+374', region: 'europe' },
  { code: 'AT', name: 'Autriche',                currency: 'EUR', phone: '+43',  region: 'europe' },
  { code: 'AZ', name: 'Azerbaïdjan',             currency: 'AZN', phone: '+994', region: 'europe' },
  { code: 'BA', name: 'Bosnie-Herzégovine',      currency: 'BAM', phone: '+387', region: 'europe' },
  { code: 'BE', name: 'Belgique',                currency: 'EUR', phone: '+32',  region: 'europe' },
  { code: 'BG', name: 'Bulgarie',                currency: 'BGN', phone: '+359', region: 'europe' },
  { code: 'BY', name: 'Biélorussie',             currency: 'BYN', phone: '+375', region: 'europe' },
  { code: 'CH', name: 'Suisse',                  currency: 'CHF', phone: '+41',  region: 'europe' },
  { code: 'CZ', name: 'Tchéquie',               currency: 'CZK', phone: '+420', region: 'europe' },
  { code: 'DE', name: 'Allemagne',               currency: 'EUR', phone: '+49',  region: 'europe' },
  { code: 'DK', name: 'Danemark',                currency: 'DKK', phone: '+45',  region: 'europe' },
  { code: 'EE', name: 'Estonie',                 currency: 'EUR', phone: '+372', region: 'europe' },
  { code: 'ES', name: 'Espagne',                 currency: 'EUR', phone: '+34',  region: 'europe' },
  { code: 'FI', name: 'Finlande',                currency: 'EUR', phone: '+358', region: 'europe' },
  { code: 'FR', name: 'France',                  currency: 'EUR', phone: '+33',  region: 'europe' },
  { code: 'GB', name: 'Royaume-Uni',             currency: 'GBP', phone: '+44',  region: 'europe' },
  { code: 'GE', name: 'Géorgie',                 currency: 'GEL', phone: '+995', region: 'europe' },
  { code: 'GR', name: 'Grèce',                   currency: 'EUR', phone: '+30',  region: 'europe' },
  { code: 'HR', name: 'Croatie',                 currency: 'EUR', phone: '+385', region: 'europe' },
  { code: 'HU', name: 'Hongrie',                 currency: 'HUF', phone: '+36',  region: 'europe' },
  { code: 'IE', name: 'Irlande',                 currency: 'EUR', phone: '+353', region: 'europe' },
  { code: 'IS', name: 'Islande',                 currency: 'ISK', phone: '+354', region: 'europe' },
  { code: 'IT', name: 'Italie',                  currency: 'EUR', phone: '+39',  region: 'europe' },
  { code: 'LI', name: 'Liechtenstein',           currency: 'CHF', phone: '+423', region: 'europe' },
  { code: 'LT', name: 'Lituanie',                currency: 'EUR', phone: '+370', region: 'europe' },
  { code: 'LU', name: 'Luxembourg',              currency: 'EUR', phone: '+352', region: 'europe' },
  { code: 'LV', name: 'Lettonie',                currency: 'EUR', phone: '+371', region: 'europe' },
  { code: 'MC', name: 'Monaco',                  currency: 'EUR', phone: '+377', region: 'europe' },
  { code: 'MD', name: 'Moldavie',                currency: 'MDL', phone: '+373', region: 'europe' },
  { code: 'ME', name: 'Monténégro',              currency: 'EUR', phone: '+382', region: 'europe' },
  { code: 'MK', name: 'Macédoine du Nord',       currency: 'MKD', phone: '+389', region: 'europe' },
  { code: 'MT', name: 'Malte',                   currency: 'EUR', phone: '+356', region: 'europe' },
  { code: 'NL', name: 'Pays-Bas',                currency: 'EUR', phone: '+31',  region: 'europe' },
  { code: 'NO', name: 'Norvège',                 currency: 'NOK', phone: '+47',  region: 'europe' },
  { code: 'PL', name: 'Pologne',                 currency: 'PLN', phone: '+48',  region: 'europe' },
  { code: 'PT', name: 'Portugal',                currency: 'EUR', phone: '+351', region: 'europe' },
  { code: 'RO', name: 'Roumanie',                currency: 'RON', phone: '+40',  region: 'europe' },
  { code: 'RS', name: 'Serbie',                  currency: 'RSD', phone: '+381', region: 'europe' },
  { code: 'RU', name: 'Russie',                  currency: 'RUB', phone: '+7',   region: 'europe' },
  { code: 'SE', name: 'Suède',                   currency: 'SEK', phone: '+46',  region: 'europe' },
  { code: 'SI', name: 'Slovénie',                currency: 'EUR', phone: '+386', region: 'europe' },
  { code: 'SK', name: 'Slovaquie',               currency: 'EUR', phone: '+421', region: 'europe' },
  { code: 'SM', name: 'Saint-Marin',             currency: 'EUR', phone: '+378', region: 'europe' },
  { code: 'TR', name: 'Turquie',                 currency: 'TRY', phone: '+90',  region: 'europe' },
  { code: 'UA', name: 'Ukraine',                 currency: 'UAH', phone: '+380', region: 'europe' },
  { code: 'VA', name: 'Vatican',                 currency: 'EUR', phone: '+379', region: 'europe' },

  // ── Asie Centrale (6) ────────────────────────────────────────────────────
  { code: 'AF', name: 'Afghanistan',             currency: 'AFN', phone: '+93',  region: 'central-asia' },
  { code: 'KG', name: 'Kirghizistan',            currency: 'KGS', phone: '+996', region: 'central-asia' },
  { code: 'KZ', name: 'Kazakhstan',              currency: 'KZT', phone: '+7',   region: 'central-asia' },
  { code: 'TJ', name: 'Tadjikistan',             currency: 'TJS', phone: '+992', region: 'central-asia' },
  { code: 'TM', name: 'Turkménistan',            currency: 'TMT', phone: '+993', region: 'central-asia' },
  { code: 'UZ', name: 'Ouzbékistan',             currency: 'UZS', phone: '+998', region: 'central-asia' },

  // ── Asie du Sud (7) ──────────────────────────────────────────────────────
  { code: 'BD', name: 'Bangladesh',              currency: 'BDT', phone: '+880', region: 'south-asia' },
  { code: 'BT', name: 'Bhoutan',                 currency: 'BTN', phone: '+975', region: 'south-asia' },
  { code: 'IN', name: 'Inde',                    currency: 'INR', phone: '+91',  region: 'south-asia' },
  { code: 'LK', name: 'Sri Lanka',               currency: 'LKR', phone: '+94',  region: 'south-asia' },
  { code: 'MV', name: 'Maldives',                currency: 'MVR', phone: '+960', region: 'south-asia' },
  { code: 'NP', name: 'Népal',                   currency: 'NPR', phone: '+977', region: 'south-asia' },
  { code: 'PK', name: 'Pakistan',                currency: 'PKR', phone: '+92',  region: 'south-asia' },

  // ── Asie de l'Est (8) ────────────────────────────────────────────────────
  { code: 'CN', name: 'Chine',                   currency: 'CNY', phone: '+86',  region: 'east-asia' },
  { code: 'HK', name: 'Hong Kong',               currency: 'HKD', phone: '+852', region: 'east-asia' },
  { code: 'JP', name: 'Japon',                   currency: 'JPY', phone: '+81',  region: 'east-asia' },
  { code: 'KP', name: 'Corée du Nord',           currency: 'KPW', phone: '+850', region: 'east-asia' },
  { code: 'KR', name: 'Corée du Sud',            currency: 'KRW', phone: '+82',  region: 'east-asia' },
  { code: 'MN', name: 'Mongolie',                currency: 'MNT', phone: '+976', region: 'east-asia' },
  { code: 'MO', name: 'Macao',                   currency: 'MOP', phone: '+853', region: 'east-asia' },
  { code: 'TW', name: 'Taïwan',                  currency: 'TWD', phone: '+886', region: 'east-asia' },

  // ── Asie du Sud-Est (11) ─────────────────────────────────────────────────
  { code: 'BN', name: 'Brunéi',                  currency: 'BND', phone: '+673', region: 'southeast-asia' },
  { code: 'ID', name: 'Indonésie',               currency: 'IDR', phone: '+62',  region: 'southeast-asia' },
  { code: 'KH', name: 'Cambodge',                currency: 'KHR', phone: '+855', region: 'southeast-asia' },
  { code: 'LA', name: 'Laos',                    currency: 'LAK', phone: '+856', region: 'southeast-asia' },
  { code: 'MM', name: 'Myanmar',                 currency: 'MMK', phone: '+95',  region: 'southeast-asia' },
  { code: 'MY', name: 'Malaisie',                currency: 'MYR', phone: '+60',  region: 'southeast-asia' },
  { code: 'PH', name: 'Philippines',             currency: 'PHP', phone: '+63',  region: 'southeast-asia' },
  { code: 'SG', name: 'Singapour',               currency: 'SGD', phone: '+65',  region: 'southeast-asia' },
  { code: 'TH', name: 'Thaïlande',               currency: 'THB', phone: '+66',  region: 'southeast-asia' },
  { code: 'TL', name: 'Timor oriental',          currency: 'USD', phone: '+670', region: 'southeast-asia' },
  { code: 'VN', name: 'Viêt Nam',                currency: 'VND', phone: '+84',  region: 'southeast-asia' },

  // ── Amérique du Nord (3) ─────────────────────────────────────────────────
  { code: 'CA', name: 'Canada',                  currency: 'CAD', phone: '+1',   region: 'north-america' },
  { code: 'MX', name: 'Mexique',                 currency: 'MXN', phone: '+52',  region: 'north-america' },
  { code: 'US', name: 'États-Unis',              currency: 'USD', phone: '+1',   region: 'north-america' },

  // ── Amérique Centrale (7) ────────────────────────────────────────────────
  { code: 'BZ', name: 'Belize',                  currency: 'BZD', phone: '+501', region: 'central-america' },
  { code: 'CR', name: 'Costa Rica',              currency: 'CRC', phone: '+506', region: 'central-america' },
  { code: 'GT', name: 'Guatemala',               currency: 'GTQ', phone: '+502', region: 'central-america' },
  { code: 'HN', name: 'Honduras',                currency: 'HNL', phone: '+504', region: 'central-america' },
  { code: 'NI', name: 'Nicaragua',               currency: 'NIO', phone: '+505', region: 'central-america' },
  { code: 'PA', name: 'Panama',                  currency: 'PAB', phone: '+507', region: 'central-america' },
  { code: 'SV', name: 'Salvador',                currency: 'USD', phone: '+503', region: 'central-america' },

  // ── Caraïbes (13) ────────────────────────────────────────────────────────
  { code: 'AG', name: 'Antigua-et-Barbuda',      currency: 'XCD', phone: '+1',   region: 'caribbean' },
  { code: 'BB', name: 'Barbade',                 currency: 'BBD', phone: '+1',   region: 'caribbean' },
  { code: 'BS', name: 'Bahamas',                 currency: 'BSD', phone: '+1',   region: 'caribbean' },
  { code: 'CU', name: 'Cuba',                    currency: 'CUP', phone: '+53',  region: 'caribbean' },
  { code: 'DM', name: 'Dominique',               currency: 'XCD', phone: '+1',   region: 'caribbean' },
  { code: 'DO', name: 'République dominicaine',  currency: 'DOP', phone: '+1',   region: 'caribbean' },
  { code: 'GD', name: 'Grenade',                 currency: 'XCD', phone: '+1',   region: 'caribbean' },
  { code: 'HT', name: 'Haïti',                   currency: 'HTG', phone: '+509', region: 'caribbean' },
  { code: 'JM', name: 'Jamaïque',                currency: 'JMD', phone: '+1',   region: 'caribbean' },
  { code: 'KN', name: 'Saint-Christophe-et-Niévès', currency: 'XCD', phone: '+1', region: 'caribbean' },
  { code: 'LC', name: 'Sainte-Lucie',            currency: 'XCD', phone: '+1',   region: 'caribbean' },
  { code: 'TT', name: 'Trinité-et-Tobago',       currency: 'TTD', phone: '+1',   region: 'caribbean' },
  { code: 'VC', name: 'Saint-Vincent-et-les-Grenadines', currency: 'XCD', phone: '+1', region: 'caribbean' },

  // ── Amérique du Sud (12) ─────────────────────────────────────────────────
  { code: 'AR', name: 'Argentine',               currency: 'ARS', phone: '+54',  region: 'south-america' },
  { code: 'BO', name: 'Bolivie',                 currency: 'BOB', phone: '+591', region: 'south-america' },
  { code: 'BR', name: 'Brésil',                  currency: 'BRL', phone: '+55',  region: 'south-america' },
  { code: 'CL', name: 'Chili',                   currency: 'CLP', phone: '+56',  region: 'south-america' },
  { code: 'CO', name: 'Colombie',                currency: 'COP', phone: '+57',  region: 'south-america' },
  { code: 'EC', name: 'Équateur',                currency: 'USD', phone: '+593', region: 'south-america' },
  { code: 'GY', name: 'Guyana',                  currency: 'GYD', phone: '+592', region: 'south-america' },
  { code: 'PE', name: 'Pérou',                   currency: 'PEN', phone: '+51',  region: 'south-america' },
  { code: 'PY', name: 'Paraguay',                currency: 'PYG', phone: '+595', region: 'south-america' },
  { code: 'SR', name: 'Suriname',                currency: 'SRD', phone: '+597', region: 'south-america' },
  { code: 'UY', name: 'Uruguay',                 currency: 'UYU', phone: '+598', region: 'south-america' },
  { code: 'VE', name: 'Venezuela',               currency: 'VES', phone: '+58',  region: 'south-america' },

  // ── Océanie (14) ─────────────────────────────────────────────────────────
  { code: 'AU', name: 'Australie',               currency: 'AUD', phone: '+61',  region: 'oceania' },
  { code: 'FJ', name: 'Fidji',                   currency: 'FJD', phone: '+679', region: 'oceania' },
  { code: 'FM', name: 'Micronésie',              currency: 'USD', phone: '+691', region: 'oceania' },
  { code: 'KI', name: 'Kiribati',                currency: 'AUD', phone: '+686', region: 'oceania' },
  { code: 'MH', name: 'Îles Marshall',           currency: 'USD', phone: '+692', region: 'oceania' },
  { code: 'NR', name: 'Nauru',                   currency: 'AUD', phone: '+674', region: 'oceania' },
  { code: 'NZ', name: 'Nouvelle-Zélande',        currency: 'NZD', phone: '+64',  region: 'oceania' },
  { code: 'PG', name: 'Papouasie-Nouvelle-Guinée', currency: 'PGK', phone: '+675', region: 'oceania' },
  { code: 'PW', name: 'Palaos',                  currency: 'USD', phone: '+680', region: 'oceania' },
  { code: 'SB', name: 'Îles Salomon',            currency: 'SBD', phone: '+677', region: 'oceania' },
  { code: 'TO', name: 'Tonga',                   currency: 'TOP', phone: '+676', region: 'oceania' },
  { code: 'TV', name: 'Tuvalu',                  currency: 'AUD', phone: '+688', region: 'oceania' },
  { code: 'VU', name: 'Vanuatu',                 currency: 'VUV', phone: '+678', region: 'oceania' },
  { code: 'WS', name: 'Samoa',                   currency: 'WST', phone: '+685', region: 'oceania' },
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
  'west-africa':     'Afrique de l\'Ouest',
  'central-africa':  'Afrique Centrale',
  'east-africa':     'Afrique de l\'Est',
  'north-africa':    'Afrique du Nord',
  'south-africa':    'Afrique Australe',
  'middle-east':     'Moyen-Orient',
  'europe':          'Europe',
  'north-america':   'Amérique du Nord',
  'central-america': 'Amérique Centrale',
  'caribbean':       'Caraïbes',
  'south-america':   'Amérique du Sud',
  'central-asia':    'Asie Centrale',
  'south-asia':      'Asie du Sud',
  'east-asia':       'Asie de l\'Est',
  'southeast-asia':  'Asie du Sud-Est',
  'oceania':         'Océanie',
}
