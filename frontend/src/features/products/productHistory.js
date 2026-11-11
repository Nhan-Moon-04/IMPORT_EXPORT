/**
 * Product History & Material Usage Tracking — Modern Enterprise UI
 * Lịch sử nhập/xuất, tồn kho luỹ kế, định mức sử dụng từng mặt hàng
 */
import { api, showToast } from "../../core/api.js";

// ─── State ────────────────────────────────────────────────────────────────────
let historyItems      = [];
let productsList      = [];
let selectedProductId = '';
let selectedType      = '';
let searchQuery       = '';
let dateFrom          = '';
let dateTo            = '';
let currentPage       = 1;
let pageSize          = 20;
let sortCol           = 'date';
let sortDir           = 'desc';

let globalSummary = {
  totalImportQuantity   : 0,
  totalExportQuantity   : 0,
  totalRemainingQuantity: 0,
  totalImportValue      : 0,
  totalExportValue      : 0,
  totalTransactions     : 0,
  productCount          : 0
};

// ─── Column definitions ───────────────────────────────────────────────────────
const ALL_COLS = [
  { key: 'date',              label: 'Ngày GD',            width: '110px', visible: true,  sortable: true  },
  { key: 'type',              label: 'Loại Hình',          width: '130px', visible: true,  sortable: true  },
  { key: 'sku',               label: 'Mã SKU',             width: '150px', visible: true,  sortable: true  },
  { key: 'productName',       label: 'Tên Mặt Hàng',       width: '280px', visible: true,  sortable: true  },
  { key: 'shipmentCode',      label: 'Mã Lô Hàng',         width: '160px', visible: true,  sortable: false },
  { key: 'invoiceNumber',     label: 'Số Invoice',         width: '130px', visible: true,  sortable: false },
  { key: 'declarationNumber', label: 'Tờ Khai HQ',         width: '150px', visible: true,  sortable: false },
  { key: 'partnerName',       label: 'Đối Tác',            width: '220px', visible: true,  sortable: true  },
  { key: 'quantity',          label: 'Số Lượng',           width: '125px', visible: true,  sortable: true  },
  { key: 'unitPrice',         label: 'Đơn Giá (USD)',      width: '115px', visible: true,  sortable: true  },
  { key: 'totalAmount',       label: 'Thành Tiền (USD)',   width: '140px', visible: true,  sortable: true  },
  { key: 'balanceQuantity',   label: 'Tồn Sau GD',         width: '130px', visible: true,  sortable: false },
  { key: 'status',            label: 'Trạng Thái',         width: '115px', visible: true,  sortable: false },
];
let columns = ALL_COLS.map(c => ({ ...c }));

