// frontend/src/features/partners/partners.js
import { api, showToast, openModal, closeModal, showConfirm } from '../../core/api.js';

// =========================================================
// MODULE STATE (KHÁCH HÀNG /api/customers & NHÀ CUNG CẤP /api/suppliers)
// =========================================================
let activePartnerTab = 'partners-customers';
let customersCache = [];
let suppliersCache = [];
let allShipmentsCache = [];

// Table state for Partners (Customers / Suppliers)
let ptSearchQuery = '';
let ptCountryFilter = 'ALL';
let ptIncotermFilter = 'ALL';
let ptSortField = 'code';
let ptSortAsc = true;
let ptCurrentPage = 1;
let ptPageSize = 25;
let selectedPartnerIds = new Set();

// Table state for Forwarders (Local catalog so no 404 API calls)
let fwSearchQuery = '';
let fwTypeFilter = 'ALL';
let fwSortField = 'code';
let fwSortAsc = true;
let fwCurrentPage = 1;
let fwPageSize = 25;
let selectedForwarderIds = new Set();

const FW_STORAGE_KEY = 'xnk_forwarders_catalog_v1';
const DEFAULT_FORWARDERS = [
  { id: 'fw-cosco', code: 'COSCO', name: 'COSCO SHIPPING LINES CO., LTD', type: 'SHIPPING_LINE', contactPerson: 'Booking Desk VN', phone: '028 3823 9000', email: 'booking.sgn@coscon.com', trackingUrl: 'https://elines.coscoshipping.com', notes: 'Tuyến Thượng Hải / Ninh Ba / Thanh Đảo về Cát Lái & Hải Phòng' },
  { id: 'fw-sitc', code: 'SITC', name: 'SITC CONTAINER LINES', type: 'SHIPPING_LINE', contactPerson: 'Customer Service', phone: '028 3910 5588', email: 'cs.hcm@sitc.com', trackingUrl: 'https://www.sitcline.com', notes: 'Chuyên tuyến Intra-Asia (Trung Quốc, Đài Loan, Hàn Quốc, Nhật Bản)' },
  { id: 'fw-evergreen', code: 'EMC', name: 'EVERGREEN MARINE CORP.', type: 'SHIPPING_LINE', contactPerson: 'Docs Dept', phone: '028 3822 1234', email: 'sgn@evergreen-marine.com', trackingUrl: 'https://www.shipmentlink.com', notes: 'Tuyến Đài Loan (Kaohsiung/Keelung), Trung Quốc & Âu Mỹ' },
  { id: 'fw-one', code: 'ONE', name: 'OCEAN NETWORK EXPRESS (ONE)', type: 'SHIPPING_LINE', contactPerson: 'Import/Export Counter', phone: '028 3939 0100', email: 'vn.ofs.aigne@one-line.com', trackingUrl: 'https://ecomm.one-line.com', notes: 'Tuyến Nhật Bản, Hàn Quốc, Đông Nam Á' },
  { id: 'fw-wanhai', code: 'WHL', name: 'WAN HAI LINES LTD.', type: 'SHIPPING_LINE', contactPerson: 'Operations Team', phone: '028 3827 6868', email: 'whlsgn@wanhai.com', trackingUrl: 'https://www.wanhai.com', notes: 'Tuyến Đài Loan, Hoa Nam, Ấn Độ' }
];

function loadForwardersCatalog() {
  try {
    const raw = localStorage.getItem(FW_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return DEFAULT_FORWARDERS.map(f => ({ ...f }));
}

function saveForwardersCatalog(list) {
  try {
    localStorage.setItem(FW_STORAGE_KEY, JSON.stringify(list));
  } catch { /* ignore */ }
}

// Column definitions for Partners
const DEFAULT_PARTNER_COLS = [
  { key: 'code',          label: 'Mã / Tên viết tắt',      visible: true,  required: true,  sortable: true,  width: '140px' },
  { key: 'name',          label: 'Tên công ty / Đối tác',  visible: true,  required: true,  sortable: true,  width: '260px' },
  { key: 'country',       label: 'Quốc gia',               visible: true,  required: false, sortable: true,  width: '135px' },
  { key: 'taxCode',       label: 'Mã số thuế',             visible: true,  required: false, sortable: true,  width: '130px' },
  { key: 'contactPerson', label: 'Người liên hệ & Kênh',   visible: true,  required: false, sortable: true,  width: '215px' },
  { key: 'incoterm',      label: 'Incoterm',               visible: true,  required: false, sortable: true,  width: '95px',  align: 'center' },
  { key: 'paymentTerms',  label: 'Điều khoản thanh toán',  visible: true,  required: false, sortable: true,  width: '190px' },
  { key: 'shipments',     label: 'Lô hàng GD',             visible: true,  required: false, sortable: true,  width: '115px', align: 'center' },
  { key: 'address',       label: 'Địa chỉ trụ sở',         visible: false, required: false, sortable: false, width: '220px' },
  { key: 'notes',         label: 'Ghi chú / Ngân hàng',    visible: true,  required: false, sortable: false, width: '190px' }
];

const PT_COL_STORAGE_KEY = 'xnk_partners_col_config_v3';

function loadPartnerColumns() {
  try {
    const saved = localStorage.getItem(PT_COL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return DEFAULT_PARTNER_COLS.map(col => {
        const found = parsed.find(p => p.key === col.key);
        return found ? { ...col, visible: col.required ? true : !!found.visible } : { ...col };
      });
    }
  } catch { /* ignore */ }
  return DEFAULT_PARTNER_COLS.map(c => ({ ...c }));
}

function savePartnerColumns(cols) {
  try {
    localStorage.setItem(PT_COL_STORAGE_KEY, JSON.stringify(cols.map(c => ({ key: c.key, visible: c.visible }))));
  } catch { /* ignore */ }
}

let partnerColumns = loadPartnerColumns();

// Helper to parse structured metadata stored inside `notes`
function parsePartnerNotes(rawNotes) {
  const result = {
    partnerCode: '',
    currency: 'USD',
    defaultPort: '',
    bankInfo: '',
    cleanNotes: ''
  };
  if (!rawNotes) return result;
  let text = String(rawNotes);

  const codeMatch = text.match(/\[Mã:\s*([^\]]+)\]/i);
  if (codeMatch) {
    result.partnerCode = codeMatch[1].trim();
    text = text.replace(codeMatch[0], '');
  }
  const curMatch = text.match(/\[Tiền tệ:\s*([^\]]+)\]/i);
  if (curMatch) {
    result.currency = curMatch[1].trim();
    text = text.replace(curMatch[0], '');
  }
  const portMatch = text.match(/\[Cảng:\s*([^\]]+)\]/i);
  if (portMatch) {
    result.defaultPort = portMatch[1].trim();
    text = text.replace(portMatch[0], '');
  }
  const bankMatch = text.match(/\[Ngân hàng:\s*([^\]]+)\]/i);
  if (bankMatch) {
    result.bankInfo = bankMatch[1].trim();
    text = text.replace(bankMatch[0], '');
  }
  result.cleanNotes = text.replace(/^\s*\|\s*|\s*\|\s*$/g, '').trim();
  return result;
}

function buildPartnerNotes({ partnerCode, isCustomer, currency, defaultPort, bankInfo, cleanNotes }) {
  const parts = [];
  // Customer entity in DB doesn't have a TradeName column, so preserve code in notes tag
  if (isCustomer && partnerCode) parts.push(`[Mã: ${partnerCode}]`);
  if (currency && currency !== 'USD') parts.push(`[Tiền tệ: ${currency}]`);
  if (defaultPort) parts.push(`[Cảng: ${defaultPort}]`);
  if (bankInfo) parts.push(`[Ngân hàng: ${bankInfo}]`);
  if (cleanNotes) parts.push(cleanNotes);
  return parts.join(' ').trim() || null;
}

