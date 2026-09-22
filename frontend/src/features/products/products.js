/**
 * Products Feature Module - Full CRUD & Yarn Specifications & Trade History
 */
import { api, showToast } from "../../core/api.js";

let productsList = [];
let selectedId = null;

export async function renderProducts(container) {
  selectedId = null;
  container.innerHTML = `
    <div class="grid-card">
      <!-- MISA AMIS TOOLBAR -->
      <div class="misa-toolbar">
        <div class="toolbar-group">
          <button id="btnProductAdd" class="btn btn-primary">
            <span>+</span> <span>Thêm mới</span>
          </button>
          <button id="btnProductEdit" class="btn btn-blue" disabled>
            <span>✏️</span> <span>Sửa</span>
          </button>
          <button id="btnProductDelete" class="btn btn-danger" disabled>
            <span>🗑️</span> <span>Xóa</span>
          </button>
          <button id="btnProductHistory" class="btn btn-default" disabled>
            <span>📊</span> <span>Xem Lịch Sử Mua/Bán</span>
          </button>
          <button id="btnProductRefresh" class="btn btn-default">
            <span>🔄</span> <span>Nạp lại</span>
          </button>
        </div>

        <div class="toolbar-group">
          <input type="text" id="productSearchInput" class="form-input" style="width: 220px;" placeholder="Lọc theo SKU, tên sợi...">
        </div>
      </div>

      <!-- TABLE GRID -->
      <div class="grid-scroll">
        <table class="misa-table" id="productsTable">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;"><input type="checkbox" id="checkAllProducts"></th>
              <th>Mã SKU</th>
              <th>Tên Hàng Hóa</th>
              <th>Quy Cách Sợi (Yarn Spec)</th>
              <th>Nhóm Hàng</th>
              <th>Mã HS Code</th>
              <th>Đơn Vị</th>
              <th>Nước Xuất Xứ</th>
              <th>Thao Tác Nhanh</th>
            </tr>
          </thead>
          <tbody id="productsTbody">
            <tr><td colspan="9" style="text-align: center; padding: 24px;">Đang tải danh mục...</td></tr>
          </tbody>
        </table>
      </div>

      <!-- PAGINATION -->
      <div class="misa-pagination">
        <div id="productPaginationText">Tổng số: 0 bản ghi</div>
        <div class="pagination-controls">
          <span>Hiển thị 50 dòng/trang</span>
        </div>
      </div>
    </div>
  `;

  setupProductEvents();
  await loadProductsData();
}

async function loadProductsData() {
  try {
    const res = await api.get("/api/products?pageSize=100");
    productsList = res.data.items;
    renderProductsTable(productsList);
  } catch (err) {
    // Handled
  }
}

