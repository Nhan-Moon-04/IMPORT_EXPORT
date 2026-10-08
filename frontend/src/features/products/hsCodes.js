/**
 * HS Codes & Biểu Thuế — MISA AMIS UI Style
 * Sort, column customization, icon-only actions, full CRUD (local data)
 */
import { api, showToast, showConfirm } from "../../core/api.js";

// ─── State ────────────────────────────────────────────────────────────────────
let hsList     = [];
let filtered   = [];
let selectedId = null;
let sortCol    = null;
let sortDir    = 'asc';
let pageSize   = 50;
let pageCurrent = 1;

// ─── Column definitions ───────────────────────────────────────────────────────
const ALL_COLS = [
  { key: 'code',        label: 'Mã HS Code',          visible: true,  sortable: true  },
  { key: 'description', label: 'Mô Tả Hàng Hóa',     visible: true,  sortable: false },
  { key: 'importTax',   label: 'Thuế NK (%)',          visible: true,  sortable: true  },
  { key: 'prefTax',     label: 'NK Ưu Đãi (%)',        visible: true,  sortable: true  },
  { key: 'vat',         label: 'VAT (%)',              visible: true,  sortable: true  },
  { key: 'exciseTax',   label: 'Thuế Tiêu Thụ (%)',   visible: false, sortable: true  },
  { key: 'co',          label: 'C/O Yêu Cầu',         visible: true,  sortable: false },
  { key: 'notes',       label: 'Ghi Chú',             visible: false, sortable: false },
];
let columns = ALL_COLS.map(c => ({ ...c }));

// ─── Entry ────────────────────────────────────────────────────────────────────
export async function renderHsCodes(container) {
  selectedId  = null;
  sortCol     = null;
  sortDir     = 'asc';
  pageCurrent = 1;

  container.innerHTML = `
    <div class="amis-list-page">

      <!-- TOOLBAR -->
      <div class="amis-toolbar-wrap">
        <div class="amis-toolbar-left">
          <button id="btnHsAdd" class="amis-btn amis-btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Thêm mới
          </button>
          <button id="btnHsEdit" class="amis-btn amis-btn-ghost" disabled>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
            Sửa
          </button>
          <button id="btnHsDelete" class="amis-btn amis-btn-ghost amis-btn-danger-text" disabled>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Xóa
          </button>
          <div class="amis-btn-divider"></div>
          <button id="btnHsRefresh" class="amis-btn amis-btn-ghost">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Nạp lại
          </button>
        </div>
        <div class="amis-toolbar-right">
          <div class="amis-search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="hsSearchInput" placeholder="Tìm mã HS Code, mô tả hàng hóa...">
          </div>
          <div class="amis-col-picker-wrap" id="colPickerWrapHs">
            <button id="btnColPickerHs" class="amis-btn amis-btn-ghost amis-btn-icon-only" title="Tuỳ chỉnh cột">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
            <div class="amis-col-dropdown" id="colDropdownHs" style="display:none">
              <div class="col-dropdown-header">Tuỳ chỉnh cột hiển thị</div>
              <div class="col-dropdown-list" id="colCheckListHs"></div>
              <div class="col-dropdown-footer">
                <button class="amis-btn amis-btn-ghost amis-btn-xs" id="btnResetColsHs">Đặt lại</button>
                <button class="amis-btn amis-btn-primary amis-btn-xs" id="btnApplyColsHs">Áp dụng</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TABLE -->
      <div class="amis-table-container">
        <table class="amis-data-table" id="hsTable">
          <thead id="hsThead"></thead>
          <tbody id="hsTbody">
            <tr><td colspan="20" class="amis-table-empty">Đang tải dữ liệu...</td></tr>
          </tbody>
        </table>
      </div>

      <!-- FOOTER -->
      <div class="amis-table-footer">
        <div class="amis-table-info" id="hsPaginationText">Tổng số: 0 bản ghi</div>
        <div class="amis-pagination-controls" id="hsPaginationBtns"></div>
        <div class="amis-page-size-select">
          <span>Hiển thị</span>
          <select id="hsSizeSelect">
            <option value="25">25</option>
            <option value="50" selected>50</option>
            <option value="100">100</option>
          </select>
          <span>dòng/trang</span>
        </div>
      </div>
    </div>
  `;

  setupEvents();
  renderHeader();
  await loadData();
}

