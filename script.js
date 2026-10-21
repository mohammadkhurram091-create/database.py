"use strict";

/* ============================================================
   ZIKRNOOR — MODERN SCRIPT
   ============================================================
   - No dependencies
   - No HTML or CSS changes required
   - All existing IDs, classes, and localStorage keys preserved
   - Modern syntax: optional chaining, nullish coalescing
   - Web Animations API for smooth, CSS-free effects
   - Respects prefers-reduced-motion
   ============================================================ */

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------
const PREFERS_REDUCED_MOTION =
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

const STORAGE_KEYS = {
    SAVED_HADITH: "zikrnoor-saved-hadith",
    ROUTINE: "zikrnoor-routine",
};

// ---------------------------------------------------------------------------
// UTILITIES
// ---------------------------------------------------------------------------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function debounce(fn, delay = 200) {
    let timer = null;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

function animate(el, keyframes, options) {
    if (!el || PREFERS_REDUCED_MOTION) return null;
    try {
        return el.animate(keyframes, options);
    } catch {
        return null;
    }
}

function haptic(ms = 8) {
    if (PREFERS_REDUCED_MOTION) return;
    navigator.vibrate?.(ms);
}

/* Small fade-in animation for cards added to a result grid. */
function fadeInChildren(container, stagger = 40) {
    if (!container || PREFERS_REDUCED_MOTION) return;
    Array.from(container.children).forEach((child, i) => {
        child.animate(
            [
                { opacity: 0, transform: "translateY(8px)" },
                { opacity: 1, transform: "translateY(0)" },
            ],
            {
                duration: 350,
                delay: i * stagger,
                easing: "cubic-bezier(0.2, 0.8, 0.3, 1)",
                fill: "backwards",
            }
        );
    });
}

/* Pulse effect for the big counter number. */
function pulseCounter(el) {
    if (!el) return;
    animate(
        el,
        [
            { transform: "scale(1)", filter: "drop-shadow(0 0 24px rgba(215,182,109,0.3))" },
            { transform: "scale(1.08)", filter: "drop-shadow(0 0 40px rgba(215,182,109,0.65))" },
            { transform: "scale(1)", filter: "drop-shadow(0 0 24px rgba(215,182,109,0.3))" },
        ],
        { duration: 280, easing: "cubic-bezier(0.2, 0.8, 0.3, 1)" }
    );
}

/* Click-anywhere ripple effect for buttons. */
function attachRipple(root = document) {
    if (PREFERS_REDUCED_MOTION) return;
    root.addEventListener(
        "pointerdown",
        (event) => {
            const btn = event.target.closest("button, .primary-button");
            if (!btn) return;
            const rect = btn.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height) * 2;
            const span = document.createElement("span");
            Object.assign(span.style, {
                position: "absolute",
                left: `${event.clientX - rect.left - size / 2}px`,
                top: `${event.clientY - rect.top - size / 2}px`,
                width: `${size}px`,
                height: `${size}px`,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.18)",
                pointerEvents: "none",
                transform: "scale(0)",
                opacity: "1",
            });
            if (getComputedStyle(btn).position === "static") {
                btn.style.position = "relative";
            }
            btn.style.overflow = "hidden";
            btn.appendChild(span);
            span.animate(
                [
                    { transform: "scale(0)", opacity: "0.55" },
                    { transform: "scale(1)", opacity: "0" },
                ],
                { duration: 550, easing: "ease-out" }
            ).onfinish = () => span.remove();
        },
        { passive: true }
    );
}

