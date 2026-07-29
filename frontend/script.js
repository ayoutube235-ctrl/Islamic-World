/* ==========================================================================
   اسكربت الصفحة الرئيسية فقط - منصة العالم الإسلامي
   ========================================================================== */

   const BACKEND_URL = "http://localhost:3000/api";

   document.addEventListener("DOMContentLoaded", () => {
       initClockAndTheme();
       initPrayerTimes();
       initResponsiveMenu(); 
       initTasbeehAndAzkar();
       initQiblaFinder();
       fetchVideos();
       initVideoSearch(); // تفعيل استماع البحث
       checkLoggedInUser(); // لعرض اسم المستخدم فوق في الهيدر
   });
   
   // دالة التحكم في اختفاء اللودر بعد وقت محدد ومثالي لظهور الأنيميشن
   function triggerSiteEntry() {
       const loader = document.getElementById("loader-wrapper");
       const audio = document.getElementById("welcomesound");
   
       setTimeout(() => {
           if (loader && !loader.classList.contains("loader-hidden")) {
               loader.classList.add("loader-hidden");
   
               const lText = document.querySelector('.landing-text');
               const lImg = document.querySelector('.landing-image');
               if (lText) lText.classList.add('active');
               if (lImg) lImg.classList.add('active');
   
               if (audio) {
                   audio.play().then(() => {
                       console.log("تم تشغيل الصوت بنجاح");
                   }).catch(err => {
                       console.log("المتصفح منع الصوت التلقائي، سيعمل مع أول نقرة.");
                       const playOnInteraction = () => {
                           audio.play().catch(e => console.log(e));
                           document.removeEventListener('click', playOnInteraction);
                           document.removeEventListener('touchstart', playOnInteraction);
                       };
                       document.addEventListener('click', playOnInteraction);
                       document.addEventListener('touchstart', playOnInteraction);
                   });
               }
           }
       }, 1500); 
   }
   
   if (document.readyState === 'loading') {
       document.addEventListener("DOMContentLoaded", triggerSiteEntry);
   } else {
       triggerSiteEntry();
   }
   
   function forcePlayAudio() {
       const audio = document.getElementById("welcomesound");
       if (audio && audio.paused) {
           audio.play().then(() => {
               removeAudioListeners();
           }).catch(err => console.log("في انتظار تفاعل حقيقي..."));
       }
   }
   
   function removeAudioListeners() {
       ["click", "touchstart", "scroll"].forEach(e => 
           window.removeEventListener(e, forcePlayAudio)
       );
   }
   
   ["click", "touchstart", "scroll"].forEach(e => 
       window.addEventListener(e, forcePlayAudio)
   );
   
   function initClockAndTheme() {
       const darkModeBtn = document.getElementById("darkModeBtn");
       if (!darkModeBtn) return;
       
       const savedTheme = localStorage.getItem('theme');
       const currentHour = new Date().getHours();
       
       if (savedTheme === 'dark' || (!savedTheme && (currentHour >= 18 || currentHour < 5))) {
           document.body.classList.add("dark-theme");
           darkModeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
       } else {
           document.body.classList.remove("dark-theme");
           darkModeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
       }
   
       darkModeBtn.addEventListener("click", () => {
           document.body.classList.toggle("dark-theme");
           const isDark = document.body.classList.contains("dark-theme");
           localStorage.setItem('theme', isDark ? 'dark' : 'light');
           darkModeBtn.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
       });
   }
   
   function initResponsiveMenu() {
       const menuIcon = document.getElementById("menuIcon");
       const navLinks = document.getElementById("navLinks");
       const overlay = document.getElementById("overlay");
       const links = document.querySelectorAll(".nav-links li a");
       if (!menuIcon || !navLinks) return;
       const toggleMenu = () => {
           menuIcon.classList.toggle("active");
           navLinks.classList.toggle("active");
           if (overlay) overlay.classList.toggle("active");
           document.body.style.overflow = navLinks.classList.contains("active") ? "hidden" : "auto";
       };
       menuIcon.addEventListener("click", toggleMenu);
       if (overlay) overlay.addEventListener("click", toggleMenu);
       links.forEach(link => {
           link.addEventListener("click", () => {
               menuIcon.classList.remove("active");
               navLinks.classList.remove("active");
               if (overlay) overlay.classList.remove("active");
               document.body.style.overflow = "auto";
           });
       });
   }
   
   function initPrayerTimes() {
       fetch('https://api.aladhan.com/v1/timingsByCity?city=Cairo&country=Egypt&method=5')
           .then(res => res.json())
           .then(data => {
               const t = data.data.timings;
               const updateTime = (id, time) => {
                   const el = document.getElementById(id);
                   if (el) el.textContent = time;
               };
               updateTime("fajr", t.Fajr);
               updateTime("shooruq", t.Sunrise);
               updateTime("dhuhr", t.Dhuhr);
               updateTime("asr", t.Asr);
               updateTime("maghrib", t.Maghrib);
               updateTime("isha", t.Isha);
           }).catch(() => {
               document.querySelectorAll(".card span").forEach(s => s.textContent = "--:--");
           });
   }
   
   function initTasbeehAndAzkar() {
       const azkarData = {
           tasbeeh: ["سُبْحَانَ اللَّهِ", "الْحَمْدُ لِلَّهِ", "لَا إِلَٰهَ إِلَّا اللَّهُ", "اللَّهُ أَكْبَرُ", "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ"],
           morning: ["أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ", "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ", "بِسْمِ اللَّهِ الَّذِي  لَا يَضُرُّ مَعَ اسْمِهِ شَيءُ وَهُوَ السَّمِيعُ العَلِيم"],
           evening: ["أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ", "رَضِيتُ بِاللَّهِ رَبًّا"],
           travel: ["سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا"],
           sleep: ["بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي"],
           food: ["بِسْمِ اللَّهِ في أوّلهِ وآخِرهِ"],
           mosque: ["اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ"],
           distress: ["لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ"]
       };
       let currentCategory = "tasbeeh";
       let azkarIndex = 0;
       let sessionCount = 0;
       let totalCount = parseInt(localStorage.getItem("totalTasbeeh")) || 0;
       const categorySelect = document.getElementById("azkarCategory");
       const currentAzkarDisplay = document.getElementById("currentAzkar");
       const counterNum = document.getElementById("counterNum");
       const totalTasbeehDisplay = document.getElementById("totalTasbeeh");
       if (totalTasbeehDisplay) totalTasbeehDisplay.textContent = totalCount;
       function updateAzkarUI() {
           if (!currentAzkarDisplay) return;
           currentAzkarDisplay.classList.add("fade-out");
           setTimeout(() => {
               currentAzkarDisplay.textContent = `"${azkarData[currentCategory][azkarIndex]}"`;
               sessionCount = 0;
               if (counterNum) counterNum.textContent = sessionCount;
               currentAzkarDisplay.classList.remove("fade-out");
           }, 300);
       }
       if (categorySelect) {
           categorySelect.addEventListener("change", (e) => {
               currentCategory = e.target.value;
               azkarIndex = 0;
               updateAzkarUI();
           });
       }
       const nextBtn = document.getElementById("nextAzkarBtn");
       const prevBtn = document.getElementById("prevAzkarBtn");
       if (nextBtn) nextBtn.addEventListener("click", () => {
           azkarIndex = (azkarIndex + 1) % azkarData[currentCategory].length;
           updateAzkarUI();
       });
       if (prevBtn) prevBtn.addEventListener("click", () => {
           azkarIndex = (azkarIndex - 1 + azkarData[currentCategory].length) % azkarData[currentCategory].length;
           updateAzkarUI();
       });
       const countBtn = document.getElementById("countBtn");
       if (countBtn) {
           countBtn.addEventListener("click", () => {
               sessionCount++; totalCount++;
               if (counterNum) counterNum.textContent = sessionCount;
               if (totalTasbeehDisplay) totalTasbeehDisplay.textContent = totalCount;
               localStorage.setItem("totalTasbeeh", totalCount);
               if (sessionCount % 33 === 0 && navigator.vibrate) navigator.vibrate(100);
           });
       }
       const resetBtn = document.getElementById("resetBtn");
       if (resetBtn) resetBtn.addEventListener("click", () => {
           sessionCount = 0;
           if (counterNum) counterNum.textContent = sessionCount;
       });
   }
   
   function initQiblaFinder() {
       const compassArrow = document.getElementById("compassArrow");
       const qiblaDegrees = document.getElementById("qiblaDegrees");
       const qiblaBtn = document.getElementById("getQiblaBtn");
       if (qiblaBtn) {
           qiblaBtn.addEventListener("click", () => {
               if (navigator.geolocation) {
                   navigator.geolocation.getCurrentPosition(position => {
                       const { latitude: lat, longitude: lng } = position.coords;
                       const kaabaLat = 21.422487, kaabaLng = 39.826206;
                       Math.toRadians = d => d * Math.PI / 180;
                       Math.toDegrees = r => r * 180 / Math.PI;
                       const y = Math.sin(Math.toRadians(kaabaLng - lng));
                       const x = Math.cos(Math.toRadians(lat)) * Math.sin(Math.toRadians(kaabaLat)) -
                                 Math.sin(Math.toRadians(lat)) * Math.cos(Math.toRadians(kaabaLat)) * Math.cos(Math.toRadians(kaabaLng - lng));
                       let qiblaAngle = (Math.toDegrees(Math.atan2(y, x)) + 360) % 360;
                       if (qiblaDegrees) qiblaDegrees.textContent = `زاوية القبلة: ${Math.round(qiblaAngle)}°`;
                       if (compassArrow) compassArrow.style.transform = `rotate(${Math.round(qiblaAngle)}deg)`;
                   }, () => alert("يرجى تفعيل الـ GPS."));
               }
           });
       }
   }
   
   const downloadBtn = document.getElementById('downloadBtn');
   if (downloadBtn) {
       downloadBtn.addEventListener('click', function() {
           const link = document.createElement('a');
           link.href = 'تحدي_الـ30_يوم.pdf'; 
           link.download = 'تحدي_الـ30_يوم.pdf'; 
           document.body.appendChild(link);
           link.click();
           document.body.removeChild(link);
       });
   }
   
   window.addEventListener("scroll", () => {
       let reveals = document.querySelectorAll(".reveal");
       reveals.forEach(reveal => {
           let windowHeight = window.innerHeight;
           let revealTop = reveal.getBoundingClientRect().top;
           if (revealTop < windowHeight - 100) {
               reveal.classList.add("active");
           }
       });
   });
   
   async function fetchVideos() {
       try {
           const response = await fetch(`${BACKEND_URL}/videos`); 
           const data = await response.json();
   
           const mainContainer = document.getElementById('main-videos-container');
           const reelsContainer = document.getElementById('reels-container');
   
           if (mainContainer && data.mainVideos) {
               mainContainer.innerHTML = "";
               data.mainVideos.forEach(video => {
                   mainContainer.innerHTML += `
                       <div class="video-card">
                           <div class="video-embed">
                               <iframe src="https://www.youtube.com/embed/${video.id}" frameborder="0" allowfullscreen></iframe>
                           </div>
                           <h4>${video.title}</h4>
                           <div class="video-info-box">
                               <details>
                                   <summary>عن الفيديو <i class="fa-solid fa-chevron-down arrow-icon"></i></summary>
                                   <div class="content"><p>${video.description}</p></div>
                               </details>
                           </div>
                       </div>`;
               });
           }
   
           if (reelsContainer && data.reels) {
               reelsContainer.innerHTML = "";
               data.reels.forEach(reel => {
                   reelsContainer.innerHTML += `
                       <div class="reel-card">
                           <div class="reel-embed">
                               <iframe src="https://www.youtube.com/embed/${reel.id}?rel=0" frameborder="0" allowfullscreen></iframe>
                           </div>
                           <div class="reel-info">
                               <p>${reel.title}</p>
                               <div class="video-info-box">
                                   <details>
                                       <summary>وصف <i class="fa-solid fa-chevron-down arrow-icon"></i></summary>
                                       <div class="content"><p>${reel.description}</p></div>
                                   </details>
                               </div>
                           </div>
                       </div>`;
               });
           }
       } catch (error) {
           console.error("خطأ في جلب الفيديوهات:", error);
       }
   }

   // ==========================================================================
   // دالة إيقاف وفلترة البحث في الفيديوهات والريلز
   // ==========================================================================
   function initVideoSearch() {
       const searchInput = document.getElementById('video-search-input');
       const clearBtn = document.getElementById('clear-search-btn');

       if (!searchInput) return;

       searchInput.addEventListener('input', (e) => {
           const query = e.target.value.trim().toLowerCase();

           if (clearBtn) {
               clearBtn.style.display = query.length > 0 ? 'block' : 'none';
           }

           // فلترة الفيديوهات الرئيسية
           const mainVideoCards = document.querySelectorAll('#main-videos-container .video-card');
           mainVideoCards.forEach(card => {
               const titleAndDesc = card.textContent.toLowerCase();
               if (titleAndDesc.includes(query)) {
                   card.style.display = '';
               } else {
                   card.style.display = 'none';
               }
           });

           // فلترة فيديوهات الريلز
           const reelCards = document.querySelectorAll('#reels-container .reel-card');
           let hasReelResults = false;
           reelCards.forEach(card => {
               const titleAndDesc = card.textContent.toLowerCase();
               if (titleAndDesc.includes(query)) {
                   card.style.display = '';
                   hasReelResults = true;
               } else {
                   card.style.display = 'none';
               }
           });

           // التحكم في ظهور قسم الريلز بالكامل
           const reelsSection = document.getElementById('reels-section');
           if (reelsSection) {
               reelsSection.style.display = (hasReelResults || query === '') ? 'block' : 'none';
           }
       });

       if (clearBtn) {
           clearBtn.addEventListener('click', () => {
               searchInput.value = '';
               searchInput.dispatchEvent(new Event('input'));
               searchInput.focus();
           });
       }
   }
   
   function checkLoggedInUser() {
       const storedName = localStorage.getItem('username');
       const authLink = document.getElementById('authLink');
       if (storedName && authLink) {
           authLink.innerHTML = `<i class="fa-solid fa-user"></i> مرحباً، ${storedName}`;
           authLink.href = "#";
       }
   }
   
   // ==========================================================================
   //  دالة اختيار باقات التحفيظ والتحويل للواتساب (تم إضافتها)
   // ==========================================================================
   function selectPackage(packageName) {
       const phoneNumber = "201017366271"; // استبدل الرقم برقم الواتساب الخاص بك
       const message = `السلام عليكم ورحمة الله وبركاته، أرغب في الاشتراك في (${packageName}) لتحفيظ القرآن الكريم عبر منصة العالم الإسلامي. أرجو تزويدي بالتفاصيل والتكلفة وكيفية البدء.`;
       const encodedMessage = encodeURIComponent(message);
       const whatsappURL = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
       window.open(whatsappURL, '_blank');
   }