package com.example.lms.shared.application.usecase;

import com.example.lms.shared.domain.model.TeacherBankAccount;
import com.example.lms.shared.domain.repository.TeacherBankAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ManageTeacherBankAccountUseCase {

    private final TeacherBankAccountRepository repo;

    @Transactional(readOnly = true)
    public List<TeacherBankAccount> listAccounts(UUID teacherId) {
        return repo.findByTeacherId(teacherId);
    }

    @Transactional
    public TeacherBankAccount addAccount(UUID teacherId, String bankCode,
                                          String accountNumber, String accountName) {
        List<TeacherBankAccount> existing = repo.findByTeacherId(teacherId);
        boolean isFirst = existing.isEmpty();
        var account = TeacherBankAccount.create(teacherId, bankCode.toUpperCase().trim(),
                accountNumber.trim(), accountName.trim().toUpperCase(), isFirst);
        return repo.save(account);
    }

    @Transactional
    public TeacherBankAccount setDefault(UUID teacherId, UUID accountId) {
        var account = repo.findById(accountId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tài khoản không tồn tại"));
        if (!account.getTeacherId().equals(teacherId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền truy cập");
        }
        repo.clearDefaultForTeacher(teacherId);
        account.setAsDefault();
        return repo.save(account);
    }

    @Transactional
    public void deleteAccount(UUID teacherId, UUID accountId) {
        var account = repo.findById(accountId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tài khoản không tồn tại"));
        if (!account.getTeacherId().equals(teacherId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền truy cập");
        }
        repo.delete(accountId);

        // If deleted was default, promote the next one
        if (account.isDefault()) {
            repo.findByTeacherId(teacherId).stream().findFirst().ifPresent(next -> {
                repo.clearDefaultForTeacher(teacherId);
                next.setAsDefault();
                repo.save(next);
            });
        }
    }
}