/* Toast notification — dynamically injected, no CSS needed. */
function toast(message, kind = "info") {
    const palette = {
        info: { bg: "rgba(16, 27, 21, 0.95)", border: "rgba(215, 182, 109, 0.6)", fg: "#f5ddb0" },
        success: { bg: "rgba(16, 30, 22, 0.95)", border: "rgba(131, 184, 154, 0.7)", fg: "#a8d4bb" },
        warning: { bg: "rgba(30, 22, 16, 0.95)", border: "rgba(215, 182, 109, 0.6)", fg: "#f5ddb0" },
    };
    const { bg, border, fg } = palette[kind] ?? palette.info;

    const el = document.createElement("div");
    el.setAttribute("role", "status");
    el.textContent = message;
    Object.assign(el.style, {
        position: "fixed",
        bottom: "24px",
        right: "24px",
        padding: "12px 20px",
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: "12px",
        color: fg,
        fontSize: "14px",
        fontWeight: "600",
        boxShadow: "0 12px 40px rgba(0,0,0,0.55), 0 0 24px rgba(215,182,109,0.2)",
        zIndex: "9999",
        backdropFilter: "blur(12px)",
        opacity: "0",
        transform: "translateY(20px)",
        transition: "opacity 0.25s ease, transform 0.25s ease",
        pointerEvents: "none",
    });
    document.body.appendChild(el);

    requestAnimationFrame(() => {
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
    });

    setTimeout(() => {
        el.style.opacity = "0";
        el.style.transform = "translateY(20px)";
        setTimeout(() => el.remove(), 300);
    }, 2200);
}


// ---------------------------------------------------------------------------
// BOOT
// ---------------------------------------------------------------------------
function bootZikrnoor() {
    initTasbeeh();
    initQuran();
    initAdhkar();
    initHadith();
    initRoutine();
    attachRipple();
    attachSearchEscapeHandler();
    console.log(
        "%c[Zikrnoor]%c Ready — 5 modules loaded.",
        "color:#d7b66d;font-weight:800",
        "color:#83b89a"
    );
}

function attachSearchEscapeHandler() {
    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        const search = document.activeElement;
        if (search && search.matches("input[type='search'], input[type='text']")) {
            search.value = "";
            search.dispatchEvent(new Event("input", { bubbles: true }));
            search.blur();
        }
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootZikrnoor);
} else {
    bootZikrnoor();
}


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

    if (!zikrSelect || !targetSelect || !currentZikr || !countDisplay
        || !targetLabel || !progressTrack || !progressFill
        || !progressMsg || !countButton || !resetButton) {
        console.warn("[Zikrnoor] Tasbeeh elements missing — skipping.");
        return;
    }

    let count = 0;
    let targetCelebrated = false;

    const getTarget = () => Number(targetSelect.value) || 33;

    function updateDisplay({ animateNumber = false } = {}) {
        const target = getTarget();
        const pct = Math.min((count / target) * 100, 100);

        currentZikr.textContent  = zikrSelect.value;
        countDisplay.textContent = count;
        targetLabel.textContent  = `Target: ${target}`;

        progressFill.style.width = `${pct}%`;
        progressTrack.setAttribute("aria-valuemax", target);
        progressTrack.setAttribute("aria-valuenow", count);

        if (count >= target)      progressMsg.textContent = "Alhamdulillah! Your target is complete.";
        else if (count === 0)     progressMsg.textContent = "Your journey starts here.";
        else                      progressMsg.textContent = `${target - count} counts remaining. Keep going!`;

        if (animateNumber) pulseCounter(countDisplay);

        if (count >= target && !targetCelebrated) {
            targetCelebrated = true;
            haptic(30);
            toast("Target complete — Alhamdulillah!", "success");
        }
        if (count < target) targetCelebrated = false;
    }

    countButton.addEventListener("click", () => {
        count += 1;
        haptic(8);
        updateDisplay({ animateNumber: true });
    });

    resetButton.addEventListener("click", () => {
        count = 0;
        updateDisplay();
    });

    zikrSelect.addEventListener("change", () => updateDisplay());
    targetSelect.addEventListener("change", () => updateDisplay());

    updateDisplay();
}


