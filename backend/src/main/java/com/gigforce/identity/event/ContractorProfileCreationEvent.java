package com.gigforce.identity.event;

import org.springframework.context.ApplicationEvent;
import com.gigforce.identity.dto.ContractorProfileCreationRequestDTO;

public class ContractorProfileCreationEvent extends ApplicationEvent {
    private final String userId;
    private final ContractorProfileCreationRequestDTO request;

    public ContractorProfileCreationEvent(Object source, String userId, ContractorProfileCreationRequestDTO request) {
        super(source);
        this.userId = userId;
        this.request = request;
    }

    public String getUserId() {
        return userId;
    }

    public ContractorProfileCreationRequestDTO getRequest() {
        return request;
    }
}