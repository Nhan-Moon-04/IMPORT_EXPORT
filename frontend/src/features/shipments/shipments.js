/**
 * Shipments Feature Module - Full CRUD & Status Transitions
 */
import { api, showToast, showConfirm } from "../../core/api.js";

let shipmentsList = [];
let selectedId = null;
let currentShipmentFilter = 'All';

// Danh sách sản phẩm được chọn trong form (local state)
let formItems = []; // [{ productId, productName, sku, unit, quantity, unitPrice }]
let allProducts = []; // cache danh sách sản phẩm

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
              <th style="width: 40px; text-align:center;"></th> <!-- Expand button -->
              <th>Mã Lô Hàng</th>
              <th>Loại Hình</th>
              <th>Đối Tác (NCC / Khách)</th>
              <th>Hành Trình</th>
              <th>Số Lượng (kg)</th>
              <th>Tổng Giá Trị</th>
              <th>Trạng Thái</th>
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
  await loadShipmentsData(currentShipmentFilter);
}

async function loadShipmentsData(filterType = 'All') {
  try {
    const res = await api.get("/api/shipments?pageSize=100");
    shipmentsList = res.data.items;

    if (filterType !== 'All') {
      shipmentsList = shipmentsList.filter(s => s.type === filterType);
    }

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
    <tr data-id="${s.id}" class="shipment-main-row ${selectedId === s.id ? 'selected' : ''}">
      <td style="text-align:center;"><input type="checkbox" class="row-checkbox" value="${s.id}" ${selectedId === s.id ? 'checked' : ''}></td>
      <td style="text-align:center; cursor:pointer;" class="expand-btn" data-id="${s.id}">
        <svg class="chevron-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transition: transform 0.2s;"><path d="M6 9l6 6 6-6"/></svg>
      </td>
      <td style="cursor:pointer;" onclick="window.appNavigateTo('shipment-detail', '${s.id}')">
        <strong style="color:var(--amis-blue); text-decoration:underline;">${s.shipmentCode}</strong>
      </td>
      <td>${s.type === 'Import' ? '<span class="status-chip chip-transit" style="background:#e0f2fe; color:#0369a1;">📥 Nhập khẩu</span>' : '<span class="status-chip chip-delivered" style="background:#dcfce7; color:#15803d;">📤 Xuất khẩu</span>'}</td>
      <td>${s.supplierName || s.customerName || '-'}</td>
      <td>${s.portOfLoading || '-'} ➔ ${s.portOfDischarge || '-'}</td>
      <td>${Number(s.totalQuantity || 0).toLocaleString()}</td>
      <td><strong>$${Number(s.totalValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${s.currency || 'USD'}</strong></td>
      <td><span class="status-chip chip-warning">${s.status}</span></td>
      <td>
        <button class="btn btn-default btn-sm" onclick="window.appNavigateTo('shipment-detail', '${s.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button>
        <button class="btn btn-default btn-sm" onclick="window.xnkEditShipment('${s.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg></button>
        <button class="btn btn-default btn-sm" onclick="window.xnkStatusShipment('${s.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.21l-5.69 5.69"></path></svg></button>
        <button class="btn btn-default btn-sm" style="color: var(--amis-red);" onclick="window.xnkDeleteShipment('${s.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
      </td>
    </tr>
    <!-- Hidden Expandable Row -->
    <tr id="expand-row-${s.id}" class="expand-row" style="display:none; background-color: #f8fafc; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
      <td colspan="10" style="padding: 0;">
        <div class="expand-content" id="expand-content-${s.id}" style="padding: 16px;">
          <!-- Detail content will be loaded here via API -->
          <div style="text-align:center; padding: 20px; color: #64748b;">Đang tải chi tiết...</div>
        </div>
      </td>
    </tr>
  `).join('');

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

  window.xnkEditShipment = (id) => openShipmentForm(id);
  window.xnkStatusShipment = (id) => openStatusModal(id);
  window.xnkDeleteShipment = (id) => deleteShipment(id);
}

// ==================== SHIPMENT FORM ====================
async function openShipmentForm(id) {
  let s = null;
  if (id) s = shipmentsList.find(x => x.id === id);
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

  window.openModal();

  const title = document.getElementById("modalTitle");
  const tabs = document.getElementById("modalTabs");
  const body = document.getElementById("modalBody");
  const footer = document.getElementById("modalFooter");

  if (tabs) tabs.style.display = "none";
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
            <option value="Import" ${currentType === 'Import' ? 'selected' : ''}>📥 Nhập khẩu</option>
            <option value="Export" ${currentType === 'Export' ? 'selected' : ''}>📤 Xuất khẩu</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Ngày Dự Kiến (ETA/ETD)</label>
          <input type="date" id="sExpectedDate" class="form-input" value="${s?.expectedDate ? s.expectedDate.split('T')[0] : ''}">
        </div>
      </div>

      <div class="form-row-2">
        <div class="form-group" id="supplierGroup" style="${currentType === 'Export' ? 'display:none;' : ''}">
          <label class="form-label">🏭 Nhà Cung Cấp <span style="color:#0369a1; font-size:11px;">(Lô nhập)</span></label>
          <select id="sSupplierId" class="form-select">
            <option value="">-- Chọn Nhà Cung Cấp --</option>
            ${suppliers.map(sup => `<option value="${sup.id}" ${s?.supplierId === sup.id ? 'selected' : ''}>${sup.companyName} (${sup.country})</option>`).join('')}
          </select>
        </div>
        <div class="form-group" id="customerGroup" style="${currentType === 'Import' ? 'display:none;' : ''}">
          <label class="form-label">🤝 Khách Hàng <span style="color:#15803d; font-size:11px;">(Lô xuất)</span></label>
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
          <label class="form-label required">Tổng số lượng NW (kg)</label>
          <input type="number" step="0.01" id="sQty" class="form-input" required value="${s?.totalQuantity || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Tổng trọng lượng GW (kg)</label>
          <input type="number" step="0.01" id="sGrossWeight" class="form-input" value="${s?.totalGrossWeight || ''}">
        </div>
        <div class="form-group">
          <label class="form-label required">Tổng trị giá (USD)</label>
          <input type="number" step="0.01" id="sValue" class="form-input" required value="${s?.totalValue || ''}">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Ghi Chú</label>
        <textarea id="sNotes" class="form-textarea" rows="2">${s?.notes || ''}</textarea>
      </div>

      <!-- ===== DANH SÁCH SẢN PHẨM ===== -->
      <div style="margin-top: 18px; border-top: 2px solid var(--border-color); padding-top: 14px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <label class="form-label" style="margin: 0; font-size: 14px; font-weight: 700;">
            📦 Danh Sách Sản Phẩm Trong Lô
          </label>
          <div style="display: flex; gap: 8px; align-items: center;">
            <select id="productPickerSelect" class="form-select" style="width: 320px; font-size: 13px;">
              <option value="">-- Chọn sản phẩm để thêm --</option>
              ${allProducts.map(p => `<option value="${p.id}" data-name="${escapeHtml(p.name)}" data-sku="${escapeHtml(p.sku)}" data-unit="${escapeHtml(p.unit || '')}">${p.sku} - ${p.name}${p.unit ? ' (' + p.unit + ')' : ''}</option>`).join('')}
            </select>
            <button type="button" id="btnAddProduct" class="btn btn-primary" style="white-space: nowrap; font-size: 13px;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Thêm
            </button>
          </div>
        </div>
        <div id="shipmentItemsContainer">
          ${renderFormItemsTable()}
        </div>
      </div>
    </form>
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
      supplierId: document.getElementById("sSupplierId")?.value || null,
      customerId: document.getElementById("sCustomerId")?.value || null,
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

      window.closeModal();
      await loadShipmentsData();
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
async function openStatusModal(id) {
  const s = shipmentsList.find(x => x.id === id);

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
}

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
