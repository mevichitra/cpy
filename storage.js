const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const NOTES_DIR = path.join(DATA_DIR, 'notes');
const RECENT_FILE = path.join(DATA_DIR, 'recent.json');
const MAX_RECENT = 100;

// Ensure storage directories exist
async function initStorage() {
  try {
    await fs.mkdir(NOTES_DIR, { recursive: true });
  } catch (err) {
    console.error('Error creating storage directories:', err);
  }
}

// Generate a safe hash filename for any slug
function getHash(slug) {
  // Normalize slug: remove leading/trailing slashes and make it lowercase
  const normalized = slug.replace(/^\/+|\/+$/g, '').toLowerCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

// Save a note's text content
async function saveNote(slug, text) {
  await initStorage();
  const normalized = slug.replace(/^\/+|\/+$/g, '');
  const hash = getHash(normalized);
  const filePath = path.join(NOTES_DIR, `${hash}.txt`);
  
  // Save text content
  await fs.writeFile(filePath, text || '', 'utf8');

  // Update recent list
  await updateRecentList(normalized);
}

// Retrieve a note's text content
async function getNote(slug) {
  await initStorage();
  const normalized = slug.replace(/^\/+|\/+$/g, '');
  const hash = getHash(normalized);
  const filePath = path.join(NOTES_DIR, `${hash}.txt`);

  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      return ''; // Return empty if note doesn't exist yet
    }
    throw err;
  }
}

// Update the list of recently modified notes
async function updateRecentList(slug) {
  if (!slug) return;
  try {
    let recent = [];
    try {
      const data = await fs.readFile(RECENT_FILE, 'utf8');
      recent = JSON.parse(data);
    } catch (err) {
      if (err.code !== 'ENOENT') console.error('Error reading recent file:', err);
    }

    // Remove duplicates of this slug
    recent = recent.filter(item => item.slug.toLowerCase() !== slug.toLowerCase());

    // Add to beginning of array
    recent.unshift({
      slug,
      updatedAt: new Date().toISOString()
    });

    // Cap at MAX_RECENT
    if (recent.length > MAX_RECENT) {
      recent = recent.slice(0, MAX_RECENT);
    }

    await fs.writeFile(RECENT_FILE, JSON.stringify(recent, null, 2), 'utf8');
  } catch (err) {
    console.error('Error updating recent list:', err);
  }
}

// Get recently modified notes
async function getRecentNotes() {
  try {
    const data = await fs.readFile(RECENT_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

module.exports = {
  saveNote,
  getNote,
  getRecentNotes,
  initStorage
};
