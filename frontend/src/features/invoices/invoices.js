/**
 * Invoices / Packing List / Sales Contract — MISA AMIS UI Style
 * Sort, column picker, icon-only actions, status badges, CRUD full
 */
import { api, toast, openModal, closeModal, API_BASE, getToken } from '../../core/api.js';

// ─── State ────────────────────────────────────────────────────────────────────
let allInvoices      = [];
let filteredInvoices = [];
let currentPage      = 1;
let pageSize         = 25;
let currentDocType   = 'Invoice';
let sortCol          = 'invoiceDate';
let sortDir          = 'desc';

// ─── Column definitions ───────────────────────────────────────────────────────
const COL_DEFS = {
  Invoice: [
    { key: 'invoiceNumber', label: 'Số Invoice',       visible: true,  sortable: true  },
    { key: 'invoiceDate',   label: 'Ngày Lập',         visible: true,  sortable: true  },
    { key: 'type',          label: 'Loại Hóa Đơn',     visible: true,  sortable: true  },
    { key: 'shipmentCode',  label: 'Mã Lô Hàng',       visible: true,  sortable: false },
    { key: 'partnerName',   label: 'Đối Tác',          visible: true,  sortable: true  },
    { key: 'shipmentType',  label: 'Loại Hình',        visible: true,  sortable: true  },
    { key: 'currency',      label: 'Tiền Tệ',          visible: false, sortable: false },
    { key: 'paymentTerms',  label: 'Điều Kiện TT',     visible: false, sortable: false },
    { key: 'totalValue',    label: 'Tổng Tiền',        visible: true,  sortable: true  },
    { key: 'status',        label: 'Trạng Thái',       visible: true,  sortable: false },
  ],
  PackingList: [
    { key: 'invoiceNumber', label: 'Số Packing List',  visible: true,  sortable: true  },
    { key: 'invoiceDate',   label: 'Ngày Lập',         visible: true,  sortable: true  },
    { key: 'shipmentCode',  label: 'Mã Lô Hàng',       visible: true,  sortable: false },
    { key: 'partnerName',   label: 'Đối Tác',          visible: true,  sortable: true  },
    { key: 'shipmentType',  label: 'Loại Hình',        visible: true,  sortable: true  },
    { key: 'totalValue',    label: 'Tổng Tiền',        visible: true,  sortable: true  },
    { key: 'status',        label: 'Trạng Thái',       visible: true,  sortable: false },
  ],
  SalesContract: [
    { key: 'invoiceNumber', label: 'Số Hợp Đồng',     visible: true,  sortable: true  },
    { key: 'invoiceDate',   label: 'Ngày Lập',         visible: true,  sortable: true  },
    { key: 'type',          label: 'Loại Hợp Đồng',   visible: true,  sortable: false },
    { key: 'shipmentCode',  label: 'Mã Lô Hàng',       visible: true,  sortable: false },
    { key: 'partnerName',   label: 'Đối Tác',          visible: true,  sortable: true  },
    { key: 'totalValue',    label: 'Tổng Tiền',        visible: true,  sortable: true  },
    { key: 'status',        label: 'Trạng Thái',       visible: true,  sortable: false },
  ],
};
let columns = [];

// ─── Label helpers ────────────────────────────────────────────────────────────
function getLabels(docType) {
  if (docType === 'PackingList')   return { title: 'Danh Sách Packing List', addBtn: '+ Lập Packing List', search: 'Tìm số Packing List, lô hàng...' };
  if (docType === 'SalesContract') return { title: 'Danh Sách Hợp Đồng',    addBtn: '+ Lập Hợp Đồng',    search: 'Tìm số hợp đồng, lô hàng...' };
  return { title: 'Danh Sách Hóa Đơn',   addBtn: '+ Lập Hóa Đơn',   search: 'Tìm số Invoice, lô hàng, đối tác...' };
}

