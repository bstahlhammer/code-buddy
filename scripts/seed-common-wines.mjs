#!/usr/bin/env node
/**
 * Seed ~130 curated common restaurant wines into the Supabase wine_catalog.
 * Uses the same WE → honest quality score mapping as import_wine_catalog.py.
 *
 * Usage:
 *   SUPABASE_URL=https://... SUPABASE_SERVICE_KEY=sb_secret_... node scripts/seed-common-wines.mjs
 *
 * Safe to re-run — uses ON CONFLICT DO NOTHING (ignores existing rows).
 */

const SUPABASE_URL        = process.env.SUPABASE_URL        || 'https://bromlnbihmfknqcdbieq.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌  SUPABASE_SERVICE_KEY is required.')
  console.error('    Export it in your shell: export SUPABASE_SERVICE_KEY="sb_secret_..."')
  process.exit(1)
}

// ── Quality score mapping (mirrors Python _WE_MAP) ─────────────────────────

const WE_MAP = [
  [75, 8], [78, 15], [80, 23], [82, 33], [84, 42],
  [85, 48], [86, 53], [87, 58], [88, 63], [89, 68],
  [90, 74], [91, 79], [92, 84], [93, 88], [94, 91],
  [95, 94], [97, 96], [99, 99], [100, 100],
]

function weToQuality(score) {
  if (score == null) return null
  if (score <= WE_MAP[0][0]) return WE_MAP[0][1]
  for (let i = 0; i < WE_MAP.length - 1; i++) {
    const [loS, loQ] = WE_MAP[i]
    const [hiS, hiQ] = WE_MAP[i + 1]
    if (score >= loS && score <= hiS) {
      const t = (score - loS) / (hiS - loS)
      return Math.round(loQ + t * (hiQ - loQ))
    }
  }
  return 100
}

// ── Palate profiles [body, sweetness, tannin, acidity] ─────────────────────

const P = {
  cab:      [88, 12, 82, 58],
  merlot:   [65, 22, 55, 55],
  pinot:    [45, 18, 30, 75],
  zin:      [80, 35, 65, 52],
  syrah:    [80, 18, 72, 55],
  nebbiolo: [75,  8, 85, 80],
  sangiovese:[60, 10, 72, 78],
  tempranillo:[68,12, 70, 65],
  bdx:      [78, 10, 75, 60],  // Bordeaux/meritage blend
  chardonnay:[62, 18,  8, 62],
  sauv_blanc:[32,  8,  5, 85],
  riesling: [28, 45,  4, 90],
  pinot_gris:[28, 10,  4, 70],
  sparkle:  [32, 18,  8, 82],
  rose:     [32, 22, 12, 72],
  amarone:  [90, 20, 85, 58],
}

function palate(key) {
  const [body, sweetness, tannin, acidity] = P[key] ?? [50, 20, 40, 60]
  return { body, sweetness, tannin, acidity }
}

// ── Wine list ───────────────────────────────────────────────────────────────
// Each entry: [name, producer, vintage|null, region, country, grape_label, color, we_score, price_usd, palate_key]

