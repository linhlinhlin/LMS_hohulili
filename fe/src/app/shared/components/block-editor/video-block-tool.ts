import { environment } from '../../../../environments/environment';

/**
 * SOTA EditorJS Video Block Tool
 *
 * Upload: 3-step presigned flow (init → PUT to R2 → confirm) with server-relay fallback
 * Processing: VideoAsset creation → FFmpeg → HLS/DASH adaptive packaging
 * Storage: ContentBlock { videoAssetId, url (fallback), caption }
 *
 * Vanilla JS implementation (EditorJS runs outside Angular DI).
 */

const API_BASE = `${environment.apiUrl}/api/v3`;
const MAX_FILE_SIZE = 5_000_000_000; // 5GB via presigned upload

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('lms_access_token') || localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

async function apiPost<T>(endpoint: string, body: object): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`API ${endpoint} failed (${res.status})`);
  const json = await res.json();
  return json.data ?? json;
}

async function apiGet<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`API ${endpoint} failed (${res.status})`);
  const json = await res.json();
  return json.data ?? json;
}

function xhrPut(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round(100 * e.loaded / e.total));
    };
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`PUT failed (${xhr.status})`));
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}

function xhrFormData(url: string, file: File, onProgress: (pct: number) => void): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'videos');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round(100 * e.loaded / e.total));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); } catch { reject(new Error('Invalid response')); }
      } else {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error'));

    xhr.open('POST', url);
    const token = localStorage.getItem('lms_access_token') || localStorage.getItem('token');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}

interface ToolData {
  videoAssetId: string;
  url: string;
  caption: string;
  mimeType: string;
  status: string;
}

export default class VideoBlockTool {
  private api: any;
  private data: ToolData;
  private wrapper: HTMLElement | null = null;
  private uploadInput: HTMLInputElement | null = null;
  private uploadZone: HTMLElement | null = null;
  private progressBar: HTMLElement | null = null;
  private pollingTimer: ReturnType<typeof setInterval> | null = null;

  static get toolbox() {
    return {
      title: 'Video',
      icon: '<svg width="17" height="15" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/></svg>'
    };
  }

  static get isReadOnlySupported() {
    return true;
  }

  constructor({ data, api }: { data: any; api: any }) {
    this.api = api;
    this.data = {
      videoAssetId: data.videoAssetId || '',
      url: data.url || '',
      caption: data.caption || '',
      mimeType: data.mimeType || 'video/mp4',
      status: data.status || ''
    };
  }

  destroy() {
    this.stopPolling();
  }

  render(): HTMLElement {
    this.wrapper = document.createElement('div');
    this.wrapper.style.cssText = 'border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: #fafafa;';

    if (this.data.videoAssetId || this.data.url) {
      this.renderVideoPreview();
      if (this.data.videoAssetId && this.data.status !== 'READY') {
        this.startPolling(this.data.videoAssetId);
      }
    } else {
      this.renderUploadZone();
    }

    return this.wrapper;
  }

  // ─── Upload Zone ────────────────────────────────────────────