// ─── Entry ────────────────────────────────────────────────────────────────────
export async function renderInvoices(container, docType = 'Invoice') {
  currentDocType = docType;
  columns        = (COL_DEFS[docType] || COL_DEFS.Invoice).map(c => ({ ...c }));
  sortCol        = 'invoiceDate';
  sortDir        = 'desc';
  currentPage    = 1;

  const lbl = getLabels(docType);
  const showTypeFilter = docType === 'Invoice';

  container.innerHTML = `
    <div class="amis-list-page">

      <!-- TOOLBAR -->
      <div class="amis-toolbar-wrap">
        <div class="amis-toolbar-left">
          <button id="btn-add-invoice" class="amis-btn amis-btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            ${lbl.addBtn}
          </button>
          <div class="amis-btn-divider"></div>
          <button id="btn-refresh-invoices" class="amis-btn amis-btn-ghost">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Nạp lại
          </button>
        </div>

        <div class="amis-toolbar-right">
          <!-- Filters -->
          <div class="ph-date-range">
            <input type="date" id="filter-date-from" class="ph-date-input" title="Từ ngày">
            <span class="ph-date-sep">—</span>
            <input type="date" id="filter-date-to" class="ph-date-input" title="Đến ngày">
          </div>

          ${showTypeFilter ? `
          <select id="filter-invoice-type" class="ph-filter-select">
            <option value="">Tất cả loại</option>
            <option value="CommercialInvoice">Commercial</option>
            <option value="ProformaInvoice">Proforma</option>
            <option value="DebitNote">Debit Note</option>
          </select>` : ''}

          <select id="filter-shipment-type" class="ph-filter-select">
            <option value="">Loại hình XNK</option>
            <option value="Import">📥 Nhập khẩu</option>
            <option value="Export">📤 Xuất khẩu</option>
          </select>

          <!-- Search -->
          <div class="amis-search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="invoice-search-input" placeholder="${lbl.search}">
          </div>

          <!-- Column picker -->
          <div class="amis-col-picker-wrap" id="colPickerWrapInv">
            <button id="btnColPickerInv" class="amis-btn amis-btn-ghost amis-btn-icon-only" title="Tuỳ chỉnh cột">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
            <div class="amis-col-dropdown" id="colDropdownInv" style="display:none">
              <div class="col-dropdown-header">Tuỳ chỉnh cột hiển thị</div>
              <div class="col-dropdown-list" id="colCheckListInv"></div>
              <div class="col-dropdown-footer">
                <button class="amis-btn amis-btn-ghost amis-btn-xs" id="btnResetColsInv">Đặt lại</button>
                <button class="amis-btn amis-btn-primary amis-btn-xs" id="btnApplyColsInv">Áp dụng</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TABLE -->
      <div class="amis-table-container">
        <table class="amis-data-table" id="invoices-table">
          <thead id="invoices-thead"></thead>
          <tbody id="invoices-table-body">
            <tr><td colspan="20" class="amis-table-empty">
              <div class="ph-loading"><div class="ph-spinner"></div><span>Đang tải dữ liệu...</span></div>
            </td></tr>
          </tbody>
        </table>
      </div>

      <!-- FOOTER -->
      <div class="amis-table-footer">
        <div class="amis-table-info" id="invoices-pagination-info">Tổng: 0 bản ghi</div>
        <div class="amis-pagination-controls" id="invoices-pagination-buttons"></div>
        <div class="amis-page-size-select">
          <span>Hiển thị</span>
          <select id="invoices-items-per-page">
            <option value="25" selected>25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
          <span>dòng/trang</span>
        </div>
      </div>
    </div>
  `;

  setupEvents();
  renderHeader();
  await loadInvoices();
}

