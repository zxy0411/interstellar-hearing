import{LANGUAGES,comparison}from './core.mjs';

let catalogPromise;
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const catalogError = (code, message) => Object.assign(new Error(message), { code });
const invalid = () => catalogError('catalog_invalid', '本地词典录音目录无效，请重新获取完整资源包');
const localeMatches = (language, locale) => language === 'en'
  ? ['en-GB', 'en-US'].includes(locale)
  : Object.hasOwn(LANGUAGES, language) && LANGUAGES[language].locale === locale;

function validateSource(src) {
  if (typeof src !== 'string' || !/^audio\/files\/[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(src) || src.includes('..')) throw invalid();
  return src;
}

function freeze(value, visited = new Set()) {
  if (!value || typeof value !== 'object' || visited.has(value)) return value;
  visited.add(value);
  for (const child of Object.values(value)) freeze(child, visited);
  return Object.freeze(value);
}

function validateCatalog(raw) {
  if (!isObject(raw) || raw.version !== 1 || !isObject(raw.entries) || !isObject(raw.coverage)) throw invalid();
  const entries = {};
  for (const [key, entry] of Object.entries(raw.entries)) {
    if (!isObject(entry) || !Object.hasOwn(LANGUAGES, entry.language) || typeof entry.word !== 'string' || !entry.word.trim() || !isObject(entry.recordings)) throw invalid();
    if (key !== entry.language + ':' + comparison(entry.word, entry.language)) throw invalid();
    const recordings = {};
    for (const [locale, recording] of Object.entries(entry.recordings)) {
      if (!localeMatches(entry.language, locale) || !isObject(recording)) throw invalid();
      if (!['sourceUrl', 'license', 'attribution'].every(field => typeof recording[field] === 'string')) throw invalid();
      recordings[locale] = { src: validateSource(recording.src), sourceUrl: recording.sourceUrl, license: recording.license, attribution: recording.attribution };
      if (recording.licenseUrl !== undefined && recording.licenseUrl !== null) {
        let url;
        try { if (typeof recording.licenseUrl !== 'string') throw invalid();url = new URL(recording.licenseUrl); } catch { throw invalid(); }
        if (url.protocol !== 'https:' || url.username || url.password) throw invalid();
        recordings[locale].licenseUrl = url.href;
      }
    }
    entries[key] = { word: entry.word.normalize('NFC').trim(), language: entry.language, recordings };
  }
  try { return freeze({ version: 1, entries, coverage: structuredClone(raw.coverage) }); }
  catch { throw invalid(); }
}

/** Load only the packaged catalog; a failed load is distinct from a missing word. */
export function loadRecordingCatalog() {
  if (catalogPromise) return catalogPromise;
  const pending = (async () => {
    const page = new URL(globalThis.location.href);
    let raw;
    if (page.protocol === 'file:') {
      if (!globalThis.__INTERSTELLAR_RECORDINGS__) throw catalogError('catalog_load_failed', '此便携页面缺少词典录音目录，请使用完整资源包');
      raw = globalThis.__INTERSTELLAR_RECORDINGS__;
    } else if (['http:', 'https:'].includes(page.protocol)) {
      let response;
      try {
        response = await fetch(new URL('/audio/catalog.json', page).href, { redirect: 'error' });
      } catch { throw catalogError('catalog_load_failed', '本地词典录音目录加载失败，请检查资源包或连接'); }
      if (!response.ok) throw catalogError('catalog_load_failed', '本地词典录音目录加载失败，请检查资源包或连接');
      if (response.url && new URL(response.url).origin !== page.origin) throw invalid();
      try { raw = await response.json(); } catch { throw invalid(); }
    } else {
      throw catalogError('catalog_load_failed', '当前页面地址不支持读取本地词典录音');
    }
    return validateCatalog(raw);
  })();
  catalogPromise = pending;
  pending.catch(() => { if (catalogPromise === pending) catalogPromise = undefined; });
  return pending;
}

function wordKey(word) {
  return isObject(word) && Object.hasOwn(LANGUAGES, word.language) && typeof word.word === 'string' && word.word.trim()
    ? word.language + ':' + comparison(word.word, word.language) : null;
}

function recordingUrl(src) {
  validateSource(src);
  const page = new URL(globalThis.location.href);
  return page.protocol === 'file:'
    ? new URL('dist/' + src, new URL('.', page)).href
    : new URL('/' + src, page).href;
}

/** Return null for an absent exact locale. Never substitute another language or accent. */
export async function findRecording(word, locale) {
  const key = wordKey(word);
  if (!key || !localeMatches(word.language, locale)) return null;
  const catalog = await loadRecordingCatalog();
  const entry = catalog.entries[key], recording = entry?.recordings[locale];
  return recording ? { ...recording, src: recordingUrl(recording.src), word: entry.word, language: entry.language, locale } : null;
}

export async function recordedLocales(word) {
  const key = wordKey(word);
  if (!key) return [];
  const catalog = await loadRecordingCatalog();
  return Object.keys(catalog.entries[key]?.recordings || {});
}

export async function recordingCoverage() {
  return (await loadRecordingCatalog()).coverage;
}