  private renderUploadZone() {
    if (!this.wrapper) return;
    this.wrapper.innerHTML = '';

    this.uploadZone = document.createElement('div');
    this.uploadZone.style.cssText = `
      padding: 2rem; text-align: center; cursor: pointer;
      border: 2px dashed #d1d5db; border-radius: 8px; margin: 8px;
      transition: all 0.2s; background: #f9fafb;
    `;
    this.uploadZone.innerHTML = `
      <div style="margin-bottom: 8px;">
        <svg width="40" height="40" viewBox="0 0 20 20" fill="#9ca3af" style="margin: 0 auto;">
          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
        </svg>
      </div>
      <p style="font-size: 14px; color: #6b7280; margin: 0 0 4px;">
        Nhấn để chọn video hoặc kéo thả vào đây
      </p>
      <p style="font-size: 12px; color: #9ca3af; margin: 0;">
        MP4, MOV, WEBM (tối đa 5GB, adaptive streaming)
      </p>
    `;

    this.uploadZone.addEventListener('mouseenter', () => {
      this.uploadZone!.style.borderColor = '#0056D2';
      this.uploadZone!.style.background = '#eff6ff';
    });
    this.uploadZone.addEventListener('mouseleave', () => {
      this.uploadZone!.style.borderColor = '#d1d5db';
      this.uploadZone!.style.background = '#f9fafb';
    });

    this.uploadInput = document.createElement('input');
    this.uploadInput.type = 'file';
    this.uploadInput.accept = '.mp4,.mov,.webm,video/mp4,video/webm,video/quicktime';
    this.uploadInput.style.display = 'none';
    this.uploadInput.addEventListener('change', (e) => {
      const input = e.target as HTMLInputElement;
      if (input.files?.[0]) this.uploadFile(input.files[0]);
    });

    this.uploadZone.addEventListener('click', () => this.uploadInput?.click());

    this.uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); this.uploadZone!.style.borderColor = '#0056D2'; this.uploadZone!.style.background = '#eff6ff'; });
    this.uploadZone.addEventListener('dragleave', () => { this.uploadZone!.style.borderColor = '#d1d5db'; this.uploadZone!.style.background = '#f9fafb'; });
    this.uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadZone!.style.borderColor = '#d1d5db';
      this.uploadZone!.style.background = '#f9fafb';
      const file = e.dataTransfer?.files[0];
      if (file?.type.startsWith('video/')) this.uploadFile(file);
    });

    this.progressBar = document.createElement('div');
    this.progressBar.style.cssText = 'display: none; padding: 16px; text-align: center;';
    this.progressBar.innerHTML = `
      <div style="margin-bottom: 8px;">
        <div style="width: 100%; height: 6px; background: #e5e7eb; border-radius: 9999px; overflow: hidden;">
          <div class="video-progress-fill" style="width: 0%; height: 100%; background: #0056D2; transition: width 0.3s;"></div>
        </div>
      </div>
      <p class="video-progress-text" style="font-size: 13px; color: #0056D2; font-weight: 600; margin: 0;">Đang tải lên...</p>
    `;

    this.wrapper.appendChild(this.uploadZone);
    this.wrapper.appendChild(this.uploadInput);
    this.wrapper.appendChild(this.progressBar);
  }

  // ─── 3-Step Presigned Upload ────────────────────────────────

  private async uploadFile(file: File) {
    if (file.size > MAX_FILE_SIZE) {
      this.showUploadError(`Video vượt quá ${Math.round(MAX_FILE_SIZE / 1e9)}GB.`);
      return;
    }

    if (this.uploadZone) this.uploadZone.style.display = 'none';
    if (this.progressBar) this.progressBar.style.display = 'block';
    this.updateProgress(0, 'Khởi tạo upload...');

    try {
      // Step 1: Init presigned URL
      const initRes = await apiPost<any>('/files/upload/init', {
        contentType: file.type,
        fileSize: file.size,
        folder: 'videos'
      });

      let attachmentId: string;
      let rawUrl: string;

      if (initRes.isServerRelay || !initRes.uploadUrl) {
        // Dev fallback: server relay
        this.updateProgress(0, 'Đang tải lên (server relay)...');
        const relayRes = await xhrFormData(
          `${API_BASE}/files/upload/editor`,
          file,
          (pct) => this.updateProgress(pct, `Đang tải lên... ${pct}%`)
        );
        const relayData = relayRes.data || relayRes;
        const fileData = relayData.file || relayData;
        attachmentId = fileData.uuid || fileData.id || '';
        rawUrl = fileData.url || '';
      } else {
        // Step 2: PUT to presigned R2 URL
        this.updateProgress(0, 'Đang tải lên R2...');
        await xhrPut(initRes.uploadUrl, file, (pct) =>
          this.updateProgress(pct, `Đang tải lên... ${pct}%`)
        );

        // Step 3: Confirm upload
        this.updateProgress(100, 'Xác nhận upload...');
        const confirmRes = await apiPost<any>('/files/upload/confirm', {
          storageKey: initRes.storageKey,
          originalName: file.name
        });
        attachmentId = confirmRes.id;
        rawUrl = confirmRes.url || '';
      }

      // Step 4: Create VideoAsset (triggers FFmpeg pipeline)
      this.updateProgress(100, 'Tạo Video Asset...');
      const asset = await apiPost<any>('/video-assets/from-upload', {
        attachmentId,
        displayName: file.name
      });

      this.data.videoAssetId = asset.id;
      this.data.url = rawUrl;
      this.data.mimeType = file.type || 'video/mp4';
      this.data.status = asset.status || 'PENDING';

      this.renderVideoPreview();
      this.startPolling(asset.id);

    } catch (err: any) {
      this.showUploadError(err?.message || 'Upload thất bại');
    }
  }

  // ─── VideoAsset Polling ─────────────────────────────────────

  private startPolling(assetId: string) {
    this.stopPolling();
    this.pollingTimer = setInterval(async () => {
      try {
        const asset = await apiGet<any>(`/video-assets/${assetId}`);
        this.data.status = asset.status;
        if (asset.playbackUrl) {
          this.data.url = asset.playbackUrl;
        }
        this.updateStatusOverlay(asset.status);
        if (asset.status === 'READY' || asset.status === 'FAILED') {
          this.stopPolling();
        }
      } catch {
        // Silent retry on next interval
      }
    }, 5000);
  }

  private stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  private updateStatusOverlay(status: string) {
    const overlay = this.wrapper?.querySelector('.video-status-overlay') as HTMLElement;
    if (!overlay) return;

    if (status === 'READY') {
      overlay.style.display = 'none';
    } else if (status === 'FAILED') {
      overlay.innerHTML = `
        <div style="color: #ef4444; font-size: 13px; text-align: center;">
          <p style="margin: 0 0 8px;">Xử lý video thất bại</p>
          <button type="button" class="retry-asset-btn" style="padding: 4px 16px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Thử lại</button>
        </div>
      `;
      overlay.querySelector('.retry-asset-btn')?.addEventListener('click', async () => {
        try {
          await apiPost(`/video-assets/${this.data.videoAssetId}/retry`, {});
          this.data.status = 'PENDING';
          this.updateStatusOverlay('PROCESSING');
          this.startPolling(this.data.videoAssetId);
        } catch {}
      });
    } else {
      overlay.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; color: white; font-size: 13px;">
          <span style="display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite;"></span>
          <span>Đang xử lý adaptive streaming...</span>
        </div>
        <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
      `;
    }
  }

  // ─── Video Preview ──────────────────────────────────────────

  private renderVideoPreview() {
    if (!this.wrapper) return;
    this.wrapper.innerHTML = '';

    const videoContainer = document.createElement('div');
    videoContainer.style.cssText = 'background: #000; position: relative;';

    const videoEl = document.createElement('video');
    videoEl.src = this.data.url;
    videoEl.controls = true;
    videoEl.preload = 'metadata';
    videoEl.style.cssText = 'width: 100%; max-height: 360px; display: block;';
    videoContainer.appendChild(videoEl);

    // Status overlay (for PENDING/PROCESSING)
    const statusOverlay = document.createElement('div');
    statusOverlay.className = 'video-status-overlay';
    statusOverlay.style.cssText = 'position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.7); border-radius: 0;';
    if (this.data.status === 'READY' || !this.data.videoAssetId) {
      statusOverlay.style.display = 'none';
    } else {
      this.updateStatusOverlayContent(statusOverlay, this.data.status);
    }
    videoContainer.appendChild(statusOverlay);

    // Actions bar
    const actionsBar = document.createElement('div');
    actionsBar.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #f8fafc; border-top: 1px solid #e5e7eb;';

    if (this.data.videoAssetId) {
      const badge = document.createElement('span');
      badge.style.cssText = 'font-size: 11px; padding: 2px 8px; border-radius: 9999px; font-weight: 600;';
      if (this.data.status === 'READY') {
        badge.style.cssText += 'background: #dcfce7; color: #166534;';
        badge.textContent = 'Adaptive Streaming';
      } else if (this.data.status === 'FAILED') {
        badge.style.cssText += 'background: #fef2f2; color: #991b1b;';
        badge.textContent = 'Xử lý lỗi';
      } else {
        badge.style.cssText += 'background: #fef9c3; color: #854d0e;';
        badge.textContent = 'Đang xử lý...';
      }
      actionsBar.appendChild(badge);
    }

    const spacer = document.createElement('div');
    spacer.style.cssText = 'flex: 1;';
    actionsBar.appendChild(spacer);

    const replaceBtn = document.createElement('button');
    replaceBtn.type = 'button';
    replaceBtn.textContent = 'Thay video';
    replaceBtn.style.cssText = 'padding: 4px 12px; font-size: 12px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer;';
    replaceBtn.addEventListener('click', () => {
      this.stopPolling();
      this.data = { videoAssetId: '', url: '', caption: '', mimeType: 'video/mp4', status: '' };
      this.renderUploadZone();
    });
    actionsBar.appendChild(replaceBtn);

    // Caption input
    const captionContainer = document.createElement('div');
    captionContainer.style.cssText = 'padding: 8px 12px; border-top: 1px solid #e5e7eb;';
    const captionInput = document.createElement('input');
    captionInput.type = 'text';
    captionInput.placeholder = 'Chú thích video (tùy chọn)';
    captionInput.value = this.data.caption;
    captionInput.style.cssText = 'width: 100%; border: none; font-size: 13px; color: #6b7280; outline: none; background: transparent;';
    captionInput.addEventListener('input', () => { this.data.caption = captionInput.value; });
    captionContainer.appendChild(captionInput);

    this.wrapper.appendChild(videoContainer);
    this.wrapper.appendChild(actionsBar);
    this.wrapper.appendChild(captionContainer);
  }

  private updateStatusOverlayContent(overlay: HTMLElement, status: string) {
    if (status === 'FAILED') {
      overlay.innerHTML = `<div style="color: #ef4444; font-size: 13px; text-align: center;"><p style="margin: 0;">Xử lý thất bại</p></div>`;
    } else {
      overlay.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; color: white; font-size: 13px;">
          <span style="display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite;"></span>
          <span>Đang xử lý adaptive streaming...</span>
        </div>
        <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
      `;
    }
  }

  // ─── Helpers ────────────────────────────────────────────────

  private updateProgress(pct: number, text: string) {
    const fill = this.progressBar?.querySelector('.video-progress-fill') as HTMLElement;
    const label = this.progressBar?.querySelector('.video-progress-text') as HTMLElement;
    if (fill) fill.style.width = `${pct}%`;
    if (label) label.textContent = text;
  }

  private showUploadError(msg: string) {
    if (this.progressBar) this.progressBar.style.display = 'none';
    if (this.uploadZone) this.uploadZone.style.display = 'block';
    const errorEl = document.createElement('div');
    errorEl.style.cssText = 'padding: 8px 12px; background: #fef2f2; color: #991b1b; font-size: 13px; border-radius: 4px; margin: 8px;';
    errorEl.textContent = msg;
    this.wrapper?.appendChild(errorEl);
    setTimeout(() => errorEl.remove(), 5000);
  }

  save() {
    return {
      videoAssetId: this.data.videoAssetId,
      url: this.data.url,
      caption: this.data.caption,
      mimeType: this.data.mimeType
    };
  }

  validate(savedData: any): boolean {
    return !!(savedData.videoAssetId || (savedData.url && savedData.url.trim().length > 0));
  }
}
