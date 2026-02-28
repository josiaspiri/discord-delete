# Discord Delete

A fire-and-forget solution to delete as many _**of your**_ messages and
reactions as possible from guild channels, DMs, and group DMs. Compatible with
[Discord's data export](https://support.discord.com/hc/en-us/articles/360004027692-Requesting-a-Copy-of-your-Data)
to remove data from long forgotten channels. Created for fun and inspired by the
desire to further reduce my online footprint.

## Disclaimer

**This project and myself are not affiliated with Discord Inc.**

**This is against the [ToS](https://discord.com/terms)** and is considered a
[self-bot](https://support.discord.com/hc/en-us/articles/115002192352-Automated-User-Accounts-Self-Bots).
As such, your account may be terminated.

**Discord's Data Retention Policy** states that deleted posts _may_ be retained
for
[180 days to two years](https://support.discord.com/hc/en-us/articles/5431812448791-How-long-Discord-keeps-your-information).

_Messages and reactions in inaccessible channels will remain._

## Setup

### Auth Token (mandatory)

**DO NOT share this token or paste it anywhere you wouldn't paste a password!
Clear your clipboard if you copy/paste it into .env! It grants full access to
your account.**

Find your authorization token by opening Discord in your browser, opening the
browser's network inspector, signing in, then copying the "Authorization"
request header from an HTTP request (@me from /api/v9/quests/@me, for example).

- Once found, paste between the quotes in a file named ".env". See
  ".env.example" for reference.

### Headers

See userHeaders.example.json. These are used for every request and may be
modified to match your client/browser.

### Data Export

If you've requested your data export and downloaded it, simply drop index.json
from ./package/Messages/index.json into this project's root directory or next to
the executable and the channels within will be added to the list.

## Usage

**Note:** This operation may take a long time to complete depending on your
account age and usage. Fret not, the program may be stopped and resumed without
losing progress. See state.json to get an idea of how things are coming along.

### From Source

Install [Bun](https://bun.com/), a JS runtime.

Linux/MacOS:

```bash
curl -fsSL https://bun.sh/install | bash
```

Windows:

```bash
powershell -c "irm bun.sh/install.ps1 | iex"
```

After completing the steps in the "Setup" section, open a terminal/powershell in
the root directory and run:

```bash
bun i && bun index.ts
```

You will be presented with a dialogue to accept sole responsibility for any
outcomes of using this program.

### From Download

Download the executable for your OS and architecture from
[releases](https://github.com/josiaspiri/discord-delete/releases). At minimum,
create a .env file next to it including your auth token. Run the file and the
process will begin.

You will be presented with a dialogue to accept sole responsibility for any
outcomes of using this program.

## Musings

Using the websocket gateway, I think it would be fun to mark self message
creation events as ephemeral and automatically delete them after a configurable
lifespan. I don't intend to keep my account past 2026-02-28, so this is unlikely
to happen by my hand, but their
[blog post](https://discord.com/blog/how-discord-reduced-websocket-traffic-by-40-percent)
on reducing websocket traffic was a good read!

## Contributing

Pull requests to help maintain, better delete your data, or improve the codebase
are welcome. Anything beyond this project's stated purpose will be declined.
