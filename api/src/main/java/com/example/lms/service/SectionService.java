package com.example.lms.service;

import com.example.lms.dto.request.QuizEmbeddedRequest;
import com.example.lms.dto.request.SectionRequest;
import com.example.lms.entity.*;
import com.example.lms.repository.*;
import com.example.lms.entity.Quiz;
import com.example.lms.entity.Question;
import com.example.lms.entity.QuizQuestion;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SectionService {

    private final SectionRepository sectionRepository;
    private final LessonRepository lessonRepository;
    private final QuizRepository quizRepository;
    private final QuestionRepository questionRepository; // For validation if needed
    private final FileService fileService;

    @Transactional
    public Section createSection(SectionRequest request, MultipartFile file) {
        // 1. Tìm Lesson cha
        Lesson lesson = lessonRepository.findById(request.getLessonId())
                .orElseThrow(() -> new RuntimeException("Lesson not found"));

        // 2. Tính Order Index (Xếp cuối cùng)
        Integer maxOrder = sectionRepository.findMaxOrderIndexByLessonId(request.getLessonId());
        int newOrder = (maxOrder == null) ? 0 : maxOrder + 1;

        Section.SectionType type = Section.SectionType.valueOf(request.getType());

        // 3. Tạo Section
        Section section = Section.builder()
                .title(request.getTitle())
                .type(type)
                .lesson(lesson)
                .orderIndex(newOrder)
                .isRequired(request.getIsRequired())
                .build();
        
        // Save first to get ID
        section = sectionRepository.save(section);

        // 4. Xử lý dữ liệu theo Type
        handleSectionContent(section, request, file);

        // Initialize quizzes collection to prevent LazyInitializationException
        if (section.getQuizzes() != null) {
            section.getQuizzes().size();
            for (Quiz quiz : section.getQuizzes()) {
                 if(quiz.getQuizQuestions() != null) quiz.getQuizQuestions().size();
            }
        }
        return sectionRepository.save(section);
    }

    @Transactional
    public Section updateSection(UUID sectionId, SectionRequest request, MultipartFile file) {
        Section section = getSectionById(sectionId);
        
        section.setTitle(request.getTitle());
        Section.SectionType type = Section.SectionType.valueOf(request.getType());
        section.setType(type);
        section.setIsRequired(request.getIsRequired());

        // Update content/files/quiz
        handleSectionContent(section, request, file);

        // Initialize quizzes collection to prevent LazyInitializationException
        if (section.getQuizzes() != null) {
            section.getQuizzes().size();
            for (Quiz quiz : section.getQuizzes()) {
                 if(quiz.getQuizQuestions() != null) quiz.getQuizQuestions().size();
            }
        }
        return sectionRepository.save(section);
    }

    // Unified handler for content logic
    private void handleSectionContent(Section section, SectionRequest request, MultipartFile file) {
        switch (section.getType()) {
            case TEXT:
                section.setContent(request.getContent());
                section.setVideoUrl(null); 
                break;
            case VIDEO:
                section.setVideoUrl(request.getVideoUrl());
                // Update video metadata
                if (request.getVideoType() != null) section.setVideoType(request.getVideoType());
                if (request.getCfObjectKey() != null) section.setCfObjectKey(request.getCfObjectKey());
                
                // Fallback for legacy content field if coming from partial data, but usually clear content
                section.setContent(null); 
                break;
            case FILE:
                // If a NEW file is uploaded, replace the old one
                if (file != null && !file.isEmpty()) {
                     FileAttachment attachment = fileService.uploadFile(file, section.getId(), "SECTION_MATERIAL", FileAttachment.FileCategory.DOCUMENT);
                     section.setFileUrl("/api/v1/files/" + attachment.getId() + "/stream");
                }
                break;
            case QUIZ:
                if (request.getQuizData() != null) {
                    try {
                        handleQuizData(section, request.getQuizData());
                    } catch (Exception e) {
                        e.printStackTrace();
                        throw new RuntimeException("Error saving quiz data: " + e.getMessage(), e);
                    }
                }
                break;
            default:
                break;
        }
    }

    private void handleQuizData(Section section, QuizEmbeddedRequest data) {
        // Find existing quiz for this section or create new
        // Note: QuizRepository needs findBySectionId
        Quiz quiz = quizRepository.findBySectionId(section.getId())
                .orElse(Quiz.builder()
                        .section(section)
                        .type(Quiz.QuizType.LESSON_QUIZ) // Implicitly LESSON_QUIZ
                        .course(section.getLesson().getChapter().getCourse()) // Inherit course for reference
                        .createdBy(section.getLesson().getChapter().getCourse().getTeacher()) // Inherit teacher
                        .build());
        
        // Update Quiz Fields
        quiz.setTitle(section.getTitle()); // Sync title with Section
        quiz.setTimeLimitMinutes(data.getTimeLimitMinutes());
        quiz.setMaxAttempts(data.getMaxAttempts());
        quiz.setPassingScore(data.getPassingScore());
        quiz.setShuffleQuestions(data.getShuffleQuestions());
        quiz.setShuffleOptions(data.getShuffleOptions());
        quiz.setShowResultsImmediately(data.getShowResultsImmediately());
        
        // Save to ensure ID exists before adding questions (if new)
        // Actually, we can save at end.
        
        // Handle Questions
        // Clear existing questions? 
        // Logic: The request sends the full list of question IDs.
        // We should replace existing questions with this list.
        // Existing implementation: Quiz has OneToMany QuizQuestion.
        // We probably need a helper method in Quiz or here to reset questions.
        // Assuming `quiz.getQuestions()` is the relationship or we use helper `addQuestion`.
        // Ideally: quiz.setQuestions(...) but we need to map IDs to Question entities.
        
        // Reset questions
        quiz.getQuizQuestions().clear(); 
        
        if (data.getQuestionIds() != null && !data.getQuestionIds().isEmpty()) {
            List<Question> questions = questionRepository.findAllById(data.getQuestionIds());
            // Need to maintain order? findAllById doesn't guarantee order.
            // We should map ID -> Question to maintain order of request.
            Map<UUID, Question> qMap = questions.stream().collect(Collectors.toMap(q -> q.getId(), q -> q));
            
            int order = 0;
            for (UUID qId : data.getQuestionIds()) {
                if (qMap.containsKey(qId)) {
                    quiz.addQuestion(qMap.get(qId), ++order);
                }
            }
        }
        
        if (quiz.getStatus() == null) {
            quiz.setStatus(Quiz.Status.DRAFT);
        }
        
        quizRepository.save(quiz);
    }

    @Transactional
    public Section updateSectionVideo(UUID sectionId, String videoType, String videoUrl, String cfObjectKey) {
        Section section = getSectionById(sectionId);
        section.setType(Section.SectionType.VIDEO);
        if (videoType != null) {
            section.setVideoType(videoType);
        }
        if (videoUrl != null) {
            section.setVideoUrl(videoUrl);
        }
        if (cfObjectKey != null) {
            section.setCfObjectKey(cfObjectKey);
        }
        return sectionRepository.save(section);
    }

    public List<Section> getSectionsByLessonId(UUID lessonId) {
        List<Section> sections = sectionRepository.findByLessonIdOrderByOrderIndexAsc(lessonId);
        // Initialize quizzes
        for (Section section : sections) {
             if (section.getQuizzes() != null) {
                 section.getQuizzes().size();
                 for (Quiz quiz : section.getQuizzes()) {
                      if(quiz.getQuizQuestions() != null) quiz.getQuizQuestions().size();
                 }
             }
        }
        return sections;
    }
    
    public Section getSectionById(UUID sectionId) {
        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new RuntimeException("Section not found"));
        
        // Initialize quizzes
        if (section.getQuizzes() != null) {
            section.getQuizzes().size();
            for (Quiz quiz : section.getQuizzes()) {
                 if(quiz.getQuizQuestions() != null) quiz.getQuizQuestions().size();
            }
        }
        return section;
    }

    public void deleteSection(UUID sectionId) {
        sectionRepository.deleteById(sectionId);
    }

    @org.springframework.transaction.annotation.Transactional
    public void migrateLegacyFileUrls() {
        List<Section> sections = sectionRepository.findByType(Section.SectionType.FILE);
        for (Section section : sections) {
            String url = section.getFileUrl();
            if (url != null && url.contains("/download/")) {
                List<com.example.lms.entity.FileAttachment> attachments = fileService.getFilesByEntity(section.getId(), "SECTION_MATERIAL");
                if (!attachments.isEmpty()) {
                    com.example.lms.entity.FileAttachment mainAttachment = attachments.get(0);
                    section.setFileUrl("/api/v1/files/" + mainAttachment.getId() + "/stream");
                    sectionRepository.save(section);
                }
            }
        }
    }
}
