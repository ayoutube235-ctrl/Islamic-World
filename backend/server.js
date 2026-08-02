const express = require('express');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================================================
// 1. تهيئة Firebase Admin SDK
// ==========================================================================
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

const db = admin.firestore();
const USERS_COLLECTION = db.collection('users');
const VIDEOS_COLLECTION = db.collection('videos');

// مخزن مؤقت لحفظ كود الـ OTP لكل إيميل مع وقت الصلاحية (5 دقائق)
let activeOTPs = {};

// ==========================================================================
// 2. تفعيل الإعدادات الأساسية والـ Static Files
// ==========================================================================
app.use(cors());
app.use(express.json());

// خدمة وتوصيل ملفات الواجهة (Frontend)
app.use(express.static(path.join(__dirname, '../frontend')));

// ==========================================================================
// 3. إعداد بريد الـ SMTP لإرسال رسائل الـ OTP (Nodemailer Setup)
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
// 4. مسارات إدارة الحسابات (Sign Up / Sign In / Password Reset) بـ Firebase
// ==========================================================================

// أ. مسار إنشاء حساب جديد (Sign Up)
app.post(['/signup', '/api/signup'], async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ success: false, message: 'برجاء إدخال جميع البيانات المطلوبة!' });
        }

        // فحص وجود المستخدم مسبقاً في Firestore
        const userDoc = await USERS_COLLECTION.doc(email).get();
        if (userDoc.exists) {
            return res.status(400).json({ success: false, message: 'هذا البريد الإلكتروني مسجل بالفعل!' });
        }

        // إنشاء المستخدم في Firebase Authentication
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: name
        });

        const initialUserData = {
            uid: userRecord.uid,
            name,
            email,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
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

        // حفظ بيانات المستخدم في Firestore
        await USERS_COLLECTION.doc(email).set(initialUserData);

        return res.json({ success: true, message: 'تم إنشاء حسابك بنجاح في Firebase!' });
    } catch (error) {
        console.error("خطأ في إنشاء الحساب:", error);
        return res.status(500).json({ success: false, message: error.message || 'حدث خطأ في السيرفر' });
    }
});

