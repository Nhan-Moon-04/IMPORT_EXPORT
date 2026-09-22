// frontend/src/features/invoices/invoices.js
import { api, toast, openModal, closeModal } from '../../core/api.js';

let currentInvoices = [];

export async function renderInvoices(container) {
  container.innerHTML = `
    <div class="card">
      <div class="toolbar" style="border:none; margin-bottom:12px; padding:0;">
        <div class="toolbar-left">
          <button class="btn btn-primary" id="btn-add-invoice">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Lập Hóa Đơn (Invoice)
          </button>
          <button class="btn btn-secondary" id="btn-refresh-invoices">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
            Nạp Lại
          </button>
        </div>
        <div class="toolbar-right">
          <div class="search-box">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="invoice-search-input" placeholder="Tìm số Invoice, lô hàng...">
          </div>
        </div>
      </div>

      <div class="table-container" style="max-height: calc(100vh - 280px);">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:40px; text-align:center;"><input type="checkbox" id="chk-all-invoices"></th>
              <th>Số Invoice</th>
              <th>Ngày Lập</th>
              <th>Loại Hóa Đơn</th>
              <th>Lô Hàng Liên Quan</th>
              <th>Số Lượng Mặt Hàng</th>
              <th>Tổng Tiền</th>
              <th>Đồng Tiền</th>
              <th style="width:140px; text-align:center;">Thao Tác</th>
            </tr>
          </thead>
          <tbody id="invoices-table-body">
            <tr><td colspan="9" style="text-align:center; padding:30px;">Đang tải danh sách hóa đơn...</td></tr>
          </tbody>
        </table>
      </div>

      <div class="grid-pagination">
        <div class="pagination-info" id="invoices-pagination-info">Tổng: 0 hóa đơn</div>
      </div>
    </div>
  `;

  document.getElementById('btn-add-invoice').addEventListener('click', () => openCreateInvoiceModal());
  document.getElementById('btn-refresh-invoices').addEventListener('click', () => loadInvoices());
  document.getElementById('invoice-search-input').addEventListener('input', (e) => filterInvoices(e.target.value));

  await loadInvoices();
}

async function loadInvoices() {
  const tbody = document.getElementById('invoices-table-body');
  if (!tbody) return;

  try {
    const res = await api.get('/api/invoices');
    const data = res.data?.items || res.data || [];
    currentInvoices = data;
    renderInvoiceRows(data);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:red; padding:20px;">Lỗi tải dữ liệu: ${err.message}</td></tr>`;
  }
}

function filterInvoices(val) {
  const q = val.toLowerCase().trim();
  if (!q) {
    renderInvoiceRows(currentInvoices);
    return;
  }
  const filtered = currentInvoices.filter(i => 
    (i.invoiceNumber && i.invoiceNumber.toLowerCase().includes(q)) ||
    (i.shipmentCode && i.shipmentCode.toLowerCase().includes(q)) ||
    (i.type && i.type.toLowerCase().includes(q))
  );
  renderInvoiceRows(filtered);
}

