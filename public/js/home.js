// Global variables provided by the Canvas environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

let currentUser = null; // Store current user object
let currentUserProfile = {}; // Store user profile data
let lessonsData = {}; // Global variable to hold lesson titles for score display

// NEW: Google Apps Script Web App URL
// URL ของ Web App ที่คุณคัดลอกมาจากการ Deploy Google Apps Script
const GOOGLE_APPS_SCRIPT_WEB_APP_URL = 
'https://script.google.com/macros/s/AKfycbymhqfn_R_bpWKRL2ClDKZofpLYJ77p-dBPYYFiwxKY5Ga9eMpkdqmOEQSOPEaT-PFV/exec'; 

// Function to show custom message box
function showMessageBox(title, message, callback = null) {
    const messageBox = document.getElementById("messageBox");
    
    if (messageBox) {
        document.getElementById("messageBoxTitle").textContent = title;
        document.getElementById("messageBoxBody").textContent = message;
        messageBox.style.display = "flex";
        document.getElementById("messageBoxCloseBtn").onclick = () => {
            messageBox.style.display = "none";

            
            if (callback && typeof callback === 'function') {
                callback(); // Execute callback after message box is hidden
            }
        };
    } else {
        console.error("ไม่พบองค์ประกอบกล่องข้อความ! ใช้การบันทึกลงคอนโซลแทน");

        
        if (callback && typeof callback === 'function') {
            callback();
        }
    }
}

// Get DOM elements for profile modal
const profileModal = document.getElementById("profileModal");
const editProfileBtn = document.getElementById("editProfileBtn");
const closeProfileModalBtn = document.getElementById("closeProfileModalBtn");

// New profile input fields
const profileFullNameInput = document.getElementById("profileFullNameInput");
const profileClassInput = document.getElementById("profileClassInput");
const profileNumberInput = document.getElementById("profileNumberInput"); // For "เลขที่"

const profileStudentIdInput = document.getElementById("profileStudentIdInput");


const saveProfileBtn = document.getElementById("saveProfileBtn");


