// =====================================================================
// 🤖 LOG HOLDING ENTRY AUTOMATION ENGINE
// (Log Holding Entry Automation Online Control System - Merged)
// =====================================================================

// =============================
// Smart Network & Form Monitor
// =============================
const injectNetworkMonitor = () => {
  if (document.getElementById("auto-entry-net-monitor")) return;
  const script = document.createElement("script");
  script.id = "auto-entry-net-monitor";
  script.textContent = `
    (function() {
      const origFetch = window.fetch;
      window.fetch = async function(...args) {
        window.postMessage({ type: "AEP_AJAX_START" }, "*");
        try {
          const res = await origFetch.apply(this, args);
          window.postMessage({ type: "AEP_AJAX_END" }, "*");
          return res;
        } catch(e) {
          window.postMessage({ type: "AEP_AJAX_END" }, "*");
          throw e;
        }
      };

      const origXHR = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.send = function(...args) {
        window.postMessage({ type: "AEP_AJAX_START" }, "*");
        this.addEventListener('loadend', () => {
          window.postMessage({ type: "AEP_AJAX_END" }, "*");
        });
        return origXHR.apply(this, args);
      };
    })();
  `;
  (document.head || document.documentElement).appendChild(script);
};

try {
  injectNetworkMonitor();
} catch (e) {
  console.log(
    "[SCP Auto] Network monitor injection failed due to CSP, fallback to delay.",
  );
}

let _aep_activeAjaxCount = 0;
let _aep_lastAjaxResponseTime = Date.now();

window.addEventListener("message", (e) => {
  if (e.data?.type === "AEP_AJAX_START") {
    _aep_activeAjaxCount++;
  } else if (e.data?.type === "AEP_AJAX_END") {
    _aep_activeAjaxCount = Math.max(0, _aep_activeAjaxCount - 1);
    _aep_lastAjaxResponseTime = Date.now();
  }
});

// Smart Wait — Network Idle এর জন্য অপেক্ষা করে
async function aep_smartWait(fallbackDelay) {
  return new Promise((resolve) => {
    let waited = 0;
    const intervalTime = 100;
    let isSuccess = true;

    setTimeout(() => {
      const waitTimer = setInterval(() => {
        waited += intervalTime;

        const errorBoxes = document.querySelectorAll(
          ".swal2-container:not(.swal2-hidden), .toast, .alert, .text-danger",
        );
        for (const box of errorBoxes) {
          const text = box.innerText || "";
          if (box.classList.contains("swal2-container")) {
            if (
              text.includes("দুঃখিত") ||
              text.includes("ব্যর্থ") ||
              text.includes("পূর্বেই") ||
              text.includes("Failed") ||
              text.includes("Error")
            ) {
              isSuccess = false;
            }
            const swalOkBtn = box.querySelector(".swal2-confirm");
            if (swalOkBtn) swalOkBtn.click();
          } else if (text.includes("দুঃখিত") || text.includes("ব্যর্থ")) {
            isSuccess = false;
          }
        }

        if (
          _aep_activeAjaxCount === 0 &&
          Date.now() - _aep_lastAjaxResponseTime > 300
        ) {
          clearInterval(waitTimer);
          resolve(isSuccess);
        }
        if (waited > 10000) {
          clearInterval(waitTimer);
          resolve(isSuccess);
        }
      }, intervalTime);
    }, fallbackDelay);
  });
}

// Automation State
let aep_isPaused = false;
let aep_currentIndex = 0;
let aep_allLines = [];
let aep_delayTime = 500;
let aep_totalLines = 0;
let aep_failedRows = []; // Track failed rows

// Save automation state to chrome.storage
function aep_saveState() {
  chrome.storage.session.set({
    aep_currentIndex: aep_currentIndex,
    aep_totalLines: aep_totalLines,
    aep_isPaused: aep_isPaused,
    aep_delayTime: aep_delayTime,
  });
} 

async function aep_process() {
  console.log("[AEP] Starting aep_process with", aep_allLines.length, "lines");

  if (!aep_allLines || aep_allLines.length === 0) {
    console.warn("[AEP] No data to process!");
    return;
  }

const map =[
    { key: "নাম সংশোধন করা হলো", val: "zSkAKoGG2qrkc9qXy" },
    { key: "মালিকানার অংশের পরিমান সংশোধন করা হল", val: "W6tLZEKmvrSeoqKAv" },
    { key: "জমির পরিমান সংশোধন করা হল", val: "Jhi3G6gbYySAKZ9sj" },
    { key: "ঠিকানা সংশোধন করা হল", val: "o6waNSD9Zb2pT95tM" },
    { key: "দাগ নাম্বার সংশোধন করা হল", val: "N4kgTMGJ4aaL24BrY" },
    { key: "নাম ও দাগ সংশোধন করা হল", val: "CK4t2ZcJGgs7ZS8W9" },
    { key: "নাম ও জমির পরিমান সংশোধন করা হল", val: "8e34AzrX44pQKtuPt" },
    { key: "দাগ ও জমির পরিমান সংশোধন করা হল", val: "Xj8FqLTLBSRhdXCqw" },
    { key: "নাম ও মালিকানা অংশের পরিমান সংশোধন করা হল", val: "ans6pyczpBdfKrPpi" },
    { key: "ভূমি জরিপের ধরন/মালিকানা সূত্র সংশোধন করা হল", val: "6Eum7JSTbCombbTtF" },
    { key: "সর্বশেষ কর পরিশোধের সাল/ শুরুর সাল করা হল", val: "F8CRYXg28XtRLzMjt" },
    { key: "আগত খতিয়ান নং সংশোধন করা হল", val: "HYqew4of2Wu4CocEw" },
    { key: "মামলা নম্বর সংশোধন করা হল", val: "tLDiiHBq9ZHZgbafT" },
    { key: "আগত খতিয়ান নং ও নামজারি মামলা নম্বর সংশোধন করা হল", val: "wRnCu6Xg5qvRF3zAe" },
    { key: "দাগের মোট জমির পরিমান সংশোধন করা হল", val: "rS9NjWhZ9Yoeiu5B5" },
    { key: "জমির শ্রেনী সংশোধন করা হল", val: "P4SnHFKhmWcqjfrp7" }
  ];

  function findValue(comment) {
    for (let m of map) {
      if (comment.includes(m.key)) return m.val;
    }
    return "";
  }

  function setInput(el, val) {
    if (!el) return;
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    ).set;
    setter.call(el, val);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function setDropdown(select, value) {
    if (!select) return;
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  let runSuccessCount = 0;
  let runFailCount = 0;

  for (; aep_currentIndex < aep_allLines.length; aep_currentIndex++) {
    if (aep_isPaused) return;

    const rawRowText = aep_allLines[aep_currentIndex];
    const [h, k, c] = rawRowText.split(",");

    console.log("[AEP] Processing row", aep_currentIndex + 1, ":", {
      holding: h?.trim(),
      khatian: k?.trim(),
      comment: c?.trim(),
    });

    const hInput = document.querySelector('input[name="holding_no"]');
    const kInput = document.querySelector('input[name="khatian_no"]');
    const dropdown = document.querySelector(
      'select[title="সংশোধনের ধরন নির্বাচন করুন"]',
    );

    if (!hInput) console.warn("[AEP] Holding input not found!");
    if (!kInput) console.warn("[AEP] Khatian input not found!");
    if (!dropdown) console.warn("[AEP] Dropdown not found!");

    setInput(hInput, h?.trim());
    setInput(kInput, k?.trim());

    const val = findValue(c || "");
    
    // If comment key not found in map, mark as failed (missing data)
    if (!val) {
      console.log("[AEP] ⚠️ Comment key not found in map:", c?.trim());
      runFailCount++;
      aep_failedRows.push(rawRowText);
      chrome.runtime.sendMessage({
        type: "stats",
        sCount: runSuccessCount,
        fCount: runFailCount,
        newFailedRow: rawRowText,
      });
      chrome.storage.session.set({
        aep_sCount: runSuccessCount,
        aep_fCount: runFailCount,
        aep_failedRows: aep_failedRows,
      });
      continue; // Skip this row, move to next
    }
    
    setDropdown(dropdown, val);

    // Live data → popup
    setTimeout(() => {
      chrome.runtime.sendMessage({
        type: "current_data",
        h: h?.trim(),
        k: k?.trim(),
        c: c?.trim(),
      });
    }, 0);

    const buttons = document.querySelectorAll("button");
    let submitBtn = null;
    buttons.forEach((btn) => {
      if (btn.innerText.includes("সংরক্ষণ")) submitBtn = btn;
    });

    await new Promise((r) => setTimeout(r, Math.max(aep_delayTime / 2, 200)));

    let isSuccess = true;
    if (submitBtn) {
      submitBtn.click();
      isSuccess = await aep_smartWait(aep_delayTime);

      await new Promise((r) => {
        let waitedClear = 0;
        let checkTimer = setInterval(() => {
          const hClearCheck =
            document.querySelector('input[name="holding_no"]')?.value || "";
          const kClearCheck =
            document.querySelector('input[name="khatian_no"]')?.value || "";
          if (
            (hClearCheck.trim() === "" && kClearCheck.trim() === "") ||
            waitedClear >= 8000
          ) {
            clearInterval(checkTimer);
            r();
          }
          if (!isSuccess && waitedClear >= 3000) {
            clearInterval(checkTimer);
            r();
          }
          waitedClear += 200;
        }, 200);
      });
    } else {
      console.log("[SCP Auto] Submit button পাওয়া যায় নাই!");
      isSuccess = false;
      await new Promise((r) => setTimeout(r, aep_delayTime));
    }

    if (isSuccess) {
      runSuccessCount++;
      chrome.runtime.sendMessage({
        type: "stats",
        sCount: runSuccessCount,
        fCount: runFailCount,
      });
      // Save to storage
      chrome.storage.session.set({
        aep_sCount: runSuccessCount,
        aep_fCount: runFailCount,
      });
    } else {
      runFailCount++;
      aep_failedRows.push(rawRowText); // Add to failed rows array
      chrome.runtime.sendMessage({
        type: "stats",
        sCount: runSuccessCount,
        fCount: runFailCount,
        newFailedRow: rawRowText,
      });
      // Save to storage
      chrome.storage.session.set({
        aep_sCount: runSuccessCount,
        aep_fCount: runFailCount,
        aep_failedRows: aep_failedRows,
      });
    }

    chrome.runtime.sendMessage({ done: aep_currentIndex + 1 });
    aep_saveState();
  }

  const swalOk = document.querySelector(".swal2-confirm");
  if (swalOk) swalOk.click();

  
}

// ✅ Message Listener — Popup থেকে Start / Pause / Resume নেয়
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  try {
    if (msg.action === "start") {
      console.log(
        "[AEP] Received START message with",
        msg.data?.length || 0,
        "lines",
      );
      aep_allLines = msg.data || [];
      aep_currentIndex = 0;
      aep_isPaused = false;
      aep_delayTime = parseInt(msg.delay) || 500;
      aep_totalLines = aep_allLines.length;
      aep_failedRows = []; // Reset failed rows

      console.log("[AEP] Starting automation with delay:", aep_delayTime, "ms");
      console.log("[AEP] First few lines:", aep_allLines.slice(0, 3));

      // Save initial state
      aep_saveState();
      chrome.storage.session.set({
        aep_sCount: 0,
        aep_fCount: 0,
        aep_totalLines: aep_totalLines,
        aep_failedRows: [],
      });

      sendResponse({ success: true, linesReceived: aep_allLines.length });
      // Run async after response
      setTimeout(() => aep_process(), 100);
      return true; // Will respond asynchronously
    }
    if (msg.action === "pause") {
      console.log("[AEP] Received PAUSE message");
      aep_isPaused = true;
      aep_saveState();
      sendResponse({ success: true, paused: true });
      return true;
    }
    if (msg.action === "resume") {
      console.log("[AEP] Received RESUME message");
      aep_isPaused = false;
      aep_saveState();
      sendResponse({ success: true, resumed: true });
      // Run async after response
      setTimeout(() => aep_process(), 100);
      return true;
    }
    if (msg.action === "getState") {
      // Send current automation state to popup
      chrome.storage.session.get(
        [
          "aep_currentIndex",
          "aep_totalLines",
          "aep_sCount",
          "aep_fCount",
          "aep_isPaused",
          "aep_failedRows",
        ],
        (res) => {
          sendResponse({
            currentIndex: res.aep_currentIndex || 0,
            totalLines: res.aep_totalLines || 0,
            sCount: res.aep_sCount || 0,
            fCount: res.aep_fCount || 0,
            isPaused: res.aep_isPaused || false,
            failedRows: res.aep_failedRows || [],
          });
        },
      );
      return true; // Will respond asynchronously
    }
    if (msg.action === "clearFailedRows") {
      // Clear failed rows from storage
      aep_failedRows = [];
      chrome.storage.session.set({ aep_failedRows: [], aep_fCount: 0 });
      sendResponse({ success: true, cleared: true });
      return true;
    }
    if (msg.action === "resetAutomation") {
      // Reset all automation state
      aep_isPaused = false;
      aep_currentIndex = 0;
      aep_allLines = [];
      aep_delayTime = 500;
      aep_totalLines = 0;
      aep_failedRows = [];
      chrome.storage.session.clear();
      sendResponse({ success: true, reset: true });
      return true;
    }
  } catch (err) {
    console.error("[AEP] Error in message listener:", err);
    sendResponse({ success: false, error: err.message });
  }
});

// =====================================================================
// =====================================================================

