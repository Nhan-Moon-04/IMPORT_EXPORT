/**
 * Shipments Feature Module - Full CRUD & Status Transitions
 */
import { api, showToast, showConfirm, openModal, closeModal } from "../../core/api.js";

let shipmentsList = [];
let selectedId = null;
let currentShipmentFilter = 'All';

// Danh sách sản phẩm được chọn trong form (local state)
let formItems = []; // [{ productId, productName, sku, unit, quantity, unitPrice }]
let allProducts = []; // cache danh sách sản phẩm

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
  { id: 'value', label: 'Tổng Giá Trị', default: false },
  { id: 'status', label: 'Trạng Thái', default: true }
];

function getActiveColumns() {
  const saved = localStorage.getItem('xnk_shipment_columns');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  const initial = {};
  COLUMN_CONFIG.forEach(c => initial[c.id] = c.default);
  return initial;
}

function saveActiveColumns(cols) {
  localStorage.setItem('xnk_shipment_columns', JSON.stringify(cols));
}

export async function renderShipments(container, filterType = 'All') {
  selectedId = null;
  currentShipmentFilter = filterType;
  
  let title = "Tất cả Lô Hàng";
  if (filterType === 'Import') title = "Lô Hàng Nhập Khẩu";
  if (filterType === 'Export') title = "Lô Hàng Xuất Khẩu";

  container.innerHTML = `
    <div class="grid-card">
      <div class="misa-toolbar">
        <div class="toolbar-group">
          <button id="btnShipmentAdd" class="btn btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Thêm Lô hàng mới
          </button>
          <button id="btnShipmentEdit" class="btn btn-default" disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg> Sửa
          </button>
          <button id="btnShipmentStatus" class="btn btn-default" disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.21l-5.69 5.69"></path></svg> Đổi Trạng Thái
          </button>
          <button id="btnShipmentDelete" class="btn btn-default" style="color: var(--amis-red);" disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Xóa
          </button>
          <button id="btnShipmentRefresh" class="btn btn-default">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg> Nạp lại
          </button>
          <button id="btnConfigureColumns" class="btn btn-default" title="Tùy chọn các cột hiển thị trong bảng">
            ⚙️ Tùy chọn cột
          </button>
        </div>
        <div class="toolbar-group">
          <input type="text" id="shipmentSearchInput" class="form-input" style="width: 240px;" placeholder="Lọc mã lô, sản phẩm, đối tác, invoice...">
        </div>
      </div>

      <div class="grid-scroll">
        <table class="misa-table" id="shipmentsTable">
          <thead id="shipmentsThead">
            <!-- Dynamic Thead -->
          </tbody>
          <tbody id="shipmentsTbody">
            <tr><td colspan="12" style="text-align:center; padding: 24px;">Đang tải lô hàng...</td></tr>
          </tbody>
        </table>
      </div>

      <div class="misa-pagination">
        <div id="shipmentPaginationText">Tổng số: 0 bản ghi</div>
        <div class="pagination-controls"><span>Hiển thị 50 dòng/trang</span></div>
      </div>
    </div>
  `;

  setupShipmentEvents();
  await loadShipmentsData(currentShipmentFilter);
}

