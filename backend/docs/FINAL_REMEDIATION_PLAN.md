# Final Remediation Plan

This remediation plan provides the exact code patches and implementation steps required to resolve all database schema gaps, prefix format deviations, and swagger documentation omissions.

---

## 1. ID Generation Prefix Remediation

### Code Patch for ID Generation
To transition custom IDs from lowercase unpadded (e.g. `cnt1`) to uppercase 3-digit zero-padded (e.g. `CNT001`) formats, apply the following updates:

#### Update 1: Prefix Mapping in [IdGenerationListener.java](file:///c:/Users/HP/Downloads/gigforce_1/src/main/java/com/gigforce/common/id/IdGenerationListener.java)
Modify `determinePrefix` to return uppercase prefixes and match all required module prefixes:

```diff
-    private String determinePrefix(Object entity) {
-        if (entity instanceof User user) {
-            UserRole role = user.getRole();
-            if (role == null)
-                return "usr";
-            return switch (role) {
-                case ADMIN -> "adm";
-                case CONTRACTOR -> "cnt";
-                case HIRING_MANAGER -> "hr";
-                case VENDOR -> "ven";
-                case VENDOR_MANAGER -> "vm";
-                case FINANCE -> "fin";
-            };
-        }
-
-        if (entity instanceof com.gigforce.identity.entity.ContractorProfile) {
-            return "cp";
-        }
-        if (entity instanceof com.gigforce.identity.entity.ContractorCertification) {
-            return "cert";
-        }
-        if (entity instanceof com.gigforce.identity.entity.ContractorAbsence) {
-            return "abs";
-        }
-        if (entity instanceof com.gigforce.identity.entity.ContractorSkill) {
-            return "csk";
-        }
-        if (entity instanceof com.gigforce.identity.entity.EngagementHistory) {
-            return "eng";
-        }
-        if (entity instanceof com.gigforce.assignment.entity.Assignment) {
-            return "asn";
-        }
-        if (entity instanceof com.gigforce.assignment.entity.AssignmentAmendment) {
-            return "asm";
-        }
-        if (entity instanceof com.gigforce.assignment.entity.Timesheet) {
-            return "tsm";
-        }
-        if (entity instanceof com.gigforce.assignment.entity.TimesheetApproval) {
-            return "tsa";
-        }
-        if (entity instanceof com.gigforce.assignment.entity.TimesheetComment) {
-            return "tsc";
-        }
-        if (entity instanceof com.gigforce.assignment.entity.TimesheetLine) {
-            return "tsl";
-        }
-        if (entity instanceof com.gigforce.audit.entity.AuditLog) {
-            return "aud";
-        }
-        if (entity instanceof com.gigforce.identity.entity.Skill) {
-            return "sk";
-        }
-        if (entity instanceof com.gigforce.requisition.entity.ResourceRequisition) {
-            return "req";
-        }
-        if (entity instanceof com.gigforce.requisition.entity.VendorSubmission) {
-            return "vsb";
-        }
-
-        return "id";
-    }
+    private String determinePrefix(Object entity) {
+        if (entity instanceof User user) {
+            UserRole role = user.getRole();
+            if (role == null) return "USER";
+            return switch (role) {
+                case ADMIN -> "ADMIN";
+                case CONTRACTOR -> "CNT";
+                case HIRING_MANAGER -> "HM";
+                case VENDOR -> "VEN";
+                case VENDOR_MANAGER -> "VM";
+                case FINANCE -> "FIN";
+            };
+        }
+        if (entity instanceof com.gigforce.identity.entity.ContractorProfile) return "CP";
+        if (entity instanceof com.gigforce.identity.entity.ContractorCertification) return "CERT";
+        if (entity instanceof com.gigforce.identity.entity.ContractorAbsence) return "ABS";
+        if (entity instanceof com.gigforce.identity.entity.EngagementHistory) return "ENG";
+        if (entity instanceof com.gigforce.requisition.entity.ResourceRequisition) return "REQ";
+        if (entity instanceof com.gigforce.requisition.entity.VendorSubmission) return "VS";
+        if (entity instanceof com.gigforce.assignment.entity.Assignment) return "ASN";
+        if (entity instanceof com.gigforce.assignment.entity.AssignmentAmendment) return "AMD";
+        if (entity instanceof com.gigforce.assignment.entity.Timesheet) return "TS";
+        if (entity instanceof com.gigforce.assignment.entity.TimesheetLine) return "TSL";
+        if (entity instanceof com.gigforce.audit.entity.AuditLog) return "AUD";
+        return "GEN";
+    }
```

