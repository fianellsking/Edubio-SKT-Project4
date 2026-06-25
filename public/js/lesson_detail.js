// Import chat module functions directly
import { initChatModule, setChatContext } from './chat_module.js';

// Global variables provided by the Canvas environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

let currentUserId = null;
let currentLessonId = null;
// ทำให้ currentLessonData เป็น global เพื่อให้เข้าถึงได้จาก script ด้านนอก (สำหรับ chat_module)
window.currentLessonData = null; 
let preTestScore = 0;
let postTestScore = 0;
let userPreTestAnswers = {}; 
let userPostTestAnswers = {}; // Added to store post-test answers
let currentUserProfile = {}; // Store user profile data for sending to Sheets

// ** NEW: Google Apps Script Web App URL **
// <<--- เปลี่ยน URL นี้ด้วย Web App URL ที่คุณคัดลอกมาจากการ Deploy Google Apps Script
const GOOGLE_APPS_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbymhqfn_R_bpWKRL2ClDKZofpLYJ77p-dBPYYFiwxKY5Ga9eMpkdqmOEQSOPEaT-PFV/exec'; 


// Function to show custom message box
function showMessageBox(title, body, callback = null) {
    const messageBox = document.getElementById('messageBox');
    const messageBoxTitle = document.getElementById('messageBoxTitle');
    const messageBoxBody = document.getElementById('messageBoxBody');
    const messageBoxCloseBtn = document.getElementById('messageBoxCloseBtn');

    messageBoxTitle.textContent = title;
    messageBoxBody.textContent = body;
    messageBox.classList.remove('hidden');

    messageBoxCloseBtn.onclick = () => {
        messageBox.classList.add('hidden');
        if (callback && typeof callback === 'function') {
            callback(); // Execute callback after modal is hidden
        }
    };
}


// Function to show/hide sections
function showSection(sectionId) {
    const sections = ['preTestSection', 'taxonomyIntroSection', 'kingdomSelectionSection', 'contentSection', 'postTestSection', 'scoreSummarySection'];

    sections.forEach(id => {
        const section = document.getElementById(id);
        if (section) {
            if (id === sectionId) {
                section.classList.add('active');
                section.classList.remove('hidden');
                const guideImg = document.getElementById("teacherGuide");
                if (guideImg) {
                    if (sectionId === "kingdomSelectionSection") {
                        guideImg.classList.remove("hidden");
                    } else {
                        guideImg.classList.add("hidden");
                    }
                }
            } else {
                section.classList.remove('active');
                section.classList.add('hidden');
            }
        }
    });
}

