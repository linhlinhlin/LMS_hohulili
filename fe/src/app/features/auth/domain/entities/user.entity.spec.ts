import { User, UserProfile, UserSecurity, UserMetadata } from './user.entity';
import { Email } from '../value-objects/email';
import { UserRole, UserStatus, AuthMethod } from '../types';

describe('User Entity', () => {
  // Test data factories
  const createValidUserData = () => ({
    id: 'user-123' as any,
    email: new Email('john.doe@university.edu'),
    passwordHash: 'hashed-password-123' as any,
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
    authMethod: AuthMethod.PASSWORD,
    profile: {
      firstName: 'John',
      lastName: 'Doe',
      displayName: 'John Doe',
      avatar: 'https://example.com/avatar.jpg',
      phoneNumber: '+1234567890',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'male' as const,
      address: {
        street: '123 Main St',
        city: 'Anytown',
        state: 'State',
        zipCode: '12345',
        country: 'Country'
      }
    } as UserProfile,
    security: {
      emailVerified: true,
      emailVerificationToken: undefined,
      passwordResetToken: undefined,
      passwordResetExpires: undefined,
      lastPasswordChange: new Date('2024-01-01'),
      failedLoginAttempts: 0,
      lockedUntil: undefined,
      twoFactorEnabled: false,
      twoFactorSecret: undefined,
      trustedDevices: []
    } as UserSecurity,
    metadata: {
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      lastLoginAt: new Date('2024-01-15'),
      loginCount: 5,
      preferredLanguage: 'en',
      timezone: 'UTC',
      tags: ['student', 'active']
    } as UserMetadata
  });

  describe('Creation and Validation', () => {
    it('should create a valid user', () => {
      const userData = createValidUserData();
      const user = new User(
        userData.id,
        userData.email,
        userData.passwordHash,
        userData.role,
        userData.status,
        userData.authMethod,
        userData.profile,
        userData.security,
        userData.metadata
      );

      expect(user.id).toBe(userData.id);
      expect(user.email.toString()).toBe('john.doe@university.edu');
      expect(user.role).toBe(UserRole.STUDENT);
      expect(user.status).toBe(UserStatus.ACTIVE);
    });

    it('should throw error for invalid user data', () => {
      const userData = createValidUserData();
      userData.profile.firstName = ''; // Invalid first name

      expect(() => new User(
        userData.id,
        userData.email,
        userData.passwordHash,
        userData.role,
        userData.status,
        userData.authMethod,
        userData.profile,
        userData.security,
        userData.metadata
      )).toThrowError('Invalid user: First name cannot be empty');
    });

    it('should throw error for future creation date', () => {
      const userData = createValidUserData();
      userData.metadata.createdAt = new Date(Date.now() + 86400000); // Tomorrow

      expect(() => new User(
        userData.id,
        userData.email,
        userData.passwordHash,
        userData.role,
        userData.status,
        userData.authMethod,
        userData.profile,
        userData.security,
        userData.metadata
      )).toThrowError('Invalid user: Created date cannot be in the future');
    });
  });

  describe('Status Checks', () => {
    let user: User;

    beforeEach(() => {
      const userData = createValidUserData();
      user = new User(
        userData.id,
        userData.email,
        userData.passwordHash,
        userData.role,
        userData.status,
        userData.authMethod,
        userData.profile,
        userData.security,
        userData.metadata
      );
    });

    it('should check if user is active', () => {
      expect(user.isActive()).toBe(true);
      expect(user.isSuspended()).toBe(false);
    });

    it('should check if user is suspended', () => {
      const suspendedUser = user.withStatus(UserStatus.SUSPENDED);
      expect(suspendedUser.isSuspended()).toBe(true);
      expect(suspendedUser.isActive()).toBe(false);
    });

    it('should check if user needs email verification', () => {
      expect(user.needsEmailVerification()).toBe(false); // Email is verified

      const unverifiedUser = new User(
        user.id,
        user.email,
        user.passwordHash,
        user.role,
        UserStatus.PENDING_VERIFICATION,
        user.authMethod,
        user.profile,
        { ...user.security, emailVerified: false },
        user.metadata
      );
      expect(unverifiedUser.needsEmailVerification()).toBe(true);
    });
  });

  describe('Role Checks', () => {
    it('should check user roles correctly', () => {
      const studentUser = new User(
        'student-123' as any,
        new Email('student@university.edu'),
        'hash' as any,
        UserRole.STUDENT,
        UserStatus.ACTIVE,
        AuthMethod.PASSWORD,
        createValidUserData().profile,
        createValidUserData().security,
        createValidUserData().metadata
      );

      const teacherUser = new User(
        'teacher-123' as any,
        new Email('teacher@university.edu'),
        'hash' as any,
        UserRole.TEACHER,
        UserStatus.ACTIVE,
        AuthMethod.PASSWORD,
        createValidUserData().profile,
        createValidUserData().security,
        createValidUserData().metadata
      );

      const adminUser = new User(
        'admin-123' as any,
        new Email('admin@university.edu'),
        'hash' as any,
        UserRole.ADMIN,
        UserStatus.ACTIVE,
        AuthMethod.PASSWORD,
        createValidUserData().profile,
        createValidUserData().security,
        createValidUserData().metadata
      );

      expect(studentUser.isStudent()).toBe(true);
      expect(studentUser.isTeacher()).toBe(false);
      expect(studentUser.isAdmin()).toBe(false);

      expect(teacherUser.isTeacher()).toBe(true);
      expect(teacherUser.isStudent()).toBe(false);
      expect(teacherUser.isAdmin()).toBe(false);

      expect(adminUser.isAdmin()).toBe(true);
      expect(adminUser.isStudent()).toBe(false);
      expect(adminUser.isTeacher()).toBe(false);
    });

    it('should check role permissions', () => {
      const studentUser = new User(
        'student-123' as any,
        new Email('student@university.edu'),
        'hash' as any,
        UserRole.STUDENT,
        UserStatus.ACTIVE,
        AuthMethod.PASSWORD,
        createValidUserData().profile,
        createValidUserData().security,
        createValidUserData().metadata
      );

      expect(studentUser.hasRole(UserRole.STUDENT)).toBe(true);
      expect(studentUser.hasRole(UserRole.TEACHER)).toBe(false);
      expect(studentUser.hasAnyRole([UserRole.STUDENT, UserRole.TEACHER])).toBe(true);
      expect(studentUser.hasAnyRole([UserRole.TEACHER, UserRole.ADMIN])).toBe(false);
    });
  });

  describe('Authentication Checks', () => {
    it('should allow authentication for active users', () => {
      const userData = createValidUserData();
      const user = new User(
        userData.id,
        userData.email,
        userData.passwordHash,
        userData.role,
        UserStatus.ACTIVE,
        userData.authMethod,
        userData.profile,
        userData.security,
        userData.metadata
      );

      expect(user.canAuthenticate()).toBe(true);
    });

    it('should deny authentication for suspended users', () => {
      const userData = createValidUserData();
      const suspendedUser = new User(
        userData.id,
        userData.email,
        userData.passwordHash,
        userData.role,
        UserStatus.SUSPENDED,
        userData.authMethod,
        userData.profile,
        userData.security,
        userData.metadata
      );

      expect(suspendedUser.canAuthenticate()).toBe(false);
    });

    it('should deny authentication for inactive users', () => {
      const userData = createValidUserData();
      const inactiveUser = new User(
        userData.id,
        userData.email,
        userData.passwordHash,
        userData.role,
        UserStatus.INACTIVE,
        userData.authMethod,
        userData.profile,
        userData.security,
        userData.metadata
      );

      expect(inactiveUser.canAuthenticate()).toBe(false);
    });
  });

  describe('Permissions', () => {
    it('should return correct permissions for student role', () => {
      const studentUser = new User(
        'student-123' as any,
        new Email('student@university.edu'),
        'hash' as any,
        UserRole.STUDENT,
        UserStatus.ACTIVE,
        AuthMethod.PASSWORD,
        createValidUserData().profile,
        createValidUserData().security,
        createValidUserData().metadata
      );

      const permissions = studentUser.getPermissions();
      expect(permissions).toContain('read');
      expect(permissions).toContain('enroll_courses');
      expect(permissions).not.toContain('manage_users');
    });

    it('should return correct permissions for teacher role', () => {
      const teacherUser = new User(
        'teacher-123' as any,
        new Email('teacher@university.edu'),
        'hash' as any,
        UserRole.TEACHER,
        UserStatus.ACTIVE,
        AuthMethod.PASSWORD,
        createValidUserData().profile,
        createValidUserData().security,
        createValidUserData().metadata
      );

      const permissions = teacherUser.getPermissions();
      expect(permissions).toContain('read');
      expect(permissions).toContain('write');
      expect(permissions).toContain('manage_courses');
      expect(permissions).toContain('manage_students');
      expect(permissions).not.toContain('manage_users');
    });

    it('should return correct permissions for admin role', () => {
      const adminUser = new User(
        'admin-123' as any,
        new Email('admin@university.edu'),
        'hash' as any,
        UserRole.ADMIN,
        UserStatus.ACTIVE,
        AuthMethod.PASSWORD,
        createValidUserData().profile,
        createValidUserData().security,
        createValidUserData().metadata
      );

      const permissions = adminUser.getPermissions();
      expect(permissions).toContain('read');
      expect(permissions).toContain('write');
      expect(permissions).toContain('delete');
      expect(permissions).toContain('manage_users');
      expect(permissions).toContain('manage_system');
    });

    it('should check specific permissions', () => {
      const studentUser = new User(
        'student-123' as any,
        new Email('student@university.edu'),
        'hash' as any,
        UserRole.STUDENT,
        UserStatus.ACTIVE,
        AuthMethod.PASSWORD,
        createValidUserData().profile,
        createValidUserData().security,
        createValidUserData().metadata
      );

      expect(studentUser.hasPermission('read')).toBe(true);
      expect(studentUser.hasPermission('enroll_courses')).toBe(true);
      expect(studentUser.hasPermission('manage_users')).toBe(false);
    });
  });

  describe('Profile Management', () => {
    let user: User;

    beforeEach(() => {
      const userData = createValidUserData();
      user = new User(
        userData.id,
        userData.email,
        userData.passwordHash,
        userData.role,
        userData.status,
        userData.authMethod,
        userData.profile,
        userData.security,
        userData.metadata
      );
    });

    it('should get full name correctly', () => {
      expect(user.getFullName()).toBe('John Doe');
    });

    it('should get display name correctly', () => {
      expect(user.getDisplayName()).toBe('John Doe');
    });

    it('should use full name when display name is not set', () => {
      const userWithoutDisplayName = new User(
        user.id,
        user.email,
        user.passwordHash,
        user.role,
        user.status,
        user.authMethod,
        { ...user.profile, displayName: undefined },
        user.security,
        user.metadata
      );

      expect(userWithoutDisplayName.getDisplayName()).toBe('John Doe');
    });
  });

  describe('Account Age and Security', () => {
    it('should calculate account age correctly', () => {
      const pastDate = new Date('2023-01-01');
      const userData = createValidUserData();
      userData.metadata.createdAt = pastDate;

      const user = new User(
        userData.id,
        userData.email,
        userData.passwordHash,
        userData.role,
        userData.status,
        userData.authMethod,
        userData.profile,
        userData.security,
        userData.metadata
      );

      const ageInDays = user.getAccountAgeInDays();
      expect(ageInDays).toBeGreaterThan(365); // More than a year ago
    });

    it('should check if account is aged', () => {
      const recentDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      const userData = createValidUserData();
      userData.metadata.createdAt = recentDate;

      const user = new User(
        userData.id,
        userData.email,
        userData.passwordHash,
        userData.role,
        userData.status,
        userData.authMethod,
        userData.profile,
        userData.security,
        userData.metadata
      );

      expect(user.isAccountAged(30)).toBe(false); // Less than 30 days
      expect(user.isAccountAged(5)).toBe(true); // More than 5 days
    });

    it('should check if password needs change', () => {
      const oldPasswordChange = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 days ago
      const userData = createValidUserData();
      userData.security.lastPasswordChange = oldPasswordChange;

      const user = new User(
        userData.id,
        userData.email,
        userData.passwordHash,
        userData.role,
        userData.status,
        userData.authMethod,
        userData.profile,
        userData.security,
        userData.metadata
      );

      expect(user.needsPasswordChange(90)).toBe(true); // Over 90 days
      expect(user.needsPasswordChange(120)).toBe(false); // Under 120 days
    });
  });

  describe('Immutable Updates', () => {
    let user: User;

    beforeEach(() => {
      const userData = createValidUserData();
      user = new User(
        userData.id,
        userData.email,
        userData.passwordHash,
        userData.role,
        userData.status,
        userData.authMethod,
        userData.profile,
        userData.security,
        userData.metadata
      );
    });

    it('should create new instance with updated status', () => {
      const suspendedUser = user.withStatus(UserStatus.SUSPENDED);

      expect(user.status).toBe(UserStatus.ACTIVE);
      expect(suspendedUser.status).toBe(UserStatus.SUSPENDED);
      expect(suspendedUser.id).toBe(user.id); // Same ID
      expect(suspendedUser).not.toBe(user); // Different instance
    });

    it('should create new instance with updated profile', () => {
      const updatedUser = user.withProfile({ firstName: 'Jane' });

      expect(user.getFullName()).toBe('John Doe');
      expect(updatedUser.getFullName()).toBe('Jane Doe');
      expect(updatedUser).not.toBe(user);
    });

    it('should create new instance with updated password', () => {
      const newPasswordHash = 'new-hashed-password' as any;
      const updatedUser = user.withPassword(newPasswordHash);

      expect(updatedUser.passwordHash).toBe(newPasswordHash);
      expect(updatedUser).not.toBe(user);
    });
  });

  describe('Formatted Information', () => {
    let user: User;

    beforeEach(() => {
      const userData = createValidUserData();
      user = new User(
        userData.id,
        userData.email,
        userData.passwordHash,
        userData.role,
        userData.status,
        userData.authMethod,
        userData.profile,
        userData.security,
        userData.metadata
      );
    });

    it('should return formatted user info', () => {
      const info = user.getFormattedInfo();

      expect(info.id).toBe(user.id);
      expect(info.email).toBe('john.doe@university.edu');
      expect(info.name).toBe('John Doe');
      expect(info.role).toBe('Học viên'); // Vietnamese
      expect(info.status).toBe('Hoạt động'); // Vietnamese
      expect(info.isActive).toBe(true);
      expect(info.permissions).toContain('read');
      expect(info.permissions).toContain('enroll_courses');
      expect(info.accountAge).toBeGreaterThan(0);
    });
  });

  describe('Validation', () => {
    it('should validate user successfully', () => {
      const userData = createValidUserData();
      const user = new User(
        userData.id,
        userData.email,
        userData.passwordHash,
        userData.role,
        userData.status,
        userData.authMethod,
        userData.profile,
        userData.security,
        userData.metadata
      );

      const validation = user.validate();
      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should return validation warnings', () => {
      const userData = createValidUserData();
      userData.security.failedLoginAttempts = 10; // High number

      const user = new User(
        userData.id,
        userData.email,
        userData.passwordHash,
        userData.role,
        userData.status,
        userData.authMethod,
        userData.profile,
        userData.security,
        userData.metadata
      );

      const validation = user.validate();
      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Account has multiple failed login attempts');
    });
  });
});