// Function to open profile modal (for editing)
function openProfileModal() {
    
    if (profileModal && profileFullNameInput && profileClassInput && 
    profileNumberInput && profileStudentIdInput && currentUser) {
        fetch('/api/profile', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
        .then(res => res.json())
        .then(userData => {
            if (Object.keys(userData).length > 0) {
                profileFullNameInput.value = userData.fullName || "";
                profileClassInput.value = userData.class || "";
                profileNumberInput.value = userData.number !== undefined && userData.number !== null ? userData.number : "";
                profileStudentIdInput.value = userData.studentId !== undefined && userData.studentId !== null ? userData.studentId : ""; 
            } else {
                profileFullNameInput.value = currentUser.username || currentUser.email || "";
                profileClassInput.value = "";
                profileNumberInput.value = ""; 
                profileStudentIdInput.value = ""; 
            }
            profileModal.style.display = "flex";

        }).catch(error => {
            console.error("ข้อผิดพลาดในการดึงข้อมูลโปรไฟล์เพื่อกรอกล่วงหน้า:", error);
            profileFullNameInput.value = currentUser.username || currentUser.email || "";
            profileClassInput.value = "";
            profileNumberInput.value = ""; 
            profileStudentIdInput.value = ""; 
            profileModal.style.display = "flex";
        });
    } else {
        console.error("ไม่สามารถเปิด Modal โปรไฟล์ได้ ไม่พบองค์ประกอบหรือผู้ใช้ปัจจุบัน");
    }
}

// Function to close profile modal (for editing)
function closeProfileModal() {
    
    if (profileModal) {
        profileModal.style.setProperty('display', 'none', 'important'); 
    } else {
        console.error("ไม่พบองค์ประกอบ Modal โปรไฟล์สำหรับปิด");
    }
}


// --- New: Display Profile Modal Logic ---
const viewProfileBtn = document.getElementById('viewProfileBtn');
const displayProfileModal = document.getElementById('displayProfileModal');
const closeDisplayProfileModalBtn = document.getElementById('closeDisplayProfileModalBtn');

const displayFullName = document.getElementById('displayFullName');
const displayEmail = document.getElementById('displayEmail');
const displayClass = document.getElementById('displayClass');
const displayNumber = document.getElementById('displayNumber');
const displayStudentId = document.getElementById('displayStudentId');
const lessonScoresDisplay = document.getElementById('lessonScoresDisplay');
const noScoresMessage = document.getElementById('noScoresMessage');
const displayCoinAmount = document.getElementById('displayCoinAmount');

// Function to open display profile modal
async function openDisplayProfileModal() {
    
    if (!currentUser) {
        showMessageBox("เข้าสู่ระบบ", "กรุณาเข้าสู่ระบบก่อนดูโปรไฟล์");
        return;
    }

    if (displayProfileModal) {
        // Clear previous content
        lessonScoresDisplay.innerHTML = '';
        noScoresMessage.classList.add('hidden'); // Hide default message

        // Display user profile data
        
        displayFullName.textContent = currentUserProfile.fullName || currentUser.username || currentUser.email || '-';
        displayEmail.textContent = currentUser.email || '-';
        displayClass.textContent = currentUserProfile.class || '-';
        displayNumber.textContent = currentUserProfile.number !== undefined && currentUserProfile.number !== null ? currentUserProfile.number : '-';
        // Display studentId as a string
        displayStudentId.textContent = currentUserProfile.studentId !== undefined && currentUserProfile.studentId !== null ? currentUserProfile.studentId : '-';
        displayCoinAmount.textContent = currentUserProfile.coins || 0;
        // Fetch and display lesson scores
        try {
            const response = await fetch('/api/scores', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
            const scores = await response.json();

            if (!scores || scores.length === 0) {
                noScoresMessage.classList.remove('hidden');
            } else {
                scores.forEach(lessonScore => {
                    const lessonId = lessonScore.lesson_id;
                    const lessonTitle = lessonsData[lessonId] ? lessonsData[lessonId].title : lessonId; 

                    const scoreItem = document.createElement('div');
                    scoreItem.classList.add('lesson-score-item');
                    scoreItem.innerHTML = `
                        <p class="text-sm"><strong>${lessonTitle}:</strong> 
                        Pre-test: <span class="score-value">${lessonScore.pre_score !== null ? lessonScore.pre_score : 'N/A'}</span>, 
                        Post-test: <span class="score-value">${lessonScore.post_score !== null ? lessonScore.post_score : 'N/A'}</span></p>
                    `;
                    lessonScoresDisplay.appendChild(scoreItem);
                });
            }
        } catch (error) {
            console.error("Error fetching lesson scores:", error);
            showMessageBox("ข้อผิดพลาด", "ไม่สามารถดึงคะแนนบทเรียนได้: " + error.message);
            noScoresMessage.classList.remove('hidden'); // Show message if error occurs
            noScoresMessage.textContent = "เกิดข้อผิดพลาดในการโหลดคะแนน";
        }

        displayProfileModal.style.display = 'flex';

    } else {
        console.error("Display Profile Modal element not found.");
    }
}

// Function to close display profile modal
function closeDisplayProfileModal() {
    if (displayProfileModal) {
        displayProfileModal.style.display = 'none';

    }
}

// Event listener for "View Profile" button
if (viewProfileBtn) {
    viewProfileBtn.addEventListener('click', openDisplayProfileModal);
} else {
    console.error("View Profile button (id='viewProfileBtn') not found.");
}

// Event listener for "Close" button in display profile modal
if (closeDisplayProfileModalBtn) {
    closeDisplayProfileModalBtn.addEventListener('click', closeDisplayProfileModal);
} else {
    console.error("Close Display Profile Modal button (id='closeDisplayProfileModalBtn') not found.");
}
// --- End: Display Profile Modal Logic ---


// Handle authentication state changes
document.addEventListener("DOMContentLoaded", async () => {
    const userGreeting = document.getElementById("userGreeting");
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (userGreeting) {
        if (token && userStr) {
            const user = JSON.parse(userStr);
            user.uid = user.id; // map id to uid for compatibility
            currentUser = user; // Set global currentUser

            
            // Fetch current user profile
            try {
                const response = await fetch('/api/profile', { headers: { 'Authorization': `Bearer ${token}` } });
                const userData = await response.json();
                
                if (Object.keys(userData).length > 0) {
                    currentUserProfile = userData; // Set global currentUserProfile
                    userGreeting.textContent = `สวัสดี, ${currentUserProfile.fullName || user.username || user.email}!`;

                } else {
                    userGreeting.textContent = `สวัสดี, ${user.username || user.email || 'ผู้ใช้'}!`;


                    currentUserProfile = { 
                        fullName: user.username || "",
                        class: "",
                        number: null, 
                        studentId: "", 
                    };
                    await fetch('/api/profile', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ fullName: user.username || "" })
                    });

                }
            } catch (dbError) {
                console.error("ข้อผิดพลาดในการดึงหรือสร้างโปรไฟล์ผู้ใช้จากฐานข้อมูล:", dbError.message);
                userGreeting.textContent = `สวัสดี, ${user.username || user.email || 'ผู้ใช้'}!`;
                currentUserProfile = { 
                    fullName: user.username || '',
                    class: '',
                    studentId: '' 
                };
            }
            // Fetch lesson titles (assuming lessonsData is similar to lesson_detail.js structure)
            // This is a placeholder, you might want to load this from a global config or dedicated collection
            // For now, I'll define a sample structure here for home.js context.
            lessonsData = {
                "wave": { title: "คลื่นกล (Mechanical Wave)" },
                "sound": { title: "เสียงและการได้ยิน (Coming Soon)" },
                "light": { title: "แสงเชิงกลศาสตร์ (Coming Soon)" }
            };

        } else {

            window.location.href = "/html/index.html"; 
        }
    } else {
        console.error("ไม่พบองค์ประกอบทักทายผู้ใช้ (id='userGreeting')");
    }
});


