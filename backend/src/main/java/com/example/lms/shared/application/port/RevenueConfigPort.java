package com.example.lms.shared.application.port;

import com.example.lms.shared.domain.model.OrgPaymentConfig;

import java.util.UUID;

/**
 * Application port for resolving effective revenue-sharing configuration.
 */
public interface RevenueConfigPort {

    OrgPaymentConfig resolveConfig(UUID orgId);
}
