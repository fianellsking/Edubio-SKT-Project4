// ✅ chat_module.js - แก้ไขให้ Gemini จำบทสนทนาและ context ได้ต่อเนื่อง พร้อมเก็บประวัติ

import { GEMINI_API_KEY } from './config.js';

let chatHistory = [];
try {
  chatHistory = JSON.parse(localStorage.getItem('edubio_chat_history') || "[]");
} catch(e) {
  chatHistory = [];
}
let chatLessonsData = {};

function saveChatHistory() {
  try {
    localStorage.setItem('edubio_chat_history', JSON.stringify(chatHistory));
  } catch(e) {}
}

function generateUniqueId() {
  return 'chat-msg-' + Math.random().toString(36).substr(2, 9);
}

function formatChatText(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\*\s+(.*)$/gm, '&bull; $1')
    .replace(/^- \s*(.*)$/gm, '&bull; $1')
    .replace(/\n/g, '<br>');
}

function setInputEnabled(enabled) {
  const chatInput = document.getElementById('chatInput');
  const sendChatBtn = document.getElementById('sendChatBtn');
  if (chatInput) {
    chatInput.disabled = !enabled;
    if (enabled) chatInput.focus();
  }
  if (sendChatBtn) {
    sendChatBtn.disabled = !enabled;
  }
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
    messageTextColor = 'text-white';
  } else {
    senderIconHtml = `
      <div class="flex-shrink-0 bg-blue-200 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold mr-2">AI</div>
    `;
    messageBubbleClass = 'bg-blue-100 text-gray-800';
    messageTextColor = 'text-gray-800';
  }

  messageElement.innerHTML = `
    ${senderIconHtml}
    <div class="${messageBubbleClass} p-3 rounded-xl max-w-[80%] shadow-sm">
      ${isTyping ? '<div class="typing-indicator flex space-x-1"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>' : `<div class="text-sm ${messageTextColor} break-words leading-relaxed">${formatChatText(message)}</div>`}
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

  // Check commands
  const lowerMsg = userMessage.trim().toLowerCase();
  if (lowerMsg === '/reset' || lowerMsg === 'reset key' || lowerMsg === 'เปลี่ยน key') {
    localStorage.removeItem('gemini_api_key');
    localStorage.removeItem('edubio_chat_history');
    chatHistory = [];
    setInputEnabled(true);
    const chatInput = document.getElementById('chatInput');
    if (chatInput) chatInput.value = '';
    appendMessage('ai', 'ลบ API Key เดิมและล้างประวัติสนทนาเรียบร้อยแล้วครับ กรุณาใส่ API Key อันใหม่ (ขึ้นต้นด้วย AIza) เพื่อใช้งานต่อได้เลยครับ');
    return;
  }

  if (lowerMsg === '/clear' || lowerMsg === 'ล้างแชท') {
    chatHistory = [];
    localStorage.removeItem('edubio_chat_history');
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
      chatMessages.innerHTML = `
        <div class="flex items-start mb-4">
          <div class="flex-shrink-0 bg-blue-200 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold mr-2">AI</div>
          <div class="bg-blue-100 p-3 rounded-xl max-w-[80%] shadow-sm">
            <p class="text-sm text-gray-800">ล้างประวัติการสนทนาเรียบร้อยแล้วครับ ถามคำถามใหม่ได้เลย!</p>
          </div>
        </div>`;
    }
    setInputEnabled(true);
    const chatInput = document.getElementById('chatInput');
    if (chatInput) chatInput.value = '';
    return;
  }

  // Check if user is inputting an API key
  if (userMessage.startsWith('AIza') && userMessage.length >= 30) {
    localStorage.setItem('gemini_api_key', userMessage.trim());
    setInputEnabled(true);
    const chatInput = document.getElementById('chatInput');
    if (chatInput) chatInput.value = '';
    appendMessage('ai', 'บันทึก API Key ส่วนตัวของคุณสำเร็จ! ตอนนี้คุณสามารถถามคำถามเกี่ยวกับบทเรียนชีววิทยาได้เลยครับ');
    return;
  }

  let apiKey = localStorage.getItem('gemini_api_key') || (typeof GEMINI_API_KEY !== 'undefined' && GEMINI_API_KEY ? GEMINI_API_KEY : "");
  if (!apiKey) {
    appendMessage('ai', 'ระบบต้องการ Gemini API Key ฟรี เพื่อเริ่มทำงาน<br>กรุณารับฟรีได้ที่ <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-blue-600 underline font-semibold">Google AI Studio</a><br>และนำ API Key (ที่ขึ้นต้นด้วย AIza) มาคัดลอกวางในช่องแชทนี้ได้เลยครับ<br><span class="text-xs text-gray-500 mt-1 inline-block">(พิมพ์ <strong>/reset</strong> หากต้องการเปลี่ยน Key หรือ <strong>/clear</strong> เพื่อล้างแชท)</span>');
    setInputEnabled(true);
    const chatInput = document.getElementById('chatInput');
    if (chatInput) chatInput.value = '';
    return;
  }

  appendMessage('ai', '', true); // แสดง typing indicator

  const newUserMessage = {
    role: "user",
    parts: [{ text: userMessage }]
  };

  const requestContents = [...chatHistory, newUserMessage];

  const systemInstructionText = `คุณคือ EduBio AI ผู้ช่วยอัจฉริยะด้านชีววิทยาของเว็บไซต์ EduBio มีหน้าที่ตอบคำถามอธิบายเนื้อหาบทเรียนและให้ความรู้ชีววิทยาด้วยภาษาที่เข้าใจง่าย เป็นมิตร และถูกต้องตามหลักวิทยาศาสตร์
