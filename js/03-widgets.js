
// NUMBER FORMAT INPUT
// Auto-format number inputs with thousand separator display
function setupNumberInputs() {
  // Apply to all calculator number inputs
  document.querySelectorAll('input[type=number]').forEach(inp => {
    // Create display sibling if not already
    if(inp.dataset.formatted) return;
    inp.dataset.formatted = '1';
    inp.addEventListener('input', function() {
      updateFormatDisplay(this);
    });
    inp.addEventListener('focus', function() {
      hideFormatDisplay(this);
    });
    inp.addEventListener('blur', function() {
      showFormatDisplay(this);
    });
  });
}

function formatRibuan(n) {
  if(!n && n !== 0) return '';
  return parseFloat(n).toLocaleString('id-ID');
}

function updateFormatDisplay(inp) {
  const val = parseFloat(inp.value);
  if(!isNaN(val) && val >= 1000) {
    let disp = inp.nextElementSibling;
    if(!disp || !disp.classList.contains('num-display')) {
      disp = document.createElement('div');
      disp.className = 'num-display';
      disp.style.cssText = 'font-size:10px;color:var(--accent2);font-family:var(--mono);margin-top:2px;';
      inp.parentNode.insertBefore(disp, inp.nextSibling);
    }
    disp.textContent = '= Rp ' + val.toLocaleString('id-ID');
    disp.style.display = 'block';
  } else {
    const disp = inp.nextElementSibling;
    if(disp && disp.classList.contains('num-display')) disp.style.display = 'none';
  }
}

function hideFormatDisplay(inp) {
  const disp = inp.nextElementSibling;
  if(disp && disp.classList.contains('num-display')) disp.style.display = 'none';
}

function showFormatDisplay(inp) {
  const val = parseFloat(inp.value);
  if(!isNaN(val) && val >= 1000) {
    const disp = inp.nextElementSibling;
    if(disp && disp.classList.contains('num-display')) disp.style.display = 'block';
  }
}

// GENERAL PURPOSE CUSTOM CONFIRM
// Untuk Jurnal Penutup, Rekonsiliasi, dan aksi besar lainnya
function showCustomConfirmGeneral({ icon, iconColor, iconBorder, title, subtitle, rows, warning, btnLabel, btnGradient }) {
  return new Promise((resolve) => {
    // Buat modal element
    const modal = document.createElement('div');
    modal.id = 'gcm-backdrop';
    modal.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:9000;
      display:flex;align-items:center;justify-content:center;padding:20px;
      backdrop-filter:blur(4px);animation:gcmFadeIn 0.15s ease;
    `;
    modal.innerHTML = `
      <div style="
        background:var(--surface);border:1px solid var(--border);border-radius:18px;
        width:100%;max-width:400px;box-shadow:0 32px 80px rgba(0,0,0,0.6);
        overflow:hidden;animation:confirmPop 0.22s cubic-bezier(0.34,1.56,0.64,1);
      ">
        <!-- Header -->
        <div style="
          background:linear-gradient(135deg,${iconColor||'rgba(74,222,128,0.12)'},rgba(34,211,238,0.06));
          border-bottom:1px solid var(--border);padding:18px 20px 16px;
          display:flex;align-items:center;gap:13px;
        ">
          <div style="width:40px;height:40px;border-radius:50%;background:${iconColor||'rgba(74,222,128,0.15)'};border:1px solid ${iconBorder||'rgba(74,222,128,0.3)'};display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">${icon||'[BEP]'}</div>
          <div>
            <div style="font-size:14px;font-weight:700;color:var(--text);">${escapeHtml(title)}</div>
            <div style="font-size:11.5px;color:var(--muted);margin-top:2px;line-height:1.5;">${escapeHtml(subtitle||'')}</div>
          </div>
        </div>
        <!-- Body -->
        <div style="padding:16px 20px;">
          <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:12px;">
            ${(rows||[]).map(r=>`
              <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 14px;border-bottom:1px solid var(--border);">
                <span style="font-size:12.5px;color:var(--muted);">${r.label}</span>
                <span style="font-size:13px;font-weight:700;color:${r.color||'var(--text)'};font-family:var(--mono);">${r.value}</span>
              </div>`).join('')}
          </div>
          ${warning?`<div style="background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.2);border-radius:8px;padding:9px 12px;font-size:12px;color:var(--accent3);">${warning}</div>`:''}
        </div>
        <!-- Footer -->
        <div style="padding:0 20px 20px;display:flex;gap:10px;">
          <button id="gcm-cancel" style="
            flex:1;padding:12px;border-radius:10px;
            background:var(--surface2);border:1px solid var(--border);
            color:var(--muted);font-size:13.5px;font-weight:600;
            cursor:pointer;font-family:var(--sans);transition:all 0.15s;
          " onmouseover="this.style.borderColor='var(--red)';this.style.color='var(--red)'"
             onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--muted)'">
            ✕ Batal
          </button>
          <button id="gcm-ok" style="
            flex:2;padding:12px;border-radius:10px;
            background:${btnGradient||'linear-gradient(135deg,#4ade80,#22d3ee)'};
            border:none;color:#000;font-size:13.5px;font-weight:700;
            cursor:pointer;font-family:var(--sans);transition:opacity 0.15s;
          " onmouseover="this.style.opacity='0.88'" onmouseout="this.style.opacity='1'">
            ${btnLabel||'✓ Ya, Lanjutkan'}
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const cleanup = () => {
      modal.style.animation = 'gcmFadeOut 0.12s ease forwards';
      setTimeout(() => modal.remove(), 120);
    };
    modal.querySelector('#gcm-ok').onclick = () => { cleanup(); resolve(true); };
    modal.querySelector('#gcm-cancel').onclick = () => { cleanup(); resolve(false); };
    modal.addEventListener('click', e => { if(e.target === modal) { cleanup(); resolve(false); } });
  });
}

// CUSTOM INPUT MODAL (pengganti prompt)
function showCustomInputModal({ icon, iconColor, iconBorder, title, subtitle, rows, inputLabel, inputDefault, btnLabel }) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.id = 'cim-backdrop';
    modal.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:9000;
      display:flex;align-items:center;justify-content:center;padding:20px;
      backdrop-filter:blur(4px);animation:gcmFadeIn 0.15s ease;
    `;
    modal.innerHTML = `
      <div style="
        background:var(--surface);border:1px solid var(--border);border-radius:18px;
        width:100%;max-width:400px;box-shadow:0 32px 80px rgba(0,0,0,0.6);
        overflow:hidden;animation:confirmPop 0.22s cubic-bezier(0.34,1.56,0.64,1);
      ">
        <!-- Header -->
        <div style="
          background:linear-gradient(135deg,${iconColor||'rgba(34,211,238,0.12)'},rgba(74,222,128,0.06));
          border-bottom:1px solid var(--border);padding:18px 20px 16px;
          display:flex;align-items:center;gap:13px;
        ">
          <div style="width:40px;height:40px;border-radius:50%;background:${iconColor||'rgba(34,211,238,0.15)'};border:1px solid ${iconBorder||'rgba(34,211,238,0.3)'};display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">${icon||'[Jurnal]'}</div>
          <div>
            <div style="font-size:14px;font-weight:700;color:var(--text);">${escapeHtml(title)}</div>
            <div style="font-size:11.5px;color:var(--muted);margin-top:2px;">${escapeHtml(subtitle||'')}</div>
          </div>
        </div>
        <!-- Body -->
        <div style="padding:16px 20px;">
          <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:16px;">
            ${(rows||[]).map(r=>`
              <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 14px;border-bottom:1px solid var(--border);">
                <span style="font-size:12.5px;color:var(--muted);">${r.label}</span>
                <span style="font-size:13px;font-weight:700;color:${r.color||'var(--text)'};font-family:var(--mono);">${r.value}</span>
              </div>`).join('')}
          </div>
          <div style="margin-bottom:4px;">
            <label style="font-size:11.5px;font-weight:700;color:var(--muted);letter-spacing:0.04em;text-transform:uppercase;display:block;margin-bottom:7px;">${inputLabel||'Masukkan nilai:'}</label>
            <input id="cim-input" type="number" value="${inputDefault||''}"
              style="width:100%;background:var(--surface2);border:1px solid var(--accent2);border-radius:8px;padding:11px 14px;color:var(--text);font-size:15px;font-family:var(--mono);font-weight:600;outline:none;transition:border 0.15s;"
              onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--accent2)'"
            >
          </div>
        </div>
        <!-- Footer -->
        <div style="padding:0 20px 20px;display:flex;gap:10px;">
          <button id="cim-cancel" style="
            flex:1;padding:12px;border-radius:10px;
            background:var(--surface2);border:1px solid var(--border);
            color:var(--muted);font-size:13.5px;font-weight:600;
            cursor:pointer;font-family:var(--sans);transition:all 0.15s;
          " onmouseover="this.style.borderColor='var(--red)';this.style.color='var(--red)'"
             onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--muted)'">
            ✕ Batal
          </button>
          <button id="cim-ok" style="
            flex:2;padding:12px;border-radius:10px;
            background:linear-gradient(135deg,#22d3ee,#4ade80);
            border:none;color:#000;font-size:13.5px;font-weight:700;
            cursor:pointer;font-family:var(--sans);transition:opacity 0.15s;
          " onmouseover="this.style.opacity='0.88'" onmouseout="this.style.opacity='1'">
            ${btnLabel||'✓ Konfirmasi'}
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const inputEl = modal.querySelector('#cim-input');
    setTimeout(() => { inputEl?.focus(); inputEl?.select(); }, 100);

    const cleanup = () => {
      modal.style.animation = 'gcmFadeOut 0.12s ease forwards';
      setTimeout(() => modal.remove(), 120);
    };
    modal.querySelector('#cim-ok').onclick = () => { cleanup(); resolve(inputEl?.value ?? null); };
    modal.querySelector('#cim-cancel').onclick = () => { cleanup(); resolve(null); };
    modal.addEventListener('click', e => { if(e.target === modal) { cleanup(); resolve(null); } });
    inputEl?.addEventListener('keydown', e => {
      if(e.key === 'Enter') { cleanup(); resolve(inputEl.value); }
      if(e.key === 'Escape') { cleanup(); resolve(null); }
    });
  });
}

// CUSTOM SELECT MODAL (pengganti prompt pilihan)
function showCustomSelectModal({ icon, iconColor, iconBorder, title, subtitle, options, btnLabel }) {
  return new Promise((resolve) => {
    let selected = options?.[0]?.value ?? null;
    const modal = document.createElement('div');
    modal.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:9000;
      display:flex;align-items:center;justify-content:center;padding:20px;
      backdrop-filter:blur(4px);animation:gcmFadeIn 0.15s ease;
    `;

    const renderOptions = () => (options||[]).map(opt => `
      <div class="csm-option ${opt.value===selected?'csm-selected':''}"
        data-val="${opt.value}"
        style="display:flex;align-items:center;gap:12px;padding:11px 14px;
          border-radius:9px;border:1.5px solid ${opt.value===selected?'var(--accent)':'var(--border)'};
          background:${opt.value===selected?'rgba(74,222,128,0.08)':'var(--surface2)'};
          cursor:pointer;margin-bottom:7px;transition:all 0.12s;">
        <div style="width:18px;height:18px;border-radius:50%;border:2px solid ${opt.value===selected?'var(--accent)':'var(--border)'};
          background:${opt.value===selected?'var(--accent)':'transparent'};display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.12s;">
          ${opt.value===selected?'<svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2 2 4-4" stroke="#000" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>':''}
        </div>
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--text);">${opt.label}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:1px;font-family:var(--mono);">${opt.sub||''}</div>
        </div>
      </div>`).join('');

    modal.innerHTML = `
      <div style="
        background:var(--surface);border:1px solid var(--border);border-radius:18px;
        width:100%;max-width:420px;box-shadow:0 32px 80px rgba(0,0,0,0.6);
        overflow:hidden;animation:confirmPop 0.22s cubic-bezier(0.34,1.56,0.64,1);
        max-height:90vh;display:flex;flex-direction:column;
      ">
        <!-- Header -->
        <div style="
          background:linear-gradient(135deg,${iconColor||'rgba(34,211,238,0.12)'},rgba(74,222,128,0.06));
          border-bottom:1px solid var(--border);padding:18px 20px 16px;
          display:flex;align-items:center;gap:13px;flex-shrink:0;
        ">
          <div style="width:40px;height:40px;border-radius:50%;background:${iconColor||'rgba(34,211,238,0.15)'};border:1px solid ${iconBorder||'rgba(34,211,238,0.3)'};display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">${icon||'🗂️'}</div>
          <div>
            <div style="font-size:14px;font-weight:700;color:var(--text);">${escapeHtml(title)}</div>
            <div style="font-size:11.5px;color:var(--muted);margin-top:2px;">${escapeHtml(subtitle||'')}</div>
          </div>
        </div>
        <!-- Options -->
        <div id="csm-options-wrap" style="padding:16px 20px;overflow-y:auto;flex:1;">
          ${renderOptions()}
        </div>
        <!-- Footer -->
        <div style="padding:0 20px 20px;display:flex;gap:10px;flex-shrink:0;border-top:1px solid var(--border);padding-top:14px;">
          <button id="csm-cancel" style="
            flex:1;padding:12px;border-radius:10px;
            background:var(--surface2);border:1px solid var(--border);
            color:var(--muted);font-size:13.5px;font-weight:600;
            cursor:pointer;font-family:var(--sans);transition:all 0.15s;
          " onmouseover="this.style.borderColor='var(--red)';this.style.color='var(--red)'"
             onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--muted)'">
            ✕ Batal
          </button>
          <button id="csm-ok" style="
            flex:2;padding:12px;border-radius:10px;
            background:linear-gradient(135deg,#22d3ee,#4ade80);
            border:none;color:#000;font-size:13.5px;font-weight:700;
            cursor:pointer;font-family:var(--sans);transition:opacity 0.15s;
          " onmouseover="this.style.opacity='0.88'" onmouseout="this.style.opacity='1'">
            ${btnLabel||'✓ Pilih'}
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Handle option clicks (event delegation with re-render)
    function attachOptionListeners() {
      const wrap = modal.querySelector('#csm-options-wrap');
      if(!wrap) return;
      wrap.onclick = e => {
        const opt = e.target.closest('[data-val]');
        if(!opt) return;
        selected = opt.dataset.val;
        wrap.innerHTML = renderOptions();
        // Re-bind since innerHTML replaced elements
      };
    }
    attachOptionListeners();

    const cleanup = () => {
      modal.style.animation = 'gcmFadeOut 0.12s ease forwards';
      setTimeout(() => modal.remove(), 120);
    };
    modal.querySelector('#csm-ok').onclick = () => { cleanup(); resolve(selected); };
    modal.querySelector('#csm-cancel').onclick = () => { cleanup(); resolve(null); };
    modal.addEventListener('click', e => { if(e.target === modal) { cleanup(); resolve(null); } });
  });
}

// SMART RATE LIMIT UI

