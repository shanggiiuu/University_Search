package com.tumo.finalproject.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A university one user has saved to their favorites — one row in the
 * {@code favorites} table.
 *
 * <p>Why not just store a {@link University}? Because a favorite needs two extra things
 * a University DTO does not have: a database primary key, and the {@code username}
 * of the person who saved it. {@code FavoriteUniversity} is the database shape;
 * {@link University} is the shape the browser sees. {@code FavoritesService} converts
 * between them.
 *
 * <p>Since the Hipolabs API has no id field, store the same synthetic
 * {@code universityId} you invented in {@link University} — that is what
 * distinguishes one saved row from another and what the frontend uses to
 * un-favorite by id.
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
 * <h2>TODO 3 — stop the same university being favorited twice</h2>
 * Import {@code jakarta.persistence.UniqueConstraint} and extend the
 * {@code @Table} annotation below so the <i>pair</i> (username, universityId) must
 * be unique:
 * <pre>
 *   &#64;Table(name = "favorites",
 *          uniqueConstraints = &#64;UniqueConstraint(columnNames = {"username", "universityId"}))
 * </pre>
 * Two different users may both favorite the same university; one user may not
 * favorite it twice. Add this only after TODO 1, or Hibernate will fail at startup
 * naming a column that does not exist yet.
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
@Table(name = "favorites")
public class FavoriteUniversity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // TODO: remaining fields, constructors, getters and setters go here.
}
