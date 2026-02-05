import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    signInAnonymously,
    signInWithCustomToken,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

const firebaseConfig = {
    apiKey: "AIzaSyAkC9lIUXO4LOgpANFcwQ9Mq1-VoM7LM-4",
    authDomain: "edubio-93bd2.firebaseapp.com",
    projectId: "edubio-93bd2",
    storageBucket: "edubio-93bd2.firebasestorage.app",
    messagingSenderId: "852534968721",
    appId: "1:852534968721:web:d785665b7f144244b4da30",
    measurementId: "G-KHFZKE5X78"
};

// Log Firebase config to help debug.
console.log("Firebase config loaded:", firebaseConfig);
if (!firebaseConfig || !firebaseConfig.apiKey) {
    console.error("Firebase config is missing or invalid. Please ensure it's correctly set or provided by the environment.");
    showMessageModal("ข้อผิดพลาดในการตั้งค่า Firebase", "ไม่สามารถเชื่อมต่อกับ Firebase ได้ กรุณาตรวจสอบว่าการตั้งค่า Firebase ของคุณถูกต้อง (API Key หรืออื่นๆ).");
    throw new Error("Firebase configuration is invalid.");
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUserId = null;

// Function to show custom message modal instead of alert()
// Now accepts an optional callback function to execute on modal close
function showMessageModal(title, message, callback = null) {
    const messageModal = document.getElementById("messageModal");
    if (messageModal) {
        document.getElementById("messageModalTitle").textContent = title;
        document.getElementById("messageModalBody").textContent = message;
        messageModal.style.display = "flex";
        document.getElementById("messageModalCloseBtn").onclick = () => {
            messageModal.style.display = "none";
            if (callback && typeof callback === 'function') {
                callback(); // Execute callback after modal is hidden
            }
        };
    } else {
        console.error("Message modal element not found! Fallback to console log.");
        console.log(`${title}: ${message}`); // Log to console if modal not found
        if (callback && typeof callback === 'function') {
            callback(); // Execute callback even if modal isn't found
        }
    }
}

// Handle authentication state changes
// This listener remains important for session persistence and initial page load,
// but for immediate redirection after button click, we'll use the modal callback.
// ✅ แก้ไขใหม่: ตรวจแค่ user และ redirect เฉพาะกรณีไม่ใช่ anonymous
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserId = user.uid;
        console.log("onAuthStateChanged: User is signed in with UID:", user.uid);

        // ตรวจว่า user เป็น anonymous หรือไม่
        if (!user.isAnonymous) {
            // ✅ ตรวจว่ามี profile แล้วหรือยัง
            const userDocRef = doc(db, `artifacts/${appId}/users/${currentUserId}/profiles`, "userProfile");
            try {
                const userDocSnap = await getDoc(userDocRef);
                if (!userDocSnap.exists()) {
                    console.log("User profile does not exist in Firestore. Creating new profile.");
                    await setDoc(userDocRef, {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName || user.email,
                        createdAt: new Date().toISOString()
                    });
                    console.log("User profile created in Firestore.");
                } else {
                    console.log("User profile already exists in Firestore.");
                }
            } catch (firestoreError) {
                console.error("Error accessing/writing user profile to Firestore:", firestoreError.message);
                showMessageModal("ข้อผิดพลาด Firestore", "ไม่สามารถบันทึกข้อมูลผู้ใช้ได้: " + firestoreError.message);
            }

            // ✅ Redirect เฉพาะถ้าไม่อยู่บนหน้า home อยู่แล้ว
            const targetUrl = "home.html";
            if (!window.location.href.includes(targetUrl)) {
                console.log(`Redirecting to ${targetUrl}...`);
                window.location.href = targetUrl;
            } else {
                console.log("Already on home page.");
            }
        } else {
            console.log("User is anonymous, staying on login page.");
        }

    } else {
        currentUserId = null;
        console.log("User is signed out.");
        // ❌ ลบบรรทัด signInAnonymously() ออก เพื่อไม่ auto login
        // ✅ ให้ผู้ใช้คลิก login เองเท่านั้น
    }
});


// Get DOM elements
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const signupModal = document.getElementById("signupModal");
const loginModal = document.getElementById("loginModal");
const closeBtns = document.querySelectorAll(".closeBtn");
const togglePasswordIcons = document.querySelectorAll(".togglePassword");

// Debugging logs to check if elements are found
console.log("Elements found:", { signupBtn, loginBtn, signupModal, loginModal, closeBtns, togglePasswordIcons });

// Open/Close Modals
if (signupBtn && signupModal) {
    signupBtn.onclick = () => {
        console.log("Sign Up button clicked. Displaying signup modal.");
        signupModal.style.display = "flex";
    };
} else {
    console.error("Signup button or modal not found.");
}

if (loginBtn && loginModal) {
    loginBtn.onclick = () => {
        console.log("Log In button clicked. Displaying login modal.");
        loginModal.style.display = "flex";
    };
} else {
    console.error("Login button or modal not found.");
}

closeBtns.forEach(btn => {
    btn.onclick = () => {
        console.log("Close button clicked. Hiding modals.");
        if (signupModal) signupModal.style.display = "none";
        if (loginModal) loginModal.style.display = "none";
    };
});

