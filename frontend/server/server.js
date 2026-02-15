const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = 5000;
const JWT_SECRET = "min-app-secret-key-dev-2024";

// --- Storage helpers (JSON file based) ---
const DATA_DIR = path.join(__dirname, "data");
const UPLOADS_DIR = path.join(__dirname, "uploads");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function readJSON(file) {
  const filePath = path.join(DATA_DIR, file);
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeJSON(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

function generateId() {
  return uuidv4().replace(/-/g, "").slice(0, 24);
}

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(UPLOADS_DIR));

// Multer config for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, generateId() + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Otillåten filtyp"));
    }
  },
});

// Auth middleware
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Ej autentiserad" });
  }
  try {
    const decoded = jwt.verify(header.split(" ")[1], JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Ogiltig token" });
  }
}

// Optional auth (doesn't fail if no token)
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    try {
      req.user = jwt.verify(header.split(" ")[1], JWT_SECRET);
    } catch {
      // ignore invalid token
    }
  }
  next();
}

// --- Helper to populate user fields ---
function populateUser(userId) {
  const users = readJSON("users.json");
  const user = users.find((u) => u._id === userId);
  if (!user) return { _id: userId, email: "Okänd" };
  return { _id: user._id, email: user.email };
}

// ==================== AUTH ROUTES ====================

// Register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "E-post och lösenord krävs" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Lösenordet måste vara minst 6 tecken" });
    }

    const users = readJSON("users.json");
    if (users.find((u) => u.email === email)) {
      return res.status(400).json({ message: "E-posten används redan" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      _id: generateId(),
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    writeJSON("users.json", users);

    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: { userId: newUser._id, email: newUser.email },
    });
  } catch (err) {
    res.status(500).json({ message: "Serverfel" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "E-post och lösenord krävs" });
    }

    const users = readJSON("users.json");
    const user = users.find((u) => u.email === email);
    if (!user) {
      return res.status(400).json({ message: "Fel e-post eller lösenord" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ message: "Fel e-post eller lösenord" });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: { userId: user._id, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ message: "Serverfel" });
  }
});

// Get current user
app.get("/api/auth/me", auth, (req, res) => {
  res.json({ userId: req.user.userId, email: req.user.email });
});

// Logout
app.post("/api/auth/logout", auth, (req, res) => {
  res.json({ message: "Utloggad" });
});

// ==================== JOB ROUTES ====================

// Get all jobs (with filters)
app.get("/api/jobs", optionalAuth, (req, res) => {
  try {
    let jobs = readJSON("jobs.json");
    const { search, category, type, city, minPrice, maxPrice } = req.query;

    if (search) {
      const s = search.toLowerCase();
      jobs = jobs.filter(
        (j) =>
          j.title.toLowerCase().includes(s) ||
          j.description.toLowerCase().includes(s)
      );
    }
    if (category) {
      jobs = jobs.filter((j) => j.category === category);
    }
    if (type) {
      jobs = jobs.filter((j) => j.type === type);
    }
    if (city) {
      const c = city.toLowerCase();
      jobs = jobs.filter(
        (j) => j.location && j.location.city && j.location.city.toLowerCase().includes(c)
      );
    }
    if (minPrice) {
      jobs = jobs.filter((j) => j.price >= Number(minPrice));
    }
    if (maxPrice) {
      jobs = jobs.filter((j) => j.price <= Number(maxPrice));
    }

    // Only show open jobs by default in listing
    jobs = jobs.filter((j) => j.status === "open");

    // Populate createdBy
    jobs = jobs.map((j) => ({
      ...j,
      createdBy: populateUser(j.createdBy),
    }));

    // Sort newest first
    jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: "Serverfel" });
  }
});

// Get single job
app.get("/api/jobs/:id", auth, (req, res) => {
  try {
    const jobs = readJSON("jobs.json");
    const job = jobs.find((j) => j._id === req.params.id);
    if (!job) {
      return res.status(404).json({ message: "Jobbet hittades inte" });
    }

    const populated = {
      ...job,
      createdBy: populateUser(job.createdBy),
      acceptedBy: job.acceptedBy ? populateUser(job.acceptedBy) : null,
    };

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: "Serverfel" });
  }
});

// Create job
app.post("/api/jobs", auth, upload.single("image"), (req, res) => {
  try {
    const { title, description, price, category, type, country, municipality, city } = req.body;

    if (!title || !description || !price || !category || !type) {
      return res.status(400).json({ message: "Alla fält krävs" });
    }

    const newJob = {
      _id: generateId(),
      title,
      description,
      price: Number(price),
      category,
      type,
      status: "open",
      createdBy: req.user.userId,
      acceptedBy: null,
      image: req.file ? req.file.filename : null,
      location:
        type === "irl"
          ? { country: country || "", municipality: municipality || "", city: city || "" }
          : null,
      createdAt: new Date().toISOString(),
    };

    const jobs = readJSON("jobs.json");
    jobs.push(newJob);
    writeJSON("jobs.json", jobs);

    res.status(201).json({
      ...newJob,
      createdBy: populateUser(newJob.createdBy),
    });
  } catch (err) {
    res.status(500).json({ message: "Serverfel" });
  }
});

