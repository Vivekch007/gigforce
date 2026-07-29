package com.gigforce.common.id;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IdGeneratorServiceImpl implements IdGeneratorService {

    private final IdSequenceRepository repository;

    public IdGeneratorServiceImpl(IdSequenceRepository repository) {
        this.repository = repository;
    }

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
        if ("PO-".equals(prefix) || "INV-".equals(prefix) || "PAY-".equals(prefix) || "WR-".equals(prefix) || "NOT-".equals(prefix)) {
            return prefix + String.format("%03d", seq.getLastValue());
        }
        return prefix + seq.getLastValue();
    }
}
