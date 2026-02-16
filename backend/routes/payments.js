const express = require("express");
const prisma = require("../lib/prismaClient");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// GET /payments/history — get user's payment history
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user.userId },
      include: {
        job: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const income = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    res.json({ income, expenses, transactions });
  } catch (err) {
    res.status(500).json({ message: "Serverfel vid hämtning av betalningar" });
  }
});

module.exports = router;
