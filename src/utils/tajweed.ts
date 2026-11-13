import { TajweedRuleInfo, WordToken } from '../types/quran';
import { normalizeArabic, levenshteinDistance } from './arabic';

/**
 * Detects Tajweed rules present in a Quranic word token in Uthmani script,
 * optionally analyzing its phonetic interaction with the following word.
 */
export function detectTajweedRule(
  wordText: string,
  nextWordText?: string
): TajweedRuleInfo | null {
  if (!wordText) return null;

  // 1. المد اللازم أو المتصل أو المنفصل (علامة المد القرآني ٓ)
  if (wordText.includes('\u0653') || /[\u0627\u0648\u064A]\u0653/.test(wordText)) {
    if (/[\u0653][^\u0621]*\u0651/.test(wordText) || /ضَّآلّ|طَآمّ|صَآخّ/.test(wordText)) {
      return {
        ruleName: 'مد لازم كَلِمي مثقل',
        category: 'madd',
        description: 'حرف مد بعده حرف مشدد في كلمة واحدة',
        tip: 'يُمَدّ بمقدار 6 حركات وجوباً ولزوماً.',
      };
    }
    if (/[\u0653][^\s]*[ءأإ]/.test(wordText)) {
      return {
        ruleName: 'مد متصل واجب',
        category: 'madd',
        description: 'حرف مد بعده همزة في الكلمة نفسها',
        tip: 'يُمَدّ بمقدار 4 أو 5 حركات وجوباً.',
      };
    }
    return {
      ruleName: 'مد متصل / منفصل',
      category: 'madd',
      description: 'حرف مد تليه همزة أو سكون',
      tip: 'احرص على إشباع المد بمقدار 4-5 حركات.',
    };
  }

  // 2. غنة النون والميم المشددتين (نّ / مّ)
  if (/[\u0646\u0645]\u0651/.test(wordText)) {
    const isNoon = /[\u0646]\u0651/.test(wordText);
    return {
      ruleName: isNoon ? 'غنة النون المشددة' : 'غنة الميم المشددة',
      category: 'ghunnah',
      description: 'نون أو ميم عليها شدة أصلية',
      tip: 'يجب إظهار الغنة بمقدار حركتين كاملتين من الخيشوم.',
    };
  }

  // 3. قلقلة (قطب جد) ساكنة
  // حروف القلقلة: ق، ط، ب، ج، د مع سكون (\u0652) أو خالية من الحركة وموقوف عليها
  if (/[\u0642\u0637\u0628\u062C\u062F]\u0652/.test(wordText) || /[\u0642\u0637\u0628\u062C\u062F]$/.test(normalizeArabic(wordText))) {
    const match = wordText.match(/([\u0642\u0637\u0628\u062C\u062F])/);
    const letter = match ? match[1] : '';
    return {
      ruleName: `قلقلة (${letter})`,
      category: 'qalqalah',
      description: 'أحد حروف القلقلة (ق، ط، ب، ج، د) ساكن',
      tip: 'اضطراب ونبرة اهتزاز في مخرج الحرف عند النطق به ساكناً دون حركة.',
    };
  }

  // 4. إقلاب (علامة الميم الصغيرة فوق النون ۭ أو ۢ أو تنوين يليه باء)
  if (wordText.includes('\u06ED') || wordText.includes('\u06E2') || (/(ً|ٍ|ٌ|نْ|ن)$/.test(wordText) && nextWordText && /^ب/.test(normalizeArabic(nextWordText)))) {
    return {
      ruleName: 'إقلاب',
      category: 'iqlab',
      description: 'نون ساكنة أو تنوين جاء بعده حرف الباء',
      tip: 'قَلب النون ميماً مخفاة مع غنة ظاهرة بمقدار حركتين وتلامس لطيف للشفتين.',
    };
  }

  // 5. إدغام بغنة أو بغير غنة مع الكلمة التالية
  if (nextWordText) {
    const endsWithNoonOrTanween = /(ً|ٍ|ٌ|[\u064B-\u064D]|نْ|ن)$/.test(wordText) || /[\u064B-\u064D]/.test(wordText.slice(-2));
    const nextClean = normalizeArabic(nextWordText);
    const nextFirstLetter = nextClean.charAt(0);

    if (endsWithNoonOrTanween) {
      if (['ي', 'ن', 'م', 'و'].includes(nextFirstLetter)) {
        return {
          ruleName: `إدغام بغنة (مع حرف ${nextFirstLetter})`,
          category: 'idgham',
          description: 'نون ساكنة أو تنوين تلاه أحد حروف (ينمو)',
          tip: 'إدخال الحرف الأول في الثاني بحيث يصيران حرفاً واحداً مشدداً مع غنة حركتين.',
        };
      }
      if (['ل', 'ر'].includes(nextFirstLetter)) {
        return {
          ruleName: `إدغام كامل بغير غنة (مع حرف ${nextFirstLetter})`,
          category: 'idgham',
          description: 'نون ساكنة أو تنوين تلاه اللام أو الراء',
          tip: 'إدغام تام للحرف في اللام أو الراء من غير غنة.',
        };
      }
      // إخفاء حقيقي مع حروف الإخفاء الـ 15
      const ikhfaLetters = ['ص', 'ذ', 'ث', 'ك', 'ج', 'ش', 'ق', 'س', 'د', 'ط', 'ز', 'ف', 'ت', 'ض', 'ظ'];
      if (ikhfaLetters.includes(nextFirstLetter)) {
        return {
          ruleName: `إخفاء حقيقي (عند حرف ${nextFirstLetter})`,
          category: 'ikhfa',
          description: 'نون ساكنة أو تنوين تلاها حرف إخفاء',
          tip: 'ستر النون الساكنة ونطقها بصفة بين الإظهار والإدغام مع بقاء الغنة.',
        };
      }
    }
  }

  return null;
}