หากคำถามเกี่ยวข้องกับเนื้อหาบทเรียน ให้ใช้อ้างอิงจากข้อมูลบริบทบทเรียนด้านล่างนี้เป็นหลัก
หากคำถามนอกเหนือจากบทเรียนแต่เป็นเรื่องชีววิทยาหรือวิทยาศาสตร์ ให้ตอบตามความรู้ทั่วไปให้ดีที่สุด
หากไม่มีข้อมูลหรือเป็นคำถามนอกเรื่องชัดเจน ให้ตอบอย่างสุภาพและแนะนำให้ค้นหาเพิ่มเติมภายนอก

ข้อมูลบริบทบทเรียนปัจจุบัน:
${JSON.stringify(context.lessonsData || chatLessonsData || {})}`;

  const payload = {
    systemInstruction: {
      parts: [{ text: systemInstructionText }]
    },
    contents: requestContents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1000
    }
  };

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    removeTypingIndicator();

    if (result.error) {
      const usingDefaultKey = !localStorage.getItem('gemini_api_key');
      if (result.error.code === 429 || (result.error.message && result.error.message.toLowerCase().includes("quota"))) {
        if (usingDefaultKey) {
          appendMessage('ai', `⚠️ <strong>โควต้า AI ส่วนรวม (Default Key) เต็มชั่วคราวแล้วครับ</strong><br><br>ไม่ต้องกังวล! คุณสามารถใช้คีย์ฟรีของคุณเองเพื่อแชทต่อได้ทันทีโดยไม่สะดุด:<br>1. กดรับคีย์ฟรีที่ <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-blue-600 underline font-bold">Google AI Studio</a><br>2. คัดลอกรหัสคีย์ (ขึ้นต้นด้วย AIza...) มาคัดลอกวางลงในช่องพิมพ์แชทนี้แล้วกดส่งได้ทันที!`);
        } else {
          appendMessage('ai', `คุณส่งคำถามเร็วเกินไปหรือโควต้าฟรีชั่วคราวเต็ม (429 Rate Limit)<br>กรุณารอสักครู่ประมาณ 30-60 วินาทีแล้วลองถามใหม่อีกครั้งครับ`);
        }
      } else if (result.error.code === 401 || result.error.code === 403 || (result.error.message && result.error.message.includes("API key"))) {
        appendMessage('ai', `API Key ไม่ถูกต้องหรือหมดอายุ (${result.error.message})<br>กรุณารับ API Key ใหม่จาก <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-blue-600 underline">Google AI Studio</a> แล้วนำมาวางในช่องแชทครับ`);
        localStorage.removeItem('gemini_api_key');
      } else {
        appendMessage('ai', `เกิดข้อผิดพลาดจากระบบ AI (${result.error.code || 'Error'}): ${result.error.message}`);
      }
      return;
    }

    const aiText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiText) {
      appendMessage('ai', 'ขออภัย ไม่สามารถประมวลผลคำตอบได้ในขณะนี้ กรุณาลองใหม่อีกครั้งครับ');
      return;
    }

    appendMessage('ai', aiText);

    // บันทึกคำถามผู้ใช้และคำตอบ AI ลง history เมื่อสำเร็จเท่านั้น
    chatHistory.push(newUserMessage);
    chatHistory.push({
      role: "model",
      parts: [{ text: aiText }]
    });
    saveChatHistory();

  } catch (err) {
    removeTypingIndicator();
    appendMessage('ai', `เกิดข้อผิดพลาดในการเชื่อมต่อ: ${err.message}`);
    console.error("Gemini API Error:", err);
  } finally {
    setInputEnabled(true);
    const chatInput = document.getElementById('chatInput');
    if (chatInput) chatInput.value = '';
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
  const apiKeyHelpBtn = document.getElementById('apiKeyHelpBtn');

  // โหลดประวัติแชทเก่าที่บันทึกไว้ใน LocalStorage มาแสดงผล
  if (chatHistory && chatHistory.length > 0) {
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
      chatHistory.forEach(msg => {
        const sender = msg.role === 'user' ? 'user' : 'ai';
        const text = msg.parts?.[0]?.text || '';
        if (text) {
          appendMessage(sender, text, false);
        }
      });
    }
  }

  apiKeyHelpBtn?.addEventListener('click', () => {
    appendMessage('ai', `🔑 <strong>วิธีใช้ API Key ของคุณเองฟรี:</strong><br><br>หากโควต้ารวมหมด คุณสามารถนำคีย์ส่วนตัวมาใช้ได้ฟรีและปลอดภัย:<br>1. ไปที่ <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-blue-600 underline font-bold">Google AI Studio</a> แล้วกด <strong>Create API key</strong><br>2. คัดลอกคีย์ (รหัสยาวๆ ที่ขึ้นต้นด้วย AIza...)<br>3. นำมาวางลงในช่องพิมพ์แชทด้านล่างแล้วกดส่ง ระบบจะสลับไปใช้คีย์คุณทันทีครับ!<br><br>💡 <span class="text-xs text-gray-600">(พิมพ์ <strong>/reset</strong> เพื่อเปลี่ยนคีย์ หรือ <strong>/clear</strong> เพื่อล้างแชท)</span>`);
  });

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
      setInputEnabled(false);
      sendMessageToAI(userMessage, { lessonsData: chatLessonsData });
    }
  });

  chatInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const userMessage = chatInput.value.trim();
      if (userMessage) {
        setInputEnabled(false);
        sendMessageToAI(userMessage, { lessonsData: chatLessonsData });
      }
    }
  });
}