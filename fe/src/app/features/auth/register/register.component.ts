import { Component, signal, inject, ChangeDetectionStrategy, ViewEncapsulation, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { RegisterRequest, UserRole } from '../../../shared/types/user.types';

// Multi-step registration forms
type EmailForm = {
  email: FormControl<string>;
};

type ProfileForm = {
  name: FormControl<string>;
  email: FormControl<string>;
  password: FormControl<string>;
  confirmPassword: FormControl<string>;
  newsletter: FormControl<boolean>;
};

@Component({
  selector: 'app-register',
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  encapsulation: ViewEncapsulation.Emulated,
  templateUrl: './register.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  protected authService = inject(AuthService);

  registerForm!: FormGroup<ProfileForm>;
  isLoading = signal(false);
  errorMessage = signal('');

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      newsletter: [false]
    }, {
      validators: this.passwordMatchValidator
    }) as FormGroup<ProfileForm>;
  }

  private passwordMatchValidator(group: FormGroup<ProfileForm>): { [key: string]: any } | null {
    const password = group.get('password');
    const confirmPassword = group.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  async onSubmit(): Promise<void> {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const formData = this.registerForm.getRawValue();
    
    // Use email as username (backend requirement)
    const userData: RegisterRequest = {
      username: formData.email, // Email as username - unique and user-controlled
      fullName: formData.name,
      email: formData.email,
      password: formData.password,
      role: UserRole.STUDENT
    };

    this.authService.register(userData).subscribe({
      next: (response) => {
        console.log('âœ… Registration successful:', response);
        this.isLoading.set(false);
        
        // Redirect based on user role
        const userRole = response.user.role.toLowerCase();
        let redirectUrl = '/';
        switch (userRole) {
          case 'admin':
            redirectUrl = '/admin';
            break;
          case 'teacher':
            redirectUrl = '/teacher';
            break;
          case 'student':
            redirectUrl = '/student';
            break;
          default:
            redirectUrl = '/';
        }
        
        this.router.navigate([redirectUrl]);
      },
      error: (error) => {
        console.error('âŒ Registration failed:', error);
        this.isLoading.set(false);
        this.errorMessage.set(error.error?.message || 'ÄÄƒng kĂ½ tháº¥t báº¡i. Vui lĂ²ng thá»­ láº¡i.');
      }
    });
  }
}

