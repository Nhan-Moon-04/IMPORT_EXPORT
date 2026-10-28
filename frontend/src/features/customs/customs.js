// frontend/src/features/customs/customs.js
/**
 * Quản Lý Tờ Khai Hải Quan
 * Giao diện chuẩn MISA AMIS 2025: Sort, Filter, Column Picker, Multi-Select, Print & Excel
 * Hỗ trợ:
 * - Nhập khẩu nước ngoài (Trị giá USD, quy đổi theo Tỷ giá Hải quan để tính thuế)
 * - Nhập khẩu trong nước (Trị giá VNĐ trực tiếp, không quy đổi)
 * - Đính kèm và xem/tải file tờ khai thực tế (.xlsx, .pdf)
 */
import { api, toast, openModal, closeModal, showConfirm, API_BASE, getToken } from '../../core/api.js';

// ─── STATE QUẢN LÝ ────────────────────────────────────────────────────────────
let allDeclarations = [];
let filteredDeclarations = [];
let allShipments = [];
let allProducts = [];
let customsDocs = [];
let selectedIds = new Set();
let currentPage = 1;
let itemsPerPage = 10;
let sortField = 'declarationDate';
let sortDirection = 'desc';

// ─── CẤU HÌNH CỘT HIỂN THỊ (PERSISTENCE LOCALSTORAGE) ─────────────────────────
const DEFAULT_COLUMNS = [
  { id: 'declarationNumber', label: 'Số Tờ Khai', minWidth: '150px', defaultVisible: true, sortable: true },
  { id: 'status', label: 'Phân Luồng', minWidth: '130px', defaultVisible: true, sortable: true },
  { id: 'originScope', label: 'Nguồn Gốc', minWidth: '130px', defaultVisible: true, sortable: true },
  { id: 'declarationType', label: 'Loại Hình', minWidth: '95px', defaultVisible: true, sortable: true },
  { id: 'shipmentCode', label: 'Mã Lô Hàng', minWidth: '150px', defaultVisible: true, sortable: true },
  { id: 'declarationDate', label: 'Ngày Đăng Ký', minWidth: '110px', defaultVisible: true, sortable: true },
  { id: 'customsBranch', label: 'Chi Cục Hải Quan', minWidth: '200px', defaultVisible: true, sortable: true },
  { id: 'partnerName', label: 'Doanh Nghiệp / Đối Tác', minWidth: '170px', defaultVisible: true, sortable: true },
  { id: 'valueUsd', label: 'Trị Giá USD ($)', minWidth: '130px', defaultVisible: true, sortable: true },
  { id: 'exchangeRate', label: 'Tỷ Giá HQ', minWidth: '110px', defaultVisible: true, sortable: true },
  { id: 'taxableValueVnd', label: 'Trị Giá Tính Thuế (VNĐ)', minWidth: '160px', defaultVisible: true, sortable: true },
  { id: 'totalTaxAmount', label: 'Tiền Thuế (VNĐ)', minWidth: '140px', defaultVisible: true, sortable: true },
  { id: 'notes', label: 'Ghi Chú', minWidth: '140px', defaultVisible: false, sortable: false },
  { id: 'hasFile', label: 'Tệp Đính Kèm', minWidth: '140px', defaultVisible: true, sortable: false },
  { id: 'actions', label: 'Thao Tác', minWidth: '120px', defaultVisible: true, sortable: false }
];

function getSavedColumns() {
  try {
    const saved = localStorage.getItem('xnk_customs_columns_v3');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  const initial = {};
  DEFAULT_COLUMNS.forEach(c => { initial[c.id] = c.defaultVisible; });
  return initial;
}

function saveColumnConfig(cols) {
  try {
    localStorage.setItem('xnk_customs_columns_v3', JSON.stringify(cols));
  } catch (e) {}
}

// ─── HELPER PARSE CUSTOMS METADATA ───────────────────────────────────────────
export function parseCustomsMeta(notes) {
  const def = {
    userNotes: '',
    scope: 'foreign',
    isDomestic: false,
    currency: 'USD',
    valueUsd: null,
    exchangeRate: null,
    taxableValueVnd: null,
    importTaxRate: 0,
    importTaxAmount: 0,
    vatRate: 8,
    vatAmount: 0,
    totalTaxAmount: 0,
    items: []
  };
  if (!notes) return def;
  if (typeof notes === 'object') return { ...def, ...notes };
  try {
    if (typeof notes === 'string' && notes.trim().startsWith('{')) {
      const parsed = JSON.parse(notes);
      const isDom = parsed.scope === 'domestic' || parsed.isDomestic === true;
      return {
        userNotes: parsed.userNotes || parsed.notes || '',
        scope: isDom ? 'domestic' : 'foreign',
        isDomestic: isDom,
        currency: parsed.currency || (isDom ? 'VND' : 'USD'),
        valueUsd: parsed.valueUsd !== undefined && parsed.valueUsd !== null ? Number(parsed.valueUsd) : (parsed.totalValue ? Number(parsed.totalValue) : null),
        exchangeRate: parsed.exchangeRate ? Number(parsed.exchangeRate) : (parsed.rate ? Number(parsed.rate) : null),
        taxableValueVnd: parsed.taxableValueVnd !== undefined && parsed.taxableValueVnd !== null ? Number(parsed.taxableValueVnd) : (parsed.valVnd ? Number(parsed.valVnd) : null),
        importTaxRate: Number(parsed.importTaxRate || 0),
        importTaxAmount: Number(parsed.importTaxAmount || 0),
        vatRate: Number(parsed.vatRate !== undefined ? parsed.vatRate : 8),
        vatAmount: Number(parsed.vatAmount || 0),
        totalTaxAmount: Number(parsed.totalTaxAmount || parsed.taxAmount || 0),
        items: Array.isArray(parsed.items) ? parsed.items : []
      };
    }
  } catch (e) {}
  return { ...def, userNotes: String(notes) };
}

// ─── MAIN RENDER ──────────────────────────────────────────────────────────────
export async function renderCustoms(container, subTab = 'customs-declarations') {
  selectedIds.clear();
  currentPage = 1;

  container.innerHTML = `
    <div class="amis-list-page">

      <!-- TOOLBAR MISA AMIS -->
      <div class="amis-toolbar-wrap">
        <div class="amis-toolbar-left">
          <button id="btnCustomsAdd" class="amis-btn amis-btn-primary" title="Mở tờ khai hải quan mới">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Thêm Tờ Khai HQ
          </button>
          <button id="btnCustomsImportExcel" class="amis-btn" style="background:#0266b3; color:#fff;" title="Tự động đọc thông tin từ file Excel tờ khai điện tử (VNACCS/ECUS)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Nhập Từ File Tờ Khai (.xlsx)
          </button>
          <input type="file" id="inputCustomsQuickExcel" accept=".xlsx,.xls" style="display:none;">
          <button id="btnCustomsEdit" class="amis-btn amis-btn-ghost" disabled title="Chỉnh sửa tờ khai đã chọn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
            Sửa
          </button>
          <button id="btnCustomsDetail" class="amis-btn amis-btn-ghost" disabled title="Xem chi tiết tờ khai">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Chi tiết
          </button>
          <button id="btnCustomsDownloadDoc" class="amis-btn amis-btn-ghost" disabled title="Xem hoặc tải file đính kèm tờ khai">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Tải File Tờ Khai
          </button>
          <button id="btnCustomsPrint" class="amis-btn amis-btn-ghost" disabled title="In bản tờ khai Hải quan A4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            In Tờ Khai
          </button>
          <button id="btnCustomsDelete" class="amis-btn amis-btn-ghost amis-btn-danger-text" disabled title="Xóa tờ khai đã chọn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Xóa
          </button>
          <div class="amis-btn-divider"></div>
          <button id="btnCustomsRefresh" class="amis-btn amis-btn-ghost" title="Nạp lại danh sách dữ liệu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Nạp lại
          </button>
          <button id="btnCustomsExport" class="amis-btn amis-btn-ghost" title="Xuất danh sách ra file Excel">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Excel
          </button>
        </div>

        <div class="amis-toolbar-right">
          <!-- Lọc nguồn gốc -->
          <select id="filterCustomsScope" class="ph-filter-select">
            <option value="">Tất cả nguồn gốc</option>
            <option value="foreign">🌐 Nhập khẩu nước ngoài (USD)</option>
            <option value="domestic">🏠 Nhập khẩu trong nước (VNĐ)</option>
          </select>

          <!-- Lọc ngày đăng ký -->
          <div class="ph-date-range">
            <input type="date" id="filterCustomsDateFrom" class="ph-date-input" title="Từ ngày đăng ký">
            <span class="ph-date-sep">—</span>
            <input type="date" id="filterCustomsDateTo" class="ph-date-input" title="Đến ngày đăng ký">
          </div>

          <!-- Lọc phân luồng -->
          <select id="filterCustomsStatus" class="ph-filter-select">
            <option value="">Tất cả phân luồng</option>
            <option value="1">🟢 Luồng Xanh (Thông quan)</option>
            <option value="2">🟡 Luồng Vàng (Kiểm tra hồ sơ)</option>
            <option value="3">🔴 Luồng Đỏ (Kiểm hóa)</option>
            <option value="0">⚪ Chưa phân luồng</option>
          </select>

          <!-- Lọc loại hình -->
          <select id="filterCustomsType" class="ph-filter-select">
            <option value="">Tất cả loại hình</option>
            <option value="A11">A11 - Nhập KD tiêu dùng</option>
            <option value="A12">A12 - Nhập KD SX</option>
            <option value="E21">E21 - Nhập NVL gia công</option>
            <option value="B11">B11 - Xuất kinh doanh</option>
            <option value="B13">B13 - Xuất đã NK</option>
            <option value="H11">H11 - Hàng phi mậu dịch</option>
          </select>

          <!-- Ô tìm kiếm nhanh -->
          <div class="amis-search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="customsSearchInput" placeholder="Tìm số tờ khai, lô hàng, chi cục...">
          </div>

          <!-- Tùy chỉnh cột -->
          <div class="amis-col-picker-wrap" id="colPickerWrapCustoms">
            <button id="btnColPickerCustoms" class="amis-btn amis-btn-ghost amis-btn-icon-only" title="Tùy chỉnh cột hiển thị">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
            <div class="amis-col-dropdown" id="colDropdownCustoms" style="display:none;">
              <div class="col-dropdown-header">Tùy chỉnh cột hiển thị</div>
              <div class="col-dropdown-body" id="colDropdownBodyCustoms"></div>
              <div class="col-dropdown-footer">
                <button type="button" class="btn btn-secondary btn-sm" id="btnResetColCustoms">Mặc định</button>
                <button type="button" class="btn btn-primary btn-sm" id="btnSaveColCustoms">Áp dụng</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- BẢNG DỮ LIỆU CHÍNH -->
      <div class="amis-table-container">
        <table class="amis-table" id="customsMainTable">
          <thead>
            <tr id="customsTableHeadRow"></tr>
          </thead>
          <tbody id="customsTableBody">
            <tr>
              <td colspan="15" style="text-align:center; padding: 40px; color: var(--text-muted);">
                <div class="spinner" style="margin-bottom:8px;"></div>
                Đang tải dữ liệu tờ khai hải quan...
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- PHÂN TRANG CHUẨN MISA AMIS -->
      <div class="amis-pagination-wrap">
        <div class="amis-page-info">
          Tổng số: <strong id="customsTotalRecords">0</strong> bản ghi
          <span id="customsSelectedCountText" style="margin-left: 10px; color: var(--amis-blue); font-weight: 600; display: none;">
            (Đã chọn: <span id="customsSelectedCount">0</span>)
          </span>
        </div>
        <div class="amis-page-controls">
          <div class="amis-page-size-wrap">
            <span>Số dòng/trang:</span>
            <select id="customsPageSizeSelect" class="amis-page-size-select">
              <option value="10" selected>10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
          <div class="amis-page-nav">
            <button id="customsBtnPrev" class="amis-page-btn" disabled title="Trang trước">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span class="amis-page-current" id="customsPageIndicator">1 / 1</span>
            <button id="customsBtnNext" class="amis-page-btn" disabled title="Trang sau">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
      </div>

    </div>
  `;

  // ─── WIRE UP EVENTS ─────────────────────────────────────────────────────────
  setupToolbarEvents();
  setupFilterEvents();
  setupColPicker();
  setupPaginationEvents();

  // Load initial data
  await fetchAllData();
}

// ─── FETCH DỮ LIỆU & ENRICH ──────────────────────────────────────────────────
async function fetchAllData() {
  try {
    const [cdRes, shpRes, docRes, prodRes] = await Promise.all([
      api.get('/api/customsDeclarations?pageSize=500'),
      api.get('/api/shipments?pageSize=200'),
      api.get('/api/documents?category=Customs'),
      api.get('/api/products?pageSize=500')
    ]);

    allShipments = shpRes.data?.items || shpRes.data || [];
    customsDocs = docRes.data?.items || docRes.data || [];
    allProducts = prodRes.data?.items || prodRes.data || [];
    const rawDeclarations = cdRes.data?.items || cdRes.data || [];

    // Map & Enrich
    allDeclarations = rawDeclarations.map(cd => {
      const shp = allShipments.find(s => s.id === cd.shipmentId || s.shipmentCode === cd.shipmentCode);
      const doc = customsDocs.find(d => 
        (d.entityId && d.entityId.toLowerCase() === cd.id.toLowerCase()) ||
        (cd.declarationNumber && d.fileName && d.fileName.toLowerCase().includes(cd.declarationNumber.toLowerCase())) ||
        (cd.declarationNumber && d.originalFileName && d.originalFileName.toLowerCase().includes(cd.declarationNumber.toLowerCase())) ||
        (cd.shipmentId && d.shipmentId && d.shipmentId.toLowerCase() === cd.shipmentId.toLowerCase())
      );

      // Parse metadata from notes
      const meta = parseCustomsMeta(cd.notes);
      const shpCurrency = (shp?.currency || 'USD').toUpperCase();
      const isDomestic = meta.isDomestic || shpCurrency === 'VND';

      let valueUsd = meta.valueUsd;
      let exchangeRate = meta.exchangeRate;
      let taxableValueVnd = meta.taxableValueVnd;
      let importTaxAmount = meta.importTaxAmount;
      let vatAmount = meta.vatAmount;
      let totalTaxAmount = meta.totalTaxAmount;

      if (isDomestic) {
        if (taxableValueVnd === null || taxableValueVnd === undefined) {
          taxableValueVnd = shp?.totalValue || 0;
        }
        if (!vatAmount && taxableValueVnd) {
          vatAmount = Math.round(taxableValueVnd * (meta.vatRate || 8) / 100);
        }
        totalTaxAmount = vatAmount;
        valueUsd = null;
        exchangeRate = null;
      } else {
        if (valueUsd === null || valueUsd === undefined) {
          valueUsd = shp?.totalValue || 0;
        }
        if (!exchangeRate && meta.exchangeRate) {
          exchangeRate = meta.exchangeRate;
        }
        if ((taxableValueVnd === null || taxableValueVnd === undefined) && valueUsd && exchangeRate) {
          taxableValueVnd = Math.round(valueUsd * exchangeRate);
        }
        if (!totalTaxAmount && taxableValueVnd) {
          const it = Math.round(taxableValueVnd * (meta.importTaxRate || 0) / 100);
          const vt = Math.round((taxableValueVnd + it) * (meta.vatRate || 8) / 100);
          totalTaxAmount = it + vt;
        }
      }

      return {
        id: cd.id,
        declarationNumber: cd.declarationNumber || '---',
        declarationDate: cd.declarationDate || cd.createdAt,
        declarationType: cd.declarationType || (shp?.type === 'Export' ? 'B11' : 'A11'),
        customsBranch: cd.customsBranch || '02CI - Chi cục HQ CK Cảng Sài Gòn KV1',
        status: typeof cd.status === 'number' ? cd.status : 1, // 1: Xanh, 2: Vàng, 3: Đỏ
        notes: meta.userNotes,
        isDomestic,
        scope: isDomestic ? 'domestic' : 'foreign',
        currency: isDomestic ? 'VND' : 'USD',
        valueUsd,
        exchangeRate,
        taxableValueVnd,
        importTaxRate: meta.importTaxRate || 0,
        importTaxAmount,
        vatRate: meta.vatRate || 8,
        vatAmount,
        totalTaxAmount,
        shipmentId: cd.shipmentId || shp?.id,
        shipmentCode: cd.shipmentCode || shp?.shipmentCode || '---',
        shipmentType: shp?.type || (cd.declarationType?.startsWith('B') ? 'Export' : 'Import'),
        partnerName: shp?.supplierName || shp?.customerName || (shp?.type === 'Export' ? 'CÔNG TY CP XUẤT NHẬP KHẨU IMEX' : 'LONG CHENG WU TEXTILE CO., LTD'),
        docId: doc?.id,
        docName: doc?.originalFileName || doc?.fileName,
        items: meta.items || [],
        createdAt: cd.createdAt
      };
    });

    applyFilters();
  } catch (err) {
    console.error('Lỗi khi tải dữ liệu tờ khai:', err);
    toast('Không thể kết nối đến máy chủ lấy danh sách tờ khai', 'error');
    const tbody = document.getElementById('customsTableBody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="15" style="text-align:center; padding:30px; color:#ef4444;">Lỗi khi tải dữ liệu tờ khai hải quan</td></tr>`;
  }
}

// ─── FILTER & SORT ────────────────────────────────────────────────────────────
function applyFilters() {
  const searchTerm = (document.getElementById('customsSearchInput')?.value || '').toLowerCase().trim();
  const filterStatus = document.getElementById('filterCustomsStatus')?.value;
  const filterType = document.getElementById('filterCustomsType')?.value;
  const filterScope = document.getElementById('filterCustomsScope')?.value;
  const dateFrom = document.getElementById('filterCustomsDateFrom')?.value;
  const dateTo = document.getElementById('filterCustomsDateTo')?.value;

  filteredDeclarations = allDeclarations.filter(d => {
    // Search
    if (searchTerm) {
      const matchNumber = (d.declarationNumber || '').toLowerCase().includes(searchTerm);
      const matchShp = (d.shipmentCode || '').toLowerCase().includes(searchTerm);
      const matchBranch = (d.customsBranch || '').toLowerCase().includes(searchTerm);
      const matchPartner = (d.partnerName || '').toLowerCase().includes(searchTerm);
      const matchType = (d.declarationType || '').toLowerCase().includes(searchTerm);
      const matchFile = (d.docName || '').toLowerCase().includes(searchTerm);
      if (!matchNumber && !matchShp && !matchBranch && !matchPartner && !matchType && !matchFile) return false;
    }

    // Scope
    if (filterScope && filterScope !== '') {
      if (d.scope !== filterScope) return false;
    }

    // Status / Channel
    if (filterStatus !== '' && filterStatus !== undefined) {
      if (Number(d.status) !== Number(filterStatus)) return false;
    }

    // Type
    if (filterType && filterType !== '') {
      if (d.declarationType !== filterType) return false;
    }

    // Date range
    if (dateFrom && d.declarationDate) {
      const dDate = new Date(d.declarationDate);
      if (dDate < new Date(dateFrom)) return false;
    }
    if (dateTo && d.declarationDate) {
      const dDate = new Date(d.declarationDate);
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (dDate > toDate) return false;
    }

    return true;
  });

  // Sort
  filteredDeclarations.sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === 'declarationDate' || sortField === 'createdAt') {
      valA = new Date(valA || 0).getTime();
      valB = new Date(valB || 0).getTime();
    } else if (typeof valA === 'string') {
      valA = (valA || '').toLowerCase();
      valB = (valB || '').toLowerCase();
    }

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  currentPage = 1;
  renderTableHead();
  renderTableBody();
  updatePaginationUI();
  updateToolbarButtonStates();
}

// ─── RENDER BẢNG ──────────────────────────────────────────────────────────────
function renderTableHead() {
  const headRow = document.getElementById('customsTableHeadRow');
  if (!headRow) return;

  const colConfig = getSavedColumns();
  const allSelected = filteredDeclarations.length > 0 && filteredDeclarations.every(d => selectedIds.has(d.id));

  let html = `
    <th style="width: 38px; text-align: center; position: sticky; left: 0; z-index: 3; background: #f8fafc;">
      <input type="checkbox" id="chkCustomsSelectAll" class="amis-checkbox" ${allSelected ? 'checked' : ''}>
    </th>
  `;

  DEFAULT_COLUMNS.forEach(col => {
    if (!colConfig[col.id]) return;

    let sortIcon = '';
    if (col.sortable) {
      if (sortField === col.id) {
        sortIcon = sortDirection === 'asc'
          ? `<span style="margin-left:4px; color:var(--amis-blue);">▲</span>`
          : `<span style="margin-left:4px; color:var(--amis-blue);">▼</span>`;
      } else {
        sortIcon = `<span style="margin-left:4px; opacity:0.3;">▲</span>`;
      }
    }

    const isNumeric = col.id === 'valueUsd' || col.id === 'exchangeRate' || col.id === 'taxableValueVnd' || col.id === 'totalTaxAmount';
    const isCenter = col.id === 'actions' || col.id === 'hasFile' || col.id === 'declarationType' || col.id === 'originScope';
    const justify = isNumeric ? 'flex-end' : (isCenter ? 'center' : 'flex-start');

    const cursorStyle = col.sortable ? 'cursor:pointer; user-select:none;' : '';
    html += `
      <th style="min-width:${col.minWidth}; ${cursorStyle}" data-col="${col.id}" class="${col.sortable ? 'sortable-header' : ''}">
        <div style="display:flex; align-items:center; justify-content:${justify}">
          <span>${col.label}</span>
          ${sortIcon}
        </div>
      </th>
    `;
  });

  headRow.innerHTML = html;

  // Header sort click listener
  headRow.querySelectorAll('.sortable-header').forEach(th => {
    th.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT') return;
      const colId = th.getAttribute('data-col');
      if (sortField === colId) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        sortField = colId;
        sortDirection = 'asc';
      }
      applyFilters();
    });
  });

  // Select all listener
  document.getElementById('chkCustomsSelectAll')?.addEventListener('change', function () {
    const checked = this.checked;
    filteredDeclarations.forEach(d => {
      if (checked) selectedIds.add(d.id);
      else selectedIds.delete(d.id);
    });
    renderTableBody();
    updateToolbarButtonStates();
  });
}