// Function to generate questions (for both pre and post tests)
function renderQuestions(questions, containerId, testType, showAnswers = false, userAnswers = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`ไม่พบคอนเทนเนอร์ ${containerId}`);
        return;
    }
    container.innerHTML = ''; // Clear previous questions

    questions.forEach((q, index) => {
        const userAnswerObj = userAnswers[q.id]; // Get the stored answer object for this question
        const isSelectedAndCorrect = userAnswerObj && userAnswerObj.correct;
        const selectedOptionText = userAnswerObj ? userAnswerObj.selected : 'ไม่ได้เลือก';
        const correctAnswer = (userAnswerObj && userAnswerObj.correctAnswer) || q.answer || '';
        const explanation = (userAnswerObj && userAnswerObj.explanation) || q.explanation || '';
        
        const questionHtml = `
            <div class="question-item" data-question-id="${q.id}">
                <p>${index + 1}. ${q.question}</p>
                <div class="options-group">
                    ${q.options.map((option) => {
                        const isSelected = userAnswerObj && userAnswerObj.selected === option;
                        let labelClass = '';
                        
                        if (showAnswers) {
                            if (option === correctAnswer) {
                                labelClass += ' correct-answer-highlight'; // Always highlight the correct answer
                            }
                            if (isSelected) {
                                if (isSelectedAndCorrect) {
                                    labelClass += ' selected-correct'; // Highlight selected if correct
                                } else {
                                    labelClass += ' selected-incorrect'; // Highlight selected if incorrect
                                }
                            }
                        }
                        return `
                            <label class="flex items-center ${labelClass.trim()}">
                                <input type="radio" name="${testType}_q${q.id}" value="${option}" class="mr-2" 
                                    ${isSelected ? 'checked' : ''} ${showAnswers ? 'disabled' : ''}>
                                <span>${option}</span>
                            </label>
                        `;
                    }).join('')}
                </div>
                <div class="question-explanation mt-4 p-3 rounded-md ${showAnswers ? (isSelectedAndCorrect ? 'bg-green-100' : 'bg-red-100') : ''}" 
                     style="display: ${showAnswers ? 'block' : 'none'};">
                    <p><strong>${showAnswers ? (isSelectedAndCorrect ? `<span class="text-green-700">${selectedOptionText} ถูกต้อง!!!</span>` : `<span class="text-red-700">${selectedOptionText} ผิด!!!</span><br><span class="text-blue-700">คำตอบที่ถูกต้องคือ: ${correctAnswer}</span>`) : ''}</strong><br>คำอธิบาย: ${explanation}</p>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', questionHtml);
    });
}


// Function to check answers securely via server API
async function checkAnswers(questions, containerId, resultId, testType) { 
    const container = document.getElementById(containerId);
    const resultDisplay = document.getElementById(resultId);
    
    if (!container || !resultDisplay) {
        console.error(`ไม่พบคอนเทนเนอร์ ${containerId} หรือ ${resultId} สำหรับตรวจสอบคำตอบ`);
        return { score: 0, answers: {} };
    }

    const userSelections = {};
    let allAnswered = true;

    // First pass: Collect all selected answers and check if all questions are answered
    questions.forEach(q => {
        const questionItem = container.querySelector(`.question-item[data-question-id="${q.id}"]`);
        if (!questionItem) return;

        const selectedOption = questionItem.querySelector(`input[name="${testType}_q${q.id}"]:checked`);
        const selectedValue = selectedOption ? selectedOption.value : null;

        if (selectedValue === null) {
            allAnswered = false;
        }
        userSelections[q.id] = selectedValue;
    });

    // If not all questions are answered, show message and stop
    if (!allAnswered) {
        showMessageBox("คำเตือน", "กรุณาตอบคำถามให้ครบทุกข้อก่อนส่ง");
        return { score: -1, answers: {} };
    }

    // Call server API for verification
    let score = 0;
    let currentTestAnswers = {};
    try {
        const response = await fetch('/api/check-answers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lessonId: currentLessonId, testType, userSelections })
        });
        const data = await response.json();
        score = data.score || 0;
        currentTestAnswers = data.answers || {};
    } catch (err) {
        console.error("Server grading request failed:", err);
        showMessageBox("ข้อผิดพลาด", "ไม่สามารถตรวจสอบคำตอบกับเซิร์ฟเวอร์ได้");
        return { score: -1, answers: {} };
    }

    // Second pass: Update UI with explanation and correct choices from server response
    questions.forEach(q => {
        const questionItem = container.querySelector(`.question-item[data-question-id="${q.id}"]`);
        if (!questionItem) return;

        const selectedOption = questionItem.querySelector(`input[name="${testType}_q${q.id}"]:checked`);
        const explanationDiv = questionItem.querySelector('.question-explanation');
        const labels = questionItem.querySelectorAll('label');

        labels.forEach(label => {
            label.classList.remove('selected-correct', 'selected-incorrect', 'correct-answer-highlight');
        });

        const ansObj = currentTestAnswers[q.id] || {};
        const isCorrect = ansObj.correct || false;
        const correctAnswer = ansObj.correctAnswer || '';
        const explanation = ansObj.explanation || '';
        const selectedValue = ansObj.selected || null;

        if (isCorrect) {
            questionItem.classList.add('correct');
            if (selectedOption) selectedOption.parentElement.classList.add('selected-correct');
        } else {
            questionItem.classList.add('incorrect');
            if (selectedOption) selectedOption.parentElement.classList.add('selected-incorrect');
            const correctAnswerLabel = questionItem.querySelector(`input[value="${correctAnswer}"]`);
            if (correctAnswerLabel) {
                correctAnswerLabel.parentElement.classList.add('correct-answer-highlight');
            }
        }

        let explanationHeader = '';
        if (isCorrect) {
            explanationHeader = `<span class="text-green-700">${selectedValue} ถูกต้อง!!!</span>`;
        } else {
            explanationHeader = `<span class="text-red-700">${selectedValue || 'ไม่ได้เลือก'} ผิดพลาด!!!</span><br><span class="text-blue-700">คำตอบที่ถูกต้องคือ: ${correctAnswer}</span>`;
        }
        if (explanationDiv) {
            explanationDiv.innerHTML = `<p><strong>${explanationHeader}</strong><br>คำอธิบาย: ${explanation}</p>`;
            explanationDiv.style.display = 'block';
            explanationDiv.style.backgroundColor = isCorrect ? '#d1fae5' : '#fee2e2';
        }
    });

    resultDisplay.textContent = `คุณทำถูก ${score} ข้อ จาก ${questions.length} ข้อ`;
    resultDisplay.classList.remove('hidden');
    
    // Disable all radio buttons after successful submission
    container.querySelectorAll('input[type="radio"]').forEach(radio => radio.disabled = true);

    // Store answers globally based on test type
    if (testType === 'pre') {
        userPreTestAnswers = currentTestAnswers;
    } else if (testType === 'post') {
        userPostTestAnswers = currentTestAnswers;
    }

    return { score, answers: currentTestAnswers };
}

// Function to save score to MySQL
async function saveScore(lessonId, testType, score, answers) {
    if (!currentUserId || !lessonId) {
        console.error("ไม่สามารถบันทึกคะแนนได้: ผู้ใช้ยังไม่ได้เข้าสู่ระบบหรือไม่มีรหัสบทเรียน");
        showMessageBox("ข้อผิดพลาด", "ไม่สามารถบันทึกคะแนนได้ กรุณาเข้าสู่ระบบอีกครั้ง");
        return;
    }

    try {
        await fetch('/api/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify({ lessonId, testType, score, answers })
        });
    } catch (error) {
        console.error(`ข้อผิดพลาดในการบันทึกคะแนน ${testType} สำหรับบทเรียน ${lessonId}:`, error.message);
        showMessageBox("ข้อผิดพลาด", `ไม่สามารถบันทึกคะแนน${testType}ได้: ${error.message}`);
    }
}

// Function to load lesson content or kingdom selection
async function loadLesson(lessonId) {
    window.currentLessonData = window.lessonsData[lessonId];
    if (!window.currentLessonData) {
        console.error("Lesson data not found for:", lessonId);
        showMessageBox("ข้อผิดพลาด", "บทเรียนนี้ยังไม่มีในขณะนี้ โปรดรอการพัฒนา", () => {
            window.location.href = "/html/home.html"; // Redirect back if lesson not found
        });
        return;
    }

    document.getElementById('lessonTitle').textContent = window.currentLessonData.title;

    // Fetch current user profile
    if (currentUserId) { 
        try {
            const response = await fetch('/api/profile', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
            const userProfileSnap = await response.json();
            if (Object.keys(userProfileSnap).length > 0) {
                currentUserProfile = userProfileSnap;
            } else {
                currentUserProfile = {
                    fullName: auth.currentUser?.displayName || '',
                    class: '',
                    studentId: null
                };
            }

        } catch (error) {
            console.error("Error loading user profile on auth state change:", error);
            currentUserProfile = {
                fullName: auth.currentUser?.displayName || '',
                class: '',
                studentId: null
            };
        }
    }


    // Do not show preTestSection synchronously. Let loadSavedLessonState decide.
    loadSavedLessonState(lessonId); 
}

// New function to load saved lesson state from Firestore
async function loadSavedLessonState(lessonId) {
    // Only attempt to load if user is logged in
    if (!currentUserId) {
        showSection('preTestSection');
        renderQuestions(window.currentLessonData.preTest, 'preTestQuestions', 'pre');
        document.getElementById('continueToContentBtn').classList.add('hidden'); // Ensure hidden initially
        document.getElementById('submitPreTestBtn').disabled = false; // Ensure enabled
        return;
    }

    try {
        const response = await fetch('/api/scores', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        const scores = await response.json();
        const savedData = scores.find(s => s.lesson_id === lessonId);
        
        if (savedData) {


            // Load pre-test state
            if (savedData.pre_answers) {
                userPreTestAnswers = savedData.pre_answers;
                preTestScore = savedData.pre_score || 0; // Ensure score is loaded too

                // Automatically advance to lesson content without showing pre-test
                if (['taxonomy', 'wave'].includes(currentLessonId)) {
                    showSection('taxonomyIntroSection');
                    document.getElementById('generalIntroTitle').textContent = "ภาพรวมเนื้อหาเรื่องคลื่นกล";
                    document.getElementById('generalIntroContent').innerHTML = window.currentLessonData.content.introductionText;
                    renderGeneralTaxonomyVideos();
                    renderGeneralTaxonomySlides();
                    setupGeneralSlidesToggle();
                } else {
                    showSection('contentSection');
                    renderLessonContent();
                }
            } else {
                showSection('preTestSection');
                renderQuestions(window.currentLessonData.preTest, 'preTestQuestions', 'pre');
                document.getElementById('continueToContentBtn').classList.add('hidden'); // Hide continue button
                document.getElementById('submitPreTestBtn').disabled = false; // Ensure submit button is enabled
            }

            // Load post-test state (to enable "View Scores" if completed)
            if (savedData.post_answers) {
                userPostTestAnswers = savedData.post_answers;
                postTestScore = savedData.post_score || 0;
                // If post-test was completed, show view scores button
                if (document.getElementById('viewScoresBtn')) {
                    document.getElementById('viewScoresBtn').classList.remove('hidden');
                }
            } else {
                if (document.getElementById('viewScoresBtn')) {
                    document.getElementById('viewScoresBtn').classList.add('hidden');
                }
            }

        } else {
            showSection('preTestSection');
            renderQuestions(window.currentLessonData.preTest, 'preTestQuestions', 'pre');
            document.getElementById('continueToContentBtn').classList.add('hidden'); // Hide continue button
            document.getElementById('submitPreTestBtn').disabled = false; // Ensure submit button is enabled
        }
    } catch (error) {
        console.error("ข้อผิดพลาดในการโหลดข้อมูลบทเรียนที่บันทึกไว้:", error.message);
        showMessageBox("ข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลบทเรียนที่บันทึกไว้ได้: " + error.message);
        // Fallback to rendering fresh pre-test if load fails
        showSection('preTestSection');
        renderQuestions(window.currentLessonData.preTest, 'preTestQuestions', 'pre');
        document.getElementById('continueToContentBtn').classList.add('hidden');
        document.getElementById('submitPreTestBtn').disabled = false;
    }
}

// Function to render general taxonomy videos (if they exist)
function renderGeneralTaxonomyVideos() {
    const generalIntroContent = document.getElementById('generalIntroContent');
    if (['taxonomy', 'wave'].includes(currentLessonId) && window.currentLessonData.content.generalVideoUrls && generalIntroContent) {
        const videoHtmlArray = window.currentLessonData.content.generalVideoUrls.map(url => `
            <div class="video-responsive mt-6">
                <iframe src="${url}?autoplay=0&controls=1&modestbranding=1&rel=0" 
                        title="วิดีโอแนะนำบทเรียนฟิสิกส์" frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
        `);
        generalIntroContent.insertAdjacentHTML('beforeend', videoHtmlArray.join(''));
    }
}

function renderGeneralTaxonomySlides() {
    const generalIntroContent = document.getElementById('generalIntroContent');
    if (!generalIntroContent) return;

    const oldBtnContainer = document.getElementById('generalSlidesButtonsContainer');
    if (oldBtnContainer) oldBtnContainer.remove();



    const slides = window.currentLessonData.content.generalSlideUrls || [];
    if (slides.length === 0) return;

    const slidesButtonsContainer = document.createElement('div');
    slidesButtonsContainer.id = 'generalSlidesButtonsContainer';
    slidesButtonsContainer.classList.add('flex', 'flex-wrap', 'gap-4', 'mt-6', 'justify-center');

    slides.forEach((slide, index) => {
        const modalId = `generalSlideModal-${index}`;
        const buttonText = slide.title || "📄 ดูสไลด์";

        const iframeId = `generalSlideIframe-${index}`;
        const buttonHtml = `
            <button onclick="const m=document.getElementById('${modalId}'); const f=document.getElementById('${iframeId}'); if(!f.src) f.src=f.dataset.src; m.classList.remove('hidden');"
                class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-full shadow-lg transition">
                ${buttonText}
            </button>
        `;
        slidesButtonsContainer.insertAdjacentHTML('beforeend', buttonHtml);

        const modalHtml = `
            <div id="${modalId}" class="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 hidden">
                <div class="bg-white rounded-2xl p-4 w-full max-w-4xl shadow-2xl flex flex-col items-center relative">
                    <div class="video-responsive w-full rounded-md overflow-hidden shadow">
                        <iframe id="${iframeId}" data-src="${slide.url}" width="100%" height="100%" frameborder="0" allow="autoplay"></iframe>
                    </div>
                    <button onclick="document.getElementById('${modalId}').classList.add('hidden')"
                        class="mt-6 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-full transition shadow-lg">
                        ✖ ปิดสไลด์
                    </button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    });

    generalIntroContent.insertAdjacentHTML('beforeend', slidesButtonsContainer.outerHTML);
}

