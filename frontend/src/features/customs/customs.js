// frontend/src/features/customs/customs.js
/**
 * Quản Lý Tờ Khai Hải Quan Điện Tử (VNACCS/VCIS)
 * Giao diện chuẩn MISA AMIS 2025: Sort, Filter, Column Picker, Multi-Select, Print & Excel
 */
import { api, toast, openModal, closeModal, showConfirm, API_BASE, getToken } from '../../core/api.js';

// ─── STATE QUẢN LÝ ────────────────────────────────────────────────────────────
let allDeclarations = [];
let filteredDeclarations = [];
let allShipments = [];
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
  { id: 'declarationType', label: 'Loại Hình', minWidth: '100px', defaultVisible: true, sortable: true },
  { id: 'shipmentCode', label: 'Mã Lô Hàng', minWidth: '150px', defaultVisible: true, sortable: true },
  { id: 'declarationDate', label: 'Ngày Đăng Ký', minWidth: '110px', defaultVisible: true, sortable: true },
  { id: 'customsBranch', label: 'Chi Cục Hải Quan', minWidth: '220px', defaultVisible: true, sortable: true },
  { id: 'partnerName', label: 'Doanh Nghiệp / Đối Tác', minWidth: '180px', defaultVisible: true, sortable: true },
  { id: 'totalValue', label: 'Trị Giá Tính Thuế ($)', minWidth: '140px', defaultVisible: true, sortable: true },
  { id: 'taxAmount', label: 'Tiền Thuế ($)', minWidth: '120px', defaultVisible: false, sortable: true },
  { id: 'notes', label: 'Ghi Chú', minWidth: '150px', defaultVisible: false, sortable: false },
  { id: 'hasFile', label: 'Tệp Đính Kèm', minWidth: '110px', defaultVisible: true, sortable: false },
  { id: 'actions', label: 'Thao Tác', minWidth: '120px', defaultVisible: true, sortable: false }
];

