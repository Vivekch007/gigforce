package com.gigforce.notification.service;

import com.gigforce.notification.dto.NotificationRequestDTO;
import com.gigforce.notification.dto.NotificationResponseDTO;

import java.time.LocalDate;
import java.util.List;

public interface NotificationService {
    NotificationResponseDTO createNotification(NotificationRequestDTO request);
    NotificationResponseDTO getNotificationById(String id);
    NotificationResponseDTO markRead(String id);
    NotificationResponseDTO markUnread(String id);
    NotificationResponseDTO dismiss(String id);
    List<NotificationResponseDTO> getMyNotifications(String status, String category, String priority,
            LocalDate fromDate, LocalDate toDate);
    Long getUnreadCount();
    void deleteNotification(String id);
    int markAllAsRead();
    void deleteAllNotifications();
    NotificationResponseDTO sendSystemNotification(NotificationRequestDTO request);
}
