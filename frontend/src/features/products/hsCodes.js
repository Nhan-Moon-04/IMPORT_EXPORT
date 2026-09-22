import { api, showToast } from "../../core/api.js";

let hsList = [];
let selectedId = null;

export async function renderHsCodes(container) {
  selectedId = null;
  container.innerHTML = `
    <div class="grid-card">
      <div class="misa-toolbar">
        <div class="toolbar-group">
          <button id="btnHsAdd" class="btn btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> 
            <span>Thêm mới</span>
          </button>
          <button id="btnHsEdit" class="btn btn-default" disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg> 
            <span>Sửa</span>
          </button>
          <button id="btnHsDelete" class="btn btn-default" style="color: var(--amis-red);" disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> 
            <span>Xóa</span>
          </button>
          <button id="btnHsRefresh" class="btn btn-default">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg> 
            <span>Nạp lại</span>
          </button>
        </div>

        <div class="toolbar-group">
          <input type="text" id="hsSearchInput" class="form-input" style="width: 250px;" placeholder="Tìm mã HS Code, mô tả...">
        </div>
      </div>

      <div class="grid-scroll">
        <table class="misa-table" id="hsTable">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;"><input type="checkbox" id="checkAllHs"></th>
              <th>Mã HS (HS Code)</th>
              <th style="width: 40%">Mô Tả Hàng Hóa</th>
              <th style="text-align: right;">Thuế NK (%)</th>
              <th style="text-align: right;">NK Ưu Đãi (%)</th>
              <th style="text-align: right;">VAT (%)</th>
              <th>C/O Yêu Cầu</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody id="hsTbody">
            <tr><td colspan="8" style="text-align: center; padding: 24px;">Đang tải dữ liệu...</td></tr>
          </tbody>
        </table>
      </div>

      <div class="misa-pagination">
        <div id="hsPaginationText">Tổng số: 0 bản ghi</div>
        <div class="pagination-controls">
          <span>Hiển thị 50 dòng/trang</span>
        </div>
      </div>
    </div>
  `;

  setupHsEvents();
  await loadHsData();
}

async function loadHsData() {
  try {
    // Mocking HS Codes data since there's no backend endpoint yet
    hsList = [
      { id: 'hs1', code: '5402.47.00', description: 'Các loại sợi dệt khác, bằng polyeste, dạng sợi đơn, không xoắn hoặc có độ xoắn không quá 50 vòng/mét', importTax: 12, prefTax: 0, vat: 8, co: 'Form E, Form D' },
      { id: 'hs2', code: '5402.33.00', description: 'Sợi dún, bằng polyeste', importTax: 12, prefTax: 0, vat: 8, co: 'Form E, Form D' },
      { id: 'hs3', code: '5509.51.00', description: 'Sợi (trừ chỉ khâu) chứa từ 85% trở lên tính theo trọng lượng là xơ staple tổng hợp', importTax: 5, prefTax: 0, vat: 8, co: 'Form E' },
      { id: 'hs4', code: '5205.11.00', description: 'Sợi bông (trừ chỉ khâu), chứa từ 85% trở lên tính theo trọng lượng là bông, chưa đóng gói để bán lẻ', importTax: 5, prefTax: 0, vat: 8, co: 'Form D' }
    ];
    renderHsTable(hsList);
  } catch (err) {
    document.getElementById("hsTbody").innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 24px; color: var(--amis-red)">Lỗi khi tải dữ liệu.</td></tr>`;
  }
}

function renderHsTable(items) {
  const tbody = document.getElementById("hsTbody");
  if (!tbody) return;

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 24px; color: var(--text-muted)">Không tìm thấy biểu thuế nào.</td></tr>`;
    document.getElementById("hsPaginationText").textContent = "Tổng số: 0 bản ghi";
    return;
  }

  tbody.innerHTML = items.map(h => `
    <tr data-id="${h.id}" class="${selectedId === h.id ? 'selected' : ''}">
      <td style="text-align: center;"><input type="checkbox" class="row-checkbox" value="${h.id}" ${selectedId === h.id ? 'checked' : ''}></td>
      <td><strong style="color: var(--misa-blue);">${h.code}</strong></td>
      <td style="white-space: normal; line-height: 1.4;">${h.description}</td>
      <td style="text-align: right;">${h.importTax}%</td>
      <td style="text-align: right; color: var(--amis-green); font-weight: 600;">${h.prefTax}%</td>
      <td style="text-align: right;">${h.vat}%</td>
      <td><span class="status-chip chip-transit">${h.co || '-'}</span></td>
      <td>
        <button class="btn btn-default btn-sm" onclick="window.xnkEditHs('${h.id}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg> Sửa
        </button>
      </td>
    </tr>
  `).join('');

  document.getElementById("hsPaginationText").textContent = `Tổng số: ${items.length} bản ghi`;

  tbody.querySelectorAll("tr").forEach(tr => {
    tr.addEventListener("click", (e) => {
      if (e.target.tagName === "BUTTON" || e.target.closest("button")) return;
      selectRow(tr.getAttribute("data-id"));
    });
  });
}

