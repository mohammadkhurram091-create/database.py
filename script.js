"use strict";

/* ============================================================
   ZIKRNOOR — MODERN SCRIPT (Unified Bookmarks)
   ============================================================ */

const PREFERS_REDUCED_MOTION = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

const STORAGE_KEYS = {
    SAVED_HADITH: "zikrnoor-saved-hadith",
    ROUTINE: "zikrnoor-routine",
    SAVED_QURAN: "zikrnoor-quran-bookmarks",
    SAVED_TASBEEH: "zikrnoor-tasbeeh-bookmarks"
};

// UTILITIES
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function debounce(fn, delay = 200) {
    let timer = null;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

function haptic(ms = 8) {
    if (PREFERS_REDUCED_MOTION) return;
    navigator.vibrate?.(ms);
}

function fadeInChildren(container, stagger = 40) {
    if (!container || PREFERS_REDUCED_MOTION) return;
    Array.from(container.children).forEach((child, i) => {
        child.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }], 
        { duration: 350, delay: i * stagger, easing: "cubic-bezier(0.2, 0.8, 0.3, 1)", fill: "backwards" });
    });
}

function pulseCounter(el) {
    if (!el || PREFERS_REDUCED_MOTION) return;
    el.animate([{ transform: "scale(1)" }, { transform: "scale(1.08)" }, { transform: "scale(1)" }], { duration: 280 });
}

function attachRipple(root = document) {
    if (PREFERS_REDUCED_MOTION) return;
    root.addEventListener("pointerdown", (event) => {
        const btn = event.target.closest("button, .primary-button");
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 2;
        const span = document.createElement("span");
        Object.assign(span.style, { position: "absolute", left: `${event.clientX - rect.left - size / 2}px`, top: `${event.clientY - rect.top - size / 2}px`, width: `${size}px`, height: `${size}px`, borderRadius: "50%", background: "rgba(255, 255, 255, 0.18)", pointerEvents: "none", transform: "scale(0)", opacity: "1" });
        if (getComputedStyle(btn).position === "static") btn.style.position = "relative";
        btn.style.overflow = "hidden";
        btn.appendChild(span);
        span.animate([{ transform: "scale(0)", opacity: "0.55" }, { transform: "scale(1)", opacity: "0" }], { duration: 550, easing: "ease-out" }).onfinish = () => span.remove();
    }, { passive: true });
}

function toast(message, kind = "info") {
    const palette = {
        info: { bg: "rgba(16, 27, 21, 0.95)", border: "rgba(215, 182, 109, 0.6)", fg: "#f5ddb0" },
        success: { bg: "rgba(16, 30, 22, 0.95)", border: "rgba(131, 184, 154, 0.7)", fg: "#a8d4bb" },
        warning: { bg: "rgba(30, 22, 16, 0.95)", border: "rgba(215, 182, 109, 0.6)", fg: "#f5ddb0" },
    };
    const { bg, border, fg } = palette[kind] ?? palette.info;
    const el = document.createElement("div");
    el.textContent = message;
    Object.assign(el.style, { position: "fixed", bottom: "24px", right: "24px", padding: "12px 20px", background: bg, border: `1px solid ${border}`, borderRadius: "12px", color: fg, fontSize: "14px", fontWeight: "600", zIndex: "9999", backdropFilter: "blur(12px)", opacity: "0", transform: "translateY(20px)", transition: "all 0.25s ease", pointerEvents: "none" });
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = "1"; el.style.transform = "translateY(0)"; });
    setTimeout(() => { el.style.opacity = "0"; el.style.transform = "translateY(20px)"; setTimeout(() => el.remove(), 300); }, 2200);
}

// BOOT
function bootZikrnoor() {
    initTasbeeh();
    initQuran();
    initAdhkar();
    initHadith();
    initRoutine();
    initBookmarks();
    attachRipple();
    console.log("%c[Zikrnoor]%c Ready — 6 modules loaded.", "color:#d7b66d;font-weight:800", "color:#83b89a");
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootZikrnoor);
else bootZikrnoor();

