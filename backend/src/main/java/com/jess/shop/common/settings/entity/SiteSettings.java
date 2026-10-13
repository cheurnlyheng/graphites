package com.jess.shop.common.settings.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** Singleton row (id is always 1 -- enforced by the table's own CHECK constraint, see
 * V23__add_site_settings.sql) holding site-wide toggles. Just maintenance mode today. */
@Entity
@Table(name = "site_settings")
@Getter
@Setter
@NoArgsConstructor
public class SiteSettings {

    public static final int SINGLETON_ID = 1;

    @Id
    private Integer id;

    @Column(name = "maintenance_mode", nullable = false)
    private boolean maintenanceMode;

    @Column(name = "maintenance_message")
    private String maintenanceMessage;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
