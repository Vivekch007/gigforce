package com.gigforce.requisition.enums;

public enum SubmissionStatus {
    SUBMITTED,
    SHORTLISTED,
    INTERVIEW_SCHEDULED,
    SELECTED,
    REJECTED,
    WITHDRAWN;
    public boolean canTransitionTo(SubmissionStatus target) {
        switch (this) {
            case SUBMITTED:
                return target == SHORTLISTED || target == REJECTED || target == WITHDRAWN;
            case SHORTLISTED:
                return target == INTERVIEW_SCHEDULED || target == SELECTED || target == REJECTED || target == WITHDRAWN;
            case INTERVIEW_SCHEDULED:
                return target == SELECTED || target == REJECTED || target == WITHDRAWN;
            case SELECTED:
            case REJECTED:
            case WITHDRAWN:
                return false; // Terminal states: cannot change to anything else
            default:
                return false;
        }
    }
}
