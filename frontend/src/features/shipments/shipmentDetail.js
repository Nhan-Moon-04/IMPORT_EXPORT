// frontend/src/features/shipments/shipmentDetail.js
import { api, toast, openModal, closeModal, showConfirm } from '../../core/api.js';
import { openShipmentForm } from '../shipments/shipments.js';
import { openUploadDocumentModal } from '../documents/documents.js';
import { openCreateInvoiceModal } from '../invoices/invoices.js';

// ─── Timeline Storage ─────────────────────────────────────────────────────────
// Mỗi lô hàng có mảng entries riêng trong localStorage
// Entry: { id, text, ts, by }

export function tlKey(shipmentId) {
  return `xnk_timeline_${shipmentId}`;
}

export function tlLoad(shipmentId) {
  try {
    return JSON.parse(localStorage.getItem(tlKey(shipmentId)) || '[]');
  } catch { return []; }
}

export function tlSave(shipmentId, entries) {
  localStorage.setItem(tlKey(shipmentId), JSON.stringify(entries));
  // Broadcast event so shipments list can re-read status
  window.dispatchEvent(new CustomEvent('xnk:timeline-updated', { detail: { shipmentId } }));
}

export function tlAdd(shipmentId, text, by = 'admin') {
  const entries = tlLoad(shipmentId);
  entries.push({
    id: Date.now().toString(),
    text: text.trim(),
    ts: new Date().toLocaleString('vi-VN'),
    by,
  });
  tlSave(shipmentId, entries);
  return entries;
}

export function tlDelete(shipmentId, entryId) {
  const entries = tlLoad(shipmentId).filter(e => e.id !== entryId);
  tlSave(shipmentId, entries);
  return entries;
}

export function tlEdit(shipmentId, entryId, newText) {
  const entries = tlLoad(shipmentId).map(e =>
    e.id === entryId ? { ...e, text: newText.trim(), edited: true } : e
  );
  tlSave(shipmentId, entries);
  return entries;
}

/** Lấy text entry mới nhất – dùng làm Trạng Thái ngoài danh sách */
export function tlLatestStatus(shipmentId) {
  const entries = tlLoad(shipmentId);
  return entries.length > 0 ? entries[entries.length - 1].text : null;
}

// ─── SVG Icons ───────────────────────────────────────────────────────────────
const ICON = {
  ship:     `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20a2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1"/><path d="M4 18V14l8-4 4 2v6"/><path d="M12 2v6"/><path d="M8 6h8"/></svg>`,
  back:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`,
  copy:     `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  edit:     `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  print:    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`,
  dots:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>`,
  calendar: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  anchor:   `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="3"/><line x1="12" y1="8" x2="12" y2="20"/><path d="M5 14l7 6 7-6"/></svg>`,
  building: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M9 3v18"/><path d="M3 9h6"/><path d="M3 15h6"/></svg>`,
  incoterm: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
  barcode:  `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 5v14"/><path d="M8 5v14"/><path d="M12 5v14"/><path d="M17 5v14"/><path d="M21 5v14"/></svg>`,
  user:     `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  file:     `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  excel:    `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  check:    `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`,
  chevron:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`,
  refresh:  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
};

// ─── Status mapping ───────────────────────────────────────────────────────────
const STATUS_CLASS = {
  Draft:          'chip chip-slate',
  PendingPayment: 'chip chip-amber',
  Paid30:         'chip chip-amber',
  Paid70:         'chip chip-amber',
  PendingImport:  'chip chip-blue',
  Completed:      'chip chip-green',
  Cancelled:      'chip chip-red',
};
const STATUS_LABEL = {
  Draft:          'Bản nháp',
  PendingPayment: 'Chờ thanh toán',
  Paid30:         'Đã thanh toán 30%',
  Paid70:         'Đã thanh toán 70%',
  PendingImport:  'Chờ nhập hàng',
  Completed:      'Đã thông quan',
  Cancelled:      'Đã hủy',
};

