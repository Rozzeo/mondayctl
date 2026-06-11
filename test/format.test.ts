import { describe, expect, it } from "vitest";
import { parseColumns } from "../src/format.js";

describe("parseColumns", () => {
  it("parses plain string values", () => {
    expect(parseColumns(["text_col=hello world", "num=42"])).toEqual({
      text_col: "hello world",
      num: "42",
    });
  });

  it("parses JSON values for structured columns", () => {
    expect(parseColumns(['status={"label":"Done"}', 'date4={"date":"2026-06-11"}'])).toEqual({
      status: { label: "Done" },
      date4: { date: "2026-06-11" },
    });
  });

  it("keeps '=' inside values", () => {
    expect(parseColumns(["formula=a=b"])).toEqual({ formula: "a=b" });
  });

  it("rejects pairs without a key", () => {
    expect(() => parseColumns(["=oops"])).toThrow(/key=value/);
    expect(() => parseColumns(["no-equals"])).toThrow(/key=value/);
  });

  it("rejects malformed JSON loudly instead of sending it as text", () => {
    expect(() => parseColumns(['status={"label":'])).toThrow(/Invalid JSON/);
  });
});
