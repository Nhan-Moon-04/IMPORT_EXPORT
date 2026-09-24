import { api, showToast, openModal, closeModal, showConfirm, getToken } from "../../core/api.js";

let documentsList = [];
let shipments = [];
let currentCategoryFilter = '';
let currentSearchQuery = '';

export async function renderDocuments(container) {
  container.innerHTML = `
    <div style="display: flex; height: 100%; overflow: hidden; background: var(--bg-surface);">
      <!-- LEFT SIDEBAR: CATEGORY FILTER -->
      <div style="width: 250px; border-right: 1px solid var(--border-color); display: flex; flex-direction: column; background: var(--bg-surface);">
        <div style="padding: 16px; font-weight: 700; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; gap: 8px; color: var(--text-color);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
          Phân Loại Chứng Từ
        </div>
        <div style="padding: 8px; overflow-y: auto; flex: 1;">
          <ul class="nav-menu" id="docCategoryList" style="list-style: none; padding: 0; margin: 0;">
            <li class="nav-item active" data-cat="" style="padding: 10px 12px; cursor: pointer; border-radius: 6px; margin-bottom: 2px; font-size: 13px; font-weight: 600;">📁 Tất cả chứng từ</li>
            <li class="nav-item" data-cat="BillOfLading" style="padding: 10px 12px; cursor: pointer; border-radius: 6px; margin-bottom: 2px; font-size: 13px;">🚢 Vận đơn (B/L)</li>
            <li class="nav-item" data-cat="CommercialInvoice" style="padding: 10px 12px; cursor: pointer; border-radius: 6px; margin-bottom: 2px; font-size: 13px;">📄 Hóa đơn (Invoice)</li>
            <li class="nav-item" data-cat="PackingList" style="padding: 10px 12px; cursor: pointer; border-radius: 6px; margin-bottom: 2px; font-size: 13px;">📦 Phiếu đóng gói (PL)</li>
            <li class="nav-item" data-cat="CertificateOfOrigin" style="padding: 10px 12px; cursor: pointer; border-radius: 6px; margin-bottom: 2px; font-size: 13px;">📜 Chứng nhận xuất xứ (C/O)</li>
            <li class="nav-item" data-cat="CustomsDeclaration" style="padding: 10px 12px; cursor: pointer; border-radius: 6px; margin-bottom: 2px; font-size: 13px;">🛂 Tờ khai hải quan</li>
            <li class="nav-item" data-cat="Insurance" style="padding: 10px 12px; cursor: pointer; border-radius: 6px; margin-bottom: 2px; font-size: 13px;">🛡️ Chứng từ bảo hiểm</li>
            <li class="nav-item" data-cat="InspectionCertificate" style="padding: 10px 12px; cursor: pointer; border-radius: 6px; margin-bottom: 2px; font-size: 13px;">🔎 Giấy chứng nhận/Kiểm định</li>
            <li class="nav-item" data-cat="Other" style="padding: 10px 12px; cursor: pointer; border-radius: 6px; font-size: 13px;">📎 Khác</li>
          </ul>
        </div>
      </div>

      <!-- RIGHT MAIN CONTENT -->
      <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden; padding: 16px;">
        <div class="misa-toolbar" style="margin-bottom: 16px; border-radius: 8px;">
          <div class="toolbar-group">
            <button id="btnOpenUpload" class="btn btn-primary" style="font-weight: 600;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              Tải Lên File
            </button>
            <button id="btnDocRefresh" class="btn btn-default">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
              Nạp lại
            </button>
          </div>
          <div class="toolbar-group">
            <input type="text" id="docSearchInput" class="form-input" style="width: 250px;" placeholder="Tìm kiếm tên file, mô tả...">
          </div>
        </div>

        <div class="grid-scroll" style="border: 1px solid var(--border-color); border-radius: 8px;">
          <table class="misa-table" id="docsTable">
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;"><input type="checkbox"></th>
                <th>Tên File</th>
                <th>Phân Loại</th>
                <th>Lô Hàng Liên Kết</th>
                <th>Dung Lượng</th>
                <th>Định Dạng</th>
                <th>Ngày Tải Lên</th>
                <th>Mô Tả</th>
                <th style="text-align: center;">Thao Tác</th>
              </tr>
            </thead>
            <tbody id="docsTbody">
              <tr><td colspan="9" style="text-align:center; padding: 40px;">
                <div class="spinner" style="margin: 0 auto;"></div>
                <p style="margin-top: 10px; color: var(--text-muted);">Đang tải dữ liệu chứng từ...</p>
              </td></tr>
            </tbody>
          </table>
        </div>

        <div class="misa-pagination" style="margin-top: 16px;">
          <div id="docPaginationText">Tổng số: 0 tệp</div>
        </div>
      </div>
    </div>
  `;

  setupEvents();
  await loadDocumentsData();
}

