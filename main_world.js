(function() {
    'use strict';
    
    // We check localStorage directly since we are in the main page world
    const siteKey = "smartSettings_" + location.hostname;
    
    try {
        const settingsStr = localStorage.getItem(siteKey);
        if (settingsStr) {
            const settings = JSON.parse(settingsStr);
            if (settings.disableAllAlerts) {
                console.log("[Smart Control] Disabling all alerts natively (Main World)");
                
                const noop = () => {};
                const yes = () => true;
                const empty = () => null;

                window.alert = noop;
                window.confirm = yes;
                window.prompt = empty;

                const disableAlerts = () => {
                    window.alert = noop;
                    window.confirm = yes;
                    window.prompt = empty;
                    document.querySelectorAll('iframe').forEach(f => {
                        try {
                            f.contentWindow.alert = noop;
                            f.contentWindow.confirm = yes;
                            f.contentWindow.prompt = empty;
                        } catch(e){}
                    });
                };

                disableAlerts();

                new MutationObserver(disableAlerts).observe(document, { childList: true, subtree: true });
            }
        }
    } catch(e) {
        console.error("Error reading smartSettings from localStorage in main_world", e);
    }
})();

// =====================================================================
// ➡️ RIGHT ARROW KEY - CLICK SONGSODHON BUTTON (Main World)
// =====================================================================
(function() {
    'use strict';

    const buttonSelector = "body > div.bg-\\[\\#EFF9F2\\].\\32 xl\\:container.mx-auto > div.w-full.h-auto.lg\\:px-5 > div.w-full.mt-3.flex.lg\\:px-5 > div.bg-white.w-full.lg\\:w-\\[75\\%\\].h-full.main-content.mb-3 > div.pb-4 > div.shadow-sm.mt-2.border.border-\\[\\#7ECBA1\\].bg-white.pb-2.rounded-tl-lg.rounded-tr-lg.rounded-bl-0.rounded-br-0.mx-5.p-3 > div.py-1.px-3.w-full.flex.flex-wrap.items-center.justify-between > a.flex.items-center.gap-1.bg-blue-600.py-1.px-3.rounded.w-\\[5em\\]";

    document.addEventListener('keydown', function(event) {
        // Check if Right Arrow key is pressed
        if (event.key !== "ArrowRight") return;

        // Get settings from localStorage
        const siteKey = "smartSettings_" + location.hostname;
        const settingsStr = localStorage.getItem(siteKey);
        
        if (!settingsStr) return;
        
        try {
            const settings = JSON.parse(settingsStr);
            if (!settings.rightArrowClickSongsodhon) return;
        } catch(e) {
            return;
        }

        // Don't trigger if user is typing in input or textarea
        const activeTag = document.activeElement.tagName.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea') {
            return;
        }

        // Prevent default right arrow behavior
        event.preventDefault();
        event.stopPropagation();

        // Find and click the button
        const targetButton = document.querySelector(buttonSelector);
        if (targetButton) {
            console.log("[RightArrow-MainWorld] ✅ Button Clicked Successfully!");
            targetButton.click();
        } else {
            console.log("[RightArrow-MainWorld] ❌ Button not found on this page.");
        }
    }, { passive: false });
})();

// =====================================================================
// 🎯 KHATIAN & LOG SAVER - ALL-IN-ONE AUTOMATION (Tampermonkey Integration)
// =====================================================================
// (function() {
//     'use strict';

//     // Check if this is log site where we want to add buttons
//     const isLogSite = window.location.href.includes('log.ldd4ig.org') && window.location.href.includes('DataEntry');
//     console.log('[Khatian-Loop] URL:', window.location.href, '| isLogSite:', isLogSite);

//     // --- Settings ---
//     const firstButtonText = "সব তথ্য ঠিক আছে";
//     const secondButtonText = "সংরক্ষণ করুন";
//     const delayBetweenClicks = 50;
//     const delayBetweenPhases = 500;
//     const triggerButtonText = "Start";

//     // Loop settings
//     const waitForDataTime = 8000; // Time to wait for data in loop (8 seconds)
//     const delayAfterSave = 3000; // Delay after save before moving to next number

