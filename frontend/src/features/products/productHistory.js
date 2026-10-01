/**
 * Product History & Material Usage Tracking Module
 * Tra cứu lịch sử nhập/xuất và theo dõi định mức sử dụng của từng mặt hàng
 */
import { api, showToast } from "../../core/api.js";

let historyItems = [];
let globalSummary = {
  totalImportQuantity: 0,
  totalExportQuantity: 0,
  totalRemainingQuantity: 0,
  totalImportValue: 0,
  totalExportValue: 0,
  totalTransactions: 0,
  productCount: 0
};
let productsList = [];
let selectedProductId = '';
let selectedType = '';
let searchQuery = '';
let dateFrom = '';
let dateTo = '';
let currentPage = 1;
let pageSize = 20;

export async function renderProductHistory(container, defaultProductId = null) {
  selectedProductId = defaultProductId || '';
  currentPage = 1;

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      
      <!-- STAT CARDS: TỔNG QUAN XUẤT NHẬP & SỬ DỤNG HÀNG HÓA -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;">
        
        <!-- CARD 1: NHẬP KHẨU -->
        <div style="background: white; border-radius: 8px; border: 1px solid var(--border-color); padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid var(--amis-blue);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px;">Tổng Nhập Khẩu</div>
              <div id="statImportQty" style="font-size: 22px; font-weight: 700; color: var(--amis-blue); margin-top: 4px;">0 kg</div>
            </div>
            <div style="width: 36px; height: 36px; border-radius: 8px; background: #eff6ff; display: flex; align-items: center; justify-content: center; color: var(--amis-blue);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path></svg>
            </div>
          </div>
          <div id="statImportVal" style="font-size: 13px; color: #64748b; margin-top: 8px;">Trị giá: <strong>$0.00</strong></div>
        </div>

        <!-- CARD 2: XUẤT KHẨU / ĐÃ DÙNG -->
        <div style="background: white; border-radius: 8px; border: 1px solid var(--border-color); padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #f59e0b;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px;">Xuất Khẩu / Đã Dùng</div>
              <div id="statExportQty" style="font-size: 22px; font-weight: 700; color: #d97706; margin-top: 4px;">0 kg</div>
            </div>
            <div style="width: 36px; height: 36px; border-radius: 8px; background: #fffbeb; display: flex; align-items: center; justify-content: center; color: #d97706;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 14 12 9 7 14"></polyline><line x1="12" y1="9" x2="12" y2="21"></line><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path></svg>
            </div>
          </div>
          <div id="statExportVal" style="font-size: 13px; color: #64748b; margin-top: 8px;">Trị giá: <strong>$0.00</strong></div>
        </div>

        <!-- CARD 3: TỒN KHO / CÒN LẠI -->
        <div style="background: white; border-radius: 8px; border: 1px solid var(--border-color); padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid var(--amis-green);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px;">Tồn Kho / Lượng Còn Lại</div>
              <div id="statRemainQty" style="font-size: 22px; font-weight: 700; color: var(--amis-green); margin-top: 4px;">0 kg</div>
            </div>
            <div style="width: 36px; height: 36px; border-radius: 8px; background: #f0fdf4; display: flex; align-items: center; justify-content: center; color: var(--amis-green);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            </div>
          </div>
          <div id="statRemainNote" style="font-size: 13px; color: #64748b; margin-top: 8px;">Lũy kế tồn khả dụng</div>
        </div>

        <!-- CARD 4: TỶ LỆ SỬ DỤNG / ĐỊNH MỨC -->
        <div style="background: white; border-radius: 8px; border: 1px solid var(--border-color); padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #8b5cf6;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px;">Tỷ Lệ Đã Sử Dụng</div>
              <div id="statUsageRate" style="font-size: 22px; font-weight: 700; color: #7c3aed; margin-top: 4px;">0%</div>
            </div>
            <div style="width: 36px; height: 36px; border-radius: 8px; background: #f5f3ff; display: flex; align-items: center; justify-content: center; color: #7c3aed;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
          </div>
          <div style="margin-top: 8px; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
            <div id="statUsageProgressBar" style="height: 100%; width: 0%; background: #8b5cf6; transition: width 0.3s;"></div>
          </div>
        </div>

      </div>

      <!-- SELECTED PRODUCT SPOTLIGHT (HIỂN THỊ KHI CHỌN 1 MẶT HÀNG) -->
      <div id="productSpotlightCard" style="display: none; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 20px;">
        <!-- Dynamic injected via updateSpotlightCard() -->
      </div>

      <!-- MAIN TABLE CARD -->
      <div class="grid-card">
        
        <!-- TOOLBAR -->
        <div class="misa-toolbar" style="flex-wrap: wrap; gap: 10px;">
          <div class="toolbar-group" style="flex-wrap: wrap; gap: 8px;">
            
            <!-- PRODUCT DROPDOWN FILTER -->
            <div style="display: flex; align-items: center; gap: 6px;">
              <label style="font-size: 13px; font-weight: 600; color: var(--text-color); white-space: nowrap;">Mặt hàng:</label>
              <select id="histProductSelect" class="form-select" style="min-width: 220px; font-weight: 500;">
                <option value="">-- Tất cả mặt hàng --</option>
              </select>
            </div>

            <!-- TYPE FILTER -->
            <select id="histFilterType" class="form-select" style="width: 150px;">
              <option value="">Tất cả loại hình</option>
              <option value="Import">📥 Nhập khẩu (Import)</option>
              <option value="Export">📤 Xuất khẩu (Export)</option>
            </select>

            <!-- DATE RANGE -->
            <div style="display: flex; align-items: center; gap: 4px;">
              <input type="date" id="histDateFrom" class="form-input" style="width: 135px;" title="Từ ngày">
              <span style="color: var(--text-muted);">-</span>
              <input type="date" id="histDateTo" class="form-input" style="width: 135px;" title="Đến ngày">
            </div>

            <button id="btnHistFilterApply" class="btn btn-default" title="Lọc dữ liệu">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
              Lọc
            </button>
          </div>

          <div class="toolbar-group" style="gap: 8px;">
            <input type="text" id="histSearchInput" class="form-input" style="width: 230px;" placeholder="Lọc mã SKU, lô hàng, invoice...">

            <button id="btnHistExportExcel" class="btn btn-default" title="Xuất file Excel CSV">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              <span>Xuất Excel</span>
            </button>

            <button id="btnHistRefresh" class="btn btn-default" title="Nạp lại dữ liệu">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
              <span>Nạp lại</span>
            </button>
          </div>
        </div>

        <!-- DATA TABLE -->
        <div class="grid-scroll">
          <table class="misa-table" id="histTable">
            <thead>
              <tr>
                <th style="width: 36px; text-align: center;"><input type="checkbox" id="chkAllHist"></th>
                <th>Ngày GD</th>
                <th>Loại Hình</th>
                <th>Mã SKU</th>
                <th>Tên Mặt Hàng</th>
                <th>Mã Lô Hàng</th>
                <th>Số Invoice</th>
                <th>Tờ Khai HQ</th>
                <th>Đối Tác</th>
                <th style="text-align: right;">Số Lượng</th>
                <th style="text-align: right;">Đơn Giá (USD)</th>
                <th style="text-align: right;">Thành Tiền (USD)</th>
                <th style="text-align: right;" title="Số lượng tồn kho sau khi thực hiện giao dịch này">Tồn Sau GD</th>
                <th style="text-align: center;">Trạng Thái</th>
                <th style="text-align: center; width: 70px;">Thao Tác</th>
              </tr>
            </thead>
            <tbody id="histTbody">
              <tr><td colspan="15" style="text-align: center; padding: 36px;">
                <div class="spinner" style="margin: 0 auto;"></div>
                <div style="margin-top: 10px; color: var(--text-muted);">Đang tải dữ liệu lịch sử xuất nhập khẩu...</div>
              </td></tr>
            </tbody>
          </table>
        </div>

        <!-- PAGINATION -->
        <div class="misa-pagination" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px;">
          <div id="histPaginationText" style="font-weight: 500; font-size: 13px; color: var(--text-muted);">Tổng số: 0 giao dịch</div>
          <div class="pagination-controls" style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 13px; color: var(--text-muted);">Hiển thị:</span>
            <select id="histPageSize" class="form-select" style="width: 80px; padding: 2px 8px; font-size: 12px;">
              <option value="20" selected>20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <div id="histPaginationButtons" style="display: flex; gap: 4px; margin-left: 8px;"></div>
          </div>
        </div>

      </div>

    </div>
  `;

  await initData();
  setupEvents();
}

async function initData() {
  try {
    // 1. Load Products list for dropdown
    const prodRes = await api.get("/api/products?pageSize=200");
    productsList = prodRes.data?.items || [];

    const prodSelect = document.getElementById("histProductSelect");
    if (prodSelect) {
      prodSelect.innerHTML = `<option value="">-- Tất cả mặt hàng (${productsList.length}) --</option>` +
        productsList.map(p => `
          <option value="${p.id}" ${p.id === selectedProductId ? 'selected' : ''}>
            ${p.sku} - ${p.name}
          </option>
        `).join('');
    }

    await loadHistoryData();
  } catch (e) {
    showToast("Lỗi khởi tạo dữ liệu: " + e.message, "error");
  }
}

async function loadHistoryData() {
  const tbody = document.getElementById("histTbody");
  if (!tbody) return;

  try {
    tbody.innerHTML = `<tr><td colspan="15" style="text-align: center; padding: 36px;">
      <div class="spinner" style="margin: 0 auto;"></div>
      <div style="margin-top: 10px; color: var(--text-muted);">Đang tải dữ liệu...</div>
    </td></tr>`;

    let url = `/api/products/history?`;
    const params = new URLSearchParams();
    if (selectedProductId) params.append("productId", selectedProductId);
    if (selectedType) params.append("type", selectedType);
    if (searchQuery) params.append("search", searchQuery);
    if (dateFrom) params.append("fromDate", dateFrom);
    if (dateTo) params.append("toDate", dateTo);

    url += params.toString();
    const res = await api.get(url);
    const data = res.data || {};

    historyItems = data.items || [];
    globalSummary = {
      totalImportQuantity: data.totalImportQuantity || 0,
      totalExportQuantity: data.totalExportQuantity || 0,
      totalRemainingQuantity: data.totalRemainingQuantity || 0,
      totalImportValue: data.totalImportValue || 0,
      totalExportValue: data.totalExportValue || 0,
      totalTransactions: data.totalTransactions || 0,
      productCount: data.productCount || 0
    };

    updateStatCards();
    updateSpotlightCard();
    renderTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="15" style="text-align:center; padding: 24px; color: var(--amis-red)">Lỗi tải dữ liệu lịch sử xuất nhập khẩu. Vui lòng bấm Nạp lại.</td></tr>`;
  }
}

