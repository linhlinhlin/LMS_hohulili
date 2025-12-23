package com.example.lms.application.port;

import com.example.lms.dto.ImportFailure;
import java.io.InputStream;
import java.util.List;
import java.util.Set;

public interface FileParserPort {
    ParseResult parseStudentEmails(InputStream inputStream);
    
    record ParseResult(java.util.Map<String, Integer> validEmailsWithRows, List<ImportFailure> initialFailures) {}
}