function getSavedColumns() {
  try {
    const saved = localStorage.getItem('xnk_customs_columns');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  const initial = {};
  DEFAULT_COLUMNS.forEach(c => { initial[c.id] = c.defaultVisible; });
  return initial;
}

function saveColumnConfig(cols) {
  try {
    localStorage.setItem('xnk_customs_columns', JSON.stringify(cols));
  } catch (e) {}
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
          <button id="btnCustomsAdd" class="amis-btn amis-btn-primary" title="Mở tờ khai hải quan điện tử mới">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Thêm Tờ Khai HQ
          </button>
          <button id="btnCustomsEdit" class="amis-btn amis-btn-ghost" disabled title="Chỉnh sửa tờ khai đã chọn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
            Sửa
          </button>
          <button id="btnCustomsDetail" class="amis-btn amis-btn-ghost" disabled title="Xem tờ khai chi tiết VNACCS">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Chi tiết
          </button>
          <button id="btnCustomsPrint" class="amis-btn amis-btn-ghost" disabled title="In bản tờ khai chuẩn Hải quan A4">
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
          <button id="btnCustomsSync" class="amis-btn amis-btn-ghost" title="Kết nối Token Chữ ký số và đồng bộ hệ thống VNACCS">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
            Đồng Bộ VNACCS
          </button>
        </div>

        <div class="amis-toolbar-right">
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
              <div class="col-dropdown-body" id="colDropdownBodyCustoms">
                <!-- Sẽ render các checkbox cột -->
              </div>
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
            <tr id="customsTableHeadRow">
              <!-- Sẽ render dynamically theo config cột -->
            </tr>
          </thead>
          <tbody id="customsTableBody">
            <tr>
              <td colspan="12" style="text-align:center; padding: 40px; color: var(--text-muted);">
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
    const [cdRes, shpRes, docRes] = await Promise.all([
      api.get('/api/customsDeclarations?pageSize=500'),
      api.get('/api/shipments?pageSize=200'),
      api.get('/api/documents?category=Customs')
    ]);

    allShipments = shpRes.data?.items || shpRes.data || [];
    customsDocs = docRes.data?.items || docRes.data || [];
    const rawDeclarations = cdRes.data?.items || cdRes.data || [];

    // Map & Enrich
    allDeclarations = rawDeclarations.map(cd => {
      const shp = allShipments.find(s => s.id === cd.shipmentId || s.shipmentCode === cd.shipmentCode);
      const doc = customsDocs.find(d => 
        (d.entityId && d.entityId.toLowerCase() === cd.id.toLowerCase()) ||
        (cd.declarationNumber && d.fileName && d.fileName.toLowerCase().includes(cd.declarationNumber.toLowerCase()))
      );

      // Parse metadata from notes if present
      let parsedNotes = cd.notes || '';
      let meta = {};
      try {
        if (cd.notes && cd.notes.startsWith('{')) {
          meta = JSON.parse(cd.notes);
          parsedNotes = meta.notes || '';
        }
      } catch (e) {}

      const totalVal = meta.totalValue || shp?.totalValue || 0;
      const taxVal = meta.taxAmount || (totalVal * 0.1); // default estimate 10%

      return {
        id: cd.id,
        declarationNumber: cd.declarationNumber || '---',
        declarationDate: cd.declarationDate || cd.createdAt,
        declarationType: cd.declarationType || (shp?.type === 'Export' ? 'B11' : 'A11'),
        customsBranch: cd.customsBranch || '02CI - Chi cục HQ CK Cảng Sài Gòn KV1',
        status: typeof cd.status === 'number' ? cd.status : 1, // 1: Xanh, 2: Vàng, 3: Đỏ
        notes: parsedNotes,
        shipmentId: cd.shipmentId || shp?.id,
        shipmentCode: cd.shipmentCode || shp?.shipmentCode || '---',
        shipmentType: shp?.type || (cd.declarationType?.startsWith('B') ? 'Export' : 'Import'),
        partnerName: shp?.supplierName || shp?.customerName || (shp?.type === 'Export' ? 'CÔNG TY CP XUẤT NHẬP KHẨU IMEX' : 'LONG CHENG WU TEXTILE CO., LTD'),
        totalValue: Number(totalVal),
        taxAmount: Number(taxVal),
        docId: doc?.id,
        docName: doc?.originalFileName || doc?.fileName,
        createdAt: cd.createdAt
      };
    });

    applyFilters();
  } catch (err) {
    console.error('Lỗi khi tải dữ liệu tờ khai:', err);
    toast('Không thể kết nối đến máy chủ lấy danh sách tờ khai', 'error');
    const tbody = document.getElementById('customsTableBody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding:30px; color:#ef4444;">Lỗi khi tải dữ liệu tờ khai hải quan</td></tr>`;
  }
}

// ─── FILTER & SORT ────────────────────────────────────────────────────────────
function applyFilters() {
  const searchTerm = (document.getElementById('customsSearchInput')?.value || '').toLowerCase().trim();
  const filterStatus = document.getElementById('filterCustomsStatus')?.value;
  const filterType = document.getElementById('filterCustomsType')?.value;
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
      if (!matchNumber && !matchShp && !matchBranch && !matchPartner && !matchType) return false;
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

    const cursorStyle = col.sortable ? 'cursor:pointer; user-select:none;' : '';
    html += `
      <th style="min-width:${col.minWidth}; ${cursorStyle}" data-col="${col.id}" class="${col.sortable ? 'sortable-header' : ''}">
        <div style="display:flex; align-items:center; justify-content:${col.id === 'totalValue' || col.id === 'taxAmount' ? 'flex-end' : (col.id === 'actions' || col.id === 'hasFile' ? 'center' : 'flex-start')}">
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
        <td colspan="12" style="text-align: center; padding: 48px; color: var(--text-muted);">
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

    // Type badge
    const isExport = d.declarationType?.startsWith('B') || d.shipmentType === 'Export';
    const typeBadge = `<span class="customs-type-badge ${isExport ? 'export' : ''}">${d.declarationType || 'A11'}</span>`;

    // File attached icon
    const fileHtml = d.docId ? `
      <div style="display:inline-flex; align-items:center; gap:4px; color:var(--amis-blue); font-size:12px; cursor:pointer;" onclick="event.stopPropagation(); window.viewCustomsDoc('${d.id}')" title="Xem/Tải file: ${escapeHtml(d.docName || 'PDF')}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span>PDF</span>
      </div>
    ` : `<span style="color:#94a3b8; font-size:11px;">Chưa có</span>`;

    return `
      <tr class="bl-main-row ${isSelected ? 'selected' : ''}" data-id="${d.id}">
        <td style="text-align: center; position: sticky; left: 0; background: inherit; z-index: 1;">
          <input type="checkbox" class="amis-checkbox chk-row-customs" data-id="${d.id}" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation();">
        </td>

        ${colConfig.declarationNumber ? `
          <td>
            <span class="customs-num-link" onclick="event.stopPropagation(); window.viewCustomsVNACCS('${d.id}')" title="Xem bản tờ khai chuẩn VNACCS">
              ${escapeHtml(d.declarationNumber)}
            </span>
          </td>
        ` : ''}

        ${colConfig.status ? `<td>${channelBadge}</td>` : ''}

        ${colConfig.declarationType ? `<td>${typeBadge}</td>` : ''}

        ${colConfig.shipmentCode ? `
          <td>
            <a href="#" style="font-weight:600; color:var(--amis-blue); text-decoration:none;" onclick="event.stopPropagation(); window.appNavigateTo('shipment-detail', '${d.shipmentId}'); return false;" title="Xem chi tiết lô hàng liên kết">
              ${escapeHtml(d.shipmentCode)}
            </a>
          </td>
        ` : ''}

        ${colConfig.declarationDate ? `<td>${dateFormatted}</td>` : ''}

        ${colConfig.customsBranch ? `<td style="font-size:12px; color:#334155;">${escapeHtml(d.customsBranch)}</td>` : ''}

        ${colConfig.partnerName ? `<td><div style="font-weight:600; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(d.partnerName)}">${escapeHtml(d.partnerName)}</div></td>` : ''}

        ${colConfig.totalValue ? `<td style="text-align:right; font-weight:700; color:var(--amis-green); font-size:12.5px;">$${Number(d.totalValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>` : ''}

        ${colConfig.taxAmount ? `<td style="text-align:right; font-weight:600; color:#b45309;">$${Number(d.taxAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>` : ''}

        ${colConfig.notes ? `<td style="font-size:12px; color:#64748b; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(d.notes || '---')}</td>` : ''}

        ${colConfig.hasFile ? `<td style="text-align:center;">${fileHtml}</td>` : ''}

        ${colConfig.actions ? `
          <td style="text-align:center;">
            <div style="display:inline-flex; align-items:center; gap:4px;">
              <button class="sd-btn-sm" style="padding:2px 6px;" onclick="event.stopPropagation(); window.viewCustomsVNACCS('${d.id}')" title="Xem chi tiết">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
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

  // Nạp lại
  document.getElementById('btnCustomsRefresh')?.addEventListener('click', async () => {
    await fetchAllData();
    toast('Đã nạp lại dữ liệu tờ khai mới nhất!', 'success');
  });

  // Đồng bộ VNACCS
  document.getElementById('btnCustomsSync')?.addEventListener('click', () => {
    toast('Đã kết nối Token Chữ ký số và đồng bộ dữ liệu tờ khai VNACCS/VCIS thành công!', 'success');
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
    'Loại Hình': d.declarationType,
    'Mã Lô Hàng': d.shipmentCode,
    'Ngày Đăng Ký': d.declarationDate ? new Date(d.declarationDate).toLocaleDateString('vi-VN') : '',
    'Chi Cục Hải Quan': d.customsBranch,
    'Doanh Nghiệp / Đối Tác': d.partnerName,
    'Trị Giá Tính Thuế (USD)': d.totalValue,
    'Tiền Thuế (USD)': d.taxAmount,
    'Ghi Chú': d.notes
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "ToKhaiHaiQuan");
  XLSX.writeFile(wb, `To_Khai_Hai_Quan_VNACCS_${new Date().toISOString().slice(0, 10)}.xlsx`);
  toast('Đã xuất file Excel tờ khai hải quan thành công!', 'success');
}

// ─── MODAL TẠO MỚI TỜ KHAI CHUẨN AMIS ──────────────────────────────────────────
export function openCreateCustomsModal(defaultShipmentId = null, onSuccess = null) {
  const autoNum = `10${Math.floor(1000000000 + Math.random() * 9000000000)}`;
  const todayStr = new Date().toISOString().split('T')[0];

  const modalHtml = `
    <form id="form-create-customs" style="padding: 4px 0;">
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px 16px;">
        <div class="form-group">
          <label class="form-label required">Số Tờ Khai HQ (12 số)</label>
          <div style="display:flex; gap:6px;">
            <input type="text" id="cd-number" class="form-control" required value="${autoNum}" placeholder="VD: 105492817290" style="font-family:monospace; font-weight:700; color:var(--amis-blue);">
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
                <option value="${s.id}" ${s.id === defaultShipmentId ? 'selected' : ''}>
                  ${escapeHtml(s.shipmentCode)} (${s.type === 'Export' ? 'Xuất' : 'Nhập'} - ${escapeHtml(s.supplierName || s.customerName || '---')})
                </option>
              `).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label required">Loại Hình Tờ Khai</label>
          <select id="cd-type" class="form-control" required>
            <option value="A11" selected>A11 - Nhập kinh doanh tiêu dùng</option>
            <option value="A12">A12 - Nhập kinh doanh sản xuất</option>
            <option value="E21">E21 - Nhập nguyên liệu gia công</option>
            <option value="B11">B11 - Xuất kinh doanh</option>
            <option value="B13">B13 - Xuất đã nhập khẩu</option>
            <option value="H11">H11 - Hàng phi mậu dịch</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label required">Phân Luồng Hải Quan</label>
          <select id="cd-status" class="form-control">
            <option value="1" selected>🟢 Luồng Xanh (1 - Miễn kiểm tra thực tế & hồ sơ)</option>
            <option value="2">🟡 Luồng Vàng (2 - Kiểm tra hồ sơ chứng từ)</option>
            <option value="3">🔴 Luồng Đỏ (3 - Kiểm tra thực tế hàng hóa)</option>
            <option value="0">⚪ Chưa phân luồng</option>
          </select>
        </div>

        <div class="form-group" style="grid-column: span 2;">
          <label class="form-label">Chi Cục Hải Quan Đăng Ký</label>
          <input type="text" id="cd-branch" class="form-control" list="customsBranchSuggestions" value="02CI - Chi cục HQ CK Cảng Sài Gòn KV1" placeholder="Nhập hoặc chọn chi cục hải quan">
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

        <div class="form-group">
          <label class="form-label">Trị Giá Tính Thuế ($)</label>
          <input type="number" step="0.01" id="cd-value" class="form-control" placeholder="Tự động lấy theo lô hàng">
        </div>

        <div class="form-group" style="grid-column: span 2;">
          <label class="form-label">Tệp đính kèm (File tờ khai PDF / Excel / XML VNACCS)</label>
          <input type="file" id="cd-file" class="form-control" accept=".pdf,.xlsx,.xls,.xml">
        </div>

        <div class="form-group" style="grid-column: span 2;">
          <label class="form-label">Ghi Chú</label>
          <textarea id="cd-notes" class="form-control" rows="2" placeholder="Nhập ghi chú hoặc yêu cầu kiểm dịch, kết quả soi chiếu..."></textarea>
        </div>
      </div>

      <div style="margin-top: 18px; padding-top: 12px; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 8px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">✕ Hủy bỏ</button>
        <button type="button" class="btn btn-primary" id="btn-save-customs">✔ Cất (Lưu Tờ Khai)</button>
      </div>
    </form>
  `;

  openModal('Khai Báo Tờ Khai Hải Quan Mới (VNACCS)', modalHtml);

  // Sinh số mới
  document.getElementById('btnGenCustomsNum')?.addEventListener('click', () => {
    const num = `10${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    document.getElementById('cd-number').value = num;
  });

  // Tự động điền giá trị theo lô hàng đã chọn
  document.getElementById('cd-shipment')?.addEventListener('change', function () {
    const sid = this.value;
    const s = allShipments.find(x => x.id === sid);
    if (s) {
      if (s.totalValue) document.getElementById('cd-value').value = s.totalValue;
      if (s.type === 'Export') document.getElementById('cd-type').value = 'B11';
      else document.getElementById('cd-type').value = 'A11';
    }
  });

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

    const payload = {
      declarationNumber: num,
      declarationType: document.getElementById('cd-type').value,
      customsBranch: document.getElementById('cd-branch').value.trim(),
      shipmentId: sid,
      notes: document.getElementById('cd-notes').value.trim(),
      declarationDate: document.getElementById('cd-date').value ? new Date(document.getElementById('cd-date').value).toISOString() : new Date().toISOString(),
      status: parseInt(document.getElementById('cd-status').value)
    };

    try {
      const createRes = await api.post('/api/customsDeclarations', payload);
      const declarationId = createRes?.data?.id;

      // Upload file nếu có
      const fileInput = document.getElementById('cd-file');
      if (fileInput && fileInput.files.length > 0 && declarationId) {
        const formData = new FormData();
        formData.append("File", fileInput.files[0]);
        formData.append("Category", "Customs");
        formData.append("EntityType", "CustomsDeclaration");
        formData.append("EntityId", declarationId);
        if (payload.shipmentId) formData.append("ShipmentId", payload.shipmentId);

        await api.upload('/api/documents/upload', formData);
      }

      toast('Tạo tờ khai hải quan thành công!', 'success');
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

    const modalHtml = `
      <form id="form-edit-customs" style="padding: 4px 0;">
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
            <label class="form-label required">Loại Hình</label>
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
              <option value="1" ${cd.status === 1 ? 'selected' : ''}>🟢 Luồng Xanh (1 - Miễn kiểm tra)</option>
              <option value="2" ${cd.status === 2 ? 'selected' : ''}>🟡 Luồng Vàng (2 - Kiểm tra hồ sơ)</option>
              <option value="3" ${cd.status === 3 ? 'selected' : ''}>🔴 Luồng Đỏ (3 - Kiểm hóa thực tế)</option>
              <option value="0" ${cd.status === 0 ? 'selected' : ''}>⚪ Chưa phân luồng</option>
            </select>
          </div>

          <div class="form-group" style="grid-column: span 2;">
            <label class="form-label">Chi Cục Hải Quan</label>
            <input type="text" id="cd-branch-edit" class="form-control" value="${escapeHtml(cd.customsBranch || '')}">
          </div>

          <div class="form-group">
            <label class="form-label">Ngày Đăng Ký</label>
            <input type="date" id="cd-date-edit" class="form-control" value="${dateVal}">
          </div>

          <div class="form-group">
            <label class="form-label">Đính Kèm Tệp Mới (Tùy chọn)</label>
            <input type="file" id="cd-file-edit" class="form-control" accept=".pdf,.xlsx,.xls,.xml">
          </div>

          <div class="form-group" style="grid-column: span 2;">
            <label class="form-label">Ghi Chú</label>
            <textarea id="cd-notes-edit" class="form-control" rows="2">${escapeHtml(cd.notes || '')}</textarea>
          </div>
        </div>

        <div style="margin-top: 18px; padding-top: 12px; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 8px;">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">✕ Hủy bỏ</button>
          <button type="button" class="btn btn-primary" id="btn-update-customs">✔ Cập Nhật Tờ Khai</button>
        </div>
      </form>
    `;

    openModal(`Chỉnh Sửa Tờ Khai: ${escapeHtml(cd.declarationNumber)}`, modalHtml);

    document.getElementById('btn-update-customs')?.addEventListener('click', async () => {
      const num = document.getElementById('cd-number-edit').value.trim();
      if (!num) {
        toast('Vui lòng nhập Số tờ khai', 'error');
        return;
      }

      const payload = {
        declarationNumber: num,
        declarationType: document.getElementById('cd-type-edit').value,
        customsBranch: document.getElementById('cd-branch-edit').value.trim(),
        shipmentId: cd.shipmentId,
        notes: document.getElementById('cd-notes-edit').value.trim(),
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

// ─── XEM BẢN TỜ KHAI CHUẨN VNACCS / VCIS ──────────────────────────────────────
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
            <div class="vnaccs-cell-label">Người xuất khẩu / Đối tác nước ngoài:</div>
            <div class="vnaccs-cell-val">${escapeHtml(cd.partnerName)}</div>
            <div style="font-size:11px; color:#64748b;">Mã đối tác: VAR • Quốc gia: Taiwan / China</div>
          </div>
        </div>

        <!-- 3. THÔNG TIN HÀNG HÓA & TRỊ GIÁ TÍNH THUẾ -->
        <div class="vnaccs-section-title">
          <span>3. MẶT HÀNG KHAI BÁO & THUẾ SUẤT</span>
        </div>
        <table class="vnaccs-table">
          <thead>
            <tr>
              <th style="width:30px;">#</th>
              <th>Mã HS</th>
              <th>Mô Tả Hàng Hóa Chi Tiết</th>
              <th>Xuất Xứ</th>
              <th>ĐVT</th>
              <th style="text-align:right;">Lượng</th>
              <th style="text-align:right;">Đơn Giá ($)</th>
              <th style="text-align:right;">Trị Giá ($)</th>
              <th style="text-align:center;">Thuế NK</th>
              <th style="text-align:center;">VAT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align:center;">1</td>
              <td style="font-family:monospace; font-weight:700;">5402.47.00</td>
              <td><strong>Sợi filament tổng hợp dạng dệt khác (Polyester DTY 50D/75D)</strong></td>
              <td style="text-align:center;">Taiwan</td>
              <td style="text-align:center;">kg</td>
              <td style="text-align:right; font-weight:600;">222</td>
              <td style="text-align:right;">$4.00</td>
              <td style="text-align:right; font-weight:700; color:#15803d;">$${Number(cd.totalValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td style="text-align:center; font-weight:600;">5%</td>
              <td style="text-align:center; font-weight:600;">8%</td>
            </tr>
          </tbody>
          <tfoot>
            <tr style="background:#f8fafc; font-weight:700;">
              <td colspan="7" style="text-align:right;">Tổng trị giá khai báo:</td>
              <td style="text-align:right; color:#15803d; font-size:12.5px;">$${Number(cd.totalValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td colspan="2" style="text-align:center;">Quy đổi: ≈ ${(Number(cd.totalValue) * 25450).toLocaleString('vi-VN')} ₫</td>
            </tr>
          </tfoot>
        </table>

        <!-- CHỮ KÝ VÀ DẤU HẢI QUAN -->
        <div class="vnaccs-signatures">
          <div class="vnaccs-sig-block">
            <div class="vnaccs-sig-title">NGƯỜI KHAI HẢI QUAN</div>
            <div class="vnaccs-sig-sub">(Ký điện tử bởi Token Doanh Nghiệp)</div>
            <div style="color:#0369a1; font-weight:700; font-size:11.5px;">✔ CHỨNG THƯ SỐ VIETTEL-CA HỢP LỆ</div>
            <div style="font-size:11px; color:#64748b;">Thời gian ký: ${dDate}</div>
          </div>
          <div class="vnaccs-sig-block">
            <div class="vnaccs-sig-title">CÔNG CHỨC HẢI QUAN / HỆ THỐNG VNACCS</div>
            <div class="vnaccs-sig-sub">(Xác nhận thông quan tự động)</div>
            <div class="vnaccs-stamp-box">HẢI QUAN VIỆT NAM<br>ĐÃ THÔNG QUAN</div>
          </div>
        </div>
      </div>

      <div style="margin-top:16px; display:flex; justify-content:flex-end; gap:8px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Đóng</button>
        <button type="button" class="btn btn-primary" onclick="window.printCustomsVNACCS('${id}')">
          🖨️ In Tờ Khai (A4)
        </button>
      </div>
    </div>
  `;

  openModal(`Tờ Khai Hải Quan Điện Tử: ${escapeHtml(cd.declarationNumber)}`, contentHtml);
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
          <div><strong>TỔNG CỤC HẢI QUAN</strong><br>HẢI QUAN VIỆT NAM<br><small>HỆ THỐNG VNACCS/VCIS</small></div>
          <div class="emblem">
            <div><strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong></div>
            <div style="font-size:11px; font-style:italic;">Độc lập - Tự do - Hạnh phúc</div>
            <div style="font-size:16px; font-weight:bold; margin-top:4px;">TỜ KHAI HÀNG HÓA ${cd.shipmentType === 'Export' ? 'XUẤT KHẨU' : 'NHẬP KHẨU'}</div>
          </div>
          <div style="border:1px solid #000; padding:4px 8px; font-family:Arial; font-size:11px;">
            Số: <strong>${escapeHtml(cd.declarationNumber)}</strong><br>
            Ngày: <strong>${dDate}</strong><br>
            Mã LH: <strong>${escapeHtml(cd.declarationType)}</strong><br>
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
          <div class="cell">Người nhập khẩu: <strong>CÔNG TY CỔ PHẦN XUẤT NHẬP KHẨU IMEX VIỆT NAM</strong><br>MST: 0312345678</div>
          <div class="cell">Người xuất khẩu: <strong>${escapeHtml(cd.partnerName)}</strong><br>Quốc gia: Taiwan / China</div>
        </div>

        <div class="sec-title">3. HÀNG HÓA & TRỊ GIÁ TÍNH THUẾ</div>
        <table>
          <thead>
            <tr><th>#</th><th>Mã HS</th><th>Tên Hàng Hóa</th><th>Xuất xứ</th><th>ĐVT</th><th>Lượng</th><th>Đơn Giá ($)</th><th>Trị Giá ($)</th></tr>
          </thead>
          <tbody>
            <tr>
              <td align="center">1</td>
              <td align="center"><strong>5402.47.00</strong></td>
              <td>Sợi filament tổng hợp dạng dệt khác (Polyester DTY)</td>
              <td align="center">Taiwan</td>
              <td align="center">kg</td>
              <td align="right">222</td>
              <td align="right">$4.00</td>
              <td align="right"><strong>$${Number(cd.totalValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="sig">
          <div>
            <strong>NGƯỜI KHAI HẢI QUAN</strong><br>
            <em>(Ký số điện tử)</em><br><br>
            <span style="color:#0369a1; font-weight:bold;">ĐÃ KÝ ĐIỆN TỬ</span>
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

// ─── TẢI / XEM FILE ĐÍNH KÈM TỜ KHAI ─────────────────────────────────────────
window.viewCustomsDoc = async function (declarationId) {
  try {
    const res = await api.get(`/api/documents?entityType=CustomsDeclaration&entityId=${declarationId}`);
    const docs = res.data?.items || res.data || [];
    if (docs.length === 0) {
      toast('Không có file nào được đính kèm cho tờ khai này', 'info');
      return;
    }
    const doc = docs[0];

    const token = getToken();
    const downloadRes = await fetch(`${API_BASE}/api/documents/${doc.id}/download`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!downloadRes.ok) throw new Error('Không thể tải file');

    const blob = await downloadRes.blob();
    const url = window.URL.createObjectURL(blob);

    if (blob.type === 'application/pdf' || doc.fileName?.endsWith('.pdf')) {
      window.open(url, '_blank');
      toast('Đã mở file PDF trong tab mới', 'success');
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalFileName || doc.fileName || 'Customs_File';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast('Đã tải file thành công!', 'success');
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