// ─── Data ─────────────────────────────────────────────────────────────────────
async function loadData() {
  // Static data (no backend endpoint yet)
  hsList = [
    {
      id: 'hs1', code: '5402.47.00',
      description: 'Các loại sợi dệt khác, bằng polyeste, dạng sợi đơn, không xoắn hoặc có độ xoắn không quá 50 vòng/mét (FDY, Semi Dull)',
      importTax: 12, prefTax: 0, vat: 8, exciseTax: 0,
      co: 'Form E, Form D',
      notes: 'Áp dụng cho FDY/DTY polyester nhập từ Trung Quốc / Đài Loan'
    },
    {
      id: 'hs2', code: '5402.33.00',
      description: 'Sợi dún, bằng polyeste (DTY — Drawn Textured Yarn)',
      importTax: 12, prefTax: 0, vat: 8, exciseTax: 0,
      co: 'Form E, Form D',
      notes: 'DTY polyester đàn hồi'
    },
    {
      id: 'hs3', code: '5509.51.00',
      description: 'Sợi (trừ chỉ khâu) chứa từ 85% trở lên tính theo trọng lượng là xơ staple tổng hợp',
      importTax: 5, prefTax: 0, vat: 8, exciseTax: 0,
      co: 'Form E',
      notes: ''
    },
    {
      id: 'hs4', code: '5205.11.00',
      description: 'Sợi bông (trừ chỉ khâu), chứa từ 85% trở lên tính theo trọng lượng là bông, chưa đóng gói để bán lẻ',
      importTax: 5, prefTax: 0, vat: 8, exciseTax: 0,
      co: 'Form D',
      notes: ''
    },
    {
      id: 'hs5', code: '5402.20.00',
      description: 'Sợi chỉ khâu bằng polyeste dạng sợi nhiều',
      importTax: 15, prefTax: 2, vat: 10, exciseTax: 0,
      co: 'Form E',
      notes: ''
    },
    {
      id: 'hs6', code: '5503.20.00',
      description: 'Xơ staple tổng hợp, chưa chải thô, chưa chải kỹ hoặc chưa gia công cách khác để kéo sợi, bằng polyeste',
      importTax: 0, prefTax: 0, vat: 8, exciseTax: 0,
      co: 'Form E, Form AK',
      notes: ''
    },
  ];
  applyFilterSort();
}

function applyFilterSort() {
  const q = (document.getElementById("hsSearchInput")?.value || '').toLowerCase().trim();
  filtered = hsList.filter(h =>
    h.code.toLowerCase().includes(q) ||
    h.description.toLowerCase().includes(q) ||
    (h.co || '').toLowerCase().includes(q)
  );

  if (sortCol) {
    filtered.sort((a, b) => {
      let va = a[sortCol]; let vb = b[sortCol];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1  : -1;
      return 0;
    });
  }

  pageCurrent = 1;
  renderTable();
  renderPagination();
}

