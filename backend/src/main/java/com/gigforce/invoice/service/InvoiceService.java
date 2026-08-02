package com.gigforce.invoice.service;

import com.gigforce.invoice.dto.ContractorInvoiceRequestDTO;
import com.gigforce.invoice.dto.ContractorInvoiceResponseDTO;

import com.gigforce.invoice.dto.BatchInvoiceRequestDTO;
import com.gigforce.invoice.dto.BatchInvoiceResponseDTO;

import java.util.List;

public interface InvoiceService {

    BatchInvoiceResponseDTO previewMonthlyInvoices(Integer year, Integer month);

    BatchInvoiceResponseDTO generateMonthlyInvoices(BatchInvoiceRequestDTO request);

    ContractorInvoiceResponseDTO createInvoice(ContractorInvoiceRequestDTO request);

    ContractorInvoiceResponseDTO getInvoiceById(String id);

    List<ContractorInvoiceResponseDTO> getAllInvoices();

    ContractorInvoiceResponseDTO approveInvoice(String id);

    ContractorInvoiceResponseDTO rejectInvoice(String id);

    ContractorInvoiceResponseDTO submitInvoice(String id);

    ContractorInvoiceResponseDTO cancelInvoice(String id);

    ContractorInvoiceResponseDTO updateInvoice(String id, ContractorInvoiceRequestDTO request);

    List<ContractorInvoiceResponseDTO> searchInvoices(
            String invoiceId,
            String invoiceNumber,
            String assignmentId,
            String contractorProfileId,
            String vendorId,
            com.gigforce.invoice.enums.InvoiceStatus status,
            java.time.LocalDate billingStartDate,
            java.time.LocalDate billingEndDate,
            java.time.LocalDate invoiceDate,
            java.time.LocalDate paymentDate,
            String orgUnitId);
}
