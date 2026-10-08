// frontend/src/features/billOfLading/billOfLading.js
/**
 * Quản Lý Vận Đơn Đường Biển (Bill of Lading - B/L)
 * Giao diện chuẩn MISA AMIS 2025 đồng bộ với Shipments (Lô Hàng Nhập/Xuất)
 */
import { api, toast, openModal, closeModal, showConfirm, API_BASE, getToken } from '../../core/api.js';

let currentBLs = [];
let currentFilteredBLs = [];
let selectedId = null;
let currentPage = 1;
let itemsPerPage = 10;

/**
 * Render trang Quản lý Vận Đơn (Bill of Lading - B/L)
 * Chuẩn phong cách MISA AMIS giống /shipments-import
 */
export async function renderBillOfLading(container) {
  selectedId = null;

  container.innerHTML = `
    <div class="grid-card">
      <!-- MISA Toolbar -->
      <div class="misa-toolbar">
        <div class="toolbar-group">
          <!-- Nút Thêm Mới với Icon trắng chuẩn MISA AMIS -->
          <button id="btnBLAdd" class="btn btn-primary" title="Tạo mới vận đơn đường biển">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Thêm Vận Đơn (B/L)
          </button>
          <button id="btnBLEdit" class="btn btn-default" disabled title="Chỉnh sửa vận đơn đã chọn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
            Sửa
          </button>
          <button id="btnBLDetail" class="btn btn-default" disabled title="Xem chi tiết vận đơn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            Chi tiết
          </button>
          <button id="btnBLPrint" class="btn btn-default" disabled title="In bản B/L chuẩn A4">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            In B/L
          </button>
          <button id="btnBLDelete" class="btn btn-default" style="color: var(--amis-red);" disabled title="Xóa vận đơn đã chọn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            Xóa
          </button>
          <button id="btnBLRefresh" class="btn btn-default" title="Nạp lại danh sách dữ liệu">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            Nạp lại
          </button>
          <button id="btnBLExport" class="btn btn-default" title="Xuất danh sách ra file Excel">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
            Xuất khẩu
          </button>
        </div>

        <!-- Right Side Filter Controls (Gọn gàng trên cùng 1 hàng, không bị tràn dòng) -->
        <div class="toolbar-group" style="display: flex; gap: 8px; align-items: center;">
          <select id="filterBLType" class="form-input" style="width: 140px; height: 32px; padding: 4px 8px; font-size: 12.5px;">
            <option value="">Tất cả loại B/L</option>
            <option value="Master B/L">Master B/L (MBL)</option>
            <option value="House B/L">House B/L (HBL)</option>
            <option value="Telex Release">Surrendered / Telex</option>
            <option value="Seaway Bill">Seaway Bill</option>
          </select>
          <select id="filterBLCarrier" class="form-input" style="width: 130px; height: 32px; padding: 4px 8px; font-size: 12.5px;">
            <option value="">Tất cả hãng tàu</option>
            <option value="COSCO">COSCO</option>
            <option value="EVERGREEN">Evergreen</option>
            <option value="ONE">ONE</option>
            <option value="MAERSK">Maersk</option>
            <option value="WAN HAI">Wan Hai</option>
            <option value="SITC">SITC</option>
          </select>
          <input type="text" id="blSearchInput" class="form-input" style="width: 240px; height: 32px; padding: 4px 10px; font-size: 12.5px;" placeholder="Lọc số B/L, tàu, cont, đối tác...">
        </div>
      </div>

      <!-- MISA Grid Scroll Table -->
      <div class="grid-scroll">
        <table class="misa-table" id="blTable">
          <thead>
            <tr>
              <th style="width: 36px; text-align: center;"><input type="checkbox" id="chkAllBL" title="Chọn tất cả"></th>
              <th style="width: 36px; text-align: center;"></th>
              <th>Số Vận Đơn (B/L No.)</th>
              <th>Loại B/L</th>
              <th>Lô Hàng Liên Kết</th>
              <th>Hãng Tàu / Vận Chuyển</th>
              <th>Tên Tàu & Chuyến (Vessel/Voy)</th>
              <th>Cảng Đi ➔ Cảng Đến</th>
              <th>Ngày On-Board</th>
              <th>Container / Seal</th>
              <th style="text-align: right;">Số Lượng (Kiện)</th>
              <th style="text-align: right;">Gross Weight (KG)</th>
              <th>Trạng Thái</th>
              <th style="text-align: center;">File Scan</th>
              <th style="width: 130px; text-align: center;">Thao Tác</th>
            </tr>
          </thead>
          <tbody id="blTbody">
            <tr><td colspan="15" style="text-align: center; padding: 30px; color: var(--amis-text-muted);">Đang tải danh sách vận đơn...</td></tr>
          </tbody>
        </table>
      </div>

      <!-- MISA Pagination Footer -->
      <div class="misa-pagination" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 16px;">
        <div id="blPaginationText">Tổng số: 0 bản ghi</div>
        <div class="pagination-controls" style="display: flex; gap: 8px; align-items: center;">
          <select id="blItemsPerPage" class="form-input" style="width: auto; padding: 2px 8px; height: 28px; font-size: 12px; margin-right: 8px;">
            <option value="10">Hiển thị 10 dòng/trang</option>
            <option value="20">Hiển thị 20 dòng/trang</option>
            <option value="50">Hiển thị 50 dòng/trang</option>
            <option value="100">Hiển thị 100 dòng/trang</option>
          </select>
          <div id="blPaginationButtons" style="display: flex; gap: 4px; align-items: center;"></div>
        </div>
      </div>
    </div>
  `;

  setupBLEvents();
  await loadBLsData();
}

/**
 * Gán sự kiện cho các nút Toolbar và Filter
 */
function setupBLEvents() {
  document.getElementById('btnBLAdd')?.addEventListener('click', () => openBLModal());
  document.getElementById('btnBLEdit')?.addEventListener('click', () => {
    if (selectedId) {
      const bl = currentBLs.find(b => b.id === selectedId);
      if (bl) openBLModal(bl);
    }
  });
  document.getElementById('btnBLDetail')?.addEventListener('click', () => {
    if (selectedId) viewBLDetail(selectedId);
  });
  document.getElementById('btnBLPrint')?.addEventListener('click', () => {
    if (selectedId) printBL(selectedId);
  });
  document.getElementById('btnBLDelete')?.addEventListener('click', () => {
    if (selectedId) {
      const bl = currentBLs.find(b => b.id === selectedId);
      if (bl) deleteBL(selectedId, bl.blNumber);
    }
  });
  document.getElementById('btnBLRefresh')?.addEventListener('click', async () => {
    await loadBLsData();
    toast('Đã nạp lại dữ liệu vận đơn!', 'info');
  });
  document.getElementById('btnBLExport')?.addEventListener('click', () => exportBLExcel());

  // Filter events
  ['filterBLType', 'filterBLCarrier'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', filterBLsData);
  });
  document.getElementById('blSearchInput')?.addEventListener('input', filterBLsData);

  // Items per page
  document.getElementById('blItemsPerPage')?.addEventListener('change', (e) => {
    itemsPerPage = parseInt(e.target.value);
    currentPage = 1;
    renderPaginatedBLs();
  });

  // Check all header checkbox
  const chkAll = document.getElementById('chkAllBL');
  if (chkAll) {
    chkAll.addEventListener('change', (e) => {
      const checkboxes = document.querySelectorAll('.row-checkbox');
      checkboxes.forEach(cb => { cb.checked = e.target.checked; });
      if (e.target.checked && checkboxes.length > 0) {
        selectBLRow(checkboxes[0].value, false);
      } else {
        selectBLRow(null, false);
      }
    });
  }
}

