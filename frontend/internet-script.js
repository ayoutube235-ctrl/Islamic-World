/* ==========================================================================
   نظام الإشعارات وتتبع حالة الاتصال المحسّن - منصة العالم الإسلامي
   ========================================================================== */

// 1. دالة الإشعارات المحسّنة (تدعم الأيقونات، الألوان، التثبيت، والتحسينات الأمنية)
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
            pointerEvents: "none" // للسماح بالنقر خلف الحاوية
        });
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");

    // تحديد الأيقونة واللون حسب نوع الإشعار
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
            bg: "linear-gradient(135deg, #1f2937, #111827)", // تصميم داكن وأنيق للانقطاع
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M1 1l22 22"></path><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path><path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>`
        }
    };

    const currentConfig = config[type] || config.success;

    // بناء الهيكل الداخلي بأمان لمنع XSS
    const iconContainer = document.createElement("span");
    iconContainer.style.display = "flex";
    iconContainer.style.alignItems = "center";
    iconContainer.style.justifyContent = "center";
    iconContainer.innerHTML = currentConfig.icon;

    const messageSpan = document.createElement("span");
    messageSpan.textContent = message; // آمن ضد ثغرات XSS

    // زر إغلاق الإشعار يدوياً
    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "&times;";
    Object.assign(closeBtn.style, {
        background: "transparent",
        border: "none",
        color: "rgba(255, 255, 255, 0.7)",
        fontSize: "18px",
        cursor: "pointer",
        padding: "0 0 0 8px",
        lineHeight: "1",
        marginRight: "auto", // لدفع الزر إلى أقصى اليسار/اليمين حسب الاتجاه
        transition: "color 0.2s ease"
    });
    closeBtn.onmouseover = () => closeBtn.style.color = "#ffffff";
    closeBtn.onmouseout = () => closeBtn.style.color = "rgba(255, 255, 255, 0.7)";

    toast.appendChild(iconContainer);
    toast.appendChild(messageSpan);
    toast.appendChild(closeBtn);

    Object.assign(toast.style, {
        padding: "12px 18px",
        borderRadius: "12px",
        color: "#ffffff",
        fontFamily: "'Cairo', 'Reem Kufi', sans-serif",
        fontSize: "14px",
        direction: "rtl",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.25)",
        background: currentConfig.bg,
        backdropFilter: "blur(8px)",
        opacity: "0",
        transform: "translateY(20px) scale(0.95)",
        transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        pointerEvents: "auto" // إرجاع التفاعل للإشعار نفسه
    });

    container.appendChild(toast);

    // أنيميشن الظهور
    requestAnimationFrame(() => {
        toast.style.opacity = "1";
        toast.style.transform = "translateY(0) scale(1)";
    });

    let hideTimeout = null;

    // دالة الإخفاء مع الأنيميشن
    function hideToast() {
        if (hideTimeout) clearTimeout(hideTimeout);
        toast.style.opacity = "0";
        toast.style.transform = "translateY(-10px) scale(0.95)";
        setTimeout(() => toast.remove(), 400);
    }

    closeBtn.addEventListener("click", hideToast);

    // إخفاء الإشعار تلقائياً (إذا لم تكن المدة 0)
    if (duration > 0) {
        hideTimeout = setTimeout(hideToast, duration);
    }

    // إرجاع التحكم للبرمجية الخارجية
    return {
        element: toast,
        dismiss: hideToast
    };
}


// 2. نظام التتبع الآلي لحالة الإنترنت (Offline / Online Auto-Detector)
let offlineNotification = null;

window.addEventListener("offline", () => {
    // عدم تكرار الإشعار إن كان معروضاً بالمرّة
    if (offlineNotification) return;

    // إشعار ثابت (duration = 0) حتى يعود الاتصال
    offlineNotification = showNotification("انقطع الاتصال بالإنترنت، جاري الانتظار...", "offline", 0);
});

window.addEventListener("online", () => {
    if (offlineNotification) {
        // إزالة إشعار الانقطاع
        offlineNotification.dismiss();
        offlineNotification = null;

        // إظهار إشعار ترحيبي بعودة الاتصال
        showNotification("تم إعادة الاتصال بالإنترنت بنجاح!", "success", 4000);
    }
});