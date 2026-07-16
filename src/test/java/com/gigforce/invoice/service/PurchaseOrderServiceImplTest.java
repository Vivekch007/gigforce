package com.gigforce.invoice.service;

import com.gigforce.assignment.entity.Assignment;
import com.gigforce.assignment.enums.AssignmentStatus;
import com.gigforce.assignment.repository.AssignmentRepository;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.enums.UserRole;
import com.gigforce.identity.enums.UserStatus;
import com.gigforce.identity.repository.UserRepository;
import com.gigforce.invoice.dto.PurchaseOrderRequestDTO;
import com.gigforce.invoice.dto.PurchaseOrderResponseDTO;
import com.gigforce.invoice.entity.PurchaseOrder;
import com.gigforce.invoice.enums.PurchaseOrderStatus;
import com.gigforce.invoice.repository.PurchaseOrderRepository;
import com.gigforce.requisition.enums.EngagementType;
import com.gigforce.security.CurrentUserContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Module 6 - Purchase Order service tests.
 * PO is raised by VENDOR / VENDOR_MANAGER (Admin override); one PO per assignment;
 * vendors may only raise POs for assignments where they are the assigned vendor.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PurchaseOrderServiceImplTest {

    @Mock private PurchaseOrderRepository purchaseOrderRepository;
    @Mock private AssignmentRepository assignmentRepository;
    @Mock private UserRepository userRepository;
    @Mock private CurrentUserContext currentUserContext;

    @InjectMocks private PurchaseOrderServiceImpl service;

    private static final LocalDate START = LocalDate.of(2026, 8, 1);
    private static final LocalDate END = LocalDate.of(2027, 2, 1);

    private User sam;      // VENDOR
    private User riya;     // HIRING_MANAGER
    private User admin;    // ADMIN
    private Assignment assignment;

    @BeforeEach
    void setUp() {
        sam = user("v1", "sam@x.com", UserRole.VENDOR);
        riya = user("hr1", "riya@x.com", UserRole.HIRING_MANAGER);
        admin = user("ad1", "admin@x.com", UserRole.ADMIN);
        assignment = assignment("a1", riya, sam);
    }

    private User user(String id, String email, UserRole role) {
        User u = User.builder().name("N-" + id).email(email).password("h").phone("1234567890")
                .role(role).status(UserStatus.ACTIVE).orgUnitId("ORG1").build();
        u.setId(id);
        return u;
    }

    private Assignment assignment(String id, User hm, User vendor) {
        Assignment a = Assignment.builder()
                .hiringManager(hm).vendor(vendor).status(AssignmentStatus.ACTIVE)
                .startDate(START).endDate(END)
                .agreedRatePerDay(new BigDecimal("1000.00"))
                .engagementType(EngagementType.REMOTE).orgUnitId("ORG1").build();
        a.setId(id);
        return a;
    }

    private PurchaseOrderRequestDTO dto(String vendorId) {
        return PurchaseOrderRequestDTO.builder()
                .assignmentId("a1").vendorId(vendorId).poAmount(new BigDecimal("500000")).currency("INR").build();
    }

    // ---------------- createPurchaseOrder ----------------

    @Test
    void createPO_byOwningVendor_success_setsSelfAsVendorAndDates() {
        when(currentUserContext.getCurrentUser()).thenReturn(sam);
        when(assignmentRepository.findById("a1")).thenReturn(Optional.of(assignment));
        when(purchaseOrderRepository.findByAssignmentId("a1")).thenReturn(List.of());
        when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(i -> {
            PurchaseOrder po = i.getArgument(0);
            po.setId("po1");
            return po;
        });

        PurchaseOrderResponseDTO res = service.createPurchaseOrder(dto("v1"));

        assertEquals("po1", res.getId());
        assertEquals("v1", res.getVendorId());
        assertEquals(PurchaseOrderStatus.ACTIVE.name(), res.getStatus());
        assertEquals(START, res.getIssuedDate());
        assertEquals(END.plusDays(10), res.getExpiryDate());
    }

    @Test
    void createPO_vendorNotAssignedToAssignment_denied() {
        User otherVendor = user("v2", "bob@x.com", UserRole.VENDOR);
        when(currentUserContext.getCurrentUser()).thenReturn(otherVendor);
        when(assignmentRepository.findById("a1")).thenReturn(Optional.of(assignment)); // vendor is sam
        when(purchaseOrderRepository.findByAssignmentId("a1")).thenReturn(List.of());

        assertThrows(AccessDeniedException.class, () -> service.createPurchaseOrder(dto("v2")));
    }

    @Test
    void createPO_byAdmin_usesRequestVendorId_success() {
        when(currentUserContext.getCurrentUser()).thenReturn(admin);
        when(assignmentRepository.findById("a1")).thenReturn(Optional.of(assignment));
        when(purchaseOrderRepository.findByAssignmentId("a1")).thenReturn(List.of());
        when(userRepository.findById("v1")).thenReturn(Optional.of(sam));
        when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(i -> {
            PurchaseOrder po = i.getArgument(0);
            po.setId("po1");
            return po;
        });

        PurchaseOrderResponseDTO res = service.createPurchaseOrder(dto("v1"));
        assertEquals("v1", res.getVendorId());
    }

    @Test
    void createPO_byAdmin_missingVendorId_throws() {
        when(currentUserContext.getCurrentUser()).thenReturn(admin);
        when(assignmentRepository.findById("a1")).thenReturn(Optional.of(assignment));
        when(purchaseOrderRepository.findByAssignmentId("a1")).thenReturn(List.of());
        assertThrows(IllegalArgumentException.class, () -> service.createPurchaseOrder(dto(null)));
    }

    @Test
    void createPO_targetUserNotVendor_throws() {
        when(currentUserContext.getCurrentUser()).thenReturn(admin);
        when(assignmentRepository.findById("a1")).thenReturn(Optional.of(assignment));
        when(purchaseOrderRepository.findByAssignmentId("a1")).thenReturn(List.of());
        when(userRepository.findById("hr1")).thenReturn(Optional.of(riya)); // HIRING_MANAGER, not a vendor
        assertThrows(IllegalArgumentException.class, () -> service.createPurchaseOrder(dto("hr1")));
    }

    @Test
    void createPO_unauthorizedRole_denied() {
        when(currentUserContext.getCurrentUser()).thenReturn(riya); // HIRING_MANAGER can no longer create
        assertThrows(AccessDeniedException.class, () -> service.createPurchaseOrder(dto("v1")));
    }

    @Test
    void createPO_duplicateForAssignment_throws() {
        when(currentUserContext.getCurrentUser()).thenReturn(sam);
        when(assignmentRepository.findById("a1")).thenReturn(Optional.of(assignment));
        PurchaseOrder existing = PurchaseOrder.builder().assignment(assignment).vendor(sam)
                .poAmount(new BigDecimal("1")).currency("INR").issuedDate(START).expiryDate(END)
                .status(PurchaseOrderStatus.ACTIVE).build();
        when(purchaseOrderRepository.findByAssignmentId("a1")).thenReturn(List.of(existing));
        assertThrows(IllegalStateException.class, () -> service.createPurchaseOrder(dto("v1")));
    }

    @Test
    void createPO_assignmentNotFound_throws() {
        when(currentUserContext.getCurrentUser()).thenReturn(sam);
        when(assignmentRepository.findById("a1")).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class, () -> service.createPurchaseOrder(dto("v1")));
    }

    @Test
    void createPO_unauthenticated_denied() {
        when(currentUserContext.getCurrentUser()).thenReturn(null);
        assertThrows(AccessDeniedException.class, () -> service.createPurchaseOrder(dto("v1")));
    }

    // ---------------- cancelPurchaseOrder ----------------

    @Test
    void cancelPO_byAdmin_active_success() {
        PurchaseOrder po = PurchaseOrder.builder().assignment(assignment).vendor(sam)
                .poAmount(new BigDecimal("100")).currency("INR").issuedDate(START).expiryDate(END)
                .status(PurchaseOrderStatus.ACTIVE).build();
        po.setId("po1");
        when(currentUserContext.getCurrentUser()).thenReturn(admin);
        when(purchaseOrderRepository.findById("po1")).thenReturn(Optional.of(po));
        when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(i -> i.getArgument(0));

        PurchaseOrderResponseDTO res = service.cancelPurchaseOrder("po1");
        assertEquals(PurchaseOrderStatus.CANCELLED.name(), res.getStatus());
    }

    @Test
    void cancelPO_notActive_throws() {
        PurchaseOrder po = PurchaseOrder.builder().assignment(assignment).vendor(sam)
                .poAmount(new BigDecimal("100")).currency("INR").issuedDate(START).expiryDate(END)
                .status(PurchaseOrderStatus.EXHAUSTED).build();
        po.setId("po1");
        when(currentUserContext.getCurrentUser()).thenReturn(admin);
        when(purchaseOrderRepository.findById("po1")).thenReturn(Optional.of(po));
        assertThrows(IllegalStateException.class, () -> service.cancelPurchaseOrder("po1"));
    }

    @Test
    void cancelPO_nonOwningHiringManager_denied() {
        User otherHm = user("hr2", "other@x.com", UserRole.HIRING_MANAGER);
        PurchaseOrder po = PurchaseOrder.builder().assignment(assignment).vendor(sam)
                .poAmount(new BigDecimal("100")).currency("INR").issuedDate(START).expiryDate(END)
                .status(PurchaseOrderStatus.ACTIVE).build();
        po.setId("po1");
        when(currentUserContext.getCurrentUser()).thenReturn(otherHm);
        when(purchaseOrderRepository.findById("po1")).thenReturn(Optional.of(po));
        assertThrows(AccessDeniedException.class, () -> service.cancelPurchaseOrder("po1"));
    }

    @Test
    void cancelPO_vendorRole_denied() {
        when(currentUserContext.getCurrentUser()).thenReturn(sam); // vendors cannot cancel
        assertThrows(AccessDeniedException.class, () -> service.cancelPurchaseOrder("po1"));
    }

    // ---------------- view access ----------------

    @Test
    void getPOById_ownerVendor_ok() {
        PurchaseOrder po = PurchaseOrder.builder().assignment(assignment).vendor(sam)
                .poAmount(new BigDecimal("100")).currency("INR").issuedDate(START).expiryDate(END)
                .status(PurchaseOrderStatus.ACTIVE).build();
        po.setId("po1");
        when(currentUserContext.getCurrentUser()).thenReturn(sam);
        when(purchaseOrderRepository.findById("po1")).thenReturn(Optional.of(po));

        assertEquals("po1", service.getPurchaseOrderById("po1").getId());
    }
}