function setupGeneralSlidesToggle() {
  const btn = document.getElementById("toggleGeneralSlidesBtn");
  const container = document.getElementById("generalSlidesContainer");

  if (!btn || !container) return;

  let isVisible = false;

  btn.addEventListener("click", () => {
    isVisible = !isVisible;
    container.classList.toggle("hidden", !isVisible);
    btn.textContent = isVisible ? "ซ่อนสไลด์ภาพรวม" : "ดูสไลด์ภาพรวม";
  });
}

function renderKingdomSelection() {
    const kingdomCardsContainer = document.getElementById('kingdomCardsContainer');
    const kingdomSelectionIntro = document.getElementById('kingdomSelectionIntro');
    if (!kingdomCardsContainer || !kingdomSelectionIntro) {
        console.error("Kingdom cards container or intro not found.");
        return;
    }
    kingdomCardsContainer.innerHTML = ''; // Clear previous cards
    kingdomSelectionIntro.innerHTML = window.currentLessonData.content.introductionText; // Load intro text

    const kingdoms = window.currentLessonData.content.kingdoms;
    for (const key in kingdoms) {
        const kingdom = kingdoms[key];
        const cardHtml = `
            <div class="kingdom-card" data-kingdom-id="${key}">
                <span class="kingdom-card-icon">${kingdom.icon}</span>
                <h3 class="text-xl font-bold text-amber-800 mb-2">${kingdom.name}</h3>
                <p class="text-amber-700 text-sm">คลิกเพื่อเรียนรู้เพิ่มเติม</p>
            </div>
        `;
        kingdomCardsContainer.insertAdjacentHTML('beforeend', cardHtml);
    }

    // Add event listeners to the newly created kingdom cards
    kingdomCardsContainer.querySelectorAll('.kingdom-card').forEach(card => {
        card.addEventListener('click', (event) => {
            const kingdomId = event.currentTarget.dataset.kingdomId;
            renderKingdomContent(kingdomId);
        });
    });
}

