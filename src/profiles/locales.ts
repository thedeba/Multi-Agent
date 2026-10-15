// Comprehensive Global Language and Timezone Registry for Multi Agent
// Covers all countries A-Z with country flags, official locale codes, and standard IANA timezones.

export interface LanguageOption {
  code: string;
  name: string;
  country: string;
  flag: string;
  nativeName?: string;
}

export interface TimezoneOption {
  id: string;
  label: string;
  country: string;
  flag: string;
  offset: string;
  region: 'Popular' | 'Africa' | 'Americas' | 'Asia' | 'Europe' | 'Oceania & Pacific' | 'Universal & Islands';
}

export const POPULAR_LANGUAGES: LanguageOption[] = [
  {
    "code": "en-US",
    "name": "English (United States)",
    "country": "United States",
    "flag": "🇺🇸",
    "nativeName": "English (US)"
  },
  {
    "code": "en-GB",
    "name": "English (United Kingdom)",
    "country": "United Kingdom",
    "flag": "🇬🇧",
    "nativeName": "English (UK)"
  },
  {
    "code": "bn-BD",
    "name": "Bengali (Bangladesh)",
    "country": "Bangladesh",
    "flag": "🇧🇩",
    "nativeName": "বাংলা (বাংলাদেশ)"
  },
  {
    "code": "hi-IN",
    "name": "Hindi (India)",
    "country": "India",
    "flag": "🇮🇳",
    "nativeName": "हिन्दी (भारत)"
  },
  {
    "code": "es-ES",
    "name": "Spanish (Spain)",
    "country": "Spain",
    "flag": "🇪🇸",
    "nativeName": "Español (España)"
  },
  {
    "code": "es-MX",
    "name": "Spanish (Mexico)",
    "country": "Mexico",
    "flag": "🇲🇽",
    "nativeName": "Español (México)"
  },
  {
    "code": "fr-FR",
    "name": "French (France)",
    "country": "France",
    "flag": "🇫🇷",
    "nativeName": "Français (France)"
  },
  {
    "code": "de-DE",
    "name": "German (Germany)",
    "country": "Germany",
    "flag": "🇩🇪",
    "nativeName": "Deutsch (Deutschland)"
  },
  {
    "code": "it-IT",
    "name": "Italian (Italy)",
    "country": "Italy",
    "flag": "🇮🇹",
    "nativeName": "Italiano (Italia)"
  },
  {
    "code": "pt-BR",
    "name": "Portuguese (Brazil)",
    "country": "Brazil",
    "flag": "🇧🇷",
    "nativeName": "Português (Brasil)"
  },
  {
    "code": "ru-RU",
    "name": "Russian (Russia)",
    "country": "Russia",
    "flag": "🇷🇺",
    "nativeName": "Русский (Россия)"
  },
  {
    "code": "zh-CN",
    "name": "Chinese (Simplified)",
    "country": "China",
    "flag": "🇨🇳",
    "nativeName": "简体中文 (中国)"
  },
  {
    "code": "zh-HK",
    "name": "Chinese (Hong Kong)",
    "country": "Hong Kong",
    "flag": "🇭🇰",
    "nativeName": "繁體中文 (香港)"
  },
  {
    "code": "zh-TW",
    "name": "Chinese (Taiwan)",
    "country": "Taiwan",
    "flag": "🇹🇼",
    "nativeName": "繁體中文 (台灣)"
  },
  {
    "code": "ja-JP",
    "name": "Japanese (Japan)",
    "country": "Japan",
    "flag": "🇯🇵",
    "nativeName": "日本語 (日本)"
  },
  {
    "code": "ko-KR",
    "name": "Korean (South Korea)",
    "country": "South Korea",
    "flag": "🇰🇷",
    "nativeName": "한국어 (대한민국)"
  },
  {
    "code": "ar-SA",
    "name": "Arabic (Saudi Arabia)",
    "country": "Saudi Arabia",
    "flag": "🇸🇦",
    "nativeName": "العربية (السعودية)"
  },
  {
    "code": "ar-AE",
    "name": "Arabic (UAE)",
    "country": "United Arab Emirates",
    "flag": "🇦🇪",
    "nativeName": "العربية (الإمارات)"
  },
  {
    "code": "tr-TR",
    "name": "Turkish (Turkey)",
    "country": "Turkey",
    "flag": "🇹🇷",
    "nativeName": "Türkçe (Türkiye)"
  },
  {
    "code": "nl-NL",
    "name": "Dutch (Netherlands)",
    "country": "Netherlands",
    "flag": "🇳🇱",
    "nativeName": "Nederlands (Nederland)"
  },
  {
    "code": "pl-PL",
    "name": "Polish (Poland)",
    "country": "Poland",
    "flag": "🇵🇱",
    "nativeName": "Polski (Polska)"
  },
  {
    "code": "vi-VN",
    "name": "Vietnamese (Vietnam)",
    "country": "Vietnam",
    "flag": "🇻🇳",
    "nativeName": "Tiếng Việt (Việt Nam)"
  },
  {
    "code": "id-ID",
    "name": "Indonesian (Indonesia)",
    "country": "Indonesia",
    "flag": "🇮🇩",
    "nativeName": "Bahasa Indonesia"
  },
  {
    "code": "th-TH",
    "name": "Thai (Thailand)",
    "country": "Thailand",
    "flag": "🇹🇭",
    "nativeName": "ไทย (ประเทศไทย)"
  },
  {
    "code": "ur-PK",
    "name": "Urdu (Pakistan)",
    "country": "Pakistan",
    "flag": "🇵🇰",
    "nativeName": "اردو (پاکستان)"
  },
  {
    "code": "uk-UA",
    "name": "Ukrainian (Ukraine)",
    "country": "Ukraine",
    "flag": "🇺🇦",
    "nativeName": "Українська"
  },
  {
    "code": "sv-SE",
    "name": "Swedish (Sweden)",
    "country": "Sweden",
    "flag": "🇸🇪",
    "nativeName": "Svenska"
  },
  {
    "code": "nb-NO",
    "name": "Norwegian (Norway)",
    "country": "Norway",
    "flag": "🇳🇴",
    "nativeName": "Norsk"
  },
  {
    "code": "da-DK",
    "name": "Danish (Denmark)",
    "country": "Denmark",
    "flag": "🇩🇰",
    "nativeName": "Dansk"
  },
  {
    "code": "fi-FI",
    "name": "Finnish (Finland)",
    "country": "Finland",
    "flag": "🇫🇮",
    "nativeName": "Suomi"
  },
  {
    "code": "el-GR",
    "name": "Greek (Greece)",
    "country": "Greece",
    "flag": "🇬🇷",
    "nativeName": "Ελληνικά"
  },
  {
    "code": "he-IL",
    "name": "Hebrew (Israel)",
    "country": "Israel",
    "flag": "🇮🇱",
    "nativeName": "עברית"
  },
  {
    "code": "ro-RO",
    "name": "Romanian (Romania)",
    "country": "Romania",
    "flag": "🇷🇴",
    "nativeName": "Română"
  },
  {
    "code": "cs-CZ",
    "name": "Czech (Czechia)",
    "country": "Czech Republic",
    "flag": "🇨🇿",
    "nativeName": "Čeština"
  },
  {
    "code": "hu-HU",
    "name": "Hungarian (Hungary)",
    "country": "Hungary",
    "flag": "🇭🇺",
    "nativeName": "Magyar"
  }
];

