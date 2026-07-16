package com.gigforce.notification.controller;

import com.gigforce.notification.dto.NotificationResponseDTO;
import com.gigforce.notification.service.NotificationService;
import com.gigforce.notification.scheduler.NotificationScheduler;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notifications")
@Tag(name = "Notification & Alert Management", description = "Endpoints for viewing and resolving user alerts")
public class NotificationController {

    private final NotificationService notificationService;
    private final NotificationScheduler notificationScheduler;

    public NotificationController(NotificationService notificationService, NotificationScheduler notificationScheduler) {
        this.notificationService = notificationService;
        this.notificationScheduler = notificationScheduler;
    }

    @GetMapping
    @Operation(summary = "Get current user's notifications")
    public ResponseEntity<List<NotificationResponseDTO>> getMyNotifications(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate fromDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate toDate) {
        List<NotificationResponseDTO> response = notificationService.getMyNotifications(status, category, priority, fromDate, toDate);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Get current user's unread notification count")
    public ResponseEntity<Long> getUnreadCount() {
        Long response = notificationService.getUnreadCount();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get notification details by ID")
    public ResponseEntity<NotificationResponseDTO> getNotificationById(@PathVariable String id) {
        NotificationResponseDTO response = notificationService.getNotificationById(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/read")
    @Operation(summary = "Mark notification as READ")
    public ResponseEntity<NotificationResponseDTO> markRead(@PathVariable String id) {
        NotificationResponseDTO response = notificationService.markRead(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/dismiss")
    @Operation(summary = "Mark notification as DISMISSED")
    public ResponseEntity<NotificationResponseDTO> dismiss(@PathVariable String id) {
        NotificationResponseDTO response = notificationService.dismiss(id);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete notification by ID")
    public ResponseEntity<Void> deleteNotification(@PathVariable String id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/system")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Send system notification (Admin only)")
    public ResponseEntity<NotificationResponseDTO> sendSystemNotification(
            @RequestBody com.gigforce.notification.dto.NotificationRequestDTO request) {
        NotificationResponseDTO response = notificationService.sendSystemNotification(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/trigger-jobs")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Manually trigger scheduled warning jobs (Admin only)")
    public ResponseEntity<Void> triggerJobs() {
        notificationScheduler.checkAssignmentEndWarnings();
        notificationScheduler.checkCertificationExpiryWarnings();
        notificationScheduler.checkPurchaseOrderExhaustionWarnings();
        return ResponseEntity.ok().build();
    }
}
