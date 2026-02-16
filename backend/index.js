const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth");
const jobRoutes = require("./routes/jobs");
const messageRoutes = require("./routes/messages");
const paymentRoutes = require("./routes/payments");

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const allowedOrigins = FRONTEND_URL.split(",").map((s) => s.trim());

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/payments", paymentRoutes);

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
