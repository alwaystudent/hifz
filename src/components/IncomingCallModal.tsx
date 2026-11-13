import React from 'react';
import { DirectCallInvite } from '../types/quran';
import { SURAHS_LIST, RIWAYAT_LIST } from '../data/quranData';
import { Phone, PhoneOff, Volume2, BookOpen } from 'lucide-react';

interface IncomingCallModalProps {
  invite: DirectCallInvite | null;
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  invite,
  onAccept,
  onReject,
}) => {
  if (!invite) return null;

  const surahMeta =
    SURAHS_LIST.find((s) => s.number === invite.passage.surahNumber) || SURAHS_LIST[0];
  const riwayahMeta =
    RIWAYAT_LIST.find((r) => r.id === invite.passage.riwayah) || RIWAYAT_LIST[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="اتصال صوتي وارد"
    >
      <div className="w-full max-w-sm rounded-2xl bg-[#F9F6EE] dark:bg-[#162015] border-2 border-[#52674B] shadow-2xl p-5 text-center space-y-4">
        {/* Acoustic Ringing Visual Indicator (fixed bounds, no layout shift) */}
        <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-[#52674B]/25 animate-ping" />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#52674B] text-white shadow-md">
            <Phone className="h-6 w-6" />
          </span>
        </div>

        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ECE4D4] dark:bg-[#202B1E] text-[11px] font-bold text-[#52674B] dark:text-[#C5D8C1]">
            <Volume2 className="h-3 w-3" />
            <span>اتصال صوتي وارد للتسميع</span>
          </div>
          <h3 className="text-lg font-bold text-[#2B3527] dark:text-[#F1F6F0] pt-1">
            {invite.callerName}
          </h3>
          <p className="text-xs text-[#6F7D6C] dark:text-[#9FB19B]">
            يدعوك لجلسة سرد وتسميع صوتي مباشر
          </p>
        </div>

        {/* Passage Details */}
        <div className="rounded-xl bg-[#ECE4D4]/70 dark:bg-[#1E291D] border border-[#DDD3BF] dark:border-[#2C3B29] px-3 py-2 text-xs text-[#3D4D38] dark:text-[#C5D8C1] flex items-center justify-center gap-2 flex-wrap">
          <BookOpen className="h-3.5 w-3.5 text-[#52674B]" />
          <span className="font-scheherazade text-sm font-bold">
            سورة {surahMeta.name}
          </span>
          <span className="font-mono text-[11px]">
            ({invite.passage.fromAyah}-{invite.passage.toAyah})
          </span>
          <span className="px-1.5 py-0.5 rounded-md bg-[#F9F6EE] dark:bg-[#111710] text-[10px] font-semibold">
            {riwayahMeta.shortName}
          </span>
        </div>

        {/* Accept / Reject Controls */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={onReject}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#8C463F] hover:bg-[#7A3B35] text-white text-xs font-bold shadow-xs transition-colors"
          >
            <PhoneOff className="h-4 w-4" />
            <span>رفض</span>
          </button>

          <button
            type="button"
            onClick={onAccept}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#52674B] hover:bg-[#43553D] text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Phone className="h-4 w-4" />
            <span>رد وبدء التسميع</span>
          </button>
        </div>
      </div>
    </div>
  );
};
