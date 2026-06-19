package com.gigforce.notification.service;

import com.gigforce.notification.dto.NotificationRequestDTO;
import com.gigforce.notification.dto.NotificationResponseDTO;

import java.util.List;

public interface NotificationService {
    NotificationResponseDTO createNotification(NotificationRequestDTO request);
    NotificationResponseDTO getNotificationById(String id);
    NotificationResponseDTO markRead(String id);
    NotificationResponseDTO dismiss(String id);
    List<NotificationResponseDTO> getMyNotifications();
    Long getUnreadCount();
}
