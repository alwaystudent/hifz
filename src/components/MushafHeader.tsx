import React from 'react';
import { AyahFontSize, AyahItem, RiwayahId, SurahMeta } from '../types/quran';
import { BASMALAH_HAFS, BASMALAH_WARSH } from '../data/quranData';
import { toArabicDigits } from '../utils/arabic';

interface MushafHeaderProps {
  surah: SurahMeta;
  ayahs: AyahItem[];
  riwayah?: RiwayahId;
  ayahFontSize?: AyahFontSize;
  onClickBasmalah?: () => void;
}

export const MushafHeader: React.FC<MushafHeaderProps> = ({
  surah,
  ayahs,
  riwayah = 'hafs',
  ayahFontSize = 'small',
  onClickBasmalah,
}) => {
  const firstPage = ayahs.find((a) => typeof a.pageNumber === 'number')?.pageNumber;
  const lastPage = [...ayahs].reverse().find((a) => typeof a.pageNumber === 'number')?.pageNumber;
  const juzNumber = ayahs.find((a) => typeof a.juzNumber === 'number')?.juzNumber;

  const pageLabel = firstPage
    ? lastPage && lastPage !== firstPage
      ? `صفحة ${toArabicDigits(firstPage)}–${toArabicDigits(lastPage)}`
      : `صفحة ${toArabicDigits(firstPage)}`
    : null;

  const showBasmalah = surah.number !== 9;
  const basmalahText = riwayah === 'warsh' || riwayah === 'qalun' ? BASMALAH_WARSH : BASMALAH_HAFS;

  const basmalahSizeClass =
    ayahFontSize === 'large'
      ? 'text-xl sm:text-2xl'
      : ayahFontSize === 'medium'
      ? 'text-lg sm:text-xl'
      : 'text-base sm:text-lg';

  return (
    <div className="mb-3 sm:mb-4 select-none" dir="rtl">
      {/* Medina Mushaf Surah Banner */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border border-[#D4C7AE] dark:border-[#2E3E2C] bg-[#EFE8D8]/85 dark:bg-[#1B251A]/90 shadow-2xs">
        <span className="text-[10px] sm:text-[11px] font-bold text-[#5C6A58] dark:text-[#9BB097] tabular-nums shrink-0">
          {juzNumber ? `الجزء ${toArabicDigits(juzNumber)}` : `آياتها ${toArabicDigits(surah.numberOfAyahs)}`}
        </span>

        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border border-[#D9CEB7] dark:border-[#344532] bg-[#FAF7F0] dark:bg-[#131B12]">
          <span className="text-[#738C6B] text-[10px]">۞</span>
          <span className="font-quran text-sm sm:text-base font-bold text-[#2B3527] dark:text-[#F1F6F0]">
            سُورَةُ {surah.name}
          </span>
          <span className="text-[#738C6B] text-[10px]">۞</span>
        </div>

        <span className="text-[10px] sm:text-[11px] font-bold text-[#5C6A58] dark:text-[#9BB097] tabular-nums shrink-0">
          {pageLabel ? `${pageLabel} · مجمع الملك فهد` : 'مجمع الملك فهد'}
        </span>
      </div>

      {/* Independent Centered Basmalah Above Ayahs */}
      {showBasmalah && (
        <div className="mt-2.5 sm:mt-3 flex justify-center">
          <div
            onClick={onClickBasmalah}
            role={onClickBasmalah ? 'button' : undefined}
            tabIndex={onClickBasmalah ? 0 : undefined}
            onKeyDown={
              onClickBasmalah
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onClickBasmalah();
                    }
                  }
                : undefined
            }
            className={`font-quran text-center text-[#2F3B2B] dark:text-[#E8F0E5] px-5 py-1 rounded-xl border border-[#E2D6C0]/80 dark:border-[#293827] bg-[#FBF9F4]/80 dark:bg-[#172116]/75 ${basmalahSizeClass} ${
              onClickBasmalah
                ? 'cursor-pointer hover:bg-[#EFE7D6] dark:hover:bg-[#1F2C1E] transition-colors'
                : ''
            }`}
            title={onClickBasmalah ? 'البسملة (انقر للاستماع)' : 'البسملة'}
          >
            {basmalahText}
          </div>
        </div>
      )}
    </div>
  );
};