async function loadDocumentsData() {
  try {
    const [docRes, shpRes] = await Promise.all([
      api.get("/api/documents?pageSize=100"),
      api.get("/api/shipments?pageSize=100")
    ]);
    documentsList = docRes.data?.items || [];
    shipments = shpRes.data?.items || [];

    applyFilters();
  } catch (err) {
    showToast("Lỗi khi tải danh sách chứng từ", "error");
  }
}

function applyFilters() {
  let filtered = documentsList;
  if (currentCategoryFilter) {
    filtered = filtered.filter(d => d.category === currentCategoryFilter);
  }
  if (currentSearchQuery) {
    const q = currentSearchQuery.toLowerCase();
    filtered = filtered.filter(d => 
      (d.originalFileName && d.originalFileName.toLowerCase().includes(q)) ||
      (d.fileName && d.fileName.toLowerCase().includes(q)) ||
      (d.description && d.description.toLowerCase().includes(q)) ||
      (d.shipmentCode && d.shipmentCode.toLowerCase().includes(q))
    );
  }
  renderDocumentsTable(filtered);
}

function renderDocumentsTable(items) {
  const tbody = document.getElementById("docsTbody");
  if (!tbody) return;

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 40px; color: var(--text-muted)">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="opacity:0.5; margin-bottom:12px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
      <br>Không có chứng từ nào phù hợp.
    </td></tr>`;
    document.getElementById("docPaginationText").textContent = "Tổng số: 0 tệp";
    return;
  }

  tbody.innerHTML = items.map(d => {
    const sizeStr = d.fileSize ? (d.fileSize > 1024 * 1024 ? (d.fileSize / (1024 * 1024)).toFixed(2) + " MB" : (d.fileSize / 1024).toFixed(1) + " KB") : "-";
    const fileExt = (d.fileType || '').toLowerCase();
    const isImage = ['jpg','jpeg','png','gif'].includes(fileExt);
    const iconColor = fileExt === 'pdf' ? '#ef4444' : (fileExt === 'xls' || fileExt === 'xlsx' ? '#10b981' : (fileExt === 'doc' || fileExt === 'docx' ? '#3b82f6' : (isImage ? '#f59e0b' : '#6b7280')));
    
    return `
      <tr>
        <td style="text-align: center;"><input type="checkbox"></td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
            <strong style="color: var(--misa-blue); cursor: pointer;" onclick="window.xnkDownloadDoc('${d.id}', '${d.originalFileName || d.fileName}')" title="Tải xuống">${d.originalFileName || d.fileName}</strong>
          </div>
        </td>
        <td><span class="chip chip-info" style="font-weight: 500;">${getCategoryLabel(d.category)}</span></td>
        <td>${d.shipmentCode ? `<strong>${d.shipmentCode}</strong>` : '-'}</td>
        <td style="color: var(--text-muted);">${sizeStr}</td>
        <td><span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: #f3f4f6; color: #4b5563; border: 1px solid #e5e7eb;">${fileExt.toUpperCase()}</span></td>
        <td>${new Date(d.createdAt).toLocaleDateString('vi-VN')}</td>
        <td>${d.description || '-'}</td>
        <td style="text-align: center; white-space: nowrap;">
          <button class="btn btn-default btn-sm" title="Tải xuống" onclick="window.xnkDownloadDoc('${d.id}', '${d.originalFileName || d.fileName}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--amis-green)" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          </button>
          <button class="btn btn-default btn-sm" title="Xóa" onclick="window.xnkDeleteDoc('${d.id}', '${d.originalFileName || d.fileName}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--amis-red)" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
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

function setupEvents() {
  document.getElementById("btnDocRefresh")?.addEventListener("click", () => {
    loadDocumentsData();
  });

  document.getElementById("docSearchInput")?.addEventListener("input", (e) => {
    currentSearchQuery = e.target.value.trim();
    applyFilters();
  });

  // Sidebar Category Filter
  const categoryItems = document.querySelectorAll("#docCategoryList .nav-item");
  categoryItems.forEach(item => {
    item.addEventListener("click", () => {
      categoryItems.forEach(i => {
        i.classList.remove("active");
        i.style.backgroundColor = "transparent";
        i.style.color = "var(--text-color)";
      });
      item.classList.add("active");
      item.style.backgroundColor = "var(--bg-light)";
      item.style.color = "var(--misa-blue)";
      
      currentCategoryFilter = item.getAttribute("data-cat");
      applyFilters();
    });
  });

  document.getElementById("btnOpenUpload")?.addEventListener("click", () => {
    openUploadDocumentModal();
  });

  // Global functions for inline HTML event handlers
  window.xnkDownloadDoc = async (id, fileName) => {
    try {
      const res = await fetch(`/api/documents/${id}/download`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (!res.ok) throw new Error("Không thể tải file");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'Document';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      showToast('Đã tải xuống thành công!', 'success');
    } catch(e) {
      showToast('Lỗi khi tải xuống file: ' + e.message, 'error');
    }
  };

  window.xnkDeleteDoc = async (id, fileName) => {
    const isConfirm = await showConfirm({
      title: 'Xóa Chứng Từ',
      message: 'Bạn có chắc chắn muốn xóa file chứng từ này?',
      highlight: fileName,
      type: 'danger',
      confirmText: 'Xóa File'
    });

    if (isConfirm) {
      try {
        await api.delete(`/api/documents/${id}`);
        showToast("Đã xóa file thành công!", "success");
        await loadDocumentsData();
      } catch (err) {
        showToast("Lỗi khi xóa file", "error");
      }
    }
  };
}

function openUploadDocumentModal() {
  const content = `
    <div style="padding: 10px 0;">
      <div class="dropzone" id="modalDocumentDropzone" style="cursor: pointer; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 30px; text-align: center; transition: all 0.2s;">
        <div class="dropzone-icon" style="margin-bottom: 12px; color: #94a3b8;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><polyline points="9 14 12 11 15 14"></polyline></svg>
        </div>
        <div style="font-weight: 700; font-size: 15px; color: var(--misa-blue);">Kéo thả file chứng từ vào đây hoặc bấm để chọn tệp</div>
        <div style="font-size: 13px; color: var(--text-muted); margin-top: 6px;">Hỗ trợ: PDF, Excel, Word, Ảnh (Tối đa 50MB)</div>
        <input type="file" id="modalFilePickerInput" style="display: none;">
      </div>

      <div id="modalFileUploadForm" style="display: none; margin-top: 20px;">
        <div style="background: #eef2ff; border: 1px solid #c7d2fe; padding: 12px 16px; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
            <div>
              <div style="font-weight: 700; font-size: 14px; color: #3730a3;" id="modalSelectedFileName">document.pdf</div>
              <div style="font-size: 12px; color: #6366f1;" id="modalSelectedFileSize">1.2 MB</div>
            </div>
          </div>
          <button type="button" id="btnCancelFile" class="btn btn-default btn-sm" style="background: white; border-color: #c7d2fe; color: #4f46e5;">Đổi file khác</button>
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label required">Phân Loại Chứng Từ</label>
            <select id="modalDocCategory" class="form-select">
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
            <select id="modalDocShipmentId" class="form-select">
              <option value="">-- Không liên kết --</option>
              ${shipments.map(s => `<option value="${s.id}">${s.shipmentCode} (${s.type})</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Mô Tả Ghi Chú</label>
          <input type="text" id="modalDocDesc" class="form-input" placeholder="VD: Vận đơn gốc surrender có ký điện tử">
        </div>

        <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; border-top: 1px solid var(--border-color); padding-top: 16px;">
          <button type="button" class="btn btn-default" onclick="closeModal()">Hủy Bỏ</button>
          <button type="button" id="btnStartModalUpload" class="btn btn-primary" style="padding: 0 24px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> 
            Tải Lên Chứng Từ
          </button>
        </div>
      </div>
    </div>
  `;

  openModal('Tải Lên Chứng Từ XNK', content);

  // Setup modal events
  const dropzone = document.getElementById("modalDocumentDropzone");
  const fileInput = document.getElementById("modalFilePickerInput");
  const uploadForm = document.getElementById("modalFileUploadForm");
  let selectedFile = null;

  dropzone.addEventListener("click", () => fileInput.click());

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.style.borderColor = "var(--misa-blue)";
    dropzone.style.background = "#eff6ff";
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.style.borderColor = "#cbd5e1";
    dropzone.style.background = "#f8fafc";
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.style.borderColor = "#cbd5e1";
    dropzone.style.background = "#f8fafc";
    if (e.dataTransfer.files.length > 0) {
      handleModalFileSelected(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleModalFileSelected(e.target.files[0]);
    }
  });

  function handleModalFileSelected(file) {
    selectedFile = file;
    document.getElementById("modalSelectedFileName").textContent = file.name;
    document.getElementById("modalSelectedFileSize").textContent = (file.size / 1024 > 1024) 
      ? (file.size / (1024 * 1024)).toFixed(2) + " MB" 
      : (file.size / 1024).toFixed(1) + " KB";
      
    dropzone.style.display = "none";
    uploadForm.style.display = "block";
    
    // Auto-select category based on file name or ext
    const nameLow = file.name.toLowerCase();
    const selectCat = document.getElementById("modalDocCategory");
    if (nameLow.includes("invoice") || nameLow.includes("inv")) selectCat.value = "CommercialInvoice";
    else if (nameLow.includes("packing") || nameLow.includes("pk") || nameLow.includes("pl")) selectCat.value = "PackingList";
    else if (nameLow.includes("bl") || nameLow.includes("bill of lading") || nameLow.includes("surrender")) selectCat.value = "BillOfLading";
    else if (nameLow.includes("co") || nameLow.includes("certificate of origin")) selectCat.value = "CertificateOfOrigin";
    else if (nameLow.includes("khai hải quan") || nameLow.includes("customs") || nameLow.includes("hq")) selectCat.value = "CustomsDeclaration";
  }

  document.getElementById("btnCancelFile").addEventListener("click", () => {
    selectedFile = null;
    uploadForm.style.display = "none";
    dropzone.style.display = "block";
    fileInput.value = "";
  });

  document.getElementById("btnStartModalUpload").addEventListener("click", async () => {
    if (!selectedFile) return;
    
    const btnSubmit = document.getElementById("btnStartModalUpload");
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<div class="spinner" style="width:16px; height:16px; border-width:2px; border-top-color:white;"></div> Đang tải lên...';

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("category", document.getElementById("modalDocCategory").value);
    const shpId = document.getElementById("modalDocShipmentId").value;
    if (shpId) formData.append("shipmentId", shpId);
    const desc = document.getElementById("modalDocDesc").value.trim();
    if (desc) formData.append("description", desc);

    try {
      await api.upload("/api/documents/upload", formData);
      showToast("Tải lên chứng từ thành công!", "success");
      closeModal();
      await loadDocumentsData();
    } catch (err) {
      showToast("Lỗi tải lên: " + err.message, "error");
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> Tải Lên Chứng Từ';
    }
  });
}
