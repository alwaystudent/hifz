import React from 'react';
import { RiwayahId, StageProgressState, StageType } from '../types/quran';
import { RIWAYAT_LIST } from '../data/quranData';
import { toArabicDigits } from '../utils/arabic';
import {
  Volume2,
  Mic,
  EyeOff,
  BookOpen,
  Moon,
  Sun,
  Settings,
  Compass,
  BarChart3,
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
      {/* Row 1: Right (Brand + Reports + Surah + Riwayah) | Left (Membership + DarkMode + Settings) */}
      <div className="w-full max-w-full flex flex-wrap items-center justify-between gap-1.5 px-2 sm:px-4 py-1 border-b border-[#DDD4C1]/60 dark:border-[#2A3728]/60">
        {/* Right side (RTL start): Brand + Reports + Range + Riwayah */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Brand Frame */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-[#CFC3AD] dark:border-[#344532] bg-[#F2ECE0] dark:bg-[#1B241A] shrink-0">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-[#52674B] text-white">
              <BookOpen className="h-3 w-3" />
            </div>
            <span className="font-scheherazade text-base sm:text-lg font-bold leading-none text-[#2B3527] dark:text-[#F1F6F0]">
              أسرد
            </span>
          </div>

          {/* Reports Button on the Right with clearer BarChart3 icon */}
          <button
            onClick={onOpenReports}
            className="relative flex items-center gap-1 text-[11px] font-bold text-[#3D4D38] dark:text-[#C5D8C1] bg-[#EFE8D9] dark:bg-[#1C261B] hover:bg-[#E4DAC5] dark:hover:bg-[#263424] px-2.5 py-1 rounded-lg border border-[#C7B99F] dark:border-[#384B36] shadow-2xs transition-colors"
            title="سجل التقارير والمراجعة المجدولة"
            aria-label="التقارير"
          >
            <BarChart3 className="h-3.5 w-3.5 text-[#52674B] dark:text-[#A4BA9E]" />
            <span>التقارير</span>
            {dueReportsCount > 0 && (
              <span className="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-[#8C524B] text-[9px] font-bold text-white">
                {toArabicDigits(dueReportsCount)}
              </span>
            )}
          </button>

          {/* Framed Surah & Ayah Range Button */}
          <button
            onClick={onOpenRangeSelector}
            className="flex items-center gap-1 text-[11px] font-bold text-[#3D4D38] dark:text-[#C5D8C1] bg-[#EFE8D9] dark:bg-[#1C261B] hover:bg-[#E4DAC5] dark:hover:bg-[#263424] px-2.5 py-1 rounded-lg border border-[#C7B99F] dark:border-[#384B36] shadow-2xs transition-colors"
            title="تحديد السورة ونطاق الآيات"
          >
            <Compass className="h-3.5 w-3.5 text-[#52674B] dark:text-[#A4BA9E]" />
            <span className="font-scheherazade text-xs leading-none">{surahName}</span>
            <span className="text-[#6F7D6C] dark:text-[#9FB19B] text-[10px]">
              ({toArabicDigits(fromAyah)}-{toArabicDigits(toAyah)})
            </span>
          </button>

          {/* Framed Riwayah Switcher */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[#EFE8D9] dark:bg-[#1C261B] border border-[#C7B99F] dark:border-[#384B36] shadow-2xs">
            {RIWAYAT_LIST.map((r) => (
              <button
                key={r.id}
                onClick={() => onSelectRiwayah(r.id)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors ${
                  riwayah === r.id
                    ? 'bg-[#52674B] text-white shadow-xs'
                    : 'text-[#485643] dark:text-[#B7C7B2] hover:text-[#2B3527]'
                }`}
                title={r.name}
              >
                {r.shortName}
              </button>
            ))}
          </div>
        </div>

        {/* Left side (RTL end): Membership -> Dark Mode (to right of Settings) -> Settings (far left) */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Membership / Login Button */}
          <button
            onClick={onOpenAuth}
            className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border shadow-2xs transition-colors ${
              memberDisplayName
                ? 'bg-[#52674B]/12 dark:bg-[#688260]/25 text-[#2B3527] dark:text-[#F1F6F0] border-[#52674B]/40 dark:border-[#738C6B]/50 hover:bg-[#52674B]/20'
                : 'bg-[#52674B] text-white border-[#43553D] hover:bg-[#43553D]'
            }`}
            title={memberDisplayName ? 'حسابي والأصدقاء' : 'تسجيل الدخول / العضوية'}
          >
            {memberDisplayName ? (
              <UserCheck className="h-3.5 w-3.5 text-[#52674B] dark:text-[#C5D8C1]" />
            ) : (
              <UserPlus className="h-3.5 w-3.5" />
            )}
            <span className="max-w-[85px] truncate">
              {memberDisplayName ? memberDisplayName : 'دخول'}
            </span>
          </button>

          {/* Framed Utility Container: Dark Mode on the right of Settings, Settings on far left */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg border border-[#C7B99F] dark:border-[#384B36] bg-[#EFE8D9] dark:bg-[#1C261B] shadow-2xs">
            {/* Dark Mode Toggle (immediately to the right of Settings in RTL) */}
            <button
              onClick={onToggleDarkMode}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-[#F9F6EE] dark:bg-[#141A13] border border-[#DDD3BF] dark:border-[#2C3B29] text-[#485643] dark:text-[#B7C7B2] hover:bg-[#E4DAC5] dark:hover:bg-[#253223] transition-colors"
              title={isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
              aria-label="تبديل المظهر"
            >
              {isDarkMode ? (
                <Sun className="h-3.5 w-3.5 text-[#E2B778]" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-[#52674B]" />
              )}
            </button>

            {/* Settings Modal Toggle (far top-left) */}
            <button
              onClick={onOpenSettings}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-[#F9F6EE] dark:bg-[#141A13] border border-[#DDD3BF] dark:border-[#2C3B29] text-[#485643] dark:text-[#B7C7B2] hover:bg-[#E4DAC5] dark:hover:bg-[#253223] transition-colors"
              title="الإعدادات"
              aria-label="الإعدادات"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Framed Compact Navigation Tabs */}
      <div className="w-full max-w-full px-2 sm:px-4 py-1 bg-[#F5F1E6]/90 dark:bg-[#111710]/90">
        <nav className="w-full grid grid-cols-4 gap-1 p-0.5 rounded-xl border border-[#D4C7AE] dark:border-[#2D3D2B] bg-[#ECE4D4]/70 dark:bg-[#192218]">
          {/* Stage 1 */}
          <button
            onClick={() => onSelectStage('stage1')}
            className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg border text-[11px] font-bold transition-colors ${
              currentStage === 'stage1'
                ? 'bg-[#52674B] text-white border-[#43553D] shadow-xs dark:bg-[#688260]'
                : 'bg-[#F9F6EE]/80 dark:bg-[#141B13] border-[#DDD3BF] dark:border-[#2B3A29] text-[#485643] hover:text-[#2B3527] dark:text-[#B7C7B2] hover:bg-[#E4DAC5]'
            }`}
          >
            <Volume2 className="h-3 w-3 shrink-0" />
            <span className="truncate">١. الشيخ</span>
            {completedStages.stage1 && <CheckCircle2 className="h-3 w-3 shrink-0 opacity-90" />}
          </button>

          {/* Stage 2 */}
          <button
            onClick={() => onSelectStage('stage2')}
            className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg border text-[11px] font-bold transition-colors ${
              currentStage === 'stage2'
                ? 'bg-[#52674B] text-white border-[#43553D] shadow-xs dark:bg-[#688260]'
                : isStage2Locked
                ? 'opacity-65 bg-[#EFE8D9]/60 dark:bg-[#172016]/50 border-[#DDD3BF]/70 dark:border-[#273525] text-[#7F8C7C]'
                : 'bg-[#F9F6EE]/80 dark:bg-[#141B13] border-[#DDD3BF] dark:border-[#2B3A29] text-[#485643] hover:text-[#2B3527] dark:text-[#B7C7B2] hover:bg-[#E4DAC5]'
            }`}
          >
            {isStage2Locked ? (
              <Lock className="h-3 w-3 shrink-0 text-[#8C524B]" />
            ) : (
              <Mic className="h-3 w-3 shrink-0" />
            )}
            <span className="truncate">٢. الإخفاء</span>
            {completedStages.stage2 && <CheckCircle2 className="h-3 w-3 shrink-0 opacity-90" />}
          </button>

          {/* Stage 3 */}
          <button
            onClick={() => onSelectStage('stage3')}
            className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg border text-[11px] font-bold transition-colors ${
              currentStage === 'stage3'
                ? 'bg-[#52674B] text-white border-[#43553D] shadow-xs dark:bg-[#688260]'
                : isStage3Locked
                ? 'opacity-65 bg-[#EFE8D9]/60 dark:bg-[#172016]/50 border-[#DDD3BF]/70 dark:border-[#273525] text-[#7F8C7C]'
                : 'bg-[#F9F6EE]/80 dark:bg-[#141B13] border-[#DDD3BF] dark:border-[#2B3A29] text-[#485643] hover:text-[#2B3527] dark:text-[#B7C7B2] hover:bg-[#E4DAC5]'
            }`}
          >
            {isStage3Locked ? (
              <Lock className="h-3 w-3 shrink-0 text-[#8C524B]" />
            ) : (
              <EyeOff className="h-3 w-3 shrink-0" />
            )}
            <span className="truncate">٣. التسميع</span>
            {completedStages.stage3 && <CheckCircle2 className="h-3 w-3 shrink-0 opacity-90" />}
          </button>

          {/* Two-Person Peer Voice Call */}
          <button
            onClick={() => onSelectStage('peer')}
            className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg border text-[11px] font-bold transition-colors ${
              currentStage === 'peer'
                ? 'bg-[#52674B] text-white border-[#43553D] shadow-xs dark:bg-[#688260]'
                : 'bg-[#F9F6EE]/80 dark:bg-[#141B13] border-[#DDD3BF] dark:border-[#2B3A29] text-[#3D4D38] dark:text-[#C5D8C1] hover:bg-[#E4DAC5]'
            }`}
          >
            <Phone className="h-3 w-3 shrink-0" />
            <span className="truncate">الثنائي</span>
            {friendsCount > 0 && (
              <span
                className={`px-1 rounded-full text-[9px] font-bold ${
                  currentStage === 'peer'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#52674B]/15 text-[#52674B] dark:text-[#C5D8C1]'
                }`}
              >
                {toArabicDigits(friendsCount)}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
};
