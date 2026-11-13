import { detectTajweedRule } from './tajweed';

/**
 * Utility functions for Quranic and Arabic text processing,
 * normalization, diacritic stripping, and speech recognition fuzzy matching.
 */

// Arabic diacritics regex (harakat, tanween, sukun, shadda, madd, etc.)
// Note: \u0670 (dagger alif) is handled separately in normalization to convert to standard alif!
const ARABIC_DIACRITICS_REGEX = /[\u064B-\u065F\u06D6-\u06ED\u08F0-\u08FF]/g;

// Quranic pause signs and decorative symbols
const QURANIC_SYMBOLS_REGEX = /[۞۩ۣ۪ۭۜ۠ۡۢۤۧۨ۫۬ۮۯۖ-ۗۘ-ۚۛۜ۝]/g;

/**
 * Normalizes Arabic text for speech comparison:
 * - Converts Quranic dagger alif (Alif Khanjariyyah \u0670) to standard Alif (ا),
 *   essential for words like مَٰلِكِ -> مالك, صِرَٰطَ -> صراط, ٱلسَّمَٰوَٰتِ -> السماوات
 * - Removes all Tashkeel / diacritics
 * - Normalizes Alif variants (أ إ آ ٱ) to simple Alif (ا)
 * - Normalizes Alif Maqsura (ى) and Hamza on Nabrah (ئ) to (ي)
 * - Normalizes Taa Marbuta (ة) to (ه)
 * - Normalizes Quranic orthography like الصلوة -> الصلاة, الزكوة -> الزكاة
 * - Removes tatweel (ـ)
 * - Removes Quranic stop signs and punctuation
 * - Trims and squashes multiple spaces
 */
export function normalizeArabic(text: string): string {
  if (!text) return '';

  let str = text
    // Convert dagger alif \u0670 to standard alif before stripping diacritics
    .replace(/\u0670/g, 'ا')
    // Quranic orthography forms (waw pronounced as alif)
    .replace(/صلو[ةه]/g, 'صلاه')
    .replace(/زكو[ةه]/g, 'زكاه')
    .replace(/حيو[ةه]/g, 'حياه')
    .replace(/ربوا/g, 'ربا')
    .replace(ARABIC_DIACRITICS_REGEX, '')
    .replace(QURANIC_SYMBOLS_REGEX, '')
    .replace(/[\u0640\u200E\u200F\u200C\u200D]/g, '') // tatweel & directional marks
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ىئ\u06CC]/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/[^\u0621-\u064A\s]/g, '') // keep only standard Arabic letters and whitespace
    .replace(/\s+/g, ' ')
    .trim();

  // Squash multiple identical alifs (e.g. elongation ااا -> ا)
  str = str.replace(/ا+/g, 'ا');

  // Convert Uthmani / Warsh / Qalun orthography to match standard Arabic STT output
  const specialMap: Record<string, string> = {
    'الرحمان': 'الرحمن',
    'رحمان': 'رحمن',
    'هاذا': 'هذا',
    'هاذه': 'هذه',
    'هاولاء': 'هولا',
    'هولاء': 'هولا',
    'هولاي': 'هولا',
    'ذالك': 'ذلك',
    'كذالك': 'كذلك',
    'ذالكم': 'ذلكم',
    'ذالكما': 'ذلكما',
    'لاكن': 'لكن',
    'ولاكن': 'ولكن',
    'اولائك': 'اوليك',
    'اولاءك': 'اوليك',
    'الاه': 'اله',
    'طاها': 'طه',
    'ياسين': 'يس',
    'يايها': 'يا ايها',
    'ياايها': 'يا ايها',
    'يانبي': 'يا نبي',
    'ياقوم': 'يا قوم',
    'ياموسي': 'يا موسي',
    'صلوه': 'صلاه',
    'صلواه': 'صلاه',
    'الصلواه': 'الصلاه',
    'الصلوه': 'الصلاه',
    'زكوه': 'زكاه',
    'زكواه': 'زكاه',
    'الزكواه': 'الزكاه',
    'الزكوه': 'الزكاه',
    'حيوه': 'حياه',
    'حيواه': 'حياه',
    'الحيواه': 'الحياه',
    'الحيوه': 'الحياه',
    'ربوا': 'ربا',
    'الربوا': 'الربا',
    'لله': 'لله',
    'ابراهيم': 'ابراهيم',
    'ابراهام': 'ابراهيم',
  };

  str = str
    .split(' ')
    .map((w) => specialMap[w] || w)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return str;
}

/**
 * Splits an Ayah text into words, preserving original with Tashkeel and
 * generating a clean normalized version for comparison.
 */
export function tokenizeAyah(ayahText: string, ayahNumber: number) {
  // Strip Quranic verse markers or leading bismillah if bundled
  const cleaned = ayahText
    .replace(QURANIC_SYMBOLS_REGEX, '')
    .replace(/\(\d+\)/g, '')
    .trim();

  const rawWords = cleaned
    .split(/\s+/)
    .filter(w => normalizeArabic(w).length > 0);

  return rawWords.map((word, index) => {
    return {
      id: `a${ayahNumber}_w${index}`,
      text: word,
      cleanText: normalizeArabic(word),
      ayahNumber,
      wordIndex: index,
      isHidden: false,
      isMatched: false,
      isActive: false,
      isHinted: false,
      hasError: false,
      tajweedRule: detectTajweedRule(word, rawWords[index + 1]),
    };
  });
}

/**
 * Computes Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Compares two normalized Arabic words with tolerance for speech-to-text nuances:
 * - Exact match
 * - Speech-to-text attached prefixes (و، ف، ل، ب، ك، ال)
 * - Single letter edit distance tolerance
 */
export function isWordMatch(targetClean: string, spokenClean: string): boolean {
  if (!targetClean || !spokenClean) return false;
  if (targetClean === spokenClean) return true;

  // Check prefix variations (e.g. STT hears "والحمد" instead of "الحمد", or "الحمد" instead of "ولحمد")
  const prefixes = ['و', 'ف', 'ب', 'ل', 'ك', 'ال', 'بال', 'فال', 'وال'];
  for (const p of prefixes) {
    if (spokenClean === p + targetClean) return true;
    if (targetClean === p + spokenClean) return true;
  }

  // Edit distance tolerance
  if (targetClean.length >= 3 && spokenClean.length >= 3) {
    const dist = levenshteinDistance(targetClean, spokenClean);
    if (dist <= 1) return true;
  }

  return false;
}

/**
 * Formats a 1-based number to 3-digit zero-padded string (e.g., 1 -> "001")
 */
export function pad3(num: number): string {
  return String(num).padStart(3, '0');
}

/**
 * Returns the audio URL for an Ayah for a specific reciter
 */
export function getAyahAudioUrl(reciterSubfolder: string, surahNum: number, ayahNum: number): string {
  const suraPad = pad3(surahNum);
  const ayahPad = pad3(ayahNum);
  return `https://everyayah.com/data/${reciterSubfolder}/${suraPad}${ayahPad}.mp3`;
}
