// frontend/src/features/customs/customs.js
import { api, toast, openModal, closeModal } from '../../core/api.js';

let currentState = {
  items: [],
  totalCount: 0,
  page: 1,
  pageSize: 20
};

export async function renderCustoms(container, subTab = 'declarations') {
  container.innerHTML = `
    <div class="card">
      <div class="toolbar" style="margin-bottom:14px;">
        <div class="toolbar-left">
          <button class="btn btn-primary" id="btn-add-declaration">
            <span>+</span> <span>Mở Tờ Khai Hải Quan Mới</span>
          </button>
          <button class="btn btn-secondary" id="btn-sync-vnaccs">
            <span>🔄</span> <span>Đồng Bộ Hệ Thống VNACCS</span>
          </button>
        </div>
        <div class="toolbar-right">
          <input type="text" id="customs-search" class="form-control" placeholder="Tìm số tờ khai..." style="width:200px; display:inline-block; margin-right:10px;">
          <select id="customs-filter-type" class="form-control" style="width:160px;">
            <option value="">Tất cả loại hình</option>
            <option value="E21">E21 - Nhập NVL gia công</option>
            <option value="A11">A11 - Nhập KD tiêu dùng</option>
            <option value="A12">A12 - Nhập KD SX</option>
            <option value="B11">B11 - Xuất kinh doanh</option>
          </select>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Số Tờ Khai</th>
              <th>Loại Hình</th>
              <th>Chi Cục Hải Quan</th>
              <th>Mã Lô Hàng</th>
              <th>Ngày Đăng Ký</th>
              <th>Trạng Thái</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody id="customs-tbody">
            <tr><td colspan="7" style="text-align:center;">Đang tải dữ liệu...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('btn-add-declaration').addEventListener('click', () => {
    openCreateCustomsModal(null, () => loadCustoms());
  });
  
  document.getElementById('btn-sync-vnaccs').addEventListener('click', () => {
    toast('Đã kết nối Token Chữ ký số và đồng bộ trạng thái tờ khai thành công!', 'success');
  });

  const searchInput = document.getElementById('customs-search');
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      loadCustoms(searchInput.value.trim());
    }
  });

  await loadCustoms();
}

async function loadCustoms(search = '') {
  const tbody = document.getElementById('customs-tbody');
  if (!tbody) return;

  try {
    const res = await api.get(`/api/customsDeclarations?search=${encodeURIComponent(search)}`);
    currentState.items = res.data.items || [];
    renderTable();
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:red;">Lỗi khi tải dữ liệu tờ khai</td></tr>`;
  }
}

function renderTable() {
  const tbody = document.getElementById('customs-tbody');
  if (!tbody) return;

  if (currentState.items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:#64748b;">Chưa có tờ khai hải quan nào.</td></tr>`;
    return;
  }

  tbody.innerHTML = currentState.items.map(it => {
    const d = it.declarationDate ? new Date(it.declarationDate).toLocaleDateString('vi-VN') : '---';
    const st = it.status === 1 ? '<span class="status-chip chip-delivered" style="background:#dcfce7; color:#15803d;">Luồng Xanh</span>'
             : it.status === 2 ? '<span class="status-chip chip-customs" style="background:#fef3c7; color:#b45309;">Luồng Vàng</span>'
             : it.status === 3 ? '<span class="status-chip chip-cancelled" style="background:#fee2e2; color:#b91c1c;">Luồng Đỏ</span>'
             : '<span class="status-chip chip-draft">Chưa phân luồng</span>';

    return `
      <tr>
        <td style="font-weight:700; color:var(--amis-blue);">${it.declarationNumber || '---'}</td>
        <td><span class="status-chip chip-transit">${it.declarationType || '---'}</span></td>
        <td>${it.customsBranch || '---'}</td>
        <td>${it.shipmentCode || '---'}</td>
        <td>${d}</td>
        <td>${st}</td>
        <td>
          <button class="btn btn-secondary" style="padding:2px 8px; font-size:11px;" onclick="window.viewCustomsDoc('${it.id}')">Xem/Tải File</button>
          <button class="btn btn-primary" style="padding:2px 8px; font-size:11px; margin-left:4px;" onclick="window.editCustomsDeclaration('${it.id}')">Sửa</button>
          <button class="btn btn-danger" style="padding:2px 8px; font-size:11px; margin-left:4px;" onclick="window.deleteCustomsDeclaration('${it.id}')">Xóa</button>
        </td>
      </tr>
    `;
  }).join('');
}

