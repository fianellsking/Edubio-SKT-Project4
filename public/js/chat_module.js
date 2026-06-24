// ✅ chat_module.js - แก้ไขให้ Gemini จำบทสนทนาและ context ได้ต่อเนื่อง พร้อมเก็บประวัติ

import { GEMINI_API_KEY } from './config.js';

let chatHistory = []; // เก็บประวัติสนทนา
let chatLessonsData = {}; // บริบทบทเรียน

function generateUniqueId() {
  return 'chat-msg-' + Math.random().toString(36).substr(2, 9);
}

function appendMessage(sender, message, isTyping = false) {
  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return;

  const messageElement = document.createElement('div');
  messageElement.classList.add('flex', 'items-start', 'mb-4');
  messageElement.id = generateUniqueId();

  let senderIconHtml = '';
  let messageBubbleClass = '';
  let messageTextColor = 'text-gray-800';

  if (sender === 'user') {
    messageElement.classList.add('justify-end');
    senderIconHtml = `
      <div class="flex-shrink-0 bg-gray-300 text-gray-800 rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold ml-2 order-2">คุณ</div>
    `;
    messageBubbleClass = 'bg-blue-500 text-white order-1';
  } else {
    senderIconHtml = `
      <div class="flex-shrink-0 bg-blue-200 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold mr-2">AI</div>
    `;
    messageBubbleClass = 'bg-blue-100 text-gray-800';
  }

  messageElement.innerHTML = `
    ${senderIconHtml}
    <div class="${messageBubbleClass} p-3 rounded-xl max-w-[80%] shadow-sm">
      ${isTyping ? '<div class="typing-indicator flex space-x-1"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>' : `<p class="text-sm ${messageTextColor}">${message}</p>`}
    </div>
  `;

  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
  const chatMessages = document.getElementById('chatMessages');
  const typingIndicator = chatMessages?.querySelector('.typing-indicator');
  typingIndicator?.parentElement?.parentElement?.remove();
}


async function sendMessageToAI(userMessage, context = {}) {
    appendMessage('user', userMessage);
    
    // Check if user is inputting an API key
    if (userMessage.startsWith('AIzaSy')) {
        localStorage.setItem('gemini_api_key', userMessage.trim());
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.value = '';
            chatInput.disabled = false;
        }
        appendMessage('ai', 'บันทึก API Key สำเร็จ! ตอนนี้คุณสามารถถามคำถามได้เลยครับ');
        return;
    }

    let apiKey = localStorage.getItem('gemini_api_key') || (typeof GEMINI_API_KEY !== 'undefined' ? GEMINI_API_KEY : "");
    if (!apiKey) {
        appendMessage('ai', 'ระบบต้องการ Gemini API Key ฟรี เพื่อเริ่มทำงาน<br>กรุณารับฟรีได้ที่ <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-blue-600 underline">Google AI Studio</a><br>และนำ API Key (ที่ขึ้นต้นด้วย AIzaSy) มาพิมพ์ลงในช่องแชทนี้ได้เลยครับ');
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.value = '';
            chatInput.disabled = false;
        }
        return;
    }

    appendMessage('ai', '', true); // แสดง typing indicator

    // ถ้ายังไม่เคยสนทนา → ใส่ prompt context เป็นข้อความแรก
    if (chatHistory.length === 0) {
        const systemPrompt = `คุณคือ EduBio AI ผู้ช่วยเว็บไซต์ชีววิทยา EduBio ตอบคำถามจากบทเรียนหรือความรู้ชีววิทยาทั่วไป หากไม่มีข้อมูลให้แนะนำผู้ใช้ให้ค้นหาภายนอก
บริบท: ${JSON.stringify(context.lessonsData || {})}`;
        
        chatHistory.push({
            role: "user",
            parts: [{ text: `${systemPrompt}\n\nคำถาม: ${userMessage}` }]
        });
    } else {
        chatHistory.push({
            role: "user",
            parts: [{ text: userMessage }]
        });
    }

    const payload = {
        contents: chatHistory,
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500
        }
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        removeTypingIndicator();

        if (result.error) {
            if (result.error.code === 403 || result.error.code === 400 || result.error.code === 429) {
                appendMessage('ai', `API Key มีปัญหาหรือหมดโควต้า (${result.error.message})<br>กรุณารับ API Key อันใหม่จาก <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-blue-600 underline">Google AI Studio</a> แล้วนำมาพิมพ์ในช่องแชทครับ`);
                localStorage.removeItem('gemini_api_key');
            } else {
                appendMessage('ai', `เกิดข้อผิดพลาดจาก Gemini: ${result.error.message}`);
            }
            return;
        }

        const aiText = result?.candidates?.[0]?.content?.parts?.[0]?.text || "ขออภัย ไม่สามารถตอบได้ครับ";
        appendMessage('ai', aiText);

        // บันทึกคำตอบ AI ลง history
        chatHistory.push({
            role: "model",
            parts: [{ text: aiText }]
        });

    } catch (err) {
        removeTypingIndicator();
        appendMessage('ai', `เกิดข้อผิดพลาด: ${err.message}`);
        console.error("Gemini API Error:", err);
    } finally {
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.value = '';
            chatInput.disabled = false;
            chatInput.focus();
        }
    }
}


export function setChatContext(lessons) {
  chatLessonsData = lessons;
  console.log("[Chat] Context received:", lessons);
}

export function initChatModule() {
  const openChatBtn = document.getElementById('openChatBtn');
  const chatModal = document.getElementById('chatModal');
  const closeChatBtn = document.getElementById('closeChatBtn');
  const chatInput = document.getElementById('chatInput');
  const sendChatBtn = document.getElementById('sendChatBtn');

  openChatBtn?.addEventListener('click', () => {
    if (chatModal.classList.contains('hidden')) {
      chatModal.classList.remove('hidden');
      chatModal.style.display = 'flex';
      chatInput?.focus();
    } else {
      chatModal.classList.add('hidden');
      chatModal.style.display = 'none';
    }
  });

  closeChatBtn?.addEventListener('click', () => {
    chatModal.classList.add('hidden');
    chatModal.style.display = 'none';
  });

  sendChatBtn?.addEventListener('click', () => {
    const userMessage = chatInput.value.trim();
    if (userMessage) {
      chatInput.disabled = true;
      sendMessageToAI(userMessage, { lessonsData: chatLessonsData });
    }
  });

  chatInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const userMessage = chatInput.value.trim();
      if (userMessage) {
        chatInput.disabled = true;
        sendMessageToAI(userMessage, { lessonsData: chatLessonsData });
      }
    }
  });
}