// Normalize backend CustomerDto / SupplierDto into unified Partner object
function normalizePartnerDto(item, type, index) {
  const meta = parsePartnerNotes(item.notes);
  const isCust = type === 'CUSTOMER';
  const fallbackPrefix = isCust ? 'KH' : 'NCC';
  const fallbackCode = `${fallbackPrefix}-${String(index + 1).padStart(3, '0')}`;
  const rawCode = item.tradeName || item.code || meta.partnerCode || fallbackCode;

  return {
    id: item.id,
    type,
    code: rawCode,
    name: item.companyName || item.name || '---',
    companyName: item.companyName || item.name || '---',
    tradeName: item.tradeName || rawCode,
    country: item.country || (isCust ? 'Vietnam' : 'China'),
    taxCode: item.taxCode || '',
    address: item.address || '',
    contactPerson: item.contactPerson || '',
    phone: item.phone || '',
    email: item.email || '',
    defaultIncoterm: item.deliveryTerm || item.defaultIncoterm || '',
    deliveryTerm: item.deliveryTerm || item.defaultIncoterm || '',
    paymentTerms: item.paymentTerms || '',
    shipmentCount: item.shipmentCount ?? 0,
    notes: item.notes || '',
    createdAt: item.createdAt
  };
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isVietnamCountry(country) {
  const c = (country || '').trim().toLowerCase();
  return c === 'vietnam' || c === 'việt nam' || c === 'vn' || c === 'viet nam';
}

// =========================================================
// MAIN ENTRY POINT
// =========================================================
export async function renderPartners(container, subTab = 'partners-suppliers') {
  activePartnerTab = subTab || 'partners-suppliers';

  // Fetch from the real ASP.NET Core endpoints: /api/customers, /api/suppliers, /api/shipments
  try {
    const [custRes, supRes, shipRes] = await Promise.all([
      api.get('/api/customers?page=1&pageSize=500').catch(() => ({ data: { items: [] } })),
      api.get('/api/suppliers?page=1&pageSize=500').catch(() => ({ data: { items: [] } })),
      api.get('/api/shipments?page=1&pageSize=500').catch(() => ({ data: { items: [] } }))
    ]);

    const rawCusts = Array.isArray(custRes?.data) ? custRes.data : (custRes?.data?.items || []);
    const rawSups = Array.isArray(supRes?.data) ? supRes.data : (supRes?.data?.items || []);
    allShipmentsCache = Array.isArray(shipRes?.data) ? shipRes.data : (shipRes?.data?.items || []);

    customersCache = rawCusts.map((c, idx) => normalizePartnerDto(c, 'CUSTOMER', idx));
    suppliersCache = rawSups.map((s, idx) => normalizePartnerDto(s, 'SUPPLIER', idx));
  } catch {
    customersCache = [];
    suppliersCache = [];
    allShipmentsCache = [];
  }

  if (activePartnerTab === 'forwarders') {
    await renderForwardersList(container);
  } else {
    const typeFilter = activePartnerTab === 'partners-customers' ? 'CUSTOMER' : 'SUPPLIER';
    await renderPartnersList(container, typeFilter);
  }
}

// =========================================================
// 1. DANH SÁCH KHÁCH HÀNG & NHÀ CUNG CẤP (MISA AMIS UI)
// =========================================================
async function renderPartnersList(container, typeFilter) {
  const isCustomer = typeFilter === 'CUSTOMER';
  const entityLabel = isCustomer ? 'Khách hàng' : 'Nhà cung cấp';
  const entityUpper = isCustomer ? 'Khách Hàng' : 'Nhà Cung Cấp';

  const currentTypeList = isCustomer ? customersCache : suppliersCache;
  const forwardersList = loadForwardersCatalog();

  // Map shipments per partner (by supplierId/customerId or matching company name)
  const shipmentMap = new Map();
  currentTypeList.forEach(p => {
    const pNameLower = (p.name || '').trim().toLowerCase();
    const matched = allShipmentsCache.filter(s => {
      if (isCustomer && s.customerId === p.id) return true;
      if (!isCustomer && s.supplierId === p.id) return true;
      const sName = ((isCustomer ? s.customerName : s.supplierName) || '').trim().toLowerCase();
      return sName && sName === pNameLower;
    });
    shipmentMap.set(p.id, matched);
  });

  // KPI metrics for current type
  const totalCount = currentTypeList.length;
  const intlCount = currentTypeList.filter(p => !isVietnamCountry(p.country)).length;
  const domesticCount = currentTypeList.filter(p => isVietnamCountry(p.country)).length;
  const activeTradingCount = currentTypeList.filter(p => {
    const linked = shipmentMap.get(p.id)?.length || p.shipmentCount || 0;
    return linked > 0;
  }).length;

  // Unique countries for dropdown
  const uniqueCountries = [...new Set(currentTypeList.map(p => (p.country || '').trim()).filter(Boolean))].sort();

  // Prune selectedPartnerIds that no longer exist in current tab
  const validIds = new Set(currentTypeList.map(p => p.id));
  selectedPartnerIds.forEach(id => {
    if (!validIds.has(id)) selectedPartnerIds.delete(id);
  });

  container.innerHTML = `
    <div class="amis-list-page">
      <!-- ── Sub-Navigation & KPI Summary Bar ── -->
      <div class="pt-subnav-bar">
        <div class="pt-seg-group">
          <button type="button" class="pt-seg-btn ${isCustomer ? 'active' : ''}" onclick="window.appNavigateTo('partners-customers')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>Khách hàng (Xuất khẩu / Nội địa)</span>
            <span class="pt-seg-count">${customersCache.length}</span>
          </button>
          <button type="button" class="pt-seg-btn ${!isCustomer ? 'active' : ''}" onclick="window.appNavigateTo('partners-suppliers')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
            <span>Nhà cung cấp (Nhập khẩu / Nội địa)</span>
            <span class="pt-seg-count">${suppliersCache.length}</span>
          </button>
          <button type="button" class="pt-seg-btn" onclick="window.appNavigateTo('forwarders')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path>
              <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"></path>
              <path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"></path>
            </svg>
            <span>Hãng tàu & Forwarder</span>
            <span class="pt-seg-count">${forwardersList.length}</span>
          </button>
        </div>

        <div class="pt-kpi-pills">
          <div class="pt-kpi-pill kpi-blue" title="Tổng số ${entityLabel} trong danh bạ">
            <span>Tổng ${entityLabel}:</span>
            <strong>${totalCount}</strong>
          </div>
          <div class="pt-kpi-pill" title="Đối tác nước ngoài (Quốc tế)">
            <span>🌐 Quốc tế:</span>
            <strong>${intlCount}</strong>
          </div>
          <div class="pt-kpi-pill" title="Đối tác trong nước (Việt Nam)">
            <span>🇻🇳 Nội địa:</span>
            <strong>${domesticCount}</strong>
          </div>
          <div class="pt-kpi-pill kpi-green" title="Số ${entityLabel} đã phát sinh hồ sơ lô hàng">
            <span>Đang giao dịch:</span>
            <strong>${activeTradingCount}</strong>
          </div>
        </div>
      </div>

      <!-- ── MISA AMIS Action Toolbar ── -->
      <div class="amis-toolbar-wrap">
        <div class="amis-toolbar-left">
          <button type="button" id="btnPartnerAdd" class="amis-btn amis-btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Thêm ${entityLabel}</span>
          </button>

          <button type="button" id="btnPartnerView" class="amis-btn amis-btn-ghost" disabled title="Xem hồ sơ chi tiết & lịch sử lô hàng (chọn 1 dòng)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <span>Xem hồ sơ</span>
          </button>

          <button type="button" id="btnPartnerEdit" class="amis-btn amis-btn-ghost" disabled title="Chỉnh sửa thông tin đối tác (chọn 1 dòng)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            <span>Sửa</span>
          </button>

          <button type="button" id="btnPartnerDelete" class="amis-btn amis-btn-danger-ghost" disabled title="Xóa đối tác đã chọn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span id="btnPartnerDeleteLabel">Xóa</span>
          </button>

          <div class="amis-toolbar-sep"></div>

          <button type="button" id="btnPartnerExport" class="amis-btn amis-btn-ghost" title="Xuất danh sách ${entityLabel} ra file Excel (.xlsx)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Xuất Excel</span>
          </button>

          <button type="button" id="btnPartnerRefresh" class="amis-btn amis-btn-ghost" title="Tải lại dữ liệu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            <span>Nạp</span>
          </button>

          <div id="partnerSelectionChipWrap"></div>
        </div>

        <!-- ── Toolbar Right: Search, Filters & Column Picker ── -->
        <div class="amis-toolbar-right">
          <div class="amis-search-box" style="width: 245px;">
            <svg class="amis-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              id="partnerSearchInput"
              class="amis-search-input"
              placeholder="Tìm mã, tên công ty, MST, liên hệ..."
              value="${escapeHtml(ptSearchQuery)}"
            />
          </div>

          <select id="partnerCountryFilter" class="pt-filter-select" title="Lọc theo khu vực / quốc gia">
            <option value="ALL" ${ptCountryFilter === 'ALL' ? 'selected' : ''}>Tất cả quốc gia</option>
            <option value="INTL" ${ptCountryFilter === 'INTL' ? 'selected' : ''}>🌐 Đối tác Quốc tế (${intlCount})</option>
            <option value="VN" ${ptCountryFilter === 'VN' ? 'selected' : ''}>🇻🇳 Đối tác Nội địa (${domesticCount})</option>
            ${uniqueCountries.map(c => `<option value="${escapeHtml(c)}" ${ptCountryFilter === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
          </select>

          <select id="partnerIncotermFilter" class="pt-filter-select" title="Lọc theo điều kiện Incoterms">
            <option value="ALL" ${ptIncotermFilter === 'ALL' ? 'selected' : ''}>Mọi Incoterm</option>
            ${['FOB', 'CIF', 'CFR', 'EXW', 'FCA', 'DAP', 'DDP'].map(ic => `<option value="${ic}" ${ptIncotermFilter === ic ? 'selected' : ''}>${ic}</option>`).join('')}
          </select>

          <!-- Column Picker -->
          <div class="amis-col-picker-wrap">
            <button type="button" id="btnPartnerColPicker" class="amis-btn amis-btn-ghost amis-btn-icon" title="Tuỳ chỉnh cột hiển thị">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <span>Cột</span>
            </button>
            <div id="partnerColDropdown" class="amis-col-dropdown" style="display:none;">
              <div class="amis-col-dropdown-header">
                <span>Tuỳ chỉnh cột hiển thị</span>
                <button type="button" id="btnPartnerResetCols" class="amis-link-btn">Mặc định</button>
              </div>
              <div id="partnerColList" class="amis-col-dropdown-list"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Table Area ── -->
      <div class="amis-table-container">
        <div class="amis-table-scroll">
          <table class="amis-data-table" id="partnerMainTable">
            <thead id="partnerTableHead"></thead>
            <tbody id="partnerTableBody"></tbody>
          </table>
        </div>

        <!-- ── Footer / Pagination ── -->
        <div class="amis-table-footer" id="partnerTableFooter"></div>
      </div>
    </div>
  `;

  // Filtered + Sorted list getter
  const getFilteredPartners = () => {
    const kw = ptSearchQuery.trim().toLowerCase();
    const filtered = currentTypeList.filter(p => {
      if (ptCountryFilter === 'INTL' && isVietnamCountry(p.country)) return false;
      if (ptCountryFilter === 'VN' && !isVietnamCountry(p.country)) return false;
      if (ptCountryFilter !== 'ALL' && ptCountryFilter !== 'INTL' && ptCountryFilter !== 'VN') {
        if ((p.country || '').trim() !== ptCountryFilter) return false;
      }
      if (ptIncotermFilter !== 'ALL') {
        if ((p.defaultIncoterm || '').toUpperCase() !== ptIncotermFilter) return false;
      }
      if (!kw) return true;
      return (
        (p.code && p.code.toLowerCase().includes(kw)) ||
        (p.name && p.name.toLowerCase().includes(kw)) ||
        (p.country && p.country.toLowerCase().includes(kw)) ||
        (p.taxCode && p.taxCode.toLowerCase().includes(kw)) ||
        (p.contactPerson && p.contactPerson.toLowerCase().includes(kw)) ||
        (p.phone && p.phone.toLowerCase().includes(kw)) ||
        (p.email && p.email.toLowerCase().includes(kw)) ||
        (p.paymentTerms && p.paymentTerms.toLowerCase().includes(kw))
      );
    });

    filtered.sort((a, b) => {
      if (ptSortField === 'shipments') {
        const ca = shipmentMap.get(a.id)?.length || a.shipmentCount || 0;
        const cb = shipmentMap.get(b.id)?.length || b.shipmentCount || 0;
        return ptSortAsc ? ca - cb : cb - ca;
      }
      const fieldKey = ptSortField === 'incoterm' ? 'defaultIncoterm' : ptSortField;
      const va = String(a[fieldKey] || '').toLowerCase();
      const vb = String(b[fieldKey] || '').toLowerCase();
      return ptSortAsc ? va.localeCompare(vb, 'vi') : vb.localeCompare(va, 'vi');
    });

    return filtered;
  };

  // Update toolbar buttons & selection chip
  const syncPartnerToolbarState = () => {
    const count = selectedPartnerIds.size;
    const btnView = document.getElementById('btnPartnerView');
    const btnEdit = document.getElementById('btnPartnerEdit');
    const btnDelete = document.getElementById('btnPartnerDelete');
    const delLabel = document.getElementById('btnPartnerDeleteLabel');
    const chipWrap = document.getElementById('partnerSelectionChipWrap');

    if (btnView) btnView.disabled = count !== 1;
    if (btnEdit) btnEdit.disabled = count !== 1;
    if (btnDelete) btnDelete.disabled = count === 0;
    if (delLabel) delLabel.textContent = count > 1 ? `Xóa (${count})` : 'Xóa';

    if (chipWrap) {
      if (count > 0) {
        chipWrap.innerHTML = `
          <span class="pt-selection-chip">
            Đã chọn <strong>${count}</strong> ${entityLabel}
            <button type="button" id="btnPartnerClearSelection">Bỏ chọn</button>
          </span>
        `;
        document.getElementById('btnPartnerClearSelection')?.addEventListener('click', () => {
          selectedPartnerIds.clear();
          refreshPartnerTable();
        });
      } else {
        chipWrap.innerHTML = '';
      }
    }
  };

  // Render Column Picker List
  const renderColPickerList = () => {
    const listEl = document.getElementById('partnerColList');
    if (!listEl) return;
    listEl.innerHTML = partnerColumns.map(col => `
      <label class="amis-col-item ${col.required ? 'disabled' : ''}">
        <input
          type="checkbox"
          data-col-key="${col.key}"
          ${col.visible ? 'checked' : ''}
          ${col.required ? 'disabled' : ''}
        />
        <span>${col.label}</span>
      </label>
    `).join('');

    listEl.querySelectorAll('input[type="checkbox"]:not([disabled])').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const key = e.target.getAttribute('data-col-key');
        const target = partnerColumns.find(c => c.key === key);
        if (target) {
          target.visible = e.target.checked;
          savePartnerColumns(partnerColumns);
          refreshPartnerTable();
        }
      });
    });
  };

  // Render Table Header + Rows + Pagination
  const refreshPartnerTable = () => {
    const visibleCols = partnerColumns.filter(c => c.visible);
    const filtered = getFilteredPartners();
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / ptPageSize));
    if (ptCurrentPage > totalPages) ptCurrentPage = totalPages;
    const startIdx = (ptCurrentPage - 1) * ptPageSize;
    const pageRows = filtered.slice(startIdx, startIdx + ptPageSize);

    // 1. Render THEAD
    const thead = document.getElementById('partnerTableHead');
    if (thead) {
      const allOnPageSelected = pageRows.length > 0 && pageRows.every(r => selectedPartnerIds.has(r.id));
      const someOnPageSelected = pageRows.some(r => selectedPartnerIds.has(r.id));

      thead.innerHTML = `
        <tr>
          <th class="amis-th-check">
            <input type="checkbox" id="checkAllPartners" title="Chọn / Bỏ chọn trang này" ${allOnPageSelected ? 'checked' : ''} />
          </th>
          ${visibleCols.map(col => {
            const isSorted = ptSortField === col.key;
            const sortIcon = col.sortable
              ? `<span class="amis-sort-icon ${isSorted ? 'active' : ''}">${isSorted ? (ptSortAsc ? '↑' : '↓') : '↕'}</span>`
              : '';
            const alignStyle = col.align ? `text-align:${col.align};` : '';
            return `
              <th
                style="min-width:${col.width || '120px'}; ${alignStyle}"
                class="${col.sortable ? 'amis-th-sortable' : ''}"
                data-sort="${col.sortable ? col.key : ''}"
              >
                ${col.label} ${sortIcon}
              </th>
            `;
          }).join('')}
          <th class="amis-th-actions" style="width: 120px;">Thao tác</th>
        </tr>
      `;

      const chkAll = document.getElementById('checkAllPartners');
      if (chkAll) {
        chkAll.indeterminate = !allOnPageSelected && someOnPageSelected;
        chkAll.addEventListener('change', (e) => {
          if (e.target.checked) {
            pageRows.forEach(r => selectedPartnerIds.add(r.id));
          } else {
            pageRows.forEach(r => selectedPartnerIds.delete(r.id));
          }
          refreshPartnerTable();
        });
      }

      thead.querySelectorAll('.amis-th-sortable').forEach(th => {
        th.addEventListener('click', () => {
          const field = th.getAttribute('data-sort');
          if (!field) return;
          if (ptSortField === field) {
            ptSortAsc = !ptSortAsc;
          } else {
            ptSortField = field;
            ptSortAsc = true;
          }
          refreshPartnerTable();
        });
      });
    }

    // 2. Render TBODY
    const tbody = document.getElementById('partnerTableBody');
    if (tbody) {
      if (pageRows.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="${visibleCols.length + 2}" class="amis-table-empty">
              <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <line x1="17" y1="11" x2="23" y2="11"></line>
                </svg>
                <span>Không tìm thấy dữ liệu ${entityLabel} phù hợp với bộ lọc hiện tại.</span>
                <button type="button" class="amis-btn amis-btn-primary" style="margin-top:4px;" onclick="window.openPartnerModal(null, '${typeFilter}')">
                  + Thêm ${entityLabel} đầu tiên
                </button>
              </div>
            </td>
          </tr>
        `;
      } else {
        tbody.innerHTML = pageRows.map(p => {
          const isChecked = selectedPartnerIds.has(p.id);
          const partnerShipments = shipmentMap.get(p.id) || [];
          const shipCount = Math.max(partnerShipments.length, p.shipmentCount || 0);
          const parsedNotes = parsePartnerNotes(p.notes);

          const cellsHtml = visibleCols.map(col => {
            switch (col.key) {
              case 'code':
                return `
                  <td class="amis-td-sku">
                    <span class="amis-sku-badge" style="cursor:pointer;" onclick="event.stopPropagation(); window.openPartnerDetailModal('${p.id}', '${typeFilter}')" title="Nhấn để xem hồ sơ chi tiết & lịch sử lô hàng">
                      ${escapeHtml(p.code)}
                    </span>
                  </td>
                `;
              case 'name':
                return `
                  <td class="amis-td-name">
                    <div class="amis-name-text" style="font-weight:600; color:var(--text-main); cursor:pointer;" onclick="event.stopPropagation(); window.openPartnerDetailModal('${p.id}', '${typeFilter}')">
                      ${escapeHtml(p.name)}
                    </div>
                    ${p.address ? `<div style="font-size:11.5px; color:var(--text-muted); margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:280px;" title="${escapeHtml(p.address)}">📍 ${escapeHtml(p.address)}</div>` : ''}
                  </td>
                `;
              case 'country': {
                const isVn = isVietnamCountry(p.country);
                return `
                  <td>
                    <span class="pt-country-tag ${isVn ? 'is-vn' : 'is-intl'}">
                      <span>${isVn ? '🇻🇳' : '🌐'}</span>
                      <span>${escapeHtml(p.country || '---')}</span>
                    </span>
                  </td>
                `;
              }
              case 'taxCode':
                return `
                  <td>
                    ${p.taxCode ? `<code class="amis-code">${escapeHtml(p.taxCode)}</code>` : '<span class="amis-td-muted">---</span>'}
                  </td>
                `;
              case 'contactPerson':
                return `
                  <td>
                    <div class="pt-contact-box">
                      <span class="pt-contact-name">
                        ${p.contactPerson ? escapeHtml(p.contactPerson) : '<span class="amis-td-muted">Chưa cập nhật LH</span>'}
                      </span>
                      <div class="pt-contact-sub">
                        ${p.phone ? `<span><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>${escapeHtml(p.phone)}</span>` : ''}
                        ${p.email ? `<span><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>${escapeHtml(p.email)}</span>` : ''}
                      </div>
                    </div>
                  </td>
                `;
              case 'incoterm':
                return `
                  <td style="text-align:center;">
                    ${p.defaultIncoterm ? `<span class="pt-incoterm-tag">${escapeHtml(p.defaultIncoterm)}</span>` : '<span class="amis-td-muted">---</span>'}
                  </td>
                `;
              case 'paymentTerms':
                return `
                  <td>
                    <div style="font-size:12.5px; font-weight:500; color:var(--text-main);">${escapeHtml(p.paymentTerms || '---')}</div>
                    ${parsedNotes.currency ? `<div style="font-size:11px; color:var(--text-muted);">Tiền tệ: <strong>${escapeHtml(parsedNotes.currency)}</strong>${parsedNotes.defaultPort ? ` · ${escapeHtml(parsedNotes.defaultPort)}` : ''}</div>` : ''}
                  </td>
                `;
              case 'shipments':
                return `
                  <td style="text-align:center;">
                    ${shipCount > 0
                      ? `<button type="button" class="pt-shipment-count-btn" onclick="event.stopPropagation(); window.openPartnerDetailModal('${p.id}', '${typeFilter}')" title="Xem danh sách ${shipCount} lô hàng của đối tác này">
                          📦 ${shipCount} lô hàng
                        </button>`
                      : '<span class="pt-shipment-none">Chưa phát sinh</span>'}
                  </td>
                `;
              case 'address':
                return `<td class="amis-td-notes" title="${escapeHtml(p.address || '')}">${escapeHtml(p.address || '---')}</td>`;
              case 'notes':
                return `
                  <td class="amis-td-notes" title="${escapeHtml(p.notes || '')}">
                    ${parsedNotes.bankInfo ? `<div style="font-size:11.5px; color:#0266b3; font-weight:500;">🏦 ${escapeHtml(parsedNotes.bankInfo)}</div>` : ''}
                    <div>${escapeHtml(parsedNotes.cleanNotes || (!parsedNotes.bankInfo ? '---' : ''))}</div>
                  </td>
                `;
              default:
                return '<td>---</td>';
            }
          }).join('');

          return `
            <tr data-id="${p.id}" class="${isChecked ? 'amis-row-selected' : ''}">
              <td class="amis-td-check" onclick="event.stopPropagation()">
                <input type="checkbox" class="partner-row-check" data-id="${p.id}" ${isChecked ? 'checked' : ''} />
              </td>
              ${cellsHtml}
              <td class="amis-td-actions" onclick="event.stopPropagation()">
                <div class="amis-row-actions" style="opacity:1;">
                  <button type="button" class="amis-icon-btn" title="Xem hồ sơ & Lịch sử lô hàng" onclick="window.openPartnerDetailModal('${p.id}', '${typeFilter}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  </button>
                  <button type="button" class="amis-icon-btn" title="Chỉnh sửa ${entityLabel}" onclick="window.openPartnerModal('${p.id}', '${typeFilter}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                  <button type="button" class="amis-icon-btn" title="Nhân bản đối tác này" onclick="window.duplicatePartnerRecord('${p.id}', '${typeFilter}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                  <button type="button" class="amis-icon-btn amis-icon-btn-danger" title="Xóa ${entityLabel}" onclick="window.deletePartnerRecord('${p.id}', '${escapeHtml(p.name)}', '${typeFilter}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('');

        // Bind row checkboxes & row click
        tbody.querySelectorAll('.partner-row-check').forEach(chk => {
          chk.addEventListener('change', (e) => {
            const id = e.target.getAttribute('data-id');
            if (e.target.checked) selectedPartnerIds.add(id);
            else selectedPartnerIds.delete(id);
            refreshPartnerTable();
          });
        });

        tbody.querySelectorAll('tr[data-id]').forEach(tr => {
          tr.addEventListener('click', () => {
            const id = tr.getAttribute('data-id');
            if (selectedPartnerIds.has(id)) selectedPartnerIds.delete(id);
            else selectedPartnerIds.add(id);
            refreshPartnerTable();
          });
          tr.addEventListener('dblclick', () => {
            const id = tr.getAttribute('data-id');
            window.openPartnerModal(id, typeFilter);
          });
        });
      }
    }

    // 3. Render FOOTER / PAGINATION
    const footer = document.getElementById('partnerTableFooter');
    if (footer) {
      const fromRecord = total === 0 ? 0 : startIdx + 1;
      const toRecord = Math.min(startIdx + ptPageSize, total);

      const pageButtons = [];
      for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= ptCurrentPage - 1 && i <= ptCurrentPage + 1)) {
          pageButtons.push(`<button type="button" class="amis-pg-btn ${i === ptCurrentPage ? 'active' : ''}" data-pg="${i}">${i}</button>`);
        } else if (pageButtons[pageButtons.length - 1] !== '<span class="amis-pg-ellipsis">...</span>') {
          pageButtons.push('<span class="amis-pg-ellipsis">...</span>');
        }
      }

      footer.innerHTML = `
        <div class="amis-table-info">
          Tổng số: <strong>${total}</strong> bản ghi
          ${total > 0 ? `<span style="margin-left:8px; color:var(--text-muted);">(Hiển thị ${fromRecord}–${toRecord})</span>` : ''}
        </div>
        <div style="display:flex; align-items:center; gap:14px;">
          <div class="amis-page-size-select">
            <span>Số dòng/trang:</span>
            <select id="partnerPageSizeSelect">
              ${[15, 25, 50, 100].map(sz => `<option value="${sz}" ${ptPageSize === sz ? 'selected' : ''}>${sz}</option>`).join('')}
            </select>
          </div>
          <div class="amis-pagination-controls">
            <button type="button" class="amis-pg-btn" id="btnPartnerPrevPg" ${ptCurrentPage <= 1 ? 'disabled' : ''} title="Trang trước">‹</button>
            ${pageButtons.join('')}
            <button type="button" class="amis-pg-btn" id="btnPartnerNextPg" ${ptCurrentPage >= totalPages ? 'disabled' : ''} title="Trang tiếp">›</button>
          </div>
        </div>
      `;

      document.getElementById('partnerPageSizeSelect')?.addEventListener('change', (e) => {
        ptPageSize = parseInt(e.target.value, 10) || 25;
        ptCurrentPage = 1;
        refreshPartnerTable();
      });

      document.getElementById('btnPartnerPrevPg')?.addEventListener('click', () => {
        if (ptCurrentPage > 1) {
          ptCurrentPage--;
          refreshPartnerTable();
        }
      });

      document.getElementById('btnPartnerNextPg')?.addEventListener('click', () => {
        if (ptCurrentPage < totalPages) {
          ptCurrentPage++;
          refreshPartnerTable();
        }
      });

      footer.querySelectorAll('.amis-pg-btn[data-pg]').forEach(btn => {
        btn.addEventListener('click', () => {
          ptCurrentPage = parseInt(btn.getAttribute('data-pg'), 10) || 1;
          refreshPartnerTable();
        });
      });
    }

    syncPartnerToolbarState();
  };

  // Initial render
  renderColPickerList();
  refreshPartnerTable();

  // ── Bind Toolbar Events ──
  document.getElementById('btnPartnerAdd')?.addEventListener('click', () => {
    window.openPartnerModal(null, typeFilter);
  });

  document.getElementById('btnPartnerView')?.addEventListener('click', () => {
    const id = [...selectedPartnerIds][0];
    if (id) window.openPartnerDetailModal(id, typeFilter);
  });

  document.getElementById('btnPartnerEdit')?.addEventListener('click', () => {
    const id = [...selectedPartnerIds][0];
    if (id) window.openPartnerModal(id, typeFilter);
  });

  document.getElementById('btnPartnerDelete')?.addEventListener('click', async () => {
    const ids = [...selectedPartnerIds];
    if (ids.length === 0) return;
    const endpoint = isCustomer ? '/api/customers' : '/api/suppliers';
    if (ids.length === 1) {
      const target = currentTypeList.find(p => p.id === ids[0]);
      if (target) await window.deletePartnerRecord(target.id, target.name, typeFilter);
    } else {
      const ok = await showConfirm({
        title: `Xóa ${ids.length} ${entityLabel} đã chọn`,
        message: `Bạn có chắc chắn muốn xóa ${ids.length} ${entityLabel} đang được chọn khỏi danh bạ?`,
        highlight: `${ids.length} đối tác sẽ bị xóa`,
        type: 'danger',
        confirmText: `Xóa ${ids.length} đối tác`,
        cancelText: 'Hủy bỏ'
      });
      if (!ok) return;
      let successCount = 0;
      for (const id of ids) {
        try {
          await api.delete(`${endpoint}/${id}`);
          successCount++;
          selectedPartnerIds.delete(id);
        } catch { /* ignore individual error */ }
      }
      showToast(`Đã xóa thành công ${successCount}/${ids.length} ${entityLabel}.`, 'success');
      await renderPartners(container, activePartnerTab);
    }
  });

  document.getElementById('btnPartnerExport')?.addEventListener('click', () => {
    const rowsToExport = getFilteredPartners();
    if (rowsToExport.length === 0) {
      showToast(`Không có dữ liệu ${entityLabel} để xuất Excel`, 'warning');
      return;
    }
    const excelData = rowsToExport.map((p, idx) => {
      const meta = parsePartnerNotes(p.notes);
      return {
        'STT': idx + 1,
        'Mã Đối Tác': p.code || '',
        'Tên Công Ty / Đối Tác': p.name || '',
        'Phân Loại': isCustomer ? 'Khách hàng' : 'Nhà cung cấp',
        'Quốc Gia': p.country || '',
        'Mã Số Thuế': p.taxCode || '',
        'Người Liên Hệ': p.contactPerson || '',
        'Điện Thoại': p.phone || '',
        'Email': p.email || '',
        'Incoterm Mặc Định': p.defaultIncoterm || '',
        'Điều Khoản Thanh Toán': p.paymentTerms || '',
        'Tiền Tệ': meta.currency || 'USD',
        'Cảng Thường Dùng': meta.defaultPort || '',
        'Thông Tin Ngân Hàng': meta.bankInfo || '',
        'Số Lô Hàng Giao Dịch': Math.max(shipmentMap.get(p.id)?.length || 0, p.shipmentCount || 0),
        'Địa Chỉ': p.address || '',
        'Ghi Chú': meta.cleanNotes || ''
      };
    });

    if (window.XLSX) {
      const ws = window.XLSX.utils.json_to_sheet(excelData);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, isCustomer ? 'KhachHang' : 'NhaCungCap');
      const fileName = `DanhBa_${isCustomer ? 'KhachHang' : 'NhaCungCap'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      window.XLSX.writeFile(wb, fileName);
      showToast(`Đã xuất ${rowsToExport.length} ${entityLabel} ra file ${fileName}`, 'success');
    } else {
      showToast('Đã chuẩn bị dữ liệu xuất Excel', 'info');
    }
  });

  document.getElementById('btnPartnerRefresh')?.addEventListener('click', async () => {
    await renderPartners(container, activePartnerTab);
    showToast(`Đã làm mới danh bạ ${entityUpper}`, 'info');
  });

  document.getElementById('partnerSearchInput')?.addEventListener('input', (e) => {
    ptSearchQuery = e.target.value;
    ptCurrentPage = 1;
    refreshPartnerTable();
  });

  document.getElementById('partnerCountryFilter')?.addEventListener('change', (e) => {
    ptCountryFilter = e.target.value;
    ptCurrentPage = 1;
    refreshPartnerTable();
  });

  document.getElementById('partnerIncotermFilter')?.addEventListener('change', (e) => {
    ptIncotermFilter = e.target.value;
    ptCurrentPage = 1;
    refreshPartnerTable();
  });

  // Column picker toggle
  const btnColPicker = document.getElementById('btnPartnerColPicker');
  const colDropdown = document.getElementById('partnerColDropdown');
  if (btnColPicker && colDropdown) {
    btnColPicker.addEventListener('click', (e) => {
      e.stopPropagation();
      colDropdown.style.display = colDropdown.style.display === 'none' ? 'block' : 'none';
    });
    colDropdown.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', () => {
      colDropdown.style.display = 'none';
    }, { once: false });
  }

  document.getElementById('btnPartnerResetCols')?.addEventListener('click', () => {
    partnerColumns = DEFAULT_PARTNER_COLS.map(c => ({ ...c }));
    savePartnerColumns(partnerColumns);
    renderColPickerList();
    refreshPartnerTable();
  });
}

