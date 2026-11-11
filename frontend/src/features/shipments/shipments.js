/**
 * Shipments Feature Module - Full CRUD & Status Transitions
 * MISA AMIS Enterprise Style
 */
import { api, showToast, showConfirm, openModal, closeModal } from "../../core/api.js";

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

let shipmentsList = [];
let selectedId = null;
let selectedIds = new Set();
let currentShipmentFilter = 'All';
let currentStatusTab = 'ALL';

// Danh sách sản phẩm được chọn trong form (local state)
let formItems = []; // [{ productId, productName, sku, unit, quantity, unitPrice }]
let allProducts = []; // cache danh sách sản phẩm
let purchasePrices = []; // danh sách giá mua vào đang áp dụng
let salePrices = []; // danh sách giá bán ra đang áp dụng

// Cấu hình các cột hiển thị theo chuẩn nghiệp vụ người dùng
const COLUMN_CONFIG = [
  { id: 'code', label: 'Mã Lô Hàng', default: true },
  { id: 'type', label: 'Loại Hình', default: true },
  { id: 'partner', label: 'Đối Tác', default: true },
  { id: 'products', label: 'Sản Phẩm', default: true },
  { id: 'quantity', label: 'Số Lượng (KG)', default: true },
  { id: 'invoices', label: 'Invoice', default: true },
  { id: 'declarations', label: 'Tờ Khai HQ', default: true },
  { id: 'containers', label: 'Container', default: true },
  { id: 'etd', label: 'ETD', default: false },
  { id: 'eta', label: 'ETA', default: true },
  { id: 'value', label: 'Tổng Giá Trị', default: true },
  { id: 'status', label: 'Trạng Thái', default: true }
];

function getActiveColumns() {
  const saved = localStorage.getItem('xnk_shipment_columns');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) { }
  }
  const initial = {};
  COLUMN_CONFIG.forEach(c => initial[c.id] = c.default);
  return initial;
}

function saveActiveColumns(cols) {
  localStorage.setItem('xnk_shipment_columns', JSON.stringify(cols));
}

function getShipmentStatusMeta(status) {
  const sStr = String(status ?? '').trim();
  const dict = {
    '0': { label: 'Bản nháp', cls: 'status-draft', dot: '#94a3b8' },
    'Draft': { label: 'Bản nháp', cls: 'status-draft', dot: '#94a3b8' },
    '1': { label: 'Chuẩn bị chứng từ', cls: 'status-prep', dot: '#f59e0b' },
    'PreparingDocuments': { label: 'Chuẩn bị chứng từ', cls: 'status-prep', dot: '#f59e0b' },
    '2': { label: 'Yêu cầu Booking', cls: 'status-booking', dot: '#0284c7' },
    'BookingRequested': { label: 'Yêu cầu Booking', cls: 'status-booking', dot: '#0284c7' },
    '3': { label: 'Đã xác nhận Booking', cls: 'status-booking', dot: '#0284c7' },
    'BookingConfirmed': { label: 'Đã xác nhận Booking', cls: 'status-booking', dot: '#0284c7' },
    '4': { label: 'Đang vận chuyển', cls: 'status-transit', dot: '#6366f1' },
    'InTransit': { label: 'Đang vận chuyển', cls: 'status-transit', dot: '#6366f1' },
    '5': { label: 'Đã đến cảng', cls: 'status-arrived', dot: '#14b8a6' },
    'Arrived': { label: 'Đã đến cảng', cls: 'status-arrived', dot: '#14b8a6' },
    '6': { label: 'Làm thủ tục HQ', cls: 'status-customs', dot: '#eab308' },
    'CustomsProcessing': { label: 'Làm thủ tục HQ', cls: 'status-customs', dot: '#eab308' },
    '7': { label: 'Đã thông quan', cls: 'status-cleared', dot: '#10b981' },
    'CustomsCleared': { label: 'Đã thông quan', cls: 'status-cleared', dot: '#10b981' },
    '8': { label: 'Đã hoàn thành', cls: 'status-completed', dot: '#22c55e' },
    'Completed': { label: 'Đã hoàn thành', cls: 'status-completed', dot: '#22c55e' },
    'WarehouseStored': { label: 'Đã nhập kho', cls: 'status-completed', dot: '#22c55e' },
    '9': { label: 'Đã hủy', cls: 'status-cancelled', dot: '#ef4444' },
    'Cancelled': { label: 'Đã hủy', cls: 'status-cancelled', dot: '#ef4444' },
    '10': { label: 'Chờ thanh toán', cls: 'status-payment', dot: '#ea580c' },
    'PendingPayment': { label: 'Chờ thanh toán', cls: 'status-payment', dot: '#ea580c' },
    '11': { label: 'Đã thanh toán 30%', cls: 'status-payment', dot: '#ea580c' },
    'Paid30': { label: 'Đã thanh toán 30%', cls: 'status-payment', dot: '#ea580c' },
    '12': { label: 'Đã thanh toán 70%', cls: 'status-payment', dot: '#ea580c' },
    'Paid70': { label: 'Đã thanh toán 70%', cls: 'status-payment', dot: '#ea580c' },
    '13': { label: 'Chờ nhập hàng', cls: 'status-prep', dot: '#f59e0b' },
    'PendingImport': { label: 'Chờ nhập hàng', cls: 'status-prep', dot: '#f59e0b' }
  };
  return dict[sStr] || { label: sStr || 'Bản nháp', cls: 'status-default', dot: '#64748b' };
}

function formatShipmentValue(value, currency = 'USD') {
  const num = Number(value || 0);
  const curr = String(currency || 'USD').toUpperCase().trim();
  if (curr === 'VND') {
    return `<div class="val-money val-vnd" title="${num.toLocaleString('vi-VN')} ₫">
      <span>${num.toLocaleString('vi-VN')}</span>
      <span class="val-unit">₫</span>
    </div>`;
  }
  return `<div class="val-money val-usd" title="$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}">
    <span class="val-symbol">$</span>
    <span>${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
  </div>`;
}

function getFilteredShipments() {
  let list = shipmentsList;

  // 1. Filter by quick status tab
  if (currentStatusTab !== 'ALL') {
    list = list.filter(s => {
      const st = String(s.status ?? '').trim();
      if (currentStatusTab === 'DRAFT') return ['Draft', '0'].includes(st);
      if (currentStatusTab === 'PAYMENT') return ['PendingPayment', 'Paid30', 'Paid70', '10', '11', '12'].includes(st);
      if (currentStatusTab === 'TRANSIT') return ['BookingRequested', 'BookingConfirmed', 'InTransit', 'PreparingDocuments', '1', '2', '3', '4'].includes(st);
      if (currentStatusTab === 'ARRIVED') return ['Arrived', 'CustomsProcessing', '5', '6'].includes(st);
      if (currentStatusTab === 'COMPLETED') return ['CustomsCleared', 'WarehouseStored', 'Completed', '7', '8'].includes(st);
      return true;
    });
  }

  // 2. Filter by search query
  const q = (document.getElementById("shipmentSearchInput")?.value || '').toLowerCase().trim();
  if (q) {
    list = list.filter(s => {
      const codeMatch = s.shipmentCode?.toLowerCase().includes(q);
      const partnerMatch = (s.supplierName || s.customerName || '').toLowerCase().includes(q);
      const prodMatch = (s.productNames || []).some(p => p.toLowerCase().includes(q));
      const invMatch = (s.invoiceNumbers || []).some(inv => inv.toLowerCase().includes(q));
      const declMatch = (s.declarationNumbers || []).some(d => d.toLowerCase().includes(q));
      const contMatch = (s.containerNumbers || []).some(c => c.toLowerCase().includes(q));
      return codeMatch || partnerMatch || prodMatch || invMatch || declMatch || contMatch;
    });
  }

  return list;
}

function updateKpiCards(items) {
  const totalCount = items.length;
  const importCount = items.filter(s => s.type === 'Import').length;
  const exportCount = items.filter(s => s.type === 'Export').length;

  let totalKg = 0;
  let totalUsd = 0;
  let totalVnd = 0;
  let usdCount = 0;
  let vndCount = 0;

  items.forEach(s => {
    totalKg += Number(s.totalQuantity || 0);
    const curr = String(s.currency || 'USD').toUpperCase().trim();
    const val = Number(s.totalValue || 0);
    if (curr === 'VND') {
      totalVnd += val;
      vndCount++;
    } else {
      totalUsd += val;
      usdCount++;
    }
  });

  const kpiCountEl = document.getElementById('kpiShipmentCount');
  const kpiCountSubEl = document.getElementById('kpiShipmentSub');
  const kpiQtyEl = document.getElementById('kpiShipmentQty');
  const kpiQtySubEl = document.getElementById('kpiShipmentQtySub');
  const kpiUsdEl = document.getElementById('kpiShipmentUsd');
  const kpiUsdSubEl = document.getElementById('kpiShipmentUsdSub');
  const kpiVndEl = document.getElementById('kpiShipmentVnd');
  const kpiVndSubEl = document.getElementById('kpiShipmentVndSub');

  if (kpiCountEl) kpiCountEl.textContent = `${totalCount} lô`;
  if (kpiCountSubEl) kpiCountSubEl.textContent = `${importCount} Nhập • ${exportCount} Xuất`;
  if (kpiQtyEl) kpiQtyEl.textContent = `${totalKg.toLocaleString('vi-VN')} kg`;
  if (kpiQtySubEl) kpiQtySubEl.textContent = `≈ ${(totalKg / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tấn`;
  if (kpiUsdEl) kpiUsdEl.textContent = `$${totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (kpiUsdSubEl) kpiUsdSubEl.textContent = `${usdCount} lô USD`;
  if (kpiVndEl) kpiVndEl.textContent = `${totalVnd.toLocaleString('vi-VN')} ₫`;
  if (kpiVndSubEl) kpiVndSubEl.textContent = `${vndCount} lô VNĐ`;

  // Update tabs counts
  const counts = {
    ALL: items.length,
    DRAFT: 0,
    PAYMENT: 0,
    TRANSIT: 0,
    ARRIVED: 0,
    COMPLETED: 0
  };

  items.forEach(s => {
    const st = String(s.status ?? '').trim();
    if (['Draft', '0'].includes(st)) counts.DRAFT++;
    else if (['PendingPayment', 'Paid30', 'Paid70', '10', '11', '12'].includes(st)) counts.PAYMENT++;
    else if (['BookingRequested', 'BookingConfirmed', 'InTransit', 'PreparingDocuments', '1', '2', '3', '4'].includes(st)) counts.TRANSIT++;
    else if (['Arrived', 'CustomsProcessing', '5', '6'].includes(st)) counts.ARRIVED++;
    else if (['CustomsCleared', 'WarehouseStored', 'Completed', '7', '8'].includes(st)) counts.COMPLETED++;
  });

  ['ALL', 'DRAFT', 'PAYMENT', 'TRANSIT', 'ARRIVED', 'COMPLETED'].forEach(tab => {
    const el = document.getElementById(`tab-count-${tab}`);
    if (el) el.textContent = counts[tab] || 0;
  });
}

function exportShipmentsToExcel() {
  const items = getFilteredShipments();
  if (!items || items.length === 0) {
    showToast("Không có dữ liệu lô hàng để xuất", "warning");
    return;
  }

  const headers = [
    "Mã Lô Hàng",
    "Loại Hình",
    "Đối Tác",
    "Điều Kiện",
    "Tiền Tệ",
    "Sản Phẩm",
    "Số Lượng (KG)",
    "Invoice",
    "Tờ Khai HQ",
    "Container",
    "ETD",
    "ETA",
    "Tổng Giá Trị",
    "Trạng Thái"
  ];

  const rows = items.map(s => {
    const stMeta = getShipmentStatusMeta(s.status);
    const partnerName = s.supplierName || s.customerName || '';
    const prodNames = (s.productNames && s.productNames.length > 0) ? s.productNames.join('; ') : '';
    const invs = (s.invoiceNumbers && s.invoiceNumbers.length > 0) ? s.invoiceNumbers.join('; ') : '';
    const decls = (s.declarationNumbers && s.declarationNumbers.length > 0) ? s.declarationNumbers.join('; ') : '';
    const conts = (s.containerNumbers && s.containerNumbers.length > 0) ? s.containerNumbers.join('; ') : '';
    const etd = s.bookings?.[0]?.etd ? new Date(s.bookings[0].etd).toLocaleDateString('vi-VN') : '';
    const eta = s.expectedDate ? new Date(s.expectedDate).toLocaleDateString('vi-VN') : '';
    
    return [
      s.shipmentCode || '',
      s.type === 'Export' ? 'Xuất khẩu' : 'Nhập khẩu',
      partnerName,
      s.incoterms || s.deliveryTerm || '',
      s.currency || 'USD',
      prodNames,
      s.totalQuantity || 0,
      invs,
      decls,
      conts,
      etd,
      eta,
      s.totalValue || 0,
      stMeta.label
    ];
  });

  const csvContent = "\uFEFF" + [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(","),
    ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(","))
  ].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const fileName = `Danh_Sach_Lo_Hang_${currentShipmentFilter}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`Đã xuất ${items.length} lô hàng ra file Excel (CSV)!`, "success");
}

