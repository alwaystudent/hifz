import React from 'react';
import { SessionReport, EvaluationRating } from '../types/quran';
import {
  FileText,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Trophy,
  Trash2,
  Play,
  Clock,
} from 'lucide-react';

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: SessionReport[];
  onStartReviewSession: (surahNumber: number, fromAyah: number, toAyah: number) => void;
  onDeleteReport: (id: string) => void;
  onClearAllReports: () => void;
}

export const ReportsModal: React.FC<ReportsModalProps> = ({
  isOpen,
  onClose,
  reports,
  onStartReviewSession,
  onDeleteReport,
  onClearAllReports,
}) => {
  if (!isOpen) return null;

  const now = new Date();

  // Statistics
  const totalSessions = reports.length;
  const mutqanCount = reports.filter((r) => r.rating === 'mutqan').length;
  const mutaraddidCount = reports.filter((r) => r.rating === 'mutaraddid').length;
  const mutafallitCount = reports.filter((r) => r.rating === 'mutafallit').length;

  // Due tests
  const dueTests = reports.filter((r) => {
    const dueDate = new Date(r.nextReviewDate);
    return dueDate <= now;
  });

  const upcomingTests = reports.filter((r) => {
    const dueDate = new Date(r.nextReviewDate);
    return dueDate > now;
  });

  const getRatingBadge = (rating: EvaluationRating) => {
    switch (rating) {
      case 'mutqan':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#52674B]/20 text-[#2F4428] dark:text-[#C5D8C1] border border-[#52674B]/30">
            <CheckCircle2 className="h-3 w-3 text-[#52674B]" />
            <span>متقن (اختبار كل 5 أيام)</span>
          </span>
        );
      case 'mutaraddid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E2B778]/25 text-[#73511F] dark:text-[#F3D7A4] border border-[#E2B778]/40">
            <Clock className="h-3 w-3 text-[#B58238]" />
            <span>متردد (اختبار كل 3 أيام)</span>
          </span>
        );
      case 'mutafallit':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#8C524B]/20 text-[#672B25] dark:text-[#F3C5C1] border border-[#8C524B]/30">
            <AlertTriangle className="h-3 w-3 text-[#8C524B]" />
            <span>متفلت (تذكير إعادة حفظ)</span>
          </span>
        );
    }
  };

  const getDueTimeText = (dateStr: string, rating: EvaluationRating) => {
    const dueDate = new Date(dateStr);
    const diffMs = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return (
        <span className="text-xs font-bold text-[#8C524B] dark:text-[#F3C5C1] flex items-center gap-1">
          <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
          {rating === 'mutafallit' ? 'حان موعد إعادة الحفظ!' : 'حان موعد الاختبار الآن!'}
        </span>
      );
    }
    return (
      <span className="text-xs text-[#556450] dark:text-[#9FB19B]">
        متبقي {diffDays} {diffDays === 1 ? 'يوم' : diffDays === 2 ? 'يومان' : 'أيام'} (
        {dueDate.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })})
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="w-full max-w-3xl rounded-3xl bg-[#F9F6EE] dark:bg-[#141A13] border border-[#DDD3BF] dark:border-[#2A3728] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#DDD3BF] dark:border-[#2A3728] px-5 py-4 bg-[#EDE5D5] dark:bg-[#1B241A]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#52674B] text-white shadow-xs">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#2B3527] dark:text-[#F1F6F0]">
                سجل التقارير والمتابعة الدورية
              </h2>
              <p className="text-xs text-[#6F7D6C] dark:text-[#9FB19B]">
                جدول الاختبارات المجدولة (كل 3 و5 أيام) وتذكيرات إعادة الحفظ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#6F7D6C] hover:text-[#2B3527] dark:text-[#9FB19B] text-lg px-2 py-1 rounded-md transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-[#F4EEE2] dark:bg-[#1C271A] border border-[#DED4C2] dark:border-[#2D3D2B]">
              <span className="text-[11px] text-[#6F7D6C] dark:text-[#9FB19B] block">
                إجمالي التسميع
              </span>
              <span className="text-xl font-bold text-[#2B3527] dark:text-[#F1F6F0] tabular-nums font-mono">
                {totalSessions}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#EDF3EB] dark:bg-[#1B2819] border border-[#52674B]/30">
              <span className="text-[11px] text-[#52674B] dark:text-[#C5D8C1] block font-semibold">
                🌟 متقن (5 أيام)
              </span>
              <span className="text-xl font-bold text-[#52674B] dark:text-[#C5D8C1] tabular-nums font-mono">
                {mutqanCount}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FAF3E5] dark:bg-[#262014] border border-[#E2B778]/40">
              <span className="text-[11px] text-[#A67832] dark:text-[#F3D7A4] block font-semibold">
                ⚖️ متردد (3 أيام)
              </span>
              <span className="text-xl font-bold text-[#A67832] dark:text-[#F3D7A4] tabular-nums font-mono">
                {mutaraddidCount}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F8ECEB] dark:bg-[#281816] border border-[#8C524B]/30">
              <span className="text-[11px] text-[#8C524B] dark:text-[#F3C5C1] block font-semibold">
                🔄 متفلت (تذكير)
              </span>
              <span className="text-xl font-bold text-[#8C524B] dark:text-[#F3C5C1] tabular-nums font-mono">
                {mutafallitCount}
              </span>
            </div>
          </div>

          {/* Due Tests Alert Section */}
          {dueTests.length > 0 && (
            <div className="rounded-2xl p-4 bg-[#EDF3EB] dark:bg-[#1D291C] border-2 border-[#52674B]/40 space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-bold text-[#2B3527] dark:text-[#F1F6F0]">
                <Calendar className="h-4 w-4 text-[#52674B] animate-bounce" />
                <span>اختبارات حان موعدها اليوم ({dueTests.length})</span>
              </div>
              <div className="space-y-2">
                {dueTests.map((test) => (
                  <div
                    key={test.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-xl bg-white dark:bg-[#121811] border border-[#D5CABB] dark:border-[#2C3B29]"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#2B3527] dark:text-[#F1F6F0]">
                          سورة {test.surahName} (الآيات {test.fromAyah} - {test.toAyah})
                        </span>
                        {getRatingBadge(test.rating)}
                      </div>
                      <p className="text-xs text-[#6F7D6C] dark:text-[#9FB19B] mt-0.5">
                        آخر تقييم: {new Date(test.date).toLocaleDateString('ar-EG')} · الأخطاء: {test.errorsCount}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        onStartReviewSession(test.surahNumber, test.fromAyah, test.toAyah);
                        onClose();
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#52674B] text-white text-xs font-bold hover:bg-[#43553D] shadow-xs transition-all shrink-0"
                    >
                      <Play className="h-3.5 w-3.5" />
                      <span>بدء الاختبار الآن</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Scheduled Tests & History Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#2B3527] dark:text-[#F1F6F0] flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-[#52674B]" />
                <span>جدول المتابعة وسجل الجلسات ({reports.length})</span>
              </h3>
              {reports.length > 0 && (
                <button
                  onClick={onClearAllReports}
                  className="text-[11px] text-[#8C524B] hover:text-[#7A3B35] transition-colors flex items-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>مسح السجل</span>
                </button>
              )}
            </div>

            {reports.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-[#DDD3BF] dark:border-[#2A3728] bg-[#FDFCF9]/60 dark:bg-[#111710]/40 space-y-2">
                <Trophy className="h-8 w-8 text-[#52674B]/40 mx-auto" />
                <p className="text-xs text-[#6F7D6C] dark:text-[#9FB19B]">
                  لا توجد تقارير مسجلة بعد. عند إتمام تسميع أي مقدار ستظهر خيارات التقييم (متقن، متردد، متفلت) لجدولة المراجعة تلقائياً.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto p-1">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="p-3.5 rounded-2xl bg-[#FDFCF9] dark:bg-[#111710] border border-[#DDD3BF] dark:border-[#273525] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-[#52674B]/40 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-[#2B3527] dark:text-[#F1F6F0]">
                          سورة {report.surahName} ({report.fromAyah} - {report.toAyah})
                        </span>
                        {getRatingBadge(report.rating)}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[#6F7D6C] dark:text-[#9FB19B] flex-wrap">
                        <span>
                          تاريخ الحفظ: {new Date(report.date).toLocaleDateString('ar-EG')}
                        </span>
                        <span>·</span>
                        <span>الأخطاء: {report.errorsCount}</span>
                        <span>·</span>
                        {getDueTimeText(report.nextReviewDate, report.rating)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => {
                          onStartReviewSession(report.surahNumber, report.fromAyah, report.toAyah);
                          onClose();
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#ECE4D4] dark:bg-[#1F2A1E] hover:bg-[#E2D8C3] dark:hover:bg-[#283726] text-[#3D4D38] dark:text-[#C5D8C1] text-xs font-semibold border border-[#D5CABB] dark:border-[#2F3F2D] transition-colors"
                        title="إعادة اختبار هذا المقدار"
                      >
                        <Play className="h-3 w-3" />
                        <span>اختبار</span>
                      </button>

                      <button
                        onClick={() => onDeleteReport(report.id)}
                        className="p-1.5 text-[#8C524B]/70 hover:text-[#8C524B] rounded-lg transition-colors"
                        title="حذف هذا التقرير"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#DDD3BF] dark:border-[#2A3728] bg-[#EDE5D5] dark:bg-[#1B241A]">
          <span className="text-xs text-[#6F7D6C] dark:text-[#9FB19B]">
            نظام التكرار المتباعد لترسيخ القرآن الكريم
          </span>
          <button
            onClick={onClose}
            className="px-5 py-1.5 text-xs font-bold rounded-xl bg-[#52674B] text-white hover:bg-[#43553D] shadow-xs transition-all"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
