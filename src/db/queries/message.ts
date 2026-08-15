import { db } from "../index";
import type { ExpiredMessage } from "@types";

const insertMessageStmt = db.query<{ id: number }, [number, string, number]>(`
  INSERT INTO message (channel_id, discord_message_id, timestamp_ms)
  VALUES (?, ?, ?)
  ON CONFLICT (channel_id, discord_message_id) DO NOTHING
  RETURNING id;
`);

export const insertMessage = (
  channelId: number,
  discordMessageId: string,
  timestampMs: number,
): number | null => {
  const row = insertMessageStmt.get(channelId, discordMessageId, timestampMs);
  return row?.id ?? null;
};

const expiredMessagesStmt = db.query<ExpiredMessage, [number]>(`
  SELECT message.id AS id,
         message.channel_id AS channel_id,
         channel.discord_channel_id AS discord_channel_id,
         message.discord_message_id AS discord_message_id
  FROM message
  JOIN channel ON channel.id = message.channel_id
  WHERE message.timestamp_ms <= ?
  ORDER BY message.timestamp_ms ASC;
`);

export const getExpiredMessages = (olderThanMs: number): ExpiredMessage[] =>
  expiredMessagesStmt.all(olderThanMs);

const deleteMessageStmt = db.query<never, [number]>(`
  DELETE FROM message WHERE id = ?;
`);

export const deleteMessage = (id: number): void => {
  deleteMessageStmt.run(id);
};
