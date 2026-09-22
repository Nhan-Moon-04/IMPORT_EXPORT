/**
 * Dashboard Feature Module
 */
import { api } from "../../core/api.js";

export async function renderDashboard(container) {
  container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted)">Đang nạp dữ liệu bảng điều khiển...</div>`;
  
  try {
    const res = await api.get("/api/dashboard");
    const d = res.data;

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px; height: 100%; overflow-y: auto;">
        <!-- KPI CARDS -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;">
          <div style="background: var(--bg-surface); padding: 16px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); border-left: 4px solid var(--misa-blue); box-shadow: var(--shadow-sm);">
            <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Kim Ngạch Nhập Khẩu</div>
            <div style="font-size: 22px; font-weight: 800; color: var(--misa-blue); margin-top: 4px;">$${Number(d.totalImportValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">${d.totalImportShipments} lô hàng nhập khẩu</div>
          </div>

          <div style="background: var(--bg-surface); padding: 16px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); border-left: 4px solid var(--misa-green); box-shadow: var(--shadow-sm);">
            <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Kim Ngạch Xuất Khẩu</div>
            <div style="font-size: 22px; font-weight: 800; color: var(--misa-green); margin-top: 4px;">$${Number(d.totalExportValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">${d.totalExportShipments} lô hàng xuất khẩu</div>
          </div>

          <div style="background: var(--bg-surface); padding: 16px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); border-left: 4px solid var(--misa-orange); box-shadow: var(--shadow-sm);">
            <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Lô Hàng Đang Xử Lý</div>
            <div style="font-size: 22px; font-weight: 800; color: var(--misa-orange); margin-top: 4px;">${d.pendingShipments}</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Đang vận chuyển / thông quan</div>
          </div>

          <div style="background: var(--bg-surface); padding: 16px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); border-left: 4px solid #8b5cf6; box-shadow: var(--shadow-sm);">
            <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Mặt Hàng Quản Lý</div>
            <div style="font-size: 22px; font-weight: 800; color: #8b5cf6; margin-top: 4px;">${d.totalProducts}</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">${d.totalSuppliers} nhà cung ứng</div>
          </div>
        </div>

        <!-- CHARTS & ALERTS -->
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 14px;">
          <div style="background: var(--bg-surface); padding: 16px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); box-shadow: var(--shadow-sm);">
            <div style="font-size: 14px; font-weight: 700; margin-bottom: 12px;">📊 Biến Động Giá Trị Nhập/Xuất Theo Tháng (${new Date().getFullYear()})</div>
            <canvas id="dashCanvas" height="200"></canvas>
          </div>

          <div style="background: var(--bg-surface); padding: 16px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 10px;">
            <div style="font-size: 14px; font-weight: 700;">⚠️ Cảnh Báo Nghiệp Vụ & ETD/ETA</div>
            
            <div style="padding: 10px; background: #f0f9ff; border-left: 3px solid var(--misa-blue); border-radius: 2px;">
              <strong style="color: var(--misa-blue);">Tàu SHP-20260806-LCW</strong>
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Tàu WAN HAI 273 cập cảng Cát Lái trong 5 ngày tới. Đã nộp B/L & Invoice.</div>
            </div>

            <div style="padding: 10px; background: #f0fdf4; border-left: 3px solid var(--misa-green); border-radius: 2px;">
              <strong style="color: var(--misa-green);">Thông quan SHP-20260518-FMT</strong>
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Đã nộp thuế hoàn tất. Sẵn sàng kéo hàng về kho công ty.</div>
            </div>

            <div style="padding: 10px; background: #fffbeb; border-left: 3px solid var(--misa-orange); border-radius: 2px;">
              <strong style="color: var(--misa-orange);">Tờ khai xuất khẩu SHP-20260901-VTX</strong>
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Chờ hoàn thành đóng hàng vào container và lấy số chì seal.</div>
            </div>
          </div>
        </div>

        <!-- RECENT SHIPMENTS TABLE -->
        <div class="grid-card">
          <div style="padding: 10px 14px; border-bottom: 1px solid var(--border-light); font-weight: 700; font-size: 13px;">
            🚢 Các Lô Hàng XNK Gần Đây
          </div>
          <div class="grid-scroll">
            <table class="misa-table">
              <thead>
                <tr>
                  <th>Mã Lô Hàng</th>
                  <th>Loại Hình</th>
                  <th>Đối Tác</th>
                  <th>Trạng Thái</th>
                  <th>Tổng Giá Trị</th>
                  <th>Ngày Tạo</th>
                </tr>
              </thead>
              <tbody>
                ${d.recentShipments.map(s => `
                  <tr>
                    <td><strong>${s.shipmentCode}</strong></td>
                    <td>${s.type === 'Import' ? '<span class="chip chip-info">📥 Nhập khẩu</span>' : '<span class="chip chip-success">📤 Xuất khẩu</span>'}</td>
                    <td>${s.partnerName || '-'}</td>
                    <td><span class="chip chip-warning">${s.status}</span></td>
                    <td><strong>$${Number(s.totalValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></td>
                    <td>${new Date(s.createdAt).toLocaleDateString('vi-VN')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    drawChart("dashCanvas", d.monthlyImportValues, d.monthlyExportValues);
  } catch (err) {
    // Handled
  }
}

function drawChart(id, impVals, expVals) {
  const cvs = document.getElementById(id);
  if (!cvs) return;
  const ctx = cvs.getContext("2d");
  const w = cvs.width = cvs.parentElement.clientWidth - 32;
  const h = cvs.height = 200;
  ctx.clearRect(0, 0, w, h);

  const months = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];
  const max = 100000;
  const padL = 50;
  const padB = 25;
  const cW = w - padL - 10;
  const cH = h - padB - 10;

  // Grid
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 1;
  ctx.font = "11px Inter";
  ctx.fillStyle = "#94a3b8";

  for (let i = 0; i <= 4; i++) {
    const y = 10 + (cH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(w - 10, y);
    ctx.stroke();
    ctx.fillText(`${(4 - i) * 25}k`, 10, y + 4);
  }

  // Bars
  const bW = Math.max(10, (cW / 12) * 0.35);
  for (let m = 1; m <= 12; m++) {
    const x = padL + (m - 1) * (cW / 12) + (cW / 24);
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "center";
    ctx.fillText(months[m - 1], x, h - 6);

    const imp = impVals.find(v => v.month === m);
    if (imp && imp.value > 0) {
      const bH = (imp.value / max) * cH;
      ctx.fillStyle = "#0266b3";
      ctx.fillRect(x - bW, h - padB - bH, bW, bH);
    }

    const exp = expVals.find(v => v.month === m);
    if (exp && exp.value > 0) {
      const bH = (exp.value / max) * cH;
      ctx.fillStyle = "#008848";
      ctx.fillRect(x + 2, h - padB - bH, bW, bH);
    }
  }
}