// ─── Data ─────────────────────────────────────────────────────────────────────
async function loadInvoices() {
  const tbody = document.getElementById('invoices-table-body');
  try {
    const res  = await api.get('/api/invoices');
    let data   = res.data?.items || res.data || [];

    if (currentDocType === 'PackingList') {
      data = data.filter(d => d.type === 'PackingList');
    } else if (currentDocType === 'SalesContract') {
      data = data.filter(d => d.type === 'SalesContract');
    } else {
      data = data.filter(d => d.type !== 'PackingList' && d.type !== 'SalesContract');
    }

    allInvoices = data;
    applyFilterSort();
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="20" class="amis-table-empty" style="color:var(--amis-red)">Lỗi tải dữ liệu: ${err.message}</td></tr>`;
  }
}

function applyFilterSort() {
  const q        = (document.getElementById('invoice-search-input')?.value || '').toLowerCase().trim();
  const dateFrom = document.getElementById('filter-date-from')?.value;
  const dateTo   = document.getElementById('filter-date-to')?.value;
  const invType  = document.getElementById('filter-invoice-type')?.value || '';
  const shipType = document.getElementById('filter-shipment-type')?.value || '';

  let result = allInvoices.filter(i => {
    if (q) {
      const text = [i.invoiceNumber, i.partnerName, i.type, i.shipmentCode, String(i.totalValue || '')].join(' ').toLowerCase();
      if (!text.includes(q)) return false;
    }
    if (invType  && i.type !== invType)         return false;
    if (shipType && i.shipmentType !== shipType) return false;
    if (dateFrom) {
      if (!i.invoiceDate || new Date(i.invoiceDate) < new Date(dateFrom)) return false;
    }
    if (dateTo) {
      const dTo = new Date(dateTo); dTo.setHours(23, 59, 59, 999);
      if (!i.invoiceDate || new Date(i.invoiceDate) > dTo) return false;
    }
    return true;
  });

  if (sortCol) {
    result.sort((a, b) => {
      let va = a[sortCol]; let vb = b[sortCol];
      if (sortCol === 'invoiceDate') { va = new Date(va || 0).getTime(); vb = new Date(vb || 0).getTime(); }
      else if (sortCol === 'totalValue') { va = +(va||0); vb = +(vb||0); }
      else { va = (va||'').toString().toLowerCase(); vb = (vb||'').toString().toLowerCase(); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1  : -1;
      return 0;
    });
  }

  filteredInvoices = result;
  currentPage      = 1;
  renderTable();
  renderPagination();
}

// ─── Header ───────────────────────────────────────────────────────────────────
function renderHeader() {
  const thead = document.getElementById('invoices-thead');
  if (!thead) return;
  const visCols = columns.filter(c => c.visible);
  const numKeys = ['totalValue'];

  thead.innerHTML = `
    <tr>
      <th class="amis-th-check"><input type="checkbox" id="chk-all-invoices" title="Chọn tất cả"></th>
      ${visCols.map(col => `
        <th class="amis-th${col.sortable ? ' sortable' : ''}" data-col="${col.key}"
            style="${numKeys.includes(col.key) ? 'text-align:right' : ''}">
          <div class="amis-th-inner${numKeys.includes(col.key) ? ' justify-end' : ''}">
            <span>${col.label}</span>
            ${col.sortable ? `<span class="sort-icon${sortCol === col.key ? (sortDir === 'asc' ? ' asc' : ' desc') : ''}">${sortSVG(col.key)}</span>` : ''}
          </div>
        </th>`).join('')}
      <th class="amis-th-actions">Thao tác</th>
    </tr>
  `;

  thead.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      if (sortCol === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      else { sortCol = col; sortDir = 'asc'; }
      renderHeader();
      applyFilterSort();
    });
  });

  document.getElementById('chk-all-invoices')?.addEventListener('change', e => {
    document.querySelectorAll('.chk-row-invoice').forEach(cb => cb.checked = e.target.checked);
  });
}

function sortSVG(col) {
  if (sortCol !== col) return `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 15l5 5 5-5"/><path d="M7 9l5-5 5 5"/></svg>`;
  if (sortDir === 'asc') return `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5l-7 7h14z" fill="currentColor" stroke="none"/></svg>`;
  return `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 19l7-7H5z" fill="currentColor" stroke="none"/></svg>`;
}

// ─── Table rows ───────────────────────────────────────────────────────────────
function renderTable() {
  const tbody   = document.getElementById('invoices-table-body');
  if (!tbody) return;
  const visCols = columns.filter(c => c.visible);
  const total   = filteredInvoices.length;
  const start   = (currentPage - 1) * pageSize;
  const items   = filteredInvoices.slice(start, start + pageSize);
  const end     = Math.min(start + pageSize, total);

  const info = document.getElementById('invoices-pagination-info');
  if (info) info.textContent = `Tổng: ${total} bản ghi${total > 0 ? ` · Hiển thị ${start + 1}–${end}` : ''}`;

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${visCols.length + 2}" class="amis-table-empty">Không tìm thấy chứng từ nào phù hợp điều kiện lọc.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(inv => {
    const cells = visCols.map(col => {
      switch (col.key) {
        case 'invoiceNumber':
          return `<td><strong class="inv-num-link" data-id="${inv.id}">${inv.invoiceNumber || '—'}</strong></td>`;
        case 'invoiceDate':
          return `<td style="white-space:nowrap;color:var(--text-muted);font-size:12.5px">${inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('vi-VN') : '—'}</td>`;
        case 'type':
          return `<td>${docTypeBadge(inv.type)}</td>`;
        case 'shipmentCode':
          return `<td>${inv.shipmentCode ? `<a class="ph-link" href="javascript:void(0)" onclick="window.appNavigateTo('shipment-detail','${inv.shipmentId}')">${inv.shipmentCode}</a>` : '<span class="amis-td-muted">—</span>'}</td>`;
        case 'partnerName':
          return `<td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600">${inv.partnerName || '—'}</td>`;
        case 'shipmentType':
          return `<td>${inv.shipmentType === 'Import' ? '<span class="ph-chip ph-chip-import">📥 Nhập</span>' : inv.shipmentType === 'Export' ? '<span class="ph-chip ph-chip-export">📤 Xuất</span>' : '<span class="amis-td-muted">—</span>'}</td>`;
        case 'currency':
          return `<td><span class="inv-currency">${inv.currency || 'USD'}</span></td>`;
        case 'paymentTerms':
          return `<td style="font-size:12px;color:var(--text-muted)">${inv.paymentTerms || '—'}</td>`;
        case 'totalValue':
          return `<td style="text-align:right;font-weight:700;white-space:nowrap">${formatMoney(inv.totalValue, inv.currency)}</td>`;
        case 'status':
          return `<td style="text-align:center">${statusBadge(inv.status)}</td>`;
        default:
          return `<td></td>`;
      }
    }).join('');

    return `
      <tr data-id="${inv.id}">
        <td class="amis-td-check"><input type="checkbox" class="chk-row-invoice" value="${inv.id}"></td>
        ${cells}
        <td class="amis-td-actions">
          <div class="amis-row-actions">
            <button class="amis-icon-btn btn-view-invoice" data-id="${inv.id}" title="Xem chi tiết">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button class="amis-icon-btn btn-download-doc" data-id="${inv.id}" title="Tải file đính kèm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
            <button class="amis-icon-btn amis-icon-btn-danger btn-del-invoice" data-id="${inv.id}" data-num="${inv.invoiceNumber}" title="Xóa">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Bind events
  tbody.querySelectorAll('.btn-view-invoice').forEach(b => b.addEventListener('click', () => viewInvoiceDetail(b.dataset.id)));
  tbody.querySelectorAll('.btn-download-doc').forEach(b => b.addEventListener('click', () => downloadInvoiceDoc(b.dataset.id)));
  tbody.querySelectorAll('.btn-del-invoice').forEach(b => b.addEventListener('click', () => confirmDeleteInvoice(b.dataset.id, b.dataset.num)));
  tbody.querySelectorAll('.inv-num-link').forEach(el => el.addEventListener('click', () => viewInvoiceDetail(el.dataset.id)));
}

// ─── Badge helpers ────────────────────────────────────────────────────────────
function docTypeBadge(type) {
  const map = {
    CommercialInvoice: ['inv-badge-commercial', 'Commercial'],
    ProformaInvoice:   ['inv-badge-proforma',   'Proforma'],
    DebitNote:         ['inv-badge-debit',       'Debit Note'],
    PackingList:       ['inv-badge-packing',     'Packing List'],
    SalesContract:     ['inv-badge-contract',    'Sales Contract'],
    TaxInvoice:        ['inv-badge-tax',         'Tax Invoice'],
  };
  const [cls, label] = map[type] || ['inv-badge-commercial', type || 'Invoice'];
  return `<span class="inv-type-badge ${cls}">${label}</span>`;
}

function statusBadge(status) {
  if (!status) return '<span class="inv-status inv-status-default">—</span>';
  const s = status.toLowerCase();
  if (s.includes('paid') || s.includes('done') || s.includes('complete'))
    return `<span class="inv-status inv-status-paid">${status}</span>`;
  if (s.includes('partial'))
    return `<span class="inv-status inv-status-partial">${status}</span>`;
  if (s.includes('overdue') || s.includes('late'))
    return `<span class="inv-status inv-status-overdue">${status}</span>`;
  if (s.includes('cancel'))
    return `<span class="inv-status inv-status-cancel">${status}</span>`;
  return `<span class="inv-status inv-status-pending">${status}</span>`;
}

function formatMoney(val, currency = 'USD') {
  if (!val && val !== 0) return '—';
  return `${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency || 'USD'}`;
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function renderPagination() {
  const ctrl  = document.getElementById('invoices-pagination-buttons');
  if (!ctrl) return;
  const total = filteredInvoices.length;
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) { ctrl.innerHTML = ''; return; }

  const range = pRange(currentPage, pages);
  let html = `<button class="amis-pg-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>‹</button>`;
  range.forEach(p => {
    if (p === '…') html += `<span class="amis-pg-ellipsis">…</span>`;
    else html += `<button class="amis-pg-btn${p === currentPage ? ' active' : ''}" data-page="${p}">${p}</button>`;
  });
  html += `<button class="amis-pg-btn" data-page="${currentPage + 1}" ${currentPage === pages ? 'disabled' : ''}>›</button>`;
  ctrl.innerHTML = html;

  ctrl.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPage = +btn.dataset.page; renderTable(); renderPagination();
    });
  });
}