export async function renderShipmentDetail(container, shipmentId) {
  container.innerHTML = `
    <div class="sd-page">
      <div style="padding:40px;text-align:center;">
        <div class="spinner"></div>
        <p style="margin-top:10px;color:#64748b;font-size:13px;">Đang tải chi tiết lô hàng...</p>
      </div>
    </div>
  `;

  try {
    // ── Fetch data ──────────────────────────────────────────────────────
    let shipment = null, invoices = [], documents = [];

    const [shpRes, invRes, docRes] = await Promise.all([
      api.get(`/api/shipments/${shipmentId}`).catch(() => null),
      api.get(`/api/invoices?shipmentId=${shipmentId}`).catch(() => ({ data: [] })),
      api.get(`/api/documents?shipmentId=${shipmentId}`).catch(() => ({ data: [] })),
    ]);

    shipment  = shpRes?.data;
    invoices  = (invRes?.data?.items  || invRes?.data  || []).filter(i => i.shipmentId === shipmentId);
    documents = (docRes?.data?.items  || docRes?.data  || []).filter(d => d.shipmentId === shipmentId);

    if (!shipment) {
      const listRes = await api.get('/api/shipments');
      const all = listRes.data?.items || listRes.data || [];
      shipment = all.find(s => s.id === shipmentId || s.code === shipmentId || s.shipmentCode === shipmentId);
    }

    if (!shipment) {
      container.innerHTML = `
        <div class="sd-page" style="padding:48px;text-align:center;">
          <div style="font-size:40px;margin-bottom:12px;">📁</div>
          <h3 style="color:var(--amis-red);margin-bottom:8px;">Không tìm thấy lô hàng</h3>
          <p style="color:#64748b;font-size:13px;margin-bottom:20px;">Mã lô hàng không tồn tại hoặc đã bị xóa.</p>
          <button class="btn btn-secondary" onclick="window.appNavigateTo('shipments')">← Quay lại danh sách</button>
        </div>`;
      return;
    }

    // ── Normalize & calculate ───────────────────────────────────────────
    const items            = shipment.items || [];
    const totalQty         = shipment.totalQuantity || items.reduce((s, i) => s + (i.quantity || 0), 0) || 0;
    const totalNetWeight   = items.reduce((s, i) => s + (i.netWeight   || 0), 0) || 0;
    const totalGrossWeight = shipment.totalGrossWeight || items.reduce((s, i) => s + (i.grossWeight || 0), 0) || 0;
    const totalPackages    = shipment.totalPackages || 0;
    const totalVal         = shipment.totalValue || items.reduce((s, i) => s + (i.totalPrice || (i.quantity * i.unitPrice) || 0), 0) || 0;

    let partnerContactPerson = '---';
    let partnerContactPhone = '---';
    let partnerContactEmail = '---';
    try {
      if (shipment.type === 'Export' && shipment.customerId) {
        const cRes = await api.get(`/api/customers/${shipment.customerId}`);
        partnerContactPerson = cRes.data?.contactPerson || cRes.data?.contactName || '---';
        partnerContactPhone = cRes.data?.phone || '---';
        partnerContactEmail = cRes.data?.email || '---';
      } else if (shipment.supplierId) {
        const sRes = await api.get(`/api/suppliers/${shipment.supplierId}`);
        partnerContactPerson = sRes.data?.contactPerson || sRes.data?.contactName || '---';
        partnerContactPhone = sRes.data?.phone || '---';
        partnerContactEmail = sRes.data?.email || '---';
      }
    } catch(e) {}

    const trueInvoices  = invoices.filter(i => i.type !== 'PackingList' && i.type !== 'SalesContract');
    const salesContracts= invoices.filter(i => i.type === 'SalesContract');
    const packingLists  = invoices.filter(i => i.type === 'PackingList');

    const primaryInvoiceNumber     = trueInvoices[0]?.invoiceNumber   || 'LCW-INV-2026-001';
    const primaryContractNumber    = salesContracts[0]?.invoiceNumber  || 'PL-2026-001';
    const primaryDeclarationNumber = shipment.customsDeclarations?.[0]?.declarationNumber || '105928371900';

    const bookings   = shipment.bookings  || [];
    const containers = shipment.containers || [];
    const customs    = shipment.customsDeclarations || [];

    const isCompleted  = shipment.status === 'Completed';
    const statusClass  = STATUS_CLASS[shipment.status] || 'chip chip-slate';
    const statusLabel  = STATUS_LABEL[shipment.status] || shipment.status || 'Đã thông quan';
    const typeLabel    = shipment.type === 'Export' ? 'Xuất khẩu' : 'Nhập khẩu';
    const typeClass    = shipment.type === 'Export' ? 'chip chip-purple' : 'chip chip-blue';

    const exchangeRate = 25450;
    const currency     = shipment.currency || 'USD';
    const totalVnd     = totalVal * exchangeRate;

    const shpCode        = shipment.shipmentCode || shipment.code || 'SHP-20260901-VTX';
    const supplierTitle  = shipment.supplierName || shipment.customerName || 'Công ty TNHH Dệt May Việt Nam (VINTEX)';
    const partnerCode    = (shipment.supplierCode || shipment.customerCode || '---').toUpperCase();
    
    const contactPerson = partnerContactPerson;
    const contactPhone  = partnerContactPhone;
    const contactEmail  = partnerContactEmail;
    
    const polDisplay     = shipment.portOfLoading   || '---';
    const podDisplay     = shipment.portOfDischarge || '---';
    const incotermDisplay= shipment.deliveryTerm    || shipment.incoterms || '---';
    const blNumberDisplay= shipment.blNumber        || '---';
    const etaDisplay     = shipment.expectedDate ? new Date(shipment.expectedDate).toLocaleDateString('vi-VN') : '---';
    const etdDisplay     = shipment.etd ? new Date(shipment.etd).toLocaleDateString('vi-VN') : '---';
    const createdDisplay = shipment.createdAt ? new Date(shipment.createdAt).toLocaleDateString('vi-VN') : '24/09/2026';
    const transitDays    = 12;
    const supplierCodeLine = `Mã: ${partnerCode}`;

    const docCounts = {
      contracts:    salesContracts.length,
      invoices:     trueInvoices.length,
      packingLists: packingLists.length,
      customs:      customs.length,
      booking:      bookings.length,
      containers:   containers.length,
      total:        documents.length,
    };

    // ── Timeline (chat-style, from localStorage) ────────────────────────
    // Lấy user hiện tại
    const currentUser = (() => {
      try { return JSON.parse(localStorage.getItem('xnk_user') || '{}').username || 'admin'; } catch { return 'admin'; }
    })();

    /** Render danh sách entries thành HTML */
    function buildTimelineHtml(entries) {
      if (entries.length === 0) {
        return `<div style="text-align:center;color:#94a3b8;font-size:12px;padding:16px 0;">
          Chưa có cập nhật nào. Nhập nội dung bên dưới và nhấn <strong>Enter</strong> để ghi nhận.
        </div>`;
      }
      return entries.map((e, idx) => `
        <div class="tl-entry" data-id="${e.id}" data-idx="${idx}">
          <div class="tl-entry-avatar">${(e.by || 'A')[0].toUpperCase()}</div>
          <div class="tl-entry-body" id="tl-body-${e.id}">
            <div class="tl-entry-header">
              <span class="tl-entry-by">${e.by || 'admin'}</span>
              <span class="tl-entry-ts">${e.ts}</span>
              ${e.edited ? '<span class="tl-edited">(đã sửa)</span>' : ''}
              ${idx === entries.length - 1 ? '<span class="tl-latest-badge">Trạng thái mới nhất</span>' : ''}
            </div>
            <div class="tl-entry-text" id="tl-text-${e.id}">${e.text}</div>
          </div>
          <div class="tl-entry-actions">
            <button class="tl-btn" title="Sửa" onclick="window.__tlEdit('${e.id}')">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
            </button>
            <button class="tl-btn tl-btn-del" title="Xóa" onclick="window.__tlDelete('${e.id}')">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      `).join('');
    }

    // ── Build product rows ──────────────────────────────────────────────
    const displayItems = items;

    const productRows = displayItems.length ? displayItems.map((it, idx) => {
      const q = Number(it.quantity || 0);
      const p = Number(it.unitPrice || 0);
      const rowTotal = it.totalPrice ? Number(it.totalPrice) : (q * p);
      return `
      <tr>
        <td style="text-align:center;color:#64748b;">${idx + 1}</td>
        <td style="font-weight:700;color:var(--amis-blue);">${it.productCode || it.sku || '---'}</td>
        <td><strong>${it.productName || '---'}</strong></td>
        <td style="font-family:monospace;color:#475569;">${it.hsCode || '---'}</td>
        <td>${it.origin || '---'}</td>
        <td style="text-align:center;">${it.unit || '---'}</td>
        <td style="text-align:right;font-weight:600;">${q.toLocaleString()}</td>
        <td style="text-align:right;">$${p.toFixed(2)}</td>
        <td style="text-align:right;font-weight:700;color:var(--amis-green);">$${rowTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        <td style="text-align:right;">${Number(it.netWeight || 0).toFixed(0)} kg</td>
        <td style="text-align:right;">${Number(it.grossWeight || 0).toFixed(0)} kg</td>
        <td style="color:#64748b;">${it.specification || '---'}</td>
        <td style="color:#64748b;">${it.lotBatch || '---'}</td>
      </tr>
      `;
    }).join('') : `<tr><td colspan="13" style="text-align:center;padding:24px;color:#94a3b8;">Không có sản phẩm nào</td></tr>`;



    // ── Render HTML ─────────────────────────────────────────────────────
    container.innerHTML = `
      <div class="sd-page">

        <!-- BREADCRUMB -->
        <div class="sd-breadcrumb">
          <a href="#" id="sd-back-link">Tất cả lô hàng</a>
          <span class="sd-breadcrumb-sep">›</span>
          <span class="sd-breadcrumb-cur">Chi tiết lô hàng</span>
        </div>

        <!-- HEADER -->
        <div class="sd-header">
          <div class="sd-header-row1">
            <div class="sd-icon-box">${ICON.ship}</div>

            <div class="sd-title-group">
              <div class="sd-code">${shpCode}</div>
              <div class="sd-company">
                ${ICON.building}
                ${supplierTitle}
              </div>
            </div>

            <div class="sd-badges">
              <span class="${statusClass}">${statusLabel}</span>
              <span class="${typeClass}">${typeLabel}</span>
            </div>

            <div class="sd-header-actions">
              <button class="sd-btn-sm" id="sd-btn-copy" title="Sao chép mã">
                ${ICON.copy} Sao chép mã
              </button>
              <button class="sd-btn-sm sd-btn-edit" id="sd-btn-edit" ${isCompleted ? 'disabled' : ''}>
                ${ICON.edit} Chỉnh sửa
              </button>
              <button class="sd-btn-sm" id="sd-btn-print">
                ${ICON.print} In
              </button>
              <button class="sd-btn-icon" id="sd-btn-more" title="Thêm tùy chọn">${ICON.dots}</button>
            </div>
          </div>
        </div>

        <!-- INFO BAR -->
        <div class="sd-infobar">
          <div class="sd-field">
            <div class="sd-field-label">${ICON.building} Loại hình</div>
            <div class="sd-field-value">${typeLabel}</div>
          </div>
          <div class="sd-field">
            <div class="sd-field-label">${ICON.user} Đối tác (NCC)</div>
            <div class="sd-field-value">${supplierTitle.length > 28 ? supplierTitle.slice(0,28)+'…' : supplierTitle}</div>
            <div class="sd-field-sub">${supplierCodeLine}</div>
          </div>
          <div class="sd-field">
            <div class="sd-field-label">${ICON.calendar} Ngày tạo lập</div>
            <div class="sd-field-value">${createdDisplay}</div>
          </div>
          <div class="sd-field">
            <div class="sd-field-label">${ICON.calendar} Ngày dự kiến ETA</div>
            <div class="sd-field-value">${etaDisplay}</div>
          </div>
          <div class="sd-field">
            <div class="sd-field-label">${ICON.anchor} Cảng xếp hàng (POL)</div>
            <div class="sd-field-value">${polDisplay}</div>
          </div>
          <div class="sd-field">
            <div class="sd-field-label">${ICON.anchor} Cảng dỡ hàng (POD)</div>
            <div class="sd-field-value">${podDisplay}</div>
          </div>
          <div class="sd-field">
            <div class="sd-field-label">${ICON.incoterm} Incoterm</div>
            <div class="sd-field-value">${incotermDisplay}</div>
          </div>
          <div class="sd-field">
            <div class="sd-field-label">${ICON.user} Người liên hệ</div>
            <div class="sd-field-value">${contactPerson}</div>
            <div class="sd-field-sub">${contactPhone}</div>
          </div>
          <div class="sd-field">
            <div class="sd-field-label">${ICON.barcode} Số vận đơn (B/L)</div>
            <div class="sd-field-value" style="font-family:monospace;">${blNumberDisplay}</div>
          </div>
          <div class="sd-field">
            <div class="sd-field-label">${ICON.file} Mã đối tác</div>
            <div class="sd-field-value">${partnerCode}</div>
          </div>
        </div>

        <!-- BODY: TABS + SIDEBAR -->
        <div class="sd-body">

          <!-- LEFT: TABS CONTENT -->
          <div class="sd-content">
            <div class="sd-tabbar">
              <button class="sd-tab active" data-pane="overview">
                Tổng quan
              </button>
              <button class="sd-tab" data-pane="items">
                Hàng hóa <span class="sd-tab-badge">${displayItems.length}</span>
              </button>
              <button class="sd-tab" data-pane="contracts">
                Sales Contract <span class="sd-tab-badge">${docCounts.contracts}</span>
              </button>
              <button class="sd-tab" data-pane="invoices">
                Invoice <span class="sd-tab-badge">${docCounts.invoices}</span>
              </button>
              <button class="sd-tab" data-pane="packing">
                Packing List <span class="sd-tab-badge">${docCounts.packingLists}</span>
              </button>
              <button class="sd-tab" data-pane="logistics">
                Vận tải <span class="sd-tab-badge">${bookings.length + containers.length || 2}</span>
              </button>
              <button class="sd-tab" data-pane="customs">
                Hải quan <span class="sd-tab-badge">${docCounts.customs}</span>
              </button>
              <button class="sd-tab" data-pane="costs">Chi phí</button>
              <button class="sd-tab" data-pane="documents">
                Chứng từ <span class="sd-tab-badge">${docCounts.total}</span>
              </button>
              <button class="sd-tab" data-pane="history">Lịch sử</button>
            </div>

            <div class="sd-pane-wrap">

              <!-- ═══ TAB: TỔNG QUAN ═══ -->
              <div class="sd-pane active" id="sd-pane-overview">

                <!-- Row 1: info + timeline -->
                <div class="sd-overview-grid">

                  <!-- Thông tin lô hàng -->
                  <div class="sd-card">
                    <div class="sd-card-header">
                      <div class="sd-card-header-left">
                        📋 Thông tin lô hàng
                      </div>
                    </div>
                    <div class="sd-card-body">
                      <div class="sd-info-row">
                        <span class="sd-info-key">Mã lô hàng</span>
                        <span class="sd-info-val" style="color:var(--amis-blue);font-family:monospace;">${shpCode}</span>
                      </div>

                      <div class="sd-info-row">
                        <span class="sd-info-key">Loại hình</span>
                        <span class="sd-info-val"><span class="${typeClass}">${typeLabel}</span></span>
                      </div>
                      <div class="sd-info-row">
                        <span class="sd-info-key">Trạng thái</span>
                        <span class="sd-info-val"><span class="${statusClass}">${statusLabel}</span></span>
                      </div>

                      <div class="sd-divider"></div>
                      <div class="sd-info-row">
                        <span class="sd-info-key">ETD</span>
                        <span class="sd-info-val">${etdDisplay}</span>
                      </div>
                      <div class="sd-info-row">
                        <span class="sd-info-key">ETA</span>
                        <span class="sd-info-val" style="color:var(--amis-green);">${etaDisplay}</span>
                      </div>
                      <div class="sd-info-row">
                        <span class="sd-info-key">Tổng số lượng</span>
                        <span class="sd-info-val">${Number(totalQty).toLocaleString()} kg</span>
                      </div>
                      <div class="sd-info-row">
                        <span class="sd-info-key">Tổng số kiện</span>
                        <span class="sd-info-val">${totalPackages} kiện</span>
                      </div>
                      <div class="sd-info-row">
                        <span class="sd-info-key">Trọng lượng GW</span>
                        <span class="sd-info-val">${totalGrossWeight} kg</span>
                      </div>
                      <div class="sd-info-row">
                        <span class="sd-info-key">Trọng lượng NW</span>
                        <span class="sd-info-val">${totalNetWeight} kg</span>
                      </div>
                      <div class="sd-info-row">
                        <span class="sd-info-key">Thời gian vận chuyển</span>
                        <span class="sd-info-val">${transitDays} ngày</span>
                      </div>
                      <div class="sd-info-row">
                        <span class="sd-info-key">Tuyến đường</span>
                        <span class="sd-info-val">${polDisplay.split(',')[0]} → ${podDisplay.split(',')[0]}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Timeline lô hàng (chat-style) -->
                  <div class="sd-card" style="display:flex;flex-direction:column;">
                    <div class="sd-card-header">
                      <div class="sd-card-header-left">
                        💬 Timeline / Trạng thái lô hàng
                      </div>
                      <span style="font-size:11px;color:#94a3b8;">Entry mới nhất = Trạng thái ngoài danh sách</span>
                    </div>
                    <!-- List entries -->
                    <div class="tl-list" id="tl-list-${shipmentId}">
                      ${buildTimelineHtml(tlLoad(shipmentId))}
                    </div>
                    <!-- Input box -->
                    <div class="tl-input-wrap">
                      <div class="tl-input-avatar">${currentUser[0].toUpperCase()}</div>
                      <input
                        id="tl-input-${shipmentId}"
                        class="tl-input"
                        type="text"
                        placeholder="Nhập trạng thái... (Enter để ghi nhận)"
                        autocomplete="off"
                      />
                      <button class="tl-send-btn" id="tl-send-${shipmentId}" title="Gửi (Enter)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Danh sách hàng hóa -->
                <div>
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                    <span style="font-size:13px;font-weight:700;color:var(--text-main);">
                      Danh sách hàng hóa <span style="font-weight:400;color:#64748b;">(${displayItems.length})</span>
                    </span>
                    <button class="sd-btn-sm sd-btn-excel" id="sd-btn-export-excel">
                      ${ICON.excel} Xuất Excel
                    </button>
                  </div>
                  <div class="sd-table-wrap">
                    <table class="sd-table">
                      <thead>
                        <tr>
                          <th style="width:32px;">#</th>
                          <th>Mã sản phẩm</th>
                          <th>Tên sản phẩm</th>
                          <th>HS Code</th>
                          <th>Xuất xứ</th>
                          <th style="text-align:center;">ĐVT</th>
                          <th style="text-align:right;">Số lượng</th>
                          <th style="text-align:right;">Đơn giá (USD)</th>
                          <th style="text-align:right;">Thành tiền (USD)</th>
                          <th style="text-align:right;">Net Weight</th>
                          <th style="text-align:right;">Gross Weight</th>
                          <th>Quy cách</th>
                          <th>Lô/Batch</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${productRows}
                        <tr class="sd-total-row">
                          <td colspan="6" style="text-align:right;">Tổng cộng</td>
                          <td style="text-align:right;color:var(--amis-blue);">${Number(totalQty).toLocaleString()} kg</td>
                          <td></td>
                          <td style="text-align:right;color:var(--amis-green);">$${Number(totalVal).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          <td style="text-align:right;">${totalNetWeight} kg</td>
                          <td style="text-align:right;">${totalGrossWeight} kg</td>
                          <td colspan="2" style="color:#64748b;font-weight:400;font-size:11px;">Tổng kiện: ${totalPackages}</td>
                        </tr>
                      </tbody>
                    </table>
                    <div class="sd-table-toolbar">
                      <div class="sd-table-toolbar-left">
                        <button class="sd-btn-sm" id="sd-btn-add-row">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          Thêm dòng
                        </button>
                      </div>
                      <span style="font-size:11px;color:#64748b;">Tự động đồng bộ sang Packing List & Tờ khai</span>
                    </div>
                  </div>
                </div>

                <!-- Thông tin chi tiết sản phẩm (expandable panel) -->
                <div class="sd-product-panel" id="sd-product-panel">
                  <div class="sd-product-panel-header" id="sd-product-panel-toggle">
                    <div class="sd-product-panel-left">
                      <div class="sd-product-thumb">🧵</div>
                      <div>
                        <div class="sd-product-name">${displayItems[0]?.productName || 'Sợi Polyester 75D'}</div>
                        <div class="sd-product-badges">
                          <span class="chip chip-blue" style="font-size:10px;padding:1px 6px;">Dùng nhập khẩu</span>
                        </div>
                        <div class="sd-product-meta">
                          Mã SP: ${displayItems[0]?.productCode || 'P-75D'}
                          &nbsp;|&nbsp; HS Code: ${displayItems[0]?.hsCode || '5402.33.00'}
                          &nbsp;|&nbsp; Xuất xứ: ${displayItems[0]?.origin || 'Đài Loan (TW)'}
                          &nbsp;|&nbsp; Quy cách: ${displayItems[0]?.specification || '750/36F'}
                          &nbsp;|&nbsp; Nhà sản xuất: Formosa
                          &nbsp;|&nbsp; Đơn vị tính: ${displayItems[0]?.unit || 'kg'}
                        </div>
                      </div>
                    </div>
                    <div class="sd-product-panel-right">
                      <button class="sd-btn-sm" onclick="event.stopPropagation();window.appNavigateTo('products')">
                        Xem lịch sử số lượng
                      </button>
                      <button class="sd-btn-sm sd-btn-primary" onclick="event.stopPropagation();window.appNavigateTo('products')">
                        → Chi tiết hàng hóa
                      </button>
                    </div>
                  </div>
                </div>

              </div><!-- /overview pane -->


              <!-- ═══ TAB: HÀNG HÓA ═══ -->
              <div class="sd-pane" id="sd-pane-items">
                <div class="sd-table-wrap">
                  <table class="sd-table">
                    <thead>
                      <tr>
                        <th style="width:32px;">#</th>
                        <th>Mã SP</th>
                        <th>Tên hàng / Mặt hàng sợi</th>
                        <th>HS Code</th>
                        <th>Xuất xứ</th>
                        <th style="text-align:center;">ĐVT</th>
                        <th style="text-align:right;">Số lượng</th>
                        <th style="text-align:right;">Đơn giá ($)</th>
                        <th style="text-align:right;">Thành tiền ($)</th>
                        <th style="text-align:right;">Net Weight</th>
                        <th style="text-align:right;">Gross Weight</th>
                        <th>Quy cách</th>
                        <th>Lô/Batch</th>
                        <th style="text-align:center;">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${productRows}
                      <tr class="sd-total-row">
                        <td colspan="6" style="text-align:right;">Tổng cộng (${displayItems.length} dòng):</td>
                        <td style="text-align:right;color:var(--amis-blue);">${Number(totalQty).toLocaleString()} kg</td>
                        <td></td>
                        <td style="text-align:right;color:var(--amis-green);">$${Number(totalVal).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td style="text-align:right;">${totalNetWeight} kg</td>
                        <td style="text-align:right;">${totalGrossWeight} kg</td>
                        <td colspan="3" style="color:#64748b;font-size:11px;">Tổng kiện: <strong>${totalPackages}</strong> | Tỷ giá: 25,450</td>
                      </tr>
                    </tbody>
                  </table>
                  <div class="sd-table-toolbar">
                    <div class="sd-table-toolbar-left">
                      <button class="sd-btn-sm" id="sd-btn-add-item">+ Thêm dòng sản phẩm</button>
                      <button class="sd-btn-sm sd-btn-excel" id="sd-btn-export-items">📥 Xuất Excel</button>
                    </div>
                    <span style="font-size:11px;color:#64748b;">Tự động đồng bộ sang Packing List & Tờ khai</span>
                  </div>
                </div>
              </div>

              <!-- ═══ TAB: SALES CONTRACT ═══ -->
              <div class="sd-pane" id="sd-pane-contracts">
                <div class="sd-table-wrap">
                  <table class="sd-table">
                    <thead><tr>
                      <th>#</th><th>Số Hợp Đồng</th><th>Phân Loại</th>
                      <th>Ngày Lập</th><th>Điều kiện TT</th>
                      <th style="text-align:right;">Tổng Giá Trị</th>
                      <th>Tiền Tệ</th><th>Trạng Thái</th><th>Thao Tác</th>
                    </tr></thead>
                    <tbody>
                      ${salesContracts.length ? salesContracts.map((c, i) => `
                        <tr>
                          <td>${i + 1}</td>
                          <td style="font-weight:700;color:#15803d;">${c.invoiceNumber || '---'}</td>
                          <td><span class="chip chip-green">Sales Contract</span></td>
                          <td>${c.issueDate ? new Date(c.issueDate).toLocaleDateString('vi-VN') : '---'}</td>
                          <td>${c.paymentTerm || '---'}</td>
                          <td style="text-align:right;font-weight:700;color:var(--amis-green);">$${Number(c.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          <td>${c.currency || 'USD'}</td>
                          <td><span class="chip chip-green">${c.status || 'Hiệu lực'}</span></td>
                          <td><button class="sd-btn-sm" onclick="window.appNavigateTo('invoices')">Xem</button></td>
                        </tr>
                      `).join('') : `<tr><td colspan="9" style="text-align:center;color:#94a3b8;padding:24px;">Không có dữ liệu</td></tr>`}
                    </tbody>
                  </table>
                  <div class="sd-table-toolbar">
                    <div class="sd-table-toolbar-left">
                      <button class="sd-btn-sm" id="sd-btn-add-contract">+ Tạo Hợp Đồng</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ═══ TAB: INVOICE ═══ -->
              <div class="sd-pane" id="sd-pane-invoices">
                <div class="sd-table-wrap">
                  <table class="sd-table">
                    <thead><tr>
                      <th>#</th><th>Số Chứng Từ</th><th>Phân Loại</th>
                      <th>Ngày Lập</th><th>Điều kiện TT</th>
                      <th style="text-align:right;">Tổng Giá Trị</th>
                      <th>Tiền Tệ</th><th>Trạng Thái</th><th>Thao Tác</th>
                    </tr></thead>
                    <tbody>
                      ${trueInvoices.length ? trueInvoices.map((inv, i) => `
                        <tr>
                          <td>${i + 1}</td>
                          <td style="font-weight:700;color:var(--amis-blue);">${inv.invoiceNumber || '---'}</td>
                          <td><span class="chip chip-blue">Commercial Invoice</span></td>
                          <td>${inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('vi-VN') : '---'}</td>
                          <td>${inv.paymentTerm || '---'}</td>
                          <td style="text-align:right;font-weight:700;color:var(--amis-green);">$${Number(inv.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          <td>${inv.currency || 'USD'}</td>
                          <td><span class="chip chip-green">${inv.status || 'Đã duyệt'}</span></td>
                          <td><button class="sd-btn-sm" onclick="window.appNavigateTo('invoices')">Xem</button></td>
                        </tr>
                      `).join('') : `<tr><td colspan="9" style="text-align:center;color:#94a3b8;padding:24px;">Không có dữ liệu</td></tr>`}
                    </tbody>
                  </table>
                  <div class="sd-table-toolbar">
                    <div class="sd-table-toolbar-left">
                      <button class="sd-btn-sm" id="sd-btn-add-invoice">+ Tạo Invoice</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ═══ TAB: PACKING LIST ═══ -->
              <div class="sd-pane" id="sd-pane-packing">
                <div class="sd-table-wrap">
                  <table class="sd-table">
                    <thead><tr>
                      <th>#</th><th>Số Packing List</th><th>Ngày Lập</th>
                      <th>Số Kiện</th>
                      <th style="text-align:right;">Net Weight (kg)</th>
                      <th style="text-align:right;">Gross Weight (kg)</th>
                      <th>Đóng gói</th><th>Số Cont / Chì</th><th>Thao Tác</th>
                    </tr></thead>
                    <tbody>
                      ${packingLists.length ? packingLists.map((p, i) => `
                        <tr>
                          <td>${i + 1}</td>
                          <td style="font-weight:700;color:var(--amis-blue);">${p.invoiceNumber || '---'}</td>
                          <td>${p.issueDate ? new Date(p.issueDate).toLocaleDateString('vi-VN') : '---'}</td>
                          <td>${p.totalPackages || totalPackages} Pallets</td>
                          <td style="text-align:right;">${p.netWeight || totalNetWeight} kg</td>
                          <td style="text-align:right;">${p.grossWeight || totalGrossWeight} kg</td>
                          <td>${p.packagingType || 'Palletized & shrink wrapped'}</td>
                          <td>${p.containerNumber || '---'}</td>
                          <td><button class="sd-btn-sm" onclick="window.appNavigateTo('packing-lists')">Chi tiết</button></td>
                        </tr>
                      `).join('') : `<tr><td colspan="9" style="text-align:center;color:#94a3b8;padding:24px;">Không có dữ liệu</td></tr>`}
                    </tbody>
                  </table>
                  <div class="sd-table-toolbar">
                    <div class="sd-table-toolbar-left">
                      <button class="sd-btn-sm" id="sd-btn-add-packing">+ Tạo Packing List</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ═══ TAB: VẬN TẢI ═══ -->
              <div class="sd-pane" id="sd-pane-logistics" style="gap:12px;">
                <div class="sd-overview-grid">
                  <div class="sd-card">
                    <div class="sd-card-header"><div class="sd-card-header-left">⚓ Thông tin vận tải quốc tế</div>
                      <button class="sd-btn-sm">+ Thêm Booking</button>
                    </div>
                    <div class="sd-card-body" style="display:grid;grid-template-columns:1fr 1fr;gap:6px 12px;font-size:12px;">
                      <div class="sd-info-row"><span class="sd-info-key">Booking No.</span><span class="sd-info-val">BK-2026-VN91823</span></div>
                      <div class="sd-info-row"><span class="sd-info-key">Hãng tàu</span><span class="sd-info-val">COSCO SHIPPING</span></div>
                      <div class="sd-info-row"><span class="sd-info-key">Tàu (Vessel)</span><span class="sd-info-val">COSCO HELLAS</span></div>
                      <div class="sd-info-row"><span class="sd-info-key">Voyage</span><span class="sd-info-val">V.092E</span></div>
                      <div class="sd-info-row"><span class="sd-info-key">ETD</span><span class="sd-info-val">20/09/2026</span></div>
                      <div class="sd-info-row"><span class="sd-info-key">ETA</span><span class="sd-info-val" style="color:var(--amis-green);">${etaDisplay}</span></div>
                      <div class="sd-info-row"><span class="sd-info-key">B/L No.</span><span class="sd-info-val" style="font-family:monospace;">${blNumberDisplay}</span></div>
                      <div class="sd-info-row"><span class="sd-info-key">Forwarder</span><span class="sd-info-val">Transworld Logistics VN</span></div>
                    </div>
                  </div>
                  <div class="sd-card">
                    <div class="sd-card-header"><div class="sd-card-header-left">📦 Container & Số Chì</div>
                      <button class="sd-btn-sm">+ Gán Container</button>
                    </div>
                    <div class="sd-card-body" style="font-size:12px;">
                      <div class="sd-info-row"><span class="sd-info-key">Số Container</span><span class="sd-info-val">COSU8937218</span></div>
                      <div class="sd-info-row"><span class="sd-info-key">Loại vỏ cont</span><span class="sd-info-val">40' High Cube (HC)</span></div>
                      <div class="sd-info-row"><span class="sd-info-key">Số chì (Seal)</span><span class="sd-info-val">COSU-SL-918274</span></div>
                      <div class="sd-info-row"><span class="sd-info-key">Gross Weight</span><span class="sd-info-val">${totalGrossWeight} kg</span></div>
                      <div class="sd-info-row"><span class="sd-info-key">Tare Weight</span><span class="sd-info-val">3,850 kg</span></div>
                      <div class="sd-info-row"><span class="sd-info-key">Tình trạng</span>
                        <span class="sd-info-val"><span class="chip chip-green">Đã hạ bãi Cát Lái</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ═══ TAB: HẢI QUAN ═══ -->
              <div class="sd-pane" id="sd-pane-customs">
                <div class="sd-card">
                  <div class="sd-card-header">
                    <div class="sd-card-header-left">
                      📋 Khai báo hải quan (VNACCS)
                      <span class="chip chip-green">LUỒNG XANH</span>
                    </div>
                    <div style="display:flex;gap:6px;">
                      <a href="https://customs.gov.vn/tra-cuu" target="_blank" class="sd-btn-sm">🔗 Cổng Hải Quan</a>
                      <button class="sd-btn-sm">+ Quản lý tờ khai</button>
                    </div>
                  </div>
                  <div class="sd-card-body" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;font-size:12px;">
                    <div class="sd-field"><div class="sd-field-label">Số tờ khai HQ</div><div class="sd-field-value" style="color:#b45309;">${primaryDeclarationNumber}</div></div>
                    <div class="sd-field"><div class="sd-field-label">Ngày đăng ký</div><div class="sd-field-value">24/09/2026</div></div>
                    <div class="sd-field"><div class="sd-field-label">Chi cục Hải quan</div><div class="sd-field-value" style="font-size:11px;">HQ CK Cảng Sài Gòn KV1</div></div>
                    <div class="sd-field"><div class="sd-field-label">Loại hình</div><div class="sd-field-value">A11 (Nhập tiêu dùng)</div></div>
                    <div class="sd-field"><div class="sd-field-label">Ngày thông quan</div><div class="sd-field-value" style="color:var(--amis-green);">25/09/2026 10:15</div></div>
                    <div class="sd-field"><div class="sd-field-label">Thuế NK & GTGT</div><div class="sd-field-value">0₫ (Form E ưu đãi 0%)</div></div>
                    <div class="sd-field"><div class="sd-field-label">Người khai HQ</div><div class="sd-field-value">Nguyễn Văn Khai</div></div>
                    <div class="sd-field"><div class="sd-field-label">Phân luồng</div><div class="sd-field-value"><span class="chip chip-green">XANH</span></div></div>
                  </div>
                </div>
              </div>

              <!-- ═══ TAB: CHI PHÍ ═══ -->
              <div class="sd-pane" id="sd-pane-costs">
                <div class="sd-table-wrap">
                  <table class="sd-table">
                    <thead><tr>
                      <th>Khoản mục chi phí</th><th>Bên thu phí</th>
                      <th style="text-align:right;">Ngoại tệ ($)</th>
                      <th style="text-align:right;">VNĐ</th>
                      <th>Cách phân bổ</th>
                    </tr></thead>
                    <tbody>
                      <tr><td><strong>Tiền hàng</strong></td><td>${supplierTitle}</td>
                        <td style="text-align:right;font-weight:700;">$${Number(totalVal).toFixed(2)}</td>
                        <td style="text-align:right;">${Number(totalVal*25450).toLocaleString('vi-VN')}₫</td>
                        <td>Trực tiếp theo SP</td></tr>
                      <tr><td><strong>Cước biển (Ocean Freight)</strong></td><td>COSCO SHIPPING</td>
                        <td style="text-align:right;">$250.00</td>
                        <td style="text-align:right;">${(250*25450).toLocaleString('vi-VN')}₫</td>
                        <td>Theo GW</td></tr>
                      <tr><td><strong>Phí THC</strong></td><td>Tân Cảng Sài Gòn</td>
                        <td style="text-align:right;">$120.00</td>
                        <td style="text-align:right;">${(120*25450).toLocaleString('vi-VN')}₫</td>
                        <td>Theo container</td></tr>
                      <tr><td><strong>Bảo hiểm</strong></td><td>Bảo Minh Insurance</td>
                        <td style="text-align:right;">$25.00</td>
                        <td style="text-align:right;">${(25*25450).toLocaleString('vi-VN')}₫</td>
                        <td>Theo giá trị hàng</td></tr>
                      <tr><td><strong>Phí lưu bãi</strong></td><td>Cảng Cát Lái</td>
                        <td style="text-align:right;">$35.00</td>
                        <td style="text-align:right;">${(35*25450).toLocaleString('vi-VN')}₫</td>
                        <td>Theo ngày</td></tr>
                      <tr class="sd-total-row">
                        <td colspan="2" style="text-align:right;">Tổng Landed Cost:</td>
                        <td style="text-align:right;color:var(--amis-green);">$${(totalVal+430).toFixed(2)}</td>
                        <td style="text-align:right;color:var(--amis-green);">${((totalVal+430)*25450).toLocaleString('vi-VN')}₫</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- ═══ TAB: CHỨNG TỪ ═══ -->
              <div class="sd-pane" id="sd-pane-documents">
                <div class="sd-card">
                  <div class="sd-card-header">
                    <div class="sd-card-header-left">
                      📎 Chứng Từ Kèm Theo
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;">
                      <span class="chip chip-blue">Invoice (${docCounts.invoices})</span>
                      <span class="chip chip-green">PL (${docCounts.packingLists})</span>
                      <span class="chip chip-amber">Tờ khai (${docCounts.customs})</span>
                      <button class="sd-btn-sm sd-btn-primary" id="sd-btn-upload-doc">+ Upload</button>
                    </div>
                  </div>
                  <div style="overflow-x:auto;">
                    <table class="sd-table" style="min-width:500px;">
                      <thead><tr>
                        <th>Tên tệp</th><th>Phân loại</th><th>Dung lượng</th><th>Ngày tải</th><th style="text-align:center;">Thao tác</th>
                      </tr></thead>
                      <tbody>
                        <tr>
                          <td style="color:var(--amis-blue);font-weight:600;cursor:pointer;">Invoice.pdf</td>
                          <td><span class="chip chip-blue">Invoice</span></td><td>345 KB</td><td>25/09/2026</td>
                          <td style="text-align:center;"><button class="sd-btn-sm">📥</button></td>
                        </tr>
                        <tr>
                          <td style="color:var(--amis-blue);font-weight:600;cursor:pointer;">Packing_List.pdf</td>
                          <td><span class="chip chip-green">Packing List</span></td><td>312 KB</td><td>25/09/2026</td>
                          <td style="text-align:center;"><button class="sd-btn-sm">📥</button></td>
                        </tr>
                        <tr>
                          <td style="color:var(--amis-blue);font-weight:600;cursor:pointer;">CO.pdf</td>
                          <td><span class="chip chip-amber">C/O</span></td><td>98 KB</td><td>24/09/2026</td>
                          <td style="text-align:center;"><button class="sd-btn-sm">📥</button></td>
                        </tr>
                        <tr>
                          <td style="color:var(--amis-blue);font-weight:600;cursor:pointer;">To_khai_HQ.pdf</td>
                          <td><span class="chip chip-slate">Tờ khai HQ</span></td><td>312 KB</td><td>26/09/2026</td>
                          <td style="text-align:center;"><button class="sd-btn-sm">📥</button></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div style="padding:8px 12px;text-align:right;border-top:1px solid var(--border-color);">
                    <button class="sd-btn-sm" onclick="window.appNavigateTo('documents')">📂 Xem tất cả chứng từ →</button>
                  </div>
                </div>
              </div>

              <!-- ═══ TAB: LỊCH SỬ ═══ -->
              <div class="sd-pane" id="sd-pane-history">
                <div class="sd-card">
                  <div class="sd-card-header"><div class="sd-card-header-left">⏱️ Nhật ký thao tác (Audit Trail)</div></div>
                  <div class="sd-card-body">
                    <div class="sd-timeline">
                      ${[
                        { date: '24/09 09:15', desc: `<strong>admin</strong> tạo lô hàng <strong>${shpCode}</strong>` },
                        { date: '24/09 09:35', desc: `<strong>admin</strong> upload Invoice <strong>${primaryInvoiceNumber}</strong> trị giá <strong>$${Number(totalVal).toFixed(2)}</strong>` },
                        { date: '24/09 10:12', desc: `<strong>admin</strong> thêm số tờ khai HQ <strong>${primaryDeclarationNumber}</strong>` },
                        { date: '25/09 14:20', desc: `<strong>admin</strong> cập nhật ETA từ 25/09 sang <strong>26/09/2026</strong>` },
                        { date: '27/09 10:20', desc: `<strong>admin</strong> cập nhật trạng thái → <strong>Đã thông quan</strong>` },
                      ].map(e => `
                        <div style="display:flex;align-items:flex-start;gap:12px;padding:6px 0;border-bottom:1px dashed #f1f5f9;font-size:12px;">
                          <span style="color:#94a3b8;font-family:monospace;min-width:90px;">${e.date}</span>
                          <span>${e.desc}</span>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                </div>
              </div>

            </div><!-- /sd-pane-wrap -->
          </div><!-- /sd-content -->

          <!-- RIGHT: SIDEBAR -->
          <div class="sd-sidebar">

            <!-- Tổng giá trị lô hàng -->
            <div class="sd-price-callout">
              <div class="sd-price-label">TỔNG GIÁ TRỊ LÔ HÀNG</div>
              <div class="sd-price-amount">$${Number(totalVal).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              <div class="sd-price-meta">
                <div>Đơn vị tiền tệ: <strong>${currency}</strong></div>
              </div>
            </div>

            <!-- Chứng từ nhanh -->
            <div class="sd-sidebar-section">
              <div class="sd-sidebar-label">📎 Chứng từ nhanh</div>
              <div class="sd-qdoc-list">
                <div class="sd-qdoc-item" onclick="window.appNavigateTo('invoices')">
                  <div class="sd-qdoc-left">
                    <span class="sd-qdoc-icon">🧾</span>
                    <span class="sd-qdoc-name">Invoice</span>
                  </div>
                  <span class="sd-qdoc-count">${docCounts.invoices}</span>
                </div>
                <div class="sd-qdoc-item" onclick="">
                  <div class="sd-qdoc-left">
                    <span class="sd-qdoc-icon">📦</span>
                    <span class="sd-qdoc-name">Packing List</span>
                  </div>
                  <span class="sd-qdoc-count">${docCounts.packingLists}</span>
                </div>
                <div class="sd-qdoc-item" onclick="window.appNavigateTo('customs-declarations')">
                  <div class="sd-qdoc-left">
                    <span class="sd-qdoc-icon">🏛️</span>
                    <span class="sd-qdoc-name">Tờ khai HQ</span>
                  </div>
                  <span class="sd-qdoc-count">${docCounts.customs}</span>
                </div>
                <div class="sd-qdoc-item" onclick="">
                  <div class="sd-qdoc-left">
                    <span class="sd-qdoc-icon">📋</span>
                    <span class="sd-qdoc-name">Booking</span>
                  </div>
                  <span class="sd-qdoc-count">${docCounts.booking}</span>
                </div>
                <div class="sd-qdoc-item" onclick="">
                  <div class="sd-qdoc-left">
                    <span class="sd-qdoc-icon">🚢</span>
                    <span class="sd-qdoc-name">Container</span>
                  </div>
                  <span class="sd-qdoc-count">${docCounts.containers}</span>
                </div>
              </div>
              <div class="sd-qdoc-viewall" onclick="window.appNavigateTo('documents')">
                Xem tất cả chứng từ →
              </div>
            </div>

            <!-- Tệp đính kèm -->
            <div class="sd-sidebar-section">
              <div class="sd-sidebar-label">📁 Tệp đính kèm</div>
              <div class="sd-attach-list">
                <div class="sd-attach-item">
                  <span class="sd-attach-icon">📄</span>
                  <span class="sd-attach-name">Invoice.pdf</span>
                  <span class="sd-attach-size">345 KB</span>
                </div>
                <div class="sd-attach-item">
                  <span class="sd-attach-icon">📄</span>
                  <span class="sd-attach-name">Packing_List.pdf</span>
                  <span class="sd-attach-size">312 KB</span>
                </div>
                <div class="sd-attach-item">
                  <span class="sd-attach-icon">📄</span>
                  <span class="sd-attach-name">CO.pdf</span>
                  <span class="sd-attach-size">98 KB</span>
                </div>
                <div class="sd-attach-item">
                  <span class="sd-attach-icon">📄</span>
                  <span class="sd-attach-name">To_khai_HQ.pdf</span>
                  <span class="sd-attach-size">312 KB</span>
                </div>
              </div>
              <div class="sd-attach-viewall" onclick="window.appNavigateTo('documents')">Xem tất cả (4) →</div>
            </div>

            <!-- Ghi chú -->
            <div class="sd-sidebar-section">
              <div class="sd-sidebar-label">✏️ Ghi chú</div>
              <div class="sd-note-box">
                ${shipment.notes || 'Lô hàng vẫn đang tiến đến, chưa phát sinh vấn đề gì.'}
              </div>
              <div class="sd-note-meta">Cập nhật: 28/09/2026 14:30 – admin</div>
            </div>

          </div><!-- /sd-sidebar -->
        </div><!-- /sd-body -->
      </div><!-- /sd-page -->
    `;

    // ── Event handlers ──────────────────────────────────────────────────

    // Back / breadcrumb
    container.querySelector('#sd-back-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      window.appNavigateTo('shipments');
    });

    // Tabs
    container.querySelectorAll('.sd-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        container.querySelectorAll('.sd-tab').forEach(t => t.classList.remove('active'));
        container.querySelectorAll('.sd-pane').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const paneId = `sd-pane-${tab.dataset.pane}`;
        const pane = document.getElementById(paneId);
        if (pane) pane.classList.add('active');
      });
    });

    // Edit
    const handleEdit = () => {
      if (openShipmentForm) openShipmentForm(shipment.id);
      else window.appNavigateTo('shipments');
    };
    container.querySelector('#sd-btn-edit')?.addEventListener('click', handleEdit);

    // Print
    container.querySelector('#sd-btn-print')?.addEventListener('click', () => window.print());

    // Copy
    container.querySelector('#sd-btn-copy')?.addEventListener('click', () => {
      navigator.clipboard.writeText(shpCode).then(() => toast(`Đã sao chép mã: ${shpCode}`, 'success'));
    });

    // More options
    container.querySelector('#sd-btn-more')?.addEventListener('click', () => {
      toast('Tải trọn bộ hồ sơ ZIP / Xuất Excel', 'info');
    });

    // Upload document
    const handleUpload = () => {
      if (openUploadDocumentModal) openUploadDocumentModal(shipment.id);
      else window.appNavigateTo('documents');
    };
    container.querySelector('#sd-btn-upload-doc')?.addEventListener('click', handleUpload);

    // Export Excel
    container.querySelector('#sd-btn-export-excel')?.addEventListener('click', () => {
      toast('Đang xuất danh sách hàng hóa ra Excel...', 'info');
    });
    container.querySelector('#sd-btn-export-items')?.addEventListener('click', () => {
      toast('Đang xuất danh sách hàng hóa ra Excel...', 'info');
    });

    // Add row (opens shipment form)
    container.querySelector('#sd-btn-add-row')?.addEventListener('click', handleEdit);
    container.querySelector('#sd-btn-add-item')?.addEventListener('click', handleEdit);

    // Add invoice
    container.querySelector('#sd-btn-add-invoice')?.addEventListener('click', () => {
      if (openCreateInvoiceModal) openCreateInvoiceModal(shipment.id, 'CommercialInvoice');
      else window.appNavigateTo('invoices');
    });

    // ── TIMELINE EVENT HANDLERS ─────────────────────────────────────────

    /** Re-render danh sách entries vào tl-list */
    function refreshTlList() {
      const listEl = document.getElementById(`tl-list-${shipmentId}`);
      if (listEl) listEl.innerHTML = buildTimelineHtml(tlLoad(shipmentId));
    }

    // Thêm entry khi Enter hoặc click nút Gửi
    const tlInput = document.getElementById(`tl-input-${shipmentId}`);
    const tlSendBtn = document.getElementById(`tl-send-${shipmentId}`);

    const submitTimeline = () => {
      const text = tlInput?.value?.trim();
      if (!text) return;
      tlAdd(shipmentId, text, currentUser);
      tlInput.value = '';
      refreshTlList();
      // Scroll xuống cuối list
      const listEl = document.getElementById(`tl-list-${shipmentId}`);
      if (listEl) listEl.scrollTop = listEl.scrollHeight;
      toast(`Đã ghi nhận: "${text}"`, 'success');
    };

    tlInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitTimeline();
      }
    });
    tlSendBtn?.addEventListener('click', submitTimeline);

    // Xóa entry – gắn vào window vì dùng onclick inline
    window.__tlDelete = async (entryId) => {
      const confirmed = await showConfirm({
        title: 'Xóa mục timeline?',
        message: 'Mục này sẽ bị xóa vĩnh viễn.',
        confirmText: 'Xóa',
        type: 'danger',
      });
      if (!confirmed) return;
      tlDelete(shipmentId, entryId);
      refreshTlList();
      toast('Đã xóa mục timeline', 'success');
    };

    // Sửa entry – chuyển text thành input inline
    window.__tlEdit = (entryId) => {
      const textEl = document.getElementById(`tl-text-${entryId}`);
      if (!textEl) return;
      const oldText = textEl.textContent;

      // Tạo input inline
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'display:flex;align-items:center;gap:6px;margin-top:2px;';
      wrapper.innerHTML = `
        <input type="text" value="${oldText.replace(/"/g, '&quot;')}"
          style="flex:1;padding:4px 8px;font-size:12px;border:1px solid var(--amis-blue);border-radius:4px;outline:none;"
          id="tl-edit-input-${entryId}" autocomplete="off">
        <button style="padding:3px 8px;font-size:11.5px;background:var(--amis-blue);color:#fff;border:none;border-radius:3px;cursor:pointer;" id="tl-edit-ok-${entryId}">Lưu</button>
        <button style="padding:3px 8px;font-size:11.5px;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;border-radius:3px;cursor:pointer;" id="tl-edit-cancel-${entryId}">Hủy</button>
      `;
      textEl.replaceWith(wrapper);

      const editInput = document.getElementById(`tl-edit-input-${entryId}`);
      editInput?.focus();

      const saveEdit = () => {
        const newText = editInput?.value?.trim();
        if (!newText) return;
        tlEdit(shipmentId, entryId, newText);
        refreshTlList();
        toast('Đã cập nhật mục timeline', 'success');
      };

      document.getElementById(`tl-edit-ok-${entryId}`)?.addEventListener('click', saveEdit);
      document.getElementById(`tl-edit-cancel-${entryId}`)?.addEventListener('click', () => refreshTlList());
      editInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveEdit();
        if (e.key === 'Escape') refreshTlList();
      });
    };

    // Tạo chứng từ trực tiếp từ chi tiết lô hàng
    document.getElementById('sd-btn-add-contract')?.addEventListener('click', () => {
      openCreateInvoiceModal(shipmentId, 'SalesContract');
    });
    document.getElementById('sd-btn-add-invoice')?.addEventListener('click', () => {
      openCreateInvoiceModal(shipmentId, 'CommercialInvoice');
    });
    document.getElementById('sd-btn-add-packing')?.addEventListener('click', () => {
      openCreateInvoiceModal(shipmentId, 'PackingList');
    });

  } catch (err) {
    container.innerHTML = `
      <div class="sd-page" style="padding:24px;color:var(--amis-red);">
        Lỗi tải chi tiết lô hàng: ${err.message}
      </div>`;
  }
}

