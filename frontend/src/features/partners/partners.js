// frontend/src/features/partners/partners.js
import { api, toast, openModal, closeModal } from '../../core/api.js';

let currentPartners = [];
let currentTab = 'partners-suppliers';

export async function renderPartners(container, tab = 'partners-suppliers') {
  currentTab = tab;
  const isCustomer = (currentTab === 'partners-customers');
  const typeLabel = isCustomer ? 'Khách Hàng' : 'Nhà Cung Cấp';
  const endpoint = isCustomer ? '/api/customers' : '/api/suppliers';

  container.innerHTML = `
    <!-- Sub-navigation tabs -->
    <div style="display:flex; align-items:center; gap:8px; margin-bottom:16px; border-bottom:1px solid var(--amis-border); padding-bottom:10px;">
      <button class="btn ${!isCustomer ? 'btn-primary' : 'btn-secondary'}" id="tab-btn-suppliers" style="display:flex; align-items:center; gap:6px;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
        <span>Nhà Cung Cấp</span>
      </button>
      <button class="btn ${isCustomer ? 'btn-primary' : 'btn-secondary'}" id="tab-btn-customers" style="display:flex; align-items:center; gap:6px;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        <span>Khách Hàng</span>
      </button>
    </div>

    <div class="card">
      <div class="toolbar" style="border:none; margin-bottom:12px; padding:0;">
        <div class="toolbar-left">
          <button class="btn btn-primary" id="btn-add-partner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Thêm ${typeLabel}
          </button>
          <button class="btn btn-secondary" id="btn-refresh-partners">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
            Nạp Lại
          </button>
        </div>
        <div class="toolbar-right">
          <div class="search-box">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="partner-search-input" placeholder="Tìm theo tên, quốc gia, người liên hệ...">
          </div>
        </div>
      </div>

      <div class="table-container" style="max-height: calc(100vh - 280px);">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:40px; text-align:center;"><input type="checkbox" id="chk-all-partners"></th>
              <th style="width:130px;">Mã / Tên Thương Mại</th>
              <th>Tên ${typeLabel} / Công Ty</th>
              <th style="width:110px;">Quốc Gia</th>
              <th>Người Liên Hệ</th>
              <th>Điện Thoại / Email</th>
              <th style="width:110px;">Incoterm</th>
              <th style="width:130px;">Điều Kiện TT</th>
              <th style="width:100px; text-align:center;">Lô Hàng</th>
              <th style="width:120px; text-align:center;">Thao Tác</th>
            </tr>
          </thead>
          <tbody id="partners-table-body">
            <tr><td colspan="10" style="text-align:center; padding:30px;">Đang tải danh sách ${typeLabel.toLowerCase()}...</td></tr>
          </tbody>
        </table>
      </div>

      <div class="grid-pagination">
        <div class="pagination-info" id="partners-pagination-info">Tổng: 0 ${typeLabel.toLowerCase()}</div>
        <div class="pagination-controls">
          <button class="btn btn-secondary" style="padding:4px 8px;" id="btn-prev-partner">&lt;</button>
          <span style="font-weight:600; font-size:12px;">Trang 1</span>
          <button class="btn btn-secondary" style="padding:4px 8px;" id="btn-next-partner">&gt;</button>
        </div>
      </div>
    </div>
  `;

  // Sub-tab handlers
  document.getElementById('tab-btn-suppliers')?.addEventListener('click', () => {
    if (window.appNavigateTo) {
      window.appNavigateTo('partners-suppliers');
    } else {
      renderPartners(container, 'partners-suppliers');
    }
  });

  document.getElementById('tab-btn-customers')?.addEventListener('click', () => {
    if (window.appNavigateTo) {
      window.appNavigateTo('partners-customers');
    } else {
      renderPartners(container, 'partners-customers');
    }
  });

  document.getElementById('btn-add-partner').addEventListener('click', () => openPartnerModal());
  document.getElementById('btn-refresh-partners').addEventListener('click', () => loadPartners());
  document.getElementById('partner-search-input').addEventListener('input', (e) => filterPartners(e.target.value));

  await loadPartners();
}

