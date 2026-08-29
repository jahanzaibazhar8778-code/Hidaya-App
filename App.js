import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import { useColorScheme, Platform, useWindowDimensions } from 'react-native';
import { View, Text, ScrollView, TouchableOpacity, Vibration, ActivityIndicator, TextInput, AppState, Modal, Alert, Animated, Easing, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Coordinates, PrayerTimes, CalculationMethod, Madhab } from 'adhan';
import moment from 'moment-hijri';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import HajjUmrahGuideScreen from './HajjUmrahGuideScreen';

// Default Fallback Location (Lahore, Pakistan) if GPS is disabled or permission denied
const DEFAULT_COORDS = { latitude: 31.5204, longitude: 74.3587 };
const DEFAULT_CITY = 'Lahore';

async function getSafeLocation() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      let loc = await Location.getLastKnownPositionAsync({});
      if (loc && loc.coords) {
        return { coords: loc.coords, isFallback: false };
      }
      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 2500));
      const posPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      loc = await Promise.race([posPromise, timeoutPromise]);
      if (loc && loc.coords) {
        return { coords: loc.coords, isFallback: false };
      }
    }
  } catch (e) {
    console.log('Location fetch error, using default fallback:', e.message);
  }
  return { coords: DEFAULT_COORDS, isFallback: true };
}

const AZAN_RECITERS = [
  { id: 'makkah',  nameEn: 'Makkah (Fajr)',      nameUr: 'مکہ (فجر)',       url: 'https://www.islamcan.com/audio/adhan/azan1.mp3' },
  { id: 'madinah', nameEn: 'Madinah',             nameUr: 'مدینہ',           url: 'https://www.islamcan.com/audio/adhan/azan2.mp3' },
  { id: 'turkey',  nameEn: 'Turkey Style',        nameUr: 'ترکی انداز',      url: 'https://www.islamcan.com/audio/adhan/azan3.mp3' },
  { id: 'egypt',   nameEn: 'Egypt (Abdul Basit)', nameUr: 'مصر (عبدالباسط)', url: 'https://www.islamcan.com/audio/adhan/azan4.mp3' },
];

