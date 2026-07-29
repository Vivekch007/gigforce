package com.gigforce.assignment.repository;

import com.gigforce.assignment.entity.TimesheetApproval;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TimesheetApprovalRepository extends JpaRepository<TimesheetApproval, String> {
    List<TimesheetApproval> findByTimesheetIdOrderByActionDateAsc(String timesheetId);
}