function renderTableBody() {
  const tbody = document.getElementById('customsTableBody');
  if (!tbody) return;

  const colConfig = getSavedColumns();

  if (filteredDeclarations.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="15" style="text-align: center; padding: 48px; color: var(--text-muted);">
          <div style="font-size: 32px; margin-bottom: 8px;">📋</div>
          <div style="font-weight: 600; font-size: 14px; color: #334155;">Không tìm thấy tờ khai hải quan nào</div>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Thử thay đổi bộ lọc tìm kiếm hoặc nhấn nút "Thêm Tờ Khai HQ"</div>
        </td>
      </tr>
    `;
    return;
  }

  const startIdx = (currentPage - 1) * itemsPerPage;
  const pageItems = filteredDeclarations.slice(startIdx, startIdx + itemsPerPage);

  tbody.innerHTML = pageItems.map(d => {
    const isSelected = selectedIds.has(d.id);
    const dateFormatted = d.declarationDate ? new Date(d.declarationDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '---';

    // Channel badge
    let channelBadge = '<span class="customs-channel-chip channel-unclassified">⚪ Chưa phân luồng</span>';
    if (d.status === 1) channelBadge = '<span class="customs-channel-chip channel-green">🟢 Luồng Xanh (1)</span>';
    else if (d.status === 2) channelBadge = '<span class="customs-channel-chip channel-yellow">🟡 Luồng Vàng (2)</span>';
    else if (d.status === 3) channelBadge = '<span class="customs-channel-chip channel-red">🔴 Luồng Đỏ (3)</span>';

    // Scope badge
    const scopeBadge = d.isDomestic
      ? `<span class="customs-scope-badge domestic" title="Hàng mua bán nội địa, giao dịch VNĐ">🏠 Trong nước</span>`
      : `<span class="customs-scope-badge foreign" title="Hàng nhập khẩu nước ngoài, giao dịch USD quy đổi tỷ giá">🌐 Nước ngoài</span>`;

    // Type badge
    const isExport = d.declarationType?.startsWith('B') || d.shipmentType === 'Export';
    const typeBadge = `<span class="customs-type-badge ${isExport ? 'export' : ''}">${d.declarationType || 'A11'}</span>`;

    // File attached icon & name
    let fileHtml = `<span style="color:#94a3b8; font-size:11px;">Chưa đính kèm</span>`;
    if (d.docId || d.docName) {
      const isXlsx = d.docName?.endsWith('.xlsx') || d.docName?.endsWith('.xls');
      const badgeColor = isXlsx ? '#15803d' : '#b91c1c';
      const badgeBg = isXlsx ? '#f0fdf4' : '#fef2f2';
      const badgeBorder = isXlsx ? '#bbf7d0' : '#fecaca';
      const iconLabel = isXlsx ? '📗 Excel' : '📕 PDF';

      fileHtml = `
        <div style="display:inline-flex; align-items:center; gap:5px; padding:2px 8px; border-radius:4px; background:${badgeBg}; border:1px solid ${badgeBorder}; color:${badgeColor}; font-size:11px; font-weight:700; cursor:pointer;" 
             onclick="event.stopPropagation(); window.viewCustomsDoc('${d.id}')" 
             title="Xem / Tải file: ${escapeHtml(d.docName || 'File tờ khai')}">
          <span>${iconLabel}</span>
          <span style="max-width:90px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:500;">${escapeHtml(d.docName || 'Tải file')}</span>
        </div>
      `;
    }

    return `
      <tr class="bl-main-row ${isSelected ? 'selected' : ''}" data-id="${d.id}">
        <td style="text-align: center; position: sticky; left: 0; background: inherit; z-index: 1;">
          <input type="checkbox" class="amis-checkbox chk-row-customs" data-id="${d.id}" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation();">
        </td>

        ${colConfig.declarationNumber ? `
          <td>
            <span class="customs-num-link" onclick="event.stopPropagation(); window.viewCustomsVNACCS('${d.id}')" title="Xem bản tờ khai">
              ${escapeHtml(d.declarationNumber)}
            </span>
          </td>
        ` : ''}

        ${colConfig.status ? `<td>${channelBadge}</td>` : ''}

        ${colConfig.originScope ? `<td style="text-align:center;">${scopeBadge}</td>` : ''}

        ${colConfig.declarationType ? `<td style="text-align:center;">${typeBadge}</td>` : ''}

        ${colConfig.shipmentCode ? `
          <td>
            <a href="#" style="font-weight:600; color:var(--amis-blue); text-decoration:none;" onclick="event.stopPropagation(); window.appNavigateTo('shipment-detail', '${d.shipmentId}'); return false;" title="Xem chi tiết lô hàng liên kết">
              ${escapeHtml(d.shipmentCode)}
            </a>
          </td>
        ` : ''}

        ${colConfig.declarationDate ? `<td>${dateFormatted}</td>` : ''}

        ${colConfig.customsBranch ? `<td style="font-size:12px; color:#334155;">${escapeHtml(d.customsBranch)}</td>` : ''}

        ${colConfig.partnerName ? `<td><div style="font-weight:600; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(d.partnerName)}">${escapeHtml(d.partnerName)}</div></td>` : ''}

        ${colConfig.valueUsd ? `
          <td style="text-align:right; font-weight:700; color:#0369a1; font-size:12.5px;">
            ${d.isDomestic || d.valueUsd === null ? '<span style="color:#94a3b8; font-weight:normal;">---</span>' : `$${Number(d.valueUsd).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          </td>
        ` : ''}

        ${colConfig.exchangeRate ? `
          <td style="text-align:right; font-family:monospace; font-weight:600; color:#475569;">
            ${d.isDomestic || !d.exchangeRate ? '<span style="color:#94a3b8; font-weight:normal;">---</span>' : Number(d.exchangeRate).toLocaleString('vi-VN')}
          </td>
        ` : ''}

        ${colConfig.taxableValueVnd ? `
          <td style="text-align:right; font-weight:700; color:var(--amis-green); font-size:12.5px;">
            ${d.taxableValueVnd ? `${Number(d.taxableValueVnd).toLocaleString('vi-VN')} ₫` : '<span style="color:#94a3b8; font-weight:normal;">---</span>'}
          </td>
        ` : ''}

        ${colConfig.totalTaxAmount ? `
          <td style="text-align:right; font-weight:600; color:#b45309; font-size:12px;">
            ${d.totalTaxAmount ? `${Number(d.totalTaxAmount).toLocaleString('vi-VN')} ₫` : '<span style="color:#94a3b8; font-weight:normal;">0 ₫</span>'}
          </td>
        ` : ''}

        ${colConfig.notes ? `<td style="font-size:12px; color:#64748b; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(d.notes || '---')}</td>` : ''}

        ${colConfig.hasFile ? `<td style="text-align:center;">${fileHtml}</td>` : ''}

        ${colConfig.actions ? `
          <td style="text-align:center;">
            <div style="display:inline-flex; align-items:center; gap:4px;">
              <button class="sd-btn-sm" style="padding:2px 6px;" onclick="event.stopPropagation(); window.viewCustomsVNACCS('${d.id}')" title="Xem chi tiết tờ khai">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
              <button class="sd-btn-sm" style="padding:2px 6px;" onclick="event.stopPropagation(); window.viewCustomsDoc('${d.id}')" title="Tải file đính kèm">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </button>
              <button class="sd-btn-sm" style="padding:2px 6px;" onclick="event.stopPropagation(); window.editCustomsDeclaration('${d.id}')" title="Chỉnh sửa">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="sd-btn-sm btn-danger" style="padding:2px 6px;" onclick="event.stopPropagation(); window.deleteCustomsDeclaration('${d.id}')" title="Xóa tờ khai">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </td>
        ` : ''}
      </tr>
    `;
  }).join('');

  // Row click listeners
  tbody.querySelectorAll('.bl-main-row').forEach(row => {
    row.addEventListener('click', (e) => {
      const id = row.getAttribute('data-id');
      const chk = row.querySelector('.chk-row-customs');
      if (selectedIds.has(id)) {
        selectedIds.delete(id);
        if (chk) chk.checked = false;
        row.classList.remove('selected');
      } else {
        selectedIds.add(id);
        if (chk) chk.checked = true;
        row.classList.add('selected');
      }
      updateToolbarButtonStates();
      updateSelectAllCheckbox();
    });
  });

  // Individual checkbox listeners
  tbody.querySelectorAll('.chk-row-customs').forEach(chk => {
    chk.addEventListener('change', function () {
      const id = this.getAttribute('data-id');
      const row = this.closest('tr');
      if (this.checked) {
        selectedIds.add(id);
        if (row) row.classList.add('selected');
      } else {
        selectedIds.delete(id);
        if (row) row.classList.remove('selected');
      }
      updateToolbarButtonStates();
      updateSelectAllCheckbox();
    });
  });
}

function updateSelectAllCheckbox() {
  const chkAll = document.getElementById('chkCustomsSelectAll');
  if (!chkAll) return;
  chkAll.checked = filteredDeclarations.length > 0 && filteredDeclarations.every(d => selectedIds.has(d.id));
}

function updateToolbarButtonStates() {
  const count = selectedIds.size;
  const btnEdit = document.getElementById('btnCustomsEdit');
  const btnDetail = document.getElementById('btnCustomsDetail');
  const btnDownloadDoc = document.getElementById('btnCustomsDownloadDoc');
  const btnPrint = document.getElementById('btnCustomsPrint');
  const btnDelete = document.getElementById('btnCustomsDelete');

  const selectedCountText = document.getElementById('customsSelectedCountText');
  const selectedCountSpan = document.getElementById('customsSelectedCount');

  if (selectedCountText && selectedCountSpan) {
    if (count > 0) {
      selectedCountSpan.textContent = count;
      selectedCountText.style.display = 'inline';
    } else {
      selectedCountText.style.display = 'none';
    }
  }

  if (btnEdit) btnEdit.disabled = count !== 1;
  if (btnDetail) btnDetail.disabled = count !== 1;
  if (btnDownloadDoc) btnDownloadDoc.disabled = count !== 1;
  if (btnPrint) btnPrint.disabled = count !== 1;
  if (btnDelete) btnDelete.disabled = count === 0;
}

// ─── PHÂN TRANG ───────────────────────────────────────────────────────────────
function updatePaginationUI() {
  const total = filteredDeclarations.length;
  const totalPages = Math.ceil(total / itemsPerPage) || 1;

  document.getElementById('customsTotalRecords').textContent = total.toLocaleString();
  document.getElementById('customsPageIndicator').textContent = `${currentPage} / ${totalPages}`;

  const btnPrev = document.getElementById('customsBtnPrev');
  const btnNext = document.getElementById('customsBtnNext');
  if (btnPrev) btnPrev.disabled = currentPage <= 1;
  if (btnNext) btnNext.disabled = currentPage >= totalPages;
}

function setupPaginationEvents() {
  document.getElementById('customsPageSizeSelect')?.addEventListener('change', function () {
    itemsPerPage = parseInt(this.value);
    currentPage = 1;
    renderTableBody();
    updatePaginationUI();
  });

  document.getElementById('customsBtnPrev')?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderTableBody();
      updatePaginationUI();
    }
  });

  document.getElementById('customsBtnNext')?.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredDeclarations.length / itemsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      renderTableBody();
      updatePaginationUI();
    }
  });
}

// ─── TÙY CHỈNH CỘT ────────────────────────────────────────────────────────────
function setupColPicker() {
  const btn = document.getElementById('btnColPickerCustoms');
  const dropdown = document.getElementById('colDropdownCustoms');
  const body = document.getElementById('colDropdownBodyCustoms');

  btn?.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    renderColPickerCheckboxes();
  });

  document.addEventListener('click', (e) => {
    if (!dropdown?.contains(e.target) && e.target !== btn) {
      dropdown.style.display = 'none';
    }
  });

  function renderColPickerCheckboxes() {
    const config = getSavedColumns();
    body.innerHTML = DEFAULT_COLUMNS.map(col => `
      <label class="col-checkbox-item">
        <input type="checkbox" id="chk_col_${col.id}" ${config[col.id] ? 'checked' : ''}>
        <span>${col.label}</span>
      </label>
    `).join('');
  }

  document.getElementById('btnSaveColCustoms')?.addEventListener('click', () => {
    const updated = {};
    DEFAULT_COLUMNS.forEach(col => {
      const el = document.getElementById(`chk_col_${col.id}`);
      updated[col.id] = el ? el.checked : col.defaultVisible;
    });
    saveColumnConfig(updated);
    dropdown.style.display = 'none';
    renderTableHead();
    renderTableBody();
    toast('Đã lưu tùy chỉnh cột hiển thị!', 'success');
  });

  document.getElementById('btnResetColCustoms')?.addEventListener('click', () => {
    const defaults = {};
    DEFAULT_COLUMNS.forEach(col => { defaults[col.id] = col.defaultVisible; });
    saveColumnConfig(defaults);
    dropdown.style.display = 'none';
    renderTableHead();
    renderTableBody();
    toast('Đã đặt lại cấu hình cột mặc định!', 'info');
  });
}

// ─── BỘ LỌC TÌM KIẾM ──────────────────────────────────────────────────────────
function setupFilterEvents() {
  const searchInput = document.getElementById('customsSearchInput');
  searchInput?.addEventListener('input', () => applyFilters());

  document.getElementById('filterCustomsScope')?.addEventListener('change', () => applyFilters());
  document.getElementById('filterCustomsStatus')?.addEventListener('change', () => applyFilters());
  document.getElementById('filterCustomsType')?.addEventListener('change', () => applyFilters());
  document.getElementById('filterCustomsDateFrom')?.addEventListener('change', () => applyFilters());
  document.getElementById('filterCustomsDateTo')?.addEventListener('change', () => applyFilters());
}

// ─── TOOLBAR BUTTONS ──────────────────────────────────────────────────────────
function setupToolbarEvents() {
  // Thêm mới
  document.getElementById('btnCustomsAdd')?.addEventListener('click', () => {
    openCreateCustomsModal(null, () => fetchAllData());
  });

  // Nhập từ file Excel tờ khai (Quick upload from toolbar)
  const btnImportExcel = document.getElementById('btnCustomsImportExcel');
  const inputQuickExcel = document.getElementById('inputCustomsQuickExcel');

  btnImportExcel?.addEventListener('click', () => {
    inputQuickExcel?.click();
  });

  inputQuickExcel?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    openCreateCustomsModal(null, () => fetchAllData(), file);
    e.target.value = '';
  });

  // Nạp lại
  document.getElementById('btnCustomsRefresh')?.addEventListener('click', async () => {
    await fetchAllData();
    toast('Đã nạp lại dữ liệu tờ khai mới nhất!', 'success');
  });

  // Tải file đính kèm
  document.getElementById('btnCustomsDownloadDoc')?.addEventListener('click', () => {
    const id = Array.from(selectedIds)[0];
    if (id) window.viewCustomsDoc(id);
  });

  // Sửa
  document.getElementById('btnCustomsEdit')?.addEventListener('click', () => {
    const id = Array.from(selectedIds)[0];
    if (id) window.editCustomsDeclaration(id, () => fetchAllData());
  });

  // Chi tiết
  document.getElementById('btnCustomsDetail')?.addEventListener('click', () => {
    const id = Array.from(selectedIds)[0];
    if (id) window.viewCustomsVNACCS(id);
  });

  // In tờ khai
  document.getElementById('btnCustomsPrint')?.addEventListener('click', () => {
    const id = Array.from(selectedIds)[0];
    if (id) window.printCustomsVNACCS(id);
  });

  // Xóa
  document.getElementById('btnCustomsDelete')?.addEventListener('click', () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 1) {
      window.deleteCustomsDeclaration(ids[0], () => fetchAllData());
    } else if (ids.length > 1) {
      showConfirm({
        title: 'Xóa Nhiều Tờ Khai',
        message: `Bạn có chắc chắn muốn xóa ${ids.length} tờ khai hải quan đã chọn không?`,
        onConfirm: async () => {
          try {
            for (const id of ids) {
              await api.delete(`/api/customsDeclarations/${id}`);
            }
            toast(`Đã xóa thành công ${ids.length} tờ khai!`, 'success');
            selectedIds.clear();
            await fetchAllData();
          } catch (e) {
            toast('Lỗi khi xóa tờ khai: ' + e.message, 'error');
          }
        }
      });
    }
  });

  // Xuất Excel
  document.getElementById('btnCustomsExport')?.addEventListener('click', () => {
    exportCustomsExcel();
  });
}

// ─── XUẤT EXCEL SHEETJS ───────────────────────────────────────────────────────
function exportCustomsExcel() {
  if (typeof XLSX === 'undefined') {
    toast('Thư viện Excel đang được tải, vui lòng thử lại sau giây lát...', 'warning');
    return;
  }

  const exportData = filteredDeclarations.map((d, index) => ({
    'STT': index + 1,
    'Số Tờ Khai': d.declarationNumber,
    'Phân Luồng': d.status === 1 ? 'Luồng Xanh' : (d.status === 2 ? 'Luồng Vàng' : (d.status === 3 ? 'Luồng Đỏ' : 'Chưa phân luồng')),
    'Nguồn Gốc': d.isDomestic ? 'Trong nước (VNĐ)' : 'Nước ngoài (USD)',
    'Loại Hình': d.declarationType,
    'Mã Lô Hàng': d.shipmentCode,
    'Ngày Đăng Ký': d.declarationDate ? new Date(d.declarationDate).toLocaleDateString('vi-VN') : '',
    'Chi Cục Hải Quan': d.customsBranch,
    'Doanh Nghiệp / Đối Tác': d.partnerName,
    'Trị Giá USD ($)': d.isDomestic ? '' : (d.valueUsd || ''),
    'Tỷ Giá HQ': d.isDomestic ? '' : (d.exchangeRate || ''),
    'Trị Giá Tính Thuế (VNĐ)': d.taxableValueVnd || '',
    'Tiền Thuế (VNĐ)': d.totalTaxAmount || '',
    'File Đính Kèm': d.docName || '',
    'Ghi Chú': d.notes
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "ToKhaiHaiQuan");
  XLSX.writeFile(wb, `Danh_Sach_To_Khai_HQ_${new Date().toISOString().slice(0, 10)}.xlsx`);
  toast('Đã xuất file Excel tờ khai hải quan thành công!', 'success');
}

// ─── TỰ ĐỘNG PHÂN TÍCH TỜ KHAI HẢI QUAN TỪ FILE EXCEL (VNACCS/ECUS) ───────────
export function parseCustomsDeclarationExcel(workbook) {
  let targetSheet = null;
  if (workbook.Sheets['TKN']) {
    targetSheet = workbook.Sheets['TKN'];
  } else {
    for (const sName of workbook.SheetNames) {
      const s = workbook.Sheets[sName];
      const txt = JSON.stringify(s);
      if (txt.includes('Số tờ khai') || txt.includes('<IMP>') || txt.includes('Tờ khai')) {
        targetSheet = s;
        break;
      }
    }
    if (!targetSheet) targetSheet = workbook.Sheets[workbook.SheetNames[0]];
  }

  const rows = window.XLSX.utils.sheet_to_json(targetSheet, { header: 1, defval: '' });

  const result = {
    declarationNumber: '',
    declarationType: 'A12',
    channel: '1',
    customsBranch: '',
    registeredAt: '',
    invoiceNumber: '',
    exporterName: '',
    importerName: '',
    billOfLading: '',
    currency: 'USD',
    valueUsd: null,
    taxableValueVnd: null,
    exchangeRate: null,
    totalTaxAmount: null,
    importTaxAmount: null,
    vatAmount: null,
    importTaxRate: 0,
    vatRate: 8,
    notes: '',
    items: []
  };

  // Pass 1: Header scan
  for (let rIdx = 0; rIdx < Math.min(rows.length, 140); rIdx++) {
    const row = rows[rIdx];
    for (let cIdx = 0; cIdx < row.length; cIdx++) {
      const val = String(row[cIdx] || '').trim();

      // Số tờ khai (12 chữ số)
      if (val.includes('Số tờ khai') && !result.declarationNumber) {
        for (let k = cIdx + 1; k < Math.min(cIdx + 10, row.length); k++) {
          const m = String(row[k]).match(/\b(10\d{10})\b/);
          if (m) { result.declarationNumber = m[1]; break; }
        }
      }

      // Mã loại hình
      if (val.includes('Mã loại hình') && !result.declarationType) {
        for (let k = cIdx + 1; k < Math.min(cIdx + 8, row.length); k++) {
          const m = String(row[k]).match(/\b([A-Z]\d{2})\b/);
          if (m) { result.declarationType = m[1]; break; }
        }
      }

      // Mã phân loại kiểm tra
      if (val.includes('Mã phân loại kiểm tra') && !result.channel) {
        for (let k = cIdx + 1; k < Math.min(cIdx + 8, row.length); k++) {
          const s = String(row[k]).trim();
          if (['1', '2', '3'].includes(s)) { result.channel = s; break; }
        }
      }

      // Tên cơ quan Hải quan
      if (val.includes('cơ quan Hải quan tiếp nhận') && !result.customsBranch) {
        for (let k = cIdx + 1; k < Math.min(cIdx + 12, row.length); k++) {
          const s = String(row[k]).trim();
          if (s && !s.includes('Mã bộ phận')) { result.customsBranch = s; break; }
        }
      }

      // Ngày đăng ký
      if (val.includes('Ngày đăng ký') && !result.registeredAt) {
        for (let k = cIdx + 1; k < Math.min(cIdx + 8, row.length); k++) {
          const m = String(row[k]).match(/(\d{2})\/(\d{2})\/(\d{4})/);
          if (m) { result.registeredAt = `${m[3]}-${m[2]}-${m[1]}`; break; }
        }
      }

      // Người xuất khẩu
      if (val.includes('Người xuất khẩu') && !result.exporterName) {
        for (let nextR = rIdx + 1; nextR < Math.min(rIdx + 5, rows.length); nextR++) {
          for (let nextC = 0; nextC < rows[nextR].length; nextC++) {
            if (String(rows[nextR][nextC]).includes('Tên')) {
              for (let vC = nextC + 1; vC < Math.min(nextC + 10, rows[nextR].length); vC++) {
                const s = String(rows[nextR][vC] || '').trim();
                if (s.length > 2) { result.exporterName = s; break; }
              }
              break;
            }
          }
          if (result.exporterName) break;
        }
      }

      // Người nhập khẩu
      if (val.includes('Người nhập khẩu') && !result.importerName) {
        for (let nextR = rIdx + 1; nextR < Math.min(rIdx + 5, rows.length); nextR++) {
          for (let nextC = 0; nextC < rows[nextR].length; nextC++) {
            if (String(rows[nextR][nextC]).includes('Tên')) {
              for (let vC = nextC + 1; vC < Math.min(nextC + 10, rows[nextR].length); vC++) {
                const s = String(rows[nextR][vC] || '').trim();
                if (s.length > 2) { result.importerName = s; break; }
              }
              break;
            }
          }
          if (result.importerName) break;
        }
      }

      // Số hóa đơn
      if (val.includes('Số hóa đơn') && !result.invoiceNumber) {
        for (let k = cIdx + 1; k < Math.min(cIdx + 10, row.length); k++) {
          const s = String(row[k] || '').trim();
          if (s) {
            result.invoiceNumber = s.replace(/^[A-Z]\s*-\s*/, '').trim();
            break;
          }
        }
      }

      // Số vận đơn
      if (val.includes('Số vận đơn') && !result.billOfLading) {
        for (let nextR = rIdx; nextR < Math.min(rIdx + 3, rows.length); nextR++) {
          for (let nextC = 0; nextC < rows[nextR].length; nextC++) {
            const vStr = String(rows[nextR][nextC] || '').trim();
            if (vStr.length > 6 && /[A-Z0-9]{8,}/.test(vStr) && !['Địa điểm', 'TONG CTY', 'CANG', 'Phương tiện'].some(w => vStr.includes(w))) {
              result.billOfLading = vStr;
              break;
            }
          }
          if (result.billOfLading) break;
        }
      }

      // Tổng trị giá hóa đơn ($ USD)
      if (val.includes('Tổng trị giá hóa đơn') && result.valueUsd === null) {
        for (let k = cIdx + 1; k < Math.min(cIdx + 15, row.length); k++) {
          const s = String(row[k] || '').trim().replace(/\./g, '').replace(/,/g, '.');
          const num = parseFloat(s);
          if (!isNaN(num) && num > 0) { result.valueUsd = num; break; }
        }
      }

      // Tổng trị giá tính thuế (VND)
      if (val.includes('Tổng trị giá tính thuế') && result.taxableValueVnd === null) {
        for (let k = cIdx + 1; k < Math.min(cIdx + 15, row.length); k++) {
          const s = String(row[k] || '').trim().replace(/\./g, '').replace(/,/g, '.');
          const num = parseFloat(s);
          if (!isNaN(num) && num > 0) { result.taxableValueVnd = Math.round(num); break; }
        }
      }

      // Tỷ giá tính thuế
      if (val.includes('Tỷ giá tính thuế') && result.exchangeRate === null) {
        for (let k = cIdx + 1; k < Math.min(cIdx + 15, row.length); k++) {
          const s = String(row[k] || '').trim().replace(/\./g, '').replace(/,/g, '.');
          const num = parseFloat(s);
          if (!isNaN(num) && num >= 10000 && num <= 50000) { result.exchangeRate = Math.round(num); break; }
        }
      }

      // Tổng tiền thuế phải nộp
      if (val.includes('Tổng tiền thuế phải nộp') && result.totalTaxAmount === null) {
        for (let k = cIdx + 1; k < Math.min(cIdx + 15, row.length); k++) {
          const s = String(row[k] || '').trim().replace(/\./g, '').replace(/,/g, '.');
          const num = parseFloat(s);
          if (!isNaN(num) && num > 0) { result.totalTaxAmount = Math.round(num); break; }
        }
      }

      // Thuế NK
      if (val.includes('Thuế NK') && result.importTaxAmount === null) {
        for (let k = cIdx + 1; k < Math.min(cIdx + 10, row.length); k++) {
          const s = String(row[k] || '').trim().replace(/\./g, '').replace(/,/g, '.');
          const num = parseFloat(s);
          if (!isNaN(num) && num > 0) { result.importTaxAmount = Math.round(num); break; }
        }
      }

      // Thuế GTGT
      if (val.includes('Thuế GTGT') && result.vatAmount === null) {
        for (let k = cIdx + 1; k < Math.min(cIdx + 10, row.length); k++) {
          const s = String(row[k] || '').trim().replace(/\./g, '').replace(/,/g, '.');
          const num = parseFloat(s);
          if (!isNaN(num) && num > 0) { result.vatAmount = Math.round(num); break; }
        }
      }

      // Phần ghi chú
      if (val.includes('Phần ghi chú') && !result.notes) {
        for (let k = cIdx + 1; k < Math.min(cIdx + 10, row.length); k++) {
          const s = String(row[k] || '').trim();
          if (s) { result.notes = s; break; }
        }
      }
    }
  }

  // Tỷ lệ % thuế
  if (result.importTaxAmount && result.taxableValueVnd) {
    result.importTaxRate = Math.round((result.importTaxAmount / result.taxableValueVnd) * 100 * 10) / 10;
  }
  if (result.vatAmount && result.taxableValueVnd) {
    const base = result.taxableValueVnd + (result.importTaxAmount || 0);
    result.vatRate = Math.round((result.vatAmount / base) * 100);
  }

  // Pass 2: Trích xuất danh sách dòng hàng (<01>, <02>, ...)
  const itemStarts = [];
  for (let rIdx = 0; rIdx < rows.length; rIdx++) {
    const row = rows[rIdx];
    for (let cIdx = 0; cIdx < Math.min(5, row.length); cIdx++) {
      const m = String(row[cIdx] || '').trim().match(/^<0*(\d+)>$/);
      if (m) {
        itemStarts.push({ num: parseInt(m[1]), rIdx });
        break;
      }
    }
  }

  for (let idx = 0; idx < itemStarts.length; idx++) {
    const { num, rIdx: startR } = itemStarts[idx];
    const endR = idx + 1 < itemStarts.length ? itemStarts[idx + 1].rIdx : Math.min(startR + 70, rows.length);
    const itemRows = rows.slice(startR, endR);

    const item = {
      index: num,
      hsCode: '',
      customsName: '',
      quantity: 0,
      unit: 'kg',
      unitPrice: 0,
      totalPrice: 0,
      importTaxRate: result.importTaxRate || 0,
      vatRate: result.vatRate || 8
    };

    for (const r of itemRows) {
      for (let c = 0; c < r.length; c++) {
        const cell = String(r[c] || '').trim();

        // Mã số hàng hóa (HS code)
        if (cell.includes('Mã số hàng hóa') && !item.hsCode) {
          for (let k = c + 1; k < Math.min(c + 8, r.length); k++) {
            const raw = String(r[k] || '').replace(/\D/g, '');
            if (raw.length >= 6) {
              if (raw.length === 8) {
                item.hsCode = `${raw.slice(0, 4)}.${raw.slice(4, 6)}.${raw.slice(6, 8)}`;
              } else {
                item.hsCode = raw;
              }
              break;
            }
          }
        }

        // Mô tả hàng hóa
        if (cell.includes('Mô tả hàng hóa') && !item.customsName) {
          for (let k = c + 1; k < Math.min(c + 8, r.length); k++) {
            const s = String(r[k] || '').trim();
            if (s.length > 5) {
              item.customsName = s;
              break;
            }
          }
        }

        // Số lượng (1)
        if (cell.includes('Số lượng (1)') && item.quantity === 0) {
          for (let k = c + 1; k < Math.min(c + 15, r.length); k++) {
            const s = String(r[k] || '').trim().replace(/\./g, '').replace(/,/g, '.');
            const numVal = parseFloat(s);
            if (!isNaN(numVal) && numVal > 0) {
              item.quantity = numVal;
              for (let uk = k + 1; uk < Math.min(k + 12, r.length); uk++) {
                const u = String(r[uk] || '').trim().toUpperCase();
                if (['KGM', 'KG', 'PCS', 'CONE', 'MTR', 'ROLL'].includes(u)) {
                  item.unit = u === 'KGM' ? 'kg' : u.toLowerCase();
                  break;
                }
              }
              break;
            }
          }
        }

        // Đơn giá hóa đơn
        if (cell.includes('Đơn giá hóa đơn') && item.unitPrice === 0) {
          for (let k = c + 1; k < Math.min(c + 10, r.length); k++) {
            const s = String(r[k] || '').trim().replace(/\./g, '').replace(/,/g, '.');
            const numVal = parseFloat(s);
            if (!isNaN(numVal) && numVal > 0) {
              item.unitPrice = numVal;
              break;
            }
          }
        }

        // Trị giá hóa đơn
        if (cell.includes('Trị giá hóa đơn') && item.totalPrice === 0) {
          for (let k = c + 1; k < Math.min(c + 10, r.length); k++) {
            const s = String(r[k] || '').trim().replace(/\./g, '').replace(/,/g, '.');
            const numVal = parseFloat(s);
            if (!isNaN(numVal) && numVal > 0) {
              item.totalPrice = numVal;
              break;
            }
          }
        }

        // Thuế suất
        if (cell.includes('Thuế suất')) {
          const mPct = cell.match(/(\d+(?:\.\d+)?)%/);
          if (mPct) item.importTaxRate = parseFloat(mPct[1]);
          else {
            for (let k = c + 1; k < Math.min(c + 8, r.length); k++) {
              const mp = String(r[k] || '').match(/(\d+(?:\.\d+)?)%/);
              if (mp) { item.importTaxRate = parseFloat(mp[1]); break; }
            }
          }
        }
      }
    }

    result.items.push(item);
  }

  // Fallback: nếu không có định dạng <01>, tìm bảng hàng hóa thông thường
  if (result.items.length === 0 && rows.length > 2) {
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const desc = String(row[1] || row[2] || '').trim();
      const hs = String(row[0] || '').replace(/\D/g, '');
      const q = parseFloat(String(row[3] || '').replace(/\./g, '').replace(/,/g, '.'));
      if (desc && desc.length > 4 && !isNaN(q) && q > 0) {
        result.items.push({
          index: result.items.length + 1,
          hsCode: hs || '5402.47.00',
          customsName: desc,
          quantity: q,
          unit: 'kg',
          unitPrice: parseFloat(String(row[4] || 0)) || 0,
          totalPrice: parseFloat(String(row[5] || 0)) || 0,
          importTaxRate: 0,
          vatRate: 8
        });
      }
    }
  }

  return result;
}

// ─── THUẬT TOÁN TỰ ĐỘNG KHỚP SẢN PHẨM HỆ THỐNG VỚI DÒNG HÀNG TỜ KHAI ────────
export function findBestMatchingProduct(item, products) {
  if (!products || !products.length) return null;
  const rawText = `${item.customsName || ''} ${item.hsCode || ''}`.toUpperCase();

  let bestProd = null;
  let maxScore = 0;

  for (const p of products) {
    let score = 0;
    const sku = (p.sku || '').toUpperCase();
    const name = (p.name || '').toUpperCase();
    const spec = p.specification || {};
    const yarnType = (spec.yarnType || '').toUpperCase();
    const denier = (spec.denierCount || '').toUpperCase().replace('D', '');
    const filament = spec.filamentCount ? `${spec.filamentCount}` : '';

    // Khớp SKU trực tiếp
    if (sku && rawText.includes(sku)) score += 6;

    // Khớp loại sợi (FDY, DTY, POY)
    if (yarnType && rawText.includes(yarnType)) score += 3;

    // Khớp chỉ số Denier (75D, 90D, 100D, 150D...)
    if (denier) {
      if (rawText.includes(`${denier}D`) || rawText.includes(`${denier}/`) || rawText.includes(` ${denier} `)) {
        score += 4;
      }
    }

    // Khớp số filament (36F, 48F, 72F...)
    if (filament) {
      if (rawText.includes(`${filament}F`) || rawText.includes(`/${filament}`) || rawText.includes(`${filament} F`)) {
        score += 3;
      }
    }

    // Khớp HS Code
    if (p.hsCode && item.hsCode) {
      const cleanP = p.hsCode.replace(/\D/g, '').slice(0, 4);
      const cleanI = item.hsCode.replace(/\D/g, '').slice(0, 4);
      if (cleanP && cleanP === cleanI) score += 2;
    }

    if (score > maxScore && score >= 5) {
      maxScore = score;
      bestProd = p;
    }
  }

  return bestProd;
}

// ─── MODAL TẠO MỚI TỜ KHAI (HỖ TRỢ UPLOAD & TỰ ĐỘNG ĐIỀN TOÀN DIỆN) ───────────
export async function openCreateCustomsModal(defaultShipmentId = null, onSuccess = null, initialFile = null) {
  // Đảm bảo danh mục sản phẩm đã được nạp để map mã SKU
  if (!allProducts || allProducts.length === 0) {
    try {
      const prodRes = await api.get('/api/products?pageSize=500');
      allProducts = prodRes.data?.items || prodRes.data || [];
    } catch (_) {}
  }

  const autoNum = `10${Math.floor(1000000000 + Math.random() * 9000000000)}`;
  const todayStr = new Date().toISOString().split('T')[0];

  const defShp = defaultShipmentId ? allShipments.find(s => s.id === defaultShipmentId) : null;
  const isDefDomestic = defShp?.currency === 'VND';
  const defVal = defShp?.totalValue || 0;

  let currentExtractedItems = [];
  let uploadedCustomsFile = initialFile || null;

  const modalHtml = `
    <form id="form-create-customs" style="padding: 4px 0;">
      <!-- BANNER UPLOAD & AUTO-PARSE FILE EXCEL TỜ KHAI -->
      <div class="customs-upload-dropzone" id="cdUploadDropzone" style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 1.5px dashed #0284c7; border-radius: 8px; padding: 12px 16px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; gap: 14px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="font-size: 26px; line-height: 1;">⚡</div>
          <div>
            <div style="font-weight: 700; font-size: 13px; color: #0369a1;">Tự động điền từ file Tờ khai Hải quan điện tử (.xlsx / VNACCS)</div>
            <div style="font-size: 11.5px; color: #64748b; margin-top: 2px;">Tải lên file tờ khai (.xlsx) để hệ thống tự trích xuất Số tờ khai, Ngày ĐK, Chi cục, Tỷ giá, Trị giá & Danh sách dòng hàng.</div>
          </div>
        </div>
        <div>
          <label class="amis-btn" style="background:#0284c7; color:#fff; cursor:pointer; margin:0; font-size:12px; padding:6px 14px; box-shadow:0 1px 2px rgba(0,0,0,0.08); display:inline-flex; align-items:center; gap:6px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:13px;height:13px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Tải file Excel lên</span>
            <input type="file" id="cdFileAutoParse" accept=".xlsx,.xls" style="display:none;">
          </label>
        </div>
      </div>
      <div id="cdAutoParseAlert" style="display:none; margin-bottom:14px; padding:10px 14px; border-radius:6px; font-size:12.5px; line-height:1.45;"></div>

      <!-- CHỌN NGUỒN GỐC TỜ KHAI -->
      <div style="margin-bottom: 14px;">
        <label class="form-label required" style="font-size:12px; font-weight:700;">Loại Hình Nhập Khẩu & Tiền Tệ</label>
        <div class="customs-scope-picker">
          <label class="customs-scope-option ${!isDefDomestic ? 'selected' : ''}" id="lblScopeForeign">
            <input type="radio" name="cd-scope-radio" value="foreign" ${!isDefDomestic ? 'checked' : ''}>
            <div>
              <div style="font-weight:700; color:#1d4ed8; font-size:13px;">🌐 Nhập Khẩu Nước Ngoài (USD)</div>
              <div style="font-size:11px; color:#64748b; margin-top:2px;">Trị giá nguyên tệ USD, quy đổi theo Tỷ giá Hải quan để tính thuế</div>
            </div>
          </label>
          <label class="customs-scope-option ${isDefDomestic ? 'selected' : ''}" id="lblScopeDomestic">
            <input type="radio" name="cd-scope-radio" value="domestic" ${isDefDomestic ? 'checked' : ''}>
            <div>
              <div style="font-weight:700; color:#15803d; font-size:13px;">🏠 Mua Bán Trong Nước (VNĐ)</div>
              <div style="font-size:11px; color:#64748b; margin-top:2px;">Giao dịch nội địa trực tiếp bằng VNĐ, không có USD/tỷ giá</div>
            </div>
          </label>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px 16px;">
        <div class="form-group">
          <label class="form-label required">Số Tờ Khai HQ (12 số)</label>
          <div style="display:flex; gap:6px;">
            <input type="text" id="cd-number" class="form-control" required value="${autoNum}" placeholder="VD: 108584252930" style="font-family:monospace; font-weight:700; color:var(--amis-blue);">
            <button type="button" class="btn btn-secondary btn-sm" id="btnGenCustomsNum" title="Tự động sinh số tờ khai mới" style="padding:4px 8px;">
              🔄 Sinh số
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label required">Lô Hàng Liên Quan</label>
          <select id="cd-shipment" class="form-control" required ${defaultShipmentId ? 'disabled' : ''}>
            <option value="">-- Chọn lô hàng liên kết --</option>
            ${(allShipments || [])
              .filter(s => s.id === defaultShipmentId || (s.status !== 'Completed' && s.status !== 'Cancelled'))
              .map(s => `
                <option value="${s.id}" data-currency="${s.currency || 'USD'}" data-val="${s.totalValue || 0}" ${s.id === defaultShipmentId ? 'selected' : ''}>
                  ${escapeHtml(s.shipmentCode)} (${s.type === 'Export' ? 'Xuất' : 'Nhập'} - ${s.currency || 'USD'} - ${escapeHtml(s.supplierName || s.customerName || '---')})
                </option>
              `).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label required">Mã Loại Hình</label>
          <select id="cd-type" class="form-control" required>
            <option value="A11">A11 - Nhập kinh doanh tiêu dùng</option>
            <option value="A12" selected>A12 - Nhập kinh doanh sản xuất</option>
            <option value="E21">E21 - Nhập nguyên liệu gia công</option>
            <option value="B11">B11 - Xuất kinh doanh</option>
            <option value="B13">B13 - Xuất đã nhập khẩu</option>
            <option value="H11">H11 - Hàng phi mậu dịch</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label required">Phân Luồng Hải Quan</label>
          <select id="cd-status" class="form-control">
            <option value="1" selected>🟢 Luồng Xanh (1 - Thông quan)</option>
            <option value="2">🟡 Luồng Vàng (2 - Kiểm tra hồ sơ)</option>
            <option value="3">🔴 Luồng Đỏ (3 - Kiểm hóa thực tế)</option>
            <option value="0">⚪ Chưa phân luồng</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Chi Cục Hải Quan Đăng Ký</label>
          <input type="text" id="cd-branch" class="form-control" list="customsBranchSuggestions" value="02CI - Chi cục HQ CK Cảng Sài Gòn KV1" placeholder="Nhập hoặc chọn chi cục">
          <datalist id="customsBranchSuggestions">
            <option value="02CI - Chi cục HQ CK Cảng Sài Gòn KV1">
            <option value="02IK - Chi cục HQ CK Cảng Cát Lái">
            <option value="01NV - Chi cục HQ CK Sân bay quốc tế Nội Bài">
            <option value="02B1 - Chi cục HQ CK Sân bay quốc tế Tân Sơn Nhất">
            <option value="03EE - Chi cục HQ CK Cảng Hải Phòng KV1">
            <option value="18A1 - Chi cục HQ CK Cảng Cái Mép">
          </datalist>
        </div>

        <div class="form-group">
          <label class="form-label">Ngày Đăng Ký Tờ Khai</label>
          <input type="date" id="cd-date" class="form-control" value="${todayStr}">
        </div>
      </div>

      <!-- KHỐI TÍNH TRỊ GIÁ & THUẾ HẢI QUAN -->
      <div class="customs-tax-box" id="customsTaxBox">
        <div class="customs-tax-box-title">
          <span>Kê Khai Trị Giá Tính Thuế & Tiền Thuế</span>
          <span id="taxBoxScopeNote" style="font-size:11px; font-weight:normal; text-transform:none; color:#0266b3;">
            ${!isDefDomestic ? 'Quy đổi USD theo tỷ giá Hải quan để tính thuế' : 'Giao dịch trực tiếp bằng VNĐ'}
          </span>
        </div>

        <!-- PHẦN CHO HÀNG NƯỚC NGOÀI (USD) -->
        <div id="sectionForeignTax" style="${!isDefDomestic ? 'display:block;' : 'display:none;'}">
          <div style="display:grid; grid-template-columns: 1.2fr 1fr 1.3fr; gap:12px; margin-bottom:12px;">
            <div class="form-group" style="margin:0;">
              <label class="form-label required">Trị Giá Nguyên Tệ ($ USD)</label>
              <input type="number" step="0.01" id="cd-val-usd" class="form-control" placeholder="VD: 23109.61" value="${!isDefDomestic && defVal ? defVal : ''}">
            </div>
            <div class="form-group" style="margin:0;">
              <label class="form-label required">Tỷ Giá Hải Quan (VNĐ/USD)</label>
              <input type="number" step="1" id="cd-exchange-rate" class="form-control" placeholder="VD: 25450 hoặc 25890" value="25450">
            </div>
            <div class="form-group" style="margin:0;">
              <label class="form-label">Trị Giá Tính Thuế Quy Đổi (VNĐ)</label>
              <input type="text" id="cd-val-vnd-calculated" class="form-control" readonly style="background:#f1f5f9; font-weight:700; color:#15803d;" placeholder="Tự động tính: USD × Tỷ giá">
            </div>
          </div>
          <div style="font-size:11px; color:#64748b; margin-bottom:12px;">
            * Trị giá tính thuế (VNĐ) = Trị giá USD × Tỷ giá do Hải quan công bố tại thời điểm mở tờ khai.
          </div>
        </div>

        <!-- PHẦN CHO HÀNG TRONG NƯỚC (VNĐ) -->
        <div id="sectionDomesticTax" style="${isDefDomestic ? 'display:block;' : 'display:none;'}">
          <div style="display:grid; grid-template-columns: 1fr; gap:12px; margin-bottom:12px;">
            <div class="form-group" style="margin:0;">
              <label class="form-label required">Trị Giá Hàng Hóa / Tính Thuế (VNĐ)</label>
              <input type="number" step="1000" id="cd-val-vnd-direct" class="form-control" placeholder="VD: 500000000" value="${isDefDomestic && defVal ? defVal : ''}">
            </div>
          </div>
          <div style="font-size:11px; color:#15803d; margin-bottom:12px; font-weight:600;">
            ✓ Giao dịch nội địa sử dụng tiền tệ Việt Nam Đồng (VNĐ). Đô là đô, VNĐ là VNĐ, không sử dụng tỷ giá quy đổi.
          </div>
        </div>

        <!-- THUẾ NHẬP KHẨU & VAT -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; padding-top:10px; border-top:1px dashed #cbd5e1;">
          <div class="form-group" style="margin:0;" id="grpImportTax">
            <label class="form-label">% Thuế Nhập Khẩu</label>
            <div style="display:flex; gap:6px; align-items:center;">
              <input type="number" step="0.5" id="cd-tax-import-rate" class="form-control" value="0" style="width:80px;">
              <span style="font-size:12px;">%</span>
              <span id="txtImportTaxAmount" style="margin-left:auto; font-weight:600; color:#b45309; font-size:12px;">0 ₫</span>
            </div>
          </div>
          <div class="form-group" style="margin:0;">
            <label class="form-label">% Thuế GTGT (VAT)</label>
            <div style="display:flex; gap:6px; align-items:center;">
              <input type="number" step="1" id="cd-tax-vat-rate" class="form-control" value="8" style="width:80px;">
              <span style="font-size:12px;">%</span>
              <span id="txtVatTaxAmount" style="margin-left:auto; font-weight:600; color:#b45309; font-size:12px;">0 ₫</span>
            </div>
          </div>
        </div>

        <!-- TỔNG TIỀN THUẾ HQ -->
        <div class="customs-tax-summary-bar">
          <div style="font-weight:700; color:#334155; font-size:13px;">Tổng Tiền Thuế Phải Nộp (VNĐ):</div>
          <div id="txtTotalTaxCustoms" style="font-size:16px; font-weight:800; color:#dc2626;">0 ₫</div>
        </div>
      </div>

      <!-- PREVIEW & MAP DÒNG HÀNG TRÍCH XUẤT TỪ FILE TỜ KHAI -->
      <div id="cdItemsSection" style="display:none; margin-bottom: 16px; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #fff; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
        <div style="padding: 10px 14px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div>
            <strong style="color: #0f172a; font-size: 13px;">📦 Dòng Hàng Trích Xuất Từ Tờ Khai (<span id="cdItemsCount">0</span> dòng)</strong>
            <div style="font-size: 11.5px; color: #64748b; margin-top: 1px;">Kiểm tra mô tả chi tiết trên tờ khai và chọn Mã Sản Phẩm (SKU) tương ứng trong hệ thống</div>
          </div>
          <span style="font-size: 11.5px; color: #16a34a; font-weight: 600;" id="cdItemsMatchedNote"></span>
        </div>
        <div style="max-height: 280px; overflow-y: auto;">
          <table class="amis-data-table" style="font-size: 12px; width:100%;" id="tblCdExtractedItems">
            <thead>
              <tr style="background:#f1f5f9; position:sticky; top:0; z-index:2;">
                <th style="width:36px; text-align:center;">#</th>
                <th style="min-width:260px;">Tên Hàng Hóa Trên Tờ Khai (Mô tả Hải quan)</th>
                <th style="width:90px;">Mã HS</th>
                <th style="width:100px; text-align:right;">Số Lượng</th>
                <th style="width:85px; text-align:right;">Đơn Giá ($)</th>
                <th style="width:105px; text-align:right;">Trị Giá ($)</th>
                <th style="min-width:230px;">Mã SKU Trong Hệ Thống (Map sản phẩm)</th>
              </tr>
            </thead>
            <tbody id="tbodyCdExtractedItems">
            </tbody>
          </table>
        </div>
      </div>

      <!-- TỆP ĐÍNH KÈM & GHI CHÚ -->
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px 16px;">
        <div class="form-group" style="grid-column: span 2;">
          <label class="form-label">Tệp đính kèm tờ khai (File Excel .xlsx / PDF / XML)</label>
          <input type="file" id="cd-file" class="form-control" accept=".xlsx,.xls,.pdf,.xml">
          <div style="font-size:11px; color:#64748b; margin-top:3px;" id="cdFileHelpText">
            File đính kèm gốc sẽ được tự động lưu trữ và cho phép xem/tải lại sau này.
          </div>
        </div>

        <div class="form-group" style="grid-column: span 2;">
          <label class="form-label">Ghi Chú</label>
          <textarea id="cd-notes" class="form-control" rows="2" placeholder="Nhập ghi chú thêm nếu cần..."></textarea>
        </div>
      </div>

      <div style="margin-top: 18px; padding-top: 12px; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 8px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">✕ Hủy bỏ</button>
        <button type="button" class="btn btn-primary" id="btn-save-customs">✔ Cất (Lưu Tờ Khai)</button>
      </div>
    </form>
  `;

  openModal('Khai Báo Tờ Khai Hải Quan', modalHtml);

  // Mở rộng modal cho bảng preview dòng hàng thoải mái hiển thị
  const mContainer = document.getElementById('modalContainer');
  if (mContainer) mContainer.style.maxWidth = '980px';

  // Sinh số mới
  document.getElementById('btnGenCustomsNum')?.addEventListener('click', () => {
    const num = `10${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    document.getElementById('cd-number').value = num;
  });

  // Chuyển đổi Nguồn gốc
  function updateScopeUI(scope) {
    const isDom = scope === 'domestic';
    const secForeign = document.getElementById('sectionForeignTax');
    const secDomestic = document.getElementById('sectionDomesticTax');
    const grpImportTax = document.getElementById('grpImportTax');
    const note = document.getElementById('taxBoxScopeNote');
    const lblFor = document.getElementById('lblScopeForeign');
    const lblDom = document.getElementById('lblScopeDomestic');

    if (isDom) {
      if (lblFor) lblFor.classList.remove('selected');
      if (lblDom) lblDom.classList.add('selected');
      if (secForeign) secForeign.style.display = 'none';
      if (secDomestic) secDomestic.style.display = 'block';
      if (grpImportTax) grpImportTax.style.display = 'none';
      if (note) note.textContent = 'Giao dịch trực tiếp bằng VNĐ (Hàng trong nước)';
    } else {
      if (lblFor) lblFor.classList.add('selected');
      if (lblDom) lblDom.classList.remove('selected');
      if (secForeign) secForeign.style.display = 'block';
      if (secDomestic) secDomestic.style.display = 'none';
      if (grpImportTax) grpImportTax.style.display = 'block';
      if (note) note.textContent = 'Quy đổi USD theo tỷ giá Hải quan để tính thuế';
    }
    recalculateCustomsTaxes();
  }

  document.querySelectorAll('input[name="cd-scope-radio"]').forEach(r => {
    r.addEventListener('change', function () {
      updateScopeUI(this.value);
    });
  });

  // Tính toán tiền thuế và quy đổi
  function recalculateCustomsTaxes() {
    const isDom = document.querySelector('input[name="cd-scope-radio"]:checked')?.value === 'domestic';
    let taxableVnd = 0;

    if (isDom) {
      taxableVnd = Number(document.getElementById('cd-val-vnd-direct')?.value || 0);
    } else {
      const valUsd = Number(document.getElementById('cd-val-usd')?.value || 0);
      const rate = Number(document.getElementById('cd-exchange-rate')?.value || 0);
      taxableVnd = Math.round(valUsd * rate);
      const valVndCalc = document.getElementById('cd-val-vnd-calculated');
      if (valVndCalc) valVndCalc.value = taxableVnd ? `${taxableVnd.toLocaleString('vi-VN')} ₫` : '';
    }

    const impRate = isDom ? 0 : Number(document.getElementById('cd-tax-import-rate')?.value || 0);
    const vatRate = Number(document.getElementById('cd-tax-vat-rate')?.value || 0);

    const impAmount = Math.round(taxableVnd * (impRate / 100));
    const vatAmount = Math.round((taxableVnd + impAmount) * (vatRate / 100));
    const totalTax = impAmount + vatAmount;

    const txtImp = document.getElementById('txtImportTaxAmount');
    const txtVat = document.getElementById('txtVatTaxAmount');
    const txtTotal = document.getElementById('txtTotalTaxCustoms');

    if (txtImp) txtImp.textContent = `${impAmount.toLocaleString('vi-VN')} ₫`;
    if (txtVat) txtVat.textContent = `${vatAmount.toLocaleString('vi-VN')} ₫`;
    if (txtTotal) txtTotal.textContent = `${totalTax.toLocaleString('vi-VN')} ₫`;
  }

  ['cd-val-usd', 'cd-exchange-rate', 'cd-val-vnd-direct', 'cd-tax-import-rate', 'cd-tax-vat-rate'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', recalculateCustomsTaxes);
  });

  // Tự động điền theo lô hàng đã chọn
  document.getElementById('cd-shipment')?.addEventListener('change', function () {
    const sid = this.value;
    const s = allShipments.find(x => x.id === sid);
    if (s) {
      const curr = (s.currency || 'USD').toUpperCase();
      const isDom = curr === 'VND';
      const rad = document.querySelector(`input[name="cd-scope-radio"][value="${isDom ? 'domestic' : 'foreign'}"]`);
      if (rad) {
        rad.checked = true;
        updateScopeUI(isDom ? 'domestic' : 'foreign');
      }

      if (isDom) {
        const dInput = document.getElementById('cd-val-vnd-direct');
        if (dInput) dInput.value = s.totalValue || '';
      } else {
        const uInput = document.getElementById('cd-val-usd');
        if (uInput) uInput.value = s.totalValue || '';
      }

      if (s.type === 'Export') document.getElementById('cd-type').value = 'B11';
      else document.getElementById('cd-type').value = 'A12';

      recalculateCustomsTaxes();
    }
  });

  // HÀM XỬ LÝ PHÂN TÍCH FILE EXCEL VÀ AUTO-FILL TOÀN DIỆN
  async function handleAutoParseFile(file) {
    if (!file) return;
    uploadedCustomsFile = file;

    const alertEl = document.getElementById('cdAutoParseAlert');
    if (alertEl) {
      alertEl.style.display = 'block';
      alertEl.style.background = '#e0f2fe';
      alertEl.style.border = '1px solid #7dd3fc';
      alertEl.style.color = '#0369a1';
      alertEl.innerHTML = `<strong>⏳ Đang đọc và phân tích cấu trúc file tờ khai ${escapeHtml(file.name)}...</strong>`;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      if (!window.XLSX) {
        throw new Error('Thư viện đọc Excel chưa sẵn sàng. Vui lòng thử lại sau vài giây.');
      }
      const workbook = window.XLSX.read(arrayBuffer, { type: 'array' });
      const extracted = parseCustomsDeclarationExcel(workbook);

      // 1. Điền Số tờ khai
      if (extracted.declarationNumber) {
        document.getElementById('cd-number').value = extracted.declarationNumber;
      }

      // 2. Điền Loại hình
      if (extracted.declarationType) {
        const typeSel = document.getElementById('cd-type');
        let opt = Array.from(typeSel.options).find(o => o.value === extracted.declarationType);
        if (!opt) {
          opt = new Option(`${extracted.declarationType} - Tờ khai ${extracted.declarationType}`, extracted.declarationType);
          typeSel.add(opt);
        }
        typeSel.value = extracted.declarationType;
      }

      // 3. Điền Phân luồng
      if (extracted.channel) {
        const statusSel = document.getElementById('cd-status');
        if (statusSel) statusSel.value = extracted.channel;
      }

      // 4. Điền Chi cục Hải quan
      if (extracted.customsBranch) {
        document.getElementById('cd-branch').value = extracted.customsBranch;
      }

      // 5. Điền Ngày đăng ký
      if (extracted.registeredAt) {
        document.getElementById('cd-date').value = extracted.registeredAt;
      }

      // 6. Điền Trị giá & Tỷ giá
      const isDom = extracted.currency === 'VND';
      const rScope = document.querySelector(`input[name="cd-scope-radio"][value="${isDom ? 'domestic' : 'foreign'}"]`);
      if (rScope) {
        rScope.checked = true;
        updateScopeUI(isDom ? 'domestic' : 'foreign');
      }

      if (!isDom) {
        if (extracted.valueUsd) document.getElementById('cd-val-usd').value = extracted.valueUsd;
        if (extracted.exchangeRate) document.getElementById('cd-exchange-rate').value = extracted.exchangeRate;
      } else {
        if (extracted.taxableValueVnd) document.getElementById('cd-val-vnd-direct').value = extracted.taxableValueVnd;
      }

      if (extracted.importTaxRate !== undefined) document.getElementById('cd-tax-import-rate').value = extracted.importTaxRate;
      if (extracted.vatRate !== undefined) document.getElementById('cd-tax-vat-rate').value = extracted.vatRate;

      // 7. Điền Ghi chú
      const notesEl = document.getElementById('cd-notes');
      if (notesEl) {
        const noteParts = [];
        if (extracted.invoiceNumber) noteParts.push(`Số HĐ: ${extracted.invoiceNumber}`);
        if (extracted.billOfLading) noteParts.push(`Vận đơn: ${extracted.billOfLading}`);
        if (extracted.exporterName) noteParts.push(`Đối tác: ${extracted.exporterName}`);
        if (extracted.notes) noteParts.push(extracted.notes);
        notesEl.value = noteParts.join(' | ');
      }

      recalculateCustomsTaxes();

      // 8. Tự động tìm Lô hàng phù hợp
      let matchedShipment = null;
      if (!defaultShipmentId && allShipments && allShipments.length) {
        if (extracted.invoiceNumber) {
          const invLower = extracted.invoiceNumber.toLowerCase();
          matchedShipment = allShipments.find(s =>
            (s.invoiceNumber && s.invoiceNumber.toLowerCase().includes(invLower)) ||
            (s.notes && s.notes.toLowerCase().includes(invLower)) ||
            (s.shipmentCode && s.shipmentCode.toLowerCase().includes(invLower))
          );
        }
        if (!matchedShipment && extracted.billOfLading) {
          const blLower = extracted.billOfLading.toLowerCase();
          matchedShipment = allShipments.find(s =>
            (s.blNumber && blLower.includes(s.blNumber.toLowerCase())) ||
            (s.notes && blLower.includes(s.notes.toLowerCase()))
          );
        }
        if (!matchedShipment && extracted.exporterName) {
          const expLower = extracted.exporterName.toLowerCase();
          matchedShipment = allShipments.find(s =>
            (s.supplierName && expLower.includes(s.supplierName.toLowerCase())) ||
            (s.partnerName && expLower.includes(s.partnerName.toLowerCase()))
          );
        }
        if (matchedShipment) {
          document.getElementById('cd-shipment').value = matchedShipment.id;
        }
      }

      // 9. Hiển thị thông báo trạng thái
      if (alertEl) {
        alertEl.style.display = 'block';
        alertEl.style.background = '#f0fdf4';
        alertEl.style.border = '1px solid #bbf7d0';
        alertEl.style.color = '#166534';
        alertEl.innerHTML = `
          <div style="font-weight:700; font-size:13px; margin-bottom:2px;">
            🎉 Đã đọc thành công Tờ khai Hải quan: <strong>${escapeHtml(extracted.declarationNumber || file.name)}</strong>
          </div>
          <div>
            Trích xuất <strong>${extracted.items.length} dòng hàng</strong>, Trị giá: <strong>$${Number(extracted.valueUsd || 0).toLocaleString()}</strong>, Tỷ giá: <strong>${Number(extracted.exchangeRate || 0).toLocaleString()}</strong>.
            ${matchedShipment ? `<br>👉 Tự động khớp với Lô hàng: <strong style="color:#0369a1;">${escapeHtml(matchedShipment.shipmentCode)}</strong> (${escapeHtml(matchedShipment.supplierName || matchedShipment.customerName || '')})` : '<br>👉 <em>Vui lòng chọn Lô hàng liên kết và kiểm tra Mã sản phẩm (SKU) bên dưới.</em>'}
          </div>
        `;
      }

      // 10. Render Bảng Preview & Map Mã Sản Phẩm
      const itemsSection = document.getElementById('cdItemsSection');
      const tbody = document.getElementById('tbodyCdExtractedItems');
      const countEl = document.getElementById('cdItemsCount');
      const noteEl = document.getElementById('cdItemsMatchedNote');

      if (extracted.items && extracted.items.length > 0) {
        currentExtractedItems = extracted.items;
        countEl.textContent = extracted.items.length;
        let matchCount = 0;

        tbody.innerHTML = extracted.items.map((it, idx) => {
          const bestProd = findBestMatchingProduct(it, allProducts);
          if (bestProd) matchCount++;

          return `
            <tr>
              <td style="text-align:center; font-weight:700; color:#64748b;">${it.index || idx + 1}</td>
              <td>
                <div class="cd-item-name-cell" title="${escapeHtml(it.customsName)}">
                  ${escapeHtml(it.customsName || '—')}
                </div>
              </td>
              <td>
                <code style="font-size:11px; font-weight:700; color:#0f172a;">${it.hsCode || '—'}</code>
              </td>
              <td style="text-align:right;">
                <strong>${Number(it.quantity || 0).toLocaleString()}</strong>
                <span style="font-size:11px; color:#64748b;">${it.unit || 'kg'}</span>
              </td>
              <td style="text-align:right; font-family:monospace;">
                ${it.unitPrice ? `$${Number(it.unitPrice).toFixed(2)}` : '—'}
              </td>
              <td style="text-align:right; font-weight:700; color:#0369a1;">
                ${it.totalPrice ? `$${Number(it.totalPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
              </td>
              <td>
                <select class="form-control cd-item-sku-select" style="font-size:11.5px; height:30px; font-weight:600; color:#0369a1; padding:2px 6px;" data-idx="${idx}">
                  <option value="">-- Chưa liên kết mã SP --</option>
                  ${allProducts.map(p => `
                    <option value="${p.id}" data-sku="${escapeHtml(p.sku)}" ${bestProd?.id === p.id ? 'selected' : ''}>
                      [${escapeHtml(p.sku)}] ${escapeHtml(p.name)}
                    </option>
                  `).join('')}
                </select>
                ${bestProd ? `<div style="font-size:10.5px; color:#15803d; font-weight:600; margin-top:2px;">✓ Tự động khớp với SKU: ${escapeHtml(bestProd.sku)}</div>` : ''}
              </td>
            </tr>
          `;
        }).join('');

        if (noteEl) {
          noteEl.textContent = matchCount > 0 ? `✓ Tự động khớp ${matchCount}/${extracted.items.length} mặt hàng` : '';
        }
        itemsSection.style.display = 'block';
      } else {
        itemsSection.style.display = 'none';
      }

      // Đồng bộ tên file lên ô trợ giúp
      const helpText = document.getElementById('cdFileHelpText');
      if (helpText) {
        helpText.innerHTML = `✓ Đã sẵn sàng lưu file gốc: <strong style="color:#0284c7;">${escapeHtml(file.name)}</strong> (${(file.size / 1024).toFixed(1)} KB)`;
      }

    } catch (err) {
      console.error('Lỗi phân tích file tờ khai:', err);
      if (alertEl) {
        alertEl.style.display = 'block';
        alertEl.style.background = '#fef2f2';
        alertEl.style.border = '1px solid #fecaca';
        alertEl.style.color = '#b91c1c';
        alertEl.innerHTML = `<strong>⚠️ Không thể đọc file tờ khai:</strong> ${escapeHtml(err.message)}`;
      }
    }
  }

  // Lắng nghe sự kiện chọn file từ Banner
  document.getElementById('cdFileAutoParse')?.addEventListener('change', function () {
    const file = this.files?.[0];
    if (file) handleAutoParseFile(file);
  });

  // Lắng nghe sự kiện chọn file ở ô đính kèm
  document.getElementById('cd-file')?.addEventListener('change', function () {
    const file = this.files?.[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      handleAutoParseFile(file);
    }
  });

  // Kéo thả file vào Dropzone
  const dropzone = document.getElementById('cdUploadDropzone');
  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.style.background = '#bae6fd';
      dropzone.style.borderColor = '#0266b3';
    });
    dropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropzone.style.background = 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)';
      dropzone.style.borderColor = '#0284c7';
    });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.background = 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)';
      dropzone.style.borderColor = '#0284c7';
      const file = e.dataTransfer?.files?.[0];
      if (file) handleAutoParseFile(file);
    });
  }

  // Nếu mở modal từ Toolbar với file đã chọn trước
  if (initialFile) {
    handleAutoParseFile(initialFile);
  }

  recalculateCustomsTaxes();

  // Submit save
  document.getElementById('btn-save-customs')?.addEventListener('click', async () => {
    const num = document.getElementById('cd-number').value.trim();
    const sid = defaultShipmentId || document.getElementById('cd-shipment').value;

    if (!num) {
      toast('Vui lòng nhập Số tờ khai hải quan', 'error');
      document.getElementById('cd-number').focus();
      return;
    }
    if (!sid) {
      toast('Vui lòng chọn Lô hàng liên kết', 'error');
      return;
    }

    const isDom = document.querySelector('input[name="cd-scope-radio"]:checked')?.value === 'domestic';
    let valUsd = null;
    let rate = null;
    let taxableVnd = 0;

    if (isDom) {
      taxableVnd = Number(document.getElementById('cd-val-vnd-direct')?.value || 0);
    } else {
      valUsd = Number(document.getElementById('cd-val-usd')?.value || 0);
      rate = Number(document.getElementById('cd-exchange-rate')?.value || 0);
      taxableVnd = Math.round(valUsd * rate);
    }

    const impRate = isDom ? 0 : Number(document.getElementById('cd-tax-import-rate')?.value || 0);
    const vatRate = Number(document.getElementById('cd-tax-vat-rate')?.value || 0);
    const impAmount = Math.round(taxableVnd * (impRate / 100));
    const vatAmount = Math.round((taxableVnd + impAmount) * (vatRate / 100));
    const totalTax = impAmount + vatAmount;

    // Thu thập danh sách dòng hàng đã được map mã SKU
    const finalItems = currentExtractedItems.map((it, idx) => {
      const selectEl = document.querySelector(`.cd-item-sku-select[data-idx="${idx}"]`);
      const productId = selectEl?.value || null;
      const opt = selectEl?.selectedOptions?.[0];
      const productSku = opt?.dataset?.sku || null;
      return {
        ...it,
        productId,
        productSku
      };
    });

    const metaPayload = {
      scope: isDom ? 'domestic' : 'foreign',
      isDomestic: isDom,
      currency: isDom ? 'VND' : 'USD',
      valueUsd: valUsd,
      exchangeRate: rate,
      taxableValueVnd: taxableVnd,
      importTaxRate: impRate,
      importTaxAmount: impAmount,
      vatRate: vatRate,
      vatAmount: vatAmount,
      totalTaxAmount: totalTax,
      userNotes: document.getElementById('cd-notes').value.trim(),
      items: finalItems
    };

    const payload = {
      declarationNumber: num,
      declarationType: document.getElementById('cd-type').value,
      customsBranch: document.getElementById('cd-branch').value.trim(),
      shipmentId: sid,
      notes: JSON.stringify(metaPayload),
      declarationDate: document.getElementById('cd-date').value ? new Date(document.getElementById('cd-date').value).toISOString() : new Date().toISOString(),
      status: parseInt(document.getElementById('cd-status').value)
    };

    try {
      const createRes = await api.post('/api/customsDeclarations', payload);
      const declarationId = createRes?.data?.id;

      // 1. Upload file nếu có
      const fileInput = document.getElementById('cd-file');
      const fileToUpload = (fileInput && fileInput.files && fileInput.files[0]) || uploadedCustomsFile;

      if (fileToUpload && declarationId) {
        try {
          const formData = new FormData();
          formData.append("File", fileToUpload);
          formData.append("Category", "Customs");
          formData.append("EntityType", "CustomsDeclaration");
          formData.append("EntityId", declarationId);
          if (payload.shipmentId) formData.append("ShipmentId", payload.shipmentId);

          await api.upload('/api/documents/upload', formData);
        } catch (uploadErr) {
          console.warn('Không thể upload file đính kèm:', uploadErr);
        }
      }

      // 2. Đồng bộ các dòng hàng đã map sản phẩm vào Lô hàng (ShipmentItems)
      const validShipmentItems = finalItems.filter(it => it.productId).map(it => ({
        productId: it.productId,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        notes: it.customsName
      }));

      if (validShipmentItems.length > 0 && sid) {
        try {
          await api.post(`/api/shipments/${sid}/items`, { items: validShipmentItems });
        } catch (errItems) {
          console.warn('Không thể đồng bộ vào dòng hàng lô hàng:', errItems);
        }
      }

      toast('Tạo tờ khai hải quan thành công! Đã tự động đọc và lưu trữ dòng hàng.', 'success');
      closeModal();
      if (onSuccess) onSuccess();
      else fetchAllData();
    } catch (err) {
      toast(err.message || 'Lỗi khi tạo tờ khai', 'error');
    }
  });
}

// ─── CHỈNH SỬA TỜ KHAI ────────────────────────────────────────────────────────
window.editCustomsDeclaration = async function (id, onSuccess = null) {
  try {
    const res = await api.get(`/api/customsDeclarations/${id}`);
    const cd = res.data;
    const dateVal = cd.declarationDate ? cd.declarationDate.split('T')[0] : '';
    const meta = parseCustomsMeta(cd.notes);

    const isDom = meta.isDomestic;

    const modalHtml = `
      <form id="form-edit-customs" style="padding: 4px 0;">
        <!-- CHỌN NGUỒN GỐC TỜ KHAI -->
        <div style="margin-bottom: 14px;">
          <label class="form-label required" style="font-size:12px; font-weight:700;">Loại Hình Nhập Khẩu & Tiền Tệ</label>
          <div class="customs-scope-picker">
            <label class="customs-scope-option ${!isDom ? 'selected' : ''}" id="lblScopeForeignEdit">
              <input type="radio" name="cd-scope-radio-edit" value="foreign" ${!isDom ? 'checked' : ''}>
              <div>
                <div style="font-weight:700; color:#1d4ed8; font-size:13px;">🌐 Nhập Khẩu Nước Ngoài (USD)</div>
                <div style="font-size:11px; color:#64748b; margin-top:2px;">Trị giá nguyên tệ USD, quy đổi theo Tỷ giá Hải quan để tính thuế</div>
              </div>
            </label>
            <label class="customs-scope-option ${isDom ? 'selected' : ''}" id="lblScopeDomesticEdit">
              <input type="radio" name="cd-scope-radio-edit" value="domestic" ${isDom ? 'checked' : ''}>
              <div>
                <div style="font-weight:700; color:#15803d; font-size:13px;">🏠 Mua Bán Trong Nước (VNĐ)</div>
                <div style="font-size:11px; color:#64748b; margin-top:2px;">Giao dịch nội địa trực tiếp bằng VNĐ, không có USD/tỷ giá</div>
              </div>
            </label>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px 16px;">
          <div class="form-group">
            <label class="form-label required">Số Tờ Khai HQ</label>
            <input type="text" id="cd-number-edit" class="form-control" required value="${escapeHtml(cd.declarationNumber)}" style="font-family:monospace; font-weight:700; color:var(--amis-blue);">
          </div>

          <div class="form-group">
            <label class="form-label required">Lô Hàng Liên Quan</label>
            <select id="cd-shipment-edit" class="form-control" required disabled>
              <option value="${cd.shipmentId}">${escapeHtml(cd.shipmentCode || 'Lô hàng đã chọn')}</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label required">Mã Loại Hình</label>
            <select id="cd-type-edit" class="form-control" required>
              <option value="A11" ${cd.declarationType === 'A11' ? 'selected' : ''}>A11 - Nhập KD tiêu dùng</option>
              <option value="A12" ${cd.declarationType === 'A12' ? 'selected' : ''}>A12 - Nhập KD SX</option>
              <option value="E21" ${cd.declarationType === 'E21' ? 'selected' : ''}>E21 - Nhập NVL gia công</option>
              <option value="B11" ${cd.declarationType === 'B11' ? 'selected' : ''}>B11 - Xuất kinh doanh</option>
              <option value="B13" ${cd.declarationType === 'B13' ? 'selected' : ''}>B13 - Xuất đã NK</option>
              <option value="H11" ${cd.declarationType === 'H11' ? 'selected' : ''}>H11 - Hàng phi mậu dịch</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label required">Phân Luồng</label>
            <select id="cd-status-edit" class="form-control">
              <option value="1" ${cd.status === 1 ? 'selected' : ''}>🟢 Luồng Xanh (1 - Thông quan)</option>
              <option value="2" ${cd.status === 2 ? 'selected' : ''}>🟡 Luồng Vàng (2 - Kiểm tra hồ sơ)</option>
              <option value="3" ${cd.status === 3 ? 'selected' : ''}>🔴 Luồng Đỏ (3 - Kiểm hóa thực tế)</option>
              <option value="0" ${cd.status === 0 ? 'selected' : ''}>⚪ Chưa phân luồng</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Chi Cục Hải Quan</label>
            <input type="text" id="cd-branch-edit" class="form-control" value="${escapeHtml(cd.customsBranch || '')}">
          </div>

          <div class="form-group">
            <label class="form-label">Ngày Đăng Ký</label>
            <input type="date" id="cd-date-edit" class="form-control" value="${dateVal}">
          </div>
        </div>

        <!-- KHỐI TÍNH TRỊ GIÁ & THUẾ HẢI QUAN EDIT -->
        <div class="customs-tax-box" id="customsTaxBoxEdit">
          <div class="customs-tax-box-title">
            <span>Kê Khai Trị Giá Tính Thuế & Tiền Thuế</span>
            <span id="taxBoxScopeNoteEdit" style="font-size:11px; font-weight:normal; text-transform:none; color:#0266b3;">
              ${!isDom ? 'Quy đổi USD theo tỷ giá Hải quan để tính thuế' : 'Giao dịch trực tiếp bằng VNĐ'}
            </span>
          </div>

          <!-- PHẦN CHO HÀNG NƯỚC NGOÀI (USD) -->
          <div id="sectionForeignTaxEdit" style="${!isDom ? 'display:block;' : 'display:none;'}">
            <div style="display:grid; grid-template-columns: 1.2fr 1fr 1.3fr; gap:12px; margin-bottom:12px;">
              <div class="form-group" style="margin:0;">
                <label class="form-label required">Trị Giá Nguyên Tệ ($ USD)</label>
                <input type="number" step="0.01" id="cd-val-usd-edit" class="form-control" value="${meta.valueUsd || ''}" placeholder="VD: 23109.61">
              </div>
              <div class="form-group" style="margin:0;">
                <label class="form-label required">Tỷ Giá Hải Quan (VNĐ/USD)</label>
                <input type="number" step="1" id="cd-exchange-rate-edit" class="form-control" value="${meta.exchangeRate || 25450}" placeholder="VD: 25450 hoặc 25890">
              </div>
              <div class="form-group" style="margin:0;">
                <label class="form-label">Trị Giá Tính Thuế Quy Đổi (VNĐ)</label>
                <input type="text" id="cd-val-vnd-calculated-edit" class="form-control" readonly style="background:#f1f5f9; font-weight:700; color:#15803d;">
              </div>
            </div>
            <div style="font-size:11px; color:#64748b; margin-bottom:12px;">
              * Ngoại tệ USD được quy đổi theo tỷ giá Hải quan để tính thuế Nhập khẩu và VAT.
            </div>
          </div>

          <!-- PHẦN CHO HÀNG TRONG NƯỚC (VNĐ) -->
          <div id="sectionDomesticTaxEdit" style="${isDom ? 'display:block;' : 'display:none;'}">
            <div style="display:grid; grid-template-columns: 1fr; gap:12px; margin-bottom:12px;">
              <div class="form-group" style="margin:0;">
                <label class="form-label required">Trị Giá Hàng Hóa / Tính Thuế (VNĐ)</label>
                <input type="number" step="1000" id="cd-val-vnd-direct-edit" class="form-control" value="${meta.taxableValueVnd || ''}" placeholder="VD: 500000000">
              </div>
            </div>
            <div style="font-size:11px; color:#15803d; margin-bottom:12px; font-weight:600;">
              ✓ Giao dịch nội địa sử dụng tiền tệ Việt Nam Đồng (VNĐ). Đô là đô, VNĐ là VNĐ, không sử dụng tỷ giá quy đổi.
            </div>
          </div>

          <!-- THUẾ NHẬP KHẨU & VAT -->
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; padding-top:10px; border-top:1px dashed #cbd5e1;">
            <div class="form-group" style="margin:0;" id="grpImportTaxEdit">
              <label class="form-label">% Thuế Nhập Khẩu</label>
              <div style="display:flex; gap:6px; align-items:center;">
                <input type="number" step="0.5" id="cd-tax-import-rate-edit" class="form-control" value="${meta.importTaxRate || 0}" style="width:80px;">
                <span style="font-size:12px;">%</span>
                <span id="txtImportTaxAmountEdit" style="margin-left:auto; font-weight:600; color:#b45309; font-size:12px;">0 ₫</span>
              </div>
            </div>
            <div class="form-group" style="margin:0;">
              <label class="form-label">% Thuế GTGT (VAT)</label>
              <div style="display:flex; gap:6px; align-items:center;">
                <input type="number" step="1" id="cd-tax-vat-rate-edit" class="form-control" value="${meta.vatRate !== undefined ? meta.vatRate : 8}" style="width:80px;">
                <span style="font-size:12px;">%</span>
                <span id="txtVatTaxAmountEdit" style="margin-left:auto; font-weight:600; color:#b45309; font-size:12px;">0 ₫</span>
              </div>
            </div>
          </div>

          <!-- TỔNG TIỀN THUẾ HQ -->
          <div class="customs-tax-summary-bar">
            <div style="font-weight:700; color:#334155; font-size:13px;">Tổng Tiền Thuế Phải Nộp (VNĐ):</div>
            <div id="txtTotalTaxCustomsEdit" style="font-size:16px; font-weight:800; color:#dc2626;">0 ₫</div>
          </div>
        </div>

        <div class="form-group" style="grid-column: span 2;">
          <label class="form-label">Đính Kèm Tệp Mới (File Excel .xlsx / PDF)</label>
          <input type="file" id="cd-file-edit" class="form-control" accept=".xlsx,.xls,.pdf,.xml">
        </div>

        <div class="form-group" style="grid-column: span 2;">
          <label class="form-label">Ghi Chú</label>
          <textarea id="cd-notes-edit" class="form-control" rows="2">${escapeHtml(meta.userNotes || '')}</textarea>
        </div>

        <div style="margin-top: 18px; padding-top: 12px; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 8px;">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">✕ Hủy bỏ</button>
          <button type="button" class="btn btn-primary" id="btn-update-customs">✔ Cập Nhật Tờ Khai</button>
        </div>
      </form>
    `;

    openModal(`Chỉnh Sửa Tờ Khai: ${escapeHtml(cd.declarationNumber)}`, modalHtml);

    function updateScopeUIEdit(scope) {
      const isD = scope === 'domestic';
      const secForeign = document.getElementById('sectionForeignTaxEdit');
      const secDomestic = document.getElementById('sectionDomesticTaxEdit');
      const grpImportTax = document.getElementById('grpImportTaxEdit');
      const note = document.getElementById('taxBoxScopeNoteEdit');
      const lblFor = document.getElementById('lblScopeForeignEdit');
      const lblDom = document.getElementById('lblScopeDomesticEdit');

      if (isD) {
        if (lblFor) lblFor.classList.remove('selected');
        if (lblDom) lblDom.classList.add('selected');
        if (secForeign) secForeign.style.display = 'none';
        if (secDomestic) secDomestic.style.display = 'block';
        if (grpImportTax) grpImportTax.style.display = 'none';
        if (note) note.textContent = 'Giao dịch trực tiếp bằng VNĐ (Hàng trong nước)';
      } else {
        if (lblFor) lblFor.classList.add('selected');
        if (lblDom) lblDom.classList.remove('selected');
        if (secForeign) secForeign.style.display = 'block';
        if (secDomestic) secDomestic.style.display = 'none';
        if (grpImportTax) grpImportTax.style.display = 'block';
        if (note) note.textContent = 'Quy đổi USD theo tỷ giá Hải quan để tính thuế';
      }
      recalculateEditTaxes();
    }

    document.querySelectorAll('input[name="cd-scope-radio-edit"]').forEach(r => {
      r.addEventListener('change', function () {
        updateScopeUIEdit(this.value);
      });
    });

    function recalculateEditTaxes() {
      const isD = document.querySelector('input[name="cd-scope-radio-edit"]:checked')?.value === 'domestic';
      let taxableVnd = 0;

      if (isD) {
        taxableVnd = Number(document.getElementById('cd-val-vnd-direct-edit')?.value || 0);
      } else {
        const valUsd = Number(document.getElementById('cd-val-usd-edit')?.value || 0);
        const rate = Number(document.getElementById('cd-exchange-rate-edit')?.value || 0);
        taxableVnd = Math.round(valUsd * rate);
        const valVndCalc = document.getElementById('cd-val-vnd-calculated-edit');
        if (valVndCalc) valVndCalc.value = taxableVnd ? `${taxableVnd.toLocaleString('vi-VN')} ₫` : '';
      }

      const impRate = isD ? 0 : Number(document.getElementById('cd-tax-import-rate-edit')?.value || 0);
      const vatRate = Number(document.getElementById('cd-tax-vat-rate-edit')?.value || 0);

      const impAmount = Math.round(taxableVnd * (impRate / 100));
      const vatAmount = Math.round((taxableVnd + impAmount) * (vatRate / 100));
      const totalTax = impAmount + vatAmount;

      const txtImp = document.getElementById('txtImportTaxAmountEdit');
      const txtVat = document.getElementById('txtVatTaxAmountEdit');
      const txtTotal = document.getElementById('txtTotalTaxCustomsEdit');

      if (txtImp) txtImp.textContent = `${impAmount.toLocaleString('vi-VN')} ₫`;
      if (txtVat) txtVat.textContent = `${vatAmount.toLocaleString('vi-VN')} ₫`;
      if (txtTotal) txtTotal.textContent = `${totalTax.toLocaleString('vi-VN')} ₫`;
    }

    ['cd-val-usd-edit', 'cd-exchange-rate-edit', 'cd-val-vnd-direct-edit', 'cd-tax-import-rate-edit', 'cd-tax-vat-rate-edit'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', recalculateEditTaxes);
    });

    recalculateEditTaxes();

    document.getElementById('btn-update-customs')?.addEventListener('click', async () => {
      const num = document.getElementById('cd-number-edit').value.trim();
      if (!num) {
        toast('Vui lòng nhập Số tờ khai', 'error');
        return;
      }

      const isD = document.querySelector('input[name="cd-scope-radio-edit"]:checked')?.value === 'domestic';
      let valUsd = null;
      let rate = null;
      let taxableVnd = 0;

      if (isD) {
        taxableVnd = Number(document.getElementById('cd-val-vnd-direct-edit')?.value || 0);
      } else {
        valUsd = Number(document.getElementById('cd-val-usd-edit')?.value || 0);
        rate = Number(document.getElementById('cd-exchange-rate-edit')?.value || 0);
        taxableVnd = Math.round(valUsd * rate);
      }

      const impRate = isD ? 0 : Number(document.getElementById('cd-tax-import-rate-edit')?.value || 0);
      const vatRate = Number(document.getElementById('cd-tax-vat-rate-edit')?.value || 0);
      const impAmount = Math.round(taxableVnd * (impRate / 100));
      const vatAmount = Math.round((taxableVnd + impAmount) * (vatRate / 100));
      const totalTax = impAmount + vatAmount;

      const metaPayload = {
        scope: isD ? 'domestic' : 'foreign',
        isDomestic: isD,
        currency: isD ? 'VND' : 'USD',
        valueUsd: valUsd,
        exchangeRate: rate,
        taxableValueVnd: taxableVnd,
        importTaxRate: impRate,
        importTaxAmount: impAmount,
        vatRate: vatRate,
        vatAmount: vatAmount,
        totalTaxAmount: totalTax,
        userNotes: document.getElementById('cd-notes-edit').value.trim()
      };

      const payload = {
        declarationNumber: num,
        declarationType: document.getElementById('cd-type-edit').value,
        customsBranch: document.getElementById('cd-branch-edit').value.trim(),
        shipmentId: cd.shipmentId,
        notes: JSON.stringify(metaPayload),
        declarationDate: document.getElementById('cd-date-edit').value ? new Date(document.getElementById('cd-date-edit').value).toISOString() : cd.declarationDate,
        status: parseInt(document.getElementById('cd-status-edit').value)
      };

      try {
        await api.put(`/api/customsDeclarations/${id}`, payload);

        // Upload file nếu có
        const fileInput = document.getElementById('cd-file-edit');
        if (fileInput && fileInput.files.length > 0) {
          const formData = new FormData();
          formData.append("File", fileInput.files[0]);
          formData.append("Category", "Customs");
          formData.append("EntityType", "CustomsDeclaration");
          formData.append("EntityId", id);
          if (payload.shipmentId) formData.append("ShipmentId", payload.shipmentId);

          await api.upload('/api/documents/upload', formData);
        }

        toast('Cập nhật tờ khai hải quan thành công!', 'success');
        closeModal();
        if (onSuccess) onSuccess();
        else fetchAllData();
      } catch (err) {
        toast(err.message || 'Lỗi khi cập nhật tờ khai', 'error');
      }
    });
  } catch (err) {
    toast(`Lỗi: ${err.message}`, 'error');
  }
};

// ─── XEM BẢN TỜ KHAI ─────────────────────────────────────────────────────────
window.viewCustomsVNACCS = function (id) {
  const cd = allDeclarations.find(x => x.id === id);
  if (!cd) {
    toast('Không tìm thấy thông tin tờ khai', 'error');
    return;
  }

  const dDate = cd.declarationDate ? new Date(cd.declarationDate).toLocaleDateString('vi-VN') : '---';
  const channelLabel = cd.status === 1 ? 'LUỒNG XANH (1) - THÔNG QUAN' : (cd.status === 2 ? 'LUỒNG VÀNG (2) - KIỂM TRA HỒ SƠ' : (cd.status === 3 ? 'LUỒNG ĐỎ (3) - KIỂM HÓA' : 'CHƯA PHÂN LUỒNG'));
  const channelColor = cd.status === 1 ? '#15803d' : (cd.status === 2 ? '#b45309' : '#dc2626');

  const contentHtml = `
    <div class="vnaccs-modal-wrap">
      <div class="vnaccs-sheet" id="printableCustomsSheet">
        <!-- HEADER -->
        <div class="vnaccs-header">
          <div style="font-size:11.5px; line-height:1.4;">
            <strong>TỔNG CỤC HẢI QUAN</strong><br>
            HẢI QUAN VIỆT NAM<br>
            <span style="font-size:10.5px; color:#475569;">HỆ THỐNG VNACCS/VCIS</span>
          </div>

          <div class="vnaccs-emblem-title">
            <div class="vnaccs-country">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
            <div class="vnaccs-motto">Độc lập - Tự do - Hạnh phúc</div>
            <div class="vnaccs-main-title">TỜ KHAI HÀNG HÓA ${cd.shipmentType === 'Export' ? 'XUẤT KHẨU' : 'NHẬP KHẨU'} (THÔNG QUAN)</div>
          </div>

          <div class="vnaccs-meta-box">
            <div>Số tờ khai: <strong style="color:#0266b3; font-size:13px; font-family:monospace;">${escapeHtml(cd.declarationNumber)}</strong></div>
            <div>Ngày đăng ký: <strong>${dDate}</strong></div>
            <div>Mã loại hình: <strong>${escapeHtml(cd.declarationType)}</strong></div>
            <div>Nguồn gốc: <strong>${cd.isDomestic ? 'Trong nước (VNĐ)' : 'Nước ngoài (USD)'}</strong></div>
            <div style="color:${channelColor}; font-weight:800; margin-top:2px;">${channelLabel}</div>
          </div>
        </div>

        <!-- 1. CƠ QUAN HẢI QUAN -->
        <div class="vnaccs-section-title">
          <span>1. CƠ QUAN HẢI QUAN TIẾP NHẬN</span>
          <span>Mã chi cục: ${escapeHtml(cd.customsBranch.split(' - ')[0] || '02CI')}</span>
        </div>
        <div class="vnaccs-grid">
          <div class="vnaccs-cell">
            <div class="vnaccs-cell-label">Chi cục Hải quan tiếp nhận tờ khai:</div>
            <div class="vnaccs-cell-val">${escapeHtml(cd.customsBranch)}</div>
          </div>
          <div class="vnaccs-cell">
            <div class="vnaccs-cell-label">Mã Lô hàng xuất nhập khẩu liên kết:</div>
            <div class="vnaccs-cell-val">${escapeHtml(cd.shipmentCode)}</div>
          </div>
        </div>

        <!-- 2. DOANH NGHIỆP XUẤT NHẬP KHẨU -->
        <div class="vnaccs-section-title">
          <span>2. DOANH NGHIỆP / ĐỐI TÁC THƯƠNG MẠI</span>
        </div>
        <div class="vnaccs-grid">
          <div class="vnaccs-cell">
            <div class="vnaccs-cell-label">Người nhập khẩu / Người khai hải quan:</div>
            <div class="vnaccs-cell-val">CÔNG TY CỔ PHẦN XUẤT NHẬP KHẨU IMEX VIỆT NAM</div>
            <div style="font-size:11px; color:#64748b;">MST: 0312345678 • Khu Công Nghiệp Tân Bình, TP. Hồ Chí Minh</div>
          </div>
          <div class="vnaccs-cell">
            <div class="vnaccs-cell-label">${cd.isDomestic ? 'Bên bán / Nhà cung cấp nội địa:' : 'Người xuất khẩu / Đối tác nước ngoài:'}</div>
            <div class="vnaccs-cell-val">${escapeHtml(cd.partnerName)}</div>
            <div style="font-size:11px; color:#64748b;">${cd.isDomestic ? 'Giao dịch nội địa (VNĐ)' : 'Quốc gia: Taiwan / China'}</div>
          </div>
        </div>

        <!-- 3. THÔNG TIN HÀNG HÓA & TRỊ GIÁ TÍNH THUẾ -->
        <div class="vnaccs-section-title">
          <span>3. TRỊ GIÁ TÍNH THUẾ & TIỀN THUẾ HẢI QUAN</span>
        </div>
        <table class="vnaccs-table">
          <thead>
            <tr>
              <th style="width:30px;">#</th>
              <th>Mã HS</th>
              <th>Mô Tả Hàng Hóa</th>
              <th>ĐVT</th>
              ${!cd.isDomestic ? '<th style="text-align:right;">Trị Giá ($ USD)</th>' : ''}
              ${!cd.isDomestic ? '<th style="text-align:right;">Tỷ Giá HQ</th>' : ''}
              <th style="text-align:right;">Trị Giá Tính Thuế (VNĐ)</th>
              ${!cd.isDomestic ? '<th style="text-align:center;">Thuế NK</th>' : ''}
              <th style="text-align:center;">Thuế GTGT</th>
              <th style="text-align:right;">Tổng Thuế (VNĐ)</th>
            </tr>
          </thead>
          <tbody>
            ${(cd.items && cd.items.length > 0) ? cd.items.map((it, idx) => `
              <tr>
                <td style="text-align:center;">${it.index || idx + 1}</td>
                <td style="font-family:monospace; font-weight:700;">${escapeHtml(it.hsCode || '5402.47.00')}</td>
                <td>
                  <strong>${escapeHtml(it.customsName || '---')}</strong>
                  ${it.productSku ? `<div style="font-size:11px; color:#0369a1; font-weight:700; margin-top:2px;">[SKU: ${escapeHtml(it.productSku)}]</div>` : ''}
                </td>
                <td style="text-align:center;">${escapeHtml(it.unit || 'kg')}</td>
                ${!cd.isDomestic ? `<td style="text-align:right; font-weight:700; color:#0369a1;">$${Number(it.totalPrice || (it.quantity * it.unitPrice) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>` : ''}
                ${!cd.isDomestic ? `<td style="text-align:right; font-family:monospace;">${Number(cd.exchangeRate || 0).toLocaleString('vi-VN')}</td>` : ''}
                <td style="text-align:right; font-weight:700; color:#15803d;">${Number(it.taxableValueVnd || Math.round((it.totalPrice || (it.quantity * it.unitPrice) || 0) * (cd.exchangeRate || 1))).toLocaleString('vi-VN')} ₫</td>
                ${!cd.isDomestic ? `<td style="text-align:center;">${it.importTaxRate !== undefined ? it.importTaxRate : (cd.importTaxRate || 0)}%</td>` : ''}
                <td style="text-align:center;">${it.vatRate !== undefined ? it.vatRate : (cd.vatRate || 8)}%</td>
                <td style="text-align:right; font-weight:700; color:#b45309;">${Number(it.totalTax || Math.round((it.taxableValueVnd || ((it.totalPrice || 0) * (cd.exchangeRate || 1))) * (1 + ((it.importTaxRate || 0)/100)) * ((it.vatRate || 8)/100))).toLocaleString('vi-VN')} ₫</td>
              </tr>
            `).join('') : `
              <tr>
                <td style="text-align:center;">1</td>
                <td style="font-family:monospace; font-weight:700;">5402.47.00</td>
                <td><strong>Sợi filament tổng hợp (Polyester DTY / FDY)</strong></td>
                <td style="text-align:center;">kg</td>
                ${!cd.isDomestic ? `<td style="text-align:right; font-weight:700; color:#0369a1;">$${Number(cd.valueUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>` : ''}
                ${!cd.isDomestic ? `<td style="text-align:right; font-family:monospace;">${Number(cd.exchangeRate || 0).toLocaleString('vi-VN')}</td>` : ''}
                <td style="text-align:right; font-weight:700; color:#15803d;">${Number(cd.taxableValueVnd || 0).toLocaleString('vi-VN')} ₫</td>
                ${!cd.isDomestic ? `<td style="text-align:center;">${cd.importTaxRate || 0}%</td>` : ''}
                <td style="text-align:center;">${cd.vatRate || 8}%</td>
                <td style="text-align:right; font-weight:700; color:#b45309;">${Number(cd.totalTaxAmount || 0).toLocaleString('vi-VN')} ₫</td>
              </tr>
            `}
          </tbody>
          <tfoot>
            <tr style="background:#f8fafc; font-weight:700;">
              <td colspan="${!cd.isDomestic ? '6' : '4'}" style="text-align:right;">Tổng trị giá tính thuế & Tổng thuế:</td>
              <td style="text-align:right; color:#15803d; font-size:12.5px;">${Number(cd.taxableValueVnd || 0).toLocaleString('vi-VN')} ₫</td>
              <td colspan="${!cd.isDomestic ? '2' : '1'}"></td>
              <td style="text-align:right; color:#dc2626; font-size:12.5px;">${Number(cd.totalTaxAmount || 0).toLocaleString('vi-VN')} ₫</td>
            </tr>
          </tfoot>
        </table>

        ${cd.docName ? `
          <div style="margin-top:12px; padding:8px 12px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; font-size:12px; display:flex; align-items:center; justify-content:space-between;">
            <div>
              <strong>Tệp đính kèm gốc:</strong> ${escapeHtml(cd.docName)}
            </div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="window.viewCustomsDoc('${id}')">
              📥 Tải File Gốc
            </button>
          </div>
        ` : ''}

        <!-- CHỮ KÝ VÀ DẤU HẢI QUAN -->
        <div class="vnaccs-signatures">
          <div class="vnaccs-sig-block">
            <div class="vnaccs-sig-title">NGƯỜI KHAI HẢI QUAN</div>
            <div class="vnaccs-sig-sub">(Đã xác nhận khai báo)</div>
            <div style="color:#0369a1; font-weight:700; font-size:11.5px;">✔ XÁC NHẬN HỢP LỆ</div>
            <div style="font-size:11px; color:#64748b;">Thời gian: ${dDate}</div>
          </div>
          <div class="vnaccs-sig-block">
            <div class="vnaccs-sig-title">CÔNG CHỨC HẢI QUAN</div>
            <div class="vnaccs-sig-sub">(Xác nhận thông quan)</div>
            <div class="vnaccs-stamp-box">HẢI QUAN VIỆT NAM<br>ĐÃ THÔNG QUAN</div>
          </div>
        </div>
      </div>

      <div style="margin-top:16px; display:flex; justify-content:flex-end; gap:8px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Đóng</button>
        ${cd.docName ? `<button type="button" class="btn btn-secondary" onclick="window.viewCustomsDoc('${id}')">📥 Tải File Đính Kèm (${escapeHtml(cd.docName)})</button>` : ''}
        <button type="button" class="btn btn-primary" onclick="window.printCustomsVNACCS('${id}')">
          🖨️ In Tờ Khai (A4)
        </button>
      </div>
    </div>
  `;

  openModal(`Tờ Khai Hải Quan: ${escapeHtml(cd.declarationNumber)}`, contentHtml);
};

// ─── IN TỜ KHAI CHUẨN A4 ──────────────────────────────────────────────────────
window.printCustomsVNACCS = function (id) {
  const cd = allDeclarations.find(x => x.id === id);
  if (!cd) return;

  const printWin = window.open('', '_blank');
  if (!printWin) {
    toast('Vui lòng cho phép mở popup trình duyệt để in tờ khai', 'warning');
    return;
  }

  const dDate = cd.declarationDate ? new Date(cd.declarationDate).toLocaleDateString('vi-VN') : '---';
  const channelLabel = cd.status === 1 ? 'LUỒNG XANH (1) - THÔNG QUAN' : (cd.status === 2 ? 'LUỒNG VÀNG (2) - KIỂM TRA HỒ SƠ' : (cd.status === 3 ? 'LUỒNG ĐỎ (3) - KIỂM HÓA' : 'CHƯA PHÂN LUỒNG'));
  const channelColor = cd.status === 1 ? '#15803d' : (cd.status === 2 ? '#b45309' : '#dc2626');

  printWin.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>To_Khai_HQ_${escapeHtml(cd.declarationNumber)}</title>
      <style>
        body { font-family: 'Times New Roman', serif; padding: 20px; color: #000; font-size: 13px; line-height: 1.3; }
        .sheet { max-width: 800px; margin: 0 auto; border: 1.5px solid #000; padding: 20px 24px; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
        .emblem { text-align: center; flex: 1; }
        .sec-title { font-size: 12px; font-weight: bold; background: #eee; padding: 3px 6px; border: 1px solid #999; margin-top: 8px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #999; border-top: none; }
        .cell { padding: 4px 6px; border-right: 1px solid #999; border-bottom: 1px solid #999; }
        .cell:nth-child(2n) { border-right: none; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
        th, td { border: 1px solid #000; padding: 4px 6px; }
        .sig { display: grid; grid-template-columns: 1fr 1fr; margin-top: 20px; text-align: center; }
        .stamp { display: inline-block; padding: 6px 14px; border: 2px dashed #dc2626; color: #dc2626; font-weight: bold; }
        @media print {
          body { padding: 0; }
          .sheet { border: 1px solid #000; box-shadow: none; }
        }
      </style>
    </head>
    <body onload="window.print(); window.close();">
      <div class="sheet">
        <div class="header">
          <div><strong>TỔNG CỤC HẢI QUAN</strong><br>HẢI QUAN VIỆT NAM</div>
          <div class="emblem">
            <div><strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong></div>
            <div style="font-size:11px; font-style:italic;">Độc lập - Tự do - Hạnh phúc</div>
            <div style="font-size:16px; font-weight:bold; margin-top:4px;">TỜ KHAI HÀNG HÓA ${cd.shipmentType === 'Export' ? 'XUẤT KHẨU' : 'NHẬP KHẨU'}</div>
          </div>
          <div style="border:1px solid #000; padding:4px 8px; font-family:Arial; font-size:11px;">
            Số: <strong>${escapeHtml(cd.declarationNumber)}</strong><br>
            Ngày: <strong>${dDate}</strong><br>
            Mã LH: <strong>${escapeHtml(cd.declarationType)}</strong><br>
            Nguồn gốc: <strong>${cd.isDomestic ? 'Trong nước (VNĐ)' : 'Nước ngoài (USD)'}</strong><br>
            <span style="color:${channelColor}; font-weight:bold;">${channelLabel}</span>
          </div>
        </div>

        <div class="sec-title">1. CƠ QUAN HẢI QUAN TIẾP NHẬN</div>
        <div class="grid">
          <div class="cell">Chi cục Hải quan: <strong>${escapeHtml(cd.customsBranch)}</strong></div>
          <div class="cell">Mã Lô hàng: <strong>${escapeHtml(cd.shipmentCode)}</strong></div>
        </div>

        <div class="sec-title">2. DOANH NGHIỆP XUẤT NHẬP KHẨU</div>
        <div class="grid">
          <div class="cell">Người khai HQ: <strong>CÔNG TY CỔ PHẦN XUẤT NHẬP KHẨU IMEX VIỆT NAM</strong><br>MST: 0312345678</div>
          <div class="cell">${cd.isDomestic ? 'Bên bán nội địa:' : 'Đối tác nước ngoài:'} <strong>${escapeHtml(cd.partnerName)}</strong></div>
        </div>

        <div class="sec-title">3. HÀNG HÓA & TRỊ GIÁ TÍNH THUẾ</div>
        <table>
          <thead>
            <tr>
              <th>#</th><th>Tên Hàng Hóa</th><th>ĐVT</th>
              ${!cd.isDomestic ? '<th>Trị Giá ($ USD)</th><th>Tỷ Giá HQ</th>' : ''}
              <th>Trị Giá Tính Thuế (VNĐ)</th><th>Tiền Thuế (VNĐ)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td align="center">1</td>
              <td>Sợi filament tổng hợp dạng dệt khác (Polyester DTY / FDY)</td>
              <td align="center">kg</td>
              ${!cd.isDomestic ? `<td align="right"><strong>$${Number(cd.valueUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></td><td align="right">${Number(cd.exchangeRate || 0).toLocaleString('vi-VN')}</td>` : ''}
              <td align="right"><strong>${Number(cd.taxableValueVnd || 0).toLocaleString('vi-VN')} ₫</strong></td>
              <td align="right"><strong>${Number(cd.totalTaxAmount || 0).toLocaleString('vi-VN')} ₫</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="sig">
          <div>
            <strong>NGƯỜI KHAI HẢI QUAN</strong><br>
            <em>(Xác nhận khai báo)</em><br><br>
            <span style="color:#0369a1; font-weight:bold;">ĐÃ KHAI BÁO</span>
          </div>
          <div>
            <strong>HẢI QUAN VIỆT NAM</strong><br>
            <em>(Xác nhận thông quan)</em><br><br>
            <div class="stamp">ĐÃ THÔNG QUAN</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
  printWin.document.close();
};

// ─── TẢI / XEM FILE ĐÍNH KÈM TỜ KHAI (.XLSX / .PDF) ─────────────────────────
window.viewCustomsDoc = async function (declarationId) {
  try {
    const cd = allDeclarations.find(x => x.id === declarationId);
    
    // Tìm tài liệu theo entityId hoặc shipmentId
    let doc = null;
    const res = await api.get(`/api/documents?category=Customs`);
    const allDocs = res.data?.items || res.data || [];
    
    doc = allDocs.find(d => 
      (d.entityId && d.entityId.toLowerCase() === declarationId.toLowerCase()) ||
      (cd && cd.declarationNumber && d.fileName && d.fileName.toLowerCase().includes(cd.declarationNumber.toLowerCase())) ||
      (cd && cd.declarationNumber && d.originalFileName && d.originalFileName.toLowerCase().includes(cd.declarationNumber.toLowerCase())) ||
      (cd && cd.shipmentId && d.shipmentId && d.shipmentId.toLowerCase() === cd.shipmentId.toLowerCase())
    );

    if (!doc) {
      toast('Tờ khai này chưa được đính kèm file', 'info');
      return;
    }

    const token = getToken();
    const downloadRes = await fetch(`${API_BASE}/api/documents/${doc.id}/download`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!downloadRes.ok) throw new Error('Không thể tải file từ máy chủ');

    const blob = await downloadRes.blob();
    const url = window.URL.createObjectURL(blob);
    const fileName = doc.originalFileName || doc.fileName || `ToKhai_${cd?.declarationNumber || 'HQ'}.xlsx`;

    if (blob.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
      window.open(url, '_blank');
      toast('Đã mở file PDF trong tab mới', 'success');
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast(`Đã tải file "${fileName}" thành công!`, 'success');
    }
  } catch (err) {
    toast(`Lỗi khi mở file: ${err.message}`, 'error');
  }
};

// ─── XÓA TỜ KHAI ─────────────────────────────────────────────────────────────
window.deleteCustomsDeclaration = function (id, onSuccess = null) {
  const cd = allDeclarations.find(x => x.id === id);
  const num = cd ? cd.declarationNumber : 'này';

  showConfirm({
    title: 'Xác Nhận Xóa Tờ Khai',
    message: `Bạn có chắc chắn muốn xóa tờ khai hải quan số <strong>${escapeHtml(num)}</strong>? Dữ liệu đã xóa không thể khôi phục.`,
    onConfirm: async () => {
      try {
        await api.delete(`/api/customsDeclarations/${id}`);
        toast('Đã xóa tờ khai hải quan thành công!', 'success');
        selectedIds.delete(id);
        if (onSuccess) onSuccess();
        else fetchAllData();
      } catch (err) {
        toast(`Lỗi khi xóa tờ khai: ${err.message}`, 'error');
      }
    }
  });
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
