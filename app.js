// IndexedDB setup
let db;
const DB_NAME = 'FreeViewChatDB';
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

            if (!db.objectStoreNames.contains('messages')) {
                const messagesStore = db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
                messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
}

// Database operations
async function addMessage(data) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        const transaction = db.transaction(['messages'], 'readwrite');
        const store = transaction.objectStore('messages');
        const request = store.add(data);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getAllMessages() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        const transaction = db.transaction(['messages'], 'readonly');
        const store = transaction.objectStore('messages');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// UI Elements
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const imageBtn = document.getElementById('imageBtn');
const imageInput = document.getElementById('imageInput');
const chatMessages = document.getElementById('chatMessages');
const imagePreviewModal = document.getElementById('imagePreviewModal');
const previewImage = document.getElementById('previewImage');
const closePreviewModal = document.getElementById('closePreviewModal');
const typingIndicator = document.getElementById('typingIndicator');
const scrollToBottomBtn = document.getElementById('scrollToBottom');
const messageCountEl = document.getElementById('messageCount');

// State
let typingTimeout;
let isUserScrolling = false;
let messageReactions = {}; // Store reactions per message ID

// Send text message
async function sendMessage() {
    const text = messageInput.value.trim();

    if (!text) return;

    showLoading(true);

    try {
        const messageData = {
            text,
            image: null,
            timestamp: Date.now(),
            date: new Date().toLocaleString()
        };

        await addMessage(messageData);
        messageInput.value = '';

        await loadMessages(true); // Play sound
        scrollToBottom();

        showLoading(false);
    } catch (error) {
        console.error('Error sending message:', error);
        showLoading(false);
        showToast('Error sending message');
    }
}

// Send image
async function sendImage(file) {
    if (!file) return;

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        showToast('Image too large! Please choose an image under 5MB');
        return;
    }

    showLoading(true);

    try {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const messageData = {
                text: '',
                image: e.target.result,
                timestamp: Date.now(),
                date: new Date().toLocaleString()
            };

            await addMessage(messageData);
            await loadMessages(true); // Play sound
            scrollToBottom();
            showLoading(false);
            showToast('Image sent!');
        };
        reader.onerror = () => {
            showLoading(false);
            showToast('Error reading image');
        };
        reader.readAsDataURL(file);
    } catch (error) {
        console.error('Error sending image:', error);
        showLoading(false);
        showToast('Error sending image');
    }
}

// Load and display messages
async function loadMessages(shouldPlaySound = false) {
    try {
        const messages = await getAllMessages();

        // Sort by timestamp
        messages.sort((a, b) => a.timestamp - b.timestamp);

        // Clear messages but keep typing indicator
        const typingEl = chatMessages.querySelector('.typing-indicator');
        chatMessages.innerHTML = '';

        if (messages.length === 0) {
            chatMessages.innerHTML = `
                <div style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                    <i class="fas fa-comments" style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p>No messages yet. Start the conversation!</p>
                </div>
            `;
            if (typingEl) chatMessages.appendChild(typingEl);
            updateMessageCount(0);
            return;
        }

        messages.forEach(message => {
            const messageEl = createMessageElement(message);
            chatMessages.appendChild(messageEl);
        });

        // Re-append typing indicator
        if (typingEl) chatMessages.appendChild(typingEl);

        // Update message count
        updateMessageCount(messages.length);

        // Play sound for new message
        if (shouldPlaySound) {
            playSoundEffect('message');
        }

    } catch (error) {
        console.error('Error loading messages:', error);
        showToast('Error loading messages');
    }
}

