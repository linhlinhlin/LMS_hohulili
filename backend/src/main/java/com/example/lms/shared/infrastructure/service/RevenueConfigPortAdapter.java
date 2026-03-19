package com.example.lms.shared.infrastructure.service;

import com.example.lms.shared.application.port.RevenueConfigPort;
import com.example.lms.shared.domain.model.OrgPaymentConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class RevenueConfigPortAdapter implements RevenueConfigPort {

    private final RevenueConfigService revenueConfigService;

    @Override
    public OrgPaymentConfig resolveConfig(UUID orgId) {
        return revenueConfigService.resolveConfig(orgId);
    }
}
