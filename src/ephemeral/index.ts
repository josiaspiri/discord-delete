import dotenv from "dotenv";
import { join } from "path";
import { sleep } from "bun";
import APIClient from "@api/APIClient";
import { gatewayEmitter } from "../gateway";
import { CWD } from "../utility";
import { defaults } from "../defaults";
import {
  deleteMessage,
  getExpiredMessages,
  insertMessage,
} from "../db/queries/message";
import {
  deleteMessageReactions,
  deleteReaction,
  getExpiredReactions,
  insertReaction,
} from "../db/queries/reaction";
import {
  getChannel,
  insertChannel,
  listTrackedChannels,
  updateChannelLastMessageId,
} from "../db/queries/channel";
import { RateLimitedQueue } from "./queue";
import type { Message, ReactionAddPayload } from "@types";

const prompt = `===
Running this is against Discord ToS and may result in account termination, unwanted data loss, and possibly more!
By agreeing to this prompt, you acknowledge that you are solely responsible for the outcomes of executing this program.
Enter "I AGREE" to agree and proceed.
===
`;

console.warn(prompt);

for await (const line of console) {
  if (line === "I AGREE") break;
  else throw new Error("You MUST agree.");
}

console.clear();

dotenv.config({ path: join(CWD, ".env"), quiet: true });

const {
  DISCORD_DELETE_AUTHORIZATION: authorization,
  DISCORD_DELETE_COOKIE: cookie,
} = process.env;

if (!authorization) {
  throw new Error("Missing authorization token.");
}

const TTL_MS =
  (Number(process.env.EPHEMERAL_TTL_SECONDS) || defaults.ephemeral.ttlSeconds) *
  1000;
const SWEEP_INTERVAL_MS =
  (Number(process.env.EPHEMERAL_SWEEP_INTERVAL_SECONDS) ||
    defaults.ephemeral.sweepIntervalSeconds) * 1000;
const RATE_LIMIT_DELAY_MS = defaults.rateLimitDelayMs;
const BACKFILL_PAGE_SIZE = defaults.pageSize;

const client = new APIClient("https://discord.com/api/", {
  authorization,
  ...(cookie ? { cookie } : {}),
});

let meId: string;

const resolveChannelDbId = (
  discordChannelId: string,
  seedDiscordMessageId: string | null,
): number => {
  const tracked = getChannel(discordChannelId);
  if (!tracked) {
    return insertChannel(
      discordChannelId,
      discordChannelId,
      seedDiscordMessageId,
    );
  }
  return tracked.id;
};

const trackMessage = (channelDbId: number, message: Message) => {
  if (message.author.id !== meId) return;
  insertMessage(channelDbId, message.id, Date.parse(message.timestamp));
};

const trackReaction = (channelDbId: number, reaction: ReactionAddPayload) => {
  if (reaction.user_id !== meId) return;
  insertReaction(
    channelDbId,
    reaction.message_id,
    reaction.emoji.name,
    reaction.emoji.id ?? null,
    Date.now(),
  );
};

const catchUpChannel = async (
  channelDbId: number,
  discordChannelId: string,
  lastDiscordMessageId: string,
): Promise<string> => {
  let after = lastDiscordMessageId;

  for (;;) {
    const { data: page } = await client.messages.list(
      discordChannelId,
      undefined,
      BACKFILL_PAGE_SIZE,
      after,
    );
    if (!page || page.length === 0) break;

    const chronological = [...page].reverse();
    for (const message of chronological) {
      trackMessage(channelDbId, message);

      for (const reaction of message.reactions ?? []) {
        if (!reaction.me) continue;
        insertReaction(
          channelDbId,
          message.id,
          reaction.emoji.name,
          reaction.emoji.id,
          Date.now(),
        );
      }

      after = message.id;
    }

    await sleep(RATE_LIMIT_DELAY_MS);
    if (page.length < BACKFILL_PAGE_SIZE) break;
  }

  return after;
};

const backfillTrackedChannels = async () => {
  for (const channel of listTrackedChannels()) {
    if (!channel.last_discord_message_id) continue;

    const newLastMessageId = await catchUpChannel(
      channel.id,
      channel.discord_channel_id,
      channel.last_discord_message_id,
    );

    if (newLastMessageId !== channel.last_discord_message_id) {
      updateChannelLastMessageId(channel.id, newLastMessageId);
    }
  }
};

const deletionQueue = new RateLimitedQueue(RATE_LIMIT_DELAY_MS);

const enqueueDeletion = <T>(
  pending: Set<T>,
  id: T,
  task: () => Promise<void>,
) => {
  if (pending.has(id)) return;
  pending.add(id);

  deletionQueue.push(async () => {
    try {
      await task();
    } finally {
      pending.delete(id);
    }
  });
};

const pendingReactionIds = new Set<number>();
const pendingDeleteMessageKeys = new Set<string>();
const messageKey = (discordChannelId: string, discordMessageId: string) =>
  `${discordChannelId}:${discordMessageId}`;

const sweepExpiredMessages = () => {
  const expired = getExpiredMessages(Date.now() - TTL_MS);

  for (const message of expired) {
    const key = messageKey(
      message.discord_channel_id,
      message.discord_message_id,
    );

    enqueueDeletion(pendingDeleteMessageKeys, key, async () => {
      const { ok, status } = await client.messages.delete(
        message.discord_channel_id,
        message.discord_message_id,
      );
      if (!ok && status !== 404) return;

      deleteMessage(message.id);
      deleteMessageReactions(message.channel_id, message.discord_message_id);
    });
  }
};

const sweepExpiredReactions = () => {
  const expired = getExpiredReactions(Date.now() - TTL_MS);

  for (const reaction of expired) {
    const key = messageKey(
      reaction.discord_channel_id,
      reaction.discord_message_id,
    );
    if (pendingDeleteMessageKeys.has(key)) {
      deleteReaction(reaction.id);
      continue;
    }

    enqueueDeletion(pendingReactionIds, reaction.id, async () => {
      const { ok, status } = await client.messages.removeReaction(
        reaction.discord_channel_id,
        reaction.discord_message_id,
        reaction.emoji_name,
        reaction.emoji_id ?? undefined,
      );
      if (!ok && status !== 404) return;

      deleteReaction(reaction.id);
    });
  }
};

export const startEphemeralMessaging = async () => {
  const { data: me } = await client.me.get();
  if (!me) {
    throw new Error("Authentication failed. Invalid token or Discord is down.");
  }
  meId = me.id;

  gatewayEmitter.on("gateway:createMessage", (payload) => {
    const message = payload.d;
    if (message.author.id !== meId) return;

    const channelDbId = resolveChannelDbId(message.channel_id, message.id);
    updateChannelLastMessageId(channelDbId, message.id);
    trackMessage(channelDbId, message);
  });

  gatewayEmitter.on("gateway:addReaction", (payload) => {
    const reaction = payload.d;
    if (reaction.user_id !== meId) return;

    const channelDbId = resolveChannelDbId(reaction.channel_id, null);
    trackReaction(channelDbId, reaction);
  });

  await backfillTrackedChannels();

  const sweep = () => {
    sweepExpiredMessages();
    sweepExpiredReactions();
  };

  setInterval(sweep, SWEEP_INTERVAL_MS);
  sweep();

  console.log(
    `Ephemeral messaging active. Messages and reactions older than ${
      TTL_MS / 1000
    }s will be deleted.`,
  );
};

startEphemeralMessaging();
