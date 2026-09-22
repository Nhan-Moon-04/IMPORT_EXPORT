// frontend/src/features/partners/partners.js
import { api, toast, openModal, closeModal } from '../../core/api.js';

let currentPartners = [];

export async function renderPartners(container) {
  container.innerHTML = `
    <div class="card">
      <div class="toolbar" style="border:none; margin-bottom:12px; padding:0;">
        <div class="toolbar-left">
          <button class="btn btn-primary" id="btn-add-partner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Thêm Nhà Cung Cấp
          </button>
          <button class="btn btn-secondary" id="btn-refresh-partners">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
            Nạp Lại
          </button>
        </div>
        <div class="toolbar-right">
          <div class="search-box">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="partner-search-input" placeholder="Tìm theo mã, tên, quốc gia...">
          </div>
        </div>
      </div>

      <div class="table-container" style="max-height: calc(100vh - 280px);">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:40px; text-align:center;"><input type="checkbox" id="chk-all-partners"></th>
              <th>Mã Đối Tác</th>
              <th>Tên Nhà Cung Cấp / Đối Tác</th>
              <th>Quốc Gia</th>
              <th>Người Liên Hệ</th>
              <th>Điện Thoại / Email</th>
              <th>Phương Thức TT</th>
              <th>Điều Kiện TT</th>
              <th style="width:130px; text-align:center;">Thao Tác</th>
            </tr>
          </thead>
          <tbody id="partners-table-body">
            <tr><td colspan="9" style="text-align:center; padding:30px;">Đang tải danh sách đối tác...</td></tr>
          </tbody>
        </table>
      </div>

      <div class="grid-pagination">
        <div class="pagination-info" id="partners-pagination-info">Tổng: 0 đối tác</div>
        <div class="pagination-controls">
          <button class="btn btn-secondary" style="padding:4px 8px;" id="btn-prev-partner">&lt;</button>
          <span style="font-weight:600; font-size:12px;">Trang 1</span>
          <button class="btn btn-secondary" style="padding:4px 8px;" id="btn-next-partner">&gt;</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-add-partner').addEventListener('click', () => openPartnerModal());
  document.getElementById('btn-refresh-partners').addEventListener('click', () => loadPartners());
  document.getElementById('partner-search-input').addEventListener('input', (e) => filterPartners(e.target.value));

  await loadPartners();
}

async function loadPartners(query = '') {
  const tbody = document.getElementById('partners-table-body');
  if (!tbody) return;

  try {
    const url = query ? `/api/suppliers?search=${encodeURIComponent(query)}` : '/api/suppliers';
    const res = await api.get(url);
    const data = res.data?.items || res.data || [];
    currentPartners = data;
    renderPartnerRows(data);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:red; padding:20px;">Lỗi tải dữ liệu: ${err.message}</td></tr>`;
  }
}

function filterPartners(val) {
  const q = val.toLowerCase().trim();
  if (!q) {
    renderPartnerRows(currentPartners);
    return;
  }
  const filtered = currentPartners.filter(p => 
    (p.code && p.code.toLowerCase().includes(q)) ||
    (p.name && p.name.toLowerCase().includes(q)) ||
    (p.country && p.country.toLowerCase().includes(q)) ||
    (p.contactPerson && p.contactPerson.toLowerCase().includes(q))
  );
  renderPartnerRows(filtered);
}

