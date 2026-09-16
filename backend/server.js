const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================================================
// 1. التعامل مع ملف users.json المحلي
// ==========================================================================
const USERS_FILE = path.join(__dirname, 'users.json');

function getUsers() {
    if (!fs.existsSync(USERS_FILE)) {
        try {
            fs.writeFileSync(USERS_FILE, JSON.stringify([]));
        } catch (e) {
            console.log("تعذر إنشاء ملف users.json (قد يكون في بيئة Read-Only):", e.message);
        }
        return [];
    }
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf-8');
        return JSON.parse(data || '[]');
    } catch (err) {
        return [];
    }
}

function saveUsers(users) {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    } catch (e) {
        console.log("تعذر الكتابة في users.json محلياً:", e.message);
    }
}

// ==========================================================================
// 2. تهيئة Firebase Admin SDK (اختياري عند وجود المفاتيح)
// ==========================================================================
let db = null;
let USERS_COLLECTION = null;
let VIDEOS_COLLECTION = null;

if (process.env.FIREBASE_PROJECT_ID) {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY 
                    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
                    : undefined,
            })
        });
    }
    db = admin.firestore();
    USERS_COLLECTION = db.collection('users');
    VIDEOS_COLLECTION = db.collection('videos');
}

// مخزن مؤقت لحفظ كود الـ OTP لكل إيميل مع وقت الصلاحية (5 دقائق)
let activeOTPs = {};

// ==========================================================================
// 3. تفعيل الإعدادات الأساسية والـ Static Files
// ==========================================================================
app.use(cors());
app.use(express.json());

// خدمة وتوصيل ملفات الواجهة (Frontend)
app.use(express.static(path.join(__dirname, '../frontend')));

// ==========================================================================
// 4. إعداد بريد الـ SMTP لإرسال رسائل الـ OTP (Nodemailer Setup)
// ==========================================================================
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER || 'ayoutube235@gmail.com',
        pass: process.env.EMAIL_PASS || 'tofoohzeirzbecjf'
    },
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 15000,
    tls: {
        rejectUnauthorized: false
    }
});

// ==========================================================================
// 5. مسارات إدارة الحسابات (Sign Up / Sign In / Password Reset)
// ==========================================================================

// أ. مسار إنشاء حساب جديد (Sign Up)
app.post(['/signup', '/api/signup'], async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ success: false, message: 'برجاء إدخال جميع البيانات المطلوبة!' });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // 1. التخزين في users.json محلياً
        const localUsers = getUsers();
        const existingLocalUser = localUsers.find(u => u.email === normalizedEmail);

        if (existingLocalUser) {
            return res.status(400).json({ success: false, message: 'هذا البريد الإلكتروني مسجل بالفعل!' });
        }

        const newLocalUser = {
            id: Date.now().toString(),
            name,
            email: normalizedEmail,
            password,
            createdAt: new Date().toISOString(),
            religiousData: {
                streak: 0,
                lastCompletedDate: null,
                quranPageTarget: null,
                challenge30Days: [],
                dailyHabits: { fajr: false, prayers: false, azkar: false, quran: false },
                tasbeehCurrent: 0,
                tasbeehTotal: 0
            }
        };

        localUsers.push(newLocalUser);
        saveUsers(localUsers);

        // 2. التخزين في Firebase (في حال تفعيله)
        if (USERS_COLLECTION) {
            try {
                let userRecord;
                try {
                    userRecord = await admin.auth().createUser({
                        email: normalizedEmail,
                        password: password,
                        displayName: name
                    });
                } catch (e) {
                    // إذا كان موجوداً مسبقاً في Firebase Auth
                }

                await USERS_COLLECTION.doc(normalizedEmail).set({
                    uid: userRecord ? userRecord.uid : Date.now().toString(),
                    name,
                    email: normalizedEmail,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    religiousData: newLocalUser.religiousData
                });
            } catch (fbErr) {
                console.error("خطأ حظر في Firebase أثناء التسجيل:", fbErr.message);
            }
        }

        return res.json({ success: true, message: 'تم إنشاء حسابك وحفظه بنجاح!' });
    } catch (error) {
        console.error("خطأ في إنشاء الحساب:", error);
        return res.status(500).json({ success: false, message: error.message || 'حدث خطأ في السيرفر' });
    }
});

