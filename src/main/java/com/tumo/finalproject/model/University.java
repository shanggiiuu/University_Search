package com.tumo.finalproject.model;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.Objects;

/**
 * A university as the API sends it to the browser.
 *
 * <p>This is a plain data class (a DTO) — NOT a database entity. It carries
 * Hipolabs University API search results, favorites/watchlist responses, and the
 * universities the chatbot recommends. Start with this class: almost everything
 * else depends on it.
 *
 * <p>The Hipolabs API ({@code http://universities.hipolabs.com/search?country=...})
 * returns objects shaped like:
 * <pre>
 *   {
 *     "name": "University of the Philippines",
 *     "country": "Philippines",
 *     "alpha_two_code": "PH",
 *     "domains": ["up.edu.ph"],
 *     "web_pages": ["http://www.up.edu.ph/"],
 *     "state-province": null
 *   }
 * </pre>
 * Note it has <b>no id field</b> — you must invent a stable one yourself (e.g. a
 * hash of {@code name + country}) so favorites/watchlist, which are looked up by
 * {@code int id}, can identify a university consistently across requests.
 *
 * <h2>TODO 1 — declare the fields (all private)</h2>
 * <pre>
 *   int          id        synthetic, stable id you derive (not from the API)
 *   String       name      the university's name
 *   String       country
 *   List&lt;String&gt; domains   e.g. ["up.edu.ph"] — used for both the site and email row
 *   List&lt;String&gt; webPages  e.g. ["http://www.up.edu.ph/"]
 * </pre>
 *
 * <h2>TODO 2 — annotate the multi-word field</h2>
 * The API's JSON and our frontend both use snake_case; Java uses camelCase. Jackson
 * (the library that converts between Java objects and JSON) bridges the two, but
 * only if you tell it the JSON name. Import
 * {@code com.fasterxml.jackson.annotation.JsonProperty} and add:
 * <pre>
 *   &#64;JsonProperty("web_pages")   above webPages
 * </pre>
 * Skip this and the page will show no website link, because both the Hipolabs
 * response and {@code js/app.js} use {@code web_pages}.
 *
 * <h2>TODO 3 — add two constructors</h2>
 * <ul>
 *   <li>A no-argument constructor. Jackson needs it to build a University from JSON.</li>
 *   <li>A constructor taking all five fields, in the order listed above.</li>
 * </ul>
 *
 * <h2>TODO 4 — add a getter and a setter for every field</h2>
 * ({@code getId}/{@code setId}, {@code getName}/{@code setName}, and so on.)
 * Your IDE can generate them: right-click → Generate → Getter and Setter.
 * Jackson builds the JSON response from the getters, so a missing getter means a
 * missing field in the browser.
 */
public class University {

    private int universityId;
    private String name;
    private String country;

    @JsonProperty("alpha_two_code")
    private String alphaTwoCode;

    @JsonProperty("state-province")
    private String stateProvince;

    private List<String> domains;

    @JsonProperty("web_pages")
    private List<String> webPages;

    public University() {
    }

    public University(int universityId, String name, String country, String alphaTwoCode,
                      String stateProvince, List<String> domains, List<String> webPages) {
        this.universityId = universityId;
        this.name = name;
        this.country = country;
        this.alphaTwoCode = alphaTwoCode;
        this.stateProvince = stateProvince;
        this.domains = domains;
        this.webPages = webPages;
    }

    public int getUniversityId() {
        return universityId;
    }

    public void setUniversityId(int universityId) {
        this.universityId = universityId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public String getAlphaTwoCode() {
        return alphaTwoCode;
    }

    public void setAlphaTwoCode(String alphaTwoCode) {
        this.alphaTwoCode = alphaTwoCode;
    }

    public String getStateProvince() {
        return stateProvince;
    }

    public void setStateProvince(String stateProvince) {
        this.stateProvince = stateProvince;
    }

    public List<String> getDomains() {
        return domains;
    }

    public void setDomains(List<String> domains) {
        this.domains = domains;
    }

    public List<String> getWebPages() {
        return webPages;
    }

    public void setWebPages(List<String> webPages) {
        this.webPages = webPages;
    }

    /**
     * Generates a stable synthetic id from name + country, since Hipolabs
     * provides none. Same name+country always produces the same id, so
     * favoriting/un-favoriting keeps working across different searches.
     */
    public static int generateId(String name, String country) {
        return Objects.hash(name, country);
    }
}