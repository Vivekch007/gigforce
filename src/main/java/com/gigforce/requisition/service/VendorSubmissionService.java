package com.gigforce.requisition.service;

import com.gigforce.requisition.dto.VendorSubmissionRequestDTO;
import com.gigforce.requisition.dto.VendorSubmissionResponseDTO;
import com.gigforce.requisition.enums.SubmissionStatus;
import org.springframework.data.domain.Page;

import java.util.List;

public interface VendorSubmissionService {
    VendorSubmissionResponseDTO submitContractor(String requisitionId, VendorSubmissionRequestDTO request);

    VendorSubmissionResponseDTO transitionStatus(String id, SubmissionStatus targetStatus, String remarks);

    VendorSubmissionResponseDTO getSubmissionById(String id);

    List<VendorSubmissionResponseDTO> getSubmissionsByRequisitionId(String requisitionId);

    Page<VendorSubmissionResponseDTO> searchSubmissions(
            String requisitionId, SubmissionStatus status, String contractorProfileId, int page, int size);
}