// ---------------------------------------------------------------------------
// 1. TASBEEH COUNTER
// ---------------------------------------------------------------------------
function initTasbeeh() {
    const zikrSelect    = $("#zikr-select");
    const targetSelect  = $("#target-select");
    const currentZikr   = $("#current-zikr");
    const countDisplay  = $("#count");
    const targetLabel   = $("#target-label");
    const progressTrack = $("#progress-track");
    const progressFill  = $("#progress-fill");
    const progressMsg   = $("#progress-message");
    const countButton   = $("#count-button");
    const resetButton   = $("#reset-button");

    if (!zikrSelect) return;
    let count = 0;

    function updateDisplay() {
        const target = Number(targetSelect.value) || 33;
        const pct = Math.min((count / target) * 100, 100);
        currentZikr.textContent = zikrSelect.value;
        countDisplay.textContent = count;
        targetLabel.textContent = `Target: ${target}`;
        progressFill.style.width = `${pct}%`;
        progressTrack.setAttribute("aria-valuemax", target);
        progressTrack.setAttribute("aria-valuenow", count);

        if (count >= target)      progressMsg.textContent = "Alhamdulillah! Your target is complete.";
        else if (count === 0)     progressMsg.textContent = "Your journey starts here.";
        else                      progressMsg.textContent = `${target - count} counts remaining. Keep going!`;
    }

    countButton.addEventListener("click", () => { count++; haptic(8); pulseCounter(countDisplay); updateDisplay(); });
    resetButton.addEventListener("click", () => { count = 0; updateDisplay(); });
    zikrSelect.addEventListener("change", updateDisplay);
    targetSelect.addEventListener("change", updateDisplay);
    updateDisplay();

    // Add Save Button to Tasbeeh
    const saveBtn = document.createElement("button");
    saveBtn.textContent = "♡ Save this Zikr";
    saveBtn.className = "reset-button";
    saveBtn.style.marginTop = "10px";
    saveBtn.addEventListener("click", () => {
        const zikr = zikrSelect.value;
        let saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVED_TASBEEH) || "[]");
        if (!saved.includes(zikr)) {
            saved.push(zikr);
            localStorage.setItem(STORAGE_KEYS.SAVED_TASBEEH, JSON.stringify(saved));
            toast("Zikr saved to bookmarks!", "success");
            if (window.refreshBookmarks) window.refreshBookmarks();
        } else {
            toast("Zikr already saved.", "warning");
        }
    });
    $(".tasbeeh-panel").appendChild(saveBtn);
}

// ---------------------------------------------------------------------------
// 2. QURAN
// ---------------------------------------------------------------------------
function initQuran() {
    const quranSearch  = $("#quran-search");
    const quranResults = $("#quran-results");
    const quranStatus  = $("#quran-status");
    if (!quranSearch) return;
    let surahs = [];

    async function loadQuran() {
        try {
            const res = await fetch("https://api.alquran.cloud/v1/surah");
            const result = await res.json();
            surahs = result.data;
            quranStatus.textContent = "Search a Surah by name or number.";
        } catch { quranStatus.textContent = "Error loading Quran."; }
    }

    function renderSurahs() {
        const query = quranSearch.value.trim().toLowerCase();
        quranResults.replaceChildren();
        if (!query) return;
        
        const matches = surahs.filter(s => [s.number, s.englishName].some(v => String(v).toLowerCase().includes(query)));
        
        matches.forEach(surah => {
            const card = document.createElement("article");
            card.className = "quran-card";
            card.innerHTML = `<h3>${surah.number}. ${surah.englishName}</h3><p>${surah.name}</p><button type="button" class="read-btn">Read Surah</button><div class="quran-verses" hidden></div>`;
            
            const btn = card.querySelector(".read-btn");
            const versesDiv = card.querySelector(".quran-verses");

            btn.addEventListener("click", async () => {
                if (!versesDiv.hidden) { versesDiv.hidden = true; btn.textContent = "Read Surah"; return; }
                versesDiv.hidden = false; btn.textContent = "Close Surah";
                if (versesDiv.dataset.loaded) return;
                versesDiv.textContent = "Loading...";
                
                try {
                    const r = await fetch(`https://api.alquran.cloud/v1/surah/${surah.number}/editions/quran-uthmani,en.sahih`);
                    const data = await r.json();
                    const [ar, en] = data.data;
                    
                    versesDiv.innerHTML = ar.ayahs.map((ayah, i) => {
                        const safeAr = ayah.text.replace(/'/g, "\\'");
                        const safeEn = en.ayahs[i].text.replace(/'/g, "\\'");
                        return `
                        <article class="quran-ayah">
                            <p class="quran-arabic" dir="rtl">${ayah.text} ۝ ${ayah.numberInSurah}</p>
                            <p>${en.ayahs[i].text}</p>
                            <button class="bookmark-btn" style="margin-top:8px; font-size:12px; padding:6px 12px;" 
                                onclick="window.saveQuranBookmark(${surah.number}, '${surah.englishName}', ${ayah.numberInSurah}, '${safeAr}', '${safeEn}')">
                                ♡ Bookmark Verse
                            </button>
                        </article>
                    `}).join("");
                    versesDiv.dataset.loaded = "true";
                } catch { versesDiv.textContent = "Error loading verses."; }
            });
            quranResults.appendChild(card);
        });
    }

    window.saveQuranBookmark = function(sNum, sName, aNum, arText, enText) {
        let saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVED_QURAN) || "[]");
        if (!saved.find(x => x.surah === sNum && x.ayah === aNum)) {
            saved.push({ surah: sNum, surahName: sName, ayah: aNum, ar: arText, en: enText });
            localStorage.setItem(STORAGE_KEYS.SAVED_QURAN, JSON.stringify(saved));
            toast("Verse saved to bookmarks!", "success");
            if (window.refreshBookmarks) window.refreshBookmarks();
        } else {
            toast("Verse already saved.", "warning");
        }
    };

    quranSearch.addEventListener("input", debounce(renderSurahs, 200));
    loadQuran();
}

