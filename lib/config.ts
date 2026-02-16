import "server-only";

type RequiredEnvKey =
  | "QF_CLIENT_ID"
  | "QF_CLIENT_SECRET"
  | "QF_OAUTH_TOKEN_URL"
  | "QF_CONTENT_API_BASE_URL";

const numberOrFallback = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const readEnv = (key: RequiredEnvKey): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable "${key}". Please configure it in .env.local (see .env.example).`,
    );
  }
  return value;
};

export const appConfig = {
  oauthTokenUrl: readEnv("QF_OAUTH_TOKEN_URL"),
  contentApiBaseUrl: readEnv("QF_CONTENT_API_BASE_URL"),
  clientId: readEnv("QF_CLIENT_ID"),
  clientSecret: readEnv("QF_CLIENT_SECRET"),
  defaultAudioReciterId: numberOrFallback(
    process.env.QF_DEFAULT_AUDIO_RECITER,
    7,
  ),
} as const;

export type AppConfig = typeof appConfig;

