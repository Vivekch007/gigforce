package com.gigforce.invoice.service;

import com.gigforce.invoice.dto.ContractorInvoiceRequestDTO;
import com.gigforce.invoice.dto.ContractorInvoiceResponseDTO;

import java.util.List;

public interface InvoiceService {

    ContractorInvoiceResponseDTO createInvoice(ContractorInvoiceRequestDTO request);

    ContractorInvoiceResponseDTO getInvoiceById(String id);

    List<ContractorInvoiceResponseDTO> getAllInvoices();

    ContractorInvoiceResponseDTO approveInvoice(String id);

    ContractorInvoiceResponseDTO rejectInvoice(String id);

    ContractorInvoiceResponseDTO disputeInvoice(String id);

    ContractorInvoiceResponseDTO markInvoiceAsPaid(String id);
}
