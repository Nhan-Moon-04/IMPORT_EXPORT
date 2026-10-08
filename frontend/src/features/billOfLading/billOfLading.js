// frontend/src/features/billOfLading/billOfLading.js
import { api, toast, openModal, closeModal, showConfirm, API_BASE, getToken } from '../../core/api.js';

let currentBLs = [];
let currentFilteredBLs = [];
let currentPage = 1;
let itemsPerPage = 10;

/**
 * Render trang Quản lý Vận Đơn (Bill of Lading - B/L)
 */
export async function renderBillOfLading(container) {
  container.innerHTML = `
    <div class="grid-card">
      <!-- MISA Toolbar -->
      <div class="misa-toolbar">
        <div class="toolbar-group">
          <button class="btn btn-primary" id="btn-add-bl">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Tạo Mới Vận Đơn (B/L)
          </button>
          <button class="btn btn-default" id="btn-refresh-bl">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            Nạp Lại
          </button>
          <span id="bl-selected-count" style="display:none; margin-left: 15px; font-weight: 600; font-size: 13px; align-items:center;">Đã chọn: 0</span>
          <button class="btn btn-default btn-sm" id="btn-bulk-delete-bl" style="display:none; align-items:center; color: #ef4444; border-color: #ef4444; padding: 4px 10px; margin-left: 10px;" title="Xóa dữ liệu đã chọn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 5px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            Xóa
          </button>
        </div>
        <div class="toolbar-group" style="display:flex; gap:10px; flex-wrap:wrap;">
          <input type="date" id="filter-bl-from" class="form-input" title="Từ ngày phát hành">
          <input type="date" id="filter-bl-to" class="form-input" title="Đến ngày phát hành">
          <select id="filter-bl-type" class="form-input" style="min-width: 140px;">
            <option value="">Tất cả loại B/L</option>
            <option value="Master B/L">Master B/L (MBL)</option>
            <option value="House B/L">House B/L (HBL)</option>
            <option value="Seaway Bill">Seaway Bill</option>
            <option value="Telex Release">Surrendered / Telex</option>
          </select>
          <select id="filter-bl-carrier" class="form-input" style="min-width: 130px;">
            <option value="">Tất cả hãng tàu</option>
            <option value="COSCO">COSCO Shipping</option>
            <option value="EVERGREEN">Evergreen Line</option>
            <option value="ONE">Ocean Network (ONE)</option>
            <option value="MAERSK">Maersk Line</option>
            <option value="WAN HAI">Wan Hai Lines</option>
            <option value="SITC">SITC Container</option>
            <option value="YANG MING">Yang Ming</option>
            <option value="CMA CGM">CMA CGM</option>
            <option value="MSC">MSC</option>
          </select>
          <input type="text" id="bl-search-input" class="form-input" style="width: 240px;" placeholder="Tìm số B/L, tàu, cont, lô hàng...">
        </div>
      </div>

      <!-- Grid Table -->
      <div class="grid-scroll">
        <table class="misa-table">
          <thead>
            <tr>
              <th style="width:40px; text-align:center;"><input type="checkbox" id="chk-all-bl"></th>
              <th>Số Vận Đơn (B/L No.)</th>
              <th>Loại B/L</th>
              <th>Lô Hàng Liên Kết</th>
              <th>Hãng Tàu / Vận Chuyển</th>
              <th>Tên Tàu & Chuyến (Vessel/Voy)</th>
              <th>Cảng Đi ➔ Cảng Đến</th>
              <th>Ngày On-Board</th>
              <th>Cont / Kiện / GW</th>
              <th>Trạng Thái</th>
              <th style="text-align:center;">File Scan</th>
              <th style="width:160px; text-align:center;">Thao Tác</th>
            </tr>
          </thead>
          <tbody id="bl-table-body">
            <tr><td colspan="12" style="text-align:center; padding:30px;">Đang tải danh sách vận đơn...</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="misa-pagination" style="display:flex; justify-content:space-between; align-items:center; padding: 10px;">
        <div class="pagination-info" id="bl-pagination-info">Tổng: 0 vận đơn</div>
        <div class="pagination-controls" style="display:flex; gap:10px; align-items:center;">
          <select id="bl-items-per-page" class="form-input" style="width:auto; padding:4px;">
            <option value="10">10 dòng/trang</option>
            <option value="20">20 dòng/trang</option>
            <option value="50">50 dòng/trang</option>
            <option value="100">100 dòng/trang</option>
          </select>
          <div id="bl-pagination-buttons" style="display:flex; gap:5px;"></div>
        </div>
      </div>
    </div>
  `;

  // Attach event listeners
  document.getElementById('btn-add-bl')?.addEventListener('click', () => openBLModal());
  document.getElementById('btn-refresh-bl')?.addEventListener('click', () => loadBLs());
  ['bl-search-input', 'filter-bl-from', 'filter-bl-to', 'filter-bl-type', 'filter-bl-carrier'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', filterBLs);
  });

  const chkAll = document.getElementById('chk-all-bl');
  if (chkAll) {
    chkAll.addEventListener('click', (e) => {
      e.preventDefault();
      const checkboxes = document.querySelectorAll('.chk-row-bl');
      const checked = document.querySelectorAll('.chk-row-bl:checked');
      const shouldCheck = checked.length < checkboxes.length;
      checkboxes.forEach(chk => { chk.checked = shouldCheck; });
      e.target.checked = shouldCheck;
      e.target.indeterminate = false;
      updateBLBulkActions();
    });
  }

  document.getElementById('bl-items-per-page')?.addEventListener('change', (e) => {
    itemsPerPage = parseInt(e.target.value);
    currentPage = 1;
    renderPaginatedBLs();
  });

  document.getElementById('btn-bulk-delete-bl')?.addEventListener('click', () => {
    const checked = Array.from(document.querySelectorAll('.chk-row-bl:checked')).map(c => c.value);
    if (checked.length >= 1) bulkDeleteBLs(checked);
  });

  await loadBLs();
}

