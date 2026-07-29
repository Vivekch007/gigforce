package com.gigforce.assignment.repository;

import com.gigforce.assignment.entity.TimesheetLine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TimesheetLineRepository extends JpaRepository<TimesheetLine, String> {
    List<TimesheetLine> findByTimesheetId(String timesheetId);
}
