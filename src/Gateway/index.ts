// This file is currently unused.
import { constants, createInflate } from "zlib";

const socket = new WebSocket(
  "wss://gateway.discord.gg/?encoding=json&v=9&compress=zlib-stream",
);

socket.onopen = () => {
  const logFile = Bun.file("ws-output.txt");
  const logWriter = logFile.writer();
  const inflater = createInflate();
  let buffer = Buffer.alloc(0);

  inflater.on("data", (chunk) => {
    const rawData = chunk.toString("utf-8");

    try {
      const payload = JSON.parse(rawData);
      logWriter.write(payload);
      logWriter.flush();
    } catch (_) {}
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
      "token": process.env.AUTHORIZATION,
      "capabilities": 0,
      "properties": {
        "os": "",
        "browser": "",
        "device": "",
        "system_locale": "",
        "has_client_mods": false,
        "browser_user_agent": "",
        "browser_version": "",
        "os_version": "",
        "referrer": "",
        "referring_domain": "",
        "referrer_current": "",
        "referring_domain_current": "",
        "release_channel": "stable",
        "client_build_number": 0,
        "client_event_source": null,
        "client_launch_id": "",
        "is_fast_connect": true,
      },
      "client_state": {
        "guild_versions": {},
      },
    },
  }));
};
