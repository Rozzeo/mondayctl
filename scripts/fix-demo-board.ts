// One-off follow-up: API-created boards have no default columns — add
// Status/Due and fill values on the demo items.

import { gql } from "../src/api.js";

const BOARD = "5098331146";

const mkStatus = await gql<{ create_column: { id: string } }>(
  `mutation ($b: ID!) { create_column(board_id: $b, title: "Status", column_type: status) { id } }`,
  { b: BOARD },
);
const mkDate = await gql<{ create_column: { id: string } }>(
  `mutation ($b: ID!) { create_column(board_id: $b, title: "Due", column_type: date) { id } }`,
  { b: BOARD },
);
const statusCol = mkStatus.create_column.id;
const dateCol = mkDate.create_column.id;
console.log(`columns: ${statusCol}, ${dateCol}`);

const { boards } = await gql<{ boards: Array<{ items_page: { items: Array<{ id: string; name: string }> } }> }>(
  `query ($b: [ID!]) { boards(ids: $b) { items_page(limit: 10) { items { id name } } } }`,
  { b: [BOARD] },
);

const plan: Record<string, [string, string]> = {
  "Ship dark mode": ["Done", "2026-06-05"],
  "Migrate search to pgvector": ["Working on it", "2026-06-18"],
  "Q3 pricing experiments": ["Stuck", "2026-06-25"],
};

for (const item of boards[0]!.items_page.items) {
  const p = plan[item.name];
  if (!p) continue;
  await gql(
    `mutation ($b: ID!, $i: ID!, $c: JSON!) { change_multiple_column_values(board_id: $b, item_id: $i, column_values: $c) { id } }`,
    { b: BOARD, i: item.id, c: JSON.stringify({ [statusCol]: { label: p[0] }, [dateCol]: { date: p[1] } }) },
  );
  console.log(`set: ${item.name} → ${p[0]}, ${p[1]}`);
}