// ─── Entry ────────────────────────────────────────────────────────────────────
export async function renderProductHistory(container, defaultProductId = null) {
  selectedProductId = defaultProductId || '';
  currentPage = 1;
  sortCol = 'date';
  sortDir = 'desc';

  container.innerHTML = `
    <div class="ph-history-page">

      <!-- TABLE CARD CONTAINER -->
      <div class="ph-table-card">

        <!-- MODERN TOOLBAR -->
        <div class="ph-modern-toolbar">
          <div class="ph-tb-left">
            <!-- Filter Mặt Hàng -->
            <div class="ph-control-group">
              <span class="ph-control-label">Mặt hàng:</span>
              <select id="histProductSelect" class="ph-modern-select ph-select-prod">
                <option value="">-- Tất cả mặt hàng --</option>
              </select>
            </div>

            <!-- Filter Loại Hình -->
            <select id="histFilterType" class="ph-modern-select">
              <option value="">Tất cả loại hình</option>
              <option value="Import">Nhập khẩu</option>
              <option value="Export">Xuất khẩu</option>
            </select>

            <!-- Filter Ngày Tháng -->
            <div class="ph-date-wrap">
              <input type="date" id="histDateFrom" class="ph-date-field" title="Từ ngày">
              <span class="ph-date-divider">—</span>
              <input type="date" id="histDateTo" class="ph-date-field" title="Đến ngày">
            </div>

            <button id="btnHistFilterApply" class="ph-btn ph-btn-primary" title="Áp dụng bộ lọc">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
              Lọc
            </button>
          </div>

          <div class="ph-tb-right">
            <!-- Search Bar -->
            <div class="ph-search-bar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" id="histSearchInput" placeholder="Tìm kiếm SKU, lô hàng, invoice, tờ khai...">
            </div>

            <!-- Export Excel Button -->
            <button id="btnHistExportExcel" class="ph-btn" title="Xuất dữ liệu Excel (CSV)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="8" y1="13" x2="16" y2="13"/>
                <line x1="8" y1="17" x2="16" y2="17"/>
                <line x1="10" y1="9" x2="10.01" y2="9"/>
              </svg>
              Xuất Excel
            </button>

            <!-- Refresh Button -->
            <button id="btnHistRefresh" class="ph-btn" title="Nạp lại dữ liệu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 4 23 10 17 10"/>
                <polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              Nạp lại
            </button>

            <!-- Column Picker -->
            <div class="amis-col-picker-wrap" id="colPickerWrapHist">
              <button id="btnColPickerHist" class="ph-btn ph-btn-icon-only" title="Tuỳ chỉnh cột hiển thị">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="8" y1="6" x2="21" y2="6"/>
                  <line x1="8" y1="12" x2="21" y2="12"/>
                  <line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/>
                  <line x1="3" y1="12" x2="3.01" y2="12"/>
                  <line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
              </button>
              <div class="amis-col-dropdown" id="colDropdownHist" style="display:none">
                <div class="col-dropdown-header">Tuỳ chỉnh cột hiển thị</div>
                <div class="col-dropdown-list" id="colCheckListHist"></div>
                <div class="col-dropdown-footer">
                  <button class="ph-btn ph-btn-xs" id="btnResetColsHist">Đặt lại</button>
                  <button class="ph-btn ph-btn-primary ph-btn-xs" id="btnApplyColsHist">Áp dụng</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- SCROLLABLE TABLE CONTAINER (CỐ ĐỊNH 2 CỘT ĐẦU VÀ 1 CỘT CUỐI) -->
        <div class="ph-table-wrap">
          <table class="ph-modern-table" id="histTable">
            <colgroup id="histColgroup"></colgroup>
            <thead id="histThead"></thead>
            <tbody id="histTbody">
              <tr>
                <td colspan="20" class="amis-table-empty">
                  <div class="ph-loading">
                    <div class="ph-spinner"></div>
                    <span>Đang tải dữ liệu lịch sử xuất nhập khẩu...</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- MODERN FOOTER & PAGINATION -->
        <div class="ph-modern-footer">
          <div class="ph-ft-info" id="histPaginationText">Tổng số: 0 giao dịch</div>
          <div class="ph-ft-pagination" id="histPaginationBtns"></div>
          <div class="ph-ft-pagesize">
            <span>Hiển thị</span>
            <select id="histPageSize">
              <option value="20" selected>20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span>dòng / trang</span>
          </div>
        </div>

      </div>
    </div>
  `;

  await initData();
  setupEvents();
  renderHeader();
}

// ─── Init data ────────────────────────────────────────────────────────────────
async function initData() {
  try {
    const prodRes = await api.get("/api/products?pageSize=200");
    productsList = prodRes.data?.items || [];

    const sel = document.getElementById("histProductSelect");
    if (sel) {
      sel.innerHTML = `<option value="">-- Tất cả mặt hàng (${productsList.length}) --</option>` +
        productsList.map(p => `<option value="${p.id}" ${p.id === selectedProductId ? 'selected' : ''}>${p.sku} – ${p.name}</option>`).join('');
    }

    await loadHistoryData();
  } catch (e) {
    showToast("Lỗi khởi tạo dữ liệu: " + e.message, "error");
  }
}