// ---------------------------------------------------------------------------
// 3. DAILY ADHKAR (Fallback + DB Support)
// ---------------------------------------------------------------------------
async function initAdhkar() {
    const adhkarResults = $("#adhkar-results");
    const adhkarSearch  = $("#adhkar-search");
    const adhkarStatus  = $("#adhkar-status");
    const adhkarTabs    = $(".adhkar-controls");
    if (!adhkarResults) return;

    // Default Fallback Data (So Duas always show)
    let adhkarData = [
        { id: 1, title: "Morning and Evening Dua", times: ["morning", "evening"], arabic: "اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ", translation: "O Allah, by You we enter the morning and evening, by You we live and die, and to You is the resurrection.", target: 1, source: "Hisn al-Muslim 78", url: "https://sunnah.com/hisn:78" },
        { id: 2, title: "Protection through Allah's Name", times: ["morning", "evening"], arabic: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ", translation: "In the name of Allah, with whose name nothing can cause harm on earth or in heaven. He is the All-Hearing, the All-Knowing.", target: 3, source: "Hisn al-Muslim 86", url: "https://sunnah.com/hisn:86" },
        { id: 3, title: "Remembering Allah", times: ["morning", "evening"], arabic: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ", translation: "Glory be to Allah and praise be to Him.", target: 100, source: "Riyad as-Salihin 1451", url: "https://sunnah.com/riyadussalihin/15/44" }
    ];

    // Try to load real IDs from Database
    try {
        const res = await fetch("/api/adhkar");
        if (res.ok) {
            const json = await res.json();
            if (json.adhkar && json.adhkar.length > 0) {
                adhkarData = json.adhkar.map(a => ({
                    id: a.adhkar_id, title: a.title, times: ["morning", "evening"], arabic: a.arabic_text, translation: a.translation, target: a.recommended_count || 1, source: a.source?.source_name || "Source", url: a.source?.source_url || "#"
                }));
            }
        }
    } catch { /* Use fallback */ }

    let activeTime = "morning";
    const adhkarCounts = {};

    function renderAdhkar() {
        const query = adhkarSearch.value.trim().toLowerCase();
        const items = adhkarData.filter(dua => dua.times.includes(activeTime) && `${dua.title} ${dua.translation}`.toLowerCase().includes(query));

        adhkarResults.innerHTML = items.map(dua => {
            const count = adhkarCounts[dua.id] ?? 0;
            const done = count >= dua.target;
            return `
                <article class="adhkar-card">
                    <h3>${dua.title}</h3>
                    <p class="adhkar-arabic" dir="rtl">${dua.arabic}</p>
                    <p class="adhkar-translation">${dua.translation}</p>
                    <p>Read: ${count}/${dua.target}</p>
                    <div class="adhkar-actions">
                        <button type="button" data-count="${dua.id}" ${done ? "disabled" : ""}>${done ? "Done ✓" : "Count +1"}</button>
                        <button type="button" data-reset="${dua.id}">Reset</button>
                        <button type="button" class="bookmark-btn" data-bookmark="${dua.id}">♡ Bookmark</button>
                    </div>
                    <a href="${dua.url}" target="_blank" rel="noopener noreferrer">${dua.source} · Reference ↗</a>
                </article>
            `;
        }).join("");
        adhkarStatus.textContent = `${items.length} Adhkar available`;
    }

    adhkarTabs.addEventListener("click", e => {
        const btn = e.target.closest("[data-time]");
        if (!btn) return;
        activeTime = btn.dataset.time;
        adhkarTabs.querySelector(".active")?.classList.remove("active");
        btn.classList.add("active");
        renderAdhkar();
    });

    adhkarSearch.addEventListener("input", debounce(renderAdhkar, 200));

    adhkarResults.addEventListener("click", e => {
        const countBtn = e.target.closest("[data-count]");
        const resetBtn = e.target.closest("[data-reset]");
        const bookmarkBtn = e.target.closest("[data-bookmark]");

        if (countBtn) {
            const id = countBtn.dataset.count;
            const dua = adhkarData.find(a => a.id == id);
            if (!dua) return;
            adhkarCounts[id] = Math.min((adhkarCounts[id] ?? 0) + 1, dua.target);
            renderAdhkar();
        } else if (resetBtn) {
            adhkarCounts[resetBtn.dataset.reset] = 0;
            renderAdhkar();
        } else if (bookmarkBtn) {
            const adhkarId = Number(bookmarkBtn.dataset.bookmark);
            bookmarkBtn.textContent = "Saving...";
            fetch("/api/bookmarks", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ item_type: "adhkar", adhkar_id: adhkarId })
            }).then(res => {
                if (res.status === 409) toast("Already bookmarked.", "warning");
                else if (res.ok) { toast("Saved to DB ♥", "success"); if (window.refreshBookmarks) window.refreshBookmarks(); }
                else toast("DB Error. Make sure Flask is running.", "warning");
                bookmarkBtn.textContent = "♥ Saved";
            }).catch(() => { toast("Network error.", "warning"); bookmarkBtn.textContent = "♡ Bookmark"; });
        }
    });

    renderAdhkar();
}

