package com.gigforce.assignment.repository;

import com.gigforce.assignment.entity.TimesheetComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TimesheetCommentRepository extends JpaRepository<TimesheetComment, String> {
    List<TimesheetComment> findByTimesheetIdOrderByCreatedAtAsc(String timesheetId);
}
