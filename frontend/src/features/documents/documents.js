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
          <span>📤</span> <span>Tải Lên Chứng Từ & Hồ Sơ Xuất Nhập Khẩu</span>
        </div>

        <div class="dropzone" id="documentDropzone">
          <div class="dropzone-icon">📁</div>
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
            <button type="button" id="btnStartUpload" class="btn btn-primary">✔ Bắt Đầu Tải Lên</button>
          </div>
        </div>
      </div>

      <!-- DOCUMENT LIST -->
      <div class="grid-card" style="flex: 1;">
        <div class="misa-toolbar">
          <div class="toolbar-group">
            <span style="font-weight: 700; font-size: 13px;">Danh Sách Chứng Từ Đã Lưu Trữ</span>
            <button id="btnDocRefresh" class="btn btn-default btn-sm">🔄 Nạp lại</button>
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
        <td><strong>📄 ${d.originalFileName || d.fileName}</strong></td>
        <td><span class="chip chip-info">${getCategoryLabel(d.category)}</span></td>
        <td>${d.shipmentCode ? `<strong>${d.shipmentCode}</strong>` : '-'}</td>
        <td>${sizeStr}</td>
        <td><code>${(d.fileType || '').toUpperCase()}</code></td>
        <td>${new Date(d.createdAt).toLocaleDateString('vi-VN')}</td>
        <td>${d.description || '-'}</td>
        <td>
          <a href="/api/documents/${d.id}/download" class="btn btn-default btn-sm" target="_blank">⬇️ Tải về</a>
          <button class="btn btn-danger btn-sm" onclick="window.xnkDeleteDoc('${d.id}')">🗑️</button>
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
