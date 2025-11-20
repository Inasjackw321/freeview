// IndexedDB setup
let db;
const DB_NAME = 'FreeViewDB';
const DB_VERSION = 1;
const CONTENT_STORE = 'content';
const COMMENTS_STORE = 'comments';
const LIKES_STORE = 'likes';

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

            // Content store (videos + documents)
            if (!db.objectStoreNames.contains(CONTENT_STORE)) {
                const contentStore = db.createObjectStore(CONTENT_STORE, { keyPath: 'id', autoIncrement: true });
                contentStore.createIndex('timestamp', 'timestamp', { unique: false });
                contentStore.createIndex('type', 'type', { unique: false });
                contentStore.createIndex('category', 'category', { unique: false });
            }

            // Comments store
            if (!db.objectStoreNames.contains(COMMENTS_STORE)) {
                const commentsStore = db.createObjectStore(COMMENTS_STORE, { keyPath: 'id', autoIncrement: true });
                commentsStore.createIndex('contentId', 'contentId', { unique: false });
            }

            // Likes store
            if (!db.objectStoreNames.contains(LIKES_STORE)) {
                const likesStore = db.createObjectStore(LIKES_STORE, { keyPath: 'contentId' });
            }
        };
    });
}

// Database operations
async function addContent(contentData) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([CONTENT_STORE], 'readwrite');
        const store = transaction.objectStore(CONTENT_STORE);
        const request = store.add(contentData);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getAllContent() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([CONTENT_STORE], 'readonly');
        const store = transaction.objectStore(CONTENT_STORE);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getContent(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([CONTENT_STORE], 'readonly');
        const store = transaction.objectStore(CONTENT_STORE);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function addComment(commentData) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([COMMENTS_STORE], 'readwrite');
        const store = transaction.objectStore(COMMENTS_STORE);
        const request = store.add(commentData);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getComments(contentId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([COMMENTS_STORE], 'readonly');
        const store = transaction.objectStore(COMMENTS_STORE);
        const index = store.index('contentId');
        const request = index.getAll(contentId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getLikes(contentId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([LIKES_STORE], 'readonly');
        const store = transaction.objectStore(LIKES_STORE);
        const request = store.get(contentId);

        request.onsuccess = () => resolve(request.result || { contentId, count: 0, liked: false });
        request.onerror = () => reject(request.error);
    });
}

async function toggleLike(contentId) {
    return new Promise(async (resolve, reject) => {
        const likes = await getLikes(contentId);
        const newLikes = {
            contentId,
            count: likes.liked ? likes.count - 1 : likes.count + 1,
            liked: !likes.liked
        };

        const transaction = db.transaction([LIKES_STORE], 'readwrite');
        const store = transaction.objectStore(LIKES_STORE);
        const request = store.put(newLikes);

        request.onsuccess = () => resolve(newLikes);
        request.onerror = () => reject(request.error);
    });
}

// UI State
let currentFilter = 'all';
let currentCategory = null;
let currentContentId = null;
let currentUploadType = 'video';
let allContentItems = [];

// UI Elements
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');
const mainContainer = document.querySelector('.main-container');
const uploadModal = document.getElementById('uploadModal');
const detailModal = document.getElementById('detailModal');
const uploadBtn = document.getElementById('uploadBtn');
const uploadForm = document.getElementById('uploadForm');
const contentFile = document.getElementById('contentFile');
const fileInfo = document.getElementById('fileInfo');
const contentGrid = document.getElementById('contentGrid');
const noContent = document.getElementById('noContent');
const loadingSpinner = document.getElementById('loadingSpinner');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');

// Menu toggle
menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('show');
    sidebar.classList.toggle('hidden');
});

// Close modals
document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        uploadModal.classList.remove('active');
        detailModal.classList.remove('active');
    });
});

uploadModal.addEventListener('click', (e) => {
    if (e.target === uploadModal) {
        uploadModal.classList.remove('active');
    }
});

detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) {
        detailModal.classList.remove('active');
    }
});

// Upload button
uploadBtn.addEventListener('click', () => {
    uploadModal.classList.add('active');
});

