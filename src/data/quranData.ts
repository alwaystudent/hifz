import { SurahMeta, AyahItem, Reciter } from '../types/quran';

export const RECITERS: Reciter[] = [
  {
    id: 'husary_muallim',
    name: 'الشيخ محمود خليل الحصري',
    edition: 'المصحف المعلم',
    subfolder: 'Husary_Muallim_128kbps',
    description: 'ترتيل هادئ متقن مع سكتات تعليمية نموذجية لضبط مخارج الحروف وأحكام التجويد',
  },
  {
    id: 'hudhaify',
    name: 'الشيخ علي بن عبد الرحمن الحذيفي',
    edition: 'المصحف المرتل',
    subfolder: 'Hudhaify_128kbps',
    description: 'تلاوة متأنية رصينة بنبرة واضحة ومخارج فصيحة تناسب الحفظ والمراجعة',
  },
  {
    id: 'husary_murattal',
    name: 'الشيخ محمود خليل الحصري',
    edition: 'المصحف المرتل',
    subfolder: 'Husary_128kbps',
    description: 'التلاوة المرتلة الأصلية لشيخ عموم المقارئ المصرية برواية حفص عن عاصم',
  },
  {
    id: 'minshawy_muallim',
    name: 'الشيخ محمد صديق المنشاوي',
    edition: 'المصحف المعلم',
    subfolder: 'Minshawy_Teacher_128kbps',
    description: 'نبرة خاشعة مؤثرة مع أداء تعليمي دقيق ومتقن',
  },
  {
    id: 'alafasy',
    name: 'الشيخ مشاري راشد العفاسي',
    edition: 'المصحف المرتل',
    subfolder: 'Alafasy_128kbps',
    description: 'صوت عذب ندي وتلاوة واضحة محببة للناشئة والحفاظ',
  },
];

