const request = require("supertest");
const app = require("../app");

describe("app smoke", () => {
  it("boots and returns 404 for an unknown path", async () => {
    const res = await request(app).get("/definitely-not-a-route");
    expect(res.status).toBe(404);
  });
});
