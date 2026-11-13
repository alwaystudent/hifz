import React from 'react';
import { Reciter, RepetitionSettings } from '../types/quran';
import { RECITERS } from '../data/quranData';
import { Sliders, UserCheck, Clock, Gauge } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: RepetitionSettings;
  onUpdateSettings: (newSettings: RepetitionSettings) => void;
  selectedReciter: Reciter;
  onSelectReciter: (reciter: Reciter) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  selectedReciter,
  onSelectReciter,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-lg rounded-2xl bg-[#F9F6EE] dark:bg-[#162015] border border-[#DDD3BF] dark:border-[#2A3728] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#DDD3BF] dark:border-[#2A3728] px-5 py-4 bg-[#EDE5D5] dark:bg-[#1D271B]">
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-[#52674B] dark:text-[#C5D8C1]" />
            <div>
              <h2 className="text-base font-bold text-[#2B3527] dark:text-[#F1F6F0]">
                إعدادات التكرار والقارئ
              </h2>
              <p className="text-xs text-[#6F7D6C] dark:text-[#9FB19B]">
                تخصيص تكرارات الآيات والربط وسرعة التلاوة
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
        <div className="p-5 space-y-4 overflow-y-auto text-sm">
          {/* Reciter selection */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-[#2B3527] dark:text-[#F1F6F0] mb-2">
              <UserCheck className="h-4 w-4 text-[#52674B] dark:text-[#C5D8C1]" />
              القارئ المعتمد (المرحلة الأولى)
            </label>
            <div className="space-y-1.5">
              {RECITERS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onSelectReciter(r)}
                  className={`w-full text-right p-2.5 rounded-xl border transition-all flex items-start justify-between ${
                    selectedReciter.id === r.id
                      ? 'border-[#52674B] bg-[#52674B]/15 text-[#2B3527] dark:text-[#F1F6F0]'
                      : 'border-[#D5CABB] dark:border-[#2F3F2D] bg-[#FDFCF9] dark:bg-[#111710] text-[#556450] dark:text-[#B7C7B2] hover:bg-[#ECE4D4] dark:hover:bg-[#202B1E]'
                  }`}
                >
                  <div>
                    <div className="font-bold flex items-center gap-2">
                      <span>{r.name}</span>
                      <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-[#E5DCCB] dark:bg-[#253223] text-[#3D4D38] dark:text-[#C5D8C1]">
                        {r.edition}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6F7D6C] dark:text-[#9FB19B] mt-0.5">
                      {r.description}
                    </p>
                  </div>
                  {selectedReciter.id === r.id && (
                    <span className="text-[#52674B] dark:text-[#C5D8C1] text-xs font-bold">
                      ✓ معتمد
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Repetition numbers */}
          <div className="space-y-2.5 pt-2 border-t border-[#DDD3BF] dark:border-[#2A3728]">
            <h3 className="text-xs font-bold text-[#2B3527] dark:text-[#F1F6F0] flex items-center gap-1.5">
              <Sliders className="h-4 w-4 text-[#52674B]" />
              أعداد التكرار المنهجي التراكمي
            </h3>

            {/* Single Ayah repeats */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FDFCF9] dark:bg-[#111710] border border-[#D5CABB] dark:border-[#2F3F2D]">
              <div>
                <span className="font-semibold block text-xs text-[#2B3527] dark:text-[#F1F6F0]">
                  تكرار الآية الواحدة منفردة
                </span>
                <span className="text-[11px] text-[#6F7D6C] dark:text-[#9FB19B]">
                  يقوم الشيخ بقراءة الآية وتكرارها أولاً
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      ...settings,
                      singleAyahRepeats: Math.max(1, settings.singleAyahRepeats - 1),
                    })
                  }
                  className="w-7 h-7 rounded-lg bg-[#ECE4D4] dark:bg-[#202B1E] font-bold text-[#3D4D38] dark:text-[#C5D8C1]"
                >
                  -
                </button>
                <span className="w-7 text-center font-bold text-sm tabular-nums text-[#2B3527] dark:text-[#F1F6F0]">
                  {settings.singleAyahRepeats}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      ...settings,
                      singleAyahRepeats: Math.min(20, settings.singleAyahRepeats + 1),
                    })
                  }
                  className="w-7 h-7 rounded-lg bg-[#ECE4D4] dark:bg-[#202B1E] font-bold text-[#3D4D38] dark:text-[#C5D8C1]"
                >
                  +
                </button>
              </div>
            </div>

            {/* Cumulative Link repeats */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FDFCF9] dark:bg-[#111710] border border-[#D5CABB] dark:border-[#2F3F2D]">
              <div>
                <span className="font-semibold block text-xs text-[#2B3527] dark:text-[#F1F6F0]">
                  تكرار الربط التراكمي للآيات السابقة
                </span>
                <span className="text-[11px] text-[#6F7D6C] dark:text-[#9FB19B]">
                  يعيد الآيات المتتالية معاً دون تكرار كل آية
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      ...settings,
                      linkRepeats: Math.max(1, settings.linkRepeats - 1),
                    })
                  }
                  className="w-7 h-7 rounded-lg bg-[#ECE4D4] dark:bg-[#202B1E] font-bold text-[#3D4D38] dark:text-[#C5D8C1]"
                >
                  -
                </button>
                <span className="w-7 text-center font-bold text-sm tabular-nums text-[#2B3527] dark:text-[#F1F6F0]">
                  {settings.linkRepeats}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      ...settings,
                      linkRepeats: Math.min(15, settings.linkRepeats + 1),
                    })
                  }
                  className="w-7 h-7 rounded-lg bg-[#ECE4D4] dark:bg-[#202B1E] font-bold text-[#3D4D38] dark:text-[#C5D8C1]"
                >
                  +
                </button>
              </div>
            </div>

            {/* Final Review repeats */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FDFCF9] dark:bg-[#111710] border border-[#D5CABB] dark:border-[#2F3F2D]">
              <div>
                <span className="font-semibold block text-xs text-[#2B3527] dark:text-[#F1F6F0]">
                  تكرار مراجعة كامل المقدار
                </span>
                <span className="text-[11px] text-[#6F7D6C] dark:text-[#9FB19B]">
                  جولات التكرار الختامية بعد إتمام جميع الآيات
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      ...settings,
                      finalReviewRepeats: Math.max(0, settings.finalReviewRepeats - 1),
                    })
                  }
                  className="w-7 h-7 rounded-lg bg-[#ECE4D4] dark:bg-[#202B1E] font-bold text-[#3D4D38] dark:text-[#C5D8C1]"
                >
                  -
                </button>
                <span className="w-7 text-center font-bold text-sm tabular-nums text-[#2B3527] dark:text-[#F1F6F0]">
                  {settings.finalReviewRepeats}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      ...settings,
                      finalReviewRepeats: Math.min(15, settings.finalReviewRepeats + 1),
                    })
                  }
                  className="w-7 h-7 rounded-lg bg-[#ECE4D4] dark:bg-[#202B1E] font-bold text-[#3D4D38] dark:text-[#C5D8C1]"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Speed & Pause */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#DDD3BF] dark:border-[#2A3728]">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#485643] dark:text-[#B7C7B2] mb-1.5">
                <Gauge className="h-4 w-4 text-[#52674B]" />
                سرعة التلاوة
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { label: '0.8x هادئ', value: 0.8 },
                  { label: '1.0x عادي', value: 1.0 },
                  { label: '1.25x سريع', value: 1.25 },
                ].map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, playbackSpeed: s.value })}
                    className={`py-1.5 px-1.5 text-xs font-bold rounded-lg border transition-colors ${
                      settings.playbackSpeed === s.value
                        ? 'border-[#52674B] bg-[#52674B] text-white'
                        : 'border-[#D5CABB] dark:border-[#2F3F2D] bg-[#FDFCF9] dark:bg-[#111710] text-[#485643] dark:text-[#B7C7B2]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#485643] dark:text-[#B7C7B2] mb-1.5">
                <Clock className="h-4 w-4 text-[#52674B]" />
                فترة السكون بين التكرارات
              </label>
              <div className="grid grid-cols-4 gap-1">
                {[0, 1, 2, 3].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() =>
                      onUpdateSettings({ ...settings, pauseBetweenAyahsSec: sec })
                    }
                    className={`py-1.5 px-1 text-xs font-bold rounded-lg border transition-colors ${
                      settings.pauseBetweenAyahsSec === sec
                        ? 'border-[#52674B] bg-[#52674B] text-white'
                        : 'border-[#D5CABB] dark:border-[#2F3F2D] bg-[#FDFCF9] dark:bg-[#111710] text-[#485643] dark:text-[#B7C7B2]'
                    }`}
                  >
                    {sec === 0 ? 'بدون' : `${sec}ث`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-[#DDD3BF] dark:border-[#2A3728] bg-[#EDE5D5] dark:bg-[#1D271B]">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-[#52674B] text-white hover:bg-[#43553D] shadow-sm transition-all"
          >
            حفظ وإغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
