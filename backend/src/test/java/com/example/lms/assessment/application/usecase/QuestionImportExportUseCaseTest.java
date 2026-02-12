package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.domain.model.Question;
import com.example.lms.assessment.domain.repository.QuestionRepository;
import com.example.lms.shared.domain.model.ContentBlock;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for QuestionImportExportUseCase - CSV export/import flow.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("QuestionImportExportUseCase Tests")
class QuestionImportExportUseCaseTest {

    @Mock
    private QuestionRepository questionRepository;

    @InjectMocks
    private QuestionImportExportUseCase useCase;

    private UUID bankId;
    private UUID createdBy;

    @BeforeEach
    void setUp() {
        bankId = UUID.randomUUID();
        createdBy = UUID.randomUUID();
    }

    // ============================================================
    // Helpers
    // ============================================================

    private Question buildQuestion(String content, String questionType,
                                   String difficulty, String correctOption,
                                   String tags, List<String> optionContents) {
        ContentBlock textBlock = ContentBlock.create("TEXT", Map.of("text", content));

        List<Question.QuestionOption> options = new ArrayList<>();
        if (optionContents != null) {
            String[] keys = {"A", "B", "C", "D"};
            for (int i = 0; i < optionContents.size(); i++) {
                ContentBlock optBlock = ContentBlock.create("text", Map.of("text", optionContents.get(i)));
                options.add(Question.QuestionOption.create(
                        i < keys.length ? keys[i] : String.valueOf(i),
                        List.of(optBlock), i));
            }
        }

        return Question.builder()
                .id(UUID.randomUUID())
                .packageId(bankId)
                .createdBy(createdBy)
                .questionType(Question.QuestionType.valueOf(questionType))
                .difficulty(Question.Difficulty.valueOf(difficulty))
                .status(Question.Status.ACTIVE)
                .contentBlocks(List.of(textBlock))
                .options(options)
                .correctOption(correctOption)
                .tags(tags)
                .build();
    }

    private MockMultipartFile buildCsvFile(String csvContent) {
        return new MockMultipartFile("file", "test.csv", "text/csv",
                csvContent.getBytes(StandardCharsets.UTF_8));
    }

    // ============================================================
    // Export Tests
    // ============================================================

    @Test
    @DisplayName("exportBankToCsv: empty bank returns header only")
    void exportBankToCsv_emptyBank_returnsHeaderOnly() {
        when(questionRepository.findByBankId(bankId)).thenReturn(List.of());

        byte[] result = useCase.exportBankToCsv(bankId);
        String csv = new String(result, StandardCharsets.UTF_8);

        assertThat(csv).startsWith("questionType,difficulty,content,option1,option2,option3,option4,correctOption,tags");
        // Only one line (the header)
        String[] lines = csv.trim().split("\n");
        assertThat(lines).hasSize(1);
    }

    @Test
    @DisplayName("exportBankToCsv: with questions returns CSV with data rows")
    void exportBankToCsv_withQuestions_returnsCsv() {
        Question q1 = buildQuestion("What is 2+2?", "SINGLE_CHOICE", "EASY", "0", "math",
                List.of("3", "4", "5", "6"));
        Question q2 = buildQuestion("Capital of France?", "SINGLE_CHOICE", "MEDIUM", "1", "geography",
                List.of("London", "Paris", "Berlin", "Rome"));

        when(questionRepository.findByBankId(bankId)).thenReturn(List.of(q1, q2));

        byte[] result = useCase.exportBankToCsv(bankId);
        String csv = new String(result, StandardCharsets.UTF_8);
        String[] lines = csv.trim().split("\n");

        assertThat(lines).hasSize(3); // header + 2 data rows
        assertThat(lines[0]).isEqualTo("questionType,difficulty,content,option1,option2,option3,option4,correctOption,tags");
        assertThat(lines[1]).contains("What is 2+2?");
        assertThat(lines[1]).contains("SINGLE_CHOICE");
        assertThat(lines[1]).contains("EASY");
        assertThat(lines[2]).contains("Capital of France?");
    }

    @Test
    @DisplayName("exportBankToCsv: escapes commas in content")
    void exportBankToCsv_escapesCommasInContent() {
        Question q = buildQuestion("Choose A, B, or C", "SINGLE_CHOICE", "MEDIUM", "0", null,
                List.of("A", "B", "C"));

        when(questionRepository.findByBankId(bankId)).thenReturn(List.of(q));

        byte[] result = useCase.exportBankToCsv(bankId);
        String csv = new String(result, StandardCharsets.UTF_8);

        // Content with commas should be quoted
        assertThat(csv).contains("\"Choose A, B, or C\"");
    }

    // ============================================================
    // Import Tests
    // ============================================================

    @Test
    @DisplayName("importFromCsv: empty file returns zero imported")
    void importFromCsv_emptyFile_returnsZeroImported() {
        MockMultipartFile file = buildCsvFile("");

        QuestionImportExportUseCase.ImportResult result = useCase.importFromCsv(bankId, createdBy, file);

        assertThat(result.imported()).isZero();
        assertThat(result.failed()).isZero();
        verify(questionRepository, never()).save(any());
    }