/**
 * Tải dữ liệu B/L từ Backend
 */
async function loadBLsData() {
  const tbody = document.getElementById('blTbody');
  if (!tbody) return;

  try {
    const [invRes, docRes, shpRes] = await Promise.all([
      api.get('/api/invoices'),
      api.get('/api/documents?category=BillOfLading'),
      api.get('/api/shipments')
    ]);

    const invoices = invRes.data?.items || invRes.data || [];
    const blDocs = docRes.data?.items || docRes.data || [];
    const shipments = shpRes.data?.items || shpRes.data || [];

    // Filter B/Ls stored as invoices with type = 'BillOfLading'
    let blList = invoices.filter(i => i.type === 'BillOfLading').map(inv => {
      let meta = {};
      try {
        if (inv.notes && inv.notes.startsWith('{')) meta = JSON.parse(inv.notes);
      } catch (e) {}

      // Find matching document file
      const doc = blDocs.find(d => 
        (d.entityId && d.entityId.toLowerCase() === inv.id.toLowerCase()) ||
        (d.shipmentId && inv.shipmentId && d.shipmentId.toLowerCase() === inv.shipmentId.toLowerCase()) ||
        (inv.invoiceNumber && d.fileName && d.fileName.toLowerCase().includes(inv.invoiceNumber.toLowerCase()))
      );

      const shp = shipments.find(s => s.id === inv.shipmentId);

      return {
        id: inv.id,
        blNumber: inv.invoiceNumber,
        issueDate: inv.invoiceDate,
        shipmentId: inv.shipmentId,
        shipmentCode: inv.shipmentCode || shp?.shipmentCode || '---',
        partnerName: inv.partnerName || shp?.supplierName || shp?.customerName || '---',
        shipmentType: inv.shipmentType || shp?.type || 'Import',
        totalPackages: meta.packages || shp?.totalPackages || 0,
        grossWeight: meta.grossWeight || shp?.totalGrossWeight || 0,
        shippingLine: meta.shippingLine || 'COSCO SHIPPING',
        vesselVoyage: meta.vesselVoyage || (meta.vessel ? `${meta.vessel} / ${meta.voyage || ''}` : 'COSCO PRIDE / 024E'),
        pol: meta.pol || shp?.portOfLoading || 'Shanghai Port, China',
        pod: meta.pod || shp?.portOfDischarge || 'Cat Lai Port, Ho Chi Minh City',
        containerNo: meta.containerNo || 'TGHU9843210',
        sealNo: meta.sealNo || 'SL-88992',
        blType: meta.blType || 'Master B/L',
        freightTerm: inv.paymentTerms || meta.freightTerm || (shp?.deliveryTerm === 'CIF' ? 'Freight Prepaid' : 'Freight Collect'),
        status: meta.status || 'Original',
        docId: doc?.id,
        docName: doc?.originalFileName || doc?.fileName || meta.attachedFileName,
        notes: meta.notes || (inv.notes && !inv.notes.startsWith('{') ? inv.notes : '')
      };
    });

    // Surface document records
    blDocs.forEach(d => {
      const alreadyLinked = blList.some(b => b.docId === d.id || (b.shipmentId && d.shipmentId && b.shipmentId.toLowerCase() === d.shipmentId.toLowerCase()));
      if (!alreadyLinked && d.shipmentCode) {
        const shp = shipments.find(s => s.id === d.shipmentId || s.shipmentCode === d.shipmentCode);
        blList.push({
          id: d.id,
          isDocVirtual: true,
          blNumber: `BL-${d.shipmentCode}-01`,
          issueDate: d.createdAt,
          shipmentId: d.shipmentId,
          shipmentCode: d.shipmentCode,
          partnerName: shp?.supplierName || shp?.customerName || 'LONG CHENG WU TEXTILE CO., LTD',
          shipmentType: shp?.type || 'Import',
          totalPackages: shp?.totalPackages || 222,
          grossWeight: shp?.totalGrossWeight || 22,
          shippingLine: 'COSCO SHIPPING',
          vesselVoyage: 'WAN HAI 311 / S204',
          pol: shp?.portOfLoading || 'Cat Lai Port, Ho Chi Minh City',
          pod: shp?.portOfDischarge || 'Cat Lai Port, Ho Chi Minh City',
          containerNo: 'WHLU9843210',
          sealNo: 'SL-68901',
          blType: 'Master B/L',
          freightTerm: 'Freight Prepaid',
          status: 'Surrendered',
          docId: d.id,
          docName: d.originalFileName || d.fileName,
          notes: d.description || 'Được đồng bộ từ file chứng từ kho'
        });
      }
    });

    // Sample fallback
    if (blList.length === 0 && shipments.length > 0) {
      const shp = shipments[0];
      blList.push({
        id: 'sample-bl-01',
        isSample: true,
        blNumber: 'COSU63289104',
        issueDate: shp.createdAt || new Date().toISOString(),
        shipmentId: shp.id,
        shipmentCode: shp.shipmentCode,
        partnerName: shp.supplierName || 'LONG CHENG WU TEXTILE CO., LTD',
        shipmentType: shp.type || 'Import',
        totalPackages: shp.totalPackages || 222,
        grossWeight: shp.totalGrossWeight || 22,
        shippingLine: 'COSCO SHIPPING',
        vesselVoyage: 'COSCO PRIDE / 024E',
        pol: shp.portOfLoading || 'Shanghai Port, China',
        pod: shp.portOfDischarge || 'Cat Lai Port, Ho Chi Minh City',
        containerNo: 'TGHU9843210',
        sealNo: 'SL-88992',
        blType: 'Master B/L',
        freightTerm: 'Freight Prepaid',
        status: 'Original',
        docId: null,
        docName: null,
        notes: 'Vận đơn đường biển hàng nguyên Container (FCL)'
      });
    }

    currentBLs = blList;
    filterBLsData();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="15" style="text-align: center; color: var(--amis-red); padding: 24px;">Lỗi tải dữ liệu vận đơn: ${err.message}</td></tr>`;
  }
}

/**
 * Bộ lọc dữ liệu bảng
 */
function filterBLsData() {
  const q = document.getElementById('blSearchInput')?.value.toLowerCase().trim() || '';
  const blType = document.getElementById('filterBLType')?.value || '';
  const carrier = document.getElementById('filterBLCarrier')?.value || '';

  let filtered = currentBLs;

  if (q) {
    filtered = filtered.filter(b => {
      const blNum = (b.blNumber || '').toLowerCase();
      const shp = (b.shipmentCode || '').toLowerCase();
      const line = (b.shippingLine || '').toLowerCase();
      const vv = (b.vesselVoyage || '').toLowerCase();
      const cont = (b.containerNo || '').toLowerCase();
      const partner = (b.partnerName || '').toLowerCase();
      return blNum.includes(q) || shp.includes(q) || line.includes(q) || vv.includes(q) || cont.includes(q) || partner.includes(q);
    });
  }

  if (blType) {
    filtered = filtered.filter(b => (b.blType || '').toLowerCase().includes(blType.toLowerCase()));
  }

  if (carrier) {
    filtered = filtered.filter(b => (b.shippingLine || '').toLowerCase().includes(carrier.toLowerCase()));
  }

  currentFilteredBLs = filtered;
  currentPage = 1;
  renderPaginatedBLs();
}

/**
 * Phân trang dữ liệu
 */
function renderPaginatedBLs() {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageItems = currentFilteredBLs.slice(startIndex, endIndex);

  renderBLTable(pageItems);

  const textEl = document.getElementById('blPaginationText');
  if (textEl) {
    textEl.textContent = `Tổng số: ${currentFilteredBLs.length} bản ghi`;
  }

  renderPaginationControls();
  syncToolbarButtons();
}

/**
 * Render dữ liệu vào Table chuẩn MISA AMIS
 */
function renderBLTable(items) {
  const tbody = document.getElementById('blTbody');
  if (!tbody) return;

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="15" style="text-align: center; padding: 24px; color: var(--text-muted);">Không có vận đơn nào phù hợp điều kiện lọc.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(b => {
    const isCurSelected = selectedId === b.id;
    const dateStr = b.issueDate ? new Date(b.issueDate).toLocaleDateString('vi-VN') : '---';

    // Status chip MISA AMIS
    let typeBadge = '<span class="status-chip chip-transit" style="background:#e0f2fe; color:#0369a1;">MBL</span>';
    if (b.blType?.includes('House')) {
      typeBadge = '<span class="status-chip chip-pending" style="background:#fef3c7; color:#b45309;">HBL</span>';
    } else if (b.blType?.includes('Seaway')) {
      typeBadge = '<span class="status-chip chip-delivered" style="background:#f3e8ff; color:#7e22ce;">Seaway</span>';
    } else if (b.blType?.includes('Telex') || b.blType?.includes('Surrender')) {
      typeBadge = '<span class="status-chip chip-completed" style="background:#dcfce7; color:#15803d;">Telex</span>';
    }

    let statusChip = '<span class="status-chip chip-completed">Bản gốc</span>';
    if (b.status === 'Surrendered') statusChip = '<span class="status-chip chip-transit" style="background:#dbeafe; color:#1d4ed8;">Đã Surrender</span>';
    else if (b.status === 'Draft') statusChip = '<span class="status-chip chip-pending">Bản nháp</span>';
    else if (b.status === 'Released') statusChip = '<span class="status-chip chip-delivered" style="background:#f0fdf4; color:#16a34a;">Đã giao hàng</span>';

    const hasFile = !!b.docId;
    const polShort = b.pol?.split(',')[0] || '---';
    const podShort = b.pod?.split(',')[0] || '---';

    return `
      <tr data-id="${b.id}" class="bl-main-row ${isCurSelected ? 'selected' : ''}">
        <td style="text-align: center;">
          <input type="checkbox" class="row-checkbox" value="${b.id}" ${isCurSelected ? 'checked' : ''}>
        </td>
        <td style="text-align: center; cursor: pointer;" class="expand-btn" data-id="${b.id}">
          <svg class="chevron-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transition: transform 0.2s;"><path d="M6 9l6 6 6-6"/></svg>
        </td>
        <td>
          <div style="font-weight: 700; color: var(--amis-blue); font-family: monospace; font-size: 13px; cursor: pointer;" onclick="window.viewBLDetail('${b.id}')" title="Bấm xem chi tiết vận đơn">
            ${b.blNumber}
          </div>
          <div style="font-size: 11px; color: #64748b;">${b.freightTerm || 'Freight Prepaid'}</div>
        </td>
        <td>${typeBadge}</td>
        <td>
          <a href="#" onclick="window.appNavigateTo('shipment-detail', '${b.shipmentId}'); return false;" style="font-weight: 600; color: #1e293b; text-decoration: none;" title="Xem chi tiết lô hàng">
            🚢 ${b.shipmentCode}
          </a>
          <div style="font-size: 11px; color: #64748b; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${b.partnerName}</div>
        </td>
        <td style="font-weight: 600; color: #334155;">
          ${b.shippingLine}
        </td>
        <td>
          <div style="font-weight: 500;">${b.vesselVoyage}</div>
        </td>
        <td>
          <div style="font-size: 12px;">${polShort} ➔ ${podShort}</div>
        </td>
        <td>${dateStr}</td>
        <td>
          <div style="font-size: 12px; font-weight: 600; color: var(--amis-blue); font-family: monospace;">${b.containerNo || '---'}</div>
          <div style="font-size: 11px; color: #64748b;">Seal: ${b.sealNo || '---'}</div>
        </td>
        <td style="text-align: right; font-weight: 600;">
          ${Number(b.totalPackages || 0).toLocaleString()}
        </td>
        <td style="text-align: right; font-weight: 700; color: var(--text-main);">
          ${Number(b.grossWeight || 0).toLocaleString()} kg
        </td>
        <td>${statusChip}</td>
        <td style="text-align: center;">
          ${hasFile ? `
            <button class="btn btn-default btn-sm" onclick="window.downloadBLDoc('${b.docId}', '${b.docName}')" title="Tải file đính kèm: ${b.docName}" style="color: #15803d; border-color: #86efac; background: #f0fdf4; padding: 2px 6px; font-size: 11.5px;">
              📎 ${b.docName.length > 8 ? b.docName.slice(0, 8) + '…' : b.docName}
            </button>
          ` : `<span style="color: #94a3b8; font-size: 12px;">Chưa có</span>`}
        </td>
        <td style="white-space: nowrap; text-align: center;">
          <button class="btn btn-default btn-sm" title="Chi tiết" onclick="window.viewBLDetail('${b.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button>
          <button class="btn btn-default btn-sm" title="Tải xuống" onclick="window.handleDownloadBL('${b.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></button>
          <button class="btn btn-default btn-sm" title="In B/L" onclick="window.printBL('${b.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg></button>
          <button class="btn btn-default btn-sm" title="Sửa" onclick="window.editBL('${b.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg></button>
          <button class="btn btn-default btn-sm" title="Xóa" style="color: var(--amis-red);" onclick="window.deleteBL('${b.id}', '${b.blNumber}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
        </td>
      </tr>

      <!-- Hidden Expandable Sub-Row (Chuẩn MISA AMIS) -->
      <tr id="expand-row-${b.id}" class="expand-row" style="display: none; background-color: #f8fafc; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
        <td colspan="15" style="padding: 0;">
          <div style="padding: 14px 18px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
              <!-- Hải trình -->
              <div style="background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px;">
                <div style="font-weight: 600; color: #475569; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                  <span>⚓</span> Hải Trình & Cảng Biển
                </div>
                <div style="font-size: 12.5px; line-height: 1.6;">
                  <div>• Hãng tàu: <strong>${b.shippingLine}</strong></div>
                  <div>• Tên tàu / Chuyến: <strong>${b.vesselVoyage}</strong></div>
                  <div>• Cảng xếp (POL): <strong>${b.pol}</strong></div>
                  <div>• Cảng dỡ (POD): <strong>${b.pod}</strong></div>
                  <div>• Ngày phát hành: <strong>${dateStr}</strong></div>
                </div>
              </div>

              <!-- Hàng hóa & Container -->
              <div style="background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px;">
                <div style="font-weight: 600; color: #475569; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                  <span>📦</span> Container & Quy Cách Hàng
                </div>
                <div style="font-size: 12.5px; line-height: 1.6;">
                  <div>• Số Container: <strong style="color:var(--amis-blue); font-family:monospace;">${b.containerNo || '---'}</strong></div>
                  <div>• Số Chì (Seal): <strong>${b.sealNo || '---'}</strong></div>
                  <div>• Số lượng kiện: <strong>${Number(b.totalPackages || 0).toLocaleString()} kiện</strong></div>
                  <div>• Tổng Gross Weight: <strong>${Number(b.grossWeight || 0).toLocaleString()} kg</strong></div>
                  <div>• Điều kiện cước: <span class="status-chip chip-delivered" style="padding:1px 6px;">${b.freightTerm}</span></div>
                </div>
              </div>

              <!-- Chứng từ & Ghi chú -->
              <div style="background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px;">
                <div style="font-weight: 600; color: #475569; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                  <span>📋</span> File Đính Kèm & Ghi Chú
                </div>
                <div style="font-size: 12.5px; line-height: 1.6;">
                  <div>• Trạng thái B/L: <strong>${b.status}</strong></div>
                  <div>• File scan đính kèm: <strong>${b.docName || 'Chưa tải lên'}</strong></div>
                  <div style="color: #64748b; margin-top: 4px;">• Ghi chú: ${b.notes || 'Không có ghi chú thêm.'}</div>
                  <div style="margin-top: 8px; display: flex; gap: 6px;">
                    <button class="btn btn-default btn-sm" onclick="window.viewBLDetail('${b.id}')">Xem Bản In B/L</button>
                    ${hasFile ? `<button class="btn btn-default btn-sm" onclick="window.downloadBLDoc('${b.docId}', '${b.docName}')">Tải File Scan</button>` : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Row click & expand event listeners
  tbody.querySelectorAll('.bl-main-row').forEach(tr => {
    tr.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.tagName === 'A') return;
      if (e.target.closest('.expand-btn')) {
        toggleExpandRow(tr.getAttribute('data-id'));
        return;
      }
      selectBLRow(tr.getAttribute('data-id'));
    });
  });
}

