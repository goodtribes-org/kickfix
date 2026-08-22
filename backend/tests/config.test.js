describe("lib/config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("uses JWT_SECRET from the environment when set", () => {
    process.env.JWT_SECRET = "from-the-kubernetes-secret";
    expect(require("../lib/config").JWT_SECRET).toBe("from-the-kubernetes-secret");
  });

  it("refuses to boot in production when JWT_SECRET is missing", () => {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = "production";
    expect(() => require("../lib/config")).toThrow(/JWT_SECRET is not set/);
  });

  it("refuses to boot in production when JWT_SECRET is empty", () => {
    process.env.JWT_SECRET = "";
    process.env.NODE_ENV = "production";
    expect(() => require("../lib/config")).toThrow(/JWT_SECRET is not set/);
  });

  it("falls back to a dev secret outside production", () => {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = "test";
    expect(require("../lib/config").JWT_SECRET).toMatch(/do_not_use_in_production/);
  });
});
