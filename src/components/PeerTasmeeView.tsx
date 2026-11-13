import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AyahItem, RiwayahId, RoomPassageState, SurahMeta } from '../types/quran';
import { SURAHS_LIST, RIWAYAT_LIST } from '../data/quranData';
import { tokenizeAyah } from '../utils/arabic';
import { usePeerVoiceCall } from '../hooks/usePeerVoiceCall';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Copy,
  Check,
  Users,
  ArrowLeftRight,
  Eye,
  EyeOff,
  Link2,
  BookOpen,
  UserPlus,
} from 'lucide-react';

interface PeerTasmeeViewProps {
  surah: SurahMeta;
  ayahs: AyahItem[];
  fromAyah: number;
  toAyah: number;
  riwayah: RiwayahId;
  initialInviteRoomId?: string | null;
  onSyncPassageToApp: (passage: RoomPassageState) => void;
  onExitPeerMode: () => void;
}

function extractRoomCode(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  try {
    if (trimmed.includes('http') || trimmed.includes('room=')) {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://x.local/${trimmed}`);
      const r = url.searchParams.get('room');
      if (r) return r.trim().toUpperCase();
    }
  } catch {
    // fallback regex
  }
  const match = trimmed.match(/room=([A-Za-z0-9]+)/i);
  if (match && match[1]) return match[1].toUpperCase();
  return trimmed.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export const PeerTasmeeView: React.FC<PeerTasmeeViewProps> = ({
  surah,
  ayahs,
  fromAyah,
  toAyah,
  riwayah,
  initialInviteRoomId,
  onSyncPassageToApp,
  onExitPeerMode,
}) => {
  const [displayName, setDisplayName] = useState<string>(() => {
    try {
      return localStorage.getItem('quran_peer_name') || 'طالب علم';
    } catch {
      return 'طالب علم';
    }
  });
  const [joinCodeInput, setJoinCodeInput] = useState<string>(initialInviteRoomId || '');
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [hideTextForReciter, setHideTextForReciter] = useState(true);

  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const {
    roomId,
    localPeerId,
    otherPeer,
    isLocalReciter,
    focusedWordId,
    focusedAyahNumber,
    passage,
    callState,
    errorMessage,
    isMuted,
    localAudioLevel,
    remoteAudioLevel,
    remoteStream,
    createAndJoinRoom,
    joinRoom,
    leaveCall,
    toggleMute,
    updateRoomPassage,
    syncFocusWord,
    swapRoles,
  } = usePeerVoiceCall({
    initialPassage: {
      surahNumber: surah.number,
      fromAyah,
      toAyah,
      riwayah,
    },
    onRemotePassageUpdate: onSyncPassageToApp,
  });

  // Attach WebRTC remote audio stream to <audio> element
  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
      if (remoteStream) {
        remoteAudioRef.current.play().catch(() => {});
      }
    }
  }, [remoteStream]);

  // Persist display name
  useEffect(() => {
    try {
      if (displayName.trim()) {
        localStorage.setItem('quran_peer_name', displayName.trim());
      }
    } catch {
      // ignore
    }
  }, [displayName]);

  // Keep local selected Surah/Range in sync when active in a room
  const activeSurahMeta =
    SURAHS_LIST.find((s) => s.number === passage.surahNumber) || surah;

  const selectedAyahs = useMemo(() => {
    return ayahs.filter(
      (a) => a.numberInSurah >= fromAyah && a.numberInSurah <= toAyah
    );
  }, [ayahs, fromAyah, toAyah]);

  const ayahWordsMap = useMemo(() => {
    const map: Record<number, ReturnType<typeof tokenizeAyah>> = {};
    selectedAyahs.forEach((a) => {
      map[a.numberInSurah] = tokenizeAyah(a.text, a.numberInSurah);
    });
    return map;
  }, [selectedAyahs]);

  const inviteUrl = roomId
    ? `${window.location.origin}${window.location.pathname}?room=${roomId}`
    : '';

  const handleCopyInvite = () => {
    if (!inviteUrl) return;
    navigator.clipboard?.writeText(inviteUrl).then(() => {
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    });
  };

  const handleCreateRoom = async () => {
    const created = await createAndJoinRoom(displayName, {
      surahNumber: surah.number,
      fromAyah,
      toAyah,
      riwayah,
    });
    if (created) {
      const nextUrl = `${window.location.pathname}?room=${created}`;
      window.history.replaceState({}, '', nextUrl);
    }
  };

  const handleJoinRoom = async () => {
    const code = extractRoomCode(joinCodeInput);
    if (!code) return;
    const nextUrl = `${window.location.pathname}?room=${code}`;
    window.history.replaceState({}, '', nextUrl);
    await joinRoom(code, displayName, {
      surahNumber: surah.number,
      fromAyah,
      toAyah,
      riwayah,
    });
  };

  const handleHangup = () => {
    leaveCall();
    window.history.replaceState({}, '', window.location.pathname);
  };

  const inCall = callState === 'waiting_peer' || callState === 'connected';

  return (
    <div className="w-full h-full min-h-0 flex flex-col gap-1.5">
      {/* Hidden WebRTC Remote Audio Player */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* Compact Top Call & Room Control Bar */}
      <div className="shrink-0 w-full rounded-xl bg-[#F6F2EA] dark:bg-[#182117] border border-[#DDD3BF] dark:border-[#273525] px-2.5 py-1.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          {/* Status & Participants */}
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-lg text-white shrink-0 ${
                callState === 'connected'
                  ? 'bg-[#52674B]'
                  : inCall
                  ? 'bg-[#8E7A4F]'
                  : 'bg-[#52674B]/80'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <h2 className="text-xs font-bold text-[#2B3527] dark:text-[#F1F6F0] truncate">
                التسميع الثنائي
              </h2>
              {roomId && inCall && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#ECE4D4] dark:bg-[#202B1E] text-[#52674B] dark:text-[#C5D8C1] border border-[#D5CABB] dark:border-[#2F3F2D]">
                  {roomId}
                </span>
              )}
              {callState === 'connected' && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#52674B] text-white">
                  متصل · {otherPeer?.name || 'الشريك'}
                </span>
              )}
              {callState === 'waiting_peer' && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#8E7A4F] text-white">
                  بانتظار الشريك...
                </span>
              )}
            </div>
          </div>

          {/* Compact Live Call Actions */}
          <div className="flex items-center gap-1 flex-wrap justify-end">
            {inCall && (
              <>
                <button
                  onClick={handleCopyInvite}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-lg bg-[#ECE4D4] dark:bg-[#202B1E] hover:bg-[#E2D8C3] text-[#3D4D38] dark:text-[#C5D8C1] border border-[#D5CABB] dark:border-[#2F3F2D] transition-colors"
                >
                  {copiedInvite ? <Check className="h-3 w-3 text-[#52674B]" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedInvite ? 'تم النسخ' : 'رابط الدعوة'}</span>
                </button>

                <button
                  onClick={() => swapRoles(isLocalReciter && otherPeer ? otherPeer.peerId : localPeerId)}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-lg bg-[#ECE4D4] dark:bg-[#202B1E] hover:bg-[#E2D8C3] text-[#3D4D38] dark:text-[#C5D8C1] border border-[#D5CABB] dark:border-[#2F3F2D] transition-colors"
                  title="تبديل الأدوار بين السارد والمُسمِّع"
                >
                  <ArrowLeftRight className="h-3 w-3" />
                  <span>{isLocalReciter ? 'السارد' : 'المُسمِّع'}</span>
                </button>

                {isLocalReciter && (
                  <button
                    onClick={() => setHideTextForReciter((prev) => !prev)}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-lg bg-[#ECE4D4] dark:bg-[#202B1E] text-[#3D4D38] dark:text-[#C5D8C1] border border-[#D5CABB] dark:border-[#2F3F2D]"
                  >
                    {hideTextForReciter ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    <span>{hideTextForReciter ? 'إظهار' : 'إخفاء'}</span>
                  </button>
                )}

                <button
                  onClick={toggleMute}
                  className={`flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                    isMuted
                      ? 'bg-[#8C463F] text-white'
                      : 'bg-[#52674B] text-white hover:bg-[#43553D]'
                  }`}
                >
                  {isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                  <span>{isMuted ? 'مكتوم' : 'صوت'}</span>
                </button>

                <button
                  onClick={handleHangup}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-lg bg-[#8C463F] hover:bg-[#7A3B35] text-white transition-colors"
                >
                  <PhoneOff className="h-3 w-3" />
                  <span>إنهاء</span>
                </button>
              </>
            )}

            <button
              onClick={() => {
                handleHangup();
                onExitPeerMode();
              }}
              className="px-2 py-1 text-[11px] font-semibold rounded-lg border border-[#D5CABB] dark:border-[#2F3F2D] text-[#485643] dark:text-[#B7C7B2] hover:bg-[#ECE4D4] dark:hover:bg-[#202B1E]"
            >
              رجوع
            </button>
          </div>
        </div>

        {/* Synchronized Passage Selector Bar inside Active Call */}
        {inCall && (
          <div className="mt-1.5 pt-1.5 border-t border-[#E5DCcb] dark:border-[#233021] flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
            <div className="flex items-center gap-1.5 flex-wrap">
              <BookOpen className="h-3 w-3 text-[#52674B]" />

              <select
                value={passage.riwayah}
                onChange={(e) => {
                  const nextRiwayah = e.target.value as RiwayahId;
                  const next = { ...passage, riwayah: nextRiwayah };
                  updateRoomPassage(next);
                  onSyncPassageToApp(next);
                }}
                className="px-1.5 py-0.5 rounded-md bg-[#FDFCF9] dark:bg-[#111710] border border-[#D5CABB] dark:border-[#2F3F2D] text-[#2B3527] dark:text-[#F1F6F0] font-semibold"
              >
                {RIWAYAT_LIST.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.shortName}
                  </option>
                ))}
              </select>

              <select
                value={passage.surahNumber}
                onChange={(e) => {
                  const sNum = Number(e.target.value);
                  const meta = SURAHS_LIST.find((s) => s.number === sNum) || SURAHS_LIST[0];
                  const next: RoomPassageState = {
                    ...passage,
                    surahNumber: sNum,
                    fromAyah: 1,
                    toAyah: Math.min(10, meta.numberOfAyahs),
                  };
                  updateRoomPassage(next);
                  onSyncPassageToApp(next);
                }}
                className="px-1.5 py-0.5 rounded-md bg-[#FDFCF9] dark:bg-[#111710] border border-[#D5CABB] dark:border-[#2F3F2D] text-[#2B3527] dark:text-[#F1F6F0] font-semibold"
              >
                {SURAHS_LIST.map((s) => (
                  <option key={s.number} value={s.number}>
                    {s.number}. {s.name}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1">
                <span>من</span>
                <input
                  type="number"
                  min={1}
                  max={activeSurahMeta.numberOfAyahs}
                  value={fromAyah}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(activeSurahMeta.numberOfAyahs, Number(e.target.value) || 1));
                    const next: RoomPassageState = {
                      ...passage,
                      fromAyah: val,
                      toAyah: Math.max(val, toAyah),
                    };
                    updateRoomPassage(next);
                    onSyncPassageToApp(next);
                  }}
                  className="w-11 px-1 py-0.5 rounded-md bg-[#FDFCF9] dark:bg-[#111710] border border-[#D5CABB] dark:border-[#2F3F2D] text-center font-mono"
                />
                <span>إلى</span>
                <input
                  type="number"
                  min={1}
                  max={activeSurahMeta.numberOfAyahs}
                  value={toAyah}
                  onChange={(e) => {
                    const val = Math.max(fromAyah, Math.min(activeSurahMeta.numberOfAyahs, Number(e.target.value) || fromAyah));
                    const next: RoomPassageState = {
                      ...passage,
                      toAyah: val,
                    };
                    updateRoomPassage(next);
                    onSyncPassageToApp(next);
                  }}
                  className="w-11 px-1 py-0.5 rounded-md bg-[#FDFCF9] dark:bg-[#111710] border border-[#D5CABB] dark:border-[#2F3F2D] text-center font-mono"
                />
              </div>
            </div>

            {/* Live Voice Activity Meters */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-semibold text-[#556450] dark:text-[#B7C7B2]">
                  أنت:
                </span>
                <div className="w-10 h-1.5 rounded-full bg-[#E5DCCB] dark:bg-[#233021] overflow-hidden">
                  <div
                    className="h-full bg-[#52674B] transition-all duration-100"
                    style={{ width: `${localAudioLevel}%` }}
                  />
                </div>
              </div>
              {otherPeer && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-semibold text-[#556450] dark:text-[#B7C7B2]">
                    {otherPeer.name}:
                  </span>
                  <div className="w-10 h-1.5 rounded-full bg-[#E5DCCB] dark:bg-[#233021] overflow-hidden">
                    <div
                      className="h-full bg-[#738C6B] transition-all duration-100"
                      style={{ width: `${otherPeer.isMuted ? 0 : remoteAudioLevel}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Lobby Setup View OR Live Shared Mushaf View */}
      {!inCall ? (
        <div className="flex-1 min-h-0 overflow-y-auto w-full rounded-2xl mushaf-canvas p-4 sm:p-6 flex items-center justify-center">
          <div className="w-full max-w-xl space-y-5">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-[#8C524B]/15 border border-[#8C524B]/30 text-xs text-[#6B2D26] dark:text-[#F3C5C1] text-center font-semibold">
                {errorMessage}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#2B3527] dark:text-[#F1F6F0]">
                اسمك في الجلسة الصوتية:
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="مثال: أحمد"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#111710] border border-[#D5CABB] dark:border-[#2F3F2D] text-sm text-[#2B3527] dark:text-[#F1F6F0] focus:outline-none focus:ring-2 focus:ring-[#52674B]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Create Invite Link */}
              <div className="p-4 rounded-2xl bg-[#F6F2EA] dark:bg-[#182117] border border-[#DDD3BF] dark:border-[#273525] flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-[#2B3527] dark:text-[#F1F6F0]">
                    <Link2 className="h-4 w-4 text-[#52674B]" />
                    <span>إنشاء رابط دعوة جديد</span>
                  </div>
                  <p className="text-xs text-[#6F7D6C] dark:text-[#9FB19B] mt-1">
                    افتح غرفة صوتية فورية واحصل على رابط لدعوة شريكك للتسميع والسرد.
                  </p>
                </div>
                <button
                  onClick={handleCreateRoom}
                  disabled={callState === 'connecting'}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#52674B] hover:bg-[#43553D] text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
                >
                  <Phone className="h-4 w-4" />
                  <span>{callState === 'connecting' ? 'جاري فتح الغرفة...' : 'بدء غرفة صوتية وإنشاء رابط'}</span>
                </button>
              </div>

              {/* Join via Invite Link or Code */}
              <div className="p-4 rounded-2xl bg-[#F6F2EA] dark:bg-[#182117] border border-[#DDD3BF] dark:border-[#273525] flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-[#2B3527] dark:text-[#F1F6F0]">
                    <UserPlus className="h-4 w-4 text-[#52674B]" />
                    <span>الدخول عبر رابط أو رمز دعوة</span>
                  </div>
                  <input
                    type="text"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value)}
                    placeholder="أدخل رمز الغرفة أو الصق الرابط"
                    className="mt-2 w-full px-3 py-2 rounded-xl bg-white dark:bg-[#111710] border border-[#D5CABB] dark:border-[#2F3F2D] text-xs font-mono text-[#2B3527] dark:text-[#F1F6F0]"
                    dir="ltr"
                  />
                </div>
                <button
                  onClick={handleJoinRoom}
                  disabled={!joinCodeInput.trim() || callState === 'connecting'}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#3D4D38] hover:bg-[#2E3B2A] text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-40"
                >
                  <Phone className="h-4 w-4" />
                  <span>انضمام للمكالمة الصوتية</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Maximized Shared Synchronized Mushaf during Live Voice Call */
        <div className="flex-1 min-h-0 overflow-y-auto w-full rounded-2xl mushaf-canvas p-3 sm:p-5 lg:p-7">
          {callState === 'waiting_peer' && inviteUrl && (
            <div className="mb-4 p-3 rounded-2xl bg-[#ECE4D4]/80 dark:bg-[#1D271B] border border-[#D5CABB] dark:border-[#2F3F2D] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-[#2B3527] dark:text-[#F1F6F0]">
                شارك هذا الرابط مع شريكك للانضمام إليك مباشرة:
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  readOnly
                  value={inviteUrl}
                  className="flex-1 sm:w-72 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#111710] border border-[#D5CABB] dark:border-[#2F3F2D] font-mono text-[11px]"
                  dir="ltr"
                />
                <button
                  onClick={handleCopyInvite}
                  className="px-3 py-1.5 rounded-lg bg-[#52674B] text-white font-bold shrink-0"
                >
                  {copiedInvite ? 'تم النسخ ✓' : 'نسخ'}
                </button>
              </div>
            </div>
          )}

          <div
            className="font-quran text-2xl sm:text-3xl lg:text-4xl leading-loose sm:leading-loose lg:leading-loose text-center text-[#232B20] dark:text-[#F3F8F2] select-none"
            dir="rtl"
          >
            {selectedAyahs.map((ayah) => {
              const words = ayahWordsMap[ayah.numberInSurah] || [];
              const shouldHide = isLocalReciter && hideTextForReciter;
              const isAyahFocused = focusedAyahNumber === ayah.numberInSurah;

              return (
                <span key={ayah.numberInSurah} className="inline">
                  {words.map((word) => {
                    const isFocused = focusedWordId === word.id;
                    return (
                      <span
                        key={word.id}
                        onClick={() => syncFocusWord(isFocused ? null : word.id, ayah.numberInSurah)}
                        className={`relative inline-block px-1.5 py-0.5 mx-0.5 rounded-xl cursor-pointer transition-colors ${
                          isFocused
                            ? 'bg-[#52674B]/25 dark:bg-[#738C6B]/45 ring-2 ring-[#52674B] font-bold'
                            : 'hover:bg-[#E2D8C3]/50 dark:hover:bg-[#253223]/50'
                        }`}
                        title="انقر لتحديد الموضع لكلا الطرفين"
                      >
                        <span className={shouldHide && !isFocused ? 'opacity-0' : 'opacity-100'}>
                          {word.text}
                        </span>
                        {shouldHide && !isFocused && (
                          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="w-full border-b-2 border-dashed -mb-2 border-[#52674B]/45" />
                          </span>
                        )}
                      </span>
                    );
                  })}
                  <span
                    onClick={() => syncFocusWord(null, isAyahFocused ? null : ayah.numberInSurah)}
                    className={`inline-block font-scheherazade mx-1.5 px-1.5 rounded-lg cursor-pointer text-2xl sm:text-3xl ayah-number ${
                      isAyahFocused
                        ? 'bg-[#52674B] text-white'
                        : 'text-[#52674B] dark:text-[#A4BA9E]'
                    }`}
                  >
                    ۝{ayah.numberInSurah}
                  </span>{' '}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
