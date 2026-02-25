import HTTPClient from "./HTTPClientBase";
import type {
  Channel,
  Channels,
  Guilds,
  Me,
  Message,
  Messages,
  MessageSearch,
} from "../types";

export default class APIClient extends HTTPClient {
  me = {
    get: () => this.get<Me>("v9/users/@me"),
  };

  guilds = {
    list: () => this.get<Guilds>("v9/users/@me/guilds"),
    roles: (guildId: string) => this.get(`v9/guilds/${guildId}/roles`),
    member: (guildId: string, userId: string) =>
      this.get(`v9/guilds/${guildId}/members/${userId}`),
  };

  channels = {
    list: () => this.get<Channels>("v9/users/@me/channels"),

    fromGuild: (guildId: string) =>
      this.get<Channels>(`v9/guilds/${guildId}/channels`),

    byId: (channelId: string) => this.get<Channel>(`v9/channels/${channelId}`),
  };

  messages = {
    list: (channel: string, before?: string, limit: number = 50) => {
      const path = `v9/channels/${channel}/messages`;
      const params = new URLSearchParams({ limit: limit.toString() });

      if (before) {
        params.append("before", before);
      }

      const fullPath = `${path}?${params.toString()}`;
      return this.get<Messages>(fullPath);
    },

    search: {
      guild: (guildId: string, authorId: string, offset: number = 0) =>
        this.get<MessageSearch>(
          `v9/guilds/${guildId}/messages/search?author_id=${authorId}&author_type=user&sort_by=timestamp&sort_order=desc&offset=${offset}`,
        ),

      channel: (channelId: string, authorId: string, offset: number = 0) =>
        this.get<MessageSearch>(
          `v9/channels/${channelId}/messages/search?author_id=${authorId}&content=is&author_type=user&sort_by=timestamp&sort_order=desc&offset=${offset}`,
        ),
    },

    get: (channelId: string, messageId: string) =>
      this.get<Message>(`v9/channels/${channelId}/messages/${messageId}`),

    delete: (channelId: string, messageId: string) =>
      this.delete<never>(`v9/channels/${channelId}/messages/${messageId}`),

    removeReaction: (
      channelId: string,
      messageId: string,
      emoji: string,
      emojiId?: string,
    ) => {
      const emojiName = emojiId ? `${emoji}:${emojiId}` : emoji;

      return this.delete<never>(
        `v9/channels/${channelId}/messages/${messageId}/reactions/${
          encodeURIComponent(
            emojiName,
          )
        }/@me`,
      );
    },
  };
}