export async function renderShipments(container, filterType = 'All') {
  selectedId = null;
  selectedIds.clear();
  currentShipmentFilter = filterType;
  currentStatusTab = 'ALL';

  let title = "Tất Cả Lô Hàng Xuất Nhập Khẩu";
  if (filterType === 'Import') title = "Lô Hàng Nhập Khẩu Sợi";
  if (filterType === 'Export') title = "Lô Hàng Xuất Khẩu Sợi";

  container.innerHTML = `
    <div class="shipments-page-wrapper">

      <!-- Toolbar Card -->
      <div class="shipments-toolbar-card">
        <div class="toolbar-left-actions">
          <button id="btnShipmentAdd" class="misa-btn misa-btn-primary">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Thêm mới
          </button>
          <button id="btnShipmentEdit" class="misa-btn misa-btn-default" disabled>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
            Sửa
          </button>
          <button id="btnShipmentStatus" class="misa-btn misa-btn-default" disabled>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.21l-5.69 5.69"></path></svg>
            Đổi Trạng Thái
          </button>
          <button id="btnShipmentDelete" class="misa-btn misa-btn-default misa-btn-danger" disabled>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            Xóa
          </button>
          <div class="misa-toolbar-divider"></div>
          <button id="btnConfigureColumns" class="misa-btn misa-btn-default" title="Tùy chọn các cột hiển thị trong bảng">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            Tùy chọn cột
          </button>
        </div>
        <div class="toolbar-right-actions">
          <div class="misa-search-box">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="shipmentSearchInput" placeholder="Tìm kiếm...">
          </div>
          <button id="btnExportShipmentsExcel" class="misa-btn misa-btn-default" title="Xuất danh sách lô hàng ra Excel/CSV">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Xuất Excel
          </button>
          <button id="btnShipmentRefresh" class="misa-btn misa-btn-default" title="Nạp lại">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            Nạp lại
          </button>
        </div>
      </div>

      <!-- Status Tabs -->
      <div class="misa-tabs-wrap">
        <div class="misa-tabs" id="shipmentsStatusTabs">
          <button class="misa-tab active" data-tab="ALL">Tất cả <span class="misa-tab-badge" id="tab-count-ALL">0</span></button>
          <button class="misa-tab" data-tab="DRAFT">Bản nháp <span class="misa-tab-badge" id="tab-count-DRAFT">0</span></button>
          <button class="misa-tab" data-tab="PAYMENT">Chờ thanh toán <span class="misa-tab-badge" id="tab-count-PAYMENT">0</span></button>
          <button class="misa-tab" data-tab="TRANSIT">Đang vận chuyển <span class="misa-tab-badge" id="tab-count-TRANSIT">0</span></button>
          <button class="misa-tab" data-tab="ARRIVED">Đã cập cảng / HQ <span class="misa-tab-badge" id="tab-count-ARRIVED">0</span></button>
          <button class="misa-tab" data-tab="COMPLETED">Hoàn tất <span class="misa-tab-badge" id="tab-count-COMPLETED">0</span></button>
        </div>
      </div>

      <!-- Table Card -->
      <div class="shipments-table-card">
        <div class="shipments-table-container">
          <table class="modern-shipment-table" id="shipmentsTable">
            <thead id="shipmentsThead"></thead>
            <tbody id="shipmentsTbody">
              <tr><td colspan="15" style="text-align:center; padding: 32px; color: #64748b;">Đang tải danh sách lô hàng...</td></tr>
            </tbody>
          </table>
        </div>
        <div class="shipments-pagination-bar">
          <div id="shipmentPaginationText">Tổng số: 0 bản ghi</div>
        </div>
      </div>
    </div>
  `;

  setupShipmentEvents();
  await loadShipmentsData(currentShipmentFilter);
}

async function loadShipmentsData(filterType = currentShipmentFilter) {
  try {
    currentShipmentFilter = filterType;
    const res = await api.get("/api/shipments?pageSize=100");
    let items = res.data.items || [];

    if (currentShipmentFilter && currentShipmentFilter !== 'All') {
      items = items.filter(s => s.type?.toLowerCase() === currentShipmentFilter.toLowerCase());
    }
    shipmentsList = items;

    // Giữ trạng thái chọn hàng hoặc reset nếu không còn tồn tại
    for (const id of Array.from(selectedIds)) {
      if (!shipmentsList.some(s => s.id === id)) selectedIds.delete(id);
    }
    selectedId = selectedIds.size === 1 ? Array.from(selectedIds)[0] : null;
    updateShipmentToolbarStates();

    updateKpiCards(shipmentsList);
    renderShipmentsTable(getFilteredShipments());
  } catch (err) {
    // Handled
  }
}

