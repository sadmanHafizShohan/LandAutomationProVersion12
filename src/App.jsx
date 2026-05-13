import React, { useState, useEffect, useRef } from "react";

function App() {
  const [activeTab, setActiveTab] = useState("holding"); // 'holding' or 'khatian'
  const [subscription, setSubscription] = useState("Free");
  const [isPremiumLocked, setIsPremiumLocked] = useState(false);

  const [fileName, setFileName] = useState("No file chosen · CSV or TXT");
  const [file, setFile] = useState(null);
  const [delay, setDelay] = useState(500);

  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(0);

  const [statusMsg, setStatusMsg] = useState("Waiting for file...");
  const [statusState, setStatusState] = useState("");

  const [liveH, setLiveH] = useState("-");
  const [liveK, setLiveK] = useState("-");
  const [liveC, setLiveC] = useState("-");

  const [sCount, setSCount] = useState(0);
  const [fCount, setFCount] = useState(0);
  const [failedLog, setFailedLog] = useState("");
  const [isAuthValid, setIsAuthValid] = useState(false);

  const failedLogRef = useRef(null);

  useEffect(() => {
    // Listen for auth status updates from chrome.storage
    const handleAuthStatusChange = (changes, areaName) => {
      if (areaName === 'local' && changes.aep_authStatus) {
        setIsAuthValid(changes.aep_authStatus.newValue === 'success');
      }
    };
    
    // Also listen for direct messages from content.js
    const handleAuthMessage = (msg) => {
      if (msg.type === 'authStatusUpdate') {
        setIsAuthValid(msg.authStatus === 'success');
      }
    };
    
    // Check initial status from chrome.storage
    chrome.storage.local.get(['aep_authStatus'], (result) => {
      setIsAuthValid(result.aep_authStatus === 'success');
    });
    
    chrome.storage.onChanged.addListener(handleAuthStatusChange);
    chrome.runtime.onMessage.addListener(handleAuthMessage);
    
    return () => {
      chrome.storage.onChanged.removeListener(handleAuthStatusChange);
      chrome.runtime.onMessage.removeListener(handleAuthMessage);
    };
  }, []);

  useEffect(() => {
    chrome.storage.local.get(["subscription"], (res) => {
      const sub = res.subscription || "Free";
      setSubscription(sub);
      if (sub.toLowerCase() !== "premium") {
        setIsPremiumLocked(true);
      }
    });

    // Load saved automation state from session storage
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
        if (res.aep_totalLines && res.aep_totalLines > 0) {
          // Automation was running or paused - restore state
          const currentIndex = res.aep_currentIndex || 0;
          const totalLines = res.aep_totalLines || 0;
          const sCount = res.aep_sCount || 0;
          const fCount = res.aep_fCount || 0;
          const isPaused = res.aep_isPaused || false;
          const failedRows = res.aep_failedRows || [];

          setTotal(totalLines);
          setDone(currentIndex);
          setSCount(sCount);
          setFCount(fCount);

          // Restore failed log
          if (failedRows.length > 0) {
            const failedLogText = failedRows.join("\n");
            setFailedLog(failedLogText);
          }

          if (isPaused) {
            setStatusMsg("Paused");
            setStatusState("paused");
          } else if (currentIndex >= totalLines) {
            setStatusMsg("Automation Complete! ✅");
            setStatusState("finished");
          } else {
            setStatusMsg("Running automation...");
            setStatusState("active");
          }
        }
      },
    );

    const handleMessage = (msg) => {
      if (msg.done !== undefined) {
        setDone(msg.done);
        setTotal((prevTotal) => {
          if (msg.done >= prevTotal && prevTotal > 0) {
            setStatusMsg("Automation Complete! ✅");
            setStatusState("finished");
          }
          return prevTotal;
        });
      }

      if (msg.type === "current_data") {
        setLiveH(msg.h || "N/A");
        setLiveK(msg.k || "N/A");
        setLiveC(msg.c || "N/A");
      }

      if (msg.type === "stats") {
        if (msg.sCount !== undefined) setSCount(msg.sCount);
        if (msg.fCount !== undefined) setFCount(msg.fCount);
        if (msg.newFailedRow) {
          setFailedLog((prev) => prev + msg.newFailedRow + "\n");
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  useEffect(() => {
    if (failedLogRef.current) {
      failedLogRef.current.scrollTop = failedLogRef.current.scrollHeight;
    }
  }, [failedLog]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setStatusMsg("File selected. Ready to start.");
      setStatusState("");
    } else {
      setFile(null);
      setFileName("No file chosen · CSV or TXT");
      setStatusMsg("Waiting for file...");
      setStatusState("");
    }
  };

  const sendMessage = (action, data = null, delayParam = null) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) {
        setStatusMsg("❌ No active tab found!");
        setStatusState("error");
        console.error("[AEP] No active tab found");
        return;
      }

      const tabId = tabs[0].id;
      const tabUrl = tabs[0].url;

      // Check if the tab is on a supported domain
      if (!tabUrl || !tabUrl.includes("log.ldd4ig.org")) {
        setStatusMsg("❌ Not on supported site! Open https://log.ldd4ig.org/");
        setStatusState("error");
        console.warn("[AEP] Tab URL not supported:", tabUrl);
        return;
      }

      chrome.tabs.sendMessage(
        tabId,
        { action, data, delay: delayParam },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "[AEP] Message send error:",
              chrome.runtime.lastError,
            );
            setStatusMsg("❌ Content script not loaded. Refresh page!");
            setStatusState("error");
            return;
          }

          if (response && response.success && action === "start") {
            console.log(
              "[AEP] Message sent successfully. Lines:",
              response.linesReceived,
            );
          } else if (response && response.success) {
            console.log("[AEP]", action, "command acknowledged");
          }
        },
      );
    });
  };



