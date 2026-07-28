package com.gigforce.notification.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationRequestDTO {

    @NotBlank(message = "User ID is required")
    private String userId;

    @NotBlank(message = "Message is required")
    private String message;

    @NotBlank(message = "Category is required")
    private String category;

    private String notificationType;
    private String referenceEntityId;
    private String referenceEntityType;
    private String title;
    private String orgUnitId;
    private String priority;
}
