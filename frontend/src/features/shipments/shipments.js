/**
 * Shipments Feature Module - Full CRUD & Status Transitions
 */
import { api, showToast } from "../../core/api.js";

let shipmentsList = [];
let selectedId = null;

export async function renderShipments(container) {
  selectedId = null;
  container.innerHTML = `
    <div class="grid-card">
      <div class="misa-toolbar">
        <div class="toolbar-group">
          <button id="btnShipmentAdd" class="btn btn-primary">+ Thêm mới Lô hàng</button>
          <button id="btnShipmentEdit" class="btn btn-blue" disabled>✏️ Sửa</button>
          <button id="btnShipmentStatus" class="btn btn-default" disabled>🔄 Đổi Trạng Thái</button>
          <button id="btnShipmentDelete" class="btn btn-danger" disabled>🗑️ Xóa</button>
          <button id="btnShipmentRefresh" class="btn btn-default">🔄 Nạp lại</button>
        </div>
        <div class="toolbar-group">
          <input type="text" id="shipmentSearchInput" class="form-input" style="width: 220px;" placeholder="Lọc mã lô, cảng...">
        </div>
      </div>

      <div class="grid-scroll">
        <table class="misa-table" id="shipmentsTable">
          <thead>
            <tr>
              <th style="width: 40px; text-align:center;"><input type="checkbox"></th>
              <th>Mã Lô Hàng</th>
              <th>Loại Hình</th>
              <th>Đối Tác (NCC / Khách)</th>
              <th>Cảng Đi ➔ Cảng Đến</th>
              <th>Điều Kiện (Incoterm)</th>
              <th>Số Lượng (kg)</th>
              <th>Tổng Giá Trị</th>
              <th>Trạng Thái</th>
              <th>Ngày Dự Kiến (ETA)</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody id="shipmentsTbody">
            <tr><td colspan="11" style="text-align:center; padding: 24px;">Đang tải lô hàng...</td></tr>
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
  await loadShipmentsData();
}

async function loadShipmentsData() {
  try {
    const res = await api.get("/api/shipments?pageSize=100");
    shipmentsList = res.data.items;
    renderShipmentsTable(shipmentsList);
  } catch (err) {
    // Handled
  }
}

function renderShipmentsTable(items) {
  const tbody = document.getElementById("shipmentsTbody");
  if (!tbody) return;

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding: 24px; color: var(--text-muted)">Không có lô hàng nào.</td></tr>`;
    document.getElementById("shipmentPaginationText").textContent = "Tổng số: 0 bản ghi";
    return;
  }

  tbody.innerHTML = items.map(s => `
    <tr data-id="${s.id}" class="${selectedId === s.id ? 'selected' : ''}">
      <td style="text-align:center;"><input type="checkbox" class="row-checkbox" value="${s.id}" ${selectedId === s.id ? 'checked' : ''}></td>
      <td style="cursor:pointer;" onclick="window.appNavigateTo('shipment-detail', '${s.id}')">
        <strong style="color:var(--amis-blue); text-decoration:underline;">${s.shipmentCode}</strong>
      </td>
      <td>${s.type === 'Import' ? '<span class="chip chip-info">📥 Nhập khẩu</span>' : '<span class="chip chip-success">📤 Xuất khẩu</span>'}</td>
      <td>${s.supplierName || s.customerName || '-'}</td>
      <td>${s.portOfLoading || '-'} ➔ ${s.portOfDischarge || '-'}</td>
      <td><span class="chip chip-gray">${s.deliveryTerm || 'CIF'}</span></td>
      <td>${Number(s.totalQuantity || 0).toLocaleString()}</td>
      <td><strong>$${Number(s.totalValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${s.currency || 'USD'}</strong></td>
      <td><span class="chip chip-warning">${s.status}</span></td>
      <td>${s.expectedDate ? new Date(s.expectedDate).toLocaleDateString('vi-VN') : '-'}</td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="window.appNavigateTo('shipment-detail', '${s.id}')">Chi Tiết</button>
        <button class="btn btn-default btn-sm" onclick="window.xnkEditShipment('${s.id}')">✏️</button>
        <button class="btn btn-default btn-sm" onclick="window.xnkStatusShipment('${s.id}')">🔄</button>
        <button class="btn btn-danger btn-sm" onclick="window.xnkDeleteShipment('${s.id}')">🗑️</button>
      </td>
    </tr>
  `).join('');

  document.getElementById("shipmentPaginationText").textContent = `Tổng số: ${items.length} bản ghi`;

  tbody.querySelectorAll("tr").forEach(tr => {
    tr.addEventListener("click", (e) => {
      if (e.target.tagName === "BUTTON") return;
      selectShipmentRow(tr.getAttribute("data-id"));
    });
  });
}

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
  document.getElementById("btnShipmentRefresh")?.addEventListener("click", loadShipmentsData);
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

  window.xnkEditShipment = (id) => openShipmentForm(id);
  window.xnkStatusShipment = (id) => openStatusModal(id);
  window.xnkDeleteShipment = (id) => deleteShipment(id);
}

