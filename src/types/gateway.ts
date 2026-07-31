import type { Message } from "@types";
import type { Emoji } from "@types";

export enum GatewayEvent {
  addMessage = "MESSAGE_CREATE",
  addReaction = "MESSAGE_REACTION_ADD",
}

export enum GatewayOpCode {
  DISPATCH = 0,
  HEARTBEAT = 1,
  IDENTIFY = 2,
  PRESENCE_UPDATE = 3,
  VOICE_STATE_UPDATE = 4,
  RESUME = 6,
  RECONNECT = 7,
  REQUEST_GUILD_MEMBERS = 8,
  INVALID_SESSION = 9,
  HELLO = 10,
  HEARTBEAT_ACK = 11,
  REQUEST_SOUNDBOARD_SOUNDS = 31,
  QOS_HEARTBEAT = 40,
  REQUEST_CHANNEL_INFO = 43,
}

export enum GatewayCloseCode {
  UNKNOWN_ERROR = 4000,
  UNKNOWN_OPCODE = 4001,
  DECODE_ERROR = 4002,
  NOT_AUTHENTICATED = 4003,
  AUTHENTICATION_FAILED = 4004,
  ALREADY_AUTHENTICATED = 4005,
  INVALID_SEQ = 4007,
  RATE_LIMITED = 4008,
  SESSION_TIMED_OUT = 4009,
  INVALID_SHARD = 4010,
  SHARDING_REQUIRED = 4011,
  INVALID_API_VERSION = 4012,
  INVALID_INTENTS = 4013,
  DISALLOWED_INTENTS = 4014,
}

export interface GatewayEventData<T extends GatewayEvent, D> {
  t: T;
  s: number;
  op: GatewayOpCode;
  d: D;
}

export type GatewayMessageCreate = GatewayEventData<
  GatewayEvent.addMessage,
  Message
>;

export type GatewayReactionAdd = GatewayEventData<
  GatewayEvent.addReaction,
  {
    message_id: string;
    message_author_id: string;
    channel_id: string;
    emoji: Emoji;
  }
>;

export interface GatewayEmitterEvents {
  "gateway:addReaction": [GatewayReactionAdd];
  "gateway:createMessage": [GatewayMessageCreate];
}
