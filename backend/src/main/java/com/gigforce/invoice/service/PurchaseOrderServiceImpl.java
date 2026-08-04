package com.gigforce.invoice.service;

import com.gigforce.assignment.entity.Assignment;
import com.gigforce.assignment.repository.AssignmentRepository;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.repository.UserRepository;
import com.gigforce.invoice.dto.PurchaseOrderRequestDTO;
import com.gigforce.invoice.dto.PurchaseOrderResponseDTO;
import com.gigforce.invoice.entity.PurchaseOrder;
import com.gigforce.invoice.enums.PurchaseOrderStatus;
import com.gigforce.invoice.repository.PurchaseOrderRepository;
import com.gigforce.security.CurrentUserContext;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class PurchaseOrderServiceImpl implements PurchaseOrderService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final AssignmentRepository assignmentRepository;
    private final UserRepository userRepository;
    private final CurrentUserContext currentUserContext;

    public PurchaseOrderServiceImpl(
            PurchaseOrderRepository purchaseOrderRepository,
            AssignmentRepository assignmentRepository,
            UserRepository userRepository,
            CurrentUserContext currentUserContext) {
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.assignmentRepository = assignmentRepository;
        this.userRepository = userRepository;
        this.currentUserContext = currentUserContext;
    }

    @Override
    @Transactional
    public PurchaseOrderResponseDTO createPurchaseOrder(PurchaseOrderRequestDTO request) {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated user.");
        }

        // Standardize extraction to strip out standard prefixing if present
        String role = currentUser.getRole().name().replace("ROLE_", "").trim();

        // RBAC: only Vendor / Vendor Manager raise POs; Admin retains full-access override
        boolean isVendor = "VENDOR".equals(role) || "VENDOR_MANAGER".equals(role);
        boolean isAdmin = "ADMIN".equals(role);
        if (!isVendor && !isAdmin) {
            throw new AccessDeniedException("Access Denied: Only Vendor, Vendor Manager, or Admin can create Purchase Orders.");
        }

        Assignment assignment = assignmentRepository.findById(request.getAssignmentId())
                .orElseThrow(() -> new IllegalArgumentException("Assignment not found with ID: " + request.getAssignmentId()));

        List<PurchaseOrder> existingOrders = purchaseOrderRepository.findByAssignmentId(request.getAssignmentId());
        if (!existingOrders.isEmpty()) {
            throw new IllegalStateException("A Purchase Order already exists for this Assignment.");
        }

        // Resolve the vendor the PO belongs to.
        User vendor;
        if (isVendor) {
            // A vendor may only raise a PO for an assignment on which they are the assigned vendor.
            if (assignment.getVendor() == null || !assignment.getVendor().getId().equals(currentUser.getId())) {
                throw new AccessDeniedException("Access Denied: You can only create Purchase Orders for assignments where you are the vendor.");
            }
            vendor = currentUser;
        } else {
            // Admin must name the vendor the PO is raised for.
            if (request.getVendorId() == null || request.getVendorId().trim().isEmpty()) {
                throw new IllegalArgumentException("Vendor ID is required.");
            }
            vendor = userRepository.findById(request.getVendorId())
                    .orElseThrow(() -> new IllegalArgumentException("Vendor user not found with ID: " + request.getVendorId()));
        }

        String vendorRole = vendor.getRole().name().replace("ROLE_", "").trim();
        if (!"VENDOR".equals(vendorRole) && !"VENDOR_MANAGER".equals(vendorRole)) {
            throw new IllegalArgumentException("Target user is not a Vendor profile.");
        }

        PurchaseOrderStatus initialStatus = PurchaseOrderStatus.PENDING;

        PurchaseOrder po = PurchaseOrder.builder()
                .assignment(assignment)
                .vendor(vendor)
                .poAmount(request.getPoAmount())
                .currency(request.getCurrency())
                .issuedDate(assignment.getStartDate())
                .expiryDate(assignment.getEndDate() != null ? assignment.getEndDate().plusDays(10) : assignment.getStartDate().plusDays(30))
                .status(initialStatus)
                .balanceAmount(request.getPoAmount())
                .build();

        po = purchaseOrderRepository.save(po);

        // Update the assignment with the Purchase Order ID for future invoice reference
        assignment.setPurchaseOrderId(po.getId());
        assignmentRepository.save(assignment);

        return mapToDto(po);
    }

    @Override
    @Transactional(readOnly = true)
    public PurchaseOrderResponseDTO getPurchaseOrderById(String id) {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated user.");
        }

        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Purchase Order not found with ID: " + id));

        validateViewAccess(po, currentUser);

        return mapToDto(po);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PurchaseOrderResponseDTO> getAllPurchaseOrders() {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated user.");
        }

        String role = currentUser.getRole().name().replace("ROLE_", "").trim();
        List<PurchaseOrder> allPos = purchaseOrderRepository.findAll();

        if ("ADMIN".equals(role) || "FINANCE".equals(role)) {
            return allPos.stream().map(this::mapToDto).collect(Collectors.toList());
        }

        if ("HIRING_MANAGER".equals(role)) {
            return allPos.stream()
                    .filter(po -> po.getAssignment().getHiringManager() != null
                            && po.getAssignment().getHiringManager().getId().equals(currentUser.getId()))
                    .map(this::mapToDto)
                    .collect(Collectors.toList());
        }

        if ("VENDOR".equals(role) || "VENDOR_MANAGER".equals(role)) {
            return allPos.stream()
                    .filter(po -> po.getVendor().getId().equals(currentUser.getId()) ||
                            (po.getAssignment().getVendor() != null && po.getAssignment().getVendor().getId().equals(currentUser.getId())))
                    .map(this::mapToDto)
                    .collect(Collectors.toList());
        }

        throw new AccessDeniedException("Access Denied: You do not have permissions to view Purchase Orders.");
    }

    @Override
    @Transactional
    public PurchaseOrderResponseDTO cancelPurchaseOrder(String id) {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated user.");
        }

        String role = currentUser.getRole().name().replace("ROLE_", "").trim();
        if (!"HIRING_MANAGER".equals(role) && !"ADMIN".equals(role)) {
            throw new AccessDeniedException("Access Denied: You are not authorized to cancel Purchase Orders.");
        }

        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Purchase Order not found with ID: " + id));

        if ("HIRING_MANAGER".equals(role)) {
            if (po.getAssignment().getHiringManager() == null || !po.getAssignment().getHiringManager().getId().equals(currentUser.getId())) {
                throw new AccessDeniedException("Access Denied: You can only cancel Purchase Orders for assignments you manage.");
            }
        }

        if (po.getStatus() != PurchaseOrderStatus.PENDING) {
            throw new IllegalStateException("Invalid workflow transition: Purchase Order in status " + po.getStatus() + " cannot be cancelled.");
        }

        po.setStatus(PurchaseOrderStatus.CANCELLED);
        po = purchaseOrderRepository.save(po);
        return mapToDto(po);
    }

    @Override
    @Transactional
    public PurchaseOrderResponseDTO  approvePurchaseOrder(String id) {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated user.");
        }

        String role = currentUser.getRole().name().replace("ROLE_", "").trim();
        if (!"HIRING_MANAGER".equals(role)) {
            throw new AccessDeniedException("Access Denied: You are not authorized to cancel Purchase Orders.");
        }

        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Purchase Order not found with ID: " + id));

        if ("HIRING_MANAGER".equals(role)) {
            if (po.getAssignment().getHiringManager() == null || !po.getAssignment().getHiringManager().getId().equals(currentUser.getId())) {
                throw new AccessDeniedException("Access Denied: You can only cancel Purchase Orders for assignments you manage.");
            }
        }

        if (po.getStatus() != PurchaseOrderStatus.PENDING) {
            throw new IllegalStateException("Invalid workflow transition: Purchase Order in status " + po.getStatus() + " cannot be APPROVED.");
        }

        po.setStatus(PurchaseOrderStatus.ACTIVE);
        po = purchaseOrderRepository.save(po);
        return mapToDto(po);
    }

    private void validateViewAccess(PurchaseOrder po, User currentUser) {
        String role = currentUser.getRole().name().replace("ROLE_", "").trim();
        if ("ADMIN".equals(role) || "FINANCE".equals(role)) {
            return;
        }

        if ("HIRING_MANAGER".equals(role)) {
            if (po.getAssignment().getHiringManager() != null && po.getAssignment().getHiringManager().getId().equals(currentUser.getId())) {
                return;
            }
            throw new AccessDeniedException("Access Denied: You can only view Purchase Orders for assignments you manage.");
        }

        if ("VENDOR".equals(role) || "VENDOR_MANAGER".equals(role)) {
            if (po.getVendor().getId().equals(currentUser.getId()) ||
                    (po.getAssignment().getVendor() != null && po.getAssignment().getVendor().getId().equals(currentUser.getId()))) {
                return;
            }
            throw new AccessDeniedException("Access Denied: You can only view Purchase Orders assigned to your Vendor profile.");
        }

        throw new AccessDeniedException("Access Denied: You do not have permissions to view this Purchase Order.");
    }

    private PurchaseOrderResponseDTO mapToDto(PurchaseOrder po) {
        return PurchaseOrderResponseDTO.builder()
                .id(po.getId())
                .assignmentId(po.getAssignment().getId())
                .vendorId(po.getVendor().getId())
                .vendorName(po.getVendor().getName())
                .contractorName(po.getAssignment().getContractorProfile().getUser().getName())
                .poAmount(po.getPoAmount())
                .currency(po.getCurrency())
                .issuedDate(po.getIssuedDate())
                .expiryDate(po.getExpiryDate())
                .status(po.getStatus().name())
                .build();
    }
}