// ฟังก์ชันออกจากระบบ
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        try {

            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = "/html/index.html";
        } catch (error) {
            console.error("ข้อผิดพลาดในการออกจากระบบ:", error);
            showMessageBox("ข้อผิดพลาด", "ไม่สามารถออกจากระบบได้: " + error.message);
        }
    });
} else {
    console.error("ไม่พบปุ่มออกจากระบบ (id='logoutBtn')");
}

// Event listener สำหรับปุ่มแก้ไขโปรไฟล์
if (editProfileBtn) {
    editProfileBtn.addEventListener("click", openProfileModal);
} else {
    console.error("ไม่พบปุ่มแก้ไขโปรไฟล์ (id='editProfileBtn')");
}

// Event listener สำหรับปุ่มปิด Modal โปรไฟล์
if (closeProfileModalBtn) {
    closeProfileModalBtn.addEventListener("click", closeProfileModal);
} else {
    console.error("ไม่พบปุ่มปิด Modal โปรไฟล์ (id='closeProfileModalBtn')");
}

// Event listener สำหรับปุ่มบันทึกโปรไฟล์
if (saveProfileBtn) {
    saveProfileBtn.addEventListener("click", async (event) => { 
        event.stopPropagation(); 

        const newFullName = profileFullNameInput.value.trim();
        const newClass = profileClassInput.value.trim();
        const newNumber = profileNumberInput.value.trim(); // Get as string first
        // Get student ID as string
        const newStudentId = profileStudentIdInput.value.trim(); 

        if (!newFullName) {
            showMessageBox("ข้อมูลไม่ถูกต้อง", "กรุณากรอกชื่อ-นามสกุล");
            console.warn("ช่องชื่อ-นามสกุลว่างเปล่า");
            return;
        }
        if (newNumber === "" || isNaN(parseInt(newNumber))) { 
            showMessageBox("ข้อมูลไม่ถูกต้อง", "กรุณากรอกเลขที่เป็นตัวเลขที่ถูกต้อง");
            console.warn("เลขที่ว่างเปล่าหรือไม่ใช่ตัวเลขที่ถูกต้อง");
            return;
        }
        // Validate student ID as a string. Check if it's empty.
        // You might want more complex validation here (e.g., regex for specific formats)
        if (newStudentId === "") { 
            showMessageBox("ข้อมูลไม่ถูกต้อง", "กรุณากรอกเลขประจำตัว");
            console.warn("เลขประจำตัวว่างเปล่า");
            return;
        }


        if (currentUser) {

            try {
                const profileData = { 
                    fullName: newFullName,
                    className: newClass,
                    number: parseInt(newNumber),
                    studentId: newStudentId,
                };

                await fetch('/api/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                    body: JSON.stringify(profileData)
                });


                // Update the greeting on the page immediately
                document.getElementById("userGreeting").textContent = `สวัสดี, ${newFullName}!`;
                
                // Also update local current profile
                currentUserProfile.fullName = newFullName;
                currentUserProfile.class = newClass;
                currentUserProfile.number = parseInt(newNumber);
                currentUserProfile.studentId = newStudentId;



                closeProfileModal(); 
                showMessageBox("บันทึกสำเร็จ", "ข้อมูลโปรไฟล์ของคุณถูกบันทึกเรียบร้อยแล้ว!");
                
            } catch (error) {
                console.error("ข้อผิดพลาดในการอัปเดตโปรไฟล์:", error.message); 
                showMessageBox("ข้อผิดพลาด", "ไม่สามารถบันทึกข้อมูลโปรไฟล์ได้: " + error.message);
                closeProfileModal(); 
            }
        } else {
            showMessageBox("ข้อผิดพลาด", "ไม่พบผู้ใช้งาน กรุณาเข้าสู่ระบบอีกครั้ง");
            console.error("ไม่พบผู้ใช้ปัจจุบันขณะพยายามบันทึกโปรไฟล์");
            closeProfileModal(); 
        }
    });
} else {
    console.error("ไม่พบปุ่มบันทึกโปรไฟล์ (id='saveProfileBtn')");
}

