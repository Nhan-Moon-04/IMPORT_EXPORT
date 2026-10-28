/**
 * IMEX N — Báo Cáo Chi Tiết & Tổng Hợp Nhập Khẩu (MISA AMIS Enterprise Style)
 * Route: /reports-import & /reports-export
 */
import { api, toast, openModal, closeModal } from '../../core/api.js';

// ─── Constants & Column Definitions ──────────────────────────────────────────
const REPORT_COLUMNS = [
  { id: 'date',              label: 'Ngày Nhập',         default: true,  align: 'left',   sortable: true },
  { id: 'shipmentCode',      label: 'Mã Lô Hàng',        default: true,  align: 'left',   sortable: true },
  { id: 'invoiceNumber',     label: 'Số Invoice',        default: true,  align: 'left',   sortable: true },
  { id: 'declarationNumber', label: 'Tờ Khai HQ',        default: true,  align: 'left',   sortable: false },
  { id: 'partnerName',       label: 'Nhà Cung Cấp',      default: true,  align: 'left',   sortable: true },
  { id: 'partnerCountry',    label: 'Quốc Gia',          default: false, align: 'left',   sortable: true },
  { id: 'sku',               label: 'Mã SKU',            default: true,  align: 'left',   sortable: true },
  { id: 'productName',       label: 'Tên Mặt Hàng / Quy Cách', default: true, align: 'left', sortable: true },
  { id: 'unit',              label: 'ĐVT',               default: true,  align: 'center', sortable: false },
  { id: 'quantity',          label: 'Số Lượng (kg)',     default: true,  align: 'right',  sortable: true },
  { id: 'currency',          label: 'Loại Tiền',         default: true,  align: 'center', sortable: true },
  { id: 'unitPrice',         label: 'Đơn Giá',           default: true,  align: 'right',  sortable: true },
  { id: 'totalAmountUsd',    label: 'Thành Tiền (USD)',  default: true,  align: 'right',  sortable: true },
  { id: 'totalAmountVnd',    label: 'Thành Tiền (VNĐ)',  default: true,  align: 'right',  sortable: true },
  { id: 'deliveryTerm',      label: 'Điều Kiện (Inco)',  default: false, align: 'center', sortable: false },
  { id: 'portOfDischarge',   label: 'Cảng Dỡ Hàng',      default: false, align: 'left',   sortable: false },
  { id: 'status',            label: 'Trạng Thái',        default: true,  align: 'center', sortable: false },
  { id: 'notes',             label: 'Ghi Chú',           default: false, align: 'left',   sortable: false }
];

// ─── SVG Icons Helper ────────────────────────────────────────────────────────
const ICONS = {
  search: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
  filter: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>`,
  reset:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path></svg>`,
  excel:  `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
  print:  `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>`,
  columns:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="3" x2="12" y2="21"></line></svg>`,
  refresh:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`,
  chevronDown: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>`,
  chevronRight: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>`,
  check:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
  close:  `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
  box:    `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`,
  dollar: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`,
  building: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="22" x2="9" y2="22.01"></line><line x1="15" y1="22" x2="15" y2="22.01"></line><line x1="9" y1="6" x2="9" y2="6.01"></line><line x1="15" y1="6" x2="15" y2="6.01"></line><line x1="9" y1="10" x2="9" y2="10.01"></line><line x1="15" y1="10" x2="15" y2="10.01"></line><line x1="9" y1="14" x2="9" y2="14.01"></line><line x1="15" y1="14" x2="15" y2="14.01"></line><line x1="9" y1="18" x2="9" y2="18.01"></line><line x1="15" y1="18" x2="15" y2="18.01"></line></svg>`,
  ship:   `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 21h20M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.26.59 4.38 1.62 6M12 10V4M8 6h8"></path></svg>`
};

// ─── Module State ────────────────────────────────────────────────────────────
let rawHistoryData = [];
let allSuppliers = [];
let allProducts = [];
let activeReportTab = 'detailed'; // 'detailed' | 'by-supplier' | 'by-product'
let shipmentTypeMode = 'Import'; // 'Import' or 'Export' or 'All'

// Filter state
let filterState = {
  keyword: '',
  supplierIds: [], // multi-select supplier IDs (or names)
  datePreset: 'all',
  dateFrom: '',
  dateTo: '',
  productId: '',
  minQuantity: null,
  maxQuantity: null,
  minAmount: null,
  maxAmount: null
};

// Pagination & Sorting state
let paginationState = {
  page: 1,
  pageSize: 20
};

let sortState = {
  column: 'date',
  direction: 'desc'
};

// Set of expanded group keys for accordion/nested views
let expandedGroupKeys = new Set();

// ─── Column Visibility Storage ───────────────────────────────────────────────
function getStoredColumns() {
  try {
    const saved = localStorage.getItem('xnk_report_import_columns_v3');
    if (saved) {
      const parsed = JSON.parse(saved);
      return REPORT_COLUMNS.map(col => ({
        ...col,
        visible: parsed[col.id] !== undefined ? parsed[col.id] : col.default
      }));
    }
  } catch (e) {
    // fallback
  }
  return REPORT_COLUMNS.map(col => ({ ...col, visible: col.default }));
}

function saveStoredColumns(cols) {
  const map = {};
  cols.forEach(c => map[c.id] = c.visible);
  localStorage.setItem('xnk_report_import_columns_v3', JSON.stringify(map));
}

let activeColumns = getStoredColumns();

