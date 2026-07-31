/* ==========================================================================
   ملف التحكم البرمجي لصفحة الدخول وشبكة الإشعارات (المطور الشامل)
   منصة العالم الإسلامي - متوافق مع Firebase & Vercel
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    const BACKEND_URL = window.location.origin;

    console.log("🚀 تم تحميل نظام التحكم والإشعارات بنجاح، رابط الباك آند:", BACKEND_URL);

    // ==========================================================================
    // 1. نظام الإشعارات المحسّنة والمحمية مع زر إغلاق (X)
    // ==========================================================================
    function showNotification(message, type = "success", duration = 3500) {
        let container = document.getElementById("toast-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "toast-container";
            Object.assign(container.style, {
                position: "fixed",
                bottom: "20px",
                left: "20px",
                zIndex: "9999",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                maxWidth: "calc(100vw - 40px)",
                pointerEvents: "none"
            });
            document.body.appendChild(container);
        }

        const toast = document.createElement("div");

        const config = {
            success: {
                bg: "linear-gradient(135deg, #10b981, #059669)",
                icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
            },
            error: {
                bg: "linear-gradient(135deg, #ef4444, #dc2626)",
                icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`
            },
            offline: {
                bg: "linear-gradient(135deg, #1f2937, #111827)",
                icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M1 1l22 22"></path><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path><path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>`
            }
        };

        const currentConfig = config[type] || config.success;

        const iconSpan = document.createElement("span");
        Object.assign(iconSpan.style, {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: "0"
        });
        iconSpan.innerHTML = currentConfig.icon;

        const textSpan = document.createElement("span");
        textSpan.textContent = message;
        textSpan.style.flexGrow = "1";

        const closeBtn = document.createElement("button");
        closeBtn.innerHTML = "&times;";
        Object.assign(closeBtn.style, {
            background: "rgba(255, 255, 255, 0.15)",
            border: "none",
            color: "#ffffff",
            fontSize: "18px",
            fontWeight: "bold",
            cursor: "pointer",
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: "10px",
            padding: "0",
            lineHeight: "1",
            flexShrink: "0",
            transition: "all 0.2s ease",
            outline: "none"
        });

        closeBtn.onmouseover = () => {
            closeBtn.style.background = "rgba(255, 255, 255, 0.3)";
            closeBtn.style.transform = "scale(1.1)";
        };
        closeBtn.onmouseout = () => {
            closeBtn.style.background = "rgba(255, 255, 255, 0.15)";
            closeBtn.style.transform = "scale(1)";
        };

        toast.appendChild(iconSpan);
        toast.appendChild(textSpan);
        toast.appendChild(closeBtn);

        Object.assign(toast.style, {
            padding: "12px 16px",
            borderRadius: "12px",
            color: "#ffffff",
            fontFamily: "'Cairo', 'Reem Kufi', sans-serif",
            fontSize: "14px",
            direction: "rtl",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
            background: currentConfig.bg,
            backdropFilter: "blur(8px)",
            opacity: "0",
            transform: "translateY(20px) scale(0.95)",
            transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
            pointerEvents: "auto"
        });

        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.opacity = "1";
            toast.style.transform = "translateY(0) scale(1)";
        });

        let hideTimeout = null;

        function hideToast() {
            if (hideTimeout) clearTimeout(hideTimeout);
            toast.style.opacity = "0";
            toast.style.transform = "translateY(-10px) scale(0.95)";
            setTimeout(() => {
                if (toast.parentNode) toast.remove();
            }, 400);
        }

        closeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            hideToast();
        });

        if (duration > 0) {
            hideTimeout = setTimeout(hideToast, duration);
        }

        return { element: toast, dismiss: hideToast };
    }

    window.showNotification = showNotification;

    // تتبع حالة الاتصال بالإنترنت
    let offlineNotification = null;

    window.addEventListener("offline", () => {
        if (offlineNotification) return;
        offlineNotification = showNotification("انقطع الاتصال بالإنترنت، جاري الانتظار...", "offline", 0);
    });

    window.addEventListener("online", () => {
        if (offlineNotification) {
            offlineNotification.dismiss();
            offlineNotification = null;
            showNotification("تم إعادة الاتصال بالإنترنت بنجاح!", "success", 4000);
        }
    });

    // لودر الشاشة الترحيبية
    const loader = document.getElementById("loader-wrapper");
    if (loader) {
        setTimeout(() => {
            loader.classList.add("loader-hidden");
        }, 1000);
    }

    // ==========================================================================
    // 2. إدارة التبديل الحركي بين اللوحات (UI Switch)
    // ==========================================================================
    const signUpBtn = document.getElementById('signUpBtn');        
    const signInBtn = document.getElementById('signInBtn');        
    const toSignUpMobile = document.getElementById('toSignUpMobile'); 
    const toSignInMobile = document.getElementById('toSignInMobile'); 
    const authContainer = document.getElementById('authContainer');
    const linkForgotPassword = document.getElementById('linkForgotPassword');
    const backToSignInFromForgotBtn = document.getElementById('backToSignInFromForgotBtn');
    const forgotToSignInMobile = document.getElementById('forgotToSignInMobile');

    function switchToView(viewName) {
        if (!authContainer) return;

        authContainer.classList.remove("right-panel-active", "forgot-panel-active", "mobile-slide-active");

        if (viewName === 'signup') {
            authContainer.classList.add("right-panel-active", "mobile-slide-active");
        } else if (viewName === 'forgot') {
            resetForgotWizard();
            authContainer.classList.add("forgot-panel-active");
        }
    }

    function resetForgotWizard() {
        const stepEmail = document.getElementById('step-email');
        const stepOtp = document.getElementById('step-otp');
        const stepReset = document.getElementById('step-reset');
        const forgotTitle = document.getElementById('forgotTitle');
        const forgotSubtitle = document.getElementById('forgotSubtitle');

        if (stepEmail) stepEmail.classList.remove('d-none');
        if (stepOtp) stepOtp.classList.add('d-none');
        if (stepReset) stepReset.classList.add('d-none');
        if (forgotTitle) forgotTitle.innerText = "استعادة الحساب";
        if (forgotSubtitle) forgotSubtitle.innerText = "أدخل بريدك الإلكتروني لإرسال رمز التحقق (OTP)";
        
        const forgotForm = document.getElementById('forgotPasswordForm');
        if (forgotForm) forgotForm.reset();
    }

    if (signUpBtn) signUpBtn.addEventListener('click', () => switchToView('signup'));
    if (signInBtn) signInBtn.addEventListener('click', () => switchToView('signin'));
    if (toSignUpMobile) toSignUpMobile.addEventListener('click', () => switchToView('signup'));
    if (toSignInMobile) toSignInMobile.addEventListener('click', () => switchToView('signin'));
    
    if (linkForgotPassword) linkForgotPassword.addEventListener('click', (e) => {
        e.preventDefault();
        switchToView('forgot');
    });

    if (backToSignInFromForgotBtn) backToSignInFromForgotBtn.addEventListener('click', (e) => {
        e.preventDefault();
        switchToView('signin');
    });

    if (forgotToSignInMobile) forgotToSignInMobile.addEventListener('click', (e) => {
        e.preventDefault();
        switchToView('signin');
    });

    // ==========================================================================
    // 3. العمليات والربط الفعلي مع الـ API و Firebase
    // ==========================================================================

    // [أولاً] إنشاء حساب جديد
    const signUpForm = document.getElementById('signUpForm');
    if (signUpForm) {
        signUpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = signUpForm.querySelector('button[type="submit"]');
            const name = document.getElementById('regName').value.trim();
            const email = document.getElementById('regEmail').value.trim();
            const password = document.getElementById('regPassword').value;

            if (password.length < 6) {
                showNotification('⚠️ يجب ألا تقل كلمة المرور عن 6 أحرف.', "error");
                return;
            }

            if (submitBtn) submitBtn.disabled = true;

            try {
                const response = await fetch(`${BACKEND_URL}/api/signup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    showNotification(`🎉 ${data.message}`, "success");
                    signUpForm.reset();
                    switchToView('signin');
                } else {
                    showNotification(`⚠️ ${data.message || 'حدث خطأ أثناء إنشاء الحساب'}`, "error");
                }
            } catch (error) {
                showNotification('❌ خطأ في الاتصال بالسيرفر', "error");
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    // [ثانياً] تسجيل الدخول
    const signInForm = document.getElementById('signInForm');
    if (signInForm) {
        signInForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = signInForm.querySelector('button[type="submit"]');
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;

            if (!email || !password) {
                showNotification('⚠️ يرجى كتابة البريد الإلكتروني وكلمة المرور.', "error");
                return;
            }

            if (submitBtn) submitBtn.disabled = true;

            try {
                const response = await fetch(`${BACKEND_URL}/api/signin`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    showNotification(`✨ تم تسجيل الدخول بنجاح!`, "success");
                    localStorage.setItem('username', data.name);
                    localStorage.setItem('userEmail', data.email);
                    
                    setTimeout(() => { window.location.href = "dashboard.html"; }, 1000);
                } else {
                    showNotification(`❌ ${data.message || 'بيانات الدخول غير صحيحة'}`, "error");
                }
            } catch (error) {
                showNotification('❌ خطأ في الاتصال بالسيرفر', "error");
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    // [ثالثاً] منظومة استعادة كلمة المرور وإرسال الـ OTP
    const btnSendOTP = document.getElementById('btnSendOTP');
    const btnVerifyOTP = document.getElementById('btnVerifyOTP');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');

    // 1. كود إرسال الـ OTP
    if (btnSendOTP) {
        btnSendOTP.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = document.getElementById('forgotEmail').value.trim();
            
            if (!email) {
                showNotification('⚠️ يرجى إدخال البريد الإلكتروني أولاً.', "error");
                return;
            }

            const originalText = btnSendOTP.innerText;
            btnSendOTP.disabled = true;
            btnSendOTP.innerText = "جاري الإرسال...";

            try {
                const response = await fetch(`${BACKEND_URL}/api/forgot-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    showNotification('✉️ تم إرسال الرمز! تفقد بريدك الإلكتروني الآن.', "success");
                    document.getElementById('step-email').classList.add('d-none');
                    document.getElementById('step-otp').classList.remove('d-none');
                    document.getElementById('forgotTitle').innerText = "التحقق من الرمز";
                    document.getElementById('forgotSubtitle').innerText = "أدخل الرمز المكون من 6 أرقام";
                } else {
                    showNotification(`⚠️ ${data.message || 'فشل إرسال الرمز'}`, "error");
                }
            } catch (error) {
                showNotification('❌ فشل السيرفر في الإرسال.', "error");
            } finally {
                btnSendOTP.disabled = false;
                btnSendOTP.innerText = originalText;
            }
        });
    }

    // 2. كود التحقق من الـ OTP
    if (btnVerifyOTP) {
        btnVerifyOTP.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = document.getElementById('forgotEmail').value.trim();
            const otp = document.getElementById('otpCode').value.replace(/\D/g, '').trim();

            if (otp.length !== 6) {
                showNotification('⚠️ الرمز يجب أن يتكون من 6 أرقام كاملاً.', "error");
                return;
            }

            const originalText = btnVerifyOTP.innerText;
            btnVerifyOTP.disabled = true;
            btnVerifyOTP.innerText = "جاري التحقق...";

            try {
                const response = await fetch(`${BACKEND_URL}/api/verify-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, otp })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    showNotification('🔓 كود صحيح! قم بتعيين كلمة المرور الجديدة.', "success");
                    document.getElementById('step-otp').classList.add('d-none');
                    document.getElementById('step-reset').classList.remove('d-none');
                    document.getElementById('forgotTitle').innerText = "كلمة مرور جديدة";
                    document.getElementById('forgotSubtitle').innerText = "أدخل كلمة المرور الجديدة";
                } else {
                    showNotification(`❌ ${data.message || 'رمز التحقق غير صحيح'}`, "error");
                }
            } catch (error) {
                showNotification('❌ فشل الاتصال بالباك آند للتحقق.', "error");
            } finally {
                btnVerifyOTP.disabled = false;
                btnVerifyOTP.innerText = originalText;
            }
        });
    }

    // 3. كود تحديث كلمة المرور الجديدة
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (document.getElementById('step-reset').classList.contains('d-none')) return;

            const submitBtn = forgotPasswordForm.querySelector('button[type="submit"]');
            const email = document.getElementById('forgotEmail').value.trim();
            const otp = document.getElementById('otpCode').value.replace(/\D/g, '').trim();
            const newPassword = document.getElementById('newPassword').value;
            const confirmNewPassword = document.getElementById('confirmNewPassword').value;

            if (newPassword.length < 6) {
                showNotification('⚠️ يجب ألا تقل كلمة المرور عن 6 أحرف.', "error");
                return;
            }

            if (newPassword !== confirmNewPassword) {
                showNotification('⚠️ كلمتا المرور غير متطابقتين!', "error");
                return;
            }

            if (submitBtn) submitBtn.disabled = true;

            try {
                const response = await fetch(`${BACKEND_URL}/api/reset-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, otp, newPassword })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    showNotification('💾 مبروك! تم حفظ وتحديث كلمة المرور بنجاح.', "success");
                    switchToView('signin');
                } else {
                    showNotification(`⚠️ ${data.message || 'فشل تحديث كلمة المرور'}`, "error");
                }
            } catch (error) {
                showNotification('❌ فشل حفظ كلمة المرور الجديدة بالسيرفر.', "error");
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }
});