function pRange(cur, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (cur <= 4)   return [1,2,3,4,5,'…',total];
  if (cur >= total - 3) return [1,'…',total-4,total-3,total-2,total-1,total];
  return [1,'…',cur-1,cur,cur+1,'…',total];
}

// ─── Column picker ────────────────────────────────────────────────────────────
function openColPicker() {
  const list = document.getElementById('colCheckListInv');
  if (!list) return;
  list.innerHTML = columns.map((col, i) => `
    <label class="col-check-row">
      <input type="checkbox" data-idx="${i}" ${col.visible ? 'checked' : ''}>
      <span>${col.label}</span>
    </label>`).join('');
}

// ─── Events ───────────────────────────────────────────────────────────────────
function setupEvents() {
  document.getElementById('btn-add-invoice')?.addEventListener('click', () => openCreateInvoiceModal());
  document.getElementById('btn-refresh-invoices')?.addEventListener('click', loadInvoices);

  ['invoice-search-input', 'filter-date-from', 'filter-date-to', 'filter-invoice-type', 'filter-shipment-type'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', applyFilterSort);
    document.getElementById(id)?.addEventListener('change', applyFilterSort);
  });

  document.getElementById('invoices-items-per-page')?.addEventListener('change', e => {
    pageSize = +e.target.value; currentPage = 1; renderTable(); renderPagination();
  });

  // Column picker
  const btnCol  = document.getElementById('btnColPickerInv');
  const colDrop = document.getElementById('colDropdownInv');
  btnCol?.addEventListener('click', e => {
    e.stopPropagation();
    const open = colDrop.style.display !== 'none';
    colDrop.style.display = open ? 'none' : 'block';
    if (!open) openColPicker();
  });
  document.addEventListener('click', e => {
    if (!document.getElementById('colPickerWrapInv')?.contains(e.target))
      if (colDrop) colDrop.style.display = 'none';
  });
  document.getElementById('btnApplyColsInv')?.addEventListener('click', () => {
    document.querySelectorAll('#colCheckListInv input[type=checkbox]').forEach(cb => {
      columns[+cb.dataset.idx].visible = cb.checked;
    });
    if (colDrop) colDrop.style.display = 'none';
    renderHeader(); renderTable();
  });
  document.getElementById('btnResetColsInv')?.addEventListener('click', () => {
    columns = (COL_DEFS[currentDocType] || COL_DEFS.Invoice).map(c => ({ ...c }));
    openColPicker();
  });
}