function showAIRateLimitInfo(keys, cooldownSec, limitType) {
  const chat = document.getElementById('ai-chat');
  if(!chat) return;

  const resetTime = new Date(Date.now() + cooldownSec * 1000);
  const resetStr = resetTime.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});
  const hoursLeft = Math.ceil(cooldownSec / 3600);
  const minsLeft = Math.ceil(cooldownSec / 60);

  const infoDiv = document.createElement('div');
  infoDiv.className = 'ai-msg ai-msg-bot';
  infoDiv.innerHTML = `
    <div class="ai-avatar"><i class="ti ti-robot" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i></div>
    <div class="ai-bubble" style="border-color:rgba(245,158,11,0.3);">
      <div style="font-size:13px;font-weight:700;color:var(--accent3);margin-bottom:10px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 0.7s linear infinite;vertical-align:-2px"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> ${limitType === 'daily' ? 'Batas Harian Tercapai' : 'Rate Limit — Semua Key Cooldown'}
      </div>
      <div style="font-size:12.5px;color:var(--muted);line-height:1.7;margin-bottom:12px;">
        ${limitType === 'daily' 
          ? `Groq membatasi penggunaan per hari. Semua key yang kamu miliki sudah mencapai batas.<br><br>
             <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:3px"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg> Estimasi reset: <b style="color:var(--text)">~${hoursLeft > 1 ? hoursLeft+' jam lagi' : minsLeft+' menit lagi'}</b> (sekitar jam <b style="color:var(--accent)">${resetStr}</b>)`
          : `Semua key sedang cooldown. Reset dalam <b style="color:var(--accent)">${minsLeft} menit</b> (jam ${resetStr}).`
        }
      </div>
      
      <!-- Key status list -->
      <div style="margin-bottom:12px;">
        <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Status Key:</div>
        ${keys.map((k, i) => {
          const hash = getKeyHash(k);
          const cd = groqKeyCooldowns[hash] || 0;
          const info = window.groqKeyInfo?.[hash];
          const isCD = Date.now() < cd;
          const resetT = isCD ? new Date(cd).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}) : '-';
          const lType = info?.limitType === 'daily' ? '📅 Batas harian' : '⏱ Per-menit';
          return `<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--surface2);border-radius:6px;margin-bottom:4px;font-size:11.5px;">
            <span style="color:${isCD?'var(--accent3)':'var(--accent)'};">${isCD?'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 0.7s linear infinite;vertical-align:-2px"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>':'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>'}</span>
            <span style="font-family:var(--mono);color:var(--muted);">Key ${i+1} (...${hash})</span>
            <span style="flex:1;text-align:right;color:var(--muted);">${isCD ? lType+' · reset '+resetT : 'Siap'}</span>
          </div>`;
        }).join('')}
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button onclick="openGroqKeyModal()" style="background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.25);border-radius:7px;padding:7px 14px;cursor:pointer;color:var(--accent);font-size:12px;font-family:var(--sans);font-weight:600;">
          + Tambah Key Baru
        </button>
        ${limitType !== 'daily' ? `<button id="ai-retry-btn" onclick="retryAfterCooldown()" style="background:rgba(34,211,238,0.1);border:1px solid rgba(34,211,238,0.25);border-radius:7px;padding:7px 14px;cursor:pointer;color:var(--accent2);font-size:12px;font-family:var(--sans);font-weight:600;">
          <i class="ti ti-refresh" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Coba Lagi Manual
        </button>` : ''}
      </div>
    </div>`;
  chat.appendChild(infoDiv);
  chat.scrollTop = chat.scrollHeight;
}

function retryAfterCooldown() {
  const input = document.getElementById('ai-input');
  // Re-send last message
  const lastUserMsg = [...document.querySelectorAll('.ai-msg-user .ai-bubble')]
    .map(el => el.textContent.trim()).filter(Boolean).pop();
  if(lastUserMsg && input) {
    input.value = lastUserMsg;
    sendAI();
  }
}

// Upgrade startCooldownDisplay with optional auto-retry
function startCooldownDisplay(seconds, autoRetry = false) {
  const input = document.getElementById('ai-input');
  const btn = document.getElementById('ai-send-btn');
  if(!input || !btn) return;

  let remaining = seconds;

  const update = () => {
    if(remaining <= 0) {
      clearInterval(cooldownInterval);
      input.placeholder = 'Ceritakan transaksi, tanya cara pakai, atau minta hitung sesuatu...';
      btn.textContent = 'Kirim ↑';
      btn.disabled = false;
      aiThinking = false;
      
      if(autoRetry) {
        // Show "ready" indicator briefly
        btn.textContent = '<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Siap';
        btn.style.background = 'var(--accent)';
        btn.style.color = '#000';
        setTimeout(() => {
          btn.textContent = 'Kirim ↑';
          btn.style.background = '';
          btn.style.color = '';
        }, 2000);
      }
      return;
    }

    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    
    input.placeholder = `⏳ Cooldown ${timeStr} — semua key istirahat sebentar, tunggu ya...`;
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 0.7s linear infinite;vertical-align:-2px"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> ${timeStr}`;
    btn.disabled = true;
    aiThinking = true;
    remaining--;
  };

  if(cooldownInterval) clearInterval(cooldownInterval);
  update();
  cooldownInterval = setInterval(update, 1000);
}

// FEATURE 1: REKONSILIASI BANK
let bankRows = []; // parsed from CSV/Excel

let alertTimer;
function showAlert(msg){
  // Pesan "berhasil" ditampilkan lewat morph spinner -> checklist (bukan toast terpisah).
  // Pesan error/validasi (❌, ⛔, wajib diisi, dll) tetap pakai toast kecil seperti biasa.
  if (_isSuccessMsg(msg)) { showSuccessMorph(msg); return; }
  const el=document.getElementById('alert-box');
  el.innerHTML=msg; el.classList.add('show');
  clearTimeout(alertTimer);
  alertTimer=setTimeout(()=>el.classList.remove('show'),2800);
}

function _isSuccessMsg(msg){
  if (typeof msg !== 'string') return false;
  if (/^\s*(❌|⛔)/.test(msg)) return false;
  return /(✓|✅|ti-circle-check)/i.test(msg) || /\bberhasil\b/i.test(msg);
}

// Tampilkan notifikasi sukses di dalam kotak spinner yang sama:
// kalau spinner sedang jalan -> morph mulus jadi checklist.
// kalau tidak ada spinner aktif -> buka kotak, langsung checklist, lalu tutup otomatis.
function showSuccessMorph(msg){
  const overlay = document.getElementById('op-spinner-overlay');
  const card = document.getElementById('op-spinner-card');
  const labelEl = document.getElementById('op-spinner-label');
  const subEl = document.getElementById('op-spinner-sub');
  if(!overlay || !card || !labelEl) return;

  clearTimeout(_opSpinnerTimer); _opSpinnerTimer = null;
  clearTimeout(_successTimer);
  _opSpinnerDepth = 0;
  _successLock = true;

  const wasOpen = overlay.classList.contains('active');
  overlay.classList.add('active');
  card.style.animation = wasOpen ? '' : 'opSpinnerIn 0.2s cubic-bezier(0.34,1.56,0.64,1) both';

  // Bersihkan ikon centang bawaan di teks pesan (✓ / ✅ / ikon) biar tidak dobel dengan checklist besar
  const cleanMsg = String(msg).replace(/^\s*(✓|✅|<i class="ti ti-circle-check"[^>]*>\s*<\/i>)\s*/i, '');
  labelEl.innerHTML = cleanMsg || 'Berhasil!';
  if(subEl) subEl.textContent = '';

  // Trigger morph di frame berikutnya biar transisi CSS-nya kepakai (bukan lompat instan)
  card.classList.remove('success');
  void card.offsetWidth; // reflow, pastikan class removal ke-render dulu
  requestAnimationFrame(() => card.classList.add('success'));

  _successTimer = setTimeout(() => {
    card.style.animation = 'opSpinnerIn 0.15s ease reverse both';
    setTimeout(() => {
      overlay.classList.remove('active');
      card.classList.remove('success');
      card.style.animation = '';
      _successLock = false;
    }, 150);
  }, 1700);
}

// INIT
document.getElementById('current-date').textContent = new Date().toLocaleDateString('id-ID',{weekday:'short',year:'numeric',month:'short',day:'numeric'});
// initStorage & auth are handled by the Supabase init block (DOMContentLoaded)
// which overrides initStorage() to be a no-op until auth completes.
// Here we only run UI-agnostic setup:
initTheme();
setTimeout(setupNumberInputs, 500);
setTimeout(updateAIKeyStatus, 200);
setTimeout(addPeriodFilterToReports, 500);
// Show API key hint on first AI visit
let aiPageVisited = localStorage.getItem('oas_ai_visited');

// toggleSidebar and closeSidebar already defined above

// Set active nav + auto close on mobile
document.querySelectorAll('.nav-item').forEach(n => {
  n.addEventListener('click', function() {
    if(window.innerWidth <= 768) closeSidebar();
  });
});
document.querySelectorAll('.nav-card').forEach(n => {
  n.addEventListener('click', function() {
    if(window.innerWidth <= 768) closeSidebar();
  });
});

// CSS KALKULATOR GRID
// inject responsive kalk-grid style
const kalkStyle = document.createElement('style');
kalkStyle.textContent = `
.kalk-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media(max-width:768px){ .kalk-grid { grid-template-columns: 1fr !important; } }

/* All selects inside modal-body that are NOT already in .form-group get same treatment */
.modal-body select,
.modal-body input[type="number"],
.modal-body input[type="text"],
.modal-body input[type="date"],
.modal-body input[type="month"],
.modal-body textarea {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 9px 12px;
  color: var(--text);
  font-size: 13px;
  font-family: var(--sans);
  transition: border 0.15s;
  outline: none;
}
.modal-body select:focus,
.modal-body input:focus,
.modal-body textarea:focus { border-color: var(--accent); }
.modal-body select option { background: var(--surface2); color: var(--text); }
/* Chevron for all selects in modal-body */
.modal-body select {
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2364748b' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px !important;
  cursor: pointer;
}

/* Chart scroll wrapper */
/* Template Penyesuaian inline buttons */
.tmpl-peny-btn {
  display: flex; align-items: flex-start; gap: 10px;
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: 10px; padding: 10px 12px; cursor: pointer;
  font-family: var(--sans); text-align: left; transition: all 0.15s;
  width: 100%;
}
.tmpl-peny-btn:hover { border-color: var(--accent3); background: rgba(245,158,11,0.06); transform: translateY(-1px); }
.tmpl-peny-btn:active { transform: translateY(0); }
.tmpl-peny-icon { font-size: 20px; flex-shrink: 0; margin-top: 1px; }
.tmpl-peny-nama { font-size: 12px; font-weight: 700; color: var(--text); margin-bottom: 2px; }
.tmpl-peny-akun { font-size: 10px; color: var(--muted); line-height: 1.4; }

/* ═══ MULTI KARTU STOCK ═══ */
.ks-selector-btn {
  padding: 5px 10px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--surface2); color: var(--muted); font-size: 11px;
  cursor: pointer; font-family: var(--sans); transition: all 0.15s; white-space: nowrap;
}
.ks-selector-btn:hover { border-color: var(--accent2); color: var(--text); }
.ks-selector-btn.active { background: rgba(74,222,128,0.1); border-color: var(--accent); color: var(--accent); font-weight: 700; }
.mks-pilih-item:hover { border-color: var(--accent2) !important; }
.mks-pilih-item.selected { border-color: var(--accent) !important; background: rgba(74,222,128,0.06) !important; }
.mks-pilih-item.selected .mks-pilih-radio { border-color: var(--accent) !important; }
/* Konversi Kartu Stock buttons */
.ks-conv-btn {
  padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--surface2); color: var(--muted); font-size: 12px;
  cursor: pointer; font-family: var(--sans); transition: all 0.15s;
  text-align: center;
}
.ks-conv-btn:hover { border-color: var(--accent2); color: var(--text); }
.ks-conv-btn.active { background: rgba(34,211,238,0.12); border-color: var(--accent2); color: var(--accent2); font-weight: 700; }

/* Ensure ALL selects & inputs inside form-group take full width consistently */
.form-group select,
.form-group input[type="text"],
.form-group input[type="number"],
.form-group input[type="date"],
.form-group input[type="month"],
.form-group input[type="email"],
.form-group textarea {
  width: 100%;
}

/* Fix select appearance across browsers */
.form-group select {
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2364748b' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px !important;
  cursor: pointer;
}
.form-group select option {
  background: var(--surface2);
  color: var(--text);
  padding: 8px;
}

/* Modal head alias (new modals use modal-head class now) */
.modal-head {
  padding: 18px 22px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Item rows in invoice */
#inv-items-list input {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 7px 10px;
  color: var(--text);
  font-size: 12.5px;
  font-family: var(--sans);
  outline: none;
  width: 100%;
  transition: border 0.15s;
}
#inv-items-list input:focus { border-color: var(--accent); }
#inv-items-list button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 36px;
  border-radius: 6px;
  border: 1px solid rgba(248,113,113,0.25);
  background: rgba(248,113,113,0.08);
  color: var(--red);
  cursor: pointer;
  font-size: 14px;
  flex-shrink: 0;
  transition: all 0.15s;
}
#inv-items-list button:hover { background: rgba(248,113,113,0.18); }
@keyframes fadeInUp {
  from { opacity:0; transform:translateY(12px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes slideInRight {
  from { opacity:0; transform:translateX(20px); }
  to   { opacity:1; transform:translateX(0); }
}
@keyframes pulseGlow {
  0%,100% { box-shadow: 0 0 0 0 rgba(74,222,128,0); }
  50%     { box-shadow: 0 0 0 6px rgba(74,222,128,0.15); }
}
.page.active { animation: fadeInUp 0.25s cubic-bezier(0.34,1.2,0.64,1) both; }
#rekon-dropzone:hover { border-color:var(--accent2); background:rgba(34,211,238,0.04); color:var(--text); }
.inv-item-row { animation: fadeInUp 0.2s ease both; }
.notif-badge { animation: pulseGlow 2s ease-in-out infinite; }
.stat-card { animation: fadeInUp 0.3s cubic-bezier(0.34,1.2,0.64,1) both; }
/* Smooth progress bar */
#ang-progress-list div[style*="height:8px"] > div { transition: width 0.7s cubic-bezier(0.34,1.56,0.64,1); }

.chart-scroll-wrap { scrollbar-width: thin; scrollbar-color: var(--border) transparent; }
.chart-scroll-wrap::-webkit-scrollbar { height: 4px; }
.chart-scroll-wrap::-webkit-scrollbar-track { background: transparent; }
.chart-scroll-wrap::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

/* Clickable chart cursor */
.an-chart-clickable { cursor: pointer; }
.an-chart-clickable:hover { opacity: 0.93; }

/* Chart HD Modal */
#an-chart-modal {
  display: none; position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,0.88); align-items: center; justify-content: center;
  padding: 16px;
}
#an-chart-modal.open { display: flex; }
#an-chart-modal-inner {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 16px; padding: 16px; max-width: 98vw; max-height: 92vh;
  overflow: auto; position: relative; width: 100%;
  box-shadow: 0 32px 80px rgba(0,0,0,0.5);
}
#an-chart-modal-title {
  font-size: 14px; font-weight: 700; color: var(--text);
  margin-bottom: 12px; padding-right: 36px;
}
#an-chart-modal-close {
  position: absolute; top: 12px; right: 14px;
  background: none; border: none; color: var(--muted);
  font-size: 22px; cursor: pointer; line-height: 1;
  transition: color 0.15s;
}
#an-chart-modal-close:hover { color: var(--text); }
#an-chart-modal-canvas-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
#an-chart-modal-canvas { display: block; }
.rasio-row td:first-child { color: var(--muted); font-size: 12px; }
.rasio-row td:nth-child(2) { font-family: var(--mono); font-weight: 700; text-align: right; }
.rasio-row td:nth-child(3) { font-size: 11px; color: var(--muted); }
.rasio-ok { color: var(--accent) !important; }
.rasio-warn { color: var(--accent3) !important; }
.rasio-bad { color: var(--red) !important; }
.res-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border); }
.res-row:last-child { border-bottom: none; }
.res-label { font-size: 12px; color: var(--muted); }
.res-value { font-family: var(--mono); font-weight: 700; font-size: 15px; }
`;
document.head.appendChild(kalkStyle);

// UTILS KALKULATOR
const rp = n => 'Rp ' + (Math.round(n)||0).toLocaleString('id-ID');
const pct = n => (n||0).toFixed(2) + '%';
const num = n => (Math.round(n*100)/100).toLocaleString('id-ID');
function resRow(label, value, sub='') {
  return `<div class="res-row"><span class="res-label">${label}</span><div style="text-align:right"><div class="res-value">${value}</div>${sub?`<div style="font-size:11px;color:var(--muted);">${sub}</div>`:''}</div></div>`;
}
function rasioRow(nama, nilai, satuan, benchmark, keterangan) {
  const v = parseFloat(nilai);
  let cls = '';
  if(benchmark) {
    if(benchmark.ok && v >= benchmark.ok) cls = 'rasio-ok';
    else if(benchmark.warn && v >= benchmark.warn) cls = 'rasio-warn';
    else if(!isNaN(v)) cls = 'rasio-bad';
  }
  return `<tr class="rasio-row"><td>${nama}</td><td class="${cls}">${isNaN(v)||!isFinite(v)?'—':nilai+' '+satuan}</td><td>${keterangan}</td></tr>`;
}

function selectOptPickerByIndex(idx) {
  const list = document.getElementById('opt-picker-list');
  const opts = list._optPickerOptions || [];
  const opt = opts[idx];
  if (!opt) return;
  selectOptPicker(opt.value, opt.label, opt.icon || '');
}

