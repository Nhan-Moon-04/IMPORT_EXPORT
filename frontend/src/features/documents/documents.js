/**
 * Documents Feature Module - Drag & Drop Upload, Preview, Download & Delete
 */
import { api, showToast } from "../../core/api.js";

let documentsList = [];
let shipments = [];

export async function renderDocuments(container) {
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 16px; height: 100%; overflow-y: auto;">
      
      <!-- UPLOAD PANEL -->
      <div style="background: var(--bg-surface); padding: 18px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); box-shadow: var(--shadow-sm);">
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--amis-blue)" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          <span>Tải Lên Chứng Từ & Hồ Sơ Xuất Nhập Khẩu</span>
        </div>

        <div class="dropzone" id="documentDropzone">
          <div class="dropzone-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg></div>
          <div style="font-weight: 700; font-size: 14px; color: var(--misa-blue);">Kéo thả file chứng từ vào đây hoặc bấm để chọn tệp</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Hỗ trợ: PDF (B/L, C/O, Tờ khai), Excel (Invoice, Packing list), Word, Ảnh hóa đơn scan (Tối đa 50MB)</div>
          <input type="file" id="filePickerInput" style="display: none;">
        </div>

        <div id="fileUploadForm" style="display: none; background: var(--bg-surface-alt); padding: 14px; border: 1px solid var(--border-color); border-radius: var(--radius-xs); margin-top: 10px;">
          <div style="font-weight: 600; margin-bottom: 8px;">Tệp đã chọn: <span id="selectedFileName" style="color: var(--misa-blue)"></span></div>
          <div class="form-row-3">
            <div class="form-group">
              <label class="form-label required">Phân Loại Chứng Từ</label>
              <select id="docCategory" class="form-select">
                <option value="BillOfLading">Vận đơn đường biển (Bill of Lading - B/L)</option>
                <option value="CommercialInvoice">Hóa đơn thương mại (Commercial Invoice)</option>
                <option value="PackingList">Phiếu đóng gói (Packing List)</option>
                <option value="CertificateOfOrigin">Chứng nhận xuất xứ (C/O)</option>
                <option value="CustomsDeclaration">Tờ khai hải quan (Customs Declaration)</option>
                <option value="Insurance">Chứng từ bảo hiểm hàng hải</option>
                <option value="InspectionCertificate">Chứng thư kiểm định / Giám định</option>
                <option value="Other">Chứng từ khác</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Liên Kết Lô Hàng (Shipment)</label>
              <select id="docShipmentId" class="form-select">
                <option value="">-- Không liên kết --</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Mô Tả Ghi Chú</label>
              <input type="text" id="docDesc" class="form-input" placeholder="VD: Vận đơn gốc surrender có ký điện tử">
            </div>
          </div>
          <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 6px;">
            <button type="button" id="btnCancelUpload" class="btn btn-default">Hủy</button>
            <button type="button" id="btnStartUpload" class="btn btn-primary"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> Bắt Đầu Tải Lên</button>
          </div>
        </div>
      </div>

      <!-- DOCUMENT LIST -->
      <div class="grid-card" style="flex: 1;">
        <div class="misa-toolbar">
          <div class="toolbar-group">
            <span style="font-weight: 700; font-size: 13px;">Danh Sách Chứng Từ Đã Lưu Trữ</span>
            <button id="btnDocRefresh" class="btn btn-default btn-sm"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg> Nạp lại</button>
          </div>
          <div class="toolbar-group">
            <input type="text" id="docSearchInput" class="form-input" style="width: 200px;" placeholder="Lọc theo tên file...">
          </div>
        </div>

        <div class="grid-scroll">
          <table class="misa-table" id="docsTable">
            <thead>
              <tr>
                <th>Tên File</th>
                <th>Phân Loại</th>
                <th>Lô Hàng Liên Kết</th>
                <th>Dung Lượng</th>
                <th>Định Dạng</th>
                <th>Ngày Tải Lên</th>
                <th>Mô Tả</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody id="docsTbody">
              <tr><td colspan="8" style="text-align:center; padding: 24px;">Đang tải danh sách file...</td></tr>
            </tbody>
          </table>
        </div>

        <div class="misa-pagination">
          <div id="docPaginationText">Tổng số: 0 tệp</div>
        </div>
      </div>
    </div>
  `;

  setupDocEvents();
  await loadDocumentsData();
}

async function loadDocumentsData() {
  try {
    const [docRes, shpRes] = await Promise.all([
      api.get("/api/documents?pageSize=100"),
      api.get("/api/shipments?pageSize=100")
    ]);
    documentsList = docRes.data.items;
    shipments = shpRes.data.items;

    const select = document.getElementById("docShipmentId");
    if (select) {
      select.innerHTML = `<option value="">-- Không liên kết --</option>` +
        shipments.map(s => `<option value="${s.id}">${s.shipmentCode} (${s.type})</option>`).join('');
    }

    renderDocumentsTable(documentsList);
  } catch (err) {
    // Handled
  }
}

function renderDocumentsTable(items) {
  const tbody = document.getElementById("docsTbody");
  if (!tbody) return;

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 24px; color: var(--text-muted)">Chưa có tài liệu/file nào được tải lên.</td></tr>`;
    document.getElementById("docPaginationText").textContent = "Tổng số: 0 tệp";
    return;
  }

  tbody.innerHTML = items.map(d => {
    const sizeStr = d.fileSize ? (d.fileSize > 1024 * 1024 ? (d.fileSize / (1024 * 1024)).toFixed(2) + " MB" : (d.fileSize / 1024).toFixed(1) + " KB") : "-";
    return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted)"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            <strong>${d.originalFileName || d.fileName}</strong>
          </div>
        </td>
        <td><span class="chip chip-info">${getCategoryLabel(d.category)}</span></td>
        <td>${d.shipmentCode ? `<strong>${d.shipmentCode}</strong>` : '-'}</td>
        <td>${sizeStr}</td>
        <td><code>${(d.fileType || '').toUpperCase()}</code></td>
        <td>${new Date(d.createdAt).toLocaleDateString('vi-VN')}</td>
        <td>${d.description || '-'}</td>
        <td style="white-space: nowrap;">
          <a href="/api/documents/${d.id}/download" class="btn btn-default btn-sm" target="_blank"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Tải về</a>
          <button class="btn btn-default btn-sm" style="color: var(--amis-red);" onclick="window.xnkDeleteDoc('${d.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
        </td>
      </tr>
    `;
  }).join('');

  document.getElementById("docPaginationText").textContent = `Tổng số: ${items.length} tệp chứng từ`;
}

function getCategoryLabel(cat) {
  const map = {
    BillOfLading: "Vận đơn B/L",
    CommercialInvoice: "Hóa đơn Invoice",
    PackingList: "Packing List",
    CertificateOfOrigin: "C/O Xuất xứ",
    CustomsDeclaration: "Tờ khai hải quan",
    Insurance: "Bảo hiểm",
    InspectionCertificate: "Kiểm định",
    Other: "Khác"
  };
  return map[cat] || cat;
}

function setupDocEvents() {
  const dropzone = document.getElementById("documentDropzone");
  const fileInput = document.getElementById("filePickerInput");
  const uploadForm = document.getElementById("fileUploadForm");
  let selectedFile = null;

  dropzone?.addEventListener("click", () => fileInput.click());

  dropzone?.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.style.borderColor = "var(--misa-blue)";
    dropzone.style.background = "#e0f2fe";
  });

  dropzone?.addEventListener("dragleave", () => {
    dropzone.style.borderColor = "#93c5fd";
    dropzone.style.background = "#f0f9ff";
  });

  dropzone?.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.style.borderColor = "#93c5fd";
    dropzone.style.background = "#f0f9ff";
    if (e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });

  fileInput?.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  });

  function handleFileSelected(file) {
    selectedFile = file;
    document.getElementById("selectedFileName").textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    uploadForm.style.display = "block";
  }

  document.getElementById("btnCancelUpload")?.addEventListener("click", () => {
    selectedFile = null;
    uploadForm.style.display = "none";
    fileInput.value = "";
  });

  document.getElementById("btnStartUpload")?.addEventListener("click", async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("category", document.getElementById("docCategory").value);
    const shpId = document.getElementById("docShipmentId").value;
    if (shpId) formData.append("shipmentId", shpId);
    const desc = document.getElementById("docDesc").value.trim();
    if (desc) formData.append("description", desc);

    try {
      await api.upload("/api/documents/upload", formData);
      showToast("Tải lên chứng từ thành công!");
      selectedFile = null;
      uploadForm.style.display = "none";
      fileInput.value = "";
      await loadDocumentsData();
    } catch (err) {
      // Handled
    }
  });

  document.getElementById("btnDocRefresh")?.addEventListener("click", loadDocumentsData);

  document.getElementById("docSearchInput")?.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = documentsList.filter(d => 
      (d.originalFileName && d.originalFileName.toLowerCase().includes(q)) ||
      (d.fileName && d.fileName.toLowerCase().includes(q)) ||
      (d.category && d.category.toLowerCase().includes(q))
    );
    renderDocumentsTable(filtered);
  });

  window.xnkDeleteDoc = async (id) => {
    if (!confirm("Bạn có chắc chắn muốn xóa file chứng từ này?")) return;
    try {
      await api.delete(`/api/documents/${id}`);
      showToast("Đã xóa file thành công!");
      await loadDocumentsData();
    } catch (err) {
      // Handled
    }
  };
}
