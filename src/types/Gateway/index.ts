import type { Message } from "@types";
import type { Emoji } from "@types";

export type GatewayEvents = "MESSAGE_CREATE" | "MESSAGE_REACTION_ADD";

export interface GatewayEvent<T extends GatewayEvents, D> {
  t: T;
  s: number;
  op: number;
  d: D;
}

export type GatewayMessageAdd = GatewayEvent<"MESSAGE_CREATE", Message>;

export type GatewayReactionAdd = GatewayEvent<
  "MESSAGE_REACTION_ADD",
  { emoji: Emoji }
>;
