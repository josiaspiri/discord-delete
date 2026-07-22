import { constants, createInflate } from "zlib";

const socket = new WebSocket(
  "wss://gateway.discord.gg/?encoding=json&v=9&compress=zlib-stream",
);

socket.onopen = () => {
  const inflater = createInflate();
  let buffer = Buffer.alloc(0);
  let heartbeatTimer: Timer | null = null;
  let sequence: number | null = null;

  const sendHeartbeat = (sequence: number | null): void => {
    socket.send(JSON.stringify({
      op: 40,
      d: {
        seq: sequence,
        qos: { "active": false, "ver": 29, "reasons": [] },
      },
    }));
  };

  inflater.on("data", (chunk) => {
    const rawData = chunk.toString("utf-8");

    try {
      const payload = JSON.parse(rawData);

      if (payload.op === 0 && payload.s !== null) {
        sequence = payload.s;
      }

      if (payload.op === 10 || payload.op === 11) {
        if (heartbeatTimer) clearTimeout(heartbeatTimer);
        const interval = payload.d.heartbeat_interval;
        heartbeatTimer = setTimeout(() => sendHeartbeat(sequence), interval);
      }

      if (payload.op === 1) {
        sendHeartbeat(sequence);
      }

      console.log(payload);
    } catch (e) {}
  });

  socket.onmessage = (event) => {
    const { data } = event;
    buffer = Buffer.concat([buffer, data]);

    const flush = Buffer.from([0x00, 0x00, 0xff, 0xff]);
    if (!buffer.subarray(-4).equals(flush)) return;

    inflater.write(buffer);
    inflater.flush(constants.Z_SYNC_FLUSH);

    buffer = Buffer.alloc(0);
  };

  socket.send(JSON.stringify({
      "op": 2,
      "d": {
        "token": process.env.DISCORD_DELETE_AUTHORIZATION,
        "properties": {},
        "client_state": {
          "guild_versions": {},
        },
      },
    },
  ));
};