// ---------------------------------------------------------------------------
// 4. HADITH COLLECTION
// ---------------------------------------------------------------------------
function initHadith() {
    const hadithResults = $("#hadith-results");
    const hadithSearch  = $("#hadith-search");
    const hadithStatus  = $("#hadith-status");
    const savedButton   = $("#saved-hadith");
    const hadithFilters = $(".hadith-filters");
    if (!hadithResults) return;

    const hadiths = [
        { id: "bukhari-1", title: "Actions are judged by intentions", topic: "Intentions", narrator: "Umar ibn Al-Khattab (RA)", arabic: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ", translation: "The reward of deeds depends upon the intentions...", source: "Sahih al-Bukhari 1" },
        { id: "bukhari-13", title: "Wish good for others", topic: "Faith", narrator: "Anas (RA)", arabic: "لا يُؤْمِنُ أَحَدُكُمْ...", translation: "None of you will have faith till he wishes for his brother...", source: "Sahih al-Bukhari 13" }
    ];

    let activeTopic = "all";
    let savedHadith = JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVED_HADITH) || "[]");

    function renderHadith() {
        const query = hadithSearch.value.trim().toLowerCase();
        const filtered = hadiths.filter(h => {
            const matchesText = [h.title, h.topic, h.narrator, h.translation].some(t => t.toLowerCase().includes(query));
            return matchesText && (activeTopic === "all" || h.topic.toLowerCase() === activeTopic);
        });

        hadithResults.innerHTML = filtered.map(h => `
            <article class="hadith-card">
                <span class="hadith-topic">${h.topic}</span>
                <h3>${h.title}</h3>
                <p class="hadith-arabic" dir="rtl">${h.arabic}</p>
                <p class="hadith-translation">${h.translation}</p>
                <p class="hadith-source">Narrated by ${h.narrator}</p>
                <div class="hadith-actions">
                    <button type="button" data-save="${h.id}">${savedHadith.includes(h.id) ? "♥ Saved" : "♡ Save"}</button>
                </div>
            </article>
        `).join("");
        hadithStatus.textContent = `${filtered.length} Hadith found`;
    }

    hadithSearch.addEventListener("input", debounce(renderHadith, 200));
    hadithFilters.addEventListener("click", e => {
        const btn = e.target.closest("[data-topic]");
        if (!btn) return;
        activeTopic = btn.dataset.topic;
        hadithFilters.querySelector(".active")?.classList.remove("active");
        btn.classList.add("active");
        renderHadith();
    });

    hadithResults.addEventListener("click", e => {
        const btn = e.target.closest("[data-save]");
        if (!btn) return;
        const id = btn.dataset.save;
        const isSaving = !savedHadith.includes(id);
        savedHadith = isSaving ? [...savedHadith, id] : savedHadith.filter(s => s !== id);
        localStorage.setItem(STORAGE_KEYS.SAVED_HADITH, JSON.stringify(savedHadith));
        toast(isSaving ? "Saved Hadith ♥" : "Removed", isSaving ? "success" : "info");
        renderHadith();
        if (window.refreshBookmarks) window.refreshBookmarks();
    });

    renderHadith();
}