//      // --- ১. ইংরেজি-বাংলা কনভার্টার ফাংশন (আপনার অরিজিনাল) ---
//     const enToBn = (str) => {
//         const banglaDigits = {'0':'০', '1':'১', '2':'২', '3':'৩', '4':'৪', '5':'৫', '6':'৬', '7':'৭', '8':'৮', '9':'৯'};
//         return str.toString().replace(/[0-9]/g, (digit) => banglaDigits[digit]);
//     };

//     const bnToEn = (str) => {
//         const englishDigits = {'০':'0', '১':'1', '২':'2', '৩':'3', '৪':'4', '৫':'5', '৬':'6', '৭':'7', '৮':'8', '৯':'9'};
//         return str.toString().replace(/[০-৯]/g, (digit) => englishDigits[digit]);
//     };

//     // --- 2. Khatian Increment Function ---
//     function incrementKhatian() {
//         console.log('[Increment] Starting increment process');
//         const input = document.querySelector('input[name="khatian_no"]');
        
//         if (!input) {
//             console.warn('[Increment] ❌ Khatian input field not found!');
//             return;
//         }

//         console.log('[Increment] Found input, current value:', input.value);
        
//         let currentVal = bnToEn(input.value);
//         console.log('[Increment] Converted to English:', currentVal);
        
//         let number = parseInt(currentVal) || 0;
//         console.log('[Increment] Parsed number:', number);
        
//         number++;
//         console.log('[Increment] Incremented to:', number);
        
//         input.value = enToBn(number.toString());
//         console.log('[Increment] Set value to:', input.value);

//         input.dispatchEvent(new Event('input', { bubbles: true }));
//         input.dispatchEvent(new Event('change', { bubbles: true }));

//         setTimeout(() => {
//             // Try multiple selectors for the search button
//             let searchBtn = null;
            
//             // Try 1: button.btn.btn-primary with text খুঁজুন
//             const buttons = document.querySelectorAll('button');
//             for (let btn of buttons) {
//                 if (btn.textContent.trim().includes('খুঁজুন')) {
//                     searchBtn = btn;
//                     break;
//                 }
//             }
            
//             // Try 2: Look for any button with খুঁজুন text
//             if (!searchBtn) {
//                 const allElements = document.querySelectorAll('button, a, input[type="button"], input[type="submit"]');
//                 for (let el of allElements) {
//                     if (el.textContent?.trim().includes('খুঁজুন') || el.value?.includes('খুঁজুন')) {
//                         searchBtn = el;
//                         break;
//                     }
//                 }
//             }
            
//             if (searchBtn) {
//                 console.log('[Increment] ✅ Found search button, clicking it');
//                 searchBtn.click();
//             } else {
//                 console.warn('[Increment] ❌ Search button "খুঁজুন" not found');
//             }
//         }, 100);
//     }

//     // --- 3. Input Event Listener (Auto Bangla Conversion) ---
//     document.addEventListener('input', function(e) {
//         if (e.target && e.target.name === 'khatian_no') {
//             e.target.value = enToBn(e.target.value);
//         }
//     }, true);

//     // --- 4. Wait Function ---
//     function wait(ms) {
//         return new Promise(resolve => setTimeout(resolve, ms));
//     }

//     // ==========================================
//     // Log Site Buttons & Automation Logic
//     // ==========================================

//     let triggerButton = null; // Single task button
//     let loopButton = null;    // Loop button
//     let isAutoRunning = false;

//     function createButtons() {
//         // Only create if we haven't created yet
//         if (document.getElementById('auto-clicker-btn')) return;
        
//         // Add CSS styles
//         const styleElement = document.createElement('style');
//         styleElement.textContent = `
//             /* Auto Clicker Button (upper) */
//             #auto-clicker-btn {
//                 position: fixed;
//                 bottom: 75px;
//                 right: 20px;
//                 z-index: 9999;
//                 padding: 10px 15px;
//                 background-color: #007bff;
//                 color: white;
//                 border: none;
//                 border-radius: 5px;
//                 cursor: pointer;
//                 font-size: 14px;
//                 box-shadow: 0 2px 5px rgba(0,0,0,0.2);
//             }
//             #auto-clicker-btn.in-progress { background-color: #ffc107; color: black; cursor: wait; }
//             #auto-clicker-btn.completed { background-color: #28a745; }

