const request = require("supertest");
const app = require("../app");

describe("GET /api/health", () => {
  it("reports ok without authentication", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("reports process uptime", async () => {
    const res = await request(app).get("/api/health");
    expect(typeof res.body.uptime).toBe("number");
    expect(res.body.uptime).toBeGreaterThan(0);
  });
});