// ---------------------------------------------------------------------------
// 5. ROUTINE
// ---------------------------------------------------------------------------
function initRoutine() {
    const tasks = $$(".routine-task");
    const text = $("#routine-progress-text");
    const fill = $("#routine-progress-fill");
    if (!tasks.length) return;

    const date = new Date().toLocaleDateString("en-CA");
    let saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.ROUTINE) || "{}");
    if (saved.date !== date) saved = { date, completed: [] };

    tasks.forEach((t, i) => {
        t.checked = saved.completed.includes(i);
        t.addEventListener("change", () => {
            saved.completed = tasks.map((x, j) => x.checked ? j : -1).filter(x => x !== -1);
            localStorage.setItem(STORAGE_KEYS.ROUTINE, JSON.stringify(saved));
            update();
        });
    });

    function update() {
        const done = tasks.filter(x => x.checked).length;
        text.textContent = `${done} of ${tasks.length} completed`;
        fill.style.width = `${(done / tasks.length) * 100}%`;
    }
    update();
}

// ---------------------------------------------------------------------------
// 6. UNIFIED BOOKMARKS (DB + LocalStorage)
// ---------------------------------------------------------------------------
async function initBookmarks() {
    const resContainer = $("#bookmarks-results");
    const emptyMsg     = $("#bookmarks-empty");
    if (!resContainer || !emptyMsg) return;

    async function fetchAllBookmarks() {
        let html = "";

        // 1. Fetch Adhkar from MySQL
        try {
            const res = await fetch("/api/bookmarks");
            const data = await res.json();
            if (data.bookmarks && data.bookmarks.length > 0) {
                html += data.bookmarks.map(b => `
                    <article class="adhkar-card" style="margin-bottom: 16px; border-left: 3px solid #d7b66d;">
                        <span class="hadith-topic" style="color:#83b89a; font-size:12px;">Adhkar (From Database)</span>
                        <h3 style="color: var(--gold); margin-top:4px;">${b.adhkar_title || 'Adhkar'}</h3>
                        <p class="adhkar-arabic" dir="rtl">${b.adhkar_arabic || ''}</p>
                        <p class="adhkar-translation">${b.adhkar_translation || ''}</p>
                        <div class="adhkar-actions">
                            <button class="btn-delete-db" data-id="${b.bookmark_id}" style="border: 1px solid #ff4444; color: #ff4444; background: transparent;">Remove</button>
                        </div>
                    </article>
                `).join("");
            }
        } catch (e) { console.warn("DB bookmarks failed to load"); }

        // 2. Fetch Quran from LocalStorage
        const quranSaved = JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVED_QURAN) || "[]");
        if (quranSaved.length > 0) {
            html += quranSaved.map(q => `
                <article class="adhkar-card" style="margin-bottom: 16px; border-left: 3px solid #83b89a;">
                    <span class="hadith-topic" style="color:#83b89a; font-size:12px;">Quran (Surah ${q.surah}, Ayah ${q.ayah})</span>
                    <p class="adhkar-arabic" dir="rtl">${q.ar}</p>
                    <p class="adhkar-translation">${q.en}</p>
                    <div class="adhkar-actions">
                        <button class="btn-delete-local" data-type="quran" data-id="${q.surah}-${q.ayah}" style="border: 1px solid #ff4444; color: #ff4444; background: transparent;">Remove</button>
                    </div>
                </article>
            `).join("");
        }

        // 3. Fetch Hadith from LocalStorage
        const hadithSaved = JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVED_HADITH) || "[]");
        if (hadithSaved.length > 0) {
            const hMap = {
                "bukhari-1": { title: "Actions are judged by intentions", text: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ" },
                "bukhari-13": { title: "Wish good for others", text: "لا يُؤْمِنُ أَحَدُكُمْ..." }
            };
            html += hadithSaved.map(id => `
                <article class="adhkar-card" style="margin-bottom: 16px; border-left: 3px solid #83b89a;">
                    <span class="hadith-topic" style="color:#83b89a; font-size:12px;">Hadith</span>
                    <h3 style="color: var(--gold); margin-top:4px;">${hMap[id]?.title || id}</h3>
                    <p class="adhkar-arabic" dir="rtl">${hMap[id]?.text || ''}</p>
                    <div class="adhkar-actions">
                        <button class="btn-delete-local" data-type="hadith" data-id="${id}" style="border: 1px solid #ff4444; color: #ff4444; background: transparent;">Remove</button>
                    </div>
                </article>
            `).join("");
        }

        // 4. Fetch Tasbeeh from LocalStorage
        const tasbeehSaved = JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVED_TASBEEH) || "[]");
        if (tasbeehSaved.length > 0) {
            html += tasbeehSaved.map(z => `
                <article class="adhkar-card" style="margin-bottom: 16px; border-left: 3px solid #83b89a;">
                    <span class="hadith-topic" style="color:#83b89a; font-size:12px;">Tasbeeh Zikr</span>
                    <h3 style="color: var(--gold); margin-top:4px;">${z}</h3>
                    <div class="adhkar-actions">
                        <button class="btn-delete-local" data-type="tasbeeh" data-id="${z}" style="border: 1px solid #ff4444; color: #ff4444; background: transparent;">Remove</button>
                    </div>
                </article>
            `).join("");
        }

        // Render
        if (html === "") {
            resContainer.innerHTML = "";
            emptyMsg.hidden = false;
        } else {
            emptyMsg.hidden = true;
            resContainer.innerHTML = html;
            fadeInChildren(resContainer);
        }
    }

    window.refreshBookmarks = fetchAllBookmarks;

    resContainer.addEventListener("click", async (e) => {
        // Database Delete
        const dbBtn = e.target.closest(".btn-delete-db");
        if (dbBtn) {
            if (!confirm("Remove this Adhkar from database?")) return;
            await fetch(`/api/bookmarks/${dbBtn.dataset.id}`, { method: "DELETE" });
            toast("Removed from DB", "info");
            fetchAllBookmarks();
            return;
        }

        // LocalStorage Delete
        const localBtn = e.target.closest(".btn-delete-local");
        if (localBtn) {
            if (!confirm("Remove this bookmark?")) return;
            const type = localBtn.dataset.type;
            const id = localBtn.dataset.id;

            if (type === "quran") {
                let saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVED_QURAN) || "[]");
                saved = saved.filter(x => `${x.surah}-${x.ayah}` !== id);
                localStorage.setItem(STORAGE_KEYS.SAVED_QURAN, JSON.stringify(saved));
            } else if (type === "hadith") {
                let saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVED_HADITH) || "[]");
                saved = saved.filter(x => x !== id);
                localStorage.setItem(STORAGE_KEYS.SAVED_HADITH, JSON.stringify(saved));
            } else if (type === "tasbeeh") {
                let saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVED_TASBEEH) || "[]");
                saved = saved.filter(x => x !== id);
                localStorage.setItem(STORAGE_KEYS.SAVED_TASBEEH, JSON.stringify(saved));
            }
            
            toast("Removed", "info");
            fetchAllBookmarks();
            if (type === "hadith") {
                document.querySelector("#hadith-search").dispatchEvent(new Event("input"));
            }
        }
    });

    fetchAllBookmarks();
}