// =========================================================
// 2. MODAL THÊM MỚI / CHỈNH SỬA KHÁCH HÀNG & NHÀ CUNG CẤP
// =========================================================
function generateSuggestedPartnerCode(type) {
  const isCust = type === 'CUSTOMER';
  const prefix = isCust ? 'KH' : 'NCC';
  const year = new Date().getFullYear();
  const list = isCust ? customersCache : suppliersCache;
  const nextIndex = String(list.length + 1).padStart(3, '0');
  const candidate = `${prefix}-${year}-${nextIndex}`;
  const exists = list.some(p => (p.code || '').toUpperCase() === candidate);
  if (!exists) return candidate;
  return `${prefix}-${year}-${Math.floor(100 + Math.random() * 900)}`;
}

window.openPartnerModal = async (id = null, defaultType = 'CUSTOMER', prefillData = null) => {
  const isEdit = Boolean(id);
  const resolvedType = defaultType || (activePartnerTab === 'partners-customers' ? 'CUSTOMER' : 'SUPPLIER');
  const sourceList = resolvedType === 'CUSTOMER' ? customersCache : suppliersCache;

  let partner = prefillData || {
    type: resolvedType,
    country: resolvedType === 'CUSTOMER' ? 'Vietnam' : 'China',
    defaultIncoterm: resolvedType === 'CUSTOMER' ? 'FOB' : 'CIF',
    code: generateSuggestedPartnerCode(resolvedType)
  };

  if (isEdit) {
    const found = sourceList.find(x => x.id === id) || customersCache.find(x => x.id === id) || suppliersCache.find(x => x.id === id);
    if (found) {
      partner = { ...found };
    }
  }

  const meta = parsePartnerNotes(partner.notes);
  const currentType = partner.type || resolvedType;
  const isCustomer = currentType === 'CUSTOMER';
  const isVn = isVietnamCountry(partner.country);

  const modalContainer = document.getElementById('modalContainer');
  if (modalContainer) {
    modalContainer.style.maxWidth = '760px';
    modalContainer.style.width = '95%';
  }

  const titleHtml = `
    <div style="display:flex; align-items:center; gap:10px;">
      <span style="display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:6px; background:#eff6ff; color:#0266b3;">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      </span>
      <span>${isEdit ? `Chỉnh Sửa ${isCustomer ? 'Khách Hàng' : 'Nhà Cung Cấp'}: ${escapeHtml(partner.code)}` : `Thêm Mới ${isCustomer ? 'Khách Hàng' : 'Nhà Cung Cấp'}`}</span>
    </div>
  `;

  const bodyHtml = `
    <form id="form-partner-modern" autocomplete="off">
      <!-- Top Partner Classification & Region Strip -->
      <div class="pt-modal-banner">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:12px; font-weight:600; color:#475569;">Vai trò đối tác:</span>
          <input type="hidden" id="p_type" value="${escapeHtml(currentType)}" />
          <div class="pt-type-selector">
            <button type="button" class="pt-type-radio ${currentType === 'CUSTOMER' ? 'active' : ''}" data-ptype="CUSTOMER" ${isEdit ? 'disabled style="opacity:0.7;cursor:not-allowed;"' : ''}>
              <span>🤝 Khách hàng (Buyer)</span>
            </button>
            <button type="button" class="pt-type-radio ${currentType === 'SUPPLIER' ? 'active' : ''}" data-ptype="SUPPLIER" ${isEdit ? 'disabled style="opacity:0.7;cursor:not-allowed;"' : ''}>
              <span>🏭 Nhà cung cấp (Supplier)</span>
            </button>
          </div>
        </div>

        <div class="pt-region-pills">
          <span style="font-size:12px; font-weight:600; color:#475569;">Khu vực:</span>
          <button type="button" class="pt-region-btn ${!isVn ? 'active' : ''}" id="btnRegionIntl">🌐 Quốc tế</button>
          <button type="button" class="pt-region-btn ${isVn ? 'active' : ''}" id="btnRegionVn">🇻🇳 Nội địa (VN)</button>
        </div>
      </div>

      <!-- TAB 1: THÔNG TIN ĐỊNH DANH & LIÊN HỆ -->
      <div id="tabGeneral" style="display:block;">
        <!-- Card 1: Định danh pháp lý -->
        <div class="pt-form-card">
          <div class="pt-card-head">
            <div class="pt-card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
              <span>Thông tin định danh doanh nghiệp</span>
            </div>
            <span class="pt-card-sub">Dùng để in Hợp đồng, Commercial Invoice, B/L & Tờ khai</span>
          </div>

          <div class="form-row-3">
            <div class="pt-field-wrap">
              <label class="form-label required">Mã đối tác / Tên viết tắt</label>
              <div class="pt-code-input-group">
                <input
                  type="text"
                  id="p_code"
                  class="form-input"
                  value="${escapeHtml(partner.code || '')}"
                  placeholder="VD: KH-2026-001"
                  required
                />
                <button type="button" id="btnGenPartnerCode" class="pt-btn-autogen" title="Tự động sinh mã theo chuẩn">
                  ⚡ Tự sinh
                </button>
              </div>
            </div>

            <div class="pt-field-wrap">
              <label class="form-label">Mã số thuế / Business Reg No.</label>
              <input
                type="text"
                id="p_tax"
                class="form-input"
                value="${escapeHtml(partner.taxCode || '')}"
                placeholder="VD: 0312345678 / USCI..."
              />
            </div>

            <div class="pt-field-wrap">
              <label class="form-label required">Quốc gia (Country)</label>
              <input
                type="text"
                id="p_country"
                class="form-input"
                list="countryPresetsList"
                value="${escapeHtml(partner.country || 'China')}"
                placeholder="Nhập hoặc chọn quốc gia..."
                required
              />
              <datalist id="countryPresetsList">
                <option value="China"></option>
                <option value="Taiwan"></option>
                <option value="South Korea"></option>
                <option value="Japan"></option>
                <option value="Vietnam"></option>
                <option value="USA"></option>
                <option value="Thailand"></option>
                <option value="India"></option>
                <option value="Singapore"></option>
                <option value="Indonesia"></option>
                <option value="Malaysia"></option>
                <option value="Germany"></option>
              </datalist>
            </div>
          </div>

          <!-- Quick Country Chips -->
          <div class="pt-quick-chips" style="margin-bottom:12px;">
            <span style="font-size:11px; color:#64748b;">Chọn nhanh quốc gia:</span>
            ${['China', 'Taiwan', 'South Korea', 'Japan', 'USA', 'Thailand', 'India', 'Singapore', 'Vietnam'].map(c =>
              `<button type="button" class="pt-quick-chip" data-country-chip="${c}">${c}</button>`
            ).join('')}
          </div>

          <div class="pt-field-wrap" style="margin-bottom:12px;">
            <label class="form-label required">Tên công ty / Đối tác đầy đủ (Company Name)</label>
            <input
              type="text"
              id="p_name"
              class="form-input"
              style="font-weight:600;"
              value="${escapeHtml(partner.name || '')}"
              placeholder="VD: SHANGHAI SHILEJU TEXTILE CO., LTD. hoặc CÔNG TY TNHH DỆT SỢI..."
              required
            />
          </div>

          <div class="pt-field-wrap">
            <label class="form-label">Địa chỉ trụ sở / Kho giao nhận (Address on Invoice & B/L)</label>
            <input
              type="text"
              id="p_address"
              class="form-input"
              value="${escapeHtml(partner.address || '')}"
              placeholder="Số nhà, đường, khu công nghiệp, thành phố, quốc gia..."
            />
          </div>
        </div>

        <!-- Card 2: Người liên hệ (PIC) -->
        <div class="pt-form-card">
          <div class="pt-card-head">
            <div class="pt-card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              <span>Người liên hệ & Kênh giao dịch chứng từ (PIC)</span>
            </div>
            <span class="pt-card-sub">Phục vụ trao đổi PO/SO, gửi nháp B/L & chứng từ gốc</span>
          </div>

          <div class="form-row-3" style="margin-bottom:0;">
            <div class="pt-field-wrap">
              <label class="form-label">Người liên hệ chính (Contact Person)</label>
              <input
                type="text"
                id="p_contact"
                class="form-input"
                value="${escapeHtml(partner.contactPerson || '')}"
                placeholder="VD: Mr. Zhang Wei / Ms. Linda"
              />
            </div>

            <div class="pt-field-wrap">
              <label class="form-label">Điện thoại / WeChat / WhatsApp</label>
              <input
                type="text"
                id="p_phone"
                class="form-input"
                value="${escapeHtml(partner.phone || '')}"
                placeholder="VD: +86 138 0013 8000"
              />
            </div>

            <div class="pt-field-wrap">
              <label class="form-label">Email nhận chứng từ (Email)</label>
              <input
                type="email"
                id="p_email"
                class="form-input"
                value="${escapeHtml(partner.email || '')}"
                placeholder="VD: export@partner.com"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 2: ĐIỀU KHOẢN THƯƠNG MẠI & NGÂN HÀNG -->
      <div id="tabSpec" style="display:none;">
        <div class="pt-form-card">
          <div class="pt-card-head">
            <div class="pt-card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
              <span>Điều khoản giao hàng & Thanh toán ngoại thương</span>
            </div>
            <span class="pt-card-sub">Tự động điền sẵn khi tạo Lô hàng hoặc Hợp đồng mới</span>
          </div>

          <div class="form-row-3">
            <div class="pt-field-wrap">
              <label class="form-label">Điều kiện Incoterms® 2020</label>
              <select id="p_incoterm" class="form-select">
                <option value="">-- Chọn Incoterm --</option>
                ${[
                  ['FOB', 'FOB - Giao lên tàu'],
                  ['CIF', 'CIF - Tiền hàng, Bảo hiểm & Cước'],
                  ['CFR', 'CFR - Tiền hàng & Cước phí'],
                  ['EXW', 'EXW - Giao tại xưởng'],
                  ['FCA', 'FCA - Giao cho người chuyên chở'],
                  ['CPT', 'CPT - Cước phí trả tới'],
                  ['CIP', 'CIP - Cước phí & Bảo hiểm trả tới'],
                  ['DAP', 'DAP - Giao tại nơi đến'],
                  ['DPU', 'DPU - Giao tại nơi đến đã dỡ'],
                  ['DDP', 'DDP - Giao đã nộp thuế']
                ].map(([code, desc]) =>
                  `<option value="${code}" ${(partner.defaultIncoterm || partner.deliveryTerm) === code ? 'selected' : ''}>${desc}</option>`
                ).join('')}
              </select>
            </div>

            <div class="pt-field-wrap">
              <label class="form-label">Đồng tiền giao dịch mặc định</label>
              <select id="p_currency" class="form-select">
                ${['USD', 'VND', 'CNY', 'EUR', 'JPY', 'KRW'].map(cur =>
                  `<option value="${cur}" ${meta.currency === cur ? 'selected' : ''}>${cur}</option>`
                ).join('')}
              </select>
            </div>

            <div class="pt-field-wrap">
              <label class="form-label">Cảng giao / nhận thường dùng (POL/POD)</label>
              <input
                type="text"
                id="p_port"
                class="form-input"
                list="portPresetsList"
                value="${escapeHtml(meta.defaultPort || '')}"
                placeholder="VD: Shanghai Port, China"
              />
              <datalist id="portPresetsList">
                <option value="Shanghai Port, China"></option>
                <option value="Ningbo Port, China"></option>
                <option value="Qingdao Port, China"></option>
                <option value="Xiamen Port, China"></option>
                <option value="Kaohsiung Port, Taiwan"></option>
                <option value="Keelung Port, Taiwan"></option>
                <option value="Busan Port, South Korea"></option>
                <option value="Cat Lai Port, Ho Chi Minh City"></option>
                <option value="Hai Phong Port, Vietnam"></option>
              </datalist>
            </div>
          </div>

          <div class="pt-field-wrap">
            <label class="form-label">Điều khoản thanh toán (Payment Terms)</label>
            <input
              type="text"
              id="p_payment"
              class="form-input"
              value="${escapeHtml(partner.paymentTerms || '')}"
              placeholder="VD: T/T 30% Deposit, 70% Against Copy of B/L hoặc L/C At Sight..."
            />
            <div class="pt-quick-chips">
              <span style="font-size:11px; color:#64748b;">Mẫu thông dụng:</span>
              ${[
                'T/T 30% Deposit, 70% Against Copy B/L',
                'T/T 100% Before Shipment',
                'T/T 100% Within 15 Days After B/L',
                'Irrevocable L/C At Sight',
                'L/C Usance 60 Days',
                'D/P At Sight',
                'Chuyển khoản công nợ 30 ngày'
              ].map(term => `<button type="button" class="pt-quick-chip" data-pay-chip="${term}">${term}</button>`).join('')}
            </div>
          </div>
        </div>

        <div class="pt-form-card">
          <div class="pt-card-head">
            <div class="pt-card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                <line x1="1" y1="10" x2="23" y2="10"></line>
              </svg>
              <span>Tài khoản ngân hàng thụ hưởng & Ghi chú nội bộ</span>
            </div>
            <span class="pt-card-sub">Dùng đối chiếu lệnh chuyển tiền T/T hoặc mở L/C</span>
          </div>

          <div class="pt-field-wrap" style="margin-bottom:12px;">
            <label class="form-label">Thông tin Ngân hàng (Bank Name / SWIFT BIC / Account No.)</label>
            <input
              type="text"
              id="p_bank"
              class="form-input"
              value="${escapeHtml(meta.bankInfo || '')}"
              placeholder="VD: BANK OF CHINA SHANGHAI BRANCH - SWIFT: BKCHCNBJ300 - A/C: 4567890123..."
            />
          </div>

          <div class="pt-field-wrap">
            <label class="form-label">Ghi chú & Đánh giá uy tín đối tác</label>
            <textarea
              id="p_notes"
              class="form-textarea"
              rows="2"
              placeholder="Ghi chú về chất lượng hàng, tiến độ giao chứng từ C/O Form E, chiết khấu..."
            >${escapeHtml(meta.cleanNotes || '')}</textarea>
          </div>
        </div>
      </div>
    </form>
  `;

  const footerHtml = `
    <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
      <div style="font-size:12px; color:#64748b;">
        Các trường có dấu <span style="color:#dc2626; font-weight:700;">*</span> là thông tin bắt buộc.
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <button type="button" class="amis-btn amis-btn-ghost" onclick="window.closeGlobalModal()">Hủy bỏ</button>
        ${!isEdit ? `
          <button type="button" id="btnPartnerSaveAndNew" class="amis-btn amis-btn-ghost" style="border-color:#0266b3; color:#0266b3;">
            <span>Lưu & Thêm tiếp</span>
          </button>
        ` : ''}
        <button type="button" id="btnPartnerSaveSubmit" class="amis-btn amis-btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>${isEdit ? 'Cập nhật đối tác' : 'Lưu đối tác'}</span>
        </button>
      </div>
    </div>
  `;

  openModal(titleHtml, bodyHtml, footerHtml);

  // Configure Modal Tabs (#modalTabs)
  const tabsEl = document.getElementById('modalTabs');
  if (tabsEl) {
    tabsEl.style.display = 'flex';
    tabsEl.innerHTML = `
      <button type="button" class="modal-tab-btn active" onclick="window.switchFormTab('tabGeneral')">
        1. Thông tin định danh & Liên hệ
      </button>
      <button type="button" class="modal-tab-btn" onclick="window.switchFormTab('tabSpec')">
        2. Điều khoản thương mại & Ngân hàng
      </button>
    `;
  }

  // Bind Type Radio Selector (when creating new)
  if (!isEdit) {
    document.querySelectorAll('.pt-type-radio').forEach(btn => {
      btn.addEventListener('click', () => {
        const newType = btn.getAttribute('data-ptype');
        document.getElementById('p_type').value = newType;
        document.querySelectorAll('.pt-type-radio').forEach(b => b.classList.toggle('active', b === btn));
        const codeInput = document.getElementById('p_code');
        if (codeInput && (codeInput.value.startsWith('KH-') || codeInput.value.startsWith('NCC-') || !codeInput.value.trim())) {
          codeInput.value = generateSuggestedPartnerCode(newType);
        }
      });
    });
  }

  // Bind Region Buttons
  const btnIntl = document.getElementById('btnRegionIntl');
  const btnVn = document.getElementById('btnRegionVn');
  btnIntl?.addEventListener('click', () => {
    btnIntl.classList.add('active');
    btnVn?.classList.remove('active');
    const cInput = document.getElementById('p_country');
    if (cInput && isVietnamCountry(cInput.value)) cInput.value = 'China';
    const curSel = document.getElementById('p_currency');
    if (curSel) curSel.value = 'USD';
  });
  btnVn?.addEventListener('click', () => {
    btnVn.classList.add('active');
    btnIntl?.classList.remove('active');
    const cInput = document.getElementById('p_country');
    if (cInput) cInput.value = 'Vietnam';
    const curSel = document.getElementById('p_currency');
    if (curSel) curSel.value = 'VND';
  });

  // Bind Auto-generate Code button
  document.getElementById('btnGenPartnerCode')?.addEventListener('click', () => {
    const t = document.getElementById('p_type')?.value || resolvedType;
    const codeEl = document.getElementById('p_code');
    if (codeEl) {
      codeEl.value = generateSuggestedPartnerCode(t);
      codeEl.focus();
    }
  });

  // Bind Country quick chips
  document.querySelectorAll('[data-country-chip]').forEach(chip => {
    chip.addEventListener('click', () => {
      const c = chip.getAttribute('data-country-chip');
      const cInput = document.getElementById('p_country');
      if (cInput) cInput.value = c;
      const vn = isVietnamCountry(c);
      btnVn?.classList.toggle('active', vn);
      btnIntl?.classList.toggle('active', !vn);
    });
  });

  // Bind Payment Terms quick chips
  document.querySelectorAll('[data-pay-chip]').forEach(chip => {
    chip.addEventListener('click', () => {
      const term = chip.getAttribute('data-pay-chip');
      const pInput = document.getElementById('p_payment');
      if (pInput) pInput.value = term;
    });
  });

  // Submit handler calling /api/customers or /api/suppliers
  const submitPartner = async (keepOpenForNew = false) => {
    const code = document.getElementById('p_code')?.value.trim().toUpperCase();
    const companyName = document.getElementById('p_name')?.value.trim();
    const type = document.getElementById('p_type')?.value || resolvedType;
    const isCust = type === 'CUSTOMER';
    const endpoint = isCust ? '/api/customers' : '/api/suppliers';
    const country = document.getElementById('p_country')?.value.trim() || 'Vietnam';

    if (!code || !companyName) {
      window.switchFormTab('tabGeneral');
      showToast('Vui lòng nhập đầy đủ Mã đối tác và Tên công ty!', 'error');
      return;
    }

    const combinedNotes = buildPartnerNotes({
      partnerCode: code,
      isCustomer: isCust,
      currency: document.getElementById('p_currency')?.value || 'USD',
      defaultPort: document.getElementById('p_port')?.value.trim() || '',
      bankInfo: document.getElementById('p_bank')?.value.trim() || '',
      cleanNotes: document.getElementById('p_notes')?.value.trim() || ''
    });

    // Bidirectional payload matching CreateCustomerDto & CreateSupplierDto in backend
    const payload = {
      companyName,
      name: companyName,
      tradeName: code,
      code,
      country,
      taxCode: document.getElementById('p_tax')?.value.trim() || null,
      address: document.getElementById('p_address')?.value.trim() || null,
      contactPerson: document.getElementById('p_contact')?.value.trim() || null,
      phone: document.getElementById('p_phone')?.value.trim() || null,
      email: document.getElementById('p_email')?.value.trim() || null,
      deliveryTerm: document.getElementById('p_incoterm')?.value || null,
      paymentTerms: document.getElementById('p_payment')?.value.trim() || null,
      notes: combinedNotes
    };

    try {
      if (isEdit) {
        await api.put(`${endpoint}/${id}`, payload);
        showToast(`Đã cập nhật thông tin ${isCust ? 'khách hàng' : 'nhà cung cấp'} ${code}`, 'success');
      } else {
        await api.post(endpoint, payload);
        showToast(`Đã thêm mới ${isCust ? 'khách hàng' : 'nhà cung cấp'} ${code} thành công`, 'success');
      }

      const mainEl = document.getElementById('main-content');
      const targetTab = isCust ? 'partners-customers' : 'partners-suppliers';

      if (keepOpenForNew) {
        if (mainEl) await renderPartners(mainEl, targetTab);
        window.openPartnerModal(null, type);
      } else {
        closeModal();
        if (mainEl) await renderPartners(mainEl, targetTab);
      }
    } catch { /* error handled by api.js toast */ }
  };

  document.getElementById('btnPartnerSaveSubmit')?.addEventListener('click', () => submitPartner(false));
  document.getElementById('btnPartnerSaveAndNew')?.addEventListener('click', () => submitPartner(true));
  document.getElementById('form-partner-modern')?.addEventListener('submit', (e) => {
    e.preventDefault();
    submitPartner(false);
  });
};