// ─── View detail ──────────────────────────────────────────────────────────────
async function viewInvoiceDetail(id) {
  try {
    const res = await api.get(`/api/invoices/${id}`);
    const inv = res.data;
    if (!inv) return;

    const isPacking = currentDocType === 'PackingList';
    const itemsHtml = (inv.items || []).map((it, idx) => `
      <tr>
        <td style="text-align:center;color:var(--text-muted)">${idx + 1}</td>
        <td><strong>${it.productCode || '—'}</strong></td>
        <td style="max-width:220px;white-space:normal;font-size:12.5px">${it.description || ''}</td>
        <td style="text-align:right">${Number(it.quantity||0).toLocaleString()}</td>
        <td style="text-align:center">${it.unit || 'KG'}</td>
        <td style="text-align:right">$${Number(it.unitPrice||0).toFixed(4)}</td>
        <td style="text-align:right;font-weight:700">$${Number(it.totalAmount||(it.quantity*it.unitPrice)||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
      </tr>`).join('');

    const title = isPacking ? 'PACKING LIST' : currentDocType === 'SalesContract' ? 'SALES CONTRACT' : 'COMMERCIAL INVOICE';

    openModal(`${isPacking ? 'Chi tiết Packing List' : 'Chi tiết Hóa đơn'}: ${inv.invoiceNumber}`, `
      <div style="font-size:13px">
        <div style="display:flex;justify-content:space-between;border-bottom:2px solid var(--amis-blue);padding-bottom:12px;margin-bottom:16px">
          <div>
            <div style="font-size:18px;font-weight:800;color:var(--amis-blue);margin-bottom:4px">${title}</div>
            <div><strong>Số:</strong> ${inv.invoiceNumber}</div>
            <div><strong>Ngày Lập:</strong> ${inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('vi-VN') : '—'}</div>
            <div><strong>Đối Tác:</strong> ${inv.partnerName || '—'}</div>
          </div>
          <div style="text-align:right">
            <div>${docTypeBadge(inv.type)}</div>
            ${inv.paymentTerms ? `<div style="margin-top:6px;font-size:12px">TT: <strong>${inv.paymentTerms}</strong></div>` : ''}
            <div style="margin-top:4px;font-size:12px">Tiền tệ: <strong>${inv.currency || 'USD'}</strong></div>
          </div>
        </div>

        <table class="amis-data-table" style="margin-bottom:16px">
          <thead><tr>
            <th style="text-align:center;width:36px">STT</th>
            <th>Mã Hàng</th><th>Mô Tả Sản Phẩm</th>
            <th style="text-align:right">Số Lượng</th><th style="text-align:center">ĐVT</th>
            <th style="text-align:right">Đơn Giá</th><th style="text-align:right">Thành Tiền</th>
          </tr></thead>
          <tbody>${itemsHtml || '<tr><td colspan="7" class="amis-table-empty">Không có chi tiết mặt hàng</td></tr>'}</tbody>
        </table>

        <div style="display:flex;justify-content:flex-end">
          <div style="width:300px;font-size:13px;line-height:2;background:var(--bg-app);border:1px solid var(--border-color);border-radius:8px;padding:12px 16px">
            <div style="display:flex;justify-content:space-between"><span>Tiền hàng:</span><strong>$${Number(inv.subTotal||0).toLocaleString()}</strong></div>
            ${inv.discount ? `<div style="display:flex;justify-content:space-between"><span>Chiết khấu:</span><span>-$${Number(inv.discount).toLocaleString()}</span></div>` : ''}
            ${inv.otherCharges ? `<div style="display:flex;justify-content:space-between"><span>Phí khác:</span><span>+$${Number(inv.otherCharges).toLocaleString()}</span></div>` : ''}
            <div style="display:flex;justify-content:space-between;border-top:1px solid var(--border-color);padding-top:6px;margin-top:4px;font-size:15px;font-weight:800;color:var(--amis-blue)">
              <span>TỔNG CỘNG:</span><span>$${Number(inv.totalValue||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})} ${inv.currency||'USD'}</span>
            </div>
          </div>
        </div>
      </div>
    `);
  } catch (err) { toast(`Lỗi: ${err.message}`, 'error'); }
}

