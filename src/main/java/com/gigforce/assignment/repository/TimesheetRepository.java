package com.gigforce.assignment.repository;

import com.gigforce.assignment.entity.Timesheet;
import com.gigforce.assignment.enums.TimesheetStatus;
import com.gigforce.assignment.enums.PayrollStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface TimesheetRepository extends JpaRepository<Timesheet, String> {

    List<Timesheet> findByStatusAndPayrollStatus(TimesheetStatus status, PayrollStatus payrollStatus);

    boolean existsByContractorIdAndAssignmentIdAndWeekStartDate(String contractorUserId, String assignmentId,
            LocalDate weekStartDate);

    List<Timesheet> findByContractorId(String contractorUserId);

    List<Timesheet> findByAssignmentId(String assignmentId);

    @Query("SELECT t FROM Timesheet t WHERE t.status = :status AND t.updatedAt < :cutoff")
    List<Timesheet> findPendingTimesheetsOlderThan(@Param("status") TimesheetStatus status,
            @Param("cutoff") java.time.LocalDateTime cutoff);
}
