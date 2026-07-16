(() => {
    "use strict";

    const root =
        window.ThreeTide =
        window.ThreeTide || {};

    const DISCOVER_ID =
        "threetide-discover";

    const SEARCH_DELAY_MS =
        450;

    const TMDB_IMAGE_BASE =
        "https://image.tmdb.org/t/p/";

    let initialized = false;
    let activeDialog = null;
    let activeDiscover = null;
    let searchTimer = null;
    let searchController = null;

    function getApi() {
        return root.Api;
    }

    function getUi() {
        return root.UI;
    }

    function getConfig() {
        return (
            window.__THREETIDE_CONFIG__ ||
            {}
        );
    }

    function escapeHtml(value) {
        const element =
            document.createElement("div");

        element.textContent =
            String(value ?? "");

        return element.innerHTML;
    }

    function normalizeResults(response) {
        if (!response) {
            return [];
        }

        if (Array.isArray(response)) {
            return response;
        }

        if (Array.isArray(response.results)) {
            return response.results;
        }

        if (Array.isArray(response.Results)) {
            return response.Results;
        }

        return [];
    }

    function getMediaType(item) {
        const value =
            item?.mediaType ||
            item?.media_type ||
            item?.type ||
            "";

        return String(value)
            .trim()
            .toLowerCase();
    }

    function getTmdbId(item) {
        return (
            item?.id ||
            item?.tmdbId ||
            item?.tmdb_id ||
            item?.mediaId ||
            ""
        );
    }

    function getTitle(item) {
        return (
            item?.title ||
            item?.name ||
            item?.originalTitle ||
            item?.originalName ||
            "Unbekannter Titel"
        );
    }

    function getOverview(item) {
        return (
            item?.overview ||
            "Für diesen Titel ist derzeit keine Beschreibung verfügbar."
        );
    }

    function getReleaseDate(item) {
        return (
            item?.releaseDate ||
            item?.firstAirDate ||
            item?.release_date ||
            item?.first_air_date ||
            ""
        );
    }

    function getYear(item) {
        const releaseDate =
            getReleaseDate(item);

        if (!releaseDate) {
            return "";
        }

        return String(releaseDate)
            .slice(0, 4);
    }

    function getRating(item) {
        const rating =
            Number(
                item?.voteAverage ??
                item?.vote_average ??
                item?.rating
            );

        if (!Number.isFinite(rating)) {
            return "";
        }

        return rating.toFixed(1);
    }

    function getPosterPath(item) {
        return (
            item?.posterPath ||
            item?.poster_path ||
            ""
        );
    }

    function getBackdropPath(item) {
        return (
            item?.backdropPath ||
            item?.backdrop_path ||
            ""
        );
    }

    function buildTmdbImageUrl(
        path,
        size = "w500"
    ) {
        const normalizedPath =
            String(path || "")
                .trim();

        if (!normalizedPath) {
            return "";
        }

        if (
            /^https?:\/\//i.test(
                normalizedPath
            )
        ) {
            return normalizedPath;
        }

        const safePath =
            normalizedPath.startsWith("/")
                ? normalizedPath
                : `/${normalizedPath}`;

        return `${TMDB_IMAGE_BASE}${size}${safePath}`;
    }

    function getPosterUrl(item) {
        return buildTmdbImageUrl(
            getPosterPath(item),
            "w500"
        );
    }

    function getBackdropUrl(item) {
        return buildTmdbImageUrl(
            getBackdropPath(item),
            "w1280"
        );
    }

    function getTypeLabel(item) {
        return getMediaType(item) === "tv"
            ? "Serie"
            : "Film";
    }

    function buildSeerrItemUrl(item) {
        const config =
            getConfig();

        const baseUrl =
            String(
                config.seerrUrl ||
                ""
            )
                .trim()
                .replace(/\/+$/, "");

        if (!baseUrl) {
            return "";
        }

        const tmdbId =
            getTmdbId(item);

        if (!tmdbId) {
            return baseUrl;
        }

        const mediaType =
            getMediaType(item) === "tv"
                ? "tv"
                : "movie";

        return `${baseUrl}/${mediaType}/${encodeURIComponent(tmdbId)}`;
    }

    function openSeerrItem(item) {
        const config =
            getConfig();

        const url =
            buildSeerrItemUrl(item);

        if (!url) {
            getUi()?.showToast?.({
                title: "3Tide",
                message:
                    "In den Plugin-Einstellungen ist keine Seerr-Adresse hinterlegt.",
                type: "error"
            });

            console.error(
                "[3Tide Discover] Keine Seerr-URL konfiguriert."
            );

            return;
        }

        if (config.openInNewTab) {
            window.open(
                url,
                "_blank",
                "noopener,noreferrer"
            );

            return;
        }

        window.location.assign(url);
    }

    async function submitMediaRequest(item, button) {
        const api = getApi();
        const ui = getUi();

        if (!api?.seerr?.requestMedia) {
            console.error(
                "[3Tide Discover] Seerr-Request-Funktion " +
                "ist nicht verfügbar."
            );

            // Fallback: falls die API-Funktion aus
            // irgendeinem Grund fehlt, wenigstens die
            // Seerr-Seite oeffnen statt gar nichts zu tun.
            openSeerrItem(item);
            return;
        }

        const tmdbId = getTmdbId(item);

        if (!tmdbId) {
            ui?.error?.(
                "Für diesen Titel wurde keine TMDB-ID " +
                "gefunden."
            );

            return;
        }

        const mediaType =
            getMediaType(item) === "tv" ? "tv" : "movie";

        const originalLabel = button.innerHTML;

        button.disabled = true;
        ui?.setLoading?.(button, true, {
            label: "Wird angefragt",
            overlay: false
        });

        try {
            await api.seerr.requestMedia(
                Number(tmdbId),
                mediaType
            );

            ui?.success?.(
                `„${getTitle(item)}“ wurde erfolgreich ` +
                "angefragt."
            );

            button.innerHTML =
                '<span class="material-icons" ' +
                'aria-hidden="true">check_circle</span>' +
                "Angefragt";
        } catch (error) {
            ui?.handleError?.(
                error,
                "Die Anfrage konnte nicht übermittelt werden."
            );

            button.disabled = false;
            button.innerHTML = originalLabel;
        } finally {
            ui?.setLoading?.(button, false);
        }
    }

    function createEmptyState(
        title,
        message
    ) {
        const empty =
            document.createElement("div");

        empty.className =
            "threetide-discover-empty";

        empty.innerHTML = `
            <span class="material-icons"
                  aria-hidden="true">
                search_off
            </span>

            <h3>${escapeHtml(title)}</h3>

            <p>${escapeHtml(message)}</p>
        `;

        return empty;
    }

    function createErrorState(message) {
        const error =
            document.createElement("div");

        error.className =
            "threetide-discover-error";

        error.innerHTML = `
            <span class="material-icons"
                  aria-hidden="true">
                error_outline
            </span>

            <p>${escapeHtml(message)}</p>
        `;

        return error;
    }

    function createSkeletonCard() {
        const card =
            document.createElement("div");

        card.className =
            "threetide-discover-skeleton-card";

        card.innerHTML = `
            <div class="threetide-discover-skeleton-image"></div>
            <div class="threetide-discover-skeleton-line"></div>
            <div class="threetide-discover-skeleton-line threetide-discover-skeleton-line-short"></div>
        `;

        return card;
    }

    function createSkeletonGrid(
        count = 10
    ) {
        const grid =
            document.createElement("div");

        grid.className =
            "threetide-discover-grid threetide-discover-skeleton-grid";

        for (
            let index = 0;
            index < count;
            index += 1
        ) {
            grid.appendChild(
                getUi()?.createSkeletonCard?.() ||
                createSkeletonCard()
            );
        }

        return grid;
    }

    function createPosterCard(item) {
        const card =
            document.createElement("article");

        card.className =
            "threetide-discover-card";

        card.tabIndex = 0;

        card.setAttribute(
            "role",
            "button"
        );

        card.setAttribute(
            "aria-label",
            `${getTitle(item)} öffnen`
        );

        const posterUrl =
            getPosterUrl(item);

        const year =
            getYear(item);

        const rating =
            getRating(item);

        card.innerHTML = `
            <div class="threetide-discover-card-image">
                ${posterUrl
                ? `
                            <img
                                src="${escapeHtml(posterUrl)}"
                                alt="${escapeHtml(getTitle(item))}"
                                loading="lazy"
                                draggable="false">
                          `
                : `
                            <div class="threetide-discover-card-placeholder">
                                <span class="material-icons"
                                      aria-hidden="true">
                                    movie
                                </span>

                                <span>
                                    ${escapeHtml(getTitle(item))}
                                </span>
                            </div>
                          `
            }

                <div class="threetide-discover-card-overlay">
                    <span class="material-icons"
                          aria-hidden="true">
                        info
                    </span>
                </div>
            </div>

            <div class="threetide-discover-card-content">
                <h3>
                    ${escapeHtml(getTitle(item))}
                </h3>

                <div class="threetide-discover-card-meta">
                    <span>
                        ${escapeHtml(getTypeLabel(item))}
                    </span>

                    ${year
                ? `<span>${escapeHtml(year)}</span>`
                : ""
            }

                    ${rating
                ? `<span>★ ${escapeHtml(rating)}</span>`
                : ""
            }
                </div>
            </div>
        `;

        function activate(event) {
            event?.preventDefault();
            event?.stopPropagation();
            event?.stopImmediatePropagation?.();

            showItemDetails(item);
        }

        card.addEventListener(
            "pointerdown",
            (event) => {
                event.stopPropagation();
            }
        );

        card.addEventListener(
            "click",
            activate
        );

        card.addEventListener(
            "keydown",
            (event) => {
                if (
                    event.key !== "Enter" &&
                    event.key !== " "
                ) {
                    return;
                }

                activate(event);
            }
        );

        return card;
    }

    function renderGrid(
        container,
        items,
        emptyMessage =
            "Keine passenden Titel gefunden."
    ) {
        container.replaceChildren();

        if (!items.length) {
            container.appendChild(
                createEmptyState(
                    "Keine Ergebnisse",
                    emptyMessage
                )
            );

            return;
        }

        const grid =
            document.createElement("div");

        grid.className =
            "threetide-discover-grid";

        const fragment =
            document.createDocumentFragment();

        items.forEach((item) => {
            fragment.appendChild(
                createPosterCard(item)
            );
        });

        grid.appendChild(fragment);
        container.appendChild(grid);
    }

    function createSection(
        title,
        subtitle = ""
    ) {
        const section =
            document.createElement("section");

        section.className =
            "threetide-discover-section";

        const header =
            document.createElement("header");

        header.className =
            "threetide-discover-section-header";

        header.innerHTML = `
            <div>
                <h2>${escapeHtml(title)}</h2>

                ${subtitle
                ? `<p>${escapeHtml(subtitle)}</p>`
                : ""
            }
            </div>
        `;

        const content =
            document.createElement("div");

        content.className =
            "threetide-discover-section-content";

        section.append(
            header,
            content
        );

        return {
            section,
            content
        };
    }

    function createDiscoverView() {
        const discover =
            document.createElement("div");

        discover.id =
            DISCOVER_ID;

        discover.className =
            "threetide-discover";

        discover.innerHTML = `
            <div class="threetide-discover-main">
                <div class="threetide-discover-intro">
                    <div>
                        <span class="threetide-discover-eyebrow">
                            3Tide Discover
                        </span>

                        <h1>
                            Was möchtest du sehen?
                        </h1>

                        <p>
                            Durchsuche neue Filme und Serien direkt in 3Tide.
                        </p>
                    </div>
                </div>

                <div class="threetide-discover-search">
                    <span class="material-icons"
                          aria-hidden="true">
                        search
                    </span>

                    <input
                        id="threetide-discover-search-input"
                        type="search"
                        autocomplete="off"
                        placeholder="Filme und Serien suchen …"
                        aria-label="Filme und Serien suchen">

                    <button
                        id="threetide-discover-search-clear"
                        type="button"
                        aria-label="Suche leeren"
                        hidden>
                        <span class="material-icons"
                              aria-hidden="true">
                            close
                        </span>
                    </button>
                </div>

                <div id="threetide-discover-search-area"
                     class="threetide-discover-search-area"
                     hidden>
                </div>

                <div id="threetide-discover-default-content">
                </div>
            </div>

            <div class="threetide-discover-details-layer"
                 id="threetide-discover-details-layer"
                 hidden>
            </div>
        `;

        return discover;
    }

    async function loadTrendingSection(
        container,
        mediaType,
        title,
        subtitle
    ) {
        const section =
            createSection(
                title,
                subtitle
            );

        container.appendChild(
            section.section
        );

        section.content.appendChild(
            createSkeletonGrid(10)
        );

        try {
            const api =
                getApi();

            if (
                !api?.seerr?.trending
            ) {
                throw new Error(
                    "Die Seerr-Trending-Schnittstelle ist nicht verfügbar."
                );
            }

            const response =
                await api.seerr.trending(
                    mediaType,
                    1
                );

            const results =
                normalizeResults(response)
                    .filter((item) => {
                        if (
                            mediaType === "all"
                        ) {
                            return true;
                        }

                        return (
                            getMediaType(item) ===
                            mediaType
                        );
                    });

            renderGrid(
                section.content,
                results.slice(0, 20),
                "Seerr hat derzeit keine passenden Titel geliefert."
            );
        } catch (error) {
            console.error(
                "[3Tide Discover] Trending konnte nicht geladen werden.",
                error
            );

            section.content.replaceChildren(
                createErrorState(
                    error?.message ||
                    "Trending konnte nicht geladen werden."
                )
            );
        }
    }

    async function loadTrending(
        defaultContent
    ) {
        defaultContent.replaceChildren();

        await Promise.all([
            loadTrendingSection(
                defaultContent,
                "movie",
                "Trendende Filme",
                "Diese Filme sind aktuell besonders gefragt."
            ),

            loadTrendingSection(
                defaultContent,
                "tv",
                "Trendende Serien",
                "Serien, über die gerade gesprochen wird."
            )
        ]);
    }

    async function performSearch(
        term,
        searchArea,
        defaultContent
    ) {
        const query =
            String(term || "")
                .trim();

        searchController?.abort();

        if (query.length < 2) {
            searchArea.hidden = true;
            defaultContent.hidden = false;
            searchArea.replaceChildren();
            return;
        }

        searchController =
            new AbortController();

        const controller =
            searchController;

        searchArea.hidden = false;
        defaultContent.hidden = true;

        searchArea.replaceChildren(
            createSkeletonGrid(12)
        );

        try {
            const api =
                getApi();

            if (!api?.seerr?.search) {
                throw new Error(
                    "Die Seerr-Suche ist nicht verfügbar."
                );
            }

            const response =
                await api.seerr.search(
                    query,
                    1
                );

            if (controller.signal.aborted) {
                return;
            }

            const results =
                normalizeResults(response)
                    .filter((item) => {
                        const mediaType =
                            getMediaType(item);

                        return (
                            mediaType === "movie" ||
                            mediaType === "tv"
                        );
                    });

            const section =
                createSection(
                    `Suchergebnisse für „${query}“`,
                    `${results.length} Treffer`
                );

            renderGrid(
                section.content,
                results,
                "Für diese Suche wurden keine Filme oder Serien gefunden."
            );

            searchArea.replaceChildren(
                section.section
            );
        } catch (error) {
            if (controller.signal.aborted) {
                return;
            }

            console.error(
                "[3Tide Discover] Suche fehlgeschlagen.",
                error
            );

            searchArea.replaceChildren(
                createErrorState(
                    error?.message ||
                    "Die Suche konnte nicht ausgeführt werden."
                )
            );
        }
    }

    function bindDiscoverEvents(
        discover
    ) {
        discover.addEventListener(
            "click",
            (event) => {
                event.stopPropagation();
            }
        );

        discover.addEventListener(
            "pointerdown",
            (event) => {
                event.stopPropagation();
            }
        );

        discover.addEventListener(
            "wheel",
            (event) => {
                event.stopPropagation();
            },
            {
                passive: true
            }
        );

        const searchInput =
            discover.querySelector(
                "#threetide-discover-search-input"
            );

        const clearButton =
            discover.querySelector(
                "#threetide-discover-search-clear"
            );

        const searchArea =
            discover.querySelector(
                "#threetide-discover-search-area"
            );

        const defaultContent =
            discover.querySelector(
                "#threetide-discover-default-content"
            );

        searchInput.addEventListener(
            "input",
            () => {
                const value =
                    searchInput.value;

                clearButton.hidden =
                    !value;

                window.clearTimeout(
                    searchTimer
                );

                searchTimer =
                    window.setTimeout(
                        () => {
                            performSearch(
                                value,
                                searchArea,
                                defaultContent
                            );
                        },
                        SEARCH_DELAY_MS
                    );
            }
        );

        searchInput.addEventListener(
            "keydown",
            (event) => {
                if (
                    event.key !== "Enter"
                ) {
                    return;
                }

                event.preventDefault();

                window.clearTimeout(
                    searchTimer
                );

                performSearch(
                    searchInput.value,
                    searchArea,
                    defaultContent
                );
            }
        );

        clearButton.addEventListener(
            "click",
            (event) => {
                event.preventDefault();
                event.stopPropagation();

                window.clearTimeout(
                    searchTimer
                );

                searchController?.abort();

                searchInput.value = "";
                clearButton.hidden = true;

                searchArea.hidden = true;
                searchArea.replaceChildren();

                defaultContent.hidden = false;

                searchInput.focus();
            }
        );

        return defaultContent;
    }

    function closeItemDetails() {
        const discover =
            activeDiscover ||
            document.getElementById(
                DISCOVER_ID
            );

        const layer =
            discover?.querySelector(
                "#threetide-discover-details-layer"
            );

        if (!layer) {
            return;
        }

        layer.hidden = true;
        layer.replaceChildren();

        discover.classList.remove(
            "threetide-discover-details-open"
        );
    }

    function showItemDetails(item) {
        const discover =
            activeDiscover ||
            document.getElementById(
                DISCOVER_ID
            );

        const layer =
            discover?.querySelector(
                "#threetide-discover-details-layer"
            );

        if (!discover || !layer) {
            console.error(
                "[3Tide Discover] Detailbereich wurde nicht gefunden."
            );

            return;
        }

        const backdropUrl =
            getBackdropUrl(item);

        const posterUrl =
            getPosterUrl(item);

        const title =
            getTitle(item);

        const year =
            getYear(item);

        const rating =
            getRating(item);

        const requestLabel =
            String(
                getConfig().label ||
                "Anfragen"
            );

        const wrapper =
            document.createElement("div");

        wrapper.className =
            "threetide-discover-details";

        wrapper.innerHTML = `
            <button
                type="button"
                class="threetide-discover-details-close"
                aria-label="Detailansicht schließen">
                <span class="material-icons"
                      aria-hidden="true">
                    arrow_back
                </span>

                <span>
                    Zurück
                </span>
            </button>

            <div
                class="threetide-discover-details-hero"
                ${backdropUrl
                ? `style="--threetide-discover-backdrop:url('${escapeHtml(backdropUrl)}')"`
                : ""
            }>

                <div class="threetide-discover-details-shade">
                </div>

                <div class="threetide-discover-details-layout">
                    ${posterUrl
                ? `
                                <img
                                    class="threetide-discover-details-poster"
                                    src="${escapeHtml(posterUrl)}"
                                    alt="${escapeHtml(title)}"
                                    draggable="false">
                              `
                : ""
            }

                    <div class="threetide-discover-details-content">
                        <span class="threetide-discover-details-type">
                            ${escapeHtml(getTypeLabel(item))}
                        </span>

                        <h2>
                            ${escapeHtml(title)}
                        </h2>

                        <div class="threetide-discover-details-meta">
                            ${year
                ? `<span>${escapeHtml(year)}</span>`
                : ""
            }

                            ${rating
                ? `<span>★ ${escapeHtml(rating)}</span>`
                : ""
            }
                        </div>

                        <p>
                            ${escapeHtml(getOverview(item))}
                        </p>

                        <div class="threetide-discover-details-actions">
                            <button
                                type="button"
                                class="threetide-button threetide-button-primary"
                                data-action="request">

                                <span class="material-icons"
                                      aria-hidden="true">
                                    add_circle
                                </span>

                                ${escapeHtml(requestLabel)}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const closeButton =
            wrapper.querySelector(
                ".threetide-discover-details-close"
            );

        const requestButton =
            wrapper.querySelector(
                "[data-action=\"request\"]"
            );

        closeButton.addEventListener(
            "click",
            (event) => {
                event.preventDefault();
                event.stopPropagation();

                closeItemDetails();
            }
        );

        requestButton.addEventListener(
            "click",
            async (event) => {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation?.();

                await submitMediaRequest(
                    item,
                    requestButton
                );
            }
        );

        layer.replaceChildren(wrapper);
        layer.hidden = false;

        discover.classList.add(
            "threetide-discover-details-open"
        );

        layer.scrollTop = 0;
    }

    async function open() {
        const api =
            getApi();

        const ui =
            getUi();

        if (!api || !ui) {
            console.error(
                "[3Tide Discover] API oder UI ist nicht verfügbar."
            );

            return;
        }

        const discover =
            createDiscoverView();

        activeDiscover =
            discover;

        const defaultContent =
            bindDiscoverEvents(discover);

        activeDialog =
            ui.openModal({
                title: "Entdecken & Anfragen",
                contentElement: discover,
                size: "full",
                className:
                    "threetide-discover-modal"
            });

        await loadTrending(
            defaultContent
        );
    }

    function close() {
        searchController?.abort();

        window.clearTimeout(
            searchTimer
        );

        closeItemDetails();

        getUi()?.closeModal?.();

        activeDialog = null;
        activeDiscover = null;
    }

    function init() {
        if (initialized) {
            return Discover;
        }

        initialized = true;

        console.info(
            "[3Tide] Discover-Modul initialisiert."
        );

        return Discover;
    }

    const Discover = {
        init,
        open,
        close,
        showItemDetails,
        closeItemDetails
    };

    root.Discover =
        Discover;

    console.info(
        "[3Tide] Discover-Modul verfügbar."
    );
})();