// One-off: creates a presentable English demo board for the README GIF.
// Not part of the package. Run: npx tsx scripts/make-demo-board.ts

import { gql } from "../src/api.js";

const { create_board } = await gql<{ create_board: { id: string } }>(
  `mutation { create_board(board_name: "Product Roadmap", board_kind: public) { id } }`,
);
const boardId = create_board.id;
console.log(`board: ${boardId}`);

const { boards } = await gql<{ boards: Array<{ columns: Array<{ id: string; type: string }> }> }>(
  `query ($b: [ID!]) { boards(ids: $b) { columns { id type } } }`,
  { b: [boardId] },
);
const cols = boards[0]!.columns;
const statusCol = cols.find((c) => c.type === "status")?.id;
const dateCol = cols.find((c) => c.type === "date")?.id;
console.log(`status col: ${statusCol}, date col: ${dateCol}`);

const items: Array<[string, string, string]> = [
  ["Ship dark mode", "Done", "2026-06-05"],
  ["Migrate search to pgvector", "Working on it", "2026-06-18"],
  ["Q3 pricing experiments", "Stuck", "2026-06-25"],
];

for (const [name, label, date] of items) {
  const colVals: Record<string, unknown> = {};
  if (statusCol) colVals[statusCol] = { label };
  if (dateCol) colVals[dateCol] = { date };
  await gql(
    `mutation ($b: ID!, $n: String!, $c: JSON) { create_item(board_id: $b, item_name: $n, column_values: $c) { id } }`,
    { b: boardId, n: name, c: JSON.stringify(colVals) },
  );
  console.log(`item: ${name}`);
}
