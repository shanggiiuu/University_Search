package com.tumo.finalproject.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A university one user saved to their "look at later" list — one row in the
 * {@code watchlist} table.
 *
 * <p>This is deliberately almost identical to {@link FavoriteUniversity}: same fields,
 * different table, so the two lists stay independent. Once both work, ask
 * yourself how you would remove the duplication (hint: a shared abstract parent
 * class, or JPA's {@code @MappedSuperclass}) — that is a good stretch goal.
 *
 * <p>Since the Hipolabs API has no id field, store the same synthetic
 * {@code universityId} you invented in {@link University}.
 *
 * <h2>TODO 1 — declare the remaining fields (all private)</h2>
 * <pre>
 *   String username        who saved this university
 *   int    universityId    the synthetic id from {@link University} (not our primary key!)
 *   String name
 *   String country
 *   String domain          the primary domain, e.g. "up.edu.ph" (used for the site and email row)
 *   String website          the primary web page URL, e.g. "http://www.up.edu.ph/"
 * </pre>
 *
 * <h2>TODO 2 — annotate the fields</h2>
 * Import {@code jakarta.persistence.Column} and add:
 * <pre>
 *   &#64;Column(nullable = false)     above username and above universityId
 * </pre>
 *
 * <h2>TODO 3 — make (username, universityId) unique</h2>
 * Import {@code jakarta.persistence.UniqueConstraint} and extend {@code @Table}:
 * <pre>
 *   &#64;Table(name = "watchlist",
 *          uniqueConstraints = &#64;UniqueConstraint(columnNames = {"username", "universityId"}))
 * </pre>
 * Add this only after TODO 1, or Hibernate will fail at startup naming a column
 * that does not exist yet.
 *
 * <h2>TODO 4 — add two constructors</h2>
 * <ul>
 *   <li>A no-argument constructor (required by JPA).</li>
 *   <li>A constructor taking all six fields, in the order listed above.</li>
 * </ul>
 *
 * <h2>TODO 5 — add getters and setters for every field, including {@code id}</h2>
 */
@Entity
@Table(name = "watchlist")
public class WatchlistItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // TODO: remaining fields, constructors, getters and setters go here.
}
