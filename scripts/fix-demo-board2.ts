// Replace the status column with one that has English labels via `defaults`.

import { gql } from "../src/api.js";

const BOARD = "5098331146";

await gql(
  `mutation ($b: ID!) { delete_column(board_id: $b, column_id: "color_mm47tv7a") { id } }`,
  { b: BOARD },
);

const mk = await gql<{ create_column: { id: string } }>(
  `mutation ($b: ID!, $d: JSON) {
     create_column(board_id: $b, title: "Status", column_type: status, defaults: $d) { id }
   }`,
  { b: BOARD, d: JSON.stringify({ labels: { "0": "Working on it", "1": "Done", "2": "Stuck" } }) },
);
const statusCol = mk.create_column.id;
const dateCol = "date_mm47z5kv";
console.log(`status col: ${statusCol}`);

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
