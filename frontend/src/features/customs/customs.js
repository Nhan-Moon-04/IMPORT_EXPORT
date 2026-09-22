// frontend/src/features/customs/customs.js
import { api, toast, openModal, closeModal } from '../../core/api.js';

export function renderCustoms(container, subTab = 'declarations') {
  container.innerHTML = `
    <div class="card">
      <div class="toolbar" style="margin-bottom:14px;">
        <div class="toolbar-left">
          <button class="btn btn-primary" id="btn-add-declaration">
            <span>+</span> <span>Mở Tờ Khai Hải Quan Mới</span>
          </button>
          <button class="btn btn-secondary" id="btn-sync-vnaccs">
            <span>🔄</span> <span>Đồng Bộ Hệ Thống VNACCS</span>
          </button>
        </div>
        <div class="toolbar-right">
          <select id="customs-filter-type" class="form-control" style="width:160px;">
            <option value="">Tất cả loại hình</option>
            <option value="E21">E21 - Nhập NVL gia công</option>
            <option value="A11">A11 - Nhập KD tiêu dùng</option>
            <option value="A12">A12 - Nhập KD SX</option>
            <option value="B11">B11 - Xuất kinh doanh</option>
          </select>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Số Tờ Khai</th>
              <th>Loại Hình</th>
              <th>Chi Cục Hải Quan</th>
              <th>Phân Luồng</th>
              <th>Ngày Đăng Ký</th>
              <th>Ngày Thông Quan</th>
              <th>Số Tiền Thuế (VND)</th>
              <th>Trạng Thái Nộp Thuế</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-weight:700; color:var(--amis-blue);">105492817290</td>
              <td><span class="status-chip chip-transit">E21</span></td>
              <td>02CI - Chi cục HQ CK Cảng Sài Gòn KV1</td>
              <td><span class="status-chip chip-delivered" style="background:#dcfce7; color:#15803d; font-weight:700;">🟢 Luồng Xanh</span></td>
              <td>08/08/2026</td>
              <td>08/08/2026</td>
              <td style="text-align:right; font-weight:600;">0 VND (Miễn E21)</td>
              <td><span class="status-chip chip-delivered">Đã hoàn tất</span></td>
              <td><button class="btn btn-secondary" style="padding:2px 8px; font-size:11px;">In Tờ Khai</button></td>
            </tr>
            <tr>
              <td style="font-weight:700; color:var(--amis-blue);">105492819842</td>
              <td><span class="status-chip chip-transit">A12</span></td>
              <td>02IK - Chi cục Hải quan Quản lý Hàng Đầu tư - Gia công</td>
              <td><span class="status-chip chip-customs" style="background:#fef3c7; color:#b45309; font-weight:700;">🟡 Luồng Vàng</span></td>
              <td>12/08/2026</td>
              <td>13/08/2026</td>
              <td style="text-align:right; font-weight:600;">45,800,000 VND</td>
              <td><span class="status-chip chip-delivered">Đã nộp thuế</span></td>
              <td><button class="btn btn-secondary" style="padding:2px 8px; font-size:11px;">In Tờ Khai</button></td>
            </tr>
            <tr>
              <td style="font-weight:700; color:var(--amis-blue);">105493012495</td>
              <td><span class="status-chip chip-transit">E21</span></td>
              <td>02CI - Chi cục HQ CK Cảng Sài Gòn KV1</td>
              <td><span class="status-chip chip-cancelled" style="background:#fee2e2; color:#b91c1c; font-weight:700;">🔴 Luồng Đỏ (Kiểm hóa)</span></td>
              <td>18/08/2026</td>
              <td>Chờ kiểm hóa</td>
              <td style="text-align:right; font-weight:600;">0 VND</td>
              <td><span class="status-chip chip-draft">Chưa phát sinh</span></td>
              <td><button class="btn btn-secondary" style="padding:2px 8px; font-size:11px;">Chi Tiết</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('btn-add-declaration').addEventListener('click', () => {
    toast('Tính năng liên kết phần mềm Hải Quan điện tử VNACCS sẵn sàng', 'info');
  });
  document.getElementById('btn-sync-vnaccs').addEventListener('click', () => {
    toast('Đã kết nối Token Chữ ký số và đồng bộ trạng thái tờ khai thành công!', 'success');
  });
}
