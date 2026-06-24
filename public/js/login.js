// Custom message modal instead of alert()
function showMessageModal(title, message, callback = null) {
    const messageModal = document.getElementById("messageModal");
    if (messageModal) {
        document.getElementById("messageModalTitle").textContent = title;
        document.getElementById("messageModalBody").textContent = message;
        messageModal.style.display = "flex";
        document.getElementById("messageModalCloseBtn").onclick = () => {
            messageModal.style.display = "none";
            if (callback && typeof callback === 'function') {
                callback();
            }
        };
    }
}

// Check if user is already logged in
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token) {
        // Redirect if already logged in
        const targetUrl = "/html/home.html";
        if (!window.location.href.includes(targetUrl)) {
            window.location.href = targetUrl;
        }
    }
});

// Handle Google Login Response
window.handleCredentialResponse = async (response) => {
    try {
        const res = await fetch('/api/google-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.credential })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || "เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google");
        }

        // Save token and user info
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        showMessageModal("เข้าสู่ระบบสำเร็จ", "คุณเข้าสู่ระบบด้วย Google เรียบร้อยแล้ว!", () => {
            window.location.href = "/html/home.html";
        });
    } catch (error) {
        showMessageModal("ข้อผิดพลาด", error.message);
    }
};