function renderShipmentsTable(items) {
  const thead = document.getElementById("shipmentsThead");
  const tbody = document.getElementById("shipmentsTbody");
  if (!tbody || !thead) return;

  const cols = getActiveColumns();

  // 1. Build Thead (Cố định 2 cột đầu & 1 cột cuối)
  let theadHtml = `<tr>
    <th class="shipment-freeze-1" style="width: 44px; min-width: 44px; max-width: 44px; text-align:center;"><input type="checkbox" id="checkAllShipments" style="cursor:pointer;accent-color:#2563eb"></th>
    <th class="shipment-freeze-2" style="width: 170px; min-width: 170px;">Mã Lô Hàng</th>
  `;
  if (cols.type) theadHtml += `<th style="width: 110px; min-width: 110px;">Loại Hình</th>`;
  if (cols.partner) theadHtml += `<th style="min-width: 170px;">Đối Tác</th>`;
  if (cols.products) theadHtml += `<th style="min-width: 180px;">Sản Phẩm</th>`;
  if (cols.quantity) theadHtml += `<th style="width: 125px; min-width: 125px; text-align:right;">Số Lượng (KG)</th>`;
  if (cols.invoices) theadHtml += `<th style="width: 130px; min-width: 130px;">Invoice</th>`;
  if (cols.declarations) theadHtml += `<th style="width: 145px; min-width: 145px;">Tờ Khai HQ</th>`;
  if (cols.containers) theadHtml += `<th style="width: 120px; min-width: 120px;">Container</th>`;
  if (cols.etd) theadHtml += `<th style="width: 105px; min-width: 105px;">ETD</th>`;
  if (cols.eta) theadHtml += `<th style="width: 105px; min-width: 105px;">ETA</th>`;
  if (cols.value) theadHtml += `<th style="width: 135px; min-width: 135px; text-align:right;">Tổng Giá Trị</th>`;
  if (cols.status) theadHtml += `<th style="width: 140px; min-width: 140px;">Trạng Thái</th>`;
  theadHtml += `<th class="shipment-freeze-actions" style="width: 135px; min-width: 135px; max-width: 135px; text-align:center;">Thao Tác</th></tr>`;
  thead.innerHTML = theadHtml;

  // 2. Build Tbody
  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="15" style="text-align:center; padding: 48px 16px; color: #64748b;">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:.3;margin-bottom:10px"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      <div style="font-weight: 600; font-size: 14px; color: #334155;">Không tìm thấy lô hàng nào phù hợp</div>
      <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Thử thay đổi từ khóa tìm kiếm hoặc chọn tab trạng thái khác</div>
    </td></tr>`;
    const pagText = document.getElementById("shipmentPaginationText");
    if (pagText) pagText.textContent = "Tổng số: 0 bản ghi";
    return;
  }

  tbody.innerHTML = items.map(s => {
    const isVnd = String(s.currency || '').toUpperCase() === 'VND';
    const curr = isVnd ? 'VND' : 'USD';
    const stMeta = getShipmentStatusMeta(s.status);

    // Read latest timeline note
    const tlEntries = (() => {
      try { return JSON.parse(localStorage.getItem(`xnk_timeline_${s.id}`) || '[]'); } catch { return []; }
    })();
    const latestText = tlEntries.length > 0 ? tlEntries[tlEntries.length - 1].text : null;
    const statusLabel = latestText || stMeta.label;
    const statusDisplay = statusLabel.length > 22 ? statusLabel.slice(0, 22) + '…' : statusLabel;

    const partnerName = s.supplierName || s.customerName || '---';
    const incoterm = s.incoterms || s.deliveryTerm || (s.type === 'Export' ? 'FOB' : 'CIF');

    const productText = (s.productNames && s.productNames.length > 0)
      ? s.productNames.join(', ')
      : (s.items?.[0]?.productName || '---');

    // Invoices
    let invoiceHtml = `<span class="doc-empty">---</span>`;
    if (s.invoiceNumbers && s.invoiceNumbers.length > 0) {
      invoiceHtml = s.invoiceNumbers.map(inv => `<span class="doc-pill invoice-pill" title="Invoice: ${inv}">${inv}</span>`).join(' ');
    }

    // Customs Declarations
    let declHtml = `<span class="doc-empty">---</span>`;
    if (s.declarationNumbers && s.declarationNumbers.length > 0) {
      declHtml = s.declarationNumbers.map(d => `<span class="doc-pill decl-pill" title="Tờ khai HQ: ${d}">${d}</span>`).join(' ');
    }

    // Containers
    let contHtml = `<span class="doc-empty">---</span>`;
    if (s.containerNumbers && s.containerNumbers.length > 0) {
      contHtml = s.containerNumbers.map(c => `<span class="doc-pill cont-pill" title="Số Cont: ${c}">${c}</span>`).join(' ');
    }

    // ETD
    const etdText = s.bookings?.[0]?.etd ? new Date(s.bookings[0].etd).toLocaleDateString('vi-VN') : '---';

    // ETA (ngày dự kiến cập cảng - hiển thị đơn giản)
    let etaBadge = `<span class="doc-empty">---</span>`;
    if (s.expectedDate) {
      const etaDate = new Date(s.expectedDate);
      const dateStr = etaDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const diffDays = Math.ceil((etaDate.getTime() - Date.now()) / (1000 * 3600 * 24));
      const hint = diffDays < 0 ? 'Đã cập cảng' : `Còn ${diffDays} ngày`;
      etaBadge = `<span class="eta-plain" title="${hint}">${dateStr}</span>`;
    }

    let rowHtml = `
    <tr data-id="${s.id}" class="shipment-main-row ${selectedIds.has(s.id) ? 'selected' : ''}">
      <!-- Cột 1 cố định: Checkbox -->
      <td class="shipment-freeze-1" style="text-align:center;">
        <input type="checkbox" class="row-checkbox" value="${s.id}" ${selectedIds.has(s.id) ? 'checked' : ''} style="cursor:pointer;accent-color:#2563eb" onclick="event.stopPropagation();">
      </td>

      <!-- Cột 2 cố định: Mã Lô Hàng + Nút Expand -->
      <td class="shipment-freeze-2">
        <div class="shipment-code-cell">
          <span class="expand-btn expand-chevron" id="expand-icon-${s.id}" title="Mở rộng chi tiết lô hàng">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </span>
          <a href="javascript:void(0)" onclick="window.appNavigateTo('shipment-detail', '${s.id}')" class="shipment-code-badge" title="Nhấn để xem toàn bộ hồ sơ chi tiết">
            ${s.shipmentCode}
          </a>
        </div>
      </td>
    `;

    if (cols.type) {
      rowHtml += `<td>${s.type === 'Export' ? 'Xuất khẩu' : 'Nhập khẩu'}</td>`;
    }

    if (cols.partner) {
      const metaParts = [incoterm, curr, s.originCountry].filter(Boolean).map(escapeHtml);
      rowHtml += `<td>
        <div class="partner-cell">
          <div class="partner-name" title="${escapeHtml(partnerName)}">${escapeHtml(partnerName)}</div>
          <div class="partner-meta">${metaParts.join(' · ')}</div>
        </div>
      </td>`;
    }

    if (cols.products) {
      rowHtml += `<td>
        <div class="product-cell" title="${escapeHtml(productText)}">${escapeHtml(productText)}</div>
      </td>`;
    }

    if (cols.quantity) {
      rowHtml += `<td class="qty-cell">
        <span>${Number(s.totalQuantity || 0).toLocaleString('vi-VN')}</span>
        <span class="qty-unit">kg</span>
      </td>`;
    }

    if (cols.invoices) {
      rowHtml += `<td>${invoiceHtml}</td>`;
    }

    if (cols.declarations) {
      rowHtml += `<td>${declHtml}</td>`;
    }

    if (cols.containers) {
      rowHtml += `<td>${contHtml}</td>`;
    }

    if (cols.etd) {
      rowHtml += `<td style="color:#64748b; font-size:12px; font-family:monospace;">${etdText}</td>`;
    }

    if (cols.eta) {
      rowHtml += `<td>${etaBadge}</td>`;
    }

    if (cols.value) {
      rowHtml += `<td style="text-align:right;">${formatShipmentValue(s.totalValue, s.currency)}</td>`;
    }

    if (cols.status) {
      rowHtml += `<td>
        <span class="status-badge ${stMeta.cls}" title="${escapeHtml(statusLabel)}">
          <span class="status-dot" style="background:${stMeta.dot};"></span>
          <span>${escapeHtml(statusDisplay)}</span>
        </span>
      </td>`;
    }

    rowHtml += `
      <td class="shipment-freeze-actions" style="text-align:center;">
        <div class="action-buttons-group">
          <button class="action-btn action-view" title="Xem chi tiết lô hàng" onclick="window.appNavigateTo('shipment-detail', '${s.id}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="action-btn action-edit" title="Sửa lô hàng" onclick="window.xnkEditShipment('${s.id}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
          </button>
          <button class="action-btn action-download" title="Tải tất cả file chứng từ" onclick="window.xnkDownloadAllShipmentDocs('${s.id}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          </button>
          <button class="action-btn action-status" title="Đổi trạng thái lô hàng" onclick="window.xnkStatusShipment('${s.id}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.21l-5.69 5.69"></path></svg>
          </button>
          <button class="action-btn action-delete" title="Xóa lô hàng" onclick="window.xnkDeleteShipment('${s.id}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </td>
    </tr>
    <!-- Hidden Expandable Row -->
    <tr id="expand-row-${s.id}" class="expand-row" style="display:none;">
      <td colspan="15" style="padding: 0;">
        <div class="expand-drawer-container" id="expand-content-${s.id}">
          <div style="text-align:center; padding: 20px; color: #64748b;">Đang tải chi tiết lô hàng...</div>
        </div>
      </td>
    </tr>
    `;
    return rowHtml;
  }).join('');

  document.getElementById("shipmentPaginationText").textContent = `Tổng số: ${items.length} bản ghi`;

  tbody.querySelectorAll(".shipment-main-row").forEach(tr => {
    tr.addEventListener("click", (e) => {
      if (e.target.closest("button") || e.target.closest("a") || e.target.closest(".row-checkbox")) return;
      if (e.target.closest('.expand-btn')) {
        toggleExpandRow(tr.getAttribute("data-id"));
        return;
      }
      selectShipmentRow(tr.getAttribute("data-id"));
    });
  });

  tbody.querySelectorAll(".row-checkbox").forEach(cb => {
    cb.addEventListener("change", function () {
      const id = this.value;
      const tr = this.closest("tr.shipment-main-row");
      if (this.checked) {
        selectedIds.add(id);
        if (tr) tr.classList.add("selected");
      } else {
        selectedIds.delete(id);
        if (tr) tr.classList.remove("selected");
      }
      selectedId = selectedIds.size === 1 ? Array.from(selectedIds)[0] : null;
      updateShipmentToolbarStates();
    });
  });

  const checkAll = document.getElementById("checkAllShipments");
  if (checkAll) {
    checkAll.checked = items.length > 0 && items.every(s => selectedIds.has(s.id));
    checkAll.addEventListener("change", (e) => {
      const isChecked = e.target.checked;
      items.forEach(s => {
        if (isChecked) selectedIds.add(s.id);
        else selectedIds.delete(s.id);
      });
      tbody.querySelectorAll("tr.shipment-main-row").forEach(tr => {
        const id = tr.getAttribute("data-id");
        const on = selectedIds.has(id);
        tr.classList.toggle("selected", on);
        const cb = tr.querySelector(".row-checkbox");
        if (cb) cb.checked = on;
      });
      selectedId = selectedIds.size === 1 ? Array.from(selectedIds)[0] : null;
      updateShipmentToolbarStates();
    });
  }
}

// Live-update cột Trạng Thái khi có entry timeline mới
window.addEventListener('xnk:timeline-updated', (e) => {
  const { shipmentId } = e.detail || {};
  if (!shipmentId) return;
  const mainRow = document.querySelector(`tr[data-id="${shipmentId}"].shipment-main-row`);
  if (!mainRow) return;
  const tlEntries = (() => {
    try { return JSON.parse(localStorage.getItem(`xnk_timeline_${shipmentId}`) || '[]'); } catch { return []; }
  })();
  const latestText = tlEntries.length > 0 ? tlEntries[tlEntries.length - 1].text : null;
  const cells = mainRow.querySelectorAll('td');
  const statusCell = cells[cells.length - 2];
  if (!statusCell || !latestText) return;
  const MAX = 22;
  const display = latestText.length > MAX ? latestText.slice(0, MAX) + '…' : latestText;
  statusCell.innerHTML = `<span class="status-badge status-prep" title="${escapeHtml(latestText)}">
    <span class="status-dot" style="background:#f59e0b;"></span>
    <span>${escapeHtml(display)}</span>
  </span>`;
});

function updateShipmentToolbarStates() {
  const count = selectedIds.size;
  const editBtn = document.getElementById("btnShipmentEdit");
  const statusBtn = document.getElementById("btnShipmentStatus");
  const deleteBtn = document.getElementById("btnShipmentDelete");
  if (editBtn) editBtn.disabled = count !== 1;
  if (statusBtn) statusBtn.disabled = count !== 1;
  if (deleteBtn) deleteBtn.disabled = count === 0;
}

function selectShipmentRow(id) {
  selectedIds.clear();
  if (id) selectedIds.add(id);
  selectedId = id || null;
  const tbody = document.getElementById("shipmentsTbody");
  if (!tbody) return;

  tbody.querySelectorAll("tr.shipment-main-row").forEach(tr => {
    const isCur = tr.getAttribute("data-id") === id;
    tr.classList.toggle("selected", isCur);
    const cb = tr.querySelector(".row-checkbox");
    if (cb) cb.checked = isCur;
  });

  updateShipmentToolbarStates();
}

function setupShipmentEvents() {
  document.getElementById("btnShipmentRefresh")?.addEventListener("click", () => loadShipmentsData(currentShipmentFilter));
  document.getElementById("btnExportShipmentsExcel")?.addEventListener("click", () => exportShipmentsToExcel());
  document.getElementById("btnShipmentAdd")?.addEventListener("click", () => openShipmentForm(null));
  document.getElementById("btnShipmentEdit")?.addEventListener("click", () => {
    if (selectedId) openShipmentForm(selectedId);
  });
  document.getElementById("btnShipmentDelete")?.addEventListener("click", async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 1) {
      deleteShipment(ids[0]);
    } else if (ids.length > 1) {
      const confirmed = await showConfirm({
        title: 'Xóa Lô Hàng',
        message: `Bạn có chắc chắn muốn xóa ${ids.length} lô hàng đã chọn không? Hành động này không thể hoàn tác.`,
        type: 'danger',
        confirmText: '✔ Xóa',
        cancelText: 'Hủy bỏ'
      });
      if (!confirmed) return;
      try {
        for (const id of ids) {
          await api.delete(`/api/shipments/${id}`);
        }
        showToast(`Đã xóa ${ids.length} lô hàng thành công!`, "success");
        selectedIds.clear();
        selectedId = null;
        await loadShipmentsData(currentShipmentFilter);
      } catch (err) {}
    }
  });
  document.getElementById("btnShipmentStatus")?.addEventListener("click", () => {
    if (selectedId) openStatusModal(selectedId);
  });
  document.getElementById("btnConfigureColumns")?.addEventListener("click", () => {
    openColumnConfigModal();
  });

  // Quick Status Tabs
  document.querySelectorAll('#shipmentsStatusTabs .misa-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#shipmentsStatusTabs .misa-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentStatusTab = btn.getAttribute('data-tab') || 'ALL';
      renderShipmentsTable(getFilteredShipments());
    });
  });

  // Real-time table search filtering
  document.getElementById("shipmentSearchInput")?.addEventListener("input", () => {
    renderShipmentsTable(getFilteredShipments());
  });
}

function openColumnConfigModal() {
  const currentCols = getActiveColumns();
  const content = `
    <div style="padding: 10px 0;">
      <p style="font-size: 13px; color: #64748b; margin-bottom: 16px;">
        Chọn các cột nghiệp vụ bạn muốn hiển thị trên danh sách tổng quan lô hàng.
      </p>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; margin-bottom: 20px;">
        ${COLUMN_CONFIG.map(c => `
          <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; padding: 6px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px;">
            <input type="checkbox" id="col-check-${c.id}" ${currentCols[c.id] ? 'checked' : ''} style="accent-color: var(--amis-green);">
            <span style="font-weight: 500; color: #1e293b;">${c.label}</span>
          </label>
        `).join('')}
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #e2e8f0; padding-top: 14px;">
        <button type="button" class="btn btn-default btn-sm" id="btnResetCols">Mặc định</button>
        <div style="display:flex; gap:8px;">
          <button type="button" class="btn btn-default" onclick="closeModal()">Hủy</button>
          <button type="button" class="btn btn-primary" id="btnSaveCols">Lưu thiết lập</button>
        </div>
      </div>
    </div>
  `;

  openModal('Tùy Chọn Cột Hiển Thị Lô Hàng', content);

  document.getElementById('btnResetCols')?.addEventListener('click', () => {
    COLUMN_CONFIG.forEach(c => {
      const el = document.getElementById(`col-check-${c.id}`);
      if (el) el.checked = c.default;
    });
  });

  document.getElementById('btnSaveCols')?.addEventListener('click', () => {
    const updated = {};
    COLUMN_CONFIG.forEach(c => {
      const el = document.getElementById(`col-check-${c.id}`);
      updated[c.id] = el ? el.checked : c.default;
    });
    saveActiveColumns(updated);
    closeModal();
    renderShipmentsTable(shipmentsList);
    showToast("Đã lưu cấu hình cột hiển thị!", "success");
  });
}

// ==================== SHIPMENT FORM ====================
export function openShipmentForm(id) {
  window.appNavigateTo('shipment-form', id);
}
window.xnkEditShipment = openShipmentForm;

// ─── SVG Icons & Timeline Helper for Shipment Form ────────────────────────
const FORM_ICON = {
  ship: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20a2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1"/><path d="M4 18V14l8-4 4 2v6"/><path d="M12 2v6"/><path d="M8 6h8"/></svg>`,
  calendar: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  anchor: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="3"/><line x1="12" y1="8" x2="12" y2="20"/><path d="M5 14l7 6 7-6"/></svg>`,
  building: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M9 3v18"/><path d="M3 9h6"/><path d="M3 15h6"/></svg>`,
  incoterm: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
  barcode: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 5v14"/><path d="M8 5v14"/><path d="M12 5v14"/><path d="M17 5v14"/><path d="M21 5v14"/></svg>`,
  user: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  file: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  check: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
  refresh: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
  trash: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`
};

function addShipmentTimeline(shipmentId, text, by = 'admin') {
  try {
    const key = `xnk_timeline_${shipmentId}`;
    const entries = JSON.parse(localStorage.getItem(key) || '[]');
    entries.push({
      id: Date.now().toString(),
      text: text.trim(),
      ts: new Date().toLocaleString('vi-VN'),
      by
    });
    localStorage.setItem(key, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent('xnk:timeline-updated', { detail: { shipmentId } }));
  } catch (e) {}
}


function generateUniqueShipmentCode() {
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const existingCodes = new Set((shipmentsList || []).map(x => String(x.shipmentCode || '').toUpperCase()));
  for (let attempt = 0; attempt < 50; attempt++) {
    const randNum = Math.floor(100 + Math.random() * 900);
    const candidate = `SHP-${todayStr}-${randNum}`;
    if (!existingCodes.has(candidate.toUpperCase())) return candidate;
  }
  return `SHP-${todayStr}-${Date.now().toString().slice(-4)}`;
}

function renderProductPickerHtml(type, selectedCustName = '') {
  const isImport = type === 'Import';
  if (isImport) {
    return `
      <select id="productPickerSelect" class="sd-form-select" style="min-width:360px; height:32px; font-size:13px;">
        <option value="">-- Chọn sản phẩm nhập khẩu (có sẵn giá mua vào) --</option>
        ${purchasePrices.length > 0 ? `
          <optgroup label="Sản phẩm có bảng giá mua vào (${purchasePrices.length})">
            ${purchasePrices.map(p => {
              const matchedProd = allProducts.find(x => x.id === p.productId || x.sku === p.productSku);
              const hs = matchedProd?.hsCode || '---';
              const origin = p.countryOfOrigin || matchedProd?.countryOfOrigin || '---';
              const nameVi = matchedProd?.nameVi || '';
              const unit = matchedProd?.unit || 'kg';
              const priceFormatted = p.currency === 'VND'
                ? `${Number(p.unitPrice).toLocaleString('vi-VN')} ₫/kg`
                : `$${Number(p.unitPrice).toFixed(2)}/kg`;
              const supTag = p.supplierName ? ` • ${p.supplierName}` : '';
              return `
                <option value="${p.id}" data-type="purchase" data-productid="${p.productId}" data-sku="${escapeHtml(p.productSku)}" data-name="${escapeHtml(p.productName)}" data-namevi="${escapeHtml(nameVi)}" data-hscode="${escapeHtml(hs)}" data-origin="${escapeHtml(origin)}" data-price="${p.unitPrice}" data-curr="${p.currency || 'USD'}" data-rate="25450" data-unit="${escapeHtml(unit)}" data-notes="${escapeHtml(p.notes || '')}">
                  [${escapeHtml(p.productSku)}] ${escapeHtml(p.productName)}${escapeHtml(supTag)} — ${priceFormatted}
                </option>
              `;
            }).join('')}
          </optgroup>
        ` : ''}
        ${allProducts.length > 0 ? `
          <optgroup label="Danh mục sản phẩm khác (${allProducts.length})">
            ${allProducts.map(p => `
              <option value="${p.id}" data-type="product" data-productid="${p.id}" data-sku="${escapeHtml(p.sku)}" data-name="${escapeHtml(p.name)}" data-namevi="${escapeHtml(p.nameVi || '')}" data-hscode="${escapeHtml(p.hsCode || '---')}" data-origin="${escapeHtml(p.countryOfOrigin || '---')}" data-price="" data-curr="" data-rate="25450" data-unit="${escapeHtml(p.unit || 'kg')}">
                [${escapeHtml(p.sku)}] ${escapeHtml(p.name)} (${p.unit || 'kg'})
              </option>
            `).join('')}
          </optgroup>
        ` : ''}
      </select>
    `;
  } else {
    const sortedSales = [...salePrices].sort((a, b) => {
      if (selectedCustName && selectedCustName !== 'Chưa chọn đối tác') {
        const matchA = (a.customerName || '').toLowerCase().includes(selectedCustName.toLowerCase());
        const matchB = (b.customerName || '').toLowerCase().includes(selectedCustName.toLowerCase());
        if (matchA && !matchB) return -1;
        if (!matchA && matchB) return 1;
      }
      return 0;
    });

    return `
      <select id="productPickerSelect" class="sd-form-select" style="min-width:360px; height:32px; font-size:13px;">
        <option value="">-- Chọn sản phẩm xuất khẩu (có sẵn giá bán ra) --</option>
        ${sortedSales.length > 0 ? `
          <optgroup label="Sản phẩm có bảng giá bán ra (${sortedSales.length})">
            ${sortedSales.map(sp => {
              const matchedPur = purchasePrices.find(p => p.id === sp.purchasePriceId);
              const matchedProd = allProducts.find(x => x.id === matchedPur?.productId || x.sku === sp.inputProductSku);
              const hs = matchedProd?.hsCode || '---';
              const nameVi = matchedProd?.nameVi || '';
              const origin = 'Việt Nam';
              const priceFormatted = sp.currency === 'VND'
                ? `${Number(sp.unitPrice).toLocaleString('vi-VN')} ₫/kg`
                : `$${Number(sp.unitPrice).toFixed(2)}/kg`;
              const custTag = sp.customerName ? ` • ${sp.customerName}` : '';
              return `
                <option value="${sp.id}" data-type="sale" data-purchaseid="${sp.purchasePriceId}" data-productid="${matchedProd?.id || ''}" data-sku="${escapeHtml(sp.outputSku)}" data-name="${escapeHtml(sp.outputProductName || sp.outputSku)}" data-namevi="${escapeHtml(nameVi)}" data-hscode="${escapeHtml(hs)}" data-origin="${origin}" data-price="${sp.unitPrice}" data-curr="${sp.currency || 'USD'}" data-rate="${sp.exchangeRate || 25450}" data-unit="kg" data-notes="${escapeHtml(sp.notes || `Gia công từ ${sp.inputProductSku}`)}" data-customer="${escapeHtml(sp.customerName || '')}">
                  [${escapeHtml(sp.outputSku)}] ${escapeHtml(sp.outputProductName || sp.outputSku)}${escapeHtml(custTag)} — ${priceFormatted}
                </option>
              `;
            }).join('')}
          </optgroup>
        ` : ''}
        ${allProducts.length > 0 ? `
          <optgroup label="Danh mục sản phẩm khác (${allProducts.length})">
            ${allProducts.map(p => `
              <option value="${p.id}" data-type="product" data-productid="${p.id}" data-sku="${escapeHtml(p.sku)}" data-name="${escapeHtml(p.name)}" data-namevi="${escapeHtml(p.nameVi || '')}" data-hscode="${escapeHtml(p.hsCode || '---')}" data-origin="Việt Nam" data-price="" data-curr="" data-rate="25450" data-unit="${escapeHtml(p.unit || 'kg')}">
                [${escapeHtml(p.sku)}] ${escapeHtml(p.name)} (${p.unit || 'kg'})
              </option>
            `).join('')}
          </optgroup>
        ` : ''}
      </select>
    `;
  }
}

export async function renderShipmentForm(container, id) {
  let s = null;
  let currentSavedId = id || null;

  if (id) {
    try {
      const res = await api.get(`/api/shipments/${id}`);
      s = res.data;
    } catch (e) {
      s = shipmentsList.find(x => x.id === id) || null;
      if (!s) {
        showToast("Không thể tải thông tin lô hàng", "error");
        return;
      }
    }
  }
  let isEdit = !!s;

  // Load master data song song (kèm danh sách lô hàng nếu chưa nạp để tránh trùng mã)
  const [supRes, cusRes, prodRes, purRes, saleRes, invRes] = await Promise.all([
    api.get("/api/suppliers?pageSize=200"),
    api.get("/api/customers?pageSize=200"),
    api.get("/api/products?pageSize=500"),
    api.get("/api/purchase-prices"),
    api.get("/api/sale-prices"),
    isEdit ? api.get(`/api/invoices?shipmentId=${id}`).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
    (!shipmentsList || shipmentsList.length === 0)
      ? api.get("/api/shipments?pageSize=200").then(r => { shipmentsList = r.data?.items || r.data || []; }).catch(() => {})
      : Promise.resolve()
  ]);

  const suppliers = supRes.data?.items || supRes.data || [];
  const customers = cusRes.data?.items || cusRes.data || [];
  allProducts = prodRes.data?.items || prodRes.data || [];
  purchasePrices = purRes.data || [];
  salePrices = saleRes.data || [];

  const shipmentInvoices = (invRes?.data?.items || invRes?.data || []).filter(
    i => id && String(i.shipmentId || '').toLowerCase() === String(id).toLowerCase()
  );
  let existingBl = shipmentInvoices.find(i => i.type === 'BillOfLading') || null;
  let existingBlMeta = {};
  try {
    if (existingBl?.notes && existingBl.notes.startsWith('{')) {
      existingBlMeta = JSON.parse(existingBl.notes);
    }
  } catch (_) {}

  const autoGenCode = s?.shipmentCode || generateUniqueShipmentCode();

  // Khởi tạo formItems từ dữ liệu cũ nếu edit
  if (isEdit && s.items && s.items.length > 0) {
    formItems = s.items.map(i => {
      const p = allProducts.find(x => x.id === i.productId);
      let pkgs = i.packages || i.numberOfPackages;
      if (!pkgs && i.notes) {
        const m = String(i.notes).match(/(\d+)\s*kiện/i);
        if (m) pkgs = parseInt(m[1]);
        else if (!isNaN(parseInt(i.notes))) pkgs = parseInt(i.notes);
      }
      if (!pkgs && s.items.length === 1 && s.totalPackages) {
        pkgs = s.totalPackages;
      }
      return {
        productId: i.productId,
        productCode: i.sku || i.productCode || p?.sku || '---',
        productName: i.productName || p?.name || '---',
        sku: i.sku || p?.sku || '---',
        hsCode: i.hsCode || p?.hsCode || '5402.47.00',
        origin: i.origin || p?.countryOfOrigin || 'Taiwan',
        unit: i.unit || p?.unit || 'kg',
        quantity: Number(i.quantity || 0),
        packages: Number(pkgs || 0),
        unitPrice: Number(i.unitPrice || 0),
        currency: s?.currency || 'USD',
        netWeight: Number(i.netWeight || i.quantity || 0),
        grossWeight: Number(i.grossWeight || 0),
        notes: i.notes || ''
      };
    });
  } else if (isEdit) {
    try {
      const itemsRes = await api.get(`/api/shipments/${id}/items`);
      const fetched = itemsRes.data?.items || itemsRes.data || [];
      formItems = fetched.map(i => {
        const p = allProducts.find(x => x.id === i.productId);
        let pkgs = i.packages || i.numberOfPackages;
        if (!pkgs && i.notes) {
          const m = String(i.notes).match(/(\d+)\s*kiện/i);
          if (m) pkgs = parseInt(m[1]);
          else if (!isNaN(parseInt(i.notes))) pkgs = parseInt(i.notes);
        }
        if (!pkgs && fetched.length === 1 && s?.totalPackages) {
          pkgs = s.totalPackages;
        }
        return {
          productId: i.productId,
          productCode: i.sku || i.productCode || p?.sku || '---',
          productName: i.productName || p?.name || '---',
          sku: i.sku || p?.sku || '---',
          hsCode: i.hsCode || p?.hsCode || '5402.47.00',
          origin: i.origin || p?.countryOfOrigin || 'Taiwan',
          unit: i.unit || p?.unit || 'kg',
          quantity: Number(i.quantity || 0),
          packages: Number(pkgs || 0),
          unitPrice: Number(i.unitPrice || 0),
          currency: s?.currency || 'USD',
          netWeight: Number(i.netWeight || i.quantity || 0),
          grossWeight: Number(i.grossWeight || 0),
          notes: i.notes || ''
        };
      });
    } catch {
      formItems = [];
    }
  } else {
    formItems = [];
  }

  const currentType = s?.type || (currentShipmentFilter === 'Export' ? 'Export' : 'Import');
  const isEditTitle = isEdit ? 'Chỉnh sửa lô hàng' : 'Thêm mới lô hàng';
  const partnerTitle = s?.supplierName || s?.customerName || 'Chưa chọn đối tác';

  const createdAtVal = s?.createdAt ? s.createdAt.split('T')[0] : new Date().toISOString().split('T')[0];
  const etaVal = s?.expectedDate ? s.expectedDate.split('T')[0] : '';
  const etdVal = s?.etd ? s.etd.split('T')[0] : '';

  let initialPartnerCode = s?.supplierCode || s?.customerCode || '---';
  let initialContact = s?.contactPerson || '';

  const initQty = formItems.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0) || Number(s?.totalQuantity || 0);
  const initGw = formItems.reduce((acc, it) => acc + (Number(it.grossWeight) || 0), 0) || Number(s?.totalGrossWeight || 0);
  const initVal = formItems.reduce((acc, it) => acc + ((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0)), 0) || Number(s?.totalValue || 0);

  container.innerHTML = `
    <div class="sd-page sf-simple-page">
      <!-- BREADCRUMB -->
      <div class="sd-breadcrumb">
        <a href="#" id="form-back-link">Danh sách lô hàng</a>
        <span class="sd-breadcrumb-sep">›</span>
        <span class="sd-breadcrumb-cur">${isEditTitle}</span>
      </div>

      <!-- HEADER -->
      <div class="sd-header">
        <div class="sd-header-row1">
          <div class="sd-title-group" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <label style="font-size:12.5px; color:#6b7280; font-weight:500;">Mã lô hàng *</label>
            <input type="text" id="sCode" class="sd-form-input" style="font-size:14px; font-weight:600; width: 210px; height: 32px; color:#111827;" required value="${escapeHtml(s?.shipmentCode || autoGenCode)}" placeholder="Nhập mã lô hàng">
            <button type="button" id="btnAutoCode" class="misa-btn misa-btn-default" title="Tự động sinh mã lô hàng mới">
              ${FORM_ICON.refresh} Tạo mã
            </button>
          </div>

          <div class="sd-header-actions">
            <button type="button" class="misa-btn misa-btn-default" id="btnCancelShipment">Hủy</button>
            <button type="button" id="btnSaveShipment" class="misa-btn misa-btn-primary">
              ${FORM_ICON.check} Lưu lô hàng
            </button>
          </div>
        </div>
      </div>

      <!-- THÔNG TIN CHUNG -->
      <div class="sd-infobar">
        <div class="sd-field">
          <div class="sd-field-label">Loại hình *</div>
          <select id="sType" class="sd-form-select">
            <option value="Import" ${currentType === 'Import' ? 'selected' : ''}>Nhập khẩu</option>
            <option value="Export" ${currentType === 'Export' ? 'selected' : ''}>Xuất khẩu</option>
          </select>
        </div>

        <div class="sd-field">
          <div class="sd-field-label">Tiền tệ *</div>
          <select id="sCurrency" class="sd-form-select">
            <option value="USD" ${(s?.currency || 'USD') === 'USD' ? 'selected' : ''}>USD</option>
            <option value="VND" ${s?.currency === 'VND' ? 'selected' : ''}>VND</option>
          </select>
        </div>

        <div class="sd-field" id="supplierField" style="${currentType === 'Export' ? 'display:none;' : ''}">
          <div class="sd-field-label">Nhà cung cấp (NCC) *</div>
          <select id="sSupplierId" class="sd-form-select">
            <option value="">-- Chọn nhà cung cấp --</option>
            ${suppliers.map(sup => {
              const code = sup.code || sup.tradeName || sup.taxCode || (sup.id ? 'NCC-' + sup.id.substring(0, 5).toUpperCase() : '');
              const contactParts = [sup.contactPerson || sup.contactName, sup.phone, sup.email].filter(Boolean);
              return `<option value="${sup.id}" data-code="${escapeHtml(code)}" data-name="${escapeHtml(sup.companyName)}" data-contact="${escapeHtml(contactParts[0] || '')}" data-sub="${escapeHtml(contactParts.slice(1).join(' • '))}" ${s?.supplierId === sup.id ? 'selected' : ''}>${escapeHtml(sup.companyName)} (${sup.country || 'VN'})</option>`;
            }).join('')}
          </select>
        </div>

        <div class="sd-field" id="customerField" style="${currentType === 'Import' ? 'display:none;' : ''}">
          <div class="sd-field-label">Khách hàng (KH) *</div>
          <select id="sCustomerId" class="sd-form-select">
            <option value="">-- Chọn khách hàng --</option>
            ${customers.map(c => {
              const code = c.code || c.tradeName || c.taxCode || (c.id ? 'KH-' + c.id.substring(0, 5).toUpperCase() : '');
              const contactParts = [c.contactPerson || c.contactName, c.phone, c.email].filter(Boolean);
              return `<option value="${c.id}" data-code="${escapeHtml(code)}" data-name="${escapeHtml(c.companyName)}" data-contact="${escapeHtml(contactParts[0] || '')}" data-sub="${escapeHtml(contactParts.slice(1).join(' • '))}" ${s?.customerId === c.id ? 'selected' : ''}>${escapeHtml(c.companyName)}</option>`;
            }).join('')}
          </select>
        </div>

        <div class="sd-field">
          <div class="sd-field-label">Mã đối tác</div>
          <input type="text" id="dispPartnerCodeInput" class="sd-form-input" readonly style="background:#f9fafb; color:#6b7280;" value="${escapeHtml(initialPartnerCode)}">
        </div>

        <div class="sd-field">
          <div class="sd-field-label">Người liên hệ</div>
          <input type="text" id="sContactPerson" class="sd-form-input" value="${escapeHtml(initialContact)}" placeholder="Tên / SĐT">
        </div>

        <div class="sd-field">
          <div class="sd-field-label">Incoterm</div>
          <select id="sTerm" class="sd-form-select">
            <option value="CIF" ${(!s || s?.deliveryTerm === 'CIF') ? 'selected' : ''}>CIF</option>
            <option value="FOB" ${s?.deliveryTerm === 'FOB' ? 'selected' : ''}>FOB</option>
            <option value="EXW" ${s?.deliveryTerm === 'EXW' ? 'selected' : ''}>EXW</option>
            <option value="CFR" ${s?.deliveryTerm === 'CFR' ? 'selected' : ''}>CFR</option>
            <option value="DDP" ${s?.deliveryTerm === 'DDP' ? 'selected' : ''}>DDP</option>
            <option value="DAP" ${s?.deliveryTerm === 'DAP' ? 'selected' : ''}>DAP</option>
            <option value="FCA" ${s?.deliveryTerm === 'FCA' ? 'selected' : ''}>FCA</option>
          </select>
        </div>

        <div class="sd-field">
          <div class="sd-field-label">Ngày tạo lập *</div>
          <input type="date" id="sCreatedAt" class="sd-form-input" value="${createdAtVal}">
        </div>

        <div class="sd-field">
          <div class="sd-field-label">Ngày xếp hàng (ETD)</div>
          <input type="date" id="sEtd" class="sd-form-input" value="${etdVal}">
        </div>

        <div class="sd-field">
          <div class="sd-field-label">Ngày dự kiến (ETA)</div>
          <input type="date" id="sExpectedDate" class="sd-form-input" value="${etaVal}">
        </div>

        <div class="sd-field">
          <div class="sd-field-label">Cảng xếp hàng (POL)</div>
          <input type="text" id="sPol" class="sd-form-input" value="${escapeHtml(s?.portOfLoading || (currentType === 'Export' ? 'Cat Lai Port, Ho Chi Minh City' : 'Shanghai Port, China'))}">
        </div>

        <div class="sd-field">
          <div class="sd-field-label">Cảng dỡ hàng (POD)</div>
          <input type="text" id="sPod" class="sd-form-input" value="${escapeHtml(s?.portOfDischarge || (currentType === 'Export' ? 'Tokyo Port, Japan' : 'Cat Lai Port, Ho Chi Minh City'))}">
        </div>

        <div class="sd-field">
          <div class="sd-field-label">Số vận đơn (B/L)</div>
          <input type="text" id="sBlNumber" class="sd-form-input" value="${escapeHtml(existingBl?.invoiceNumber || s?.blNumber || s?.bLNumber || '')}" placeholder="VD: COSU63289104">
        </div>
      </div>

      <!-- NỘI DUNG CHÍNH (TOÀN CHIỀU RỘNG, KHÔNG SIDEBAR) -->
      <div class="sd-content" style="border-right:none;">
        <div class="sd-tabbar">
          <button type="button" class="sd-tab active" data-pane="items">
            Hàng hóa <span class="sd-tab-badge" id="tabItemsBadge">${formItems.length}</span>
          </button>
          <button type="button" class="sd-tab" data-pane="logistics">
            Thông tin vận tải & Container
          </button>
        </div>

        <div class="sd-pane-wrap">
          <!-- TAB 1: HÀNG HÓA -->
          <div class="sd-pane active" id="pane-items">
            <div>
              <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
                <div style="font-size:13px; font-weight:600; color:#111827;">
                  Danh sách hàng hóa <span style="font-weight:400; color:#6b7280;" id="itemsCountText">(${formItems.length})</span>
                </div>
                <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                  <div id="productPickerContainer">
                    ${renderProductPickerHtml(currentType, partnerTitle)}
                  </div>
                  <button type="button" id="btnAddProduct" class="misa-btn misa-btn-primary">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Thêm vào lô
                  </button>
                </div>
              </div>

              <div class="sd-table-wrap" id="shipmentItemsContainer">
                ${renderFormItemsTable()}
              </div>
            </div>

            <!-- Input ẩn phục vụ lưu tổng -->
            <input type="hidden" id="sPackages" value="${s?.totalPackages || ''}">
            <input type="hidden" id="sQty" value="${initQty || ''}">
            <input type="hidden" id="sGrossWeight" value="${initGw || ''}">
            <input type="hidden" id="sValue" value="${initVal || 0}">
          </div>

          <!-- TAB 2: VẬN TẢI & CONTAINER -->
          <div class="sd-pane" id="pane-logistics">
            <div class="sd-overview-grid">
              <div class="sd-card">
                <div class="sd-card-header">
                  <div class="sd-card-header-left">Hãng tàu & Container</div>
                </div>
                <div class="sd-card-body" style="display:grid; grid-template-columns:1fr 1fr; gap:10px 14px; font-size:12.5px;">
                  <div>
                    <label class="sd-field-label">Hãng tàu / Vận tải</label>
                    <input type="text" id="sShippingLine" class="sd-form-input" placeholder="VD: COSCO SHIPPING" value="${escapeHtml(existingBlMeta.shippingLine || '')}">
                  </div>
                  <div>
                    <label class="sd-field-label">Tên tàu / Chuyến (Vessel/Voy)</label>
                    <input type="text" id="sVesselVoyage" class="sd-form-input" placeholder="VD: COSCO PRIDE / 024E" value="${escapeHtml(existingBlMeta.vesselVoyage || '')}">
                  </div>
                  <div>
                    <label class="sd-field-label">Số Container</label>
                    <input type="text" id="sContainerNo" class="sd-form-input" placeholder="VD: TGHU9843210" value="${escapeHtml(existingBlMeta.containerNo || '')}">
                  </div>
                  <div>
                    <label class="sd-field-label">Số Chì (Seal No)</label>
                    <input type="text" id="sSealNo" class="sd-form-input" placeholder="VD: SL-88992" value="${escapeHtml(existingBlMeta.sealNo || '')}">
                  </div>
                </div>
              </div>

              <div class="sd-card">
                <div class="sd-card-header">
                  <div class="sd-card-header-left">Thông tin vận chuyển & Đóng gói</div>
                </div>
                <div class="sd-card-body" style="display:grid; grid-template-columns:1fr 1fr; gap:10px 14px; font-size:12.5px;">
                  <div>
                    <label class="sd-field-label">Phương thức vận tải</label>
                    <select id="sTransportMode" class="sd-form-select">
                      <option value="Sea" selected>Đường biển (FCL/LCL)</option>
                      <option value="Air">Đường hàng không</option>
                      <option value="Road">Đường bộ</option>
                    </select>
                  </div>
                  <div>
                    <label class="sd-field-label">Điều kiện cước phí</label>
                    <select id="sFreightTerm" class="sd-form-select">
                      <option value="Freight Prepaid" ${(!s || s?.deliveryTerm === 'CIF') ? 'selected' : ''}>Freight Prepaid (Trả trước)</option>
                      <option value="Freight Collect" ${s?.deliveryTerm === 'FOB' ? 'selected' : ''}>Freight Collect (Trả sau)</option>
                    </select>
                  </div>
                  <div>
                    <label class="sd-field-label">Đại lý giao nhận (Forwarder)</label>
                    <input type="text" id="sForwarder" class="sd-form-input" placeholder="VD: COSCO LOGISTICS VN" value="${escapeHtml(existingBlMeta.forwarder || '')}">
                  </div>
                  <div>
                    <label class="sd-field-label">Loại bao bì đóng gói</label>
                    <input type="text" id="sPackagingType" class="sd-form-input" placeholder="VD: Carton / Pallet" value="${escapeHtml(existingBlMeta.packagingType || '')}">
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // ─── Event Handlers & Reactivity ──────────────────────────────────────────

  const goBack = () => window.appNavigateTo('shipments');
  document.getElementById("form-back-link")?.addEventListener("click", (e) => { e.preventDefault(); goBack(); });
  document.getElementById("btnCancelShipment")?.addEventListener("click", goBack);

  container.querySelectorAll('.sd-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.sd-tab').forEach(t => t.classList.remove('active'));
      container.querySelectorAll('.sd-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const targetPane = container.querySelector(`#pane-${tab.dataset.pane}`);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  document.getElementById("btnAutoCode")?.addEventListener("click", () => {
    const newCode = generateUniqueShipmentCode();
    const codeInp = document.getElementById("sCode");
    if (codeInp) codeInp.value = newCode;
    showToast(`Đã tạo mã lô hàng mới: ${newCode}`, "info");
  });

  function updateProductPicker(type, custName = '') {
    const pickerEl = document.getElementById("productPickerContainer");
    if (pickerEl) pickerEl.innerHTML = renderProductPickerHtml(type, custName);
  }

  document.getElementById("sType")?.addEventListener("change", function () {
    const type = this.value;
    const supField = document.getElementById("supplierField");
    const cusField = document.getElementById("customerField");

    let currentCust = '';
    if (type === 'Export') {
      const cusSel = document.getElementById("sCustomerId");
      const opt = cusSel?.options[cusSel.selectedIndex];
      currentCust = opt ? (opt.getAttribute("data-name") || '') : '';
    }
    updateProductPicker(type, currentCust);

    if (type === 'Import') {
      supField.style.display = '';
      cusField.style.display = 'none';
      document.getElementById("sPol").value = 'Shanghai Port, China';
      document.getElementById("sPod").value = 'Cat Lai Port, Ho Chi Minh City';
      document.getElementById("sSupplierId")?.dispatchEvent(new Event('change'));
    } else {
      supField.style.display = 'none';
      cusField.style.display = '';
      document.getElementById("sPol").value = 'Cat Lai Port, Ho Chi Minh City';
      document.getElementById("sPod").value = 'Tokyo Port, Japan';
      document.getElementById("sCustomerId")?.dispatchEvent(new Event('change'));
    }
  });

  document.getElementById("sCurrency")?.addEventListener("change", function () {
    refreshFormItemsTable();
    updateCalculations();
  });

  const onPartnerSelect = (e) => {
    const sel = e.target;
    const opt = sel.options[sel.selectedIndex];
    if (opt && opt.value) {
      const code = opt.getAttribute("data-code") || '---';
      const name = opt.getAttribute("data-name") || '---';
      const contact = opt.getAttribute("data-contact") || '';

      const dispCodeInp = document.getElementById("dispPartnerCodeInput");
      if (dispCodeInp) dispCodeInp.value = code;

      const contactInp = document.getElementById("sContactPerson");
      if (contactInp && !contactInp.value) contactInp.value = contact;

      if (document.getElementById("sType")?.value === 'Export') {
        updateProductPicker('Export', name);
      }
    }
  };
  document.getElementById("sSupplierId")?.addEventListener("change", onPartnerSelect);
  document.getElementById("sCustomerId")?.addEventListener("change", onPartnerSelect);

  if (currentType === 'Import') {
    document.getElementById("sSupplierId")?.dispatchEvent(new Event('change'));
  } else {
    document.getElementById("sCustomerId")?.dispatchEvent(new Event('change'));
  }

  document.getElementById("btnAddProduct")?.addEventListener("click", () => {
    const sel = document.getElementById("productPickerSelect");
    const opt = sel?.options[sel.selectedIndex];
    if (!opt || !opt.value) {
      showToast("Vui lòng chọn một sản phẩm từ danh sách", "warning");
      return;
    }

    const dataType = opt.getAttribute("data-type");
    const sku = opt.getAttribute("data-sku") || '---';
    const name = opt.getAttribute("data-name") || '---';
    const nameVi = opt.getAttribute("data-namevi") || '';
    const rawPriceAttr = opt.getAttribute("data-price");
    const itemCurrency = opt.getAttribute("data-curr") || '';
    const origin = opt.getAttribute("data-origin") || (document.getElementById("sType")?.value === 'Export' ? 'Việt Nam' : '---');
    const unit = opt.getAttribute("data-unit") || 'kg';
    const hsCode = opt.getAttribute("data-hscode") || '---';
    const notes = opt.getAttribute("data-notes") || '';
    const exRate = parseFloat(opt.getAttribute("data-rate")) || 25450;
    let prodId = opt.getAttribute("data-productid");

    if (dataType === 'sale') {
      const purchaseId = opt.getAttribute("data-purchaseid");
      const matchedPur = purchasePrices.find(p => p.id === purchaseId);
      prodId = prodId || matchedPur?.productId || allProducts[0]?.id;
    }

    const already = formItems.find(i => (i.productCode === sku || i.sku === sku));
    if (already) {
      showToast(`Mã sản phẩm [${sku}] đã có trong danh sách lô hàng`, "warning");
      return;
    }

    const curInp = document.getElementById("sCurrency");
    let shipmentCurrency = curInp?.value || 'USD';

    let unitPrice = '';
    const hasPrice = rawPriceAttr !== null && rawPriceAttr !== '' && !isNaN(parseFloat(rawPriceAttr)) && parseFloat(rawPriceAttr) > 0;

    if (hasPrice) {
      const rawPrice = parseFloat(rawPriceAttr);
      if (formItems.length === 0 && itemCurrency && curInp) {
        shipmentCurrency = itemCurrency;
        curInp.value = itemCurrency;
      }

      if (itemCurrency && shipmentCurrency && itemCurrency !== shipmentCurrency) {
        if (shipmentCurrency === 'VND' && itemCurrency === 'USD') {
          unitPrice = Math.round(rawPrice * exRate);
        } else if (shipmentCurrency === 'USD' && itemCurrency === 'VND') {
          unitPrice = +(rawPrice / exRate).toFixed(4);
        } else {
          unitPrice = rawPrice;
        }
      } else {
        unitPrice = rawPrice;
      }
    }

    formItems.push({
      productId: prodId || allProducts[0]?.id,
      productCode: sku,
      productName: name,
      nameVi: nameVi,
      sku: sku,
      hsCode: hsCode,
      origin: origin,
      unit: unit,
      quantity: '',
      packages: '',
      unitPrice: unitPrice,
      currency: shipmentCurrency,
      netWeight: '',
      grossWeight: '',
      notes: notes
    });

    sel.value = "";
    refreshFormItemsTable();
    updateCalculations();
  });

  document.getElementById("shipmentItemsContainer")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-remove-item");
    if (btn) {
      const idx = parseInt(btn.getAttribute("data-idx"));
      formItems.splice(idx, 1);
      refreshFormItemsTable();
      updateCalculations();
      return;
    }

    const btnBlank = e.target.closest("#btnQuickAddBlank");
    if (btnBlank) {
      const defProd = allProducts[0];
      const isExport = document.getElementById("sType")?.value === 'Export';
      formItems.push({
        productId: defProd?.id || `custom-${Date.now()}`,
        productCode: '',
        productName: '',
        nameVi: '',
        sku: '',
        hsCode: '',
        origin: isExport ? 'Việt Nam' : '',
        unit: 'kg',
        quantity: '',
        packages: '',
        unitPrice: '',
        currency: document.getElementById("sCurrency")?.value || 'USD',
        netWeight: '',
        grossWeight: '',
        notes: ''
      });
      refreshFormItemsTable();
      updateCalculations();
    }
  });

  document.getElementById("shipmentItemsContainer")?.addEventListener("input", (e) => {
    const inp = e.target;
    const idx = parseInt(inp.getAttribute("data-idx"));
    if (isNaN(idx) || !formItems[idx]) return;

    if (inp.classList.contains("item-qty")) {
      const val = inp.value.trim() === '' ? '' : parseFloat(inp.value);
      formItems[idx].quantity = val;
      formItems[idx].netWeight = val;
    }
    if (inp.classList.contains("item-packages")) {
      formItems[idx].packages = inp.value.trim() === '' ? '' : parseInt(inp.value);
    }
    if (inp.classList.contains("item-price")) {
      formItems[idx].unitPrice = inp.value.trim() === '' ? '' : parseFloat(inp.value);
    }
    if (inp.classList.contains("item-gw")) {
      formItems[idx].grossWeight = inp.value.trim() === '' ? '' : parseFloat(inp.value);
    }

    updateCalculations();
  });

  // Lưu lô hàng
  let isSavingShipment = false;
  document.getElementById("btnSaveShipment")?.addEventListener("click", async () => {
    if (isSavingShipment) return;

    const codeInp = document.getElementById("sCode");
    let shipmentCode = codeInp?.value.trim();
    if (!shipmentCode) {
      showToast("Vui lòng nhập Mã lô hàng", "error");
      codeInp?.focus();
      return;
    }

    const sType = document.getElementById("sType")?.value || 'Import';
    const supplierId = document.getElementById("sSupplierId")?.value || null;
    const customerId = document.getElementById("sCustomerId")?.value || null;

    if (sType === 'Import' && !supplierId) {
      showToast("Vui lòng chọn Nhà cung cấp (NCC)", "error");
      return;
    }
    if (sType === 'Export' && !customerId) {
      showToast("Vui lòng chọn Khách hàng (KH)", "error");
      return;
    }

    const contactPerson = document.getElementById("sContactPerson")?.value.trim() || 'admin';
    const totalQty = parseFloat(document.getElementById("sQty")?.value) || formItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
    const totalGw = parseFloat(document.getElementById("sGrossWeight")?.value) || formItems.reduce((sum, i) => sum + (Number(i.grossWeight) || 0), 0);
    const totalVal = parseFloat(document.getElementById("sValue")?.value) || formItems.reduce((sum, i) => sum + ((Number(i.quantity) || 0) * (Number(i.unitPrice) || 0)), 0);

    const buildPayload = (code) => ({
      shipmentCode: code,
      type: sType,
      expectedDate: document.getElementById("sExpectedDate")?.value ? new Date(document.getElementById("sExpectedDate").value).toISOString() : null,
      createdAt: document.getElementById("sCreatedAt")?.value ? new Date(document.getElementById("sCreatedAt").value).toISOString() : null,
      supplierId: sType === 'Import' ? supplierId : null,
      customerId: sType === 'Export' ? customerId : null,
      portOfLoading: document.getElementById("sPol")?.value.trim() || null,
      portOfDischarge: document.getElementById("sPod")?.value.trim() || null,
      deliveryTerm: document.getElementById("sTerm")?.value || 'CIF',
      contactPerson,
      totalQuantity: totalQty,
      totalGrossWeight: totalGw,
      totalValue: totalVal,
      currency: document.getElementById("sCurrency")?.value || "USD",
      notes: s?.notes || null
    });

    isSavingShipment = true;
    try {
      let savedId = currentSavedId;
      let payload = buildPayload(shipmentCode);

      if (isEdit && savedId) {
        await api.put(`/api/shipments/${savedId}`, payload);
        showToast("Cập nhật lô hàng thành công!", "success");
      } else {
        try {
          const createRes = await api.post("/api/shipments", payload);
          savedId = createRes.data?.id || createRes.data?.data?.id;
        } catch (createErr) {
          // Nếu mã tự sinh bị trùng trong CSDL (kể cả bản ghi đã xóa mềm), tự động đổi sang mã mới và lưu lại
          if (String(createErr?.message || '').includes('tồn tại')) {
            shipmentCode = `${shipmentCode}-${Math.floor(10 + Math.random() * 90)}`;
            if (codeInp) codeInp.value = shipmentCode;
            payload = buildPayload(shipmentCode);
            const retryRes = await api.post("/api/shipments", payload);
            savedId = retryRes.data?.id || retryRes.data?.data?.id;
          } else {
            throw createErr;
          }
        }
        currentSavedId = savedId;
        isEdit = true;
        showToast("Tạo mới lô hàng thành công!", "success");
      }

      // Lưu chi tiết hàng hóa (ép kiểu số hợp lệ, tránh gửi chuỗi rỗng "" gây lỗi 400 ở backend)
      if (savedId && formItems.length > 0) {
        const itemsPayload = {
          items: formItems.map(i => {
            const pk = Number(i.packages) || 0;
            const pkgsText = pk > 0 ? `${pk} kiện` : '';
            let noteContent = i.notes || '';
            if (pkgsText && !noteContent.includes('kiện')) {
              noteContent = noteContent ? `${pkgsText} - ${noteContent}` : pkgsText;
            }
            const resolvedProdId = (i.productId && !String(i.productId).startsWith('custom-'))
              ? i.productId
              : (allProducts.find(p => p.sku === i.sku || p.sku === i.productCode)?.id || allProducts[0]?.id);
            const qtyNum = Number(i.quantity) || 0;
            const gwNum = Number(i.grossWeight) || qtyNum;
            const priceNum = Number(i.unitPrice) || 0;
            return {
              productId: resolvedProdId,
              quantity: qtyNum,
              netWeight: Number(i.netWeight) || qtyNum,
              grossWeight: gwNum,
              unitPrice: priceNum,
              notes: noteContent || null
            };
          })
        };
        await api.post(`/api/shipments/${savedId}/items`, itemsPayload);
      } else if (savedId && formItems.length === 0 && isEdit) {
        await api.post(`/api/shipments/${savedId}/items`, { items: [] });
      }

      const blNum = document.getElementById("sBlNumber")?.value.trim();
      if (savedId && blNum) {
        const blPayload = {
          invoiceNumber: blNum,
          type: 'BillOfLading',
          shipmentId: savedId,
          supplierId: sType === 'Import' ? supplierId : null,
          customerId: sType === 'Export' ? customerId : null,
          invoiceDate: existingBl?.invoiceDate || new Date().toISOString(),
          totalAmount: 0,
          currency: 'USD',
          paymentTerms: document.getElementById("sFreightTerm")?.value || (payload.deliveryTerm === 'CIF' ? 'Freight Prepaid' : 'Freight Collect'),
          notes: JSON.stringify({
            shippingLine: document.getElementById("sShippingLine")?.value.trim() || '',
            vesselVoyage: document.getElementById("sVesselVoyage")?.value.trim() || '',
            containerNo: document.getElementById("sContainerNo")?.value.trim() || '',
            sealNo: document.getElementById("sSealNo")?.value.trim() || '',
            forwarder: document.getElementById("sForwarder")?.value.trim() || '',
            packagingType: document.getElementById("sPackagingType")?.value.trim() || '',
            packages: parseFloat(document.getElementById("sPackages")?.value) || 0,
            grossWeight: totalGw,
            pol: payload.portOfLoading,
            pod: payload.portOfDischarge,
            status: existingBlMeta.status || 'Original'
          })
        };
        try {
          if (existingBl?.id) {
            await api.put(`/api/invoices/${existingBl.id}`, blPayload);
          } else {
            const blCreated = await api.post('/api/invoices', blPayload);
            if (blCreated?.data) existingBl = blCreated.data;
          }
        } catch (_) {}
      }

      window.appNavigateTo('shipment-detail', savedId);
    } catch (err) {
      // request() trong api.js đã hiện toast lỗi, không gọi trùng lần 2
    } finally {
      isSavingShipment = false;
    }
  });

  updateCalculations();
}

