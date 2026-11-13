import React from 'react';
import { RiwayahId, StageProgressState, StageType } from '../types/quran';
import { RIWAYAT_LIST } from '../data/quranData';
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
  Phone,
  UserCheck,
  UserPlus,
} from 'lucide-react';

interface HeaderProps {
  currentStage: StageType;
  onSelectStage: (stage: StageType) => void;
  completedStages: StageProgressState;
  riwayah: RiwayahId;
  onSelectRiwayah: (riwayah: RiwayahId) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenSettings: () => void;
  onOpenRangeSelector: () => void;
  onOpenReports: () => void;
  dueReportsCount: number;
  friendsCount?: number;
  memberDisplayName?: string | null;
  onOpenAuth: () => void;
  surahName: string;
  fromAyah: number;
  toAyah: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentStage,
  onSelectStage,
  completedStages,
  riwayah,
  onSelectRiwayah,
  isDarkMode,
  onToggleDarkMode,
  onOpenSettings,
  onOpenRangeSelector,
  onOpenReports,
  dueReportsCount,
  friendsCount = 0,
  memberDisplayName,
  onOpenAuth,
  surahName,
  fromAyah,
  toAyah,
}) => {
  const isStage2Locked = !completedStages.stage1;
  const isStage3Locked = !completedStages.stage2;

  return (
    <header className="shrink-0 z-40 w-full max-w-full border-b border-[#DDD4C1] bg-[#F9F6EE] dark:border-[#2A3728] dark:bg-[#141A13] transition-colors">
      {/* Row 1: Compact Brand, Riwayah Quick Switch & Utilities */}
      <div className="w-full max-w-full flex flex-wrap items-center justify-between gap-1.5 px-2 sm:px-4 py-1 border-b border-[#DDD4C1]/50 dark:border-[#2A3728]/50">
        {/* Brand */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#52674B]/10 text-[#52674B] dark:bg-[#738C6B]/20 dark:text-[#C5D8C1]">
            <BookOpen className="h-3.5 w-3.5" />
          </div>
          <span className="font-scheherazade text-lg font-bold leading-none text-[#2B3527] dark:text-[#F1F6F0]">
            رتّـــل
          </span>
        </div>

        {/* Utility controls */}
        <div className="flex items-center gap-1 flex-wrap justify-end">
          {/* Quick Riwayah Switcher */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[#ECE5D5] dark:bg-[#1F2A1E] border border-[#DDD3BF] dark:border-[#2C3B29]">
            {RIWAYAT_LIST.map((r) => (
              <button
                key={r.id}
                onClick={() => onSelectRiwayah(r.id)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors ${
                  riwayah === r.id
                    ? 'bg-[#52674B] text-white shadow-xs'
                    : 'text-[#485643] dark:text-[#B7C7B2] hover:text-[#2B3527]'
                }`}
                title={`تبديل الرواية إلى ${r.name}`}
              >
                {r.shortName}
              </button>
            ))}
          </div>

          {/* Reports Button */}
          <button
            onClick={onOpenReports}
            className="relative flex items-center gap-1 text-[11px] font-semibold text-[#3D4D38] dark:text-[#C5D8C1] bg-[#ECE5D5]/80 dark:bg-[#1F2A1E] hover:bg-[#E2D8C3] dark:hover:bg-[#283726] px-2 py-1 rounded-lg border border-[#DDD3BF] dark:border-[#2C3B29] transition-colors"
            title="سجل التقارير وجدول الاختبارات المجدولة"
          >
            <FileText className="h-3 w-3 text-[#52674B] dark:text-[#A4BA9E]" />
            <span className="hidden md:inline">التقارير</span>
            {dueReportsCount > 0 && (
              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#8C524B] text-[9px] font-bold text-white">
                {dueReportsCount}
              </span>
            )}
          </button>

          {/* Surah & Ayah Range Selector */}
          <button
            onClick={onOpenRangeSelector}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#3D4D38] dark:text-[#C5D8C1] bg-[#ECE5D5]/80 dark:bg-[#1F2A1E] hover:bg-[#E2D8C3] dark:hover:bg-[#283726] px-2 py-1 rounded-lg border border-[#DDD3BF] dark:border-[#2C3B29] transition-colors"
            title="تحديد السورة ونطاق الآيات"
          >
            <Compass className="h-3 w-3 text-[#52674B] dark:text-[#A4BA9E]" />
            <span className="font-scheherazade text-xs leading-none">سورة {surahName}</span>
            <span className="text-[#8B9886] font-mono text-[10px]">({fromAyah}-{toAyah})</span>
          </button>

          {/* Membership / Login Button */}
          <button
            onClick={onOpenAuth}
            className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg border transition-colors ${
              memberDisplayName
                ? 'bg-[#52674B]/12 dark:bg-[#688260]/25 text-[#2B3527] dark:text-[#F1F6F0] border-[#52674B]/30 dark:border-[#738C6B]/40 hover:bg-[#52674B]/20'
                : 'bg-[#52674B] text-white border-[#52674B] hover:bg-[#43553D]'
            }`}
            title={memberDisplayName ? 'حساب العضوية والأصدقاء' : 'تسجيل عضوية جديدة أو دخول'}
          >
            {memberDisplayName ? (
              <UserCheck className="h-3 w-3 text-[#52674B] dark:text-[#C5D8C1]" />
            ) : (
              <UserPlus className="h-3 w-3" />
            )}
            <span className="max-w-[90px] truncate">
              {memberDisplayName ? memberDisplayName : 'عضوية / دخول'}
            </span>
          </button>

          {/* Settings Modal Toggle */}
          <button
            onClick={onOpenSettings}
            className="flex h-6 w-6 items-center justify-center rounded-lg border border-[#DDD3BF] dark:border-[#2C3B29] bg-[#F9F6EE] dark:bg-[#1A2319] text-[#485643] dark:text-[#B7C7B2] hover:bg-[#ECE5D5] dark:hover:bg-[#253223] transition-colors"
            title="إعدادات الرواية والقارئ"
            aria-label="إعدادات"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="flex h-6 w-6 items-center justify-center rounded-lg border border-[#DDD3BF] dark:border-[#2C3B29] bg-[#F9F6EE] dark:bg-[#1A2319] text-[#485643] dark:text-[#B7C7B2] hover:bg-[#ECE5D5] dark:hover:bg-[#253223] transition-colors"
            title={isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
            aria-label="تبديل المظهر"
          >
            {isDarkMode ? <Sun className="h-3.5 w-3.5 text-[#E2B778]" /> : <Moon className="h-3.5 w-3.5 text-[#52674B]" />}
          </button>
        </div>
      </div>

      {/* Row 2: Compact 3 Learning Stages + Peer Voice Call Mode */}
      <div className="w-full max-w-full px-2 sm:px-4 py-1 bg-[#F5F1E6]/80 dark:bg-[#111710]/80">
        <nav className="w-full grid grid-cols-2 sm:grid-cols-4 gap-1">
          {/* Stage 1 */}
          <button
            onClick={() => onSelectStage('stage1')}
            className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
              currentStage === 'stage1'
                ? 'bg-[#52674B] text-white shadow-xs dark:bg-[#688260]'
                : 'bg-[#ECE4D4]/70 dark:bg-[#1B2519]/70 text-[#485643] hover:text-[#2B3527] dark:text-[#B7C7B2] hover:bg-[#E2D8C3]'
            }`}
          >
            <Volume2 className="h-3 w-3 shrink-0" />
            <span className="truncate">١. مع الشيخ</span>
            {completedStages.stage1 && <CheckCircle2 className="h-3 w-3 shrink-0 opacity-90" />}
          </button>

          {/* Stage 2 */}
          <button
            onClick={() => onSelectStage('stage2')}
            className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
              currentStage === 'stage2'
                ? 'bg-[#52674B] text-white shadow-xs dark:bg-[#688260]'
                : isStage2Locked
                ? 'opacity-65 bg-[#ECE4D4]/40 dark:bg-[#1B2519]/40 text-[#7F8C7C]'
                : 'bg-[#ECE4D4]/70 dark:bg-[#1B2519]/70 text-[#485643] hover:text-[#2B3527] dark:text-[#B7C7B2] hover:bg-[#E2D8C3]'
            }`}
          >
            {isStage2Locked ? (
              <Lock className="h-3 w-3 shrink-0 text-[#8C524B]" />
            ) : (
              <Mic className="h-3 w-3 shrink-0" />
            )}
            <span className="truncate">٢. إخفاء تدريجي</span>
            {completedStages.stage2 && <CheckCircle2 className="h-3 w-3 shrink-0 opacity-90" />}
          </button>

          {/* Stage 3 */}
          <button
            onClick={() => onSelectStage('stage3')}
            className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
              currentStage === 'stage3'
                ? 'bg-[#52674B] text-white shadow-xs dark:bg-[#688260]'
                : isStage3Locked
                ? 'opacity-65 bg-[#ECE4D4]/40 dark:bg-[#1B2519]/40 text-[#7F8C7C]'
                : 'bg-[#ECE4D4]/70 dark:bg-[#1B2519]/70 text-[#485643] hover:text-[#2B3527] dark:text-[#B7C7B2] hover:bg-[#E2D8C3]'
            }`}
          >
            {isStage3Locked ? (
              <Lock className="h-3 w-3 shrink-0 text-[#8C524B]" />
            ) : (
              <EyeOff className="h-3 w-3 shrink-0" />
            )}
            <span className="truncate">٣. تسميع غيبي</span>
            {completedStages.stage3 && <CheckCircle2 className="h-3 w-3 shrink-0 opacity-90" />}
          </button>

          {/* Two-Person Peer Voice Call */}
          <button
            onClick={() => onSelectStage('peer')}
            className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
              currentStage === 'peer'
                ? 'bg-[#52674B] text-white shadow-xs dark:bg-[#688260]'
                : 'bg-[#ECE4D4]/70 dark:bg-[#1B2519]/70 text-[#3D4D38] dark:text-[#C5D8C1] hover:bg-[#E2D8C3]'
            }`}
          >
            <Phone className="h-3 w-3 shrink-0" />
            <span className="truncate">التسميع الثنائي</span>
            {friendsCount > 0 && (
              <span
                className={`px-1 rounded-full text-[9px] font-bold ${
                  currentStage === 'peer'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#52674B]/15 text-[#52674B] dark:text-[#C5D8C1]'
                }`}
              >
                {friendsCount}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
};
