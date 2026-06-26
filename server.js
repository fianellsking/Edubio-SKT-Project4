const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const CLIENT_ID = '1031800062796-68s0i81a9h3k83abl7689p466tm7vdf1.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);

const app = express();
const port = process.env.PORT || 3000;

// Function to dynamically load latest lesson data into server memory
function getServerLessonsData() {
    const lessonPath = path.join(__dirname, 'public', 'js', 'lessons_data.js');
    delete require.cache[require.resolve(lessonPath)];
    global.window = {};
    require(lessonPath);
    return global.window.lessonsData || {};
}

// Add headers to fix Google Sign-in Cross-Origin-Opener-Policy error
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    next();
});

app.use(express.json());

// MySQL Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'edubio_user',
    password: process.env.DB_PASSWORD || 'edubio_password',
    database: process.env.DB_NAME || 'edubio',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_sk_thonburi_key';

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token == null) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Forbidden' });
        req.user = user;
        next();
    });
};

// Register API
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!email.endsWith('@sk-thonburi.ac.th')) {
            return res.status(400).json({ error: 'อนุญาตเฉพาะอีเมลโดเมน @sk-thonburi.ac.th เท่านั้น' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
        }
        
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [username, email, hashedPassword]);
        
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login API
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email.endsWith('@sk-thonburi.ac.th')) {
            return res.status(400).json({ error: 'อนุญาตเฉพาะอีเมลโดเมน @sk-thonburi.ac.th เท่านั้น' });
        }

        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }

        const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, email: user.email, username: user.username } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Google Login API
app.post('/api/google-login', async (req, res) => {
    try {
        const { credential } = req.body;
        
        // Verify Google token
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: CLIENT_ID,
        });
        
        const payload = ticket.getPayload();
        const email = payload['email'];
        const name = payload['name'];
        const hd = payload['hd']; // Hosted domain

        // Verify the domain is strictly @sk-thonburi.ac.th
        if (!email.endsWith('@sk-thonburi.ac.th') && hd !== 'sk-thonburi.ac.th') {
            return res.status(403).json({ error: 'อนุญาตเฉพาะอีเมลจากโดเมน @sk-thonburi.ac.th เท่านั้น' });
        }

        // Check if user exists in the database
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        let user;

        if (users.length === 0) {
            // User does not exist, create a new one
            // We use a random password since they login with Google
            const randomPassword = Math.random().toString(36).slice(-10);
            const hashedPassword = await bcrypt.hash(randomPassword, 10);
            
            const [result] = await pool.query('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [name, email, hashedPassword]);
            user = { id: result.insertId, email: email, username: name };
        } else {
            // User exists
            user = users[0];
        }

        // Generate JWT token
        const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, email: user.email, username: user.username } });
        
    } catch (error) {
        console.error("Google verify error:", error);
        res.status(500).json({ error: 'Failed to verify Google token' });
    }
});

