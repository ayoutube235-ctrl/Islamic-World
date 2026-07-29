/* ==========================================================================
   السيرفر الرئيسي المستقر الشامل (Express 5 Setup) - منصة العالم الإسلامي
   ========================================================================== */

   const express = require('express');
   const fs = require('fs');
   const cors = require('cors');
   const path = require('path');
   const nodemailer = require('nodemailer');
   
   const app = express();
   const PORT = process.env.PORT || 3000;
   
   const USERS_FILE = path.join(__dirname, 'users.json');
   const VIDEOS_FILE = path.join(__dirname, 'videos.json');
   const PACKAGES_FILE = path.join(__dirname, 'packages.json');
   
   // مخزن مؤقت لحفظ كود الـ OTP لكل إيميل مع وقت الصلاحية (5 دقائق)
   let activeOTPs = {};
   
   // 1. تفعيل الإعدادات الأساسية (Middleware)
   app.use(cors());
   app.use(express.json());
   
   // 2. خدمة وتوصيل ملفات الواجهة (Frontend) تلقائياً
   app.use(express.static(path.join(__dirname, '../frontend')));
   
   // دالة مساعدة لقراءة حسابات المستخدمين من الـ JSON بأمان
   const readUsersFromFile = () => {
       if (!fs.existsSync(USERS_FILE)) {
           fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
           return [];
       }
       const fileData = fs.readFileSync(USERS_FILE, 'utf8');
       return fileData ? JSON.parse(fileData) : [];
   };
   
   // ==========================================================================
   // 🌟 إعداد بريد الـ SMTP لإرسال رسائل الجيميل (Nodemailer Setup)
   // ==========================================================================
   const transporter = nodemailer.createTransport({
       host: 'smtp.gmail.com',
       port: 465,
       secure: true, // استخدام SSL لضمان عدم إغلاق الاتصال
       auth: {
           user: process.env.EMAIL_USER || 'ayoutube235@gmail.com', // البريد الإلكتروني
           pass: process.env.EMAIL_PASS || 'tofoohzeirzbecjf'     // كلمة مرور التطبيق 
       },
       connectionTimeout: 10000, // 10 ثوانٍ كحد أقصى للاتصال
       greetingTimeout: 5000,
       socketTimeout: 15000,
       tls: {
           rejectUnauthorized: false
       }
   });
   
   // اختبار الاتصال بالبريد فور تشغيل السيرفر للتأكد من جاهزيته
   transporter.verify((error, success) => {
       if (error) {
           console.error("❌ خطأ في الاتصال بالبريد الإلكتروني:", error.message);
       } else {
           console.log("✅ تم الاتصال بسيرفر البريد (Gmail SMTP) بنجاح وجاهز للإرسال!");
       }
   });
   
   // ==========================================================================
   // 3. مسارات الـ API لإدارة الحسابات ونظام الـ OTP المتطور
   // ==========================================================================
   
   // أ. مسار إنشاء حساب جديد (Sign Up)
   app.post(['/signup', '/api/signup'], (req, res) => {
       try {
           const { name, email, password } = req.body;
           const users = readUsersFromFile();
   
           if (users.some(u => u.email === email)) {
               return res.status(400).json({ success: false, message: 'هذا البريد الإلكتروني مسجل بالفعل!' });
           }
   
           const newUser = { 
               id: Date.now(), 
               name, 
               email, 
               password,
               religiousData: {
                   streak: 0,
                   lastCompletedDate: null,
                   quranPageTarget: null,
                   challenge30Days: [],
                   dailyHabits: { fajr: false, prayers: false, azkar: false, quran: false },
                   tasbeehCurrent: 0, // 📿 العداد الحالي للسبحة
                   tasbeehTotal: 0    // 📿 العداد الكلي للسبحة
               }
           };
           
           users.push(newUser);
           fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
           
           return res.json({ success: true, message: 'تم إنشاء حسابك بنجاح!' });
       } catch (error) {
           console.error("خطأ في إنشاء الحساب:", error);
           return res.status(500).json({ success: false, message: 'حدث خطأ داخلي في السيرفر' });
       }
   });
   
   // ب. مسار تسجيل الدخول والتحقق (Sign In)
   app.post(['/signin', '/api/signin'], (req, res) => {
       try {
           const { email, password } = req.body;
           const users = readUsersFromFile();
   
           const user = users.find(u => u.email === email && u.password === password);
   
           if (user) {
               return res.json({ success: true, name: user.name, email: user.email, message: 'تم تسجيل الدخول بنجاح!' });
           } else {
               return res.status(400).json({ success: false, message: 'خطأ في البريد الإلكتروني أو كلمة المرور!' });
           }
       } catch (error) {
           console.error("خطأ في تسجيل الدخول:", error);
           return res.status(500).json({ success: false, message: 'حدث خطأ داخلي في السيرفر' });
       }
   });
   
   // جـ. مسار استعادة كلمة المرور - المرحلة 1: توليد وإرسال الـ OTP ببريد إلكتروني مطور
   app.post(['/forgot-password', '/api/forgot-password'], (req, res) => {
       try {
           const { email } = req.body;
           const users = readUsersFromFile();
   
           const user = users.find(u => u.email === email);
           if (!user) {
               return res.status(404).json({ success: false, message: 'هذا البريد الإلكتروني غير مسجل لدينا!' });
           }
   
           // توليد كود عشوائي آمن من 6 أرقام
           const otp = Math.floor(100000 + Math.random() * 900000).toString();
           
           // حفظ الكود بربطه بالإيميل مؤقتاً لمدة 5 دقائق
           activeOTPs[email] = {
               otp: otp,
               expires: Date.now() + 5 * 60 * 1000 
           };
   
           const emailHTML = `
               <!DOCTYPE html>
               <html lang="ar" dir="rtl">
               <head>
                   <meta charset="UTF-8">
                   <style>
                       @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Reem+Kufi:wght@600;700&display=swap');
                   </style>
               </head>
               <body style="margin: 0; padding: 0; background-color: #0b1120; font-family: 'Cairo', Arial, sans-serif; direction: rtl; text-align: right; color: #f8fafc;">
                   <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b1120; padding: 40px 10px;">
                       <tr>
                           <td align="center">
                               <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 550px; background-color: #1e293b; border-radius: 16px; border: 1px solid rgba(212, 175, 55, 0.3); box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5); overflow: hidden;">
                                   <tr>
                                       <td align="center" style="padding: 30px 20px 20px; background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%); border-bottom: 2px solid #d4af37;">
                                           <h1 style="font-family: 'Reem Kufi', sans-serif; color: #d4af37; margin: 0; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
                                               منصة العالم الإسلامي
                                           </h1>
                                           <p style="font-family: 'Cairo', sans-serif; color: #94a3b8; font-size: 13px; margin-top: 5px;">بوابة الأمان وإدارة الحسابات</p>
                                       </td>
                                   </tr>
                                   <tr>
                                       <td style="padding: 30px 25px;">
                                           <p style="font-size: 16px; color: #f1f5f9; margin-top: 0; font-weight: 600;">
                                               السلام عليكم ورحمة الله وبركاته،
                                           </p>
                                           <p style="font-size: 14px; color: #cbd5e1; line-height: 1.7; margin-bottom: 25px;">
                                               لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك. يرجى استخدام رمز التحقق (OTP) أدناه لإكمال العملية:
                                           </p>
                                           <div style="background: rgba(15, 23, 42, 0.8); border: 2px dashed #d4af37; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
                                               <span style="font-family: 'Reem Kufi', monospace; font-size: 34px; font-weight: bold; color: #f59e0b; letter-spacing: 10px; direction: ltr; display: inline-block;">
                                                   ${otp}
                                               </span>
                                           </div>
                                           <p style="color: #ef4444; font-size: 13px; font-weight: 600; text-align: center; margin-top: 15px;">
                                               ⏱️ هذا الرمز صالح لمدة 5 دقائق فقط.
                                           </p>
                                           <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 25px 0;">
                                           <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
                                               إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك إهمال هذه الرسالة وسيظل حسابك أمناً.
                                           </p>
                                       </td>
                                   </tr>
                                   <tr>
                                       <td align="center" style="padding: 20px; background-color: #0f172a; border-top: 1px solid rgba(255,255,255,0.05);">
                                           <p style="font-family: 'Reem Kufi', sans-serif; font-size: 12px; color: #94a3b8; margin: 0 0 8px 0;">
                                               برعاية منصة العالم الإسلامي
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
                   console.error("خطأ أثناء إرسال البريد عبر Nodemailer:", error);
                   return res.status(500).json({ success: false, message: 'فشل في إرسال الرمز للبريد الإلكتروني.' });
               }
               return res.json({ success: true, message: 'تم إرسال كود الـ OTP بنجاح إلى بريدك!' });
           });
   
       } catch (error) {
           console.error("خطأ في مسار استعادة الحساب:", error);
           return res.status(500).json({ success: false, message: 'حدث خطأ داخلي في السيرفر' });
       }
   });
   
   // د. مسار التحقق من صحة كود الـ OTP - المرحلة 2
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
           console.error("خطأ في التحقق من الـ OTP:", error);
           return res.status(500).json({ success: false, message: 'خطأ داخلي في السيرفر' });
       }
   });
   
   // هـ. مسار تحديث وحفظ كلمة المرور الجديدة في الـ JSON - المرحلة 3 والأخيرة
   app.post(['/reset-password', '/api/reset-password'], (req, res) => {
       try {
           const { email, otp, newPassword } = req.body;
           const record = activeOTPs[email];
   
           if (!record || record.otp !== otp) {
               return res.status(401).json({ success: false, message: 'طلب غير مصرح به، يرجى إعادة التحقق من الـ OTP!' });
           }
   
           const users = readUsersFromFile();
           const userIndex = users.findIndex(u => u.email === email);
   
           if (userIndex === -1) {
               return res.status(404).json({ success: false, message: 'المستخدم غير موجود!' });
           }
   
           users[userIndex].password = newPassword;
           fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
   
           delete activeOTPs[email];
   
           return res.json({ success: true, message: 'تم تحديث وحفظ كلمة المرور الجديدة بنجاح!' });
       } catch (error) {
           console.error("خطأ في حفظ كلمة المرور الجديدة:", error);
           return res.status(500).json({ success: false, message: 'حدث خطأ داخلي أثناء حفظ البيانات' });
       }
   });
   
   // ==========================================================================
   // 4. مسارات الـ API لمزامنة بيانات الستريك، السبحة، والالتزام الديني
   // ==========================================================================
   
   app.post(['/get-religious-data', '/api/get-religious-data'], (req, res) => {
       try {
           const { email } = req.body;
           const users = readUsersFromFile();
           const user = users.find(u => u.email === email);
   
           if (!user) {
               return res.status(404).json({ success: false, message: 'المستخدم غير موجود!' });
           }
   
           // إنشاء البيانات الدينية بما فيها السبحة إذا لم تكن موجودة مسبقاً
           if (!user.religiousData) {
               user.religiousData = {
                   streak: 0,
                   lastCompletedDate: null,
                   quranPageTarget: null,
                   challenge30Days: [],
                   dailyHabits: { fajr: false, prayers: false, azkar: false, quran: false },
                   tasbeehCurrent: 0,
                   tasbeehTotal: 0
               };
               fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
           } else {
               // ضمان وجود حقول التسبيح للحسابات القديمة
               if (user.religiousData.tasbeehCurrent === undefined) user.religiousData.tasbeehCurrent = 0;
               if (user.religiousData.tasbeehTotal === undefined) user.religiousData.tasbeehTotal = 0;
           }
   
           return res.json({ success: true, religiousData: user.religiousData });
       } catch (error) {
           console.error("خطأ في جلب البيانات الدينية:", error);
           return res.status(500).json({ success: false, message: 'خطأ داخلي في السيرفر' });
       }
   });
   
   app.post(['/save-religious-data', '/api/save-religious-data'], (req, res) => {
       try {
           const { email, religiousData } = req.body;
           const users = readUsersFromFile();
           const userIndex = users.findIndex(u => u.email === email);
   
           if (userIndex === -1) {
               return res.status(404).json({ success: false, message: 'المستخدم غير موجود!' });
           }
   
           // دمج وحفظ البيانات كاملة
           users[userIndex].religiousData = religiousData;
           fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
           
           return res.json({ success: true, message: 'تم حفظ البيانات بنجاح!' });
       } catch (error) {
           console.error("خطأ في حفظ البيانات الدينية:", error);
           return res.status(500).json({ success: false, message: 'خطأ داخلي في السيرفر' });
       }
   });
   
   // ==========================================================================
   // 5. مسارات جلب وإضافة الفيديوهات والريلز
   // ==========================================================================
   
   app.get(['/videos', '/api/videos'], (req, res) => {
       try {
           if (!fs.existsSync(VIDEOS_FILE)) {
               const defaultStructure = { mainVideos: [], reels: [] };
               fs.writeFileSync(VIDEOS_FILE, JSON.stringify(defaultStructure, null, 2));
               return res.json(defaultStructure);
           }
   
           const fileData = fs.readFileSync(VIDEOS_FILE, 'utf8');
           return res.json(JSON.parse(fileData));
       } catch (error) {
           console.error("خطأ أثناء جلب الفيديوهات:", error);
           return res.status(500).json({ success: false, message: 'خطأ في السيرفر الداخلي' });
       }
   });
   
   app.post(['/videos/add', '/api/videos/add'], (req, res) => {
       try {
           const { type, id, title, description } = req.body;
           
           if (!type || !id || !title) {
               return res.status(400).json({ success: false, message: 'برجاء ملء البيانات الأساسية!' });
           }
   
           if (!fs.existsSync(VIDEOS_FILE)) {
               fs.writeFileSync(VIDEOS_FILE, JSON.stringify({ mainVideos: [], reels: [] }, null, 2));
           }
   
           const fileData = fs.readFileSync(VIDEOS_FILE, 'utf8');
           const videosData = JSON.parse(fileData);
   
           if (!videosData[type]) videosData[type] = [];
   
           videosData[type].push({ 
               id: id.trim(), 
               title: title.trim(), 
               description: description ? description.trim() : "" 
           });
   
           fs.writeFileSync(VIDEOS_FILE, JSON.stringify(videosData, null, 2));
           return res.json({ success: true, message: 'تم إضافة الفيديو بنجاح!' });
       } catch (error) {
           console.error("خطأ في إضافة الفيديو:", error);
           return res.status(500).json({ success: false, message: 'خطأ داخلي في السيرفر' });
       }
   });
   
   // ==========================================================================
   // 6. مسارات جلب باقات تحفيظ القرآن الكريم
   // ==========================================================================
   
   app.get(['/packages', '/api/packages'], (req, res) => {
       try {
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
                       { text: "تصحيح التلاوة وأحكام تجويد مبسطة", available: true },
                       { text: "متابعة عبر تطبيق الواتساب", available: true },
                       { text: "تقارير شهرية مفصلة للأداء", available: false },
                       { text: "إجازة معتمدة بسند متصل", available: false }
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
                       { text: "تعليم التجويد النظري والتطبيقي", available: true },
                       { text: "متابعة أسبوعية وتقارير شهرية للأداء", available: true },
                       { text: "إمكانية اختيار وقت الحصة المناسب", available: true },
                       { text: "إجازة معتمدة بسند متصل", available: false }
                   ]
               },
               {
                   id: "diamond",
                   name: "الباقة الماسية",
                   badge: "الباقة الشاملة",
                   price: 450,
                   currency: "ر.س / شهرياً",
                   features: [
                       { text: "5 حصص أسبوعياً (فردية مكثفة)", available: true },
                       { text: "مدة الحصة 60 دقيقة", available: true },
                       { text: "برنامج مكثف للحفظ والمراجعة الشاملة", available: true },
                       { text: "الإعداد للحصول على الإجازة بالسند المتصل", available: true },
                       { text: "معلمين ومعلمات معتمدين بنخبة عالية", available: true },
                       { text: "مرونة كاملة في تعديل وتأجيل الحصص", available: true }
                   ]
               }
           ];
   
           // القراءة من ملف packages.json إذا كان موجوداً، وإلا إرجاع القيمة الافتراضية
           if (fs.existsSync(PACKAGES_FILE)) {
               const fileData = fs.readFileSync(PACKAGES_FILE, 'utf8');
               return res.json(fileData ? JSON.parse(fileData) : defaultPackages);
           } else {
               fs.writeFileSync(PACKAGES_FILE, JSON.stringify(defaultPackages, null, 2));
               return res.json(defaultPackages);
           }
       } catch (error) {
           console.error("خطأ في جلب باقات تحفيظ القرآن:", error);
           return res.status(500).json({ success: false, message: 'خطأ داخلي في السيرفر' });
       }
   });
   
   // ==========================================================================
   // 7. نظام التوجيه الذكي للملفات
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
   
   // تشغيل السيرفر والاستماع للطلبات
   app.listen(PORT, () => {
       console.log(`\n=============================================================`);
       console.log(`🚀 منصة العالم الإسلامي تعمل بنجاح وبكامل طاقتها الإنتاجية الآمنة`);
       console.log(`🔗 الرابط المباشر للموقع: http://localhost:${PORT}`);
       console.log(`=============================================================\n`);
   });