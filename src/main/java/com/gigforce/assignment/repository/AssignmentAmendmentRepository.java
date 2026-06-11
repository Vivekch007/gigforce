package com.gigforce.assignment.repository;

import com.gigforce.assignment.entity.AssignmentAmendment;
import com.gigforce.assignment.enums.AmendmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssignmentAmendmentRepository extends JpaRepository<AssignmentAmendment, String> {

    List<AssignmentAmendment> findByAssignmentId(String assignmentId);

    List<AssignmentAmendment> findByAssignmentIdAndStatus(String assignmentId, AmendmentStatus status);
}
