// frontend/src/features/shipping/shipping.js
import { api, toast, openModal, closeModal } from '../../core/api.js';

export function renderShipping(container, subTab = 'booking') {
  container.innerHTML = `
    <div class="card">
      <div class="toolbar" style="margin-bottom:14px;">
        <div class="toolbar-left">
          <button class="btn btn-primary" id="btn-create-booking">+ Tạo Mới Booking Tàu</button>
          <button class="btn btn-secondary" id="btn-track-vessel">📡 Cập Nhật Vị Trí Tàu (AIS Live)</button>
        </div>
        <div class="toolbar-right">
          <input type="text" class="form-control" placeholder="Tìm số cont, số booking..." style="width:220px;">
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Số Booking</th>
              <th>Hãng Tàu</th>
              <th>Tên Tàu / Chuyến</th>
              <th>Số Container / Loại</th>
              <th>Cảng Đi ➔ Cảng Đến</th>
              <th>ETD (Khởi hành)</th>
              <th>ETA (Cập cảng)</th>
              <th>Trạng Thái</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-weight:700; color:var(--amis-blue);">BKG-WHL-20260801</td>
              <td>WAN HAI LINES</td>
              <td>WAN HAI 315 / V.024S</td>
              <td><strong>WHLU9843210</strong> (40'HQ)</td>
              <td>Shanghai ➔ Cat Lai</td>
              <td>03/08/2026</td>
              <td><strong style="color:var(--amis-blue);">06/08/2026</strong></td>
              <td><span class="status-chip chip-delivered">Đã cập cảng</span></td>
              <td><button class="btn btn-secondary" style="padding:2px 8px; font-size:11px;">Chi Tiết</button></td>
            </tr>
            <tr>
              <td style="font-weight:700; color:var(--amis-blue);">BKG-EMC-20260815</td>
              <td>EVERGREEN</td>
              <td>EVER GIVEN / V.088W</td>
              <td><strong>EMCU7712390</strong> (40'HQ)</td>
              <td>Kaohsiung ➔ Cat Lai</td>
              <td>16/08/2026</td>
              <td><strong style="color:#d97706;">22/08/2026</strong></td>
              <td><span class="status-chip chip-transit">Đang trên biển</span></td>
              <td><button class="btn btn-secondary" style="padding:2px 8px; font-size:11px;">Theo Dõi</button></td>
            </tr>
            <tr>
              <td style="font-weight:700; color:var(--amis-blue);">BKG-MSC-20260829</td>
              <td>MSC</td>
              <td>MSC ALEXANDRA / V.102</td>
              <td><strong>MSCU4492100</strong> (40'HQ)</td>
              <td>Ningbo ➔ Hai Phong</td>
              <td>25/08/2026</td>
              <td><strong style="color:#0266b3;">30/08/2026</strong></td>
              <td><span class="status-chip chip-draft">Đang xếp hàng</span></td>
              <td><button class="btn btn-secondary" style="padding:2px 8px; font-size:11px;">Chi Tiết</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('btn-create-booking').addEventListener('click', () => {
    toast('Mở phiếu tạo Booking vận tải biển', 'info');
  });
  document.getElementById('btn-track-vessel').addEventListener('click', () => {
    toast('Đã cập nhật tọa độ hải trình tàu qua vệ tinh AIS', 'success');
  });
}
