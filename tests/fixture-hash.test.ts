import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

describe("fixture snapshot", () => {
  test("dataset JSON matches committed fixture hash", () => {
    const json = readFileSync("data/generated/dataset.json");
    const hash = createHash("sha256").update(json).digest("hex");
    const expected = readFileSync("data/generated/dataset.fixture.sha256", "utf8").trim();
    expect(hash).toBe(expected);
  });
});