// ==================== SHIPMENT FORM ====================
async function openShipmentForm(id) {
  let s = null;
  if (id) s = shipmentsList.find(x => x.id === id);
  const isEdit = !!s;

  const [supRes, cusRes] = await Promise.all([
    api.get("/api/suppliers?pageSize=100"),
    api.get("/api/customers?pageSize=100")
  ]);

  const suppliers = supRes.data.items;
  const customers = cusRes.data.items;

  const title = document.getElementById("modalTitle");
  const tabs = document.getElementById("modalTabs");
  const body = document.getElementById("modalBody");
  const footer = document.getElementById("modalFooter");

  tabs.style.display = "none";
  title.innerHTML = isEdit ? `✏️ Sửa Hồ Sơ Lô Hàng: <strong>${s.shipmentCode}</strong>` : `➕ Thêm Mới Hồ Sơ Lô Hàng XNK`;

  body.innerHTML = `
    <form id="shipmentForm">
      <div class="form-row-3">
        <div class="form-group">
          <label class="form-label required">Mã Lô Hàng (Shipment Code)</label>
          <input type="text" id="sCode" class="form-input" required value="${s?.shipmentCode || ''}" placeholder="VD: SHP-2026-0901">
        </div>
        <div class="form-group">
          <label class="form-label required">Loại Hình</label>
          <select id="sType" class="form-select">
            <option value="Import" ${s?.type === 'Import' ? 'selected' : ''}>Nhập khẩu</option>
            <option value="Export" ${s?.type === 'Export' ? 'selected' : ''}>Xuất khẩu</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Ngày Dự Kiến (ETA/ETD)</label>
          <input type="date" id="sExpectedDate" class="form-input" value="${s?.expectedDate ? s.expectedDate.split('T')[0] : ''}">
        </div>
      </div>

      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">Nhà Cung Cấp (Lô nhập)</label>
          <select id="sSupplierId" class="form-select">
            <option value="">-- Chọn Nhà Cung Cấp --</option>
            ${suppliers.map(sup => `<option value="${sup.id}" ${s?.supplierId === sup.id ? 'selected' : ''}>${sup.companyName} (${sup.country})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Khách Hàng (Lô xuất)</label>
          <select id="sCustomerId" class="form-select">
            <option value="">-- Chọn Khách Hàng --</option>
            ${customers.map(c => `<option value="${c.id}" ${s?.customerId === c.id ? 'selected' : ''}>${c.companyName}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="form-row-3">
        <div class="form-group">
          <label class="form-label">Cảng Đi (Port of Loading)</label>
          <input type="text" id="sPol" class="form-input" value="${s?.portOfLoading || ''}" placeholder="VD: Kaohsiung Port, Taiwan">
        </div>
        <div class="form-group">
          <label class="form-label">Cảng Đến (Port of Discharge)</label>
          <input type="text" id="sPod" class="form-input" value="${s?.portOfDischarge || ''}" placeholder="VD: Cat Lai Port, HCMC">
        </div>
        <div class="form-group">
          <label class="form-label">Điều kiện giao hàng (Incoterm)</label>
          <select id="sTerm" class="form-select">
            <option value="CIF" ${s?.deliveryTerm === 'CIF' ? 'selected' : ''}>CIF</option>
            <option value="FOB" ${s?.deliveryTerm === 'FOB' ? 'selected' : ''}>FOB</option>
            <option value="EXW" ${s?.deliveryTerm === 'EXW' ? 'selected' : ''}>EXW</option>
            <option value="CFR" ${s?.deliveryTerm === 'CFR' ? 'selected' : ''}>CFR</option>
            <option value="DDP" ${s?.deliveryTerm === 'DDP' ? 'selected' : ''}>DDP</option>
          </select>
        </div>
      </div>

      <div class="form-row-3">
        <div class="form-group">
          <label class="form-label">Tổng Số Lượng (kg/cuộn)</label>
          <input type="number" step="0.01" id="sQty" class="form-input" value="${s?.totalQuantity || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Tổng Trọng Lượng Gross (kg)</label>
          <input type="number" step="0.01" id="sGrossWeight" class="form-input" value="${s?.totalGrossWeight || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Tổng Giá Trị Hàng ($ USD)</label>
          <input type="number" step="0.01" id="sValue" class="form-input" value="${s?.totalValue || ''}">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Ghi Chú</label>
        <textarea id="sNotes" class="form-textarea" rows="2">${s?.notes || ''}</textarea>
      </div>
    </form>
  `;

  footer.innerHTML = `
    <button type="button" class="btn btn-default" onclick="window.closeModal()">Hủy bỏ</button>
    <button type="button" id="btnSaveShipment" class="btn btn-primary">✔ Cất (Lưu)</button>
  `;

  document.getElementById("btnSaveShipment").onclick = async () => {
    const shipmentCode = document.getElementById("sCode").value.trim();
    if (!shipmentCode) {
      showToast("Vui lòng nhập mã lô hàng", "error");
      return;
    }

    const payload = {
      shipmentCode,
      type: document.getElementById("sType").value,
      expectedDate: document.getElementById("sExpectedDate").value ? new Date(document.getElementById("sExpectedDate").value).toISOString() : null,
      supplierId: document.getElementById("sSupplierId").value || null,
      customerId: document.getElementById("sCustomerId").value || null,
      portOfLoading: document.getElementById("sPol").value.trim() || null,
      portOfDischarge: document.getElementById("sPod").value.trim() || null,
      deliveryTerm: document.getElementById("sTerm").value,
      totalQuantity: parseFloat(document.getElementById("sQty").value) || 0,
      totalGrossWeight: parseFloat(document.getElementById("sGrossWeight").value) || 0,
      totalValue: parseFloat(document.getElementById("sValue").value) || 0,
      currency: "USD",
      notes: document.getElementById("sNotes").value.trim() || null
    };

    try {
      if (isEdit) {
        await api.put(`/api/shipments/${s.id}`, payload);
        showToast("Cập nhật lô hàng thành công!");
      } else {
        await api.post("/api/shipments", payload);
        showToast("Tạo lô hàng mới thành công!");
      }
      window.closeModal();
      await loadShipmentsData();
    } catch (err) {
      // Handled
    }
  };

  window.openModal();
}

async function openStatusModal(id) {
  const s = shipmentsList.find(x => x.id === id);
  const title = document.getElementById("modalTitle");
  const tabs = document.getElementById("modalTabs");
  const body = document.getElementById("modalBody");
  const footer = document.getElementById("modalFooter");

  tabs.style.display = "none";
  title.innerHTML = `🔄 Chuyển Trạng Thái: <strong>${s.shipmentCode}</strong>`;

  body.innerHTML = `
    <div style="padding: 10px 0;">
      <label class="form-label required">Chọn Trạng Thái Mới</label>
      <select id="newStatusSelect" class="form-select" style="font-size: 14px; padding: 8px;">
        <option value="Draft">Draft (Bản nháp)</option>
        <option value="PreparingDocuments">Preparing Documents (Đang chuẩn bị chứng từ)</option>
        <option value="BookingRequested">Booking Requested (Đã gửi yêu cầu Booking)</option>
        <option value="BookingConfirmed">Booking Confirmed (Đã xác nhận Booking)</option>
        <option value="InTransit">In Transit (Đang trên biển / Đang vận chuyển)</option>
        <option value="Arrived">Arrived (Đã cập cảng đến)</option>
        <option value="CustomsProcessing">Customs Processing (Đang làm thủ tục hải quan)</option>
        <option value="CustomsCleared">Customs Cleared (Đã thông quan)</option>
        <option value="Completed">Completed (Đã nhập kho / Hoàn tất)</option>
        <option value="Cancelled">Cancelled (Đã hủy)</option>
      </select>
    </div>
  `;

  footer.innerHTML = `
    <button type="button" class="btn btn-default" onclick="window.closeModal()">Hủy</button>
    <button type="button" id="btnUpdateStatusConfirm" class="btn btn-primary">Xác nhận cập nhật</button>
  `;

  document.getElementById("newStatusSelect").value = s.status;

  document.getElementById("btnUpdateStatusConfirm").onclick = async () => {
    const newStatus = document.getElementById("newStatusSelect").value;
    try {
      await api.patch(`/api/shipments/${id}/status`, { status: newStatus });
      showToast("Cập nhật trạng thái lô hàng thành công!");
      window.closeModal();
      await loadShipmentsData();
    } catch (err) {
      // Handled
    }
  };

  window.openModal();
}

async function deleteShipment(id) {
  const s = shipmentsList.find(x => x.id === id);
  if (!confirm(`Bạn có chắc chắn muốn xóa lô hàng [${s?.shipmentCode || id}] không?`)) return;

  try {
    await api.delete(`/api/shipments/${id}`);
    showToast("Đã xóa lô hàng thành công!");
    selectedId = null;
    await loadShipmentsData();
  } catch (err) {
    // Handled
  }
}
