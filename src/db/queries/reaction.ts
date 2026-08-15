import { db } from "../index";
import type { ExpiredReaction } from "@types";

const insertReactionStmt = db.query<
  { id: number },
  [number, string, string, string | null, number]
>(`
  INSERT INTO reaction (
    channel_id, discord_message_id, emoji_name, emoji_id, timestamp_ms
  )
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT (channel_id, discord_message_id, emoji_name, emoji_id)
  DO NOTHING
  RETURNING id;
`);

export const insertReaction = (
  channelId: number,
  discordMessageId: string,
  emojiName: string,
  emojiId: string | null,
  timestampMs: number,
): number | null => {
  const row = insertReactionStmt.get(
    channelId,
    discordMessageId,
    emojiName,
    emojiId,
    timestampMs,
  );
  return row?.id ?? null;
};

const expiredReactionsStmt = db.query<ExpiredReaction, [number]>(`
  SELECT reaction.id AS id,
         channel.discord_channel_id AS discord_channel_id,
         reaction.discord_message_id AS discord_message_id,
         reaction.emoji_name AS emoji_name,
         reaction.emoji_id AS emoji_id
  FROM reaction
  JOIN channel ON channel.id = reaction.channel_id
  WHERE reaction.timestamp_ms <= ?
  ORDER BY reaction.timestamp_ms ASC;
`);

export const getExpiredReactions = (olderThanMs: number): ExpiredReaction[] =>
  expiredReactionsStmt.all(olderThanMs);

const deleteReactionStmt = db.query<never, [number]>(`
  DELETE FROM reaction WHERE id = ?;
`);

export const deleteReaction = (id: number): void => {
  deleteReactionStmt.run(id);
};

const deleteMessageReactionsStmt = db.query<never, [number, string]>(`
  DELETE FROM reaction WHERE channel_id = ? AND discord_message_id = ?;
`);

export const deleteMessageReactions = (
  channelId: number,
  discordMessageId: string,
): void => {
  deleteMessageReactionsStmt.run(channelId, discordMessageId);
};