// Accept job
app.put("/api/jobs/:id/accept", auth, (req, res) => {
  try {
    const jobs = readJSON("jobs.json");
    const idx = jobs.findIndex((j) => j._id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ message: "Jobbet hittades inte" });
    }

    const job = jobs[idx];
    if (job.status !== "open") {
      return res.status(400).json({ message: "Jobbet är inte öppet" });
    }
    if (job.createdBy === req.user.userId) {
      return res.status(400).json({ message: "Du kan inte acceptera ditt eget jobb" });
    }

    job.status = "accepted";
    job.acceptedBy = req.user.userId;
    jobs[idx] = job;
    writeJSON("jobs.json", jobs);

    res.json({
      ...job,
      createdBy: populateUser(job.createdBy),
      acceptedBy: populateUser(job.acceptedBy),
    });
  } catch (err) {
    res.status(500).json({ message: "Serverfel" });
  }
});

// Complete job
app.put("/api/jobs/:id/complete", auth, (req, res) => {
  try {
    const jobs = readJSON("jobs.json");
    const idx = jobs.findIndex((j) => j._id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ message: "Jobbet hittades inte" });
    }

    const job = jobs[idx];
    if (job.createdBy !== req.user.userId) {
      return res.status(403).json({ message: "Bara skaparen kan markera klart" });
    }
    if (job.status !== "accepted") {
      return res.status(400).json({ message: "Jobbet måste vara accepterat" });
    }

    job.status = "completed";
    jobs[idx] = job;
    writeJSON("jobs.json", jobs);

    res.json({
      ...job,
      createdBy: populateUser(job.createdBy),
      acceptedBy: populateUser(job.acceptedBy),
    });
  } catch (err) {
    res.status(500).json({ message: "Serverfel" });
  }
});

// Delete job
app.delete("/api/jobs/:id", auth, (req, res) => {
  try {
    let jobs = readJSON("jobs.json");
    const idx = jobs.findIndex((j) => j._id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ message: "Jobbet hittades inte" });
    }

    const job = jobs[idx];
    if (job.createdBy !== req.user.userId) {
      return res.status(403).json({ message: "Bara skaparen kan ta bort jobbet" });
    }

    // Delete image if exists
    if (job.image) {
      const imgPath = path.join(UPLOADS_DIR, job.image);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    jobs.splice(idx, 1);
    writeJSON("jobs.json", jobs);

    // Also delete messages for this job
    let messages = readJSON("messages.json");
    messages = messages.filter((m) => m.jobId !== req.params.id);
    writeJSON("messages.json", messages);

    res.json({ message: "Jobbet har tagits bort" });
  } catch (err) {
    res.status(500).json({ message: "Serverfel" });
  }
});

// My jobs (created by me)
app.get("/api/jobs/user/my-jobs", auth, (req, res) => {
  try {
    const jobs = readJSON("jobs.json");
    const myJobs = jobs
      .filter((j) => j.createdBy === req.user.userId)
      .map((j) => ({
        ...j,
        createdBy: populateUser(j.createdBy),
        acceptedBy: j.acceptedBy ? populateUser(j.acceptedBy) : null,
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(myJobs);
  } catch (err) {
    res.status(500).json({ message: "Serverfel" });
  }
});

// Accepted jobs (accepted by me)
app.get("/api/jobs/user/accepted-jobs", auth, (req, res) => {
  try {
    const jobs = readJSON("jobs.json");
    const accepted = jobs
      .filter((j) => j.acceptedBy === req.user.userId)
      .map((j) => ({
        ...j,
        createdBy: populateUser(j.createdBy),
        acceptedBy: populateUser(j.acceptedBy),
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(accepted);
  } catch (err) {
    res.status(500).json({ message: "Serverfel" });
  }
});

// ==================== MESSAGE ROUTES ====================

// Get messages for a job
app.get("/api/messages/:jobId", auth, (req, res) => {
  try {
    const jobs = readJSON("jobs.json");
    const job = jobs.find((j) => j._id === req.params.jobId);
    if (!job) {
      return res.status(404).json({ message: "Jobbet hittades inte" });
    }

    // Only job creator and acceptor can see messages
    if (job.createdBy !== req.user.userId && job.acceptedBy !== req.user.userId) {
      return res.status(403).json({ message: "Du har inte tillgång till denna chatt" });
    }

    const messages = readJSON("messages.json");
    const jobMessages = messages
      .filter((m) => m.jobId === req.params.jobId)
      .map((m) => ({
        ...m,
        sender: populateUser(m.sender),
      }))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json(jobMessages);
  } catch (err) {
    res.status(500).json({ message: "Serverfel" });
  }
});

// Send message for a job
app.post("/api/messages/:jobId", auth, (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Meddelandet kan inte vara tomt" });
    }
    if (content.length > 2000) {
      return res.status(400).json({ message: "Meddelandet är för långt" });
    }

    const jobs = readJSON("jobs.json");
    const job = jobs.find((j) => j._id === req.params.jobId);
    if (!job) {
      return res.status(404).json({ message: "Jobbet hittades inte" });
    }

    // Only job creator and acceptor can send messages
    if (job.createdBy !== req.user.userId && job.acceptedBy !== req.user.userId) {
      return res.status(403).json({ message: "Du har inte tillgång till denna chatt" });
    }

    const newMessage = {
      _id: generateId(),
      jobId: req.params.jobId,
      sender: req.user.userId,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    const messages = readJSON("messages.json");
    messages.push(newMessage);
    writeJSON("messages.json", messages);

    res.status(201).json({
      ...newMessage,
      sender: populateUser(newMessage.sender),
    });
  } catch (err) {
    res.status(500).json({ message: "Serverfel" });
  }
});

// ==================== PAYMENTS STUB ====================

app.get("/api/payments/history", auth, (req, res) => {
  res.json({ income: 0, expenses: 0, transactions: [] });
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`Server kör på http://localhost:${PORT}`);
});
