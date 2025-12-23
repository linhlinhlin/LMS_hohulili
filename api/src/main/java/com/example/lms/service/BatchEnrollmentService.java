package com.example.lms.service;

import com.example.lms.application.port.FileParserPort;
import com.example.lms.dto.ImportFailure;
import com.example.lms.dto.ImportSuccess;
import com.example.lms.dto.ImportSummary;
import com.example.lms.entity.User;
import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.repository.EnrollmentRepository;
import com.example.lms.repository.LearningClassRepository;
import com.example.lms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BatchEnrollmentService {

    private final FileParserPort fileParser;
    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final LearningClassRepository classRepository;

    @Transactional
    public ImportSummary enrollFromStream(UUID classId, InputStream fileStream, boolean preview) {
        LearningClass learningClass = classRepository.findById(classId)
                .orElseThrow(() -> new RuntimeException("Lớp học không tồn tại ID: " + classId));

        // 1. Parse File
        FileParserPort.ParseResult parseResult = fileParser.parseStudentEmails(fileStream);
        Map<String, Integer> emailRowMap = parseResult.validEmailsWithRows();
        List<ImportFailure> failures = new ArrayList<>(parseResult.initialFailures());

        if (emailRowMap.isEmpty()) {
            return new ImportSummary(Collections.emptyList(), failures);
        }

        Set<String> validEmails = emailRowMap.keySet();

        // 2. Bulk Fetch Users
        List<User> existingUsers = userRepository.findByEmailIn(validEmails);
        Map<String, User> userMap = existingUsers.stream()
                .collect(Collectors.toMap(u -> u.getEmail().toLowerCase(), u -> u));

        // Identify emails NOT found or NOT students
        for (String email : validEmails) {
            User user = userMap.get(email.toLowerCase());
            int row = emailRowMap.getOrDefault(email, -1);
            if (user == null) {
                failures.add(new ImportFailure(email, "Không tìm thấy người dùng trong hệ thống", row));
            } else if (user.getRole() != User.Role.STUDENT) {
                failures.add(new ImportFailure(email, "Người dùng không phải là Học viên (Role: " + user.getRole() + ")", row));
            }
        }

        // 3. Bulk Check Existing Enrollments
        List<String> validUserEmails = existingUsers.stream()
                .filter(u -> u.getRole() == User.Role.STUDENT)
                .map(User::getEmail)
                .toList();

        Set<String> alreadyEnrolledEmails = new HashSet<>();
        if (!validUserEmails.isEmpty()) {
            alreadyEnrolledEmails = enrollmentRepository.findByLearningClassIdAndStudentEmailIn(classId, validUserEmails)
                    .stream()
                    .map(e -> e.getStudent().getEmail().toLowerCase())
                    .collect(Collectors.toSet());
        }

        // 4. Filter & Prepare Persistence
        List<Enrollment> toSave = new ArrayList<>();
        List<ImportSuccess> successes = new ArrayList<>();

        for (User user : existingUsers) {
            String email = user.getEmail().toLowerCase();
            int row = emailRowMap.getOrDefault(user.getEmail(), -1);
            if (user.getRole() == User.Role.STUDENT) {
                if (alreadyEnrolledEmails.contains(email)) {
                    failures.add(new ImportFailure(user.getEmail(), "Đã ghi danh vào lớp này rồi", row));
                } else {
                    if (!preview) {
                        Enrollment enrollment = Enrollment.builder()
                                .learningClass(learningClass)
                                .student(user)
                                .status(Enrollment.EnrollmentStatus.ACTIVE)
                                .build();
                        toSave.add(enrollment);
                    }
                    successes.add(new ImportSuccess(user.getEmail(), user.getFullName()));
                }
            }
        }

        // 5. Batch Save
        if (!preview && !toSave.isEmpty()) {
            enrollmentRepository.saveAll(toSave);
        }

        // Sort failures by row number for better UX
        failures.sort(Comparator.comparingInt(ImportFailure::rowNumber));

        return new ImportSummary(successes, failures);
    }
}
