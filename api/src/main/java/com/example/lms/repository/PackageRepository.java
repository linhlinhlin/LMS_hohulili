package com.example.lms.repository;

import com.example.lms.entity.Package;
import com.example.lms.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PackageRepository extends JpaRepository<Package, UUID> {

    // Find by owner
    List<Package> findByOwner(User owner);
    
    Page<Package> findByOwner(User owner, Pageable pageable);

    // Find by visibility
    List<Package> findByVisibility(Package.Visibility visibility);

    // Find by owner and visibility
    List<Package> findByOwnerAndVisibility(User owner, Package.Visibility visibility);

    // Find by subject
    List<Package> findBySubject(String subject);
    
    Page<Package> findBySubject(String subject, Pageable pageable);

    // Find by owner and subject
    List<Package> findByOwnerAndSubject(User owner, String subject);

    // Check if package name exists for owner and subject
    boolean existsByNameAndOwnerAndSubject(String name, User owner, String subject);

    // Find packages accessible by user (public or owned by user)
    @Query("SELECT p FROM Package p WHERE p.visibility = 'PUBLIC' OR p.owner = :user")
    List<Package> findAccessiblePackages(@Param("user") User user);

    @Query("SELECT p FROM Package p WHERE p.visibility = 'PUBLIC' OR p.owner = :user")
    Page<Package> findAccessiblePackages(@Param("user") User user, Pageable pageable);

    // Find packages with question count
    @Query("SELECT p, COUNT(q) FROM Package p LEFT JOIN p.questions q GROUP BY p")
    List<Object[]> findAllWithQuestionCount();

    @Query("SELECT p, COUNT(q) FROM Package p LEFT JOIN p.questions q WHERE p.owner = :user GROUP BY p")
    List<Object[]> findByOwnerWithQuestionCount(@Param("user") User user);

    @Query("SELECT p, COUNT(q) FROM Package p LEFT JOIN p.questions q " +
           "WHERE p.visibility = 'PUBLIC' OR p.owner = :user GROUP BY p")
    List<Object[]> findAccessiblePackagesWithQuestionCount(@Param("user") User user);

    // Search packages by name
    @Query("SELECT p FROM Package p WHERE LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Package> searchByName(@Param("keyword") String keyword);

    @Query("SELECT p FROM Package p WHERE LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "AND (p.visibility = 'PUBLIC' OR p.owner = :user)")
    List<Package> searchByNameAccessible(@Param("keyword") String keyword, @Param("user") User user);

    // Get default package
    @Query("SELECT p FROM Package p WHERE CAST(p.id AS string) = '00000000-0000-0000-0000-000000000001'")
    Optional<Package> findDefaultPackage();

    // Count packages by owner
    long countByOwner(User owner);

    // Count packages by visibility
    long countByVisibility(Package.Visibility visibility);
}
