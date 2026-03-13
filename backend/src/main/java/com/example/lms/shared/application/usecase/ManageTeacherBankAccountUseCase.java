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
        String normalizedBank = bankCode.toUpperCase().trim();
        String normalizedNumber = accountNumber.trim();

        if (repo.existsByTeacherIdAndBankCodeAndAccountNumber(teacherId, normalizedBank, normalizedNumber)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tài khoản ngân hàng này đã được thêm");
        }

        List<TeacherBankAccount> existing = repo.findByTeacherId(teacherId);
        if (existing.size() >= 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tối đa 5 tài khoản ngân hàng");
        }

        boolean isFirst = existing.isEmpty();
        var account = TeacherBankAccount.create(teacherId, normalizedBank,
                normalizedNumber, accountName.trim().toUpperCase(), isFirst);
        account.verify(); // Auto-verify: no real-time Napas validation in current system
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