// ─── Create modal ──────────────────────────────────────────────────────────────
window.xnkCreateInvoiceModal = openCreateInvoiceModal;
export async function openCreateInvoiceModal(defaultShipmentId = null, forceType = null) {
  let shipments = [], products = [];
  try {
    const [s, p] = await Promise.all([
      api.get('/api/shipments?pageSize=200'),
      api.get('/api/products?pageSize=200')
    ]);
    shipments = s.data?.items || s.data || [];
    products  = p.data?.items || p.data || [];
  } catch {}

  // Kiểm tra nếu lô hàng mặc định đã hoàn thành / khóa
  if (defaultShipmentId) {
    const target = shipments.find(s => s.id === defaultShipmentId);
    if (target && (target.status === 'Completed' || target.status === 'Cancelled')) {
      toast(`Lô hàng ${target.shipmentCode} đã [${target.status === 'Completed' ? 'Hoàn thành' : 'Hủy'}] và bị KHÓA. Không thể thêm chứng từ mới!`, 'warning');
      return;
    }
  }

  const docToCreate = forceType || currentDocType;
  const isPacking   = docToCreate === 'PackingList';
  const isSales     = docToCreate === 'SalesContract';

  const numLabel = isPacking ? 'Số Packing List' : isSales ? 'Số Hợp Đồng' : 'Số Invoice';
  const numPH    = isPacking ? 'PL-2026-0001' : isSales ? 'SC-2026-0001' : 'INV-2026-0001';
  const typeOpts = isPacking
    ? `<option value="PackingList" selected>Packing List</option>`
    : isSales
    ? `<option value="SalesContract" selected>Sales Contract</option>`
    : `<option value="CommercialInvoice" selected>Commercial Invoice</option>
       <option value="ProformaInvoice">Proforma Invoice</option>
       <option value="DebitNote">Debit Note</option>`;

  // Lọc ẩn hoàn toàn các lô hàng đã hoàn thành hoặc đã hủy (chỉ hiển thị lô đang xử lý)
  const activeShipments = shipments.filter(s => {
    if (s.id === defaultShipmentId) return true;
    return s.status !== 'Completed' && s.status !== 'Cancelled';
  });

  const shipOpts = activeShipments.map(s => `
    <option value="${s.id}" ${s.id === defaultShipmentId ? 'selected' : ''}>
      ${s.shipmentCode} – ${s.supplierName || s.customerName || ''} (${s.type === 'Export' ? 'Xuất khẩu' : 'Nhập khẩu'})
    </option>
  `).join('');

  const title  = document.getElementById('modalTitle');
  const tabs   = document.getElementById('modalTabs');
  const body   = document.getElementById('modalBody');
  const footer = document.getElementById('modalFooter');

  if (title) title.innerHTML = isPacking ? 'Lập Packing List Mới' : isSales ? 'Lập Hợp Đồng Mới' : 'Lập Hóa Đơn Mới';
  if (tabs) tabs.style.display = 'none';

  if (body) {
    body.innerHTML = `
      <form id="create-invoice-form" autocomplete="off">
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label required">${numLabel}</label>
            <input type="text" id="inv-num" class="form-input" required placeholder="${numPH}">
          </div>
          <div class="form-group">
            <label class="form-label required">Ngày Lập</label>
            <input type="date" id="inv-date" class="form-input" required value="${new Date().toISOString().slice(0,10)}">
          </div>
        </div>
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label">Lô Hàng Liên Quan</label>
            <select id="inv-shipment" class="form-select" ${defaultShipmentId ? 'disabled' : ''}>
              <option value="">-- Chọn lô hàng (tuỳ chọn) --</option>
              ${shipOpts}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Phân Loại</label>
            <select id="inv-type" class="form-select">${typeOpts}</select>
          </div>
        </div>
        <div class="form-group" style="margin-top:10px">
          <label class="form-label">Tài liệu đính kèm (PDF, ảnh...)</label>
          <input type="file" id="inv-file" class="form-input">
        </div>
        <div style="margin-top:14px">
          <div style="font-weight:600;font-size:13px;color:var(--text-main);margin-bottom:8px">Chi Tiết Sản Phẩm (tự động từ lô hàng)</div>
          <table class="amis-data-table">
            <thead><tr>
              <th>Mặt Hàng</th>
              <th style="text-align:right">Net Weight</th>
              <th style="text-align:right">Gross Weight</th>
              <th style="text-align:right">Đơn Giá ($)</th>
              <th style="text-align:right">Thành Tiền ($)</th>
            </tr></thead>
            <tbody id="inv-items-body">
              <tr><td colspan="5" class="amis-table-empty" style="padding:16px">Vui lòng chọn lô hàng...</td></tr>
            </tbody>
          </table>
        </div>
      </form>
    `;
  }

  // Mở modal trước
  window.openModal();

  // Gán nội dung footer sau khi mở modal để đảm bảo các nút bấm không bị ghi đè
  if (footer) {
    footer.innerHTML = `
      <button type="button" class="btn btn-default" id="btn-cancel-inv">Hủy</button>
      <button type="submit" form="create-invoice-form" class="btn btn-primary" id="btn-submit-inv">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        ${isPacking ? 'Lập Packing List' : isSales ? 'Lập Hợp Đồng' : 'Lập Hóa Đơn'}
      </button>
    `;
  }

  document.getElementById('btn-cancel-inv')?.addEventListener('click', () => {
    if (typeof window.closeModal === 'function') window.closeModal();
    else if (typeof window.closeGlobalModal === 'function') window.closeGlobalModal();
  });

  const loadItems = async (shipId) => {
    const tb = document.getElementById('inv-items-body');
    const lockedHint = document.getElementById('inv-shipment-locked-hint');
    const submitBtn = document.getElementById('btn-submit-inv');
    if (!tb) return;

    if (!shipId) {
      if (lockedHint) lockedHint.style.display = 'none';
      if (submitBtn) submitBtn.disabled = false;
      tb.innerHTML = `<tr><td colspan="5" class="amis-table-empty" style="padding:14px">Vui lòng chọn lô hàng...</td></tr>`;
      return;
    }

    const ship = shipments.find(s => s.id === shipId);
    if (ship && (ship.status === 'Completed' || ship.status === 'Cancelled')) {
      if (lockedHint) {
        lockedHint.style.display = 'block';
        lockedHint.textContent = `⚠️ Lô hàng ${ship.shipmentCode} đã [${ship.status === 'Completed' ? 'Hoàn thành' : 'Hủy'}] và bị KHÓA. Không thể thêm chứng từ mới!`;
      }
      if (submitBtn) submitBtn.disabled = true;
      tb.innerHTML = `<tr><td colspan="5" class="amis-table-empty" style="color:var(--amis-red); padding:16px; font-weight:600;">🔒 Lô hàng này đã hoàn thành (Đã khóa). Không thể thêm chứng từ cho lô hàng đã khóa.</td></tr>`;
      return;
    } else {
      if (lockedHint) lockedHint.style.display = 'none';
      if (submitBtn) submitBtn.disabled = false;
    }

    tb.innerHTML = `<tr><td colspan="5" class="amis-table-empty"><div class="ph-loading"><div class="ph-spinner"></div><span>Đang tải sản phẩm từ lô hàng...</span></div></td></tr>`;
    try {
      let its = (ship && Array.isArray(ship.items) && ship.items.length > 0) ? ship.items : null;
      if (!its) {
        const r = await api.get(`/api/shipments/${shipId}/items`);
        its = r?.data?.items || r?.data || [];
      }
      if (!its.length) {
        tb.innerHTML = `<tr><td colspan="5" class="amis-table-empty">Lô hàng không có sản phẩm</td></tr>`;
        return;
      }
      tb.innerHTML = its.map(si => {
        const qty = +si.quantity || 0, gross = +si.grossWeight || 0, price = +si.unitPrice || 0;
        const pName = si.productName || si.product?.name || 'Sợi';
        const pSku = si.sku || si.product?.sku || si.productCode || '';
        const pUnit = si.unit || si.product?.unit || 'KG';
        const pId = si.productId || si.id;
        return `<tr data-productid="${pId}" data-productname="${pName}" data-sku="${pSku}" data-qty="${qty}" data-unit="${pUnit}" data-price="${price}">
          <td><strong>${pSku}</strong>${pSku ? ' – ' : ''}${pName}</td>
          <td style="text-align:right">${qty.toLocaleString()} ${pUnit}</td>
          <td style="text-align:right">${gross.toLocaleString()} ${pUnit}</td>
          <td style="text-align:right">$${price.toLocaleString()}</td>
          <td style="text-align:right;font-weight:700;color:var(--amis-green);">$${(qty * price).toLocaleString()}</td>
        </tr>`;
      }).join('');
    } catch (e) {
      tb.innerHTML = `<tr><td colspan="5" class="amis-table-empty" style="color:var(--amis-red)">Lỗi: ${e.message}</td></tr>`;
    }
  };

  const shipmentSelect = document.getElementById('inv-shipment');
  if (shipmentSelect) {
    shipmentSelect.addEventListener('change', e => {
      loadItems(e.target.value);
    });
  }

  // Tự động load nếu có defaultShipmentId hoặc giá trị ban đầu
  if (defaultShipmentId) {
    loadItems(defaultShipmentId);
  } else if (shipmentSelect && shipmentSelect.value) {
    loadItems(shipmentSelect.value);
  }

  document.getElementById('create-invoice-form')?.addEventListener('submit', async e => {
    e.preventDefault();

    const selectedShipId = document.getElementById('inv-shipment')?.value;
    if (selectedShipId) {
      const ship = shipments.find(s => s.id === selectedShipId);
      if (ship && (ship.status === 'Completed' || ship.status === 'Cancelled')) {
        toast(`Lô hàng ${ship.shipmentCode} đã hoàn thành (đã khóa). Không thể lập chứng từ!`, 'error');
        return;
      }
    }

    const rows  = document.querySelectorAll('#inv-items-body tr[data-productid]');
    const items = Array.from(rows).map(r => ({
      productId: r.dataset.productid,
      productName: r.dataset.productname,
      productCode: r.dataset.sku,
      description: r.dataset.sku,
      quantity: +r.dataset.qty,
      unit: r.dataset.unit,
      unitPrice: +r.dataset.price,
    }));

    if (!items.length) {
      toast('Lô hàng chưa có sản phẩm hoặc chưa chọn lô hàng hợp lệ', 'warning');
      return;
    }

    const payload = {
      invoiceNumber: document.getElementById('inv-num').value.trim(),
      invoiceDate:   new Date(document.getElementById('inv-date').value).toISOString(),
      type:          document.getElementById('inv-type').value,
      currency:      'USD',
      shipmentId:    selectedShipId || null,
      items,
    };

    try {
      const created   = await api.post('/api/invoices', payload);
      const invoiceId = created?.data?.id;
      const fileInput = document.getElementById('inv-file');
      if (fileInput?.files.length && invoiceId) {
        const fd = new FormData();
        fd.append('File', fileInput.files[0]);
        fd.append('Category', 'Invoice');
        fd.append('EntityType', 'Invoice');
        fd.append('EntityId', invoiceId);
        if (payload.shipmentId) fd.append('ShipmentId', payload.shipmentId);
        await api.upload('/api/documents/upload', fd);
      }
      toast('Tạo chứng từ thành công!', 'success');
      if (typeof window.closeModal === 'function') window.closeModal();
      else if (typeof window.closeGlobalModal === 'function') window.closeGlobalModal();
      await loadInvoices();
    } catch (err) {
      toast(`Lỗi: ${err.message}`, 'error');
    }
  });
}