// Duplicate Partner helper
window.duplicatePartnerRecord = (id, typeFilter) => {
  const list = typeFilter === 'CUSTOMER' ? customersCache : suppliersCache;
  const source = list.find(p => p.id === id);
  if (!source) return;
  const copy = {
    ...source,
    id: null,
    code: generateSuggestedPartnerCode(typeFilter),
    name: `${source.name} (Chi nhánh)`
  };
  window.openPartnerModal(null, typeFilter, copy);
};

// Delete Single Partner helper
window.deletePartnerRecord = async (id, name, typeFilter) => {
  const isCust = typeFilter === 'CUSTOMER';
  const endpoint = isCust ? '/api/customers' : '/api/suppliers';
  const ok = await showConfirm({
    title: `Xóa ${isCust ? 'Khách hàng' : 'Nhà cung cấp'}`,
    message: `Bạn có chắc chắn muốn xóa đối tác này khỏi danh bạ?`,
    highlight: name,
    type: 'danger',
    confirmText: 'Xóa đối tác',
    cancelText: 'Hủy bỏ'
  });
  if (!ok) return;
  try {
    await api.delete(`${endpoint}/${id}`);
    selectedPartnerIds.delete(id);
    showToast(`Đã xóa đối tác ${name}`, 'success');
    const mainEl = document.getElementById('main-content');
    if (mainEl) await renderPartners(mainEl, isCust ? 'partners-customers' : 'partners-suppliers');
  } catch { /* handled by api.js */ }
};

