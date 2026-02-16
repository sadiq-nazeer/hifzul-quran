export type RevelationPlace = "meccan" | "medinan";

export type ChapterSummary = {
  id: number;
  nameArabic: string;
  nameSimple: string;
  nameComplex: string;
  revelationPlace: RevelationPlace;
  versesCount: number;
  pageNumber: number;
};

export type TranslationSnippet = {
  id: number;
  verseKey: string;
  text: string;
  languageName: string;
  resourceName: string;
};

export type TafsirSnippet = {
  id: number;
  verseKey: string;
  text: string;
  resourceName: string;
};

export type VerseText = {
  id: number;
  verseKey: string;
  hizbNumber?: number;
  juzNumber?: number;
  pageNumber?: number;
  textUthmani: string;
  textIndopak?: string;
  textImlaeiSimple?: string;
  sajdah?: boolean;
};

export type AudioFile = {
  url: string;
  durationSeconds: number;
  format: string;
  segments?: Array<[number, number]>;
};

export type VerseAudio = {
  verseKey: string;
  audio: AudioFile;
  reciterId: number;
};

export type ReciterProfile = {
  id: number;
  name: string;
  style: string;
  translatedName?: string;
};

export type VersePayload = {
  verse: VerseText;
  translation?: TranslationSnippet;
  tafsir?: TafsirSnippet;
  audio?: VerseAudio;
};

export type CoachSessionVerse = VersePayload & {
  chapterId: number;
  orderInChapter: number;
};