async function loadHistoryData() {
  const tbody = document.getElementById("histTbody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="20" class="amis-table-empty">
    <div class="ph-loading"><div class="ph-spinner"></div><span>Đang tải...</span></div>
  </td></tr>`;

  try {
    const params = new URLSearchParams();
    if (selectedProductId) params.append("productId", selectedProductId);
    if (selectedType)      params.append("type", selectedType);
    if (searchQuery)       params.append("search", searchQuery);
    if (dateFrom)          params.append("fromDate", dateFrom);
    if (dateTo)            params.append("toDate", dateTo);

    const res  = await api.get(`/api/products/history?${params.toString()}`);
    const data = res.data || {};

    historyItems  = data.items || [];
    globalSummary = {
      totalImportQuantity   : data.totalImportQuantity    || 0,
      totalExportQuantity   : data.totalExportQuantity    || 0,
      totalRemainingQuantity: data.totalRemainingQuantity || 0,
      totalImportValue      : data.totalImportValue       || 0,
      totalExportValue      : data.totalExportValue       || 0,
      totalTransactions     : data.totalTransactions      || 0,
      productCount          : data.productCount           || 0,
    };

    applySortAndRender();
  } catch (_) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="20" class="amis-table-empty" style="color:var(--amis-red)">Lỗi tải dữ liệu. Vui lòng bấm Nạp lại.</td></tr>`;
  }
}

function applySortAndRender() {
  if (sortCol) {
    historyItems.sort((a, b) => {
      let va = getSortVal(a, sortCol);
      let vb = getSortVal(b, sortCol);
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1  : -1;
      return 0;
    });
  }
  currentPage = 1;
  renderTable();
  renderPagination();
}

function getSortVal(row, col) {
  switch (col) {
    case 'date':            return row.date ? new Date(row.date).getTime() : 0;
    case 'type':            return row.shipmentType || '';
    case 'sku':             return (row.sku || '').toLowerCase();
    case 'productName':     return (row.productName || '').toLowerCase();
    case 'partnerName':     return (row.partnerName || '').toLowerCase();
    case 'quantity':        return row.quantity || 0;
    case 'unitPrice':       return row.unitPrice || 0;
    case 'totalAmount':     return row.totalAmount || 0;
    case 'balanceQuantity': return row.balanceQuantity || 0;
    default:                return '';
  }
}