function renderInvoiceRows(items) {
  const tbody = document.getElementById('invoices-table-body');
  const info = document.getElementById('invoices-pagination-info');
  if (!tbody) return;

  if (info) info.textContent = `Tổng cộng: ${items.length} hóa đơn`;

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:#6b7280;">Không có hóa đơn nào</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(inv => `
    <tr>
      <td style="text-align:center;"><input type="checkbox" value="${inv.id}"></td>
      <td style="font-weight:700; color:var(--amis-blue);">${inv.invoiceNumber}</td>
      <td>${inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('vi-VN') : '---'}</td>
      <td><span class="status-chip chip-transit">${inv.type || 'Commercial'}</span></td>
      <td style="font-weight:600;">${inv.shipmentCode || '---'}</td>
      <td style="text-align:center;">${inv.itemCount || (inv.items ? inv.items.length : 0)}</td>
      <td style="font-weight:700; color:var(--amis-green);">${Number(inv.totalAmount || 0).toLocaleString()}</td>
      <td><strong>${inv.currency || 'USD'}</strong></td>
      <td style="text-align:center;">
        <button class="btn btn-secondary btn-view-invoice" data-id="${inv.id}" style="padding:4px 8px; font-size:11px; margin-right:4px;">
          Xem
        </button>
        <button class="btn btn-danger btn-del-invoice" data-id="${inv.id}" data-num="${inv.invoiceNumber}" style="padding:4px 8px; font-size:11px;">
          Xóa
        </button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.btn-view-invoice').forEach(b => {
    b.addEventListener('click', () => viewInvoiceDetail(b.getAttribute('data-id')));
  });

  tbody.querySelectorAll('.btn-del-invoice').forEach(b => {
    b.addEventListener('click', () => {
      confirmDeleteInvoice(b.getAttribute('data-id'), b.getAttribute('data-num'));
    });
  });
}