//             /* Master Loop Button (lower) */
//             #master-loop-btn {
//                 position: fixed;
//                 bottom: 20px;
//                 right: 20px;
//                 z-index: 99999;
//                 padding: 12px 20px;
//                 background-color: #17a2b8;
//                 color: white;
//                 border: none;
//                 border-radius: 5px;
//                 cursor: pointer;
//                 font-size: 15px;
//                 font-weight: bold;
//                 box-shadow: 0 2px 5px rgba(0,0,0,0.3);
//             }
//             #master-loop-btn.running { background-color: #dc3545; }
//         `;
//         document.head.appendChild(styleElement);

//         // Create auto clicker button
//         triggerButton = document.createElement('button');
//         triggerButton.id = 'auto-clicker-btn';
//         triggerButton.innerText = triggerButtonText;
//         document.body.appendChild(triggerButton);

//         triggerButton.addEventListener('click', () => {
//             if (triggerButton.classList.contains('completed')) {
//                 resetButtonState();
//             } else if (!triggerButton.disabled && !isAutoRunning) {
//                 runSingleCycle();
//             }
//         });

//         // Create master loop button
//         loopButton = document.createElement('button');
//         loopButton.id = 'master-loop-btn';
//         loopButton.innerText = "▶ Auto Start";
//         document.body.appendChild(loopButton);

//         loopButton.addEventListener('click', () => {
//             isAutoRunning = !isAutoRunning;
//             if (isAutoRunning) {
//                 loopButton.innerText = "⏹ স্টপ অটো লুপ (চলছে)";
//                 loopButton.classList.add('running');
//                 startMasterLoop(); // Start loop
//             } else {
//                 loopButton.innerText = "▶ Auto Start";
//                 loopButton.classList.remove('running');
//             }
//         });

//         console.log('[Khatian-Loop] ✅ Buttons created successfully');
//     }

//     // Wait for document to be ready before creating buttons
//     if (document.readyState === 'loading') {
//         document.addEventListener('DOMContentLoaded', () => {
//             if (isLogSite) createButtons();
//         });
//     } else {
//         // Document already loaded
//         if (isLogSite) createButtons();
//     }

//     function resetButtonState() {
//         if (!triggerButton) return;
//         triggerButton.innerText = triggerButtonText;
//         triggerButton.disabled = false;
//         triggerButton.classList.remove('in-progress', 'completed');
//     }

//     // --- Core Clicking Task (used in both single cycle and loop) ---
//     async function coreClickingTask() {
//         // Step 0: Select All Header
//         const expandHeader = document.querySelector('th.expand-cell-header[data-row-selection="true"]');
//         if (expandHeader) { expandHeader.click(); await wait(delayBetweenPhases); }

//         // Step 1: Click "সব তথ্য ঠিক আছে"
//         const firstBtns = Array.from(document.querySelectorAll('button, a, input'))
//                                .filter(el => el.innerText?.trim() === firstButtonText || el.value === firstButtonText);
//         for (const btn of firstBtns) {
//             try { btn.click(); if (delayBetweenClicks > 0) await wait(delayBetweenClicks); } catch (e) {}
//         }
//         await wait(delayBetweenPhases);

//         // Step 2: Click "সংরক্ষণ করুন"
//         const secondBtns = Array.from(document.querySelectorAll('button, a, input'))
//                                 .filter(el => el.innerText?.trim() === secondButtonText || el.value === secondButtonText);
//         for (const btn of secondBtns) {
//             try { btn.click(); if (delayBetweenClicks > 0) await wait(delayBetweenClicks); } catch (e) {}
//         }
//     }

//     // --- Single Automation Cycle ---
//     async function runSingleCycle() {
//         if (!triggerButton) return;
//         triggerButton.innerText = "কাজ চলছে...";
//         triggerButton.disabled = true;
//         triggerButton.classList.add('in-progress');

//         await coreClickingTask();

//         triggerButton.innerText = "রিসেট (সম্পন্ন)";
//         triggerButton.disabled = false;
//         triggerButton.classList.remove('in-progress');
//         triggerButton.classList.add('completed');
//     }