// ตัวจัดการการคลิกการ์ดบทเรียน (ตอนนี้มีแค่อนุกรมวิธาน)
document.querySelectorAll(".lesson-card").forEach(card => {
    card.addEventListener("click", () => {
        const lessonId = card.dataset.lesson;
        window.location.href = `/html/lesson_detail.html?id=${lessonId}`;

    });
});
const dailyQuizBtn = document.getElementById("dailyQuizBtn");
const quizModal = document.getElementById("quizModal");
const closeQuizModalBtn = document.getElementById("closeQuizModalBtn");
const quizQuestionContainer = document.getElementById("quizQuestionContainer");
const quizChoices = document.getElementById("quizChoices");
const submitQuizAnswerBtn = document.getElementById("submitQuizAnswerBtn");

const quizQuestions = [
  {
    question: "สิ่งมีชีวิตถูกจัดหมวดหมู่ในอาณาจักรตามลักษณะใด?",
    choices: ["ลักษณะรูปร่าง", "ชนิดอาหาร", "การสืบพันธุ์", "ลักษณะทางพันธุกรรม"],
    answer: 3
  },
  {
    question: "อาณาจักรใดประกอบด้วยสิ่งมีชีวิตเซลล์เดียวที่ไม่มีนิวเคลียส?",
    choices: ["Fungi", "Protista", "Monera", "Plantae"],
    answer: 2
  },
  {
    question: "สิ่งมีชีวิตในอาณาจักร Plantae มีลักษณะเด่นอย่างไร?",
    choices: ["สร้างอาหารเองได้", "กินสิ่งมีชีวิตอื่น", "เคลื่อนที่ได้", "มีลักษณะเป็นเซลล์เดียว"],
    answer: 0
  }
];