// ─── Main Render Function ────────────────────────────────────────────────────
export async function renderReports(container, subTab = 'import') {
  shipmentTypeMode = (subTab && subTab.toLowerCase().includes('export')) ? 'Export' : 'Import';
  
  // Reset pagination on route change
  paginationState.page = 1;

  container.innerHTML = `
    <div class="reports-page" id="reportsPageContainer">
      <!-- 1. Header Toolbar -->
      <div class="reports-header">
        <div class="reports-header-title">
          <h1 class="reports-title">
            <span class="title-icon">${ICONS.excel}</span>
            <span id="reportHeaderMainTitle">Báo Cáo ${shipmentTypeMode === 'Import' ? 'Nhập Khẩu Hàng Hóa & Nhà Cung Cấp' : 'Xuất Khẩu Hàng Hóa'}</span>
          </h1>
          <p class="reports-subtitle" id="reportHeaderSubtitle">
            Theo dõi chi tiết từng lô hàng, nhà cung cấp, quy cách sợi, biến động sản lượng & kim ngạch theo thời gian
          </p>
        </div>
        
        <div class="reports-actions">
          <div class="btn-group" style="display:inline-flex; border:1px solid #cbd5e1; border-radius:6px; overflow:hidden;">
            <button class="btn ${shipmentTypeMode === 'Import' ? 'btn-blue' : 'btn-secondary'}" id="btnToggleImport" style="border:none; border-radius:0;">
              📥 Nhập khẩu
            </button>
            <button class="btn ${shipmentTypeMode === 'Export' ? 'btn-blue' : 'btn-secondary'}" id="btnToggleExport" style="border:none; border-radius:0;">
              📤 Xuất khẩu
            </button>
          </div>

          <button class="btn btn-secondary" id="btnRefreshReport" title="Tải lại dữ liệu mới nhất từ hệ thống">
            ${ICONS.refresh} <span>Nạp lại</span>
          </button>
          
          <button class="btn btn-secondary" id="btnConfigureColumns" title="Tùy chọn hiển thị các cột trong bảng">
            ${ICONS.columns} <span>Tùy chọn cột</span>
          </button>
          
          <button class="btn btn-primary" id="btnExportExcel" style="background:#0266b3;" title="Xuất báo cáo ra file Excel (.xlsx)">
            ${ICONS.excel} <span>Xuất Excel</span>
          </button>
          
          <button class="btn btn-secondary" id="btnPrintReport" title="In hoặc lưu file PDF">
            ${ICONS.print} <span>In / PDF</span>
          </button>
        </div>
      </div>

      <!-- 2. KPI Summary Cards -->
      <div class="reports-kpi-grid" id="reportsKpiGrid">
        <div class="kpi-card kpi-blue">
          <div class="kpi-icon">${ICONS.box}</div>
          <div class="kpi-body">
            <div class="kpi-label">Tổng Sản Lượng Nhập</div>
            <div class="kpi-value" id="kpiTotalQuantity">0 kg</div>
            <div class="kpi-sub" id="kpiQuantitySub">0 tấn</div>
          </div>
        </div>

        <div class="kpi-card kpi-green">
          <div class="kpi-icon">${ICONS.dollar}</div>
          <div class="kpi-body">
            <div class="kpi-label">Tổng Kim Ngạch (USD)</div>
            <div class="kpi-value" id="kpiTotalValueUsd">$0.00</div>
            <div class="kpi-sub" id="kpiAvgUnitPrice">Đơn giá TB: $0.00 / kg</div>
          </div>
        </div>

        <div class="kpi-card kpi-indigo">
          <div class="kpi-icon">${ICONS.dollar}</div>
          <div class="kpi-body">
            <div class="kpi-label">Tổng Tiền (VNĐ)</div>
            <div class="kpi-value" id="kpiTotalValueVnd">0 ₫</div>
            <div class="kpi-sub" id="kpiExchangeRateNote">0 dòng hàng VNĐ (nội địa)</div>
          </div>
        </div>

        <div class="kpi-card kpi-orange">
          <div class="kpi-icon">${ICONS.building}</div>
          <div class="kpi-body">
            <div class="kpi-label">Giao Dịch / Đối Tác</div>
            <div class="kpi-value" id="kpiTotalShipments">0 lô hàng</div>
            <div class="kpi-sub" id="kpiPartnersCount">0 nhà cung cấp • 0 mã hàng</div>
          </div>
        </div>
      </div>

      <!-- 3. Advanced Multi-Filter Box (Compact & Sleek MISA Style) -->
      <div class="reports-filter-card">
        <!-- Row 1: Primary Toolbar (All on 1 single slim line) -->
        <div class="filter-primary-row">
          <!-- Keyword Free Search (e.g. DTy) -->
          <div class="filter-item-search">
            <span class="input-prefix">${ICONS.search}</span>
            <input type="text" id="reportSearchInput" class="filter-control-compact" 
              placeholder="Tìm kiếm (gõ DTy, mã sợi, invoice, tờ khai...)" 
              value="${filterState.keyword}">
          </div>

          <!-- Multi-select Supplier Dropdown -->
          <div class="filter-item-supplier">
            <div class="supplier-dropdown-wrapper" id="supplierDropdownWrapper">
              <div class="supplier-dropdown-trigger" id="supplierDropdownTrigger" title="Chọn một hoặc nhiều nhà cung cấp">
                <span class="supplier-trigger-text" id="supplierTriggerText">🏢 Tất cả nhà cung cấp</span>
                <span id="supplierTriggerBadgeContainer"></span>
                <span>${ICONS.chevronDown}</span>
              </div>
              
              <div class="supplier-dropdown-menu" id="supplierDropdownMenu">
                <div class="supplier-search-box">
                  <input type="text" id="supplierSearchInput" class="supplier-search-input" placeholder="Lọc nhanh nhà cung cấp...">
                </div>
                <div class="supplier-quick-actions">
                  <a href="#" class="supplier-quick-link" id="btnSelectAllSuppliers">✓ Chọn tất cả</a>
                  <a href="#" class="supplier-quick-link" id="btnClearAllSuppliers" style="color:#ef4444;">✕ Bỏ chọn</a>
                </div>
                <div class="supplier-list-container" id="supplierListContainer">
                  <div style="padding:10px; text-align:center; color:#94a3b8; font-size:12px;">Đang tải danh sách...</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Time Presets -->
          <div class="filter-item-preset">
            <select id="reportDatePreset" class="filter-control-compact" title="Chọn kỳ báo cáo">
              <option value="all">📅 Toàn bộ thời gian</option>
              <option value="today">Hôm nay</option>
              <option value="last7days">7 ngày qua</option>
              <option value="last30days">30 ngày qua</option>
              <option value="thisMonth">Tháng này</option>
              <option value="lastMonth">Tháng trước</option>
              <option value="thisQuarter">Quý này</option>
              <option value="thisYear">Năm 2026</option>
              <option value="custom">Tùy chọn ngày...</option>
            </select>
          </div>

          <!-- Product / SKU Filter -->
          <div class="filter-item-product">
            <select id="reportProductSelect" class="filter-control-compact" title="Chọn mặt hàng / mã sợi">
              <option value="">🧵 Tất cả mặt hàng</option>
            </select>
          </div>

          <!-- Toggle Advanced Filter Button -->
          <button class="btn btn-secondary btn-compact" id="btnToggleAdvancedFilter" title="Mở rộng lọc: Khoảng ngày, Số lượng, Số tiền">
            ${ICONS.filter} <span>Lọc thêm</span> <span id="advFilterBadge" class="filter-active-dot" style="display:none;"></span> ${ICONS.chevronDown}
          </button>

          <!-- Reset Button -->
          <button class="btn-reset-filters" id="btnResetFilters" title="Khôi phục toàn bộ điều kiện lọc về mặc định">
            ${ICONS.reset} <span>Đặt lại</span>
          </button>
        </div>

        <!-- Row 2: Secondary / Advanced Filters (Collapsible on 1 single slim line) -->
        <div class="filter-secondary-row" id="filterSecondaryRow" style="display:none;">
          <!-- Date Range (From - To) -->
          <div class="filter-inline-group">
            <span class="inline-label">Từ ngày:</span>
            <input type="date" id="reportDateFrom" class="filter-control-compact date-input" value="${filterState.dateFrom}">
            <span class="inline-label">Đến:</span>
            <input type="date" id="reportDateTo" class="filter-control-compact date-input" value="${filterState.dateTo}">
          </div>

          <div class="filter-inline-divider"></div>

          <!-- Quantity Range (min - max kg) -->
          <div class="filter-inline-group">
            <span class="inline-label">SL (kg):</span>
            <input type="number" id="reportMinQty" class="filter-control-compact num-input" placeholder="Từ" min="0" value="${filterState.minQuantity || ''}">
            <span class="range-dash">-</span>
            <input type="number" id="reportMaxQty" class="filter-control-compact num-input" placeholder="Đến" min="0" value="${filterState.maxQuantity || ''}">
          </div>

          <div class="filter-inline-divider"></div>

          <!-- Amount Range (min - max USD) -->
          <div class="filter-inline-group">
            <span class="inline-label">Tiền ($):</span>
            <input type="number" id="reportMinAmount" class="filter-control-compact num-input" placeholder="Từ" min="0" value="${filterState.minAmount || ''}">
            <span class="range-dash">-</span>
            <input type="number" id="reportMaxAmount" class="filter-control-compact num-input" placeholder="Đến" min="0" value="${filterState.maxAmount || ''}">
          </div>

          <!-- Apply Filter Button -->
          <button class="btn btn-primary btn-compact" id="btnApplyFilters" style="margin-left:auto;">
            ${ICONS.check} <span>Áp dụng</span>
          </button>
        </div>

        <!-- Active Badges Strip -->
        <div class="filter-badges-strip" id="filterBadgesStrip" style="display:none;"></div>
      </div>

      <!-- 4. Report Views Tabs (Detailed / By Supplier / By Product) -->
      <div class="reports-tabs-bar">
        <div class="reports-tabs">
          <button class="report-tab-btn active" data-tab="detailed" id="tabBtnDetailed">
            <span>📋 Báo Cáo Chi Tiết Hàng Nhập</span>
            <span class="report-tab-count" id="badgeDetailedCount">0</span>
          </button>
          <button class="report-tab-btn" data-tab="by-supplier" id="tabBtnBySupplier">
            <span>🏢 Tổng Hợp Theo Nhà Cung Cấp</span>
            <span class="report-tab-count" id="badgeSupplierCount">0</span>
          </button>
          <button class="report-tab-btn" data-tab="by-product" id="tabBtnByProduct">
            <span>🧵 Tổng Hợp Theo Mặt Hàng</span>
            <span class="report-tab-count" id="badgeProductCount">0</span>
          </button>
        </div>

        <div class="reports-tab-meta" id="reportsResultMeta">
          Đang nạp dữ liệu báo cáo...
        </div>
      </div>

      <!-- 5. Main Report Table Card -->
      <div class="reports-table-card">
        <div class="table-responsive" id="reportTableResponsive">
          <!-- Rendered dynamically -->
          <div style="padding: 40px; text-align: center; color: #64748b;">
            <div class="spinner"></div>
            <p style="margin-top: 10px;">Đang tải và tính toán số liệu báo cáo...</p>
          </div>
        </div>

        <!-- 6. Pagination Bar -->
        <div class="reports-pagination" id="reportsPaginationBar">
          <div class="pagination-info" id="paginationInfo">Hiển thị 0 dòng</div>
          <div class="page-size-selector">
            <label for="reportPageSize">Số dòng/trang:</label>
            <select id="reportPageSize">
              <option value="10">10 dòng</option>
              <option value="20" selected>20 dòng</option>
              <option value="50">50 dòng</option>
              <option value="100">100 dòng</option>
            </select>
          </div>
          <div class="pagination-nav" id="paginationNav">
            <!-- Dynamic buttons -->
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach all event listeners and fetch data
  setupReportEvents();
  await loadReportData();
}

// ─── Data Fetching & Normalization ───────────────────────────────────────────
async function loadReportData() {
  try {
    // Parallel fetch: history items, suppliers, products, and shipments
    const [historyRes, suppRes, prodRes, shipRes] = await Promise.allSettled([
      api.get(`/api/products/history?type=${shipmentTypeMode}`),
      api.get(`/api/suppliers?pageSize=200`),
      api.get(`/api/products?pageSize=200`),
      api.get(`/api/shipments?type=${shipmentTypeMode}&pageSize=200`)
    ]);

    // 1. Process Suppliers
    if (suppRes.status === 'fulfilled' && suppRes.value && suppRes.value.data) {
      allSuppliers = suppRes.value.data.items || [];
    } else {
      allSuppliers = [];
    }

    // 2. Process Products
    if (prodRes.status === 'fulfilled' && prodRes.value && prodRes.value.data) {
      allProducts = prodRes.value.data.items || [];
    } else {
      allProducts = [];
    }

    // 3. Process Shipments (as additional lookup)
    const shipmentLookup = {};
    if (shipRes.status === 'fulfilled' && shipRes.value && shipRes.value.data) {
      (shipRes.value.data.items || []).forEach(s => {
        shipmentLookup[s.id] = s;
        if (s.shipmentCode) shipmentLookup[s.shipmentCode] = s;
      });
    }

    // 4. Process History Line Items
    let items = [];
    if (historyRes.status === 'fulfilled' && historyRes.value && historyRes.value.data) {
      items = historyRes.value.data.items || [];
    }

    // Normalize each line item with rich metadata
    rawHistoryData = items.map((it, idx) => {
      const parentShipment = shipmentLookup[it.shipmentId] || shipmentLookup[it.shipmentCode] || {};
      const invNum = it.invoiceNumber || (parentShipment.invoiceNumbers ? parentShipment.invoiceNumbers.join(', ') : '');
      const declNum = it.declarationNumber || (parentShipment.declarationNumbers ? parentShipment.declarationNumbers.join(', ') : '');
      const suppName = it.partnerName || parentShipment.supplierName || (parentShipment.supplier ? parentShipment.supplier.companyName : '') || 'Chưa định danh';
      const suppCountry = it.partnerCountry || (parentShipment.supplier ? parentShipment.supplier.country : '') || '';
      
      const curr = String(it.currency || parentShipment.currency || 'USD').toUpperCase().trim();
      const isVnd = curr === 'VND' || curr === 'VNĐ';
      const qty = Number(it.quantity || 0);
      const price = Number(it.unitPrice || 0);
      const totalAmt = Number(it.totalAmount || (qty * price) || 0);

      // Đô là đô, VNĐ là VNĐ — Tuyệt đối không tự ý nhân tỷ giá quy đổi!
      const totalUsd = isVnd ? null : totalAmt;
      const totalVnd = isVnd ? totalAmt : null;

      // Chuẩn hóa tên sản phẩm tiếng Việt nếu bị lỗi font ?
      let pName = it.productName || '';
      if (!pName || pName.includes('?')) {
        const foundProd = allProducts.find(p => p.id === it.productId || p.sku === it.sku);
        if (foundProd) pName = foundProd.name || foundProd.nameVi || 'Sợi dệt Polyester';
        else pName = (pName || 'Sợi dệt Polyester').replace(/S\?i/g, 'Sợi');
      }

      return {
        id: it.id || `item_${idx}_${it.shipmentId || ''}`,
        shipmentId: it.shipmentId || parentShipment.id,
        shipmentCode: it.shipmentCode || parentShipment.shipmentCode || 'N/A',
        shipmentType: it.shipmentType || parentShipment.type || shipmentTypeMode,
        date: it.date ? it.date.slice(0, 10) : (parentShipment.createdAt ? parentShipment.createdAt.slice(0, 10) : ''),
        invoiceNumber: invNum,
        declarationNumber: declNum,
        partnerId: it.partnerId || parentShipment.supplierId,
        partnerName: suppName,
        partnerCountry: suppCountry,
        productId: it.productId,
        sku: it.sku || '',
        productName: pName,
        unit: it.unit || 'kg',
        quantity: qty,
        currency: isVnd ? 'VNĐ' : 'USD',
        unitPrice: price,
        totalAmount: totalAmt,
        totalAmountUsd: totalUsd,
        totalAmountVnd: totalVnd,
        deliveryTerm: parentShipment.deliveryTerm || 'CIF',
        portOfLoading: parentShipment.portOfLoading || '',
        portOfDischarge: parentShipment.portOfDischarge || 'Cảng Cát Lái',
        status: it.status || parentShipment.status || 'Hoàn tất',
        notes: (parentShipment.notes || it.notes || '').replace(/S\?i/g, 'Sợi')
      };
    });

    // Populate Product Dropdown
    populateProductDropdown();

    // Populate Supplier Multi-select Dropdown
    populateSupplierDropdown();

    // Perform initial filtering & render
    applyFiltersAndRender();
  } catch (err) {
    console.error('Error loading report data:', err);
    toast('Không thể nạp dữ liệu báo cáo. Vui lòng thử lại.', 'error');
  }
}

// ─── Dropdowns Setup ─────────────────────────────────────────────────────────
function populateProductDropdown() {
  const select = document.getElementById('reportProductSelect');
  if (!select) return;

  // Extract distinct products from raw data + products master
  const productMap = new Map();
  allProducts.forEach(p => {
    if (p.id) productMap.set(p.id, `${p.sku} - ${p.name}`);
  });
  rawHistoryData.forEach(r => {
    if (r.productId && !productMap.has(r.productId)) {
      productMap.set(r.productId, `${r.sku} - ${r.productName}`);
    }
  });

  let html = `<option value="">-- Tất cả mặt hàng (${productMap.size}) --</option>`;
  for (const [id, label] of productMap.entries()) {
    const isSelected = filterState.productId === id ? 'selected' : '';
    html += `<option value="${id}" ${isSelected}>${label}</option>`;
  }
  select.innerHTML = html;
}

function populateSupplierDropdown() {
  const container = document.getElementById('supplierListContainer');
  if (!container) return;

  // Distinct suppliers from raw data + allSuppliers
  const supplierMap = new Map();
  allSuppliers.forEach(s => {
    supplierMap.set(s.id, { id: s.id, name: s.companyName, country: s.country || '' });
  });
  rawHistoryData.forEach(r => {
    if (r.partnerId && !supplierMap.has(r.partnerId)) {
      supplierMap.set(r.partnerId, { id: r.partnerId, name: r.partnerName, country: r.partnerCountry || '' });
    } else if (r.partnerName && !Array.from(supplierMap.values()).some(x => x.name === r.partnerName)) {
      supplierMap.set(r.partnerName, { id: r.partnerName, name: r.partnerName, country: r.partnerCountry || '' });
    }
  });

  const suppList = Array.from(supplierMap.values());
  if (suppList.length === 0) {
    container.innerHTML = `<div style="padding:10px; color:#94a3b8; font-size:12px; text-align:center;">Không có dữ liệu đối tác</div>`;
    return;
  }

  let html = '';
  suppList.forEach(s => {
    const checked = filterState.supplierIds.includes(s.id) || filterState.supplierIds.includes(s.name) ? 'checked' : '';
    html += `
      <label class="supplier-item-label" data-id="${s.id}" data-name="${s.name}">
        <input type="checkbox" class="supplier-checkbox" value="${s.id}" ${checked}>
        <span class="supplier-item-name">${s.name}</span>
        ${s.country ? `<span class="supplier-item-country">${s.country}</span>` : ''}
      </label>
    `;
  });
  container.innerHTML = html;

  // Add click handlers on checkboxes
  container.querySelectorAll('.supplier-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      syncSupplierSelectionFromCheckboxes();
      applyFiltersAndRender();
    });
  });

  updateSupplierTriggerUI();
}

function syncSupplierSelectionFromCheckboxes() {
  const checkboxes = document.querySelectorAll('#supplierListContainer .supplier-checkbox:checked');
  filterState.supplierIds = Array.from(checkboxes).map(cb => cb.value);
  updateSupplierTriggerUI();
}

function updateSupplierTriggerUI() {
  const triggerText = document.getElementById('supplierTriggerText');
  const countLabel = document.getElementById('supplierCountLabel');
  const badgeContainer = document.getElementById('supplierTriggerBadgeContainer');
  if (!triggerText) return;

  const count = filterState.supplierIds.length;
  if (count === 0) {
    triggerText.textContent = '-- Tất cả nhà cung cấp --';
    if (countLabel) countLabel.textContent = 'Tất cả';
    if (badgeContainer) badgeContainer.innerHTML = '';
  } else if (count === 1) {
    // Find name
    const found = allSuppliers.find(s => s.id === filterState.supplierIds[0]) || { companyName: filterState.supplierIds[0] };
    triggerText.textContent = found.companyName || found.name || '1 nhà cung cấp';
    if (countLabel) countLabel.textContent = '1 NCC';
    if (badgeContainer) badgeContainer.innerHTML = `<span class="supplier-trigger-badge">1</span>`;
  } else {
    triggerText.textContent = `Đã chọn ${count} nhà cung cấp`;
    if (countLabel) countLabel.textContent = `${count} NCC`;
    if (badgeContainer) badgeContainer.innerHTML = `<span class="supplier-trigger-badge">${count}</span>`;
  }
}

// ─── Filter Processing Engine ────────────────────────────────────────────────
function getFilteredData() {
  let list = [...rawHistoryData];

  // 1. Type mode (Import / Export)
  if (shipmentTypeMode && shipmentTypeMode !== 'All') {
    list = list.filter(item => (item.shipmentType || '').toLowerCase() === shipmentTypeMode.toLowerCase());
  }

  // 2. Keyword Filter (matches DTy, sku, name, shipment, invoice, declaration, partner, etc.)
  if (filterState.keyword && filterState.keyword.trim() !== '') {
    const q = filterState.keyword.trim().toLowerCase();
    list = list.filter(item => {
      return (
        (item.sku && item.sku.toLowerCase().includes(q)) ||
        (item.productName && item.productName.toLowerCase().includes(q)) ||
        (item.shipmentCode && item.shipmentCode.toLowerCase().includes(q)) ||
        (item.partnerName && item.partnerName.toLowerCase().includes(q)) ||
        (item.invoiceNumber && item.invoiceNumber.toLowerCase().includes(q)) ||
        (item.declarationNumber && item.declarationNumber.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q)) ||
        (item.portOfDischarge && item.portOfDischarge.toLowerCase().includes(q)) ||
        (item.portOfLoading && item.portOfLoading.toLowerCase().includes(q))
      );
    });
  }

  // 3. Multi-Select Supplier Filter
  if (filterState.supplierIds && filterState.supplierIds.length > 0) {
    const allowed = new Set(filterState.supplierIds);
    list = list.filter(item => {
      return allowed.has(item.partnerId) || allowed.has(item.partnerName);
    });
  }

  // 4. Product Filter
  if (filterState.productId) {
    list = list.filter(item => item.productId === filterState.productId);
  }

  // 5. Date Range Filter
  if (filterState.dateFrom) {
    list = list.filter(item => item.date >= filterState.dateFrom);
  }
  if (filterState.dateTo) {
    list = list.filter(item => item.date <= filterState.dateTo);
  }

  // 6. Quantity Range Filter
  if (filterState.minQuantity !== null && filterState.minQuantity !== undefined && filterState.minQuantity !== '') {
    const min = Number(filterState.minQuantity);
    list = list.filter(item => item.quantity >= min);
  }
  if (filterState.maxQuantity !== null && filterState.maxQuantity !== undefined && filterState.maxQuantity !== '') {
    const max = Number(filterState.maxQuantity);
    list = list.filter(item => item.quantity <= max);
  }

  // 7. Amount Range Filter
  if (filterState.minAmount !== null && filterState.minAmount !== undefined && filterState.minAmount !== '') {
    const min = Number(filterState.minAmount);
    list = list.filter(item => item.totalAmount >= min);
  }
  if (filterState.maxAmount !== null && filterState.maxAmount !== undefined && filterState.maxAmount !== '') {
    const max = Number(filterState.maxAmount);
    list = list.filter(item => item.totalAmount <= max);
  }

  // 8. Sorting
  if (sortState.column) {
    const col = sortState.column;
    const dir = sortState.direction === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      let va = a[col];
      let vb = b[col];
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      if (typeof va === 'number' && typeof vb === 'number') {
        return (va - vb) * dir;
      }
      return String(va).localeCompare(String(vb)) * dir;
    });
  }

  return list;
}

// ─── Render Engine ───────────────────────────────────────────────────────────
function applyFiltersAndRender() {
  const filtered = getFilteredData();

  // 1. Update KPI Summary Cards
  updateKpiCards(filtered);

  // 2. Update Active Badges
  renderActiveBadges();

  // 3. Update Tab Badges Count
  updateTabCounts(filtered);

  // 4. Update Advanced Filter Active Dot Indicator
  updateAdvFilterBadge();

  // 4. Render Table according to active view
  if (activeReportTab === 'detailed') {
    renderDetailedTable(filtered);
  } else if (activeReportTab === 'by-supplier') {
    renderSupplierSummaryTable(filtered);
  } else if (activeReportTab === 'by-product') {
    renderProductSummaryTable(filtered);
  }

  // 5. Update Pagination Bar
  updatePagination(filtered);
}

// ─── KPI Update ──────────────────────────────────────────────────────────────
function updateKpiCards(data) {
  const totalQty = data.reduce((sum, it) => sum + (it.quantity || 0), 0);

  // Giao dịch USD
  const usdItems = data.filter(it => it.currency === 'USD');
  const totalValUsd = usdItems.reduce((sum, it) => sum + (it.totalAmount || 0), 0);
  const usdQty = usdItems.reduce((sum, it) => sum + (it.quantity || 0), 0);
  const avgUsdPrice = usdQty > 0 ? (totalValUsd / usdQty) : 0;

  // Giao dịch VNĐ (nội địa / tiền đồng) — Không tự ý quy đổi tỷ giá
  const vndItems = data.filter(it => it.currency !== 'USD');
  const totalValVnd = vndItems.reduce((sum, it) => sum + (it.totalAmount || 0), 0);

  const distinctShipments = new Set(data.map(it => it.shipmentCode || it.shipmentId)).size;
  const distinctSuppliers = new Set(data.map(it => it.partnerName)).size;
  const distinctProducts = new Set(data.map(it => it.sku || it.productName)).size;

  const elQty = document.getElementById('kpiTotalQuantity');
  const elQtySub = document.getElementById('kpiQuantitySub');
  const elUsd = document.getElementById('kpiTotalValueUsd');
  const elAvg = document.getElementById('kpiAvgUnitPrice');
  const elVnd = document.getElementById('kpiTotalValueVnd');
  const elVndSub = document.getElementById('kpiExchangeRateNote');
  const elShip = document.getElementById('kpiTotalShipments');
  const elPart = document.getElementById('kpiPartnersCount');

  if (elQty) elQty.textContent = `${totalQty.toLocaleString('vi-VN')} kg`;
  if (elQtySub) elQtySub.textContent = `≈ ${(totalQty / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tấn hàng`;
  
  if (elUsd) elUsd.textContent = `$${totalValUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (elAvg) elAvg.textContent = `${usdItems.length} dòng USD • ĐTB: $${avgUsdPrice.toFixed(2)}/kg`;

  if (elVnd) elVnd.textContent = `${Math.round(totalValVnd).toLocaleString('vi-VN')} ₫`;
  if (elVndSub) {
    elVndSub.textContent = vndItems.length > 0
      ? `${vndItems.length} dòng VNĐ (hàng nội địa / tiền đồng)`
      : `0 dòng hàng VNĐ`;
  }

  if (elShip) elShip.textContent = `${distinctShipments} lô hàng (${data.length} dòng)`;
  if (elPart) elPart.textContent = `${distinctSuppliers} ${shipmentTypeMode === 'Import' ? 'NCC' : 'khách'} • ${distinctProducts} mã hàng`;
}

// ─── Tab Counts ──────────────────────────────────────────────────────────────
function updateTabCounts(filtered) {
  const badgeDetailed = document.getElementById('badgeDetailedCount');
  const badgeSupplier = document.getElementById('badgeSupplierCount');
  const badgeProduct = document.getElementById('badgeProductCount');
  const metaResult = document.getElementById('reportsResultMeta');

  if (badgeDetailed) badgeDetailed.textContent = filtered.length;

  const supplierGroups = groupDataBySupplier(filtered);
  if (badgeSupplier) badgeSupplier.textContent = supplierGroups.length;

  const productGroups = groupDataByProduct(filtered);
  if (badgeProduct) badgeProduct.textContent = productGroups.length;

  if (metaResult) {
    metaResult.innerHTML = `Tìm thấy <b>${filtered.length}</b> bản ghi phù hợp điều kiện lọc`;
  }
}

function updateAdvFilterBadge() {
  const dot = document.getElementById('advFilterBadge');
  if (!dot) return;
  const isAdvActive = Boolean(
    (filterState.datePreset === 'custom' && (filterState.dateFrom || filterState.dateTo)) ||
    filterState.minQuantity || filterState.maxQuantity ||
    filterState.minAmount || filterState.maxAmount
  );
  dot.style.display = isAdvActive ? 'inline-block' : 'none';
}

// ─── Active Badges Strip ─────────────────────────────────────────────────────
function renderActiveBadges() {
  const strip = document.getElementById('filterBadgesStrip');
  if (!strip) return;

  const badges = [];

  if (filterState.keyword) {
    badges.push({
      label: `Từ khóa: "${filterState.keyword}"`,
      clear: () => {
        filterState.keyword = '';
        const inp = document.getElementById('reportSearchInput');
        if (inp) inp.value = '';
      }
    });
  }

  if (filterState.supplierIds.length > 0) {
    filterState.supplierIds.forEach(sId => {
      const found = allSuppliers.find(s => s.id === sId) || { companyName: sId };
      const name = found.companyName || found.name || sId;
      badges.push({
        label: `NCC: ${name}`,
        clear: () => {
          filterState.supplierIds = filterState.supplierIds.filter(id => id !== sId);
          // uncheck in dropdown
          const cb = document.querySelector(`#supplierListContainer .supplier-checkbox[value="${sId}"]`);
          if (cb) cb.checked = false;
          updateSupplierTriggerUI();
        }
      });
    });
  }

  if (filterState.productId) {
    const p = allProducts.find(x => x.id === filterState.productId);
    badges.push({
      label: `Mặt hàng: ${p ? p.sku : filterState.productId}`,
      clear: () => {
        filterState.productId = '';
        const sel = document.getElementById('reportProductSelect');
        if (sel) sel.value = '';
      }
    });
  }

  if (filterState.dateFrom || filterState.dateTo) {
    badges.push({
      label: `Ngày: ${filterState.dateFrom || '...'} → ${filterState.dateTo || '...'}`,
      clear: () => {
        filterState.dateFrom = '';
        filterState.dateTo = '';
        filterState.datePreset = 'all';
        const p = document.getElementById('reportDatePreset');
        const df = document.getElementById('reportDateFrom');
        const dt = document.getElementById('reportDateTo');
        if (p) p.value = 'all';
        if (df) df.value = '';
        if (dt) dt.value = '';
      }
    });
  }

  if (filterState.minQuantity || filterState.maxQuantity) {
    badges.push({
      label: `SL: ${filterState.minQuantity || 0} - ${filterState.maxQuantity || '∞'} kg`,
      clear: () => {
        filterState.minQuantity = null;
        filterState.maxQuantity = null;
        const mi = document.getElementById('reportMinQty');
        const ma = document.getElementById('reportMaxQty');
        if (mi) mi.value = '';
        if (ma) ma.value = '';
      }
    });
  }

  if (filterState.minAmount || filterState.maxAmount) {
    badges.push({
      label: `Tiền: $${filterState.minAmount || 0} - $${filterState.maxAmount || '∞'}`,
      clear: () => {
        filterState.minAmount = null;
        filterState.maxAmount = null;
        const mi = document.getElementById('reportMinAmount');
        const ma = document.getElementById('reportMaxAmount');
        if (mi) mi.value = '';
        if (ma) ma.value = '';
      }
    });
  }

  if (badges.length === 0) {
    strip.style.display = 'none';
    strip.innerHTML = '';
    return;
  }

  strip.style.display = 'flex';
  let html = `<span style="font-weight:600; color:#475569;">Đang lọc theo:</span>`;
  badges.forEach((b, idx) => {
    html += `
      <span class="filter-badge-item" data-badge-index="${idx}">
        <span>${b.label}</span>
        <span class="badge-close" title="Xóa điều kiện này">&times;</span>
      </span>
    `;
  });

  html += `
    <button class="btn btn-secondary btn-sm" id="btnStripResetAll" style="padding:1px 8px; font-size:11.5px; border-radius:4px; margin-left:4px;">
      ✕ Xóa tất cả lọc
    </button>
  `;
  strip.innerHTML = html;

  // Add click handlers
  strip.querySelectorAll('.filter-badge-item').forEach((itemEl, idx) => {
    itemEl.querySelector('.badge-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      badges[idx].clear();
      applyFiltersAndRender();
    });
  });

  strip.querySelector('#btnStripResetAll')?.addEventListener('click', () => {
    resetAllFilters();
  });
}

// ─── Table 1: Detailed Line Items ───────────────────────────────────────────
function renderDetailedTable(data) {
  const container = document.getElementById('reportTableResponsive');
  if (!container) return;

  if (data.length === 0) {
    container.innerHTML = `
      <div style="padding: 60px 20px; text-align: center; color: #64748b;">
        <div style="font-size: 36px; margin-bottom: 10px;">🔍</div>
        <h3 style="font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 6px;">Không tìm thấy dữ liệu phù hợp</h3>
        <p style="font-size: 13px; max-width: 440px; margin: 0 auto 16px auto;">
          Không có giao dịch nào thỏa mãn bộ điều kiện lọc hiện tại. Thử nới lỏng từ khóa hoặc nhấn "Đặt lại" để xem toàn bộ.
        </p>
        <button class="btn btn-primary" onclick="window.xnkResetReportFilters()" style="margin: 0 auto;">
          ${ICONS.reset} Đặt lại điều kiện lọc
        </button>
      </div>
    `;
    return;
  }

  // Calculate paginated slice
  const startIdx = (paginationState.page - 1) * paginationState.pageSize;
  const pagedItems = data.slice(startIdx, startIdx + paginationState.pageSize);

  // Compute Total Summary Row
  const totalQty = data.reduce((s, x) => s + (x.quantity || 0), 0);
  const usdItems = data.filter(x => x.currency === 'USD');
  const totalUsd = usdItems.reduce((s, x) => s + (x.totalAmount || 0), 0);
  const vndItems = data.filter(x => x.currency !== 'USD');
  const totalVnd = vndItems.reduce((s, x) => s + (x.totalAmount || 0), 0);

  const visibleCols = activeColumns.filter(c => c.visible);

  let html = `
    <table class="misa-report-table" id="detailedReportTable">
      <thead>
        <tr>
          <th style="width: 40px; text-align: center;">STT</th>
  `;

  visibleCols.forEach(col => {
    const isSorted = sortState.column === col.id;
    const sortIcon = isSorted ? (sortState.direction === 'asc' ? ' ↑' : ' ↓') : '';
    const alignCls = col.align === 'right' ? 'align-right' : (col.align === 'center' ? 'align-center' : '');
    html += `
      <th class="${col.sortable ? 'sortable' : ''} ${alignCls}" data-col="${col.id}">
        ${col.label}${sortIcon}
      </th>
    `;
  });

  html += `
        </tr>
      </thead>
      <tbody>
  `;

  pagedItems.forEach((item, idx) => {
    const rowNum = startIdx + idx + 1;
    html += `<tr>`;
    html += `<td style="text-align:center; color:#94a3b8; font-weight:600;">${rowNum}</td>`;

    visibleCols.forEach(col => {
      html += renderDetailedCell(col.id, item);
    });

    html += `</tr>`;
  });

  html += `
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="text-align:left; font-weight:800; text-transform:uppercase; color:#0266b3;">
            TỔNG CỘNG TOÀN KỲ (${data.length} DÒNG)
          </td>
  `;

  // Render footers matching column alignment
  visibleCols.slice(1).forEach(col => {
    if (col.id === 'quantity') {
      html += `<td class="align-right num-val qty" style="font-weight:800; color:#0266b3;">${totalQty.toLocaleString('vi-VN')} kg</td>`;
    } else if (col.id === 'currency' || col.id === 'unitPrice') {
      html += `<td class="align-center" style="color:#94a3b8; font-weight:700;">-</td>`;
    } else if (col.id === 'totalAmountUsd') {
      html += `<td class="align-right num-val money-usd" style="font-size:13px; font-weight:800;">$${totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>`;
    } else if (col.id === 'totalAmountVnd') {
      html += `<td class="align-right num-val money-vnd" style="font-size:13px; font-weight:800;">${Math.round(totalVnd).toLocaleString('vi-VN')} ₫</td>`;
    } else {
      html += `<td></td>`;
    }
  });

  html += `
        </tr>
      </tfoot>
    </table>
  `;

  container.innerHTML = html;

  // Add click handlers on sortable headers
  container.querySelectorAll('thead th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const colId = th.getAttribute('data-col');
      if (sortState.column === colId) {
        sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
      } else {
        sortState.column = colId;
        sortState.direction = 'asc';
      }
      applyFiltersAndRender();
    });
  });
}

