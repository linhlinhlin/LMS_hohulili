package com.example.lms.entity;

import jakarta.persistence.*;
import jakarta.persistence.Convert;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.Set;
import java.util.HashSet;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import java.util.Objects;

@Entity
@Table(name = "users")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "enrolledCourses", "authorities", "accountNonExpired", "accountNonLocked", "credentialsNonExpired"})
public class User implements UserDetails {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(unique = true, nullable = false, length = 50)
    @NotBlank(message = "Tên đăng nhập không được để trống")
    private String username;
    
    @Column(unique = true, nullable = false, length = 100)
    @Email(message = "Email phải đúng định dạng")
    @NotBlank(message = "Email không được để trống")
    private String email;
    
    @Column(nullable = false)
    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 6, message = "Mật khẩu phải có ít nhất 6 ký tự")
    @JsonIgnore
    private String password;
    
    @Column(nullable = false)
    @NotBlank(message = "Họ tên không được để trống")
    private String fullName;
    
    @Column(nullable = false)
    @Convert(converter = com.example.lms.entity.converter.UserRoleConverter.class)
    private Role role = Role.STUDENT;
    
    @Column(nullable = false)
    private Boolean enabled = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_status", length = 20)
    private AccountStatus accountStatus = AccountStatus.ACTIVE;

    @Column(name = "status_reason", length = 500)
    private String statusReason;
    
    @Column(nullable = false)
    private Instant createdAt = Instant.now();
    
    @Column
    private Instant updatedAt;
    
    // Many-to-Many relationship with courses (for student enrollments)
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "course_enrollments",
        joinColumns = @JoinColumn(name = "student_id"),
        inverseJoinColumns = @JoinColumn(name = "course_id")
    )
    @JsonIgnore
    private Set<Course> enrolledCourses = new HashSet<>();
    
    // Constructor for registration
    public User() {}

    public User(String username, String email, String password, String fullName, Role role) {
        this.username = username;
        this.email = email;
        this.password = password;
        this.fullName = fullName;
        this.role = role;
    }

    public User(UUID id, String username, String email, String password, String fullName, Role role, Boolean enabled, Instant createdAt, Instant updatedAt, Set<Course> enrolledCourses) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.password = password;
        this.fullName = fullName;
        this.role = role;
        this.enabled = enabled != null ? enabled : true;
        this.createdAt = createdAt != null ? createdAt : Instant.now();
        this.updatedAt = updatedAt;
        this.enrolledCourses = enrolledCourses != null ? enrolledCourses : new HashSet<>();
    }
    
    // UserDetails implementation
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // Lấy tên role từ enum, ví dụ: STUDENT, TEACHER, ADMIN
        String roleName = role != null ? role.name() : null;

        if (roleName == null) {
            // Không có role thì không có quyền nào
            return List.of();
        }

        // Spring Security mong đợi format "ROLE_STUDENT" khi bạn dùng hasRole("STUDENT")
        if (!roleName.startsWith("ROLE_")) {
            roleName = "ROLE_" + roleName;
        }
        return List.of(new SimpleGrantedAuthority(roleName));
    }
    
    @Override
    public String getUsername() {
        return username;
    }
    
    @Override
    public String getPassword() {
        return password;
    }
    
    @Override
    public boolean isAccountNonExpired() {
        return true;
    }
    
    @Override
    public boolean isAccountNonLocked() {
        return accountStatus == null || accountStatus != AccountStatus.BLOCKED;
    }
    
    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }
    
    @Override
    public boolean isEnabled() {
        return enabled;
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
    
    // Manual getters to ensure visibility
    public UUID getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getFullName() {
        return fullName;
    }

    public Role getRole() {
        return role;
    }
    
    public Boolean getEnabled() { return enabled; }
    public AccountStatus getAccountStatus() { return accountStatus; }
    public String getStatusReason() { return statusReason; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    
    // Manual Setters
    public void setPassword(String password) { this.password = password; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public void setEmail(String email) { this.email = email; }
    public void setRole(Role role) { this.role = role; }
    public void setUsername(String username) { this.username = username; }
    public void setId(UUID id) { this.id = id; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    public void setAccountStatus(AccountStatus accountStatus) { this.accountStatus = accountStatus; }
    public void setStatusReason(String statusReason) { this.statusReason = statusReason; }
    public void setEnrolledCourses(Set<Course> enrolledCourses) { this.enrolledCourses = enrolledCourses; }
    public Set<Course> getEnrolledCourses() { return enrolledCourses; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        User user = (User) o;
        return Objects.equals(id, user.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    // Manual Builder
    public static UserBuilder builder() { return new UserBuilder(); }
    public static class UserBuilder {
        private User u = new User();
        public UserBuilder id(UUID id) { u.setId(id); return this; }
        public UserBuilder username(String username) { u.setUsername(username); return this; }
        public UserBuilder email(String email) { u.setEmail(email); return this; }
        public UserBuilder password(String password) { u.setPassword(password); return this; }
        public UserBuilder fullName(String fullName) { u.setFullName(fullName); return this; }
        public UserBuilder role(Role role) { u.setRole(role); return this; }
        public UserBuilder enabled(Boolean enabled) { u.setEnabled(enabled); return this; }
        public UserBuilder createdAt(Instant createdAt) { u.setCreatedAt(createdAt); return this; }
        public UserBuilder updatedAt(Instant updatedAt) { u.setUpdatedAt(updatedAt); return this; }
        public UserBuilder enrolledCourses(Set<Course> enrolledCourses) { u.setEnrolledCourses(enrolledCourses); return this; }
        public User build() { return u; }
    }

    public enum AccountStatus {
        ACTIVE("Hoạt động"),
        BLOCKED("Bị khóa"),
        RESTRICTED("Hạn chế");
        
        private final String displayName;
        
        AccountStatus(String displayName) {
            this.displayName = displayName;
        }
        
        public String getDisplayName() {
            return displayName;
        }
    }

    public enum Role {
        ADMIN("Quản trị viên"),
        TEACHER("Giảng viên"), 
        STUDENT("Học viên");
        
        private final String displayName;
        
        Role(String displayName) {
            this.displayName = displayName;
        }
        
        public String getDisplayName() {
            return displayName;
        }
    }
}
