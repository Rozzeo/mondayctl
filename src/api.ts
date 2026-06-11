// Thin GraphQL client for the monday.com API (https://api.monday.com/v2).
// No SDK dependency: one fetch, explicit error surfacing. monday returns
// HTTP 200 with an `errors` array on most failures, so both paths are checked.

import { getToken } from "./config.js";

const API_URL = "https://api.monday.com/v2";

export class MondayError extends Error {}

export async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const token = getToken();
  if (!token) {
    throw new MondayError(
      "No API token. Run `mondayctl auth <token>` or set MONDAY_API_TOKEN.\n" +
        "Get a token: monday.com → avatar → Developers → My access tokens.",
    );
  }

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new MondayError(`monday.com API: HTTP ${res.status}\n${body.slice(0, 500)}`);
  }

  const payload = (await res.json()) as {
    data?: T;
    errors?: Array<{ message: string }>;
    error_message?: string;
  };

  if (payload.errors?.length) {
    throw new MondayError(payload.errors.map((e) => e.message).join("\n"));
  }
  if (payload.error_message) {
    throw new MondayError(payload.error_message);
  }
  if (payload.data === undefined) {
    throw new MondayError("monday.com API returned no data");
  }
  return payload.data;
}

// --- Typed queries -----------------------------------------------------------

export interface Me {
  id: string;
  name: string;
  email: string;
  account: { name: string };
}

export function me(): Promise<{ me: Me }> {
  return gql(`query { me { id name email account { name } } }`);
}

export interface BoardSummary {
  id: string;
  name: string;
  board_kind: string;
  items_count: number;
  workspace: { name: string } | null;
}

export function listBoards(limit: number): Promise<{ boards: BoardSummary[] }> {
  return gql(
    `query ($limit: Int!) {
       boards(limit: $limit, order_by: used_at) {
         id name board_kind items_count workspace { name }
       }
     }`,
    { limit },
  );
}

export interface Item {
  id: string;
  name: string;
  group: { title: string } | null;
  column_values: Array<{ id: string; text: string | null; column: { title: string } }>;
}

interface ItemsPage {
  cursor: string | null;
  items: Item[];
}

export async function listItems(
  boardId: string,
  opts: { limit: number; search?: string },
): Promise<Item[]> {
  // `query_params` filters server-side on the built-in name column;
  // contains_text is case-insensitive. CompareValue is a scalar that accepts
  // an array — pass it whole via the variable, not as a list literal.
  const queryParams = opts.search
    ? `, query_params: { rules: [{ column_id: "name", compare_value: $search, operator: contains_text }] }`
    : "";
  const data = await gql<{ boards: Array<{ items_page: ItemsPage }> }>(
    `query ($board: [ID!], $limit: Int!${opts.search ? ", $search: CompareValue!" : ""}) {
       boards(ids: $board) {
         items_page(limit: $limit${queryParams}) {
           cursor
           items { id name group { title } column_values { id text column { title } } }
         }
       }
     }`,
    { board: [boardId], limit: opts.limit, ...(opts.search ? { search: [opts.search] } : {}) },
  );
  const board = data.boards[0];
  if (!board) throw new MondayError(`Board ${boardId} not found or not accessible`);
  return board.items_page.items;
}

export function createItem(
  boardId: string,
  name: string,
  columns: Record<string, unknown>,
): Promise<{ create_item: { id: string; name: string } }> {
  return gql(
    `mutation ($board: ID!, $name: String!, $cols: JSON) {
       create_item(board_id: $board, item_name: $name, column_values: $cols) { id name }
     }`,
    { board: boardId, name, cols: JSON.stringify(columns) },
  );
}

export function updateItem(
  boardId: string,
  itemId: string,
  columns: Record<string, unknown>,
): Promise<{ change_multiple_column_values: { id: string } }> {
  return gql(
    `mutation ($board: ID!, $item: ID!, $cols: JSON!) {
       change_multiple_column_values(board_id: $board, item_id: $item, column_values: $cols) { id }
     }`,
    { board: boardId, item: itemId, cols: JSON.stringify(columns) },
  );
}

export function deleteItem(itemId: string): Promise<{ delete_item: { id: string } }> {
  return gql(
    `mutation ($item: ID!) { delete_item(item_id: $item) { id } }`,
    { item: itemId },
  );
}

export interface ColumnInfo {
  id: string;
  title: string;
  type: string;
}

export function listColumns(boardId: string): Promise<{ boards: Array<{ columns: ColumnInfo[] }> }> {
  return gql(
    `query ($board: [ID!]) { boards(ids: $board) { columns { id title type } } }`,
    { board: [boardId] },
  );
}