// ==================== HELPERS FOR ITEMS TABLE ====================

function renderFormItemsTable() {
  if (formItems.length === 0) {
    return `
      <div style="text-align: center; padding: 28px 16px; color: #6b7280; font-size: 13px; border: 1px dashed #d1d5db; background:#fff;">
        Chưa có sản phẩm nào trong lô hàng. Chọn sản phẩm ở trên rồi bấm <strong>Thêm vào lô</strong>.
      </div>
    `;
  }

  const currentCurrency = document.getElementById("sCurrency")?.value || (formItems[0]?.currency) || 'USD';
  const isVnd = currentCurrency === 'VND';
  const currSymbol = isVnd ? '₫' : '$';

  let totalQty = 0;
  let totalPackages = 0;
  let totalGw = 0;
  let totalVal = 0;

  formItems.forEach(i => {
    const q = (i.quantity !== '' && i.quantity !== null && !isNaN(i.quantity)) ? parseFloat(i.quantity) : 0;
    const pk = (i.packages !== '' && i.packages !== null && !isNaN(i.packages)) ? parseInt(i.packages) : 0;
    const gw = (i.grossWeight !== '' && i.grossWeight !== null && !isNaN(i.grossWeight)) ? parseFloat(i.grossWeight) : 0;
    const p = (i.unitPrice !== '' && i.unitPrice !== null && !isNaN(i.unitPrice)) ? parseFloat(i.unitPrice) : 0;

    totalQty += q;
    totalPackages += pk;
    totalGw += gw;
    if (q > 0 && p > 0) totalVal += (q * p);
  });

  return `
    <table class="sd-table">
      <thead>
        <tr>
          <th style="width:36px; text-align:center;">#</th>
          <th style="width:115px;">Mã hàng</th>
          <th>Tên hàng</th>
          <th style="width:95px;">HS Code</th>
          <th style="width:85px;">Xuất xứ</th>
          <th style="width:55px; text-align:center;">ĐVT</th>
          <th style="width:115px; text-align:right;">Số lượng (NW)</th>
          <th style="width:90px; text-align:right;">Số kiện</th>
          <th style="width:115px; text-align:right;">Đơn giá (${currSymbol})</th>
          <th style="width:130px; text-align:right;">Thành tiền (${currSymbol})</th>
          <th style="width:115px; text-align:right;">Gross Weight (kg)</th>
          <th style="width:50px; text-align:center;">Xóa</th>
        </tr>
      </thead>
      <tbody>
        ${formItems.map((item, idx) => {
          const hasQ = item.quantity !== '' && item.quantity !== null && !isNaN(item.quantity);
          const hasP = item.unitPrice !== '' && item.unitPrice !== null && !isNaN(item.unitPrice);
          const q = hasQ ? parseFloat(item.quantity) : 0;
          const p = hasP ? parseFloat(item.unitPrice) : 0;
          const hasVal = hasQ && hasP && (q * p > 0);
          const rowVal = hasVal ? (q * p) : 0;
          const rowValFormatted = hasVal
            ? (isVnd ? `${Math.round(rowVal).toLocaleString('vi-VN')} ₫` : `$${rowVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
            : '—';

          return `
            <tr>
              <td style="text-align:center; color:#6b7280;">${idx + 1}</td>
              <td>${escapeHtml(item.productCode || item.sku || '—')}</td>
              <td>
                <div>${escapeHtml(item.productName || '—')}</div>
                ${item.nameVi && item.nameVi !== item.productName ? `<div style="font-size:11.5px; color:#6b7280; margin-top:1px;">${escapeHtml(item.nameVi)}</div>` : ''}
              </td>
              <td>${escapeHtml(item.hsCode || '—')}</td>
              <td>${escapeHtml(item.origin || '—')}</td>
              <td style="text-align:center;">${escapeHtml(item.unit || 'kg')}</td>
              <td style="text-align:right;">
                <input type="number" step="0.01" min="0" class="sd-table-input text-right item-qty" data-idx="${idx}" value="${item.quantity !== '' && item.quantity !== null && item.quantity !== undefined ? item.quantity : ''}" placeholder="0" style="width:95px;">
              </td>
              <td style="text-align:right;">
                <input type="number" step="1" min="0" class="sd-table-input text-right item-packages" data-idx="${idx}" value="${item.packages !== '' && item.packages !== null && item.packages !== undefined ? item.packages : ''}" placeholder="0" style="width:75px;">
              </td>
              <td style="text-align:right;">
                <input type="number" step="${isVnd ? '100' : '0.0001'}" min="0" class="sd-table-input text-right item-price" data-idx="${idx}" value="${item.unitPrice !== '' && item.unitPrice !== null && item.unitPrice !== undefined ? item.unitPrice : ''}" placeholder="0" style="width:95px;">
              </td>
              <td style="text-align:right; font-variant-numeric:tabular-nums;">
                <span id="item-total-${idx}">${rowValFormatted}</span>
              </td>
              <td style="text-align:right;">
                <input type="number" step="0.01" min="0" class="sd-table-input text-right item-gw" data-idx="${idx}" value="${item.grossWeight !== '' && item.grossWeight !== null && item.grossWeight !== undefined ? item.grossWeight : ''}" placeholder="0" style="width:95px;">
              </td>
              <td style="text-align:center;">
                <button type="button" class="btn-remove-item" data-idx="${idx}" title="Xóa dòng sản phẩm" style="background:transparent; border:none; cursor:pointer; color:#6b7280; padding:4px; border-radius:3px; display:inline-flex; align-items:center;">
                  ${FORM_ICON.trash}
                </button>
              </td>
            </tr>
          `;
        }).join('')}
        <tr class="sd-total-row">
          <td colspan="6" style="text-align:right;">Tổng cộng (${formItems.length} dòng):</td>
          <td style="text-align:right;" id="tblTotalQty">${totalQty > 0 ? `${totalQty.toLocaleString('vi-VN')} kg` : '0 kg'}</td>
          <td style="text-align:right;" id="tblTotalPackages">${totalPackages > 0 ? `${totalPackages.toLocaleString('vi-VN')} kiện` : '0 kiện'}</td>
          <td></td>
          <td style="text-align:right;" id="tblTotalVal">${isVnd ? `${Math.round(totalVal).toLocaleString('vi-VN')} ₫` : `$${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
          <td style="text-align:right;" id="tblTotalGw">${totalGw > 0 ? `${totalGw.toLocaleString('vi-VN')} kg` : '0 kg'}</td>
          <td></td>
        </tr>
      </tbody>
    </table>
    <div class="sd-table-toolbar">
      <div class="sd-table-toolbar-left">
        <button type="button" class="misa-btn misa-btn-default" id="btnQuickAddBlank">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Thêm dòng trống
        </button>
      </div>
    </div>
  `;
}

