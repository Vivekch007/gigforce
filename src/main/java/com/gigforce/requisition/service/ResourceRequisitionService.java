package com.gigforce.requisition.service;

import com.gigforce.requisition.dto.ResourceRequisitionRequestDTO;
import com.gigforce.requisition.dto.ResourceRequisitionResponseDTO;
import com.gigforce.requisition.enums.RequisitionStatus;
import org.springframework.data.domain.Page;

import java.math.BigDecimal;

public interface ResourceRequisitionService {
    ResourceRequisitionResponseDTO createRequisition(ResourceRequisitionRequestDTO request);

    ResourceRequisitionResponseDTO updateRequisition(String id, ResourceRequisitionRequestDTO request);

    ResourceRequisitionResponseDTO publishRequisition(String id);

    ResourceRequisitionResponseDTO cancelRequisition(String id);

    ResourceRequisitionResponseDTO getRequisitionById(String id);

    Page<ResourceRequisitionResponseDTO> searchRequisitions(
            RequisitionStatus status, String requiredSkillId, BigDecimal maxRate, int page, int size);
}
