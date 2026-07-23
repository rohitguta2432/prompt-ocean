// Turns a plain-English description of the sea into physical ocean parameters.
// Pure JS (no deps) so it runs in Next.js API routes AND `node --test`.

export const DEFAULT_PARAMS = {
  amplitude: 0.6,      // wave height in meters (0.02 – 3)
  choppiness: 0.55,    // 0 flat sine – 1 sharp trochoidal crests
  waveLength: 34,      // dominant wavelength in meters (8 – 120)
  speed: 1.0,          // time multiplier (0.2 – 3)
  windDir: 42,         // degrees, direction waves travel
  foam: 0.35,          // 0 – 1 whitecap intensity
  deepColor: '#0a3d62',
  surfaceColor: '#1f7a8c',
  sunColor: '#fff4d6',
  sunElevation: 35,    // degrees above horizon (negative = night)
  sunAzimuth: 60,      // degrees
  turbidity: 6,        // sky haze for the atmosphere model
};

export const PRESETS = {
  'calm dawn': { amplitude: 0.15, choppiness: 0.2, waveLength: 45, speed: 0.6, foam: 0.05, deepColor: '#123a5c', surfaceColor: '#7fb2c9', sunColor: '#ffd9a0', sunElevation: 6, sunAzimuth: 95, turbidity: 8 },
  'golden sunset': { amplitude: 0.5, choppiness: 0.5, waveLength: 38, speed: 0.8, foam: 0.25, deepColor: '#27222e', surfaceColor: '#c96f2f', sunColor: '#ff9d3c', sunElevation: 4, sunAzimuth: 250, turbidity: 10 },
  'midnight storm': { amplitude: 2.4, choppiness: 0.95, waveLength: 60, speed: 1.6, foam: 0.95, deepColor: '#04070d', surfaceColor: '#12222e', sunColor: '#aebfd6', sunElevation: -8, sunAzimuth: 180, turbidity: 2 },
  'tropical noon': { amplitude: 0.35, choppiness: 0.4, waveLength: 22, speed: 1.0, foam: 0.2, deepColor: '#0a6e8a', surfaceColor: '#35d0ba', sunColor: '#ffffff', sunElevation: 75, sunAzimuth: 40, turbidity: 3 },
};

const CLAMPS = {
  amplitude: [0.02, 3], choppiness: [0, 1], waveLength: [8, 120], speed: [0.2, 3],
  windDir: [0, 360], foam: [0, 1], sunElevation: [-15, 88], sunAzimuth: [0, 360], turbidity: [1, 12],
};

export function clampParams(raw) {
  const out = { ...DEFAULT_PARAMS };
  for (const key of Object.keys(DEFAULT_PARAMS)) {
    const v = raw?.[key];
    if (v === undefined || v === null) continue;
    if (key.endsWith('Color')) {
      if (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)) out[key] = v.toLowerCase();
    } else if (typeof v === 'number' && Number.isFinite(v)) {
      const [lo, hi] = CLAMPS[key];
      out[key] = Math.min(hi, Math.max(lo, v));
    }
  }
  return out;
}

// Each rule: regex → partial params. Later matches override earlier ones,
// so "stormy sunset" gets storm physics + sunset light.
const RULES = [
  [/calm|gentle|glass|still|serene|peaceful|quiet/, { amplitude: 0.12, choppiness: 0.15, foam: 0.05, speed: 0.6 }],
  [/storm|rough|rage|angry|violent|fur(y|ious)|wild/, { amplitude: 2.2, choppiness: 0.9, foam: 0.9, speed: 1.5, waveLength: 55, turbidity: 2 }],
  [/hurricane|typhoon|cyclone|monster/, { amplitude: 3, choppiness: 1, foam: 1, speed: 1.9, waveLength: 70, turbidity: 1.5 }],
  [/chop(py)?|whitecaps?|windy|breez/, { choppiness: 0.85, foam: 0.6, amplitude: 0.9 }],
  [/big|huge|giant|massive|tall|swell/, { amplitude: 1.8, waveLength: 75 }],
  [/ripple|tiny|small|pond/, { amplitude: 0.08, waveLength: 12, foam: 0 }],
  [/slow|lazy|drift/, { speed: 0.45 }],
  [/fast|racing|rushing/, { speed: 2.2 }],
  [/sunset|dusk|golden|evening/, { sunElevation: 4, sunAzimuth: 250, sunColor: '#ff9d3c', surfaceColor: '#c96f2f', deepColor: '#27222e', turbidity: 10 }],
  [/sunrise|dawn|morning/, { sunElevation: 6, sunAzimuth: 95, sunColor: '#ffd9a0', surfaceColor: '#7fb2c9', deepColor: '#123a5c', turbidity: 8 }],
  [/night|midnight|moon|dark|starr?y/, { sunElevation: -8, sunColor: '#aebfd6', surfaceColor: '#12222e', deepColor: '#04070d', turbidity: 2 }],
  [/noon|midday|bright|sunny/, { sunElevation: 75, sunColor: '#ffffff', turbidity: 3 }],
  [/tropical|lagoon|turquoise|caribbean|reef|paradise/, { surfaceColor: '#35d0ba', deepColor: '#0a6e8a', waveLength: 22, turbidity: 3 }],
  [/arctic|ic(e|y)|frozen|polar|cold/, { surfaceColor: '#a8c6d4', deepColor: '#16303c', sunColor: '#e8f2ff', sunElevation: 12, foam: 0.15, turbidity: 9 }],
  [/emerald|green/, { surfaceColor: '#2e8b6f', deepColor: '#0c3b2e' }],
  [/black|ink/, { surfaceColor: '#1a1a22', deepColor: '#050508' }],
  [/blood|red|crimson/, { surfaceColor: '#8a2f2f', deepColor: '#2e0a0a' }],
  [/fog|mist|haz(e|y)/, { turbidity: 12 }],
];

export function interpretWithRules(prompt) {
  const text = String(prompt || '').toLowerCase();
  let params = { ...DEFAULT_PARAMS };
  const matched = [];
  for (const [re, patch] of RULES) {
    if (re.test(text)) {
      params = { ...params, ...patch };
      matched.push(re.source.split('|')[0].replace(/[^a-z]/g, ''));
    }
  }
  return { params: clampParams(params), matched, source: 'rules' };
}