//     // --- Master Loop Automation Function ---
//     async function startMasterLoop() {
//         while (isAutoRunning) {
//             // 1. Increment khatian and search
//             incrementKhatian();
//             await wait(1000);

//             // 2. Wait for data to arrive
//             let waitedTime = 0;
//             let dataFound = false;
//             while (waitedTime < waitForDataTime) {
//                 if (!isAutoRunning) break;
//                 const btns = Array.from(document.querySelectorAll('button, a, input'))
//                                   .filter(el => el.innerText?.trim() === firstButtonText || el.value === firstButtonText);
//                 if (btns.length > 0) {
//                     dataFound = true;
//                     break;
//                 }
//                 await wait(500);
//                 waitedTime += 500;
//             }

//             if (!isAutoRunning) break;

//             // 3. If data found, tick and save
//             if (dataFound) {
//                 await coreClickingTask();
//                 await wait(delayAfterSave);
//             } else {
//                 await wait(1000);
//             }
//         }
//     }

//     // ==========================================
//     // 5. Keyboard & Mouse Listeners
//     // ==========================================

//     window.addEventListener('keydown', function(e) {
//         // ESC key - increment khatian
//         if (e.key === "Escape") {
//             e.preventDefault();
//             incrementKhatian();
//         }

//         // Space key - auto search & click
//         if (isLogSite && (e.key === ' ' || e.code === 'Space')) {
//             e.preventDefault();

//             if (triggerButton && triggerButton.classList.contains('in-progress')) return;
//             if (isAutoRunning) return; // Don't trigger space if loop is running

//             const searchBtn = document.querySelector('button[type="submit"], .btn-search, input[type="submit"]');
//             if (searchBtn) searchBtn.click();

//             if (triggerButton) {
//                 triggerButton.innerText = "সার্চ হচ্ছে...";
//                 triggerButton.disabled = true;
//                 triggerButton.classList.add('in-progress');
//             }

//             const checkInterval = setInterval(() => {
//                 const btns = Array.from(document.querySelectorAll('button, a, input'))
//                                   .filter(el => el.innerText?.trim() === firstButtonText || el.value === firstButtonText);
//                 if (btns.length > 0) {
//                     clearInterval(checkInterval);
//                     runSingleCycle();
//                 }
//             }, 500);

//             setTimeout(() => {
//                 clearInterval(checkInterval);
//                 if (triggerButton && triggerButton.innerText === "সার্চ হচ্ছে...") resetButtonState();
//             }, 10000);
//         }
//     });

//     // Mouse button 3 (Back button) - increment khatian
//     window.addEventListener('mousedown', function(e) {
//         if (e.button === 3) {
//             e.preventDefault();
//             incrementKhatian();
//         }
//     });

//     window.addEventListener('mouseup', function(e) {
//         if (e.button === 3) {
//             e.preventDefault();
//         }
//     });

// })();

