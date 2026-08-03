package com.gigforce.interview.service;

import com.gigforce.interview.dto.InterviewResponseDTO;
import com.gigforce.interview.dto.RescheduleInterviewRequestDTO;
import com.gigforce.interview.dto.ScheduleInterviewRequestDTO;

import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;

public interface InterviewService {

    Page<InterviewResponseDTO> getInterviews(String requisitionId, String status, java.time.LocalDate startDate, java.time.LocalDate endDate, int page, int size);

    InterviewResponseDTO scheduleInterview(ScheduleInterviewRequestDTO request);

    InterviewResponseDTO rescheduleInterview(String id, RescheduleInterviewRequestDTO request);

    InterviewResponseDTO completeInterview(String id, Map<String, String> request);
}
