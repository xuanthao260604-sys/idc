import { readFileSync, accessSync, constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const major = Number(process.versions.node.split('.')[0]);
const issues = [];
if (major !== 24) issues.push(`Cần Node.js 24.x; máy đang chạy ${process.version}.`);
for (const path of ['package.json', 'package-lock.json', 'data/generated/pilot.json', 'data/generated/classic-10.json', 'data/generated/classic-10b.json', 'data/generated/classic-10c.json', 'data/reviews/pilot.spell-effects.json',
  'data/reviews/pilot.flip-effects.json', 'data/reviews/pilot.trap-effects.json', 'apps/beta/public/index.html', 'apps/beta/public/app.js', 'apps/beta/public/style.css']) {
  try { accessSync(join(root, path), constants.R_OK); } catch { issues.push(`Thiếu hoặc không đọc được: ${path}`); }
}
try {
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  if (manifest.name !== 'ygo-classic-duel') issues.push('Thư mục dự án không đúng.');
} catch { issues.push('Không đọc được cấu hình dự án.'); }
if (issues.length) {
  console.error(issues.map(s => `- ${s}`).join('\n')); process.exitCode = 1;
} else {
  console.log(`Kiểm tra môi trường đạt: Node ${process.versions.node}, ${process.platform}/${process.arch}.`);
  console.log('Mục tiêu sản phẩm: Windows 11. Kết quả này chỉ kiểm tra máy hiện tại, không xác nhận đã thử trên Windows.');
}
