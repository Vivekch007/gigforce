package com.gigforce.identity.event;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.event.TransactionPhase;

import com.gigforce.identity.service.ContractorProfileService;

@Component
public class ContractorProfileCreationListener {
    private static final Logger LOG = LoggerFactory.getLogger(ContractorProfileCreationListener.class);

    private final ContractorProfileService contractorProfileService;

    public ContractorProfileCreationListener(ContractorProfileService contractorProfileService) {
        this.contractorProfileService = contractorProfileService;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public void handle(ContractorProfileCreationEvent event) {
        try {
            contractorProfileService.createProfile(event.getUserId(), event.getRequest());
        } catch (Exception ex) {
            LOG.error("Failed to create contractor profile for user {}: {}", event.getUserId(), ex.getMessage(), ex);
        }
    }
}