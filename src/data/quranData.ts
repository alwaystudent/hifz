import { SurahMeta, AyahItem, Reciter, RiwayahId, RiwayahMeta, AyahTiming } from '../types/quran';

export const RIWAYAT_LIST: RiwayahMeta[] = [
  {
    id: 'hafs',
    name: 'حفص عن عاصم',
    shortName: 'حفص',
    description: 'الرواية الأشهر في العالم الإسلامي برواية حفص عن عاصم الكوفي',
  },
  {
    id: 'warsh',
    name: 'ورش عن نافع',
    shortName: 'ورش',
    description: 'رواية الإمام ورش عن نافع المدني (المعتمدة في المغرب العربي وغرب إفريقيا)',
  },
  {
    id: 'qalun',
    name: 'قالون عن نافع',
    shortName: 'قالون',
    description: 'رواية الإمام قالون عن نافع المدني (المعتمدة في ليبيا وتونس وأجزاء من إفريقيا)',
  },
];

export const RECITERS: Reciter[] = [
  // ================= رواية حفص عن عاصم =================
  {
    id: 'husary_muallim',
    name: 'الشيخ محمود خليل الحصري',
    edition: 'المصحف المعلم · حفص',
    riwayah: 'hafs',
    subfolder: 'Husary_Muallim_128kbps',
    description: 'ترتيل هادئ متقن مع سكتات تعليمية نموذجية لضبط مخارج الحروف وأحكام التجويد',
  },
  {
    id: 'hudhaify',
    name: 'الشيخ علي بن عبد الرحمن الحذيفي',
    edition: 'المصحف المرتل · حفص',
    riwayah: 'hafs',
    subfolder: 'Hudhaify_128kbps',
    description: 'تلاوة متأنية رصينة بنبرة واضحة ومخارج فصيحة تناسب الحفظ والمراجعة',
  },
  {
    id: 'husary_murattal',
    name: 'الشيخ محمود خليل الحصري',
    edition: 'المصحف المرتل · حفص',
    riwayah: 'hafs',
    subfolder: 'Husary_128kbps',
    description: 'التلاوة المرتلة الأصلية لشيخ عموم المقارئ المصرية برواية حفص عن عاصم',
  },
  {
    id: 'minshawy_muallim',
    name: 'الشيخ محمد صديق المنشاوي',
    edition: 'المصحف المعلم · حفص',
    riwayah: 'hafs',
    subfolder: 'Minshawy_Teacher_128kbps',
    description: 'نبرة خاشعة مؤثرة مع أداء تعليمي دقيق ومتقن',
  },
  {
    id: 'alafasy',
    name: 'الشيخ مشاري راشد العفاسي',
    edition: 'المصحف المرتل · حفص',
    riwayah: 'hafs',
    subfolder: 'Alafasy_128kbps',
    description: 'صوت عذب ندي وتلاوة واضحة محببة للناشئة والحفاظ',
  },

  // ================= رواية ورش عن نافع =================
  {
    id: 'yassin_warsh',
    name: 'الشيخ ياسين الجزائري',
    edition: 'برواية ورش عن نافع',
    riwayah: 'warsh',
    subfolder: 'warsh/warsh_yassin_al_jazaery_64kbps',
    description: 'تلاوة تعليمية متقنة بأحكام ورش عن نافع مع وضوح المدود والإمالة والنقل',
  },
  {
    id: 'aldosary_warsh',
    name: 'الشيخ إبراهيم الدوسري',
    edition: 'برواية ورش عن نافع',
    riwayah: 'warsh',
    subfolder: 'warsh/warsh_ibrahim_aldosary_128kbps',
    description: 'ترتيل واضح رصين برواية ورش عن نافع من طريق الأزرق',
  },
  {
    id: 'abdulbasit_warsh',
    name: 'الشيخ عبد الباسط عبد الصمد',
    edition: 'برواية ورش عن نافع',
    riwayah: 'warsh',
    subfolder: 'warsh/warsh_Abdul_Basit_128kbps',
    description: 'تلاوة خاشعة مجودة للشيخ عبد الباسط برواية ورش عن نافع',
  },
  {
    id: 'husary_warsh',
    name: 'الشيخ محمود خليل الحصري',
    edition: 'برواية ورش عن نافع',
    riwayah: 'warsh',
    subfolder: 'mp3quran_warsh_husary',
    mp3QuranReadId: 120,
    mp3QuranFolderUrl: 'https://cdn.mp3quran.net/audio/mahmoud-husary/r3/',
    description: 'المصحف المرتل للشيخ الحصري برواية ورش عن نافع بمحاذاة الآيات الدقيقة',
  },

  // ================= رواية قالون عن نافع =================
  {
    id: 'hudhaify_qalun',
    name: 'الشيخ علي بن عبد الرحمن الحذيفي',
    edition: 'برواية قالون عن نافع',
    riwayah: 'qalun',
    subfolder: 'mp3quran_qalun_hudhaify',
    mp3QuranReadId: 75,
    mp3QuranFolderUrl: 'https://cdn.mp3quran.net/audio/ali-hudhaifi/r2/',
    description: 'تلاوة واضحة متأنية برواية قالون عن نافع المدني للشيخ علي الحذيفي',
  },
  {
    id: 'dokali_qalun',
    name: 'الشيخ الدوكالي محمد العالم',
    edition: 'برواية قالون عن نافع',
    riwayah: 'qalun',
    subfolder: 'mp3quran_qalun_dokali',
    mp3QuranReadId: 208,
    mp3QuranFolderUrl: 'https://cdn.mp3quran.net/audio/dokali-alim/r1/',
    description: 'تلاوة ليبية متقنة بأحكام رواية قالون عن نافع للشيخ الدوكالي محمد العالم',
  },
];

