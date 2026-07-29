package com.tumo.finalproject.controller;

import com.tumo.finalproject.model.University;
import com.tumo.finalproject.service.FavoritesService;
import com.tumo.finalproject.service.TmdbService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * HTTP endpoints for searching universities (via the Hipolabs University API,
 * {@code http://universities.hipolabs.com}) and managing favorites.
 */
@RestController
@RequestMapping("/api/university")
public class UniversityController {

    private final TmdbService tmdbService;
    private final FavoritesService favoritesService;

    public UniversityController(TmdbService tmdbService, FavoritesService favoritesService) {
        this.tmdbService = tmdbService;
        this.favoritesService = favoritesService;
    }

    @GetMapping("/search")
    public ResponseEntity<List<University>> searchUniversity(@RequestParam String query) {
        if (query == null || query.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(tmdbService.searchUniversity(query));
    }

    @GetMapping("/favorites")
    public ResponseEntity<List<University>> getFavorites(HttpSession session) {
        String username = currentUser(session);
        if (username == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(favoritesService.getFavorites(username));
    }

    @PostMapping("/favorites")
    public ResponseEntity<University> addFavorite(@RequestBody University university, HttpSession session) {
        String username = currentUser(session);
        if (username == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(favoritesService.addFavorite(username, university));
    }

    @DeleteMapping("/favorites/{id}")
    public ResponseEntity<Void> removeFavorite(@PathVariable int id, HttpSession session) {
        String username = currentUser(session);
        if (username == null) {
            return ResponseEntity.status(401).build();
        }
        boolean removed = favoritesService.removeFavorite(username, id);
        return removed ? ResponseEntity.ok().build() : ResponseEntity.notFound().build();
    }

    private String currentUser(HttpSession session) {
        return (String) session.getAttribute("username");
    }
}