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
    const dynamicBackButtonsContainer = document.getElementById('dynamicBackButtons');

    // Clear all dynamic back buttons first
    if (dynamicBackButtonsContainer) {
        dynamicBackButtonsContainer.innerHTML = '';
    }

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

                // Add dynamic back buttons based on sectionId
                if (dynamicBackButtonsContainer) {
                    let backButton = null;
                    if (sectionId === 'taxonomyIntroSection') {
                        backButton = createBackButton(
                            'backFromTaxonomyIntroToPreTestBtn',
                            'กลับไปทำแบบทดสอบก่อนเรียน',
                            'M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z',
                            () => {
                                showSection('preTestSection');
                                // Ensure questions are rendered with previous answers and disabled for review
                                renderQuestions(window.currentLessonData.preTest, 'preTestQuestions', 'pre', true, userPreTestAnswers);
                                document.getElementById('submitPreTestBtn').disabled = true; // Keep disabled after review
                                document.getElementById('preTestResult').classList.remove('hidden'); // Ensure result is visible for review
                                document.getElementById('continueToContentBtn').classList.remove('hidden'); // Show continue button
                            }
                        );
                    } else if (sectionId === 'kingdomSelectionSection') {
                        backButton = createBackButton(
                            'backFromKingdomSelectionToTaxonomyIntroBtn',
                            'กลับไปภาพรวมอนุกรมวิธาน',
                            'M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z',
                            () => {
                                showSection('taxonomyIntroSection');
                                document.getElementById('generalIntroTitle').textContent = "ภาพรวมการจำแนกสิ่งมีชีวิต"; // Specific title for this back button
                                document.getElementById('generalIntroContent').innerHTML = window.currentLessonData.content.introductionText;
                                // Re-render general videos if they exist
                                renderGeneralTaxonomyVideos();
                                renderGeneralTaxonomySlides();
                                setupGeneralSlidesToggle();
                            }
                        );
                    }
                    // The 'backToKingdomSelectionBtn' is a static button within the contentSection HTML
                    // and its event listener is attached once on DOMContentLoaded.
                    // No dynamic creation needed here for it.

                    if (backButton) {
                        dynamicBackButtonsContainer.appendChild(backButton);
                    }
                }
            } else {
                section.classList.remove('active');
                section.classList.add('hidden');
            }
        }
    });
}

