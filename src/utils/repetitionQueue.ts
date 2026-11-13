import { QueueItem } from '../types/quran';

export interface RepetitionQueueOptions {
  fromAyah: number;
  toAyah: number;
  singleAyahRepeats: number;
  linkRepeats: number;
  finalReviewRepeats: number;
}

/**
 * Builds the cumulative linking repetition queue according to the classical
 * memorization technique (طريقة الربط التراكمي الشنقيطية / التكرار المنهجي):
 *
 * 1. Read first Ayah N times.
 * 2. Read second Ayah N times.
 * 3. Link Ayahs (1 to 2) together M times (without repeating each individual ayah).
 * 4. Read third Ayah N times.
 * 5. Link Ayahs (1 to 3) together M times.
 * ...
 * N. Final review of the entire passage K times.
 */
export function buildRepetitionQueue(options: RepetitionQueueOptions): QueueItem[] {
  const {
    fromAyah,
    toAyah,
    singleAyahRepeats = 3,
    linkRepeats = 3,
    finalReviewRepeats = 3,
  } = options;

  const queue: QueueItem[] = [];
  const start = Math.min(fromAyah, toAyah);
  const end = Math.max(fromAyah, toAyah);
  let globalStepCounter = 0;

  // Edge case: single ayah selected
  if (start === end) {
    for (let c = 1; c <= singleAyahRepeats; c++) {
      queue.push({
        id: `single_${start}_c${c}_${globalStepCounter++}`,
        type: 'single_ayah',
        ayahNumberInSurah: start,
        currentCycle: c,
        totalCycles: singleAyahRepeats,
        stepDescription: `حفظ الآية ${start} · تكرار ${c} من ${singleAyahRepeats}`,
        targetRange: [start, start],
        allAyahsInGroup: [start],
        positionInGroup: 0,
      });
    }

    if (finalReviewRepeats > 0) {
      for (let c = 1; c <= finalReviewRepeats; c++) {
        queue.push({
          id: `final_${start}_c${c}_${globalStepCounter++}`,
          type: 'final_review',
          ayahNumberInSurah: start,
          currentCycle: c,
          totalCycles: finalReviewRepeats,
          stepDescription: `مراجعة نهائية للآية ${start} · جولة ${c} من ${finalReviewRepeats}`,
          targetRange: [start, start],
          allAyahsInGroup: [start],
          positionInGroup: 0,
        });
      }
    }

    return queue;
  }

  // Iterate from start to end ayah
  for (let currentAyah = start; currentAyah <= end; currentAyah++) {
    // 1. Repeat current Ayah N times
    if (singleAyahRepeats > 0) {
      for (let c = 1; c <= singleAyahRepeats; c++) {
        queue.push({
          id: `single_${currentAyah}_c${c}_${globalStepCounter++}`,
          type: 'single_ayah',
          ayahNumberInSurah: currentAyah,
          currentCycle: c,
          totalCycles: singleAyahRepeats,
          stepDescription: `حفظ الآية ${currentAyah} · تكرار ${c} من ${singleAyahRepeats}`,
          targetRange: [currentAyah, currentAyah],
          allAyahsInGroup: [currentAyah],
          positionInGroup: 0,
        });
      }
    }

    // 2. If we are at Ayah >= start + 1, do cumulative linking from start up to currentAyah
    if (currentAyah > start && linkRepeats > 0) {
      const linkRange: number[] = [];
      for (let a = start; a <= currentAyah; a++) {
        linkRange.push(a);
      }

      for (let c = 1; c <= linkRepeats; c++) {
        for (let pos = 0; pos < linkRange.length; pos++) {
          const ayah = linkRange[pos];
          queue.push({
            id: `link_${start}_to_${currentAyah}_c${c}_a${ayah}_${globalStepCounter++}`,
            type: 'cumulative_link',
            ayahNumberInSurah: ayah,
            currentCycle: c,
            totalCycles: linkRepeats,
            stepDescription: `ربط تراكمي [الآيات ${start} إلى ${currentAyah}] · جولة ${c} من ${linkRepeats}`,
            targetRange: [start, currentAyah],
            allAyahsInGroup: linkRange,
            positionInGroup: pos,
          });
        }
      }
    }
  }

  // 3. Final review of the entire passage
  if (finalReviewRepeats > 0) {
    const fullRange: number[] = [];
    for (let a = start; a <= end; a++) {
      fullRange.push(a);
    }

    for (let c = 1; c <= finalReviewRepeats; c++) {
      for (let pos = 0; pos < fullRange.length; pos++) {
        const ayah = fullRange[pos];
        queue.push({
          id: `final_${start}_to_${end}_c${c}_a${ayah}_${globalStepCounter++}`,
          type: 'final_review',
          ayahNumberInSurah: ayah,
          currentCycle: c,
          totalCycles: finalReviewRepeats,
          stepDescription: `مراجعة كامل المقدار [الآيات ${start} إلى ${end}] · جولة ${c} من ${finalReviewRepeats}`,
          targetRange: [start, end],
          allAyahsInGroup: fullRange,
          positionInGroup: pos,
        });
      }
    }
  }

  return queue;
}