// Function to render specific kingdom content
function renderKingdomContent(kingdomId) {
    const kingdomData = window.currentLessonData.content.kingdoms[kingdomId];
    if (!kingdomData) {
        console.error("Kingdom data not found for:", kingdomId);
        showMessageBox("ข้อผิดพลาด", "ไม่พบเนื้อหาอาณาจักรนี้");
        return;
    }

    document.getElementById('kingdomContentTitle').textContent = kingdomData.name;
    const lessonContentDiv = document.getElementById('lessonContent');
    lessonContentDiv.innerHTML = kingdomData.text; // Load text content

    // Add video if available
    if (kingdomData.videoUrl) {
        const videoHtml = `
            <div class="video-responsive mt-6">
                <iframe src="${kingdomData.videoUrl}?autoplay=0&controls=1&modestbranding=1&rel=0" 
                        title="วิดีโอบทเรียน ${kingdomData.name}" frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
        `;
        lessonContentDiv.insertAdjacentHTML('beforeend', videoHtml);
    }

    // Add slides if available (uncomment if you have slide URLs)
    // รองรับหลายไฟล์ (slideUrls)
if (kingdomData.slideUrls && Array.isArray(kingdomData.slideUrls)) {
  kingdomData.slideUrls.forEach((slide, index) => {
    const modalId = `slideModal-${kingdomId}-${index}`;
    const modalHtml = `
      <div class="mt-4 text-center">
        <button onclick="document.getElementById('${modalId}').classList.remove('hidden')"
          class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-full shadow-lg transition">
          📄 ${slide.title}
        </button>
      </div>

      <div id="${modalId}" class="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 hidden">
        <div class="bg-white rounded-2xl p-4 w-full max-w-4xl shadow-2xl flex flex-col items-center relative">
          <div class="video-responsive w-full rounded-md overflow-hidden shadow">
            <iframe src="${slide.url}" width="100%" height="100%" frameborder="0" allow="autoplay"></iframe>
          </div>
          <button onclick="document.getElementById('${modalId}').classList.add('hidden')"
            class="mt-6 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-full transition shadow-lg">
            ✖ ปิดสไลด์
          </button>
        </div>
      </div>
    `;
    lessonContentDiv.insertAdjacentHTML('beforeend', modalHtml);
  });
}
// ✅ fallback: รองรับไฟล์เดียวแบบเดิม
else if (kingdomData.slideUrl) {
  const modalId = `slideModal-${kingdomId}`;
  const buttonText = kingdomData.slideTitle || "📄 ดูสไลด์";

  const modalHtml = `
    <div class="mt-4 text-center">
      <button onclick="document.getElementById('${modalId}').classList.remove('hidden')"
        class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-full shadow-lg transition">
        ${buttonText}
      </button>
    </div>

    <div id="${modalId}" class="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 hidden">
      <div class="bg-white rounded-2xl p-4 w-full max-w-4xl shadow-2xl flex flex-col items-center relative">
        <div class="video-responsive w-full rounded-md overflow-hidden shadow">
          <iframe src="${kingdomData.slideUrl}" width="100%" height="100%" frameborder="0" allow="autoplay"></iframe>
        </div>
        <button onclick="document.getElementById('${modalId}').classList.add('hidden')"
          class="mt-6 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-full transition shadow-lg">
          ✖ ปิดสไลด์
        </button>
      </div>
    </div>
  `;
  lessonContentDiv.insertAdjacentHTML('beforeend', modalHtml);
}

    showSection('contentSection'); // Show the content section with kingdom data
}