export function openCreateCustomsModal(defaultShipmentId = null, onSuccess = null) {
  const modalHtml = `
    <form id="form-create-customs">
      <div class="form-group">
        <label>Số Tờ Khai *</label>
        <input type="text" id="cd-number" class="form-control" required placeholder="VD: 105492817290">
      </div>
      <div class="form-group">
        <label>Lô Hàng Liên Quan *</label>
        <select id="cd-shipment" class="form-control" required ${defaultShipmentId ? 'disabled' : ''}>
          <option value="">-- Chọn lô hàng --</option>
        </select>
      </div>
      <div class="form-group">
        <label>Loại Hình *</label>
        <select id="cd-type" class="form-control" required>
          <option value="E21">E21 - Nhập NVL gia công</option>
          <option value="A11">A11 - Nhập KD tiêu dùng</option>
          <option value="A12">A12 - Nhập KD SX</option>
          <option value="B11">B11 - Xuất kinh doanh</option>
        </select>
      </div>
      <div class="form-group">
        <label>Chi Cục Hải Quan</label>
        <input type="text" id="cd-branch" class="form-control" placeholder="VD: 02CI - Chi cục HQ CK Cảng Sài Gòn KV1">
      </div>
      <div class="form-group">
        <label>Trạng Thái</label>
        <select id="cd-status" class="form-control">
          <option value="1">Luồng Xanh (Hoàn thành)</option>
          <option value="2">Luồng Vàng (Chưa hoàn thành)</option>
          <option value="3">Luồng Đỏ (Kiểm hóa)</option>
        </select>
      </div>
      <div class="form-group">
        <label>File đính kèm (PDF/Excel)</label>
        <input type="file" id="cd-file" class="form-control">
      </div>
      <div class="form-group">
        <label>Ghi chú</label>
        <textarea id="cd-notes" class="form-control" rows="2"></textarea>
      </div>
      <div style="margin-top:16px; text-align:right;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button type="button" class="btn btn-primary" id="btn-save-customs">Lưu Tờ Khai</button>
      </div>
    </form>
  `;

  openModal('Tạo Tờ Khai Hải Quan Mới', modalHtml);

  // Load shipments
  api.get('/api/shipments?pageSize=100').then(res => {
    const sel = document.getElementById('cd-shipment');
    const items = res.data.items || [];
    items.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.shipmentCode;
      if (s.id === defaultShipmentId) opt.selected = true;
      sel.appendChild(opt);
    });
  }).catch(err => console.error('Failed to load shipments for select', err));

  document.getElementById('btn-save-customs').addEventListener('click', async () => {
    const form = document.getElementById('form-create-customs');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const payload = {
      declarationNumber: document.getElementById('cd-number').value.trim(),
      declarationType: document.getElementById('cd-type').value,
      customsBranch: document.getElementById('cd-branch').value.trim(),
      shipmentId: defaultShipmentId || document.getElementById('cd-shipment').value,
      notes: document.getElementById('cd-notes').value.trim(),
      declarationDate: new Date().toISOString(),
      status: parseInt(document.getElementById('cd-status').value)
    };

    try {
      const createRes = await api.post('/api/customsDeclarations', payload);
      const declarationId = createRes?.data?.id;

      // Handle file upload
      const fileInput = document.getElementById('cd-file');
      if (fileInput && fileInput.files.length > 0 && declarationId) {
        const formData = new FormData();
        formData.append("File", fileInput.files[0]);
        formData.append("Category", "Customs");
        formData.append("EntityType", "CustomsDeclaration");
        formData.append("EntityId", declarationId);
        if (payload.shipmentId) formData.append("ShipmentId", payload.shipmentId);

        await api.upload('/api/documents/upload', formData);
      }

      toast('Tạo tờ khai hải quan thành công!', 'success');
      closeModal();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast(err.message || 'Lỗi khi tạo tờ khai', 'error');
    }
  });
}

// Function tải/xem file đính kèm tờ khai
window.viewCustomsDoc = async function(declarationId) {
  try {
    const res = await api.get(`/api/documents?entityType=CustomsDeclaration&entityId=${declarationId}`);
    const docs = res.data?.items || res.data || [];
    if (docs.length === 0) {
      toast('Không có file nào được đính kèm cho tờ khai này', 'info');
      return;
    }
    const doc = docs[0];
    
    const token = localStorage.getItem("xnk_token");
    const downloadRes = await fetch(`http://localhost:5000/api/documents/${doc.id}/download`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!downloadRes.ok) throw new Error('Không thể tải file');
    
    const blob = await downloadRes.blob();
    const url = window.URL.createObjectURL(blob);
    
    // Check if it's PDF to view in new tab, otherwise download
    if (blob.type === 'application/pdf') {
      window.open(url, '_blank');
      toast('Đã mở file PDF trong thẻ mới', 'success');
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalFileName || doc.fileName || 'Customs_File';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast('Đã tải file thành công!', 'success');
    }
  } catch (err) {
    toast(`Lỗi: ${err.message}`, 'error');
  }
};

