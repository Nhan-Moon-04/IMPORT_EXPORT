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
  currentShipmentFilter = filterType;
  currentStatusTab = 'ALL';

  let title = "Tất Cả Lô Hàng Xuất Nhập Khẩu";
  if (filterType === 'Import') title = "Lô Hàng Nhập Khẩu Sợi";
  if (filterType === 'Export') title = "Lô Hàng Xuất Khẩu Sợi";

  container.innerHTML = `
    <div class="shipments-page-wrapper">
      <!-- Page Header -->
      <div class="shipments-header">
        <div class="shipments-header-title">
          <h2 class="shipments-title">
            <span class="title-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            </span>
            ${title}
          </h2>
          <div class="shipments-subtitle">Theo dõi chi tiết tiến độ chứng từ, booking, hải quan, lịch tàu và trị giá các lô hàng</div>
        </div>
        <div class="shipments-header-actions">
          <button id="btnShipmentAdd" class="btn btn-primary" style="height: 34px; padding: 0 14px; font-weight: 600; font-size: 13px; display: inline-flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Thêm Lô hàng mới
          </button>
          <button id="btnExportShipmentsExcel" class="btn btn-default" style="height: 34px; padding: 0 12px; font-size: 13px; display: inline-flex; align-items: center; gap: 6px;" title="Xuất danh sách lô hàng ra Excel/CSV">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Xuất Excel
          </button>
          <button id="btnShipmentRefresh" class="btn btn-default" style="height: 34px; padding: 0 12px; font-size: 13px; display: inline-flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            Nạp lại
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="shipments-kpi-grid">
        <div class="shipment-kpi-card kpi-blue">
          <div class="shipment-kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          </div>
          <div class="shipment-kpi-body">
            <div class="shipment-kpi-label">Tổng Lô Hàng</div>
            <div class="shipment-kpi-value" id="kpiShipmentCount">0 lô</div>
            <div class="shipment-kpi-sub" id="kpiShipmentSub">0 Nhập • 0 Xuất</div>
          </div>
        </div>

        <div class="shipment-kpi-card kpi-emerald">
          <div class="shipment-kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline><path d="M7 16l4 2 6-4"></path></svg>
          </div>
          <div class="shipment-kpi-body">
            <div class="shipment-kpi-label">Tổng Sản Lượng</div>
            <div class="shipment-kpi-value" id="kpiShipmentQty">0 kg</div>
            <div class="shipment-kpi-sub" id="kpiShipmentQtySub">≈ 0.00 tấn</div>
          </div>
        </div>

        <div class="shipment-kpi-card kpi-amber">
          <div class="shipment-kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          </div>
          <div class="shipment-kpi-body">
            <div class="shipment-kpi-label">Kim Ngạch USD</div>
            <div class="shipment-kpi-value" id="kpiShipmentUsd" style="color:#059669;">$0.00</div>
            <div class="shipment-kpi-sub" id="kpiShipmentUsdSub">0 lô tiền tệ USD</div>
          </div>
        </div>

        <div class="shipment-kpi-card kpi-purple">
          <div class="shipment-kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
          </div>
          <div class="shipment-kpi-body">
            <div class="shipment-kpi-label">Giá Trị VNĐ</div>
            <div class="shipment-kpi-value" id="kpiShipmentVnd" style="color:#1d4ed8;">0 ₫</div>
            <div class="shipment-kpi-sub" id="kpiShipmentVndSub">0 lô tiền tệ VNĐ</div>
          </div>
        </div>
      </div>

      <!-- Quick Status Filter Tabs -->
      <div class="shipments-tabs-bar">
        <div class="shipments-status-tabs" id="shipmentsStatusTabs">
          <button class="shipment-tab-btn active" data-tab="ALL">
            <span>Tất cả</span>
            <span class="shipment-tab-count" id="tab-count-ALL">0</span>
          </button>
          <button class="shipment-tab-btn" data-tab="DRAFT">
            <span>Bản nháp</span>
            <span class="shipment-tab-count" id="tab-count-DRAFT">0</span>
          </button>
          <button class="shipment-tab-btn" data-tab="PAYMENT">
            <span>Chờ thanh toán</span>
            <span class="shipment-tab-count" id="tab-count-PAYMENT">0</span>
          </button>
          <button class="shipment-tab-btn" data-tab="TRANSIT">
            <span>Đang vận chuyển</span>
            <span class="shipment-tab-count" id="tab-count-TRANSIT">0</span>
          </button>
          <button class="shipment-tab-btn" data-tab="ARRIVED">
            <span>Đã cập cảng / HQ</span>
            <span class="shipment-tab-count" id="tab-count-ARRIVED">0</span>
          </button>
          <button class="shipment-tab-btn" data-tab="COMPLETED">
            <span>Hoàn tất</span>
            <span class="shipment-tab-count" id="tab-count-COMPLETED">0</span>
          </button>
        </div>
      </div>

      <!-- Toolbar Card -->
      <div class="shipments-toolbar-card">
        <div class="toolbar-left-actions">
          <button id="btnShipmentEdit" class="btn btn-default btn-sm" disabled style="display:inline-flex; align-items:center; gap:5px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
            Sửa
          </button>
          <button id="btnShipmentStatus" class="btn btn-default btn-sm" disabled style="display:inline-flex; align-items:center; gap:5px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.21l-5.69 5.69"></path></svg>
            Đổi Trạng Thái
          </button>
          <button id="btnShipmentDelete" class="btn btn-default btn-sm" style="color: var(--amis-red); display:inline-flex; align-items:center; gap:5px;" disabled>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            Xóa
          </button>
          <div style="height: 18px; width: 1px; background: #e2e8f0; margin: 0 4px;"></div>
          <button id="btnConfigureColumns" class="btn btn-default btn-sm" style="display:inline-flex; align-items:center; gap:5px;" title="Tùy chọn các cột hiển thị trong bảng">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            Tùy chọn cột
          </button>
        </div>
        <div class="toolbar-right-actions">
          <div class="shipment-search-wrapper">
            <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="shipmentSearchInput" class="shipment-search-input" placeholder="Lọc mã lô, sản phẩm, đối tác, invoice, tờ khai...">
          </div>
        </div>
      </div>

      <!-- Table Card -->
      <div class="shipments-table-card">
        <div class="shipments-table-container">
          <table class="modern-shipment-table" id="shipmentsTable">
            <thead id="shipmentsThead"></thead>
            <tbody id="shipmentsTbody">
              <tr><td colspan="13" style="text-align:center; padding: 32px; color: #64748b;">Đang tải danh sách lô hàng...</td></tr>
            </tbody>
          </table>
        </div>
        <div class="shipments-pagination-bar">
          <div id="shipmentPaginationText">Tổng số: 0 bản ghi</div>
          <div style="font-size: 12px; color: #64748b;">Hệ thống tải toàn bộ danh sách lô hàng thực tế</div>
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
    if (selectedId && !shipmentsList.some(s => s.id === selectedId)) {
      selectedId = null;
    }
    const editBtn = document.getElementById("btnShipmentEdit");
    const statusBtn = document.getElementById("btnShipmentStatus");
    const deleteBtn = document.getElementById("btnShipmentDelete");
    if (editBtn) editBtn.disabled = !selectedId;
    if (statusBtn) statusBtn.disabled = !selectedId;
    if (deleteBtn) deleteBtn.disabled = !selectedId;

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

  // 1. Build Thead
  let theadHtml = `<tr>
    <th style="width: 38px; text-align:center;"><input type="checkbox" id="checkAllShipments"></th>
    <th style="width: 38px; text-align:center;"></th>
  `;
  if (cols.code) theadHtml += `<th style="min-width: 140px;">Mã Lô Hàng</th>`;
  if (cols.type) theadHtml += `<th style="min-width: 110px;">Loại Hình</th>`;
  if (cols.partner) theadHtml += `<th style="min-width: 180px;">Đối Tác</th>`;
  if (cols.products) theadHtml += `<th style="min-width: 160px;">Sản Phẩm</th>`;
  if (cols.quantity) theadHtml += `<th style="min-width: 110px; text-align:right;">Số Lượng (KG)</th>`;
  if (cols.invoices) theadHtml += `<th style="min-width: 130px;">Invoice</th>`;
  if (cols.declarations) theadHtml += `<th style="min-width: 140px;">Tờ Khai HQ</th>`;
  if (cols.containers) theadHtml += `<th style="min-width: 120px;">Container</th>`;
  if (cols.etd) theadHtml += `<th style="min-width: 95px;">ETD</th>`;
  if (cols.eta) theadHtml += `<th style="min-width: 140px;">ETA</th>`;
  if (cols.value) theadHtml += `<th style="min-width: 130px; text-align:right;">Tổng Giá Trị</th>`;
  if (cols.status) theadHtml += `<th style="min-width: 135px;">Trạng Thái</th>`;
  theadHtml += `<th style="min-width: 135px; text-align:center;">Thao Tác</th></tr>`;
  thead.innerHTML = theadHtml;

  // 2. Build Tbody
  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="13" style="text-align:center; padding: 40px; color: #64748b;">
      <div style="font-size: 28px; margin-bottom: 8px;">📦</div>
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
      contHtml = s.containerNumbers.map(c => `<span class="doc-pill" style="background:#f8fafc; color:#475569; border:1px solid #e2e8f0;" title="Số Cont: ${c}">${c}</span>`).join(' ');
    }

    // ETD
    const etdText = s.bookings?.[0]?.etd ? new Date(s.bookings[0].etd).toLocaleDateString('vi-VN') : '---';

    // ETA Pill
    let etaBadge = `<span class="doc-empty">---</span>`;
    if (s.expectedDate) {
      const etaDate = new Date(s.expectedDate);
      const now = new Date();
      const diffDays = Math.ceil((etaDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
      const dateStr = etaDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      
      if (diffDays < 0) {
        etaBadge = `<span class="eta-pill eta-arrived" title="Đã cập cảng vào ngày ${dateStr}">⚓ Đã cập cảng <span class="eta-date">(${dateStr})</span></span>`;
      } else if (diffDays <= 3) {
        etaBadge = `<span class="eta-pill eta-urgent" title="ETA sắp đến: ${dateStr}">⚡ Còn ${diffDays} ngày <span class="eta-date">(${dateStr})</span></span>`;
      } else {
        etaBadge = `<span class="eta-pill eta-future" title="Dự kiến cập cảng: ${dateStr}">🚢 <span class="eta-date">${dateStr}</span></span>`;
      }
    }

    let rowHtml = `
    <tr data-id="${s.id}" class="shipment-main-row ${selectedId === s.id ? 'selected' : ''}">
      <td style="text-align:center;">
        <input type="checkbox" class="row-checkbox" value="${s.id}" ${selectedId === s.id ? 'checked' : ''}>
      </td>
      <td style="text-align:center;" class="expand-btn" data-id="${s.id}">
        <span class="expand-chevron" id="expand-icon-${s.id}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
        </span>
      </td>
    `;

    if (cols.code) {
      rowHtml += `
      <td>
        <a href="javascript:void(0)" onclick="window.appNavigateTo('shipment-detail', '${s.id}')" class="shipment-code-badge" title="Nhấn để xem toàn bộ hồ sơ chi tiết">
          <span class="badge-icon">📦</span>
          <span>${s.shipmentCode}</span>
        </a>
      </td>`;
    }

    if (cols.type) {
      rowHtml += `<td>
        ${s.type === 'Export'
          ? '<span class="status-badge" style="background:#f5f3ff; color:#7c3aed; border:1px solid #ddd6fe;"><span class="status-dot" style="background:#8b5cf6;"></span>Xuất khẩu</span>'
          : '<span class="status-badge" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe;"><span class="status-dot" style="background:#3b82f6;"></span>Nhập khẩu</span>'
        }
      </td>`;
    }

    if (cols.partner) {
      rowHtml += `<td>
        <div class="partner-cell">
          <div class="partner-name" title="${escapeHtml(partnerName)}">${escapeHtml(partnerName)}</div>
          <div class="partner-meta">
            <span class="meta-tag term">${escapeHtml(incoterm)}</span>
            <span class="meta-tag ${isVnd ? 'curr-vnd' : 'curr-usd'}">${curr}</span>
            ${s.originCountry ? `<span class="meta-tag country">${escapeHtml(s.originCountry)}</span>` : ''}
          </div>
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
      <td style="text-align:center;">
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
        </div>
      </td>
    </tr>
    <!-- Hidden Expandable Row -->
    <tr id="expand-row-${s.id}" class="expand-row" style="display:none;">
      <td colspan="13" style="padding: 0;">
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
      if (e.target.closest("button") || e.target.closest("a")) return;
      if (e.target.closest('.expand-btn')) {
        toggleExpandRow(tr.getAttribute("data-id"));
        return;
      }
      selectShipmentRow(tr.getAttribute("data-id"));
    });
  });

  const checkAll = document.getElementById("checkAllShipments");
  if (checkAll) {
    checkAll.addEventListener("change", (e) => {
      const isChecked = e.target.checked;
      tbody.querySelectorAll(".row-checkbox").forEach(cb => cb.checked = isChecked);
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

function selectShipmentRow(id) {
  selectedId = id;
  const tbody = document.getElementById("shipmentsTbody");
  if (!tbody) return;

  tbody.querySelectorAll("tr.shipment-main-row").forEach(tr => {
    const isCur = tr.getAttribute("data-id") === id;
    tr.classList.toggle("selected", isCur);
    const cb = tr.querySelector(".row-checkbox");
    if (cb) cb.checked = isCur;
  });

  const editBtn = document.getElementById("btnShipmentEdit");
  const statusBtn = document.getElementById("btnShipmentStatus");
  const deleteBtn = document.getElementById("btnShipmentDelete");
  if (editBtn) editBtn.disabled = !id;
  if (statusBtn) statusBtn.disabled = !id;
  if (deleteBtn) deleteBtn.disabled = !id;
}

function setupShipmentEvents() {
  document.getElementById("btnShipmentRefresh")?.addEventListener("click", () => loadShipmentsData(currentShipmentFilter));
  document.getElementById("btnExportShipmentsExcel")?.addEventListener("click", () => exportShipmentsToExcel());
  document.getElementById("btnShipmentAdd")?.addEventListener("click", () => openShipmentForm(null));
  document.getElementById("btnShipmentEdit")?.addEventListener("click", () => {
    if (selectedId) openShipmentForm(selectedId);
  });
  document.getElementById("btnShipmentDelete")?.addEventListener("click", () => {
    if (selectedId) deleteShipment(selectedId);
  });
  document.getElementById("btnShipmentStatus")?.addEventListener("click", () => {
    if (selectedId) openStatusModal(selectedId);
  });
  document.getElementById("btnConfigureColumns")?.addEventListener("click", () => {
    openColumnConfigModal();
  });

  // Quick Status Tabs
  document.querySelectorAll('#shipmentsStatusTabs .shipment-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#shipmentsStatusTabs .shipment-tab-btn').forEach(b => b.classList.remove('active'));
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


function renderProductPickerHtml(type, selectedCustName = '') {
  const isImport = type === 'Import';
  if (isImport) {
    return `
      <select id="productPickerSelect" class="sd-form-select" style="min-width:380px; height:34px; font-size:12.5px; border-color:#93c5fd; background:#f0f9ff; font-weight:500;">
        <option value="">-- Chọn sản phẩm nguyên liệu nhập khẩu (có sẵn giá mua vào) --</option>
        ${purchasePrices.length > 0 ? `
          <optgroup label="🏷️ Sản phẩm có BẢNG GIÁ MUA VÀO (${purchasePrices.length} mặt hàng)">
            ${purchasePrices.map(p => {
              const matchedProd = allProducts.find(x => x.id === p.productId || x.sku === p.productSku);
              const hs = matchedProd?.hsCode || '---';
              const origin = p.countryOfOrigin || matchedProd?.countryOfOrigin || '---';
              const nameVi = matchedProd?.nameVi || '';
              const unit = matchedProd?.unit || 'kg';
              const priceFormatted = p.currency === 'VND' 
                ? `${Number(p.unitPrice).toLocaleString('vi-VN')} ₫/kg` 
                : `${Number(p.unitPrice).toFixed(2)}/kg`;
              const supTag = p.supplierName ? ` • NCC: ${p.supplierName}` : '';
              return `
                <option value="${p.id}" data-type="purchase" data-productid="${p.productId}" data-sku="${escapeHtml(p.productSku)}" data-name="${escapeHtml(p.productName)}" data-namevi="${escapeHtml(nameVi)}" data-hscode="${escapeHtml(hs)}" data-origin="${escapeHtml(origin)}" data-price="${p.unitPrice}" data-curr="${p.currency || 'USD'}" data-rate="25450" data-unit="${escapeHtml(unit)}" data-notes="${escapeHtml(p.notes || '')}">
                  [${escapeHtml(p.productSku)}] ${escapeHtml(p.productName)}${escapeHtml(supTag)} ${origin && origin !== '---' ? `— (Xuất xứ: ${escapeHtml(origin)})` : ''} — Giá mua: ${priceFormatted}
                </option>
              `;
            }).join('')}
          </optgroup>
        ` : ''}
        ${allProducts.length > 0 ? `
          <optgroup label="📦 Danh mục sản phẩm khác (chưa có giá - nhập giá thủ công) (${allProducts.length})">
            ${allProducts.map(p => `
              <option value="${p.id}" data-type="product" data-productid="${p.id}" data-sku="${escapeHtml(p.sku)}" data-name="${escapeHtml(p.name)}" data-namevi="${escapeHtml(p.nameVi || '')}" data-hscode="${escapeHtml(p.hsCode || '---')}" data-origin="${escapeHtml(p.countryOfOrigin || '---')}" data-price="" data-curr="" data-rate="25450" data-unit="${escapeHtml(p.unit || 'kg')}">
                [${escapeHtml(p.sku)}] ${escapeHtml(p.name)} (${p.unit || 'kg'})${p.hsCode ? ` - HS: ${escapeHtml(p.hsCode)}` : ''}
              </option>
            `).join('')}
          </optgroup>
        ` : ''}
      </select>
    `;
  } else {
    // Export: Sale prices
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
      <select id="productPickerSelect" class="sd-form-select" style="min-width:380px; height:34px; font-size:12.5px; border-color:#c4b5fd; background:#faf5ff; font-weight:500;">
        <option value="">-- Chọn sản phẩm xuất khẩu (có sẵn giá bán ra) --</option>
        ${sortedSales.length > 0 ? `
          <optgroup label="🏷️ Sản phẩm có BẢNG GIÁ BÁN RA (${sortedSales.length} mã)">
            ${sortedSales.map(sp => {
              const matchedPur = purchasePrices.find(p => p.id === sp.purchasePriceId);
              const matchedProd = allProducts.find(x => x.id === matchedPur?.productId || x.sku === sp.inputProductSku);
              const hs = matchedProd?.hsCode || '---';
              const nameVi = matchedProd?.nameVi || '';
              const origin = 'Việt Nam';
              const priceFormatted = sp.currency === 'VND' 
                ? `${Number(sp.unitPrice).toLocaleString('vi-VN')} ₫/kg` 
                : `${Number(sp.unitPrice).toFixed(2)}/kg`;
              const custTag = sp.customerName ? ` • KH: ${sp.customerName}` : '';
              const destTag = sp.destinationCountry ? ` ➔ ${sp.destinationCountry}` : '';
              return `
                <option value="${sp.id}" data-type="sale" data-purchaseid="${sp.purchasePriceId}" data-productid="${matchedProd?.id || ''}" data-sku="${escapeHtml(sp.outputSku)}" data-name="${escapeHtml(sp.outputProductName || sp.outputSku)}" data-namevi="${escapeHtml(nameVi)}" data-hscode="${escapeHtml(hs)}" data-origin="${origin}" data-price="${sp.unitPrice}" data-curr="${sp.currency || 'USD'}" data-rate="${sp.exchangeRate || 25450}" data-unit="kg" data-notes="${escapeHtml(sp.notes || `Gia công từ ${sp.inputProductSku}`)}" data-customer="${escapeHtml(sp.customerName || '')}">
                  [${escapeHtml(sp.outputSku)}] ${escapeHtml(sp.outputProductName || sp.outputSku)}${escapeHtml(custTag)}${escapeHtml(destTag)} — Giá bán: ${priceFormatted}
                </option>
              `;
            }).join('')}
          </optgroup>
        ` : ''}
        ${allProducts.length > 0 ? `
          <optgroup label="📦 Danh mục sản phẩm khác (chưa có giá - nhập giá thủ công) (${allProducts.length})">
            ${allProducts.map(p => `
              <option value="${p.id}" data-type="product" data-productid="${p.id}" data-sku="${escapeHtml(p.sku)}" data-name="${escapeHtml(p.name)}" data-namevi="${escapeHtml(p.nameVi || '')}" data-hscode="${escapeHtml(p.hsCode || '---')}" data-origin="Việt Nam" data-price="" data-curr="" data-rate="25450" data-unit="${escapeHtml(p.unit || 'kg')}">
                [${escapeHtml(p.sku)}] ${escapeHtml(p.name)} (${p.unit || 'kg'})${p.hsCode ? ` - HS: ${escapeHtml(p.hsCode)}` : ''}
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
  if (id) {
    s = shipmentsList.find(x => x.id === id);
    if (!s) {
      try {
        const res = await api.get(`/api/shipments/${id}`);
        s = res.data;
      } catch (e) {
        showToast("Không thể tải thông tin lô hàng", "error");
        return;
      }
    }
  }
  const isEdit = !!s;

  // Tự động tạo mã gợi ý nếu là tạo mới
  const autoGenCode = s?.shipmentCode || `SHP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

  // Load master data song song
  const [supRes, cusRes, prodRes, purRes, saleRes] = await Promise.all([
    api.get("/api/suppliers?pageSize=200"),
    api.get("/api/customers?pageSize=200"),
    api.get("/api/products?pageSize=500"),
    api.get("/api/purchase-prices"),
    api.get("/api/sale-prices")
  ]);

  const suppliers = supRes.data?.items || supRes.data || [];
  const customers = cusRes.data?.items || cusRes.data || [];
  allProducts = prodRes.data?.items || prodRes.data || [];
  purchasePrices = purRes.data || [];
  salePrices = saleRes.data || [];

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

  const currentType = s?.type || 'Import';
  const isEditTitle = isEdit ? 'Chỉnh sửa lô hàng' : 'Thêm mới lô hàng';
  const partnerTitle = s?.supplierName || s?.customerName || 'Chưa chọn đối tác';

  // Format dates
  const createdAtVal = s?.createdAt ? s.createdAt.split('T')[0] : new Date().toISOString().split('T')[0];
  const etaVal = s?.expectedDate ? s.expectedDate.split('T')[0] : '';
  const etdVal = s?.etd ? s.etd.split('T')[0] : '';

  // Initial partner code & contact
  let initialPartnerCode = s?.supplierCode || s?.customerCode || '---';
  let initialContact = s?.contactPerson || '';

  // Pre-calculate sums
  const initQty = formItems.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0) || Number(s?.totalQuantity || 0);
  const initGw = formItems.reduce((acc, it) => acc + (Number(it.grossWeight) || 0), 0) || Number(s?.totalGrossWeight || 0);
  const initVal = formItems.reduce((acc, it) => acc + ((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0)), 0) || Number(s?.totalValue || 0);

  container.innerHTML = `
    <div class="sd-page">
      <!-- BREADCRUMB -->
      <div class="sd-breadcrumb">
        <a href="#" id="form-back-link">Tất cả lô hàng</a>
        <span class="sd-breadcrumb-sep">›</span>
        <span class="sd-breadcrumb-cur">${isEditTitle}</span>
      </div>

      <!-- HEADER -->
      <div class="sd-header">
        <div class="sd-header-row1">
          <div class="sd-icon-box">${FORM_ICON.ship}</div>

          <div class="sd-title-group" style="display:flex; flex-direction:column; gap:2px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <input type="text" id="sCode" class="sd-form-input" style="font-size:16px; font-weight:800; width: 230px; height: 32px; letter-spacing: -0.3px; color: var(--amis-blue);" required value="${s?.shipmentCode || autoGenCode}" placeholder="Nhập Mã Lô Hàng *">
              <button type="button" id="btnAutoCode" class="sd-btn-sm" title="Tự động sinh mã lô hàng chuẩn" style="height:32px; padding:0 10px; font-size:12px; display:inline-flex; align-items:center; gap:4px;">
                ${FORM_ICON.refresh} Tự sinh mã
              </button>
            </div>
            <div class="sd-company" id="headerPartnerName">
              ${FORM_ICON.building} <span>${escapeHtml(partnerTitle)}</span>
            </div>
          </div>

          <div class="sd-badges">
            <span id="headerStatusBadge" class="chip chip-amber">${isEdit ? (s.status || 'Bản nháp') : 'Bản nháp'}</span>
            <span id="headerTypeBadge" class="chip ${currentType === 'Export' ? 'chip-purple' : 'chip-blue'}">${currentType === 'Export' ? 'Xuất khẩu' : 'Nhập khẩu'}</span>
          </div>

          <div class="sd-header-actions">
            <button type="button" class="sd-btn-sm" id="btnCancelShipment">
              ✕ Hủy bỏ
            </button>
            <button type="button" id="btnSaveShipment" class="sd-btn-sm sd-btn-primary" style="background:var(--amis-green, #00a152); border-color:var(--amis-green, #00a152); color:#fff; font-weight:600; padding:6px 16px; font-size:12.5px; display:inline-flex; align-items:center; gap:6px;">
              ${FORM_ICON.check} Cất (Lưu)
            </button>
          </div>
        </div>
      </div>

      <!-- INFO BAR (10 ô thông tin đồng bộ với shipment-detail) -->
      <div class="sd-infobar">
        <div class="sd-field">
          <div class="sd-field-label">${FORM_ICON.building} Loại hình *</div>
          <select id="sType" class="sd-form-select">
            <option value="Import" ${currentType === 'Import' ? 'selected' : ''}>📥 Nhập khẩu</option>
            <option value="Export" ${currentType === 'Export' ? 'selected' : ''}>📤 Xuất khẩu</option>
          </select>
        </div>

        <div class="sd-field">
          <div class="sd-field-label">💲 Tiền tệ lô hàng *</div>
          <select id="sCurrency" class="sd-form-select" style="font-weight:700;">
            <option value="USD" ${(s?.currency || 'USD') === 'USD' ? 'selected' : ''}>USD ($ - Đô la Mỹ)</option>
            <option value="VND" ${s?.currency === 'VND' ? 'selected' : ''}>VND (₫ - Đồng Việt Nam)</option>
          </select>
          <div class="sd-field-sub" id="dispCurrSub">${s?.currency === "VND" ? "Tiền tệ: Việt Nam Đồng" : "Tiền tệ: Đô la Mỹ"}</div>
        </div>

        <div class="sd-field" id="supplierField" style="${currentType === 'Export' ? 'display:none;' : ''}">
          <div class="sd-field-label">${FORM_ICON.user} Đối tác (NCC) *</div>
          <select id="sSupplierId" class="sd-form-select">
            <option value="">-- Chọn Nhà Cung Cấp --</option>
            ${suppliers.map(sup => {
              const code = sup.code || sup.tradeName || sup.taxCode || (sup.id ? 'NCC-' + sup.id.substring(0, 5).toUpperCase() : '');
              const contactParts = [sup.contactPerson || sup.contactName, sup.phone, sup.email].filter(Boolean);
              return `<option value="${sup.id}" data-code="${escapeHtml(code)}" data-name="${escapeHtml(sup.companyName)}" data-contact="${escapeHtml(contactParts[0] || '')}" data-sub="${escapeHtml(contactParts.slice(1).join(' • '))}" ${s?.supplierId === sup.id ? 'selected' : ''}>${escapeHtml(sup.companyName)} (${sup.country || 'VN'})</option>`;
            }).join('')}
          </select>
          <div class="sd-field-sub" id="dispSupCode">Mã: ${escapeHtml(initialPartnerCode)}</div>
        </div>

        <div class="sd-field" id="customerField" style="${currentType === 'Import' ? 'display:none;' : ''}">
          <div class="sd-field-label">${FORM_ICON.user} Đối tác (KH) *</div>
          <select id="sCustomerId" class="sd-form-select">
            <option value="">-- Chọn Khách Hàng --</option>
            ${customers.map(c => {
              const code = c.code || c.tradeName || c.taxCode || (c.id ? 'KH-' + c.id.substring(0, 5).toUpperCase() : '');
              const contactParts = [c.contactPerson || c.contactName, c.phone, c.email].filter(Boolean);
              return `<option value="${c.id}" data-code="${escapeHtml(code)}" data-name="${escapeHtml(c.companyName)}" data-contact="${escapeHtml(contactParts[0] || '')}" data-sub="${escapeHtml(contactParts.slice(1).join(' • '))}" ${s?.customerId === c.id ? 'selected' : ''}>${escapeHtml(c.companyName)}</option>`;
            }).join('')}
          </select>
          <div class="sd-field-sub" id="dispCusCode">Mã: ${escapeHtml(initialPartnerCode)}</div>
        </div>

        <div class="sd-field">
          <div class="sd-field-label">${FORM_ICON.calendar} Ngày tạo lập *</div>
          <input type="date" id="sCreatedAt" class="sd-form-input" value="${createdAtVal}">
        </div>

        <div class="sd-field">
          <div class="sd-field-label">${FORM_ICON.calendar} Ngày dự kiến ETA</div>
          <input type="date" id="sExpectedDate" class="sd-form-input" value="${etaVal}">
        </div>

        <div class="sd-field">
          <div class="sd-field-label">${FORM_ICON.anchor} Cảng xếp hàng (POL)</div>
          <input type="text" id="sPol" class="sd-form-input" value="${escapeHtml(s?.portOfLoading || (currentType === 'Export' ? 'Cat Lai Port, Ho Chi Minh City' : 'Shanghai Port, China'))}">
        </div>

        <div class="sd-field">
          <div class="sd-field-label">${FORM_ICON.anchor} Cảng dỡ hàng (POD)</div>
          <input type="text" id="sPod" class="sd-form-input" value="${escapeHtml(s?.portOfDischarge || (currentType === 'Export' ? 'Tokyo Port, Japan' : 'Cat Lai Port, Ho Chi Minh City'))}">
        </div>

        <div class="sd-field">
          <div class="sd-field-label">${FORM_ICON.incoterm} Incoterm</div>
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
          <div class="sd-field-label">${FORM_ICON.user} Người liên hệ</div>
          <input type="text" id="sContactPerson" class="sd-form-input" value="${escapeHtml(initialContact)}" placeholder="Tên / SĐT liên hệ">
          <div class="sd-field-sub" id="dispContactSub">Tự động liên kết</div>
        </div>

        <div class="sd-field">
          <div class="sd-field-label">${FORM_ICON.barcode} Số vận đơn (B/L)</div>
          <input type="text" id="sBlNumber" class="sd-form-input" style="font-family:monospace; color:var(--amis-blue); font-weight:600;" value="${escapeHtml(s?.blNumber || s?.bLNumber || '')}" placeholder="VD: COSU63289104">
        </div>

        <div class="sd-field">
          <div class="sd-field-label">${FORM_ICON.file} Mã đối tác</div>
          <div class="sd-field-value" id="dispPartnerCode" style="font-weight:700; color:var(--amis-blue); line-height:30px;">${escapeHtml(initialPartnerCode)}</div>
        </div>
      </div>

      <!-- BODY: 2 CỘT TƯƠNG ĐỒNG SHIPMENT-DETAIL -->
      <div class="sd-body">
        <!-- LEFT: TABS & CONTENT -->
        <div class="sd-content">
          <div class="sd-tabbar">
            <button type="button" class="sd-tab active" data-pane="items">
              Tổng quan & Hàng hóa <span class="sd-tab-badge" id="tabItemsBadge">${formItems.length}</span>
            </button>
            <button type="button" class="sd-tab" data-pane="logistics">
              Thông tin vận tải & Container
            </button>
          </div>

          <div class="sd-pane-wrap">
            <!-- PANE 1: HÀNG HÓA & TỔNG QUAN -->
            <div class="sd-pane active" id="pane-items">
              <!-- Row 2 cards tổng quan thông số -->
              <div class="sd-overview-grid">
                <div class="sd-card">
                  <div class="sd-card-header">
                    <div class="sd-card-header-left">📋 Thông số vận chuyển & Đóng gói</div>
                  </div>
                  <div class="sd-card-body" style="display:grid; grid-template-columns:1fr 1fr; gap:8px 12px; font-size:12px;">
                    <div>
                      <label class="sd-field-label">Ngày xếp hàng (ETD)</label>
                      <input type="date" id="sEtd" class="sd-form-input" value="${etdVal}">
                    </div>
                    <div>
                      <label class="sd-field-label">Tổng số kiện (Packages)</label>
                      <input type="number" id="sPackages" class="sd-form-input" placeholder="VD: 222" value="${s?.totalPackages || ''}">
                    </div>
                    <div>
                      <label class="sd-field-label">Tổng số lượng NW (kg) *</label>
                      <input type="number" step="0.01" id="sQty" class="sd-form-input" value="${initQty || ''}" placeholder="Tự động tính từ bảng">
                    </div>
                    <div>
                      <label class="sd-field-label">Tổng trọng lượng GW (kg)</label>
                      <input type="number" step="0.01" id="sGrossWeight" class="sd-form-input" value="${initGw || ''}" placeholder="Tự động tính từ bảng">
                    </div>
                  </div>
                </div>

                <div class="sd-card">
                  <div class="sd-card-header">
                    <div class="sd-card-header-left">🚢 Hãng tàu & Thiết bị Container</div>
                  </div>
                  <div class="sd-card-body" style="display:grid; grid-template-columns:1fr 1fr; gap:8px 12px; font-size:12px;">
                    <div>
                      <label class="sd-field-label">Hãng tàu / Vận tải</label>
                      <input type="text" id="sShippingLine" class="sd-form-input" placeholder="VD: COSCO SHIPPING" value="COSCO SHIPPING">
                    </div>
                    <div>
                      <label class="sd-field-label">Tên tàu / Chuyến (Vessel/Voy)</label>
                      <input type="text" id="sVesselVoyage" class="sd-form-input" placeholder="VD: COSCO PRIDE / 024E" value="COSCO PRIDE / 024E">
                    </div>
                    <div>
                      <label class="sd-field-label">Số Container</label>
                      <input type="text" id="sContainerNo" class="sd-form-input" placeholder="VD: TGHU9843210" value="TGHU9843210">
                    </div>
                    <div>
                      <label class="sd-field-label">Số Chì (Seal No)</label>
                      <input type="text" id="sSealNo" class="sd-form-input" placeholder="VD: SL-88992" value="SL-88992">
                    </div>
                  </div>
                </div>
              </div>

              <!-- BẢNG DANH SÁCH HÀNG HÓA -->
              <div>
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; margin-top:4px;">
                  <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <span style="font-size:13px; font-weight:700; color:var(--text-main);">
                      Danh sách hàng hóa <span style="font-weight:400; color:#64748b;" id="itemsCountText">(${formItems.length})</span>
                    </span>
                    <span id="pickerTypeHint" style="font-size:11.5px; padding:3px 9px; border-radius:12px; font-weight:600; ${currentType === 'Export' ? 'background:#f5f3ff; color:#7c3aed; border:1px solid #ddd6fe;' : 'background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe;'}">
                      ${currentType === 'Export' ? '📤 Xuất khẩu: Chọn sản phẩm điền sẵn Đơn giá bán ra' : '📥 Nhập khẩu: Chọn sản phẩm điền sẵn Đơn giá mua vào'}
                    </span>
                  </div>
                  <div style="display:flex; gap:8px; align-items:center;">
                    <div id="productPickerContainer">
                      ${renderProductPickerHtml(currentType, partnerTitle)}
                    </div>
                    <button type="button" id="btnAddProduct" class="sd-btn-sm sd-btn-primary" style="height:32px; padding:0 12px; font-weight:600; white-space:nowrap; display:inline-flex; align-items:center; gap:4px;">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                      Thêm vào lô
                    </button>
                  </div>
                </div>

                <div class="sd-table-wrap" id="shipmentItemsContainer">
                  ${renderFormItemsTable()}
                </div>
              </div>

              <!-- Input ẩn chứa tổng giá trị để form validate -->
              <input type="hidden" id="sValue" value="${initVal || 0}">
            </div>

            <!-- PANE 2: VẬN TẢI & LOGISTICS -->
            <div class="sd-pane" id="pane-logistics">
              <div class="sd-overview-grid">
                <div class="sd-card">
                  <div class="sd-card-header">
                    <div class="sd-card-header-left">🌐 Thông tin Vận chuyển Đường biển / Hàng không</div>
                  </div>
                  <div class="sd-card-body" style="display:grid; grid-template-columns:1fr 1fr; gap:10px 14px; font-size:12px;">
                    <div>
                      <label class="sd-field-label">Phương thức vận tải</label>
                      <select id="sTransportMode" class="sd-form-select">
                        <option value="Sea" selected>Đường biển (Ocean Freight - FCL/LCL)</option>
                        <option value="Air">Đường hàng không (Air Freight)</option>
                        <option value="Road">Đường bộ / Xe tải</option>
                      </select>
                    </div>
                    <div>
                      <label class="sd-field-label">Điều kiện cước phí</label>
                      <select id="sFreightTerm" class="sd-form-select">
                        <option value="Freight Prepaid" ${(!s || s?.deliveryTerm === 'CIF') ? 'selected' : ''}>Freight Prepaid (Cước trả trước)</option>
                        <option value="Freight Collect" ${s?.deliveryTerm === 'FOB' ? 'selected' : ''}>Freight Collect (Cước trả sau)</option>
                      </select>
                    </div>
                    <div>
                      <label class="sd-field-label">Tuyến đường hành trình</label>
                      <input type="text" id="sTransitRoute" class="sd-form-input" placeholder="Shanghai ➔ Cat Lai Port" value="Shanghai Port ➔ Cat Lai Port">
                    </div>
                    <div>
                      <label class="sd-field-label">Đại lý giao nhận (Forwarder)</label>
                      <input type="text" id="sForwarder" class="sd-form-input" placeholder="COSCO LOGISTICS VN" value="COSCO LOGISTICS VN">
                    </div>
                  </div>
                </div>

                <div class="sd-card">
                  <div class="sd-card-header">
                    <div class="sd-card-header-left">📦 Ký mã hiệu & Quy cách bao bì</div>
                  </div>
                  <div class="sd-card-body" style="display:grid; grid-template-columns:1fr; gap:10px; font-size:12px;">
                    <div>
                      <label class="sd-field-label">Ký mã hiệu (Shipping Marks)</label>
                      <input type="text" id="sShippingMarks" class="sd-form-input" placeholder="IMEX / HCM / NO. 1-UP" value="IMEX-VN / ORDER-2026 / NO. 1-UP">
                    </div>
                    <div>
                      <label class="sd-field-label">Loại bao bì đóng gói</label>
                      <input type="text" id="sPackagingType" class="sd-form-input" placeholder="VD: Thùng carton / Pallet gỗ / Cuộn" value="Carton / Wooden Pallet">
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT: SIDEBAR TỔNG GIÁ TRỊ & CHỨNG TỪ (ĐỒNG BỘ 100% VỚI SHIPMENT-DETAIL) -->
        <div class="sd-sidebar">
          <!-- Tổng giá trị lô hàng callout -->
          <div class="sd-price-callout">
            <div class="sd-price-label">TỔNG GIÁ TRỊ LÔ HÀNG</div>
            <div class="sd-price-amount" id="sbTotalValue">
              ${(s?.currency || 'USD') === 'VND' ? `${Math.round(initVal).toLocaleString('vi-VN')} ₫` : `${Number(initVal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </div>
            
            <div class="sd-price-meta">
              <div>Đơn vị tiền tệ: <strong id="sbCurrencyLabel">${(s?.currency || 'USD').toUpperCase()}</strong></div>
              <div>Tổng số lượng NW: <strong id="sbTotalQty">${Number(initQty).toLocaleString()}</strong> kg</div>
              <div>Tổng Gross Weight: <strong id="sbTotalGw">${Number(initGw).toLocaleString()}</strong> kg</div>
              <div>Số mặt hàng: <strong id="sbTotalItems">${formItems.length}</strong> sản phẩm</div>
            </div>
          </div>

          <!-- Chứng từ tự động sinh -->
          <div class="sd-sidebar-section">
            <div class="sd-sidebar-label">📎 Chứng từ liên quan</div>
            <div class="sd-qdoc-list">
              <div class="sd-qdoc-item">
                <div class="sd-qdoc-left">
                  <span class="sd-qdoc-icon">🧾</span>
                  <span class="sd-qdoc-name">Hóa đơn (Invoice)</span>
                </div>
                <span class="sd-qdoc-count">Khởi tạo</span>
              </div>
              <div class="sd-qdoc-item">
                <div class="sd-qdoc-left">
                  <span class="sd-qdoc-icon">📦</span>
                  <span class="sd-qdoc-name">Packing List</span>
                </div>
                <span class="sd-qdoc-count">Đồng bộ</span>
              </div>
              <div class="sd-qdoc-item">
                <div class="sd-qdoc-left">
                  <span class="sd-qdoc-icon">🚢</span>
                  <span class="sd-qdoc-name">Vận đơn (B/L)</span>
                </div>
                <span class="sd-qdoc-count">Liên kết</span>
              </div>
              <div class="sd-qdoc-item">
                <div class="sd-qdoc-left">
                  <span class="sd-qdoc-icon">🏛️</span>
                  <span class="sd-qdoc-name">Tờ khai HQ</span>
                </div>
                <span class="sd-qdoc-count">VNACCS</span>
              </div>
            </div>
          </div>

          <!-- Ghi chú lô hàng -->
          <div class="sd-sidebar-section" style="flex:1;">
            <div class="sd-sidebar-label">✏️ Ghi chú lô hàng</div>
            <textarea id="sNotes" class="sd-form-input" style="width:100%; height:85px; resize:vertical; font-size:12px; padding:6px 8px;" placeholder="Ghi chú về kiểm dịch, phân tích mẫu, yêu cầu giao nhận...">${escapeHtml(s?.notes || '')}</textarea>
            <div class="sd-note-meta" style="margin-top:4px; font-size:11px; color:#94a3b8;">Hệ thống tự động ghi nhận nhật ký cập nhật</div>
          </div>

          <!-- Quy trình AMIS IMEX -->
          <div class="sd-sidebar-section" style="background:#f8fafc; font-size:11.5px; color:#64748b; line-height:1.5;">
            <div style="font-weight:700; color:var(--text-main); margin-bottom:4px;">💡 Quy trình AMIS IMEX</div>
            <div>1. Điền thông tin & thêm sản phẩm</div>
            <div>2. Hệ thống tự động tính NW, GW, Trị giá</div>
            <div>3. Bấm <strong>Cất (Lưu)</strong> để xuất dữ liệu sang Packing List & Tờ khai HQ</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // ─── Event Handlers & Reactivity ──────────────────────────────────────────

  // Back link & cancel
  const goBack = () => window.appNavigateTo('shipments');
  document.getElementById("form-back-link")?.addEventListener("click", (e) => { e.preventDefault(); goBack(); });
  document.getElementById("btnCancelShipment")?.addEventListener("click", goBack);

  // Tab switching
  container.querySelectorAll('.sd-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.sd-tab').forEach(t => t.classList.remove('active'));
      container.querySelectorAll('.sd-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const targetPane = container.querySelector(`#pane-${tab.dataset.pane}`);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // Tự sinh mã lô hàng
  document.getElementById("btnAutoCode")?.addEventListener("click", () => {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randNum = Math.floor(100 + Math.random() * 900);
    const newCode = `SHP-${todayStr}-${randNum}`;
    const codeInp = document.getElementById("sCode");
    if (codeInp) codeInp.value = newCode;
    showToast(`Đã tạo mã lô hàng mới: ${newCode}`, "info");
  });

    function updateProductPicker(type, custName = '') {
    const container = document.getElementById("productPickerContainer");
    if (container) {
      container.innerHTML = renderProductPickerHtml(type, custName);
    }
  }

  // Chuyển loại hình (Import / Export)
  document.getElementById("sType")?.addEventListener("change", function () {
    const type = this.value;
    const supField = document.getElementById("supplierField");
    const cusField = document.getElementById("customerField");
    const badgeType = document.getElementById("headerTypeBadge");
    const pickerHint = document.getElementById("pickerTypeHint");

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
      if (badgeType) {
        badgeType.className = 'chip chip-blue';
        badgeType.textContent = 'Nhập khẩu';
      }
      if (pickerHint) {
        pickerHint.style.background = '#eff6ff';
        pickerHint.style.color = '#1d4ed8';
        pickerHint.style.border = '1px solid #bfdbfe';
        pickerHint.textContent = '📥 Nhập khẩu: Chọn sản phẩm điền sẵn Đơn giá mua vào';
      }
      document.getElementById("sPol").value = 'Shanghai Port, China';
      document.getElementById("sPod").value = 'Cat Lai Port, Ho Chi Minh City';
      document.getElementById("sSupplierId")?.dispatchEvent(new Event('change'));
    } else {
      supField.style.display = 'none';
      cusField.style.display = '';
      if (badgeType) {
        badgeType.className = 'chip chip-purple';
        badgeType.textContent = 'Xuất khẩu';
      }
      if (pickerHint) {
        pickerHint.style.background = '#f5f3ff';
        pickerHint.style.color = '#7c3aed';
        pickerHint.style.border = '1px solid #ddd6fe';
        pickerHint.textContent = '📤 Xuất khẩu: Chọn sản phẩm điền sẵn Đơn giá bán ra';
      }
      document.getElementById("sPol").value = 'Cat Lai Port, Ho Chi Minh City';
      document.getElementById("sPod").value = 'Tokyo Port, Japan';
      document.getElementById("sCustomerId")?.dispatchEvent(new Event('change'));
    }
  });

  // Khi chọn tiền tệ lô hàng
  document.getElementById("sCurrency")?.addEventListener("change", function () {
    const curr = this.value;
    const dispCurrSub = document.getElementById("dispCurrSub");
    if (dispCurrSub) dispCurrSub.textContent = curr === 'VND' ? 'Tiền tệ: Việt Nam Đồng' : 'Tiền tệ: Đô la Mỹ';
    const sbCurr = document.getElementById("sbCurrencyLabel");
    if (sbCurr) sbCurr.textContent = curr;
    refreshFormItemsTable();
    updateCalculations();
  });

  // Chọn đối tác (Supplier / Customer)
  const onPartnerSelect = (e) => {
    const sel = e.target;
    const opt = sel.options[sel.selectedIndex];
    if (opt && opt.value) {
      const code = opt.getAttribute("data-code") || '---';
      const name = opt.getAttribute("data-name") || '---';
      const contact = opt.getAttribute("data-contact") || '';
      const sub = opt.getAttribute("data-sub") || '';

      const dispCode = document.getElementById("dispPartnerCode");
      if (dispCode) dispCode.textContent = code;

      const headerPartner = document.getElementById("headerPartnerName");
      if (headerPartner) {
        headerPartner.innerHTML = `${FORM_ICON.building} <span>${escapeHtml(name)}</span>`;
      }

      const dispSub = document.getElementById("dispSupCode");
      const dispCusSub = document.getElementById("dispCusCode");
      if (dispSub) dispSub.textContent = `Mã: ${code}`;
      if (dispCusSub) dispCusSub.textContent = `Mã: ${code}`;

      const contactInp = document.getElementById("sContactPerson");
      if (contactInp && !contactInp.value) {
        contactInp.value = contact;
      }
      const dispContactSub = document.getElementById("dispContactSub");
      if (dispContactSub && sub) {
        dispContactSub.textContent = sub;
      }

      // If in Export mode, re-filter sale prices with selected customer
      if (document.getElementById("sType")?.value === 'Export') {
        updateProductPicker('Export', name);
      }
    }
  };
  document.getElementById("sSupplierId")?.addEventListener("change", onPartnerSelect);
  document.getElementById("sCustomerId")?.addEventListener("change", onPartnerSelect);

  // Kích hoạt đối tác ban đầu
  if (currentType === 'Import') {
    document.getElementById("sSupplierId")?.dispatchEvent(new Event('change'));
  } else {
    document.getElementById("sCustomerId")?.dispatchEvent(new Event('change'));
  }

  // Chọn đối tác (Supplier / Customer)
  // Thêm sản phẩm từ select box
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

    // Tiền tệ lô hàng hiện tại
    const curInp = document.getElementById("sCurrency");
    let shipmentCurrency = curInp?.value || 'USD';

    // Xác định đơn giá & xử lý tiền tệ
    let unitPrice = '';
    const hasPrice = rawPriceAttr !== null && rawPriceAttr !== '' && !isNaN(parseFloat(rawPriceAttr)) && parseFloat(rawPriceAttr) > 0;

    if (hasPrice) {
      const rawPrice = parseFloat(rawPriceAttr);
      // Nếu là sản phẩm đầu tiên thêm vào lô hàng, tự động đồng bộ tiền tệ lô hàng theo sản phẩm này
      if (formItems.length === 0 && itemCurrency && curInp) {
        shipmentCurrency = itemCurrency;
        curInp.value = itemCurrency;
        const dispCurrSub = document.getElementById("dispCurrSub");
        if (dispCurrSub) dispCurrSub.textContent = itemCurrency === 'VND' ? 'Tiền tệ: Việt Nam Đồng' : 'Tiền tệ: Đô la Mỹ';
        const sbCurr = document.getElementById("sbCurrencyLabel");
        if (sbCurr) sbCurr.textContent = itemCurrency;
      }

      // Nếu tiền tệ sản phẩm khác tiền tệ lô hàng, tự động quy đổi chính xác
      if (itemCurrency && shipmentCurrency && itemCurrency !== shipmentCurrency) {
        if (shipmentCurrency === 'VND' && itemCurrency === 'USD') {
          unitPrice = Math.round(rawPrice * exRate);
          showToast(`Đã quy đổi giá [${sku}]: $${rawPrice.toFixed(2)} ➔ ${unitPrice.toLocaleString('vi-VN')} ₫ theo tỷ giá ${exRate.toLocaleString('vi-VN')}`, "info");
        } else if (shipmentCurrency === 'USD' && itemCurrency === 'VND') {
          unitPrice = +(rawPrice / exRate).toFixed(4);
          showToast(`Đã quy đổi giá [${sku}]: ${rawPrice.toLocaleString('vi-VN')} ₫ ➔ $${unitPrice} theo tỷ giá ${exRate.toLocaleString('vi-VN')}`, "info");
        } else {
          unitPrice = rawPrice;
        }
      } else {
        unitPrice = rawPrice;
      }
    } else {
      // Không có giá cấu hình sẵn: để trống để người dùng tự nhập
      unitPrice = '';
    }

    // Thêm dòng mới: Số lượng, Số kiện, GW, NW ĐỀU ĐỂ TRỐNG để người dùng nhập
    formItems.push({
      productId: prodId || allProducts[0]?.id,
      productCode: sku,
      productName: name,
      nameVi: nameVi,
      sku: sku,
      hsCode: hsCode,
      origin: origin,
      unit: unit,
      quantity: '',       // ĐỂ TRỐNG
      packages: '',       // ĐỂ TRỐNG
      unitPrice: unitPrice, // Điền giá nếu có trong bảng giá, để trống nếu không có
      currency: shipmentCurrency,
      netWeight: '',      // ĐỂ TRỐNG
      grossWeight: '',    // ĐỂ TRỐNG
      notes: notes
    });

    sel.value = "";
    refreshFormItemsTable();
    updateCalculations();

    if (hasPrice) {
      const priceText = shipmentCurrency === 'VND' ? `${Number(unitPrice).toLocaleString('vi-VN')} ₫` : `$${Number(unitPrice).toFixed(2)}`;
      showToast(`Đã thêm [${sku}] với đơn giá: ${priceText} / kg. Vui lòng nhập số lượng và số kiện.`, "success");
    } else {
      showToast(`Đã thêm [${sku}]. Vui lòng nhập số lượng, số kiện và đơn giá.`, "info");
    }
  });

  // Delegate input & remove trong bảng
  document.getElementById("shipmentItemsContainer")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-remove-item");
    if (btn) {
      const idx = parseInt(btn.getAttribute("data-idx"));
      formItems.splice(idx, 1);
      refreshFormItemsTable();
      updateCalculations();
      showToast("Đã xóa dòng sản phẩm", "info");
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
      showToast("Đã thêm dòng sản phẩm trống. Vui lòng nhập thông tin chi tiết.", "info");
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
  document.getElementById("btnSaveShipment")?.addEventListener("click", async () => {
    const shipmentCode = document.getElementById("sCode")?.value.trim();
    if (!shipmentCode) {
      showToast("Vui lòng nhập Mã lô hàng", "error");
      document.getElementById("sCode")?.focus();
      return;
    }

    const sType = document.getElementById("sType")?.value || 'Import';
    const supplierId = document.getElementById("sSupplierId")?.value || null;
    const customerId = document.getElementById("sCustomerId")?.value || null;

    if (sType === 'Import' && !supplierId) {
      showToast("Vui lòng chọn Đối tác Nhà Cung Cấp (NCC)", "error");
      return;
    }
    if (sType === 'Export' && !customerId) {
      showToast("Vui lòng chọn Đối tác Khách hàng (KH)", "error");
      return;
    }

    const contactPerson = document.getElementById("sContactPerson")?.value.trim() || 'admin';
    const totalQty = parseFloat(document.getElementById("sQty")?.value) || formItems.reduce((s, i) => s + (i.quantity || 0), 0);
    const totalGw = parseFloat(document.getElementById("sGrossWeight")?.value) || formItems.reduce((s, i) => s + (i.grossWeight || 0), 0);
    const totalVal = parseFloat(document.getElementById("sValue")?.value) || formItems.reduce((s, i) => s + ((i.quantity || 0) * (i.unitPrice || 0)), 0);

    const payload = {
      shipmentCode,
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
      notes: document.getElementById("sNotes")?.value.trim() || null
    };

    try {
      let savedId = id;
      if (isEdit) {
        await api.put(`/api/shipments/${s.id}`, payload);
        showToast("Cập nhật lô hàng thành công!", "success");
        addShipmentTimeline(s.id, `Cập nhật thông tin lô hàng: Tổng ${totalQty.toLocaleString()} kg, trị giá $${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'admin');
      } else {
        const createRes = await api.post("/api/shipments", payload);
        savedId = createRes.data?.id || createRes.data?.data?.id;
        showToast("Tạo mới lô hàng thành công!", "success");
        addShipmentTimeline(savedId, `Khởi tạo lô hàng mới ${shipmentCode} trên hệ thống (Loại hình: ${sType === 'Export' ? 'Xuất khẩu' : 'Nhập khẩu'})`, 'admin');
      }

      // Lưu chi tiết hàng hóa (Items)
      if (savedId && formItems.length > 0) {
        const itemsPayload = {
          items: formItems.map(i => {
            const pkgsText = i.packages ? `${i.packages} kiện` : '';
            let noteContent = i.notes || '';
            if (pkgsText && !noteContent.includes('kiện')) {
              noteContent = noteContent ? `${pkgsText} - ${noteContent}` : pkgsText;
            }
            return {
              productId: (i.productId && !String(i.productId).startsWith('custom-')) ? i.productId : (allProducts[0]?.id || i.productId),
              quantity: i.quantity,
              netWeight: i.netWeight || i.quantity,
              grossWeight: i.grossWeight,
              unitPrice: i.unitPrice,
              notes: noteContent || null
            };
          })
        };
        await api.post(`/api/shipments/${savedId}/items`, itemsPayload);
      } else if (savedId && formItems.length === 0 && isEdit) {
        await api.post(`/api/shipments/${savedId}/items`, { items: [] });
      }

      // Lưu B/L nếu người dùng nhập số B/L
      const blNum = document.getElementById("sBlNumber")?.value.trim();
      if (savedId && blNum) {
        try {
          const blPayload = {
            invoiceNumber: blNum,
            type: 'BillOfLading',
            shipmentId: savedId,
            supplierId: sType === 'Import' ? supplierId : null,
            customerId: sType === 'Export' ? customerId : null,
            invoiceDate: new Date().toISOString(),
            totalAmount: 0,
            currency: 'USD',
            paymentTerms: document.getElementById("sFreightTerm")?.value || (payload.deliveryTerm === 'CIF' ? 'Freight Prepaid' : 'Freight Collect'),
            notes: JSON.stringify({
              shippingLine: document.getElementById("sShippingLine")?.value || 'COSCO SHIPPING',
              vesselVoyage: document.getElementById("sVesselVoyage")?.value || 'COSCO PRIDE / 024E',
              containerNo: document.getElementById("sContainerNo")?.value || 'TGHU9843210',
              sealNo: document.getElementById("sSealNo")?.value || 'SL-88992',
              packages: parseFloat(document.getElementById("sPackages")?.value) || 0,
              grossWeight: totalGw,
              pol: payload.portOfLoading,
              pod: payload.portOfDischarge,
              status: 'Original'
            })
          };
          await api.post('/api/invoices', blPayload);
        } catch (e) {
          // B/L fallback
        }
      }

      // Chuyển ngay đến màn hình Chi tiết lô hàng
      window.appNavigateTo('shipment-detail', savedId);
    } catch (err) {
      showToast(`Lỗi khi lưu lô hàng: ${err.message || err}`, "error");
    }
  });

  // Chạy tính toán ban đầu
  updateCalculations();
}

// ==================== HELPERS FOR ITEMS TABLE ====================

function renderFormItemsTable() {
  if (formItems.length === 0) {
    return `
      <div style="text-align: center; padding: 36px 16px; color: #64748b; font-size: 13px; border: 1.5px dashed #cbd5e1; border-radius: 6px; background:#fff; margin: 4px 0;">
        <div style="font-size:32px; margin-bottom:8px;">📦</div>
        <div style="font-weight:600; font-size:13.5px; color:#334155;">Chưa có sản phẩm nào trong lô hàng</div>
        <div style="font-size:12px; color:#94a3b8; margin-top:3px;">Hãy chọn sản phẩm từ danh mục phía trên hoặc nhấn nút <strong>"Thêm vào lô"</strong></div>
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
          <th style="width:115px;">Mã sản phẩm</th>
          <th>Tên sản phẩm</th>
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
            : '---';

          return `
            <tr>
              <td style="text-align:center; color:#64748b;">${idx + 1}</td>
              <td style="font-weight:700; color:var(--amis-blue);">${escapeHtml(item.productCode || item.sku || '---')}</td>
              <td>
                <strong>${escapeHtml(item.productName || '---')}</strong>
                ${item.nameVi && item.nameVi !== item.productName ? `<div style="font-size:11px; color:#64748b; margin-top:2px; line-height:1.2;">${escapeHtml(item.nameVi)}</div>` : ''}
              </td>
              <td style="font-family:monospace; color:#475569;">${escapeHtml(item.hsCode || '---')}</td>
              <td>${escapeHtml(item.origin || '---')}</td>
              <td style="text-align:center;">${escapeHtml(item.unit || 'kg')}</td>
              <td style="text-align:right;">
                <input type="number" step="0.01" min="0" class="sd-table-input text-right item-qty" data-idx="${idx}" value="${item.quantity !== '' && item.quantity !== null && item.quantity !== undefined ? item.quantity : ''}" placeholder="0" style="width:95px; font-weight:600;">
              </td>
              <td style="text-align:right;">
                <input type="number" step="1" min="0" class="sd-table-input text-right item-packages" data-idx="${idx}" value="${item.packages !== '' && item.packages !== null && item.packages !== undefined ? item.packages : ''}" placeholder="0" style="width:75px; font-weight:600; color:#0266b3;">
              </td>
              <td style="text-align:right;">
                <input type="number" step="${isVnd ? '100' : '0.0001'}" min="0" class="sd-table-input text-right item-price" data-idx="${idx}" value="${item.unitPrice !== '' && item.unitPrice !== null && item.unitPrice !== undefined ? item.unitPrice : ''}" placeholder="0" style="width:95px; font-weight:600;">
              </td>
              <td style="text-align:right; font-weight:700; color:var(--amis-green); font-size:12.5px;">
                <span id="item-total-${idx}">${rowValFormatted}</span>
              </td>
              <td style="text-align:right;">
                <input type="number" step="0.01" min="0" class="sd-table-input text-right item-gw" data-idx="${idx}" value="${item.grossWeight !== '' && item.grossWeight !== null && item.grossWeight !== undefined ? item.grossWeight : ''}" placeholder="0" style="width:95px;">
              </td>
              <td style="text-align:center;">
                <button type="button" class="btn-remove-item" data-idx="${idx}" title="Xóa dòng sản phẩm" style="background:transparent; border:none; cursor:pointer; color:#ef4444; padding:4px; border-radius:4px; display:inline-flex; align-items:center;">
                  ${FORM_ICON.trash}
                </button>
              </td>
            </tr>
          `;
        }).join('')}
        <tr class="sd-total-row">
          <td colspan="6" style="text-align:right;">Tổng cộng (${formItems.length} dòng):</td>
          <td style="text-align:right; color:var(--amis-blue);" id="tblTotalQty">${totalQty > 0 ? `${totalQty.toLocaleString()} kg` : '0 kg'}</td>
          <td style="text-align:right; color:var(--amis-blue); font-weight:700;" id="tblTotalPackages">${totalPackages > 0 ? `${totalPackages.toLocaleString()} kiện` : '0 kiện'}</td>
          <td></td>
          <td style="text-align:right; color:var(--amis-green);" id="tblTotalVal">${isVnd ? `${Math.round(totalVal).toLocaleString('vi-VN')} ₫` : `$${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
          <td style="text-align:right;" id="tblTotalGw">${totalGw > 0 ? `${totalGw.toLocaleString()} kg` : '0 kg'}</td>
          <td></td>
        </tr>
      </tbody>
    </table>
    <div class="sd-table-toolbar">
      <div class="sd-table-toolbar-left">
        <button type="button" class="sd-btn-sm" id="btnQuickAddBlank" style="display:inline-flex; align-items:center; gap:4px;">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Thêm dòng mới
        </button>
      </div>
      <span style="font-size:11px; color:#64748b;">
        Tự động tính toán tổng số lượng NW, GW, Số kiện và Trị giá để đồng bộ hồ sơ
      </span>
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
        rowValEl.textContent = '---';
      }
    }
  });

  // Cập nhật tổng bảng
  const tblQty = document.getElementById('tblTotalQty');
  const tblPackages = document.getElementById('tblTotalPackages');
  const tblVal = document.getElementById('tblTotalVal');
  const tblGw = document.getElementById('tblTotalGw');
  if (tblQty) tblQty.textContent = totalQty > 0 ? `${totalQty.toLocaleString()} kg` : '0 kg';
  if (tblPackages) tblPackages.textContent = totalPackages > 0 ? `${totalPackages.toLocaleString()} kiện` : '0 kiện';
  if (tblVal) tblVal.textContent = isVnd
    ? `${Math.round(totalVal).toLocaleString('vi-VN')} ₫`
    : `$${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (tblGw) tblGw.textContent = totalGw > 0 ? `${totalGw.toLocaleString()} kg` : '0 kg';

  // Cập nhật sidebar & badge
  const sbVal = document.getElementById('sbTotalValue');
  const sbVnd = document.getElementById('sbTotalVnd');
  const sbQty = document.getElementById('sbTotalQty');
  const sbGw = document.getElementById('sbTotalGw');
  const sbItems = document.getElementById('sbTotalItems');
  const tabBadge = document.getElementById('tabItemsBadge');
  const itemsCountText = document.getElementById('itemsCountText');

  if (sbVal) sbVal.textContent = isVnd
    ? `${Math.round(totalVal).toLocaleString('vi-VN')} ₫`
    : `$${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (sbVnd) sbVnd.style.display = "none";
  if (sbQty) sbQty.textContent = totalQty > 0 ? totalQty.toLocaleString() : '0';
  if (sbGw) sbGw.textContent = totalGw > 0 ? totalGw.toLocaleString() : '0';
  if (sbItems) sbItems.textContent = formItems.length;
  if (tabBadge) tabBadge.textContent = formItems.length;
  if (itemsCountText) itemsCountText.textContent = `(${formItems.length})`;

  // Cập nhật input ở Thông số vận chuyển & đóng gói
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

  // Products table
  let productsHtml = '<div style="padding: 10px; color: #64748b;">Chưa có sản phẩm nào.</div>';
  if (data.items && data.items.length > 0) {
    productsHtml = `
      <table class="misa-table" style="margin-top: 8px; width: 100%;">
        <thead style="background: #f1f5f9;">
          <tr>
            <th>SKU</th>
            <th>Tên Sản Phẩm</th>
            <th>ĐVT</th>
            <th style="text-align:right;">Số Lượng</th>
            <th style="text-align:right;">Đơn Giá</th>
            <th style="text-align:right;">Thành Tiền</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map(i => {
            const priceStr = isVnd 
              ? `${Number(i.unitPrice || 0).toLocaleString('vi-VN')} ₫`
              : `$${Number(i.unitPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            const totalStr = isVnd 
              ? `${Number(i.totalValue || 0).toLocaleString('vi-VN')} ₫`
              : `$${Number(i.totalValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            return `
            <tr>
              <td><span style="font-family:monospace; font-weight:600; color:#0266b3;">${escapeHtml(i.sku || '-')}</span></td>
              <td><strong>${escapeHtml(i.productName || '-')}</strong></td>
              <td>${escapeHtml(i.unit || 'kg')}</td>
              <td style="text-align:right; font-family:monospace; font-weight:700;">${Number(i.quantity || 0).toLocaleString('vi-VN')}</td>
              <td style="text-align:right; font-family:monospace;">${priceStr}</td>
              <td style="text-align:right; font-family:monospace; font-weight:700; color:${isVnd ? '#1d4ed8' : '#059669'};">${totalStr}</td>
            </tr>
          `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  // Related documents layout
  container.innerHTML = `
    <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 20px;">
      <!-- Cột Trái: Sản phẩm -->
      <div>
        <h4 style="margin: 0 0 10px 0; color: #0266b3; border-bottom: 2px solid #0266b3; padding-bottom: 4px; display:inline-block; font-size:13px; font-weight:700;">
          📦 Sản phẩm thuộc lô (${data.items?.length || data.itemCount || 0})
        </h4>
        ${productsHtml}
      </div>

      <!-- Cột Phải: Chứng từ liên quan -->
      <div>
        <h4 style="margin: 0 0 10px 0; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; font-size:13px; font-weight:700;">
          📎 Chứng Từ & Vận Tải
        </h4>
        
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <!-- Bookings -->
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px;">
            <div style="font-weight: 600; color: #475569; margin-bottom: 6px; display:flex; align-items:center; gap: 6px; font-size:12.5px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> Bookings
            </div>
            ${data.bookings && data.bookings.length > 0 ?
              data.bookings.map(b => `<div style="font-size: 12px; line-height: 1.6;">• <strong style="color:#0266b3">${escapeHtml(b.bookingNumber)}</strong> | Hãng tàu: ${escapeHtml(b.shippingLine || '-')} | ETD: ${b.etd ? new Date(b.etd).toLocaleDateString('vi-VN') : '-'}</div>`).join('')
              : '<div style="font-size: 12px; color: #94a3b8;">Chưa có Booking</div>'}
          </div>

          <!-- Containers -->
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px;">
            <div style="font-weight: 600; color: #475569; margin-bottom: 6px; display:flex; align-items:center; gap: 6px; font-size:12.5px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg> Containers
            </div>
            ${data.containers && data.containers.length > 0 ?
              data.containers.map(c => `<div style="font-size: 12px; line-height: 1.6;">• <strong>${escapeHtml(c.containerNumber)}</strong> | Seal: ${escapeHtml(c.sealNumber || '-')} | Loại: ${escapeHtml(c.containerType || '-')}</div>`).join('')
              : '<div style="font-size: 12px; color: #94a3b8;">Chưa có Container</div>'}
          </div>

          <!-- Tờ khai HQ -->
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px;">
            <div style="font-weight: 600; color: #475569; margin-bottom: 6px; display:flex; align-items:center; gap: 6px; font-size:12.5px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> Tờ Khai Hải Quan
            </div>
            ${data.customsDeclarations && data.customsDeclarations.length > 0 ?
              data.customsDeclarations.map(c => `<div style="font-size: 12px; line-height: 1.6;">• <strong style="color:#b45309">${escapeHtml(c.declarationNumber)}</strong> | Ngày: ${c.declarationDate ? new Date(c.declarationDate).toLocaleDateString('vi-VN') : '-'} | Loại: ${escapeHtml(c.declarationType || '-')}</div>`).join('')
              : '<div style="font-size: 12px; color: #94a3b8;">Chưa có Tờ khai</div>'}
          </div>
        </div>
      </div>
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
