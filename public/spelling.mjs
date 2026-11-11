const SPELLING_LOCALES = { en: 'en-GB', ko: 'ko-KR', ja: 'ja-JP', de: 'de-DE', it: 'it-IT', fr: 'fr-FR' };
const normalizeSpelling = text => String(text ?? '').normalize('NFC');
const spellingLocale = language => SPELLING_LOCALES[language] || SPELLING_LOCALES.en;
const foldSpelling = (text, language) => text.toLocaleLowerCase(spellingLocale(language));

/** Keep visible characters together, including composed accents and joined emoji. */
export function spellingCharacters(text, language = 'en') {
  const normalized = normalizeSpelling(text);
  if (typeof globalThis.Intl?.Segmenter !== 'function') return Array.from(normalized);
  const segmenter = new Intl.Segmenter(spellingLocale(language), { granularity: 'grapheme' });
  return Array.from(segmenter.segment(normalized), part => part.segment);
}

/** Plain data only: render char/expected with textContent, never as HTML. */
export function spellingSlots(target, answer, language = 'en', checked = false) {
  const expectedCharacters = spellingCharacters(target, language);
  const enteredCharacters = spellingCharacters(answer, language);
  return Array.from({ length: Math.max(expectedCharacters.length, enteredCharacters.length) }, (_, index) => {
    const expected = expectedCharacters[index] ?? '';
    const char = enteredCharacters[index] ?? '';
    const extra = index >= expectedCharacters.length;
    const gap = /^\s+$/u.test(expected) && (char === '' || char === expected);
    const state = checked
      ? char !== '' && !extra && foldSpelling(char, language) === foldSpelling(expected, language) ? 'correct' : 'wrong'
      : char === '' ? 'empty' : 'filled';
    return { char, expected, state, gap, extra };
  });
}

/** Ignore outer whitespace and letter case; internal spacing and accents matter. */
export function evaluateSpelling(answer, target, language = 'en') {
  const normalizedAnswer = normalizeSpelling(answer).trim();
  const normalizedTarget = normalizeSpelling(target).trim();
  const empty = normalizedAnswer === '';
  return {
    correct: !empty && foldSpelling(normalizedAnswer, language) === foldSpelling(normalizedTarget, language),
    empty,
    answer: normalizedAnswer,
    target: normalizedTarget,
    slots: spellingSlots(normalizedTarget, normalizedAnswer, language, true),
  };
}
