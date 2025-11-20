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

        await loadMessages();
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
            await loadMessages();
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
async function loadMessages() {
    try {
        const messages = await getAllMessages();

        // Sort by timestamp
        messages.sort((a, b) => a.timestamp - b.timestamp);

        chatMessages.innerHTML = '';

        if (messages.length === 0) {
            chatMessages.innerHTML = `
                <div style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                    <i class="fas fa-comments" style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p>No messages yet. Start the conversation!</p>
                </div>
            `;
            return;
        }

        messages.forEach(message => {
            const messageEl = createMessageElement(message);
            chatMessages.appendChild(messageEl);
        });

    } catch (error) {
        console.error('Error loading messages:', error);
        showToast('Error loading messages');
    }
}

// Create message element
function createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';

    const headerHtml = `
        <div class="message-header">
            <i class="fas fa-user-circle"></i>
            <span>Anonymous</span>
            <i class="fas fa-check-circle verified" title="Verified"></i>
            <span class="message-time">${message.date}</span>
        </div>
    `;

    let bubbleContent = '';
    if (message.text) {
        bubbleContent += `<div>${escapeHtml(message.text)}</div>`;
    }
    if (message.image) {
        bubbleContent += `<img src="${message.image}" alt="Shared image" onclick="previewImageFull('${message.image}')">`;
    }

    messageDiv.innerHTML = `
        ${headerHtml}
        <div class="message-bubble">
            ${bubbleContent}
        </div>
    `;

    return messageDiv;
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

// Event listeners
sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
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