async function loadPartners(query = '') {
  const tbody = document.getElementById('partners-table-body');
  if (!tbody) return;

  const isCustomer = (currentTab === 'partners-customers');
  const typeLabel = isCustomer ? 'khách hàng' : 'nhà cung cấp';
  const endpoint = isCustomer ? '/api/customers' : '/api/suppliers';

  try {
    const url = query ? `${endpoint}?search=${encodeURIComponent(query)}` : endpoint;
    const res = await api.get(url);
    const data = res.data?.items || res.data || [];
    currentPartners = data;
    renderPartnerRows(data);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:red; padding:20px;">Lỗi tải dữ liệu: ${err.message}</td></tr>`;
  }
}

function filterPartners(val) {
  const q = val.toLowerCase().trim();
  if (!q) {
    renderPartnerRows(currentPartners);
    return;
  }
  const filtered = currentPartners.filter(p => {
    const name = (p.companyName || p.name || '').toLowerCase();
    const trade = (p.tradeName || p.code || '').toLowerCase();
    const country = (p.country || '').toLowerCase();
    const contact = (p.contactPerson || '').toLowerCase();
    const email = (p.email || '').toLowerCase();
    const phone = (p.phone || '').toLowerCase();
    return name.includes(q) || trade.includes(q) || country.includes(q) || contact.includes(q) || email.includes(q) || phone.includes(q);
  });
  renderPartnerRows(filtered);
}

