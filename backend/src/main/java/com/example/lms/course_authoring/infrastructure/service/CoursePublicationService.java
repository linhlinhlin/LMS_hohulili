package com.example.lms.course_authoring.infrastructure.service;

import com.example.lms.assessment.infrastructure.persistence.entity.AssignmentJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.QuestionJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.QuestionOptionJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.entity.QuizJpaEntity;
import com.example.lms.assessment.infrastructure.persistence.repository.AssignmentJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.QuestionJpaRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.QuizJpaRepositoryV3;
import com.example.lms.course_authoring.domain.model.Course;
import com.example.lms.course_authoring.domain.repository.CourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CoursePublicationJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.entity.LessonJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.ChapterJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CourseCategoryJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CoursePublicationJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.LessonJpaRepository;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import com.example.lms.learning_delivery.infrastructure.service.VideoAssetPresentationService;
import com.example.lms.shared.domain.model.ContentBlock;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class CoursePublicationService {

    private final CourseRepository courseRepository;
    private final ChapterJpaRepository chapterRepository;
    private final LessonJpaRepository lessonRepository;
    private final UserJpaRepository userJpaRepository;
    private final CourseCategoryJpaRepository courseCategoryJpaRepository;
    private final JpaEnrollmentRepository enrollmentJpaRepository;
    private final QuizJpaRepositoryV3 quizJpaRepository;
    private final AssignmentJpaRepository assignmentJpaRepository;
    private final QuestionJpaRepository questionJpaRepository;
    private final CoursePublicationJpaRepository publicationRepository;
    private final VideoAssetPresentationService videoAssetPresentationService;

    @Transactional
    public CoursePublicationJpaEntity publish(UUID courseId, UUID publishedById) {
        return publish(courseId, publishedById, null);
    }

    @Transactional
    public CoursePublicationJpaEntity publish(UUID courseId, UUID publishedById, String releaseNotes) {
        Course course = courseRepository.findByIdWithContent(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", courseId));

        int nextPublicationNumber = publicationRepository.findTopByCourseIdOrderByPublicationNumberDesc(courseId)
                .map(existing -> existing.getPublicationNumber() + 1)
                .orElse(1);

        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("detail", buildCourseDetail(course));
        snapshot.put("content", buildCourseContent(courseId));

        CoursePublicationJpaEntity publication = CoursePublicationJpaEntity.builder()
                .courseId(courseId)
                .publicationNumber(nextPublicationNumber)
                .contentVersion(course.getContentVersion())
                .snapshot(snapshot)
                .publishedAt(Instant.now())
                .publishedById(publishedById)
                .releaseNotes(releaseNotes)
                .build();

        return publicationRepository.save(publication);
    }

    @Transactional(readOnly = true)
    public Optional<ResolvedPublication> resolvePublication(UUID courseId, UUID studentId) {
        CoursePublicationJpaEntity latest = publicationRepository.findTopByCourseIdOrderByPublicationNumberDesc(courseId)
                .orElse(null);
        if (latest == null) {
            return Optional.empty();
        }

        if (studentId == null) {
            return Optional.of(new ResolvedPublication(latest, VersionMode.FOLLOW_LATEST, false));
        }

        var enrollment = enrollmentJpaRepository.findByStudentIdAndCourseId(studentId, courseId).orElse(null);
        if (enrollment == null || enrollment.getLearningClass() == null) {
            return Optional.of(new ResolvedPublication(latest, VersionMode.FOLLOW_LATEST, false));
        }

        var learningClass = enrollment.getLearningClass();
        VersionMode versionMode = learningClass.getVersionMode() == null
                ? VersionMode.PINNED
                : VersionMode.valueOf(learningClass.getVersionMode().name());

        if (versionMode == VersionMode.PINNED && learningClass.getCourseVersionId() != null) {
            CoursePublicationJpaEntity pinned = publicationRepository.findById(learningClass.getCourseVersionId())
                    .orElse(latest);
            boolean updateAvailable = latest.getId() != null && !latest.getId().equals(pinned.getId());
            return Optional.of(new ResolvedPublication(pinned, VersionMode.PINNED, updateAvailable));
        }

        return Optional.of(new ResolvedPublication(latest, VersionMode.FOLLOW_LATEST, false));
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getDraftContent(UUID courseId) {
        courseRepository.findByIdWithContent(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Khóa học", courseId));
        return buildCourseContent(courseId);
    }

    @Transactional(readOnly = true)
    public VersionInfo resolveVersionInfo(UUID courseId, UUID studentId) {
        Optional<ResolvedPublication> resolved = resolvePublication(courseId, studentId);
        if (resolved.isPresent()) {
            CoursePublicationJpaEntity publication = resolved.get().publication();
            return new VersionInfo(
                    publication.getId(),
                    publication.getPublicationNumber(),
                    publication.getContentVersion(),
                    publication.getPublishedAt(),
                    resolved.get().versionMode().name(),
                    resolved.get().updateAvailable()
            );
        }

        Course course = courseRepository.findById(courseId).orElse(null);
        if (course == null) {
            return null;
        }

        return new VersionInfo(
                null,
                null,
                course.getContentVersion(),
                course.getUpdatedAt(),
                "LEGACY",
                false
        );
    }

    @SuppressWarnings("unchecked")
    @Transactional(readOnly = true)
    public Map<String, Object> getPublishedDetail(UUID courseId, UUID studentId) {
        return resolvePublication(courseId, studentId)
                .map(resolved -> enrichPublishedDetail((Map<String, Object>) resolved.publication().getSnapshot().get("detail")))
                .orElse(null);
    }

    @SuppressWarnings("unchecked")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getPublishedContent(UUID courseId, UUID studentId) {
        return resolvePublication(courseId, studentId)
                .map(resolved -> enrichPublishedContent((List<Map<String, Object>>) resolved.publication().getSnapshot().get("content")))
                .orElse(null);
    }

    private Map<String, Object> buildCourseDetail(Course course) {
        Map<String, Object> detail = new LinkedHashMap<>();
        detail.put("id", course.getId().toString());
        detail.put("title", course.getTitle());
        detail.put("description", course.getDescription());
        detail.put("thumbnailUrl", course.getThumbnailUrl());
        detail.put("status", course.getStatus().name().toLowerCase(Locale.ROOT));
        detail.put("code", course.getCode() != null ? course.getCode().getValue() : null);
        detail.put("teacherId", course.getTeacherId() != null ? course.getTeacherId().toString() : null);
        detail.put("teacherName", resolveTeacherName(course.getTeacherId()));
        detail.put("enrolledCount", (int) enrollmentJpaRepository.countTotalByCourseIds(List.of(course.getId())));
        detail.put("deliveryMode", course.getDeliveryMode() != null ? course.getDeliveryMode().name() : "SELF_PACED");
        detail.put("categoryId", course.getCategoryId() != null ? course.getCategoryId().toString() : null);
        detail.put("categoryName", resolveCategoryName(course.getCategoryId()));
        detail.put("tags", course.getTags() != null ? new ArrayList<>(course.getTags()) : List.of());
        detail.put("welcomeMessage", course.getWelcomeMessage());
        detail.put("courseInformation", course.getCourseInformation());
        detail.put("benefits", course.getBenefits());
        detail.put("introVideoUrl", course.getIntroVideoAssetId() == null ? course.getIntroVideoUrl() : null);
        if (course.getIntroVideoAssetId() != null) {
            detail.put("introVideoAssetId", course.getIntroVideoAssetId().toString());
        }
        detail.put("credits", course.getCredits());
        detail.put("visibility", course.getVisibility() != null ? course.getVisibility().name() : "PUBLIC");
        detail.put("priceType", course.getPriceType() != null ? course.getPriceType().name() : "FREE");
        detail.put("price", course.getPrice());
        detail.put("salePrice", course.getSalePrice());
        detail.put("allowOfflineDownload", course.isAllowOfflineDownload());
        detail.put("contentVersion", course.getContentVersion());
        detail.put("chapterCount", course.getChapters() != null ? course.getChapters().size() : 0);
        detail.put("createdAt", course.getCreatedAt() != null ? course.getCreatedAt().toString() : null);
        detail.put("updatedAt", course.getUpdatedAt() != null ? course.getUpdatedAt().toString() : null);
        applyIntroVideoAssetView(detail, course.getIntroVideoAssetId());
        return detail;
    }

    private Map<String, Object> enrichPublishedDetail(Map<String, Object> detailSnapshot) {
        if (detailSnapshot == null || detailSnapshot.isEmpty()) {
            return detailSnapshot;
        }

        Map<String, Object> detail = new LinkedHashMap<>(detailSnapshot);
        applyIntroVideoAssetView(detail, parseVideoAssetId(detail.get("introVideoAssetId")));
        return detail;
    }

    private List<Map<String, Object>> buildCourseContent(UUID courseId) {
        var chapterEntities = chapterRepository.findByCourseIdOrderByOrderIndex(courseId);
        List<Map<String, Object>> chapters = new ArrayList<>();

        for (var chapter : chapterEntities) {
            var lessonEntities = lessonRepository.findByChapterIdOrderByOrderIndex(chapter.getId());
            Map<UUID, QuizJpaEntity> quizMap = loadQuizMap(lessonEntities.stream().map(LessonJpaEntity::getId).toList());
            Map<UUID, AssignmentJpaEntity> assignmentMap = loadAssignmentMap(lessonEntities.stream().map(LessonJpaEntity::getId).toList());

            List<Map<String, Object>> lessons = new ArrayList<>();
            for (var lesson : lessonEntities) {
                lessons.add(buildLessonMap(
                        lesson,
                        quizMap.get(lesson.getId()),
                        assignmentMap.get(lesson.getId())
                ));
            }

            Map<String, Object> chapterDto = new LinkedHashMap<>();
            chapterDto.put("id", chapter.getId().toString());
            chapterDto.put("title", chapter.getTitle());
            chapterDto.put("description", chapter.getDescription());
            chapterDto.put("orderIndex", chapter.getOrderIndex());
            chapterDto.put("lessons", lessons);
            chapters.add(chapterDto);
        }

        return chapters;
    }

    private Map<String, Object> buildLessonMap(
            LessonJpaEntity lesson,
            QuizJpaEntity quiz,
            AssignmentJpaEntity assignment
    ) {
        Map<String, Object> lessonDto = new LinkedHashMap<>();
        lessonDto.put("id", lesson.getId().toString());
        lessonDto.put("title", lesson.getTitle());
        lessonDto.put("description", lesson.getDescription());
        lessonDto.put("type", lesson.getType() != null ? lesson.getType().name() : "LECTURE");
        lessonDto.put("lessonType", lesson.getType() != null ? lesson.getType().name() : "LECTURE");
        lessonDto.put("durationMinutes", lesson.getDurationMinutes());
        lessonDto.put("orderIndex", lesson.getOrderIndex());
        lessonDto.put("isFree", lesson.getIsFree() != null && lesson.getIsFree());
        lessonDto.put("locked", false);
        lessonDto.put("quizType", quiz != null && quiz.getAssessmentType() != null ? quiz.getAssessmentType().name() : "ASSESSMENT");
        lessonDto.put("countsTowardCertificate", quiz != null && Boolean.TRUE.equals(quiz.getCountsTowardCertificate()));
        lessonDto.put("quizAllowOffline", quiz != null && quiz.getAssessmentType() == QuizJpaEntity.AssessmentType.PRACTICE);
        lessonDto.put("quizTimeLimit", quiz != null ? quiz.getTimeLimitMinutes() : null);
        lessonDto.put("quizPassingScore", quiz != null ? quiz.getPassingScore() : null);
        lessonDto.put("quizMaxScore", quiz != null ? quiz.getPassingScore() : null);
        lessonDto.put("quizMaxAttempts", quiz != null ? quiz.getMaxAttempts() : null);
        lessonDto.put("assignment", toAssignmentInfo(assignment));
        lessonDto.put("sections", buildSectionResponses(lesson));
        lessonDto.put("videoUrl", lesson.getVideoUrl());
        lessonDto.put("streamVideoUid", null);
        return lessonDto;
    }

    private List<Map<String, Object>> buildSectionResponses(LessonJpaEntity lesson) {
        List<Map<String, Object>> sections = new ArrayList<>();
        if (lesson.getContentBlocks() == null) {
            return sections;
        }

        long videoSectionCount = lesson.getContentBlocks().stream()
                .filter(block -> "VIDEO".equalsIgnoreCase(block.getType()))
                .count();
        Map<UUID, QuestionJpaEntity> questionMap = loadSectionQuizQuestionMap(lesson.getContentBlocks());
        Map<UUID, VideoAssetPresentationService.VideoAssetView> videoAssets = videoAssetPresentationService.getViews(
                extractVideoAssetIds(lesson.getContentBlocks().stream().map(ContentBlock::getData).toList())
        );

        for (ContentBlock block : lesson.getContentBlocks()) {
            Map<String, Object> data = block.getData() != null ? block.getData() : new HashMap<>();
            String streamVideoUid = resolveSectionStreamVideoUid(lesson, block, data, videoSectionCount);
            String videoType = resolveSectionVideoType(data, streamVideoUid);

            Map<String, Object> section = new LinkedHashMap<>();
            section.put("id", block.getId());
            section.put("title", data.get("title"));
            section.put("type", block.getType() != null ? block.getType().toUpperCase(Locale.ROOT) : "TEXT");
            section.put("content", data.get("content"));
            section.put("videoUrl", data.get("videoUrl"));
            section.put("videoType", videoType);
            section.put("streamVideoUid", streamVideoUid);
            section.put("fileUrl", data.get("fileUrl"));
            section.put("previewPdfUrl", data.get("previewPdfUrl"));
            section.put("previewStatus", data.get("previewStatus"));
            section.put("duration", asInteger(data.get("duration"), 0));
            section.put("orderIndex", asInteger(data.get("orderIndex"), 0));
            section.put("isRequired", asBoolean(data.get("isRequired"), false));
            section.put("completionThreshold", asDouble(data.get("completionThreshold"), 50.0));
            section.put("quizData", buildSectionQuizData(data, questionMap));
            applyVideoAssetView(section, data, resolveVideoAssetView(videoAssets, data.get("videoAssetId")), videoType);
            sections.add(section);
        }

        return sections;
    }

    private List<Map<String, Object>> enrichPublishedContent(List<Map<String, Object>> chaptersSnapshot) {
        if (chaptersSnapshot == null || chaptersSnapshot.isEmpty()) {
            return chaptersSnapshot;
        }

        Map<UUID, VideoAssetPresentationService.VideoAssetView> videoAssets = videoAssetPresentationService.getViews(
                extractVideoAssetIdsFromPublishedSnapshot(chaptersSnapshot)
        );

        List<Map<String, Object>> chapters = new ArrayList<>();
        for (Map<String, Object> chapter : chaptersSnapshot) {
            Map<String, Object> chapterCopy = new LinkedHashMap<>(chapter);
            List<Map<String, Object>> lessonCopies = new ArrayList<>();

            Object lessonsObj = chapter.get("lessons");
            if (lessonsObj instanceof List<?> lessons) {
                for (Object lessonObj : lessons) {
                    if (!(lessonObj instanceof Map<?, ?> rawLesson)) {
                        continue;
                    }

                    Map<String, Object> lessonCopy = new LinkedHashMap<>();
                    rawLesson.forEach((key, value) -> lessonCopy.put(String.valueOf(key), value));
                    List<Map<String, Object>> sectionCopies = new ArrayList<>();

                    Object sectionsObj = rawLesson.get("sections");
                    if (sectionsObj instanceof List<?> rawSections) {
                        for (Object sectionObj : rawSections) {
                            if (!(sectionObj instanceof Map<?, ?> rawSection)) {
                                continue;
                            }
                            Map<String, Object> sectionCopy = new LinkedHashMap<>();
                            rawSection.forEach((key, value) -> sectionCopy.put(String.valueOf(key), value));
                            applyVideoAssetView(
                                    sectionCopy,
                                    sectionCopy,
                                    resolveVideoAssetView(videoAssets, sectionCopy.get("videoAssetId")),
                                    sectionCopy.get("videoType") instanceof String type ? type : null
                            );
                            sectionCopies.add(sectionCopy);
                        }
                    }

                    lessonCopy.put("sections", sectionCopies);
                    lessonCopies.add(lessonCopy);
                }
            }

            chapterCopy.put("lessons", lessonCopies);
            chapters.add(chapterCopy);
        }

        return chapters;
    }

    private Map<UUID, QuizJpaEntity> loadQuizMap(List<UUID> lessonIds) {
        if (lessonIds == null || lessonIds.isEmpty()) {
            return Map.of();
        }

        List<QuizJpaEntity> quizzes = new ArrayList<>(quizJpaRepository.findByLessonIdIn(lessonIds));
        quizzes.sort(Comparator.comparing(
                QuizJpaEntity::getCreatedAt,
                Comparator.nullsLast(Comparator.naturalOrder())).reversed());

        Map<UUID, QuizJpaEntity> quizMap = new LinkedHashMap<>();
        for (QuizJpaEntity quiz : quizzes) {
            quizMap.putIfAbsent(quiz.getLessonId(), quiz);
        }
        return quizMap;
    }

    private Map<UUID, AssignmentJpaEntity> loadAssignmentMap(List<UUID> lessonIds) {
        if (lessonIds == null || lessonIds.isEmpty()) {
            return Map.of();
        }

        List<AssignmentJpaEntity> assignments = new ArrayList<>(assignmentJpaRepository.findByLessonIdIn(lessonIds));
        assignments.sort(Comparator.comparing(
                AssignmentJpaEntity::getUpdatedAt,
                Comparator.nullsLast(Comparator.naturalOrder())).reversed());

        Map<UUID, AssignmentJpaEntity> assignmentMap = new LinkedHashMap<>();
        for (AssignmentJpaEntity assignment : assignments) {
            if (assignment.getLessonId() != null) {
                assignmentMap.putIfAbsent(assignment.getLessonId(), assignment);
            }
        }
        return assignmentMap;
    }

    private Map<String, Object> toAssignmentInfo(AssignmentJpaEntity assignment) {
        if (assignment == null) {
            return null;
        }

        Map<String, Object> info = new LinkedHashMap<>();
        info.put("id", assignment.getId().toString());
        info.put("title", assignment.getTitle());
        info.put("description", assignment.getDescription());
        info.put("instructions", assignment.getInstructions());
        info.put("dueDate", assignment.getDueDate() != null ? assignment.getDueDate().toString() : null);
        info.put("maxScore", assignment.getMaxScore());
        info.put("status", assignment.getStatus() != null ? assignment.getStatus().name() : null);
        return info;
    }

    private Map<UUID, QuestionJpaEntity> loadSectionQuizQuestionMap(List<ContentBlock> blocks) {
        List<UUID> questionIds = new ArrayList<>();
        for (ContentBlock block : blocks) {
            if (!"QUIZ".equalsIgnoreCase(block.getType()) || block.getData() == null) {
                continue;
            }
            questionIds.addAll(extractSectionQuizQuestionIds(block.getData()));
        }

        if (questionIds.isEmpty()) {
            return Map.of();
        }

        Map<UUID, QuestionJpaEntity> questionMap = new LinkedHashMap<>();
        for (QuestionJpaEntity question : questionJpaRepository.findAllById(questionIds)) {
            questionMap.put(question.getId(), question);
        }
        return questionMap;
    }

    private Map<String, Object> buildSectionQuizData(Map<String, Object> blockData, Map<UUID, QuestionJpaEntity> questionMap) {
        Map<String, Object> quizData = asMap(blockData.get("quizData"));
        if (quizData == null) {
            return null;
        }

        Map<String, Object> normalized = new LinkedHashMap<>();
        String quizType = asString(quizData.get("quizType"), "ASSESSMENT");
        normalized.put("quizType", quizType);
        normalized.put("countsTowardCertificate", asBoolean(quizData.get("countsTowardCertificate"), false) && "EXAM".equalsIgnoreCase(quizType));
        normalized.put("allowOffline", "PRACTICE".equalsIgnoreCase(quizType));
        normalized.put("timeLimitMinutes", asInteger(quizData.get("timeLimitMinutes"), 30));
        normalized.put("passingScore", asInteger(quizData.get("passingScore"), 60));
        normalized.put("maxAttempts", asInteger(quizData.get("maxAttempts"), 1));
        normalized.put("shuffleQuestions", asBoolean(quizData.get("shuffleQuestions"), true));
        normalized.put("shuffleOptions", asBoolean(quizData.get("shuffleOptions"), true));
        normalized.put("showResultsImmediately", asBoolean(quizData.get("showResultsImmediately"), true));
        normalized.put("showCorrectAnswers", asBoolean(quizData.get("showCorrectAnswers"), true));

        List<UUID> questionIds = extractSectionQuizQuestionIds(blockData);
        if (!questionIds.isEmpty()) {
            List<Map<String, Object>> questions = new ArrayList<>();
            for (UUID questionId : questionIds) {
                QuestionJpaEntity question = questionMap.get(questionId);
                if (question == null) {
                    continue;
                }
                questions.add(buildSectionQuizQuestion(question));
            }
            normalized.put("questions", questions);
        }

        return normalized;
    }

    private List<UUID> extractVideoAssetIds(List<Map<String, Object>> blockDataList) {
        List<UUID> ids = new ArrayList<>();
        if (blockDataList == null) {
            return ids;
        }
        for (Map<String, Object> data : blockDataList) {
            UUID videoAssetId = parseVideoAssetId(data.get("videoAssetId"));
            if (videoAssetId != null) {
                ids.add(videoAssetId);
            }
        }
        return ids;
    }

    private List<UUID> extractVideoAssetIdsFromPublishedSnapshot(List<Map<String, Object>> chaptersSnapshot) {
        List<UUID> ids = new ArrayList<>();
        for (Map<String, Object> chapter : chaptersSnapshot) {
            Object lessonsObj = chapter.get("lessons");
            if (!(lessonsObj instanceof List<?> lessons)) {
                continue;
            }
            for (Object lessonObj : lessons) {
                if (!(lessonObj instanceof Map<?, ?> lesson)) {
                    continue;
                }
                Object sectionsObj = lesson.get("sections");
                if (!(sectionsObj instanceof List<?> sections)) {
                    continue;
                }
                for (Object sectionObj : sections) {
                    if (!(sectionObj instanceof Map<?, ?> section)) {
                        continue;
                    }
                    UUID id = parseVideoAssetId(section.get("videoAssetId"));
                    if (id != null) {
                        ids.add(id);
                    }
                }
            }
        }
        return ids;
    }

    private UUID parseVideoAssetId(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return UUID.fromString(value.toString());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private VideoAssetPresentationService.VideoAssetView resolveVideoAssetView(
            Map<UUID, VideoAssetPresentationService.VideoAssetView> videoAssets,
            Object rawVideoAssetId
    ) {
        UUID videoAssetId = parseVideoAssetId(rawVideoAssetId);
        return videoAssetId == null ? null : videoAssets.get(videoAssetId);
    }

    private void applyVideoAssetView(
            Map<String, Object> section,
            Map<String, Object> rawData,
            VideoAssetPresentationService.VideoAssetView assetView,
            String fallbackVideoType
    ) {
        UUID videoAssetId = parseVideoAssetId(rawData.get("videoAssetId"));
        if (videoAssetId != null) {
            section.put("videoAssetId", videoAssetId.toString());
        }
        if (assetView == null) {
            return;
        }

        section.put("videoAssetId", assetView.id().toString());
        section.put("videoProcessingStatus", assetView.status());
        section.put("videoSourceKind", assetView.videoSourceKind());
        section.put("availableOfflineProfiles", assetView.availableOfflineProfiles().stream()
                .map(profile -> {
                    Map<String, Object> option = new LinkedHashMap<>();
                    option.put("id", profile.id());
                    option.put("label", profile.label());
                    option.put("actualResolution", profile.actualResolution());
                    option.put("sizeBytes", profile.sizeBytes());
                    return option;
                })
                .toList());
        section.remove("videoUrl");
        section.remove("streamVideoUid");
        section.put("videoType", "ADAPTIVE_R2");
        if (fallbackVideoType != null && !"VIDEO".equalsIgnoreCase(fallbackVideoType)) {
            section.put("videoType", fallbackVideoType);
        }
    }

    private void applyIntroVideoAssetView(Map<String, Object> detail, UUID introVideoAssetId) {
        if (detail == null || introVideoAssetId == null) {
            return;
        }

        detail.put("introVideoAssetId", introVideoAssetId.toString());
        videoAssetPresentationService.getView(introVideoAssetId).ifPresent(view -> {
            detail.put("introVideoProcessingStatus", view.status());
            detail.put("introVideoSourceKind", view.videoSourceKind());
            detail.remove("introVideoStreamVideoUid");
            detail.put("introVideoAvailableOfflineProfiles", view.availableOfflineProfiles().stream()
                    .map(profile -> {
                        Map<String, Object> option = new LinkedHashMap<>();
                        option.put("id", profile.id());
                        option.put("label", profile.label());
                        option.put("actualResolution", profile.actualResolution());
                        option.put("sizeBytes", profile.sizeBytes());
                        return option;
                    })
                    .toList());
            detail.remove("introVideoUrl");
        });
    }

    private Map<String, Object> buildSectionQuizQuestion(QuestionJpaEntity question) {
        Map<String, Object> questionDto = new LinkedHashMap<>();
        questionDto.put("id", question.getId().toString());
        questionDto.put("content", extractTextFromBlocks(question.getContentBlocks()));
        questionDto.put("contentBlocks", question.getContentBlocks() != null ? question.getContentBlocks() : List.of());
        questionDto.put("questionType", question.getQuestionType() != null ? question.getQuestionType().name() : "SINGLE_CHOICE");
        questionDto.put("difficulty", question.getDifficulty() != null ? question.getDifficulty().name() : "MEDIUM");
        questionDto.put("correctOption", question.getCorrectOption());

        List<Map<String, Object>> options = new ArrayList<>();
        if (question.getOptions() != null) {
            for (QuestionOptionJpaEntity option : question.getOptions()) {
                Map<String, Object> optionDto = new LinkedHashMap<>();
                optionDto.put("optionKey", option.getKey());
                optionDto.put("content", extractTextFromBlocks(option.getContentBlocks()));
                optionDto.put("contentBlocks", option.getContentBlocks() != null ? option.getContentBlocks() : List.of());
                optionDto.put("displayOrder", option.getOrderIndex() != null ? option.getOrderIndex() : 0);
                options.add(optionDto);
            }
        }
        questionDto.put("options", options);
        return questionDto;
    }

    private String extractTextFromBlocks(List<ContentBlock> blocks) {
        if (blocks == null || blocks.isEmpty()) {
            return "";
        }

        StringBuilder builder = new StringBuilder();
        for (ContentBlock block : blocks) {
            if (builder.length() > 0) {
                builder.append('\n');
            }
            Map<String, Object> data = block.getData() != null ? block.getData() : Map.of();

            // Text content (html, text, content fields)
            String html = asString(data.get("html"), null);
            if (html != null && !html.isBlank()) {
                builder.append(html);
                continue;
            }
            String text = asString(data.get("text"), null);
            if (text != null && !text.isBlank()) {
                builder.append(text);
                continue;
            }
            String content = asString(data.get("content"), null);
            if (content != null && !content.isBlank()) {
                builder.append(content);
                continue;
            }

            // Non-text blocks: generate descriptive fallback from block type
            String blockType = block.getType() != null ? block.getType().toLowerCase(java.util.Locale.ROOT) : "";
            switch (blockType) {
                case "image" -> {
                    String caption = asString(data.get("caption"), asString(data.get("alt"), null));
                    builder.append(caption != null ? "[Hình ảnh] " + caption : "[Hình ảnh]");
                }
                case "video" -> {
                    String caption = asString(data.get("caption"), null);
                    builder.append(caption != null ? "[Video] " + caption : "[Video]");
                }
                case "math", "formula", "katex" -> builder.append("[Công thức]");
                case "table" -> builder.append("[Bảng]");
                case "code" -> builder.append("[Mã nguồn]");
                case "embed" -> builder.append("[Nhúng]");
                default -> { /* skip unknown empty blocks */ }
            }
        }
        return builder.toString();
    }

    private List<UUID> extractSectionQuizQuestionIds(Map<String, Object> blockData) {
        Map<String, Object> quizData = asMap(blockData.get("quizData"));
        if (quizData == null) {
            return List.of();
        }

        Object rawQuestionIds = quizData.get("questionIds");
        if (!(rawQuestionIds instanceof List<?> questionIdsList)) {
            return List.of();
        }

        List<UUID> questionIds = new ArrayList<>();
        for (Object rawQuestionId : questionIdsList) {
            if (rawQuestionId == null) {
                continue;
            }
            try {
                questionIds.add(UUID.fromString(String.valueOf(rawQuestionId)));
            } catch (IllegalArgumentException ignored) {
                // Skip malformed IDs in legacy data.
            }
        }
        return questionIds;
    }

    private String resolveSectionStreamVideoUid(
            LessonJpaEntity lesson,
            ContentBlock block,
            Map<String, Object> blockData,
            long videoSectionCount
    ) {
        String sectionStreamUid = asString(blockData.get("streamVideoUid"), null);
        if (sectionStreamUid != null) {
            return sectionStreamUid;
        }

        if ("VIDEO".equalsIgnoreCase(block.getType()) && videoSectionCount == 1) {
            return lesson.getStreamVideoUid();
        }

        return null;
    }

    private String resolveSectionVideoType(Map<String, Object> blockData, String streamVideoUid) {
        String explicitType = asString(blockData.get("videoType"), null);
        if (explicitType != null) {
            return explicitType;
        }
        return streamVideoUid != null ? "CLOUDFLARE" : null;
    }

    private String resolveTeacherName(UUID teacherId) {
        if (teacherId == null) {
            return "";
        }
        return userJpaRepository.findById(teacherId).map(user -> user.getFullName()).orElse("");
    }

    private String resolveCategoryName(UUID categoryId) {
        if (categoryId == null) {
            return null;
        }
        return courseCategoryJpaRepository.findById(categoryId).map(category -> category.getName()).orElse(null);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> asMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return null;
    }

    private String asString(Object value, String fallback) {
        if (value == null) {
            return fallback;
        }
        String text = String.valueOf(value);
        return text.isBlank() ? fallback : text;
    }

    private Integer asInteger(Object value, Integer fallback) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value != null) {
            try {
                return Integer.parseInt(String.valueOf(value));
            } catch (NumberFormatException ignored) {
                // fall through
            }
        }
        return fallback;
    }

    private boolean asBoolean(Object value, boolean fallback) {
        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value != null) {
            return Boolean.parseBoolean(String.valueOf(value));
        }
        return fallback;
    }

    private double asDouble(Object value, double fallback) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        if (value != null) {
            try {
                return Double.parseDouble(String.valueOf(value));
            } catch (NumberFormatException ignored) {
                // fall through
            }
        }
        return fallback;
    }

    public record ResolvedPublication(
            CoursePublicationJpaEntity publication,
            VersionMode versionMode,
            boolean updateAvailable
    ) {}

    public record VersionInfo(
            UUID publicationId,
            Integer publicationNumber,
            Integer contentVersion,
            Instant updatedAt,
            String versionMode,
            boolean updateAvailable
    ) {}

    public enum VersionMode {
        PINNED,
        FOLLOW_LATEST
    }
}