// Profile API
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const [profiles] = await pool.query('SELECT * FROM profiles WHERE user_id = ?', [req.user.id]);
        if (profiles.length === 0) {
            return res.json({});
        }
        res.json({
            fullName: profiles[0].full_name,
            class: profiles[0].class,
            number: profiles[0].number,
            studentId: profiles[0].student_id,
            coins: profiles[0].coins
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/profile', authenticateToken, async (req, res) => {
    try {
        const { fullName, className, number, studentId, coins } = req.body;
        
        if (coins !== undefined && (typeof coins !== 'number' || isNaN(coins) || coins < 0 || coins > 9999999)) {
            return res.status(400).json({ error: 'Invalid coins value' });
        }
        if (number !== undefined && number !== null && (isNaN(number) || number < 0 || number > 100)) {
            return res.status(400).json({ error: 'Invalid number value' });
        }
        
        // check if exists
        const [existing] = await pool.query('SELECT * FROM profiles WHERE user_id = ?', [req.user.id]);
        
        if (existing.length > 0) {
            // Update
            let query = 'UPDATE profiles SET ';
            const params = [];
            
            if (fullName !== undefined) { query += 'full_name = ?, '; params.push(fullName); }
            if (className !== undefined) { query += 'class = ?, '; params.push(className); }
            if (number !== undefined) { query += 'number = ?, '; params.push(number); }
            if (studentId !== undefined) { query += 'student_id = ?, '; params.push(studentId); }
            if (coins !== undefined) { query += 'coins = ?, '; params.push(coins); }
            
            // Remove trailing comma and space
            query = query.slice(0, -2);
            query += ' WHERE user_id = ?';
            params.push(req.user.id);
            
            if (params.length > 1) { // Only update if there are fields to update
                await pool.query(query, params);
            }
        } else {
            // Insert
            await pool.query(
                'INSERT INTO profiles (user_id, full_name, class, number, student_id, coins) VALUES (?, ?, ?, ?, ?, ?)',
                [req.user.id, fullName || '', className || '', number || null, studentId || '', coins || 0]
            );
        }
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Scores API
app.get('/api/scores', authenticateToken, async (req, res) => {
    try {
        const [scores] = await pool.query('SELECT lesson_id, pre_score, post_score, pre_answers, post_answers FROM lesson_scores WHERE user_id = ?', [req.user.id]);
        // Parse the JSON strings back into objects for the frontend
        const parsedScores = scores.map(score => ({
            ...score,
            pre_answers: typeof score.pre_answers === 'string' ? JSON.parse(score.pre_answers) : score.pre_answers,
            post_answers: typeof score.post_answers === 'string' ? JSON.parse(score.post_answers) : score.post_answers
        }));
        res.json(parsedScores);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/scores', authenticateToken, async (req, res) => {
    try {
        const { lessonId, testType, score, answers } = req.body;
        if (!lessonId) return res.status(400).json({ error: 'Lesson ID required' });
        if (typeof score !== 'number' || isNaN(score) || score < 0) {
            return res.status(400).json({ error: 'Invalid score value' });
        }
        const latestLessonsData = getServerLessonsData();
        const lesson = latestLessonsData[lessonId];
        if (lesson) {
            const testKey = testType === 'pre' ? 'preTest' : 'postTest';
            const maxScore = lesson[testKey] ? lesson[testKey].length : 100;
            if (score > maxScore) {
                return res.status(400).json({ error: 'Score exceeds maximum allowed questions' });
            }
        }

        const [existing] = await pool.query('SELECT * FROM lesson_scores WHERE user_id = ? AND lesson_id = ?', [req.user.id, lessonId]);

        if (existing.length > 0) {
            if (testType === 'pre') {
                await pool.query('UPDATE lesson_scores SET pre_score = ?, pre_answers = ? WHERE user_id = ? AND lesson_id = ?', [score, JSON.stringify(answers || {}), req.user.id, lessonId]);
            } else if (testType === 'post') {
                let prevAns = existing[0].post_answers;
                if (typeof prevAns === 'string') {
                    try { prevAns = JSON.parse(prevAns); } catch(e) { prevAns = {}; }
                }
                prevAns = prevAns || {};
                const prevAttempts = (existing[0].post_score !== null && existing[0].post_score !== undefined) ? (prevAns._attempts || 1) : 0;
                
                if (prevAttempts >= 2) {
                    return res.status(400).json({ error: 'คุณทำแบบทดสอบหลังเรียนครบกำหนด 2 ครั้งแล้ว' });
                }

                const newAttempts = prevAttempts + 1;
                const oldScore = (existing[0].post_score !== null && existing[0].post_score !== undefined) ? existing[0].post_score : -1;
                const bestScore = Math.max(oldScore, score);

                const finalAnswers = score >= oldScore 
                    ? { ...(answers || {}), _attempts: newAttempts } 
                    : { ...prevAns, _attempts: newAttempts };

                await pool.query('UPDATE lesson_scores SET post_score = ?, post_answers = ? WHERE user_id = ? AND lesson_id = ?', [bestScore, JSON.stringify(finalAnswers), req.user.id, lessonId]);
            }
        } else {
            if (testType === 'pre') {
                await pool.query('INSERT INTO lesson_scores (user_id, lesson_id, pre_score, pre_answers) VALUES (?, ?, ?, ?)', [req.user.id, lessonId, score, JSON.stringify(answers || {})]);
            } else if (testType === 'post') {
                const finalAnswers = { ...(answers || {}), _attempts: 1 };
                await pool.query('INSERT INTO lesson_scores (user_id, lesson_id, post_score, post_answers) VALUES (?, ?, ?, ?)', [req.user.id, lessonId, score, JSON.stringify(finalAnswers)]);
            }
        }
        res.json({ message: 'Score saved successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Secure endpoint to fetch sanitized lesson data (without answers & explanations)
app.get('/api/client-lessons-data.js', (req, res) => {
    const latestLessonsData = getServerLessonsData();
    const clientData = JSON.parse(JSON.stringify(latestLessonsData));
    for (const key in clientData) {
        const lesson = clientData[key];
        if (lesson.preTest) lesson.preTest.forEach(q => { delete q.answer; delete q.explanation; });
        if (lesson.postTest) lesson.postTest.forEach(q => { delete q.answer; delete q.explanation; });
    }
    res.setHeader('Content-Type', 'application/javascript');
    res.send(`window.lessonsData = ${JSON.stringify(clientData)};`);
});

// Block direct static access to raw lessons_data.js
app.get('/js/lessons_data.js', (req, res) => {
    res.status(403).send("Restricted for quiz anti-cheat security.");
});

// Server-side quiz verification endpoint
app.post('/api/check-answers', (req, res) => {
    try {
        const latestLessonsData = getServerLessonsData();
        const { lessonId, testType, userSelections } = req.body;
        if (!lessonId || !testType || !latestLessonsData[lessonId]) {
            return res.status(400).json({ error: 'Invalid submission' });
        }
        const testKey = testType === 'pre' ? 'preTest' : 'postTest';
        const questions = latestLessonsData[lessonId][testKey];
        if (!questions) {
            return res.status(400).json({ error: 'Test not found' });
        }

        let score = 0;
        const answers = {};
        questions.forEach(q => {
            const selected = userSelections ? userSelections[q.id] : null;
            const isCorrect = selected === q.answer;
            if (isCorrect) score++;
            answers[q.id] = {
                selected: selected || null,
                correct: isCorrect,
                correctAnswer: q.answer,
                explanation: q.explanation
            };
        });

        res.json({ score, answers });
    } catch (error) {
        console.error("Error grading quiz:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Secure backend proxy endpoint for Gemini AI Chat (with Key Pool Rotation & Failover)
app.post('/api/chat', async (req, res) => {
    try {
        const { payload, customApiKey } = req.body;
        if (!payload || !payload.contents) {
            return res.status(400).json({ error: 'Invalid chat request' });
        }

        // 1. If user supplied their own personal key, use it directly
        if (customApiKey) {
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${customApiKey}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            return res.status(response.status).json(data);
        }

        // 2. Otherwise, use server default key pool with automatic failover rotation
        const rawKeys = process.env.DEFAULT_GEMINI_API_KEYS || process.env.DEFAULT_GEMINI_API_KEY || "AIzaSyAeduAtMtRHjzM5jmEQRNjYa8ZC7EX5Zho";
        const keyPool = rawKeys.split(',').map(k => k.trim()).filter(Boolean);

        let lastData = null;
        let lastStatus = 500;

        for (const key of keyPool) {
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            lastStatus = response.status;
            lastData = await response.json();

            // If successful (200 OK), return immediately
            if (response.ok) {
                return res.status(200).json(lastData);
            }

            // If quota limit reached (429 Rate Limit), rotate to next backup key in pool
            if (response.status === 429 || (lastData.error && lastData.error.code === 429)) {
                console.warn(`Default key quota exhausted (429). Rotating to next backup key...`);
                continue;
            }

            // For other errors (e.g. 400 invalid prompt), stop retrying
            break;
        }

        res.status(lastStatus).json(lastData);
    } catch (error) {
        console.error("Chat proxy error:", error);
        res.status(500).json({ error: 'Failed to communicate with AI service' });
    }
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Send index.html for any other requests (SPA fallback)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
