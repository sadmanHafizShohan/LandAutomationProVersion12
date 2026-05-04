const fs = require('fs');

const content = fs.readFileSync('content.js', 'utf-8');
const start = content.indexOf('// ========== KHATIAN TAB: Complete Auto-Entry System ==========');
const end = content.indexOf('// --- Data Tab: Sheet URL is auto-loaded from server', start);

const newCode = `// ========== KHATIAN TAB: Toggle controls main page draggable panel ==========
        const khatianToggle = shadow.getElementById('scp-khatian-toggle');
        
        let khatianPanel = null;
        let khatianPanelState = { visible: false, left: 16, top: 16 };

        // Load saved state
        try {
            const saved = localStorage.getItem('ak_panel_state');
            if (saved) khatianPanelState = JSON.parse(saved);
        } catch (e) {}

        // Create draggable panel
        function createKhatianPanel() {
            if (khatianPanel) return;

            const panel = document.createElement('div');
            panel.id = 'ak-khatian-panel';
            Object.assign(panel.style, {
                position: 'fixed',
                top: khatianPanelState.top + 'px',
                left: khatianPanelState.left + 'px',
                width: '360px',
                background: '#1e1e2f',
                color: '#fff',
                border: '1px solid #2e2e40',
                padding: '12px',
                borderRadius: '10px',
                boxShadow: '0 8px 26px rgba(0,0,0,0.25)',
                fontFamily: 'Inter, Arial, sans-serif',
                zIndex: 999999,
                display: khatianPanelState.visible ? 'block' : 'none'
            });

            panel.innerHTML = \`
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
            \`;

            document.body.appendChild(panel);
            khatianPanel = panel;

            // Draggable header
            let dragging = false, dragOffX = 0, dragOffY = 0;
            const header = panel.querySelector('.ak-header');

            header.addEventListener('pointerdown', (e) => {
                dragging = true;
                const rect = panel.getBoundingClientRect();
                dragOffX = e.clientX - rect.left;
                dragOffY = e.clientY - rect.top;
            });

            document.addEventListener('pointermove', (e) => {
                if (!dragging) return;
                const left = Math.max(6, e.clientX - dragOffX);
                const top = Math.max(6, e.clientY - dragOffY);
                panel.style.left = left + 'px';
                panel.style.top = top + 'px';
            });

            document.addEventListener('pointerup', () => {
                if (!dragging) return;
                dragging = false;
                const rect = panel.getBoundingClientRect();
                khatianPanelState.left = Math.round(rect.left);
                khatianPanelState.top = Math.round(rect.top);
                localStorage.setItem('ak_panel_state', JSON.stringify(khatianPanelState));
            });

            // Close button
            panel.querySelector('.ak-close').addEventListener('click', () => {
                khatianPanel.style.display = 'none';
                khatianPanelState.visible = false;
                localStorage.setItem('ak_panel_state', JSON.stringify(khatianPanelState));
                if (khatianToggle) khatianToggle.checked = false;
            });

            setupKhatianPanel();
        }

        // Setup panel automation
        function setupKhatianPanel() {
            if (!khatianPanel) return;

            let queue = [], idx = 0, running = false, timerId = null;

            const inPrefix = khatianPanel.querySelector('.ak-prefix');
            const inRange = khatianPanel.querySelector('.ak-range');
            const btnStart = khatianPanel.querySelector('.ak-start');
            const btnStop = khatianPanel.querySelector('.ak-stop');
            const btnClear = khatianPanel.querySelector('.ak-clear');
            const inDelay = khatianPanel.querySelector('.ak-delay');
            const statusEl = khatianPanel.querySelector('.ak-status');

            function parseRangeText(text, prefix) {
                if (!text) return [];
                const normalized = text.replace(/–/g, '-').replace(/—/g, '-').replace(/\\s+to\\s+/ig, '-');
                const parts = normalized.split(/[\\n,;]+/).map(s => s.trim()).filter(Boolean);
                const out = [];

                for (let part of parts) {
                    let m = part.match(/^(\\d+)-(\\d+)\\s*-\\s*(\\d+)-(\\d+)$/);
                    if (m) {
                        const gPrefix = m[1];
                        const start = Number(m[2]), end = Number(m[4]);
                        if (!isNaN(start) && !isNaN(end) && start <= end) {
                            for (let i = start; i <= end; i++) out.push(\`\${gPrefix}-\${i}\`);
                        }
                        continue;
                    }

                    m = part.match(/^(\\d+)\\s*-\\s*(\\d+)$/);
                    if (m) {
                        const start = Number(m[1]), end = Number(m[2]);
                        if (!isNaN(start) && !isNaN(end) && start <= end) {
                            for (let i = start; i <= end; i++) {
                                out.push(prefix ? \`\${prefix}-\${i}\` : \`\${i}\`);
                            }
                            continue;
                        }
                    }

                    out.push(prefix ? \`\${prefix}-\${part}\` : part);
                }

                return out;
            }

            function engToBanglaNum(str) {
                const banglaNumbers = {
                    '0': '०', '1': '१', '2': '२', '3': '३', '4': '४',
                    '5': '५', '6': '६', '7': '७', '8': '८', '9': '९'
                };
                return String(str).replace(/[0-9]/g, match => banglaNumbers[match]);
            }

            function findTargetInput() {
                const candidates = Array.from(document.querySelectorAll('input, textarea'));
                for (let el of candidates) {
                    const ph = (el.getAttribute('placeholder') || '').toLowerCase();
                    const aria = (el.getAttribute('aria-label') || '').toLowerCase();
                    const name = (el.getAttribute('name') || '').toLowerCase();
                    if (ph.includes('খতিয়ান') || aria.includes('খতিয়ান') || name.includes('খতিয়ান')) return el;
                }
                return null;
            }

            function findSaveButton() {
                const candidates = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'));
                for (let b of candidates) {
                    const txt = ((b.innerText || b.value) + '').toString();
                    if (txt.includes('সংরক্ষণ') || txt.includes('Save')) return b;
                }
                return null;
            }

            async function doNext() {
                if (idx >= queue.length) {
                    statusEl.textContent = 'finished';
                    running = false;
                    return;
                }

                const inputEl = findTargetInput();
                const btn = findSaveButton();

                if (!inputEl || !btn) {
                    statusEl.textContent = 'input/button not found';
                    running = false;
                    return;
                }

                if (inputEl.value && inputEl.value.trim() !== '') {
                    statusEl.textContent = 'waiting for input to clear...';
                    timerId = setTimeout(doNext, 300);
                    return;
                }

                const val = queue[idx];
                statusEl.textContent = \`processing \${idx + 1}/\${queue.length}\`;

                try {
                    inputEl.focus();
                    inputEl.value = engToBanglaNum(val);
                    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
                } catch (e) {
                    console.error('set input error', e);
                }

                try {
                    if (!btn.disabled) btn.click();
                    else {
                        const form = btn.closest('form');
                        if (form) form.requestSubmit?.();
                    }
                } catch (e) {
                    console.error('click error', e);
                }

                const remainingItems = queue.slice(idx + 1);
                inRange.value = remainingItems.join('\\n');

                idx++;
                const delay = Math.max(200, Number(inDelay.value) || 1500);
                timerId = setTimeout(doNext, delay);
            }

            btnStart.addEventListener('click', () => {
                if (running) return;
                const prefix = inPrefix.value.trim() || '';
                const raw = inRange.value.trim();
                const list = parseRangeText(raw, prefix);

                if (!list.length) {
                    statusEl.textContent = 'no items';
                    return;
                }

                queue = list.slice();
                idx = 0;
                running = true;
                statusEl.textContent = 'running';
                doNext();
            });

            btnStop.addEventListener('click', () => {
                clearTimeout(timerId);
                running = false;
                statusEl.textContent = 'stopped';
            });

            btnClear.addEventListener('click', () => {
                clearTimeout(timerId);
                running = false;
                inPrefix.value = '';
                inRange.value = '';
                statusEl.textContent = 'cleared';
            });

            // Keyboard shortcut
            window.addEventListener('keydown', async (e) => {
                if (e.ctrlKey && e.altKey && e.code === 'KeyV') {
                    try {
                        const txt = await navigator.clipboard.readText();
                        if (txt) {
                            inRange.value = txt;
                            btnStart.click();
                        }
                    } catch (err) {
                        statusEl.textContent = 'clipboard denied';
                    }
                }
            });
        }

        // Toggle listener
        if (khatianToggle) {
            khatianToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    if (!khatianPanel) createKhatianPanel();
                    khatianPanel.style.display = 'block';
                    khatianPanelState.visible = true;
                } else {
                    if (khatianPanel) khatianPanel.style.display = 'none';
                    khatianPanelState.visible = false;
                }
                localStorage.setItem('ak_panel_state', JSON.stringify(khatianPanelState));

                // Update slider appearance
                const slider = shadow.querySelector('span.scp-slider');
                const thumb = shadow.querySelector('span.scp-slider-thumb');
                if (slider && thumb) {
                    if (e.target.checked) {
                        slider.style.background = 'linear-gradient(135deg, rgba(16,185,129,0.4), rgba(16,185,129,0.6))';
                        slider.style.borderColor = 'rgba(16,185,129,0.6)';
                        thumb.style.left = '24px';
                    } else {
                        slider.style.background = 'rgba(239,68,68,0.4)';
                        slider.style.borderColor = 'rgba(239,68,68,0.5)';
                        thumb.style.left = '2px';
                    }
                }
            });

            // Restore state on load
            if (khatianPanelState.visible) {
                khatianToggle.checked = true;
                setTimeout(() => {
                    if (!khatianPanel) createKhatianPanel();
                    khatianPanel.style.display = 'block';
                }, 100);
            }
        }

        `;

if (start > -1 && end > -1) {
    const newContent = content.substring(0, start) + newCode + content.substring(end);
    fs.writeFileSync('content.js', newContent, 'utf-8');
    console.log('✅ Khatian section replaced successfully');
} else {
    console.error('❌ Could not find Khatian section');
}
