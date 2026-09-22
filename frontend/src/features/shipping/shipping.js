// frontend/src/features/shipping/shipping.js
import { api, toast, openModal, closeModal } from '../../core/api.js';

export function renderShipping(container, subTab = 'booking') {
  let title = "Tất Cả Booking";
  let btnPrimaryText = "Tạo Mới Booking Tàu";
  let showContainerFocus = false;

  let btnPrimaryIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;

  if (subTab === 'containers') {
    title = "Quản Lý Container";
    btnPrimaryText = "Khai Báo Container";
    btnPrimaryIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`;
    showContainerFocus = true;
  }
  if (subTab === 'tracking') {
    title = "Theo Dõi Hành Trình";
  }

  container.innerHTML = `
    <div class="grid-card">
      <div class="misa-toolbar">
        <div class="toolbar-group">
          <button class="btn btn-primary" id="btn-create-booking">
            ${btnPrimaryIcon}
            ${btnPrimaryText}
          </button>
          <button class="btn btn-default" id="btn-track-vessel">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a9 9 0 0 0-9 9c0 5.25 9 13 9 13s9-7.75 9-13a9 9 0 0 0-9-9z"></path><circle cx="12" cy="11" r="3"></circle></svg>
            Cập Nhật Vị Trí Tàu (AIS Live)
          </button>
        </div>
        <div class="toolbar-group">
          <input type="text" class="form-input" placeholder="Tìm số cont, số booking..." style="width:220px;">
        </div>
      </div>

      <div class="grid-scroll">
        <table class="misa-table">
          <thead>
            <tr>
              <th style="width: 40px; text-align:center;"><input type="checkbox"></th>
              ${showContainerFocus ? '<th>Số Container / Loại</th>' : ''}
              <th>Số Booking</th>
              <th>Hãng Tàu</th>
              <th>Tên Tàu / Chuyến</th>
              ${!showContainerFocus ? '<th>Số Container / Loại</th>' : ''}
              <th>Cảng Đi ➔ Cảng Đến</th>
              <th>ETD (Khởi hành)</th>
              <th>ETA (Cập cảng)</th>
              <th>Trạng Thái</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align:center;"><input type="checkbox"></td>
              ${showContainerFocus ? '<td style="font-size: 14px;"><strong>WHLU9843210</strong> (40\'HQ)</td>' : ''}
              <td style="font-weight:700; color:var(--amis-blue);">BKG-WHL-20260801</td>
              <td>WAN HAI LINES</td>
              <td>WAN HAI 315 / V.024S</td>
              ${!showContainerFocus ? '<td><strong>WHLU9843210</strong> (40\'HQ)</td>' : ''}
              <td>Shanghai ➔ Cat Lai</td>
              <td>03/08/2026</td>
              <td><strong style="color:var(--amis-blue);">06/08/2026</strong></td>
              <td><span class="status-chip chip-delivered">Đã cập cảng</span></td>
              <td>
                <button class="btn btn-default btn-sm"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> Chi Tiết</button>
              </td>
            </tr>
            <tr>
              <td style="text-align:center;"><input type="checkbox"></td>
              ${showContainerFocus ? '<td style="font-size: 14px;"><strong>EMCU7712390</strong> (40\'HQ)</td>' : ''}
              <td style="font-weight:700; color:var(--amis-blue);">BKG-EMC-20260815</td>
              <td>EVERGREEN</td>
              <td>EVER GIVEN / V.088W</td>
              ${!showContainerFocus ? '<td><strong>EMCU7712390</strong> (40\'HQ)</td>' : ''}
              <td>Kaohsiung ➔ Cat Lai</td>
              <td>16/08/2026</td>
              <td><strong style="color:#d97706;">22/08/2026</strong></td>
              <td><span class="status-chip chip-transit">Đang trên biển</span></td>
              <td>
                <button class="btn btn-default btn-sm"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> Theo Dõi</button>
              </td>
            </tr>
            <tr>
              <td style="text-align:center;"><input type="checkbox"></td>
              ${showContainerFocus ? '<td style="font-size: 14px;"><strong>MSCU4492100</strong> (40\'HQ)</td>' : ''}
              <td style="font-weight:700; color:var(--amis-blue);">BKG-MSC-20260829</td>
              <td>MSC</td>
              <td>MSC ALEXANDRA / V.102</td>
              ${!showContainerFocus ? '<td><strong>MSCU4492100</strong> (40\'HQ)</td>' : ''}
              <td>Ningbo ➔ Hai Phong</td>
              <td>25/08/2026</td>
              <td><strong style="color:#0266b3;">30/08/2026</strong></td>
              <td><span class="status-chip chip-draft">Đang xếp hàng</span></td>
              <td>
                <button class="btn btn-default btn-sm"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> Chi Tiết</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="misa-pagination">
        <div>Tổng số: 3 bản ghi</div>
        <div class="pagination-controls"><span>Hiển thị 50 dòng/trang</span></div>
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
