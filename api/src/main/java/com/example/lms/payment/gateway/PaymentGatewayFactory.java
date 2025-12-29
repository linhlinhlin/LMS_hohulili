package com.example.lms.payment.gateway;

import com.example.lms.payment.gateway.exception.PaymentGatewayException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * PaymentGatewayFactory - Factory for payment gateway instances
 * 
 * SOTA Design (Dec 2025):
 * - Factory Pattern with Spring auto-discovery
 * - Auto-registers all @Component classes implementing PaymentGateway
 * - Provides routing, fallback, and gateway selection
 * 
 * Usage:
 *   PaymentGateway vnpay = factory.getGateway("VNPAY");
 *   PaymentGateway defaultGw = factory.getDefaultGateway();
 *   List<String> available = factory.getAvailableGatewayCodes();
 */
@Component
@Slf4j
public class PaymentGatewayFactory {
    
    private final Map<String, PaymentGateway> gateways;
    
    @Value("${payment.default-gateway:SIMULATED}")
    private String defaultGatewayCode;
    
    /**
     * Constructor - Spring auto-injects all PaymentGateway implementations
     * 
     * @param gatewayList List of all registered gateway beans
     */
    public PaymentGatewayFactory(List<PaymentGateway> gatewayList) {
        this.gateways = gatewayList.stream()
                .collect(Collectors.toMap(
                        gw -> gw.getGatewayCode().toUpperCase(),
                        Function.identity(),
                        (existing, replacement) -> {
                            log.warn("Duplicate gateway code: {}. Using first registered.", 
                                    existing.getGatewayCode());
                            return existing;
                        }
                ));
        
        log.info("PaymentGatewayFactory initialized with {} gateways: {}", 
                gateways.size(), 
                gateways.keySet());
    }
    
    /**
     * Get a specific gateway by code
     * 
     * @param gatewayCode Gateway code (case-insensitive)
     * @return The gateway instance
     * @throws PaymentGatewayException if gateway not found
     */
    public PaymentGateway getGateway(String gatewayCode) {
        String code = gatewayCode.toUpperCase();
        PaymentGateway gateway = gateways.get(code);
        
        if (gateway == null) {
            throw new PaymentGatewayException(
                    "GATEWAY_NOT_FOUND",
                    "Payment gateway not found: " + gatewayCode + 
                    ". Available: " + getAvailableGatewayCodes()
            );
        }
        
        if (!gateway.isAvailable()) {
            throw new PaymentGatewayException(
                    "GATEWAY_UNAVAILABLE",
                    "Payment gateway is currently unavailable: " + gatewayCode
            );
        }
        
        return gateway;
    }
    
    /**
     * Get a gateway if it exists
     * 
     * @param gatewayCode Gateway code
     * @return Optional containing gateway if found and available
     */
    public Optional<PaymentGateway> findGateway(String gatewayCode) {
        try {
            return Optional.of(getGateway(gatewayCode));
        } catch (PaymentGatewayException e) {
            return Optional.empty();
        }
    }
    
    /**
     * Get the default gateway (configured in application.yml)
     * 
     * @return Default gateway instance
     */
    public PaymentGateway getDefaultGateway() {
        return getGateway(defaultGatewayCode);
    }
    
    /**
     * Get list of all available gateway codes
     * 
     * @return List of gateway codes that are available
     */
    public List<String> getAvailableGatewayCodes() {
        return gateways.values().stream()
                .filter(PaymentGateway::isAvailable)
                .map(PaymentGateway::getGatewayCode)
                .sorted()
                .toList();
    }
    
    /**
     * Get all registered gateways (for admin/config purposes)
     * 
     * @return List of all gateway information
     */
    public List<GatewayInfo> getAllGatewayInfo() {
        return gateways.values().stream()
                .map(gw -> new GatewayInfo(
                        gw.getGatewayCode(),
                        gw.getDisplayName(),
                        gw.isAvailable(),
                        gw.supportsRefund(),
                        gw.getMinAmount(),
                        gw.getMaxAmount()
                ))
                .sorted((a, b) -> a.code().compareTo(b.code()))
                .toList();
    }
    
    /**
     * Check if a gateway exists
     * 
     * @param gatewayCode Gateway code to check
     * @return true if gateway exists (regardless of availability)
     */
    public boolean hasGateway(String gatewayCode) {
        return gateways.containsKey(gatewayCode.toUpperCase());
    }
    
    /**
     * Get gateway with fallback
     * 
     * @param preferredCode Preferred gateway code
     * @param fallbackCode Fallback gateway code
     * @return Preferred gateway if available, otherwise fallback
     */
    public PaymentGateway getGatewayWithFallback(String preferredCode, String fallbackCode) {
        try {
            return getGateway(preferredCode);
        } catch (PaymentGatewayException e) {
            log.warn("Preferred gateway {} unavailable, falling back to {}", 
                    preferredCode, fallbackCode);
            return getGateway(fallbackCode);
        }
    }
    
    /**
     * Gateway information record
     */
    public record GatewayInfo(
            String code,
            String displayName,
            boolean available,
            boolean supportsRefund,
            long minAmount,
            long maxAmount
    ) {}
}