const RAW = [
  // ── California Cabernet / Bordeaux blends ──────────────────────────────
  ['Cabernet Sauvignon',           'Caymus Vineyards',        null, 'Napa Valley',       'USA', 'Cabernet Sauvignon', 'red', 93, 75,  'cab'],
  ['Cabernet Sauvignon',           'Jordan Vineyard & Winery',null, 'Alexander Valley',  'USA', 'Cabernet Sauvignon', 'red', 92, 65,  'cab'],
  ['Napa Valley Cabernet Sauvignon','Silver Oak',              null, 'Napa Valley',       'USA', 'Cabernet Sauvignon', 'red', 93, 120, 'cab'],
  ['Alexander Valley Cabernet Sauvignon','Silver Oak',         null, 'Alexander Valley',  'USA', 'Cabernet Sauvignon', 'red', 92, 65,  'cab'],
  ['Cabernet Sauvignon Artemis',   'Stag\'s Leap Wine Cellars',null,'Napa Valley',       'USA', 'Cabernet Sauvignon', 'red', 91, 65,  'cab'],
  ['Cask 23',                      'Stag\'s Leap Wine Cellars',null,'Napa Valley',       'USA', 'Cabernet Sauvignon', 'red', 96, 225, 'cab'],
  ['Opus One',                     'Opus One',                null, 'Napa Valley',       'USA', 'Bordeaux Blend',     'red', 97, 375, 'bdx'],
  ['Screaming Eagle Cabernet',     'Screaming Eagle',         null, 'Napa Valley',       'USA', 'Cabernet Sauvignon', 'red',100,3200, 'cab'],
  ['Private Reserve Cabernet',     'Beringer',                null, 'Napa Valley',       'USA', 'Cabernet Sauvignon', 'red', 96, 130, 'cab'],
  ['Reserve Cabernet Sauvignon',   'Robert Mondavi',          null, 'Napa Valley',       'USA', 'Cabernet Sauvignon', 'red', 92, 115, 'cab'],
  ['Cabernet Sauvignon',           'Far Niente',              null, 'Napa Valley',       'USA', 'Cabernet Sauvignon', 'red', 94, 160, 'cab'],
  ['Cabernet Sauvignon',           'Duckhorn Vineyards',      null, 'Napa Valley',       'USA', 'Cabernet Sauvignon', 'red', 93, 90,  'cab'],
  ['Merlot',                       'Duckhorn Vineyards',      null, 'Napa Valley',       'USA', 'Merlot',             'red', 92, 65,  'merlot'],
  ['Insignia',                     'Joseph Phelps',           null, 'Napa Valley',       'USA', 'Bordeaux Blend',     'red', 97, 275, 'bdx'],
  ['Dominus',                      'Dominus Estate',          null, 'Napa Valley',       'USA', 'Bordeaux Blend',     'red', 96, 225, 'bdx'],
  ['Hillside Select Cabernet',     'Shafer Vineyards',        null, 'Stags Leap District','USA','Cabernet Sauvignon', 'red', 97, 350, 'cab'],
  ['Monte Bello',                  'Ridge Vineyards',         null, 'Santa Cruz Mountains','USA','Cabernet Sauvignon','red', 97, 225, 'cab'],
  ['Harlan Estate',                'Harlan Estate',           null, 'Napa Valley',       'USA', 'Bordeaux Blend',     'red', 99,1500, 'bdx'],
  ['Soul of a Lion',               'DAOU Vineyards',          null, 'Paso Robles',       'USA', 'Bordeaux Blend',     'red', 97, 140, 'bdx'],
  ['Cabernet Sauvignon',           'Frank Family Vineyards',  null, 'Napa Valley',       'USA', 'Cabernet Sauvignon', 'red', 92, 85,  'cab'],
  ['Cabernet Sauvignon',           'Cakebread Cellars',       null, 'Napa Valley',       'USA', 'Cabernet Sauvignon', 'red', 91, 90,  'cab'],
  ['Palermo',                      'Orin Swift',              null, 'Napa Valley',       'USA', 'Cabernet Sauvignon', 'red', 92, 65,  'cab'],
  ['8 Years in the Desert',        'Orin Swift',              null, 'California',        'USA', 'Red Blend',          'red', 90, 32,  'bdx'],
  ['The Prisoner',                 'The Prisoner Wine Company',null,'Napa Valley',       'USA', 'Red Blend',          'red', 90, 42,  'zin'],
  ['Cabernet Sauvignon',           'Josh Cellars',            null, 'California',        'USA', 'Cabernet Sauvignon', 'red', 87, 15,  'cab'],
  ['Red Blend',                    'Apothic',                 null, 'California',        'USA', 'Red Blend',          'red', 84, 12,  'bdx'],
  // ── California Chardonnay ─────────────────────────────────────────────
  ['Chardonnay',                   'Far Niente',              null, 'Napa Valley',       'USA', 'Chardonnay',         'white', 93, 85,  'chardonnay'],
  ['Chardonnay',                   'Cakebread Cellars',       null, 'Napa Valley',       'USA', 'Chardonnay',         'white', 90, 55,  'chardonnay'],
  ['Karia Chardonnay',             'Stag\'s Leap Wine Cellars',null,'Napa Valley',       'USA', 'Chardonnay',         'white', 91, 45,  'chardonnay'],
  ['Chardonnay',                   'Rombauer Vineyards',      null, 'Carneros',          'USA', 'Chardonnay',         'white', 90, 40,  'chardonnay'],
  ['Russian River Ranches Chardonnay','Sonoma-Cutrer',        null, 'Russian River Valley','USA','Chardonnay',        'white', 90, 35,  'chardonnay'],
  ['Vintner\'s Reserve Chardonnay','Kendall-Jackson',         null, 'California',        'USA', 'Chardonnay',         'white', 88, 18,  'chardonnay'],
  ['Chardonnay',                   'Lewis Cellars',           null, 'Napa Valley',       'USA', 'Chardonnay',         'white', 93, 65,  'chardonnay'],
  ['Chardonnay',                   'Kongsgaard',              null, 'Napa Valley',       'USA', 'Chardonnay',         'white', 95, 125, 'chardonnay'],
  // ── California Pinot Noir ──────────────────────────────────────────────
  ['Pinot Noir',                   'La Crema',                null, 'Sonoma Coast',      'USA', 'Pinot Noir',         'red', 90, 22,  'pinot'],
  ['Pinot Noir',                   'Meiomi',                  null, 'California',        'USA', 'Pinot Noir',         'red', 87, 20,  'pinot'],
  ['Pinot Noir',                   'Mark West',               null, 'California',        'USA', 'Pinot Noir',         'red', 86, 15,  'pinot'],
  ['Pinot Noir',                   'Flowers',                 null, 'Sonoma Coast',      'USA', 'Pinot Noir',         'red', 93, 75,  'pinot'],
  ['Sonoma Coast Pinot Noir',      'Kosta Browne',            null, 'Sonoma Coast',      'USA', 'Pinot Noir',         'red', 93, 90,  'pinot'],
  ['Russian River Valley Pinot Noir','Williams Selyem',       null, 'Russian River Valley','USA','Pinot Noir',        'red', 95, 85,  'pinot'],
  ['Russian River Valley Pinot Noir','Gary Farrell',          null, 'Russian River Valley','USA','Pinot Noir',        'red', 92, 48,  'pinot'],
  ['Pinot Noir',                   'Merry Edwards',           null, 'Russian River Valley','USA','Pinot Noir',        'red', 92, 55,  'pinot'],
  ['San Simeon Pinot Noir',        'Hirsch Vineyards',        null, 'Sonoma Coast',      'USA', 'Pinot Noir',         'red', 94, 85,  'pinot'],
  // ── Oregon ────────────────────────────────────────────────────────────
  ['Pinot Noir',                   'Domaine Drouhin Oregon',  null, 'Willamette Valley', 'USA', 'Pinot Noir',         'red', 92, 55,  'pinot'],
  ['Pinot Noir',                   'A to Z Wineworks',        null, 'Oregon',            'USA', 'Pinot Noir',         'red', 87, 18,  'pinot'],
  ['Pinot Noir',                   'Elk Cove Vineyards',      null, 'Willamette Valley', 'USA', 'Pinot Noir',         'red', 91, 35,  'pinot'],
  ['Pinot Noir',                   'Adelsheim Vineyard',      null, 'Willamette Valley', 'USA', 'Pinot Noir',         'red', 90, 30,  'pinot'],
  ['Pinot Noir',                   'Penner-Ash Wine Cellars', null, 'Willamette Valley', 'USA', 'Pinot Noir',         'red', 93, 55,  'pinot'],
  ['Pinot Noir',                   'Ponzi Vineyards',         null, 'Willamette Valley', 'USA', 'Pinot Noir',         'red', 92, 42,  'pinot'],
  // ── Washington ────────────────────────────────────────────────────────
  ['Columbia Valley Cabernet',     'Chateau Ste. Michelle',   null, 'Columbia Valley',   'USA', 'Cabernet Sauvignon', 'red', 90, 20,  'cab'],
  ['Eroica Riesling',              'Chateau Ste. Michelle',   null, 'Columbia Valley',   'USA', 'Riesling',           'white', 92, 22, 'riesling'],
  ['Cabernet Sauvignon',           'L\'Ecole No. 41',         null, 'Walla Walla Valley','USA', 'Cabernet Sauvignon', 'red', 92, 48,  'cab'],
  ['Cabernet Sauvignon',           'Leonetti Cellar',         null, 'Walla Walla Valley','USA', 'Cabernet Sauvignon', 'red', 95, 125, 'cab'],
  ['Cabernet Sauvignon',           'Quilceda Creek',          null, 'Columbia Valley',   'USA', 'Cabernet Sauvignon', 'red', 97, 165, 'cab'],
  // ── France — Bordeaux ─────────────────────────────────────────────────
  ['Château Margaux',              'Château Margaux',         null, 'Margaux',           'France','Bordeaux Blend',   'red', 97,1100, 'bdx'],
  ['Château Mouton Rothschild',    'Château Mouton Rothschild',null,'Pauillac',          'France','Bordeaux Blend',   'red', 97, 900, 'bdx'],
  ['Château Latour',               'Château Latour',          null, 'Pauillac',          'France','Bordeaux Blend',   'red', 97, 950, 'bdx'],
  ['Château Lafite Rothschild',    'Château Lafite Rothschild',null,'Pauillac',          'France','Bordeaux Blend',   'red', 97, 900, 'bdx'],
  ['Château Haut-Brion',           'Château Haut-Brion',      null, 'Pessac-Léognan',    'France','Bordeaux Blend',   'red', 97, 700, 'bdx'],
  ['Pétrus',                       'Pétrus',                  null, 'Pomerol',           'France','Merlot',           'red', 99,3500, 'merlot'],
  ['Château Cheval Blanc',         'Château Cheval Blanc',    null, 'Saint-Émilion',     'France','Bordeaux Blend',   'red', 97,1500, 'bdx'],
  ['Château Lynch-Bages',          'Château Lynch-Bages',     null, 'Pauillac',          'France','Bordeaux Blend',   'red', 93, 145, 'bdx'],
  ['Château Léoville-Barton',      'Château Léoville-Barton', null, 'Saint-Julien',      'France','Bordeaux Blend',   'red', 94, 120, 'bdx'],
  ['Château Cos d\'Estournel',     'Château Cos d\'Estournel',null, 'Saint-Estèphe',     'France','Bordeaux Blend',   'red', 95, 200, 'bdx'],
  ['Château Pichon Baron',         'Château Pichon Baron',    null, 'Pauillac',          'France','Bordeaux Blend',   'red', 95, 175, 'bdx'],
  ['Château Palmer',               'Château Palmer',          null, 'Margaux',           'France','Bordeaux Blend',   'red', 95, 290, 'bdx'],
  ['Château Pontet-Canet',         'Château Pontet-Canet',    null, 'Pauillac',          'France','Bordeaux Blend',   'red', 96, 160, 'bdx'],
  ['Château Léoville-Las Cases',   'Château Léoville-Las Cases',null,'Saint-Julien',     'France','Bordeaux Blend',   'red', 96, 225, 'bdx'],
  // ── France — Burgundy ─────────────────────────────────────────────────
  ['La Tâche',                     'Domaine de la Romanée-Conti',null,'Vosne-Romanée',   'France','Pinot Noir',       'red', 99,8000, 'pinot'],
  ['Gevrey-Chambertin',            'Louis Jadot',             null, 'Gevrey-Chambertin', 'France','Pinot Noir',       'red', 90, 55,  'pinot'],
  ['Chambolle-Musigny',            'Faiveley',                null, 'Chambolle-Musigny', 'France','Pinot Noir',       'red', 91, 65,  'pinot'],
  ['Vosne-Romanée',                'Joseph Drouhin',          null, 'Vosne-Romanée',     'France','Pinot Noir',       'red', 92, 85,  'pinot'],
  ['Corton-Charlemagne Grand Cru', 'Maison Louis Latour',     null, 'Corton',            'France','Chardonnay',       'white',93,150, 'chardonnay'],
  // ── France — Champagne ────────────────────────────────────────────────
  ['Dom Pérignon',                 'Dom Pérignon',            null, 'Champagne',         'France','Champagne Blend',  'sparkling', 96, 180, 'sparkle'],
  ['Grande Cuvée',                 'Krug',                    null, 'Champagne',         'France','Champagne Blend',  'sparkling', 97, 220, 'sparkle'],
  ['Special Cuvée Brut',           'Bollinger',               null, 'Champagne',         'France','Champagne Blend',  'sparkling', 93,  70, 'sparkle'],
  ['Yellow Label Brut',            'Veuve Clicquot',          null, 'Champagne',         'France','Champagne Blend',  'sparkling', 91,  55, 'sparkle'],
  ['Impérial Brut',                'Moët & Chandon',          null, 'Champagne',         'France','Champagne Blend',  'sparkling', 89,  55, 'sparkle'],
  ['Cuvée Rosé Brut',              'Laurent-Perrier',         null, 'Champagne',         'France','Champagne Blend',  'sparkling', 92,  90, 'sparkle'],
  ['Blanc de Blancs',              'Ruinart',                 null, 'Champagne',         'France','Chardonnay',       'sparkling', 93,  90, 'sparkle'],
  ['Brut Rosé',                    'Billecart-Salmon',        null, 'Champagne',         'France','Champagne Blend',  'sparkling', 94, 110, 'sparkle'],
  ['Brut La Française',            'Taittinger',              null, 'Champagne',         'France','Champagne Blend',  'sparkling', 91,  55, 'sparkle'],
  ['Brut Réserve',                 'Pol Roger',               null, 'Champagne',         'France','Champagne Blend',  'sparkling', 93,  65, 'sparkle'],
  ['Cristal',                      'Louis Roederer',          null, 'Champagne',         'France','Champagne Blend',  'sparkling', 97, 265, 'sparkle'],
  ['Brut Premier',                 'Louis Roederer',          null, 'Champagne',         'France','Champagne Blend',  'sparkling', 93,  55, 'sparkle'],
  ['Fleur de Champagne Brut',      'Perrier-Jouët',           null, 'Champagne',         'France','Champagne Blend',  'sparkling', 93,  55, 'sparkle'],
  ['Brut',                         'Nicolas Feuillatte',      null, 'Champagne',         'France','Champagne Blend',  'sparkling', 87,  30, 'sparkle'],
  // ── Italy ─────────────────────────────────────────────────────────────
  ['Sassicaia',                    'Tenuta San Guido',        null, 'Bolgheri',          'Italy','Cabernet Sauvignon','red', 97, 220, 'bdx'],
  ['Tignanello',                   'Antinori',                null, 'Tuscany',           'Italy','Sangiovese',        'red', 95, 110, 'sangiovese'],
  ['Ornellaia',                    'Tenuta dell\'Ornellaia',  null, 'Bolgheri',          'Italy','Bordeaux Blend',    'red', 96, 220, 'bdx'],
  ['Solaia',                       'Antinori',                null, 'Tuscany',           'Italy','Cabernet Sauvignon','red', 97, 225, 'bdx'],
  ['Barbaresco',                   'Gaja',                    null, 'Barbaresco',        'Italy','Nebbiolo',          'red', 97, 290, 'nebbiolo'],
  ['Barolo Monfortino Riserva',    'Giacomo Conterno',        null, 'Barolo',            'Italy','Nebbiolo',          'red', 99, 600, 'nebbiolo'],
  ['Barolo',                       'Bruno Giacosa',           null, 'Barolo',            'Italy','Nebbiolo',          'red', 97, 200, 'nebbiolo'],
  ['Barolo',                       'Pio Cesare',              null, 'Barolo',            'Italy','Nebbiolo',          'red', 92,  65, 'nebbiolo'],
  ['Brunello di Montalcino',       'Biondi-Santi',            null, 'Montalcino',        'Italy','Sangiovese',        'red', 96, 250, 'sangiovese'],
  ['Brunello di Montalcino',       'Banfi',                   null, 'Montalcino',        'Italy','Sangiovese',        'red', 93,  80, 'sangiovese'],
  ['Chianti Classico Riserva Ducale','Ruffino',               null, 'Chianti Classico',  'Italy','Sangiovese',        'red', 92,  30, 'sangiovese'],
  ['Costasera Amarone',            'Masi',                    null, 'Amarone della Valpolicella','Italy','Corvina',   'red', 93, 75, 'amarone'],
  ['Amarone della Valpolicella',   'Allegrini',               null, 'Valpolicella',      'Italy','Corvina',           'red', 94,  95, 'amarone'],
  ['Pinot Grigio',                 'Santa Margherita',        null, 'Alto Adige',        'Italy','Pinot Grigio',      'white', 88, 22, 'pinot_gris'],
  // ── Spain ─────────────────────────────────────────────────────────────
  ['Unico',                        'Vega Sicilia',            null, 'Ribera del Duero',  'Spain','Tempranillo',       'red', 99, 450, 'tempranillo'],
  ['Gran Reserva 904',             'La Rioja Alta',           null, 'Rioja',             'Spain','Tempranillo',       'red', 93,  55, 'tempranillo'],
  ['Prado Enea Gran Reserva',      'Bodegas Muga',            null, 'Rioja',             'Spain','Tempranillo',       'red', 93,  65, 'tempranillo'],
  ['Reserva Rioja',                'Marqués de Riscal',       null, 'Rioja',             'Spain','Tempranillo',       'red', 90,  22, 'tempranillo'],
  ['Imperial Rioja Gran Reserva',  'CVNE',                    null, 'Rioja',             'Spain','Tempranillo',       'red', 91,  45, 'tempranillo'],
  ['Rioja Reserva',                'Bodegas Muga',            null, 'Rioja',             'Spain','Tempranillo',       'red', 92,  35, 'tempranillo'],
  ['Pingus',                       'Dominio de Pingus',       null, 'Ribera del Duero',  'Spain','Tempranillo',       'red', 99, 700, 'tempranillo'],
  // ── New Zealand & Australia ────────────────────────────────────────────
  ['Sauvignon Blanc',              'Kim Crawford',            null, 'Marlborough',       'New Zealand','Sauvignon Blanc','white', 88, 15, 'sauv_blanc'],
  ['Sauvignon Blanc',              'Cloudy Bay',              null, 'Marlborough',       'New Zealand','Sauvignon Blanc','white', 90, 28, 'sauv_blanc'],
  ['Grange',                       'Penfolds',                null, 'South Australia',   'Australia','Shiraz',         'red', 99, 850, 'syrah'],
  ['Bin 389 Cabernet Shiraz',      'Penfolds',                null, 'South Australia',   'Australia','Cabernet Shiraz','red', 94,  50, 'syrah'],
  ['Art Series Chardonnay',        'Leeuwin Estate',          null, 'Margaret River',    'Australia','Chardonnay',     'white', 95, 90, 'chardonnay'],
  // ── Rosé ──────────────────────────────────────────────────────────────
  ['Whispering Angel',             'Château d\'Esclans',      null, 'Côtes de Provence', 'France','Grenache Rosé',    'rosé', 89, 25, 'rose'],
  ['Miraval Rosé',                 'Château Miraval',         null, 'Côtes de Provence', 'France','Grenache Rosé',    'rosé', 90, 25, 'rose'],
  ['Rock Angel',                   'Château d\'Esclans',      null, 'Côtes de Provence', 'France','Grenache Rosé',    'rosé', 90, 40, 'rose'],
  ['Garrus',                       'Château d\'Esclans',      null, 'Côtes de Provence', 'France','Grenache Rosé',    'rosé', 94,115, 'rose'],
  // ── Whites — Other ────────────────────────────────────────────────────
  ['Riesling Spätlese',            'Dr. Loosen',              null, 'Mosel',             'Germany','Riesling',        'white', 92, 25, 'riesling'],
  ['Riesling',                     'Egon Müller',             null, 'Mosel',             'Germany','Riesling',        'white', 97,150, 'riesling'],
  ['Chablis Premier Cru',          'William Fèvre',           null, 'Chablis',           'France','Chardonnay',       'white', 92, 35, 'chardonnay'],
  ['Pouilly-Fumé',                 'Didier Dagueneau',        null, 'Pouilly-Fumé',      'France','Sauvignon Blanc',  'white', 95, 90, 'sauv_blanc'],
]