/**
 * Mở/đóng dòng mở rộng chi tiết (Expandable row)
 */
function toggleExpandRow(id) {
  const row = document.getElementById(`expand-row-${id}`);
  const btn = document.querySelector(`.expand-btn[data-id="${id}"] .chevron-icon`);
  if (!row) return;

  const isHidden = row.style.display === 'none';
  row.style.display = isHidden ? 'table-row' : 'none';
  if (btn) {
    btn.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
  }
}

/**
 * Chọn 1 dòng trong bảng và đồng bộ các nút Toolbar MISA AMIS
 */
function selectBLRow(id, toggle = true) {
  if (toggle && selectedId === id) {
    selectedId = null;
  } else {
    selectedId = id;
  }

  const tbody = document.getElementById('blTbody');
  if (tbody) {
    tbody.querySelectorAll('.bl-main-row').forEach(tr => {
      const isCur = tr.getAttribute('data-id') === selectedId;
      tr.classList.toggle('selected', isCur);
      const cb = tr.querySelector('.row-checkbox');
      if (cb) cb.checked = isCur;
    });
  }

  syncToolbarButtons();
}

/**
 * Đồng bộ trạng thái Enable/Disable của các nút trên Toolbar
 */
function syncToolbarButtons() {
  const hasSel = !!selectedId;
  const btnEdit = document.getElementById('btnBLEdit');
  const btnDetail = document.getElementById('btnBLDetail');
  const btnPrint = document.getElementById('btnBLPrint');
  const btnDelete = document.getElementById('btnBLDelete');

  if (btnEdit) btnEdit.disabled = !hasSel;
  if (btnDetail) btnDetail.disabled = !hasSel;
  if (btnPrint) btnPrint.disabled = !hasSel;
  if (btnDelete) btnDelete.disabled = !hasSel;
}

