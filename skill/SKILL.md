---
name: mondayctl
description: Work with monday.com boards and items via the mondayctl CLI. Use when the user asks about their monday.com tasks, boards, items, or wants to create/update items.
---

# mondayctl

mondayctl is a gh-style CLI for monday.com (boards, items, search, create, update). Every command supports `--json` with stable output — always prefer `--json` and parse the result instead of screen-scraping tables. Before doing anything, check auth with `mondayctl me`; if it fails, tell the user to run `mondayctl auth <token>` (get a token at monday.com → avatar → Developers → My access tokens; alternatively set `MONDAY_API_TOKEN`).

## Commands

| Command | Example |
|---|---|
| `me` | `mondayctl me --json` — show the authenticated user |
| `boards` | `mondayctl boards -l 50 --json` — list boards, most recently used first (default limit 25) |
| `items <boardId>` | `mondayctl items 123456 -s "deploy" -l 50 --json` — list items; `-s` filters by item name server-side, case-insensitively (default limit 25) |
| `columns <boardId>` | `mondayctl columns 123456 --json` — list column ids, titles, and types |
| `create <boardId> <name>` | `mondayctl create 123456 "Ship v2" -c status='{"label":"Done"}' --json` |
| `update <boardId> <itemId>` | `mondayctl update 123456 789 -c text_col=value --json` |
| `delete <itemId...>` | `mondayctl delete 789 790 --json` — irreversible; always confirm with the user first |
| `auth <token>` | `mondayctl auth abc123` — save the API token |

Column values (`-c key=value`, repeatable; required on `update`):
- Discover column ids with `mondayctl columns <boardId>` before writing — keys are column ids, not titles.
- Plain string for text/number columns: `-c text_col=hello`.
- JSON object for structured columns like status/date/people: `-c status='{"label":"Done"}'`, `-c date4='{"date":"2026-06-15"}'`. Values starting with `{` or `[` are parsed as JSON.

## Workflow

- To resolve a board by name: run `mondayctl boards --json` and match the name case-insensitively. Never guess board or item ids — always look them up via `boards` / `items` first.
- For bulk operations, loop in bash, e.g.:
  `for id in $(mondayctl items 123456 -s "bug" --json | jq -r '.[].id'); do mondayctl update 123456 "$id" -c status='{"label":"Done"}'; done`
- Always quote JSON column values in single quotes so the shell does not eat the braces and inner double quotes.
- On errors the CLI prints `error: <message>` and exits 1; surface that message to the user.

## Safety

`create` and `update` mutate the user's real monday.com workspace. Confirm with the user before bulk writes or anything destructive, and show exactly which items will be changed.