// ب. مسار تسجيل الدخول والتحقق (Sign In)
app.post(['/signin', '/api/signin'], async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'يرجى إدخال البريد الإلكتروني وكلمة المرور!' });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // 1. التحقق من users.json محلياً أولاً
        const localUsers = getUsers();
        const user = localUsers.find(u => u.email === normalizedEmail && u.password === password);

        if (user) {
            return res.json({
                success: true,
                name: user.name,
                email: user.email,
                message: 'تم تسجيل الدخول بنجاح!'
            });
        }

        // 2. التحقق من Firebase API إذا كان مفاتيح البيئة مفعلة
        const firebaseApiKey = process.env.FIREBASE_API_KEY;
        if (firebaseApiKey) {
            const authResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: normalizedEmail,
                    password: password,
                    returnSecureToken: true
                })
            });

            const authData = await authResponse.json();

            if (authResponse.ok && !authData.error && USERS_COLLECTION) {
                const userDoc = await USERS_COLLECTION.doc(normalizedEmail).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    return res.json({
                        success: true,
                        name: userData.name,
                        email: userData.email,
                        message: 'تم تسجيل الدخول بنجاح!'
                    });
                }
            }
        }

        return res.status(400).json({
            success: false,
            message: 'خطأ في البريد الإلكتروني أو كلمة المرور!'
        });

    } catch (error) {
        console.error("خطأ في تسجيل الدخول:", error);
        return res.status(500).json({ success: false, message: 'حدث خطأ داخلي في السيرفر' });
    }
});

// جـ. مسار استعادة كلمة المرور - توليد وإرسال الـ OTP
app.post(['/forgot-password', '/api/forgot-password'], async (req, res) => {
    try {
        const { email } = req.body;
        const normalizedEmail = email.toLowerCase().trim();

        const localUsers = getUsers();
        const userExistsLocal = localUsers.some(u => u.email === normalizedEmail);
        
        let userExistsFB = false;
        if (USERS_COLLECTION) {
            const userDoc = await USERS_COLLECTION.doc(normalizedEmail).get();
            userExistsFB = userDoc.exists;
        }

        if (!userExistsLocal && !userExistsFB) {
            return res.status(404).json({ success: false, message: 'هذا البريد الإلكتروني غير مسجل لدينا!' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        activeOTPs[normalizedEmail] = {
            otp: otp,
            expires: Date.now() + 5 * 60 * 1000
        };

        const emailHTML = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Reem+Kufi:wght@500;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #0b1120; font-family: 'Cairo', Arial, sans-serif; direction: rtl; text-align: right; color: #f8fafc;">

    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 40px 15px; background-color: #0b1120;">
        <tr>
            <td align="center">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #1e293b; border-radius: 20px; border: 1px solid rgba(212, 175, 55, 0.35); overflow: hidden;">
                    <tr>
                        <td align="center" style="padding: 35px 20px 25px 20px; background: linear-gradient(180deg, rgba(212, 175, 55, 0.1) 0%, rgba(30, 41, 59, 0) 100%);">
                            <h1 style="color: #d4af37; margin: 0; font-size: 26px; font-weight: 700;">🕌 منصة العالم الإسلامي</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px;">
                            <h2 style="color: #ffffff; font-size: 20px; margin-top: 0;">السلام عليكم ورحمة الله وبركاته 👋</h2>
                            <p style="font-size: 15px; color: #cbd5e1; line-height: 1.7;">تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك. رمز التحقق الخاص بك هو:</p>

                            <div style="background: rgba(15, 23, 42, 0.85); border: 2px dashed #d4af37; border-radius: 14px; padding: 20px; text-align: center; margin: 20px 0;">
                                <span style="font-size: 36px; font-weight: 800; color: #f59e0b; letter-spacing: 10px; font-family: monospace;">${otp}</span>
                            </div>

                            <p style="color: #fca5a5; font-size: 13px; font-weight: 600;">⏱️ الرمز صالح لمدة 5 دقائق فقط.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

        const mailOptions = {
            from: '"منصة العالم الإسلامي" <ayoutube235@gmail.com>',
            to: normalizedEmail,
            subject: '🔒 رمز التحقق (OTP) - منصة العالم الإسلامي',
            html: emailHTML
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("خطأ أثناء إرسال البريد:", error);
                return res.status(500).json({ success: false, message: 'فشل في إرسال الرمز للبريد الإلكتروني.' });
            }
            return res.json({ success: true, message: 'تم إرسال كود الـ OTP بنجاح إلى بريدك!' });
        });

    } catch (error) {
        console.error("خطأ في مسار استعادة الحساب:", error);
        return res.status(500).json({ success: false, message: 'حدث خطأ داخلي في السيرفر' });
    }
});

// د. التحقق من كود الـ OTP
app.post(['/verify-otp', '/api/verify-otp'], (req, res) => {
    try {
        const { email, otp } = req.body;
        const normalizedEmail = email.toLowerCase().trim();
        const record = activeOTPs[normalizedEmail];

        if (!record) {
            return res.status(400).json({ success: false, message: 'لم يتم طلب رمز تحقق لهذا البريد أو انتهت الجلسة!' });
        }
        if (record.otp !== otp) {
            return res.status(400).json({ success: false, message: 'رمز التحقق (OTP) غير صحيح!' });
        }
        if (Date.now() > record.expires) {
            delete activeOTPs[normalizedEmail];
            return res.status(400).json({ success: false, message: 'رمز التحقق منتهي الصلاحية!' });
        }

        return res.json({ success: true, message: 'تم التحقق من الرمز بنجاح!' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'خطأ داخلي في السيرفر' });
    }
});

// هـ. مسار تحديث كلمة المرور
app.post(['/reset-password', '/api/reset-password'], async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const normalizedEmail = email.toLowerCase().trim();
        const record = activeOTPs[normalizedEmail];

        if (!record || record.otp !== otp) {
            return res.status(401).json({ success: false, message: 'طلب غير مصرح به، يرجى إعادة التحقق!' });
        }

        // تحديث محلي في users.json
        const localUsers = getUsers();
        const localIndex = localUsers.findIndex(u => u.email === normalizedEmail);
        if (localIndex !== -1) {
            localUsers[localIndex].password = newPassword;
            saveUsers(localUsers);
        }

        // تحديث في Firebase Auth إذا أمكن
        if (USERS_COLLECTION) {
            const userDoc = await USERS_COLLECTION.doc(normalizedEmail).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                if (userData.uid) {
                    await admin.auth().updateUser(userData.uid, { password: newPassword });
                }
            }
        }

        delete activeOTPs[normalizedEmail];
        return res.json({ success: true, message: 'تم تحديث كلمة المرور بنجاح!' });
    } catch (error) {
        console.error("خطأ في إعادة تعيين كلمة المرور:", error);
        return res.status(500).json({ success: false, message: 'حدث خطأ أثناء حفظ كلمة المرور الجديدة' });
    }
});

