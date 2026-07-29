package com.tumo.finalproject.repository;

import com.tumo.finalproject.model.ListItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * Database access for {@link ListItem}. The mirror image of
 * {@link FavoriteRepository}, pointing at a different entity and table.
 */
public interface ListitemRepository extends JpaRepository<ListItem, Long> {

    List<ListItem> findByUsername(String username);

    boolean existsByUsernameAndUniversityId(String username, int universityId);

    long deleteByUsernameAndUniversityId(String username, int universityId);
}