let currentQuestionIndex = 0;
let score = 0;

// แสดงคำถาม
function showQuestion(index) {
  const q = quizQuestions[index];
  quizQuestionContainer.textContent = q.question;
  quizChoices.innerHTML = "";
  q.choices.forEach((choice, i) => {
    const btn = document.createElement("button");
    btn.className = "w-full bg-gray-100 hover:bg-green-100 px-4 py-2 rounded text-left";
    btn.textContent = choice;
    btn.onclick = () => {
      if (i === q.answer) score += 2;
      currentQuestionIndex++;
      if (currentQuestionIndex < quizQuestions.length) {
        showQuestion(currentQuestionIndex);
      } else {
        quizModal.classList.add("hidden");
        showMessageBox("ผลลัพธ์", `คุณได้ ${score} เหรียญจากการตอบถูก ${score / 2} ข้อ`);
        currentQuestionIndex = 0;
        score = 0;
      }
    };
    quizChoices.appendChild(btn);
  });
}

// เปิด/ปิด modal
if (dailyQuizBtn) {
  document.getElementById("dailyQuizBtn").addEventListener("click", generateDailyQuestions);
}

if (closeQuizModalBtn) {
  closeQuizModalBtn.addEventListener("click", () => {
    quizModal.classList.add("hidden");
    currentQuestionIndex = 0;
    score = 0;
  });
}
// === ระบบเหรียญ ===
const COIN_KEY = 'userCoinBalance';
const QUIZ_DONE_KEY = 'quizDoneDate';
const QUIZ_COIN_PER_CORRECT = 2;
const QUIZ_DAILY_LIMIT = 3;

// แสดงจำนวนเหรียญในโปรไฟล์
function updateCoinDisplayUI() {
  const coinDisplaySpan = document.getElementById('coinBalanceDisplay');
  if (!coinDisplaySpan) return;

  if (currentUser) {
    fetch('/api/profile', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
    .then(res => res.json())
    .then(userData => {
      const dbCoin = userData.coins || 0;
      coinDisplaySpan.textContent = dbCoin;
      localStorage.setItem(COIN_KEY, dbCoin); // Sync local with DB
    }).catch(err => {
      console.warn("ไม่สามารถโหลดเหรียญจากฐานข้อมูลได้:", err);
      const fallbackCoin = Number(localStorage.getItem(COIN_KEY) || 0);
      coinDisplaySpan.textContent = fallbackCoin;
    });
  } else {
    const fallbackCoin = Number(localStorage.getItem(COIN_KEY) || 0);
    coinDisplaySpan.textContent = fallbackCoin;
  }
}

// เพิ่มเหรียญ
async function addCoin(amount) {
  let current = Number(localStorage.getItem(COIN_KEY) || 0);
  current += amount;
  localStorage.setItem(COIN_KEY, current);
  updateCoinDisplayUI();
  
  if (currentUser) {
    try {
        await fetch('/api/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify({ coins: current })
        });
    } catch (e) {
        console.error("Failed to sync coins to db", e);
    }
  }
}

// ตรวจสอบว่าเคยทำ quiz วันนี้หรือยัง
function hasDoneQuizToday() {
  const last = localStorage.getItem(QUIZ_DONE_KEY);
  const today = new Date().toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' });
  return last === today;
}

// บันทึกว่าเคยทำแล้ววันนี้
function markQuizDone() {
  const today = new Date().toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' });
  localStorage.setItem(QUIZ_DONE_KEY, today);
}

// แสดง quiz ป๊อปอัป
function openQuizModal() {
  if (hasDoneQuizToday()) {
    alert('คุณทำ Quiz วันนี้แล้ว! กรุณารอวันพรุ่งนี้');
    return;
  }
  document.getElementById('quizModal').classList.remove('hidden');
}

