#!/usr/bin/env node
// mondayctl — gh-style CLI for monday.com boards and items.
// Design contract: every data command supports --json with stable output, so
// the tool composes with jq, scripts, CI, and AI agents without screen-scraping.

import { createRequire } from "node:module";
import { Command } from "commander";
import { createItem, deleteItem, listBoards, listColumns, listItems, me, MondayError, updateItem } from "./api.js";
import { saveToken } from "./config.js";
import { parseColumns, printJson, printTable } from "./format.js";

// Single source of truth for the version — `npm version` bumps package.json.
const pkg = createRequire(import.meta.url)("../package.json") as { version: string };

const program = new Command();

program
  .name("mondayctl")
  .description("CLI for monday.com: boards, items, search, create, update")
  .version(pkg.version);

program
  .command("auth <token>")
  .description("Save API token (monday.com → avatar → Developers → My access tokens)")
  .action(async (token: string) => {
    const path = saveToken(token);
    const data = await me();
    console.log(`Authenticated as ${data.me.name} <${data.me.email}> (${data.me.account.name})`);
    console.log(`Token saved to ${path}`);
  });

program
  .command("me")
  .description("Show the authenticated user")
  .option("--json", "raw JSON output")
  .action(async (opts: { json?: boolean }) => {
    const data = await me();
    if (opts.json) return printJson(data.me);
    console.log(`${data.me.name} <${data.me.email}> — account: ${data.me.account.name}`);
  });

program
  .command("boards")
  .description("List boards (most recently used first)")
  .option("-l, --limit <n>", "max boards", "25")
  .option("--json", "raw JSON output")
  .action(async (opts: { limit: string; json?: boolean }) => {
    const data = await listBoards(Number(opts.limit));
    if (opts.json) return printJson(data.boards);
    printTable(
      data.boards.map((b) => ({
        id: b.id,
        name: b.name,
        workspace: b.workspace?.name ?? "-",
        items: String(b.items_count),
      })),
    );
  });

program
  .command("items <boardId>")
  .description("List items on a board")
  .option("-l, --limit <n>", "max items", "25")
  .option("-s, --search <text>", "filter by item name (server-side, case-insensitive)")
  .option("--json", "raw JSON output")
  .action(async (boardId: string, opts: { limit: string; search?: string; json?: boolean }) => {
    const items = await listItems(boardId, { limit: Number(opts.limit), search: opts.search });
    if (opts.json) return printJson(items);
    printTable(
      items.map((it) => ({
        id: it.id,
        name: it.name,
        group: it.group?.title ?? "-",
        ...Object.fromEntries(
          it.column_values
            .filter((c) => c.text)
            .slice(0, 4)
            .map((c) => [c.column.title.toLowerCase(), c.text ?? ""]),
        ),
      })),
    );
  });

program
  .command("columns <boardId>")
  .description("List board columns (ids needed for --column flags)")
  .option("--json", "raw JSON output")
  .action(async (boardId: string, opts: { json?: boolean }) => {
    const data = await listColumns(boardId);
    const columns = data.boards[0]?.columns ?? [];
    if (opts.json) return printJson(columns);
    printTable(columns.map((c) => ({ id: c.id, title: c.title, type: c.type })));
  });

program
  .command("create <boardId> <name>")
  .description("Create an item")
  .option(
    "-c, --column <key=value...>",
    'column value, repeatable. JSON for structured columns: -c status=\'{"label":"Done"}\'',
    (v: string, acc: string[]) => [...acc, v],
    [] as string[],
  )
  .option("--json", "raw JSON output")
  .action(async (boardId: string, name: string, opts: { column: string[]; json?: boolean }) => {
    const data = await createItem(boardId, name, parseColumns(opts.column));
    if (opts.json) return printJson(data.create_item);
    console.log(`Created item ${data.create_item.id}: ${data.create_item.name}`);
  });

program
  .command("update <boardId> <itemId>")
  .description("Update item column values")
  .requiredOption(
    "-c, --column <key=value...>",
    "column value, repeatable (same format as create)",
    (v: string, acc: string[]) => [...acc, v],
    [] as string[],
  )
  .option("--json", "raw JSON output")
  .action(async (boardId: string, itemId: string, opts: { column: string[]; json?: boolean }) => {
    const data = await updateItem(boardId, itemId, parseColumns(opts.column));
    if (opts.json) return printJson(data.change_multiple_column_values);
    console.log(`Updated item ${data.change_multiple_column_values.id}`);
  });

program
  .command("delete <itemId...>")
  .description("Delete one or more items (irreversible — moves past monday's trash)")
  .option("--json", "raw JSON output")
  .action(async (itemIds: string[], opts: { json?: boolean }) => {
    const deleted: string[] = [];
    for (const id of itemIds) {
      const data = await deleteItem(id);
      deleted.push(data.delete_item.id);
    }
    if (opts.json) return printJson({ deleted });
    console.log(`Deleted ${deleted.length} item(s): ${deleted.join(", ")}`);
  });

program.parseAsync().catch((err: unknown) => {
  const msg = err instanceof MondayError || err instanceof Error ? err.message : String(err);
  console.error(`error: ${msg}`);
  process.exit(1);
});
