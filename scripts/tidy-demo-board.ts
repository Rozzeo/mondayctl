import { gql } from "../src/api.js";
const BOARD = "5098331146";
await gql(`mutation { delete_item(item_id: 2986917053) { id } }`);
const { boards } = await gql<{ boards: Array<{ groups: Array<{ id: string }> }> }>(
  `query ($b: [ID!]) { boards(ids: $b) { groups { id } } }`, { b: [BOARD] });
await gql(
  `mutation ($b: ID!, $g: String!) { update_group(board_id: $b, group_id: $g, group_attribute: title, new_value: "Q3 Roadmap") { id } }`,
  { b: BOARD, g: boards[0]!.groups[0]!.id });
console.log("tidy done");
