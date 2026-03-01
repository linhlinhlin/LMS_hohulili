package com.example.lms.identity.application.usecase;

import com.example.lms.identity.application.dto.InviteResponse;
import com.example.lms.identity.domain.model.Organization;
import com.example.lms.identity.domain.repository.OrganizationInviteRepository;
import com.example.lms.identity.domain.repository.OrganizationRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ListInvitesUseCase {

    private final OrganizationInviteRepository inviteRepo;
    private final OrganizationRepository orgRepo;

    @Transactional(readOnly = true)
    public List<InviteResponse> execute(UUID organizationId) {
        Organization org = orgRepo.findById(organizationId)
                .orElseThrow(() -> new EntityNotFoundException("Tổ chức", organizationId));

        return inviteRepo.findByOrganizationId(organizationId).stream()
                .map(invite -> InviteResponse.from(invite, org.getName()))
                .toList();
    }
}
