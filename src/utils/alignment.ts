import { WordToken } from '../types/quran';
import { normalizeArabic } from './arabic';
import { isTajweedSpeechMatch } from './tajweed';

export interface AlignmentResult {
  newPointer: number;
  matchedIds: string[];
}

/**
 * Aligns one or more SpeechRecognition transcript alternatives with the expected
 * Quranic WordToken stream starting from `startPointer`.
 *
 * Designed for:
 * - Zero error alerts (never flags mistakes)
 * - Instant word-by-word reveal as the reciter speaks
 * - Compound & split token handling (e.g. "الحمدلله" <-> "الحمد لله", "يا ايها" <-> "يأيها")
 * - Anti-stall recovery if the browser STT drops a single short word mid-recitation
 */
export function alignSpokenTranscript(
  allWords: WordToken[],
  startPointer: number,
  alternatives: string[]
): AlignmentResult {
  if (
    allWords.length === 0 ||
    startPointer >= allWords.length ||
    alternatives.length === 0
  ) {
    return { newPointer: startPointer, matchedIds: [] };
  }

  let bestPointer = startPointer;
  let bestMatchedIds: string[] = [];

  for (const rawText of alternatives) {
    if (!rawText) continue;
    const normSpoken = normalizeArabic(rawText);
    const spokenTokens = normSpoken.split(/\s+/).filter(Boolean);
    if (spokenTokens.length === 0) continue;

    // 1. Primary pass: find anchor matching exact current expected word `startPointer`
    const primary = runGreedyMatchFrom(allWords, startPointer, spokenTokens);
    if (primary.newPointer > bestPointer) {
      bestPointer = primary.newPointer;
      bestMatchedIds = primary.matchedIds;
    }

    // 2. Anti-stall recovery: if exact `startPointer` wasn't matched at all,
    // check if STT dropped 1 word and clearly matched `startPointer + 1` (or +2 with a 2-word run)
    if (primary.newPointer === startPointer && startPointer + 1 < allWords.length) {
      for (const skipOffset of [1, 2]) {
        const candidateStart = startPointer + skipOffset;
        if (candidateStart >= allWords.length) break;

        const recovery = runGreedyMatchFrom(allWords, candidateStart, spokenTokens);
        const advancedWords = recovery.newPointer - candidateStart;

        // Require at least 2 consecutive matched words OR (skipOffset === 1 and exact long-word match >= 4 chars)
        const firstRecoveryWord = allWords[candidateStart];
        const isStrongSingleMatch =
          skipOffset === 1 &&
          advancedWords >= 1 &&
          firstRecoveryWord.cleanText.replace(/\s+/g, '').length >= 4 &&
          spokenTokens.some(
            (tok) =>
              tok === firstRecoveryWord.cleanText.replace(/\s+/g, '') &&
              !(startPointer > 0 && isTajweedSpeechMatch(allWords[startPointer - 1], tok))
          );

        if (advancedWords >= 2 || isStrongSingleMatch) {
          // Reveal the skipped word(s) + matched run so display stays continuous
          const allIds: string[] = [];
          for (let k = startPointer; k < recovery.newPointer; k++) {
            allIds.push(allWords[k].id);
          }
          if (recovery.newPointer > bestPointer) {
            bestPointer = recovery.newPointer;
            bestMatchedIds = allIds;
          }
          break;
        }
      }
    }
  }

  return {
    newPointer: bestPointer,
    matchedIds: bestMatchedIds,
  };
}

function runGreedyMatchFrom(
  allWords: WordToken[],
  targetStart: number,
  spokenTokens: string[]
): AlignmentResult {
  let matchTokenIdx = -1;
  let initialMergeUsed = false;

  const firstTarget = allWords[targetStart];
  const secondTarget =
    targetStart + 1 < allWords.length ? allWords[targetStart + 1] : undefined;

  for (let i = 0; i < spokenTokens.length; i++) {
    if (isTajweedSpeechMatch(firstTarget, spokenTokens[i], secondTarget)) {
      matchTokenIdx = i;
      initialMergeUsed = false;
      break;
    }
    // Check 2 spoken tokens merged into 1 Quran word (e.g. "يا" + "أيها" -> "يأيها")
    if (
      i + 1 < spokenTokens.length &&
      isTajweedSpeechMatch(
        firstTarget,
        spokenTokens[i] + spokenTokens[i + 1],
        secondTarget
      )
    ) {
      matchTokenIdx = i;
      initialMergeUsed = true;
      break;
    }
  }

  if (matchTokenIdx === -1) {
    return { newPointer: targetStart, matchedIds: [] };
  }

  let p = targetStart;
  let t = matchTokenIdx;
  const matchedIds: string[] = [];
  let forceMergedFirst = initialMergeUsed;

  while (p < allWords.length && t < spokenTokens.length) {
    const target = allWords[p];
    const nextTarget = p + 1 < allWords.length ? allWords[p + 1] : undefined;
    const token = spokenTokens[t];

    // Case A: 2 spoken tokens combined match 1 Quran word
    if (
      (forceMergedFirst || !isTajweedSpeechMatch(target, token, nextTarget)) &&
      t + 1 < spokenTokens.length &&
      isTajweedSpeechMatch(target, token + spokenTokens[t + 1], nextTarget)
    ) {
      forceMergedFirst = false;
      matchedIds.push(target.id);
      p++;
      t += 2;
      continue;
    }
    forceMergedFirst = false;

    // Case B: Standard 1-to-1 or compound token match
    if (isTajweedSpeechMatch(target, token, nextTarget)) {
      matchedIds.push(target.id);

      // Check if spoken token concatenated `target` + `nextTarget` (e.g. "الحمدلله")
      const targetNoSpace = target.cleanText.replace(/\s+/g, '');
      if (nextTarget && token.startsWith(targetNoSpace)) {
        const rem = token.slice(targetNoSpace.length);
        const nextNoSpace = nextTarget.cleanText.replace(/\s+/g, '');
        if (
          rem === nextNoSpace ||
          rem === normalizeArabic(nextTarget.text).replace(/\s+/g, '')
        ) {
          matchedIds.push(nextTarget.id);
          p++;
        }
      }

      p++;
      t++;
      continue;
    }

    // Case C: Mid-phrase anti-stall recovery if STT dropped 1 Quran word (p)
    // Require at least 2 remaining spoken tokens matching p+1 and p+2 to prevent false jumps
    if (
      p + 2 < allWords.length &&
      t + 1 < spokenTokens.length &&
      isTajweedSpeechMatch(allWords[p + 1], spokenTokens[t], allWords[p + 2]) &&
      isTajweedSpeechMatch(allWords[p + 2], spokenTokens[t + 1], allWords[p + 3])
    ) {
      matchedIds.push(allWords[p].id);
      matchedIds.push(allWords[p + 1].id);
      matchedIds.push(allWords[p + 2].id);
      p += 3;
      t += 2;
      continue;
    }

    break;
  }

  return {
    newPointer: p,
    matchedIds,
  };
}
