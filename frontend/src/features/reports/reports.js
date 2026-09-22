// frontend/src/features/reports/reports.js
import { api, toast, openModal, closeModal } from '../../core/api.js';

export function renderReports(container, subTab = 'import') {
  container.innerHTML = `
    <div class="card">
      <div class="toolbar" style="margin-bottom:14px;">
        <div class="toolbar-left">
          <button class="btn btn-primary" id="btn-export-excel-report">
            <span>📥</span> <span>Xuất Báo Cáo Excel (.xlsx)</span>
          </button>
          <button class="btn btn-secondary" id="btn-export-pdf-report">
            <span>📄</span> <span>In / Xuất PDF</span>
          </button>
        </div>
        <div class="toolbar-right">
          <label style="font-size:12px; font-weight:600;">Kỳ báo cáo:</label>
          <select class="form-control" style="width:140px;">
            <option>Năm 2026</option>
            <option>Quý 3/2026</option>
            <option>Tháng 08/2026</option>
          </select>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Mã Loại Sợi</th>
              <th>Tên Quy Cách Sợi</th>
              <th style="text-align:right;">Sản Lượng Nhập (kg)</th>
              <th style="text-align:right;">Kim Ngạch Nhập (USD)</th>
              <th style="text-align:right;">Đơn Giá TB ($/kg)</th>
              <th style="text-align:right;">Thuế Nhập Khẩu Đã Nộp</th>
              <th>Thị Trường Chính</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-weight:700; color:var(--amis-blue);">YARN-FDY-10036</td>
              <td>Sợi Polyester FDY 100D/36F Semi Dull</td>
              <td style="text-align:right; font-weight:600;">45,000 kg</td>
              <td style="text-align:right; font-weight:700; color:var(--amis-green);">$112,500.00</td>
              <td style="text-align:right;">$2.50</td>
              <td style="text-align:right;">0 ₫ (Form E)</td>
              <td>Trung Quốc (Long Cheng Wu)</td>
            </tr>
            <tr>
              <td style="font-weight:700; color:var(--amis-blue);">YARN-DTY-15048</td>
              <td>Sợi Polyester DTY 150D/48F Bright</td>
              <td style="text-align:right; font-weight:600;">68,000 kg</td>
              <td style="text-align:right; font-weight:700; color:var(--amis-green);">$176,800.00</td>
              <td style="text-align:right;">$2.60</td>
              <td style="text-align:right;">0 ₫ (Form E)</td>
              <td>Trung Quốc / Đài Loan</td>
            </tr>
            <tr>
              <td style="font-weight:700; color:var(--amis-blue);">YARN-POY-25072</td>
              <td>Sợi Polyester POY 250D/72F</td>
              <td style="text-align:right; font-weight:600;">32,000 kg</td>
              <td style="text-align:right; font-weight:700; color:var(--amis-green);">$73,600.00</td>
              <td style="text-align:right;">$2.30</td>
              <td style="text-align:right;">0 ₫</td>
              <td>Formosa Đài Loan</td>
            </tr>
            <tr style="background:#f8fafc; font-weight:700;">
              <td colspan="2">TỔNG CỘNG TOÀN KỲ BÁO CÁO</td>
              <td style="text-align:right; color:var(--amis-blue);">145,000 kg</td>
              <td style="text-align:right; color:var(--amis-green);">$362,900.00 USD</td>
              <td style="text-align:right;">$2.50 / kg</td>
              <td style="text-align:right;">0 ₫</td>
              <td>-</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('btn-export-excel-report').addEventListener('click', () => {
    toast('Đang khởi tạo file Excel báo cáo tổng hợp XNK Sợi...', 'success');
  });
  document.getElementById('btn-export-pdf-report').addEventListener('click', () => {
    window.print();
  });
}
