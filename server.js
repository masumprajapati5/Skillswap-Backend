require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const seedDatabase = require('./utils/seedDatabase');

// Connect to database
connectDB().then(() => {
  // Run auto-seeder if database is empty
  seedDatabase();
});

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

app.set('io', io);

app.use(helmet());
const allowedOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map(o => o.trim()) : ['http://localhost:5173'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Socket.io connection handling
require('./sockets')(io);

// Initialize Scheduler
const initScheduler = require('./utils/scheduler');
initScheduler(io);

// Simple route for testing
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'SkillSwap API is running. Please access the app at http://localhost:5173' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SkillSwap API is running' });
});

const multer = require('multer');
const path = require('path');

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Serve uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Upload route
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  res.json({
    name: req.file.originalname,
    url: `/uploads/${req.file.filename}`,
    type: req.file.mimetype
  });
});

// Import routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/skills', require('./routes/skills'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/admin', require('./routes/admin'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
