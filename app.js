// IndexedDB setup
let db;
const DB_NAME = 'FreeViewDB';
const DB_VERSION = 1;
const VIDEOS_STORE = 'videos';
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

            // Videos store
            if (!db.objectStoreNames.contains(VIDEOS_STORE)) {
                const videosStore = db.createObjectStore(VIDEOS_STORE, { keyPath: 'id', autoIncrement: true });
                videosStore.createIndex('timestamp', 'timestamp', { unique: false });
            }

            // Comments store
            if (!db.objectStoreNames.contains(COMMENTS_STORE)) {
                const commentsStore = db.createObjectStore(COMMENTS_STORE, { keyPath: 'id', autoIncrement: true });
                commentsStore.createIndex('videoId', 'videoId', { unique: false });
            }

            // Likes store
            if (!db.objectStoreNames.contains(LIKES_STORE)) {
                const likesStore = db.createObjectStore(LIKES_STORE, { keyPath: 'videoId' });
            }
        };
    });
}

// Database operations
async function addVideo(videoData) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([VIDEOS_STORE], 'readwrite');
        const store = transaction.objectStore(VIDEOS_STORE);
        const request = store.add(videoData);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getAllVideos() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([VIDEOS_STORE], 'readonly');
        const store = transaction.objectStore(VIDEOS_STORE);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getVideo(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([VIDEOS_STORE], 'readonly');
        const store = transaction.objectStore(VIDEOS_STORE);
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

async function getComments(videoId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([COMMENTS_STORE], 'readonly');
        const store = transaction.objectStore(COMMENTS_STORE);
        const index = store.index('videoId');
        const request = index.getAll(videoId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getLikes(videoId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([LIKES_STORE], 'readonly');
        const store = transaction.objectStore(LIKES_STORE);
        const request = store.get(videoId);

        request.onsuccess = () => resolve(request.result || { videoId, count: 0, liked: false });
        request.onerror = () => reject(request.error);
    });
}

async function toggleLike(videoId) {
    return new Promise(async (resolve, reject) => {
        const likes = await getLikes(videoId);
        const newLikes = {
            videoId,
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

// UI Elements
const uploadBtn = document.getElementById('uploadBtn');
const uploadModal = document.getElementById('uploadModal');
const videoModal = document.getElementById('videoModal');
const uploadForm = document.getElementById('uploadForm');
const videoFile = document.getElementById('videoFile');
const fileInfo = document.getElementById('fileInfo');
const videoGrid = document.getElementById('videoGrid');
const noVideos = document.getElementById('noVideos');
const loadingSpinner = document.getElementById('loadingSpinner');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');

// Modal controls
const closeButtons = document.querySelectorAll('.close-btn');
closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        uploadModal.classList.remove('active');
        videoModal.classList.remove('active');
    });
});

// Close modals when clicking outside
uploadModal.addEventListener('click', (e) => {
    if (e.target === uploadModal) {
        uploadModal.classList.remove('active');
    }
});

videoModal.addEventListener('click', (e) => {
    if (e.target === videoModal) {
        videoModal.classList.remove('active');
    }
});

// Upload button
uploadBtn.addEventListener('click', () => {
    uploadModal.classList.add('active');
});

// File input change
videoFile.addEventListener('change', (e) => {
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

    const file = videoFile.files[0];
    const title = document.getElementById('videoTitle').value;
    const description = document.getElementById('videoDescription').value;

    if (!file) {
        showToast('Please select a video file');
        return;
    }

    showLoading(true);

    try {
        // Convert video to base64
        const videoBase64 = await fileToBase64(file);

        // Generate thumbnail
        const thumbnail = await generateThumbnail(file);

        const videoData = {
            title,
            description,
            videoData: videoBase64,
            thumbnail,
            timestamp: Date.now(),
            date: new Date().toLocaleDateString()
        };

        await addVideo(videoData);

        showLoading(false);
        uploadModal.classList.remove('active');
        uploadForm.reset();
        fileInfo.classList.remove('active');

        showToast('Video uploaded successfully!');
        loadVideos();
    } catch (error) {
        console.error('Error uploading video:', error);
        showLoading(false);
        showToast('Error uploading video. File might be too large.');
    }
});

// Convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Generate video thumbnail
function generateThumbnail(file) {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const context = canvas.context('2d');

        video.preload = 'metadata';
        video.src = URL.createObjectURL(file);

        video.onloadedmetadata = () => {
            video.currentTime = 1; // Get frame at 1 second
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
            // Return a placeholder if thumbnail generation fails
            resolve('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23667eea" width="400" height="300"/%3E%3Ctext fill="white" font-size="40" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EVideo%3C/text%3E%3C/svg%3E');
        };
    });
}