export const BASMALAH_HAFS = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';
export const BASMALAH_WARSH = 'بِسْمِ اِ۬للَّهِ اِ۬لرَّحْمَٰنِ اِ۬لرَّحِيمِ';

export const SURAHS_LIST: SurahMeta[] = [
  { number: 1, name: "الفاتحة", englishName: "Al-Faatiha", numberOfAyahs: 6, revelationType: "Meccan" },
  { number: 2, name: "البقرة", englishName: "Al-Baqara", numberOfAyahs: 286, revelationType: "Medinan" },
  { number: 3, name: "آل عمران", englishName: "Aal-i-Imraan", numberOfAyahs: 200, revelationType: "Medinan" },
  { number: 4, name: "النساء", englishName: "An-Nisaa", numberOfAyahs: 176, revelationType: "Medinan" },
  { number: 5, name: "المائدة", englishName: "Al-Maaida", numberOfAyahs: 120, revelationType: "Medinan" },
  { number: 6, name: "الأنعام", englishName: "Al-An'aam", numberOfAyahs: 165, revelationType: "Meccan" },
  { number: 7, name: "الأعراف", englishName: "Al-A'raaf", numberOfAyahs: 206, revelationType: "Meccan" },
  { number: 8, name: "الأنفال", englishName: "Al-Anfaal", numberOfAyahs: 75, revelationType: "Medinan" },
  { number: 9, name: "التوبة", englishName: "At-Tawba", numberOfAyahs: 129, revelationType: "Medinan" },
  { number: 10, name: "يونس", englishName: "Yunus", numberOfAyahs: 109, revelationType: "Meccan" },
  { number: 11, name: "هود", englishName: "Hud", numberOfAyahs: 123, revelationType: "Meccan" },
  { number: 12, name: "يوسف", englishName: "Yusuf", numberOfAyahs: 111, revelationType: "Meccan" },
  { number: 13, name: "الرعد", englishName: "Ar-Ra'd", numberOfAyahs: 43, revelationType: "Medinan" },
  { number: 14, name: "إبراهيم", englishName: "Ibrahim", numberOfAyahs: 52, revelationType: "Meccan" },
  { number: 15, name: "الحجر", englishName: "Al-Hijr", numberOfAyahs: 99, revelationType: "Meccan" },
  { number: 16, name: "النحل", englishName: "An-Nahl", numberOfAyahs: 128, revelationType: "Meccan" },
  { number: 17, name: "الإسراء", englishName: "Al-Israa", numberOfAyahs: 111, revelationType: "Meccan" },
  { number: 18, name: "الكهف", englishName: "Al-Kahf", numberOfAyahs: 110, revelationType: "Meccan" },
  { number: 19, name: "مريم", englishName: "Maryam", numberOfAyahs: 98, revelationType: "Meccan" },
  { number: 20, name: "طه", englishName: "Taa-Haa", numberOfAyahs: 135, revelationType: "Meccan" },
  { number: 21, name: "الأنبياء", englishName: "Al-Anbiyaa", numberOfAyahs: 112, revelationType: "Meccan" },
  { number: 22, name: "الحج", englishName: "Al-Hajj", numberOfAyahs: 78, revelationType: "Medinan" },
  { number: 23, name: "المؤمنون", englishName: "Al-Muminoon", numberOfAyahs: 118, revelationType: "Meccan" },
  { number: 24, name: "النور", englishName: "An-Noor", numberOfAyahs: 64, revelationType: "Medinan" },
  { number: 25, name: "الفرقان", englishName: "Al-Furqaan", numberOfAyahs: 77, revelationType: "Meccan" },
  { number: 26, name: "الشعراء", englishName: "Ash-Shu'araa", numberOfAyahs: 227, revelationType: "Meccan" },
  { number: 27, name: "النمل", englishName: "An-Naml", numberOfAyahs: 93, revelationType: "Meccan" },
  { number: 28, name: "القصص", englishName: "Al-Qasas", numberOfAyahs: 88, revelationType: "Meccan" },
  { number: 29, name: "العنكبوت", englishName: "Al-Ankaboot", numberOfAyahs: 69, revelationType: "Meccan" },
  { number: 30, name: "الروم", englishName: "Ar-Room", numberOfAyahs: 60, revelationType: "Meccan" },
  { number: 31, name: "لقمان", englishName: "Luqman", numberOfAyahs: 34, revelationType: "Meccan" },
  { number: 32, name: "السجدة", englishName: "As-Sajda", numberOfAyahs: 30, revelationType: "Meccan" },
  { number: 33, name: "الأحزاب", englishName: "Al-Ahzaab", numberOfAyahs: 73, revelationType: "Medinan" },
  { number: 34, name: "سبأ", englishName: "Saba", numberOfAyahs: 54, revelationType: "Meccan" },
  { number: 35, name: "فاطر", englishName: "Faatir", numberOfAyahs: 45, revelationType: "Meccan" },
  { number: 36, name: "يس", englishName: "Yaseen", numberOfAyahs: 83, revelationType: "Meccan" },
  { number: 37, name: "الصافات", englishName: "As-Saaffaat", numberOfAyahs: 182, revelationType: "Meccan" },
  { number: 38, name: "ص", englishName: "Saad", numberOfAyahs: 88, revelationType: "Meccan" },
  { number: 39, name: "الزمر", englishName: "Az-Zumar", numberOfAyahs: 75, revelationType: "Meccan" },
  { number: 40, name: "غافر", englishName: "Ghafir", numberOfAyahs: 85, revelationType: "Meccan" },
  { number: 41, name: "فصلت", englishName: "Fussilat", numberOfAyahs: 54, revelationType: "Meccan" },
  { number: 42, name: "الشورى", englishName: "Ash-Shura", numberOfAyahs: 53, revelationType: "Meccan" },
  { number: 43, name: "الزخرف", englishName: "Az-Zukhruf", numberOfAyahs: 89, revelationType: "Meccan" },
  { number: 44, name: "الدخان", englishName: "Ad-Dukhaan", numberOfAyahs: 59, revelationType: "Meccan" },
  { number: 45, name: "الجاثية", englishName: "Al-Jaathiya", numberOfAyahs: 37, revelationType: "Meccan" },
  { number: 46, name: "الأحقاف", englishName: "Al-Ahqaf", numberOfAyahs: 35, revelationType: "Meccan" },
  { number: 47, name: "محمد", englishName: "Muhammad", numberOfAyahs: 38, revelationType: "Medinan" },
  { number: 48, name: "الفتح", englishName: "Al-Fath", numberOfAyahs: 29, revelationType: "Medinan" },
  { number: 49, name: "الحجرات", englishName: "Al-Hujuraat", numberOfAyahs: 18, revelationType: "Medinan" },
  { number: 50, name: "ق", englishName: "Qaaf", numberOfAyahs: 45, revelationType: "Meccan" },
  { number: 51, name: "الذاريات", englishName: "Adh-Dhaariyat", numberOfAyahs: 60, revelationType: "Meccan" },
  { number: 52, name: "الطور", englishName: "At-Toor", numberOfAyahs: 49, revelationType: "Meccan" },
  { number: 53, name: "النجم", englishName: "An-Najm", numberOfAyahs: 62, revelationType: "Meccan" },
  { number: 54, name: "القمر", englishName: "Al-Qamar", numberOfAyahs: 55, revelationType: "Meccan" },
  { number: 55, name: "الرحمن", englishName: "Ar-Rahmaan", numberOfAyahs: 78, revelationType: "Medinan" },
  { number: 56, name: "الواقعة", englishName: "Al-Waaqia", numberOfAyahs: 96, revelationType: "Meccan" },
  { number: 57, name: "الحديد", englishName: "Al-Hadid", numberOfAyahs: 29, revelationType: "Medinan" },
  { number: 58, name: "المجادلة", englishName: "Al-Mujaadila", numberOfAyahs: 22, revelationType: "Medinan" },
  { number: 59, name: "الحشر", englishName: "Al-Hashr", numberOfAyahs: 24, revelationType: "Medinan" },
  { number: 60, name: "الممتحنة", englishName: "Al-Mumtahana", numberOfAyahs: 13, revelationType: "Medinan" },
  { number: 61, name: "الصف", englishName: "As-Saff", numberOfAyahs: 14, revelationType: "Medinan" },
  { number: 62, name: "الجمعة", englishName: "Al-Jumu'a", numberOfAyahs: 11, revelationType: "Medinan" },
  { number: 63, name: "المنافقون", englishName: "Al-Munaafiqoon", numberOfAyahs: 11, revelationType: "Medinan" },
  { number: 64, name: "التغابن", englishName: "At-Taghaabun", numberOfAyahs: 18, revelationType: "Medinan" },
  { number: 65, name: "الطلاق", englishName: "At-Talaaq", numberOfAyahs: 12, revelationType: "Medinan" },
  { number: 66, name: "التحريم", englishName: "At-Tahrim", numberOfAyahs: 12, revelationType: "Medinan" },
  { number: 67, name: "الملك", englishName: "Al-Mulk", numberOfAyahs: 30, revelationType: "Meccan" },
  { number: 68, name: "القلم", englishName: "Al-Qalam", numberOfAyahs: 52, revelationType: "Meccan" },
  { number: 69, name: "الحاقة", englishName: "Al-Haaqqa", numberOfAyahs: 52, revelationType: "Meccan" },
  { number: 70, name: "المعارج", englishName: "Al-Ma'aarij", numberOfAyahs: 44, revelationType: "Meccan" },
  { number: 71, name: "نوح", englishName: "Nooh", numberOfAyahs: 28, revelationType: "Meccan" },
  { number: 72, name: "الجن", englishName: "Al-Jinn", numberOfAyahs: 28, revelationType: "Meccan" },
  { number: 73, name: "المزمل", englishName: "Al-Muzzammil", numberOfAyahs: 20, revelationType: "Meccan" },
  { number: 74, name: "المدثر", englishName: "Al-Muddaththir", numberOfAyahs: 56, revelationType: "Meccan" },
  { number: 75, name: "القيامة", englishName: "Al-Qiyaama", numberOfAyahs: 40, revelationType: "Meccan" },
  { number: 76, name: "الإنسان", englishName: "Al-Insaan", numberOfAyahs: 31, revelationType: "Medinan" },
  { number: 77, name: "المرسلات", englishName: "Al-Mursalaat", numberOfAyahs: 50, revelationType: "Meccan" },
  { number: 78, name: "النبأ", englishName: "An-Naba", numberOfAyahs: 40, revelationType: "Meccan" },
  { number: 79, name: "النازعات", englishName: "An-Naazi'aat", numberOfAyahs: 46, revelationType: "Meccan" },
  { number: 80, name: "عبس", englishName: "Abasa", numberOfAyahs: 42, revelationType: "Meccan" },
  { number: 81, name: "التكوير", englishName: "At-Takwir", numberOfAyahs: 29, revelationType: "Meccan" },
  { number: 82, name: "الانفطار", englishName: "Al-Infitaar", numberOfAyahs: 19, revelationType: "Meccan" },
  { number: 83, name: "المطففين", englishName: "Al-Mutaffifin", numberOfAyahs: 36, revelationType: "Meccan" },
  { number: 84, name: "الانشقاق", englishName: "Al-Inshiqaaq", numberOfAyahs: 25, revelationType: "Meccan" },
  { number: 85, name: "البروج", englishName: "Al-Burooj", numberOfAyahs: 22, revelationType: "Meccan" },
  { number: 86, name: "الطارق", englishName: "At-Taariq", numberOfAyahs: 17, revelationType: "Meccan" },
  { number: 87, name: "الأعلى", englishName: "Al-A'laa", numberOfAyahs: 19, revelationType: "Meccan" },
  { number: 88, name: "الغاشية", englishName: "Al-Ghaashiya", numberOfAyahs: 26, revelationType: "Meccan" },
  { number: 89, name: "الفجر", englishName: "Al-Fajr", numberOfAyahs: 30, revelationType: "Meccan" },
  { number: 90, name: "البلد", englishName: "Al-Balad", numberOfAyahs: 20, revelationType: "Meccan" },
  { number: 91, name: "الشمس", englishName: "Ash-Shams", numberOfAyahs: 15, revelationType: "Meccan" },
  { number: 92, name: "الليل", englishName: "Al-Lail", numberOfAyahs: 21, revelationType: "Meccan" },
  { number: 93, name: "الضحى", englishName: "Ad-Duhaa", numberOfAyahs: 11, revelationType: "Meccan" },
  { number: 94, name: "الشرح", englishName: "Ash-Sharh", numberOfAyahs: 8, revelationType: "Meccan" },
  { number: 95, name: "التين", englishName: "At-Teen", numberOfAyahs: 8, revelationType: "Meccan" },
  { number: 96, name: "العلق", englishName: "Al-Alaq", numberOfAyahs: 19, revelationType: "Meccan" },
  { number: 97, name: "القدر", englishName: "Al-Qadr", numberOfAyahs: 5, revelationType: "Meccan" },
  { number: 98, name: "البينة", englishName: "Al-Bayyina", numberOfAyahs: 8, revelationType: "Medinan" },
  { number: 99, name: "الزلزلة", englishName: "Az-Zalzala", numberOfAyahs: 8, revelationType: "Medinan" },
  { number: 100, name: "العاديات", englishName: "Al-Aadiyat", numberOfAyahs: 11, revelationType: "Meccan" },
  { number: 101, name: "القارعة", englishName: "Al-Qaari'a", numberOfAyahs: 11, revelationType: "Meccan" },
  { number: 102, name: "التكاثر", englishName: "At-Takaathur", numberOfAyahs: 8, revelationType: "Meccan" },
  { number: 103, name: "العصر", englishName: "Al-Asr", numberOfAyahs: 3, revelationType: "Meccan" },
  { number: 104, name: "الهمزة", englishName: "Al-Humaza", numberOfAyahs: 9, revelationType: "Meccan" },
  { number: 105, name: "الفيل", englishName: "Al-Feel", numberOfAyahs: 5, revelationType: "Meccan" },
  { number: 106, name: "قريش", englishName: "Quraish", numberOfAyahs: 4, revelationType: "Meccan" },
  { number: 107, name: "الماعون", englishName: "Al-Maa'oon", numberOfAyahs: 7, revelationType: "Meccan" },
  { number: 108, name: "الكوثر", englishName: "Al-Kawthar", numberOfAyahs: 3, revelationType: "Meccan" },
  { number: 109, name: "الكافرون", englishName: "Al-Kaafiroon", numberOfAyahs: 6, revelationType: "Meccan" },
  { number: 110, name: "النصر", englishName: "An-Nasr", numberOfAyahs: 3, revelationType: "Medinan" },
  { number: 111, name: "المسد", englishName: "Al-Masad", numberOfAyahs: 5, revelationType: "Meccan" },
  { number: 112, name: "الإخلاص", englishName: "Al-Ikhlaas", numberOfAyahs: 4, revelationType: "Meccan" },
  { number: 113, name: "الفلق", englishName: "Al-Falaq", numberOfAyahs: 5, revelationType: "Meccan" },
  { number: 114, name: "الناس", englishName: "An-Naas", numberOfAyahs: 6, revelationType: "Meccan" },
];

