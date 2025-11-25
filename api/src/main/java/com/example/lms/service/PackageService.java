package com.example.lms.service;

import com.example.lms.entity.Package;
import com.example.lms.entity.Question;
import com.example.lms.entity.User;
import com.example.lms.repository.PackageRepository;
import com.example.lms.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class PackageService {

    private final PackageRepository packageRepository;
    private final QuestionRepository questionRepository;

    /**
     * Create a new package
     */
    public Package createPackage(
            User owner,
            String name,
            String description,
            String subject,
            Integer capacity,
            Package.Visibility visibility
    ) {
        // Validate name uniqueness
        if (packageRepository.existsByNameAndOwnerAndSubject(name, owner, subject)) {
            throw new RuntimeException("Gói với tên '" + name + "' đã tồn tại cho môn học này");
        }

        // Validate capacity
        if (capacity != null && capacity <= 0) {
            throw new RuntimeException("Giới hạn số câu hỏi phải lớn hơn 0");
        }

        Package packageEntity = Package.builder()
                .name(name)
                .description(description)
                .subject(subject)
                .owner(owner)
                .capacity(capacity)
                .visibility(visibility != null ? visibility : Package.Visibility.PRIVATE)
                .build();

        return packageRepository.save(packageEntity);
    }

    /**
     * Get package by ID
     */
    public Package getPackageById(UUID id) {
        return packageRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy gói câu hỏi"));
    }

    /**
     * Get package by ID with access check
     */
    public Package getPackageByIdWithAccessCheck(UUID id, User user) {
        Package packageEntity = getPackageById(id);
        
        if (!packageEntity.isAccessibleBy(user)) {
            throw new RuntimeException("Bạn không có quyền truy cập gói này");
        }
        
        return packageEntity;
    }

    /**
     * Get all packages accessible by user
     */
    public List<Package> getAccessiblePackages(User user) {
        return packageRepository.findAccessiblePackages(user);
    }

    public Page<Package> getAccessiblePackages(User user, Pageable pageable) {
        return packageRepository.findAccessiblePackages(user, pageable);
    }

    /**
     * Get packages owned by user
     */
    public List<Package> getPackagesByOwner(User owner) {
        return packageRepository.findByOwner(owner);
    }

    public Page<Package> getPackagesByOwner(User owner, Pageable pageable) {
        return packageRepository.findByOwner(owner, pageable);
    }

    /**
     * Get packages by subject
     */
    public List<Package> getPackagesBySubject(String subject) {
        return packageRepository.findBySubject(subject);
    }

    /**
     * Get packages with question counts
     */
    public List<Object[]> getAccessiblePackagesWithCount(User user) {
        return packageRepository.findAccessiblePackagesWithQuestionCount(user);
    }

    /**
     * Search packages by name
     */
    public List<Package> searchPackages(String keyword, User user) {
        return packageRepository.searchByNameAccessible(keyword, user);
    }

    /**
     * Update package
     */
    public Package updatePackage(
            UUID id,
            User user,
            String name,
            String description,
            String subject,
            Integer capacity,
            Package.Visibility visibility
    ) {
        Package packageEntity = getPackageById(id);

        // Check ownership
        if (!packageEntity.isOwnedBy(user)) {
            throw new RuntimeException("Bạn không có quyền chỉnh sửa gói này");
        }

        // Cannot edit default package
        if (packageEntity.isDefaultPackage()) {
            throw new RuntimeException("Không thể chỉnh sửa gói mặc định");
        }

        // Validate name uniqueness if name changed
        if (name != null && !name.equals(packageEntity.getName())) {
            if (packageRepository.existsByNameAndOwnerAndSubject(name, user, subject)) {
                throw new RuntimeException("Gói với tên '" + name + "' đã tồn tại");
            }
            packageEntity.setName(name);
        }

        if (description != null) {
            packageEntity.setDescription(description);
        }

        if (subject != null) {
            packageEntity.setSubject(subject);
        }

        if (capacity != null) {
            if (capacity <= 0) {
                throw new RuntimeException("Giới hạn số câu hỏi phải lớn hơn 0");
            }
            // Check if current question count exceeds new capacity
            int currentCount = packageEntity.getQuestionCount();
            if (currentCount > capacity) {
                throw new RuntimeException(
                    "Không thể đặt giới hạn " + capacity + " vì gói hiện có " + currentCount + " câu hỏi"
                );
            }
            packageEntity.setCapacity(capacity);
        }

        if (visibility != null) {
            packageEntity.setVisibility(visibility);
        }

        return packageRepository.save(packageEntity);
    }

    /**
     * Delete package
     */
    public void deletePackage(UUID id, User user, UUID reassignToPackageId) {
        Package packageEntity = getPackageById(id);

        // Check ownership
        if (!packageEntity.isOwnedBy(user)) {
            throw new RuntimeException("Bạn không có quyền xóa gói này");
        }

        // Cannot delete default package
        if (packageEntity.isDefaultPackage()) {
            throw new RuntimeException("Không thể xóa gói mặc định");
        }

        // Get questions in this package
        List<Question> questions = questionRepository.findByPackageEntity(packageEntity);

        if (!questions.isEmpty()) {
            // Reassign questions to another package
            Package targetPackage;
            
            if (reassignToPackageId != null) {
                targetPackage = getPackageByIdWithAccessCheck(reassignToPackageId, user);
            } else {
                // Default: move to "Chưa phân loại"
                targetPackage = packageRepository.findDefaultPackage()
                        .orElseThrow(() -> new RuntimeException("Không tìm thấy gói mặc định"));
            }

            // Check capacity
            if (!targetPackage.canAddQuestions(questions.size())) {
                throw new RuntimeException(
                    "Gói đích không đủ chỗ. Cần " + questions.size() + " chỗ trống."
                );
            }

            // Move questions
            for (Question question : questions) {
                question.setPackageEntity(targetPackage);
            }
            questionRepository.saveAll(questions);
        }

        // Delete package
        packageRepository.delete(packageEntity);
    }

    /**
     * Get default package
     */
    public Package getDefaultPackage() {
        return packageRepository.findDefaultPackage()
                .orElseThrow(() -> new RuntimeException("Không tìm thấy gói mặc định"));
    }

    /**
     * Get package statistics
     */
    public PackageStats getPackageStats(User user) {
        long totalPackages = packageRepository.countByOwner(user);
        long publicPackages = packageRepository.findByOwnerAndVisibility(
            user, Package.Visibility.PUBLIC
        ).size();
        long privatePackages = totalPackages - publicPackages;

        return new PackageStats(totalPackages, publicPackages, privatePackages);
    }

    /**
     * Get questions in a package
     */
    public List<Question> getQuestionsInPackage(UUID packageId, User user) {
        Package packageEntity = getPackageByIdWithAccessCheck(packageId, user);
        return questionRepository.findByPackageEntity(packageEntity);
    }

    /**
     * Move questions to a package
     */
    public void moveQuestionsToPackage(List<UUID> questionIds, UUID targetPackageId, User user) {
        if (questionIds == null || questionIds.isEmpty()) {
            throw new RuntimeException("Danh sách câu hỏi không được rỗng");
        }

        // Get target package and check access
        Package targetPackage = getPackageByIdWithAccessCheck(targetPackageId, user);

        // Check capacity
        if (!targetPackage.canAddQuestions(questionIds.size())) {
            throw new RuntimeException(
                "Gói đích không đủ chỗ. Cần " + questionIds.size() + " chỗ trống."
            );
        }

        // Get questions
        List<Question> questions = questionRepository.findAllById(questionIds);
        
        if (questions.size() != questionIds.size()) {
            throw new RuntimeException("Một số câu hỏi không tồn tại");
        }

        // Check ownership of all questions
        for (Question question : questions) {
            if (!question.getCreatedBy().getId().equals(user.getId())) {
                throw new RuntimeException("Bạn không có quyền di chuyển câu hỏi: " + question.getContent());
            }
        }

        // Move questions
        for (Question question : questions) {
            question.setPackageEntity(targetPackage);
        }
        
        questionRepository.saveAll(questions);
        System.out.println("✅ Moved " + questions.size() + " questions to package " + targetPackage.getName());
    }

    // Inner class for statistics
    @lombok.Data
    @lombok.AllArgsConstructor
    public static class PackageStats {
        private long totalPackages;
        private long publicPackages;
        private long privatePackages;
    }
}
