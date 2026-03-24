package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.application.dto.CourseDTOs;
import com.example.lms.course_authoring.domain.repository.ChapterRepositoryPort;
import com.example.lms.course_authoring.domain.repository.LessonRepositoryPort;
import com.example.lms.shared.domain.model.ContentBlock;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * AI Course Generation orchestrates course/chapter/lesson/section creation
 * from structured JSON pushed by Wiii AI.
 *
 * <p>Transaction strategy: course shell in one transaction, each chapter
 * in its own transaction. If chapter 3 fails, chapters 1-2 are safe.
 */
@Service
public class GenerateCourseFromAiUseCase {

    private static final Logger log = LoggerFactory.getLogger(GenerateCourseFromAiUseCase.class);

    private final CourseAuthoringUseCase courseAuthoringUseCase;
    private final ChapterRepositoryPort chapterRepository;
    private final CreateChapterUseCaseV3 createChapterUseCase;
    private final CreateLessonUseCaseV3 createLessonUseCase;
    private final LessonRepositoryPort lessonRepository;

    public GenerateCourseFromAiUseCase(
            CourseAuthoringUseCase courseAuthoringUseCase,
            ChapterRepositoryPort chapterRepository,
            CreateChapterUseCaseV3 createChapterUseCase,
            CreateLessonUseCaseV3 createLessonUseCase,
            LessonRepositoryPort lessonRepository) {
        this.courseAuthoringUseCase = courseAuthoringUseCase;
        this.chapterRepository = chapterRepository;
        this.createChapterUseCase = createChapterUseCase;
        this.createLessonUseCase = createLessonUseCase;
        this.lessonRepository = lessonRepository;
    }

    public record CourseShellRequest(
            @NotNull UUID teacherId,
            @NotNull UUID categoryId,
            @NotBlank @Size(max = 255) String title,
            @Size(max = 5000) String description,
            String deliveryMode,
            String priceType
    ) {}

    public record CourseShellResponse(UUID courseId) {}

    public record ChapterContentRequest(
            @NotNull UUID teacherId,
            @NotBlank @Size(max = 255) String title,
            @Size(max = 5000) String description,
            @Min(0) int orderIndex,
            @NotEmpty @Size(max = 50) List<@Valid LessonRequest> lessons
    ) {}

    public record LessonRequest(
            @NotBlank @Size(max = 255) String title,
            @Size(max = 2000) String description,
            String type,
            @Min(0) int orderIndex,
            @Min(1) @Max(480) Integer durationMinutes,
            Boolean isFree,
            List<@Valid SectionRequest> sections
    ) {}

    public record SectionRequest(
            @NotBlank @Size(max = 500) String title,
            String type,
            @Size(max = 512000) String content,
            @Min(0) int orderIndex
    ) {}

    public record ChapterGenerationResponse(
            UUID chapterId,
            int orderIndex,
            int lessonCount,
            int sectionCount,
            String status
    ) {}

    @Transactional
    public CourseShellResponse createCourseShell(CourseShellRequest req) {
        log.info(
                "AI course generation: creating shell for teacher={}, title='{}'",
                req.teacherId(),
                req.title()
        );

        var courseReq = new CourseDTOs.CreateCourseRequest();
        courseReq.setCategoryId(req.categoryId());
        courseReq.setTitle(req.title());
        courseReq.setDescription(req.description() != null ? req.description() : "");
        courseReq.setDeliveryMode(req.deliveryMode() != null ? req.deliveryMode() : "SELF_PACED");
        courseReq.setPriceType(req.priceType() != null ? req.priceType() : "FREE");

        var draft = courseAuthoringUseCase.createCourse(courseReq, req.teacherId());
        log.info("AI course generation: shell created courseId={}", draft.getId());

        return new CourseShellResponse(draft.getId());
    }