// ---------------------------------------------------------------------------
// 2. QURAN
// ---------------------------------------------------------------------------
function initQuran() {
    const quranSearch  = $("#quran-search");
    const quranResults = $("#quran-results");
    const quranStatus  = $("#quran-status");

    if (!quranSearch || !quranResults || !quranStatus) {
        console.warn("[Zikrnoor] Quran elements missing — skipping.");
        return;
    }

    let surahs = [];
    let requestId = 0;
    const inFlight = new Map(); // number → AbortController

    async function loadQuran() {
        quranStatus.textContent = "Loading Quran...";
        quranResults.replaceChildren();
        try {
            const response = await fetch("https://api.alquran.cloud/v1/surah");
            if (!response.ok) throw new Error("Surah list unavailable");
            const result = await response.json();
            if (result.code !== 200) throw new Error("Invalid Quran response");
            surahs = result.data;
            quranStatus.textContent = "Search a Surah by name or number.";
        } catch (error) {
            quranStatus.textContent = "Quran could not be loaded. Check your connection.";
            console.error("[Zikrnoor] Quran error:", error);
        }
    }

    function renderSurahs() {
        const query = quranSearch.value.trim().toLowerCase();
        quranResults.replaceChildren();
        requestId++;

        if (!query) {
            quranStatus.textContent = "Search a Surah by name or number.";
            return;
        }

        const matches = surahs.filter(s =>
            [s.number, s.name, s.englishName, s.englishNameTranslation]
                .some(v => String(v ?? "").toLowerCase().includes(query))
        );

        const fragment = document.createDocumentFragment();
        matches.forEach(surah => {
            const card = document.createElement("article");
            card.className = "quran-card";

            const title = document.createElement("h3");
            title.textContent = `${surah.number}. ${surah.englishName}`;

            const details = document.createElement("p");
            details.textContent = `${surah.name} · ${surah.numberOfAyahs} Ayahs`;

            const button = document.createElement("button");
            button.type = "button";
            button.textContent = "Read Surah";

            const verses = document.createElement("div");
            verses.className = "quran-verses";
            verses.hidden = true;

            button.addEventListener("click", async () => {
                if (!verses.hidden) {
                    verses.hidden = true;
                    button.textContent = "Read Surah";
                    inFlight.get(surah.number)?.abort();
                    inFlight.delete(surah.number);
                    return;
                }
                closeOpenSurahs(verses);
                verses.hidden = false;
                button.textContent = "Close Surah";
                if (verses.dataset.loaded === "true") {
                    verses.scrollIntoView({ behavior: PREFERS_REDUCED_MOTION ? "auto" : "smooth", block: "nearest" });
                    return;
                }
                const currentRequest = ++requestId;
                await loadSurahVerses(surah.number, verses, currentRequest);
                verses.scrollIntoView({ behavior: PREFERS_REDUCED_MOTION ? "auto" : "smooth", block: "nearest" });
            });

            card.append(title, details, button, verses);
            fragment.appendChild(card);
        });

        quranResults.appendChild(fragment);
        fadeInChildren(quranResults);
        quranStatus.textContent = matches.length
            ? `${matches.length} Surah found`
            : "No Surah found. Try another name.";
    }

    function closeOpenSurahs(except = null) {
        quranResults.querySelectorAll(".quran-verses").forEach(verses => {
            if (verses === except) return;
            verses.hidden = true;
            const btn = verses.previousElementSibling;
            if (btn) btn.textContent = "Read Surah";
        });
    }

    async function loadSurahVerses(number, container, currentRequest) {
        container.textContent = "Loading verses...";
        const controller = new AbortController();
        inFlight.set(number, controller);
        try {
            const response = await fetch(
                `https://api.alquran.cloud/v1/surah/${number}/editions/quran-uthmani,en.sahih`,
                { signal: controller.signal }
            );
            if (!response.ok) throw new Error("Verses unavailable");
            const result = await response.json();
            if (result.code !== 200 || result.data.length < 2) {
                throw new Error("Invalid verse response");
            }
            if (currentRequest !== requestId || !container.isConnected) return;

            const [arabicSurah, englishSurah] = result.data;
            const fragment = document.createDocumentFragment();
            arabicSurah.ayahs.forEach((ayah, index) => {
                const verse = document.createElement("article");
                verse.className = "quran-ayah";

                const arabic = document.createElement("p");
                arabic.className = "quran-arabic";
                arabic.lang = "ar";
                arabic.dir = "rtl";
                arabic.textContent = `${ayah.text} ۝ ${ayah.numberInSurah}`;

                const translation = document.createElement("p");
                translation.textContent =
                    englishSurah.ayahs[index]?.text ?? "Translation unavailable.";

                verse.append(arabic, translation);
                fragment.appendChild(verse);
            });

            container.replaceChildren(fragment);
            container.dataset.loaded = "true";
            fadeInChildren(container, 6);
        } catch (error) {
            if (error.name === "AbortError") return;
            if (currentRequest !== requestId || !container.isConnected) return;
            container.textContent = "Verses could not be loaded. Please try again.";
            console.error("[Zikrnoor] Surah error:", error);
        } finally {
            inFlight.delete(number);
        }
    }

    quranSearch.addEventListener("input", debounce(renderSurahs, 180));

    document.addEventListener("click", event => {
        if (event.target.closest("#quran")) return;
        const nav = event.target.closest("nav a, nav button, .nav-link, [data-section]");
        if (!nav) return;
        requestId++;
        inFlight.forEach(c => c.abort());
        inFlight.clear();
        quranSearch.value = "";
        quranResults.replaceChildren();
        quranStatus.textContent = "Search a Surah by name or number.";
    });

    loadQuran();
}


