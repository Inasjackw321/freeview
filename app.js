// IndexedDB setup
let db;
const DB_NAME = 'FreeViewDB';
const DB_VERSION = 1;

// Initialize IndexedDB
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            db = event.target.result;

            if (!db.objectStoreNames.contains('content')) {
                const contentStore = db.createObjectStore('content', { keyPath: 'id', autoIncrement: true });
                contentStore.createIndex('timestamp', 'timestamp', { unique: false });
                contentStore.createIndex('type', 'type', { unique: false });
            }

            if (!db.objectStoreNames.contains('comments')) {
                const commentsStore = db.createObjectStore('comments', { keyPath: 'id', autoIncrement: true });
                commentsStore.createIndex('contentId', 'contentId', { unique: false });
            }

            if (!db.objectStoreNames.contains('likes')) {
                db.createObjectStore('likes', { keyPath: 'contentId' });
            }
        };
    });
}

// Database operations
async function addContent(data) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        const transaction = db.transaction(['content'], 'readwrite');
        const store = transaction.objectStore('content');
        const request = store.add(data);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getAllContent() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        const transaction = db.transaction(['content'], 'readonly');
        const store = transaction.objectStore('content');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getContent(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        const transaction = db.transaction(['content'], 'readonly');
        const store = transaction.objectStore('content');
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function addComment(data) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        const transaction = db.transaction(['comments'], 'readwrite');
        const store = transaction.objectStore('comments');
        const request = store.add(data);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getComments(contentId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        const transaction = db.transaction(['comments'], 'readonly');
        const store = transaction.objectStore('comments');
        const index = store.index('contentId');
        const request = index.getAll(contentId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getLikes(contentId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        const transaction = db.transaction(['likes'], 'readonly');
        const store = transaction.objectStore('likes');
        const request = store.get(contentId);
        request.onsuccess = () => resolve(request.result || { contentId, count: 0, liked: false });
        request.onerror = () => reject(request.error);
    });
}

async function toggleLike(contentId) {
    return new Promise(async (resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        const likes = await getLikes(contentId);
        const newLikes = {
            contentId,
            count: likes.liked ? likes.count - 1 : likes.count + 1,
            liked: !likes.liked
        };

        const transaction = db.transaction(['likes'], 'readwrite');
        const store = transaction.objectStore('likes');
        const request = store.put(newLikes);
        request.onsuccess = () => resolve(newLikes);
        request.onerror = () => reject(request.error);
    });
}

// UI State
let currentContentId = null;

// Tab Navigation
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;

        // Update buttons
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update tabs
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.getElementById(`${tab}-tab`).classList.add('active');

        // Load content when browsing
        if (tab === 'browse') {
            loadContent();
        }
    });
});

// Rich Text Editor Toolbar
const editor = document.getElementById('editor');
const fontSize = document.getElementById('fontSize');
const textColor = document.getElementById('textColor');

document.querySelectorAll('.toolbar-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        const command = btn.dataset.command;
        document.execCommand(command, false, null);
        editor.focus();
    });
});

fontSize.addEventListener('change', () => {
    document.execCommand('fontSize', false, fontSize.value);
    editor.focus();
});

textColor.addEventListener('change', () => {
    document.execCommand('foreColor', false, textColor.value);
    editor.focus();
});

// Document Form Submit
document.getElementById('documentForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('docTitle').value;
    const content = editor.innerHTML;
    const category = document.getElementById('docCategory').value;

    // Check if editor has actual text content (not just HTML tags)
    const textContent = editor.textContent || editor.innerText || '';
    if (!textContent.trim()) {
        showToast('Please write some content');
        return;
    }

    showLoading(true);

    try {
        const data = {
            type: 'document',
            title,
            content,
            category,
            timestamp: Date.now(),
            date: new Date().toLocaleDateString()
        };

        await addContent(data);

        showLoading(false);
        showToast('Document published successfully!');

        // Reset form
        document.getElementById('documentForm').reset();
        editor.innerHTML = '';

        // Switch to browse tab
        document.querySelector('[data-tab="browse"]').click();
    } catch (error) {
        console.error('Error publishing document:', error);
        showLoading(false);
        showToast('Error publishing document: ' + error.message);
    }
});


// Load and display content
async function loadContent() {
    try {
        let allContent = await getAllContent();

        // Sort by timestamp
        allContent.sort((a, b) => b.timestamp - a.timestamp);

        const contentGrid = document.getElementById('contentGrid');
        const noContent = document.getElementById('noContent');

        if (allContent.length === 0) {
            contentGrid.style.display = 'none';
            noContent.style.display = 'block';
            return;
        }

        contentGrid.style.display = 'grid';
        noContent.style.display = 'none';
        contentGrid.innerHTML = '';

        for (const item of allContent) {
            const likes = await getLikes(item.id);
            const card = createContentCard(item, likes);
            contentGrid.appendChild(card);
        }
    } catch (error) {
        console.error('Error loading content:', error);
        showToast('Error loading content');
    }
}

// Create content card
function createContentCard(item, likes) {
    const card = document.createElement('div');
    card.className = 'content-card';
    card.onclick = () => openContent(item.id);

    card.innerHTML = `
        <div class="content-card-thumb" style="display: flex; align-items: center; justify-content: center; font-size: 3rem;">
            <i class="fas fa-file-alt"></i>
        </div>
        <div class="content-card-body">
            <h3 class="content-card-title">${escapeHtml(item.title)}</h3>
            <div class="content-card-info">
                <i class="fas fa-user-circle"></i>
                <span>Anonymous</span>
                <i class="fas fa-check-circle verified" title="Verified"></i>
            </div>
            <div class="content-card-meta">
                <span><i class="fas fa-heart"></i> ${likes.count}</span>
                <span>${item.date}</span>
            </div>
        </div>
    `;

    return card;
}