// ==========================================================================
// 6. مسارات جلب وحفظ البيانات الدينية
// ==========================================================================

app.post(['/get-religious-data', '/api/get-religious-data'], async (req, res) => {
    try {
        const { email } = req.body;
        const normalizedEmail = email.toLowerCase().trim();

        const localUsers = getUsers();
        const localUser = localUsers.find(u => u.email === normalizedEmail);

        if (localUser && localUser.religiousData) {
            return res.json({ success: true, religiousData: localUser.religiousData });
        }

        if (USERS_COLLECTION) {
            const userDoc = await USERS_COLLECTION.doc(normalizedEmail).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                return res.json({ success: true, religiousData: userData.religiousData || {} });
            }
        }

        return res.status(404).json({ success: false, message: 'المستخدم غير موجود!' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'خطأ داخلي في السيرفر' });
    }
});

app.post(['/save-religious-data', '/api/save-religious-data'], async (req, res) => {
    try {
        const { email, religiousData } = req.body;
        const normalizedEmail = email.toLowerCase().trim();

        // حفظ محلي في users.json
        const localUsers = getUsers();
        const localIndex = localUsers.findIndex(u => u.email === normalizedEmail);
        if (localIndex !== -1) {
            localUsers[localIndex].religiousData = religiousData;
            saveUsers(localUsers);
        }

        // حفظ في Firebase Firestore
        if (USERS_COLLECTION) {
            await USERS_COLLECTION.doc(normalizedEmail).set({
                religiousData: religiousData
            }, { merge: true });
        }

        return res.json({ success: true, message: 'تم حفظ البيانات بنجاح!' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'خطأ داخلي في السيرفر' });
    }
});

// ==========================================================================
// 7. مسارات الفيديوهات والباكجات
// ==========================================================================

app.get(['/videos', '/api/videos'], async (req, res) => {
    try {
        if (VIDEOS_COLLECTION) {
            const mainSnapshot = await VIDEOS_COLLECTION.doc('main').get();
            if (mainSnapshot.exists) {
                return res.json(mainSnapshot.data());
            }
        }
        return res.json({ mainVideos: [], reels: [] });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'خطأ في جلب الفيديوهات' });
    }
});

app.get(['/packages', '/api/packages'], (req, res) => {
    const defaultPackages = [
        {
            id: "silver",
            name: "الباقة الفضية",
            badge: "الباقة الأساسية",
            price: 150,
            currency: "ر.س / شهرياً",
            features: [
                { text: "حصتان أسبوعياً (فردية)", available: true },
                { text: "مدة الحصة 30 دقيقة", available: true },
                { text: "تصحيح التلاوة وأحكام تجويد مبسطة", available: true }
            ]
        },
        {
            id: "gold",
            name: "الباقة الذهبية",
            badge: "الباقة المميزة",
            price: 280,
            currency: "ر.س / شهرياً",
            popular: true,
            features: [
                { text: "3 حصص أسبوعياً (فردية)", available: true },
                { text: "مدة الحصة 45 دقيقة", available: true },
                { text: "تعليم التجويد النظري والتطبيقي", available: true }
            ]
        }
    ];
    return res.json(defaultPackages);
});

// ==========================================================================
// 8. توجيه الصفحات وتصدير التطبيق لـ Vercel
// ==========================================================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/sign.html'));
});

app.get(['/sign', '/sign.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/sign.html'));
});

app.get(['/dashboard', '/dashboard.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

// التشغيل المحلي فقط
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 السيرفر يعمل ويتحقق من users.json محلياً و Firebase على: http://localhost:${PORT}`);
    });
}

// تصدير للعمل على Vercel Serverless
module.exports = app;