// ─── Header ───────────────────────────────────────────────────────────────────
function renderHeader() {
  const thead = document.getElementById("hsThead");
  if (!thead) return;
  const visCols = columns.filter(c => c.visible);
  const numKeys = ['importTax', 'prefTax', 'vat', 'exciseTax'];

  thead.innerHTML = `
    <tr>
      <th class="amis-th-check"><input type="checkbox" id="checkAllHs" title="Chọn tất cả"></th>
      ${visCols.map(col => `
        <th class="amis-th${col.sortable ? ' sortable' : ''}" data-col="${col.key}"
            style="${numKeys.includes(col.key) ? 'text-align:right' : ''}">
          <div class="amis-th-inner${numKeys.includes(col.key) ? ' justify-end' : ''}">
            <span>${col.label}</span>
            ${col.sortable ? `<span class="sort-icon${sortCol === col.key ? (sortDir === 'asc' ? ' asc' : ' desc') : ''}">${sortSVG(col.key)}</span>` : ''}
          </div>
        </th>`).join('')}
      <th class="amis-th-actions">Thao tác</th>
    </tr>
  `;

  thead.querySelectorAll("th.sortable").forEach(th => {
    th.addEventListener("click", () => {
      const col = th.dataset.col;
      if (sortCol === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      else { sortCol = col; sortDir = 'asc'; }
      renderHeader();
      applyFilterSort();
    });
  });

  document.getElementById("checkAllHs")?.addEventListener("change", e => {
    getPageItems().forEach(h => {
      if (e.target.checked) selectedIds.add(h.id);
      else selectedIds.delete(h.id);
    });
    renderTable();
    updateToolbar();
  });
}

function sortSVG(col) {
  if (sortCol !== col) return `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 15l5 5 5-5"/><path d="M7 9l5-5 5 5"/></svg>`;
  if (sortDir === 'asc') return `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5l-7 7h14z" fill="currentColor" stroke="none"/></svg>`;
  return `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 19l7-7H5z" fill="currentColor" stroke="none"/></svg>`;
}

// ─── Table ────────────────────────────────────────────────────────────────────
// Use a Set for multi-select support
const selectedIds = new Set();

function getPageItems() {
  const start = (pageCurrent - 1) * pageSize;
  return filtered.slice(start, start + pageSize);
}

function renderTable() {
  const tbody = document.getElementById("hsTbody");
  if (!tbody) return;
  const visCols  = columns.filter(c => c.visible);
  const numKeys  = ['importTax', 'prefTax', 'vat', 'exciseTax'];
  const items    = getPageItems();
  const total    = filtered.length;

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${visCols.length + 2}" class="amis-table-empty">Không tìm thấy mã HS Code nào phù hợp.</td></tr>`;
    document.getElementById("hsPaginationText").textContent = "Tổng số: 0 bản ghi";
    return;
  }

  tbody.innerHTML = items.map(h => {
    const isSelected = selectedId === h.id;
    const cells = visCols.map(col => {
      const val = h[col.key];
      switch (col.key) {
        case 'code':
          return `<td><strong class="hs-code-badge">${h.code}</strong></td>`;
        case 'description':
          return `<td class="hs-td-desc">${h.description}</td>`;
        case 'importTax':
          return `<td style="text-align:right">${taxBadge(val, 'default')}</td>`;
        case 'prefTax':
          return `<td style="text-align:right">${taxBadge(val, 'pref')}</td>`;
        case 'vat':
          return `<td style="text-align:right">${taxBadge(val, 'vat')}</td>`;
        case 'exciseTax':
          return `<td style="text-align:right">${taxBadge(val, 'excise')}</td>`;
        case 'co':
          return `<td>${h.co ? coTags(h.co) : '<span class="amis-td-muted">—</span>'}</td>`;
        case 'notes':
          return `<td class="amis-td-notes">${h.notes || ''}</td>`;
        default:
          return `<td></td>`;
      }
    }).join('');

    return `
      <tr data-id="${h.id}" class="${isSelected ? 'amis-row-selected' : ''}">
        <td class="amis-td-check">
          <input type="checkbox" class="row-checkbox" value="${h.id}" ${isSelected ? 'checked' : ''}>
        </td>
        ${cells}
        <td class="amis-td-actions">
          <div class="amis-row-actions">
            <button class="amis-icon-btn" onclick="window.xnkEditHs('${h.id}')" title="Sửa">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
            </button>
            <button class="amis-icon-btn amis-icon-btn-danger" onclick="window.xnkDeleteHs('${h.id}')" title="Xóa">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  const end = Math.min(pageCurrent * pageSize, total);
  document.getElementById("hsPaginationText").textContent =
    `Tổng số: ${total} bản ghi${total > 0 ? ` · Hiển thị ${(pageCurrent - 1) * pageSize + 1}–${end}` : ''}`;

  // Row click → select
  tbody.querySelectorAll("tr[data-id]").forEach(tr => {
    tr.addEventListener("click", e => {
      if (e.target.closest("button") || e.target.type === 'checkbox') return;
      const id = tr.dataset.id;
      selectedId = selectedId === id ? null : id;
      renderTable();
      updateToolbar();
    });
  });

  // Checkbox
  tbody.querySelectorAll(".row-checkbox").forEach(cb => {
    cb.addEventListener("change", e => {
      e.stopPropagation();
      selectedId = cb.checked ? cb.value : null;
      tr?.classList.toggle("amis-row-selected", cb.checked);
      updateToolbar();
    });
  });
}

// ─── Tax / C/O Helpers ────────────────────────────────────────────────────────
function taxBadge(val, type) {
  if (val === undefined || val === null) return '—';
  const pct = `${val}%`;
  if (type === 'pref')   return `<span class="hs-tax-pref">${pct}</span>`;
  if (type === 'vat')    return `<span class="hs-tax-vat">${pct}</span>`;
  if (type === 'excise') return val > 0 ? `<span class="hs-tax-excise">${pct}</span>` : `<span class="amis-td-muted">0%</span>`;
  // default (importTax)
  return val === 0 ? `<span class="hs-tax-free">0%</span>` : `<span class="hs-tax-import">${pct}</span>`;
}

function coTags(co) {
  return co.split(',').map(s => s.trim()).filter(Boolean)
    .map(f => `<span class="hs-co-tag hs-co-${f.toLowerCase().replace(/[^a-z]/g,'')}">${f}</span>`)
    .join(' ');
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function renderPagination() {
  const ctrl  = document.getElementById("hsPaginationBtns");
  if (!ctrl) return;
  const total = filtered.length;
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) { ctrl.innerHTML = ''; return; }

  const range = pRange(pageCurrent, pages);
  let html = `<button class="amis-pg-btn" data-page="${pageCurrent - 1}" ${pageCurrent === 1 ? 'disabled' : ''}>‹</button>`;
  range.forEach(p => {
    if (p === '…') html += `<span class="amis-pg-ellipsis">…</span>`;
    else html += `<button class="amis-pg-btn${p === pageCurrent ? ' active' : ''}" data-page="${p}">${p}</button>`;
  });
  html += `<button class="amis-pg-btn" data-page="${pageCurrent + 1}" ${pageCurrent === pages ? 'disabled' : ''}>›</button>`;
  ctrl.innerHTML = html;

  ctrl.querySelectorAll("[data-page]").forEach(btn => {
    btn.addEventListener("click", () => { pageCurrent = +btn.dataset.page; renderTable(); renderPagination(); });
  });
}

function pRange(cur, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (cur <= 4)   return [1,2,3,4,5,'…',total];
  if (cur >= total - 3) return [1,'…',total-4,total-3,total-2,total-1,total];
  return [1,'…',cur-1,cur,cur+1,'…',total];
}

function updateToolbar() {
  const has = !!selectedId;
  document.getElementById("btnHsEdit")?.toggleAttribute("disabled", !has);
  document.getElementById("btnHsDelete")?.toggleAttribute("disabled", !has);
}

// ─── Column picker ────────────────────────────────────────────────────────────
function openColPicker() {
  const list = document.getElementById("colCheckListHs");
  if (!list) return;
  list.innerHTML = columns.map((col, i) => `
    <label class="col-check-row">
      <input type="checkbox" data-idx="${i}" ${col.visible ? 'checked' : ''}>
      <span>${col.label}</span>
    </label>`).join('');
}

// ─── Events ───────────────────────────────────────────────────────────────────
function setupEvents() {
  document.getElementById("btnHsRefresh")?.addEventListener("click", loadData);
  document.getElementById("btnHsAdd")?.addEventListener("click", () => openHsForm(null));
  document.getElementById("btnHsEdit")?.addEventListener("click", () => { if (selectedId) openHsForm(selectedId); });
  document.getElementById("btnHsDelete")?.addEventListener("click", () => { if (selectedId) deleteHs(selectedId); });

  document.getElementById("hsSearchInput")?.addEventListener("input", () => applyFilterSort());

  document.getElementById("hsSizeSelect")?.addEventListener("change", e => {
    pageSize = +e.target.value; pageCurrent = 1; renderTable(); renderPagination();
  });

  // Column picker toggle
  const btnCol  = document.getElementById("btnColPickerHs");
  const colDrop = document.getElementById("colDropdownHs");
  btnCol?.addEventListener("click", e => {
    e.stopPropagation();
    const open = colDrop.style.display !== 'none';
    colDrop.style.display = open ? 'none' : 'block';
    if (!open) openColPicker();
  });

  document.addEventListener("click", e => {
    if (!document.getElementById("colPickerWrapHs")?.contains(e.target))
      if (colDrop) colDrop.style.display = 'none';
  });

  document.getElementById("btnApplyColsHs")?.addEventListener("click", () => {
    document.querySelectorAll("#colCheckListHs input[type=checkbox]").forEach(cb => {
      columns[+cb.dataset.idx].visible = cb.checked;
    });
    if (colDrop) colDrop.style.display = 'none';
    renderHeader(); renderTable();
  });

  document.getElementById("btnResetColsHs")?.addEventListener("click", () => {
    columns = ALL_COLS.map(c => ({ ...c })); openColPicker();
  });

  window.xnkEditHs   = (id) => openHsForm(id);
  window.xnkDeleteHs = (id) => deleteHs(id);
}

// ─── CRUD: Form modal ─────────────────────────────────────────────────────────
function openHsForm(id) {
  const item   = id ? hsList.find(x => x.id === id) : null;
  const isEdit = !!item;

  const title  = document.getElementById("modalTitle");
  const tabs   = document.getElementById("modalTabs");
  const body   = document.getElementById("modalBody");
  const footer = document.getElementById("modalFooter");

  title.innerHTML = isEdit
    ? `Chỉnh sửa Mã HS: <strong>${item.code}</strong>`
    : `Thêm mới Mã HS Code`;
  tabs.style.display = "none";

  body.innerHTML = `
    <form id="hsForm" autocomplete="off">
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label required">Mã HS Code</label>
          <input type="text" id="fhCode" class="form-input" required
            value="${item?.code || ''}" placeholder="VD: 5402.47.00">
        </div>
        <div class="form-group">
          <label class="form-label">C/O Yêu Cầu</label>
          <input type="text" id="fhCo" class="form-input"
            value="${item?.co || ''}" placeholder="VD: Form E, Form D, Form AK">
        </div>
      </div>

      <div class="form-group" style="margin-bottom:12px">
        <label class="form-label required">Mô Tả Hàng Hóa</label>
        <textarea id="fhDesc" class="form-textarea" required rows="3"
          placeholder="Mô tả chi tiết theo biểu thuế XNK Việt Nam">${item?.description || ''}</textarea>
      </div>

      <div class="hs-tax-grid">
        <div class="hs-tax-card hs-tax-card-blue">
          <div class="hs-tax-card-label">Thuế Nhập Khẩu</div>
          <div class="hs-tax-card-field">
            <input type="number" step="0.1" min="0" max="100" id="fhImport" class="form-input"
              required value="${item?.importTax ?? 12}">
            <span class="hs-pct-unit">%</span>
          </div>
        </div>
        <div class="hs-tax-card hs-tax-card-green">
          <div class="hs-tax-card-label">NK Ưu Đãi (MFN / FTA)</div>
          <div class="hs-tax-card-field">
            <input type="number" step="0.1" min="0" max="100" id="fhPref" class="form-input"
              required value="${item?.prefTax ?? 0}">
            <span class="hs-pct-unit">%</span>
          </div>
        </div>
        <div class="hs-tax-card hs-tax-card-orange">
          <div class="hs-tax-card-label">Thuế VAT</div>
          <div class="hs-tax-card-field">
            <input type="number" step="0.1" min="0" max="100" id="fhVat" class="form-input"
              required value="${item?.vat ?? 8}">
            <span class="hs-pct-unit">%</span>
          </div>
        </div>
        <div class="hs-tax-card hs-tax-card-purple">
          <div class="hs-tax-card-label">Thuế Tiêu Thụ Đặc Biệt</div>
          <div class="hs-tax-card-field">
            <input type="number" step="0.1" min="0" max="100" id="fhExcise" class="form-input"
              value="${item?.exciseTax ?? 0}">
            <span class="hs-pct-unit">%</span>
          </div>
        </div>
      </div>

      <div class="form-group" style="margin-top:12px">
        <label class="form-label">Ghi Chú</label>
        <input type="text" id="fhNotes" class="form-input"
          value="${item?.notes || ''}" placeholder="Ghi chú thêm về mã HS này">
      </div>
    </form>
  `;

  footer.innerHTML = `
    <button type="button" class="btn btn-default" onclick="window.closeGlobalModal()">Hủy</button>
    <button type="button" id="btnSaveHs" class="btn btn-primary">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      Lưu
    </button>
  `;

  document.getElementById("btnSaveHs").onclick = () => {
    const code = document.getElementById("fhCode").value.trim();
    const desc = document.getElementById("fhDesc").value.trim();
    if (!code || !desc) { showToast("Vui lòng điền đủ Mã HS và Mô tả", "error"); return; }

    const entry = {
      code,
      description: desc,
      importTax:  parseFloat(document.getElementById("fhImport").value) || 0,
      prefTax:    parseFloat(document.getElementById("fhPref").value)   || 0,
      vat:        parseFloat(document.getElementById("fhVat").value)    || 0,
      exciseTax:  parseFloat(document.getElementById("fhExcise").value) || 0,
      co:         document.getElementById("fhCo").value.trim(),
      notes:      document.getElementById("fhNotes").value.trim(),
    };

    if (isEdit) {
      Object.assign(item, entry);
      showToast("Đã cập nhật biểu thuế thành công!", "success");
    } else {
      hsList.unshift({ id: 'hs' + Date.now(), ...entry });
      showToast("Đã thêm mã HS mới thành công!", "success");
    }

    window.closeGlobalModal();
    applyFilterSort();
  };

  window.openModal();
}

// ─── Delete ───────────────────────────────────────────────────────────────────
async function deleteHs(id) {
  const h = hsList.find(x => x.id === id);
  const ok = await showConfirm({
    title: 'Xóa Mã HS Code',
    message: 'Bạn có chắc muốn xóa mã HS này không?',
    highlight: h?.code || id,
    type: 'danger',
    confirmText: 'Xóa',
  });
  if (!ok) return;

  hsList = hsList.filter(x => x.id !== id);
  selectedId = null;
  showToast("Đã xóa mã HS thành công!", "success");
  applyFilterSort();
  updateToolbar();
}
