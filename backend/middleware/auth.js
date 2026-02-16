const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "workapp_secret_key_2024";

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Ingen token angiven" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { userId: decoded.userId, email: decoded.email };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Ogiltig token" });
  }
}

module.exports = authMiddleware;