function selectRow(id) {
  selectedId = id;
  const tbody = document.getElementById("hsTbody");
  if (!tbody) return;

  tbody.querySelectorAll("tr").forEach(tr => {
    const isCur = tr.getAttribute("data-id") === id;
    tr.classList.toggle("selected", isCur);
    const cb = tr.querySelector(".row-checkbox");
    if (cb) cb.checked = isCur;
  });

  const btnEdit = document.getElementById("btnHsEdit");
  const btnDelete = document.getElementById("btnHsDelete");
  if (btnEdit) btnEdit.disabled = !id;
  if (btnDelete) btnDelete.disabled = !id;
}

function setupHsEvents() {
  document.getElementById("btnHsRefresh")?.addEventListener("click", loadHsData);
  document.getElementById("btnHsAdd")?.addEventListener("click", () => openHsForm(null));
  document.getElementById("btnHsEdit")?.addEventListener("click", () => {
    if (selectedId) openHsForm(selectedId);
  });
  document.getElementById("btnHsDelete")?.addEventListener("click", () => {
    if (selectedId) deleteHs(selectedId);
  });

  document.getElementById("hsSearchInput")?.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = hsList.filter(h => 
      h.code.toLowerCase().includes(q) || 
      h.description.toLowerCase().includes(q)
    );
    renderHsTable(filtered);
  });

  window.xnkEditHs = (id) => openHsForm(id);
}

// ==================== CREATE / EDIT MODAL ====================
function openHsForm(id) {
  let item = id ? hsList.find(x => x.id === id) : null;
  const isEdit = !!item;

  const title = document.getElementById("modalTitle");
  const tabs = document.getElementById("modalTabs");
  const body = document.getElementById("modalBody");
  const footer = document.getElementById("modalFooter");

  title.innerHTML = isEdit ? `Chỉnh sửa Mã HS: <strong>${item.code}</strong>` : `Thêm mới Mã HS Code`;
  tabs.style.display = "none";

  body.innerHTML = `
    <form id="hsForm">
      <div class="form-group" style="margin-bottom: 12px;">
        <label class="form-label required">Mã HS Code</label>
        <input type="text" id="fhCode" class="form-input" required value="${item?.code || ''}" placeholder="VD: 5402.47.00">
      </div>

      <div class="form-group" style="margin-bottom: 12px;">
        <label class="form-label required">Mô Tả Hàng Hóa</label>
        <textarea id="fhDesc" class="form-textarea" required rows="3" placeholder="Mô tả chi tiết theo biểu thuế XNK">${item?.description || ''}</textarea>
      </div>

      <div class="form-row-3">
        <div class="form-group">
          <label class="form-label required">Thuế NK (%)</label>
          <input type="number" step="0.1" id="fhImport" class="form-input" required value="${item?.importTax !== undefined ? item.importTax : '12'}">
        </div>
        <div class="form-group">
          <label class="form-label required">NK Ưu Đãi (%)</label>
          <input type="number" step="0.1" id="fhPref" class="form-input" required value="${item?.prefTax !== undefined ? item.prefTax : '0'}">
        </div>
        <div class="form-group">
          <label class="form-label required">Thuế VAT (%)</label>
          <input type="number" step="0.1" id="fhVat" class="form-input" required value="${item?.vat !== undefined ? item.vat : '8'}">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Yêu Cầu C/O</label>
        <input type="text" id="fhCo" class="form-input" value="${item?.co || ''}" placeholder="VD: Form E, Form D, Form AK...">
      </div>
    </form>
  `;

  footer.innerHTML = `
    <button type="button" class="btn btn-default" onclick="window.closeGlobalModal()">Hủy bỏ</button>
    <button type="button" id="btnSaveHs" class="btn btn-primary">✔ Cất (Lưu)</button>
  `;

  document.getElementById("btnSaveHs").onclick = () => {
    const code = document.getElementById("fhCode").value.trim();
    const desc = document.getElementById("fhDesc").value.trim();
    if (!code || !desc) {
      showToast("Vui lòng điền đủ Mã HS và Mô tả", "error");
      return;
    }

    if (isEdit) {
      item.code = code;
      item.description = desc;
      item.importTax = parseFloat(document.getElementById("fhImport").value) || 0;
      item.prefTax = parseFloat(document.getElementById("fhPref").value) || 0;
      item.vat = parseFloat(document.getElementById("fhVat").value) || 0;
      item.co = document.getElementById("fhCo").value.trim();
      showToast("Đã cập nhật biểu thuế thành công!");
    } else {
      hsList.unshift({
        id: 'hs' + Date.now(),
        code: code,
        description: desc,
        importTax: parseFloat(document.getElementById("fhImport").value) || 0,
        prefTax: parseFloat(document.getElementById("fhPref").value) || 0,
        vat: parseFloat(document.getElementById("fhVat").value) || 0,
        co: document.getElementById("fhCo").value.trim()
      });
      showToast("Đã thêm mã HS mới thành công!");
    }

    window.closeGlobalModal();
    renderHsTable(hsList);
  };

  window.openModal();
}

function deleteHs(id) {
  const h = hsList.find(x => x.id === id);
  if (!confirm(`Bạn có chắc muốn xóa mã HS [${h.code}]?`)) return;

  hsList = hsList.filter(x => x.id !== id);
  showToast("Đã xóa mã HS thành công!");
  selectedId = null;
  renderHsTable(hsList);
}
