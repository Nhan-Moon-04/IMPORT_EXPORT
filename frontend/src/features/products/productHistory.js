/**
 * Product History & Material Usage Tracking — MISA AMIS UI Style
 * Lịch sử nhập/xuất, tồn kho, định mức sử dụng từng mặt hàng
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
  { key: 'date',              label: 'Ngày GD',            visible: true,  sortable: true  },
  { key: 'type',              label: 'Loại Hình',          visible: true,  sortable: true  },
  { key: 'sku',               label: 'Mã SKU',             visible: true,  sortable: true  },
  { key: 'productName',       label: 'Tên Mặt Hàng',       visible: true,  sortable: true  },
  { key: 'shipmentCode',      label: 'Mã Lô Hàng',         visible: true,  sortable: false },
  { key: 'invoiceNumber',     label: 'Số Invoice',         visible: true,  sortable: false },
  { key: 'declarationNumber', label: 'Tờ Khai HQ',         visible: true,  sortable: false },
  { key: 'partnerName',       label: 'Đối Tác',            visible: true,  sortable: true  },
  { key: 'quantity',          label: 'Số Lượng',           visible: true,  sortable: true  },
  { key: 'unitPrice',         label: 'Đơn Giá (USD)',      visible: true,  sortable: true  },
  { key: 'totalAmount',       label: 'Thành Tiền (USD)',   visible: true,  sortable: true  },
  { key: 'balanceQuantity',   label: 'Tồn Sau GD',         visible: true,  sortable: false },
  { key: 'status',            label: 'Trạng Thái',         visible: true,  sortable: false },
];
let columns = ALL_COLS.map(c => ({ ...c }));

// ─── Entry ────────────────────────────────────────────────────────────────────
export async function renderProductHistory(container, defaultProductId = null) {
  selectedProductId = defaultProductId || '';
  currentPage = 1;
  sortCol = 'date';
  sortDir = 'desc';

  container.innerHTML = `
    <div class="ph-page">

      <!-- STAT CARDS -->
      <div class="ph-stat-grid">
        <div class="ph-stat-card ph-stat-blue">
          <div class="ph-stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/></svg>
          </div>
          <div class="ph-stat-body">
            <div class="ph-stat-label">Tổng Nhập Khẩu</div>
            <div class="ph-stat-value" id="statImportQty">0 kg</div>
            <div class="ph-stat-sub" id="statImportVal">Trị giá: $0.00</div>
          </div>
        </div>

        <div class="ph-stat-card ph-stat-orange">
          <div class="ph-stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 14 12 9 7 14"/><line x1="12" y1="9" x2="12" y2="21"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/></svg>
          </div>
          <div class="ph-stat-body">
            <div class="ph-stat-label">Xuất Khẩu / Đã Dùng</div>
            <div class="ph-stat-value" id="statExportQty">0 kg</div>
            <div class="ph-stat-sub" id="statExportVal">Trị giá: $0.00</div>
          </div>
        </div>

        <div class="ph-stat-card ph-stat-green">
          <div class="ph-stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
          </div>
          <div class="ph-stat-body">
            <div class="ph-stat-label">Tồn Kho / Còn Lại</div>
            <div class="ph-stat-value" id="statRemainQty">0 kg</div>
            <div class="ph-stat-sub" id="statRemainNote">Lũy kế tồn khả dụng</div>
          </div>
        </div>

        <div class="ph-stat-card ph-stat-purple">
          <div class="ph-stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div class="ph-stat-body">
            <div class="ph-stat-label">Tỷ Lệ Đã Sử Dụng</div>
            <div class="ph-stat-value" id="statUsageRate">0%</div>
            <div class="ph-stat-progress">
              <div class="ph-progress-bar" id="statUsageBar"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- PRODUCT SPOTLIGHT (shown when a product is selected) -->
      <div id="productSpotlightCard" class="ph-spotlight" style="display:none"></div>

      <!-- MAIN TABLE CARD -->
      <div class="amis-list-page">

        <!-- TOOLBAR -->
        <div class="amis-toolbar-wrap ph-toolbar-wrap">
          <div class="amis-toolbar-left" style="flex-wrap:wrap; gap:6px;">
            <!-- Product dropdown -->
            <div class="ph-filter-group">
              <label class="ph-filter-label">Mặt hàng</label>
              <select id="histProductSelect" class="ph-filter-select ph-select-wide">
                <option value="">-- Tất cả mặt hàng --</option>
              </select>
            </div>

            <div class="amis-btn-divider"></div>

            <!-- Type filter -->
            <select id="histFilterType" class="ph-filter-select">
              <option value="">Tất cả loại hình</option>
              <option value="Import">📥 Nhập khẩu</option>
              <option value="Export">📤 Xuất khẩu</option>
            </select>

            <!-- Date range -->
            <div class="ph-date-range">
              <input type="date" id="histDateFrom" class="ph-date-input" title="Từ ngày">
              <span class="ph-date-sep">—</span>
              <input type="date" id="histDateTo" class="ph-date-input" title="Đến ngày">
              <button id="btnHistFilterApply" class="amis-btn amis-btn-ghost amis-btn-xs">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                Lọc
              </button>
            </div>
          </div>

          <div class="amis-toolbar-right">
            <!-- Search -->
            <div class="amis-search-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" id="histSearchInput" placeholder="Lọc mã SKU, lô hàng, invoice...">
            </div>

            <!-- Export -->
            <button id="btnHistExportExcel" class="amis-btn amis-btn-ghost" title="Xuất CSV">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Xuất Excel
            </button>

            <!-- Refresh -->
            <button id="btnHistRefresh" class="amis-btn amis-btn-ghost" title="Nạp lại">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              Nạp lại
            </button>

            <!-- Column picker -->
            <div class="amis-col-picker-wrap" id="colPickerWrapHist">
              <button id="btnColPickerHist" class="amis-btn amis-btn-ghost amis-btn-icon-only" title="Tuỳ chỉnh cột">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              </button>
              <div class="amis-col-dropdown" id="colDropdownHist" style="display:none">
                <div class="col-dropdown-header">Tuỳ chỉnh cột hiển thị</div>
                <div class="col-dropdown-list" id="colCheckListHist"></div>
                <div class="col-dropdown-footer">
                  <button class="amis-btn amis-btn-ghost amis-btn-xs" id="btnResetColsHist">Đặt lại</button>
                  <button class="amis-btn amis-btn-primary amis-btn-xs" id="btnApplyColsHist">Áp dụng</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TABLE -->
        <div class="amis-table-container">
          <table class="amis-data-table" id="histTable">
            <thead id="histThead"></thead>
            <tbody id="histTbody">
              <tr><td colspan="20" class="amis-table-empty">
                <div class="ph-loading">
                  <div class="ph-spinner"></div>
                  <span>Đang tải dữ liệu lịch sử xuất nhập khẩu...</span>
                </div>
              </td></tr>
            </tbody>
          </table>
        </div>

        <!-- FOOTER -->
        <div class="amis-table-footer">
          <div class="amis-table-info" id="histPaginationText">Tổng số: 0 giao dịch</div>
          <div class="amis-pagination-controls" id="histPaginationBtns"></div>
          <div class="amis-page-size-select">
            <span>Hiển thị</span>
            <select id="histPageSize">
              <option value="20" selected>20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span>dòng/trang</span>
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
    updateStatCards();
    updateSpotlightCard();
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

// ─── Stat Cards ───────────────────────────────────────────────────────────────
function updateStatCards() {
  const impQty  = globalSummary.totalImportQuantity;
  const expQty  = globalSummary.totalExportQuantity;
  const remQty  = globalSummary.totalRemainingQuantity;

  const fmtQty  = v => `${Number(v).toLocaleString('vi-VN')} kg`;
  const fmtUsd  = v => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  setText("statImportQty",  fmtQty(impQty));
  setText("statExportQty",  fmtQty(expQty));
  setHTML("statImportVal",  `Trị giá: <strong>${fmtUsd(globalSummary.totalImportValue)}</strong>`);
  setHTML("statExportVal",  `Trị giá: <strong>${fmtUsd(globalSummary.totalExportValue)}</strong>`);

  const remEl = document.getElementById("statRemainQty");
  if (remEl) {
    remEl.textContent = fmtQty(remQty);
    remEl.style.color = remQty < 0 ? 'var(--amis-red)' : '';
  }

  const noteEl = document.getElementById("statRemainNote");
  if (noteEl) {
    noteEl.innerHTML = remQty < 0
      ? `<span style="color:var(--amis-red);font-weight:600">⚠️ Xuất vượt lượng nhập</span>`
      : `Số lượng khả dụng còn lại`;
  }

  const usageRate = impQty > 0 ? Math.min(100, Math.max(0, (expQty / impQty) * 100)) : (expQty > 0 ? 100 : 0);
  setText("statUsageRate", `${usageRate.toFixed(1)}%`);
  const bar = document.getElementById("statUsageBar");
  if (bar) {
    bar.style.width = `${usageRate}%`;
    bar.style.background = usageRate > 90 ? '#ef4444' : usageRate > 50 ? '#f59e0b' : '#8b5cf6';
  }
}

function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
function setHTML(id, v) { const el = document.getElementById(id); if (el) el.innerHTML = v; }

// ─── Spotlight card ───────────────────────────────────────────────────────────
function updateSpotlightCard() {
  const card = document.getElementById("productSpotlightCard");
  if (!card) return;

  if (!selectedProductId) { card.style.display = "none"; return; }

  const p = productsList.find(x => x.id === selectedProductId);
  if (!p) { card.style.display = "none"; return; }

  const impQty   = globalSummary.totalImportQuantity;
  const remQty   = globalSummary.totalRemainingQuantity;
  const avgPrice = impQty > 0 ? (globalSummary.totalImportValue / impQty) : 0;

  card.style.display = "block";
  card.innerHTML = `
    <div class="ph-spotlight-inner">
      <div class="ph-spotlight-left">
        <div class="ph-spotlight-avatar">🧵</div>
        <div>
          <div class="ph-spotlight-name">
            ${p.name}
            <span class="amis-sku-badge">${p.sku}</span>
            ${p.hsCode ? `<span class="amis-code">HS: ${p.hsCode}</span>` : ''}
          </div>
          <div class="ph-spotlight-meta">
            Nhóm: <strong>${p.productGroup || 'Sợi dệt'}</strong> &nbsp;·&nbsp;
            Xuất xứ: <strong>${p.countryOfOrigin || 'N/A'}</strong> &nbsp;·&nbsp;
            ĐVT: <strong>${p.unit || 'kg'}</strong>
          </div>
        </div>
      </div>
      <div class="ph-spotlight-right">
        <div class="ph-spotlight-kpi">
          <span class="ph-kpi-label">Đơn giá bình quân nhập</span>
          <span class="ph-kpi-val" style="color:var(--amis-blue)">$${avgPrice.toFixed(4)}</span>
        </div>
        <div class="ph-spotlight-sep"></div>
        <div class="ph-spotlight-kpi">
          <span class="ph-kpi-label">Tồn khả dụng</span>
          <span class="ph-kpi-val" style="color:${remQty < 0 ? 'var(--amis-red)' : 'var(--amis-green)'}">
            ${Number(remQty).toLocaleString('vi-VN')} ${p.unit || 'kg'}
          </span>
        </div>
      </div>
    </div>
  `;
}

// ─── Table header ─────────────────────────────────────────────────────────────
function renderHeader() {
  const thead = document.getElementById("histThead");
  if (!thead) return;

  const visCols = columns.filter(c => c.visible);

  thead.innerHTML = `
    <tr>
      <th class="amis-th-check"><input type="checkbox" id="chkAllHist" title="Chọn tất cả"></th>
      ${visCols.map(col => `
        <th class="amis-th${col.sortable ? ' sortable' : ''}" data-col="${col.key}" style="${numCols.includes(col.key) ? 'text-align:right' : ''}">
          <div class="amis-th-inner${numCols.includes(col.key) ? ' justify-end' : ''}">
            <span>${col.label}</span>
            ${col.sortable ? `<span class="sort-icon${sortCol === col.key ? (sortDir === 'asc' ? ' asc' : ' desc') : ''}">${getSortSVG(col.key)}</span>` : ''}
          </div>
        </th>
      `).join('')}
      <th class="amis-th-actions">Thao tác</th>
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
    document.querySelectorAll(".row-chk").forEach(cb => cb.checked = e.target.checked);
  });
}

const numCols = ['quantity', 'unitPrice', 'totalAmount', 'balanceQuantity'];

function getSortSVG(col) {
  if (sortCol !== col) return `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 15l5 5 5-5"/><path d="M7 9l5-5 5 5"/></svg>`;
  if (sortDir === 'asc') return `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5l-7 7h14z" fill="currentColor" stroke="none"/></svg>`;
  return `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 19l7-7H5z" fill="currentColor" stroke="none"/></svg>`;
}

// ─── Table body ───────────────────────────────────────────────────────────────
function renderTable() {
  const tbody = document.getElementById("histTbody");
  if (!tbody) return;

  const total = historyItems.length;
  const start = (currentPage - 1) * pageSize;
  const items = historyItems.slice(start, start + pageSize);
  const visCols = columns.filter(c => c.visible);

  if (total === 0) {
    tbody.innerHTML = `<tr><td colspan="${visCols.length + 2}" class="amis-table-empty">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="opacity:.35;margin-bottom:8px"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      <div>Không tìm thấy giao dịch xuất nhập khẩu nào phù hợp điều kiện lọc.</div>
    </td></tr>`;
    document.getElementById("histPaginationText").textContent = "Tổng số: 0 giao dịch";
    renderPagination();
    return;
  }

  tbody.innerHTML = items.map(row => {
    const isImport = row.shipmentType === 'Import';
    const dateStr  = row.date ? new Date(row.date).toLocaleDateString('vi-VN') : '—';
    const qtySign  = isImport ? `+${Number(row.quantity).toLocaleString('vi-VN')}` : `−${Number(row.quantity).toLocaleString('vi-VN')}`;
    const qtyColor = isImport ? 'var(--amis-blue)' : '#d97706';
    const balColor = (row.balanceQuantity || 0) < 0 ? 'var(--amis-red)' : 'var(--amis-green)';

    const cells = visCols.map(col => {
      switch (col.key) {
        case 'date': return `<td style="white-space:nowrap;color:var(--text-muted);font-size:12.5px">${dateStr}</td>`;
        case 'type': return `<td>${isImport
          ? `<span class="ph-chip ph-chip-import">📥 Nhập khẩu</span>`
          : `<span class="ph-chip ph-chip-export">📤 Xuất khẩu</span>`}</td>`;
        case 'sku': return `<td><strong class="amis-sku-badge">${row.sku || '—'}</strong></td>`;
        case 'productName': return `<td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${row.productName || '—'}</td>`;
        case 'shipmentCode': return `<td><a class="ph-link" href="javascript:void(0)" onclick="window.appNavigateTo('shipment-detail','${row.shipmentId}')">${row.shipmentCode || '—'}</a></td>`;
        case 'invoiceNumber': return `<td><code class="amis-code">${row.invoiceNumber || '—'}</code></td>`;
        case 'declarationNumber': return `<td><code class="amis-code" style="color:#b45309">${row.declarationNumber || '—'}</code></td>`;
        case 'partnerName': return `<td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${row.partnerName || '—'}</td>`;
        case 'quantity': return `<td style="text-align:right;font-weight:700;color:${qtyColor};white-space:nowrap">${qtySign} <span style="font-size:11px;font-weight:400;color:var(--text-muted)">${row.unit || 'kg'}</span></td>`;
        case 'unitPrice': return `<td style="text-align:right;white-space:nowrap">$${Number(row.unitPrice || 0).toFixed(4)}</td>`;
        case 'totalAmount': return `<td style="text-align:right;font-weight:700;white-space:nowrap">$${Number(row.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>`;
        case 'balanceQuantity': return `<td style="text-align:right;font-weight:700;color:${balColor};white-space:nowrap">${Number(row.balanceQuantity || 0).toLocaleString('vi-VN')} <span style="font-size:11px;font-weight:400;color:var(--text-muted)">${row.unit || 'kg'}</span></td>`;
        case 'status': return `<td style="text-align:center"><span class="ph-status-chip">${row.status || 'Hoàn tất'}</span></td>`;
        default: return `<td></td>`;
      }
    }).join('');

    return `
      <tr>
        <td class="amis-td-check"><input type="checkbox" class="row-chk" value="${row.shipmentId}"></td>
        ${cells}
        <td class="amis-td-actions">
          <div class="amis-row-actions">
            <button class="amis-icon-btn" onclick="window.appNavigateTo('shipment-detail','${row.shipmentId}')" title="Xem lô hàng">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

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
  let html = `<button class="amis-pg-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>‹</button>`;
  range.forEach(p => {
    if (p === '…') { html += `<span class="amis-pg-ellipsis">…</span>`; }
    else { html += `<button class="amis-pg-btn${p === currentPage ? ' active' : ''}" data-page="${p}">${p}</button>`; }
  });
  html += `<button class="amis-pg-btn" data-page="${currentPage + 1}" ${currentPage === pages ? 'disabled' : ''}>›</button>`;
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