/**
 * Tạo các nút phân trang
 */
function renderPaginationControls() {
  const container = document.getElementById('blPaginationButtons');
  if (!container) return;

  const totalPages = Math.ceil(currentFilteredBLs.length / itemsPerPage) || 1;
  container.innerHTML = '';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'btn btn-default btn-sm';
  prevBtn.textContent = 'Trước';
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => { currentPage--; renderPaginatedBLs(); };
  container.appendChild(prevBtn);

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
      const pageBtn = document.createElement('button');
      pageBtn.className = `btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-default'}`;
      pageBtn.textContent = i;
      pageBtn.onclick = () => { currentPage = i; renderPaginatedBLs(); };
      container.appendChild(pageBtn);
    } else if (i === currentPage - 3 || i === currentPage + 3) {
      const dots = document.createElement('span');
      dots.textContent = '...';
      dots.style.padding = '0 4px';
      dots.style.color = '#94a3b8';
      container.appendChild(dots);
    }
  }

  const nextBtn = document.createElement('button');
  nextBtn.className = 'btn btn-default btn-sm';
  nextBtn.textContent = 'Sau';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.onclick = () => { currentPage++; renderPaginatedBLs(); };
  container.appendChild(nextBtn);
}

/**
 * Xuất dữ liệu B/L ra Excel qua SheetJS
 */
