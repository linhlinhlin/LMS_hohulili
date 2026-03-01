package com.example.lms.identity.application.usecase;

import com.example.lms.identity.application.dto.OrganizationResponse;
import com.example.lms.identity.domain.repository.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ListOrganizationsUseCase {

    private final OrganizationRepository orgRepo;

    @Transactional(readOnly = true)
    public List<OrganizationResponse> execute() {
        return orgRepo.findAll().stream()
                .map(OrganizationResponse::from)
                .toList();
    }
}