function updateStatCards() {
  const impQtyEl = document.getElementById("statImportQty");
  const expQtyEl = document.getElementById("statExportQty");
  const remQtyEl = document.getElementById("statRemainQty");
  const impValEl = document.getElementById("statImportVal");
  const expValEl = document.getElementById("statExportVal");
  const remNoteEl = document.getElementById("statRemainNote");
  const rateEl = document.getElementById("statUsageRate");
  const barEl = document.getElementById("statUsageProgressBar");

  const impQty = globalSummary.totalImportQuantity;
  const expQty = globalSummary.totalExportQuantity;
  const remQty = globalSummary.totalRemainingQuantity;

  if (impQtyEl) impQtyEl.textContent = `${Number(impQty).toLocaleString('vi-VN')} kg`;
  if (expQtyEl) expQtyEl.textContent = `${Number(expQty).toLocaleString('vi-VN')} kg`;
  
  if (remQtyEl) {
    remQtyEl.textContent = `${Number(remQty).toLocaleString('vi-VN')} kg`;
    remQtyEl.style.color = remQty < 0 ? 'var(--amis-red)' : 'var(--amis-green)';
  }

  if (impValEl) impValEl.innerHTML = `Trị giá: <strong>$${Number(globalSummary.totalImportValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>`;
  if (expValEl) expValEl.innerHTML = `Trị giá: <strong>$${Number(globalSummary.totalExportValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>`;

  if (remNoteEl) {
    remNoteEl.innerHTML = remQty < 0 
      ? `<span style="color:var(--amis-red); font-weight:600;">⚠️ Xuất vượt lượng nhập</span>` 
      : `Số lượng khả dụng còn lại`;
  }

  // Calculate usage rate
  let usageRate = 0;
  if (impQty > 0) {
    usageRate = Math.min(100, Math.max(0, (expQty / impQty) * 100));
  } else if (expQty > 0) {
    usageRate = 100;
  }

  if (rateEl) rateEl.textContent = `${usageRate.toFixed(1)}%`;
  if (barEl) {
    barEl.style.width = `${usageRate}%`;
    barEl.style.backgroundColor = usageRate > 90 ? '#ef4444' : usageRate > 50 ? '#f59e0b' : '#8b5cf6';
  }
}