/**
 * Strict Tajweed-aware Speech Matcher:
 * - Checks if spoken token matches target word clean text
 * - Accounts for valid Tajweed phonetic realizations (e.g., idgham, iqlab, tanween absorption)
 * - Accounts for prefixes and word endings (tanween, taa marbuta/maftuha, alif maqsura)
 * - Strict edit distance tolerance (Levenshtein <= 1 for words of 3+ letters)
 * - Strictly rejects mismatched words so user is not advanced prematurely
 */
export function isTajweedSpeechMatch(
  targetWord: WordToken,
  spokenToken: string,
  nextWord?: WordToken
): boolean {
  if (!targetWord || !spokenToken) return false;

  const targetClean = targetWord.cleanText.replace(/\s+/g, '');
  const rawTargetClean = targetWord.cleanText;
  const spokenClean = normalizeArabic(spokenToken).replace(/\s+/g, '');

  if (!targetClean || !spokenClean) return false;

  // 1. Direct exact match of normalized Arabic
  if (targetClean === spokenClean || rawTargetClean === spokenToken) return true;

  // 1b. Space-separated Uthmani normalized tokens (e.g. "يا ايها" vs "ايها" or "يايها")
  if (rawTargetClean.includes(' ')) {
    const parts = rawTargetClean.split(' ');
    if (parts.some((p) => p === spokenClean)) return true;
  }

  // 2. Attached conversational or Quranic prefixes (و، ف، ل، ب، ك، ال، وال، فال، بال)
  const prefixes = ['و', 'ف', 'ب', 'ل', 'ك', 'ال', 'وال', 'فال', 'بال', 'ول', 'فل'];
  for (const p of prefixes) {
    if (spokenClean === p + targetClean) return true;
    if (targetClean === p + spokenClean) return true;
  }

  // 3. Definite article variations (ال / ل)
  if (targetClean.startsWith('ال') && spokenClean === targetClean.substring(2)) {
    return true;
  }
  if (spokenClean.startsWith('ال') && targetClean === spokenClean.substring(2)) {
    return true;
  }

  // 4. Word ending variations:
  // - Plural Alif after Waw (آمنوا -> امنو / عملوا -> عملو)
  if (targetClean.endsWith('وا') && spokenClean === targetClean.slice(0, -1)) return true;
  if (spokenClean.endsWith('وا') && targetClean === spokenClean.slice(0, -1)) return true;
  // - Tanween vs Noon at end (e.g. كتاباً -> كتابا / كتابن / كتاب)
  if (spokenClean === targetClean + 'ن' || targetClean === spokenClean + 'ن') return true;
  if (spokenClean === targetClean + 'ا' || targetClean === spokenClean + 'ا') return true;
  // - Taa Marbuta (ه) vs Taa Maftuha (ت) in wasl (وصلاً)
  if (targetClean.endsWith('ه') && spokenClean === targetClean.slice(0, -1) + 'ت') return true;
  if (spokenClean.endsWith('ه') && targetClean === spokenClean.slice(0, -1) + 'ت') return true;
  // - Alif Maqsura (ي) vs Alif (ا) at end (e.g. على / علا, هدى / هدا)
  if (targetClean.endsWith('ي') && spokenClean === targetClean.slice(0, -1) + 'ا') return true;
  if (spokenClean.endsWith('ي') && targetClean === spokenClean.slice(0, -1) + 'ا') return true;

  // 5. Compound words (e.g. الحمدلله -> الحمد + لله, بسمالله -> بسم + الله)
  if (spokenClean.startsWith(targetClean) && nextWord) {
    const remainder = spokenClean.slice(targetClean.length);
    const nextNorm = nextWord.cleanText.replace(/\s+/g, '');
    if (remainder === nextNorm || remainder === normalizeArabic(nextWord.text).replace(/\s+/g, '')) {
      return true;
    }
  }

  // 6. Tajweed Idgham / Iqlab phonetic variants:
  if (targetClean === 'من' && nextWord) {
    const nextFirst = nextWord.cleanText.charAt(0);
    if (['ي', 'ن', 'م', 'و', 'ل', 'ر'].includes(nextFirst)) {
      if (['من', 'مي', 'مى', 'مو', 'مم', 'مل', 'مر'].includes(spokenClean)) {
        return true;
      }
    }
    if (nextFirst === 'ب') {
      if (['مم', 'من'].includes(spokenClean)) return true;
    }
  }

  // 7. Quranic spellings & orthography variants (Hafs + Warsh + Qalun)
  const orthographyVariants: Record<string, string[]> = {
    بسم: ['باسم', 'بسم'],
    باسم: ['بسم', 'باسم'],
    صلاه: ['صلوه', 'صلاه', 'الصلاه'],
    زكاه: ['زكوه', 'زكاه', 'الزكاه'],
    حياه: ['حيوه', 'حياه', 'الحياه'],
    ربا: ['ربوا', 'ربا', 'الربا'],
    السموات: ['السماوات', 'السموات', 'سموات', 'سماوات'],
    سماوات: ['سموات', 'سماوات', 'السموات', 'السماوات'],
    العالمين: ['العلمين', 'العالمين'],
    ملك: ['مالك', 'ملك'],
    مالك: ['ملك', 'مالك'],
    صرط: ['صراط', 'صرط'],
    صراط: ['صرط', 'صراط'],
    الضالين: ['الضاالين', 'الضالين', 'ضالين'],
    طاها: ['طه', 'طاها'],
    طه: ['طاها', 'طه'],
    ياسين: ['يس', 'ياسين'],
    يس: ['ياسين', 'يس'],
    كهيعص: ['كاف', 'كهيعص'],
    الم: ['الف', 'الم'],
    يايها: ['ياايها', 'ايها', 'يايها'],
    ياايها: ['يايها', 'ايها', 'ياايها'],
  };

  if (orthographyVariants[targetClean]?.includes(spokenClean)) return true;
  if (orthographyVariants[spokenClean]?.includes(targetClean)) return true;

  // 8. True Levenshtein distance check with smart length scaling
  if (targetClean.length >= 3 && spokenClean.length >= 3) {
    const maxLen = Math.max(targetClean.length, spokenClean.length);
    const maxDist = maxLen >= 7 ? 2 : 1;
    if (Math.abs(targetClean.length - spokenClean.length) <= maxDist) {
      const dist = levenshteinDistance(targetClean, spokenClean);
      if (dist <= maxDist) return true;
    }
  }

  return false;
}
