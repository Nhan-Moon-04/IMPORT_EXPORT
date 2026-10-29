/**
 * Pricing Feature Module — Quản Lý Giá Mua Vào & Giá Bán Ra (Ánh Xạ Xuất Khẩu)
 * MISA AMIS Enterprise Style
 */
import { api, showToast, showConfirm, openModal, closeModal } from "../../core/api.js";

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMoney(amount, currency = 'USD') {
  const val = Number(amount || 0);
  const curr = String(currency || 'USD').toUpperCase().trim();
  if (curr === 'VND') {
    return `<span class="price-pill price-vnd" title="${val.toLocaleString('vi-VN')} ₫">${val.toLocaleString('vi-VN')} <small>₫</small></span>`;
  }
  return `<span class="price-pill price-usd" title="$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}"><small>$</small>${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;
}

function formatDate(dateStr) {
  if (!dateStr) return '---';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return String(dateStr);
  }
}

// =============================================================================
// TRANG 1: GIÁ MUA VÀO (PURCHASE PRICES)
// =============================================================================

let purchasePricesList = [];
let purchaseFilteredList = [];

export async function renderPurchasePrices(container) {
  container.innerHTML = `
    <div class="pricing-page-wrapper">
      <!-- Page Header -->
      <div class="pricing-header">
        <div class="pricing-header-title">
          <h2 class="pricing-title">
            <span class="title-icon">💰</span>
            Bảng Giá Mua Vào & Lịch Sử Giá Nhập Sợi
          </h2>
          <div class="pricing-subtitle">
            Quản lý giá mua vào theo từng mã sản phẩm/nguyên liệu, theo dõi lịch sử biến động giá qua các thời kỳ và bảo lưu giá trên chứng từ cũ
          </div>
        </div>
        <div class="pricing-header-actions">
          <button id="btnPurchasePriceAdd" class="btn btn-primary" style="height:34px; padding:0 14px; font-weight:600; font-size:13px; display:inline-flex; align-items:center; gap:6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Thêm Giá Mua Vào
          </button>
          <button id="btnPurchaseExportExcel" class="btn btn-default" style="height:34px; padding:0 12px; font-size:13px; display:inline-flex; align-items:center; gap:6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Xuất Excel
          </button>
          <button id="btnPurchaseRefresh" class="btn btn-default" style="height:34px; padding:0 12px; font-size:13px; display:inline-flex; align-items:center; gap:6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            Nạp lại
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="pricing-kpi-grid">
        <div class="pricing-kpi-card kpi-blue">
          <div class="pricing-kpi-icon">📦</div>
          <div class="pricing-kpi-body">
            <div class="pricing-kpi-label">Tổng Mặt Hàng Mua Vào</div>
            <div class="pricing-kpi-value" id="kpiPurchaseTotal">0 mặt hàng</div>
            <div class="pricing-kpi-sub" id="kpiPurchaseSub">Đang áp dụng giá hiện hành</div>
          </div>
        </div>

        <div class="pricing-kpi-card kpi-emerald">
          <div class="pricing-kpi-icon">💲</div>
          <div class="pricing-kpi-body">
            <div class="pricing-kpi-label">Giá Mua TB (USD)</div>
            <div class="pricing-kpi-value" id="kpiPurchaseAvgUsd">$0.00 / kg</div>
            <div class="pricing-kpi-sub" id="kpiPurchaseUsdCount">0 mặt hàng USD</div>
          </div>
        </div>

        <div class="pricing-kpi-card kpi-purple">
          <div class="pricing-kpi-icon">💵</div>
          <div class="pricing-kpi-body">
            <div class="pricing-kpi-label">Giá Mua TB (VNĐ)</div>
            <div class="pricing-kpi-value" id="kpiPurchaseAvgVnd">0 ₫ / kg</div>
            <div class="pricing-kpi-sub" id="kpiPurchaseVndCount">0 mặt hàng VNĐ</div>
          </div>
        </div>

        <div class="pricing-kpi-card kpi-amber">
          <div class="pricing-kpi-icon">🕒</div>
          <div class="pricing-kpi-body">
            <div class="pricing-kpi-label">Cập Nhật Gần Nhất</div>
            <div class="pricing-kpi-value" id="kpiPurchaseLastUpdate" style="font-size:14px;">---</div>
            <div class="pricing-kpi-sub">Bảo lưu snapshot trên tờ khai cũ</div>
          </div>
        </div>
      </div>

      <!-- Toolbar Card -->
      <div class="pricing-toolbar-card">
        <div class="pricing-toolbar-left">
          <span style="font-size:12.5px; font-weight:600; color:#475569;">
            Danh mục giá mua vào đang áp dụng
          </span>
          <span style="font-size:11px; background:#eff6ff; color:#1d4ed8; padding:2px 8px; border-radius:12px; font-weight:600;">
            Khi cập nhật giá mới, các tờ khai cũ không bị thay đổi
          </span>
        </div>
        <div class="pricing-toolbar-right">
          <div class="pricing-search-box">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="purchaseSearchInput" class="pricing-search-input" placeholder="Lọc theo mã SKU, tên hàng hoá...">
          </div>
        </div>
      </div>

      <!-- Table Card -->
      <div class="pricing-table-card">
        <div class="pricing-table-container">
          <table class="modern-shipment-table" id="purchaseTable">
            <thead>
              <tr>
                <th style="width: 40px; text-align:center;">STT</th>
                <th style="min-width: 140px;">Mã Sản Phẩm (SKU)</th>
                <th style="min-width: 250px;">Tên Hàng Hoá Mua Vào</th>
                <th style="min-width: 80px; text-align:center;">Tiền Tệ</th>
                <th style="min-width: 140px; text-align:right;">Đơn Giá Hiện Hành</th>
                <th style="min-width: 120px;">Ngày Hiệu Lực</th>
                <th style="min-width: 220px;">Ghi Chú / Nguồn Nhập</th>
                <th style="min-width: 110px;">Người Tạo</th>
                <th style="min-width: 130px; text-align:center;">Thao Tác</th>
              </tr>
            </thead>
            <tbody id="purchaseTbody">
              <tr><td colspan="9" style="text-align:center; padding: 32px; color: #64748b;">Đang nạp dữ liệu giá mua vào...</td></tr>
            </tbody>
          </table>
        </div>
        <div class="shipments-pagination-bar">
          <div id="purchasePaginationText">Tổng số: 0 bản ghi</div>
          <div style="font-size: 12px; color: #64748b;">Bấm vào 📜 để xem toàn bộ lịch sử biến động giá của từng mặt hàng</div>
        </div>
      </div>
    </div>
  `;

  setupPurchaseEvents();
  await loadPurchasePrices();
}

async function loadPurchasePrices() {
  try {
    const res = await api.get('/api/purchase-prices');
    purchasePricesList = res.data || [];
    purchaseFilteredList = [...purchasePricesList];
    updatePurchaseKpi(purchasePricesList);
    renderPurchaseTable(purchaseFilteredList);
  } catch (err) {
    showToast('Lỗi khi tải bảng giá mua vào', 'error');
  }
}

function updatePurchaseKpi(items) {
  const total = items.length;
  let usdSum = 0, usdCount = 0;
  let vndSum = 0, vndCount = 0;
  let latestDate = null;

  items.forEach(it => {
    const val = Number(it.unitPrice || 0);
    const curr = (it.currency || 'USD').toUpperCase();
    if (curr === 'VND') {
      vndSum += val;
      vndCount++;
    } else {
      usdSum += val;
      usdCount++;
    }
    if (it.effectiveDate) {
      const d = new Date(it.effectiveDate);
      if (!latestDate || d > latestDate) latestDate = d;
    }
  });

  const avgUsd = usdCount > 0 ? (usdSum / usdCount) : 0;
  const avgVnd = vndCount > 0 ? (vndSum / vndCount) : 0;

  const kpiTot = document.getElementById('kpiPurchaseTotal');
  const kpiUsd = document.getElementById('kpiPurchaseAvgUsd');
  const kpiUsdCnt = document.getElementById('kpiPurchaseUsdCount');
  const kpiVnd = document.getElementById('kpiPurchaseAvgVnd');
  const kpiVndCnt = document.getElementById('kpiPurchaseVndCount');
  const kpiLast = document.getElementById('kpiPurchaseLastUpdate');

  if (kpiTot) kpiTot.textContent = `${total} mặt hàng`;
  if (kpiUsd) kpiUsd.textContent = `$${avgUsd.toFixed(2)} / kg`;
  if (kpiUsdCnt) kpiUsdCnt.textContent = `${usdCount} mặt hàng USD`;
  if (kpiVnd) kpiVnd.textContent = `${Math.round(avgVnd).toLocaleString('vi-VN')} ₫ / kg`;
  if (kpiVndCnt) kpiVndCnt.textContent = `${vndCount} mặt hàng VNĐ`;
  if (kpiLast) kpiLast.textContent = latestDate ? formatDate(latestDate) : 'Chưa có';
}

function renderPurchaseTable(items) {
  const tbody = document.getElementById('purchaseTbody');
  const pag = document.getElementById('purchasePaginationText');
  if (!tbody) return;

  if (items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align:center; padding: 40px; color: #64748b;">
          <div style="font-size: 28px; margin-bottom: 6px;">🏷️</div>
          <div style="font-weight: 600; color: #334155;">Chưa có dữ liệu giá mua vào</div>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Nhấn nút "Thêm Giá Mua Vào" để bắt đầu thiết lập giá nguyên liệu</div>
        </td>
      </tr>
    `;
    if (pag) pag.textContent = 'Tổng số: 0 bản ghi';
    return;
  }

  tbody.innerHTML = items.map((it, idx) => `
    <tr class="shipment-main-row">
      <td style="text-align:center; color:#94a3b8;">${idx + 1}</td>
      <td>
        <span class="sku-badge">
          <span>📦</span>
          <span>${escapeHtml(it.productSku || '---')}</span>
        </span>
      </td>
      <td>
        <strong style="color:#0f172a;">${escapeHtml(it.productName || '---')}</strong>
      </td>
      <td style="text-align:center;">
        <span class="status-badge" style="background:#f1f5f9; color:#475569; font-weight:700;">
          ${escapeHtml(it.currency || 'USD')}
        </span>
      </td>
      <td style="text-align:right;">
        ${formatMoney(it.unitPrice, it.currency)}
        <span style="font-size:11px; color:#94a3b8; margin-left:3px;">/ kg</span>
      </td>
      <td>
        <span style="font-family:monospace; color:#475569; font-size:12px;">
          📅 ${formatDate(it.effectiveDate)}
        </span>
      </td>
      <td>
        <span style="font-size:12px; color:#475569;" title="${escapeHtml(it.notes || '')}">
          ${escapeHtml(it.notes || '---')}
        </span>
      </td>
      <td>
        <span style="font-size:11.5px; color:#64748b;">${escapeHtml(it.createdBy || 'Hệ thống')}</span>
      </td>
      <td style="text-align:center;">
        <div class="pricing-action-group">
          <button class="pricing-btn-icon" title="Cập nhật giá mua mới (giữ lại giá cũ vào lịch sử)" onclick="window.xnkOpenUpdatePurchaseModal('${it.id}')">
            🔄
          </button>
          <button class="pricing-btn-icon" title="Xem lịch sử các mốc giá cũ" onclick="window.xnkOpenPurchaseHistoryModal('${it.id}')">
            📜
          </button>
          <button class="pricing-btn-icon" title="Xóa" style="color:var(--amis-red);" onclick="window.xnkDeletePurchasePrice('${it.id}')">
            🗑️
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  if (pag) pag.textContent = `Tổng số: ${items.length} bản ghi`;
}

function setupPurchaseEvents() {
  document.getElementById('btnPurchaseRefresh')?.addEventListener('click', loadPurchasePrices);
  document.getElementById('btnPurchasePriceAdd')?.addEventListener('click', () => openAddPurchaseModal());
  document.getElementById('btnPurchaseExportExcel')?.addEventListener('click', () => exportPurchaseToExcel());

  document.getElementById('purchaseSearchInput')?.addEventListener('input', (e) => {
    const q = (e.target.value || '').toLowerCase().trim();
    if (!q) {
      purchaseFilteredList = [...purchasePricesList];
    } else {
      purchaseFilteredList = purchasePricesList.filter(it => 
        (it.productSku || '').toLowerCase().includes(q) ||
        (it.productName || '').toLowerCase().includes(q) ||
        (it.notes || '').toLowerCase().includes(q)
      );
    }
    renderPurchaseTable(purchaseFilteredList);
  });
}

function exportPurchaseToExcel() {
  if (purchaseFilteredList.length === 0) {
    showToast('Không có dữ liệu để xuất', 'warning');
    return;
  }
  const headers = ["STT", "Mã SKU", "Tên Hàng Hoá Mua Vào", "Tiền Tệ", "Đơn Giá Hiện Hành", "Ngày Hiệu Lực", "Ghi Chú", "Người Tạo"];
  const rows = purchaseFilteredList.map((it, idx) => [
    idx + 1,
    it.productSku || '',
    it.productName || '',
    it.currency || 'USD',
    it.unitPrice || 0,
    formatDate(it.effectiveDate),
    it.notes || '',
    it.createdBy || ''
  ]);
  const csvContent = "\uFEFF" + [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(","),
    ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))
  ].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Bang_Gia_Mua_Vao_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Đã xuất file bảng giá mua vào thành công!', 'success');
}

// Modal Thêm Giá Mua Vào Mới
async function openAddPurchaseModal() {
  let products = [];
  try {
    const res = await api.get('/api/products?pageSize=200');
    products = res.data?.items || [];
  } catch { }

  const content = `
    <div style="padding: 10px 0;">
      <div style="margin-bottom: 14px;">
        <label class="form-label required" style="font-weight:600; font-size:13px; margin-bottom:5px; display:block;">
          Chọn Sản Phẩm / Nguyên Liệu Mua Vào
        </label>
        <select id="ppAddProductSelect" class="form-select" style="width:100%; font-size:13.5px; padding:8px 10px;">
          <option value="">-- Chọn sản phẩm từ danh mục --</option>
          ${products.map(p => `
            <option value="${p.id}" data-sku="${escapeHtml(p.sku)}" data-name="${escapeHtml(p.name)}">
              [${escapeHtml(p.sku)}] ${escapeHtml(p.name)} (${p.unit || 'kg'})
            </option>
          `).join('')}
        </select>
        <div style="font-size:11.5px; color:#64748b; margin-top:4px;">
          * Ví dụ: Mã nguyên liệu thô <strong>VL0572</strong> nhập khẩu
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom: 14px;">
        <div>
          <label class="form-label required" style="font-weight:600; font-size:13px; margin-bottom:5px; display:block;">
            Đơn Vị Tiền Tệ
          </label>
          <select id="ppAddCurrency" class="form-select" style="width:100%; font-size:13.5px; padding:8px 10px;">
            <option value="USD">USD ($ - Đô la Mỹ)</option>
            <option value="VND">VND (₫ - Đồng Việt Nam)</option>
          </select>
        </div>
        <div>
          <label class="form-label required" style="font-weight:600; font-size:13px; margin-bottom:5px; display:block;">
            Đơn Giá Mua Vào (trên 1 KG)
          </label>
          <input type="number" id="ppAddUnitPrice" step="0.0001" min="0" class="form-input" placeholder="VD: 4.00" style="width:100%; font-size:13.5px; padding:8px 10px; font-weight:700;">
        </div>
      </div>

      <div style="margin-bottom: 14px;">
        <label class="form-label" style="font-weight:600; font-size:13px; margin-bottom:5px; display:block;">
          Ngày Bắt Đầu Áp Dụng / Hiệu Lực
        </label>
        <input type="date" id="ppAddEffectiveDate" class="form-input" value="${new Date().toISOString().slice(0, 10)}" style="width:100%; font-size:13px; padding:7px 10px;">
      </div>

      <div style="margin-bottom: 14px;">
        <label class="form-label" style="font-weight:600; font-size:13px; margin-bottom:5px; display:block;">
          Ghi Chú Hợp Đồng / Nhà Cung Cấp
        </label>
        <textarea id="ppAddNotes" class="form-input" rows="2" placeholder="VD: Giá mua theo hợp đồng số FMT-2026 đợt 1 từ Formosa..." style="width:100%; font-size:13px; padding:8px 10px;"></textarea>
      </div>

      <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px; padding:10px 12px; font-size:12px; color:#1e40af; line-height:1.4;">
        ℹ️ <strong>Quy tắc hệ thống:</strong> Giá này sẽ làm giá tham chiếu hiện hành khi tạo các lô hàng hoặc tờ khai mới. Các tờ khai và lô hàng trong quá khứ đã hoàn thành giữ nguyên giá lúc nhập, không bị ghi đè.
      </div>

      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:18px; border-top:1px solid #e2e8f0; padding-top:12px;">
        <button type="button" class="btn btn-default" onclick="window.closeModal()">Hủy bỏ</button>
        <button type="button" class="btn btn-primary" id="btnConfirmAddPurchase">Xác nhận tạo giá</button>
      </div>
    </div>
  `;

  openModal('Thêm Giá Mua Vào Mới', content);

  document.getElementById('btnConfirmAddPurchase')?.addEventListener('click', async () => {
    const productId = document.getElementById('ppAddProductSelect').value;
    const currency = document.getElementById('ppAddCurrency').value;
    const unitPrice = parseFloat(document.getElementById('ppAddUnitPrice').value);
    const effectiveDate = document.getElementById('ppAddEffectiveDate').value;
    const notes = document.getElementById('ppAddNotes').value;

    if (!productId) {
      showToast('Vui lòng chọn sản phẩm nguyên liệu', 'warning');
      return;
    }
    if (isNaN(unitPrice) || unitPrice < 0) {
      showToast('Đơn giá mua không hợp lệ', 'warning');
      return;
    }

    try {
      await api.post('/api/purchase-prices', {
        productId,
        currency,
        unitPrice,
        notes: notes.trim() || null,
        effectiveDate: effectiveDate ? new Date(effectiveDate).toISOString() : new Date().toISOString()
      });
      showToast('Đã tạo giá mua vào thành công!', 'success');
      closeModal();
      await loadPurchasePrices();
    } catch (err) {
      showToast('Lỗi khi tạo giá mua vào', 'error');
    }
  });
}

// Modal Cập Nhật Giá Mua Vào (Giá mới thay thế giá hiện hành, lưu giá cũ vào lịch sử)
window.xnkOpenUpdatePurchaseModal = async function(id) {
  let item = null;
  try {
    const res = await api.get(`/api/purchase-prices/${id}`);
    item = res.data;
  } catch {
    showToast('Lỗi khi tải thông tin giá mua', 'error');
    return;
  }

  const content = `
    <div style="padding: 10px 0;">
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:12px; margin-bottom:16px;">
        <div style="font-size:12px; color:#64748b; margin-bottom:4px;">SẢN PHẨM NGUYÊN LIỆU:</div>
        <div style="font-size:14px; font-weight:700; color:#0f172a;">
          <span class="sku-badge" style="margin-right:6px;">📦 ${escapeHtml(item.productSku)}</span>
          ${escapeHtml(item.productName)}
        </div>
        <div style="margin-top:8px; font-size:13px; color:#475569;">
          Giá hiện tại đang áp dụng: <strong style="color:#059669; font-size:15px; font-family:monospace;">${item.currency === 'VND' ? `${Number(item.unitPrice).toLocaleString('vi-VN')} ₫` : `$${Number(item.unitPrice).toFixed(2)}`}</strong>
          <span style="font-size:11.5px; color:#94a3b8; margin-left:6px;">(Hiệu lực từ ${formatDate(item.effectiveDate)})</span>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom: 14px;">
        <div>
          <label class="form-label required" style="font-weight:600; font-size:13px; margin-bottom:5px; display:block;">
            Tiền Tệ
          </label>
          <select id="ppUpdCurrency" class="form-select" style="width:100%; font-size:13.5px; padding:8px 10px;">
            <option value="USD" ${item.currency === 'USD' ? 'selected' : ''}>USD ($ - Đô la Mỹ)</option>
            <option value="VND" ${item.currency === 'VND' ? 'selected' : ''}>VND (₫ - Đồng Việt Nam)</option>
          </select>
        </div>
        <div>
          <label class="form-label required" style="font-weight:600; font-size:13px; margin-bottom:5px; display:block;">
            Đơn Giá Mua Mới (trên 1 KG)
          </label>
          <input type="number" id="ppUpdUnitPrice" step="0.0001" min="0" class="form-input" value="${item.unitPrice}" style="width:100%; font-size:14px; padding:8px 10px; font-weight:700; color:#0266b3;">
        </div>
      </div>

      <div style="margin-bottom: 14px;">
        <label class="form-label required" style="font-weight:600; font-size:13px; margin-bottom:5px; display:block;">
          Ngày Bắt Đầu Áp Dụng Mức Giá Mới
        </label>
        <input type="date" id="ppUpdEffectiveDate" class="form-input" value="${new Date().toISOString().slice(0, 10)}" style="width:100%; font-size:13px; padding:7px 10px;">
      </div>

      <div style="margin-bottom: 14px;">
        <label class="form-label" style="font-weight:600; font-size:13px; margin-bottom:5px; display:block;">
          Lý Do Điều Chỉnh Giá Mua
        </label>
        <textarea id="ppUpdNotes" class="form-input" rows="2" placeholder="VD: Tăng giá mua từ 4$ lên 5$ theo phụ lục hợp đồng mới..." style="width:100%; font-size:13px; padding:8px 10px;"></textarea>
      </div>

      <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:6px; padding:10px 12px; font-size:12px; color:#92400e; line-height:1.4;">
        ⚠️ <strong>Cam kết tính toàn vẹn dữ liệu:</strong> Mức giá mới sẽ áp dụng từ ngày hiệu lực này. Mức giá cũ (${item.currency === 'VND' ? `${Number(item.unitPrice).toLocaleString('vi-VN')} ₫` : `$${Number(item.unitPrice).toFixed(2)}`}) sẽ được tự động lưu lại vào <strong>Lịch sử giá</strong>. Các tờ khai và lô hàng trong quá khứ không bị ảnh hưởng.
      </div>

      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:18px; border-top:1px solid #e2e8f0; padding-top:12px;">
        <button type="button" class="btn btn-default" onclick="window.closeModal()">Hủy bỏ</button>
        <button type="button" class="btn btn-primary" id="btnConfirmUpdPurchase">Lưu mức giá mới</button>
      </div>
    </div>
  `;

  openModal(`Điều Chỉnh Giá Mua Vào: ${item.productSku}`, content);

  document.getElementById('btnConfirmUpdPurchase')?.addEventListener('click', async () => {
    const currency = document.getElementById('ppUpdCurrency').value;
    const unitPrice = parseFloat(document.getElementById('ppUpdUnitPrice').value);
    const effectiveDate = document.getElementById('ppUpdEffectiveDate').value;
    const notes = document.getElementById('ppUpdNotes').value;

    if (isNaN(unitPrice) || unitPrice < 0) {
      showToast('Đơn giá mua mới không hợp lệ', 'warning');
      return;
    }

    try {
      await api.post('/api/purchase-prices', {
        productId: item.productId,
        currency,
        unitPrice,
        notes: notes.trim() || `Điều chỉnh từ ${item.unitPrice} lên ${unitPrice}`,
        effectiveDate: effectiveDate ? new Date(effectiveDate).toISOString() : new Date().toISOString()
      });
      showToast('Đã lưu mức giá mới và bảo lưu giá cũ vào lịch sử!', 'success');
      closeModal();
      await loadPurchasePrices();
    } catch {
      showToast('Lỗi khi cập nhật giá mua vào', 'error');
    }
  });
};

// Modal Xem Toàn Bộ Lịch Sử Biến Động Giá
window.xnkOpenPurchaseHistoryModal = async function(id) {
  let item = null;
  try {
    const res = await api.get(`/api/purchase-prices/${id}`);
    item = res.data;
  } catch {
    showToast('Lỗi khi tải lịch sử giá', 'error');
    return;
  }

  const history = item.history || [item];

  const content = `
    <div style="padding: 6px 0;">
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:12px; margin-bottom:16px;">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
          <div>
            <div style="font-size:12px; color:#64748b;">MÃ SẢN PHẨM:</div>
            <div style="font-size:15px; font-weight:700; color:#0f172a; display:flex; align-items:center; gap:6px;">
              <span class="sku-badge">📦 ${escapeHtml(item.productSku)}</span>
              ${escapeHtml(item.productName)}
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:11.5px; color:#64748b;">Tổng số lần biến động giá:</div>
            <div style="font-size:16px; font-weight:700; color:#0266b3;">${history.length} mốc thời gian</div>
          </div>
        </div>
      </div>

      <div style="max-height: 420px; overflow-y: auto; padding-right: 6px;">
        <div class="price-history-timeline">
          ${history.map((h, idx) => {
            const isActive = h.isActive;
            const priceFormatted = h.currency === 'VND' 
              ? `${Number(h.unitPrice).toLocaleString('vi-VN')} ₫ / kg`
              : `$${Number(h.unitPrice).toFixed(2)} / kg`;
            return `
              <div class="timeline-item ${isActive ? 'active' : ''}">
                <div class="timeline-node"></div>
                <div class="timeline-content">
                  <div class="timeline-header">
                    <span class="timeline-price" style="color:${isActive ? '#059669' : '#334155'}; font-size:16px;">
                      ${priceFormatted}
                    </span>
                    <span class="timeline-badge ${isActive ? 'badge-active' : 'badge-history'}">
                      ${isActive ? '🟢 Đang áp dụng hiện hành' : '⚪ Mức giá trong quá khứ'}
                    </span>
                  </div>
                  <div class="timeline-meta">
                    <span>📅 <strong>Ngày hiệu lực:</strong> ${formatDate(h.effectiveDate)}</span>
                    <span>👤 <strong>Người cập nhật:</strong> ${escapeHtml(h.createdBy || 'Hệ thống')}</span>
                    <span>🕒 <strong>Thời điểm lưu:</strong> ${formatDate(h.createdAt)}</span>
                  </div>
                  ${h.notes ? `<div class="timeline-notes">📝 ${escapeHtml(h.notes)}</div>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div style="display:flex; justify-content:flex-end; margin-top:16px; border-top:1px solid #e2e8f0; padding-top:12px;">
        <button type="button" class="btn btn-default" onclick="window.closeModal()">Đóng</button>
      </div>
    </div>
  `;

  openModal(`Lịch Sử Biến Động Giá: ${item.productSku}`, content);
};

// Xóa giá mua vào
window.xnkDeletePurchasePrice = async function(id) {
  const confirmed = await showConfirm({
    title: 'Xác nhận xóa giá mua vào',
    message: 'Bạn có chắc chắn muốn xóa bản ghi giá này không? Nếu đây là giá đang kích hoạt, hệ thống sẽ tự động khôi phục giá liền kề trước đó.',
    type: 'danger',
    confirmText: '✔ Xóa',
    cancelText: 'Hủy'
  });
  if (!confirmed) return;

  try {
    await api.delete(`/api/purchase-prices/${id}`);
    showToast('Đã xóa bản ghi giá thành công!', 'success');
    await loadPurchasePrices();
  } catch {
    showToast('Lỗi khi xóa bản ghi', 'error');
  }
};


// =============================================================================
// TRANG 2: GIÁ BÁN RA / ÁNH XẠ XUẤT KHẨU (SALE PRICES)
// =============================================================================

let salePricesList = [];
let saleFilteredList = [];

export async function renderSalePrices(container) {
  container.innerHTML = `
    <div class="pricing-page-wrapper">
      <!-- Page Header -->
      <div class="pricing-header">
        <div class="pricing-header-title">
          <h2 class="pricing-title">
            <span class="title-icon">💵</span>
            Bảng Giá Bán Ra & Ánh Xạ Mã Xuất Khẩu
          </h2>
          <div class="pricing-subtitle">
            Quản lý mối liên kết chuyển đổi mã (VD: Mua vào mã VL0572 → Bán ra / Xuất khẩu mã VN905), theo dõi biên độ giá và lịch sử xuất hàng
          </div>
        </div>
        <div class="pricing-header-actions">
          <button id="btnSalePriceAdd" class="btn btn-primary" style="height:34px; padding:0 14px; font-weight:600; font-size:13px; display:inline-flex; align-items:center; gap:6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Thiết Lập Giá Bán Ra Mới
          </button>
          <button id="btnSaleExportExcel" class="btn btn-default" style="height:34px; padding:0 12px; font-size:13px; display:inline-flex; align-items:center; gap:6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Xuất Excel
          </button>
          <button id="btnSaleRefresh" class="btn btn-default" style="height:34px; padding:0 12px; font-size:13px; display:inline-flex; align-items:center; gap:6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            Nạp lại
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="pricing-kpi-grid">
        <div class="pricing-kpi-card kpi-purple">
          <div class="pricing-kpi-icon">🔄</div>
          <div class="pricing-kpi-body">
            <div class="pricing-kpi-label">Cặp Chuyển Đổi Mã (In → Out)</div>
            <div class="pricing-kpi-value" id="kpiSaleTotal">0 cặp mã</div>
            <div class="pricing-kpi-sub">Quy cách bán ra & xuất khẩu</div>
          </div>
        </div>

        <div class="pricing-kpi-card kpi-emerald">
          <div class="pricing-kpi-icon">💲</div>
          <div class="pricing-kpi-body">
            <div class="pricing-kpi-label">Giá Bán TB (USD)</div>
            <div class="pricing-kpi-value" id="kpiSaleAvgUsd">$0.00 / kg</div>
            <div class="pricing-kpi-sub" id="kpiSaleUsdCount">0 sản phẩm USD</div>
          </div>
        </div>

        <div class="pricing-kpi-card kpi-blue">
          <div class="pricing-kpi-icon">💵</div>
          <div class="pricing-kpi-body">
            <div class="pricing-kpi-label">Giá Bán TB (VNĐ)</div>
            <div class="pricing-kpi-value" id="kpiSaleAvgVnd">0 ₫ / kg</div>
            <div class="pricing-kpi-sub" id="kpiSaleVndCount">0 sản phẩm VNĐ</div>
          </div>
        </div>

        <div class="pricing-kpi-card kpi-amber">
          <div class="pricing-kpi-icon">📈</div>
          <div class="pricing-kpi-body">
            <div class="pricing-kpi-label">Biên Độ Trung Bình</div>
            <div class="pricing-kpi-value" id="kpiSaleMargin" style="color:#059669;">+0.00%</div>
            <div class="pricing-kpi-sub">Chênh lệch giá bán so với giá mua</div>
          </div>
        </div>
      </div>

      <!-- Toolbar Card -->
      <div class="pricing-toolbar-card">
        <div class="pricing-toolbar-left">
          <span style="font-size:12.5px; font-weight:600; color:#475569;">
            Bảng tham chiếu chi tiết: Sản phẩm Mua Vào ➔ Sản phẩm Bán Ra / Xuất Khẩu
          </span>
          <span style="font-size:11px; background:#f5f3ff; color:#7c3aed; padding:2px 8px; border-radius:12px; font-weight:600;">
            Tờ khai xuất khẩu cũ hoàn thành giữ nguyên giá bán lịch sử
          </span>
        </div>
        <div class="pricing-toolbar-right">
          <div class="pricing-search-box">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="saleSearchInput" class="pricing-search-input" placeholder="Lọc theo mã mua vào, mã bán ra (VN905)...">
          </div>
        </div>
      </div>

      <!-- Table Card -->
      <div class="pricing-table-card">
        <div class="pricing-table-container">
          <table class="modern-shipment-table" id="saleTable">
            <thead>
              <tr>
                <th style="width: 35px; text-align:center;">STT</th>
                <th style="min-width: 170px;">SP Mua Vào (Nguyên Liệu)</th>
                <th style="min-width: 130px; text-align:right;">Giá Mua Tham Chiếu</th>
                <th style="width: 40px; text-align:center;"></th>
                <th style="min-width: 140px;">Mã Xuất Khẩu (Đầu Ra)</th>
                <th style="min-width: 220px;">Tên Hàng Hoá Bán Ra / Xuất Khẩu</th>
                <th style="min-width: 130px; text-align:right;">Giá Bán Hiện Hành</th>
                <th style="min-width: 110px; text-align:center;">Biên Độ</th>
                <th style="min-width: 110px;">Ngày Hiệu Lực</th>
                <th style="min-width: 160px;">Ghi Chú Thị Trường</th>
                <th style="min-width: 120px; text-align:center;">Thao Tác</th>
              </tr>
            </thead>
            <tbody id="saleTbody">
              <tr><td colspan="11" style="text-align:center; padding: 32px; color: #64748b;">Đang nạp dữ liệu giá bán ra...</td></tr>
            </tbody>
          </table>
        </div>
        <div class="shipments-pagination-bar">
          <div id="salePaginationText">Tổng số: 0 bản ghi</div>
          <div style="font-size: 12px; color: #64748b;">Bấm vào 📜 để xem lịch sử điều chỉnh giá bán ra của từng mã xuất khẩu</div>
        </div>
      </div>
    </div>
  `;

  setupSaleEvents();
  await loadSalePrices();
}

async function loadSalePrices() {
  try {
    const res = await api.get('/api/sale-prices');
    salePricesList = res.data || [];
    saleFilteredList = [...salePricesList];
    updateSaleKpi(salePricesList);
    renderSaleTable(saleFilteredList);
  } catch (err) {
    showToast('Lỗi khi tải bảng giá bán ra', 'error');
  }
}

function updateSaleKpi(items) {
  const total = items.length;
  let usdSum = 0, usdCount = 0;
  let vndSum = 0, vndCount = 0;
  let marginTotal = 0, marginCount = 0;

  items.forEach(it => {
    const sVal = Number(it.unitPrice || 0);
    const pVal = Number(it.inputUnitPrice || 0);
    const curr = (it.currency || 'USD').toUpperCase();
    const inCurr = (it.inputCurrency || 'USD').toUpperCase();

    if (curr === 'VND') {
      vndSum += sVal;
      vndCount++;
    } else {
      usdSum += sVal;
      usdCount++;
    }

    if (curr === inCurr && pVal > 0) {
      const marginPct = ((sVal - pVal) / pVal) * 100;
      marginTotal += marginPct;
      marginCount++;
    }
  });

  const avgUsd = usdCount > 0 ? (usdSum / usdCount) : 0;
  const avgVnd = vndCount > 0 ? (vndSum / vndCount) : 0;
  const avgMargin = marginCount > 0 ? (marginTotal / marginCount) : 0;

  const kpiTot = document.getElementById('kpiSaleTotal');
  const kpiUsd = document.getElementById('kpiSaleAvgUsd');
  const kpiUsdCnt = document.getElementById('kpiSaleUsdCount');
  const kpiVnd = document.getElementById('kpiSaleAvgVnd');
  const kpiVndCnt = document.getElementById('kpiSaleVndCount');
  const kpiMargin = document.getElementById('kpiSaleMargin');

  if (kpiTot) kpiTot.textContent = `${total} cặp mã`;
  if (kpiUsd) kpiUsd.textContent = `$${avgUsd.toFixed(2)} / kg`;
  if (kpiUsdCnt) kpiUsdCnt.textContent = `${usdCount} sản phẩm USD`;
  if (kpiVnd) kpiVnd.textContent = `${Math.round(avgVnd).toLocaleString('vi-VN')} ₫ / kg`;
  if (kpiVndCnt) kpiVndCnt.textContent = `${vndCount} sản phẩm VNĐ`;
  if (kpiMargin) kpiMargin.textContent = avgMargin >= 0 ? `+${avgMargin.toFixed(1)}%` : `${avgMargin.toFixed(1)}%`;
}

function renderSaleTable(items) {
  const tbody = document.getElementById('saleTbody');
  const pag = document.getElementById('salePaginationText');
  if (!tbody) return;

  if (items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" style="text-align:center; padding: 40px; color: #64748b;">
          <div style="font-size: 28px; margin-bottom: 6px;">🏷️</div>
          <div style="font-weight: 600; color: #334155;">Chưa có dữ liệu giá bán ra / xuất khẩu</div>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Nhấn nút "Thiết Lập Giá Bán Ra Mới" để ánh xạ từ mã nguyên liệu sang mã xuất khẩu</div>
        </td>
      </tr>
    `;
    if (pag) pag.textContent = 'Tổng số: 0 bản ghi';
    return;
  }

  tbody.innerHTML = items.map((it, idx) => {
    const sVal = Number(it.unitPrice || 0);
    const pVal = Number(it.inputUnitPrice || 0);
    const curr = (it.currency || 'USD').toUpperCase();
    const inCurr = (it.inputCurrency || 'USD').toUpperCase();

    let marginHtml = `<span class="spread-badge spread-neutral">---</span>`;
    if (curr === inCurr && pVal > 0) {
      const diff = sVal - pVal;
      const pct = (diff / pVal) * 100;
      const isPos = diff >= 0;
      const diffFormatted = curr === 'VND' ? `${Math.round(diff).toLocaleString('vi-VN')} ₫` : `$${diff.toFixed(2)}`;
      marginHtml = `
        <span class="spread-badge ${isPos ? 'spread-positive' : 'spread-neutral'}" title="Chênh lệch: ${diffFormatted}">
          ${isPos ? '▲' : '▼'} ${isPos ? '+' : ''}${pct.toFixed(1)}%
        </span>
      `;
    }

    return `
      <tr class="shipment-main-row">
        <td style="text-align:center; color:#94a3b8;">${idx + 1}</td>
        <td>
          <div style="display:flex; flex-direction:column; gap:2px;">
            <span class="sku-badge" style="width:fit-content;">📦 ${escapeHtml(it.inputProductSku || '---')}</span>
            <span style="font-size:12px; color:#475569; font-weight:500;">${escapeHtml(it.inputProductName || '---')}</span>
          </div>
        </td>
        <td style="text-align:right;">
          ${formatMoney(it.inputUnitPrice, it.inputCurrency)}
          <span style="font-size:11px; color:#94a3b8; margin-left:3px;">/ kg</span>
        </td>
        <td style="text-align:center;">
          <span class="mapping-arrow">➔</span>
        </td>
        <td>
          <span class="sku-output-badge">
            <span>🏷️</span>
            <span>${escapeHtml(it.outputSku || '---')}</span>
          </span>
        </td>
        <td>
          <strong style="color:#0f172a; font-size:13px;">${escapeHtml(it.outputProductName || it.outputSku || '---')}</strong>
        </td>
        <td style="text-align:right;">
          ${formatMoney(it.unitPrice, it.currency)}
          <span style="font-size:11px; color:#94a3b8; margin-left:3px;">/ kg</span>
        </td>
        <td style="text-align:center;">
          ${marginHtml}
        </td>
        <td>
          <span style="font-family:monospace; color:#475569; font-size:12px;">
            📅 ${formatDate(it.effectiveDate)}
          </span>
        </td>
        <td>
          <span style="font-size:12px; color:#475569;" title="${escapeHtml(it.notes || '')}">
            ${escapeHtml(it.notes || '---')}
          </span>
        </td>
        <td style="text-align:center;">
          <div class="pricing-action-group">
            <button class="pricing-btn-icon" title="Cập nhật giá bán mới cho mã này (lưu giá cũ vào lịch sử)" onclick="window.xnkOpenUpdateSaleModal('${it.id}')">
              🔄
            </button>
            <button class="pricing-btn-icon" title="Xem lịch sử biến động giá bán" onclick="window.xnkOpenSaleHistoryModal('${it.id}')">
              📜
            </button>
            <button class="pricing-btn-icon" title="Xóa" style="color:var(--amis-red);" onclick="window.xnkDeleteSalePrice('${it.id}')">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (pag) pag.textContent = `Tổng số: ${items.length} bản ghi`;
}

function setupSaleEvents() {
  document.getElementById('btnSaleRefresh')?.addEventListener('click', loadSalePrices);
  document.getElementById('btnSalePriceAdd')?.addEventListener('click', () => openAddSaleModal());
  document.getElementById('btnSaleExportExcel')?.addEventListener('click', () => exportSaleToExcel());

  document.getElementById('saleSearchInput')?.addEventListener('input', (e) => {
    const q = (e.target.value || '').toLowerCase().trim();
    if (!q) {
      saleFilteredList = [...salePricesList];
    } else {
      saleFilteredList = salePricesList.filter(it => 
        (it.inputProductSku || '').toLowerCase().includes(q) ||
        (it.inputProductName || '').toLowerCase().includes(q) ||
        (it.outputSku || '').toLowerCase().includes(q) ||
        (it.outputProductName || '').toLowerCase().includes(q) ||
        (it.notes || '').toLowerCase().includes(q)
      );
    }
    renderSaleTable(saleFilteredList);
  });
}

function exportSaleToExcel() {
  if (saleFilteredList.length === 0) {
    showToast('Không có dữ liệu để xuất', 'warning');
    return;
  }
  const headers = ["STT", "Mã SP Mua Vào", "Tên SP Mua Vào", "Giá Mua Vào", "Tiền Tệ Mua", "Mã Xuất Khẩu (Output)", "Tên Hàng Bán Ra", "Giá Bán Ra", "Tiền Tệ Bán", "Ngày Hiệu Lực", "Ghi Chú"];
  const rows = saleFilteredList.map((it, idx) => [
    idx + 1,
    it.inputProductSku || '',
    it.inputProductName || '',
    it.inputUnitPrice || 0,
    it.inputCurrency || 'USD',
    it.outputSku || '',
    it.outputProductName || '',
    it.unitPrice || 0,
    it.currency || 'USD',
    formatDate(it.effectiveDate),
    it.notes || ''
  ]);
  const csvContent = "\uFEFF" + [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(","),
    ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))
  ].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Bang_Gia_Ban_Ra_Xuat_Khau_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Đã xuất file bảng giá bán ra thành công!', 'success');
}

// Modal Thêm Thiết Lập Giá Bán Ra Mới
async function openAddSaleModal() {
  let purchases = [];
  try {
    const res = await api.get('/api/purchase-prices');
    purchases = res.data || [];
  } catch { }

  if (purchases.length === 0) {
    showToast('Cần có ít nhất 1 bản ghi giá mua vào trước khi thiết lập giá bán ra', 'warning');
    return;
  }

  const content = `
    <div style="padding: 10px 0;">
      <div style="margin-bottom: 14px;">
        <label class="form-label required" style="font-weight:600; font-size:13px; margin-bottom:5px; display:block;">
          1. Chọn Sản Phẩm Mua Vào Làm Nguồn Tham Chiếu
        </label>
        <select id="spAddPurchaseSelect" class="form-select" style="width:100%; font-size:13.5px; padding:8px 10px;">
          <option value="">-- Chọn sản phẩm mua vào đã có giá --</option>
          ${purchases.map(p => `
            <option value="${p.id}" data-curr="${p.currency}" data-price="${p.unitPrice}" data-sku="${escapeHtml(p.productSku)}">
              [${escapeHtml(p.productSku)}] ${escapeHtml(p.productName)} — Giá mua: ${p.currency === 'VND' ? `${Number(p.unitPrice).toLocaleString('vi-VN')} ₫` : `$${Number(p.unitPrice).toFixed(2)}`}
            </option>
          `).join('')}
        </select>
        <div style="font-size:11.5px; color:#64748b; margin-top:4px;">
          * Ví dụ: Chọn mã nguyên liệu <strong>VL0572</strong> nhập về với giá 4$ hoặc 5$
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom: 14px;">
        <div>
          <label class="form-label required" style="font-weight:600; font-size:13px; margin-bottom:5px; display:block;">
            2. Mã Xuất Khẩu / Bán Ra (Output SKU)
          </label>
          <input type="text" id="spAddOutputSku" class="form-input" placeholder="VD: VN905" style="width:100%; font-size:13.5px; padding:8px 10px; font-weight:700; color:#7c3aed; text-transform:uppercase;">
          <div style="font-size:11.5px; color:#64748b; margin-top:3px;">
            Mã định danh khi bán hoặc xuất khẩu (VD: <strong>VN905</strong>)
          </div>
        </div>
        <div>
          <label class="form-label required" style="font-weight:600; font-size:13px; margin-bottom:5px; display:block;">
            Tên Hàng Hoá Bán Ra / Xuất Khẩu
          </label>
          <input type="text" id="spAddOutputName" class="form-input" placeholder="VD: Sợi Dệt Xuất Khẩu VN-905" style="width:100%; font-size:13.5px; padding:8px 10px;">
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom: 14px;">
        <div>
          <label class="form-label required" style="font-weight:600; font-size:13px; margin-bottom:5px; display:block;">
            Đơn Vị Tiền Tệ Bán Ra
          </label>
          <select id="spAddCurrency" class="form-select" style="width:100%; font-size:13.5px; padding:8px 10px;">
            <option value="USD">USD ($ - Đô la Mỹ)</option>
            <option value="VND">VND (₫ - Đồng Việt Nam)</option>
          </select>
        </div>
        <div>
          <label class="form-label required" style="font-weight:600; font-size:13px; margin-bottom:5px; display:block;">
            Đơn Giá Bán Ra (trên 1 KG)
          </label>
          <input type="number" id="spAddUnitPrice" step="0.0001" min="0" class="form-input" placeholder="VD: 5.50" style="width:100%; font-size:14px; padding:8px 10px; font-weight:700; color:#059669;">
        </div>
      </div>

      <div style="margin-bottom: 14px;">
        <label class="form-label" style="font-weight:600; font-size:13px; margin-bottom:5px; display:block;">
          Ngày Bắt Đầu Áp Dụng / Hiệu Lực
        </label>
        <input type="date" id="spAddEffectiveDate" class="form-input" value="${new Date().toISOString().slice(0, 10)}" style="width:100%; font-size:13px; padding:7px 10px;">
      </div>

      <div style="margin-bottom: 14px;">
        <label class="form-label" style="font-weight:600; font-size:13px; margin-bottom:5px; display:block;">
          Ghi Chú Thị Trường / Khách Hàng Xuất Khẩu
        </label>
        <textarea id="spAddNotes" class="form-input" rows="2" placeholder="VD: Xuất khẩu thị trường Nhật Bản / Hàn Quốc (Hợp đồng FOB)..." style="width:100%; font-size:13px; padding:8px 10px;"></textarea>
      </div>

      <div style="background:#f5f3ff; border:1px solid #ddd6fe; border-radius:6px; padding:10px 12px; font-size:12px; color:#5b21b6; line-height:1.4;">
        ℹ️ <strong>Quy tắc ánh xạ:</strong> Hệ thống lưu cặp chuyển đổi mã và giá bán hiện hành. Các đơn hàng/tờ khai xuất khẩu trong quá khứ đã chốt giá không bị thay đổi.
      </div>

      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:18px; border-top:1px solid #e2e8f0; padding-top:12px;">
        <button type="button" class="btn btn-default" onclick="window.closeModal()">Hủy bỏ</button>
        <button type="button" class="btn btn-primary" id="btnConfirmAddSale">Xác nhận tạo giá bán</button>
      </div>
    </div>
  `;

  openModal('Thiết Lập Giá Bán Ra & Ánh Xạ Xuất Khẩu', content);

  document.getElementById('btnConfirmAddSale')?.addEventListener('click', async () => {
    const purchasePriceId = document.getElementById('spAddPurchaseSelect').value;
    const outputSku = document.getElementById('spAddOutputSku').value.trim();
    const outputProductName = document.getElementById('spAddOutputName').value.trim();
    const currency = document.getElementById('spAddCurrency').value;
    const unitPrice = parseFloat(document.getElementById('spAddUnitPrice').value);
    const effectiveDate = document.getElementById('spAddEffectiveDate').value;
    const notes = document.getElementById('spAddNotes').value;

    if (!purchasePriceId) {
      showToast('Vui lòng chọn sản phẩm mua vào', 'warning');
      return;
    }
    if (!outputSku) {
      showToast('Vui lòng nhập mã bán ra / xuất khẩu (VD: VN905)', 'warning');
      return;
    }
    if (isNaN(unitPrice) || unitPrice < 0) {
      showToast('Đơn giá bán ra không hợp lệ', 'warning');
      return;
    }

    try {
      await api.post('/api/sale-prices', {
        purchasePriceId,
        outputSku: outputSku.toUpperCase(),
        outputProductName: outputProductName || null,
        currency,
        unitPrice,
        notes: notes.trim() || null,
        effectiveDate: effectiveDate ? new Date(effectiveDate).toISOString() : new Date().toISOString()
      });
      showToast('Đã thiết lập giá bán ra thành công!', 'success');
      closeModal();
      await loadSalePrices();
    } catch {
      showToast('Lỗi khi tạo giá bán ra', 'error');
    }
  });
}

// Modal Cập Nhật Giá Bán Ra Mới
window.xnkOpenUpdateSaleModal = async function(id) {
  let item = null;
  try {
    const res = await api.get(`/api/sale-prices/${id}`);
    item = res.data;
  } catch {
    showToast('Lỗi khi tải thông tin giá bán', 'error');
    return;
  }

  const content = `
    <div style="padding: 10px 0;">
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:12px; margin-bottom:16px;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px; flex-wrap:wrap;">
          <span class="sku-badge">📦 Mua vào: ${escapeHtml(item.inputProductSku)}</span>
          <span class="mapping-arrow">➔</span>
          <span class="sku-output-badge">🏷️ Xuất khẩu: ${escapeHtml(item.outputSku)}</span>
        </div>
        <div style="font-size:13.5px; font-weight:700; color:#0f172a;">
          ${escapeHtml(item.outputProductName || item.outputSku)}
        </div>
        <div style="margin-top:8px; font-size:13px; color:#475569;">
          Giá bán hiện tại: <strong style="color:#059669; font-size:15px; font-family:monospace;">${item.currency === 'VND' ? `${Number(item.unitPrice).toLocaleString('vi-VN')} ₫` : `$${Number(item.unitPrice).toFixed(2)}`}</strong>
          <span style="font-size:11.5px; color:#94a3b8; margin-left:6px;">(Giá mua tham chiếu: ${item.inputCurrency === 'VND' ? `${Number(item.inputUnitPrice).toLocaleString('vi-VN')} ₫` : `$${Number(item.inputUnitPrice).toFixed(2)}`})</span>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom: 14px;">
        <div>
          <label class="form-label required" style="font-weight:600; font-size:13px; margin-bottom:5px; display:block;">
            Tiền Tệ
          </label>
          <select id="spUpdCurrency" class="form-select" style="width:100%; font-size:13.5px; padding:8px 10px;">
            <option value="USD" ${item.currency === 'USD' ? 'selected' : ''}>USD ($ - Đô la Mỹ)</option>
            <option value="VND" ${item.currency === 'VND' ? 'selected' : ''}>VND (₫ - Đồng Việt Nam)</option>
          </select>
        </div>
        <div>
          <label class="form-label required" style="font-weight:600; font-size:13px; margin-bottom:5px; display:block;">
            Đơn Giá Bán Ra Mới (trên 1 KG)
          </label>
          <input type="number" id="spUpdUnitPrice" step="0.0001" min="0" class="form-input" value="${item.unitPrice}" style="width:100%; font-size:14px; padding:8px 10px; font-weight:700; color:#059669;">
        </div>
      </div>

      <div style="margin-bottom: 14px;">
        <label class="form-label required" style="font-weight:600; font-size:13px; margin-bottom:5px; display:block;">
          Ngày Bắt Đầu Áp Dụng Mức Giá Mới
        </label>
        <input type="date" id="spUpdEffectiveDate" class="form-input" value="${new Date().toISOString().slice(0, 10)}" style="width:100%; font-size:13px; padding:7px 10px;">
      </div>

      <div style="margin-bottom: 14px;">
        <label class="form-label" style="font-weight:600; font-size:13px; margin-bottom:5px; display:block;">
          Lý Do Điều Chỉnh Giá Bán Ra
        </label>
        <textarea id="spUpdNotes" class="form-input" rows="2" placeholder="VD: Điều chỉnh giá bán theo biến động thị trường xuất khẩu..." style="width:100%; font-size:13px; padding:8px 10px;"></textarea>
      </div>

      <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:6px; padding:10px 12px; font-size:12px; color:#065f46; line-height:1.4;">
        ℹ️ Mức giá bán cũ (${item.currency === 'VND' ? `${Number(item.unitPrice).toLocaleString('vi-VN')} ₫` : `$${Number(item.unitPrice).toFixed(2)}`}) sẽ được lưu lại vào <strong>Lịch sử giá bán</strong>. Tờ khai xuất khẩu và hóa đơn cũ đã chốt giữ nguyên giá bán lịch sử.
      </div>

      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:18px; border-top:1px solid #e2e8f0; padding-top:12px;">
        <button type="button" class="btn btn-default" onclick="window.closeModal()">Hủy bỏ</button>
        <button type="button" class="btn btn-primary" id="btnConfirmUpdSale">Lưu mức giá mới</button>
      </div>
    </div>
  `;

  openModal(`Điều Chỉnh Giá Bán Ra: ${item.outputSku}`, content);

  document.getElementById('btnConfirmUpdSale')?.addEventListener('click', async () => {
    const currency = document.getElementById('spUpdCurrency').value;
    const unitPrice = parseFloat(document.getElementById('spUpdUnitPrice').value);
    const effectiveDate = document.getElementById('spUpdEffectiveDate').value;
    const notes = document.getElementById('spUpdNotes').value;

    if (isNaN(unitPrice) || unitPrice < 0) {
      showToast('Đơn giá bán mới không hợp lệ', 'warning');
      return;
    }

    try {
      await api.post('/api/sale-prices', {
        purchasePriceId: item.purchasePriceId,
        outputSku: item.outputSku,
        outputProductName: item.outputProductName,
        currency,
        unitPrice,
        notes: notes.trim() || `Điều chỉnh từ ${item.unitPrice} lên ${unitPrice}`,
        effectiveDate: effectiveDate ? new Date(effectiveDate).toISOString() : new Date().toISOString()
      });
      showToast('Đã lưu mức giá bán mới và bảo lưu giá cũ vào lịch sử!', 'success');
      closeModal();
      await loadSalePrices();
    } catch {
      showToast('Lỗi khi cập nhật giá bán ra', 'error');
    }
  });
};

// Modal Xem Toàn Bộ Lịch Sử Biến Động Giá Bán Ra
window.xnkOpenSaleHistoryModal = async function(id) {
  let item = null;
  try {
    const res = await api.get(`/api/sale-prices/${id}`);
    item = res.data;
  } catch {
    showToast('Lỗi khi tải lịch sử giá bán', 'error');
    return;
  }

  const history = item.history || [item];

  const content = `
    <div style="padding: 6px 0;">
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:12px; margin-bottom:16px;">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
          <div>
            <div style="font-size:12px; color:#64748b;">ÁNH XẠ CHUYỂN ĐỔI:</div>
            <div style="display:flex; align-items:center; gap:8px; margin-top:2px; font-size:14px; font-weight:700;">
              <span class="sku-badge">📦 ${escapeHtml(item.inputProductSku)}</span>
              <span class="mapping-arrow">➔</span>
              <span class="sku-output-badge">🏷️ ${escapeHtml(item.outputSku)}</span>
            </div>
            <div style="font-size:13px; color:#475569; margin-top:3px;">${escapeHtml(item.outputProductName || '')}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:11.5px; color:#64748b;">Số mốc giá bán ra:</div>
            <div style="font-size:16px; font-weight:700; color:#7c3aed;">${history.length} lần điều chỉnh</div>
          </div>
        </div>
      </div>

      <div style="max-height: 420px; overflow-y: auto; padding-right: 6px;">
        <div class="price-history-timeline">
          ${history.map((h, idx) => {
            const isActive = h.isActive;
            const priceFormatted = h.currency === 'VND' 
              ? `${Number(h.unitPrice).toLocaleString('vi-VN')} ₫ / kg`
              : `$${Number(h.unitPrice).toFixed(2)} / kg`;
            return `
              <div class="timeline-item ${isActive ? 'active' : ''}">
                <div class="timeline-node" style="border-color:${isActive ? '#7c3aed' : '#94a3b8'};"></div>
                <div class="timeline-content">
                  <div class="timeline-header">
                    <span class="timeline-price" style="color:${isActive ? '#7c3aed' : '#334155'}; font-size:16px;">
                      ${priceFormatted}
                    </span>
                    <span class="timeline-badge ${isActive ? 'badge-active' : 'badge-history'}" style="${isActive ? 'background:#f5f3ff; color:#7c3aed; border-color:#ddd6fe;' : ''}">
                      ${isActive ? '🟢 Mức giá bán hiện hành' : '⚪ Mức giá bán quá khứ'}
                    </span>
                  </div>
                  <div class="timeline-meta">
                    <span>📅 <strong>Ngày hiệu lực:</strong> ${formatDate(h.effectiveDate)}</span>
                    <span>👤 <strong>Người cập nhật:</strong> ${escapeHtml(h.createdBy || 'Hệ thống')}</span>
                    <span>🕒 <strong>Thời điểm lưu:</strong> ${formatDate(h.createdAt)}</span>
                  </div>
                  ${h.notes ? `<div class="timeline-notes" style="border-left-color:#7c3aed;">📝 ${escapeHtml(h.notes)}</div>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div style="display:flex; justify-content:flex-end; margin-top:16px; border-top:1px solid #e2e8f0; padding-top:12px;">
        <button type="button" class="btn btn-default" onclick="window.closeModal()">Đóng</button>
      </div>
    </div>
  `;

  openModal(`Lịch Sử Giá Bán: ${item.outputSku}`, content);
};

// Xóa giá bán ra
window.xnkDeleteSalePrice = async function(id) {
  const confirmed = await showConfirm({
    title: 'Xác nhận xóa giá bán ra',
    message: 'Bạn có chắc chắn muốn xóa bản ghi giá bán này không? Nếu đang là giá hiện hành, hệ thống sẽ khôi phục giá bán liền kề trước đó.',
    type: 'danger',
    confirmText: '✔ Xóa',
    cancelText: 'Hủy'
  });
  if (!confirmed) return;

  try {
    await api.delete(`/api/sale-prices/${id}`);
    showToast('Đã xóa bản ghi giá bán thành công!', 'success');
    await loadSalePrices();
  } catch {
    showToast('Lỗi khi xóa bản ghi', 'error');
  }
};

