package com.tumo.finalproject.service;

import com.tumo.finalproject.model.University;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;


import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
/**
 * Talks to The Movie Database (TMDB) so our app can search real movies.
 *
 * <p>{@code @Service} marks this class as a Spring-managed component, which is why
 * {@code MovieController} can ask for a {@code TmdbService} in its constructor and
 * simply receive one. That is <b>dependency injection</b>: you never write
 * {@code new TmdbService(...)} yourself.
 *
 * <p>The API you are calling:
 * <pre>
 *   GET https://api.themoviedb.org/3/search/movie?api_key=YOUR_KEY&amp;query=batman
 * </pre>
 * Paste that in a browser (with your own key) to see the JSON you have to parse.
 * The part we care about is the {@code "results"} array; each element has
 * {@code id}, {@code title}, {@code overview}, {@code vote_average},
 * {@code release_date} and {@code poster_path}.
 */
@Service
public class TmdbService {

    /**
     * Sends the HTTP requests. {@code WebClient} is Spring's modern HTTP client.
     * TODO: build this in the constructor.
     */
    private WebClient webClient;

    /**
     * Turns JSON text into objects we can navigate.
     * TODO: create this in the constructor.
     */
    private ObjectMapper objectMapper;

    /**
     * Separate client for Wikipedia's public summary API, used only to fetch a
     * real campus photo for the curated Top Universities list. No API key
     * needed — it's a free, unauthenticated endpoint.
     */
    private final WebClient wikipediaClient;

    /**
     * Client for Wikipedia/MediaWiki's action API ({@code /w/api.php}), used as a
     * fallback when the summary API's thumbnail turns out to be a coat of
     * arms/seal/logo rather than an actual campus photo (common for older
     * universities, e.g. Harvard's summary thumbnail is its coat of arms).
     */
    private final WebClient wikipediaActionClient;

    /** Your personal TMDB key, read from {@code application.properties}. */

    /**
     * Spring calls this constructor at startup. {@code @Value} pulls
     * {@code tmdb.api.key} out of {@code application.properties} — which in turn
     * reads it from your {@code TMDB_API_KEY} environment variable — and passes it
     * in, so the secret never has to be written in the source code.
     *
     * <h2>TODO — initialise the two fields above</h2>
     * <pre>
     *   this.objectMapper = new ObjectMapper();
     *
     *   this.webClient = WebClient.builder()
     *           .baseUrl("https://api.themoviedb.org/3")
     *           .build();
     * </pre>
     * Setting a {@code baseUrl} once means every request below only needs the path
     * ({@code "/search/movie"}) instead of the whole URL.
     */
    public TmdbService(){
        this.objectMapper = new ObjectMapper();
        this.webClient = WebClient.builder()
                .baseUrl("http://universities.hipolabs.com")
                // Some countries (e.g. "United States") return a JSON response well
                // over WebClient's default 256KB in-memory buffer limit.
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(10 * 1024 * 1024))
                .build();

        this.wikipediaClient = WebClient.builder()
                .baseUrl("https://en.wikipedia.org/api/rest_v1/page/summary")
                .build();

