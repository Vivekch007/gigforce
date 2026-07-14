package com.gigforce.requisition.enums;

public enum SubmissionStatus {
    SUBMITTED,
    SHORTLISTED,
    INTERVIEW_SCHEDULED,
    SELECTED,
    REJECTED;
    public boolean canTransitionTo(SubmissionStatus target) {
        switch (this) {
            case SUBMITTED:
                return target == SHORTLISTED || target == REJECTED;
            case SHORTLISTED:
                return target == INTERVIEW_SCHEDULED || target == SELECTED || target == REJECTED;
            case INTERVIEW_SCHEDULED:
                return target == SELECTED || target == REJECTED;
            case SELECTED:
            case REJECTED:
                return false; // Terminal states: cannot change to anything else
            default:
                return false;
        }
    }
}
