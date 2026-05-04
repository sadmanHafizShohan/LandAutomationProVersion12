// Smart Control Panel Pro — Background Service Worker
// Handles: closeOtherTabs, closeCurrentTab (shortcut system)
//          + start/pause/resume relay (automation popup system)
//          + manifest version storage for content scripts

// Helper: Ensure version is stored
function ensureVersionStored() {
    const manifest = chrome.runtime.getManifest();
    const version = manifest.version || "0.0";
    chrome.storage.local.set({ extensionVersion: version });
    console.log('Extension version synced:', version);
}

// Store on install
chrome.runtime.onInstalled.addListener(() => {
    ensureVersionStored();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Ensure version is always available (safety check)
    ensureVersionStored();

    // ── Shortcut: Close other tabs ──────────────────────────────────────
    if (request.action === "closeOtherTabs") {
        chrome.tabs.query({ currentWindow: true }, (tabs) => {
            const activeTabId  = sender.tab?.id;
            const tabsToClose  = tabs.filter(t => t.id !== activeTabId).map(t => t.id);
            if (tabsToClose.length > 0) {
                chrome.tabs.remove(tabsToClose, () => {
                    sendResponse({ success: true, closed: tabsToClose.length });
                });
            } else {
                sendResponse({ success: true, closed: 0 });
            }
        });
    
        return true; // async response
    }

    // ── Shortcut: Close current tab ─────────────────────────────────────
    if (request.action === "closeCurrentTab") {
        const tabId = sender.tab?.id;
        if (tabId) {
            chrome.tabs.remove(tabId, () => sendResponse({ success: true }));
        }
        return true; // async response
    }

    // ─── Automation: Relay start / pause / resume from popup → content ──
    if (request.action === "start" || request.action === "pause" || request.action === "resume") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs.length > 0) {
                chrome.tabs.sendMessage(tabs[0].id, request);
            }
        });
        return false;
    }
});
