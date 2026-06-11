import { gql } from "../src/api.js";
await gql(`mutation { delete_item(item_id: 2986920451) { id } }`).catch(() => {});
await gql(
  `mutation ($c: JSON!) { change_multiple_column_values(board_id: 5098331146, item_id: 2986898829, column_values: $c) { id } }`,
  { c: JSON.stringify({ color_mm47xp7f: { label: "Working on it" } }) },
);
console.log("reset done");
