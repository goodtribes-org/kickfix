// Single source of truth for the JWT signing key.
//
// In production the key comes from a Kubernetes Secret (see
// chart/kickfix/README.md). Booting without it used to fall back to a default
// that is public in this repo's history, which silently signed real tokens with
// a known key — so production now refuses to start instead.
const DEV_FALLBACK_SECRET = "workapp_dev_secret_do_not_use_in_production";

const JWT_SECRET = process.env.JWT_SECRET || "";

if (!JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error(
    "JWT_SECRET is not set. Production requires it to come from the " +
      "kickfix-backend-secrets Kubernetes Secret."
  );
}

module.exports = {
  JWT_SECRET: JWT_SECRET || DEV_FALLBACK_SECRET,
};
