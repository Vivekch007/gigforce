package com.gigforce.common.id;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "id_sequences")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class IdSequence {

    @Id
    @Column(name = "prefix", length = 16)
    private String prefix;

    @Column(name = "'last_value'")
    private Long lastValue;
}
