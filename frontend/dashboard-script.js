/* ==========================================================================
   ملف التحكم البرمجي للوحة التحكم (Dashboard الشامل والمتجاوب) - منصة العالم الإسلامي
   ========================================================================== */

// 1. دالة الإشعارات المحسّنة والمحمية
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
    iconSpan.style.display = "flex";
    iconSpan.style.alignItems = "center";
    iconSpan.style.justifyContent = "center";
    iconSpan.innerHTML = currentConfig.icon;

    const textSpan = document.createElement("span");
    textSpan.textContent = message;

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
        marginRight: "auto",
        transition: "color 0.2s"
    });
    closeBtn.onmouseover = () => closeBtn.style.color = "#ffffff";
    closeBtn.onmouseout = () => closeBtn.style.color = "rgba(255, 255, 255, 0.7)";

    toast.appendChild(iconSpan);
    toast.appendChild(textSpan);
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

    closeBtn.addEventListener("click", hideToast);

    if (duration > 0) {
        hideTimeout = setTimeout(hideToast, duration);
    }

    return {
        element: toast,
        dismiss: hideToast
    };
}

// 🌟 2. دالة نافذة التأكيد المخصصة (Custom Modal) بديلة لـ confirm المتصفح
function showConfirmModal(message, onConfirm) {
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100vw",
        height: "100vh",
        background: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(5px)",
        zIndex: "10000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: "0",
        transition: "opacity 0.3s ease"
    });

    const modal = document.createElement("div");
    Object.assign(modal.style, {
        background: "linear-gradient(135deg, #1f2937, #111827)",
        color: "#ffffff",
        padding: "24px 28px",
        borderRadius: "16px",
        boxShadow: "0 20px 30px -10px rgba(0, 0, 0, 0.5)",
        fontFamily: "'Cairo', 'Reem Kufi', sans-serif",
        direction: "rtl",
        textAlign: "center",
        maxWidth: "360px",
        width: "90%",
        transform: "scale(0.9)",
        transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
    });

    modal.innerHTML = `
        <div style="margin-bottom: 15px; color: #f59e0b; display: flex; justify-content: center;">
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
        </div>
        <h3 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 600;">تأكيد الإجراء</h3>
        <p style="margin: 0 0 20px 0; font-size: 14px; color: #d1d5db; line-height: 1.5;">${message}</p>
        <div style="display: flex; gap: 10px; justify-content: center;">
            <button id="modal-confirm-btn" style="flex: 1; padding: 10px; border-radius: 8px; border: none; background: #dc2626; color: #fff; font-family: inherit; font-weight: bold; cursor: pointer; transition: background 0.2s;">تأكيد</button>
            <button id="modal-cancel-btn" style="flex: 1; padding: 10px; border-radius: 8px; border: 1px solid #374151; background: transparent; color: #d1d5db; font-family: inherit; cursor: pointer; transition: background 0.2s;">إلغاء</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
        overlay.style.opacity = "1";
        modal.style.transform = "scale(1)";
    });

    function closeModal() {
        overlay.style.opacity = "0";
        modal.style.transform = "scale(0.9)";
        setTimeout(() => overlay.remove(), 300);
    }

    modal.querySelector("#modal-confirm-btn").onclick = () => {
        closeModal();
        if (onConfirm) onConfirm();
    };

    modal.querySelector("#modal-cancel-btn").onclick = closeModal;
    overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };
}

// 3. نظام التتبع الآلي لحالة الاتصال بالإنترنت
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

// 4. تهيئة اللوحة الرئيسية عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", async () => {
    const BACKEND_URL = "http://localhost:3000";

    const loggedInUser = localStorage.getItem("username");
    const userEmail = localStorage.getItem("userEmail");

    if (!loggedInUser || !userEmail) {
        window.location.href = "sign.html"; 
        return;
    }
    
    const usernameDisplay = document.getElementById("username-display");
    if (usernameDisplay) usernameDisplay.innerText = loggedInUser;

    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.clear();
            window.location.href = "sign.html";
        });
    }

    const defaultData = { 
        streak: 0, 
        lastCompletedDate: null, 
        quranPageTarget: null, 
        challenge30Days: [], 
        watchedVideos: [], 
        dailyHabits: { fajr: false, prayers: false, azkar: false, quran: false },
        tasbeehCurrent: 0,
        tasbeehTotal: 0
    };
    let userData = { ...defaultData };

    async function fetchUserReligiousData() {
        try {
            const response = await fetch(`${BACKEND_URL}/get-religious-data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail })
            });
            const resData = await response.json();
            if (resData.success && resData.religiousData) {
                userData = resData.religiousData;
                if (!userData.watchedVideos) userData.watchedVideos = [];
                if (userData.tasbeehCurrent === undefined) userData.tasbeehCurrent = 0;
                if (userData.tasbeehTotal === undefined) userData.tasbeehTotal = 0;
            }
        } catch (error) {
            userData = JSON.parse(localStorage.getItem("userReligiousData")) || defaultData;
        }
    }

    async function syncDataWithServer() {
        localStorage.setItem("userReligiousData", JSON.stringify(userData));
        try {
            await fetch(`${BACKEND_URL}/save-religious-data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail, religiousData: userData })
            });
        } catch (error) {
            console.error("خطأ المزامنة:", error);
        }
    }

    await fetchUserReligiousData();
    if (document.getElementById("streak-count")) {
        document.getElementById("streak-count").innerText = userData.streak || 0;
    }
    
    renderChallenge30Days();
    updateHabitsUI();
    loadDailyWisdom();
    initAzkarSystem();
    initTasbeehSystem();

    function renderChallenge30Days() {
        const gridContainer = document.getElementById("challenge-grid");
        if (!gridContainer) return;
        gridContainer.innerHTML = "";
        for (let day = 1; day <= 30; day++) {
            const dayBox = document.createElement("div");
            dayBox.classList.add("challenge-day-box");
            dayBox.innerText = day;
            if (userData.challenge30Days && userData.challenge30Days.includes(day)) {
                dayBox.classList.add("completed");
            }

            dayBox.addEventListener("click", async () => {
                if (dayBox.classList.contains("completed")) {
                    dayBox.classList.remove("completed");
                    userData.challenge30Days = userData.challenge30Days.filter(d => d !== day);
                } else {
                    dayBox.classList.add("completed");
                    userData.challenge30Days.push(day);
                    showNotification(`✅ تم إنجاز التحدي لليوم [ ${day} ] بنجاح!`, "success");
                }
                await syncDataWithServer();
            });
            gridContainer.appendChild(dayBox);
        }
    }

    function updateHabitsUI() {
        ['fajr', 'prayers', 'azkar', 'quran'].forEach(habit => {
            const cb = document.getElementById(`habit-${habit}`);
            if (cb) {
                cb.checked = userData.dailyHabits[habit] || false;
                cb.onclick = async () => { 
                    userData.dailyHabits[habit] = cb.checked; 
                    await syncDataWithServer(); 
                };
            }
        });
    }

    function loadDailyWisdom() {
        const verses = [
            { text: "وَاصْبِرْ لِحُكْمِ رَبِّكَ فَإِنَّكَ بِأَعْيُنِنَا", source: "سورة الطور: 48" },
            { text: "إِنَّ مَعَ الْعُسْرِ يُسْرًا", source: "سورة الشرح: 6" },
            { text: "فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ", source: "سورة البقرة: 152" },
            { text: "وَقُل رَّبِّ زِدْنِي عِلْمًا", source: "سورة طه: 114" },
            { text: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ", source: "سورة الرعد: 28" }
        ];

        const hadiths = [
            { text: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى", source: "صحيح البخاري" },
            { text: "احْفَظِ اللَّهَ يَحْفَظْكَ، احْفَظِ اللَّهَ تَجِدْهُ تُجَاهَكَ", source: "سنن الترمذي" },
            { text: "تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ لَكَ صَدَقَةٌ", source: "سنن الترمذي" },
            { text: "المُؤْمِنُ القَوِيُّ خَيْرٌ وَأَحَبُّ إِلَى اللَّهِ مِنَ المُؤْمِنِ الضَّعِيفِ", source: "صحيح مسلم" }
        ];

        const quotes = [
            { text: "من أصلح سريرته أصلح الله علانيته، ومن أصلح ما بينه وبين الله أصلح الله ما بينه وبين الناس.", source: "عمر بن الخطاب رضي الله عنه" },
            { text: "القلب يمرض كما يمرض البدن، وشفاؤه في التوبة والإنابة.", source: "ابن قيم الجوزية" },
            { text: "لو علمت كيف يدبر الله أمورك لذاب قلبك من محبته.", source: "الحسن البصري" }
        ];

        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const diff = now - start;
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);

        const v = verses[dayOfYear % verses.length];
        const h = hadiths[dayOfYear % hadiths.length];
        const q = quotes[dayOfYear % quotes.length];

        const verseElem = document.getElementById("daily-verse");
        const surahElem = document.getElementById("daily-surah");
        const hadithElem = document.getElementById("daily-hadith");
        const hadithSrcElem = document.getElementById("daily-hadith-source");
        const quoteElem = document.getElementById("daily-quote");
        const quoteSrcElem = document.getElementById("daily-quote-source");

        if (verseElem) verseElem.innerText = `"${v.text}"`;
        if (surahElem) surahElem.innerText = v.source;

        if (hadithElem) hadithElem.innerText = `"${h.text}"`;
        if (hadithSrcElem) hadithSrcElem.innerText = h.source;

        if (quoteElem) quoteElem.innerText = `"${q.text}"`;
        if (quoteSrcElem) quoteSrcElem.innerText = q.source;
    }

    function initAzkarSystem() {
        const azkarData = {
            tasbeeh: [
                "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
                "سُبْحَانَ اللَّهِ الْعَظِيمِ",
                "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ",
                "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ"
            ],
            morning: [
                "أَصْبَحْنَا وَأَصْبَحَ المُلْكُ لِلَّهِ، وَالحَمْدُ لِلَّهِ",
                "اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ",
                "يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ أَصْلِحْ لِي شَأْنِي كُلَّهُ"
            ],
            evening: [
                "أَمْسَيْنَا وَأَمْسَى المُلْكُ لِلَّهِ، وَالحَمْدُ لِلَّهِ",
                "اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ وَإِلَيْكَ المَصِيرُ",
                "أَعُوذُ بِكَلِمَاتِ اللهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ"
            ],
            sleep: [
                "بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي، وَبِكَ أَرْفَعُهُ",
                "اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ",
                "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا"
            ],
            distress: [
                "لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ",
                "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ",
                "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ"
            ]
        };

        let currentCategory = "tasbeeh";
        let currentIndex = 0;

        const categorySelect = document.getElementById("azkarCategory");
        const currentAzkarElem = document.getElementById("currentAzkar");
        const prevBtn = document.getElementById("prevAzkarBtn");
        const nextBtn = document.getElementById("nextAzkarBtn");

        if (!currentAzkarElem) return;

        function updateAzkarDisplay() {
            const list = azkarData[currentCategory] || azkarData["tasbeeh"];
            currentAzkarElem.innerText = `"${list[currentIndex]}"`;
        }

        if (categorySelect) {
            categorySelect.addEventListener("change", (e) => {
                currentCategory = e.target.value;
                currentIndex = 0;
                updateAzkarDisplay();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener("click", () => {
                const list = azkarData[currentCategory] || azkarData["tasbeeh"];
                currentIndex = (currentIndex + 1) % list.length;
                updateAzkarDisplay();
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener("click", () => {
                const list = azkarData[currentCategory] || azkarData["tasbeeh"];
                currentIndex = (currentIndex - 1 + list.length) % list.length;
                updateAzkarDisplay();
            });
        }

        updateAzkarDisplay();
    }

    function initTasbeehSystem() {
        const counterNum = document.getElementById("counterNum");
        const totalTasbeehDisplay = document.getElementById("totalTasbeeh");
        const countBtn = document.getElementById("countBtn");
        const resetBtn = document.getElementById("resetBtn");
        const resetTotalBtn = document.getElementById("resetTotalBtn");

        if (!counterNum || !totalTasbeehDisplay || !countBtn) return;

        function updateTasbeehUIAndSync() {
            counterNum.textContent = userData.tasbeehCurrent;
            totalTasbeehDisplay.textContent = userData.tasbeehTotal;
            syncDataWithServer();
        }

        function triggerVibration(pattern) {
            try {
                if ("vibrate" in navigator) {
                    navigator.vibrate(pattern);
                }
            } catch (e) {}
        }

        function incrementTasbeeh() {
            userData.tasbeehCurrent++;
            userData.tasbeehTotal++;

            triggerVibration(30);

            if (userData.tasbeehCurrent % 33 === 0) {
                triggerVibration([100, 50, 100]);
            }

            updateTasbeehUIAndSync();
        }

        countBtn.addEventListener("click", incrementTasbeeh);
        counterNum.addEventListener("click", incrementTasbeeh);

        if (resetBtn) {
            resetBtn.addEventListener("click", () => {
                if (userData.tasbeehCurrent > 0) {
                    userData.tasbeehCurrent = 0;
                    updateTasbeehUIAndSync();
                    showNotification("تم تصفير العداد الحالي.", "success");
                }
            });
        }

        // 🌟 استبدال النافذة العادية بالنافذة المنبثقة المخصصة
        if (resetTotalBtn) {
            resetTotalBtn.addEventListener("click", () => {
                if (userData.tasbeehTotal > 0) {
                    showConfirmModal(
                        "هل أنت تأكد من رغبتك في تصفير المجموع الكلي للتسبيحات؟",
                        () => {
                            userData.tasbeehCurrent = 0;
                            userData.tasbeehTotal = 0;
                            updateTasbeehUIAndSync();
                            showNotification("تم تصفير المجموع الكلي.", "success");
                        }
                    );
                }
            });
        }

        counterNum.textContent = userData.tasbeehCurrent;
        totalTasbeehDisplay.textContent = userData.tasbeehTotal;
    }
});