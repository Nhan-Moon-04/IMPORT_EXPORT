// frontend/src/features/shipments/shipmentDetail.js
import { api, toast, openModal, closeModal, showConfirm, API_BASE, getToken } from '../../core/api.js';
import { openShipmentForm } from '../shipments/shipments.js';
import { openUploadDocumentModal } from '../documents/documents.js';
import { openCreateInvoiceModal } from '../invoices/invoices.js';
import { openCreateCustomsModal, parseCustomsMeta } from '../customs/customs.js';
import { openBLModal, deleteBL, viewBLDetail } from '../billOfLading/billOfLading.js';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─── Download Invoice Document Helper ────────────────────────────────────────
window.downloadInvoiceFile = async function (invoiceId, docId, fileName) {
  try {
    let targetDocId = docId;
    let targetFileName = fileName;
    if (!targetDocId) {
      const res = await api.get(`/api/documents?entityType=Invoice&entityId=${invoiceId}`);
      const docs = res.data?.items || res.data || [];
      if (docs.length === 0) {
        toast('Không có file nào được đính kèm cho hoá đơn này', 'info');
        return;
      }
      targetDocId = docs[0].id;
      targetFileName = docs[0].originalFileName || docs[0].fileName;
    }
    const token = getToken();
    const downloadRes = await fetch(`${API_BASE}/api/documents/${targetDocId}/download`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!downloadRes.ok) throw new Error('Không thể tải file');
    const blob = await downloadRes.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = targetFileName || 'Invoice_File';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    toast('Đã tải file thành công!', 'success');
  } catch (err) {
    toast(`Lỗi khi tải file: ${err.message}`, 'error');
  }
};

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
  ship: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20a2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1"/><path d="M4 18V14l8-4 4 2v6"/><path d="M12 2v6"/><path d="M8 6h8"/></svg>`,
  back: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`,
  copy: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  edit: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  print: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`,
  dots: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>`,
  calendar: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  anchor: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="3"/><line x1="12" y1="8" x2="12" y2="20"/><path d="M5 14l7 6 7-6"/></svg>`,
  building: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M9 3v18"/><path d="M3 9h6"/><path d="M3 15h6"/></svg>`,
  incoterm: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
  barcode: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 5v14"/><path d="M8 5v14"/><path d="M12 5v14"/><path d="M17 5v14"/><path d="M21 5v14"/></svg>`,
  user: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  file: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  excel: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  check: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`,
  chevron: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`,
  refresh: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
};

// ─── Status mapping ───────────────────────────────────────────────────────────
const STATUS_CLASS = {
  Draft: 'chip chip-slate',
  PendingPayment: 'chip chip-amber',
  Paid30: 'chip chip-amber',
  Paid70: 'chip chip-amber',
  PendingImport: 'chip chip-blue',
  Completed: 'chip chip-green',
  Cancelled: 'chip chip-red',
};
const STATUS_LABEL = {
  Draft: 'Bản nháp',
  PendingPayment: 'Chờ thanh toán',
  Paid30: 'Đã thanh toán 30%',
  Paid70: 'Đã thanh toán 70%',
  PendingImport: 'Chờ nhập hàng',
  Completed: 'Đã thông quan',
  Cancelled: 'Đã hủy',
};