// ── Build rows ──────────────────────────────────────────────────────────────

const rows = RAW.map(([name, producer, vintage, region, country, grape, color, we_score, price_usd, palate_key]) => ({
  name,
  producer,
  vintage:       vintage ?? null,
  region,
  country,
  grape,
  color,
  critic_score:  we_score,
  quality_score: weToQuality(we_score),
  price_usd,
  source:        'manual',
  source_id:     `manual:${name.toLowerCase().replace(/\s+/g,'_')}:${producer.toLowerCase().replace(/\s+/g,'_')}`,
  ...palate(palate_key),
}))

// ── Upsert to Supabase ──────────────────────────────────────────────────────

const BATCH = 50

async function upsertBatch(batch, n) {
  let res
  try {
    res = await fetch(`${SUPABASE_URL}/rest/v1/wine_catalog`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify(batch),
    })
  } catch (err) {
    throw new Error(`Batch ${n} network error: ${err.message}\n  → Check that SUPABASE_URL is reachable and your key is a valid eyJ... JWT.`)
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Batch ${n} failed (HTTP ${res.status}): ${text}`)
  }
}

async function clearExisting() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/wine_catalog?id=gte.0`, {
    method: 'DELETE',
    headers: {
      'apikey':        SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer':        'return=minimal',
    },
  })
  if (!res.ok) {
    const text = await res.text()
    console.warn(`  Warning: could not clear table: ${text}`)
  } else {
    console.log('  Cleared all existing rows.')
  }
}

async function main() {
  console.log(`Seeding ${rows.length} wines into ${SUPABASE_URL}...\n`)
  await clearExisting()

  let inserted = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const n     = Math.floor(i / BATCH) + 1
    await upsertBatch(batch, n)
    inserted += batch.length
    process.stdout.write(`  ✓ ${inserted}/${rows.length}\r`)
  }

  console.log(`\n✅  Done — ${rows.length} wines seeded (duplicates skipped).`)
  console.log('\nQuality score distribution:')
  const buckets = { '≥94 Extraordinary': 0, '≥88 Outstanding': 0, '≥84 Highly rated': 0, '≥74 Solid': 0, '<74 Below': 0 }
  for (const r of rows) {
    const q = r.quality_score
    if (q >= 94) buckets['≥94 Extraordinary']++
    else if (q >= 88) buckets['≥88 Outstanding']++
    else if (q >= 84) buckets['≥84 Highly rated']++
    else if (q >= 74) buckets['≥74 Solid']++
    else buckets['<74 Below']++
  }
  for (const [label, count] of Object.entries(buckets)) {
    console.log(`  ${label}: ${count}`)
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