function selectOptPicker(value, label, icon) {
  // Update visual selection
  document.querySelectorAll('#opt-picker-list .opt-picker-item').forEach(el => {
    el.classList.toggle('selected', el.dataset.value === value);
  });

  // Update the original select element if linked
  if (_optPickerSelectEl) {
    _optPickerSelectEl.value = value;
    _optPickerSelectEl.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Update button label if linked
  if (_optPickerBtnEl) {
    _optPickerBtnEl.querySelector('.opt-picker-label').textContent = label;
    _optPickerBtnEl.classList.add('open');
    _optPickerBtnEl.dataset.value = value;
  }

  // Simpan referensi options sebelum callback — untuk deteksi chained picker (Level 2)
  const listEl = document.getElementById('opt-picker-list');
  const optsBefore = listEl._optPickerOptions;

  if (_optPickerCallback) _optPickerCallback(value, label);

  // Jika callback membuka picker BARU (options berubah) = Level 2 sudah terbuka
  // Jangan close — biarkan picker baru tampil
  const optsAfter = listEl._optPickerOptions;
  if (optsAfter !== optsBefore) {
    // Picker baru sudah terbuka (chained Level 2) — jangan close
    return;
  }

  // Tidak ada picker baru — close dengan delay visual feedback
  setTimeout(closeOptPicker, 160);
}

function closeOptPicker() {
  document.getElementById('opt-picker-backdrop').classList.remove('open');
  document.body.style.overflow = '';
  if (_optPickerBtnEl) _optPickerBtnEl.classList.remove('open');
}

function optPickerBackdropClick(e) {
  if (e.target === document.getElementById('opt-picker-backdrop')) closeOptPicker();
}

// UPGRADE SELECTS TO OPT PICKER
// Converts a <select> element to a styled button + opt picker
function upgradeSelectToOptPicker(selectEl, config = {}) {
  if (selectEl.dataset.upgraded) return;
  selectEl.dataset.upgraded = '1';

  const title = config.title || selectEl.closest('.form-group')?.querySelector('label')?.textContent || 'Pilih Opsi';
  const options = Array.from(selectEl.options).map(o => ({
    value: o.value,
    label: o.textContent,
    icon: o.dataset.icon || config.iconMap?.[o.value] || '',
    sub: o.dataset.sub || config.subMap?.[o.value] || ''
  }));

  // Create trigger button
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'opt-picker-btn';

  const currentOpt = options.find(o => o.value === selectEl.value) || options[0];
  btn.innerHTML = `
    <span class="opt-picker-label">${escapeHtml(currentOpt?.label || 'Pilih...')}</span>
    <span class="opt-picker-arrow">▾</span>
  `;
  btn.dataset.value = selectEl.value;

  btn.addEventListener('click', () => {
    // Re-read options (may have changed)
    const liveOptions = Array.from(selectEl.options).map(o => ({
      value: o.value, label: o.textContent,
      icon: o.dataset.icon || config.iconMap?.[o.value] || '',
      sub: o.dataset.sub || config.subMap?.[o.value] || ''
    }));
    openOptPicker({
      title,
      options: liveOptions,
      currentValue: selectEl.value,
      btnEl: btn,
      selectEl: selectEl,
      onSelect: (val, lbl) => {
        const selOpt = liveOptions.find(o => o.value === val);
        btn.querySelector('.opt-picker-label').textContent = lbl;
        btn.dataset.value = val;
        config.onChange?.(val, lbl);
      }
    });
  });

  // Hide original select but keep it in DOM for value/event access
  selectEl.style.display = 'none';
  selectEl.parentNode.insertBefore(btn, selectEl.nextSibling);

  // Listen for programmatic changes to select
  const observer = new MutationObserver(() => {
    const cur = Array.from(selectEl.options).find(o => o.value === selectEl.value);
    if (cur) btn.querySelector('.opt-picker-label').textContent = cur.textContent;
  });
  observer.observe(selectEl, { attributes: true, childList: true, subtree: true });

  return btn;
}

// UPGRADE PERIOD FILTERS
// Upgrades all .report-period-sel and #dash-filter-period selects
function upgradeAllPeriodPickers() {
  const periodIconMap = {
    'all': '<i class="ti ti-layout-list" style="font-size:14px;"></i>', 'this-month': '<i class="ti ti-calendar-event" style="font-size:14px;"></i>', 'last-month': '<i class="ti ti-calendar-minus" style="font-size:14px;"></i>',
    'this-quarter': '<i class="ti ti-chart-bar ti-inline"></i>', 'this-year': '<i class="ti ti-calendar" style="font-size:14px;"></i>'
  };
  const periodSubMap = {
    'all': 'Tampilkan semua data', 'this-month': 'Dari awal bulan ini',
    'last-month': 'Seluruh bulan kemarin', 'this-quarter': '3 bulan terakhir',
    'this-year': 'Januari – Desember'
  };

  // Dash filter
  const dashSel = document.getElementById('dash-filter-period');
  if (dashSel && !dashSel.dataset.upgraded) {
    upgradeSelectToOptPicker(dashSel, {
      title: '<i class="ti ti-calendar" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Filter Periode',
      iconMap: periodIconMap, subMap: periodSubMap
    });
  }

  // Report period selects (added dynamically)
  document.querySelectorAll('.report-period-sel:not([data-upgraded])').forEach(sel => {
    upgradeSelectToOptPicker(sel, {
      title: '<i class="ti ti-calendar" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Filter Periode',
      iconMap: periodIconMap, subMap: periodSubMap
    });
  });
}

// UPGRADE FORM SELECTS
function upgradeFormPickers() {
  // Reset semua select yang belum jadi opt-picker (jika elemen baru muncul setelah re-render)
  document.querySelectorAll('select[id]').forEach(sel => {
    // Jika select masih visible (tidak disembunyikan oleh upgradeSelectToOptPicker), reset flag
    if (sel.style.display !== 'none' && sel.dataset.upgraded) {
      delete sel.dataset.upgraded;
    }
  });
  // Jenis kas: penerimaan/pengeluaran
  const kasJenis = document.getElementById('kas-jenis');
  if (kasJenis) upgradeSelectToOptPicker(kasJenis, {
    title: 'Jenis Transaksi',
    iconMap: { masuk: '<i class="ti ti-arrow-down-circle" style="font-size:18px;color:var(--accent);"></i>', keluar: '<i class="ti ti-arrow-up-circle" style="font-size:18px;color:var(--red);"></i>' },
    subMap: { masuk: 'Uang masuk ke kas', keluar: 'Uang keluar dari kas' }
  });

  // Jual metode
  const jualMetode = document.getElementById('jual-metode');
  if (jualMetode) upgradeSelectToOptPicker(jualMetode, {
    title: 'Metode Pembayaran',
    iconMap: { tunai: '<i class="ti ti-cash" style="font-size:18px;color:var(--accent);"></i>', kredit: '<i class="ti ti-credit-card" style="font-size:18px;color:var(--accent2);"></i>' },
    subMap: { tunai: 'Dibayar langsung (Kas)', kredit: 'Piutang usaha' }
  });

  // Beli metode
  const beliMetode = document.getElementById('beli-metode');
  if (beliMetode) upgradeSelectToOptPicker(beliMetode, {
    title: 'Metode Pembayaran',
    iconMap: { tunai: '<i class="ti ti-cash" style="font-size:18px;color:var(--accent);"></i>', kredit: '<i class="ti ti-file-invoice" style="font-size:18px;color:var(--accent3);"></i>' },
    subMap: { tunai: 'Bayar langsung (Kas)', kredit: 'Utang usaha' }
  });

  // COA filters
  const coaTipe = document.getElementById('coa-filter-tipe');
  if (coaTipe) upgradeSelectToOptPicker(coaTipe, { title: 'Filter Tipe Akun' });

  const coaKat = document.getElementById('coa-filter-kat');
  if (coaKat) upgradeSelectToOptPicker(coaKat, { title: 'Filter Kategori' });

  // Jurnal umum type filter
  const juType = document.getElementById('filter-ju-type');
  if (juType) upgradeSelectToOptPicker(juType, { title: 'Filter Tipe Jurnal' });

  // Penyusutan metode
  const pyMetode = document.getElementById('py-metode');
  if (pyMetode) upgradeSelectToOptPicker(pyMetode, {
    title: 'Metode Penyusutan',
    iconMap: { 'garis-lurus': '<i class="ti ti-trending-down" style="font-size:18px;"></i>', 'saldo-menurun': '<i class="ti ti-chart-bar ti-inline"></i>', 'satuan-produksi': '<i class="ti ti-settings ti-inline"></i>' }
  });

  // Upgrade pajak pickers juga
  upgradePajakPickers();

  // ═══ FITUR BARU: Upgrade semua select ke opt-picker ═══

  // Jurnal Berulang — Frekuensi
  const jbFrek = document.getElementById('jb-frekuensi');

  // Invoice — filter status
  const invStatus = document.getElementById('inv-filter-status');

  // Rekonsiliasi — pilih bank
  const rekonBank = document.getElementById('rekon-bank');
  if(rekonBank && !rekonBank.dataset.upgraded) upgradeSelectToOptPicker(rekonBank, {
    title: '<i class="ti ti-building-bank" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Pilih Bank',
    iconMap: { bca:'<i class="ti ti-building-bank" style="font-size:18px;color:#1a5fb4;"></i>', mandiri:'<i class="ti ti-building-bank" style="font-size:18px;color:#f0a500;"></i>', bni:'<i class="ti ti-building-bank" style="font-size:18px;color:#e8272a;"></i>', bri:'<i class="ti ti-building-bank" style="font-size:18px;color:#00529c;"></i>', cimb:'<i class="ti ti-building-bank" style="font-size:18px;color:#7b2e3c;"></i>', generic:'<i class="ti ti-file-text" style="font-size:18px;"></i>' },
    subMap: { bca:'Format CSV BCA', mandiri:'Format CSV Mandiri', bni:'Format CSV BNI', bri:'Format CSV BRI', cimb:'Format CSV CIMB Niaga', generic:'Format CSV umum (kol: tanggal,ket,nominal)' }
  });

  // Kurs — dari & ke
  const kursIconMap = {
    IDR: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><text x="1" y="17" font-size="13" font-weight="bold" fill="currentColor" stroke="none" font-family="sans-serif">Rp</text></svg>',
    USD: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent)"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',
    SGD: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent2)"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',
    EUR: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4a90d9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 5h-5a7 7 0 100 14h5M4 10h11M4 14h11"/></svg>',
    MYR: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><text x="1" y="17" font-size="11" font-weight="bold" fill="currentColor" stroke="none" font-family="sans-serif">RM</text></svg>',
    JPY: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l8 8 8-8M4 14h16M12 14v6"/></svg>'
  };
  const kursSubMap = { IDR:'Rupiah Indonesia', USD:'Dolar Amerika Serikat', SGD:'Dolar Singapura', EUR:'Euro Eropa', MYR:'Ringgit Malaysia', JPY:'Yen Jepang' };
  const kursDari = document.getElementById('kurs-dari');
  if(kursDari && !kursDari.dataset.upgraded) upgradeSelectToOptPicker(kursDari, {
    title: '<i class="ti ti-currency-exchange" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Mata Uang Asal', iconMap: kursIconMap, subMap: kursSubMap
  });
  const kursKe = document.getElementById('kurs-ke');
  if(kursKe && !kursKe.dataset.upgraded) upgradeSelectToOptPicker(kursKe, {
    title: '<i class="ti ti-currency-exchange" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Mata Uang Tujuan', iconMap: kursIconMap, subMap: kursSubMap
  });

  // Notifikasi — tipe alert
  const alertTipe = document.getElementById('alert-tipe');
  if(alertTipe && !alertTipe.dataset.upgraded) upgradeSelectToOptPicker(alertTipe, {
    title: '<i class="ti ti-bell" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Tipe Alert',
    iconMap: { 'arus-kas-negatif':'<i class="ti ti-cash-off" style="font-size:18px;color:var(--red);"></i>', 'anggaran-terlampaui':'<i class="ti ti-chart-bar ti-inline"></i>', 'invoice-jatuh-tempo':'<i class="ti ti-clock" style="font-size:18px;color:var(--accent3);"></i>', 'saldo-akun-bawah':'<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', 'laba-negatif':'<i class="ti ti-trending-down" style="font-size:18px;color:var(--red);"></i>' },
    subMap: { 'arus-kas-negatif':'Notifikasi saat kas bersih negatif', 'anggaran-terlampaui':'Notifikasi saat % terpakai terlampaui', 'invoice-jatuh-tempo':'Notifikasi H-X sebelum jatuh tempo', 'saldo-akun-bawah':'Notifikasi saat saldo akun di bawah batas', 'laba-negatif':'Notifikasi saat laba bersih negatif' },
    onChange: () => renderAlertForm()
  });

  // Pajak PPh 23 — jenis penghasilan
  const pph23Jenis = document.getElementById('pph23-jenis');
  if(pph23Jenis && !pph23Jenis.dataset.upgraded) upgradeSelectToOptPicker(pph23Jenis, {
    title: '<i class="ti ti-building" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Jenis Penghasilan PPh 23',
    iconMap: { jasa:'<i class="ti ti-adjustments" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>', royalti:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M14.5 9.5A3.5 3.5 0 009 12a3.5 3.5 0 005.5 2.8"/></svg>', sewa:'<i class="ti ti-home" style="font-size:18px;"></i>', dividen:'<i class="ti ti-moneybag" style="font-size:18px;color:var(--accent);"></i>', bunga:'<i class="ti ti-chart-line" style="font-size:18px;color:var(--accent2);"></i>' },
    subMap: { jasa:'Tarif 2% dari bruto', royalti:'Tarif 15% dari bruto', sewa:'Tarif 2% dari bruto', dividen:'Tarif 15% dari bruto', bunga:'Tarif 15% dari bruto' },
    onChange: () => hitungPPh23Otomatis()
  });
}