export const SURAHS_LIST: SurahMeta[] = [
  { number: 1, name: "الفاتحة", englishName: "Al-Faatiha", numberOfAyahs: 7, revelationType: "Meccan" },
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

// High-fidelity pre-bundled Surahs for instant zero-latency loading
export const BUNDLED_SURAHS: Record<number, AyahItem[]> = {
  // 1: Al-Fatihah
  1: [
    { number: 1, numberInSurah: 1, text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ" },
    { number: 2, numberInSurah: 2, text: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ" },
    { number: 3, numberInSurah: 3, text: "الرَّحْمَٰنِ الرَّحِيمِ" },
    { number: 4, numberInSurah: 4, text: "مَالِكِ يَوْمِ الدِّينِ" },
    { number: 5, numberInSurah: 5, text: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ" },
    { number: 6, numberInSurah: 6, text: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ" },
    { number: 7, numberInSurah: 7, text: "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ" },
  ],
  // 112: Al-Ikhlas
  112: [
    { number: 6222, numberInSurah: 1, text: "قُلْ هُوَ اللَّهُ أَحَدٌ" },
    { number: 6223, numberInSurah: 2, text: "اللَّهُ الصَّمَدُ" },
    { number: 6224, numberInSurah: 3, text: "لَمْ يَلِدْ وَلَمْ يُولَدْ" },
    { number: 6225, numberInSurah: 4, text: "وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ" },
  ],
  // 113: Al-Falaq
  113: [
    { number: 6226, numberInSurah: 1, text: "قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ" },
    { number: 6227, numberInSurah: 2, text: "مِنْ شَرِّ مَا خَلَقَ" },
    { number: 6228, numberInSurah: 3, text: "وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ" },
    { number: 6229, numberInSurah: 4, text: "وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ" },
    { number: 6230, numberInSurah: 5, text: "وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ" },
  ],
  // 114: An-Nas
  114: [
    { number: 6231, numberInSurah: 1, text: "قُلْ أَعُوذُ بِرَبِّ النَّاسِ" },
    { number: 6232, numberInSurah: 2, text: "مَلِكِ النَّاسِ" },
    { number: 6233, numberInSurah: 3, text: "إِلَٰهِ النَّاسِ" },
    { number: 6234, numberInSurah: 4, text: "مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ" },
    { number: 6235, numberInSurah: 5, text: "الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ" },
    { number: 6236, numberInSurah: 6, text: "مِنَ الْجِنَّةِ وَالنَّاسِ" },
  ],
  // 67: Al-Mulk (first 10 ayahs bundled)
  67: [
    { number: 5242, numberInSurah: 1, text: "تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ" },
    { number: 5243, numberInSurah: 2, text: "الَّذِي خَلَقَ الْمَوْتَ وَالْحَيَاةَ لِيَبْلُوَكُمْ أَيُّكُمْ أَحْسَنُ عَمَلًا وَهُوَ الْعَزِيزُ الْغَفُورُ" },
    { number: 5244, numberInSurah: 3, text: "الَّذِي خَلَقَ سَبْعَ سَمَاوَاتٍ طِبَاقًا مَّا تَرَىٰ فِي خَلْقِ الرَّحْمَٰنِ مِن تَفَاوُتٍ فَارْجِعِ الْبَصَرَ هَلْ تَرَىٰ مِن فُطُورٍ" },
    { number: 5245, numberInSurah: 4, text: "ثُمَّ ارْجِعِ الْبَصَرَ كَرَّتَيْنِ يَنقَلِبْ إِلَيْكَ الْبَصَرُ خَاسِئًا وَهُوَ حَسِيرٌ" },
    { number: 5246, numberInSurah: 5, text: "وَلَقَدْ زَيَّنَّا السَّمَاءَ الدُّنْيَا بِمَصَابِيحَ وَجَعَلْنَاهَا رُجُومًا لِّلشَّيَاطِينِ وَأَعْتَدْنَا لَهُمْ عَذَابَ السَّعِيرِ" },
    { number: 5247, numberInSurah: 6, text: "وَلِلَّذِينَ كَفَرُوا بِرَبِّهِمْ عَذَابُ جَهَنَّمَ وَبِئْسَ الْمَصِيرُ" },
    { number: 5248, numberInSurah: 7, text: "إِذَا أُلْقُوا فِيهَا سَمِعُوا لَهَا شَهِيقًا وَهِيَ تَفُورُ" },
    { number: 5249, numberInSurah: 8, text: "تَكَادُ تَمَيَّزُ مِنَ الْغَيْظِ كُلَّمَا أُلْقِيَ فِيهَا فَوْجٌ سَأَلَهُمْ خَزَنَتُهَا أَلَمْ يَأْتِكُمْ نَذِيرٌ" },
    { number: 5250, numberInSurah: 9, text: "قَالُوا بَلَىٰ قَدْ جَاءَنَا نَذِيرٌ فَكَذَّبْنَا وَقُلْنَا مَا نَزَّلَ اللَّهُ مِن شَيْءٍ إِنْ أَنتُمْ إِلَّا فِي ضَلَالٍ كَبِيرٍ" },
    { number: 5251, numberInSurah: 10, text: "وَقَالُوا لَوْ كُنَّا نَسْمَعُ أَوْ نَعْقِلُ مَا كُنَّا فِي أَصْحَابِ السَّعِيرِ" },
  ],
  // 108: Al-Kawthar
  108: [
    { number: 6205, numberInSurah: 1, text: "إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ" },
    { number: 6206, numberInSurah: 2, text: "فَصَلِّ لِرَبِّكَ وَانْحَرْ" },
    { number: 6207, numberInSurah: 3, text: "إِنَّ شَانِئَكَ هُوَ الْأَبْتَرُ" },
  ],
  // 103: Al-Asr
  103: [
    { number: 6177, numberInSurah: 1, text: "وَالْعَصْرِ" },
    { number: 6178, numberInSurah: 2, text: "إِنَّ الْإِنسَانَ لَفِي خُسْرٍ" },
    { number: 6179, numberInSurah: 3, text: "إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ وَتَوَاصَوْا بِالْحَقِّ وَتَوَاصَوْا بِالصَّبْرِ" },
  ],
  // 97: Al-Qadr
  97: [
    { number: 6125, numberInSurah: 1, text: "إِنَّا أَنزَلْنَاهُ فِي لَيْلَةِ الْقَدْرِ" },
    { number: 6126, numberInSurah: 2, text: "وَمَا أَدْرَاكَ مَا لَيْلَةُ الْقَدْرِ" },
    { number: 6127, numberInSurah: 3, text: "لَيْلَةُ الْقَدْرِ خَيْرٌ مِّنْ أَلْفِ شَهْرٍ" },
    { number: 6128, numberInSurah: 4, text: "تَنَزَّلُ الْمَلَائِكَةُ وَالرُّوحُ فِيهَا بِإِذْنِ رَبِّهِم مِّن كُلِّ أَمْرٍ" },
    { number: 6129, numberInSurah: 5, text: "سَلَامٌ هِيَ حَتَّىٰ مَطْلَعِ الْفَجْرِ" },
  ]
};

// Memory cache for runtime fetched surahs
const memoryCache: Record<number, AyahItem[]> = {};

/**
 * Normalizes Bismillah from first verse if bundled together (except Al-Fatihah and At-Tawbah)
 */
function cleanBismillah(text: string, surahNumber: number): string {
  if (surahNumber === 1 || surahNumber === 9) return text;
  const bismillah = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";
  const bismillahUthmani = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
  if (text.startsWith(bismillah)) {
    return text.replace(bismillah, '').trim();
  }
  if (text.startsWith(bismillahUthmani)) {
    return text.replace(bismillahUthmani, '').trim();
  }
  return text;
}

/**
 * Fetches all ayahs for a given Surah from Al-Quran Cloud or Quran.com API (Uthmani edition)
 * with multi-tier caching (bundled -> memory -> localStorage -> API -> Mirror).
 */
export async function fetchSurahAyahs(surahNumber: number): Promise<AyahItem[]> {
  // 1. Check in-memory cache
  if (memoryCache[surahNumber] && memoryCache[surahNumber].length > 0) {
    return memoryCache[surahNumber];
  }

  // 2. Check bundled surahs
  if (BUNDLED_SURAHS[surahNumber] && BUNDLED_SURAHS[surahNumber].length > 0) {
    memoryCache[surahNumber] = BUNDLED_SURAHS[surahNumber];
    return BUNDLED_SURAHS[surahNumber];
  }

  // 3. Check localStorage cache
  try {
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem(`quran_surah_${surahNumber}_uthmani`);
      if (cached) {
        const parsed: AyahItem[] = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryCache[surahNumber] = parsed;
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('LocalStorage read error:', err);
  }

  // 4. Primary API: Al-Quran Cloud (tries singular edition first, then plural)
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
            const ayahs: AyahItem[] = rawAyahs.map((a: any, idx: number) => ({
              number: a.number || idx + 1,
              numberInSurah: a.numberInSurah || idx + 1,
              text: cleanBismillah(a.text || '', surahNumber),
            }));

            memoryCache[surahNumber] = ayahs;
            try {
              localStorage.setItem(`quran_surah_${surahNumber}_uthmani`, JSON.stringify(ayahs));
            } catch (e) {}
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

  // 5. Fallback API: Quran.com API v4 (highly available, fast CDN)
  try {
    const fallbackUrl = `https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${surahNumber}`;
    const response = await fetch(fallbackUrl);
    if (response.ok) {
      const json = await response.json();
      if (Array.isArray(json.verses) && json.verses.length > 0) {
        const ayahs: AyahItem[] = json.verses.map((v: any, idx: number) => ({
          number: v.id || idx + 1,
          numberInSurah: idx + 1,
          text: cleanBismillah((v.text_uthmani || '').trim(), surahNumber),
        }));

        memoryCache[surahNumber] = ayahs;
        try {
          localStorage.setItem(`quran_surah_${surahNumber}_uthmani`, JSON.stringify(ayahs));
        } catch (e) {}
        return ayahs;
      }
    }
  } catch (err) {
    console.error(`Quran.com API fallback failed for surah ${surahNumber}:`, err);
  }

  // 6. If bundled partial exists, use it
  if (BUNDLED_SURAHS[surahNumber]) {
    return BUNDLED_SURAHS[surahNumber];
  }

  throw new Error(`تعذر تحميل آيات السورة رقم ${surahNumber}`);
}