function updateSpotlightCard() {
  const card = document.getElementById("productSpotlightCard");
  if (!card) return;

  if (!selectedProductId) {
    card.style.display = "none";
    return;
  }

  const p = productsList.find(x => x.id === selectedProductId);
  if (!p) {
    card.style.display = "none";
    return;
  }

  const impQty = globalSummary.totalImportQuantity;
  const expQty = globalSummary.totalExportQuantity;
  const remQty = globalSummary.totalRemainingQuantity;
  const avgPrice = impQty > 0 ? (globalSummary.totalImportValue / impQty) : 0;

  card.style.display = "block";
  card.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 44px; height: 44px; border-radius: 8px; background: #e0e7ff; display: flex; align-items: center; justify-content: center; font-size: 20px;">
          🧵
        </div>
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px; font-weight: 700; color: #1e1b4b;">${p.name}</span>
            <span class="chip chip-info" style="font-weight: 700;">SKU: ${p.sku}</span>
            ${p.hsCode ? `<span style="font-size: 11px; padding: 2px 6px; background: #f1f5f9; border-radius: 4px; border: 1px solid #cbd5e1;">HS: ${p.hsCode}</span>` : ''}
          </div>
          <div style="font-size: 13px; color: #64748b; margin-top: 3px;">
            Nhóm: <strong>${p.productGroup || 'Sợi dệt'}</strong> | Xuất xứ: <strong>${p.countryOfOrigin || 'N/A'}</strong> | ĐVT: <strong>${p.unit || 'kg'}</strong>
          </div>
        </div>
      </div>

      <div style="display: flex; gap: 20px; align-items: center; background: white; padding: 8px 16px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 13px;">
        <div>Đơn giá bình quân nhập: <strong style="color: var(--amis-blue);">$${avgPrice.toFixed(4)}</strong></div>
        <div style="height: 18px; width: 1px; background: #e2e8f0;"></div>
        <div>Tồn khả dụng: <strong style="color: ${remQty < 0 ? 'var(--amis-red)' : 'var(--amis-green)'};">${Number(remQty).toLocaleString('vi-VN')} ${p.unit || 'kg'}</strong></div>
      </div>
    </div>
  `;
}

function renderTable() {
  const tbody = document.getElementById("histTbody");
  if (!tbody) return;

  const total = historyItems.length;
  document.getElementById("histPaginationText").textContent = `Tổng số: ${total} giao dịch phát sinh`;

  if (total === 0) {
    tbody.innerHTML = `<tr><td colspan="15" style="text-align: center; padding: 40px; color: var(--text-muted)">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="opacity:0.4; margin-bottom: 10px;"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
      <div>Không tìm thấy giao dịch xuất nhập khẩu nào phù hợp điều kiện lọc.</div>
    </td></tr>`;
    renderPaginationButtons(0);
    return;
  }

  // Slice for current page
  const startIdx = (currentPage - 1) * pageSize;
  const pagedItems = historyItems.slice(startIdx, startIdx + pageSize);

  tbody.innerHTML = pagedItems.map(row => {
    const isImport = row.shipmentType === 'Import';
    const typeChip = isImport 
      ? `<span class="chip chip-info" style="font-weight: 600;">📥 Nhập khẩu</span>` 
      : `<span class="chip chip-success" style="font-weight: 600;">📤 Xuất khẩu</span>`;

    const qtySign = isImport ? `+${Number(row.quantity).toLocaleString('vi-VN')}` : `-${Number(row.quantity).toLocaleString('vi-VN')}`;
    const qtyColor = isImport ? '#0284c7' : '#d97706';

    const balQty = row.balanceQuantity;
    const balColor = balQty < 0 ? 'var(--amis-red)' : '#15803d';

    const dateStr = row.date ? new Date(row.date).toLocaleDateString('vi-VN') : '---';

    return `
      <tr>
        <td style="text-align: center;"><input type="checkbox" class="row-chk" value="${row.shipmentId}"></td>
        <td style="white-space: nowrap;">${dateStr}</td>
        <td>${typeChip}</td>
        <td><strong>${row.sku || '---'}</strong></td>
        <td>${row.productName || '---'}</td>
        <td>
          <a href="javascript:void(0)" onclick="window.appNavigateTo('shipment-detail', '${row.shipmentId}')" style="font-weight: 700; color: var(--amis-blue); text-decoration: none;">
            ${row.shipmentCode || '---'}
          </a>
        </td>
        <td><code>${row.invoiceNumber || '---'}</code></td>
        <td><code style="color: #b45309;">${row.declarationNumber || '---'}</code></td>
        <td>${row.partnerName || '---'}</td>
        <td style="text-align: right; font-weight: 700; color: ${qtyColor}; white-space: nowrap;">
          ${qtySign} <span style="font-size: 11px; font-weight: 400; color: var(--text-muted);">${row.unit || 'kg'}</span>
        </td>
        <td style="text-align: right; white-space: nowrap;">$${Number(row.unitPrice || 0).toFixed(4)}</td>
        <td style="text-align: right; font-weight: 700; white-space: nowrap;">
          $${Number(row.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
        <td style="text-align: right; font-weight: 700; color: ${balColor}; white-space: nowrap;">
          ${Number(balQty).toLocaleString('vi-VN')} <span style="font-size: 11px; font-weight: 400; color: var(--text-muted);">${row.unit || 'kg'}</span>
        </td>
        <td style="text-align: center;">
          <span class="status-chip chip-delivered" style="font-size: 11px;">${row.status || 'Hoàn tất'}</span>
        </td>
        <td style="text-align: center; white-space: nowrap;">
          <button class="btn btn-default btn-sm" title="Xem Lô Hàng" onclick="window.appNavigateTo('shipment-detail', '${row.shipmentId}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  renderPaginationButtons(total);
}

function renderPaginationButtons(totalItems) {
  const container = document.getElementById("histPaginationButtons");
  if (!container) return;

  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  let html = '';

  html += `<button class="btn btn-default btn-sm" ${currentPage <= 1 ? 'disabled' : ''} id="btnHistPrev">‹ Trước</button>`;
  html += `<span style="font-size: 12px; margin: 0 4px; display: inline-flex; align-items: center; color: var(--text-muted);">Trang ${currentPage} / ${totalPages}</span>`;
  html += `<button class="btn btn-default btn-sm" ${currentPage >= totalPages ? 'disabled' : ''} id="btnHistNext">Sau ›</button>`;

  container.innerHTML = html;

  document.getElementById("btnHistPrev")?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderTable();
    }
  });

  document.getElementById("btnHistNext")?.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderTable();
    }
  });
}