// High-fidelity pre-bundled Surahs (King Fahd Complex QPC Uthmani script + Medina Mushaf pages)
export const BUNDLED_SURAHS: Record<number, AyahItem[]> = {
  // 1: Al-Fatihah (Basmalah rendered independently above; Ayah 1 starts at Al-Hamdu lillah)
  1: [
    { number: 2, numberInSurah: 1, pageNumber: 1, juzNumber: 1, text: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ" },
    { number: 3, numberInSurah: 2, pageNumber: 1, juzNumber: 1, text: "ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ" },
    { number: 4, numberInSurah: 3, pageNumber: 1, juzNumber: 1, text: "مَـٰلِكِ يَوْمِ ٱلدِّينِ" },
    { number: 5, numberInSurah: 4, pageNumber: 1, juzNumber: 1, text: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ" },
    { number: 6, numberInSurah: 5, pageNumber: 1, juzNumber: 1, text: "ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ" },
    { number: 7, numberInSurah: 6, pageNumber: 1, juzNumber: 1, text: "صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ" },
  ],
  // 112: Al-Ikhlas
  112: [
    { number: 6222, numberInSurah: 1, pageNumber: 604, juzNumber: 30, text: "قُلْ هُوَ ٱللَّهُ أَحَدٌ" },
    { number: 6223, numberInSurah: 2, pageNumber: 604, juzNumber: 30, text: "ٱللَّهُ ٱلصَّمَدُ" },
    { number: 6224, numberInSurah: 3, pageNumber: 604, juzNumber: 30, text: "لَمْ يَلِدْ وَلَمْ يُولَدْ" },
    { number: 6225, numberInSurah: 4, pageNumber: 604, juzNumber: 30, text: "وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ" },
  ],
  // 113: Al-Falaq
  113: [
    { number: 6226, numberInSurah: 1, pageNumber: 604, juzNumber: 30, text: "قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ" },
    { number: 6227, numberInSurah: 2, pageNumber: 604, juzNumber: 30, text: "مِن شَرِّ مَا خَلَقَ" },
    { number: 6228, numberInSurah: 3, pageNumber: 604, juzNumber: 30, text: "وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ" },
    { number: 6229, numberInSurah: 4, pageNumber: 604, juzNumber: 30, text: "وَمِن شَرِّ ٱلنَّفَّـٰثَـٰتِ فِى ٱلْعُقَدِ" },
    { number: 6230, numberInSurah: 5, pageNumber: 604, juzNumber: 30, text: "وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ" },
  ],
  // 114: An-Nas
  114: [
    { number: 6231, numberInSurah: 1, pageNumber: 604, juzNumber: 30, text: "قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ" },
    { number: 6232, numberInSurah: 2, pageNumber: 604, juzNumber: 30, text: "مَلِكِ ٱلنَّاسِ" },
    { number: 6233, numberInSurah: 3, pageNumber: 604, juzNumber: 30, text: "إِلَـٰهِ ٱلنَّاسِ" },
    { number: 6234, numberInSurah: 4, pageNumber: 604, juzNumber: 30, text: "مِن شَرِّ ٱلْوَسْوَاسِ ٱلْخَنَّاسِ" },
    { number: 6235, numberInSurah: 5, pageNumber: 604, juzNumber: 30, text: "ٱلَّذِى يُوَسْوِسُ فِى صُدُورِ ٱلنَّاسِ" },
    { number: 6236, numberInSurah: 6, pageNumber: 604, juzNumber: 30, text: "مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ" },
  ],
  // 67: Al-Mulk (first 10 ayahs bundled)
  67: [
    { number: 5242, numberInSurah: 1, pageNumber: 562, juzNumber: 29, text: "تَبَـٰرَكَ ٱلَّذِى بِيَدِهِ ٱلْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَىْءٍ قَدِيرٌ" },
    { number: 5243, numberInSurah: 2, pageNumber: 562, juzNumber: 29, text: "ٱلَّذِى خَلَقَ ٱلْمَوْتَ وَٱلْحَيَوٰةَ لِيَبْلُوَكُمْ أَيُّكُمْ أَحْسَنُ عَمَلًا ۚ وَهُوَ ٱلْعَزِيزُ ٱلْغَفُورُ" },
    { number: 5244, numberInSurah: 3, pageNumber: 562, juzNumber: 29, text: "ٱلَّذِى خَلَقَ سَبْعَ سَمَـٰوَٰتٍ طِبَاقًا ۖ مَّا تَرَىٰ فِى خَلْقِ ٱلرَّحْمَـٰنِ مِن تَفَـٰوُتٍ ۖ فَٱرْجِعِ ٱلْبَصَرَ هَلْ تَرَىٰ مِن فُطُورٍ" },
    { number: 5245, numberInSurah: 4, pageNumber: 562, juzNumber: 29, text: "ثُمَّ ٱرْجِعِ ٱلْبَصَرَ كَرَّتَيْنِ يَنقَلِبْ إِلَيْكَ ٱلْبَصَرُ خَاسِئًا وَهُوَ حَسِيرٌ" },
    { number: 5246, numberInSurah: 5, pageNumber: 562, juzNumber: 29, text: "وَلَقَدْ زَيَّنَّا ٱلسَّمَآءَ ٱلدُّنْيَا بِمَصَـٰبِيحَ وَجَعَلْنَـٰهَا رُجُومًا لِّلشَّيَـٰطِينِ ۖ وَأَعْتَدْنَا لَهُمْ عَذَابَ ٱلسَّعِيرِ" },
    { number: 5247, numberInSurah: 6, pageNumber: 562, juzNumber: 29, text: "وَلِلَّذِينَ كَفَرُوا۟ بِرَبِّهِمْ عَذَابُ جَهَنَّمَ ۖ وَبِئْسَ ٱلْمَصِيرُ" },
    { number: 5248, numberInSurah: 7, pageNumber: 562, juzNumber: 29, text: "إِذَآ أُلْقُوا۟ فِيهَا سَمِعُوا۟ لَهَا شَهِيقًا وَهِىَ تَفُورُ" },
    { number: 5249, numberInSurah: 8, pageNumber: 562, juzNumber: 29, text: "تَكَادُ تَمَيَّزُ مِنَ ٱلْغَيْظِ ۖ كُلَّمَآ أُلْقِىَ فِيهَا فَوْجٌ سَأَلَهُمْ خَزَنَتُهَآ أَلَمْ يَأْتِكُمْ نَذِيرٌ" },
    { number: 5250, numberInSurah: 9, pageNumber: 562, juzNumber: 29, text: "قَالُوا۟ بَلَىٰ قَدْ جَآءَنَا نَذِيرٌ فَكَذَّبْنَا وَقُلْنَا مَا نَزَّلَ ٱللَّهُ مِن شَىْءٍ إِنْ أَنتُمْ إِلَّا فِى ضَلَـٰلٍ كَبِيرٍ" },
    { number: 5251, numberInSurah: 10, pageNumber: 562, juzNumber: 29, text: "وَقَالُوا۟ لَوْ كُنَّا نَسْمَعُ أَوْ نَعْقِلُ مَا كُنَّا فِىٓ أَصْحَـٰبِ ٱلسَّعِيرِ" },
  ],
  // 108: Al-Kawthar
  108: [
    { number: 6205, numberInSurah: 1, pageNumber: 602, juzNumber: 30, text: "إِنَّآ أَعْطَيْنَـٰكَ ٱلْكَوْثَرَ" },
    { number: 6206, numberInSurah: 2, pageNumber: 602, juzNumber: 30, text: "فَصَلِّ لِرَبِّكَ وَٱنْحَرْ" },
    { number: 6207, numberInSurah: 3, pageNumber: 602, juzNumber: 30, text: "إِنَّ شَانِئَكَ هُوَ ٱلْأَبْتَرُ" },
  ],
  // 103: Al-Asr
  103: [
    { number: 6177, numberInSurah: 1, pageNumber: 601, juzNumber: 30, text: "وَٱلْعَصْرِ" },
    { number: 6178, numberInSurah: 2, pageNumber: 601, juzNumber: 30, text: "إِنَّ ٱلْإِنسَـٰنَ لَفِى خُسْرٍ" },
    { number: 6179, numberInSurah: 3, pageNumber: 601, juzNumber: 30, text: "إِلَّا ٱلَّذِينَ ءَامَنُوا۟ وَعَمِلُوا۟ ٱلصَّـٰلِحَـٰتِ وَتَوَاصَوْا۟ بِٱلْحَقِّ وَتَوَاصَوْا۟ بِٱلصَّبْرِ" },
  ],
  // 97: Al-Qadr
  97: [
    { number: 6125, numberInSurah: 1, pageNumber: 598, juzNumber: 30, text: "إِنَّآ أَنزَلْنَـٰهُ فِى لَيْلَةِ ٱلْقَدْرِ" },
    { number: 6126, numberInSurah: 2, pageNumber: 598, juzNumber: 30, text: "وَمَآ أَدْرَىٰكَ مَا لَيْلَةُ ٱلْقَدْرِ" },
    { number: 6127, numberInSurah: 3, pageNumber: 598, juzNumber: 30, text: "لَيْلَةُ ٱلْقَدْرِ خَيْرٌ مِّنْ أَلْفِ شَهْرٍ" },
    { number: 6128, numberInSurah: 4, pageNumber: 598, juzNumber: 30, text: "تَنَزَّلُ ٱلْمَلَـٰٓئِكَةُ وَٱلرُّوحُ فِيهَا بِإِذْنِ رَبِّهِم مِّن كُلِّ أَمْرٍ" },
    { number: 6129, numberInSurah: 5, pageNumber: 598, juzNumber: 30, text: "سَلَـٰمٌ هِىَ حَتَّىٰ مَطْلَعِ ٱلْفَجْرِ" },
  ]
};

export const BUNDLED_SURAHS_WARSH: Record<number, AyahItem[]> = {
  1: [
    { number: 2, numberInSurah: 1, pageNumber: 1, juzNumber: 1, text: "اِ۬لْحَمْدُ لِلهِ رَبِّ اِ۬لْعَٰلَمِينَ" },
    { number: 3, numberInSurah: 2, pageNumber: 1, juzNumber: 1, text: "اَ۬لرَّحْمَٰنِ اِ۬لرَّحِيمِ" },
    { number: 4, numberInSurah: 3, pageNumber: 1, juzNumber: 1, text: "مَلِكِ يَوْمِ اِ۬لدِّينِۖ" },
    { number: 5, numberInSurah: 4, pageNumber: 1, juzNumber: 1, text: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُۖ" },
    { number: 6, numberInSurah: 5, pageNumber: 1, juzNumber: 1, text: "اُ۪هْدِنَا اَ۬لصِّرَٰطَ اَ۬لْمُسْتَقِيمَ" },
    { number: 7, numberInSurah: 6, pageNumber: 1, juzNumber: 1, text: "صِرَٰطَ اَ۬لذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ اِ۬لْمَغْضُوبِ عَلَيْهِمْ وَلَا اَ۬لضَّآلِّينَۖ" },
  ],
  112: [
    { number: 6222, numberInSurah: 1, pageNumber: 604, juzNumber: 30, text: "قُلْ هُوَ اَ۬للَّهُ أَحَدٌۖ" },
    { number: 6223, numberInSurah: 2, pageNumber: 604, juzNumber: 30, text: "اِ۬للَّهُ اُ۬لصَّمَدُۖ" },
    { number: 6224, numberInSurah: 3, pageNumber: 604, juzNumber: 30, text: "لَمْ يَلِدْ وَلَمْ يُولَدْۖ" },
    { number: 6225, numberInSurah: 4, pageNumber: 604, juzNumber: 30, text: "وَلَمْ يَكُن لَّهُۥ كُفُؤاً اَحَدࣱۖ" },
  ],
};

// Memory caches keyed by `${riwayah}_${surahNumber}`
const memoryCache: Record<string, AyahItem[]> = {};
const timingCache: Record<string, AyahTiming[]> = {};

/**
 * Strips leading Bismillah if bundled inline in Ayah 1 (Basmalah is rendered independently above)
 */
function cleanBismillah(text: string, surahNumber: number): string {
  if (surahNumber === 1 || surahNumber === 9) return text.replace(/\u200F|\u200E/g, '').trim();
  const cleaned = text.replace(/\u200F|\u200E/g, '').trim();
  const patterns = [
    "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
    "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ",
    "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
    "بِسْمِ اِ۬للَّهِ اِ۬لرَّحْمَٰنِ اِ۬لرَّحِيمِ",
  ];
  for (const p of patterns) {
    if (cleaned.startsWith(p)) {
      return cleaned.replace(p, '').trim();
    }
  }
  return cleaned;
}

/**
 * For Al-Fatihah (Surah 1), renders Basmalah independently above and starts Ayah 1 at "الحمد لله رب العالمين"
 */
function normalizeSurah1Fatihah(ayahs: AyahItem[]): AyahItem[] {
  if (ayahs.length === 7 && ayahs[0]?.text) {
    const plain = ayahs[0].text.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u200E\u200F]/g, '');
    if (plain.includes('بسم') && plain.includes('الرحيم')) {
      return ayahs.slice(1).map((item, idx) => ({
        ...item,
        numberInSurah: idx + 1,
      }));
    }
  }
  return ayahs;
}

/**
 * Fetches Medina Mushaf (King Fahd Complex) page numbers & QPC Uthmani script via Quran.com API v4
 */
async function fetchKingFahdComplexSurah(surahNumber: number): Promise<AyahItem[] | null> {
  try {
    const url = `https://api.quran.com/api/v4/verses/by_chapter/${surahNumber}?words=false&fields=text_uthmani,page_number,juz_number&per_page=300`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const json = await response.json();
    if (!Array.isArray(json.verses) || json.verses.length === 0) return null;

    const ayahs: AyahItem[] = json.verses.map((v: any, idx: number) => ({
      number: v.id || idx + 1,
      numberInSurah: v.verse_number || idx + 1,
      pageNumber: typeof v.page_number === 'number' ? v.page_number : undefined,
      juzNumber: typeof v.juz_number === 'number' ? v.juz_number : undefined,
      text: cleanBismillah(String(v.text_uthmani || '').trim(), surahNumber),
    }));

    return surahNumber === 1 ? normalizeSurah1Fatihah(ayahs) : ayahs;
  } catch (err) {
    console.warn(`King Fahd Complex / Quran.com v4 fetch failed for surah ${surahNumber}:`, err);
    return null;
  }
}

/**
 * Fetches all ayahs for a given Surah and Riwayah (hafs | warsh | qalun)
 * with King Fahd Complex (مجمع الملك فهد) as primary trusted source + multi-tier caching.
 */
export async function fetchSurahAyahs(
  surahNumber: number,
  riwayah: RiwayahId = 'hafs'
): Promise<AyahItem[]> {
  const cacheKey = `${riwayah}_${surahNumber}`;

  // 1. Check in-memory cache
  if (memoryCache[cacheKey] && memoryCache[cacheKey].length > 0) {
    return memoryCache[cacheKey];
  }

  // 2. Check bundled surahs (note: Surah 67 bundled only has first 10 ayahs; use full fetch if all ayahs needed)
  if (riwayah === 'hafs' && BUNDLED_SURAHS[surahNumber] && surahNumber !== 67) {
    memoryCache[cacheKey] = BUNDLED_SURAHS[surahNumber];
    return BUNDLED_SURAHS[surahNumber];
  }
  if ((riwayah === 'warsh' || riwayah === 'qalun') && BUNDLED_SURAHS_WARSH[surahNumber]) {
    memoryCache[cacheKey] = BUNDLED_SURAHS_WARSH[surahNumber];
    return BUNDLED_SURAHS_WARSH[surahNumber];
  }

  // 3. Check localStorage cache (v2 includes King Fahd Complex pageNumber & Fatiha Ayah 1 fix)
  const storageKey = `quran_surah_${surahNumber}_${riwayah}_v2`;
  try {
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        const parsed: AyahItem[] = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryCache[cacheKey] = parsed;
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('LocalStorage read error:', err);
  }

  // 4. Fetch authentic Warsh or Qalun edition + enrich with Medina Mushaf page numbers
  if (riwayah === 'warsh' || riwayah === 'qalun') {
    const editionSlug = riwayah === 'warsh' ? 'ara-quranwarsh' : 'ara-quranqaloon';
    try {
      const [editionResp, qpcAyahs] = await Promise.all([
        fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/${editionSlug}/${surahNumber}.json`),
        fetchKingFahdComplexSurah(surahNumber),
      ]);
      if (editionResp.ok) {
        const json = await editionResp.json();
        if (Array.isArray(json.chapter) && json.chapter.length > 0) {
          let ayahs: AyahItem[] = json.chapter.map((v: any, idx: number) => ({
            number: idx + 1,
            numberInSurah: v.verse || idx + 1,
            text: cleanBismillah(String(v.text || ''), surahNumber),
          }));
          if (surahNumber === 1) {
            ayahs = normalizeSurah1Fatihah(ayahs);
          }
          if (qpcAyahs && qpcAyahs.length === ayahs.length) {
            ayahs = ayahs.map((a, idx) => ({
              ...a,
              pageNumber: qpcAyahs[idx]?.pageNumber,
              juzNumber: qpcAyahs[idx]?.juzNumber,
            }));
          }
          memoryCache[cacheKey] = ayahs;
          try {
            localStorage.setItem(storageKey, JSON.stringify(ayahs));
          } catch {}
          return ayahs;
        }
      }
    } catch (err) {
      console.warn(`Failed ${riwayah} edition fetch, trying King Fahd Complex Hafs fallback:`, err);
    }
  }

  // 5. Primary Trusted Source: King Fahd Complex QPC Uthmani (Quran.com API v4)
  const qpcAyahs = await fetchKingFahdComplexSurah(surahNumber);
  if (qpcAyahs && qpcAyahs.length > 0) {
    memoryCache[cacheKey] = qpcAyahs;
    try {
      localStorage.setItem(storageKey, JSON.stringify(qpcAyahs));
    } catch {}
    return qpcAyahs;
  }

  // 6. Fallback Source: Al-Quran Cloud Uthmani (with page & juz metadata)
  try {
    const urls = [
      `https://api.alquran.cloud/v1/surah/${surahNumber}/quran-uthmani`,
      `https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-uthmani`,
    ];

    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const json = await response.json();
          let rawAyahs: any[] = [];

          if (Array.isArray(json.data) && json.data.length > 0 && Array.isArray(json.data[0].ayahs)) {
            rawAyahs = json.data[0].ayahs;
          } else if (json.data && Array.isArray(json.data.ayahs)) {
            rawAyahs = json.data.ayahs;
          }

          if (rawAyahs.length > 0) {
            let ayahs: AyahItem[] = rawAyahs.map((a: any, idx: number) => ({
              number: a.number || idx + 1,
              numberInSurah: a.numberInSurah || idx + 1,
              pageNumber: typeof a.page === 'number' ? a.page : undefined,
              juzNumber: typeof a.juz === 'number' ? a.juz : undefined,
              text: cleanBismillah(a.text || '', surahNumber),
            }));
            if (surahNumber === 1) {
              ayahs = normalizeSurah1Fatihah(ayahs);
            }

            memoryCache[cacheKey] = ayahs;
            try {
              localStorage.setItem(storageKey, JSON.stringify(ayahs));
            } catch {}
            return ayahs;
          }
        }
      } catch (innerErr) {
        console.warn(`Failed endpoint ${url}:`, innerErr);
      }
    }
  } catch (err) {
    console.warn(`AlQuran Cloud API error for surah ${surahNumber}:`, err);
  }

  if (BUNDLED_SURAHS[surahNumber]) {
    return BUNDLED_SURAHS[surahNumber];
  }

  throw new Error(`تعذر تحميل آيات السورة رقم ${surahNumber}`);
}