// Function to create a back button dynamically
function createBackButton(id, text, iconPathD, onClickHandler) {
    const button = document.createElement('button');
    button.id = id;
    button.className = "bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-full transition duration-300 flex items-center mb-2"; // mb-2 for stacking
    button.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="${iconPathD}" clip-rule="evenodd" />
        </svg>
        ${text}
    `;
    button.addEventListener('click', onClickHandler);
    return button;
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
        const isSelectedAndCorrect = userAnswerObj && userAnswerObj.selected === q.answer;
        const selectedOptionText = userAnswerObj ? userAnswerObj.selected : 'ไม่ได้เลือก';
        
        const questionHtml = `
            <div class="question-item" data-question-id="${q.id}">
                <p>${index + 1}. ${q.question}</p>
                <div class="options-group">
                    ${q.options.map((option) => {
                        const isSelected = userAnswerObj && userAnswerObj.selected === option;
                        let labelClass = '';
                        
                        if (showAnswers) {
                            if (option === q.answer) {
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
                    <p><strong>${showAnswers ? (isSelectedAndCorrect ? `<span class="text-green-700">${selectedOptionText} ถูกต้อง!!!</span>` : `<span class="text-red-700">${selectedOptionText} ผิด!!!</span><br><span class="text-blue-700">คำตอบที่ถูกต้องคือ: ${q.answer}</span>`) : ''}</strong><br>คำอธิบาย: ${q.explanation}</p>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', questionHtml);
    });
}


// Function to check answers and calculate score
function checkAnswers(questions, containerId, resultId, testType) { 
    let score = 0;
    const container = document.getElementById(containerId);
    const resultDisplay = document.getElementById(resultId);
    
    if (!container || !resultDisplay) {
        console.error(`ไม่พบคอนเทนเนอร์ ${containerId} หรือ ${resultId} สำหรับตรวจสอบคำตอบ`);
        return { score: 0, answers: {} };
    }

    const currentTestAnswers = {};
    let allAnswered = true; // Flag to check if all questions have been answered

    // First pass: Collect all selected answers and check if all questions are answered
    questions.forEach(q => {
        const questionItem = container.querySelector(`.question-item[data-question-id="${q.id}"]`);
        if (!questionItem) return;

        const selectedOption = questionItem.querySelector(`input[name="${testType}_q${q.id}"]:checked`);
        const selectedValue = selectedOption ? selectedOption.value : null;

        if (selectedValue === null) {
            allAnswered = false; // Set flag to false if any question is not answered
        }
        
        // Store selected value and initial correctness (will be fully determined in second pass)
        currentTestAnswers[q.id] = { selected: selectedValue, correct: false };
    });

    // If not all questions are answered, show message and stop
    if (!allAnswered) {
        showMessageBox("คำเตือน", "กรุณาตอบคำถามให้ครบทุกข้อก่อนส่ง");
        return { score: -1, answers: {} }; // Return -1 to indicate incomplete
    }

    // Second pass: Calculate score, update UI, and store final answers
    questions.forEach(q => {
        const questionItem = container.querySelector(`.question-item[data-question-id="${q.id}"]`);
        if (!questionItem) return;

        const selectedOption = questionItem.querySelector(`input[name="${testType}_q${q.id}"]:checked`);
        const explanationDiv = questionItem.querySelector('.question-explanation');
        const labels = questionItem.querySelectorAll('label');

        // Clear previous highlight classes before re-applying
        labels.forEach(label => {
            label.classList.remove('selected-correct', 'selected-incorrect', 'correct-answer-highlight');
        });

        const selectedValue = selectedOption ? selectedOption.value : null;
        const isCorrect = selectedValue === q.answer; // Determine correctness for this question

        if (isCorrect) {
            score++;
            questionItem.classList.add('correct');
            if (selectedOption) selectedOption.parentElement.classList.add('selected-correct');
        } else {
            questionItem.classList.add('incorrect');
            if (selectedOption) selectedOption.parentElement.classList.add('selected-incorrect');
            // Highlight the correct answer when an incorrect one is selected
            const correctAnswerLabel = questionItem.querySelector(`input[value="${q.answer}"]`);
            if (correctAnswerLabel) {
                correctAnswerLabel.parentElement.classList.add('correct-answer-highlight');
            }
        }

        // Update explanation text with status and display it
        let explanationHeader = '';
        if (isCorrect) {
            explanationHeader = `<span class="text-green-700">${selectedValue} ถูกต้อง!!!</span>`;
        } else {
            explanationHeader = `<span class="text-red-700">${selectedValue || 'ไม่ได้เลือก'} ผิดพลาด!!!</span><br><span class="text-blue-700">คำตอบที่ถูกต้องคือ: ${q.answer}</span>`;
        }
        if (explanationDiv) {
            explanationDiv.innerHTML = `<p><strong>${explanationHeader}</strong><br>คำอธิบาย: ${q.explanation}</p>`;
            explanationDiv.style.display = 'block'; // Show explanation
            explanationDiv.style.backgroundColor = isCorrect ? '#d1fae5' : '#fee2e2'; // Set background color
        }
        
        // Update the correctness in currentTestAnswers for this question
        currentTestAnswers[q.id].correct = isCorrect;
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

// Function to save score to Firestore
async function saveScore(lessonId, testType, score, answers) { // Added 'answers' parameter
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
        console.log(`บันทึกคะแนน ${testType} สำเร็จสำหรับบทเรียน ${lessonId}: ${score}`);

        // ** NEW: Send score data to Google Apps Script (Single Sheet) **
        if (GOOGLE_APPS_SCRIPT_WEB_APP_URL && GOOGLE_APPS_SCRIPT_WEB_APP_URL !== 'https://script.google.com/macros/s/AKfycby3yHKre1_e5YdHLVDx7qvLecVZf7t2mN9UeCTMFTPUbgs5HNd4A69nW1MrFE3QzEkW/exec') {
            // Ensure currentUserProfile is loaded before sending score data
            if (Object.keys(currentUserProfile).length === 0 || currentUserProfile.studentId === undefined || currentUserProfile.studentId === null) {
                // If profile is not fully loaded or studentId is missing, try to fetch it now.
                const response = await fetch('/api/profile', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
                const userProfileSnap = await response.json();
                if (Object.keys(userProfileSnap).length > 0) {
                    currentUserProfile = userProfileSnap;
                    console.log("Refreshed user profile for score sync:", currentUserProfile);
                } else {
                    console.warn("User profile not found for score sync. Cannot send full data to Google Sheet.");
                    showMessageBox("ข้อควรทราบ", "โปรดกรอกข้อมูลโปรไฟล์ของคุณให้ครบถ้วน (โดยเฉพาะ เลขประจำตัว) เพื่อให้ข้อมูลคะแนนปรากฏใน Google Sheet ได้สมบูรณ์");
                    return; // Stop here if studentId cannot be determined
                }
            }

            // Ensure studentId is available and valid before sending
            if (currentUserProfile.studentId === undefined || currentUserProfile.studentId === null) {
                console.error("ไม่สามารถส่งข้อมูลคะแนนไป Google Sheet ได้: ไม่พบ 'เลขประจำตัว' ในโปรไฟล์ผู้ใช้");
                showMessageBox("ข้อผิดพลาด", "ไม่สามารถส่งข้อมูลคะแนนไป Google Sheet ได้ โปรดกรอก 'เลขประจำตัว' ในโปรไฟล์ของคุณก่อน");
                return;
            }

            try {
                const scoreDataToSend = {
                    type: 'score', // Indicate data type
                    data: {
                        uid: currentUserId, // Firebase UID (for internal tracking if needed)
                        lessonId: lessonId, // For internal tracking in Apps Script if needed for future logic
                        studentId: currentUserProfile.studentId, // 'เลขประจำตัว' for Sheets lookup
                        fullName: currentUserProfile.fullName || '',
                        class: currentUserProfile.class || '',
                        preScore: dataToSave.preScore,
                        postScore: dataToSave.postScore
                    }
                };
                console.log("กำลังส่งข้อมูลคะแนนไปยัง Google Apps Script (ชีทเดียว):", scoreDataToSend);
                const response = await fetch(GOOGLE_APPS_SCRIPT_WEB_APP_URL, {
                    method: 'POST',
                    mode: 'cors', // Enable CORS
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(scoreDataToSend)
                });

                const result = await response.json();
                if (result.status === 'success') {
                    console.log("ส่งข้อมูลคะแนนไป Google Sheet สำเร็จ:", result.message);
                } else {
                    console.error("ข้อผิดพลาดในการส่งข้อมูลคะแนนไป Google Sheet:", result.message);
                }
            } catch (appsScriptError) {
                console.error("ข้อผิดพลาดในการเชื่อมต่อ Google Apps Script สำหรับคะแนน:", appsScriptError);
            }
        } else {
            console.warn("ไม่ได้ตั้งค่า GOOGLE_APPS_SCRIPT_WEB_APP_URL หรือยังเป็นค่าเริ่มต้น ไม่สามารถส่งข้อมูลคะแนนไป Google Sheet ได้");
        }

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

    // Fetch current user profile to be ready for sending to Apps Script
    // This is now done once user is authenticated
    if (currentUserId) { // Only fetch if user ID is available
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
            console.log("Loaded current user profile on auth state change:", currentUserProfile);
        } catch (error) {
            console.error("Error loading user profile on auth state change:", error);
            currentUserProfile = {
                fullName: auth.currentUser?.displayName || '',
                class: '',
                studentId: null
            };
        }
    }


    // Always start with Pre-test section, then load state
    showSection('preTestSection');
    loadSavedLessonState(lessonId); // Call a new function to handle loading state
}

// New function to load saved lesson state from Firestore
async function loadSavedLessonState(lessonId) {
    // Only attempt to load if user is logged in
    if (!currentUserId) {
        console.log("No currentUserId, skipping loadSavedLessonState. Rendering fresh pre-test.");
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
            console.log("Saved lesson data found:", savedData);

            // Load pre-test state
            if (savedData.pre_answers) {
                userPreTestAnswers = savedData.pre_answers;
                preTestScore = savedData.pre_score || 0; // Ensure score is loaded too
                console.log("Pre-test answers loaded. Rendering in review mode.");
                // Render pre-test with saved answers and show explanations
                renderQuestions(window.currentLessonData.preTest, 'preTestQuestions', 'pre', true, userPreTestAnswers);
                document.getElementById('preTestResult').textContent = `คุณทำถูก ${preTestScore} ข้อ จาก ${window.currentLessonData.preTest.length} ข้อ`;
                document.getElementById('preTestResult').classList.remove('hidden');
                document.getElementById('continueToContentBtn').classList.remove('hidden'); // Show continue button
                document.getElementById('submitPreTestBtn').disabled = true; // Disable submit button
            } else {
                console.log("No saved pre-test answers for this lesson. Rendering fresh pre-test.");
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
            console.log("No saved lesson data found for this user/lesson. Rendering fresh pre-test.");
            renderQuestions(window.currentLessonData.preTest, 'preTestQuestions', 'pre');
            document.getElementById('continueToContentBtn').classList.add('hidden'); // Hide continue button
            document.getElementById('submitPreTestBtn').disabled = false; // Ensure submit button is enabled
        }
    } catch (error) {
        console.error("ข้อผิดพลาดในการโหลดข้อมูลบทเรียนที่บันทึกไว้:", error.message);
        showMessageBox("ข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลบทเรียนที่บันทึกไว้ได้: " + error.message);
        // Fallback to rendering fresh pre-test if load fails
        renderQuestions(window.currentLessonData.preTest, 'preTestQuestions', 'pre');
        document.getElementById('continueToContentBtn').classList.add('hidden');
        document.getElementById('submitPreTestBtn').disabled = false;
    }
}

// Function to render general taxonomy videos (if they exist)
function renderGeneralTaxonomyVideos() {
    const generalIntroContent = document.getElementById('generalIntroContent');
    if (currentLessonId === 'taxonomy' && window.currentLessonData.content.generalVideoUrls && generalIntroContent) {
        const videoHtmlArray = window.currentLessonData.content.generalVideoUrls.map(url => `
            <div class="video-responsive mt-6">
                <iframe src="${url}?autoplay=0&controls=1&modestbranding=1&rel=0" 
                        title="วิดีโอการจำแนกสิ่งมีชีวิต" frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
        `);
        generalIntroContent.insertAdjacentHTML('beforeend', videoHtmlArray.join(''));
    }
}

function renderGeneralTaxonomySlides() {
    const generalIntroContent = document.getElementById('generalIntroContent'); // The div where general intro content goes
    if (!generalIntroContent) return;

    const slides = window.currentLessonData.content.generalSlideUrls || [];
    if (slides.length === 0) return; // No slides to render

    // Create a container for the slide buttons
    const slidesButtonsContainer = document.createElement('div');
    slidesButtonsContainer.id = 'generalSlidesButtonsContainer';
    slidesButtonsContainer.classList.add('flex', 'flex-wrap', 'gap-4', 'mt-6', 'justify-center'); // Add some styling

    slides.forEach((slide, index) => {
        const modalId = `generalSlideModal-${index}`; // Unique ID for each slide modal
        const buttonText = slide.title || "📄 ดูสไลด์";

        // Create the button for this slide
        const buttonHtml = `
            <button onclick="document.getElementById('${modalId}').classList.remove('hidden')"
                class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-full shadow-lg transition">
                ${buttonText}
            </button>
        `;
        slidesButtonsContainer.insertAdjacentHTML('beforeend', buttonHtml);

        // Create the modal for this slide and append to body (or a suitable top-level element)
        const modalHtml = `
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
        document.body.insertAdjacentHTML('beforeend', modalHtml); // Append modal to body
    });

    generalIntroContent.insertAdjacentHTML('beforeend', slidesButtonsContainer.outerHTML); // Add the container of buttons
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
    console.log("DOMContentLoaded fired."); // Debugging line

    // Get lesson ID from URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    currentLessonId = urlParams.get('id');

    console.log("Current lesson ID from URL:", currentLessonId); // Debugging line

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


    if (!currentLessonId || !lessonsData[currentLessonId]) {
        console.error("Lesson data lookup failed:", currentLessonId, lessonsData[currentLessonId]); // Debugging line
        showMessageBox("ข้อผิดพลาด", "บทเรียนนี้ยังไม่ถูกเพิ่มเข้ามา โปรดรอการพัฒนา!", () => {
            window.location.href = "/html/home.html"; // Redirect back if lesson not found
        });
        return;
    }

    // Assign to window.currentLessonData
    window.currentLessonData = lessonsData[currentLessonId];
    document.getElementById('lessonTitle').textContent = window.currentLessonData.title;

        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');

        if (token && userStr) {
            const user = JSON.parse(userStr);
            currentUserId = user.id; // Map id to uid equivalent
            console.log("ผู้ใช้เข้าสู่ระบบในหน้าบทเรียน:", currentUserId);
            // Fetch current user profile after authentication to populate currentUserProfile
            // Note: Since Firestore is being removed, this logic should be updated to fetch from MySQL API.
            // For now, we mock the profile.
            currentUserProfile = {
                fullName: user.username || user.email,
                class: '',
                studentId: null
            };
            console.log("Loaded current user profile on auth state change:", currentUserProfile);
            await loadLesson(currentLessonId); // Load lesson state after currentUserId and profile are set
        } else {
            currentUserId = null;
            currentUserProfile = {}; // Clear profile if no user
            console.log("ผู้ใช้ออกจากระบบในหน้าบทเรียน คุณสมบัติบางอย่างอาจถูกจำกัด");
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
            if (!currentUserId) {
                showMessageBox("เข้าสู่ระบบ", "กรุณาเข้าสู่ระบบก่อนทำแบบทดสอบ");
                return;
            }
            // Validate if all questions are answered for pre-test
            const { score, answers } = checkAnswers(window.currentLessonData.preTest, 'preTestQuestions', 'preTestResult', 'pre');
            if (score === -1) return; // If not all answered, stop here

            preTestScore = score;
            userPreTestAnswers = answers; // Store answers for review

            await saveScore(currentLessonId, 'pre', preTestScore, userPreTestAnswers); // Pass answers
            showMessageBox("ผลคะแนนก่อนเรียน", `คุณทำได้ ${preTestScore} คะแนน`, () => {
                // After closing message box, show kingdom selection for taxonomy, otherwise show general content
                if (currentLessonId === 'taxonomy') {
                    showSection('taxonomyIntroSection'); // Go to general intro first for taxonomy
                    document.getElementById('generalIntroTitle').textContent = "ภาพรวมการจำแนกสิ่งมีชีวิต";
                    document.getElementById('generalIntroContent').innerHTML = window.currentLessonData.content.introductionText;
                    renderGeneralTaxonomyVideos(); // Render general videos for taxonomy intro
                    renderGeneralTaxonomySlides();
                    setupGeneralSlidesToggle();
                } else {
                    showSection('contentSection');
                    // For non-taxonomy lessons, this means just showing their single content block
                    renderLessonContent(); 
                }
                if (submitPreTestBtn) submitPreTestBtn.disabled = true; // Disable submit button
            });
            
        });
    }

    // This button (Continue to Content) now only functions for all lessons to proceed to content/kingdom selection.
    if (continueToContentBtn) {
        continueToContentBtn.addEventListener('click', () => {
            if (currentLessonId === 'taxonomy') {
                showSection('taxonomyIntroSection'); // Go to general intro first for taxonomy
                document.getElementById('generalIntroTitle').textContent = "ภาพรวมการจำแนกสิ่งมีชีวิต";
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

    // New button for Taxonomy lesson to proceed from general intro to kingdom selection
    if (startTaxonomyLessonBtn) { // Listener always attached, check lessonId inside
        startTaxonomyLessonBtn.addEventListener('click', () => {
            if (currentLessonId === 'taxonomy') {
                showSection('kingdomSelectionSection');
                startTaxonomyLessonBtn.textContent = 'เริ่มศึกษาอาณาจักรทั้ง5'
                renderKingdomSelection();
            }
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
    console.log("ปุ่มย้อนกลับจากอาณาจักร → taxonomy intro ถูกพบ");
    backFromKingdomSelectionToTaxonomyIntroBtn.addEventListener('click', () => {
        console.log("ผู้ใช้กดปุ่มย้อนกลับไป taxonomy intro");
        showSection('taxonomyIntroSection');
        document.getElementById('generalIntroTitle').textContent = "ภาพรวมการจำแนกสิ่งมีชีวิต";
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
            if (!currentUserId) {
                showMessageBox("เข้าสู่ระบบ", "กรุณาเข้าสู่ระบบก่อนทำแบบทดสอบ");
                return;
            }
            // Validate if all questions are answered for post-test
            const { score, answers } = checkAnswers(window.currentLessonData.postTest, 'postTestQuestions', 'postTestResult', 'post');
            if (score === -1) return; // If not all answered, stop here

            postTestScore = score;
            userPostTestAnswers = answers; // Store answers for review
            
            await saveScore(currentLessonId, 'post', postTestScore, userPostTestAnswers); // Pass answers
            showMessageBox("ผลคะแนนหลังเรียน", `คุณทำได้ ${postTestScore} คะแนน`, () => {
                if (viewScoresBtn) viewScoresBtn.classList.remove('hidden'); // Ensure button is visible after message
            });
            if (submitPostTestBtn) submitPostTestBtn.disabled = true; // Disable submit button
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