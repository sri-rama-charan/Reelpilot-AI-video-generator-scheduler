export const LANGUAGES = [
  {
    language: "English",
    countryCode: "US",
    countryFlag: "🇺🇸",
    modelName: "deepgram",
    modelLangCode: "en-US",
  },
  {
    language: "Spanish",
    countryCode: "MX",
    countryFlag: "🇲🇽",
    modelName: "deepgram",
    modelLangCode: "es-MX",
  },
  {
    language: "German",
    countryCode: "DE",
    countryFlag: "🇩🇪",
    modelName: "deepgram",
    modelLangCode: "de-DE",
  },
  {
    language: "Hindi",
    countryCode: "IN",
    countryFlag: "🇮🇳",
    modelName: "fonadalab",
    modelLangCode: "hi-IN",
  },
  {
    language: "Marathi",
    countryCode: "IN",
    countryFlag: "🇮🇳",
    modelName: "fonadalab",
    modelLangCode: "mr-IN",
  },
  {
    language: "Telugu",
    countryCode: "IN",
    countryFlag: "🇮🇳",
    modelName: "fonadalab",
    modelLangCode: "te-IN",
  },
  {
    language: "Tamil",
    countryCode: "IN",
    countryFlag: "🇮🇳",
    modelName: "fonadalab",
    modelLangCode: "ta-IN",
  },
  {
    language: "French",
    countryCode: "FR",
    countryFlag: "🇫🇷",
    modelName: "deepgram",
    modelLangCode: "fr-FR",
  },
  {
    language: "Dutch",
    countryCode: "NL",
    countryFlag: "🇳🇱",
    modelName: "deepgram",
    modelLangCode: "nl-NL",
  },
  {
    language: "Italian",
    countryCode: "IT",
    countryFlag: "🇮🇹",
    modelName: "deepgram",
    modelLangCode: "it-IT",
  },
  {
    language: "Japanese",
    countryCode: "JP",
    countryFlag: "🇯🇵",
    modelName: "deepgram",
    modelLangCode: "ja-JP",
  },
];

export const DEEPGRAM_VOICES = [
  {
    model: "deepgram",
    modelName: "aura-2-odysseus-en",
    preview: "voice/deepgram-aura-2-odysseus-en.wav",
    gender: "male",
  },
  {
    model: "deepgram",
    modelName: "aura-2-thalia-en",
    preview: "voice/deepgram-aura-2-thalia-en.wav",
    gender: "female",
  },
  {
    model: "deepgram",
    modelName: "aura-2-amalthea-en",
    preview: "voice/deepgram-aura-2-amalthea-en.wav",
    gender: "female",
  },
  {
    model: "deepgram",
    modelName: "aura-2-andromeda-en",
    preview: "voice/deepgram-aura-2-andromeda-en.wav",
    gender: "female",
  },
  {
    model: "deepgram",
    modelName: "aura-2-apollo-en",
    preview: "voice/deepgram-aura-2-apollo-en.wav",
    gender: "male",
  },
];

export const FONADALAB_VOICES = [
  {
    model: "fonadalab",
    modelName: "vanee",
    preview: "voice/fonadalab-Vaanee.mp3",
    gender: "female",
  },
  {
    model: "fonadalab",
    modelName: "chitraa",
    preview: "voice/fonadalab-Chaitra.mp3",
    gender: "female",
  },
  {
    model: "fonadalab",
    modelName: "meghra", // Adding this since it was found in folder
    preview: "voice/fonadalab-Meghra.mp3",
    gender: "male", // Assuming male base on name, but could be female
  },
  {
    model: "fonadalab",
    modelName: "nirvani",
    preview: "voice/fonadalab-Nirvani.mp3",
    gender: "female",
  },
];

export const ALL_VOICES = [...DEEPGRAM_VOICES, ...FONADALAB_VOICES];
