const express = require("express");

const router = express.Router();

// Liveness only: answers as long as the process is serving. Deliberately does
// not touch MongoDB — a database blip should not make Kubernetes restart a
// backend that is otherwise fine.
router.get("/", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
  });
});

module.exports = router;
