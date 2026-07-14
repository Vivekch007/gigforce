package com.gigforce.notification.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationResponseDTO {

    @JsonProperty("NotificationID")
    private String notificationId;

    @JsonProperty("UserID")
    private String userId;

    @JsonProperty("Message")
    private String message;

    @JsonProperty("Category")
    private String category;

    @JsonProperty("Status")
    private String status;

    @JsonProperty("CreatedDate")
    private LocalDateTime createdDate;

    @JsonProperty("notificationType")
    private String notificationType;

    @JsonProperty("referenceEntityId")
    private String referenceEntityId;

    @JsonProperty("referenceEntityType")
    private String referenceEntityType;

    @JsonProperty("readDate")
    private LocalDateTime readDate;

    @JsonProperty("Title")
    private String title;

    @JsonProperty("OrgUnitID")
    private String orgUnitId;

    @JsonProperty("Priority")
    private String priority;

    @JsonProperty("relatedEntityId")
    private String relatedEntityId;

    @JsonProperty("relatedEntityType")
    private String relatedEntityType;

    @JsonProperty("readAt")
    private LocalDateTime readAt;
}
