export interface TrackedChannel {
  id: number;
  discord_channel_id: string;
  name: string;
  last_discord_message_id: string | null;
}

export interface ExpiredMessage {
  id: number;
  channel_id: number;
  discord_channel_id: string;
  discord_message_id: string;
}

export interface ExpiredReaction {
  id: number;
  discord_channel_id: string;
  discord_message_id: string;
  emoji_name: string;
  emoji_id: string | null;
}