/**
 * Tải danh sách B/L từ Backend & Storage
 */
async function loadBLs() {
  const tbody = document.getElementById('bl-table-body');
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

    // If there are documents uploaded under BillOfLading category that don't have an invoice record, surface them
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
          partnerName: shp?.supplierName || shp?.customerName || 'VAR',
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

    // Provide default sample B/L if completely empty
    if (blList.length === 0 && shipments.length > 0) {
      const shp = shipments[0];
      blList.push({
        id: 'sample-bl-01',
        isSample: true,
        blNumber: 'COSU63289104',
        issueDate: shp.createdAt || new Date().toISOString(),
        shipmentId: shp.id,
        shipmentCode: shp.shipmentCode,
        partnerName: shp.supplierName || 'VAR',
        shipmentType: shp.type || 'Import',
        totalPackages: shp.totalPackages || 222,
        grossWeight: shp.totalGrossWeight || 22,
        shippingLine: 'COSCO SHIPPING',
        vesselVoyage: 'COSCO PRIDE / 024E',
        pol: shp.portOfLoading || 'Cat Lai Port, Ho Chi Minh City',
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
    filterBLs();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; color:red; padding:20px;">Lỗi tải dữ liệu vận đơn: ${err.message}</td></tr>`;
  }
}

/**
 * Lọc B/L theo các điều kiện
 */
function filterBLs() {
  const q = document.getElementById('bl-search-input')?.value.toLowerCase().trim() || '';
  const dateFrom = document.getElementById('filter-bl-from')?.value;
  const dateTo = document.getElementById('filter-bl-to')?.value;
  const blType = document.getElementById('filter-bl-type')?.value;
  const carrier = document.getElementById('filter-bl-carrier')?.value;

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

  if (dateFrom) {
    const dFrom = new Date(dateFrom).setHours(0, 0, 0, 0);
    filtered = filtered.filter(b => new Date(b.issueDate).setHours(0, 0, 0, 0) >= dFrom);
  }

  if (dateTo) {
    const dTo = new Date(dateTo).setHours(23, 59, 59, 999);
    filtered = filtered.filter(b => new Date(b.issueDate).getTime() <= dTo);
  }

  currentFilteredBLs = filtered;
  currentPage = 1;
  renderPaginatedBLs();
}

/**
 * Phân trang danh sách B/L
 */
function renderPaginatedBLs() {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageItems = currentFilteredBLs.slice(startIndex, endIndex);

  renderBLRows(pageItems);

  const info = document.getElementById('bl-pagination-info');
  if (info) info.textContent = `Tổng cộng: ${currentFilteredBLs.length} vận đơn (B/L)`;

  renderBLPaginationButtons();
  updateBLBulkActions();
}

/**
 * Render các dòng bảng B/L
 */
function renderBLRows(items) {
  const tbody = document.getElementById('bl-table-body');
  if (!tbody) return;

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding:30px; color:#6b7280;">Không tìm thấy vận đơn (B/L) nào phù hợp</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map((b) => {
    const dateStr = b.issueDate ? new Date(b.issueDate).toLocaleDateString('vi-VN') : '---';

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
      <tr>
        <td style="text-align:center;"><input type="checkbox" class="chk-row-bl" value="${b.id}"></td>
        <td>
          <div style="font-weight:700; color:var(--amis-blue); font-family:monospace; font-size:13px; cursor:pointer;" onclick="window.viewBLDetail('${b.id}')" title="Click xem chi tiết vận đơn">
            ${b.blNumber}
          </div>
          <div style="font-size:11px; color:#64748b;">${b.freightTerm || 'Freight Prepaid'}</div>
        </td>
        <td>${typeBadge}</td>
        <td>
          <a href="#" onclick="window.appNavigateTo('shipment-detail', '${b.shipmentId}'); return false;" style="font-weight:600; color:#1e293b; text-decoration:none;" title="Xem chi tiết lô hàng">
            🚢 ${b.shipmentCode}
          </a>
        </td>
        <td style="font-weight:600; color:#334155;">
          ${b.shippingLine}
        </td>
        <td>
          <div style="font-weight:500;">${b.vesselVoyage}</div>
        </td>
        <td>
          <div style="font-size:12px;">${polShort} ➔ ${podShort}</div>
        </td>
        <td>${dateStr}</td>
        <td>
          <div style="font-size:12px; font-weight:600; color:var(--amis-blue);">${b.containerNo || '---'}</div>
          <div style="font-size:11px; color:#64748b;">Seal: ${b.sealNo || '---'} | ${Number(b.grossWeight || 0).toLocaleString()} kg</div>
        </td>
        <td>${statusChip}</td>
        <td style="text-align:center;">
          ${hasFile ? `
            <button class="btn btn-default btn-sm" onclick="window.downloadBLDoc('${b.docId}', '${b.docName}')" title="Tải file đính kèm: ${b.docName}" style="color:#15803d; border-color:#86efac; background:#f0fdf4; padding:3px 7px;">
              📎 ${b.docName.length > 10 ? b.docName.slice(0,10)+'…' : b.docName}
            </button>
          ` : `<span style="color:#94a3b8; font-size:12px;">Chưa có</span>`}
        </td>
        <td style="text-align:center; white-space:nowrap;">
          <div style="display:inline-flex; align-items:center; justify-content:center; gap:4px;">
            <!-- Nút Xem chi tiết -->
            <button class="btn btn-default btn-sm" onclick="window.viewBLDetail('${b.id}')" style="padding:5px 7px;" title="Xem chi tiết vận đơn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
            <!-- Nút Tải Icon -->
            <button class="btn btn-default btn-sm" onclick="window.handleDownloadBL('${b.id}')" style="padding:5px 7px;" title="Tải file vận đơn / chứng từ B/L">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--amis-green, #16a34a)" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </button>
            <!-- Nút In B/L -->
            <button class="btn btn-default btn-sm" onclick="window.printBL('${b.id}')" style="padding:5px 7px; color:#475569;" title="In mẫu vận đơn B/L">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            </button>
            <!-- Nút Sửa -->
            <button class="btn btn-default btn-sm" onclick="window.editBL('${b.id}')" style="padding:5px 7px; color:var(--amis-blue, #0284c7);" title="Chỉnh sửa vận đơn B/L">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <!-- Nút Xóa -->
            <button class="btn btn-default btn-sm" onclick="window.deleteBL('${b.id}', '${b.blNumber}')" style="padding:5px 7px; color:var(--amis-red, #ef4444);" title="Xóa vận đơn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Row checkbox click event
  tbody.querySelectorAll('.chk-row-bl').forEach(chk => {
    chk.addEventListener('change', updateBLBulkActions);
  });
}

/**
 * Cập nhật thanh hành động xóa hàng loạt
 */
function updateBLBulkActions() {
  const checkboxes = document.querySelectorAll('.chk-row-bl');
  const checked = document.querySelectorAll('.chk-row-bl:checked');
  const chkAll = document.getElementById('chk-all-bl');
  const counter = document.getElementById('bl-selected-count');
  const btnBulk = document.getElementById('btn-bulk-delete-bl');

  if (chkAll) {
    chkAll.checked = (checkboxes.length > 0 && checked.length === checkboxes.length);
    chkAll.indeterminate = (checked.length > 0 && checked.length < checkboxes.length);
  }

  if (checked.length > 0) {
    if (counter) { counter.style.display = 'inline-flex'; counter.textContent = `Đã chọn: ${checked.length}`; }
    if (btnBulk) { btnBulk.style.display = 'inline-flex'; }
  } else {
    if (counter) counter.style.display = 'none';
    if (btnBulk) btnBulk.style.display = 'none';
  }
}

/**
 * Tạo các nút phân trang
 */
function renderBLPaginationButtons() {
  const container = document.getElementById('bl-pagination-buttons');
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
      dots.style.padding = '0 5px';
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
    <div class="bl-document-viewer" id="bl-print-area" style="background:#fff; color:#1e293b; font-family:'Segoe UI', Arial, sans-serif; font-size:12px; padding:16px; border:1px solid #cbd5e1; border-radius:4px; max-width:860px; margin:0 auto;">
      <!-- B/L Header -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #0f172a; padding-bottom:12px; margin-bottom:12px;">
        <div>
          <div style="font-size:22px; font-weight:800; color:#0369a1; letter-spacing:1px; text-transform:uppercase;">
            ${bl.shippingLine}
          </div>
          <div style="font-size:13px; font-weight:700; color:#475569; margin-top:2px;">
            BILL OF LADING FOR OCEAN TRANSPORT / VẬN ĐƠN ĐƯỜNG BIỂN
          </div>
          <div style="font-size:11px; color:#64748b;">
            Original Negotiable / Non-Negotiable Ocean Bill of Lading
          </div>
        </div>
        <div style="text-align:right;">
          <div style="display:inline-block; border:2px solid #0369a1; padding:6px 12px; border-radius:4px; background:#f0f9ff;">
            <div style="font-size:11px; font-weight:700; color:#0369a1; text-transform:uppercase;">B/L NUMBER (SỐ VẬN ĐƠN)</div>
            <div style="font-size:18px; font-weight:800; color:#0c4a6e; font-family:monospace;">${bl.blNumber}</div>
          </div>
          <div style="margin-top:4px;">
            <span class="status-chip chip-transit" style="font-weight:700;">${bl.blType}</span>
            <span class="status-chip chip-completed" style="font-weight:700; margin-left:4px;">${bl.status}</span>
          </div>
        </div>
      </div>

      <!-- Parties Grid (Shipper, Consignee, Notify) -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
        <div style="border:1px solid #cbd5e1; padding:8px; border-radius:4px; background:#f8fafc;">
          <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">SHIPPER / CONSIGNOR (NGƯỜI GỬI HÀNG):</div>
          <div style="font-size:13px; font-weight:700; color:#0f172a; margin-top:2px;">${bl.partnerName}</div>
          <div style="font-size:11px; color:#475569; margin-top:2px;">China / Taiwan International Textile Supplier Co.</div>
        </div>
        <div style="border:1px solid #cbd5e1; padding:8px; border-radius:4px; background:#f8fafc;">
          <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">CONSIGNEE (NGƯỜI NHẬN HÀNG):</div>
          <div style="font-size:13px; font-weight:700; color:#0f172a; margin-top:2px;">CONG TY TNHH XNK TEXTILE VIETNAM</div>
          <div style="font-size:11px; color:#475569; margin-top:2px;">Cat Lai Port Area, Ho Chi Minh City, Vietnam</div>
        </div>
      </div>

      <div style="border:1px solid #cbd5e1; padding:8px; border-radius:4px; background:#f8fafc; margin-bottom:12px;">
        <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">NOTIFY PARTY (BÊN ĐƯỢC THÔNG BÁO):</div>
        <div style="font-size:12px; font-weight:600; color:#0f172a;">SAME AS CONSIGNEE (HOẶC ĐẠI LÝ FORWARDER TẠI VIỆT NAM)</div>
      </div>

      <!-- Vessel, Voyage, POL, POD Grid -->
      <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px; border:1px solid #cbd5e1; padding:8px; border-radius:4px; background:#fff; margin-bottom:12px;">
        <div>
          <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">OCEAN VESSEL & VOY NO.</div>
          <div style="font-size:12px; font-weight:700; color:#0369a1; margin-top:2px;">${bl.vesselVoyage}</div>
        </div>
        <div>
          <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">PORT OF LOADING (POL)</div>
          <div style="font-size:12px; font-weight:600; color:#0f172a; margin-top:2px;">${bl.pol}</div>
        </div>
        <div>
          <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">PORT OF DISCHARGE (POD)</div>
          <div style="font-size:12px; font-weight:600; color:#0f172a; margin-top:2px;">${bl.pod}</div>
        </div>
        <div>
          <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">PLACE OF DELIVERY</div>
          <div style="font-size:12px; font-weight:600; color:#0f172a; margin-top:2px;">Cat Lai CY, Vietnam</div>
        </div>
      </div>

      <!-- Cargo Details Table -->
      <table style="width:100%; border-collapse:collapse; border:1px solid #cbd5e1; margin-bottom:12px;">
        <thead>
          <tr style="background:#f1f5f9; text-align:left; font-size:11px; color:#475569;">
            <th style="padding:6px 8px; border:1px solid #cbd5e1;">Container No. / Seal No.</th>
            <th style="padding:6px 8px; border:1px solid #cbd5e1;">Marks & Numbers</th>
            <th style="padding:6px 8px; border:1px solid #cbd5e1;">No. of Packages & Description</th>
            <th style="padding:6px 8px; border:1px solid #cbd5e1; text-align:right;">Gross Weight (GW)</th>
            <th style="padding:6px 8px; border:1px solid #cbd5e1; text-align:right;">Measurement</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:8px; border:1px solid #cbd5e1; font-family:monospace; font-weight:700; color:#0369a1;">
              ${bl.containerNo || 'TGHU9843210'}<br>
              <span style="font-size:11px; color:#64748b; font-family:sans-serif;">Seal: ${bl.sealNo || 'SL-88992'}</span>
            </td>
            <td style="padding:8px; border:1px solid #cbd5e1;">
              N/M<br><span style="font-size:11px; color:#64748b;">(Lô: ${bl.shipmentCode})</span>
            </td>
            <td style="padding:8px; border:1px solid #cbd5e1;">
              <strong>${bl.totalPackages || 222} PACKAGES / KIỆN</strong><br>
              <span style="color:#334155;">100% POLYESTER FILAMENT YARN (SỢI DỆT)</span><br>
              <span style="font-size:11px; color:#64748b;">SAID TO CONTAIN / SHIPPED ON BOARD</span>
            </td>
            <td style="padding:8px; border:1px solid #cbd5e1; text-align:right; font-weight:700; color:#0f172a;">
              ${Number(bl.grossWeight || 22).toLocaleString()} KGS
            </td>
            <td style="padding:8px; border:1px solid #cbd5e1; text-align:right; font-weight:600; color:#0f172a;">
              15.50 CBM
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Freight & Issue Details -->
      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; border:1px solid #cbd5e1; padding:8px; border-radius:4px; background:#f8fafc; margin-bottom:12px;">
        <div>
          <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">FREIGHT & CHARGES</div>
          <div style="font-size:12px; font-weight:700; color:#15803d; margin-top:2px;">${bl.freightTerm}</div>
        </div>
        <div>
          <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">SHIPPED ON BOARD DATE</div>
          <div style="font-size:12px; font-weight:600; color:#0f172a; margin-top:2px;">${bl.issueDate ? new Date(bl.issueDate).toLocaleDateString('vi-VN') : '---'}</div>
        </div>
        <div>
          <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">SIGNED FOR THE CARRIER</div>
          <div style="font-size:11px; font-weight:700; color:#0369a1; margin-top:2px;">${bl.shippingLine} AS CARRIER</div>
        </div>
      </div>

      ${bl.docName ? `
        <div style="border:1px dashed #0284c7; background:#f0f9ff; padding:8px 12px; border-radius:4px; display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div>
            <span style="font-weight:700; color:#0369a1;">📎 File Scan B/L Đính Kèm:</span>
            <span style="font-weight:600; margin-left:6px;">${bl.docName}</span>
          </div>
          ${bl.docId ? `<button class="btn btn-primary btn-sm" onclick="window.downloadBLDoc('${bl.docId}', '${bl.docName}')">📥 Tải File Scan</button>` : ''}
        </div>
      ` : ''}

      <!-- Bottom actions -->
      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px; border-top:1px solid #e2e8f0; padding-top:12px;">
        <button class="btn btn-default" onclick="window.handleDownloadBL('${bl.id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--amis-green)" stroke-width="2" style="margin-right:4px; vertical-align:middle;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Tải Xuống
        </button>
        <button class="btn btn-default" onclick="window.printBL('${bl.id}')">🖨️ In Bản B/L (A4)</button>
        <button class="btn btn-primary" onclick="window.editBL('${bl.id}')">✏️ Chỉnh Sửa</button>
        <button class="btn btn-default" id="btn-close-bl-view">Đóng</button>
      </div>
    </div>
  `;

  openModal(`Chi Tiết Vận Đơn: ${bl.blNumber}`, content);
  document.getElementById('btn-close-bl-view')?.addEventListener('click', closeModal);
};

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
 * Nút Tải Icon: Tải file scan B/L hoặc sinh file B/L tải về máy
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
CONSIGNEE:           CONG TY TNHH XNK TEXTILE VIETNAM
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
GOODS DESCRIPTION:   100% POLYESTER FILAMENT YARN (SOI DET)
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
    setTimeout(() => window.print(), 300);
  }
};

/**
 * Mở modal tạo mới hoặc chỉnh sửa B/L
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
    <form id="form-bl" style="display:flex; flex-direction:column; gap:14px; max-width:820px;">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div>
          <label class="form-label" style="font-weight:600;">Lô Hàng Liên Kết *</label>
          <select id="bl-shipment-id" class="form-input" required style="width:100%;">
            <option value="">-- Chọn lô hàng liên kết --</option>
            ${shpOptions}
          </select>
        </div>
        <div>
          <label class="form-label" style="font-weight:600;">Số Vận Đơn (B/L Number) *</label>
          <input type="text" id="bl-number" class="form-input" required placeholder="VD: COSU63289104, ONE12345678..." value="${bl?.blNumber || ''}" style="width:100%; font-family:monospace; font-weight:700;">
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
        <div>
          <label class="form-label" style="font-weight:600;">Loại Vận Đơn (B/L Type)</label>
          <select id="bl-type" class="form-input" style="width:100%;">
            <option value="Master B/L" ${bl?.blType === 'Master B/L' ? 'selected' : ''}>Master B/L (MBL)</option>
            <option value="House B/L" ${bl?.blType === 'House B/L' ? 'selected' : ''}>House B/L (HBL)</option>
            <option value="Seaway Bill" ${bl?.blType === 'Seaway Bill' ? 'selected' : ''}>Seaway Bill</option>
            <option value="Telex Release" ${bl?.blType === 'Telex Release' ? 'selected' : ''}>Surrendered / Telex Release</option>
          </select>
        </div>
        <div>
          <label class="form-label" style="font-weight:600;">Hãng Tàu / Vận Chuyển</label>
          <input type="text" id="bl-shipping-line" class="form-input" placeholder="COSCO, EVERGREEN, ONE, MAERSK..." value="${bl?.shippingLine || 'COSCO SHIPPING'}" style="width:100%;">
        </div>
        <div>
          <label class="form-label" style="font-weight:600;">Tên Tàu & Chuyến (Vessel/Voy)</label>
          <input type="text" id="bl-vessel-voyage" class="form-input" placeholder="VD: COSCO PRIDE / 024E" value="${bl?.vesselVoyage || ''}" style="width:100%;">
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
        <div>
          <label class="form-label" style="font-weight:600;">Cảng Xếp Hàng (POL)</label>
          <input type="text" id="bl-pol" class="form-input" placeholder="Cảng xếp hàng..." value="${bl?.pol || 'Shanghai Port, China'}" style="width:100%;">
        </div>
        <div>
          <label class="form-label" style="font-weight:600;">Cảng Dỡ Hàng (POD)</label>
          <input type="text" id="bl-pod" class="form-input" placeholder="Cảng dỡ hàng..." value="${bl?.pod || 'Cat Lai Port, Ho Chi Minh City'}" style="width:100%;">
        </div>
        <div>
          <label class="form-label" style="font-weight:600;">Ngày On-Board / Phát Hành</label>
          <input type="date" id="bl-issue-date" class="form-input" value="${defaultDate}" style="width:100%;">
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:12px;">
        <div>
          <label class="form-label" style="font-weight:600;">Số Container</label>
          <input type="text" id="bl-container-no" class="form-input" placeholder="TGHU9843210..." value="${bl?.containerNo || ''}" style="width:100%; font-family:monospace;">
        </div>
        <div>
          <label class="form-label" style="font-weight:600;">Số Chì (Seal No.)</label>
          <input type="text" id="bl-seal-no" class="form-input" placeholder="SL-88992..." value="${bl?.sealNo || ''}" style="width:100%;">
        </div>
        <div>
          <label class="form-label" style="font-weight:600;">Số Kiện (Packages)</label>
          <input type="number" id="bl-packages" class="form-input" placeholder="222" value="${bl?.totalPackages || ''}" style="width:100%;">
        </div>
        <div>
          <label class="form-label" style="font-weight:600;">Tổng GW (kg)</label>
          <input type="number" step="0.01" id="bl-gw" class="form-input" placeholder="22" value="${bl?.grossWeight || ''}" style="width:100%;">
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div>
          <label class="form-label" style="font-weight:600;">Điều Kiện Cước (Freight)</label>
          <select id="bl-freight-term" class="form-input" style="width:100%;">
            <option value="Freight Prepaid" ${bl?.freightTerm === 'Freight Prepaid' ? 'selected' : ''}>Freight Prepaid (Cước trả trước - CIF, CFR)</option>
            <option value="Freight Collect" ${bl?.freightTerm === 'Freight Collect' ? 'selected' : ''}>Freight Collect (Cước trả sau - FOB, EXW)</option>
          </select>
        </div>
        <div>
          <label class="form-label" style="font-weight:600;">Trạng Thái Vận Đơn</label>
          <select id="bl-status" class="form-input" style="width:100%;">
            <option value="Original" ${bl?.status === 'Original' ? 'selected' : ''}>Original (Bản gốc)</option>
            <option value="Surrendered" ${bl?.status === 'Surrendered' ? 'selected' : ''}>Surrendered (Đã điện giao / Telex)</option>
            <option value="Released" ${bl?.status === 'Released' ? 'selected' : ''}>Released (Đã giao hàng)</option>
            <option value="Draft" ${bl?.status === 'Draft' ? 'selected' : ''}>Draft (Bản nháp)</option>
          </select>
        </div>
      </div>

      <div>
        <label class="form-label" style="font-weight:600;">Đính Kèm File Scan B/L (PDF, Ảnh, File)</label>
        <input type="file" id="bl-file" class="form-input" style="width:100%; padding:4px;">
        ${bl?.docName ? `<div style="font-size:11px; color:#15803d; margin-top:4px;">📎 File hiện tại: <strong>${bl.docName}</strong> (chọn file mới nếu muốn thay thế)</div>` : `<span style="font-size:11px; color:#64748b;">Hệ thống sẽ tự động lưu file vào Kho chứng từ danh mục "Vận đơn (B/L)".</span>`}
      </div>

      <div>
        <label class="form-label" style="font-weight:600;">Ghi Chú</label>
        <textarea id="bl-notes" class="form-input" rows="2" placeholder="Ghi chú về đại lý giao nhận, điều kiện trả vỏ container, free time DEM/DET...">${bl?.notes || ''}</textarea>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:8px;">
        <button type="button" class="btn btn-default" id="btn-cancel-bl">Hủy Bỏ</button>
        <button type="submit" class="btn btn-primary">${isEdit ? '✔ Lưu Thay Đổi' : '✔ Tạo Vận Đơn'}</button>
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
      await loadBLs();
    } catch (err) {
      toast(`Lỗi khi lưu vận đơn: ${err.message}`, 'error');
    }
  });
}

/**
 * Xóa 1 B/L với modal xác nhận chuẩn đẹp
 */
export async function deleteBL(blId, blNumber, onDeleted = null) {
  const isConfirm = await showConfirm({
    title: 'Xóa Vận Đơn',
    message: 'Bạn có chắc chắn muốn xóa vận đơn đường biển này?',
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
    await loadBLs();
  } catch (err) {
    toast(`Lỗi khi xóa: ${err.message}`, 'error');
  }
}
window.deleteBL = deleteBL;

/**
 * Xóa hàng loạt B/L đã chọn
 */
async function bulkDeleteBLs(ids) {
  const isConfirm = await showConfirm({
    title: 'Xóa Hàng Loạt Vận Đơn',
    message: `Bạn có chắc chắn muốn xóa ${ids.length} vận đơn đã chọn?`,
    type: 'danger',
    confirmText: `Xóa ${ids.length} Vận Đơn`
  });
  if (!isConfirm) return;

  try {
    for (const id of ids) {
      const bl = currentBLs.find(b => b.id === id);
      if (bl && !bl.isSample && !bl.isDocVirtual) {
        await api.delete(`/api/invoices/${id}`);
      } else if (bl?.isDocVirtual) {
        await api.delete(`/api/documents/${id}`);
      }
    }
    toast(`Đã xóa ${ids.length} vận đơn thành công!`, 'success');
    await loadBLs();
  } catch (err) {
    toast(`Lỗi khi xóa hàng loạt: ${err.message}`, 'error');
  }
}
