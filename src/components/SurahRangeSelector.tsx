import React, { useState, useEffect, useMemo } from 'react';
import { SurahMeta } from '../types/quran';
import { SURAHS_LIST } from '../data/quranData';
import { toArabicDigits } from '../utils/arabic';
import { Search, Compass, BookOpen } from 'lucide-react';

interface SurahRangeSelectorProps {
  currentSurah: SurahMeta;
  fromAyah: number;
  toAyah: number;
  onSelectRange: (surahNumber: number, from: number, to: number) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const SurahRangeSelector: React.FC<SurahRangeSelectorProps> = ({
  currentSurah,
  fromAyah,
  toAyah,
  onSelectRange,
  isOpen,
  onClose,
}) => {
  const [selectedSurahNumber, setSelectedSurahNumber] = useState(currentSurah.number);
  const [tempFrom, setTempFrom] = useState(fromAyah);
  const [tempTo, setTempTo] = useState(toAyah);
  const [searchQuery, setSearchQuery] = useState('');

  // Synchronize internal state whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setSelectedSurahNumber(currentSurah.number);
      setTempFrom(fromAyah);
      setTempTo(toAyah);
      setSearchQuery('');
    }
  }, [isOpen, currentSurah.number, fromAyah, toAyah]);

  const targetSurah = SURAHS_LIST.find((s) => s.number === selectedSurahNumber) || currentSurah;

  const fromAyahOptions = useMemo(
    () => Array.from({ length: targetSurah.numberOfAyahs }, (_, i) => i + 1),
    [targetSurah.numberOfAyahs]
  );

  const toAyahOptions = useMemo(
    () =>
      Array.from(
        { length: Math.max(1, targetSurah.numberOfAyahs - tempFrom + 1) },
        (_, i) => tempFrom + i
      ),
    [targetSurah.numberOfAyahs, tempFrom]
  );

  const filteredSurahs = SURAHS_LIST.filter(
    (s) =>
      s.name.includes(searchQuery.trim()) ||
      s.englishName.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      String(s.number).includes(searchQuery.trim())
  );

  const handleSurahChange = (num: number) => {
    setSelectedSurahNumber(num);
    const meta = SURAHS_LIST.find((s) => s.number === num);
    const maxAyahs = meta ? meta.numberOfAyahs : 6;
    setTempFrom(1);
    setTempTo(num === 1 ? maxAyahs : Math.min(maxAyahs, 5));
  };

  const handleApply = () => {
    const validFrom = Math.max(1, Math.min(tempFrom, targetSurah.numberOfAyahs));
    const validTo = Math.max(validFrom, Math.min(tempTo, targetSurah.numberOfAyahs));
    onSelectRange(selectedSurahNumber, validFrom, validTo);
    onClose();
  };

  const setPreset = (start: number, end: number) => {
    setTempFrom(start);
    setTempTo(Math.min(end, targetSurah.numberOfAyahs));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-xl rounded-2xl bg-[#F9F6EE] dark:bg-[#162015] border border-[#C7B99F] dark:border-[#344532] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#DDD3BF] dark:border-[#2A3728] px-5 py-3.5 bg-[#EDE5D5] dark:bg-[#1D271B]">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#52674B] dark:text-[#C5D8C1]" />
            <div>
              <h2 className="text-base font-bold text-[#2B3527] dark:text-[#F1F6F0]">
                السورة ونطاق الآيات
              </h2>
              <p className="text-xs text-[#6F7D6C] dark:text-[#9FB19B]">
                اختر السورة والآيات المراد سردها
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#6F7D6C] hover:text-[#2B3527] dark:text-[#9FB19B] text-lg px-2 py-1 rounded-md border border-transparent hover:border-[#C7B99F]"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Surah Search and Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#485643] dark:text-[#B7C7B2] mb-1.5">
              السورة الكريمة
            </label>
            <div className="relative mb-2">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-[#7F8C7C]" />
              <input
                type="text"
                placeholder="ابحث عن السورة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-9 py-2 text-sm rounded-xl border border-[#C7B99F] dark:border-[#344532] bg-[#FDFCF9] dark:bg-[#111710] text-[#2B3527] dark:text-[#F1F6F0] focus:outline-hidden focus:ring-2 focus:ring-[#738C6B]/30"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto p-1.5 border border-[#C7B99F] dark:border-[#344532] rounded-xl bg-[#F5EFE3]/50 dark:bg-[#111710]/50">
              {filteredSurahs.map((surah) => (
                <button
                  key={surah.number}
                  onClick={() => handleSurahChange(surah.number)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    selectedSurahNumber === surah.number
                      ? 'bg-[#52674B] text-white border-[#43553D] font-bold shadow-xs'
                      : 'border-transparent text-[#485643] dark:text-[#B7C7B2] hover:bg-[#ECE4D4] dark:hover:bg-[#202B1E] hover:border-[#D5CABB]'
                  }`}
                >
                  <span className="font-scheherazade text-sm">{surah.name}</span>
                  <span className={`text-[10px] tabular-nums ${selectedSurahNumber === surah.number ? 'text-[#E8F0E5]' : 'text-[#7F8C7C]'}`}>
                    {toArabicDigits(surah.numberOfAyahs)} آية
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Surah quick info */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#52674B]/10 dark:bg-[#52674B]/20 border border-[#52674B]/25 text-xs text-[#485643] dark:text-[#B7C7B2]">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-[#52674B] dark:text-[#C5D8C1]" />
              <span className="font-bold text-[#52674B] dark:text-[#C5D8C1]">
                سورة {targetSurah.name}
              </span>
              <span>·</span>
              <span>{targetSurah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}</span>
              <span>·</span>
              <span>{toArabicDigits(targetSurah.numberOfAyahs)} آية</span>
            </div>
            <span className="text-[#6F7D6C] dark:text-[#9FB19B]">
              رقم {toArabicDigits(targetSurah.number)}
            </span>
          </div>

          {/* Ayah Range Dropdowns */}
          <div>
            <label className="block text-xs font-semibold text-[#485643] dark:text-[#B7C7B2] mb-2">
              اختيار الآيات
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-xl border border-[#C7B99F] dark:border-[#344532] bg-[#FDFCF9] dark:bg-[#111710]">
                <label
                  htmlFor="from-ayah-select"
                  className="text-xs font-semibold text-[#6F7D6C] dark:text-[#9FB19B] block mb-1"
                >
                  من الآية
                </label>
                <select
                  id="from-ayah-select"
                  value={tempFrom}
                  onChange={(e) => {
                    const nextFrom = Number(e.target.value);
                    setTempFrom(nextFrom);
                    if (nextFrom > tempTo) setTempTo(nextFrom);
                  }}
                  className="w-full text-center text-sm font-bold py-2 px-2 rounded-lg border border-[#C7B99F] dark:border-[#344532] bg-white dark:bg-[#1C271A] text-[#2B3527] dark:text-[#F1F6F0] focus:outline-none focus:ring-2 focus:ring-[#52674B]/40 cursor-pointer"
                >
                  {fromAyahOptions.map((n) => (
                    <option key={n} value={n}>
                      الآية {toArabicDigits(n)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-2.5 rounded-xl border border-[#C7B99F] dark:border-[#344532] bg-[#FDFCF9] dark:bg-[#111710]">
                <label
                  htmlFor="to-ayah-select"
                  className="text-xs font-semibold text-[#6F7D6C] dark:text-[#9FB19B] block mb-1"
                >
                  إلى الآية
                </label>
                <select
                  id="to-ayah-select"
                  value={Math.max(tempFrom, Math.min(tempTo, targetSurah.numberOfAyahs))}
                  onChange={(e) => {
                    const nextTo = Number(e.target.value);
                    setTempTo(nextTo);
                  }}
                  className="w-full text-center text-sm font-bold py-2 px-2 rounded-lg border border-[#C7B99F] dark:border-[#344532] bg-white dark:bg-[#1C271A] text-[#2B3527] dark:text-[#F1F6F0] focus:outline-none focus:ring-2 focus:ring-[#52674B]/40 cursor-pointer"
                >
                  {toAyahOptions.map((n) => (
                    <option key={n} value={n}>
                      الآية {toArabicDigits(n)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Range quick presets */}
          <div>
            <span className="text-xs text-[#6F7D6C] dark:text-[#9FB19B] block mb-1.5 font-medium">
              مقدار سريع:
            </span>
            <div className="flex flex-wrap gap-1.5 p-1.5 rounded-xl border border-[#DDD3BF] dark:border-[#2C3B29] bg-[#F5EFE3]/60 dark:bg-[#121A11]">
              <button
                type="button"
                onClick={() => setPreset(1, 3)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#C7B99F] dark:border-[#344532] bg-[#FDFCF9] dark:bg-[#1A2419] hover:bg-[#ECE4D4] dark:hover:bg-[#202B1E] text-[#485643] dark:text-[#B7C7B2] transition-colors"
              >
                ١ - ٣
              </button>
              <button
                type="button"
                onClick={() => setPreset(1, 5)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#C7B99F] dark:border-[#344532] bg-[#FDFCF9] dark:bg-[#1A2419] hover:bg-[#ECE4D4] dark:hover:bg-[#202B1E] text-[#485643] dark:text-[#B7C7B2] transition-colors"
              >
                ١ - ٥
              </button>
              <button
                type="button"
                onClick={() => setPreset(1, 10)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#C7B99F] dark:border-[#344532] bg-[#FDFCF9] dark:bg-[#1A2419] hover:bg-[#ECE4D4] dark:hover:bg-[#202B1E] text-[#485643] dark:text-[#B7C7B2] transition-colors"
              >
                ١ - ١٠
              </button>
              <button
                type="button"
                onClick={() => setPreset(1, targetSurah.numberOfAyahs)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#52674B]/50 bg-[#52674B]/12 text-[#52674B] dark:text-[#C5D8C1] hover:bg-[#52674B]/20 transition-colors"
              >
                السورة كاملة ({toArabicDigits(targetSurah.numberOfAyahs)})
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#DDD3BF] dark:border-[#2A3728] bg-[#EDE5D5] dark:bg-[#1D271B]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-xl border border-[#C7B99F] dark:border-[#344532] text-[#6F7D6C] dark:text-[#9FB19B] hover:text-[#2B3527] transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleApply}
            className="px-5 py-2 text-xs font-bold rounded-xl border border-[#43553D] bg-[#52674B] text-white hover:bg-[#43553D] shadow-sm transition-all"
          >
            تأكيد
          </button>
        </div>
      </div>
    </div>
  );
};