function renderProductsTable(items) {
  const tbody = document.getElementById("productsTbody");
  if (!tbody) return;

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 24px; color: var(--text-muted)">Không tìm thấy sản phẩm nào.</td></tr>`;
    document.getElementById("productPaginationText").textContent = "Tổng số: 0 bản ghi";
    return;
  }

  tbody.innerHTML = items.map(p => {
    const s = p.specification;
    const specStr = s ? `${s.yarnType || ''} ${s.denierCount || ''}/${s.filamentCount ? s.filamentCount + 'F' : ''} ${s.sdorTBR || ''}` : '-';
    return `
      <tr data-id="${p.id}" class="${selectedId === p.id ? 'selected' : ''}">
        <td style="text-align: center;"><input type="checkbox" class="row-checkbox" value="${p.id}" ${selectedId === p.id ? 'checked' : ''}></td>
        <td><strong>${p.sku}</strong></td>
        <td>${p.name}</td>
        <td><span style="color: var(--misa-blue); font-weight: 600;">${specStr}</span></td>
        <td>${p.productGroup || '-'}</td>
        <td><code>${p.hsCode || '-'}</code></td>
        <td>${p.unit || 'kg'}</td>
        <td>${p.countryOfOrigin || '-'}</td>
        <td>
          <button class="btn btn-default btn-sm" onclick="window.xnkViewHistory('${p.id}')">📊 Lịch sử</button>
          <button class="btn btn-default btn-sm" onclick="window.xnkEditProduct('${p.id}')">✏️ Sửa</button>
          <button class="btn btn-danger btn-sm" onclick="window.xnkDeleteProduct('${p.id}')">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');

  document.getElementById("productPaginationText").textContent = `Tổng số: ${items.length} bản ghi`;

  // Row selection handler
  tbody.querySelectorAll("tr").forEach(tr => {
    tr.addEventListener("click", (e) => {
      if (e.target.tagName === "BUTTON") return;
      const id = tr.getAttribute("data-id");
      selectRow(id);
    });
  });
}

function selectRow(id) {
  selectedId = id;
  const tbody = document.getElementById("productsTbody");
  if (!tbody) return;

  tbody.querySelectorAll("tr").forEach(tr => {
    const isCur = tr.getAttribute("data-id") === id;
    tr.classList.toggle("selected", isCur);
    const cb = tr.querySelector(".row-checkbox");
    if (cb) cb.checked = isCur;
  });

  const btnEdit = document.getElementById("btnProductEdit");
  const btnDelete = document.getElementById("btnProductDelete");
  const btnHist = document.getElementById("btnProductHistory");
  if (btnEdit) btnEdit.disabled = !id;
  if (btnDelete) btnDelete.disabled = !id;
  if (btnHist) btnHist.disabled = !id;
}

function setupProductEvents() {
  document.getElementById("btnProductRefresh")?.addEventListener("click", loadProductsData);
  document.getElementById("btnProductAdd")?.addEventListener("click", () => openProductForm(null));
  document.getElementById("btnProductEdit")?.addEventListener("click", () => {
    if (selectedId) openProductForm(selectedId);
  });
  document.getElementById("btnProductDelete")?.addEventListener("click", () => {
    if (selectedId) deleteProduct(selectedId);
  });
  document.getElementById("btnProductHistory")?.addEventListener("click", () => {
    if (selectedId) viewHistory(selectedId);
  });

  document.getElementById("productSearchInput")?.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = productsList.filter(p => 
      p.sku.toLowerCase().includes(q) || 
      p.name.toLowerCase().includes(q) ||
      (p.hsCode && p.hsCode.toLowerCase().includes(q))
    );
    renderProductsTable(filtered);
  });

  // Expose global helpers for row buttons
  window.xnkViewHistory = (id) => viewHistory(id);
  window.xnkEditProduct = (id) => openProductForm(id);
  window.xnkDeleteProduct = (id) => deleteProduct(id);
}

// ==================== CREATE / EDIT MODAL ====================
async function openProductForm(id) {
  let p = null;
  if (id) {
    p = productsList.find(x => x.id === id);
    if (!p) {
      const res = await api.get(`/api/products/${id}`);
      p = res.data;
    }
  }

  const isEdit = !!p;
  const spec = p?.specification || {};

  const overlay = document.getElementById("modalOverlay");
  const title = document.getElementById("modalTitle");
  const tabs = document.getElementById("modalTabs");
  const body = document.getElementById("modalBody");
  const footer = document.getElementById("modalFooter");

  title.innerHTML = isEdit ? `✏️ Sửa Mặt Hàng / Sợi: <strong>${p.sku}</strong>` : `➕ Thêm Mới Mặt Hàng / Sợi Dệt`;
  
  tabs.style.display = "flex";
  tabs.innerHTML = `
    <button class="modal-tab-btn active" onclick="window.switchFormTab('tabGeneral')">1. Thông tin chung</button>
    <button class="modal-tab-btn" onclick="window.switchFormTab('tabSpec')">2. Thông số kỹ thuật sợi (Yarn Spec)</button>
  `;

  body.innerHTML = `
    <form id="productModalForm">
      <!-- TAB 1: GENERAL -->
      <div id="tabGeneral">
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label required">Mã SKU / Mã Sản Phẩm</label>
            <input type="text" id="pSku" class="form-input" required value="${p?.sku || ''}" placeholder="VD: YARN-FDY-10036">
          </div>
          <div class="form-group">
            <label class="form-label required">Tên Hàng Hóa</label>
            <input type="text" id="pName" class="form-input" required value="${p?.name || ''}" placeholder="VD: Sợi Polyester FDY 100D/36F Semi Dull">
          </div>
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label">Tên Tiếng Anh</label>
            <input type="text" id="pNameEn" class="form-input" value="${p?.nameEn || ''}" placeholder="VD: Polyester Fully Drawn Yarn 100D/36F">
          </div>
          <div class="form-group">
            <label class="form-label">Nhóm Hàng Hóa</label>
            <input type="text" id="pGroup" class="form-input" value="${p?.productGroup || ''}" placeholder="VD: Sợi dệt thoi / Sợi dệt kim">
          </div>
        </div>

        <div class="form-row-3">
          <div class="form-group">
            <label class="form-label">Mã HS Code</label>
            <input type="text" id="pHsCode" class="form-input" value="${p?.hsCode || '5402.47.00'}">
          </div>
          <div class="form-group">
            <label class="form-label required">Đơn Vị Tính</label>
            <input type="text" id="pUnit" class="form-input" required value="${p?.unit || 'kg'}">
          </div>
          <div class="form-group">
            <label class="form-label">Nước Xuất Xứ</label>
            <input type="text" id="pOrigin" class="form-input" value="${p?.countryOfOrigin || 'Taiwan'}">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Nhà Sản Xuất</label>
          <input type="text" id="pManufacturer" class="form-input" value="${p?.manufacturer || ''}">
        </div>

        <div class="form-group">
          <label class="form-label">Ghi Chú</label>
          <textarea id="pNotes" class="form-textarea" rows="2">${p?.notes || ''}</textarea>
        </div>
      </div>

      <!-- TAB 2: YARN SPEC -->
      <div id="tabSpec" style="display: none;">
        <div class="form-row-3">
          <div class="form-group">
            <label class="form-label">Loại Sợi (Yarn Type)</label>
            <select id="pYarnType" class="form-select">
              <option value="FDY" ${spec.yarnType === 'FDY' ? 'selected' : ''}>FDY (Fully Drawn Yarn)</option>
              <option value="DTY" ${spec.yarnType === 'DTY' ? 'selected' : ''}>DTY (Drawn Textured Yarn)</option>
              <option value="POY" ${spec.yarnType === 'POY' ? 'selected' : ''}>POY (Partially Oriented Yarn)</option>
              <option value="PHTY" ${spec.yarnType === 'PHTY' ? 'selected' : ''}>PHTY</option>
              <option value="Khac" ${spec.yarnType === 'Khac' ? 'selected' : ''}>Khác</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Chỉ số Denier (Count)</label>
            <input type="text" id="pDenier" class="form-input" value="${spec.denierCount || ''}" placeholder="VD: 100D, 150D">
          </div>
          <div class="form-group">
            <label class="form-label">Số Filament (Số sợi con)</label>
            <input type="number" id="pFilament" class="form-input" value="${spec.filamentCount || ''}" placeholder="VD: 36, 48, 72">
          </div>
        </div>

        <div class="form-row-3">
          <div class="form-group">
            <label class="form-label">Độ bóng / Quang học</label>
            <select id="pSdOrTbr" class="form-select">
              <option value="Semi Dull (SD)" ${spec.sdorTBR?.includes('Semi Dull') ? 'selected' : ''}>Semi Dull (SD - Bán mờ)</option>
              <option value="Bright (BR)" ${spec.sdorTBR?.includes('Bright') ? 'selected' : ''}>Bright (BR - Bóng)</option>
              <option value="Full Dull (FD)" ${spec.sdorTBR?.includes('Full Dull') ? 'selected' : ''}>Full Dull (FD - Mờ hoàn toàn)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Màu sắc</label>
            <input type="text" id="pColor" class="form-input" value="${spec.color || 'Raw White'}" placeholder="VD: Raw White, Optic White, Đen">
          </div>
          <div class="form-group">
            <label class="form-label">Độ xoắn (TPM)</label>
            <input type="text" id="pTpm" class="form-input" value="${spec.tpm || '0'}">
          </div>
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label">Quy cách đóng gói</label>
            <input type="text" id="pPackaging" class="form-input" value="${spec.packagingType || 'Carton (6 bobbins/carton)'}">
          </div>
          <div class="form-group">
            <label class="form-label">Trọng lượng mỗi cone/bobin (kg)</label>
            <input type="number" step="0.01" id="pWeightUnit" class="form-input" value="${spec.weightPerUnit || '5.25'}">
          </div>
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label">Tiêu chuẩn chất lượng</label>
            <input type="text" id="pQuality" class="form-input" value="${spec.qualityStandard || 'Grade AA'}">
          </div>
          <div class="form-group">
            <label class="form-label">Chứng chỉ liên quan</label>
            <input type="text" id="pCerts" class="form-input" value="${spec.certifications || 'OEKO-TEX Standard 100, GRS'}">
          </div>
        </div>
      </div>
    </form>
  `;

  footer.innerHTML = `
    <button type="button" class="btn btn-default" onclick="window.closeModal()">Hủy bỏ</button>
    <div style="display: flex; gap: 8px;">
      <button type="button" id="btnSaveProduct" class="btn btn-primary">✔ Cất (Lưu)</button>
    </div>
  `;

  window.switchFormTab = (tabId) => {
    document.getElementById("tabGeneral").style.display = tabId === "tabGeneral" ? "block" : "none";
    document.getElementById("tabSpec").style.display = tabId === "tabSpec" ? "block" : "none";
    tabs.querySelectorAll("button").forEach((b, idx) => {
      b.classList.toggle("active", (idx === 0 && tabId === "tabGeneral") || (idx === 1 && tabId === "tabSpec"));
    });
  };

  document.getElementById("btnSaveProduct").onclick = async () => {
    const sku = document.getElementById("pSku").value.trim();
    const name = document.getElementById("pName").value.trim();
    if (!sku || !name) {
      showToast("Vui lòng điền SKU và Tên hàng hóa", "error");
      return;
    }

    const payload = {
      sku,
      name,
      nameEn: document.getElementById("pNameEn").value.trim() || null,
      nameVi: name,
      productGroup: document.getElementById("pGroup").value.trim() || null,
      hsCode: document.getElementById("pHsCode").value.trim() || null,
      unit: document.getElementById("pUnit").value.trim() || "kg",
      countryOfOrigin: document.getElementById("pOrigin").value.trim() || null,
      manufacturer: document.getElementById("pManufacturer").value.trim() || null,
      notes: document.getElementById("pNotes").value.trim() || null,
      specification: {
        yarnType: document.getElementById("pYarnType").value,
        composition: "100% Polyester",
        denierCount: document.getElementById("pDenier").value.trim() || null,
        filamentCount: parseInt(document.getElementById("pFilament").value) || null,
        sdorTBR: document.getElementById("pSdOrTbr").value,
        color: document.getElementById("pColor").value.trim() || null,
        tpm: document.getElementById("pTpm").value.trim() || null,
        packagingType: document.getElementById("pPackaging").value.trim() || null,
        weightPerUnit: parseFloat(document.getElementById("pWeightUnit").value) || null,
        qualityStandard: document.getElementById("pQuality").value.trim() || null,
        certifications: document.getElementById("pCerts").value.trim() || null
      }
    };

    try {
      if (isEdit) {
        await api.put(`/api/products/${p.id}`, payload);
        showToast("Cập nhật sản phẩm thành công!");
      } else {
        await api.post("/api/products", payload);
        showToast("Thêm mới sản phẩm thành công!");
      }
      window.closeModal();
      await loadProductsData();
    } catch (err) {
      // Handled
    }
  };

  window.openModal();
}

// ==================== DELETE PRODUCT ====================
async function deleteProduct(id) {
  const p = productsList.find(x => x.id === id);
  if (!confirm(`Bạn có chắc chắn muốn xóa mặt hàng [${p?.sku || id}] không?`)) return;

  try {
    await api.delete(`/api/products/${id}`);
    showToast("Đã xóa sản phẩm thành công!");
    selectedId = null;
    await loadProductsData();
  } catch (err) {
    // Handled
  }
}

// ==================== TRADE HISTORY MODAL (MỤC 4.3 ĐẶC TẢ) ====================
async function viewHistory(id) {
  try {
    const res = await api.get(`/api/products/${id}/history`);
    const h = res.data;

    const title = document.getElementById("modalTitle");
    const tabs = document.getElementById("modalTabs");
    const body = document.getElementById("modalBody");
    const footer = document.getElementById("modalFooter");

    tabs.style.display = "none";
    title.innerHTML = `📊 Lịch Sử Nhập/Xuất Hàng Hóa: <strong style="color: var(--misa-blue)">${h.sku}</strong> - ${h.productName}`;

    body.innerHTML = `
      <div style="display: flex; gap: 20px; padding: 12px; background: var(--bg-surface-alt); border-radius: 4px; margin-bottom: 14px; font-size: 13px;">
        <div>Tổng lượng nhập: <strong>${Number(h.totalImportQuantity).toLocaleString()} ${h.unit || 'kg'}</strong> (${h.totalImports} lần nhập)</div>
        <div>Đơn giá nhập gần nhất: <strong style="color: var(--misa-green)">$${h.latestImportPrice ? h.latestImportPrice.toFixed(4) : '-'} / ${h.unit || 'kg'}</strong></div>
        <div>Đơn giá bình quân: <strong style="color: var(--misa-blue)">$${h.averageImportPrice ? h.averageImportPrice.toFixed(4) : '-'} / ${h.unit || 'kg'}</strong></div>
      </div>

      <div class="grid-scroll" style="max-height: 400px;">
        <table class="misa-table">
          <thead>
            <tr>
              <th>Ngày GD</th>
              <th>Loại Hình</th>
              <th>Mã Lô Hàng</th>
              <th>Số Hóa Đơn (Invoice)</th>
              <th>Đối Tác (NCC / Khách)</th>
              <th>Số Lượng (${h.unit || 'kg'})</th>
              <th>Đơn Giá (USD)</th>
              <th>Tổng Tiền</th>
              <th>Trạng Thái Lô</th>
            </tr>
          </thead>
          <tbody>
            ${h.history.length === 0 ? `<tr><td colspan="9" style="text-align:center; padding: 24px;">Chưa phát sinh giao dịch nhập/xuất nào cho mã sợi này.</td></tr>` : 
              h.history.map(row => `
                <tr>
                  <td>${new Date(row.date).toLocaleDateString('vi-VN')}</td>
                  <td>${row.shipmentType === 'Import' ? '<span class="chip chip-info">📥 Nhập khẩu</span>' : '<span class="chip chip-success">📤 Xuất khẩu</span>'}</td>
                  <td><strong>${row.shipmentCode}</strong></td>
                  <td><code>${row.invoiceNumber || '-'}</code></td>
                  <td>${row.partnerName || '-'} (${row.partnerCountry || '-'})</td>
                  <td><strong>${Number(row.quantity).toLocaleString()}</strong></td>
                  <td>$${row.unitPrice.toFixed(4)}</td>
                  <td><strong>$${Number(row.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></td>
                  <td><span class="chip chip-warning">${row.status || 'Hoàn tất'}</span></td>
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