#### Update 2: Zero Padding in [IdGeneratorServiceImpl.java](file:///c:/Users/HP/Downloads/gigforce_1/src/main/java/com/gigforce/common/id/IdGeneratorServiceImpl.java)
Modify `generateId` to apply zero padding using `String.format()`:

```diff
     @Override
     @Transactional
     public synchronized String generateId(String prefix) {
         IdSequence seq = repository.findById(prefix).orElse(null);
         if (seq == null) {
             seq = new IdSequence(prefix, 1L);
         } else {
             seq.setLastValue(seq.getLastValue() + 1);
         }
         repository.save(seq);
-        return prefix + seq.getLastValue();
+        return prefix + String.format("%03d", seq.getLastValue());
     }
```

---

## 2. Database Schema Gap Remediation

### User Table Update
To add the missing `OrgUnitID` to the [User.java](file:///c:/Users/HP/Downloads/gigforce_1/src/main/java/com/gigforce/identity/entity/User.java) entity:

```java
    @Column(name = "org_unit_id", length = 64)
    private String orgUnitId;
```

### ContractorProfile Table Update
To add `DisplayName`, `PrimarySkill`, `SkillTags`, and `PreferredEngagementType` fields to the [ContractorProfile.java](file:///c:/Users/HP/Downloads/gigforce_1/src/main/java/com/gigforce/identity/entity/ContractorProfile.java) entity:

```java
    @Column(name = "display_name", length = 150)
    private String displayName;

    @Column(name = "primary_skill", length = 100)
    private String primarySkill;

    @Column(name = "skill_tags", length = 255)
    private String skillTags;

    @Column(name = "preferred_engagement_type", length = 30)
    private String preferredEngagementType; // REMOTE, ONSITE, HYBRID
```

### ResourceRequisition Table Update
To add the missing `BusinessUnitID` to [ResourceRequisition.java](file:///c:/Users/HP/Downloads/gigforce_1/src/main/java/com/gigforce/requisition/entity/ResourceRequisition.java):

```java
    @Column(name = "business_unit_id", length = 64)
    private String businessUnitId;
```

### TimesheetLine Table Update
To add a `status` column to [TimesheetLine.java](file:///c:/Users/HP/Downloads/gigforce_1/src/main/java/com/gigforce/assignment/entity/TimesheetLine.java):

```java
    @Column(name = "status", length = 30)
    private String status; // PENDING, APPROVED, REJECTED
```

---

## 3. Swagger OpenAPI Schema Remediations

To populate Swagger with property descriptions and sample values, decorate the request DTO properties with `@Schema` annotations.

### Example Patch: [ContractorProfileRequestDTO.java](file:///c:/Users/HP/Downloads/gigforce_1/src/main/java/com/gigforce/identity/dto/ContractorProfileRequestDTO.java)

```java
package com.gigforce.identity.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

@Schema(description = "Contractor profile creation and update request payload")
public class ContractorProfileRequestDTO {

    @Schema(description = "Associated unique User ID", example = "CNT001", required = true)
    @NotNull(message = "User ID is required")
    private String userId;

    @Schema(description = "Billing hourly rate", example = "45.50", required = true)
    @NotNull(message = "Hourly rate is required")
    @DecimalMin(value = "0.01", message = "Hourly rate must be greater than 0")
    private BigDecimal hourlyRate;

    @Schema(description = "Total years of contractor experience", example = "5", required = true)
    @NotNull(message = "Experience years is required")
    @Min(value = 0, message = "Experience years must be at least 0")
    private Integer experienceYears;
}
```
Apply similar `@Schema` decorators to all other request and response DTO definitions.
