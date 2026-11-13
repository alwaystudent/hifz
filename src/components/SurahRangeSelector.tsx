import React, { useState, useEffect } from 'react';
import { SurahMeta } from '../types/quran';
import { SURAHS_LIST } from '../data/quranData';
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

  const filteredSurahs = SURAHS_LIST.filter(
    (s) =>
      s.name.includes(searchQuery.trim()) ||
      s.englishName.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      String(s.number).includes(searchQuery.trim())
  );

  const handleSurahChange = (num: number) => {
    setSelectedSurahNumber(num);
    const meta = SURAHS_LIST.find((s) => s.number === num);
    const maxAyahs = meta ? meta.numberOfAyahs : 7;
    setTempFrom(1);
    setTempTo(Math.min(maxAyahs, 5));
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
        className="w-full max-w-xl rounded-2xl bg-[#F9F6EE] dark:bg-[#162015] border border-[#DDD3BF] dark:border-[#2A3728] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#DDD3BF] dark:border-[#2A3728] px-5 py-4 bg-[#EDE5D5] dark:bg-[#1D271B]">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#52674B] dark:text-[#C5D8C1]" />
            <div>
              <h2 className="text-base font-bold text-[#2B3527] dark:text-[#F1F6F0]">
                تحديد السورة ونطاق الآيات
              </h2>
              <p className="text-xs text-[#6F7D6C] dark:text-[#9FB19B]">
                اختر المقدار القرآني المراد حفظه وتكراره
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#6F7D6C] hover:text-[#2B3527] dark:text-[#9FB19B] text-lg px-2 py-1 rounded-md"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Surah Search and Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#485643] dark:text-[#B7C7B2] mb-1.5">
              السورة الكريمة
            </label>
            <div className="relative mb-2">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-[#7F8C7C]" />
              <input
                type="text"
                placeholder="ابحث عن اسم السورة أو رقمها..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-9 py-2 text-sm rounded-xl border border-[#D5CABB] dark:border-[#2F3F2D] bg-[#FDFCF9] dark:bg-[#111710] text-[#2B3527] dark:text-[#F1F6F0] focus:outline-hidden focus:ring-2 focus:ring-[#738C6B]/30"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto p-1.5 border border-[#D5CABB] dark:border-[#2F3F2D] rounded-xl bg-[#F5EFE3]/50 dark:bg-[#111710]/50">
              {filteredSurahs.map((surah) => (
                <button
                  key={surah.number}
                  onClick={() => handleSurahChange(surah.number)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    selectedSurahNumber === surah.number
                      ? 'bg-[#52674B] text-white font-bold shadow-xs'
                      : 'text-[#485643] dark:text-[#B7C7B2] hover:bg-[#ECE4D4] dark:hover:bg-[#202B1E]'
                  }`}
                >
                  <span className="font-scheherazade text-sm">{surah.name}</span>
                  <span className={`text-[10px] tabular-nums ${selectedSurahNumber === surah.number ? 'text-[#E8F0E5]' : 'text-[#7F8C7C]'}`}>
                    {surah.numberOfAyahs} آية
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Surah quick info */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#52674B]/10 dark:bg-[#52674B]/20 border border-[#52674B]/20 text-xs text-[#485643] dark:text-[#B7C7B2]">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-[#52674B] dark:text-[#C5D8C1]" />
              <span className="font-bold text-[#52674B] dark:text-[#C5D8C1]">
                سورة {targetSurah.name}
              </span>
              <span>·</span>
              <span>{targetSurah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}</span>
              <span>·</span>
              <span>إجمالي الآيات: {targetSurah.numberOfAyahs}</span>
            </div>
            <span className="text-[#6F7D6C] dark:text-[#9FB19B]">رقم {targetSurah.number}</span>
          </div>

          {/* Manual Ayah Range: From & To */}
          <div>
            <label className="block text-xs font-semibold text-[#485643] dark:text-[#B7C7B2] mb-2">
              تحديد نطاق الآيات يدوياً
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-xl border border-[#D5CABB] dark:border-[#2F3F2D] bg-[#FDFCF9] dark:bg-[#111710]">
                <span className="text-xs text-[#6F7D6C] dark:text-[#9FB19B] block mb-1">
                  من الآية رقم
                </span>
                <input
                  type="number"
                  min={1}
                  max={targetSurah.numberOfAyahs}
                  value={tempFrom}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    if (isNaN(parsed)) {
                      setTempFrom(1);
                    } else {
                      const clamped = Math.max(1, Math.min(parsed, targetSurah.numberOfAyahs));
                      setTempFrom(clamped);
                      if (clamped > tempTo) setTempTo(clamped);
                    }
                  }}
                  className="w-full text-center text-lg font-bold font-mono py-1 rounded-lg border border-[#D5CABB] dark:border-[#2F3F2D] bg-white dark:bg-[#1C271A] text-[#2B3527] dark:text-[#F1F6F0]"
                />
              </div>

              <div className="p-3 rounded-xl border border-[#D5CABB] dark:border-[#2F3F2D] bg-[#FDFCF9] dark:bg-[#111710]">
                <span className="text-xs text-[#6F7D6C] dark:text-[#9FB19B] block mb-1">
                  إلى الآية رقم
                </span>
                <input
                  type="number"
                  min={tempFrom}
                  max={targetSurah.numberOfAyahs}
                  value={tempTo}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    if (isNaN(parsed)) {
                      setTempTo(tempFrom);
                    } else {
                      const clamped = Math.max(1, Math.min(parsed, targetSurah.numberOfAyahs));
                      setTempTo(clamped);
                    }
                  }}
                  className="w-full text-center text-lg font-bold font-mono py-1 rounded-lg border border-[#D5CABB] dark:border-[#2F3F2D] bg-white dark:bg-[#1C271A] text-[#2B3527] dark:text-[#F1F6F0]"
                />
              </div>
            </div>
          </div>

          {/* Range quick presets */}
          <div>
            <span className="text-xs text-[#6F7D6C] dark:text-[#9FB19B] block mb-1.5 font-medium">
              خيارات سريعة للمقدار:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setPreset(1, 3)}
                className="px-3 py-1.5 text-xs rounded-xl border border-[#D5CABB] dark:border-[#2F3F2D] hover:bg-[#ECE4D4] dark:hover:bg-[#202B1E] text-[#485643] dark:text-[#B7C7B2] transition-colors"
              >
                الآيات ١ - ٣
              </button>
              <button
                type="button"
                onClick={() => setPreset(1, 5)}
                className="px-3 py-1.5 text-xs rounded-xl border border-[#D5CABB] dark:border-[#2F3F2D] hover:bg-[#ECE4D4] dark:hover:bg-[#202B1E] text-[#485643] dark:text-[#B7C7B2] transition-colors"
              >
                الآيات ١ - ٥
              </button>
              <button
                type="button"
                onClick={() => setPreset(1, 10)}
                className="px-3 py-1.5 text-xs rounded-xl border border-[#D5CABB] dark:border-[#2F3F2D] hover:bg-[#ECE4D4] dark:hover:bg-[#202B1E] text-[#485643] dark:text-[#B7C7B2] transition-colors"
              >
                الآيات ١ - ١٠
              </button>
              <button
                type="button"
                onClick={() => setPreset(1, targetSurah.numberOfAyahs)}
                className="px-3 py-1.5 text-xs rounded-xl border border-[#52674B]/40 bg-[#52674B]/10 text-[#52674B] dark:text-[#C5D8C1] hover:bg-[#52674B]/20 transition-colors"
              >
                السورة كاملة ({targetSurah.numberOfAyahs} آيات)
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-[#DDD3BF] dark:border-[#2A3728] bg-[#EDE5D5] dark:bg-[#1D271B]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-[#6F7D6C] dark:text-[#9FB19B] hover:text-[#2B3527] transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleApply}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-[#52674B] text-white hover:bg-[#43553D] shadow-sm transition-all"
          >
            تأكيد وبدء التكرار
          </button>
        </div>
      </div>
    </div>
  );
};
