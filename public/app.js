// Get slug from path
const pathParts = window.location.pathname.split('/').filter(Boolean);
const slug = pathParts.join('/');

// DOM elements
const editor = document.getElementById('editor');
const statusBadge = document.getElementById('statusBadge');
const statusText = statusBadge.querySelector('.status-text');
const breadcrumbs = document.getElementById('breadcrumbs');
const btnToggleCli = document.getElementById('btnToggleCli');
const btnCloseDrawer = document.getElementById('btnCloseDrawer');
const cliDrawer = document.getElementById('cliDrawer');
const btnCopyText = document.getElementById('btnCopyText');
const toast = document.getElementById('toast');

// Save debouncer timer
let saveTimeout;

// Toast helper
function showToast(message) {
  toast.textContent = message || 'Copied to clipboard!';
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

// Update status badge UI
function setStatus(state) {
  statusBadge.className = 'status-badge ' + state;
  if (state === 'saving') {
    statusText.textContent = 'Saving...';
  } else if (state === 'saved') {
    statusText.textContent = 'Saved';
  } else if (state === 'error') {
    statusText.textContent = 'Connection error';
  } else if (state === 'loading') {
    statusText.textContent = 'Loading...';
  }
}

// Generate breadcrumbs
function setupBreadcrumbs() {
  let breadcrumbHtml = `<a href="/">cpy.sh</a>`;
  let currentPath = '';
  
  pathParts.forEach((part, index) => {
    currentPath += '/' + part;
    breadcrumbHtml += `<span class="separator">/</span>`;
    if (index === pathParts.length - 1) {
      breadcrumbHtml += `<span class="current">${part}</span>`;
    } else {
      breadcrumbHtml += `<a href="${currentPath}">${part}</a>`;
    }
  });
  
  breadcrumbs.innerHTML = breadcrumbHtml;
}

// Save history locally
function saveToHistory() {
  if (!slug) return;
  
  try {
    let history = JSON.parse(localStorage.getItem('cpy_history') || '[]');
    // Filter duplicates
    history = history.filter(item => item.slug !== slug);
    // Add current to front
    history.unshift({
      slug,
      time: new Date().toISOString()
    });
    // Cap at 10 items
    history = history.slice(0, 10);
    localStorage.setItem('cpy_history', JSON.stringify(history));
  } catch (err) {
    console.error('Error saving history:', err);
  }
}

// Populate CLI command boxes
function setupCliCommands() {
  const origin = window.location.origin;
  const noteUrl = `${origin}/${slug}`;
  
  document.getElementById('cmdGet').textContent = `curl ${noteUrl}`;
  document.getElementById('cmdPost').textContent = `curl -d "My note text" ${noteUrl}`;
  document.getElementById('cmdPipe').textContent = `echo "My pipe content" | curl -d @- ${noteUrl}`;
  document.getElementById('cmdUpload').textContent = `curl --data-binary @file.txt ${noteUrl}`;
}

// Copy CLI snippet function (made global so inline onclick can use it)
window.copySnippet = function(id) {
  const code = document.getElementById(id).textContent;
  navigator.clipboard.writeText(code).then(() => {
    showToast('Command copied to clipboard!');
  }).catch(err => {
    console.error('Clipboard copy failed:', err);
  });
};

// Copy full editor text to clipboard
btnCopyText.addEventListener('click', () => {
  navigator.clipboard.writeText(editor.value).then(() => {
    showToast('Full note copied to clipboard!');
  }).catch(err => {
    console.error('Clipboard copy failed:', err);
  });
});

// Toggle sidebar drawer
btnToggleCli.addEventListener('click', () => {
  cliDrawer.classList.toggle('open');
});

btnCloseDrawer.addEventListener('click', () => {
  cliDrawer.classList.remove('open');
});

// Load note content
async function loadNote() {
  setStatus('loading');
  try {
    const res = await fetch(`/api/note/${slug}`, {
      headers: {
        'Bypass-Tunnel-Reminder': 'true'
      }
    });
    if (!res.ok) throw new Error('Failed to fetch note');
    
    const data = await res.json();
    editor.value = data.content || '';
    setStatus('saved');
    
    // Focus editor and set cursor to the end
    editor.focus();
    editor.selectionStart = editor.selectionEnd = editor.value.length;
  } catch (err) {
    console.error('Error loading note:', err);
    setStatus('error');
  }
}

// Save note content
async function saveNote() {
  setStatus('saving');
  try {
    const res = await fetch(`/api/note/${slug}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Bypass-Tunnel-Reminder': 'true'
      },
      body: JSON.stringify({ content: editor.value })
    });
    
    if (!res.ok) throw new Error('Save failed');
    setStatus('saved');
  } catch (err) {
    console.error('Error saving note:', err);
    setStatus('error');
    
    // Retry saving after a delay if error
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveNote, 5000);
  }
}

// Keyboard tab support inside textarea
editor.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    
    // Insert 4 spaces
    const tabChars = '    ';
    editor.value = editor.value.substring(0, start) + tabChars + editor.value.substring(end);
    
    // Move cursor
    editor.selectionStart = editor.selectionEnd = start + tabChars.length;
    
    // Trigger input event to run autosave
    editor.dispatchEvent(new Event('input'));
  }
});

// Auto-save on input
editor.addEventListener('input', () => {
  setStatus('saving');
  clearTimeout(saveTimeout);
  // Save after 800ms of inactivity
  saveTimeout = setTimeout(saveNote, 800);
});

// Initialize editor page
if (slug) {
  setupBreadcrumbs();
  setupCliCommands();
  saveToHistory();
  loadNote();
} else {
  // If no slug, redirect to home
  window.location.href = '/';
}
