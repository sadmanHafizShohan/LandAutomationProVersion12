// Disable all alert 
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

// verify log user with permission auto green feature
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
  // 📊 FLOATING STATUS BAR + MENU (COLLAPSIBLE)
  // ==========================================
  function createStatusBar() {
    if (document.getElementById('uscript-status-container')) return;
    
    const container = document.createElement('div');
    container.id = 'uscript-status-container';
    container.style.cssText = `
      position:fixed; bottom:80px; right:10px; z-index:99999;
      display:flex; flex-direction:column; align-items:flex-end; gap:8px;
    `;
    
    // Status message (hidden by default, expandable)
    const bar = document.createElement('div');
    bar.id = 'uscript-status';
    bar.style.cssText = `
      background:rgba(0,0,0,0.78); color:#fff; font-size:13px;
      padding:8px 14px; border-radius:8px; min-width:220px;
      font-family:monospace; line-height:1.7; pointer-events:auto;
      box-shadow:0 2px 10px rgba(0,0,0,0.4);
      max-height:0; overflow:hidden; transition:max-height 0.3s ease;
      opacity:0; transition:opacity 0.3s ease;
    `;
    
    // Dropdown menu (hidden by default)
    const menu = document.createElement('div');
    menu.id = 'uscript-menu';
    menu.style.cssText = `
      background:rgba(0,0,0,0.88); border-radius:8px;
      padding:8px 0; min-width:150px;
      box-shadow:0 4px 10px rgba(0,0,0,0.5);
      max-height:0; overflow:hidden; transition:max-height 0.3s ease;
      opacity:0; transition:opacity 0.3s ease; pointer-events:auto;
    `;
    menu.style.display = 'none';
    
    // Toggle button (always visible, small icon)
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'uscript-status-toggle';
    toggleBtn.innerText = '';
    toggleBtn.style.cssText = `
      width:10px; height:10px; padding:0; margin:0;
      background:rgba(0,0,0,0.78); color:#fff;
      border:2px solid #7ecfff; border-radius:50%;
      cursor:pointer; font-size:18px;
      box-shadow:0 2px 10px rgba(0,0,0,0.4);
      transition:all 0.3s ease; outline:none;
    `;
    
    container.appendChild(bar);
    container.appendChild(menu);
    container.appendChild(toggleBtn);
    document.body.appendChild(container);
    
    // Toggle functionality
    let isExpanded = false;
    toggleBtn.addEventListener('click', () => {
      isExpanded = !isExpanded;
      if (isExpanded) {
        bar.style.maxHeight = '300px';
        bar.style.opacity = '1';
        menu.style.maxHeight = '200px';
        menu.style.opacity = '1';
        menu.style.display = 'block';
        toggleBtn.style.borderColor = '#5dfc8a';
        toggleBtn.style.background = 'rgba(0,100,0,0.78)';
      } else {
        bar.style.maxHeight = '0';
        bar.style.opacity = '0';
        menu.style.maxHeight = '0';
        menu.style.opacity = '0';
        menu.style.display = 'none';
        toggleBtn.style.borderColor = '#7ecfff';
        toggleBtn.style.background = 'rgba(0,0,0,0.78)';
      }
    });
    
    // Store menu reference for button insertion
    window.uscriptMenu = menu;
  }

  function setStatus(msg, type = 'info') {
    const bar = document.getElementById('uscript-status');
    const toggleBtn = document.getElementById('uscript-status-toggle');
    if (!bar) return;
    const colors = { info: '#7ecfff', success: '#5dfc8a', error: '#ff6b6b', warn: '#ffc107' };
    bar.innerHTML = `
      <span style="color:${colors[type] || '#fff'}">● ${msg}</span>
    `;
    
    // Auto-expand on new message (optional: keep collapsed unless user expands)
    // Uncomment next 3 lines if you want auto-expand on status update
    // if (bar.style.maxHeight === '0px' || !bar.style.maxHeight) {
    //   bar.style.maxHeight = '300px'; bar.style.opacity = '1';
    // }
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
  // 9. UI BUTTONS (Inside Menu)
  // ==========================================
  function createButtons() {
    if (document.getElementById('auto-clicker-btn')) return;

    const style = document.createElement('style');
    style.textContent = `
      #auto-clicker-btn, #master-loop-btn { 
        display:block; width:100%; padding:10px 15px; text-align:left;
        background:none; color:#fff; border:none; cursor:pointer; font-size:13px;
        font-weight:500; transition:all 0.2s ease; border-left:3px solid transparent;
      }
      #auto-clicker-btn:hover { background:rgba(0,150,200,0.3); border-left-color:#7ecfff; }
      #master-loop-btn:hover { background:rgba(0,150,200,0.3); border-left-color:#5dfc8a; }
      #auto-clicker-btn.in-progress { background:rgba(255,193,7,0.2); color:#ffc107; }
      #auto-clicker-btn.completed { background:rgba(40,167,69,0.2); color:#5dfc8a; }
      #master-loop-btn.running { background:rgba(220,53,69,0.2); color:#ff6b6b; }
    `;
    document.head.appendChild(style);

    // Get the menu container
    const menu = window.uscriptMenu || document.getElementById('uscript-menu');
    if (!menu) return;

    // Create "Start" button
    state.triggerButton = document.createElement('button');
    state.triggerButton.id = 'auto-clicker-btn';
    state.triggerButton.innerText = '▶ ' + CFG.triggerBtnText;
    menu.appendChild(state.triggerButton);
    state.triggerButton.addEventListener('click', () => {
      if (state.triggerButton.classList.contains('completed')) resetButtonState();
      else if (!state.triggerButton.disabled && !state.isAutoRunning) runSingleCycle();
    });

    // Create "Auto Start" button
    state.loopButton = document.createElement('button');
    state.loopButton.id = 'master-loop-btn';
    state.loopButton.innerText = "▶ Auto Start";
    menu.appendChild(state.loopButton);
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
      localStorage.setItem('aep_authStatus', 'failed');
      return;
    }

    setStatus("ইউজার যাচাই হচ্ছে...", 'info');
    localStorage.setItem('aep_authStatus', 'checking');
    const authorizedUser = await waitForAuthorizedUser(allowedNames);

    if (!authorizedUser) {
      setStatus("❌ এই অ্যাকাউন্ট এর অনুমতি নেই।", 'error');
      localStorage.setItem('aep_authStatus', 'failed');
      return;
    }

    setStatus(`✅ স্বাগতম, ${authorizedUser}`, 'success');
    localStorage.setItem('aep_authStatus', 'success');
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

// Auto Copy button Address & Land Percentage
(function() {
    'use strict';

    // বাটন তৈরি করার জন্য একটি সাধারণ ফাংশন
    function createCopyButton(element, groupSelector, btnIdPrefix, index) {
        const btnId = btnIdPrefix + index;

        // বাটন আগে থেকে থাকলে নতুন করে বানাবে না
        if (document.getElementById(btnId)) return;

        const copyBtn = document.createElement('button');
        copyBtn.id = btnId;
        copyBtn.innerText = 'Copy to All';
        copyBtn.style.cssText = `
            display: inline-block;
            margin-top: 5px;
            margin-bottom: 10px;
            padding: 4px 8px;
            background-color: #12633D;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;

        // বক্সের ঠিক নিচে বাটনটি বসিয়ে দেওয়া হচ্ছে
        element.parentNode.insertBefore(copyBtn, element.nextSibling);

        // বাটনে ক্লিক করলে যা হবে
        copyBtn.addEventListener('click', function(e) {
            e.preventDefault();

            const textToCopy = element.value;
            const allTargetElements = document.querySelectorAll(groupSelector);
            let count = 0;

            allTargetElements.forEach(function(targetElement) {
                // যেই বক্সের বাটনে ক্লিক করা হয়েছে, সেটি বাদে বাকিগুলোতে পেস্ট করবে
                if (targetElement !== element) {
                    targetElement.value = textToCopy;
                    count++;
                }
            });

            // বাটনের টেক্সট পরিবর্তন করে কনফার্মেশন দেওয়া
            const originalText = copyBtn.innerText;
            copyBtn.innerText = 'Copied to ' + count + ' boxes!';
            copyBtn.style.backgroundColor = '#008CBA';

            // ২ সেকেন্ড পর আগের অবস্থায় ফেরত
            setTimeout(() => {
                copyBtn.innerText = originalText;
                copyBtn.style.backgroundColor = '#4CAF50';
            }, 2000);
        });
    }

    function addButtonsToAllFields() {
        // ১. ঠিকানা (Address) বক্সগুলোর জন্য
        const addressSelector = 'textarea[id^="ownerAddress"]';
        const addressTextareas = document.querySelectorAll(addressSelector);
        addressTextareas.forEach(function(textarea, index) {
            createCopyButton(textarea, addressSelector, 'btn-address-', index);
        });

        // ২. জমির অংশ (Land Percentage) বক্সগুলোর জন্য
        // এখানে name="owner[x][land_percentage]" সিলেক্ট করা হয়েছে কারণ সবগুলোর id সেম
        const percentageSelector = 'input[name*="[land_percentage]"]';
        const percentageInputs = document.querySelectorAll(percentageSelector);
        percentageInputs.forEach(function(input, index) {
            createCopyButton(input, percentageSelector, 'btn-percent-', index);
        });
    }

    // পেজ লোড হওয়ার পর বাটন অ্যাড করা
    window.addEventListener('load', function() {
        addButtonsToAllFields();
        // নতুন বক্স আসলে অটোমেটিক বাটন অ্যাড করার জন্য প্রতি ১ সেকেন্ড পর চেক করবে
        setInterval(addButtonsToAllFields, 1000);
    });

})();

// Enable Copy & Paste on Owner & Father Name
(function() {
    'use strict';

    // ইনপুট ফিল্ডগুলো খুঁজে বের করে কাস্টম ফিচার এনাবল করার ফাংশন
    function enableCustomFeatures() {
        // একাধিক আইডি সিলেক্ট করার সঠিক পদ্ধতি
        const selectors = '#owner-name, #verify-father-name, [name="owner-name"], [name="verify-father-name"]';
        const inputFields = document.querySelectorAll(selectors);

        inputFields.forEach(field => {
            // যদি আগে থেকেই এনাবল না করা থাকে
            if (!field.dataset.featuresEnabled) {

                // ১. Copy, Paste, Cut এবং Select ইভেন্ট আনব্লক করা
                ['copy', 'paste', 'cut', 'select', 'selectstart'].forEach(eventType => {
                    field.addEventListener(eventType, function(e) {
                        e.stopImmediatePropagation(); // অন্য স্ক্রিপ্টের বাধা কাটানো
                        return true;
                    }, true);
                });

                // ২. কিবোর্ড শর্টকাট (Ctrl+A, C, V, X) এবং Enter বাটন এনাবল করা
                field.addEventListener('keydown', function(e) {
                    // Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A এর কাজ
                    if ((e.ctrlKey || e.metaKey) && ['c', 'C', 'v', 'V', 'x', 'X', 'a', 'A'].includes(e.key)) {
                        e.stopImmediatePropagation();
                    }

                    // Enter বাটন প্রেস করলে এন্ট্রি বাটনে ক্লিক করানো
                    if (e.key === 'Enter') {
                        e.preventDefault(); // ডিফল্ট রিলোড বা ফর্ম সাবমিট বন্ধ রাখা
                        
                        // বাটনের আইডি দিয়ে তাকে সিলেক্ট করে ক্লিক করা
                        const entryButton = document.getElementById('entry-verify');
                        if (entryButton) {
                            entryButton.click();
                            console.log("Enter key pressed: 'এন্ট্রি করুন' button clicked.");
                        }
                    }
                }, true);

                // ৩. অনাকাঙ্ক্ষিত ইনলাইন ইভেন্ট হ্যান্ডলার রিমুভ করা
                field.onpaste = null;
                field.oncopy = null;
                field.oncut = null;
                field.onselect = null;
                field.onselectstart = null;

                // মার্ক করে রাখা যাতে বারবার একই কাজ না করে
                field.dataset.featuresEnabled = 'true';
                console.log("Copy, Paste, Select All & Enter Key enabled on: " + (field.id || field.name));
            }
        });
    }

    // পেজ লোড হওয়ার পর এবং ডাইনামিক ফিল্ডের জন্য ১ সেকেন্ড পরপর চেক করা
    setInterval(enableCustomFeatures, 1000);
})();

// auto comment ভূমি জরিপের ধরন/মালিকানা সূত্র সংশোধন করা হল if not available
(function() {
    'use strict';

    // ১. React বা Vue এর টেক্সটবক্সে জোর করে লেখা বসানোর ফাংশন (Hack)
    function setNativeValue(element, value) {
        const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
        const prototype = Object.getPrototypeOf(element);
        const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, "value").set;

        if (valueSetter && valueSetter !== prototypeValueSetter) {
            prototypeValueSetter.call(element, value);
        } else {
            valueSetter.call(element, value);
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // ২. আগের পেজের ডাটা চেক করে মেমোরিতে রাখা
    setInterval(() => {
        const h1Tags = document.querySelectorAll('h1');
        let shouldFill = false;

        for (let h1 of h1Tags) {
            if (h1.textContent.includes("ভূমি জরিপের ধরন:")) {
                // ভেতরের সব স্পেস এবং এন্টার মুছে চেক করবে
                let text = h1.textContent.replace("ভূমি জরিপের ধরন:", "").replace(/\s+/g, "");
                if (text === "") {
                    shouldFill = true;
                }
                break;
            }
        }

        if (shouldFill) {
            localStorage.setItem('fillCommentPlz', 'yes');
        } else {
            localStorage.removeItem('fillCommentPlz');
        }
    }, 500);

    // ৩. MutationObserver (পেজে Textarea আসামাত্রই চোখের পলকে লেখা বসিয়ে দেবে)
    const observer = new MutationObserver((mutations) => {
        if (localStorage.getItem('fillCommentPlz') === 'yes') {
            const textarea = document.querySelector('textarea[name="comments"]');

            if (textarea && textarea.value.trim() === "") {
                // React Hack ব্যবহার করে লেখা বসানো হচ্ছে
                setNativeValue(textarea, "ভূমি জরিপের ধরন/মালিকানা সূত্র সংশোধন করা হল");

                // কাজ শেষ, তাই মেমোরি ক্লিয়ার
                localStorage.removeItem('fillCommentPlz');
            }
        }
    });

    // পুরো পেজের যেকোনো পরিবর্তনের উপর নজর রাখা হচ্ছে
    observer.observe(document.body, { childList: true, subtree: true });

})();