// const sendMessage = (action, data = null, delayParam = null) => {
//     chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//       if (!tabs || tabs.length === 0) {
//         setStatusMsg("❌ No active tab found!");
//         setStatusState("error");
//         return;
//       }

//       const tabId = tabs[0].id;
//       const tabUrl = tabs[0].url;

//       // ✅ এই list-এ শুধু allowed সাইট রাখুন
//       const allowedSites = [
//         "log.ldd4ig.org"
//       ];

//       const isAllowed = allowedSites.some(site => tabUrl && tabUrl.includes(site));

//       if (!isAllowed) {
//         setStatusMsg("❌ Not on supported site!");
//         setStatusState("error");
//         return;  // ← এখানেই বন্ধ হয়ে যাবে
//       }

//       // বাকি আগের code হুবহু একই থাকবে...
//       chrome.tabs.sendMessage(
//         tabId,
//         { action, data, delay: delayParam },
//         (response) => {
//           if (chrome.runtime.lastError) {
//             setStatusMsg("❌ Content script not loaded. Refresh page!");
//             setStatusState("error");
//             return;
//           }
//           if (response && response.success && action === "start") {
//             console.log("[AEP] Lines:", response.linesReceived);
//           }
//         },
//       );
//     });
// };
  const handleStart = () => {
    // ✅ FAILSAFE: Check auth status before doing anything
    if (!isAuthValid) {
      alert("❌ Authorization required! Please authorize first.");
      return;
    }
    
    if (!file) {
      alert("Please upload a file first!");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const lines = e.target.result.split("\n").filter((l) => l.trim());
      setTotal(lines.length);
      setDone(0);

      setLiveH("-");
      setLiveK("-");
      setLiveC("-");
      setSCount(0);
      setFCount(0);
      setFailedLog("");

      setStatusMsg("Running automation...");
      setStatusState("active");

      // Clear previous session state
      chrome.storage.session.remove([
        "aep_currentIndex",
        "aep_totalLines",
        "aep_sCount",
        "aep_fCount",
        "aep_isPaused",
      ]);

      sendMessage("start", lines, delay);
    };
    reader.readAsText(file);
  };

  const handlePause = () => {
    setStatusMsg("Paused");
    setStatusState("paused");
    sendMessage("pause");
  };

  const handleResume = () => {
    setStatusMsg("Resuming automation...");
    setStatusState("active");
    sendMessage("resume");
  };

  const handleDownload = () => {
    if (!failedLog) return;
    const blob = new Blob([failedLog], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "missing_data.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Clear failed log from popup and storage after download
    setFailedLog("");
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs.length > 0) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "clearFailedRows" },
          () => {
            // Ignore errors if content script not available
          },
        );
      }
    });
  };

  const handleReset = () => {
    // Confirm before reset
    if (
      !window.confirm(
        "Are you sure? This will clear all data and reset everything.",
      )
    )
      return;

    // Reset UI state
    setFileName("No file chosen · CSV or TXT");
    setFile(null);
    setDelay(500);
    setTotal(0);
    setDone(0);
    setStatusMsg("Waiting for file...");
    setStatusState("");
    setLiveH("-");
    setLiveK("-");
    setLiveC("-");
    setSCount(0);
    setFCount(0);
    setFailedLog("");

    // Clear session storage
    chrome.storage.session.clear();

    // Tell content script to reset
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs.length > 0) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "resetAutomation" },
          () => {
            // Ignore errors if content script not available
          },
        );
      }
    });
  };

  return (
    <>
      {isPremiumLocked && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(8, 13, 23, 0.95)",
            backdropFilter: "blur(6px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            color: "#fff",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <h2
            style={{
              color: "#ef4444",
              marginBottom: "10px",
              fontWeight: 700,
              letterSpacing: "0.5px",
            }}
          >
            Premium Feature
          </h2>
          <p
            style={{
              fontSize: "13px",
              color: "#94a3b8",
              textAlign: "center",
              maxWidth: "250px",
              lineHeight: 1.5,
            }}
          >
            To Use Auto Holding Entry Buy <br /> Premium Subscription
          </p>
        </div>
      )}

      {/* ═══ TOP HEADER ═══ */}
      <div className="app-header">
        <div className="app-header-left">
          <div className="app-logo">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M13 10V3L4 14H11L11 21L20 10H13Z" fill="white" />
            </svg>
          </div>
          <div className="app-title-group">
            <div className="app-title">Auto Holding Entry</div>
            <div className="app-subtitle">
              Auto Holding Entry Pro - By Automation
            </div>
          </div>
        </div>
        <div className="app-header-right">
          <div className="dev-badge">
            <div className="dev-name">Automation</div>
            <div className="dev-phone">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
              </svg>
              Update Comming Soon
            </div>
          </div>
          <div className="version-tag">v9.0</div>
        </div>
      </div>

      {/* ═══ TABS NAVIGATION ═══ */}
      <div className="tabs-container">
        <button
          className={`tab-btn ${activeTab === "holding" ? "active" : ""}`}
          onClick={() => setActiveTab("holding")}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ marginRight: "6px" }}
          >
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
          </svg>
          Auto Holding Entry
        </button>
        <button
          className={`tab-btn ${activeTab === "khatian" ? "active" : ""}`}
          onClick={() => setActiveTab("khatian")}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ marginRight: "6px" }}
          >
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2V17zm4 0h-2V7h2V17zm4 0h-2v-4h2V17z" />
          </svg>
          Khatian Panel
        </button>
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      {activeTab === "holding" ? (
        <div className="main-content">
          {/* LEFT COL */}
          <div className="col-left">
            <div className="card">
              <div className="card-label">Data Input</div>

              <div className="file-upload-wrapper">
                <label htmlFor="fileInput" className="file-upload-label">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M14 2H6C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
                  </svg>
                  <span>Upload Data File</span>
                  <div
                    className="file-name"
                    style={{ color: file ? "#38bdf8" : "#94a3b8" }}
                  >
                    {fileName}
                  </div>
                </label>
                <input
                  type="file"
                  id="fileInput"
                  accept=".csv, .txt"
                  onChange={handleFileChange}
                />
              </div>

              <div className="delay-row">
                <label htmlFor="delayInput">⏱ Delay per entry</label>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <input
                    type="number"
                    id="delayInput"
                    value={delay}
                    min="100"
                    step="100"
                    onChange={(e) => setDelay(Number(e.target.value))}
                  />
                  <span
                    style={{ fontSize: "10px", color: "var(--text-secondary)" }}
                  >
                    ms
                  </span>
                </div>
              </div>

              <div className="btn-group">
                <button id="startBtn" onClick={handleStart} disabled={!isAuthValid} style={!isAuthValid ? { opacity: '0.5', cursor: 'not-allowed' } : {}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                    <path d="M5 3L19 12L5 21V3Z" />
                  </svg>
                  Start Automation
                </button>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "7px",
                  }}
                >
                  <button
                    id="pauseBtn"
                    style={{ fontSize: "11.5px" }}
                    onClick={handlePause}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="white"
                    >
                      <path d="M6 4H10V20H6V4ZM14 4H18V20H14V4Z" />
                    </svg>
                    Pause
                  </button>
                  <button
                    id="resumeBtn"
                    style={{ fontSize: "11.5px" }}
                    onClick={handleResume}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="white"
                    >
                      <path d="M10 8L16 12L10 16V8Z" />
                    </svg>
                    Resume
                  </button>
                </div>
              </div>

              <div className="status-bar">
                <div className={`status-dot ${statusState}`}></div>
                <span>{statusMsg}</span>
              </div>
            </div>
          </div>

          {/* RIGHT COL */}
          <div className="col-right">
            <div
              className="card"
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <div className="card-label">Live Monitor</div>

              <div className="progress-card">
                <div className="progress-header">
                  <span className="progress-label">Progress</span>
                  <span>
                    {done} / {total}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: total > 0 ? `${(done / total) * 100}%` : "0%",
                    }}
                  ></div>
                </div>
              </div>

              <div className="live-data">
                <div className="live-data-row">
                  <span className="live-data-label">Holding</span>
                  <span className="live-data-value" title={liveH}>
                    {liveH}
                  </span>
                </div>
                <div className="live-data-row">
                  <span className="live-data-label">Khatian</span>
                  <span className="live-data-value" title={liveK}>
                    {liveK}
                  </span>
                </div>
                <div className="live-data-row">
                  <span className="live-data-label">Comment</span>
                  <span className="live-data-value" title={liveC}>
                    {liveC}
                  </span>
                </div>
              </div>

              <div className="stats-row">
                <div className="stat-box success">
                  <div>
                    <div className="stat-label">Success</div>
                    <div className="stat-value">{sCount}</div>
                  </div>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="rgba(16,185,129,0.5)"
                  >
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                  </svg>
                </div>
                <div className="stat-box failed">
                  <div>
                    <div className="stat-label">Failed</div>
                    <div className="stat-value">{fCount}</div>
                  </div>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="rgba(239,68,68,0.5)"
                  >
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
                  </svg>
                </div>
              </div>

              <textarea
                id="failedLog"
                ref={failedLogRef}
                readOnly
                placeholder="Missing / Failed entries will appear here..."
                value={failedLog}
              ></textarea>

              <button
                id="downloadBtn"
                onClick={handleDownload}
                disabled={!failedLog}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                  <path d="M12 16L7 11H10V4H14V11H17L12 16Z" />
                  <path d="M4 18H20V20H4V18Z" />
                </svg>
                Download Missing Data
              </button>

              <button
                id="resetBtn"
                onClick={handleReset}
                style={{
                  backgroundColor: "#ef4444",
                  marginTop: "7px",
                  fontSize: "11.5px",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                  <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v4l5-5-5-5v4z" />
                </svg>
                Reset All
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="main-content khatian-tab-content">
          <KhatianPanel />
        </div>
      )}

      {/* ═══ FOOTER ═══ */}
      <div className="app-footer">
        <div className="footer-left">
          <span>Developed by</span>
          <span
            style={{
              color: "var(--primary)",
              fontWeight: 700,
              fontFamily: "'JetBrains Mono',monospace",
            }}
          >
            Automation
          </span>
          <div className="footer-dot"></div>
          <span>Update Comming Soon</span>
          <div className="footer-dot"></div>
          <span>Land Tax Automation System</span>
        </div>
        <div className="footer-right">© 2026 All rights reserved</div>
      </div>
    </>
  );
}

export default App;

