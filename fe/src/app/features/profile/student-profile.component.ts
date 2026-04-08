import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { PresignedUploadService } from '../../core/services/presigned-upload.service';
import { AUTH_ENDPOINTS } from '../../api/endpoints/auth.endpoints';
import { ApiResponse } from '../../api/types/common.types';
import { ImageCropperComponent, ImageCroppedEvent, ImageTransform, LoadedImage } from 'ngx-image-cropper';

@Component({
  selector: 'app-student-profile',
  imports: [LoadingComponent, ImageCropperComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-loading
      [show]="isLoading()"
      text="Đang tải thông tin tài khoản..."
      variant="overlay"
      color="blue">
    </app-loading>

    <div class="min-h-screen bg-slate-50">
      <!-- Page Header -->
      <div class="bg-white border-b border-gray-200">
        <div class="max-w-[1400px] mx-auto px-4 sm:px-6 py-5">
          <h1 class="text-xl font-bold text-gray-900">Cài đặt tài khoản</h1>
          <p class="text-sm text-gray-500 mt-0.5">Quản lý thông tin cá nhân và bảo mật</p>
        </div>
      </div>

      <div class="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-5">

        <!-- Toast notification (Google Account / GitHub Settings pattern) -->
        @if (toast()) {
          <div class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium animate-fade-in"
               [class]="toast()!.type === 'success'
                 ? 'bg-green-50 text-green-800 border border-green-200'
                 : toast()!.type === 'error'
                   ? 'bg-red-50 text-red-800 border border-red-200'
                   : 'bg-blue-50 text-blue-800 border border-blue-200'">
            @if (toast()!.type === 'success') {
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            } @else if (toast()!.type === 'error') {
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            } @else {
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            }
            <span class="flex-1">{{ toast()!.message }}</span>
            <button (click)="toast.set(null)" class="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        }

        <!-- ========== 2-COLUMN GRID ========== -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">

          <!-- Section 1: Thông tin cá nhân -->
          <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 class="font-semibold text-gray-900">Thông tin cá nhân</h3>
              @if (!isEditing()) {
                <button (click)="startEditing()"
                        class="text-sm font-medium text-[#0056D2] hover:text-[#004BB5] transition-colors">
                  Chỉnh sửa
                </button>
              }
            </div>

            <div class="p-6">
              <!-- Avatar row (Facebook pattern: click → mini menu) -->
              <div class="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                @if (showAvatarMenu()) {
                  <div class="fixed inset-0 z-40" (click)="showAvatarMenu.set(false)"></div>
                }
                <div class="relative group flex-shrink-0">
                  <img [src]="avatarDisplay()" [alt]="fullName()"
                       class="w-16 h-16 rounded-full object-cover border-2 border-gray-100">
                  <button (click)="onAvatarClick()"
                          class="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                          title="Ảnh đại diện">
                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                  </button>
                  <input #avatarInput type="file" accept="image/jpeg,image/png,image/webp" class="hidden" (change)="onAvatarSelected($event)">
                  @if (avatarUploading()) {
                    <div class="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                      <svg class="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                    </div>
                  }

                  <!-- Avatar mini-menu popover (Facebook pattern) -->
                  @if (showAvatarMenu()) {
                    <div class="absolute left-0 top-full mt-2 z-50 animate-fade-in">
                      <div class="bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[210px]">
                        <button (click)="viewAvatar()"
                                class="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                          </svg>
                          Xem ảnh đại diện
                        </button>
                        <button (click)="editAvatar()"
                                class="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                          </svg>
                          Sửa ảnh đại diện
                        </button>
                      </div>
                    </div>
                  }
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-900">Ảnh đại diện</p>
                  <p class="text-xs text-gray-500 mt-0.5">JPG, PNG hoặc WebP. Tối đa 5 MB.</p>
                </div>
              </div>

    <!-- ===== Avatar Crop Modal (Facebook/GitHub/Google pattern) ===== -->
    @if (showCropModal()) {
      <div class="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Cắt ảnh đại diện" (keydown.escape)="cancelCrop()">
        <div class="absolute inset-0 bg-black/60" (click)="cancelCrop()"></div>
        <div class="relative bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden animate-crop-modal-in">
          <!-- Header -->
          <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 class="font-semibold text-gray-900">Cắt ảnh đại diện</h3>
            <button (click)="cancelCrop()" class="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Cropper area -->
          <div class="relative bg-gray-900 flex items-center justify-center" style="min-height: 340px;">
            <image-cropper
              [imageChangedEvent]="cropImageEvent()"
              [maintainAspectRatio]="true"
              [aspectRatio]="1"
              [roundCropper]="true"
              [canvasRotation]="0"
              [transform]="cropTransform()"
              [allowMoveImage]="true"
              [hideResizeSquares]="true"
              format="png"
              [resizeToWidth]="512"
              [resizeToHeight]="512"
              (imageCropped)="onImageCropped($event)"
              (imageLoaded)="onCropImageLoaded()"
              (loadImageFailed)="onCropLoadFailed()"
            />
          </div>

          <!-- Zoom slider -->
          <div class="px-5 py-3 border-t border-gray-100 bg-gray-50">
            <div class="flex items-center gap-3">
              <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"/>
              </svg>
              <input type="range" min="0.1" max="3" step="0.05"
                     [value]="cropZoom()"
                     (input)="onZoomChange($event)"
                     class="flex-1 h-1.5 bg-gray-300 rounded-full appearance-none cursor-pointer accent-[#0056D2]">
              <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"/>
              </svg>
            </div>
          </div>

          <!-- Footer buttons -->
          <div class="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button (click)="cancelCrop()"
                    class="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Hủy
            </button>
            <button (click)="saveCroppedAvatar()"
                    [disabled]="!croppedBlob() || avatarUploading()"
                    class="px-5 py-2 bg-[#0056D2] text-white text-sm font-medium rounded-lg hover:bg-[#004BB5] transition-colors disabled:opacity-50 flex items-center gap-2">
              @if (avatarUploading()) {
                <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Đang lưu...
              } @else {
                Lưu ảnh đại diện
              }
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ===== Avatar Lightbox (Facebook/LinkedIn pattern) ===== -->
    @if (showAvatarLightbox()) {
      <div class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
           role="dialog" aria-modal="true" aria-label="Xem ảnh đại diện"
           (keydown.escape)="showAvatarLightbox.set(false)" tabindex="-1">
        <div class="absolute inset-0 bg-black/80" (click)="showAvatarLightbox.set(false)"></div>
        <div class="relative animate-crop-modal-in">
          <button (click)="showAvatarLightbox.set(false)"
                  class="absolute -top-10 right-0 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
          <img [src]="avatarDisplay()" [alt]="fullName()"
               class="max-w-[400px] max-h-[80vh] rounded-2xl object-cover shadow-2xl">
        </div>
      </div>
    }

              @if (!isEditing()) {
                <!-- Display mode -->
                <dl class="space-y-4">
                  <div>
                    <dt class="text-sm text-gray-500">Họ và tên</dt>
                    <dd class="text-sm font-medium text-gray-900 mt-0.5">{{ fullName() }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-gray-500">Email</dt>
                    <dd class="text-sm font-medium text-gray-900 mt-0.5">{{ email() }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-gray-500">Vai trò</dt>
                    <dd class="text-sm font-medium text-gray-900 mt-0.5">{{ roleDisplay() }}</dd>
                  </div>
                  @if (organizationName()) {
                    <div>
                      <dt class="text-sm text-gray-500">Tổ chức</dt>
                      <dd class="text-sm font-medium text-gray-900 mt-0.5">{{ organizationName() }}</dd>
                    </div>
                  }
                </dl>
              } @else {
                <!-- Edit mode -->
                <div class="space-y-4">
                  <div>
                    <label for="editName" class="block text-sm font-medium text-gray-700 mb-1.5">Họ và tên</label>
                    <input id="editName" type="text"
                           [value]="editFullName()"
                           (input)="editFullName.set(asInputValue($event))"
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] outline-none transition-colors">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <div class="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                      <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                      </svg>
                      <span class="text-sm text-gray-600">{{ email() }}</span>
                    </div>
                    <p class="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      Liên hệ quản trị viên để thay đổi email
                    </p>
                  </div>
                  <div class="flex items-center gap-3 pt-1">
                    <button (click)="saveProfile()"
                            [disabled]="isSaving()"
                            class="px-4 py-2 bg-[#0056D2] text-white text-sm font-medium rounded-lg hover:bg-[#004BB5] transition-colors disabled:opacity-50">
                      @if (isSaving()) {
                        <svg class="w-4 h-4 animate-spin inline mr-1.5" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Đang lưu...
                      } @else {
                        Lưu thay đổi
                      }
                    </button>
                    <button (click)="cancelEditing()"
                            class="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      Hủy
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Section 2: Bảo mật -->
          <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div class="px-6 py-4 border-b border-gray-100">
              <h3 class="font-semibold text-gray-900">Bảo mật</h3>
            </div>

            <div class="p-6">
              @if (!isChangingPassword()) {
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-gray-900">Mật khẩu</p>
                    <p class="text-sm text-gray-500 mt-0.5">Đổi mật khẩu đăng nhập</p>
                  </div>
                  <button (click)="isChangingPassword.set(true)"
                          class="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    Đổi mật khẩu
                  </button>
                </div>
              } @else {
                <div class="space-y-4">
                  <!-- Current password -->
                  <div>
                    <label for="currentPwd" class="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu hiện tại</label>
                    <div class="relative">
                      <input id="currentPwd" [type]="showCurrentPassword() ? 'text' : 'password'"
                             [value]="currentPassword()"
                             (input)="currentPassword.set(asInputValue($event))"
                             class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] outline-none">
                      <button type="button" (click)="showCurrentPassword.set(!showCurrentPassword())"
                              class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                              [title]="showCurrentPassword() ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'">
                        @if (showCurrentPassword()) {
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                        } @else {
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        }
                      </button>
                    </div>
                  </div>
                  <!-- New password with strength indicator -->
                  <div>
                    <label for="newPwd" class="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu mới</label>
                    <div class="relative">
                      <input id="newPwd" [type]="showNewPassword() ? 'text' : 'password'"
                             [value]="newPassword()"
                             (input)="newPassword.set(asInputValue($event))"
                             class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] outline-none">
                      <button type="button" (click)="showNewPassword.set(!showNewPassword())"
                              class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                              [title]="showNewPassword() ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'">
                        @if (showNewPassword()) {
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                        } @else {
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        }
                      </button>
                    </div>
                    @if (newPassword().length > 0) {
                      <!-- Strength indicator bar (Google/Stripe pattern) -->
                      <div class="flex gap-1 mt-2">
                        <div class="h-1 flex-1 rounded-full transition-colors"
                             [class]="passwordStrength().score >= 1 ? passwordStrength().color : 'bg-gray-200'"></div>
                        <div class="h-1 flex-1 rounded-full transition-colors"
                             [class]="passwordStrength().score >= 2 ? passwordStrength().color : 'bg-gray-200'"></div>
                        <div class="h-1 flex-1 rounded-full transition-colors"
                             [class]="passwordStrength().score >= 3 ? passwordStrength().color : 'bg-gray-200'"></div>
                        <div class="h-1 flex-1 rounded-full transition-colors"
                             [class]="passwordStrength().score >= 4 ? passwordStrength().color : 'bg-gray-200'"></div>
                      </div>
                      <p class="text-xs mt-1" [class]="passwordStrength().textColor">{{ passwordStrength().label }}</p>
                    }
                    @if (newPassword().length > 0 && newPassword().length < 8) {
                      <p class="text-xs text-red-600 mt-1">Mật khẩu phải có ít nhất 8 ký tự</p>
                    }
                  </div>
                  <!-- Confirm password -->
                  <div>
                    <label for="confirmPwd" class="block text-sm font-medium text-gray-700 mb-1.5">Xác nhận mật khẩu mới</label>
                    <div class="relative">
                      <input id="confirmPwd" [type]="showConfirmPassword() ? 'text' : 'password'"
                             [value]="confirmPassword()"
                             (input)="confirmPassword.set(asInputValue($event))"
                             class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] outline-none">
                      <button type="button" (click)="showConfirmPassword.set(!showConfirmPassword())"
                              class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                              [title]="showConfirmPassword() ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'">
                        @if (showConfirmPassword()) {
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                        } @else {
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        }
                      </button>
                    </div>
                    @if (confirmPassword().length > 0 && confirmPassword() !== newPassword()) {
                      <p class="text-xs text-red-600 mt-1">Mật khẩu xác nhận không khớp</p>
                    }
                  </div>
                  <div class="flex items-center gap-3 pt-1">
                    <button (click)="changePassword()"
                            [disabled]="isSavingPassword() || !canSubmitPassword()"
                            class="px-4 py-2 bg-[#0056D2] text-white text-sm font-medium rounded-lg hover:bg-[#004BB5] transition-colors disabled:opacity-50">
                      @if (isSavingPassword()) {
                        Đang lưu...
                      } @else {
                        Cập nhật mật khẩu
                      }
                    </button>
                    <button (click)="cancelPasswordChange()"
                            class="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      Hủy
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fadeIn 0.25s ease-out;
    }
    @keyframes cropModalIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    .animate-crop-modal-in {
      animation: cropModalIn 0.2s ease-out;
    }
    /* ngx-image-cropper container styling */
    :host ::ng-deep image-cropper {
      --cropper-outline-color: rgba(0, 0, 0, 0.6);
    }
    :host ::ng-deep .ngx-ic-overlay {
      outline-color: rgba(0, 0, 0, 0.6) !important;
    }
  `]
})
export class StudentProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private uploadService = inject(PresignedUploadService);

  isLoading = signal(true);

  // Inline toast notification (Google Account / GitHub Settings pattern)
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  private toastTimer: any;

  // Profile display
  fullName = signal('');
  email = signal('');
  avatarUrl = signal<string | null>(null);
  organizationName = signal('');
  roleDisplay = computed(() => {
    const role = this.authService.currentUser()?.role;
    switch (role) {
      case 'admin': return 'Quản trị hệ thống';
      case 'org_admin': return 'Chuyên viên quản lý';
      case 'teacher': return 'Giảng viên';
      default: return 'Học viên';
    }
  });

  avatarDisplay = computed(() => {
    const url = this.avatarUrl();
    if (url) return url;
    const name = encodeURIComponent(this.fullName() || 'U');
    return `https://ui-avatars.com/api/?name=${name}&background=0056D2&color=ffffff&size=160&bold=true`;
  });

  // Edit profile state
  isEditing = signal(false);
  editFullName = signal('');
  isSaving = signal(false);

  // Avatar upload + crop (Facebook/GitHub/Google pattern)
  avatarUploading = signal(false);
  showCropModal = signal(false);
  cropImageEvent = signal<Event | null>(null);
  cropTransform = signal<ImageTransform>({});
  cropZoom = signal(1);
  croppedBlob = signal<Blob | null>(null);

  // Avatar menu + lightbox (Facebook pattern)
  showAvatarMenu = signal(false);
  showAvatarLightbox = signal(false);

  // Password change state
  isChangingPassword = signal(false);
  currentPassword = signal('');
  newPassword = signal('');
  confirmPassword = signal('');
  isSavingPassword = signal(false);

  // Password visibility toggles (Google/GitHub/Stripe SOTA)
  showCurrentPassword = signal(false);
  showNewPassword = signal(false);
  showConfirmPassword = signal(false);

  canSubmitPassword = computed(() =>
    this.currentPassword().length > 0 &&
    this.newPassword().length >= 8 &&
    this.newPassword() === this.confirmPassword()
  );

  // Password strength indicator (Google/Stripe pattern)
  passwordStrength = computed(() => {
    const pwd = this.newPassword();
    if (pwd.length === 0) return { score: 0, label: '', color: '', textColor: '' };

    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { score, label: 'Yếu', color: 'bg-red-500', textColor: 'text-red-600' };
    if (score === 2) return { score, label: 'Trung bình', color: 'bg-yellow-500', textColor: 'text-yellow-600' };
    if (score === 3) return { score, label: 'Mạnh', color: 'bg-green-500', textColor: 'text-green-600' };
    return { score, label: 'Rất mạnh', color: 'bg-green-600', textColor: 'text-green-700' };
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  private showToast(message: string, type: 'success' | 'error' | 'info'): void {
    clearTimeout(this.toastTimer);
    this.toast.set({ message, type });
    this.toastTimer = setTimeout(() => this.toast.set(null), 4000);
  }

  private async loadProfile(): Promise<void> {
    try {
      this.isLoading.set(true);
      const user = this.authService.currentUser();
      this.fullName.set(user?.fullName || user?.name || '');
      this.email.set(user?.email || '');
      this.avatarUrl.set(user?.avatar || null);
      this.organizationName.set((user as any)?.organizationName || '');
    } finally {
      this.isLoading.set(false);
    }
  }

  // --- Profile edit ---

  startEditing(): void {
    this.editFullName.set(this.fullName());
    this.isEditing.set(true);
  }

  cancelEditing(): void {
    this.isEditing.set(false);
  }

  async saveProfile(): Promise<void> {
    const name = this.editFullName().trim();
    if (!name) {
      this.showToast('Vui lòng điền họ tên', 'info');
      return;
    }
    const email = this.email();

    this.isSaving.set(true);
    try {
      await firstValueFrom(
        this.http.put<ApiResponse<any>>(AUTH_ENDPOINTS.PROFILE, {
          fullName: name,
          email: email
        })
      );

      this.fullName.set(name);
      this.email.set(email);
      this.authService.updateLocalUser({ fullName: name, email });
      this.isEditing.set(false);
      this.showToast('Cập nhật thông tin thành công', 'success');
    } catch (err: any) {
      const msg = err?.error?.message || 'Không thể cập nhật thông tin. Vui lòng thử lại.';
      this.showToast(msg, 'error');
    } finally {
      this.isSaving.set(false);
    }
  }

  // --- Avatar interaction (Facebook pattern: menu → view/edit) ---

  onAvatarClick(): void {
    if (this.avatarUrl()) {
      // Has custom avatar → show menu with View / Edit options
      this.showAvatarMenu.update(v => !v);
    } else {
      // No avatar yet → go straight to file picker
      const fileInput = document.querySelector('input[type="file"][accept*="image"]') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
        fileInput.click();
      }
    }
  }

  viewAvatar(): void {
    this.showAvatarMenu.set(false);
    this.showAvatarLightbox.set(true);
  }

  editAvatar(): void {
    this.showAvatarMenu.set(false);
    const fileInput = document.querySelector('input[type="file"][accept*="image"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
      fileInput.click();
    }
  }

  // --- Avatar upload + crop ---

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      this.showToast('Vui lòng chọn file ảnh JPG, PNG hoặc WebP', 'info');
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.showToast('Ảnh không được vượt quá 5MB', 'info');
      input.value = '';
      return;
    }

    // Open crop modal instead of uploading directly
    this.cropImageEvent.set(event);
    this.cropTransform.set({});
    this.cropZoom.set(1);
    this.croppedBlob.set(null);
    this.showCropModal.set(true);
  }

  onImageCropped(event: ImageCroppedEvent): void {
    this.croppedBlob.set(event.blob ?? null);
  }

  onCropImageLoaded(): void {
    // Image loaded into cropper — reset zoom
    this.cropTransform.set({ scale: 1 });
    this.cropZoom.set(1);
  }

  onCropLoadFailed(): void {
    this.showToast('Không thể đọc ảnh. Vui lòng chọn ảnh khác.', 'error');
    this.cancelCrop();
  }

  onZoomChange(event: Event): void {
    const scale = parseFloat((event.target as HTMLInputElement).value);
    this.cropZoom.set(scale);
    this.cropTransform.set({ ...this.cropTransform(), scale });
  }

  cancelCrop(): void {
    this.showCropModal.set(false);
    this.cropImageEvent.set(null);
    this.croppedBlob.set(null);
    // Reset file input
    const fileInput = document.querySelector('input[type="file"][accept*="image"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  saveCroppedAvatar(): void {
    const blob = this.croppedBlob();
    if (!blob) return;

    const file = new File([blob], 'avatar.png', { type: 'image/png' });
    this.avatarUploading.set(true);

    this.uploadService.upload(file, 'avatars').subscribe({
      next: (evt) => {
        if (evt.type === 'complete') {
          this.http.put<ApiResponse<any>>(AUTH_ENDPOINTS.PROFILE, {
            fullName: this.fullName(),
            email: this.email(),
            avatarUrl: evt.url
          }).subscribe({
            next: () => {
              this.avatarUrl.set(evt.url);
              this.authService.updateLocalUser({ avatar: evt.url });
              this.showToast('Cập nhật ảnh đại diện thành công', 'success');
              this.avatarUploading.set(false);
              this.showCropModal.set(false);
              this.cropImageEvent.set(null);
              this.croppedBlob.set(null);
            },
            error: (err: any) => {
              const msg = err?.error?.message || 'Không thể lưu ảnh đại diện. Vui lòng thử lại.';
              this.showToast(msg, 'error');
              this.avatarUploading.set(false);
            }
          });
        }
      },
      error: (err: any) => {
        const msg = err?.error?.message || err?.message || 'Không thể tải ảnh lên. Vui lòng thử lại.';
        this.showToast(msg, 'error');
        this.avatarUploading.set(false);
      }
    });
  }

  // --- Password change ---

  async changePassword(): Promise<void> {
    if (!this.canSubmitPassword()) return;

    this.isSavingPassword.set(true);
    try {
      await firstValueFrom(
        this.http.put<ApiResponse<any>>(AUTH_ENDPOINTS.PASSWORD, {
          currentPassword: this.currentPassword(),
          newPassword: this.newPassword()
        })
      );

      this.cancelPasswordChange();
      this.showToast('Đổi mật khẩu thành công', 'success');
    } catch (err: any) {
      const msg = err?.error?.message || 'Không thể đổi mật khẩu. Vui lòng kiểm tra mật khẩu hiện tại.';
      this.showToast(msg, 'error');
    } finally {
      this.isSavingPassword.set(false);
    }
  }

  cancelPasswordChange(): void {
    this.isChangingPassword.set(false);
    this.currentPassword.set('');
    this.newPassword.set('');
    this.confirmPassword.set('');
    this.showCurrentPassword.set(false);
    this.showNewPassword.set(false);
    this.showConfirmPassword.set(false);
  }

  // --- Helpers ---

  asInputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
