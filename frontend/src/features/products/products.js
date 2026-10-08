/**
 * Products Feature Module — MISA AMIS UI Style
 * Sortable columns, column customisation, icon-only row actions, full CRUD
 */
import { api, showToast, showConfirm } from "../../core/api.js";

// ─── State ───────────────────────────────────────────────────────────────────
let productsList   = [];   // full list from server
let filteredList   = [];   // after search filter
let selectedIds    = new Set(); // multi-select
let sortCol        = null;
let sortDir        = 'asc'; // 'asc' | 'desc'

// ─── Column definitions ───────────────────────────────────────────────────────
const ALL_COLUMNS = [
  { key: 'sku',          label: 'Mã SKU',            visible: true,  sortable: true  },
  { key: 'name',         label: 'Tên Hàng Hóa',      visible: true,  sortable: true  },
  { key: 'spec',         label: 'Quy Cách Sợi',       visible: true,  sortable: false },
  { key: 'productGroup', label: 'Nhóm Hàng',          visible: true,  sortable: true  },
  { key: 'hsCode',       label: 'Mã HS Code',         visible: true,  sortable: true  },
  { key: 'unit',         label: 'Đơn Vị',             visible: true,  sortable: false },
  { key: 'countryOfOrigin', label: 'Nước Xuất Xứ',   visible: true,  sortable: true  },
  { key: 'manufacturer', label: 'Nhà Sản Xuất',       visible: false, sortable: true  },
  { key: 'notes',        label: 'Ghi Chú',            visible: false, sortable: false },
];

let columns = ALL_COLUMNS.map(c => ({ ...c }));

// ─── Pagination ───────────────────────────────────────────────────────────────
let pageSize   = 50;
let pageCurrent = 1;

