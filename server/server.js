const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Data structure path
const DATA_FILE = path.join(__dirname, '../data.json');
const UPLOADS_DIR = path.join(__dirname, '../uploads');

// Ensure directories exist
fs.ensureDirSync(UPLOADS_DIR);
if (!fs.existsSync(DATA_FILE)) {
    fs.writeJsonSync(DATA_FILE, []);
}

// Multer storage config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const eventId = req.params.id || 'temp'; // Simple handling, usually we'd generate ID first
        const dir = path.join(UPLOADS_DIR, eventId);
        fs.ensureDirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// Routes

// Get all events
app.get('/api/events', async (req, res) => {
    try {
        const events = await fs.readJson(DATA_FILE);
        res.json(events.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (err) {
        res.status(500).json({ error: 'Failed to read data' });
    }
});

// Create new event (Metadata only first, then upload photos ideally, but let's do mixed for simplicity or handle separately)
// Simplification: 1. Create Event -> returns ID. 2. Upload photos to ID.
app.post('/api/events', async (req, res) => {
    try {
        const { title, date, description } = req.body;
        const events = await fs.readJson(DATA_FILE);

        const newEvent = {
            id: Date.now().toString(),
            title,
            date,
            description,
            coverImage: '',
            images: []
        };

        events.push(newEvent);
        await fs.writeJson(DATA_FILE, events);

        // Create folder
        await fs.ensureDir(path.join(UPLOADS_DIR, newEvent.id));

        res.json(newEvent);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create event' });
    }
});

// Upload photos
app.post('/api/events/:id/photos', upload.array('photos'), async (req, res) => {
    try {
        const { id } = req.params;
        const events = await fs.readJson(DATA_FILE);
        const eventIndex = events.findIndex(e => e.id === id);

        if (eventIndex === -1) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const newImages = req.files.map(file => `/uploads/${id}/${file.filename}`);
        events[eventIndex].images.push(...newImages);

        // Set cover if none
        if (!events[eventIndex].coverImage && events[eventIndex].images.length > 0) {
            events[eventIndex].coverImage = events[eventIndex].images[0];
        }

        await fs.writeJson(DATA_FILE, events);
        res.json(events[eventIndex]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to upload photos' });
    }
});

// Delete event
app.delete('/api/events/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let events = await fs.readJson(DATA_FILE);
        const event = events.find(e => e.id === id);

        if (!event) return res.status(404).json({ error: 'Event not found' });

        // Remove folder
        await fs.remove(path.join(UPLOADS_DIR, id));

        // Update DB
        events = events.filter(e => e.id !== id);
        await fs.writeJson(DATA_FILE, events);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete event' });
    }
});

// Update event
app.put('/api/events/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, date, description, coverImage } = req.body;
        const events = await fs.readJson(DATA_FILE);
        const eventIndex = events.findIndex(e => e.id === id);

        if (eventIndex === -1) return res.status(404).json({ error: 'Event not found' });

        events[eventIndex] = { ...events[eventIndex], title, date, description, coverImage };
        await fs.writeJson(DATA_FILE, events);

        res.json(events[eventIndex]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update event' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
