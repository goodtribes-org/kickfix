const express = require("express");
const prisma = require("../lib/prismaClient");
const authMiddleware = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

// GET /jobs — list with optional filters (public)
router.get("/", async (req, res) => {
  try {
    const { search, type, category, city, minPrice, maxPrice } = req.query;

    const where = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    if (type) where.type = type;
    if (category) where.category = category;
    if (city) where.locationCity = { contains: city, mode: "insensitive" };
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    const jobs = await prisma.job.findMany({
      where,
      include: {
        createdBy: { select: { id: true, email: true } },
        acceptedBy: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: "Serverfel vid hämtning av jobb" });
  }
});

// GET /jobs/user/my-jobs — jobs created by current user
router.get("/user/my-jobs", authMiddleware, async (req, res) => {
  try {
    const jobs = await prisma.job.findMany({
      where: { createdById: req.user.userId },
      include: {
        createdBy: { select: { id: true, email: true } },
        acceptedBy: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: "Serverfel" });
  }
});

// GET /jobs/user/accepted-jobs — jobs accepted by current user
router.get("/user/accepted-jobs", authMiddleware, async (req, res) => {
  try {
    const jobs = await prisma.job.findMany({
      where: { acceptedById: req.user.userId },
      include: {
        createdBy: { select: { id: true, email: true } },
        acceptedBy: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: "Serverfel" });
  }
});

// GET /jobs/:id — single job
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: { select: { id: true, email: true } },
        acceptedBy: { select: { id: true, email: true } },
      },
    });

    if (!job) {
      return res.status(404).json({ message: "Jobbet hittades inte" });
    }

    res.json(job);
  } catch (err) {
    res.status(500).json({ message: "Serverfel" });
  }
});

// POST /jobs — create job (with optional image)
router.post("/", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    const { title, description, price, category, type, country, municipality, city } = req.body;

    const data = {
      title,
      description,
      price: parseFloat(price),
      category,
      type,
      createdById: req.user.userId,
    };

    if (type === "irl") {
      if (country) data.locationCountry = country;
      if (municipality) data.locationMunicipality = municipality;
      if (city) data.locationCity = city;
    }

    if (req.file) {
      data.image = req.file.filename;
    }

    const job = await prisma.job.create({
      data,
      include: {
        createdBy: { select: { id: true, email: true } },
        acceptedBy: { select: { id: true, email: true } },
      },
    });

    res.status(201).json(job);
  } catch (err) {
    res.status(500).json({ message: "Serverfel vid skapande av jobb" });
  }
});

// PUT /jobs/:id/accept — accept a job
router.put("/:id/accept", authMiddleware, async (req, res) => {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });

    if (!job) {
      return res.status(404).json({ message: "Jobbet hittades inte" });
    }
    if (job.status !== "open") {
      return res.status(400).json({ message: "Jobbet är inte öppet" });
    }
    if (job.createdById === req.user.userId) {
      return res.status(400).json({ message: "Du kan inte acceptera ditt eget jobb" });
    }

    const updated = await prisma.job.update({
      where: { id: req.params.id },
      data: { status: "accepted", acceptedById: req.user.userId },
      include: {
        createdBy: { select: { id: true, email: true } },
        acceptedBy: { select: { id: true, email: true } },
      },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Serverfel" });
  }
});

// PUT /jobs/:id/complete — mark job as completed
router.put("/:id/complete", authMiddleware, async (req, res) => {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });

    if (!job) {
      return res.status(404).json({ message: "Jobbet hittades inte" });
    }
    if (job.status !== "accepted") {
      return res.status(400).json({ message: "Jobbet måste vara accepterat först" });
    }
    if (job.createdById !== req.user.userId) {
      return res.status(403).json({ message: "Bara jobbskaparen kan markera som klart" });
    }

    const updated = await prisma.job.update({
      where: { id: req.params.id },
      data: { status: "completed" },
      include: {
        createdBy: { select: { id: true, email: true } },
        acceptedBy: { select: { id: true, email: true } },
      },
    });

    // Create transaction records for both parties
    await prisma.transaction.createMany({
      data: [
        { userId: job.acceptedById, jobId: job.id, amount: job.price, type: "income" },
        { userId: job.createdById, jobId: job.id, amount: job.price, type: "expense" },
      ],
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Serverfel" });
  }
});

// DELETE /jobs/:id — delete a job
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });

    if (!job) {
      return res.status(404).json({ message: "Jobbet hittades inte" });
    }
    if (job.createdById !== req.user.userId) {
      return res.status(403).json({ message: "Du kan bara ta bort dina egna jobb" });
    }

    // Delete related messages and transactions first
    await prisma.message.deleteMany({ where: { jobId: req.params.id } });
    await prisma.transaction.deleteMany({ where: { jobId: req.params.id } });
    await prisma.job.delete({ where: { id: req.params.id } });

    res.json({ message: "Jobbet borttaget" });
  } catch (err) {
    res.status(500).json({ message: "Serverfel vid borttagning" });
  }
});

module.exports = router;