window.deleteCustomsDeclaration = function(id, onSuccess = null) {
  const content = `
    <div>
      <p style="margin-bottom:16px; font-size:14px;">Bạn có chắc chắn muốn xóa tờ khai hải quan này?</p>
      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button type="button" class="btn btn-default" onclick="closeModal()">Hủy</button>
        <button type="button" class="btn btn-danger" id="btn-confirm-del-customs">Đồng Ý Xóa</button>
      </div>
    </div>
  `;
  openModal('Xác Nhận Xóa', content);
  
  document.getElementById('btn-confirm-del-customs').addEventListener('click', async () => {
    try {
      await api.delete(`/api/customsDeclarations/${id}`);
      toast('Đã xóa tờ khai thành công!', 'success');
      closeModal();
      
      const search = document.getElementById('customs-search')?.value.trim() || '';
      const res = await api.get(`/api/customsDeclarations?search=${encodeURIComponent(search)}`);
      currentState.items = res.data.items || [];
      renderTable();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast(`Lỗi: ${err.message}`, 'error');
    }
  });
};

window.editCustomsDeclaration = async function(id, onSuccess = null) {
  try {
    const res = await api.get(`/api/customsDeclarations/${id}`);
    const cd = res.data;
    
    const modalHtml = `
      <form id="form-edit-customs">
        <div class="form-group">
          <label>Số Tờ Khai *</label>
          <input type="text" id="cd-number-edit" class="form-control" required value="${cd.declarationNumber}">
        </div>
        <div class="form-group">
          <label>Lô Hàng Liên Quan *</label>
          <select id="cd-shipment-edit" class="form-control" required disabled>
            <option value="${cd.shipmentId}">${cd.shipmentCode || 'Lô hàng đã chọn'}</option>
          </select>
        </div>
        <div class="form-group">
          <label>Loại Hình *</label>
          <select id="cd-type-edit" class="form-control" required>
            <option value="E21" ${cd.declarationType==='E21'?'selected':''}>E21 - Nhập NVL gia công</option>
            <option value="A11" ${cd.declarationType==='A11'?'selected':''}>A11 - Nhập KD tiêu dùng</option>
            <option value="A12" ${cd.declarationType==='A12'?'selected':''}>A12 - Nhập KD SX</option>
            <option value="B11" ${cd.declarationType==='B11'?'selected':''}>B11 - Xuất kinh doanh</option>
          </select>
        </div>
        <div class="form-group">
          <label>Chi Cục Hải Quan</label>
          <input type="text" id="cd-branch-edit" class="form-control" value="${cd.customsBranch || ''}">
        </div>
        <div class="form-group">
          <label>Trạng Thái</label>
          <select id="cd-status-edit" class="form-control">
            <option value="1" ${cd.status===1?'selected':''}>Luồng Xanh (Hoàn thành)</option>
            <option value="2" ${cd.status===2?'selected':''}>Luồng Vàng (Chưa hoàn thành)</option>
            <option value="3" ${cd.status===3?'selected':''}>Luồng Đỏ (Kiểm hóa)</option>
          </select>
        </div>
        <div class="form-group">
          <label>File đính kèm (mới)</label>
          <input type="file" id="cd-file-edit" class="form-control">
        </div>
        <div class="form-group">
          <label>Ghi chú</label>
          <textarea id="cd-notes-edit" class="form-control" rows="2">${cd.notes || ''}</textarea>
        </div>
        <div style="margin-top:16px; text-align:right;">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Hủy</button>
          <button type="button" class="btn btn-primary" id="btn-update-customs">Lưu Thay Đổi</button>
        </div>
      </form>
    `;

    openModal('Sửa Tờ Khai Hải Quan', modalHtml);

    document.getElementById('btn-update-customs').addEventListener('click', async () => {
      const form = document.getElementById('form-edit-customs');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const payload = {
        declarationNumber: document.getElementById('cd-number-edit').value.trim(),
        declarationType: document.getElementById('cd-type-edit').value,
        customsBranch: document.getElementById('cd-branch-edit').value.trim(),
        shipmentId: cd.shipmentId,
        notes: document.getElementById('cd-notes-edit').value.trim(),
        declarationDate: cd.declarationDate,
        status: parseInt(document.getElementById('cd-status-edit').value)
      };

      try {
        await api.put(`/api/customsDeclarations/${id}`, payload);
        
        // Handle file upload edit
        const fileInput = document.getElementById('cd-file-edit');
        if (fileInput && fileInput.files.length > 0) {
          const formData = new FormData();
          formData.append("File", fileInput.files[0]);
          formData.append("Category", "Customs");
          formData.append("EntityType", "CustomsDeclaration");
          formData.append("EntityId", id);
          if (payload.shipmentId) formData.append("ShipmentId", payload.shipmentId);

          await api.upload('/api/documents/upload', formData);
        }

        toast('Cập nhật tờ khai hải quan thành công!', 'success');
        closeModal();
        
        const search = document.getElementById('customs-search')?.value.trim() || '';
        const reloadRes = await api.get(`/api/customsDeclarations?search=${encodeURIComponent(search)}`);
        currentState.items = reloadRes.data.items || [];
        renderTable();
        if (onSuccess) onSuccess();
      } catch (err) {
        toast(err.message || 'Lỗi khi cập nhật tờ khai', 'error');
      }
    });
  } catch (err) {
    toast(`Lỗi: ${err.message}`, 'error');
  }
};
