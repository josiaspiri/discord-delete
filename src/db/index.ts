import { Database } from "bun:sqlite";
import { CWD } from "../utility";
import * as path from "path";

export const db = new Database(path.join(CWD, "db.sqlite"), {
  create: true,
  strict: true,
});

db.run(`
  PRAGMA foreign_keys = ON;
`);

db.run(`
  CREATE TABLE IF NOT EXISTS channel (
    id INTEGER PRIMARY KEY,
    discord_channel_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    last_discord_message_id TEXT
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS message (
    id INTEGER PRIMARY KEY,
    channel_id INTEGER NOT NULL,
    discord_message_id TEXT NOT NULL,
    timestamp_ms INTEGER NOT NULL,
    FOREIGN KEY (channel_id) REFERENCES channel(id) ON DELETE CASCADE,
    UNIQUE (channel_id, discord_message_id)
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS reaction (
    id INTEGER PRIMARY KEY,
    channel_id INTEGER NOT NULL,
    discord_message_id TEXT NOT NULL,
    emoji_name TEXT NOT NULL,
    emoji_id TEXT,
    timestamp_ms INTEGER NOT NULL,
    FOREIGN KEY (channel_id) REFERENCES channel(id) ON DELETE CASCADE,
    UNIQUE (channel_id, discord_message_id, emoji_name, emoji_id)
  );
`);

db.run(`
  CREATE INDEX IF NOT EXISTS idx_message_channel_tm ON message(channel_id, timestamp_ms);
  CREATE INDEX IF NOT EXISTS idx_message_channel_dmi ON message(channel_id, discord_message_id);
  CREATE INDEX IF NOT EXISTS idx_reaction_channel_tm ON reaction(channel_id, timestamp_ms);
`);