// Open content in modal
async function openContent(contentId) {
    currentContentId = contentId;

    try {
        const item = await getContent(contentId);
        const likes = await getLikes(contentId);
        const comments = await getComments(contentId);

        // Show document viewer
        const docEl = document.getElementById('documentViewer');
        docEl.innerHTML = item.content;
        docEl.style.display = 'block';

        // Set details
        document.getElementById('detailTitle').textContent = item.title;
        document.getElementById('detailDate').textContent = item.date;

        const descSection = document.getElementById('detailDescription');
        if (item.description) {
            descSection.textContent = item.description;
            descSection.style.display = 'block';
        } else {
            descSection.style.display = 'none';
        }

        // Set likes
        const likeBtn = document.getElementById('likeBtn');
        const likeCount = document.getElementById('likeCount');
        likeCount.textContent = likes.count;

        if (likes.liked) {
            likeBtn.classList.add('liked');
            likeBtn.querySelector('i').className = 'fas fa-heart';
        } else {
            likeBtn.classList.remove('liked');
            likeBtn.querySelector('i').className = 'far fa-heart';
        }

        // Display comments
        displayComments(comments);

        // Show modal
        document.getElementById('detailModal').classList.add('active');
    } catch (error) {
        console.error('Error opening content:', error);
        showToast('Error loading content');
    }
}

// Display comments
function displayComments(comments) {
    const commentsList = document.getElementById('commentsList');
    const commentCount = document.getElementById('commentCount');

    commentCount.textContent = comments.length;
    commentsList.innerHTML = '';

    if (comments.length === 0) {
        commentsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No comments yet. Be the first!</p>';
        return;
    }

    comments.sort((a, b) => b.timestamp - a.timestamp);

    comments.forEach(comment => {
        const commentEl = document.createElement('div');
        commentEl.className = 'comment';
        commentEl.innerHTML = `
            <div class="comment-header">
                <i class="fas fa-user-circle"></i>
                <span>Anonymous User</span>
                <i class="fas fa-check-circle verified" title="Verified"></i>
                <span class="comment-date">${comment.date}</span>
            </div>
            <div class="comment-text">${escapeHtml(comment.text)}</div>
        `;
        commentsList.appendChild(commentEl);
    });
}

// Modal controls
document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('detailModal').classList.remove('active');
});

document.querySelector('.modal-overlay').addEventListener('click', () => {
    document.getElementById('detailModal').classList.remove('active');
});

// Like button
document.getElementById('likeBtn').addEventListener('click', async () => {
    if (!currentContentId) return;

    try {
        const likes = await toggleLike(currentContentId);
        const likeBtn = document.getElementById('likeBtn');
        const likeCount = document.getElementById('likeCount');

        likeCount.textContent = likes.count;

        if (likes.liked) {
            likeBtn.classList.add('liked');
            likeBtn.querySelector('i').className = 'fas fa-heart';
            showToast('Added to favorites!');
        } else {
            likeBtn.classList.remove('liked');
            likeBtn.querySelector('i').className = 'far fa-heart';
            showToast('Removed from favorites');
        }

        loadContent();
    } catch (error) {
        console.error('Error toggling like:', error);
        showToast('Error updating like');
    }
});

// Download button
document.getElementById('downloadBtn').addEventListener('click', async () => {
    if (!currentContentId) return;

    try {
        const item = await getContent(currentContentId);

        // Download document as HTML
        const blob = new Blob([item.content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${item.title}.html`;
        a.click();
        URL.revokeObjectURL(url);

        showToast('Download started!');
    } catch (error) {
        console.error('Error downloading:', error);
        showToast('Error downloading file');
    }
});

// Share button
document.getElementById('shareBtn').addEventListener('click', () => {
    if (navigator.share) {
        navigator.share({
            title: document.getElementById('detailTitle').textContent,
            url: window.location.href
        }).catch(() => {});
    } else {
        navigator.clipboard.writeText(window.location.href);
        showToast('Link copied to clipboard!');
    }
});

// Comment functionality
document.getElementById('commentBtn').addEventListener('click', async () => {
    const commentInput = document.getElementById('commentInput');
    const text = commentInput.value.trim();

    if (!text || !currentContentId) return;

    try {
        const commentData = {
            contentId: currentContentId,
            text,
            timestamp: Date.now(),
            date: new Date().toLocaleString()
        };

        await addComment(commentData);
        commentInput.value = '';

        const comments = await getComments(currentContentId);
        displayComments(comments);

        showToast('Comment added!');
    } catch (error) {
        console.error('Error adding comment:', error);
        showToast('Error adding comment');
    }
});

document.getElementById('commentInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('commentBtn').click();
    }
});

// Utility functions
function showLoading(show) {
    document.getElementById('loading').classList.toggle('active', show);
}

function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMessage').textContent = message;
    toast.classList.add('active');

    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize
async function init() {
    try {
        console.log('Initializing FreeView...');
        await initDB();
        console.log('FreeView initialized successfully! Database ready.');
    } catch (error) {
        console.error('Error initializing app:', error);
        showToast('Error initializing database: ' + error.message);
        alert('Database initialization failed. Please refresh the page. Error: ' + error.message);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
