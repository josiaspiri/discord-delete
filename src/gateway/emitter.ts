import { EventEmitter } from "events";
import type { GatewayEmitterEvents } from "../types/gateway";

export const gatewayEmitter = new EventEmitter<GatewayEmitterEvents>();