        this.wikipediaActionClient = WebClient.builder()
                .baseUrl("https://en.wikipedia.org/w/api.php")
                .build();
    }

    /**
     * Searches TMDB and returns every movie it found, or an empty list if there
     * were no matches.
     *
     * <h2>TODO — implement in two steps</h2>
     * <b>Step 1: fetch the JSON.</b> Perform a GET and block until the response
     * arrives (blocking keeps things simple while you are learning):
     * <pre>
     *   String response = webClient.get()
     *           .uri(uriBuilder -&gt; uriBuilder
     *                   .path("/search/movie")
     *                   .queryParam("api_key", apiKey)
     *                   .queryParam("query", query)
     *                   .build())
     *           .retrieve()
     *           .bodyToMono(String.class)
     *           .block();
     * </pre>
     * Use {@code queryParam} rather than gluing the URL together with {@code +}:
     * it URL-encodes the value for you, so a search for "Spider-Man 2" or a title
     * containing "&amp;" still works.
     *
     * <p><b>Step 2:</b> hand the text to {@link #parseUniversity(String)} and return
     * the result.
     *
     * @param query what the user typed, e.g. "batman"
     */
    /**
     * A few common country names/abbreviations that don't match Hipolabs' own
     * country spelling (which is the full official-ish name, e.g. "United States").
     */
    private static final Map<String, String> COUNTRY_ALIASES = Map.of(
            "usa", "United States",
            "us", "United States",
            "u.s.a.", "United States",
            "uk", "United Kingdom"
    );

    public List<University> searchUniversity(String query) {
        String normalizedCountry = COUNTRY_ALIASES.getOrDefault(query.trim().toLowerCase(), query);

        List<University> byCountry = fetchUniversities("country", normalizedCountry);
        if (!byCountry.isEmpty()) {
            return byCountry;
        }
        // Not every search is a country — e.g. "Wollongong" or "Waterloo" are
        // university names, so fall back to Hipolabs' name search before giving up.
        return fetchUniversities("name", query);
    }

    private List<University> fetchUniversities(String paramName, String paramValue) {
        String response = webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/search")
                        .queryParam(paramName, paramValue)
                        .build())
                .retrieve()
                .bodyToMono(String.class)
                .block();
        return parseUniversity(response);
    }

    /**
     * Returns TMDB's single best match for a title, or {@code null} if there is
     * none. The chatbot uses this to turn a recommended title like
     * "Blade Runner 2049" into a real movie the user can save.
     *
     * <h2>TODO — implement</h2>
     * Reuse {@link #searchUniversity(String)}; do not duplicate the HTTP code. Call
     * it, then return the first element of the list — or {@code null} when the
     * list is empty. Never call {@code get(0)} without checking first, or you get
     * an {@code IndexOutOfBoundsException}.
     */
    public University searchOne(String title) {
        List<University> movies = searchUniversity(title);
        return movies.isEmpty() ? null : movies.get(0);
    }

    /**
     * A curated list of globally well-regarded universities, used to seed the
     * "Top Universities" spotlight on the home page and the default view of the
     * Universities tab. Hipolabs has no ranking/popularity data, so we hand-pick
     * real, well-known names here and resolve each one through {@link #searchOne}
     * to get back a full, saveable {@link University}.
     *
     * <p>Each entry maps the exact name Hipolabs searches by to the Wikipedia
     * article title used to fetch a campus photo — the two occasionally differ
     * (e.g. Hipolabs lists ETH Zurich as {@code "ETHZ - ETH Zurich"}).
     */
    private static final Map<String, String> TOP_UNIVERSITY_NAMES = new LinkedHashMap<>();

    static {
        TOP_UNIVERSITY_NAMES.put("Massachusetts Institute of Technology", "Massachusetts Institute of Technology");
        TOP_UNIVERSITY_NAMES.put("Harvard University", "Harvard University");
        TOP_UNIVERSITY_NAMES.put("Stanford University", "Stanford University");
        TOP_UNIVERSITY_NAMES.put("University of Oxford", "University of Oxford");
        TOP_UNIVERSITY_NAMES.put("University of Cambridge", "University of Cambridge");
        TOP_UNIVERSITY_NAMES.put("ETHZ - ETH Zurich", "ETH Zurich");
        TOP_UNIVERSITY_NAMES.put("National University of Singapore", "National University of Singapore");
        TOP_UNIVERSITY_NAMES.put("California Institute of Technology", "California Institute of Technology");
        TOP_UNIVERSITY_NAMES.put("Imperial College London", "Imperial College London");
        TOP_UNIVERSITY_NAMES.put("University of Tokyo", "University of Tokyo");
        TOP_UNIVERSITY_NAMES.put("University of Toronto", "University of Toronto");
        TOP_UNIVERSITY_NAMES.put("University of Melbourne", "University of Melbourne");
    }

    public List<University> getTopUniversities() {
        List<University> top = new ArrayList<>();
        Set<Integer> seenIds = new HashSet<>();
        for (Map.Entry<String, String> entry : TOP_UNIVERSITY_NAMES.entrySet()) {
            try {
                University uni = searchOne(entry.getKey());
                if (uni != null && seenIds.add(uni.getUniversityId())) {
                    uni.setImageUrl(getCampusImage(entry.getValue()));
                    top.add(uni);
                }
            } catch (Exception ignored) {
                // one bad lookup shouldn't take down the whole list
            }
        }
        return top;
    }

    /**
     * Looks up a campus photo for any university by name, used by the
     * {@code /api/university/image} endpoint so search results and the detail
     * modal can show a real photo instead of just a flag/icon, without paying
     * the cost of resolving every search result up front.
     *
     * <p>The summary API's thumbnail is usually a real photo, but for many
     * older universities it's actually the coat of arms/seal (e.g. Harvard).
     * When that happens we fall back to {@link #fetchCampusPhotoFromArticleImages}
     * to find an actual building/campus photo elsewhere in the article.
     */
    public String getCampusImage(String universityName) {
        String thumbnail = fetchWikipediaImage(universityName);
        if (thumbnail != null && !looksLikeLogo(thumbnail)) {
            return thumbnail;
        }
        return fetchCampusPhotoFromArticleImages(universityName);
    }

    /** Filenames/URLs containing any of these are a crest, seal or logo, not a photo. */
    private static final List<String> LOGO_KEYWORDS = List.of(
            "coat_of_arms", "coatofarms", "seal", "crest", "logo", "wordmark",
            "emblem", "shield", "insignia", "monogram"
    );

    /** Words that suggest a filename actually depicts campus buildings/grounds. */
    private static final List<String> CAMPUS_KEYWORDS = List.of(
            "campus", "aerial", "building", "hall", "yard", "library", "tower",
            "quad", "gate", "skyline", "view", "college", "university"
    );

    private boolean looksLikeLogo(String urlOrTitle) {
        String lower = urlOrTitle.toLowerCase();
        // Almost every crest/seal/flag on Wikipedia is stored as an SVG; real
        // campus photography is essentially always a JPEG.
        if (lower.contains(".svg")) return true;
        return LOGO_KEYWORDS.stream().anyMatch(lower::contains);
    }

    /**
     * Scans every image used in a Wikipedia article for one that looks like an
     * actual campus/building photo, skipping crests, seals, flags and the many
     * unrelated portrait photos (notable alumni, etc.) that show up on
     * well-documented university pages. Returns {@code null} if nothing in the
     * article clearly qualifies, in which case the frontend falls back to a
     * flag/icon — a missing photo is never fatal.
     */
    private String fetchCampusPhotoFromArticleImages(String wikipediaTitle) {
        try {
            String response = wikipediaActionClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .queryParam("action", "query")
                            .queryParam("generator", "images")
                            .queryParam("titles", wikipediaTitle)
                            .queryParam("gimlimit", "50")
                            .queryParam("prop", "imageinfo")
                            .queryParam("iiprop", "url")
                            .queryParam("iiurlwidth", "800")
                            .queryParam("format", "json")
                            .build())
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode pages = objectMapper.readTree(response).path("query").path("pages");
            for (JsonNode page : pages) {
                String fileTitle = page.has("title") ? page.get("title").asString() : "";
                if (looksLikeLogo(fileTitle) || !looksLikeCampusPhoto(fileTitle)) continue;

                JsonNode imageInfo = page.path("imageinfo");
                if (!imageInfo.isArray() || imageInfo.isEmpty()) continue;
                JsonNode first = imageInfo.get(0);
                String url = first.has("thumburl") ? first.get("thumburl").asString()
                        : first.has("url") ? first.get("url").asString() : null;
                if (url != null && !looksLikeLogo(url)) {
                    return url;
                }
            }
        } catch (Exception ignored) {
            // no photo available — the frontend falls back to a placeholder
        }
        return null;
    }

    private boolean looksLikeCampusPhoto(String fileTitle) {
        String lower = fileTitle.toLowerCase();
        return CAMPUS_KEYWORDS.stream().anyMatch(lower::contains);
    }

    /**
     * Looks up a university's campus photo via Wikipedia's public summary API,
     * e.g. {@code /page/summary/Harvard_University}. Returns {@code null} if the
     * article has no thumbnail or the request fails for any reason — the
     * frontend falls back to a flag/icon in that case, so a missing photo is
     * never fatal.
     */
    private String fetchWikipediaImage(String wikipediaTitle) {
        try {
            String response = wikipediaClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/{title}")
                            .build(wikipediaTitle.replace(" ", "_")))
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode root = objectMapper.readTree(response);
            JsonNode thumbnail = root.get("thumbnail");
            if (thumbnail != null && thumbnail.has("source")) {
                return thumbnail.get("source").asString();
            }
        } catch (Exception ignored) {
            // no photo available — the frontend falls back to a placeholder
        }
        return null;
    }

    /**
     * Converts TMDB's raw JSON into a list of {@link University} objects.
     *
     * <p>This method is {@code private} on purpose: it is an internal helper, not
     * something controllers should call. Keeping the JSON details in here means the
     * rest of the app only ever deals with clean {@code Movie} objects.
     *
     * <h2>TODO — implement</h2>
     * <ol>
     *   <li>Create an empty {@code List<Movie>} to collect results into.</li>
     *   <li>Wrap the parsing in {@code try/catch}, because malformed JSON throws.</li>
     *   <li>{@code JsonNode root = objectMapper.readTree(json);} then
     *       {@code JsonNode results = root.get("results");}
     *       (import {@code tools.jackson.databind.JsonNode}).</li>
     *   <li>Check {@code results != null && results.isArray()} before looping —
     *       an error response from TMDB has no {@code results} field at all, and
     *       calling a method on null would crash with a
     *       {@code NullPointerException}.</li>
     *   <li>For each {@code JsonNode node} in {@code results}, create a
     *       {@code new Movie()} and fill it with the setters you wrote:
     *       <pre>
     *   movie.setId(node.get("id").asInt());
     *   movie.setTitle(node.has("title") ? node.get("title").asString() : "");
     *   ... same pattern for overview, vote_average (asDouble),
     *       release_date (asString) and poster_path ...
     *       </pre>
     *       The {@code node.has("...") ? ... : default} check matters: not every
     *       movie in TMDB has a poster or a release date.</li>
     *   <li>Add each movie to the list, and return the list.</li>
     *   <li>In the {@code catch}, throw
     *       {@code new RuntimeException("Failed to parse TMDB response", e)}.
     *       Passing {@code e} as the cause keeps the original stack trace, which
     *       you will want when debugging.</li>
     * </ol>
     */
    private List<University> parseUniversity(String json) {
        List<University> universities = new ArrayList<>();
        try {
            JsonNode root = objectMapper.readTree(json);
            if (root != null && root.isArray()) {
                for (JsonNode node : root) {
                    University uni = new University();

                    uni.setName(node.has("name") ? node.get("name").asString() : "");
                    uni.setCountry(node.has("country") ? node.get("country").asString() : "");
                    uni.setUniversityId(University.generateId(uni.getName(), uni.getCountry()));
                    uni.setAlphaTwoCode(node.has("alpha_two_code") ? node.get("alpha_two_code").asString() : "");
                    uni.setStateProvince(node.has("state-province") && !node.get("state-province").isNull()
                            ? node.get("state-province").asString() : null);
                    uni.setDomains(toStringList(node.get("domains")));
                    uni.setWebPages(toStringList(node.get("web_pages")));

                    universities.add(uni);
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse Hipolabs response", e);
        }
        return universities;
    }

    private List<String> toStringList(JsonNode node) {
        List<String> list = new ArrayList<>();
        if (node != null && node.isArray()) {
            for (JsonNode n : node) {
                list.add(n.asText());
            }
        }
        return list;
    }
}