// ب. مسار تسجيل الدخول والتحقق (Sign In) - [تم التحديث والربط مع Firebase Auth API]
app.post(['/signin', '/api/signin'], async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. التحقق من وجود الإيميل وكلمة المرور في الطلب
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'يرجى إدخال البريد الإلكتروني وكلمة المرور!' });
        }

        // 2. التحقق من صحة كلمة المرور والبريد عبر Firebase REST API
        const firebaseApiKey = process.env.FIREBASE_API_KEY;

        if (firebaseApiKey) {
            const authResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    returnSecureToken: true
                })
            });

            const authData = await authResponse.json();

            // إذا كان البريد أو كلمة المرور خاطئة في Firebase Auth
            if (!authResponse.ok || authData.error) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'خطأ في البريد الإلكتروني أو كلمة المرور!' 
                });
            }
        }

        // 3. جلب بيانات المستخدم من Firestore
        const userDoc = await USERS_COLLECTION.doc(email).get();

        if (!userDoc.exists) {
            return res.status(400).json({ success: false, message: 'خطأ في البريد الإلكتروني أو كلمة المرور!' });
        }

        const userData = userDoc.data();
        return res.json({ 
            success: true, 
            name: userData.name, 
            email: userData.email, 
            message: 'تم تسجيل الدخول بنجاح!' 
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

        const userDoc = await USERS_COLLECTION.doc(email).get();
        if (!userDoc.exists) {
            return res.status(404).json({ success: false, message: 'هذا البريد الإلكتروني غير مسجل لدينا!' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        activeOTPs[email] = {
            otp: otp,
            expires: Date.now() + 5 * 60 * 1000
        };

        const emailHTML = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- استدعاء خطوط الهوية البصرية -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Reem+Kufi:wght@500;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #0b1120; font-family: 'Cairo', Arial, sans-serif; direction: rtl; text-align: right; color: #f8fafc; -webkit-font-smoothing: antialiased;">

    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 40px 15px; background-color: #0b1120;">
        <tr>
            <td align="center">
                <!-- الكارت الرئيسي -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #1e293b; border-radius: 20px; border: 1px solid rgba(212, 175, 55, 0.35); overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);">
                    
                    <!-- الهيدر واللوجو -->
                    <tr>
                        <td align="center" style="padding: 35px 20px 25px 20px; background: linear-gradient(180deg, rgba(212, 175, 55, 0.1) 0%, rgba(30, 41, 59, 0) 100%); border-bottom: 1px solid rgba(212, 175, 55, 0.2);">
                            <h1 style="color: #d4af37; font-family: 'Reem Kufi', 'Cairo', Arial, sans-serif; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 0.5px;">
                                🕌 منصة العالم الإسلامي
                            </h1>
                        </td>
                    </tr>

                    <!-- المحتوى الرئيسي -->
                    <tr>
                        <td style="padding: 30px 30px 20px 30px;">
                            <h2 style="color: #ffffff; font-size: 20px; margin-top: 0; margin-bottom: 12px; font-weight: 700;">
                                السلام عليكم ورحمة الله وبركاته 👋
                            </h2>
                            <p style="font-size: 15px; color: #cbd5e1; line-height: 1.7; margin: 0 0 20px 0;">
                                تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك. يرجى استخدام رمز التحقق (OTP) التالي لإكمال العملية:
                            </p>

                            <!-- صندوق رمز التحقق -->
                            <div style="background: rgba(15, 23, 42, 0.85); border: 2px dashed #d4af37; border-radius: 14px; padding: 22px 10px; text-align: center; margin: 25px 0; box-shadow: inset 0 2px 8px rgba(0,0,0,0.4);">
                                <span style="font-size: 36px; font-weight: 800; color: #f59e0b; letter-spacing: 12px; font-family: monospace; display: inline-block; padding-right: 12px;">${otp}</span>
                            </div>

                            <!-- التنبيه بالوقت -->
                            <div style="background-color: rgba(239, 68, 68, 0.1); border-right: 4px solid #ef4444; padding: 12px 15px; border-radius: 6px; margin-bottom: 25px;">
                                <p style="color: #fca5a5; font-size: 13px; margin: 0; font-weight: 600;">
                                    ⏱️ الرمز صالح لمدة 5 دقائق فقط.
                                </p>
                            </div>

                            <p style="font-size: 13px; color: #94a3b8; line-height: 1.6; margin: 0;">
                                إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد الإلكتروني بأمان وسيبقى حسابك آمنًا.
                            </p>
                        </td>
                    </tr>

                    <!-- الفوتر ورعاية UX -->
                    <tr>
                        <td align="center" style="padding: 25px 30px; background-color: #0f172a; border-top: 1px solid rgba(255, 255, 255, 0.05);">
                            <!-- قسم الرعاية برعاية UX -->
                            <table border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 15px;">
                                <tr>
                                    <td align="center" style="font-size: 12px; color: #94a3b8; padding-bottom: 8px;">
                                        برعاية
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center">
                                        <img src="https://github.com/ayoutube235-ctrl/Islamic-World/main/frontend/imgs/the-ux-logo.png" alt="UX Logo" style="max-height: 35px; width: auto; display: block; opacity: 0.9;">
                                    </td>
                                </tr>
                            </table>

                            <div style="height: 1px; background-color: rgba(255, 255, 255, 0.1); width: 80%; margin: 15px auto;"></div>

                            <p style="font-size: 12px; color: #64748b; margin: 0; line-height: 1.5;">
                                جميع الحقوق محفوظة &copy; 2026 | <strong>منصة العالم الإسلامي</strong>
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>

</body>
</html>
        `;

        const mailOptions = {
            from: '"منصة العالم الإسلامي" <ayoutube235@gmail.com>',
            to: email,
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
        const record = activeOTPs[email];

        if (!record) {
            return res.status(400).json({ success: false, message: 'لم يتم طلب رمز تحقق لهذا البريد أو انتهت الجلسة!' });
        }
        if (record.otp !== otp) {
            return res.status(400).json({ success: false, message: 'رمز التحقق (OTP) غير صحيح!' });
        }
        if (Date.now() > record.expires) {
            delete activeOTPs[email];
            return res.status(400).json({ success: false, message: 'رمز التحقق منتهي الصلاحية!' });
        }

        return res.json({ success: true, message: 'تم التحقق من الرمز بنجاح!' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'خطأ داخلي في السيرفر' });
    }
});

// هـ. مسار تحديث كلمة المرور في Firebase Auth
app.post(['/reset-password', '/api/reset-password'], async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const record = activeOTPs[email];

        if (!record || record.otp !== otp) {
            return res.status(401).json({ success: false, message: 'طلب غير مصرح به، يرجى إعادة التحقق!' });
        }

        const userDoc = await USERS_COLLECTION.doc(email).get();
        if (!userDoc.exists) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود!' });
        }

        const userData = userDoc.data();
        
        // تحديث كلمة المرور في Firebase Authentication
        await admin.auth().updateUser(userData.uid, {
            password: newPassword
        });

        delete activeOTPs[email];
        return res.json({ success: true, message: 'تم تحديث كلمة المرور بنجاح في Firebase!' });
    } catch (error) {
        console.error("خطأ في إعادة تعيين كلمة المرور:", error);
        return res.status(500).json({ success: false, message: 'حدث خطأ أثناء حفظ كلمة المرور الجديدة' });
    }
});

// ==========================================================================
// 5. مسارات جلب وحفظ البيانات الدينية في Firebase Firestore
// ==========================================================================

app.post(['/get-religious-data', '/api/get-religious-data'], async (req, res) => {
    try {
        const { email } = req.body;
        const userDoc = await USERS_COLLECTION.doc(email).get();

        if (!userDoc.exists) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود!' });
        }

        const userData = userDoc.data();
        let religiousData = userData.religiousData || {
            streak: 0,
            lastCompletedDate: null,
            quranPageTarget: null,
            challenge30Days: [],
            dailyHabits: { fajr: false, prayers: false, azkar: false, quran: false },
            tasbeehCurrent: 0,
            tasbeehTotal: 0
        };

        return res.json({ success: true, religiousData });
    } catch (error) {
        console.error("خطأ في جلب البيانات الدينية:", error);
        return res.status(500).json({ success: false, message: 'خطأ داخلي في السيرفر' });
    }
});

app.post(['/save-religious-data', '/api/save-religious-data'], async (req, res) => {
    try {
        const { email, religiousData } = req.body;

        await USERS_COLLECTION.doc(email).set({
            religiousData: religiousData
        }, { merge: true });

        return res.json({ success: true, message: 'تم حفظ البيانات بنجاح في الفايربيز!' });
    } catch (error) {
        console.error("خطأ في حفظ البيانات الدينية:", error);
        return res.status(500).json({ success: false, message: 'خطأ داخلي في السيرفر' });
    }
});

// ==========================================================================
// 6. مسارات الفيديوهات والباكجات
// ==========================================================================

app.get(['/videos', '/api/videos'], async (req, res) => {
    try {
        const mainSnapshot = await VIDEOS_COLLECTION.doc('main').get();
        if (!mainSnapshot.exists) {
            return res.json({ mainVideos: [], reels: [] });
        }
        return res.json(mainSnapshot.data());
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
// 7. توجيه الصفحات وتصدير التطبيق لـ Vercel
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
        console.log(`🚀 السيرفر يعمل على: http://localhost:${PORT}`);
    });
}

// تصدير للعمل على Vercel Serverless
module.exports = app;
