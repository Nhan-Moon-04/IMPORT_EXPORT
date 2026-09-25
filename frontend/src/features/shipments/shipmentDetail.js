// frontend/src/features/shipments/shipmentDetail.js
import { api, toast, openModal, closeModal, showConfirm } from '../../core/api.js';

export async function renderShipmentDetail(container, shipmentId) {
  container.innerHTML = `
    <div style="padding:40px; text-align:center;">
      <div class="spinner"></div>
      <p style="margin-top:10px; color:#6b7280;">Đang tải chi tiết lô hàng...</p>
    </div>
  `;

  try {
    let shipment = null;
    let invoices = [];
    let documents = [];

    // Fetch shipment info, invoices, documents in parallel
    const [shpRes, invRes, docRes] = await Promise.all([
      api.get(`/api/shipments/${shipmentId}`).catch(() => null),
      api.get(`/api/invoices?shipmentId=${shipmentId}`).catch(() => ({ data: [] })),
      api.get(`/api/documents?shipmentId=${shipmentId}`).catch(() => ({ data: [] }))
    ]);

    shipment = shpRes?.data;
    invoices = invRes?.data?.items || invRes?.data || [];
    documents = docRes?.data?.items || docRes?.data || [];

    if (!shipment) {
      // If not found by ID, try getting from list
      const listRes = await api.get('/api/shipments');
      const all = listRes.data?.items || listRes.data || [];
      shipment = all.find(s => s.id === shipmentId || s.code === shipmentId || s.shipmentCode === shipmentId);
    }

    if (!shipment) {
      container.innerHTML = `
        <div class="card" style="text-align:center; padding:40px;">
          <h3 style="color:#ef4444; margin-bottom:12px;">Không tìm thấy thông tin lô hàng</h3>
          <p style="color:#6b7280; margin-bottom:20px;">Mã lô hàng không tồn tại hoặc đã bị xóa.</p>
          <button class="btn btn-secondary" onclick="window.appNavigateTo('shipments')">← Quay lại danh sách lô hàng</button>
        </div>
      `;
      return;
    }

    const items = shipment.items || [];
    const totalQty = items.reduce((sum, it) => sum + (it.quantity || 0), 0);
    const totalVal = items.reduce((sum, it) => sum + (it.totalPrice || (it.quantity * it.unitPrice) || 0), 0);

    const trueInvoices = invoices.filter(i => i.type !== 'PackingList');
    const packingLists = invoices.filter(i => i.type === 'PackingList');

    const isCompleted = shipment.status === 'Completed';
    const statusBadgeClass = {
      'Draft': 'chip-draft',
      'PendingPayment': 'chip-warning',
      'Paid30': 'chip-warning',
      'Paid70': 'chip-warning',
      'PendingImport': 'chip-transit',
      'Completed': 'chip-delivered',
      'Cancelled': 'chip-cancelled'
    }[shipment.status] || 'chip-draft';

    const statusLabel = {
      'Draft': 'Bản nháp',
      'PendingPayment': 'Chờ thanh toán',
      'Paid30': 'Đã thanh toán 30%',
      'Paid70': 'Đã thanh toán 70%',
      'PendingImport': 'Chờ nhập hàng',
      'Completed': 'Đã hoàn thành',
      'Cancelled': 'Đã hủy'
    }[shipment.status] || shipment.status;

    container.innerHTML = `
      <!-- SHIPMENT HEADER -->
      <div class="shipment-detail-header">
        <div class="shipment-title-row">
          <div class="shipment-title-left">
            <div style="display:flex; align-items:center; gap:10px;">
              <button class="btn btn-secondary" onclick="window.appNavigateTo('shipments')" style="padding:4px 8px; font-size:12px;">
                ← Danh sách lô
              </button>
              <h2 style="font-size:18px; font-weight:700; color:var(--amis-blue); margin:0;">
                Lô Hàng: ${shipment.code || shipment.shipmentCode}
              </h2>
              <span class="status-chip ${statusBadgeClass}">${statusLabel}</span>
            </div>
            <div class="shipment-meta">
              <span><strong>Loại hình:</strong> ${shipment.type === 'Import' ? 'Nhập khẩu Sợi' : 'Xuất khẩu Sợi'}</span>
              <span><strong>Vận đơn B/L:</strong> ${shipment.blNumber || 'Chưa cập nhật'}</span>
              <span><strong>Đối tác:</strong> ${shipment.supplierName || shipment.customerName || 'Chưa cập nhật'}</span>
              <span><strong>Incoterm:</strong> ${shipment.deliveryTerm || shipment.incoterms || 'CIF'}</span>
            </div>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-default" id="btn-refresh-shipment-detail" style="padding: 6px 12px;" title="Nạp lại dữ liệu">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            </button>
            <button class="btn btn-secondary" id="btn-edit-current-shipment" ${isCompleted ? 'disabled title="Đã hoàn thành, không thể sửa"' : ''}>✏️ Sửa lô hàng</button>
            <button class="btn btn-primary" id="btn-quick-upload-doc" ${isCompleted ? 'disabled title="Đã hoàn thành, không thể thêm"' : ''}>+ Thêm chứng từ</button>
          </div>
        </div>

        <!-- 10-TABS NAVIGATION -->
        <div class="detail-tabs-bar">
          <button class="detail-tab active" data-tab="tab-overview">1. Tổng Quan</button>
          <button class="detail-tab" data-tab="tab-products">2. Sản Phẩm Sợi (${items.length})</button>
          <button class="detail-tab" data-tab="tab-invoices">3. Invoice (${trueInvoices.length})</button>
          <button class="detail-tab" data-tab="tab-packinglist">4. Packing List (${packingLists.length})</button>
          <button class="detail-tab" data-tab="tab-booking">5. Booking</button>
          <button class="detail-tab" data-tab="tab-container">6. Container</button>
          <button class="detail-tab" data-tab="tab-customs">7. Hải Quan</button>
          <button class="detail-tab" data-tab="tab-costs">8. Chi Phí</button>
          <button class="detail-tab" data-tab="tab-docs">9. Chứng Từ (${documents.length})</button>
          <button class="detail-tab" data-tab="tab-history">10. Lịch Sử</button>
        </div>
      </div>

      <!-- TAB CONTENTS -->
      <div id="shipment-tab-content">
        <!-- TAB 1: TỔNG QUAN -->
        <div class="tab-pane active" id="tab-overview">
          <div style="display:grid; grid-template-columns: 2fr 1fr; gap:14px;">
            <div class="card">
              <h3 style="font-size:14px; font-weight:700; color:var(--amis-blue); margin-bottom:12px; border-bottom:1px solid var(--amis-border); padding-bottom:6px;">
                Thông Tin Vận Chuyển & Cảng Biển
              </h3>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:13px; line-height:1.7;">
                <div><span style="color:#6b7280;">Cảng bốc hàng (POL):</span><br><strong>${shipment.portOfLoading || shipment.originPort || '---'}</strong></div>
                <div><span style="color:#6b7280;">Cảng dỡ hàng (POD):</span><br><strong>${shipment.portOfDischarge || shipment.destinationPort || '---'}</strong></div>
                <div><span style="color:#6b7280;">Ngày dự kiến:</span><br><strong>${shipment.expectedDate ? new Date(shipment.expectedDate).toLocaleDateString('vi-VN') : '---'}</strong></div>
                <div><span style="color:#6b7280;">Ghi chú:</span><br><strong>${shipment.notes || '---'}</strong></div>
              </div>
            </div>

            <div class="card">
              <h3 style="font-size:14px; font-weight:700; color:var(--amis-blue); margin-bottom:12px; border-bottom:1px solid var(--amis-border); padding-bottom:6px;">
                Tóm Tắt Khối Lượng & Giá Trị
              </h3>
              <div style="font-size:13px; line-height:2;">
                <div style="display:flex; justify-content:space-between;">
                  <span style="color:#6b7280;">Tổng số lượng:</span>
                  <strong>${Number(totalQty).toLocaleString()} kg</strong>
                </div>
                <div style="display:flex; justify-content:space-between;">
                  <span style="color:#6b7280;">Tổng GW:</span>
                  <strong>${Number(shipment.totalGrossWeight || 0).toLocaleString()} kg</strong>
                </div>
                <div style="display:flex; justify-content:space-between;">
                  <span style="color:#6b7280;">Tổng tiền hàng:</span>
                  <strong style="color:var(--amis-green); font-size:15px;">$${Number(totalVal).toLocaleString()} ${shipment.currency || 'USD'}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 2: SẢN PHẨM SỢI -->
        <div class="tab-pane" id="tab-products" style="display:none;">
          <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <h3 style="font-size:14px; font-weight:700; color:var(--amis-blue);">Mặt Hàng Sợi Trong Lô</h3>
              <span style="font-size:12px; color:#6b7280;">Tổng cộng: <strong>${items.length}</strong> mặt hàng</span>
            </div>
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Mã Hàng / SKU</th>
                    <th>Tên Sản Phẩm Sợi</th>
                    <th style="text-align:right;">Số Lượng (kg)</th>
                    <th style="text-align:right;">GW (kg)</th>
                    <th style="text-align:right;">Đơn Giá ($)</th>
                    <th style="text-align:right;">Thành Tiền ($)</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.length === 0 ? '<tr><td colspan="7" style="text-align:center; padding:30px; color:#6b7280;">Lô hàng chưa có chi tiết mặt hàng sợi</td></tr>' : 
                    items.map((it, idx) => `
                      <tr>
                        <td style="text-align:center;">${idx + 1}</td>
                        <td style="font-weight:700; color:var(--amis-blue);">${it.productCode || it.sku || '---'}</td>
                        <td>${it.productName || '---'}</td>
                        <td style="text-align:right; font-weight:600;">${Number(it.quantity || 0).toLocaleString()}</td>
                        <td style="text-align:right;">${Number(it.grossWeight || 0).toLocaleString()}</td>
                        <td style="text-align:right;">$${Number(it.unitPrice || 0).toFixed(2)}</td>
                        <td style="text-align:right; font-weight:700; color:var(--amis-green);">$${Number(it.totalPrice || (it.quantity * it.unitPrice)).toLocaleString()}</td>
                      </tr>
                    `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- TAB 3: INVOICE -->
        <div class="tab-pane" id="tab-invoices" style="display:none;">
          <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <h3 style="font-size:14px; font-weight:700; color:var(--amis-blue);">Hóa Đơn Thương Mại (Invoices)</h3>
              <button class="btn btn-primary" id="btn-add-inv-for-shp" ${isCompleted ? 'disabled title="Đã hoàn thành"' : ''}>+ Tạo Invoice Cho Lô Này</button>
            </div>
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Số Invoice</th>
                    <th>Ngày Hóa Đơn</th>
                    <th>Loại</th>
                    <th>Điều Kiện TT</th>
                    <th style="text-align:right;">Tổng Giá Trị</th>
                    <th>Tiền Tệ</th>
                  </tr>
                </thead>
                <tbody>
                  ${trueInvoices.length === 0 ? '<tr><td colspan="6" style="text-align:center; padding:30px; color:#6b7280;">Chưa liên kết Invoice nào với lô hàng này</td></tr>' :
                    trueInvoices.map(inv => `
                      <tr>
                        <td style="font-weight:700; color:var(--amis-blue);">${inv.invoiceNumber}</td>
                        <td>${inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('vi-VN') : '---'}</td>
                        <td><span class="status-chip chip-transit">${inv.type || 'Commercial'}</span></td>
                        <td>${inv.paymentTerms || '---'}</td>
                        <td style="text-align:right; font-weight:700; color:var(--amis-green);">$${Number(inv.totalValue || inv.totalAmount || 0).toLocaleString()}</td>
                        <td>${inv.currency || 'USD'}</td>
                      </tr>
                    `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- TAB 4: PACKING LIST -->
        <div class="tab-pane" id="tab-packinglist" style="display:none;">
          <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <h3 style="font-size:14px; font-weight:700; color:var(--amis-blue);">Bảng Kê Đóng Gói (Packing List)</h3>
              <button class="btn btn-primary" id="btn-add-pl-for-shp" ${isCompleted ? 'disabled title="Đã hoàn thành"' : ''}>+ Tạo Packing List</button>
            </div>
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Số Packing List</th>
                    <th>Ngày Lập</th>
                    <th>Loại</th>
                    <th style="text-align:right;">Tổng Giá Trị</th>
                  </tr>
                </thead>
                <tbody>
                  ${packingLists.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding:30px; color:#6b7280;">Chưa tạo Packing List nào cho lô hàng này</td></tr>' :
                    packingLists.map(pl => `
                      <tr>
                        <td style="font-weight:700; color:var(--amis-blue);">${pl.invoiceNumber}</td>
                        <td>${pl.invoiceDate ? new Date(pl.invoiceDate).toLocaleDateString('vi-VN') : '---'}</td>
                        <td><span class="status-chip chip-transit">Packing List</span></td>
                        <td style="text-align:right; font-weight:700; color:var(--amis-green);">$${Number(pl.totalValue || pl.totalAmount || 0).toLocaleString()}</td>
                      </tr>
                    `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- TAB 5: BOOKING -->
        <div class="tab-pane" id="tab-booking" style="display:none;">
          <div class="card">
            <h3 style="font-size:14px; font-weight:700; color:var(--amis-blue); margin-bottom:12px;">Thông Tin Đặt Chỗ (Booking Confirmation)</h3>
            <div style="padding: 30px; text-align: center; color: var(--text-muted);">
              Chức năng Booking đang được phát triển...
            </div>
          </div>
        </div>

        <!-- TAB 6: CONTAINER -->
        <div class="tab-pane" id="tab-container" style="display:none;">
          <div class="card">
            <h3 style="font-size:14px; font-weight:700; color:var(--amis-blue); margin-bottom:12px;">Danh Sách Container & Số Chì (Seal)</h3>
            <div style="padding: 30px; text-align: center; color: var(--text-muted);">
              Chức năng Container đang được phát triển...
            </div>
          </div>
        </div>

        <!-- TAB 7: HẢI QUAN -->
        <div class="tab-pane" id="tab-customs" style="display:none;">
          <div class="card">
            <h3 style="font-size:14px; font-weight:700; color:var(--amis-blue); margin-bottom:12px;">Hồ Sơ Tờ Khai Hải Quan</h3>
            <div style="padding: 30px; text-align: center; color: var(--text-muted);">
              Chức năng Hải Quan đang được phát triển...
            </div>
          </div>
        </div>

        <!-- TAB 8: CHI PHÍ -->
        <div class="tab-pane" id="tab-costs" style="display:none;">
          <div class="card">
            <h3 style="font-size:14px; font-weight:700; color:var(--amis-blue); margin-bottom:12px;">Bảng Kê Chi Phí Lô Hàng (Landed Cost)</h3>
            <div style="padding: 30px; text-align: center; color: var(--text-muted);">
              Chức năng Chi Phí đang được phát triển...
            </div>
          </div>
        </div>

        <!-- TAB 9: CHỨNG TỪ -->
        <div class="tab-pane" id="tab-docs" style="display:none;">
          <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <h3 style="font-size:14px; font-weight:700; color:var(--amis-blue);">Hồ Sơ Chứng Từ Đính Kèm Của Lô Hàng</h3>
              <button class="btn btn-primary" id="btn-add-doc-for-shp" ${isCompleted ? 'disabled title="Đã hoàn thành"' : ''}>+ Upload Tệp Chứng Từ</button>
            </div>
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Tên Tệp</th>
                    <th>Phân Loại</th>
                    <th>Định dạng</th>
                    <th>Dung Lượng</th>
                    <th>Ngày Đăng</th>
                    <th style="text-align: center;">Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  ${documents.length === 0 ? '<tr><td colspan="6" style="text-align:center; padding:30px; color:#6b7280;">Chưa có chứng từ đính kèm cho lô này</td></tr>' :
                    documents.map(d => `
                      <tr>
                        <td style="font-weight:600; color:var(--misa-blue); cursor:pointer;" onclick="window.xnkDownloadDoc('${d.id}', '${d.originalFileName || d.fileName}')">
                          <u>${d.originalFileName || d.fileName}</u>
                        </td>
                        <td><span class="chip chip-info">${d.category || 'Other'}</span></td>
                        <td><span style="font-size:11px; padding:2px 6px; border-radius:4px; background:#f3f4f6; border:1px solid #e5e7eb;">${(d.fileType || '').toUpperCase()}</span></td>
                        <td>${d.fileSize ? (d.fileSize / 1024 > 1024 ? (d.fileSize / (1024*1024)).toFixed(2) + ' MB' : (d.fileSize / 1024).toFixed(1) + ' KB') : '---'}</td>
                        <td>${d.createdAt ? new Date(d.createdAt).toLocaleDateString('vi-VN') : '---'}</td>
                        <td style="text-align: center;">
                          <button class="btn btn-default btn-sm" title="Tải xuống" onclick="window.xnkDownloadDoc('${d.id}', '${d.originalFileName || d.fileName}')">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--amis-green)" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                          </button>
                          <button class="btn btn-default btn-sm" title="Xóa" ${isCompleted ? 'disabled' : ''} onclick="window.xnkDeleteDocFromShipment('${d.id}', '${d.originalFileName || d.fileName}')">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--amis-red)" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        </td>
                      </tr>
                    `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- TAB 10: LỊCH SỬ -->
        <div class="tab-pane" id="tab-history" style="display:none;">
          <div class="card">
            <h3 style="font-size:14px; font-weight:700; color:var(--amis-blue); margin-bottom:12px;">Lịch Sử Tiến Trình & Nhật Ký Thao Tác (Audit Trail)</h3>
            <div style="padding: 30px; text-align: center; color: var(--text-muted);">
              Chức năng Lịch Sử đang được phát triển...
            </div>
          </div>
        </div>
      </div>
    `;

    // Tab switching event
    container.querySelectorAll('.detail-tab').forEach(tabBtn => {
      tabBtn.addEventListener('click', () => {
        container.querySelectorAll('.detail-tab').forEach(b => b.classList.remove('active'));
        container.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');

        tabBtn.classList.add('active');
        const targetId = tabBtn.getAttribute('data-tab');
        const pane = document.getElementById(targetId);
        if (pane) pane.style.display = 'block';
      });
    });

    // Event handlers for Modal Triggers
    document.getElementById("btn-refresh-shipment-detail")?.addEventListener("click", () => {
      renderShipmentDetail(container, shipmentId);
    });

    document.getElementById("btn-edit-current-shipment")?.addEventListener("click", () => {
      if (window.xnkEditShipment) window.xnkEditShipment(shipment.id);
      else toast("Chưa tải module Shipments. Hãy vào danh sách lô hàng trước.", "warning");
    });

    document.getElementById("btn-quick-upload-doc")?.addEventListener("click", () => {
      if (window.xnkUploadDocumentModal) window.xnkUploadDocumentModal(shipment.id);
      else toast("Chưa tải module Documents. Vui lòng vào trang Chứng từ trước.", "warning");
    });

    document.getElementById("btn-add-doc-for-shp")?.addEventListener("click", () => {
      if (window.xnkUploadDocumentModal) window.xnkUploadDocumentModal(shipment.id);
      else toast("Chưa tải module Documents. Vui lòng vào trang Chứng từ trước.", "warning");
    });

    document.getElementById("btn-add-inv-for-shp")?.addEventListener("click", () => {
      if (window.xnkCreateInvoiceModal) window.xnkCreateInvoiceModal(shipment.id, 'CommercialInvoice');
      else toast("Chưa tải module Invoices. Vui lòng vào trang Invoices trước.", "warning");
    });

    document.getElementById("btn-add-pl-for-shp")?.addEventListener("click", () => {
      if (window.xnkCreateInvoiceModal) window.xnkCreateInvoiceModal(shipment.id, 'PackingList');
      else toast("Chưa tải module Invoices. Vui lòng vào trang Invoices trước.", "warning");
    });

    // Fix context issue for Delete Doc
    window.xnkDeleteDocFromShipment = async (docId, fileName) => {
      const isConfirm = await showConfirm({
        title: 'Xóa Chứng Từ',
        message: 'Bạn có chắc chắn muốn xóa file chứng từ này khỏi hệ thống?',
        highlight: fileName,
        type: 'danger',
        confirmText: 'Xóa File'
      });
  
      if (isConfirm) {
        try {
          await api.delete(`/api/documents/${docId}`);
          toast("Đã xóa file thành công!", "success");
          renderShipmentDetail(container, shipmentId); // Refresh
        } catch (err) {
          toast("Lỗi khi xóa file", "error");
        }
      }
    };

  } catch (err) {
    container.innerHTML = `<div class="card" style="padding:20px; color:red;">Lỗi tải chi tiết: ${err.message}</div>`;
  }
}
