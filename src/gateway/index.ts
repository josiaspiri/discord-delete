import { constants, createInflate } from "zlib";
import { gatewayEmitter } from "./emitter";
import {
  GatewayCloseCode,
  GatewayEvent,
  GatewayOpCode,
} from "../types/gateway";

export { gatewayEmitter };

const FATAL_CLOSE_CODES = new Set<number>([
  GatewayCloseCode.AUTHENTICATION_FAILED,
  GatewayCloseCode.INVALID_SHARD,
  GatewayCloseCode.SHARDING_REQUIRED,
  GatewayCloseCode.INVALID_API_VERSION,
  GatewayCloseCode.INVALID_INTENTS,
  GatewayCloseCode.DISALLOWED_INTENTS,
]);

const connect = () => {
  const socket = new WebSocket(
    "wss://gateway.discord.gg/?encoding=json&v=9&compress=zlib-stream",
  );

  socket.onopen = () => {
    const inflater = createInflate();
    const flush = Buffer.from([0x00, 0x00, 0xff, 0xff]);
    let heartbeatIntervalMs = 0;
    let heartbeatInterval: Timer | null = null;
    let buffer = Buffer.alloc(0);
    let sequence: number | null = null;
    let chunks: Buffer[] = [];

    const sendHeartbeat = (sequence: number | null): void => {
      socket.send(JSON.stringify({
        op: GatewayOpCode.QOS_HEARTBEAT,
        d: {
          seq: sequence,
          qos: { active: false, ver: 29, reasons: [] },
        },
      }));
    };

    inflater.on("data", (chunk) => {
      chunks.push(chunk);
    });

    const handlePayload = (payload: any) => {
      if (payload.s && payload.op === GatewayOpCode.DISPATCH) {
        sequence = payload.s;
      }

      if (payload.op === GatewayOpCode.HELLO) {
        heartbeatIntervalMs = payload.d.heartbeat_interval;

        if (!heartbeatIntervalMs || heartbeatIntervalMs === 0) {
          throw Error("Invalid hearbeat interval. Did the API change?");
        }
        sendHeartbeat(sequence);
      }

      if (payload.op === GatewayOpCode.HEARTBEAT_ACK) {
        heartbeatInterval && clearTimeout(heartbeatInterval);
        heartbeatInterval = setTimeout(() => {
          sendHeartbeat(sequence);
        }, heartbeatIntervalMs);
      }

      if (payload.op === GatewayOpCode.HEARTBEAT) {
        sendHeartbeat(sequence);
      }

      if (payload.op === GatewayOpCode.RECONNECT) {
        heartbeatInterval && clearTimeout(heartbeatInterval);
        socket.close();
      }

      if (payload.t === GatewayEvent.addReaction) {
        gatewayEmitter.emit("gateway:addReaction", payload);
      }

      if (payload.t === GatewayEvent.createMessage) {
        gatewayEmitter.emit("gateway:createMessage", payload);
      }
    };

    socket.onclose = (event) => {
      if (FATAL_CLOSE_CODES.has(event.code)) {
        throw new Error("Gateway closed with fatal code.");
      }
      connect();
    };

    socket.onmessage = (event) => {
      const { data } = event;
      buffer = Buffer.concat([buffer, data]);

      if (!buffer.subarray(-4).equals(flush)) return;

      inflater.write(buffer);
      inflater.flush(constants.Z_SYNC_FLUSH, () => {
        const rawData = Buffer.concat(chunks).toString("utf-8");
        chunks = [];
        handlePayload(JSON.parse(rawData));
      });

      buffer = Buffer.alloc(0);
    };

    socket.send(JSON.stringify({
      op: GatewayOpCode.IDENTIFY,
      d: {
        token: process.env.DISCORD_DELETE_AUTHORIZATION,
        properties: {},
        client_state: {
          guild_versions: {},
        },
      },
    }));
  };
};

connect();