// Upload type selector
document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentUploadType = btn.dataset.type;
        updateFileAccept();
    });
});

function updateFileAccept() {
    const accepts = {
        video: 'video/*',
        document: '.pdf,.doc,.docx,.txt,.rtf,.odt',
        image: 'image/*'
    };
    contentFile.setAttribute('accept', accepts[currentUploadType] || '*');
}

// File input change
contentFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const size = (file.size / (1024 * 1024)).toFixed(2);
        fileInfo.textContent = `Selected: ${file.name} (${size} MB)`;
        fileInfo.classList.add('active');
    }
});

// Upload form submit
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const file = contentFile.files[0];
    const title = document.getElementById('contentTitle').value;
    const description = document.getElementById('contentDescription').value;
    const category = document.getElementById('contentCategory').value;

    if (!file) {
        showToast('Please select a file');
        return;
    }

    showLoading(true);

    try {
        const fileData = await fileToBase64(file);
        const fileType = getFileType(file);

        let thumbnail = null;
        if (fileType === 'video') {
            thumbnail = await generateVideoThumbnail(file);
        } else if (fileType === 'image') {
            thumbnail = fileData;
        } else {
            thumbnail = getDocumentIcon(file.name);
        }

        const contentData = {
            title,
            description,
            category,
            type: fileType,
            fileData,
            fileName: file.name,
            fileType: file.type,
            thumbnail,
            timestamp: Date.now(),
            date: new Date().toLocaleDateString()
        };

        await addContent(contentData);

        showLoading(false);
        uploadModal.classList.remove('active');
        uploadForm.reset();
        fileInfo.classList.remove('active');

        showToast(`${fileType.charAt(0).toUpperCase() + fileType.slice(1)} uploaded successfully!`);
        loadContent();
    } catch (error) {
        console.error('Error uploading:', error);
        showLoading(false);
        showToast('Error uploading file. File might be too large.');
    }
});

// Get file type
function getFileType(file) {
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('image/')) return 'image';
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) return 'pdf';
    return 'document';
}

// Get document icon
function getDocumentIcon(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const icons = {
        'pdf': 'fa-file-pdf',
        'doc': 'fa-file-word',
        'docx': 'fa-file-word',
        'txt': 'fa-file-alt',
        'rtf': 'fa-file-alt',
        'xls': 'fa-file-excel',
        'xlsx': 'fa-file-excel',
        'ppt': 'fa-file-powerpoint',
        'pptx': 'fa-file-powerpoint',
        'zip': 'fa-file-archive',
        'rar': 'fa-file-archive'
    };

    const iconClass = icons[ext] || 'fa-file';
    return `<i class="fas ${iconClass}"></i>`;
}

// File to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Generate video thumbnail
function generateVideoThumbnail(file) {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');

        video.preload = 'metadata';
        video.src = URL.createObjectURL(file);

        video.onloadedmetadata = () => {
            video.currentTime = Math.min(1, video.duration / 2);
        };

        video.onseeked = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
            URL.revokeObjectURL(video.src);
            resolve(thumbnail);
        };

        video.onerror = () => {
            URL.revokeObjectURL(video.src);
            resolve(null);
        };
    });
}