async function loadShipmentsData(filterType = 'All') {
  try {
    const res = await api.get("/api/shipments?pageSize=100");
    shipmentsList = res.data.items || [];

    if (filterType !== 'All') {
      shipmentsList = shipmentsList.filter(s => s.type === filterType);
    }

    renderShipmentsTable(shipmentsList);
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
    <th style="width: 36px; text-align:center;"><input type="checkbox"></th>
    <th style="width: 36px; text-align:center;"></th>
  `;
  if (cols.code) theadHtml += `<th>Mã Lô Hàng</th>`;
  if (cols.type) theadHtml += `<th>Loại Hình</th>`;
  if (cols.partner) theadHtml += `<th>Đối Tác</th>`;
  if (cols.products) theadHtml += `<th>Sản Phẩm</th>`;
  if (cols.quantity) theadHtml += `<th style="text-align:right;">Số Lượng (KG)</th>`;
  if (cols.invoices) theadHtml += `<th>Invoice</th>`;
  if (cols.declarations) theadHtml += `<th>Tờ Khai HQ</th>`;
  if (cols.containers) theadHtml += `<th>Container</th>`;
  if (cols.etd) theadHtml += `<th>ETD</th>`;
  if (cols.eta) theadHtml += `<th>ETA</th>`;
  if (cols.value) theadHtml += `<th style="text-align:right;">Tổng Giá Trị</th>`;
  if (cols.status) theadHtml += `<th>Trạng Thái</th>`;
  theadHtml += `<th>Thao Tác</th></tr>`;
  thead.innerHTML = theadHtml;

  // 2. Build Tbody
  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding: 24px; color: var(--text-muted)">Không có lô hàng nào.</td></tr>`;
    document.getElementById("shipmentPaginationText").textContent = "Tổng số: 0 bản ghi";
    return;
  }

  tbody.innerHTML = items.map(s => {
    const isCompleted = s.status === 'Completed';
    const statusMap = {
      Draft: "Bản nháp",
      PendingPayment: "Chờ thanh toán",
      Paid30: "Đã thanh toán 30%",
      Paid70: "Đã thanh toán 70%",
      PendingImport: "Chờ nhập hàng",
      Completed: "Đã hoàn thành",
      Cancelled: "Đã hủy"
    };
    const sLabel = statusMap[s.status] || s.status;
    const bgClass = isCompleted ? 'background: #f1f5f9; opacity: 0.85;' : '';

    const productText = (s.productNames && s.productNames.length > 0) 
      ? s.productNames.join(', ') 
      : (s.items?.[0]?.productName || '---');

    const invoiceText = (s.invoiceNumbers && s.invoiceNumbers.length > 0)
      ? s.invoiceNumbers.join(', ')
      : '---';

    const declText = (s.declarationNumbers && s.declarationNumbers.length > 0)
      ? s.declarationNumbers.join(', ')
      : '---';

    const contText = (s.containerNumbers && s.containerNumbers.length > 0)
      ? s.containerNumbers.join(', ')
      : '---';

    const etdText = s.bookings?.[0]?.etd ? new Date(s.bookings[0].etd).toLocaleDateString('vi-VN') : '---';
    const etaText = s.expectedDate ? new Date(s.expectedDate).toLocaleDateString('vi-VN') : '---';

    let rowHtml = `
    <tr data-id="${s.id}" class="shipment-main-row ${selectedId === s.id ? 'selected' : ''}" style="${bgClass}">
      <td style="text-align:center;"><input type="checkbox" class="row-checkbox" value="${s.id}" ${selectedId === s.id ? 'checked' : ''}></td>
      <td style="text-align:center; cursor:pointer;" class="expand-btn" data-id="${s.id}">
        <svg class="chevron-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transition: transform 0.2s;"><path d="M6 9l6 6 6-6"/></svg>
      </td>
    `;

    if (cols.code) {
      rowHtml += `
      <td style="cursor:pointer;" onclick="window.appNavigateTo('shipment-detail', '${s.id}')">
        <strong style="color:var(--amis-blue); text-decoration:underline;">${s.shipmentCode}</strong>
      </td>`;
    }
    if (cols.type) {
      rowHtml += `<td>${s.type === 'Import' ? '<span class="status-chip chip-transit" style="background:#e0f2fe; color:#0369a1;">📥 Nhập khẩu</span>' : '<span class="status-chip chip-delivered" style="background:#dcfce7; color:#15803d;">📤 Xuất khẩu</span>'}</td>`;
    }
    if (cols.partner) {
      rowHtml += `<td><strong>${s.supplierName || s.customerName || '-'}</strong></td>`;
    }
    if (cols.products) {
      rowHtml += `<td><span style="font-weight:600; color:#334155;">${productText}</span></td>`;
    }
    if (cols.quantity) {
      rowHtml += `<td style="text-align:right; font-weight:700;">${Number(s.totalQuantity || 222).toLocaleString()} kg</td>`;
    }
    if (cols.invoices) {
      rowHtml += `<td><span style="color:var(--amis-blue); font-weight:600;">${invoiceText}</span></td>`;
    }
    if (cols.declarations) {
      rowHtml += `<td><span style="font-family:monospace; color:#b45309; font-weight:600;">${declText}</span></td>`;
    }
    if (cols.containers) {
      rowHtml += `<td><span style="color:#475569; font-weight:600;">${contText}</span></td>`;
    }
    if (cols.etd) {
      rowHtml += `<td>${etdText}</td>`;
    }
    if (cols.eta) {
      rowHtml += `<td>${etaText}</td>`;
    }
    if (cols.value) {
      rowHtml += `<td style="text-align:right; font-weight:700; color:var(--amis-green);">$${Number(s.totalValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>`;
    }
    if (cols.status) {
      // Đọc trạng thái mới nhất từ timeline (localStorage)
      const tlEntries = (() => {
        try { return JSON.parse(localStorage.getItem(`xnk_timeline_${s.id}`) || '[]'); } catch { return []; }
      })();
      const latestText = tlEntries.length > 0 ? tlEntries[tlEntries.length - 1].text : null;

      if (latestText) {
        // Truncate nếu dài hơn 22 ký tự
        const MAX = 22;
        const display = latestText.length > MAX ? latestText.slice(0, MAX) + '…' : latestText;
        const needsTooltip = latestText.length > MAX;
        rowHtml += `<td>
          <span class="status-chip chip-warning" style="max-width:160px;display:inline-block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:middle;"
            ${needsTooltip ? `title="${latestText.replace(/"/g, '&quot;')}"` : ''}>
            ${display}
          </span>
        </td>`;
      } else {
        rowHtml += `<td><span class="status-chip ${isCompleted ? 'chip-delivered' : 'chip-warning'}">${sLabel}</span></td>`;
      }
    }

    rowHtml += `
      <td style="white-space: nowrap;">
        <button class="btn btn-default btn-sm" title="Chi tiết" onclick="window.appNavigateTo('shipment-detail', '${s.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button>
        <button class="btn btn-default btn-sm" title="Tải xuống tất cả file" onclick="window.xnkDownloadAllShipmentDocs('${s.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></button>
        ${isCompleted 
          ? `<button class="btn btn-default btn-sm" title="Mở khóa (Đổi trạng thái)" onclick="window.xnkStatusShipment('${s.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--amis-red)" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></button>`
          : `<button class="btn btn-default btn-sm" title="Sửa lô hàng" onclick="window.xnkEditShipment('${s.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg></button>`
        }
      </td>
    </tr>
    <!-- Hidden Expandable Row -->
    <tr id="expand-row-${s.id}" class="expand-row" style="display:none; background-color: #f8fafc; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
      <td colspan="12" style="padding: 0;">
        <div class="expand-content" id="expand-content-${s.id}" style="padding: 16px;">
          <div style="text-align:center; padding: 20px; color: #64748b;">Đang tải chi tiết...</div>
        </div>
      </td>
    </tr>
    `;
    return rowHtml;
  }).join('');

  document.getElementById("shipmentPaginationText").textContent = `Tổng số: ${items.length} bản ghi`;

  tbody.querySelectorAll(".shipment-main-row").forEach(tr => {
    tr.addEventListener("click", (e) => {
      if (e.target.tagName === "BUTTON") return;
      if (e.target.closest('.expand-btn')) {
        toggleExpandRow(tr.getAttribute("data-id"));
        return;
      }
      selectShipmentRow(tr.getAttribute("data-id"));
    });
  });
}

// ── Live-update cột Trạng Thái khi có entry timeline mới ──────────────────
window.addEventListener('xnk:timeline-updated', (e) => {
  const { shipmentId } = e.detail || {};
  if (!shipmentId) return;
  const mainRow = document.querySelector(`tr[data-id="${shipmentId}"].shipment-main-row`);
  if (!mainRow) return;
  const tlEntries = (() => {
    try { return JSON.parse(localStorage.getItem(`xnk_timeline_${shipmentId}`) || '[]'); } catch { return []; }
  })();
  const latestText = tlEntries.length > 0 ? tlEntries[tlEntries.length - 1].text : null;
  // Ô trạng thái là ô áp cuối (trước Thao tác)
  const cells = mainRow.querySelectorAll('td');
  const statusCell = cells[cells.length - 2];
  if (!statusCell || !latestText) return;
  const MAX = 22;
  const display = latestText.length > MAX ? latestText.slice(0, MAX) + '…' : latestText;
  statusCell.innerHTML = `<span class="status-chip chip-warning"
    style="max-width:160px;display:inline-block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:middle;"
    ${latestText.length > MAX ? `title="${latestText.replace(/"/g,'&quot;')}"` : ''}>${display}</span>`;
});

function selectShipmentRow(id) {
  selectedId = id;
  const tbody = document.getElementById("shipmentsTbody");
  if (!tbody) return;

  tbody.querySelectorAll("tr").forEach(tr => {
    const isCur = tr.getAttribute("data-id") === id;
    tr.classList.toggle("selected", isCur);
    const cb = tr.querySelector(".row-checkbox");
    if (cb) cb.checked = isCur;
  });

  document.getElementById("btnShipmentEdit").disabled = !id;
  document.getElementById("btnShipmentStatus").disabled = !id;
  document.getElementById("btnShipmentDelete").disabled = !id;
}

function setupShipmentEvents() {
  document.getElementById("btnShipmentRefresh")?.addEventListener("click", () => loadShipmentsData(currentShipmentFilter));
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
  
  // Real-time table search filtering
  document.getElementById("shipmentSearchInput")?.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      renderShipmentsTable(shipmentsList);
      return;
    }
    const filtered = shipmentsList.filter(s => {
      const codeMatch = s.shipmentCode?.toLowerCase().includes(q);
      const partnerMatch = (s.supplierName || s.customerName || '').toLowerCase().includes(q);
      const prodMatch = (s.productNames || []).some(p => p.toLowerCase().includes(q));
      const invMatch = (s.invoiceNumbers || []).some(inv => inv.toLowerCase().includes(q));
      const declMatch = (s.declarationNumbers || []).some(d => d.toLowerCase().includes(q));
      return codeMatch || partnerMatch || prodMatch || invMatch || declMatch;
    });
    renderShipmentsTable(filtered);
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

  // Load all data in parallel
  const [supRes, cusRes, prodRes] = await Promise.all([
    api.get("/api/suppliers?pageSize=200"),
    api.get("/api/customers?pageSize=200"),
    api.get("/api/products?pageSize=500")
  ]);

  const suppliers = supRes.data.items;
  const customers = cusRes.data.items;
  allProducts = prodRes.data.items;

  // Init form items from existing shipment items
  if (isEdit && s.items && s.items.length > 0) {
    formItems = s.items.map(i => ({
      productId: i.productId,
      productName: i.productName,
      sku: i.sku,
      unit: i.unit,
      quantity: i.quantity || 0,
      grossWeight: i.grossWeight || 0,
      unitPrice: i.unitPrice || 0
    }));
  } else if (isEdit) {
    // Fetch items if not loaded
    try {
      const itemsRes = await api.get(`/api/shipments/${id}/items`);
      formItems = (itemsRes.data || []).map(i => ({
        productId: i.productId,
        productName: i.productName,
        sku: i.sku,
        unit: i.unit,
        quantity: i.quantity || 0,
        grossWeight: i.grossWeight || 0,
        unitPrice: i.unitPrice || 0
      }));
    } catch { formItems = []; }
  } else {
    formItems = [];
  }

  const currentType = s?.type || 'Import';

  const isEditTitle = isEdit ? `Chỉnh sửa lô hàng` : `Thêm mới lô hàng`;

  container.innerHTML = `
    <div class="sd-page">
      <div class="sd-breadcrumb">
        <a href="#" onclick="window.appNavigateTo('shipments'); return false;">Tất cả lô hàng</a>
        <span class="sd-breadcrumb-sep">›</span>
        <span class="sd-breadcrumb-cur">${isEditTitle}</span>
      </div>

      <form id="shipmentForm" style="display:contents">
      <div class="sd-header">
        <div class="sd-header-row1" style="justify-content: space-between; align-items: center;">
          <div style="display:flex; align-items:center; gap: 16px;">
            <div class="sd-icon-box">🚢</div>
            <div class="sd-title-group">
              <input type="text" id="sCode" class="form-input" style="font-size:20px; font-weight:700; width: 280px; margin-bottom: 4px; padding: 4px 8px; border-radius:4px; border:1px solid #cbd5e1;" required value="${s?.shipmentCode || ''}" placeholder="Nhập Mã Lô Hàng *">
              <div class="sd-company" style="font-size:13px; color:#64748b; font-weight: 500;">
                Mã Lô Hàng XNK (Bắt buộc)
              </div>
            </div>
          </div>
          <div class="sd-header-actions">
            <button type="button" class="btn btn-default" onclick="window.appNavigateTo('shipments')">Hủy bỏ</button>
            <button type="button" id="btnSaveShipment" class="btn btn-primary">✔ Cất (Lưu)</button>
          </div>
        </div>
      </div>

      <div class="sd-infobar">
        <div class="sd-field">
          <div class="sd-field-label">Loại hình *</div>
          <select id="sType" class="form-select" style="width:100%; margin-top:4px; height:32px;">
            <option value="Import" ${currentType === 'Import' ? 'selected' : ''}>📥 Nhập khẩu</option>
            <option value="Export" ${currentType === 'Export' ? 'selected' : ''}>📤 Xuất khẩu</option>
          </select>
        </div>
        <div class="sd-field" id="supplierGroup" style="${currentType === 'Export' ? 'display:none;' : ''}">
          <div class="sd-field-label">Đối tác (NCC) *</div>
          <select id="sSupplierId" class="form-select" required style="width:100%; margin-top:4px; height:32px;">
            <option value="">-- Chọn Nhà Cung Cấp --</option>
            ${suppliers.map(sup => {
              const contactParts = [sup.contactPerson || sup.contactName, sup.phone].filter(Boolean);
              const contact = contactParts.join(' - ');
              return `<option value="${sup.id}" data-contact="${escapeHtml(contact)}" ${s?.supplierId === sup.id ? 'selected' : ''}>${sup.companyName} (${sup.country || 'VN'})</option>`;
            }).join('')}
          </select>
        </div>
        <div class="sd-field" id="customerGroup" style="${currentType === 'Import' ? 'display:none;' : ''}">
          <div class="sd-field-label">Đối tác (KH) *</div>
          <select id="sCustomerId" class="form-select" required style="width:100%; margin-top:4px; height:32px;">
            <option value="">-- Chọn Khách Hàng --</option>
            ${customers.map(c => {
              const contactParts = [c.contactPerson || c.contactName, c.phone].filter(Boolean);
              const contact = contactParts.join(' - ');
              return `<option value="${c.id}" data-contact="${escapeHtml(contact)}" ${s?.customerId === c.id ? 'selected' : ''}>${c.companyName}</option>`;
            }).join('')}
          </select>
        </div>
        <div class="sd-field">
          <div class="sd-field-label">Ngày tạo lập *</div>
          <input type="date" id="sCreatedAt" class="form-input" required value="${s?.createdAt ? s.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]}" style="width:100%; margin-top:4px; height:32px;">
        </div>
        <div class="sd-field">
          <div class="sd-field-label">Ngày dự kiến ETA</div>
          <input type="date" id="sExpectedDate" class="form-input" value="${s?.expectedDate ? s.expectedDate.split('T')[0] : ''}" style="width:100%; margin-top:4px; height:32px;">
        </div>
        <div class="sd-field">
          <div class="sd-field-label">Cảng xếp hàng (POL)</div>
          <input type="text" id="sPol" class="form-input" value="${s?.portOfLoading || 'Cat Lai Port, Ho Chi Minh City'}" style="width:100%; margin-top:4px; height:32px;">
        </div>
        <div class="sd-field">
          <div class="sd-field-label">Cảng dỡ hàng (POD)</div>
          <input type="text" id="sPod" class="form-input" value="${s?.portOfDischarge || 'Cat Lai Port, Ho Chi Minh City'}" style="width:100%; margin-top:4px; height:32px;">
        </div>
        <div class="sd-field">
          <div class="sd-field-label">Incoterm</div>
          <select id="sTerm" class="form-select" style="width:100%; margin-top:4px; height:32px;">
            <option value="CIF" ${(!s || s?.deliveryTerm === 'CIF') ? 'selected' : ''}>CIF</option>
            <option value="FOB" ${s?.deliveryTerm === 'FOB' ? 'selected' : ''}>FOB</option>
            <option value="EXW" ${s?.deliveryTerm === 'EXW' ? 'selected' : ''}>EXW</option>
            <option value="CFR" ${s?.deliveryTerm === 'CFR' ? 'selected' : ''}>CFR</option>
            <option value="DDP" ${s?.deliveryTerm === 'DDP' ? 'selected' : ''}>DDP</option>
          </select>
        </div>
        <div class="sd-field">
          <div class="sd-field-label">Người liên hệ *</div>
          <input type="text" id="sContactPerson" class="form-input" readonly value="${s?.contactPerson || ''}" style="width:100%; margin-top:4px; height:32px; background:#f8fafc; color:#64748b; border-color:#e2e8f0; cursor:not-allowed;" placeholder="Tự động liên kết">
        </div>
        <div class="sd-field">
          <div class="sd-field-label">Tổng SL NW (kg) *</div>
          <input type="number" step="0.01" id="sQty" class="form-input" required value="${s?.totalQuantity || ''}" style="width:100%; margin-top:4px; height:32px;">
        </div>
        <div class="sd-field">
          <div class="sd-field-label">Tổng TL GW (kg)</div>
          <input type="number" step="0.01" id="sGrossWeight" class="form-input" value="${s?.totalGrossWeight || ''}" style="width:100%; margin-top:4px; height:32px;">
        </div>
        <div class="sd-field">
          <div class="sd-field-label">Tổng trị giá (USD) *</div>
          <input type="number" step="0.01" id="sValue" class="form-input" required value="${s?.totalValue || ''}" style="width:100%; margin-top:4px; height:32px;">
        </div>
        <div class="sd-field" style="grid-column: span 3;">
          <div class="sd-field-label">Ghi chú</div>
          <input type="text" id="sNotes" class="form-input" value="${s?.notes || ''}" style="width:100%; margin-top:4px; height:32px;">
        </div>
      </div>

      <div class="sd-body" style="background:#fff; border-top:1px solid #e2e8f0;">
        <div class="sd-content" style="width:100%; border-right: none;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding: 24px 24px 0 24px;">
            <label class="form-label" style="margin: 0; font-size: 15px; font-weight: 700; color: var(--text-main);">
              Danh Sách Sản Phẩm Trong Lô
            </label>
            <div style="display: flex; gap: 8px; align-items: center;">
              <select id="productPickerSelect" class="form-select" style="width: 320px; font-size: 13px;">
                <option value="">-- Chọn sản phẩm để thêm --</option>
                ${allProducts.map(p => `<option value="${p.id}" data-name="${escapeHtml(p.name)}" data-sku="${escapeHtml(p.sku)}" data-unit="${escapeHtml(p.unit || '')}">${p.sku} - ${p.name}${p.unit ? ' (' + p.unit + ')' : ''}</option>`).join('')}
              </select>
              <button type="button" id="btnAddProduct" class="btn btn-primary" style="white-space: nowrap; font-size: 13px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Thêm dòng
              </button>
            </div>
          </div>
          <div id="shipmentItemsContainer" style="padding: 0 24px 24px 24px;">
            ${renderFormItemsTable()}
          </div>
        </div>
      </div>
      </form>
    </div>
  `;

  // Wire up type change to show/hide supplier/customer
  document.getElementById("sType").addEventListener("change", function() {
    const type = this.value;
    const supplierGroup = document.getElementById("supplierGroup");
    const customerGroup = document.getElementById("customerGroup");
    if (type === 'Import') {
      supplierGroup.style.display = '';
      customerGroup.style.display = 'none';
      document.getElementById("sCustomerId").value = '';
    } else {
      supplierGroup.style.display = 'none';
      customerGroup.style.display = '';
      document.getElementById("sSupplierId").value = '';
    }
  });

  const onPartnerChange = (e) => {
    const sel = e.target;
    const opt = sel.options[sel.selectedIndex];
    if (opt && opt.value) {
      const contact = opt.getAttribute("data-contact");
      if (contact) {
        document.getElementById("sContactPerson").value = contact;
      }
    }
  };
  document.getElementById("sSupplierId").addEventListener("change", onPartnerChange);
  document.getElementById("sCustomerId").addEventListener("change", onPartnerChange);

  // Khởi tạo liên kết data khi mở form
  if (currentType === 'Import') {
    document.getElementById("sSupplierId").dispatchEvent(new Event('change'));
  } else {
    document.getElementById("sCustomerId").dispatchEvent(new Event('change'));
  }

  // Wire up add product button
  document.getElementById("btnAddProduct").addEventListener("click", async () => {
    const sel = document.getElementById("productPickerSelect");
    const opt = sel.options[sel.selectedIndex];
    if (!opt || !opt.value) {
      showToast("Vui lòng chọn sản phẩm", "error");
      return;
    }
    const pid = opt.value;
    const already = formItems.find(i => i.productId === pid);
    if (already) {
      showToast("Sản phẩm này đã được thêm vào lô hàng", "error");
      return;
    }
    formItems.push({
      productId: pid,
      productName: opt.getAttribute("data-name"),
      sku: opt.getAttribute("data-sku"),
      unit: opt.getAttribute("data-unit"),
      quantity: 0,
      grossWeight: 0,
      unitPrice: 0
    });
    sel.value = "";
    refreshFormItemsTable();
    updateTotalFields();
  });

  // Wire up global remove/input handlers (delegated)
  document.getElementById("shipmentItemsContainer").addEventListener("click", async (e) => {
    const btn = e.target.closest(".btn-remove-item");
    if (btn) {
      const idx = parseInt(btn.getAttribute("data-idx"));
      formItems.splice(idx, 1);
      refreshFormItemsTable();
      updateTotalFields();
    }
  });

  document.getElementById("shipmentItemsContainer").addEventListener("input", (e) => {
    const inp = e.target;
    if (inp.classList.contains("item-qty")) {
      const idx = parseInt(inp.getAttribute("data-idx"));
      formItems[idx].quantity = parseFloat(inp.value) || 0;
      updateItemTotal(idx);
      updateTotalFields();
    }
    if (inp.classList.contains("item-gw")) {
      const idx = parseInt(inp.getAttribute("data-idx"));
      formItems[idx].grossWeight = parseFloat(inp.value) || 0;
      updateTotalFields();
    }
    if (inp.classList.contains("item-price")) {
      const idx = parseInt(inp.getAttribute("data-idx"));
      formItems[idx].unitPrice = parseFloat(inp.value) || 0;
      updateItemTotal(idx);
      updateTotalFields();
    }
  });



  document.getElementById("btnSaveShipment").onclick = async () => {
    const shipmentCode = document.getElementById("sCode").value.trim();
    if (!shipmentCode) {
      showToast("Vui lòng nhập mã lô hàng", "error");
      return;
    }

    const contactPerson = document.getElementById("sContactPerson").value.trim();
    if (!contactPerson) {
      showToast("Vui lòng nhập Người liên hệ", "error");
      return;
    }

    const sType = document.getElementById("sType").value;
    if (sType === 'Import' && !document.getElementById("sSupplierId")?.value) {
      showToast("Vui lòng chọn Đối tác NCC", "error");
      return;
    }
    if (sType === 'Export' && !document.getElementById("sCustomerId")?.value) {
      showToast("Vui lòng chọn Đối tác Khách hàng", "error");
      return;
    }

    const payload = {
      shipmentCode,
      type: sType,
      expectedDate: document.getElementById("sExpectedDate").value ? new Date(document.getElementById("sExpectedDate").value).toISOString() : null,
      createdAt: document.getElementById("sCreatedAt").value ? new Date(document.getElementById("sCreatedAt").value).toISOString() : null,
      supplierId: document.getElementById("sSupplierId")?.value || null,
      customerId: document.getElementById("sCustomerId")?.value || null,
      portOfLoading: document.getElementById("sPol").value.trim() || null,
      portOfDischarge: document.getElementById("sPod").value.trim() || null,
      deliveryTerm: document.getElementById("sTerm").value,
      contactPerson,
      totalQuantity: parseFloat(document.getElementById("sQty").value) || 0,
      totalGrossWeight: parseFloat(document.getElementById("sGrossWeight").value) || 0,
      totalValue: parseFloat(document.getElementById("sValue").value) || 0,
      currency: "USD",
      notes: document.getElementById("sNotes").value.trim() || null
    };

    try {
      let savedId = id;
      if (isEdit) {
        await api.put(`/api/shipments/${s.id}`, payload);
        showToast("Cập nhật lô hàng thành công!");
      } else {
        const createRes = await api.post("/api/shipments", payload);
        savedId = createRes.data?.id;
        showToast("Tạo lô hàng mới thành công!");
      }

      // Save items nếu có
      if (savedId && formItems.length > 0) {
        const itemsPayload = {
          items: formItems.map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            netWeight: i.quantity,
            grossWeight: i.grossWeight,
            unitPrice: i.unitPrice
          }))
        };
        await api.post(`/api/shipments/${savedId}/items`, itemsPayload);
      } else if (savedId && formItems.length === 0 && isEdit) {
        // Xóa hết items nếu người dùng xóa hết
        await api.post(`/api/shipments/${savedId}/items`, { items: [] });
      }

      window.appNavigateTo('shipment-detail', savedId);
    } catch (err) {
      // Handled
    }
  };
}

// ==================== HELPERS FOR ITEMS TABLE ====================
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderFormItemsTable() {
  if (formItems.length === 0) {
    return `
      <div style="text-align: center; padding: 20px 0; color: var(--text-muted); font-size: 13px; border: 1.5px dashed var(--border-color); border-radius: 8px;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="display:block; margin: 0 auto 8px;"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>
        Chưa có sản phẩm nào. Hãy chọn sản phẩm từ danh sách bên trên.
      </div>`;
  }

  const grandTotal = formItems.reduce((sum, i) => sum + ((i.quantity || 0) * (i.unitPrice || 0)), 0);

  return `
    <table style="width:100%; border-collapse:collapse; font-size:13px;">
      <thead>
        <tr style="background:var(--bg-surface-alt);">
          <th style="width:40px;">#</th>
          <th>Sản Phẩm (SKU)</th>
          <th style="width:80px;">Đơn vị</th>
          <th style="width:120px;">Số Lượng NW</th>
          <th style="width:120px;">Trọng lượng GW</th>
          <th style="width:120px;">Đơn Giá (USD)</th>
          <th style="width:140px;">Thành Tiền</th>
          <th style="width:50px;"></th>
        </tr>
      </thead>
      <tbody>
        ${formItems.map((item, idx) => `
          <tr>
            <td style="font-size:12px; color:var(--text-muted);">${idx + 1}</td>
            <td>
              <div style="font-weight:600; font-size:13px;">${escapeHtml(item.productName)}</div>
              <div style="font-size:11px; color:var(--text-muted);">${escapeHtml(item.sku)}</div>
            </td>
            <td>${escapeHtml(item.unit)}</td>
            <td><input type="number" step="0.01" class="form-input item-qty" data-idx="${idx}" value="${item.quantity}" style="width:100px;"></td>
            <td><input type="number" step="0.01" class="form-input item-gw" data-idx="${idx}" value="${item.grossWeight || ''}" style="width:100px;"></td>
            <td><input type="number" step="0.0001" class="form-input item-price" data-idx="${idx}" value="${item.unitPrice}" style="width:100px;"></td>
            <td style="font-weight:700; color:var(--misa-blue);">$<span id="item-total-${idx}">${Number((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></td>
            <td><button type="button" class="btn btn-default btn-sm btn-remove-item" data-idx="${idx}" style="color:var(--amis-red); border-color:#fecaca;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button></td>
          </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr style="border-top: 2px solid var(--border-color); background: var(--bg-hover, #f8fafc);">
          <td colspan="6" style="padding: 8px; text-align:right; font-weight:700; font-size:13px;">Tổng cộng:</td>
          <td id="grandTotal" style="padding: 8px; text-align:right; font-weight:700; color:var(--amis-blue); font-size:14px;">$${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  `;
}

function refreshFormItemsTable() {
  const container = document.getElementById("shipmentItemsContainer");
  if (container) container.innerHTML = renderFormItemsTable();
}

function updateItemTotal(idx) {
  const item = formItems[idx];
  const t = (item.quantity || 0) * (item.unitPrice || 0);
  const el = document.getElementById(`item-total-${idx}`);
  if (el) el.textContent = Number(t).toLocaleString('en-US', { minimumFractionDigits: 2 });

  const grandTotal = formItems.reduce((sum, i) => sum + ((i.quantity || 0) * (i.unitPrice || 0)), 0);
  const gtCell = document.getElementById("grandTotal");
  if (gtCell) gtCell.textContent = `$${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function updateTotalFields() {
  let totalQty = 0;
  let totalGw = 0;
  let totalVal = 0;
  for (const item of formItems) {
    totalQty += (item.quantity || 0);
    totalGw += (item.grossWeight || 0);
    totalVal += (item.quantity || 0) * (item.unitPrice || 0);
  }
  const qtyEl = document.getElementById("sQty");
  const gwEl = document.getElementById("sGrossWeight");
  const valEl = document.getElementById("sValue");
  if (qtyEl) qtyEl.value = totalQty > 0 ? totalQty : '';
  if (gwEl) gwEl.value = totalGw > 0 ? totalGw : '';
  if (valEl) valEl.value = totalVal > 0 ? totalVal : '';
}

// ==================== STATUS MODAL ====================
window.xnkStatusShipment = openStatusModal;
async function openStatusModal(id) {
  let s = shipmentsList.find(x => x.id === id);
  if (!s) {
    try {
      s = (await api.get(`/api/shipments/${id}`)).data;
    } catch (e) {
      showToast("Lỗi", "error"); return;
    }
  }

  window.openModal();

  const title = document.getElementById("modalTitle");
  const tabs = document.getElementById("modalTabs");
  const body = document.getElementById("modalBody");
  const footer = document.getElementById("modalFooter");

  if (tabs) tabs.style.display = "none";
  title.innerHTML = `🔄 Chuyển Trạng Thái: <strong>${s.shipmentCode}</strong>`;

  body.innerHTML = `
    <div style="padding: 10px 0;">
      <label class="form-label required">Chọn Trạng Thái Mới</label>
      <select id="newStatusSelect" class="form-select" style="font-size: 14px; padding: 8px;">
        <option value="Draft">Draft (Bản nháp)</option>
        <option value="PendingPayment">Chờ thanh toán</option>
        <option value="Paid30">Đã thanh toán 30%</option>
        <option value="Paid70">Đã thanh toán 70%</option>
        <option value="PendingImport">Chờ nhập hàng</option>
        <option value="Completed">Đã hoàn thành</option>
        <option value="Cancelled">Đã hủy</option>
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
      await loadShipmentsData();
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
  const icon = tr.querySelector('.chevron-icon');

  if (!expandRow || !tr || !icon) return;

  const isExpanded = expandRow.style.display !== 'none';

  if (isExpanded) {
    // Collapse
    expandRow.style.display = 'none';
    icon.style.transform = 'rotate(0deg)';
  } else {
    // Expand
    expandRow.style.display = 'table-row';
    icon.style.transform = 'rotate(90deg)';
    
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
  // We want a tabbed or grid layout for Invoice, Declaration, Booking, Container, Products
  const formatter = new Intl.NumberFormat('en-US');
  
  // Products table
  let productsHtml = '<div style="padding: 10px; color: #64748b;">Chưa có sản phẩm nào.</div>';
  if (data.items && data.items.length > 0) {
    productsHtml = `
      <table class="misa-table" style="margin-top: 8px;">
        <thead style="background: #f1f5f9;">
          <tr>
            <th>SKU</th>
            <th>Tên Sản Phẩm</th>
            <th>ĐVT</th>
            <th>Số Lượng</th>
            <th>Đơn Giá</th>
            <th>Thành Tiền</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map(i => `
            <tr>
              <td>${i.sku || '-'}</td>
              <td>${i.productName || '-'}</td>
              <td>${i.unit || '-'}</td>
              <td>${formatter.format(i.quantity || 0)}</td>
              <td>$${formatter.format(i.unitPrice || 0)}</td>
              <td><strong>$${formatter.format(i.totalValue || 0)}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  // Related documents layout
  container.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding: 8px 16px;">
      
      <!-- Cột Trái: Sản phẩm -->
      <div>
        <h4 style="margin: 0 0 12px 0; color: var(--amis-blue); border-bottom: 2px solid var(--amis-blue); padding-bottom: 4px; display:inline-block;">Sản phẩm thuộc lô (${data.itemCount || 0})</h4>
        ${productsHtml}
      </div>

      <!-- Cột Phải: Chứng từ liên quan -->
      <div>
        <h4 style="margin: 0 0 12px 0; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px;">Chứng Từ & Vận Tải</h4>
        
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <!-- Bookings -->
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px;">
            <div style="font-weight: 600; color: #475569; margin-bottom: 8px; display:flex; align-items:center; gap: 6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> Bookings
            </div>
            ${data.bookings && data.bookings.length > 0 ? 
              data.bookings.map(b => `<div style="font-size: 13px;">• <strong style="color:var(--amis-blue)">${b.bookingNumber}</strong> | Hãng tàu: ${b.shippingLine || '-'} | ETD: ${b.etd ? new Date(b.etd).toLocaleDateString('vi-VN') : '-'}</div>`).join('') 
              : '<div style="font-size: 13px; color: #94a3b8;">Chưa có Booking</div>'}
          </div>

          <!-- Containers -->
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px;">
            <div style="font-weight: 600; color: #475569; margin-bottom: 8px; display:flex; align-items:center; gap: 6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg> Containers
            </div>
            ${data.containers && data.containers.length > 0 ? 
              data.containers.map(c => `<div style="font-size: 13px;">• <strong>${c.containerNumber}</strong> | Seal: ${c.sealNumber || '-'} | Loại: ${c.containerType || '-'}</div>`).join('') 
              : '<div style="font-size: 13px; color: #94a3b8;">Chưa có Container</div>'}
          </div>

          <!-- Tờ khai -->
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px;">
            <div style="font-weight: 600; color: #475569; margin-bottom: 8px; display:flex; align-items:center; gap: 6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> Tờ Khai Hải Quan
            </div>
            ${data.customsDeclarations && data.customsDeclarations.length > 0 ? 
              data.customsDeclarations.map(c => `<div style="font-size: 13px;">• <strong style="color:var(--amis-blue)">${c.declarationNumber}</strong> | Ngày: ${c.declarationDate ? new Date(c.declarationDate).toLocaleDateString('vi-VN') : '-'} | Loại: ${c.declarationType || '-'}</div>`).join('') 
              : '<div style="font-size: 13px; color: #94a3b8;">Chưa có Tờ khai</div>'}
          </div>
          
        </div>
      </div>
    </div>
  `;
}

window.xnkDownloadAllShipmentDocs = async function(shipmentId) {
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
                <span style="font-size:11px; color:#94a3b8; margin-left:8px;">(${(d.fileSize/1024).toFixed(1)} KB)</span>
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
        } catch(e) {}
      }
      showToast('Đã tải xuống ' + count + ' file.', 'success');
      window.closeModal();
    });
  } catch(e) {
    showToast('Lỗi tải danh sách file', 'error');
  }
};