// Toggle password visibility
togglePasswordIcons.forEach(icon => {
    icon.addEventListener("click", () => {
        const input = icon.previousElementSibling;
        if (input) {
            input.type = input.type === "password" ? "text" : "password";
            icon.textContent = input.type === "password" ? "👁️" : "🙈";
            console.log("Password visibility toggled.");
        } else {
            console.error("Password input not found for toggle icon.");
        }
    });
});

// Sign Up with Email and Password
document.getElementById("signupSubmit")?.addEventListener("click", async () => {
    const username = document.getElementById("signupUsername")?.value.trim();
    const email = document.getElementById("signupEmail")?.value.trim();
    const password = document.getElementById("signupPassword")?.value;
    const confirmPassword = document.getElementById("signupConfirmPassword")?.value;

    if (!username || !email || !password || !confirmPassword) {
        showMessageModal("ข้อมูลไม่ครบถ้วน", "กรุณากรอกข้อมูลให้ครบทุกช่อง");
        return;
    }
    if (password !== confirmPassword) {
        showMessageModal("รหัสผ่านไม่ตรงกัน", "กรุณายืนยันรหัสผ่านให้ตรงกัน");
        return;
    }
    if (password.length < 6) {
        showMessageModal("รหัสผ่านไม่ปลอดภัย", "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
        return;
    }

    try {
        console.log("Attempting to create user with email...");
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Update user profile with username
        await userCredential.user.updateProfile({ displayName: username });
        console.log("User created successfully. Displaying success message and preparing for redirect.");
        // Redirect after showing message and user closes modal
        showMessageModal("สมัครสมาชิกสำเร็จ", "คุณได้สมัครสมาชิกเรียบร้อยแล้ว!", () => {
            window.location.href = "home.html"; // Changed redirection to home.html
        });
        if (signupModal) signupModal.style.display = "none"; // Ensure modal is handled
    } catch (error) {
        console.error("Error during sign up:", error);
        let errorMessage = "เกิดข้อผิดพลาดในการสมัครสมาชิก";
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = "อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น";
                break;
            case 'auth/invalid-email':
                errorMessage = "รูปแบบอีเมลไม่ถูกต้อง";
                break;
            case 'auth/weak-password':
                errorMessage = "รหัสผ่านอ่อนเกินไป ควรมีอย่างน้อย 6 ตัวอักษร";
                break;
            default:
                errorMessage += ": " + error.message;
        }
        showMessageModal("ข้อผิดพลาด", errorMessage);
    }
});

document.getElementById("loginSubmit")?.addEventListener("click", async () => {
    const email = document.getElementById("loginEmail")?.value.trim();
    const password = document.getElementById("loginPassword")?.value;

    if (!email || !password) {
        showMessageModal("ข้อมูลไม่ครบถ้วน", "กรุณากรอกอีเมลและรหัสผ่าน");
        return;
    }

    try {
        console.log("Attempting to sign in with email and password...");
        await signInWithEmailAndPassword(auth, email, password);
        console.log("Signed in successfully. Displaying success message and preparing for redirect.");
        // Redirect after showing message and user closes modal
        showMessageModal("เข้าสู่ระบบสำเร็จ", "คุณเข้าสู่ระบบเรียบร้อยแล้ว!", () => {
            window.location.href = "home.html"; // Changed redirection to home.html
        });
        if (loginModal) loginModal.style.display = "none"; // Ensure modal is handled
    } catch (error) {
        console.error("Error during login:", error);
        let errorMessage = "เกิดข้อผิดพลาดในการเข้าสู่ระบบ";
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                errorMessage = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
                break;
            case 'auth/invalid-email':
                errorMessage = "รูปแบบอีเมลไม่ถูกต้อง";
                break;
            case 'auth/too-many-requests':
                errorMessage = "พยายามเข้าสู่ระบบมากเกินไป กรุณาลองใหม่ภายหลัง";
                break;
            default:
                errorMessage += ": " + error.message;
        }
        showMessageModal("ข้อผิดพลาด", errorMessage);
    }
});

// Log In with Google
document.getElementById("googleLogin")?.addEventListener("click", async () => {
    const provider = new GoogleAuthProvider();
    try {
        console.log("Attempting to sign in with Google...");
        await signInWithPopup(auth, provider);
        console.log("Signed in with Google successfully. Displaying success message and preparing for redirect.");
        // Redirect after showing message and user closes modal
        showMessageModal("เข้าสู่ระบบสำเร็จ", "คุณเข้าสู่ระบบด้วย Google เรียบร้อยแล้ว!", () => {
            window.location.href = "home.html"; // Changed redirection to home.html
        });
        if (loginModal) loginModal.style.display = "none"; // Ensure modal is handled
    } catch (error) {
        console.error("Error during Google login:", error);
        let errorMessage = "เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google";
        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = "การเข้าสู่ระบบด้วย Google ถูกยกเลิก";
        } else {
            errorMessage += ": " + error.message;
        }
        showMessageModal("ข้อผิดพลาด", errorMessage);
    }
});