/**
 * Fetches millisecond-accurate Ayah timings from mp3quran.net for Qalun & timed Warsh reciters
 */
export async function fetchAyahTimings(
  readId: number,
  surahNumber: number
): Promise<AyahTiming[]> {
  const cacheKey = `${readId}_${surahNumber}`;
  if (timingCache[cacheKey]) {
    return timingCache[cacheKey];
  }

  const storageKey = `quran_timings_${cacheKey}`;
  try {
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        const parsed: AyahTiming[] = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          timingCache[cacheKey] = parsed;
          return parsed;
        }
      }
    }
  } catch {
    // ignore storage read errors
  }

  const url = `https://www.mp3quran.net/api/v3/ayat_timing?surah=${surahNumber}&read=${readId}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`تعذر تحميل توقيت الآيات للقارئ (${readId})`);
  }
  const data = await response.json();
  if (!Array.isArray(data)) return [];

  const timings: AyahTiming[] = data
    .filter((item: any) => typeof item.ayah === 'number' && typeof item.start_time === 'number' && typeof item.end_time === 'number')
    .map((item: any) => ({
      ayah: item.ayah,
      start_time: item.start_time,
      end_time: item.end_time,
    }));

  timingCache[cacheKey] = timings;
  try {
    localStorage.setItem(storageKey, JSON.stringify(timings));
  } catch {
    // ignore
  }
  return timings;
}
