import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

// ═══════════════════════════════════════════════════════════════════════════
// UMRAH STEPS
// ═══════════════════════════════════════════════════════════════════════════
const UMRAH_STEPS = [
  {
    icon: 'tshirt-crew',
    titleEn: 'Enter Ihram', titleUr: 'احرام باندھنا',
    ritualEn: 'Before reaching the Miqat (boundary), perform ghusl, trim nails, and wear Ihram clothing (men: two unstitched white sheets; women: simple modest clothing covering everything except face and hands). Make the intention (niyyah) for Umrah.',
    ritualUr: 'میقات سے پہلے غسل کریں، ناخن تراشیں، اور احرام پہنیں (مردوں کے لیے دو سادہ سفید چادریں؛ خواتین کے لیے سادہ باپردہ لباس جس سے صرف چہرہ اور ہاتھ کھلے ہوں)۔ عمرہ کی نیت کریں۔',
    dua: 'اللَّهُمَّ هَذِهِ عُمْرَةٌ لَا رِيَاءَ فِيهَا وَلَا سُمْعَةَ',
    duaTranslationEn: 'O Allah, this is an Umrah without showing off or seeking praise.',
    duaTranslationUr: 'اے اللہ، یہ عمرہ ہے جس میں نہ ریاکاری ہے نہ شہرت کی خواہش۔',
    tipEn: 'Pack Ihram clothing in carry-on luggage, not checked bags — you may need it before landing if crossing Miqat by air.',
    tipUr: 'احرام کے کپڑے ہاتھ والے بیگ میں رکھیں، چیک ان بیگ میں نہیں — ہوائی سفر میں میقات سے پہلے ضرورت پڑ سکتی ہے۔',
  },
  {
    icon: 'walk',
    titleEn: 'Recite Talbiyah', titleUr: 'تلبیہ پڑھنا',
    ritualEn: 'After entering Ihram, continuously recite the Talbiyah until you begin Tawaf. This declares your intention and devotion to Allah.',
    ritualUr: 'احرام باندھنے کے بعد، طواف شروع ہونے تک مسلسل تلبیہ پڑھیں۔ یہ اللہ کے لیے آپ کی نیت اور عقیدت کا اظہار ہے۔',
    dua: 'لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لَا شَرِيكَ لَكَ',
    duaTranslationEn: 'Here I am, O Allah, here I am. Here I am, You have no partner, here I am. Indeed all praise, blessing, and sovereignty are Yours. You have no partner.',
    duaTranslationUr: 'حاضر ہوں اے اللہ، حاضر ہوں۔ حاضر ہوں، تیرا کوئی شریک نہیں، حاضر ہوں۔ بے شک تمام تعریف، نعمت اور بادشاہت تیری ہے، تیرا کوئی شریک نہیں۔',
    tipEn: 'Men should recite Talbiyah aloud; women recite softly. Keep repeating it throughout the journey to Makkah.',
    tipUr: 'مرد بلند آواز سے تلبیہ پڑھیں؛ خواتین آہستہ پڑھیں۔ مکہ پہنچنے تک اسے بار بار دہراتے رہیں۔',
  },
  {
    icon: 'rotate-360',
    titleEn: 'Perform Tawaf', titleUr: 'طواف کرنا',
    ritualEn: 'Circle the Kaaba seven times counter-clockwise, starting and ending at the Black Stone (Hajr-e-Aswad). If possible, touch or point towards it at the start of each circuit.',
    ritualUr: 'کعبہ کے گرد سات چکر خانہ کعبہ کی مخالف سمت میں لگائیں، حجرِ اسود سے شروع اور وہیں ختم کریں۔ ممکن ہو تو ہر چکر کے شروع میں اسے چھوئیں یا اشارہ کریں۔',
    dua: 'سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ وَلَا إِلَهَ إِلَّا اللَّهُ وَاللَّهُ أَكْبَرُ',
    duaTranslationEn: 'Glory be to Allah, praise be to Allah, there is no god but Allah, and Allah is the Greatest.',
    duaTranslationUr: 'اللہ پاک ہے، تمام تعریف اللہ کے لیے ہے، اللہ کے سوا کوئی معبود نہیں، اور اللہ سب سے بڑا ہے۔',
    tipEn: 'Crowds can be intense near the Kaaba. Stay on the outer rings if you need more space, especially with elderly family members.',
    tipUr: 'کعبہ کے قریب رش بہت زیادہ ہوتا ہے۔ اگر جگہ کی ضرورت ہو تو باہر کے حلقوں میں رہیں، خاص طور پر بزرگ افراد کے ساتھ۔',
  },
  {
    icon: 'human-handsup',
    titleEn: 'Pray at Maqam Ibrahim', titleUr: 'مقامِ ابراہیم پر نماز',
    ritualEn: 'After completing Tawaf, pray two Rakat (if possible) near Maqam Ibrahim, or anywhere in the Haram if it is too crowded.',
    ritualUr: 'طواف مکمل کرنے کے بعد، ممکن ہو تو مقامِ ابراہیم کے قریب دو رکعت نماز پڑھیں، یا اگر رش زیادہ ہو تو حرم میں کہیں بھی۔',
    dua: 'وَاتَّخِذُوا مِن مَّقَامِ إِبْرَاهِيمَ مُصَلًّى',
    duaTranslationEn: '"And take, [O believers], from the standing place of Abraham a place of prayer." (Quran 2:125)',
    duaTranslationUr: '"اور مقامِ ابراہیم کو نماز کی جگہ بناؤ۔" (قرآن 2:125)',
    tipEn: 'It is recommended to read Surah Al-Kafirun in the first Rakat and Surah Al-Ikhlas in the second, but any Surah is acceptable.',
    tipUr: 'پہلی رکعت میں سورۃ الکافرون اور دوسری میں سورۃ الاخلاص پڑھنا مستحب ہے، لیکن کوئی بھی سورت پڑھنا کافی ہے۔',
  },
  {
    icon: 'cup-water',
    titleEn: 'Drink from Zamzam', titleUr: 'زمزم پینا',
    ritualEn: 'Drink the blessed water of Zamzam, which is freely available throughout the Haram. Drink while standing, facing the Kaaba if possible.',
    ritualUr: 'حرم میں ہر جگہ دستیاب زمزم کا مبارک پانی پئیں۔ کھڑے ہو کر، ممکن ہو تو کعبہ کی طرف منہ کرتے ہوئے پئیں۔',
    dua: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا وَاسِعًا، وَشِفَاءً مِنْ كُلِّ دَاءٍ',
    duaTranslationEn: 'O Allah, I ask You for beneficial knowledge, abundant provision, and healing from every illness.',
    duaTranslationUr: 'اے اللہ، میں تجھ سے نفع بخش علم، وسیع رزق، اور ہر بیماری سے شفا مانگتا ہوں۔',
    tipEn: 'Carry an empty bottle to take some Zamzam water with you — many pilgrims bring it home for family.',
    tipUr: 'ایک خالی بوتل ساتھ رکھیں زمزم کا پانی لے جانے کے لیے — بہت سے زائرین گھر والوں کے لیے یہ لے کر جاتے ہیں۔',
  },
  {
    icon: 'walk',
    titleEn: "Perform Sa'i", titleUr: 'سعی کرنا',
    ritualEn: "Walk seven times between the hills of Safa and Marwah, starting at Safa and ending at Marwah. This commemorates Hajra's search for water for her son Ismail (AS).",
    ritualUr: 'صفا اور مروہ کی پہاڑیوں کے درمیان سات بار چلیں، صفا سے شروع کریں اور مروہ پر ختم کریں۔ یہ ہاجرہ علیہا السلام کے اپنے بیٹے اسماعیل علیہ السلام کے لیے پانی کی تلاش کی یاد ہے۔',
    dua: 'إِنَّ الصَّفَا وَالْمَرْوَةَ مِن شَعَائِرِ اللَّهِ',
    duaTranslationEn: '"Indeed, Safa and Marwah are among the symbols of Allah." (Quran 2:158)',
    duaTranslationUr: '"بے شک صفا اور مروہ اللہ کی نشانیوں میں سے ہیں۔" (قرآن 2:158)',
    tipEn: 'The path is air-conditioned and flat, suitable for wheelchairs. Men are encouraged to jog briefly in the marked green section.',
    tipUr: 'راستہ ایئرکنڈیشنڈ اور ہموار ہے، وہیل چیئر کے لیے موزوں۔ مردوں کو سبز نشان والے حصے میں ہلکی دوڑ لگانے کی ترغیب دی جاتی ہے۔',
  },
  {
    icon: 'content-cut',
    titleEn: 'Cut or Shave Hair (Tahallul)', titleUr: 'بال کٹوانا یا منڈانا (تحلل)',
    ritualEn: "Men should shave the head completely or trim it; women cut a small lock of hair (about a fingertip's length). This marks the completion of Umrah and you exit the state of Ihram.",
    ritualUr: 'مرد سر مکمل منڈائیں یا تراشیں؛ خواتین بالوں کا ایک چھوٹا حصہ (تقریباً ایک انگلی کے برابر) کاٹیں۔ یہ عمرہ کی تکمیل کی علامت ہے اور آپ احرام کی حالت سے باہر آ جاتے ہیں۔',
    dua: 'اللَّهُمَّ اغْفِرْ لِلْمُحَلِّقِينَ وَالْمُقَصِّرِينَ',
    duaTranslationEn: 'O Allah, forgive those who shave their heads and those who trim their hair.',
    duaTranslationUr: 'اے اللہ، سر منڈانے والوں اور بال تراشنے والوں کو بخش دے۔',
    tipEn: 'Once hair is cut, Umrah is complete and all Ihram restrictions are lifted — you may resume normal activities.',
    tipUr: 'بال کٹنے کے بعد عمرہ مکمل ہو جاتا ہے اور احرام کی تمام پابندیاں ختم ہو جاتی ہیں — آپ معمول کی سرگرمیاں دوبارہ شروع کر سکتے ہیں۔',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// HAJJ STEPS
// ═══════════════════════════════════════════════════════════════════════════
const HAJJ_STEPS = [
  {
    icon: 'tshirt-crew',
    titleEn: 'Enter Ihram (8th Dhul Hijjah)', titleUr: 'احرام باندھنا (۸ ذوالحجہ)',
    ritualEn: 'On the 8th of Dhul Hijjah, enter the state of Ihram from your place of residence in Makkah (or Miqat if arriving from outside), and make the intention for Hajj.',
    ritualUr: '۸ ذوالحجہ کو مکہ میں اپنی رہائش سے (یا باہر سے آنے والوں کے لیے میقات سے) احرام کی حالت میں داخل ہوں، اور حج کی نیت کریں۔',
    dua: 'اللَّهُمَّ هَذِهِ حَجَّةٌ لَا رِيَاءَ فِيهَا وَلَا سُمْعَةَ',
    duaTranslationEn: 'O Allah, this is a Hajj without showing off or seeking praise.',
    duaTranslationUr: 'اے اللہ، یہ حج ہے جس میں نہ ریاکاری ہے نہ شہرت کی خواہش۔',
    tipEn: 'Hydrate well in advance — Mina and Arafat have limited shade and temperatures can exceed 45°C.',
    tipUr: 'پہلے سے خوب پانی پئیں — منیٰ اور عرفات میں سایہ کم ہوتا ہے اور درجہ حرارت 45 ڈگری سے زیادہ ہو سکتا ہے۔',
  },
  {
    icon: 'tent',
    titleEn: 'Go to Mina', titleUr: 'منیٰ جانا',
    ritualEn: 'Travel to Mina and spend the day and night there (8th Dhul Hijjah), performing the five daily prayers shortened but not combined.',
    ritualUr: 'منیٰ جائیں اور وہاں دن اور رات گزاریں (۸ ذوالحجہ)، پانچ نمازیں مختصر مگر الگ الگ ادا کریں۔',
    dua: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ رِضَاكَ وَالْجَنَّةَ، وَأَعُوذُ بِكَ مِنْ سَخَطِكَ وَالنَّارِ',
    duaTranslationEn: 'O Allah, I ask You for Your pleasure and Paradise, and I seek refuge in You from Your anger and the Fire.',
    duaTranslationUr: 'اے اللہ، میں تجھ سے تیری رضا اور جنت مانگتا ہوں، اور تیرے غضب اور آگ سے تیری پناہ مانگتا ہوں۔',
    tipEn: 'Mina tents are assigned by group/visa type — note your tent number and zone immediately upon arrival to avoid getting lost.',
    tipUr: 'منیٰ کے خیمے گروپ یا ویزا کی قسم کے مطابق مختص ہوتے ہیں — پہنچتے ہی اپنے خیمے کا نمبر اور زون نوٹ کر لیں تاکہ بھٹکیں نہ۔',
  },
  {
    icon: 'weather-sunny',
    titleEn: 'Day of Arafah (9th Dhul Hijjah)', titleUr: 'یومِ عرفہ (۹ ذوالحجہ)',
    ritualEn: 'Travel to Arafat and spend the entire day (from after Fajr until sunset) in prayer, dua, and reflection. This is the most important pillar of Hajj — standing at Arafat is essential for Hajj to be valid.',
    ritualUr: 'عرفات جائیں اور پورا دن (فجر کے بعد سے غروبِ آفتاب تک) دعا، عبادت اور غور و فکر میں گزاریں۔ یہ حج کا سب سے اہم رکن ہے — عرفات میں ٹھہرنا حج کے درست ہونے کے لیے ضروری ہے۔',
    dua: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    duaTranslationEn: 'There is no god but Allah alone, with no partner. His is the dominion and His is the praise, and He has power over all things.',
    duaTranslationUr: 'اللہ کے سوا کوئی معبود نہیں، وہ اکیلا ہے، اس کا کوئی شریک نہیں، اسی کی بادشاہی ہے اور اسی کی تعریف ہے، اور وہ ہر چیز پر قادر ہے۔',
    tipEn: 'This is the best day of the year for dua — bring a personal list of things you want to ask Allah, since it is easy to forget under emotion and heat.',
    tipUr: 'یہ سال کا بہترین دن دعا کے لیے ہے — اپنی خواہشات کی فہرست پہلے سے لکھ لیں، کیونکہ جذبات اور گرمی میں بھولنا آسان ہے۔',
  },
  {
    icon: 'moon-waning-crescent',
    titleEn: 'Muzdalifah (Night of 9th-10th)', titleUr: 'مزدلفہ (۹-۱۰ کی رات)',
    ritualEn: 'After sunset, travel to Muzdalifah and spend the night there under the open sky. Pray Maghrib and Isha combined. Collect small pebbles here for the stoning ritual.',
    ritualUr: 'غروبِ آفتاب کے بعد مزدلفہ جائیں اور رات کھلے آسمان تلے گزاریں۔ مغرب اور عشاء ملا کر پڑھیں۔ یہاں رمی کے لیے چھوٹے کنکر جمع کریں۔',
    dua: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
    duaTranslationEn: 'Our Lord, give us good in this world and good in the Hereafter, and save us from the punishment of the Fire.',
    duaTranslationUr: 'اے ہمارے رب، ہمیں دنیا میں بھلائی دے اور آخرت میں بھلائی دے اور ہمیں جہنم کے عذاب سے بچا۔',
    tipEn: 'Collect about 49-70 pebbles (chickpea-sized) here for all days of stoning — saves time looking for them later in Mina.',
    tipUr: 'یہاں تقریباً ۴۹ سے ۷۰ کنکر (چنے کے سائز) جمع کر لیں تمام دنوں کی رمی کے لیے — اس سے بعد میں منیٰ میں وقت بچتا ہے۔',
  },
  {
    icon: 'circle-multiple',
    titleEn: 'Stoning the Jamarat (10th Dhul Hijjah)', titleUr: 'رمی الجمار (۱۰ ذوالحجہ)',
    ritualEn: 'Return to Mina and throw seven pebbles at Jamarat al-Aqabah (the largest pillar), saying Allahu Akbar with each throw. This symbolizes rejecting Shaytan, as Ibrahim (AS) did.',
    ritualUr: 'منیٰ واپس جائیں اور جمرہ عقبہ (سب سے بڑے ستون) پر سات کنکر پھینکیں، ہر کنکر کے ساتھ اللہ اکبر کہیں۔ یہ شیطان کو رد کرنے کی علامت ہے، جیسا ابراہیم علیہ السلام نے کیا۔',
    dua: 'اللَّهُ أَكْبَرُ، اللَّهُمَّ اجْعَلْهُ حَجًّا مَبْرُورًا وَذَنْبًا مَغْفُورًا',
    duaTranslationEn: 'Allah is the Greatest. O Allah, make this an accepted Hajj and forgive my sins.',
    duaTranslationUr: 'اللہ سب سے بڑا ہے۔ اے اللہ، اس حج کو مقبول بنا اور میرے گناہ معاف کر۔',
    tipEn: 'The Jamarat bridge gets extremely crowded — go during off-peak hours (late night or early morning) rather than midday if possible.',
    tipUr: 'جمرات کا پل بہت زیادہ رش والا ہوتا ہے — اگر ممکن ہو تو دوپہر کے بجائے کم رش کے اوقات (رات گئے یا صبح سویرے) جائیں۔',
  },
  {
    icon: 'content-cut',
    titleEn: 'Sacrifice (Qurbani)', titleUr: 'قربانی',
    ritualEn: 'Arrange for an animal sacrifice (sheep, goat, cow, or camel) on the 10th, 11th, or 12th of Dhul Hijjah. This commemorates the sacrifice of Ibrahim (AS). Most pilgrims arrange this through authorized banks or services.',
    ritualUr: '۱۰، ۱۱ یا ۱۲ ذوالحجہ کو جانور کی قربانی (بھیڑ، بکری، گائے یا اونٹ) کا انتظام کریں۔ یہ ابراہیم علیہ السلام کی قربانی کی یاد ہے۔ زیادہ تر زائرین یہ مجاز بینکوں یا خدمات کے ذریعے کرواتے ہیں۔',
    dua: 'بِسْمِ اللَّهِ، اللَّهُ أَكْبَرُ، اللَّهُمَّ هَذَا مِنْكَ وَلَكَ',
    duaTranslationEn: 'In the name of Allah, Allah is the Greatest. O Allah, this is from You and for You.',
    duaTranslationUr: 'اللہ کے نام سے، اللہ سب سے بڑا ہے۔ اے اللہ، یہ تیری ہی طرف سے اور تیرے ہی لیے ہے۔',
    tipEn: 'Pre-purchase your sacrifice coupon through the official Islamic Development Bank service before your Hajj group departs.',
    tipUr: 'اپنے حج گروپ کے روانہ ہونے سے پہلے سرکاری اسلامک ڈویلپمنٹ بینک سروس کے ذریعے قربانی کا کوپن پہلے ہی خرید لیں۔',
  },
  {
    icon: 'content-cut',
    titleEn: 'Shave or Trim Hair', titleUr: 'بال منڈانا یا تراشنا',
    ritualEn: 'After the sacrifice, men shave the head fully or trim, and women cut a small lock. This partially exits Ihram (Tahallul Awwal) — most restrictions are lifted except marital relations.',
    ritualUr: 'قربانی کے بعد، مرد سر مکمل منڈائیں یا تراشیں، اور خواتین بالوں کا ایک چھوٹا حصہ کاٹیں۔ یہ احرام سے جزوی خروج ہے (تحلل اول) — ازدواجی تعلقات کے سوا زیادہ تر پابندیاں ختم ہو جاتی ہیں۔',
    dua: 'اللَّهُمَّ اغْفِرْ لِلْمُحَلِّقِينَ وَالْمُقَصِّرِينَ',
    duaTranslationEn: 'O Allah, forgive those who shave their heads and those who trim their hair.',
    duaTranslationUr: 'اے اللہ، سر منڈانے والوں اور بال تراشنے والوں کو بخش دے۔',
    tipEn: 'You may now change out of Ihram clothing into regular clothes, though full Ihram restrictions lift only after Tawaf al-Ifadah.',
    tipUr: 'اب آپ احرام کے کپڑے بدل کر عام لباس پہن سکتے ہیں، اگرچہ مکمل پابندیاں طوافِ افاضہ کے بعد ہی ختم ہوتی ہیں۔',
  },
  {
    icon: 'rotate-360',
    titleEn: 'Tawaf al-Ifadah', titleUr: 'طوافِ افاضہ',
    ritualEn: 'Travel to Makkah and perform Tawaf around the Kaaba (the main pillar of Hajj), followed by Sa\'i between Safa and Marwah if not already done during Umrah portion of a combined Hajj.',
    ritualUr: 'مکہ جائیں اور کعبہ کا طواف کریں (حج کا اہم ترین رکن)، اس کے بعد صفا و مروہ کے درمیان سعی کریں اگر حج تمتع میں پہلے سے نہ کی ہو۔',
    dua: 'رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنْتَ السَّمِيعُ الْعَلِيمُ',
    duaTranslationEn: 'Our Lord, accept this from us. Indeed, You are the Hearing, the Knowing.',
    duaTranslationUr: 'اے ہمارے رب، ہم سے قبول فرما، بے شک تو ہی سننے والا، جاننے والا ہے۔',
    tipEn: 'This Tawaf can be performed any time from the 10th onwards through the days of Mina — many delay it slightly to avoid the heaviest crowds.',
    tipUr: 'یہ طواف ۱۰ تاریخ سے منیٰ کے دنوں تک کسی بھی وقت کیا جا سکتا ہے — بہت سے لوگ شدید رش سے بچنے کے لیے اسے تھوڑا موخر کرتے ہیں۔',
  },
  {
    icon: 'tent',
    titleEn: 'Days of Tashreeq (11th-13th)', titleUr: 'ایامِ تشریق (۱۱-۱۳)',
    ritualEn: 'Return to Mina and stay through the 11th, 12th, and (optionally) 13th of Dhul Hijjah, stoning all three Jamarat (small, medium, large) each day after Zuhr.',
    ritualUr: 'منیٰ واپس جائیں اور ۱۱، ۱۲ اور (اختیاری طور پر) ۱۳ ذوالحجہ تک ٹھہریں، ہر روز ظہر کے بعد تینوں جمرات (چھوٹا، درمیانہ، بڑا) پر رمی کریں۔',
    dua: 'وَاذْكُرُوا اللَّهَ فِي أَيَّامٍ مَّعْدُودَاتٍ',
    duaTranslationEn: '"And remember Allah during these appointed days." (Quran 2:203)',
    duaTranslationUr: '"اور ان مقررہ دنوں میں اللہ کو یاد کرو۔" (قرآن 2:203)',
    tipEn: 'Pilgrims may leave after the 12th (Nafr Awwal) if they depart before sunset, or stay for the 13th (Nafr Thani) for extra reward.',
    tipUr: 'زائرین ۱۲ تاریخ کے بعد جا سکتے ہیں (نفرِ اول) اگر غروبِ آفتاب سے پہلے روانہ ہوں، یا اضافی ثواب کے لیے ۱۳ تاریخ تک ٹھہر سکتے ہیں (نفرِ ثانی)۔',
  },
  {
    icon: 'rotate-360',
    titleEn: "Tawaf al-Wida (Farewell Tawaf)", titleUr: 'طوافِ وداع',
    ritualEn: 'Before leaving Makkah, perform a final Tawaf as a farewell to the Kaaba. This is obligatory for those leaving the city, marking the formal end of Hajj.',
    ritualUr: 'مکہ چھوڑنے سے پہلے، کعبہ کو الوداع کہنے کے لیے آخری طواف کریں۔ یہ شہر چھوڑنے والوں کے لیے واجب ہے، اور حج کی باقاعدہ تکمیل کی علامت ہے۔',
    dua: 'اللَّهُمَّ لَا تَجْعَلْهُ آخِرَ الْعَهْدِ بِهَذَا الْبَيْتِ',
    duaTranslationEn: 'O Allah, do not make this my last visit to this House.',
    duaTranslationUr: 'اے اللہ، اسے اس گھر سے میری آخری ملاقات نہ بنا۔',
    tipEn: 'Try to perform this Tawaf as close as possible to your departure time — avoid eating a heavy meal or unnecessary delay afterwards before traveling.',
    tipUr: 'اس طواف کو اپنی روانگی کے وقت کے قریب ترین وقت پر کریں — اس کے بعد بھاری کھانا کھانے یا غیر ضروری تاخیر سے گریز کریں۔',
  },
];

const PRACTICAL_TIPS = [
  { icon: 'bag-personal', en: 'Pack light, breathable clothing, comfortable sandals, and a small first-aid kit with basic medicines.', ur: 'ہلکے، ہوادار کپڑے، آرام دہ چپل، اور بنیادی ادویات کے ساتھ ایک چھوٹا فرسٹ ایڈ کٹ ساتھ رکھیں۔' },
  { icon: 'heart-pulse', en: 'Get required vaccinations (especially Meningitis) well in advance, and carry a copy of your medical history if you have chronic conditions.', ur: 'ضروری ویکسینیشن (خاص طور پر میننجائٹس) پہلے سے لگوا لیں، اور اگر دائمی بیماری ہو تو طبی تاریخ کی کاپی ساتھ رکھیں۔' },
  { icon: 'bottle-soda', en: 'Drink water constantly even if not thirsty — dehydration is the most common issue in Hajj/Umrah due to heat and walking.', ur: 'پیاس نہ بھی ہو تو مسلسل پانی پیتے رہیں — گرمی اور چلنے کی وجہ سے پانی کی کمی حج/عمرہ میں سب سے عام مسئلہ ہے۔' },
  { icon: 'wallet', en: 'Keep cash, passport, and Hajj/Umrah permit documents in a pouch worn under your clothing, not in a regular bag.', ur: 'نقدی، پاسپورٹ اور حج/عمرہ کے اجازت نامے کاغذات کپڑوں کے نیچے پہنی جانے والی پاؤچ میں رکھیں، عام بیگ میں نہیں۔' },
  { icon: 'account-group', en: 'Memorize or save your group leader\'s number and your accommodation address — crowds make it easy to get separated.', ur: 'اپنے گروپ لیڈر کا نمبر اور رہائش کا پتہ یاد کر لیں یا محفوظ کر لیں — رش میں الگ ہونا آسان ہے۔' },
  { icon: 'shoe-sneaker', en: 'Break in your walking sandals before the trip — Hajj alone can involve walking 10+ km per day.', ur: 'سفر سے پہلے اپنی چپل کو استعمال کر کے آرام دہ بنا لیں — حج میں روزانہ ۱۰ کلومیٹر سے زیادہ پیدل چلنا پڑ سکتا ہے۔' },
];

function StepCard({ step, urdu, darkMode, expanded, onPress }) {
  const dm = darkMode;
  const cardBg = dm ? '#1a1a1a' : '#fff';
  const textColor = dm ? '#e0e0e0' : '#1a1a1a';
  const subColor = dm ? '#888' : '#666';
  const borderColor = dm ? '#2a2a2a' : '#e8e8e8';
  const sectionBg = dm ? '#222' : '#f0f7f0';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ backgroundColor: cardBg, borderRadius: 18, marginBottom: 12, borderWidth: 1, borderColor: expanded ? '#1a472a' : borderColor, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: expanded ? '#1a472a' : sectionBg, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
          <MaterialCommunityIcons name={step.icon} size={22} color={expanded ? '#ffd700' : '#1a472a'} />
        </View>
        <Text style={{ flex: 1, fontSize: 15, fontWeight: 'bold', color: textColor }}>{urdu ? step.titleUr : step.titleEn}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={subColor} />
      </View>
      {expanded && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 16 }}>
          <Text style={{ color: textColor, fontSize: 13, lineHeight: 22, marginBottom: 14, textAlign: urdu ? 'right' : 'left' }}>
            {urdu ? step.ritualUr : step.ritualEn}
          </Text>

          <View style={{ backgroundColor: dm ? '#0d2b1a' : '#1a472a', borderRadius: 14, padding: 14, marginBottom: 12 }}>
            <Text style={{ color: '#ffd700', fontSize: 11, fontWeight: 'bold', marginBottom: 8 }}>{urdu ? '🤲 دعا' : '🤲 DUA'}</Text>
            <Text style={{ color: '#ffd700', fontSize: 16, textAlign: 'right', lineHeight: 28, marginBottom: 8 }}>{step.dua}</Text>
            <Text style={{ color: '#e0e0e0', fontSize: 12, lineHeight: 20, fontStyle: 'italic' }}>
              {urdu ? step.duaTranslationUr : step.duaTranslationEn}
            </Text>
          </View>

          <View style={{ backgroundColor: sectionBg, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start' }}>
            <MaterialCommunityIcons name="lightbulb-on" size={18} color="#f39c12" style={{ marginRight: 8, marginTop: 1 }} />
            <Text style={{ flex: 1, color: textColor, fontSize: 12, lineHeight: 20 }}>
              {urdu ? step.tipUr : step.tipEn}
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function HajjUmrahGuideScreen({ urdu = false, darkMode = false }) {
  const dm = darkMode;
  const pageBg = dm ? '#0a0a0a' : '#f0f4f0';
  const cardBg = dm ? '#1a1a1a' : '#fff';
  const textColor = dm ? '#e0e0e0' : '#1a1a1a';
  const subColor = dm ? '#888' : '#666';
  const borderColor = dm ? '#2a2a2a' : '#e8e8e8';
  const sectionBg = dm ? '#222' : '#f0f7f0';

  const [mode, setMode] = useState('umrah'); // 'umrah' | 'hajj'
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [showTips, setShowTips] = useState(false);

  const steps = mode === 'umrah' ? UMRAH_STEPS : HAJJ_STEPS;

  const switchMode = (m) => {
    setMode(m);
    setExpandedIdx(null);
    setShowTips(false);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: pageBg }} showsVerticalScrollIndicator={false}>
      <View style={{ backgroundColor: dm ? '#0d2b1a' : '#1a472a', padding: 30, alignItems: 'center', paddingTop: 60, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
        <FontAwesome5 name="kaaba" size={32} color="#ffd700" />
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 8 }}>
          {urdu ? 'حج و عمرہ گائیڈ' : 'Hajj & Umrah Guide'}
        </Text>
        <Text style={{ color: '#a0c4a0', fontSize: 13, marginTop: 4 }}>
          {urdu ? 'مرحلہ وار رہنمائی' : 'Step-by-step guidance'}
        </Text>
      </View>

      {/* Mode Switch */}
      <View style={{ flexDirection: 'row', backgroundColor: cardBg, margin: 15, borderRadius: 16, padding: 5, borderWidth: 1, borderColor }}>
        <TouchableOpacity onPress={() => switchMode('umrah')} style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: mode === 'umrah' ? '#1a472a' : 'transparent' }}>
          <Text style={{ color: mode === 'umrah' ? '#ffd700' : textColor, fontWeight: 'bold', fontSize: 14 }}>
            {urdu ? 'عمرہ' : 'Umrah'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => switchMode('hajj')} style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: mode === 'hajj' ? '#1a472a' : 'transparent' }}>
          <Text style={{ color: mode === 'hajj' ? '#ffd700' : textColor, fontWeight: 'bold', fontSize: 14 }}>
            {urdu ? 'حج' : 'Hajj'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Steps count badge */}
      <View style={{ marginHorizontal: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ fontSize: 11, fontWeight: 'bold', color: subColor, letterSpacing: 1, textTransform: 'uppercase' }}>
          {steps.length} {urdu ? 'مراحل' : 'STEPS'}
        </Text>
      </View>

      {/* Steps List */}
      <View style={{ paddingHorizontal: 15 }}>
        {steps.map((step, i) => (
          <StepCard
            key={i}
            step={step}
            urdu={urdu}
            darkMode={darkMode}
            expanded={expandedIdx === i}
            onPress={() => setExpandedIdx(expandedIdx === i ? null : i)}
          />
        ))}
      </View>

      {/* Practical Tips Section */}
      <View style={{ marginHorizontal: 15, marginTop: 10, marginBottom: 30 }}>
        <TouchableOpacity
          onPress={() => setShowTips(!showTips)}
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: dm ? '#0d2b1a' : '#1a472a', borderRadius: 16, padding: 16 }}
        >
          <MaterialCommunityIcons name="bag-personal" size={24} color="#ffd700" style={{ marginRight: 12 }} />
          <Text style={{ flex: 1, color: '#ffd700', fontSize: 15, fontWeight: 'bold' }}>
            {urdu ? '🎒 سفر کی عملی تجاویز' : '🎒 Practical Travel Tips'}
          </Text>
          <Ionicons name={showTips ? 'chevron-up' : 'chevron-down'} size={20} color="#ffd700" />
        </TouchableOpacity>

        {showTips && (
          <View style={{ marginTop: 10 }}>
            {PRACTICAL_TIPS.map((tip, i) => (
              <View key={i} style={{ backgroundColor: cardBg, borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderColor }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: sectionBg, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                  <MaterialCommunityIcons name={tip.icon} size={18} color="#1a472a" />
                </View>
                <Text style={{ flex: 1, color: textColor, fontSize: 13, lineHeight: 21 }}>
                  {urdu ? tip.ur : tip.en}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