// ปิดป๊อปอัป
function closeQuizModal() {
  document.getElementById('quizModal').classList.add('hidden');
}

// เมื่อทำ quiz เสร็จ
function handleQuizSubmit() {
  let correct = 0;
  const correctAnswers = ['c1', 'b2', 'a3']; // คำตอบที่ถูกต้องตาม id
  correctAnswers.forEach(id => {
    const input = document.getElementById(id);
    if (input && input.checked) correct++;
  });

  const earned = correct * QUIZ_COIN_PER_CORRECT;
  if (earned > 0) addCoin(earned);
  markQuizDone();
  closeQuizModal();
  alert(`คุณตอบถูก ${correct} ข้อ ได้รับ ${earned} เหรียญ`);
}

// === เรียกใช้งานเมื่อโหลดหน้า
window.addEventListener('DOMContentLoaded', () => {
  updateCoinDisplayUI();
  document.getElementById('quizBtn')?.addEventListener('click', openQuizModal);
  document.getElementById('submitQuizBtn')?.addEventListener('click', handleQuizSubmit);
  document.getElementById('closeQuizModalBtn')?.addEventListener('click', closeQuizModal);
});

const physicsQuestions = [
  { question: "คลื่นกลจำเป็นต้องอาศัยสิ่งใดในการเดินทาง?", choices: ["แสง", "ตัวกลาง", "ความร้อน", "สุญญากาศ"], answer: 1 },
  { question: "สมการอัตราเร็วคลื่นคือข้อใด?", choices: ["v = s × t", "v = f / λ", "v = f λ", "v = λ / T^2"], answer: 2 },
  { question: "ข้อใดเป็นคลื่นตามยาว?", choices: ["คลื่นเสียง", "คลื่นแสง", "คลื่นในเส้นเชือก", "คลื่นวิทยุ"], answer: 0 },
  { question: "สันคลื่น (Crest) มีการกระจัดเป็นอย่างไร?", choices: ["ศูนย์", "ติดลบมากที่สุด", "บวกมากที่สุด", "ไม่แน่นอน"], answer: 2 },
  { question: "หน่วยของความถี่ (Frequency) คือข้อใด?", choices: ["วินาที", "เมตร", "เฮิรตซ์ (Hz)", "นิวตัน"], answer: 2 },
  { question: "แอมพลิจูดบ่งบอกถึงสิ่งใดของคลื่น?", choices: ["ความเร็ว", "พลังงาน", "เวลา", "ทิศทาง"], answer: 1 },
  { question: "คลื่นแม่เหล็กไฟฟ้าสามารถเดินทางในสุญญากาศได้หรือไม่?", choices: ["ได้", "ไม่ได้", "ได้เฉพาะคลื่นวิทยุ", "ได้เฉพาะแสงแดด"], answer: 0 },
  { question: "คาบ (T) และความถี่ (f) สัมพันธ์กันตามข้อใด?", choices: ["T = f", "T = 1/f", "T + f = 0", "T = f^2"], answer: 1 },
  { question: "คลื่นความถี่ 5 Hz มีความยาวคลื่น 4 เมตร จะมีความเร็วเท่าใด?", choices: ["1.25 m/s", "9 m/s", "20 m/s", "0.8 m/s"], answer: 2 },
  { question: "เมื่อโยนก้อนหินลงน้ำ อนุภาคของน้ำจะเคลื่อนที่แบบใด?", choices: ["พุ่งไปข้างหน้า", "จมลงก้นสระ", "ฮาร์มอนิกอย่างง่าย (SHM)", "หมุนเป็นวงกลม"], answer: 2 }
];

