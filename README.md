# mondayctl

A `gh`-style CLI for monday.com boards and items — built for humans, scripts, and AI agents. ⚡

## Why

monday.com ships an official MCP server and an official CLI (`mapps`), but the latter is only for app deployment — there is no first-party CLI for working with your actual data. `mondayctl` fills that gap:

- **Composes with everything.** Pipe into `jq`, call it from cron, wire it into CI. No SDK, no boilerplate.
- **Zero context cost for AI agents.** An MCP server spends context tokens on tool schemas in every session. A CLI that an agent already knows how to call (`bash` + `--json`) costs nothing — the agent just runs `mondayctl items 123 --json` and parses the output.
- **Stable machine output.** Every read/write command takes `--json` and prints raw API data, so scripts never screen-scrape tables.

## Install

```sh
npm install -g mondayctl
```


Requires Node.js >= 20.

## Quick start

### 1. Get an API token

In monday.com: click your avatar → **Developers** → **My access tokens** → copy the token.

### 2. Authenticate

```console
$ mondayctl auth eyJhbGciOiJIUzI1NiJ9...
Authenticated as Jane Doe <jane@example.com> (Acme Inc)
Token saved to ~/.config/mondayctl/config.json
```

### 3. Explore boards and items

```console
$ mondayctl boards
ID          NAME              WORKSPACE   ITEMS
4892013375  Product Roadmap   Main        42
4892013412  Bug Tracker       Main        17
4901224801  Hiring Pipeline   People      9

$ mondayctl items 4892013412 --search login
ID          NAME                       GROUP     STATUS       OWNER
8812734401  Login fails on Safari      Backlog   Working on   Dana
8812735990  Add SSO login              Q3        Stuck        Roza
```

### 4. Create and update items

```console
$ mondayctl columns 4892013412
ID       TITLE    TYPE
name     Name     name
status   Status   status
date4    Due      date
person   Owner    people

$ mondayctl create 4892013412 "Fix token refresh" -c status='{"label":"Working on"}' -c date4='{"date":"2026-06-18"}'
Created item 8812741203: Fix token refresh

$ mondayctl update 4892013412 8812741203 -c status='{"label":"Done"}'
Updated item 8812741203
```

## Commands

| Command | Description | Options |
|---|---|---|
| `auth <token>` | Save API token to `~/.config/mondayctl/config.json` | |
| `me` | Show the authenticated user | `--json` |
| `boards` | List boards (most recently used first) | `-l, --limit <n>` (default 25), `--json` |
| `items <boardId>` | List items on a board | `-l, --limit <n>` (default 25), `-s, --search <text>` (server-side, case-insensitive name filter), `--json` |
| `columns <boardId>` | List board columns (ids needed for `--column` flags) | `--json` |
| `create <boardId> <name>` | Create an item | `-c, --column <key=value>` (repeatable), `--json` |
| `update <boardId> <itemId>` | Update item column values | `-c, --column <key=value>` (repeatable, required), `--json` |

## Usage with AI agents

`mondayctl` is designed to be driven by coding agents like Claude Code through their shell tool — no MCP setup, no tool schemas loaded into context. An agent session looks like this:

```text
> Move all "Stuck" items on the bug tracker to "Working on"

⏺ Bash(mondayctl items 4892013412 --json | jq -r '.[] | select(.column_values[]
      | select(.id == "status").text == "Stuck") | .id')
  ⎿ 8812735990

⏺ Bash(mondayctl update 4892013412 8812735990 -c status='{"label":"Working on"}')
  ⎿ Updated item 8812735990
```

The `--json` flag is the contract: output is the raw monday.com API response, stable across versions, so agents and scripts can rely on its shape. A typical pipe:

```sh
mondayctl boards --json | jq -r '.[] | "\(.id)\t\(.name)"'
```

## Column values

Plain strings work for text and number columns; structured columns (status, date, people, …) take JSON values:

```sh
mondayctl update <boardId> <itemId> \
  -c text_col="Plain string value" \
  -c status='{"label":"Done"}' \
  -c date4='{"date":"2026-06-11"}'
```

Any value starting with `{` or `[` is parsed as JSON; everything else passes through as a string. Run `mondayctl columns <boardId>` to discover the column ids and types for a board.

## Configuration

Token resolution order:

1. `MONDAY_API_TOKEN` environment variable (CI, agents, one-off use)
2. `~/.config/mondayctl/config.json` — written by `mondayctl auth` with file mode `0600`

## Development

```sh
npm run dev    # run from source (tsx)
npm run build  # compile to dist/
npm test       # vitest
```

## License

MIT
