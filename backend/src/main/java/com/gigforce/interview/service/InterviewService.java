package com.gigforce.interview.service;

import com.gigforce.interview.dto.InterviewResponseDTO;
import com.gigforce.interview.dto.RescheduleInterviewRequestDTO;
import com.gigforce.interview.dto.ScheduleInterviewRequestDTO;

import java.util.List;

public interface InterviewService {

    List<InterviewResponseDTO> getInterviews();

    InterviewResponseDTO scheduleInterview(ScheduleInterviewRequestDTO request);

    InterviewResponseDTO rescheduleInterview(String id, RescheduleInterviewRequestDTO request);

    InterviewResponseDTO completeInterview(String id, String feedback);
}