function generateDailyQuestions() {
  const todayKey = new Date().toLocaleDateString("th-TH");
  const quizStatus = JSON.parse(localStorage.getItem("quizStatus")) || {};
  if (quizStatus[todayKey]?.completed) {
    showMessageBox("ทำแบบทดสอบแล้ว", "คุณได้ทำ Quiz รายวันของวันนี้แล้ว");
    return;
  }

  const shuffled = physicsQuestions.sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 3);
  renderQuizPopup(selected, todayKey);
}

function renderQuizPopup(questions, todayKey) {
  let currentQ = 0;
  let correct = 0;

  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-xl text-center relative">
      <button id="closeQuizPopupBtn" class="absolute top-2 right-3 text-gray-500 hover:text-red-500 text-2xl font-bold">&times;</button>
      <div id="quizContent" class="text-left text-gray-800 mb-4"></div>
      <button id="nextQuizBtn" class="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-full shadow-md transition-transform transform hover:scale-105">ถัดไป</button>
    </div>
  `;
  document.body.appendChild(modal);

  const quizContent = modal.querySelector('#quizContent');
  const nextBtn = modal.querySelector('#nextQuizBtn');

  function showQuestion(index) {
    const q = questions[index];
    quizContent.innerHTML = `
      <h3 class="text-xl font-bold mb-4">${q.question}</h3>
      ${q.choices.map((c, i) =>
        `<label class="block mb-2"><input type="radio" name="quizChoice" value="${i}" class="mr-2"> ${c}</label>`
      ).join('')}
    `;
  }

  nextBtn.onclick = () => {
    const choice = modal.querySelector('input[name="quizChoice"]:checked');
    if (!choice) {
      alert("กรุณาเลือกคำตอบ");
      return;
    }

    if (parseInt(choice.value) === questions[currentQ].answer) correct++;
    currentQ++;

    if (currentQ < questions.length) {
      showQuestion(currentQ);
    } else {
      modal.remove();
      updateCoinAndRecordQuiz(todayKey, correct * 2);
    }
  };

  // ✅ สำคัญ: ต้องแสดงคำถามแรกทันที
  showQuestion(0);

  // ปุ่มปิด
  modal.querySelector('#closeQuizPopupBtn')?.addEventListener('click', () => modal.remove());
}


function updateCoinAndRecordQuiz(dateKey, coinsEarned) {
  const quizStatus = JSON.parse(localStorage.getItem("quizStatus")) || {};
  quizStatus[dateKey] = { completed: true, coinsEarned };
  localStorage.setItem("quizStatus", JSON.stringify(quizStatus));
  const resultModal = document.createElement('div');
resultModal.className = 'fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50';
resultModal.innerHTML = `
  <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-md text-center relative">
    <h2 class="text-2xl font-bold text-green-600 mb-4">สรุปผล Quiz</h2>
    <p class="text-lg text-gray-700 mb-2">คุณตอบถูก ${coinsEarned / 2} ข้อ</p>
    <p class="text-lg text-yellow-600 mb-4">ได้รับ ${coinsEarned} เหรียญ 🪙</p>
    <button id="closeResultModalBtn" class="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-full mt-2">ปิด</button>
  </div>
`;
document.body.appendChild(resultModal);

document.getElementById('closeResultModalBtn').addEventListener('click', () => {
  resultModal.remove();
});


  // อัปเดต localStorage
  let localCoin = Number(localStorage.getItem("userCoinBalance") || 0);
  localCoin += coinsEarned;
  localStorage.setItem("userCoinBalance", localCoin);

  // ✅ อัปเดตผ่าน API Backend (MySQL)
  if (currentUser) {
    fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ coins: localCoin })
    }).then(res => res.json())
    .then(() => {
        updateCoinDisplayUI();
        showMessageBox("สำเร็จ", `คุณตอบถูก ${coinsEarned / 2} ข้อ ได้รับ ${coinsEarned} เหรียญ 🪙`);
    }).catch(err => {
        console.error("ไม่สามารถอัปเดตเหรียญใน MySQL Backend:", err);
    });
  }
}
