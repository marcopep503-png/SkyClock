// Sky Clock for Windows: the same widget code, saving its settings in this app's own storage.
const GM_getValue = (k, d) => { try { const v = localStorage.getItem('skyclock:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
const GM_setValue = (k, v) => { try { if (window.__wwSync) return; localStorage.setItem('skyclock:' + k, JSON.stringify(v)); } catch (e) {} };
// Credit: some visual elements are borrowed from the "Sky Clock" website (skyclock).
(() => {
'use strict';
// ---------- where you are: every US time zone, each with a representative city for the sunrise maths ----------
// (sunrise differs a little across a big zone, so "Find my location" refines it to your own latitude and longitude)
const US_LOCS = [
 { id: 'tallahassee', label: 'Eastern · Tallahassee, FL (original)', city: 'Tallahassee', short: 'Eastern', zone: 'Eastern Time', tz: 'America/New_York', lat: 30.4383, lon: -84.2807 },
 { id: 'eastern', label: 'Eastern · New York, NY', city: 'New York', short: 'Eastern', zone: 'Eastern Time', tz: 'America/New_York', lat: 40.7128, lon: -74.006 },
 { id: 'central', label: 'Central · Chicago, IL', city: 'Chicago', short: 'Central', zone: 'Central Time', tz: 'America/Chicago', lat: 41.8781, lon: -87.6298 },
 { id: 'mountain', label: 'Mountain · Denver, CO', city: 'Denver', short: 'Mountain', zone: 'Mountain Time', tz: 'America/Denver', lat: 39.7392, lon: -104.9903 },
 { id: 'arizona', label: 'Mountain, no daylight saving · Phoenix, AZ', city: 'Phoenix', short: 'Arizona', zone: 'Mountain Standard Time (Arizona, no daylight saving)', tz: 'America/Phoenix', lat: 33.4484, lon: -112.074 },
 { id: 'pacific', label: 'Pacific · Los Angeles, CA', city: 'Los Angeles', short: 'Pacific', zone: 'Pacific Time', tz: 'America/Los_Angeles', lat: 34.0522, lon: -118.2437 },
 { id: 'alaska', label: 'Alaska · Anchorage, AK', city: 'Anchorage', short: 'Alaska', zone: 'Alaska Time', tz: 'America/Anchorage', lat: 61.2181, lon: -149.9003 },
 { id: 'hawaii', label: 'Hawaii · Honolulu, HI', city: 'Honolulu', short: 'Hawaii', zone: 'Hawaii Time (no daylight saving)', tz: 'Pacific/Honolulu', lat: 21.3069, lon: -157.8583 },
 { id: 'aleutian', label: 'Hawaii-Aleutian · Adak, AK', city: 'Adak', short: 'Aleutian', zone: 'Hawaii-Aleutian Time', tz: 'America/Adak', lat: 51.88, lon: -176.658 },
 { id: 'atlantic', label: 'Atlantic · San Juan, Puerto Rico', city: 'San Juan', short: 'Atlantic', zone: 'Atlantic Time (Puerto Rico & US Virgin Islands, no daylight saving)', tz: 'America/Puerto_Rico', lat: 18.4655, lon: -66.1057 },
 { id: 'chamorro', label: 'Chamorro · Hagåtña, Guam', city: 'Hagåtña', short: 'Chamorro', zone: 'Chamorro Time (Guam & Northern Mariana Islands)', tz: 'Pacific/Guam', lat: 13.4443, lon: 144.7937 },
 { id: 'samoa', label: 'Samoa · Pago Pago, American Samoa', city: 'Pago Pago', short: 'Samoa', zone: 'Samoa Time (American Samoa)', tz: 'Pacific/Pago_Pago', lat: -14.2756, lon: -170.702 },
];
// the zone names a device reports, matched to the list above (used only the first time, before you pick one)
const DETECT = { 'America/New_York': 'eastern', 'America/Detroit': 'eastern', 'America/Kentucky/Louisville': 'eastern', 'America/Indiana/Indianapolis': 'eastern', 'America/Chicago': 'central', 'America/Menominee': 'central', 'America/Indiana/Knox': 'central', 'America/Denver': 'mountain', 'America/Boise': 'mountain', 'America/Phoenix': 'arizona', 'America/Los_Angeles': 'pacific', 'America/Anchorage': 'alaska', 'America/Juneau': 'alaska', 'America/Sitka': 'alaska', 'America/Nome': 'alaska', 'Pacific/Honolulu': 'hawaii', 'America/Adak': 'aleutian', 'America/Puerto_Rico': 'atlantic', 'America/St_Thomas': 'atlantic', 'Pacific/Guam': 'chamorro', 'Pacific/Saipan': 'chamorro', 'Pacific/Pago_Pago': 'samoa' };
let loc = US_LOCS[0];
try {
  const v = JSON.parse(GM_getValue('loc', 'null'));
  if (v && v.id === 'gps' && isFinite(v.lat) && isFinite(v.lon) && v.tz) { new Intl.DateTimeFormat('en-US', { timeZone: v.tz }); loc = { id: 'gps', label: '📍 My location', city: String(v.city || 'your location'), short: 'your location', zone: 'Your device time zone', tz: v.tz, lat: +v.lat, lon: +v.lon }; }
  else if (v && US_LOCS.some(x => x.id === v.id)) loc = US_LOCS.find(x => x.id === v.id);
  else { const d = DETECT[Intl.DateTimeFormat().resolvedOptions().timeZone]; if (d) loc = US_LOCS.find(x => x.id === d); }
} catch (e) {}
let TZ = loc.tz, LAT = loc.lat, LON = loc.lon;
const R = Math.PI / 180;
const locName = () => (loc.id === 'gps' ? 'your location' : loc.city);   // shown in the Day and night titles (the city a lookup guesses is only approximate)
const F = o => new Intl.DateTimeFormat('en-US', { timeZone: TZ, ...o });
let tf, df, hf, ymd, clk, wkf, pmFmtDay, tzn;
const mkFmts = () => {   // rebuilt whenever you change location
  tf = F({ hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  df = F({ weekday: 'long', month: 'long', day: 'numeric' });
  hf = F({ hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' });
  ymd = F({ year: 'numeric', month: 'numeric', day: 'numeric' });
  clk = F({ hour: 'numeric', minute: '2-digit' });
  wkf = F({ weekday: 'short', hour: 'numeric', minute: '2-digit' });
  pmFmtDay = F({ weekday: 'short', month: 'short', day: 'numeric' });
  tzn = F({ timeZoneName: 'short' });
};
mkFmts();

// ---------- helpers (no innerHTML: AI Studio enforces Trusted Types) ----------
const h = (tag, cls, text, ...kids) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  if (kids.length) e.append(...kids);
  return e;
};
const p2 = n => String(n).padStart(2, '0');
const hl = (H, M) => (H % 12 || 12) + ':' + p2(M) + ' ' + (H < 12 ? 'AM' : 'PM');
const fmt = s => { const H = Math.floor(s / 3600), M = Math.floor(s % 3600 / 60); return (H ? H + 'h ' : '') + M + 'm ' + p2(s % 60) + 's'; };
const clockFmt = x => { const H = Math.floor(x / 3600), M = Math.floor(x % 3600 / 60); return H ? H + ':' + p2(M) + ':' + p2(x % 60) : M + ':' + p2(x % 60); };

// ---------- saved times ----------
const load = () => { try { return JSON.parse(GM_getValue('times', '[]')).map(x => typeof x === 'number' ? { v: x } : x); } catch (e) { return []; } };
let tracked = load();
const save = () => { try { GM_setValue('times', JSON.stringify(tracked)); } catch (e) {} };
// planning mode: lets you change a countdown's time, and keeps a dashed Undo box for every deleted countdown until you switch it off
let planning = false, trash = [], trashRows = [];
try { planning = GM_getValue('plan', false) === true; if (planning) trash = JSON.parse(GM_getValue('trash', '[]')).filter(x => x && typeof x.v === 'number'); } catch (e) { trash = []; }
const saveTrash = () => { try { GM_setValue('trash', JSON.stringify(trash)); } catch (e) {} };
let planSnap = null;   // how your countdowns looked when planning mode was switched on, so "Undo all" can put them back
try { if (planning) { planSnap = GM_getValue('planSnap', null); if (typeof planSnap !== 'string') { planSnap = JSON.stringify(tracked); GM_setValue('planSnap', planSnap); } } } catch (e) { planSnap = null; }

// ---------- time zones: sunrise/sunset location + general work-culture notes (broad tendencies, not rules) ----------
const ZONES = [
 { id: 'tokyo', flag: '🇯🇵', city: 'Tokyo', tz: 'Asia/Tokyo', lat: 35.6762, lon: 139.6503, tag: 'Dedication & harmony',
   desc: 'Loyalty to the team and punctuality come first, and staying until colleagues leave has long signalled commitment. Decisions are built by consensus before the meeting (nemawashi). Overwork (karoshi) is now openly debated, and recent reforms cap overtime.' },
 { id: 'seoul', flag: '🇰🇷', city: 'Seoul', tz: 'Asia/Seoul', lat: 37.5665, lon: 126.978, tag: 'Speed & hierarchy',
   desc: 'Known for ppalli-ppalli ("hurry, hurry"): fast execution, high ambition and respect for seniority. Long hours and after-work dinners (hoesik) once built team bonds; a 52-hour weekly cap and younger workers are shifting the culture toward balance.' },
 { id: 'mumbai', flag: '🇮🇳', city: 'Mumbai', tz: 'Asia/Kolkata', lat: 19.076, lon: 72.8777, tag: 'Hustle & adaptability',
   desc: 'Relationship-driven and hierarchical, with long days, quick improvisation (jugaad) and strong adaptability. Many teams run staggered or late shifts to serve clients in other time zones, so the day often starts later and runs well into the evening.' },
 { id: 'dubai', flag: '🇦🇪', city: 'Dubai', tz: 'Asia/Dubai', lat: 25.2048, lon: 55.2708, tag: 'Global crossroads',
   desc: 'A multicultural business hub where trust, hospitality and personal relationships drive deals, and seniority is respected. The federal government moved to a Monday-to-Friday week with a short Friday in 2022; hours shorten during Ramadan and summer heat shapes outdoor work.' },
 { id: 'berlin', flag: '🇩🇪', city: 'Berlin', tz: 'Europe/Berlin', lat: 52.52, lon: 13.405, tag: 'Efficiency & boundaries',
   desc: 'Work stays at work: punctual, direct, well-structured meetings and a firm "Feierabend", the moment the working day ends. Strong labor protections, generous vacation and little expectation of after-hours replies.' },
 { id: 'stockholm', flag: '🇸🇪', city: 'Stockholm', tz: 'Europe/Stockholm', lat: 59.3293, lon: 18.0686, tag: 'Consensus & balance',
   desc: 'Flat hierarchies, collaborative decisions and the idea of lagom ("just enough"). Daily fika coffee breaks, generous parental leave and an expectation to leave on time and be present with family.' },
 { id: 'madrid', flag: '🇪🇸', city: 'Madrid', tz: 'Europe/Madrid', lat: 40.4168, lon: -3.7038, tag: 'Late rhythm & relationships',
   desc: 'Days run later: a long midday meal, work into the evening and dinner around 9 or 10 PM. Personal rapport comes before business and deadlines can be flexible, though many firms are moving to more compressed schedules.' },
 { id: 'reykjavik', flag: '🇮🇸', city: 'Reykjavik', tz: 'Atlantic/Reykjavik', lat: 64.1466, lon: -21.9426, tag: 'Trust & shorter weeks',
   desc: 'Small, trust-based workplaces with flat hierarchies and huge daylight swings, from near-midnight sun in summer to only a few hours of light in winter. Large national trials of a shorter work week (2015-2019) were judged a success, and many workers moved to shorter hours.' },
 { id: 'sydney', flag: '🇦🇺', city: 'Sydney', tz: 'Australia/Sydney', lat: -33.8688, lon: 151.2093, tag: 'Work to live',
   desc: 'Egalitarian and informal: first names with the boss, little patience for showing off, and a strong habit of leaving work to enjoy the outdoors. Standard weeks are around 38 hours with solid leave, and a relaxed "she’ll be right" attitude to pressure.' },
 { id: 'saopaulo', flag: '🇧🇷', city: 'São Paulo', tz: 'America/Sao_Paulo', lat: -23.5505, lon: -46.6333, tag: 'Warmth & flexibility',
   desc: 'Relationships come before contracts: meetings open with small talk, and plans bend through creative problem-solving ("jeitinho"). Long commutes shape the day, lunch is a real break, and hospitality is part of doing business.' },
 { id: 'lagos', flag: '🇳🇬', city: 'Lagos', tz: 'Africa/Lagos', lat: 6.5244, lon: 3.3792, tag: 'Hustle & resilience',
   desc: 'An entrepreneurial, high-energy culture where side ventures are common and networks open doors. Heavy traffic pushes many people to leave home before dawn, and teams routinely work around power and connectivity gaps with real resourcefulness.' },
 { id: 'sf', flag: '🇺🇸', city: 'San Francisco', tz: 'America/Los_Angeles', lat: 37.7749, lon: -122.4194, tag: 'Move fast & equity',
   desc: 'Start-up energy: ambition, light hierarchy, equity-driven motivation and a "move fast" appetite for experiments. Remote and flexible hours are common, but so is an always-on expectation in fast-growing teams.' },
];

// ---------- sky background by hour: [top, bottom] ----------
const SKY = [['#070914','#12163a'],['#070914','#10143a'],['#080a18','#121640'],['#0a0c1f','#161a4a'],['#10163a','#2b2f6e'],['#1d2358','#6a4a8a'],
['#3b3f86','#e0805a'],['#5b8fd0','#f6c453'],['#4f9be0','#a9d8f5'],['#3c8ee6','#9ad6ff'],['#2f84e6','#8fd3ff'],['#2a7fe0','#86cdfa'],
['#2578dc','#7cc6f8'],['#2a7fe0','#86cdfa'],['#3187e2','#92d0f8'],['#3b86d0','#a8d4ee'],['#4a86c0','#e8c88a'],['#5a78b0','#f0a868'],
['#6a5a98','#f08a5a'],['#4a3a7a','#c0507a'],['#2a2a62','#6a3a7a'],['#161a46','#34285e'],['#0d1030','#1e1d4e'],['#080a1c','#14173f']];
const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const mix = (a, b, t) => { const x = hex(a), y = hex(b); return 'rgb(' + x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',') + ')'; };

// ---------- progress-bar gradients by hour (used in black mode) ----------
const BAR = [['#5b4bff','#9a6bff'],['#5b4bff','#8a6bff'],['#4f5bff','#7a7bff'],['#4a6cff','#6a8bff'],['#5a6cff','#b46bff'],['#8a5bff','#ff7ab0'],
['#ff7a59','#ffb347'],['#ffb347','#ffd84d'],['#ffd84d','#9be15d'],['#7ee04f','#2ad4a0'],['#2ad4a0','#2ac4ff'],['#2ab4ff','#4a8bff'],
['#29a7ff','#5ee7df'],['#2ad4ff','#56e39f'],['#3ad0c0','#a8e063'],['#a8e063','#ffd84d'],['#ffd84d','#ffa94d'],['#ffa94d','#ff6f61'],
['#ff6f61','#d94fa0'],['#d94fa0','#8a5bff'],['#8a5bff','#5b6bff'],['#6a5cff','#9a6bff'],['#5b4bff','#9a6bff'],['#5b4bff','#9a6bff']];
let mode = 'sky';
try { mode = GM_getValue('mode', 'sky') === 'grain' ? 'grain' : 'sky'; } catch (e) {}
// custom start time (minutes after midnight, Eastern); null = real solar dawn
let wake = null, lastShifted = false, zoneId = '', zoneOn = false;
try { const z = JSON.parse(GM_getValue('zone', 'null')); if (z && ZONES.some(x => x.id === z.id)) { zoneId = z.id; zoneOn = !!z.on; } } catch (e) {}
try { const v = +GM_getValue('wake', -1); if (v >= 0 && v < 1440) wake = v; } catch (e) {}
// auto-reset: when the Custom cycle you are running finishes, go back to the real dawn
let autoReset = true, wakeEnd = null, resetAt = 0;
let alEl = true, pmKeep = true, pmShow = true;   // alarm: show elapsed time; pomodoro: keep counting after it ends; pomodoro: show time worked
try { alEl = GM_getValue('alEl', true) !== false; pmKeep = GM_getValue('pmKeep', true) !== false; pmShow = GM_getValue('pmShow', true) !== false; } catch (e) {}
try { autoReset = GM_getValue('autoReset', true) !== false; const e = +GM_getValue('wakeEnd', 0); if (e > 0) wakeEnd = e; } catch (e) {}

// ---------- sun maths (NOAA-style) ----------
function sun(ms, z, lat = LAT, lon = LON) {
  const jd = ms / 864e5 + 2440587.5, n = Math.round(jd - 2451545 + 0.0008), J = n - lon / 360;
  const M = (357.5291 + 0.98560028 * J) % 360;
  const C = 1.9148 * Math.sin(M * R) + 0.02 * Math.sin(2 * M * R) + 0.0003 * Math.sin(3 * M * R);
  const L = (M + C + 180 + 102.9372) % 360;
  const Jt = 2451545 + J + 0.0053 * Math.sin(M * R) - 0.0069 * Math.sin(2 * L * R);
  const dec = Math.asin(Math.sin(L * R) * Math.sin(23.44 * R));
  const cw = (Math.cos(z * R) - Math.sin(lat * R) * Math.sin(dec)) / (Math.cos(lat * R) * Math.cos(dec));
  const w = Math.acos(Math.max(-1, Math.min(1, cw)));            // if the sun never reaches that angle, clamp instead of returning NaN
  const d = Math.min(w / R / 360, 0.5 - 1 / 1440);               // never a full 24h, so Night keeps a sliver and the phases stay in order
  return [(Jt - d - 2440587.5) * 864e5, (Jt + d - 2440587.5) * 864e5];
}
// k: 0 dawn begins, 1 sunrise, 2 sunset, 3 dusk ends (night begins)
const sodOf = ms => { const p = hf.formatToParts(new Date(ms)), g = t => +p.find(x => x.type === t).value; return g('hour') * 3600 + g('minute') * 60 + g('second'); };
// Real schedule: Dawn = civil twilight begins, Day = sunrise, Dusk = sunset, Night = civil twilight ends.
// Custom schedule (a wake time W is set):
//   Custom = W. Day = W + the real dawn length (15-60 min), but never before real sunrise.
//   If at least 4h of real daylight remain after that, Dusk and Night follow today's real sunset and twilight end.
//   Otherwise (very late start) the whole day is shifted: Day, Dusk and Night keep their real lengths after W.
function events(now, real, more) {
  const q = ymd.formatToParts(now), g = t => +q.find(x => x.type === t).value;
  const base = Date.UTC(g('year'), g('month') - 1, g('day'), 16), out = [];
  for (const o of more ? [-1, 0, 1, 2] : [-1, 0, 1]) {
    const d = base + o * 864e5, a = sun(d, 96), b = sun(d, 90.833);
    if (wake == null || real) { out.push({ t: a[0], k: 0, o }, { t: b[0], k: 1, o }, { t: b[1], k: 2, o }, { t: a[1], k: 3, o }); continue; }
    const w = a[0] + (wake * 60 - sodOf(a[0])) * 1000;
    const dl = Math.max(15 * 6e4, Math.min(60 * 6e4, b[0] - a[0]));
    const ds = Math.max(w + dl, b[0]);
    const shift = ds + 240 * 6e4 > b[1];
    const dusk = shift ? ds + (b[1] - b[0]) : b[1], night = shift ? dusk + (a[1] - b[1]) : a[1];
    if (o === 0) lastShifted = shift;
    out.push({ t: w, k: 0, o }, { t: ds, k: 1, o }, { t: dusk, k: 2, o }, { t: night, k: 3, o });
  }
  return out.sort((x, y) => x.t - y.t);
}
// ---------- Custom cycle end: the next Custom start that follows this cycle's Night ----------
// Anchor = the Custom start at or before now, or (if it is currently Night) the one coming up, so setting Custom
// at night previews the whole next day. The cycle ends at the Custom start after the anchor.
function cycleEndFor(now) {
  const ev = events(now, false, true), n = now.getTime(), cur = ev[ev.findIndex(e => e.t > n) - 1];
  const starts = ev.filter(e => e.k === 0);
  const anchor = cur && cur.k === 3 ? starts.find(e => e.t > n) : starts.filter(e => e.t <= n).pop();
  const end = anchor && starts.find(e => e.t > anchor.t);
  return end ? end.t : null;
}
// ---------- selected time zone: its own next sunrise / sunset, local time, typical start ----------
const zf = {};
const zfmt = (tz, k, o) => (zf[tz + k] = zf[tz + k] || new Intl.DateTimeFormat('en-US', { timeZone: tz, ...o }));
const zsod = (tz, ms) => { const p = zfmt(tz, 's', { hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' }).formatToParts(new Date(ms)), g = t => +p.find(x => x.type === t).value; return g('hour') * 3600 + g('minute') * 60 + g('second'); };
const curZone = () => ZONES.find(z => z.id === zoneId) || null;
function zoneEvents(z, now) {
  const q = zfmt(z.tz, 'd', { year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(now), g = t => +q.find(x => x.type === t).value;
  const base = Date.UTC(g('year'), g('month') - 1, g('day'), 12), out = [];
  for (const o of [-1, 0, 1]) { const b = sun(base + o * 864e5, 90.833, z.lat, z.lon); if (!isNaN(b[0])) out.push({ t: b[0], k: 1, o }); if (!isNaN(b[1])) out.push({ t: b[1], k: 2, o }); }
  return out.sort((x, y) => x.t - y.t);
}
const names = ['🌅 Dawn', '☀️ Day', '🌆 Dusk', '🌙 Night'];

// ---------- styles (glass pane) ----------
const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
:host{all:initial;display:block;--noise:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='.28'/></svg>")}
.shell{position:relative;height:100%;display:flex;flex-direction:column;border-radius:18px;overflow:hidden;color:#fff;font:13px/1.35 system-ui,'Segoe UI',sans-serif;text-shadow:0 1px 2px rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.25);box-shadow:0 12px 40px rgba(0,0,0,.45);background:radial-gradient(circle at 15% 8%,rgba(255,255,255,.22),transparent 45%),radial-gradient(circle at 90% 70%,rgba(255,255,255,.12),transparent 40%),linear-gradient(180deg,var(--top,#12163a),var(--bot,#2b2f6e))}
.wrap{flex:1;min-height:0;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:10px;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.35) transparent}
.hd{flex:none;display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:grab;touch-action:none;user-select:none;background:rgba(0,0,0,.28);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);font-weight:600;font-size:12.8px}
.hd span{flex:1}.hd button{background:transparent;font-size:17.6px;padding:0 6px;opacity:.85}
.grip{position:absolute;top:0;left:0;width:20px;height:20px;z-index:3;cursor:nwse-resize;touch-action:none;background:linear-gradient(135deg,rgba(255,255,255,.7) 0 2px,transparent 2px 6px,rgba(255,255,255,.55) 6px 8px,transparent 8px 12px,rgba(255,255,255,.4) 12px 14px,transparent 14px)}
.launch{display:none;cursor:pointer;touch-action:none;padding:9px 14px;border-radius:99px;font:600 12.8px system-ui,sans-serif;color:#fff;cursor:pointer;border:1px solid rgba(255,255,255,.3);box-shadow:0 6px 20px rgba(0,0,0,.4);text-shadow:0 1px 2px rgba(0,0,0,.4);background:linear-gradient(180deg,var(--top,#12163a),var(--bot,#2b2f6e))}
.launch.grain{background:var(--noise),#08080a}
.g{flex:none;background:linear-gradient(135deg,rgba(255,255,255,.18),rgba(255,255,255,.05)),rgba(10,14,40,.32);backdrop-filter:blur(14px) saturate(150%);-webkit-backdrop-filter:blur(14px) saturate(150%);border:1px solid rgba(255,255,255,.22);border-radius:14px;padding:12px;box-shadow:0 6px 24px rgba(0,0,0,.25),inset 0 1px 0 rgba(255,255,255,.25)}
.c{text-align:center}
.t{font:700 28px/1.1 ui-monospace,Consolas,monospace;font-variant-numeric:tabular-nums;letter-spacing:1px}
.sec{color:rgba(255,255,255,.38);font-size:.6em;font-weight:600}
.d{opacity:.85;margin:4px 0 8px}
.badge{display:inline-block;padding:3px 12px;border-radius:99px;background:rgba(255,200,90,.22);color:#ffd27a;font-weight:600;font-size:12.8px;border:1px solid rgba(255,210,122,.3)}
.ttl{font-weight:600;opacity:.9;margin-bottom:10px;font-size:12.8px}
.phs{display:grid;grid-template-columns:repeat(4,1fr);gap:2px;text-align:center;margin-bottom:8px}
.ph{opacity:.6}.ph.on{opacity:1}
.ph i{display:block;font-style:normal;font-size:16px}.ph span{display:block;font-size:10.9px}
.ph small{display:block;font-size:9.9px;opacity:.85;font-variant-numeric:tabular-nums}
.bar{height:8px;border-radius:9px;background:rgba(0,0,0,.35);overflow:hidden}.bar.sm{height:5px}
.fill{height:100%;width:0;border-radius:9px;background:linear-gradient(90deg,var(--g1,#f5a623),var(--g2,#8b8ff5));transition:width .6s linear}
.row{display:flex;justify-content:space-between;margin-top:8px;font-size:12.5px}
.ev{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-top:1px solid rgba(255,255,255,.16);font-size:12.8px;font-variant-numeric:tabular-nums}
.ev:first-of-type{border-top:0}
.hot{color:#ffd27a;font-weight:600}
.ctl{display:flex;gap:6px}
input{flex:1;min-width:0;padding:7px 8px;border-radius:9px;border:1px solid rgba(255,255,255,.25);background:rgba(0,0,0,.35);color:#fff;color-scheme:dark;font:inherit}
button{font:inherit;color:#fff;border:0;cursor:pointer}
.add{padding:7px 12px;border-radius:9px;background:transparent;border:1px solid rgba(255,255,255,.4);font-weight:700}
.shell.grain .add{background:var(--noise),#08080a;border-color:rgba(255,255,255,.25)}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.chip{padding:4px 9px;border-radius:99px;background:rgba(255,255,255,.16);font-size:11.5px;border:1px solid rgba(255,255,255,.18)}
.tr{padding:8px 0 2px;border-top:1px solid rgba(255,255,255,.16)}
.trh{display:flex;align-items:center;margin-bottom:6px;font-size:12.8px}
.cd{margin-left:auto;opacity:.9;font-variant-numeric:tabular-nums}
.x{background:transparent;font-size:17.6px;padding:0 4px;margin-left:6px;opacity:.7}
.note{opacity:.75;font-size:12px}
.seg{display:inline-flex;margin-bottom:10px;padding:2px;border-radius:99px;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.18)}
.seg button{padding:3px 12px;border-radius:99px;background:transparent;font-size:11.5px;opacity:.7}
.seg button.on{background:rgba(255,255,255,.22);opacity:1;font-weight:600}
.shell.grain{background:var(--noise),#08080a}
.shell.grain .g{background:linear-gradient(135deg,rgba(255,255,255,.09),rgba(255,255,255,.02)),rgba(0,0,0,.4)}
.ph.edit{cursor:pointer}.ph.edit:hover{opacity:1}.ph.edit:hover small{text-decoration:underline}
.ed{margin:0 0 10px}.sm2{padding:6px 9px;font-size:12px;font-weight:600}
.row + .note{margin-top:8px}
select{width:100%;padding:8px;border-radius:9px;border:1px solid rgba(255,255,255,.25);background:rgba(0,0,0,.35);color:#fff;color-scheme:dark;font:inherit}
.zt{font-weight:600;color:#ffd27a;margin:10px 0 4px}.zl{font-size:12px;opacity:.9;margin:2px 0}.zd{font-size:12px;opacity:.85;margin:8px 0}
.zrow{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;font-size:12px}
.g>.note{margin-top:8px}
.credit{flex:none;text-align:center;font-size:11px;opacity:.55;padding:2px 0 4px}
.chk{display:flex;gap:8px;align-items:flex-start;margin-top:8px;font-size:12px;opacity:.9;cursor:pointer}
.chk input{flex:none;width:auto;padding:0;accent-color:#7c83f0}
.conf{display:flex;align-items:center;gap:6px;margin-bottom:6px;font-size:12px}.conf span{flex:1}
.conf.big{flex-wrap:wrap}.conf.big span{flex:1 1 100%}
.cf{padding:4px 10px;border-radius:9px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.25);font-size:12px;font-weight:600}
.cf.yes{background:rgba(239,68,68,.55);border-color:rgba(255,130,130,.6)}
.undo{display:none;align-items:center;justify-content:space-between;gap:8px;margin:8px 0;padding:8px 10px;border-radius:10px;background:rgba(0,0,0,.35);font-size:12px}
.undo button{padding:4px 12px;border-radius:99px;background:rgba(255,255,255,.2);font-weight:700;font-size:12px}
.kundo{margin:8px 0 4px}
.kpan .kundo{background:#fff3dc;color:#14173a;border-left:3px solid #ffb347;text-shadow:none}
.kpan .kundo button{background:#14173a;color:#fff}
.kit .kconf{flex:1;margin:0}
.tuh{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}.tuh .ttl{margin:0}
.sw.plan .tk::after{font-size:10px;font-weight:700;line-height:14px;text-align:center;color:#3b3f86;text-shadow:none}
.sw.plan input:checked + .tk::after{content:"✓"}
.ptime{width:122px;min-width:122px;flex:none;padding:3px 6px;font-size:14px;border-radius:8px}
.pedit{display:inline-flex;flex:none;align-items:center;gap:6px;white-space:nowrap}
.pok{flex:none;width:26px;height:26px;padding:0;border-radius:8px;background:rgba(123,228,149,.22);border:1px solid rgba(123,228,149,.6);color:#7be495;font-weight:700;font-size:15px;text-shadow:none}
.pok:disabled{opacity:.35;cursor:default}
.trt{row-gap:4px}
.tprev{font-size:10.5px;color:rgba(232,235,246,.72);text-shadow:none;white-space:nowrap}
.tx{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:6px 0;padding:8px 10px;border:2px dashed rgba(255,255,255,.4);border-radius:10px;font-size:11.5px;line-height:1.4;color:rgba(232,235,246,.72);text-shadow:none}
.tx b{display:block;margin-top:2px;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;color:rgba(236,239,250,.9)}
.tx button{flex:none;padding:4px 12px;border-radius:99px;background:rgba(255,255,255,.2);font-weight:700;font-size:12px}
.shell.docked .grip{display:none}.shell.docked .hd{cursor:default}.shell.docked{border-radius:14px}
.alt{font:700 26px/1.1 ui-monospace,Consolas,monospace;font-variant-numeric:tabular-nums;text-align:center;margin:10px 0 2px}
.alt.ring{color:#ffd27a;animation:ring 1s ease-in-out infinite alternate}
@keyframes ring{from{text-shadow:0 0 0 rgba(255,210,122,0)}to{text-shadow:0 0 14px rgba(255,210,122,.95)}}
.alc{margin-top:6px;font-size:11px;opacity:.75;text-align:center}
.ale{text-align:center;font-size:13px;opacity:.9;margin-bottom:8px}
.unit{align-self:center;font-size:12px;opacity:.8}
.grip{display:none}
.shell{border-radius:0;border:0;box-shadow:none}
.hd{-webkit-app-region:drag;cursor:default;padding:8px 6px 8px 12px;gap:2px}
.hd span{flex:1}
.hd button{-webkit-app-region:no-drag;font-size:15px;padding:2px 9px;border-radius:7px;opacity:.85}
.hd button:hover{background:rgba(255,255,255,.16);opacity:1}
.hd button.on{background:rgba(255,255,255,.28);opacity:1}
.chk input{accent-color:#7c83f0}
.x.ok{color:#7be495;opacity:.95}
.cd.lap{color:#ff8a3d;font-weight:700;opacity:1}
.cd.lap.over,.alt.lapc.over,.alp.over{color:#ff3b4e;animation:pulseT 1.1s ease-in-out infinite}
.cd sup,.alp sup,.alt sup{font-size:.6em;font-weight:600;margin-left:5px;opacity:.9;line-height:0}
@keyframes pulseT{0%,100%{opacity:1;text-shadow:0 0 0 rgba(255,59,78,0)}50%{opacity:.6;text-shadow:0 0 10px rgba(255,59,78,.85)}}
.alt.lapc{color:#ff8a3d}
.alp{width:fit-content;margin:4px auto 8px;text-align:center;font-weight:700;font-variant-numeric:tabular-nums;color:#ff8a3d}
.sw{display:flex;align-items:center;gap:9px;cursor:pointer;user-select:none;font-size:12px}
.sw input{position:absolute;opacity:0;width:0;height:0;padding:0;border:0;flex:none;pointer-events:none}
.sw .tk{position:relative;flex:none;width:34px;height:20px;border-radius:99px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.3);transition:background .22s ease,border-color .22s ease,box-shadow .22s ease}
.sw .tk::after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.45);transition:transform .24s cubic-bezier(.3,.9,.3,1.15)}
.sw input:checked + .tk{background:linear-gradient(135deg,#7c83f0,#5fb4ff);border-color:rgba(255,255,255,.55);box-shadow:0 0 10px rgba(124,131,240,.55)}
.sw input:checked + .tk::after{transform:translateX(14px)}
.sw:hover .tk{border-color:rgba(255,255,255,.55)}
.sw input:focus-visible + .tk{outline:2px solid #9db4ff;outline-offset:2px}
.sw .sl{opacity:.92}
.sw.sm{font-size:11px;gap:7px}
.sw.sm .tk{width:28px;height:16px}.sw.sm .tk::after{width:10px;height:10px}.sw.sm input:checked + .tk::after{transform:translateX(12px)}
.tlb{min-width:0;flex:1;display:flex;flex-direction:column;gap:1px;line-height:1.25}
.tt{font-size:11px;opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;cursor:text;transition:opacity .15s}
.tt.empty{opacity:.35;font-style:italic}.tt:hover{opacity:1}
.trf{display:flex;justify-content:flex-end;margin-top:6px}
.tin{flex:none;width:100%;padding:5px 8px;font-size:13px;border-radius:8px}
.ctl + .tin{margin-top:8px}
.tip{position:absolute;left:0;top:0;z-index:30;max-width:260px;padding:7px 10px;border-radius:10px;background:rgba(14,17,40,.95);border:1px solid rgba(255,255,255,.26);box-shadow:0 8px 24px rgba(0,0,0,.5);font-size:12px;line-height:1.35;word-break:break-word;white-space:pre-line;pointer-events:none;opacity:0;visibility:hidden;transform:translateY(5px) scale(.97);transition:opacity .18s ease,transform .18s ease,visibility 0s linear .18s}
.tip.on{opacity:1;visibility:visible;transform:none;transition:opacity .18s ease,transform .18s ease,visibility 0s}
.shell{--eb:#8fd0ff;--ebs:rgba(143,208,255,.4);--ebg:rgba(10,14,40,.6)}
.shell.grain{--eb:#c6a3ff;--ebs:rgba(198,163,255,.4);--ebg:rgba(0,0,0,.65)}
.add.endbtn,.shell.grain .add.endbtn{border:3px solid transparent;border-radius:10px;background:linear-gradient(var(--ebg),var(--ebg)) padding-box,linear-gradient(var(--eb),var(--eb)) border-box;box-shadow:0 0 10px var(--ebs)}
.add.endbtn.calc,.shell.grain .add.endbtn.calc{background:linear-gradient(var(--ebg),var(--ebg)) padding-box,linear-gradient(45deg,var(--eb) 25%,transparent 25%,transparent 50%,var(--eb) 50%,var(--eb) 75%,transparent 75%,transparent) border-box;background-size:auto,16px 16px;animation:march .9s linear infinite}
@keyframes march{from{background-position:0 0,0 0}to{background-position:0 0,16px 0}}
@media (prefers-reduced-motion:reduce){.add.endbtn.calc{animation:none}.alt.lapc.over,.cd.lap.over,.alp.over{animation:none}}
.pmkeep{margin:12px 0 2px;padding:9px 11px;border-radius:12px;background:linear-gradient(135deg,rgba(124,131,240,.3),rgba(95,180,255,.16));border:1px solid rgba(160,190,255,.42);box-shadow:0 0 14px rgba(124,131,240,.28)}
.pmkd{margin-top:6px;font-size:11px;opacity:.82;line-height:1.4}
.pmopts{display:flex;justify-content:flex-end;margin:-2px 0 4px}
.pmh{text-align:center;font-weight:600;font-size:12.8px;margin:8px 0 0}
.pms{font-weight:600;opacity:.9;margin:12px 0 4px;font-size:12px}
.pmsum{margin:10px 0;padding:8px 10px;border-radius:10px;background:rgba(0,0,0,.3);font-size:12px;line-height:1.5}
.pmt{white-space:pre-line;margin-bottom:6px}
.ev b.pmv{font-variant-numeric:tabular-nums}
.ev.sess{padding-left:12px;font-size:12px;opacity:.8}
.ev.sess .conf{flex:1 1 100%;margin:0}.ev.sess .x{flex:none}
.zkey{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;font-size:11px;padding:0 4px}
.zk{padding:2px 9px;border-radius:99px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.18);white-space:nowrap}
.locbox summary{cursor:pointer;font-weight:600;font-size:12.8px;list-style:none;display:flex;align-items:center;justify-content:space-between;gap:8px}
.locbox summary::-webkit-details-marker{display:none}
.locbox summary::after{content:'+';font-size:18px;opacity:.8;flex:none}
.locbox[open] summary::after{content:'–'}
.fxrow{display:flex;flex-wrap:wrap;gap:10px 16px;margin-top:12px}
.fxbox{display:flex;flex-direction:column;gap:10px;margin-top:10px}
.fxbox:empty{display:none}
.fxp{position:relative;overflow:hidden;padding:10px 10px 10px 13px;border-radius:12px;border:1px solid rgba(255,255,255,.2);border-left:4px solid var(--fa);background:rgba(0,0,0,.25);transition:box-shadow .3s ease}
.fxp::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,var(--fa),var(--fb));opacity:.18;pointer-events:none}
.fxp>*{position:relative}
.fxp.live{box-shadow:0 0 14px var(--fa),inset 0 0 0 1px var(--fa)}
.fxh{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;margin-bottom:8px;font-size:12.8px}
.fxt{font-weight:600;flex:1 1 auto}
.fxtm{margin-left:auto}
.fxtip{cursor:help;border-radius:4px}
.fxtip:hover{text-decoration:underline dotted;text-underline-offset:3px}
.fxl.fxtip,.fxmoon b.fxtip,.fxsr.fxtip{width:fit-content;max-width:100%}   /* the hover area is only as wide as the text itself, not the whole line */
.fxv{font-variant-numeric:tabular-nums;font-size:12.5px}
.fxlive{font-size:10px;font-weight:700;letter-spacing:.5px;color:#fff;padding:1px 7px;border-radius:99px;background:linear-gradient(90deg,var(--fa),var(--fb));animation:pulseT 1.1s ease-in-out infinite}
.fxbar{height:7px;border-radius:9px;background:rgba(0,0,0,.35);overflow:hidden}
.fxfill{height:100%;width:0;border-radius:9px;background:linear-gradient(90deg,var(--fa),var(--fb));transition:width .6s linear}
.fxl{font-size:11.5px;opacity:.92;margin-top:6px;line-height:1.4}
.fxl.sm{opacity:.7}
.fxel{color:#ff8a3d;font-weight:700;font-variant-numeric:tabular-nums}
.fxmoon{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.fxmoon b{display:block;font-size:12.8px}
.fxmoon span{font-size:11.5px;opacity:.85}
.fxg{margin-top:8px;border-top:1px solid rgba(255,255,255,.16);padding-top:6px}
.fxg summary{cursor:pointer;font-size:11.5px;font-weight:600;list-style:none;display:flex;align-items:center;justify-content:space-between;gap:8px}
.fxg summary::-webkit-details-marker{display:none}
.fxg summary::after{content:'+';font-size:16px;opacity:.8}
.fxg[open] summary::after{content:'–'}
.fxgp{font-size:11.5px;line-height:1.5;opacity:.92;margin:6px 0}
.fxgp strong{color:#ffd27a}
.fxcy{position:relative;overflow:hidden;margin-top:10px;padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.28);background:linear-gradient(160deg,rgba(22,16,66,.96),rgba(72,42,124,.88) 55%,rgba(28,40,104,.92));box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 2px 10px rgba(0,0,0,.35)}
.fxcy::after{content:'';position:absolute;left:0;right:0;top:0;height:40%;background:linear-gradient(180deg,rgba(255,255,255,.2),rgba(255,255,255,0));pointer-events:none}
.fxcy>*:not(.fxstar){position:relative;z-index:1}
.fxstar{position:absolute;width:2px;height:2px;background:#fff;opacity:.2;pointer-events:none;image-rendering:pixelated;animation:fxtw 2.6s steps(3) infinite}
.fxstar.b{width:3px;height:3px;background:#cfd8ff}
@keyframes fxtw{0%,100%{opacity:.1}50%{opacity:.95}}
.fxcs{display:flex;justify-content:space-between;align-items:center;padding:0 2px}
.fxci{display:inline-block;font-size:17px;opacity:.42;transition:transform .3s ease,opacity .3s ease}
.fxci.on{opacity:1;transform:scale(1.4);filter:drop-shadow(0 0 6px #cfd8ff)}
.fxci.flip{transform:scaleX(-1)}.fxci.on.flip{transform:scale(-1.4,1.4)}
.fxcn{font-size:11px;opacity:.92;margin-top:5px}
.fxsl{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:8px;font-size:11.5px}
.fxsl input{flex:none;width:auto;padding:2px 6px;border-radius:8px}
.fxsr{margin-top:6px;font-size:11.5px;line-height:1.4}
.fxsr.warn{color:#ffd27a}.fxsr.ok{color:#9be7a8}
@media (prefers-reduced-motion:reduce){.fxstar{animation:none;opacity:.5}.fxci{transition:none}}
@media (prefers-reduced-motion:reduce){.fxlive{animation:none}}
.trt{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px}
.tr>.trkr{margin:0 0 6px}
.cd{text-align:right;flex:none;padding-left:8px}
.cd sup{display:block;margin:2px 0 0;text-align:right;line-height:1.2}
.trkr{display:flex;flex-wrap:wrap;gap:5px;margin:0}
.trk{display:inline-flex;align-items:center;gap:5px;padding:1px 8px;border-radius:99px;font-size:10.5px;font-weight:700;text-shadow:none;border:1px solid rgba(255,255,255,.35)}
.trk.sun{background:linear-gradient(90deg,#ffd84d,#4fc3ff);color:#14173a}
.trk.gold{background:linear-gradient(90deg,#ffb42e,#ff5e3a);color:#2a1200}
.trk.blue{background:linear-gradient(90deg,#2f4bff,#7fd0ff);color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.4)}
.trk.dot{width:13px;height:13px;padding:0;gap:0;justify-content:center}
.trk.dot .trn{display:none}
.trk.past{border:2px dashed rgba(255,255,255,.9);opacity:.72}
.trl{font-size:9px;letter-spacing:.4px;padding:0 5px;border-radius:99px;background:rgba(0,0,0,.45);color:#fff;text-shadow:none;animation:pulseT 1.1s ease-in-out infinite}
.trk.fxtip:hover{text-decoration:none}
.shell:not(.grain) .trl{background:linear-gradient(90deg,var(--l1,#f5a623),var(--l2,#8b8ff5));text-shadow:0 1px 2px rgba(0,0,0,.5)}
@media (prefers-reduced-motion:reduce){.trl{animation:none}}
.flipb{width:100%;margin:0 0 10px}
.flip{perspective:1000px}
.flip>section{transition:transform .22s ease-in}
.flip>.fout{transform:rotateY(90deg)}
.flip>.fin{animation:kflip .28s ease-out}
@keyframes kflip{from{transform:rotateY(-90deg)}to{transform:rotateY(0)}}
.tt.nokan{cursor:default}
.kmonth{font:700 19px/1.2 system-ui,'Segoe UI',sans-serif;text-align:center;margin:0 0 6px;letter-spacing:.3px}
.kopt{margin:8px 0 2px}
.ksec{margin-top:10px;padding:8px 8px 4px;border-radius:12px;border:1px solid var(--kc);border-left-width:4px;background:rgba(0,0,0,.22)}
.ksh{display:flex;align-items:center;justify-content:space-between;font-weight:700;font-size:12.5px;color:var(--kc);margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px}
.kcnt{min-width:20px;text-align:center;padding:0 7px;border-radius:99px;background:var(--kc);color:#14173a;font-size:11px}
.kcard{position:relative;margin:7px 0;padding:8px 10px;border-radius:10px;background:#f4f6ff;color:#14173a;text-shadow:none;border:1.5px solid var(--kc);cursor:pointer;transition:transform .15s ease,box-shadow .15s ease,border-color .2s ease}
.kcard:hover,.kcard:focus-visible{transform:translateY(-1px);box-shadow:0 5px 14px rgba(0,0,0,.4)}
.kt{font-weight:700;font-size:13px;word-break:break-word}
.kdue{display:flex;align-items:center;flex-wrap:wrap;gap:6px 8px;margin-top:5px}
.kd{font-weight:800;font-size:13px;color:#000}
.kcy{font:700 11px ui-monospace,Consolas,monospace;font-variant-numeric:tabular-nums;color:#000;background:#fff;border:1px solid rgba(0,0,0,.3);border-radius:99px;padding:1px 8px}
.kov{font-size:10.5px;font-weight:700;color:#14173a;opacity:.8}
.kov.bad{color:#b3122a;opacity:1}
.kdt{font-size:11px;color:#14173a;opacity:.75;margin-top:2px}
.kprog{display:flex;align-items:center;gap:7px;margin-top:6px;font-size:10.5px;font-weight:600}
.kbar{flex:1;height:6px;border-radius:9px;background:rgba(20,23,58,.16);overflow:hidden}
.kbar.big{flex:none;width:100%;height:9px}
.kfill{height:100%;width:0;border-radius:9px;background:var(--kc);transition:width .3s ease}
.kwarn{display:inline-block;margin-top:6px;padding:1px 9px;border-radius:99px;background:#ffd27a;color:#3a2400;font-size:10.5px;font-weight:700;border:1px solid #c98a00}
.kfriend{display:inline-block;margin-top:6px;padding:2px 9px;border-radius:99px;background:#d8f3e4;color:#0d3b24;font-size:10.5px;font-weight:700;border:1px solid #6cc59a}
.ktagrow{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
.ktag{padding:1px 8px;border-radius:99px;background:rgba(20,23,58,.09);color:#14173a;font-size:10.5px;font-weight:600;border:1px solid rgba(20,23,58,.18);text-shadow:none}
.ktags{display:flex;flex-wrap:wrap;gap:5px;margin:6px 0}
.ktags .ktag{display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;padding:3px 8px}
.ktags .ktag b{font-size:14px;line-height:1;opacity:.6}
.ktdd{margin:4px 0 6px}
.ktdd>summary{cursor:pointer;padding:6px 10px;border-radius:9px;background:#e8ecff;border:1px solid rgba(20,23,58,.35);font-weight:700;font-size:12.5px;list-style:none}
.ktdd>summary::-webkit-details-marker{display:none}
.ktdd>summary::after{content:'▾';float:right}
.ktdd[open]>summary::after{content:'▴'}
.ktdd .kin{margin-top:6px}
.ktdd .ktaglist{max-height:240px;overflow-y:auto;margin-top:6px}
.ktg{margin:5px 0;border:1px solid rgba(20,23,58,.2);border-radius:9px;background:#fff;padding:5px 8px}
.ktg summary{cursor:pointer;font-weight:700;font-size:12.5px}
.ktgb{display:flex;flex-wrap:wrap;gap:5px;margin:7px 0 3px}
.kpick{padding:3px 9px;border-radius:99px;background:#eef1ff;color:#14173a;border:1px solid rgba(20,23,58,.25);font-size:12px;font-weight:600;text-shadow:none}
.kpick.on{background:var(--kc);border-color:var(--kc)}
.kpick:disabled{opacity:.45;cursor:not-allowed}
.kq{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:-2px 0 8px}
.ktpl{margin:7px 0 6px;padding:8px;border-radius:10px;border:2px dashed rgba(255,255,255,.6);background:rgba(150,152,165,.32)}
.ktpl>input{width:100%}
.ktr{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.ktr input{flex:1 1 110px}
.kmod{position:absolute;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;padding:12px;background:rgba(5,6,20,0);transition:background .22s ease}
.kmod.open{background:rgba(5,6,20,.62)}
.kpan{width:100%;max-width:460px;max-height:92%;overflow-y:auto;padding:12px;border-radius:14px;background:#f4f6ff;color:#14173a;text-shadow:none;border:2px solid var(--kc);box-shadow:0 14px 40px rgba(0,0,0,.55);opacity:0;transform:translateY(16px) scale(.92);transition:opacity .22s ease,transform .28s cubic-bezier(.3,1.4,.4,1),border-color .2s ease}
.kmod.open .kpan{opacity:1;transform:none}
.kphd{display:flex;align-items:center;gap:8px}
.kclose{flex:none;width:30px;height:30px;border-radius:50%;background:rgba(20,23,58,.12);color:#14173a;font-size:20px;line-height:1}
.kin{flex:none;width:100%;padding:5px 7px;border-radius:8px;border:1px solid rgba(20,23,58,.35);background:#fff;color:#14173a;color-scheme:light;font-size:16px}
.kti{font-weight:700}
.kgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}
.kfld{display:flex;flex-direction:column;gap:2px;font-size:11px;font-weight:600}
.kpr{margin:6px 0 8px}
.kpct{font-size:16px}
.ksub{margin-left:8px;font-size:11.5px;opacity:.8}
.kit{display:flex;align-items:center;gap:6px;margin:6px 0;padding:5px 7px;border-radius:8px;border:1px solid var(--kc);background:#fff;transition:border-color .2s ease}
.kit input[type=checkbox]{flex:none;width:18px;height:18px;padding:0;accent-color:var(--kc)}
.kit .kx{flex:1;min-width:0;width:auto;border-color:transparent;background:transparent}
.kit.done .kx{text-decoration:line-through;opacity:.55}
.kitime{flex:none;width:auto;max-width:120px}
.kdel{flex:none;width:26px;height:26px;border-radius:50%;background:rgba(179,18,42,.12);color:#b3122a;font-size:17px;line-height:1}
.knote{font-size:12px;opacity:.75;margin:8px 0}
.kadd{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.kadd .kin:first-child{flex:1 1 150px;width:auto}
.kpan .add,.shell.grain .kpan .add{background:#e8ecff;color:#14173a;border-color:rgba(20,23,58,.45)}
.kpan .cf{background:rgba(20,23,58,.1);color:#14173a;border-color:rgba(20,23,58,.35)}
.kpan .cf.yes{background:#d6293e;color:#fff;border-color:#d6293e}
.kpan .conf{color:#14173a}
.kpan .sw{color:#14173a;text-shadow:none}
.kpan .sw .tk{background:rgba(20,23,58,.2);border-color:rgba(20,23,58,.4)}
@media (prefers-reduced-motion:reduce){.flip>section,.kcard,.kpan,.kmod,.kfill{transition:none}.flip>.fin{animation:none}}
.ktu{position:absolute;top:6px;right:6px;width:24px;height:24px;padding:0;border-radius:50%;background:rgba(20,23,58,.08);color:#14173a;border:1px solid rgba(20,23,58,.3);font-size:13px;line-height:1;opacity:.55;text-shadow:none}
.ktu.on{opacity:1;background:var(--kc);border-color:var(--kc)}
.kcard .kt{padding-right:30px}
.tr.tkan{border:1px solid var(--kc);border-radius:10px;padding:8px 9px 4px;margin:7px 0}
.synct{width:100%;margin:8px 0;padding:8px;min-height:84px;border-radius:9px;border:1px solid rgba(255,255,255,.25);background:rgba(0,0,0,.35);color:#fff;color-scheme:dark;font:16px/1.3 ui-monospace,Consolas,monospace;word-break:break-all;resize:vertical}
.syn .ctl{flex-wrap:wrap}
.kchead{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin:12px 0 2px;font-weight:700;font-size:14px}
.kpr{display:flex;align-items:center;gap:10px;margin:6px 0 10px}
.kpr .kbar.big{flex:1;width:auto;height:8px}
.kpct{flex:none;min-width:36px;font-size:12px;font-weight:700}
.kit{display:flex;align-items:flex-start;gap:10px;margin:2px 0;padding:6px;border:0;border-radius:8px;background:transparent}
.kit:hover{background:rgba(20,23,58,.06)}
.kit input[type=checkbox]{margin-top:4px}
.kbody{flex:1;min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:4px}
.kit .kx,.kform .kfx{display:block;width:100%;resize:none;overflow:hidden;font:inherit;font-size:14px;line-height:1.35;color:#14173a;padding:3px 5px;border:1px solid transparent;border-radius:6px;background:transparent}
.kit .kx:focus{background:#fff;border-color:var(--kc)}
.kit.done .kx{text-decoration:line-through;opacity:.55}
.kdueat{display:inline-flex;align-items:center;gap:5px;padding:1px 9px;border-radius:99px;background:rgba(20,23,58,.07);border:1px solid var(--kc);color:#14173a;font-size:11px;font-weight:700;text-shadow:none}
.kdueat.none{border-style:dashed;opacity:.6;font-weight:600}
.kdueat:hover{opacity:1;background:rgba(20,23,58,.14)}
.kit .kdel{margin-top:2px;opacity:.5}.kit:hover .kdel{opacity:1}
.kaddbtn{margin-top:8px;padding:7px 14px;border-radius:8px;background:rgba(20,23,58,.08);border:1px solid rgba(20,23,58,.2);color:#14173a;font-weight:600;font-size:13px;text-shadow:none}
.kaddbtn:hover{background:rgba(20,23,58,.15)}
.kform{margin-top:8px;padding:10px;border-radius:12px;background:#fff;border:1.5px solid var(--kc);box-shadow:0 4px 14px rgba(20,23,58,.18);animation:kdrop .22s ease-out}
.kform .kfx{border-color:rgba(20,23,58,.2);padding:6px 8px;min-height:54px}
.kform .kfx:focus{border-color:var(--kc)}
.kfdue{display:flex;align-items:center;gap:8px;margin-top:8px;font-size:12px;font-weight:700;color:#14173a}
.kfdue .kitime{max-width:130px}
.kfact{display:flex;align-items:center;gap:8px;margin-top:10px}
.kfadd{padding:6px 16px;border-radius:8px;background:var(--kc);color:#14173a;font-weight:700;font-size:13px;border:0;text-shadow:none}
.kfadd:hover{filter:brightness(.95)}
.kfcancel{width:30px;height:30px;border-radius:50%;background:transparent;color:#14173a;font-size:20px;line-height:1}
.kfcancel:hover{background:rgba(20,23,58,.1)}
@keyframes kdrop{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.kform{animation:none}}
.kcy,.kov.kdi{border:2.5px solid transparent;background:linear-gradient(#fff,#fff) padding-box,linear-gradient(90deg,var(--l1,#f5a623),var(--l2,#8b8ff5)) border-box}
.kcy{padding:0 7px}
.kov.kdi{display:inline-block;padding:0 8px;border-radius:99px;font:700 11px system-ui,'Segoe UI',sans-serif;color:#000;opacity:1}
:focus-visible{outline:2px solid #9db4ff;outline-offset:2px}`;

// ---------- build the panel ----------
const panel = document.createElement('div');
panel.id = 'skyclock-panel';
const root = panel.attachShadow({ mode: 'open' });
try { const sh = new CSSStyleSheet(); sh.replaceSync(CSS); root.adoptedStyleSheets = [sh]; }
catch (e) { const st = document.createElement('style'); st.textContent = CSS; root.append(st); }
['keydown', 'keyup', 'keypress'].forEach(ev => panel.addEventListener(ev, e => e.stopPropagation()));

const segSky = h('button', null, 'Sky'), segBlack = h('button', null, 'Black');
const seg = h('div', 'seg', null, segSky, segBlack);
seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Background style');
const cHM = h('span', null, '--'), cSS = h('span', 'sec'), cAP = h('span');
const cTime = h('div', 't', null, cHM, cSS, cAP), cDate = h('div', 'd'), cBadge = h('span', 'badge');
const phEls = names.map(n => { const s = h('small'), ic = h('i', null, n.split(' ')[0]), sp = h('span', null, n.split(' ')[1]); return { box: h('div', 'ph', null, ic, sp, s), s, ic, sp }; });
const dawnBox = phEls[0].box;
dawnBox.classList.add('edit'); dawnBox.title = 'Tap to set a custom start time'; dawnBox.setAttribute('role', 'button'); dawnBox.tabIndex = 0;
const wakeIn = h('input'); wakeIn.type = 'time'; wakeIn.setAttribute('aria-label', 'Custom start time');
const wakeSet = h('button', 'add sm2', 'Set'), wakeReset = h('button', 'add sm2', 'Default');
const autoCb = h('input'); autoCb.type = 'checkbox'; autoCb.checked = autoReset;
const editor = h('div', 'ed', null, h('div', 'ctl', null, wakeIn, wakeSet, wakeReset), h('label', 'chk', null, autoCb, h('span', null, 'Auto-reset to Default when the Custom cycle ends'))); editor.style.display = 'none';
const wakeNote = h('p', 'note');
const opt = (v, t) => { const o = h('option', null, t); o.value = v; return o; };
const zSel = h('select'); zSel.setAttribute('aria-label', 'Time zone');
zSel.append(opt('', '🏠 My location (default)'), ...ZONES.map(z => opt(z.id, z.flag + ' ' + z.city)));
const zTag = h('div', 'zt'), zTime = h('div', 'zl'), zSun = h('div', 'zl'), zDesc = h('p', 'zd');
const zInfo = h('div', null, null, zTag, zTime, zSun, zDesc); zInfo.style.display = 'none';
const zoneCard = h('section', 'g', null, h('div', 'ttl', 'Time zones & work culture'), zSel, zInfo, h('p', 'note', 'Broad tendencies, not rules: workplaces vary widely.'));
const zk = (emoji, text) => h('span', 'zk', emoji + ' ' + text);   // small key for the three emojis shown under a chosen time zone
const zoneKey = h('div', 'zkey', null, zk('🕒', 'Local time there'), zk('🌅', 'Sunrise there'), zk('🌇', 'Sunset there'));
zoneKey.setAttribute('aria-label', 'Key: clock is local time, sunrise and sunset are local times');
const segDef = h('button', null, 'Default'), segZone = h('button', null, 'Zone'), evSeg = h('div', 'seg', null, segDef, segZone);
evSeg.style.display = 'none'; evSeg.setAttribute('role', 'group'); evSeg.setAttribute('aria-label', 'Sunrise and sunset source');
const lblRise = h('span', null, 'Next sunrise'), lblSet = h('span', null, 'Next sunset');
const alH = h('input'), alM = h('input'), alGo = h('button', 'add', 'Start');
[[alH, 'h', 'Hours'], [alM, 'min', 'Minutes']].forEach(([i, p, a]) => { i.type = 'number'; i.min = '0'; i.setAttribute('inputmode', 'numeric'); i.placeholder = p; i.setAttribute('aria-label', a); });
alM.value = '25';
const alChips = h('div', 'chips'), alTime = h('div', 'alt'), alEnd = h('div', 'ale'), alFill = h('div', 'fill'), alCap = h('div', 'alc');
const alCancel = h('button', 'add sm2', 'Cancel'), alAgain = h('button', 'add sm2', 'Again'), alDone = h('button', 'add sm2', 'Dismiss');
const alSilence = h('button', 'add sm2', 'Silence'), alLapMain = h('span'), alLapSup = h('sup'), alLap = h('div', 'alp', null, alLapMain, alLapSup), alTest = h('button', 'add sm2', '🔔 Test alarm sound');
alSilence.style.display = 'none'; alLap.style.display = 'none'; alTest.style.marginTop = '10px';
const mkSw = (text, small) => { const i = h('input'); i.type = 'checkbox'; i.setAttribute('role', 'switch'); return { i, lab: h('label', 'sw' + (small ? ' sm' : ''), null, i, h('span', 'tk'), h('span', 'sl', text)) }; };
const setSw = (i, v) => { i.checked = !!v; i.setAttribute('aria-checked', String(!!v)); };
const alElSw = mkSw('Show elapsed time after it rings'); setSw(alElSw.i, alEl);
alElSw.i.onchange = () => { alEl = alElSw.i.checked; alElSw.i.setAttribute('aria-checked', String(alEl)); try { GM_setValue('alEl', alEl); } catch (e) {} tick(); };
const alBtns = h('div', 'ctl', null, alSilence, alCancel, alAgain, alDone); alBtns.style.marginTop = '10px';
const alBox = h('div', null, null, alTime, alEnd, alLap, h('div', 'bar sm', null, alFill), alCap, alBtns); alBox.style.display = 'none';
const alarmCard = h('section', 'g', null, h('div', 'ttl', 'Alarm timer'), h('div', 'ctl', null, alH, h('span', 'unit', 'h'), alM, h('span', 'unit', 'min'), alGo), alChips, alElSw.lab, alBox, alTest);
const phName = h('span'), phLeft = h('span'), fill = h('div', 'fill');
const inp = h('input'); inp.type = 'time'; inp.setAttribute('aria-label', 'Custom time');
const addBtn = h('button', 'add', 'Add'), chipBox = h('div', 'chips'), tl = h('div'), undoBar = h('div', 'undo');
const planSw = mkSw('Re-planning'); planSw.lab.classList.add('plan'); setSw(planSw.i, planning);
planSw.lab.title = 'Re-planning mode: change the time of a countdown, and keep an Undo box for every deleted countdown until you switch this off';
function setPlanning(on, revert) {
  planning = on; setSw(planSw.i, on);
  if (on) planSnap = JSON.stringify(tracked);
  else {
    if (revert && planSnap) { try { tracked = JSON.parse(planSnap); } catch (e) {} }   // every edit, deletion and addition made while planning is undone
    else tracked.forEach(t => { delete t.prev; });                                       // switching off normally clears the "was" notes
    trash = []; planSnap = null; save();
  }
  try { GM_setValue('plan', planning); GM_setValue('planSnap', planSnap); } catch (e) {}
  saveTrash(); planBar.style.display = on ? '' : 'none'; build();
}
const planBtn = h('button', 'add sm2', 'Undo all changes & exit re-planning'), planYes = h('button', 'cf yes', 'Undo all'), planNo = h('button', 'cf', 'Keep re-planning');
const planConf = h('div', 'conf big', null, h('span', null, 'Undo every change made in re-planning mode and exit it?'), planYes, planNo); planConf.style.display = 'none';
const planBar = h('div', null, null, planBtn, planConf); planBar.style.margin = '0 0 10px'; planBar.style.display = planning ? '' : 'none';
planBtn.onclick = () => { planBtn.style.display = 'none'; planConf.style.display = 'flex'; };
planNo.onclick = () => { planConf.style.display = 'none'; planBtn.style.display = ''; };
planYes.onclick = () => { planConf.style.display = 'none'; planBtn.style.display = ''; setPlanning(false, true); };
planSw.i.onchange = () => setPlanning(planSw.i.checked, false);
const evRise = h('b', 'hot', '--'), evSet = h('b', null, '--');
const hourRows = Array.from({ length: 6 }, () => ({ l: h('span'), v: h('b') }));
const evBox = h('div', null, null,
  h('div', 'ev', null, lblRise, evRise),
  h('div', 'ev', null, lblSet, evSet),
  ...hourRows.map(r => h('div', 'ev', null, r.l, r.v)));

// ---------- keyboard shortcuts (desktop app only) ----------
const skc = window.skyclock || null;
const SC = [['toggle', 'Show / hide the app'], ['theme', 'Switch Sky / Black'], ['quit', 'Quit the app']];
const SCKEYS = { Space: 'Space', Enter: 'Enter', Tab: 'Tab', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right', Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown', Insert: 'Insert', Minus: '-', Equal: '=', Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']', Backslash: '\\', Backquote: '`' };
const scKey = c => /^Key[A-Z]$/.test(c) ? c.slice(3) : /^Digit\d$/.test(c) ? c.slice(5) : /^F([1-9]|1\d|2[0-4])$/.test(c) ? c : (SCKEYS[c] || null);
const scBtn = {}, scMsg = h('p', 'note');
const scRows = SC.map(([k, label]) => { const b = h('button', 'add sm2', '…'); scBtn[k] = b; return h('div', 'ev', null, h('span', null, label), b); });
const scReset = h('button', 'add sm2', 'Reset to defaults');
const shortcutCard = h('section', 'g', null, h('div', 'ttl', 'Keyboard shortcuts'), ...scRows, scMsg, scReset,
  h('p', 'note', 'Tap a shortcut, then press the new keys. Also, while this window is selected: Ctrl+W hides it, Ctrl+B switches Sky / Black and Ctrl+Q quits.'));
shortcutCard.style.display = skc && skc.getShortcuts ? '' : 'none';
let scState = null, scRec = null;
function scShow() {
  SC.forEach(([k]) => {
    const s = scState && scState[k];
    scBtn[k].textContent = scRec === k ? 'Press keys…' : !s ? '…' : s.accel ? s.accel + (s.ok ? '' : ' (in use)') : 'Off';
  });
}
function scStop() { if (!scRec) return; scRec = null; skc.pauseShortcuts(false); scShow(); }
SC.forEach(([k]) => {
  scBtn[k].onclick = () => {
    if (!skc) return;
    if (scRec === k) { scStop(); return; }
    scStop(); scRec = k; skc.pauseShortcuts(true);
    scMsg.textContent = 'Press the new keys. Backspace turns it off, Esc cancels.'; scShow();
  };
});
scReset.onclick = () => { if (!skc) return; scStop(); skc.resetShortcuts().then(s => { scState = s; scMsg.textContent = 'Back to the defaults.'; scShow(); }); };
addEventListener('keydown', e => {
  if (!scRec) return;
  e.preventDefault(); e.stopPropagation();
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;   // wait for the real key
  const bare = !(e.ctrlKey || e.altKey || e.shiftKey || e.metaKey), name = scRec;
  if (e.key === 'Escape' && bare) { scStop(); return; }
  let accel;
  if ((e.key === 'Backspace' || e.key === 'Delete') && bare) accel = '';
  else {
    const key = scKey(e.code);
    if (!key) { scMsg.textContent = 'That key cannot be used. Try a letter, number or F-key.'; return; }
    accel = [e.ctrlKey && 'Ctrl', e.altKey && 'Alt', e.shiftKey && 'Shift', e.metaKey && 'Super'].filter(Boolean).concat(key).join('+');
  }
  skc.setShortcut(name, accel).then(res => {
    scMsg.textContent = res.ok ? (accel ? 'Saved: ' + accel : 'Turned off.') : res.error;
    if (res.ok) scState = res.shortcuts;
    scRec = null; skc.pauseShortcuts(false); scShow();
  });
}, true);
addEventListener('pointerdown', e => { if (scRec && !e.composedPath().includes(scBtn[scRec])) scStop(); }, true);
if (skc && skc.getShortcuts) skc.getShortcuts().then(s => { scState = s; scShow(); });
if (skc && skc.onTheme) skc.onTheme(() => applyMode(mode === 'sky' ? 'grain' : 'sky', true));   // the Sky / Black keybind

// ---------- pomodoro card (focus sessions of up to 7 pomodoros, with per-day averages) ----------
const PM_MAX = 7, PM_PRESETS = [[5, '5 min'], [10, '10 min'], [15, '15 min'], [25, '25 min'], [45, '45 min'], [60, '1 hr']];   // same buttons as the alarm timer
const pmH = h('input'), pmMin = h('input');
[[pmH, 'h', 'Pomodoro hours'], [pmMin, 'min', 'Pomodoro minutes']].forEach(([i, p, a]) => { i.type = 'number'; i.min = '0'; i.setAttribute('inputmode', 'numeric'); i.placeholder = p; i.setAttribute('aria-label', a); });
try { const len = +GM_getValue('pmLen', 25) || 25; pmH.value = len >= 60 ? String(Math.floor(len / 60)) : ''; pmMin.value = String(len % 60); } catch (e) { pmMin.value = '25'; }
const pmGo = h('button', 'add', 'Start'), pmChips = h('div', 'chips'), pmLbl = h('div', 'pms');
const pmCtl = h('div', null, null, pmLbl, h('div', 'ctl', null, pmH, h('span', 'unit', 'h'), pmMin, h('span', 'unit', 'min'), pmGo), pmChips);
const pmShowSw = mkSw('Show time worked', true); setSw(pmShowSw.i, pmShow);
const pmOpts = h('div', 'pmopts', null, pmShowSw.lab);
const pmHead = h('div', 'pmh'), pmTMain = h('span'), pmTSup = h('sup'), pmTime = h('div', 'alt', null, pmTMain, pmTSup), pmEnd = h('div', 'ale'), pmFill = h('div', 'fill'), pmBar = h('div', 'bar sm', null, pmFill), pmWork = h('div', 'ale');
pmTSup.style.display = 'none';
const pmPause = h('button', 'add sm2', 'Pause'), pmDone = h('button', 'add sm2', 'Done early'), pmQuit = h('button', 'add sm2', 'Quit this one'), pmExit = h('button', 'add sm2', 'Exit & see total'), pmStop = h('button', 'add sm2 endbtn', 'End session & see total');
const pmKeepSw = mkSw('Keep counting time after a pomodoro ends'); setSw(pmKeepSw.i, pmKeep);
const pmKeepTxt = h('div', 'pmkd'), pmKeepBox = h('div', 'pmkeep', null, pmKeepSw.lab, pmKeepTxt);
const pmCMsg = h('span'), pmC1 = h('button', 'cf yes', 'Yes'), pmC2 = h('button', 'cf', 'No'), pmC3 = h('button', 'cf', 'Keep going');
const pmConf = h('div', 'conf big', null, pmCMsg, pmC1, pmC2, pmC3); pmConf.style.display = 'none';
const pmBtns = h('div', 'ctl', null, pmPause, pmDone, pmQuit, pmExit, pmStop); pmBtns.style.marginTop = '10px'; pmBtns.style.flexWrap = 'wrap';
const pmRunBox = h('div', null, null, pmHead, pmTime, pmEnd, pmBar, pmWork, pmKeepBox, pmBtns, pmConf);
const pmSumTxt = h('div', 'pmt'), pmSumOk = h('button', 'add sm2', 'OK'), pmSum = h('div', 'pmsum', null, pmSumTxt, pmSumOk); pmSum.style.display = 'none';
const pmDayT = h('div', 'pms'), pmFull = h('b', 'pmv'), pmPart = h('b', 'pmv'), pmRate = h('b', 'pmv'), pmTot = h('b', 'pmv'), pmWeek = h('div', 'note'), pmIns = h('div', 'note');
const pmHistBtn = h('button', 'add sm2', 'Show history'), pmClear = h('button', 'add sm2', 'Clear history'), pmHist = h('div'); pmHist.style.display = 'none';
const pmFoot = h('div', 'ctl', null, pmHistBtn, pmClear); pmFoot.style.marginTop = '8px';
const pmStats = h('div', null, null, pmDayT,
  h('div', 'ev', null, h('span', null, 'Full pomodoros'), pmFull), h('div', 'ev', null, h('span', null, 'Quit early'), pmPart),
  h('div', 'ev', null, h('span', null, 'Completion'), pmRate), h('div', 'ev', null, h('span', null, 'Worked today'), pmTot),
  pmWeek, pmIns, pmFoot, pmHist);
const pomoCard = h('section', 'g', null, h('div', 'ttl', 'Pomodoro (focus timer)'), pmOpts, pmCtl, pmRunBox, pmSum, pmStats);
const tIn = h('input', 'tin'); tIn.type = 'text'; tIn.maxLength = 60; tIn.placeholder = 'Title (optional), e.g. Laundry'; tIn.setAttribute('aria-label', 'Timer title');
const tip = h('div', 'tip'); tip.setAttribute('role', 'tooltip');
const phTitle = h('div', 'ttl', 'Day and night in ' + locName());
const locSel = h('select'); locSel.setAttribute('aria-label', 'Your US time zone');
locSel.append(...US_LOCS.map(l => opt(l.id, l.label)), opt('gps', '📍 My location'));
const locGeo = h('button', 'add sm2', '📍 Find my location'), locInfo = h('div', 'zl'), locMsg = h('p', 'note');
locGeo.style.marginTop = '8px'; locInfo.style.marginTop = '8px'; locMsg.setAttribute('role', 'status');
const locSum = h('span', null, '📍 Your location');
const locBody = h('div', null, null, locSel, locInfo, locGeo, locMsg, h('p', 'note', 'Pick the US time zone you are in and every Dawn, Day, Dusk and Night time below will match your sky. Find my location asks an online lookup service (using your internet address) for roughly where you are; nothing else is sent. For accuracy, turn off your VPN or work network beforehand. Free lookup services may not always be available.'));
locBody.style.marginTop = '10px';
const locCard = h('details', 'g locbox', null, h('summary', null, null, locSum), locBody);   // collapsible: open it to change location, close it when done
try { locCard.open = GM_getValue('locOpen', false) === true; } catch (e) {}
locCard.addEventListener('toggle', () => { try { GM_setValue('locOpen', locCard.open); } catch (e) {} });
// ---------- sync between devices: a code made on one device is pasted into the site on another ----------
// (a static site has no server or account, so the code carries the data itself. Per-device things stay put: location, running alarm/pomodoro, window state.)
const SYNC_KEYS = ['fx', 'sleep', 'kanban', 'times', 'mode', 'wake', 'wakeEnd', 'zone', 'autoReset', 'alEl', 'pmKeep', 'pmShow', 'pmLen', 'pomo'];
const synBox = h('textarea', 'synct'); synBox.rows = 4; synBox.spellcheck = false; synBox.setAttribute('autocapitalize', 'off'); synBox.setAttribute('autocorrect', 'off');
synBox.setAttribute('aria-label', 'Sync code'); synBox.placeholder = 'Your sync code appears here, or paste a code from another device';
const synGet = h('button', 'add sm2', 'Get code from this device'), synUse = h('button', 'add sm2', 'Use this code here');
const synMsg = h('p', 'note'); synMsg.setAttribute('role', 'status');
const synYes = h('button', 'cf yes', 'Replace'), synNo = h('button', 'cf', 'Cancel');
const synConf = h('div', 'conf big', null, h('span', null, 'Replace this device’s tracked times, settings and pomodoro history with the ones in the code?'), synYes, synNo); synConf.style.display = 'none';
const synBtns = h('div', 'ctl', null, synGet, synUse);
const synCard = h('details', 'g locbox syn', null, h('summary', null, null, h('span', null, '🔄 Sync with the website')),
  h('p', 'note', 'To bring your data from the website (or another computer), press Get code in the website’s Sync box, paste it here and press Use this code here. To send data the other way, press Get code here and paste it into the website. Your tracked times, pomodoro history and settings carry over. Your location and any running alarm or pomodoro stay on each device.'),
  synBox, synBtns, synConf, synMsg,
  h('p', 'note', 'Anyone with the code can read your timer titles and pomodoro history, so send it only to yourself. Using a code replaces what is on this device, so tap Get code first if you want a backup. To sync again later, make a new code.'));
const synMake = () => {
  const o = {};
  SYNC_KEYS.forEach(k => { try { const raw = localStorage.getItem('skyclock:' + k); if (raw !== null) o[k] = raw; } catch (e) {} });
  if (o.pomo) { try { const v = JSON.parse(JSON.parse(o.pomo)); v.session = null; v.last = null; o.pomo = JSON.stringify(JSON.stringify(v)); } catch (e) { delete o.pomo; } }   // a pomodoro running right now is not copied
  const bytes = new TextEncoder().encode(JSON.stringify({ v: 1, t: Date.now(), d: o }));
  let bin = ''; bytes.forEach(b => { bin += String.fromCharCode(b); });
  return 'WWW1:' + btoa(bin);
};
const synRead = () => {   // returns the clean data from the pasted code, or null (with a message) if it is not valid
  try {
    const txt = synBox.value.trim();
    if (!txt.startsWith('WWW1:')) throw 0;
    const obj = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(txt.slice(5).replace(/\s+/g, '')), c => c.charCodeAt(0))));
    if (!obj || obj.v !== 1 || typeof obj.d !== 'object' || !obj.d) throw 0;
    const out = {};
    SYNC_KEYS.forEach(k => { const raw = obj.d[k]; if (typeof raw === 'string' && raw.length < 2e6) { try { JSON.parse(raw); out[k] = raw; } catch (e) {} } });
    if (!Object.keys(out).length) throw 0;
    return out;
  } catch (e) { synMsg.textContent = 'That does not look like a sync code. Copy the whole code from the other device, including the part that starts with WWW1:.'; return null; }
};
let synPending = null;
const synShow = ask => { synConf.style.display = ask ? 'flex' : 'none'; synBtns.style.display = ask ? 'none' : ''; };
synGet.onclick = () => {
  const code = synMake(); synBox.value = code; synBox.focus(); synBox.select(); synMsg.textContent = 'Code ready. Copy it if it was not copied for you, then paste it on your other device.';
  try { navigator.clipboard.writeText(code).then(() => { synMsg.textContent = 'Code copied. Paste it into the box on your other device and press Use this code here.'; }, () => {}); } catch (e) {}
};
synUse.onclick = () => { synMsg.textContent = ''; synPending = synRead(); if (synPending) synShow(true); };
synNo.onclick = () => { synPending = null; synShow(false); };
synYes.onclick = () => {
  const out = synPending; if (!out) { synShow(false); return; }
  window.__wwSync = true;   // stop the running page from writing over what we are about to store
  try { SYNC_KEYS.forEach(k => { if (k in out) localStorage.setItem('skyclock:' + k, out[k]); else localStorage.removeItem('skyclock:' + k); }); } catch (e) { window.__wwSync = false; synMsg.textContent = 'This browser would not let the data be saved.'; synShow(false); return; }
  synMsg.textContent = 'Done. Reloading…'; if (window.skyclock && window.skyclock.reload) window.skyclock.reload(); else location.reload();
};
// ---------- sky extras: toggles under Day and night (all worked out from your latitude and longitude, no network) ----------
const SYN = 29.530588853, H0M = 0.133, EPS = R * 23.4397, SVGNS = 'http://www.w3.org/2000/svg';
let fx = { sun: false, gold: false, blue: false, moon: false }, fxLast = 0, moonCache = { key: '', ev: [] };
try { const v = JSON.parse(GM_getValue('fx', 'null')); if (v) Object.keys(fx).forEach(k => { fx[k] = !!v[k]; }); } catch (e) {}
const baseOf = (d, o) => { const q = ymd.formatToParts(d), g = t => +q.find(x => x.type === t).value; return Date.UTC(g('year'), g('month') - 1, g('day'), 16) + o * 864e5; };
const dj = ms => ms / 864e5 + 2440587.5 - 2451545;
function sunPos(ms) {                                  // altitude and compass bearing of the sun right now
  const d = dj(ms), M = R * (357.5291 + 0.98560028 * d), C = R * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + R * (180 + 102.9372), dec = Math.asin(Math.sin(EPS) * Math.sin(L)), ra = Math.atan2(Math.sin(L) * Math.cos(EPS), Math.cos(L));
  const Hh = R * (280.16 + 360.9856235 * d) + R * LON - ra, la = LAT * R;
  const alt = Math.asin(Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(Hh)) / R;
  const az = (Math.atan2(Math.sin(Hh), Math.cos(Hh) * Math.sin(la) - Math.tan(dec) * Math.cos(la)) / R + 180 + 360) % 360;
  return { alt, az };
}
function moonAlt(ms) {                                 // low-precision moon position (good to about a degree)
  const d = dj(ms), L = R * (218.316 + 13.176396 * d), M = R * (134.963 + 13.064993 * d), Fm = R * (93.272 + 13.22935 * d);
  const l = L + R * 6.289 * Math.sin(M), b = R * 5.128 * Math.sin(Fm);
  const ra = Math.atan2(Math.sin(l) * Math.cos(EPS) - Math.tan(b) * Math.sin(EPS), Math.cos(l));
  const dec = Math.asin(Math.sin(b) * Math.cos(EPS) + Math.cos(b) * Math.sin(EPS) * Math.sin(l));
  const Hh = R * (280.16 + 360.9856235 * d) + R * LON - ra, la = LAT * R;
  return Math.asin(Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(Hh)) / R;
}
function moonList(n) {                                 // moonrise and moonset times around now, rebuilt every 5 minutes
  const key = Math.floor(n / 3e5) + ':' + LAT + ':' + LON;
  if (moonCache.key === key) return moonCache.ev;
  const ev = [], st = 6e5; let t0 = n - 26 * 36e5, prev = moonAlt(t0) - H0M;
  for (let t = t0 + st; t <= n + 30 * 36e5; t += st) { const a = moonAlt(t) - H0M; if ((prev < 0) !== (a < 0)) ev.push({ t: t - st + st * prev / (prev - a), rise: a >= 0 }); prev = a; }
  moonCache = { key, ev }; return ev;
}
function bands(d, zA, zB) {                            // the morning and evening windows when the sun is between two angles (zenith angles zA < zB)
  const out = [];
  for (const o of [-1, 0, 1, 2]) { const b = baseOf(d, o), lo = sun(b, zB), hi = sun(b, zA); out.push({ s: lo[0], e: hi[0], k: 'morning' }, { s: hi[1], e: lo[1], k: 'evening' }); }
  return out.sort((x, y) => x.s - y.s);
}
const moonName = p => (p < 0.0339 || p >= 0.9661 ? 'New Moon' : p < 0.2161 ? 'Waxing Crescent' : p < 0.2839 ? 'First Quarter' : p < 0.4661 ? 'Waxing Gibbous' : p < 0.5339 ? 'Full Moon' : p < 0.7161 ? 'Waning Gibbous' : p < 0.7839 ? 'Last Quarter' : 'Waning Crescent');
const moonPath = p => { const k = Math.cos(2 * Math.PI * p), rx = (18 * Math.abs(k)).toFixed(2); return p < 0.5 ? 'M20 2 A18 18 0 0 1 20 38 A' + rx + ' 18 0 0 ' + (k > 0 ? 0 : 1) + ' 20 2 Z' : 'M20 2 A18 18 0 0 0 20 38 A' + rx + ' 18 0 0 ' + (k > 0 ? 1 : 0) + ' 20 2 Z'; };
const sv = (tag, a) => { const e = document.createElementNS(SVGNS, tag); for (const k in a) e.setAttribute(k, a[k]); return e; };
const GUIDE = {
  sun: [
    ['🎯 Productivity', 'Treat the sun’s height as an energy clock. Many people feel sharpest while the sun is still climbing, so put deep work there and save email, errands and admin for the afternoon dip after solar noon. It is a cue, not a rule: notice when you are most alert and plan around that.'],
    ['💼 Workplace', 'Solar noon is the true midpoint of your daylight, a natural halfway checkpoint for the day. “Daylight left” helps you plan site visits, deliveries, outdoor meetings and a lunchtime walk before it gets dark.'],
    ['⏳ Time blindness', 'The bar shrinks on its own as daylight runs out, so you can see time passing without reading a clock. The compass direction and height give you something to check by simply looking out a window.'],
    ['🏃 Extracurricular', 'Plan runs, rides, practice, gardening or photography around the daylight you actually have. The “vs yesterday” number shows whether days are getting longer or shorter, which helps with seasonal planning.']
  ],
  gold: [
    ['🎯 Productivity', 'Use the evening window as a soft deadline: aim to finish your main task before it starts, then step outside for ten minutes. The morning window is a good cue for a walk or a first focus block before the day gets busy.'],
    ['💼 Workplace', 'It warns you that sunset is close, so you can leave on time, finish outdoor work or get home in daylight. It also fits any work that depends on good light, such as photo shoots, property or construction photos, filming and site inspections.'],
    ['⏳ Time blindness', 'A countdown to a visible, changing landmark is easier to feel than a number on a clock. “Golden hour starts in 40 minutes” gives you a clear transition point with a start and an end.'],
    ['🏃 Extracurricular', 'Best light for photography and video, outdoor workouts, golf, dog walks, drone flights and evening sports practice. Check the window early in the day so you can plan to be outside for it.']
  ],
  blue: [
    ['🎯 Productivity', 'In the evening, blue hour is a natural wind-down signal: close the last task, dim screens and start your routine. In the morning it is a quiet window before sunrise, handy for a calm first focus session.'],
    ['💼 Workplace', 'For early or late shifts and outdoor crews, it marks when real darkness is about to arrive. Use it to switch on vehicle and work lights, wrap up outdoor jobs or time a safe commute.'],
    ['⏳ Time blindness', 'It is the last easy-light cue of the day. Once the bar is full, it is night, which makes it a good final “start wrapping up” signal for people who lose track of the evening.'],
    ['🏃 Extracurricular', 'Great for cityscape and long-exposure photography, setting up a telescope (the sky gets properly dark soon after), evening fishing, and running with reflective gear.']
  ],
  moon: [
    ['🎯 Productivity', 'The 29.5-day cycle makes a simple monthly planning rhythm: set goals near the new moon and review near the full moon. That is a planning ritual rather than science, but a regular monthly checkpoint genuinely helps projects stay on track.'],
    ['💼 Workplace', 'Use it as a monthly anchor for reports, goals and reviews. For night or outdoor work, a high, bright moon above the horizon means more natural light, and a new moon means it will be very dark.'],
    ['⏳ Time blindness', '“Day 12 of 29.5” shows the month passing in a way dates and weeks sometimes do not, which helps when days blur together. Moonrise and moonset also give night owls a sense of how late it really is.'],
    ['🏃 Extracurricular', 'Stargazing is best around the new moon, when the sky is darkest. Night photography, night hikes, camping and fishing plans benefit from knowing when the moon is up and how full it is.']
  ]
};
const tipOn = (el, text) => {   // hover (or keyboard focus, or tap) pop-up that explains what a line means for work or sleep
  el.tabIndex = 0; el.classList.add('fxtip');
  let t = 0; const on = () => showTip(el, typeof text === 'function' ? text() : text);
  el.addEventListener('mouseenter', on); el.addEventListener('mouseleave', hideTip);
  el.addEventListener('focus', on); el.addEventListener('blur', hideTip);
  el.addEventListener('click', () => { on(); clearTimeout(t); t = setTimeout(hideTip, 5000); });
};
const fmtD = s => (s >= 86400 ? Math.floor(s / 86400) + 'd ' : '') + fmt(s % 86400);
const TIPS = {
  sun: {
    val: 'How high the sun is above the horizon. Above about 30° is strong daylight, good for alertness at work. Below 0° it is night: dim lights and screens to help your body wind down for sleep.',
    tm: 'While the sun is up, this counts up from sunrise: how long you have already had daylight today, a handy way to see how much of the day is gone. At night it counts down to the next sunrise, a cue for morning light, which helps set your sleep schedule.',
    l1: 'Where the sun is in your sky. Useful for spotting window glare on your screen, and for guessing the time of day without a clock.',
    l2: 'Solar noon is the midpoint of daylight: a natural halfway checkpoint for the workday. Daylight length shows how much natural light you get, and short days can make you sleepy earlier in the evening. The first change is versus yesterday; the second adds up every daily change since the days last turned (the last solstice), and starts over when they turn again.',
    l3: 'How much daylight is left, which is also the time until sunset. Use it as a deadline for outdoor work and commutes.',
    noon: 'Counts down to the sun’s highest point. A good midday cue for a break or a walk: daytime light can help your energy now and your sleep later. After noon has passed, the orange timer shows how long ago it was, and it clears when the next day begins.'
  },
  gold: {
    tm: 'Counts down to the next golden hour, or the time left if one is active. A handy cue to wrap up focused work, or step outside for soft light and a break.',
    end: 'Counts down to when the next golden-hour window ends. Use it as a soft deadline: finish the walk, outdoor task or photos before the light changes. For the evening window, start easing out of work mode.',
    l1: 'The next window, or the active one. Morning light helps you wake up and set your body clock. The evening window is a good signal that the workday is ending.',
    l2: 'Both golden-hour windows today. Morning: a good time for a walk before work. Evening: a cue to finish up and start easing toward sleep.',
    l3: 'Golden hour is when the sun is low and the light is warm and soft. Gentler light is a good moment to switch from work mode to relaxing.'
  },
  blue: {
    tm: 'Counts down to the next blue hour, or the time left if one is active. In the evening it is your cue to start dimming lights and screens before bed.',
    end: 'Counts down to when the next blue-hour window ends. In the morning it ends near sunrise; in the evening it ends as full darkness arrives, so finish outdoor work or turn on lights.',
    l1: 'The next window, or the active one. Evening: wind down and prepare for sleep. Morning: the quiet stretch before sunrise, useful for early shifts or a calm first task.',
    l2: 'Both blue-hour windows today. Use the evening one as a reminder to switch off bright screens and start a bedtime routine.',
    l3: 'Blue hour is deep twilight: the sky is blue but the sun is below the horizon. It is the last natural light before night, so it works well as a wind-down cue.'
  },
  moon: {
    val: 'How much of the moon is lit. Near full means brighter nights, which can make a bedroom lighter, so blackout curtains can help sleep. Near new means very dark skies, best for stargazing.',
    tm: 'Counts down to moonrise or moonset. For night shifts, outdoor work or late walks it tells you when there is moonlight. For sleep, it shows when extra light may enter your room.',
    phase: 'The phase name and the day of the 29.5-day cycle. A simple monthly checkpoint for work reviews and goals, and a way to feel the month passing.',
    l1: 'Whether the moon is above your horizon and when it next rises or sets. Handy for planning evening commutes, night shifts or outdoor work without extra lighting.',
    l2: 'The next full and new moons. Use them as monthly markers: plan goals near the new moon and reviews near the full moon, and expect brighter or darker nights around them.',
    l3: 'Approximate timing: the phase is good to about a day and rise or set to a few minutes. Treat it as planning guidance, not an exact schedule.',
    cycle: 'The moon repeats an 8-stage cycle about every 29.5 days. The highlighted stage is where we are now.\n\nWhen it rises (about 50 min later each day):\n🌑 New Moon: near sunrise\n🌒 Waxing Crescent: mid-morning\n🌓 First Quarter: around noon\n🌔 Waxing Gibbous: afternoon\n🌕 Full Moon: around sunset\n🌖 Waning Gibbous: evening to night\n🌗 Last Quarter: around midnight, about 6 hours before sunrise\n🌘 Waning Crescent: a few hours down to under an hour before sunrise\n\nFrom full moon until just before new moon, the moon rises before the sun. For sleep, nights around the full moon are the brightest.',
    sleep: 'Whether the next moonrise falls inside your sleep hours. If it does and the moon is bright, light may reach your room: blackout curtains or an eye mask help. Change the times to match your own schedule.',
    lit: 'Counts down to the next full moon (while it is growing) or new moon (while it is shrinking). A monthly countdown for work milestones, and a heads-up for brighter or darker nights.'
  }
};
function fxPanel(c1, c2, emoji, title, guide, tips) {
  const tag = h('span', 'fxlive', '● LIVE'), val = h('b', 'fxv'), tm = h('b', 'fxv fxtm'), fill = h('div', 'fxfill'), bar = h('div', 'fxbar', null, fill);
  const l1 = h('div', 'fxl'), l2 = h('div', 'fxl'), l3 = h('div', 'fxl sm');
  const gd = h('details', 'fxg', null, h('summary', null, 'How to use this'), ...guide.map(([t, x]) => h('p', 'fxgp', null, h('strong', null, t + ': '), x)));
  const box = h('div', 'fxp', null, h('div', 'fxh', null, h('span', 'fxt', emoji + ' ' + title), tag, val, tm), bar, l1, l2, l3, gd);
  box.style.setProperty('--fa', c1); box.style.setProperty('--fb', c2); box.style.display = 'none'; box.setAttribute('role', 'group'); box.setAttribute('aria-label', title); tag.style.display = 'none';
  const els = { val, tm, l1, l2, l3 }; Object.keys(els).forEach(k => { if (tips[k]) tipOn(els[k], tips[k]); });
  return { box, tag, val, tm, fill, bar, l1, l2, l3, gd };
}
const pSun = fxPanel('#ffd84d', '#4fc3ff', '☀️', 'Sun now', GUIDE.sun, TIPS.sun), pGold = fxPanel('#ffb42e', '#ff5e3a', '🌇', 'Golden hour', GUIDE.gold, TIPS.gold), pBlue = fxPanel('#2f4bff', '#7fd0ff', '🔵', 'Blue hour', GUIDE.blue, TIPS.blue), pMoon = fxPanel('#e4e9ff', '#8a63ff', '🌙', 'Moon', GUIDE.moon, TIPS.moon);
const moonSvg = sv('svg', { viewBox: '0 0 40 40', width: '46', height: '46', 'aria-hidden': 'true' }), moonG = sv('g', {}), moonLit = sv('path', { fill: '#f3eed2' });
moonG.append(sv('circle', { cx: 20, cy: 20, r: 18, fill: '#1b1e44', stroke: 'rgba(255,255,255,.35)', 'stroke-width': 1 }), moonLit); moonSvg.append(moonG);
const mName = h('b'), mAge = h('span'), litFill = h('div', 'fxfill'), litBar = h('div', 'fxbar', null, litFill); litBar.style.marginTop = '8px';
pMoon.box.insertBefore(h('div', 'fxmoon', null, moonSvg, h('div', null, null, mName, mAge)), pMoon.bar);
pMoon.box.insertBefore(litBar, pMoon.l2);
const mkLine = tip => { const e = h('div', 'fxl'); tipOn(e, tip); return e; };
const litTm = mkLine(TIPS.moon.lit); pMoon.box.insertBefore(litTm, pMoon.l2); tipOn(mName, TIPS.moon.phase); tipOn(mAge, TIPS.moon.phase);
const noonFill = h('div', 'fxfill'), noonBar = h('div', 'fxbar', null, noonFill), noonTm = mkLine(TIPS.sun.noon);
noonFill.style.background = 'linear-gradient(90deg,#fff3a0,#ffb42e)'; noonBar.style.marginTop = '8px';
pSun.box.insertBefore(noonBar, pSun.gd); pSun.box.insertBefore(noonTm, pSun.gd);
pGold.end = mkLine(TIPS.gold.end); pGold.box.insertBefore(pGold.end, pGold.l2); pGold.done = h('div', 'fxl'); pGold.box.insertBefore(pGold.done, pGold.l2);
pBlue.end = mkLine(TIPS.blue.end); pBlue.box.insertBefore(pBlue.end, pBlue.l2); pBlue.done = h('div', 'fxl'); pBlue.box.insertBefore(pBlue.done, pBlue.l2);
// mini moon-cycle display: the 8 stages with the current one lit, plus whether the next moonrise lands in your sleep hours (small, in the panel's flow, nothing floats over the page)
const MOON_NAMES = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
const cyItems = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'].map(ic => h('span', 'fxci', ic));
const cyStrip = h('div', 'fxcs', null, ...cyItems), cyTxt = h('div', 'fxcn'), slRes = h('div', 'fxsr');
const RISE_AT = ['near sunrise', 'mid-morning', 'around noon', 'in the afternoon', 'around sunset', 'in the evening to night', 'around midnight, about 6 hours before sunrise', 'from a few hours to under an hour before sunrise'];
const cyRise = h('div', 'fxcn');
cyStrip.setAttribute('role', 'img');
let slp = { b: 1320, w: 360 };   // bedtime and wake time, minutes after midnight
try { const v = JSON.parse(GM_getValue('sleep', 'null')); if (v && v.b >= 0 && v.b < 1440 && v.w >= 0 && v.w < 1440) slp = { b: +v.b, w: +v.w }; } catch (e) {}
const tmStr = m => p2(Math.floor(m / 60)) + ':' + p2(m % 60);
const slBed = h('input'), slWake = h('input'); [slBed, slWake].forEach((i, k) => { i.type = 'time'; i.setAttribute('aria-label', k ? 'Wake-up time' : 'Bedtime'); });
slBed.value = tmStr(slp.b); slWake.value = tmStr(slp.w);
const slSave = () => { const rd = v => { const q = String(v).split(':').map(Number); return q.length >= 2 && isFinite(q[0]) && isFinite(q[1]) ? q[0] * 60 + q[1] : null; }, b = rd(slBed.value), w = rd(slWake.value); if (b != null && w != null) { slp = { b, w }; try { GM_setValue('sleep', JSON.stringify(slp)); } catch (e) {} } fxTick(Date.now(), true); };
slBed.onchange = slWake.onchange = slSave;
const cyBox = h('div', 'fxcy', null, cyStrip, cyTxt, cyRise, h('div', 'fxsl', null, h('span', null, '🛏 Sleep'), slBed, h('span', null, 'to'), slWake), slRes);
for (let k = 0; k < 16; k++) { const st = h('i', 'fxstar' + (k % 4 === 0 ? ' b' : '')); st.style.left = ((k * 37 + 11) % 97) + '%'; st.style.top = ((k * 53 + 7) % 89) + '%'; st.style.animationDelay = ((k * 0.37) % 2.6).toFixed(2) + 's'; st.setAttribute('aria-hidden', 'true'); cyBox.prepend(st); }
tipOn(cyStrip, TIPS.moon.cycle); tipOn(slRes, TIPS.moon.sleep);
pMoon.box.insertBefore(cyBox, pMoon.gd);
const inSleep = ms => { const m = Math.floor(sodOf(ms) / 60); return slp.b === slp.w ? false : slp.b < slp.w ? m >= slp.b && m < slp.w : m >= slp.b || m < slp.w; };
const moonIllumAt = ms => { const a = (((ms / 864e5 + 2440587.5 - 2451550.26) % SYN) + SYN) % SYN; return (1 - Math.cos(2 * Math.PI * a / SYN)) / 2; };
let sunCum = { key: '', v: null, label: '' };
function daylightCum(d) {   // how much daylight has been gained or lost in total since the days last turned (the last solstice): every daily change in the same direction added up
  const key = ymd.format(d) + ':' + LAT + ':' + LON;
  if (sunCum.key === key) return sunCum;
  const L = o => { const b = sun(baseOf(d, o), 90.833); return b[1] - b[0]; }, sgn = x => (Math.abs(x) < 500 ? 0 : x > 0 ? 1 : -1);   // under half a second a day counts as flat
  const now0 = L(0), dir = sgn(now0 - L(-1)); let k = 0, Lk = now0;
  sunCum = { key, v: null, label: '' };
  if (!dir || !isFinite(now0)) return sunCum;
  while (k > -370) { const Lp = L(k - 1); if (sgn(Lk - Lp) !== dir) break; k--; Lk = Lp; }   // walk back day by day until the direction changes: that day is the turning point
  sunCum.v = now0 - Lk; sunCum.label = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }).format(baseOf(d, k) - 4 * 36e5);
  return sunCum;
}
const rngCache = new Map();
function rangesFor(ms) {   // the daylight, golden-hour and blue-hour windows around a moment (cached per day and place)
  const d = new Date(ms), key = ymd.format(d) + ':' + LAT + ':' + LON; let r = rngCache.get(key);
  if (!r) { const day = []; for (const o of [-1, 0, 1]) { const b = sun(baseOf(d, o), 90.833); day.push({ s: b[0], e: b[1] }); } r = { sun: day, gold: bands(d, 84, 94), blue: bands(d, 94, 98) }; if (rngCache.size > 12) rngCache.clear(); rngCache.set(key, r); }
  return r;
}
const inWin = (b, t) => { const m = Math.floor(t / 6e4); return m >= Math.floor(b.s / 6e4) && m < Math.floor(b.e / 6e4); };   // compared by whole minutes, the way the times are shown: a window listed as 5:00 PM-5:47 PM includes a 5:00 PM timer
const inAny = (list, t) => list.some(b => inWin(b, t));
const liveNow = (list, t, n) => list.some(b => inWin(b, t) && inWin(b, n));   // the window your time falls in is the one happening right now
function rowChips(r, tgt, n, past) {   // indicators on a Time until row: a small circle when your chosen time sits in that window, the full label with LIVE while that window is happening right now
  const a = rangesFor(tgt);
  const st = [[inAny(a.sun, tgt), liveNow(a.sun, tgt, n)], [inAny(a.gold, tgt), liveNow(a.gold, tgt, n)], [inAny(a.blue, tgt), liveNow(a.blue, tgt, n)]];
  st.forEach(([inside, live], i) => { r.chips[i].box.style.display = inside ? '' : 'none'; r.chips[i].live.style.display = inside && live ? '' : 'none'; r.chips[i].box.classList.toggle('dot', !(inside && live)); r.chips[i].box.classList.toggle('past', !!past); });
  r.chipRow.style.display = st.some(x => x[0]) ? 'flex' : 'none'; const anyLive = st.some(x => x[0] && x[1]); r.chipRow.classList.toggle('live', anyLive);
  if (anyLive !== r.chipLive) { r.chipLive = anyLive; const bar = r.row.querySelector('.bar'); if (anyLive && bar) r.row.insertBefore(r.chipRow, bar); else r.tr1.append(r.chipRow); }   // live: the indicators get their own full-width line under the time and countdown; otherwise the small circles sit beside the time   // any live: the row drops under the time; otherwise the circles sit beside it
}
function bandPanel(p, list, name, hint, n, when) {
  const cur = list.find(b => n >= b.s && n < b.e), nxt = list.find(b => b.s > n), prev = [...list].reverse().find(b => b.e <= n);
  const kind = b => (b.k === 'morning' ? '🌅 morning' : '🌇 evening');
  p.box.classList.toggle('live', !!cur); p.tag.style.display = cur ? '' : 'none';
  if (cur) { p.tm.textContent = 'Now · ' + fmt(Math.ceil((cur.e - n) / 1000)) + ' left'; p.fill.style.width = (100 * (n - cur.s) / (cur.e - cur.s)) + '%'; p.l1.textContent = 'Active: ' + kind(cur) + ' ' + name + ' until ' + clk.format(cur.e); }
  else if (nxt) { const from = prev ? prev.e : nxt.s - 12 * 36e5; p.tm.textContent = 'In ' + fmt(Math.ceil((nxt.s - n) / 1000)); p.fill.style.width = Math.max(0, Math.min(100, 100 * (n - from) / (nxt.s - from))) + '%'; p.l1.textContent = 'Next: ' + kind(nxt) + ' ' + name + ' at ' + when(nxt.s); }
  else { p.tm.textContent = '--'; p.fill.style.width = '0%'; p.l1.textContent = 'No ' + name + ' found here right now.'; }
  const lab = b => (b.k === 'morning' ? '🌅 Morning ' : '🌇 Evening ');   // the end timer only runs inside a window; outside it shows that the last one is done
  p.end.textContent = cur ? '⏱ ' + lab(cur) + name + ' ends in ' + fmt(Math.ceil((cur.e - n) / 1000)) + ' (at ' + when(cur.e) + ')' : ''; p.end.style.display = cur ? '' : 'none';
  const gone = list.filter(b => b.e <= n && ymd.format(b.e) === ymd.format(n));   // every segment that already ended today, each with its own running elapsed time
  p.done.replaceChildren(...gone.map(b => h('div', null, '✔ ' + lab(b) + name + ' ended ' + when(b.e) + ' · ', h('span', 'fxel', '-' + fmt(Math.floor((n - b.e) / 1000))))));
  p.done.style.display = gone.length ? '' : 'none';
  const today = list.filter(b => ymd.format(b.s) === ymd.format(n));
  p.l2.textContent = today.length ? 'Today: ' + today.map(b => (b.k === 'morning' ? '🌅 ' : '🌇 ') + clk.format(b.s) + '–' + clk.format(b.e)).join(' · ') : '';
  p.l3.textContent = hint;
}
function fxTick(n, force) {
  if (!force && n - fxLast < 1000) return; fxLast = n;
  if (!(fx.sun || fx.gold || fx.blue || fx.moon)) return;
  const d = new Date(n), when = ms => (ymd.format(ms) === ymd.format(n) ? clk.format(ms) : wkf.format(ms));
  if (fx.sun) {
    const sp = sunPos(n), evs = [], noons = []; let len = 0, dl = 0, noon = n;
    for (const o of [-1, 0, 1, 2]) { const b = sun(baseOf(d, o), 90.833); evs.push({ t: b[0], k: 1 }, { t: b[1], k: 2 }); noons.push((b[0] + b[1]) / 2); if (o === -1) dl = b[1] - b[0]; if (o === 0) { len = b[1] - b[0]; noon = (b[0] + b[1]) / 2; } }
    evs.sort((x, y) => x.t - y.t); const i = evs.findIndex(e => e.t > n), pe = evs[i - 1], ne = evs[i], up = sp.alt > -0.833;
    const p = pSun; p.box.classList.toggle('live', up); p.tag.style.display = up ? '' : 'none';
    p.val.textContent = sp.alt.toFixed(1) + '°';
    p.tm.textContent = pe && pe.k === 1 ? '🌅 Since Sunrise: - ' + fmt(Math.floor((n - pe.t) / 1000)) : ne ? '🌅 Sunrise in ' + fmt(Math.ceil((ne.t - n) / 1000)) : '';   // sun up: counts UP from sunrise (daylight left already counts down to sunset); at night: counts down to sunrise
    noons.sort((x, y) => x - y); const nn = noons.find(x => x > n), pn = [...noons].reverse().find(x => x <= n);
    noonFill.style.width = nn && pn ? (100 * (n - pn) / (nn - pn)) + '%' : '0%';
    const noonEl = n >= noon ? Math.floor((n - noon) / 1000) : -1;   // today's solar noon already passed: count up from it; tomorrow (new date) today's noon is ahead again, so this disappears
    noonTm.replaceChildren(nn ? '🕛 Solar noon in ' + fmt(Math.ceil((nn - n) / 1000)) + ' (at ' + when(nn) + ')' : '', ...(noonEl >= 0 ? [h('div', null, '· ', h('span', 'fxel', '-' + fmt(noonEl)), ' elapsed')] : []));
    if (pe && ne) { p.fill.style.width = (100 * (n - pe.t) / (ne.t - pe.t)) + '%'; p.l3.textContent = pe.k === 1 ? 'Daylight left/ Sunset in: ' + fmt(Math.ceil((ne.t - n) / 1000)) : ''; p.l3.style.display = p.l3.textContent ? '' : 'none'; }
    p.l1.textContent = '🧭 ' + ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(sp.az / 45) % 8] + ' ' + Math.round(sp.az) + '° · ' + (sp.alt >= 0 ? 'above' : 'below') + ' the horizon';
    const diff = len - dl, hm = ms => Math.floor(ms / 36e5) + 'h ' + p2(Math.floor(ms % 36e5 / 6e4)) + 'm';
    const cu = len < 864e5 - 36e5 ? daylightCum(d) : null, sg = x => (x >= 0 ? '+' : '−') + fmt(Math.round(Math.abs(x) / 1000));
    p.l2.textContent = len < 864e5 - 36e5 ? '🕛 Solar noon ' + clk.format(noon) + ' · daylight ' + hm(len) + ' (' + sg(diff) + ' vs yesterday' + (cu && cu.v != null ? ' · ' + sg(cu.v) + ' since ' + cu.label : '') + ')' : '🕛 Solar noon ' + clk.format(noon);   // daily change and the running total since the days last turned, side by side
    p.l3.classList.remove('sm');
  }
  if (fx.gold) bandPanel(pGold, bands(d, 84, 94), 'golden hour', 'Soft, warm light: the sun is between 4° below and 6° above the horizon.', n, when);
  if (fx.blue) bandPanel(pBlue, bands(d, 94, 98), 'blue hour', 'Deep blue twilight: the sun is 4° to 8° below the horizon.', n, when);
  if (fx.moon) {
    const age = (((n / 864e5 + 2440587.5 - 2451550.26) % SYN) + SYN) % SYN, ph = age / SYN, illum = (1 - Math.cos(2 * Math.PI * ph)) / 2;
    moonLit.setAttribute('d', moonPath(ph)); moonG.setAttribute('transform', LAT < 0 ? 'translate(40 0) scale(-1 1)' : '');
    mName.textContent = moonName(ph); mAge.textContent = 'Day ' + age.toFixed(1) + ' of 29.5';
    const p = pMoon, alt = moonAlt(n), ev = moonList(n); let i = ev.findIndex(e => e.t > n); if (i < 0) i = ev.length;
    const pe = ev[i - 1], ne = ev[i], up = alt > H0M;
    p.val.textContent = Math.round(illum * 100) + '% lit'; litFill.style.width = (illum * 100) + '%';
    p.tm.textContent = ne ? (up ? '🌙 Sets in ' : '🌙 Rises in ') + fmt(Math.ceil((ne.t - n) / 1000)) : '';
    const idx = MOON_NAMES.indexOf(moonName(ph)), lun = Math.floor((n / 864e5 + 2440587.5 - 2451550.26) / SYN) + 953;   // Brown lunation count: cycle 1 began in January 1923
    cyItems.forEach((e, k) => { e.classList.toggle('on', k === idx); e.classList.toggle('flip', LAT < 0); });
    cyStrip.setAttribute('aria-label', 'Moon cycle: stage ' + (idx + 1) + ' of 8, ' + MOON_NAMES[idx]);
    cyTxt.textContent = 'Stage ' + (idx + 1) + ' of 8 · ' + MOON_NAMES[idx] + ' · moon cycle #' + lun.toLocaleString('en-US') + ' since 1923';
    cyRise.textContent = cyItems[idx].textContent + ' Usually rises ' + RISE_AT[idx];   // when this phase of the moon typically comes up
    const rs = ev.find(e => e.rise && e.t > n), sl = rs ? inSleep(rs.t) : false;
    slRes.className = 'fxsr ' + (!rs || slp.b === slp.w ? '' : sl ? 'warn' : 'ok'); slRes.classList.add('fxtip');
    slRes.textContent = slp.b === slp.w ? 'Set different bedtime and wake-up times.' : rs ? '🌙 Next moonrise ' + when(rs.t) + ' · ' + (sl ? '🛌 during your sleep' : '✅ not during your sleep') + ' · ' + Math.round(moonIllumAt(rs.t) * 100) + '% lit' : 'No moonrise found in the next day.';
    litTm.textContent = age < SYN / 2 ? '🌕 Full moon in ' + fmtD(Math.ceil((SYN / 2 - age) * 86400)) : '🌑 New moon in ' + fmtD(Math.ceil((SYN - age) * 86400));
    p.box.classList.toggle('live', up); p.tag.style.display = up ? '' : 'none';
    p.fill.style.width = pe && ne ? Math.max(0, Math.min(100, 100 * (n - pe.t) / (ne.t - pe.t))) + '%' : '0%';
    p.l1.textContent = pe || ne ? (up ? 'Above the horizon (' + alt.toFixed(0) + '°)' + (ne ? ' · sets ' + when(ne.t) : '') : 'Below the horizon' + (ne ? ' · rises ' + when(ne.t) : '')) : 'No moonrise or moonset found in this window.';
    p.l2.textContent = 'Next full moon ' + pmFmtDay.format(n + (age < SYN / 2 ? SYN / 2 - age : SYN * 1.5 - age) * 864e5) + ' · new moon ' + pmFmtDay.format(n + (SYN - age) * 864e5);
    p.l3.textContent = 'Phase is approximate (within about a day); rise and set within a few minutes. The picture mirrors south of the equator.';
  }
  [pSun, pGold, pBlue, pMoon].forEach(q => [q.val, q.tm].forEach(e => { e.style.display = e.textContent ? '' : 'none'; }));
}
const fxDefs = [['sun', '☀️ Sun now', pSun], ['gold', '🌇 Golden hour', pGold], ['blue', '🔵 Blue hour', pBlue], ['moon', '🌙 Moon', pMoon]];
const fxRow = h('div', 'fxrow'); fxRow.setAttribute('role', 'group'); fxRow.setAttribute('aria-label', 'Sky extras for your location');
fxDefs.forEach(([k, label, pn]) => {
  const sw = mkSw(label, true), nm = label.replace(/^\S+\s/, ''), inSw = mkSw('', true);   // the same switch twice: once in the top row and once inside the box itself
  inSw.lab.querySelector('.sl').remove(); inSw.lab.title = 'Turn ' + nm + ' off'; inSw.i.setAttribute('aria-label', 'Turn ' + nm + ' off');
  const apply = v => { fx[k] = !!v; setSw(sw.i, fx[k]); setSw(inSw.i, fx[k]); pn.box.style.display = fx[k] ? '' : 'none'; try { GM_setValue('fx', JSON.stringify(fx)); } catch (e) {} fxTick(Date.now(), true); };
  setSw(sw.i, fx[k]); setSw(inSw.i, fx[k]); pn.box.style.display = fx[k] ? '' : 'none';
  sw.i.onchange = () => apply(sw.i.checked); inSw.i.onchange = () => apply(inSw.i.checked);
  pn.box.querySelector('.fxh').prepend(inSw.lab);
  fxRow.append(sw.lab);
});
const fxBox = h('div', 'fxbox', null, ...fxDefs.map(x => x[2].box));
// ---------- Kanban: the flip side of the Time until box ----------
const KCATS = [{ id: 'backlog', name: 'Backlog', color: '#8ea0d8' }, { id: 'progress', name: 'In progress', color: '#ffa51f' }, { id: 'proactive', name: 'Proactive', color: '#b07cff' }, { id: 'done', name: 'Done', color: '#34c98a' }];
const kcat = id => KCATS.find(c => c.id === id) || KCATS[0];
const kid = () => Math.random().toString(36).slice(2, 9);
const KTAGS = [["🏠 Home", ["🧹 Cleaning", "🧺 Laundry", "🍽️ Dishes", "🛏️ Bedroom", "🛁 Bathroom", "🍳 Kitchen", "🛋️ Living room", "🔧 Repairs", "🪴 Houseplants", "🗑️ Trash & recycling", "📦 Decluttering", "🛒 Groceries", "💡 Utilities", "🔑 Rent & mortgage", "🪟 Windows", "🧯 Safety checks"]], ["💪 Health & fitness", ["🏃 Running", "🏋️ Strength", "🧘 Yoga", "🚶 Walking", "🚴 Cycling", "🏊 Swimming", "🥗 Healthy eating", "💧 Hydration", "😴 Sleep", "💊 Medication", "🩺 Doctor", "🦷 Dentist", "👁️ Eye care", "🧠 Mental health", "🤸 Stretching", "⚖️ Weight goals"]], ["💼 Work", ["📧 Email", "📞 Calls", "📅 Meetings", "📝 Reports", "📊 Spreadsheets", "🧑‍💻 Coding", "🎯 Goals", "🚀 Projects", "🤝 Clients", "📈 Planning", "🗂️ Filing", "⏰ Deadlines", "🧾 Invoices", "🎤 Presentations", "🧑‍🏫 Training", "🔍 Research"]], ["🎓 School & learning", ["📚 Studying", "✏️ Homework", "📖 Reading", "🧪 Science", "🧮 Math", "🌍 Languages", "🎒 School", "🏫 Class", "📝 Exams", "🔬 Lab work", "🎓 Degree", "💭 Ideas", "🖊️ Essays", "🃏 Flashcards", "🎧 Lectures", "👩‍🏫 Tutoring"]], ["💰 Money", ["💵 Budget", "🏦 Banking", "💳 Credit cards", "🧾 Bills", "📉 Debt", "💹 Investing", "🐷 Savings", "🧮 Taxes", "🛡️ Insurance", "🛍️ Shopping", "🏷️ Sales & deals", "🪙 Side income", "🎁 Donations", "📒 Expenses"]], ["👨‍👩‍👧 Family", ["👶 Kids", "👴 Parents", "🍼 Baby", "🎂 Birthdays", "💞 Partner", "🏡 Family time", "📱 Check-ins", "🧸 Playdates", "🚌 School run", "🎁 Gifts", "👵 Grandparents", "🧑‍🍼 Childcare"]], ["👫 Friends & community", ["🍻 Hangouts", "☎️ Catch up", "💌 Thank-you notes", "🎉 Parties", "🤗 Support a friend", "🗓️ Plans", "🫶 Volunteering", "🗣️ Community", "🏘️ Neighbors", "🤝 Networking"]], ["🐾 Pets", ["🐕 Dog", "🐈 Cat", "🐠 Fish", "🦜 Birds", "🐇 Small pets", "🦴 Pet food", "🧼 Grooming", "💉 Vet", "🦮 Dog walks", "🐴 Horses", "🪣 Litter & cages"]], ["🍎 Food & cooking", ["🥘 Meal prep", "🍲 Cooking", "🥪 Lunch", "🥞 Breakfast", "🍝 Dinner", "🍰 Baking", "🥦 Produce", "🧊 Pantry", "📋 Meal plan", "☕ Coffee", "🍷 Dining out", "🥤 Smoothies", "🍱 Packed lunches"]], ["✈️ Travel", ["✈️ Flights", "🧳 Packing", "🏨 Hotels", "🗺️ Itinerary", "🚗 Road trip", "🛂 Passport & docs", "🏖️ Vacation", "🏕️ Camping", "🥾 Hiking", "📸 Trip photos", "🚆 Trains & buses", "🎟️ Tickets"]], ["🚗 Car & errands", ["🚗 Car care", "⛽ Gas", "🛞 Tires", "🚿 Car wash", "🛠️ Maintenance", "📮 Post office", "🏪 Errands", "🧾 Returns", "📦 Packages", "🏛️ Government & DMV", "✂️ Haircut", "👕 Dry cleaning", "🔋 Battery & charging"]], ["🎨 Hobbies & creative", ["🎨 Art", "✍️ Writing", "📷 Photography", "🎸 Music", "🎹 Practice", "🎮 Gaming", "🧶 Crafts", "🧩 Puzzles", "🎬 Movies", "📺 Shows", "🎲 Board games", "🪡 Sewing", "🏺 Collecting", "📓 Journaling", "🎙️ Podcasting", "🎭 Theater"]], ["🌱 Garden & outdoors", ["🌱 Gardening", "💦 Watering", "🌳 Yard work", "🍅 Vegetables", "🌷 Flowers", "🌿 Herbs", "🚜 Mowing", "🏞️ Outdoors", "🐝 Pollinators", "🍂 Leaves & cleanup"]], ["🧖 Self-care & mind", ["🛀 Self-care", "📵 Screen break", "🙏 Gratitude", "🧘‍♂️ Meditation", "💆 Relaxing", "🎧 Podcasts", "🌅 Morning routine", "🌙 Evening routine", "❤️ Kindness", "🪞 Reflection", "🌬️ Breathing", "☀️ Fresh air"]], ["💻 Tech & admin", ["💾 Backups", "🔐 Passwords", "📱 Phone", "💻 Computer", "🔄 Updates", "🖨️ Printing", "📶 Wi-Fi", "📂 Organizing files", "🗃️ Paperwork", "✉️ Mail", "📲 Apps", "🧑‍🔧 Tech support"]], ["🎉 Celebrations & seasons", ["🎄 Holidays", "🎃 Halloween", "🦃 Thanksgiving", "🎆 New Year", "💝 Valentine's", "🐣 Easter", "🇺🇸 Fourth of July", "🎓 Graduation", "💍 Wedding", "🎁 Gift ideas", "🎈 Party planning", "🌸 Spring cleaning", "🏖️ Summer plans", "🍁 Fall prep", "⛄ Winter prep"]], ["🙏 Faith & values", ["🛐 Prayer", "⛪ Worship", "📜 Scripture", "🤲 Giving", "🕯️ Quiet time", "🕊️ Peace"]], ["⚡ Productivity", ["🔁 Habits", "⭐ Priority", "🧭 Planning ahead", "🕐 Time blocks", "📌 Reminders", "🔥 Streaks", "✅ Quick wins", "🐸 Hard thing first", "🗓️ Weekly review", "🏁 Milestones", "🧠 Brain dump", "🔕 Focus time"]], ["🆘 Urgent & life admin", ["🚨 Urgent", "🩹 First aid", "⚖️ Legal", "🪪 ID & renewals", "🧰 Emergency kit", "🔔 Renewals", "📑 Contracts", "🏥 Appointments", "🧾 Records"]]];   // the tag bank: [group, [tags]], each tag is an emoji and a name (a card keeps up to 8)
const KD = /^\d{4}-\d{2}-\d{2}$/, KT = /^\d{2}:\d{2}$/, kok = (s, re) => typeof s === 'string' && re.test(s);
const kdayStr = ms => { const q = ymd.formatToParts(new Date(ms)), g = t => +q.find(x => x.type === t).value; return g('year') + '-' + p2(g('month')) + '-' + p2(g('day')); };
const kclean = c => ({ id: String(c.id), tu: !!c.tu, title: String(c.title || '').slice(0, 120), cat: KCATS.some(k => k.id === c.cat) ? c.cat : 'backlog', due: kok(c.due, KD) ? c.due : '', time: kok(c.time, KT) ? c.time : '', assigned: kok(c.assigned, KD) ? c.assigned : kdayStr(Date.now()),
  mode: ['date', 'interval', 'none'].includes(c.mode) ? c.mode : '', rep: !!c.rep, start: kok(c.start, KD) ? c.start : '', end: kok(c.end, KD) ? c.end : '', cycle: Math.max(1, Math.min(9999, +c.cycle || 1)), tags: (Array.isArray(c.tags) ? c.tags : []).filter(t => typeof t === 'string' && t.length <= 40).slice(0, 8),
  items: (Array.isArray(c.items) ? c.items : []).map(i => ({ id: String(i.id || kid()), text: String(i.text || '').slice(0, 200), time: kok(i.time, KT) ? i.time : '', done: !!i.done })) });
let kan = { cards: [], inc: false, rem: false, side: 'time' };
try { const v = JSON.parse(GM_getValue('kanban', 'null')); if (v && Array.isArray(v.cards)) kan = { cards: v.cards.filter(c => c && c.id).map(kclean), inc: !!v.inc, rem: !!v.rem, side: v.side === 'kanban' ? 'kanban' : 'time' }; } catch (e) {}
const saveKan = () => { try { GM_setValue('kanban', JSON.stringify(kan, (k, v) => (k[0] === '_' ? undefined : v))); } catch (e) {} };
// a date and a clock time in the chosen time zone, as a moment (cached on the card)
let kzf = null, kzt = '';
function zonedMs(ds, ts) {
  const [y, m, d] = ds.split('-').map(Number), [H, M] = ts.split(':').map(Number);
  if (kzt !== TZ || !kzf) { kzt = TZ; kzf = F({ year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' }); }
  const off = ms => { const p = kzf.formatToParts(new Date(ms)), g = t => +p.find(x => x.type === t).value; return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) - ms; };
  const guess = Date.UTC(y, m - 1, d, H, M); return guess - off(guess - off(guess));
}
// how a card is timed: a due date, an interval (from one date to the next), or none (a running timer counts up from when it was made). A Proactive card with no due date counts up by itself.
const kmode = c => c.mode || (c.due ? 'date' : c.cat === 'proactive' ? 'none' : 'date');
const kdd = c => { const m = kmode(c); return m === 'interval' ? c.end : m === 'date' ? c.due : ''; };   // the date it is due: the end of its interval, or its due date
const kdue = (c, n) => { const d = kdd(c); if (!d) { if (c.time && kmode(c) === 'date') { const now = n == null ? Date.now() : n, td = kdayStr(now); let ms = zonedMs(td, c.time); if (ms <= now) ms = zonedMs(kaddDays(td, 1), c.time); return ms; } return null; }   // a due time with no due date repeats every day: it counts down to the next time that clock time comes round
  const key = d + ' ' + (c.time || '23:59') + TZ; if (c._k !== key) { c._k = key; c._ms = zonedMs(d, c.time || '23:59'); } return c._ms; };
const kam = c => { const key = c.assigned + TZ; if (c._ak !== key) { c._ak = key; c._am = zonedMs(c.assigned, '00:00'); } return c._am; };   // when the card was made
const kst = c => { const key = c.start + TZ; if (c._sk !== key) { c._sk = key; c._sm = zonedMs(c.start, '00:00'); } return c._sm; };   // when its interval starts
const kdn = ds => { const [y, m, d] = ds.split('-').map(Number); return Date.UTC(y, m - 1, d, 12); };
const kaddDays = (ds, n) => { const t = new Date(kdn(ds) + n * 864e5); return t.getUTCFullYear() + '-' + p2(t.getUTCMonth() + 1) + '-' + p2(t.getUTCDate()); };
const kdiff = (a, b) => Math.round((kdn(b) - kdn(a)) / 864e5);
function kRoll(c, n) {   // a repeating interval that has run out starts over, the same length
  if (!c.rep || kmode(c) !== 'interval' || !c.start || !c.end || c.cat === 'done') return false;
  const len = Math.max(0, kdiff(c.start, c.end)); let moved = false, guard = 0;
  while (kdue(c) != null && kdue(c) <= n && guard++ < 500) { c.start = kaddDays(c.end, 1); c.end = kaddDays(c.start, len); c.cycle = (c.cycle || 1) + 1; moved = true; }
  return moved;
}
const kdate = ds => { const [y, m, d] = ds.split('-').map(Number); return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }).format(Date.UTC(y, m - 1, d, 12)); };
const MONTH_ICON = ['❄️', '💝', '🍀', '🌷', '🌸', '☀️', '🎆', '🌻', '🍎', '🎃', '🍂', '🎄'];   // one emoji per month, Jan to Dec, shown beside the Kanban title
const kmonthName = ds => { const [y, m] = ds.split('-').map(Number), cy = +kdayStr(Date.now()).slice(0, 4); return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long', ...(y !== cy ? { year: 'numeric' } : {}) }).format(Date.UTC(y, m - 1, 15)); };
const ktime = t => hl(+t.slice(0, 2), +t.slice(3));
const knext = (c, n) => { const td = kdayStr(n); let ms = zonedMs(td, c.time); if (ms <= n) ms = zonedMs(kaddDays(td, 1), c.time); return ms; };   // the next time this clock time comes round
const kdtText = c => {   // the small line under a card's title
  const m = kmode(c), rp = c.rep ? ' · 🔁 repeats' : '', at = c.time ? ktime(c.time) : 'end of day';
  if (m === 'interval') return (c.start && c.end ? kdate(c.start) + ' → ' + kdate(c.end) + ' · ' + at : 'Set the start and end dates') + (c.rep ? ' · 🔁 cycle ' + (c.cycle || 1) : '');
  if (m === 'none') return 'No due date · running since ' + kdate(c.assigned) + (c.time ? ' · due daily at ' + ktime(c.time) : '') + rp;
  return (c.due ? kdate(c.due) + ' · ' + at : c.time ? 'No due date · every day at ' + ktime(c.time) : 'No due date') + rp;
};
const kwarn = c => c.cat !== 'done' && c.assigned && c.assigned.slice(0, 7) < kdayStr(Date.now()).slice(0, 7);   // assigned in an earlier month than this one

// card and checklist times become extra slots in the Time until list (only while that option is on)
const kanSlots = new Map();
const kanSlot = (id, time, title, col) => { const v = +time.slice(0, 2) * 60 + +time.slice(3); let s = kanSlots.get(id); if (!s || s.v !== v) { s = { v, kan: true, el: false }; kanSlots.set(id, s); } s.title = title; s.col = col; return s; };
function kanDerived() {   // only the cards picked with the ⏱ button (or every card, if that switch is on)
  const out = [];
  kan.cards.forEach(c => {
    if (c.cat === 'done' || !(kan.inc || c.tu)) return;
    const col = kcat(c.cat).color;
    if (c.time) out.push(kanSlot(c.id, c.time, '🗂 ' + c.title + (kdd(c) ? ' · due ' + kdate(kdd(c)) : ''), col));
    c.items.forEach(it => { if (!it.done && it.time) out.push(kanSlot(c.id + ':' + it.id, it.time, '☑ ' + it.text + ' · ' + c.title, col)); });
  });
  return out;
}

// ---- the board
const kMonth = h('div', 'kmonth'), flipBtn = h('button', 'add sm2 flipb', '🗂 Flip over to the Kanban ⟲'), flipBack = h('button', 'add sm2 flipb', '⟲ Flip back to Time until');
const incSw = mkSw('Add every card to the Time until list (or pick single cards with their ⏱ button)', true); setSw(incSw.i, kan.inc);
incSw.i.onchange = () => { kan.inc = incSw.i.checked; incSw.i.setAttribute('aria-checked', String(kan.inc)); saveKan(); build(); };
function kTpl(catId) {   // the dashed template for a new card
  const t = h('input'); t.type = 'text'; t.maxLength = 120; t.placeholder = '+ New card…'; t.setAttribute('aria-label', 'New card text, ' + kcat(catId).name);
  const d = h('input'); d.type = 'date'; d.setAttribute('aria-label', 'Due date'); const tm = h('input'); tm.type = 'time'; tm.setAttribute('aria-label', 'Due time');
  const add = h('button', 'add sm2', 'Add card'), rp = catId === 'proactive' ? mkSw('🔁 Repeating card', true) : null;
  const go = () => { const title = t.value.trim(); if (!title) { t.focus(); return; } kan.cards.push({ id: kid(), title, cat: catId, due: d.value || '', time: tm.value || '', assigned: kdayStr(Date.now()), mode: '', rep: !!(rp && rp.i.checked), start: '', end: '', cycle: 1, tags: [], items: [] }); t.value = ''; d.value = ''; tm.value = ''; if (rp) setSw(rp.i, false); saveKan(); kanRender(); if (kan.inc) build(); };
  add.onclick = go; t.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  return h('div', 'ktpl', null, t, h('div', 'ktr', null, d, tm, add), ...(rp ? [h('div', 'ktr', null, rp.lab)] : []));
}
const kSecs = KCATS.map(cat => { const cnt = h('span', 'kcnt'), list = h('div', 'klist'), box = h('div', 'ksec', null, h('div', 'ksh', null, h('span', null, cat.name), cnt), list); box.style.setProperty('--kc', cat.color); box.setAttribute('role', 'group'); box.setAttribute('aria-label', cat.name); return { cat, cnt, list, box, tpl: kTpl(cat.id) }; });
let kanRefs = [], kanDay = '', kanLast = 0;
function kCard(c) {
  const box = h('div', 'kcard'); box.style.setProperty('--kc', kcat(c.cat).color); box.tabIndex = 0; box.setAttribute('role', 'button'); box.setAttribute('aria-label', 'Open card: ' + c.title);
  const dd = h('span', 'kd'), tmr = h('span', 'kcy'), ov = h('span', 'kov'), done = c.items.filter(i => i.done).length, pct = c.items.length ? Math.round(100 * done / c.items.length) : null;
  const dt = h('div', 'kdt', kdtText(c)), ipf = h('div', 'kfill'), ipt = h('span'), ipb = h('div', 'kprog', null, h('div', 'kbar', null, ipf), ipt); ipb.style.display = 'none';
  box.append(h('div', 'kt', c.title || 'Untitled'), h('div', 'kdue', null, dd, tmr, ov), dt, ipb);
  if (pct != null) { const f = h('div', 'kfill'); f.style.width = pct + '%'; box.append(h('div', 'kprog', null, h('div', 'kbar', null, f), h('span', null, pct + '% · ' + done + '/' + c.items.length))); }
  if (c.tags.length) box.append(h('div', 'ktagrow', null, ...c.tags.map(t => h('span', 'ktag', t))));
  if (kwarn(c)) box.append(h('div', null, null, c.rep ? h('span', 'kfriend', '💌 Friendly reminder: you made this card in ' + kmonthName(c.assigned) + ' (' + kdate(c.assigned) + ')') : h('span', 'kwarn', '⚠ Assigned in ' + kmonthName(c.assigned))));   // a repeating card gets a friendly note instead of the warning
  const tu = h('button', 'ktu', '⏱'); tu.type = 'button'; tu.classList.toggle('on', !!(c.tu || kan.inc));
  tu.title = kan.inc ? 'In the Time until list (every card is added)' : c.tu ? 'In the Time until list: tap to remove it' : 'Add this card to the Time until list' + (c.time ? '' : ' (give it a due time first)'); tu.setAttribute('aria-label', tu.title); tu.setAttribute('aria-pressed', String(!!(c.tu || kan.inc)));
  tu.onclick = e => { e.stopPropagation(); if (kan.inc) return; c.tu = !c.tu; saveKan(); kanRender(); build(); }; tu.addEventListener('keydown', e => e.stopPropagation()); box.append(tu);
  box.onclick = () => openKan(c.id); box.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openKan(c.id); } });
  kanRefs.push({ c, dd, tmr, ov, dt, ip: { box: ipb, f: ipf, t: ipt } }); return box;
}
function kanRender() {
  kanRefs = [];
  kSecs.forEach(s => { const cards = kan.cards.filter(c => c.cat === s.cat.id).sort((a, b) => (kdue(a) == null ? 9e15 : kdue(a)) - (kdue(b) == null ? 9e15 : kdue(b))); s.cnt.textContent = cards.length; s.list.replaceChildren(...cards.map(kCard), s.tpl); });
  kanTick(Date.now(), true);
}
function kanTick(n, force) {   // the days-left counters and their small 24-hour cycle timers
  if (!force && n - kanLast < 1000) return; kanLast = n;
  const dk = kdayStr(n);
  if (dk !== kanDay) { kanDay = dk; kMonth.textContent = MONTH_ICON[+dk.slice(5, 7) - 1] + ' ' + new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'long', year: 'numeric' }).format(new Date(n)); if (!force) { kanRender(); return; } }
  let rolled = false;
  kanRefs.forEach(({ c, dd, tmr, ov, dt, ip }) => {
    if (kRoll(c, n)) rolled = true;
    dt.textContent = kdtText(c); ip.box.style.display = 'none';
    const ms = kdue(c);
    if (c.cat === 'done') { dd.textContent = '✓ Done'; tmr.style.display = 'none'; ov.textContent = ''; return; }
    if (kmode(c) === 'none') {   // no due date: a running timer counts up from when the card was made
      const a0 = Math.max(0, n - kam(c)), s0 = Math.floor(a0 % 864e5 / 1000); dd.textContent = '';   // no day count for a card with no due date
      if (c.time) { tmr.style.display = 'none'; ov.textContent = 'Due in ' + fmt(Math.round((knext(c, n) - n) / 1000)); }   // a due time: the "due in" text replaces the timer
      else { tmr.style.display = ''; tmr.textContent = p2(Math.floor(s0 / 3600)) + ':' + p2(Math.floor(s0 % 3600 / 60)) + ':' + p2(s0 % 60); ov.textContent = 'running'; }
      ov.className = c.time ? 'kov kdi' : 'kov'; return;
    }
    if (ms == null) { dd.textContent = ''; tmr.style.display = 'none'; ov.textContent = ''; return; }
    const rem = ms - n, a = Math.abs(rem), days = Math.floor(a / 864e5), cyc = Math.floor(a % 864e5 / 1000);
    dd.textContent = (rem < 0 && days ? '−' : '') + days + (days === 1 ? ' day' : ' days'); tmr.style.display = '';
    tmr.textContent = p2(Math.floor(cyc / 3600)) + ':' + p2(Math.floor(cyc % 3600 / 60)) + ':' + p2(cyc % 60);
    ov.textContent = rem < 0 ? 'overdue' : kdd(c) === dk ? 'due today' : !kdd(c) ? 'daily' : ''; ov.className = 'kov' + (rem < 0 ? ' bad' : '');
    const st = kmode(c) === 'interval' && c.start ? kst(c) : null;
    if (st != null && ms > st) { const fr = Math.max(0, Math.min(1, (n - st) / (ms - st))); ip.box.style.display = ''; ip.f.style.width = (fr * 100) + '%'; ip.t.textContent = Math.round(fr * 100) + '% of this interval'; }
  });
  if (rolled) saveKan();
}

// ---- the animated pop-up with a card's details and checklist
let kmod = null;
function closeKan() { if (!kmod) return; const m = kmod; kmod = null; m.classList.remove('open'); setTimeout(() => m.remove(), 260); }
function openKan(id) {
  const c = kan.cards.find(x => x.id === id); if (!c) return;
  if (kmod) { kmod.remove(); kmod = null; }
  const m = h('div', 'kmod'), pan = h('div', 'kpan'); m.append(pan); kmod = m; m.tabIndex = -1; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', 'Card details');
  const col = () => pan.style.setProperty('--kc', kcat(c.cat).color); col();
  const sync = () => { saveKan(); kanRender(); build(); };
  const ti = h('input', 'kin kti'); ti.type = 'text'; ti.maxLength = 120; ti.value = c.title; ti.setAttribute('aria-label', 'Card text'); ti.onchange = () => { c.title = ti.value.trim() || 'Untitled'; ti.value = c.title; sync(); };
  const xb = h('button', 'kclose', '×'); xb.type = 'button'; xb.setAttribute('aria-label', 'Close'); xb.onclick = closeKan;
  const sel = h('select', 'kin'); KCATS.forEach(k => { const o = h('option', null, k.name); o.value = k.id; sel.append(o); }); sel.value = c.cat; sel.setAttribute('aria-label', 'Category');
  sel.onchange = () => { c.cat = sel.value; col(); sync(); renderList(); showMode(); };   // the thin borders follow the category right away
  const di = h('input', 'kin'); di.type = 'date'; di.value = c.due; di.onchange = () => { c.due = di.value; sync(); showMode(); };
  const tm = h('input', 'kin'); tm.type = 'time'; tm.value = c.time; tm.onchange = () => { c.time = tm.value; sync(); };
  const ai = h('input', 'kin'); ai.type = 'date'; ai.value = c.assigned; ai.onchange = () => { if (ai.value) { c.assigned = ai.value; sync(); } };
  const fld = (lab, el) => h('label', 'kfld', null, h('span', null, lab), el);
  // deadline type: a due date, an interval (from one date to the next), or none at all (a running timer counts up from when the card was made)
  const mSel = h('select', 'kin'); mSel.setAttribute('aria-label', 'Deadline type');
  [['date', 'Due date'], ['interval', 'Interval (one date to the next)'], ['none', 'No due date (running timer)']].forEach(([v, t]) => { const o = h('option', null, t); o.value = v; mSel.append(o); });
  mSel.value = kmode(c);
  const si = h('input', 'kin'); si.type = 'date'; si.value = c.start; si.setAttribute('aria-label', 'Interval starts'); si.onchange = () => { c.start = si.value; sync(); };
  const ei = h('input', 'kin'); ei.type = 'date'; ei.value = c.end; ei.setAttribute('aria-label', 'Interval ends'); ei.onchange = () => { c.end = ei.value; sync(); };
  const tnote = h('span', 'ksub', 'No due date: repeats every day'), tlab = h('span', null, 'Due time'), fDue = fld('Due date', di), fTime = h('label', 'kfld', null, tlab, tm, tnote), fStart = fld('Starts', si), fEnd = fld('Ends', ei);
  const qk = h('div', 'kq', null, h('span', 'ksub', 'Quick length:'), ...[['1 week', 7], ['2 weeks', 14], ['1 month', 30]].map(([l, dn]) => { const b = h('button', 'cf', l); b.type = 'button'; b.onclick = () => { if (!c.start) { c.start = kdayStr(Date.now()); si.value = c.start; } c.end = kaddDays(c.start, dn - 1); ei.value = c.end; sync(); }; return b; }));
  const repSw = mkSw('🔁 Repeating card', true); setSw(repSw.i, c.rep);
  const repNote = h('p', 'knote', 'A repeating card never shows the ⚠ warning. When it was made in an earlier month, you get a friendly reminder of when instead, and an interval starts over (the same length) each time it ends.');
  repSw.i.onchange = () => { c.rep = repSw.i.checked; repSw.i.setAttribute('aria-checked', String(c.rep)); sync(); };
  function showMode() { const m = kmode(c); tnote.style.display = (m === 'date' && !c.due) || m === 'none' ? '' : 'none'; tnote.textContent = m === 'none' ? 'Optional: due every day at this time, beside the running timer' : 'No due date: repeats every day'; fDue.style.display = m === 'date' ? '' : 'none'; fStart.style.display = fEnd.style.display = qk.style.display = m === 'interval' ? '' : 'none'; fTime.style.display = ''; tlab.textContent = m === 'interval' ? 'Ends at (time)' : 'Due time'; mSel.value = m; }
  mSel.onchange = () => { c.mode = mSel.value; if (c.mode === 'interval') { if (!c.start) c.start = kdayStr(Date.now()); if (!c.end) c.end = kaddDays(c.start, 6); si.value = c.start; ei.value = c.end; } showMode(); sync(); };
  // tags: a big bank grouped by area of life, with search; a card keeps up to 8
  const openG = new Set(), tagSel = h('div', 'ktags'), tagQ = h('input', 'kin'), tagList = h('div', 'ktaglist'), tagCnt = h('span', 'ksub');
  tagQ.type = 'search'; tagQ.placeholder = 'Search tags (e.g. dog, budget, garden)…'; tagQ.setAttribute('aria-label', 'Search tags');
  function renderTags() {
    const q = tagQ.value.trim().toLowerCase(), full = c.tags.length >= 8; tagCnt.textContent = c.tags.length + ' of 8';
    tagSel.replaceChildren(...(c.tags.length ? c.tags.map(t => { const b = h('button', 'ktag', t + ' '), x = h('b', null, '×'); b.type = 'button'; b.append(x); b.setAttribute('aria-label', 'Remove tag ' + t); b.onclick = () => { c.tags = c.tags.filter(z => z !== t); sync(); renderTags(); }; return b; }) : [h('span', 'ksub', 'No tags yet. Pick some below.')]));
    tagList.replaceChildren(...KTAGS.map(([g, arr]) => {
      const shown = q ? arr.filter(t => t.toLowerCase().includes(q) || g.toLowerCase().includes(q)) : arr;
      if (!shown.length) return null;
      const det = h('details', 'ktg', null, h('summary', null, g + ' · ' + shown.length), h('div', 'ktgb', null, ...shown.map(t => { const on = c.tags.includes(t), b = h('button', 'kpick' + (on ? ' on' : ''), t); b.type = 'button'; b.setAttribute('aria-pressed', String(on)); b.disabled = !on && full; b.onclick = () => { c.tags = on ? c.tags.filter(z => z !== t) : [...c.tags, t]; sync(); renderTags(); }; return b; })));
      det.open = !!q || openG.has(g); det.addEventListener('toggle', () => { if (tagQ.value.trim()) return; if (det.open) openG.add(g); else openG.delete(g); });
      return det;
    }).filter(Boolean));
  }
  tagQ.oninput = renderTags;
  const tagDD = h('details', 'ktdd', null, h('summary', null, '➕ Browse the tag bank'), tagQ, tagList);   // the whole bank sits in one dropdown, closed until you want it
  const pf = h('div', 'kfill'), pbar = h('div', 'kbar big', null, pf), ptxt = h('b', 'kpct'), psub = h('span', 'ksub'), list = h('div', 'kitems');
  const remSw = mkSw('Only show the items still to do', true); setSw(remSw.i, kan.rem);
  const tuSw = mkSw('Show this card in the Time until list', true); setSw(tuSw.i, !!(c.tu || kan.inc)); tuSw.i.disabled = kan.inc; tuSw.i.onchange = () => { c.tu = tuSw.i.checked; tuSw.i.setAttribute('aria-checked', String(c.tu)); sync(); };
  remSw.i.onchange = () => { kan.rem = remSw.i.checked; remSw.i.setAttribute('aria-checked', String(kan.rem)); saveKan(); renderList(); };
  const grow = ta => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
  // a deleted checklist item: a warning with a brief Undo (newest first; each Undo puts one back where it was)
  const undoItems = [], kundo = h('div', 'undo kundo'); kundo.setAttribute('role', 'status'); let kundoT = 0;
  function showKundo() {
    const last = undoItems[undoItems.length - 1];
    if (!last) { kundo.style.display = 'none'; return; }
    const b = h('button', null, 'Undo'); b.type = 'button'; b.setAttribute('aria-label', 'Undo: put back ' + last.it.text);
    b.onclick = () => {
      const r = undoItems.pop();
      if (r && !c.items.includes(r.it)) { c.items.splice(Math.min(r.i, c.items.length), 0, r.it); sync(); renderList(); }
      timeKundo(); showKundo();
    };
    const t = last.it.text.length > 40 ? last.it.text.slice(0, 40) + '…' : last.it.text;
    kundo.replaceChildren(h('span', null, '⚠ Item deleted: “' + t + '”' + (undoItems.length > 1 ? ' (+' + (undoItems.length - 1) + ' more)' : '')), b);
    kundo.style.display = 'flex';
  }
  function timeKundo() { clearTimeout(kundoT); if (undoItems.length) kundoT = setTimeout(() => { undoItems.length = 0; showKundo(); }, 8000); }   // brief: the warning fades after 8 seconds
  function itemRow(it) {
    const cb = h('input'); cb.type = 'checkbox'; cb.checked = it.done; cb.setAttribute('aria-label', 'Done: ' + it.text);
    const tx = h('textarea', 'kin kx'); tx.rows = 1; tx.maxLength = 200; tx.value = it.text; tx.setAttribute('aria-label', 'Item text');
    const rm = h('button', 'kdel', '×'); rm.type = 'button'; rm.setAttribute('aria-label', 'Remove item: ' + it.text);
    const due = h('button', 'kdueat' + (it.time ? '' : ' none'), it.time ? '⏰ due at ' + ktime(it.time) : '+ due time'); due.type = 'button';
    due.setAttribute('aria-label', it.time ? 'Change due time, currently ' + ktime(it.time) : 'Add a due time');
    const body = h('div', 'kbody', null, tx, due);
    cb.onchange = () => { it.done = cb.checked; sync(); renderList(); };
    tx.oninput = () => grow(tx);
    tx.onchange = () => { it.text = tx.value.trim() || 'Item'; tx.value = it.text; sync(); };
    tx.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); tx.blur(); } });
    due.onclick = () => {   // swap the pill for a time picker
      const ft = h('input', 'kin kitime'); ft.type = 'time'; ft.value = it.time; ft.setAttribute('aria-label', 'Item due time');
      ft.onchange = () => { it.time = ft.value; sync(); renderList(); };
      ft.onblur = () => renderList();
      ft.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); renderList(); } else if (e.key === 'Enter') ft.blur(); });
      body.replaceChild(ft, due); ft.focus();
    };
    const doRemove = () => { const i = c.items.indexOf(it); if (i < 0) return; undoItems.push({ it, i }); c.items = c.items.filter(z => z !== it); sync(); renderList(); showKundo(); timeKundo(); };
    rm.onclick = () => {   // first tap only asks; nothing is removed until "Remove" (then the warning with Undo appears)
      const yes = h('button', 'cf yes', 'Remove'), no = h('button', 'cf', 'Keep'); yes.type = no.type = 'button';
      const conf = h('div', 'conf kconf', null, h('span', null, 'Remove this item?'), yes, no), parts = [cb, body, rm]; let timer = 0;
      const back = () => { clearTimeout(timer); conf.remove(); parts.forEach(e => { e.style.display = ''; }); };
      yes.onclick = () => { clearTimeout(timer); doRemove(); };
      no.onclick = back;
      parts.forEach(e => { e.style.display = 'none'; }); row.append(conf); timer = setTimeout(back, 6000); no.focus();
    };
    const row = h('div', 'kit' + (it.done ? ' done' : ''), null, cb, body, rm);
    return row;
  }
  function renderList() {
    const total = c.items.length, done = c.items.filter(i => i.done).length, pct = total ? Math.round(100 * done / total) : 0, shown = kan.rem ? c.items.filter(i => !i.done) : c.items;
    pf.style.width = pct + '%'; ptxt.textContent = pct + '%'; psub.textContent = total ? done + ' of ' + total + ' done' : 'No items yet';
    list.replaceChildren(...(shown.length ? shown.map(itemRow) : [h('p', 'knote', total ? 'Everything is checked off 🎉' : 'Add the first item below.')]));
    requestAnimationFrame(() => list.querySelectorAll('.kx').forEach(grow));   // size every item to its full text
  }
  const addWrap = h('div', 'kaddwrap');
  function showAddBtn() { const b = h('button', 'kaddbtn', '+ Add an item'); b.type = 'button'; b.onclick = showForm; addWrap.replaceChildren(b); }
  function showForm() {   // the styled "new item" card with a due-at time
    const ni = h('textarea', 'kin kfx'); ni.rows = 2; ni.maxLength = 200; ni.placeholder = 'Add an item…'; ni.setAttribute('aria-label', 'New checklist item');
    const nt = h('input', 'kin kitime'); nt.type = 'time'; nt.setAttribute('aria-label', 'Due time for the new item');
    const add = h('button', 'kfadd', 'Add'), cancel = h('button', 'kfcancel', '×'); add.type = cancel.type = 'button'; cancel.setAttribute('aria-label', 'Cancel');
    const go = () => { const text = ni.value.trim(); if (!text) { ni.focus(); return; } c.items.push({ id: kid(), text, time: nt.value || '', done: false }); sync(); renderList(); showForm(); };   // the form reopens so you can add several in a row
    add.onclick = go; cancel.onclick = showAddBtn;
    ni.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } else if (e.key === 'Escape') { e.stopPropagation(); showAddBtn(); } });
    addWrap.replaceChildren(h('div', 'kform', null, ni, h('div', 'kfdue', null, h('span', null, '⏰ Due at'), nt), h('div', 'kfact', null, add, cancel)));
    ni.focus();
  }
  showAddBtn();
  const del = h('button', 'add sm2', 'Delete card'), yes = h('button', 'cf yes', 'Delete'), no = h('button', 'cf', 'Keep');
  const conf = h('div', 'conf', null, h('span', null, 'Delete this card and its checklist?'), yes, no); conf.style.display = 'none'; del.style.marginTop = '12px';
  del.onclick = () => { del.style.display = 'none'; conf.style.display = 'flex'; }; no.onclick = () => { conf.style.display = 'none'; del.style.display = ''; };
  yes.onclick = () => { kan.cards = kan.cards.filter(z => z !== c); closeKan(); sync(); };
  pan.append(h('div', 'kphd', null, ti, xb), h('div', 'kgrid', null, fld('Category', sel), fld('Deadline', mSel), fDue, fStart, fEnd, fTime, fld('Assigned', ai)), qk, repSw.lab, repNote,
    tuSw.lab, remSw.lab, h('div', 'kchead', null, h('span', null, '🏷 Tags'), tagCnt), tagSel, tagDD, h('div', 'kchead', null, h('span', null, '☑ Checklist'), psub), h('div', 'kpr', null, ptxt, pbar), list, kundo, addWrap, del, conf);
  renderList(); renderTags(); showMode();
  m.addEventListener('keydown', e => { if (e.key === 'Escape') closeKan(); });
  m.addEventListener('pointerdown', e => { if (e.target === m) closeKan(); });
  shell.append(m); m.focus(); requestAnimationFrame(() => requestAnimationFrame(() => m.classList.add('open')));
}

// ---- the two faces of the box
const timeSec = h('section', 'g', null, h('div', 'tuh', null, h('div', 'ttl', 'Time until'), planSw.lab), flipBtn, planBar, h('div', 'ctl', null, inp, addBtn), tIn, chipBox, undoBar, tl);
const kanSec = h('section', 'g kan', null, flipBack, kMonth, h('p', 'note', 'Tap a card to open its checklist.'), h('div', 'kopt', null, incSw.lab), ...kSecs.map(s => s.box)); kanSec.style.display = 'none';
const flipBox = h('div', 'flip', null, timeSec, kanSec);
function flipTo(side, instant) {   // the box turns over like a card
  kan.side = side; saveKan();
  const from = side === 'kanban' ? timeSec : kanSec, to = side === 'kanban' ? kanSec : timeSec;
  if (instant || matchMedia('(prefers-reduced-motion: reduce)').matches) { from.style.display = 'none'; to.style.display = ''; return; }
  from.classList.add('fout');
  setTimeout(() => { from.style.display = 'none'; from.classList.remove('fout'); to.style.display = ''; to.classList.add('fin'); setTimeout(() => to.classList.remove('fin'), 320); }, 220);
}
flipBtn.onclick = () => flipTo('kanban'); flipBack.onclick = () => flipTo('time');
function kanInit() { kanRender(); if (kan.side === 'kanban') flipTo('kanban', true); }
const wrap = h('div', 'wrap', null,
  h('section', 'g c', null, seg, cTime, cDate, cBadge),
  locCard,
  h('section', 'g', null, phTitle,
    h('div', 'phs', null, ...phEls.map(x => x.box)), editor, h('div', 'bar', null, fill), h('div', 'row', null, phName, phLeft), wakeNote, fxRow, fxBox),
  flipBox,
  alarmCard,
  pomoCard,
  zoneKey,
  zoneCard,
  h('section', 'g', null, h('div', 'ttl', 'Event countdowns'), evSeg, evBox),
  synCard,
  shortcutCard,
  h('p', 'credit', 'Some visual elements borrowed from Sky Clock'));
const sk = window.skyclock || null;   // bridge to the desktop shell (preload.js)
const pinBtn = h('button', null, '📌'), minBtn = h('button', null, '–'), xBtn = h('button', null, '✕');
pinBtn.title = 'Keep on top of other windows'; minBtn.title = 'Minimize'; xBtn.title = 'Close to the system tray (timers keep running)';
pinBtn.setAttribute('aria-label', 'Always on top'); minBtn.setAttribute('aria-label', 'Minimize'); xBtn.setAttribute('aria-label', 'Close to tray');
const hd = h('div', 'hd', null, h('span', null, '🕰️ Sky Clock'), pinBtn, minBtn, xBtn);
const refreshPin = () => { if (sk) sk.getPin().then(on => pinBtn.classList.toggle('on', !!on)); };
pinBtn.onclick = () => { if (sk) sk.togglePin().then(on => pinBtn.classList.toggle('on', !!on)); };
minBtn.onclick = () => { if (sk) sk.minimize(); };
xBtn.onclick = () => { if (sk) sk.hide(); };
refreshPin(); addEventListener('focus', refreshPin);
const grip = h('div', 'grip'); grip.title = 'Drag to resize';
const shell = h('div', 'shell', null, hd, wrap, grip);
const launch = h('button', 'launch', '🕰️');
launch.onclick = () => { if (moved) { moved = false; return; } if (isYT && ytSlot()) { ytDocked = true; keepYT(); place(); return; } setOpen(true, true); };
shell.append(tip); root.append(shell, launch);

// ---------- tracked times ----------
let rows = [];
// smooth pop-up with the full title
function showTip(el, text) {
  if (!text) return;
  tip.textContent = text; tip.style.maxWidth = '260px';
  const sr = shell.getBoundingClientRect(), r = el.getBoundingClientRect(), w = tip.offsetWidth || 0, hh = tip.offsetHeight || 0;
  const x = Math.max(8, Math.min(r.left - sr.left, sr.width - w - 8));
  let y = r.top - sr.top - hh - 6; if (y < 8) y = r.bottom - sr.top + 6;
  tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.classList.toggle('on', true);
}
function hideTip() { tip.classList.toggle('on', false); }
function build() {
  tracked.sort((a, b) => a.v - b.v); rows = []; trashRows = [];
  const list = [...tracked.map(t => ({ t })), ...kanDerived().map(t => ({ t })), ...(planning ? trash.map(t => ({ t, del: true })) : [])].sort((a, b) => a.t.v - b.t.v);
  if (!list.length) { tl.replaceChildren(h('p', 'note', 'Nothing tracked yet.')); return; }
  tl.replaceChildren(...list.map(({ t, del }) => {
    if (del) return trashRow(t);
    const l = hl(Math.floor(t.v / 60), t.v % 60), x = h('button', 'x', '×'), f = h('div', 'fill');
    const cdMain = h('span'), cdSup = h('sup'), cd = h('b', 'cd', null, cdMain, cdSup); cdSup.style.display = 'none';
    x.setAttribute('aria-label', 'Remove ' + (t.title || l));
    const ok = h('button', 'x ok', '✓'); ok.title = 'Got it: hides this check, elapsed time keeps counting'; ok.setAttribute('aria-label', 'Done with ' + l); ok.style.display = 'none';
    // the time with its title under it; long titles are shortened with an ellipsis and hovering shows them in full
    const tsp = planning && !t.kan ? mkTimeEdit(t) : h('span', null, l), tt = h('span', 'tt'), tr1 = h('div', 'trt', null, tsp, ...(planning && t.prev != null ? [h('span', 'tprev', 'was ' + hl(Math.floor(t.prev / 60), t.prev % 60))] : [])), lblBox = h('div', 'tlb', null, tr1, tt);
    const showTitle = () => { tt.textContent = t.title || 'add a title'; tt.className = 'tt' + (t.title ? '' : ' empty'); };
    showTitle();
    lblBox.addEventListener('mouseenter', () => { if (t.title) showTip(lblBox, t.title); });
    lblBox.addEventListener('mouseleave', hideTip);
    tt.onclick = () => {   // click the title to rename it
      hideTip();
      const ed = h('input', 'tin'); ed.type = 'text'; ed.maxLength = 60; ed.value = t.title || ''; ed.placeholder = 'Title (optional)'; ed.setAttribute('aria-label', 'Timer title');
      let closed = false;
      const done = keep => { if (closed) return; closed = true; if (keep) { t.title = ed.value.trim(); save(); } lblBox.replaceChildren(tr1, tt); showTitle(); };
      ed.addEventListener('keydown', e => { if (e.key === 'Enter') done(true); else if (e.key === 'Escape') done(false); });
      ed.addEventListener('blur', () => done(true));
      lblBox.replaceChildren(tr1, ed); ed.focus(); ed.select();
    };
    // per-timer switch: count up after it goes off (also for a time that already went off before you switched it on)
    const sw = mkSw('Elapsed', true); setSw(sw.i, !!t.el); sw.lab.title = 'Show how long ago it went off';
    sw.i.onchange = () => { t.el = sw.i.checked; sw.i.setAttribute('aria-checked', String(t.el)); if (t.el) delete t.ack; save(); };
    const mkChip = (cls, label, tip) => { const live = h('span', 'trl', '● LIVE'); live.style.display = 'none'; const box = h('span', 'trk dot ' + cls, null, h('span', 'trn', label), live); box.setAttribute('aria-label', label); box.style.display = 'none'; tipOn(box, () => tip + ' ● LIVE means that window is happening right now.' + (box.classList.contains('past') ? '\n\nDashed ring: this time already passed today, so this shows tomorrow’s window.' : '')); return { box, live }; };
    const chips = [mkChip('sun', '☀️ Daylight', 'Your chosen time falls between sunrise and sunset, so there is still daylight then.'), mkChip('gold', '🌇 Golden hour', 'Your chosen time falls inside a golden-hour window: low sun and soft, warm light.'), mkChip('blue', '🔵 Blue hour', 'Your chosen time falls inside a blue-hour window: deep twilight just before sunrise or after sunset.')];
    const chipRow = h('div', 'trkr', null, ...chips.map(c => c.box)); chipRow.style.display = 'none'; tr1.append(chipRow);
    const head = h('div', 'trh', null, lblBox, cd, ok, x), row = h('div', 'tr', null, head, h('div', 'bar sm', null, f), h('div', 'trf', null, sw.lab));
    x.onclick = () => {   // first tap only asks; nothing is removed until "Remove"
      const yes = h('button', 'cf yes', 'Remove'), no = h('button', 'cf', 'Keep');
      const conf = h('div', 'conf', null, h('span', null, 'Remove ' + (t.title || l) + '?'), yes, no);
      let timer = 0;
      const cancel = () => { clearTimeout(timer); conf.remove(); head.style.display = ''; };
      yes.onclick = () => { clearTimeout(timer); removeT(t); };
      no.onclick = cancel;
      head.style.display = 'none'; row.insertBefore(conf, head); timer = setTimeout(cancel, 5000);
    };
    if (t.kan) { x.textContent = '🗂'; x.title = 'From your Kanban board: tap to open it'; x.setAttribute('aria-label', 'Open the Kanban board'); x.onclick = () => flipTo('kanban'); tt.onclick = null; tt.classList.add('nokan'); row.classList.add('tkan'); row.style.setProperty('--kc', t.col || '#8ea0d8'); }   // a slot that comes from the Kanban
    ok.onclick = () => { const e = rows.find(z => z.t === t); if (e && e.os) { t.ack = e.os; save(); } };   // acknowledge: back to the normal countdown
    rows.push({ t, cd, cdMain, cdSup, f, row, ok, chips, chipRow, tr1, chipT: 0, os: 0, last: NaN, p: 0, first: true });
    return row;
  }));
}
// Remove keeps the whole timer object (including its original length), so Undo puts the progress bar back where it belongs.
let undoList = [], undoTimer = 0;
function mkTimeEdit(t) {   // planning mode: pick a new time, then press the check mark beside it to apply it
  const i = h('input', 'ptime'); i.type = 'time'; const cur = p2(Math.floor(t.v / 60)) + ':' + p2(t.v % 60); i.value = cur; i.setAttribute('aria-label', 'New time for this countdown');
  const ok = h('button', 'pok', '✓'); ok.type = 'button'; ok.disabled = true; ok.title = 'Apply the new time'; ok.setAttribute('aria-label', 'Apply the new time');
  const sync = () => { ok.disabled = !i.value || i.value === cur; };
  const apply = () => {
    if (ok.disabled) return;
    const q = i.value.split(':').map(Number);
    if (q.length < 2 || !isFinite(q[0]) || !isFinite(q[1])) { build(); return; }
    const v = q[0] * 60 + q[1];
    t.prev = t.v; t.v = v; delete t.span; delete t.dur0; delete t.ack; t.armed = Date.now();   // a fresh countdown to the new time
    save(); build();
  };
  i.addEventListener('input', sync); i.addEventListener('change', sync);
  i.addEventListener('keydown', e => { if (e.key === 'Enter') { sync(); apply(); } else if (e.key === 'Escape') { i.value = cur; sync(); } });
  ok.onclick = apply;
  return h('span', 'pedit', null, i, ok);
}
function trashRow(t) {   // the dashed box that stands where a deleted countdown was
  const l = hl(Math.floor(t.v / 60), t.v % 60), live = h('b'), undo = h('button', null, 'Undo');
  undo.setAttribute('aria-label', 'Undo deleting ' + (t.title || l));
  undo.onclick = () => { trash = trash.filter(z => z !== t); saveTrash(); if (!tracked.includes(t)) { tracked.push(t); save(); } build(); };
  trashRows.push({ t, live });
  return h('div', 'tx', null, h('div', null, null, h('span', null, 'Deleted · ' + (t.title ? t.title + ' · ' : '') + l), live), undo);
}
function trashTick(n, sod) {   // keeps each dashed box's countdown or elapsed time running
  const nowS = Math.floor(n / 1000);
  trashRows.forEach(r => {
    const t = r.t; let d = t.v * 60 - sod; if (d < 0) d += 86400;
    const since = (86400 - d) % 86400, os = nowS - since, fin = !!t.el && (os * 1000 >= t.armed - 1000 || since <= sod);
    r.live.textContent = fin ? '-' + (since < 60 ? since + 's' : fmt(since)) + ' elapsed' : fmt(d) + ' left';
  });
}
function removeT(t) {
  const i = tracked.indexOf(t); if (i < 0) return;
  tracked.splice(i, 1); save();
  if (planning) { trash.push(t); saveTrash(); build(); return; }   // planning mode: a dashed Undo box stays in its place
  build();
  undoList.push(t); showUndo();
  clearTimeout(undoTimer); undoTimer = setTimeout(() => { undoList = []; showUndo(); }, 8000);
}
function showUndo() {
  const t = undoList[undoList.length - 1];
  if (!t) { undoBar.style.display = 'none'; return; }
  const b = h('button', null, 'Undo');
  b.onclick = () => {
    const r = undoList.pop();
    if (r && !tracked.includes(r)) { tracked.push(r); save(); build(); }
    showUndo();
  };
  undoBar.replaceChildren(h('span', null, 'Removed ' + (t.title ? t.title + ' · ' : '') + hl(Math.floor(t.v / 60), t.v % 60)), b);
  undoBar.style.display = 'flex';
}
// ---------- alarm timer: pick a length, see the clock time it will end ----------
let alarm = null;   // { end: ms, dur: ms, done: bool }
const loadAlarm = () => { try { const a = JSON.parse(GM_getValue('alarm', 'null')); return a && a.end > 0 && a.dur > 0 ? a : null; } catch (e) { return null; } };
alarm = loadAlarm();
const saveAlarm = () => { try { GM_setValue('alarm', JSON.stringify(alarm)); } catch (e) {} };
function startAlarm(ms, cap) {
  if (!(ms >= 1000)) return;
  ringOff();
  unlockAudio(true);
  ms = Math.min(ms, 48 * 36e5); alarm = { end: Date.now() + ms, dur: ms, done: false, cap: cap || '' }; saveAlarm(); alarmTick(Date.now());
}
function endAlarm() { ringOff(); alarm = null; saveAlarm(); alarmTick(Date.now()); }
const lenWords = ms => {   // 25 minutes, 1 hour 30 minutes, 45 seconds
  const t = Math.round(ms / 1000), H = Math.floor(t / 3600), M = Math.floor(t % 3600 / 60), S = t % 60, p = [];
  if (H) p.push(H + (H === 1 ? ' hour' : ' hours')); if (M) p.push(M + (M === 1 ? ' minute' : ' minutes')); if (S && !H) p.push(S + (S === 1 ? ' second' : ' seconds'));
  return p.join(' ') || '0 seconds';
};
function alarmTick(n) {
  if (!alarm) { alBox.style.display = 'none'; return; }
  alBox.style.display = 'block';
  const left = alarm.end - n;
  if (!alarm.done && left <= 0) { alarm.done = true; saveAlarm(); if (-left < 72e5) { ringOn(); notify('Alarm finished', 'Ended at ' + clk.format(alarm.end)); } }   // it rings even if the computer slept through the end (up to 2 hours late); older than that stays silent
  const fin = alarm.done, when = ymd.format(alarm.end) === ymd.format(n) ? clk.format(alarm.end) : wkf.format(alarm.end);
  alTime.textContent = fin ? "Time's up" : clockFmt(Math.ceil(left / 1000));
  alEnd.textContent = (fin ? 'Ended at ' : 'Ends at ') + when;
  alFill.style.width = (fin ? 100 : Math.max(0, Math.min(100, (1 - left / alarm.dur) * 100))) + '%';
  alCancel.style.display = fin ? 'none' : ''; alAgain.style.display = fin ? '' : 'none'; alDone.style.display = fin ? '' : 'none';
  alTime.classList.toggle('ring', fin);
  const lapShow = fin && alEl, lapN = lapShow ? Math.max(0, Math.floor((n - alarm.end) / 1000)) : 0, lapOver = lapN > Math.round(alarm.dur / 1000);
  alLap.style.display = lapShow ? 'block' : 'none';
  if (lapShow) { alLapMain.textContent = '-' + clockFmt(lapN); alLapSup.textContent = 'lapsed + ' + clockFmt(Math.round(alarm.dur / 1000)); alLapSup.style.display = lapOver ? '' : 'none'; alLap.className = 'alp' + (lapOver ? ' over' : ''); }
  alSilence.style.display = fin && ringTimer ? '' : 'none';
  alCap.textContent = 'Lasts ' + lenWords(alarm.dur); alCap.style.display = 'block';   // always shows how long this alarm timer is
}
alGo.onclick = () => startAlarm((Math.max(0, +alH.value || 0) * 60 + Math.max(0, +alM.value || 0)) * 6e4);
[alH, alM].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') alGo.click(); }));
[[5, '5 min', '5 minutes'], [10, '10 min', '10 minutes'], [15, '15 min', '15 minutes'], [25, '25 min', '25 minutes'], [45, '45 min', '45 minutes'], [60, '1 hr', '1 hour']].forEach(([m, l, long]) => { const b = h('button', 'chip', l); b.onclick = () => startAlarm(m * 6e4, 'Lasts ' + long); alChips.append(b); });
alSilence.onclick = () => { ringOff(); alarmTick(Date.now()); }; alTest.onclick = () => { unlockAudio(true); ringCycle(); };
alCancel.onclick = endAlarm; alDone.onclick = endAlarm; alAgain.onclick = () => { if (alarm) startAlarm(alarm.dur, alarm.cap); };

function addT(v) {
  const title = tIn.value.trim();
  if (!planning && tracked.some(t => t.v === v && (t.title || '') === title)) return;   // duplicates are allowed while re-planning
  tracked.push({ v, title, el: false }); tIn.value = ''; save(); build();
}
addBtn.onclick = () => { if (!inp.value) return; const q = inp.value.split(':').map(Number); addT(q[0] * 60 + q[1]); };
let chipKey = -1;
function chips(H) {
  if (chipKey === H) return; chipKey = H;
  chipBox.replaceChildren(...[1, 2, 3, 4].map(i => { const b = h('button', 'chip', hl((H + i) % 24, 0)); b.onclick = () => addT(((H + i) % 24) * 60); return b; }));
}
const notify = (t, b) => { try { if (window.skyclock) window.skyclock.notify(t, b); } catch (e) {} };   // Windows notification, works even when the window is hidden
let AC = null;   // one shared audio context, unlocked by a tap/click (phones and browsers block sound until then)
let pendingSounds = [];   // sounds that came due while audio was blocked (screen off, locked, just woke up): played the moment audio works again
function flushPending() { const p = pendingSounds; pendingSounds = []; p.forEach(f => { if (!f()) pendingSounds.push(f); }); }
function unlockAudio(force) {
  try {
    if (!AC && !force && !tracked.length && !alarm) return;
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
  } catch (e) {}
}
addEventListener('pointerdown', () => unlockAudio(false), true);
addEventListener('keydown', () => unlockAudio(false), true);
addEventListener('touchend', () => unlockAudio(false), true);
['pointerdown', 'keydown', 'touchend'].forEach(ev => panel.addEventListener(ev, () => unlockAudio(true), true));
const wakeUp = () => { try { if (AC && AC.state !== 'running') { const r = AC.resume(); if (r && r.catch) r.catch(() => {}); } } catch (e) {} tick(); };   // back from sleep / lock screen: catch up now instead of waiting for the next timer beat
document.addEventListener('visibilitychange', () => { if (!document.hidden) wakeUp(); });
addEventListener('focus', wakeUp); addEventListener('pageshow', wakeUp);
try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}   // desktop app: Electron lets sound start without a click, so beeps work even if you never touched the window since Windows started it
function beep(n = 1) {                                 // the Time until beep: loud (about double the alarm ring), n rounds of four pulses
  try {
    if (Date.now() - (+GM_getValue('lock', 0)) < 5000) return;
    const list = []; for (let k = 0; k < n; k++) RING.forEach(([st, d, f]) => list.push([st + k * 1.4, d, f]));
    if (tones(list, .65)) GM_setValue('lock', Date.now());
    else { const born = Date.now(); pendingSounds.push(() => Date.now() - born > 6e5 || tones(list, .65)); }   // audio blocked: play it as soon as it is back (gives up after 10 minutes)
  } catch (e) {}
}

// ---------- alarm sound: rings again and again until you silence it (or 60 seconds pass) ----------
const RING = [0, 1, 2, 3].map(i => [i * .28, .16, i % 2 ? 1320 : 880]);   // beep-beep-beep-beep, two alternating pitches
function tones(list, vol) {
  const c = AC; if (!c) return false;
  try {
    if (c.state === 'suspended') c.resume();
    if (c.state !== 'running') return false;
    list.forEach(([s, d, f]) => {
      const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + s;
      o.type = 'square'; o.frequency.value = f; o.connect(g); g.connect(c.destination);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01);
      g.gain.setValueAtTime(vol, t + d - .03); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.start(t); o.stop(t + d + .02);
    });
    return true;
  } catch (e) { return false; }
}
const ringCycle = () => tones(RING, .3);
let ringTimer = 0, ringUntil = 0;
function ringOff() { clearInterval(ringTimer); ringTimer = 0; }
function ringOn() {
  ringOff();
  try { if (+GM_getValue('ringFor', 0) === alarm.end) return; GM_setValue('ringFor', alarm.end); } catch (e) {}   // one ring per alarm
  ringUntil = Date.now() + 60000;
  const once = () => { if (!alarm || !alarm.done || Date.now() > ringUntil) { ringOff(); return; } if (!ringCycle()) ringUntil = Date.now() + 60000; };   // while audio is still blocked the 60 seconds do not start counting down
  once(); ringTimer = setInterval(once, 2400);
}

// ---------- pomodoro: a session is up to 7 pomodoros; averages are kept per day ----------
// Storage idea: for every day (Eastern date) keep only running sums, never a list of sessions:
//   fc / fs  = how many pomodoros were completed (ran out, or you marked them done early) and their total seconds
//   pc / ps  = how many were quit early and their total seconds
//   pn / pp / pf = for quit pomodoros: how many have a known plan, their planned seconds, and the sum of (time done / time planned)
// An average is sum / count, always exact, and a new day simply starts a new empty entry (the daily "reset") while every
// earlier day stays remembered. Longer-range numbers add the sums first and divide once, so a day with 6 pomodoros counts more than a day with 1.
// Lengths differ between pomodoros, so "how far you get" is measured as a fraction of the planned time (pf / pn), never as raw seconds.
const PM_SLIP = 15;                                    // seconds: stopping sooner than this is a slip and is never recorded
const pmDay = ms => { const q = ymd.formatToParts(new Date(ms)), g = t => +q.find(x => x.type === t).value; return g('year') + '-' + p2(g('month')) + '-' + p2(g('day')); };
const pmEmpty = () => ({ fc: 0, fs: 0, pc: 0, ps: 0, pn: 0, pp: 0, pf: 0, ss: 0 });
let pm = { days: {}, session: null, last: null, log: [] };
try { const v = JSON.parse(GM_getValue('pomo', 'null')); if (v && v.days) pm = { days: v.days, session: v.session || null, last: v.last || null, log: Array.isArray(v.log) ? v.log : [] }; } catch (e) {}
function savePm() {
  const ks = Object.keys(pm.days).sort(); while (ks.length > 120) delete pm.days[ks.shift()];   // about four months of days
  if (ks.length) { const oldest = ks[0]; pm.log = (pm.log || []).filter(e => e.day >= oldest).slice(-400); }   // the session log follows the same four months
  try { GM_setValue('pomo', JSON.stringify(pm)); } catch (e) {}
}
const pmLen = ms => { const m = Math.round(ms / 6e4), H = Math.floor(m / 60), M = m % 60; return H ? H + 'h' + (M ? ' ' + M + 'm' : '') : M + ' min'; };   // planned length of the running pomodoro, e.g. 25 min or 1h 30m (display only, never stored)
const avgOf = (sum, cnt) => (cnt ? Math.round(sum / cnt) : null);
const fmtOr = s => (s == null ? '—' : fmt(s));
const dayOf = k => { const d = pm.days[k] || {}; return Object.assign(pmEmpty(), d); };   // days saved by older versions lack the newer fields
const timePct = d => (d.fs + d.ps > 0 && d.pn === d.pc ? Math.round(100 * (d.fs + d.ps) / (d.fs + d.pp)) : null);   // partial credit: time done / time planned
const eodOf = ms => ms + (86400 - sodOf(ms)) * 1000;                       // the next midnight (Eastern)
const pmEff = (s, n) => s.pauseAt || n;                                    // while paused, time stands still
const pmElapsed = (s, n) => Math.max(0, Math.min(s.cur.dur, pmEff(s, n) - s.cur.start - (s.cur.shift || 0)));   // ms of the running pomodoro, paused time left out
const pmGap = (s, n) => (s.extra || 0) + (s.mark ? Math.max(0, pmEff(s, n) - s.mark) / 1000 : 0);              // seconds counted since the last pomodoro ended
// kind: 'full' (ran out) | 'early' (you marked it done early: counts as completed) | 'quit' (stopped early) | 'discard' (never mind: not recorded)
function pmEndCur(kind, endMs) {
  const s = pm.session, c = s && s.cur; if (!c) return;
  const done = Math.max(0, Math.round(Math.min(pmEff(s, endMs) - c.start - (c.shift || 0), c.dur) / 1000)), plan = Math.round(c.dur / 1000);
  const secs = kind === 'full' ? plan : done;
  s.cur = null; s.lastKind = kind; s.endedAt = endMs; s.lastDur = c.dur; s.extra = 0; s.mark = pmKeep && !s.pauseAt ? endMs : null;
  if (kind === 'discard' || (kind !== 'full' && secs < PM_SLIP)) {                 // a slip or a discard: not recorded and it does not use up one of the 7
    s.lastKind = 'discard'; s.n = Math.max(0, s.n - 1);
    if (s.n === 0) pm.session = null;                                              // nothing left of the session
    return;
  }
  const d = pm.days[c.day] = Object.assign(pmEmpty(), pm.days[c.day]);
  if (kind === 'quit') { d.pc++; d.ps += secs; d.pn++; d.pp += plan; d.pf += secs / plan; s.part++; }
  else { d.fc++; d.fs += secs; s.full++; }
  s.worked += secs;
  s.t = s.t || {}; const t = s.t[c.day] = s.t[c.day] || { fc: 0, fs: 0, pc: 0, ps: 0, pn: 0, pp: 0, pf: 0 };   // this session's own share of the day's sums, so it can be taken out again later
  if (kind === 'quit') { t.pc++; t.ps += secs; t.pn++; t.pp += plan; t.pf += secs / plan; } else { t.fc++; t.fs += secs; }
}
function pmEndSession(endMs) {
  const s = pm.session; if (!s) return;
  if (s.cur) pmEndCur('quit', endMs); else s.worked += pmGap(s, endMs);   // time still being counted lands in the total
  const recorded = s.full + s.part > 0;                // a session in which nothing was recorded is not counted (no "ghost sessions")
  if (recorded) { const d = pm.days[s.day] = Object.assign(pmEmpty(), pm.days[s.day]); d.ss++; }
  const span = Math.max(0, Math.round((pmEff(s, endMs) - s.startAt - (s.pausedTotal || 0)) / 1000));
  pm.last = { day: s.day, startAt: s.startAt, endAt: endMs, span, n: s.n, full: s.full, part: s.part, worked: s.worked, empty: !recorded };
  if (recorded) { pm.log = pm.log || []; const sumF = f => Object.values(s.t || {}).reduce((a, x) => a + x[f], 0), whole = sumF('fc') === s.full && sumF('pc') === s.part; pm.log.push({ day: s.day, startAt: s.startAt, endAt: endMs, span, worked: Math.round(s.worked), n: s.n, full: s.full, part: s.part, sums: whole ? s.t : undefined }); }   // one entry per finished session: when it started and how long it lasted
  pm.session = null;
}
function pmDeleteSession(e) {                         // take one session out of the log and out of the daily totals
  const i = (pm.log || []).indexOf(e); if (i < 0) return;
  pm.log.splice(i, 1);
  if (e.sums) {                                         // saved with its own totals: undo exactly what it added
    for (const day in e.sums) { const d = pm.days[day]; if (!d) continue; for (const f in e.sums[day]) { d[f] = Math.max(0, (d[f] || 0) - e.sums[day][f]); if (d[f] < 1e-9) d[f] = 0; } }
    const d0 = pm.days[e.day]; if (d0) d0.ss = Math.max(0, (d0.ss || 0) - 1);
    [e.day, ...Object.keys(e.sums)].forEach(day => { const d = pm.days[day]; if (d && !Object.values(d).some(v => v > 0)) delete pm.days[day]; });
  }
  savePm(); pmRender();
}
function pmFinishCur(kind) {                           // end only the running pomodoro; the session carries on (it ends by itself after the 7th)
  const now = Date.now(); pmEndCur(kind, now);
  if (pm.session && pm.session.n >= PM_MAX) pmEndSession(now);
  savePm(); pmRender();
}
function pmStart(minutes) {
  const ms = Math.round(+minutes * 6e4); if (!(ms >= 6e4) || ms > 720 * 6e4) return;
  let s = pm.session; if (s && s.cur) return;          // one pomodoro at a time
  const now = Date.now(); unlockAudio(true);
  if (!s) s = pm.session = { day: pmDay(now), startAt: now, n: 0, worked: 0, full: 0, part: 0, cur: null, extra: 0, mark: null, pauseAt: null, pausedTotal: 0 };
  if (s.n >= PM_MAX) return;
  if (s.pauseAt) { s.pausedTotal = (s.pausedTotal || 0) + (now - s.pauseAt); s.pauseAt = null; }   // starting the next one ends a pause
  s.worked += pmGap(s, now); s.extra = 0; s.mark = null; s.endedAt = null;
  pm.last = null; s.n++; s.cur = { start: now, dur: ms, day: pmDay(now), shift: 0 };
  try { GM_setValue('pmLen', Math.round(ms / 6e4)); } catch (e) {}
  savePm(); pmRender(); pmTick(now);
}
function pmPauseNow() {                                // freeze the countdown and the time tracking
  const s = pm.session; if (!s || s.pauseAt) return;
  const now = Date.now(); s.pauseAt = now;
  if (!s.cur && s.mark) { s.extra = (s.extra || 0) + (now - s.mark) / 1000; s.mark = null; }
  savePm(); pmRender(); pmTick(now);
}
function pmResume() {                                  // the end time moves later by exactly the time you were paused
  const s = pm.session; if (!s || !s.pauseAt) return;
  const now = Date.now(), dt = now - s.pauseAt;
  s.pausedTotal = (s.pausedTotal || 0) + dt;
  if (s.cur) s.cur.shift = (s.cur.shift || 0) + dt; else if (pmKeep) s.mark = now;
  s.pauseAt = null; savePm(); pmRender(); pmTick(now);
}
function pmChime() {
  const born = Date.now(), go = () => { if (Date.now() - born > 6e5) return true; if (!ringCycle()) return false; setTimeout(ringCycle, 2400); setTimeout(ringCycle, 4800); return true; };
  if (!go()) pendingSounds.push(go);   // audio blocked (screen was off): chime as soon as it is back
}
let pmConfT = 0, pmClearT = 0, pmHistOpen = false, pmDayKey = '';
const pmCancelConf = () => { clearTimeout(pmConfT); pmConf.style.display = 'none'; pmBtns.style.display = ''; };
function pmAsk(msg, a, b) {                            // one confirm row for every risky button: a (and optionally b) do something, "Keep going" cancels
  pmCMsg.textContent = msg;
  pmC1.textContent = a[0]; pmC1.onclick = () => { pmCancelConf(); a[1](); };
  pmC2.style.display = b ? '' : 'none';
  if (b) { pmC2.textContent = b[0]; pmC2.onclick = () => { pmCancelConf(); b[1](); }; }
  pmBtns.style.display = 'none'; pmConf.style.display = 'flex'; clearTimeout(pmConfT); pmConfT = setTimeout(pmCancelConf, 6000);
}
const pmGoNow = () => pmStart((+pmH.value || 0) * 60 + (+pmMin.value || 0));
pmGo.onclick = pmGoNow;
[pmH, pmMin].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') pmGoNow(); }));
PM_PRESETS.forEach(([m, l]) => { const b = h('button', 'chip', l); b.onclick = () => pmStart(m); pmChips.append(b); });
pmC3.onclick = pmCancelConf;
pmPause.onclick = () => { if (pm.session && pm.session.pauseAt) pmResume(); else pmPauseNow(); };
pmDone.onclick = () => pmAsk('Finished early? It counts as a completed pomodoro with the time you actually worked.', ['Yes, I finished', () => pmFinishCur('early')]);
pmQuit.onclick = () => pmAsk('Stop this pomodoro? The session carries on.', ['Count as quit early', () => pmFinishCur('quit')], ['Discard it', () => pmFinishCur('discard')]);
pmExit.onclick = () => pmAsk('Exit now? This pomodoro counts as quit early and the session ends.', ['Exit', () => { pmEndSession(Date.now()); savePm(); pmRender(); }]);
pmStop.onclick = () => { pmEndSession(Date.now()); savePm(); pmRender(); };
pmSumOk.onclick = () => { pm.last = null; savePm(); pmRender(); };
pmHistBtn.onclick = () => { pmHistOpen = !pmHistOpen; pmRender(); };
pmClear.onclick = () => {
  if (pmClear.textContent === 'Clear history') { pmClear.textContent = 'Tap again to erase'; clearTimeout(pmClearT); pmClearT = setTimeout(() => { pmClear.textContent = 'Clear history'; }, 4000); return; }
  clearTimeout(pmClearT); pmClear.textContent = 'Clear history'; pm.days = {}; pm.last = null; pm.log = []; savePm(); pmRender();
};
pmShowSw.i.onchange = () => { pmShow = pmShowSw.i.checked; pmShowSw.i.setAttribute('aria-checked', String(pmShow)); try { GM_setValue('pmShow', pmShow); } catch (e) {} pmRender(); pmTick(Date.now()); };
pmKeepSw.i.onchange = () => {                          // keep counting after a pomodoro ends: on / off
  pmKeep = pmKeepSw.i.checked; pmKeepSw.i.setAttribute('aria-checked', String(pmKeep)); try { GM_setValue('pmKeep', pmKeep); } catch (e) {}
  const s = pm.session, now = Date.now();
  if (s && !s.cur) {
    if (pmKeep && !s.pauseAt) s.mark = now;                                                       // counts from now on
    else if (!pmKeep && s.mark) { s.extra = (s.extra || 0) + (now - s.mark) / 1000; s.mark = null; }   // stops; what was counted stays
    savePm();
  }
  pmRender(); pmTick(now);
};
function pmLastDays(n, now) {                          // date keys for today and the n-1 days before it
  const q = ymd.formatToParts(new Date(now)), g = t => +q.find(x => x.type === t).value, base = Date.UTC(g('year'), g('month') - 1, g('day'), 12);
  return Array.from({ length: n }, (_, i) => pmDay(base - i * 864e5));
}
function pmAgg(keys) { const a = pmEmpty(); keys.forEach(k => { const d = pm.days[k]; if (d) for (const f in a) a[f] += d[f] || 0; }); return a; }
function pmStatsRender() {
  const now = Date.now(), today = pmDay(now), d = dayOf(today);
  pmDayT.textContent = 'Today · ' + pmFmtDay.format(now) + (d.ss ? ' · ' + d.ss + (d.ss === 1 ? ' session' : ' sessions') : '');
  pmFull.textContent = d.fc ? d.fc + ' · avg ' + fmt(avgOf(d.fs, d.fc)) : 'none yet';
  pmPart.textContent = d.pc ? d.pc + ' · avg ' + fmt(avgOf(d.ps, d.pc)) + (d.pn ? ' · about ' + Math.round(100 * d.pf / d.pn) + '% of plan' : '') : 'none yet';
  const tp = timePct(d);
  pmRate.textContent = d.fc + d.pc ? d.fc + ' of ' + (d.fc + d.pc) + ' (' + Math.round(100 * d.fc / (d.fc + d.pc)) + '%)' + (tp != null ? ' · ' + tp + '% of planned time' : '') : 'nothing yet';
  pmTot.textContent = d.fc + d.pc ? fmt(d.fs + d.ps) : 'nothing yet';
  const w = pmAgg(pmLastDays(7, now)), fa = avgOf(w.fs, w.fc), pa = avgOf(w.ps, w.pc);
  pmWeek.textContent = 'Last 7 days: full avg ' + fmtOr(fa) + ' (' + w.fc + ' pomodoros) · quit-early avg ' + fmtOr(pa) + ' (' + w.pc + ')';
  pmIns.textContent = w.pn ? 'When you quit early, it is at about ' + Math.round(100 * w.pf / w.pn) + '% of the planned time on average.' : '';
  pmIns.style.display = pmIns.textContent ? '' : 'none';
  pmHistBtn.textContent = pmHistOpen ? 'Hide history' : 'Show history';
  pmHist.style.display = pmHistOpen ? 'block' : 'none';
  if (pmHistOpen) {
    const ks = Object.keys(pm.days).filter(k => pm.days[k].fc + pm.days[k].pc > 0).sort().reverse().slice(0, 14);
    const logByDay = {}; (pm.log || []).forEach(e => { (logByDay[e.day] = logByDay[e.day] || []).push(e); });
    pmHist.replaceChildren(...(ks.length ? ks.flatMap(k => {
      const x = dayOf(k), p = k.split('-').map(Number);
      const row = h('div', 'ev', null, h('span', null, pmFmtDay.format(Date.UTC(p[0], p[1] - 1, p[2], 12))),
        h('b', 'pmv', (x.fc ? x.fc + ' full avg ' + fmt(avgOf(x.fs, x.fc)) : '0 full') + ' · ' + (x.pc ? x.pc + ' quit avg ' + fmt(avgOf(x.ps, x.pc)) : '0 quit')));
      const sess = (logByDay[k] || []).sort((a, b) => a.startAt - b.startAt).map(e => {
        const rowEl = h('div', 'ev sess'), x = h('button', 'x', '×'); x.title = 'Delete this session'; x.setAttribute('aria-label', 'Delete the session that started at ' + clk.format(e.startAt));
        const info = [h('span', null, clk.format(e.startAt) + ' – ' + clk.format(e.endAt)), h('b', 'pmv', fmt(e.span) + ' session · ' + fmt(e.worked) + ' worked · ' + e.n + (e.n === 1 ? ' pomodoro' : ' pomodoros'))];
        const showRow = () => rowEl.replaceChildren(...info, x);
        x.onclick = () => {                              // first tap only asks; nothing is deleted until "Delete"
          const yes = h('button', 'cf yes', 'Delete'), no = h('button', 'cf', 'Keep');
          const conf = h('div', 'conf', null, h('span', null, e.sums ? 'Delete this session? It is also taken out of your averages.' : 'Remove this session from the list? It was saved before sessions kept their own totals, so your daily numbers stay as they are.'), yes, no);
          const timer = setTimeout(showRow, 6000);
          no.onclick = () => { clearTimeout(timer); showRow(); };
          yes.onclick = () => { clearTimeout(timer); pmDeleteSession(e); };
          rowEl.replaceChildren(conf);
        };
        showRow(); return rowEl;
      });
      return [row, ...sess];
    }) : [h('p', 'note', 'No history yet.')]));
  }
}
function pmRender() {                                  // layout: which parts are visible right now
  const s = pm.session, running = !!(s && s.cur), between = !!(s && !s.cur), paused = !!(s && s.pauseAt);
  pmCtl.style.display = running ? 'none' : 'block';
  pmLbl.textContent = between ? 'Start pomodoro ' + (s.n + 1) + ' of ' + PM_MAX : 'Start a pomodoro (a session is up to ' + PM_MAX + ')';
  pmRunBox.style.display = s ? 'block' : 'none';
  pmHead.textContent = !s ? '' : 'Pomodoro ' + s.n + ' of ' + PM_MAX + (running ? ' · ' + pmLen(s.cur.dur) : s.lastKind === 'quit' ? ' stopped early' : s.lastKind === 'discard' ? ' · the last one was discarded' : ' complete');
  pmBar.style.display = running ? '' : 'none';
  pmKeepBox.style.display = between ? '' : 'none';                       // only after a pomodoro has finished
  setSw(pmKeepSw.i, pmKeep);
  pmKeepTxt.textContent = pmKeep ? 'Counting: the time since it ended is added to your total. Press End session & see total to stop it.' : 'Not counting: your time stopped when the pomodoro ended.';
  pmPause.style.display = running || (between && (pmKeep || paused)) ? '' : 'none';
  pmPause.textContent = paused ? 'Resume' : running ? 'Pause' : 'Pause counting';
  pmDone.style.display = pmQuit.style.display = pmExit.style.display = running ? '' : 'none'; pmStop.style.display = between ? '' : 'none';
  pmConf.style.display = 'none'; pmBtns.style.display = '';
  pmWork.style.display = s && pmShow ? '' : 'none';
  const l = pm.last;
  pmSum.style.display = !s && l ? 'block' : 'none';
  if (!s && l) {
    pmSumTxt.textContent = l.empty ? 'Nothing was recorded: the pomodoro was stopped in under ' + PM_SLIP + ' seconds, so it was treated as a slip and not counted.'
      : 'Session finished · ' + l.n + (l.n === 1 ? ' pomodoro' : ' pomodoros') + ' (' + l.full + ' completed, ' + l.part + ' quit early)\n' +
        'You worked ' + fmt(Math.round(l.worked)) + '\nStarted ' + clk.format(l.startAt) + ' · session length ' + fmt(l.span != null ? l.span : Math.round((l.endAt - l.startAt) / 1000));
  }
  pmStatsRender();
}
function pmTick(n) {                                   // every tick: finish a pomodoro that ran out, refresh the live numbers
  let s = pm.session;
  if (s && !s.cur && !s.endedAt) { s.endedAt = n; s.extra = s.extra || 0; s.mark = pmKeep && !s.pauseAt ? n : null; }   // sessions saved by an older version
  if (s && s.cur && !s.pauseAt) {
    const endAt = s.cur.start + s.cur.dur + (s.cur.shift || 0);
    if (n >= endAt) {
      pmEndCur('full', endAt);
      const done = s.n >= PM_MAX;
      notify(done ? 'Pomodoro session complete' : 'Pomodoro ' + s.n + ' complete', 'Worked ' + fmt(Math.round(s.worked)) + ' so far.');
      pmChime();
      if (done) pmEndSession(endAt);
      savePm(); pmRender(); s = pm.session;
    }
  } else if (s && !s.cur && pmDay(n) !== s.day) {      // a session left open overnight is closed (counting stops at midnight)
    pmEndSession(Math.min(n, eodOf(s.endedAt || s.startAt))); savePm(); pmRender(); s = null;
  }
  const dk = pmDay(n); if (pmDayKey !== dk) { pmDayKey = dk; pmStatsRender(); }
  pmStop.classList.toggle('calc', !!(s && !s.cur && pmKeep && !s.pauseAt));   // striped border: time is still being counted
  pmStop.title = s && !s.cur && pmKeep && !s.pauseAt ? 'Time is still being counted. Press to stop it.' : '';
  if (!s) return;
  const c = s.cur, paused = !!s.pauseAt;
  let worked;
  if (c) {
    const elMs = pmElapsed(s, n);
    pmTMain.textContent = clockFmt(Math.max(0, Math.ceil((c.dur - elMs) / 1000))); pmTSup.style.display = 'none'; pmTime.className = 'alt';
    pmEnd.textContent = 'Ends at ' + clk.format(c.start + c.dur + (c.shift || 0)) + (paused ? ' · paused' : '');
    pmFill.style.width = Math.min(100, 100 * elMs / c.dur) + '%';
    worked = s.worked + elMs / 1000;
  } else {
    const gap = pmGap(s, n), stopped = s.lastKind === 'quit' || s.lastKind === 'discard';
    pmEnd.textContent = (stopped ? 'Stopped at ' : 'Ended at ') + clk.format(s.endedAt || n) + (paused ? ' · paused' : '');
    if (pmKeep) {                                      // counting up since it ended: orange, then red and pulsing past the length you gave it
      const lap = Math.floor(gap), allot = Math.round((s.lastDur || 0) / 1000), over = allot > 0 && lap > allot;
      pmTMain.textContent = '-' + clockFmt(lap); pmTSup.textContent = 'lapsed + ' + clockFmt(allot); pmTSup.style.display = over ? '' : 'none';
      pmTime.className = 'alt lapc' + (over ? ' over' : '');
    } else { pmTMain.textContent = stopped ? 'Stopped' : s.lastKind === 'early' ? 'Done early' : "Time's up"; pmTSup.style.display = 'none'; pmTime.className = 'alt ring'; }
    worked = s.worked + gap;
  }
  pmWork.textContent = 'Started ' + clk.format(s.startAt) + ' · worked so far ' + fmt(Math.floor(worked)) + ' · session ' + fmt(Math.max(0, Math.floor((pmEff(s, n) - s.startAt - (s.pausedTotal || 0)) / 1000)));
}

// ---------- tick ----------
let skyKey = '';
function tick() {
  const now = new Date(), n = now.getTime();
  if (wake != null && autoReset && !wakeEnd) { wakeEnd = cycleEndFor(now); try { GM_setValue('wakeEnd', wakeEnd || 0); } catch (e) {} }
  if (wake != null && autoReset && wakeEnd && n >= wakeEnd) { wake = null; wakeEnd = null; resetAt = n; skyKey = ''; try { GM_setValue('wakeEnd', 0); GM_setValue('wake', -1); } catch (e) {} }
  launch.textContent = '🕰️ ' + clk.format(now);
  const tp = tf.formatToParts(now), tg = t => (tp.find(x => x.type === t) || {}).value || '';
  cHM.textContent = tg('hour') + ':' + tg('minute'); cSS.textContent = ':' + tg('second'); cAP.textContent = ' ' + tg('dayPeriod'); cDate.textContent = df.format(now);
  const q = hf.formatToParts(now), get = t => +q.find(x => x.type === t).value;
  const H = get('hour'), M = get('minute'), S = get('second'), sod = H * 3600 + M * 60 + S;
  if (skyKey !== mode + H + ':' + M) {
    skyKey = mode + H + ':' + M;
    const a = SKY[H], b = SKY[(H + 1) % 24], c = BAR[H], d = BAR[(H + 1) % 24];
    panel.style.setProperty('--top', mix(a[0], b[0], M / 60)); panel.style.setProperty('--bot', mix(a[1], b[1], M / 60));
    panel.style.setProperty('--l1', mix(c[0], d[0], M / 60)); panel.style.setProperty('--l2', mix(c[1], d[1], M / 60));   // the hourly bar colours, also used by the LIVE tags on the Sky background
    if (mode === 'grain') { panel.style.setProperty('--g1', mix(c[0], d[0], M / 60)); panel.style.setProperty('--g2', mix(c[1], d[1], M / 60)); }
    else { panel.style.removeProperty('--g1'); panel.style.removeProperty('--g2'); }
  }
  const mid = n - sod * 1000 - now.getMilliseconds();
  const ev = events(now), i = ev.findIndex(e => e.t > n) - 1, cur = ev[i], nxt = ev[i + 1];
  const nm = wake == null ? names : ['⏰ Custom', names[1], names[2], names[3]];
  cBadge.textContent = cur.k === 1 ? (H < 12 ? '🌤️ Morning' : H < 17 ? '☀️ Afternoon' : '🌇 Evening') : nm[cur.k];
  phName.textContent = nm[cur.k];
  phLeft.textContent = clockFmt(Math.round((nxt.t - n) / 1000)) + ' left';
  fill.style.width = ((cur.k + Math.max(0, Math.min(1, (n - cur.t) / (nxt.t - cur.t)))) / 4 * 100) + '%';
  const day = ev.filter(e => e.o === 0), rev = wake == null ? ev : events(now, true);
  phEls.forEach((x, k) => { const e = day.find(z => z.k === k), t = nm[k].split(' '); x.ic.textContent = t[0]; x.sp.textContent = t[1]; x.s.textContent = (e ? clk.format(e.t) : '--') + (k === 0 ? ' ✎' : ''); x.box.classList.toggle('on', k === cur.k); });
  let nt = wake == null ? 'Real sky times for ' + locName() + '. Tap Dawn to set your own start time.' : lastShifted ? 'Late start: the whole day shifts to begin at your time, keeping real day and dusk lengths.' : 'Custom start. Dusk and Night still follow the real sunset.';
  if (wake != null && autoReset && wakeEnd) nt += ' Resets to Default at ' + wkf.format(wakeEnd) + '.';
  else if (wake == null && n - resetAt < 30 * 6e4) nt = 'Your Custom cycle ended, so you are back on the real dawn.';
  if (wakeNote.textContent !== nt) wakeNote.textContent = nt;
  const tzp = tzn.formatToParts(now).find(x => x.type === 'timeZoneName'), li = loc.zone + (tzp ? ' · now ' + tzp.value : '');
  if (locInfo.textContent !== li) locInfo.textContent = li;
  const zc = curZone(), zl = zc ? zoneEvents(zc, now) : null, zon = !!(zc && zoneOn), src = zon ? zl : rev;
  const nx = k => { const e = src.find(x => x.k === k && x.t > n); return e ? e.t : NaN; };
  const lr = 'Next sunrise' + (zon ? ' · ' + zc.city : ''), ls = 'Next sunset' + (zon ? ' · ' + zc.city : '');
  if (lblRise.textContent !== lr) lblRise.textContent = lr;
  if (lblSet.textContent !== ls) lblSet.textContent = ls;
  const cdn = k => isNaN(nx(k)) ? '--' : fmt(Math.round((nx(k) - n) / 1000));
  evRise.textContent = cdn(1); evSet.textContent = cdn(2);
  if (zc) {
    let dm = (zsod(zc.tz, n) - sod) / 60; dm = ((dm % 1440) + 1440) % 1440; if (dm > 960) dm -= 1440;
    const off = dm === 0 ? 'same time as you' : (dm > 0 ? '+' : '−') + Math.abs(dm) / 60 + 'h from ' + loc.short;
    zTime.textContent = '🕒 ' + zfmt(zc.tz, 't', { weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(now) + ' · ' + off;
    const zt = zfmt(zc.tz, 'c', { hour: 'numeric', minute: '2-digit' }), fz = k => { const e = zl.find(x => x.k === k && x.o === 0); return e ? zt.format(e.t) : '--'; };
    zSun.textContent = '🌅 ' + fz(1) + '   🌇 ' + fz(2) + ' (local)';
  }
  hourRows.forEach((r, k) => { r.l.textContent = hl((H + k + 1) % 24, 0); r.v.textContent = fmt(3600 * (k + 1) - (M * 60 + S)); });
  chips(H);
  fxTick(n);
  kanTick(n);
  pmTick(n);
  alarmTick(n);
  if (pendingSounds.length && AC && AC.state === 'running') flushPending();
  trashTick(n, sod);
  rows.forEach(r => {
    const t = r.t, nowS = Math.floor(n / 1000);
    let d = t.v * 60 - sod; if (d < 0) d += 86400;
    const since = (86400 - d) % 86400, os = nowS - since;          // when this clock time last came round, in whole seconds
    const wrapped = !isNaN(r.last) && d > r.last + 5;
    if (wrapped) { beep(2); notify('Time reached', (t.title ? t.title + ' · ' : '') + hl(Math.floor(t.v / 60), t.v % 60)); }
    if (!t.armed) { t.armed = n; save(); }
    if (!t.span) { t.span = Math.max(d, 1); t.dur0 = t.span; save(); }
    else if (wrapped || d > t.span) { if (!t.dur0) t.dur0 = t.span; t.span = 86400; save(); }
    const fin = !!t.el && (os * 1000 >= t.armed - 1000 || since <= sod);   // elapsed switch on: count up from when it went off (looking back as far as earlier today)
    r.last = d; r.os = fin ? os : 0; r.ok.style.display = fin && t.ack !== os ? '' : 'none';
    if (!r.chipT || n - r.chipT >= 1000) { r.chipT = n; rowChips(r, n + d * 1000, n, t.v * 60 < sod); }   // chosen time vs daylight / golden / blue windows   // confirming hides the check; the elapsed time keeps counting until the Elapsed switch is turned off
    if (fin) {
      const lap = nowS - os, allot = os * 1000 >= t.armed - 1000 ? (t.dur0 || t.span) : 0, over = allot > 0 && lap > allot;   // red only if you gave it a length to pass
      r.cdMain.textContent = '-' + (lap < 60 ? lap + 's' : fmt(lap));
      r.cdSup.textContent = 'lapsed + ' + fmt(allot); r.cdSup.style.display = over ? '' : 'none';
      r.cd.className = 'cd lap' + (over ? ' over' : '');
      r.f.style.transition = 'none'; r.f.style.width = '100%'; r.p = 1;   // the bar just shows "complete": its colour is never touched
      return;
    }
    r.cdMain.textContent = fmt(d); r.cdSup.style.display = 'none'; r.cd.className = 'cd';
    const p = Math.max(0, Math.min(1, 1 - d / t.span));
    r.f.style.transition = (r.first || p < r.p) ? 'none' : ''; r.first = false; r.p = p; r.f.style.width = (p * 100) + '%';
  });
}

// ---------- floating widget ----------
const W = 300;
let open = false, pos = { r: 16, b: 16 }, size = { w: W, h: 580 }, moved = false, docked = false, ytDocked = true;
const isYT = /(^|\.)youtube\.com$/.test(location.hostname);
try { ytDocked = GM_getValue('ytDocked', true) !== false; } catch (e) {}
try { open = GM_getValue('open', false) === true; } catch (e) {}
try { const q = JSON.parse(sessionStorage.getItem('skyclock-pos') || GM_getValue('pos', 'null')); if (q) pos = q; } catch (e) {}
try { const q = JSON.parse(sessionStorage.getItem('skyclock-size') || GM_getValue('size', 'null')); if (q && q.w && q.h) size = q; } catch (e) {}
// YouTube: on a watch page with the suggested videos beside the player, sit on top of that column
function ytSlot() {
  if (!isYT || !location.pathname.startsWith('/watch')) return null;
  const sec = document.querySelector('ytd-watch-flexy #secondary'), pri = document.querySelector('ytd-watch-flexy #primary');
  if (!sec || !pri) return null;
  const s = sec.getBoundingClientRect(), p = pri.getBoundingClientRect();
  if (s.width < 250 || s.left < p.right - 24 || innerWidth - s.left < 250) return null;   // narrow window or theater mode: column is not beside the video
  return s;
}
const keepYT = () => { try { GM_setValue('ytDocked', ytDocked); } catch (e) {} };
function place() {   // the window itself is the widget: fill it
  const st = panel.style;
  st.position = 'fixed'; st.inset = '0'; st.width = '100%'; st.height = '100%'; st.zIndex = '1';
  shell.style.display = 'flex'; launch.style.display = 'none';
}
function setOpen(o, persist) { open = o; if (persist) { try { GM_setValue('open', o); } catch (e) {} } place(); }
function applyMode(m, persist) {
  mode = m;
  [shell, launch].forEach(e => e.classList.toggle('grain', m === 'grain'));
  segSky.classList.toggle('on', m === 'sky'); segBlack.classList.toggle('on', m === 'grain');
  segSky.setAttribute('aria-pressed', m === 'sky'); segBlack.setAttribute('aria-pressed', m === 'grain');
  if (persist) { try { GM_setValue('mode', m); } catch (e) {} }
  skyKey = ''; tick();
}
segSky.onclick = () => applyMode('sky', true);
segBlack.onclick = () => applyMode('grain', true);
function setWake(v, persist) {
  wake = v;
  if (persist) {
    wakeEnd = v != null && autoReset ? cycleEndFor(new Date()) : null;
    try { GM_setValue('wakeEnd', wakeEnd || 0); GM_setValue('wake', v == null ? -1 : v); } catch (e) {}
  } else { try { const e = +GM_getValue('wakeEnd', 0); wakeEnd = v != null && e > 0 ? e : null; } catch (e) {} }
  skyKey = ''; tick();
}
autoCb.onchange = () => {
  autoReset = autoCb.checked; wakeEnd = null;
  if (wake != null && autoReset) { const nx = events(new Date(), false, true).find(e => e.k === 0 && e.t > Date.now()); wakeEnd = nx ? nx.t : null; }   // the next Custom start, so turning it on at night resets at that start, not a day later
  try { GM_setValue('wakeEnd', wakeEnd || 0); GM_setValue('autoReset', autoReset); } catch (e) {} tick();
};
dawnBox.onclick = () => { const open = editor.style.display === 'none'; editor.style.display = open ? 'block' : 'none'; if (open && wake != null) wakeIn.value = p2(Math.floor(wake / 60)) + ':' + p2(wake % 60); };
dawnBox.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dawnBox.click(); } });
wakeSet.onclick = () => { if (!wakeIn.value) return; const q = wakeIn.value.split(':').map(Number); setWake(q[0] * 60 + q[1], true); editor.style.display = 'none'; };
wakeReset.onclick = () => { setWake(null, true); wakeIn.value = ''; editor.style.display = 'none'; };
function renderZone() {
  const z = curZone(), on = !!(z && zoneOn);
  zSel.value = z ? z.id : '';
  zInfo.style.display = z ? 'block' : 'none'; evSeg.style.display = z ? 'inline-flex' : 'none';
  if (z) { zTag.textContent = z.flag + ' ' + z.tag; zDesc.textContent = z.desc; segZone.textContent = z.city; }
  segDef.classList.toggle('on', !on); segZone.classList.toggle('on', on);
  segDef.setAttribute('aria-pressed', !on); segZone.setAttribute('aria-pressed', on);
}
function setZone(id, on, persist) {
  zoneId = ZONES.some(z => z.id === id) ? id : ''; zoneOn = !!(zoneId && on);
  if (persist) { try { GM_setValue('zone', JSON.stringify({ id: zoneId, on: zoneOn })); } catch (e) {} }
  renderZone(); tick();
}
zSel.onchange = () => setZone(zSel.value, true, true);   // picking a zone switches the countdowns to it automatically
segDef.onclick = () => setZone(zoneId, false, true);
segZone.onclick = () => setZone(zoneId, true, true);

// drag (header when open, pill when closed) and resize (corner grip)
const keep = (k, v) => { const j = JSON.stringify(v); try { sessionStorage.setItem('skyclock-' + k, j); } catch (e) {} try { GM_setValue(k, j); } catch (e) {} };
function dragify(el, skipButtons) {
  let d = null;
  el.addEventListener('pointerdown', e => {
    if (docked || e.button > 0 || (skipButtons && e.target.closest('button'))) return;
    moved = false; d = { x: e.clientX, y: e.clientY, r: pos.r, b: pos.b }; el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove', e => {
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!moved && Math.hypot(dx, dy) < 4) return;
    moved = true; el.style.cursor = 'grabbing'; pos.r = d.r - dx; pos.b = d.b - dy; place();
  });
  const end = () => { if (!d) return; d = null; el.style.cursor = ''; if (moved) keep('pos', pos); };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
}
// The header is a native drag region (see CSS). This is a fallback in case the region is not honoured inside the shadow DOM.
let wd = null;
hd.addEventListener('pointerdown', async e => {
  if (!sk || e.button > 0 || e.target.closest('button')) return;
  const st = { x: e.screenX, y: e.screenY, p: null }; wd = st;
  hd.setPointerCapture(e.pointerId); st.p = await sk.getPos();
});
hd.addEventListener('pointermove', e => { if (wd && wd.p) sk.setPos(wd.p[0] + e.screenX - wd.x, wd.p[1] + e.screenY - wd.y); });
const endWd = () => { wd = null; };
hd.addEventListener('pointerup', endWd); hd.addEventListener('pointercancel', endWd);
let rz = null;
grip.addEventListener('pointerdown', e => { rz = { x: e.clientX, y: e.clientY, w: size.w, h: size.h }; grip.setPointerCapture(e.pointerId); e.preventDefault(); });
grip.addEventListener('pointermove', e => {
  if (!rz) return;
  size.w = Math.max(240, Math.min(rz.w - (e.clientX - rz.x), innerWidth - pos.r));
  size.h = Math.max(260, Math.min(rz.h - (e.clientY - rz.y), innerHeight - pos.b)); place();
});
const endRz = () => { if (!rz) return; rz = null; keep('size', size); };
grip.addEventListener('pointerup', endRz); grip.addEventListener('pointercancel', endRz);

// keep every tab in sync
if (typeof GM_addValueChangeListener === 'function') {
  GM_addValueChangeListener('times', (k, o, v, remote) => { if (remote) { tracked = load(); build(); } });
  GM_addValueChangeListener('mode', (k, o, v, remote) => { if (remote && v !== mode) applyMode(v === 'grain' ? 'grain' : 'sky', false); });
  GM_addValueChangeListener('wake', (k, o, v, remote) => { if (remote) setWake(+v >= 0 ? +v : null, false); });
  GM_addValueChangeListener('zone', (k, o, v, remote) => { if (remote) { try { const z = JSON.parse(v); setZone(z.id || '', !!z.on, false); } catch (e) {} } });
  GM_addValueChangeListener('autoReset', (k, o, v, remote) => { if (remote) { autoReset = v !== false; autoCb.checked = autoReset; } });
  GM_addValueChangeListener('wakeEnd', (k, o, v, remote) => { if (remote) wakeEnd = +v > 0 ? +v : null; });
  GM_addValueChangeListener('alarm', (k, o, v, remote) => { if (remote) alarm = loadAlarm(); });
  GM_addValueChangeListener('open', (k, o, v, remote) => { if (remote && v !== open) setOpen(v === true, false); });
}
try { GM_registerMenuCommand('Show / hide Sky Clock', () => setOpen(!open, true)); } catch (e) {}
addEventListener('keydown', e => { if (e.altKey && e.shiftKey && e.code === 'KeyK') setOpen(!open, true); });
addEventListener('resize', place);
if (isYT) { addEventListener('yt-navigate-finish', place); setInterval(place, 500); }

function renderLoc() {
  const gpsOpt = [...locSel.options].find(o => o.value === 'gps'); gpsOpt.hidden = loc.id !== 'gps';
  locSel.value = loc.id; phTitle.textContent = 'Day and night in ' + locName();
  locSum.textContent = '📍 Your location · ' + (loc.id === 'gps' ? (loc.city && loc.city !== 'your location' ? loc.city + ' server' : 'approximate server') : loc.label);
}
function setLoc(l, persist) {
  const tzChanged = l.tz !== TZ;
  loc = l; TZ = l.tz; LAT = l.lat; LON = l.lon; mkFmts();
  if (tzChanged) wakeEnd = null; skyKey = ''; chipKey = -1; resetAt = 0; fxLast = 0; moonCache.key = '';
  tracked.forEach(t => { delete t.span; delete t.dur0; }); rows.forEach(r => { r.last = NaN; r.first = true; });   // countdowns re-measure in the new zone (no false "time reached")
  if (persist) { try { GM_setValue('loc', JSON.stringify({ id: l.id, lat: l.lat, lon: l.lon, tz: l.tz, city: l.city })); if (tzChanged) GM_setValue('wakeEnd', 0); save(); } catch (e) {} }
  renderLoc(); pmDayKey = ''; pmRender(); tick();
}
locSel.onchange = () => { const l = US_LOCS.find(x => x.id === locSel.value); if (l) { locMsg.textContent = 'Showing ' + l.city + ' (' + l.zone + ').'; setLoc(l, true); } };
locGeo.onclick = () => {
  if (!window.skyclock || !window.skyclock.lookupLocation) { locMsg.textContent = 'Location lookup is not available. Pick your time zone above instead.'; return; }
  locMsg.textContent = 'Looking up your approximate location from your internet connection…';
  window.skyclock.lookupLocation().then(g => {
    if (!g || !g.ok) { locMsg.textContent = 'Could not find your location (are you online?). Pick your time zone above instead.'; return; }
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setLoc({ id: 'gps', label: '📍 My location', city: g.city || 'your location', short: 'your location', zone: 'Your device time zone', tz, lat: g.lat, lon: g.lon }, true);
    locMsg.textContent = 'Using ' + (g.city || 'your approximate location') + ', found from your internet connection, so it can be a few miles off.';
  }).catch(() => { locMsg.textContent = 'Could not find your location. Pick your time zone above instead.'; });
};
renderLoc();
pmRender(); renderZone(); build(); applyMode(mode, false); place(); kanInit();
(document.body || document.documentElement).appendChild(panel);
unlockAudio(true); setInterval(tick, 250);
setInterval(() => { if (!panel.isConnected) (document.body || document.documentElement).appendChild(panel); }, 2000);
})();