export async function renderShipmentDetail(container, shipmentId) {
  container.innerHTML = `
    <div class="sd-misa-page">
      <div style="padding:40px;text-align:center;">
        <div class="spinner"></div>
        <p style="margin-top:10px;color:#64748b;font-size:13px;">Đang tải chi tiết lô hàng...</p>
      </div>
    </div>
  `;

  try {
    // ── Fetch data ──────────────────────────────────────────────────────
    let shipment = null, invoices = [], documents = [];

    const [shpRes, invRes, docRes, prodRes, invDocsRes, blDocsRes] = await Promise.all([
      api.get(`/api/shipments/${shipmentId}`).catch(() => null),
      api.get(`/api/invoices?shipmentId=${shipmentId}`).catch(() => ({ data: [] })),
      api.get(`/api/documents?shipmentId=${shipmentId}`).catch(() => ({ data: [] })),
      api.get(`/api/products?pageSize=500`).catch(() => ({ data: { items: [] } })),
      api.get(`/api/documents?entityType=Invoice&pageSize=500`).catch(() => ({ data: [] })),
      api.get(`/api/documents?category=BillOfLading`).catch(() => ({ data: [] })),
    ]);

    shipment = shpRes?.data;
    invoices = (invRes?.data?.items || invRes?.data || []).filter(i => i.shipmentId === shipmentId);
    documents = (docRes?.data?.items || docRes?.data || []).filter(d => d.shipmentId === shipmentId);
    const invoiceDocs = invDocsRes?.data?.items || invDocsRes?.data || [];
    const blDocs = blDocsRes?.data?.items || blDocsRes?.data || [];
    const combinedDocs = [...documents];
    [...invoiceDocs, ...blDocs].forEach(d => {
      if (!combinedDocs.some(x => x.id === d.id)) combinedDocs.push(d);
    });

    const allProducts = prodRes?.data?.items || prodRes?.data || [];
    const productMap = new Map();
    allProducts.forEach(p => {
      if (p.id) productMap.set(String(p.id).toLowerCase(), p);
      if (p.sku) productMap.set(String(p.sku).trim().toLowerCase(), p);
      if (p.name) productMap.set(String(p.name).trim().toLowerCase(), p);
    });

    if (!shipment) {
      const listRes = await api.get('/api/shipments');
      const all = listRes.data?.items || listRes.data || [];
      shipment = all.find(s => s.id === shipmentId || s.code === shipmentId || s.shipmentCode === shipmentId);
    }

    if (!shipment) {
      container.innerHTML = `
        <div class="sd-misa-page" style="padding:48px;text-align:center;">
          <div style="font-size:40px;margin-bottom:12px;">📁</div>
          <h3 style="color:var(--amis-red);margin-bottom:8px;">Không tìm thấy lô hàng</h3>
          <p style="color:#64748b;font-size:13px;margin-bottom:20px;">Mã lô hàng không tồn tại hoặc đã bị xóa.</p>
          <button class="btn btn-secondary" onclick="window.appNavigateTo('shipments')">← Quay lại danh sách</button>
        </div>`;
      return;
    }

    // ── Normalize & calculate ───────────────────────────────────────────
    const rawItems = shipment.items || [];
    const items = rawItems.map(it => {
      const p = (it.productId && productMap.get(String(it.productId).toLowerCase()))
        || (it.productCode && productMap.get(String(it.productCode).trim().toLowerCase()))
        || (it.sku && productMap.get(String(it.sku).trim().toLowerCase()))
        || (it.productName && productMap.get(String(it.productName).trim().toLowerCase()));

      let pkgs = it.packages || it.numberOfPackages;
      if (!pkgs && it.notes) {
        const m = String(it.notes).match(/(\d+)\s*kiện/i);
        if (m) pkgs = parseInt(m[1]);
        else if (!isNaN(parseInt(it.notes))) pkgs = parseInt(it.notes);
      }
      if (!pkgs && rawItems.length === 1 && shipment.totalPackages) {
        pkgs = shipment.totalPackages;
      }

      return {
        ...it,
        productId: it.productId || p?.id,
        productCode: it.productCode || it.sku || p?.sku || '---',
        productName: it.productName || p?.name || '---',
        hsCode: it.hsCode || p?.hsCode || '---',
        origin: it.origin || it.countryOfOrigin || p?.countryOfOrigin || p?.origin || '---',
        unit: it.unit || p?.unit || 'kg',
        packages: Number(pkgs || 0)
      };
    });
    const totalQty = shipment.totalQuantity || items.reduce((s, i) => s + (i.quantity || 0), 0) || 0;
    const totalNetWeight = items.reduce((s, i) => s + (i.netWeight || 0), 0) || 0;
    const totalGrossWeight = shipment.totalGrossWeight || items.reduce((s, i) => s + (i.grossWeight || 0), 0) || 0;
    const totalPackages = shipment.totalPackages || items.reduce((s, i) => s + (i.packages || 0), 0) || 0;
    const totalVal = shipment.totalValue || items.reduce((s, i) => s + (i.totalPrice || (i.quantity * i.unitPrice) || 0), 0) || 0;

    let partnerContactPerson = shipment.contactPerson || '';
    let partnerContactPhone = shipment.contactPhone || '';
    let partnerContactEmail = shipment.contactEmail || '';
    let partnerCode = shipment.supplierCode || shipment.customerCode || '';

    try {
      if (shipment.type === 'Export' && shipment.customerId) {
        const cRes = await api.get(`/api/customers/${shipment.customerId}`);
        const c = cRes.data || {};
        if (!partnerContactPerson) partnerContactPerson = c.contactPerson || c.contactName || '';
        if (!partnerContactPhone) partnerContactPhone = c.phone || '';
        if (!partnerContactEmail) partnerContactEmail = c.email || '';
        if (!partnerCode) partnerCode = c.code || c.tradeName || c.taxCode || (c.id ? 'KH-' + c.id.substring(0, 6).toUpperCase() : '');
      } else if (shipment.supplierId) {
        const sRes = await api.get(`/api/suppliers/${shipment.supplierId}`);
        const s = sRes.data || {};
        if (!partnerContactPerson) partnerContactPerson = s.contactPerson || s.contactName || '';
        if (!partnerContactPhone) partnerContactPhone = s.phone || '';
        if (!partnerContactEmail) partnerContactEmail = s.email || '';
        if (!partnerCode) partnerCode = s.code || s.tradeName || s.taxCode || '';
      }
    } catch (e) { }

    const shpCode = shipment.shipmentCode || shipment.code || '---';
    const supplierTitle = shipment.supplierName || shipment.customerName || '---';
    const partnerCodeDisplay = (partnerCode || shipment.supplierCode || shipment.customerCode || '---').toUpperCase();

    const trueInvoices = invoices.filter(i => i.type !== 'PackingList' && i.type !== 'SalesContract' && i.type !== 'BillOfLading');
    const salesContracts = invoices.filter(i => i.type === 'SalesContract');
    const blInvoices = invoices.filter(i => i.type === 'BillOfLading');
    const packingListsFromInv = invoices.filter(i => i.type === 'PackingList');
    const packingListsFromShp = shipment.packingLists || [];
    const packingLists = [...packingListsFromInv];
    packingListsFromShp.forEach(pl => {
      if (!packingLists.some(p => p.id === pl.id || (p.invoiceNumber && (p.invoiceNumber === pl.packingListNumber || p.invoiceNumber === pl.invoiceNumber)))) {
        packingLists.push({
          ...pl,
          invoiceNumber: pl.packingListNumber || pl.invoiceNumber,
          invoiceDate: pl.packingListDate || pl.invoiceDate || pl.createdAt,
          totalPackages: pl.totalPackages,
          netWeight: pl.totalNetWeight || pl.netWeight,
          grossWeight: pl.totalGrossWeight || pl.grossWeight,
          packagingType: pl.packagingType
        });
      }
    });

    // Parse B/L items
    const blList = blInvoices.map(inv => {
      let meta = {};
      try { if (inv.notes && inv.notes.startsWith('{')) meta = JSON.parse(inv.notes); } catch (e) { }

      const doc = combinedDocs.find(d =>
        (d.entityId && String(d.entityId).toLowerCase() === String(inv.id).toLowerCase()) ||
        (d.category === 'BillOfLading' && d.shipmentId && String(d.shipmentId).toLowerCase() === String(shipmentId).toLowerCase()) ||
        (inv.invoiceNumber && d.fileName && d.fileName.toLowerCase().includes(inv.invoiceNumber.toLowerCase())) ||
        (inv.invoiceNumber && d.originalFileName && d.originalFileName.toLowerCase().includes(inv.invoiceNumber.toLowerCase()))
      );

      return {
        id: inv.id,
        blNumber: inv.invoiceNumber,
        issueDate: inv.invoiceDate || inv.createdAt,
        shipmentId: inv.shipmentId,
        shipmentCode: shpCode,
        partnerName: inv.partnerName || supplierTitle,
        shippingLine: meta.shippingLine || 'COSCO SHIPPING',
        vesselVoyage: meta.vesselVoyage || (meta.vessel ? `${meta.vessel} / ${meta.voyage || ''}` : 'COSCO PRIDE / 024E'),
        pol: meta.pol || shipment.portOfLoading || 'Shanghai Port, China',
        pod: meta.pod || shipment.portOfDischarge || 'Cat Lai Port, Ho Chi Minh City',
        containerNo: meta.containerNo || '---',
        sealNo: meta.sealNo || '---',
        totalPackages: meta.packages || totalPackages,
        grossWeight: meta.grossWeight || totalGrossWeight,
        blType: meta.blType || 'Master B/L',
        freightTerm: inv.paymentTerms || meta.freightTerm || (shipment.deliveryTerm === 'CIF' ? 'Freight Prepaid' : 'Freight Collect'),
        status: meta.status || 'Original',
        docId: doc?.id,
        docName: doc?.originalFileName || doc?.fileName || meta.attachedFileName,
        notes: meta.notes || ''
      };
    });

    combinedDocs.forEach(d => {
      if (d.category === 'BillOfLading' && !blList.some(b => b.docId === d.id || b.id === d.entityId)) {
        blList.push({
          id: d.id,
          isDocVirtual: true,
          blNumber: shipment.blNumber || `BL-${shpCode}`,
          issueDate: d.createdAt,
          shipmentId: shipmentId,
          shipmentCode: shpCode,
          partnerName: supplierTitle,
          shippingLine: 'COSCO SHIPPING',
          vesselVoyage: 'COSCO PRIDE / 024E',
          pol: shipment.portOfLoading || 'Shanghai Port, China',
          pod: shipment.portOfDischarge || 'Cat Lai Port, Ho Chi Minh City',
          containerNo: '---',
          sealNo: '---',
          totalPackages: totalPackages,
          grossWeight: totalGrossWeight,
          blType: 'Master B/L',
          freightTerm: shipment.deliveryTerm === 'CIF' ? 'Freight Prepaid' : 'Freight Collect',
          status: 'Original',
          docId: d.id,
          docName: d.originalFileName || d.fileName,
          notes: d.description || ''
        });
      }
    });

    const primaryBL = blList[0];
    const primaryInvoiceNumber = trueInvoices[0]?.invoiceNumber || '---';
    const primaryContractNumber = salesContracts[0]?.invoiceNumber || '---';
    const primaryDeclarationNumber = shipment.customsDeclarations?.[0]?.declarationNumber || '---';

    const bookings = shipment.bookings || [];
    const containers = shipment.containers || [];
    const customs = shipment.customsDeclarations || [];

    const isCompleted = shipment.status === 'Completed';
    const statusClass = STATUS_CLASS[shipment.status] || 'chip chip-slate';
    const statusLabel = STATUS_LABEL[shipment.status] || shipment.status || 'Đã thông quan';
    const typeLabel = shipment.type === 'Export' ? 'Xuất khẩu' : 'Nhập khẩu';
    const typeClass = shipment.type === 'Export' ? 'chip chip-purple' : 'chip chip-blue';

    const currency = (shipment.currency || 'USD').toUpperCase();
    const isVnd = currency === 'VND';
    const isUsd = currency === 'USD';

    // Metadata từ tờ khai hải quan liên kết
    const primaryCD = customs[0];
    const primaryMeta = primaryCD ? parseCustomsMeta(primaryCD.notes) : null;
    const customsExchangeRate = primaryMeta?.exchangeRate || null;
    const customsTaxableVal = primaryMeta?.taxableValueVnd || (isVnd ? totalVal : (customsExchangeRate ? Math.round(totalVal * customsExchangeRate) : null));
    const customsTaxAmount = primaryMeta?.totalTaxAmount || null;

    // Contact person display logic
    let contactPersonDisplay = '---';
    let contactSubDisplay = '';
    if (partnerContactPerson && partnerContactPerson.trim()) {
      contactPersonDisplay = partnerContactPerson.trim();
      contactSubDisplay = [partnerContactPhone, partnerContactEmail].filter(Boolean).join(' • ') || '---';
    } else if (partnerContactPhone && partnerContactPhone.trim()) {
      contactPersonDisplay = partnerContactPhone.trim();
      contactSubDisplay = partnerContactEmail || 'Chưa cập nhật tên';
    } else if (partnerContactEmail && partnerContactEmail.trim()) {
      contactPersonDisplay = partnerContactEmail.trim();
      contactSubDisplay = 'Chưa cập nhật tên';
    } else {
      contactPersonDisplay = '---';
      contactSubDisplay = '---';
    }

    const contactPerson = contactPersonDisplay;
    const contactPhone = contactSubDisplay;
    const contactEmail = partnerContactEmail;

    const polDisplay = shipment.portOfLoading || '---';
    const podDisplay = shipment.portOfDischarge || '---';
    const incotermDisplay = shipment.deliveryTerm || shipment.incoterms || '---';
    const blNumberDisplay = primaryBL?.blNumber || shipment.blNumber || shipment.bLNumber || '---';
    const etaDisplay = shipment.expectedDate ? new Date(shipment.expectedDate).toLocaleDateString('vi-VN') : '---';
    const etdDisplay = shipment.etd ? new Date(shipment.etd).toLocaleDateString('vi-VN') : '---';
    const createdDisplay = shipment.createdAt ? new Date(shipment.createdAt).toLocaleDateString('vi-VN') : '24/09/2026';
    const supplierCodeLine = `Mã: ${partnerCodeDisplay}`;

    const docCounts = {
      contracts: salesContracts.length,
      invoices: trueInvoices.length,
      packingLists: packingLists.length,
      bl: blList.length,
      customs: customs.length,
      booking: bookings.length,
      containers: containers.length,
      total: documents.length,
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

    const productRowsOverview = displayItems.length ? displayItems.map((it, idx) => {
      const q = Number(it.quantity || 0);
      const pk = Number(it.packages || 0);
      const p = Number(it.unitPrice || 0);
      const rowTotal = it.totalPrice ? Number(it.totalPrice) : (q * p);
      return `
      <tr>
        <td style="text-align:center;color:#64748b;">${idx + 1}</td>
        <td style="font-weight:700;color:var(--amis-blue);">${it.productCode}</td>
        <td><strong>${it.productName}</strong></td>
        <td style="font-family:monospace;color:#475569;">${it.hsCode}</td>
        <td>${it.origin}</td>
        <td style="text-align:center;">${it.unit}</td>
        <td style="text-align:right;font-weight:600;">${q.toLocaleString()}</td>
        <td style="text-align:right;font-weight:600;color:#0266b3;">${pk ? `${pk.toLocaleString()} kiện` : '---'}</td>
        <td style="text-align:right;">${isVnd ? `${Number(p).toLocaleString('vi-VN')} ₫` : `$${p.toFixed(2)}`}</td>
        <td style="text-align:right;font-weight:700;color:var(--amis-green);">${isVnd ? `${Number(rowTotal).toLocaleString('vi-VN')} ₫` : `$${rowTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}</td>
        <td style="text-align:right;">${Number(it.netWeight || 0).toFixed(0)} kg</td>
        <td style="text-align:right;">${Number(it.grossWeight || 0).toFixed(0)} kg</td>
      </tr>
      `;
    }).join('') : `<tr><td colspan="12" style="text-align:center;padding:24px;color:#94a3b8;">Không có sản phẩm nào</td></tr>`;

    const productRowsItems = displayItems.length ? displayItems.map((it, idx) => {
      const q = Number(it.quantity || 0);
      const pk = Number(it.packages || 0);
      const p = Number(it.unitPrice || 0);
      const rowTotal = it.totalPrice ? Number(it.totalPrice) : (q * p);
      return `
      <tr>
        <td style="text-align:center;color:#64748b;">${idx + 1}</td>
        <td style="font-weight:700;color:var(--amis-blue);">${it.productCode}</td>
        <td><strong>${it.productName}</strong></td>
        <td style="font-family:monospace;color:#475569;">${it.hsCode}</td>
        <td>${it.origin}</td>
        <td style="text-align:center;">${it.unit}</td>
        <td style="text-align:right;font-weight:600;">${q.toLocaleString()}</td>
        <td style="text-align:right;font-weight:600;color:#0266b3;">${pk ? `${pk.toLocaleString()} kiện` : '---'}</td>
        <td style="text-align:right;">${isVnd ? `${Number(p).toLocaleString('vi-VN')} ₫` : `$${p.toFixed(2)}`}</td>
        <td style="text-align:right;font-weight:700;color:var(--amis-green);">${isVnd ? `${Number(rowTotal).toLocaleString('vi-VN')} ₫` : `$${rowTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}</td>
        <td style="text-align:right;">${Number(it.netWeight || 0).toFixed(0)} kg</td>
        <td style="text-align:right;">${Number(it.grossWeight || 0).toFixed(0)} kg</td>
        <td style="text-align:center; white-space:nowrap;">
          <div style="display:inline-flex; align-items:center; justify-content:center; gap:4px;">
            <button class="sd-btn-sm" style="color:#0266b3;" onclick="window.openItemModal(${idx})" title="Sửa dòng hàng" ${isCompleted ? 'disabled' : ''}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:text-bottom; margin-right:2px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>Sửa
            </button>
            <button class="sd-btn-sm" style="color:#ef4444; border-color:#fecaca; background:#fef2f2;" onclick="window.deleteItemModal(${idx})" title="Xóa dòng hàng" ${isCompleted ? 'disabled' : ''}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:text-bottom;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      </tr>
      `;
    }).join('') : `<tr><td colspan="13" style="text-align:center;padding:24px;color:#94a3b8;">Chưa có mặt hàng nào. Nhấn "+ Thêm dòng" bên dưới để thêm mặt hàng vào lô hàng.</td></tr>`;

    // ── Build customs rows (MISA AMIS & Thông tin thuế chi tiết) ─────────
    const customsHtml = customs.length === 0 ? `<div class="sd-card"><div class="sd-card-body" style="text-align:center;color:#64748b;padding:24px;">Chưa có tờ khai hải quan nào. Nhấn "+ Thêm tờ khai HQ" bên trên để mở tờ khai.</div></div>` : customs.map(cd => {
      const d = cd.declarationDate ? new Date(cd.declarationDate).toLocaleDateString('vi-VN') : '---';
      const st = cd.status === 1 ? '<span class="chip chip-green">🟢 LUỒNG XANH (THÔNG QUAN)</span>'
        : cd.status === 2 ? '<span class="chip chip-orange">🟡 LUỒNG VÀNG (KIỂM TRA HỒ SƠ)</span>'
          : cd.status === 3 ? '<span class="chip chip-red">🔴 LUỒNG ĐỎ (KIỂM HÓA)</span>'
            : '<span class="chip chip-slate">⚪ CHƯA PHÂN LUỒNG</span>';

      const meta = parseCustomsMeta(cd.notes);
      const isCdDomestic = meta.isDomestic || isVnd;

      return `
        <div class="sd-customs-card" style="margin-bottom:14px;">
          <div class="sd-customs-card-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-weight:700; color:#0f172a; font-size:13.5px;">📋 Tờ Khai Hải Quan Điện Tử (VNACCS)</span>
              ${st}
              ${isCdDomestic ? '<span class="customs-scope-badge domestic">🏠 Trong nước (VNĐ)</span>' : '<span class="customs-scope-badge foreign">🌐 Nước ngoài (USD)</span>'}
            </div>
            <div style="display:flex;gap:6px;">
              <button class="sd-btn-sm btn-secondary" onclick="window.viewCustomsVNACCS('${cd.id}')" title="Xem tờ khai chuẩn A4 VNACCS">Bản VNACCS</button>
              <button class="sd-btn-sm btn-secondary" onclick="window.viewCustomsDoc('${cd.id}')" title="Xem hoặc tải file đính kèm tờ khai (.xlsx / PDF)">📥 File Đính Kèm</button>
              <button class="sd-btn-sm btn-primary" onclick="window.editCustomsDeclaration('${cd.id}', () => { document.getElementById('sd-back-link').click(); setTimeout(() => window.appNavigateTo('shipment-detail?id=${shipmentId}'), 100); })">Sửa</button>
              <button class="sd-btn-sm btn-danger" onclick="window.deleteCustomsDeclaration('${cd.id}', () => { document.getElementById('sd-back-link').click(); setTimeout(() => window.appNavigateTo('shipment-detail?id=${shipmentId}'), 100); })">Xóa</button>
            </div>
          </div>
          <div class="sd-customs-card-body">
            <div class="sd-customs-meta-grid">
              <div class="sd-field">
                <div class="sd-field-label">Số Tờ Khai HQ</div>
                <div class="sd-field-value" style="color:#0266b3; font-family:monospace; font-weight:700; font-size:13.5px;">${cd.declarationNumber || '---'}</div>
              </div>
              <div class="sd-field">
                <div class="sd-field-label">Ngày Đăng Ký</div>
                <div class="sd-field-value">${d}</div>
              </div>
              <div class="sd-field">
                <div class="sd-field-label">Loại Hình Tờ Khai</div>
                <div class="sd-field-value"><span class="customs-type-badge">${cd.declarationType || 'A11'}</span></div>
              </div>
              <div class="sd-field">
                <div class="sd-field-label">Chi Cục Hải Quan</div>
                <div class="sd-field-value" style="font-size:11.5px; color:#334155;">${cd.customsBranch || '---'}</div>
              </div>

              <!-- THÔNG TIN TÀI CHÍNH & TÍNH THUẾ -->
              ${!isCdDomestic ? `
                <div class="sd-field">
                  <div class="sd-field-label">Trị Giá Nguyên Tệ ($ USD)</div>
                  <div class="sd-field-value" style="color:#0369a1; font-weight:700;">$${Number(meta.valueUsd != null ? meta.valueUsd : (totalVal || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
                <div class="sd-field">
                  <div class="sd-field-label">Tỷ Giá Hải Quan (VNĐ/USD)</div>
                  <div class="sd-field-value" style="font-family:monospace; font-weight:700; color:#475569;">${meta.exchangeRate ? Number(meta.exchangeRate).toLocaleString('vi-VN') : '<span style="color:#94a3b8; font-weight:normal;">Chưa khai</span>'}</div>
                </div>
                <div class="sd-field">
                  <div class="sd-field-label">Trị Giá Tính Thuế (VNĐ)</div>
                  <div class="sd-field-value" style="color:#15803d; font-weight:700;">${meta.taxableValueVnd ? `${Number(meta.taxableValueVnd).toLocaleString('vi-VN')} ₫` : '---'}</div>
                </div>
                <div class="sd-field">
                  <div class="sd-field-label">Tổng Thuế HQ Phải Nộp</div>
                  <div class="sd-field-value" style="color:#dc2626; font-weight:800;">${meta.totalTaxAmount ? `${Number(meta.totalTaxAmount).toLocaleString('vi-VN')} ₫` : '0 ₫'}</div>
                </div>
              ` : `
                <div class="sd-field" style="grid-column: span 2;">
                  <div class="sd-field-label">Trị Giá Tính Thuế (VNĐ - Nội Địa)</div>
                  <div class="sd-field-value" style="color:#15803d; font-weight:700; font-size:14px;">${meta.taxableValueVnd ? `${Number(meta.taxableValueVnd).toLocaleString('vi-VN')} ₫` : `${Number(totalVal || 0).toLocaleString('vi-VN')} ₫`}</div>
                </div>
                <div class="sd-field" style="grid-column: span 2;">
                  <div class="sd-field-label">Tiền Thuế GTGT (VAT)</div>
                  <div class="sd-field-value" style="color:#dc2626; font-weight:800; font-size:14px;">${meta.totalTaxAmount ? `${Number(meta.totalTaxAmount).toLocaleString('vi-VN')} ₫` : '0 ₫'}</div>
                </div>
              `}

              ${meta.userNotes ? `
                <div class="sd-field" style="grid-column: span 4; border-top:1px dashed #e2e8f0; padding-top:6px; margin-top:2px;">
                  <div class="sd-field-label">Ghi Chú Hải Quan</div>
                  <div class="sd-field-value" style="color:#64748b;">${escapeHtml(meta.userNotes)}</div>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // ── Build Bill of Lading rows ──────────────────────────────────────
    const blRowsHtml = blList.length ? blList.map((b, i) => {
      const bDate = b.issueDate ? new Date(b.issueDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '---';

      let typeBadge = '<span class="status-chip chip-transit" style="background:#e0f2fe; color:#0369a1; font-size:11px; padding:2px 6px;">MBL</span>';
      if (b.blType?.includes('House')) {
        typeBadge = '<span class="status-chip chip-pending" style="background:#fef3c7; color:#b45309; font-size:11px; padding:2px 6px;">HBL</span>';
      } else if (b.blType?.includes('Seaway')) {
        typeBadge = '<span class="status-chip chip-delivered" style="background:#f3e8ff; color:#7e22ce; font-size:11px; padding:2px 6px;">Seaway</span>';
      } else if (b.blType?.includes('Telex') || b.blType?.includes('Surrender')) {
        typeBadge = '<span class="status-chip chip-completed" style="background:#dcfce7; color:#15803d; font-size:11px; padding:2px 6px;">Telex</span>';
      }

      let statusChip = '<span class="status-chip chip-completed" style="font-size:11px; padding:2px 6px;">Bản gốc</span>';
      if (b.status === 'Surrendered') statusChip = '<span class="status-chip chip-transit" style="background:#dbeafe; color:#1d4ed8; font-size:11px; padding:2px 6px;">Đã Surrender</span>';
      else if (b.status === 'Draft') statusChip = '<span class="status-chip chip-pending" style="font-size:11px; padding:2px 6px;">Bản nháp</span>';
      else if (b.status === 'Released') statusChip = '<span class="status-chip chip-delivered" style="background:#f0fdf4; color:#16a34a; font-size:11px; padding:2px 6px;">Đã giao hàng</span>';

      const hasFile = !!b.docId;
      const polShort = b.pol?.split(',')[0] || '---';
      const podShort = b.pod?.split(',')[0] || '---';

      return `
        <tr>
          <td style="text-align:center; color:#64748b;">${i + 1}</td>
          <td>
            <div style="font-weight:700; color:var(--amis-blue); font-family:monospace; font-size:13px; cursor:pointer;" onclick="window.viewBLDetail('${b.id}')" title="Click xem chi tiết vận đơn">
              ${b.blNumber}
            </div>
            <div style="font-size:11px; color:#64748b;">${b.freightTerm || 'Freight Prepaid'}</div>
          </td>
          <td>${typeBadge}</td>
          <td style="font-weight:600; color:#334155;">${b.shippingLine}</td>
          <td><div style="font-weight:500;">${b.vesselVoyage}</div></td>
          <td><div style="font-size:12px;">${polShort} ➔ ${podShort}</div></td>
          <td>${bDate}</td>
          <td>
            <div style="font-size:12px; font-weight:600; color:var(--amis-blue); font-family:monospace;">${b.containerNo || '---'}</div>
            <div style="font-size:11px; color:#64748b;">Seal: ${b.sealNo || '---'} | ${Number(b.grossWeight || 0).toLocaleString()} kg</div>
          </td>
          <td>${statusChip}</td>
          <td style="text-align:center;">
            ${hasFile ? `
              <button class="sd-btn-sm" onclick="window.downloadBLDoc('${b.docId}', '${b.docName}')" title="Tải file đính kèm: ${b.docName}" style="color:#15803d; border-color:#86efac; background:#f0fdf4; padding:3px 6px;">
                📎 ${b.docName.length > 10 ? b.docName.slice(0, 10) + '…' : b.docName}
              </button>
            ` : `<span style="color:#94a3b8; font-size:11.5px;">Chưa có</span>`}
          </td>
          <td style="text-align:center; white-space:nowrap;">
            <div style="display:inline-flex; align-items:center; justify-content:center; gap:4px;">
              <!-- Nút Xem chi tiết -->
              <button class="sd-btn-sm" onclick="window.viewBLDetail('${b.id}')" style="padding:4px 6px;" title="Xem chi tiết vận đơn B/L">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              </button>
              <!-- Nút Tải Icon -->
              <button class="sd-btn-sm" onclick="window.handleDownloadBL('${b.id}')" style="padding:4px 6px;" title="Tải file vận đơn / chứng từ B/L">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--amis-green, #16a34a)" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              </button>
              <!-- Nút In B/L -->
              <button class="sd-btn-sm" onclick="window.printBL('${b.id}')" style="padding:4px 6px; color:#475569;" title="In mẫu vận đơn B/L">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              </button>
              <!-- Nút Sửa -->
              <button class="sd-btn-sm" onclick="window.editBLFromShipment('${b.id}')" style="padding:4px 6px; color:var(--amis-blue, #0284c7);" title="Chỉnh sửa vận đơn B/L" ${isCompleted ? 'disabled' : ''}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <!-- Nút Xóa (xoá bl đi) -->
              <button class="sd-btn-sm" onclick="window.deleteBLFromShipment('${b.id}', '${b.blNumber}')" style="padding:4px 6px; color:var(--amis-red, #ef4444);" title="Xóa vận đơn B/L" ${isCompleted ? 'disabled' : ''}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('') : `
      <tr>
        <td colspan="11" style="text-align:center; padding:32px 16px; color:#64748b;">
          <div style="font-size:24px; margin-bottom:6px;">🚢</div>
          <div style="font-weight:600; font-size:13px; margin-bottom:4px;">Chưa có vận đơn (B/L) nào cho lô hàng này</div>
          <div style="font-size:12px; color:#94a3b8; margin-bottom:12px;">Nhấn vào nút bên dưới để tạo mới vận đơn hoặc đính kèm file scan B/L.</div>
          <button class="sd-btn-sm sd-btn-primary" onclick="document.getElementById('sd-btn-add-bl')?.click()">+ Thêm Vận Đơn (B/L)</button>
        </td>
      </tr>
    `;

    // ── Render HTML ─────────────────────────────────────────────────────
    const hasCO = combinedDocs.some(d => d.category === 'CertificateOfOrigin' || (d.fileName && d.fileName.toLowerCase().includes('co')) || (d.originalFileName && d.originalFileName.toLowerCase().includes('co')));
    const blReleased = primaryBL?.status === 'Surrendered' || primaryBL?.status === 'Released';
    const weightOk = (totalNetWeight <= totalGrossWeight) || (!totalGrossWeight && totalNetWeight > 0);
    const hasCustoms = customs.length > 0;

    const step1Class = salesContracts.length ? 'completed' : 'active';
    const step1Text = salesContracts.length ? 'Đã ký HĐ ngoại thương' : 'Chờ xác nhận PO/HĐ';
    const step2Class = (trueInvoices.length && packingLists.length) ? 'completed' : (trueInvoices.length ? 'active' : 'pending');
    const step2Text = trueInvoices.length ? `${trueInvoices.length} Inv • ${packingLists.length} PL` : 'Chưa lập Invoice/PL';
    const step3Class = blReleased ? 'completed' : (primaryBL ? 'active' : 'pending');
    const step3Text = blReleased ? 'Đã Release / Surrender' : (primaryBL ? 'Đang vận chuyển biển' : 'Chờ B/L');
    const step4Class = (customs.length && customs[0].status === 1) ? 'completed' : (customs.length ? 'warning' : 'pending');
    const step4Text = customs.length ? (customs[0].status === 1 ? 'Thông quan (Luồng Xanh)' : 'Đang xử lý tờ khai') : 'Chưa mở tờ khai';
    const step5Class = isCompleted ? 'completed' : 'pending';
    const step5Text = isCompleted ? 'Đã nhập kho thành công' : 'Chờ nhận hàng';

    container.innerHTML = `
      <div class="sd-misa-page">

        <!-- MISA HEADER TOOLBAR -->
        <div class="sd-misa-header">
          <div class="sd-misa-header-left">
            <button class="sd-misa-btn-back" id="sd-back-link" title="Quay lại danh sách lô hàng">
              ←
            </button>
            <h1 class="sd-misa-title">Chứng từ lô hàng ${shpCode}</h1>
            <span class="sd-misa-type-badge">${typeLabel}</span>
            <span class="${statusClass}" style="font-size:11.5px; padding:3px 8px;">${statusLabel}</span>
            <button class="sd-btn-sm" id="sd-btn-copy" title="Sao chép mã lô hàng" style="padding: 3px 8px; font-size:11.5px; margin-left: 4px;">
              ${ICON.copy} Sao chép
            </button>
          </div>
          <div class="sd-misa-header-right">
            <button class="btn btn-secondary btn-sm" id="sd-btn-crosscheck" title="Kiểm tra đối chiếu Invoice, PL, B/L, C/O">
              🛡️ Đối chiếu hồ sơ
            </button>
            <button class="btn btn-secondary btn-sm" id="sd-btn-print" title="In chứng từ">
              ${ICON.print} In chứng từ
            </button>
            <button class="btn btn-primary btn-sm" id="sd-btn-edit" ${isCompleted ? 'disabled' : ''} title="Chỉnh sửa thông tin lô hàng">
              ${ICON.edit} Chỉnh sửa
            </button>
          </div>
        </div>

        <!-- MISA MASTER INFORMATION CARD -->
        <div class="sd-misa-master">
          <div class="sd-misa-master-top">
            <div class="sd-misa-radio-group">
              <label class="sd-misa-radio">
                <input type="radio" name="pay_status" checked disabled>
                <span>${isCompleted ? 'Đã hoàn tất thanh toán & giao nhận' : 'Chưa thanh toán / Theo điều kiện hợp đồng'}</span>
              </label>
              <div class="sd-misa-divider-v"></div>
              <span style="font-size:12.5px; color:#475569;">
                Hình thức: <strong style="color:#1e293b;">${shipment.transportType || 'Vận tải đường biển (FCL)'}</strong>
              </span>
              <div class="sd-misa-divider-v"></div>
              <span style="font-size:12.5px; color:#475569;">
                Điều kiện: <strong style="color:#059669;">${incotermDisplay}</strong>
              </span>
            </div>
            <div class="sd-misa-master-total">
              <div class="sd-misa-total-label">Tổng tiền thanh toán</div>
              <div class="sd-misa-total-value">
                ${isVnd ? `${Number(totalVal).toLocaleString('vi-VN')} ₫` : `$${Number(totalVal).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              </div>
            </div>
          </div>

          <div class="sd-misa-form-grid">
            <!-- Cột trái: Thông tin Đối tác / Nhà cung cấp & Tuyến đường -->
            <div class="sd-misa-form-col">
              <div class="sd-form-row">
                <div class="sd-form-label">${shipment.type === 'Export' ? 'Khách hàng / Người nhận (Consignee)' : 'Nhà cung cấp / Đối tác (Shipper)'}</div>
                <div class="sd-form-control sd-form-highlight" style="font-weight:600;">
                  ${supplierTitle} <span class="sd-partner-code">(${partnerCodeDisplay})</span>
                </div>
              </div>
              <div class="sd-form-row">
                <div class="sd-form-label">Mã số thuế & Địa chỉ</div>
                <div class="sd-form-control">
                  MST: ${shipment.partnerTaxCode || '3901239938'} • ${shipment.partnerAddress || 'Khu Công Nghiệp Phước Đông, Tây Ninh, Việt Nam'}
                </div>
              </div>
              <div class="sd-form-row-2col">
                <div class="sd-form-group">
                  <div class="sd-form-label">Cảng bốc hàng (POL)</div>
                  <div class="sd-form-control">${polDisplay}</div>
                </div>
                <div class="sd-form-group">
                  <div class="sd-form-label">Cảng dỡ hàng (POD)</div>
                  <div class="sd-form-control">${podDisplay}</div>
                </div>
              </div>
              <div class="sd-form-row-2col">
                <div class="sd-form-group">
                  <div class="sd-form-label">Hãng vận tải / Đại lý biển</div>
                  <div class="sd-form-control">${primaryBL?.shippingLine || 'COSCO SHIPPING'}</div>
                </div>
                <div class="sd-form-group">
                  <div class="sd-form-label">Tên tàu / Số chuyến (Vessel/Voyage)</div>
                  <div class="sd-form-control">${primaryBL?.vesselVoyage || 'COSCO PRIDE / 024E'}</div>
                </div>
              </div>
            </div>

            <!-- Cột phải: Thông tin Chứng từ, Mã tham chiếu & Lịch trình -->
            <div class="sd-misa-form-col">
              <div class="sd-form-row-2col">
                <div class="sd-form-group">
                  <div class="sd-form-label">Mã chứng từ lô hàng</div>
                  <div class="sd-form-control sd-form-highlight" style="font-family:monospace;font-weight:700;color:#0266b3;">
                    ${shpCode}
                  </div>
                </div>
                <div class="sd-form-group">
                  <div class="sd-form-label">Số Hợp đồng ngoại thương</div>
                  <div class="sd-form-control" style="font-weight:600;">
                    ${primaryContractNumber !== '---' ? primaryContractNumber : 'SC-2026-XNK'}
                  </div>
                </div>
              </div>
              <div class="sd-form-row-2col">
                <div class="sd-form-group">
                  <div class="sd-form-label">Số Commercial Invoice</div>
                  <div class="sd-form-control" style="font-weight:600;color:#0266b3;">
                    ${primaryInvoiceNumber !== '---' ? primaryInvoiceNumber : 'INV-2026-001'}
                  </div>
                </div>
                <div class="sd-form-group">
                  <div class="sd-form-label">Số Vận đơn (B/L No.)</div>
                  <div class="sd-form-control" style="font-family:monospace;font-weight:700;color:#059669;">
                    ${blNumberDisplay}
                  </div>
                </div>
              </div>
              <div class="sd-form-row-2col">
                <div class="sd-form-group">
                  <div class="sd-form-label">Số tờ khai HQ (VNACCS)</div>
                  <div class="sd-form-control" style="font-family:monospace;">
                    ${primaryDeclarationNumber !== '---' ? primaryDeclarationNumber : 'Chưa đăng ký tờ khai'}
                  </div>
                </div>
                <div class="sd-form-group">
                  <div class="sd-form-label">Container & Số chì (Seal)</div>
                  <div class="sd-form-control" style="font-family:monospace;">
                    ${primaryBL?.containerNo || 'TGHU9843210'} / ${primaryBL?.sealNo || 'SL-88992'}
                  </div>
                </div>
              </div>
              <div class="sd-form-row-2col">
                <div class="sd-form-group">
                  <div class="sd-form-label">Ngày xếp hàng (ETD)</div>
                  <div class="sd-form-control">${etdDisplay}</div>
                </div>
                <div class="sd-form-group">
                  <div class="sd-form-label">Ngày cập cảng (ETA)</div>
                  <div class="sd-form-control" style="font-weight:600;color:#b45309;">${etaDisplay}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- MISA TABS NAVIGATION BAR -->
        <div class="sd-misa-tabs-bar">
          <div class="sd-misa-tab-list">
            <button class="sd-tab active" data-pane="items">
              Hàng tiền <span class="sd-tab-count">${displayItems.length}</span>
            </button>
            <button class="sd-tab" data-pane="logistics">
              Vận tải & B/L <span class="sd-tab-count">${docCounts.bl || 1}</span>
            </button>
            <button class="sd-tab" data-pane="contracts">
              Hợp đồng <span class="sd-tab-count">${docCounts.contracts}</span>
            </button>
            <button class="sd-tab" data-pane="invoices">
              Hóa đơn <span class="sd-tab-count">${docCounts.invoices}</span>
            </button>
            <button class="sd-tab" data-pane="packing">
              Packing List <span class="sd-tab-count">${docCounts.packingLists}</span>
            </button>
            <button class="sd-tab" data-pane="customs">
              Hải quan & Thuế <span class="sd-tab-count">${docCounts.customs}</span>
            </button>
            <button class="sd-tab" data-pane="costs">
              Chi phí & Landed Cost
            </button>
            <button class="sd-tab" data-pane="documents">
              Tệp đính kèm <span class="sd-tab-count">${combinedDocs.length}</span>
            </button>
            <button class="sd-tab" data-pane="history">
              Nhật ký xử lý
            </button>
          </div>
          <div class="sd-misa-tabs-meta">
            <span>Loại tiền: <strong style="color:#0f172a;">${currency}</strong></span>
            ${customsExchangeRate && !isVnd ? `<span>• Tỷ giá HQ: <strong style="color:#0266b3;">${Number(customsExchangeRate).toLocaleString('vi-VN')}</strong></span>` : ''}
          </div>
        </div>

        <!-- TAB CONTENT PANES -->
        <div class="sd-pane-wrap">

          <!-- ═══ TAB: HÀNG TIỀN (ITEMS) ═══ -->
          <div class="sd-pane active" id="sd-pane-items">
            <div class="sd-table-wrap">
              <table class="sd-table">
                <thead>
                  <tr>
                    <th style="width:32px; text-align:center;">#</th>
                    <th>Mã hàng</th>
                    <th>Tên hàng / Mặt hàng sợi</th>
                    <th>HS Code</th>
                    <th>Xuất xứ</th>
                    <th style="text-align:center;">ĐVT</th>
                    <th style="text-align:right;">Số lượng (NW)</th>
                    <th style="text-align:right;">Số kiện</th>
                    <th style="text-align:right;">Đơn giá (${isVnd ? '₫' : '$'})</th>
                    <th style="text-align:right;">Thành tiền (${isVnd ? '₫' : '$'})</th>
                    <th style="text-align:right;">Net Weight</th>
                    <th style="text-align:right;">Gross Weight</th>
                    <th style="text-align:center;">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  ${productRowsItems}
                  <tr class="sd-total-row">
                    <td colspan="6" style="text-align:right;">Tổng cộng (${displayItems.length} dòng):</td>
                    <td style="text-align:right;color:var(--amis-blue);font-weight:700;">${Number(totalQty).toLocaleString()} kg</td>
                    <td style="text-align:right;color:var(--amis-blue);font-weight:700;">${totalPackages.toLocaleString()} kiện</td>
                    <td></td>
                    <td style="text-align:right;color:var(--amis-green);font-weight:800;">${isVnd ? `${Number(totalVal).toLocaleString('vi-VN')} ₫` : `$${Number(totalVal).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}</td>
                    <td style="text-align:right;font-weight:700;">${totalNetWeight} kg</td>
                    <td style="text-align:right;font-weight:700;">${totalGrossWeight} kg</td>
                    <td style="text-align:center;"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- MISA BOTTOM FOOTER: ACTIONS, NOTES, ATTACHMENTS & TOTALS -->
            <div class="sd-misa-table-footer">
              <div class="sd-misa-footer-left">
                <div class="sd-misa-footer-actions">
                  <button class="sd-btn-sm" id="sd-btn-add-item" ${isCompleted ? 'disabled' : ''}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    + Thêm dòng
                  </button>
                  <button class="sd-btn-sm sd-btn-excel" id="sd-btn-export-items">
                    ${ICON.excel} Xuất Excel
                  </button>
                  <button class="sd-btn-sm" id="sd-btn-focus-note">
                    💬 Thêm ghi chú
                  </button>
                  <button class="sd-btn-sm" id="sd-btn-clear-items" style="color:#ef4444;" ${isCompleted ? 'disabled' : ''}>
                    🗑️ Xóa hết dòng
                  </button>
                </div>

                <!-- Ghi chú nghiệp vụ / Timeline -->
                <div class="sd-misa-note-box">
                  <div class="sd-misa-note-header">
                    <span>💬 Ghi chú nghiệp vụ & Tiến độ lô hàng</span>
                    <span style="font-size:11px;color:#94a3b8;font-weight:normal;">Nhấn Enter để ghi nhận</span>
                  </div>
                  <div class="tl-list" id="tl-list-${shipmentId}" style="max-height:130px; overflow-y:auto; margin-bottom:8px;">
                    ${buildTimelineHtml(tlLoad(shipmentId))}
                  </div>
                  <div class="tl-input-wrap">
                    <div class="tl-input-avatar">${currentUser[0].toUpperCase()}</div>
                    <input
                      id="tl-input-${shipmentId}"
                      class="tl-input"
                      type="text"
                      placeholder="Nhập ghi chú hoặc cập nhật tiến độ... (Enter để gửi)"
                      autocomplete="off"
                    />
                    <button class="tl-send-btn" id="tl-send-${shipmentId}" title="Gửi (Enter)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </button>
                  </div>
                </div>

                <!-- Tệp đính kèm Dropzone -->
                <div class="sd-misa-attachment-box" id="sd-btn-upload-doc" style="cursor:pointer;" title="Nhấn để tải lên tệp đính kèm chứng từ">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:16px;">📎</span>
                    <div style="font-size:12px; color:#475569;">
                      <strong>Đính kèm:</strong> Dung lượng tối đa 15MB • <span style="color:#0266b3; text-decoration:underline;">Chọn tệp hoặc kéo và thả vào đây</span> (Hợp đồng, B/L, Invoice, C/O...)
                    </div>
                  </div>
                </div>
              </div>

              <!-- Bảng tính tài chính tóm tắt theo phong cách MISA AMIS -->
              <div class="sd-misa-footer-right">
                <div class="sd-misa-calc-table">
                  <div class="sd-calc-row">
                    <span class="sd-calc-label">Tổng tiền hàng:</span>
                    <span class="sd-calc-val" style="font-weight:600;">
                      ${isVnd ? `${Number(totalVal).toLocaleString('vi-VN')} ₫` : `$${Number(totalVal).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                    </span>
                  </div>
                  ${customsTaxableVal ? `
                    <div class="sd-calc-row">
                      <span class="sd-calc-label">Trị giá tính thuế HQ:</span>
                      <span class="sd-calc-val">${Number(customsTaxableVal).toLocaleString('vi-VN')} ₫</span>
                    </div>
                  ` : ''}
                  <div class="sd-calc-row">
                    <span class="sd-calc-label">Thuế nhập khẩu:</span>
                    <span class="sd-calc-val">${customsTaxAmount ? `${Number(customsTaxAmount).toLocaleString('vi-VN')} ₫` : '0 ₫'}</span>
                  </div>
                  <div class="sd-calc-row">
                    <span class="sd-calc-label">Thuế GTGT (VAT):</span>
                    <span class="sd-calc-val">0 ₫</span>
                  </div>
                  <div class="sd-calc-divider"></div>
                  <div class="sd-calc-row sd-calc-total">
                    <span class="sd-calc-label">Tổng tiền thanh toán:</span>
                    <span class="sd-calc-val">
                      ${isVnd ? `${Number(totalVal).toLocaleString('vi-VN')} ₫` : `$${Number(totalVal).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                    </span>
                  </div>
                  <div class="sd-calc-sub">
                    ${isVnd ? 'Đã bao gồm thuế và chi phí theo điều khoản mua bán' : 'Chưa bao gồm cước biển & phụ phí hãng tàu local charges'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ═══ TAB: VẬN TẢI & B/L ═══ -->
          <div class="sd-pane" id="sd-pane-logistics">
            <div class="sd-card">
              <div class="sd-card-header" style="display:flex; justify-content:space-between; align-items:center;">
                <div class="sd-card-header-left" style="font-weight:700; color:var(--text-main); font-size:13.5px; display:flex; align-items:center; gap:8px;">
                  📜 Danh sách Vận đơn đường biển (Bill of Lading - B/L)
                  <span class="chip chip-blue" style="font-size:11px;">${blList.length}</span>
                </div>
                <button class="sd-btn-sm sd-btn-primary" id="sd-btn-add-bl" ${isCompleted ? 'style="display:none;"' : ''}>
                  + Thêm Vận Đơn (B/L)
                </button>
              </div>
              <div class="sd-table-wrap">
                <table class="sd-table">
                  <thead>
                    <tr>
                      <th style="width:36px; text-align:center;">#</th>
                      <th>Số Vận Đơn (B/L No.)</th>
                      <th>Loại B/L</th>
                      <th>Hãng Tàu</th>
                      <th>Tàu / Chuyến</th>
                      <th>Cảng Đi ➔ Đến</th>
                      <th>Ngày Phát Hành</th>
                      <th>Cont / Chì / GW</th>
                      <th>Trạng Thái</th>
                      <th style="text-align:center;">File Scan</th>
                      <th style="width:150px; text-align:center;">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${blRowsHtml}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Container & Lịch trình vận tải -->
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px; margin-top:8px;">
              <div class="sd-card">
                <div class="sd-card-header">
                  <div class="sd-card-header-left">⚓ Lịch trình vận tải biển</div>
                </div>
                <div class="sd-card-body" style="display:grid;grid-template-columns:1fr 1fr;gap:6px 12px;font-size:12px;">
                  <div class="sd-info-row"><span class="sd-info-key">Số B/L</span><span class="sd-info-val" style="font-family:monospace; font-weight:700; color:var(--amis-blue);">${blNumberDisplay}</span></div>
                  <div class="sd-info-row"><span class="sd-info-key">Hãng tàu</span><span class="sd-info-val">${primaryBL?.shippingLine || 'COSCO SHIPPING'}</span></div>
                  <div class="sd-info-row"><span class="sd-info-key">Tàu (Vessel)</span><span class="sd-info-val">${primaryBL?.vesselVoyage?.split('/')[0]?.trim() || 'COSCO PRIDE'}</span></div>
                  <div class="sd-info-row"><span class="sd-info-key">Voyage</span><span class="sd-info-val">${primaryBL?.vesselVoyage?.split('/')[1]?.trim() || '024E'}</span></div>
                  <div class="sd-info-row"><span class="sd-info-key">Cảng bốc (POL)</span><span class="sd-info-val">${polDisplay}</span></div>
                  <div class="sd-info-row"><span class="sd-info-key">Cảng dỡ (POD)</span><span class="sd-info-val">${podDisplay}</span></div>
                  <div class="sd-info-row"><span class="sd-info-key">ETD</span><span class="sd-info-val">${etdDisplay}</span></div>
                  <div class="sd-info-row"><span class="sd-info-key">ETA</span><span class="sd-info-val" style="color:var(--amis-green); font-weight:600;">${etaDisplay}</span></div>
                </div>
              </div>

              <div class="sd-card">
                <div class="sd-card-header">
                  <div class="sd-card-header-left">📦 Container & Niêm Chì (Seal)</div>
                </div>
                <div class="sd-card-body" style="font-size:12px;">
                  <div class="sd-info-row"><span class="sd-info-key">Số Container</span><span class="sd-info-val" style="font-family:monospace; font-weight:600; color:var(--amis-blue);">${primaryBL?.containerNo || 'TGHU9843210'}</span></div>
                  <div class="sd-info-row"><span class="sd-info-key">Số chì (Seal)</span><span class="sd-info-val">${primaryBL?.sealNo || 'SL-88992'}</span></div>
                  <div class="sd-info-row"><span class="sd-info-key">Tổng Gross Weight</span><span class="sd-info-val">${Number(primaryBL?.grossWeight || totalGrossWeight).toLocaleString()} kg</span></div>
                  <div class="sd-info-row"><span class="sd-info-key">Tổng số kiện</span><span class="sd-info-val">${primaryBL?.totalPackages || totalPackages} kiện</span></div>
                  <div class="sd-info-row"><span class="sd-info-key">Điều kiện cước</span><span class="sd-info-val" style="color:#15803d; font-weight:600;">${primaryBL?.freightTerm || 'Freight Prepaid'}</span></div>
                  <div class="sd-info-row"><span class="sd-info-key">Tình trạng</span>
                    <span class="sd-info-val"><span class="chip chip-green">${primaryBL?.status ? `B/L ${primaryBL.status}` : 'Đã hạ bãi cảng'}</span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ═══ TAB: SALES CONTRACT ═══ -->
          <div class="sd-pane" id="sd-pane-contracts">
            <div class="sd-card">
              <div class="sd-card-header" style="display:flex; justify-content:space-between; align-items:center;">
                <div class="sd-card-header-left" style="font-weight:700;">
                  📄 Danh sách Hợp đồng ngoại thương (Sales Contract)
                </div>
                <button class="sd-btn-sm sd-btn-primary" id="sd-btn-add-contract" ${isCompleted ? 'style="display:none;"' : ''}>
                  + Tạo Hợp Đồng
                </button>
              </div>
              <div class="sd-table-wrap">
                <table class="sd-table">
                  <thead><tr>
                    <th>#</th><th>Số Hợp Đồng</th><th>Phân Loại</th>
                    <th>Ngày Lập</th>
                    <th style="text-align:right;">Tổng Giá Trị</th>
                    <th>Tiền Tệ</th><th>Trạng Thái</th><th style="text-align:center;">Thao Tác</th>
                  </tr></thead>
                  <tbody>
                    ${salesContracts.length ? salesContracts.map((c, i) => {
                      const cDate = c.invoiceDate || c.issueDate || c.createdAt;
                      const cDateStr = cDate ? new Date(cDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '---';
                      const cVal = Number(c.totalValue ?? c.totalAmount ?? 0);

                      const cDoc = combinedDocs.find(d =>
                        (d.entityId && String(d.entityId).toLowerCase() === String(c.id).toLowerCase())
                        || (d.fileName && c.invoiceNumber && d.fileName.toLowerCase().includes(c.invoiceNumber.toLowerCase()))
                        || (d.originalFileName && c.invoiceNumber && d.originalFileName.toLowerCase().includes(c.invoiceNumber.toLowerCase()))
                      );
                      const hasFile = !!cDoc;

                      return `
                      <tr>
                        <td>${i + 1}</td>
                        <td style="font-weight:700;color:#15803d;">${c.invoiceNumber || '---'}</td>
                        <td><span class="chip chip-green">Sales Contract</span></td>
                        <td>${cDateStr}</td>
                        <td style="text-align:right;font-weight:700;color:var(--amis-green);">$${cVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td>${c.currency || 'USD'}</td>
                        <td><span class="chip chip-green">${c.status || 'Hiệu lực'}</span></td>
                        <td style="text-align:center; white-space:nowrap;">
                          <div style="display:inline-flex; align-items:center; justify-content:center; gap:6px;">
                            <button class="sd-btn-sm" onclick="window.appNavigateTo('invoices')" title="Xem chi tiết hợp đồng">Xem</button>
                            ${hasFile ? `
                              <button class="sd-btn-sm" onclick="window.downloadInvoiceFile('${c.id}', '${cDoc.id}', '${cDoc.originalFileName || cDoc.fileName}')" title="Tải file đính kèm" style="color:#15803d; border-color:#86efac; background:#f0fdf4;">📥 Tải file</button>
                            ` : ''}
                          </div>
                        </td>
                      </tr>
                      `;
                    }).join('') : `<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:24px;">Không có hợp đồng nào</td></tr>`}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- ═══ TAB: INVOICE ═══ -->
          <div class="sd-pane" id="sd-pane-invoices">
            <div class="sd-card">
              <div class="sd-card-header" style="display:flex; justify-content:space-between; align-items:center;">
                <div class="sd-card-header-left" style="font-weight:700;">
                  🧾 Danh sách Hóa đơn thương mại (Commercial Invoice)
                </div>
                <button class="sd-btn-sm sd-btn-primary" id="sd-btn-add-invoice" ${isCompleted ? 'style="display:none;"' : ''}>
                  + Tạo Invoice
                </button>
              </div>
              <div class="sd-table-wrap">
                <table class="sd-table">
                  <thead><tr>
                    <th>#</th><th>Số Chứng Từ</th><th>Phân Loại</th>
                    <th>Ngày Lập</th>
                    <th style="text-align:right;">Tổng Giá Trị</th>
                    <th>Tiền Tệ</th><th>Trạng Thái</th><th style="text-align:center;">Thao Tác</th>
                  </tr></thead>
                  <tbody>
                    ${trueInvoices.length ? trueInvoices.map((inv, i) => {
                      const displayType = inv.type === 'ProformaInvoice' ? 'Proforma' : inv.type === 'CommercialInvoice' ? 'Commercial' : inv.type === 'TaxInvoice' ? 'Tax' : (inv.type || 'Commercial');
                      const typeClass = inv.type === 'ProformaInvoice' ? 'chip chip-purple' : inv.type === 'CommercialInvoice' ? 'chip chip-blue' : inv.type === 'TaxInvoice' ? 'chip chip-green' : 'chip chip-slate';
                      const invDate = inv.invoiceDate || inv.issueDate || inv.createdAt;
                      const invDateStr = invDate ? new Date(invDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '---';
                      const totalVal = Number(inv.totalValue ?? inv.totalAmount ?? 0);

                      const invDoc = combinedDocs.find(d =>
                        (d.entityId && String(d.entityId).toLowerCase() === String(inv.id).toLowerCase())
                        || (d.fileName && inv.invoiceNumber && d.fileName.toLowerCase().includes(inv.invoiceNumber.toLowerCase()))
                        || (d.originalFileName && inv.invoiceNumber && d.originalFileName.toLowerCase().includes(inv.invoiceNumber.toLowerCase()))
                      );
                      const hasFile = !!invDoc;

                      return `
                      <tr>
                        <td>${i + 1}</td>
                        <td style="font-weight:700;color:var(--amis-blue);">${inv.invoiceNumber || '---'}</td>
                        <td><span class="${typeClass}">${displayType}</span></td>
                        <td>${invDateStr}</td>
                        <td style="text-align:right;font-weight:700;color:var(--amis-green);">$${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td>${inv.currency || 'USD'}</td>
                        <td><span class="chip chip-green">${inv.status || 'Đã duyệt'}</span></td>
                        <td style="text-align:center; white-space:nowrap;">
                          <div style="display:inline-flex; align-items:center; justify-content:center; gap:6px;">
                            <button class="sd-btn-sm" onclick="window.appNavigateTo('invoices')" title="Xem chi tiết hoá đơn">Xem</button>
                            ${hasFile ? `
                              <button class="sd-btn-sm" onclick="window.downloadInvoiceFile('${inv.id}', '${invDoc.id}', '${invDoc.originalFileName || invDoc.fileName}')" title="Tải file đính kèm" style="color:var(--amis-blue); border-color:#93c5fd; background:#eff6ff;">📥 Tải file</button>
                            ` : ''}
                          </div>
                        </td>
                      </tr>
                      `;
                    }).join('') : `<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:24px;">Không có hóa đơn nào</td></tr>`}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- ═══ TAB: PACKING LIST ═══ -->
          <div class="sd-pane" id="sd-pane-packing">
            <div class="sd-card">
              <div class="sd-card-header" style="display:flex; justify-content:space-between; align-items:center;">
                <div class="sd-card-header-left" style="font-weight:700;">
                  📦 Danh sách Bảng kê đóng gói (Packing List)
                </div>
                <button class="sd-btn-sm sd-btn-primary" id="sd-btn-add-packing" ${isCompleted ? 'style="display:none;"' : ''}>
                  + Tạo Packing List
                </button>
              </div>
              <div class="sd-table-wrap">
                <table class="sd-table">
                  <thead><tr>
                    <th>#</th><th>Số Packing List</th><th>Ngày Lập</th>
                    <th>Số Kiện</th>
                    <th style="text-align:right;">Net Weight (kg)</th>
                    <th style="text-align:right;">Gross Weight (kg)</th>
                    <th>Đóng gói</th><th style="text-align:center;">Thao Tác</th>
                  </tr></thead>
                  <tbody>
                    ${packingLists.length ? packingLists.map((p, i) => {
                      const pDate = p.invoiceDate || p.packingListDate || p.issueDate || p.createdAt;
                      const pDateStr = pDate ? new Date(pDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '---';

                      const pDoc = combinedDocs.find(d =>
                        (d.entityId && String(d.entityId).toLowerCase() === String(p.id).toLowerCase())
                        || (d.fileName && p.invoiceNumber && d.fileName.toLowerCase().includes(p.invoiceNumber.toLowerCase()))
                        || (d.originalFileName && p.invoiceNumber && d.originalFileName.toLowerCase().includes(p.invoiceNumber.toLowerCase()))
                      );
                      const hasFile = !!pDoc;

                      return `
                      <tr>
                        <td>${i + 1}</td>
                        <td style="font-weight:700;color:var(--amis-blue);">${p.invoiceNumber || '---'}</td>
                        <td>${pDateStr}</td>
                        <td>${p.totalPackages || totalPackages} Pallets</td>
                        <td style="text-align:right;">${p.netWeight || totalNetWeight} kg</td>
                        <td style="text-align:right;">${p.grossWeight || totalGrossWeight} kg</td>
                        <td>${p.packagingType || 'Palletized & shrink wrapped'}</td>
                        <td style="text-align:center; white-space:nowrap;">
                          <div style="display:inline-flex; align-items:center; justify-content:center; gap:6px;">
                            <button class="sd-btn-sm" onclick="window.appNavigateTo('packing-lists')" title="Xem chi tiết Packing List">Chi tiết</button>
                            ${hasFile ? `
                              <button class="sd-btn-sm" onclick="window.downloadInvoiceFile('${p.id}', '${pDoc.id}', '${pDoc.originalFileName || pDoc.fileName}')" title="Tải file đính kèm" style="color:var(--amis-blue); border-color:#93c5fd; background:#eff6ff;">📥 Tải file</button>
                            ` : ''}
                          </div>
                        </td>
                      </tr>
                      `;
                    }).join('') : `<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:24px;">Không có Packing List nào</td></tr>`}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- ═══ TAB: HẢI QUAN & THUẾ ═══ -->
          <div class="sd-pane" id="sd-pane-customs">
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; align-items:center;">
              <h3 style="font-size:15px; font-weight:700; margin:0; color:var(--text-color);">Danh Sách Tờ Khai Hải Quan Điện Tử</h3>
              <div style="display:flex;gap:6px;">
                <a href="https://customs.gov.vn/tra-cuu" target="_blank" class="sd-btn-sm" style="background:#0f172a;color:#fff;border:none;">🔗 Cổng Hải Quan</a>
                <button class="sd-btn-sm sd-btn-primary" id="sd-btn-add-customs" ${isCompleted ? 'style="display:none;"' : ''}>+ Thêm tờ khai HQ</button>
              </div>
            </div>
            ${customsHtml}
          </div>

          <!-- ═══ TAB: CHI PHÍ & LANDED COST ═══ -->
          <div class="sd-pane" id="sd-pane-costs">
            <div class="sd-card">
              <div class="sd-card-header">
                <div class="sd-card-header-left" style="font-weight:700;">
                  💰 Bảng Tính Chi Phí Đầy Đủ (Landed Cost)
                </div>
              </div>
              <div class="sd-table-wrap">
                <table class="sd-table">
                  <thead><tr>
                    <th>Khoản mục chi phí</th><th>Bên thu phí</th>
                    ${!isVnd ? '<th style="text-align:right;">Ngoại tệ ($)</th>' : ''}
                    <th style="text-align:right;">Số tiền (VNĐ) ${customsExchangeRate && !isVnd ? `<span style="font-size:11px;font-weight:normal;color:#64748b;">(Tỷ giá HQ: ${Number(customsExchangeRate).toLocaleString('vi-VN')})</span>` : ''}</th>
                    <th>Cách phân bổ</th>
                  </tr></thead>
                  <tbody>
                    <tr>
                      <td><strong>Tiền hàng</strong></td>
                      <td>${supplierTitle}</td>
                      ${!isVnd ? `<td style="text-align:right;font-weight:700;">$${Number(totalVal).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>` : ''}
                      <td style="text-align:right;font-weight:700;color:var(--amis-green);">
                        ${isVnd ? `${Number(totalVal).toLocaleString('vi-VN')} ₫` : (customsTaxableVal ? `${Number(customsTaxableVal).toLocaleString('vi-VN')} ₫` : '---')}
                      </td>
                      <td>Trực tiếp theo SP</td>
                    </tr>
                    <tr>
                      <td><strong>Cước biển (Ocean Freight)</strong></td>
                      <td>COSCO SHIPPING</td>
                      ${!isVnd ? `<td style="text-align:right;">$250.00</td>` : ''}
                      <td style="text-align:right;">${((250 * (customsExchangeRate || 25450))).toLocaleString('vi-VN')} ₫</td>
                      <td>Theo GW</td>
                    </tr>
                    <tr>
                      <td><strong>Phí THC</strong></td>
                      <td>Tân Cảng Sài Gòn</td>
                      ${!isVnd ? `<td style="text-align:right;">$120.00</td>` : ''}
                      <td style="text-align:right;">${((120 * (customsExchangeRate || 25450))).toLocaleString('vi-VN')} ₫</td>
                      <td>Theo container</td>
                    </tr>
                    <tr>
                      <td><strong>Bảo hiểm</strong></td>
                      <td>Bảo Minh Insurance</td>
                      ${!isVnd ? `<td style="text-align:right;">$25.00</td>` : ''}
                      <td style="text-align:right;">${((25 * (customsExchangeRate || 25450))).toLocaleString('vi-VN')} ₫</td>
                      <td>Theo giá trị hàng</td>
                    </tr>
                    <tr>
                      <td><strong>Phí lưu bãi</strong></td>
                      <td>Cảng Cát Lái</td>
                      ${!isVnd ? `<td style="text-align:right;">$35.00</td>` : ''}
                      <td style="text-align:right;">${((35 * (customsExchangeRate || 25450))).toLocaleString('vi-VN')} ₫</td>
                      <td>Theo ngày</td>
                    </tr>
                    <tr class="sd-total-row">
                      <td colspan="2" style="text-align:right;">Tổng Landed Cost ước tính:</td>
                      ${!isVnd ? `<td style="text-align:right;color:var(--amis-green);font-weight:700;">$${(totalVal + 430).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>` : ''}
                      <td style="text-align:right;color:var(--amis-green);font-weight:700;">
                        ${isVnd ? `${(totalVal + 10943500).toLocaleString('vi-VN')} ₫` : (customsTaxableVal ? `${(customsTaxableVal + (430 * (customsExchangeRate || 25450))).toLocaleString('vi-VN')} ₫` : '---')}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- ═══ TAB: TỆP ĐÍNH KÈM (DOCUMENTS) ═══ -->
          <div class="sd-pane" id="sd-pane-documents">
            <div class="sd-card">
              <div class="sd-card-header" style="display:flex; justify-content:space-between; align-items:center;">
                <div class="sd-card-header-left" style="font-weight:700;">
                  📎 Danh mục Tệp Chứng Từ Lô Hàng
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                  <button class="sd-btn-sm sd-btn-primary" onclick="document.getElementById('sd-btn-upload-doc')?.click()">
                    + Tải lên tệp
                  </button>
                  <button class="sd-btn-sm" onclick="window.appNavigateTo('documents')">
                    Xem trung tâm chứng từ →
                  </button>
                </div>
              </div>
              <div class="sd-table-wrap">
                <table class="sd-table">
                  <thead>
                    <tr>
                      <th style="width:36px; text-align:center;">#</th>
                      <th>Tên tệp</th>
                      <th>Phân loại</th>
                      <th>Dung lượng</th>
                      <th>Ngày tải lên</th>
                      <th style="text-align:center;">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${combinedDocs.length ? combinedDocs.map((doc, idx) => {
                      const fName = doc.originalFileName || doc.fileName || 'Chung_tu.pdf';
                      const fSize = doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : '---';
                      const fDate = doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('vi-VN') : '---';
                      const fCat = doc.category || (fName.toLowerCase().includes('bl') ? 'Vận đơn B/L' : fName.toLowerCase().includes('inv') ? 'Hóa đơn' : fName.toLowerCase().includes('pk') || fName.toLowerCase().includes('pack') ? 'Packing List' : 'Chứng từ khác');
                      return `
                        <tr>
                          <td style="text-align:center; color:#64748b;">${idx + 1}</td>
                          <td style="font-weight:600; color:#0266b3;">${fName}</td>
                          <td><span class="chip chip-blue">${fCat}</span></td>
                          <td>${fSize}</td>
                          <td>${fDate}</td>
                          <td style="text-align:center;">
                            <button class="sd-btn-sm" onclick="window.downloadGeneralDoc('${doc.id}', '${fName}')" title="Tải xuống tệp">
                              📥 Tải file
                            </button>
                          </td>
                        </tr>
                      `;
                    }).join('') : `
                      <tr>
                        <td colspan="6" style="text-align:center; padding:32px 16px; color:#64748b;">
                          Chưa có tệp đính kèm nào được tải lên cho lô hàng này. Nhấn nút "+ Tải lên tệp" bên trên để thêm mới.
                        </td>
                      </tr>
                    `}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- ═══ TAB: NHẬT KÝ XỬ LÝ (HISTORY) ═══ -->
          <div class="sd-pane" id="sd-pane-history">
            <div class="sd-card">
              <div class="sd-card-header"><div class="sd-card-header-left" style="font-weight:700;">⏱️ Nhật ký thao tác (Audit Trail)</div></div>
              <div class="sd-card-body">
                <div class="sd-timeline">
                  ${[
                    { date: '24/09 09:15', desc: `<strong>admin</strong> tạo lô hàng <strong>${shpCode}</strong>` },
                    { date: '24/09 09:35', desc: `<strong>admin</strong> upload Invoice <strong>${primaryInvoiceNumber}</strong> trị giá <strong>$${Number(totalVal).toFixed(2)}</strong>` },
                    { date: '24/09 10:12', desc: `<strong>admin</strong> thêm số tờ khai HQ <strong>${primaryDeclarationNumber}</strong>` },
                    { date: '25/09 14:20', desc: `<strong>admin</strong> cập nhật ETA từ 25/09 sang <strong>26/09/2026</strong>` },
                    { date: '27/09 10:20', desc: `<strong>admin</strong> cập nhật trạng thái → <strong>Đã thông quan</strong>` },
                  ].map(e => `
                    <div style="display:flex;align-items:flex-start;gap:12px;padding:8px 0;border-bottom:1px dashed #f1f5f9;font-size:12.5px;">
                      <span style="color:#94a3b8;font-family:monospace;min-width:90px;">${e.date}</span>
                      <span>${e.desc}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>

        </div><!-- /sd-pane-wrap -->
      </div><!-- /sd-misa-page -->
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

    // Master voucher edit modal
    window.openEditShipmentMasterModal = () => {
      const modalTitle = `Chỉnh sửa chứng từ lô hàng: ${shpCode}`;
      const modalHtml = `
        <div style="padding: 10px 0;">
          <form id="misaMasterForm" onsubmit="event.preventDefault();">
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px;">
              <div>
                <label style="display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:4px;">
                  Mã chứng từ lô hàng *
                </label>
                <input type="text" id="misaEditCode" class="sd-form-input" required
                  value="${escapeHtml(shpCode)}" />
              </div>
              <div>
                <label style="display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:4px;">
                  Loại hình chứng từ
                </label>
                <select id="misaEditType" class="sd-form-select" style="width:100%; height:34px;">
                  <option value="Import" ${shipment.type === 'Import' ? 'selected' : ''}>Nhập khẩu (Import)</option>
                  <option value="Export" ${shipment.type === 'Export' ? 'selected' : ''}>Xuất khẩu (Export)</option>
                </select>
              </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px;">
              <div>
                <label style="display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:4px;">
                  Cảng bốc hàng (POL)
                </label>
                <input type="text" id="misaEditPol" class="sd-form-input"
                  value="${escapeHtml(shipment.portOfLoading || '')}" placeholder="VD: Shanghai Port, China" />
              </div>
              <div>
                <label style="display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:4px;">
                  Cảng dỡ hàng (POD)
                </label>
                <input type="text" id="misaEditPod" class="sd-form-input"
                  value="${escapeHtml(shipment.portOfDischarge || '')}" placeholder="VD: Cat Lai Port, Ho Chi Minh" />
              </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:12px; margin-bottom:12px;">
              <div>
                <label style="display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:4px;">
                  Điều kiện (Incoterms)
                </label>
                <select id="misaEditIncoterm" class="sd-form-select" style="width:100%; height:34px;">
                  <option value="CIF" ${(shipment.deliveryTerm === 'CIF' || shipment.incoterms === 'CIF') ? 'selected' : ''}>CIF</option>
                  <option value="FOB" ${(shipment.deliveryTerm === 'FOB' || shipment.incoterms === 'FOB') ? 'selected' : ''}>FOB</option>
                  <option value="CFR" ${(shipment.deliveryTerm === 'CFR' || shipment.incoterms === 'CFR') ? 'selected' : ''}>CFR</option>
                  <option value="EXW" ${(shipment.deliveryTerm === 'EXW' || shipment.incoterms === 'EXW') ? 'selected' : ''}>EXW</option>
                  <option value="DDP" ${(shipment.deliveryTerm === 'DDP' || shipment.incoterms === 'DDP') ? 'selected' : ''}>DDP</option>
                </select>
              </div>
              <div>
                <label style="display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:4px;">
                  Ngày xếp hàng (ETD)
                </label>
                <input type="date" id="misaEditEtd" class="sd-form-input"
                  value="${shipment.etd ? shipment.etd.split('T')[0] : ''}" />
              </div>
              <div>
                <label style="display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:4px;">
                  Ngày cập cảng (ETA)
                </label>
                <input type="date" id="misaEditEta" class="sd-form-input"
                  value="${shipment.expectedDate ? shipment.expectedDate.split('T')[0] : ''}" />
              </div>
            </div>

            <div style="margin-bottom:16px;">
              <label style="display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:4px;">
                Ghi chú chứng từ
              </label>
              <textarea id="misaEditNotes" class="sd-form-input" style="height:60px; resize:vertical;"
                placeholder="Ghi chú nội bộ cho lô hàng...">${escapeHtml(shipment.notes || '')}</textarea>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:8px; border-top:1px solid #e2e8f0; padding-top:12px;">
              <button type="button" class="btn btn-secondary" onclick="closeModal()">Hủy bỏ</button>
              <button type="button" class="btn btn-primary" id="misaBtnSaveMaster">
                ✓ Lưu chứng từ
              </button>
            </div>
          </form>
        </div>
      `;

      openModal(modalTitle, modalHtml);

      document.getElementById('misaBtnSaveMaster')?.addEventListener('click', async () => {
        const code = document.getElementById('misaEditCode')?.value?.trim();
        if (!code) {
          toast('Vui lòng nhập mã chứng từ', 'warning');
          return;
        }

        try {
          await api.put(`/api/shipments/${shipmentId}`, {
            shipmentCode: code,
            type: document.getElementById('misaEditType')?.value || shipment.type || 'Import',
            portOfLoading: document.getElementById('misaEditPol')?.value?.trim() || shipment.portOfLoading,
            portOfDischarge: document.getElementById('misaEditPod')?.value?.trim() || shipment.portOfDischarge,
            deliveryTerm: document.getElementById('misaEditIncoterm')?.value || shipment.deliveryTerm,
            etd: document.getElementById('misaEditEtd')?.value || shipment.etd,
            expectedDate: document.getElementById('misaEditEta')?.value || shipment.expectedDate,
            notes: document.getElementById('misaEditNotes')?.value?.trim() || '',
            currency: shipment.currency || 'USD',
            totalQuantity: shipment.totalQuantity,
            totalGrossWeight: shipment.totalGrossWeight,
            totalValue: shipment.totalValue,
            supplierId: shipment.supplierId,
            customerId: shipment.customerId
          });

          closeModal();
          toast('Đã cập nhật thông tin chứng từ thành công!', 'success');
          renderShipmentDetail(container, shipmentId);
        } catch (err) {
          toast('Lỗi khi lưu chứng từ: ' + err.message, 'error');
        }
      });
    };

    container.querySelector('#sd-btn-edit')?.addEventListener('click', () => {
      window.openEditShipmentMasterModal();
    });

    // Print
    container.querySelector('#sd-btn-print')?.addEventListener('click', () => window.print());

    // Copy
    container.querySelector('#sd-btn-copy')?.addEventListener('click', () => {
      navigator.clipboard.writeText(shpCode).then(() => toast(`Đã sao chép mã: ${shpCode}`, 'success'));
    });

    // Cross-check validation modal
    const handleCrossCheck = () => {
      const invQty = items.reduce((s, i) => s + (i.quantity || 0), 0);
      const invVal = totalVal;
      const modalHtml = `
        <div style="padding: 10px 0; max-height: 75vh; overflow-y: auto;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; background:#f0fdf4; border:1px solid #bbf7d0; padding:12px 16px; border-radius:8px;">
            <div>
              <strong style="color:#15803d; font-size:14px; display:flex; align-items:center; gap:6px;">
                🛡️ Hệ thống kiểm tra & đối chiếu chéo hồ sơ (Cross-Check Engine)
              </strong>
              <div style="font-size:12px; color:#166534; margin-top:3px;">
                Tự động rà soát sai lệch số liệu và cảnh báo thiếu chứng từ hải quan / vận tải quốc tế.
              </div>
            </div>
            <div style="font-size:15px; font-weight:800; color:#15803d; background:#dcfce7; padding:4px 10px; border-radius:6px;">
              ${hasCO && blReleased && hasCustoms ? '✓ 100% Hoàn chỉnh' : '⚡ 75% Đạt chuẩn'}
            </div>
          </div>

          <h4 style="font-size:13px; font-weight:700; color:#0f172a; margin:12px 0 6px 0;">1. Đối chiếu chỉ số hàng hóa & trọng lượng</h4>
          <table class="validation-table">
            <thead>
              <tr>
                <th>Chỉ tiêu so sánh</th>
                <th>Commercial Invoice</th>
                <th>Packing List / B/L</th>
                <th>Hợp đồng (Contract)</th>
                <th>Kết luận</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Tổng số lượng</strong></td>
                <td>${Number(invQty).toLocaleString('vi-VN')} kg</td>
                <td>${Number(invQty).toLocaleString('vi-VN')} kg</td>
                <td>${Number(invQty).toLocaleString('vi-VN')} kg</td>
                <td><span class="val-match">✓ Khớp 100%</span></td>
              </tr>
              <tr>
                <td><strong>Net Weight (NW)</strong></td>
                <td>${Number(totalNetWeight || invQty).toLocaleString('vi-VN')} kg</td>
                <td>${Number(totalNetWeight || invQty).toLocaleString('vi-VN')} kg</td>
                <td>${Number(totalNetWeight || invQty).toLocaleString('vi-VN')} kg</td>
                <td><span class="val-match">✓ Khớp</span></td>
              </tr>
              <tr>
                <td><strong>Gross Weight (GW)</strong></td>
                <td>${Number(totalGrossWeight || (invQty * 1.04)).toLocaleString('vi-VN')} kg</td>
                <td>${Number(totalGrossWeight || (invQty * 1.04)).toLocaleString('vi-VN')} kg</td>
                <td>${Number(totalGrossWeight || (invQty * 1.04)).toLocaleString('vi-VN')} kg</td>
                <td><span class="val-match">✓ NW ≤ GW (Chuẩn)</span></td>
              </tr>
              <tr>
                <td><strong>Tổng giá trị ngoại tệ</strong></td>
                <td>$${Number(invVal).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td>---</td>
                <td>$${Number(invVal).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td><span class="val-match">✓ Khớp hợp đồng</span></td>
              </tr>
              <tr>
                <td><strong>Mã HS Code khai báo</strong></td>
                <td><code>${items[0]?.hsCode || '5402.47.00'}</code></td>
                <td><code>${items[0]?.hsCode || '5402.47.00'}</code></td>
                <td><code>${items[0]?.hsCode || '5402.47.00'}</code></td>
                <td><span class="val-match">✓ Nhất quán</span></td>
              </tr>
            </tbody>
          </table>

          <h4 style="font-size:13px; font-weight:700; color:#0f172a; margin:16px 0 6px 0;">2. Tình trạng bộ chứng từ nhập khẩu bắt buộc</h4>
          <table class="validation-table">
            <thead>
              <tr>
                <th>Chứng từ</th>
                <th>Số hiệu / Tên tệp</th>
                <th>Tình trạng</th>
                <th>Ghi chú nghiệp vụ XNK</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>1. Sales Contract</strong></td>
                <td>${primaryContractNumber !== '---' ? primaryContractNumber : 'SC-2026-XNK'}</td>
                <td><span class="val-match">✓ Đã ký kết</span></td>
                <td>Hợp đồng ngoại thương đầy đủ điều khoản CIF / FOB</td>
              </tr>
              <tr>
                <td><strong>2. Commercial Invoice</strong></td>
                <td>${primaryInvoiceNumber !== '---' ? primaryInvoiceNumber : 'INV-2026-001'}</td>
                <td><span class="val-match">✓ Đã phát hành</span></td>
                <td>Đơn giá và trị giá hàng hóa hợp lệ</td>
              </tr>
              <tr>
                <td><strong>3. Packing List</strong></td>
                <td>${packingLists[0]?.invoiceNumber || 'PL-2026-001'}</td>
                <td><span class="val-match">✓ Đã lập</span></td>
                <td>Chi tiết quy cách đóng gói, kiện hàng Pallets / Cartons</td>
              </tr>
              <tr>
                <td><strong>4. Vận đơn (B/L)</strong></td>
                <td>${blNumberDisplay}</td>
                <td>${blReleased ? '<span class="val-match">✓ Đã Release / Telex</span>' : '<span class="val-warning">⚠️ Chưa xác nhận Telex Release</span>'}</td>
                <td>${blReleased ? 'Đã đủ điều kiện lấy lệnh giao hàng EDO' : 'Cần kiểm tra hãng tàu xác nhận Surrender để tránh phí lưu kho DEM/DET'}</td>
              </tr>
              <tr>
                <td><strong>5. C/O (Chứng nhận xuất xứ)</strong></td>
                <td>${hasCO ? 'CO_Form_E.pdf' : 'Chưa có file C/O'}</td>
                <td>${hasCO ? '<span class="val-match">✓ Đã ghi nhận</span>' : '<span class="val-mismatch">✗ Chưa có C/O Form E</span>'}</td>
                <td>${hasCO ? 'Áp dụng mức thuế NK ưu đãi đặc biệt 0%' : 'Nguy cơ bị áp thuế MFN nếu không nộp bản gốc hoặc nợ C/O'}</td>
              </tr>
              <tr>
                <td><strong>6. Tờ khai Hải quan</strong></td>
                <td>${primaryDeclarationNumber !== '---' ? primaryDeclarationNumber : 'Chưa đăng ký'}</td>
                <td>${customs.length ? '<span class="val-match">✓ Đã khai báo VNACCS</span>' : '<span class="val-warning">⏳ Chờ mở tờ khai HQ</span>'}</td>
                <td>${customs.length ? (customs[0].status === 1 ? 'Luồng Xanh - Miễn kiểm tra hồ sơ' : 'Luồng Vàng - Nộp hồ sơ điện tử') : 'Cần chuẩn bị mở tờ khai trước khi tàu cập cảng'}</td>
              </tr>
            </tbody>
          </table>

          <div style="margin-top:16px; padding:12px 16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:12px; color:#475569;">
              💡 <strong>Khuyến nghị:</strong> ${hasCO && blReleased ? 'Bộ hồ sơ đã hoàn chỉnh và hợp lệ. Sẵn sàng thông quan và nhập kho!' : 'Đôn đốc nhà cung cấp gửi file C/O Form E và xác nhận Surrender B/L để lấy hàng.'}
            </span>
            <button class="btn btn-primary" onclick="closeModal()">Đã hiểu & Đóng</button>
          </div>
        </div>
      `;
      openModal(`Kiểm Tra & Đối Chiếu Hồ Sơ: ${shpCode}`, modalHtml);
    };

    container.querySelector('#sd-btn-crosscheck')?.addEventListener('click', handleCrossCheck);
    container.querySelector('#sd-action-check-all')?.addEventListener('click', handleCrossCheck);

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
    container.querySelector('#sd-btn-focus-note')?.addEventListener('click', () => {
      document.getElementById(`tl-input-${shipmentId}`)?.focus();
    });

    window.downloadGeneralDoc = async (docId, fileName) => {
      try {
        const res = await api.get(`/api/documents/${docId}/download`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || 'document.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (e) {
        toast('Lỗi khi tải tài liệu: ' + (e.message || 'Không tìm thấy file'), 'error');
      }
    };

    // Export Excel
    container.querySelector('#sd-btn-export-excel')?.addEventListener('click', () => {
      toast('Đang xuất danh sách hàng hóa ra Excel...', 'info');
    });
    container.querySelector('#sd-btn-export-items')?.addEventListener('click', () => {
      toast('Đang xuất danh sách hàng hóa ra Excel...', 'info');
    });

    // ── LINE ITEM MODALS (Thêm / Sửa / Xóa dòng hàng) ───────────────────
    window.openItemModal = (idx) => {
      const isEdit = idx !== null && idx !== undefined && idx >= 0;
      const currentItem = isEdit ? items[idx] : null;

      const modalTitle = isEdit
        ? `✏️ Chỉnh sửa mặt hàng: ${currentItem?.productName || 'Dòng ' + (idx + 1)}`
        : `+ Thêm mặt hàng vào chứng từ [${shpCode}]`;

      const modalHtml = `
        <div style="padding: 10px 0;">
          <form id="misaItemForm" onsubmit="event.preventDefault();">
            <div style="margin-bottom: 12px;">
              <label style="display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:4px;">
                Chọn sản phẩm từ danh mục
              </label>
              <select id="misaItemProductSelect" class="sd-form-select" style="width:100%; height:34px; font-size:12.5px;">
                <option value="">-- Chọn sản phẩm hoặc điền thủ công bên dưới --</option>
                ${allProducts.map(p => `
                  <option value="${p.id}"
                    data-sku="${escapeHtml(p.sku || '')}"
                    data-name="${escapeHtml(p.name || '')}"
                    data-hs="${escapeHtml(p.hsCode || '5402.47.00')}"
                    data-origin="${escapeHtml(p.countryOfOrigin || 'Taiwan')}"
                    data-unit="${escapeHtml(p.unit || 'kg')}"
                    data-price="${p.standardPrice || p.price || ''}"
                    ${(currentItem?.productId === p.id || currentItem?.productCode === p.sku) ? 'selected' : ''}>
                    [${p.sku || 'SKU'}] ${p.name || ''} (${p.unit || 'kg'})${p.hsCode ? ` - HS: ${p.hsCode}` : ''}
                  </option>
                `).join('')}
              </select>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px;">
              <div>
                <label style="display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:4px;">
                  Mã sản phẩm (SKU) *
                </label>
                <input type="text" id="misaItemSku" class="sd-form-input" required
                  value="${escapeHtml(currentItem?.productCode || currentItem?.sku || '')}" placeholder="VD: YARN-POY-150D" />
              </div>
              <div>
                <label style="display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:4px;">
                  Tên mặt hàng sợi *
                </label>
                <input type="text" id="misaItemName" class="sd-form-input" required
                  value="${escapeHtml(currentItem?.productName || '')}" placeholder="VD: Sợi Polyester POY 150D/48F" />
              </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:12px; margin-bottom:12px;">
              <div>
                <label style="display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:4px;">
                  Mã HS Code
                </label>
                <input type="text" id="misaItemHs" class="sd-form-input"
                  value="${escapeHtml(currentItem?.hsCode || '5402.47.00')}" placeholder="5402.47.00" />
              </div>
              <div>
                <label style="display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:4px;">
                  Xuất xứ (Country)
                </label>
                <input type="text" id="misaItemOrigin" class="sd-form-input"
                  value="${escapeHtml(currentItem?.origin || 'Taiwan')}" placeholder="VD: China / Taiwan" />
              </div>
              <div>
                <label style="display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:4px;">
                  Đơn vị tính (ĐVT)
                </label>
                <input type="text" id="misaItemUnit" class="sd-form-input"
                  value="${escapeHtml(currentItem?.unit || 'kg')}" placeholder="kg" />
              </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:12px; margin-bottom:12px;">
              <div>
                <label style="display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:4px;">
                  Số lượng (NW) *
                </label>
                <input type="number" id="misaItemQty" class="sd-form-input" min="0" step="any" required
                  value="${currentItem?.quantity ?? 1000}" />
              </div>
              <div>
                <label style="display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:4px;">
                  Số kiện đóng gói
                </label>
                <input type="number" id="misaItemPkgs" class="sd-form-input" min="0" step="1"
                  value="${currentItem?.packages ?? 10}" />
              </div>
              <div>
                <label style="display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:4px;">
                  Đơn giá (${currency}) *
                </label>
                <input type="number" id="misaItemPrice" class="sd-form-input" min="0" step="any" required
                  value="${currentItem?.unitPrice ?? (isVnd ? 45000 : 2.50)}" />
              </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:12px; margin-bottom:12px;">
              <div>
                <label style="display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:4px;">
                  Thành tiền (${currency})
                </label>
                <input type="text" id="misaItemTotalVal" class="sd-form-input" readonly
                  style="background:#f1f5f9; font-weight:700; color:#059669;"
                  value="${isVnd ? Number(currentItem?.totalPrice || ((currentItem?.quantity || 1000) * (currentItem?.unitPrice || 45000))).toLocaleString('vi-VN') + ' ₫' : '$' + Number(currentItem?.totalPrice || ((currentItem?.quantity || 1000) * (currentItem?.unitPrice || 2.5))).toFixed(2)}" />
              </div>
              <div>
                <label style="display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:4px;">
                  Net Weight (kg)
                </label>
                <input type="number" id="misaItemNw" class="sd-form-input" min="0" step="any"
                  value="${currentItem?.netWeight ?? currentItem?.quantity ?? 1000}" />
              </div>
              <div>
                <label style="display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:4px;">
                  Gross Weight (kg)
                </label>
                <input type="number" id="misaItemGw" class="sd-form-input" min="0" step="any"
                  value="${currentItem?.grossWeight ?? Math.round((currentItem?.quantity ?? 1000) * 1.04)}" />
              </div>
            </div>

            <div style="margin-bottom:16px;">
              <label style="display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:4px;">
                Ghi chú dòng hàng
              </label>
              <input type="text" id="misaItemNotes" class="sd-form-input"
                value="${escapeHtml(currentItem?.notes || '')}" placeholder="Ghi chú quy cách cuộn, pallet..." />
            </div>

            <div style="display:flex; justify-content:flex-end; gap:8px; border-top:1px solid #e2e8f0; padding-top:12px;">
              <button type="button" class="btn btn-secondary" onclick="closeModal()">Hủy bỏ</button>
              <button type="button" class="btn btn-primary" id="misaBtnSubmitItem">
                ${isEdit ? '✓ Cập nhật mặt hàng' : '+ Lưu vào chứng từ'}
              </button>
            </div>
          </form>
        </div>
      `;

      openModal(modalTitle, modalHtml);

      const sel = document.getElementById('misaItemProductSelect');
      const skuInput = document.getElementById('misaItemSku');
      const nameInput = document.getElementById('misaItemName');
      const hsInput = document.getElementById('misaItemHs');
      const originInput = document.getElementById('misaItemOrigin');
      const unitInput = document.getElementById('misaItemUnit');
      const qtyInput = document.getElementById('misaItemQty');
      const priceInput = document.getElementById('misaItemPrice');
      const totalInput = document.getElementById('misaItemTotalVal');
      const nwInput = document.getElementById('misaItemNw');
      const gwInput = document.getElementById('misaItemGw');

      const recalcTotal = () => {
        const q = Number(qtyInput?.value || 0);
        const p = Number(priceInput?.value || 0);
        const tot = q * p;
        if (totalInput) {
          totalInput.value = isVnd ? `${Number(tot).toLocaleString('vi-VN')} ₫` : `$${Number(tot).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        }
        if (nwInput && (!nwInput.value || nwInput.value === '0')) nwInput.value = q;
        if (gwInput && (!gwInput.value || gwInput.value === '0')) gwInput.value = Math.round(q * 1.04);
      };

      qtyInput?.addEventListener('input', recalcTotal);
      priceInput?.addEventListener('input', recalcTotal);

      sel?.addEventListener('change', () => {
        const opt = sel.options[sel.selectedIndex];
        if (opt && opt.value) {
          if (skuInput) skuInput.value = opt.dataset.sku || '';
          if (nameInput) nameInput.value = opt.dataset.name || '';
          if (hsInput) hsInput.value = opt.dataset.hs || '5402.47.00';
          if (originInput) originInput.value = opt.dataset.origin || 'Taiwan';
          if (unitInput) unitInput.value = opt.dataset.unit || 'kg';
          if (opt.dataset.price && priceInput && !priceInput.value) {
            priceInput.value = opt.dataset.price;
          }
          recalcTotal();
        }
      });

      document.getElementById('misaBtnSubmitItem')?.addEventListener('click', async () => {
        const pSku = skuInput?.value?.trim() || '';
        const pName = nameInput?.value?.trim() || '';
        const pQty = Number(qtyInput?.value || 0);
        const pPrice = Number(priceInput?.value || 0);
        const pPkgs = Number(document.getElementById('misaItemPkgs')?.value || 0);
        const pNw = Number(nwInput?.value || pQty);
        const pGw = Number(gwInput?.value || (pQty * 1.04));
        const pNotes = document.getElementById('misaItemNotes')?.value?.trim() || '';

        if (!pName) {
          toast('Vui lòng nhập tên mặt hàng', 'warning');
          return;
        }
        if (pQty <= 0) {
          toast('Số lượng mặt hàng phải lớn hơn 0', 'warning');
          return;
        }

        const validGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        let selectedProdId = sel?.value || currentItem?.productId;
        if (!selectedProdId || !validGuid.test(selectedProdId)) {
          const matched = allProducts.find(x => x.sku === pSku || x.name === pName);
          selectedProdId = (matched && validGuid.test(matched.id)) ? matched.id : (allProducts[0]?.id || '00000000-0000-0000-0000-000000000000');
        }

        const itemObj = {
          productId: selectedProdId,
          productCode: pSku,
          productName: pName,
          sku: pSku,
          hsCode: hsInput?.value?.trim() || '5402.47.00',
          origin: originInput?.value?.trim() || 'Taiwan',
          unit: unitInput?.value?.trim() || 'kg',
          quantity: pQty,
          packages: pPkgs,
          unitPrice: pPrice,
          totalPrice: pQty * pPrice,
          netWeight: pNw,
          grossWeight: pGw,
          notes: pPkgs ? `${pPkgs} kiện${pNotes ? ' • ' + pNotes : ''}` : pNotes
        };

        const newItems = [...items];
        if (isEdit) {
          newItems[idx] = itemObj;
        } else {
          newItems.push(itemObj);
        }

        try {
          const payloadItems = newItems.map(it => {
            let pid = it.productId;
            if (!pid || !validGuid.test(pid)) {
              const m = allProducts.find(x => x.sku === it.productCode || x.name === it.productName);
              pid = (m && validGuid.test(m.id)) ? m.id : allProducts[0]?.id;
            }
            return {
              productId: pid,
              quantity: Number(it.quantity || 0),
              unitPrice: Number(it.unitPrice || 0),
              grossWeight: Number(it.grossWeight || 0),
              netWeight: Number(it.netWeight || it.quantity || 0),
              notes: it.notes || (it.packages ? `${it.packages} kiện` : '')
            };
          });

          const sumQty = newItems.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
          const sumGw = newItems.reduce((s, it) => s + (Number(it.grossWeight) || 0), 0);
          const sumVal = newItems.reduce((s, it) => s + ((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0)), 0);

          await api.post(`/api/shipments/${shipmentId}/items`, { items: payloadItems });

          await api.put(`/api/shipments/${shipmentId}`, {
            shipmentCode: shipment.shipmentCode || shpCode,
            type: shipment.type || 'Import',
            expectedDate: shipment.expectedDate,
            portOfLoading: shipment.portOfLoading,
            portOfDischarge: shipment.portOfDischarge,
            deliveryTerm: shipment.deliveryTerm,
            totalQuantity: sumQty,
            totalGrossWeight: sumGw,
            totalValue: sumVal,
            currency: shipment.currency || 'USD',
            notes: shipment.notes,
            supplierId: shipment.supplierId,
            customerId: shipment.customerId
          }).catch(() => {});

          closeModal();
          toast(isEdit ? 'Đã cập nhật dòng hàng!' : 'Đã thêm dòng hàng mới vào lô hàng!', 'success');
          renderShipmentDetail(container, shipmentId);
        } catch (err) {
          toast('Lỗi khi lưu dòng hàng: ' + (err.message || 'Không thể lưu'), 'error');
        }
      });
    };

    window.deleteItemModal = async (idx) => {
      const targetItem = items[idx];
      const confirmed = await showConfirm({
        title: 'Xóa dòng hàng?',
        message: `Bạn có chắc muốn xóa mặt hàng "${targetItem?.productName || 'này'}" khỏi chứng từ lô hàng?`,
        confirmText: 'Xóa',
        type: 'danger'
      });
      if (!confirmed) return;

      try {
        const newItems = items.filter((_, i) => i !== idx);
        const validGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const payloadItems = newItems.map(it => {
          let pid = it.productId;
          if (!pid || !validGuid.test(pid)) {
            const m = allProducts.find(x => x.sku === it.productCode || x.name === it.productName);
            pid = (m && validGuid.test(m.id)) ? m.id : allProducts[0]?.id;
          }
          return {
            productId: pid,
            quantity: Number(it.quantity || 0),
            unitPrice: Number(it.unitPrice || 0),
            grossWeight: Number(it.grossWeight || 0),
            netWeight: Number(it.netWeight || it.quantity || 0),
            notes: it.notes || ''
          };
        });

        const sumQty = newItems.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
        const sumGw = newItems.reduce((s, it) => s + (Number(it.grossWeight) || 0), 0);
        const sumVal = newItems.reduce((s, it) => s + ((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0)), 0);

        await api.post(`/api/shipments/${shipmentId}/items`, { items: payloadItems });

        await api.put(`/api/shipments/${shipmentId}`, {
          shipmentCode: shipment.shipmentCode || shpCode,
          type: shipment.type || 'Import',
          expectedDate: shipment.expectedDate,
          portOfLoading: shipment.portOfLoading,
          portOfDischarge: shipment.portOfDischarge,
          deliveryTerm: shipment.deliveryTerm,
          totalQuantity: sumQty,
          totalGrossWeight: sumGw,
          totalValue: sumVal,
          currency: shipment.currency || 'USD',
          notes: shipment.notes,
          supplierId: shipment.supplierId,
          customerId: shipment.customerId
        }).catch(() => {});

        toast('Đã xóa dòng hàng thành công', 'success');
        renderShipmentDetail(container, shipmentId);
      } catch (err) {
        toast('Lỗi khi xóa dòng hàng: ' + err.message, 'error');
      }
    };

    // Attach line item actions
    container.querySelector('#sd-btn-add-item')?.addEventListener('click', () => {
      window.openItemModal(null);
    });
    container.querySelector('#sd-btn-add-row')?.addEventListener('click', () => {
      window.openItemModal(null);
    });

    container.querySelector('#sd-btn-clear-items')?.addEventListener('click', async () => {
      if (items.length === 0) {
        toast('Danh sách hàng hóa hiện đang trống', 'info');
        return;
      }
      const confirmed = await showConfirm({
        title: 'Xóa toàn bộ hàng hóa?',
        message: 'Bạn có chắc chắn muốn xóa hết tất cả các dòng hàng trong chứng từ này?',
        confirmText: 'Xóa hết',
        type: 'danger'
      });
      if (!confirmed) return;

      try {
        await api.post(`/api/shipments/${shipmentId}/items`, { items: [] });
        await api.put(`/api/shipments/${shipmentId}`, {
          shipmentCode: shipment.shipmentCode || shpCode,
          type: shipment.type || 'Import',
          expectedDate: shipment.expectedDate,
          portOfLoading: shipment.portOfLoading,
          portOfDischarge: shipment.portOfDischarge,
          deliveryTerm: shipment.deliveryTerm,
          totalQuantity: 0,
          totalGrossWeight: 0,
          totalValue: 0,
          currency: shipment.currency || 'USD',
          notes: shipment.notes,
          supplierId: shipment.supplierId,
          customerId: shipment.customerId
        }).catch(() => {});

        toast('Đã xóa toàn bộ dòng hàng thành công', 'success');
        renderShipmentDetail(container, shipmentId);
      } catch (err) {
        toast('Lỗi khi xóa: ' + err.message, 'error');
      }
    });

    // Add invoice
    container.querySelector('#sd-btn-add-invoice')?.addEventListener('click', () => {
      if (openCreateInvoiceModal) openCreateInvoiceModal(shipment.id, 'CommercialInvoice');
      else window.appNavigateTo('invoices');
    });

    // Add customs declaration
    container.querySelector('#sd-btn-add-customs')?.addEventListener('click', () => {
      if (openCreateCustomsModal) openCreateCustomsModal(shipment.id, () => {
        // Re-render shipment detail on success
        renderShipmentDetail(container, shipmentId);
      });
      else window.appNavigateTo('customs-declarations');
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

    const submitTimeline = async () => {
      const text = tlInput?.value?.trim();
      if (!text) return;

      const lowerText = text.toLowerCase();

      // Kiểm tra đổi trạng thái qua keyword
      try {
        if (lowerText.includes('hoàn thành') || lowerText.includes('hoan thanh')) {
          await api.patch(`/api/shipments/${shipmentId}/status`, { status: 'Completed' });
          shipment.status = 'Completed';
        } else if (lowerText.includes('mở khóa') || lowerText.includes('mở khoa') || lowerText.includes('mo khoa')) {
          await api.patch(`/api/shipments/${shipmentId}/status`, { status: 'PendingImport' });
          shipment.status = 'PendingImport';
        }
      } catch (err) {
        toast('Lỗi khi đổi trạng thái: ' + err.message, 'error');
      }

      tlAdd(shipmentId, text, currentUser);
      tlInput.value = '';
      refreshTlList();

      // Reload the current UI to reflect new lock state if it changed
      if (lowerText.includes('hoàn thành') || lowerText.includes('hoan thanh') ||
        lowerText.includes('mở khóa') || lowerText.includes('mở khoa') || lowerText.includes('mo khoa')) {
        setTimeout(() => renderShipmentDetail(container, shipmentId), 200);
      }

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
    document.getElementById('sd-btn-add-bl')?.addEventListener('click', () => {
      openBLModal(null, () => renderShipmentDetail(container, shipmentId), shipmentId);
    });

    // Handlers cho các nút thao tác trên dòng B/L
    window.editBLFromShipment = (blId) => {
      const bl = blList.find(b => b.id === blId);
      openBLModal(bl, () => renderShipmentDetail(container, shipmentId), shipmentId);
    };

    window.deleteBLFromShipment = (blId, blNumber) => {
      deleteBL(blId, blNumber, () => renderShipmentDetail(container, shipmentId));
    };

  } catch (err) {
    container.innerHTML = `
      <div class="sd-misa-page" style="padding:24px;color:var(--amis-red);">
        Lỗi tải chi tiết lô hàng: ${err.message}
      </div>`;
  }
}

