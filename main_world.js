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
(function() {
    'use strict';

    // Check if this is log site where we want to add buttons
    const isLogSite = window.location.href.includes('log.ldd4ig.org') && window.location.href.includes('DataEntry');
    console.log('[Khatian-Loop] URL:', window.location.href, '| isLogSite:', isLogSite);

    // --- Settings ---
    const firstButtonText = "সব তথ্য ঠিক আছে";
    const secondButtonText = "সংরক্ষণ করুন";
    const delayBetweenClicks = 50;
    const delayBetweenPhases = 500;
    const triggerButtonText = "Start";

    // Loop settings
    const waitForDataTime = 8000; // Time to wait for data in loop (8 seconds)
    const delayAfterSave = 3000; // Delay after save before moving to next number

     // --- ১. ইংরেজি-বাংলা কনভার্টার ফাংশন (আপনার অরিজিনাল) ---
    const enToBn = (str) => {
        const banglaDigits = {'0':'০', '1':'১', '2':'২', '3':'৩', '4':'৪', '5':'৫', '6':'৬', '7':'৭', '8':'৮', '9':'৯'};
        return str.toString().replace(/[0-9]/g, (digit) => banglaDigits[digit]);
    };

    const bnToEn = (str) => {
        const englishDigits = {'০':'0', '১':'1', '২':'2', '৩':'3', '৪':'4', '৫':'5', '৬':'6', '৭':'7', '৮':'8', '৯':'9'};
        return str.toString().replace(/[০-৯]/g, (digit) => englishDigits[digit]);
    };

    // --- 2. Khatian Increment Function ---
    function incrementKhatian() {
        console.log('[Increment] Starting increment process');
        const input = document.querySelector('input[name="khatian_no"]');
        
        if (!input) {
            console.warn('[Increment] ❌ Khatian input field not found!');
            return;
        }

        console.log('[Increment] Found input, current value:', input.value);
        
        let currentVal = bnToEn(input.value);
        console.log('[Increment] Converted to English:', currentVal);
        
        let number = parseInt(currentVal) || 0;
        console.log('[Increment] Parsed number:', number);
        
        number++;
        console.log('[Increment] Incremented to:', number);
        
        input.value = enToBn(number.toString());
        console.log('[Increment] Set value to:', input.value);

        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));

        setTimeout(() => {
            // Try multiple selectors for the search button
            let searchBtn = null;
            
            // Try 1: button.btn.btn-primary with text খুঁজুন
            const buttons = document.querySelectorAll('button');
            for (let btn of buttons) {
                if (btn.textContent.trim().includes('খুঁজুন')) {
                    searchBtn = btn;
                    break;
                }
            }
            
            // Try 2: Look for any button with খুঁজুন text
            if (!searchBtn) {
                const allElements = document.querySelectorAll('button, a, input[type="button"], input[type="submit"]');
                for (let el of allElements) {
                    if (el.textContent?.trim().includes('খুঁজুন') || el.value?.includes('খুঁজুন')) {
                        searchBtn = el;
                        break;
                    }
                }
            }
            
            if (searchBtn) {
                console.log('[Increment] ✅ Found search button, clicking it');
                searchBtn.click();
            } else {
                console.warn('[Increment] ❌ Search button "খুঁজুন" not found');
            }
        }, 100);
    }

    // --- 3. Input Event Listener (Auto Bangla Conversion) ---
    document.addEventListener('input', function(e) {
        if (e.target && e.target.name === 'khatian_no') {
            e.target.value = enToBn(e.target.value);
        }
    }, true);

    // --- 4. Wait Function ---
    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ==========================================
    // Log Site Buttons & Automation Logic
    // ==========================================

    let triggerButton = null; // Single task button
    let loopButton = null;    // Loop button
    let isAutoRunning = false;

    function createButtons() {
        // Only create if we haven't created yet
        if (document.getElementById('auto-clicker-btn')) return;
        
        // Add CSS styles
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            /* Auto Clicker Button (upper) */
            #auto-clicker-btn {
                position: fixed;
                bottom: 75px;
                right: 20px;
                z-index: 9999;
                padding: 10px 15px;
                background-color: #007bff;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            }
            #auto-clicker-btn.in-progress { background-color: #ffc107; color: black; cursor: wait; }
            #auto-clicker-btn.completed { background-color: #28a745; }

            /* Master Loop Button (lower) */
            #master-loop-btn {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 99999;
                padding: 12px 20px;
                background-color: #17a2b8;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 15px;
                font-weight: bold;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            }
            #master-loop-btn.running { background-color: #dc3545; }
        `;
        document.head.appendChild(styleElement);

        // Create auto clicker button
        triggerButton = document.createElement('button');
        triggerButton.id = 'auto-clicker-btn';
        triggerButton.innerText = triggerButtonText;
        document.body.appendChild(triggerButton);

        triggerButton.addEventListener('click', () => {
            if (triggerButton.classList.contains('completed')) {
                resetButtonState();
            } else if (!triggerButton.disabled && !isAutoRunning) {
                runSingleCycle();
            }
        });

        // Create master loop button
        loopButton = document.createElement('button');
        loopButton.id = 'master-loop-btn';
        loopButton.innerText = "▶ Auto Start";
        document.body.appendChild(loopButton);

        loopButton.addEventListener('click', () => {
            isAutoRunning = !isAutoRunning;
            if (isAutoRunning) {
                loopButton.innerText = "⏹ স্টপ অটো লুপ (চলছে)";
                loopButton.classList.add('running');
                startMasterLoop(); // Start loop
            } else {
                loopButton.innerText = "▶ Auto Start";
                loopButton.classList.remove('running');
            }
        });

        console.log('[Khatian-Loop] ✅ Buttons created successfully');
    }

    // Wait for document to be ready before creating buttons
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (isLogSite) createButtons();
        });
    } else {
        // Document already loaded
        if (isLogSite) createButtons();
    }

    function resetButtonState() {
        if (!triggerButton) return;
        triggerButton.innerText = triggerButtonText;
        triggerButton.disabled = false;
        triggerButton.classList.remove('in-progress', 'completed');
    }

    // --- Core Clicking Task (used in both single cycle and loop) ---
    async function coreClickingTask() {
        // Step 0: Select All Header
        const expandHeader = document.querySelector('th.expand-cell-header[data-row-selection="true"]');
        if (expandHeader) { expandHeader.click(); await wait(delayBetweenPhases); }

        // Step 1: Click "সব তথ্য ঠিক আছে"
        const firstBtns = Array.from(document.querySelectorAll('button, a, input'))
                               .filter(el => el.innerText?.trim() === firstButtonText || el.value === firstButtonText);
        for (const btn of firstBtns) {
            try { btn.click(); if (delayBetweenClicks > 0) await wait(delayBetweenClicks); } catch (e) {}
        }
        await wait(delayBetweenPhases);

        // Step 2: Click "সংরক্ষণ করুন"
        const secondBtns = Array.from(document.querySelectorAll('button, a, input'))
                                .filter(el => el.innerText?.trim() === secondButtonText || el.value === secondButtonText);
        for (const btn of secondBtns) {
            try { btn.click(); if (delayBetweenClicks > 0) await wait(delayBetweenClicks); } catch (e) {}
        }
    }

    // --- Single Automation Cycle ---
    async function runSingleCycle() {
        if (!triggerButton) return;
        triggerButton.innerText = "কাজ চলছে...";
        triggerButton.disabled = true;
        triggerButton.classList.add('in-progress');

        await coreClickingTask();

        triggerButton.innerText = "রিসেট (সম্পন্ন)";
        triggerButton.disabled = false;
        triggerButton.classList.remove('in-progress');
        triggerButton.classList.add('completed');
    }

    // --- Master Loop Automation Function ---
    async function startMasterLoop() {
        while (isAutoRunning) {
            // 1. Increment khatian and search
            incrementKhatian();
            await wait(1000);

            // 2. Wait for data to arrive
            let waitedTime = 0;
            let dataFound = false;
            while (waitedTime < waitForDataTime) {
                if (!isAutoRunning) break;
                const btns = Array.from(document.querySelectorAll('button, a, input'))
                                  .filter(el => el.innerText?.trim() === firstButtonText || el.value === firstButtonText);
                if (btns.length > 0) {
                    dataFound = true;
                    break;
                }
                await wait(500);
                waitedTime += 500;
            }

            if (!isAutoRunning) break;

            // 3. If data found, tick and save
            if (dataFound) {
                await coreClickingTask();
                await wait(delayAfterSave);
            } else {
                await wait(1000);
            }
        }
    }

    // ==========================================
    // 5. Keyboard & Mouse Listeners
    // ==========================================

    window.addEventListener('keydown', function(e) {
        // ESC key - increment khatian
        if (e.key === "Escape") {
            e.preventDefault();
            incrementKhatian();
        }

        // Space key - auto search & click
        if (isLogSite && (e.key === ' ' || e.code === 'Space')) {
            e.preventDefault();

            if (triggerButton && triggerButton.classList.contains('in-progress')) return;
            if (isAutoRunning) return; // Don't trigger space if loop is running

            const searchBtn = document.querySelector('button[type="submit"], .btn-search, input[type="submit"]');
            if (searchBtn) searchBtn.click();

            if (triggerButton) {
                triggerButton.innerText = "সার্চ হচ্ছে...";
                triggerButton.disabled = true;
                triggerButton.classList.add('in-progress');
            }

            const checkInterval = setInterval(() => {
                const btns = Array.from(document.querySelectorAll('button, a, input'))
                                  .filter(el => el.innerText?.trim() === firstButtonText || el.value === firstButtonText);
                if (btns.length > 0) {
                    clearInterval(checkInterval);
                    runSingleCycle();
                }
            }, 500);

            setTimeout(() => {
                clearInterval(checkInterval);
                if (triggerButton && triggerButton.innerText === "সার্চ হচ্ছে...") resetButtonState();
            }, 10000);
        }
    });

    // Mouse button 3 (Back button) - increment khatian
    window.addEventListener('mousedown', function(e) {
        if (e.button === 3) {
            e.preventDefault();
            incrementKhatian();
        }
    });

    window.addEventListener('mouseup', function(e) {
        if (e.button === 3) {
            e.preventDefault();
        }
    });

})();