// ─── Download ──────────────────────────────────────────────────────────────────
async function downloadInvoiceDoc(invoiceId) {
  try {
    const res  = await api.get(`/api/documents?entityType=Invoice&entityId=${invoiceId}`);
    const docs = res.data?.items || res.data || [];
    if (!docs.length) { toast('Không có file đính kèm cho hóa đơn này', 'info'); return; }
    const doc  = docs[0];
    const dlRes = await fetch(`${API_BASE}/api/documents/${doc.id}/download`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    if (!dlRes.ok) throw new Error('Không thể tải file');
    const blob = await dlRes.blob();
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: doc.originalFileName || doc.fileName || 'Invoice_File' });
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast('Đã tải file thành công!', 'success');
  } catch (err) { toast(`Lỗi: ${err.message}`, 'error'); }
}

// ─── Delete ───────────────────────────────────────────────────────────────────
function confirmDeleteInvoice(id, num) {
  const title  = document.getElementById('modalTitle');
  const tabs   = document.getElementById('modalTabs');
  const body   = document.getElementById('modalBody');
  const footer = document.getElementById('modalFooter');

  title.innerHTML = 'Xác nhận Xóa';
  tabs.style.display = 'none';
  body.innerHTML = `
    <div class="confirm-dialog-body">
      <div class="confirm-icon confirm-icon-danger">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </div>
      <p style="font-size:14px;margin-top:12px">Bạn có chắc muốn xóa chứng từ <strong style="color:var(--amis-red)">${num}</strong>?</p>
      <p style="font-size:12.5px;color:var(--text-muted)">Hành động này không thể hoàn tác.</p>
    </div>
  `;
  footer.innerHTML = `
    <button type="button" class="btn btn-default" onclick="window.closeGlobalModal()">Hủy</button>
    <button type="button" class="btn btn-danger" id="btn-confirm-del-inv">Xóa</button>
  `;
  window.openModal();

  document.getElementById('btn-confirm-del-inv').addEventListener('click', async () => {
    try {
      await api.delete(`/api/invoices/${id}`);
      toast('Đã xóa hóa đơn thành công!', 'success');
      window.closeGlobalModal();
      await loadInvoices();
    } catch (err) { toast(`Lỗi: ${err.message}`, 'error'); }
  });
}

// Legacy compat
window.xnkGoToInvoicePage = page => { currentPage = page; renderTable(); renderPagination(); };
