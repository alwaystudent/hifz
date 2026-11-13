import React, { useState, useEffect } from 'react';
import { MemberProfile } from '../types/quran';
import {
  UserCheck,
  UserPlus,
  LogIn,
  LogOut,
  Copy,
  Check,
  X,
  ShieldCheck,
  Save,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  isLoadingProfile: boolean;
  memberProfile: MemberProfile | null;
  authError: string | null;
  promptReason?: string | null;
  myFriendInviteUrl: string;
  onSignInWithGoogle: (preferredDisplayName?: string) => Promise<boolean>;
  onUpdateDisplayName: (nextName: string) => Promise<boolean>;
  onLogout: () => Promise<void>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  isAuthenticated,
  isLoadingProfile,
  memberProfile,
  authError,
  promptReason,
  myFriendInviteUrl,
  onSignInWithGoogle,
  onUpdateDisplayName,
  onLogout,
}) => {
  const [tab, setTab] = useState<'register' | 'login'>('register');
  const [preferredName, setPreferredName] = useState('');
  const [editName, setEditName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [savedNameFeedback, setSavedNameFeedback] = useState(false);

  useEffect(() => {
    if (memberProfile?.displayName) {
      setEditName(memberProfile.displayName);
    }
  }, [memberProfile?.displayName]);

  if (!isOpen) return null;

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const ok = await onSignInWithGoogle(
        tab === 'register' && preferredName.trim() ? preferredName.trim() : undefined
      );
      if (ok && !promptReason) {
        onClose();
      } else if (ok) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setIsSubmitting(true);
    try {
      const ok = await onUpdateDisplayName(editName.trim());
      if (ok) {
        setSavedNameFeedback(true);
        setTimeout(() => setSavedNameFeedback(false), 2000);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyInvite = () => {
    if (!myFriendInviteUrl) return;
    navigator.clipboard?.writeText(myFriendInviteUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="العضوية والحساب"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#F9F6EE] dark:bg-[#162015] border border-[#DDD3BF] dark:border-[#2C3B29] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#DDD3BF] dark:border-[#2A3728] bg-[#F5F1E6] dark:bg-[#141A13]">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#52674B]/15 text-[#52674B] dark:text-[#C5D8C1]">
              {isAuthenticated ? (
                <UserCheck className="h-4 w-4" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
            </div>
            <h3 className="text-sm font-bold text-[#2B3527] dark:text-[#F1F6F0]">
              {isAuthenticated ? 'حساب العضو والأصدقاء' : 'تسجيل العضوية والدخول'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#6F7D6C] hover:bg-[#ECE4D4] dark:hover:bg-[#222E20]"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-3.5">
          {promptReason && !isAuthenticated && (
            <div className="p-2.5 rounded-xl bg-[#ECE4D4] dark:bg-[#1F2A1E] border border-[#D5CABB] dark:border-[#2F3F2D] text-xs font-semibold text-[#3D4D38] dark:text-[#C5D8C1]">
              {promptReason}
            </div>
          )}

          {authError && (
            <div className="p-2.5 rounded-xl bg-[#8C463F]/10 border border-[#8C463F]/30 text-xs font-semibold text-[#8C463F] dark:text-[#F3C5C1]">
              {authError}
            </div>
          )}

          {isLoadingProfile ? (
            <div className="py-8 text-center text-xs font-semibold text-[#6F7D6C] dark:text-[#9FB19B]">
              جاري تجهيز ملف العضوية...
            </div>
          ) : isAuthenticated && memberProfile ? (
            <div className="space-y-3.5">
              {/* Member Info Summary */}
              <div className="p-3 rounded-xl bg-[#F5F1E6] dark:bg-[#1C261B] border border-[#DDD3BF] dark:border-[#2B3A29] flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[#2B3527] dark:text-[#F1F6F0] truncate">
                    {memberProfile.displayName}
                  </div>
                  {memberProfile.email && (
                    <div className="text-[11px] text-[#6F7D6C] dark:text-[#9FB19B] truncate" dir="ltr">
                      {memberProfile.email}
                    </div>
                  )}
                </div>
                <span className="px-2 py-1 rounded-lg text-[11px] font-mono font-bold bg-[#ECE4D4] dark:bg-[#141A13] text-[#52674B] dark:text-[#C5D8C1] border border-[#D5CABB] dark:border-[#2F3F2D] shrink-0">
                  {memberProfile.friendCode}
                </span>
              </div>

              {/* Edit Display Name */}
              <form onSubmit={handleSaveName} className="space-y-1.5">
                <label className="block text-[11px] font-bold text-[#485643] dark:text-[#B7C7B2]">
                  الاسم الظاهر للأصدقاء عند الاتصال
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={80}
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#111710] border border-[#D5CABB] dark:border-[#2F3F2D] text-xs text-[#2B3527] dark:text-[#F1F6F0] focus:outline-none focus:ring-1 focus:ring-[#52674B]"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !editName.trim()}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#52674B] hover:bg-[#43553D] text-white text-xs font-bold disabled:opacity-50"
                  >
                    {savedNameFeedback ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                    <span>{savedNameFeedback ? 'تم الحفظ' : 'حفظ'}</span>
                  </button>
                </div>
              </form>

              {/* Share Personal Friend Link */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-[#485643] dark:text-[#B7C7B2]">
                  رابط دعوتك الخاص لإضافة الأصدقاء
                </label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={myFriendInviteUrl}
                    dir="ltr"
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#111710] border border-[#D5CABB] dark:border-[#2F3F2D] text-[11px] font-mono text-[#2B3527] dark:text-[#F1F6F0]"
                  />
                  <button
                    type="button"
                    onClick={handleCopyInvite}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#ECE4D4] dark:bg-[#202B1E] hover:bg-[#E2D8C3] text-[#3D4D38] dark:text-[#C5D8C1] border border-[#D5CABB] dark:border-[#2F3F2D] text-xs font-bold shrink-0"
                  >
                    {copiedLink ? <Check className="h-3.5 w-3.5 text-[#52674B]" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedLink ? 'نُسخ' : 'نسخ'}</span>
                  </button>
                </div>
              </div>

              {/* Logout */}
              <div className="pt-2 border-t border-[#DDD3BF] dark:border-[#2A3728] flex justify-end">
                <button
                  type="button"
                  onClick={async () => {
                    await onLogout();
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8C463F]/10 hover:bg-[#8C463F]/20 text-[#8C463F] dark:text-[#F3C5C1] text-xs font-bold transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {/* Tabs: Register vs Login */}
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#ECE4D4] dark:bg-[#1D271B]">
                <button
                  type="button"
                  onClick={() => setTab('register')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    tab === 'register'
                      ? 'bg-[#52674B] text-white shadow-xs'
                      : 'text-[#485643] dark:text-[#B7C7B2]'
                  }`}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>تسجيل عضوية جديدة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTab('login')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    tab === 'login'
                      ? 'bg-[#52674B] text-white shadow-xs'
                      : 'text-[#485643] dark:text-[#B7C7B2]'
                  }`}
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>تسجيل الدخول</span>
                </button>
              </div>

              {tab === 'register' && (
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-[#485643] dark:text-[#B7C7B2]">
                    الاسم الظاهر للأصدقاء (اختياري)
                  </label>
                  <input
                    type="text"
                    value={preferredName}
                    onChange={(e) => setPreferredName(e.target.value)}
                    maxLength={80}
                    placeholder="مثال: عبد الله السارد"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#111710] border border-[#D5CABB] dark:border-[#2F3F2D] text-xs text-[#2B3527] dark:text-[#F1F6F0] focus:outline-none focus:ring-1 focus:ring-[#52674B]"
                  />
                </div>
              )}

              <div className="p-2.5 rounded-xl bg-[#F5F1E6] dark:bg-[#1B2519] border border-[#E2D8C3] dark:border-[#2A3828] flex items-start gap-2 text-[11px] text-[#556450] dark:text-[#B7C7B2]">
                <ShieldCheck className="h-4 w-4 text-[#52674B] shrink-0 mt-0.5" />
                <span>
                  تتيح لك العضوية إضافة الأصدقاء برابط دعوة موثّق، وحفظ قائمتك، وإجراء المكالمات الصوتية الثنائية مع تنبيه الرنين بين الطرفين.
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#52674B] hover:bg-[#43553D] text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
              >
                <LogIn className="h-4 w-4" />
                <span>
                  {isSubmitting
                    ? 'جاري المتابعة...'
                    : tab === 'register'
                    ? 'إنشاء عضوية بحساب Google'
                    : 'تسجيل الدخول بحساب Google'}
                </span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