// ─── Render entry ─────────────────────────────────────────────────────────────
export async function renderProducts(container) {
  selectedIds.clear();
  sortCol  = null;
  sortDir  = 'asc';
  pageCurrent = 1;

  container.innerHTML = `
    <div class="amis-list-page">
      <!-- TOOLBAR -->
      <div class="amis-toolbar-wrap">
        <div class="amis-toolbar-left">
          <button id="btnProductAdd" class="amis-btn amis-btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Thêm mới
          </button>
          <button id="btnProductEdit" class="amis-btn amis-btn-ghost" disabled>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
            Sửa
          </button>
          <button id="btnProductDelete" class="amis-btn amis-btn-ghost amis-btn-danger-text" disabled>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Xóa
          </button>
          <div class="amis-btn-divider"></div>
          <button id="btnProductHistory" class="amis-btn amis-btn-ghost" disabled>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Lịch sử Mua/Bán
          </button>
          <button id="btnProductRefresh" class="amis-btn amis-btn-ghost">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Nạp lại
          </button>
        </div>
        <div class="amis-toolbar-right">
          <div class="amis-search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="productSearchInput" placeholder="Lọc theo SKU, tên sợi, HS Code...">
          </div>
          <div class="amis-col-picker-wrap" id="colPickerWrap">
            <button id="btnColPicker" class="amis-btn amis-btn-ghost amis-btn-icon-only" title="Tuỳ chỉnh cột hiển thị">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
            <div class="amis-col-dropdown" id="colDropdown" style="display:none">
              <div class="col-dropdown-header">Tuỳ chỉnh cột hiển thị</div>
              <div class="col-dropdown-list" id="colCheckList"></div>
              <div class="col-dropdown-footer">
                <button class="amis-btn amis-btn-ghost amis-btn-xs" id="btnResetCols">Đặt lại</button>
                <button class="amis-btn amis-btn-primary amis-btn-xs" id="btnApplyCols">Áp dụng</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TABLE -->
      <div class="amis-table-container">
        <table class="amis-data-table" id="productsTable">
          <thead id="productsThead"></thead>
          <tbody id="productsTbody">
            <tr><td colspan="20" class="amis-table-empty">Đang tải danh mục...</td></tr>
          </tbody>
        </table>
      </div>

      <!-- FOOTER / PAGINATION -->
      <div class="amis-table-footer">
        <div class="amis-table-info" id="productPaginationText">Tổng số: 0 bản ghi</div>
        <div class="amis-pagination-controls" id="paginationControls"></div>
        <div class="amis-page-size-select">
          <span>Hiển thị</span>
          <select id="pageSizeSelect">
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
  renderColumnHeader();
  await loadProductsData();
}

// ─── Load & refresh ───────────────────────────────────────────────────────────
async function loadProductsData() {
  try {
    const res = await api.get("/api/products?pageSize=500");
    productsList = res.data.items;
    applyFilterAndSort();
  } catch (_) {}
}

function applyFilterAndSort() {
  const q = (document.getElementById("productSearchInput")?.value || "").toLowerCase().trim();

  filteredList = productsList.filter(p =>
    (p.sku?.toLowerCase().includes(q)) ||
    (p.name?.toLowerCase().includes(q)) ||
    (p.hsCode?.toLowerCase().includes(q)) ||
    (p.productGroup?.toLowerCase().includes(q))
  );

  if (sortCol) {
    filteredList.sort((a, b) => {
      let va = getCellValue(a, sortCol);
      let vb = getCellValue(b, sortCol);
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  pageCurrent = 1;
  renderTable();
  renderPagination();
  updateToolbarState();
}

function getCellValue(p, colKey) {
  const s = p.specification || {};
  switch (colKey) {
    case 'sku':             return p.sku || '';
    case 'name':            return p.name || '';
    case 'spec':            return `${s.yarnType || ''} ${s.denierCount || ''}`;
    case 'productGroup':    return p.productGroup || '';
    case 'hsCode':          return p.hsCode || '';
    case 'unit':            return p.unit || '';
    case 'countryOfOrigin': return p.countryOfOrigin || '';
    case 'manufacturer':    return p.manufacturer || '';
    case 'notes':           return p.notes || '';
    default:                return '';
  }
}

// ─── Render table header ──────────────────────────────────────────────────────
function renderColumnHeader() {
  const thead = document.getElementById("productsThead");
  if (!thead) return;

  const visibleCols = columns.filter(c => c.visible);

  thead.innerHTML = `
    <tr>
      <th class="amis-th-check">
        <input type="checkbox" id="checkAllProducts" title="Chọn tất cả">
      </th>
      ${visibleCols.map(col => `
        <th class="amis-th${col.sortable ? ' sortable' : ''}" data-col="${col.key}">
          <div class="amis-th-inner">
            <span>${col.label}</span>
            ${col.sortable ? `<span class="sort-icon${sortCol === col.key ? (sortDir === 'asc' ? ' asc' : ' desc') : ''}">${getSortSVG(col.key)}</span>` : ''}
          </div>
        </th>
      `).join('')}
      <th class="amis-th-actions">Thao tác</th>
    </tr>
  `;

  // Sort click handlers
  thead.querySelectorAll("th.sortable").forEach(th => {
    th.addEventListener("click", () => {
      const col = th.dataset.col;
      if (sortCol === col) {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        sortCol = col;
        sortDir = 'asc';
      }
      renderColumnHeader();
      renderTable();
    });
  });

  // Check-all
  document.getElementById("checkAllProducts")?.addEventListener("change", (e) => {
    const pageItems = getCurrentPageItems();
    if (e.target.checked) {
      pageItems.forEach(p => selectedIds.add(p.id));
    } else {
      pageItems.forEach(p => selectedIds.delete(p.id));
    }
    renderTable();
    updateToolbarState();
  });
}

function getSortSVG(col) {
  if (sortCol !== col) {
    return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 15l5 5 5-5"/><path d="M7 9l5-5 5 5"/></svg>`;
  }
  if (sortDir === 'asc') {
    return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5l-7 7h14z" fill="currentColor" stroke="none"/></svg>`;
  }
  return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 19l7-7H5z" fill="currentColor" stroke="none"/></svg>`;
}