// UPGRADE PAJAK PICKERS (PPN & PPh)
function upgradePajakPickers() {
  // PPN Mode
  const ppnMode = document.getElementById('ppn-mode');
  if (ppnMode && !ppnMode.dataset.upgraded) upgradeSelectToOptPicker(ppnMode, {
    title: '<i class="ti ti-calculator" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Mode Perhitungan PPN',
    iconMap: { eksklusif: '<i class="ti ti-plus" style="font-size:18px;"></i>', inklusif: '<i class="ti ti-arrows-exchange" style="font-size:18px;"></i>', dpp: '<i class="ti ti-math" style="font-size:18px;"></i>' },
    subMap: {
      eksklusif: 'DPP sudah diketahui → hitung PPN yang harus dibayar',
      inklusif: 'Harga sudah termasuk PPN → pisahkan DPP & PPN-nya',
      dpp: 'Harga inklusif → hitung kembali nilai DPP-nya'
    }
  });

  // PPN Tarif
  const ppnTarif = document.getElementById('ppn-tarif');
  if (ppnTarif && !ppnTarif.dataset.upgraded) upgradeSelectToOptPicker(ppnTarif, {
    title: '<i class="ti ti-chart-bar ti-inline"></i> Tarif PPN',
    iconMap: { '12': '<i class="ti ti-flag" style="font-size:18px;color:var(--accent);"></i>', '11': '<i class="ti ti-clipboard-list ti-inline"></i>', '0': '<i class="ti ti-world" style="font-size:18px;"></i>', 'custom': '<i class="ti ti-pencil" style="font-size:18px;"></i>' },
    subMap: {
      '12': 'Berlaku mulai 1 Jan 2025 — tarif umum',
      '11': 'Tarif PPN sebelum 2025',
      '0': 'Ekspor BKP/JKP atau fasilitas tertentu',
      'custom': 'Masukkan tarif sendiri'
    }
  });

  // PPh 21 PTKP
  const p21ptkp = document.getElementById('p21-ptkp');
  if (p21ptkp && !p21ptkp.dataset.upgraded) upgradeSelectToOptPicker(p21ptkp, {
    title: 'Status PTKP',
    subMap: {
      TK0:'PTKP Rp54.000.000/th', TK1:'PTKP Rp58.500.000/th',
      TK2:'PTKP Rp63.000.000/th', TK3:'PTKP Rp67.500.000/th',
      K0:'PTKP Rp58.500.000/th', K1:'PTKP Rp63.000.000/th',
      K2:'PTKP Rp67.500.000/th', K3:'PTKP Rp72.000.000/th',
      KI0:'PTKP Rp63.000.000/th', KI1:'PTKP Rp67.500.000/th',
      KI2:'PTKP Rp72.000.000/th', KI3:'PTKP Rp76.500.000/th',
    }
  });

  // PPh 21 Metode Pemotongan
  const p21met = document.getElementById('p21-metode');
  if (p21met && !p21met.dataset.upgraded) upgradeSelectToOptPicker(p21met, {
    title: '<i class="ti ti-scale ti-inline"></i> Metode Pemotongan PPh 21',
    iconMap: { netto: '<i class="ti ti-scissors" style="font-size:18px;"></i>', gross: '<i class="ti ti-building" style="font-size:18px;"></i>', 'gross-up': '<i class="ti ti-arrow-up" style="font-size:18px;"></i>' },
    subMap: {
      netto: 'Pajak dipotong dari gaji karyawan',
      gross: 'Pajak ditanggung sepenuhnya oleh perusahaan',
      'gross-up': 'Perusahaan beri tunjangan pajak agar net gaji utuh'
    }
  });

  // PPh 21 PTKP Tidak Tetap
  const p21ptkpTT = document.getElementById('p21-ptkp-tt');
  if (p21ptkpTT && !p21ptkpTT.dataset.upgraded) upgradeSelectToOptPicker(p21ptkpTT, {
    title: 'Status PTKP',
    subMap: { TK0:'Rp54jt/th', TK1:'Rp58,5jt/th', K0:'Rp58,5jt/th', K1:'Rp63jt/th', K2:'Rp67,5jt/th', K3:'Rp72jt/th' }
  });

  // PPh 21 NPWP Tidak Tetap
  const p21npwpTT = document.getElementById('p21-npwp-tt');
  if (p21npwpTT && !p21npwpTT.dataset.upgraded) upgradeSelectToOptPicker(p21npwpTT, {
    title: '<i class="ti ti-id" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Kepemilikan NPWP',
    iconMap: { ya: '<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', tidak: '❌' },
    subMap: { ya: 'Tarif normal sesuai ketentuan', tidak: 'Tarif +20% lebih tinggi (tanpa NPWP)' }
  });

  // PPh 21 PTKP Komisaris/Pengawas
  const p21komisarisPtkp = document.getElementById('p21-komisaris-ptkp');
  if (p21komisarisPtkp && !p21komisarisPtkp.dataset.upgraded) upgradeSelectToOptPicker(p21komisarisPtkp, {
    title: '<i class="ti ti-building-bank" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Status PTKP — Komisaris/Pengawas',
    subMap: {
      TK0:'PTKP Rp54.000.000/th', TK1:'PTKP Rp58.500.000/th',
      TK2:'PTKP Rp63.000.000/th', TK3:'PTKP Rp67.500.000/th',
      K0:'PTKP Rp58.500.000/th',  K1:'PTKP Rp63.000.000/th',
      K2:'PTKP Rp67.500.000/th',  K3:'PTKP Rp72.000.000/th',
    }
  });

  // PPh 21 NPWP Bukan Pegawai
  const p21bukanPegawaiNpwp = document.getElementById('p21-bukan-pegawai-npwp');
  if (p21bukanPegawaiNpwp && !p21bukanPegawaiNpwp.dataset.upgraded) upgradeSelectToOptPicker(p21bukanPegawaiNpwp, {
    title: '<i class="ti ti-id" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Kepemilikan NPWP — Bukan Pegawai',
    iconMap: { ya: '<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', tidak: '❌' },
    subMap: { ya: 'Tarif normal sesuai ketentuan', tidak: 'Tarif +20% lebih tinggi (tanpa NPWP)' }
  });

  // PPh 21 NPWP Peserta Kegiatan
  const p21pesertaNpwp = document.getElementById('p21-peserta-kegiatan-npwp');
  if (p21pesertaNpwp && !p21pesertaNpwp.dataset.upgraded) upgradeSelectToOptPicker(p21pesertaNpwp, {
    title: '<i class="ti ti-id" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Kepemilikan NPWP — Peserta Kegiatan',
    iconMap: { ya: '<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', tidak: '❌' },
    subMap: { ya: 'Tarif normal sesuai ketentuan', tidak: 'Tarif +20% lebih tinggi (tanpa NPWP)' }
  });

  // PPh 21 NPWP Mantan Pegawai
  const p21mantanNpwp = document.getElementById('p21-mantan-npwp');
  if (p21mantanNpwp && !p21mantanNpwp.dataset.upgraded) upgradeSelectToOptPicker(p21mantanNpwp, {
    title: '<i class="ti ti-id" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Kepemilikan NPWP — Mantan Pegawai',
    iconMap: { ya: '<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', tidak: '❌' },
    subMap: { ya: 'Tarif normal sesuai ketentuan', tidak: 'Tarif +20% lebih tinggi (tanpa NPWP)' }
  });

  // PPh 23 jenis
  const p23jenis = document.getElementById('p23-jenis');
  if (p23jenis && !p23jenis.dataset.upgraded) upgradeSelectToOptPicker(p23jenis, {
    title: '<i class="ti ti-briefcase" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Jenis Penghasilan PPh 23',
    iconMap: { dividen:'<i class="ti ti-moneybag" style="font-size:18px;color:var(--accent);"></i>', bunga:'<i class="ti ti-building-bank" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>', royalti:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M14.5 9.5A3.5 3.5 0 009 12a3.5 3.5 0 005.5 2.8"/></svg>', hadiah:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><path d="M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>', sewa:'<i class="ti ti-home" style="font-size:18px;"></i>', jasa:'<i class="ti ti-settings ti-inline"></i>', 'jasa-lain':'<i class="ti ti-clipboard-list ti-inline"></i>', custom:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h4l10.5-10.5a1.5 1.5 0 00-4-4L5 17v3zm13.5-13.5l4 4"/></svg>' },
    subMap: { dividen:'Tarif 15%', bunga:'Tarif 15%', royalti:'Tarif 15%', hadiah:'Tarif 15%', sewa:'Tarif 2%', jasa:'Tarif 2%', 'jasa-lain':'Tarif 2%', custom:'Isi tarif manual' }
  });

  // PPh 23 NPWP
  const p23npwp = document.getElementById('p23-npwp');
  if (p23npwp && !p23npwp.dataset.upgraded) upgradeSelectToOptPicker(p23npwp, {
    title: '<i class="ti ti-id" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Kepemilikan NPWP',
    iconMap: { ya: '<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', tidak: '❌' },
    subMap: { ya: 'Tarif normal', tidak: '+100% tarif (2x lipat)' }
  });

  // ── SELECTS YANG BELUM DIUPGRADE ──

  // Filter Status Aset Tetap (halaman list)
  const atFilterStatus = document.getElementById('at-filter-status');
  if(atFilterStatus && !atFilterStatus.dataset.upgraded) upgradeSelectToOptPicker(atFilterStatus, {
    title: '<i class="ti ti-filter" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Filter Status Aset',
    iconMap: { '': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 6H3M16 12H8M13 18h-2"/></svg>', aktif: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>', disposal: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--red)"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M9 7V4h6v3"/></svg>' },
    subMap: { '': 'Tampilkan semua aset', aktif: 'Aset masih beroperasi', disposal: 'Aset sudah dihapus/dijual' }
  });

  // Filter Status Invoice
  const invFilterStatus = document.getElementById('inv-filter-status');
  if(invFilterStatus && !invFilterStatus.dataset.upgraded) upgradeSelectToOptPicker(invFilterStatus, {
    title: '<i class="ti ti-filter" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Filter Status Invoice',
    iconMap: { '': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 6H3M16 12H8M13 18h-2"/></svg>', draft: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm0 0v6h6M8 13h8M8 17h5"/></svg>', terkirim: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>', lunas: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>', 'jatuh-tempo': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent3)"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 3"/></svg>' },
    subMap: { '': 'Semua status invoice', draft: 'Belum dikirim', terkirim: 'Sudah dikirim ke pelanggan', lunas: 'Pembayaran sudah diterima', 'jatuh-tempo': 'Melewati batas waktu' }
  });

  // Tipe Akun Baru (modal-akun)
  const newAkunTipe = document.getElementById('new-akun-tipe');
  if(newAkunTipe && !newAkunTipe.dataset.upgraded) upgradeSelectToOptPicker(newAkunTipe, {
    title: '<i class="ti ti-list" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Tipe Akun',
    iconMap: { aset: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>', liabilitas: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--red)"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>', ekuitas: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>', pendapatan: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>', beban: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent3)"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>', hpp: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l9 5v8l-9 5-9-5V8l9-5zm0 0v9m9-4l-9 4-9-4"/></svg>' },
    subMap: { aset: 'Kekayaan & sumber daya perusahaan', liabilitas: 'Utang & kewajiban perusahaan', ekuitas: 'Modal & kepentingan pemilik', pendapatan: 'Penghasilan dari operasional', beban: 'Pengeluaran operasional', hpp: 'Harga pokok penjualan' }
  });

  // Kategori Aset Tetap (modal)
  const atKategori = document.getElementById('at-kategori');
  if(atKategori && !atKategori.dataset.upgraded) upgradeSelectToOptPicker(atKategori, {
    title: '<i class="ti ti-building-factory" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Kategori Aset',
    iconMap: { Kendaraan: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h1l2-4h10l2 4h1a2 2 0 012 2v6a2 2 0 01-2 2h-2M5 17h14M7 17a2 2 0 104 0 2 2 0 00-4 0zm6 0a2 2 0 104 0 2 2 0 00-4 0z"/></svg>', Bangunan: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h2M9 13h2M13 9h2M13 13h2M9 17h6M9 21h6"/></svg>', Peralatan: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>', Mesin: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14M19.07 4.93l-2.83 2.83M4.93 4.93l2.83 2.83M19.07 19.07l-2.83-2.83M4.93 19.07l2.83-2.83"/></svg>', Komputer: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>', Inventaris: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM12 12h.01M2 10h2M2 14h2M20 10h2M20 14h2"/></svg>', Tanah: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7l9-4 9 4v14H3V7z"/></svg>', Lainnya: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>' },
    subMap: { Kendaraan: 'Mobil, motor, truk, dll', Bangunan: 'Gedung, kantor, gudang', Peralatan: 'Peralatan & perlengkapan kantor', Mesin: 'Mesin produksi & industri', Komputer: 'Komputer, laptop, server, IT', Inventaris: 'Furnitur, meja, kursi', Tanah: 'Tanah & properti', Lainnya: 'Kategori aset lainnya' }
  });

  // Metode Penyusutan Aset Tetap (modal)
  const atMetode = document.getElementById('at-metode');
  if(atMetode && !atMetode.dataset.upgraded) upgradeSelectToOptPicker(atMetode, {
    title: '<i class="ti ti-trending-down" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Metode Penyusutan',
    iconMap: { 'garis-lurus': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="19" x2="19" y2="5"/><path d="M5 5h14v14"/></svg>', 'saldo-menurun': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent3)"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/></svg>' },
    subMap: { 'garis-lurus': 'Biaya tetap per tahun (paling umum)', 'saldo-menurun': 'Biaya menurun setiap tahun (Double Declining)' }
  });

  // Tipe Kontak (modal)
  const kontakTipe = document.getElementById('kontak-tipe');
  if(kontakTipe && !kontakTipe.dataset.upgraded) upgradeSelectToOptPicker(kontakTipe, {
    title: '<i class="ti ti-users" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Tipe Kontak',
    iconMap: { pelanggan: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><path d="M16 3.13a4 4 0 010 7.75"/><path d="M21 21v-2a4 4 0 00-3-3.85"/></svg>', supplier: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent3)"><path d="M12 3l9 5v8l-9 5-9-5V8l9-5zm0 0v9m9-4l-9 4-9-4"/></svg>', keduanya: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>' },
    subMap: { pelanggan: 'Pembeli produk / jasa', supplier: 'Penyedia produk / bahan baku', keduanya: 'Berlaku sebagai pelanggan & supplier' }
  });

  // Frekuensi Jurnal Berulang (modal)
  const jbFrekuensi = document.getElementById('jb-frekuensi');
  if(jbFrekuensi && !jbFrekuensi.dataset.upgraded) upgradeSelectToOptPicker(jbFrekuensi, {
    title: '<i class="ti ti-refresh" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Frekuensi Pengulangan',
    iconMap: { harian: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><circle cx="12" cy="16" r="1" fill="currentColor"/></svg>', mingguan: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h8"/></svg>', bulanan: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h8M8 18h4"/></svg>', triwulanan: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><text x="7" y="21" font-size="8" fill="currentColor" stroke="none" font-family="sans-serif">Q</text></svg>', tahunan: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent3)"><path d="M21 12a9 9 0 11-6.22-8.56M21 3v9h-9"/></svg>' },
    subMap: { harian: 'Setiap hari', mingguan: 'Setiap 7 hari', bulanan: 'Setiap bulan (paling umum)', triwulanan: 'Setiap 3 bulan', tahunan: 'Setiap tahun' }
  });

  // ── KALKULATOR BUNGA ──
  const btSatuan = document.getElementById('bt-satuan');
  if(btSatuan && !btSatuan.dataset.upgraded) upgradeSelectToOptPicker(btSatuan, {
    title: '<i class="ti ti-calendar" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Satuan Waktu',
    iconMap: { tahun: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><path d="M21 12a9 9 0 11-6.22-8.56M21 3v9h-9"/></svg>', bulan: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', hari: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>' },
    subMap: { tahun: 'Jangka waktu dalam tahun', bulan: 'Jangka waktu dalam bulan', hari: 'Jangka waktu dalam hari' }
  });

  const btJenis = document.getElementById('bt-jenis');
  if(btJenis && !btJenis.dataset.upgraded) upgradeSelectToOptPicker(btJenis, {
    title: '<i class="ti ti-chart-candle" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Jenis Bunga',
    iconMap: { tunggal: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="19" x2="19" y2="5"/><path d="M5 5h14v14"/></svg>', 'majemuk-tahunan': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>', 'majemuk-semesteran': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>', 'majemuk-triwulanan': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>', 'majemuk-bulanan': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>', 'efektif-menurun': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent3)"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>' },
    subMap: { tunggal: 'Bunga Tunggal (Simple Interest)', 'majemuk-tahunan': 'Bunga Majemuk Tahunan', 'majemuk-semesteran': 'Bunga Majemuk Semesteran', 'majemuk-triwulanan': 'Bunga Majemuk Triwulanan', 'majemuk-bulanan': 'Bunga Majemuk Bulanan', 'efektif-menurun': 'Efektif Menurun (flat → efektif)' }
  });

  const anJenis = document.getElementById('an-jenis');
  if(anJenis && !anJenis.dataset.upgraded) upgradeSelectToOptPicker(anJenis, {
    title: '<i class="ti ti-receipt" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Jenis Anuitas',
    iconMap: { anuitas: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="8" width="4" height="12"/><rect x="10" y="5" width="4" height="15"/><rect x="17" y="2" width="4" height="18"/></svg>', flat: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="19" x2="19" y2="5"/><path d="M5 5h14v14"/></svg>', efektif: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/></svg>' },
    subMap: { anuitas: 'Anuitas — cicilan tetap tiap periode', flat: 'Bunga Flat — dihitung dari pokok awal', efektif: 'Efektif Menurun — dihitung dari sisa pokok' }
  });

  const pvMode = document.getElementById('pv-mode');
  if(pvMode && !pvMode.dataset.upgraded) upgradeSelectToOptPicker(pvMode, {
    title: '<i class="ti ti-arrows-exchange" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Mode PV/FV',
    iconMap: { 'fv': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><path d="M5 12h14M15 6l6 6-6 6"/></svg>', 'pv': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><path d="M19 12H5M9 18l-6-6 6-6"/></svg>', 'rate': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent3)"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>' },
    subMap: { 'fv': 'Future Value — cari nilai masa depan', 'pv': 'Present Value — cari nilai saat ini', 'rate': 'Suku Bunga — cari tingkat bunga' }
  });

  const pvM = document.getElementById('pv-m');
  if(pvM && !pvM.dataset.upgraded) upgradeSelectToOptPicker(pvM, {
    title: '<i class="ti ti-refresh" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Frekuensi Pemajemukan',
    iconMap: { '1': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-6.22-8.56M21 3v9h-9"/></svg>', '2': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-6.22-8.56M21 3v9h-9"/></svg>', '4': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', '12': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', '365': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>' },
    subMap: { '1': 'Tahunan (1×/tahun)', '2': 'Semesteran (2×/tahun)', '4': 'Triwulanan (4×/tahun)', '12': 'Bulanan (12×/tahun)', '365': 'Harian (365×/tahun)' }
  });

  const dkBasis = document.getElementById('dk-basis');
  if(dkBasis && !dkBasis.dataset.upgraded) upgradeSelectToOptPicker(dkBasis, {
    title: '<i class="ti ti-calendar" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Basis Hari Diskonto',
    iconMap: { '360': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>', '365': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>' },
    subMap: { '360': 'Bank basis — 360 hari/tahun', '365': 'Kalender biasa — 365 hari/tahun' }
  });

  // PPh21 PNS/TNI/Polri
  const p21pnsPtkp = document.getElementById('p21-pns-ptkp');
  if(p21pnsPtkp && !p21pnsPtkp.dataset.upgraded) upgradeSelectToOptPicker(p21pnsPtkp, {
    title: '<i class="ti ti-id-badge" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Status PTKP PNS',
    subMap: { 'TK/0':'Tidak Kawin, 0 tanggungan','TK/1':'Tidak Kawin, 1 tanggungan','TK/2':'Tidak Kawin, 2 tanggungan','TK/3':'Tidak Kawin, 3 tanggungan','K/0':'Kawin, 0 tanggungan','K/1':'Kawin, 1 tanggungan','K/2':'Kawin, 2 tanggungan','K/3':'Kawin, 3 tanggungan','K/I/0':'Kawin, isteri bekerja, 0 tanggungan','K/I/1':'Kawin, isteri bekerja, 1 tanggungan','K/I/2':'Kawin, isteri bekerja, 2 tanggungan','K/I/3':'Kawin, isteri bekerja, 3 tanggungan' }
  });

  const p21pnsBulan = document.getElementById('p21-pns-bulan');
  if(p21pnsBulan && !p21pnsBulan.dataset.upgraded) upgradeSelectToOptPicker(p21pnsBulan, {
    title: '<i class="ti ti-calendar" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Bulan Penghasilan',
    subMap: { '1':'Januari','2':'Februari','3':'Maret','4':'April','5':'Mei','6':'Juni','7':'Juli','8':'Agustus','9':'September','10':'Oktober','11':'November','12':'Desember' }
  });

  // ── SELECTS YANG MASIH BELUM DIUPGRADE ──

  // Dashboard filter periode
  const dashSel2 = document.getElementById('dash-filter-period');
  if(dashSel2 && !dashSel2.dataset.upgraded) upgradeSelectToOptPicker(dashSel2, {
    title: '<i class="ti ti-calendar" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Filter Periode',
    iconMap: { all: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', 'this-month': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><circle cx="12" cy="16" r="1.5" fill="currentColor"/></svg>', 'last-month': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M9 18l-6-6 6-6"/></svg>', 'this-quarter': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><text x="12" y="21" text-anchor="middle" font-size="8" fill="currentColor" stroke="none" font-family="sans-serif">Q</text></svg>', 'this-year': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent3)"><path d="M21 12a9 9 0 11-6.22-8.56M21 3v9h-9"/></svg>', custom: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h4l10.5-10.5a1.5 1.5 0 00-4-4L5 17v3zm13.5-13.5l4 4"/></svg>' },
    subMap: { all: 'Tampilkan seluruh data', 'this-month': 'Data bulan berjalan', 'last-month': 'Data bulan sebelumnya', 'this-quarter': 'Data 3 bulan terakhir', 'this-year': 'Data tahun berjalan', custom: 'Pilih rentang tanggal manual' }
  });

  // Arus Kas periode
  const arusKasPeriod = document.getElementById('arus-kas-period');
  if(arusKasPeriod && !arusKasPeriod.dataset.upgraded) upgradeSelectToOptPicker(arusKasPeriod, {
    title: '<i class="ti ti-calendar" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Periode Arus Kas',
    iconMap: { all: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', 'this-month': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', 'last-month': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M9 18l-6-6 6-6"/></svg>', 'this-quarter': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', 'this-year': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent3)"><path d="M21 12a9 9 0 11-6.22-8.56M21 3v9h-9"/></svg>' },
    subMap: { all: 'Seluruh periode', 'this-month': 'Bulan berjalan', 'last-month': 'Bulan lalu', 'this-quarter': 'Kuartal ini', 'this-year': 'Tahun ini' }
  });

  // Perubahan Ekuitas periode
  const pePeriod = document.getElementById('pe-period');
  if(pePeriod && !pePeriod.dataset.upgraded) upgradeSelectToOptPicker(pePeriod, {
    title: '<i class="ti ti-calendar" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Periode Ekuitas',
    iconMap: { all: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', 'this-month': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', 'last-month': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M9 18l-6-6 6-6"/></svg>', 'this-quarter': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', 'this-year': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent3)"><path d="M21 12a9 9 0 11-6.22-8.56M21 3v9h-9"/></svg>' },
    subMap: { all: 'Seluruh periode', 'this-month': 'Bulan berjalan', 'last-month': 'Bulan lalu', 'this-quarter': 'Kuartal ini', 'this-year': 'Tahun ini' }
  });

  // Kas Jenis (sudah ada tapi dicek lagi)
  const kasJenis2 = document.getElementById('kas-jenis');
  if(kasJenis2 && !kasJenis2.dataset.upgraded) upgradeSelectToOptPicker(kasJenis2, {
    title: '<i class="ti ti-cash" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Jenis Transaksi Kas',
    iconMap: { masuk: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><circle cx="12" cy="12" r="9"/><path d="M8 12l4 4 4-4M12 8v8"/></svg>', keluar: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--red)"><circle cx="12" cy="12" r="9"/><path d="M8 12l4-4 4 4M12 16V8"/></svg>' },
    subMap: { masuk: 'Uang masuk ke kas', keluar: 'Uang keluar dari kas' }
  });

  // Jual metode
  const jualMetode2 = document.getElementById('jual-metode');
  if(jualMetode2 && !jualMetode2.dataset.upgraded) upgradeSelectToOptPicker(jualMetode2, {
    title: '<i class="ti ti-receipt" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Metode Pembayaran',
    iconMap: { tunai: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><path d="M3 10h18M3 14h18M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2zm9 5v3"/></svg>', kredit: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>' },
    subMap: { tunai: 'Dibayar langsung (Kas)', kredit: 'Dibayar nanti — Piutang usaha' }
  });

  // Beli metode
  const beliMetode2 = document.getElementById('beli-metode');
  if(beliMetode2 && !beliMetode2.dataset.upgraded) upgradeSelectToOptPicker(beliMetode2, {
    title: '<i class="ti ti-shopping-cart" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Metode Pembayaran',
    iconMap: { tunai: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><path d="M3 10h18M3 14h18M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2zm9 5v3"/></svg>', kredit: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent3)"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm0 0v6h6M8 13h8M8 17h5"/></svg>' },
    subMap: { tunai: 'Bayar langsung (Kas)', kredit: 'Bayar nanti — Utang usaha' }
  });

  // Filter Jurnal Umum Jenis
  const juType2 = document.getElementById('filter-ju-type');
  if(juType2 && !juType2.dataset.upgraded) upgradeSelectToOptPicker(juType2, {
    title: '<i class="ti ti-filter" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Filter Jenis Jurnal',
    iconMap: { '': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 6H3M16 12H8M13 18h-2"/></svg>', Kas: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><path d="M3 10h18M3 14h18M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2zm9 5v3"/></svg>', Penjualan: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><path d="M5 21V3l2 2 2-2 2 2 2-2 2 2 2-2v18l-2-2-2 2-2-2-2 2-2-2-2 2zm4-11h6m-6 4h6"/></svg>', Pembelian: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent3)"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/></svg>', Manual: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h4l10.5-10.5a1.5 1.5 0 00-4-4L5 17v3zm13.5-13.5l4 4"/></svg>' },
    subMap: { '': 'Tampilkan semua jenis', Kas: 'Penerimaan & pengeluaran kas', Penjualan: 'Transaksi penjualan / invoice', Pembelian: 'Transaksi pembelian', Manual: 'Jurnal penyesuaian manual' }
  });

  // COA Filter Tipe
  const coaTipe2 = document.getElementById('coa-filter-tipe');
  if(coaTipe2 && !coaTipe2.dataset.upgraded) upgradeSelectToOptPicker(coaTipe2, {
    title: '<i class="ti ti-filter" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Filter Tipe Akun',
    iconMap: { '': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 6H3M16 12H8M13 18h-2"/></svg>', Aset: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h2M9 13h2M13 9h2M13 13h2"/></svg>', Liabilitas: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--red)"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>', Ekuitas: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>', Pendapatan: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>', HPP: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l9 5v8l-9 5-9-5V8l9-5zm0 0v9m9-4l-9 4-9-4"/></svg>', Beban: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent3)"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>' },
    subMap: { '': 'Tampilkan semua tipe', Aset: 'Kekayaan perusahaan', Liabilitas: 'Utang & kewajiban', Ekuitas: 'Modal pemilik', Pendapatan: 'Penghasilan usaha', HPP: 'Harga pokok penjualan', Beban: 'Pengeluaran operasional' }
  });

  // COA Filter Kategori
  const coaKat2 = document.getElementById('coa-filter-kat');
  if(coaKat2 && !coaKat2.dataset.upgraded) upgradeSelectToOptPicker(coaKat2, {
    title: '<i class="ti ti-filter" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Filter Kategori Akun'
  });

  // Kalkulator Penyusutan metode (py-metode)
  const pyMetode2 = document.getElementById('py-metode');
  if(pyMetode2 && !pyMetode2.dataset.upgraded) upgradeSelectToOptPicker(pyMetode2, {
    title: '<i class="ti ti-trending-down" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Metode Penyusutan',
    iconMap: {
      'garis-lurus': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><line x1="5" y1="19" x2="19" y2="5"/><path d="M5 5h14v14"/></svg>',
      'saldo-menurun': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent3)"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/></svg>',
      'saldo-menurun-1x': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent3)"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>',
      'sum-of-years': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><path d="M3 20.29V5a2 2 0 012-2h13.71a.7.7 0 01.5 1.21L5.21 18.5a.7.7 0 01-1.21-.5z"/></svg>',
      'unit-produksi': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></svg>'
    },
    subMap: {
      'garis-lurus': 'Biaya tetap per tahun (Straight-Line)',
      'saldo-menurun': 'Biaya menurun — Double Declining Balance',
      'saldo-menurun-1x': 'Saldo menurun 150% — lebih lambat dari DDB',
      'sum-of-years': 'Bobot tahun — makin tua makin kecil',
      'unit-produksi': 'Berdasarkan unit/jam produksi actual'
    }
  });

  // PPN Mode
  const ppnMode2 = document.getElementById('ppn-mode');
  if(ppnMode2 && !ppnMode2.dataset.upgraded) upgradeSelectToOptPicker(ppnMode2, {
    title: '<i class="ti ti-calculator" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Mode Perhitungan PPN',
    iconMap: {
      eksklusif: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><path d="M5 12h14M15 6l6 6-6 6"/></svg>',
      inklusif: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
      dpp: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent3)"><path d="M19 12H5M9 18l-6-6 6-6"/></svg>'
    },
    subMap: {
      eksklusif: 'DPP sudah diketahui → hitung PPN',
      inklusif: 'Harga sudah termasuk PPN → pisahkan',
      dpp: 'Harga inklusif → hitung kembali DPP-nya'
    }
  });

  // PPN Tarif
  const ppnTarif2 = document.getElementById('ppn-tarif');
  if(ppnTarif2 && !ppnTarif2.dataset.upgraded) upgradeSelectToOptPicker(ppnTarif2, {
    title: '<i class="ti ti-receipt-tax" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Tarif PPN',
    iconMap: {
      '12': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h2M8 11h2M8 15h2M14 7h2M14 11h2M14 15h2"/></svg>',
      '11': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>',
      '0': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>',
      custom: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h4l10.5-10.5a1.5 1.5 0 00-4-4L5 17v3zm13.5-13.5l4 4"/></svg>'
    },
    subMap: {
      '12': 'Berlaku mulai 1 Jan 2025 — tarif umum',
      '11': 'Tarif PPN sebelum 2025',
      '0': 'Ekspor BKP/JKP atau fasilitas tertentu',
      custom: 'Masukkan tarif sendiri'
    }
  });

  // PPh 21 PTKP (Pegawai Tetap)
  const p21ptkp2 = document.getElementById('p21-ptkp');
  if(p21ptkp2 && !p21ptkp2.dataset.upgraded) upgradeSelectToOptPicker(p21ptkp2, {
    title: '<i class="ti ti-id-badge" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Status PTKP',
    subMap: { TK0:'TK/0 — Tidak Kawin, 0 tanggungan', TK1:'TK/1 — Tidak Kawin, 1 tanggungan', TK2:'TK/2 — Tidak Kawin, 2 tanggungan', TK3:'TK/3 — Tidak Kawin, 3 tanggungan', K0:'K/0 — Kawin, 0 tanggungan', K1:'K/1 — Kawin, 1 tanggungan', K2:'K/2 — Kawin, 2 tanggungan', K3:'K/3 — Kawin, 3 tanggungan', KI0:'K/I/0 — Kawin+Istri kerja, 0 tanggungan', KI1:'K/I/1 — Kawin+Istri kerja, 1 tanggungan', KI2:'K/I/2 — Kawin+Istri kerja, 2 tanggungan', KI3:'K/I/3 — Kawin+Istri kerja, 3 tanggungan' }
  });

  // PPh 21 Metode Pemotongan
  const p21met2 = document.getElementById('p21-metode');
  if(p21met2 && !p21met2.dataset.upgraded) upgradeSelectToOptPicker(p21met2, {
    title: '<i class="ti ti-adjustments" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Metode Pemotongan PPh 21',
    iconMap: {
      netto: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent3)"><path d="M12 19V5M5 12l7-7 7 7"/><path d="M5 19h14"/></svg>',
      gross: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><path d="M3 9a2 2 0 012-2h14a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9zm6-2V5a2 2 0 012-2h2a2 2 0 012 2v2"/></svg>',
      'gross-up': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><path d="M12 5v14M5 12l7-7 7 7"/></svg>'
    },
    subMap: {
      netto: 'Pajak dipotong dari gaji karyawan',
      gross: 'Pajak ditanggung sepenuhnya oleh perusahaan',
      'gross-up': 'Perusahaan beri tunjangan pajak agar net gaji utuh'
    }
  });

  // PPh 21 PTKP Tidak Tetap
  const p21ptkpTT2 = document.getElementById('p21-ptkp-tt');
  if(p21ptkpTT2 && !p21ptkpTT2.dataset.upgraded) upgradeSelectToOptPicker(p21ptkpTT2, {
    title: '<i class="ti ti-id-badge" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Status PTKP',
    subMap: { TK0:'TK/0 — Tidak Kawin, 0 tanggungan', TK1:'TK/1 — Tidak Kawin, 1 tanggungan', K0:'K/0 — Kawin, 0 tanggungan', K1:'K/1 — Kawin, 1 tanggungan', K2:'K/2 — Kawin, 2 tanggungan', K3:'K/3 — Kawin, 3 tanggungan' }
  });

  // PPh 21 NPWP Tidak Tetap
  const p21npwpTT2 = document.getElementById('p21-npwp-tt');
  if(p21npwpTT2 && !p21npwpTT2.dataset.upgraded) upgradeSelectToOptPicker(p21npwpTT2, {
    title: '<i class="ti ti-id" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Kepemilikan NPWP',
    iconMap: { ya: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>', tidak: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--red)"><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/></svg>' },
    subMap: { ya: 'Tarif normal sesuai ketentuan', tidak: 'Tarif +20% dari tarif normal' }
  });

  // PPh 21 Komisaris PTKP
  const p21komisarisPtkp2 = document.getElementById('p21-komisaris-ptkp');
  if(p21komisarisPtkp2 && !p21komisarisPtkp2.dataset.upgraded) upgradeSelectToOptPicker(p21komisarisPtkp2, {
    title: '<i class="ti ti-id-badge" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Status PTKP Komisaris',
    subMap: { TK0:'TK/0 — Tidak Kawin, 0 tanggungan', TK1:'TK/1', TK2:'TK/2', TK3:'TK/3', K0:'K/0 — Kawin, 0 tanggungan', K1:'K/1', K2:'K/2', K3:'K/3' }
  });

  // PPh 21 Bukan Pegawai NPWP
  const p21bukanPegawaiNpwp2 = document.getElementById('p21-bukan-pegawai-npwp');
  if(p21bukanPegawaiNpwp2 && !p21bukanPegawaiNpwp2.dataset.upgraded) upgradeSelectToOptPicker(p21bukanPegawaiNpwp2, {
    title: '<i class="ti ti-id" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Kepemilikan NPWP',
    iconMap: { ya: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>', tidak: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--red)"><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/></svg>' },
    subMap: { ya: 'Tarif normal', tidak: 'Tarif +20% dari normal' }
  });

  // PPh 21 Peserta Kegiatan NPWP
  const p21pesertaNpwp2 = document.getElementById('p21-peserta-kegiatan-npwp');
  if(p21pesertaNpwp2 && !p21pesertaNpwp2.dataset.upgraded) upgradeSelectToOptPicker(p21pesertaNpwp2, {
    title: '<i class="ti ti-id" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Kepemilikan NPWP',
    iconMap: { ya: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>', tidak: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--red)"><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/></svg>' },
    subMap: { ya: 'Tarif normal', tidak: 'Tarif +20% dari normal' }
  });

  // PPh 21 Mantan Pegawai NPWP
  const p21mantanNpwp2 = document.getElementById('p21-mantan-npwp');
  if(p21mantanNpwp2 && !p21mantanNpwp2.dataset.upgraded) upgradeSelectToOptPicker(p21mantanNpwp2, {
    title: '<i class="ti ti-id" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Kepemilikan NPWP',
    iconMap: { ya: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>', tidak: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--red)"><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/></svg>' },
    subMap: { ya: 'Tarif normal', tidak: 'Tarif +20% dari normal' }
  });

  // PPh 23 Jenis (kalkulator manual)
  const p23jenis2 = document.getElementById('p23-jenis');
  if(p23jenis2 && !p23jenis2.dataset.upgraded) upgradeSelectToOptPicker(p23jenis2, {
    title: '<i class="ti ti-briefcase" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Jenis Penghasilan PPh 23',
    iconMap: {
      dividen: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',
      bunga: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>',
      royalti: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M14.5 9.5A3.5 3.5 0 009 12a3.5 3.5 0 005.5 2.8"/></svg>',
      hadiah: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><path d="M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>',
      sewa: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12L12 3l9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9"/></svg>',
      jasa: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>',
      'jasa-lain': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>',
      custom: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h4l10.5-10.5a1.5 1.5 0 00-4-4L5 17v3zm13.5-13.5l4 4"/></svg>'
    },
    subMap: {
      dividen: 'Dividen — tarif 15%',
      bunga: 'Bunga pinjaman — tarif 15%',
      royalti: 'Royalti & hak cipta — tarif 15%',
      hadiah: 'Hadiah & penghargaan — tarif 15%',
      sewa: 'Sewa harta (bukan tanah/bangunan) — tarif 2%',
      jasa: 'Jasa teknik/manajemen/konsultan — tarif 2%',
      'jasa-lain': 'Jasa lainnya sesuai PMK — tarif 2%',
      custom: 'Isi tarif manual'
    }
  });

  // PPh 23 NPWP (kalkulator manual)
  const p23npwp2 = document.getElementById('p23-npwp');
  if(p23npwp2 && !p23npwp2.dataset.upgraded) upgradeSelectToOptPicker(p23npwp2, {
    title: '<i class="ti ti-id" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Kepemilikan NPWP',
    iconMap: { ya: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>', tidak: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--red)"><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/></svg>' },
    subMap: { ya: 'Tarif normal', tidak: '+100% tarif (2× lipat)' }
  });
} // end upgradePajakPickers

// Upgrades run after page load via window.addEventListener('load') below

// Patch showPage after load
window.addEventListener('load', () => {
  if (typeof showPage === 'function' && !showPage._patched) {
    const _origSP = showPage;
    window.showPage = function(id) {
      _origSP.apply(this, arguments);
      setTimeout(() => { upgradeAllPeriodPickers(); upgradeFormPickers(); upgradePajakPickers(); }, 150);
    };
    window.showPage._patched = true;
  }
  if (typeof addPeriodFilterToReports === 'function' && !addPeriodFilterToReports._patched) {
    const _origAPF = addPeriodFilterToReports;
    window.addPeriodFilterToReports = function() {
      _origAPF.apply(this, arguments);
      setTimeout(upgradeAllPeriodPickers, 80);
    };
    window.addPeriodFilterToReports._patched = true;
  }
  // Initial upgrade for pajak pickers
  setTimeout(upgradePajakPickers, 500);
  // Initial upgrade for ALL pickers on first load
  setTimeout(() => { upgradeAllPeriodPickers(); upgradeFormPickers(); }, 600);
});
function closePhotoViewer() {
  const overlay = document.getElementById('photo-viewer-overlay');
  if (overlay) overlay.classList.remove('open');
  document.removeEventListener('keydown', _pvKeyClose);
}
function _pvKeyClose(e) { if (e.key === 'Escape') closePhotoViewer(); }

// ═══════════════════════════════════════════════════════════════
//  IMAGE CROP ENGINE
// ═══════════════════════════════════════════════════════════════
let _cropState = null; // { imgSrc, shape, outputSize, onConfirm, scale, offsetX, offsetY, naturalW, naturalH, containerW, containerH, isDragging, lastX, lastY, pinchDist }

function openCropModal({ imgSrc, shape, outputSize, title, onConfirm }) {
  _cropState = {
    imgSrc, shape, outputSize: outputSize || 300,
    onConfirm, scale: 1, offsetX: 0, offsetY: 0,
    naturalW: 0, naturalH: 0, containerW: 0, containerH: 0,
    isDragging: false, lastX: 0, lastY: 0, pinchDist: null,
    minScale: 1, maxScale: 4,
    // fitted image dimensions at scale=1 (cover the window)
    fittedW: 0, fittedH: 0, fittedOffsetX: 0, fittedOffsetY: 0
  };

  document.getElementById('crop-modal-title').textContent = title || '✂️ Sesuaikan Foto';

  const win = document.getElementById('crop-window');
  if (win) {
    win.className = 'crop-window ' + (shape === 'circle' ? 'circle' : 'rounded');
  }

  document.getElementById('crop-zoom-slider').value = 1;
  document.getElementById('crop-zoom-label').textContent = '1.0×';

  openModal('modal-image-crop');

  const imgEl = document.getElementById('crop-img-el');
  imgEl.onload = null;
  imgEl.src = '';
  imgEl.onload = function() {
    _cropState.naturalW = this.naturalWidth;
    _cropState.naturalH = this.naturalHeight;
    _initCropLayout();
    _renderCrop();
    _attachCropEvents();
  };
  imgEl.src = imgSrc;
}

function _initCropLayout() {
  const container = document.getElementById('crop-container');
  const rect = container.getBoundingClientRect();
  const cW = rect.width || container.offsetWidth;
  const cH = rect.height || container.offsetHeight;
  _cropState.containerW = cW;
  _cropState.containerH = cH;

  // Window (crop area) = 75% of container, centred
  const winSize = Math.round(Math.min(cW, cH) * 0.75);
  const winEl = document.getElementById('crop-window');
  winEl.style.width  = winSize + 'px';
  winEl.style.height = winSize + 'px';
  winEl.style.left   = Math.round((cW - winSize) / 2) + 'px';
  winEl.style.top    = Math.round((cH - winSize) / 2) + 'px';
  _cropState._winSize   = winSize;
  _cropState._winLeft   = (cW - winSize) / 2;
  _cropState._winTop    = (cH - winSize) / 2;

  // Compute "fitted" dimensions: image covers the crop window at scale=1
  const nW = _cropState.naturalW, nH = _cropState.naturalH;
  const fitScale = Math.max(winSize / nW, winSize / nH);
  const fw = nW * fitScale, fh = nH * fitScale;
  _cropState.fittedW = fw;
  _cropState.fittedH = fh;
  // Center image over crop window
  _cropState.offsetX = _cropState._winLeft + (winSize - fw) / 2;
  _cropState.offsetY = _cropState._winTop  + (winSize - fh) / 2;
  _cropState.fittedOffsetX = _cropState.offsetX;
  _cropState.fittedOffsetY = _cropState.offsetY;
  _cropState.minScale = 1;
  _cropState.maxScale = 4;
  _cropState.scale = 1;
}

function _clampOffset() {
  const s = _cropState;
  const iw = s.fittedW * s.scale;
  const ih = s.fittedH * s.scale;
  // Image must cover the crop window on all sides
  const minX = s._winLeft + s._winSize - iw;
  const maxX = s._winLeft;
  const minY = s._winTop  + s._winSize - ih;
  const maxY = s._winTop;
  s.offsetX = Math.min(maxX, Math.max(minX, s.offsetX));
  s.offsetY = Math.min(maxY, Math.max(minY, s.offsetY));
}

function _renderCrop() {
  const s = _cropState;
  if (!s) return;
  const imgEl = document.getElementById('crop-img-el');
  const iw = s.fittedW * s.scale;
  const ih = s.fittedH * s.scale;
  imgEl.style.width  = iw + 'px';
  imgEl.style.height = ih + 'px';
  imgEl.style.transform = `translate(${s.offsetX}px, ${s.offsetY}px)`;
}

function onCropZoomSlider(val) {
  if (!_cropState) return;
  const s = _cropState;
  const newScale = parseFloat(val);
  // Keep crop window centre fixed
  const cx = s._winLeft + s._winSize / 2;
  const cy = s._winTop  + s._winSize / 2;
  const relX = cx - s.offsetX;
  const relY = cy - s.offsetY;
  const ratio = newScale / s.scale;
  s.offsetX = cx - relX * ratio;
  s.offsetY = cy - relY * ratio;
  s.scale = newScale;
  _clampOffset();
  _renderCrop();
  document.getElementById('crop-zoom-label').textContent = newScale.toFixed(1) + '×';
}

function _attachCropEvents() {
  const container = document.getElementById('crop-container');
  // Remove old listeners by cloning
  const newC = container.cloneNode(false);
  while (container.firstChild) newC.appendChild(container.firstChild);
  container.parentNode.replaceChild(newC, container);
  // Now re-query
  const c = document.getElementById('crop-container');

  // Mouse drag
  c.addEventListener('mousedown', e => {
    _cropState.isDragging = true;
    _cropState.lastX = e.clientX;
    _cropState.lastY = e.clientY;
    c.style.cursor = 'grabbing';
    e.preventDefault();
  });
  window.addEventListener('mousemove', e => {
    if (!_cropState?.isDragging) return;
    const dx = e.clientX - _cropState.lastX;
    const dy = e.clientY - _cropState.lastY;
    _cropState.lastX = e.clientX;
    _cropState.lastY = e.clientY;
    _cropState.offsetX += dx;
    _cropState.offsetY += dy;
    _clampOffset();
    _renderCrop();
  });
  window.addEventListener('mouseup', () => {
    if (_cropState) { _cropState.isDragging = false; }
    const cc = document.getElementById('crop-container');
    if (cc) cc.style.cursor = 'grab';
  });

  // Mouse wheel zoom
  c.addEventListener('wheel', e => {
    e.preventDefault();
    if (!_cropState) return;
    const s = _cropState;
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    const newScale = Math.min(s.maxScale, Math.max(s.minScale, s.scale + delta));
    const rect = c.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const relX = cx - s.offsetX;
    const relY = cy - s.offsetY;
    const ratio = newScale / s.scale;
    s.offsetX = cx - relX * ratio;
    s.offsetY = cy - relY * ratio;
    s.scale = newScale;
    _clampOffset();
    _renderCrop();
    document.getElementById('crop-zoom-slider').value = newScale;
    document.getElementById('crop-zoom-label').textContent = newScale.toFixed(1) + '×';
  }, { passive: false });

  // Touch drag + pinch
  c.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      _cropState.isDragging = true;
      _cropState.lastX = e.touches[0].clientX;
      _cropState.lastY = e.touches[0].clientY;
      _cropState.pinchDist = null;
    } else if (e.touches.length === 2) {
      _cropState.isDragging = false;
      _cropState.pinchDist = _pinchDist(e.touches);
    }
    e.preventDefault();
  }, { passive: false });

  c.addEventListener('touchmove', e => {
    if (!_cropState) return;
    if (e.touches.length === 1 && _cropState.isDragging) {
      const dx = e.touches[0].clientX - _cropState.lastX;
      const dy = e.touches[0].clientY - _cropState.lastY;
      _cropState.lastX = e.touches[0].clientX;
      _cropState.lastY = e.touches[0].clientY;
      _cropState.offsetX += dx;
      _cropState.offsetY += dy;
      _clampOffset();
      _renderCrop();
    } else if (e.touches.length === 2) {
      const s = _cropState;
      const newDist = _pinchDist(e.touches);
      if (s.pinchDist) {
        const ratio = newDist / s.pinchDist;
        const newScale = Math.min(s.maxScale, Math.max(s.minScale, s.scale * ratio));
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const rect = c.getBoundingClientRect();
        const cx = midX - rect.left, cy = midY - rect.top;
        const relX = cx - s.offsetX, relY = cy - s.offsetY;
        const r = newScale / s.scale;
        s.offsetX = cx - relX * r;
        s.offsetY = cy - relY * r;
        s.scale = newScale;
        _clampOffset();
        _renderCrop();
        document.getElementById('crop-zoom-slider').value = newScale;
        document.getElementById('crop-zoom-label').textContent = newScale.toFixed(1) + '×';
      }
      s.pinchDist = newDist;
    }
    e.preventDefault();
  }, { passive: false });

  c.addEventListener('touchend', () => { if (_cropState) _cropState.isDragging = false; });
  c.style.cursor = 'grab';
}

function _pinchDist(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx*dx + dy*dy);
}

function confirmCrop() {
  if (!_cropState) return;
  const s = _cropState;
  const outputSize = s.outputSize;
  const canvas = document.createElement('canvas');
  canvas.width = outputSize; canvas.height = outputSize;
  const ctx = canvas.getContext('2d');

  // Map crop-window pixels back to natural image coordinates
  const iw = s.fittedW * s.scale;
  const ih = s.fittedH * s.scale;
  const scaleToNatural = s.naturalW / iw;

  // Position of crop window in container
  const winX = s._winLeft, winY = s._winTop;
  const imgX  = s.offsetX, imgY  = s.offsetY;

  // Top-left of crop window relative to image (in rendered px)
  const cropSrcX = (winX - imgX) * scaleToNatural;
  const cropSrcY = (winY - imgY) * scaleToNatural;
  const cropSrcSize = s._winSize * scaleToNatural;

  const imgEl = document.getElementById('crop-img-el');
  ctx.drawImage(imgEl, cropSrcX, cropSrcY, cropSrcSize, cropSrcSize, 0, 0, outputSize, outputSize);

  const format  = s.shape === 'circle' ? 'image/jpeg' : 'image/png';
  const quality = 0.88;
  const result  = canvas.toDataURL(format, quality);

  closeModal('modal-image-crop');
  _cropState = null;
  if (s.onConfirm) s.onConfirm(result);
}

function cancelCrop() {
  closeModal('modal-image-crop');
  _cropState = null;
}

// ═══════════════════════════════════════════════════════════════
//  PATCHED UPLOAD HANDLERS (use crop modal)
// ═══════════════════════════════════════════════════════════════
function _applyProfilePhoto(compressed) {
  const msg = document.getElementById('accs-photo-msg');
  if (msg) { msg.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 0.7s linear infinite;vertical-align:-2px"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Menyimpan...'; msg.style.color = 'var(--muted)'; }
  localStorage.setItem('oas_profile_photo', compressed);
  if (currentUser && typeof _supa !== 'undefined') {
    DB.auth.updateUser({ data: { avatar_url: compressed } }).catch(err => {
      console.warn('[Photo] Gagal simpan ke Supabase:', err.message);
    });
  }
  const initial = (currentUser?.user_metadata?.full_name || currentUser?.email || '?').charAt(0).toUpperCase();
  const avatarEl = document.getElementById('accs-avatar');
  if (avatarEl) {
    avatarEl.innerHTML = `<img src="${compressed}" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:50%;cursor:pointer;" onclick="openPhotoViewer(this.src,'circle')" title="Lihat foto" onerror="this.parentElement.innerHTML='${initial}'">`;
  }
  updateUserChip();
  if (msg) {
    msg.innerHTML = '<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Foto profil diperbarui!';
    msg.style.color = 'var(--accent)';
    setTimeout(() => { msg.innerHTML = ''; }, 2500);
  }
}

function _applyCompanyLogo(compressed) {
  localStorage.setItem('oas_company_logo', compressed);
  const editLogoEl = document.getElementById('profil-edit-logo-preview');
  if (editLogoEl) {
    editLogoEl.innerHTML = `<img src="${compressed}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;cursor:pointer;" onclick="openPhotoViewer(this.src,'rounded')" title="Lihat logo">`;
  }
  const viewLogoEl = document.getElementById('profil-view-logo');
  if (viewLogoEl) {
    viewLogoEl.innerHTML = `<img src="${compressed}" style="width:100%;height:100%;object-fit:cover;border-radius:14px;cursor:pointer;" onclick="openPhotoViewer(this.src,'rounded')" title="Lihat logo">`;
  }
}

// CUSTOM DATE PICKER (BHP)
(function() {
  const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const DAYS_ID = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

  function formatDisplay(dateStr) {
    if (!dateStr) return '';
    const p = dateStr.split('-');
    if (p.length < 3) return '';
    return parseInt(p[2]) + ' ' + MONTHS_ID[parseInt(p[1])-1] + ' ' + p[0];
  }

  function todayStr() {
    const n = new Date();
    return n.getFullYear() + '-' + String(n.getMonth()+1).padStart(2,'0') + '-' + String(n.getDate()).padStart(2,'0');
  }

  // Shared backdrop
  var _backdrop = null;
  function getBackdrop() {
    if (!_backdrop) {
      _backdrop = document.createElement('div');
      _backdrop.className = 'oas-cal-backdrop';
      _backdrop.addEventListener('click', function() { closeAllPickers(); });
      document.body.appendChild(_backdrop);
    }
    return _backdrop;
  }

  function closeAllPickers() {
    document.querySelectorAll('.oas-cal-popup.open').forEach(function(p) {
      p.classList.remove('open');
    });
    const bd = getBackdrop();
    bd.classList.remove('open');
    bd.innerHTML = '';
    document.querySelectorAll('.oas-date-display.open').forEach(function(d) { d.classList.remove('open'); });
  }
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeAllPickers(); });

  function createPicker(hiddenInput, opts) {
    opts = opts || {};
    const wrapper = document.createElement('div');
    wrapper.className = 'oas-date-wrapper' + (opts.small ? ' small' : '');

    const display = document.createElement('div');
    const hasVal = !!hiddenInput.value;
    display.className = 'oas-date-display' + (hasVal ? '' : ' placeholder-text');
    const displayText = document.createElement('span');
    displayText.className = 'oas-display-text';
    displayText.textContent = hasVal ? formatDisplay(hiddenInput.value) : (opts.placeholder || 'Pilih tanggal');
    const calIcon = document.createElement('span');
    calIcon.className = 'oas-cal-icon';
    calIcon.innerHTML = '<i class="ti ti-calendar" style="font-size:18px;"></i>';
    display.appendChild(displayText);
    display.appendChild(calIcon);

    // popup lives in backdrop (body-level), not in wrapper
    const popup = document.createElement('div');
    popup.className = 'oas-cal-popup';

    wrapper.appendChild(display);
    hiddenInput.parentNode.insertBefore(wrapper, hiddenInput);
    wrapper.appendChild(hiddenInput);

    let curYear = new Date().getFullYear();
    let curMonth = new Date().getMonth();
    let selectedDate = hiddenInput.value || '';

    if (selectedDate) {
      const p = selectedDate.split('-');
      curYear = parseInt(p[0]); curMonth = parseInt(p[1])-1;
    }

    function renderDays() {
      const today = todayStr();
      const firstDay = new Date(curYear, curMonth, 1).getDay();
      const daysInMonth = new Date(curYear, curMonth+1, 0).getDate();

      let html = '<div class="oas-cal-header">'
        + '<button class="oas-cal-nav" data-nav="-1">&#8249;</button>'
        + '<span class="oas-cal-month-year" data-mode="months">' + MONTHS_ID[curMonth] + ' ' + curYear + '</span>'
        + '<button class="oas-cal-nav" data-nav="1">&#8250;</button>'
        + '</div><div class="oas-cal-grid">';

      DAYS_ID.forEach(function(d) { html += '<div class="oas-cal-dow">' + d + '</div>'; });
      for (var i = 0; i < firstDay; i++) html += '<div class="oas-cal-day empty"></div>';
      for (var d = 1; d <= daysInMonth; d++) {
        var ds = curYear + '-' + String(curMonth+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
        var cls = 'oas-cal-day';
        if (ds === today) cls += ' today';
        if (ds === selectedDate) cls += ' selected';
        html += '<div class="' + cls + '" data-date="' + ds + '">' + d + '</div>';
      }
      html += '</div><div class="oas-cal-footer">'
        + '<button class="oas-cal-btn-clear">Hapus</button>'
        + '<button class="oas-cal-btn-today">Hari Ini</button>'
        + '</div>';

      popup.innerHTML = html;

      popup.querySelectorAll('[data-nav]').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          curMonth += parseInt(btn.dataset.nav);
          if (curMonth < 0) { curMonth = 11; curYear--; }
          else if (curMonth > 11) { curMonth = 0; curYear++; }
          renderDays();
        });
      });
      var myBtn = popup.querySelector('[data-mode="months"]');
      if (myBtn) myBtn.addEventListener('click', function(e) { e.stopPropagation(); renderMonths(); });
      popup.querySelectorAll('[data-date]').forEach(function(el) {
        el.addEventListener('click', function(e) { e.stopPropagation(); selectDate(el.dataset.date); });
      });
      var clearBtn = popup.querySelector('.oas-cal-btn-clear');
      if (clearBtn) clearBtn.addEventListener('click', function(e) { e.stopPropagation(); selectDate(''); });
      var todayBtn = popup.querySelector('.oas-cal-btn-today');
      if (todayBtn) todayBtn.addEventListener('click', function(e) { e.stopPropagation(); selectDate(todayStr()); });
    }

    function renderMonths() {
      var html = '<div class="oas-cal-year-nav">'
        + '<button class="oas-cal-nav" data-yn="-1">&#8249;</button>'
        + '<span class="oas-cal-year-label">' + curYear + '</span>'
        + '<button class="oas-cal-nav" data-yn="1">&#8250;</button>'
        + '</div><div class="oas-cal-my-grid">';
      MONTHS_ID.forEach(function(m, i) {
        html += '<div class="oas-cal-my-item' + (i === curMonth ? ' selected' : '') + '" data-mi="' + i + '">' + m.substring(0,3) + '</div>';
      });
      html += '</div>';
      popup.innerHTML = html;
      popup.querySelectorAll('[data-yn]').forEach(function(btn) {
        btn.addEventListener('click', function(e) { e.stopPropagation(); curYear += parseInt(btn.dataset.yn); renderMonths(); });
      });
      popup.querySelectorAll('[data-mi]').forEach(function(el) {
        el.addEventListener('click', function(e) { e.stopPropagation(); curMonth = parseInt(el.dataset.mi); renderDays(); });
      });
    }

    function selectDate(ds) {
      selectedDate = ds;
      hiddenInput.value = ds;
      display.classList.toggle('placeholder-text', !ds);
      displayText.textContent = ds ? formatDisplay(ds) : (opts.placeholder || 'Pilih tanggal');
      closeAllPickers();
      hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    display.addEventListener('click', function(e) {
      e.stopPropagation();
      if (popup.classList.contains('open')) {
        closeAllPickers();
      } else {
        closeAllPickers();
        if (selectedDate) { var p2 = selectedDate.split('-'); curYear = parseInt(p2[0]); curMonth = parseInt(p2[1])-1; }
        renderDays();
        var bd = getBackdrop();
        bd.innerHTML = '';
        bd.appendChild(popup);
        bd.classList.add('open');
        popup.classList.add('open');
        display.classList.add('open');
      }
    });
    popup.addEventListener('click', function(e) { e.stopPropagation(); });

    hiddenInput._oasSetDate = function(ds) {
      selectedDate = ds; hiddenInput.value = ds;
      display.classList.toggle('placeholder-text', !ds);
      displayText.textContent = ds ? formatDisplay(ds) : (opts.placeholder || 'Pilih tanggal');
    };
    return wrapper;
  }

  function upgradeAllDateInputs() {
    document.querySelectorAll('input[type="date"]:not([data-oas-upgraded])').forEach(function(input) {
      input.setAttribute('data-oas-upgraded', '1');
      const isSmall = !!(input.closest('.filter-bar') || input.closest('.dash-filter') || (input.getAttribute('style') || '').includes('font-size:12px'));
      const origOnchange = input.getAttribute('onchange');
      input.style.display = 'none';
      input.setAttribute('type', 'text');
      if (origOnchange) {
        input.addEventListener('change', function() { try { (new Function(origOnchange))(); } catch(e) {} });
        input.removeAttribute('onchange');
      }
      createPicker(input, { small: isSmall, placeholder: 'Pilih tanggal' });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', upgradeAllDateInputs);
  } else {
    upgradeAllDateInputs();
  }

  var observer = new MutationObserver(function(mutations) {
    var found = false;
    mutations.forEach(function(m) { if (m.addedNodes.length) found = true; });
    if (found) setTimeout(upgradeAllDateInputs, 50);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  window.oasDatePicker = { upgrade: upgradeAllDateInputs, formatDisplay: formatDisplay, todayStr: todayStr };
})();

(function() {
  'use strict';

  var THRESHOLD      = 72;   // px tarik untuk trigger refresh
  var MAX_PULL       = 110;  // px maks tarik
  var RESIST         = 0.45; // faktor hambatan
  var startY         = 0;
  var currentY       = 0;
  var isPulling      = false;
  var isRefreshing   = false;
  var touchStarted   = false;

  var pill    = document.getElementById('ptr-pill');
  var label   = document.getElementById('ptr-label');
  var arrow   = document.getElementById('ptr-arrow');
  var mainEl  = document.querySelector('.main');
  // Hanya translasikan .content bukan .main, agar topbar tidak ikut ketarik
  var contentEl = document.querySelector('.content');

  function getScrollTop() {
    // Pakai scroll dari .content (bukan .main) karena .content yang overflow-y: auto sesungguhnya.
    // .main hanya wadah flex (overflow:hidden) jadi scrollTop-nya selalu 0 — kalau dipakai,
    // fitur pull-to-refresh akan salah kira selalu di posisi paling atas dan header ikut "ketarik".
    var contentEl2 = document.querySelector('.content');
    if (contentEl2) return contentEl2.scrollTop;
    var mainEl2 = document.querySelector('.main');
    if (mainEl2) return mainEl2.scrollTop;
    return window.scrollY || document.documentElement.scrollTop || 0;
  }

  function setPillY(py) {
    // py = pull distance (raw, sudah dengan resistansi)
    pill.style.transform = 'translateY(' + (py - 4) + 'px)';
  }

  function setMainTranslate(py) {
    if (contentEl) contentEl.style.transform = 'translateY(' + py + 'px)';
  }

  function resetMain() {
    if (!contentEl) return;
    mainEl && mainEl.classList.remove('ptr-pulling');
    mainEl && mainEl.classList.add('ptr-snap-back');
    contentEl.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    contentEl.style.transform = '';
    setTimeout(function() {
      mainEl && mainEl.classList.remove('ptr-snap-back');
      contentEl.style.transition = '';
    }, 350);
  }

  function showPill() {
    pill.classList.add('ptr-visible');
  }

  function hidePill() {
    pill.classList.remove('ptr-visible', 'ptr-ready', 'ptr-refreshing');
    pill.style.transform = 'translateY(-60px)';
    if (label) label.textContent = 'Tarik untuk refresh';
    if (arrow) {
      arrow.style.transform = '';
      arrow.textContent = '↓';      // reset kembali ke panah bawah
      arrow.style.display = '';     // hapus inline display:flex dari afterRefresh
    }
  }

  function doRefresh() {
    if (isRefreshing) return;
    isRefreshing = true;

    pill.classList.remove('ptr-ready');
    pill.classList.add('ptr-refreshing');
    if (label) label.textContent = 'Memuat ulang...';

    // Tahan pill di posisi threshold
    setPillY(THRESHOLD * RESIST + 8);
    setMainTranslate(THRESHOLD * RESIST * 0.4);

    // Fungsi refresh aktual: reload data dari Supabase atau render ulang halaman
    function afterRefresh() {
      isRefreshing = false;
      isPulling    = false;

      // Animasi selesai
      pill.classList.remove('ptr-refreshing');
      pill.classList.add('ptr-ready');
      if (label) label.textContent = '✓ Diperbarui!';
      if (arrow) arrow.textContent = '✓';
      arrow.style.display = 'flex';

      setTimeout(function() {
        hidePill();
        resetMain();
      }, 700);
    }

    try {
      var refreshPromise = null;

      // Jika Supabase aktif: reload data dari cloud
      if (typeof loadDataFromSupabase === 'function' && window.currentCompany) {
        refreshPromise = loadDataFromSupabase();
      } else {
        // Lokal: render ulang halaman aktif
        if (typeof currentPage !== 'undefined' && typeof showPage === 'function') {
          try { showPage(currentPage); } catch(e) {}
        }
        refreshPromise = Promise.resolve();
      }

      if (refreshPromise && typeof refreshPromise.then === 'function') {
        refreshPromise.then(afterRefresh).catch(afterRefresh);
      } else {
        setTimeout(afterRefresh, 600);
      }
    } catch(e) {
      setTimeout(afterRefresh, 400);
    }
  }

  // ── Touch events ─────────────────────────────────────────────

  document.addEventListener('touchstart', function(e) {
    if (isRefreshing) return;
    // Hanya aktif jika scroll di paling atas
    if (getScrollTop() > 2) return;
    // Jangan aktifkan jika menyentuh elemen scrollable di dalam (modal, sheet, dll)
    var target = e.target;
    var isInScrollable = false;
    var el = target;
    while (el && el !== document.body) {
      if (el.id && (el.id.includes('picker') || el.id.includes('modal') || el.id.includes('sheet') || el.id.includes('overlay'))) {
        isInScrollable = true; break;
      }
      if (el.classList && (el.classList.contains('modal') || el.classList.contains('modal-backdrop') || el.classList.contains('sidebar'))) {
        isInScrollable = true; break;
      }
      el = el.parentElement;
    }
    if (isInScrollable) return;

    touchStarted = true;
    startY = e.touches[0].clientY;
    currentY = startY;
  }, { passive: true });

  document.addEventListener('touchmove', function(e) {
    if (!touchStarted || isRefreshing) return;
    if (getScrollTop() > 2) { touchStarted = false; return; }

    currentY = e.touches[0].clientY;
    var dy = currentY - startY;

    if (dy <= 0) {
      if (isPulling) {
        isPulling = false;
        hidePill();
        resetMain();
      }
      return;
    }

    // Resistansi
    var pull = Math.min(dy * RESIST, MAX_PULL * RESIST);

    if (!isPulling) {
      isPulling = true;
      if (mainEl) mainEl.classList.add('ptr-pulling');
    }

    showPill();
    setPillY(pull);
    setMainTranslate(pull * 0.35);

    // Rotasi arrow sesuai progress
    var progress = Math.min(pull / (THRESHOLD * RESIST), 1);
    var rot = progress * 180;
    if (arrow) arrow.style.transform = 'rotate(' + rot + 'deg)';

    if (pull >= THRESHOLD * RESIST) {
      pill.classList.add('ptr-ready');
      if (label) label.textContent = 'Lepas untuk refresh';
    } else {
      pill.classList.remove('ptr-ready');
      if (label) label.textContent = 'Tarik untuk refresh';
    }
  }, { passive: true });

  document.addEventListener('touchend', function(e) {
    if (!touchStarted) return;
    touchStarted = false;

    if (!isPulling) return;

    var dy = currentY - startY;
    var pull = Math.min(dy * RESIST, MAX_PULL * RESIST);

    if (pull >= THRESHOLD * RESIST) {
      doRefresh();
    } else {
      isPulling = false;
      hidePill();
      resetMain();
    }
  }, { passive: true });

  document.addEventListener('touchcancel', function() {
    touchStarted = false;
    if (isPulling) {
      isPulling = false;
      hidePill();
      resetMain();
    }
  }, { passive: true });

})();

(function() {
  'use strict';

  // ── Label mapping untuk berbagai operasi ──────────────────────
  const SPINNER_LABELS = {
    simpanKas:        ['Menyimpan Jurnal Kas...', 'Mengunggah ke cloud'],
    simpanPenjualan:  ['Menyimpan Jurnal Penjualan...', 'Mengunggah ke cloud'],
    simpanPembelian:  ['Menyimpan Jurnal Pembelian...', 'Mengunggah ke cloud'],
    simpanManualFn:   ['Menyimpan Jurnal Manual...', 'Memvalidasi & mengunggah'],
    simpanAkun:       ['Menyimpan Akun...', 'Memperbarui chart of accounts'],
    hapusAkun:        ['Menghapus Akun...', 'Memperbarui data'],
    simpanSaldoAwal:  ['Menyimpan Saldo Awal...', 'Mengunggah ke cloud'],
    saveJurnalFromAI: ['Menyimpan Jurnal dari AI...', 'Memproses & mengunggah'],
    hapusJurnal:      ['Menghapus Jurnal...', 'Sinkronisasi ke cloud'],
    createCompany:    ['Membuat Perusahaan...', 'Menyiapkan data bisnis'],
    deleteCompany:    ['Menghapus Perusahaan...', 'Membersihkan semua data'],
    buatJurnalPenutup:['Membuat Jurnal Penutup...', 'Memproses penutupan buku'],
    buatJurnalDariBank:['Membuat Jurnal dari Bank...', 'Mengunggah ke cloud'],
    deleteAttachment: ['Menghapus Lampiran...', 'Memperbarui data'],
    accsUpdateProfile:['Memperbarui Profil...', 'Menyimpan ke akun'],
    accsUpdatePassword:['Mengubah Kata Sandi...', 'Memproses keamanan'],
    accsLinkProvider: ['Menghubungkan Akun...', 'Memproses autentikasi'],
    accsUnlinkProvider:['Memutus Koneksi Akun...', 'Memproses'],
    accsLogoutAll:    ['Keluar dari Semua Sesi...', 'Membersihkan sesi'],
    saveKartuStock:   ['Menyimpan Kartu Stok...', 'Mengunggah ke cloud'],
    exportData:       ['Mengekspor Data...', 'Menyiapkan file'],
  };

  // ── Helper: wrap fungsi async/sync dengan spinner ─────────────
  function wrapWithSpinner(fnName, labelPair) {
    const orig = window[fnName];
    if (typeof orig !== 'function') return; // belum tersedia, coba lagi nanti

    window[fnName] = async function() {
      const label = labelPair[0];
      const sub   = labelPair[1];

      // Jalankan fungsi asli
      const result = orig.apply(this, arguments);

      // Jika fungsi membutuhkan validasi (return void/false sebelum async),
      // kita show spinner HANYA jika tidak ada alert yang muncul karena validasi gagal.
      // Triknya: tunda 0ms, jika ada alert-box.show maka spinner tidak perlu.
      await new Promise(r => setTimeout(r, 0));
      const alertBox = document.getElementById('alert-box');
      const isValidationAlert = alertBox && alertBox.classList.contains('show') &&
        (alertBox.textContent.startsWith('❌') || alertBox.textContent.startsWith('Lengkapi') ||
         alertBox.textContent.startsWith('Isi') || alertBox.textContent.startsWith('Pilih') ||
         alertBox.textContent.includes('wajib') || alertBox.textContent.includes('tidak bisa') ||
         alertBox.textContent.includes('balance') || alertBox.textContent.includes('sudah ada'));
      if (isValidationAlert) return result;

      // Show spinner
      if (typeof showOpSpinner === 'function') showOpSpinner(label, sub);

      // Tunggu promise jika async, atau tunggu operasi selesai
      try {
        if (result && typeof result.then === 'function') {
          await result;
        }
      } catch(e) {
        // Error sudah ditangani di fungsi asli
      } finally {
        if (typeof hideOpSpinner === 'function') hideOpSpinner();
      }
      return result;
    };
  }

  // ── Wrap fungsi-fungsi sinkron yang memanggil addJurnal ───────
  // (addJurnal sendiri sudah di-override untuk show spinner saat Supabase,
  //  tapi untuk local-only mode kita perlu spinner juga)
  function wrapSyncSave(fnName, labelPair) {
    const orig = window[fnName];
    if (typeof orig !== 'function') return;

    window[fnName] = function() {
      // Jalankan dulu untuk validasi
      const args = arguments;

      // Cek apakah akan gagal validasi dengan mencoba tanpa spinner dulu
      // Cara: jalankan, cek alert
      orig.apply(this, args);

      setTimeout(function() {
        const alertBox = document.getElementById('alert-box');
        const isError = alertBox && alertBox.classList.contains('show') &&
          (alertBox.textContent.startsWith('❌') ||
           alertBox.textContent.startsWith('Lengkapi') ||
           alertBox.textContent.startsWith('Isi ') ||
           alertBox.textContent.startsWith('Pilih') ||
           alertBox.textContent.includes('wajib') ||
           alertBox.textContent.includes('tidak bisa') ||
           alertBox.textContent.includes('tidak balance') ||
           alertBox.textContent.includes('sudah ada') ||
           alertBox.textContent.includes('tidak balance'));

        // Jika sukses (ada pesan ✓ atau <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>), spinner sudah ditangani oleh addJurnal
        // untuk mode Supabase. Untuk local-only, tambahkan spinner singkat.
        const isSuccess = alertBox && alertBox.classList.contains('show') &&
          (alertBox.textContent.startsWith('✓') || alertBox.textContent.startsWith('<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>'));

        if (isSuccess && typeof window.currentCompany === 'undefined' || 
            isSuccess && !window.currentCompany) {
          // Local mode: tampilkan spinner singkat saat menyimpan ke localStorage
          if (typeof showOpSpinner === 'function') {
            showOpSpinner(labelPair[0], 'Menyimpan ke penyimpanan lokal');
            setTimeout(function() {
              if (typeof hideOpSpinner === 'function') hideOpSpinner();
            }, 600);
          }
        }
      }, 20);
    };
  }

  // ── Override hapusAkun untuk tambah spinner di confirm ─────────
  function wrapHapusAkun() {
    const orig = window.hapusAkun;
    if (typeof orig !== 'function') return;
    window.hapusAkun = function(kode) {
      const a = (window.akuns || []).find(x => x.kode === kode);
      if (!a) return orig.apply(this, arguments);
      // Intercept showCustomConfirmGeneral result
      const origConfirm = window.showCustomConfirmGeneral;
      if (typeof origConfirm !== 'function') return orig.apply(this, arguments);

      // Wrap: ganti showCustomConfirmGeneral sementara
      window.showCustomConfirmGeneral = function(opts) {
        const origFn = origConfirm;
        window.showCustomConfirmGeneral = origFn; // restore
        return origFn(opts).then(ok => {
          if (ok) {
            showOpSpinner('Menghapus Akun...', 'Memperbarui chart of accounts');
            setTimeout(function() {
              if (typeof hideOpSpinner === 'function') hideOpSpinner();
            }, typeof window.currentCompany !== 'undefined' && window.currentCompany ? 1200 : 400);
          }
          return ok;
        });
      };
      return orig.apply(this, arguments);
    };
  }

  // ── Override saveKartuStockToCloud ────────────────────────────
  function wrapSaveKartuStock() {
    const orig = window.saveKartuStockToCloud;
    if (typeof orig !== 'function') return;
    window.saveKartuStockToCloud = async function() {
      showOpSpinner('Menyimpan Kartu Stok...', 'Mengunggah ke cloud');
      try {
        const r = await orig.apply(this, arguments);
        return r;
      } finally {
        hideOpSpinner();
      }
    };
  }

  // ── Override saveJurnalFromAI ─────────────────────────────────
  function wrapSaveJurnalFromAI() {
    const orig = window.saveJurnalFromAI;
    if (typeof orig !== 'function') return;
    window.saveJurnalFromAI = async function() {
      showOpSpinner('Menyimpan Jurnal dari AI...', 'Memproses & mengunggah');
      try {
        const r = orig.apply(this, arguments);
        if (r && typeof r.then === 'function') await r;
        return r;
      } finally {
        setTimeout(function() { if (typeof hideOpSpinner === 'function') hideOpSpinner(); }, 300);
      }
    };
  }

  // ── Override buatJurnalPenutup ────────────────────────────────
  function wrapBuatJurnalPenutup() {
    const orig = window.buatJurnalPenutup;
    if (typeof orig !== 'function') return;
    window.buatJurnalPenutup = async function() {
      showOpSpinner('Membuat Jurnal Penutup...', 'Memproses penutupan buku');
      try {
        const r = orig.apply(this, arguments);
        if (r && typeof r.then === 'function') await r;
        return r;
      } finally {
        setTimeout(function() { if (typeof hideOpSpinner === 'function') hideOpSpinner(); }, 400);
      }
    };
  }

  // ── Override buatJurnalDariBankRow ────────────────────────────
  function wrapBuatJurnalDariBankRow() {
    const orig = window.buatJurnalDariBankRow;
    if (typeof orig !== 'function') return;
    window.buatJurnalDariBankRow = async function() {
      showOpSpinner('Membuat Jurnal dari Bank...', 'Mengunggah ke cloud');
      try {
        const r = await orig.apply(this, arguments);
        return r;
      } finally {
        hideOpSpinner();
      }
    };
  }

  // ── Override createCompany ────────────────────────────────────
  function wrapCreateCompany() {
    const orig = window.createCompany;
    if (typeof orig !== 'function') return;
    window.createCompany = async function() {
      showOpSpinner('Membuat Perusahaan...', 'Menyiapkan data bisnis');
      try {
        const r = await orig.apply(this, arguments);
        return r;
      } finally {
        hideOpSpinner();
      }
    };
  }

  // ── Override accsUpdateProfile ────────────────────────────────
  function wrapAccsUpdateProfile() {
    const orig = window.accsUpdateProfile;
    if (typeof orig !== 'function') return;
    window.accsUpdateProfile = async function() {
      showOpSpinner('Memperbarui Profil...', 'Menyimpan ke akun');
      try {
        const r = await orig.apply(this, arguments);
        return r;
      } finally {
        hideOpSpinner();
      }
    };
  }

  // ── Override accsUpdatePassword ──────────────────────────────
  function wrapAccsUpdatePassword() {
    const orig = window.accsUpdatePassword;
    if (typeof orig !== 'function') return;
    window.accsUpdatePassword = async function() {
      showOpSpinner('Mengubah Kata Sandi...', 'Memproses keamanan');
      try {
        const r = await orig.apply(this, arguments);
        return r;
      } finally {
        hideOpSpinner();
      }
    };
  }

  // ── Override accsLinkProvider ─────────────────────────────────
  function wrapAccsLinkProvider() {
    const orig = window.accsLinkProvider;
    if (typeof orig !== 'function') return;
    window.accsLinkProvider = async function() {
      showOpSpinner('Menghubungkan Akun...', 'Memproses autentikasi');
      try {
        const r = await orig.apply(this, arguments);
        return r;
      } finally {
        hideOpSpinner();
      }
    };
  }

  // ── Override accsUnlinkProvider ──────────────────────────────
  function wrapAccsUnlinkProvider() {
    const orig = window.accsUnlinkProvider;
    if (typeof orig !== 'function') return;
    window.accsUnlinkProvider = async function() {
      showOpSpinner('Memutus Koneksi Akun...', 'Memproses');
      try {
        const r = await orig.apply(this, arguments);
        return r;
      } finally {
        hideOpSpinner();
      }
    };
  }

  // ── Override simpanAkun (sync tapi butuh spinner) ─────────────
  function wrapSimpanAkun() {
    const orig = window.simpanAkun;
    if (typeof orig !== 'function') return;
    window.simpanAkun = function() {
      const kode = document.getElementById('new-akun-kode')?.value?.trim();
      const nama  = document.getElementById('new-akun-nama')?.value?.trim();
      if (!kode || !nama) { orig.apply(this, arguments); return; }
      if ((window.akuns || []).find(a => a.kode === kode)) { orig.apply(this, arguments); return; }

      orig.apply(this, arguments);
      // Spinner untuk cloud sync
      if (typeof showOpSpinner === 'function') {
        showOpSpinner('Menyimpan Akun...', 'Memperbarui chart of accounts');
        const isSupa = typeof window.currentCompany !== 'undefined' && window.currentCompany;
        const delay = isSupa ? 1000 : 400;
        setTimeout(function() {
          if (typeof hideOpSpinner === 'function') hideOpSpinner();
        }, delay);
      }
    };
  }

  // ── Override simpanSaldoAwal ──────────────────────────────────
  function wrapSimpanSaldoAwal() {
    const orig = window.simpanSaldoAwal;
    if (typeof orig !== 'function') return;
    window.simpanSaldoAwal = function() {
      const tgl = document.getElementById('saldo-awal-tgl')?.value;
      if (!tgl) { orig.apply(this, arguments); return; }
      const lines = [];
      document.querySelectorAll('#saldo-awal-rows input').forEach(inp => {
        if (parseFloat(inp.value) || 0) lines.push(inp);
      });
      if (!lines.length) { orig.apply(this, arguments); return; }

      orig.apply(this, arguments);
      if (typeof showOpSpinner === 'function') {
        showOpSpinner('Menyimpan Saldo Awal...', 'Mengunggah ke cloud');
        const isSupa = typeof window.currentCompany !== 'undefined' && window.currentCompany;
        setTimeout(function() {
          if (typeof hideOpSpinner === 'function') hideOpSpinner();
        }, isSupa ? 1200 : 500);
      }
    };
  }

  // Helper: apakah mode lokal (tamu atau belum login ke bisnis cloud)
  // ── Override simpanKas ────────────────────────────────────────
  function wrapSimpanKas() {
    const orig = window.simpanKas;
    if (typeof orig !== 'function') return;
    window.simpanKas = function() {
      const tanggal = document.getElementById('kas-tanggal')?.value;
      const jumlah  = parseFloat(document.getElementById('kas-jumlah')?.value) || 0;
      const akunKode= document.getElementById('kas-akun-lawan')?.value;
      if (!tanggal) { showAlert('Pilih tanggal terlebih dahulu!'); return; }
      if (!jumlah || !akunKode) { orig.apply(this, arguments); return; }

      if (typeof showOpSpinner === 'function') showOpSpinner('Menyimpan Jurnal Kas...', 'Mengunggah ke cloud');
      orig.apply(this, arguments);
      // Jika local mode: hide setelah 500ms, jika cloud: addJurnal akan trigger async hideOpSpinner
      if (typeof window.currentCompany === 'undefined' || !window.currentCompany) {
        setTimeout(function() { if (typeof hideOpSpinner === 'function') hideOpSpinner(); }, 500);
      }
    };
  }

  // ── Override simpanPenjualan ──────────────────────────────────
  function wrapSimpanPenjualan() {
    const orig = window.simpanPenjualan;
    if (typeof orig !== 'function') return;
    window.simpanPenjualan = function() {
      const tanggal = document.getElementById('jual-tanggal')?.value;
      const jumlah  = parseFloat(document.getElementById('jual-jumlah')?.value) || 0;
      if (!tanggal) { showAlert('Pilih tanggal terlebih dahulu!'); return; }
      if (!jumlah) { orig.apply(this, arguments); return; }

      if (typeof showOpSpinner === 'function') showOpSpinner('Menyimpan Jurnal Penjualan...', 'Mengunggah ke cloud');
      orig.apply(this, arguments);
      if (typeof window.currentCompany === 'undefined' || !window.currentCompany) {
        setTimeout(function() { if (typeof hideOpSpinner === 'function') hideOpSpinner(); }, 500);
      }
    };
  }

  // ── Override simpanPembelian ──────────────────────────────────
  function wrapSimpanPembelian() {
    const orig = window.simpanPembelian;
    if (typeof orig !== 'function') return;
    window.simpanPembelian = function() {
      const tanggal = document.getElementById('beli-tanggal')?.value;
      const jumlah  = parseFloat(document.getElementById('beli-jumlah')?.value) || 0;
      const akunKode= document.getElementById('beli-akun')?.value;
      if (!tanggal) { showAlert('Pilih tanggal terlebih dahulu!'); return; }
      if (!jumlah || !akunKode) { orig.apply(this, arguments); return; }

      if (typeof showOpSpinner === 'function') showOpSpinner('Menyimpan Jurnal Pembelian...', 'Mengunggah ke cloud');
      orig.apply(this, arguments);
      if (typeof window.currentCompany === 'undefined' || !window.currentCompany) {
        setTimeout(function() { if (typeof hideOpSpinner === 'function') hideOpSpinner(); }, 500);
      }
    };
  }

  // ── Override simpanManual ─────────────────────────────────────
  function wrapSimpanManual() {
    const orig = window.simpanManual;
    if (typeof orig !== 'function') return;
    window.simpanManual = function() {
      const tanggal = document.getElementById('man-tanggal')?.value;
      const lines = [];
      document.querySelectorAll('#manual-lines .jurnal-line-row').forEach(row => {
        const inps = row.querySelectorAll('input[type=number]');
        if ((parseFloat(inps[0]?.value)||0) || (parseFloat(inps[1]?.value)||0)) lines.push(1);
      });
      if (!tanggal) { showAlert('Pilih tanggal terlebih dahulu!'); return; }
      if (lines.length < 2) { orig.apply(this, arguments); return; }

      if (typeof showOpSpinner === 'function') showOpSpinner('Menyimpan Jurnal Manual...', 'Memvalidasi & mengunggah');
      orig.apply(this, arguments);
      if (typeof window.currentCompany === 'undefined' || !window.currentCompany) {
        setTimeout(function() { if (typeof hideOpSpinner === 'function') hideOpSpinner(); }, 500);
      }
    };
  }

  // ── Jalankan semua wrap setelah DOM + semua script siap ───────
  function applyAllWraps() {
    wrapSimpanKas();
    wrapSimpanPenjualan();
    wrapSimpanPembelian();
    wrapSimpanManual();
    wrapSimpanAkun();
    wrapHapusAkun();
    wrapSimpanSaldoAwal();
    wrapSaveJurnalFromAI();
    wrapBuatJurnalPenutup();
    wrapBuatJurnalDariBankRow();
    wrapCreateCompany();
    wrapAccsUpdateProfile();
    wrapAccsUpdatePassword();
    wrapAccsLinkProvider();
    wrapAccsUnlinkProvider();
    wrapSaveKartuStock();
  }

  // Tunggu DOM siap, lalu terapkan setelah semua script dijalankan
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(applyAllWraps, 200);
    });
  } else {
    setTimeout(applyAllWraps, 200);
  }

})();

