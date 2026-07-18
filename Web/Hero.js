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

            if (
                HOME_TITLES.includes(
                    normalizeText(element.textContent)
                )
            ) {
                return element;
            }
        }

        return null;
    }

    function findHomeContainer() {
        return document.querySelector(
            ".homeSectionsContainer, .homeSections, #homeTab, " +
            ".homePage, .view-home, [data-type='home'], " +
            ".page.homePage"
        );
    }

    function isHomePage() {
        return Boolean(findHomeContainer());
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
            if (!document.hidden) {
                showNext();
            }
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

    function shouldAutoplayPreview() {
        const reducedMotion =
            window.matchMedia?.(
                "(prefers-reduced-motion: reduce)"
            )?.matches;

        const saveData =
            navigator.connection?.saveData === true;

        return !reducedMotion && !saveData;
    }

    async function requestJson(url) {
        const client = getApiClient();

        if (!client) {
            return null;
        }

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
            throw new Error(`HTTP ${response.status}`);
        }

        return response.json();
    }

    function previewScore(item) {
        const text = String(
            `${item?.Name || ""} ${item?.Path || ""}`
        ).toLowerCase();

        let score = 0;

        if (/3tide|hero/.test(text)) score += 80;
        if (/preview|vorschau|teaser/.test(text)) score += 70;
        if (/trailer/.test(text)) score += 60;
        if (/clip|sample|short/.test(text)) score += 40;

        const ticks = Number(item?.RunTimeTicks || 0);
        const seconds = ticks / 10000000;

        if (seconds > 0 && seconds <= 45) score += 35;
        else if (seconds <= 90) score += 25;
        else if (seconds <= 180) score += 10;

        return score;
    }

    function choosePreview(items) {
        return (Array.isArray(items) ? items : [])
            .filter((entry) => entry?.Id)
            .sort((a, b) => previewScore(b) - previewScore(a))[0] || null;
    }

    async function fetchPreviewUrl(item) {
        const client = getApiClient();

        if (!client || !item?.Id) {
            return "";
        }

        if (item._threetidePreviewUrl !== undefined) {
            return item._threetidePreviewUrl;
        }

        const endpoints = [
            `Items/${item.Id}/LocalTrailers`,
            `Items/${item.Id}/SpecialFeatures`,
            `Items/${item.Id}/ThemeVideos`
        ];

        let preview = null;

        for (const endpoint of endpoints) {
            try {
                const result = await requestJson(
                    client.getUrl(endpoint)
                );

                preview = choosePreview(
                    result?.Items || result
                );

                if (preview) {
                    break;
                }
            } catch {
                // Der Endpunkt ist je nach Jellyfin-Version optional.
            }
        }

        if (!preview) {
            try {
                const result = await requestJson(
                    client.getUrl(
                        `Users/${getCurrentUserId()}/Items`,
                        {
                            ParentId: item.Id,
                            Recursive: true,
                            IncludeItemTypes: "Video,Movie,Episode",
                            Fields: "Path,RunTimeTicks",
                            Limit: 30
                        }
                    )
                );

                preview = choosePreview(result?.Items);
            } catch {
                // Kein passender Clip als untergeordnetes Medium vorhanden.
            }
        }

        if (!preview?.Id) {
            item._threetidePreviewUrl = "";
            return "";
        }

        const previewUrl = client.getUrl(
            `Videos/${preview.Id}/stream`,
            {
                Static: true,
                mediaSourceId: preview.Id
            }
        );

        item._threetidePreviewUrl = previewUrl;
        return previewUrl;
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
                    "CommunityRating,OfficialRating,RunTimeTicks,BackdropImageTags," +
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
        const newMoviesResponse = await requestItems({
            IncludeItemTypes: "Movie",
            SortBy: "DateCreated,PremiereDate",
            SortOrder: "Descending",
            Limit: 10
        });

        const newMovies =
            (newMoviesResponse?.Items || [])
                .filter(hasBackdropImage)
                .slice(0, 5);

        const usedIds = new Set(
            newMovies.map((item) => item.Id)
        );

        const genrePoolResponse = await requestItems({
            IncludeItemTypes: "Movie",
            SortBy: "Random",
            Limit: 60
        });

        const genrePoolCandidates =
            (genrePoolResponse?.Items || [])
                .filter(
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

        const seriesResponse = await requestItems({
            IncludeItemTypes: "Series",
            SortBy: "DateCreated,PremiereDate",
            SortOrder: "Descending",
            Limit: 10
        });

        const newSeries =
            (seriesResponse?.Items || [])
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

        const fallbackResponse = await requestItems({
            Limit: 40
        });

        const fallbackCandidates =
            (fallbackResponse?.Items || [])
                .filter(hasBackdropImage);

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

    function setPlayerState(active) {
        document.documentElement.classList.toggle(
            "threetide-player-active",
            active
        );

        document.body?.classList.toggle(
            "threetide-player-active",
            active
        );
    }

    async function playItem(itemId) {
        if (!itemId) {
            return;
        }

        const client = getApiClient();
        const userId = getCurrentUserId();

        if (!client || !userId) {
            openDetails(itemId);
            return;
        }

        clearAutoRotate();
        clearRetry();
        remove();
        setPlayerState(true);

        try {
            let item;

            if (typeof client.getItem === "function") {
                item = await client.getItem(
                    userId,
                    itemId
                );
            } else {
                const url = client.getUrl(
                    `Users/${userId}/Items/${itemId}`
                );

                item = await (
                    typeof client.ajax === "function"
                        ? client.ajax({
                            type: "GET",
                            url,
                            dataType: "json"
                        })
                        : fetch(url, {
                            credentials: "same-origin"
                        }).then((response) => {
                            if (!response.ok) {
                                throw new Error(
                                    `HTTP ${response.status}`
                                );
                            }

                            return response.json();
                        })
                );
            }

            /*
             * jellyfin-web stellt den PlaybackManager NICHT als
             * window-Global bereit (ES-Modul). Zuverlaessiger Weg
             * aus injiziertem Code: Play-Befehl per Sessions-API an
             * die EIGENE Session schicken - der Client empfaengt ihn
             * ueber seinen WebSocket und startet die native
             * Wiedergabe inkl. OSD selbst.
             */
            const deviceId =
                client.deviceId?.() ||
                client._deviceId ||
                "";

            const sessionsUrl = client.getUrl(
                "Sessions",
                deviceId ? { deviceId } : undefined
            );

            const sessions = await (
                typeof client.ajax === "function"
                    ? client.ajax({
                        type: "GET",
                        url: sessionsUrl,
                        dataType: "json"
                    })
                    : fetch(sessionsUrl, {
                        credentials: "same-origin"
                    }).then((response) => response.json())
            );

            const ownSession =
                (Array.isArray(sessions) ? sessions : []).find(
                    (session) =>
                        session?.DeviceId === deviceId
                ) ||
                (Array.isArray(sessions) ? sessions[0] : null);

            if (!ownSession?.Id) {
                throw new Error(
                    "Eigene Jellyfin-Session nicht gefunden."
                );
            }

            const playUrl = client.getUrl(
                `Sessions/${ownSession.Id}/Playing`,
                {
                    playCommand: "PlayNow",
                    itemIds: itemId,
                    startPositionTicks:
                        item?.UserData?.PlaybackPositionTicks || 0
                }
            );

            if (typeof client.ajax === "function") {
                await client.ajax({
                    type: "POST",
                    url: playUrl
                });
            } else {
                const response = await fetch(playUrl, {
                    method: "POST",
                    credentials: "same-origin"
                });

                if (!response.ok) {
                    throw new Error(
                        `HTTP ${response.status}`
                    );
                }
            }

            console.info(
                `[3Tide] Direkte Wiedergabe gestartet: ${item?.Name || itemId}`
            );
        } catch (error) {
            setPlayerState(false);

            console.error(
                "[3Tide] Direkte Wiedergabe fehlgeschlagen.",
                error
            );

            openDetails(itemId);
        }
    }

    function formatRuntime(runTimeTicks) {
        const ticks = Number(runTimeTicks || 0);

        if (!ticks) {
            return "";
        }

        const totalMinutes = Math.round(
            ticks / 600000000
        );

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hours <= 0) {
            return `${minutes} Min.`;
        }

        if (minutes <= 0) {
            return `${hours} Std.`;
        }

        return `${hours} Std. ${minutes} Min.`;
    }

    function createHero(item) {
        const hero =
            document.createElement("section");

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

        const runtime = formatRuntime(
            item.RunTimeTicks
        );

        const runtimeHtml = runtime
            ? `<span>${escapeHtml(runtime)}</span>`
            : "";

        const officialRating = item.OfficialRating
            ? `<span class="threetide-hero-age">${escapeHtml(item.OfficialRating)}</span>`
            : "";

        hero.innerHTML = `
            <div class="threetide-hero-backdrop"></div>
            <video
                class="threetide-hero-preview-video"
                muted
                playsinline
                disablepictureinpicture
                preload="metadata"></video>
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
                    ${runtimeHtml}
                    ${officialRating}
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
            if (!previewVideo || !shouldAutoplayPreview()) {
                return;
            }

            const requestToken = previewToken;
            const previewUrl =
                await fetchPreviewUrl(item);

            if (requestToken !== previewToken) {
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

                    previewStopTimer =
                        window.setTimeout(
                            stopPreview,
                            PREVIEW_MAX_DURATION_MS
                        );
                })
                .catch(() => {
                    stopPreview();
                });
        }

        function schedulePreview() {
            previewHoverTimer =
                window.setTimeout(
                    startPreview,
                    PREVIEW_HOVER_DELAY_MS
                );
        }

        hero
            .querySelector('[data-action="play"]')
            ?.addEventListener("click", (event) => {
                event.preventDefault();
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

                if (
                    Math.abs(distance) <
                    SWIPE_THRESHOLD_PX
                ) {
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

        hero._threetideStopPreview = stopPreview;

        if (shouldAutoplayPreview()) {
            schedulePreview();
        }

        return hero;
    }

    function insertHero(hero) {
        const container = findHomeContainer();

        if (!container) {
            return false;
        }

        container.prepend(hero);
        return true;
    }

    function renderCurrentHero() {
        if (!heroItems.length) {
            return;
        }

        const previousHero = document.getElementById(HERO_ID);
        previousHero?._threetideStopPreview?.();
        previousHero?.remove();

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

        const hero = document.getElementById(HERO_ID);
        hero?._threetideStopPreview?.();
        hero?.remove();
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
