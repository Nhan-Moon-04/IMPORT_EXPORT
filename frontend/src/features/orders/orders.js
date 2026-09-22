/**
 * Orders Feature Module - Purchase Orders (PO) & Sales Orders (SO) CRUD
 */
import { api, showToast } from "../../core/api.js";

let ordersList = [];
let selectedId = null;

export async function renderOrders(container) {
  selectedId = null;
  container.innerHTML = `
    <div class="grid-card">
      <div class="misa-toolbar">
        <div class="toolbar-group">
          <button id="btnOrderAdd" class="btn btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Thêm mới Đơn PO
          </button>
          <button id="btnOrderDelete" class="btn btn-default" style="color: var(--amis-red);" disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Xóa
          </button>
          <button id="btnOrderRefresh" class="btn btn-default">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg> Nạp lại
          </button>
        </div>
        <div class="toolbar-group">
          <input type="text" id="orderSearchInput" class="form-input" style="width: 220px;" placeholder="Lọc số PO, nhà cung cấp...">
        </div>
      </div>

      <div class="grid-scroll">
        <table class="misa-table" id="ordersTable">
          <thead>
            <tr>
              <th style="width: 40px; text-align:center;"><input type="checkbox"></th>
              <th>Số PO (Purchase Order)</th>
              <th>Ngày Đặt Hàng</th>
              <th>Nhà Cung Cấp</th>
              <th>Điều Kiện</th>
              <th>Tổng Lượng Đặt</th>
              <th>Tổng Tiền Đơn Hàng</th>
              <th>Trạng Thái</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody id="ordersTbody">
            <tr><td colspan="9" style="text-align:center; padding: 24px;">Đang tải đơn hàng...</td></tr>
          </tbody>
        </table>
      </div>

      <div class="misa-pagination">
        <div id="orderPaginationText">Tổng số: 0 bản ghi</div>
        <div class="pagination-controls"><span>Hiển thị 50 dòng/trang</span></div>
      </div>
    </div>
  `;

  setupOrderEvents();
  await loadOrdersData();
}

async function loadOrdersData() {
  try {
    const res = await api.get("/api/orders/purchase?pageSize=100");
    ordersList = res.data.items;
    renderOrdersTable(ordersList);
  } catch (err) {
    // Handled
  }
}

function renderOrdersTable(items) {
  const tbody = document.getElementById("ordersTbody");
  if (!tbody) return;

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 24px; color: var(--text-muted)">Chưa có đơn mua hàng nào.</td></tr>`;
    document.getElementById("orderPaginationText").textContent = "Tổng số: 0 bản ghi";
    return;
  }

  tbody.innerHTML = items.map(o => `
    <tr data-id="${o.id}" class="${selectedId === o.id ? 'selected' : ''}">
      <td style="text-align:center;"><input type="checkbox" class="row-checkbox" value="${o.id}" ${selectedId === o.id ? 'checked' : ''}></td>
      <td><strong>${o.poNumber}</strong></td>
      <td>${new Date(o.poDate).toLocaleDateString('vi-VN')}</td>
      <td>${o.supplierName || '-'}</td>
      <td><span class="chip chip-gray">${o.deliveryTerm || 'CIF'}</span></td>
      <td>${Number(o.orderedQuantity || 0).toLocaleString()} kg</td>
      <td><strong>$${Number(o.totalValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${o.currency || 'USD'}</strong></td>
      <td><span class="chip chip-info">${o.status}</span></td>
      <td>
        <button class="btn btn-default btn-sm" onclick="window.xnkViewOrder('${o.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> Xem</button>
        <button class="btn btn-default btn-sm" style="color: var(--amis-red);" onclick="window.xnkDeleteOrder('${o.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
      </td>
    </tr>
  `).join('');

  document.getElementById("orderPaginationText").textContent = `Tổng số: ${items.length} bản ghi`;

  tbody.querySelectorAll("tr").forEach(tr => {
    tr.addEventListener("click", (e) => {
      if (e.target.tagName === "BUTTON") return;
      selectOrderRow(tr.getAttribute("data-id"));
    });
  });
}