export const ALL_LANGUAGES: LanguageOption[] = [
  {
    "code": "ps-AF",
    "name": "Pashto",
    "country": "Afghanistan",
    "flag": "🇦🇫",
    "nativeName": "پښتو"
  },
  {
    "code": "sq-AL",
    "name": "Albanian",
    "country": "Albania",
    "flag": "🇦🇱",
    "nativeName": "Shqip"
  },
  {
    "code": "ar-DZ",
    "name": "Arabic (Algeria)",
    "country": "Algeria",
    "flag": "🇩🇿",
    "nativeName": "العربية"
  },
  {
    "code": "ca-AD",
    "name": "Catalan",
    "country": "Andorra",
    "flag": "🇦🇩",
    "nativeName": "Català"
  },
  {
    "code": "pt-AO",
    "name": "Portuguese (Angola)",
    "country": "Angola",
    "flag": "🇦🇴",
    "nativeName": "Português"
  },
  {
    "code": "en-AG",
    "name": "English (Antigua)",
    "country": "Antigua and Barbuda",
    "flag": "🇦🇬",
    "nativeName": "English"
  },
  {
    "code": "es-AR",
    "name": "Spanish (Argentina)",
    "country": "Argentina",
    "flag": "🇦🇷",
    "nativeName": "Español"
  },
  {
    "code": "hy-AM",
    "name": "Armenian",
    "country": "Armenia",
    "flag": "🇦🇲",
    "nativeName": "Հայերեն"
  },
  {
    "code": "en-AU",
    "name": "English (Australia)",
    "country": "Australia",
    "flag": "🇦🇺",
    "nativeName": "English"
  },
  {
    "code": "de-AT",
    "name": "German (Austria)",
    "country": "Austria",
    "flag": "🇦🇹",
    "nativeName": "Deutsch"
  },
  {
    "code": "az-AZ",
    "name": "Azerbaijani",
    "country": "Azerbaijan",
    "flag": "🇦🇿",
    "nativeName": "Azərbaycan"
  },
  {
    "code": "en-BS",
    "name": "English (Bahamas)",
    "country": "Bahamas",
    "flag": "🇧🇸",
    "nativeName": "English"
  },
  {
    "code": "ar-BH",
    "name": "Arabic (Bahrain)",
    "country": "Bahrain",
    "flag": "🇧🇭",
    "nativeName": "العربية"
  },
  {
    "code": "bn-BD",
    "name": "Bengali (Bangladesh)",
    "country": "Bangladesh",
    "flag": "🇧🇩",
    "nativeName": "বাংলা"
  },
  {
    "code": "en-BB",
    "name": "English (Barbados)",
    "country": "Barbados",
    "flag": "🇧🇧",
    "nativeName": "English"
  },
  {
    "code": "be-BY",
    "name": "Belarusian",
    "country": "Belarus",
    "flag": "🇧🇾",
    "nativeName": "Беларуская"
  },
  {
    "code": "ru-BY",
    "name": "Russian (Belarus)",
    "country": "Belarus",
    "flag": "🇧🇾"
  },
  {
    "code": "nl-BE",
    "name": "Dutch (Belgium)",
    "country": "Belgium",
    "flag": "🇧🇪",
    "nativeName": "Nederlands"
  },
  {
    "code": "fr-BE",
    "name": "French (Belgium)",
    "country": "Belgium",
    "flag": "🇧🇪"
  },
  {
    "code": "en-BZ",
    "name": "English (Belize)",
    "country": "Belize",
    "flag": "🇧🇿",
    "nativeName": "English"
  },
  {
    "code": "fr-BJ",
    "name": "French (Benin)",
    "country": "Benin",
    "flag": "🇧🇯",
    "nativeName": "Français"
  },
  {
    "code": "dz-BT",
    "name": "Dzongkha",
    "country": "Bhutan",
    "flag": "🇧🇹",
    "nativeName": "རྫོང་ཁ"
  },
  {
    "code": "es-BO",
    "name": "Spanish (Bolivia)",
    "country": "Bolivia",
    "flag": "🇧🇴",
    "nativeName": "Español"
  },
  {
    "code": "bs-BA",
    "name": "Bosnian",
    "country": "Bosnia and Herzegovina",
    "flag": "🇧🇦",
    "nativeName": "Bosanski"
  },
  {
    "code": "en-BW",
    "name": "English (Botswana)",
    "country": "Botswana",
    "flag": "🇧🇼",
    "nativeName": "English"
  },
  {
    "code": "pt-BR",
    "name": "Portuguese (Brazil)",
    "country": "Brazil",
    "flag": "🇧🇷",
    "nativeName": "Português"
  },
  {
    "code": "ms-BN",
    "name": "Malay (Brunei)",
    "country": "Brunei",
    "flag": "🇧🇳",
    "nativeName": "Bahasa Melayu"
  },
  {
    "code": "bg-BG",
    "name": "Bulgarian",
    "country": "Bulgaria",
    "flag": "🇧🇬",
    "nativeName": "Български"
  },
  {
    "code": "fr-BF",
    "name": "French (Burkina Faso)",
    "country": "Burkina Faso",
    "flag": "🇧🇫",
    "nativeName": "Français"
  },
  {
    "code": "fr-BI",
    "name": "French (Burundi)",
    "country": "Burundi",
    "flag": "🇧🇮",
    "nativeName": "Français"
  },
  {
    "code": "pt-CV",
    "name": "Portuguese (Cape Verde)",
    "country": "Cabo Verde",
    "flag": "🇨🇻",
    "nativeName": "Português"
  },
  {
    "code": "km-KH",
    "name": "Khmer (Cambodia)",
    "country": "Cambodia",
    "flag": "🇰🇭",
    "nativeName": "ខ្មែរ"
  },
  {
    "code": "fr-CM",
    "name": "French (Cameroon)",
    "country": "Cameroon",
    "flag": "🇨🇲",
    "nativeName": "Français"
  },
  {
    "code": "en-CA",
    "name": "English (Canada)",
    "country": "Canada",
    "flag": "🇨🇦",
    "nativeName": "English"
  },
  {
    "code": "fr-CA",
    "name": "French (Canada)",
    "country": "Canada",
    "flag": "🇨🇦"
  },
  {
    "code": "fr-CF",
    "name": "French (Central African Republic)",
    "country": "Central African Republic",
    "flag": "🇨🇫",
    "nativeName": "Français"
  },
  {
    "code": "fr-TD",
    "name": "French (Chad)",
    "country": "Chad",
    "flag": "🇹🇩",
    "nativeName": "Français"
  },
  {
    "code": "es-CL",
    "name": "Spanish (Chile)",
    "country": "Chile",
    "flag": "🇨🇱",
    "nativeName": "Español"
  },
  {
    "code": "zh-CN",
    "name": "Chinese (Simplified)",
    "country": "China",
    "flag": "🇨🇳",
    "nativeName": "简体中文"
  },
  {
    "code": "es-CO",
    "name": "Spanish (Colombia)",
    "country": "Colombia",
    "flag": "🇨🇴",
    "nativeName": "Español"
  },
  {
    "code": "ar-KM",
    "name": "Arabic (Comoros)",
    "country": "Comoros",
    "flag": "🇰🇲",
    "nativeName": "العربية"
  },
  {
    "code": "fr-CG",
    "name": "French (Congo)",
    "country": "Congo",
    "flag": "🇨🇬",
    "nativeName": "Français"
  },
  {
    "code": "fr-CD",
    "name": "French (DR Congo)",
    "country": "Congo (DRC)",
    "flag": "🇨🇩",
    "nativeName": "Français"
  },
  {
    "code": "es-CR",
    "name": "Spanish (Costa Rica)",
    "country": "Costa Rica",
    "flag": "🇨🇷",
    "nativeName": "Español"
  },
  {
    "code": "hr-HR",
    "name": "Croatian",
    "country": "Croatia",
    "flag": "🇭🇷",
    "nativeName": "Hrvatski"
  },
  {
    "code": "es-CU",
    "name": "Spanish (Cuba)",
    "country": "Cuba",
    "flag": "🇨🇺",
    "nativeName": "Español"
  },
  {
    "code": "el-CY",
    "name": "Greek (Cyprus)",
    "country": "Cyprus",
    "flag": "🇨🇾",
    "nativeName": "Ελληνικά"
  },
  {
    "code": "cs-CZ",
    "name": "Czech",
    "country": "Czech Republic",
    "flag": "🇨🇿",
    "nativeName": "Čeština"
  },
  {
    "code": "da-DK",
    "name": "Danish",
    "country": "Denmark",
    "flag": "🇩🇰",
    "nativeName": "Dansk"
  },
  {
    "code": "fr-DJ",
    "name": "French (Djibouti)",
    "country": "Djibouti",
    "flag": "🇩🇯",
    "nativeName": "Français"
  },
  {
    "code": "en-DM",
    "name": "English (Dominica)",
    "country": "Dominica",
    "flag": "🇩🇲",
    "nativeName": "English"
  },
  {
    "code": "es-DO",
    "name": "Spanish (Dominican Republic)",
    "country": "Dominican Republic",
    "flag": "🇩🇴",
    "nativeName": "Español"
  },
  {
    "code": "es-EC",
    "name": "Spanish (Ecuador)",
    "country": "Ecuador",
    "flag": "🇪🇨",
    "nativeName": "Español"
  },
  {
    "code": "ar-EG",
    "name": "Arabic (Egypt)",
    "country": "Egypt",
    "flag": "🇪🇬",
    "nativeName": "العربية"
  },
  {
    "code": "es-SV",
    "name": "Spanish (El Salvador)",
    "country": "El Salvador",
    "flag": "🇸🇻",
    "nativeName": "Español"
  },
  {
    "code": "es-GQ",
    "name": "Spanish (Equatorial Guinea)",
    "country": "Equatorial Guinea",
    "flag": "🇬🇶",
    "nativeName": "Español"
  },
  {
    "code": "ti-ER",
    "name": "Tigrinya",
    "country": "Eritrea",
    "flag": "🇪🇷",
    "nativeName": "ትግርኛ"
  },
  {
    "code": "et-EE",
    "name": "Estonian",
    "country": "Estonia",
    "flag": "🇪🇪",
    "nativeName": "Eesti"
  },
  {
    "code": "en-SZ",
    "name": "English (Eswatini)",
    "country": "Eswatini",
    "flag": "🇸🇿",
    "nativeName": "English"
  },
  {
    "code": "am-ET",
    "name": "Amharic",
    "country": "Ethiopia",
    "flag": "🇪🇹",
    "nativeName": "አማርኛ"
  },
  {
    "code": "en-FJ",
    "name": "English (Fiji)",
    "country": "Fiji",
    "flag": "🇫🇯",
    "nativeName": "English"
  },
  {
    "code": "fi-FI",
    "name": "Finnish",
    "country": "Finland",
    "flag": "🇫🇮",
    "nativeName": "Suomi"
  },
  {
    "code": "sv-FI",
    "name": "Swedish (Finland)",
    "country": "Finland",
    "flag": "🇫🇮"
  },
  {
    "code": "fr-FR",
    "name": "French (France)",
    "country": "France",
    "flag": "🇫🇷",
    "nativeName": "Français"
  },
  {
    "code": "fr-GA",
    "name": "French (Gabon)",
    "country": "Gabon",
    "flag": "🇬🇦",
    "nativeName": "Français"
  },
  {
    "code": "en-GM",
    "name": "English (Gambia)",
    "country": "Gambia",
    "flag": "🇬🇲",
    "nativeName": "English"
  },
  {
    "code": "ka-GE",
    "name": "Georgian",
    "country": "Georgia",
    "flag": "🇬🇪",
    "nativeName": "ქართული"
  },
  {
    "code": "de-DE",
    "name": "German (Germany)",
    "country": "Germany",
    "flag": "🇩🇪",
    "nativeName": "Deutsch"
  },
  {
    "code": "en-GH",
    "name": "English (Ghana)",
    "country": "Ghana",
    "flag": "🇬🇭",
    "nativeName": "English"
  },
  {
    "code": "el-GR",
    "name": "Greek",
    "country": "Greece",
    "flag": "🇬🇷",
    "nativeName": "Ελληνικά"
  },
  {
    "code": "en-GD",
    "name": "English (Grenada)",
    "country": "Grenada",
    "flag": "🇬🇩",
    "nativeName": "English"
  },
  {
    "code": "es-GT",
    "name": "Spanish (Guatemala)",
    "country": "Guatemala",
    "flag": "🇬🇹",
    "nativeName": "Español"
  },
  {
    "code": "fr-GN",
    "name": "French (Guinea)",
    "country": "Guinea",
    "flag": "🇬🇳",
    "nativeName": "Français"
  },
  {
    "code": "pt-GW",
    "name": "Portuguese (Guinea-Bissau)",
    "country": "Guinea-Bissau",
    "flag": "🇬🇼",
    "nativeName": "Português"
  },
  {
    "code": "en-GY",
    "name": "English (Guyana)",
    "country": "Guyana",
    "flag": "🇬🇾",
    "nativeName": "English"
  },
  {
    "code": "fr-HT",
    "name": "French (Haiti)",
    "country": "Haiti",
    "flag": "🇭🇹",
    "nativeName": "Français"
  },
  {
    "code": "es-HN",
    "name": "Spanish (Honduras)",
    "country": "Honduras",
    "flag": "🇭🇳",
    "nativeName": "Español"
  },
  {
    "code": "zh-HK",
    "name": "Chinese (Hong Kong)",
    "country": "Hong Kong",
    "flag": "🇭🇰",
    "nativeName": "繁體中文"
  },
  {
    "code": "hu-HU",
    "name": "Hungarian",
    "country": "Hungary",
    "flag": "🇭🇺",
    "nativeName": "Magyar"
  },
  {
    "code": "is-IS",
    "name": "Icelandic",
    "country": "Iceland",
    "flag": "🇮🇸",
    "nativeName": "Íslenska"
  },
  {
    "code": "bn-IN",
    "name": "Bengali (India)",
    "country": "India",
    "flag": "🇮🇳"
  },
  {
    "code": "en-IN",
    "name": "English (India)",
    "country": "India",
    "flag": "🇮🇳"
  },
  {
    "code": "hi-IN",
    "name": "Hindi (India)",
    "country": "India",
    "flag": "🇮🇳",
    "nativeName": "हिन्दी"
  },
  {
    "code": "ta-IN",
    "name": "Tamil (India)",
    "country": "India",
    "flag": "🇮🇳"
  },
  {
    "code": "te-IN",
    "name": "Telugu (India)",
    "country": "India",
    "flag": "🇮🇳"
  },
  {
    "code": "id-ID",
    "name": "Indonesian",
    "country": "Indonesia",
    "flag": "🇮🇩",
    "nativeName": "Bahasa Indonesia"
  },
  {
    "code": "fa-IR",
    "name": "Persian",
    "country": "Iran",
    "flag": "🇮🇷",
    "nativeName": "فارسی"
  },
  {
    "code": "ar-IQ",
    "name": "Arabic (Iraq)",
    "country": "Iraq",
    "flag": "🇮🇶",
    "nativeName": "العربية"
  },
  {
    "code": "en-IE",
    "name": "English (Ireland)",
    "country": "Ireland",
    "flag": "🇮🇪",
    "nativeName": "English"
  },
  {
    "code": "he-IL",
    "name": "Hebrew",
    "country": "Israel",
    "flag": "🇮🇱",
    "nativeName": "עברית"
  },
  {
    "code": "it-IT",
    "name": "Italian (Italy)",
    "country": "Italy",
    "flag": "🇮🇹",
    "nativeName": "Italiano"
  },
  {
    "code": "fr-CI",
    "name": "French (Ivory Coast)",
    "country": "Ivory Coast",
    "flag": "🇨🇮",
    "nativeName": "Français"
  },
  {
    "code": "en-JM",
    "name": "English (Jamaica)",
    "country": "Jamaica",
    "flag": "🇯🇲",
    "nativeName": "English"
  },
  {
    "code": "ja-JP",
    "name": "Japanese",
    "country": "Japan",
    "flag": "🇯🇵",
    "nativeName": "日本語"
  },
  {
    "code": "ar-JO",
    "name": "Arabic (Jordan)",
    "country": "Jordan",
    "flag": "🇯🇴",
    "nativeName": "العربية"
  },
  {
    "code": "kk-KZ",
    "name": "Kazakh",
    "country": "Kazakhstan",
    "flag": "🇰🇿",
    "nativeName": "Қазақша"
  },
  {
    "code": "ru-KZ",
    "name": "Russian (Kazakhstan)",
    "country": "Kazakhstan",
    "flag": "🇰🇿"
  },
  {
    "code": "sw-KE",
    "name": "Swahili (Kenya)",
    "country": "Kenya",
    "flag": "🇰🇪",
    "nativeName": "Kiswahili"
  },
  {
    "code": "en-XK",
    "name": "English (Kosovo)",
    "country": "Kosovo",
    "flag": "🇽🇰",
    "nativeName": "English"
  },
  {
    "code": "ar-KW",
    "name": "Arabic (Kuwait)",
    "country": "Kuwait",
    "flag": "🇰🇼",
    "nativeName": "العربية"
  },
  {
    "code": "ky-KG",
    "name": "Kyrgyz",
    "country": "Kyrgyzstan",
    "flag": "🇰🇬",
    "nativeName": "Кыргызча"
  },
  {
    "code": "lo-LA",
    "name": "Lao",
    "country": "Laos",
    "flag": "🇱🇦",
    "nativeName": "ພາສາລາວ"
  },
  {
    "code": "lv-LV",
    "name": "Latvian",
    "country": "Latvia",
    "flag": "🇱🇻",
    "nativeName": "Latviešu"
  },
  {
    "code": "ar-LB",
    "name": "Arabic (Lebanon)",
    "country": "Lebanon",
    "flag": "🇱🇧",
    "nativeName": "العربية"
  },
  {
    "code": "en-LS",
    "name": "English (Lesotho)",
    "country": "Lesotho",
    "flag": "🇱🇸",
    "nativeName": "English"
  },
  {
    "code": "en-LR",
    "name": "English (Liberia)",
    "country": "Liberia",
    "flag": "🇱🇷",
    "nativeName": "English"
  },
  {
    "code": "ar-LY",
    "name": "Arabic (Libya)",
    "country": "Libya",
    "flag": "🇱🇾",
    "nativeName": "العربية"
  },
  {
    "code": "de-LI",
    "name": "German (Liechtenstein)",
    "country": "Liechtenstein",
    "flag": "🇱🇮",
    "nativeName": "Deutsch"
  },
  {
    "code": "lt-LT",
    "name": "Lithuanian",
    "country": "Lithuania",
    "flag": "🇱🇹",
    "nativeName": "Lietuvių"
  },
  {
    "code": "fr-LU",
    "name": "French (Luxembourg)",
    "country": "Luxembourg",
    "flag": "🇱🇺",
    "nativeName": "Français"
  },
  {
    "code": "zh-MO",
    "name": "Chinese (Macau)",
    "country": "Macau",
    "flag": "🇲🇴",
    "nativeName": "繁體中文"
  },
  {
    "code": "mg-MG",
    "name": "Malagasy",
    "country": "Madagascar",
    "flag": "🇲🇬",
    "nativeName": "Malagasy"
  },
  {
    "code": "en-MW",
    "name": "English (Malawi)",
    "country": "Malawi",
    "flag": "🇲🇼",
    "nativeName": "English"
  },
  {
    "code": "ms-MY",
    "name": "Malay (Malaysia)",
    "country": "Malaysia",
    "flag": "🇲🇾",
    "nativeName": "Bahasa Melayu"
  },
  {
    "code": "dv-MV",
    "name": "Dhivehi (Maldives)",
    "country": "Maldives",
    "flag": "🇲🇻",
    "nativeName": "ދިވެހި"
  },
  {
    "code": "fr-ML",
    "name": "French (Mali)",
    "country": "Mali",
    "flag": "🇲🇱",
    "nativeName": "Français"
  },
  {
    "code": "mt-MT",
    "name": "Maltese",
    "country": "Malta",
    "flag": "🇲🇹",
    "nativeName": "Malti"
  },
  {
    "code": "ar-MR",
    "name": "Arabic (Mauritania)",
    "country": "Mauritania",
    "flag": "🇲🇷",
    "nativeName": "العربية"
  },
  {
    "code": "en-MU",
    "name": "English (Mauritius)",
    "country": "Mauritius",
    "flag": "🇲🇺",
    "nativeName": "English"
  },
  {
    "code": "es-MX",
    "name": "Spanish (Mexico)",
    "country": "Mexico",
    "flag": "🇲🇽",
    "nativeName": "Español"
  },
  {
    "code": "ro-MD",
    "name": "Romanian (Moldova)",
    "country": "Moldova",
    "flag": "🇲🇩",
    "nativeName": "Română"
  },
  {
    "code": "fr-MC",
    "name": "French (Monaco)",
    "country": "Monaco",
    "flag": "🇲🇨",
    "nativeName": "Français"
  },
  {
    "code": "mn-MN",
    "name": "Mongolian",
    "country": "Mongolia",
    "flag": "🇲🇳",
    "nativeName": "Монгол"
  },
  {
    "code": "sr-ME",
    "name": "Montenegrin",
    "country": "Montenegro",
    "flag": "🇲🇪",
    "nativeName": "Crnogorski"
  },
  {
    "code": "ar-MA",
    "name": "Arabic (Morocco)",
    "country": "Morocco",
    "flag": "🇲🇦",
    "nativeName": "العربية"
  },
  {
    "code": "pt-MZ",
    "name": "Portuguese (Mozambique)",
    "country": "Mozambique",
    "flag": "🇲🇿",
    "nativeName": "Português"
  },
  {
    "code": "my-MM",
    "name": "Burmese",
    "country": "Myanmar",
    "flag": "🇲🇲",
    "nativeName": "မြန်မာစာ"
  },
  {
    "code": "en-NA",
    "name": "English (Namibia)",
    "country": "Namibia",
    "flag": "🇳🇦",
    "nativeName": "English"
  },
  {
    "code": "ne-NP",
    "name": "Nepali",
    "country": "Nepal",
    "flag": "🇳🇵",
    "nativeName": "नेपाली"
  },
  {
    "code": "nl-NL",
    "name": "Dutch (Netherlands)",
    "country": "Netherlands",
    "flag": "🇳🇱",
    "nativeName": "Nederlands"
  },
  {
    "code": "en-NZ",
    "name": "English (New Zealand)",
    "country": "New Zealand",
    "flag": "🇳🇿",
    "nativeName": "English"
  },
  {
    "code": "es-NI",
    "name": "Spanish (Nicaragua)",
    "country": "Nicaragua",
    "flag": "🇳🇮",
    "nativeName": "Español"
  },
  {
    "code": "fr-NE",
    "name": "French (Niger)",
    "country": "Niger",
    "flag": "🇳🇪",
    "nativeName": "Français"
  },
  {
    "code": "en-NG",
    "name": "English (Nigeria)",
    "country": "Nigeria",
    "flag": "🇳🇬",
    "nativeName": "English"
  },
  {
    "code": "mk-MK",
    "name": "Macedonian",
    "country": "North Macedonia",
    "flag": "🇲🇰",
    "nativeName": "Македонски"
  },
  {
    "code": "nb-NO",
    "name": "Norwegian",
    "country": "Norway",
    "flag": "🇳🇴",
    "nativeName": "Norsk"
  },
  {
    "code": "ar-OM",
    "name": "Arabic (Oman)",
    "country": "Oman",
    "flag": "🇴🇲",
    "nativeName": "العربية"
  },
  {
    "code": "ur-PK",
    "name": "Urdu (Pakistan)",
    "country": "Pakistan",
    "flag": "🇵🇰",
    "nativeName": "اردو"
  },
  {
    "code": "ar-PS",
    "name": "Arabic (Palestine)",
    "country": "Palestine",
    "flag": "🇵🇸",
    "nativeName": "العربية"
  },
  {
    "code": "es-PA",
    "name": "Spanish (Panama)",
    "country": "Panama",
    "flag": "🇵🇦",
    "nativeName": "Español"
  },
  {
    "code": "en-PG",
    "name": "English (Papua New Guinea)",
    "country": "Papua New Guinea",
    "flag": "🇵🇬",
    "nativeName": "English"
  },
  {
    "code": "es-PY",
    "name": "Spanish (Paraguay)",
    "country": "Paraguay",
    "flag": "🇵🇾",
    "nativeName": "Español"
  },
  {
    "code": "es-PE",
    "name": "Spanish (Peru)",
    "country": "Peru",
    "flag": "🇵🇪",
    "nativeName": "Español"
  },
  {
    "code": "fil-PH",
    "name": "Filipino (Tagalog)",
    "country": "Philippines",
    "flag": "🇵🇭",
    "nativeName": "Filipino"
  },
  {
    "code": "pl-PL",
    "name": "Polish",
    "country": "Poland",
    "flag": "🇵🇱",
    "nativeName": "Polski"
  },
  {
    "code": "pt-PT",
    "name": "Portuguese (Portugal)",
    "country": "Portugal",
    "flag": "🇵🇹",
    "nativeName": "Português"
  },
  {
    "code": "en-PR",
    "name": "English (Puerto Rico)",
    "country": "Puerto Rico",
    "flag": "🇵🇷",
    "nativeName": "English"
  },
  {
    "code": "ar-QA",
    "name": "Arabic (Qatar)",
    "country": "Qatar",
    "flag": "🇶🇦",
    "nativeName": "العربية"
  },
  {
    "code": "ro-RO",
    "name": "Romanian",
    "country": "Romania",
    "flag": "🇷🇴",
    "nativeName": "Română"
  },
  {
    "code": "ru-RU",
    "name": "Russian",
    "country": "Russia",
    "flag": "🇷🇺",
    "nativeName": "Русский"
  },
  {
    "code": "rw-RW",
    "name": "Kinyarwanda",
    "country": "Rwanda",
    "flag": "🇷🇼",
    "nativeName": "Ikinyarwanda"
  },
  {
    "code": "ar-SA",
    "name": "Arabic (Saudi Arabia)",
    "country": "Saudi Arabia",
    "flag": "🇸🇦",
    "nativeName": "العربية"
  },
  {
    "code": "fr-SN",
    "name": "French (Senegal)",
    "country": "Senegal",
    "flag": "🇸🇳",
    "nativeName": "Français"
  },
  {
    "code": "sr-RS",
    "name": "Serbian",
    "country": "Serbia",
    "flag": "🇷🇸",
    "nativeName": "Српски"
  },
  {
    "code": "fr-SC",
    "name": "French (Seychelles)",
    "country": "Seychelles",
    "flag": "🇸🇨",
    "nativeName": "Français"
  },
  {
    "code": "en-SL",
    "name": "English (Sierra Leone)",
    "country": "Sierra Leone",
    "flag": "🇸🇱",
    "nativeName": "English"
  },
  {
    "code": "en-SG",
    "name": "English (Singapore)",
    "country": "Singapore",
    "flag": "🇸🇬",
    "nativeName": "English"
  },
  {
    "code": "sk-SK",
    "name": "Slovak",
    "country": "Slovakia",
    "flag": "🇸🇰",
    "nativeName": "Slovenčina"
  },
  {
    "code": "sl-SI",
    "name": "Slovenian",
    "country": "Slovenia",
    "flag": "🇸🇮",
    "nativeName": "Slovenščina"
  },
  {
    "code": "so-SO",
    "name": "Somali",
    "country": "Somalia",
    "flag": "🇸🇴",
    "nativeName": "Soomaali"
  },
  {
    "code": "af-ZA",
    "name": "Afrikaans (South Africa)",
    "country": "South Africa",
    "flag": "🇿🇦"
  },
  {
    "code": "en-ZA",
    "name": "English (South Africa)",
    "country": "South Africa",
    "flag": "🇿🇦",
    "nativeName": "English"
  },
  {
    "code": "ko-KR",
    "name": "Korean (South Korea)",
    "country": "South Korea",
    "flag": "🇰🇷",
    "nativeName": "한국어"
  },
  {
    "code": "en-SS",
    "name": "English (South Sudan)",
    "country": "South Sudan",
    "flag": "🇸🇸",
    "nativeName": "English"
  },
  {
    "code": "eu-ES",
    "name": "Basque (Spain)",
    "country": "Spain",
    "flag": "🇪🇸"
  },
  {
    "code": "ca-ES",
    "name": "Catalan (Spain)",
    "country": "Spain",
    "flag": "🇪🇸"
  },
  {
    "code": "gl-ES",
    "name": "Galician (Spain)",
    "country": "Spain",
    "flag": "🇪🇸"
  },
  {
    "code": "es-ES",
    "name": "Spanish (Spain)",
    "country": "Spain",
    "flag": "🇪🇸",
    "nativeName": "Español"
  },
  {
    "code": "si-LK",
    "name": "Sinhala (Sri Lanka)",
    "country": "Sri Lanka",
    "flag": "🇱🇰",
    "nativeName": "සිංහල"
  },
  {
    "code": "ar-SD",
    "name": "Arabic (Sudan)",
    "country": "Sudan",
    "flag": "🇸🇩",
    "nativeName": "العربية"
  },
  {
    "code": "nl-SR",
    "name": "Dutch (Suriname)",
    "country": "Suriname",
    "flag": "🇸🇷",
    "nativeName": "Nederlands"
  },
  {
    "code": "sv-SE",
    "name": "Swedish",
    "country": "Sweden",
    "flag": "🇸🇪",
    "nativeName": "Svenska"
  },
  {
    "code": "fr-CH",
    "name": "French (Switzerland)",
    "country": "Switzerland",
    "flag": "🇨🇭"
  },
  {
    "code": "de-CH",
    "name": "German (Switzerland)",
    "country": "Switzerland",
    "flag": "🇨🇭",
    "nativeName": "Deutsch"
  },
  {
    "code": "it-CH",
    "name": "Italian (Switzerland)",
    "country": "Switzerland",
    "flag": "🇨🇭"
  },
  {
    "code": "ar-SY",
    "name": "Arabic (Syria)",
    "country": "Syria",
    "flag": "🇸🇾",
    "nativeName": "العربية"
  },
  {
    "code": "zh-TW",
    "name": "Chinese (Taiwan)",
    "country": "Taiwan",
    "flag": "🇹🇼",
    "nativeName": "繁體中文"
  },
  {
    "code": "tg-TJ",
    "name": "Tajik",
    "country": "Tajikistan",
    "flag": "🇹🇯",
    "nativeName": "Тоҷикӣ"
  },
  {
    "code": "sw-TZ",
    "name": "Swahili (Tanzania)",
    "country": "Tanzania",
    "flag": "🇹🇿",
    "nativeName": "Kiswahili"
  },
  {
    "code": "th-TH",
    "name": "Thai",
    "country": "Thailand",
    "flag": "🇹🇭",
    "nativeName": "ไทย"
  },
  {
    "code": "fr-TG",
    "name": "French (Togo)",
    "country": "Togo",
    "flag": "🇹🇬",
    "nativeName": "Français"
  },
  {
    "code": "en-TT",
    "name": "English (Trinidad)",
    "country": "Trinidad and Tobago",
    "flag": "🇹🇹",
    "nativeName": "English"
  },
  {
    "code": "ar-TN",
    "name": "Arabic (Tunisia)",
    "country": "Tunisia",
    "flag": "🇹🇳",
    "nativeName": "العربية"
  },
  {
    "code": "tr-TR",
    "name": "Turkish",
    "country": "Turkey",
    "flag": "🇹🇷",
    "nativeName": "Türkçe"
  },
  {
    "code": "tk-TM",
    "name": "Turkmen",
    "country": "Turkmenistan",
    "flag": "🇹🇲",
    "nativeName": "Türkmençe"
  },
  {
    "code": "en-TC",
    "name": "English (Turks and Caicos)",
    "country": "Turks and Caicos",
    "flag": "🇹🇨",
    "nativeName": "English"
  },
  {
    "code": "en-UG",
    "name": "English (Uganda)",
    "country": "Uganda",
    "flag": "🇺🇬",
    "nativeName": "English"
  },
  {
    "code": "ru-UA",
    "name": "Russian (Ukraine)",
    "country": "Ukraine",
    "flag": "🇺🇦"
  },
  {
    "code": "uk-UA",
    "name": "Ukrainian",
    "country": "Ukraine",
    "flag": "🇺🇦",
    "nativeName": "Українська"
  },
  {
    "code": "ar-AE",
    "name": "Arabic (UAE)",
    "country": "United Arab Emirates",
    "flag": "🇦🇪",
    "nativeName": "العربية"
  },
  {
    "code": "en-GB",
    "name": "English (United Kingdom)",
    "country": "United Kingdom",
    "flag": "🇬🇧",
    "nativeName": "English"
  },
  {
    "code": "en-US",
    "name": "English (United States)",
    "country": "United States",
    "flag": "🇺🇸",
    "nativeName": "English"
  },
  {
    "code": "es-UY",
    "name": "Spanish (Uruguay)",
    "country": "Uruguay",
    "flag": "🇺🇾",
    "nativeName": "Español"
  },
  {
    "code": "uz-UZ",
    "name": "Uzbek",
    "country": "Uzbekistan",
    "flag": "🇺🇿",
    "nativeName": "Oʻzbek"
  },
  {
    "code": "es-VE",
    "name": "Spanish (Venezuela)",
    "country": "Venezuela",
    "flag": "🇻🇪",
    "nativeName": "Español"
  },
  {
    "code": "vi-VN",
    "name": "Vietnamese",
    "country": "Vietnam",
    "flag": "🇻🇳",
    "nativeName": "Tiếng Việt"
  },
  {
    "code": "ar-YE",
    "name": "Arabic (Yemen)",
    "country": "Yemen",
    "flag": "🇾🇪",
    "nativeName": "العربية"
  },
  {
    "code": "en-ZM",
    "name": "English (Zambia)",
    "country": "Zambia",
    "flag": "🇿🇲",
    "nativeName": "English"
  },
  {
    "code": "en-ZW",
    "name": "English (Zimbabwe)",
    "country": "Zimbabwe",
    "flag": "🇿🇼",
    "nativeName": "English"
  }
];

