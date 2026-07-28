package com.gigforce.assignment.service;

import com.gigforce.assignment.dto.AssignmentRequestDTO;
import com.gigforce.assignment.dto.AssignmentResponseDTO;
import com.gigforce.assignment.enums.AssignmentStatus;
import org.springframework.data.domain.Page;

public interface AssignmentService {
    AssignmentResponseDTO createAssignment(AssignmentRequestDTO request);

    AssignmentResponseDTO getAssignmentById(String id);
    Page<AssignmentResponseDTO> searchAssignments(
            String assignmentId,
            String contractorProfileId,
            String requisitionId,
            String vendorId,
            AssignmentStatus status,
            String orgUnitId,
            int page,
            int size);
    AssignmentResponseDTO cancelAssignment(String id);

    AssignmentResponseDTO completeAssignment(String id);
}