// Smart Control Panel Pro + Data Manager - Combined Content Script
(function () {
  "use strict";

  // =====================================================================
  // ⚙️ CONFIGURATION
  // =====================================================================
  const siteKey = "smartSettings_" + location.hostname;

  // Auth Sheet URL — এটা আলাদা Google App Script (Auth + Login control)
  // তুমি নিজে এটা যেকোনো সময় পরিবর্তন করতে পারবে।
  const AUTH_SHEET_URL =
    "https://script.google.com/macros/s/AKfycbz5QpE_l22quO5P-5ZtRqTSD7egKbxSoUGq7BP2XgjEbdpkny8UsjIeqJ4ELVG8leBaeA/exec";

  // Payment Sheet URL — Deploy করা payment-sheet-code.gs এর URL
  // এখানে আপনার payment sheet এর deployed URL বসাবেন
  const PAYMENT_SHEET_URL =
    "https://script.google.com/macros/s/AKfycbwIBS2xQF7_uLtz8VHS8qADuaZq5BDQqXNk-F57rgIGM4wOm_J0M8ftZl3iwx7tmmHY/exec"; // আপনি এটা update করবেন deployed URL দিয়ে

  const defaultSettings = {
    altClick: false,
    escapeInc: false,
    enterClick: false,
    shareSplit: false,
    blockWindowClose: false,
    disableAllAlerts: false,
    autoClickDetails: false,
    darkMode: false,
    closeOtherTabs: false,
    closeCurrentTab: false,
    autoCleanInputs: false,
    enableBistaritoShortcut: false,
    autoYachaiClick: false,
    inputSync: false,
    autoClickSongsodhon: false,
    rightArrowClickSongsodhon: false,
    autoRedirectDetailsToEdit: false,
    showCorrectionIcon: false,
    enableYearSelector: false,
    surveyValue: "আর এস",
    sourceValue: "সর্বশেষ জরিপ অনুযায়ী",
    defaultAddress: " জামসিং, থানাঃ সাভার, ঢাকা।",
    khatianAutoIncrement: false,
    khatianForceSearch: false,
    khatianAutoClick: false,
    enableKhatianDownload: false,
    defaultYearShal: "",
    pinnedComments: [
      "নাম সংশোধন করা হলো",
      "মালিকানার অংশের পরিমান সংশোধন করা হল",
      "জমির পরিমান সংশোধন করা হল",
      "ঠিকানা সংশোধন করা হল",
      "দাগ নাম্বার সংশোধন করা হল",
      "নাম ও দাগ সংশোধন করা হল",
      "নাম ও জমির পরিমান সংশোধন করা হল",
      "দাগ ও জমির পরিমান সংশোধন করা হল",
      "নাম ও মালিকানা অংশের পরিমান সংশোধন করা হল",
      "ভূমি জরিপের ধরন/মালিকানা সূত্র সংশোধন করা হল",
      "সর্বশেষ কর পরিশোধের সাল/ শুরুর সাল করা হল",
      "আগত খতিয়ান নং সংশোধন করা হল",
      "মামলা নম্বর সংশোধন করা হল",
      "আগত খতিয়ান নং ও নামজারি মামলা নম্বর সংশোধন করা হল",
      "দাগের মোট জমির পরিমান সংশোধন করা হল",
      "জমির শ্রেনী সংশোধন করা হল",
      "",
      "",
      "",
      "",
    ],
  };

  let settings = JSON.parse(localStorage.getItem(siteKey)) || defaultSettings;
  if (!settings.pinnedComments || settings.pinnedComments.length !== 20) {
    // Update to new 20 comments if old or missing
    settings.pinnedComments = defaultSettings.pinnedComments;
  }

  // =====================================================================
  // 💳 SUBSCRIPTION RESTRICTION
  // =====================================================================
  // Free plan = only these features stay enabled, everything else forced OFF
  const FREE_ALLOWED_FEATURES = new Set([
    "altClick",
    "closeOtherTabs",
    "closeCurrentTab",
    "darkMode",
    "arrowKeyTextReplace",
  ]);

  function applySubscriptionRestrictions(subscription) {
    if (!subscription || subscription.toLowerCase() === "premium") return; // premium → no change
    // Free → disable ALL boolean features (including FREE_ALLOWED_FEATURES)
    Object.keys(settings).forEach((key) => {
      if (typeof settings[key] === "boolean") {
        settings[key] = false; // Force all toggles OFF for free users
      }
    });
    saveSettings();
  }

  // On page load, apply restriction based on stored subscription
  chrome.storage.local.get(["subscription"], (res) => {
    if (res.subscription) applySubscriptionRestrictions(res.subscription);
  });

  // Apply visual lock UI to shadow DOM switch cards for Free users
  function applyLockUI(shadow, subscription) {
    const isFree = !subscription || subscription.toLowerCase() !== "premium";
    const items = shadow.querySelectorAll(".scp-switch-item.scp-premium-only");
    items.forEach((item) => {
      // Remove old badges if re-applying
      const oldBadge = item.querySelector(".scp-lock-badge");
      if (oldBadge) oldBadge.remove();
      const oldPremiumBadge = item.querySelector(".scp-premium-badge");
      if (oldPremiumBadge) oldPremiumBadge.remove();

      if (isFree) {
        item.classList.add("scp-locked");
        const badge = document.createElement("span");
        badge.className = "scp-lock-badge";
        badge.textContent = "🔒 Premium কিনতে হবে";
        item.appendChild(badge);
      } else {
        item.classList.remove("scp-locked");
        const badge = document.createElement("span");
        badge.className = "scp-premium-badge";
        badge.textContent = "💎 Premium";
        item.appendChild(badge);
      }
    });

    // Apply lock to Data Tab
    const dataTabBtn = shadow.querySelector('.scp-tab-btn[data-tab="data"]');
    if (dataTabBtn) {
      const oldBadge = dataTabBtn.querySelector(".scp-lock-badge");
      if (oldBadge) oldBadge.remove();
      const oldPremiumBadge = dataTabBtn.querySelector(".scp-premium-badge");
      if (oldPremiumBadge) oldPremiumBadge.remove();

      if (isFree) {
        dataTabBtn.classList.add("scp-locked");
        const badge = document.createElement("span");
        badge.className = "scp-lock-badge";
        badge.style.marginLeft = "4px";
        badge.textContent = "🔒";
        dataTabBtn.appendChild(badge);
      } else {
        dataTabBtn.classList.remove("scp-locked");
        const badge = document.createElement("span");
        badge.className = "scp-premium-badge";
        badge.style.marginLeft = "4px";
        badge.style.marginTop = "0";
        badge.textContent = "💎";
        dataTabBtn.appendChild(badge);
      }
    }

    // Apply lock to Khatian Tab
    const khatianTabBtn = shadow.querySelector(
      '.scp-tab-btn[data-tab="khatian"]',
    );
    if (khatianTabBtn) {
      const oldBadge = khatianTabBtn.querySelector(".scp-lock-badge");
      if (oldBadge) oldBadge.remove();
      const oldPremiumBadge = khatianTabBtn.querySelector(".scp-premium-badge");
      if (oldPremiumBadge) oldPremiumBadge.remove();

      if (isFree) {
        khatianTabBtn.classList.add("scp-locked");
        const badge = document.createElement("span");
        badge.className = "scp-lock-badge";
        badge.style.marginLeft = "4px";
        badge.textContent = "🔒";
        khatianTabBtn.appendChild(badge);
      } else {
        khatianTabBtn.classList.remove("scp-locked");
        const badge = document.createElement("span");
        badge.className = "scp-premium-badge";
        badge.style.marginLeft = "4px";
        badge.style.marginTop = "0";
        badge.textContent = "💎";
        khatianTabBtn.appendChild(badge);
      }
    }
  }

  // =====================================================================
  // 🔗 AUTO REDIRECT DETAILS TO EDIT
  // =====================================================================
  if (settings.autoRedirectDetailsToEdit) {
    let currentUrl = window.location.href;
    if (currentUrl.includes("/holding/details/")) {
      let newUrl = currentUrl.replace("/holding/details/", "/holding/edit/");
      window.location.replace(newUrl);
    }
  }

  // =====================================================================
  // 🔗 SHOW CORRECTION ICON
  // =====================================================================
  if (settings.showCorrectionIcon) {
    let currentUrl = window.location.href;
    if (currentUrl.includes("/holding/details/")) {
      const icon = document.createElement("div");
      icon.innerHTML = "🔗";
      icon.title = "সংশোধন করুন";
      icon.style.cssText = `
                position: fixed;
                bottom: 30px;
                right: 30px;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: linear-gradient(135deg, #10b981, #059669);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                z-index: 2147483647;
                transition: transform 0.2s, box-shadow 0.2s;
            `;
      icon.onmouseover = () => {
        icon.style.transform = "scale(1.1)";
        icon.style.boxShadow = "0 6px 20px rgba(0,0,0,0.4)";
      };
      icon.onmouseout = () => {
        icon.style.transform = "scale(1)";
        icon.style.boxShadow = "0 4px 15px rgba(0,0,0,0.3)";
      };
      icon.onclick = () => {
        let newUrl = currentUrl.replace("/holding/details/", "/holding/edit/");
        window.location.href = newUrl;
      };
      document.body.appendChild(icon);
    }
  }

  // =====================================================================
  // 📊 DATA MANAGEMENT STATE
  // =====================================================================
  let collectedData = [];
  let dataSheetUrl = "";

  // স্টোরেজ থেকে data ও sheet URL লোড
  chrome.storage.local.get(["collectedData", "dataSheetUrl"], (result) => {
    if (result.collectedData) collectedData = result.collectedData;
    if (result.dataSheetUrl) dataSheetUrl = result.dataSheetUrl;
  });

  // =====================================================================
  // ✅ LOGIN RESULT EVENT - userId এবং userName Store করে
  // =====================================================================
  document.addEventListener('loginResult', (event) => {
    const result = event.detail;
    
    console.log("📡 Login Result received:", result);
    
    if (result.success) {
      // ✅ userId এবং userName store করুন (Data Collection এর জন্য)
      localStorage.setItem('userId', result.userId || 'user_default');
      localStorage.setItem('userName', result.userName || result.username || '');
      
      console.log("✅ userId & userName stored:");
      console.log("   - userId:", localStorage.getItem('userId'));
      console.log("   - userName:", localStorage.getItem('userName'));
    }
  });

  // =====================================================================
  // 🔧 UTILITY FUNCTIONS
  // =====================================================================
  function showToast(msg, isError = false) {
    const existing = document.querySelector(".scp-toast-notification");
    if (existing) existing.remove();
    const toast = document.createElement("div");
    toast.className = "scp-toast-notification";
    toast.style.cssText = `
            position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
            background: ${isError ? 'linear-gradient(135deg, #ff6b6b, #ee5a52)' : 'linear-gradient(135deg, #10b981, #059669)'};
            color: white;
            padding: 16px 28px; border-radius: 12px; font-size: 16px; font-weight: 700;
            z-index: 2147483647; box-shadow: 0 8px 25px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2);
            transition: opacity 0.5s; font-family: 'Inter', sans-serif;
            border: 2px solid ${isError ? '#ff5252' : '#00d084'};
            backdrop-filter: blur(10px);
            letter-spacing: 0.5px;
        `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 500);
    }, 4000);
  }

  function convertToBengali(str) {
    const eng = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    const ben = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
    return String(str).replace(/[0-9]/g, (m) => ben[eng.indexOf(m)]);
  }

  function saveData() {
    chrome.storage.local.set({ collectedData: collectedData });
  }

  // =====================================================================
  // ✅ DEBUG FUNCTION - localStorage data check করতে console এ কল করুন
  // =====================================================================
  window.debugStorageData = function() {
    console.log("===== STORED AUTH DATA =====");
    console.log("isLoggedIn:", localStorage.getItem('isLoggedIn'));
    console.log("username:", localStorage.getItem('username'));
    console.log("userId:", localStorage.getItem('userId'));
    console.log("userName:", localStorage.getItem('userName'));
    console.log("subscription:", localStorage.getItem('subscription'));
    console.log("dataSheetUrl:", localStorage.getItem('dataSheetUrl'));
    console.log("=======================");
    
    // Chrome storage থেকেও check করুন
    chrome.storage.local.get(["userId", "userName", "authUser"], (res) => {
      console.log("===== CHROME STORAGE =====");
      console.log("chrome.userId:", res.userId);
      console.log("chrome.userName:", res.userName);
      console.log("chrome.authUser:", res.authUser);
      console.log("=======================");
    });
  };
  
  console.log("✅ Extension: debugStorageData() available in console");

  // =====================================================================
  // 🔐 AUTH SYSTEM — Device Lock সহ
  // =====================================================================
  async function getDeviceId() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["deviceId"], (res) => {
        if (res.deviceId) {
          resolve(res.deviceId);
        } else {
          const newId =
            "DEV-" + Math.random().toString(36).substr(2, 9).toUpperCase();
          chrome.storage.local.set({ deviceId: newId });
          resolve(newId);
        }
      });
    });
  }

  async function verifyAuth(username, password) {
    const deviceId = await getDeviceId();
    
    // Get extension version from chrome.storage (set by background script)
    let extensionVersion = '0.0';
    try {
      const stored = await new Promise((resolve) => {
        chrome.storage.local.get('extensionVersion', resolve);
      });
      extensionVersion = stored.extensionVersion || '0.0';
      console.log('Extension version:', extensionVersion);
    } catch (e) {
      console.warn('Could not read extension version:', e);
    }
    
    const url =
      AUTH_SHEET_URL +
      "?action=login" +
      "&username=" +
      encodeURIComponent(username) +
      "&password=" +
      encodeURIComponent(password) +
      "&deviceId=" +
      encodeURIComponent(deviceId) +
      "&extensionVersion=" +
      encodeURIComponent(extensionVersion) +
      "&t=" +
      Date.now();

    const response = await fetch(url, { cache: "no-store" });
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error("AUTH_SCRIPT_MISCONFIGURED");
    }
    return data;
  }

  async function doLogout() {
    try {
      const stored = await new Promise((resolve) =>
        chrome.storage.local.get(["authUser", "deviceId"], resolve),
      );
      if (stored.authUser && stored.deviceId) {
        const logoutUrl =
          AUTH_SHEET_URL +
          "?action=logout" +
          "&username=" +
          encodeURIComponent(stored.authUser) +
          "&deviceId=" +
          encodeURIComponent(stored.deviceId) +
          "&t=" +
          Date.now();
        await fetch(logoutUrl, { cache: "no-store" }).catch(() => {});
      }
    } catch (_) {}

    chrome.storage.local.set({ isLoggedIn: false, authUser: "", authPass: "" });
    // Login UI দেখাও
    showLoginOverlay("");
  }

  // =====================================================================
  // 🔐 LOGIN OVERLAY UI
  // =====================================================================
  function showLoginOverlay(errorMsg, reason = null) {
    // যদি আগে থেকে থাকে, সরাও
    const existing = document.getElementById("scp-login-overlay");
    if (existing) existing.remove();
    
    // Hide settings icon when showing login overlay
    const wrapper = document.querySelector("#scp-shadow-host")?.shadowRoot?.getElementById("scp-wrapper");
    if (wrapper) wrapper.style.display = "none";
    const ownerBtn = document.querySelector("#scp-shadow-host")?.shadowRoot?.getElementById("scp-owner-btn");
    if (ownerBtn) ownerBtn.style.display = "none";

    const overlay = document.createElement("div");
    overlay.id = "scp-login-overlay";
    overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 2147483646;
            background: rgba(0,0,0,0.7); display: flex;
            justify-content: center; align-items: center;
            font-family: 'Inter', sans-serif; backdrop-filter: blur(4px);
        `;
    
    // ✅ নতুন - Expired reason চেক করে Buy Subscription button show করো
    const showBuyBtn = reason === 'expired';
    
    overlay.innerHTML = `
            <div style="
                background: #1a1a2e; border-radius: 16px; padding: 32px 28px;
                width: 320px; box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                border: 1px solid rgba(255,255,255,0.1); display: flex;
                flex-direction: column; gap: 14px;
            ">
                <h3 style="margin:0; color:#fff; font-size:18px; text-align:center;">🔐 Extension Login</h3>
                <p id="scp-login-msg" style="
                    margin:0; font-size:12px; color: ${errorMsg ? "#ff6b6b" : "transparent"};
                    text-align:center; min-height:18px; font-weight:600;
                ">${errorMsg || " "}</p>
                <input type="text" id="scp-login-user" placeholder="Username" autocomplete="off" style="
                    padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15);
                    background: rgba(255,255,255,0.07); color: #fff; font-size: 14px; outline: none;
                    ${showBuyBtn ? 'display:none;' : ''}
                ">
                <input type="password" id="scp-login-pass" placeholder="Password" autocomplete="off" style="
                    padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15);
                    background: rgba(255,255,255,0.07); color: #fff; font-size: 14px; outline: none;
                    ${showBuyBtn ? 'display:none;' : ''}
                ">
                <button id="scp-login-btn" style="
                    padding: 11px; border-radius: 8px; border: none;
                    background: linear-gradient(135deg, #10b981, #059669); color: white;
                    font-size: 14px; font-weight: 700; cursor: pointer; transition: opacity 0.2s;
                    ${showBuyBtn ? 'display:none;' : ''}
                ">Login</button>
                
                ${showBuyBtn ? `
                <button id="scp-buy-subscription-btn" style="
                    padding: 11px; border-radius: 8px; border: none;
                    background: linear-gradient(135deg, #f59e0b, #d97706); color: white;
                    font-size: 14px; font-weight: 700; cursor: pointer; transition: opacity 0.2s;
                    display: flex; align-items: center; justify-content: center; gap: 6px;
                ">
                    💳 সাবস্ক্রিপশন কিনুন
                </button>
                <p style="
                    margin:0; font-size:11px; color: #cbd5e1;
                    text-align:center; line-height:1.4;
                    border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;
                ">
                    আপনার সাবস্ক্রিপশন মেয়াদ শেষ হয়েছে।<br>
                    নতুন সাবস্ক্রিপশন কিনতে উপরের বাটন ক্লিক করুন।
                </p>
                ` : ''}
            </div>
        `;
    document.body.appendChild(overlay);

    const loginBtn = document.getElementById("scp-login-btn");
    if (loginBtn) {
      document
        .getElementById("scp-login-pass")
        .addEventListener("keydown", (e) => {
          if (e.key === "Enter") handleLogin();
        });
      loginBtn.onclick = handleLogin;
    }
    
    // ✅ নতুন - Buy Subscription button click handler
    const buyBtn = document.getElementById("scp-buy-subscription-btn");
    if (buyBtn) {
      buyBtn.onclick = () => {
        console.log("[SCP] Opening payment modal...");
        // ✅ Global payment modal function call করো
        window.openPaymentModal(null);
        // Login overlay hide করো যাতে payment modal দেখা যায়
        const loginOverlay = document.getElementById("scp-login-overlay");
        if (loginOverlay) loginOverlay.style.display = "none";
      };
    }
  }

  async function handleLogin() {
    const user = document.getElementById("scp-login-user")?.value.trim();
    const pass = document.getElementById("scp-login-pass")?.value.trim();
    const btn = document.getElementById("scp-login-btn");
    const msgEl = document.getElementById("scp-login-msg");

    if (!user || !pass) {
      if (msgEl) {
        msgEl.style.color = "#ff6b6b";
        msgEl.textContent = "Username ও Password দিন।";
      }
      return;
    }

    if (btn) {
      btn.textContent = "Logging in...";
      btn.disabled = true;
    }
    if (msgEl) {
      msgEl.style.color = "transparent";
      msgEl.textContent = " ";
    }

    try {
      const result = await verifyAuth(user, pass);

      if (result.success) {
        const sub = result.subscription || "Free";
        const autoJachai = result.autoJachai || "OFF";
        const userDataSheetUrl = result.dataSheetUrl || "";
        
        // ✅ নতুন - userId, userName এবং expireDate localStorage এ save করুন
        const userId = result.userId || 'user_default';
        const userName = result.userName || result.username || '';
        const expireDate = result.expireDate || 'N/A';
        
        chrome.storage.local.set({
          isLoggedIn: true,
          authUser: user,
          authPass: pass,
          subscription: sub,
          autoJachai: autoJachai,
          dataSheetUrl: userDataSheetUrl,
          userId: userId,           // ✅ নতুন
          userName: userName,       // ✅ নতুন
          expireDate: expireDate,   // ✅ নতুন - Expire date store করুন
        });
        
        // localStorage তেও store করুন (sendToSheet এ ব্যবহারের জন্য)
        localStorage.setItem('userId', userId);
        localStorage.setItem('userName', userName);
        localStorage.setItem('expireDate', expireDate);
        
        console.log("[SCP] ✅ Auth successful - userId:", userId, "expireDate:", expireDate);
        
        applySubscriptionRestrictions(sub);
        const overlay = document.getElementById("scp-login-overlay");
        if (overlay) overlay.remove();
        
        // ✅ Show settings icon after successful login
        const wrapper = document.querySelector("#scp-shadow-host")?.shadowRoot?.getElementById("scp-wrapper");
        if (wrapper) wrapper.style.display = "block";
        const ownerBtn = document.querySelector("#scp-shadow-host")?.shadowRoot?.getElementById("scp-owner-btn");
        if (ownerBtn) ownerBtn.style.display = "block";
        
        // Update lock UI in settings panel
        const host = document.getElementById("scp-shadow-host");
        if (host && host.shadowRoot) applyLockUI(host.shadowRoot, sub);
        if (result.message) showToast(result.message);
      } else {
        let displayMsg = result.message || "Login failed.";
        if (result.reason === "disabled") displayMsg = "🚫 " + displayMsg;
        else if (result.reason === "expired") displayMsg = "⏳ " + displayMsg;
        else if (result.reason === "device_locked")
          displayMsg = "🔒 " + displayMsg;
        else if (result.reason === "version_mismatch")
          displayMsg = "🔄 " + displayMsg;
        if (msgEl) {
          msgEl.style.color = "#ff6b6b";
          msgEl.textContent = displayMsg;
        }
        
        // ✅ নতুন - যদি expired হয়, তাহলে login overlay পুনরায় তৈরি করো buy button সহ
        if (result.reason === "expired") {
          console.log("[SCP] Subscription expired - showing buy button");
          // Overlay rebuild করো reason সহ
          const overlay = document.getElementById("scp-login-overlay");
          if (overlay) overlay.remove();
          showLoginOverlay(displayMsg, result.reason);
          // Early return যাতে নিচের code run না হয়
          if (btn) {
            btn.textContent = "Login";
            btn.disabled = false;
          }
          return;
        }
      }
    } catch (err) {
      if (msgEl) {
        msgEl.style.color = "#ff6b6b";
        msgEl.textContent =
          err.message === "AUTH_SCRIPT_MISCONFIGURED"
            ? "⚠️ Auth Script Error: Check deployment."
            : "⚠️ Network error. Check internet.";
      }
    }

    if (btn) {
      btn.textContent = "Login";
      btn.disabled = false;
    }
  }

  // =====================================================================
  // 🔐 AUTH INIT — Page load এ auth check করে
  // =====================================================================
  function checkAuthAndInit() {
    chrome.storage.local.get(
      ["isLoggedIn", "authUser", "authPass"],
      async (stored) => {
        if (!stored.isLoggedIn || !stored.authUser || !stored.authPass) {
          showLoginOverlay("");
          return;
        }

        // আগে লগইন ছিল → সাথে সাথে UI দেখাও, background এ verify করো
        // (UI is already injected by injectUI() call in DOM ready)

        // Background silent validation
        try {
          const result = await verifyAuth(stored.authUser, stored.authPass);
          if (!result.success) {
            let msg = result.message || "Session expired.";
            if (result.reason === "disabled") msg = "🚫 " + msg;
            else if (result.reason === "expired") msg = "⏳ " + msg;
            else if (result.reason === "device_locked") msg = "🔒 " + msg;
            else if (result.reason === "version_mismatch") msg = "🔄 " + msg;
            chrome.storage.local.set({
              isLoggedIn: false,
              authUser: "",
              authPass: "",
            });
            // ✅ নতুন - reason pass করো যাতে Buy Subscription button দেখা যায়
            showLoginOverlay(msg, result.reason);
          } else {
            // ✅ Login successful - show settings icon
            const wrapper = document.querySelector("#scp-shadow-host")?.shadowRoot?.getElementById("scp-wrapper");
            if (wrapper) wrapper.style.display = "block";
            const ownerBtn = document.querySelector("#scp-shadow-host")?.shadowRoot?.getElementById("scp-owner-btn");
            if (ownerBtn) ownerBtn.style.display = "block";
            
            // Refresh subscription on each page load verify
            const sub = result.subscription || "Free";
            const autoJachai = result.autoJachai || "OFF";
            const userDataSheetUrl = result.dataSheetUrl || "";
            
            // ✅ নতুন - userId, userName এবং expireDate store করুন
            const userId = result.userId || 'user_default';
            const userName = result.userName || stored.authUser || '';
            const expireDate = result.expireDate || 'N/A';
            
            chrome.storage.local.set({
              subscription: sub,
              autoJachai: autoJachai,
              dataSheetUrl: userDataSheetUrl,
              userId: userId,        // ✅ নতুন
              userName: userName,    // ✅ নতুন
              expireDate: expireDate,// ✅ নতুন - Expire date store করুন
            });
            
            // localStorage তেও store করুন
            localStorage.setItem('userId', userId);
            localStorage.setItem('userName', userName);
            localStorage.setItem('expireDate', expireDate);
            
            console.log("[SCP] ✅ Auth verified - userId:", userId, "expireDate:", expireDate);
            
            applySubscriptionRestrictions(sub);

            // Update UI badges if subscription refreshed
            const host = document.getElementById("scp-shadow-host");
            if (host && host.shadowRoot) applyLockUI(host.shadowRoot, sub);

            // Show custom message from Column C on every page reload
            if (result.message) showToast(result.message);
          }
        } catch (err) {
          // Network error → keep logged in (graceful fallback)
          console.warn("[SCP] Silent auth check failed:", err.message);
          // Still show UI if we're allowing graceful fallback
          const wrapper = document.querySelector("#scp-shadow-host")?.shadowRoot?.getElementById("scp-wrapper");
          if (wrapper) wrapper.style.display = "block";
          const ownerBtn = document.querySelector("#scp-shadow-host")?.shadowRoot?.getElementById("scp-owner-btn");
          if (ownerBtn) ownerBtn.style.display = "block";
        }
      },
    );
  }

  // =====================================================================
  // 📊 DATA FUNCTIONS (Sheet Sync)
  // =====================================================================
  function parseAndSave() {
    chrome.storage.local.get(["isLoggedIn"], (res) => {
      if (!res.isLoggedIn) return; // লগইন না থাকলে কিছু করবে না

      let holding = document.getElementById("holding_no")?.value || "N/A";
      let khatian = document.getElementById("khotian_no")?.value || "N/A";
      let comment = document.querySelector("textarea.comments")?.value || "N/A";

      if (holding === "N/A" && khatian === "N/A") return;

      const hBen = convertToBengali(holding);
      const kBen = convertToBengali(khatian);
      const cSan = comment.replace(/\s+/g, " ").trim();

      const isDup = collectedData.some(
        (i) => i.holding === hBen && i.khatian === kBen,
      );
      if (isDup) {
        showToast("ইতিমধ্যে সেভ করা আছে", true);
        return;
      }

      const entry = {
        id: Date.now(),
        holding: hBen,
        khatian: kBen,
        comment: cSan,
      };
      collectedData.push(entry);
      saveData();
      renderDataTable();
      sendToSheet(entry);
      showToast("✅ সফলভাবে সেভ ও সিঙ্ক হয়েছে!");
    });
  }

  // মাউজা নাম বের করার ফাংশন
  function getMoujaName() {
    try {
      const moujaSpan = document.querySelector(
        "#select2-mouja_select-container",
      );
      if (moujaSpan) {
        const title = moujaSpan.getAttribute("title");
        if (title) return title.trim();
        return moujaSpan.innerText.trim();
      }
    } catch (e) {
      console.error("[SCP] Error getting mowja name:", e);
    }
    return "";
  }

  async function sendToSheet(data) {
    if (!dataSheetUrl) {
      console.warn("[SCP] No dataSheetUrl configured!");
      return;
    }

    console.log("[SCP] Sending data to sheet:", data);
    console.log("[SCP] URL:", dataSheetUrl);

    try {
      // ✅ নতুন - localStorage থেকে userId এবং userName পড়ুন
      const userId = localStorage.getItem('userId');
      const userName = localStorage.getItem('userName');
      
      // মাউজা নাম যোগ করুন
      const moujaName = getMoujaName();
      
      // ✅ enrichedData - userId এবং userName সহ
      const enrichedData = {
        ...data,
        userId: userId || 'user_default',  // ✅ নতুন
        userName: userName || 'unknown',   // ✅ নতুন
        mowja: moujaName,
        timestamp: new Date().toISOString(),
      };

      console.log("[SCP] Enriched data with userId:", enrichedData);

      const response = await fetch(dataSheetUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enrichedData),
      });

      console.log("[SCP] Fetch completed");
      console.log("[SCP] Response status:", response?.status);
    } catch (err) {
      console.error("[SCP] Sheet Sync Failed:", err);
      console.error("[SCP] Error details:", {
        message: err.message,
        stack: err.stack,
        name: err.name,
      });
      showToast(
        "⚠️ Google Sheet sync এ সমস্যা হয়েছে। Console check করুন।",
        true,
      );
    }
  }

  // =====================================================================
  // 🪄 SETTINGS SAVE UTILITY
  // =====================================================================
  const saveSettings = () => {
    localStorage.setItem(siteKey, JSON.stringify(settings));
    applyTheme();
  };

  const applyTheme = () => {
    const panel = document.getElementById("scp-shadow-host");
    if (!panel) return;
    const shadow = panel.shadowRoot;
    const wrapper = shadow.getElementById("scp-wrapper");
    const ownerBtn = shadow.getElementById("scp-owner-btn");
    if (settings.darkMode) {
      if (wrapper) wrapper.classList.add("scp-dark");
      if (ownerBtn) ownerBtn.classList.add("scp-dark");
    } else {
      if (wrapper) wrapper.classList.remove("scp-dark");
      if (ownerBtn) ownerBtn.classList.remove("scp-dark");
    }
  };

  /* =========================
       INJECTED SCRIPT (For Alerts/Window)
    ==========================*/
  if (settings.blockWindowClose) {
    const script = document.createElement("script");
    script.textContent = `
            if (${settings.blockWindowClose}) {
                window.close = () => console.log("Blocked close");
            }
        `;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  }

  // Auto Close Specific Tab based on setting
  if (
    settings.blockWindowClose &&
    window.location.href.includes("holding/list/waiting")
  ) {
    window.close();
    setTimeout(() => window.close(), 500);
  }

  /* =========================
       DRAG UTILITY
    ==========================*/
  function makeDraggable(el, handle = el) {
    let isDown = false,
      dx = 0,
      dy = 0,
      isDragging = false;
    handle.style.cursor = "move";
    handle.addEventListener("mousedown", (e) => {
      if (
        e.target.closest &&
        e.target.closest("input, button, label, .scp-close-btn, select")
      )
        return;
      isDown = true;
      isDragging = false;
      const rect = el.getBoundingClientRect();
      dx = e.clientX - rect.left;
      dy = e.clientY - rect.top;
    });
    document.addEventListener("mousemove", (e) => {
      if (!isDown) return;
      isDragging = true;
      el.style.left = e.clientX - dx + "px";
      el.style.top = e.clientY - dy + "px";
      el.style.bottom = "auto";
      el.style.right = "auto";
    });
    document.addEventListener("mouseup", () => {
      setTimeout(() => {
        isDown = false;
      }, 0);
    });
    return { isDragging: () => isDragging };
  }

  /* =========================
       ALT CLICK & HOTKEYS
    ==========================*/
  document.addEventListener("keydown", (e) => {
    if (settings.altClick && e.key === "Alt") {
      const selectors = [
        "body > div.bg-\\[\\#EFF9F2\\].\\32 xl\\:container.mx-auto > div.w-full.h-auto.lg\\:px-5 > div.w-full.mt-3.flex.lg\\:px-5 > div.bg-white.w-full.lg\\:w-\\[75\\%\\].h-full.main-content.mb-3 > div > div.shadow-sm.mt-2.border.border-\\[\\#7ECBA1\\].bg-white.pb-2.rounded-tl-lg.rounded-tr-lg.rounded-bl-0.rounded-br-0.mx-5.p-3 > div.py-1.px-3.w-full.flex.flex-wrap.items-center.justify-between > a.text-white.py-1.px-3.rounded.bg-\\[\\#198754\\]",
        "#holding_first_entry_form > div:nth-child(11) > div > button",
      ];

      let btn = null;
      for (let sel of selectors) {
        btn = document.querySelector(sel);
        if (btn) break;
      }

      if (btn) {
        e.preventDefault();
        // Set flag to close tab after page reload
        sessionStorage.setItem("autoCloseTabAfterALT", "true");
        btn.click();
      }
    }

    if (settings.escapeInc && e.key === "Escape") {
      const input = document.getElementById("holdingNumber");
      if (input) {
        const currentValue = String(input.value).trim();
        let newValue;

        // চেক করো value-তে slash আছে কিনা (যেমন "2950/1")
        if (currentValue.includes("/")) {
          // Split করো prefix এবং numeric part আলাদা করতে
          const parts = currentValue.split("/");
          const lastPart = parts[parts.length - 1];
          const numericPart = Number(lastPart) || 0;

          // Numeric part increment করো
          const incrementedNum = numericPart + 1;

          // নতুন value তৈরি করো (prefix + incremented number)
          parts[parts.length - 1] = String(incrementedNum);
          newValue = parts.join("/");
        } else if (currentValue.includes("-")) {
          // চেক করো value-তে dash/hyphen আছে কিনা (যেমন "2025-100001")
          // Split করো prefix এবং numeric part আলাদা করতে
          const parts = currentValue.split("-");
          const lastPart = parts[parts.length - 1];
          const numericPart = Number(lastPart) || 0;

          // Numeric part increment করো
          const incrementedNum = numericPart + 1;

          // নতুন value তৈরি করো (prefix + incremented number)
          parts[parts.length - 1] = String(incrementedNum);
          newValue = parts.join("-");
        } else {
          // শুধু numeric value — সাধারণ increment
          newValue = (Number(currentValue) || 0) + 1;
        }

        input.value = newValue;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        if (input.form) input.form.requestSubmit();
      }
    }

    // ========== KHATIAN AUTO-INCREMENT (Escape Key) ==========
    if (settings.khatianAutoIncrement && e.key === "Escape") {
      const khatianInput = document.getElementById("KHATIAN_NO");
      if (khatianInput) {
        e.preventDefault();

        // Helper functions for Bengali/English number conversion
        const DIGITS = {
          bn: ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"],
          en: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
        };
        const toEn = (str) =>
          str.replace(/[০-৯]/g, (d) => DIGITS.bn.indexOf(d));
        const toBn = (num) =>
          num.toString().replace(/\\d/g, (d) => DIGITS.bn[d]);

        // Get current value
        let currentNum = parseInt(toEn(khatianInput.value));
        if (isNaN(currentNum)) return;

        let nextVal = toBn(currentNum + 1);

        // Set value using React-compatible method
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value",
        ).set;
        nativeSetter.call(khatianInput, nextVal);

        // Trigger events
        khatianInput.dispatchEvent(new Event("input", { bubbles: true }));
        khatianInput.dispatchEvent(new Event("change", { bubbles: true }));
        khatianInput.blur();

        // Helper to find button by text
        const getButtonByText = (text, excludeBtn = null) => {
          return Array.from(
            document.querySelectorAll(
              'button, input[type="button"], input[type="submit"]',
            ),
          ).find((btn) => btn.textContent.includes(text) && btn !== excludeBtn);
        };

        // Helper to trigger search
        const executeSearch = (input) => {
          const enterEvt = {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true,
          };
          input.dispatchEvent(new KeyboardEvent("keydown", enterEvt));
          input.dispatchEvent(new KeyboardEvent("keyup", enterEvt));

          const searchBtn =
            getButtonByText("খুঁজুন") ||
            getButtonByText("অনুসন্ধান") ||
            getButtonByText("Search");
          if (searchBtn) {
            searchBtn.click();
          } else {
            const form = input.closest("form");
            if (form)
              form.dispatchEvent(new Event("submit", { bubbles: true }));
          }
        };

        // Save old button reference
        const oldProdorshonBtn = getButtonByText("প্রদর্শন");

        setTimeout(() => {
          khatianInput.focus();

          if (settings.khatianForceSearch) {
            executeSearch(khatianInput);
          }

          if (settings.khatianAutoClick) {
            setTimeout(() => {
              let attempts = 0;
              const interval = setInterval(() => {
                const newBtn = getButtonByText("প্রদর্শন", oldProdorshonBtn);
                if (newBtn) {
                  newBtn.click();
                  clearInterval(interval);
                }
                if (++attempts >= 30) clearInterval(interval);
              }, 250);
            }, 1000);
          }
        }, 200);
      }
    }

    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "s") {
      const host = document.getElementById("scp-shadow-host");
      if (host && host.shadowRoot) {
        const panel = host.shadowRoot.getElementById("scp-panel");
        if (panel) panel.classList.toggle("open");
      }
    }

    // Backtick (`) key to open Data Panel directly
    if (e.key === "`") {
      e.preventDefault();
      const host = document.getElementById("scp-shadow-host");
      if (host && host.shadowRoot) {
        const panel = host.shadowRoot.getElementById("scp-panel");
        const dataTabBtn = host.shadowRoot.querySelector(
          '.scp-tab-btn[data-tab="data"]',
        );
        if (panel && dataTabBtn) {
          // Open the panel if not already open
          if (!panel.classList.contains("open")) {
            panel.classList.add("open");
          }
          // Click the data tab button to show data panel
          dataTabBtn.click();
        }
      }
    }

    if (
      settings.closeOtherTabs &&
      e.ctrlKey &&
      e.shiftKey &&
      e.key.toLowerCase() === "k"
    ) {
      e.preventDefault();
      chrome.runtime.sendMessage({ action: "closeOtherTabs" }, (res) => {
        console.log(`[SCP] Closed ${res?.closed ?? 0} other tab(s).`);
      });
    }

    if (
      settings.closeCurrentTab &&
      e.ctrlKey &&
      e.shiftKey &&
      e.key.toLowerCase() === "x"
    ) {
      e.preventDefault();
      chrome.runtime.sendMessage({ action: "closeCurrentTab" });
    }
  });

  /* =========================
       সংশোধন BUTTON CLICK → DATA SAVE
    ==========================*/
  document.addEventListener(
    "click",
    (e) => {
      const button = e.target.closest("#holding_first_entry_form button");
      const targetBtn = document.querySelector(
        "#holding_first_entry_form > div:nth-child(9) > div > button",
      );
      if (
        button &&
        (button.textContent.includes("সংশোধন") || button === targetBtn)
      ) {
        setTimeout(parseAndSave, 500);
      }
    },
    true,
  ); // capture phase

  /* =========================
       ENTER FIX & OWNER SHARE
    ==========================*/
  function setupEnter() {
    if (!settings.enterClick) return;
    const input = document.querySelector("#verify-father-name");
    const btn = document.querySelector("#entry-verify");
    if (input && btn && !input.dataset.bound) {
      input.removeAttribute("onkeydown");
      input.removeAttribute("oninput");
      input.dataset.bound = "1";
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          btn.click();
          
          // Mouse cursor id="owner-name" element এ নিয়ে যাও
          const ownerNameEl = document.querySelector("#owner-name");
          if (ownerNameEl) {
            const rect = ownerNameEl.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            // Mousemove event dispatch করো
            const mouseEvent = new MouseEvent("mousemove", {
              bubbles: true,
              cancelable: true,
              view: window,
              clientX: centerX,
              clientY: centerY
            });
            ownerNameEl.dispatchEvent(mouseEvent);
            
            // Mouseover event also dispatch করো
            const mouseOverEvent = new MouseEvent("mouseover", {
              bubbles: true,
              cancelable: true,
              view: window
            });
            ownerNameEl.dispatchEvent(mouseOverEvent);
            
            // Focus করো
            ownerNameEl.focus();
          }
        }
      });
    }
  }

  function toBn(v) {
    const m = {
      0: "০",
      1: "১",
      2: "২",
      3: "৩",
      4: "৪",
      5: "৫",
      6: "৬",
      7: "৭",
      8: "৮",
      9: "৯",
      ".": ".",
    };
    return String(v)
      .split("")
      .map((c) => m[c] || c)
      .join("");
  }

  function applySplit() {
    if (!settings.shareSplit) return;
    const inputs = document.querySelectorAll(".owner-land-portion");
    
    if (inputs.length === 0) return;
    
    // প্রতিটা গৃহের জন্য সমান ভাগ
    const perPortion = 1 / inputs.length;
    const portionValueStr = perPortion.toFixed(3);
    
    inputs.forEach((input, index) => {
      if (index === inputs.length - 1) {
        // শেষটাকে বাকি অংশ দিয়ে পূর্ণ করো যাতে মোট ঠিক 1 হয়
        let totalBefore = parseFloat(portionValueStr) * (inputs.length - 1);
        let lastValue = (1 - totalBefore).toFixed(3);
        input.value = toBn(lastValue);
      } else {
        input.value = toBn(portionValueStr);
      }
    });
    
    inputs.forEach((i) =>
      i.dispatchEvent(new Event("input", { bubbles: true })),
    );
  }

  /* =========================
       🧹 SANGPING CLEAN & FORMAT AUTO ENGINE
    ==========================*/
  function applySangpingAuto() {
    if (!settings.autoCleanInputs) return;

    let nameCorrected = false;

    // 🔹 Name clean
    document
      .querySelectorAll('input[type="text"], input:not([type])')
      .forEach((input) => {
        if (
          !input.value ||
          input.closest("#scp-wrapper") ||
          input.closest("#scp-login-overlay")
        )
          return;
        let newValue = input.value
          .replace(/^\s*(দং|পিং|পিতা)[-–—:ঃ]?\s*/g, "")
          .replace(/\s*(দং|পিং|পিতা)[-–—:ঃ]?\s*$/g, "")
          .replace(/\s+/g, " ")
          .trim();

        if (newValue !== input.value) {
          input.value = newValue;
          nameCorrected = true;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });

    // 🔹 Address clean (textareas)
    document.querySelectorAll("textarea").forEach((textarea) => {
      if (
        !textarea.value ||
        textarea.closest("#scp-wrapper") ||
        textarea.closest("#scp-login-overlay") ||
        textarea.classList.contains("comments") ||
        textarea.name === "comments"
      )
        return;
      let newValue = textarea.value
        .replace(/(^|\s)সাং[-–—:ঃ]?\s*/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (newValue !== textarea.value) {
        textarea.value = newValue;
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        textarea.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    // 🔹 Add Comment for Name
    if (nameCorrected) {
      const commentBox = document.querySelector(
        'textarea.comments, textarea[name="comments"]',
      );
      if (commentBox) {
        commentBox.value = "নাম সংশোধন করা হলো";
        commentBox.dispatchEvent(new Event("input", { bubbles: true }));
        commentBox.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    // 🔹 Address Process
    const addAddressComment = () => {
      const commentText = "ঠিকানা সংশোধন করা হলো";
      const box = document.querySelector(
        "#KhotianRegistrationThree textarea, textarea.comments, textarea[name='comments']",
      );
      if (!box || box.value.trim() !== "") return;
      box.value = commentText;
      box.dispatchEvent(new Event("input", { bubbles: true }));
    };

    document.querySelectorAll('[id^="ownerAddress"]').forEach((field) => {
      let addr = field.value.trim();
      if (!addr || addr === "নিজ" || addr === "নীজ" || addr === "সাং") {
        if (settings.defaultAddress) {
          field.value = settings.defaultAddress;
          addAddressComment();
          field.dispatchEvent(new Event("input", { bubbles: true }));
        }
      } else {
        const cleanedVal = addr.replace(/^\s*(সাং)[\s\-:ঃ]*/g, "").trim();
        if (cleanedVal !== addr) {
          field.value = cleanedVal;
          addAddressComment();
          field.dispatchEvent(new Event("input", { bubbles: true }));
          field.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    });

    // 🔹 Auto Dropdowns
    const applyDropdown = (select, valueText) => {
      if (!select || !valueText) return;
      const option = Array.from(select.options).find(
        (opt) => opt.text.trim() === valueText,
      );
      if (option) {
        select.value = option.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    };

    if (settings.surveyValue) {
      const surveyDropdown = Array.from(
        document.querySelectorAll("select"),
      ).find((sel) => sel.labels?.[0]?.textContent.includes("ভূমি জরিপের ধরন"));
      applyDropdown(surveyDropdown, settings.surveyValue);
    }

    if (settings.sourceValue) {
      const sourceDropdown = Array.from(
        document.querySelectorAll("select"),
      ).find((sel) => sel.labels?.[0]?.textContent.includes("মালিকানা সূত্র"));
      applyDropdown(sourceDropdown, settings.sourceValue);
    }
  }

  /* =========================
       DATA TABLE RENDER
    ==========================*/
  function renderDataTable() {
    const host = document.getElementById("scp-shadow-host");
    if (!host || !host.shadowRoot) return;
    const shadow = host.shadowRoot;
    const body = shadow.getElementById("scp-data-table-body");
    if (!body) return;

    body.innerHTML = "";
    const search = (
      shadow.getElementById("scp-search-box")?.value || ""
    ).toLowerCase();
    const filtered = collectedData.filter(
      (i) => i.holding.includes(search) || i.khatian.includes(search),
    );
    const countEl = shadow.getElementById("scp-data-count");
    if (countEl) countEl.textContent = collectedData.length;

    filtered.forEach((item) => {
      const row = document.createElement("tr");
      row.innerHTML = `
                <td style="padding:4px 6px; border-bottom:1px solid rgba(255,255,255,0.08); font-size:12px;">${item.holding}</td>
                <td style="padding:4px 6px; border-bottom:1px solid rgba(255,255,255,0.08); font-size:12px;">${item.khatian}</td>
                <td style="padding:4px 6px; border-bottom:1px solid rgba(255,255,255,0.08); font-size:12px; max-width:80px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${item.comment}</td>
                <td style="padding:4px 6px; border-bottom:1px solid rgba(255,255,255,0.08);">
                    <button data-id="${item.id}" style="background:#dc3545; color:white; border:none; border-radius:4px; padding:2px 7px; font-size:11px; cursor:pointer;">X</button>
                </td>
            `;
      row.querySelector("button").onclick = () => {
        collectedData = collectedData.filter((i) => i.id !== item.id);
        saveData();
        renderDataTable();
      };
      body.appendChild(row);
    });
  }

  /* =========================
       DOWNLOAD FUNCTIONS
    ==========================*/
  function downloadExcel() {
    if (collectedData.length === 0) return;
    let html =
      '<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body><table>';
    collectedData.forEach((item) => {
      html += `<tr><td style="mso-number-format:'\\@'">${item.holding}</td><td style="mso-number-format:'\\@'">${item.khatian}</td><td>${item.comment}</td></tr>`;
    });
    html += "</table></body></html>";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([html], { type: "application/vnd.ms-excel" }),
    );
    a.download = "data.xls";
    a.click();
  }

  function downloadCSV() {
    if (collectedData.length === 0) return;
    let csv = "";
    collectedData.forEach((item) => {
      csv += `${item.holding},${item.khatian},${item.comment}\n`;
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }),
    );
    a.download = "data.csv";
    a.click();
  }

  function downloadTXT() {
    if (collectedData.length === 0) return;
    let txt = "";
    collectedData.forEach((item) => {
      txt += `${item.holding},${item.khatian},${item.comment}\n`;
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([txt], { type: "text/plain;charset=utf-8;" }),
    );
    a.download = "data.txt";
    a.click();
  }

  // =====================================================================
  // 💳 PAYMENT MODAL FUNCTION
  // =====================================================================
  // ✅ Global scope এ রাখছি যাতে login overlay থেকে access করা যায়
  window.openPaymentModal = function(shadow) {
    // Remove existing modal if any
    const existingModal = document.getElementById("scp-payment-modal");
    if (existingModal) existingModal.remove();

    const modal = document.createElement("div");
    modal.id = "scp-payment-modal";
    modal.style.cssText = `
            position: fixed; inset: 0; z-index: 2147483647;
            background: rgba(0,0,0,0.7); display: flex;
            justify-content: center; align-items: center;
            font-family: 'Inter', sans-serif; backdrop-filter: blur(4px);
        `;
    modal.innerHTML = `
            <div style="
                background: #1a1a2e; border-radius: 16px; padding: 28px;
                width: 90%; max-width: 420px; box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                border: 1px solid rgba(255,255,255,0.1); display: flex;
                flex-direction: column; gap: 14px; max-height: 90vh; overflow-y: auto;
            ">
                <h3 style="margin:0; color:#fff; font-size:18px; text-align:center; font-weight:700;">💳 Buy Subscription</h3>
                
                <div style="font-size: 12px; color: #38bdf8; text-align: center; background: rgba(56,189,248,0.1); padding: 10px; border-radius: 8px; margin-bottom: 8px;">
                    ✅ Bkash অথবা Nagad এ Send Money করবেন, পেমেন্ট শেষে সাবস্ক্রিপশন কয়েক মিনিটের মধ্যে চালু হবে
                </div>

                <div>
                    <label style="font-size: 11px; color: #aaa; display: block; margin-bottom: 4px; font-weight: 600;">👤 Username</label>
                    <input type="text" id="scp-pay-username" placeholder="আপনার ইউজারনেম" style="
                        width: 100%; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15);
                        background: rgba(255,255,255,0.07); color: #fff; font-size: 13px; box-sizing: border-box; outline: none;
                    ">
                </div>

                <div>
                    <label style="font-size: 11px; color: #aaa; display: block; margin-bottom: 4px; font-weight: 600;">📱 Send করা নম্বর</label>
                    <input type="tel" id="scp-pay-sender-number" placeholder="যে নম্বর থেকে টাকা পাঠিয়েছেন" style="
                        width: 100%; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15);
                        background: rgba(255,255,255,0.07); color: #fff; font-size: 13px; box-sizing: border-box; outline: none;
                    ">
                </div>

                <div>
    <label style="font-size: 11px; color: #aaa; display: block; margin-bottom: 4px; font-weight: 600;">📦 Plan নির্বাচন করুন</label>
    <select id="scp-pay-plan" style="
        width: 100%; 
        padding: 10px; 
        border-radius: 8px; 
        border: 1px solid rgba(255,255,255,0.15);
        background-color: #2c2c2c; /* এখানে সলিড ডার্ক কালার দেওয়া হয়েছে */
        color: #fff; 
        font-size: 13px; 
        box-sizing: border-box; 
        outline: none;
        appearance: none; /* ডিফল্ট ব্রাউজার স্টাইল সরানোর জন্য */
    ">
        <option value="" style="background-color: #2c2c2c; color: #fff;">-- Plan বেছে নিন --</option>
        <option value="30 দিন - 1000 টাকা" style="background-color: #2c2c2c; color: #fff;">30 দিন - 1000 টাকা</option>
        <option value="15 দিন - 600 টাকা" style="background-color: #2c2c2c; color: #fff;">15 দিন - 600 টাকা</option>
        <option value="7 দিন - 300 টাকা" style="background-color: #2c2c2c; color: #fff;">7 দিন - 300 টাকা</option>
    </select>
</div>

                <div>
                    <label style="font-size: 11px; color: #aaa; display: block; margin-bottom: 4px; font-weight: 600;">🔗 Transaction ID</label>
                    <input type="text" id="scp-pay-txn-id" placeholder="bKash/Nagad Transaction ID" style="
                        width: 100%; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15);
                        background: rgba(255,255,255,0.07); color: #fff; font-size: 13px; box-sizing: border-box; outline: none;
                    ">
                </div>

                <div>
                    <label style="font-size: 11px; color: #aaa; display: block; margin-bottom: 4px; font-weight: 600;">💰 Admin এর bKash/Nagad(Personal) নম্বর</label>
                    <input disabled type="tel" id="scp-pay-admin-number" value="01709613535" style="
                        width: 100%; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15);
                        background: rgba(255,255,255,0.07); color: #fff; font-size: 13px; box-sizing: border-box; outline: none;
                    ">
                </div>

                <button id="scp-pay-submit" style="
                    padding: 11px; border-radius: 8px; border: none;
                    background: linear-gradient(135deg, #10b981, #059669); color: white;
                    font-size: 14px; font-weight: 700; cursor: pointer; transition: opacity 0.2s;
                    margin-top: 8px;
                ">✅ Submit Payment</button>

                <button id="scp-pay-close" style="
                    padding: 11px; border-radius: 8px; border: none;
                    background: #6b7280; color: white;
                    font-size: 14px; font-weight: 700; cursor: pointer; transition: opacity 0.2s;
                ">❌ Cancel</button>
            </div>
        `;
    document.body.appendChild(modal);

    // Close button
    document.getElementById("scp-pay-close").addEventListener("click", () => {
      modal.remove();
    });

    // Submit button
    document
      .getElementById("scp-pay-submit")
      .addEventListener("click", async () => {
        const username = document
          .getElementById("scp-pay-username")
          .value.trim();
        const senderNumber = document
          .getElementById("scp-pay-sender-number")
          .value.trim();
        const plan = document.getElementById("scp-pay-plan").value.trim();
        const txnId = document.getElementById("scp-pay-txn-id").value.trim();
        const adminNumber = document
          .getElementById("scp-pay-admin-number")
          .value.trim();

        if (!username || !senderNumber || !plan || !txnId || !adminNumber) {
          showToast("⚠️ সব তথ্য পূরণ করুন!", true);
          return;
        }

        const submitBtn = document.getElementById("scp-pay-submit");
        submitBtn.textContent = "Processing...";
        submitBtn.disabled = true;

        try {
          // Check if Payment Sheet URL is configured
          if (!PAYMENT_SHEET_URL) {
            showToast(
              "⚠️ Payment Sheet URL কনফিগার করা হয়নি। Admin এর সাথে যোগাযোগ করুন।",
              true,
            );
            submitBtn.textContent = "✅ Submit Payment";
            submitBtn.disabled = false;
            return;
          }

          // Prepare payment data
          const paymentData = {
            username: username,
            senderNumber: senderNumber,
            plan: plan,
            txnId: txnId,
            adminNumber: adminNumber,
          };

          // Send to Payment Sheet (POST request with CORS handling)
          const paymentResponse = await fetch(PAYMENT_SHEET_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(paymentData),
            mode: "no-cors",
          });

          // For no-cors mode, we can't read the response body
          // So we'll assume success if no error was thrown
          showToast(
            "✅ পেমেন্ট সফলভাবে জমা হয়েছে! কয়েক মিনিটের মধ্যে চালু হবে।",
          );
          modal.remove();
          // ✅ Login overlay ও remove করো
          const loginOverlay = document.getElementById("scp-login-overlay");
          if (loginOverlay) loginOverlay.remove();
        } catch (err) {
          console.error("[Payment Error]", err);
          showToast(
            "❌ Error: " +
              err.message +
              "\n\nচেক করুন: PAYMENT_SHEET_URL সঠিক কিনা এবং deployed script active কিনা।",
            true,
          );
          submitBtn.textContent = "✅ Submit Payment";
          submitBtn.disabled = false;
        }
      });
  };

  // ✅ Backward compatibility wrapper - existing code এর জন্য
  function showPaymentModal(shadow) {
    window.openPaymentModal(shadow);
  }

  /* =========================
       YEAR/SHAL SELECTOR (Settings Panel Only)
    ==========================*/
  function applyYearShalSelection(inputElement) {
    const userInput = inputElement.value.trim();
    const selectElement = document.getElementById("paid_year");

    if (!selectElement) {
      showToast("❌ Year dropdown পাওয়া যায়নি!", true);
      return;
    }

    const yearValue = userInput.substring(0, 4);
    const optionExists = Array.from(selectElement.options).some(
      (opt) => opt.value === yearValue,
    );

    if (optionExists) {
      selectElement.value = yearValue;
      selectElement.dispatchEvent(new Event("change", { bubbles: true }));
      settings.defaultYearShal = userInput;
      saveSettings();
      showToast(`✅ Year ${yearValue} selected!`);
    } else {
      showToast("⚠️ এই বছরটি তালিকায় নেই!", true);
    }
  }

  /* =========================
       FLOATING SET BUTTON
    ==========================*/
  function createFloatingSetButton() {
    if (document.getElementById("scp-year-floating-btn")) return;

    const btn = document.createElement("button");
    btn.id = "scp-year-floating-btn";
    btn.innerHTML = "✓ Set Year";
    btn.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 100px;
            z-index: 2147483647;
            padding: 10px 16px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            font-size: 13px;
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
            transition: all 0.2s;
        `;

    btn.onmouseover = () => {
      btn.style.transform = "scale(1.08)";
      btn.style.boxShadow = "0 6px 20px rgba(16, 185, 129, 0.6)";
    };

    btn.onmouseout = () => {
      btn.style.transform = "scale(1)";
      btn.style.boxShadow = "0 4px 15px rgba(16, 185, 129, 0.4)";
    };

    btn.onclick = () => {
      // Get input from settings panel
      const host = document.getElementById("scp-shadow-host");
      if (host && host.shadowRoot) {
        const inputEl = host.shadowRoot.getElementById("scp-year-shal-input");
        if (inputEl) {
          applyYearShalSelection(inputEl);
        }
      }
    };

    document.body.appendChild(btn);
  }

  function removeFloatingSetButton() {
    const btn = document.getElementById("scp-year-floating-btn");
    if (btn) btn.remove();
  }

  /* =========================
       UI INITIALIZATION (SHADOW DOM)
    ==========================*/
  function injectUI() {
    if (document.getElementById("scp-shadow-host")) return;

    // 📊 সর্বশেষ dataSheetUrl storage থেকে লোড করুন
    chrome.storage.local.get(["dataSheetUrl"], (res) => {
      if (res.dataSheetUrl) dataSheetUrl = res.dataSheetUrl;
    });

    const host = document.createElement("div");
    host.id = "scp-shadow-host";
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

            :host {
                all: initial;
                font-family: 'Inter', sans-serif;
                --primary: #10b981;
                --primary-hover: #059669;
                --bg-glass: rgba(255, 255, 255, 0.7);
                --bg-glass-dark: rgba(17, 24, 39, 0.92);
                --border-glass: rgba(255, 255, 255, 0.3);
                --text-primary: #1f2937;
                --text-secondary: #4b5563;
                --shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.2);
                --panel-width: 520px;
            }

            .scp-glass {
                background: var(--bg-glass);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                border: 1px solid var(--border-glass);
                box-shadow: var(--shadow);
            }

            .scp-dark .scp-glass {
                background: var(--bg-glass-dark);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: #f3f4f6;
            }
            .scp-dark {
                --text-primary: #f3f4f6;
                --text-secondary: #9ca3af;
                --track-bg: transparent;
                --thumb-bg: #4b5563;
            }

            #scp-wrapper {
                position: fixed;
                left: 20px;
                bottom: 20px;
                z-index: 2147483647;
                display: flex;
                flex-direction: column;
                align-items: flex-start;
            }

            #scp-circle {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                display: flex;
                justify-content: center;
                align-items: center;
                cursor: pointer;
                color: var(--primary);
                transition: transform 0.2s, background 0.2s;
                background: #fff;
            }
            #scp-circle:hover {
                transform: scale(1.05);
                background: rgba(255, 255, 255, 0.9);
            }
            .scp-dark #scp-circle:hover { background: rgba(31, 38, 135, 0.9); }
            #scp-circle svg { width: 18px; height: 18px; animation: spin 8s linear infinite; }

            @keyframes spin { 100% { transform: rotate(360deg); } }
            
            @keyframes pulse-glow {
                0%, 100% { 
                    box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4), inset 0 1px 0 rgba(255,255,255,0.3);
                    transform: scale(1);
                }
                50% { 
                    box-shadow: 0 6px 25px rgba(245, 158, 11, 0.7), inset 0 1px 0 rgba(255,255,255,0.3);
                    transform: scale(1.02);
                }
            }
            
            #scp-buy-subscription-header-btn:hover {
                filter: brightness(1.15) saturate(1.2);
                transform: scale(1.04) !important;
                box-shadow: 0 8px 30px rgba(245, 158, 11, 0.8), inset 0 1px 0 rgba(255,255,255,0.4) !important;
            }

            #scp-panel {
                width: var(--panel-width);
                border-radius: 16px;
                overflow: hidden;
                overflow-x: hidden;
                position: absolute;
                left: 0;
                bottom: 46px;
                transform-origin: bottom left;
                transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                opacity: 0;
                transform: scale(0.8);
                pointer-events: none;
                display: flex;
                flex-direction: column;
                box-sizing: border-box;
            }
            #scp-panel.open {
                opacity: 1;
                transform: scale(1);
                pointer-events: auto;
            }

            .scp-header {
                padding: 12px 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid var(--border-glass);
                cursor: move;
                background: rgba(16, 185, 129, 0.1);
            }
            .scp-dark .scp-header { border-bottom: 1px solid rgba(255,255,255,0.1); }
            .scp-header span { font-weight: 600; color: var(--text-primary); font-size: 14px; user-select: none; }

            .scp-close-btn {
                background: transparent; border: none;
                color: var(--text-secondary); font-size: 20px;
                cursor: pointer; transition: color 0.2s; padding: 0; line-height: 1;
            }
            .scp-close-btn:hover { color: #ef4444; }

            .scp-content {
                padding: 8px 16px 16px 16px;
                max-height: 460px;
                overflow-y: auto;
                overflow-x: hidden;
                box-sizing: border-box;
                width: 100%;
            }
            .scp-content::-webkit-scrollbar { width: 4px; }
            .scp-content::-webkit-scrollbar-track { background: var(--track-bg, transparent); }
            .scp-content::-webkit-scrollbar-thumb { background: var(--thumb-bg, #cbd5e1); border-radius: 4px; }

            /* Tab System */
            .scp-tabs {
                display: flex;
                border-bottom: 1px solid var(--border-glass);
                background: rgba(0,0,0,0.05);
            }
            .scp-dark .scp-tabs { background: rgba(255,255,255,0.03); }
            .scp-tab-btn {
                flex: 1; padding: 8px 4px; border: none; background: transparent;
                color: var(--text-secondary); font-size: 12px; font-weight: 600;
                cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif;
            }
            .scp-tab-btn.active {
                color: var(--primary);
                border-bottom: 2px solid var(--primary);
                background: rgba(16,185,129,0.07);
            }
            .scp-tab-content { display: none; }
            .scp-tab-content.active { display: block; }

            /* Settings switches — 3-col grid */
            .scp-switches-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 10px;
                margin-bottom: 15px;
                width: 100%;
                box-sizing: border-box;
            }
            .scp-switch-item.scp-wide {
                grid-column: span 2;
                height: auto;
                min-height: 100px;
            }
            .scp-switch-item {
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                align-items: flex-start;
                padding: 12px 12px;
                border: 1.2px solid rgba(16,185,129,0.15);
                border-radius: 12px;
                background: linear-gradient(135deg, rgba(16,185,129,0.04), rgba(56,189,248,0.03));
                height: 100px;
                box-sizing: border-box;
                transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
            }
            .scp-switch-item::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: radial-gradient(circle at top-right, rgba(16,185,129,0.08), transparent 70%);
                pointer-events: none;
            }
            .scp-switch-item:hover {
                border-color: rgba(16,185,129,0.35);
                background: linear-gradient(135deg, rgba(16,185,129,0.08), rgba(56,189,248,0.06));
                box-shadow: 0 4px 12px rgba(16,185,129,0.12);
                transform: translateY(-1px);
            }
            .scp-dark .scp-switch-item {
                background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(100,200,255,0.03));
                border-color: rgba(255,255,255,0.12);
            }
            .scp-dark .scp-switch-item:hover {
                border-color: rgba(16,185,129,0.4);
                background: linear-gradient(135deg, rgba(16,185,129,0.1), rgba(56,189,248,0.08));
                box-shadow: 0 4px 12px rgba(16,185,129,0.15);
            }
            .scp-switch-label-text {
                font-size: 11px;
                color: var(--text-primary);
                font-weight: 600;
                line-height: 1.4;
                word-break: break-word;
                margin-bottom: 6px;
                flex: 0 0 auto;
                position: relative;
                z-index: 1;
            }
            .scp-switch-item .scp-switch {
                align-self: flex-end;
            }

            .scp-switch { position: relative; display: inline-block; width: 38px; height: 22px; }
            .scp-switch input { opacity: 0; width: 0; height: 0; }
            .scp-slider {
                position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
                background-color: #cbd5e1; transition: .3s; border-radius: 34px;
            }
            .scp-dark .scp-slider { background-color: #4b5563; }
            .scp-slider:before {
                position: absolute; content: ""; height: 16px; width: 16px;
                left: 3px; bottom: 3px; background-color: white;
                transition: .3s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
            input:checked + .scp-slider { background-color: var(--primary); }
            input:checked + .scp-slider:before { transform: translateX(16px); }

            /* 🔒 Locked (Free plan) switch item & tabs */
            .scp-switch-item.scp-locked, .scp-tab-btn.scp-locked {
                opacity: 0.45;
                cursor: not-allowed !important;
                position: relative;
                pointer-events: none !important;
            }
            .scp-switch-item.scp-locked {
                border-color: rgba(239,68,68,0.3) !important;
                background: rgba(239,68,68,0.04) !important;
                pointer-events: none !important;
            }
            .scp-switch-item.scp-locked:hover {
                border-color: rgba(239,68,68,0.3) !important;
                background: rgba(239,68,68,0.04) !important;
                pointer-events: none !important;
            }
            .scp-switch-item.scp-locked *, .scp-tab-btn.scp-locked * {
                cursor: not-allowed !important;
                pointer-events: none !important;
            }
            .scp-tab-btn.scp-locked {
                color: rgba(239,68,68,0.8);
                pointer-events: none !important;
            }
            .disabled-btn {
                opacity: 0.4 !important;
                cursor: not-allowed !important;
                filter: grayscale(100%);
            }
            .scp-lock-badge {
                display: inline-block;
                font-size: 9px;
                font-weight: 700;
                color: #ef4444;
                background: rgba(239,68,68,0.12);
                border: 1px solid rgba(239,68,68,0.3);
                border-radius: 4px;
                padding: 1px 5px;
                margin-top: 4px;
                letter-spacing: 0.3px;
                white-space: nowrap;
            }
            .scp-premium-badge {
                display: inline-block;
                font-size: 9px;
                font-weight: 700;
                color: #8b5cf6;
                background: rgba(139,92,246,0.12);
                border: 1px solid rgba(139,92,246,0.3);
                border-radius: 4px;
                padding: 1px 5px;
                margin-top: 4px;
                letter-spacing: 0.3px;
                white-space: nowrap;
            }

            /* Data Tab Inputs */
            .scp-input {
                width: 100%; box-sizing: border-box; padding: 7px 10px;
                border-radius: 6px; border: 1px solid rgba(0,0,0,0.15);
                background: rgba(255,255,255,0.6); font-size: 12px;
                color: var(--text-primary); font-family: 'Inter', sans-serif;
                outline: none; margin-bottom: 6px;
            }
            .scp-dark .scp-input {
                background: rgba(255,255,255,0.08);
                border: 1px solid rgba(255,255,255,0.15);
                color: #f3f4f6;
            }
            .scp-btn {
                padding: 7px 12px; border-radius: 6px; border: none;
                color: white; font-size: 12px; font-weight: 600;
                cursor: pointer; transition: opacity 0.2s; font-family: 'Inter', sans-serif;
            }
            .scp-btn:hover { opacity: 0.85; }

            /* Data Table */
            .scp-data-table { width: 100%; border-collapse: collapse; font-size: 12px; color: var(--text-primary); }
            .scp-data-table th {
                padding: 5px 6px; text-align: left; font-size: 11px;
                color: var(--text-secondary); font-weight: 600;
                border-bottom: 1px solid var(--border-glass);
            }

            #scp-owner-btn {
                position: fixed; right: 20px; bottom: 120px; z-index: 2147483646;
                width: 36px; height: 36px; border-radius: 50%;
                display: flex; justify-content: center; align-items: center;
                cursor: pointer; color: #fff;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
                transition: transform 0.2s, box-shadow 0.2s;
            }
            #scp-owner-btn.hidden { display: none !important; }
            #scp-owner-btn:hover {
                transform: translateY(-2px) scale(1.05);
                box-shadow: 0 6px 20px rgba(16, 185, 129, 0.6);
            }
            #scp-owner-btn svg { width: 18px; height: 18px; }

            /* Master Toggle Bar */
            .scp-master-toggle-bar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 10px;
                padding: 8px 12px;
                border-radius: 10px;
                background: linear-gradient(135deg, rgba(16,185,129,0.10) 0%, rgba(56,189,248,0.10) 100%);
                border: 1.5px solid rgba(16,185,129,0.30);
                box-sizing: border-box;
            }
            .scp-master-toggle-label {
                font-size: 12px;
                font-weight: 700;
                color: var(--text-primary);
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .scp-master-toggle-label span.scp-mtl-status {
                font-size: 10px;
                font-weight: 600;
                color: var(--text-secondary);
            }
            #scp-master-toggle-btn {
                padding: 5px 14px;
                border-radius: 7px;
                border: none;
                font-size: 11.5px;
                font-weight: 700;
                cursor: pointer;
                font-family: 'Inter', sans-serif;
                transition: all 0.2s;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                box-shadow: 0 2px 8px rgba(16,185,129,0.25);
                white-space: nowrap;
            }
            #scp-master-toggle-btn:hover {
                filter: brightness(1.12);
                transform: translateY(-1px);
            }
            #scp-master-toggle-btn.all-off {
                background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
                box-shadow: 0 2px 8px rgba(107,114,128,0.25);
            }
            #scp-master-toggle-btn.scp-free-disabled {
                opacity: 0.35 !important;
                cursor: not-allowed !important;
                pointer-events: none !important;
                filter: grayscale(60%) !important;
                background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%) !important;
                box-shadow: 0 2px 8px rgba(156,163,175,0.15) !important;
                transform: none !important;
            }
            #scp-master-toggle-btn.scp-free-disabled:hover {
                filter: grayscale(60%) !important;
                transform: none !important;
            }
        `;
    shadow.appendChild(style);

    // ---- Settings Fields ----
    const settingsFields = [
      { id: "darkMode", label: "Dark Mode Theme" },
      { id: "altClick", label: "Alt Click  যাচাই, সংশোধন " },
      { id: "closeOtherTabs", label: "⌨️ Ctrl+Shift+K: Close Others" },
      { id: "closeCurrentTab", label: "⌨️ Ctrl+Shift+X: Close This Tab" },
      { id: "arrowKeyTextReplace", label: "🔼🔽 Arrow Keys to auto Comment" },
      { id: "escapeInc", label: "Esc to Increment Holding Number and search" },
      { id: "enterClick", label: "Enter to add মালিক" },
      { id: "shareSplit", label: "মালিকানা অংশ ভাগ" },
      { id: "blockWindowClose", label: "ওপেক্ষামান ট্যাব ক্লোজ" },
      { id: "disableAllAlerts", label: "🛑 Disable All Alerts (Global)" },
      { id: "autoClickDetails", label: "Auto Click 1st বিস্তারিত Button" },
      {
        id: "enableBistaritoShortcut",
        label: "⌨️ Ctrl+Shift+B: Open All বিস্তারিত Button",
      },
      { id: "autoYachaiClick", label: "🤖 Auto Click যাচাই" },
      { id: "inputSync", label: "🔄 Input Field Sync (Dynamic)" },
      { id: "autoClickSongsodhon", label: "🤖 Auto Click সংশোধন Button" },
      { id: "rightArrowClickSongsodhon", label: "➡️ Right Arrow → সংশোধন Button" },
      {
        id: "autoRedirectDetailsToEdit",
        label: "🔗 ভুলে যাচাই করে ফেল্লে সংশোধন করুন",
      },
      { id: "showCorrectionIcon", label: "🔗 পেজে সংশোধন আইকন দেখান" },
      { id: "enableYearSelector", label: "📅 Year/Shal সিলেক্টর" },
      {
        id: "autoCleanInputs",
        label:
          "সাং পিং দং কাটা + Set ভূমি জরিপের ধরন + মালিকানা সূত্র + ঠিকানা ",
      },
    ];

    // Check if any boolean toggle is currently ON to set initial master button state
    const anyOn = settingsFields.some(
      (f) => typeof settings[f.id] === "boolean" && settings[f.id],
    );

    // Check if this is a free account
    let isFreeAccount = false;
    chrome.storage.local.get(["subscription"], (res) => {
      isFreeAccount =
        !res.subscription || res.subscription.toLowerCase() !== "premium";
    });

    let settingsHTML = `
        <div class="scp-master-toggle-bar">
            <div class="scp-master-toggle-label">
                <span>⚡ সব টগল</span>
                <span class="scp-mtl-status" id="scp-mtl-status">${anyOn ? "কিছু চালু আছে" : "সব বন্ধ"}</span>
            </div>
            <button id="scp-master-toggle-btn" class="${anyOn ? "" : "all-off"}" title="সব সেটিংস একসাথে চালু/বন্ধ করুন">${anyOn ? "✅ সব চালু করুন" : "🔴 সব বন্ধ করুন"}</button>
        </div>
        `;

    settingsHTML +=
      `<div class="scp-switches-grid">` +
      settingsFields
        .map((f) => {
          if (f.id === "showCorrectionIcon") return ""; // Skip separate card

          const isPremiumOnly = !FREE_ALLOWED_FEATURES.has(f.id);
          let extraContent = "";
          if (f.id === "autoClickDetails") {
            extraContent = `<button id="scp-clear-details-cache" class="scp-mini-btn" style="margin-top: 4px; font-size: 10px; padding: 2px 8px; border-radius: 4px; background: #ef4444; color: white; border: none; cursor: pointer; transition: opacity 0.2s; align-self: flex-start;">🧹 Clear Cache</button>`;
          }

          if (f.id === "autoRedirectDetailsToEdit") {
            return `
                <div class="scp-switch-item scp-wide${isPremiumOnly ? " scp-premium-only" : ""}" data-id="${f.id}" style="justify-content: flex-start; gap: 12px;">
                    <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
                        <span class="scp-switch-label-text" style="flex:1; margin-bottom:0;">${f.label}</span>
                        <label class="scp-switch">
                            <input type="checkbox" id="s_${f.id}" ${settings[f.id] ? "checked" : ""}>
                            <span class="scp-slider"></span>
                        </label>
                    </div>
                    <div style="display:flex; align-items:center; justify-content:space-between; width:100%; padding:8px; background:rgba(16,185,129,0.05); border-radius:8px;">
                        <span class="scp-switch-label-text" style="font-size:10px; opacity:0.85; margin-bottom:0; flex:1;">🔗 পেজে সংশোধন আইকন</span>
                        <label class="scp-switch" style="transform:scale(0.8); transform-origin:right;">
                            <input type="checkbox" id="s_showCorrectionIcon" ${settings.showCorrectionIcon ? "checked" : ""}>
                            <span class="scp-slider"></span>
                        </label>
                    </div>
                </div>
                `;
          }

          // Special handling for autoYachaiClick — will be disabled if server OFF
          if (f.id === "autoYachaiClick") {
            return `
                <div class="scp-switch-item${isPremiumOnly ? " scp-premium-only" : ""}" data-id="${f.id}" id="scp-item-autoYachaiClick">
                    <div style="display:flex; flex-direction:column; gap:2px; flex:1;">
                        <span class="scp-switch-label-text">${f.label}</span>
                        <span id="scp-autoJachai-status" style="font-size: 10px; color: #fca5a5; opacity: 0; transition: opacity 0.3s;">⚠️ Server-এ OFF করা আছে</span>
                    </div>
                    <label class="scp-switch">
                        <input type="checkbox" id="s_${f.id}" ${settings[f.id] ? "checked" : ""}>
                        <span class="scp-slider"></span>
                    </label>
                </div>
                `;
          }

          // Special handling for enableYearSelector with input field
          if (f.id === "enableYearSelector") {
            return `
                <div class="scp-switch-item scp-wide${isPremiumOnly ? " scp-premium-only" : ""}" data-id="${f.id}" style="justify-content: flex-start; gap: 12px;">
                    <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
                        <span class="scp-switch-label-text" style="flex:1; margin-bottom:0;">${f.label}</span>
                        <label class="scp-switch">
                            <input type="checkbox" id="s_${f.id}" ${settings[f.id] ? "checked" : ""}>
                            <span class="scp-slider"></span>
                        </label>
                    </div>
                    <div style="display:flex; gap:6px; align-items:center; width:100%;">
                        <input type="text" id="scp-year-shal-input" placeholder="যেমন: 2022-2023" value="${settings.defaultYearShal || ""}" style="
                            flex: 1;
                            padding: 6px 8px;
                            border: 1px solid rgba(16,185,129,0.25);
                            border-radius: 6px;
                            background: rgba(16,185,129,0.08);
                            color: white;
                            font-size: 11px;
                            outline: none;
                            transition: all 0.2s;
                        " />
                        <button id="scp-year-set-btn" style="
                            padding: 6px 10px;
                            background: linear-gradient(135deg, #10b981, #059669);
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-weight: bold;
                            font-size: 10px;
                            white-space: nowrap;
                            transition: all 0.2s;
                        ">✓ Set</button>
                    </div>
                </div>
                `;
          }

          return `
            <div class="scp-switch-item${isPremiumOnly ? " scp-premium-only" : ""}" data-id="${f.id}">
                <div style="display:flex; flex-direction:column; gap:2px; flex:1;">
                    <span class="scp-switch-label-text">${f.label}</span>
                    ${extraContent}
                </div>
                <label class="scp-switch">
                    <input type="checkbox" id="s_${f.id}" ${settings[f.id] ? "checked" : ""}>
                    <span class="scp-slider"></span>
                </label>
            </div>
            `;
        })
        .join("") +
      `</div>`;

    settingsHTML += `
            <div style="
                margin: 16px 0 12px;
                padding: 14px 16px;
                background: linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(56,189,248,0.12) 100%);
                border: 1.5px solid rgba(16,185,129,0.45);
                border-radius: 12px;
                box-shadow: 0 2px 16px rgba(16,185,129,0.12);
            ">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
                    <div style="font-size:10px; font-weight:700; letter-spacing:2px; color:#10b981; text-transform:uppercase;">👨‍💻Contact With Developer</div>
                    <div onclick="window.open('https://drive.google.com/drive/folders/1-nMKWrnW7cdVkgu_Gc4dRK9X5Ko7UVg1?usp=sharing', '_blank')" style="
                        font-size:13px; font-weight:800; font-family:monospace;
                        color:#38bdf8;
                        cursor: pointer;
                        background: rgba(56,189,248,0.18);
                        border: 1.5px solid rgba(56,189,248,0.5);
                        border-radius:7px;
                        padding: 4px 12px;
                        letter-spacing:0.5px;
                        text-shadow: 0 0 8px rgba(56,189,248,0.4);
                    ">Video Tutorials</div>
                </div>
                <div style="display:flex; align-items:center; justify-content:space-between;">
                    <div onclick="window.open('https://t.me/LandAutomationProductivity', '_blank')" style="
                        font-size:16px; font-weight:900; color:#10b981; cursor: pointer;
                        letter-spacing:2px; font-family:monospace;
                        text-shadow: 0 0 12px rgba(16,185,129,0.5);
                    ">Join Telegram</div>
                    <div onclick="window.open('https://drive.google.com/drive/folders/1qGGsXvuJo6hzhFyM6UwABHU_-yUbod-C?usp=sharing', '_blank')" style="
                        font-size:13px; font-weight:800; font-family:monospace;
                        color:#38bdf8;
                        cursor: pointer;
                        background: rgba(56,189,248,0.18);
                        border: 1.5px solid rgba(56,189,248,0.5);
                        border-radius:7px;
                        padding: 4px 12px;
                        letter-spacing:0.5px;
                        text-shadow: 0 0 8px rgba(56,189,248,0.4);
                    ">Click Here To See Update</div>
                </div>
            </div>

            <div style="padding-top: 12px; border-top: 1px solid var(--border-glass); margin-top: 10px;">
                <label style="font-size: 12px; font-weight: 500; color: var(--text-secondary); margin-bottom: 4px; display: block;">ভূমি জরিপের ধরন</label>
                <select id="s_surveyValue" class="scp-input" style="padding: 6px; font-size: 12px; background: rgba(0,0,0,0.05);">
                    <option value="সিটি / মহানগর" ${settings.surveyValue === "সিটি / মহানগর" ? "selected" : ""}>সিটি / মহানগর</option>
                    <option value="সি এস" ${settings.surveyValue === "সি এস" ? "selected" : ""}>সি এস</option>
                    <option value="দিয়ারা" ${settings.surveyValue === "দিয়ারা" ? "selected" : ""}>দিয়ারা</option>
                    <option value="আর এস" ${settings.surveyValue === "আর এস" ? "selected" : ""}>আর এস</option>
                    <option value="এস এ" ${settings.surveyValue === "এস এ" ? "selected" : ""}>এস এ</option>
                    <option value="পেটি" ${settings.surveyValue === "পেটি" ? "selected" : ""}>পেটি</option>
                    <option value="খেবট" ${settings.surveyValue === "খেবট" ? "selected" : ""}>খেবট</option>
                    <option value="মিউনিসিপ্যালিটি" ${settings.surveyValue === "মিউনিসিপ্যালিটি" ? "selected" : ""}>মিউনিসিপ্যালিটি</option>
                    <option value="বি এস" ${settings.surveyValue === "বি এস" ? "selected" : ""}>বি এস</option>
                    <option value="বি আর এস" ${settings.surveyValue === "বি আর এস" ? "selected" : ""}>বি আর এস</option>
                    <option value="বিডিএস" ${settings.surveyValue === "বিডিএস" ? "selected" : ""}>বিডিএস</option>
                </select>
                
                <label style="font-size: 12px; font-weight: 500; color: var(--text-secondary); margin-top: 8px; margin-bottom: 4px; display: block;">মালিকানা সূত্র</label>
                <select id="s_sourceValue" class="scp-input" style="padding: 6px; font-size: 12px; background: rgba(0,0,0,0.05);">
                    <option value="সর্বশেষ জরিপ অনুযায়ী" ${settings.sourceValue === "সর্বশেষ জরিপ অনুযায়ী" ? "selected" : ""}>সর্বশেষ জরিপ অনুযায়ী</option>
                    <option value="ম্যানুয়াল নামজারি" ${settings.sourceValue === "ম্যানুয়াল নামজারি" ? "selected" : ""}>ম্যানুয়াল নামজারি</option>
                    <option value="ই-নামজারি" ${settings.sourceValue === "ই-নামজারি" ? "selected" : ""}>ই-নামজারি</option>
                </select>

                <label style="font-size: 12px; font-weight: 500; color: var(--text-secondary); margin-top: 8px; margin-bottom: 4px; display: block;">ডিফল্ট ঠিকানা</label>
                <input type="text" id="s_defaultAddress" class="scp-input" value="${settings.defaultAddress || ""}" placeholder="ডিফল্ট ঠিকানা দিন" style="padding: 6px; font-size: 12px; background: rgba(0,0,0,0.05);" />
            </div>

            <div style="padding: 8px 0 0 0; display: flex; gap: 8px; justify-content: center;">
                <button id="scp-buy-subscription-btn" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; border: none; padding: 9px 16px; border-radius: 8px; cursor: pointer; flex: 1; font-weight: bold; font-size: 12px; font-family: 'Inter', sans-serif; transition: opacity 0.2s;">
                    💳 Buy Subscription
                </button>
                <button id="scp-logout-btn" style="background: #6b7280; color: white; border: none; padding: 9px 16px; border-radius: 8px; cursor: pointer; flex: 1; font-weight: bold; font-size: 12px; font-family: 'Inter', sans-serif;">
                    🚪 Logout
                </button>
            </div>
        `;

    // ---- Data Tab HTML ----
    const dataTabHTML = `
            <div style="padding: 10px 0 6px 0;">
                



                
                <input type="text" id="scp-search-box" class="scp-input" placeholder="🔍 খুঁজুন...">
                <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 5px;">
                    মোট: <strong id="scp-data-count" style="color: var(--primary);">0</strong>
                </div>
                <div style="max-height: 160px; overflow-y: auto; border-radius: 6px; border: 1px solid var(--border-glass);">
                    <table class="scp-data-table">
                        <thead><tr>
                            <th>হোল্ডিং</th><th>খতিয়ান</th><th>মন্তব্য</th><th></th>
                        </tr></thead>
                        <tbody id="scp-data-table-body"></tbody>
                    </table>
                </div>
                <div style="display: flex; gap: 4px; margin-top: 8px;">
                    <button id="scp-dl-excel" class="scp-btn" style="background:#198754; flex:1;">Excel</button>
                    <button id="scp-dl-csv" class="scp-btn" style="background:#0d6efd; flex:1;">CSV</button>
                    <button id="scp-dl-txt" class="scp-btn" style="background:#ffc107; color:#000; flex:1;">TXT</button>
                    <button id="scp-reset-btn" class="scp-btn" style="background:#dc3545; flex:1;">Reset</button>
                </div>
            </div>
        `;

    // ---- Khatian Tab HTML ----
    const khatianTabHTML = `
            <div style="padding: 12px 0;">
                <!-- Khatian Panel: Toggle Only -->
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 16px;">📋</span>
                        <div>
                            <div style="font-weight: 600; color: var(--text-primary); font-size: 12px;">Khatian Auto Entry</div>
                            <div style="font-size: 10px; color: var(--text-secondary); margin-top: 2px;">Open panel on page</div>
                        </div>
                    </div>
                    <label style="display: inline-block; position: relative; width: 48px; height: 26px; margin: 0; padding: 0;">
                        <input type="checkbox" id="scp-khatian-toggle" style="opacity: 0; width: 0; height: 0;">
                        <span class="scp-slider" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(239,68,68,0.4); border: 1px solid rgba(239,68,68,0.5); border-radius: 13px; cursor: pointer; transition: all 0.3s ease;"></span>
                        <span style="position: absolute; width: 22px; height: 22px; background-color: white; border-radius: 11px; top: 2px; left: 2px; transition: all 0.3s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.2); z-index: 2;" class="scp-slider-thumb"></span>
                    </label>
                </div>
                
                <!-- Khatian Features -->
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-glass);">
                    <div style="font-size: 11px; color: var(--text-secondary); font-weight: 600; margin-bottom: 10px;">📜 খতিয়ান অটো ফিচার</div>
                    <div id="scp-khatian-switches" style="display:flex; flex-direction:column; gap:8px;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <input type="checkbox" id="scp-khatian-auto-increment" style="width:16px; height:16px; cursor:pointer;">
                            <label style="font-size:11px; color:var(--text-primary); cursor:pointer; margin:0;">🔄 Auto-Increment (Escape কী)</label>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <input type="checkbox" id="scp-khatian-force-search" style="width:16px; height:16px; cursor:pointer;">
                            <label style="font-size:11px; color:var(--text-primary); cursor:pointer; margin:0;">🔍 Force Search After Increment</label>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <input type="checkbox" id="scp-khatian-auto-click" style="width:16px; height:16px; cursor:pointer;">
                            <label style="font-size:11px; color:var(--text-primary); cursor:pointer; margin:0;">🎯 Auto Click প্রদর্শন Button</label>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <input type="checkbox" id="scp-khatian-download-toggle" style="width:16px; height:16px; cursor:pointer;">
                            <label style="font-size:11px; color:var(--text-primary); cursor:pointer; margin:0;">⬇️ এক ক্লিকে ডাউনলোড ই-নামজারি খাতিয়ান </label>
                        </div>
                    </div>
                    <button id="scp-khatian-save-features-btn" class="scp-btn" style="background:#198754; width:100%; margin-top:10px; padding:8px;">সংরক্ষণ করুন</button>
                </div>
            </div>
        `;

    // ---- Comments Tab HTML ----
    const commentsTabHTML = `
            <div style="padding: 10px 0 6px 0;">
                <div style="font-size: 11px; color: var(--text-secondary); font-weight: 600; margin-bottom: 8px;">💬নিচের Default Comment গুলো ছাড়া লগ সাইতে অটো এন্ট্রি নিবে না</div>
                <div id="scp-comments-container" style="display:flex; flex-direction:column; gap:6px;">
                    ${settings.pinnedComments
                      .map(
                        (c, i) => `
                        <input type="text" id="scp-comment-${i}" class="scp-input" value="${c}" style="margin-bottom:0;">
                    `,
                      )
                      .join("")}
                </div>
                <div style="display: flex; gap: 4px; margin-top: 10px;">
                    <button id="scp-save-comments-btn" class="scp-btn" style="background:#198754; flex:1;">Save Comments</button>
                    <button id="scp-reset-comments-btn" class="scp-btn" style="background:#dc3545; flex:1;">Reset Default</button>
                </div>
            </div>
        `;

    const wrapper = document.createElement("div");
    wrapper.id = "scp-wrapper";
    wrapper.innerHTML = `
            <div id="scp-circle" class="scp-glass" title="Settings (Ctrl+Shift+S)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1-2.83 2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
            </div>
            <div id="scp-panel" class="scp-glass">
                <div id="scp-header" class="scp-header">
                    <div>
                        <span>⚙️ Smart Settings</span>
                        <div id="scp-user-info" style="font-size: 10px; color: rgba(255,255,255,0.7); margin-top: 4px;">
                            <div style="display: flex; gap: 8px; align-items: center;">
                                <span id="scp-username-display">👤 User: Loading...</span>
                                <span id="scp-expiredate-display">📅 Expire Date: Loading...</span>
                            </div>
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:12px;">
                        <button id="scp-buy-subscription-header-btn" style="
                            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                            color: white;
                            border: none;
                            padding: 8px 14px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-weight: 800;
                            font-size: 13px;
                            font-family: 'Inter', sans-serif;
                            transition: all 0.3s ease;
                            box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4), inset 0 1px 0 rgba(255,255,255,0.3);
                            letter-spacing: 0.5px;
                            animation: pulse-glow 2s infinite;
                        " title="আপগ্রেড করুন!">
                            💳 Buy Premium
                        </button>
                        <button id="scp-close-btn" class="scp-close-btn">&times;</button>
                    </div>
                </div>
                <div class="scp-tabs">
                    <button class="scp-tab-btn active" data-tab="settings">⚙️ Holding Pannel</button>
                    <button class="scp-tab-btn" data-tab="data">📊 Data Pannel</button>
                    <button class="scp-tab-btn" data-tab="khatian"> Khatian pannel </button>
                    <button class="scp-tab-btn" data-tab="comments">💬 Comments</button>
                </div>
                <div class="scp-content">
                    <div id="scp-tab-settings" class="scp-tab-content active">
                        ${settingsHTML}
                    </div>
                    <div id="scp-tab-data" class="scp-tab-content">
                        ${dataTabHTML}
                    </div>
                    <div id="scp-tab-khatian" class="scp-tab-content">
                        ${khatianTabHTML}
                    </div>
                    <div id="scp-tab-comments" class="scp-tab-content">
                        ${commentsTabHTML}
                    </div>
                </div>
            </div>
        `;

    const ownerBtn = document.createElement("div");
    ownerBtn.id = "scp-owner-btn";
    ownerBtn.title = "Split Owner Land Portions";
    ownerBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line>
            </svg>
        `;
    if (!settings.shareSplit) ownerBtn.classList.add("hidden");

    shadow.appendChild(wrapper);
    shadow.appendChild(ownerBtn);
    
    // ❌ Hide settings icon by default - will be shown only after successful login
    wrapper.style.display = "none";
    
    // ✅ Initialize user info display on first load
    updateUserInfoDisplay();

    // ✅ Update khatian download toggle based on autoYachaiClick warning visibility
    const updateKhatianDownloadUI = () => {
      const statusMsg = shadow.getElementById("scp-autoJachai-status");
      const downloadToggleDivs = shadow.querySelectorAll('div[style*="display:flex; align-items:center; gap:8px;"]');
      
      let downloadDiv = null;
      downloadToggleDivs.forEach(div => {
        if (div.querySelector('#scp-khatian-download-toggle')) {
          downloadDiv = div;
        }
      });
      
      if (!downloadDiv) return;
      
      // যদি autoYachaiClick warning visible থাকে (opacity 1), তখন download toggle disable করো
      if (statusMsg && statusMsg.style.opacity === "1") {
        downloadDiv.innerHTML = `
    <input type="checkbox" id="scp-khatian-download-toggle" disabled style="width:16px; height:16px; cursor:not-allowed; pointer-events:none;">
    <label style="font-size:11px; color:var(--text-primary); cursor:not-allowed; margin:0; pointer-events:none;">⬇️ এক ক্লিকে ডাউনলোড ই-নামজারি খাতিয়ান </label>`;
        downloadDiv.style.opacity = "0.6";
        downloadDiv.style.pointerEvents = "none";
      } else {
        // Warning না থাকলে normal করো
        downloadDiv.innerHTML = `
    <input type="checkbox" id="scp-khatian-download-toggle" style="width:16px; height:16px; cursor:pointer;">
    <label style="font-size:11px; color:var(--text-primary); cursor:pointer; margin:0;">⬇️ এক ক্লিকে ডাউনলোড ই-নামজারি খাতিয়ান </label>`;
        downloadDiv.style.opacity = "1";
        downloadDiv.style.pointerEvents = "auto";
      }
    };
    
    // Initial call
    setTimeout(updateKhatianDownloadUI, 100);

    const panelEl = shadow.getElementById("scp-panel");
    const headerEl = shadow.getElementById("scp-header");
    const circleEl = shadow.getElementById("scp-circle");

    // ✅ নতুন - Update user info display (read from localStorage first, then chrome.storage)
    function updateUserInfoDisplay() {
      const usernameDisplay = shadow.getElementById("scp-username-display");
      const expiredateDisplay = shadow.getElementById("scp-expiredate-display");
      
      // Try localStorage first
      let username = localStorage.getItem('userName') || null;
      let expireDate = localStorage.getItem('expireDate') || null;
      
      // If not in localStorage, try chrome.storage
      if (!username || !expireDate) {
        chrome.storage.local.get(["userName", "expireDate"], (res) => {
          username = res.userName || username || "Unknown";
          expireDate = res.expireDate || expireDate || "N/A";
          
          if (usernameDisplay) {
            usernameDisplay.textContent = "👤 User: " + username;
          }
          
          if (expiredateDisplay) {
            applyExpireDateColor(expiredateDisplay, expireDate);
          }
        });
      } else {
        // Data found in localStorage, update immediately
        if (usernameDisplay) {
          usernameDisplay.textContent = "👤 User: " + (username || "Unknown");
        }
        
        if (expiredateDisplay) {
          applyExpireDateColor(expiredateDisplay, expireDate || "N/A");
        }
      }
    }
    
    // ✅ Helper function to apply color and text to expire date display
    function applyExpireDateColor(element, expireDate) {
      // Color code based on expiration
      let color = "rgba(255,255,255,0.7)";
      let displayText = "📅 Expires: N/A";
      
      if (expireDate === "Lifetime") {
        color = "#10b981"; // Green for lifetime
        displayText = "📅 Expires: Lifetime";
      } else if (expireDate !== "N/A" && expireDate) {
        try {
          const expDate = new Date(expireDate);
          const today = new Date();
          const daysLeft = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));
          
          if (daysLeft < 0) {
            color = "#ef4444"; // Red if expired
            displayText = "📅 Expires: Expired";
          } else if (daysLeft === 0) {
            color = "#ef4444"; // Red
            displayText = "📅 Expires: Today";
          } else if (daysLeft < 7) {
            color = "#f59e0b"; // Orange if less than 7 days
            displayText = "📅 Expires: " + daysLeft + " দিন বাকি";
          } else {
            color = "#10b981"; // Green otherwise
            displayText = "📅 Expires: " + daysLeft + " দিন বাকি";
          }
        } catch (e) {
          displayText = "📅 Expires: Invalid";
        }
      }
      element.style.color = color;
      element.textContent = displayText;
    }
    
    makeDraggable(wrapper, headerEl);
    const circleDrag = makeDraggable(wrapper, circleEl);
    const ownerDrag = makeDraggable(ownerBtn, ownerBtn);
    
    // Call on panel open
    circleEl.addEventListener("click", (e) => {
      if (circleDrag.isDragging()) return;
      updateUserInfoDisplay();
      panelEl.classList.toggle("open");
    });
    
    // ✅ Refresh user info every 2 seconds when panel is open
    setInterval(() => {
      if (panelEl && panelEl.classList.contains("open")) {
        updateUserInfoDisplay();
      }
    }, 2000);

    shadow.getElementById("scp-close-btn").addEventListener("click", () => {
      panelEl.classList.remove("open");
    });

    ownerBtn.addEventListener("click", (e) => {
      if (ownerDrag.isDragging()) return;
      applySplit();
    });

    // --- Tab Switching ---
    shadow.querySelectorAll(".scp-tab-btn").forEach((tabBtn) => {
      tabBtn.addEventListener("click", () => {
        if (tabBtn.classList.contains("scp-locked")) {
          showToast(
            "⚠️ Data Management শুধুমাত্র Premium ইউজারদের জন্য!",
            true,
          );
          return;
        }
        shadow
          .querySelectorAll(".scp-tab-btn")
          .forEach((b) => b.classList.remove("active"));
        shadow
          .querySelectorAll(".scp-tab-content")
          .forEach((c) => c.classList.remove("active"));
        tabBtn.classList.add("active");
        shadow
          .getElementById("scp-tab-" + tabBtn.dataset.tab)
          .classList.add("active");
        
        // Refresh Comments tab when clicked
        if (tabBtn.dataset.tab === "comments") {
          const commentsContainer = shadow.getElementById("scp-comments-container");
          if (commentsContainer) {
            commentsContainer.innerHTML = settings.pinnedComments
              .map(
                (c, i) => `
                <input type="text" id="scp-comment-${i}" class="scp-input" value="${c}" style="margin-bottom:0;">
              `,
              )
              .join("");
          }
        }
        
        if (tabBtn.dataset.tab === "data") {
          if (tabBtn.dataset.tab === "khatian") {
            showToast(
              "⚠️ Khatian Features শুধুমাত্র Premium ইউজারদের জন্য!",
              true,
            );
          } else {
            showToast(
              "⚠️ Data Management শুধুমাত্র Premium ইউজারদের জন্য!",
              true,
            );
          }
          const urlInput = shadow.getElementById("scp-sheet-url-input");
          if (urlInput) {
            // সর্বদা সর্বশেষ storage থেকে দেখান
            chrome.storage.local.get(["dataSheetUrl"], (res) => {
              if (urlInput) urlInput.value = res.dataSheetUrl || "";
            });
          }
          renderDataTable();

          const dlBtns = shadow.querySelectorAll(
            "#scp-dl-excel, #scp-dl-csv, #scp-dl-txt",
          );
          const hasUrl = !!dataSheetUrl;
          dlBtns.forEach((btn) => {
            if (!hasUrl) {
              btn.classList.add("disabled-btn");
            } else {
              btn.classList.remove("disabled-btn");
            }
          });
        }
      });
    });

    // --- Settings Toggles & Inputs ---
    settingsFields.forEach((f) => {
      const chk = shadow.getElementById("s_" + f.id);
      if (!chk) return;
      chk.addEventListener("change", (e) => {
        // Check if this is a locked (premium-only) feature for free users
        const isPremiumOnly = !FREE_ALLOWED_FEATURES.has(f.id);
        chrome.storage.local.get(["subscription"], (res) => {
          const isFree =
            !res.subscription || res.subscription.toLowerCase() !== "premium";

          // If feature is premium-only and user is free, block the toggle when trying to enable
          if (isPremiumOnly && isFree && e.target.checked) {
            e.target.checked = false;
            showToast("🔒 এই ফিচার শুধুমাত্র Premium ইউজারদের জন্য!", true);
            return;
          }
        });

        // ❌ Block autoYachaiClick toggle if server-side autoJachai is OFF
        if (f.id === "autoYachaiClick") {
          chrome.storage.local.get(["autoJachai"], (res) => {
            if (res.autoJachai !== "ON") {
              // Server-side is OFF → revert checkbox
              e.target.checked = !e.target.checked;
              showToast("🔒 Admin ने এই feature OFF করা আছে।", true);
              return;
            }
          });
        }

        // Block change if item is locked (Free plan)
        // If it's the sub-toggle, check parent's lock state
        const parentId =
          f.id === "showCorrectionIcon" ? "autoRedirectDetailsToEdit" : f.id;
        const item = shadow.querySelector(
          `.scp-switch-item[data-id="${parentId}"]`,
        );
        if (item && item.classList.contains("scp-locked")) {
          e.target.checked = !e.target.checked; // revert
          return;
        }
        settings[f.id] = e.target.checked;
        saveSettings();
        if (f.id === "shareSplit") {
          if (e.target.checked) ownerBtn.classList.remove("hidden");
          else ownerBtn.classList.add("hidden");
        }
        if (f.id === "enableYearSelector") {
          if (e.target.checked) {
            createFloatingSetButton();
          } else {
            removeFloatingSetButton();
          }
        }
      });
    });

    // --- Year/Shal Input Handler ---
    const yearShalInput = shadow.getElementById("scp-year-shal-input");
    const yearSetBtn = shadow.getElementById("scp-year-set-btn");

    if (yearShalInput) {
      // Set initial value from settings
      yearShalInput.value = settings.defaultYearShal || "";

      yearShalInput.addEventListener("change", () => {
        settings.defaultYearShal = yearShalInput.value.trim();
        saveSettings();
        showToast("✅ Shal সংরক্ষণ করা হয়েছে!");
      });
      yearShalInput.addEventListener("input", () => {
        settings.defaultYearShal = yearShalInput.value.trim();
        saveSettings();
      });
      yearShalInput.addEventListener("blur", () => {
        settings.defaultYearShal = yearShalInput.value.trim();
        saveSettings();
      });
    }

    if (yearSetBtn) {
      yearSetBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (yearShalInput) {
          applyYearShalSelection(yearShalInput);
        }
      });
      yearSetBtn.addEventListener("mouseover", () => {
        yearSetBtn.style.transform = "scale(1.05)";
        yearSetBtn.style.boxShadow = "0 2px 8px rgba(16,185,129,0.5)";
      });
      yearSetBtn.addEventListener("mouseout", () => {
        yearSetBtn.style.transform = "scale(1)";
        yearSetBtn.style.boxShadow = "none";
      });
    }

    // --- showCorrectionIcon Nested Checkbox Handler ---
    const showCorrectionIconChk = shadow.getElementById("s_showCorrectionIcon");
    if (showCorrectionIconChk) {
      showCorrectionIconChk.addEventListener("change", (e) => {
        settings.showCorrectionIcon = e.target.checked;
        saveSettings();
      });
    }

    // --- Clear Details Cache listener ---
    const clearDetailsBtn = shadow.getElementById("scp-clear-details-cache");
    if (clearDetailsBtn) {
      clearDetailsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        let count = 0;
        // Need a stable list of keys to avoid index issues while removing
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("clicked_")) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => {
          localStorage.removeItem(k);
          count++;
        });
        showToast(`✅ ${count}টি বিস্তারিত ক্যাশ মুছে ফেলা হয়েছে!`);
      });
    }

    // --- Master Toggle Button Logic ---
    const masterBtn = shadow.getElementById("scp-master-toggle-btn");
    const masterStatus = shadow.getElementById("scp-mtl-status");

    function updateMasterBtnState() {
      // Count how many boolean toggles are ON (excluding locked ones)
      const boolFields = settingsFields.filter(
        (f) => typeof settings[f.id] === "boolean",
      );
      const onCount = boolFields.filter((f) => settings[f.id]).length;
      const allOn = onCount === boolFields.length;
      const allOff = onCount === 0;

      if (allOff) {
        masterBtn.textContent = "✅ সব চালু করুন";
        masterBtn.classList.remove("all-off");
        if (masterStatus) masterStatus.textContent = "সব বন্ধ";
      } else if (allOn) {
        masterBtn.textContent = "🔴 সব বন্ধ করুন";
        masterBtn.classList.add("all-off");
        if (masterStatus) masterStatus.textContent = "সব চালু";
      } else {
        masterBtn.textContent = "🔴 সব বন্ধ করুন";
        masterBtn.classList.add("all-off");
        if (masterStatus) masterStatus.textContent = `${onCount} টি চালু`;
      }
    }

    if (masterBtn) {
      masterBtn.addEventListener("click", () => {
        // Check if free account - block interaction
        chrome.storage.local.get(["subscription"], (res) => {
          const isFree =
            !res.subscription || res.subscription.toLowerCase() !== "premium";
          if (isFree) {
            showToast("🔒 মাস্টার টগল শুধুমাত্র Premium ইউজারদের জন্য!", true);
            return; // Do not proceed
          }

          const boolFields = settingsFields.filter(
            (f) => typeof settings[f.id] === "boolean",
          );
          const onCount = boolFields.filter((f) => settings[f.id]).length;
          const allOff = onCount === 0;
          const newVal = allOff; // if all OFF → turn ON; otherwise → turn all OFF

          boolFields.forEach((f) => {
            const item = shadow.querySelector(
              `.scp-switch-item[data-id="${f.id}"]`,
            );
            const isLocked = item && item.classList.contains("scp-locked");
            // Locked items: only allow if turning OFF (premium restriction)
            if (isLocked && newVal) return;
            settings[f.id] = newVal;
            const chk = shadow.getElementById("s_" + f.id);
            if (chk) chk.checked = newVal;
            // Handle shareSplit owner button visibility
            if (f.id === "shareSplit") {
              if (newVal) ownerBtn.classList.remove("hidden");
              else ownerBtn.classList.add("hidden");
            }
          });

          saveSettings();
          updateMasterBtnState();
        });
      });
    }

    // Keep master button state in sync with individual toggles
    settingsFields.forEach((f) => {
      const chk = shadow.getElementById("s_" + f.id);
      if (chk) chk.addEventListener("change", () => updateMasterBtnState());
    });

    // Initial state
    updateMasterBtnState();

    // Apply subscription lock UI after rendering
    chrome.storage.local.get(["subscription"], (res) => {
      const subscription = res.subscription || "Free";
      applyLockUI(shadow, subscription);

      // Disable master toggle button for free accounts
      const isFree = !subscription || subscription.toLowerCase() !== "premium";
      if (isFree && masterBtn) {
        masterBtn.classList.add("scp-free-disabled");
        masterBtn.title = "🔒 Premium প্ল্যানের সাথে সকল ফিচার আনলক করুন";
        masterBtn.style.pointerEvents = "none";
        masterBtn.style.cursor = "not-allowed";
      }
    });

    shadow.getElementById("s_surveyValue").addEventListener("change", (e) => {
      settings.surveyValue = e.target.value;
      saveSettings();
    });

    shadow.getElementById("s_sourceValue").addEventListener("change", (e) => {
      settings.sourceValue = e.target.value;
      saveSettings();
    });

    shadow.getElementById("s_defaultAddress").addEventListener("input", (e) => {
      settings.defaultAddress = e.target.value;
      saveSettings();
    });

    // --- Logout Button ---
    const logoutBtn = shadow.getElementById("scp-logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        doLogout();
        panelEl.classList.remove("open");
      });
    }

    // --- Buy Subscription Button ---
    const buySubBtn = shadow.getElementById("scp-buy-subscription-btn");
    if (buySubBtn) {
      buySubBtn.addEventListener("click", () => {
        showPaymentModal(shadow);
      });
    }
    
    // --- Buy Subscription Header Button ---
    const buySubHeaderBtn = shadow.getElementById("scp-buy-subscription-header-btn");
    if (buySubHeaderBtn) {
      buySubHeaderBtn.addEventListener("click", () => {
        showPaymentModal(shadow);
      });
    }

    // ✅ নতুন - Premium user এর জন্য buy buttons hide করো
    chrome.storage.local.get(["subscription"], (res) => {
      const subscription = res.subscription || "Free";
      const isPremium = subscription.toLowerCase() === "premium";
      
      if (isPremium) {
        // Header button hide করো
        if (buySubHeaderBtn) {
          buySubHeaderBtn.style.display = "none";
        }
        // Footer button hide করো
        if (buySubBtn) {
          buySubBtn.style.display = "none";
        }
      }
    });

    // --- Comments Tab Logic ---
    const saveCommentsBtn = shadow.getElementById("scp-save-comments-btn");
    if (saveCommentsBtn) {
      saveCommentsBtn.addEventListener("click", () => {
        const newComments = [];
        for (let i = 0; i < settings.pinnedComments.length; i++) {
          const el = shadow.getElementById("scp-comment-" + i);
          if (el) newComments.push(el.value);
        }
        settings.pinnedComments = newComments;
        saveSettings();
        showToast("✅ Comments Saved Successfully!");
      });
    }

    const resetCommentsBtn = shadow.getElementById("scp-reset-comments-btn");
    if (resetCommentsBtn) {
      resetCommentsBtn.addEventListener("click", () => {
        settings.pinnedComments = [
          "নাম সংশোধন করা হলো",
          "মালিকানার অংশের পরিমান সংশোধন করা হল",
          "জমির পরিমান সংশোধন করা হল",
          "ঠিকানা সংশোধন করা হল",
          "দাগ নাম্বার সংশোধন করা হল",
          "নাম ও দাগ সংশোধন করা হল",
          "নাম ও জমির পরিমান সংশোধন করা হল",
          "দাগ ও জমির পরিমান সংশোধন করা হল",
          "নাম ও মালিকানা অংশের পরিমান সংশোধন করা হল",
          "ভূমি জরিপের ধরন/মালিকানা সূত্র সংশোধন করা হল",
          "সর্বশেষ কর পরিশোধের সাল/ শুরুর সাল করা হল",
          "আগত খতিয়ান নং সংশোধন করা হল",
          "মামলা নম্বর সংশোধন করা হল",
          "আগত খতিয়ান নং ও নামজারি মামলা নম্বর সংশোধন করা হল",
          "দাগের মোট জমির পরিমান সংশোধন করা হল",
          "জমির শ্রেনী সংশোধন করা হল",
          "",
          "",
          "",
          "",
        ];
        saveSettings();
        for (let i = 0; i < settings.pinnedComments.length; i++) {
          const el = shadow.getElementById("scp-comment-" + i);
          if (el) el.value = settings.pinnedComments[i];
        }
        showToast("🔄 Reset to Default Comments!");
      });
    }

    // ========== KHATIAN TAB: Toggle controls main page draggable panel ==========
    const khatianToggle = shadow.getElementById("scp-khatian-toggle");

    let khatianPanel = null;
    let khatianPanelState = { visible: false, left: 16, top: 16 };

    // Load saved state
    try {
      const saved = localStorage.getItem("ak_panel_state");
      if (saved) khatianPanelState = JSON.parse(saved);
    } catch (e) {}

    // Create draggable panel
    function createKhatianPanel() {
      if (khatianPanel) return;

      const panel = document.createElement("div");
      panel.id = "ak-khatian-panel";
      Object.assign(panel.style, {
        position: "fixed",
        top: khatianPanelState.top + "px",
        left: khatianPanelState.left + "px",
        width: "360px",
        background: "#1e1e2f",
        color: "#fff",
        border: "1px solid #2e2e40",
        padding: "12px",
        borderRadius: "10px",
        boxShadow: "0 8px 26px rgba(0,0,0,0.25)",
        fontFamily: "Inter, Arial, sans-serif",
        zIndex: 999999,
        display: khatianPanelState.visible ? "block" : "none",
      });

      panel.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:move;margin-bottom:10px;" class="ak-header">
                    <div style="display:flex;align-items:center;gap:8px">
                        <div style="width:10px;height:10px;border-radius:50%;background:#7dcfff"></div>
                        <div style="font-weight:600;font-size:15px;color:#7dcfff">Auto Khatian</div>
                    </div>
                    <button style="background:transparent;border:none;color:#ccc;cursor:pointer;font-size:16px;padding:6px;border-radius:6px" class="ak-close">✕</button>
                </div>

                <div style="font-size:13px;color:#bfc7d6;margin-bottom:6px">Prefix (optional)</div>
                <input type="text" class="ak-prefix" placeholder="e.g. 25" style="width:100%;margin-bottom:10px;padding:8px;border-radius:8px;border:none;background:#2a2a3d;color:#fff;font-size:13px;box-sizing:border-box" />

                <div style="font-size:13px;color:#bfc7d6;margin-bottom:6px">Range / List</div>
                <textarea class="ak-range" placeholder="e.g. 1-100 or 377-385 or 101,102,105 or 25-1 to 25-100" style="width:100%;height:88px;margin-bottom:10px;padding:8px;border-radius:8px;border:none;background:#2a2a3d;color:#fff;font-size:13px;resize:vertical;box-sizing:border-box"></textarea>

                <div style="display:flex;gap:8px;margin-bottom:10px">
                    <button class="ak-start" style="flex:1;padding:8px;border-radius:8px;border:none;background:#3a86ff;color:#fff;cursor:pointer;font-weight:600">Start</button>
                    <button class="ak-stop" style="width:84px;padding:8px;border-radius:8px;border:none;background:#ff595e;color:#fff;cursor:pointer;font-weight:600">Stop</button>
                    <button class="ak-clear" style="width:84px;padding:8px;border-radius:8px;border:none;background:#6c757d;color:#fff;cursor:pointer;font-weight:600">Clear</button>
                </div>

                <div style="display:flex;align-items:center;gap:10px">
                    <label style="font-size:12px;color:#bfc7d6">Delay (ms)</label>
                    <input type="number" class="ak-delay" value="1400" style="flex:1;padding:6px;border-radius:6px;border:none;background:#2a2a3d;color:#fff;text-align:right" />
                    <div class="ak-status" style="font-size:13px;color:#7dcfff;font-weight:600">idle</div>
                </div>

                <div style="font-size:11px;color:#9aa3b2;margin-top:8px">Ctrl+Alt+V → paste & start</div>
            `;

      document.body.appendChild(panel);
      khatianPanel = panel;

      // Draggable header
      let dragging = false,
        dragOffX = 0,
        dragOffY = 0;
      const header = panel.querySelector(".ak-header");

      header.addEventListener("pointerdown", (e) => {
        dragging = true;
        const rect = panel.getBoundingClientRect();
        dragOffX = e.clientX - rect.left;
        dragOffY = e.clientY - rect.top;
      });

      document.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        const left = Math.max(6, e.clientX - dragOffX);
        const top = Math.max(6, e.clientY - dragOffY);
        panel.style.left = left + "px";
        panel.style.top = top + "px";
      });

      document.addEventListener("pointerup", () => {
        if (!dragging) return;
        dragging = false;
        const rect = panel.getBoundingClientRect();
        khatianPanelState.left = Math.round(rect.left);
        khatianPanelState.top = Math.round(rect.top);
        localStorage.setItem(
          "ak_panel_state",
          JSON.stringify(khatianPanelState),
        );
      });

      // Close button
      panel.querySelector(".ak-close").addEventListener("click", () => {
        khatianPanel.style.display = "none";
        khatianPanelState.visible = false;
        localStorage.setItem(
          "ak_panel_state",
          JSON.stringify(khatianPanelState),
        );
        if (khatianToggle) khatianToggle.checked = false;
      });

      setupKhatianPanel();
    }

    // Setup panel automation
    function setupKhatianPanel() {
      if (!khatianPanel) return;

      let queue = [],
        idx = 0,
        running = false,
        timerId = null;

      const inPrefix = khatianPanel.querySelector(".ak-prefix");
      const inRange = khatianPanel.querySelector(".ak-range");
      const btnStart = khatianPanel.querySelector(".ak-start");
      const btnStop = khatianPanel.querySelector(".ak-stop");
      const btnClear = khatianPanel.querySelector(".ak-clear");
      const inDelay = khatianPanel.querySelector(".ak-delay");
      const statusEl = khatianPanel.querySelector(".ak-status");

      function parseRangeText(text, prefix) {
        if (!text) return [];
        const normalized = text
          .replace(/–/g, "-")
          .replace(/—/g, "-")
          .replace(/\s+to\s+/gi, "-");
        const parts = normalized
          .split(/[\n,;]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        const out = [];

        for (let part of parts) {
          let m = part.match(/^(\d+)-(\d+)\s*-\s*(\d+)-(\d+)$/);
          if (m) {
            const gPrefix = m[1];
            const start = Number(m[2]),
              end = Number(m[4]);
            if (!isNaN(start) && !isNaN(end) && start <= end) {
              for (let i = start; i <= end; i++) out.push(`${gPrefix}-${i}`);
            }
            continue;
          }

          m = part.match(/^(\d+)\s*-\s*(\d+)$/);
          if (m) {
            const start = Number(m[1]),
              end = Number(m[2]);
            if (!isNaN(start) && !isNaN(end) && start <= end) {
              for (let i = start; i <= end; i++) {
                out.push(prefix ? `${prefix}-${i}` : `${i}`);
              }
              continue;
            }
          }

          out.push(prefix ? `${prefix}-${part}` : part);
        }

        return out;
      }

      function engToBanglaNum(str) {
        const banglaNumbers = {
          0: "০",
          1: "১",
          2: "২",
          3: "৩",
          4: "৪",
          5: "৫",
          6: "৬",
          7: "৭",
          8: "৮",
          9: "৯",
        };
        return String(str).replace(/[0-9]/g, (match) => banglaNumbers[match]);
      }

      function findTargetInput() {
        // First priority: Look for name="khatian_no"
        let el = document.querySelector('input[name="khatian_no"]');
        if (el) return el;

        // Second priority: Look for placeholder containing "খতিয়ান"
        const candidates = Array.from(
          document.querySelectorAll("input, textarea"),
        );
        for (let el of candidates) {
          const ph = (el.getAttribute("placeholder") || "")
            .toString()
            .toLowerCase();
          const aria = (el.getAttribute("aria-label") || "")
            .toString()
            .toLowerCase();
          const name = (el.getAttribute("name") || "").toString().toLowerCase();
          if (
            ph.includes("খতিয়ান") ||
            aria.includes("খতিয়ান") ||
            name.includes("খতিয়ান")
          )
            return el;
        }

        // Third priority: Check associated labels
        const labels = Array.from(document.querySelectorAll("label"));
        for (let lab of labels) {
          if ((lab.innerText || "").toLowerCase().includes("খতিয়ান")) {
            const fid = lab.getAttribute("for");
            if (fid) {
              const e = document.getElementById(fid);
              if (e) return e;
            }
          }
        }

        // Fallback: return first visible input
        return candidates.find((el) => el.offsetParent !== null) || null;
      }

      function findSaveButton() {
        const candidates = Array.from(
          document.querySelectorAll(
            'button, input[type="button"], input[type="submit"]',
          ),
        );
        for (let b of candidates) {
          const txt = (
            (b.innerText || b.value) +
            " " +
            (b.getAttribute("title") || "") +
            " " +
            (b.getAttribute("aria-label") || "")
          ).toString();
          if (txt.includes("সংরক্ষণ")) return b;
        }
        for (let b of candidates) {
          const txt = ((b.innerText || b.value) + "").toLowerCase();
          if (txt.includes("save")) return b;
        }
        return null;
      }

      async function doNext() {
        if (idx >= queue.length) {
          statusEl.textContent = "finished";
          running = false;
          return;
        }

        const inputEl = findTargetInput();
        const btn = findSaveButton();

        if (!inputEl || !btn) {
          statusEl.textContent = "input/button not found";
          running = false;
          return;
        }

        if (inputEl.value && inputEl.value.trim() !== "") {
          statusEl.textContent = "waiting for input to clear...";
          timerId = setTimeout(doNext, 300);
          return;
        }

        const val = queue[idx];
        statusEl.textContent = `processing ${idx + 1}/${queue.length}`;

        try {
          inputEl.focus();
          inputEl.value = engToBanglaNum(val);
          inputEl.dispatchEvent(new Event("input", { bubbles: true }));
          inputEl.dispatchEvent(new Event("change", { bubbles: true }));
        } catch (e) {
          console.error("set input error", e);
        }

        try {
          if (!btn.disabled) btn.click();
          else {
            const form = btn.closest("form");
            if (form) form.requestSubmit?.();
          }
        } catch (e) {
          console.error("click error", e);
        }

        const remainingItems = queue.slice(idx + 1);
        inRange.value = remainingItems.join("\n");

        idx++;
        const delay = Math.max(200, Number(inDelay.value) || 1500);
        timerId = setTimeout(doNext, delay);
      }

      btnStart.addEventListener("click", () => {
        if (running) return;
        const prefix = inPrefix.value.trim() || "";
        const raw = inRange.value.trim();
        const list = parseRangeText(raw, prefix);

        if (!list.length) {
          statusEl.textContent = "no items";
          return;
        }

        queue = list.slice();
        idx = 0;
        running = true;
        statusEl.textContent = "running";
        doNext();
      });

      btnStop.addEventListener("click", () => {
        clearTimeout(timerId);
        running = false;
        statusEl.textContent = "stopped";
      });

      btnClear.addEventListener("click", () => {
        clearTimeout(timerId);
        running = false;
        inPrefix.value = "";
        inRange.value = "";
        statusEl.textContent = "cleared";
      });

      // Keyboard shortcut
      window.addEventListener("keydown", async (e) => {
        if (e.ctrlKey && e.altKey && e.code === "KeyV") {
          try {
            const txt = await navigator.clipboard.readText();
            if (txt) {
              inRange.value = txt;
              btnStart.click();
            }
          } catch (err) {
            statusEl.textContent = "clipboard denied";
          }
        }
      });
    }

    // Toggle listener
    if (khatianToggle) {
      khatianToggle.addEventListener("change", (e) => {
        if (e.target.checked) {
          if (!khatianPanel) createKhatianPanel();
          khatianPanel.style.display = "block";
          khatianPanelState.visible = true;
        } else {
          if (khatianPanel) khatianPanel.style.display = "none";
          khatianPanelState.visible = false;
        }
        localStorage.setItem(
          "ak_panel_state",
          JSON.stringify(khatianPanelState),
        );

        // Update slider appearance
        const slider = shadow.querySelector("span.scp-slider");
        const thumb = shadow.querySelector("span.scp-slider-thumb");
        if (slider && thumb) {
          if (e.target.checked) {
            slider.style.background =
              "linear-gradient(135deg, rgba(16,185,129,0.4), rgba(16,185,129,0.6))";
            slider.style.borderColor = "rgba(16,185,129,0.6)";
            thumb.style.left = "24px";
          } else {
            slider.style.background = "rgba(239,68,68,0.4)";
            slider.style.borderColor = "rgba(239,68,68,0.5)";
            thumb.style.left = "2px";
          }
        }
      });

      // Restore state on load
      if (khatianPanelState.visible) {
        khatianToggle.checked = true;
        setTimeout(() => {
          if (!khatianPanel) createKhatianPanel();
          khatianPanel.style.display = "block";
        }, 100);
      }
    }

    // ========== KHATIAN TAB: Auto-Increment Toggles ==========
    const khatianSwitches = shadow.querySelectorAll(
      '#scp-khatian-switches input[type="checkbox"]',
    );
    if (khatianSwitches.length > 0) {
      // Initialize checkbox states
      const autoIncrementCheckbox = shadow.getElementById(
        "scp-khatian-auto-increment",
      );
      const forceSearchCheckbox = shadow.getElementById(
        "scp-khatian-force-search",
      );
      const autoClickCheckbox = shadow.getElementById("scp-khatian-auto-click");
      const downloadToggleCheckbox = shadow.getElementById(
        "scp-khatian-download-toggle",
      );

      if (autoIncrementCheckbox)
        autoIncrementCheckbox.checked = settings.khatianAutoIncrement;
      if (forceSearchCheckbox)
        forceSearchCheckbox.checked = settings.khatianForceSearch;
      if (autoClickCheckbox)
        autoClickCheckbox.checked = settings.khatianAutoClick;
      if (downloadToggleCheckbox)
        downloadToggleCheckbox.checked = settings.enableKhatianDownload;

      // Save button
      const saveKhatianBtn = shadow.getElementById(
        "scp-khatian-save-features-btn",
      );
      if (saveKhatianBtn) {
        saveKhatianBtn.addEventListener("click", () => {
          settings.khatianAutoIncrement =
            autoIncrementCheckbox?.checked || false;
          settings.khatianForceSearch = forceSearchCheckbox?.checked || false;
          settings.khatianAutoClick = autoClickCheckbox?.checked || false;
          settings.enableKhatianDownload =
            downloadToggleCheckbox?.checked || false;
          saveSettings();

          // Initialize or clean up download observer based on toggle state
          if (settings.enableKhatianDownload) {
            initializeKhatianDownloadObserver();
          } else {
            cleanupKhatianDownloadObserver();
          }

          showToast("✅ Khatian Features Saved!");
        });
      }
    }

    // ========== KHATIAN DOWNLOAD OBSERVER ==========
    let khatianDownloadObserver = null;

    function initializeKhatianDownloadObserver() {
      if (khatianDownloadObserver) return; // Already initialized

      // একটি খতিয়ান প্রসেস করার মূল ফাংশন
      function processKhatian(button) {
        return new Promise((resolve) => {
          button.click();

          let checkInterval = setInterval(() => {
            let printContent = document.getElementById("printContent");

            if (printContent && printContent.innerHTML.length > 500) {
              clearInterval(checkInterval);

              let fullModal = printContent.closest(
                ".bg-white.rounded.shadow-sm.overflow-hidden",
              );

              if (fullModal) {
                try {
                  // খতিয়ান নম্বর বের করা
                  let khatianNo = "Unknown";
                  let h1El = fullModal.querySelector("h1.font-bold");
                  if (h1El) {
                    let spanEl = h1El.querySelector("span");
                    if (spanEl && spanEl.innerText.trim()) {
                      khatianNo = spanEl.innerText.trim();
                    }
                  }
                  let fileName = "খতিয়ান_নং_" + khatianNo;

                  // print বাটন লুকানোর জন্য CSS সহ পুরো HTML তৈরি
                  let fullHTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${fileName}</title>
    ${document.head.innerHTML}
    <style>
        body { background-color: #e5e7eb; padding: 40px; font-family: sans-serif; }
        .modalbox-head button { display: none !important; }
        button[aria-controls="basic-modal"] { display: none !important; }
        .container-wrapper { max-width: 1650px; margin: 0 auto; }
    </style>
</head>
<body>
    <div class="container-wrapper">
        ${fullModal.outerHTML}
    </div>
</body>
</html>`;

                  // নতুন ট্যাবে খোলা
                  let newWin = window.open("", "_blank");
                  newWin.document.write(fullHTML);
                  newWin.document.close();

                  // HTML ফাইল ডাউনলোড
                  let blob = new Blob([fullHTML], {
                    type: "text/html;charset=utf-8",
                  });
                  let url = URL.createObjectURL(blob);
                  let a = document.createElement("a");
                  a.href = url;
                  a.download = fileName + ".html";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);

                  // নতুন ট্যাব বন্ধ করা এবং মূল পেজে ফিরে যাওয়া
                  setTimeout(() => {
                    newWin.close();
                    window.focus();
                  }, 800);

                  // মোডাল বন্ধ করা
                  setTimeout(() => {
                    let closeBtn = fullModal.querySelector(
                      ".modalbox-head button",
                    );
                    if (closeBtn) closeBtn.click();
                    resolve();
                  }, 1000);
                } catch (err) {
                  console.error("Error processing khatian:", err);
                  resolve();
                }
              } else {
                resolve();
              }
            }
          }, 300);

          setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
          }, 15000);
        });
      }

      khatianDownloadObserver = new MutationObserver(() => {
        // print বাটন লুকানো
        document
          .querySelectorAll('button[aria-controls="basic-modal"]')
          .forEach((pb) => {
            pb.style.display = "none";
          });

        let buttons = document.querySelectorAll("button");
        buttons.forEach((button) => {
          if (
            button.innerText.includes("দেখুন") &&
            button.innerHTML.includes("bg-[#0DB14B]") &&
            !button.dataset.customBtnAdded
          ) {
            button.dataset.customBtnAdded = "true";

            if (button.parentElement) {
              button.parentElement.style.display = "flex";
              button.parentElement.style.gap = "10px";
            }

            let newBtn = document.createElement("button");
            newBtn.setAttribute("data-all-download-source", "true");
            newBtn.innerHTML = `<span class="${button.querySelector("span").className.replace("bg-[#0DB14B]", "bg-[#FF9800]")}" style="background-color: #FF9800 !important; color: white;">Download</span>`;
            button.after(newBtn);

            newBtn.onclick = function (e) {
              e.preventDefault();
              e.stopPropagation();

              // বাটন স্টাইল পরিবর্তন করা (ক্লিক হয়েছে এটা দেখানোর জন্য)
              newBtn.style.backgroundColor = "#4CAF50";
              newBtn.style.opacity = "0.7";

              processKhatian(button);
            };
          }
        });
      });

      khatianDownloadObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    function cleanupKhatianDownloadObserver() {
      if (khatianDownloadObserver) {
        khatianDownloadObserver.disconnect();
        khatianDownloadObserver = null;
      }
    }

    // Initialize on load if enabled
    if (settings.enableKhatianDownload) {
      setTimeout(() => initializeKhatianDownloadObserver(), 100);
    }

    // --- Data Tab: Sheet URL is auto-loaded from server, no manual save needed ---

    // --- Data Tab: Manual Add ---
    const addBtn = shadow.getElementById("scp-add-btn");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        const h = shadow.getElementById("scp-m-h").value.trim();
        const k = shadow.getElementById("scp-m-k").value.trim();
        const c = shadow.getElementById("scp-m-c").value.trim();
        if (!h && !k) return;
        const entry = {
          id: Date.now(),
          holding: convertToBengali(h),
          khatian: convertToBengali(k),
          comment: c || "N/A",
        };
        collectedData.push(entry);
        saveData();
        renderDataTable();
        sendToSheet(entry);
        shadow.getElementById("scp-m-h").value = "";
        shadow.getElementById("scp-m-k").value = "";
        shadow.getElementById("scp-m-c").value = "";
        showToast("✅ Data যোগ হয়েছে!");
      });
    }

    // --- Search ---
    const srchBox = shadow.getElementById("scp-search-box");
    if (srchBox) srchBox.addEventListener("keyup", renderDataTable);

    // --- Reset ---
    const resetBtn = shadow.getElementById("scp-reset-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        if (confirm("সব ডাটা মুছবেন?")) {
          collectedData = [];
          saveData();
          renderDataTable();
        }
      });
    }

    // --- Download Buttons ---
    const handleDownload = (fn) => (e) => {
      if (!dataSheetUrl) {
        showToast("⚠️ দয়া করে Data Sheet URL দিন!", true);
        return;
      }
      fn();
    };
    shadow
      .getElementById("scp-dl-excel")
      ?.addEventListener("click", handleDownload(downloadExcel));
    shadow
      .getElementById("scp-dl-csv")
      ?.addEventListener("click", handleDownload(downloadCSV));
    shadow
      .getElementById("scp-dl-txt")
      ?.addEventListener("click", handleDownload(downloadTXT));

    applyTheme();

    // Create floating Set button if enableYearSelector is already ON
    if (settings.enableYearSelector) {
      setTimeout(createFloatingSetButton, 100);
    }

    // Initial data count
    const countEl = shadow.getElementById("scp-data-count");
    if (countEl) countEl.textContent = collectedData.length;

    // ✅ Update autoYachaiClick toggle based on server-side autoJachai status
    chrome.storage.local.get(["autoJachai"], (res) => {
      const autoJachaiStatus = res.autoJachai || "OFF";
      const autoYachaiCheckbox = shadow.getElementById("s_autoYachaiClick");
      const autoYachaiItem = shadow.getElementById("scp-item-autoYachaiClick");
      const statusMsg = shadow.getElementById("scp-autoJachai-status");

      if (autoYachaiCheckbox && autoYachaiItem) {
        if (autoJachaiStatus === "OFF") {
          // Server-side OFF → disable checkbox
          autoYachaiCheckbox.disabled = true;
          autoYachaiCheckbox.checked = false;
          autoYachaiItem.style.opacity = "0.5";
          autoYachaiItem.style.pointerEvents = "none";
          if (statusMsg) statusMsg.style.opacity = "1";
          settings.autoYachaiClick = false;
          saveSettings();
        } else {
          // Server-side ON → enable checkbox
          autoYachaiCheckbox.disabled = false;
          autoYachaiItem.style.opacity = "1";
          autoYachaiItem.style.pointerEvents = "auto";
          if (statusMsg) statusMsg.style.opacity = "0";
        }
      }
    });
  }

  /* =========================
       OBSERVER & INIT
    ==========================*/
  const observer = new MutationObserver(() => {
    setupEnter();
    injectUI();
    applySangpingAuto();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  const runAutoClickDetails = () => {
    if (!settings.autoClickDetails) return;
    const pageKey = `clicked_${location.href}`;
    if (localStorage.getItem(pageKey)) return;

    const allElements = document.querySelectorAll("span.text-white.text-13");
    const targetButtons = Array.from(allElements).filter(
      (el) => el.textContent.trim() === "বিস্তারিত",
    );

    if (targetButtons.length === 1) {
      const el = targetButtons[0];
      let link = el.closest("a");
      if (link && link.href) {
        window.open(link.href, "_blank");
      } else {
        el.dispatchEvent(
          new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            view: window,
          }),
        );
      }
      localStorage.setItem(pageKey, "done");
    }
  };

  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  // Check for auto-close flag early (document ready)
  document.addEventListener("DOMContentLoaded", () => {
    if (sessionStorage.getItem("autoCloseTabAfterALT") === "true") {
      // Mark as detected so we don't check again
      sessionStorage.setItem("autoCloseTabAfterALT_detected", "true");
    }
  });

  window.addEventListener("load", () => {
    // Check if we need to close tab after ALT button automation
    const shouldClose =
      sessionStorage.getItem("autoCloseTabAfterALT") === "true" ||
      sessionStorage.getItem("autoCloseTabAfterALT_detected") === "true";

    if (shouldClose) {
      sessionStorage.removeItem("autoCloseTabAfterALT");
      sessionStorage.removeItem("autoCloseTabAfterALT_detected");
      // Wait longer for page to fully stabilize before closing
      setTimeout(() => {
        chrome.runtime.sendMessage({ action: "closeCurrentTab" });
      }, 1000);
    }

    setupEnter();
    injectUI();
    setTimeout(applySangpingAuto, 1000);
    setTimeout(runAutoClickDetails, 500);
    initInputFieldSync();
    initAutoClickSongsodhon();
    // Auth check করো (login overlay দেখাবে যদি logged out থাকে)
    checkAuthAndInit();
  });

  if (document.readyState === "complete") {
    // Check if we need to close tab after ALT button automation
    const shouldClose =
      sessionStorage.getItem("autoCloseTabAfterALT") === "true" ||
      sessionStorage.getItem("autoCloseTabAfterALT_detected") === "true";

    if (shouldClose) {
      sessionStorage.removeItem("autoCloseTabAfterALT");
      sessionStorage.removeItem("autoCloseTabAfterALT_detected");
      // Wait longer for page to fully stabilize before closing
      setTimeout(() => {
        chrome.runtime.sendMessage({ action: "closeCurrentTab" });
      }, 1000);
    }

    injectUI();
    setTimeout(applySangpingAuto, 1000);
    setTimeout(runAutoClickDetails, 500);
    initInputFieldSync();
    initAutoClickSongsodhon();
    checkAuthAndInit();
  }

  // =====================================================================
  // 🔍 VISIBLE "বিস্তারিত" BUTTON OPENER
  // =====================================================================
  (function () {
    "use strict";
    function _v(_e) {
      const _s = window.getComputedStyle(_e);
      return (
        _s.display !== "none" &&
        _s.visibility !== "hidden" &&
        parseFloat(_s.opacity) > 0 &&
        _e.offsetWidth > 0 &&
        _e.offsetHeight > 0
      );
    }
    async function _o() {
      const _a = Array.from(
        document.querySelectorAll("span.text-white.text-13"),
      ).filter(
        (_e) =>
          _e.textContent.trim() ===
            "\u09ac\u09bf\u09b8\u09cd\u09a4\u09be\u09b0\u09bf\u09a4" && _v(_e),
      );
      if (_a.length === 0) {
        alert(
          '\u274c \u0995\u09cb\u09a8\u09cb \u09a6\u09c3\u09b6\u09cd\u09af\u09ae\u09be\u09a8 "\u09ac\u09bf\u09b8\u09cd\u09a4\u09be\u09b0\u09bf\u09a4" span \u09aa\u09be\u0993\u09df\u09be \u09af\u09be\u09df\u09a8\u09bf\u0964',
        );
        return;
      }
      const _c = confirm(
        `\u2705 ${_a.length}\u099f\u09bf \u09a6\u09c3\u09b6\u09cd\u09af\u09ae\u09be\u09a8 "\u09ac\u09bf\u09b8\u09cd\u09a4\u09be\u09b0\u09bf\u09a4" span \u09aa\u09be\u0993\u09df\u09be \u0997\u09c7\u099b\u09c7\u0964 \u0996\u09c1\u09b2\u09a4\u09c7 \u099a\u09be\u0993?`,
      );
      if (!_c) return;
      for (let _i = 0; _i < _a.length; _i++) {
        const _p = _a[_i];
        const _l =
          _p.closest("a")?.href ||
          _p.parentElement?.getAttribute("href") ||
          _p.dataset?.link ||
          null;
        if (_l) {
          const _t = window.open(_l, "_blank");
          if (!_t) {
            alert(
              "\u26a0\ufe0f Popup Blocker \u099f\u09cd\u09af\u09be\u09ac \u0996\u09c1\u09b2\u09a4\u09c7 \u09ac\u09be\u09a7\u09be \u09a6\u09bf\u099a\u09cd\u099b\u09c7\u0964 Allow \u0995\u09b0\u09c7 \u0986\u09ac\u09be\u09b0 \u099a\u09c7\u09b7\u09cd\u099f\u09be \u0995\u09b0\u09cb\u0964",
            );
            break;
          }
        } else {
          _p.click();
        }
        await new Promise((_r) => setTimeout(_r, 700));
      }
      alert(
        `\ud83c\udfaf \u09ae\u09cb\u099f ${_a.length}\u099f\u09bf "\u09ac\u09bf\u09b8\u09cd\u09a4\u09be\u09b0\u09bf\u09a4" \u099f\u09cd\u09af\u09be\u09ac \u0996\u09cb\u09b2\u09be \u09b9\u09df\u09c7\u099b\u09c7\u0964`,
      );
    }
    document.addEventListener("keydown", (_evt) => {
      if (_evt.ctrlKey && _evt.shiftKey && _evt.key.toLowerCase() === "b") {
        if (
          typeof settings !== "undefined" &&
          !settings.enableBistaritoShortcut
        )
          return;
        _evt.preventDefault();
        _o();
      }
    });
    console.log(
      "\u2705 Script loaded. Press Ctrl+Shift+B to open all visible \u09ac\u09bf\u09b8\u09cd\u09a4\u09be\u09b0\u09bf\u09a4 spans (if enabled).",
    );
  })();

  // =====================================================================
  // 🤖 AUTO CLICK "যাচাই" BUTTON
  // =====================================================================
  (function () {
    "use strict";
    const POLL_INTERVAL = 1200;
    const RECLICK_COOLDOWN = 2000;
    const lastClick = new Map();

    function isYachai(el) {
      if (!el || !el.textContent) return false;
      const txt = el.textContent.trim();
      if (txt === "যাচাই") return true;
      if (txt.replace(/\s+/g, "") === "যাচাই") return true;
      return false;
    }

    function idFor(el) {
      try {
        if (el.href) return el.href;
      } catch (e) {}
      return el.tagName + "::" + (el.textContent || "").trim().slice(0, 40);
    }

    function doClick(el) {
      if (!el) return;
      const id = idFor(el);
      const now = Date.now();
      const prev = lastClick.get(id) || 0;
      if (now - prev < RECLICK_COOLDOWN) return;
      lastClick.set(id, now);

      const origConfirm = window.confirm;
      const origFlag = window.__cfRLUnblockHandlers;

      try {
        try {
          window.__cfRLUnblockHandlers = true;
        } catch (e) {}
        window.confirm = () => true;

        const evt = new MouseEvent("click", {
          view: window,
          bubbles: true,
          cancelable: true,
          composed: true,
        });
        el.dispatchEvent(evt);

        try {
          el.click && el.click();
        } catch (e) {}

        console.log("[AutoClick] clicked:", id);
      } catch (err) {
        console.warn("[AutoClick] failed click:", err);
      } finally {
        setTimeout(() => {
          try {
            window.confirm = origConfirm;
          } catch (e) {}
          try {
            window.__cfRLUnblockHandlers = origFlag;
          } catch (e) {}
        }, 150);
      }
    }

    function scan(root = document) {
      try {
        const cand = root.querySelectorAll(
          'a, button, span, input[type="button"], input[type="submit"]',
        );
        for (const el of cand) {
          if (isYachai(el)) doClick(el);
        }
      } catch (e) {}
    }

    // Check both local settings AND server-side autoJachai control
    function isAutoYachaiEnabled() {
      if (typeof settings === "undefined" || !settings.autoYachaiClick)
        return false;

      // Also check server-side control (from login response)
      let isServerEnabled = false;
      chrome.storage.local.get(["autoJachai"], (res) => {
        isServerEnabled = res.autoJachai === "ON";
      });
      return isServerEnabled;
    }

    if (typeof settings !== "undefined" && settings.autoYachaiClick) {
      let isServerEnabled = false;
      chrome.storage.local.get(["autoJachai"], (res) => {
        isServerEnabled = res.autoJachai === "ON";
        if (isServerEnabled) {
          scan();
        }
      });
    }

    const observer = new MutationObserver((mutations) => {
      if (typeof settings !== "undefined" && !settings.autoYachaiClick) return;

      // Check server-side control too
      chrome.storage.local.get(["autoJachai"], (res) => {
        if (res.autoJachai !== "ON") return;

        for (const m of mutations) {
          if (m.addedNodes && m.addedNodes.length) {
            for (const node of m.addedNodes) {
              if (!(node instanceof HTMLElement)) continue;
              if (isYachai(node)) {
                doClick(node);
              }
              scan(node);
            }
          }
        }
      });
    });

    observer.observe(document.documentElement || document, {
      childList: true,
      subtree: true,
    });

    const poller = setInterval(() => {
      if (typeof settings !== "undefined" && !settings.autoYachaiClick) return;

      // Check server-side control too
      chrome.storage.local.get(["autoJachai"], (res) => {
        if (res.autoJachai === "ON") {
          scan();
        }
      });
    }, POLL_INTERVAL);

    console.log('[AutoClick] initialized — monitoring for "যাচাই".');
  })();

  // =====================================================================
  // 🔼🔽 REPLACE INPUT TEXT WITH ARROW KEYS
  // =====================================================================
  (function () {
    "use strict";

    let currentIndex = -1;

    // Arrow key listener - inserts comments without requiring focus
    document.addEventListener("keydown", function (e) {
      // Only run if the setting is enabled
      if (typeof settings !== "undefined" && !settings.arrowKeyTextReplace)
        return;

      // Check if arrow keys are pressed
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;

      e.preventDefault();

      // Find comments textarea - doesn't require focus
      const commentTextarea = document.querySelector("textarea.comments");
      if (!commentTextarea) return; // No textarea found

      const myPinnedTexts =
        typeof settings !== "undefined" && settings.pinnedComments
          ? settings.pinnedComments
          : [
              "নাম সংশোধন করা হলো",
              "মালিকানার অংশের পরিমান সংশোধন করা হল",
              "জমির পরিমান সংশোধন করা হল",
              "ঠিকানা সংশোধন করা হল",
              "দাগ নাম্বার সংশোধন করা হল",
              "নাম ও দাগ সংশোধন করা হল",
              "নাম ও জমির পরিমান সংশোধন করা হল",
              "দাগ ও জমির পরিমান সংশোধন করা হল",
              "নাম ও মালিকানা অংশের পরিমান সংশোধন করা হল",
              "ভূমি জরিপের ধরন/মালিকানা সূত্র সংশোধন করা হল",
              "সর্বশেষ কর পরিশোধের সাল/ শুরুর সাল করা হল",
              "আগত খতিয়ান নং সংশোধন করা হল",
              "মামলা নম্বর সংশোধন করা হল",
              "আগত খতিয়ান নং ও নামজারি মামলা নম্বর সংশোধন করা হল",
              "দাগের মোট জমির পরিমান সংশোধন করা হল",
              "জমির শ্রেনী সংশোধন করা হল",
              "",
              "",
              "",
              "",
            ];

      // Update index
      if (e.key === "ArrowUp") {
        currentIndex = (currentIndex + 1) % myPinnedTexts.length;
      } else if (e.key === "ArrowDown") {
        currentIndex =
          (currentIndex - 1 + myPinnedTexts.length) % myPinnedTexts.length;
      }

      const textToPaste = myPinnedTexts[currentIndex];

      // Insert text directly into textarea without requiring focus
      commentTextarea.value = textToPaste;
      commentTextarea.dispatchEvent(new Event("input", { bubbles: true }));
      commentTextarea.dispatchEvent(new Event("change", { bubbles: true }));
    });
  })();
  // �🔄 INPUT FIELD SYNC (Dynamic Rows Supported)
  // =====================================================================
  function initInputFieldSync() {
    if (window._inputSyncInitialized) return;

    const attachSyncListener = (rowElement) => {
      // সোর্স ইনপুট (যেখানে লেখা হবে)
      const sourceInput = rowElement.querySelector(
        "div.w-\\[40\\%\\].items-center.py-4 > div > div.flex.items-center.justify-center.w-\\[30\\%\\].pr-1 > input",
      );
      // ডেস্টিনেশন ইনপুট (যেখানে পেস্ট হবে)
      const destinationInput = rowElement.querySelector(
        "div[class*='py-4'][class*='addSubItemInMainDev'][class*='addItemIner'] > div > div:nth-child(2) > input",
      );

      if (
        sourceInput &&
        destinationInput &&
        !sourceInput.dataset.syncAttached
      ) {
        sourceInput.addEventListener("input", () => {
          if (typeof settings !== "undefined" && settings.inputSync) {
            destinationInput.value = sourceInput.value;
            destinationInput.dispatchEvent(
              new Event("input", { bubbles: true }),
            );
            destinationInput.dispatchEvent(
              new Event("change", { bubbles: true }),
            );
          }
        });
        sourceInput.dataset.syncAttached = "true";
      }
    };

    const setupObserver = () => {
      const mainDiv = document.querySelector("#mainDiv");
      if (!mainDiv) return false;

      const initialRows = mainDiv.querySelectorAll(":scope > div");
      initialRows.forEach((row) => attachSyncListener(row));

      const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
          if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach((newNode) => {
              if (newNode.nodeType === 1) attachSyncListener(newNode);
            });
          }
        }
      });
      observer.observe(mainDiv, { childList: true, subtree: false });
      return true;
    };

    // Try to setup immediately, or poll if #mainDiv is not yet available
    if (!setupObserver()) {
      const pollInterval = setInterval(() => {
        if (setupObserver()) {
          clearInterval(pollInterval);
        }
      }, 1000);
      // Stop polling after 30 seconds
      setTimeout(() => clearInterval(pollInterval), 30000);
    }

    window._inputSyncInitialized = true;
  }
  // =====================================================================
  // 🤖 AUTO CLICK "Songsodhon" BUTTON (Every Reload)
  // =====================================================================
  function initAutoClickSongsodhon() {
    if (window._songsodhonInitialized) return;
    if (typeof settings === "undefined" || !settings.autoClickSongsodhon)
      return;
    window._songsodhonInitialized = true;

    const buttonSelector =
      "body > div.bg-\\[\\#EFF9F2\\].\\32 xl\\:container.mx-auto > div.w-full.h-auto.lg\\:px-5 > div.w-full.mt-3.flex.lg\\:px-5 > div.bg-white.w-full.lg\\:w-\\[75\\%\\].h-full.main-content.mb-3 > div.pb-4 > div.shadow-sm.mt-2.border.border-\\[\\#7ECBA1\\].bg-white.pb-2.rounded-tl-lg.rounded-tr-lg.rounded-bl-0.rounded-br-0.mx-5.p-3 > div.py-1.px-3.w-full.flex.flex-wrap.items-center.justify-between > a.flex.items-center.gap-1.bg-blue-600.py-1.px-3.rounded.w-\\[5em\\]";

    const clickInterval = setInterval(() => {
      const buttonToClick = document.querySelector(buttonSelector);

      if (buttonToClick) {
        console.log("[AutoClick] Button found. Clicking now...");
        buttonToClick.click();
        clearInterval(clickInterval);
        window._songsodhonClicked = true;
      } else {
        console.log("[AutoClick] Searching for the button...");
      }
    }, 1000);

    // Stop after 30 seconds if not found
    setTimeout(() => clearInterval(clickInterval), 30000);
  }
})();

  // =====================================================================
  // ➡️ RIGHT ARROW KEY - CLICK SONGSODHON BUTTON
  // =====================================================================
  // (function () {
  //   "use strict";

  //   const buttonSelector =
  //     "body > div.bg-\\[\\#EFF9F2\\].\\32 xl\\:container.mx-auto > div.w-full.h-auto.lg\\:px-5 > div.w-full.mt-3.flex.lg\\:px-5 > div.bg-white.w-full.lg\\:w-\\[75\\%\\].h-full.main-content.mb-3 > div.pb-4 > div.shadow-sm.mt-2.border.border-\\[\\#7ECBA1\\].bg-white.pb-2.rounded-tl-lg.rounded-tr-lg.rounded-bl-0.rounded-br-0.mx-5.p-3 > div.py-1.px-3.w-full.flex.flex-wrap.items-center.justify-between > a.flex.items-center.gap-1.bg-blue-600.py-1.px-3.rounded.w-\\[5em\\]";

  //   document.addEventListener("keydown", function (e) {
  //     // Check if Right Arrow key is pressed
  //     if (e.key !== "ArrowRight") return;

  //     // Check if setting is enabled
  //     if (typeof settings === "undefined" || !settings.rightArrowClickSongsodhon) {
  //       return;
  //     }

  //     // Don't trigger if user is typing in input or textarea
  //     const activeTag = document.activeElement.tagName.toLowerCase();
  //     if (activeTag === "input" || activeTag === "textarea") {
  //       return;
  //     }

  //     // Prevent default right arrow behavior
  //     e.preventDefault();
  //     e.stopPropagation();

  //     // Find and click the button
  //     const targetButton = document.querySelector(buttonSelector);
  //     if (targetButton) {
  //       console.log("[RightArrow] ✅ Button Clicked Successfully!");
  //       targetButton.click();
  //     } else {
  //       console.log("[RightArrow] ❌ Button not found on this page.");
  //     }
  //   }, { passive: false });
  // })();
