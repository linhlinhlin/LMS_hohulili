import { Component, signal, inject, OnInit, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { OrganizationService } from '../../infrastructure/services/organization.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Organization, OrganizationInvite, OrgMember } from '../../../../shared/types/user.types';

type Tab = 'members' | 'invites' | 'settings';

@Component({
  selector: 'app-organization-detail',
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-6 max-w-6xl mx-auto">
      @if (isLoading()) {
        <div class="text-center py-16">
          <div class="inline-block animate-spin rounded-full h-10 w-10 border-4 border-[#0056D2] border-t-transparent"></div>
          <p class="mt-4 text-gray-500 text-sm">Đang tải thông tin tổ chức...</p>
        </div>
      } @else if (org()) {
        <!-- Header -->
        <div class="flex items-center gap-4 mb-6">
          <a routerLink="/admin/organizations"
             class="p-2 rounded-xl hover:bg-gray-100 transition-colors"
             title="Quay lại danh sách">
            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </a>
          <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
               [class]="org()!.enabled ? 'bg-gradient-to-br from-[#0056D2] to-[#004BB5]' : 'bg-gray-400'">
            {{ org()!.code.substring(0, 2) }}
          </div>
          <div class="flex-1 min-w-0">
            <h1 class="text-2xl font-bold text-gray-900">{{ org()!.name }}</h1>
            <div class="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
              <span class="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{{ org()!.code }}</span>
              <span class="text-gray-300">&middot;</span>
              @if (org()!.enabled) {
                <span class="px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 rounded-full border border-green-200">Hoạt động</span>
              } @else {
                <span class="px-2 py-0.5 text-xs font-medium bg-gray-50 text-gray-500 rounded-full border border-gray-200">Vô hiệu</span>
              }
              <span class="text-gray-300">&middot;</span>
              <span>Token: {{ org()!.tokenExpiryDays }} ngày</span>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="border-b border-gray-200 mb-6">
          <nav class="flex gap-1">
            @for (tab of tabs; track tab.key) {
              <button (click)="activeTab.set(tab.key)"
                      class="relative px-4 pb-3 pt-1 text-sm font-medium transition-colors rounded-t-lg"
                      [class]="activeTab() === tab.key
                        ? 'text-[#0056D2] border-b-2 border-[#0056D2]'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'">
                {{ tab.label }}
                @if (tab.key === 'members' && members().length > 0) {
                  <span class="ml-1.5 px-1.5 py-0.5 text-xs rounded-full"
                        [class]="activeTab() === 'members' ? 'bg-[#0056D2]/10 text-[#0056D2]' : 'bg-gray-100 text-gray-600'">
                    {{ members().length }}
                  </span>
                }
                @if (tab.key === 'invites' && activeInvites().length > 0) {
                  <span class="ml-1.5 px-1.5 py-0.5 text-xs rounded-full"
                        [class]="activeTab() === 'invites' ? 'bg-[#0056D2]/10 text-[#0056D2]' : 'bg-gray-100 text-gray-600'">
                    {{ activeInvites().length }}
                  </span>
                }
              </button>
            }
          </nav>
        </div>

        <!-- ==================== MEMBERS TAB ==================== -->
        @if (activeTab() === 'members') {
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-gray-50/80 text-gray-600 text-left">
                  <tr>
                    <th class="px-5 py-3 font-medium">Họ tên</th>
                    <th class="px-5 py-3 font-medium">Email</th>
                    <th class="px-5 py-3 font-medium">Vai trò</th>
                    <th class="px-5 py-3 font-medium">Token (ngày)</th>
                    <th class="px-5 py-3 font-medium">Trạng thái</th>
                    <th class="px-5 py-3 font-medium w-20"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  @for (member of members(); track member.id) {
                    <tr class="hover:bg-gray-50/50 transition-colors">
                      <td class="px-5 py-3.5">
                        <div class="flex items-center gap-3">
                          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-[#0056D2] to-[#004BB5] flex items-center justify-center text-white text-xs font-semibold shrink-0">
                            {{ member.fullName.charAt(0) }}
                          </div>
                          <span class="font-medium text-gray-900">{{ member.fullName }}</span>
                        </div>
                      </td>
                      <td class="px-5 py-3.5 text-gray-500">{{ member.email }}</td>
                      <td class="px-5 py-3.5">
                        <span class="px-2.5 py-1 text-xs font-medium rounded-full"
                              [ngClass]="getRoleBadgeClass(member.role)">
                          {{ getRoleLabel(member.role) }}
                        </span>
                      </td>
                      <td class="px-5 py-3.5">
                        @if (editingTokenMemberId() === member.id) {
                          <div class="flex items-center gap-1.5">
                            <input #tokenInput type="number" [value]="member.tokenExpiryDays ?? ''"
                                   min="1" [max]="org()!.tokenExpiryDays"
                                   placeholder="Mặc định"
                                   class="w-20 px-2 py-1 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-[#0056D2] focus:border-[#0056D2]">
                            <button (click)="saveMemberTokenExpiry(member.id, tokenInput.value)"
                                    class="p-1 text-[#0056D2] hover:bg-[#0056D2]/10 rounded transition-colors"
                                    title="Lưu">
                              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                              </svg>
                            </button>
                            <button (click)="editingTokenMemberId.set('')"
                                    class="p-1 text-gray-400 hover:bg-gray-100 rounded transition-colors"
                                    title="Hủy">
                              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                              </svg>
                            </button>
                          </div>
                        } @else {
                          <button (click)="editingTokenMemberId.set(member.id)"
                                  class="text-xs text-gray-600 hover:text-[#0056D2] transition-colors"
                                  title="Nhấn để chỉnh sửa">
                            @if (member.tokenExpiryDays) {
                              <span class="font-medium">{{ member.tokenExpiryDays }} ngày</span>
                            } @else {
                              <span class="text-gray-400">Mặc định tổ chức</span>
                            }
                          </button>
                        }
                      </td>
                      <td class="px-5 py-3.5">
                        @if (member.enabled) {
                          <span class="flex items-center gap-1.5 text-green-600 text-xs">
                            <span class="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                            Hoạt động
                          </span>
                        } @else {
                          <span class="flex items-center gap-1.5 text-gray-400 text-xs">
                            <span class="w-1.5 h-1.5 bg-gray-300 rounded-full"></span>
                            Vô hiệu
                          </span>
                        }
                      </td>
                      <td class="px-5 py-3.5">
                        @if (canRemoveMember(member)) {
                          <button (click)="removeMember(member)"
                                  class="px-2.5 py-1 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Xóa khỏi tổ chức">
                            Xóa
                          </button>
                        }
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="6" class="px-5 py-12 text-center">
                        <div class="flex flex-col items-center">
                          <div class="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                            <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                            </svg>
                          </div>
                          <p class="text-gray-500 text-sm">Chưa có thành viên nào</p>
                          <p class="text-gray-400 text-xs mt-1">Gửi lời mời để thêm thành viên vào tổ chức</p>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- ==================== INVITES TAB ==================== -->
        @if (activeTab() === 'invites') {
          <!-- Create Invite Actions -->
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4">
            <h3 class="text-sm font-semibold text-gray-900 mb-3">Tạo lời mời mới</h3>
            <div class="flex flex-wrap gap-3">
              <button (click)="createInviteCode()"
                      [disabled]="isCreatingInvite()"
                      class="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0056D2] text-white rounded-xl text-sm font-medium hover:bg-[#004BB5] disabled:opacity-50 transition-colors shadow-sm">
                @if (isCreatingInvite()) {
                  <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang tạo...
                } @else {
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                  </svg>
                  Tạo mã mời
                }
              </button>
              <div class="flex items-center gap-2">
                <input #emailInput type="email" placeholder="Email người nhận"
                       class="px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] w-60 transition-colors">
                <button (click)="sendEmailInvite(emailInput.value); emailInput.value = ''"
                        [disabled]="isSendingEmail()"
                        class="inline-flex items-center gap-2 px-4 py-2.5 border border-[#0056D2] text-[#0056D2] rounded-xl text-sm font-medium hover:bg-[#0056D2]/5 disabled:opacity-50 transition-colors">
                  @if (isSendingEmail()) {
                    <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang gửi...
                  } @else {
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                    Gửi lời mời
                  }
                </button>
              </div>
            </div>
          </div>

          <!-- New code display -->
          @if (newInviteCode()) {
            <div class="mb-4 p-4 bg-[#0056D2]/5 border border-[#0056D2]/20 rounded-xl animate-fade-in">
              <p class="text-sm text-gray-600 mb-2">Mã mời mới — chia sẻ cho người dùng để tham gia khi đăng ký:</p>
              <div class="flex items-center gap-3">
                <code class="text-2xl font-mono font-bold text-[#0056D2] tracking-[0.25em] select-all">{{ newInviteCode() }}</code>
                <button (click)="copyCode(newInviteCode())"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5] transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
                  </svg>
                  Sao chép
                </button>
              </div>
            </div>
          }

          <!-- Invite List -->
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-gray-50/80 text-gray-600 text-left">
                  <tr>
                    <th class="px-5 py-3 font-medium">Loại</th>
                    <th class="px-5 py-3 font-medium">Mã / Email</th>
                    <th class="px-5 py-3 font-medium">Sử dụng</th>
                    <th class="px-5 py-3 font-medium">Trạng thái</th>
                    <th class="px-5 py-3 font-medium">Hết hạn</th>
                    <th class="px-5 py-3 font-medium w-24"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  @for (invite of invites(); track invite.id) {
                    <tr class="hover:bg-gray-50/50 transition-colors">
                      <td class="px-5 py-3.5">
                        @if (invite.type === 'CODE') {
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/>
                            </svg>
                            Mã mời
                          </span>
                        } @else {
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                            </svg>
                            Email
                          </span>
                        }
                      </td>
                      <td class="px-5 py-3.5">
                        @if (invite.code) {
                          <div class="flex items-center gap-2">
                            <code class="font-mono font-semibold text-gray-900 tracking-wider">{{ invite.code }}</code>
                            <button (click)="copyCode(invite.code!)"
                                    class="p-1 text-gray-400 hover:text-[#0056D2] rounded transition-colors"
                                    title="Sao chép mã">
                              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2"/>
                              </svg>
                            </button>
                          </div>
                        } @else {
                          <span class="text-gray-500">{{ invite.email || '—' }}</span>
                        }
                      </td>
                      <td class="px-5 py-3.5 text-gray-500">
                        <span class="font-medium text-gray-900">{{ invite.useCount }}</span>
                        @if (invite.maxUses) {
                          <span class="text-gray-400">/ {{ invite.maxUses }}</span>
                        }
                      </td>
                      <td class="px-5 py-3.5">
                        @switch (invite.status) {
                          @case ('ACTIVE') {
                            <span class="px-2.5 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-full border border-green-200">Hoạt động</span>
                          }
                          @case ('REVOKED') {
                            <span class="px-2.5 py-1 text-xs font-medium bg-gray-50 text-gray-500 rounded-full border border-gray-200">Đã thu hồi</span>
                          }
                          @case ('EXPIRED') {
                            <span class="px-2.5 py-1 text-xs font-medium bg-yellow-50 text-yellow-700 rounded-full border border-yellow-200">Hết hạn</span>
                          }
                        }
                      </td>
                      <td class="px-5 py-3.5 text-gray-500 text-xs">{{ invite.expiresAt | date:'dd/MM/yyyy HH:mm' }}</td>
                      <td class="px-5 py-3.5">
                        @if (invite.status === 'ACTIVE') {
                          <button (click)="revokeInvite(invite)"
                                  class="px-2.5 py-1 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors">
                            Thu hồi
                          </button>
                        }
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="6" class="px-5 py-12 text-center">
                        <div class="flex flex-col items-center">
                          <div class="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                            <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                            </svg>
                          </div>
                          <p class="text-gray-500 text-sm">Chưa có lời mời nào</p>
                          <p class="text-gray-400 text-xs mt-1">Tạo mã mời hoặc gửi email để mời thành viên</p>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- ==================== SETTINGS TAB ==================== -->
        @if (activeTab() === 'settings') {
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-lg">
            <h3 class="text-lg font-semibold text-gray-900 mb-5">Cài đặt tổ chức</h3>
            <div class="space-y-4">
              <div>
                <label for="edit-name" class="block text-sm font-medium text-gray-700 mb-1.5">
                  Tên tổ chức <span class="text-red-500">*</span>
                </label>
                <input #editName id="edit-name" type="text" [value]="org()!.name"
                       class="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] transition-colors">
              </div>
              <div>
                <label for="edit-desc" class="block text-sm font-medium text-gray-700 mb-1.5">Mô tả</label>
                <textarea #editDesc id="edit-desc" rows="3" [value]="org()!.description || ''"
                          class="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] transition-colors"></textarea>
              </div>
              <div>
                <label for="edit-expiry" class="block text-sm font-medium text-gray-700 mb-1.5">Thời hạn token (ngày)</label>
                <input #editExpiry id="edit-expiry" type="number" [value]="org()!.tokenExpiryDays" min="7" max="1095"
                       class="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#0056D2]/20 focus:border-[#0056D2] transition-colors">
                <p class="text-xs text-gray-400 mt-1">7 - 1095 ngày (tối đa 3 năm). Thời hạn refresh token cho thành viên</p>
              </div>
              <div class="pt-4 border-t border-gray-100">
                <button (click)="updateOrg(editName.value, editDesc.value, +editExpiry.value)"
                        [disabled]="isUpdating()"
                        class="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0056D2] text-white rounded-xl text-sm font-medium hover:bg-[#004BB5] disabled:opacity-50 transition-colors shadow-sm">
                  @if (isUpdating()) {
                    <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang lưu...
                  } @else {
                    Lưu thay đổi
                  }
                </button>
              </div>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in { animation: fade-in 0.2s ease-out; }
  `]
})
export class OrganizationDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private orgService = inject(OrganizationService);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);
  private readonly authService = inject(AuthService);

  org = signal<Organization | null>(null);
  members = signal<OrgMember[]>([]);
  invites = signal<OrganizationInvite[]>([]);
  isLoading = signal(true);
  activeTab = signal<Tab>('members');

  isCreatingInvite = signal(false);
  isSendingEmail = signal(false);
  newInviteCode = signal('');

  isUpdating = signal(false);
  editingTokenMemberId = signal('');

  activeInvites = computed(() => this.invites().filter(i => i.status === 'ACTIVE'));

  readonly tabs = [
    { key: 'members' as Tab, label: 'Thành viên' },
    { key: 'invites' as Tab, label: 'Lời mời' },
    { key: 'settings' as Tab, label: 'Cài đặt' }
  ];

  private orgId = '';

  ngOnInit(): void {
    this.orgId = this.route.snapshot.paramMap.get('id') || '';
    this.loadAll();
  }

  private loadAll(): void {
    this.isLoading.set(true);
    this.orgService.getOrganization(this.orgId).subscribe({
      next: (org) => {
        this.org.set(org);
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('Không thể tải thông tin tổ chức');
        this.isLoading.set(false);
      }
    });
    this.loadMembers();
    this.loadInvites();
  }

  private loadMembers(): void {
    this.orgService.listMembers(this.orgId).subscribe({
      next: (members) => this.members.set(members),
      error: () => this.toast.error('Không thể tải danh sách thành viên')
    });
  }

  private loadInvites(): void {
    this.orgService.listInvites(this.orgId).subscribe({
      next: (invites) => this.invites.set(invites),
      error: () => this.toast.error('Không thể tải danh sách lời mời')
    });
  }

  canRemoveMember(member: OrgMember): boolean {
    const currentUser = this.authService.currentUser();
    const currentRole = currentUser?.role?.toLowerCase();
    // ADMIN can remove anyone except themselves
    if (currentRole === 'admin') {
      return member.id !== currentUser?.id;
    }
    // ORG_ADMIN cannot remove ADMIN or other ORG_ADMIN, and cannot remove themselves
    const memberRole = member.role?.toLowerCase();
    if (memberRole === 'admin' || memberRole === 'org_admin') return false;
    return member.id !== currentUser?.id;
  }

  async removeMember(member: OrgMember): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa thành viên',
      message: `Bạn có chắc muốn xóa "${member.fullName}" (${member.email}) khỏi tổ chức?`,
      variant: 'danger',
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    });
    if (!confirmed) return;

    this.orgService.removeMember(this.orgId, member.id).subscribe({
      next: () => {
        this.toast.success('Đã xóa thành viên', `"${member.fullName}" đã được xóa khỏi tổ chức`);
        this.loadMembers();
      },
      error: (err) => this.toast.error(err.error?.message || 'Không thể xóa thành viên')
    });
  }

  saveMemberTokenExpiry(memberId: string, value: string): void {
    const days = value.trim() === '' ? null : parseInt(value, 10);
    if (days !== null && (isNaN(days) || days < 1 || days > (this.org()?.tokenExpiryDays ?? 1095))) {
      this.toast.warning(`Giá trị phải từ 1 đến ${this.org()?.tokenExpiryDays ?? 1095} ngày, hoặc để trống cho mặc định`);
      return;
    }

    this.orgService.setMemberTokenExpiry(this.orgId, memberId, days).subscribe({
      next: () => {
        this.editingTokenMemberId.set('');
        this.toast.success('Đã cập nhật cấu hình token');
        this.loadMembers();
      },
      error: (err) => this.toast.error(err.error?.message || 'Không thể cập nhật cấu hình token')
    });
  }

  createInviteCode(): void {
    this.isCreatingInvite.set(true);
    this.newInviteCode.set('');

    this.orgService.createInviteCode(this.orgId, { expiryDays: 90 }).subscribe({
      next: (invite) => {
        this.isCreatingInvite.set(false);
        this.newInviteCode.set(invite.code || '');
        this.toast.success('Đã tạo mã mời', 'Mã mời sẵn sàng để chia sẻ');
        this.loadInvites();
      },
      error: (err) => {
        this.isCreatingInvite.set(false);
        this.toast.error(err.error?.message || 'Không thể tạo mã mời');
      }
    });
  }

  sendEmailInvite(email: string): void {
    if (!email || !email.includes('@')) {
      this.toast.warning('Vui lòng nhập địa chỉ email hợp lệ');
      return;
    }
    this.isSendingEmail.set(true);

    this.orgService.sendEmailInvite(this.orgId, { email, expiryDays: 7 }).subscribe({
      next: () => {
        this.isSendingEmail.set(false);
        this.toast.success('Đã gửi lời mời', `Lời mời đã được gửi đến ${email}`);
        this.loadInvites();
      },
      error: (err) => {
        this.isSendingEmail.set(false);
        this.toast.error(err.error?.message || 'Không thể gửi lời mời');
      }
    });
  }

  async revokeInvite(invite: OrganizationInvite): Promise<void> {
    const label = invite.type === 'CODE'
      ? `mã mời "${invite.code}"`
      : `lời mời email "${invite.email}"`;

    const confirmed = await this.confirmDialog.confirm({
      title: 'Thu hồi lời mời',
      message: `Bạn có chắc muốn thu hồi ${label}? Lời mời sẽ không thể sử dụng nữa.`,
      variant: 'warning',
      confirmText: 'Thu hồi',
      cancelText: 'Hủy'
    });
    if (!confirmed) return;

    this.orgService.revokeInvite(this.orgId, invite.id).subscribe({
      next: () => {
        this.toast.success('Đã thu hồi lời mời');
        this.loadInvites();
      },
      error: (err) => this.toast.error(err.error?.message || 'Không thể thu hồi lời mời')
    });
  }

  updateOrg(name: string, description: string, tokenExpiryDays: number): void {
    if (!name.trim()) {
      this.toast.warning('Tên tổ chức là bắt buộc');
      return;
    }
    this.isUpdating.set(true);

    this.orgService.updateOrganization(this.orgId, {
      name: name.trim(),
      description: description.trim() || undefined,
      tokenExpiryDays: tokenExpiryDays || 30
    }).subscribe({
      next: (updated) => {
        this.org.set(updated);
        this.isUpdating.set(false);
        this.toast.success('Đã cập nhật tổ chức', 'Thay đổi đã được lưu thành công');
      },
      error: (err) => {
        this.isUpdating.set(false);
        this.toast.error(err.error?.message || 'Không thể cập nhật tổ chức');
      }
    });
  }

  copyCode(code: string): void {
    navigator.clipboard.writeText(code).then(() => {
      this.toast.success('Đã sao chép mã mời vào clipboard');
    });
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'ADMIN': return 'bg-red-50 text-red-700 border border-red-200';
      case 'ORG_ADMIN': return 'bg-orange-50 text-orange-700 border border-orange-200';
      case 'TEACHER': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'STUDENT': return 'bg-green-50 text-green-700 border border-green-200';
      default: return 'bg-gray-50 text-gray-600 border border-gray-200';
    }
  }

  getRoleLabel(role: string): string {
    switch (role) {
      case 'ADMIN': return 'Quản trị';
      case 'ORG_ADMIN': return 'Chuyên viên';
      case 'TEACHER': return 'Giảng viên';
      case 'STUDENT': return 'Học viên';
      default: return role;
    }
  }
}