// ─── Render table body ────────────────────────────────────────────────────────
function renderTable() {
  const tbody = document.getElementById("productsTbody");
  if (!tbody) return;

  const items = getCurrentPageItems();
  const visibleCols = columns.filter(c => c.visible);

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${visibleCols.length + 2}" class="amis-table-empty">Không tìm thấy sản phẩm nào.</td></tr>`;
    document.getElementById("productPaginationText").textContent = "Tổng số: 0 bản ghi";
    return;
  }

  tbody.innerHTML = items.map(p => {
    const s = p.specification || {};
    const specStr = s.yarnType
      ? `${s.yarnType}${s.denierCount ? ' ' + s.denierCount : ''}${s.filamentCount ? '/' + s.filamentCount + 'F' : ''}${s.sDorTBR ? ' ' + s.sDorTBR : ''}`
      : '-';
    const isSelected = selectedIds.has(p.id);

    const cells = visibleCols.map(col => {
      switch (col.key) {
        case 'sku':          return `<td><strong class="amis-sku-badge">${p.sku}</strong></td>`;
        case 'name':         return `<td class="amis-td-name">${p.name}</td>`;
        case 'spec':         return `<td><span class="amis-spec-text">${specStr}</span></td>`;
        case 'productGroup': return `<td>${p.productGroup ? `<span class="amis-group-tag">${p.productGroup}</span>` : '<span class="amis-td-muted">—</span>'}</td>`;
        case 'hsCode':       return `<td><code class="amis-code">${p.hsCode || '—'}</code></td>`;
        case 'unit':         return `<td>${p.unit || 'kg'}</td>`;
        case 'countryOfOrigin': return `<td>${p.countryOfOrigin || '<span class="amis-td-muted">—</span>'}</td>`;
        case 'manufacturer': return `<td>${p.manufacturer || '<span class="amis-td-muted">—</span>'}</td>`;
        case 'notes':        return `<td class="amis-td-notes">${p.notes || ''}</td>`;
        default:             return `<td></td>`;
      }
    }).join('');

    return `
      <tr data-id="${p.id}" class="${isSelected ? 'amis-row-selected' : ''}">
        <td class="amis-td-check">
          <input type="checkbox" class="row-checkbox" value="${p.id}" ${isSelected ? 'checked' : ''}>
        </td>
        ${cells}
        <td class="amis-td-actions">
          <div class="amis-row-actions">
            <button class="amis-icon-btn" onclick="window.xnkViewHistory('${p.id}')" title="Xem lịch sử">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </button>
            <button class="amis-icon-btn" onclick="window.xnkEditProduct('${p.id}')" title="Sửa">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
            </button>
            <button class="amis-icon-btn amis-icon-btn-danger" onclick="window.xnkDeleteProduct('${p.id}')" title="Xóa">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  const total = filteredList.length;
  const start = (pageCurrent - 1) * pageSize + 1;
  const end   = Math.min(pageCurrent * pageSize, total);
  document.getElementById("productPaginationText").textContent =
    `Tổng số: ${total} bản ghi${total > 0 ? ` · Đang hiển thị ${start}–${end}` : ''}`;

  // Row click → single select
  tbody.querySelectorAll("tr[data-id]").forEach(tr => {
    tr.addEventListener("click", (e) => {
      if (e.target.closest("button") || e.target.type === 'checkbox') return;
      const id = tr.dataset.id;
      toggleSelect(id);
    });
  });

  // Checkbox per row
  tbody.querySelectorAll(".row-checkbox").forEach(cb => {
    cb.addEventListener("change", (e) => {
      e.stopPropagation();
      const id = cb.value;
      if (cb.checked) selectedIds.add(id);
      else selectedIds.delete(id);
      const tr = cb.closest("tr");
      tr?.classList.toggle("amis-row-selected", cb.checked);
      updateToolbarState();
      syncCheckAll();
    });
  });
}

function getCurrentPageItems() {
  const start = (pageCurrent - 1) * pageSize;
  return filteredList.slice(start, start + pageSize);
}

function toggleSelect(id) {
  if (selectedIds.has(id)) {
    selectedIds.delete(id);
  } else {
    // Single select: clear others, then select
    selectedIds.clear();
    selectedIds.add(id);
  }
  renderTable();
  updateToolbarState();
  syncCheckAll();
}

function syncCheckAll() {
  const chk = document.getElementById("checkAllProducts");
  if (!chk) return;
  const pageItems = getCurrentPageItems();
  chk.checked = pageItems.length > 0 && pageItems.every(p => selectedIds.has(p.id));
  chk.indeterminate = !chk.checked && pageItems.some(p => selectedIds.has(p.id));
}

function updateToolbarState() {
  const hasOne  = selectedIds.size >= 1;
  document.getElementById("btnProductEdit")?.toggleAttribute("disabled", !hasOne);
  document.getElementById("btnProductDelete")?.toggleAttribute("disabled", !hasOne);
  document.getElementById("btnProductHistory")?.toggleAttribute("disabled", !hasOne);
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function renderPagination() {
  const ctrl = document.getElementById("paginationControls");
  if (!ctrl) return;

  const total = filteredList.length;
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) { ctrl.innerHTML = ''; return; }

  let html = `<button class="amis-pg-btn" data-page="${pageCurrent - 1}" ${pageCurrent === 1 ? 'disabled' : ''}>‹</button>`;

  const range = paginationRange(pageCurrent, pages);
  range.forEach(p => {
    if (p === '…') {
      html += `<span class="amis-pg-ellipsis">…</span>`;
    } else {
      html += `<button class="amis-pg-btn${p === pageCurrent ? ' active' : ''}" data-page="${p}">${p}</button>`;
    }
  });

  html += `<button class="amis-pg-btn" data-page="${pageCurrent + 1}" ${pageCurrent === pages ? 'disabled' : ''}>›</button>`;
  ctrl.innerHTML = html;

  ctrl.querySelectorAll("[data-page]").forEach(btn => {
    btn.addEventListener("click", () => {
      pageCurrent = parseInt(btn.dataset.page);
      renderTable();
      renderPagination();
    });
  });
}

function paginationRange(cur, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (cur <= 4)   return [1, 2, 3, 4, 5, '…', total];
  if (cur >= total - 3) return [1, '…', total-4, total-3, total-2, total-1, total];
  return [1, '…', cur - 1, cur, cur + 1, '…', total];
}

// ─── Column picker ────────────────────────────────────────────────────────────
function openColPicker() {
  const list = document.getElementById("colCheckList");
  if (!list) return;
  list.innerHTML = columns.map((col, i) => `
    <label class="col-check-row">
      <input type="checkbox" data-idx="${i}" ${col.visible ? 'checked' : ''}>
      <span>${col.label}</span>
    </label>
  `).join('');
}

// ─── Event setup ─────────────────────────────────────────────────────────────
function setupEvents() {
  document.getElementById("btnProductRefresh")?.addEventListener("click", loadProductsData);

  document.getElementById("btnProductAdd")?.addEventListener("click", () => openProductForm(null));

  document.getElementById("btnProductEdit")?.addEventListener("click", () => {
    const id = [...selectedIds][0];
    if (id) openProductForm(id);
  });

  document.getElementById("btnProductDelete")?.addEventListener("click", () => {
    const id = [...selectedIds][0];
    if (id) deleteProduct(id);
  });

  document.getElementById("btnProductHistory")?.addEventListener("click", () => {
    const id = [...selectedIds][0];
    if (id) viewHistory(id);
  });

  document.getElementById("productSearchInput")?.addEventListener("input", () => applyFilterAndSort());

  // Page size
  document.getElementById("pageSizeSelect")?.addEventListener("change", (e) => {
    pageSize = parseInt(e.target.value);
    pageCurrent = 1;
    renderTable();
    renderPagination();
  });

  // Column picker toggle
  const btnColPicker = document.getElementById("btnColPicker");
  const colDropdown  = document.getElementById("colDropdown");
  btnColPicker?.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = colDropdown.style.display !== 'none';
    colDropdown.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) openColPicker();
  });

  document.addEventListener("click", (e) => {
    if (!document.getElementById("colPickerWrap")?.contains(e.target)) {
      if (colDropdown) colDropdown.style.display = 'none';
    }
  });

  document.getElementById("btnApplyCols")?.addEventListener("click", () => {
    document.querySelectorAll("#colCheckList input[type=checkbox]").forEach(cb => {
      columns[parseInt(cb.dataset.idx)].visible = cb.checked;
    });
    colDropdown.style.display = 'none';
    renderColumnHeader();
    renderTable();
  });

  document.getElementById("btnResetCols")?.addEventListener("click", () => {
    columns = ALL_COLUMNS.map(c => ({ ...c }));
    openColPicker();
  });

  // Global row-action helpers
  window.xnkViewHistory   = (id) => viewHistory(id);
  window.xnkEditProduct   = (id) => openProductForm(id);
  window.xnkDeleteProduct = (id) => deleteProduct(id);
}

// ─── CRUD: Form modal ─────────────────────────────────────────────────────────
async function openProductForm(id) {
  let p = null;
  if (id) {
    p = productsList.find(x => x.id === id);
    if (!p) {
      const res = await api.get(`/api/products/${id}`);
      p = res.data;
    }
  }

  const isEdit = !!p;
  const spec   = p?.specification || {};

  window.openModal();

  const title  = document.getElementById("modalTitle");
  const tabs   = document.getElementById("modalTabs");
  const body   = document.getElementById("modalBody");
  const footer = document.getElementById("modalFooter");

  title.innerHTML = isEdit
    ? `Sửa Mặt Hàng: <strong>${p.sku}</strong>`
    : `Thêm Mới Mặt Hàng / Sợi Dệt`;

  tabs.style.display = "flex";
  tabs.innerHTML = `
    <button class="modal-tab-btn active" onclick="window.switchFormTab('tabGeneral')">1. Thông tin chung</button>
    <button class="modal-tab-btn"        onclick="window.switchFormTab('tabSpec')">2. Thông số kỹ thuật sợi</button>
  `;

  body.innerHTML = `
    <form id="productModalForm" autocomplete="off">
      <!-- TAB 1 -->
      <div id="tabGeneral">
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label required">Mã SKU / Mã Sản Phẩm</label>
            <input type="text" id="pSku" class="form-input" required value="${p?.sku || ''}" placeholder="VD: YARN-FDY-10036">
          </div>
          <div class="form-group">
            <label class="form-label required">Tên Hàng Hóa</label>
            <input type="text" id="pName" class="form-input" required value="${p?.name || ''}" placeholder="VD: Sợi Polyester FDY 100D/36F Semi Dull">
          </div>
        </div>
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label">Tên Tiếng Anh</label>
            <input type="text" id="pNameEn" class="form-input" value="${p?.nameEn || ''}" placeholder="Polyester Fully Drawn Yarn 100D/36F">
          </div>
          <div class="form-group">
            <label class="form-label">Nhóm Hàng Hóa</label>
            <input type="text" id="pGroup" class="form-input" value="${p?.productGroup || ''}" placeholder="VD: Sợi dệt thoi">
          </div>
        </div>
        <div class="form-row-3">
          <div class="form-group">
            <label class="form-label">Mã HS Code</label>
            <input type="text" id="pHsCode" class="form-input" value="${p?.hsCode || '5402.47.00'}">
          </div>
          <div class="form-group">
            <label class="form-label required">Đơn Vị Tính</label>
            <input type="text" id="pUnit" class="form-input" required value="${p?.unit || 'kg'}">
          </div>
          <div class="form-group">
            <label class="form-label">Nước Xuất Xứ</label>
            <input type="text" id="pOrigin" class="form-input" value="${p?.countryOfOrigin || 'Taiwan'}">
          </div>
        </div>
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label">Nhà Sản Xuất</label>
            <input type="text" id="pManufacturer" class="form-input" value="${p?.manufacturer || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Ghi Chú</label>
            <input type="text" id="pNotes" class="form-input" value="${p?.notes || ''}">
          </div>
        </div>
      </div>

      <!-- TAB 2 -->
      <div id="tabSpec" style="display:none">
        <div class="form-row-3">
          <div class="form-group">
            <label class="form-label">Loại Sợi (Yarn Type)</label>
            <select id="pYarnType" class="form-select">
              <option value="FDY"  ${spec.yarnType === 'FDY'  ? 'selected' : ''}>FDY – Fully Drawn Yarn</option>
              <option value="DTY"  ${spec.yarnType === 'DTY'  ? 'selected' : ''}>DTY – Drawn Textured Yarn</option>
              <option value="POY"  ${spec.yarnType === 'POY'  ? 'selected' : ''}>POY – Partially Oriented Yarn</option>
              <option value="PHTY" ${spec.yarnType === 'PHTY' ? 'selected' : ''}>PHTY</option>
              <option value="Khac" ${spec.yarnType === 'Khac' ? 'selected' : ''}>Khác</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Chỉ số Denier</label>
            <input type="text" id="pDenier" class="form-input" value="${spec.denierCount || ''}" placeholder="100D, 150D">
          </div>
          <div class="form-group">
            <label class="form-label">Số Filament</label>
            <input type="number" id="pFilament" class="form-input" value="${spec.filamentCount || ''}" placeholder="36, 48, 72">
          </div>
        </div>
        <div class="form-row-3">
          <div class="form-group">
            <label class="form-label">Độ bóng / Quang học</label>
            <select id="pSdOrTbr" class="form-select">
              <option value="Semi Dull (SD)"   ${spec.sDorTBR?.includes('Semi Dull')  ? 'selected' : ''}>Semi Dull (SD – Bán mờ)</option>
              <option value="Bright (BR)"       ${spec.sDorTBR?.includes('Bright')     ? 'selected' : ''}>Bright (BR – Bóng)</option>
              <option value="Full Dull (FD)"    ${spec.sDorTBR?.includes('Full Dull')  ? 'selected' : ''}>Full Dull (FD – Mờ hoàn toàn)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Màu sắc</label>
            <input type="text" id="pColor" class="form-input" value="${spec.color || 'Raw White'}">
          </div>
          <div class="form-group">
            <label class="form-label">Độ xoắn TPM</label>
            <input type="text" id="pTpm" class="form-input" value="${spec.tpm || '0'}">
          </div>
        </div>
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label">Quy cách đóng gói</label>
            <input type="text" id="pPackaging" class="form-input" value="${spec.packagingType || 'Carton (6 bobbins/carton)'}">
          </div>
          <div class="form-group">
            <label class="form-label">Trọng lượng mỗi cone/bobin (kg)</label>
            <input type="number" step="0.01" id="pWeightUnit" class="form-input" value="${spec.weightPerUnit || '5.25'}">
          </div>
        </div>
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label">Tiêu chuẩn chất lượng</label>
            <input type="text" id="pQuality" class="form-input" value="${spec.qualityStandard || 'Grade AA'}">
          </div>
          <div class="form-group">
            <label class="form-label">Chứng chỉ liên quan</label>
            <input type="text" id="pCerts" class="form-input" value="${spec.certifications || 'OEKO-TEX Standard 100, GRS'}">
          </div>
        </div>
      </div>
    </form>
  `;

  footer.innerHTML = `
    <button type="button" class="btn btn-default" onclick="window.closeModal()">Hủy</button>
    <button type="button" id="btnSaveProduct" class="btn btn-primary">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      Lưu
    </button>
  `;

  window.switchFormTab = (tabId) => {
    document.getElementById("tabGeneral").style.display = tabId === "tabGeneral" ? "block" : "none";
    document.getElementById("tabSpec").style.display    = tabId === "tabSpec"    ? "block" : "none";
    tabs.querySelectorAll("button").forEach((b, i) => {
      b.classList.toggle("active", (i === 0 && tabId === "tabGeneral") || (i === 1 && tabId === "tabSpec"));
    });
  };

  document.getElementById("btnSaveProduct").onclick = async () => {
    const sku  = document.getElementById("pSku").value.trim();
    const name = document.getElementById("pName").value.trim();
    if (!sku || !name) { showToast("Vui lòng điền SKU và Tên hàng hóa", "error"); return; }

    const payload = {
      sku, name,
      nameEn:           document.getElementById("pNameEn").value.trim()      || null,
      nameVi:           name,
      productGroup:     document.getElementById("pGroup").value.trim()        || null,
      hsCode:           document.getElementById("pHsCode").value.trim()       || null,
      unit:             document.getElementById("pUnit").value.trim()         || "kg",
      countryOfOrigin:  document.getElementById("pOrigin").value.trim()       || null,
      manufacturer:     document.getElementById("pManufacturer").value.trim() || null,
      notes:            document.getElementById("pNotes").value.trim()        || null,
      specification: {
        yarnType:        document.getElementById("pYarnType").value,
        composition:     "100% Polyester",
        denierCount:     document.getElementById("pDenier").value.trim()      || null,
        filamentCount:   parseInt(document.getElementById("pFilament").value) || null,
        sDorTBR:         document.getElementById("pSdOrTbr").value,
        color:           document.getElementById("pColor").value.trim()       || null,
        tpm:             document.getElementById("pTpm").value.trim()         || null,
        packagingType:   document.getElementById("pPackaging").value.trim()   || null,
        weightPerUnit:   parseFloat(document.getElementById("pWeightUnit").value) || null,
        qualityStandard: document.getElementById("pQuality").value.trim()     || null,
        certifications:  document.getElementById("pCerts").value.trim()       || null,
      }
    };

    try {
      if (isEdit) {
        await api.put(`/api/products/${p.id}`, payload);
        showToast("Cập nhật sản phẩm thành công!");
      } else {
        await api.post("/api/products", payload);
        showToast("Thêm mới sản phẩm thành công!");
      }
      window.closeModal();
      selectedIds.clear();
      await loadProductsData();
    } catch (_) {}
  };
}

// ─── Delete ───────────────────────────────────────────────────────────────────
async function deleteProduct(id) {
  const p = productsList.find(x => x.id === id);
  const confirmed = await showConfirm({
    title: 'Xóa Sản Phẩm',
    message: 'Bạn có chắc chắn muốn xóa mặt hàng này không?',
    highlight: p?.sku || id,
    type: 'danger',
    confirmText: 'Xóa'
  });
  if (!confirmed) return;

  try {
    await api.delete(`/api/products/${id}`);
    showToast("Đã xóa sản phẩm thành công!");
    selectedIds.delete(id);
    await loadProductsData();
  } catch (_) {}
}

// ─── Trade history modal ──────────────────────────────────────────────────────
async function viewHistory(id) {
  try {
    const res = await api.get(`/api/products/${id}/history`);
    const h   = res.data;

    window.openModal();
    const title  = document.getElementById("modalTitle");
    const tabs   = document.getElementById("modalTabs");
    const body   = document.getElementById("modalBody");
    const footer = document.getElementById("modalFooter");

    if (tabs) tabs.style.display = "none";
    title.innerHTML = `Lịch Sử Nhập/Xuất: <strong style="color:var(--amis-blue)">${h.sku}</strong> – ${h.productName}`;

    body.innerHTML = `
      <div class="amis-history-summary">
        <div class="amis-stat-item">
          <span class="amis-stat-label">Tổng lượng nhập</span>
          <span class="amis-stat-value">${Number(h.totalImportQuantity).toLocaleString()} ${h.unit || 'kg'}</span>
          <span class="amis-stat-sub">${h.totalImports} lần nhập</span>
        </div>
        <div class="amis-stat-item">
          <span class="amis-stat-label">Đơn giá nhập gần nhất</span>
          <span class="amis-stat-value amis-stat-green">$${h.latestImportPrice ? h.latestImportPrice.toFixed(4) : '—'}</span>
          <span class="amis-stat-sub">/ ${h.unit || 'kg'}</span>
        </div>
        <div class="amis-stat-item">
          <span class="amis-stat-label">Đơn giá bình quân</span>
          <span class="amis-stat-value amis-stat-blue">$${h.averageImportPrice ? h.averageImportPrice.toFixed(4) : '—'}</span>
          <span class="amis-stat-sub">/ ${h.unit || 'kg'}</span>
        </div>
      </div>

      <div class="grid-scroll" style="max-height:380px">
        <table class="misa-table">
          <thead>
            <tr>
              <th>Ngày GD</th>
              <th>Loại Hình</th>
              <th>Mã Lô Hàng</th>
              <th>Số Hóa Đơn</th>
              <th>Đối Tác</th>
              <th>Số Lượng (${h.unit || 'kg'})</th>
              <th>Đơn Giá (USD)</th>
              <th>Tổng Tiền</th>
              <th>Trạng Thái</th>
            </tr>
          </thead>
          <tbody>
            ${h.history.length === 0
              ? `<tr><td colspan="9" class="amis-table-empty">Chưa phát sinh giao dịch nhập/xuất nào.</td></tr>`
              : h.history.map(row => `
                <tr>
                  <td>${new Date(row.date).toLocaleDateString('vi-VN')}</td>
                  <td>${row.shipmentType === 'Import'
                    ? '<span class="chip chip-info">📥 Nhập khẩu</span>'
                    : '<span class="chip chip-success">📤 Xuất khẩu</span>'}</td>
                  <td><strong>${row.shipmentCode}</strong></td>
                  <td><code>${row.invoiceNumber || '—'}</code></td>
                  <td>${row.partnerName || '—'} (${row.partnerCountry || '—'})</td>
                  <td><strong>${Number(row.quantity).toLocaleString()}</strong></td>
                  <td>$${row.unitPrice.toFixed(4)}</td>
                  <td><strong>$${Number(row.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></td>
                  <td><span class="chip chip-warning">${row.status || 'Hoàn tất'}</span></td>
                </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;

    footer.innerHTML = `
      <button type="button" class="btn btn-default" onclick="window.closeModal()">Đóng</button>
      <button type="button" class="btn btn-primary" onclick="window.closeModal(); window.appNavigateTo('product-history','${id}')">
        Xem Báo Cáo Đầy Đủ →
      </button>
    `;
  } catch (_) {}
}