function setupEvents() {
  // Product select change
  document.getElementById("histProductSelect")?.addEventListener("change", (e) => {
    selectedProductId = e.target.value;
    currentPage = 1;
    loadHistoryData();
  });

  // Type change
  document.getElementById("histFilterType")?.addEventListener("change", (e) => {
    selectedType = e.target.value;
    currentPage = 1;
    loadHistoryData();
  });

  // Date filters apply
  document.getElementById("btnHistFilterApply")?.addEventListener("click", () => {
    dateFrom = document.getElementById("histDateFrom")?.value || '';
    dateTo = document.getElementById("histDateTo")?.value || '';
    currentPage = 1;
    loadHistoryData();
  });

  // Search input with debounce
  let searchTimer = null;
  document.getElementById("histSearchInput")?.addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchQuery = e.target.value.trim();
      currentPage = 1;
      loadHistoryData();
    }, 250);
  });

  // Page size change
  document.getElementById("histPageSize")?.addEventListener("change", (e) => {
    pageSize = parseInt(e.target.value, 10) || 20;
    currentPage = 1;
    renderTable();
  });

  // Refresh
  document.getElementById("btnHistRefresh")?.addEventListener("click", () => {
    loadHistoryData();
    showToast("Đã nạp lại dữ liệu lịch sử!", "success");
  });

  // Check all
  document.getElementById("chkAllHist")?.addEventListener("change", (e) => {
    const isChecked = e.target.checked;
    document.querySelectorAll(".row-chk").forEach(cb => cb.checked = isChecked);
  });

  // Export Excel CSV
  document.getElementById("btnHistExportExcel")?.addEventListener("click", exportToCsv);
}