function renderPartnerRows(items) {
  const tbody = document.getElementById('partners-table-body');
  const info = document.getElementById('partners-pagination-info');
  if (!tbody) return;

  const isCustomer = (currentTab === 'partners-customers');
  const typeLabel = isCustomer ? 'khách hàng' : 'nhà cung cấp';

  if (info) info.textContent = `Tổng cộng: ${items.length} ${typeLabel}`;

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:#6b7280;">Không tìm thấy ${typeLabel} nào</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(p => {
    const code = p.tradeName || p.code || (isCustomer ? ('KH-' + (p.id ? p.id.substring(0, 6).toUpperCase() : '---')) : '---');
    const name = p.companyName || p.name || '---';
    const delivery = p.deliveryTerm || '---';
    const terms = p.paymentTerms || '---';
    const shipments = p.shipmentCount ?? (p.shipments?.length ?? 0);

    return `
      <tr data-id="${p.id}">
        <td style="text-align:center;"><input type="checkbox" value="${p.id}"></td>
        <td style="font-weight:600; color:var(--amis-blue);">${code}</td>
        <td>
          <div style="font-weight:600; color:#1e293b;">${name}</div>
          ${p.address ? `<div style="font-size:11px; color:#64748b; margin-top:2px;">📍 ${p.address}</div>` : ''}
        </td>
        <td>
          <span class="status-chip" style="background:#f1f5f9; color:#334155; font-size:11px;">
            ${p.country || 'N/A'}
          </span>
        </td>
        <td>${p.contactPerson || '<span style="color:#94a3b8;">---</span>'}</td>
        <td>
          <div style="font-size:12px; font-weight:500;">${p.phone || ''}</div>
          <div style="font-size:11px; color:#64748b;">${p.email || ''}</div>
          ${!p.phone && !p.email ? '<span style="color:#94a3b8; font-size:12px;">---</span>' : ''}
        </td>
        <td>
          ${delivery !== '---' ? `<span style="display:inline-block; font-size:11px; font-weight:600; background:#e0f2fe; color:#0369a1; padding:2px 6px; border-radius:4px;">${delivery}</span>` : '<span style="color:#94a3b8;">---</span>'}
        </td>
        <td style="font-size:12px;">${terms}</td>
        <td style="text-align:center;">
          <span style="display:inline-block; font-size:11px; font-weight:600; background:#f8fafc; border:1px solid #e2e8f0; color:#334155; padding:2px 8px; border-radius:12px;">
            ${shipments} lô
          </span>
        </td>
        <td style="text-align:center;">
          <button class="btn btn-secondary btn-edit-partner" data-id="${p.id}" style="padding:3px 7px; font-size:11px; margin-right:4px;">
            Sửa
          </button>
          <button class="btn btn-danger btn-del-partner" data-id="${p.id}" data-name="${name.replace(/"/g, '&quot;')}" style="padding:3px 7px; font-size:11px;">
            Xóa
          </button>
        </td>
      </tr>
    `;
  }).join('');

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
  const isCustomer = (currentTab === 'partners-customers');
  const typeLabel = isCustomer ? 'Khách Hàng' : 'Nhà Cung Cấp';
  const endpoint = isCustomer ? '/api/customers' : '/api/suppliers';

  const defaultCode = partner?.tradeName || partner?.code || '';
  const defaultName = partner?.companyName || partner?.name || '';
  const defaultCountry = partner?.country || (isCustomer ? 'Vietnam' : 'China');
  const defaultDelivery = partner?.deliveryTerm || 'FOB';

  const content = `
    <form id="partner-form">
      <div class="form-grid">
        <div class="form-group">
          <label>Tên ${typeLabel} / Công Ty *</label>
          <input type="text" id="p-company-name" class="form-control" value="${defaultName}" required placeholder="${isCustomer ? 'VD: CÔNG TY TNHH MAY XUẤT KHẨU VIỆT NAM' : 'VD: LONG CHENG WU TEXTILE CO., LTD'}">
        </div>
        <div class="form-group">
          <label>${isCustomer ? 'Mã / Tên Viết Tắt' : 'Mã / Tên Giao Dịch (Trade Name)'}</label>
          <input type="text" id="p-code" class="form-control" value="${defaultCode}" placeholder="${isCustomer ? 'VD: KH-VN-001' : 'VD: SUP-LCW-01'}">
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label>Quốc Gia</label>
          <input type="text" id="p-country" class="form-control" value="${defaultCountry}" placeholder="China, Taiwan, Vietnam, USA, Korea...">
        </div>
        <div class="form-group">
          <label>Địa Chỉ Trụ Sở</label>
          <input type="text" id="p-address" class="form-control" value="${partner?.address || ''}" placeholder="Số nhà, đường, khu công nghiệp, thành phố...">
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label>Người Đại Diện / Liên Hệ</label>
          <input type="text" id="p-contact" class="form-control" value="${partner?.contactPerson || ''}" placeholder="Họ và tên...">
        </div>
        <div class="form-group">
          <label>Số Điện Thoại</label>
          <input type="text" id="p-phone" class="form-control" value="${partner?.phone || ''}" placeholder="+84... hoặc +86...">
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="p-email" class="form-control" value="${partner?.email || ''}" placeholder="contact@company.com">
        </div>
        <div class="form-group">
          <label>Mã Số Thuế (Tax Code)</label>
          <input type="text" id="p-tax" class="form-control" value="${partner?.taxCode || ''}" placeholder="Mã số thuế doanh nghiệp">
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label>Điều Kiện Giao Hàng (Incoterm)</label>
          <select id="p-delivery-term" class="form-control">
            <option value="FOB" ${defaultDelivery === 'FOB' ? 'selected' : ''}>FOB (Free On Board)</option>
            <option value="CIF" ${defaultDelivery === 'CIF' ? 'selected' : ''}>CIF (Cost, Insurance & Freight)</option>
            <option value="CFR" ${defaultDelivery === 'CFR' ? 'selected' : ''}>CFR (Cost & Freight)</option>
            <option value="EXW" ${defaultDelivery === 'EXW' ? 'selected' : ''}>EXW (Ex Works)</option>
            <option value="FCA" ${defaultDelivery === 'FCA' ? 'selected' : ''}>FCA (Free Carrier)</option>
            <option value="CPT" ${defaultDelivery === 'CPT' ? 'selected' : ''}>CPT (Carriage Paid To)</option>
            <option value="CIP" ${defaultDelivery === 'CIP' ? 'selected' : ''}>CIP (Carriage & Insurance Paid)</option>
            <option value="DAP" ${defaultDelivery === 'DAP' ? 'selected' : ''}>DAP (Delivered At Place)</option>
            <option value="DPU" ${defaultDelivery === 'DPU' ? 'selected' : ''}>DPU (Delivered at Place Unloaded)</option>
            <option value="DDP" ${defaultDelivery === 'DDP' ? 'selected' : ''}>DDP (Delivered Duty Paid)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Điều Kiện Thanh Toán (Payment Terms)</label>
          <input type="text" id="p-terms" class="form-control" value="${partner?.paymentTerms || '30 days after B/L date'}" placeholder="VD: T/T 30 days after B/L, L/C at sight...">
        </div>
      </div>

      <div class="form-group">
        <label>Ghi Chú</label>
        <textarea id="p-notes" class="form-control" rows="2" placeholder="Ghi chú về năng lực, uy tín, chính sách hợp tác...">${partner?.notes || ''}</textarea>
      </div>

      <div class="modal-footer" style="padding:16px 0 0; margin-top:16px; border-top:1px solid var(--amis-border); display:flex; justify-content:flex-end; gap:8px;">
        <button type="button" class="btn btn-secondary" id="btn-cancel-partner">Hủy Bỏ</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Lưu Thay Đổi' : ('Thêm ' + typeLabel)}</button>
      </div>
    </form>
  `;

  openModal(isEdit ? `Sửa Thông Tin ${typeLabel}` : `Thêm Mới ${typeLabel}`, content);

  document.getElementById('btn-cancel-partner').addEventListener('click', closeModal);
  document.getElementById('partner-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const companyName = document.getElementById('p-company-name').value.trim();
    const tradeCode = document.getElementById('p-code').value.trim();

    if (!companyName) {
      toast(`Vui lòng nhập tên ${typeLabel.toLowerCase()}!`, 'warning');
      return;
    }

    // Bidirectional payload matching both ASP.NET Core DTOs and JSON properties
    const payload = {
      companyName: companyName,
      name: companyName,
      tradeName: tradeCode,
      code: tradeCode,
      country: document.getElementById('p-country').value.trim(),
      address: document.getElementById('p-address').value.trim(),
      contactPerson: document.getElementById('p-contact').value.trim(),
      phone: document.getElementById('p-phone').value.trim(),
      email: document.getElementById('p-email').value.trim(),
      taxCode: document.getElementById('p-tax').value.trim(),
      deliveryTerm: document.getElementById('p-delivery-term').value,
      paymentTerms: document.getElementById('p-terms').value.trim(),
      notes: document.getElementById('p-notes').value.trim()
    };

    try {
      if (isEdit) {
        await api.put(`${endpoint}/${partner.id}`, payload);
        toast(`Cập nhật ${typeLabel.toLowerCase()} thành công!`, 'success');
      } else {
        await api.post(endpoint, payload);
        toast(`Thêm ${typeLabel.toLowerCase()} mới thành công!`, 'success');
      }
      closeModal();
      await loadPartners();
    } catch (err) {
      toast(`Lỗi: ${err.message}`, 'error');
    }
  });
}

