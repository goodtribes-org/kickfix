const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prismaClient");
const authMiddleware = require("../middleware/auth");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "workapp_secret_key_2024";

function generateToken(user) {
  return jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
}

router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "E-post och lösenord krävs" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: "E-postadressen används redan" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword },
    });

    const token = generateToken(user);
    res.status(201).json({ token, user: { userId: user.id, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: "Serverfel vid registrering" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "E-post och lösenord krävs" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Fel e-post eller lösenord" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: "Fel e-post eller lösenord" });
    }

    const token = generateToken(user);
    res.json({ token, user: { userId: user.id, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: "Serverfel vid inloggning" });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) {
      return res.status(404).json({ message: "Användare hittades inte" });
    }
    res.json({ userId: user.id, email: user.email });
  } catch (err) {
    res.status(500).json({ message: "Serverfel" });
  }
});

router.post("/logout", authMiddleware, (req, res) => {
  res.json({ message: "Utloggad" });
});

module.exports = router;