    @Transactional
    public ChapterGenerationResponse pushChapter(UUID courseId, ChapterContentRequest req) {
        log.info(
                "AI course generation: pushing chapter '{}' (index={}) to course={}",
                req.title(),
                req.orderIndex(),
                courseId
        );

        Optional<UUID> existingChapterId = chapterRepository.findIdByCourseIdAndOrderIndex(
                courseId,
                req.orderIndex()
        );
        if (existingChapterId.isPresent()) {
            int lessonCount = req.lessons().size();
            int sectionCount = countSections(req.lessons());
            log.info(
                    "AI course generation: chapter index={} already exists for course={}, returning existing chapterId={}",
                    req.orderIndex(),
                    courseId,
                    existingChapterId.get()
            );
            return new ChapterGenerationResponse(
                    existingChapterId.get(),
                    req.orderIndex(),
                    lessonCount,
                    sectionCount,
                    "ALREADY_EXISTS"
            );
        }

        UUID chapterId = createChapterUseCase.execute(
                new CreateChapterUseCaseV3.CreateChapterCommand(
                        courseId,
                        req.title(),
                        req.description(),
                        req.orderIndex(),
                        req.teacherId(),
                        false
                )
        );

        int lessonCount = 0;
        int sectionCount = 0;

        for (var lessonReq : req.lessons()) {
            UUID lessonId = createLessonUseCase.execute(
                    new CreateLessonUseCaseV3.CreateLessonCommand(
                            chapterId,
                            lessonReq.title(),
                            lessonReq.description(),
                            lessonReq.type() != null ? lessonReq.type() : "LECTURE",
                            null,
                            lessonReq.durationMinutes(),
                            lessonReq.orderIndex(),
                            lessonReq.isFree()
                    )
            );
            lessonCount++;

            if (lessonReq.sections() != null && !lessonReq.sections().isEmpty()) {
                List<ContentBlock> blocks = new ArrayList<>();
                for (var sectionReq : lessonReq.sections()) {
                    blocks.add(
                            ContentBlock.builder()
                                    .id(UUID.randomUUID().toString())
                                    .type(resolveBlockType(sectionReq.type()))
                                    .data(buildBlockData(sectionReq))
                                    .build()
                    );
                    sectionCount++;
                }
                lessonRepository.saveContentBlocks(lessonId, blocks);
            } else {
                log.debug("No sections for lesson '{}'", lessonReq.title());
            }
        }

        log.info(
                "AI course generation: chapter '{}' -> {} lessons, {} sections",
                req.title(),
                lessonCount,
                sectionCount
        );

        return new ChapterGenerationResponse(
                chapterId,
                req.orderIndex(),
                lessonCount,
                sectionCount,
                "SUCCESS"
        );
    }

    private int countSections(List<LessonRequest> lessons) {
        return lessons.stream()
                .map(LessonRequest::sections)
                .filter(Objects::nonNull)
                .mapToInt(List::size)
                .sum();
    }

    private String resolveBlockType(String sectionType) {
        if (sectionType == null) {
            return "TEXT";
        }
        return switch (sectionType) {
            case "QUIZ_PLACEHOLDER" -> "TEXT";
            case "TEXT", "VIDEO", "FILE", "EMBED" -> sectionType;
            default -> "TEXT";
        };
    }

    private Map<String, Object> buildBlockData(SectionRequest section) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("title", section.title());
        data.put("orderIndex", section.orderIndex());

        if ("QUIZ_PLACEHOLDER".equals(section.type())) {
            String message = section.content() != null && !section.content().isBlank()
                    ? section.content().trim()
                    : "Vi tri de xuat cho bai kiem tra cua bai hoc nay.";
            String ctaLabel = "Giang vien tao quiz rieng tai day";

            data.put("kind", "QUIZ_PLACEHOLDER");
            data.put("isQuizPlaceholder", true);
            data.put("message", message);
            data.put("ctaLabel", ctaLabel);
            data.put("content", buildQuizPlaceholderContent(section.title(), message, ctaLabel));
            return data;
        }

        if (section.content() != null) {
            data.put("content", section.content());
        }

        return data;
    }

    private String buildQuizPlaceholderContent(String title, String message, String ctaLabel) {
        return "<div class=\"quiz-placeholder\">"
                + "<p><strong>" + escapeHtml(title) + "</strong></p>"
                + "<p>" + escapeHtml(message) + "</p>"
                + "<p><em>" + escapeHtml(ctaLabel) + "</em></p>"
                + "</div>";
    }

    private String escapeHtml(String value) {
        if (value == null) {
            return "";
        }

        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