// =========================================================
// 3. MODAL XEM HỒ SƠ ĐỐI TÁC & LỊCH SỬ LÔ HÀNG GIAO DỊCH
// =========================================================
window.openPartnerDetailModal = async (id, typeFilter = 'CUSTOMER') => {
  const list = typeFilter === 'CUSTOMER' ? customersCache : suppliersCache;
  const partner = list.find(p => p.id === id) || customersCache.find(p => p.id === id) || suppliersCache.find(p => p.id === id);
  if (!partner) return;

  const isCustomer = partner.type === 'CUSTOMER';
  const meta = parsePartnerNotes(partner.notes);

  // Find all shipments linked to this partner
  const pNameLower = (partner.name || '').trim().toLowerCase();
  const linkedShipments = allShipmentsCache.filter(s => {
    if (isCustomer && s.customerId === partner.id) return true;
    if (!isCustomer && s.supplierId === partner.id) return true;
    const sPartner = ((isCustomer ? s.customerName : s.supplierName) || '').trim().toLowerCase();
    return sPartner && sPartner === pNameLower;
  });

  const totalUsdValue = linkedShipments.reduce((sum, s) => sum + (Number(s.totalValue || s.totalValueUsd || s.totalAmount || 0) || 0), 0);

  const modalContainer = document.getElementById('modalContainer');
  if (modalContainer) {
    modalContainer.style.maxWidth = '840px';
    modalContainer.style.width = '95%';
  }

  const titleHtml = `
    <div style="display:flex; align-items:center; gap:10px;">
      <span class="amis-sku-badge" style="font-size:13px;">${escapeHtml(partner.code)}</span>
      <span>Hồ Sơ ${isCustomer ? 'Khách Hàng' : 'Nhà Cung Cấp'}: ${escapeHtml(partner.name)}</span>
    </div>
  `;

  const bodyHtml = `
    <div style="display:flex; flex-direction:column; gap:14px;">
      <!-- KPI Summary Row -->
      <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:12px;">
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px 14px;">
          <div style="font-size:11.5px; color:#64748b; font-weight:500;">Phân loại & Khu vực</div>
          <div style="font-size:15px; font-weight:700; color:#0f172a; margin-top:4px;">
            ${isCustomer ? '🤝 Khách hàng' : '🏭 Nhà cung cấp'} · ${escapeHtml(partner.country || '---')}
          </div>
          <div style="font-size:11.5px; color:#64748b; margin-top:2px;">MST: ${escapeHtml(partner.taxCode || 'Chưa cập nhật')}</div>
        </div>

        <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:12px 14px;">
          <div style="font-size:11.5px; color:#0369a1; font-weight:500;">Tổng số lô hàng đã giao dịch</div>
          <div style="font-size:18px; font-weight:800; color:#0266b3; margin-top:4px;">${Math.max(linkedShipments.length, partner.shipmentCount || 0)} lô hàng</div>
          <div style="font-size:11.5px; color:#0369a1; margin-top:2px;">Incoterm: <strong>${escapeHtml(partner.defaultIncoterm || '---')}</strong> · Tiền tệ: <strong>${escapeHtml(meta.currency)}</strong></div>
        </div>

        <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:8px; padding:12px 14px;">
          <div style="font-size:11.5px; color:#047857; font-weight:500;">Tổng kim ngạch lũy kế (USD)</div>
          <div style="font-size:18px; font-weight:800; color:#059669; margin-top:4px;">$${totalUsdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div style="font-size:11.5px; color:#047857; margin-top:2px;">PTTT: ${escapeHtml(partner.paymentTerms || 'Theo hợp đồng')}</div>
        </div>
      </div>

      <!-- Detail Info Card -->
      <div class="pt-form-card" style="margin-bottom:0;">
        <div class="pt-card-head">
          <div class="pt-card-title">📌 Thông tin liên hệ & Điều khoản thương mại</div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px 20px; font-size:12.5px;">
          <div><span style="color:#64748b;">Người đại diện (PIC):</span> <strong style="color:#0f172a;">${escapeHtml(partner.contactPerson || '---')}</strong></div>
          <div><span style="color:#64748b;">Điện thoại / WeChat:</span> <strong style="color:#0f172a;">${escapeHtml(partner.phone || '---')}</strong></div>
          <div><span style="color:#64748b;">Email chứng từ:</span> <strong style="color:#0266b3;">${escapeHtml(partner.email || '---')}</strong></div>
          <div><span style="color:#64748b;">Cảng giao/nhận (POL/POD):</span> <strong style="color:#0f172a;">${escapeHtml(meta.defaultPort || '---')}</strong></div>
          <div style="grid-column:1 / -1;"><span style="color:#64748b;">Địa chỉ trụ sở:</span> <strong style="color:#0f172a;">${escapeHtml(partner.address || '---')}</strong></div>
          ${meta.bankInfo ? `<div style="grid-column:1 / -1;"><span style="color:#64748b;">Ngân hàng thụ hưởng:</span> <strong style="color:#0266b3;">${escapeHtml(meta.bankInfo)}</strong></div>` : ''}
          ${meta.cleanNotes ? `<div style="grid-column:1 / -1;"><span style="color:#64748b;">Ghi chú nội bộ:</span> <span>${escapeHtml(meta.cleanNotes)}</span></div>` : ''}
        </div>
      </div>

      <!-- Shipment History Table -->
      <div class="pt-form-card" style="margin-bottom:0; padding:0; overflow:hidden;">
        <div style="padding:10px 14px; background:#f8fafc; border-bottom:1px solid #e2e8f0; display:flex; align-items:center; justify-content:space-between;">
          <span style="font-size:13px; font-weight:700; color:#0f172a;">🚢 Lịch sử Lô hàng xuất nhập khẩu (${linkedShipments.length})</span>
          <button type="button" class="amis-btn amis-btn-primary" style="height:28px; font-size:12px;" onclick="window.closeGlobalModal(); window.appNavigateTo('shipment-form')">
            + Tạo lô hàng mới
          </button>
        </div>
        ${linkedShipments.length === 0 ? `
          <div style="padding:28px; text-align:center; color:#64748b; font-size:12.5px;">
            Chưa có lô hàng nào được liên kết trực tiếp với đối tác này.
          </div>
        ` : `
          <div style="max-height:240px; overflow-y:auto;">
            <table class="amis-data-table" style="min-width:100%;">
              <thead>
                <tr>
                  <th>Mã lô hàng</th>
                  <th>Loại hình</th>
                  <th>Hành trình (POL → POD)</th>
                  <th>Incoterm</th>
                  <th style="text-align:right;">Kim ngạch (USD)</th>
                  <th style="text-align:center;">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                ${linkedShipments.map(s => `
                  <tr>
                    <td>
                      <span class="amis-sku-badge" style="cursor:pointer;" onclick="window.closeGlobalModal(); window.appNavigateTo('shipment-detail', true, '${s.id}')">
                        ${escapeHtml(s.shipmentCode || s.code || '---')}
                      </span>
                    </td>
                    <td>${(s.type || '').toUpperCase().includes('EXPORT') ? '📤 Xuất khẩu' : '📥 Nhập khẩu'}</td>
                    <td style="font-size:12px;">${escapeHtml(s.portOfLoading || '---')} → ${escapeHtml(s.portOfDischarge || '---')}</td>
                    <td><span class="pt-incoterm-tag">${escapeHtml(s.deliveryTerm || s.incoterm || 'CIF')}</span></td>
                    <td style="text-align:right; font-weight:700; color:#059669;">$${Number(s.totalValue || s.totalValueUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td style="text-align:center;">
                      <button type="button" class="amis-btn amis-btn-ghost" style="height:26px; padding:0 8px; font-size:11.5px;" onclick="window.closeGlobalModal(); window.appNavigateTo('shipment-detail', true, '${s.id}')">
                        Mở chứng từ →
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    </div>
  `;

  const footerHtml = `
    <div style="display:flex; justify-content:space-between; width:100%;">
      <button type="button" class="amis-btn amis-btn-ghost" onclick="window.closeGlobalModal()">Đóng</button>
      <button type="button" class="amis-btn amis-btn-primary" onclick="window.closeGlobalModal(); window.openPartnerModal('${partner.id}', '${partner.type}')">
        ✎ Chỉnh sửa hồ sơ đối tác
      </button>
    </div>
  `;

  openModal(titleHtml, bodyHtml, footerHtml);
};

// =========================================================
// 4. DANH SÁCH HÃNG TÀU & ĐẠI LÝ FORWARDER (ĐỒNG BỘ MISA UI)
// =========================================================
async function renderForwardersList(container) {
  const forwardersList = loadForwardersCatalog();
  const validIds = new Set(forwardersList.map(f => f.id));
  selectedForwarderIds.forEach(id => {
    if (!validIds.has(id)) selectedForwarderIds.delete(id);
  });

  const shippingLinesCount = forwardersList.filter(f => f.type === 'SHIPPING_LINE').length;
  const forwarderAgentsCount = forwardersList.filter(f => f.type !== 'SHIPPING_LINE').length;

  container.innerHTML = `
    <div class="amis-list-page">
      <!-- Sub-nav -->
      <div class="pt-subnav-bar">
        <div class="pt-seg-group">
          <button type="button" class="pt-seg-btn" onclick="window.appNavigateTo('partners-customers')">
            <span>Khách hàng (Xuất khẩu / Nội địa)</span>
            <span class="pt-seg-count">${customersCache.length}</span>
          </button>
          <button type="button" class="pt-seg-btn" onclick="window.appNavigateTo('partners-suppliers')">
            <span>Nhà cung cấp (Nhập khẩu / Nội địa)</span>
            <span class="pt-seg-count">${suppliersCache.length}</span>
          </button>
          <button type="button" class="pt-seg-btn active" onclick="window.appNavigateTo('forwarders')">
            <span>Hãng tàu & Forwarder</span>
            <span class="pt-seg-count">${forwardersList.length}</span>
          </button>
        </div>

        <div class="pt-kpi-pills">
          <div class="pt-kpi-pill kpi-blue">
            <span>Tổng đơn vị vận tải:</span>
            <strong>${forwardersList.length}</strong>
          </div>
          <div class="pt-kpi-pill">
            <span>🚢 Hãng tàu (Carrier):</span>
            <strong>${shippingLinesCount}</strong>
          </div>
          <div class="pt-kpi-pill kpi-green">
            <span>📦 Đại lý Forwarder:</span>
            <strong>${forwarderAgentsCount}</strong>
          </div>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="amis-toolbar-wrap">
        <div class="amis-toolbar-left">
          <button type="button" id="btnFwAdd" class="amis-btn amis-btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Thêm Hãng tàu / Forwarder</span>
          </button>

          <button type="button" id="btnFwEdit" class="amis-btn amis-btn-ghost" disabled>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            <span>Sửa</span>
          </button>

          <button type="button" id="btnFwDelete" class="amis-btn amis-btn-danger-ghost" disabled>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span id="btnFwDeleteLabel">Xóa</span>
          </button>

          <div class="amis-toolbar-sep"></div>

          <button type="button" id="btnFwRefresh" class="amis-btn amis-btn-ghost">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            <span>Nạp</span>
          </button>
        </div>

        <div class="amis-toolbar-right">
          <div class="amis-search-box" style="width: 240px;">
            <svg class="amis-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="text" id="fwSearchInput" class="amis-search-input" placeholder="Tìm mã, tên hãng tàu, liên hệ..." value="${escapeHtml(fwSearchQuery)}" />
          </div>

          <select id="fwTypeFilterSelect" class="pt-filter-select">
            <option value="ALL" ${fwTypeFilter === 'ALL' ? 'selected' : ''}>Tất cả loại hình</option>
            <option value="SHIPPING_LINE" ${fwTypeFilter === 'SHIPPING_LINE' ? 'selected' : ''}>🚢 Hãng tàu (Shipping Line)</option>
            <option value="FORWARDER" ${fwTypeFilter === 'FORWARDER' ? 'selected' : ''}>📦 Đại lý Forwarder</option>
          </select>
        </div>
      </div>

      <!-- Table -->
      <div class="amis-table-container">
        <div class="amis-table-scroll">
          <table class="amis-data-table">
            <thead id="fwTableHead"></thead>
            <tbody id="fwTableBody"></tbody>
          </table>
        </div>
        <div class="amis-table-footer" id="fwTableFooter"></div>
      </div>
    </div>
  `;

  const getFilteredFw = () => {
    const currentFw = loadForwardersCatalog();
    const kw = fwSearchQuery.trim().toLowerCase();
    const list = currentFw.filter(f => {
      if (fwTypeFilter !== 'ALL' && f.type !== fwTypeFilter) return false;
      if (!kw) return true;
      return (
        (f.code && f.code.toLowerCase().includes(kw)) ||
        (f.name && f.name.toLowerCase().includes(kw)) ||
        (f.contactPerson && f.contactPerson.toLowerCase().includes(kw)) ||
        (f.phone && f.phone.toLowerCase().includes(kw)) ||
        (f.email && f.email.toLowerCase().includes(kw))
      );
    });
    list.sort((a, b) => {
      const va = String(a[fwSortField] || '').toLowerCase();
      const vb = String(b[fwSortField] || '').toLowerCase();
      return fwSortAsc ? va.localeCompare(vb, 'vi') : vb.localeCompare(va, 'vi');
    });
    return list;
  };

  const refreshFwTable = () => {
    const filtered = getFilteredFw();
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / fwPageSize));
    if (fwCurrentPage > totalPages) fwCurrentPage = totalPages;
    const startIdx = (fwCurrentPage - 1) * fwPageSize;
    const pageRows = filtered.slice(startIdx, startIdx + fwPageSize);

    const allSelected = pageRows.length > 0 && pageRows.every(r => selectedForwarderIds.has(r.id));
    const thead = document.getElementById('fwTableHead');
    if (thead) {
      thead.innerHTML = `
        <tr>
          <th class="amis-th-check"><input type="checkbox" id="checkAllFw" ${allSelected ? 'checked' : ''} /></th>
          <th style="width:130px;">Mã đơn vị</th>
          <th style="min-width:240px;">Tên Hãng tàu / Đại lý Forwarder</th>
          <th style="width:170px;">Phân loại</th>
          <th style="width:220px;">Người liên hệ (Booking / Docs)</th>
          <th style="width:190px;">Website Tra cứu (Tracking)</th>
          <th>Ghi chú tuyến vận chuyển</th>
          <th class="amis-th-actions" style="width:100px;">Thao tác</th>
        </tr>
      `;
      document.getElementById('checkAllFw')?.addEventListener('change', (e) => {
        if (e.target.checked) pageRows.forEach(r => selectedForwarderIds.add(r.id));
        else pageRows.forEach(r => selectedForwarderIds.delete(r.id));
        refreshFwTable();
      });
    }

    const tbody = document.getElementById('fwTableBody');
    if (tbody) {
      if (pageRows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="amis-table-empty">Không có dữ liệu Hãng tàu / Forwarder phù hợp.</td></tr>`;
      } else {
        tbody.innerHTML = pageRows.map(f => {
          const isChecked = selectedForwarderIds.has(f.id);
          return `
            <tr data-id="${f.id}" class="${isChecked ? 'amis-row-selected' : ''}">
              <td class="amis-td-check" onclick="event.stopPropagation()">
                <input type="checkbox" class="fw-row-check" data-id="${f.id}" ${isChecked ? 'checked' : ''} />
              </td>
              <td><span class="amis-sku-badge">${escapeHtml(f.code)}</span></td>
              <td style="font-weight:600; color:var(--text-main);">${escapeHtml(f.name)}</td>
              <td>
                <span class="pt-country-tag ${f.type === 'SHIPPING_LINE' ? 'is-intl' : ''}">
                  ${f.type === 'SHIPPING_LINE' ? '🚢 Hãng tàu (Carrier)' : '📦 Đại lý Forwarder'}
                </span>
              </td>
              <td>
                <div class="pt-contact-box">
                  <span class="pt-contact-name">${escapeHtml(f.contactPerson || '---')}</span>
                  <div class="pt-contact-sub">
                    ${f.phone ? `<span>📞 ${escapeHtml(f.phone)}</span>` : ''}
                    ${f.email ? `<span>✉️ ${escapeHtml(f.email)}</span>` : ''}
                  </div>
                </div>
              </td>
              <td>
                ${f.trackingUrl ? `<a href="${escapeHtml(f.trackingUrl)}" target="_blank" style="color:#0266b3; font-size:12px; font-weight:500;">🔗 Tra cứu cont/bill ↗</a>` : '<span class="amis-td-muted">---</span>'}
              </td>
              <td class="amis-td-notes">${escapeHtml(f.notes || '---')}</td>
              <td class="amis-td-actions" onclick="event.stopPropagation()">
                <div class="amis-row-actions" style="opacity:1;">
                  <button type="button" class="amis-icon-btn" title="Sửa" onclick="window.openForwarderModal('${f.id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                  <button type="button" class="amis-icon-btn amis-icon-btn-danger" title="Xóa" onclick="window.deleteForwarderRecord('${f.id}', '${escapeHtml(f.code)}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('');

        tbody.querySelectorAll('.fw-row-check').forEach(chk => {
          chk.addEventListener('change', (e) => {
            const id = e.target.getAttribute('data-id');
            if (e.target.checked) selectedForwarderIds.add(id);
            else selectedForwarderIds.delete(id);
            refreshFwTable();
          });
        });

        tbody.querySelectorAll('tr[data-id]').forEach(tr => {
          tr.addEventListener('click', () => {
            const id = tr.getAttribute('data-id');
            if (selectedForwarderIds.has(id)) selectedForwarderIds.delete(id);
            else selectedForwarderIds.add(id);
            refreshFwTable();
          });
        });
      }
    }

    const footer = document.getElementById('fwTableFooter');
    if (footer) {
      footer.innerHTML = `
        <div class="amis-table-info">Tổng số: <strong>${total}</strong> đơn vị vận tải</div>
        <div class="amis-pagination-controls">
          <button type="button" class="amis-pg-btn" ${fwCurrentPage <= 1 ? 'disabled' : ''} id="btnFwPrev">‹</button>
          <button type="button" class="amis-pg-btn active">${fwCurrentPage}</button>
          <button type="button" class="amis-pg-btn" ${fwCurrentPage >= totalPages ? 'disabled' : ''} id="btnFwNext">›</button>
        </div>
      `;
      document.getElementById('btnFwPrev')?.addEventListener('click', () => {
        if (fwCurrentPage > 1) { fwCurrentPage--; refreshFwTable(); }
      });
      document.getElementById('btnFwNext')?.addEventListener('click', () => {
        if (fwCurrentPage < totalPages) { fwCurrentPage++; refreshFwTable(); }
      });
    }

    const cnt = selectedForwarderIds.size;
    const btnEdit = document.getElementById('btnFwEdit');
    const btnDel = document.getElementById('btnFwDelete');
    const delLbl = document.getElementById('btnFwDeleteLabel');
    if (btnEdit) btnEdit.disabled = cnt !== 1;
    if (btnDel) btnDel.disabled = cnt === 0;
    if (delLbl) delLbl.textContent = cnt > 1 ? `Xóa (${cnt})` : 'Xóa';
  };

  refreshFwTable();

  document.getElementById('btnFwAdd')?.addEventListener('click', () => window.openForwarderModal(null));
  document.getElementById('btnFwEdit')?.addEventListener('click', () => {
    const id = [...selectedForwarderIds][0];
    if (id) window.openForwarderModal(id);
  });
  document.getElementById('btnFwDelete')?.addEventListener('click', async () => {
    const ids = [...selectedForwarderIds];
    if (ids.length === 1) {
      const target = loadForwardersCatalog().find(f => f.id === ids[0]);
      if (target) await window.deleteForwarderRecord(target.id, target.code);
    }
  });
  document.getElementById('btnFwRefresh')?.addEventListener('click', () => renderPartners(container, 'forwarders'));
  document.getElementById('fwSearchInput')?.addEventListener('input', (e) => {
    fwSearchQuery = e.target.value;
    fwCurrentPage = 1;
    refreshFwTable();
  });
  document.getElementById('fwTypeFilterSelect')?.addEventListener('change', (e) => {
    fwTypeFilter = e.target.value;
    fwCurrentPage = 1;
    refreshFwTable();
  });
}

window.openForwarderModal = async (id = null) => {
  const isEdit = Boolean(id);
  const currentFw = loadForwardersCatalog();
  let fw = { type: 'SHIPPING_LINE', code: `FW-${new Date().getFullYear()}-${String(currentFw.length + 1).padStart(3, '0')}` };
  if (isEdit) {
    const found = currentFw.find(x => x.id === id);
    if (found) fw = { ...found };
  }

  const titleHtml = isEdit ? `Chỉnh Sửa Hãng Tàu / Forwarder: ${escapeHtml(fw.code)}` : 'Thêm Mới Hãng Tàu & Đại Lý Forwarder';
  const bodyHtml = `
    <form id="form-forwarder-modern" autocomplete="off">
      <div class="pt-form-card" style="margin-bottom:0;">
        <div class="form-row-2">
          <div class="pt-field-wrap">
            <label class="form-label required">Mã hãng tàu / Forwarder</label>
            <input type="text" id="f_code" class="form-input" style="font-family:monospace; font-weight:700; text-transform:uppercase;" value="${escapeHtml(fw.code || '')}" required />
          </div>
          <div class="pt-field-wrap">
            <label class="form-label required">Loại hình đơn vị</label>
            <select id="f_type" class="form-select">
              <option value="SHIPPING_LINE" ${fw.type === 'SHIPPING_LINE' ? 'selected' : ''}>🚢 Hãng Tàu Biển (Shipping Line / Carrier)</option>
              <option value="FORWARDER" ${fw.type === 'FORWARDER' ? 'selected' : ''}>📦 Đại Lý Giao Nhận (Freight Forwarder)</option>
            </select>
          </div>
        </div>

        <div class="pt-field-wrap" style="margin-bottom:12px;">
          <label class="form-label required">Tên đầy đủ Hãng tàu / Đại lý vận tải</label>
          <input type="text" id="f_name" class="form-input" value="${escapeHtml(fw.name || '')}" placeholder="VD: COSCO SHIPPING LINES / SITC CONTAINER LINES..." required />
        </div>

        <div class="form-row-3">
          <div class="pt-field-wrap">
            <label class="form-label">Người liên hệ (Booking/Docs)</label>
            <input type="text" id="f_contact" class="form-input" value="${escapeHtml(fw.contactPerson || '')}" />
          </div>
          <div class="pt-field-wrap">
            <label class="form-label">Số điện thoại</label>
            <input type="text" id="f_phone" class="form-input" value="${escapeHtml(fw.phone || '')}" />
          </div>
          <div class="pt-field-wrap">
            <label class="form-label">Email chứng từ / AN</label>
            <input type="email" id="f_email" class="form-input" value="${escapeHtml(fw.email || '')}" />
          </div>
        </div>

        <div class="pt-field-wrap" style="margin-bottom:12px;">
          <label class="form-label">Đường dẫn tra cứu Container / B/L (Tracking URL)</label>
          <input type="url" id="f_url" class="form-input" value="${escapeHtml(fw.trackingUrl || '')}" placeholder="https://elines.coscoshipping.com/..." />
        </div>

        <div class="pt-field-wrap">
          <label class="form-label">Ghi chú tuyến thế mạnh & Local Charges</label>
          <textarea id="f_notes" class="form-textarea" rows="2">${escapeHtml(fw.notes || '')}</textarea>
        </div>
      </div>
    </form>
  `;

  const footerHtml = `
    <button type="button" class="amis-btn amis-btn-ghost" onclick="window.closeGlobalModal()">Hủy bỏ</button>
    <button type="button" id="btnSaveFwSubmit" class="amis-btn amis-btn-primary">${isEdit ? 'Cập nhật' : 'Lưu đơn vị'}</button>
  `;

  openModal(titleHtml, bodyHtml, footerHtml);

  document.getElementById('btnSaveFwSubmit')?.addEventListener('click', async () => {
    const code = document.getElementById('f_code')?.value.trim().toUpperCase();
    const name = document.getElementById('f_name')?.value.trim();
    if (!code || !name) {
      showToast('Vui lòng nhập Mã và Tên đơn vị vận tải!', 'error');
      return;
    }
    const list = loadForwardersCatalog();
    const item = {
      id: isEdit ? id : `fw-${Date.now()}`,
      code,
      name,
      type: document.getElementById('f_type')?.value || 'SHIPPING_LINE',
      contactPerson: document.getElementById('f_contact')?.value.trim() || '',
      phone: document.getElementById('f_phone')?.value.trim() || '',
      email: document.getElementById('f_email')?.value.trim() || '',
      trackingUrl: document.getElementById('f_url')?.value.trim() || '',
      notes: document.getElementById('f_notes')?.value.trim() || ''
    };
    if (isEdit) {
      const idx = list.findIndex(x => x.id === id);
      if (idx >= 0) list[idx] = item;
      showToast('Đã cập nhật thông tin hãng tàu / forwarder', 'success');
    } else {
      list.unshift(item);
      showToast('Đã thêm mới hãng tàu / forwarder', 'success');
    }
    saveForwardersCatalog(list);
    closeModal();
    const mainEl = document.getElementById('main-content');
    if (mainEl) await renderPartners(mainEl, 'forwarders');
  });
};

window.deleteForwarderRecord = async (id, code) => {
  const ok = await showConfirm({
    title: 'Xóa Hãng tàu / Forwarder',
    message: 'Bạn có chắc chắn muốn xóa đơn vị vận tải này?',
    highlight: code,
    type: 'danger',
    confirmText: 'Xóa',
    cancelText: 'Hủy bỏ'
  });
  if (!ok) return;
  const list = loadForwardersCatalog().filter(x => x.id !== id);
  saveForwardersCatalog(list);
  selectedForwarderIds.delete(id);
  showToast(`Đã xóa đơn vị vận tải ${code}`, 'success');
  const mainEl = document.getElementById('main-content');
  if (mainEl) await renderPartners(mainEl, 'forwarders');
};