// Load and display videos
async function loadVideos() {
    try {
        const videos = await getAllVideos();

        if (videos.length === 0) {
            noVideos.style.display = 'block';
            videoGrid.style.display = 'none';
            return;
        }

        noVideos.style.display = 'none';
        videoGrid.style.display = 'grid';
        videoGrid.innerHTML = '';

        // Sort by timestamp (newest first)
        videos.sort((a, b) => b.timestamp - a.timestamp);

        for (const video of videos) {
            const likes = await getLikes(video.id);
            const card = createVideoCard(video, likes);
            videoGrid.appendChild(card);
        }
    } catch (error) {
        console.error('Error loading videos:', error);
        showToast('Error loading videos');
    }
}

// Create video card element
function createVideoCard(video, likes) {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.onclick = () => openVideoDetail(video.id);

    card.innerHTML = `
        <img src="${video.thumbnail}" alt="${video.title}" class="video-thumbnail">
        <div class="video-card-content">
            <h3 class="video-card-title">${escapeHtml(video.title)}</h3>
            <p class="video-card-description">${escapeHtml(video.description)}</p>
            <div class="video-card-meta">
                <span class="video-card-likes">
                    <i class="fas fa-heart"></i>
                    ${likes.count}
                </span>
                <span>${video.date}</span>
            </div>
        </div>
    `;

    return card;
}

// Open video detail modal
let currentVideoId = null;

async function openVideoDetail(videoId) {
    currentVideoId = videoId;

    try {
        const video = await getVideo(videoId);
        const likes = await getLikes(videoId);
        const comments = await getComments(videoId);

        // Set video details
        document.getElementById('detailVideo').src = video.videoData;
        document.getElementById('detailTitle').textContent = video.title;
        document.getElementById('detailDescription').textContent = video.description;
        document.getElementById('detailDate').textContent = `Uploaded on ${video.date}`;

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

        videoModal.classList.add('active');
    } catch (error) {
        console.error('Error opening video:', error);
        showToast('Error loading video');
    }
}

// Display comments
function displayComments(comments) {
    const commentsList = document.getElementById('commentsList');
    commentsList.innerHTML = '';

    if (comments.length === 0) {
        commentsList.innerHTML = '<div class="no-comments">No comments yet. Be the first to comment!</div>';
        return;
    }

    // Sort by timestamp (newest first)
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
    if (!currentVideoId) return;

    try {
        const likes = await toggleLike(currentVideoId);
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

        // Reload videos to update like counts
        loadVideos();
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
        // Fallback - copy to clipboard
        navigator.clipboard.writeText(window.location.href);
        showToast('Link copied to clipboard!');
    }
});

// Comment functionality
document.getElementById('commentBtn').addEventListener('click', async () => {
    const commentInput = document.getElementById('commentInput');
    const text = commentInput.value.trim();

    if (!text || !currentVideoId) return;

    try {
        const commentData = {
            videoId: currentVideoId,
            author: 'Anonymous User', // You can add user authentication later
            text,
            timestamp: Date.now(),
            date: new Date().toLocaleString()
        };

        await addComment(commentData);
        commentInput.value = '';

        // Reload comments
        const comments = await getComments(currentVideoId);
        displayComments(comments);

        showToast('Comment added!');
    } catch (error) {
        console.error('Error adding comment:', error);
        showToast('Error adding comment');
    }
});

// Allow Enter key to submit comment
document.getElementById('commentInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('commentBtn').click();
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
        await loadVideos();
        console.log('FreeView initialized successfully!');
    } catch (error) {
        console.error('Error initializing app:', error);
        showToast('Error initializing application');
    }
}

// Start the app when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