export function exportBLExcel() {
  if (currentFilteredBLs.length === 0) {
    toast('Không có dữ liệu vận đơn để xuất Excel!', 'warning');
    return;
  }

  if (typeof XLSX === 'undefined') {
    toast('Thư viện SheetJS chưa được tải!', 'error');
    return;
  }

  try {
    const excelData = currentFilteredBLs.map((b, index) => ({
      'STT': index + 1,
      'Số Vận Đơn (B/L No.)': b.blNumber,
      'Loại B/L': b.blType || 'Master B/L',
      'Mã Lô Hàng': b.shipmentCode || '---',
      'Đối Tác': b.partnerName || '---',
      'Loại Lô Hàng': b.shipmentType === 'Export' ? 'Xuất khẩu' : 'Nhập khẩu',
      'Hãng Tàu': b.shippingLine || '---',
      'Tên Tàu & Chuyến': b.vesselVoyage || '---',
      'Cảng Đi (POL)': b.pol || '---',
      'Cảng Đến (POD)': b.pod || '---',
      'Ngày Phát Hành / On-Board': b.issueDate ? new Date(b.issueDate).toLocaleDateString('vi-VN') : '---',
      'Số Container': b.containerNo || '---',
      'Số Chì (Seal No.)': b.sealNo || '---',
      'Số Kiện': b.totalPackages || 0,
      'Gross Weight (KG)': b.grossWeight || 0,
      'Điều Kiện Cước': b.freightTerm || 'Freight Prepaid',
      'Trạng Thái': b.status || 'Original',
      'File Scan': b.docName || 'Chưa đính kèm',
      'Ghi Chú': b.notes || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Van_Don_BL');

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    XLSX.writeFile(workbook, `Danh_Sach_Van_Don_BL_${todayStr}.xlsx`);
    toast(`Đã xuất ${currentFilteredBLs.length} vận đơn ra Excel thành công!`, 'success');
  } catch (err) {
    toast(`Lỗi khi xuất file Excel: ${err.message}`, 'error');
  }
}
window.exportBLExcel = exportBLExcel;

/**
 * Modal Xem Chi Tiết Vận Đơn Quốc Tế (Bill of Lading Viewer)
 */
export async function viewBLDetail(blId, blData = null) {
  let bl = blData || currentBLs.find(b => b.id === blId);
  if (!bl && blId) {
    try {
      const res = await api.get(`/api/invoices/${blId}`);
      const inv = res.data;
      if (inv) {
        let meta = {};
        try { if (inv.notes && inv.notes.startsWith('{')) meta = JSON.parse(inv.notes); } catch (e) {}
        bl = {
          id: inv.id,
          blNumber: inv.invoiceNumber,
          issueDate: inv.invoiceDate,
          shipmentId: inv.shipmentId,
          shipmentCode: inv.shipmentCode || '---',
          partnerName: inv.partnerName || '---',
          shippingLine: meta.shippingLine || 'COSCO SHIPPING',
          vesselVoyage: meta.vesselVoyage || 'COSCO PRIDE / 024E',
          pol: meta.pol || 'Shanghai Port, China',
          pod: meta.pod || 'Cat Lai Port, Ho Chi Minh City',
          containerNo: meta.containerNo || 'TGHU9843210',
          sealNo: meta.sealNo || 'SL-88992',
          totalPackages: meta.packages || 0,
          grossWeight: meta.grossWeight || 0,
          blType: meta.blType || 'Master B/L',
          freightTerm: inv.paymentTerms || meta.freightTerm || 'Freight Prepaid',
          status: meta.status || 'Original',
          notes: meta.notes || ''
        };
      }
    } catch(e) {}
  }
  if (!bl) return;

  const content = `
    <div style="padding: 10px 0;">
      <div class="bl-doc-container" id="bl-print-area">
        <!-- 1. B/L Official Header -->
        <div class="bl-doc-header">
          <div>
            <div class="bl-doc-carrier-brand">${bl.shippingLine}</div>
            <div class="bl-doc-carrier-sub">BILL OF LADING FOR OCEAN TRANSPORT OR MULTIMODAL TRANSPORT</div>
            <div class="bl-doc-type-text">Standard BIMCO / FIATA Format • Negotiable Ocean Bill of Lading</div>
          </div>
          <div class="bl-doc-number-box">
            <div class="bl-doc-number-label">B/L NUMBER (SỐ VẬN ĐƠN)</div>
            <div class="bl-doc-number-val">${bl.blNumber}</div>
            <div style="margin-top: 4px; display: flex; gap: 4px; justify-content: flex-end;">
              <span class="status-chip chip-transit" style="background:#e0f2fe; color:#0369a1; font-weight:700;">${bl.blType}</span>
              <span class="status-chip chip-completed" style="font-weight:700;">${bl.status}</span>
            </div>
          </div>
        </div>

        <!-- 2. Parties Grid (Shipper, Consignee) -->
        <div class="bl-doc-grid-2">
          <div class="bl-doc-box">
            <div class="bl-doc-box-label">SHIPPER / CONSIGNOR (NGƯỜI GỬI HÀNG):</div>
            <div class="bl-doc-box-title">${bl.partnerName}</div>
            <div class="bl-doc-box-sub">NO. 128, GONGYE 2ND RD., DOULIU CITY, YUNLIN COUNTY 640, TAIWAN<br>TEL: +886 5 551 8899 | TAX CODE: TW89234102</div>
          </div>
          <div class="bl-doc-box">
            <div class="bl-doc-box-label">CONSIGNEE (NGƯỜI NHẬN HÀNG):</div>
            <div class="bl-doc-box-title">CONG TY TNHH XUAT NHAP KHAU IMEX N VIETNAM</div>
            <div class="bl-doc-box-sub">CAT LAI INDUSTRIAL ZONE, THU DUC CITY, HO CHI MINH CITY, VIETNAM<br>TAX CODE: 0318992011 | EMAIL: LOGISTICS@IMEXN.COM</div>
          </div>
        </div>

        <!-- 3. Notify Party -->
        <div class="bl-doc-box" style="border-bottom: 1px solid #cbd5e1; background: #fafafa;">
          <div class="bl-doc-box-label">NOTIFY PARTY (BÊN ĐƯỢC THÔNG BÁO HÀNG ĐẾN):</div>
          <div style="font-size: 12px; font-weight: 700; color: #0f172a;">SAME AS CONSIGNEE (HOẶC ĐẠI LÝ FORWARDER TẠI CẢNG ĐÍCH)</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Lô hàng liên kết: <strong>${bl.shipmentCode}</strong></div>
        </div>

        <!-- 4. Vessel, POL, POD Grid -->
        <div class="bl-doc-grid-4">
          <div class="bl-doc-box">
            <div class="bl-doc-box-label">OCEAN VESSEL & VOY NO.</div>
            <div style="font-size: 12.5px; font-weight: 800; color: #0369a1;">${bl.vesselVoyage}</div>
          </div>
          <div class="bl-doc-box">
            <div class="bl-doc-box-label">PORT OF LOADING (POL)</div>
            <div style="font-size: 12px; font-weight: 700; color: #0f172a;">${bl.pol}</div>
          </div>
          <div class="bl-doc-box">
            <div class="bl-doc-box-label">PORT OF DISCHARGE (POD)</div>
            <div style="font-size: 12px; font-weight: 700; color: #0f172a;">${bl.pod}</div>
          </div>
          <div class="bl-doc-box">
            <div class="bl-doc-box-label">PLACE OF DELIVERY</div>
            <div style="font-size: 12px; font-weight: 700; color: #0f172a;">Cat Lai CY / ICD, Vietnam</div>
          </div>
        </div>

        <!-- 5. Cargo Table -->
        <table class="bl-doc-table-cargo">
          <thead>
            <tr>
              <th style="width: 25%;">Container No. / Seal No.</th>
              <th style="width: 15%;">Marks & Numbers</th>
              <th style="width: 35%;">No. of Packages & Description of Goods</th>
              <th style="width: 13%; text-align: right;">Gross Weight</th>
              <th style="width: 12%; text-align: right;">Measurement</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div style="font-family: monospace; font-size: 13px; font-weight: 800; color: #0284c7;">${bl.containerNo || 'TGHU9843210'}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 3px;">Seal No: <strong>${bl.sealNo || 'SL-88992'}</strong></div>
                <div style="font-size: 10.5px; color: #475569; margin-top: 2px;">40' High Cube Dry (40HQ)</div>
              </td>
              <td>
                <div style="font-weight: 700;">N/M</div>
                <div style="font-size: 10.5px; color: #64748b;">(SHP: ${bl.shipmentCode})</div>
              </td>
              <td>
                <div style="font-weight: 800; color: #0f172a;">${bl.totalPackages || 222} PACKAGES / KIỆN</div>
                <div style="color: #334155; margin-top: 2px;">100% POLYESTER FILAMENT YARN (SỢI DỆT CÔNG NGHIỆP)</div>
                <div style="font-size: 10.5px; color: #64748b; margin-top: 3px; font-style: italic;">SAID TO CONTAIN / SHIPPED ON BOARD CLEAN</div>
              </td>
              <td style="text-align: right;">
                <div style="font-weight: 800; color: #0f172a; font-size: 12.5px;">${Number(bl.grossWeight || 22).toLocaleString()} KGS</div>
                <div style="font-size: 10.5px; color: #64748b;">Net: ${(Number(bl.grossWeight || 22) * 0.95).toFixed(0)} KGS</div>
              </td>
              <td style="text-align: right; font-weight: 700; color: #0f172a;">
                15.50 CBM
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 6. Freight Details & Issue Information -->
        <div class="bl-doc-footer-meta">
          <div class="bl-doc-box">
            <div class="bl-doc-box-label">FREIGHT & CHARGES</div>
            <div style="font-size: 12.5px; font-weight: 800; color: #15803d;">${bl.freightTerm}</div>
            <div style="font-size: 10.5px; color: #64748b; margin-top: 2px;">Freight payable at destination / origin</div>
          </div>
          <div class="bl-doc-box">
            <div class="bl-doc-box-label">SHIPPED ON BOARD DATE</div>
            <div style="font-size: 12.5px; font-weight: 700; color: #0f172a;">${bl.issueDate ? new Date(bl.issueDate).toLocaleDateString('vi-VN') : '---'}</div>
            <div style="font-size: 10.5px; color: #64748b; margin-top: 2px;">Originals: 3/3 (THREE ORIGINAL B/L)</div>
          </div>
          <div class="bl-doc-box">
            <div class="bl-doc-box-label">PLACE & DATE OF ISSUE</div>
            <div style="font-size: 12px; font-weight: 700; color: #0f172a;">Cat Lai, ${bl.issueDate ? new Date(bl.issueDate).toLocaleDateString('vi-VN') : '---'}</div>
          </div>
        </div>

        <!-- 7. Stamp & Signature Block -->
        <div class="bl-doc-sign-area">
          <div>
            <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">SPECIAL INSTRUCTIONS / NOTES:</div>
            <div style="font-size: 11px; color: #334155; max-width: 450px; margin-top: 2px;">${bl.notes || 'Hàng nguyên container FCL/FCL. Miễn phí lưu bãi DEM/DET 14 ngày tại cảng đến.'}</div>
          </div>
          <div class="bl-doc-stamp-box">
            <div>SIGNED FOR THE CARRIER</div>
            <div style="font-weight: 800; font-size: 12px; margin-top: 2px;">${bl.shippingLine}</div>
            <div style="font-size: 10px; color: #64748b;">AS CARRIER / AUTHORIZED AGENT</div>
          </div>
        </div>

        ${bl.docName ? `
          <div style="padding: 10px 16px; background: #f0fdf4; border-top: 1px dashed #86efac; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: 700; color: #15803d; font-size: 12px;">📎 File Scan Đính Kèm:</span>
              <span style="font-weight: 600; font-size: 12px; color: #1e293b;">${bl.docName}</span>
            </div>
            ${bl.docId ? `
              <button class="btn btn-default btn-sm" style="color:#15803d; border-color:#86efac;" onclick="window.downloadBLDoc('${bl.docId}', '${bl.docName}')">
                📥 Tải File Scan B/L
              </button>
            ` : ''}
          </div>
        ` : ''}
      </div>

      <!-- Bottom Actions Toolbar (No-Print) -->
      <div class="no-print" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; max-width: 860px; margin-left: auto; margin-right: auto;">
        <button class="btn btn-default" onclick="window.handleDownloadBL('${bl.id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Tải Dữ Liệu B/L
        </button>
        <button class="btn btn-default" onclick="window.printBL('${bl.id}')">
          🖨️ In Khổ A4 Chuẩn
        </button>
        <button class="btn btn-primary" onclick="window.editBL('${bl.id}')" style="color: #ffffff;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
          Chỉnh Sửa
        </button>
        <button class="btn btn-default" id="btn-close-bl-view">
          Đóng
        </button>
      </div>
    </div>
  `;

  openModal(`Chi Tiết Vận Đơn Đường Biển: ${bl.blNumber}`, content);
  document.getElementById('btn-close-bl-view')?.addEventListener('click', closeModal);
}
window.viewBLDetail = viewBLDetail;

/**
 * Tải file đính kèm của B/L
 */
window.downloadBLDoc = async function(docId, fileName) {
  try {
    const token = getToken();
    const res = await fetch(`${API_BASE}/api/documents/${docId}/download`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Không thể tải file đính kèm');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'Bill_of_Lading_File';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    toast('Đã tải file B/L thành công!', 'success');
  } catch (err) {
    toast(`Lỗi khi tải file: ${err.message}`, 'error');
  }
};

/**
 * Tải dữ liệu B/L
 */
window.handleDownloadBL = async function(blId, blData = null) {
  let bl = blData || currentBLs.find(b => b.id === blId);
  if (!bl && blId) {
    try {
      const [invRes, docRes] = await Promise.all([
        api.get(`/api/invoices/${blId}`).catch(() => null),
        api.get(`/api/documents?entityType=Invoice&entityId=${blId}`).catch(() => ({ data: [] }))
      ]);
      const inv = invRes?.data;
      const docs = docRes?.data?.items || docRes?.data || [];
      if (inv) {
        let meta = {};
        try { if (inv.notes && inv.notes.startsWith('{')) meta = JSON.parse(inv.notes); } catch (e) {}
        bl = {
          id: inv.id,
          blNumber: inv.invoiceNumber,
          issueDate: inv.invoiceDate,
          shipmentId: inv.shipmentId,
          shipmentCode: inv.shipmentCode || '---',
          partnerName: inv.partnerName || '---',
          shippingLine: meta.shippingLine || 'COSCO SHIPPING',
          vesselVoyage: meta.vesselVoyage || 'COSCO PRIDE / 024E',
          pol: meta.pol || 'Shanghai Port, China',
          pod: meta.pod || 'Cat Lai Port, Ho Chi Minh City',
          containerNo: meta.containerNo || 'TGHU9843210',
          sealNo: meta.sealNo || 'SL-88992',
          totalPackages: meta.packages || 0,
          grossWeight: meta.grossWeight || 0,
          blType: meta.blType || 'Master B/L',
          freightTerm: inv.paymentTerms || meta.freightTerm || 'Freight Prepaid',
          status: meta.status || 'Original',
          docId: docs[0]?.id,
          docName: docs[0]?.originalFileName || docs[0]?.fileName,
          notes: meta.notes || ''
        };
      }
    } catch(e) {}
  }
  if (!bl) return;

  if (bl.docId) {
    await window.downloadBLDoc(bl.docId, bl.docName);
  } else {
    toast(`Đang xuất dữ liệu vận đơn ${bl.blNumber}...`, 'info');
    const content = `================================================================================
                    BILL OF LADING FOR OCEAN TRANSPORT
                          ${bl.shippingLine}
================================================================================
B/L NUMBER:          ${bl.blNumber}
B/L TYPE:            ${bl.blType}
STATUS:              ${bl.status}
FREIGHT TERM:        ${bl.freightTerm}
ISSUE DATE:          ${bl.issueDate ? new Date(bl.issueDate).toLocaleDateString('vi-VN') : 'N/A'}

SHIPPER:             ${bl.partnerName}
CONSIGNEE:           CONG TY TNHH XUAT NHAP KHAU IMEX N VIETNAM
NOTIFY PARTY:        SAME AS CONSIGNEE

VESSEL / VOYAGE:     ${bl.vesselVoyage}
PORT OF LOADING:     ${bl.pol}
PORT OF DISCHARGE:   ${bl.pod}
PLACE OF DELIVERY:   Cat Lai CY, Ho Chi Minh City, Vietnam

CONTAINER NO.:       ${bl.containerNo}
SEAL NO.:            ${bl.sealNo}
TOTAL PACKAGES:      ${bl.totalPackages} PACKAGES / KIEN
GROSS WEIGHT:        ${bl.grossWeight} KGS
MEASUREMENT:         15.50 CBM
GOODS DESCRIPTION:   100% POLYESTER FILAMENT YARN (SOI DET CONG NGHIEP)
LINKED SHIPMENT:     ${bl.shipmentCode}
NOTES:               ${bl.notes || 'None'}
================================================================================
Signed for the Carrier: ${bl.shippingLine}
`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bill_of_Lading_${bl.blNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    toast(`Đã tải chứng từ vận đơn ${bl.blNumber} thành công!`, 'success');
  }
};

/**
 * In B/L khổ A4 chuẩn
 */
window.printBL = function(blId) {
  const printContent = document.getElementById('bl-print-area');
  if (printContent) {
    window.print();
  } else {
    window.viewBLDetail(blId);
    setTimeout(() => window.print(), 350);
  }
};

/**
 * Mở modal chỉnh sửa B/L
 */
window.editBL = function(blId) {
  const bl = currentBLs.find(b => b.id === blId);
  openBLModal(bl);
};

/**
 * Mở modal tạo mới hoặc chỉnh sửa B/L
 */
export async function openBLModal(bl = null, onSaved = null, defaultShipmentId = null) {
  const isEdit = !!bl;
  let shipments = [];
  try {
    const res = await api.get('/api/shipments');
    shipments = res.data?.items || res.data || [];
  } catch (e) {}

  const targetShipmentId = bl?.shipmentId || defaultShipmentId;
  const shpOptions = shipments.map(s => `
    <option value="${s.id}" ${s.id === targetShipmentId ? 'selected' : ''} 
      data-code="${s.shipmentCode}" 
      data-pol="${s.portOfLoading || ''}" 
      data-pod="${s.portOfDischarge || ''}" 
      data-partner="${s.supplierName || s.customerName || ''}"
      data-gw="${s.totalGrossWeight || ''}"
      data-qty="${s.totalQuantity || ''}">
      ${s.shipmentCode} - ${s.supplierName || s.customerName || 'Lô hàng'} (${s.type === 'Export' ? 'Xuất khẩu' : 'Nhập khẩu'})
    </option>
  `).join('');

  const defaultDate = bl?.issueDate ? bl.issueDate.split('T')[0] : new Date().toISOString().split('T')[0];

  const content = `
    <form id="form-bl" style="display: flex; flex-direction: column; gap: 14px; max-width: 820px;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div>
          <label class="form-label" style="font-weight: 600;">Lô Hàng Liên Kết *</label>
          <select id="bl-shipment-id" class="form-input" required style="width: 100%;">
            <option value="">-- Chọn lô hàng liên kết --</option>
            ${shpOptions}
          </select>
        </div>
        <div>
          <label class="form-label" style="font-weight: 600;">Số Vận Đơn (B/L Number) *</label>
          <input type="text" id="bl-number" class="form-input" required placeholder="VD: COSU63289104, ONE12345678..." value="${bl?.blNumber || ''}" style="width: 100%; font-family: monospace; font-weight: 700; color: var(--amis-blue);">
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
        <div>
          <label class="form-label" style="font-weight: 600;">Loại Vận Đơn (B/L Type)</label>
          <select id="bl-type" class="form-input" style="width: 100%;">
            <option value="Master B/L" ${bl?.blType === 'Master B/L' ? 'selected' : ''}>Master B/L (MBL)</option>
            <option value="House B/L" ${bl?.blType === 'House B/L' ? 'selected' : ''}>House B/L (HBL)</option>
            <option value="Telex Release" ${bl?.blType === 'Telex Release' ? 'selected' : ''}>Surrendered / Telex Release</option>
            <option value="Seaway Bill" ${bl?.blType === 'Seaway Bill' ? 'selected' : ''}>Seaway Bill</option>
          </select>
        </div>
        <div>
          <label class="form-label" style="font-weight: 600;">Hãng Tàu / Vận Chuyển</label>
          <input type="text" id="bl-shipping-line" class="form-input" placeholder="COSCO, EVERGREEN, ONE, MAERSK..." value="${bl?.shippingLine || 'COSCO SHIPPING'}" style="width: 100%;">
        </div>
        <div>
          <label class="form-label" style="font-weight: 600;">Tên Tàu & Chuyến (Vessel/Voy)</label>
          <input type="text" id="bl-vessel-voyage" class="form-input" placeholder="VD: COSCO PRIDE / 024E" value="${bl?.vesselVoyage || ''}" style="width: 100%;">
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
        <div>
          <label class="form-label" style="font-weight: 600;">Cảng Xếp Hàng (POL)</label>
          <input type="text" id="bl-pol" class="form-input" placeholder="Cảng xếp hàng..." value="${bl?.pol || 'Shanghai Port, China'}" style="width: 100%;">
        </div>
        <div>
          <label class="form-label" style="font-weight: 600;">Cảng Dỡ Hàng (POD)</label>
          <input type="text" id="bl-pod" class="form-input" placeholder="Cảng dỡ hàng..." value="${bl?.pod || 'Cat Lai Port, Ho Chi Minh City'}" style="width: 100%;">
        </div>
        <div>
          <label class="form-label" style="font-weight: 600;">Ngày On-Board / Phát Hành</label>
          <input type="date" id="bl-issue-date" class="form-input" value="${defaultDate}" style="width: 100%;">
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px;">
        <div>
          <label class="form-label" style="font-weight: 600;">Số Container</label>
          <input type="text" id="bl-container-no" class="form-input" placeholder="TGHU9843210..." value="${bl?.containerNo || ''}" style="width: 100%; font-family: monospace;">
        </div>
        <div>
          <label class="form-label" style="font-weight: 600;">Số Chì (Seal No.)</label>
          <input type="text" id="bl-seal-no" class="form-input" placeholder="SL-88992..." value="${bl?.sealNo || ''}" style="width: 100%;">
        </div>
        <div>
          <label class="form-label" style="font-weight: 600;">Số Kiện (Packages)</label>
          <input type="number" id="bl-packages" class="form-input" placeholder="222" value="${bl?.totalPackages || ''}" style="width: 100%;">
        </div>
        <div>
          <label class="form-label" style="font-weight: 600;">Tổng GW (kg)</label>
          <input type="number" step="0.01" id="bl-gw" class="form-input" placeholder="22" value="${bl?.grossWeight || ''}" style="width: 100%;">
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div>
          <label class="form-label" style="font-weight: 600;">Điều Kiện Cước (Freight)</label>
          <select id="bl-freight-term" class="form-input" style="width: 100%;">
            <option value="Freight Prepaid" ${bl?.freightTerm === 'Freight Prepaid' ? 'selected' : ''}>Freight Prepaid (Cước trả trước - CIF, CFR)</option>
            <option value="Freight Collect" ${bl?.freightTerm === 'Freight Collect' ? 'selected' : ''}>Freight Collect (Cước trả sau - FOB, EXW)</option>
          </select>
        </div>
        <div>
          <label class="form-label" style="font-weight: 600;">Trạng Thái Vận Đơn</label>
          <select id="bl-status" class="form-input" style="width: 100%;">
            <option value="Original" ${bl?.status === 'Original' ? 'selected' : ''}>Original (Bản gốc)</option>
            <option value="Surrendered" ${bl?.status === 'Surrendered' ? 'selected' : ''}>Surrendered (Đã điện giao / Telex)</option>
            <option value="Released" ${bl?.status === 'Released' ? 'selected' : ''}>Released (Đã giao hàng)</option>
            <option value="Draft" ${bl?.status === 'Draft' ? 'selected' : ''}>Draft (Bản nháp)</option>
          </select>
        </div>
      </div>

      <div>
        <label class="form-label" style="font-weight: 600;">Đính Kèm File Scan B/L (PDF, Ảnh, File)</label>
        <input type="file" id="bl-file" class="form-input" style="width: 100%; padding: 4px;">
        ${bl?.docName ? `<div style="font-size: 11px; color: #15803d; margin-top: 4px;">📎 File hiện tại: <strong>${bl.docName}</strong> (chọn file mới nếu muốn thay thế)</div>` : `<span style="font-size: 11px; color: #64748b;">Hệ thống sẽ tự động lưu file vào Kho chứng từ danh mục "Vận đơn (B/L)".</span>`}
      </div>

      <div>
        <label class="form-label" style="font-weight: 600;">Ghi Chú</label>
        <textarea id="bl-notes" class="form-input" rows="2" style="width: 100%; resize: vertical;" placeholder="Ghi chú về đại lý giao nhận, điều kiện trả vỏ container, free time DEM/DET...">${bl?.notes || ''}</textarea>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px;">
        <button type="button" class="btn btn-default" id="btn-cancel-bl">Hủy Bỏ</button>
        <!-- Nút Submit với Icon Trắng chuẩn MISA AMIS -->
        <button type="submit" class="btn btn-primary" style="color: #ffffff;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          ${isEdit ? 'Lưu Thay Đổi' : 'Tạo Vận Đơn'}
        </button>
      </div>
    </form>
  `;

  openModal(isEdit ? `Chỉnh Sửa Vận Đơn: ${bl.blNumber}` : 'Tạo Mới Vận Đơn Đường Biển (Bill of Lading)', content);

  // Auto-fill from shipment change
  const selShp = document.getElementById('bl-shipment-id');
  selShp?.addEventListener('change', (e) => {
    const sel = e.target;
    const opt = sel.options[sel.selectedIndex];
    if (opt && opt.value) {
      const pol = opt.getAttribute('data-pol');
      const pod = opt.getAttribute('data-pod');
      const gw = opt.getAttribute('data-gw');
      const qty = opt.getAttribute('data-qty');
      const code = opt.getAttribute('data-code');

      if (pol && !document.getElementById('bl-pol').value) document.getElementById('bl-pol').value = pol;
      if (pod && !document.getElementById('bl-pod').value) document.getElementById('bl-pod').value = pod;
      if (gw && !document.getElementById('bl-gw').value) document.getElementById('bl-gw').value = gw;
      if (qty && !document.getElementById('bl-packages').value) document.getElementById('bl-packages').value = qty;
      if (code && !document.getElementById('bl-number').value) document.getElementById('bl-number').value = `COSU-${code}`;
    }
  });

  if (!isEdit && targetShipmentId && selShp) {
    selShp.dispatchEvent(new Event('change'));
  }

  document.getElementById('btn-cancel-bl')?.addEventListener('click', closeModal);

  document.getElementById('form-bl')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const shipmentId = document.getElementById('bl-shipment-id').value;
    const blNumber = document.getElementById('bl-number').value.trim();
    if (!shipmentId) { toast('Vui lòng chọn lô hàng liên kết!', 'warning'); return; }
    if (!blNumber) { toast('Vui lòng nhập số vận đơn B/L!', 'warning'); return; }

    const meta = {
      blType: document.getElementById('bl-type').value,
      shippingLine: document.getElementById('bl-shipping-line').value.trim(),
      vesselVoyage: document.getElementById('bl-vessel-voyage').value.trim(),
      pol: document.getElementById('bl-pol').value.trim(),
      pod: document.getElementById('bl-pod').value.trim(),
      containerNo: document.getElementById('bl-container-no').value.trim(),
      sealNo: document.getElementById('bl-seal-no').value.trim(),
      packages: parseFloat(document.getElementById('bl-packages').value) || 0,
      grossWeight: parseFloat(document.getElementById('bl-gw').value) || 0,
      freightTerm: document.getElementById('bl-freight-term').value,
      status: document.getElementById('bl-status').value,
      notes: document.getElementById('bl-notes').value.trim()
    };

    const payload = {
      invoiceNumber: blNumber,
      invoiceDate: document.getElementById('bl-issue-date').value ? new Date(document.getElementById('bl-issue-date').value).toISOString() : new Date().toISOString(),
      type: 'BillOfLading',
      paymentTerms: meta.freightTerm,
      currency: 'USD',
      notes: JSON.stringify(meta),
      shipmentId: shipmentId,
      items: []
    };

    try {
      let savedInvoiceId = bl?.id;
      if (isEdit && !bl.isSample && !bl.isDocVirtual) {
        await api.put(`/api/invoices/${bl.id}`, payload);
      } else {
        const createRes = await api.post('/api/invoices', payload);
        savedInvoiceId = createRes.data?.id;
      }

      // Upload file if selected
      const fileInput = document.getElementById('bl-file');
      if (fileInput?.files?.[0]) {
        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('File', file);
        formData.append('Category', 'BillOfLading');
        formData.append('ShipmentId', shipmentId);
        if (savedInvoiceId) {
          formData.append('EntityType', 'Invoice');
          formData.append('EntityId', savedInvoiceId);
        }
        formData.append('Description', `Vận đơn B/L: ${blNumber}`);

        const token = getToken();
        await fetch(`${API_BASE}/api/documents/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
      }

      closeModal();
      toast(isEdit ? `Cập nhật vận đơn ${blNumber} thành công!` : `Tạo mới vận đơn ${blNumber} thành công!`, 'success');
      if (onSaved) onSaved();
      await loadBLsData();
    } catch (err) {
      toast(`Lỗi khi lưu vận đơn: ${err.message}`, 'error');
    }
  });
}
window.openBLModal = openBLModal;

/**
 * Xóa 1 B/L với modal xác nhận chuẩn đẹp
 */
export async function deleteBL(blId, blNumber, onDeleted = null) {
  const isConfirm = await showConfirm({
    title: 'Xóa Vận Đơn Đường Biển',
    message: 'Bạn có chắc chắn muốn xóa chứng từ vận đơn này khỏi hệ thống?',
    highlight: blNumber,
    type: 'danger',
    confirmText: 'Xóa Vận Đơn'
  });
  if (!isConfirm) return;

  try {
    const bl = currentBLs.find(b => b.id === blId);
    if (bl && !bl.isSample && !bl.isDocVirtual) {
      await api.delete(`/api/invoices/${blId}`);
    } else if (bl?.isDocVirtual) {
      await api.delete(`/api/documents/${blId}`);
    } else {
      await api.delete(`/api/invoices/${blId}`).catch(() => api.delete(`/api/documents/${blId}`));
    }
    toast(`Đã xóa vận đơn ${blNumber} thành công!`, 'success');
    if (onDeleted) onDeleted();
    selectedId = null;
    await loadBLsData();
  } catch (err) {
    toast(`Lỗi khi xóa: ${err.message}`, 'error');
  }
}
window.deleteBL = deleteBL;
