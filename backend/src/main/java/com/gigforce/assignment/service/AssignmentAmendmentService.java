package com.gigforce.assignment.service;

import com.gigforce.assignment.dto.AmendmentRequestDTO;
import com.gigforce.assignment.dto.AmendmentResponseDTO;

import java.util.List;

public interface AssignmentAmendmentService {
    AmendmentResponseDTO createAmendment(String assignmentId, AmendmentRequestDTO request);

    AmendmentResponseDTO approveAmendment(String id, String remarks);

    AmendmentResponseDTO rejectAmendment(String id, String remarks);

    List<AmendmentResponseDTO> getAmendmentsByAssignmentId(String assignmentId);
}
