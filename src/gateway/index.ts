import { constants, createInflate } from "zlib";

const socket = new WebSocket(
  "wss://gateway.discord.gg/?encoding=json&v=9&compress=zlib-stream",
);

socket.onopen = () => {
  const inflater = createInflate();
  let buffer = Buffer.alloc(0);

  inflater.on("data", (chunk) => {
    const rawData = chunk.toString("utf-8");

    try {
      const payload = JSON.parse(rawData);
      console.log(payload);
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

  socket.send(JSON.stringify(
    {
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
