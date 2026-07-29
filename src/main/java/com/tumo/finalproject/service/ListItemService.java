package com.tumo.finalproject.service;

import com.tumo.finalproject.model.ListItem;
import com.tumo.finalproject.model.University;
import com.tumo.finalproject.repository.ListitemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * The "watch later" list: same operations as {@link FavoritesService}, stored in a
 * different table so the two lists stay independent.
 */
@Service
public class ListItemService {

    private final ListitemRepository listitemRepository;

    public ListItemService(ListitemRepository listitemRepository) {
        this.listitemRepository = listitemRepository;
    }

    public List<University> getWatchlist(String username) {
        return listitemRepository.findByUsername(username).stream()
                .map(this::toUniversity)
                .toList();
    }

    public University addToWatchlist(String username, University university) {
        boolean alreadySaved = listitemRepository.existsByUsernameAndUniversityId(
                username, university.getUniversityId());
        if (!alreadySaved) {
            listitemRepository.save(toEntity(username, university));
        }
        return university;
    }

    @Transactional
    public boolean removeFromWatchlist(String username, int universityId) {
        return listitemRepository.deleteByUsernameAndUniversityId(username, universityId) > 0;
    }

    private University toUniversity(ListItem w) {
        University u = new University();
        u.setUniversityId(w.getUniversityId());
        u.setName(w.getName());
        u.setCountry(w.getCountry());
        u.setDomains(w.getDomain() != null ? List.of(w.getDomain()) : List.of());
        u.setWebPages(w.getWebsite() != null ? List.of(w.getWebsite()) : List.of());
        return u;
    }

    private ListItem toEntity(String username, University u) {
        String domain = (u.getDomains() != null && !u.getDomains().isEmpty())
                ? u.getDomains().get(0) : null;
        String website = (u.getWebPages() != null && !u.getWebPages().isEmpty())
                ? u.getWebPages().get(0) : null;

        return new ListItem(
                username,
                u.getUniversityId(),
                u.getName(),
                u.getCountry(),
                domain,
                website
        );
    }
}