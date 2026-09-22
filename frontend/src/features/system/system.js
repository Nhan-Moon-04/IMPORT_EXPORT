// frontend/src/features/system/system.js
import { api, toast, openModal, closeModal } from '../../core/api.js';

export function renderSystem(container, subTab = 'users') {
  container.innerHTML = `
    <div class="card">
      <div class="toolbar" style="margin-bottom:14px;">
        <div class="toolbar-left">
          <button class="btn btn-primary" id="btn-add-user">+ Thêm Người Dùng Mới</button>
          <button class="btn btn-secondary" id="btn-trigger-backup">💾 Sao Lưu Cơ Sở Dữ Liệu Ngay (pg_dump)</button>
        </div>
        <div class="toolbar-right">
          <input type="text" class="form-control" placeholder="Tìm tài khoản, vai trò..." style="width:200px;">
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Tên Đăng Nhập</th>
              <th>Họ Và Tên</th>
              <th>Email</th>
              <th>Vai Trò (Role)</th>
              <th>Trạng Thái</th>
              <th>Lần Đăng Nhập Cuối</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-weight:700; color:var(--amis-blue);">admin</td>
              <td style="font-weight:600;">Quản Trị Viên Hệ Thống</td>
              <td>admin@xnk-logistics.vn</td>
              <td><span class="status-chip chip-delivered">Administrator (Toàn quyền)</span></td>
              <td><span class="status-chip chip-delivered">Đang hoạt động</span></td>
              <td>Hôm nay 18:40</td>
              <td><button class="btn btn-secondary" style="padding:2px 8px; font-size:11px;">Phân Quyền</button></td>
            </tr>
            <tr>
              <td style="font-weight:700; color:var(--amis-blue);">purchasing</td>
              <td style="font-weight:600;">Nguyễn Văn Mua Hàng</td>
              <td>purchasing@xnk-logistics.vn</td>
              <td><span class="status-chip chip-transit">Nhân viên Mua Hàng (PO)</span></td>
              <td><span class="status-chip chip-delivered">Đang hoạt động</span></td>
              <td>Hôm qua 16:20</td>
              <td><button class="btn btn-secondary" style="padding:2px 8px; font-size:11px;">Phân Quyền</button></td>
            </tr>
            <tr>
              <td style="font-weight:700; color:var(--amis-blue);">customs_staff</td>
              <td style="font-weight:600;">Trần Hải Quan</td>
              <td>customs@xnk-logistics.vn</td>
              <td><span class="status-chip chip-transit">Nhân viên Khai Báo Hải Quan</span></td>
              <td><span class="status-chip chip-delivered">Đang hoạt động</span></td>
              <td>20/08/2026</td>
              <td><button class="btn btn-secondary" style="padding:2px 8px; font-size:11px;">Phân Quyền</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('btn-add-user').addEventListener('click', () => {
    toast('Mở phiếu tạo người dùng & phân quyền truy cập', 'info');
  });
  document.getElementById('btn-trigger-backup').addEventListener('click', () => {
    toast('Đang sao lưu cơ sở dữ liệu PostgreSQL (pg_dump) an toàn...', 'success');
  });
}