export const POPULAR_TIMEZONES: TimezoneOption[] = [
  {
    "id": "auto",
    "label": "Auto-detect (Match Proxy IP / System)",
    "country": "Global",
    "flag": "🌐",
    "offset": "Auto",
    "region": "Popular"
  },
  {
    "id": "America/New_York",
    "label": "New York (US Eastern)",
    "country": "United States",
    "flag": "🇺🇸",
    "offset": "UTC-5",
    "region": "Popular"
  },
  {
    "id": "America/Chicago",
    "label": "Chicago (US Central)",
    "country": "United States",
    "flag": "🇺🇸",
    "offset": "UTC-6",
    "region": "Popular"
  },
  {
    "id": "America/Denver",
    "label": "Denver (US Mountain)",
    "country": "United States",
    "flag": "🇺🇸",
    "offset": "UTC-7",
    "region": "Popular"
  },
  {
    "id": "America/Los_Angeles",
    "label": "Los Angeles (US Pacific)",
    "country": "United States",
    "flag": "🇺🇸",
    "offset": "UTC-8",
    "region": "Popular"
  },
  {
    "id": "America/Toronto",
    "label": "Toronto / Montreal (Eastern)",
    "country": "Canada",
    "flag": "🇨🇦",
    "offset": "UTC-5",
    "region": "Popular"
  },
  {
    "id": "America/Sao_Paulo",
    "label": "São Paulo / Rio (BRT)",
    "country": "Brazil",
    "flag": "🇧🇷",
    "offset": "UTC-3",
    "region": "Popular"
  },
  {
    "id": "Europe/London",
    "label": "London / Edinburgh (GMT/BST)",
    "country": "United Kingdom",
    "flag": "🇬🇧",
    "offset": "UTC+0",
    "region": "Popular"
  },
  {
    "id": "Europe/Berlin",
    "label": "Berlin / Frankfurt (CET)",
    "country": "Germany",
    "flag": "🇩🇪",
    "offset": "UTC+1",
    "region": "Popular"
  },
  {
    "id": "Europe/Paris",
    "label": "Paris (CET)",
    "country": "France",
    "flag": "🇫🇷",
    "offset": "UTC+1",
    "region": "Popular"
  },
  {
    "id": "Europe/Amsterdam",
    "label": "Amsterdam (CET)",
    "country": "Netherlands",
    "flag": "🇳🇱",
    "offset": "UTC+1",
    "region": "Popular"
  },
  {
    "id": "Europe/Madrid",
    "label": "Madrid / Barcelona (CET)",
    "country": "Spain",
    "flag": "🇪🇸",
    "offset": "UTC+1",
    "region": "Popular"
  },
  {
    "id": "Europe/Rome",
    "label": "Rome / Milan (CET)",
    "country": "Italy",
    "flag": "🇮🇹",
    "offset": "UTC+1",
    "region": "Popular"
  },
  {
    "id": "Europe/Moscow",
    "label": "Moscow (MSK)",
    "country": "Russia",
    "flag": "🇷🇺",
    "offset": "UTC+3",
    "region": "Popular"
  },
  {
    "id": "Europe/Kyiv",
    "label": "Kyiv (EET)",
    "country": "Ukraine",
    "flag": "🇺🇦",
    "offset": "UTC+2",
    "region": "Popular"
  },
  {
    "id": "Europe/Istanbul",
    "label": "Istanbul (TRT)",
    "country": "Turkey",
    "flag": "🇹🇷",
    "offset": "UTC+3",
    "region": "Popular"
  },
  {
    "id": "Asia/Dubai",
    "label": "Dubai / Abu Dhabi (GST)",
    "country": "United Arab Emirates",
    "flag": "🇦🇪",
    "offset": "UTC+4",
    "region": "Popular"
  },
  {
    "id": "Asia/Kolkata",
    "label": "New Delhi / Mumbai (IST)",
    "country": "India",
    "flag": "🇮🇳",
    "offset": "UTC+5:30",
    "region": "Popular"
  },
  {
    "id": "Asia/Dhaka",
    "label": "Dhaka (BST)",
    "country": "Bangladesh",
    "flag": "🇧🇩",
    "offset": "UTC+6",
    "region": "Popular"
  },
  {
    "id": "Asia/Bangkok",
    "label": "Bangkok (ICT)",
    "country": "Thailand",
    "flag": "🇹🇭",
    "offset": "UTC+7",
    "region": "Popular"
  },
  {
    "id": "Asia/Singapore",
    "label": "Singapore (SGT)",
    "country": "Singapore",
    "flag": "🇸🇬",
    "offset": "UTC+8",
    "region": "Popular"
  },
  {
    "id": "Asia/Hong_Kong",
    "label": "Hong Kong (HKT)",
    "country": "Hong Kong",
    "flag": "🇭🇰",
    "offset": "UTC+8",
    "region": "Popular"
  },
  {
    "id": "Asia/Shanghai",
    "label": "Shanghai / Beijing (CST)",
    "country": "China",
    "flag": "🇨🇳",
    "offset": "UTC+8",
    "region": "Popular"
  },
  {
    "id": "Asia/Tokyo",
    "label": "Tokyo / Osaka (JST)",
    "country": "Japan",
    "flag": "🇯🇵",
    "offset": "UTC+9",
    "region": "Popular"
  },
  {
    "id": "Asia/Seoul",
    "label": "Seoul (KST)",
    "country": "South Korea",
    "flag": "🇰🇷",
    "offset": "UTC+9",
    "region": "Popular"
  },
  {
    "id": "Australia/Sydney",
    "label": "Sydney / Melbourne (AEST)",
    "country": "Australia",
    "flag": "🇦🇺",
    "offset": "UTC+10",
    "region": "Popular"
  },
  {
    "id": "UTC",
    "label": "UTC (Coordinated Universal Time)",
    "country": "Universal",
    "flag": "🌐",
    "offset": "UTC+0",
    "region": "Popular"
  }
];

