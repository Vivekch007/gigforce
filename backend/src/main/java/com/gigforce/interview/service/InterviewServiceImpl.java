package com.gigforce.interview.service;

import com.gigforce.exception.BusinessValidationException;
import com.gigforce.exception.UserNotFoundException;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.repository.UserRepository;
import com.gigforce.interview.dto.InterviewResponseDTO;
import com.gigforce.interview.dto.RescheduleInterviewRequestDTO;
import com.gigforce.interview.dto.ScheduleInterviewRequestDTO;
import com.gigforce.interview.entity.Interview;
import com.gigforce.interview.repository.InterviewRepository;
import com.gigforce.requisition.entity.VendorSubmission;
import com.gigforce.requisition.repository.VendorSubmissionRepository;
import com.gigforce.security.CurrentUserContext;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class InterviewServiceImpl implements InterviewService {

    private final InterviewRepository interviewRepository;
    private final VendorSubmissionRepository vendorSubmissionRepository;
    private final UserRepository userRepository;
    private final CurrentUserContext currentUserContext;

    public InterviewServiceImpl(
            InterviewRepository interviewRepository,
            VendorSubmissionRepository vendorSubmissionRepository,
            UserRepository userRepository,
            CurrentUserContext currentUserContext) {
        this.interviewRepository = interviewRepository;
        this.vendorSubmissionRepository = vendorSubmissionRepository;
        this.userRepository = userRepository;
        this.currentUserContext = currentUserContext;
    }

    @Override
    public List<InterviewResponseDTO> getInterviews() {
        String role = currentUserContext.getCurrentUserRole();
        String orgUnitId = currentUserContext.getCurrentUserOrgUnitId();

        List<Interview> interviews;
        if ("ADMIN".equals(role) || "FINANCE".equals(role)) {
            interviews = interviewRepository.findAllWithDetails();
        } else if ("HIRING_MANAGER".equals(role)) {
            interviews = orgUnitId != null
                    ? interviewRepository.findByRequisitionOrgUnit(orgUnitId)
                    : interviewRepository.findAllWithDetails();
        } else if ("VENDOR".equals(role) || "VENDOR_MANAGER".equals(role)) {
            interviews = orgUnitId != null
                    ? interviewRepository.findByVendorOrg(orgUnitId)
                    : List.of();
        } else {
            interviews = List.of();
        }

        return interviews.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public InterviewResponseDTO scheduleInterview(ScheduleInterviewRequestDTO request) {
        String role = currentUserContext.getCurrentUserRole();
        if (!"ADMIN".equals(role) && !"HIRING_MANAGER".equals(role)) {
            throw new AccessDeniedException("Only Hiring Managers or Admins can schedule interviews.");
        }

        VendorSubmission submission = vendorSubmissionRepository.findById(request.getVendorSubmissionId())
                .orElseThrow(() -> new BusinessValidationException(
                        "Vendor submission not found: " + request.getVendorSubmissionId()));

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + currentUsername));

        Interview interview = Interview.builder()
                .vendorSubmission(submission)
                .candidateName(request.getCandidateName() != null
                        ? request.getCandidateName().trim()
                        : (submission.getContractorProfile() != null
                                && submission.getContractorProfile().getUser() != null
                                && submission.getContractorProfile().getUser().getName() != null
                                ? submission.getContractorProfile().getUser().getName()
                                : "Candidate"))
                .date(request.getDate())
                .time(request.getTime() != null ? request.getTime() : "10:00")
                .status("SCHEDULED")
                .interviewType(request.getInterviewType() != null ? request.getInterviewType() : "VIDEO")
                .scheduledBy(currentUser)
                .build();

        Interview saved = interviewRepository.save(interview);
        return toDto(saved);
    }

    @Override
    @Transactional
    public InterviewResponseDTO rescheduleInterview(String id, RescheduleInterviewRequestDTO request) {
        String role = currentUserContext.getCurrentUserRole();
        if (!"ADMIN".equals(role) && !"HIRING_MANAGER".equals(role)) {
            throw new AccessDeniedException("Only Hiring Managers or Admins can reschedule interviews.");
        }

        Interview interview = interviewRepository.findById(id)
                .orElseThrow(() -> new BusinessValidationException("Interview not found with ID: " + id));

        if ("COMPLETED".equals(interview.getStatus()) || "CANCELLED".equals(interview.getStatus())) {
            throw new BusinessValidationException(
                    "Cannot reschedule an interview that is already " + interview.getStatus() + ".");
        }

        if (request.getDate() == null) {
            throw new BusinessValidationException("A new date is required for rescheduling.");
        }

        interview.setDate(request.getDate());
        if (request.getTime() != null) {
            interview.setTime(request.getTime());
        }
        interview.setStatus("RESCHEDULED");

        Interview updated = interviewRepository.save(interview);
        return toDto(updated);
    }

    @Override
    @Transactional
    public InterviewResponseDTO completeInterview(String id, String feedback) {
        String role = currentUserContext.getCurrentUserRole();
        if (!"ADMIN".equals(role) && !"HIRING_MANAGER".equals(role)) {
            throw new AccessDeniedException("Only Hiring Managers or Admins can complete interviews.");
        }

        Interview interview = interviewRepository.findById(id)
                .orElseThrow(() -> new BusinessValidationException("Interview not found with ID: " + id));

        if ("COMPLETED".equals(interview.getStatus())) {
            throw new BusinessValidationException("Interview is already marked as COMPLETED.");
        }

        interview.setStatus("COMPLETED");
        interview.setFeedback(feedback != null ? feedback.trim() : "");

        Interview updated = interviewRepository.save(interview);
        return toDto(updated);
    }

    private InterviewResponseDTO toDto(Interview interview) {
        return InterviewResponseDTO.builder()
                .id(interview.getId())
                .vendorSubmissionId(interview.getVendorSubmission() != null ? interview.getVendorSubmission().getId() : null)
                .candidateName(interview.getCandidateName())
                .date(interview.getDate() != null ? interview.getDate().toString() : null)
                .time(interview.getTime())
                .status(interview.getStatus())
                .interviewType(interview.getInterviewType())
                .feedback(interview.getFeedback())
                .scheduledById(interview.getScheduledBy() != null ? interview.getScheduledBy().getId() : null)
                .scheduledByEmail(interview.getScheduledBy() != null ? interview.getScheduledBy().getEmail() : null)
                .createdAt(interview.getCreatedAt() != null ? interview.getCreatedAt().toString() : null)
                .build();
    }
}
