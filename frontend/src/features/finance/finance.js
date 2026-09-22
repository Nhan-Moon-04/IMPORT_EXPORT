// frontend/src/features/finance/finance.js
import { api, toast, openModal, closeModal } from '../../core/api.js';

export function renderFinance(container, subTab = 'costs') {
  container.innerHTML = `
    <div class="card">
      <div class="toolbar" style="margin-bottom:14px;">
        <div class="toolbar-left">
          <button class="btn btn-primary" id="btn-add-expense">+ Ghi Nhận Chi Phí Mới</button>
          <button class="btn btn-secondary" id="btn-calculate-landed">📊 Phân Bổ Giá Vốn Sợi (Landed Cost)</button>
        </div>
        <div class="toolbar-right">
          <select class="form-control" style="width:180px;">
            <option value="">Tất cả các mốc thanh toán</option>
            <option value="deposit">Đặt cọc (Deposit 30%)</option>
            <option value="bl">Thanh toán B/L copy (70%)</option>
            <option value="customs">Nộp thuế hải quan</option>
          </select>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:14px; margin-bottom:16px;">
        <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:14px; border-radius:6px;">
          <div style="font-size:12px; color:#6b7280;">TỔNG TIỀN HÀNG NGOẠI TỆ (USD)</div>
          <div style="font-size:20px; font-weight:700; color:var(--amis-blue); margin-top:4px;">$284,500.00</div>
          <div style="font-size:11px; color:#16a34a; margin-top:4px;">Tỷ giá quy đổi VCB: 25,450 VND/USD</div>
        </div>
        <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:14px; border-radius:6px;">
          <div style="font-size:12px; color:#6b7280;">CHI PHÍ LOGISTICS & NỘI ĐỊA (VND)</div>
          <div style="font-size:20px; font-weight:700; color:#d97706; margin-top:4px;">185,400,000 ₫</div>
          <div style="font-size:11px; color:#6b7280; margin-top:4px;">Cước tàu, nâng hạ, kiểm dịch, kéo cont</div>
        </div>
        <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:14px; border-radius:6px;">
          <div style="font-size:12px; color:#6b7280;">GIÁ VỐN BÌNH QUÂN / KG SỢI</div>
          <div style="font-size:20px; font-weight:700; color:var(--amis-green); margin-top:4px;">64,850 ₫ / KG</div>
          <div style="font-size:11px; color:#16a34a; margin-top:4px;">(Tương đương $2.55 / KG nhập kho)</div>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Mã Lô Hàng</th>
              <th>Mục Chi Phí</th>
              <th>Đơn Vị Thu Hưởng</th>
              <th style="text-align:right;">Số Tiền Nguyên Tệ</th>
              <th style="text-align:right;">Thành Tiền (VND)</th>
              <th>Phương Thức Phân Bổ</th>
              <th>Trạng Thái Thanh Toán</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-weight:700; color:var(--amis-blue);">SHP-20260806-LCW</td>
              <td>Tiền mua sợi theo hợp đồng</td>
              <td>LONG CHENG WU TEXTILE CO., LTD</td>
              <td style="text-align:right; font-weight:600;">$51,200.00 USD</td>
              <td style="text-align:right;">1,303,040,000 ₫</td>
              <td>Theo giá trị hàng</td>
              <td><span class="status-chip chip-delivered">Đã chuyển T/T</span></td>
            </tr>
            <tr>
              <td style="font-weight:700; color:var(--amis-blue);">SHP-20260806-LCW</td>
              <td>Cước vận chuyển biển Quốc tế</td>
              <td>WAN HAI LINES</td>
              <td style="text-align:right; font-weight:600;">$750.00 USD</td>
              <td style="text-align:right;">19,087,500 ₫</td>
              <td>Theo trọng lượng (kg)</td>
              <td><span class="status-chip chip-delivered">Đã thanh toán</span></td>
            </tr>
            <tr>
              <td style="font-weight:700; color:var(--amis-blue);">SHP-20260806-LCW</td>
              <td>Local charges cảng Cát Lái</td>
              <td>Cảng Sài Gòn Cát Lái</td>
              <td style="text-align:right; font-weight:600;">3,450,000 VND</td>
              <td style="text-align:right;">3,450,000 ₫</td>
              <td>Số container</td>
              <td><span class="status-chip chip-delivered">Đã thanh toán</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('btn-add-expense').addEventListener('click', () => {
    toast('Mở phiếu nhập chi phí phát sinh lô hàng', 'info');
  });
  document.getElementById('btn-calculate-landed').addEventListener('click', () => {
    toast('Phân bổ giá vốn tự động vào từng kg sợi hoàn tất!', 'success');
  });
}