function selectOrderRow(id) {
  selectedId = id;
  const tbody = document.getElementById("ordersTbody");
  if (!tbody) return;

  tbody.querySelectorAll("tr").forEach(tr => {
    const isCur = tr.getAttribute("data-id") === id;
    tr.classList.toggle("selected", isCur);
    const cb = tr.querySelector(".row-checkbox");
    if (cb) cb.checked = isCur;
  });

  document.getElementById("btnOrderDelete").disabled = !id;
}

function setupOrderEvents() {
  document.getElementById("btnOrderRefresh")?.addEventListener("click", loadOrdersData);
  document.getElementById("btnOrderAdd")?.addEventListener("click", openOrderForm);
  document.getElementById("btnOrderDelete")?.addEventListener("click", () => {
    if (selectedId) deleteOrder(selectedId);
  });

  window.xnkViewOrder = (id) => viewOrder(id);
  window.xnkDeleteOrder = (id) => deleteOrder(id);
}

// ==================== CREATE PO MODAL ====================
async function openOrderForm() {
  const [supRes, prodRes] = await Promise.all([
    api.get("/api/suppliers?pageSize=100"),
    api.get("/api/products?pageSize=100")
  ]);

  const suppliers = supRes.data.items;
  const products = prodRes.data.items;

  const title = document.getElementById("modalTitle");
  const tabs = document.getElementById("modalTabs");
  const body = document.getElementById("modalBody");
  const footer = document.getElementById("modalFooter");

  tabs.style.display = "none";
  title.innerHTML = `Tạo Mới Đơn Mua Hàng Quốc Tế (Purchase Order - PO)`;

  body.innerHTML = `
    <form id="orderForm">
      <div class="form-row-3">
        <div class="form-group">
          <label class="form-label required">Số PO (PO Number)</label>
          <input type="text" id="poNum" class="form-input" required value="PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}">
        </div>
        <div class="form-group">
          <label class="form-label required">Ngày Đặt Hàng</label>
          <input type="date" id="poDate" class="form-input" required value="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group">
          <label class="form-label required">Nhà Cung Cấp</label>
          <select id="poSupplier" class="form-select" required>
            <option value="">-- Chọn Nhà Cung Cấp --</option>
            ${suppliers.map(s => `<option value="${s.id}">${s.companyName} (${s.country})</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">Điều kiện giao hàng (Incoterm)</label>
          <select id="poTerm" class="form-select">
            <option value="CIF">CIF</option>
            <option value="FOB">FOB</option>
            <option value="EXW">EXW</option>
            <option value="CFR">CFR</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Ngày Giao Hàng Dự Kiến</label>
          <input type="date" id="poExpectedDate" class="form-input">
        </div>
      </div>

      <!-- LINE ITEMS -->
      <div style="margin: 16px 0 8px 0; font-weight: 700; font-size: 13px;">Chi Tiết Mặt Hàng Đặt:</div>
      <div class="grid-card" style="margin-bottom: 12px;">
        <table class="misa-table">
          <thead>
            <tr>
              <th>Sản Phẩm / Mã Sợi</th>
              <th style="width: 140px;">Số Lượng (kg)</th>
              <th style="width: 140px;">Đơn Giá ($ USD)</th>
              <th style="width: 160px;">Thành Tiền ($)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <select id="poProdId" class="form-select" required>
                  <option value="">-- Chọn Mặt Hàng Sợi --</option>
                  ${products.map(p => `<option value="${p.id}">${p.sku} - ${p.name}</option>`).join('')}
                </select>
              </td>
              <td><input type="number" id="poItemQty" class="form-input" value="10000" min="1"></td>
              <td><input type="number" step="0.01" id="poItemPrice" class="form-input" value="2.30" min="0"></td>
              <td><strong id="poItemTotal">$23,000.00</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="form-group">
        <label class="form-label">Ghi Chú Đơn Hàng</label>
        <textarea id="poNotes" class="form-textarea" rows="2" placeholder="Ghi chú điều khoản thanh toán, quy cách đóng gói..."></textarea>
      </div>
    </form>
  `;

  footer.innerHTML = `
    <button type="button" class="btn btn-default" onclick="window.closeModal()">Hủy bỏ</button>
    <button type="button" id="btnSaveOrder" class="btn btn-primary">✔ Cất (Lưu Đơn PO)</button>
  `;

  const calcTotal = () => {
    const q = parseFloat(document.getElementById("poItemQty").value) || 0;
    const p = parseFloat(document.getElementById("poItemPrice").value) || 0;
    document.getElementById("poItemTotal").textContent = `$${Number(q * p).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };
  document.getElementById("poItemQty").oninput = calcTotal;
  document.getElementById("poItemPrice").oninput = calcTotal;

  document.getElementById("btnSaveOrder").onclick = async () => {
    const poNumber = document.getElementById("poNum").value.trim();
    const supplierId = document.getElementById("poSupplier").value;
    const productId = document.getElementById("poProdId").value;
    const qty = parseFloat(document.getElementById("poItemQty").value) || 0;
    const price = parseFloat(document.getElementById("poItemPrice").value) || 0;

    if (!poNumber || !supplierId || !productId || qty <= 0) {
      showToast("Vui lòng nhập đầy đủ thông tin số PO, nhà cung cấp và sản phẩm", "error");
      return;
    }

    const payload = {
      poNumber,
      poDate: new Date(document.getElementById("poDate").value).toISOString(),
      supplierId,
      deliveryTerm: document.getElementById("poTerm").value,
      expectedDeliveryDate: document.getElementById("poExpectedDate").value ? new Date(document.getElementById("poExpectedDate").value).toISOString() : null,
      currency: "USD",
      notes: document.getElementById("poNotes").value.trim() || null,
      items: [
        { productId, quantity: qty, unitPrice: price }
      ]
    };

    try {
      await api.post("/api/orders/purchase", payload);
      showToast("Tạo Đơn mua hàng PO thành công!");
      window.closeModal();
      await loadOrdersData();
    } catch (err) {
      // Handled
    }
  };

  window.openModal();
}