function refreshFormItemsTable() {
  const container = document.getElementById("shipmentItemsContainer");
  if (container) container.innerHTML = renderFormItemsTable();
}

function updateCalculations() {
  const currentCurrency = document.getElementById("sCurrency")?.value || (formItems[0]?.currency) || 'USD';
  const isVnd = currentCurrency === 'VND';

  let totalQty = 0;
  let totalPackages = 0;
  let totalGw = 0;
  let totalVal = 0;

  formItems.forEach((item, idx) => {
    const hasQ = item.quantity !== '' && item.quantity !== null && !isNaN(item.quantity);
    const hasP = item.unitPrice !== '' && item.unitPrice !== null && !isNaN(item.unitPrice);
    const q = hasQ ? parseFloat(item.quantity) : 0;
    const pk = (item.packages !== '' && item.packages !== null && !isNaN(item.packages)) ? parseInt(item.packages) : 0;
    const p = hasP ? parseFloat(item.unitPrice) : 0;
    const gw = (item.grossWeight !== '' && item.grossWeight !== null && !isNaN(item.grossWeight)) ? parseFloat(item.grossWeight) : 0;
    const hasVal = hasQ && hasP && (q * p > 0);
    const rowVal = hasVal ? (q * p) : 0;

    totalQty += q;
    totalPackages += pk;
    totalGw += gw;
    totalVal += rowVal;

    const rowValEl = document.getElementById(`item-total-${idx}`);
    if (rowValEl) {
      if (hasVal) {
        rowValEl.textContent = isVnd
          ? `${Math.round(rowVal).toLocaleString('vi-VN')} ₫`
          : `$${rowVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      } else {
        rowValEl.textContent = '—';
      }
    }
  });

  const tblQty = document.getElementById('tblTotalQty');
  const tblPackages = document.getElementById('tblTotalPackages');
  const tblVal = document.getElementById('tblTotalVal');
  const tblGw = document.getElementById('tblTotalGw');
  if (tblQty) tblQty.textContent = totalQty > 0 ? `${totalQty.toLocaleString('vi-VN')} kg` : '0 kg';
  if (tblPackages) tblPackages.textContent = totalPackages > 0 ? `${totalPackages.toLocaleString('vi-VN')} kiện` : '0 kiện';
  if (tblVal) tblVal.textContent = isVnd
    ? `${Math.round(totalVal).toLocaleString('vi-VN')} ₫`
    : `$${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (tblGw) tblGw.textContent = totalGw > 0 ? `${totalGw.toLocaleString('vi-VN')} kg` : '0 kg';

  const tabBadge = document.getElementById('tabItemsBadge');
  const itemsCountText = document.getElementById('itemsCountText');
  if (tabBadge) tabBadge.textContent = formItems.length;
  if (itemsCountText) itemsCountText.textContent = `(${formItems.length})`;

  const sQty = document.getElementById('sQty');
  const sPackages = document.getElementById('sPackages');
  const sGw = document.getElementById('sGrossWeight');
  const sVal = document.getElementById('sValue');
  if (sQty) sQty.value = totalQty > 0 ? totalQty : '';
  if (sPackages) sPackages.value = totalPackages > 0 ? totalPackages : '';
  if (sGw) sGw.value = totalGw > 0 ? totalGw : '';
  if (sVal) sVal.value = totalVal > 0 ? totalVal : '';
}


// ==================== STATUS MODAL ====================
window.xnkStatusShipment = openStatusModal;
async function openStatusModal(id) {
  let s = shipmentsList.find(x => x.id === id);
  if (!s) {
    try {
      s = (await api.get(`/api/shipments/${id}`)).data;
    } catch (e) {
      showToast("Lỗi khi tải thông tin lô hàng", "error"); return;
    }
  }

  window.openModal();

  const title = document.getElementById("modalTitle");
  const tabs = document.getElementById("modalTabs");
  const body = document.getElementById("modalBody");
  const footer = document.getElementById("modalFooter");

  if (tabs) tabs.style.display = "none";
  title.innerHTML = `🔄 Chuyển Trạng Thái: <strong>${escapeHtml(s.shipmentCode)}</strong>`;

  body.innerHTML = `
    <div style="padding: 10px 0;">
      <label class="form-label required" style="font-weight: 600; font-size: 13px; margin-bottom: 6px; display:block;">Chọn Trạng Thái Nghiệp Vụ</label>
      <select id="newStatusSelect" class="form-select" style="font-size: 13.5px; padding: 8px 10px; width: 100%;">
        <optgroup label="Quy trình Vận tải & Logistics">
          <option value="Draft">Bản nháp (Draft)</option>
          <option value="PreparingDocuments">Chuẩn bị chứng từ</option>
          <option value="BookingRequested">Yêu cầu Booking hãng tàu</option>
          <option value="BookingConfirmed">Đã xác nhận Booking</option>
          <option value="InTransit">Đang vận chuyển trên biển</option>
          <option value="Arrived">Đã cập cảng đích</option>
          <option value="CustomsProcessing">Đang làm thủ tục hải quan</option>
          <option value="CustomsCleared">Đã thông quan hải quan</option>
          <option value="Completed">Đã hoàn thành / Nhập kho</option>
        </optgroup>
        <optgroup label="Thanh toán & Nghiệp vụ kế toán">
          <option value="PendingPayment">Chờ thanh toán</option>
          <option value="Paid30">Đã thanh toán 30%</option>
          <option value="Paid70">Đã thanh toán 70%</option>
          <option value="PendingImport">Chờ nhập hàng</option>
        </optgroup>
        <optgroup label="Trạng thái khác">
          <option value="Cancelled">Đã hủy</option>
        </optgroup>
      </select>
    </div>
  `;

  footer.innerHTML = `
    <button type="button" class="btn btn-default" onclick="window.closeModal()">Hủy</button>
    <button type="button" id="btnUpdateStatusConfirm" class="btn btn-primary">Xác nhận cập nhật</button>
  `;

  document.getElementById("newStatusSelect").value = s.status;

  document.getElementById("btnUpdateStatusConfirm").onclick = async () => {
    const select = document.getElementById("newStatusSelect");
    const newStatus = select.value;
    try {
      await api.patch(`/api/shipments/${id}/status`, { status: newStatus });

      const statusText = select.options[select.selectedIndex].text;
      const currentUser = (() => { try { return JSON.parse(localStorage.getItem('xnk_user') || '{}').username || 'admin'; } catch { return 'admin'; } })();
      const entries = (() => { try { return JSON.parse(localStorage.getItem('xnk_timeline_' + id) || '[]'); } catch { return []; } })();
      entries.push({ id: Date.now().toString(), text: statusText, ts: new Date().toLocaleString('vi-VN'), by: currentUser });
      localStorage.setItem('xnk_timeline_' + id, JSON.stringify(entries));

      showToast("Cập nhật trạng thái lô hàng thành công!");
      window.closeModal();
      await loadShipmentsData(currentShipmentFilter);
    } catch (err) {
      // Handled
    }
  };
}

window.xnkDeleteShipment = deleteShipment;
async function deleteShipment(id) {
  const s = shipmentsList.find(x => x.id === id);
  const confirmed = await showConfirm({
    title: 'Xóa Lô Hàng',
    message: 'Bạn có chắc chắn muốn xóa lô hàng này không? Hành động này không thể hoàn tác.',
    highlight: s?.shipmentCode || id,
    type: 'danger',
    confirmText: '✔ Xóa',
    cancelText: 'Hủy bỏ'
  });
  if (!confirmed) return;

  try {
    await api.delete(`/api/shipments/${id}`);
    showToast("Đã xóa lô hàng thành công!", "success", `Xóa ${s?.shipmentCode || ''}`);
    selectedIds.delete(id);
    selectedId = null;
    await loadShipmentsData(currentShipmentFilter);
  } catch (err) {
    // Handled
  }
}

// -------------------------------------------------------------
// EXPANDABLE ROW LOGIC
// -------------------------------------------------------------
async function toggleExpandRow(id) {
  const tr = document.querySelector(`.shipment-main-row[data-id="${id}"]`);
  const expandRow = document.getElementById(`expand-row-${id}`);
  const contentDiv = document.getElementById(`expand-content-${id}`);
  const icon = document.getElementById(`expand-icon-${id}`);

  if (!expandRow || !tr || !icon) return;

  const isExpanded = expandRow.style.display !== 'none';

  if (isExpanded) {
    expandRow.style.display = 'none';
    icon.classList.remove('rotated');
  } else {
    expandRow.style.display = 'table-row';
    icon.classList.add('rotated');

    // Check if already loaded
    if (!contentDiv.classList.contains('loaded')) {
      contentDiv.innerHTML = '<div style="text-align:center; padding: 20px; color: #64748b;">Đang tải chi tiết lô hàng...</div>';
      try {
        const res = await api.get(`/api/shipments/${id}`);
        const shipment = res.data;
        renderExpandContent(contentDiv, shipment);
        contentDiv.classList.add('loaded');
      } catch (err) {
        contentDiv.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--amis-red);">Lỗi khi tải chi tiết lô hàng.</div>';
      }
    }
  }
}

function renderExpandContent(container, data) {
  const curr = String(data.currency || 'USD').toUpperCase().trim();
  const isVnd = curr === 'VND';
  const fmtMoney = (v) => isVnd
    ? `${Number(v || 0).toLocaleString('vi-VN')} ₫`
    : `$${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtNum = (v) => Number(v || 0).toLocaleString('vi-VN', { maximumFractionDigits: 3 });

  const rawItems = data.items || [];

  // Chuẩn hóa số kiện (giống logic trang chi tiết lô hàng)
  const items = rawItems.map(it => {
    let pkgs = it.packages || it.numberOfPackages;
    if (!pkgs && it.notes) {
      const m = String(it.notes).match(/(\d+)\s*kiện/i);
      if (m) pkgs = parseInt(m[1]);
      else if (!isNaN(parseInt(it.notes))) pkgs = parseInt(it.notes);
    }
    if (!pkgs && rawItems.length === 1 && data.totalPackages) pkgs = data.totalPackages;
    const qty = Number(it.quantity || 0);
    const total = Number(it.totalValue || (qty * Number(it.unitPrice || 0)) || 0);
    return { ...it, packages: Number(pkgs || 0), quantity: qty, totalValue: total };
  });

  const sumPkgs = items.reduce((s, i) => s + i.packages, 0);
  const sumQty = items.reduce((s, i) => s + i.quantity, 0);
  const sumVal = items.reduce((s, i) => s + i.totalValue, 0);

  // Thông tin chính: B/L, Tờ khai, ETA
  const blNumber = data.blNumber || data.bLNumber || data.BLNumber || '';
  const decls = (data.customsDeclarations || []).map(c => c.declarationNumber).filter(Boolean);
  const declText = decls.length > 0 ? decls.map(escapeHtml).join(', ') : ((data.declarationNumbers || []).map(escapeHtml).join(', '));
  const etaText = data.expectedDate ? new Date(data.expectedDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  const dash = '<span class="xp-muted">—</span>';

  let productsHtml = '<div class="xp-muted" style="padding: 8px 0;">Chưa có hàng hóa.</div>';
  if (items.length > 0) {
    productsHtml = `
      <table class="xp-table">
        <thead>
          <tr>
            <th style="width:150px;">Mã hàng</th>
            <th>Tên hàng</th>
            <th style="width:60px;">ĐVT</th>
            <th style="width:90px; text-align:right;">Số kiện</th>
            <th style="width:120px; text-align:right;">Số lượng</th>
            <th style="width:110px; text-align:right;">Đơn giá</th>
            <th style="width:130px; text-align:right;">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(i => `
            <tr>
              <td>${escapeHtml(i.sku || '-')}</td>
              <td>${escapeHtml(i.productName || '-')}</td>
              <td>${escapeHtml(i.unit || 'kg')}</td>
              <td class="xp-num">${i.packages ? fmtNum(i.packages) : dash}</td>
              <td class="xp-num">${fmtNum(i.quantity)}</td>
              <td class="xp-num">${fmtMoney(i.unitPrice)}</td>
              <td class="xp-num">${fmtMoney(i.totalValue)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3">Tổng cộng</td>
            <td class="xp-num">${sumPkgs ? fmtNum(sumPkgs) : dash}</td>
            <td class="xp-num">${fmtNum(sumQty)} kg</td>
            <td></td>
            <td class="xp-num">${fmtMoney(sumVal)}</td>
          </tr>
        </tfoot>
      </table>
    `;
  }

  container.innerHTML = `
    <div class="xp-wrap">
      <div class="xp-info">
        <div><span class="xp-label">Số B/L:</span> ${blNumber ? escapeHtml(blNumber) : dash}</div>
        <div><span class="xp-label">Số tờ khai:</span> ${declText || dash}</div>
        <div><span class="xp-label">ETA:</span> ${etaText || dash}</div>
      </div>
      ${productsHtml}
    </div>
  `;
}

window.xnkDownloadAllShipmentDocs = async function (shipmentId) {
  try {
    const res = await api.get('/api/documents?shipmentId=' + shipmentId);
    const docs = res.data?.items || res.data || [];

    if (docs.length === 0) {
      showToast('Lô hàng này chưa có file nào được tải lên.', 'warning');
      return;
    }

    const content = `
      <div style="padding: 10px 0;">
        <p style="margin-bottom: 10px; color: var(--text-muted); font-size: 13px;">Chọn các file bạn muốn tải xuống:</p>
        <div style="max-height: 350px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px; padding: 10px;">
          ${docs.map((d, i) => `
            <label style="display:flex; align-items:center; gap:10px; padding:8px; border-bottom: 1px solid #f1f5f9; cursor:pointer;">
              <input type="checkbox" class="doc-dl-chk" value="${d.id}" data-name="${d.originalFileName || d.fileName}" checked>
              <span>
                <strong>${d.originalFileName || d.fileName}</strong> 
                <span style="font-size:11px; color:#94a3b8; margin-left:8px;">(${(d.fileSize / 1024).toFixed(1)} KB)</span>
              </span>
            </label>
          `).join('')}
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 20px;">
          <label style="font-size:13px; cursor:pointer;"><input type="checkbox" id="doc-dl-checkall" checked> Chọn tất cả</label>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-default" onclick="window.closeModal()">Đóng</button>
            <button class="btn btn-primary" id="btn-dl-selected-docs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> 
              Tải Xuống
            </button>
          </div>
        </div>
      </div>
    `;

    window.openModal('Tải File Lô Hàng', content);

    const chkAll = document.getElementById('doc-dl-checkall');
    const chks = document.querySelectorAll('.doc-dl-chk');

    chkAll.addEventListener('change', (e) => {
      chks.forEach(c => c.checked = e.target.checked);
    });

    chks.forEach(c => c.addEventListener('change', () => {
      const allChecked = Array.from(chks).every(x => x.checked);
      chkAll.checked = allChecked;
    }));

    document.getElementById('btn-dl-selected-docs').addEventListener('click', async () => {
      const selected = Array.from(chks).filter(c => c.checked);
      if (selected.length === 0) {
        showToast('Vui lòng chọn ít nhất 1 file để tải', 'warning');
        return;
      }

      const token = localStorage.getItem('xnk_token');
      let count = 0;

      for (const sel of selected) {
        try {
          const downloadRes = await fetch('http://localhost:5000/api/documents/' + sel.value + '/download', {
            headers: { 'Authorization': 'Bearer ' + token }
          });
          if (downloadRes.ok) {
            const blob = await downloadRes.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = sel.getAttribute('data-name');
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            count++;
          }
        } catch (e) { }
      }
      showToast('Đã tải xuống ' + count + ' file.', 'success');
      window.closeModal();
    });
  } catch (e) {
    showToast('Lỗi tải danh sách file', 'error');
  }
};