function exportToCsv() {
  if (historyItems.length === 0) {
    showToast("Không có dữ liệu để xuất Excel", "warning");
    return;
  }

  const headers = [
    "Ngày Giao Dịch",
    "Loại Hình",
    "Mã SKU",
    "Tên Mặt Hàng",
    "Mã Lô Hàng",
    "Số Invoice",
    "Số Tờ Khai HQ",
    "Đối Tác",
    "Số Lượng",
    "Đơn Vị Tính",
    "Đơn Giá (USD)",
    "Thành Tiền (USD)",
    "Tồn Lũy Kế",
    "Trạng Thái"
  ];

  const rows = historyItems.map(h => [
    h.date ? new Date(h.date).toLocaleDateString('vi-VN') : '',
    h.shipmentType === 'Import' ? 'Nhập khẩu' : 'Xuất khẩu',
    `"${(h.sku || '').replace(/"/g, '""')}"`,
    `"${(h.productName || '').replace(/"/g, '""')}"`,
    `"${(h.shipmentCode || '').replace(/"/g, '""')}"`,
    `"${(h.invoiceNumber || '').replace(/"/g, '""')}"`,
    `"${(h.declarationNumber || '').replace(/"/g, '""')}"`,
    `"${(h.partnerName || '').replace(/"/g, '""')}"`,
    h.quantity || 0,
    h.unit || 'kg',
    h.unitPrice || 0,
    h.totalAmount || 0,
    h.balanceQuantity || 0,
    `"${(h.status || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Lich_Su_Xuat_Nhap_Khau_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast("Đã xuất file Excel (CSV) thành công!", "success");
}
