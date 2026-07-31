const express = require('express');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================================================
// 1. تهيئة Firebase Admin SDK (بديل الـ JSON)
// ==========================================================================
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
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

// ب. مسار تسجيل الدخول والتحقق (Sign In)
app.post(['/signin', '/api/signin'], async (req, res) => {
    try {
        const { email } = req.body;

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
            <head><meta charset="UTF-8"></head>
            <body style="margin: 0; padding: 0; background-color: #0b1120; font-family: Arial, sans-serif; direction: rtl; text-align: right; color: #f8fafc;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 40px 10px;">
                    <tr>
                        <td align="center">
                            <table width="100%" style="max-width: 550px; background-color: #1e293b; border-radius: 16px; border: 1px solid rgba(212, 175, 55, 0.3); overflow: hidden;">
                                <tr>
                                    <td align="center" style="padding: 30px 20px; border-bottom: 2px solid #d4af37;">
                                        <h1 style="color: #d4af37; margin: 0; font-size: 28px;">منصة العالم الإسلامي</h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 30px 25px;">
                                        <p style="font-size: 16px; color: #f1f5f9;">السلام عليكم ورحمة الله وبركاته،</p>
                                        <p style="font-size: 14px; color: #cbd5e1;">رمز التحقق الخاصة بك لإعادة تعيين كلمة المرور هو:</p>
                                        <div style="background: rgba(15, 23, 42, 0.8); border: 2px dashed #d4af37; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
                                            <span style="font-size: 34px; font-weight: bold; color: #f59e0b; letter-spacing: 10px;">${otp}</span>
                                        </div>
                                        <p style="color: #ef4444; font-size: 13px; text-align: center;">⏱️ هذا الرمز صالح لمدة 5 دقائق فقط.</p>
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
