declare namespace NodeJS {
  interface ProcessEnv {
    DISCORD_DELETE_AUTHORIZATION: string;
    DISCORD_DELETE_COOKIE: string;
    EPHEMERAL_TTL_SECONDS?: string;
    EPHEMERAL_SWEEP_INTERVAL_SECONDS?: string;
  }
}
