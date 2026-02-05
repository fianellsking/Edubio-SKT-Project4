import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut,
    updateProfile 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc,
    setDoc, 
    collection, 
    query, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global variables provided by the Canvas environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? 
JSON.parse(__firebase_config) : {};

// TEMPORARY FIX: Hardcoded Firebase Config.
const tempFirebaseConfig = {
    apiKey: "AIzaSyAkC9lIUXO4LOgpANFcwQ9Mq1-VoM7LM-4",
    authDomain: "edubio-93bd2.firebaseapp.com",
    projectId: "edubio-93bd2",
    storageBucket: "edubio-93bd2.firebasestorage.app",
    messagingSenderId: "852534968721",
    appId: "1:852534968721:web:d785665b7f144244b4da30",
    measurementId: "G-KHFZKE5X78"
};

const finalFirebaseConfig = (Object.keys(firebaseConfig).length === 0 && 
firebaseConfig.constructor === Object) ? tempFirebaseConfig : firebaseConfig;

// Initialize Firebase
const app = initializeApp(finalFirebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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
            console.log("กล่องข้อความถูกปิด กำลังดำเนินการ callback หากมีอยู่");
            
            if (callback && typeof callback === 'function') {
                callback(); // Execute callback after message box is hidden
            }
        };
    } else {
        console.error("ไม่พบองค์ประกอบกล่องข้อความ! ใช้การบันทึกลงคอนโซลแทน");
        console.log(`${title}: ${message}`);
        
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
        // Pre-fill with current data from Firestore profile if available
        const userDocRef = doc(db, 
    `artifacts/${appId}/users/${currentUser.uid}/profiles`, "userProfile");
        getDoc(userDocRef).then(docSnap => {
            
            if (docSnap.exists()) {
                const userData = docSnap.data();
                profileFullNameInput.value = userData.fullName || "";
                profileClassInput.value = userData.class || "";
                profileNumberInput.value = userData.number !== undefined && 
    userData.number !== null ? userData.number : "";
                // Do not convert studentId to number here, display as stored
                profileStudentIdInput.value = userData.studentId !== undefined && 
    userData.studentId !== null ? userData.studentId : ""; 
            } else {
                // Fallback to displayName if no full profile exists
                profileFullNameInput.value = currentUser.displayName || "";
                profileClassInput.value = "";
                profileNumberInput.value = ""; // Initialize empty
                profileStudentIdInput.value = ""; // Initialize empty
            }
            profileModal.style.display = "flex";
            console.log("Modal โปรไฟล์ถูกเปิดแล้ว ข้อมูลปัจจุบันถูกกรอกล่วงหน้า");
        }).catch(error => {
            console.error("ข้อผิดพลาดในการดึงข้อมูลโปรไฟล์เพื่อกรอกล่วงหน้า:", error);
            // Fallback to displayName if there's an error fetching
            profileFullNameInput.value = currentUser.displayName || "";
            profileClassInput.value = "";
            profileNumberInput.value = ""; // Initialize empty on error
            profileStudentIdInput.value = ""; // Initialize empty on error
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
        console.log("Modal โปรไฟล์ถูกปิดแล้ว สไตล์การแสดงผลปัจจุบัน:", 
    profileModal.style.display);
    } else {
        console.error("ไม่พบองค์ประกอบ Modal โปรไฟล์สำหรับปิด");
    }
}


// --- New: Display Profile Modal Logic ---
const viewProfileBtn = document.getElementById('viewProfileBtn');
const displayProfileModal = document.getElementById('displayProfileModal');
const closeDisplayProfileModalBtn = document.getElementById('closeDisplayProfileModalBtn');

const displayFullName = document.getElementById('displayFullName');
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
        
        displayFullName.textContent = currentUserProfile.fullName || currentUser.displayName || currentUser.email || '-';
        displayClass.textContent = currentUserProfile.class || '-';
        displayNumber.textContent = currentUserProfile.number !== undefined && currentUserProfile.number !== null ? currentUserProfile.number : '-';
        // Display studentId as a string
        displayStudentId.textContent = currentUserProfile.studentId !== undefined && currentUserProfile.studentId !== null ? currentUserProfile.studentId : '-';
        displayCoinAmount.textContent = currentUserProfile.coins || 0;
        // Fetch and display lesson scores
        try {
            const scoresCollectionRef = collection(db, `artifacts/${appId}/users/${currentUser.uid}/lesson_scores`);
            const q = query(scoresCollectionRef); // No orderBy to avoid index issues
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                noScoresMessage.classList.remove('hidden');
            } else {
                querySnapshot.forEach(docSnap => {
                    const lessonScore = docSnap.data();
                    const lessonId = docSnap.id;
                    const lessonTitle = lessonsData[lessonId] ? lessonsData[lessonId].title : lessonId; // Get title from lessonsData

                    const scoreItem = document.createElement('div');
                    scoreItem.classList.add('lesson-score-item');
                    scoreItem.innerHTML = `
                        <p class="text-sm"><strong>${lessonTitle}:</strong> 
                        Pre-test: <span class="score-value">${lessonScore.preScore !== undefined ? lessonScore.preScore : 'N/A'}</span>, 
                        Post-test: <span class="score-value">${lessonScore.postScore !== undefined ? lessonScore.postScore : 'N/A'}</span></p>
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
        console.log("Display Profile Modal opened.");
    } else {
        console.error("Display Profile Modal element not found.");
    }
}

// Function to close display profile modal
function closeDisplayProfileModal() {
    if (displayProfileModal) {
        displayProfileModal.style.display = 'none';
        console.log("Display Profile Modal closed.");
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
onAuthStateChanged(auth, async (user) => {
    const userGreeting = document.getElementById("userGreeting");
    
    if (userGreeting) {
        
        if (user) {
            currentUser = user; // Set global currentUser
            console.log("onAuthStateChanged: ผู้ใช้เข้าสู่ระบบด้วย UID:", user.uid);
            
            // Fetch current user profile
            const userDocRef = doc(db, 
    `artifacts/${appId}/users/${user.uid}/profiles`, "userProfile");
            try {
                const userDocSnap = await getDoc(userDocRef);
                
                if (userDocSnap.exists()) {
                    currentUserProfile = userDocSnap.data(); // Set global currentUserProfile
                    userGreeting.textContent = `สวัสดี, ${currentUserProfile.fullName || 
    user.displayName || user.email}!`;
                    console.log("ชื่อผู้ใช้ถูกอัปเดตจาก Firestore:", 
    userGreeting.textContent);
                } else {
                    userGreeting.textContent = `สวัสดี, ${user.displayName || 
    user.email || 'ผู้ใช้'}!`;
                    console.log("ชื่อผู้ใช้ถูกอัปเดตจาก Auth หรือค่าเริ่มต้น:", 
    userGreeting.textContent);

                    currentUserProfile = { // Initialize global profile for new user
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName || user.email,
                        fullName: user.displayName || "",
                        class: "",
                        number: null, // Initialize number as null
                        studentId: "", // Initialize studentId as empty string
                        createdAt: new Date().toISOString()
                    };
                    await setDoc(userDocRef, currentUserProfile, { merge: true });
                    console.log("โปรไฟล์ผู้ใช้ใหม่ถูกสร้างขึ้นใน Firestore เนื่องจากไม่มีอยู่");
                }
            } catch (firestoreError) {
                console.error("ข้อผิดพลาดในการดึงหรือสร้างโปรไฟล์ผู้ใช้จาก Firestore:", 
    firestoreError.message);
                userGreeting.textContent = `สวัสดี, ${user.displayName || user.email 
    || 'ผู้ใช้'}!`;
                currentUserProfile = { // Fallback if Firestore access fails
                    fullName: user.displayName || '',
                    class: '',
                    studentId: '' // Fallback for studentId as empty string
                };
            }
            // Fetch lesson titles (assuming lessonsData is similar to lesson_detail.js structure)
            // This is a placeholder, you might want to load this from a global config or dedicated collection
            // For now, I'll define a sample structure here for home.js context.
            lessonsData = {
                "taxonomy": { title: "อนุกรมวิธาน" },
                "endocrine-system": { title: "ระบบต่อมไร้ท่อ" },
                "genetics": { title: "พันธุศาสตร์" },
                "ecology": { title: "นิเวศวิทยา" },
                "cell-biology": { title: "ชีววิทยาของเซลล์" },
                "human-anatomy": { title: "กายวิภาคศาสตร์มนุษย์" }
                // Add more lesson IDs and titles as needed
            };

        } else {
            console.log("ผู้ใช้ออกจากระบบแล้ว กำลังเปลี่ยนเส้นทางไปยัง index.html...");
            window.location.href = "index.html"; 
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
            console.log("กำลังพยายามออกจากระบบ...");
            await signOut(auth);
            showMessageBox("ออกจากระบบ", "คุณได้ออกจากระบบเรียบร้อยแล้ว");
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
        console.log("ปุ่มบันทึกโปรไฟล์ถูกคลิกแล้ว");
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
            console.log("ตรวจพบผู้ใช้ปัจจุบัน กำลังพยายามอัปเดตโปรไฟล์...");
            try {
                // 1. Update display name in Firebase Authentication (optional, but good for consistency)
                await updateProfile(currentUser, { displayName: newFullName });
                console.log("โปรไฟล์ Firebase Auth ถูกอัปเดตด้วยชื่อ-นามสกุลใหม่:", newFullName);

                // 2. Update user profile in Firestore
                const userDocRef = doc(db, `artifacts/${appId}/users/${currentUser.uid}/profiles`, "userProfile");
                const profileData = { 
                    fullName: newFullName,
                    class: newClass,
                    number: parseInt(newNumber), // Keep as number
                    studentId: newStudentId, // Save as string
                    lastUpdated: new Date().toISOString()
                };
                await setDoc(userDocRef, profileData, { merge: true }); 
                console.log("โปรไฟล์ผู้ใช้ Firestore ถูกอัปเดต/สร้างด้วยข้อมูลใหม่");

                // 3. NEW: Send profile data to Google Apps Script (Single Sheet)
                if (GOOGLE_APPS_SCRIPT_WEB_APP_URL) {
    try {
    const formData = new FormData();
    formData.append('studentId', profileData.studentId);
    formData.append('fullName', profileData.fullName);
    formData.append('class', profileData.class);
    formData.append('number', profileData.number);

    // NEW: ดึงคะแนนจาก Firestore แล้วเพิ่มลงใน formData
    const scoresCollectionRef = collection(db, `artifacts/${appId}/users/${currentUser.uid}/lesson_scores`);
    const querySnapshot = await getDocs(scoresCollectionRef);

    querySnapshot.forEach(docSnap => {
        const lessonId = docSnap.id;
        const lessonScore = docSnap.data();
        
        formData.append(`${lessonId}_pre`, lessonScore.preScore ?? '');
        formData.append(`${lessonId}_post`, lessonScore.postScore ?? '');
    });

    console.log("กำลังส่งข้อมูลโปรไฟล์และคะแนนไปยัง Google Apps Script:", profileData);

    const response = await fetch(GOOGLE_APPS_SCRIPT_WEB_APP_URL, {
        method: 'POST',
        body: formData
    });

    const resultText = await response.text();
    console.log("ผลลัพธ์จาก Google Apps Script:", resultText);

} catch (appsScriptError) {
    console.error("ข้อผิดพลาดในการเชื่อมต่อ Google Apps Script สำหรับโปรไฟล์:", appsScriptError);
}
} else {
    console.warn("ไม่ได้ตั้งค่า GOOGLE_APPS_SCRIPT_WEB_APP_URL หรือยังเป็นค่าเริ่มต้น ไม่สามารถส่งข้อมูลโปรไฟล์ไป Google Sheet ได้");
}

                // Update the greeting on the page immediately
                document.getElementById("userGreeting").textContent = `สวัสดี, ${newFullName}!`;
                console.log("คำทักทายผู้ใช้บนหน้าถูกอัปเดตแล้ว");

                closeProfileModal(); 
                showMessageBox("บันทึกสำเร็จ", "ข้อมูลโปรไฟล์ของคุณถูกบันทึกเรียบร้อยแล้ว!");
                
            } catch (error) {
                console.error("ข้อผิดพลาดในการอัปเดตโปรไฟล์ใน Firebase Auth หรือ Firestore:", error.message); 
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
        window.location.href = `lesson_detail.html?id=${lessonId}`;
        console.log(`กำลังเปลี่ยนเส้นทางไปยังบทเรียน: ${lessonId}`);
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
    const userDocRef = doc(db, `artifacts/${appId}/users/${currentUser.uid}/profiles`, "userProfile");
    getDoc(userDocRef).then(docSnap => {
      const firestoreCoin = docSnap.data()?.coins || 0;
      coinDisplaySpan.textContent = firestoreCoin;
    }).catch(err => {
      console.warn("ไม่สามารถโหลดเหรียญจาก Firestore ได้:", err);
      const fallbackCoin = Number(localStorage.getItem("userCoinBalance") || 0);
      coinDisplaySpan.textContent = fallbackCoin;
    });
  } else {
    const fallbackCoin = Number(localStorage.getItem("userCoinBalance") || 0);
    coinDisplaySpan.textContent = fallbackCoin;
  }
}


// เพิ่มเหรียญ
function addCoin(amount) {
  let current = Number(localStorage.getItem(COIN_KEY) || 0);
  current += amount;
  localStorage.setItem(COIN_KEY, current);
  updateCoinDisplayUI();
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

const taxonomyQuestions = [
  { question: "สิ่งมีชีวิตในโดเมน Archaea มีลักษณะอย่างไร?", choices: ["ยูคาริโอต", "โปรคาริโอต", "ไม่มีนิวเคลียส", "มีผนังเซลล์เซลลูโลส"], answer: 1 },
  { question: "อาณาจักรใดที่มีทั้งโปรคาริโอตและยูคาริโอต?", choices: ["Animalia", "Monela", "Fungi", "Plantae","ไม่มีคำตอบ"], answer: 4 },
  { question: "ระบบการจัดจำแนกสิ่งมีชีวิตที่ใช้ชื่อวิทยาศาสตร์เรียกว่าอะไร?", choices: ["Binomial nomenclature", "Phylum sorting", "Biocode", "Kingdom grouping"], answer: 0 },
  { question: "ข้อใดต่อไปนี้ไม่ใช่กลุ่มของสัตว์มีกระดูกสันหลัง (Vertebrates)?", choices: ["สัตว์เลื้อยคลาน", "สัตว์ปีก", "สัตว์ครึ่งบกครึ่งน้ำ", "แมลง"], answer: 3 },
  { question: "สิ่งมีชีวิตใน Phylum Nematoda มีลักษณะอย่างไร?", choices: ["ลำตัวแบน", "ลำตัวกลมเรียวยาว", "มีขาเป็นข้อปล้อง", "ลำตัวแบ่งเป็นปล้องชัดเจน"], answer: 1 },
  { question: "สัตว์ในกลุ่ม Mammalia มีลักษณะเด่นอะไร?", choices: ["มีเปลือกแข็งหุ้มตัว", "มีขนปกคลุมและเลี้ยงลูกด้วยนม", "หายใจด้วยเหงือก", "ตัวเย็นเลือดเย็น"], answer: 1 },
  { question: "ข้อใดคือการนำหลัก Taxonomy ไปใช้ในชีวิตจริง?", choices: ["การตั้งชื่อเล่นสัตว์เลี้ยง", "การจำแนกเชื้อโรคเพื่อรักษาโรค", "การเลือกซื้อพันธุ์ไม้ประดับ", "การออกแบบเครื่องมือทางการแพทย์"], answer: 1 },
  { question: "Phylum Chordata ประกอบด้วยลักษณะสำคัญข้อใด?", choices: ["มีเส้นประสาทด้านท้อง", "มีแกนสันหลังหรือ notochord", "มีหนามที่ผิวหนัง", "มีเปลือกแข็งหุ้มตัว"], answer: 1 },
  { question: "สัตว์ในกลุ่ม Amphibia มีลักษณะใด?", choices: ["อยู่เฉพาะในน้ำ", "มีขนปกคลุม", "มีชีวิตทั้งในน้ำและบนบก", "มีเปลือกแข็ง"], answer: 2 },
  { question: "ข้อใดคือลักษณะเด่นของสัตว์ใน Phylum Arthropoda?", choices: ["ลำตัวแบ่งเป็นส่วนชัดเจน ขาเป็นข้อปล้อง", "ไม่มีเปลือกแข็ง", "ลำตัวกลมเรียวยาว", "ไม่มีตา"], answer: 0 },
  { question: "สิ่งมีชีวิตใดจัดอยู่ใน Kingdom Protista?", choices: ["ไวรัส", "แพลงก์ตอนพืช", "เห็ดรา", "แบคทีเรีย"], answer: 1 },
  { question: "ชื่อวิทยาศาสตร์ต้องเขียนอย่างไรตามหลักสากล?", choices: ["ตัวแรกพิมพ์เล็ก ตัวที่สองพิมพ์ใหญ่", "ทั้งสองคำพิมพ์ใหญ่", "ตัวแรกขึ้นต้นพิมพ์ใหญ่ ตัวที่สองพิมพ์เล็ก", "เขียนคำเดียว"], answer: 2 },
  { question: "สัตว์ใน Phylum Platyhelminthes มีลักษณะเด่นข้อใด?", choices: ["ลำตัวกลมเรียวยาว", "ลำตัวแบนปากเดียวไม่มีช่องว่างในลำตัว", "มีขาเป็นข้อปล้อง", "มีเปลือกแข็ง"], answer: 1 },
  { question: "ตัวอย่างของสัตว์ใน Phylum Annelida ได้แก่ข้อใด?", choices: ["แมงมุม", "กุ้ง", "ไส้เดือนดิน", "ดาวทะเล"], answer: 2 },
  { question: "ข้อใดเป็นสิ่งมีชีวิตใน Kingdom Fungi?", choices: ["ยีสต์", "อะมีบา", "แบคทีเรีย", "แพลงก์ตอน"], answer: 0 },
  { question: "สิ่งมีชีวิตกลุ่มใดมีผนังเซลล์ประกอบด้วยไคติน (Chitin)?", choices: ["พืช", "เห็ดรา", "แบคทีเรีย", "สัตว์"], answer: 1 },
  { question: "สิ่งมีชีวิตใน Phylum Cnidaria มีตัวอย่างใด?", choices: ["ปะการัง", "แมงป่อง", "หอยทาก", "ผึ้ง"], answer: 0 },
  { question: "ข้อใดต่อไปนี้ไม่ใช่สิ่งมีชีวิตที่จัดอยู่ใน Phylum Mollusca?", choices: ["หอย", "ปลาหมึก", "ปลิงทะเล", "หอยทาก"], answer: 2 },
  { question: "Kingdom Plantae มีลักษณะสำคัญข้อใด?", choices: ["เคลื่อนไหวได้อย่างอิสระ", "สร้างอาหารเองโดยสังเคราะห์แสง", "ไม่มีผนังเซลล์", "กินสิ่งมีชีวิตอื่นเป็นอาหาร"], answer: 1 },
  { question: "Phylum Arthropoda แบ่งออกเป็นกี่กลุ่มหลัก?", choices: ["2", "3", "4", "5"], answer: 3 },
  { question: "ข้อใดเป็นตัวอย่างของสัตว์ไม่มีกระดูกสันหลัง?", choices: ["ปลา", "มนุษย์", "หมึก", "นก"], answer: 2 },
  { question: "Phylum Echinodermata มีระบบการเคลื่อนที่พิเศษที่เรียกว่าอะไร?", choices: ["ระบบท่อน้ำ (Water vascular system)", "กล้ามเนื้อโครงสร้างแข็ง", "ขาเป็นข้อปล้อง", "ขนปกคลุม"], answer: 0 },
  { question: "สัตว์ใน Phylum Porifera มีลักษณะเด่นอะไร?", choices: ["ไม่มีรูพรุน", "มีเนื้อเยื่อแท้จริง", "มีรูพรุนและไม่มีอวัยวะแท้จริง", "มีสมองขนาดใหญ่"], answer: 2 },
  { question: "ข้อใดต่อไปนี้จัดเป็น Vertebrates?", choices: ["แมงป่อง", "ปลาดุก", "ดาวทะเล", "เห็ด"], answer: 1 },
  { question: "ลักษณะเด่นของ Phylum Chordata คืออะไร?", choices: ["มีสมองใหญ่", "มีแกนสันหลังหรือ notochord ในบางช่วงของชีวิต", "มีขาเป็นข้อปล้อง", "มีเปลือกแข็ง"], answer: 1 },
  { question: "ข้อใดคือชื่อวิทยาศาสตร์ของมนุษย์?", choices: ["Pan troglodytes", "Homo erectus", "Homo sapiens", "Australopithecus afarensis"], answer: 2 },
  { question: "สัตว์เลือดอุ่นมีอยู่ในกลุ่มใดบ้าง?", choices: ["สัตว์ครึ่งบกครึ่งน้ำและสัตว์เลื้อยคลาน", "สัตว์ปีกและสัตว์เลี้ยงลูกด้วยนม", "สัตว์เลื้อยคลานและปลา", "สัตว์ครึ่งบกครึ่งน้ำและปลา"], answer: 1 },
  { question: "ข้อใดคือสิ่งมีชีวิตใน Phylum Chordata ที่อาศัยอยู่ในน้ำตลอดชีวิต?", choices: ["ปลาวาฬ", "แมงกะพรุน", "ปลาแซลมอน", "ปะการัง"], answer: 2 },
  { question: "สิ่งมีชีวิตกลุ่มใดสร้างอาหารเองไม่ได้?", choices: ["พืช", "โปรติสต์", "สัตว์", "สาหร่าย"], answer: 2 },
  { question: "ข้อใดต่อไปนี้อยู่ในอาณาจักร Monera?", choices: ["รา", "แบคทีเรีย", "อะมีบา", "เห็ด"], answer: 1 },
  { question: "ข้อใดคือลักษณะสำคัญของสัตว์ใน Phylum Platyhelminthes?", choices: ["มีร่างกายแบนเรียบ", "มีเปลือกแข็ง", "มีขนปกคลุม", "มีระบบท่อน้ำ"], answer: 0 },
  { question: "Kingdom Protista ประกอบด้วยสิ่งมีชีวิตลักษณะใด?", choices: ["หลายเซลล์ที่ซับซ้อน", "เซลล์เดียวหรือกลุ่มเซลล์ง่ายๆ ส่วนใหญ่มีนิวเคลียส", "เซลล์ไม่มีนิวเคลียส", "เฉพาะสิ่งมีชีวิตที่สังเคราะห์แสง"], answer: 1 },
  { question: "ข้อใดไม่เกี่ยวข้องกับระบบการจัดจำแนกสิ่งมีชีวิต?", choices: ["การตั้งชื่อวิทยาศาสตร์", "การศึกษาความสัมพันธ์ทางวิวัฒนาการ", "การวาดภาพประกอบ", "การแบ่งกลุ่มตามโครงสร้าง"], answer: 2 }
];

function generateDailyQuestions() {
  const todayKey = new Date().toLocaleDateString("th-TH");
  const quizStatus = JSON.parse(localStorage.getItem("quizStatus")) || {};
  if (quizStatus[todayKey]?.completed) {
    showMessageBox("ทำแบบทดสอบแล้ว", "คุณได้ทำ Quiz รายวันของวันนี้แล้ว");
    return;
  }

  const shuffled = taxonomyQuestions.sort(() => 0.5 - Math.random());
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

  // ✅ อัปเดต Firestore (เพื่อให้ข้อมูลตรงกับโปรไฟล์)
  if (currentUser) {
    const userDocRef = doc(db, `artifacts/${appId}/users/${currentUser.uid}/profiles`, "userProfile");
    getDoc(userDocRef).then(docSnap => {
      const firestoreCoin = docSnap.data()?.coins || 0;
      return setDoc(userDocRef, { coins: firestoreCoin + coinsEarned }, { merge: true });
    }).then(() => {
      updateCoinDisplayUI();
      showMessageBox("สำเร็จ", `คุณตอบถูก ${coinsEarned / 2} ข้อ ได้รับ ${coinsEarned} เหรียญ 🪙`);
    }).catch(err => {
      console.error("ไม่สามารถอัปเดตเหรียญใน Firestore:", err);
    });
  }
}
