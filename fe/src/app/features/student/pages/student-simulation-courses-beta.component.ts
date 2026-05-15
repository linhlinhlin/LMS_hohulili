import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import type { IconName } from '../../../shared/components/icon/icon.component';

interface CapabilityItem {
  icon: IconName;
  title: string;
  body: string;
  tone: 'ready' | 'pending' | 'warning';
}

interface ChecklistItem {
  label: string;
  status: 'done' | 'pending';
}

@Component({
  selector: 'app-student-simulation-courses-beta',
  standalone: true,
  imports: [RouterModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8" data-testid="student-simulation-courses-beta">
      <div class="mx-auto max-w-7xl space-y-6">
        <header class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
                  <app-icon name="ship" size="xs" />
                  Đã xuất bản
                </span>
                <span class="inline-flex rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-cyan-700">
                  Unity WebGPU
                </span>
                <span class="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">
                  COLREG Rule 15
                </span>
              </div>
              <h1 class="mt-3 text-2xl font-black tracking-normal text-slate-950 sm:text-3xl">
                Mô phỏng buồng lái hàng hải
              </h1>
              <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                Bản Unity WebGPU chính thức đã được đóng gói lên R2 và phục vụ qua Cloudflare Worker.
                Đây là gói mô phỏng Rule 15 dùng cho bài học tránh va tình huống tàu cắt hướng từ mạn phải.
              </p>
            </div>

            <div class="grid min-w-[280px] gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              <div class="flex items-center justify-between gap-4">
                <span class="font-semibold text-slate-600">Phiên bản</span>
                <span class="font-black text-slate-950">{{ version }}</span>
              </div>
              <div class="flex items-center justify-between gap-4">
                <span class="font-semibold text-slate-600">Dung lượng</span>
                <span class="font-black text-slate-950">{{ packageSizeLabel }}</span>
              </div>
              <div class="flex items-center justify-between gap-4">
                <span class="font-semibold text-slate-600">Trạng thái</span>
                <span class="font-black text-emerald-700">Sẵn sàng QA</span>
              </div>
            </div>
          </div>
        </header>

        <section class="grid gap-4 lg:grid-cols-4">
          @for (item of capabilityItems; track item.title) {
            <article class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div class="mb-3 flex items-center gap-3">
                <span
                  class="inline-flex h-10 w-10 items-center justify-center rounded-lg"
                  [class.bg-emerald-50]="item.tone === 'ready'"
                  [class.text-emerald-700]="item.tone === 'ready'"
                  [class.bg-amber-50]="item.tone === 'pending'"
                  [class.text-amber-700]="item.tone === 'pending'"
                  [class.bg-rose-50]="item.tone === 'warning'"
                  [class.text-rose-700]="item.tone === 'warning'">
                  <app-icon [name]="item.icon" size="md" />
                </span>
                <h2 class="text-base font-black text-slate-950">{{ item.title }}</h2>
              </div>
              <p class="text-sm leading-6 text-slate-600">{{ item.body }}</p>
            </article>
          }
        </section>

        <section class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <article class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.18em] text-[#0056D2]">Unity WebGPU package</p>
                <h2 class="mt-1 text-xl font-black text-slate-950">Bản mô phỏng đã sẵn sàng để kiểm thử</h2>
              </div>
              <a
                class="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#0056D2] px-4 text-sm font-bold text-white transition hover:bg-[#004BB5]"
                [href]="publicLaunchUrl"
                target="_blank"
                rel="noopener noreferrer">
                <app-icon name="play" size="sm" />
                Mở mô phỏng
              </a>
            </div>

            <div class="mt-5 grid gap-4 md:grid-cols-2">
              <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 class="text-sm font-black text-slate-900">Đường dẫn LMS chuẩn</h3>
                <code class="mt-3 block overflow-x-auto rounded-md bg-slate-950 px-3 py-2 text-xs text-cyan-100">
                  {{ canonicalEntryUrl }}
                </code>
                <p class="mt-3 text-sm leading-6 text-slate-600">
                  Đây là đường cùng origin cho production khi root domain được proxy qua Cloudflare. Cấu trúc này giữ được PWA/offline, CSP và bridge LMS ổn định.
                </p>
              </div>

              <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 class="text-sm font-black text-slate-900">Đường kiểm thử công khai</h3>
                <code class="mt-3 block overflow-x-auto rounded-md bg-slate-950 px-3 py-2 text-xs text-cyan-100">
                  {{ publicLaunchUrl }}
                </code>
                <p class="mt-3 text-sm leading-6 text-slate-600">
                  Đường này chạy qua prefix hẹp trên subdomain đã proxied, dùng để demo và QA ngay mà không phải đổi trạng thái DNS của toàn bộ root domain.
                </p>
              </div>
            </div>

            <div class="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <h3 class="text-sm font-black text-emerald-900">Yêu cầu thiết bị</h3>
              <p class="mt-2 text-sm leading-6 text-emerald-900">
                Khuyến nghị Chrome hoặc Edge mới trên laptop/desktop có GPU acceleration, WebGPU, WebAssembly và tối thiểu 8 GB RAM.
                Thiết bị di động hoặc trình duyệt trong ứng dụng mạng xã hội chỉ nên xem video, ghi chú và quiz thay thế.
              </p>
            </div>
          </article>

          <aside class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 class="text-lg font-black text-slate-950">Checklist triển khai</h2>
            <div class="mt-4 space-y-3">
              @for (item of checklistItems; track item.label) {
                <div class="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <app-icon
                    [name]="item.status === 'done' ? 'circle-check' : 'clock'"
                    size="sm"
                    [className]="item.status === 'done' ? 'mt-0.5 text-emerald-600' : 'mt-0.5 text-amber-600'" />
                  <span class="text-sm leading-5 text-slate-700">{{ item.label }}</span>
                </div>
              }
            </div>
          </aside>
        </section>
      </div>
    </main>
  `,
})
export class StudentSimulationCoursesBetaComponent {
  readonly packageId = 'colreg-rule-15-crossing';
  readonly version = 'v2026.05.16.3';
  readonly packageSizeLabel = '61.2 MB';
  readonly canonicalEntryUrl = `/simulations/${this.packageId}/${this.version}/index.html`;
  readonly canonicalManifestUrl = `/simulations/${this.packageId}/${this.version}/holilihu-simulation.json`;
  readonly publicLaunchUrl = `https://media.holilihu.online${this.canonicalEntryUrl}`;
  readonly publicManifestUrl = `https://media.holilihu.online${this.canonicalManifestUrl}`;

  readonly capabilityItems: readonly CapabilityItem[] = [
    {
      icon: 'globe',
      title: 'WebGPU desktop',
      tone: 'ready',
      body: 'Bản WebGPU đã qua smoke test trên Chrome desktop: Unity canvas tải xong, không trắng màn hình, không sai MIME wasm.',
    },
    {
      icon: 'download',
      title: 'R2 + Worker',
      tone: 'ready',
      body: 'Gói Unity nằm trong bucket lms-storage, phục vụ qua Worker với cache immutable cho asset lớn và cache ngắn cho manifest.',
    },
    {
      icon: 'smartphone',
      title: 'Mobile',
      tone: 'warning',
      body: 'Không cam kết chạy mô phỏng trên điện thoại ở V1. LMS vẫn phục vụ nội dung thay thế, video và quiz cho thiết bị yếu.',
    },
    {
      icon: 'eye',
      title: 'VR lab',
      tone: 'pending',
      body: 'Bản headset/native vẫn đi theo kênh lab riêng sau khi scene Unity ổn định thêm phần tay, cần gạt và lực tương tác.',
    },
  ];

  readonly checklistItems: readonly ChecklistItem[] = [
    { label: `Unity WebGPU package ${this.version} đã upload lên R2 production và staging.`, status: 'done' },
    { label: 'Cloudflare Worker trả đúng Content-Type cho .wasm, .js, .data, index và manifest.', status: 'done' },
    { label: 'Trang LMS đã có điểm vào để QA mô phỏng thật, không còn dùng bản smoke tối giản làm đại diện.', status: 'done' },
    { label: 'Root holilihu.online vẫn cần cutover proxy có kiểm soát để bật đường same-origin /simulations/* chính thức.', status: 'pending' },
  ];
}