// ── 1. Service Worker ─────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then(reg => {
        // Check for updates
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              nw.postMessage('skipWaiting');
            }
          });
        });
        // Force update check
        reg.update();
      })
      .catch(err => console.warn('SW registration failed:', err));
  });
}

// ── 2. Install Prompt & handlePwaInstall ──────────────────────
let _pwaPrompt = null;
let _pwaInstalled = window.matchMedia('(display-mode: standalone)').matches
                  || window.navigator.standalone === true;

function updatePwaBtn() {
  const btn = document.getElementById('pwa-install-btn');
  const txt = document.getElementById('pwa-btn-text');
  if (!btn || !txt) return;
  if (_pwaInstalled) {
    btn.style.opacity = '0.45';
    btn.style.cursor = 'default';
    btn.style.animation = '';
    txt.textContent = 'Sudah Terinstall ✓';
  } else if (_pwaPrompt) {
    // SIAP install — highlight penuh
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
    btn.style.background = 'linear-gradient(135deg,rgba(74,222,128,0.25),rgba(34,211,238,0.25))';
    btn.style.borderColor = 'rgba(74,222,128,0.6)';
    btn.style.animation = 'pulseGlow 2s ease-in-out infinite';
    txt.textContent = 'Install — Siap!';
  } else {
    btn.style.opacity = '0.8';
    btn.style.cursor = 'pointer';
    btn.style.animation = '';
    txt.textContent = 'Install App';
  }
}
