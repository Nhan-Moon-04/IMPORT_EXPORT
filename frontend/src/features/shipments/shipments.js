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
    try { return JSON.parse(saved); } catch (e) { }
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

    const searchVal = document.getElementById("shipmentSearchInput")?.value?.toLowerCase().trim();
    if (searchVal) {
      const filtered = shipmentsList.filter(s => {
        const codeMatch = s.shipmentCode?.toLowerCase().includes(searchVal);
        const partnerMatch = (s.supplierName || s.customerName || '').toLowerCase().includes(searchVal);
        const prodMatch = (s.productNames || []).some(p => p.toLowerCase().includes(searchVal));
        const invMatch = (s.invoiceNumbers || []).some(inv => inv.toLowerCase().includes(searchVal));
        const declMatch = (s.declarationNumbers || []).some(d => d.toLowerCase().includes(searchVal));
        return codeMatch || partnerMatch || prodMatch || invMatch || declMatch;
      });
      renderShipmentsTable(filtered);
    } else {
      renderShipmentsTable(shipmentsList);
    }
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
    ${latestText.length > MAX ? `title="${latestText.replace(/"/g, '&quot;')}"` : ''}>${display}</span>`;
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
  const [supRes, cusRes, prodRes] = await Promise.all([
    api.get("/api/suppliers?pageSize=200"),
    api.get("/api/customers?pageSize=200"),
    api.get("/api/products?pageSize=500")
  ]);

  const suppliers = supRes.data?.items || supRes.data || [];
  const customers = cusRes.data?.items || cusRes.data || [];
  allProducts = prodRes.data?.items || prodRes.data || [];

  // Khởi tạo formItems từ dữ liệu cũ nếu edit
  if (isEdit && s.items && s.items.length > 0) {
    formItems = s.items.map(i => {
      const p = allProducts.find(x => x.id === i.productId);
      return {
        productId: i.productId,
        productCode: i.sku || i.productCode || p?.sku || '---',
        productName: i.productName || p?.name || '---',
        sku: i.sku || p?.sku || '---',
        hsCode: i.hsCode || p?.hsCode || '5402.47.00',
        origin: i.origin || p?.countryOfOrigin || 'Taiwan',
        unit: i.unit || p?.unit || 'kg',
        quantity: Number(i.quantity || 0),
        unitPrice: Number(i.unitPrice || 0),
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
        return {
          productId: i.productId,
          productCode: i.sku || i.productCode || p?.sku || '---',
          productName: i.productName || p?.name || '---',
          sku: i.sku || p?.sku || '---',
          hsCode: i.hsCode || p?.hsCode || '5402.47.00',
          origin: i.origin || p?.countryOfOrigin || 'Taiwan',
          unit: i.unit || p?.unit || 'kg',
          quantity: Number(i.quantity || 0),
          unitPrice: Number(i.unitPrice || 0),
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
                  <span style="font-size:13px; font-weight:700; color:var(--text-main);">
                    Danh sách hàng hóa <span style="font-weight:400; color:#64748b;" id="itemsCountText">(${formItems.length})</span>
                  </span>
                  <div style="display:flex; gap:8px; align-items:center;">
                    <select id="productPickerSelect" class="sd-form-select" style="min-width:320px; height:32px; font-size:12px;">
                      <option value="">-- Chọn sản phẩm thêm vào lô hàng --</option>
                      ${allProducts.map(p => `
                        <option value="${p.id}" data-sku="${escapeHtml(p.sku)}" data-name="${escapeHtml(p.name)}" data-unit="${escapeHtml(p.unit || 'kg')}" data-hscode="${escapeHtml(p.hsCode || '5402.47.00')}" data-origin="${escapeHtml(p.countryOfOrigin || 'Taiwan')}" data-price="${p.unitPrice || p.standardPrice || 1.0}">
                          [${escapeHtml(p.sku)}] ${escapeHtml(p.name)} (${p.unit || 'kg'})
                        </option>
                      `).join('')}
                    </select>
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
            <div class="sd-price-amount" id="sbTotalValue">$${Number(initVal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="sd-price-vnd" id="sbTotalVnd">≈ ${(Number(initVal) * 25450).toLocaleString('vi-VN')} ₫</div>
            <div class="sd-price-meta">
              <div>Đơn vị tiền tệ: <strong>USD</strong></div>
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

  // Chuyển loại hình (Import / Export)
  document.getElementById("sType")?.addEventListener("change", function () {
    const type = this.value;
    const supField = document.getElementById("supplierField");
    const cusField = document.getElementById("customerField");
    const badgeType = document.getElementById("headerTypeBadge");

    if (type === 'Import') {
      supField.style.display = '';
      cusField.style.display = 'none';
      if (badgeType) {
        badgeType.className = 'chip chip-blue';
        badgeType.textContent = 'Nhập khẩu';
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
      document.getElementById("sPol").value = 'Cat Lai Port, Ho Chi Minh City';
      document.getElementById("sPod").value = 'Tokyo Port, Japan';
      document.getElementById("sCustomerId")?.dispatchEvent(new Event('change'));
    }
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

  // Thêm sản phẩm từ select box
  document.getElementById("btnAddProduct")?.addEventListener("click", () => {
    const sel = document.getElementById("productPickerSelect");
    const opt = sel.options[sel.selectedIndex];
    if (!opt || !opt.value) {
      showToast("Vui lòng chọn một sản phẩm từ danh mục", "error");
      return;
    }
    const pid = opt.value;
    const already = formItems.find(i => i.productId === pid);
    if (already) {
      showToast("Sản phẩm này đã có trong danh sách lô hàng", "warning");
      return;
    }

    formItems.push({
      productId: pid,
      productCode: opt.getAttribute("data-sku") || '---',
      productName: opt.getAttribute("data-name") || '---',
      sku: opt.getAttribute("data-sku") || '---',
      hsCode: opt.getAttribute("data-hscode") || '5402.47.00',
      origin: opt.getAttribute("data-origin") || 'Taiwan',
      unit: opt.getAttribute("data-unit") || 'kg',
      quantity: 100,
      unitPrice: parseFloat(opt.getAttribute("data-price")) || 1.5,
      netWeight: 100,
      grossWeight: 10,
      notes: ''
    });

    sel.value = "";
    refreshFormItemsTable();
    updateCalculations();
    showToast("Đã thêm sản phẩm vào lô hàng", "success");
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
      formItems.push({
        productId: defProd?.id || `custom-${Date.now()}`,
        productCode: defProd?.sku || 'NEW-SKU',
        productName: defProd?.name || 'Mặt hàng sợi chỉ dệt',
        sku: defProd?.sku || 'NEW-SKU',
        hsCode: defProd?.hsCode || '5402.47.00',
        origin: defProd?.countryOfOrigin || 'Taiwan',
        unit: defProd?.unit || 'kg',
        quantity: 50,
        unitPrice: 2.0,
        netWeight: 50,
        grossWeight: 5,
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
      const val = parseFloat(inp.value) || 0;
      formItems[idx].quantity = val;
      formItems[idx].netWeight = val;
    }
    if (inp.classList.contains("item-price")) {
      formItems[idx].unitPrice = parseFloat(inp.value) || 0;
    }
    if (inp.classList.contains("item-gw")) {
      formItems[idx].grossWeight = parseFloat(inp.value) || 0;
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
      currency: "USD",
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
          items: formItems.map(i => ({
            productId: i.productId.startsWith('custom-') ? allProducts[0]?.id : i.productId,
            quantity: i.quantity,
            netWeight: i.netWeight || i.quantity,
            grossWeight: i.grossWeight,
            unitPrice: i.unitPrice
          }))
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
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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

  const totalQty = formItems.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
  const totalGw = formItems.reduce((s, i) => s + (Number(i.grossWeight) || 0), 0);
  const totalVal = formItems.reduce((s, i) => s + ((Number(i.quantity) || 0) * (Number(i.unitPrice) || 0)), 0);

  return `
    <table class="sd-table">
      <thead>
        <tr>
          <th style="width:36px; text-align:center;">#</th>
          <th style="width:115px;">Mã sản phẩm</th>
          <th>Tên sản phẩm</th>
          <th style="width:95px;">HS Code</th>
          <th style="width:85px;">Xuất xứ</th>
          <th style="width:60px; text-align:center;">ĐVT</th>
          <th style="width:115px; text-align:right;">Số lượng (NW)</th>
          <th style="width:115px; text-align:right;">Đơn giá ($)</th>
          <th style="width:130px; text-align:right;">Thành tiền ($)</th>
          <th style="width:115px; text-align:right;">Gross Weight (kg)</th>
          <th style="width:50px; text-align:center;">Xóa</th>
        </tr>
      </thead>
      <tbody>
        ${formItems.map((item, idx) => {
          const q = Number(item.quantity) || 0;
          const p = Number(item.unitPrice) || 0;
          const rowVal = q * p;
          return `
            <tr>
              <td style="text-align:center; color:#64748b;">${idx + 1}</td>
              <td style="font-weight:700; color:var(--amis-blue);">${escapeHtml(item.productCode || item.sku)}</td>
              <td><strong>${escapeHtml(item.productName)}</strong></td>
              <td style="font-family:monospace; color:#475569;">${escapeHtml(item.hsCode || '---')}</td>
              <td>${escapeHtml(item.origin || '---')}</td>
              <td style="text-align:center;">${escapeHtml(item.unit || 'kg')}</td>
              <td style="text-align:right;">
                <input type="number" step="0.01" class="sd-table-input text-right item-qty" data-idx="${idx}" value="${item.quantity}" style="width:95px; font-weight:600;">
              </td>
              <td style="text-align:right;">
                <input type="number" step="0.0001" class="sd-table-input text-right item-price" data-idx="${idx}" value="${item.unitPrice}" style="width:95px;">
              </td>
              <td style="text-align:right; font-weight:700; color:var(--amis-green); font-size:12.5px;">
                $<span id="item-total-${idx}">${rowVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </td>
              <td style="text-align:right;">
                <input type="number" step="0.01" class="sd-table-input text-right item-gw" data-idx="${idx}" value="${item.grossWeight || ''}" style="width:95px;">
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
          <td style="text-align:right; color:var(--amis-blue);" id="tblTotalQty">${totalQty.toLocaleString()} kg</td>
          <td></td>
          <td style="text-align:right; color:var(--amis-green);" id="tblTotalVal">$${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align:right;" id="tblTotalGw">${totalGw.toLocaleString()} kg</td>
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
        Tự động tính toán tổng số lượng NW, GW và Trị giá để đồng bộ hồ sơ
      </span>
    </div>
  `;
}

function refreshFormItemsTable() {
  const container = document.getElementById("shipmentItemsContainer");
  if (container) container.innerHTML = renderFormItemsTable();
}

function updateCalculations() {
  let totalQty = 0;
  let totalGw = 0;
  let totalVal = 0;

  formItems.forEach((item, idx) => {
    const q = Number(item.quantity) || 0;
    const p = Number(item.unitPrice) || 0;
    const gw = Number(item.grossWeight) || 0;
    const rowVal = q * p;
    totalQty += q;
    totalGw += gw;
    totalVal += rowVal;

    const rowValEl = document.getElementById(`item-total-${idx}`);
    if (rowValEl) {
      rowValEl.textContent = rowVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  });

  // Cập nhật tổng bảng
  const tblQty = document.getElementById('tblTotalQty');
  const tblVal = document.getElementById('tblTotalVal');
  const tblGw = document.getElementById('tblTotalGw');
  if (tblQty) tblQty.textContent = `${totalQty.toLocaleString()} kg`;
  if (tblVal) tblVal.textContent = `$${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (tblGw) tblGw.textContent = `${totalGw.toLocaleString()} kg`;

  // Cập nhật sidebar & badge
  const sbVal = document.getElementById('sbTotalValue');
  const sbVnd = document.getElementById('sbTotalVnd');
  const sbQty = document.getElementById('sbTotalQty');
  const sbGw = document.getElementById('sbTotalGw');
  const sbItems = document.getElementById('sbTotalItems');
  const tabBadge = document.getElementById('tabItemsBadge');
  const itemsCountText = document.getElementById('itemsCountText');

  if (sbVal) sbVal.textContent = `$${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (sbVnd) sbVnd.textContent = `≈ ${(totalVal * 25450).toLocaleString('vi-VN')} ₫`;
  if (sbQty) sbQty.textContent = totalQty.toLocaleString();
  if (sbGw) sbGw.textContent = totalGw.toLocaleString();
  if (sbItems) sbItems.textContent = formItems.length;
  if (tabBadge) tabBadge.textContent = formItems.length;
  if (itemsCountText) itemsCountText.textContent = `(${formItems.length})`;

  // Cập nhật input ẩn / hiển thị
  const sQty = document.getElementById('sQty');
  const sGw = document.getElementById('sGrossWeight');
  const sVal = document.getElementById('sValue');
  if (sQty && totalQty > 0) sQty.value = totalQty;
  if (sGw && totalGw > 0) sGw.value = totalGw;
  if (sVal) sVal.value = totalVal;
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
