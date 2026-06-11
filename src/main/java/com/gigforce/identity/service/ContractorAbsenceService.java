package com.gigforce.identity.service;

import com.gigforce.assignment.dto.AbsenceRequestDTO;
import com.gigforce.assignment.dto.AbsenceResponseDTO;

import java.util.List;

public interface ContractorAbsenceService {
    AbsenceResponseDTO requestLeave(AbsenceRequestDTO request);
    AbsenceResponseDTO approveLeave(String id);
    AbsenceResponseDTO rejectLeave(String id, String remarks);
    AbsenceResponseDTO getLeaveById(String id);
    List<AbsenceResponseDTO> getLeavesByContractorProfile(String profileId);
}