function renderDetailedCell(colId, item) {
  switch (colId) {
    case 'date':
      return `<td><span style="font-weight:600; color:#334155;">${item.date || '-'}</span></td>`;
    case 'shipmentCode':
      return `
        <td>
          <a href="/shipments?id=${item.shipmentId}" class="badge-code" onclick="event.preventDefault(); window.appNavigateTo('shipment-detail', '${item.shipmentId}')" title="Xem chứng từ lô hàng">
            📦 ${item.shipmentCode}
          </a>
        </td>
      `;
    case 'invoiceNumber':
      return `<td><span style="font-family:monospace; font-weight:600; color:#0266b3;">${item.invoiceNumber || '-'}</span></td>`;
    case 'declarationNumber':
      return `<td><span style="font-family:monospace; font-weight:600; color:#b45309;">${item.declarationNumber || '-'}</span></td>`;
    case 'partnerName':
      return `
        <td>
          <div style="font-weight:600; color:#0f172a;">${item.partnerName || '-'}</div>
          ${item.partnerCountry ? `<div style="font-size:11px; color:#64748b;">${item.partnerCountry}</div>` : ''}
        </td>
      `;
    case 'partnerCountry':
      return `<td><span class="badge-status status-draft">${item.partnerCountry || '-'}</span></td>`;
    case 'sku':
      return `<td><span class="badge-code" style="color:#0266b3; background:#eff6ff;">${item.sku || '-'}</span></td>`;
    case 'productName':
      return `<td><span style="font-weight:600; color:#1e293b;">${item.productName || '-'}</span></td>`;
    case 'unit':
      return `<td class="align-center"><span style="color:#64748b;">${item.unit || 'kg'}</span></td>`;
    case 'quantity':
      return `<td class="align-right num-val qty">${(item.quantity || 0).toLocaleString('vi-VN')}</td>`;
    case 'currency':
      return `<td class="align-center"><span class="badge-status ${item.currency === 'USD' ? 'status-usd' : 'status-vnd'}">${item.currency}</span></td>`;
    case 'unitPrice':
      if (item.currency === 'USD') {
        return `<td class="align-right num-val">$${(item.unitPrice || 0).toFixed(2)}</td>`;
      } else {
        return `<td class="align-right num-val">${(item.unitPrice || 0).toLocaleString('vi-VN')} ₫</td>`;
      }
    case 'totalAmountUsd':
      if (item.currency === 'USD' && item.totalAmountUsd !== null) {
        return `<td class="align-right num-val money-usd">$${item.totalAmountUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>`;
      } else {
        return `<td class="align-right num-val" style="color:#cbd5e1;">-</td>`;
      }
    case 'totalAmountVnd':
      if (item.currency !== 'USD' && item.totalAmountVnd !== null) {
        return `<td class="align-right num-val money-vnd">${Math.round(item.totalAmountVnd).toLocaleString('vi-VN')} ₫</td>`;
      } else {
        return `<td class="align-right num-val" style="color:#cbd5e1;">-</td>`;
      }
    case 'deliveryTerm':
      return `<td class="align-center"><span class="badge-status status-draft">${item.deliveryTerm || 'CIF'}</span></td>`;
    case 'portOfDischarge':
      return `<td><span style="font-size:12px; color:#475569;">${item.portOfDischarge || '-'}</span></td>`;
    case 'status':
      return `<td class="align-center"><span class="badge-status status-completed">${item.status || 'Hoàn tất'}</span></td>`;
    case 'notes':
      return `<td><span style="font-size:11.5px; color:#64748b;">${item.notes || '-'}</span></td>`;
    default:
      return `<td>${item[colId] || '-'}</td>`;
  }
}