// Create message element
function createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    messageDiv.dataset.id = message.id;

    // Random color for avatar
    const colors = ['#667eea', '#764ba2', '#f093fb', '#4ade80', '#fbbf24', '#f87171', '#60a5fa', '#a78bfa'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    const avatarHtml = `
        <div class="message-avatar" style="background: ${avatarColor};">
            <i class="fas fa-user"></i>
        </div>
    `;

    let contentHtml = '';
    if (message.text) {
        contentHtml += `<div class="message-text">${escapeHtml(message.text)}</div>`;
    }

    messageDiv.innerHTML = `
        ${avatarHtml}
        <div class="message-content">
            <div class="message-header">
                <span class="message-author">Anonymous</span>
                <i class="fas fa-check-circle verified" title="Verified"></i>
                <span class="message-time">${formatTime(message.timestamp)}</span>
            </div>
            ${contentHtml}
        </div>
    `;

    const messageContent = messageDiv.querySelector('.message-content');

    // Add blurred image with reveal button if exists
    if (message.image) {
        const imageContainer = document.createElement('div');
        imageContainer.className = 'message-image-container';

        const img = document.createElement('img');
        img.src = message.image;
        img.className = 'message-image blurred';

        const revealBtn = document.createElement('button');
        revealBtn.className = 'reveal-image-btn';
        revealBtn.innerHTML = '<i class="fas fa-eye"></i> See Image';
        revealBtn.onclick = () => revealImage(img, revealBtn);

        imageContainer.appendChild(img);
        imageContainer.appendChild(revealBtn);
        messageContent.appendChild(imageContainer);
    }

    // Add reaction buttons
    const reactionsDiv = document.createElement('div');
    reactionsDiv.className = 'message-reactions';
    const emojis = ['❤️', '😂', '🔥', '👍', '😮'];

    emojis.forEach(emoji => {
        const reactionBtn = document.createElement('span');
        reactionBtn.className = 'reaction';
        reactionBtn.innerHTML = `${emoji} <span class="reaction-count">0</span>`;
        reactionBtn.onclick = () => addReaction(message.id, emoji, reactionBtn);
        reactionsDiv.appendChild(reactionBtn);
    });

    messageContent.appendChild(reactionsDiv);

    return messageDiv;
}

// Reveal blurred image
function revealImage(img, btn) {
    img.classList.remove('blurred');
    btn.style.display = 'none';
    img.onclick = () => previewImageFull(img.src);
    playSoundEffect('reveal');
}

// Add reaction to message
function addReaction(messageId, emoji, btn) {
    if (!messageReactions[messageId]) {
        messageReactions[messageId] = {};
    }
    if (!messageReactions[messageId][emoji]) {
        messageReactions[messageId][emoji] = 0;
    }

    // Toggle reaction
    if (btn.classList.contains('active')) {
        btn.classList.remove('active');
        messageReactions[messageId][emoji]--;
    } else {
        btn.classList.add('active');
        messageReactions[messageId][emoji]++;
        playSoundEffect('reaction');
    }

    const count = messageReactions[messageId][emoji];
    const countEl = btn.querySelector('.reaction-count');
    countEl.textContent = count;

    if (count > 0) {
        countEl.style.display = 'inline';
    } else {
        countEl.style.display = 'none';
    }
}

// Format timestamp
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
}

// Preview image in modal
function previewImageFull(imageSrc) {
    previewImage.src = imageSrc;
    imagePreviewModal.classList.add('active');
}

// Close preview modal
closePreviewModal.addEventListener('click', () => {
    imagePreviewModal.classList.remove('active');
});

document.querySelector('#imagePreviewModal .modal-overlay').addEventListener('click', () => {
    imagePreviewModal.classList.remove('active');
});

// Scroll to bottom of chat
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Update message count
function updateMessageCount(count) {
    messageCountEl.textContent = `${count} message${count !== 1 ? 's' : ''}`;
}

// Show typing indicator
function showTypingIndicator() {
    typingIndicator.classList.add('active');
    clearTimeout(typingTimeout);

    typingTimeout = setTimeout(() => {
        typingIndicator.classList.remove('active');
    }, 1000);
}

// Check if user is at bottom
function isAtBottom() {
    const threshold = 100;
    return chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < threshold;
}

// Update scroll button visibility
function updateScrollButton() {
    if (isAtBottom()) {
        scrollToBottomBtn.classList.remove('visible');
    } else {
        scrollToBottomBtn.classList.add('visible');
    }
}

// Play sound effects
function playSoundEffect(type) {
    // Create simple beep using Web Audio API
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        if (type === 'message') {
            oscillator.frequency.value = 800;
            gainNode.gain.value = 0.1;
        } else if (type === 'reaction') {
            oscillator.frequency.value = 1200;
            gainNode.gain.value = 0.05;
        } else if (type === 'reveal') {
            oscillator.frequency.value = 600;
            gainNode.gain.value = 0.08;
        }

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        // Silently fail if audio not supported
    }
}

// Event listeners
sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

messageInput.addEventListener('input', () => {
    showTypingIndicator();
});

chatMessages.addEventListener('scroll', () => {
    updateScrollButton();
});

scrollToBottomBtn.addEventListener('click', () => {
    scrollToBottom();
});

imageBtn.addEventListener('click', () => {
    imageInput.click();
});

imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        sendImage(file);
    }
    imageInput.value = ''; // Reset input
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
        console.log('Initializing FreeView Chat...');
        await initDB();
        console.log('Database initialized successfully!');
        await loadMessages();
        scrollToBottom();
        console.log('Chat loaded!');
    } catch (error) {
        console.error('Error initializing app:', error);
        showToast('Error initializing chat: ' + error.message);
        alert('Chat initialization failed. Please refresh the page. Error: ' + error.message);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