function confirmDeletePartner(id, name) {
  const isCustomer = (currentTab === 'partners-customers');
  const typeLabel = isCustomer ? 'khách hàng' : 'nhà cung cấp';
  const endpoint = isCustomer ? '/api/customers' : '/api/suppliers';

  const content = `
    <div>
      <p style="margin-bottom:16px; font-size:14px;">Bạn có chắc chắn muốn xóa ${typeLabel} <strong>${name}</strong> không?</p>
      <p style="font-size:12px; color:#ef4444; margin-bottom:20px;">Lưu ý: Thao tác này sẽ đánh dấu xóa ${typeLabel} khỏi hệ thống.</p>
      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button type="button" class="btn btn-secondary" id="btn-cancel-del-partner">Hủy</button>
        <button type="button" class="btn btn-danger" id="btn-confirm-del-partner">Đồng Ý Xóa</button>
      </div>
    </div>
  `;
  openModal(`Xác Nhận Xóa ${isCustomer ? 'Khách Hàng' : 'Nhà Cung Cấp'}`, content);
  document.getElementById('btn-cancel-del-partner').addEventListener('click', closeModal);
  document.getElementById('btn-confirm-del-partner').addEventListener('click', async () => {
    try {
      await api.delete(`${endpoint}/${id}`);
      toast(`Đã xóa ${typeLabel} thành công!`, 'success');
      closeModal();
      await loadPartners();
    } catch (err) {
      toast(`Lỗi: ${err.message}`, 'error');
    }
  });
}