// ─── Table 2: Summary By Supplier (With Drilldown) ───────────────────────────
function groupDataBySupplier(data) {
  const groups = new Map();

  data.forEach(item => {
    const key = item.partnerName || 'Chưa định danh';
    if (!groups.has(key)) {
      groups.set(key, {
        supplierName: key,
        country: item.partnerCountry || '',
        shipments: new Set(),
        itemsCount: 0,
        totalQuantity: 0,
        totalAmountUsd: 0,
        totalAmountVnd: 0,
        productsMap: new Map() // sku_curr -> { sku, name, unit, currency, quantity, totalAmount, count, latestDate }
      });
    }

    const g = groups.get(key);
    g.shipments.add(item.shipmentCode || item.shipmentId);
    g.itemsCount += 1;
    g.totalQuantity += (item.quantity || 0);

    if (item.currency === 'USD') {
      g.totalAmountUsd += (item.totalAmount || 0);
    } else {
      g.totalAmountVnd += (item.totalAmount || 0);
    }

    // Track product details inside supplier
    const pKey = `${item.sku || item.productName}_${item.currency}`;
    if (!g.productsMap.has(pKey)) {
      g.productsMap.set(pKey, {
        sku: item.sku || '',
        productName: item.productName || '',
        unit: item.unit || 'kg',
        currency: item.currency,
        quantity: 0,
        totalAmount: 0,
        count: 0,
        latestDate: item.date || ''
      });
    }
    const p = g.productsMap.get(pKey);
    p.quantity += (item.quantity || 0);
    p.totalAmount += (item.totalAmount || 0);
    p.count += 1;
    if (item.date && item.date > p.latestDate) p.latestDate = item.date;
  });

  return Array.from(groups.values());
}