// ---------------------------------------------------------------------------
// 3. DAILY ADHKAR
// ---------------------------------------------------------------------------
function initAdhkar() {
    const adhkarResults = $("#adhkar-results");
    const adhkarSearch  = $("#adhkar-search");
    const adhkarStatus  = $("#adhkar-status");
    const adhkarTabs    = $(".adhkar-controls");

    if (!adhkarResults || !adhkarSearch || !adhkarStatus || !adhkarTabs) {
        console.warn("[Zikrnoor] Adhkar elements missing — skipping.");
        return;
    }

    const adhkarData = [
        {
            title: "Morning and Evening Dua",
            times: ["morning", "evening"],
            arabic: "اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ",
            translation: "O Allah, by You we enter the morning and evening, by You we live and die, and to You is the resurrection.",
            target: 1,
            source: "Hisn al-Muslim 78",
            url: "https://sunnah.com/hisn:78",
        },
        {
            title: "Protection through Allah's Name",
            times: ["morning", "evening"],
            arabic: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
            translation: "In the name of Allah, with whose name nothing can cause harm on earth or in heaven. He is the All-Hearing, the All-Knowing.",
            target: 3,
            source: "Hisn al-Muslim 86",
            url: "https://sunnah.com/hisn:86",
        },
        {
            title: "Remembering Allah",
            times: ["morning", "evening"],
            arabic: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
            translation: "Glory be to Allah and praise be to Him.",
            target: 100,
            source: "Riyad as-Salihin 1451",
            url: "https://sunnah.com/riyadussalihin/15/44",
        },
    ];

    let activeTime = "morning";
    const adhkarCounts = {};

    function renderAdhkar() {
        const query = adhkarSearch.value.trim().toLowerCase();
        const items = adhkarData.filter(dua =>
            dua.times.includes(activeTime) &&
            `${dua.title} ${dua.translation}`.toLowerCase().includes(query)
        );

        adhkarResults.innerHTML = items.map(dua => {
            const id = adhkarData.indexOf(dua);
            const count = adhkarCounts[id] ?? 0;
            const done = count >= dua.target;
            return `
                <article class="adhkar-card">
                    <h3>${dua.title}</h3>
                    <p class="adhkar-arabic" lang="ar" dir="rtl">${dua.arabic}</p>
                    <p class="adhkar-translation">${dua.translation}</p>
                    <p>Read: ${count}/${dua.target}</p>
                    <progress value="${count}" max="${dua.target}"></progress>
                    <div class="adhkar-actions">
                        <button type="button" data-count="${id}" ${done ? "disabled" : ""}>
                            ${done ? "Completed ✓" : "Count +1"}
                        </button>
                        <button type="button" data-reset="${id}">Reset</button>
                    </div>
                    <a href="${dua.url}" target="_blank"
                        rel="noopener noreferrer">${dua.source} · Reference ↗</a>
                </article>
            `;
        }).join("");

        fadeInChildren(adhkarResults, 50);
        adhkarStatus.textContent = items.length
            ? `${items.length} Adhkar available`
            : "No matching Adhkar found.";
    }

    adhkarTabs.addEventListener("click", event => {
        const button = event.target.closest("[data-time]");
        if (!button) return;
        activeTime = button.dataset.time;
        adhkarTabs.querySelector(".active")?.classList.remove("active");
        button.classList.add("active");
        renderAdhkar();
    });

    adhkarSearch.addEventListener("input", debounce(renderAdhkar, 180));

    adhkarResults.addEventListener("click", event => {
        const countBtn = event.target.closest("[data-count]");
        const resetBtn = event.target.closest("[data-reset]");
        if (countBtn) {
            const id = countBtn.dataset.count;
            const dua = adhkarData[id];
            if (!dua) return;
            const prev = adhkarCounts[id] ?? 0;
            if (prev >= dua.target) return;
            adhkarCounts[id] = Math.min(prev + 1, dua.target);
            haptic(6);
            renderAdhkar();
            if (adhkarCounts[id] >= dua.target) {
                toast(`Completed: ${dua.title}`, "success");
            }
        } else if (resetBtn) {
            adhkarCounts[resetBtn.dataset.reset] = 0;
            renderAdhkar();
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

    if (!hadithResults || !hadithSearch || !hadithStatus
        || !savedButton || !hadithFilters) {
        console.warn("[Zikrnoor] Hadith elements missing — skipping.");
        return;
    }

    const hadiths = [
        {
            id: "bukhari-1",
            title: "Actions are judged by intentions",
            topic: "Intentions",
            narrator: "Umar ibn Al-Khattab (RA)",
            arabic: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ",
            translation: "The reward of deeds depends upon the intentions, and every person will get the reward according to what they intended.",
            source: "Sahih al-Bukhari 1",
            url: "https://sunnah.com/bukhari/1/1",
        },
        {
            id: "bukhari-13",
            title: "Wish good for others",
            topic: "Faith",
            narrator: "Anas (RA)",
            arabic: "لا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ",
            translation: "None of you will have faith till he wishes for his brother what he likes for himself.",
            source: "Sahih al-Bukhari 13",
            url: "https://sunnah.com/bukhari/2/6",
        },
    ];

    let activeTopic = "all";
    let showSaved = false;
    let savedHadith = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.SAVED_HADITH) ?? "[]"
    );

    function renderHadith() {
        const query = hadithSearch.value.trim().toLowerCase();
        const filtered = hadiths.filter(h => {
            const matchesText = [h.title, h.topic, h.narrator, h.translation, h.source]
                .some(t => t.toLowerCase().includes(query));
            const matchesTopic = activeTopic === "all"
                || h.topic.toLowerCase() === activeTopic;
            return matchesText && matchesTopic
                && (!showSaved || savedHadith.includes(h.id));
        });

        hadithResults.innerHTML = filtered.map(h => `
            <article class="hadith-card">
                <span class="hadith-topic">${h.topic}</span>
                <h3>${h.title}</h3>
                <p class="hadith-arabic" lang="ar" dir="rtl">${h.arabic}</p>
                <p class="hadith-translation">${h.translation}</p>
                <p class="hadith-source">Narrated by ${h.narrator}</p>
                <div class="hadith-actions">
                    <a class="hadith-source-link"
                       href="${h.url}" target="_blank"
                       rel="noopener noreferrer">${h.source} ↗</a>
                    <button type="button" data-save="${h.id}">
                        ${savedHadith.includes(h.id) ? "♥ Saved" : "♡ Save"}
                    </button>
                </div>
            </article>
        `).join("");

        fadeInChildren(hadithResults, 50);
        hadithStatus.textContent = filtered.length
            ? `${filtered.length} Hadith found`
            : "No matching Hadith found.";
    }

    hadithSearch.addEventListener("input", debounce(renderHadith, 180));

    hadithFilters.addEventListener("click", event => {
        const button = event.target.closest("[data-topic]");
        if (!button) return;
        activeTopic = button.dataset.topic;
        hadithFilters.querySelector(".active")?.classList.remove("active");
        button.classList.add("active");
        renderHadith();
    });

    savedButton.addEventListener("click", () => {
        showSaved = !showSaved;
        savedButton.classList.toggle("active", showSaved);
        savedButton.textContent = showSaved ? "♡ All Hadith" : "♡ Saved";
        renderHadith();
    });

    hadithResults.addEventListener("click", event => {
        const button = event.target.closest("[data-save]");
        if (!button) return;
        const id = button.dataset.save;
        const isSaving = !savedHadith.includes(id);
        savedHadith = isSaving
            ? [...savedHadith, id]
            : savedHadith.filter(s => s !== id);
        try {
            localStorage.setItem(STORAGE_KEYS.SAVED_HADITH, JSON.stringify(savedHadith));
        } catch (e) {
            console.warn("[Zikrnoor] Could not save hadith:", e);
        }
        haptic(6);
        toast(isSaving ? "Saved ♥" : "Removed from saved", isSaving ? "success" : "info");
        renderHadith();
    });

    renderHadith();
}


// ---------------------------------------------------------------------------
// 5. MY DAILY ROUTINE
// ---------------------------------------------------------------------------
function initRoutine() {
    const routineTasks        = $$(".routine-task");
    const routineProgressText = $("#routine-progress-text");
    const routineProgressFill = $("#routine-progress-fill");

    if (!routineTasks.length || !routineProgressText || !routineProgressFill) {
        console.warn("[Zikrnoor] Routine elements missing — skipping.");
        return;
    }

    const routineDate = new Date().toLocaleDateString("en-CA");
    let savedRoutine = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.ROUTINE) ?? "{}"
    );

    if (savedRoutine.date !== routineDate) {
        savedRoutine = { date: routineDate, completed: [] };
    }

    routineTasks.forEach((task, index) => {
        task.checked = savedRoutine.completed.includes(index);
        task.addEventListener("change", () => {
            savedRoutine.completed = routineTasks
                .map((item, i) => (item.checked ? i : -1))
                .filter(i => i !== -1);
            savedRoutine.date = routineDate;
            try {
                localStorage.setItem(STORAGE_KEYS.ROUTINE, JSON.stringify(savedRoutine));
            } catch (e) {
                console.warn("[Zikrnoor] Could not save routine:", e);
            }
            haptic(6);
            updateRoutineProgress();
        });
    });

    function updateRoutineProgress() {
        const total = routineTasks.length;
        const completed = routineTasks.filter(t => t.checked).length;
        const pct = total ? (completed / total) * 100 : 0;
        routineProgressText.textContent = `${completed} of ${total} completed`;
        routineProgressFill.style.width = `${pct}%`;

        if (completed === total && total > 0) {
            toast("Today's routine complete!", "success");
        }
    }

    updateProgressAnimations();
    updateRoutineProgress();
}

/* Smooth the routine progress fill (defensive — works even if CSS lacks transition). */
function updateProgressAnimations() {
    const el = document.querySelector("#routine-progress-fill");
    if (el && !el.style.transition) {
        el.style.transition = "width 0.4s cubic-bezier(0.2, 0.8, 0.3, 1)";
    }
}