const express = require("express");
const prisma = require("../lib/prismaClient");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// GET /messages/:jobId — get all messages for a job
router.get("/:jobId", authMiddleware, async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      where: { jobId: req.params.jobId },
      include: {
        sender: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Serverfel vid hämtning av meddelanden" });
  }
});

// POST /messages/:jobId — send a message
router.post("/:jobId", authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Meddelandet kan inte vara tomt" });
    }

    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        jobId: req.params.jobId,
        senderId: req.user.userId,
      },
      include: {
        sender: { select: { id: true, email: true } },
      },
    });

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: "Serverfel vid skickande av meddelande" });
  }
});

module.exports = router;