function renderSupplierSummaryTable(data) {
  const container = document.getElementById('reportTableResponsive');
  if (!container) return;

  const groups = groupDataBySupplier(data);

  if (groups.length === 0) {
    container.innerHTML = `<div style="padding:40px; text-align:center; color:#64748b;">Không có dữ liệu nhà cung cấp thỏa mãn bộ lọc.</div>`;
    return;
  }

  // Sort groups by totalAmountUsd + totalAmountVnd
  groups.sort((a, b) => (b.totalAmountUsd + b.totalAmountVnd) - (a.totalAmountUsd + a.totalAmountVnd));

  const grandTotalQty = groups.reduce((s, g) => s + g.totalQuantity, 0);
  const grandTotalUsd = groups.reduce((s, g) => s + g.totalAmountUsd, 0);
  const grandTotalVnd = groups.reduce((s, g) => s + g.totalAmountVnd, 0);

  let html = `
    <table class="misa-report-table" id="supplierSummaryTable">
      <thead>
        <tr>
          <th style="width: 44px; text-align: center;"></th>
          <th style="width: 40px; text-align: center;">STT</th>
          <th>Tên Nhà Cung Cấp</th>
          <th>Quốc Gia</th>
          <th class="align-center">Số Lô Hàng</th>
          <th class="align-center">Số Mặt Hàng</th>
          <th class="align-right">Tổng Sản Lượng (kg)</th>
          <th class="align-right">Kim Ngạch ($ USD)</th>
          <th class="align-right">Tổng Tiền (VNĐ)</th>
          <th class="align-right">Tỷ Trọng (%)</th>
        </tr>
      </thead>
      <tbody>
  `;

  groups.forEach((g, idx) => {
    const rowNum = idx + 1;
    const sharePct = grandTotalUsd > 0 && g.totalAmountUsd > 0
      ? ((g.totalAmountUsd / grandTotalUsd) * 100).toFixed(1)
      : (grandTotalVnd > 0 && g.totalAmountVnd > 0 ? ((g.totalAmountVnd / grandTotalVnd) * 100).toFixed(1) : '0.0');
    const isExpanded = expandedGroupKeys.has(`supp_${g.supplierName}`);

    html += `
      <tr class="group-parent-row" data-group-key="supp_${g.supplierName}">
        <td style="text-align: center;">
          <span class="expand-chevron ${isExpanded ? 'rotated' : ''}">${ICONS.chevronRight}</span>
        </td>
        <td style="text-align: center; color: #94a3b8; font-weight: 600;">${rowNum}</td>
        <td>
          <span style="font-weight: 700; color: #0266b3; font-size: 13px;">${g.supplierName}</span>
        </td>
        <td><span class="badge-status status-draft">${g.country || 'Quốc tế'}</span></td>
        <td class="align-center"><span class="badge-code">${g.shipments.size} lô</span></td>
        <td class="align-center"><span style="font-weight:600;">${g.productsMap.size} loại</span></td>
        <td class="align-right num-val qty" style="font-weight:700;">${g.totalQuantity.toLocaleString('vi-VN')} kg</td>
        <td class="align-right num-val money-usd" style="font-weight:700;">${g.totalAmountUsd > 0 ? '$' + g.totalAmountUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '<span style="color:#cbd5e1;">-</span>'}</td>
        <td class="align-right num-val money-vnd" style="font-weight:700;">${g.totalAmountVnd > 0 ? Math.round(g.totalAmountVnd).toLocaleString('vi-VN') + ' ₫' : '<span style="color:#cbd5e1;">-</span>'}</td>
        <td class="align-right num-val" style="font-weight:700; color:#0266b3;">${sharePct}%</td>
      </tr>
      
      <!-- Nested Detailed Products Accordion Row -->
      <tr class="nested-detail-row" id="nested_supp_${encodeURIComponent(g.supplierName)}" style="display: ${isExpanded ? 'table-row' : 'none'};">
        <td colspan="10">
          <div style="padding: 4px 10px;">
            <div style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 8px;">
              📦 Chi tiết các mặt hàng đã nhập từ <span style="color:#0266b3;">${g.supplierName}</span> trong kỳ:
            </div>
            <table class="nested-table">
              <thead>
                <tr>
                  <th style="width: 30px; text-align: center;">#</th>
                  <th>Mã SKU</th>
                  <th>Tên Mặt Hàng / Quy Cách</th>
                  <th style="text-align: center;">Loại Tiền</th>
                  <th style="text-align: right;">Sản Lượng (kg)</th>
                  <th style="text-align: right;">Đơn Giá TB</th>
                  <th style="text-align: right;">Thành Tiền</th>
                  <th style="text-align: center;">Số Lần Nhập</th>
                  <th style="text-align: center;">Ngày Nhập Gần Nhất</th>
                </tr>
              </thead>
              <tbody>
    `;

    const pList = Array.from(g.productsMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);
    pList.forEach((p, pIdx) => {
      const pAvg = p.quantity > 0 ? (p.totalAmount / p.quantity) : 0;
      const isUsd = p.currency === 'USD';
      html += `
        <tr>
          <td style="text-align: center; color: #94a3b8;">${pIdx + 1}</td>
          <td><span class="badge-code" style="color:#0266b3;">${p.sku || '-'}</span></td>
          <td style="font-weight: 600; color: #1e293b;">${p.productName}</td>
          <td style="text-align: center;"><span class="badge-status ${isUsd ? 'status-usd' : 'status-vnd'}">${p.currency}</span></td>
          <td style="text-align: right; font-weight: 700;" class="num-val">${p.quantity.toLocaleString('vi-VN')} kg</td>
          <td style="text-align: right;" class="num-val">${isUsd ? '$' + pAvg.toFixed(2) : Math.round(pAvg).toLocaleString('vi-VN') + ' ₫'}</td>
          <td style="text-align: right; font-weight: 700;" class="num-val ${isUsd ? 'money-usd' : 'money-vnd'}">${isUsd ? '$' + p.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : Math.round(p.totalAmount).toLocaleString('vi-VN') + ' ₫'}</td>
          <td style="text-align: center;"><span class="badge-status status-draft">${p.count} lần</span></td>
          <td style="text-align: center; color: #64748b;">${p.latestDate || '-'}</td>
        </tr>
      `;
    });

    html += `
              </tbody>
            </table>
          </div>
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4" style="font-weight:800; color:#0266b3;">TỔNG CỘNG TOÀN BỘ NHÀ CUNG CẤP</td>
          <td class="align-center" style="font-weight:800;">-</td>
          <td class="align-center" style="font-weight:800;">-</td>
          <td class="align-right num-val qty" style="font-weight:800;">${grandTotalQty.toLocaleString('vi-VN')} kg</td>
          <td class="align-right num-val money-usd" style="font-size:13px; font-weight:800;">$${grandTotalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="align-right num-val money-vnd" style="font-size:13px; font-weight:800;">${Math.round(grandTotalVnd).toLocaleString('vi-VN')} ₫</td>
          <td class="align-right num-val" style="font-weight:800; color:#0266b3;">100%</td>
        </tr>
      </tfoot>
    </table>
  `;

  container.innerHTML = html;

  // Add accordion click handlers
  container.querySelectorAll('.group-parent-row').forEach(tr => {
    tr.addEventListener('click', () => {
      const gKey = tr.getAttribute('data-group-key');
      const suppName = gKey.replace('supp_', '');
      const nestedTr = document.getElementById(`nested_supp_${encodeURIComponent(suppName)}`);
      const chevron = tr.querySelector('.expand-chevron');

      if (!nestedTr || !chevron) return;

      const isHidden = nestedTr.style.display === 'none';
      if (isHidden) {
        nestedTr.style.display = 'table-row';
        chevron.classList.add('rotated');
        expandedGroupKeys.add(gKey);
      } else {
        nestedTr.style.display = 'none';
        chevron.classList.remove('rotated');
        expandedGroupKeys.delete(gKey);
      }
    });
  });
}

// ─── Table 3: Summary By Product (With Supplier Breakdown) ───────────────────
function groupDataByProduct(data) {
  const groups = new Map();

  data.forEach(item => {
    const key = item.sku || item.productName || 'Chưa định danh';
    if (!groups.has(key)) {
      groups.set(key, {
        sku: item.sku || '',
        productName: item.productName || key,
        unit: item.unit || 'kg',
        shipments: new Set(),
        totalQuantity: 0,
        totalAmountUsd: 0,
        totalAmountVnd: 0,
        suppliersMap: new Map() // supp_curr -> { supplierName, country, currency, quantity, totalAmount, count }
      });
    }

    const g = groups.get(key);
    g.shipments.add(item.shipmentCode || item.shipmentId);
    g.totalQuantity += (item.quantity || 0);

    if (item.currency === 'USD') {
      g.totalAmountUsd += (item.totalAmount || 0);
    } else {
      g.totalAmountVnd += (item.totalAmount || 0);
    }

    const supp = item.partnerName || 'Chưa định danh';
    const suppKey = `${supp}_${item.currency}`;
    if (!g.suppliersMap.has(suppKey)) {
      g.suppliersMap.set(suppKey, {
        supplierName: supp,
        country: item.partnerCountry || '',
        currency: item.currency,
        quantity: 0,
        totalAmount: 0,
        count: 0
      });
    }
    const s = g.suppliersMap.get(suppKey);
    s.quantity += (item.quantity || 0);
    s.totalAmount += (item.totalAmount || 0);
    s.count += 1;
  });

  return Array.from(groups.values());
}

function renderProductSummaryTable(data) {
  const container = document.getElementById('reportTableResponsive');
  if (!container) return;

  const groups = groupDataByProduct(data);

  if (groups.length === 0) {
    container.innerHTML = `<div style="padding:40px; text-align:center; color:#64748b;">Không có dữ liệu mặt hàng thỏa mãn bộ lọc.</div>`;
    return;
  }

  // Sort groups by totalAmountUsd + totalAmountVnd desc
  groups.sort((a, b) => (b.totalAmountUsd + b.totalAmountVnd) - (a.totalAmountUsd + a.totalAmountVnd));

  const grandTotalQty = groups.reduce((s, g) => s + g.totalQuantity, 0);
  const grandTotalUsd = groups.reduce((s, g) => s + g.totalAmountUsd, 0);
  const grandTotalVnd = groups.reduce((s, g) => s + g.totalAmountVnd, 0);

  let html = `
    <table class="misa-report-table" id="productSummaryTable">
      <thead>
        <tr>
          <th style="width: 44px; text-align: center;"></th>
          <th style="width: 40px; text-align: center;">STT</th>
          <th>Mã SKU</th>
          <th>Tên Quy Cách Sợi</th>
          <th class="align-center">ĐVT</th>
          <th class="align-center">Số Lô Hàng</th>
          <th>Nhà Cung Cấp</th>
          <th class="align-right">Tổng Sản Lượng (kg)</th>
          <th class="align-right">Kim Ngạch ($ USD)</th>
          <th class="align-right">Tổng Tiền (VNĐ)</th>
          <th class="align-right">Tỷ Trọng (%)</th>
        </tr>
      </thead>
      <tbody>
  `;

  groups.forEach((g, idx) => {
    const rowNum = idx + 1;
    const sharePct = grandTotalUsd > 0 && g.totalAmountUsd > 0
      ? ((g.totalAmountUsd / grandTotalUsd) * 100).toFixed(1)
      : (grandTotalVnd > 0 && g.totalAmountVnd > 0 ? ((g.totalAmountVnd / grandTotalVnd) * 100).toFixed(1) : '0.0');
    const isExpanded = expandedGroupKeys.has(`prod_${g.sku || g.productName}`);

    // Build suppliers badges
    const suppList = Array.from(g.suppliersMap.values());
    const distinctSuppNames = [...new Set(suppList.map(s => s.supplierName))];
    const suppDisplay = distinctSuppNames.map(name => `<span class="badge-status status-draft" style="font-size:11px;">${name}</span>`).join(' ');

    html += `
      <tr class="group-parent-row" data-group-key="prod_${g.sku || g.productName}">
        <td style="text-align: center;">
          <span class="expand-chevron ${isExpanded ? 'rotated' : ''}">${ICONS.chevronRight}</span>
        </td>
        <td style="text-align: center; color: #94a3b8; font-weight: 600;">${rowNum}</td>
        <td><span class="badge-code" style="color:#0266b3; background:#eff6ff;">${g.sku || '-'}</span></td>
        <td><span style="font-weight: 700; color: #1e293b;">${g.productName}</span></td>
        <td class="align-center">${g.unit}</td>
        <td class="align-center"><span class="badge-code">${g.shipments.size} lô</span></td>
        <td>${suppDisplay}</td>
        <td class="align-right num-val qty" style="font-weight:700;">${g.totalQuantity.toLocaleString('vi-VN')}</td>
        <td class="align-right num-val money-usd" style="font-weight:700;">${g.totalAmountUsd > 0 ? '$' + g.totalAmountUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '<span style="color:#cbd5e1;">-</span>'}</td>
        <td class="align-right num-val money-vnd" style="font-weight:700;">${g.totalAmountVnd > 0 ? Math.round(g.totalAmountVnd).toLocaleString('vi-VN') + ' ₫' : '<span style="color:#cbd5e1;">-</span>'}</td>
        <td class="align-right num-val" style="font-weight:700; color:#0266b3;">${sharePct}%</td>
      </tr>

      <!-- Nested Suppliers Breakdown Row -->
      <tr class="nested-detail-row" id="nested_prod_${encodeURIComponent(g.sku || g.productName)}" style="display: ${isExpanded ? 'table-row' : 'none'};">
        <td colspan="11">
          <div style="padding: 4px 10px;">
            <div style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 8px;">
              🏢 Các nhà cung cấp đã cung ứng mặt hàng <span style="color:#0266b3;">${g.productName} (${g.sku})</span>:
            </div>
            <table class="nested-table">
              <thead>
                <tr>
                  <th style="width: 30px; text-align: center;">#</th>
                  <th>Tên Nhà Cung Cấp</th>
                  <th>Quốc Gia</th>
                  <th style="text-align: center;">Loại Tiền</th>
                  <th style="text-align: right;">Sản Lượng (kg)</th>
                  <th style="text-align: right;">Đơn Giá TB</th>
                  <th style="text-align: right;">Thành Tiền</th>
                  <th style="text-align: center;">Số Lần Giao</th>
                </tr>
              </thead>
              <tbody>
    `;

    suppList.forEach((s, sIdx) => {
      const sAvg = s.quantity > 0 ? (s.totalAmount / s.quantity) : 0;
      const isUsd = s.currency === 'USD';
      html += `
        <tr>
          <td style="text-align: center; color: #94a3b8;">${sIdx + 1}</td>
          <td style="font-weight: 600; color: #0266b3;">${s.supplierName}</td>
          <td><span class="badge-status status-draft">${s.country || 'Quốc tế'}</span></td>
          <td style="text-align: center;"><span class="badge-status ${isUsd ? 'status-usd' : 'status-vnd'}">${s.currency}</span></td>
          <td style="text-align: right; font-weight: 700;" class="num-val">${s.quantity.toLocaleString('vi-VN')} kg</td>
          <td style="text-align: right;" class="num-val">${isUsd ? '$' + sAvg.toFixed(2) : Math.round(sAvg).toLocaleString('vi-VN') + ' ₫'}</td>
          <td style="text-align: right; font-weight: 700;" class="num-val ${isUsd ? 'money-usd' : 'money-vnd'}">${isUsd ? '$' + s.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : Math.round(s.totalAmount).toLocaleString('vi-VN') + ' ₫'}</td>
          <td style="text-align: center;"><span class="badge-status status-draft">${s.count} lần</span></td>
        </tr>
      `;
    });

    html += `
              </tbody>
            </table>
          </div>
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5" style="font-weight:800; color:#0266b3;">TỔNG CỘNG TOÀN BỘ MẶT HÀNG</td>
          <td class="align-center" style="font-weight:800;">-</td>
          <td></td>
          <td class="align-right num-val qty" style="font-weight:800;">${grandTotalQty.toLocaleString('vi-VN')} kg</td>
          <td class="align-right num-val money-usd" style="font-size:13px; font-weight:800;">$${grandTotalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="align-right num-val money-vnd" style="font-size:13px; font-weight:800;">${Math.round(grandTotalVnd).toLocaleString('vi-VN')} ₫</td>
          <td class="align-right num-val" style="font-weight:800; color:#0266b3;">100%</td>
        </tr>
      </tfoot>
    </table>
  `;

  container.innerHTML = html;

  // Add accordion click handlers
  container.querySelectorAll('.group-parent-row').forEach(tr => {
    tr.addEventListener('click', () => {
      const gKey = tr.getAttribute('data-group-key');
      const keyName = gKey.replace('prod_', '');
      const nestedTr = document.getElementById(`nested_prod_${encodeURIComponent(keyName)}`);
      const chevron = tr.querySelector('.expand-chevron');

      if (!nestedTr || !chevron) return;

      const isHidden = nestedTr.style.display === 'none';
      if (isHidden) {
        nestedTr.style.display = 'table-row';
        chevron.classList.add('rotated');
        expandedGroupKeys.add(gKey);
      } else {
        nestedTr.style.display = 'none';
        chevron.classList.remove('rotated');
        expandedGroupKeys.delete(gKey);
      }
    });
  });
}

// ─── Pagination Controls ─────────────────────────────────────────────────────
function updatePagination(data) {
  const infoEl = document.getElementById('paginationInfo');
  const navEl = document.getElementById('paginationNav');
  const sizeSelect = document.getElementById('reportPageSize');
  if (!infoEl || !navEl) return;

  const total = data.length;
  if (total === 0) {
    infoEl.textContent = 'Tổng số: 0 bản ghi';
    navEl.innerHTML = '';
    return;
  }

  const { page, pageSize } = paginationState;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  infoEl.textContent = `Hiển thị ${start} - ${end} trên tổng số ${total} bản ghi`;

  if (sizeSelect && Number(sizeSelect.value) !== pageSize) {
    sizeSelect.value = pageSize;
  }

  // Generate pagination buttons
  let html = `
    <button class="page-btn" id="btnPageFirst" ${page <= 1 ? 'disabled' : ''} title="Trang đầu">&laquo;</button>
    <button class="page-btn" id="btnPagePrev" ${page <= 1 ? 'disabled' : ''} title="Trang trước">&lsaquo;</button>
  `;

  // Sliding window of page numbers
  const maxButtons = 5;
  let startPage = Math.max(1, page - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  if (endPage - startPage < maxButtons - 1) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `
      <button class="page-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>
    `;
  }

  html += `
    <button class="page-btn" id="btnPageNext" ${page >= totalPages ? 'disabled' : ''} title="Trang sau">&rsaquo;</button>
    <button class="page-btn" id="btnPageLast" ${page >= totalPages ? 'disabled' : ''} title="Trang cuối">&raquo;</button>
  `;

  navEl.innerHTML = html;

  // Add click handlers
  navEl.querySelectorAll('button[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      paginationState.page = Number(btn.getAttribute('data-page'));
      applyFiltersAndRender();
    });
  });

  navEl.querySelector('#btnPageFirst')?.addEventListener('click', () => {
    paginationState.page = 1;
    applyFiltersAndRender();
  });

  navEl.querySelector('#btnPagePrev')?.addEventListener('click', () => {
    if (paginationState.page > 1) {
      paginationState.page -= 1;
      applyFiltersAndRender();
    }
  });

  navEl.querySelector('#btnPageNext')?.addEventListener('click', () => {
    if (paginationState.page < totalPages) {
      paginationState.page += 1;
      applyFiltersAndRender();
    }
  });

  navEl.querySelector('#btnPageLast')?.addEventListener('click', () => {
    paginationState.page = totalPages;
    applyFiltersAndRender();
  });
}

// ─── Reset All Filters ───────────────────────────────────────────────────────
function resetAllFilters() {
  filterState = {
    keyword: '',
    supplierIds: [],
    datePreset: 'all',
    dateFrom: '',
    dateTo: '',
    productId: '',
    minQuantity: null,
    maxQuantity: null,
    minAmount: null,
    maxAmount: null
  };

  paginationState.page = 1;

  // Reset Form inputs
  const searchInp = document.getElementById('reportSearchInput');
  const datePreset = document.getElementById('reportDatePreset');
  const dateFrom = document.getElementById('reportDateFrom');
  const dateTo = document.getElementById('reportDateTo');
  const prodSelect = document.getElementById('reportProductSelect');
  const minQty = document.getElementById('reportMinQty');
  const maxQty = document.getElementById('reportMaxQty');
  const minAmt = document.getElementById('reportMinAmount');
  const maxAmt = document.getElementById('reportMaxAmount');

  if (searchInp) searchInp.value = '';
  if (datePreset) datePreset.value = 'all';
  if (dateFrom) dateFrom.value = '';
  if (dateTo) dateTo.value = '';
  if (prodSelect) prodSelect.value = '';
  if (minQty) minQty.value = '';
  if (maxQty) maxQty.value = '';
  if (minAmt) minAmt.value = '';
  if (maxAmt) maxAmt.value = '';

  // Uncheck all supplier checkboxes
  document.querySelectorAll('#supplierListContainer .supplier-checkbox').forEach(cb => {
    cb.checked = false;
  });

  // Collapse advanced filters row on reset
  const secRow = document.getElementById('filterSecondaryRow');
  if (secRow) secRow.style.display = 'none';
  document.getElementById('btnToggleAdvancedFilter')?.classList.remove('active');

  updateSupplierTriggerUI();
  applyFiltersAndRender();
  toast('Đã đặt lại toàn bộ điều kiện lọc về mặc định', 'info');
}

window.xnkResetReportFilters = resetAllFilters;

// ─── Column Configuration Modal ──────────────────────────────────────────────
function openColumnConfigModal() {
  let bodyHtml = `
    <div style="font-size:13px; color:#475569; margin-bottom:12px;">
      Chọn các cột thông tin cần hiển thị trong bảng chi tiết báo cáo:
    </div>
    <div class="col-config-grid" id="colConfigList">
  `;

  activeColumns.forEach(col => {
    bodyHtml += `
      <label class="col-config-item">
        <input type="checkbox" data-col-id="${col.id}" ${col.visible ? 'checked' : ''}>
        <span style="font-weight:500; color:#1e293b;">${col.label}</span>
      </label>
    `;
  });

  bodyHtml += `</div>`;

  const footerHtml = `
    <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
      <div>
        <button class="btn btn-secondary btn-sm" id="btnColSelectAll">Chọn tất cả</button>
        <button class="btn btn-secondary btn-sm" id="btnColDeselectAll">Bỏ chọn tất cả</button>
        <button class="btn btn-secondary btn-sm" id="btnColRestoreDefault">Mặc định</button>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-secondary" onclick="window.closeModal()">Đóng</button>
        <button class="btn btn-primary" id="btnSaveColumns">Áp dụng</button>
      </div>
    </div>
  `;

  openModal('⚙️ Tùy Chọn Cột Hiển Thị Báo Cáo', bodyHtml, footerHtml);

  // Modal events
  document.getElementById('btnColSelectAll')?.addEventListener('click', () => {
    document.querySelectorAll('#colConfigList input[type="checkbox"]').forEach(cb => cb.checked = true);
  });

  document.getElementById('btnColDeselectAll')?.addEventListener('click', () => {
    document.querySelectorAll('#colConfigList input[type="checkbox"]').forEach(cb => cb.checked = false);
  });

  document.getElementById('btnColRestoreDefault')?.addEventListener('click', () => {
    activeColumns.forEach(col => {
      const cb = document.querySelector(`#colConfigList input[data-col-id="${col.id}"]`);
      if (cb) cb.checked = col.default;
    });
  });

  document.getElementById('btnSaveColumns')?.addEventListener('click', () => {
    document.querySelectorAll('#colConfigList input[type="checkbox"]').forEach(cb => {
      const colId = cb.getAttribute('data-col-id');
      const found = activeColumns.find(c => c.id === colId);
      if (found) found.visible = cb.checked;
    });

    saveStoredColumns(activeColumns);
    closeModal();
    applyFiltersAndRender();
    toast('Đã lưu cấu hình cột hiển thị!', 'success');
  });
}

// ─── Export to Excel (SheetJS) ────────────────────────────────────────────────
function exportToExcel() {
  if (typeof XLSX === 'undefined') {
    toast('Thư viện xuất Excel (SheetJS) chưa sẵn sàng.', 'error');
    return;
  }

  const filtered = getFilteredData();
  if (filtered.length === 0) {
    toast('Không có dữ liệu để xuất Excel!', 'warning');
    return;
  }

  toast('Đang khởi tạo file Excel báo cáo...', 'info');

  const wb = XLSX.utils.book_new();

  if (activeReportTab === 'detailed') {
    // 1. Detailed Sheet
    const visibleCols = activeColumns.filter(c => c.visible);
    const headers = ['STT', ...visibleCols.map(c => c.label)];

    const rows = [headers];

    filtered.forEach((item, idx) => {
      const row = [idx + 1];
      visibleCols.forEach(col => {
        let val = item[col.id];
        if (col.id === 'totalAmountUsd') val = item.currency === 'USD' ? item.totalAmount : '';
        else if (col.id === 'totalAmountVnd') val = item.currency !== 'USD' ? Math.round(item.totalAmount) : '';
        else if (val === null || val === undefined) val = '';
        row.push(val);
      });
      rows.push(row);
    });

    // Total Row
    const totalQty = filtered.reduce((s, x) => s + (x.quantity || 0), 0);
    const totalUsd = filtered.filter(x => x.currency === 'USD').reduce((s, x) => s + (x.totalAmount || 0), 0);
    const totalVnd = filtered.filter(x => x.currency !== 'USD').reduce((s, x) => s + (x.totalAmount || 0), 0);

    const totalRow = ['TỔNG CỘNG'];
    visibleCols.forEach(col => {
      if (col.id === 'quantity') totalRow.push(totalQty);
      else if (col.id === 'totalAmountUsd') totalRow.push(totalUsd);
      else if (col.id === 'totalAmountVnd') totalRow.push(Math.round(totalVnd));
      else totalRow.push('');
    });
    rows.push(totalRow);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'ChiTiet_HangNhap');

  } else if (activeReportTab === 'by-supplier') {
    // 2. Supplier Summary Sheet
    const groups = groupDataBySupplier(filtered);
    const headers = ['STT', 'Nhà Cung Cấp', 'Quốc Gia', 'Số Lô Hàng', 'Số Loại Hàng', 'Sản Lượng (kg)', 'Kim Ngạch ($ USD)', 'Tổng Tiền (VNĐ)'];
    const rows = [headers];

    groups.forEach((g, idx) => {
      rows.push([
        idx + 1,
        g.supplierName,
        g.country || '',
        g.shipments.size,
        g.productsMap.size,
        g.totalQuantity,
        g.totalAmountUsd > 0 ? g.totalAmountUsd : '',
        g.totalAmountVnd > 0 ? Math.round(g.totalAmountVnd) : ''
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'TongHop_NhaCungCap');

  } else {
    // 3. Product Summary Sheet
    const groups = groupDataByProduct(filtered);
    const headers = ['STT', 'Mã SKU', 'Tên Mặt Hàng', 'ĐVT', 'Số Lô', 'Sản Lượng (kg)', 'Kim Ngạch ($ USD)', 'Tổng Tiền (VNĐ)'];
    const rows = [headers];

    groups.forEach((g, idx) => {
      rows.push([
        idx + 1,
        g.sku,
        g.productName,
        g.unit,
        g.shipments.size,
        g.totalQuantity,
        g.totalAmountUsd > 0 ? g.totalAmountUsd : '',
        g.totalAmountVnd > 0 ? Math.round(g.totalAmountVnd) : ''
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'TongHop_MatHang');
  }

  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const fileName = `BaoCao_${shipmentTypeMode}_${todayStr}.xlsx`;

  XLSX.writeFile(wb, fileName);
  toast(`Đã xuất thành công file ${fileName}`, 'success');
}

// ─── Setup Events ────────────────────────────────────────────────────────────
function setupReportEvents() {
  // Mode toggle (Import vs Export)
  document.getElementById('btnToggleImport')?.addEventListener('click', () => {
    shipmentTypeMode = 'Import';
    const hTitle = document.getElementById('reportHeaderMainTitle');
    if (hTitle) hTitle.textContent = 'Báo Cáo Nhập Khẩu Hàng Hóa & Nhà Cung Cấp';
    document.getElementById('btnToggleImport')?.classList.replace('btn-secondary', 'btn-blue');
    document.getElementById('btnToggleExport')?.classList.replace('btn-blue', 'btn-secondary');
    loadReportData();
  });

  document.getElementById('btnToggleExport')?.addEventListener('click', () => {
    shipmentTypeMode = 'Export';
    const hTitle = document.getElementById('reportHeaderMainTitle');
    if (hTitle) hTitle.textContent = 'Báo Cáo Xuất Khẩu Hàng Hóa';
    document.getElementById('btnToggleExport')?.classList.replace('btn-secondary', 'btn-blue');
    document.getElementById('btnToggleImport')?.classList.replace('btn-blue', 'btn-secondary');
    loadReportData();
  });

  // Action Buttons
  document.getElementById('btnRefreshReport')?.addEventListener('click', () => {
    toast('Đang nạp lại dữ liệu...', 'info');
    loadReportData();
  });

  document.getElementById('btnConfigureColumns')?.addEventListener('click', () => {
    openColumnConfigModal();
  });

  document.getElementById('btnExportExcel')?.addEventListener('click', () => {
    exportToExcel();
  });

  document.getElementById('btnPrintReport')?.addEventListener('click', () => {
    window.print();
  });

  // Search Input with Debounce
  const searchInput = document.getElementById('reportSearchInput');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        filterState.keyword = e.target.value;
        paginationState.page = 1;
        applyFiltersAndRender();
      }, 250);
    });
  }

  // Supplier Dropdown Trigger & Outside Click
  const suppTrigger = document.getElementById('supplierDropdownTrigger');
  const suppMenu = document.getElementById('supplierDropdownMenu');
  if (suppTrigger && suppMenu) {
    suppTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = suppMenu.classList.contains('show');
      suppMenu.classList.toggle('show', !isOpen);
      suppTrigger.classList.toggle('active', !isOpen);
    });

    document.addEventListener('click', (e) => {
      if (!suppTrigger.contains(e.target) && !suppMenu.contains(e.target)) {
        suppMenu.classList.remove('show');
        suppTrigger.classList.remove('active');
      }
    });

    suppMenu.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  // Supplier Search inside dropdown
  const suppSearchInp = document.getElementById('supplierSearchInput');
  if (suppSearchInp) {
    suppSearchInp.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll('#supplierListContainer .supplier-item-label').forEach(item => {
        const text = (item.textContent || '').toLowerCase();
        item.style.display = text.includes(q) ? 'flex' : 'none';
      });
    });
  }

  // Select all / Deselect all Suppliers
  document.getElementById('btnSelectAllSuppliers')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('#supplierListContainer .supplier-checkbox').forEach(cb => cb.checked = true);
    syncSupplierSelectionFromCheckboxes();
    applyFiltersAndRender();
  });

  document.getElementById('btnClearAllSuppliers')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('#supplierListContainer .supplier-checkbox').forEach(cb => cb.checked = false);
    syncSupplierSelectionFromCheckboxes();
    applyFiltersAndRender();
  });

  // Date Preset handler
  const datePreset = document.getElementById('reportDatePreset');
  const dateFromInp = document.getElementById('reportDateFrom');
  const dateToInp = document.getElementById('reportDateTo');

  if (datePreset) {
    datePreset.addEventListener('change', (e) => {
      const val = e.target.value;
      filterState.datePreset = val;
      const today = new Date();
      
      const formatDate = (d) => d.toISOString().slice(0, 10);

      if (val === 'all') {
        filterState.dateFrom = '';
        filterState.dateTo = '';
      } else if (val === 'custom') {
        const secRow = document.getElementById('filterSecondaryRow');
        const btnToggleAdv = document.getElementById('btnToggleAdvancedFilter');
        if (secRow) secRow.style.display = 'flex';
        btnToggleAdv?.classList.add('active');
      } else if (val === 'today') {
        const dStr = formatDate(today);
        filterState.dateFrom = dStr;
        filterState.dateTo = dStr;
      } else if (val === 'last7days') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        filterState.dateFrom = formatDate(d);
        filterState.dateTo = formatDate(today);
      } else if (val === 'last30days') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        filterState.dateFrom = formatDate(d);
        filterState.dateTo = formatDate(today);
      } else if (val === 'thisMonth') {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        filterState.dateFrom = formatDate(firstDay);
        filterState.dateTo = formatDate(lastDay);
      } else if (val === 'lastMonth') {
        const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
        filterState.dateFrom = formatDate(firstDay);
        filterState.dateTo = formatDate(lastDay);
      } else if (val === 'thisQuarter') {
        const quarter = Math.floor(today.getMonth() / 3);
        const firstDay = new Date(today.getFullYear(), quarter * 3, 1);
        const lastDay = new Date(today.getFullYear(), quarter * 3 + 3, 0);
        filterState.dateFrom = formatDate(firstDay);
        filterState.dateTo = formatDate(lastDay);
      } else if (val === 'thisYear') {
        const firstDay = new Date(today.getFullYear(), 0, 1);
        const lastDay = new Date(today.getFullYear(), 11, 31);
        filterState.dateFrom = formatDate(firstDay);
        filterState.dateTo = formatDate(lastDay);
      }

      if (dateFromInp) dateFromInp.value = filterState.dateFrom;
      if (dateToInp) dateToInp.value = filterState.dateTo;

      paginationState.page = 1;
      applyFiltersAndRender();
    });
  }

  // Date From/To Manual inputs
  dateFromInp?.addEventListener('change', (e) => {
    filterState.dateFrom = e.target.value;
    filterState.datePreset = 'custom';
    if (datePreset) datePreset.value = 'custom';
    paginationState.page = 1;
    applyFiltersAndRender();
  });

  dateToInp?.addEventListener('change', (e) => {
    filterState.dateTo = e.target.value;
    filterState.datePreset = 'custom';
    if (datePreset) datePreset.value = 'custom';
    paginationState.page = 1;
    applyFiltersAndRender();
  });

  // Product Select
  document.getElementById('reportProductSelect')?.addEventListener('change', (e) => {
    filterState.productId = e.target.value;
    paginationState.page = 1;
    applyFiltersAndRender();
  });

  // Min / Max Qty & Amount
  document.getElementById('reportMinQty')?.addEventListener('input', (e) => {
    filterState.minQuantity = e.target.value;
  });
  document.getElementById('reportMaxQty')?.addEventListener('input', (e) => {
    filterState.maxQuantity = e.target.value;
  });
  document.getElementById('reportMinAmount')?.addEventListener('input', (e) => {
    filterState.minAmount = e.target.value;
  });
  document.getElementById('reportMaxAmount')?.addEventListener('input', (e) => {
    filterState.maxAmount = e.target.value;
  });

  // Toggle Advanced Filter Row
  const btnToggleAdv = document.getElementById('btnToggleAdvancedFilter');
  const secRow = document.getElementById('filterSecondaryRow');
  if (btnToggleAdv && secRow) {
    btnToggleAdv.addEventListener('click', () => {
      const isHidden = secRow.style.display === 'none';
      secRow.style.display = isHidden ? 'flex' : 'none';
      btnToggleAdv.classList.toggle('active', isHidden);
    });
  }

  ['reportMinQty', 'reportMaxQty', 'reportMinAmount', 'reportMaxAmount'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        paginationState.page = 1;
        applyFiltersAndRender();
      }
    });
  });

  // Apply Button
  document.getElementById('btnApplyFilters')?.addEventListener('click', () => {
    paginationState.page = 1;
    applyFiltersAndRender();
    toast('Đã áp dụng các điều kiện lọc dữ liệu', 'success');
  });

  // Reset Filters Button
  document.getElementById('btnResetFilters')?.addEventListener('click', () => {
    resetAllFilters();
  });

  // View Switcher Tabs
  const tabBtns = [
    { id: 'tabBtnDetailed', view: 'detailed' },
    { id: 'tabBtnBySupplier', view: 'by-supplier' },
    { id: 'tabBtnByProduct', view: 'by-product' }
  ];

  tabBtns.forEach(t => {
    document.getElementById(t.id)?.addEventListener('click', () => {
      activeReportTab = t.view;
      tabBtns.forEach(other => {
        document.getElementById(other.id)?.classList.toggle('active', other.id === t.id);
      });
      applyFiltersAndRender();
    });
  });

  // Page Size change
  document.getElementById('reportPageSize')?.addEventListener('change', (e) => {
    paginationState.pageSize = Number(e.target.value);
    paginationState.page = 1;
    applyFiltersAndRender();
  });
}
