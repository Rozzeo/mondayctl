import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gql, listItems, MondayError } from "../src/api.js";

function mockFetch(payload: unknown, status = 200) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(payload),
    json: async () => payload,
  })) as unknown as typeof fetch;
}

beforeEach(() => {
  process.env.MONDAY_API_TOKEN = "test-token";
});

afterEach(() => {
  delete process.env.MONDAY_API_TOKEN;
  vi.restoreAllMocks();
});

describe("gql", () => {
  it("returns data on success", async () => {
    vi.stubGlobal("fetch", mockFetch({ data: { me: { id: "1" } } }));
    await expect(gql("query { me { id } }")).resolves.toEqual({ me: { id: "1" } });
  });

  it("throws MondayError when API returns errors with HTTP 200", async () => {
    vi.stubGlobal("fetch", mockFetch({ errors: [{ message: "Invalid board id" }] }));
    await expect(gql("query {}")).rejects.toThrow(MondayError);
    await expect(gql("query {}")).rejects.toThrow(/Invalid board id/);
  });

  it("throws on HTTP errors", async () => {
    vi.stubGlobal("fetch", mockFetch({ error_message: "rate limited" }, 429));
    await expect(gql("query {}")).rejects.toThrow(/HTTP 429/);
  });

  it("fails fast without a token", async () => {
    delete process.env.MONDAY_API_TOKEN;
    await expect(gql("query {}")).rejects.toThrow(/mondayctl auth/);
  });

  it("sends the token in the Authorization header", async () => {
    const spy = mockFetch({ data: {} });
    vi.stubGlobal("fetch", spy);
    await gql("query {}");
    const [, init] = (spy as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe("test-token");
  });
});

describe("listItems", () => {
  it("throws a clear error for an unknown board", async () => {
    vi.stubGlobal("fetch", mockFetch({ data: { boards: [] } }));
    await expect(listItems("123", { limit: 10 })).rejects.toThrow(/not found/);
  });

  it("returns items from the board page", async () => {
    const items = [{ id: "9", name: "Task", group: null, column_values: [] }];
    vi.stubGlobal(
      "fetch",
      mockFetch({ data: { boards: [{ items_page: { cursor: null, items } }] } }),
    );
    await expect(listItems("123", { limit: 10 })).resolves.toEqual(items);
  });
});
