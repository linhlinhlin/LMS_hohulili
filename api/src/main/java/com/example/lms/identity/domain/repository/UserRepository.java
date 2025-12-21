package com.example.lms.identity.domain.repository;

import com.example.lms.identity.domain.model.Role;
import com.example.lms.identity.domain.model.User;
import com.example.lms.shared.domain.valueobject.UserId;

import java.util.List;
import java.util.Optional;

/**
 * Domain repository interface for User aggregate.
 * 
 * This is a PORT in Hexagonal Architecture terminology.
 * It defines the contract for user persistence operations using
 * DOMAIN MODELS ONLY - no JPA entities or infrastructure concerns.
 * 
 * Implementations (adapters) are in the infrastructure layer.
 */
public interface UserRepository {

    /**
     * Save a user to the repository.
     * 
     * @param user the domain user model to save
     * @return the saved user with ID populated (for new users)
     */
    User save(User user);

    /**
     * Find user by ID.
     * 
     * @param id the user ID value object
     * @return optional containing the user if found
     */
    Optional<User> findById(UserId id);

    /**
     * Find user by email.
     * 
     * @param email the email address
     * @return optional containing the user if found
     */
    Optional<User> findByEmail(String email);

    /**
     * Find user by username.
     * 
     * @param username the username
     * @return optional containing the user if found
     */
    Optional<User> findByUsername(String username);

    /**
     * Check if email already exists.
     * 
     * @param email the email to check
     * @return true if email exists
     */
    boolean existsByEmail(String email);

    /**
     * Check if username already exists.
     * 
     * @param username the username to check
     * @return true if username exists
     */
    boolean existsByUsername(String username);

    /**
     * Find all users with a specific role.
     * 
     * @param role the role to filter by
     * @return list of users with the role
     */
    List<User> findByRole(Role role);

    /**
     * Count users by role.
     * 
     * @param role the role to count
     * @return number of users with the role
     */
    long countByRole(Role role);
}