    @Test
    @DisplayName("importFromCsv: valid lines imports all")
    void importFromCsv_validLines_importsAll() {
        String csv = "questionType,difficulty,content,option1,option2,option3,option4,correctOption,tags\n"
                + "SINGLE_CHOICE,EASY,What is 2+2?,3,4,5,6,1,math\n"
                + "SINGLE_CHOICE,MEDIUM,Capital of France?,London,Paris,Berlin,Rome,1,geography\n";
        MockMultipartFile file = buildCsvFile(csv);
        when(questionRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        QuestionImportExportUseCase.ImportResult result = useCase.importFromCsv(bankId, createdBy, file);

        assertThat(result.imported()).isEqualTo(2);
        assertThat(result.failed()).isZero();
        assertThat(result.errors()).isEmpty();
        verify(questionRepository, times(2)).save(any());
    }

    @Test
    @DisplayName("importFromCsv: invalid line reports error")
    void importFromCsv_invalidLine_reportsError() {
        // Mix of valid and invalid lines
        String csv = "questionType,difficulty,content,option1,option2,option3,option4,correctOption,tags\n"
                + "SINGLE_CHOICE,EASY,Valid question,A,B,C,D,0,tag1\n"
                + "SINGLE_CHOICE,EASY\n"; // too few columns
        MockMultipartFile file = buildCsvFile(csv);
        when(questionRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        QuestionImportExportUseCase.ImportResult result = useCase.importFromCsv(bankId, createdBy, file);

        assertThat(result.imported()).isEqualTo(1);
        assertThat(result.failed()).isEqualTo(1);
        assertThat(result.errors()).hasSize(1);
        assertThat(result.errors().get(0)).contains("Line 3");
    }

    @Test
    @DisplayName("importFromCsv: blank content skips line")
    void importFromCsv_blankContent_skipsLine() {
        String csv = "questionType,difficulty,content,option1,option2,option3,option4,correctOption,tags\n"
                + "SINGLE_CHOICE,EASY, ,A,B,C,D,0,tag1\n"; // blank content (whitespace only)
        MockMultipartFile file = buildCsvFile(csv);

        QuestionImportExportUseCase.ImportResult result = useCase.importFromCsv(bankId, createdBy, file);

        assertThat(result.imported()).isZero();
        assertThat(result.failed()).isEqualTo(1);
        assertThat(result.errors()).anyMatch(e -> e.contains("Empty content"));
        verify(questionRepository, never()).save(any());
    }

    @Test
    @DisplayName("importFromCsv: parses options correctly")
    void importFromCsv_parsesOptionsCorrectly() {
        String csv = "questionType,difficulty,content,option1,option2,option3,option4,correctOption,tags\n"
                + "SINGLE_CHOICE,EASY,Test question,Alpha,Beta,Gamma,Delta,2,test\n";
        MockMultipartFile file = buildCsvFile(csv);
        when(questionRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        QuestionImportExportUseCase.ImportResult result = useCase.importFromCsv(bankId, createdBy, file);

        assertThat(result.imported()).isEqualTo(1);
        assertThat(result.failed()).isZero();
        verify(questionRepository).save(argThat(q -> {
            Question question = (Question) q;
            List<Question.QuestionOption> options = question.getOptions();
            return options != null && options.size() == 4;
        }));
    }

    @Test
    @DisplayName("importFromCsv: parses tags correctly")
    void importFromCsv_parsesTagsCorrectly() {
        String csv = "questionType,difficulty,content,option1,option2,option3,option4,correctOption,tags\n"
                + "SINGLE_CHOICE,EASY,Tag test,A,B,C,D,0,math;science;history\n";
        MockMultipartFile file = buildCsvFile(csv);
        when(questionRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        QuestionImportExportUseCase.ImportResult result = useCase.importFromCsv(bankId, createdBy, file);

        assertThat(result.imported()).isEqualTo(1);
        verify(questionRepository).save(argThat(q -> {
            Question question = (Question) q;
            return question.getTags() != null;
        }));
    }

    @Test
    @DisplayName("importFromCsv: too few columns reports error")
    void importFromCsv_tooFewColumns_reportsError() {
        String csv = "questionType,difficulty,content,option1,option2,option3,option4,correctOption,tags\n"
                + "SINGLE_CHOICE,EASY\n"  // only 2 columns
                + "SINGLE_CHOICE\n";       // only 1 column
        MockMultipartFile file = buildCsvFile(csv);

        QuestionImportExportUseCase.ImportResult result = useCase.importFromCsv(bankId, createdBy, file);

        assertThat(result.imported()).isZero();
        assertThat(result.failed()).isEqualTo(2);
        assertThat(result.errors()).hasSize(2);
        assertThat(result.errors().get(0)).contains("Not enough columns");
        assertThat(result.errors().get(1)).contains("Not enough columns");
        verify(questionRepository, never()).save(any());
    }
}