(function () {
  'use strict';

   // ==========================================
  // 🚫 EARLY EXIT — শুধু log site এ চলবে
  // ==========================================
  if (!window.location.href.includes('log.ldd4ig.org')) return;
  // ==========================================
  // ⚙️ CONFIG
  // ==========================================
  const CFG = {
    scriptUrl: "https://script.google.com/macros/s/AKfycbzpTXJRm1wZS7R5nfYNhRziqi3pir0v3F5Md4keko4lTIrKk_B8WxtYttRvWa3jbj1d0A/exec",
    firstBtn:        "সব তথ্য ঠিক আছে",
    secondBtn:       "সংরক্ষণ করুন",
    triggerBtnText:  "Start",
    clickDelay:      50,
    phaseDelay:      500,
    waitForData:     8000,
    afterSaveDelay:  3000,
    authTimeout:     15000, // MutationObserver timeout (ms)
  };

  // ==========================================
  // 🗃️ CENTRAL STATE
  // ==========================================
  const state = {
    isAutoRunning:    false,
    listenersAttached: false,
    triggerButton:    null,
    loopButton:       null,
    successCount:     0,
    failCount:        0,
  };

  // ==========================================
  // 🔧 HELPERS
  // ==========================================
  const isLogSite = () =>
    window.location.href.includes('log.ldd4ig.org') &&
    window.location.href.includes('DataEntry');

  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  const cleanText = (str) =>
    str ? str.toLowerCase().replace(/\s+/g, ' ').trim() : "";

  const enToBn = (str) => str.toString().replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);
  const bnToEn = (str) => str.toString().replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d));

  // ==========================================
  // 📊 FLOATING STATUS BAR
  // ==========================================
  function createStatusBar() {
    if (document.getElementById('uscript-status')) return;
    const bar = document.createElement('div');
    bar.id = 'uscript-status';
    bar.style.cssText = `
      position:fixed; bottom:130px; right:10px; z-index:99999;
      background:rgba(0,0,0,0.78); color:#fff; font-size:13px;
      padding:8px 14px; border-radius:8px; min-width:220px;
      font-family:monospace; line-height:1.7; pointer-events:none;
      box-shadow:0 2px 10px rgba(0,0,0,0.4);
    `;
    document.body.appendChild(bar);
  }

  function setStatus(msg, type = 'info') {
    const bar = document.getElementById('uscript-status');
    if (!bar) return;
    const colors = { info: '#7ecfff', success: '#5dfc8a', error: '#ff6b6b', warn: '#ffc107' };
    bar.innerHTML = `
      <span style="color:${colors[type] || '#fff'}">● ${msg}</span>
    `;
  }

  // ==========================================
  // 1. FETCH ALLOWED NAMES
  // ==========================================
  async function fetchAllowedNames() {
    try {
      const res = await fetch(CFG.scriptUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const names = await res.json();
      return names.map(n => cleanText(n));
    } catch (err) {
      console.error("❌ নাম আনতে ব্যর্থ:", err);
      return [];
    }
  }

  // ==========================================
  // 2. EXTRACT USERNAME FROM EXACT ELEMENT
  //    #collasible-nav-dropdown > span
  //    "MD. HSASANUR RAHMAN,  Data Entry Operator …"
  //    → শুধু comma-র আগের অংশ নেওয়া হবে
  // ==========================================
  function extractUsernameFromNav() {
    const anchor = document.getElementById('collasible-nav-dropdown');
    if (!anchor) return null;
    const span = anchor.querySelector('span');
    if (!span || !span.textContent.trim()) return null;
    const raw = span.textContent.split(',')[0]; // comma-র আগে = নাম
    return cleanText(raw);
  }

  // ==========================================
  // 3. USER DETECTION — MutationObserver
  // ==========================================
  function waitForAuthorizedUser(allowedNames) {
    return new Promise((resolve) => {
      // প্রথমে একবার সরাসরি চেক
      const nameNow = extractUsernameFromNav();
      if (nameNow && allowedNames.includes(nameNow)) {
        return resolve(nameNow);
      }

      const navRoot = document.getElementById('responsive-navbar-nav') || document.body;
      const observer = new MutationObserver(() => {
        const name = extractUsernameFromNav();
        if (name && allowedNames.includes(name)) {
          observer.disconnect();
          clearTimeout(timer);
          resolve(name);
        }
      });

      observer.observe(navRoot, { childList: true, subtree: true, characterData: true });

      // Timeout — ১৫ সেকেন্ডের মধ্যে না পেলে null
      const timer = setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, CFG.authTimeout);
    });
  }

  // ==========================================
  // 4. KHATIAN INCREMENT
  // ==========================================
  function incrementKhatian() {
    const input = document.querySelector('input[name="khatian_no"]');
    if (!input) return;
    let num = parseInt(bnToEn(input.value)) || 0;
    input.value = enToBn((num + 1).toString());
    input.dispatchEvent(new Event('input',  { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    setTimeout(() => {
      const searchBtn = Array.from(document.querySelectorAll('button, a, input'))
        .find(el => el.textContent?.trim().includes('খুঁজুন') || el.value?.includes('খুঁজুন'));
      if (searchBtn) searchBtn.click();
    }, 100);
  }

  // ==========================================
  // 5. BUTTON FINDER HELPER (এক জায়গায়)
  // ==========================================
  const findBtnsByText = (text) =>
    Array.from(document.querySelectorAll('button, a, input'))
      .filter(el => el.innerText?.trim() === text || el.value === text);

  const hasFirstBtn = () => findBtnsByText(CFG.firstBtn).length > 0;

  // ==========================================
  // 6. CORE CLICKING TASK
  // ==========================================
  async function coreClickingTask() {
    const expandHeader = document.querySelector('th.expand-cell-header[data-row-selection="true"]');
    if (expandHeader) { expandHeader.click(); await wait(CFG.phaseDelay); }

    for (const btn of findBtnsByText(CFG.firstBtn)) {
      try { btn.click(); if (CFG.clickDelay > 0) await wait(CFG.clickDelay); } catch (e) {}
    }
    await wait(CFG.phaseDelay);

    for (const btn of findBtnsByText(CFG.secondBtn)) {
      try { btn.click(); if (CFG.clickDelay > 0) await wait(CFG.clickDelay); } catch (e) {}
    }
  }

  // ==========================================
  // 7. SINGLE CYCLE
  // ==========================================
  async function runSingleCycle() {
    if (!state.triggerButton) return;
    state.triggerButton.innerText = "কাজ চলছে...";
    state.triggerButton.disabled = true;
    state.triggerButton.classList.add('in-progress');
    setStatus("বাটন ক্লিক হচ্ছে...", 'info');

    await coreClickingTask();

    state.triggerButton.innerText = "রিসেট (সম্পন্ন)";
    state.triggerButton.disabled = false;
    state.triggerButton.classList.remove('in-progress');
    state.triggerButton.classList.add('completed');
    setStatus("সম্পন্ন!", 'success');
  }

  function resetButtonState() {
    if (!state.triggerButton) return;
    state.triggerButton.innerText = CFG.triggerBtnText;
    state.triggerButton.disabled = false;
    state.triggerButton.classList.remove('in-progress', 'completed');
  }

  // ==========================================
  // 8. MASTER AUTO LOOP — try/catch সহ
  // ==========================================
  async function startMasterLoop() {
    while (state.isAutoRunning) {
      try {
        incrementKhatian();
        setStatus("খতিয়ান বাড়ানো হয়েছে, ডাটার অপেক্ষা...", 'info');
        await wait(1000);

        let waited = 0, dataFound = false;
        while (waited < CFG.waitForData) {
          if (!state.isAutoRunning) break;
          if (hasFirstBtn()) { dataFound = true; break; }
          await wait(500);
          waited += 500;
        }

        if (!state.isAutoRunning) break;

        if (dataFound) {
          setStatus("ডাটা পাওয়া গেছে, সংরক্ষণ হচ্ছে...", 'warn');
          await coreClickingTask();
          state.successCount++;
          setStatus("সংরক্ষণ সম্পন্ন!", 'success');
          await wait(CFG.afterSaveDelay);
        } else {
          state.failCount++;
          setStatus("ডাটা পাওয়া যায়নি, পরের খতিয়ানে যাচ্ছি।", 'error');
          await wait(1000);
        }
      } catch (err) {
        state.failCount++;
        setStatus(`⚠️ Error: ${err.message} — চলতে থাকবে`, 'error');
        console.error("Loop error:", err);
        await wait(2000); // error হলে একটু থেমে আবার চলবে
      }
    }
    setStatus("অটো লুপ বন্ধ।", 'info');
  }

  // ==========================================
  // 9. UI BUTTONS
  // ==========================================
  function createButtons() {
    if (document.getElementById('auto-clicker-btn')) return;

    const style = document.createElement('style');
    style.textContent = `
      #auto-clicker-btn { position:fixed; bottom:75px; right:20px; z-index:9999; padding:10px 15px; background:#007bff; color:#fff; border:none; border-radius:5px; cursor:pointer; font-size:14px; box-shadow:0 2px 5px rgba(0,0,0,.2); }
      #auto-clicker-btn.in-progress { background:#ffc107; color:#000; cursor:wait; }
      #auto-clicker-btn.completed   { background:#28a745; }
      #master-loop-btn { position:fixed; bottom:20px; right:20px; z-index:99999; padding:12px 20px; background:#17a2b8; color:#fff; border:none; border-radius:5px; cursor:pointer; font-size:15px; font-weight:bold; box-shadow:0 2px 5px rgba(0,0,0,.3); }
      #master-loop-btn.running { background:#dc3545; }
    `;
    document.head.appendChild(style);

    state.triggerButton = document.createElement('button');
    state.triggerButton.id = 'auto-clicker-btn';
    state.triggerButton.innerText = CFG.triggerBtnText;
    document.body.appendChild(state.triggerButton);
    state.triggerButton.addEventListener('click', () => {
      if (state.triggerButton.classList.contains('completed')) resetButtonState();
      else if (!state.triggerButton.disabled && !state.isAutoRunning) runSingleCycle();
    });

    state.loopButton = document.createElement('button');
    state.loopButton.id = 'master-loop-btn';
    state.loopButton.innerText = "▶ Auto Start";
    document.body.appendChild(state.loopButton);
    state.loopButton.addEventListener('click', () => {
      state.isAutoRunning = !state.isAutoRunning;
      if (state.isAutoRunning) {
        state.loopButton.innerText = "⏹ স্টপ অটো লুপ (চলছে)";
        state.loopButton.classList.add('running');
        startMasterLoop();
      } else {
        state.loopButton.innerText = "▶ Auto Start";
        state.loopButton.classList.remove('running');
      }
    });
  }

  // ==========================================
  // 10. EVENT LISTENERS
  // ==========================================
  function setupEventListeners() {
    if (state.listenersAttached) return;

    document.addEventListener('input', e => {
      if (e.target?.name === 'khatian_no') e.target.value = enToBn(e.target.value);
    }, true);

    window.addEventListener('keydown', e => {
      if (!isLogSite()) return; // ← অন্য site এ কিছুই করবে না
      if (e.key === "Escape") { e.preventDefault(); incrementKhatian(); }

      if (isLogSite() && (e.key === ' ' || e.code === 'Space')) {
        e.preventDefault();
        if (state.triggerButton?.classList.contains('in-progress') || state.isAutoRunning) return;

        const searchBtn = document.querySelector('button[type="submit"], .btn-search, input[type="submit"]');
        if (searchBtn) searchBtn.click();
        if (state.triggerButton) {
          state.triggerButton.innerText = "সার্চ হচ্ছে...";
          state.triggerButton.disabled = true;
          state.triggerButton.classList.add('in-progress');
        }
        setStatus("সার্চ হচ্ছে...", 'info');

        const checkInterval = setInterval(() => {
          if (hasFirstBtn()) { clearInterval(checkInterval); runSingleCycle(); }
        }, 500);
        setTimeout(() => {
          clearInterval(checkInterval);
          if (state.triggerButton?.innerText === "সার্চ হচ্ছে...") resetButtonState();
        }, 10000);
      }
    });

    window.addEventListener('mousedown', e => { if (!isLogSite()) return; if (e.button === 3) { e.preventDefault(); incrementKhatian(); } });
    window.addEventListener('mouseup',   e => { if (!isLogSite()) return; if (e.button === 3) e.preventDefault(); });

    state.listenersAttached = true;
  }

  // ==========================================
  // 11. INIT
  // ==========================================
  async function initApp() {
    setStatus("অনুমোদিত নাম লোড হচ্ছে...", 'info');
    createStatusBar();

    const allowedNames = await fetchAllowedNames();
    if (allowedNames.length === 0) {
      setStatus("❌ এই অ্যাকাউন্ট এর অনুমতি নেই।", 'error');
      return;
    }

    setStatus("ইউজার যাচাই হচ্ছে...", 'info');
    const authorizedUser = await waitForAuthorizedUser(allowedNames);

    if (!authorizedUser) {
      setStatus("❌ এই অ্যাকাউন্ট এর অনুমতি নেই।", 'error');
      return;
    }

    setStatus(`✅ স্বাগতম, ${authorizedUser}`, 'success');
    console.log(`✅ Authorized: ${authorizedUser}`);

    if (isLogSite()) createButtons();
    setupEventListeners();

    // Site change হলে button দেখাও/লুকাও
    setInterval(() => {
      if (isLogSite()) {
        createButtons();
      } else {
        state.triggerButton?.remove(); state.triggerButton = null;
        state.loopButton?.remove();   state.loopButton   = null;
      }
    }, 2000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp);
  else initApp();

})();