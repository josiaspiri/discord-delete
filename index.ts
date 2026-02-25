import APIClient from "@api/APIClient";
import UserHeaders from "./userHeaders.json";
import { MessageType } from "@types";
import { sleep } from "bun";
import logUpdate from "log-update";

type State = {
  channels: string[];
  currentIndex: number;
  lastMessageId?: string;
};

type Page = {
  nextLastId: string | undefined;
  continuePaging: boolean;
  messages: number;
  deleted: number;
  reactionsRemoved: number;
};

const { AUTHORIZATION: authorization, COOKIE: cookie } = process.env;

if (!authorization) {
  throw new Error("Missing authorization token.");
}

const headers = {
  ...UserHeaders,
  ...{ authorization, cookie },
} as Record<string, string>;

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

const baseURL = "https://discord.com/api/";
const client = new APIClient(baseURL, headers);
const allChannels: string[] = [];

const populateChannels = async (): Promise<void> => {
  const guilds = await client.guilds.list();
  if (!guilds) throw new Error("No guilds, or something broke.");

  const flatChannels = await client.channels.list();
  if (!flatChannels) throw new Error("No channels, or something broke.");

  const channelIdSet = new Set<string>();
  console.log(`Got ${flatChannels.length ?? 0} DM channels.`);
  for (const ch of flatChannels) {
    channelIdSet.add((ch as any).id);
  }

  for (const guild of guilds) {
    const guildChannels = await client.channels.fromGuild(guild.id);
    console.log(
      `Got ${guildChannels?.length ?? 0} channels from ${guild.name}.`,
    );
    await sleep(1200);
    if (!guildChannels) continue;

    for (const ch of guildChannels) {
      channelIdSet.add((ch as any).id);
    }
  }

  allChannels.push(...Array.from(channelIdSet));
};

const loadChannelsFromIndex = async (): Promise<string[]> => {
  const file = Bun.file("./index.json");
  if (!(await file.exists())) return [];
  try {
    const obj = await file.json() as Record<string, unknown>;
    const ids = Object.keys(obj);
    console.log(`Got ${ids.length} channels from index.json`);
    return ids;
  } catch (_) {
    return [];
  }
};

const loadState = async (): Promise<Partial<State> | null> => {
  try {
    const file = Bun.file("state.json");
    if (!(await file.exists())) return null;
    const text = await file.text();
    return JSON.parse(text) as Partial<State>;
  } catch {
    return null;
  }
};

const saveState = async (state: State): Promise<void> => {
  const json = JSON.stringify(state, null, 2);
  await Bun.write("state.json", json);
};

const getPage = async (
  channel: any,
  meId: string,
  lastId: string | undefined,
): Promise<Page> => {
  const PAGE_SIZE = 100;

  const messages = await client.messages.list(channel.id, lastId, PAGE_SIZE);
  if (!messages || messages.length === 0) {
    return {
      nextLastId: lastId,
      continuePaging: false,
      messages: 0,
      deleted: 0,
      reactionsRemoved: 0,
    };
  }

  const nextLastId = messages.length >= PAGE_SIZE
    ? messages[messages.length - 1]?.id
    : undefined;

  let pageDeleted = 0;
  let pageReactionsRemoved = 0;

  const myMessages = messages.filter(
    (msg) =>
      msg.author.id === meId &&
      [
        MessageType.CHAT_INPUT_COMMAND,
        MessageType.DEFAULT,
        MessageType.REPLY,
      ].includes(msg.type),
  );

  for (const msg of myMessages) {
    await client.messages.delete(msg.channel_id, msg.id);
    await sleep(1200);
    pageDeleted++;
  }

  const remaining = messages.filter((msg) => !myMessages.includes(msg));
  for (const msg of remaining) {
    const myReactions = msg.reactions?.filter((r) => r.me);
    if (!myReactions) continue;

    for (const reaction of myReactions) {
      await client.messages.removeReaction(
        msg.channel_id,
        msg.id,
        reaction.emoji.name,
        reaction.emoji?.id,
      );
      await sleep(1200);
      pageReactionsRemoved++;
    }
  }

  return {
    nextLastId,
    continuePaging: messages.length >= PAGE_SIZE,
    messages: messages.length,
    deleted: pageDeleted,
    reactionsRemoved: pageReactionsRemoved,
  };
};

(async () => {
  await populateChannels();

  let loadedState = await loadState();

  if (
    !loadedState ||
    !Array.isArray(loadedState.channels) ||
    typeof loadedState.currentIndex !== "number"
  ) {
    const indexChannels = await loadChannelsFromIndex();
    const mergedSet = new Set<string>([
      ...indexChannels,
      ...allChannels,
    ]);

    loadedState = {
      channels: Array.from(mergedSet),
      currentIndex: 0,
      lastMessageId: undefined,
    };

    await saveState(loadedState as State);
  }

  const state: State = {
    channels: loadedState.channels!,
    currentIndex: loadedState.currentIndex!,
    lastMessageId: loadedState.lastMessageId,
  };

  console.clear();

  const me = await client.me.get();
  if (!me) {
    throw new Error(
      "Authentication failed. Invalid token or Discord is down.",
    );
  }

  while (state.currentIndex < state.channels.length) {
    const channelId = state.channels[state.currentIndex];
    if (!channelId) {
      state.currentIndex++;
      continue;
    }

    const channel = await client.channels.byId(channelId);
    if (!channel) {
      state.currentIndex++;
      state.lastMessageId = undefined;
      await saveState(state);
      continue;
    }

    let totalInspected = 0;
    let totalDeleted = 0;
    let totalReactionsRemoved = 0;

    let keepPaging = true;
    while (keepPaging) {
      const {
        nextLastId,
        continuePaging,
        messages,
        deleted,
        reactionsRemoved,
      } = await getPage(channel, me.id, state.lastMessageId);

      totalInspected += messages;
      totalDeleted += deleted;
      totalReactionsRemoved += reactionsRemoved;
      logUpdate(
        `Channel: ${channelId} (${state.currentIndex}/${state.channels.length})
      - Messages read: ${totalInspected}
      - Messaged deleted: ${totalDeleted}
      - Reactions removed: ${reactionsRemoved}`,
      );

      state.lastMessageId = nextLastId;
      await saveState(state);

      keepPaging = continuePaging;
    }

    logUpdate.done();
    console.log("\n");

    state.currentIndex++;
    state.lastMessageId = undefined;
    await saveState(state);
  }

  console.log("All done!");
})();
