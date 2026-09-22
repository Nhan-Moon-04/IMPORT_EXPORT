// frontend/src/features/shipments/shipmentDetail.js
import { api, toast, openModal, closeModal } from '../../core/api.js';

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
      shipment = all.find(s => s.id === shipmentId || s.code === shipmentId);
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

    const statusBadgeClass = {
      'Draft': 'chip-draft',
      'InTransit': 'chip-transit',
      'Customs': 'chip-customs',
      'Delivered': 'chip-delivered',
      'Cancelled': 'chip-cancelled'
    }[shipment.status] || 'chip-draft';

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
              <span class="status-chip ${statusBadgeClass}">${shipment.status || 'Draft'}</span>
            </div>
            <div class="shipment-meta">
              <span><strong>Loại hình:</strong> ${shipment.type === 'Import' ? 'Nhập khẩu Sợi' : 'Xuất khẩu Sợi'}</span>
              <span><strong>Vận đơn B/L:</strong> ${shipment.blNumber || 'Chưa cập nhật'}</span>
              <span><strong>Đối tác:</strong> ${shipment.supplierName || shipment.customerName || 'LONG CHENG WU TEXTILE CO., LTD'}</span>
              <span><strong>Incoterm:</strong> ${shipment.incoterms || 'CIF Cat Lai'}</span>
            </div>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-secondary" id="btn-edit-current-shipment">✏️ Sửa lô hàng</button>
            <button class="btn btn-primary" id="btn-quick-upload-doc">+ Thêm chứng từ</button>
          </div>
        </div>

        <!-- 10-TABS NAVIGATION -->
        <div class="detail-tabs-bar">
          <button class="detail-tab active" data-tab="tab-overview">1. Tổng Quan</button>
          <button class="detail-tab" data-tab="tab-products">2. Sản Phẩm Sợi (${items.length})</button>
          <button class="detail-tab" data-tab="tab-invoices">3. Invoice (${invoices.length})</button>
          <button class="detail-tab" data-tab="tab-packinglist">4. Packing List</button>
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
                <div><span style="color:#6b7280;">Cảng bốc hàng (POL):</span><br><strong>${shipment.originPort || 'Shanghai Port, China'}</strong></div>
                <div><span style="color:#6b7280;">Cảng dỡ hàng (POD):</span><br><strong>${shipment.destinationPort || 'Cat Lai Port, Vietnam'}</strong></div>
                <div><span style="color:#6b7280;">Ngày tàu chạy (ETD):</span><br><strong>${shipment.etd ? new Date(shipment.etd).toLocaleDateString('vi-VN') : '---'}</strong></div>
                <div><span style="color:#6b7280;">Ngày đến dự kiến (ETA):</span><br><strong style="color:var(--amis-blue);">${shipment.eta ? new Date(shipment.eta).toLocaleDateString('vi-VN') : '---'}</strong></div>
                <div><span style="color:#6b7280;">Tàu / Chuyến (Vessel/Voy):</span><br><strong>${shipment.vesselName || 'WAN HAI 315 / V.024S'}</strong></div>
                <div><span style="color:#6b7280;">Hãng tàu:</span><br><strong>${shipment.carrier || 'WAN HAI LINES'}</strong></div>
              </div>
              <div style="margin-top:14px; padding-top:10px; border-top:1px solid #f1f5f9;">
                <span style="color:#6b7280; font-size:12px;">Ghi chú lô hàng:</span>
                <p style="font-size:13px; margin-top:4px;">${shipment.notes || 'Lô hàng sợi phục vụ hợp đồng dệt may quý 3/2026. Hàng yêu cầu hun trùng và đóng bao pallet tiêu chuẩn.'}</p>
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
                  <span style="color:#6b7280;">Tổng tiền hàng:</span>
                  <strong style="color:var(--amis-green); font-size:15px;">$${Number(totalVal).toLocaleString()} USD</strong>
                </div>
                <div style="display:flex; justify-content:space-between;">
                  <span style="color:#6b7280;">Số container:</span>
                  <strong>${shipment.containerCount || '1 x 40\'HQ'}</strong>
                </div>
                <div style="display:flex; justify-content:space-between;">
                  <span style="color:#6b7280;">Hạn nộp tờ khai:</span>
                  <strong>30 ngày từ ngày tàu đến</strong>
                </div>
                <div style="display:flex; justify-content:space-between;">
                  <span style="color:#6b7280;">Trạng thái thanh toán:</span>
                  <span class="status-chip chip-transit">Đã cọc 30%</span>
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
                    <th>Thông Số (Denier/Filament)</th>
                    <th style="text-align:right;">Số Lượng (kg)</th>
                    <th style="text-align:right;">Đơn Giá ($)</th>
                    <th style="text-align:right;">Thành Tiền ($)</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.length === 0 ? '<tr><td colspan="7" style="text-align:center; padding:30px; color:#6b7280;">Lô hàng chưa có chi tiết mặt hàng sợi</td></tr>' : 
                    items.map((it, idx) => `
                      <tr>
                        <td style="text-align:center;">${idx + 1}</td>
                        <td style="font-weight:700; color:var(--amis-blue);">${it.productCode || it.productSku || 'YARN-DTY-15048'}</td>
                        <td>${it.productName || 'Sợi Polyester DTY 150D/48F'}</td>
                        <td>${it.spec || '150D / 48F / Semi-Dull'}</td>
                        <td style="text-align:right; font-weight:600;">${Number(it.quantity || 0).toLocaleString()} kg</td>
                        <td style="text-align:right;">$${Number(it.unitPrice || 2.5).toFixed(2)}</td>
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
              <button class="btn btn-primary" id="btn-add-inv-for-shp">+ Tạo Invoice Cho Lô Này</button>
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
                    <th>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  ${invoices.length === 0 ? '<tr><td colspan="7" style="text-align:center; padding:30px; color:#6b7280;">Chưa liên kết Invoice nào với lô hàng này</td></tr>' :
                    invoices.map(inv => `
                      <tr>
                        <td style="font-weight:700; color:var(--amis-blue);">${inv.invoiceNumber}</td>
                        <td>${inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('vi-VN') : '---'}</td>
                        <td><span class="status-chip chip-transit">${inv.type || 'Commercial'}</span></td>
                        <td>${inv.paymentTerms || 'T/T 30 days'}</td>
                        <td style="text-align:right; font-weight:700; color:var(--amis-green);">$${Number(inv.totalAmount || 0).toLocaleString()}</td>
                        <td>${inv.currency || 'USD'}</td>
                        <td><button class="btn btn-secondary" onclick="window.appNavigateTo('invoices')" style="padding:2px 8px; font-size:11px;">Xem Invoice</button></td>
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
            <h3 style="font-size:14px; font-weight:700; color:var(--amis-blue); margin-bottom:12px;">Bảng Kê Đóng Gói (Packing List)</h3>
            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; margin-bottom:16px;">
              <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:12px; border-radius:4px;">
                <div style="font-size:11px; color:#6b7280;">TỔNG TRỌNG LƯỢNG TỊNH (NW)</div>
                <div style="font-size:16px; font-weight:700; color:var(--amis-blue); margin-top:4px;">20,500.00 KG</div>
              </div>
              <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:12px; border-radius:4px;">
                <div style="font-size:11px; color:#6b7280;">TỔNG TRỌNG LƯỢNG CẢ BÌ (GW)</div>
                <div style="font-size:16px; font-weight:700; color:#334155; margin-top:4px;">21,800.00 KG</div>
              </div>
              <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:12px; border-radius:4px;">
                <div style="font-size:11px; color:#6b7280;">SỐ LƯỢNG KIỆN (PACKAGES)</div>
                <div style="font-size:16px; font-weight:700; color:#334155; margin-top:4px;">680 Cartons</div>
              </div>
              <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:12px; border-radius:4px;">
                <div style="font-size:11px; color:#6b7280;">THỂ TÍCH (MEASUREMENT)</div>
                <div style="font-size:16px; font-weight:700; color:#334155; margin-top:4px;">65.40 CBM</div>
              </div>
            </div>
            <p style="font-size:12px; color:#6b7280;">Quy cách đóng gói: Sợi búp cuộn trên búp nón giấy, bọc màng co PE, đóng thùng carton tiêu chuẩn xuất khẩu, cố định trên pallet gỗ khử trùng.</p>
          </div>
        </div>

        <!-- TAB 5: BOOKING -->
        <div class="tab-pane" id="tab-booking" style="display:none;">
          <div class="card">
            <h3 style="font-size:14px; font-weight:700; color:var(--amis-blue); margin-bottom:12px;">Thông Tin Đặt Chỗ (Booking Confirmation)</h3>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; font-size:13px; line-height:2;">
              <div>
                <div><strong>Số Booking (Booking No):</strong> <span style="color:var(--amis-blue);">BKG-WHL-20260801</span></div>
                <div><strong>Hãng tàu phát hành:</strong> WAN HAI LINES (WHL)</div>
                <div><strong>Đại lý Forwarder:</strong> KERRY LOGISTICS VIETNAM</div>
                <div><strong>Closing Time (Giờ cắt máng):</strong> 17:00 03/08/2026</div>
              </div>
              <div>
                <div><strong>Hạn nộp Shipping Instruction (SI):</strong> 11:00 02/08/2026</div>
                <div><strong>Hạn nộp VGM:</strong> 17:00 03/08/2026</div>
                <div><strong>Free Demurrage tại Cát Lái:</strong> 07 Ngày</div>
                <div><strong>Free Detention:</strong> 07 Ngày</div>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 6: CONTAINER -->
        <div class="tab-pane" id="tab-container" style="display:none;">
          <div class="card">
            <h3 style="font-size:14px; font-weight:700; color:var(--amis-blue); margin-bottom:12px;">Danh Sách Container & Số Chì (Seal)</h3>
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Số Container</th>
                    <th>Số Niêm Chì (Seal No)</th>
                    <th>Loại Cont</th>
                    <th>Trọng Lượng Bì (Tare Weight)</th>
                    <th>Trọng Lượng Hàng (Payload)</th>
                    <th>Tình Trạng</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1</td>
                    <td style="font-weight:700; color:var(--amis-blue);">WHLU9843210</td>
                    <td style="font-weight:700;">WHL-SL-49210</td>
                    <td>40' High Cube (40HQ)</td>
                    <td>3,980 kg</td>
                    <td>21,800 kg</td>
                    <td><span class="status-chip chip-transit">Đã hạ bãi cảng</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- TAB 7: HẢI QUAN -->
        <div class="tab-pane" id="tab-customs" style="display:none;">
          <div class="card">
            <h3 style="font-size:14px; font-weight:700; color:var(--amis-blue); margin-bottom:12px;">Hồ Sơ Tờ Khai Hải Quan</h3>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; font-size:13px; line-height:2; margin-bottom:16px;">
              <div>
                <div><strong>Số Tờ Khai:</strong> <span style="font-weight:700; color:var(--amis-blue);">105492817290</span></div>
                <div><strong>Mã Loại Hình:</strong> E21 (Nhập nguyên liệu gia công / sản xuất XK)</div>
                <div><strong>Chi Cục Hải Quan:</strong> 02CI - Chi cục HQ CK Cảng Sài Gòn KV1</div>
                <div><strong>Phân Luồng Tờ Khai:</strong> <span class="status-chip chip-delivered" style="background:#dcfce7; color:#15803d; font-weight:700;">LUỒNG XANH (Thông quan ngay)</span></div>
              </div>
              <div>
                <div><strong>Ngày Đăng Ký Tờ Khai:</strong> 08/08/2026</div>
                <div><strong>Ngày Thông Quan:</strong> 08/08/2026</div>
                <div><strong>Thuế Nhập Khẩu:</strong> 0% (Áp dụng C/O Form E hợp lệ)</div>
                <div><strong>Thuế VAT Hàng Nhập:</strong> Miễn thuế loại hình E21</div>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 8: CHI PHÍ -->
        <div class="tab-pane" id="tab-costs" style="display:none;">
          <div class="card">
            <h3 style="font-size:14px; font-weight:700; color:var(--amis-blue); margin-bottom:12px;">Bảng Kê Chi Phí Lô Hàng & Phân Bổ Giá Vốn (Landed Cost)</h3>
            <div class="table-container" style="margin-bottom:14px;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Khoản Mục Chi Phí</th>
                    <th>Đơn Vị Thu</th>
                    <th style="text-align:right;">Số Tiền (VND)</th>
                    <th style="text-align:right;">Tương Đương (USD)</th>
                    <th>Phương Thức Phân Bổ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Tiền hàng theo Invoice (FOB/CIF)</td>
                    <td>LONG CHENG WU TEXTILE</td>
                    <td style="text-align:right;">1,280,000,000</td>
                    <td style="text-align:right; font-weight:700;">$51,200.00</td>
                    <td>Giá trị thực</td>
                  </tr>
                  <tr>
                    <td>Cước vận tải biển (Ocean Freight)</td>
                    <td>WAN HAI LINES</td>
                    <td style="text-align:right;">18,500,000</td>
                    <td style="text-align:right;">$740.00</td>
                    <td>Trọng lượng (kg)</td>
                  </tr>
                  <tr>
                    <td>Phí D/O & Vệ sinh Container</td>
                    <td>Cảng Cát Lái</td>
                    <td style="text-align:right;">3,200,000</td>
                    <td style="text-align:right;">$128.00</td>
                    <td>Số container</td>
                  </tr>
                  <tr>
                    <td>Cước xe kéo cont về kho nhà máy (Trucking)</td>
                    <td>Vận tải Hoàng Long</td>
                    <td style="text-align:right;">4,500,000</td>
                    <td style="text-align:right;">$180.00</td>
                    <td>Số container</td>
                  </tr>
                  <tr style="background:#f8fafc; font-weight:700;">
                    <td colspan="2">TỔNG CHI PHÍ LÔ HÀNG (LANDED COST)</td>
                    <td style="text-align:right; color:var(--amis-green);">1,306,200,000 VND</td>
                    <td style="text-align:right; color:var(--amis-green);">$52,248.00 USD</td>
                    <td><strong>Đơn giá vốn: ~2.55 $/kg</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- TAB 9: CHỨNG TỪ -->
        <div class="tab-pane" id="tab-docs" style="display:none;">
          <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <h3 style="font-size:14px; font-weight:700; color:var(--amis-blue);">Hồ Sơ Chứng Từ Đính Kèm Của Lô Hàng</h3>
              <button class="btn btn-primary" onclick="window.appNavigateTo('documents')">+ Upload Tệp</button>
            </div>
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Tên Tệp</th>
                    <th>Phân Loại</th>
                    <th>Dung Lượng</th>
                    <th>Ngày Đăng</th>
                    <th>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  ${documents.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding:30px; color:#6b7280;">Chưa có chứng từ đính kèm cho lô này</td></tr>' :
                    documents.map(d => `
                      <tr>
                        <td style="font-weight:600; color:var(--amis-blue);">${d.originalFileName || d.fileName}</td>
                        <td><span class="status-chip chip-transit">${d.category || 'Other'}</span></td>
                        <td>${d.fileSize ? (d.fileSize / 1024).toFixed(1) + ' KB' : '---'}</td>
                        <td>${d.createdAt ? new Date(d.createdAt).toLocaleDateString('vi-VN') : '---'}</td>
                        <td>
                          <a href="/api/documents/${d.id}/download" target="_blank" class="btn btn-secondary" style="padding:2px 8px; font-size:11px;">Tải về</a>
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
            <div style="border-left:2px solid var(--amis-blue); margin-left:12px; padding-left:16px; font-size:13px; line-height:2;">
              <div style="position:relative; margin-bottom:16px;">
                <div style="position:absolute; left:-23px; top:4px; width:12px; height:12px; border-radius:50%; background:var(--amis-green);"></div>
                <div><strong>Thông quan hải quan thành công</strong> - 08/08/2026 10:30 (Người thực hiện: admin)</div>
                <div style="font-size:11px; color:#6b7280;">Tờ khai 105492817290 phân luồng xanh, hoàn tất thủ tục mở tờ khai điện tử.</div>
              </div>
              <div style="position:relative; margin-bottom:16px;">
                <div style="position:absolute; left:-23px; top:4px; width:12px; height:12px; border-radius:50%; background:var(--amis-blue);"></div>
                <div><strong>Tàu cập cảng Cát Lái (POD Arrival)</strong> - 06/08/2026 08:15</div>
                <div style="font-size:11px; color:#6b7280;">Tàu WAN HAI 315 cập cầu cảng B5 Tân Cảng Cát Lái, dỡ container lên bãi.</div>
              </div>
              <div style="position:relative; margin-bottom:16px;">
                <div style="position:absolute; left:-23px; top:4px; width:12px; height:12px; border-radius:50%; background:#94a3b8;"></div>
                <div><strong>Phát hành vận đơn đường biển B/L</strong> - 01/08/2026 14:00</div>
                <div style="font-size:11px; color:#6b7280;">Nhận bản scan Bill of Lading WHLU260801 và Packing List từ đối tác Long Cheng Wu.</div>
              </div>
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

  } catch (err) {
    container.innerHTML = `<div class="card" style="padding:20px; color:red;">Lỗi tải chi tiết: ${err.message}</div>`;
  }
}
