(() => {
    "use strict";

    const HERO_ID = "threetide-hero";
    const RETRY_DELAY_MS = 1000;
    const MAX_OVERVIEW_LENGTH = 320;
    const SWIPE_THRESHOLD_PX = 55;
    const AUTO_ROTATE_MS = 8000;
    const PREVIEW_HOVER_DELAY_MS = 1500;
    const PREVIEW_MAX_DURATION_MS = 20000;

    const HOME_TITLES = [
        "meine medien",
        "my media"
    ];

    let heroItems = [];
    let currentIndex = 0;
    let loading = false;
    let started = false;
    let retryTimer = null;
    let observer = null;
    let touchStartX = null;
    let autoRotateTimer = null;

    function normalizeText(value) {
        return String(value || "")
            .trim()
            .toLocaleLowerCase();
    }

    function escapeHtml(value) {
        const element = document.createElement("div");
        element.textContent = String(value || "");
        return element.innerHTML;
    }

    function truncate(value, maxLength) {
        const text = String(value || "").trim();

        if (text.length <= maxLength) {
            return text;
        }

        return `${text.slice(0, maxLength).trim()}…`;
    }

    function getApiClient() {
        if (
            typeof ApiClient !== "undefined" &&
            ApiClient
        ) {
            return ApiClient;
        }

        return window.ApiClient || null;
    }

    function getCurrentUserId() {
        return getApiClient()?.getCurrentUserId?.() || "";
    }

    function findHomeHeading() {
        const elements = document.querySelectorAll(
            "h1, h2, h3, .sectionTitle, .sectionTitleText"
        );

        for (const element of elements) {
            if (!element.isConnected) {
                continue;
            }

            if (HOME_TITLES.includes(normalizeText(element.textContent))) {
                return element;
            }
        }

        return null;
    }

    function findHomeSection() {
        const heading = findHomeHeading();

        if (!heading) {
            return null;
        }

        return (
            heading.closest(".verticalSection") ||
            heading.closest("section") ||
            heading.parentElement?.parentElement ||
            heading.parentElement
        );
    }

    function isHomePage() {
        return Boolean(findHomeSection());
    }

    function clearRetry() {
        if (retryTimer !== null) {
            window.clearTimeout(retryTimer);
            retryTimer = null;
        }
    }

    function clearAutoRotate() {
        if (autoRotateTimer !== null) {
            window.clearInterval(autoRotateTimer);
            autoRotateTimer = null;
        }
    }

    function scheduleAutoRotate() {
        clearAutoRotate();

        if (heroItems.length <= 1) {
            return;
        }

        autoRotateTimer = window.setInterval(() => {
            if (document.hidden) {
                return;
            }

            showNext();
        }, AUTO_ROTATE_MS);
    }

    function scheduleRetry() {
        if (
            retryTimer !== null ||
            document.getElementById(HERO_ID)
        ) {
            return;
        }

        retryTimer = window.setTimeout(() => {
            retryTimer = null;
            sync();
        }, RETRY_DELAY_MS);
    }

    function getBackdropUrl(item) {
        const client = getApiClient();

        if (!client || !item?.Id) {
            return "";
        }

        const hasOwnBackdrop =
            Array.isArray(item.BackdropImageTags) &&
            item.BackdropImageTags.length > 0;

        const backdropTag = hasOwnBackdrop
            ? item.BackdropImageTags[0]
            : item.ParentBackdropImageTags?.[0];

        const imageItemId = hasOwnBackdrop
            ? item.Id
            : item.ParentBackdropItemId || item.Id;

        if (!backdropTag) {
            return "";
        }

        return client.getUrl(
            `Items/${imageItemId}/Images/Backdrop/0`,
            {
                tag: backdropTag,
                maxWidth: 1920,
                quality: 90
            }
        );
    }

    async function fetchLocalTrailerUrl(item) {
        const client = getApiClient();

        if (!client || !item?.Id) {
            return "";
        }

        if (item._threetideTrailerUrl !== undefined) {
            return item._threetideTrailerUrl;
        }

        try {
            const url = client.getUrl(
                `Items/${item.Id}/LocalTrailers`
            );

            const trailers = await (
                typeof client.ajax === "function"
                    ? client.ajax({
                        type: "GET",
                        url,
                        dataType: "json"
                    })
                    : fetch(url, {
                        credentials: "same-origin"
                    }).then((response) => response.json())
            );

            const firstTrailer =
                Array.isArray(trailers) && trailers.length
                    ? trailers[0]
                    : null;

            if (!firstTrailer?.Id) {
                item._threetideTrailerUrl = "";
                return "";
            }

            const trailerUrl = client.getUrl(
                `Videos/${firstTrailer.Id}/stream`,
                {
                    Static: true,
                    mediaSourceId: firstTrailer.Id
                }
            );

            item._threetideTrailerUrl = trailerUrl;
            return trailerUrl;
        } catch {
            item._threetideTrailerUrl = "";
            return "";
        }
    }

    async function requestItems(overrides) {
        const client = getApiClient();
        const userId = getCurrentUserId();

        if (!client || !userId) {
            throw new Error(
                "Jellyfin ApiClient oder Benutzer ist noch nicht verfügbar."
            );
        }

        const parameters = Object.assign(
            {
                Recursive: true,
                IncludeItemTypes: "Movie,Series",
                SortBy: "DateCreated,PremiereDate",
                SortOrder: "Descending",
                Limit: 40,
                Fields:
                    "Overview,Taglines,Genres,ProductionYear," +
                    "CommunityRating,BackdropImageTags," +
                    "ParentBackdropImageTags,ParentBackdropItemId",
                ImageTypeLimit: 1,
                EnableImages: true,
                EnableUserData: true
            },
            overrides || {}
        );

        if (typeof client.getItems === "function") {
            return client.getItems(userId, parameters);
        }

        const url = client.getUrl(
            `Users/${userId}/Items`,
            parameters
        );

        if (typeof client.ajax === "function") {
            return client.ajax({
                type: "GET",
                url,
                dataType: "json"
            });
        }

        const response = await fetch(url, {
            credentials: "same-origin"
        });

        if (!response.ok) {
            throw new Error(
                `Jellyfin API antwortete mit HTTP ${response.status}.`
            );
        }

        return response.json();
    }

    function hasBackdropImage(item) {
        return Boolean(
            item?.Id &&
            item?.Name &&
            (
                item?.BackdropImageTags?.length > 0 ||
                item?.ParentBackdropImageTags?.length > 0
            )
        );
    }

    async function loadHeroItems() {
        // 1) Neue Filme (nach Erstellungsdatum)
        const newMoviesResponse = await requestItems({
            IncludeItemTypes: "Movie",
            SortBy: "DateCreated,PremiereDate",
            SortOrder: "Descending",
            Limit: 10
        });

        const newMovies = (newMoviesResponse?.Items || [])
            .filter(hasBackdropImage)
            .slice(0, 5);

        const usedIds = new Set(
            newMovies.map((item) => item.Id)
        );

        // 2) Genre-Mix aus einem groesseren, zufaellig sortierten Pool
        const genrePoolResponse = await requestItems({
            IncludeItemTypes: "Movie",
            SortBy: "Random",
            Limit: 60
        });

        const genrePoolCandidates = (
            genrePoolResponse?.Items || []
        ).filter(
            (item) =>
                hasBackdropImage(item) &&
                !usedIds.has(item.Id)
        );

        const seenGenres = new Set();
        const diverseMovies = [];

        for (const item of genrePoolCandidates) {
            const primaryGenre =
                item.Genres?.[0] || "Unbekannt";

            if (seenGenres.has(primaryGenre)) {
                continue;
            }

            seenGenres.add(primaryGenre);
            diverseMovies.push(item);
            usedIds.add(item.Id);

            if (diverseMovies.length >= 5) {
                break;
            }
        }

        // 3) Neue Serien
        const seriesResponse = await requestItems({
            IncludeItemTypes: "Series",
            SortBy: "DateCreated,PremiereDate",
            SortOrder: "Descending",
            Limit: 10
        });

        const newSeries = (seriesResponse?.Items || [])
            .filter(
                (item) =>
                    hasBackdropImage(item) &&
                    !usedIds.has(item.Id)
            )
            .slice(0, 4);

        const curated = [
            ...newMovies,
            ...diverseMovies,
            ...newSeries
        ];

        if (curated.length) {
            return curated;
        }

        // Fallback, falls z.B. Bibliothek noch leer/klein ist:
        // alte, ungefilterte Mischabfrage.
        const fallbackResponse = await requestItems({
            Limit: 40
        });

        const fallbackCandidates = (
            fallbackResponse?.Items || []
        ).filter(hasBackdropImage);

        if (!fallbackCandidates.length) {
            throw new Error(
                "Kein Film oder keine Serie mit Backdrop gefunden."
            );
        }

        return fallbackCandidates.slice(0, 12);
    }

    function openDetails(itemId) {
        window.location.hash =
            `/details?id=${encodeURIComponent(itemId)}`;
    }

    function playItem(itemId) {
        if (!itemId) {
            return;
        }

        const playbackManager =
            window.PlaybackManager ||
            (
                typeof PlaybackManager !== "undefined"
                    ? PlaybackManager
                    : null
            );

        if (
            playbackManager &&
            typeof playbackManager.play === "function"
        ) {
            playbackManager.play({
                ids: [itemId]
            });

            return;
        }

        // Fallback, falls PlaybackManager (noch) nicht verfuegbar ist:
        // zur Detailseite navigieren, dort kann normal abgespielt werden.
        openDetails(itemId);
    }

    function createHero(item) {
        const hero = document.createElement("section");

        hero.id = HERO_ID;
        hero.className = "threetide-hero";
        hero.setAttribute("aria-label", item.Name);
        hero.setAttribute("tabindex", "0");

        const overview = truncate(
            item.Overview ||
            item.Taglines?.[0] ||
            "Jetzt auf 3Tide ansehen.",
            MAX_OVERVIEW_LENGTH
        );

        const itemType =
            item.Type === "Series"
                ? "Serie"
                : "Film";

        const year = item.ProductionYear
            ? `<span>${escapeHtml(item.ProductionYear)}</span>`
            : "";

        const rating =
            typeof item.CommunityRating === "number"
                ? `<span>★ ${item.CommunityRating.toFixed(1)}</span>`
                : "";

        hero.innerHTML = `
            <div class="threetide-hero-backdrop"></div>
            <video
                class="threetide-hero-preview-video"
                muted
                playsinline
                preload="none"></video>
            <div class="threetide-hero-overlay"></div>

            <button
                type="button"
                class="threetide-hero-nav threetide-hero-prev"
                data-action="previous"
                aria-label="Vorheriger Titel">
                ‹
            </button>

            <button
                type="button"
                class="threetide-hero-nav threetide-hero-next"
                data-action="next"
                aria-label="Nächster Titel">
                ›
            </button>

            <div class="threetide-hero-content">
                <div class="threetide-hero-label">
                    Neu auf 3Tide
                </div>

                <h1>${escapeHtml(item.Name)}</h1>

                <div class="threetide-hero-meta">
                    <span>${itemType}</span>
                    ${year}
                    ${rating}
                </div>

                <p>${escapeHtml(overview)}</p>

                <div class="threetide-hero-actions">
                    <button
                        type="button"
                        class="threetide-hero-play"
                        data-action="play">
                        <span
                            class="material-icons"
                            aria-hidden="true">
                            play_arrow
                        </span>
                        Abspielen
                    </button>

                    <button
                        type="button"
                        class="threetide-hero-details"
                        data-action="details">
                        <span
                            class="material-icons"
                            aria-hidden="true">
                            info
                        </span>
                        Weitere Infos
                    </button>
                </div>
            </div>
        `;

        const backdropUrl = getBackdropUrl(item);
        const backdrop = hero.querySelector(
            ".threetide-hero-backdrop"
        );

        if (backdrop && backdropUrl) {
            backdrop.style.backgroundImage =
                `url("${backdropUrl.replace(/"/g, "%22")}")`;
        }

        const previewVideo = hero.querySelector(
            ".threetide-hero-preview-video"
        );

        let previewHoverTimer = null;
        let previewStopTimer = null;

        let previewToken = 0;

        function stopPreview() {
            previewToken += 1;

            if (previewHoverTimer !== null) {
                window.clearTimeout(previewHoverTimer);
                previewHoverTimer = null;
            }

            if (previewStopTimer !== null) {
                window.clearTimeout(previewStopTimer);
                previewStopTimer = null;
            }

            if (!previewVideo) {
                return;
            }

            previewVideo.classList.remove(
                "threetide-hero-preview-video--active"
            );

            previewVideo.pause();
            previewVideo.removeAttribute("src");
            previewVideo.load();
        }

        async function startPreview() {
            if (!previewVideo) {
                return;
            }

            const requestToken = previewToken;
            const previewUrl = await fetchLocalTrailerUrl(item);

            if (requestToken !== previewToken) {
                // Zwischenzeitlich wurde die Vorschau abgebrochen
                // (z.B. Maus schon wieder weg).
                return;
            }

            if (!previewUrl) {
                return;
            }

            previewVideo.src = previewUrl;

            previewVideo
                .play()
                .then(() => {
                    previewVideo.classList.add(
                        "threetide-hero-preview-video--active"
                    );

                    previewStopTimer = window.setTimeout(
                        stopPreview,
                        PREVIEW_MAX_DURATION_MS
                    );
                })
                .catch(() => {
                    // Codec vom Browser nicht direkt abspielbar
                    // oder Anfrage abgebrochen - einfach beim
                    // Standbild bleiben.
                    stopPreview();
                });
        }

        function schedulePreview() {
            previewHoverTimer = window.setTimeout(
                startPreview,
                PREVIEW_HOVER_DELAY_MS
            );
        }

        hero
            .querySelector('[data-action="play"]')
            ?.addEventListener("click", (event) => {
                event.stopPropagation();
                playItem(item.Id);
            });

        hero
            .querySelector('[data-action="details"]')
            ?.addEventListener("click", (event) => {
                event.stopPropagation();
                openDetails(item.Id);
            });

        hero
            .querySelector('[data-action="previous"]')
            ?.addEventListener("click", (event) => {
                event.stopPropagation();
                showPrevious();
            });

        hero
            .querySelector('[data-action="next"]')
            ?.addEventListener("click", (event) => {
                event.stopPropagation();
                showNext();
            });

        hero.addEventListener("click", (event) => {
            if (event.target.closest("button")) {
                return;
            }

            openDetails(item.Id);
        });

        hero.addEventListener("mouseenter", () => {
            clearAutoRotate();
            schedulePreview();
        });

        hero.addEventListener("mouseleave", () => {
            stopPreview();
            scheduleAutoRotate();
        });

        hero.addEventListener(
            "touchstart",
            (event) => {
                clearAutoRotate();

                touchStartX =
                    event.changedTouches?.[0]?.clientX ?? null;
            },
            {
                passive: true
            }
        );

        hero.addEventListener(
            "touchend",
            (event) => {
                if (touchStartX === null) {
                    return;
                }

                const touchEndX =
                    event.changedTouches?.[0]?.clientX ?? touchStartX;

                const distance =
                    touchEndX - touchStartX;

                touchStartX = null;

                if (Math.abs(distance) < SWIPE_THRESHOLD_PX) {
                    scheduleAutoRotate();
                    return;
                }

                if (distance < 0) {
                    showNext();
                } else {
                    showPrevious();
                }
            },
            {
                passive: true
            }
        );

        hero.addEventListener("keydown", (event) => {
            if (event.key === "ArrowLeft") {
                event.preventDefault();
                showPrevious();
            }

            if (event.key === "ArrowRight") {
                event.preventDefault();
                showNext();
            }
        });

        return hero;
    }

    function insertHero(hero) {
        const homeSection = findHomeSection();

        if (!homeSection?.parentNode) {
            return false;
        }

        homeSection.parentNode.insertBefore(
            hero,
            homeSection
        );

        return true;
    }

    function renderCurrentHero() {
        if (!heroItems.length) {
            return;
        }

        document.getElementById(HERO_ID)?.remove();

        const item = heroItems[currentIndex];
        const hero = createHero(item);

        if (!insertHero(hero)) {
            hero.remove();
            scheduleRetry();
            return;
        }

        console.info(
            `[3Tide] Hero geladen: ${item.Name}`
        );
    }

    function showNext() {
        if (!heroItems.length) {
            return;
        }

        currentIndex =
            (currentIndex + 1) % heroItems.length;

        renderCurrentHero();
        scheduleAutoRotate();
    }

    function showPrevious() {
        if (!heroItems.length) {
            return;
        }

        currentIndex =
            (currentIndex - 1 + heroItems.length) %
            heroItems.length;

        renderCurrentHero();
        scheduleAutoRotate();
    }

    async function render() {
        if (
            document.getElementById(HERO_ID) ||
            loading
        ) {
            return;
        }

        if (!isHomePage()) {
            scheduleRetry();
            return;
        }

        if (!getApiClient() || !getCurrentUserId()) {
            scheduleRetry();
            return;
        }

        loading = true;

        try {
            if (!heroItems.length) {
                heroItems = await loadHeroItems();
                currentIndex = 0;
            }

            if (!isHomePage()) {
                return;
            }

            renderCurrentHero();
            clearRetry();
            scheduleAutoRotate();
        } catch (error) {
            console.error(
                "[3Tide] Hero konnte nicht geladen werden.",
                error
            );

            scheduleRetry();
        } finally {
            loading = false;
        }
    }

    function remove() {
        clearAutoRotate();
        document.getElementById(HERO_ID)?.remove();
    }

    function sync() {
        if (isHomePage()) {
            render();
            return;
        }

        remove();
    }

    function refresh() {
        heroItems = [];
        currentIndex = 0;
        remove();
        sync();
    }

    function start() {
        if (started) {
            sync();
            return;
        }

        started = true;

        observer = new MutationObserver(() => {
            sync();
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        window.addEventListener("hashchange", () => {
            window.setTimeout(sync, 150);
        });

        document.addEventListener(
            "visibilitychange",
            () => {
                if (!document.hidden) {
                    sync();
                }
            }
        );

        sync();
        scheduleRetry();
    }

    function stop() {
        clearRetry();
        clearAutoRotate();

        observer?.disconnect();
        observer = null;
        started = false;

        remove();
    }

    window.ThreeTideHero = {
        start,
        stop,
        sync,
        refresh,
        remove,
        next: showNext,
        previous: showPrevious
    };
})();