async function viewOrder(id) {
  try {
    const res = await api.get(`/api/orders/purchase/${id}`);
    const o = res.data;

    const title = document.getElementById("modalTitle");
    const tabs = document.getElementById("modalTabs");
    const body = document.getElementById("modalBody");
    const footer = document.getElementById("modalFooter");

    tabs.style.display = "none";
    title.innerHTML = `Chi Tiết Đơn Hàng PO: <strong>${o.poNumber}</strong>`;

    body.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; background: var(--bg-surface-alt); padding: 12px; border-radius: 4px; margin-bottom: 14px; font-size: 13px;">
        <div>Nhà cung cấp: <strong>${o.supplierName}</strong></div>
        <div>Ngày PO: <strong>${new Date(o.poDate).toLocaleDateString('vi-VN')}</strong></div>
        <div>Incoterm: <strong>${o.deliveryTerm || 'CIF'}</strong></div>
        <div>Tổng lượng đặt: <strong>${Number(o.orderedQuantity || 0).toLocaleString()} kg</strong></div>
        <div>Tổng tiền: <strong style="color: var(--misa-green); font-size: 15px;">$${Number(o.totalValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${o.currency}</strong></div>
        <div>Trạng thái: <span class="chip chip-info">${o.status}</span></div>
      </div>

      <div style="font-weight: 700; margin-bottom: 8px;">Chi Tiết Các Mặt Hàng:</div>
      <div class="grid-card">
        <table class="misa-table">
          <thead>
            <tr>
              <th>Mã SKU</th>
              <th>Tên Hàng Hóa</th>
              <th>Số Lượng (kg)</th>
              <th>Đơn Giá ($)</th>
              <th>Thành Tiền ($)</th>
            </tr>
          </thead>
          <tbody>
            ${o.items.map(it => `
              <tr>
                <td><strong>${it.sku || '-'}</strong></td>
                <td>${it.productName || '-'}</td>
                <td>${Number(it.quantity || 0).toLocaleString()}</td>
                <td>$${Number(it.unitPrice || 0).toFixed(4)}</td>
                <td><strong>$${Number(it.totalValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    footer.innerHTML = `
      <div></div>
      <button type="button" class="btn btn-default" onclick="window.closeModal()">Đóng</button>
    `;

    window.openModal();
  } catch (err) {
    // Handled
  }
}

async function deleteOrder(id) {
  const o = ordersList.find(x => x.id === id);
  if (!confirm(`Bạn có chắc chắn muốn xóa đơn PO [${o?.poNumber || id}] không?`)) return;

  try {
    await api.delete(`/api/orders/purchase/${id}`);
    showToast("Đã xóa đơn hàng thành công!");
    selectedId = null;
    await loadOrdersData();
  } catch (err) {
    // Handled
  }
}