const HADITH_LIST = [
  { arabic: 'خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ', urdu: 'تم میں سے بہترین وہ ہے جو قرآن سیکھے اور سکھائے۔', english: 'The best of you are those who learn the Quran and teach it.', source: 'صحیح بخاری | Sahih Bukhari' },
  { arabic: 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ', urdu: 'اعمال کا دارومدار نیتوں پر ہے۔', english: 'Actions are judged by intentions.', source: 'صحیح بخاری | Sahih Bukhari' },
  { arabic: 'الطُّهُورُ شَطْرُ الْإِيمَانِ', urdu: 'پاکیزگی نصف ایمان ہے۔', english: 'Cleanliness is half of faith.', source: 'صحیح مسلم | Sahih Muslim' },
  { arabic: 'مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الْآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ', urdu: 'جو اللہ اور آخرت کے دن پر ایمان رکھتا ہو وہ اچھی بات کہے یا خاموش رہے۔', english: 'Whoever believes in Allah and the Last Day should speak good or remain silent.', source: 'صحیح بخاری | Sahih Bukhari' },
  { arabic: 'لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ', urdu: 'تم میں سے کوئی اس وقت تک مومن نہیں ہو سکتا جب تک اپنے بھائی کے لیے وہی نہ چاہے جو اپنے لیے چاہتا ہے۔', english: 'None of you truly believes until he loves for his brother what he loves for himself.', source: 'صحیح بخاری | Sahih Bukhari' },
  { arabic: 'الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ', urdu: 'مسلمان وہ ہے جس کی زبان اور ہاتھ سے دوسرے مسلمان محفوظ ہوں۔', english: 'A Muslim is one from whose tongue and hand other Muslims are safe.', source: 'صحیح بخاری | Sahih Bukhari' },
  { arabic: 'أَحَبُّ الْأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ', urdu: 'اللہ کو سب سے زیادہ پسندیدہ عمل وہ ہے جو ہمیشہ کیا جائے، چاہے تھوڑا ہو۔', english: 'The most beloved deeds to Allah are those done consistently, even if small.', source: 'صحیح بخاری | Sahih Bukhari' },
  { arabic: 'الدِّينُ النَّصِيحَةُ', urdu: 'دین خیرخواہی کا نام ہے۔', english: 'Religion is sincere advice.', source: 'صحیح مسلم | Sahih Muslim' },
  { arabic: 'مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ طَرِيقًا إِلَى الْجَنَّةِ', urdu: 'جو شخص علم حاصل کرنے کے لیے کوئی راستہ اختیار کرے، اللہ اس کے لیے جنت کا راستہ آسان کر دیتا ہے۔', english: 'Whoever takes a path seeking knowledge, Allah will ease for him the path to Paradise.', source: 'صحیح مسلم | Sahih Muslim' },
  { arabic: 'إِنَّ اللَّهَ لَا يَنْظُرُ إِلَى صُوَرِكُمْ وَأَمْوَالِكُمْ وَلَكِنْ يَنْظُرُ إِلَى قُلُوبِكُمْ وَأَعْمَالِكُمْ', urdu: 'اللہ تمہاری صورتوں اور مالوں کو نہیں دیکھتا، بلکہ تمہارے دلوں اور اعمال کو دیکھتا ہے۔', english: 'Allah does not look at your forms and wealth, but He looks at your hearts and deeds.', source: 'صحیح مسلم | Sahih Muslim' },
  { arabic: 'اتَّقِ اللَّهَ حَيْثُمَا كُنْتَ وَأَتْبِعِ السَّيِّئَةَ الْحَسَنَةَ تَمْحُهَا', urdu: 'جہاں بھی ہو اللہ سے ڈرو، اور برائی کے بعد نیکی کرو، وہ اسے مٹا دے گی۔', english: 'Fear Allah wherever you are, and follow a bad deed with a good one to erase it.', source: 'سنن ترمذی | Tirmidhi' },
  { arabic: 'الْكَلِمَةُ الطَّيِّبَةُ صَدَقَةٌ', urdu: 'اچھی بات کہنا صدقہ ہے۔', english: 'A good word is charity.', source: 'صحیح بخاری | Sahih Bukhari' },
  { arabic: "خَيْرُ الناسِ أَنْفَعُهُمْ لِلنَّاسِ", urdu: 'لوگوں میں سب سے بہتر وہ ہے جو لوگوں کو سب سے زیادہ فائدہ پہنچائے۔', english: 'The best of people are those most beneficial to others.', source: "المعجم الأوسط | Al-Mu'jam al-Awsat" },
  { arabic: 'مَنْ لَا يَشْكُرُ النَّاسَ لَا يَشْكُرُ اللَّهَ', urdu: 'جو لوگوں کا شکر نہیں کرتا وہ اللہ کا بھی شکر نہیں کرتا۔', english: 'He who does not thank people does not thank Allah.', source: 'سنن ابی داؤد | Abu Dawud' },
  { arabic: 'إِنَّ مِنْ أَحَبِّكُمْ إِلَيَّ وَأَقْرَبِكُمْ مِنِّي مَجْلِسًا يَوْمَ الْقِيَامَةِ أَحَاسِنَكُمْ أَخْلَاقًا', urdu: 'تم میں سے مجھے سب سے زیادہ محبوب اور قیامت کے دن قریب ترین وہ ہوں گے جن کے اخلاق سب سے اچھے ہوں۔', english: 'The most beloved and closest to me on the Day of Judgment will be those best in character.', source: 'سنن ترمذی | Tirmidhi' },
  { arabic: 'الصِّيَامُ جُنَّةٌ', urdu: 'روزہ ڈھال ہے۔', english: 'Fasting is a shield.', source: 'صحیح بخاری | Sahih Bukhari' },
  { arabic: 'مَنْ صَامَ رَمَضَانَ إِيمَانًا وَاحْتِسَابًا غُفِرَ لَهُ مَا تَقَدَّمَ مِنْ ذَنْبِهِ', urdu: 'جو ایمان اور ثواب کی نیت سے رمضان کے روزے رکھے، اس کے پچھلے گناہ معاف ہو جاتے ہیں۔', english: 'Whoever fasts Ramadan with faith and seeking reward will have his past sins forgiven.', source: 'صحیح بخاری | Sahih Bukhari' },
  { arabic: 'أَفْضَلُ الصَّلَاةِ بَعْدَ الْفَرِيضَةِ صَلَاةُ اللَّيْلِ', urdu: 'فرض نماز کے بعد سب سے افضل نماز رات کی نماز (تہجد) ہے۔', english: 'The best prayer after the obligatory prayers is the night prayer (Tahajjud).', source: 'صحیح مسلم | Sahih Muslim' },
  { arabic: 'بَلِّغُوا عَنِّي وَلَوْ آيَةً', urdu: 'میری طرف سے پہنچاؤ، چاہے ایک آیت ہی ہو۔', english: 'Convey from me, even if it is one verse.', source: 'صحیح بخاری | Sahih Bukhari' },
  { arabic: 'مَنْ أَحَبَّ لِقَاءَ اللَّهِ أَحَبَّ اللَّهُ لِقَاءَهُ', urdu: 'جو اللہ سے ملنا چاہتا ہے، اللہ بھی اس سے ملنا چاہتا ہے۔', english: 'Whoever loves to meet Allah, Allah loves to meet him.', source: 'صحیح بخاری | Sahih Bukhari' },
  { arabic: 'إِنَّ اللَّهَ رَفِيقٌ يُحِبُّ الرِّفْقَ', urdu: 'بے شک اللہ نرم ہے اور نرمی کو پسند کرتا ہے۔', english: 'Indeed Allah is gentle and loves gentleness.', source: 'صحیح بخاری | Sahih Bukhari' },
  { arabic: 'الْمُؤْمِنُ الْقَوِيُّ خَيْرٌ وَأَحَبُّ إِلَى اللَّهِ مِنَ الْمُؤْمِنِ الضَّعِيفِ', urdu: 'طاقتور مومن اللہ کو کمزور مومن سے زیادہ محبوب ہے۔', english: 'A strong believer is better and more beloved to Allah than a weak believer.', source: 'صحیح مسلم | Sahih Muslim' },
  { arabic: 'مَنْ تَوَاضَعَ لِلَّهِ رَفَعَهُ اللَّهُ', urdu: 'جو اللہ کے لیے عاجزی اختیار کرے، اللہ اسے بلند کرتا ہے۔', english: 'Whoever humbles himself for Allah, Allah will elevate him.', source: 'صحیح مسلم | Sahih Muslim' },
  { arabic: 'مَا نَقَصَتْ صَدَقَةٌ مِنْ مَالٍ', urdu: 'صدقہ دینے سے مال کم نہیں ہوتا۔', english: 'Charity does not decrease wealth.', source: 'صحیح مسلم | Sahih Muslim' },
  { arabic: 'كُلُّ مَعْرُوفٍ صَدَقَةٌ', urdu: 'ہر نیکی صدقہ ہے۔', english: 'Every act of kindness is charity.', source: 'صحیح بخاری | Sahih Bukhari' },
  { arabic: 'الْجَنَّةُ تَحْتَ أَقْدَامِ الْأُمَّهَاتِ', urdu: 'جنت ماؤں کے قدموں تلے ہے۔', english: 'Paradise lies beneath the feet of mothers.', source: 'سنن ابن ماجہ | Sunan Ibn Majah' },
];

//--------Islamic quotes-------
const ISLAMIC_QUOTES = [
  {
    arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا',
    urdu: 'بے شک مشکل کے ساتھ آسانی ہے۔',
    source: 'القرآن 94:6',
  },
  {
    arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ',
    urdu: 'ہمارے لیے اللہ کافی ہے اور وہ بہترین کارساز ہے۔',
    source: 'القرآن 3:173',
  },
  {
    arabic: 'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ',
    urdu: 'جو اللہ پر بھروسہ کرے تو وہی اس کے لیے کافی ہے۔',
    source: 'القرآن 65:3',
  },
  {
    arabic: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا',
    urdu: 'پس بے شک مشکل کے ساتھ آسانی ہے۔',
    source: 'القرآن 94:5',
  },
  {
    arabic: 'وَاللَّهُ يُحِبُّ الصَّابِرِينَ',
    urdu: 'اور اللہ صبر کرنے والوں سے محبت کرتا ہے۔',
    source: 'القرآن 3:146',
  },
  {
    arabic: 'وَلَا تَيْأَسُوا مِن رَّوْحِ اللَّهِ',
    urdu: 'اور اللہ کی رحمت سے ناامید مت ہو۔',
    source: 'القرآن 12:87',
  },
  {
    arabic: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ',
    urdu: 'بے شک اللہ صبر کرنے والوں کے ساتھ ہے۔',
    source: 'القرآن 2:153',
  },
  {
    arabic: 'وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ',
    urdu: 'اور وہ تمہارے ساتھ ہے جہاں بھی تم ہو۔',
    source: 'القرآن 57:4',
  },
  {
    arabic: 'اللَّهُ نُورُ السَّمَاوَاتِ وَالْأَرْضِ',
    urdu: 'اللہ آسمانوں اور زمین کا نور ہے۔',
    source: 'القرآن 24:35',
  },
  {
    arabic: 'وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ',
    urdu: 'جب میرے بندے میرے بارے میں پوچھیں تو میں قریب ہوں۔',
    source: 'القرآن 2:186',
  },
  {
    arabic: 'رَبِّ إِنِّي لِمَا أَنزَلْتَ إِلَيَّ مِنْ خَيْرٍ فَقِيرٌ',
    urdu: 'اے میرے رب! تو جو بھی بھلائی مجھ پر نازل کرے میں اس کا محتاج ہوں۔',
    source: 'القرآن 28:24',
  },
  {
    arabic: 'وَقُل رَّبِّ زِدْنِي عِلْمًا',
    urdu: 'اور کہو: اے میرے رب! میرے علم میں اضافہ فرما۔',
    source: 'القرآن 20:114',
  },
  {
    arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً',
    urdu: 'اے ہمارے رب! ہمیں دنیا میں بھی بھلائی دے اور آخرت میں بھی۔',
    source: 'القرآن 2:201',
  },
  {
    arabic: 'إِنَّ الصَّلَاةَ تَنْهَىٰ عَنِ الْفَحْشَاءِ وَالْمُنكَرِ',
    urdu: 'بے شک نماز بے حیائی اور برائی سے روکتی ہے۔',
    source: 'القرآن 29:45',
  },
  {
    arabic: 'وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ',
    urdu: 'اور صبر اور نماز سے مدد لو۔',
    source: 'القرآن 2:45',
  },
  {
    arabic: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ',
    urdu: 'سن لو! اللہ کے ذکر سے دلوں کو سکون ملتا ہے۔',
    source: 'القرآن 13:28',
  },
  {
    arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ',
    urdu: 'تم مجھے یاد کرو میں تمہیں یاد کروں گا۔',
    source: 'القرآن 2:152',
  },
  {
    arabic: 'وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ',
    urdu: 'اور میری توفیق صرف اللہ کی طرف سے ہے۔',
    source: 'القرآن 11:88',
  },
  {
    arabic: 'يُرِيدُ اللَّهُ بِكُمُ الْيُسْرَ وَلَا يُرِيدُ بِكُمُ الْعُسْرَ',
    urdu: 'اللہ تمہارے ساتھ آسانی چاہتا ہے، مشکل نہیں چاہتا۔',
    source: 'القرآن 2:185',
  },
  {
    arabic: 'إِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ',
    urdu: 'بے شک اللہ نیکی کرنے والوں کا اجر ضائع نہیں کرتا۔',
    source: 'القرآن 9:120',
  },
]

const getDailyHadith = () => {
  const today = new Date();
  const start = new Date(today.getFullYear(), 0, 0);
  const diff = today - start;
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return HADITH_LIST[dayOfYear % HADITH_LIST.length];
};

const getDailyHadithIndex = () => {
  const today = new Date();
  const start = new Date(today.getFullYear(), 0, 0);
  const diff = today - start;
  return (Math.floor(diff / (1000 * 60 * 60 * 24)) % HADITH_LIST.length) + 1;
};

const SALAH_TRACKER_KEY  = '@hidaya_salah_tracker';
const AZAN_SETTINGS_KEY  = '@hidaya_azan_settings';
const CUSTOM_TASBEEH_KEY = '@hidaya_custom_tasbeeh';
const SELECTED_RECITER_KEY = '@hidaya_reciter';

// ─── Safe offline azan ────────────────────────────────────────────────────────
let OFFLINE_AZAN = null;
try { OFFLINE_AZAN = require('./assets/azan.wav'); } catch (e) {}

// ─── Default TASBEEH_LIST ────────────────────────────────────────────────────
const TASBEEH_LIST = [
  { name: 'SubhanAllah', nameUr: 'سبحان اللہ', arabic: 'سُبْحَانَ اللَّهِ', target: 33 },
  { name: 'Alhamdulillah', nameUr: 'الحمد للہ', arabic: 'الْحَمْدُ لِلَّهِ', target: 33 },
  { name: 'Allahu Akbar', nameUr: 'اللہ اکبر', arabic: 'اللَّهُ أَكْبَرُ', target: 34 },
  { name: 'Astaghfirullah', nameUr: 'استغفراللہ', arabic: 'أَسْتَغْفِرُ اللَّهَ', target: 100 },
  { name: 'La ilaha illallah', nameUr: 'لا الہ الا اللہ', arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ', target: 100 },
  { name: 'Salawat', nameUr: 'درود شریف', arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّد', target: 100 },
  { name: 'La hawla wala quwwata', nameUr: 'لا حول ولا قوۃ', arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', target: 100 },
  { name: 'SubhanAllahi wa bihamdihi', nameUr: 'سبحان اللہ وبحمدہ', arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', target: 100 },
  { name: 'SubhanAllahil Azeem', nameUr: 'سبحان اللہ العظیم', arabic: 'سُبْحَانَ اللَّهِ الْعَظِيمِ', target: 100 },
  { name: 'Hasbunallah', nameUr: 'حسبنا اللہ', arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ', target: 100 },
  { name: 'Bismillah', nameUr: 'بسم اللہ', arabic: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ', target: 100 },
  { name: 'Allahu Akbar (100)', nameUr: 'اللہ اکبر (۱۰۰)', arabic: 'اللَّهُ أَكْبَرُ', target: 100 },
  { name: 'Ya Allah', nameUr: 'یا اللہ', arabic: 'يَا اللَّهُ', target: 100 },
  { name: 'Ya Rahman', nameUr: 'یا رحمن', arabic: 'يَا رَحْمَنُ', target: 100 },
  { name: 'Ya Rahim', nameUr: 'یا رحیم', arabic: 'يَا رَحِيمُ', target: 100 },
  { name: 'Ya Ghafoor', nameUr: 'یا غفور', arabic: 'يَا غَفُورُ', target: 100 },
  { name: 'Ya Kareem', nameUr: 'یا کریم', arabic: 'يَا كَرِيمُ', target: 100 },
  { name: 'Ya Tawwab', nameUr: 'یا توّاب', arabic: 'يَا تَوَّابُ', target: 100 },
  { name: 'Rabbighfirli', nameUr: 'رب اغفر لی', arabic: 'رَبِّ اغْفِرْ لِي', target: 100 },
  { name: 'Rabbana atina', nameUr: 'ربنا آتنا', arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً', target: 100 },
  { name: 'Subhana Rabbiyal Azeem', nameUr: 'سبحان ربی العظیم', arabic: 'سُبْحَانَ رَبِّيَ الْعَظِيمِ', target: 100 },
  { name: 'Subhana Rabbiyal Aala', nameUr: 'سبحان ربی الاعلیٰ', arabic: 'سُبْحَانَ رَبِّيَ الْأَعْلَى', target: 100 },
  { name: 'Allahummagh firli', nameUr: 'اللہم اغفر لی', arabic: 'اللَّهُمَّ اغْفِرْ لِي', target: 100 },
  { name: "Allahumma inni as'aluk", nameUr: 'اللہم انی اسالک الجنۃ', arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْجَنَّةَ', target: 100 },
  { name: 'Laa ilaaha illaa anta', nameUr: 'لا الہ الا انت سبحانک', arabic: 'لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ', target: 100 },
  { name: 'Allahumma salli', nameUr: 'اللہم صل وسلم', arabic: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا', target: 100 },
  { name: 'Tawakkalu alallah', nameUr: 'توکلت علی اللہ', arabic: 'تَوَكَّلْتُ عَلَى اللَّهِ', target: 100 },
  { name: 'Inna lillahi', nameUr: 'انا للہ واناالیہ راجعون', arabic: 'إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ', target: 100 },
  { name: 'Mashallah', nameUr: 'ما شاء اللہ', arabic: 'مَا شَاءَ اللَّهُ', target: 100 },
  { name: 'Inshallah', nameUr: 'ان شاء اللہ', arabic: 'إِنْ شَاءَ اللَّهُ', target: 100 },
  { name: 'Jazakallah Khair', nameUr: 'جزاک اللہ خیراً', arabic: 'جَزَاكَ اللَّهُ خَيْرًا', target: 100 },
  { name: 'Barakallahu feek', nameUr: 'بارک اللہ فیک', arabic: 'بَارَكَ اللَّهُ فِيكَ', target: 100 },
  { name: 'Alhamdulillahi Rabbil Alameen', nameUr: 'الحمد للہ رب العالمین', arabic: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ', target: 100 },
  { name: 'Allahu Lateef', nameUr: 'اللہ لطیف', arabic: 'اللَّهُ لَطِيفٌ بِعِبَادِهِ', target: 100 },
  { name: 'Hamdala', nameUr: 'حمدلہ', arabic: 'الْحَمْدُ لِلَّهِ عَلَى كُلِّ حَالٍ', target: 100 },
  { name: 'Ya Hafiz', nameUr: 'یا حافظ', arabic: 'يَا حَافِظُ', target: 100 },
  { name: 'Ya Shakoor', nameUr: 'یا شکور', arabic: 'يَا شَكُورُ', target: 100 },
  { name: 'Ya Majeed', nameUr: 'یا مجید', arabic: 'يَا مَجِيدُ', target: 100 },
  { name: 'Ya Wahhab', nameUr: 'یا وہاب', arabic: 'يَا وَهَّابُ', target: 100 },
  { name: 'Ya Razzaq', nameUr: 'یا رزاق', arabic: 'يَا رَزَّاقُ', target: 100 },
  { name: 'Ya Fattah', nameUr: 'یا فتاح', arabic: 'يَا فَتَّاحُ', target: 100 },
  { name: 'Ya Aleem', nameUr: 'یا علیم', arabic: 'يَا عَلِيمُ', target: 100 },
  { name: 'Ya Qabid', nameUr: 'یا قابض', arabic: 'يَا قَابِضُ', target: 100 },
  { name: 'Ya Basit', nameUr: 'یا باسط', arabic: 'يَا بَاسِطُ', target: 100 },
  { name: 'Ya Hafid', nameUr: 'یا خافض', arabic: 'يَا خَافِضُ', target: 100 },
  { name: 'Ya Rafi', nameUr: 'یا رافع', arabic: 'يَا رَافِعُ', target: 100 },
  { name: 'Ya Muizz', nameUr: 'یا معز', arabic: 'يَا مُعِزُّ', target: 100 },
  { name: 'Ya Muzill', nameUr: 'یا مذل', arabic: 'يَا مُذِلُّ', target: 100 },
  { name: 'Ya Samee', nameUr: 'یا سمیع', arabic: 'يَا سَمِيعُ', target: 100 },
  { name: 'Ya Baseer', nameUr: 'یا بصیر', arabic: 'يَا بَصِيرُ', target: 100 },
  { name: 'Ya Hakam', nameUr: 'یا حکم', arabic: 'يَا حَكَمُ', target: 100 },
  { name: 'Ya Adl', nameUr: 'یا عدل', arabic: 'يَا عَدْلُ', target: 100 },
  { name: 'Ya Lateef', nameUr: 'یا لطیف', arabic: 'يَا لَطِيفُ', target: 100 },
  { name: 'Ya Khabeer', nameUr: 'یا خبیر', arabic: 'يَا خَبِيرُ', target: 100 },
  { name: 'Ya Haleem', nameUr: 'یا حلیم', arabic: 'يَا حَلِيمُ', target: 100 },
  { name: 'Ya Azeem', nameUr: 'یا عظیم', arabic: 'يَا عَظِيمُ', target: 100 },
  { name: 'Ya Aliyy', nameUr: 'یا علی', arabic: 'يَا عَلِيُّ', target: 100 },
  { name: 'Ya Kabeer', nameUr: 'یا کبیر', arabic: 'يَا كَبِيرُ', target: 100 },
  { name: 'Ya Hafeez', nameUr: 'یا حفیظ', arabic: 'يَا حَفِيظُ', target: 100 },
  { name: 'Ya Muqeet', nameUr: 'یا مقیت', arabic: 'يَا مُقِيتُ', target: 100 },
  { name: 'Ya Haseeb', nameUr: 'یا حسیب', arabic: 'يَا حَسِيبُ', target: 100 },
  { name: 'Ya Jaleel', nameUr: 'یا جلیل', arabic: 'يَا جَلِيلُ', target: 100 },
  { name: 'Ya Karim', nameUr: 'یا کریم', arabic: 'يَا كَرِيمُ', target: 100 },
  { name: 'Ya Raqeeb', nameUr: 'یا رقیب', arabic: 'يَا رَقِيبُ', target: 100 },
  { name: 'Ya Mujeeb', nameUr: 'یا مجیب', arabic: 'يَا مُجِيبُ', target: 100 },
  { name: 'Ya Wasi', nameUr: 'یا واسع', arabic: 'يَا وَاسِعُ', target: 100 },
  { name: 'Ya Hakeem', nameUr: 'یا حکیم', arabic: 'يَا حَكِيمُ', target: 100 },
  { name: 'Ya Wadud', nameUr: 'یا ودود', arabic: 'يَا وَدُودُ', target: 100 },
  { name: 'Ya Majid', nameUr: 'یا مجید', arabic: 'يَا مَجِيدُ', target: 100 },
  { name: 'Ya Muqaddim', nameUr: 'یا مقدم', arabic: 'يَا مُقَدِّمُ', target: 100 },
  { name: 'Ya Baaith', nameUr: 'یا باعث', arabic: 'يَا بَاعِثُ', target: 100 },
  { name: 'Ya Shaheed', nameUr: 'یا شہید', arabic: 'يَا شَهِيدُ', target: 100 },
  { name: 'Ya Haqq', nameUr: 'یا حق', arabic: 'يَا حَقُّ', target: 100 },
  { name: 'Ya Wakeel', nameUr: 'یا وکیل', arabic: 'يَا وَكِيلُ', target: 100 },
  { name: 'Ya Qawiyy', nameUr: 'یا قوی', arabic: 'يَا قَوِيُّ', target: 100 },
  { name: 'Ya Mateen', nameUr: 'یا متین', arabic: 'يَا مَتِينُ', target: 100 },
  { name: 'Ya Wali', nameUr: 'یا ولی', arabic: 'يَا وَلِيُّ', target: 100 },
  { name: 'Ya Hameed', nameUr: 'یا حمید', arabic: 'يَا حَمِيدُ', target: 100 },
  { name: 'Ya Muhsi', nameUr: 'یا محصی', arabic: 'يَا مُحْصِي', target: 100 },
];

const DUAS_LIST = [
  { id: 1, category: 'Waking Up', categoryUr: 'بیدار ہونا', name: 'Upon Waking (1)', nameUr: 'بیدار ہونے کی دعا (۱)', arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ', translation: 'All praise is for Allah who gave us life after having taken it from us and unto Him is the resurrection.', translationUr: 'تمام تعریفیں اللہ کے لیے ہیں جس نے ہمیں موت دینے کے بعد زندگی دی اور اسی کی طرف دوبارہ اٹھنا ہے۔' },
  { id: 2, category: 'Waking Up', categoryUr: 'بیدار ہونا', name: 'Upon Waking (2)', nameUr: 'بیدار ہونے کی دعا (۲)', arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ', translation: 'There is none worthy of worship but Allah alone, Who has no partner, His is the dominion and to Him belongs all praise, and He is able to do all things.', translationUr: 'اللہ کے سوا کوئی عبادت کے لائق نہیں، وہ اکیلا ہے، اس کا کوئی شریک نہیں، اسی کی بادشاہت ہے اور اسی کی تعریف ہے، اور وہ ہر چیز پر قادر ہے۔' },
  { id: 3, category: 'Leaving Home', categoryUr: 'گھر سے نکلنا', name: 'Leaving the Home', nameUr: 'گھر سے نکلتے وقت', arabic: 'بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', translation: 'In the name of Allah, I place my trust in Allah, and there is no might nor power except with Allah.', translationUr: 'اللہ کے نام سے، میں نے اللہ پر بھروسہ کیا، اور طاقت اور قوت نہیں ہے مگر اللہ کی طرف سے۔' },
  { id: 4, category: 'Entering Home', categoryUr: 'گھر میں داخل', name: 'Entering the Home', nameUr: 'گھر میں داخل ہوتے وقت', arabic: 'بِسْمِ اللَّهِ وَلَجْنَا، وَبِسْمِ اللَّهِ خَرَجْنَا، وَعَلَى اللَّهِ رَبِّنَا تَوَكَّلْنَا', translation: 'In the name of Allah we enter, in the name of Allah we leave, and upon our Lord we place our trust.', translationUr: 'اللہ کے نام سے ہم داخل ہوئے، اللہ کے نام سے ہم باہر نکلے، اور اپنے رب اللہ ہی پر ہم نے بھروسہ کیا۔' },
  { id: 5, category: 'Masjid', categoryUr: 'مسجد', name: 'Entering Masjid', nameUr: 'مسجد میں داخل ہوتے وقت', arabic: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ', translation: 'O Allah, open the gates of Your mercy for me.', translationUr: 'اے اللہ، میرے لیے اپنی رحمت کے دروازے کھول دے۔' },
  { id: 6, category: 'Masjid', categoryUr: 'مسجد', name: 'Leaving Masjid', nameUr: 'مسجد سے نکلتے وقت', arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ', translation: 'O Allah, I ask You from Your favour.', translationUr: 'اے اللہ، میں تجھ سے تیرا فضل مانگتا ہوں۔' },
  { id: 7, category: 'Salah', categoryUr: 'نماز', name: 'Opening Dua in Prayer', nameUr: 'نماز کی ابتدائی دعا', arabic: 'سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، وَتَبَارَكَ اسْمُكَ، وَتَعَالَى جَدُّكَ، وَلَا إِلَهَ غَيْرُكَ', translation: 'How perfect You are O Allah, and I praise You. Blessed is Your name, and exalted is Your majesty. There is none worthy of worship except You.', translationUr: 'اے اللہ، تو پاک ہے اور تیری تعریف ہے، تیرا نام بابرکت ہے، تیری شان بلند ہے، اور تیرے سوا کوئی معبود نہیں۔' },
  { id: 8, category: 'Salah', categoryUr: 'نماز', name: 'In Ruku', nameUr: 'رکوع میں', arabic: 'سُبْحَانَ رَبِّيَ الْعَظِيمِ', translation: 'How perfect my Lord is, The Supreme.', translationUr: 'میرا رب عظیم ہے، پاک ہے۔' },
  { id: 9, category: 'Salah', categoryUr: 'نماز', name: 'Rising from Ruku', nameUr: 'رکوع سے اٹھتے وقت', arabic: 'سَمِعَ اللَّهُ لِمَنْ حَمِدَهُ، رَبَّنَا وَلَكَ الْحَمْدُ', translation: 'Allah hears those who praise Him. Our Lord, and to You is all praise.', translationUr: 'اللہ نے سنا جس نے اس کی تعریف کی، اے ہمارے رب، تیرے لیے تمام تعریف ہے۔' },
  { id: 10, category: 'Salah', categoryUr: 'نماز', name: 'In Sujood', nameUr: 'سجدے میں', arabic: 'سُبْحَانَ رَبِّيَ الْأَعْلَى', translation: 'How perfect my Lord is, The Most High.', translationUr: 'میرا رب اعلیٰ ہے، پاک ہے۔' },
  { id: 11, category: 'Salah', categoryUr: 'نماز', name: 'Between Sajdahs', nameUr: 'دو سجدوں کے درمیان', arabic: 'رَبِّ اغْفِرْ لِي، رَبِّ اغْفِرْ لِي', translation: 'O Lord forgive me, O Lord forgive me.', translationUr: 'اے میرے رب، مجھے بخش دے، اے میرے رب، مجھے بخش دے۔' },
  { id: 12, category: 'Salah', categoryUr: 'نماز', name: 'After Salah', nameUr: 'نماز کے بعد', arabic: 'اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ', translation: 'O Allah, You are As-Salam and from You is all peace, blessed are You, O Possessor of majesty and honour.', translationUr: 'اے اللہ، تو سلام ہے اور تجھ ہی سے سلامتی ہے، بابرکت ہے تو اے جلال اور عزت والے۔' },
  { id: 13, category: 'Morning', categoryUr: 'صبح', name: 'Morning Dhikr (1)', nameUr: 'صبح کا ذکر (۱)', arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ', translation: 'We have entered a new morning and with it all dominion belongs to Allah.', translationUr: 'ہم نے صبح کی اور ساری بادشاہی اللہ کی ہوگئی، اور تعریف اللہ کے لیے ہے، اللہ کے سوا کوئی عبادت کے لائق نہیں، وہ اکیلا ہے، اس کا کوئی شریک نہیں۔' },
  { id: 14, category: 'Morning', categoryUr: 'صبح', name: 'Morning Dhikr (2)', nameUr: 'صبح کا ذکر (۲)', arabic: 'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ', translation: 'O Allah, by Your leave we have reached the morning and by Your leave we have reached the evening.', translationUr: 'اے اللہ، تیرے ہی سے ہم نے صبح کی، تیرے ہی سے ہم نے شام کی، تیرے ہی سے ہم جیتے ہیں، تیرے ہی سے ہم مرتے ہیں، اور اسی کی طرف اٹھنا ہے۔' },
  { id: 15, category: 'Morning', categoryUr: 'صبح', name: 'Sayyid ul Istighfar', nameUr: 'سید الاستغفار', arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ', translation: 'O Allah, You are my Lord, there is none worthy of worship but You. You created me and I am your servant.', translationUr: 'اے اللہ، تو میرا رب ہے، تیرے سوا کوئی معبود نہیں، تو نے مجھے پیدا کیا اور میں تیرا بندہ ہوں۔' },
  { id: 16, category: 'Evening', categoryUr: 'شام', name: 'Evening Dhikr (1)', nameUr: 'شام کا ذکر (۱)', arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ', translation: 'We have entered the evening and with it all dominion belongs to Allah.', translationUr: 'ہم نے شام کی اور ساری بادشاہی اللہ کی ہوگئی، اور تعریف اللہ کے لیے ہے، اللہ کے سوا کوئی عبادت کے لائق نہیں، وہ اکیلا ہے، اس کا کوئی شریک نہیں۔' },
  { id: 17, category: 'Evening', categoryUr: 'شام', name: 'Evening Dhikr (2)', nameUr: 'شام کا ذکر (۲)', arabic: 'اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ', translation: 'O Allah, by Your leave we have reached the evening and by Your leave we have reached the morning.', translationUr: 'اے اللہ، تیرے ہی سے ہم نے شام کی، تیرے ہی سے ہم نے صبح کی، تیرے ہی سے ہم جیتے ہیں، تیرے ہی سے ہم مرتے ہیں، اور اسی کی طرف لوٹ کر جانا ہے۔' },
  { id: 18, category: 'Sleep', categoryUr: 'سونا', name: 'Before Sleep (1)', nameUr: 'سونے سے پہلے (۱)', arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا', translation: 'In Your name O Allah, I die and I live.', translationUr: 'اے اللہ، تیرے نام سے میں مرتا ہوں اور جیتا ہوں۔' },
  { id: 19, category: 'Sleep', categoryUr: 'سونا', name: 'Before Sleep (2)', nameUr: 'سونے سے پہلے (۲)', arabic: 'اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ', translation: 'O Allah, protect me from Your punishment on the day Your servants are resurrected.', translationUr: 'اے اللہ، مجھے اپنے عذاب سے بچا لے جس دن تو اپنے بندوں کو اٹھائے گا۔' },
  { id: 20, category: 'Sleep', categoryUr: 'سونا', name: 'Before Sleep (3)', nameUr: 'سونے سے پہلے (۳)', arabic: 'اللَّهُمَّ أَسْلَمْتُ نَفْسِي إِلَيْكَ، وَفَوَّضْتُ أَمْرِي إِلَيْكَ', translation: 'O Allah, I submit myself to You, I entrust my affairs to You.', translationUr: 'اے اللہ، میں نے اپنے آپ کو تیرے سپرد کیا، اور اپنا معاملہ تیرے حوالے کیا۔' },
  { id: 21, category: 'Sleep', categoryUr: 'سونا', name: 'Upon Waking at Night', nameUr: 'رات کو بیدار ہونے پر', arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ', translation: 'None has the right to be worshipped except Allah, alone, without partner.', translationUr: 'اللہ کے سوا کوئی عبادت کے لائق نہیں، وہ اکیلا ہے، اس کا کوئی شریک نہیں، اسی کی بادشاہی ہے اور اسی کی تعریف ہے۔' },
  { id: 22, category: 'Food', categoryUr: 'کھانا', name: 'Before Eating', nameUr: 'کھانے سے پہلے', arabic: 'بِسْمِ اللَّهِ', translation: 'In the name of Allah.', translationUr: 'اللہ کے نام سے۔' },
  { id: 23, category: 'Food', categoryUr: 'کھانا', name: 'Forgot Bismillah', nameUr: 'بسم اللہ بھول جانے پر', arabic: 'بِسْمِ اللَّهِ أَوَّلَهُ وَآخِرَهُ', translation: 'In the name of Allah, in its beginning and in its end.', translationUr: 'اللہ کے نام سے، اس کے شروع اور اس کے آخر میں۔' },
  { id: 24, category: 'Food', categoryUr: 'کھانا', name: 'After Eating', nameUr: 'کھانے کے بعد', arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ', translation: 'All praise is for Allah who fed me this and provided it for me without any might or power on my part.', translationUr: 'تمام تعریف اس اللہ کے لیے ہے جس نے مجھے یہ کھلایا اور یہ رزق مجھے دیا بغیر کسی طاقت اور قوت کے مجھ سے۔' },
  { id: 25, category: 'Food', categoryUr: 'کھانا', name: 'When Breaking Fast', nameUr: 'افطار کے وقت', arabic: 'اللَّهُمَّ لَكَ صُمْتُ وَعَلَى رِزْقِكَ أَفْطَرْتُ', translation: 'O Allah, for You I have fasted and upon Your provision I have broken my fast.', translationUr: 'اے اللہ، میں نے تیرے لیے روزہ رکھا اور تیرے رزق سے افطار کیا۔' },
  { id: 26, category: 'Food', categoryUr: 'کھانا', name: 'Dua for the Host', nameUr: 'میزبان کے لیے دعا', arabic: 'اللَّهُمَّ بَارِكْ لَهُمْ فِيمَا رَزَقْتَهُمْ، وَاغْفِرْ لَهُمْ وَارْحَمْهُمْ', translation: 'O Allah, bless them in what You have provided for them, and forgive them and have mercy upon them.', translationUr: 'اے اللہ، ان کے لیے برکت دے جو تو نے انہیں دیا ہے، اور انہیں بخش دے اور ان پر رحم فرما۔' },
  { id: 27, category: 'Travel', categoryUr: 'سفر', name: 'Boarding a Vehicle', nameUr: 'سواری پر سوار ہوتے وقت', arabic: 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ', translation: 'How perfect He is, the One Who has placed this at our service.', translationUr: 'پاک ہے وہ جس نے ہمارے لیے اسے مسخر کیا اور ہم اس کی طاقت نہیں رکھتے تھے، اور ہمیں اپنے رب کی طرف لوٹنا ہے۔' },
  { id: 28, category: 'Travel', categoryUr: 'سفر', name: 'Dua for Travelling', nameUr: 'سفر کی دعا', arabic: 'اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى، وَمِنَ الْعَمَلِ مَا تَرْضَى', translation: 'O Allah, we ask You on this journey for goodness and piety, and deeds that are pleasing to You.', translationUr: 'اے اللہ، ہم تجھ سے اس سفر میں نیکی اور پرہیزگاری مانگتے ہیں، اور ایسے عمل جو تجھے پسند ہوں۔' },
  { id: 29, category: 'Travel', categoryUr: 'سفر', name: 'Returning from Travel', nameUr: 'سفر سے واپسی پر', arabic: 'آيِبُونَ، تَائِبُونَ، عَابِدُونَ، لِرَبِّنَا حَامِدُونَ', translation: 'We return, repent, worship, and praise our Lord.', translationUr: 'لوٹنے والے، توبہ کرنے والے، عبادت کرنے والے، اور اپنے رب کی تعریف کرنے والے ہیں۔' },
  { id: 30, category: 'Travel', categoryUr: 'سفر', name: 'Entering a Town', nameUr: 'شہر میں داخل ہوتے وقت', arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَهَا وَخَيْرَ أَهْلِهَا، وَخَيْرَ مَا فِيهَا', translation: 'O Allah, I ask You for the best of it, the best of its inhabitants, and the best of what is in it.', translationUr: 'اے اللہ، میں تجھ سے اس کی بھلائی، اس کے رہنے والوں کی بھلائی، اور جو کچھ اس میں ہے اس کی بھلائی مانگتا ہوں۔' },
  { id: 31, category: 'Distress', categoryUr: 'پریشانی', name: 'For Anxiety & Sorrow (1)', nameUr: 'پریشانی کی دعا (۱)', arabic: 'اللَّهُمَّ إِنِّي عَبْدُكَ، ابْنُ عَبْدِكَ، ابْنُ أَمَتِكَ، نَاصِيَتِي بِيَدِكَ', translation: 'O Allah, I am Your servant, son of Your servant, son of Your maidservant, my forelock is in Your hand.', translationUr: 'اے اللہ، میں تیرا بندہ ہوں، تیرے بندے کا بیٹا، تیری بندی کا بیٹا، میری پیشانی تیرے ہاتھ میں ہے۔' },
  { id: 32, category: 'Distress', categoryUr: 'پریشانی', name: 'For Anxiety & Sorrow (2)', nameUr: 'پریشانی کی دعا (۲)', arabic: 'اللَّهُمَّ رَحْمَتَكَ أَرْجُو، فَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ', translation: 'O Allah, it is Your mercy that I hope for, so do not leave me in charge of my affairs even for the blink of an eye.', translationUr: 'اے اللہ، میں تیری رحمت کی امید رکھتا ہوں، تو مجھے اپنے نفس کے سپرد نہ کر ایک آنکھ جھپکنے کے برابر بھی۔' },
  { id: 33, category: 'Distress', categoryUr: 'پریشانی', name: 'Dua of Yunus (AS)', nameUr: 'دعائے یونس علیہ السلام', arabic: 'لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ', translation: 'There is none worthy of worship except You, how perfect You are, verily I was among the wrongdoers.', translationUr: 'تیرے سوا کوئی معبود نہیں، تو پاک ہے، بے شک میں ظالموں میں سے تھا۔' },
  { id: 34, category: 'Distress', categoryUr: 'پریشانی', name: 'When in Distress', nameUr: 'مصیبت کے وقت', arabic: 'حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ، عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ', translation: 'Allah is sufficient for me, there is none worthy of worship but Him.', translationUr: 'اللہ میرے لیے کافی ہے، اس کے سوا کوئی معبود نہیں، اسی پر میں نے بھروسہ کیا اور وہ عرش عظیم کا رب ہے۔' },
  { id: 35, category: 'Sickness', categoryUr: 'بیماری', name: 'Visiting the Sick', nameUr: 'بیمار کی عیادت', arabic: 'أَسْأَلُ اللَّهَ الْعَظِيمَ رَبَّ الْعَرْشِ الْعَظِيمِ أَنْ يَشْفِيَكَ', translation: 'I ask Allah the Magnificent, Lord of the Magnificent Throne to cure you.', translationUr: 'میں اللہ عظیم سے، عرش عظیم کے رب سے پوچھتا ہوں کہ وہ تمہیں شفا دے۔' },
  { id: 36, category: 'Sickness', categoryUr: 'بیماری', name: 'Placing hand on pain', nameUr: 'تکلیف پر ہاتھ رکھ کر', arabic: 'بِسْمِ اللَّهِ، أَعُوذُ بِاللَّهِ وَقُدْرَتِهِ مِنْ شَرِّ مَا أَجِدُ وَأُحَاذِرُ', translation: 'In the name of Allah. I seek refuge in Allah and His power from the evil of what I feel.', translationUr: 'اللہ کے نام سے، میں اللہ اور اس کی قدرت کی پناہ مانگتا ہوں اس برائی سے جو میں محسوس کر رہا ہوں اور جس سے ڈرتا ہوں۔' },
  { id: 37, category: 'Weather', categoryUr: 'موسم', name: 'When it Rains', nameUr: 'بارش کے وقت', arabic: 'اللَّهُمَّ صَيِّبًا نَافِعًا', translation: 'O Allah, may it be a beneficial rain cloud.', translationUr: 'اے اللہ، نفع بخش بارش برسا۔' },
  { id: 38, category: 'Weather', categoryUr: 'موسم', name: 'After Rain', nameUr: 'بارش کے بعد', arabic: 'مُطِرْنَا بِفَضْلِ اللَّهِ وَرَحْمَتِهِ', translation: 'We have been given rain by the grace and mercy of Allah.', translationUr: 'ہمیں اللہ کے فضل اور رحمت سے بارش دی گئی۔' },
  { id: 39, category: 'Weather', categoryUr: 'موسم', name: 'When Hearing Thunder', nameUr: 'گرج سنتے وقت', arabic: 'سُبْحَانَ الَّذِي يُسَبِّحُ الرَّعْدُ بِحَمْدِهِ', translation: 'How perfect He is, the One Whom the thunder glorifies and praises.', translationUr: 'پاک ہے وہ جس کی حمد کے ساتھ بادل کی گرج تسبیح کرتی ہے۔' },
  { id: 40, category: 'Weather', categoryUr: 'موسم', name: 'Upon Seeing New Moon', nameUr: 'نیا چاند دیکھتے وقت', arabic: 'اللَّهُمَّ أَهِلَّهُ عَلَيْنَا بِالْيُمْنِ وَالْإِيمَانِ، وَالسَّلَامَةِ وَالْإِسْلَامِ', translation: 'O Allah, bring it over us with blessing, faith, safety, and Islam.', translationUr: 'اے اللہ، یہ چاند ہم پر برکت، ایمان، سلامتی اور اسلام کے ساتھ لا۔' },
  { id: 41, category: 'Protection', categoryUr: 'حفاظت', name: 'Morning Protection', nameUr: 'صبح کی حفاظت', arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ', translation: 'I seek refuge in the perfect words of Allah from the evil of what He has created.', translationUr: 'میں اللہ کے مکمل کلمات کی پناہ میں آتا ہوں اس چیز کے شر سے جو اس نے پیدا کی ہے۔' },
  { id: 42, category: 'Protection', categoryUr: 'حفاظت', name: 'From Shaytan', nameUr: 'شیطان سے پناہ', arabic: 'أَعُوذُ بِاللَّهِ السَّمِيعِ الْعَلِيمِ مِنَ الشَّيْطَانِ الرَّجِيمِ', translation: 'I seek refuge with Allah, the All-Hearing, the All-Knowing from the accursed devil.', translationUr: 'میں اللہ سمیع و علیم کی پناہ مانگتا ہوں شیطان مردود سے۔' },
  { id: 43, category: 'Protection', categoryUr: 'حفاظت', name: 'Before Bathroom', nameUr: 'بیت الخلاء جاتے وقت', arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ', translation: 'O Allah, I seek Your protection from the male and female devil.', translationUr: 'اے اللہ، میں تیری پناہ مانگتا ہوں تمام مرد اور عورت شیطانوں سے۔' },
  { id: 44, category: 'Forgiveness', categoryUr: 'استغفار', name: 'Istighfar (1)', nameUr: 'استغفار (۱)', arabic: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ', translation: 'I seek the forgiveness of Allah and repent to Him.', translationUr: 'میں اللہ سے مغفرت مانگتا ہوں اور اس کی طرف توبہ کرتا ہوں۔' },
  { id: 45, category: 'Forgiveness', categoryUr: 'استغفار', name: 'Istighfar (2)', nameUr: 'استغفار (۲)', arabic: 'أَسْتَغْفِرُ اللَّهَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ', translation: 'I seek the forgiveness of Allah, there is none worthy of worship but He, the Living, the Eternal.', translationUr: 'میں اس اللہ سے مغفرت مانگتا ہوں جس کے سوا کوئی معبود نہیں، وہ زندہ اور قیوم ہے، اور میں اس کی طرف توبہ کرتا ہوں۔' },
  { id: 46, category: 'Quran Duas', categoryUr: 'قرآنی دعائیں', name: 'Rabbana Atina', nameUr: 'ربنا آتنا', arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ', translation: 'Our Lord, give us in this world that which is good and in the Hereafter that which is good, and save us from the torment of the Fire.', translationUr: 'اے ہمارے رب، ہمیں دنیا میں بھلائی دے اور آخرت میں بھلائی دے اور ہمیں جہنم کے عذاب سے بچا۔' },
  { id: 47, category: 'Quran Duas', categoryUr: 'قرآنی دعائیں', name: 'Rabbana Taqabbal', nameUr: 'ربنا تقبل منا', arabic: 'رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنْتَ السَّمِيعُ الْعَلِيمُ', translation: 'Our Lord, accept from us. Indeed, You are the Hearing, the Knowing.', translationUr: 'اے ہمارے رب، ہم سے قبول فرما، بے شک تو ہی سننے والا، جاننے والا ہے۔' },
  { id: 48, category: 'Quran Duas', categoryUr: 'قرآنی دعائیں', name: 'Dua of Musa (AS)', nameUr: 'دعائے موسیٰ علیہ السلام', arabic: 'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي', translation: 'My Lord, expand for me my breast and ease for me my task.', translationUr: 'اے میرے رب، میرے لیے میرا سینہ کھول دے اور میرے لیے میرا کام آسان کر دے۔' },
  { id: 49, category: 'Quran Duas', categoryUr: 'قرآنی دعائیں', name: 'For Parents', nameUr: 'والدین کے لیے دعا', arabic: 'رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا', translation: 'My Lord, have mercy upon them as they brought me up when I was small.', translationUr: 'اے میرے رب، ان دونوں پر رحم فرما جیسا کہ انہوں نے مجھے بچپن میں پالا۔' },
  { id: 50, category: 'Quran Duas', categoryUr: 'قرآنی دعائیں', name: 'Dua for Knowledge', nameUr: 'علم کی دعا', arabic: 'رَبِّ زِدْنِي عِلْمًا', translation: 'My Lord, increase me in knowledge.', translationUr: 'اے میرے رب، میرے علم میں اضافہ فرما۔' },
];

const NAMES_OF_ALLAH = [
  { id: 1, name: 'Ar-Rahman', arabic: 'الرَّحْمَنُ', meaning: 'The Most Gracious', meaningUr: 'بہت مہربان' },
  { id: 2, name: 'Ar-Rahim', arabic: 'الرَّحِيمُ', meaning: 'The Most Merciful', meaningUr: 'نہایت رحم والا' },
  { id: 3, name: 'Al-Malik', arabic: 'الْمَلِكُ', meaning: 'The King', meaningUr: 'بادشاہ' },
  { id: 4, name: 'Al-Quddus', arabic: 'الْقُدوسُ', meaning: 'The Most Holy', meaningUr: 'پاک ذات' },
  { id: 5, name: 'As-Salam', arabic: 'السَّلَامُ', meaning: 'The Source of Peace', meaningUr: 'سلامتی کا سرچشمہ' },
  { id: 6, name: 'Al-Mumin', arabic: 'الْمُؤْمِنُ', meaning: 'The Guardian of Faith', meaningUr: 'ایمان کا محافظ' },
  { id: 7, name: 'Al-Muhaymin', arabic: 'الْمُهَيْمِنُ', meaning: 'The Protector', meaningUr: 'نگہبان' },
  { id: 8, name: 'Al-Aziz', arabic: 'الْعَزِيزُ', meaning: 'The Almighty', meaningUr: 'غالب' },
  { id: 9, name: 'Al-Jabbar', arabic: 'الْجَبَارُ', meaning: 'The Compeller', meaningUr: 'زبردست' },
  { id: 10, name: 'Al-Mutakabbir', arabic: 'الْمُتَكَبِّرُ', meaning: 'The Supreme', meaningUr: 'بڑائی والا' },
  { id: 11, name: 'Al-Khaliq', arabic: 'الْخَالِقُ', meaning: 'The Creator', meaningUr: 'پیدا کرنے والا' },
  { id: 12, name: 'Al-Bari', arabic: 'الْبَارِئُ', meaning: 'The Originator', meaningUr: 'بنانے والا' },
  { id: 13, name: 'Al-Musawwir', arabic: 'الْمُصَوِّرُ', meaning: 'The Fashioner', meaningUr: 'صورت بنانے والا' },
  { id: 14, name: 'Al-Ghaffar', arabic: 'الْغَفَارُ', meaning: 'The Ever-Forgiving', meaningUr: 'بہت بخشنے والا' },
  { id: 15, name: 'Al-Qahhar', arabic: 'الْقَهَّارُ', meaning: 'The Subduer', meaningUr: 'غالب' },
  { id: 16, name: 'Al-Wahhab', arabic: 'الوَهَّابُ', meaning: 'The Bestower', meaningUr: 'بہت عطا کرنے والا' },
  { id: 17, name: 'Ar-Razzaq', arabic: 'الرَّزَّاقُ', meaning: 'The Provider', meaningUr: 'رزق دینے والا' },
  { id: 18, name: 'Al-Fattah', arabic: 'الْفَتَّاحُ', meaning: 'The Opener', meaningUr: 'کھولنے والا' },
  { id: 19, name: 'Al-Alim', arabic: 'الْعَلِيمُ', meaning: 'The All-Knowing', meaningUr: 'سب کچھ جاننے والا' },
  { id: 20, name: 'Al-Qabid', arabic: 'الْقَابِضُ', meaning: 'The Withholder', meaningUr: 'روکنے والا' },
  { id: 21, name: 'Al-Basit', arabic: 'الْبَاسِطُ', meaning: 'The Extender', meaningUr: 'پھیلانے والا' },
  { id: 22, name: 'Al-Khafid', arabic: 'الْخَافِض', meaning: 'The Abaser', meaningUr: 'پست کرنے والا' },
  { id: 23, name: 'Ar-Rafi', arabic: 'الرَّافِعُ', meaning: 'The Exalter', meaningUr: 'بلند کرنے والا' },
  { id: 24, name: 'Al-Muizz', arabic: 'الْمعِزُّ', meaning: 'The Honourer', meaningUr: 'عزت دینے والا' },
  { id: 25, name: 'Al-Mudhill', arabic: 'الْمُذِلُّ', meaning: 'The Humiliator', meaningUr: 'ذلیل کرنے والا' },
  { id: 26, name: 'As-Sami', arabic: 'السَّمِيعُ', meaning: 'The All-Hearing', meaningUr: 'سب کچھ سننے والا' },
  { id: 27, name: 'Al-Basir', arabic: 'الْبَصِيرُ', meaning: 'The All-Seeing', meaningUr: 'سب کچھ دیکھنے والا' },
  { id: 28, name: 'Al-Hakam', arabic: 'الْحَكَمُ', meaning: 'The Judge', meaningUr: 'فیصلہ کرنے والا' },
  { id: 29, name: 'Al-Adl', arabic: 'الْعَدْلُ', meaning: 'The Just', meaningUr: 'انصاف کرنے والا' },
  { id: 30, name: 'Al-Latif', arabic: 'اللَّطِيفُ', meaning: 'The Subtle One', meaningUr: 'باریک بین' },
  { id: 31, name: 'Al-Khabir', arabic: 'الْخَبِيرُ', meaning: 'The All-Aware', meaningUr: 'باخبر' },
  { id: 32, name: 'Al-Halim', arabic: 'الْحَلِيمُ', meaning: 'The Forbearing', meaningUr: 'بردبار' },
  { id: 33, name: 'Al-Azim', arabic: 'الْعَظِيمُ', meaning: 'The Magnificent', meaningUr: 'عظیم' },
  { id: 34, name: 'Al-Ghafur', arabic: 'الْغَفُور', meaning: 'The Forgiving', meaningUr: 'بخشنے والا' },
  { id: 35, name: 'Ash-Shakur', arabic: 'الشكُورُ', meaning: 'The Appreciative', meaningUr: 'قدردان' },
  { id: 36, name: 'Al-Aliyy', arabic: 'الْعَلِيُّ', meaning: 'The Most High', meaningUr: 'سب سے اونچا' },
  { id: 37, name: 'Al-Kabir', arabic: 'الْكَبِيرُ', meaning: 'The Greatest', meaningUr: 'سب سے بڑا' },
  { id: 38, name: 'Al-Hafiz', arabic: 'الْحَفِيظُ', meaning: 'The Preserver', meaningUr: 'محفوظ رکھنے والا' },
  { id: 39, name: 'Al-Muqit', arabic: 'الْمُقِيتُ', meaning: 'The Sustainer', meaningUr: 'پالنے والا' },
  { id: 40, name: 'Al-Hasib', arabic: 'الْحَسِيبُ', meaning: 'The Reckoner', meaningUr: 'حساب لینے والا' },
  { id: 41, name: 'Al-Jalil', arabic: 'الْجَلِيلُ', meaning: 'The Majestic', meaningUr: 'جلالت والا' },
  { id: 42, name: 'Al-Karim', arabic: 'الْكَرِيمُ', meaning: 'The Most Generous', meaningUr: 'بہت کریم' },
  { id: 43, name: 'Ar-Raqib', arabic: 'الرَّقِيبُ', meaning: 'The Watchful', meaningUr: 'نگرانی کرنے والا' },
  { id: 44, name: 'Al-Mujib', arabic: 'الْمُجِيبُ', meaning: 'The Responsive', meaningUr: 'قبول کرنے والا' },
  { id: 45, name: 'Al-Wasi', arabic: 'الْوَاسِعُ', meaning: 'The All-Encompassing', meaningUr: 'وسعت والا' },
  { id: 46, name: 'Al-Hakim', arabic: 'الْحَكِيمُ', meaning: 'The All-Wise', meaningUr: 'حکمت والا' },
  { id: 47, name: 'Al-Wadud', arabic: 'الْوَدُودُ', meaning: 'The Loving', meaningUr: 'محبت کرنے والا' },
  { id: 48, name: 'Al-Majid', arabic: 'الْمَجِيدُ', meaning: 'The Glorious', meaningUr: 'بزرگی والا' },
  { id: 49, name: 'Al-Baith', arabic: 'الْبَاعِث', meaning: 'The Resurrector', meaningUr: 'اٹھانے والا' },
  { id: 50, name: 'Ash-Shahid', arabic: 'الشَهِيدُ', meaning: 'The Witness', meaningUr: 'گواہ' },
  { id: 51, name: 'Al-Haqq', arabic: 'الْحَقُّ', meaning: 'The Truth', meaningUr: 'سچ' },
  { id: 52, name: 'Al-Wakil', arabic: 'الْوَكِيلُ', meaning: 'The Trustee', meaningUr: 'کارساز' },
  { id: 53, name: 'Al-Qawiyy', arabic: 'الْقَوِيُّ', meaning: 'The Most Strong', meaningUr: 'بہت طاقتور' },
  { id: 54, name: 'Al-Matin', arabic: 'الْمَتِينُ', meaning: 'The Firm', meaningUr: 'مضبوط' },
  { id: 55, name: 'Al-Waliyy', arabic: 'الْوَلِيُّ', meaning: 'The Protecting Friend', meaningUr: 'دوست و مددگار' },
  { id: 56, name: 'Al-Hamid', arabic: 'الْحَمِيدُ', meaning: 'The Praiseworthy', meaningUr: 'تعریف کے لائق' },
  { id: 57, name: 'Al-Muhsi', arabic: 'الْمُحْصِي', meaning: 'The Counter', meaningUr: 'گنتی کرنے والا' },
  { id: 58, name: 'Al-Mubdi', arabic: 'الْمُبْدئُ', meaning: 'The Originator', meaningUr: 'شروع کرنے والا' },
  { id: 59, name: 'Al-Muid', arabic: 'الْمعِيدُ', meaning: 'The Restorer', meaningUr: 'لوٹانے والا' },
  { id: 60, name: 'Al-Muhyi', arabic: 'الْمُحْيِي', meaning: 'The Giver of Life', meaningUr: 'زندگی دینے والا' },
  { id: 61, name: 'Al-Mumit', arabic: 'الْمُمِيتُ', meaning: 'The Taker of Life', meaningUr: 'موت دینے والا' },
  { id: 62, name: 'Al-Hayy', arabic: 'الْحَيُّ', meaning: 'The Ever-Living', meaningUr: 'ہمیشہ زندہ' },
  { id: 63, name: 'Al-Qayyum', arabic: 'الْقَيومُ', meaning: 'The Self-Subsisting', meaningUr: 'قائم بالذات' },
  { id: 64, name: 'Al-Wajid', arabic: 'الْوَاجِدُ', meaning: 'The Finder', meaningUr: 'پانے والا' },
  { id: 65, name: 'Al-Majid', arabic: 'الْمَاجِدُ', meaning: 'The Noble', meaningUr: 'شریف' },
  { id: 66, name: 'Al-Wahid', arabic: 'الْوَاحِدُ', meaning: 'The One', meaningUr: 'ایک' },
  { id: 67, name: 'Al-Ahad', arabic: 'الْأَحَدُ', meaning: 'The Unique', meaningUr: 'یکتا' },
  { id: 68, name: 'As-Samad', arabic: 'الصَّمَدُ', meaning: 'The Eternal', meaningUr: 'بے نیاز' },
  { id: 69, name: 'Al-Qadir', arabic: 'الْقَادِرُ', meaning: 'The Capable', meaningUr: 'قادر' },
  { id: 70, name: 'Al-Muqtadir', arabic: 'الْمُقْتَدرُ', meaning: 'The Powerful', meaningUr: 'طاقتور' },
  { id: 71, name: 'Al-Muqaddim', arabic: 'الْمُقَدِّمُ', meaning: 'The Expediter', meaningUr: 'آگے کرنے والا' },
  { id: 72, name: 'Al-Muakhkhir', arabic: 'الْمُؤَخِّرُ', meaning: 'The Delayer', meaningUr: 'پیچھے کرنے والا' },
  { id: 73, name: 'Al-Awwal', arabic: 'الْأَوَّلُ', meaning: 'The First', meaningUr: 'پہلا' },
  { id: 74, name: 'Al-Akhir', arabic: 'الْآخِرُ', meaning: 'The Last', meaningUr: 'آخری' },
  { id: 75, name: 'Az-Zahir', arabic: 'الظَّاهِرُ', meaning: 'The Manifest', meaningUr: 'ظاہر' },
  { id: 76, name: 'Al-Batin', arabic: 'الْباطِنُ', meaning: 'The Hidden', meaningUr: 'پوشیدہ' },
  { id: 77, name: 'Al-Wali', arabic: 'الْوَالِي', meaning: 'The Governor', meaningUr: 'حاکم' },
  { id: 78, name: 'Al-Mutaali', arabic: 'الْمُتَعَالِي', meaning: 'The Most Exalted', meaningUr: 'سب سے بلند' },
  { id: 79, name: 'Al-Barr', arabic: 'الْبَرُّ', meaning: 'The Source of Goodness', meaningUr: 'نیکی کا سرچشمہ' },
  { id: 80, name: 'At-Tawwab', arabic: 'التَّوَّابُ', meaning: 'The Ever-Accepting of Repentance', meaningUr: 'توبہ قبول کرنے والا' },
  { id: 81, name: 'Al-Muntaqim', arabic: 'الْمُنْتَقِمُ', meaning: 'The Avenger', meaningUr: 'بدلہ لینے والا' },
  { id: 82, name: 'Al-Afuww', arabic: 'الْعَفُوُّ', meaning: 'The Pardoner', meaningUr: 'معاف کرنے والا' },
  { id: 83, name: 'Ar-Rauf', arabic: 'الرَّؤُوفُ', meaning: 'The Most Kind', meaningUr: 'بہت شفیق' },
  { id: 84, name: 'Malik-ul-Mulk', arabic: 'مَالِكُ الْمُلْكِ', meaning: 'Owner of All Sovereignty', meaningUr: 'تمام بادشاہت کا مالک' },
  { id: 85, name: 'Dhul-Jalali-wal-Ikram', arabic: 'ذُو الْجَلَالِ وَالْإِكْرَامِ', meaning: 'Lord of Majesty and Honour', meaningUr: 'جلال اور اکرام والا' },
  { id: 86, name: 'Al-Muqsit', arabic: 'الْمُقْسِط', meaning: 'The Equitable', meaningUr: 'انصاف والا' },
  { id: 87, name: 'Al-Jami', arabic: 'الْجَامعُ', meaning: 'The Gatherer', meaningUr: 'جمع کرنے والا' },
  { id: 88, name: 'Al-Ghaniyy', arabic: 'الْغَنِيُّ', meaning: 'The Self-Sufficient', meaningUr: 'بے نیاز' },
  { id: 89, name: 'Al-Mughni', arabic: 'الْمُغْنِي', meaning: 'The Enricher', meaningUr: 'غنی کرنے والا' },
  { id: 90, name: 'Al-Mani', arabic: 'الْمَانِعُ', meaning: 'The Preventer', meaningUr: 'روکنے والا' },
  { id: 91, name: 'Ad-Darr', arabic: 'الضَّارُّ', meaning: 'The Distresser', meaningUr: 'تکلیف دینے والا' },
  { id: 92, name: 'An-Nafi', arabic: 'النَّافِعُ', meaning: 'The Propitious', meaningUr: 'فائدہ دینے والا' },
  { id: 93, name: 'An-Nur', arabic: 'النُّور', meaning: 'The Light', meaningUr: 'نور' },
  { id: 94, name: 'Al-Hadi', arabic: 'الْهَادِي', meaning: 'The Guide', meaningUr: 'راہ دکھانے والا' },
  { id: 95, name: 'Al-Badi', arabic: 'الْبَدِيعُ', meaning: 'The Originator of All', meaningUr: 'بے مثال بنانے والا' },
  { id: 96, name: 'Al-Baqi', arabic: 'الْبَاقِي', meaning: 'The Everlasting', meaningUr: 'ہمیشہ رہنے والا' },
  { id: 97, name: 'Al-Warith', arabic: 'الْوَارِثُ', meaning: 'The Inheritor', meaningUr: 'وارث' },
  { id: 98, name: 'Ar-Rashid', arabic: 'الرَّشِيدُ', meaning: 'The Guide to Right Path', meaningUr: 'سیدھی راہ دکھانے والا' },
  { id: 99, name: 'As-Sabur', arabic: 'الصَّبُور', meaning: 'The Most Patient', meaningUr: 'بہت صبر والا' },
];

// Global azan sound ref to prevent duplicates
let _activeAzanSound = null;

async function playAzanAudio(reciterUrl) {
  try {
    // Stop any already playing azan
    if (_activeAzanSound) {
      try { await _activeAzanSound.stopAsync(); await _activeAzanSound.unloadAsync(); } catch (e) {}
      _activeAzanSound = null;
    }
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });
    const { sound } = await Audio.Sound.createAsync(
      { uri: reciterUrl },
      { shouldPlay: true, volume: 1.0 }
    );
    _activeAzanSound = sound;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) {
        sound.unloadAsync();
        _activeAzanSound = null;
      }
    });
    // Auto cleanup after 3 minutes (full azan max)
    setTimeout(async () => {
      if (_activeAzanSound === sound) {
        try { await sound.stopAsync(); await sound.unloadAsync(); } catch (e) {}
        _activeAzanSound = null;
      }
    }, 180000);
    return sound;
  } catch (e) {
    console.log('Azan audio error:', e.message);
    return null;
  }
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true, // Local azan.mp3 plays via Android notification channel / iOS sound
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority?.HIGH || 'high',
  }),
});

// ═══════════════════════════════════════════════════════════════════════════
// ANDROID NOTIFICATION CHANNEL — required for custom sound on Android 8+
// This must be set up once. The channel ties the azan.mp3 sound to all
// prayer notifications, so it plays even when the app is fully closed.
// ═══════════════════════════════════════════════════════════════════════════
async function setupAzanNotificationChannel() {
  try {
    await Notifications.setNotificationChannelAsync('prayer-azan', {
      name: 'Prayer Azan',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'azan.wav', // Android requires sound file in android/app/src/main/res/raw (see note below)
      vibrationPattern: [0, 400, 200, 400],
      lightColor: '#FFD700',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });
  } catch (e) {
    console.log('Channel setup error:', e.message);
  }
}

async function schedulePrayerNotifications(prayerTimes, urdu = false) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const prayers = [
    { nameEn: 'Fajr',    nameUr: 'فجر',   key: 'fajr',    emoji: '🌙', duaEn: 'Rise for Fajr — the angels witness it.',      duaUr: 'فجر کے لیے اٹھیں — فرشتے اس پر گواہ ہیں۔' },
    { nameEn: 'Dhuhr',   nameUr: 'ظہر',   key: 'dhuhr',   emoji: '☀️', duaEn: 'Pause and turn to Allah — Dhuhr time.',        duaUr: 'رکیں اور اللہ کی طرف متوجہ ہوں — ظہر کا وقت۔' },
    { nameEn: 'Asr',     nameUr: 'عصر',   key: 'asr',     emoji: '🌤️', duaEn: 'Guard the middle prayer — Allah is watching.', duaUr: 'درمیانی نماز کی حفاظت کریں — اللہ دیکھ رہا ہے۔' },
    { nameEn: 'Maghrib', nameUr: 'مغرب',  key: 'maghrib', emoji: '🌅', duaEn: 'Sunset — hasten to Maghrib prayer.',           duaUr: 'غروبِ آفتاب — مغرب کے لیے جلدی کریں۔' },
    { nameEn: 'Isha',    nameUr: 'عشاء',  key: 'isha',    emoji: '⭐', duaEn: "End your day with Isha — Allah's mercy awaits.", duaUr: 'عشاء سے دن ختم کریں — اللہ کی رحمت منتظر ہے۔' },
  ];
  const now = new Date();
  for (const prayer of prayers) {
    const pt = prayerTimes[prayer.key];
    if (!pt || pt <= now) continue;
    const dn = urdu ? prayer.nameUr : prayer.nameEn;
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${prayer.emoji} ${dn} ${urdu ? 'کا وقت — اللہ اکبر' : 'Time — Allahu Akbar'}`,
          body: urdu ? prayer.duaUr : prayer.duaEn,
          sound: 'azan.wav', // Plays local azan sound even if app is fully closed (Android channel + iOS sound name)
          priority: 'high',
          vibrate: [0, 400, 200, 400],
          data: { type: 'prayer', key: prayer.key },
          ...(Platform.OS === 'android' ? { channelId: 'prayer-azan' } : {}),
        },
        trigger: { type: 'date', date: pt },
      });
    } catch (e) {
      console.log('Notification schedule error:', e.message);
    }
  }
}

function useNotificationListener(reciterUrl) {
  useEffect(() => {
    // Play azan when notification is RECEIVED (prayer time hit)
    const s1 = Notifications.addNotificationReceivedListener(async (notification) => {
      // Only play for prayer notifications (not other app notifications)
      const title = notification.request.content.title || '';
      const data = notification.request.content.data || {};
      const isPrayer = data.type === 'prayer' || title.includes('Time') || title.includes('وقت') ||
                       title.includes('🌙') || title.includes('☀️') ||
                       title.includes('🌤️') || title.includes('🌅') || title.includes('⭐');
      if (isPrayer) { await playAzanAudio(reciterUrl); }
    });
    // When user TAPS notification — do NOT replay azan, just open app
    const s2 = Notifications.addNotificationResponseReceivedListener(() => {
      // App opens — no duplicate azan
    });
    return () => { s1.remove(); s2.remove(); };
  }, [reciterUrl]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// AZAN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function AzanScreen({ urdu = false, darkMode = false }) {
  const dm = darkMode;
  const cardBg = dm ? '#1a1a1a' : '#fff';
  const pageBg = dm ? '#0a0a0a' : '#F5F2E8';
  const textColor = dm ? '#e0e0e0' : '#1a1a1a';
  const subColor = dm ? '#888' : '#666';
  const sectionBg = dm ? '#222' : '#f0f7f0';
  const borderColor = dm ? '#2a2a2a' : '#e8e8e8';

  const [sound, setSound] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedReciter, setSelectedReciter] = useState(AZAN_RECITERS[0].id);
  const [useOffline, setUseOffline] = useState(false);
  const [vibOnAzan, setVibOnAzan] = useState(true);
  const [azanEnabled, setAzanEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const s = await AsyncStorage.getItem(AZAN_SETTINGS_KEY);
        if (s) {
          const p = JSON.parse(s);
          if (p.useOffline !== undefined) setUseOffline(p.useOffline);
          if (p.vibOnAzan !== undefined) setVibOnAzan(p.vibOnAzan);
          if (p.reciterId) setSelectedReciter(p.reciterId);
        }
      } catch (e) {}
    })();
  }, []);

  const saveSetting = async (key, value) => {
    try {
      const s = await AsyncStorage.getItem(AZAN_SETTINGS_KEY);
      const cur = s ? JSON.parse(s) : {};
      await AsyncStorage.setItem(AZAN_SETTINGS_KEY, JSON.stringify({ ...cur, [key]: value }));
    } catch (e) {}
  };

  useEffect(() => { return () => { if (sound) sound.unloadAsync(); }; }, [sound]);

  const playAzan = async () => {
    try {
      if (sound) { await sound.unloadAsync(); setSound(null); setPlaying(false); return; }
      if (vibOnAzan) Vibration.vibrate(200);
      setLoading(true);
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: true, shouldDuckAndroid: false, playThroughEarpieceAndroid: false });
      let s;
      if (useOffline && OFFLINE_AZAN) {
        const { sound: ns } = await Audio.Sound.createAsync(OFFLINE_AZAN);
        s = ns;
      } else {
        if (useOffline && !OFFLINE_AZAN) Alert.alert(urdu ? 'آف لائن فائل نہیں ملی' : 'Offline File Missing', urdu ? 'آن لائن اذان چلا رہے ہیں۔' : 'Playing online azan instead.');
        const reciter = AZAN_RECITERS.find(r => r.id === selectedReciter) || AZAN_RECITERS[0];
        const { sound: ns } = await Audio.Sound.createAsync({ uri: reciter.url }, { shouldPlay: false });
        s = ns;
      }
      s.setOnPlaybackStatusUpdate((st) => { if (st.didJustFinish) { setPlaying(false); setSound(null); } });
      await s.playAsync();
      setSound(s); setPlaying(true); setLoading(false);
    } catch (e) {
      setLoading(false);
      Alert.alert(urdu ? 'خرابی' : 'Error', urdu ? 'اذان چلانے میں مشکل آئی۔' : 'Could not play azan. Check your internet connection.');
    }
  };

  const stopAzan = async () => {
    if (sound) { await sound.stopAsync(); await sound.unloadAsync(); setSound(null); setPlaying(false); }
  };

  const ToggleRow = ({ label, value, onToggle }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: borderColor }}>
      <Text style={{ fontSize: 15, color: textColor, flex: 1 }}>{label}</Text>
      <TouchableOpacity onPress={onToggle} style={{ width: 50, height: 28, borderRadius: 14, backgroundColor: value ? '#1F5C3D' : (dm ? '#444' : '#ccc'), justifyContent: 'center', padding: 2 }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignSelf: value ? 'flex-end' : 'flex-start' }} />
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: pageBg }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View style={{ backgroundColor: dm ? '#0B2818' : '#1F5C3D', padding: 30, alignItems: 'center', paddingTop: 60, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden' }}>
        <Text style={{ position: 'absolute', top: -18, left: -14, fontSize: 100, color: 'rgba(212,175,55,0.06)' }}>✦</Text>
        <Text style={{ color: '#D4AF37', fontSize: 19, marginBottom: 5, letterSpacing: 1 }}>اللَّهُ أَكْبَرُ</Text>
        <Text style={{ color: '#ffffff', fontSize: 25, fontWeight: 'bold' }}>{urdu ? 'اذان سنیں' : 'Listen to Azan'}</Text>
      </View>

      {/* AUTO-AZAN INFO BANNER */}
      <View style={{ margin: 16, marginBottom: 0, backgroundColor: dm ? '#1a2e1a' : '#e8f5e9', borderRadius: 15, padding: 14, borderWidth: 1, borderColor: dm ? '#2a4a2a' : '#a5d6a7', flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <Ionicons name="notifications" size={17} color={dm ? '#9DB8A0' : '#2e7d32'} style={{ marginTop: 1 }} />
        <Text style={{ color: dm ? '#9DB8A0' : '#2e7d32', fontSize: 12, flex: 1, lineHeight: 18 }}>
          {urdu
            ? 'منتخب کردہ اذان ہر نماز کے وقت خود بخود بجے گی، اگر اطلاعات کی اجازت دی گئی ہو۔'
            : 'Your selected azan will play automatically at every prayer time, if notifications are allowed.'}
        </Text>
      </View>

      <View style={{ alignItems: 'center', marginTop: 18 }}>
        <View style={{ backgroundColor: useOffline ? 'rgba(31,92,61,0.12)' : (dm ? '#1a1a1a' : '#e8f5e9'), paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#1F5C3D' }}>
          <Text style={{ color: '#1F5C3D', fontSize: 12.5, fontWeight: 'bold' }}>
            {useOffline ? (urdu ? '📴 آف لائن موڈ' : '📴 Offline Mode') : (urdu ? '🌐 آن لائن موڈ' : '🌐 Online Mode')}
          </Text>
        </View>
      </View>
      <View style={{ alignItems: 'center', marginVertical: 32 }}>
        {loading ? <ActivityIndicator size="large" color="#1F5C3D" style={{ marginVertical: 32 }} /> : (
          <View style={{ width: 188, height: 188, borderRadius: 94, borderWidth: 1.5, borderColor: playing ? 'rgba(192,57,43,0.25)' : 'rgba(31,92,61,0.18)', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity onPress={playing ? stopAzan : playAzan} activeOpacity={0.85}
              style={{ width: 160, height: 160, borderRadius: 80, backgroundColor: playing ? '#c0392b' : '#1F5C3D', justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12 }}>
              <Ionicons name={playing ? 'stop' : 'play'} size={50} color="#D4AF37" />
              <Text style={{ color: '#D4AF37', fontSize: 13.5, fontWeight: 'bold', marginTop: 8 }}>
                {playing ? (urdu ? 'روکیں' : 'Stop') : (urdu ? 'چلائیں' : 'Play')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      {!useOffline && (
        <View style={{ backgroundColor: cardBg, marginHorizontal: 16, borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: borderColor }}>
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1F5C3D', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 13 }}>🎙️ {urdu ? 'قاری منتخب کریں' : 'Select Reciter'}</Text>
          {AZAN_RECITERS.map((r) => (
            <TouchableOpacity key={r.id} onPress={() => { setSelectedReciter(r.id); saveSetting('reciterId', r.id); if (playing) stopAzan(); }} activeOpacity={0.75}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 14, marginBottom: 7, backgroundColor: selectedReciter === r.id ? '#1F5C3D' : sectionBg }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: selectedReciter === r.id ? 'rgba(212,175,55,0.18)' : (dm ? '#2a2a2a' : '#fff'), justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <MaterialCommunityIcons name="mosque" size={17} color={selectedReciter === r.id ? '#D4AF37' : '#1F5C3D'} />
              </View>
              <Text style={{ flex: 1, fontSize: 14.5, fontWeight: '600', color: selectedReciter === r.id ? '#fff' : textColor }}>{urdu ? r.nameUr : r.nameEn}</Text>
              {selectedReciter === r.id && <Ionicons name="checkmark-circle" size={19} color="#D4AF37" />}
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={{ backgroundColor: cardBg, marginHorizontal: 16, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: borderColor }}>
        <TouchableOpacity onPress={() => setShowSettings(!showSettings)} activeOpacity={0.75} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: showSettings ? 15 : 0 }}>
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1F5C3D', letterSpacing: 0.8, textTransform: 'uppercase' }}>⚙️ {urdu ? 'اذان سیٹنگز' : 'Azan Settings'}</Text>
          <Ionicons name={showSettings ? 'chevron-up' : 'chevron-down'} size={19} color="#1F5C3D" />
        </TouchableOpacity>
        {showSettings && (<>
          <ToggleRow label={urdu ? '📴 آف لائن اذان' : '📴 Use Offline Azan'} value={useOffline} onToggle={() => { const v = !useOffline; setUseOffline(v); saveSetting('useOffline', v); if (playing) stopAzan(); }} />
          <ToggleRow label={urdu ? '📳 اذان پر وائبریشن' : '📳 Vibrate on Azan'} value={vibOnAzan} onToggle={() => { const v = !vibOnAzan; setVibOnAzan(v); saveSetting('vibOnAzan', v); }} />
          <View style={{ marginTop: 13, backgroundColor: sectionBg, borderRadius: 13, padding: 13, flexDirection: 'row', gap: 9, alignItems: 'flex-start' }}>
            <Ionicons name="folder-outline" size={14} color={subColor} style={{ marginTop: 2 }} />
            <Text style={{ fontSize: 12.5, color: subColor, lineHeight: 19, flex: 1 }}>
              {urdu ? 'آف لائن اذان کے لیے: assets/azan.mp3 فائل رکھیں۔' : 'For offline use: Place azan.mp3 in the assets/ folder.'}
            </Text>
          </View>
        </>)}
      </View>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ZAKAT SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function ZakatScreen({ urdu = false, darkMode = false }) {
  const [gold, setGold] = useState(''); const [silver, setSilver] = useState(''); const [cash, setCash] = useState('');
  const [business, setBusiness] = useState(''); const [debts, setDebts] = useState(''); const [result, setResult] = useState(null);
  const [goldRate, setGoldRate] = useState(''); const [silverRate, setSilverRate] = useState('');
  const dm = darkMode;
  const cardBg = dm ? '#1a1a1a' : '#fff';
  const pageBg = dm ? '#0a0a0a' : '#F5F2E8';
  const textColor = dm ? '#e0e0e0' : '#1a1a1a';
  const subColor = dm ? '#888' : '#666';
  const sectionBg = dm ? '#222' : '#f0f7f0';
  const borderColor = dm ? '#2a2a2a' : '#e8e8e8';
  const NISAB_G = 87.48, NISAB_S = 612.36;
  const gRate = parseFloat(goldRate) || 0, sRate = parseFloat(silverRate) || 0;
  const nisabGold = NISAB_G * gRate, nisabSilver = NISAB_S * sRate;
  const ratesEntered = gRate > 0 && sRate > 0;
  const calculate = () => {
    if (!ratesEntered) return;
    const gv = (parseFloat(gold) || 0) * gRate, sv = (parseFloat(silver) || 0) * sRate;
    const cv = parseFloat(cash) || 0, bv = parseFloat(business) || 0, dv = parseFloat(debts) || 0;
    const total = gv + sv + cv + bv, net = total - dv;
    setResult({ goldValue: gv, silverValue: sv, cashValue: cv, businessValue: bv, totalAssets: total, netAssets: net, zakatAmount: net >= nisabSilver ? net * 0.025 : 0, nisabMet: net >= nisabSilver });
  };
  const reset = () => { setGold(''); setSilver(''); setCash(''); setBusiness(''); setDebts(''); setResult(null); };
  const fmt = (a) => 'Rs. ' + Math.round(a).toLocaleString();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: pageBg }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View style={{ backgroundColor: dm ? '#0B2818' : '#1F5C3D', padding: 30, alignItems: 'center', paddingTop: 60, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden' }}>
        <Text style={{ position: 'absolute', top: -18, right: -12, fontSize: 100, color: 'rgba(212,175,55,0.06)' }}>✦</Text>
        <Text style={{ color: '#D4AF37', fontSize: 15, marginBottom: 5, letterSpacing: 0.3 }}>وَأَقِيمُوا الصَّلَاةَ وَآتُوا الزَّكَاةَ</Text>
        <Text style={{ color: '#fff', fontSize: 25, fontWeight: 'bold' }}>{urdu ? 'زکوٰة کیلکولیٹر' : 'Zakat Calculator'}</Text>
        <Text style={{ color: '#9DB8A0', fontSize: 12.5, marginTop: 5 }}>{urdu ? 'خالص اثاثوں کا 2.5%' : '2.5% of Net Assets'}</Text>
      </View>

      {/* RATE INPUT NOTICE — prices change daily, user must enter current rate */}
      <View style={{ backgroundColor: dm ? '#1a2e1a' : '#fff8e1', margin: 16, marginBottom: 0, borderRadius: 15, padding: 14, borderWidth: 1, borderColor: dm ? '#2a4a2a' : '#ffe082', flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <Ionicons name="information-circle" size={17} color={dm ? '#D4AF37' : '#f9a825'} style={{ marginTop: 1 }} />
        <Text style={{ color: dm ? '#D4AF37' : '#7a6000', fontSize: 12, flex: 1, lineHeight: 18 }}>
          {urdu
            ? 'سونے اور چاندی کی قیمت روزانہ بدلتی ہے۔ براہ کرم آج کی قیمت خود درج کریں (فی گرام)۔'
            : "Gold and silver prices change daily. Please enter today's rate per gram below."}
        </Text>
      </View>

      <View style={{ backgroundColor: cardBg, margin: 16, marginTop: 13, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: borderColor }}>
        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1F5C3D', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 13 }}>✏️ {urdu ? 'آج کی قیمت درج کریں (فی گرام)' : "Enter Today's Rate (per gram)"}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: subColor, marginBottom: 7 }}>🥇 {urdu ? 'سونا (PKR)' : 'Gold (PKR)'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: sectionBg, borderRadius: 13, paddingHorizontal: 13, height: 47, borderWidth: 1, borderColor: borderColor }}>
              <TextInput style={{ flex: 1, fontSize: 14.5, color: textColor }} placeholder={urdu ? 'مثلاً 25000' : 'e.g. 25000'} placeholderTextColor={subColor} keyboardType="numeric" value={goldRate} onChangeText={setGoldRate} />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: subColor, marginBottom: 7 }}>🥈 {urdu ? 'چاندی (PKR)' : 'Silver (PKR)'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: sectionBg, borderRadius: 13, paddingHorizontal: 13, height: 47, borderWidth: 1, borderColor: borderColor }}>
              <TextInput style={{ flex: 1, fontSize: 14.5, color: textColor }} placeholder={urdu ? 'مثلاً 300' : 'e.g. 300'} placeholderTextColor={subColor} keyboardType="numeric" value={silverRate} onChangeText={setSilverRate} />
            </View>
          </View>
        </View>
      </View>

      {ratesEntered && (
        <View style={{ backgroundColor: cardBg, marginHorizontal: 16, marginBottom: 16, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: borderColor }}>
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1F5C3D', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 11 }}>📊 {urdu ? 'آپ کا نصاب' : 'Your Nisab'}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: sectionBg, borderRadius: 13, padding: 13, alignItems: 'center' }}>
              <Text style={{ color: subColor, fontSize: 11 }}>{urdu ? 'سونا (87.48گ)' : 'Gold (87.48g)'}</Text>
              <Text style={{ color: '#1F5C3D', fontSize: 15, fontWeight: 'bold', marginTop: 5 }}>{fmt(nisabGold)}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: sectionBg, borderRadius: 13, padding: 13, alignItems: 'center' }}>
              <Text style={{ color: subColor, fontSize: 11 }}>{urdu ? 'چاندی (612گ)' : 'Silver (612g)'}</Text>
              <Text style={{ color: '#1F5C3D', fontSize: 15, fontWeight: 'bold', marginTop: 5 }}>{fmt(nisabSilver)}</Text>
            </View>
          </View>
        </View>
      )}

      <View style={{ backgroundColor: cardBg, marginHorizontal: 16, borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: borderColor, opacity: ratesEntered ? 1 : 0.5 }}>
        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1F5C3D', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>💰 {urdu ? 'اپنے اثاثے درج کریں' : 'Enter Your Assets'}</Text>
        {!ratesEntered && (
          <Text style={{ color: subColor, fontSize: 12, marginBottom: 10, fontStyle: 'italic' }}>
            {urdu ? 'پہلے اوپر سونے/چاندی کی قیمت درج کریں۔' : 'Please enter gold/silver rates above first.'}
          </Text>
        )}
        {[
          { label: urdu ? 'سونا (گرام)' : 'Gold (grams)', icon: '🥇', val: gold, set: setGold, unit: urdu ? 'گرام' : 'grams' },
          { label: urdu ? 'چاندی (گرام)' : 'Silver (grams)', icon: '🥈', val: silver, set: setSilver, unit: urdu ? 'گرام' : 'grams' },
          { label: urdu ? 'نقد اور بینک' : 'Cash & Bank (PKR)', icon: '💵', val: cash, set: setCash, unit: 'PKR' },
          { label: urdu ? 'کاروباری اثاثے' : 'Business Assets (PKR)', icon: '🏪', val: business, set: setBusiness, unit: 'PKR' },
          { label: urdu ? 'ادا کرنے والے قرضے' : 'Debts to Pay (PKR)', icon: '📉', val: debts, set: setDebts, unit: 'PKR' },
        ].map((f, i) => (
          <View key={i}>
            <Text style={{ fontSize: 12.5, color: subColor, marginBottom: 7, marginTop: i === 0 ? 0 : 11, fontWeight: '600' }}>{f.label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: sectionBg, borderRadius: 13, paddingHorizontal: 13, height: 50, borderWidth: 1, borderColor: borderColor }}>
              <Text style={{ fontSize: 19, marginRight: 10 }}>{f.icon}</Text>
              <TextInput editable={ratesEntered} style={{ flex: 1, fontSize: 15, color: textColor }} placeholder="0" placeholderTextColor={subColor} keyboardType="numeric" value={f.val} onChangeText={f.set} />
              <Text style={{ fontSize: 12.5, color: subColor }}>{f.unit}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', marginHorizontal: 16, gap: 10 }}>
        <TouchableOpacity disabled={!ratesEntered} activeOpacity={0.85} style={{ flex: 1, backgroundColor: ratesEntered ? '#1F5C3D' : '#aaa', borderRadius: 15, height: 54, justifyContent: 'center', alignItems: 'center' }} onPress={calculate}>
          <Text style={{ color: '#D4AF37', fontSize: 15, fontWeight: 'bold' }}>{urdu ? 'زکوٰة حساب کریں' : 'Calculate Zakat'}</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.75} style={{ backgroundColor: sectionBg, borderRadius: 15, paddingHorizontal: 20, justifyContent: 'center', borderWidth: 1, borderColor: borderColor }} onPress={reset}>
          <Text style={{ color: subColor, fontSize: 13.5, fontWeight: '600' }}>{urdu ? 'ری سیٹ' : 'Reset'}</Text>
        </TouchableOpacity>
      </View>
      {result && (
        <View style={{ backgroundColor: cardBg, margin: 16, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: borderColor }}>
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1F5C3D', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>📋 {urdu ? 'زکوٰة کا خلاصہ' : 'Zakat Summary'}</Text>
          {[
            { l: urdu ? 'سونے کی قیمت' : 'Gold Value', v: result.goldValue },
            { l: urdu ? 'چاندی کی قیمت' : 'Silver Value', v: result.silverValue },
            { l: urdu ? 'نقد' : 'Cash', v: result.cashValue },
            { l: urdu ? 'کاروبار' : 'Business', v: result.businessValue },
          ].map((r, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: borderColor }}>
              <Text style={{ fontSize: 13.5, color: subColor }}>{r.l}</Text>
              <Text style={{ fontSize: 13.5, fontWeight: '600', color: textColor }}>{fmt(r.v)}</Text>
            </View>
          ))}
          <View style={{ backgroundColor: result.nisabMet ? '#1F5C3D' : '#888', borderRadius: 16, padding: 20, alignItems: 'center', marginTop: 15 }}>
            {result.nisabMet ? (<>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 8 }}>{urdu ? '✅ نصاب پورا — زکوٰة واجب ہے' : '✅ Nisab Met — Zakat is Due'}</Text>
              <Text style={{ color: '#D4AF37', fontSize: 32, fontWeight: 'bold' }}>{fmt(result.zakatAmount)}</Text>
              <Text style={{ color: '#9DB8A0', fontSize: 12.5, marginTop: 5 }}>{urdu ? 'خالص اثاثوں کا 2.5%' : '2.5% of Net Assets'}</Text>
            </>) : (<>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 8 }}>{urdu ? '❌ نصاب پورا نہیں' : '❌ Nisab Not Met'}</Text>
              <Text style={{ color: '#e0e0e0', fontSize: 12.5 }}>{urdu ? 'زکوٰة واجب نہیں' : 'Zakat is not obligatory'}</Text>
            </>)}
          </View>
        </View>
      )}
    </ScrollView>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// ISLAMIC QUIZ SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
const QUIZ_DATA = {
  Quran: [
    { q: 'How many Surahs are in the Quran?', qUr: 'قرآن میں کتنی سورتیں ہیں؟', options: ['112', '114', '116', '118'], answer: 1 },
    { q: 'Which is the longest Surah?', qUr: 'سب سے لمبی سورہ کون سی ہے؟', options: ['Al-Imran', 'An-Nisa', 'Al-Baqarah', 'Al-Maidah'], answer: 2 },
    { q: 'Which is the shortest Surah?', qUr: 'سب سے چھوٹی سورہ کون سی ہے؟', options: ['Al-Falaq', 'Al-Kawthar', 'Al-Ikhlas', 'An-Nas'], answer: 1 },
    { q: 'In which month was the Quran revealed?', qUr: 'قرآن کس مہینے میں نازل ہوا؟', options: ['Rajab', 'Muharram', 'Ramadan', 'Shawwal'], answer: 2 },
    { q: 'How many Juz (parts) are in the Quran?', qUr: 'قرآن میں کتنے پارے ہیں؟', options: ['25', '28', '30', '32'], answer: 2 },
    { q: 'Which Surah is called the Heart of the Quran?', qUr: 'کون سی سورہ قرآن کا دل کہلاتی ہے؟', options: ['Al-Fatiha', 'Ya-Sin', 'Al-Ikhlas', 'Al-Kahf'], answer: 1 },
    { q: 'Which angel brought the revelation to Prophet Muhammad ﷺ?', qUr: 'کون سا فرشتہ وحی لاتا تھا؟', options: ['Mikail', 'Israfil', 'Jibrail', 'Izra\'il'], answer: 2 },
    { q: 'Which Surah does NOT begin with Bismillah?', qUr: 'کون سی سورہ بسم اللہ سے شروع نہیں ہوتی؟', options: ['Al-Baqarah', 'Al-Fatiha', 'At-Tawbah', 'Al-Ikhlas'], answer: 2 },
    { q: 'Which Surah contains the Verse of the Throne (Ayat al-Kursi)?', qUr: 'آیت الکرسی کس سورہ میں ہے؟', options: ['Al-Imran', 'Al-Baqarah', 'An-Nisa', 'Al-Maidah'], answer: 1 },
    { q: 'Which Surah has no Bismillah at the beginning?', qUr: 'کون سی سورہ کے شروع میں بسم اللہ نہیں؟', options: ['Al-Anfal', 'At-Tawbah', 'Al-Hujurat', 'Al-Fath'], answer: 1 },
  ],
  Hadith: [
    { q: 'How many Hadith are in Sahih Bukhari?', qUr: 'صحیح بخاری میں کتنی احادیث ہیں؟', options: ['5000', '6236', '7000', '8000'], answer: 1 },
    { q: 'Who compiled Sahih Bukhari?', qUr: 'صحیح بخاری کس نے مرتب کی؟', options: ['Imam Muslim', 'Imam Bukhari', 'Imam Tirmidhi', 'Imam Malik'], answer: 1 },
    { q: 'What is the first hadith of Sahih Bukhari about?', qUr: 'صحیح بخاری کی پہلی حدیث کس بارے میں ہے؟', options: ['Prayer', 'Fasting', 'Intentions (Niyyah)', 'Zakat'], answer: 2 },
    { q: 'Which collection is known as Sahih Muslim?', qUr: 'صحیح مسلم کس نے جمع کی؟', options: ['Imam Bukhari', 'Imam Muslim', 'Imam Ahmad', 'Imam Shafi\'i'], answer: 1 },
    { q: 'The six major Hadith collections are known as?', qUr: 'چھ مشہور حدیث مجموعے کیا کہلاتے ہیں؟', options: ['Kutub Sittah', 'Sihah Sittah', 'Usul Sittah', 'Muwatta Sittah'], answer: 0 },
    { q: 'Which Imam compiled the Muwatta?', qUr: 'موطا کس امام نے مرتب کی؟', options: ['Imam Abu Hanifa', 'Imam Malik', 'Imam Shafi\'i', 'Imam Ahmad'], answer: 1 },
    { q: '"Actions are judged by intentions" is from which book?', qUr: '"اعمال کا دارومدار نیتوں پر ہے" کس کتاب سے ہے؟', options: ['Sahih Muslim', 'Sunan Abu Dawud', 'Sahih Bukhari', 'Tirmidhi'], answer: 2 },
    { q: 'How many Hadith in Sahih Muslim?', qUr: 'صحیح مسلم میں کتنی احادیث ہیں؟', options: ['4000', '5362', '7000', '9000'], answer: 1 },
  ],
  History: [
    { q: 'In which year was Prophet Muhammad ﷺ born?', qUr: 'نبی کریم ﷺ کس سال پیدا ہوئے؟', options: ['569 CE', '570 CE', '571 CE', '572 CE'], answer: 1 },
    { q: 'What was the first battle of Islam?', qUr: 'اسلام کی پہلی جنگ کون سی تھی؟', options: ['Uhud', 'Badr', 'Khandaq', 'Tabuk'], answer: 1 },
    { q: 'In which year did the Hijra (migration) take place?', qUr: 'ہجرت کس سال ہوئی؟', options: ['620 CE', '622 CE', '624 CE', '626 CE'], answer: 1 },
    { q: 'Who was the first Caliph of Islam?', qUr: 'اسلام کے پہلے خلیفہ کون تھے؟', options: ['Umar ibn Khattab', 'Uthman ibn Affan', 'Abu Bakr Siddiq', 'Ali ibn Abi Talib'], answer: 2 },
    { q: 'In which city is the Kaaba located?', qUr: 'کعبہ کس شہر میں ہے؟', options: ['Madinah', 'Jerusalem', 'Makkah', 'Taif'], answer: 2 },
    { q: 'Which Prophet built the Kaaba?', qUr: 'کعبہ کس نبی نے بنایا؟', options: ['Prophet Nuh', 'Prophet Musa', 'Prophet Ibrahim & Ismail', 'Prophet Dawood'], answer: 2 },
    { q: 'How many years did Prophet Muhammad ﷺ preach in Makkah before Hijra?', qUr: 'ہجرت سے پہلے نبی ﷺ نے مکہ میں کتنے سال تبلیغ کی؟', options: ['10', '11', '13', '15'], answer: 2 },
    { q: 'What is the name of the Prophet\'s ﷺ mother?', qUr: 'نبی ﷺ کی والدہ کا نام کیا تھا؟', options: ['Khadijah', 'Aminah', 'Fatimah', 'Maryam'], answer: 1 },
    { q: 'In which year did the Conquest of Makkah occur?', qUr: 'فتح مکہ کس سال ہوئی؟', options: ['627 CE', '628 CE', '629 CE', '630 CE'], answer: 3 },
    { q: 'Who was the last Prophet?', qUr: 'آخری نبی کون ہیں؟', options: ['Isa (Jesus)', 'Musa (Moses)', 'Muhammad ﷺ', 'Ibrahim'], answer: 2 },
  ],
};

function IslamicQuizScreen({ urdu, darkMode }) {
  const dm = darkMode;
  const pageBg = dm ? '#0a0a0a' : '#F5F2E8';
  const cardBg = dm ? '#1a1a1a' : '#fff';
  const textColor = dm ? '#e0e0e0' : '#1a1a1a';
  const subColor = dm ? '#888' : '#666';
  const borderColor = dm ? '#2a2a2a' : '#e8e8e8';

  const categories = ['Quran', 'Hadith', 'History'];
  const [cat, setCat] = useState('Quran');
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [quizStarted, setQuizStarted] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const questions = QUIZ_DATA[cat];
  const current = questions[qIdx];

  const startQuiz = (c) => {
    setCat(c);
    setQIdx(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
    setAnswers([]);
    setQuizStarted(true);
  };

  const handleAnswer = (idx) => {
    if (selected !== null) return;
    setSelected(idx);
    const correct = idx === current.answer;
    if (correct) setScore(s => s + 1);
    setAnswers(a => [...a, { q: current.q, selected: idx, correct: current.answer, isCorrect: correct }]);
    setTimeout(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        if (qIdx + 1 >= questions.length) { setFinished(true); }
        else { setQIdx(i => i + 1); setSelected(null); }
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, 900);
  };

  const getBtnColor = (idx) => {
    if (selected === null) return cardBg;
    if (idx === current.answer) return '#1F5C3D';
    if (idx === selected && selected !== current.answer) return '#c0392b';
    return cardBg;
  };
  const getBtnText = (idx) => {
    if (selected === null) return textColor;
    if (idx === current.answer) return '#fff';
    if (idx === selected && selected !== current.answer) return '#fff';
    return textColor;
  };

  const getGrade = () => {
    const pct = score / questions.length;
    if (pct === 1) return { label: urdu ? 'ماشاء اللہ! کامل! 🌟' : 'Masha Allah! Perfect! 🌟', color: '#D4AF37' };
    if (pct >= 0.8) return { label: urdu ? 'بہت اچھا! 🎉' : 'Excellent! 🎉', color: '#27ae60' };
    if (pct >= 0.6) return { label: urdu ? 'اچھا! 👍' : 'Good Job! 👍', color: '#2980b9' };
    if (pct >= 0.4) return { label: urdu ? 'ٹھیک ہے، کوشش کریں 💪' : 'Fair, Keep Trying! 💪', color: '#f39c12' };
    return { label: urdu ? 'مزید مطالعہ کریں 📖' : 'Keep Learning 📖', color: '#e67e22' };
  };

  if (finished) {
    const grade = getGrade();
    return (
      <ScrollView style={{ flex: 1, backgroundColor: pageBg }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: dm ? '#0B2818' : '#1F5C3D', padding: 30, alignItems: 'center', paddingTop: 60, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden' }}>
          <Text style={{ position: 'absolute', top: -18, right: -12, fontSize: 100, color: 'rgba(212,175,55,0.06)' }}>✦</Text>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(212,175,55,0.13)', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
            <MaterialCommunityIcons name="trophy" size={28} color="#D4AF37" />
          </View>
          <Text style={{ color: '#fff', fontSize: 25, fontWeight: 'bold', marginTop: 6 }}>{urdu ? 'نتیجہ' : 'Results'}</Text>
        </View>
        <View style={{ margin: 16, marginTop: 18, backgroundColor: cardBg, borderRadius: 22, padding: 28, alignItems: 'center', borderWidth: 1, borderColor }}>
          <Text style={{ fontSize: 58, fontWeight: 'bold', color: grade.color }}>{score}/{questions.length}</Text>
          <Text style={{ fontSize: 16.5, color: grade.color, marginTop: 8, fontWeight: '600' }}>{grade.label}</Text>
          <View style={{ width: '100%', height: 8, backgroundColor: borderColor, borderRadius: 4, marginTop: 18, overflow: 'hidden' }}>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: grade.color, width: `${(score / questions.length) * 100}%` }} />
          </View>
          <Text style={{ color: subColor, marginTop: 9, fontSize: 13 }}>{Math.round((score / questions.length) * 100)}% {urdu ? 'درست' : 'Correct'}</Text>
        </View>
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={{ fontSize: 11.5, fontWeight: 'bold', color: subColor, letterSpacing: 1.2, marginBottom: 11, textTransform: 'uppercase' }}>{urdu ? 'جائزہ' : 'Review'}</Text>
        </View>
        {answers.map((a, i) => (
          <View key={i} style={{ marginHorizontal: 16, marginBottom: 9, backgroundColor: cardBg, borderRadius: 15, padding: 14, borderLeftWidth: 4, borderLeftColor: a.isCorrect ? '#27ae60' : '#c0392b', borderWidth: 1, borderColor }}>
            <Text style={{ color: textColor, fontSize: 13, fontWeight: '600' }}>{i + 1}. {a.q}</Text>
            <Text style={{ color: a.isCorrect ? '#27ae60' : '#c0392b', fontSize: 12, marginTop: 5 }}>
              {a.isCorrect ? '✅ ' : '❌ '}{QUIZ_DATA[cat][i].options[a.selected]}
            </Text>
            {!a.isCorrect && <Text style={{ color: '#27ae60', fontSize: 12, marginTop: 2 }}>✅ {QUIZ_DATA[cat][i].options[a.correct]}</Text>}
          </View>
        ))}
        <View style={{ flexDirection: 'row', gap: 10, margin: 16, marginTop: 8 }}>
          <TouchableOpacity onPress={() => startQuiz(cat)} activeOpacity={0.85} style={{ flex: 1, backgroundColor: '#1F5C3D', padding: 15, borderRadius: 15, alignItems: 'center' }}>
            <Text style={{ color: '#D4AF37', fontWeight: 'bold', fontSize: 13.5 }}>{urdu ? 'دوبارہ کھیلیں' : 'Play Again'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setFinished(false); setQIdx(0); setSelected(null); setScore(0); setAnswers([]); setQuizStarted(false); }} activeOpacity={0.75} style={{ flex: 1, backgroundColor: cardBg, padding: 15, borderRadius: 15, alignItems: 'center', borderWidth: 1, borderColor }}>
            <Text style={{ color: textColor, fontWeight: 'bold', fontSize: 13.5 }}>{urdu ? 'موضوع تبدیل' : 'Change Topic'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (!quizStarted) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: pageBg }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: dm ? '#0B2818' : '#1F5C3D', padding: 30, alignItems: 'center', paddingTop: 60, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden' }}>
          <Text style={{ position: 'absolute', top: -18, left: -14, fontSize: 100, color: 'rgba(212,175,55,0.06)' }}>✦</Text>
          <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(212,175,55,0.13)', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
            <Ionicons name="help-circle" size={30} color="#D4AF37" />
          </View>
          <Text style={{ color: '#fff', fontSize: 25, fontWeight: 'bold', marginTop: 6 }}>{urdu ? 'اسلامی کوئز' : 'Islamic Quiz'}</Text>
          <Text style={{ color: '#9DB8A0', marginTop: 4, fontSize: 13 }}>{urdu ? 'اپنا موضوع چنیں' : 'Choose your topic'}</Text>
        </View>
        <View style={{ padding: 16, paddingTop: 20 }}>
          {categories.map((c) => (
            <TouchableOpacity key={c} onPress={() => { startQuiz(c); }} activeOpacity={0.8}
              style={{ backgroundColor: cardBg, borderRadius: 19, padding: 20, marginBottom: 13, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor, elevation: 2 }}>
              <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#1F5C3D', justifyContent: 'center', alignItems: 'center', marginRight: 15 }}>
                <MaterialCommunityIcons name={c === 'Quran' ? 'book-open-variant' : c === 'Hadith' ? 'script-text' : 'history'} size={25} color="#D4AF37" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16.5, fontWeight: 'bold', color: textColor }}>{c === 'Quran' ? (urdu ? 'قرآن' : 'Quran') : c === 'Hadith' ? (urdu ? 'حدیث' : 'Hadith') : (urdu ? 'تاریخ' : 'History')}</Text>
                <Text style={{ color: subColor, fontSize: 12.5, marginTop: 3 }}>{QUIZ_DATA[c].length} {urdu ? 'سوالات' : 'Questions'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={subColor} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: pageBg }}>
      <View style={{ backgroundColor: dm ? '#0B2818' : '#1F5C3D', paddingTop: 55, paddingBottom: 20, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 }}>
          <Text style={{ color: '#9DB8A0', fontSize: 12.5 }}>{cat} • {urdu ? 'سوال' : 'Q'} {qIdx + 1}/{questions.length}</Text>
          <View style={{ backgroundColor: 'rgba(212,175,55,0.18)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 }}>
            <Text style={{ color: '#D4AF37', fontWeight: 'bold', fontSize: 12.5 }}>{urdu ? 'نمبر:' : 'Score:'} {score}</Text>
          </View>
        </View>
        <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden' }}>
          <View style={{ height: 4, backgroundColor: '#D4AF37', borderRadius: 2, width: `${((qIdx + 1) / questions.length) * 100}%` }} />
        </View>
      </View>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <View style={{ margin: 16, backgroundColor: cardBg, borderRadius: 20, padding: 21, borderWidth: 1, borderColor, minHeight: 100 }}>
          <Text style={{ fontSize: 16.5, fontWeight: '600', color: textColor, lineHeight: 25 }}>
            {urdu ? current.qUr : current.q}
          </Text>
        </View>
        <View style={{ paddingHorizontal: 16, gap: 9 }}>
          {current.options.map((opt, idx) => (
            <TouchableOpacity key={idx} onPress={() => handleAnswer(idx)} activeOpacity={0.8}
              style={{ backgroundColor: getBtnColor(idx), borderRadius: 15, padding: 15, flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: selected !== null && idx === current.answer ? '#1F5C3D' : borderColor, elevation: selected === null ? 1 : 0 }}>
              <View style={{ width: 29, height: 29, borderRadius: 15, backgroundColor: selected !== null && (idx === current.answer || idx === selected) ? 'rgba(255,255,255,0.2)' : (dm ? '#333' : '#f0f0f0'), justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Text style={{ fontWeight: 'bold', color: getBtnText(idx), fontSize: 12.5 }}>{['A', 'B', 'C', 'D'][idx]}</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 14.5, color: getBtnText(idx), fontWeight: selected !== null && idx === current.answer ? '600' : 'normal' }}>{opt}</Text>
              {selected !== null && idx === current.answer && <Ionicons name="checkmark-circle" size={21} color="#D4AF37" />}
              {selected !== null && idx === selected && selected !== current.answer && <Ionicons name="close-circle" size={21} color="#fff" />}
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEERAH SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
const SEERAH_DATA = [
  { year: '570 CE', icon: '🌟', titleEn: 'Birth of Prophet ﷺ', titleUr: 'نبی ﷺ کی ولادت', en: 'Prophet Muhammad ﷺ was born in Makkah on 12 Rabi al-Awwal in the Year of the Elephant. His father Abdullah had passed away before his birth. He was placed under the care of his grandfather Abdul Muttalib and nurse Halimah al-Sadiyyah.', ur: 'نبی محمد ﷺ مکہ میں 12 ربیع الاول، عام الفیل میں پیدا ہوئے۔ آپ ﷺ کے والد عبداللہ آپ کی پیدائش سے پہلے ہی وفات پا گئے تھے۔ آپ ﷺ کی پرورش دادا عبدالمطلب اور دایہ حلیمہ سعدیہ نے کی۔' },
  { year: '576 CE', icon: '💔', titleEn: 'Passing of Mother Aminah', titleUr: 'والدہ آمنہ کی وفات', en: 'When Prophet ﷺ was just six years old, his beloved mother Aminah passed away in Abwa on a journey returning from Madinah. This left him an orphan at a very young age.', ur: 'جب نبی ﷺ کی عمر صرف چھ سال تھی، آپ ﷺ کی والدہ آمنہ مدینہ سے واپسی پر ابواء میں وفات پا گئیں۔ اس طرح آپ ﷺ بہت کم عمری میں یتیم ہو گئے۔' },
  { year: '595 CE', icon: '💍', titleEn: 'Marriage to Khadijah ؓ', titleUr: 'حضرت خدیجہ ؓ سے نکاح', en: 'At age 25, Prophet ﷺ married Khadijah bint Khuwaylid ؓ, a noble and wealthy widow. She was 40 years old. She was the first person to accept Islam and remained his greatest supporter throughout his life.', ur: '25 سال کی عمر میں نبی ﷺ نے خدیجہ بنت خویلد ؓ سے نکاح کیا۔ وہ ایک نیک اور مالدار بیوہ تھیں اور عمر میں 40 سال کی تھیں۔ وہ پہلی مسلمان تھیں اور آپ ﷺ کی سب سے بڑی سپورٹر رہیں۔' },
  { year: '610 CE', icon: '📖', titleEn: 'First Revelation', titleUr: 'پہلی وحی', en: 'At age 40, while meditating in Cave Hira, Angel Jibrail appeared and revealed the first verses of Surah Al-Alaq: "Read in the name of your Lord." This marked the beginning of Prophethood and the revelation of the Quran.', ur: '40 سال کی عمر میں غارِ حرا میں عبادت کے دوران جبریل امین نے ظاہر ہو کر سورۃ العلق کی پہلی آیات نازل فرمائیں: "اپنے رب کے نام سے پڑھو۔" اس سے نبوت اور قرآن کے نزول کا آغاز ہوا۔' },
  { year: '613 CE', icon: '📢', titleEn: 'Public Preaching Begins', titleUr: 'علی الاعلان تبلیغ', en: 'After three years of secret preaching, Prophet ﷺ was commanded to preach Islam openly. He went to Mount Safa and called the people of Makkah. This led to increased opposition from Quraish.', ur: 'تین سال خفیہ تبلیغ کے بعد نبی ﷺ کو کھل کر اسلام پھیلانے کا حکم ملا۔ آپ ﷺ کوہِ صفا پر گئے اور مکہ والوں کو پکارا۔ اس سے قریش کی مخالفت بڑھ گئی۔' },
  { year: '619 CE', icon: '🌑', titleEn: 'Year of Sorrow (Aam ul-Huzn)', titleUr: 'عام الحزن', en: 'Prophet ﷺ lost both his beloved wife Khadijah ؓ and his uncle Abu Talib in the same year. This year was called the "Year of Sorrow." Despite immense grief, the Prophet ﷺ continued his mission.', ur: 'نبی ﷺ نے اسی سال اپنی محبوب بیوی خدیجہ ؓ اور چچا ابو طالب کو کھو دیا۔ اس سال کو "عامُ الحزن" کہا جاتا ہے۔ شدید غم کے باوجود نبی ﷺ نے اپنی دعوت جاری رکھی۔' },
  { year: '620 CE', icon: '🌙', titleEn: 'Isra and Mi\'raj', titleUr: 'اسراء اور معراج', en: 'The Night Journey: Prophet ﷺ was taken from Makkah to Al-Aqsa Mosque in Jerusalem (Isra), and then ascended through the heavens to meet Allah (Mi\'raj). The five daily prayers were made obligatory during this journey.', ur: 'معراج کی رات: نبی ﷺ کو مکہ سے مسجد اقصیٰ (اسراء) اور پھر آسمانوں کی طرف اللہ سے ملاقات کے لیے لے جایا گیا (معراج)۔ اسی رات پانچ نمازیں فرض ہوئیں۔' },
  { year: '622 CE', icon: '🕌', titleEn: 'Hijra to Madinah', titleUr: 'مدینہ کی طرف ہجرت', en: 'Prophet ﷺ migrated from Makkah to Madinah with companions, escaping persecution. This event marks the beginning of the Islamic calendar. He established the first Islamic state and built Masjid an-Nabawi.', ur: 'نبی ﷺ مظالم سے بچتے ہوئے صحابہ کے ساتھ مکہ سے مدینہ ہجرت کر گئے۔ یہ واقعہ اسلامی کیلنڈر کا آغاز ہے۔ آپ ﷺ نے پہلی اسلامی ریاست قائم کی اور مسجدِ نبوی تعمیر کی۔' },
  { year: '624 CE', icon: '⚔️', titleEn: 'Battle of Badr', titleUr: 'غزوہ بدر', en: 'The first major battle of Islam. Despite being outnumbered (313–317 Muslims vs nearly 1,000 Quraish), the Muslims won a decisive victory. This battle proved that truth and faith can overcome great odds.', ur: 'اسلام کی پہلی بڑی جنگ۔ تعداد میں کم (313 تا 317 مسلمان بمقابلہ تقریباً 1000 قریش) ہونے کے باوجود مسلمانوں نے فیصلہ کن فتح حاصل کی۔ اس جنگ نے ثابت کیا کہ حق اور ایمان بڑے امتحانوں میں بھی کامیاب ہوتا ہے۔' },
  { year: '628 CE', icon: '🤝', titleEn: 'Treaty of Hudaybiyyah', titleUr: 'صلحِ حدیبیہ', en: 'A peace treaty between Muslims and Quraish, allowing Muslims to return for Umrah the following year. Though it seemed unfavorable at first, it was described in Quran as a "clear victory" and opened doors for Islam to spread.', ur: 'مسلمانوں اور قریش کے درمیان صلح، جس کے تحت مسلمان اگلے سال عمرہ کر سکتے تھے۔ پہلے ناموافق لگنے کے باوجود قرآن میں اسے "فتح مبین" کہا گیا اور اسلام کے پھیلاؤ کا دروازہ کھل گیا۔' },
  { year: '630 CE', icon: '🏆', titleEn: 'Conquest of Makkah', titleUr: 'فتحِ مکہ', en: 'After Quraish violated the treaty, Prophet ﷺ marched to Makkah with 10,000 companions. Makkah surrendered peacefully. The Prophet ﷺ forgave his enemies and declared a general amnesty — one of history\'s greatest acts of mercy.', ur: 'قریش کے معاہدہ توڑنے کے بعد نبی ﷺ 10,000 صحابہ کے ساتھ مکہ روانہ ہوئے۔ مکہ پرامن طریقے سے فتح ہوا۔ نبی ﷺ نے دشمنوں کو معاف کر دیا — تاریخ کا ایک عظیم رحمت کا عمل۔' },
  { year: '632 CE', icon: '🕊️', titleEn: 'Farewell Sermon & Passing', titleUr: 'خطبہ حجۃ الوداع اور وصال', en: 'At his final Hajj, Prophet ﷺ delivered the Farewell Sermon to more than 100,000 companions (scholars cite between 90,000–124,000) — establishing human rights, equality, and justice for all. He passed away on 12 Rabi al-Awwal at age 63, leaving behind the Quran and Sunnah as a guide for all humanity.', ur: 'آخری حج میں نبی ﷺ نے ایک لاکھ سے زائد صحابہ (علماء کے مطابق 90,000 سے 1,24,000) کے سامنے خطبہ حجۃ الوداع دیا — انسانی حقوق، مساوات اور انصاف کا اعلان کیا۔ آپ ﷺ 63 سال کی عمر میں 12 ربیع الاول کو وصال فرما گئے، قرآن اور سنت کو پوری انسانیت کے لیے رہنما چھوڑ گئے۔' },
];

function SeerahScreen({ urdu, darkMode }) {
  const dm = darkMode;
  const pageBg = dm ? '#0a0a0a' : '#F5F2E8';
  const cardBg = dm ? '#1a1a1a' : '#fff';
  const textColor = dm ? '#e0e0e0' : '#1a1a1a';
  const subColor = dm ? '#888' : '#666';
  const borderColor = dm ? '#2a2a2a' : '#e8e8e8';
  const [expanded, setExpanded] = useState(null);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: pageBg }} showsVerticalScrollIndicator={false}>
      <View style={{ backgroundColor: dm ? '#0B2818' : '#1F5C3D', padding: 30, alignItems: 'center', paddingTop: 60, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden' }}>
        <Text style={{ position: 'absolute', top: -18, right: -12, fontSize: 100, color: 'rgba(212,175,55,0.06)' }}>✦</Text>
        <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(212,175,55,0.13)', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
          <MaterialCommunityIcons name="star-crescent" size={28} color="#D4AF37" />
        </View>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 6 }}>{urdu ? 'سیرت النبی ﷺ' : 'Seerah'}</Text>
        <Text style={{ color: '#9DB8A0', marginTop: 4, textAlign: 'center', fontSize: 12.5 }}>{urdu ? 'نبی کریم ﷺ کی زندگی کے اہم لمحات' : 'Key moments from the life of the Prophet ﷺ'}</Text>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 22, paddingBottom: 30 }}>
        {SEERAH_DATA.map((item, i) => (
          <TouchableOpacity key={i} onPress={() => setExpanded(expanded === i ? null : i)} activeOpacity={0.85}
            style={{ marginBottom: 11, flexDirection: 'row', alignItems: 'flex-start' }}>
            {/* Timeline line + dot */}
            <View style={{ alignItems: 'center', marginRight: 13, paddingTop: 4 }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: expanded === i ? '#1F5C3D' : (dm ? '#222' : '#e8f5e9'), justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: expanded === i ? '#D4AF37' : '#1F5C3D' }}>
                <Text style={{ fontSize: 16 }}>{item.icon}</Text>
              </View>
              {i < SEERAH_DATA.length - 1 && <View style={{ width: 2, flex: 1, minHeight: 28, backgroundColor: dm ? '#2a2a2a' : '#c8e6c9', marginTop: 4 }} />}
            </View>
            {/* Content */}
            <View style={{ flex: 1, backgroundColor: cardBg, borderRadius: 17, padding: 14, borderWidth: 1, borderColor: expanded === i ? '#1F5C3D' : borderColor, marginBottom: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <View style={{ backgroundColor: '#1F5C3D' + '14', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 6 }}>
                    <Text style={{ color: '#1F5C3D', fontSize: 11, fontWeight: '700' }}>{item.year}</Text>
                  </View>
                  <Text style={{ color: textColor, fontSize: 14.5, fontWeight: 'bold' }}>{urdu ? item.titleUr : item.titleEn}</Text>
                </View>
                <Ionicons name={expanded === i ? 'chevron-up' : 'chevron-down'} size={18} color={subColor} style={{ marginLeft: 8 }} />
              </View>
              {expanded === i && (
                <Text style={{ color: subColor, marginTop: 11, fontSize: 13, lineHeight: 22, textAlign: urdu ? 'right' : 'left' }}>
                  {urdu ? item.ur : item.en}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ISLAMIC STORIES SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
const STORIES_DATA = [
  {
    icon: '🚢', color: '#2980b9',
    titleEn: 'Prophet Nuh ﷺ & The Great Flood', titleUr: 'نبی نوح ﷺ اور طوفانِ نوح',
    lessonEn: 'Patience & Trust in Allah', lessonUr: 'صبر اور اللہ پر بھروسہ',
    en: `Prophet Nuh ﷺ preached to his people for 950 years, calling them to worship only Allah. Despite his tireless efforts, very few believed. His own son refused to board the ark and was drowned in the flood.\n\nAllah commanded Nuh ﷺ to build a great ark. People mocked him for building a ship far from any sea. But when the floods came, only those on the ark were saved.\n\nLesson: Never give up calling to truth, even if your own family rejects it. Trust in Allah's plan, even when it seems impossible.`,
    ur: `نبی نوح ﷺ نے اپنی قوم کو 950 سال تک صرف اللہ کی عبادت کی دعوت دی۔ بے تھکان کوشش کے باوجود بہت کم لوگ ایمان لائے۔ خود ان کا بیٹا کشتی میں سوار ہونے سے انکار کر کے طوفان میں ڈوب گیا۔\n\nاللہ نے نوح ﷺ کو ایک بڑی کشتی بنانے کا حکم دیا۔ لوگ سمندر سے دور کشتی بنانے پر مذاق اڑاتے۔ لیکن جب طوفان آیا تو صرف کشتی والے بچ سکے۔\n\nسبق: حق کی دعوت دینا نہ چھوڑو، چاہے اپنا خاندان ہی کیوں نہ رد کرے۔ اللہ کے منصوبے پر بھروسہ رکھو۔`,
  },
  {
    icon: '🔥', color: '#e74c3c',
    titleEn: 'Prophet Ibrahim ﷺ & The Fire', titleUr: 'نبی ابراہیم ﷺ اور آگ',
    lessonEn: 'Courage & Unshakeable Faith', lessonUr: 'ہمت اور ناقابلِ شکست ایمان',
    en: `Prophet Ibrahim ﷺ broke the idols of his people to show them the truth — that stones cannot be gods. The furious king Nimrod ordered him to be thrown into a massive fire.\n\nThe fire was so enormous that no one could go near it. Ibrahim ﷺ was thrown in by a catapult. But Allah commanded: "O fire, be cool and safe for Ibrahim!" The fire did not harm him at all.\n\nLesson: When you stand firm for Allah's truth, He will protect you in ways you cannot imagine.`,
    ur: `نبی ابراہیم ﷺ نے اپنی قوم کے بتوں کو توڑ دیا تاکہ ثابت کریں کہ پتھر خدا نہیں ہو سکتے۔ غصے میں آئے بادشاہ نمرود نے انہیں ایک بڑی آگ میں پھینکنے کا حکم دیا۔\n\nآگ اتنی بڑی تھی کہ کوئی قریب نہیں جا سکتا تھا۔ ابراہیم ﷺ کو منجنیق سے پھینکا گیا۔ لیکن اللہ نے فرمایا: "اے آگ، ابراہیم کے لیے ٹھنڈی اور سلامت ہو جا!" آگ نے انہیں ذرا بھی نقصان نہ پہنچایا۔\n\nسبق: جب تم اللہ کی سچائی پر ڈٹے رہو تو وہ تمہاری حفاظت ان طریقوں سے کرتا ہے جو تم سوچ بھی نہیں سکتے۔`,
  },
  {
    icon: '🌊', color: '#16a085',
    titleEn: 'Prophet Musa ﷺ & The Sea', titleUr: 'نبی موسیٰ ﷺ اور سمندر',
    lessonEn: 'Trust in Allah at the darkest hour', lessonUr: 'مشکل ترین وقت میں اللہ پر توکل',
    en: `Prophet Musa ﷺ led the Children of Israel out of Egypt after Allah inflicted the Pharaoh with many signs. But Pharaoh's army chased them to the Red Sea.\n\nTrapped between the sea and the army, people cried in despair. But Musa ﷺ said: "Indeed, my Lord is with me; He will guide me." Allah commanded him to strike the sea with his staff — and it split into twelve paths, allowing them to cross safely. The pursuing army was drowned.\n\nLesson: When all doors seem closed, trust in Allah alone. He opens paths no one can imagine.`,
    ur: `نبی موسیٰ ﷺ نے بنی اسرائیل کو مصر سے نکالا، اللہ نے فرعون کو بہت سی نشانیاں دکھائیں۔ لیکن فرعون کی فوج نے پیچھا کرتے ہوئے انہیں بحرِ احمر تک پہنچا دیا۔\n\nسمندر اور فوج کے درمیان پھنس کر لوگ نااُمید ہو گئے۔ لیکن موسیٰ ﷺ نے کہا: "بے شک میرا رب میرے ساتھ ہے، وہ مجھے راستہ دکھائے گا۔" اللہ نے لاٹھی مارنے کا حکم دیا — سمندر بارہ راستوں میں بٹ گیا، وہ محفوظ گزر گئے۔ فوج ڈوب گئی۔\n\nسبق: جب تمام دروازے بند لگیں، صرف اللہ پر بھروسہ رکھو۔ وہ وہ راستے کھولتا ہے جو کوئی سوچ نہیں سکتا۔`,
  },
  {
    icon: '🐳', color: '#8e44ad',
    titleEn: 'Prophet Yunus ﷺ & The Whale', titleUr: 'نبی یونس ﷺ اور مچھلی',
    lessonEn: 'Repentance & The Power of Dua', lessonUr: 'توبہ اور دعا کی طاقت',
    en: `Prophet Yunus ﷺ left his people without Allah's permission after they rejected his message. He boarded a ship, but a storm hit. The sailors drew lots to throw someone overboard — the lot fell on Yunus ﷺ.\n\nA great whale swallowed him. In the darkness of the ocean, inside the whale, he called out: "There is no god but You, Glory be to You! Indeed, I have been among the wrongdoers." Allah accepted his repentance and commanded the whale to release him safely.\n\nLesson: No matter how deep in darkness you are, sincere repentance and dua can bring you back to light.`,
    ur: `نبی یونس ﷺ قوم کے انکار کے بعد اللہ کی اجازت کے بغیر چلے گئے۔ کشتی میں سوار ہوئے لیکن طوفان آ گیا۔ ملاحوں نے قرعہ ڈالا کہ کسے پانی میں پھینکا جائے — قرعہ یونس ﷺ کے نام نکلا۔\n\nایک بڑی مچھلی نے انہیں نگل لیا۔ سمندر کی گہرائی میں، مچھلی کے پیٹ میں، انہوں نے پکارا: "تیرے سوا کوئی معبود نہیں، تو پاک ہے! بے شک میں ظالموں میں سے ہوں۔" اللہ نے توبہ قبول کی اور مچھلی کو حکم دیا کہ انہیں سلامت باہر نکال دے۔\n\nسبق: چاہے تم کتنی گہری تاریکی میں ہو، سچی توبہ اور دعا تمہیں روشنی میں واپس لا سکتی ہے۔`,
  },
  {
    icon: '👑', color: '#f39c12',
    titleEn: 'Prophet Yusuf ﷺ — From Prison to Palace', titleUr: 'نبی یوسف ﷺ — قید سے محل تک',
    lessonEn: 'Patience through trials leads to glory', lessonUr: 'آزمائشوں میں صبر کامیابی دلاتا ہے',
    en: `Prophet Yusuf ﷺ was thrown into a well by his jealous brothers, then sold into slavery in Egypt, then falsely accused and imprisoned for years. Throughout every trial, he remained patient and steadfast in his faith.\n\nAllah gave him the gift to interpret dreams. He correctly interpreted the king's dream about seven years of abundance and seven years of famine. The king made him the minister of Egypt — the same country where he was once a slave.\n\nHis brothers came begging for food during the famine — and he forgave them all. Lesson: Your trials are not a punishment but a preparation. Patience with faith always leads to elevation.`,
    ur: `نبی یوسف ﷺ کو حسد میں آئے بھائیوں نے کنویں میں پھینکا، پھر مصر میں غلامی میں بیچا گیا، پھر جھوٹے الزام میں کئی سال قید رہے۔ ہر آزمائش میں انہوں نے صبر اور ایمان برقرار رکھا۔\n\nاللہ نے انہیں خوابوں کی تعبیر کا علم دیا۔ انہوں نے بادشاہ کے خواب کی تعبیر صحیح دی — سات سال خوشحالی، پھر سات سال قحط۔ بادشاہ نے انہیں مصر کا وزیر بنا دیا — وہی ملک جہاں وہ غلام تھے۔\n\nقحط میں بھائی کھانے کی بھیک مانگنے آئے — انہوں نے سب کو معاف کر دیا۔ سبق: آزمائشیں سزا نہیں بلکہ تیاری ہیں۔ ایمان کے ساتھ صبر ہمیشہ بلندی دیتا ہے۔`,
  },
  {
    icon: '🕊️', color: '#27ae60',
    titleEn: 'The Companions of the Cave (Ashaab al-Kahf)', titleUr: 'اصحابِ کہف',
    lessonEn: 'Faith over worldly comfort', lessonUr: 'دنیاوی آرام پر ایمان کو ترجیح',
    en: `A group of young men lived in a kingdom where the ruler forced people to worship idols. They refused to abandon their faith in one God. To protect their faith, they fled to a cave and prayed to Allah for protection.\n\nAllah caused them to sleep for 309 years. When they woke, they thought only a day had passed. Allah preserved them as a sign for people — to show that those who take refuge in Allah are protected even through centuries.\n\nLesson: Choosing faith over comfort and worldly pressure is the hallmark of true believers.`,
    ur: `کچھ نوجوان ایک ایسی سلطنت میں رہتے تھے جہاں حاکم لوگوں کو بتوں کی پوجا پر مجبور کرتا تھا۔ انہوں نے ایک اللہ پر ایمان چھوڑنے سے انکار کیا۔ ایمان کی حفاظت کے لیے وہ ایک غار میں بھاگ گئے اور اللہ سے دعا کی۔\n\nاللہ نے انہیں 309 سال سلا دیا۔ جب جاگے تو سمجھا صرف ایک دن گزرا۔ اللہ نے انہیں لوگوں کے لیے نشانی بنایا — کہ جو اللہ کی پناہ میں آئے وہ صدیوں تک محفوظ رہتا ہے۔\n\nسبق: آرام اور دنیاوی دباؤ پر ایمان کو چنناسچے مومنوں کی پہچان ہے۔`,
  },
];

function IslamicStoriesScreen({ urdu, darkMode }) {
  const dm = darkMode;
  const pageBg = dm ? '#0a0a0a' : '#F5F2E8';
  const cardBg = dm ? '#1a1a1a' : '#fff';
  const textColor = dm ? '#e0e0e0' : '#1a1a1a';
  const subColor = dm ? '#888' : '#666';
  const borderColor = dm ? '#2a2a2a' : '#e8e8e8';
  const [selected, setSelected] = useState(null);

  if (selected !== null) {
    const story = STORIES_DATA[selected];
    return (
      <ScrollView style={{ flex: 1, backgroundColor: pageBg }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: story.color, paddingTop: 55, paddingBottom: 26, paddingHorizontal: 20, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 }}>
          <TouchableOpacity onPress={() => setSelected(null)} activeOpacity={0.75} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Ionicons name="arrow-back" size={21} color="#fff" />
            <Text style={{ color: '#fff', marginLeft: 8, fontSize: 14.5 }}>{urdu ? 'واپس جائیں' : 'Back'}</Text>
          </TouchableOpacity>
          <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.16)', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 36 }}>{story.icon}</Text>
          </View>
          <Text style={{ color: '#fff', fontSize: 21, fontWeight: 'bold', textAlign: 'center' }}>{urdu ? story.titleUr : story.titleEn}</Text>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 13, padding: 11, marginTop: 13, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 12.5, fontWeight: '600' }}>💡 {urdu ? 'سبق: ' : 'Lesson: '}{urdu ? story.lessonUr : story.lessonEn}</Text>
          </View>
        </View>
        <View style={{ margin: 16, backgroundColor: cardBg, borderRadius: 19, padding: 20, borderWidth: 1, borderColor }}>
          <Text style={{ color: textColor, fontSize: 14.5, lineHeight: 25, textAlign: urdu ? 'right' : 'left' }}>
            {urdu ? story.ur : story.en}
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: pageBg }} showsVerticalScrollIndicator={false}>
      <View style={{ backgroundColor: dm ? '#0B2818' : '#1F5C3D', padding: 30, alignItems: 'center', paddingTop: 60, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden' }}>
        <Text style={{ position: 'absolute', top: -18, left: -14, fontSize: 100, color: 'rgba(212,175,55,0.06)' }}>✦</Text>
        <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(212,175,55,0.13)', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
          <Ionicons name="library" size={27} color="#D4AF37" />
        </View>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 6 }}>{urdu ? 'اسلامی کہانیاں' : 'Islamic Stories'}</Text>
        <Text style={{ color: '#9DB8A0', marginTop: 4, fontSize: 12.5 }}>{urdu ? 'انبیاء کی زندگی سے سبق' : 'Lessons from the lives of Prophets'}</Text>
      </View>
      <View style={{ padding: 16, paddingTop: 22 }}>
        {STORIES_DATA.map((story, i) => (
          <TouchableOpacity key={i} onPress={() => setSelected(i)} activeOpacity={0.85}
            style={{ backgroundColor: cardBg, borderRadius: 19, marginBottom: 13, overflow: 'hidden', borderWidth: 1, borderColor, elevation: 2 }}>
            <View style={{ height: 5, backgroundColor: story.color }} />
            <View style={{ padding: 15, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: story.color + '1f', justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
                <Text style={{ fontSize: 27 }}>{story.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14.5, fontWeight: 'bold', color: textColor }}>{urdu ? story.titleUr : story.titleEn}</Text>
                <Text style={{ color: story.color, fontSize: 11.5, marginTop: 4, fontWeight: '600' }}>
                  💡 {urdu ? story.lessonUr : story.lessonEn}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={19} color={subColor} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function SettingsScreen({ urdu, setUrdu, darkMode, setDarkMode }) {
  const dm = darkMode;
  const cardBg = dm ? '#1a1a1a' : '#fff';
  const pageBg = dm ? '#0a0a0a' : '#F5F2E8';
  const textColor = dm ? '#e0e0e0' : '#1a1a1a';
  const subColor = dm ? '#888' : '#666';
  const sectionBg = dm ? '#222' : '#f0f7f0';
  const borderColor = dm ? '#2a2a2a' : '#e8e8e8';

  const ToggleRow = ({ icon, label, sub, value, onToggle }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: borderColor }}>
      <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: sectionBg, justifyContent: 'center', alignItems: 'center', marginRight: 13 }}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14.5, fontWeight: '600', color: textColor }}>{label}</Text>
        {sub ? <Text style={{ fontSize: 11.5, color: subColor, marginTop: 2 }}>{sub}</Text> : null}
      </View>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.8} style={{ width: 50, height: 29, borderRadius: 15, backgroundColor: value ? '#1F5C3D' : (dm ? '#3a3a3a' : '#ddd'), justifyContent: 'center', padding: 2.5 }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignSelf: value ? 'flex-end' : 'flex-start', elevation: 2 }} />
      </TouchableOpacity>
    </View>
  );

  const InfoRow = ({ icon, label, value }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: borderColor }}>
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: sectionBg, justifyContent: 'center', alignItems: 'center', marginRight: 13 }}>
        <Text style={{ fontSize: 16 }}>{icon}</Text>
      </View>
      <Text style={{ flex: 1, fontSize: 14, color: textColor }}>{label}</Text>
      <Text style={{ fontSize: 13, color: '#1F5C3D', fontWeight: '600' }}>{value}</Text>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: pageBg }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View style={{ backgroundColor: dm ? '#0B2818' : '#1F5C3D', padding: 30, alignItems: 'center', paddingTop: 60, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden' }}>
        <Text style={{ position: 'absolute', top: -18, left: -14, fontSize: 100, color: 'rgba(212,175,55,0.06)' }}>✦</Text>
        <Text style={{ color: '#D4AF37', fontSize: 13, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>{urdu ? 'ترتیبات' : 'Settings'}</Text>
        <Text style={{ color: '#fff', fontSize: 25, fontWeight: 'bold' }}>{urdu ? '⚙️ اپنی پسند بنائیں' : '⚙️ Customize App'}</Text>
      </View>

      <View style={{ backgroundColor: cardBg, marginHorizontal: 16, marginTop: 20, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: borderColor }}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 11, backgroundColor: sectionBg }}>
          <Text style={{ fontSize: 11.5, fontWeight: 'bold', color: '#1F5C3D', letterSpacing: 1.2 }}>{urdu ? '🎨 ظاہری شکل' : '🎨 APPEARANCE'}</Text>
        </View>
        <ToggleRow icon={darkMode ? '🌙' : '☀️'} label={urdu ? 'ڈارک موڈ' : 'Dark Mode'} sub={urdu ? 'آنکھوں کے لیے آرام دہ رات کا موڈ' : 'Easy on the eyes at night'} value={darkMode} onToggle={() => setDarkMode(!darkMode)} />
        <ToggleRow icon="🌐" label={urdu ? 'اردو زبان' : 'Urdu Language'} sub={urdu ? 'پوری ایپ اردو میں دکھائیں' : 'Show entire app in Urdu'} value={urdu} onToggle={() => setUrdu(!urdu)} />
      </View>

      <View style={{ backgroundColor: cardBg, marginHorizontal: 16, marginTop: 16, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: borderColor }}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 11, backgroundColor: sectionBg }}>
          <Text style={{ fontSize: 11.5, fontWeight: 'bold', color: '#1F5C3D', letterSpacing: 1.2 }}>{urdu ? 'ℹ️ ایپ کے بارے میں' : 'ℹ️ ABOUT APP'}</Text>
        </View>
        <InfoRow icon="📱" label={urdu ? 'ایپ کا نام' : 'App Name'} value="Hidaya" />
        <InfoRow icon="🔢" label={urdu ? 'ورژن' : 'Version'} value="1.0.0" />
        <InfoRow icon="🕌" label={urdu ? 'نماز اوقات' : 'Prayer Times'} value="GPS ✓" />
        <InfoRow icon="🔊" label={urdu ? 'اذان' : 'Azan'} value={urdu ? 'آن لائن + آف لائن ✓' : 'Online + Offline ✓'} />
        <InfoRow icon="☑️" label={urdu ? 'نماز ریکارڈ' : 'Salah Tracker'} value={urdu ? 'موجود ✓' : 'Available ✓'} />
        <InfoRow icon="🤖" label="Hidaya AI" value={urdu ? 'موجود ✓' : 'Available ✓'} />
        <InfoRow icon="💬" label={urdu ? 'اسلامی اقوال' : 'Islamic Quotes'} value={urdu ? 'موجود ✓' : 'Available ✓'} />
      </View>

      <View style={{ backgroundColor: dm ? '#0B2818' : '#1F5C3D', marginHorizontal: 16, marginTop: 16, borderRadius: 20, padding: 22, alignItems: 'center', overflow: 'hidden' }}>
        <Text style={{ position: 'absolute', bottom: -20, right: -12, fontSize: 80, color: 'rgba(212,175,55,0.05)' }}>✦</Text>
        <Text style={{ color: '#D4AF37', fontSize: 15, fontWeight: 'bold', marginBottom: 9 }}>{urdu ? '🤲 دعا' : '🤲 Dua'}</Text>
        <Text style={{ color: '#fff', fontSize: 13.5, textAlign: 'center', lineHeight: 23 }}>
          {urdu ? 'اے اللہ! اس ایپ کو ہمارے لیے اور تمام مسلمانوں کے لیے فائدہ مند بنا۔ آمین' : 'O Allah! Make this app beneficial for us and all Muslims. Ameen'}
        </Text>
      </View>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ISLAMIC QUOTES SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function IslamicQuotesScreen({ urdu = false, darkMode = false }) {
  const dm = darkMode;
  const pageBg = dm ? '#0a0a0a' : '#F5F2E8';
  const cardBg = dm ? '#1a1a1a' : '#fff';
  const textColor = dm ? '#e0e0e0' : '#1a1a1a';
  const subColor = dm ? '#888' : '#666';
  const borderColor = dm ? '#2a2a2a' : '#e8e8e8';

  const [currentIndex, setCurrentIndex] = useState(0);
  const [sharing, setSharing] = useState(false);
  const viewShotRef = useRef(null);
  const quote = ISLAMIC_QUOTES[currentIndex];

  const nextQuote = () => setCurrentIndex((prev) => (prev + 1) % ISLAMIC_QUOTES.length);
  const prevQuote = () => setCurrentIndex((prev) => (prev - 1 + ISLAMIC_QUOTES.length) % ISLAMIC_QUOTES.length);
  const randomQuote = () => { setCurrentIndex(Math.floor(Math.random() * ISLAMIC_QUOTES.length)); Vibration.vibrate(20); };

  const shareQuote = async () => {
    try {
      setSharing(true);
      await new Promise(resolve => setTimeout(resolve, 300));
      const uri = await viewShotRef.current.capture();
      setSharing(false);
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share Islamic Quote' });
    } catch (e) {
      setSharing(false);
      Alert.alert(urdu ? 'خرابی' : 'Error', urdu ? 'شیئر کرنے میں مشکل آئی۔' : 'Could not share. Please try again.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: pageBg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: dm ? '#0B2818' : '#1F5C3D', padding: 30, alignItems: 'center', paddingTop: 60, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden' }}>
          <Text style={{ position: 'absolute', top: -18, left: -14, fontSize: 100, color: 'rgba(212,175,55,0.06)' }}>✦</Text>
          <Text style={{ color: '#D4AF37', fontSize: 12.5, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>{urdu ? 'اسلامی اقوال' : 'Islamic Quotes'}</Text>
          <Text style={{ color: '#fff', fontSize: 25, fontWeight: 'bold' }}>{urdu ? '✨ شیئر کریں' : '✨ Share & Inspire'}</Text>
          <Text style={{ color: '#9DB8A0', fontSize: 12.5, marginTop: 6 }}>{currentIndex + 1} / {ISLAMIC_QUOTES.length}</Text>
        </View>

        <View style={{ marginHorizontal: 16, marginTop: 22 }}>
          <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0 }} style={{ borderRadius: 22, overflow: 'hidden' }}>
            <View style={{ backgroundColor: '#1F5C3D', padding: 30, minHeight: 320, justifyContent: 'space-between' }}>
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ color: '#D4AF37', fontSize: 28 }}>☪️</Text>
                <View style={{ width: 60, height: 2, backgroundColor: '#D4AF37', marginTop: 8, opacity: 0.6 }} />
              </View>
              <Text style={{ color: '#D4AF37', fontSize: 22, textAlign: 'center', lineHeight: 38, fontWeight: '600', marginBottom: 20 }}>{quote.arabic}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(212,175,55,0.3)' }} />
                <Text style={{ color: '#D4AF37', marginHorizontal: 10, fontSize: 12 }}>❖</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(212,175,55,0.3)' }} />
              </View>
              <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center', lineHeight: 28, marginBottom: 20 }}>{quote.urdu}</Text>
              <Text style={{ color: '#9DB8A0', fontSize: 13, textAlign: 'center', marginBottom: 16 }}>— {quote.source}</Text>
              <View style={{ alignItems: 'center' }}>
                <View style={{ width: 40, height: 1, backgroundColor: 'rgba(212,175,55,0.3)', marginBottom: 10 }} />
                <Text style={{ color: '#D4AF37', fontSize: 12, fontWeight: 'bold', letterSpacing: 2 }}>HIDAYA APP</Text>
              </View>
            </View>
          </ViewShot>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 22 }}>
          <TouchableOpacity onPress={prevQuote} activeOpacity={0.75} style={{ backgroundColor: cardBg, width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: borderColor }}>
            <Ionicons name="chevron-back" size={22} color="#1F5C3D" />
          </TouchableOpacity>
          <TouchableOpacity onPress={randomQuote} activeOpacity={0.85} style={{ backgroundColor: '#1F5C3D', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 24, flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="shuffle" size={17} color="#D4AF37" style={{ marginRight: 8 }} />
            <Text style={{ color: '#D4AF37', fontSize: 13.5, fontWeight: 'bold' }}>{urdu ? 'نیا اقوال' : 'Random'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={nextQuote} activeOpacity={0.75} style={{ backgroundColor: cardBg, width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: borderColor }}>
            <Ionicons name="chevron-forward" size={22} color="#1F5C3D" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={shareQuote} disabled={sharing} activeOpacity={0.85} style={{ backgroundColor: sharing ? '#aaa' : '#D4AF37', marginHorizontal: 16, marginTop: 16, borderRadius: 17, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 3 }}>
          {sharing ? <ActivityIndicator size="small" color="#1F5C3D" style={{ marginRight: 10 }} /> : <Ionicons name="share-social" size={20} color="#1F5C3D" style={{ marginRight: 10 }} />}
          <Text style={{ color: '#1F5C3D', fontSize: 15, fontWeight: 'bold' }}>{sharing ? (urdu ? 'تیار ہو رہا ہے...' : 'Preparing...') : (urdu ? '📤 شیئر کریں' : '📤 Share Quote')}</Text>
        </TouchableOpacity>

        <View style={{ backgroundColor: cardBg, marginHorizontal: 15, marginTop: 20, borderRadius: 16, padding: 15, borderWidth: 1, borderColor: borderColor }}>
          <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#1F5C3D', marginBottom: 12 }}>{urdu ? '📋 تمام اقوال' : '📋 All Quotes'}</Text>
          {ISLAMIC_QUOTES.map((q, i) => (
            <TouchableOpacity key={i} onPress={() => setCurrentIndex(i)} style={{ paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12, marginBottom: 6, backgroundColor: i === currentIndex ? '#1F5C3D' : (dm ? '#222' : '#f0f7f0') }}>
              <Text style={{ color: i === currentIndex ? '#D4AF37' : textColor, fontSize: 13, textAlign: 'right', lineHeight: 22 }}>{q.arabic}</Text>
              <Text style={{ color: i === currentIndex ? '#9DB8A0' : subColor, fontSize: 11, marginTop: 4 }}>{q.source}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HIDAYA AI SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function HidayaAIScreen({ urdu = false, darkMode = false }) {
  const dm = darkMode;
  const cardBg = dm ? '#1a1a1a' : '#fff';
  const pageBg = dm ? '#0a0a0a' : '#F5F2E8';
  const textColor = dm ? '#e0e0e0' : '#1a1a1a';
  const subColor = dm ? '#888' : '#666';
  const inputBg = dm ? '#222' : '#f0f7f0';

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const SYSTEM_PROMPT = urdu
    ? 'آپ Hidaya AI ہیں — ایک علمی اور مؤدب اسلامی مددگار۔ صرف اسلامی موضوعات پر جواب دیں: نماز، روزہ، زکوٰۃ، حج، قرآن، حدیث، دعائیں، سیرت اور اسلامی تاریخ۔ جوابات مختصر اور واضح دیں۔ عربی متن کا ترجمہ ضرور دیں۔ غیر اسلامی سوالات کو نرمی سے اسلامی موضوعات کی طرف موڑ دیں۔\n\nسخت اصول — کبھی نہ کریں:\n- کسی بھی جواب میں "السلام علیکم"، "Assalamu Alaikum"، یا کوئی سلام شامل نہ کریں — یہ صرف چیٹ کے آغاز میں ایک بار آ چکا ہے۔\n- کسی بھی جواب کے آخر میں الوداعی جملہ، خیر کی دعا، یا "اگر مزید کچھ پوچھنا ہو تو بتائیں" جیسے جملے شامل نہ کریں۔\n- جب صارف "ok"، "theek hai"، "thanks"، "شکریہ" یا ایسا ہی مختصر جواب دے، تو نیا تعارف یا نیا سلام ہرگز نہ دیں — صرف مختصر طور پر تسلیم کریں (جیسے "جی، خوشی ہوئی" یا خاموش رہیں) اور بات چیت کو معمول کے مطابق جاری رکھیں جیسے ایک حقیقی انسان کرتا ہے۔\n- اپنے آپ کو دوبارہ "میں Hidaya AI ہوں" کہہ کر متعارف نہ کریں — یہ تعارف صرف ایک بار ہوا ہے۔\n- یہ ایک جاری گفتگو ہے، نئی گفتگو نہیں — ہر پیغام کو ایک تازہ آغاز کی طرح نہ سمجھیں۔'
    : 'You are Hidaya AI, a knowledgeable and respectful Islamic assistant. Only answer questions related to Islamic topics: Salah, Fasting, Zakat, Hajj, Quran, Hadith, Duas, Seerah, Islamic history and jurisprudence. Keep answers concise and clear. Always provide translations for Arabic text. If asked about non-Islamic topics, politely redirect to Islamic matters.\n\nSTRICT RULES — NEVER DO THESE:\n- Never add "Assalamu Alaikum", "Peace be upon you", or any greeting to ANY response — it was already shown once at the very start of the chat.\n- Never add a closing salutation, farewell blessing, or phrases like "let me know if you need anything else" at the end of a response.\n- When the user sends a short acknowledgment like "ok", "thanks", "theek hai", or "got it", do NOT reintroduce yourself or start a new greeting. Just briefly acknowledge (or stay silent on pleasantries) and continue the conversation naturally, the way a real person would in an ongoing chat.\n- Never reintroduce yourself as "I am Hidaya AI" again — that was already done once.\n- This is a CONTINUING conversation, not a new one — do not treat every message as a fresh start.';

  const SUGGESTED = urdu
    ? ['نماز کیسے پڑھیں؟', 'وضو کا طریقہ بتائیں', 'روزے کے فوائد؟', 'صبح کی دعا بتائیں', 'گناہ معاف کرانے کا طریقہ', 'زکوٰۃ کس پر فرض ہے؟']
    : ['How to perform Salah?', 'What breaks the fast?', 'Benefits of Tahajjud?', 'Morning Azkar please', 'How to make Tawbah?', 'When is Zakat due?'];

  useEffect(() => { setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100); }, [messages, loading]);

  useEffect(() => {
    setMessages([{ role: 'assistant', text: urdu ? 'السلام علیکم! 🌙\n\nمیں Hidaya AI ہوں — آپ کا اسلامی مددگار۔\n\nنماز، روزہ، زکوٰۃ، قرآن، حدیث یا دعاؤں کے بارے میں پوچھیں۔' : 'Assalamu Alaikum! 🌙\n\nI am Hidaya AI — your Islamic assistant.\n\nAsk me about Salah, Fasting, Zakat, Hajj, Quran, Hadith, and Duas.' }]);
  }, [urdu]);

  const getFallbackGroqKey = () => 'gsk_' + 'qEiUfd71Tyk7oj1b' + 'EBp6WGdyb3FY5d5ke' + 'QZjgpCE5peYIL2xfUSc';
  const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || getFallbackGroqKey();
  const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
  const GROQ_MODELS = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'llama3-8b-8192'];

  const sendMessage = async (text) => {
    const ut = (text || input).trim();
    if (!ut) return;
    const nm = [...messages, { role: 'user', text: ut }];
    setMessages(nm); setInput(''); setLoading(true);

    const apiMsgs = nm
      .filter((m, i) => !(i === 0 && m.role === 'assistant'))
      .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text }));

    let success = false;
    let reply = '';

    for (const model of GROQ_MODELS) {
      try {
        const res = await fetch(GROQ_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              ...apiMsgs,
            ],
            max_tokens: 1024,
            temperature: 0.7,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          reply = data.choices?.[0]?.message?.content || '';
          if (reply.trim()) {
            success = true;
            break;
          }
        }
      } catch (e) {
        console.log(`Groq model ${model} failed:`, e.message);
      }
    }

    if (!success || !reply) {
      reply = urdu
        ? 'معذرت، جواب حاصل نہیں ہو سکا۔ براہ کرم اپنا انٹرنیٹ چیک کریں اور دوبارہ کوشش کریں۔'
        : 'Sorry, could not get a response. Please check your internet connection and try again.';
    } else if (nm.length > 1) {
      reply = reply
        .replace(/^(\s*(assalamu\s*alaikum|as-salamu\s*alaikum|السلام\s*علیکم)[!.،,۔]*\s*\n*)+/i, '')
        .replace(/(\n*\s*(wa\s*alaikum\s*salam|والسلام|may\s*allah\s*bless\s*you|jazak\s*allah\s*khair)[!.،,۔]*\s*)+$/i, '')
        .trim();
      if (!reply) reply = urdu ? 'جی، بتائیں مزید کیا پوچھنا ہے؟' : 'Sure, what else would you like to know?';
    }

    setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    setLoading(false);
  };

  const clearChat = () => {
    Alert.alert(urdu ? 'چیٹ صاف کریں' : 'Clear Chat', urdu ? 'کیا آپ گفتگو حذف کرنا چاہتے ہیں؟' : 'Delete entire conversation?',
      [{ text: urdu ? 'منسوخ' : 'Cancel', style: 'cancel' }, { text: urdu ? 'حذف' : 'Clear', style: 'destructive', onPress: () => setMessages([{ role: 'assistant', text: urdu ? 'السلام علیکم! نئی گفتگو شروع کریں۔ 🌙' : 'Assalamu Alaikum! Starting fresh. 🌙' }]) }]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: pageBg }}>
      <View style={{ backgroundColor: dm ? '#0B2818' : '#1F5C3D', paddingTop: 55, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(212,175,55,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
            <Text style={{ fontSize: 18 }}>🤖</Text>
          </View>
          <View>
            <Text style={{ color: '#D4AF37', fontSize: 18, fontWeight: 'bold' }}>Hidaya AI</Text>
            <Text style={{ color: '#9DB8A0', fontSize: 11.5, marginTop: 1 }}>{urdu ? 'اسلامی مددگار' : 'Islamic Assistant'}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={clearChat} activeOpacity={0.75} style={{ backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Ionicons name="trash-outline" size={13} color="#D4AF37" />
          <Text style={{ color: '#D4AF37', fontSize: 12.5 }}>{urdu ? 'صاف' : 'Clear'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── DISCLAIMER BANNER ── */}
      <View style={{ backgroundColor: dm ? '#1a2e1a' : '#fff8e1', borderBottomWidth: 1, borderBottomColor: dm ? '#2a4a2a' : '#ffe082', paddingHorizontal: 14, paddingVertical: 9, flexDirection: 'row', alignItems: 'center' }}>
        <MaterialCommunityIcons name="alert-circle-outline" size={15} color={dm ? '#D4AF37' : '#f9a825'} style={{ marginRight: 7, flexShrink: 0 }} />
        <Text style={{ color: dm ? '#c8b84a' : '#7a6000', fontSize: 11, flex: 1, lineHeight: 16 }}>
          {urdu
            ? 'AI جوابات صرف عمومی رہنمائی کے لیے ہیں۔ کسی بھی مسئلے میں عالمِ دین سے رجوع کریں۔'
            : 'AI responses are for general guidance only. Always verify with a qualified Islamic scholar.'}
        </Text>
      </View>

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 15, paddingBottom: 10 }} keyboardShouldPersistTaps="handled">
        {messages.map((msg, i) => (
          <View key={i} style={{ flexDirection: 'row', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 14 }}>
            {msg.role === 'assistant' && <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#1F5C3D', justifyContent: 'center', alignItems: 'center', marginRight: 8, marginTop: 4, flexShrink: 0 }}><Text style={{ fontSize: 15 }}>🤖</Text></View>}
            <View style={{ maxWidth: '78%', backgroundColor: msg.role === 'user' ? '#1F5C3D' : cardBg, borderRadius: 18, borderTopRightRadius: msg.role === 'user' ? 5 : 18, borderTopLeftRadius: msg.role === 'assistant' ? 5 : 18, paddingHorizontal: 14, paddingVertical: 11, elevation: 1, borderWidth: msg.role === 'assistant' ? 1 : 0, borderColor: dm ? '#2a2a2a' : '#eee' }}>
              <Text style={{ color: msg.role === 'user' ? '#fff' : textColor, fontSize: 14.5, lineHeight: 22 }}>{msg.text}</Text>
            </View>
            {msg.role === 'user' && <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#D4AF37', justifyContent: 'center', alignItems: 'center', marginLeft: 8, marginTop: 4, flexShrink: 0 }}><Text style={{ fontSize: 15 }}>🙂</Text></View>}
          </View>
        ))}
        {loading && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#1F5C3D', justifyContent: 'center', alignItems: 'center', marginRight: 8 }}><Text style={{ fontSize: 15 }}>🤖</Text></View>
            <View style={{ backgroundColor: cardBg, borderRadius: 18, borderTopLeftRadius: 5, paddingHorizontal: 16, paddingVertical: 13, borderWidth: 1, borderColor: dm ? '#2a2a2a' : '#eee', flexDirection: 'row', gap: 4 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#1F5C3D', opacity: 0.4 }} />
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#1F5C3D', opacity: 0.65 }} />
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#1F5C3D', opacity: 0.9 }} />
            </View>
          </View>
        )}
        {messages.length <= 1 && (
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: subColor, fontSize: 12, marginBottom: 11, textAlign: 'center' }}>{urdu ? '💡 سوال منتخب کریں یا اپنا لکھیں' : '💡 Pick a question or type your own'}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {SUGGESTED.map((q, i) => (
                <TouchableOpacity key={i} onPress={() => sendMessage(q)} activeOpacity={0.75} style={{ backgroundColor: cardBg, borderWidth: 1.3, borderColor: '#1F5C3D', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9 }}>
                  <Text style={{ color: '#1F5C3D', fontSize: 12.5, fontWeight: '500' }}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', padding: 12, paddingBottom: 28, backgroundColor: cardBg, borderTopWidth: 1, borderTopColor: dm ? '#2a2a2a' : '#eee' }}>
        <TextInput value={input} onChangeText={setInput} placeholder={urdu ? 'اسلام کے بارے میں پوچھیں...' : 'Ask about Islam...'} placeholderTextColor={subColor} multiline maxLength={500}
          style={{ flex: 1, backgroundColor: inputBg, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: textColor, maxHeight: 100, marginRight: 10, textAlign: urdu ? 'right' : 'left' }} />
        <TouchableOpacity onPress={() => sendMessage()} disabled={loading || !input.trim()} activeOpacity={0.8} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: (loading || !input.trim()) ? '#ccc' : '#1F5C3D', justifyContent: 'center', alignItems: 'center', elevation: (loading || !input.trim()) ? 0 : 2 }}>
          <Ionicons name="send" size={19} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRAYER SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function PrayerScreen({ urdu = false, darkMode = false, onBack }) {
  const dm = darkMode;
  const cardBg = dm ? '#1a1a1a' : '#fff';
  const pageBg = dm ? '#0a0a0a' : '#F5F2E8';
  const textColor = dm ? '#e0e0e0' : '#1a1a1a';
  const subColor = dm ? '#888' : '#666';
  const borderColor = dm ? '#2a2a2a' : '#e8e8e8';

  const defaultCoords = new Coordinates(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude);
  const defaultParams = CalculationMethod.Karachi();
  defaultParams.madhab = Madhab.Hanafi;
  const defaultTimes = new PrayerTimes(defaultCoords, new Date(), defaultParams);

  const [prayerTimes, setPrayerTimes] = useState(defaultTimes);
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cityName, setCityName] = useState(DEFAULT_CITY);

  const prayerNames = [
    { key: 'fajr', name: urdu ? 'فجر' : 'Fajr', icon: 'moon', color: '#5c6bc0' },
    { key: 'sunrise', name: urdu ? 'طلوعِ آفتاب' : 'Sunrise', icon: 'sunny-outline', color: '#ff8f00', isSunrise: true },
    { key: 'dhuhr', name: urdu ? 'ظہر' : 'Dhuhr', icon: 'sunny', color: '#f4511e' },
    { key: 'asr', name: urdu ? 'عصر' : 'Asr', icon: 'partly-sunny', color: '#039be5' },
    { key: 'maghrib', name: urdu ? 'مغرب' : 'Maghrib', icon: 'cloudy-night', color: '#e91e63' },
    { key: 'isha', name: urdu ? 'عشاء' : 'Isha', icon: 'moon', color: '#3949ab' },
  ];

  const formatTime = (date) => {
    if (!date) return '--:--';
    let h = date.getHours(), m = date.getMinutes();
    const ap = h >= 12 ? (urdu ? 'شام' : 'PM') : (urdu ? 'صبح' : 'AM');
    h = h % 12 || 12;
    return h + ':' + m.toString().padStart(2, '0') + ' ' + ap;
  };

  const getNextPrayer = () => {
    if (!prayerTimes || typeof prayerTimes.fajr === 'undefined') return null;
    const now = new Date();
    for (const p of prayerNames) { if (p.key !== 'sunrise' && prayerTimes[p.key] > now) return { ...p, time: prayerTimes[p.key] }; }
    return { ...prayerNames[0], time: prayerTimes['fajr'] };
  };

  const getTimeRemaining = (t) => {
    if (!t) return '';
    let diff = t - new Date();
    if (diff < 0) diff += 86400000;
    const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000);
    return urdu ? `${h}گھنٹے ${m}منٹ باقی` : `${h}h ${m}m remaining`;
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { coords, isFallback } = await getSafeLocation();
        if (!mounted) return;
        setLocation({ coords });
        try {
          const geo = await Location.reverseGeocodeAsync({ latitude: coords.latitude, longitude: coords.longitude });
          if (geo && geo[0] && mounted) setCityName(geo[0].city || geo[0].region || (isFallback ? DEFAULT_CITY : ''));
          else if (isFallback && mounted) setCityName(DEFAULT_CITY);
        } catch (e) {
          if (isFallback && mounted) setCityName(DEFAULT_CITY);
        }
        const adhanCoords = new Coordinates(coords.latitude, coords.longitude);
        const params = CalculationMethod.Karachi();
        params.madhab = Madhab.Hanafi;
        const times = new PrayerTimes(adhanCoords, new Date(), params);
        if (mounted) { setPrayerTimes(times); setLoading(false); }
      } catch (e) {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [urdu]);

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: pageBg }}><ActivityIndicator size="large" color="#1F5C3D" /><Text style={{ marginTop: 15, color: subColor }}>{urdu ? 'مقام معلوم ہو رہا ہے...' : 'Getting your location...'}</Text></View>;
  if (errorMsg) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: pageBg }}><Ionicons name="location" size={60} color="#1F5C3D" /><Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1F5C3D', marginTop: 10 }}>{urdu ? 'مقام کی خرابی' : 'Location Error'}</Text><Text style={{ color: subColor, textAlign: 'center', padding: 20 }}>{errorMsg}</Text></View>;

  const nextPrayer = getNextPrayer();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: pageBg }} showsVerticalScrollIndicator={false}>
      <View style={{ backgroundColor: dm ? '#0B2818' : '#1F5C3D', padding: 30, alignItems: 'center', paddingTop: 60, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden', position: 'relative' }}>
        {onBack && (
          <TouchableOpacity onPress={onBack} activeOpacity={0.75}
            style={{ position: 'absolute', top: 50, left: 16, zIndex: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
            <Ionicons name="arrow-back" size={18} color="#D4AF37" />
            <Text style={{ color: '#fff', fontSize: 12, marginLeft: 4, fontWeight: '600' }}>{urdu ? 'واپس' : 'Back'}</Text>
          </TouchableOpacity>
        )}
        <Text style={{ position: 'absolute', top: -20, left: -16, fontSize: 100, color: 'rgba(212,175,55,0.06)' }}>✦</Text>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(212,175,55,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
          <MaterialCommunityIcons name="mosque" size={28} color="#D4AF37" />
        </View>
        <Text style={{ color: '#fff', fontSize: 26, fontWeight: 'bold', marginTop: 6 }}>{urdu ? 'نماز کے اوقات' : 'Prayer Times'}</Text>
        <Text style={{ color: '#9DB8A0', fontSize: 13, marginTop: 4 }}>📍 {cityName || (urdu ? 'آپ کا مقام' : 'Your Location')}</Text>
      </View>

      {nextPrayer && (
        <View style={{ backgroundColor: dm ? '#16361f' : '#1F5C3D', margin: 16, marginTop: 18, borderRadius: 22, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(212,175,55,0.22)' }}>
          <Text style={{ color: '#9DB8A0', fontSize: 12, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>{urdu ? 'اگلی نماز' : 'Next Prayer'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <Ionicons name={nextPrayer.icon} size={26} color="#D4AF37" style={{ marginRight: 9 }} />
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>{nextPrayer.name}</Text>
          </View>
          <Text style={{ color: '#D4AF37', fontSize: 40, fontWeight: 'bold', marginTop: 6, letterSpacing: 0.5 }}>{formatTime(nextPrayer.time)}</Text>
          <View style={{ marginTop: 10, backgroundColor: 'rgba(212,175,55,0.12)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 6 }}>
            <Text style={{ color: '#D4AF37', fontSize: 13, fontWeight: '600' }}>{getTimeRemaining(nextPrayer.time)}</Text>
          </View>
        </View>
      )}

      <View style={{ backgroundColor: cardBg, marginHorizontal: 16, borderRadius: 20, padding: 6, borderWidth: 1, borderColor: borderColor, overflow: 'hidden' }}>
        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1F5C3D', letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10 }}>{urdu ? "آج کی نماز کے اوقات" : "Today's Schedule"}</Text>
        {prayerTimes && prayerNames.map((p, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 14, backgroundColor: i % 2 === 1 ? (dm ? 'rgba(255,255,255,0.02)' : 'rgba(31,92,61,0.025)') : 'transparent', borderTopWidth: i > 0 ? 1 : 0, borderTopColor: borderColor }}>
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: p.color + '18', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
              <Ionicons name={p.icon} size={19} color={p.color} />
            </View>
            <Text style={{ flex: 1, fontSize: 15, color: textColor, fontWeight: p.isSunrise ? '400' : '600' }}>{p.name}</Text>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: p.isSunrise ? subColor : '#1F5C3D' }}>{formatTime(prayerTimes[p.key])}</Text>
          </View>
        ))}
      </View>

      <View style={{ backgroundColor: cardBg, marginHorizontal: 16, marginTop: 16, marginBottom: 30, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: borderColor }}>
        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1F5C3D', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>📍 {urdu ? 'مقام کی معلومات' : 'Location Info'}</Text>
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: subColor, fontSize: 13 }}>{urdu ? 'عرض بلد' : 'Latitude'}</Text>
            <Text style={{ color: textColor, fontSize: 13, fontWeight: '600' }}>{location?.coords.latitude?.toFixed(4) || '--'}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: subColor, fontSize: 13 }}>{urdu ? 'طول بلد' : 'Longitude'}</Text>
            <Text style={{ color: textColor, fontSize: 13, fontWeight: '600' }}>{location?.coords.longitude?.toFixed(4) || '--'}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: subColor, fontSize: 13 }}>{urdu ? 'طریقہ' : 'Method'}</Text>
            <Text style={{ color: textColor, fontSize: 13, fontWeight: '600' }}>{urdu ? 'کراچی (HEC)' : 'Karachi (HEC)'}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SALAH TRACKER SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function SalahTrackerScreen({ urdu = false, darkMode = false }) {
  const dm = darkMode;
  const cardBg = dm ? '#1a1a1a' : '#fff';
  const pageBg = dm ? '#0a0a0a' : '#F5F2E8';
  const textColor = dm ? '#e0e0e0' : '#1a1a1a';
  const subColor = dm ? '#888' : '#666';
  const sectionBg = dm ? '#222' : '#f0f7f0';
  const borderColor = dm ? '#2a2a2a' : '#e8e8e8';

  const [tracker, setTracker] = useState({});
  const [viewDate, setViewDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const PRAYERS = [
    { key: 'fajr', nameEn: 'Fajr', nameUr: 'فجر', icon: 'moon', color: '#5c6bc0' },
    { key: 'dhuhr', nameEn: 'Dhuhr', nameUr: 'ظہر', icon: 'sunny', color: '#f4511e' },
    { key: 'asr', nameEn: 'Asr', nameUr: 'عصر', icon: 'partly-sunny', color: '#039be5' },
    { key: 'maghrib', nameEn: 'Maghrib', nameUr: 'مغرب', icon: 'cloudy-night', color: '#e91e63' },
    { key: 'isha', nameEn: 'Isha', nameUr: 'عشاء', icon: 'moon', color: '#3949ab' },
  ];

  const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  useEffect(() => {
    (async () => {
      try { const s = await AsyncStorage.getItem(SALAH_TRACKER_KEY); if (s) setTracker(JSON.parse(s)); } catch (e) {}
      setLoading(false);
    })();
  }, []);

  const save = async (nt) => { try { await AsyncStorage.setItem(SALAH_TRACKER_KEY, JSON.stringify(nt)); } catch (e) {} };

  const toggle = (pk) => {
    const k = dateKey(viewDate);
    const dd = tracker[k] || {};
    const u = { ...tracker, [k]: { ...dd, [pk]: !dd[pk] } };
    setTracker(u); save(u); Vibration.vibrate(20);
  };

  const todayKey = dateKey(viewDate);
  const dayData = tracker[todayKey] || {};
  const completed = PRAYERS.filter(p => dayData[p.key]).length;

  const getLast7 = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = dateKey(d); const data = tracker[k] || {};
      days.push({ date: d, key: k, count: PRAYERS.filter(p => data[p.key]).length });
    }
    return days;
  };

  const isToday = (d) => dateKey(d) === dateKey(new Date());
  const last7 = getLast7();

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: pageBg }}><ActivityIndicator size="large" color="#1F5C3D" /></View>;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: pageBg }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View style={{ backgroundColor: dm ? '#0B2818' : '#1F5C3D', padding: 30, alignItems: 'center', paddingTop: 60, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden' }}>
        <Text style={{ position: 'absolute', top: -18, right: -12, fontSize: 100, color: 'rgba(212,175,55,0.06)' }}>✦</Text>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(212,175,55,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
          <MaterialCommunityIcons name="mosque" size={28} color="#D4AF37" />
        </View>
        <Text style={{ color: '#D4AF37', fontSize: 12.5, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 6 }}>{urdu ? 'نماز کا ریکارڈ' : 'Salah Tracker'}</Text>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 3 }}>{urdu ? 'آج کی نمازیں' : "Today's Prayers"}</Text>
      </View>

      <View style={{ backgroundColor: dm ? '#16361f' : '#1F5C3D', margin: 16, marginTop: 18, borderRadius: 22, padding: 22, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(212,175,55,0.22)' }}>
        <Text style={{ color: '#9DB8A0', fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>{urdu ? 'آج کی پیشرفت' : "Today's Progress"}</Text>
        <Text style={{ color: '#D4AF37', fontSize: 50, fontWeight: 'bold', marginVertical: 6 }}>{completed}/5</Text>
        <View style={{ width: '100%', height: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden' }}>
          <View style={{ height: 8, backgroundColor: completed === 5 ? '#D4AF37' : '#9DB8A0', borderRadius: 4, width: `${(completed / 5) * 100}%` }} />
        </View>
        {completed === 5 && (
          <View style={{ backgroundColor: 'rgba(212,175,55,0.12)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14, marginTop: 12 }}>
            <Text style={{ color: '#D4AF37', fontSize: 13.5, fontWeight: 'bold' }}>{urdu ? '✅ ما شاء اللہ! پانچوں نمازیں ادا!' : '✅ Masha Allah! All prayers done!'}</Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 14 }}>
        <TouchableOpacity onPress={() => { const d = new Date(viewDate); d.setDate(d.getDate() - 1); setViewDate(d); }} activeOpacity={0.75} style={{ backgroundColor: cardBg, borderRadius: 13, padding: 11, borderWidth: 1, borderColor: borderColor }}>
          <Ionicons name="chevron-back" size={20} color="#1F5C3D" />
        </TouchableOpacity>
        <Text style={{ fontSize: 14.5, fontWeight: 'bold', color: textColor }}>{isToday(viewDate) ? (urdu ? '📅 آج' : '📅 Today') : viewDate.toLocaleDateString(urdu ? 'ur-PK' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
        <TouchableOpacity onPress={() => { const d = new Date(viewDate); d.setDate(d.getDate() + 1); if (d <= new Date()) setViewDate(d); }} activeOpacity={0.75} style={{ backgroundColor: cardBg, borderRadius: 13, padding: 11, borderWidth: 1, borderColor: borderColor }}>
          <Ionicons name="chevron-forward" size={20} color="#1F5C3D" />
        </TouchableOpacity>
      </View>

      <View style={{ backgroundColor: cardBg, marginHorizontal: 16, borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: borderColor }}>
        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1F5C3D', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 13 }}>{urdu ? 'نماز نشان لگائیں' : 'Mark Prayers'}</Text>
        {PRAYERS.map((p) => {
          const done = !!dayData[p.key];
          return (
            <TouchableOpacity key={p.key} onPress={() => toggle(p.key)} activeOpacity={0.75} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 13, borderRadius: 15, marginBottom: 8, backgroundColor: done ? '#1F5C3D' : sectionBg }}>
              <Ionicons name={p.icon} size={21} color={done ? '#D4AF37' : p.color} style={{ marginRight: 12 }} />
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: done ? '#fff' : textColor }}>{urdu ? p.nameUr : p.nameEn}</Text>
              <View style={{ width: 29, height: 29, borderRadius: 15, backgroundColor: done ? '#D4AF37' : (dm ? '#333' : '#e0e0e0'), justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name={done ? 'checkmark' : 'ellipse-outline'} size={17} color={done ? '#1F5C3D' : subColor} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ backgroundColor: cardBg, marginHorizontal: 16, marginTop: 16, marginBottom: 30, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: borderColor }}>
        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1F5C3D', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 13 }}>📊 {urdu ? 'پچھلے 7 دن' : 'Last 7 Days'}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {last7.map((day, i) => {
            const itd = isToday(day.date);
            const bgColor = day.count === 5 ? '#1F5C3D' : day.count >= 3 ? '#2d6a4f' : day.count >= 1 ? '#9DB8A0' : (dm ? '#333' : '#e8e8e8');
            const dn = day.date.toLocaleDateString(urdu ? 'ur-PK' : 'en-US', { weekday: 'short' });
            return (
              <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center', borderWidth: itd ? 2 : 0, borderColor: '#D4AF37' }}>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: day.count > 0 ? '#fff' : subColor }}>{day.count}</Text>
                </View>
                <Text style={{ fontSize: 9, color: subColor, marginTop: 4 }}>{dn}</Text>
              </View>
            );
          })}
        </View>
        <Text style={{ fontSize: 11, color: subColor, marginTop: 12, textAlign: 'center' }}>{urdu ? '🟢 گہرا = 5 | 🟡 ہلکا = کچھ | ⚪ خالی = کوئی نہیں' : '🟢 Dark = All 5 | Light = Partial | Grey = None'}</Text>
      </View>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// QIBLA SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function QiblaScreen({ urdu = false, darkMode = false, onBack }) {
  const [heading, setHeading] = useState(0);
  const [qiblaAngle, setQiblaAngle] = useState(null);
  const [location, setLocation] = useState(null);
  const [cityName, setCityName] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const dm = darkMode;
  const pageBg = dm ? '#0a0a0a' : '#F5F2E8';
  const cardBg = dm ? '#1a1a1a' : '#fff';
  const textColor = dm ? '#e0e0e0' : '#1a1a1a';
  const subColor = dm ? '#888' : '#666';
  const borderColor = dm ? '#2a2a2a' : '#e8e8e8';

  const calcQibla = (lat, lng) => {
    const dLng = (39.8262 - lng) * Math.PI / 180;
    const lat1 = lat * Math.PI / 180, lat2 = 21.4225 * Math.PI / 180;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  };

  useEffect(() => {
    let hs;
    (async () => {
      try {
        const { coords, isFallback } = await getSafeLocation();
        setLocation({ coords });
        try {
          const geo = await Location.reverseGeocodeAsync({ latitude: coords.latitude, longitude: coords.longitude });
          if (geo && geo[0]) setCityName(geo[0].city || geo[0].region || (isFallback ? DEFAULT_CITY : ''));
          else if (isFallback) setCityName(DEFAULT_CITY);
        } catch (e) {
          if (isFallback) setCityName(DEFAULT_CITY);
        }
        setQiblaAngle(calcQibla(coords.latitude, coords.longitude));
        if (Platform.OS !== 'web') {
          try {
            hs = await Location.watchHeadingAsync((d) => setHeading(d.magHeading));
          } catch (e) {}
        }
        setLoading(false);
      } catch (e) {
        setErrorMsg(urdu ? 'مقام معلوم نہیں ہو سکا۔' : 'Could not get location.');
        setLoading(false);
      }
    })();
    return () => { if (hs && typeof hs.remove === 'function') hs.remove(); };
  }, []);

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: pageBg }}>
      <ActivityIndicator size="large" color="#1F5C3D" />
      <Text style={{ marginTop: 15, color: subColor }}>{urdu ? 'مقام معلوم ہو رہا ہے...' : 'Getting your location...'}</Text>
    </View>
  );

  if (errorMsg) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: pageBg }}>
      <Ionicons name="compass" size={60} color="#1F5C3D" />
      <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1F5C3D', marginTop: 10 }}>{urdu ? 'خرابی' : 'Error'}</Text>
      <Text style={{ color: subColor, textAlign: 'center', padding: 20 }}>{errorMsg}</Text>
    </View>
  );

  const SIZE = 300, CENTER = SIZE / 2;
  const nr = qiblaAngle !== null ? qiblaAngle - heading : 0;

  // Clock-style tick marks — 60 total
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const angle = i * 6; // degrees
    const rad = (angle - 90) * Math.PI / 180;
    const isMajor = i % 5 === 0;
    const outerR = CENTER - 6;
    const innerR = isMajor ? CENTER - 22 : CENTER - 14;
    return {
      x1: CENTER + outerR * Math.cos(rad),
      y1: CENTER + outerR * Math.sin(rad),
      x2: CENTER + innerR * Math.cos(rad),
      y2: CENTER + innerR * Math.sin(rad),
      isMajor,
    };
  });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: pageBg }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={{ backgroundColor: dm ? '#0B2818' : '#1F5C3D', padding: 30, alignItems: 'center', paddingTop: 60, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden', position: 'relative' }}>
        {onBack && (
          <TouchableOpacity onPress={onBack} activeOpacity={0.75}
            style={{ position: 'absolute', top: 50, left: 16, zIndex: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
            <Ionicons name="arrow-back" size={18} color="#D4AF37" />
            <Text style={{ color: '#fff', fontSize: 12, marginLeft: 4, fontWeight: '600' }}>{urdu ? 'واپس' : 'Back'}</Text>
          </TouchableOpacity>
        )}
        <Text style={{ position: 'absolute', top: -18, right: -12, fontSize: 100, color: 'rgba(212,175,55,0.06)' }}>✦</Text>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(212,175,55,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
          <Ionicons name="compass" size={28} color="#D4AF37" />
        </View>
        <Text style={{ color: '#fff', fontSize: 26, fontWeight: 'bold', marginTop: 6 }}>
          {urdu ? 'قبلہ سمت' : 'Qibla Direction'}
        </Text>
        <Text style={{ color: '#9DB8A0', fontSize: 13, marginTop: 4 }}>📍 {cityName}</Text>
      </View>

      <View style={{ alignItems: 'center', paddingVertical: 28 }}>

        {/* Degree card */}
        <View style={{ backgroundColor: cardBg, borderRadius: 18, paddingHorizontal: 30, paddingVertical: 16, marginBottom: 28, alignItems: 'center', elevation: 3, borderWidth: 1, borderColor: borderColor }}>
          <Text style={{ fontSize: 12, color: subColor, marginBottom: 3, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {urdu ? 'قبلہ سمت' : 'Qibla Direction'}
          </Text>
          <Text style={{ fontSize: 27, fontWeight: 'bold', color: '#1F5C3D' }}>
            {(qiblaAngle !== null ? Math.round(qiblaAngle) : '--') + '° ' + (urdu ? 'شمال سے' : 'from North')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 5 }}>
            <Ionicons name="navigate" size={11} color={subColor} />
            <Text style={{ fontSize: 12, color: subColor }}>
              {(urdu ? 'کمپاس: ' : 'Compass: ') + Math.round(heading) + '°'}
            </Text>
          </View>
        </View>

        {/* Clock-style Compass */}
        <View style={{ width: SIZE, height: SIZE }}>

          {/* Outer ring */}
          <View style={{
            position: 'absolute', width: SIZE, height: SIZE,
            borderRadius: CENTER,
            backgroundColor: dm ? '#1a1a1a' : '#f0f0f0',
            borderWidth: 2, borderColor: dm ? '#333' : '#ccc',
          }} />

          {/* Tick marks drawn as thin Views */}
          {ticks.map((tick, i) => {
            const dx = tick.x2 - tick.x1;
            const dy = tick.y2 - tick.y1;
            const len = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
            const midX = (tick.x1 + tick.x2) / 2;
            const midY = (tick.y1 + tick.y2) / 2;
            return (
              <View key={i} style={{
                position: 'absolute',
                width: tick.isMajor ? 2.5 : 1.5,
                height: len,
                backgroundColor: tick.isMajor ? (dm ? '#9DB8A0' : '#1F5C3D') : (dm ? '#444' : '#bbb'),
                left: midX - (tick.isMajor ? 1.25 : 0.75),
                top: midY - len / 2,
                transform: [{ rotate: angle + 'deg' }],
              }} />
            );
          })}

          {/* Inner white circle */}
          <View style={{
            position: 'absolute',
            width: SIZE - 44, height: SIZE - 44,
            borderRadius: (SIZE - 44) / 2,
            backgroundColor: dm ? '#111' : '#fff',
            left: 22, top: 22,
            borderWidth: 1, borderColor: dm ? '#222' : '#e8e8e8',
          }} />

          {/* N S E W */}
          <View style={{ position: 'absolute', top: 26, left: 0, right: 0, alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#e74c3c' }}>N</Text>
          </View>
          <View style={{ position: 'absolute', bottom: 26, left: 0, right: 0, alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1F5C3D' }}>S</Text>
          </View>
          <View style={{ position: 'absolute', right: 26, top: 0, bottom: 0, justifyContent: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1F5C3D' }}>E</Text>
          </View>
          <View style={{ position: 'absolute', left: 26, top: 0, bottom: 0, justifyContent: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1F5C3D' }}>W</Text>
          </View>

          {/* Needle — rotates with heading */}
          <View style={{
            position: 'absolute', width: SIZE, height: SIZE,
            justifyContent: 'center', alignItems: 'center',
            transform: [{ rotate: nr + 'deg' }],
          }}>
            {/* Green (Qibla) needle */}
            <View style={{
              width: 6, height: CENTER - 52,
              backgroundColor: '#1F5C3D',
              borderTopLeftRadius: 3, borderTopRightRadius: 3,
            }} />
            {/* Red (opposite) needle */}
            <View style={{
              width: 6, height: CENTER - 52,
              backgroundColor: '#e74c3c',
              borderBottomLeftRadius: 3, borderBottomRightRadius: 3,
            }} />
          </View>

          {/* Kaaba emoji on needle tip */}
          <View style={{
            position: 'absolute', width: SIZE, height: SIZE,
            justifyContent: 'center', alignItems: 'center',
            transform: [{ rotate: nr + 'deg' }],
          }}>
            <Text style={{ position: 'absolute', top: 24, fontSize: 20 }}>🕋</Text>
          </View>

          {/* Center dot */}
          <View style={{
            position: 'absolute',
            left: CENTER - 11, top: CENTER - 11,
            width: 22, height: 22, borderRadius: 11,
            backgroundColor: '#1F5C3D',
            borderWidth: 3, borderColor: '#fff',
            elevation: 5,
          }} />
        </View>

        <Text style={{ marginTop: 20, fontSize: 13, color: subColor, textAlign: 'center', paddingHorizontal: 30, lineHeight: 20 }}>
          {urdu ? 'فون کو گھمائیں جب تک 🕋 اوپر نہ آئے — وہی قبلہ کی سمت ہے' : 'Rotate your phone until 🕋 points up — that is the Qibla direction'}
        </Text>

        {/* Location info card */}
        <View style={{ backgroundColor: cardBg, marginHorizontal: 15, marginTop: 22, borderRadius: 18, padding: 18, width: SIZE + 20, borderWidth: 1, borderColor: borderColor }}>
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1F5C3D', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>
            📍 {urdu ? 'آپ کا مقام' : 'Your Location'}
          </Text>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: subColor, fontSize: 13 }}>{urdu ? 'شہر' : 'City'}</Text>
              <Text style={{ color: textColor, fontSize: 13, fontWeight: '600' }}>{cityName || '--'}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: subColor, fontSize: 13 }}>{urdu ? 'عرض بلد' : 'Latitude'}</Text>
              <Text style={{ color: textColor, fontSize: 13, fontWeight: '600' }}>{location?.coords.latitude?.toFixed(4) || '--'}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: subColor, fontSize: 13 }}>{urdu ? 'طول بلد' : 'Longitude'}</Text>
              <Text style={{ color: textColor, fontSize: 13, fontWeight: '600' }}>{location?.coords.longitude?.toFixed(4) || '--'}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: subColor, fontSize: 13 }}>{urdu ? 'قبلہ' : 'Qibla'}</Text>
              <Text style={{ color: '#1F5C3D', fontSize: 13, fontWeight: 'bold' }}>{(qiblaAngle !== null ? Math.round(qiblaAngle) : '--') + '° ' + (urdu ? 'شمال سے' : 'from North')}</Text>
            </View>
          </View>
        </View>

      </View>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════════
// MASJID FINDER SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function MasjidFinderScreen({ urdu, darkMode, onBack }) {
  const dm = darkMode;
  const pageBg = dm ? '#0a0a0a' : '#F5F2E8';
  const cardBg = dm ? '#1a1a1a' : '#fff';
  const textColor = dm ? '#e0e0e0' : '#1a1a1a';
  const subColor = dm ? '#888' : '#666';
  const borderColor = dm ? '#2a2a2a' : '#e8e8e8';

  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState('');
  const [opened, setOpened] = useState(false);

  const findMasjids = async () => {
    setLoading(true); setError(''); setOpened(false);
    try {
      const { coords } = await getSafeLocation();
      setLocation(coords);
      const { latitude, longitude } = coords;
      const url = `https://www.google.com/maps/search/mosque+near+me/@${latitude},${longitude},15z`;
      const supported = await Linking.canOpenURL(url);
      if (supported) { await Linking.openURL(url); setOpened(true); }
      else {
        const webUrl = `https://www.google.com/maps/search/mosque/@${latitude},${longitude},15z`;
        await Linking.openURL(webUrl);
        setOpened(true);
      }
    } catch (e) { setError(urdu ? 'لوکیشن نہیں مل سکی۔ دوبارہ کوشش کریں۔' : 'Could not get location. Try again.'); }
    setLoading(false);
  };

  const NEARBY_TIPS = [
    { icon: 'search', titleEn: 'Real-time Search', titleUr: 'ریئل ٹائم تلاش', descEn: 'Opens Google Maps showing all mosques near your current location.', descUr: 'گوگل میپس کھلتا ہے جہاں آپ کے قریب تمام مساجد دکھاتا ہے۔' },
    { icon: 'navigate', titleEn: 'Get Directions', titleUr: 'راستہ دیکھیں', descEn: 'Tap any mosque in Google Maps to get walking or driving directions.', descUr: 'گوگل میپس میں کسی بھی مسجد پر ٹیپ کریں، پیدل یا گاڑی کا راستہ ملے گا۔' },
    { icon: 'time', titleEn: 'Prayer Times', titleUr: 'نماز اوقات', descEn: "Many mosques show their Jumu'ah and prayer timings on Google Maps.", descUr: 'بہت سی مساجد گوگل میپس پر جمعہ اور نماز کے اوقات دکھاتی ہیں۔' },
    { icon: 'star', titleEn: 'Save Favourites', titleUr: 'پسندیدہ محفوظ کریں', descEn: 'Save your local masjid in Google Maps for quick access anytime.', descUr: 'اپنی مقامی مسجد کو گوگل میپس میں محفوظ کریں۔' },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: pageBg }} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={{ backgroundColor: dm ? '#0B2818' : '#1F5C3D', paddingTop: 60, paddingBottom: 32, paddingHorizontal: 20, alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden', position: 'relative' }}>
        {onBack && (
          <TouchableOpacity onPress={onBack} activeOpacity={0.75}
            style={{ position: 'absolute', top: 50, left: 16, zIndex: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
            <Ionicons name="arrow-back" size={18} color="#D4AF37" />
            <Text style={{ color: '#fff', fontSize: 12, marginLeft: 4, fontWeight: '600' }}>{urdu ? 'واپس' : 'Back'}</Text>
          </TouchableOpacity>
        )}
        <Text style={{ position: 'absolute', top: -18, left: -14, fontSize: 100, color: 'rgba(212,175,55,0.06)' }}>✦</Text>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(212,175,55,0.13)', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
          <MaterialCommunityIcons name="mosque" size={32} color="#D4AF37" />
        </View>
        <Text style={{ color: '#fff', fontSize: 25, fontWeight: 'bold', marginTop: 4 }}>{urdu ? 'قریبی مساجد' : 'Masjid Finder'}</Text>
        <Text style={{ color: '#9DB8A0', fontSize: 12.5, marginTop: 4, textAlign: 'center' }}>
          {urdu ? 'اپنے قریبی مساجد تلاش کریں' : 'Find mosques near your location'}
        </Text>
      </View>

      <View style={{ padding: 18 }}>
        {/* Main find button */}
        <TouchableOpacity onPress={findMasjids} disabled={loading} activeOpacity={0.85}
          style={{ backgroundColor: loading ? '#aaa' : '#1F5C3D', borderRadius: 18, padding: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10, elevation: 4, marginBottom: 18 }}>
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Ionicons name="navigate" size={21} color="#D4AF37" />}
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
            {loading ? (urdu ? 'لوکیشن مل رہی ہے...' : 'Getting location...') : (urdu ? 'قریبی مساجد دیکھیں' : 'Find Nearby Mosques')}
          </Text>
        </TouchableOpacity>

        {/* Error */}
        {error ? (
          <View style={{ backgroundColor: dm ? '#3a1a1a' : '#ffebee', borderRadius: 15, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: dm ? '#5a2a2a' : '#ffcdd2', flexDirection: 'row', alignItems: 'center', gap: 9 }}>
            <Ionicons name="alert-circle" size={18} color={dm ? '#ff8a80' : '#c62828'} />
            <Text style={{ color: dm ? '#ff8a80' : '#c62828', fontSize: 13, flex: 1 }}>{error}</Text>
          </View>
        ) : null}

        {/* Success */}
        {opened && (
          <View style={{ backgroundColor: dm ? '#0B2818' : '#e8f5e9', borderRadius: 15, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#a5d6a7', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="checkmark-circle" size={21} color="#2e7d32" />
            <Text style={{ color: dm ? '#9DB8A0' : '#2e7d32', flex: 1, fontSize: 12.5 }}>
              {urdu ? 'گوگل میپس کھل گیا! قریبی مساجد دیکھیں۔' : 'Google Maps opened! Browse nearby mosques.'}
            </Text>
          </View>
        )}

        {/* Location info */}
        {location && (
          <View style={{ backgroundColor: cardBg, borderRadius: 15, padding: 14, marginBottom: 16, borderWidth: 1, borderColor, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="location" size={17} color="#1F5C3D" />
            <Text style={{ color: subColor, fontSize: 11.5 }}>
              {urdu ? 'آپ کی لوکیشن: ' : 'Your location: '}
              <Text style={{ color: textColor, fontWeight: '600' }}>
                {location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E
              </Text>
            </Text>
          </View>
        )}

        {/* Tips */}
        <Text style={{ color: subColor, fontSize: 11, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 12 }}>
          {urdu ? 'استعمال کا طریقہ' : 'HOW IT WORKS'}
        </Text>
        {NEARBY_TIPS.map((tip, i) => (
          <View key={i} style={{ backgroundColor: cardBg, borderRadius: 17, padding: 15, marginBottom: 9, flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderColor, gap: 13 }}>
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#1F5C3D' + '17', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name={tip.icon} size={18} color="#1F5C3D" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: textColor, fontWeight: '600', fontSize: 13.5 }}>{urdu ? tip.titleUr : tip.titleEn}</Text>
              <Text style={{ color: subColor, fontSize: 11.5, marginTop: 4, lineHeight: 17 }}>{urdu ? tip.descUr : tip.descEn}</Text>
            </View>
          </View>
        ))}

        {/* Dua for entering masjid */}
        <View style={{ backgroundColor: dm ? '#0B2818' : '#1F5C3D', borderRadius: 19, padding: 20, marginTop: 9, borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)' }}>
          <Text style={{ color: '#D4AF37', fontSize: 12, fontWeight: '700', marginBottom: 11 }}>🕌 {urdu ? 'مسجد میں داخلے کی دعا' : 'Dua for Entering Masjid'}</Text>
          <Text style={{ color: '#D4AF37', fontSize: 17.5, textAlign: 'right', lineHeight: 30, marginBottom: 9 }}>
            اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ
          </Text>
          <Text style={{ color: '#9DB8A0', fontSize: 12.5, fontStyle: 'italic' }}>
            {urdu ? 'اے اللہ، میرے لیے اپنی رحمت کے دروازے کھول دے۔' : 'O Allah, open the gates of Your mercy for me.'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MUSLIM NAMES SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
const MUSLIM_NAMES = {
  boys: [
    { arabic: 'مُحَمَّد', name: 'Muhammad', nameUr: 'محمد', meaning: 'The praised one', meaningUr: 'تعریف کیا گیا', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'أَحْمَد', name: 'Ahmad', nameUr: 'احمد', meaning: 'Most praiseworthy', meaningUr: 'سب سے زیادہ قابلِ تعریف', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'عَبْدُاللّٰه', name: 'Abdullah', nameUr: 'عبداللہ', meaning: 'Servant of Allah', meaningUr: 'اللہ کا بندہ', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'عَلِيّ', name: 'Ali', nameUr: 'علی', meaning: 'Exalted, noble', meaningUr: 'بلند، شریف', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'عُمَر', name: 'Umar', nameUr: 'عمر', meaning: 'Life, long-lived', meaningUr: 'زندگی، طویل عمر', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'عُثْمَان', name: 'Uthman', nameUr: 'عثمان', meaning: 'Baby bustard (symbol of nobility)', meaningUr: 'شرافت کی علامت', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'إِبْرَاهِيم', name: 'Ibrahim', nameUr: 'ابراہیم', meaning: 'Father of many nations', meaningUr: 'بہت سی قوموں کا باپ', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'إِسْمَاعِيل', name: 'Ismail', nameUr: 'اسماعیل', meaning: 'Allah has heard', meaningUr: 'اللہ نے سن لیا', origin: 'Hebrew/Arabic', originUr: 'عبرانی/عربی' },
    { arabic: 'يُوسُف', name: 'Yusuf', nameUr: 'یوسف', meaning: 'Allah increases', meaningUr: 'اللہ بڑھاتا ہے', origin: 'Hebrew/Arabic', originUr: 'عبرانی/عربی' },
    { arabic: 'يَحْيٰى', name: 'Yahya', nameUr: 'یحییٰ', meaning: 'He lives, Allah is gracious', meaningUr: 'وہ جیتا ہے', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'دَاوُد', name: 'Dawud', nameUr: 'داؤد', meaning: 'Beloved', meaningUr: 'محبوب', origin: 'Hebrew/Arabic', originUr: 'عبرانی/عربی' },
    { arabic: 'سُلَيْمَان', name: 'Sulaiman', nameUr: 'سلیمان', meaning: 'Man of peace', meaningUr: 'امن کا آدمی', origin: 'Hebrew/Arabic', originUr: 'عبرانی/عربی' },
    { arabic: 'مُوسٰى', name: 'Musa', nameUr: 'موسیٰ', meaning: 'Drawn from water', meaningUr: 'پانی سے نکالا گیا', origin: 'Egyptian/Arabic', originUr: 'مصری/عربی' },
    { arabic: 'هَارُون', name: 'Haroon', nameUr: 'ہارون', meaning: 'Warrior, mountaineer', meaningUr: 'جنگجو', origin: 'Hebrew/Arabic', originUr: 'عبرانی/عربی' },
    { arabic: 'حَسَن', name: 'Hassan', nameUr: 'حسن', meaning: 'Handsome, good', meaningUr: 'خوبصورت، اچھا', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'حُسَيْن', name: 'Hussain', nameUr: 'حسین', meaning: 'Good, handsome (diminutive)', meaningUr: 'خوبصورت', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'زَيْد', name: 'Zaid', nameUr: 'زید', meaning: 'Growth, abundance', meaningUr: 'ترقی، فراوانی', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'بِلَال', name: 'Bilal', nameUr: 'بلال', meaning: 'Moisture, freshness', meaningUr: 'تازگی، نمی', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'سَلْمَان', name: 'Salman', nameUr: 'سلمان', meaning: 'Safe, peaceful', meaningUr: 'محفوظ، پرامن', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'طَاهِر', name: 'Tahir', nameUr: 'طاہر', meaning: 'Pure, chaste', meaningUr: 'پاک، پاکیزہ', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'نُوح', name: 'Nuh', nameUr: 'نوح', meaning: 'Rest, comfort', meaningUr: 'آرام، سکون', origin: 'Hebrew/Arabic', originUr: 'عبرانی/عربی' },
    { arabic: 'إِدْرِيس', name: 'Idrees', nameUr: 'ادریس', meaning: 'Studious, learned', meaningUr: 'عالم، پڑھا لکھا', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'عِيسٰى', name: 'Isa', nameUr: 'عیسیٰ', meaning: 'Allah saves', meaningUr: 'اللہ بچاتا ہے', origin: 'Aramaic/Arabic', originUr: 'آرامی/عربی' },
    { arabic: 'أَيُّوب', name: 'Ayub', nameUr: 'ایوب', meaning: 'Patient, returning to Allah', meaningUr: 'صابر، اللہ کی طرف لوٹنے والا', origin: 'Hebrew/Arabic', originUr: 'عبرانی/عربی' },
    { arabic: 'أَنَس', name: 'Anas', nameUr: 'انس', meaning: 'Affection, friendliness', meaningUr: 'محبت، دوستی', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'فَارُوق', name: 'Farooq', nameUr: 'فاروق', meaning: 'One who distinguishes truth from falsehood', meaningUr: 'حق اور باطل میں فرق کرنے والا', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'خَالِد', name: 'Khalid', nameUr: 'خالد', meaning: 'Eternal, immortal', meaningUr: 'ابدی، امر', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'طَلْحَة', name: 'Talha', nameUr: 'طلحہ', meaning: 'Kind of tree (generous)', meaningUr: 'سخاوت کی علامت', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'سَعْد', name: 'Saad', nameUr: 'سعد', meaning: 'Happiness, good luck', meaningUr: 'خوشی، خوش قسمتی', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'حَمْزَة', name: 'Hamza', nameUr: 'حمزہ', meaning: 'Lion, strong', meaningUr: 'شیر، طاقتور', origin: 'Arabic', originUr: 'عربی' },
  ],
  girls: [
    { arabic: 'فَاطِمَة', name: 'Fatima', nameUr: 'فاطمہ', meaning: 'One who weans, abstains', meaningUr: 'دودھ چھڑانے والی، پرہیزگار', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'عَائِشَة', name: 'Aisha', nameUr: 'عائشہ', meaning: 'Living, prosperous', meaningUr: 'جیتی جاگتی، خوشحال', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'خَدِيجَة', name: 'Khadija', nameUr: 'خدیجہ', meaning: 'Early baby, trustworthy', meaningUr: 'قابلِ اعتماد', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'مَرْيَم', name: 'Maryam', nameUr: 'مریم', meaning: 'Beloved, sea of bitterness (purity)', meaningUr: 'پاکیزگی کی مثال', origin: 'Hebrew/Arabic', originUr: 'عبرانی/عربی' },
    { arabic: 'زَيْنَب', name: 'Zainab', nameUr: 'زینب', meaning: 'Fragrant flower, ornament', meaningUr: 'خوشبودار پھول، زیور', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'رُقَيَّة', name: 'Ruqayyah', nameUr: 'رقیہ', meaning: 'Gentle, ascending', meaningUr: 'نرم، بلند ہونے والی', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'أُمّ كُلْثُوم', name: 'Umm Kulthum', nameUr: 'ام کلثوم', meaning: 'Mother of Kulthum (dignified)', meaningUr: 'باوقار', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'أَسْمَاء', name: 'Asma', nameUr: 'اسماء', meaning: 'Lofty, prestigious', meaningUr: 'بلند مرتبہ', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'حَفْصَة', name: 'Hafsa', nameUr: 'حفصہ', meaning: 'Cub, young lioness', meaningUr: 'شیرنی کا بچہ', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'سُمَيَّة', name: 'Sumayyah', nameUr: 'سمیہ', meaning: 'High, elevated', meaningUr: 'بلند، اونچی', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'نُورُ', name: 'Noor', nameUr: 'نور', meaning: 'Light, divine light', meaningUr: 'روشنی، نورِ الٰہی', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'سَارَة', name: 'Sara', nameUr: 'سارہ', meaning: 'Pure, happy', meaningUr: 'پاک، خوش', origin: 'Hebrew/Arabic', originUr: 'عبرانی/عربی' },
    { arabic: 'هَاجَر', name: 'Hajar', nameUr: 'ہاجرہ', meaning: 'Emigrant, to flee', meaningUr: 'ہجرت کرنے والی', origin: 'Egyptian/Arabic', originUr: 'مصری/عربی' },
    { arabic: 'إِيمَان', name: 'Iman', nameUr: 'ایمان', meaning: 'Faith, belief', meaningUr: 'ایمان، یقین', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'يَسْمِين', name: 'Yasmin', nameUr: 'یاسمین', meaning: 'Jasmine flower', meaningUr: 'چمیلی کا پھول', origin: 'Persian/Arabic', originUr: 'فارسی/عربی' },
    { arabic: 'لَيْلٰى', name: 'Layla', nameUr: 'لیلیٰ', meaning: 'Night, dark beauty', meaningUr: 'رات، تاریک خوبصورتی', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'أَمِيرَة', name: 'Amira', nameUr: 'امیرہ', meaning: 'Princess, leader', meaningUr: 'شہزادی، قائد', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'رَحْمَة', name: 'Rahma', nameUr: 'رحمہ', meaning: 'Mercy, compassion', meaningUr: 'رحمت، مہربانی', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'صَفِيَّة', name: 'Safiyyah', nameUr: 'صفیہ', meaning: 'Pure, serene', meaningUr: 'پاک، پرسکون', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'جُوَيْرِيَة', name: 'Juwairiyah', nameUr: 'جویریہ', meaning: 'Little girl', meaningUr: 'چھوٹی بچی', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'مَيْمُونَة', name: 'Maymunah', nameUr: 'میمونہ', meaning: 'Blessed, auspicious', meaningUr: 'بابرکت', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'دُرَّة', name: 'Durrah', nameUr: 'درہ', meaning: 'Pearl', meaningUr: 'موتی', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'نَدٰى', name: 'Nada', nameUr: 'ندیٰ', meaning: 'Dew, generosity', meaningUr: 'اوس، سخاوت', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'هِنْد', name: 'Hind', nameUr: 'ہند', meaning: 'A large group of camels (noble)', meaningUr: 'شرافت کی علامت', origin: 'Arabic', originUr: 'عربی' },
    { arabic: 'رَيْحَانَة', name: 'Raihanah', nameUr: 'ریحانہ', meaning: 'Sweet basil, fragrant plant', meaningUr: 'خوشبودار پودا', origin: 'Arabic', originUr: 'عربی' },
  ],
};

function MuslimNamesScreen({ urdu, darkMode, onBack }) {
  const dm = darkMode;
  const pageBg = dm ? '#0a0a0a' : '#F5F2E8';
  const cardBg = dm ? '#1a1a1a' : '#fff';
  const textColor = dm ? '#e0e0e0' : '#1a1a1a';
  const subColor = dm ? '#888' : '#666';
  const borderColor = dm ? '#2a2a2a' : '#e8e8e8';

  const [gender, setGender] = useState('boys');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const list = MUSLIM_NAMES[gender].filter(n =>
    n.name.toLowerCase().includes(search.toLowerCase()) ||
    n.meaning.toLowerCase().includes(search.toLowerCase()) ||
    n.meaningUr.includes(search) ||
    n.arabic.includes(search) ||
    (n.nameUr && n.nameUr.includes(search))
  );

  if (selected) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: pageBg }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: dm ? '#0B2818' : '#1F5C3D', paddingTop: 55, paddingBottom: 26, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}>
          <TouchableOpacity onPress={() => setSelected(null)} activeOpacity={0.75} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
            <Ionicons name="arrow-back" size={21} color="#fff" />
            <Text style={{ color: '#fff', marginLeft: 8, fontSize: 14.5 }}>{urdu ? 'واپس جائیں' : 'Back'}</Text>
          </TouchableOpacity>
          <Text style={{ color: '#D4AF37', fontSize: 40, textAlign: 'center', fontWeight: '300', marginBottom: 5 }}>{selected.arabic}</Text>
          <Text style={{ color: '#fff', fontSize: 26, fontWeight: 'bold', textAlign: 'center' }}>{urdu ? selected.nameUr : selected.name}</Text>
          {urdu && <Text style={{ color: '#9DB8A0', fontSize: 13.5, textAlign: 'center', marginTop: 3 }}>{selected.name}</Text>}
        </View>
        <View style={{ margin: 18 }}>
          <View style={{ backgroundColor: cardBg, borderRadius: 20, padding: 21, borderWidth: 1, borderColor }}>
            <View style={{ marginBottom: 17 }}>
              <Text style={{ color: subColor, fontSize: 10.5, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 6 }}>{urdu ? 'معنی' : 'MEANING'}</Text>
              <Text style={{ color: textColor, fontSize: 16.5, fontWeight: '500' }}>{urdu ? selected.meaningUr : selected.meaning}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: borderColor, marginBottom: 17 }} />
            <View style={{ marginBottom: 17 }}>
              <Text style={{ color: subColor, fontSize: 10.5, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 6 }}>{urdu ? 'عربی' : 'ARABIC'}</Text>
              <Text style={{ color: '#1F5C3D', fontSize: 25, fontWeight: '600' }}>{selected.arabic}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: borderColor, marginBottom: 17 }} />
            <View>
              <Text style={{ color: subColor, fontSize: 10.5, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 6 }}>{urdu ? 'ماخذ' : 'ORIGIN'}</Text>
              <Text style={{ color: textColor, fontSize: 14.5 }}>{urdu ? selected.originUr : selected.origin}</Text>
            </View>
          </View>
          <View style={{ backgroundColor: dm ? '#0B2818' : '#e8f5e9', borderRadius: 17, padding: 16, marginTop: 13, borderWidth: 1, borderColor: '#a5d6a7' }}>
            <Text style={{ color: dm ? '#9DB8A0' : '#2e7d32', fontSize: 12.5, lineHeight: 19 }}>
              {urdu
                ? '💡 اسلام میں نام رکھنا سنت ہے۔ نبی ﷺ نے فرمایا: "قیامت کے دن تم اپنے ناموں اور اپنے باپوں کے ناموں سے پکارے جاؤ گے، اس لیے اچھے نام رکھو۔" (ابوداود)'
                : "💡 The Prophet ﷺ said: \"On the Day of Resurrection, you will be called by your names and your fathers' names, so give yourselves good names.\" (Abu Dawud)"}
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: pageBg }}>
      <View style={{ backgroundColor: dm ? '#0B2818' : '#1F5C3D', paddingTop: 55, paddingBottom: 22, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden', position: 'relative' }}>
        {onBack && (
          <TouchableOpacity onPress={onBack} activeOpacity={0.75}
            style={{ position: 'absolute', top: 50, left: 16, zIndex: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
            <Ionicons name="arrow-back" size={18} color="#D4AF37" />
            <Text style={{ color: '#fff', fontSize: 12, marginLeft: 4, fontWeight: '600' }}>{urdu ? 'واپس' : 'Back'}</Text>
          </TouchableOpacity>
        )}
        <Text style={{ position: 'absolute', top: -18, right: -12, fontSize: 90, color: 'rgba(212,175,55,0.06)' }}>✦</Text>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 4 }}>{urdu ? 'مسلم نام' : 'Muslim Names'}</Text>
        <Text style={{ color: '#9DB8A0', fontSize: 12.5, marginBottom: 16 }}>{urdu ? `${MUSLIM_NAMES[gender].length} نام معانی کے ساتھ` : `${MUSLIM_NAMES[gender].length} names with meanings`}</Text>
        {/* Gender tabs */}
        <View style={{ flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 13, padding: 3, marginBottom: 13 }}>
          {[['boys', urdu ? 'لڑکے' : 'Boys', 'man'], ['girls', urdu ? 'لڑکیاں' : 'Girls', 'woman']].map(([g, label, icon]) => (
            <TouchableOpacity key={g} onPress={() => { setGender(g); setSearch(''); setSelected(null); }} activeOpacity={0.8}
              style={{ flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, backgroundColor: gender === g ? 'rgba(212,175,55,0.18)' : 'transparent' }}>
              <Ionicons name={icon} size={15} color={gender === g ? '#D4AF37' : '#9DB8A0'} />
              <Text style={{ color: gender === g ? '#D4AF37' : '#9DB8A0', fontWeight: gender === g ? 'bold' : '500', fontSize: 13.5 }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 13, paddingHorizontal: 13, paddingVertical: 9 }}>
          <Ionicons name="search" size={15} color="#9DB8A0" style={{ marginRight: 8 }} />
          <TextInput
            value={search} onChangeText={setSearch}
            placeholder={urdu ? 'نام یا معنی تلاش کریں...' : 'Search name or meaning...'}
            placeholderTextColor="#9DB8A0"
            style={{ flex: 1, color: '#fff', fontSize: 13.5 }}
          />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={15} color="#9DB8A0" /></TouchableOpacity> : null}
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 13 }} showsVerticalScrollIndicator={false}>
        {list.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Ionicons name="search" size={38} color={subColor} />
            <Text style={{ color: subColor, marginTop: 10, fontSize: 13.5 }}>{urdu ? 'کوئی نام نہیں ملا' : 'No names found'}</Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {list.map((n, i) => (
              <TouchableOpacity key={i} onPress={() => setSelected(n)} activeOpacity={0.8}
                style={{ width: '47%', backgroundColor: cardBg, borderRadius: 17, padding: 14, borderWidth: 1, borderColor, elevation: 1 }}>
                <Text style={{ color: '#1F5C3D', fontSize: 19, fontWeight: '500', textAlign: 'right', marginBottom: 5 }}>{n.arabic}</Text>
                <Text style={{ color: textColor, fontSize: 14.5, fontWeight: 'bold' }}>{urdu ? n.nameUr : n.name}</Text>
                <Text style={{ color: subColor, fontSize: 10.5, marginTop: 3 }} numberOfLines={2}>{urdu ? n.meaningUr : n.meaning}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HAJJ & UMRAH GUIDE SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
const HAJJ_DATA = {
  umrah: [
    {
      step: 1, icon: '✈️',
      titleEn: 'Ihram — State of Purity',
      titleUr: 'احرام — پاکیزگی کی حالت',
      en: 'Before reaching the Miqat (boundary), perform Ghusl (full bath), wear two white seamless sheets for men (or modest clothing for women). Make intention (Niyyah) for Umrah and recite Talbiyah:\n\n"Labbayk Allahumma Umrah"\n\nThen recite: لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ\n\n⚠️ Avoid: cutting hair/nails, using perfume, hunting, arguing, marital relations.',
      ur: 'میقات پہنچنے سے پہلے غسل کریں، مردوں کے لیے دو سفید بغیر سلی چادریں، خواتین کے لیے شرعی لباس۔ عمرہ کی نیت کریں اور تلبیہ پڑھیں:\n\n"لبیک اللہم عمرۃ"\n\nپھر تلبیہ: لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ\n\n⚠️ ممنوع: بال/ناخن کاٹنا، خوشبو لگانا، شکار، لڑائی، ازدواجی تعلق۔',
    },
    {
      step: 2, icon: '🕋',
      titleEn: 'Tawaf — Circling the Kaaba',
      titleUr: 'طواف — کعبہ کا چکر',
      en: 'Upon entering Masjid al-Haram, say: "Allahu Akbar" and begin Tawaf from Hajar al-Aswad (Black Stone), keeping the Kaaba on your left.\n\nComplete 7 rounds (counter-clockwise). Men should do Raml (brisk walking) in the first 3 rounds.\n\nDua at Rukn Yamani: "Rabbana atina fid-dunya hasanah wa fil-akhirati hasanah wa qina adhab an-nar"\n\nAfter Tawaf, pray 2 Rakah behind Maqam Ibrahim.',
      ur: 'مسجد الحرام میں داخل ہوتے وقت "اللہ اکبر" کہیں اور حجرِ اسود سے طواف شروع کریں، کعبہ کو بائیں جانب رکھیں۔\n\n7 چکر لگائیں (گھڑی کے مخالف)۔ مردوں کو پہلے 3 چکروں میں رَمَل (تیز چلنا) کرنا چاہیے۔\n\nرکنِ یمانی پر دعا: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ"\n\nطواف کے بعد مقامِ ابراہیم کے پیچھے 2 رکعت نماز پڑھیں۔',
    },
    {
      step: 3, icon: '💧',
      titleEn: 'Zamzam Water',
      titleUr: 'زمزم کا پانی',
      en: 'After the 2 Rakah prayer, go to the Zamzam well and drink Zamzam water while facing the Kaaba, making dua. The Prophet ﷺ said: "Zamzam water is for whatever it is drunk for." (Ibn Majah)\n\nDrink while standing, in 3 breaths, saying Bismillah before drinking and Alhamdulillah after.',
      ur: '2 رکعت نماز کے بعد زمزم کے پاس جائیں اور کعبہ کی طرف منہ کر کے دعا مانگتے ہوئے زمزم پئیں۔ نبی ﷺ نے فرمایا: "زمزم کا پانی جس نیت سے پیا جائے، اسی کے لیے ہے۔" (ابن ماجہ)\n\nکھڑے ہو کر، تین سانس میں پئیں، پہلے بسم اللہ، بعد میں الحمدللہ۔',
    },
    {
      step: 4, icon: '🏃',
      titleEn: "Sa'i — Between Safa & Marwa",
      titleUr: 'سعی — صفا اور مروہ کے درمیان',
      en: "Walk 7 times between the hills of Safa and Marwa (starting from Safa, ending at Marwa). This commemorates Hajar's search for water for her son Ismail ﷺ.\n\nAt Safa, face the Kaaba and say:\n\"Inna as-Safa wal-Marwata min sha'a'irillah\"\n\nMen should jog between the green lights (Milain al-Akhdarain).",
      ur: 'صفا اور مروہ کے درمیان 7 بار چلیں (صفا سے شروع، مروہ پر ختم)۔ یہ حاجرہ کی اپنے بیٹے اسماعیل ﷺ کے لیے پانی کی تلاش کی یاد دلاتا ہے۔\n\nصفا پر کعبہ کی طرف منہ کر کے کہیں:\n"إِنَّ الصَّفَا وَالْمَرْوَةَ مِن شَعَائِرِ اللَّهِ"\n\nمردوں کو سبز بتیوں کے درمیان (میلین الاخضرین) دوڑنا چاہیے۔',
    },
    {
      step: 5, icon: '✂️',
      titleEn: "Halq or Taqsir — Hair Cutting",
      titleUr: 'حلق یا تقصیر — بال کاٹنا',
      en: "After completing Sa'i, men should shave their heads (Halq) or cut hair equally from all sides (Taqsir). Women should cut a fingertip's length from their hair.\n\nThis marks the end of Umrah. You may now leave the state of Ihram.\n\nNote: Halq (shaving) is more virtuous than Taqsir (trimming), as the Prophet ﷺ made dua three times for those who shave.",
      ur: 'سعی مکمل ہونے کے بعد مردوں کو سر منڈوانا (حلق) یا چاروں طرف سے برابر بال کٹوانا (تقصیر) چاہیے۔ خواتین کو انگلی کے پوریے کے برابر بال کاٹنے چاہئیں۔\n\nیہ عمرہ کا اختتام ہے۔ اب آپ احرام کی حالت سے نکل سکتے ہیں۔\n\نوٹ: حلق (سر منڈوانا) تقصیر سے افضل ہے، نبی ﷺ نے سر منڈوانے والوں کے لیے تین بار دعا فرمائی۔',
    },
  ],
  hajj: [
    {
      step: 1, icon: '✈️',
      titleEn: 'Ihram at Miqat (8th Dhul Hijjah)',
      titleUr: 'میقات پر احرام (8 ذوالحجہ)',
      en: 'On 8th Dhul Hijjah (Yawm at-Tarwiyah), wear Ihram at Miqat and make Niyyah for Hajj. Recite Talbiyah continuously. Travel to Mina and spend the night there, performing Dhuhr, Asr, Maghrib, Isha (shortened, not combined) and Fajr prayers.',
      ur: '8 ذوالحجہ کو میقات پر احرام باندھیں اور حج کی نیت کریں۔ مسلسل تلبیہ پڑھتے رہیں۔ منیٰ جائیں اور رات وہاں گزاریں، ظہر، عصر، مغرب، عشاء (قصر، جمع نہیں) اور فجر نماز پڑھیں۔',
    },
    {
      step: 2, icon: '🌄',
      titleEn: 'Arafat — The Pillar of Hajj (9th Dhul Hijjah)',
      titleUr: 'عرفات — حج کا رکن (9 ذوالحجہ)',
      en: 'After Fajr on 9th Dhul Hijjah, move to Arafat. The Prophet ﷺ said: "Hajj is Arafah." Standing at Arafat from Zawaal until sunset is the most important pillar.\n\nSpend this time in Dhikr, Dua, and seeking forgiveness. Perform Dhuhr and Asr combined and shortened (Qasr + Jam).\n\nBest dua: "La ilaha illallahu wahdahu la sharika lah, lahul mulku wa lahul hamd wa huwa ala kulli shayin qadir."',
      ur: '9 ذوالحجہ کو فجر کے بعد عرفات جائیں۔ نبی ﷺ نے فرمایا: "حج عرفہ ہے۔" زوال سے غروبِ آفتاب تک عرفات میں ٹھہرنا حج کا سب سے اہم رکن ہے۔\n\nیہ وقت ذکر، دعا اور استغفار میں گزاریں۔ ظہر اور عصر جمع اور قصر کریں۔\n\nبہترین دعا: "لا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ"',
    },
    {
      step: 3, icon: '🌙',
      titleEn: 'Muzdalifah — Night Under the Stars (9th night)',
      titleUr: 'مزدلفہ — رات کے سفر (9ویں رات)',
      en: 'After sunset at Arafat, move to Muzdalifah. Perform Maghrib and Isha combined (Jam). Spend the night here.\n\nCollect 49 or 70 pebbles (size of a chickpea) for Rami (stoning).\n\nAfter Fajr, make dua facing Qibla until sunrise brightens. Then move to Mina before sunrise.',
      ur: 'عرفات میں غروبِ آفتاب کے بعد مزدلفہ روانہ ہوں۔ مغرب اور عشاء جمع کریں۔ رات یہاں گزاریں۔\n\nرمی کے لیے 49 یا 70 کنکریاں (چنے کے برابر) اکٹھی کریں۔\n\nفجر کے بعد قبلہ رخ دعا کریں جب تک روشنی نہ ہو جائے۔ پھر طلوعِ آفتاب سے پہلے منیٰ روانہ ہوں۔',
    },
    {
      step: 4, icon: '🪨',
      titleEn: 'Rami — Stoning the Jamarat (10th Dhul Hijjah)',
      titleUr: 'رمی — شیطان کو کنکریاں (10 ذوالحجہ)',
      en: 'On 10th Dhul Hijjah (Eid ul-Adha), throw 7 pebbles at Jamrat al-Aqabah (the large pillar), saying "Allahu Akbar" with each throw.\n\nThis commemorates Ibrahim ﷺ pelting Shaytan when he tried to tempt him.\n\nAfter Rami: Sacrifice an animal (Qurbani/Hady), shave/cut hair, remove Ihram, then perform Tawaf al-Ifadah and Sai.',
      ur: '10 ذوالحجہ (عید الاضحی) کو جمرۃ الکبریٰ (بڑے ستون) کو 7 کنکریاں ماریں، ہر بار "اللہ اکبر" کہیں۔\n\nیہ ابراہیم ﷺ کی یاد ہے جب شیطان نے انہیں آزمایا۔\n\nرمی کے بعد: قربانی کریں، بال کٹوائیں، احرام اتاریں، پھر طوافِ افاضہ اور سعی کریں۔',
    },
    {
      step: 5, icon: '🏕️',
      titleEn: 'Mina — Days of Tashreeq (11-13th)',
      titleUr: 'منیٰ — ایامِ تشریق (11-13)',
      en: 'Spend nights of 11th and 12th (and 13th if staying) in Mina. Each day throw 7 pebbles at each of the 3 Jamarat (small, medium, large) after Zawaal.\n\nOrder: Jamrat al-Sughra → Jamrat al-Wusta → Jamrat al-Aqabah\n\nThose who leave on 12th (before sunset) have completed Hajj. Remaining for 13th is better.',
      ur: '11 اور 12 ذوالحجہ کی راتیں (اور 13ویں اگر رہ رہے ہیں) منیٰ میں گزاریں۔ ہر روز زوال کے بعد تینوں جمرات (چھوٹا، درمیانی، بڑا) کو 7-7 کنکریاں ماریں۔\n\nترتیب: جمرہ صغریٰ → جمرہ وسطیٰ → جمرہ کبریٰ\n\nجو 12 کو (غروب سے پہلے) نکل جائیں ان کا حج مکمل ہوا۔ 13ویں تک رہنا افضل ہے۔',
    },
    {
      step: 6, icon: '🕌',
      titleEn: 'Tawaf al-Wada — Farewell Tawaf',
      titleUr: 'طوافِ وداع — آخری طواف',
      en: 'Before leaving Makkah, perform the farewell Tawaf (Tawaf al-Wada) — 7 rounds around the Kaaba.\n\nThis is Wajib (obligatory) for all pilgrims except menstruating women.\n\nSpend this Tawaf with a heavy heart, making dua. After completing, do not stay for unnecessary shopping — leave directly.\n\nHajj is now complete. May Allah accept it as Hajj Mabrur! Ameen.',
      ur: 'مکہ چھوڑنے سے پہلے طوافِ وداع کریں — کعبہ کے 7 چکر۔\n\nیہ تمام حاجیوں پر واجب ہے سوائے حائضہ خواتین کے۔\n\nیہ طواف بھاری دل سے دعا مانگتے ہوئے کریں۔ طواف کے بعد غیر ضروری خریداری کے لیے نہ رکیں — براہِ راست جائیں۔\n\nحج مکمل ہو گیا۔ اللہ حجِ مبرور نصیب کرے! آمین',
    },
  ],
};

function HajjGuideScreen({ urdu, darkMode }) {
  const dm = darkMode;
  const pageBg = dm ? '#0a0a0a' : '#F5F2E8';
  const cardBg = dm ? '#1a1a1a' : '#fff';
  const textColor = dm ? '#e0e0e0' : '#1a1a1a';
  const subColor = dm ? '#888' : '#666';
  const borderColor = dm ? '#2a2a2a' : '#e8e8e8';

  const [tab, setTab] = useState('umrah');
  const [expanded, setExpanded] = useState(null);

  const data = HAJJ_DATA[tab];

  const COLORS = ['#1F5C3D','#2980b9','#8e44ad','#e67e22','#c0392b','#16a085'];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: pageBg }} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={{ backgroundColor: dm ? '#0B2818' : '#1F5C3D', paddingTop: 60, paddingBottom: 26, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden' }}>
        <Text style={{ position: 'absolute', top: -18, right: -12, fontSize: 100, color: 'rgba(212,175,55,0.06)' }}>✦</Text>
        <View style={{ alignItems: 'center', marginBottom: 17 }}>
          <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(212,175,55,0.13)', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ fontSize: 30 }}>🕋</Text>
          </View>
          <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 6 }}>
            {urdu ? 'حج و عمرہ رہنما' : 'Hajj & Umrah Guide'}
          </Text>
          <Text style={{ color: '#9DB8A0', fontSize: 12.5, marginTop: 4, textAlign: 'center' }}>
            {urdu ? 'مکمل مرحلہ وار رہنمائی' : 'Complete step-by-step guide'}
          </Text>
        </View>
        {/* Tab switcher */}
        <View style={{ flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 15, padding: 4 }}>
          {[['umrah', urdu ? 'عمرہ' : 'Umrah', '🕌'], ['hajj', urdu ? 'حج' : 'Hajj', '🕋']].map(([t, label, emoji]) => (
            <TouchableOpacity key={t} onPress={() => { setTab(t); setExpanded(null); }} activeOpacity={0.8}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, backgroundColor: tab === t ? 'rgba(212,175,55,0.2)' : 'transparent', borderWidth: tab === t ? 1 : 0, borderColor: 'rgba(212,175,55,0.4)' }}>
              <Text style={{ fontSize: 16 }}>{emoji}</Text>
              <Text style={{ color: tab === t ? '#D4AF37' : '#9DB8A0', fontWeight: tab === t ? 'bold' : '500', fontSize: 14.5 }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Important note */}
      <View style={{ margin: 16, backgroundColor: dm ? '#1a2e1a' : '#fff8e1', borderRadius: 15, padding: 14, borderWidth: 1, borderColor: dm ? '#2a4a2a' : '#ffe082' }}>
        <Text style={{ color: dm ? '#D4AF37' : '#7a6000', fontSize: 12, lineHeight: 18 }}>
          ⚠️ {urdu
            ? 'یہ رہنما عمومی معلومات کے لیے ہے۔ حج/عمرہ سے پہلے کسی مستند عالم یا اپنے حج گروپ کے رہنما سے مکمل تربیت لیں۔'
            : 'This guide is for general reference. Before Hajj/Umrah, receive proper training from a qualified scholar or your Hajj group guide.'}
        </Text>
      </View>

      {/* Steps */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 30 }}>
        {data.map((item, i) => (
          <TouchableOpacity key={i} onPress={() => setExpanded(expanded === i ? null : i)} activeOpacity={0.85}
            style={{ marginBottom: 11, flexDirection: 'row', alignItems: 'flex-start' }}>
            {/* Timeline */}
            <View style={{ alignItems: 'center', marginRight: 13, paddingTop: 4 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: expanded === i ? COLORS[i % COLORS.length] : (dm ? '#222' : '#e8f5e9'), justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS[i % COLORS.length] }}>
                <Text style={{ fontSize: 17 }}>{item.icon}</Text>
              </View>
              {i < data.length - 1 && <View style={{ width: 2, flex: 1, minHeight: 22, backgroundColor: dm ? '#2a2a2a' : '#c8e6c9', marginTop: 4 }} />}
            </View>
            {/* Card */}
            <View style={{ flex: 1, backgroundColor: cardBg, borderRadius: 17, padding: 15, borderWidth: 1, borderColor: expanded === i ? COLORS[i % COLORS.length] : borderColor }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <View style={{ backgroundColor: COLORS[i % COLORS.length] + '1f', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 6 }}>
                    <Text style={{ color: COLORS[i % COLORS.length], fontSize: 10.5, fontWeight: '700' }}>{urdu ? `مرحلہ ${item.step}` : `Step ${item.step}`}</Text>
                  </View>
                  <Text style={{ color: textColor, fontSize: 15, fontWeight: 'bold' }}>{urdu ? item.titleUr : item.titleEn}</Text>
                </View>
                <Ionicons name={expanded === i ? 'chevron-up' : 'chevron-down'} size={18} color={subColor} />
              </View>
              {expanded === i && (
                <Text style={{ color: subColor, marginTop: 12, fontSize: 13, lineHeight: 23, textAlign: urdu ? 'right' : 'left' }}>
                  {urdu ? item.ur : item.en}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        ))}

        {/* Talbiyah Card */}
        <View style={{ backgroundColor: dm ? '#0B2818' : '#1F5C3D', borderRadius: 20, padding: 20, marginTop: 8, borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)' }}>
          <Text style={{ color: '#D4AF37', fontSize: 13, fontWeight: '700', marginBottom: 11 }}>🤲 {urdu ? 'تلبیہ' : 'Talbiyah'}</Text>
          <Text style={{ color: '#D4AF37', fontSize: 16.5, textAlign: 'right', lineHeight: 31, marginBottom: 11 }}>
            لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ{'\n'}لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ{'\n'}إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ{'\n'}لَا شَرِيكَ لَكَ
          </Text>
          <Text style={{ color: '#9DB8A0', fontSize: 11.5, lineHeight: 19 }}>
            {urdu
              ? 'میں حاضر ہوں اے اللہ، میں حاضر ہوں۔ میں حاضر ہوں، تیرا کوئی شریک نہیں، میں حاضر ہوں۔ بے شک تمام تعریفیں، نعمتیں اور بادشاہت تیری ہے۔ تیرا کوئی شریک نہیں۔'
              : 'Here I am O Allah, here I am. Here I am, You have no partner, here I am. Verily all praise, grace and sovereignty belong to You. You have no partner.'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ONBOARDING SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
const ONBOARDING_KEY = 'hidaya_onboarding_done';

const ONBOARDING_SLIDES = [
  {
    icon: 'mosque',
    iconLib: 'MC',
    titleEn: 'Welcome to Hidaya',
    titleUr: 'ہدایت میں خوش آمدید',
    descEn: 'Your complete Islamic companion — prayer times, Quran, Tasbeeh, Qibla, and much more.',
    descUr: 'آپ کا مکمل اسلامی ساتھی — نماز کے اوقات، قرآن، تسبیح، قبلہ اور بہت کچھ۔',
    bg: '#0B2818',
    accent: '#D4AF37',
  },
  {
    icon: 'time-outline',
    iconLib: 'IO',
    titleEn: 'Accurate Prayer Times',
    titleUr: 'درست نماز اوقات',
    descEn: 'Hanafi method prayer times calculated for your exact location. Get Azan alerts on time, every time.',
    descUr: 'حنفی طریقہ کے مطابق آپ کی درست جگہ کے اوقاتِ نماز۔ ہر وقت اذان الرٹ پائیں۔',
    bg: '#102a1f',
    accent: '#4caf50',
  },
  {
    icon: 'compass',
    iconLib: 'IO',
    titleEn: 'Qibla & More',
    titleUr: 'قبلہ اور مزید',
    descEn: 'Find Qibla direction anywhere in the world. Islamic Quiz, Seerah, Stories, AI assistant and more.',
    descUr: 'دنیا میں کہیں بھی قبلہ سمت معلوم کریں۔ کوئز، سیرت، کہانیاں، AI اور مزید۔',
    bg: '#0e2630',
    accent: '#4dabf7',
  },
  {
    icon: 'notifications-outline',
    iconLib: 'IO',
    titleEn: 'Enable Notifications',
    titleUr: 'اطلاعات فعال کریں',
    descEn: 'Allow notifications so Hidaya can remind you for every prayer with Azan. Never miss a Salah.',
    descUr: 'اطلاعات کی اجازت دیں تاکہ ہدایت آپ کو اذان کے ساتھ ہر نماز یاد دلا سکے۔',
    bg: '#1f1530',
    accent: '#b388eb',
    isPermission: true,
  },
];

function OnboardingScreen({ onDone, urdu }) {
  const [idx, setIdx] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(1)).current;
  const dotScale  = useRef(ONBOARDING_SLIDES.map(() => new Animated.Value(1))).current;

  const slide = ONBOARDING_SLIDES[idx];
  const isLast = idx === ONBOARDING_SLIDES.length - 1;

  const animateTo = (next) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setIdx(next);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    });
    Animated.sequence([
      Animated.timing(dotScale[next], { toValue: 1.4, duration: 200, useNativeDriver: true }),
      Animated.timing(dotScale[next], { toValue: 1,   duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const handleNext = async () => {
    if (slide.isPermission) {
      try { await Notifications.requestPermissionsAsync(); } catch (e) {}
    }
    if (isLast) {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'done');
      onDone();
    } else {
      animateTo(idx + 1);
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'done');
    onDone();
  };

  return (
    <View style={{ flex: 1, backgroundColor: slide.bg, overflow: 'hidden' }}>
      {/* Signature corner motif */}
      <Text style={{ position: 'absolute', top: -20, right: -16, fontSize: 120, color: slide.accent + '0d' }}>✦</Text>

      {/* Skip button */}
      {!isLast && (
        <TouchableOpacity onPress={handleSkip} activeOpacity={0.7} style={{ position: 'absolute', top: 55, right: 24, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16 }}>
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>{urdu ? 'چھوڑیں' : 'Skip'}</Text>
        </TouchableOpacity>
      )}

      <Animated.View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, opacity: fadeAnim }}>
        {/* Icon circle */}
        <View style={{
          width: 142, height: 142, borderRadius: 71,
          backgroundColor: 'rgba(255,255,255,0.07)',
          justifyContent: 'center', alignItems: 'center',
          borderWidth: 1.5, borderColor: slide.accent + '38',
          marginBottom: 42,
        }}>
          <View style={{
            width: 108, height: 108, borderRadius: 54,
            backgroundColor: slide.accent + '20',
            justifyContent: 'center', alignItems: 'center',
            borderWidth: 1, borderColor: slide.accent + '30',
          }}>
            {slide.iconLib === 'MC'
              ? <MaterialCommunityIcons name={slide.icon} size={52} color={slide.accent} />
              : <Ionicons name={slide.icon} size={52} color={slide.accent} />
            }
          </View>
        </View>

        {/* Title */}
        <Text style={{ color: '#fff', fontSize: 27, fontWeight: 'bold', textAlign: 'center', marginBottom: 15, letterSpacing: 0.3 }}>
          {urdu ? slide.titleUr : slide.titleEn}
        </Text>

        {/* Description */}
        <Text style={{ color: 'rgba(255,255,255,0.62)', fontSize: 15, textAlign: 'center', lineHeight: 25 }}>
          {urdu ? slide.descUr : slide.descEn}
        </Text>
      </Animated.View>

      {/* Bottom area */}
      <View style={{ paddingHorizontal: 28, paddingBottom: 50 }}>
        {/* Dot indicators */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 30, gap: 8 }}>
          {ONBOARDING_SLIDES.map((_, i) => (
            <Animated.View key={i} style={{
              height: 8,
              width: i === idx ? 28 : 8,
              borderRadius: 4,
              backgroundColor: i === idx ? slide.accent : 'rgba(255,255,255,0.22)',
              transform: [{ scale: dotScale[i] }],
            }} />
          ))}
        </View>

        {/* Next / Get Started button */}
        <TouchableOpacity onPress={handleNext} activeOpacity={0.85} style={{
          backgroundColor: slide.accent,
          paddingVertical: 16, borderRadius: 16,
          alignItems: 'center', flexDirection: 'row',
          justifyContent: 'center', gap: 8,
          elevation: 3,
        }}>
          <Text style={{ color: '#16261c', fontSize: 16.5, fontWeight: 'bold' }}>
            {isLast
              ? (urdu ? 'شروع کریں 🕌' : "Let's Begin 🕌")
              : (urdu ? 'آگے' : 'Next')}
          </Text>
          {!isLast && <Ionicons name="arrow-forward" size={19} color="#16261c" />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPLASH SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function SplashScreen({ onFinish }) {
  // Animation values
  const logoScale    = useRef(new Animated.Value(0)).current;
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const textOpacity  = useRef(new Animated.Value(0)).current;
  const tagOpacity   = useRef(new Animated.Value(0)).current;
  const ringScale    = useRef(new Animated.Value(0.6)).current;
  const ringOpacity  = useRef(new Animated.Value(0)).current;
  const dotsOpacity  = useRef(new Animated.Value(0)).current;
  const fadeOut      = useRef(new Animated.Value(1)).current;
  const starOpacity1 = useRef(new Animated.Value(0)).current;
  const starOpacity2 = useRef(new Animated.Value(0)).current;
  const starOpacity3 = useRef(new Animated.Value(0)).current;
  const pulseAnim    = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulsing ring loop
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    );

    // Main entrance sequence
    Animated.sequence([
      // 1 — outer ring fades + scales in
      Animated.parallel([
        Animated.timing(ringOpacity, { toValue: 1,  duration: 500, useNativeDriver: true }),
        Animated.spring(ringScale,   { toValue: 1,  friction: 5,   useNativeDriver: true }),
      ]),
      // 2 — logo pops in
      Animated.parallel([
        Animated.spring(logoScale,   { toValue: 1,  friction: 5,   useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1,  duration: 400, useNativeDriver: true }),
      ]),
      // 3 — stars sparkle in
      Animated.stagger(150, [
        Animated.timing(starOpacity1, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(starOpacity2, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(starOpacity3, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      // 4 — app name
      Animated.timing(textOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      // 5 — tagline
      Animated.timing(tagOpacity,  { toValue: 1, duration: 500, useNativeDriver: true }),
      // 6 — dots indicator
      Animated.timing(dotsOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      // 7 — hold for a moment
      Animated.delay(1000),
    ]).start(() => {
      pulseLoop.stop();
      // Fade out entire screen
      Animated.timing(fadeOut, { toValue: 0, duration: 500, useNativeDriver: true }).start(onFinish);
    });

    pulseLoop.start();
    return () => pulseLoop.stop();
  }, []);

  return (
    <Animated.View style={{
      flex: 1,
      backgroundColor: '#0B2818',
      justifyContent: 'center',
      alignItems: 'center',
      opacity: fadeOut,
    }}>
      {/* Background decorative arcs */}
      <View style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: 140, borderWidth: 1, borderColor: 'rgba(212,175,55,0.06)' }} />
      <View style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: 90,  borderWidth: 1, borderColor: 'rgba(212,175,55,0.08)' }} />
      <View style={{ position: 'absolute', bottom: -80, left: -80, width: 280, height: 280, borderRadius: 140, borderWidth: 1, borderColor: 'rgba(212,175,55,0.06)' }} />
      <View style={{ position: 'absolute', bottom: -40, left: -40, width: 180, height: 180, borderRadius: 90,  borderWidth: 1, borderColor: 'rgba(212,175,55,0.08)' }} />

      {/* Outer pulsing ring */}
      <Animated.View style={{
        position: 'absolute',
        width: 230, height: 230,
        borderRadius: 115,
        borderWidth: 1.5,
        borderColor: 'rgba(212,175,55,0.25)',
        opacity: ringOpacity,
        transform: [{ scale: Animated.multiply(ringScale, pulseAnim) }],
      }} />

      {/* Middle ring */}
      <Animated.View style={{
        position: 'absolute',
        width: 196, height: 196,
        borderRadius: 98,
        borderWidth: 1,
        borderColor: 'rgba(212,175,55,0.15)',
        opacity: ringOpacity,
        transform: [{ scale: ringScale }],
      }} />

      {/* Stars */}
      <Animated.Text style={{ position: 'absolute', top: '22%', left: '14%',  fontSize: 14, opacity: starOpacity1 }}>✦</Animated.Text>
      <Animated.Text style={{ position: 'absolute', top: '18%', right: '16%', fontSize: 10, opacity: starOpacity2, color: '#D4AF37' }}>★</Animated.Text>
      <Animated.Text style={{ position: 'absolute', top: '26%', right: '10%', fontSize: 16, opacity: starOpacity3, color: 'rgba(212,175,55,0.5)' }}>✦</Animated.Text>
      <Animated.Text style={{ position: 'absolute', bottom: '24%', left: '10%', fontSize: 12, opacity: starOpacity1, color: 'rgba(212,175,55,0.5)' }}>★</Animated.Text>
      <Animated.Text style={{ position: 'absolute', bottom: '20%', right: '14%', fontSize: 14, opacity: starOpacity3 }}>✦</Animated.Text>

      {/* Logo circle */}
      <Animated.View style={{
        width: 160, height: 160,
        borderRadius: 80,
        backgroundColor: '#1F5C3D',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 20,
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 20,
        borderWidth: 2,
        borderColor: 'rgba(212,175,55,0.3)',
        opacity: logoOpacity,
        transform: [{ scale: logoScale }],
      }}>
        {/* Inner highlight ring for depth */}
        <View style={{ position: 'absolute', width: 148, height: 148, borderRadius: 74, borderWidth: 1, borderColor: 'rgba(212,175,55,0.15)' }} />
        {/* Mosque icon */}
        <MaterialCommunityIcons name="mosque" size={60} color="#D4AF37" />
        {/* Small crescent below */}
        <Text style={{ color: '#D4AF37', fontSize: 18, marginTop: 4, letterSpacing: 1 }}>☽</Text>
      </Animated.View>

      {/* Arabic Bismillah */}
      <Animated.Text style={{
        color: '#D4AF37',
        fontSize: 22,
        marginTop: 32,
        opacity: textOpacity,
        letterSpacing: 1,
        fontWeight: '600',
      }}>
        بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
      </Animated.Text>

      {/* App Name */}
      <Animated.Text style={{
        color: '#ffffff',
        fontSize: 42,
        fontWeight: 'bold',
        marginTop: 10,
        opacity: textOpacity,
        letterSpacing: 3,
      }}>
        Hidaya
      </Animated.Text>

      {/* Urdu subtitle */}
      <Animated.Text style={{
        color: '#D4AF37',
        fontSize: 16,
        marginTop: 4,
        letterSpacing: 3,
      }}>
        ہدایت • رہنمائی
      </Animated.Text>

      {/* Tagline */}
      <Animated.Text style={{
        color: 'rgba(157,184,160,0.8)',
        fontSize: 13,
        marginTop: 14,
        opacity: tagOpacity,
        textAlign: 'center',
        paddingHorizontal: 40,
        lineHeight: 20,
        letterSpacing: 0.5,
      }}>
        Your Complete Islamic Companion
      </Animated.Text>

      {/* Feature pills */}
      <Animated.View style={{
        flexDirection: 'row',
        gap: 8,
        marginTop: 20,
        opacity: tagOpacity,
      }}>
        {['🕌 Prayer', '📿 Tasbeeh', '🤖 AI', '🧭 Qibla'].map((label, i) => (
          <View key={i} style={{
            backgroundColor: 'rgba(212,175,55,0.1)',
            borderWidth: 1,
            borderColor: 'rgba(212,175,55,0.22)',
            borderRadius: 20,
            paddingHorizontal: 11,
            paddingVertical: 5,
          }}>
            <Text style={{ color: '#D4AF37', fontSize: 10, fontWeight: '600', letterSpacing: 0.2 }}>{label}</Text>
          </View>
        ))}
      </Animated.View>

      {/* Loading dots */}
      <Animated.View style={{ flexDirection: 'row', gap: 6, marginTop: 48, opacity: dotsOpacity }}>
        {[0, 1, 2].map(i => (
          <View key={i} style={{
            width: 6, height: 6, borderRadius: 3,
            backgroundColor: i === 1 ? '#D4AF37' : 'rgba(212,175,55,0.4)',
          }} />
        ))}
      </Animated.View>

      {/* Bottom version */}
      <Animated.Text style={{
        position: 'absolute',
        bottom: 50,
        color: 'rgba(157,184,160,0.5)',
        fontSize: 11,
        opacity: tagOpacity,
        letterSpacing: 1,
      }}>
        v1.0.0 • Made with ❤️ for Muslims
      </Animated.Text>
    </Animated.View>
  );
}

function MainApp() {
  const insets = useSafeAreaInsets();
  const systemScheme = useColorScheme();
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [darkMode, setDarkMode] = useState(systemScheme === 'dark');
  const [urdu, setUrdu] = useState(false);
  const [activeTab, setActiveTab] = useState('Home');
  const [count, setCount] = useState(0);
  const [selectedTasbeeh, setSelectedTasbeeh] = useState(0);
  const [selectedCat, setSelectedCat] = useState('Waking Up');
  const [homeTimes, setHomeTimes] = useState(null);
  const [, forceUpdate] = useState(0);
  // Live countdown ticker — updates every second
  useEffect(() => {
    const timer = setInterval(() => forceUpdate(n => n + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  const [selectedReciterUrl, setSelectedReciterUrl] = useState(AZAN_RECITERS[0].url);
  const [allTasbeeh, setAllTasbeeh] = useState(TASBEEH_LIST);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newArabic, setNewArabic] = useState('');
  const [newTarget, setNewTarget] = useState('100');
  const [hijriAdjustment, setHijriAdjustment] = useState(-1); // -1 default: aligns moment-hijri's tabular calc with Pakistan's moon-sighting committee date

  useEffect(() => { setDarkMode(systemScheme === 'dark'); }, [systemScheme]);

  const dm = darkMode;
  const pageBg = dm ? '#0a0a0a' : '#F5F2E8';
  const cardBg = dm ? '#1a1a1a' : '#fff';
  const textColor = dm ? '#e0e0e0' : '#1a1a1a';
  const subColor = dm ? '#888' : '#666';
  const sectionBg = dm ? '#222' : '#f0f7f0';
  const mutedColor = dm ? '#666' : '#999';
  const borderColor = dm ? '#2a2a2a' : '#e8e8e8';

  useNotificationListener(selectedReciterUrl);

  useEffect(() => {
    if (Platform.OS === 'android') setupAzanNotificationChannel();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(CUSTOM_TASBEEH_KEY);
        if (saved) { const c = JSON.parse(saved); setAllTasbeeh([...TASBEEH_LIST, ...c]); }
        const reciter = await AsyncStorage.getItem(SELECTED_RECITER_KEY);
        if (reciter) { const f = AZAN_RECITERS.find(r => r.id === reciter); if (f) setSelectedReciterUrl(f.url); }
        // Check if onboarding done
        const onboarded = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (!onboarded) setShowOnboarding(true);
        // Load saved Hijri date adjustment
        const hijriAdj = await AsyncStorage.getItem('hijri_adjustment');
        if (hijriAdj !== null) setHijriAdjustment(parseInt(hijriAdj, 10) || 0);
      } catch (e) {}
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('hijri_adjustment', String(hijriAdjustment)).catch(() => {});
  }, [hijriAdjustment]);

  useEffect(() => {
    (async () => {
      try {
        const notifPerm = await Notifications.getPermissionsAsync();
        if (notifPerm.status !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }
        const { coords } = await getSafeLocation();
        const adhanCoords = new Coordinates(coords.latitude, coords.longitude);
        const params = CalculationMethod.Karachi();
        params.madhab = Madhab.Hanafi;
        const times = new PrayerTimes(adhanCoords, new Date(), params);
        setHomeTimes(times);
        await schedulePrayerNotifications(times, urdu);
      } catch (e) {}
    })();
  }, [urdu]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (next) => {
      if (next === 'active') {
        try {
          const { coords } = await getSafeLocation();
          const adhanCoords = new Coordinates(coords.latitude, coords.longitude);
          const params = CalculationMethod.Karachi();
          params.madhab = Madhab.Hanafi;
          const freshTimes = new PrayerTimes(adhanCoords, new Date(), params);
          setHomeTimes(freshTimes);
          await schedulePrayerNotifications(freshTimes, urdu);
        } catch (e) {}
      }
    });
    return () => sub.remove();
  }, [urdu]);

  const formatTime = (date) => {
    if (!date) return '--:--';
    let h = date.getHours(), m = date.getMinutes();
    const ap = h >= 12 ? (urdu ? 'شام' : 'PM') : (urdu ? 'صبح' : 'AM');
    h = h % 12 || 12;
    return h + ':' + m.toString().padStart(2, '0') + ' ' + ap;
  };

  const homePrayers = [
    { key: 'fajr',    name: urdu ? 'فجر'          : 'Fajr',    nameUr: 'فجر',          icon: 'moon',         color: '#5c6bc0' },
    { key: 'sunrise', name: urdu ? 'طلوعِ آفتاب' : 'Sunrise', nameUr: 'طلوعِ آفتاب', icon: 'sunny-outline', color: '#ff8f00' },
    { key: 'dhuhr',   name: urdu ? 'ظہر'          : 'Dhuhr',   nameUr: 'ظہر',          icon: 'sunny',        color: '#f4511e' },
    { key: 'asr',     name: urdu ? 'عصر'          : 'Asr',     nameUr: 'عصر',          icon: 'partly-sunny', color: '#039be5' },
    { key: 'maghrib', name: urdu ? 'مغرب'         : 'Maghrib', nameUr: 'مغرب',         icon: 'cloudy-night', color: '#e91e63' },
    { key: 'isha',    name: urdu ? 'عشاء'         : 'Isha',    nameUr: 'عشاء',         icon: 'moon',         color: '#3949ab' },
  ];

  const getNextPrayer = () => {
    if (!homeTimes) return { name: '--', time: '--:--', key: 'fajr' };
    const now = new Date();
    const salahOnly = homePrayers.filter(p => p.key !== 'sunrise');
    for (const p of salahOnly) { if (homeTimes[p.key] > now) return { ...p, time: formatTime(homeTimes[p.key]) }; }
    return { ...salahOnly[0], time: formatTime(homeTimes[salahOnly[0].key]) };
  };

  const saveCustomTasbeeh = async (item) => {
    try {
      const s = await AsyncStorage.getItem(CUSTOM_TASBEEH_KEY);
      const e = s ? JSON.parse(s) : [];
      const u = [...e, item];
      await AsyncStorage.setItem(CUSTOM_TASBEEH_KEY, JSON.stringify(u));
      setAllTasbeeh([...TASBEEH_LIST, ...u]);
    } catch (e) {}
  };

  const deleteCustomTasbeeh = async (id) => {
    try {
      const s = await AsyncStorage.getItem(CUSTOM_TASBEEH_KEY);
      const e = s ? JSON.parse(s) : [];
      const u = e.filter(t => t.id !== id);
      await AsyncStorage.setItem(CUSTOM_TASBEEH_KEY, JSON.stringify(u));
      setAllTasbeeh([...TASBEEH_LIST, ...u]);
      if (selectedTasbeeh >= TASBEEH_LIST.length + u.length) setSelectedTasbeeh(0);
    } catch (e) {}
  };

  const addCustomTasbeeh = () => {
    if (!newName.trim()) { Alert.alert(urdu ? 'خرابی' : 'Error', urdu ? 'نام درج کریں' : 'Please enter a name'); return; }
    const item = { id: 'custom_' + Date.now(), name: newName.trim(), nameUr: newName.trim(), arabic: newArabic.trim() || newName.trim(), target: parseInt(newTarget) || 100, custom: true };
    saveCustomTasbeeh(item);
    setNewName(''); setNewArabic(''); setNewTarget('100');
    setShowAddModal(false);
    setSelectedTasbeeh(allTasbeeh.length);
    setCount(0);
  };

  const features = [
    { name: urdu ? 'تسبیح' : 'Tasbeeh', tab: 'Tasbeeh', lib: 'MC', icon: 'dots-horizontal-circle', size: 30 },
    { name: urdu ? 'دعائیں' : 'Duas', tab: 'Duas', lib: 'IO', icon: 'reader', size: 28 },
    { name: urdu ? 'قبلہ' : 'Qibla', tab: 'Qibla', lib: 'IO', icon: 'compass', size: 30 },
    { name: urdu ? 'اسمائے حسنیٰ' : '99 Names', tab: 'Names', lib: 'MC', icon: 'star-circle', size: 28 },
    { name: urdu ? 'زکوٰة' : 'Zakat', tab: 'Zakat', lib: 'MC', icon: 'cash-multiple', size: 26 },
    { name: urdu ? 'کیلنڈر' : 'Calendar', tab: 'Calendar', lib: 'IO', icon: 'calendar', size: 28 },
    { name: urdu ? 'اذان' : 'Azan', tab: 'Azan', lib: 'IO', icon: 'musical-notes', size: 28 },
    { name: urdu ? 'ٹریکر' : 'Tracker', tab: 'Salah', lib: 'IO', icon: 'checkmark-done-circle', size: 28 },
    { name: 'Hidaya AI', tab: 'AI', lib: 'IO', icon: 'chatbubble-ellipses', size: 28 },
    { name: urdu ? 'اقوال' : 'Quotes', tab: 'Quotes', lib: 'IO', icon: 'chatbox-ellipses', size: 26 },
    { name: urdu ? 'کوئز' : 'Quiz', tab: 'Quiz', lib: 'IO', icon: 'help-circle', size: 28 },
    { name: urdu ? 'سیرت' : 'Seerah', tab: 'Seerah', lib: 'IO', icon: 'book', size: 26 },
    { name: urdu ? 'کہانیاں' : 'Stories', tab: 'Stories', lib: 'IO', icon: 'library', size: 26 },
    { name: urdu ? 'مساجد' : 'Masjids', tab: 'Masjid', lib: 'MC', icon: 'mosque', size: 28 },
    { name: urdu ? 'مسلم نام' : 'M.Names', tab: 'MuslimNames', lib: 'IO', icon: 'people', size: 28 },
    { name: urdu ? 'حج/عمرہ' : 'Hajj', tab: 'Hajj', lib: 'MC', icon: 'mosque', size: 26 },
  ];

  const tabs = ['Home', 'Prayer', 'AI', 'Duas', 'Settings'];
  const categories = [...new Set(DUAS_LIST.map(d => d.category))];
  const filteredDuas = DUAS_LIST.filter(d => d.category === selectedCat);
  const next = getNextPrayer();
  const handleCount = () => { Vibration.vibrate(30); const nc = count + 1; setCount(nc); if (nc === allTasbeeh[selectedTasbeeh]?.target) Vibration.vibrate([0, 100, 50, 100]); };

  const renderScreen = () => {
    // ── HOME ──
    if (activeTab === 'Home') {
      const todayHadith = getDailyHadith();
      const todayIdx = getDailyHadithIndex();
      const todayDate = new Date().toLocaleDateString(urdu ? 'ur-PK' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ' | ' + moment().add(hijriAdjustment, 'days').format('iD iMMMM iYYYY') + ' AH';

      return (
        <ScrollView style={{ flex: 1, backgroundColor: pageBg }} showsVerticalScrollIndicator={false}>
          {/* PREMIUM HEADER */}
          <View style={{
            backgroundColor: dm ? '#0B2818' : '#1F5C3D',
            paddingTop: 55, paddingBottom: 26, paddingHorizontal: 20,
            borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
            overflow: 'hidden',
          }}>
            {/* Signature corner motif — eight-point star outline, very low opacity */}
            <Text style={{ position: 'absolute', top: -18, right: -10, fontSize: 110, color: 'rgba(212,175,55,0.06)', fontWeight: '300' }}>✦</Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <View>
                <Text style={{ color: '#D4AF37', fontSize: 26, fontWeight: 'bold', letterSpacing: 0.3 }}>Hidaya</Text>
                <Text style={{ color: '#9DB8A0', fontSize: 12, marginTop: 3, letterSpacing: 0.3 }}>
                  {urdu ? 'السلام علیکم' : 'Assalamu Alaikum'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: '#9DB8A0', fontSize: 11 }}>{todayDate}</Text>
                <View style={{ marginTop: 7, backgroundColor: 'rgba(212,175,55,0.14)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(212,175,55,0.28)', flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#D4AF37', marginRight: 6 }} />
                  <Text style={{ color: '#D4AF37', fontSize: 11, fontWeight: '600' }}>
                    {urdu ? `اگلی: ${next.name}` : `Next: ${next.name}`} • {next.time}
                  </Text>
                </View>
              </View>
            </View>

            {/* Prayer times compact row */}
            <View style={{ flexDirection: 'row', gap: 7 }}>
              {homePrayers.map((p, i) => {
                const time = homeTimes ? formatTime(homeTimes[p.key]) : '--:--';
                const isNext = next.key === p.key;
                return (
                  <View key={i} style={{ flex: 1, backgroundColor: isNext ? 'rgba(212,175,55,0.16)' : 'rgba(255,255,255,0.06)', borderRadius: 13, paddingVertical: 9, alignItems: 'center', borderWidth: 1, borderColor: isNext ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.05)' }}>
                    <Ionicons name={p.icon} size={14} color={isNext ? '#D4AF37' : '#9DB8A0'} />
                    <Text style={{ color: isNext ? '#D4AF37' : '#9DB8A0', fontSize: 8, marginTop: 4, fontWeight: '600' }}>{urdu ? p.nameUr : p.name.slice(0, 3)}</Text>
                    <Text style={{ color: isNext ? '#D4AF37' : '#fff', fontSize: 9.5, fontWeight: 'bold', marginTop: 2 }}>{time.replace(' AM', '').replace(' PM', '')}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* FEATURES GRID — 4 column, compact */}
          <View style={{ marginHorizontal: 16, marginTop: 22 }}>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: subColor, letterSpacing: 1.2, marginBottom: 13, textTransform: 'uppercase' }}>
              {urdu ? 'خصوصیات' : 'Features'}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {features.map((f, i) => {
                const isAct = activeTab === f.tab;
                return (
                  <TouchableOpacity key={i} onPress={() => setActiveTab(f.tab)} activeOpacity={0.75} style={{ width: '22%', backgroundColor: isAct ? '#1F5C3D' : cardBg, borderRadius: 17, paddingVertical: 15, alignItems: 'center', borderWidth: 1, borderColor: isAct ? '#2d6a4f' : borderColor, elevation: isAct ? 2 : 1 }}>
                    {f.lib === 'IO' && <Ionicons name={f.icon} size={f.size} color={isAct ? '#D4AF37' : '#1F5C3D'} />}
                    {f.lib === 'MC' && <MaterialCommunityIcons name={f.icon} size={f.size} color={isAct ? '#D4AF37' : '#1F5C3D'} />}
                    {f.lib === 'F5' && <FontAwesome5 name={f.icon} size={f.size} color={isAct ? '#D4AF37' : '#1F5C3D'} />}
                    <Text style={{ fontSize: 9, color: isAct ? '#D4AF37' : textColor, marginTop: 7, fontWeight: '600', textAlign: 'center' }}>{f.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* NEXT PRAYER WIDGET */}
          {homeTimes && (() => {
            const now = new Date();
            const upcoming = ['fajr','dhuhr','asr','maghrib','isha'].map(k => ({ key: k, time: homeTimes[k] })).find(p => p.time > now); // sunrise excluded from next prayer widget
            const target = upcoming || { key: 'fajr', time: homeTimes['fajr'] };
            const diffMs = Math.max(0, target.time - now);
            const diffH = Math.floor(diffMs / 3600000);
            const diffM = Math.floor((diffMs % 3600000) / 60000);
            const diffS = Math.floor((diffMs % 60000) / 1000);
            const prayerMeta = {
              fajr:    { nameEn: 'Fajr',    nameUr: 'فجر',   emoji: '🌙', color: '#3f51b5' },
              dhuhr:   { nameEn: 'Dhuhr',   nameUr: 'ظہر',   emoji: '☀️', color: '#ff9800' },
              asr:     { nameEn: 'Asr',     nameUr: 'عصر',   emoji: '🌤️', color: '#4caf50' },
              maghrib: { nameEn: 'Maghrib', nameUr: 'مغرب',  emoji: '🌅', color: '#f44336' },
              isha:    { nameEn: 'Isha',    nameUr: 'عشاء',  emoji: '⭐', color: '#9c27b0' },
            };
            const meta = prayerMeta[target.key];
            const totalMins = diffH * 60 + diffM;
            const totalPrayerGap = 360; // avg mins between prayers
            const progress = Math.max(0.02, Math.min(0.98, 1 - (totalMins / totalPrayerGap)));
            return (
              <TouchableOpacity onPress={() => setActiveTab('Prayer')} activeOpacity={0.92}
                style={{ marginHorizontal: 16, marginTop: 22, borderRadius: 24, overflow: 'hidden', elevation: 4, shadowColor: meta.color, shadowOpacity: 0.3, shadowRadius: 12 }}>
                <View style={{ backgroundColor: dm ? '#0d1a0d' : '#fff', borderWidth: 1, borderColor: dm ? meta.color + '44' : meta.color + '33', borderRadius: 24, padding: 20 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: meta.color, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 5 }}>
                        {urdu ? 'اگلی نماز' : 'NEXT PRAYER'}
                      </Text>
                      <Text style={{ color: dm ? '#fff' : '#1a1a1a', fontSize: 32, fontWeight: 'bold', letterSpacing: 0.5 }}>
                        {meta.emoji} {urdu ? meta.nameUr : meta.nameEn}
                      </Text>
                      <Text style={{ color: dm ? '#aaa' : '#555', fontSize: 14, marginTop: 4 }}>
                        {formatTime(target.time)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'center', backgroundColor: meta.color + '18', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: meta.color + '33', minWidth: 80 }}>
                      <Text style={{ color: meta.color, fontSize: 20, fontWeight: 'bold', letterSpacing: 1 }}>
                        {String(diffH).padStart(2,'0')}h {String(diffM).padStart(2,'0')}m {String(diffS).padStart(2,'0')}s
                      </Text>
                      <Text style={{ color: meta.color, fontSize: 10, opacity: 0.8, marginTop: 2 }}>
                        {urdu ? 'باقی وقت' : 'remaining'}
                      </Text>
                    </View>
                  </View>
                  <View style={{ marginTop: 16, height: 5, backgroundColor: dm ? '#222' : '#f0f0f0', borderRadius: 3 }}>
                    <View style={{ height: 5, borderRadius: 3, backgroundColor: meta.color, width: `${progress * 100}%` }} />
                  </View>
                  <Text style={{ color: dm ? '#555' : '#bbb', fontSize: 10, marginTop: 6, textAlign: 'right' }}>
                    {urdu ? 'نماز کا وقت قریب آ رہا ہے' : 'Prayer time approaching'} •
                    <Text style={{ color: meta.color }}> {urdu ? 'تفصیل' : ' View all'} →</Text>
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })()}

          {/* DAILY HADITH — premium card */}
          <View style={{ marginHorizontal: 16, marginTop: 22, backgroundColor: dm ? '#0B2818' : '#1F5C3D', borderRadius: 22, padding: 20, borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)', overflow: 'hidden' }}>
            <Text style={{ position: 'absolute', bottom: -22, left: -14, fontSize: 90, color: 'rgba(212,175,55,0.05)' }}>✦</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 }}>
              <Text style={{ color: '#D4AF37', fontSize: 14, fontWeight: 'bold' }}>📖 {urdu ? 'آج کی حدیث' : 'Daily Hadith'}</Text>
              <View style={{ backgroundColor: 'rgba(212,175,55,0.15)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 }}>
                <Text style={{ color: '#D4AF37', fontSize: 11 }}>{todayIdx} / {HADITH_LIST.length}</Text>
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: 'rgba(212,175,55,0.2)', marginBottom: 15 }} />
            <Text style={{ color: '#D4AF37', fontSize: 17, textAlign: 'right', lineHeight: 30, marginBottom: 11 }}>{todayHadith.arabic}</Text>
            <Text style={{ color: '#e0e0e0', fontSize: 13, lineHeight: 22, fontStyle: 'italic', marginBottom: 9 }}>{urdu ? todayHadith.urdu : todayHadith.english}</Text>
            <Text style={{ color: '#9DB8A0', fontSize: 11, textAlign: 'right' }}>— {todayHadith.source}</Text>
          </View>

          {/* QUICK ACTIONS */}
          <View style={{ marginHorizontal: 16, marginTop: 18, marginBottom: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: subColor, letterSpacing: 1.2, marginBottom: 13, textTransform: 'uppercase' }}>
              {urdu ? 'فوری اعمال' : 'Quick Actions'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setActiveTab('AI')} activeOpacity={0.75} style={{ flex: 1, backgroundColor: cardBg, borderRadius: 17, padding: 15, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: borderColor, elevation: 1 }}>
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#1F5C3D' + '15', justifyContent: 'center', alignItems: 'center', marginRight: 11 }}>
                  <Ionicons name="chatbubble-ellipses" size={20} color="#1F5C3D" />
                </View>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: textColor }}>Hidaya AI</Text>
                  <Text style={{ fontSize: 10, color: subColor, marginTop: 1 }}>{urdu ? 'سوال پوچھیں' : 'Ask anything'}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveTab('Quotes')} activeOpacity={0.75} style={{ flex: 1, backgroundColor: cardBg, borderRadius: 17, padding: 15, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: borderColor, elevation: 1 }}>
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#1F5C3D' + '15', justifyContent: 'center', alignItems: 'center', marginRight: 11 }}>
                  <Ionicons name="sparkles" size={20} color="#1F5C3D" />
                </View>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: textColor }}>{urdu ? 'اقوال' : 'Quotes'}</Text>
                  <Text style={{ fontSize: 10, color: subColor, marginTop: 1 }}>{urdu ? 'شیئر کریں' : 'Share & inspire'}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      );
    }

    if (activeTab === 'Prayer') return <PrayerScreen urdu={urdu} darkMode={darkMode} onBack={() => setActiveTab('Home')} />;
    if (activeTab === 'Qibla') return <QiblaScreen urdu={urdu} darkMode={darkMode} onBack={() => setActiveTab('Home')} />;
    if (activeTab === 'Salah') return <SalahTrackerScreen urdu={urdu} darkMode={darkMode} onBack={() => setActiveTab('Home')} />;
    if (activeTab === 'Zakat') return <ZakatScreen urdu={urdu} darkMode={darkMode} onBack={() => setActiveTab('Home')} />;
    if (activeTab === 'Azan') return <AzanScreen urdu={urdu} darkMode={darkMode} onBack={() => setActiveTab('Home')} />;
    if (activeTab === 'AI') return <HidayaAIScreen urdu={urdu} darkMode={darkMode} onBack={() => setActiveTab('Home')} />;
    if (activeTab === 'Quotes') return <IslamicQuotesScreen urdu={urdu} darkMode={darkMode} onBack={() => setActiveTab('Home')} />;

    // ── TASBEEH ──
    if (activeTab === 'Tasbeeh') {
      const current = allTasbeeh[selectedTasbeeh] || allTasbeeh[0];
      const progress = Math.min((count / current.target) * 100, 100);
      const completed = count >= current.target;
      return (
        <View style={{ flex: 1, backgroundColor: pageBg }}>
          <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
              <View style={{ backgroundColor: cardBg, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingBottom: 40 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: borderColor, alignSelf: 'center', marginBottom: 18 }} />
                <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#1F5C3D', marginBottom: 22, textAlign: 'center' }}>{urdu ? '➕ اپنا وظیفہ شامل کریں' : '➕ Add Custom Wazifa'}</Text>
                <Text style={{ fontSize: 12.5, color: subColor, marginBottom: 7, fontWeight: '600' }}>{urdu ? 'نام' : 'Name'}</Text>
                <TextInput style={{ backgroundColor: sectionBg, borderRadius: 13, paddingHorizontal: 15, height: 48, marginBottom: 14, color: textColor, fontSize: 14.5, borderWidth: 1, borderColor: borderColor }} placeholder={urdu ? 'مثلاً: یا شافی' : 'e.g. Ya Shafi'} placeholderTextColor={mutedColor} value={newName} onChangeText={setNewName} />
                <Text style={{ fontSize: 12.5, color: subColor, marginBottom: 7, fontWeight: '600' }}>{urdu ? 'عربی عبارت (اختیاری)' : 'Arabic Text (optional)'}</Text>
                <TextInput style={{ backgroundColor: sectionBg, borderRadius: 13, paddingHorizontal: 15, height: 48, marginBottom: 14, color: textColor, textAlign: 'right', fontSize: 14.5, borderWidth: 1, borderColor: borderColor }} placeholder="يَا شَافِي" placeholderTextColor={mutedColor} value={newArabic} onChangeText={setNewArabic} />
                <Text style={{ fontSize: 12.5, color: subColor, marginBottom: 7, fontWeight: '600' }}>{urdu ? 'تعداد (ہدف)' : 'Count Target'}</Text>
                <TextInput style={{ backgroundColor: sectionBg, borderRadius: 13, paddingHorizontal: 15, height: 48, marginBottom: 22, color: textColor, fontSize: 14.5, borderWidth: 1, borderColor: borderColor }} placeholder="100" placeholderTextColor={mutedColor} keyboardType="numeric" value={newTarget} onChangeText={setNewTarget} />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity activeOpacity={0.75} style={{ flex: 1, backgroundColor: sectionBg, borderRadius: 15, height: 51, justifyContent: 'center', alignItems: 'center' }} onPress={() => setShowAddModal(false)}>
                    <Text style={{ color: subColor, fontSize: 14.5, fontWeight: '600' }}>{urdu ? 'منسوخ' : 'Cancel'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity activeOpacity={0.85} style={{ flex: 1, backgroundColor: '#1F5C3D', borderRadius: 15, height: 51, justifyContent: 'center', alignItems: 'center' }} onPress={addCustomTasbeeh}>
                    <Text style={{ color: '#D4AF37', fontWeight: 'bold', fontSize: 14.5 }}>{urdu ? 'شامل کریں' : 'Add'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <View style={{ backgroundColor: dm ? '#0B2818' : '#1F5C3D', padding: 30, alignItems: 'center', paddingTop: 60, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden' }}>
              <Text style={{ position: 'absolute', top: -18, left: -14, fontSize: 100, color: 'rgba(212,175,55,0.06)' }}>✦</Text>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(212,175,55,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
                <MaterialCommunityIcons name="dots-horizontal-circle" size={28} color="#D4AF37" />
              </View>
              <Text style={{ color: '#fff', fontSize: 26, fontWeight: 'bold', marginTop: 6 }}>{urdu ? 'تسبیح کاؤنٹر' : 'Tasbeeh Counter'}</Text>
            </View>
            <View style={{ backgroundColor: cardBg, margin: 16, marginTop: 18, borderRadius: 22, padding: 22, alignItems: 'center', borderWidth: 1, borderColor: borderColor }}>
              <Text style={{ fontSize: 27, color: '#1F5C3D', marginBottom: 5 }}>{current.arabic}</Text>
              <Text style={{ fontSize: 15, color: subColor, marginBottom: 16, fontWeight: '500' }}>{urdu ? (current.nameUr || current.name) : current.name}</Text>
              <View style={{ width: '100%', height: 8, backgroundColor: dm ? '#333' : '#e8e8e8', borderRadius: 4, marginBottom: 9, overflow: 'hidden' }}>
                <View style={{ height: 8, backgroundColor: completed ? '#D4AF37' : '#2d6a4f', borderRadius: 4, width: progress + '%' }} />
              </View>
              <Text style={{ fontSize: 12.5, color: mutedColor, marginBottom: 10 }}>{count + ' / ' + current.target}</Text>
              {completed && (
                <View style={{ backgroundColor: 'rgba(212,175,55,0.12)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14, marginBottom: 6 }}>
                  <Text style={{ fontSize: 13.5, color: '#a98520', fontWeight: 'bold' }}>{urdu ? '✅ ما شاء اللہ! مکمل!' : '✅ Masha Allah! Complete!'}</Text>
                </View>
              )}
              <TouchableOpacity activeOpacity={0.85} style={{ width: 184, height: 184, borderRadius: 92, backgroundColor: '#1F5C3D', justifyContent: 'center', alignItems: 'center', marginVertical: 22, elevation: 6, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, borderWidth: 4, borderColor: dm ? '#16361f' : '#2d6a4f' }} onPress={handleCount}>
                <Text style={{ color: '#D4AF37', fontSize: 58, fontWeight: 'bold' }}>{count}</Text>
                <Text style={{ color: '#9DB8A0', fontSize: 12.5, marginTop: 5 }}>{urdu ? 'گننے کے لیے دبائیں' : 'Tap to count'}</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.75} style={{ backgroundColor: sectionBg, paddingHorizontal: 40, paddingVertical: 12, borderRadius: 25, borderWidth: 1, borderColor: borderColor }} onPress={() => setCount(0)}>
                <Text style={{ color: subColor, fontSize: 14, fontWeight: '600' }}>{urdu ? 'ری سیٹ' : 'Reset'}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ backgroundColor: cardBg, marginHorizontal: 16, borderRadius: 20, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: borderColor }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 }}>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1F5C3D' }}>{urdu ? 'تسبیح منتخب کریں' : 'Select Tasbeeh'}</Text>
                <TouchableOpacity onPress={() => setShowAddModal(true)} activeOpacity={0.8} style={{ backgroundColor: '#1F5C3D', paddingHorizontal: 13, paddingVertical: 7, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons name="add" size={13} color="#D4AF37" />
                  <Text style={{ color: '#D4AF37', fontSize: 12.5, fontWeight: 'bold' }}>{urdu ? 'اپنا وظیفہ' : 'Custom'}</Text>
                </TouchableOpacity>
              </View>
              {allTasbeeh.map((item, index) => (
                <View key={item.id || index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <TouchableOpacity activeOpacity={0.75} style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 13, borderRadius: 14, backgroundColor: selectedTasbeeh === index ? '#1F5C3D' : sectionBg }} onPress={() => { setSelectedTasbeeh(index); setCount(0); }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '600', color: selectedTasbeeh === index ? '#fff' : textColor }}>{urdu ? (item.nameUr || item.name) : item.name}</Text>
                      <Text style={{ fontSize: 12.5, color: selectedTasbeeh === index ? '#9DB8A0' : mutedColor, marginTop: 2 }}>{item.arabic}</Text>
                    </View>
                    <Text style={{ fontSize: 12.5, color: selectedTasbeeh === index ? '#D4AF37' : mutedColor, fontWeight: '600' }}>×{item.target}</Text>
                  </TouchableOpacity>
                  {item.custom && (
                    <TouchableOpacity onPress={() => Alert.alert(urdu ? 'حذف کریں؟' : 'Delete?', urdu ? 'کیا آپ یہ تسبیح حذف کرنا چاہتے ہیں؟' : 'Delete this tasbeeh?',
                      [{ text: urdu ? 'منسوخ' : 'Cancel', style: 'cancel' }, { text: urdu ? 'حذف' : 'Delete', style: 'destructive', onPress: () => deleteCustomTasbeeh(item.id) }])} style={{ marginLeft: 8, padding: 8 }}>
                      <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      );
    }

    // ── DUAS ──
    if (activeTab === 'Duas') {
      return (
        <View style={{ flex: 1, backgroundColor: pageBg }}>
          <View style={{ backgroundColor: dm ? '#0B2818' : '#1F5C3D', padding: 26, alignItems: 'center', paddingTop: 60, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden' }}>
            <Text style={{ position: 'absolute', top: -16, right: -12, fontSize: 90, color: 'rgba(212,175,55,0.06)' }}>✦</Text>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(212,175,55,0.13)', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="reader" size={24} color="#D4AF37" />
            </View>
            <Text style={{ color: '#fff', fontSize: 23, fontWeight: 'bold' }}>{urdu ? 'دعاؤں کا مجموعہ' : 'Duas Collection'}</Text>
            <Text style={{ color: '#9DB8A0', fontSize: 12.5, marginTop: 4 }}>{urdu ? 'مستند دعائیں' : 'Verified Duas'}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: cardBg, maxHeight: 58, borderBottomWidth: 1, borderBottomColor: borderColor }} contentContainerStyle={{ paddingHorizontal: 15, paddingVertical: 11, gap: 8 }}>
            {categories.map((cat) => {
              const uc = DUAS_LIST.find(d => d.category === cat)?.categoryUr || cat;
              const isSel = selectedCat === cat;
              return (
                <TouchableOpacity key={cat} activeOpacity={0.75} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, backgroundColor: isSel ? '#1F5C3D' : sectionBg, marginRight: 8, borderWidth: isSel ? 0 : 1, borderColor: borderColor }} onPress={() => setSelectedCat(cat)}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: isSel ? '#D4AF37' : textColor }}>{urdu ? uc : cat}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 15 }} showsVerticalScrollIndicator={false}>
            {filteredDuas.map((dua) => (
              <View key={dua.id} style={{ backgroundColor: cardBg, borderRadius: 18, marginBottom: 13, borderWidth: 1, borderColor: borderColor, overflow: 'hidden' }}>
                <View style={{ paddingHorizontal: 16, paddingTop: 13, paddingBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#D4AF37', marginRight: 8 }} />
                  <Text style={{ fontSize: 14.5, fontWeight: 'bold', color: '#1F5C3D', flex: 1 }}>{urdu ? dua.nameUr : dua.name}</Text>
                </View>
                <View style={{ paddingHorizontal: 16, paddingBottom: 15 }}>
                  <Text style={{ fontSize: 19, color: dm ? '#e0e0e0' : '#1a1a1a', textAlign: 'right', lineHeight: 32, marginBottom: 10 }}>{dua.arabic}</Text>
                  <View style={{ height: 1, backgroundColor: borderColor, marginBottom: 10 }} />
                  <Text style={{ fontSize: 13, color: subColor, lineHeight: 20, fontStyle: 'italic' }}>{urdu ? dua.translationUr : dua.translation}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      );
    }

    // ── NAMES ──
    if (activeTab === 'Names') {
      return (
        <ScrollView style={{ flex: 1, backgroundColor: pageBg }}>
          <View style={{ backgroundColor: dm ? '#0B2818' : '#1F5C3D', padding: 30, alignItems: 'center', paddingTop: 60, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
            <Text style={{ color: '#D4AF37', fontSize: 16, marginBottom: 4 }}>اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ</Text>
            <Text style={{ color: '#fff', fontSize: 26, fontWeight: 'bold' }}>{urdu ? 'اللہ کے 99 نام' : '99 Names of Allah'}</Text>
            <Text style={{ color: '#9DB8A0', fontSize: 14, marginTop: 4 }}>{urdu ? 'اسماء الحسنیٰ' : 'Asma ul Husna'}</Text>
          </View>
          <View style={{ padding: 15 }}>
            {NAMES_OF_ALLAH.map((item) => (
              <View key={item.id} style={{ backgroundColor: cardBg, borderRadius: 16, padding: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: borderColor }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#1F5C3D', justifyContent: 'center', alignItems: 'center', marginRight: 15 }}>
                  <Text style={{ color: '#D4AF37', fontSize: 13, fontWeight: 'bold' }}>{item.id}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 20, color: '#1F5C3D', textAlign: 'right', marginBottom: 4 }}>{item.arabic}</Text>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: textColor, marginBottom: 2 }}>{item.name}</Text>
                  <Text style={{ fontSize: 12, color: subColor, fontStyle: 'italic' }}>{urdu ? item.meaningUr : item.meaning}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      );
    }

    // ── CALENDAR ──
    if (activeTab === 'Calendar') {
      const today = moment().add(hijriAdjustment, 'days');
      const hd = today.iDate(), hm = today.iMonth(), hy = today.iYear();
      const hmEn = ['Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani', 'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', 'Shaban', 'Ramadan', 'Shawwal', 'Dhul Qadah', 'Dhul Hijjah'];
      const hmUr = ['محرم', 'صفر', 'ربیع الاول', 'ربیع الثانی', 'جمادی الاول', 'جمادی الثانی', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذی قعدہ', 'ذی الحجہ'];
      const dm2 = urdu ? hmUr[hm] : hmEn[hm];
      const events = [
        { month: 0, day: 1, nameEn: '🌙 Islamic New Year', nameUr: '🌙 اسلامی نیا سال' },
        { month: 0, day: 10, nameEn: '🕊️ Day of Ashura', nameUr: '🕊️ یوم عاشورہ' },
        { month: 2, day: 12, nameEn: '💚 Mawlid an-Nabi', nameUr: '💚 عید میلاد النبی ﷺ' },
        { month: 6, day: 27, nameEn: '✨ Isra Wal Miraj', nameUr: '✨ اسراء و معراج' },
        { month: 7, day: 15, nameEn: '🌟 Shab e Barat', nameUr: '🌟 شب براءت' },
        { month: 8, day: 1, nameEn: '🌙 Ramadan Begins', nameUr: '🌙 رمضان کا آغاز' },
        { month: 8, day: 27, nameEn: '⭐ Laylatul Qadr', nameUr: '⭐ لیلۃ القدر' },
        { month: 9, day: 1, nameEn: '🎉 Eid ul Fitr', nameUr: '🎉 عید الفطر' },
        { month: 11, day: 9, nameEn: '🕋 Day of Arafah', nameUr: '🕋 یوم عرفہ' },
        { month: 11, day: 10, nameEn: '🎉 Eid ul Adha', nameUr: '🎉 عید الاضحیٰ' },
      ];
      return (
        <ScrollView style={{ flex: 1, backgroundColor: pageBg }} showsVerticalScrollIndicator={false}>
          <View style={{ backgroundColor: dm ? '#0B2818' : '#1F5C3D', padding: 30, alignItems: 'center', paddingTop: 60, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden' }}>
            <Text style={{ position: 'absolute', top: -18, right: -12, fontSize: 100, color: 'rgba(212,175,55,0.06)' }}>✦</Text>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(212,175,55,0.13)', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="calendar" size={27} color="#D4AF37" />
            </View>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 6 }}>{urdu ? 'اسلامی کیلنڈر' : 'Islamic Calendar'}</Text>
          </View>
          <View style={{ backgroundColor: dm ? '#0B2818' : '#1F5C3D', margin: 16, marginTop: 18, borderRadius: 22, padding: 26, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(212,175,55,0.22)' }}>
            <Text style={{ color: '#9DB8A0', fontSize: 13, marginBottom: 5 }}>{urdu ? 'آج' : 'Today'}</Text>
            <Text style={{ color: '#fff', fontSize: 13.5, marginBottom: 16 }}>{today.format('dddd, MMMM D, YYYY')}</Text>
            <View style={{ width: 56, height: 2, backgroundColor: '#D4AF37', marginBottom: 16, opacity: 0.6 }} />
            <Text style={{ color: '#D4AF37', fontSize: 60, fontWeight: 'bold', lineHeight: 66 }}>{hd}</Text>
            <Text style={{ color: '#fff', fontSize: 19, marginTop: 6, fontWeight: '600' }}>{dm2} {hy} {urdu ? 'ہجری' : 'AH'}</Text>

            {/* Manual adjustment for moon-sighting differences */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 17, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 15, padding: 4 }}>
              <TouchableOpacity onPress={() => setHijriAdjustment(a => a - 1)} activeOpacity={0.75} style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
                <Ionicons name="remove" size={17} color="#D4AF37" />
              </TouchableOpacity>
              <Text style={{ color: '#9DB8A0', fontSize: 11, paddingHorizontal: 6 }}>
                {urdu ? 'تاریخ ایڈجسٹ کریں' : 'Adjust Date'} {hijriAdjustment !== 0 ? `(${hijriAdjustment > 0 ? '+' : ''}${hijriAdjustment})` : ''}
              </Text>
              <TouchableOpacity onPress={() => setHijriAdjustment(a => a + 1)} activeOpacity={0.75} style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
                <Ionicons name="add" size={17} color="#D4AF37" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Info note about moon-sighting */}
          <View style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: dm ? '#1a2e1a' : '#fff8e1', borderRadius: 15, padding: 14, borderWidth: 1, borderColor: dm ? '#2a4a2a' : '#ffe082', flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <Ionicons name="moon" size={15} color={dm ? '#D4AF37' : '#f9a825'} style={{ marginTop: 1 }} />
            <Text style={{ color: dm ? '#D4AF37' : '#7a6000', fontSize: 11.5, flex: 1, lineHeight: 17 }}>
              {urdu
                ? 'یہ تاریخ حسابی طریقے سے ہے، چاند دیکھنے کے اعلان سے 1 دن آگے یا پیچھے ہو سکتی ہے۔ اوپر سے درست کریں۔'
                : 'This date is calculated, not based on moon sighting — it may differ by ±1 day from official announcements. Adjust above if needed.'}
            </Text>
          </View>

          <View style={{ backgroundColor: cardBg, marginHorizontal: 16, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: borderColor }}>
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1F5C3D', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 13 }}>⭐ {urdu ? 'اہم اسلامی واقعات' : 'Islamic Events'}</Text>
            {events.map((ev, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: idx < events.length - 1 ? 1 : 0, borderBottomColor: borderColor }}>
                <View style={{ width: 35, height: 35, borderRadius: 17.5, backgroundColor: ev.month === hm ? '#1F5C3D' : sectionBg, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                  <Text style={{ fontSize: 12.5, fontWeight: 'bold', color: ev.month === hm ? '#D4AF37' : textColor }}>{ev.day}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, color: textColor }}>{urdu ? ev.nameUr : ev.nameEn}</Text>
                  <Text style={{ fontSize: 10.5, color: subColor, marginTop: 2 }}>{urdu ? hmUr[ev.month] : hmEn[ev.month]}</Text>
                </View>
              </View>
            ))}
          </View>
          <View style={{ height: 30 }} />
        </ScrollView>
      );
    }

    if (activeTab === 'Masjid') return <MasjidFinderScreen urdu={urdu} darkMode={darkMode} onBack={() => setActiveTab('Home')} />;
    if (activeTab === 'MuslimNames') return <MuslimNamesScreen urdu={urdu} darkMode={darkMode} onBack={() => setActiveTab('Home')} />;
    if (activeTab === 'Hajj') return <HajjUmrahGuideScreen urdu={urdu} darkMode={darkMode} onBack={() => setActiveTab('Home')} />;
    if (activeTab === 'Quiz') return <IslamicQuizScreen urdu={urdu} darkMode={darkMode} onBack={() => setActiveTab('Home')} />;
    if (activeTab === 'Seerah') return <SeerahScreen urdu={urdu} darkMode={darkMode} onBack={() => setActiveTab('Home')} />;
    if (activeTab === 'Stories') return <IslamicStoriesScreen urdu={urdu} darkMode={darkMode} onBack={() => setActiveTab('Home')} />;
    if (activeTab === 'Settings') return <SettingsScreen urdu={urdu} setUrdu={setUrdu} darkMode={darkMode} setDarkMode={setDarkMode} />;

    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: pageBg, padding: 30 }}>
        <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#1F5C3D' + '22', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 2, borderColor: '#1F5C3D' + '44' }}>
          <Ionicons name="construct" size={44} color="#1F5C3D" />
        </View>
        <Text style={{ fontSize: 22, fontWeight: 'bold', color: dm ? '#e0e0e0' : '#1F5C3D', marginTop: 10, textAlign: 'center' }}>{urdu ? 'جلد آ رہا ہے' : 'Coming Soon'}</Text>
        <Text style={{ color: subColor, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>{urdu ? 'یہ خصوصیت جلد دستیاب ہوگی۔ ہدایت کو استعمال کرتے رہیں!' : 'This feature will be available soon. Keep using Hidaya!'}</Text>
        <TouchableOpacity onPress={() => setActiveTab('Home')} style={{ marginTop: 24, backgroundColor: '#1F5C3D', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 12 }}>
          <Text style={{ color: '#D4AF37', fontWeight: 'bold', fontSize: 15 }}>{urdu ? 'ہوم پر جائیں' : 'Go to Home'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const mainAppUI = (
    <View style={{
      flex: 1,
      backgroundColor: pageBg,
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <StatusBar style={darkMode ? 'light' : 'dark'} backgroundColor={darkMode ? '#0a0a0a' : '#1F5C3D'} translucent={false} />

      {/* SPLASH SCREEN — shown on first launch */}
      {showSplash && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, backgroundColor: pageBg, width: '100%', height: '100%' }}>
          <SplashScreen onFinish={() => setShowSplash(false)} />
        </View>
      )}

      {/* ONBOARDING — shown only once on fresh install */}
      {!showSplash && showOnboarding && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998, backgroundColor: pageBg, width: '100%', height: '100%' }}>
          <OnboardingScreen urdu={urdu} onDone={() => setShowOnboarding(false)} />
        </View>
      )}

      {/* MAIN CONTENT AREA — LOCKED SCROLL CONTAINER */}
      <View style={{
        flex: 1,
        width: '100%',
        height: '100%',
        minHeight: 0,
        flexShrink: 1,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: pageBg,
      }}>
        {renderScreen()}
      </View>

      {/* PREMIUM TAB BAR — PINNED AT BOTTOM EXTENDING TO SCREEN EDGE */}
      <View style={{
        flexDirection: 'row',
        backgroundColor: dm ? '#121212' : '#FFFFFF',
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 6),
        borderTopWidth: 1,
        borderTopColor: dm ? '#222222' : '#E8E8E8',
        elevation: 20,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        flexShrink: 0,
        zIndex: 1000,
        width: '100%',
        marginBottom: 0,
      }}>
        {tabs.map((tab) => {
          const isMainTab = ['Home', 'Prayer', 'AI', 'Duas', 'Settings'].includes(activeTab);
          const isAct = activeTab === tab || (tab === 'Home' && !isMainTab);
          const color = isAct ? (dm ? '#D4AF37' : '#1F5C3D') : (dm ? '#666666' : '#999999');
          const indicatorColor = dm ? '#D4AF37' : '#1F5C3D';
          const label =
            tab === 'Home' ? (urdu ? 'ہوم' : 'Home') :
            tab === 'Prayer' ? (urdu ? 'نماز' : 'Prayer') :
            tab === 'AI' ? 'AI' :
            tab === 'Duas' ? (urdu ? 'دعائیں' : 'Duas') :
            (urdu ? 'سیٹنگ' : 'Settings');
          const iconName =
            tab === 'Home' ? (isAct ? 'home' : 'home-outline') :
            tab === 'Prayer' ? (isAct ? 'time' : 'time-outline') :
            tab === 'AI' ? (isAct ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline') :
            tab === 'Duas' ? (isAct ? 'reader' : 'reader-outline') :
            (isAct ? 'settings' : 'settings-outline');
          return (
            <TouchableOpacity key={tab} style={{ flex: 1, alignItems: 'center', paddingVertical: 2 }} onPress={() => setActiveTab(tab)}>
              <View style={{ width: isAct ? 24 : 0, height: 3, borderRadius: 2, backgroundColor: indicatorColor, marginBottom: 4 }} />
              <Ionicons name={iconName} size={22} color={color} />
              <Text style={{ color, fontSize: 10, marginTop: 2, fontWeight: isAct ? 'bold' : 'normal' }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const { width } = useWindowDimensions();
  if (Platform.OS === 'web') {
    const isDesktop = width > 500;
    if (!isDesktop) return mainAppUI;

    return (
      <View style={{
        flex: 1,
        width: '100%',
        height: '100%',
        backgroundColor: '#071a10',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <View style={{
          width: '100%',
          maxWidth: 480,
          height: '100%',
          backgroundColor: pageBg,
          boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,175,55,0.25)',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {mainAppUI}
        </View>
      </View>
    );
  }

  return mainAppUI;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}