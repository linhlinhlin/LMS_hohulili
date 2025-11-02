package com.example.lms.service;

import com.example.lms.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthenticationService {

    private final UserService userService;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthenticationResponse register(RegisterRequest request) {
        // Validate input
        if (userService.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username đã tồn tại");
        }
        
        if (userService.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email đã tồn tại");
        }

        // Create new user
        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(request.getPassword()) // Will be encoded in UserService
                .fullName(request.getFullName())
                .role(request.getRole() != null ? request.getRole() : User.Role.STUDENT)
                .enabled(true)
                .build();

        User savedUser = userService.createUser(user);

        // Generate tokens
        String jwtToken = jwtService.generateToken(savedUser);
        String refreshToken = jwtService.generateRefreshToken(savedUser);

        return AuthenticationResponse.builder()
                .accessToken(jwtToken)
                .refreshToken(refreshToken)
                .user(UserResponse.from(savedUser))
                .build();
    }

    public AuthenticationResponse authenticate(AuthenticationRequest request) {
        try {
            // Resolve user by username or email (client now sends 'email' field which may contain username or email)
            String identifier = request.getEmail();
            if (identifier == null || identifier.isBlank()) {
                throw new RuntimeException("Vui lòng cung cấp email hoặc username");
            }

            System.out.println("=== AUTH DEBUG ===");
            System.out.println("Login attempt with identifier: " + identifier);
            System.out.println("Password provided: " + (request.getPassword() != null ? "[PROVIDED]" : "[NULL]"));
            System.out.println("Password length: " + (request.getPassword() != null ? request.getPassword().length() : 0));

            // Try to find by username first
            var optionalUser = userService.findByUsername(identifier);
            System.out.println("Found by username: " + optionalUser.isPresent());

            // If not found by username, try email
            if (optionalUser.isEmpty()) {
                optionalUser = userService.findByEmail(identifier);
                System.out.println("Found by email: " + optionalUser.isPresent());
            }

            User user = optionalUser.orElseThrow(() -> new RuntimeException("User không tồn tại"));
            System.out.println("User found: " + user.getUsername() + ", email: " + user.getEmail());
            System.out.println("User enabled: " + user.isEnabled());
            System.out.println("User password hash: " + user.getPassword().substring(0, 20) + "...");

            // Check if user is enabled
            if (!user.isEnabled()) {
                System.out.println("User account is disabled");
                throw new RuntimeException("Tài khoản đã bị vô hiệu hóa");
            }

            // Authenticate using the actual username stored in the user entity
            System.out.println("Attempting authentication with username: " + user.getUsername());
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            user.getUsername(),
                            request.getPassword()
                    )
            );

            System.out.println("Authentication successful");

            System.out.println("Authentication successful");

            // Generate tokens
            String jwtToken = jwtService.generateToken(user);
            String refreshToken = jwtService.generateRefreshToken(user);

            return AuthenticationResponse.builder()
                    .accessToken(jwtToken)
                    .refreshToken(refreshToken)
                    .user(UserResponse.from(user))
                    .build();

        } catch (AuthenticationException e) {
            System.out.println("Authentication failed: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Thông tin đăng nhập không chính xác: " + e.getMessage());
        } catch (Exception e) {
            System.out.println("Unexpected error: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Thông tin đăng nhập không chính xác: " + e.getMessage());
        }
    }

    public AuthenticationResponse refreshToken(String refreshToken) {
        try {
            String username = jwtService.extractUsername(refreshToken);
            User user = userService.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("User không tồn tại"));

            if (jwtService.isTokenValid(refreshToken, user)) {
                String newAccessToken = jwtService.generateToken(user);
                
                return AuthenticationResponse.builder()
                        .accessToken(newAccessToken)
                        .refreshToken(refreshToken)
                        .user(UserResponse.from(user))
                        .build();
            } else {
                throw new RuntimeException("Refresh token không hợp lệ");
            }
        } catch (Exception e) {
            throw new RuntimeException("Refresh token không hợp lệ");
        }
    }

    public User updateProfile(User currentUser, com.example.lms.controller.AuthController.UpdateProfileRequest request) {
        if (request.getEmail() != null && !request.getEmail().equals(currentUser.getEmail())) {
            if (userService.existsByEmail(request.getEmail())) {
                throw new RuntimeException("Email đã được sử dụng bởi tài khoản khác");
            }
            currentUser.setEmail(request.getEmail());
        }
        
        if (request.getFullName() != null) {
            currentUser.setFullName(request.getFullName());
        }
        
        // Note: These fields (phone, dateOfBirth, address) are not yet defined in UpdateProfileRequest
        // They would need to be added to the request class if needed
        
        return userService.updateUser(currentUser);
    }

    public void changePassword(User currentUser, com.example.lms.controller.AuthController.ChangePasswordRequest request) {
        // Verify current password
        if (!userService.checkPassword(currentUser, request.getCurrentPassword())) {
            throw new RuntimeException("Mật khẩu hiện tại không đúng");
        }
        
        // Update password
        userService.changePassword(currentUser, request.getNewPassword());
    }

    // DTOs
    public static class RegisterRequest {
        private String username;
        private String email;
        private String password;
        private String fullName;
        private User.Role role;

        // Constructors
        public RegisterRequest() {}
        public RegisterRequest(String username, String email, String password, String fullName, User.Role role) {
            this.username = username;
            this.email = email;
            this.password = password;
            this.fullName = fullName;
            this.role = role;
        }

        // Getters and Setters
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }
        public User.Role getRole() { return role; }
        public void setRole(User.Role role) { this.role = role; }
    }

    public static class AuthenticationRequest {
        private String email;
        private String password;

        // Constructors
        public AuthenticationRequest() {}
        public AuthenticationRequest(String email, String password) {
            this.email = email;
            this.password = password;
        }

        // Getters and Setters
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    public static class AuthenticationResponse {
        private String accessToken;
        private String refreshToken;
        private UserResponse user;

        // Constructors
        public AuthenticationResponse() {}
        public AuthenticationResponse(String accessToken, String refreshToken, UserResponse user) {
            this.accessToken = accessToken;
            this.refreshToken = refreshToken;
            this.user = user;
        }

        // Builder pattern
        public static Builder builder() {
            return new Builder();
        }

        public static class Builder {
            private String accessToken;
            private String refreshToken;
            private UserResponse user;

            public Builder accessToken(String accessToken) {
                this.accessToken = accessToken;
                return this;
            }

            public Builder refreshToken(String refreshToken) {
                this.refreshToken = refreshToken;
                return this;
            }

            public Builder user(UserResponse user) {
                this.user = user;
                return this;
            }

            public AuthenticationResponse build() {
                return new AuthenticationResponse(accessToken, refreshToken, user);
            }
        }

        // Getters and Setters
        public String getAccessToken() { return accessToken; }
        public void setAccessToken(String accessToken) { this.accessToken = accessToken; }
        public String getRefreshToken() { return refreshToken; }
        public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }
        public UserResponse getUser() { return user; }
        public void setUser(UserResponse user) { this.user = user; }
    }

    public static class UserResponse {
        private String id;
        private String username;
        private String email;
        private String fullName;
        private String role;
        private boolean enabled;

        // Constructors
        public UserResponse() {}
        public UserResponse(String id, String username, String email, String fullName, String role, boolean enabled) {
            this.id = id;
            this.username = username;
            this.email = email;
            this.fullName = fullName;
            this.role = role;
            this.enabled = enabled;
        }

        public static UserResponse from(User user) {
            return new UserResponse(
                    user.getId().toString(),
                    user.getUsername(),
                    user.getEmail(),
                    user.getFullName(),
                    user.getRole().name(),
                    user.isEnabled()
            );
        }

        // Getters and Setters
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }
        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }
        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
    }


}