async function viewInvoiceDetail(id) {
  try {
    const res = await api.get(`/api/invoices/${id}`);
    const inv = res.data;
    if (!inv) return;

    const itemsHtml = (inv.items || []).map((it, idx) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td style="font-weight:600;">${it.productCode || '---'}</td>
        <td>${it.description || ''}</td>
        <td style="text-align:right;">${Number(it.quantity || 0).toLocaleString()}</td>
        <td style="text-align:center;">${it.unit || 'KG'}</td>
        <td style="text-align:right;">$${Number(it.unitPrice || 0).toFixed(2)}</td>
        <td style="text-align:right; font-weight:600;">$${Number(it.totalAmount || (it.quantity * it.unitPrice)).toLocaleString()}</td>
      </tr>
    `).join('');

    const content = `
      <div style="font-size:13px;">
        <div style="display:flex; justify-content:space-between; border-bottom:2px solid var(--amis-blue); padding-bottom:12px; margin-bottom:16px;">
          <div>
            <h3 style="font-size:18px; color:var(--amis-blue); margin-bottom:4px;">COMMERCIAL INVOICE</h3>
            <div><strong>Số:</strong> ${inv.invoiceNumber}</div>
            <div><strong>Ngày Lập:</strong> ${inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('vi-VN') : '---'}</div>
          </div>
          <div style="text-align:right;">
            <div><strong>Loại:</strong> ${inv.type}</div>
            <div><strong>Điều Kiện TT:</strong> ${inv.paymentTerms || 'T/T 30 days'}</div>
            <div><strong>Tiền Tệ:</strong> ${inv.currency || 'USD'}</div>
          </div>
        </div>

        <table class="data-table" style="margin-bottom:16px;">
          <thead>
            <tr>
              <th style="width:40px; text-align:center;">STT</th>
              <th>Mã Hàng</th>
              <th>Mô Tả Sản Phẩm Sợi</th>
              <th style="text-align:right;">Số Lượng</th>
              <th style="text-align:center;">ĐVT</th>
              <th style="text-align:right;">Đơn Giá</th>
              <th style="text-align:right;">Thành Tiền</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml || '<tr><td colspan="7" style="text-align:center;">Không có chi tiết mặt hàng</td></tr>'}
          </tbody>
        </table>

        <div style="display:flex; justify-content:flex-end;">
          <div style="width:280px; font-size:13px; line-height:1.8;">
            <div style="display:flex; justify-content:space-between;"><span>Tiền Hàng:</span> <strong>$${Number(inv.subTotal || 0).toLocaleString()}</strong></div>
            <div style="display:flex; justify-content:space-between;"><span>Chiết Khấu:</span> <span>-$${Number(inv.discount || 0).toLocaleString()}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>Phí Khác:</span> <span>+$${Number(inv.otherCharges || 0).toLocaleString()}</span></div>
            <div style="display:flex; justify-content:space-between; font-size:15px; border-top:1px solid #ccc; padding-top:4px; color:var(--amis-green);">
              <strong>TỔNG CỘNG:</strong> <strong>$${Number(inv.totalAmount || 0).toLocaleString()} ${inv.currency || 'USD'}</strong>
            </div>
          </div>
        </div>

        <div style="margin-top:20px; text-align:right;">
          <button class="btn btn-secondary" id="btn-close-inv-detail">Đóng</button>
        </div>
      </div>
    `;

    openModal(`Chi Tiết Hóa Đơn: ${inv.invoiceNumber}`, content);
    document.getElementById('btn-close-inv-detail').addEventListener('click', closeModal);
  } catch (err) {
    toast(`Lỗi: ${err.message}`, 'error');
  }
}

async function openCreateInvoiceModal() {
  let shipments = [];
  let products = [];
  try {
    const [shpRes, prodRes] = await Promise.all([
      api.get('/api/shipments'),
      api.get('/api/products')
    ]);
    shipments = shpRes.data?.items || shpRes.data || [];
    products = prodRes.data?.items || prodRes.data || [];
  } catch (err) {
    console.error(err);
  }

  const shipmentOpts = shipments.map(s => `<option value="${s.id}">${s.code} - ${s.blNumber || s.supplierName || ''}</option>`).join('');
  const productOpts = products.map(p => `<option value="${p.id}" data-code="${p.code}" data-price="${p.standardPrice || 2.5}">${p.code} - ${p.name}</option>`).join('');

  const content = `
    <form id="create-invoice-form">
      <div class="form-grid">
        <div class="form-group">
          <label>Số Invoice *</label>
          <input type="text" id="inv-num" class="form-control" required placeholder="VD: INV-2026-0889" value="INV-${Date.now().toString().slice(-6)}">
        </div>
        <div class="form-group">
          <label>Ngày Lập *</label>
          <input type="date" id="inv-date" class="form-control" required value="${new Date().toISOString().slice(0, 10)}">
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Lô Hàng Liên Quan</label>
          <select id="inv-shipment" class="form-control">
            <option value="">-- Chọn lô hàng (tùy chọn) --</option>
            ${shipmentOpts}
          </select>
        </div>
        <div class="form-group">
          <label>Loại Hóa Đơn</label>
          <select id="inv-type" class="form-control">
            <option value="CommercialInvoice">Commercial Invoice (Thương mại)</option>
            <option value="ProformaInvoice">Proforma Invoice (Tạm tính)</option>
            <option value="DebitNote">Debit Note</option>
          </select>
        </div>
      </div>

      <div style="margin-top:16px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
        <label style="font-weight:600; font-size:13px;">Chi Tiết Mặt Hàng Sợi</label>
        <button type="button" class="btn btn-secondary" id="btn-add-inv-row" style="padding:4px 8px; font-size:11px;">+ Thêm Dòng</button>
      </div>

      <table class="data-table" style="margin-bottom:12px;">
        <thead>
          <tr>
            <th>Mặt Hàng Sợi</th>
            <th style="width:90px;">Số Lượng (KG)</th>
            <th style="width:70px;">ĐVT</th>
            <th style="width:100px;">Đơn Giá ($)</th>
            <th style="width:40px;"></th>
          </tr>
        </thead>
        <tbody id="inv-items-body">
          <tr>
            <td>
              <select class="form-control inv-item-prod" required>
                ${productOpts}
              </select>
            </td>
            <td><input type="number" class="form-control inv-item-qty" value="1000" min="1" required></td>
            <td><input type="text" class="form-control inv-item-unit" value="KG"></td>
            <td><input type="number" step="0.01" class="form-control inv-item-price" value="2.50" required></td>
            <td style="text-align:center;"><button type="button" class="btn btn-danger btn-remove-row" style="padding:2px 6px;">×</button></td>
          </tr>
        </tbody>
      </table>

      <div class="modal-footer" style="padding:16px 0 0; margin-top:16px; border-top:1px solid var(--amis-border); display:flex; justify-content:flex-end; gap:8px;">
        <button type="button" class="btn btn-secondary" id="btn-cancel-inv">Hủy Bỏ</button>
        <button type="submit" class="btn btn-primary">Lập Hóa Đơn</button>
      </div>
    </form>
  `;

  openModal('Lập Hóa Đơn Xuất Nhập Khẩu Mới', content);

  document.getElementById('btn-cancel-inv').addEventListener('click', closeModal);

  document.getElementById('btn-add-inv-row').addEventListener('click', () => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><select class="form-control inv-item-prod" required>${productOpts}</select></td>
      <td><input type="number" class="form-control inv-item-qty" value="1000" min="1" required></td>
      <td><input type="text" class="form-control inv-item-unit" value="KG"></td>
      <td><input type="number" step="0.01" class="form-control inv-item-price" value="2.50" required></td>
      <td style="text-align:center;"><button type="button" class="btn btn-danger btn-remove-row" style="padding:2px 6px;">×</button></td>
    `;
    tr.querySelector('.btn-remove-row').addEventListener('click', () => tr.remove());
    document.getElementById('inv-items-body').appendChild(tr);
  });

  document.querySelectorAll('.btn-remove-row').forEach(b => {
    b.addEventListener('click', (e) => e.target.closest('tr').remove());
  });

  document.getElementById('create-invoice-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const rows = document.querySelectorAll('#inv-items-body tr');
    const items = [];
    rows.forEach(r => {
      const prodSelect = r.querySelector('.inv-item-prod');
      const prodId = prodSelect.value;
      const prodCode = prodSelect.options[prodSelect.selectedIndex]?.getAttribute('data-code') || '';
      const qty = parseFloat(r.querySelector('.inv-item-qty').value) || 0;
      const unit = r.querySelector('.inv-item-unit').value || 'KG';
      const price = parseFloat(r.querySelector('.inv-item-price').value) || 0;

      items.push({
        productId: prodId,
        description: prodCode,
        quantity: qty,
        unit: unit,
        unitPrice: price
      });
    });

    if (items.length === 0) {
      toast('Vui lòng thêm ít nhất một mặt hàng', 'warning');
      return;
    }

    const payload = {
      invoiceNumber: document.getElementById('inv-num').value.trim(),
      invoiceDate: new Date(document.getElementById('inv-date').value).toISOString(),
      type: document.getElementById('inv-type').value,
      currency: 'USD',
      shipmentId: document.getElementById('inv-shipment').value || null,
      items: items
    };

    try {
      await api.post('/api/invoices', payload);
      toast('Tạo Invoice thành công!', 'success');
      closeModal();
      await loadInvoices();
    } catch (err) {
      toast(`Lỗi: ${err.message}`, 'error');
    }
  });
}

function confirmDeleteInvoice(id, num) {
  const content = `
    <div>
      <p style="margin-bottom:16px; font-size:14px;">Bạn có chắc chắn muốn xóa hóa đơn <strong>${num}</strong>?</p>
      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button type="button" class="btn btn-secondary" id="btn-cancel-del-inv">Hủy</button>
        <button type="button" class="btn btn-danger" id="btn-confirm-del-inv">Đồng Ý Xóa</button>
      </div>
    </div>
  `;
  openModal('Xác Nhận Xóa Hóa Đơn', content);
  document.getElementById('btn-cancel-del-inv').addEventListener('click', closeModal);
  document.getElementById('btn-confirm-del-inv').addEventListener('click', async () => {
    try {
      await api.delete(`/api/invoices/${id}`);
      toast('Đã xóa hóa đơn thành công!', 'success');
      closeModal();
      await loadInvoices();
    } catch (err) {
      toast(`Lỗi: ${err.message}`, 'error');
    }
  });
}