function renderPartnerRows(items) {
  const tbody = document.getElementById('partners-table-body');
  const info = document.getElementById('partners-pagination-info');
  if (!tbody) return;

  if (info) info.textContent = `Tổng cộng: ${items.length} nhà cung cấp / đối tác`;

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:#6b7280;">Không tìm thấy nhà cung cấp nào</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(p => `
    <tr data-id="${p.id}">
      <td style="text-align:center;"><input type="checkbox" value="${p.id}"></td>
      <td style="font-weight:600; color:var(--amis-blue);">${p.code || '---'}</td>
      <td style="font-weight:600;">${p.name || '---'}</td>
      <td><span class="status-chip" style="background:#f1f5f9; color:#334155;">${p.country || 'N/A'}</span></td>
      <td>${p.contactPerson || '---'}</td>
      <td>
        <div style="font-size:12px;">${p.phone || ''}</div>
        <div style="font-size:11px; color:#6b7280;">${p.email || ''}</div>
      </td>
      <td>${p.paymentMethod || 'T/T'}</td>
      <td>${p.paymentTerms || '30 days'}</td>
      <td style="text-align:center;">
        <button class="btn btn-secondary btn-edit-partner" data-id="${p.id}" style="padding:4px 8px; font-size:11px; margin-right:4px;">
          Sửa
        </button>
        <button class="btn btn-danger btn-del-partner" data-id="${p.id}" data-name="${p.name}" style="padding:4px 8px; font-size:11px;">
          Xóa
        </button>
      </td>
    </tr>
  `).join('');

  // Attach handlers
  tbody.querySelectorAll('.btn-edit-partner').forEach(b => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-id');
      const partner = currentPartners.find(x => x.id === id);
      if (partner) openPartnerModal(partner);
    });
  });

  tbody.querySelectorAll('.btn-del-partner').forEach(b => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-id');
      const name = b.getAttribute('data-name');
      confirmDeletePartner(id, name);
    });
  });
}

function openPartnerModal(partner = null) {
  const isEdit = !!partner;
  const content = `
    <form id="partner-form">
      <div class="form-grid">
        <div class="form-group">
          <label>Mã Nhà Cung Cấp *</label>
          <input type="text" id="p-code" class="form-control" value="${partner?.code || ''}" required ${isEdit ? 'readonly' : ''} placeholder="VD: SUP-LCW-01">
        </div>
        <div class="form-group">
          <label>Tên Nhà Cung Cấp / Công Ty *</label>
          <input type="text" id="p-name" class="form-control" value="${partner?.name || ''}" required placeholder="VD: LONG CHENG WU TEXTILE CO., LTD">
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Quốc Gia</label>
          <input type="text" id="p-country" class="form-control" value="${partner?.country || 'China'}" placeholder="China, Taiwan, Vietnam...">
        </div>
        <div class="form-group">
          <label>Thành Phố / Địa Chỉ</label>
          <input type="text" id="p-address" class="form-control" value="${partner?.address || ''}" placeholder="Địa chỉ trụ sở...">
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Người Đại Diện / Liên Hệ</label>
          <input type="text" id="p-contact" class="form-control" value="${partner?.contactPerson || ''}" placeholder="Họ và tên...">
        </div>
        <div class="form-group">
          <label>Số Điện Thoại</label>
          <input type="text" id="p-phone" class="form-control" value="${partner?.phone || ''}" placeholder="+86...">
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="p-email" class="form-control" value="${partner?.email || ''}" placeholder="sales@company.com">
        </div>
        <div class="form-group">
          <label>Mã Số Thuế (Tax Code)</label>
          <input type="text" id="p-tax" class="form-control" value="${partner?.taxCode || ''}">
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Phương Thức Thanh Toán</label>
          <select id="p-payment-method" class="form-control">
            <option value="T/T" ${partner?.paymentMethod === 'T/T' ? 'selected' : ''}>T/T (Điện chuyển tiền)</option>
            <option value="L/C" ${partner?.paymentMethod === 'L/C' ? 'selected' : ''}>L/C (Thư tín dụng)</option>
            <option value="D/P" ${partner?.paymentMethod === 'D/P' ? 'selected' : ''}>D/P</option>
            <option value="D/A" ${partner?.paymentMethod === 'D/A' ? 'selected' : ''}>D/A</option>
          </select>
        </div>
        <div class="form-group">
          <label>Điều Kiện Thanh Toán</label>
          <input type="text" id="p-terms" class="form-control" value="${partner?.paymentTerms || '30 days after B/L date'}" placeholder="VD: 30 days after B/L">
        </div>
      </div>
      <div class="form-group">
        <label>Ghi Chú</label>
        <textarea id="p-notes" class="form-control" rows="2">${partner?.notes || ''}</textarea>
      </div>
      <div class="modal-footer" style="padding:16px 0 0; margin-top:16px; border-top:1px solid var(--amis-border); display:flex; justify-content:flex-end; gap:8px;">
        <button type="button" class="btn btn-secondary" id="btn-cancel-partner">Hủy Bỏ</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Lưu Thay Đổi' : 'Thêm Nhà Cung Cấp'}</button>
      </div>
    </form>
  `;

  openModal(isEdit ? 'Sửa Thông Tin Nhà Cung Cấp' : 'Thêm Mới Nhà Cung Cấp', content);

  document.getElementById('btn-cancel-partner').addEventListener('click', closeModal);
  document.getElementById('partner-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      code: document.getElementById('p-code').value.trim(),
      name: document.getElementById('p-name').value.trim(),
      country: document.getElementById('p-country').value.trim(),
      address: document.getElementById('p-address').value.trim(),
      contactPerson: document.getElementById('p-contact').value.trim(),
      phone: document.getElementById('p-phone').value.trim(),
      email: document.getElementById('p-email').value.trim(),
      taxCode: document.getElementById('p-tax').value.trim(),
      paymentMethod: document.getElementById('p-payment-method').value,
      paymentTerms: document.getElementById('p-terms').value.trim(),
      notes: document.getElementById('p-notes').value.trim()
    };

    try {
      if (isEdit) {
        await api.put(`/api/suppliers/${partner.id}`, payload);
        toast('Cập nhật nhà cung cấp thành công!', 'success');
      } else {
        await api.post('/api/suppliers', payload);
        toast('Thêm nhà cung cấp mới thành công!', 'success');
      }
      closeModal();
      await loadPartners();
    } catch (err) {
      toast(`Lỗi: ${err.message}`, 'error');
    }
  });
}

function confirmDeletePartner(id, name) {
  const content = `
    <div>
      <p style="margin-bottom:16px; font-size:14px;">Bạn có chắc chắn muốn xóa đối tác <strong>${name}</strong> không?</p>
      <p style="font-size:12px; color:#ef4444; margin-bottom:20px;">Lưu ý: Thao tác này sẽ đánh dấu xóa đối tác khỏi hệ thống.</p>
      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button type="button" class="btn btn-secondary" id="btn-cancel-del-partner">Hủy</button>
        <button type="button" class="btn btn-danger" id="btn-confirm-del-partner">Đồng Ý Xóa</button>
      </div>
    </div>
  `;
  openModal('Xác Nhận Xóa Đối Tác', content);
  document.getElementById('btn-cancel-del-partner').addEventListener('click', closeModal);
  document.getElementById('btn-confirm-del-partner').addEventListener('click', async () => {
    try {
      await api.delete(`/api/suppliers/${id}`);
      toast('Đã xóa nhà cung cấp thành công!', 'success');
      closeModal();
      await loadPartners();
    } catch (err) {
      toast(`Lỗi: ${err.message}`, 'error');
    }
  });
}