// Function to fetch and display user scores
async function displayScoreSummary() {
    if (!currentUserId) {
        console.error("User not logged in. Cannot fetch scores.");
        return;
    }
    try {
        const response = await fetch('/api/scores', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        const scores = await response.json();
        const lessonScore = scores.find(s => s.lesson_id === currentLessonId);

        if (lessonScore) {
            document.getElementById('preScoreSummary').textContent = `${lessonScore.pre_score !== null ? lessonScore.pre_score : 0} คะแนน`;
            document.getElementById('postScoreSummary').textContent = `${lessonScore.post_score !== null ? lessonScore.post_score : 0} คะแนน`;
        } else {
            document.getElementById('preScoreSummary').textContent = 'ยังไม่มีคะแนน';
            document.getElementById('postScoreSummary').textContent = 'ยังไม่มีคะแนน';
        }
    } catch (error) {
        console.error("ข้อผิดพลาดในการดึงข้อมูลสรุปคะแนน:", error.message);
        showMessageBox("ข้อผิดพลาด", "ไม่สามารถดึงข้อมูลคะแนนได้: " + error.message);
    }
}


// --- Main Logic on Page Load ---
document.addEventListener('DOMContentLoaded', async () => {
// Debugging line

    // Get lesson ID from URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    currentLessonId = urlParams.get('id');

// Debugging line

    // Get DOM elements for navigation
    const backToHomeBtn = document.getElementById('backToHomeBtn');
    const submitPreTestBtn = document.getElementById('submitPreTestBtn');
    const continueToContentBtn = document.getElementById('continueToContentBtn'); // This button now leads to kingdom selection
    const startTaxonomyLessonBtn = document.getElementById('startTaxonomyLessonBtn'); // New button for Taxonomy Intro
    const backFromTaxonomyIntroToPreTestBtn = document.getElementById('backFromTaxonomyIntroToPreTestBtn'); // New button to go from taxonomy intro back to pre-test
    const backFromKingdomSelectionToTaxonomyIntroBtn = document.getElementById('backFromKingdomSelectionToTaxonomyIntroBtn'); // New button to go from kingdom selection back to taxonomy intro
    const backToKingdomSelectionBtn = document.getElementById('backToKingdomSelectionBtn'); // Static button to go from specific kingdom content back to kingdom selection
    const finishContentBtn = document.getElementById('finishContentBtn'); // This button now leads to post-test from specific kingdom content
    const submitPostTestBtn = document.getElementById('submitPostTestBtn');
    const viewScoresBtn = document.getElementById('viewScoresBtn');
    const returnToHomeFromSummaryBtn = document.getElementById('returnToHomeFromSummaryBtn');


    if (!currentLessonId || !window.lessonsData[currentLessonId]) {
        console.error("Lesson data lookup failed:", currentLessonId, window.lessonsData[currentLessonId]); // Debugging line
        showMessageBox("ข้อผิดพลาด", "บทเรียนนี้ยังไม่ถูกเพิ่มเข้ามา โปรดรอการพัฒนา!", () => {
            window.location.href = "/html/home.html"; // Redirect back if lesson not found
        });
        return;
    }

    // Assign to window.currentLessonData
    window.currentLessonData = window.lessonsData[currentLessonId];
    document.getElementById('lessonTitle').textContent = window.currentLessonData.title;

        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');

        if (token && userStr) {
            const user = JSON.parse(userStr);
            currentUserId = user.id; // Map id to uid equivalent

            // Fetch current user profile after authentication to populate currentUserProfile
            // Note: Since Firestore is being removed, this logic should be updated to fetch from MySQL API.
            // For now, we mock the profile.
            currentUserProfile = {
                fullName: user.username || user.email,
                class: '',
                studentId: null
            };

            await loadLesson(currentLessonId); // Load lesson state after currentUserId and profile are set
        } else {
            currentUserId = null;
            currentUserProfile = {}; // Clear profile if no user

            loadLesson(currentLessonId); // Still load the content, but without user-specific data
        }

    // Event Listeners for navigation and tests
    if (backToHomeBtn) {
        backToHomeBtn.addEventListener('click', () => {
            window.location.href = "/html/home.html";
        });
    }

    if (submitPreTestBtn) {
        submitPreTestBtn.addEventListener('click', async () => {
            // Validate if all questions are answered for pre-test
            const { score, answers } = await checkAnswers(window.currentLessonData.preTest, 'preTestQuestions', 'preTestResult', 'pre');
            if (score === -1) return; // If not all answered, stop here

            preTestScore = score;
            userPreTestAnswers = answers;

            if (currentUserId) {
                await saveScore(currentLessonId, 'pre', preTestScore, userPreTestAnswers);
            }

            const resultDisplay = document.getElementById('preTestResult');
            if (resultDisplay) {
                resultDisplay.textContent = `คะแนนก่อนเรียนของคุณ: ${preTestScore} / ${window.currentLessonData.preTest.length}`;
                resultDisplay.classList.remove('hidden');
            }

            if (continueToContentBtn) continueToContentBtn.classList.remove('hidden');

            showMessageBox("ผลคะแนนก่อนเรียน", `คุณทำได้ ${preTestScore} คะแนน`, () => {
                // After closing message box, advance to lesson content
                if (['taxonomy', 'wave'].includes(currentLessonId)) {
                    showSection('taxonomyIntroSection');
                    document.getElementById('generalIntroTitle').textContent = "ภาพรวมเนื้อหาเรื่องคลื่นกล";
                    document.getElementById('generalIntroContent').innerHTML = window.currentLessonData.content.introductionText;
                    renderGeneralTaxonomyVideos();
                    renderGeneralTaxonomySlides();
                    setupGeneralSlidesToggle();
                } else {
                    showSection('contentSection');
                    renderLessonContent();
                }
            });
            if (submitPreTestBtn) submitPreTestBtn.disabled = true;
        });
    }

    // This button (Continue to Content) now only functions for all lessons to proceed to content/kingdom selection.
    if (continueToContentBtn) {
        continueToContentBtn.addEventListener('click', () => {
            if (['taxonomy', 'wave'].includes(currentLessonId)) {
                showSection('taxonomyIntroSection'); // Go to general intro first for taxonomy/wave
                document.getElementById('generalIntroTitle').textContent = "ภาพรวมเนื้อหาเรื่องคลื่นกล";
                document.getElementById('generalIntroContent').innerHTML = window.currentLessonData.content.introductionText;
                renderGeneralTaxonomyVideos(); // Render general videos for taxonomy intro
                renderGeneralTaxonomySlides();
                setupGeneralSlidesToggle();
            } else {
                showSection('contentSection');
                renderLessonContent();
            }
        });
    }

    // Proceed from general intro directly to post-test
    if (startTaxonomyLessonBtn) {
        startTaxonomyLessonBtn.addEventListener('click', () => {
            showSection('postTestSection');
            renderQuestions(window.currentLessonData.postTest, 'postTestQuestions', 'post');
            if (submitPostTestBtn) submitPostTestBtn.disabled = false;
        });
    }
    
    if (backToPreTestFromTaxonomyIntroBtn) {
        backToPreTestFromTaxonomyIntroBtn.addEventListener('click', () => {
            showSection('preTestSection');
            renderQuestions(window.currentLessonData.preTest, 'preTestQuestions', 'pre', true, userPreTestAnswers);
            if (submitPreTestBtn) submitPreTestBtn.disabled = true;
            if (continueToContentBtn) continueToContentBtn.classList.remove('hidden');
        });
    }

    if (backFromKingdomSelectionToTaxonomyIntroBtn) {

    backFromKingdomSelectionToTaxonomyIntroBtn.addEventListener('click', () => {

        showSection('taxonomyIntroSection');
        document.getElementById('generalIntroTitle').textContent = "ภาพรวมเนื้อหาเรื่องคลื่นกล";
        document.getElementById('generalIntroContent').innerHTML = window.currentLessonData.content.introductionText;
        renderGeneralTaxonomyVideos();
        renderGeneralTaxonomySlides();
        setupGeneralSlidesToggle();
    });
} else {
    console.warn("ไม่พบปุ่ม backFromKingdomSelectionToTaxonomyIntroBtn ใน DOM");
}


    if (backToKingdomSelectionBtn) {
        backToKingdomSelectionBtn.addEventListener('click', () => {
            showSection('kingdomSelectionSection');
            renderKingdomSelection(); // Re-render the kingdom selection cards
        });
    }

    if (finishContentBtn) {
        finishContentBtn.addEventListener('click', () => {
            showSection('postTestSection');
            // Render post-test questions fresh for new attempt
            renderQuestions(window.currentLessonData.postTest, 'postTestQuestions', 'post');
            // Make sure submit button is enabled for a new attempt
            if (submitPostTestBtn) submitPostTestBtn.disabled = false;
        });
    }

    if (submitPostTestBtn) {
        submitPostTestBtn.addEventListener('click', async () => {
            // Validate if all questions are answered for post-test
            const { score, answers } = await checkAnswers(window.currentLessonData.postTest, 'postTestQuestions', 'postTestResult', 'post');
            if (score === -1) return; // If not all answered, stop here

            postTestScore = score;
            userPostTestAnswers = answers;

            if (currentUserId) {
                await saveScore(currentLessonId, 'post', postTestScore, userPostTestAnswers);
            }

            const resultDisplay = document.getElementById('postTestResult');
            if (resultDisplay) {
                resultDisplay.textContent = `คะแนนหลังเรียนของคุณ: ${postTestScore} / ${window.currentLessonData.postTest.length}`;
                resultDisplay.classList.remove('hidden');
            }

            showMessageBox("ผลคะแนนหลังเรียน", `คุณทำได้ ${postTestScore} คะแนน`, () => {
                if (viewScoresBtn) viewScoresBtn.classList.remove('hidden');
            });
            if (submitPostTestBtn) submitPostTestBtn.disabled = true;
        });
    }

    if (viewScoresBtn) {
        viewScoresBtn.addEventListener('click', async () => {
            showSection('scoreSummarySection');
            await displayScoreSummary();
        });
    }

    if (returnToHomeFromSummaryBtn) {
        returnToHomeFromSummaryBtn.addEventListener('click', () => {
            window.location.href = "/html/home.html";
        });
    }
});
    

// Function to render lesson content (text, video, slides) - for non-taxonomy lessons
function renderLessonContent() {
    const lessonContentDiv = document.getElementById('lessonContent');
    lessonContentDiv.innerHTML = ''; // Clear previous content

    // Add text content
    if (window.currentLessonData.content.text) {
        lessonContentDiv.insertAdjacentHTML('beforeend', window.currentLessonData.content.text);
    }

    // Add video if available
    if (window.currentLessonData.content.videoUrl) {
        const videoHtml = `
            <div class="video-responsive mt-6">
                <iframe src="${window.currentLessonData.content.videoUrl}?autoplay=0&controls=1&modestbranding=1&rel=0" 
                        title="วิดีโอบทเรียน" frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
        `;
        lessonContentDiv.insertAdjacentHTML('beforeend', videoHtml);
    }

     if (window.currentLessonData.content.slideUrl) {
         const slideHtml = `
             <div class="mt-6">
                 <iframe src="${window.currentLessonData.content.slideUrl}" 
                         frameborder="0" width="100%" height="400" allowfullscreen="true" mozallowfullscreen="true" webkitallowfullscreen="true"></iframe>
             </div>
         `;
        lessonContentDiv.insertAdjacentHTML('beforeend', slideHtml);
     }
}