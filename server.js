const express = require('express');
const path = require('path');
const storage = require('./storage');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize storage directories
storage.initStorage();

// Middleware to parse raw text body for CLI uploads
const rawBodyParser = (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      req.rawBody = data;
      next();
    });
  } else {
    next();
  }
};

// JSON parser for browser API routes
app.use('/api', express.json());

// Serve static assets from the public directory
app.use('/static', express.static(path.join(__dirname, 'public')));

// Helper to check if client is terminal/CLI or requested raw format
function isCliRequest(req) {
  const ua = req.headers['user-agent'] || '';
  const hasCliUa = /^(curl|wget|httpie|aria2|libwww|python|go-http|fetch)/i.test(ua);
  const wantsRaw = req.query.raw === 'true' || req.headers['accept'] === 'text/plain';
  return hasCliUa || wantsRaw;
}

// Homepage Route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API: Get recently modified notes
app.get('/api/recent', async (req, res) => {
  try {
    const recent = await storage.getRecentNotes();
    res.json(recent);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve recent notes' });
  }
});

// API: Get specific note content
app.get(/^\/api\/note\/(.+)$/, async (req, res) => {
  try {
    const slug = req.params[0];
    const content = await storage.getNote(slug);
    res.json({ slug, content });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve note content' });
  }
});

// API: Update specific note content (from browser UI)
app.post(/^\/api\/note\/(.+)$/, async (req, res) => {
  try {
    const slug = req.params[0];
    const { content } = req.body;
    await storage.saveNote(slug, content);
    res.json({ success: true, slug });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save note' });
  }
});

// Wildcard GET: Handle slug reading
app.get(/^\/(.+)$/, async (req, res) => {
  const slug = req.params[0];

  // Ignore typical static file requests that fall through
  if (slug.includes('.') && !req.query.raw) {
    // If it looks like a file extension and raw wasn't requested, it might be a missing static file
    return res.status(404).send('Not Found');
  }

  try {
    if (isCliRequest(req)) {
      // CLI request: return raw text content
      const content = await storage.getNote(slug);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(content);
    } else {
      // Browser request: serve the editor page
      return res.sendFile(path.join(__dirname, 'public', 'editor.html'));
    }
  } catch (err) {
    res.status(500).send('Error retrieving content');
  }
});

// Wildcard POST: Handle CLI text uploads
app.post(/^\/(.+)$/, rawBodyParser, async (req, res) => {
  const slug = req.params[0];
  try {
    const content = req.rawBody || '';
    await storage.saveNote(slug, content);
    
    // Return terminal-friendly success message
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(`Successfully saved text to slug: /${slug}\n`);
  } catch (err) {
    res.status(500).send('Error saving content\n');
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Cpy running on http://localhost:${PORT}`);
});
