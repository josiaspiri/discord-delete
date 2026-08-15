import { db } from "../index";
import type { TrackedChannel } from "@types";

const getChannelStmt = db.query<TrackedChannel, [string]>(`
  SELECT id, discord_channel_id, name, last_discord_message_id
  FROM channel
  WHERE discord_channel_id = ?;
`);

export const getChannel = (discordChannelId: string): TrackedChannel | null =>
  getChannelStmt.get(discordChannelId);

const listTrackedChannelsStmt = db.query<TrackedChannel, []>(`
  SELECT id, discord_channel_id, name, last_discord_message_id
  FROM channel;
`);

export const listTrackedChannels = (): TrackedChannel[] =>
  listTrackedChannelsStmt.all();

const insertChannelStmt = db.query<{ id: number }, [string, string, string]>(`
  INSERT INTO channel (discord_channel_id, name, last_discord_message_id)
  VALUES (?, ?, ?)
  RETURNING id;
`);

export const insertChannel = (
  discordChannelId: string,
  name: string,
  lastDiscordMessageId: string,
): number => {
  const row = insertChannelStmt.get(
    discordChannelId,
    name,
    lastDiscordMessageId,
  );
  if (!row) {
    throw new Error(`Failed to insert channel ${discordChannelId}.`);
  }
  return row.id;
};

const updateChannelLastMessageIdStmt = db.query<never, [string, number]>(`
  UPDATE channel SET last_discord_message_id = ? WHERE id = ?;
`);

export const updateChannelLastMessageId = (
  channelId: number,
  discordMessageId: string,
): void => {
  updateChannelLastMessageIdStmt.run(discordMessageId, channelId);
};
