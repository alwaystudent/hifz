import React from 'react';
import { StageType, StageProgressState } from '../types/quran';
import {
  Volume2,
  Mic,
  EyeOff,
  BookOpen,
  Moon,
  Sun,
  Settings,
  Compass,
  FileText,
  Lock,
  CheckCircle2,
} from 'lucide-react';

interface HeaderProps {
  currentStage: StageType;
  onSelectStage: (stage: StageType) => void;
  completedStages: StageProgressState;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenSettings: () => void;
  onOpenRangeSelector: () => void;
  onOpenReports: () => void;
  dueReportsCount: number;
  surahName: string;
  fromAyah: number;
  toAyah: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentStage,
  onSelectStage,
  completedStages,
  isDarkMode,
  onToggleDarkMode,
  onOpenSettings,
  onOpenRangeSelector,
  onOpenReports,
  dueReportsCount,
  surahName,
  fromAyah,
  toAyah,
}) => {
  // Check locking conditions: Stage 2 locked until Stage 1 completed; Stage 3 locked until Stage 2 completed
  const isStage2Locked = !completedStages.stage1;
  const isStage3Locked = !completedStages.stage2;

  return (
    <header className="sticky top-0 z-40 w-full max-w-full border-b border-[#DDD4C1] bg-[#F9F6EE]/95 dark:border-[#2A3728] dark:bg-[#141A13]/95 backdrop-blur-md transition-colors">
      {/* Row 1: Brand & Utilities */}
      <div className="w-full max-w-full flex h-14 items-center justify-between px-3 sm:px-6 md:px-10 border-b border-[#DDD4C1]/50 dark:border-[#2A3728]/50">
        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#52674B]/10 text-[#52674B] dark:bg-[#738C6B]/20 dark:text-[#C5D8C1]">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-scheherazade text-xl font-bold tracking-tight text-[#2B3527] dark:text-[#F1F6F0]">
              رتّـــل
            </span>
            <span className="text-[11px] text-[#717E6E] dark:text-[#94A591] font-medium hidden sm:inline">
              منصة حفظ القرآن بالتكرار المنهجي
            </span>
          </div>
        </div>

        {/* Right utility buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Reports Button */}
          <button
            onClick={onOpenReports}
            className="relative flex items-center gap-1.5 text-xs font-semibold text-[#3D4D38] dark:text-[#C5D8C1] bg-[#ECE5D5]/80 dark:bg-[#1F2A1E] hover:bg-[#E2D8C3] dark:hover:bg-[#283726] px-3 py-1.5 rounded-xl border border-[#DDD3BF] dark:border-[#2C3B29] transition-colors"
            title="سجل التقارير وجدول الاختبارات المجدولة"
          >
            <FileText className="h-3.5 w-3.5 text-[#52674B] dark:text-[#A4BA9E]" />
            <span className="hidden sm:inline">سجل التقارير</span>
            {dueReportsCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#8C524B] text-[10px] font-bold text-white animate-pulse">
                {dueReportsCount}
              </span>
            )}
          </button>

          {/* Surah & Ayah Range Selector */}
          <button
            onClick={onOpenRangeSelector}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#3D4D38] dark:text-[#C5D8C1] bg-[#ECE5D5]/80 dark:bg-[#1F2A1E] hover:bg-[#E2D8C3] dark:hover:bg-[#283726] px-3 py-1.5 rounded-xl border border-[#DDD3BF] dark:border-[#2C3B29] transition-colors"
            title="تحديد السورة ونطاق الآيات"
          >
            <Compass className="h-3.5 w-3.5 text-[#52674B] dark:text-[#A4BA9E]" />
            <span className="font-scheherazade text-sm">سورة {surahName}</span>
            <span className="text-[#8B9886] font-mono text-[11px]">({fromAyah} - {toAyah})</span>
          </button>

          {/* Settings Modal Toggle */}
          <button
            onClick={onOpenSettings}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#DDD3BF] dark:border-[#2C3B29] bg-[#F9F6EE] dark:bg-[#1A2319] text-[#485643] dark:text-[#B7C7B2] hover:bg-[#ECE5D5] dark:hover:bg-[#253223] transition-colors"
            title="إعدادات التكرار والقارئ"
            aria-label="إعدادات"
          >
            <Settings className="h-4 w-4" />
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#DDD3BF] dark:border-[#2C3B29] bg-[#F9F6EE] dark:bg-[#1A2319] text-[#485643] dark:text-[#B7C7B2] hover:bg-[#ECE5D5] dark:hover:bg-[#253223] transition-colors"
            title={isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
            aria-label="تبديل المظهر"
          >
            {isDarkMode ? <Sun className="h-4 w-4 text-[#E2B778]" /> : <Moon className="h-4 w-4 text-[#52674B]" />}
          </button>
        </div>
      </div>

      {/* Row 2: Sequential Stage Switcher Bar with Completion & Gating */}
      <div className="w-full max-w-full px-3 sm:px-6 md:px-10 py-2 bg-[#F5F1E6]/70 dark:bg-[#111710]/70">
        <nav className="w-full grid grid-cols-3 gap-1.5 sm:gap-2">
          {/* Stage 1 */}
          <button
            onClick={() => onSelectStage('stage1')}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              currentStage === 'stage1'
                ? 'bg-[#52674B] text-white shadow-xs dark:bg-[#688260]'
                : 'bg-[#ECE4D4]/70 dark:bg-[#1B2519]/70 text-[#485643] hover:text-[#2B3527] dark:text-[#B7C7B2] hover:bg-[#E2D8C3] dark:hover:bg-[#243322]'
            }`}
          >
            <Volume2 className="h-4 w-4 shrink-0" />
            <span className="truncate">المرحلة ١: مع الشيخ</span>
            {completedStages.stage1 && (
              <CheckCircle2 className="h-3.5 w-3.5 text-white/90 shrink-0" />
            )}
          </button>

          {/* Stage 2 */}
          <button
            onClick={() => {
              if (isStage2Locked) {
                alert('يرجى إكمال المرحلة الأولى (مع الشيخ) أولاً، أو استخدام زر "تخطي المرحلة" للانتقال السريع.');
                return;
              }
              onSelectStage('stage2');
            }}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              currentStage === 'stage2'
                ? 'bg-[#52674B] text-white shadow-xs dark:bg-[#688260]'
                : isStage2Locked
                ? 'opacity-60 bg-[#ECE4D4]/40 dark:bg-[#1B2519]/40 text-[#7F8C7C] cursor-not-allowed'
                : 'bg-[#ECE4D4]/70 dark:bg-[#1B2519]/70 text-[#485643] hover:text-[#2B3527] dark:text-[#B7C7B2] hover:bg-[#E2D8C3] dark:hover:bg-[#243322]'
            }`}
            title={isStage2Locked ? 'مغلقة: أكمل المرحلة الأولى أو اضغط زر التخطي' : ''}
          >
            {isStage2Locked ? (
              <Lock className="h-4 w-4 shrink-0 text-[#8C524B]" />
            ) : (
              <Mic className="h-4 w-4 shrink-0" />
            )}
            <span className="truncate">المرحلة ٢: إخفاء تدريجي</span>
            {completedStages.stage2 && (
              <CheckCircle2 className="h-3.5 w-3.5 text-white/90 shrink-0" />
            )}
          </button>

          {/* Stage 3 */}
          <button
            onClick={() => {
              if (isStage3Locked) {
                alert('يرجى إكمال المرحلة الثانية (الإخفاء التدريجي) أولاً، أو استخدام زر "تخطي المرحلة" للانتقال السريع.');
                return;
              }
              onSelectStage('stage3');
            }}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              currentStage === 'stage3'
                ? 'bg-[#52674B] text-white shadow-xs dark:bg-[#688260]'
                : isStage3Locked
                ? 'opacity-60 bg-[#ECE4D4]/40 dark:bg-[#1B2519]/40 text-[#7F8C7C] cursor-not-allowed'
                : 'bg-[#ECE4D4]/70 dark:bg-[#1B2519]/70 text-[#485643] hover:text-[#2B3527] dark:text-[#B7C7B2] hover:bg-[#E2D8C3] dark:hover:bg-[#243322]'
            }`}
            title={isStage3Locked ? 'مغلقة: أكمل المرحلة الثانية أو اضغط زر التخطي' : ''}
          >
            {isStage3Locked ? (
              <Lock className="h-4 w-4 shrink-0 text-[#8C524B]" />
            ) : (
              <EyeOff className="h-4 w-4 shrink-0" />
            )}
            <span className="truncate">المرحلة ٣: تسميع غيبي لحظي</span>
            {completedStages.stage3 && (
              <CheckCircle2 className="h-3.5 w-3.5 text-white/90 shrink-0" />
            )}
          </button>
        </nav>
      </div>
    </header>
  );
};