// ─── Table header (Cố định 2 cột đầu & 1 cột cuối) ───────────────────────────
function renderHeader() {
  const thead = document.getElementById("histThead");
  const colgroup = document.getElementById("histColgroup");
  if (!thead) return;

  const visCols = columns.filter(c => c.visible);

  // Render colgroup để đảm bảo độ rộng các cột cố định mượt mà
  if (colgroup) {
    colgroup.innerHTML = `
      <col style="width: 44px">
      ${visCols.map((col, idx) => {
        if (idx === 0) return `<col style="width: 110px">`;
        return `<col style="width: ${col.width || '130px'}">`;
      }).join('')}
      <col style="width: 85px">
    `;
  }

  thead.innerHTML = `
    <tr>
      <!-- Cột cố định 1: Checkbox -->
      <th class="ph-col-freeze-1">
        <input type="checkbox" id="chkAllHist" title="Chọn tất cả" style="cursor:pointer;accent-color:#0266b3">
      </th>

      <!-- Các cột dữ liệu -->
      ${visCols.map((col, idx) => {
        const isFreeze2 = (idx === 0); // Cột đầu tiên sau checkbox được cố định vị trí thứ 2
        const freezeCls = isFreeze2 ? ' ph-col-freeze-2' : '';
        const alignRight = numCols.includes(col.key);

        return `
          <th class="${col.sortable ? 'sortable' : ''}${freezeCls}" data-col="${col.key}" style="${alignRight ? 'text-align:right' : ''}">
            <div class="ph-th-flex${alignRight ? ' justify-end' : ''}">
              <span>${col.label}</span>
              ${col.sortable ? `<span class="ph-sort-ico${sortCol === col.key ? ' active' : ''}">${getSortSVG(col.key)}</span>` : ''}
            </div>
          </th>
        `;
      }).join('')}

      <!-- Cột cố định cuối: Thao tác -->
      <th class="ph-col-freeze-actions">Thao tác</th>
    </tr>
  `;

  thead.querySelectorAll("th.sortable").forEach(th => {
    th.addEventListener("click", () => {
      const col = th.dataset.col;
      if (sortCol === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      else { sortCol = col; sortDir = 'asc'; }
      applySortAndRender();
      renderHeader();
    });
  });

  document.getElementById("chkAllHist")?.addEventListener("change", (e) => {
    const checked = e.target.checked;
    document.querySelectorAll(".row-chk").forEach(cb => {
      cb.checked = checked;
      const tr = cb.closest("tr");
      if (tr) {
        if (checked) tr.classList.add("row-selected");
        else tr.classList.remove("row-selected");
      }
    });
  });
}

const numCols = ['quantity', 'unitPrice', 'totalAmount', 'balanceQuantity'];

function getSortSVG(col) {
  if (sortCol !== col) {
    return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 15l5 5 5-5"/><path d="M7 9l5-5 5 5"/></svg>`;
  }
  if (sortDir === 'asc') {
    return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>`;
  }
  return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>`;
}

// ─── Table body (Cố định 2 cột đầu & 1 cột cuối) ──────────────────────────────
function renderTable() {
  const tbody = document.getElementById("histTbody");
  if (!tbody) return;

  const total = historyItems.length;
  const start = (currentPage - 1) * pageSize;
  const items = historyItems.slice(start, start + pageSize);
  const visCols = columns.filter(c => c.visible);

  if (total === 0) {
    tbody.innerHTML = `<tr><td colspan="${visCols.length + 2}" class="amis-table-empty" style="padding:48px 16px;text-align:center;">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:.3;margin-bottom:10px"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      <div style="font-weight:500;color:var(--text-muted);font-size:14px">Không tìm thấy giao dịch xuất nhập khẩu nào phù hợp bộ lọc.</div>
    </td></tr>`;
    document.getElementById("histPaginationText").textContent = "Tổng số: 0 giao dịch";
    renderPagination();
    return;
  }

  tbody.innerHTML = items.map(row => {
    const isImport = row.shipmentType === 'Import';
    const dateStr  = row.date ? new Date(row.date).toLocaleDateString('vi-VN') : '—';
    const qtySign  = isImport ? `+${Number(row.quantity).toLocaleString('vi-VN')}` : `−${Number(row.quantity).toLocaleString('vi-VN')}`;
    const qtyColor = isImport ? '#0266b3' : '#b45309';
    const balColor = (row.balanceQuantity || 0) < 0 ? '#b91c1c' : '#111827';

    const cells = visCols.map((col, idx) => {
      const isFreeze2 = (idx === 0);
      const freezeCls = isFreeze2 ? ' ph-col-freeze-2' : '';

      switch (col.key) {
        case 'date':
          return `<td class="${freezeCls}" style="white-space:nowrap;font-weight:500;color:#334155"><span class="ph-num">${dateStr}</span></td>`;
        
        case 'type':
          return `<td class="${freezeCls}">${isImport
            ? `<span class="ph-type-pill ph-type-in">Nhập khẩu</span>`
            : `<span class="ph-type-pill ph-type-out">Xuất khẩu</span>`}</td>`;
        
        case 'sku':
          return `<td class="${freezeCls}"><span class="ph-sku-pill">${row.sku || '—'}</span></td>`;
        
        case 'productName':
          return `<td class="${freezeCls}" title="${row.productName || ''}"><div class="ph-cell-name">${row.productName || '—'}</div></td>`;
        
        case 'shipmentCode':
          return `<td class="${freezeCls}"><a class="ph-shipment-pill" href="javascript:void(0)" onclick="window.appNavigateTo('shipment-detail','${row.shipmentId}')">
            ${row.shipmentCode || '—'}
          </a></td>`;
        
        case 'invoiceNumber':
          return `<td class="${freezeCls}"><span class="ph-code-tag">${row.invoiceNumber || '—'}</span></td>`;
        
        case 'declarationNumber':
          return `<td class="${freezeCls}"><span class="ph-code-tag ph-code-orange">${row.declarationNumber || '—'}</span></td>`;
        
        case 'partnerName':
          return `<td class="${freezeCls}" title="${row.partnerName || ''}"><div class="ph-cell-name">${row.partnerName || '—'}</div></td>`;
        
        case 'quantity':
          return `<td class="${freezeCls}" style="text-align:right;white-space:nowrap">
            <span class="ph-num" style="font-weight:600;color:${qtyColor}">${qtySign}</span>
            <span style="font-size:11px;color:var(--text-muted);margin-left:2px">${row.unit || 'kg'}</span>
          </td>`;
        
        case 'unitPrice':
          return `<td class="${freezeCls}" style="text-align:right;white-space:nowrap"><span class="ph-num" style="color:var(--text-muted)">$${Number(row.unitPrice || 0).toFixed(4)}</span></td>`;
        
        case 'totalAmount':
          return `<td class="${freezeCls}" style="text-align:right;white-space:nowrap"><span class="ph-num" style="font-weight:600;color:#111827">$${Number(row.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>`;
        
        case 'balanceQuantity':
          return `<td class="${freezeCls}" style="text-align:right;white-space:nowrap">
            <span class="ph-num" style="font-weight:600;color:${balColor}">${Number(row.balanceQuantity || 0).toLocaleString('vi-VN')}</span>
            <span style="font-size:11px;color:var(--text-muted);margin-left:2px">${row.unit || 'kg'}</span>
          </td>`;
        
        case 'status': {
          const isDone = (row.status === 'Completed' || row.status === 'Hoàn tất' || !row.status);
          return `<td class="${freezeCls}" style="text-align:center"><span class="ph-status-pill ${isDone ? 'ph-status-success' : 'ph-status-draft'}">${row.status || 'Hoàn tất'}</span></td>`;
        }
        
        default:
          return `<td class="${freezeCls}"></td>`;
      }
    }).join('');

    return `
      <tr>
        <!-- Cột cố định 1: Checkbox -->
        <td class="ph-col-freeze-1">
          <input type="checkbox" class="row-chk" value="${row.shipmentId}" style="cursor:pointer;accent-color:#0266b3">
        </td>

        ${cells}

        <!-- Cột cố định cuối: Thao tác -->
        <td class="ph-col-freeze-actions">
          <button class="ph-action-btn" onclick="window.appNavigateTo('shipment-detail','${row.shipmentId}')" title="Xem chi tiết lô hàng">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Row selection handler
  tbody.querySelectorAll(".row-chk").forEach(chk => {
    chk.addEventListener("change", (e) => {
      const tr = e.target.closest("tr");
      if (tr) {
        if (e.target.checked) tr.classList.add("row-selected");
        else tr.classList.remove("row-selected");
      }
    });
  });

  const end = Math.min(currentPage * pageSize, total);
  document.getElementById("histPaginationText").textContent =
    `Tổng số: ${total} giao dịch${total > 0 ? ` · Đang hiển thị ${start + 1}–${end}` : ''}`;

  renderPagination();
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function renderPagination() {
  const ctrl   = document.getElementById("histPaginationBtns");
  if (!ctrl) return;
  const total  = historyItems.length;
  const pages  = Math.ceil(total / pageSize);
  if (pages <= 1) { ctrl.innerHTML = ''; return; }

  const range = paginationRange(currentPage, pages);
  let html = `<button class="ph-pg-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>‹</button>`;
  range.forEach(p => {
    if (p === '…') { html += `<span class="ph-pg-dots">…</span>`; }
    else { html += `<button class="ph-pg-btn${p === currentPage ? ' active' : ''}" data-page="${p}">${p}</button>`; }
  });
  html += `<button class="ph-pg-btn" data-page="${currentPage + 1}" ${currentPage === pages ? 'disabled' : ''}>›</button>`;
  ctrl.innerHTML = html;

  ctrl.querySelectorAll("[data-page]").forEach(btn => {
    btn.addEventListener("click", () => {
      currentPage = parseInt(btn.dataset.page);
      renderTable();
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
  const list = document.getElementById("colCheckListHist");
  if (!list) return;
  list.innerHTML = columns.map((col, i) => `
    <label class="col-check-row">
      <input type="checkbox" data-idx="${i}" ${col.visible ? 'checked' : ''}>
      <span>${col.label}</span>
    </label>
  `).join('');
}

// ─── Events ───────────────────────────────────────────────────────────────────
function setupEvents() {
  document.getElementById("histProductSelect")?.addEventListener("change", e => {
    selectedProductId = e.target.value; currentPage = 1; loadHistoryData();
  });

  document.getElementById("histFilterType")?.addEventListener("change", e => {
    selectedType = e.target.value; currentPage = 1; loadHistoryData();
  });

  document.getElementById("btnHistFilterApply")?.addEventListener("click", () => {
    dateFrom = document.getElementById("histDateFrom")?.value || '';
    dateTo   = document.getElementById("histDateTo")?.value || '';
    currentPage = 1;
    loadHistoryData();
  });

  let searchTimer = null;
  document.getElementById("histSearchInput")?.addEventListener("input", e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchQuery = e.target.value.trim(); currentPage = 1; loadHistoryData();
    }, 250);
  });

  document.getElementById("histPageSize")?.addEventListener("change", e => {
    pageSize = parseInt(e.target.value, 10) || 20; currentPage = 1; renderTable();
  });

  document.getElementById("btnHistRefresh")?.addEventListener("click", () => {
    loadHistoryData(); showToast("Đã nạp lại dữ liệu!", "success");
  });

  document.getElementById("btnHistExportExcel")?.addEventListener("click", exportToCsv);

  // Column picker
  const btnCol  = document.getElementById("btnColPickerHist");
  const colDrop = document.getElementById("colDropdownHist");
  btnCol?.addEventListener("click", e => {
    e.stopPropagation();
    const isOpen = colDrop.style.display !== 'none';
    colDrop.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) openColPicker();
  });

  document.addEventListener("click", e => {
    if (!document.getElementById("colPickerWrapHist")?.contains(e.target)) {
      if (colDrop) colDrop.style.display = 'none';
    }
  });

  document.getElementById("btnApplyColsHist")?.addEventListener("click", () => {
    document.querySelectorAll("#colCheckListHist input[type=checkbox]").forEach(cb => {
      columns[parseInt(cb.dataset.idx)].visible = cb.checked;
    });
    if (colDrop) colDrop.style.display = 'none';
    renderHeader();
    renderTable();
  });

  document.getElementById("btnResetColsHist")?.addEventListener("click", () => {
    columns = ALL_COLS.map(c => ({ ...c }));
    openColPicker();
  });
}

// ─── Export CSV ───────────────────────────────────────────────────────────────
function exportToCsv() {
  if (historyItems.length === 0) { showToast("Không có dữ liệu để xuất", "warning"); return; }

  const headers = ["Ngày GD","Loại Hình","Mã SKU","Tên Mặt Hàng","Mã Lô Hàng","Số Invoice",
    "Tờ Khai HQ","Đối Tác","Số Lượng","Đơn Vị","Đơn Giá (USD)","Thành Tiền (USD)","Tồn Lũy Kế","Trạng Thái"];

  const rows = historyItems.map(h => [
    h.date ? new Date(h.date).toLocaleDateString('vi-VN') : '',
    h.shipmentType === 'Import' ? 'Nhập khẩu' : 'Xuất khẩu',
    `"${(h.sku||'').replace(/"/g,'""')}"`,
    `"${(h.productName||'').replace(/"/g,'""')}"`,
    `"${(h.shipmentCode||'').replace(/"/g,'""')}"`,
    `"${(h.invoiceNumber||'').replace(/"/g,'""')}"`,
    `"${(h.declarationNumber||'').replace(/"/g,'""')}"`,
    `"${(h.partnerName||'').replace(/"/g,'""')}"`,
    h.quantity||0, h.unit||'kg', h.unitPrice||0, h.totalAmount||0, h.balanceQuantity||0,
    `"${(h.status||'').replace(/"/g,'""')}"`
  ]);

  const csv  = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = `Lich_Su_XNK_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Đã xuất file CSV thành công!", "success");
}