export const ALL_TIMEZONES: TimezoneOption[] = [
  {
    "id": "Asia/Kabul",
    "label": "Kabul (UTC+4:30)",
    "country": "Afghanistan",
    "flag": "🇦🇫",
    "offset": "UTC+4:30",
    "region": "Asia"
  },
  {
    "id": "Europe/Tirane",
    "label": "Tirane (UTC+1)",
    "country": "Albania",
    "flag": "🇦🇱",
    "offset": "UTC+1",
    "region": "Europe"
  },
  {
    "id": "Africa/Algiers",
    "label": "Algiers (UTC+1)",
    "country": "Algeria",
    "flag": "🇩🇿",
    "offset": "UTC+1",
    "region": "Africa"
  },
  {
    "id": "Europe/Andorra",
    "label": "Andorra (UTC+1)",
    "country": "Andorra",
    "flag": "🇦🇩",
    "offset": "UTC+1",
    "region": "Europe"
  },
  {
    "id": "Africa/Luanda",
    "label": "Luanda (UTC+1)",
    "country": "Angola",
    "flag": "🇦🇴",
    "offset": "UTC+1",
    "region": "Africa"
  },
  {
    "id": "America/Antigua",
    "label": "Antigua (UTC-4)",
    "country": "Antigua and Barbuda",
    "flag": "🇦🇬",
    "offset": "UTC-4",
    "region": "Americas"
  },
  {
    "id": "America/Argentina/Buenos_Aires",
    "label": "Buenos Aires (UTC-3)",
    "country": "Argentina",
    "flag": "🇦🇷",
    "offset": "UTC-3",
    "region": "Americas"
  },
  {
    "id": "America/Argentina/Cordoba",
    "label": "Cordoba (UTC-3)",
    "country": "Argentina",
    "flag": "🇦🇷",
    "offset": "UTC-3",
    "region": "Americas"
  },
  {
    "id": "America/Argentina/Mendoza",
    "label": "Mendoza (UTC-3)",
    "country": "Argentina",
    "flag": "🇦🇷",
    "offset": "UTC-3",
    "region": "Americas"
  },
  {
    "id": "Asia/Yerevan",
    "label": "Yerevan (UTC+4)",
    "country": "Armenia",
    "flag": "🇦🇲",
    "offset": "UTC+4",
    "region": "Asia"
  },
  {
    "id": "Australia/Adelaide",
    "label": "Adelaide (ACST) (UTC+9:30)",
    "country": "Australia",
    "flag": "🇦🇺",
    "offset": "UTC+9:30",
    "region": "Oceania & Pacific"
  },
  {
    "id": "Australia/Brisbane",
    "label": "Brisbane (AEST) (UTC+10)",
    "country": "Australia",
    "flag": "🇦🇺",
    "offset": "UTC+10",
    "region": "Oceania & Pacific"
  },
  {
    "id": "Australia/Darwin",
    "label": "Darwin (ACST) (UTC+9:30)",
    "country": "Australia",
    "flag": "🇦🇺",
    "offset": "UTC+9:30",
    "region": "Oceania & Pacific"
  },
  {
    "id": "Australia/Hobart",
    "label": "Hobart (Tasmania) (UTC+10)",
    "country": "Australia",
    "flag": "🇦🇺",
    "offset": "UTC+10",
    "region": "Oceania & Pacific"
  },
  {
    "id": "Australia/Perth",
    "label": "Perth (AWST) (UTC+8)",
    "country": "Australia",
    "flag": "🇦🇺",
    "offset": "UTC+8",
    "region": "Oceania & Pacific"
  },
  {
    "id": "Australia/Sydney",
    "label": "Sydney / Melbourne (AEST) (UTC+10)",
    "country": "Australia",
    "flag": "🇦🇺",
    "offset": "UTC+10",
    "region": "Oceania & Pacific"
  },
  {
    "id": "Europe/Vienna",
    "label": "Vienna (UTC+1)",
    "country": "Austria",
    "flag": "🇦🇹",
    "offset": "UTC+1",
    "region": "Europe"
  },
  {
    "id": "Asia/Baku",
    "label": "Baku (UTC+4)",
    "country": "Azerbaijan",
    "flag": "🇦🇿",
    "offset": "UTC+4",
    "region": "Asia"
  },
  {
    "id": "America/Nassau",
    "label": "Nassau (UTC-5)",
    "country": "Bahamas",
    "flag": "🇧🇸",
    "offset": "UTC-5",
    "region": "Americas"
  },
  {
    "id": "Asia/Bahrain",
    "label": "Manama (UTC+3)",
    "country": "Bahrain",
    "flag": "🇧🇭",
    "offset": "UTC+3",
    "region": "Asia"
  },
  {
    "id": "Asia/Dhaka",
    "label": "Dhaka (UTC+6)",
    "country": "Bangladesh",
    "flag": "🇧🇩",
    "offset": "UTC+6",
    "region": "Asia"
  },
  {
    "id": "America/Barbados",
    "label": "Bridgetown (UTC-4)",
    "country": "Barbados",
    "flag": "🇧🇧",
    "offset": "UTC-4",
    "region": "Americas"
  },
  {
    "id": "Europe/Minsk",
    "label": "Minsk (UTC+3)",
    "country": "Belarus",
    "flag": "🇧🇾",
    "offset": "UTC+3",
    "region": "Europe"
  },
  {
    "id": "Europe/Brussels",
    "label": "Brussels (UTC+1)",
    "country": "Belgium",
    "flag": "🇧🇪",
    "offset": "UTC+1",
    "region": "Europe"
  },
  {
    "id": "America/Belize",
    "label": "Belize City (UTC-6)",
    "country": "Belize",
    "flag": "🇧🇿",
    "offset": "UTC-6",
    "region": "Americas"
  },
  {
    "id": "Africa/Porto-Novo",
    "label": "Porto-Novo (UTC+1)",
    "country": "Benin",
    "flag": "🇧🇯",
    "offset": "UTC+1",
    "region": "Africa"
  },
  {
    "id": "Asia/Thimphu",
    "label": "Thimphu (UTC+6)",
    "country": "Bhutan",
    "flag": "🇧🇹",
    "offset": "UTC+6",
    "region": "Asia"
  },
  {
    "id": "America/La_Paz",
    "label": "La Paz (UTC-4)",
    "country": "Bolivia",
    "flag": "🇧🇴",
    "offset": "UTC-4",
    "region": "Americas"
  },
  {
    "id": "Europe/Sarajevo",
    "label": "Sarajevo (UTC+1)",
    "country": "Bosnia and Herzegovina",
    "flag": "🇧🇦",
    "offset": "UTC+1",
    "region": "Europe"
  },
  {
    "id": "Africa/Gaborone",
    "label": "Gaborone (UTC+2)",
    "country": "Botswana",
    "flag": "🇧🇼",
    "offset": "UTC+2",
    "region": "Africa"
  },
  {
    "id": "America/Cuiaba",
    "label": "Cuiabá (UTC-4)",
    "country": "Brazil",
    "flag": "🇧🇷",
    "offset": "UTC-4",
    "region": "Americas"
  },
  {
    "id": "America/Fortaleza",
    "label": "Fortaleza / Recife (UTC-3)",
    "country": "Brazil",
    "flag": "🇧🇷",
    "offset": "UTC-3",
    "region": "Americas"
  },
  {
    "id": "America/Manaus",
    "label": "Manaus (Amazon) (UTC-4)",
    "country": "Brazil",
    "flag": "🇧🇷",
    "offset": "UTC-4",
    "region": "Americas"
  },
  {
    "id": "America/Rio_Branco",
    "label": "Rio Branco (Acre) (UTC-5)",
    "country": "Brazil",
    "flag": "🇧🇷",
    "offset": "UTC-5",
    "region": "Americas"
  },
  {
    "id": "America/Sao_Paulo",
    "label": "São Paulo / Rio (BRT) (UTC-3)",
    "country": "Brazil",
    "flag": "🇧🇷",
    "offset": "UTC-3",
    "region": "Americas"
  },
  {
    "id": "Asia/Brunei",
    "label": "Bandar Seri Begawan (UTC+8)",
    "country": "Brunei",
    "flag": "🇧🇳",
    "offset": "UTC+8",
    "region": "Asia"
  },
  {
    "id": "Europe/Sofia",
    "label": "Sofia (UTC+2)",
    "country": "Bulgaria",
    "flag": "🇧🇬",
    "offset": "UTC+2",
    "region": "Europe"
  },
  {
    "id": "Africa/Ouagadougou",
    "label": "Ouagadougou (UTC+0)",
    "country": "Burkina Faso",
    "flag": "🇧🇫",
    "offset": "UTC+0",
    "region": "Africa"
  },
  {
    "id": "Africa/Bujumbura",
    "label": "Bujumbura (UTC+2)",
    "country": "Burundi",
    "flag": "🇧🇮",
    "offset": "UTC+2",
    "region": "Africa"
  },
  {
    "id": "Atlantic/Cape_Verde",
    "label": "Praia (UTC-1)",
    "country": "Cabo Verde",
    "flag": "🇨🇻",
    "offset": "UTC-1",
    "region": "Universal & Islands"
  },
  {
    "id": "Asia/Phnom_Penh",
    "label": "Phnom Penh (UTC+7)",
    "country": "Cambodia",
    "flag": "🇰🇭",
    "offset": "UTC+7",
    "region": "Asia"
  },
  {
    "id": "Africa/Douala",
    "label": "Douala / Yaounde (UTC+1)",
    "country": "Cameroon",
    "flag": "🇨🇲",
    "offset": "UTC+1",
    "region": "Africa"
  },
  {
    "id": "America/Edmonton",
    "label": "Edmonton / Calgary (Mountain) (UTC-7)",
    "country": "Canada",
    "flag": "🇨🇦",
    "offset": "UTC-7",
    "region": "Americas"
  },
  {
    "id": "America/Halifax",
    "label": "Halifax (Atlantic) (UTC-4)",
    "country": "Canada",
    "flag": "🇨🇦",
    "offset": "UTC-4",
    "region": "Americas"
  },
  {
    "id": "America/St_Johns",
    "label": "St. John’s (Newfoundland) (UTC-3:30)",
    "country": "Canada",
    "flag": "🇨🇦",
    "offset": "UTC-3:30",
    "region": "Americas"
  },
  {
    "id": "America/Toronto",
    "label": "Toronto / Montreal (Eastern) (UTC-5)",
    "country": "Canada",
    "flag": "🇨🇦",
    "offset": "UTC-5",
    "region": "Americas"
  },
  {
    "id": "America/Vancouver",
    "label": "Vancouver (Pacific) (UTC-8)",
    "country": "Canada",
    "flag": "🇨🇦",
    "offset": "UTC-8",
    "region": "Americas"
  },
  {
    "id": "America/Winnipeg",
    "label": "Winnipeg (Central) (UTC-6)",
    "country": "Canada",
    "flag": "🇨🇦",
    "offset": "UTC-6",
    "region": "Americas"
  },
  {
    "id": "Africa/Bangui",
    "label": "Bangui (UTC+1)",
    "country": "Central African Republic",
    "flag": "🇨🇫",
    "offset": "UTC+1",
    "region": "Africa"
  },
  {
    "id": "Africa/Ndjamena",
    "label": "N’Djamena (UTC+1)",
    "country": "Chad",
    "flag": "🇹🇩",
    "offset": "UTC+1",
    "region": "Africa"
  },
  {
    "id": "Pacific/Easter",
    "label": "Easter Island (UTC-6)",
    "country": "Chile",
    "flag": "🇨🇱",
    "offset": "UTC-6",
    "region": "Oceania & Pacific"
  },
  {
    "id": "America/Santiago",
    "label": "Santiago (UTC-4)",
    "country": "Chile",
    "flag": "🇨🇱",
    "offset": "UTC-4",
    "region": "Americas"
  },
  {
    "id": "Asia/Shanghai",
    "label": "Beijing / Shanghai (UTC+8)",
    "country": "China",
    "flag": "🇨🇳",
    "offset": "UTC+8",
    "region": "Asia"
  },
  {
    "id": "Asia/Urumqi",
    "label": "Urumqi (Xinjiang) (UTC+6)",
    "country": "China",
    "flag": "🇨🇳",
    "offset": "UTC+6",
    "region": "Asia"
  },
  {
    "id": "America/Bogota",
    "label": "Bogota (UTC-5)",
    "country": "Colombia",
    "flag": "🇨🇴",
    "offset": "UTC-5",
    "region": "Americas"
  },
  {
    "id": "Indian/Comoro",
    "label": "Moroni (UTC+3)",
    "country": "Comoros",
    "flag": "🇰🇲",
    "offset": "UTC+3",
    "region": "Universal & Islands"
  },
  {
    "id": "Africa/Brazzaville",
    "label": "Brazzaville (UTC+1)",
    "country": "Congo",
    "flag": "🇨🇬",
    "offset": "UTC+1",
    "region": "Africa"
  },
  {
    "id": "Africa/Kinshasa",
    "label": "Kinshasa (West) (UTC+1)",
    "country": "Congo (DRC)",
    "flag": "🇨🇩",
    "offset": "UTC+1",
    "region": "Africa"
  },
  {
    "id": "Africa/Lubumbashi",
    "label": "Lubumbashi (East) (UTC+2)",
    "country": "Congo (DRC)",
    "flag": "🇨🇩",
    "offset": "UTC+2",
    "region": "Africa"
  },
  {
    "id": "America/Costa_Rica",
    "label": "San Jose (UTC-6)",
    "country": "Costa Rica",
    "flag": "🇨🇷",
    "offset": "UTC-6",
    "region": "Americas"
  },
  {
    "id": "Europe/Zagreb",
    "label": "Zagreb (UTC+1)",
    "country": "Croatia",
    "flag": "🇭🇷",
    "offset": "UTC+1",
    "region": "Europe"
  },
  {
    "id": "America/Havana",
    "label": "Havana (UTC-5)",
    "country": "Cuba",
    "flag": "🇨🇺",
    "offset": "UTC-5",
    "region": "Americas"
  },
  {
    "id": "Asia/Nicosia",
    "label": "Nicosia (UTC+2)",
    "country": "Cyprus",
    "flag": "🇨🇾",
    "offset": "UTC+2",
    "region": "Asia"
  },
  {
    "id": "Europe/Prague",
    "label": "Prague (UTC+1)",
    "country": "Czech Republic",
    "flag": "🇨🇿",
    "offset": "UTC+1",
    "region": "Europe"
  },
  {
    "id": "Europe/Copenhagen",
    "label": "Copenhagen (UTC+1)",
    "country": "Denmark",
    "flag": "🇩🇰",
    "offset": "UTC+1",
    "region": "Europe"
  },
  {
    "id": "Africa/Djibouti",
    "label": "Djibouti (UTC+3)",
    "country": "Djibouti",
    "flag": "🇩🇯",
    "offset": "UTC+3",
    "region": "Africa"
  },
  {
    "id": "America/Dominica",
    "label": "Roseau (UTC-4)",
    "country": "Dominica",
    "flag": "🇩🇲",
    "offset": "UTC-4",
    "region": "Americas"
  },
  {
    "id": "America/Santo_Domingo",
    "label": "Santo Domingo (UTC-4)",
    "country": "Dominican Republic",
    "flag": "🇩🇴",
    "offset": "UTC-4",
    "region": "Americas"
  },
  {
    "id": "Pacific/Galapagos",
    "label": "Galapagos (UTC-6)",
    "country": "Ecuador",
    "flag": "🇪🇨",
    "offset": "UTC-6",
    "region": "Oceania & Pacific"
  },
  {
    "id": "America/Guayaquil",
    "label": "Guayaquil / Quito (UTC-5)",
    "country": "Ecuador",
    "flag": "🇪🇨",
    "offset": "UTC-5",
    "region": "Americas"
  },
  {
    "id": "Africa/Cairo",
    "label": "Cairo (UTC+2)",
    "country": "Egypt",
    "flag": "🇪🇬",
    "offset": "UTC+2",
    "region": "Africa"
  },
  {
    "id": "America/El_Salvador",
    "label": "San Salvador (UTC-6)",
    "country": "El Salvador",
    "flag": "🇸🇻",
    "offset": "UTC-6",
    "region": "Americas"
  },
  {
    "id": "Africa/Malabo",
    "label": "Malabo (UTC+1)",
    "country": "Equatorial Guinea",
    "flag": "🇬🇶",
    "offset": "UTC+1",
    "region": "Africa"
  },
  {
    "id": "Africa/Asmara",
    "label": "Asmara (UTC+3)",
    "country": "Eritrea",
    "flag": "🇪🇷",
    "offset": "UTC+3",
    "region": "Africa"
  },
  {
    "id": "Europe/Tallinn",
    "label": "Tallinn (UTC+2)",
    "country": "Estonia",
    "flag": "🇪🇪",
    "offset": "UTC+2",
    "region": "Europe"
  },
  {
    "id": "Africa/Mbabane",
    "label": "Mbabane (UTC+2)",
    "country": "Eswatini",
    "flag": "🇸🇿",
    "offset": "UTC+2",
    "region": "Africa"
  },
  {
    "id": "Africa/Addis_Ababa",
    "label": "Addis Ababa (UTC+3)",
    "country": "Ethiopia",
    "flag": "🇪🇹",
    "offset": "UTC+3",
    "region": "Africa"
  },
  {
    "id": "Pacific/Fiji",
    "label": "Suva (UTC+12)",
    "country": "Fiji",
    "flag": "🇫🇯",
    "offset": "UTC+12",
    "region": "Oceania & Pacific"
  },
  {
    "id": "Europe/Helsinki",
    "label": "Helsinki (UTC+2)",
    "country": "Finland",
    "flag": "🇫🇮",
    "offset": "UTC+2",
    "region": "Europe"
  },
  {
    "id": "Europe/Paris",
    "label": "Paris (UTC+1)",
    "country": "France",
    "flag": "🇫🇷",
    "offset": "UTC+1",
    "region": "Europe"
  },
  {
    "id": "Africa/Libreville",
    "label": "Libreville (UTC+1)",
    "country": "Gabon",
    "flag": "🇬🇦",
    "offset": "UTC+1",
    "region": "Africa"
  },
  {
    "id": "Africa/Banjul",
    "label": "Banjul (UTC+0)",
    "country": "Gambia",
    "flag": "🇬🇲",
    "offset": "UTC+0",
    "region": "Africa"
  },
  {
    "id": "Asia/Tbilisi",
    "label": "Tbilisi (UTC+4)",
    "country": "Georgia",
    "flag": "🇬🇪",
    "offset": "UTC+4",
    "region": "Asia"
  },
  {
    "id": "Europe/Berlin",
    "label": "Berlin / Frankfurt (UTC+1)",
    "country": "Germany",
    "flag": "🇩🇪",
    "offset": "UTC+1",
    "region": "Europe"
  },
  {
    "id": "Africa/Accra",
    "label": "Accra (UTC+0)",
    "country": "Ghana",
    "flag": "🇬🇭",
    "offset": "UTC+0",
    "region": "Africa"
  },
  {
    "id": "Europe/Athens",
    "label": "Athens (UTC+2)",
    "country": "Greece",
    "flag": "🇬🇷",
    "offset": "UTC+2",
    "region": "Europe"
  },
  {
    "id": "America/Grenada",
    "label": "St. George’s (UTC-4)",
    "country": "Grenada",
    "flag": "🇬🇩",
    "offset": "UTC-4",
    "region": "Americas"
  },
  {
    "id": "America/Guatemala",
    "label": "Guatemala City (UTC-6)",
    "country": "Guatemala",
    "flag": "🇬🇹",
    "offset": "UTC-6",
    "region": "Americas"
  },
  {
    "id": "Africa/Conakry",
    "label": "Conakry (UTC+0)",
    "country": "Guinea",
    "flag": "🇬🇳",
    "offset": "UTC+0",
    "region": "Africa"
  },
  {
    "id": "Africa/Bissau",
    "label": "Bissau (UTC+0)",
    "country": "Guinea-Bissau",
    "flag": "🇬🇼",
    "offset": "UTC+0",
    "region": "Africa"
  },
  {
    "id": "America/Guyana",
    "label": "Georgetown (UTC-4)",
    "country": "Guyana",
    "flag": "🇬🇾",
    "offset": "UTC-4",
    "region": "Americas"
  },
  {
    "id": "America/Port-au-Prince",
    "label": "Port-au-Prince (UTC-5)",
    "country": "Haiti",
    "flag": "🇭🇹",
    "offset": "UTC-5",
    "region": "Americas"
  },
  {
    "id": "America/Tegucigalpa",
    "label": "Tegucigalpa (UTC-6)",
    "country": "Honduras",
    "flag": "🇭🇳",
    "offset": "UTC-6",
    "region": "Americas"
  },
  {
    "id": "Asia/Hong_Kong",
    "label": "Hong Kong (UTC+8)",
    "country": "Hong Kong",
    "flag": "🇭🇰",
    "offset": "UTC+8",
    "region": "Asia"
  },
  {
    "id": "Europe/Budapest",
    "label": "Budapest (UTC+1)",
    "country": "Hungary",
    "flag": "🇭🇺",
    "offset": "UTC+1",
    "region": "Europe"
  },
  {
    "id": "Atlantic/Reykjavik",
    "label": "Reykjavik (UTC+0)",
    "country": "Iceland",
    "flag": "🇮🇸",
    "offset": "UTC+0",
    "region": "Universal & Islands"
  },
  {
    "id": "Asia/Kolkata",
    "label": "New Delhi / Mumbai (IST) (UTC+5:30)",
    "country": "India",
    "flag": "🇮🇳",
    "offset": "UTC+5:30",
    "region": "Asia"
  },
  {
    "id": "Asia/Jakarta",
    "label": "Jakarta / Java (WIB) (UTC+7)",
    "country": "Indonesia",
    "flag": "🇮🇩",
    "offset": "UTC+7",
    "region": "Asia"
  },
  {
    "id": "Asia/Jayapura",
    "label": "Jayapura / Papua (WIT) (UTC+9)",
    "country": "Indonesia",
    "flag": "🇮🇩",
    "offset": "UTC+9",
    "region": "Asia"
  },
  {
    "id": "Asia/Makassar",
    "label": "Makassar / Bali (WITA) (UTC+8)",
    "country": "Indonesia",
    "flag": "🇮🇩",
    "offset": "UTC+8",
    "region": "Asia"
  },
  {
    "id": "Asia/Tehran",
    "label": "Tehran (UTC+3:30)",
    "country": "Iran",
    "flag": "🇮🇷",
    "offset": "UTC+3:30",
    "region": "Asia"
  },
  {
    "id": "Asia/Baghdad",
    "label": "Baghdad (UTC+3)",
    "country": "Iraq",
    "flag": "🇮🇶",
    "offset": "UTC+3",
    "region": "Asia"
  },
  {
    "id": "Europe/Dublin",
    "label": "Dublin (UTC+0)",
    "country": "Ireland",
    "flag": "🇮🇪",
    "offset": "UTC+0",
    "region": "Europe"
  },
  {
    "id": "Asia/Jerusalem",
    "label": "Jerusalem / Tel Aviv (UTC+2)",
    "country": "Israel",
    "flag": "🇮🇱",
    "offset": "UTC+2",
    "region": "Asia"
  },
  {
    "id": "Europe/Rome",
    "label": "Rome / Milan (UTC+1)",
    "country": "Italy",
    "flag": "🇮🇹",
    "offset": "UTC+1",
    "region": "Europe"
  },
  {
    "id": "Africa/Abidjan",
    "label": "Abidjan (UTC+0)",
    "country": "Ivory Coast",
    "flag": "🇨🇮",
    "offset": "UTC+0",
    "region": "Africa"
  },
  {
    "id": "America/Jamaica",
    "label": "Kingston (UTC-5)",
    "country": "Jamaica",
    "flag": "🇯🇲",
    "offset": "UTC-5",
    "region": "Americas"
  },
  {
    "id": "Asia/Tokyo",
    "label": "Tokyo / Osaka (JST) (UTC+9)",
    "country": "Japan",
    "flag": "🇯🇵",
    "offset": "UTC+9",
    "region": "Asia"
  },
  {
    "id": "Asia/Amman",
    "label": "Amman (UTC+3)",
    "country": "Jordan",
    "flag": "🇯🇴",
    "offset": "UTC+3",
    "region": "Asia"
  },
  {
    "id": "Asia/Aqtau",
    "label": "Aktau / Atyrau (UTC+5)",
    "country": "Kazakhstan",
    "flag": "🇰🇿",
    "offset": "UTC+5",
    "region": "Asia"
  },
  {
    "id": "Asia/Aqtobe",
    "label": "Aktobe (UTC+5)",
    "country": "Kazakhstan",
    "flag": "🇰🇿",
    "offset": "UTC+5",
    "region": "Asia"
  },
  {
    "id": "Asia/Almaty",
    "label": "Almaty / Astana (UTC+5)",
    "country": "Kazakhstan",
    "flag": "🇰🇿",
    "offset": "UTC+5",
    "region": "Asia"
  },
  {
    "id": "Africa/Nairobi",
    "label": "Nairobi (UTC+3)",
    "country": "Kenya",
    "flag": "🇰🇪",
    "offset": "UTC+3",
    "region": "Africa"
  },
  {
    "id": "Asia/Kuwait",
    "label": "Kuwait City (UTC+3)",
    "country": "Kuwait",
    "flag": "🇰🇼",
    "offset": "UTC+3",
    "region": "Asia"
  },
  {
    "id": "Asia/Bishkek",
    "label": "Bishkek (UTC+6)",
    "country": "Kyrgyzstan",
    "flag": "🇰🇬",
    "offset": "UTC+6",
    "region": "Asia"
  },
  {
    "id": "Asia/Vientiane",
    "label": "Vientiane (UTC+7)",
    "country": "Laos",
    "flag": "🇱🇦",
    "offset": "UTC+7",
    "region": "Asia"
  },
  {
    "id": "Europe/Riga",
    "label": "Riga (UTC+2)",
    "country": "Latvia",
    "flag": "🇱🇻",
    "offset": "UTC+2",
    "region": "Europe"
  },
  {
    "id": "Asia/Beirut",
    "label": "Beirut (UTC+2)",
    "country": "Lebanon",
    "flag": "🇱🇧",
    "offset": "UTC+2",
    "region": "Asia"
  },
  {
    "id": "Africa/Maseru",
    "label": "Maseru (UTC+2)",
    "country": "Lesotho",
    "flag": "🇱🇸",
    "offset": "UTC+2",
    "region": "Africa"
  },
  {
    "id": "Africa/Monrovia",
    "label": "Monrovia (UTC+0)",
    "country": "Liberia",
    "flag": "🇱🇷",
    "offset": "UTC+0",
    "region": "Africa"
  },
  {
    "id": "Africa/Tripoli",
    "label": "Tripoli (UTC+2)",
    "country": "Libya",
    "flag": "🇱🇾",
    "offset": "UTC+2",
    "region": "Africa"
  },
  {
    "id": "Europe/Vaduz",
    "label": "Vaduz (UTC+1)",
    "country": "Liechtenstein",
    "flag": "🇱🇮",
    "offset": "UTC+1",
    "region": "Europe"
  },
  {
    "id": "Europe/Vilnius",
    "label": "Vilnius (UTC+2)",
    "country": "Lithuania",
    "flag": "🇱🇹",
    "offset": "UTC+2",
    "region": "Europe"
  },
  {
    "id": "Europe/Luxembourg",
    "label": "Luxembourg (UTC+1)",
    "country": "Luxembourg",
    "flag": "🇱🇺",
    "offset": "UTC+1",
    "region": "Europe"
  },
  {
    "id": "Asia/Macau",
    "label": "Macau (UTC+8)",
    "country": "Macau",
    "flag": "🇲🇴",
    "offset": "UTC+8",
    "region": "Asia"
  },
  {
    "id": "Indian/Antananarivo",
    "label": "Antananarivo (UTC+3)",
    "country": "Madagascar",
    "flag": "🇲🇬",
    "offset": "UTC+3",
    "region": "Universal & Islands"
  },
  {
    "id": "Africa/Blantyre",
    "label": "Blantyre / Lilongwe (UTC+2)",
    "country": "Malawi",
    "flag": "🇲🇼",
    "offset": "UTC+2",
    "region": "Africa"
  },
  {
    "id": "Asia/Kuala_Lumpur",
    "label": "Kuala Lumpur (UTC+8)",
    "country": "Malaysia",
    "flag": "🇲🇾",
    "offset": "UTC+8",
    "region": "Asia"
  },
  {
    "id": "Asia/Kuching",
    "label": "Kuching (Borneo) (UTC+8)",
    "country": "Malaysia",
    "flag": "🇲🇾",
    "offset": "UTC+8",
    "region": "Asia"
  },
  {
    "id": "Indian/Maldives",
    "label": "Male (UTC+5)",
    "country": "Maldives",
    "flag": "🇲🇻",
    "offset": "UTC+5",
    "region": "Universal & Islands"
  },
  {
    "id": "Africa/Bamako",
    "label": "Bamako (UTC+0)",
    "country": "Mali",
    "flag": "🇲🇱",
    "offset": "UTC+0",
    "region": "Africa"
  },
  {
    "id": "Europe/Malta",
    "label": "Valletta (UTC+1)",
    "country": "Malta",
    "flag": "🇲🇹",
    "offset": "UTC+1",
    "region": "Europe"
  },
  {
    "id": "Africa/Nouakchott",
    "label": "Nouakchott (UTC+0)",
    "country": "Mauritania",
    "flag": "🇲🇷",
    "offset": "UTC+0",
    "region": "Africa"
  },
  {
    "id": "Indian/Mauritius",
    "label": "Port Louis (UTC+4)",
    "country": "Mauritius",
    "flag": "🇲🇺",
    "offset": "UTC+4",
    "region": "Universal & Islands"
  },
  {
    "id": "America/Cancun",
    "label": "Cancun (Eastern) (UTC-5)",
    "country": "Mexico",
    "flag": "🇲🇽",
    "offset": "UTC-5",
    "region": "Americas"
  },
  {
    "id": "America/Hermosillo",
    "label": "Hermosillo (Sonora) (UTC-7)",
    "country": "Mexico",
    "flag": "🇲🇽",
    "offset": "UTC-7",
    "region": "Americas"
  },
  {
    "id": "America/Mexico_City",
    "label": "Mexico City (Central) (UTC-6)",
    "country": "Mexico",
    "flag": "🇲🇽",
    "offset": "UTC-6",
    "region": "Americas"
  },
  {
    "id": "America/Tijuana",
    "label": "Tijuana (Pacific) (UTC-8)",
    "country": "Mexico",
    "flag": "🇲🇽",
    "offset": "UTC-8",
    "region": "Americas"
  },
  {
    "id": "Europe/Chisinau",
    "label": "Chisinau (UTC+2)",
    "country": "Moldova",
    "flag": "🇲🇩",
    "offset": "UTC+2",
    "region": "Europe"
  },
  {
    "id": "Europe/Monaco",
    "label": "Monaco (UTC+1)",
    "country": "Monaco",
    "flag": "🇲🇨",
    "offset": "UTC+1",
    "region": "Europe"
  },
  {
    "id": "Asia/Hovd",
    "label": "Hovd (West) (UTC+7)",
    "country": "Mongolia",
    "flag": "🇲🇳",
    "offset": "UTC+7",
    "region": "Asia"
  },
  {
    "id": "Asia/Ulaanbaatar",
    "label": "Ulaanbaatar (UTC+8)",
    "country": "Mongolia",
    "flag": "🇲🇳",
    "offset": "UTC+8",
    "region": "Asia"
  },
  {
    "id": "Europe/Podgorica",
    "label": "Podgorica (UTC+1)",
    "country": "Montenegro",
    "flag": "🇲🇪",
    "offset": "UTC+1",
    "region": "Europe"
  },
  {
    "id": "Africa/Casablanca",
    "label": "Casablanca / Rabat (UTC+1)",
    "country": "Morocco",
    "flag": "🇲🇦",
    "offset": "UTC+1",
    "region": "Africa"
  },
  {
    "id": "Africa/Maputo",
    "label": "Maputo (UTC+2)",
    "country": "Mozambique",
    "flag": "🇲🇿",
    "offset": "UTC+2",
    "region": "Africa"
  },
  {
    "id": "Asia/Yangon",
    "label": "Yangon (UTC+6:30)",
    "country": "Myanmar",
    "flag": "🇲🇲",
    "offset": "UTC+6:30",
    "region": "Asia"
  },
  {
    "id": "Africa/Windhoek",
    "label": "Windhoek (UTC+2)",
    "country": "Namibia",
    "flag": "🇳🇦",
    "offset": "UTC+2",
    "region": "Africa"
  },
  {
    "id": "Asia/Kathmandu",
    "label": "Kathmandu (UTC+5:45)",
    "country": "Nepal",
    "flag": "🇳🇵",
    "offset": "UTC+5:45",
    "region": "Asia"
  },
  {
    "id": "Europe/Amsterdam",
    "label": "Amsterdam (UTC+1)",
    "country": "Netherlands",
    "flag": "🇳🇱",
    "offset": "UTC+1",
    "region": "Europe"
  },
  {
    "id": "Pacific/Auckland",
    "label": "Auckland / Wellington (UTC+12)",
    "country": "New Zealand",
    "flag": "🇳🇿",
    "offset": "UTC+12",
    "region": "Oceania & Pacific"
  },
  {
    "id": "Pacific/Chatham",
    "label": "Chatham Islands (UTC+12:45)",
    "country": "New Zealand",
    "flag": "🇳🇿",
    "offset": "UTC+12:45",
    "region": "Oceania & Pacific"
  },
  {
    "id": "America/Managua",
    "label": "Managua (UTC-6)",
    "country": "Nicaragua",
    "flag": "🇳🇮",
    "offset": "UTC-6",
    "region": "Americas"
  },
  {
    "id": "Africa/Niamey",
    "label": "Niamey (UTC+1)",
    "country": "Niger",
    "flag": "🇳🇪",
    "offset": "UTC+1",
    "region": "Africa"
  },
  {
    "id": "Africa/Lagos",
    "label": "Lagos / Abuja (UTC+1)",
    "country": "Nigeria",
    "flag": "🇳🇬",
    "offset": "UTC+1",
    "region": "Africa"
  },
  {
    "id": "Europe/Skopje",
    "label": "Skopje (UTC+1)",
    "country": "North Macedonia",
    "flag": "🇲🇰",
    "offset": "UTC+1",
    "region": "Europe"
  },
  {
    "id": "Europe/Oslo",
    "label": "Oslo (UTC+1)",
    "country": "Norway",
    "flag": "🇳🇴",
    "offset": "UTC+1",
    "region": "Europe"
  },
  {
    "id": "Asia/Muscat",
    "label": "Muscat (UTC+4)",
    "country": "Oman",
    "flag": "🇴🇲",
    "offset": "UTC+4",
    "region": "Asia"
  },
  {
    "id": "Asia/Karachi",
    "label": "Karachi / Islamabad (UTC+5)",
    "country": "Pakistan",
    "flag": "🇵🇰",
    "offset": "UTC+5",
    "region": "Asia"
  },
  {
    "id": "Asia/Gaza",
    "label": "Gaza / Ramallah (UTC+2)",
    "country": "Palestine",
    "flag": "🇵🇸",
    "offset": "UTC+2",
    "region": "Asia"
  },
  {
    "id": "America/Panama",
    "label": "Panama City (UTC-5)",
    "country": "Panama",
    "flag": "🇵🇦",
    "offset": "UTC-5",
    "region": "Americas"
  },
  {
    "id": "Pacific/Port_Moresby",
    "label": "Port Moresby (UTC+10)",
    "country": "Papua New Guinea",
    "flag": "🇵🇬",
    "offset": "UTC+10",
    "region": "Oceania & Pacific"
  },
  {
    "id": "America/Asuncion",
    "label": "Asuncion (UTC-4)",
    "country": "Paraguay",
    "flag": "🇵🇾",
    "offset": "UTC-4",
    "region": "Americas"
  },
  {
    "id": "America/Lima",
    "label": "Lima (UTC-5)",
    "country": "Peru",
    "flag": "🇵🇪",
    "offset": "UTC-5",
    "region": "Americas"
  },
  {
    "id": "Asia/Manila",
    "label": "Manila (UTC+8)",
    "country": "Philippines",
    "flag": "🇵🇭",
    "offset": "UTC+8",
    "region": "Asia"
  },
  {
    "id": "Europe/Warsaw",
    "label": "Warsaw (UTC+1)",
    "country": "Poland",
    "flag": "🇵🇱",
    "offset": "UTC+1",
    "region": "Europe"
  },
  {
    "id": "Atlantic/Azores",
    "label": "Azores (UTC-1)",
    "country": "Portugal",
    "flag": "🇵🇹",
    "offset": "UTC-1",
    "region": "Universal & Islands"
  },
  {
    "id": "Europe/Lisbon",
    "label": "Lisbon / Porto (UTC+0)",
    "country": "Portugal",
    "flag": "🇵🇹",
    "offset": "UTC+0",
    "region": "Europe"
  },
  {
    "id": "Atlantic/Madeira",
    "label": "Madeira (UTC+0)",
    "country": "Portugal",
    "flag": "🇵🇹",
    "offset": "UTC+0",
    "region": "Universal & Islands"
  },
  {
    "id": "Asia/Qatar",
    "label": "Doha (UTC+3)",
    "country": "Qatar",
    "flag": "🇶🇦",
    "offset": "UTC+3",
    "region": "Asia"
  },
  {
    "id": "Europe/Bucharest",
    "label": "Bucharest (UTC+2)",
    "country": "Romania",
    "flag": "🇷🇴",
    "offset": "UTC+2",
    "region": "Europe"
  },
  {
    "id": "Asia/Irkutsk",
    "label": "Irkutsk (IRKT) (UTC+8)",
    "country": "Russia",
    "flag": "🇷🇺",
    "offset": "UTC+8",
    "region": "Asia"
  },
  {
    "id": "Europe/Kaliningrad",
    "label": "Kaliningrad (USZ1) (UTC+2)",
    "country": "Russia",
    "flag": "🇷🇺",
    "offset": "UTC+2",
    "region": "Europe"
  },
  {
    "id": "Asia/Krasnoyarsk",
    "label": "Krasnoyarsk (UTC+7)",
    "country": "Russia",
    "flag": "🇷🇺",
    "offset": "UTC+7",
    "region": "Asia"
  },
  {
    "id": "Asia/Magadan",
    "label": "Magadan (UTC+11)",
    "country": "Russia",
    "flag": "🇷🇺",
    "offset": "UTC+11",
    "region": "Asia"
  },
  {
    "id": "Europe/Moscow",
    "label": "Moscow / St. Petersburg (MSK) (UTC+3)",
    "country": "Russia",
    "flag": "🇷🇺",
    "offset": "UTC+3",
    "region": "Europe"
  },
  {
    "id": "Asia/Novosibirsk",
    "label": "Novosibirsk (KRAT) (UTC+7)",
    "country": "Russia",
    "flag": "🇷🇺",
    "offset": "UTC+7",
    "region": "Asia"
  },
  {
    "id": "Asia/Omsk",
    "label": "Omsk (OMST) (UTC+6)",
    "country": "Russia",
    "flag": "🇷🇺",
    "offset": "UTC+6",
    "region": "Asia"
  },
  {
    "id": "Asia/Kamchatka",
    "label": "Petropavlovsk-Kamchatsky (PETT) (UTC+12)",
    "country": "Russia",
    "flag": "🇷🇺",
    "offset": "UTC+12",
    "region": "Asia"
  },
  {
    "id": "Europe/Samara",
    "label": "Samara (SAMT) (UTC+4)",
    "country": "Russia",
    "flag": "🇷🇺",
    "offset": "UTC+4",
    "region": "Europe"
  },
  {
    "id": "Asia/Vladivostok",
    "label": "Vladivostok (VLAT) (UTC+10)",
    "country": "Russia",
    "flag": "🇷🇺",
    "offset": "UTC+10",
    "region": "Asia"
  },
  {
    "id": "Asia/Yakutsk",
    "label": "Yakutsk (YAKT) (UTC+9)",
    "country": "Russia",
    "flag": "🇷🇺",
    "offset": "UTC+9",
    "region": "Asia"
  },
  {
    "id": "Asia/Yekaterinburg",
    "label": "Yekaterinburg (YEKT) (UTC+5)",
    "country": "Russia",
    "flag": "🇷🇺",
    "offset": "UTC+5",
    "region": "Asia"
  },
  {
    "id": "Africa/Kigali",
    "label": "Kigali (UTC+2)",
    "country": "Rwanda",
    "flag": "🇷🇼",
    "offset": "UTC+2",
    "region": "Africa"
  },
  {
    "id": "Asia/Riyadh",
    "label": "Riyadh / Jeddah (UTC+3)",
    "country": "Saudi Arabia",
    "flag": "🇸🇦",
    "offset": "UTC+3",
    "region": "Asia"
  },
  {
    "id": "Africa/Dakar",
    "label": "Dakar (UTC+0)",
    "country": "Senegal",
    "flag": "🇸🇳",
    "offset": "UTC+0",
    "region": "Africa"
  },
  {
    "id": "Europe/Belgrade",
    "label": "Belgrade (UTC+1)",
    "country": "Serbia",
    "flag": "🇷🇸",
    "offset": "UTC+1",
    "region": "Europe"
  },
  {
    "id": "Indian/Mahe",
    "label": "Victoria (UTC+4)",
    "country": "Seychelles",
    "flag": "🇸🇨",
    "offset": "UTC+4",
    "region": "Universal & Islands"
  },
  {
    "id": "Africa/Freetown",
    "label": "Freetown (UTC+0)",
    "country": "Sierra Leone",
    "flag": "🇸🇱",
    "offset": "UTC+0",
    "region": "Africa"
  },
  {
    "id": "Asia/Singapore",
    "label": "Singapore (SGT) (UTC+8)",
    "country": "Singapore",
    "flag": "🇸🇬",
    "offset": "UTC+8",
    "region": "Asia"
  },
  {
    "id": "Europe/Bratislava",
    "label": "Bratislava (UTC+1)",
    "country": "Slovakia",
    "flag": "🇸🇰",
    "offset": "UTC+1",
    "region": "Europe"
  },
  {
    "id": "Europe/Ljubljana",
    "label": "Ljubljana (UTC+1)",
    "country": "Slovenia",
    "flag": "🇸🇮",
    "offset": "UTC+1",
    "region": "Europe"
  },
  {
    "id": "Africa/Mogadishu",
    "label": "Mogadishu (UTC+3)",
    "country": "Somalia",
    "flag": "🇸🇴",
    "offset": "UTC+3",
    "region": "Africa"
  },
  {
    "id": "Africa/Johannesburg",
    "label": "Johannesburg / Cape Town (UTC+2)",
    "country": "South Africa",
    "flag": "🇿🇦",
    "offset": "UTC+2",
    "region": "Africa"
  },
  {
    "id": "Asia/Seoul",
    "label": "Seoul (KST) (UTC+9)",
    "country": "South Korea",
    "flag": "🇰🇷",
    "offset": "UTC+9",
    "region": "Asia"
  },
  {
    "id": "Africa/Juba",
    "label": "Juba (UTC+2)",
    "country": "South Sudan",
    "flag": "🇸🇸",
    "offset": "UTC+2",
    "region": "Africa"
  },
  {
    "id": "Atlantic/Canary",
    "label": "Canary Islands (WET) (UTC+0)",
    "country": "Spain",
    "flag": "🇪🇸",
    "offset": "UTC+0",
    "region": "Universal & Islands"
  },
  {
    "id": "Europe/Madrid",
    "label": "Madrid / Barcelona (CET) (UTC+1)",
    "country": "Spain",
    "flag": "🇪🇸",
    "offset": "UTC+1",
    "region": "Europe"
  },
  {
    "id": "Asia/Colombo",
    "label": "Colombo (UTC+5:30)",
    "country": "Sri Lanka",
    "flag": "🇱🇰",
    "offset": "UTC+5:30",
    "region": "Asia"
  },
  {
    "id": "Africa/Khartoum",
    "label": "Khartoum (UTC+2)",
    "country": "Sudan",
    "flag": "🇸🇩",
    "offset": "UTC+2",
    "region": "Africa"
  },
  {
    "id": "America/Paramaribo",
    "label": "Paramaribo (UTC-3)",
    "country": "Suriname",
    "flag": "🇸🇷",
    "offset": "UTC-3",
    "region": "Americas"
  },
  {
    "id": "Europe/Stockholm",
    "label": "Stockholm (UTC+1)",
    "country": "Sweden",
    "flag": "🇸🇪",
    "offset": "UTC+1",
    "region": "Europe"
  },
  {
    "id": "Europe/Zurich",
    "label": "Zurich / Geneva (UTC+1)",
    "country": "Switzerland",
    "flag": "🇨🇭",
    "offset": "UTC+1",
    "region": "Europe"
  },
  {
    "id": "Asia/Damascus",
    "label": "Damascus (UTC+3)",
    "country": "Syria",
    "flag": "🇸🇾",
    "offset": "UTC+3",
    "region": "Asia"
  },
  {
    "id": "Asia/Taipei",
    "label": "Taipei (UTC+8)",
    "country": "Taiwan",
    "flag": "🇹🇼",
    "offset": "UTC+8",
    "region": "Asia"
  },
  {
    "id": "Asia/Dushanbe",
    "label": "Dushanbe (UTC+5)",
    "country": "Tajikistan",
    "flag": "🇹🇯",
    "offset": "UTC+5",
    "region": "Asia"
  },
  {
    "id": "Africa/Dar_es_Salaam",
    "label": "Dar es Salaam (UTC+3)",
    "country": "Tanzania",
    "flag": "🇹🇿",
    "offset": "UTC+3",
    "region": "Africa"
  },
  {
    "id": "Asia/Bangkok",
    "label": "Bangkok (UTC+7)",
    "country": "Thailand",
    "flag": "🇹🇭",
    "offset": "UTC+7",
    "region": "Asia"
  },
  {
    "id": "Africa/Lome",
    "label": "Lome (UTC+0)",
    "country": "Togo",
    "flag": "🇹🇬",
    "offset": "UTC+0",
    "region": "Africa"
  },
  {
    "id": "America/Port_of_Spain",
    "label": "Port of Spain (UTC-4)",
    "country": "Trinidad and Tobago",
    "flag": "🇹🇹",
    "offset": "UTC-4",
    "region": "Americas"
  },
  {
    "id": "Africa/Tunis",
    "label": "Tunis (UTC+1)",
    "country": "Tunisia",
    "flag": "🇹🇳",
    "offset": "UTC+1",
    "region": "Africa"
  },
  {
    "id": "Europe/Istanbul",
    "label": "Istanbul / Ankara (UTC+3)",
    "country": "Turkey",
    "flag": "🇹🇷",
    "offset": "UTC+3",
    "region": "Europe"
  },
  {
    "id": "Asia/Ashgabat",
    "label": "Ashgabat (UTC+5)",
    "country": "Turkmenistan",
    "flag": "🇹🇲",
    "offset": "UTC+5",
    "region": "Asia"
  },
  {
    "id": "Africa/Kampala",
    "label": "Kampala (UTC+3)",
    "country": "Uganda",
    "flag": "🇺🇬",
    "offset": "UTC+3",
    "region": "Africa"
  },
  {
    "id": "Europe/Kyiv",
    "label": "Kyiv (UTC+2)",
    "country": "Ukraine",
    "flag": "🇺🇦",
    "offset": "UTC+2",
    "region": "Europe"
  },
  {
    "id": "Asia/Dubai",
    "label": "Dubai / Abu Dhabi (GST) (UTC+4)",
    "country": "United Arab Emirates",
    "flag": "🇦🇪",
    "offset": "UTC+4",
    "region": "Asia"
  },
  {
    "id": "Europe/London",
    "label": "London / Edinburgh (GMT/BST) (UTC+0)",
    "country": "United Kingdom",
    "flag": "🇬🇧",
    "offset": "UTC+0",
    "region": "Europe"
  },
  {
    "id": "America/Anchorage",
    "label": "Anchorage (Alaska UTC-9) (UTC-9)",
    "country": "United States",
    "flag": "🇺🇸",
    "offset": "UTC-9",
    "region": "Americas"
  },
  {
    "id": "America/Chicago",
    "label": "Chicago (Central UTC-6) (UTC-6)",
    "country": "United States",
    "flag": "🇺🇸",
    "offset": "UTC-6",
    "region": "Americas"
  },
  {
    "id": "America/Denver",
    "label": "Denver (Mountain UTC-7) (UTC-7)",
    "country": "United States",
    "flag": "🇺🇸",
    "offset": "UTC-7",
    "region": "Americas"
  },
  {
    "id": "Pacific/Honolulu",
    "label": "Honolulu (Hawaii UTC-10) (UTC-10)",
    "country": "United States",
    "flag": "🇺🇸",
    "offset": "UTC-10",
    "region": "Oceania & Pacific"
  },
  {
    "id": "America/Los_Angeles",
    "label": "Los Angeles (Pacific UTC-8) (UTC-8)",
    "country": "United States",
    "flag": "🇺🇸",
    "offset": "UTC-8",
    "region": "Americas"
  },
  {
    "id": "America/New_York",
    "label": "New York (Eastern UTC-5) (UTC-5)",
    "country": "United States",
    "flag": "🇺🇸",
    "offset": "UTC-5",
    "region": "Americas"
  },
  {
    "id": "America/Phoenix",
    "label": "Phoenix (Arizona UTC-7) (UTC-7)",
    "country": "United States",
    "flag": "🇺🇸",
    "offset": "UTC-7",
    "region": "Americas"
  },
  {
    "id": "UTC",
    "label": "UTC (Coordinated Universal Time)",
    "country": "Universal",
    "flag": "🌐",
    "offset": "UTC+0",
    "region": "Universal & Islands"
  },
  {
    "id": "America/Montevideo",
    "label": "Montevideo (UTC-3)",
    "country": "Uruguay",
    "flag": "🇺🇾",
    "offset": "UTC-3",
    "region": "Americas"
  },
  {
    "id": "Asia/Tashkent",
    "label": "Tashkent / Samarkand (UTC+5)",
    "country": "Uzbekistan",
    "flag": "🇺🇿",
    "offset": "UTC+5",
    "region": "Asia"
  },
  {
    "id": "America/Caracas",
    "label": "Caracas (UTC-4)",
    "country": "Venezuela",
    "flag": "🇻🇪",
    "offset": "UTC-4",
    "region": "Americas"
  },
  {
    "id": "Asia/Ho_Chi_Minh",
    "label": "Ho Chi Minh / Hanoi (UTC+7)",
    "country": "Vietnam",
    "flag": "🇻🇳",
    "offset": "UTC+7",
    "region": "Asia"
  },
  {
    "id": "Asia/Aden",
    "label": "Aden / Sana’a (UTC+3)",
    "country": "Yemen",
    "flag": "🇾🇪",
    "offset": "UTC+3",
    "region": "Asia"
  },
  {
    "id": "Africa/Lusaka",
    "label": "Lusaka (UTC+2)",
    "country": "Zambia",
    "flag": "🇿🇲",
    "offset": "UTC+2",
    "region": "Africa"
  },
  {
    "id": "Africa/Harare",
    "label": "Harare (UTC+2)",
    "country": "Zimbabwe",
    "flag": "🇿🇼",
    "offset": "UTC+2",
    "region": "Africa"
  }
];

export const TIMEZONE_REGIONS = [
  'Africa',
  'Americas',
  'Asia',
  'Europe',
  'Oceania & Pacific',
  'Universal & Islands',
] as const;

export function getLanguageDisplay(code: string): string {
  const found = ALL_LANGUAGES.find((l) => l.code === code) || POPULAR_LANGUAGES.find((l) => l.code === code);
  if (found) {
    return `${found.flag} ${found.country} — ${found.name} (${found.code})`;
  }
  return code;
}

export function getTimezoneDisplay(id: string): string {
  if (id === 'auto') return '🌐 Auto-detect (Match Proxy IP / System)';
  const found = ALL_TIMEZONES.find((t) => t.id === id) || POPULAR_TIMEZONES.find((t) => t.id === id);
  if (found) {
    return `${found.flag} ${found.country} — ${found.label}`;
  }
  return id;
}
