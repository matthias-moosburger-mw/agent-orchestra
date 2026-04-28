import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/server.js";

describe("GET /quotes", () => {
  it("returns array of quotes", async () => {
    const res = await request(app).get("/quotes");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
