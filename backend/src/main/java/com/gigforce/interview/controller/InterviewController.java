package com.gigforce.interview.controller;

import com.gigforce.interview.dto.InterviewResponseDTO;
import com.gigforce.interview.dto.RescheduleInterviewRequestDTO;
import com.gigforce.interview.dto.ScheduleInterviewRequestDTO;
import com.gigforce.interview.service.InterviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/interviews")
@Tag(name = "Interview Management", description = "Endpoints for scheduling, rescheduling, and completing candidate interviews")
public class InterviewController {

    private final InterviewService interviewService;

    public InterviewController(InterviewService interviewService) {
        this.interviewService = interviewService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER', 'VENDOR_MANAGER', 'VENDOR', 'FINANCE')")
    @Operation(summary = "Retrieve all interviews (role-filtered)")
    public ResponseEntity<org.springframework.data.domain.Page<InterviewResponseDTO>> getInterviews(
            @RequestParam(required = false) String requisitionId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) java.time.LocalDate startDate,
            @RequestParam(required = false) java.time.LocalDate endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(interviewService.getInterviews(requisitionId, status, startDate, endDate, page, size));
    }

    @PostMapping("/schedule-interview")
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER')")
    @Operation(summary = "Schedule a new interview for a vendor submission candidate")
    public ResponseEntity<InterviewResponseDTO> scheduleInterview(
            @Valid @RequestBody ScheduleInterviewRequestDTO request) {
        InterviewResponseDTO response = interviewService.scheduleInterview(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}/reschedule")
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER')")
    @Operation(summary = "Reschedule an existing interview")
    public ResponseEntity<InterviewResponseDTO> rescheduleInterview(
            @PathVariable String id,
            @RequestBody RescheduleInterviewRequestDTO request) {
        InterviewResponseDTO response = interviewService.rescheduleInterview(id, request);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/complete")
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER')")
    @Operation(summary = "Mark an interview as completed with feedback notes")
    public ResponseEntity<InterviewResponseDTO> completeInterview(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        String feedback = body.getOrDefault("feedback", "");
        String rating = body.getOrDefault("rating", "");
        InterviewResponseDTO response = interviewService.completeInterview(id, body);
        return ResponseEntity.ok(response);
    }
}