// Load and display content
async function loadContent(filter = currentFilter, category = currentCategory, searchTerm = '') {
    try {
        allContentItems = await getAllContent();

        let filtered = allContentItems;

        // Apply filters
        if (filter === 'videos') {
            filtered = filtered.filter(item => item.type === 'video');
        } else if (filter === 'documents') {
            filtered = filtered.filter(item => ['document', 'pdf'].includes(item.type));
        } else if (filter === 'images') {
            filtered = filtered.filter(item => item.type === 'image');
        } else if (filter === 'pdfs') {
            filtered = filtered.filter(item => item.type === 'pdf');
        } else if (filter === 'liked') {
            const likedIds = [];
            for (const item of allContentItems) {
                const likes = await getLikes(item.id);
                if (likes.liked) likedIds.push(item.id);
            }
            filtered = filtered.filter(item => likedIds.includes(item.id));
        }

        // Apply category filter
        if (category) {
            filtered = filtered.filter(item => item.category === category);
        }

        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(item =>
                item.title.toLowerCase().includes(term) ||
                item.description.toLowerCase().includes(term)
            );
        }

        if (filtered.length === 0) {
            noContent.style.display = 'block';
            contentGrid.style.display = 'none';
            return;
        }

        noContent.style.display = 'none';
        contentGrid.style.display = 'grid';
        contentGrid.innerHTML = '';

        // Sort by timestamp (newest first)
        filtered.sort((a, b) => b.timestamp - a.timestamp);

        for (const item of filtered) {
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
    card.onclick = () => openContentDetail(item.id);

    const thumbnailHtml = item.thumbnail && !item.thumbnail.startsWith('<i')
        ? `<img src="${item.thumbnail}" alt="${item.title}" class="content-thumbnail">`
        : `<div class="content-thumbnail" style="display: flex; align-items: center; justify-content: center; font-size: 3rem; color: rgba(255,255,255,0.5);">${item.thumbnail || '<i class="fas fa-file"></i>'}</div>`;

    const typeIcons = {
        video: 'fa-video',
        image: 'fa-image',
        pdf: 'fa-file-pdf',
        document: 'fa-file-alt'
    };

    card.innerHTML = `
        ${thumbnailHtml}
        <div class="content-card-body">
            <div class="content-card-header">
                <div class="card-icon">
                    <i class="fas ${typeIcons[item.type] || 'fa-file'}"></i>
                </div>
                <div class="card-info">
                    <h3 class="card-title">${escapeHtml(item.title)}</h3>
                    <div class="card-meta">
                        <span class="card-type-badge">${item.type.toUpperCase()}</span>
                        <span class="separator">•</span>
                        <span><i class="fas fa-heart"></i> ${likes.count}</span>
                        <span class="separator">•</span>
                        <span>${item.date}</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    return card;
}

// Open content detail
async function openContentDetail(contentId) {
    currentContentId = contentId;

    try {
        const item = await getContent(contentId);
        const likes = await getLikes(contentId);
        const comments = await getComments(contentId);

        // Hide all viewers first
        document.getElementById('detailVideo').style.display = 'none';
        document.getElementById('detailImage').style.display = 'none';
        document.getElementById('detailDocument').style.display = 'none';
        document.getElementById('detailDocumentPreview').style.display = 'none';

        // Show appropriate viewer
        if (item.type === 'video') {
            const videoEl = document.getElementById('detailVideo');
            videoEl.src = item.fileData;
            videoEl.style.display = 'block';
        } else if (item.type === 'image') {
            const imgEl = document.getElementById('detailImage');
            imgEl.src = item.fileData;
            imgEl.style.display = 'block';
        } else if (item.type === 'pdf') {
            const iframeEl = document.getElementById('detailDocument');
            iframeEl.src = item.fileData;
            iframeEl.style.display = 'block';
        } else {
            const previewEl = document.getElementById('detailDocumentPreview');
            previewEl.querySelector('i').className = `fas ${getDocumentIconClass(item.fileName)}`;
            previewEl.style.display = 'flex';
        }

        // Set download link
        const downloadLink = document.getElementById('downloadLink');
        downloadLink.href = item.fileData;
        downloadLink.download = item.fileName;

        // Set content details
        document.getElementById('detailTitle').textContent = item.title;
        document.getElementById('detailDescription').textContent = item.description || 'No description provided.';
        document.getElementById('detailDate').textContent = `Uploaded on ${item.date}`;
        document.getElementById('detailCategory').textContent = item.category.charAt(0).toUpperCase() + item.category.slice(1);

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

        // Load comments
        displayComments(comments);

        detailModal.classList.add('active');
    } catch (error) {
        console.error('Error opening content:', error);
        showToast('Error loading content');
    }
}

function getDocumentIconClass(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const icons = {
        'pdf': 'fa-file-pdf',
        'doc': 'fa-file-word',
        'docx': 'fa-file-word',
        'txt': 'fa-file-alt',
        'rtf': 'fa-file-alt',
        'xls': 'fa-file-excel',
        'xlsx': 'fa-file-excel',
        'ppt': 'fa-file-powerpoint',
        'pptx': 'fa-file-powerpoint'
    };
    return icons[ext] || 'fa-file';
}

// Display comments
function displayComments(comments) {
    const commentsList = document.getElementById('commentsList');
    const commentCount = document.getElementById('commentCount');
    commentsList.innerHTML = '';
    commentCount.textContent = comments.length;

    if (comments.length === 0) {
        commentsList.innerHTML = '<div class="no-comments">No comments yet. Be the first to comment!</div>';
        return;
    }

    comments.sort((a, b) => b.timestamp - a.timestamp);

    comments.forEach(comment => {
        const commentEl = document.createElement('div');
        commentEl.className = 'comment';
        commentEl.innerHTML = `
            <div class="comment-author">
                <i class="fas fa-user-circle"></i>
                ${escapeHtml(comment.author)}
            </div>
            <div class="comment-text">${escapeHtml(comment.text)}</div>
            <div class="comment-date">${comment.date}</div>
        `;
        commentsList.appendChild(commentEl);
    });
}

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

// Share button
document.getElementById('shareBtn').addEventListener('click', () => {
    if (navigator.share) {
        navigator.share({
            title: document.getElementById('detailTitle').textContent,
            text: document.getElementById('detailDescription').textContent,
            url: window.location.href
        }).catch(() => {});
    } else {
        navigator.clipboard.writeText(window.location.href);
        showToast('Link copied to clipboard!');
    }
});

// Download button
document.getElementById('downloadBtn').addEventListener('click', () => {
    document.getElementById('downloadLink').click();
    showToast('Download started!');
});

// Comment functionality
document.getElementById('commentBtn').addEventListener('click', async () => {
    const commentInput = document.getElementById('commentInput');
    const text = commentInput.value.trim();

    if (!text || !currentContentId) return;

    try {
        const commentData = {
            contentId: currentContentId,
            author: 'Anonymous User',
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

// Filter chips
document.querySelectorAll('.filter-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chips .chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentFilter = chip.dataset.filter;
        currentCategory = null;
        loadContent(currentFilter);
    });
});

// Sidebar navigation
document.querySelectorAll('.sidebar-item[data-filter]').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        currentFilter = item.dataset.filter;
        currentCategory = null;

        // Update chips
        const chipFilter = currentFilter === 'videos' ? 'videos' :
                          currentFilter === 'documents' ? 'documents' :
                          currentFilter === 'liked' ? 'all' : 'all';
        document.querySelectorAll('.filter-chips .chip').forEach(c => c.classList.remove('active'));
        document.querySelector(`.filter-chips .chip[data-filter="${chipFilter}"]`)?.classList.add('active');

        loadContent(currentFilter);
    });
});

document.querySelectorAll('.sidebar-item[data-category]').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        currentFilter = 'all';
        currentCategory = item.dataset.category;

        document.querySelectorAll('.filter-chips .chip').forEach(c => c.classList.remove('active'));
        document.querySelector('.filter-chips .chip[data-filter="all"]')?.classList.add('active');

        loadContent(currentFilter, currentCategory);
    });
});

// Search functionality
function performSearch() {
    const searchTerm = searchInput.value.trim();
    loadContent(currentFilter, currentCategory, searchTerm);

    if (searchTerm) {
        showToast(`Searching for "${searchTerm}"`);
    }
}

searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        performSearch();
    }
});

// Utility functions
function showLoading(show) {
    if (show) {
        loadingSpinner.classList.add('active');
    } else {
        loadingSpinner.classList.remove('active');
    }
}

function showToast(message) {
    toastMessage.textContent = message;
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

// Initialize app
async function init() {
    try {
        await initDB();
        await loadContent();
        console.log('FreeView initialized successfully!');
    } catch (error) {
        console.error('Error initializing app:', error);
        showToast('Error initializing application');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
