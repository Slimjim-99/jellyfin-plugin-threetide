(() => {
    "use strict";

    const ROOT_ID = "threetide-home-content";
    const RETRY_DELAY_MS = 900;
    const MAX_RETRIES = 30;

    let started = false;
    let loading = false;
    let observer = null;
    let retryTimer = null;
    let retryCount = 0;

    function getApiClient() {
        if (typeof ApiClient !== "undefined" && ApiClient) {
            return ApiClient;
        }

        return window.ApiClient || null;
    }

    function getCurrentUserId() {
        return getApiClient()?.getCurrentUserId?.() || "";
    }

    function escapeHtml(value) {
        const element = document.createElement("div");
        element.textContent = String(value ?? "");
        return element.innerHTML;
    }

    function findHomeContainer() {
        return document.querySelector(
            ".homeSectionsContainer, .homeSections, #homeTab, " +
            ".homePage, .view-home, [data-type='home'], .page.homePage"
        );
    }

    function isHomePage() {
        return Boolean(findHomeContainer());
    }

    function getImageUrl(item, type = "Primary", width = 500) {
        const client = getApiClient();

        if (!client || !item?.Id) {
            return "";
        }

        if (type === "Primary" && !item?.ImageTags?.Primary) {
            return "";
        }

        if (type === "Backdrop" && !item?.BackdropImageTags?.length) {
            return "";
        }

        const path =
            type === "Backdrop"
                ? `Items/${item.Id}/Images/Backdrop/0`
                : `Items/${item.Id}/Images/Primary`;

        const tag =
            type === "Backdrop"
                ? item.BackdropImageTags[0]
                : item.ImageTags.Primary;

        return client.getUrl(path, {
            tag,
            maxWidth: width,
            quality: 88
        });
    }

    async function getItems(parameters) {
        const client = getApiClient();
        const userId = getCurrentUserId();

        if (!client || !userId) {
            throw new Error(
                "Jellyfin ApiClient oder Benutzer ist nicht verf\u00fcgbar."
            );
        }

        const defaults = {
            Recursive: true,
            Fields:
                "Overview,ProductionYear,CommunityRating,OfficialRating," +
                "RunTimeTicks,PrimaryImageAspectRatio,BackdropImageTags,UserData",
            ImageTypeLimit: 1,
            EnableImages: true,
            EnableUserData: true
        };

        const request = {
            ...defaults,
            ...parameters
        };

        if (typeof client.getItems === "function") {
            const response = await client.getItems(userId, request);
            return response?.Items || [];
        }

        const url = client.getUrl(`Users/${userId}/Items`, request);
        const response = await client.ajax({
            type: "GET",
            url,
            dataType: "json"
        });

        return response?.Items || [];
    }

    function loadLatest(type, limit = 14) {
        return getItems({
            IncludeItemTypes: type,
            SortBy: "DateCreated,PremiereDate",
            SortOrder: "Descending",
            Limit: limit
        });
    }

    function loadContinueWatching(limit = 10) {
        return getItems({
            IncludeItemTypes: "Movie,Episode",
            Filters: "IsResumable",
            SortBy: "DatePlayed",
            SortOrder: "Descending",
            Limit: limit
        });
    }

    function loadTopTen(limit = 10) {
        return getItems({
            IncludeItemTypes: "Movie,Series",
            SortBy: "CommunityRating,DateCreated",
            SortOrder: "Descending",
            MinCommunityRating: 5,
            Limit: limit
        });
    }

    function openDetails(itemId) {
        window.location.hash = `/details?id=${encodeURIComponent(itemId)}`;
    }

    function openLiveTv() {
        window.location.hash = "/livetv?collectionType=livetv";
    }

    function openDiscover() {
        const discover = window.ThreeTide?.Discover;

        if (discover && typeof discover.open === "function") {
            discover.init?.();
            discover.open();
            return;
        }

        window.ThreeTide?.UI?.error?.(
            "Das Discover-Modul wurde nicht geladen.",
            "3Tide"
        );

        console.error(
            "[3Tide] ThreeTide.Discover.open ist nicht verf\u00fcgbar."
        );
    }

    function getProgress(item) {
        const value = Number(item?.UserData?.PlayedPercentage);

        if (!Number.isFinite(value)) {
            return 0;
        }

        return Math.max(0, Math.min(100, value));
    }

    function createLandscapeCard(item) {
        const card = document.createElement("article");
        card.className = "threetide-landscape-card";
        card.tabIndex = 0;
        card.setAttribute("role", "link");

        const image =
            getImageUrl(item, "Backdrop", 900) ||
            getImageUrl(item, "Primary", 700);

        const progress = getProgress(item);

        card.innerHTML = `
            <div class="threetide-landscape-image">
                ${image
                ? `<img src="${escapeHtml(image)}"
                                alt="${escapeHtml(item.Name || "")}"
                                loading="lazy"
                                draggable="false">`
                : `<div class="threetide-card-placeholder">
                               ${escapeHtml(item.Name || "Titel")}
                           </div>`
            }

                <div class="threetide-landscape-overlay">
                    <span class="material-icons">play_arrow</span>
                </div>

                ${progress > 0
                ? `<div class="threetide-progress">
                               <span style="width:${progress}%"></span>
                           </div>`
                : ""
            }
            </div>

            <h3>${escapeHtml(item.Name || "Unbekannter Titel")}</h3>
        `;

        bindCard(card, item.Id);
        return card;
    }

    function createPosterCard(item) {
        const card = document.createElement("article");
        card.className = "threetide-poster-card";
        card.tabIndex = 0;
        card.setAttribute("role", "link");

        const poster = getImageUrl(item, "Primary", 500);
        const year = item.ProductionYear || "";
        const rating =
            typeof item.CommunityRating === "number"
                ? item.CommunityRating.toFixed(1)
                : "";

        card.innerHTML = `
            <div class="threetide-poster-image">
                ${poster
                ? `<img src="${escapeHtml(poster)}"
                                alt="${escapeHtml(item.Name || "")}"
                                loading="lazy"
                                draggable="false">`
                : `<div class="threetide-card-placeholder">
                               ${escapeHtml(item.Name || "Titel")}
                           </div>`
            }

                <div class="threetide-poster-overlay">
                    <span class="material-icons">play_arrow</span>
                </div>
            </div>

            <div class="threetide-poster-copy">
                <h3>${escapeHtml(item.Name || "Unbekannter Titel")}</h3>
                <div>
                    ${year ? `<span>${escapeHtml(year)}</span>` : ""}
                    ${rating ? `<span>&#9733; ${escapeHtml(rating)}</span>` : ""}
                </div>
            </div>
        `;

        bindCard(card, item.Id);
        return card;
    }

    function createTopTenCard(item, index) {
        const card = document.createElement("article");
        card.className = "threetide-topten-card";
        card.tabIndex = 0;
        card.setAttribute("role", "link");

        const poster = getImageUrl(item, "Primary", 500);

        card.innerHTML = `
            <span class="threetide-topten-number">${index + 1}</span>

            <div class="threetide-topten-poster">
                ${poster
                ? `<img src="${escapeHtml(poster)}"
                                alt="${escapeHtml(item.Name || "")}"
                                loading="lazy"
                                draggable="false">`
                : `<div class="threetide-card-placeholder">
                               ${escapeHtml(item.Name || "Titel")}
                           </div>`
            }
            </div>

            <h3>${escapeHtml(item.Name || "Unbekannter Titel")}</h3>
        `;

        bindCard(card, item.Id);
        return card;
    }

    function bindCard(card, itemId) {
        const activate = (event) => {
            event?.preventDefault();
            event?.stopPropagation();
            openDetails(itemId);
        };

        card.addEventListener("click", activate);
        card.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                activate(event);
            }
        });
    }

    function createSection(title, className, cards) {
        const section = document.createElement("section");
        section.className = `threetide-home-section ${className}`;

        const header = document.createElement("header");
        header.className = "threetide-section-header";
        header.innerHTML = `
            <h2>${escapeHtml(title)}</h2>

            <div class="threetide-row-controls">
                <button type="button"
                        data-direction="previous"
                        aria-label="Zur\u00fcck">
                    <span class="material-icons">chevron_left</span>
                </button>

                <button type="button"
                        data-direction="next"
                        aria-label="Weiter">
                    <span class="material-icons">chevron_right</span>
                </button>
            </div>
        `;

        const row = document.createElement("div");
        row.className = "threetide-content-row";

        cards.forEach((card) => row.appendChild(card));

        header
            .querySelector('[data-direction="previous"]')
            ?.addEventListener("click", () => {
                row.scrollBy({
                    left: -row.clientWidth * 0.86,
                    behavior: "smooth"
                });
            });

        header
            .querySelector('[data-direction="next"]')
            ?.addEventListener("click", () => {
                row.scrollBy({
                    left: row.clientWidth * 0.86,
                    behavior: "smooth"
                });
            });

        section.append(header, row);
        return section;
    }

    function createLiveTvSpotlight(backgroundItem) {
        const section = document.createElement("section");
        section.className = "threetide-live-spotlight";

        const background =
            getImageUrl(backgroundItem, "Backdrop", 1600) ||
            getImageUrl(backgroundItem, "Primary", 900);

        if (background) {
            section.style.setProperty(
                "--threetide-live-background",
                `url("${background.replace(/"/g, "%22")}")`
            );
        }

        section.innerHTML = `
            <div class="threetide-live-shade"></div>

            <div class="threetide-live-content">
                <div class="threetide-live-heading">
                    <span class="threetide-live-label">LIVE</span>
                    <span>3Tide Live TV</span>
                </div>

                <h2>
                    Fernsehen, wie du es kennst.<br>
                    Nur sch\u00f6ner.
                </h2>

                <button type="button" class="threetide-live-button">
                    <span class="material-icons">live_tv</span>
                    Live TV
                </button>
            </div>

            <button type="button"
                    class="threetide-request-shortcut"
                    aria-label="Film oder Serie anfragen">
                <span class="material-icons">send</span>

                <span>
                    <strong>Fehlt dir etwas?</strong>
                    Film oder Serie direkt in 3Tide anfragen
                </span>
            </button>
        `;

        section
            .querySelector(".threetide-live-button")
            ?.addEventListener("click", openLiveTv);

        section
            .querySelector(".threetide-request-shortcut")
            ?.addEventListener("click", openDiscover);

        return section;
    }

    function hideNativeHomeSections() {
        const container = findHomeContainer();

        if (!container) {
            return;
        }

        container
            .querySelectorAll(".verticalSection")
            .forEach((section) => {
                if (section.closest(`#${ROOT_ID}`)) {
                    return;
                }

                section.classList.add("threetide-default-libraries-hidden");
            });
    }

    function insertCustomHome(root) {
        const container = findHomeContainer();
        const hero = document.getElementById("threetide-hero");

        if (hero?.parentNode) {
            hero.parentNode.insertBefore(root, hero.nextSibling);
            return true;
        }

        if (container) {
            container.prepend(root);
            return true;
        }

        return false;
    }

    async function render() {
        if (loading || document.getElementById(ROOT_ID)) {
            return;
        }

        if (!isHomePage() || !getApiClient() || !getCurrentUserId()) {
            scheduleRetry();
            return;
        }

        loading = true;

        try {
            const [
                continueWatching,
                topTen,
                latestMovies,
                latestSeries
            ] = await Promise.all([
                loadContinueWatching(10),
                loadTopTen(10),
                loadLatest("Movie", 14),
                loadLatest("Series", 14)
            ]);

            if (!isHomePage()) {
                return;
            }

            const root = document.createElement("main");
            root.id = ROOT_ID;
            root.className = "threetide-home-content";

            root.appendChild(
                createLiveTvSpotlight(
                    latestMovies[1] ||
                    latestSeries[0] ||
                    latestMovies[0]
                )
            );

            if (continueWatching.length) {
                root.appendChild(
                    createSection(
                        "Weiterschauen",
                        "threetide-landscape-section",
                        continueWatching.map(createLandscapeCard)
                    )
                );
            }

            if (topTen.length) {
                root.appendChild(
                    createSection(
                        "Top 10 heute in 3Tide",
                        "threetide-topten-section",
                        topTen.map(createTopTenCard)
                    )
                );
            }

            if (latestMovies.length) {
                root.appendChild(
                    createSection(
                        "Neu im Katalog",
                        "threetide-poster-section",
                        latestMovies.map(createPosterCard)
                    )
                );
            }

            if (latestSeries.length) {
                root.appendChild(
                    createSection(
                        "Neue Serien",
                        "threetide-poster-section",
                        latestSeries.map(createPosterCard)
                    )
                );
            }

            if (!insertCustomHome(root)) {
                root.remove();
                scheduleRetry();
                return;
            }

            hideNativeHomeSections();
            retryCount = 0;
            clearRetry();

            console.info(
                `[3Tide] Startseite geladen: ` +
                `${continueWatching.length} Weiterschauen, ` +
                `${topTen.length} Top 10, ` +
                `${latestMovies.length} Filme, ` +
                `${latestSeries.length} Serien`
            );
        } catch (error) {
            console.error(
                "[3Tide] Startseite konnte nicht geladen werden.",
                error
            );

            scheduleRetry();
        } finally {
            loading = false;
        }
    }

    function remove() {
        document.getElementById(ROOT_ID)?.remove();

        document
            .querySelectorAll(".threetide-default-libraries-hidden")
            .forEach((element) => {
                element.classList.remove("threetide-default-libraries-hidden");
            });
    }

    function sync() {
        if (isHomePage()) {
            hideNativeHomeSections();
            render();
            return;
        }

        remove();
    }

    function clearRetry() {
        if (retryTimer !== null) {
            window.clearTimeout(retryTimer);
            retryTimer = null;
        }
    }

    function scheduleRetry() {
        if (retryTimer !== null || retryCount >= MAX_RETRIES) {
            return;
        }

        retryCount += 1;

        retryTimer = window.setTimeout(() => {
            retryTimer = null;
            sync();
        }, RETRY_DELAY_MS);
    }

    function start() {
        if (started) {
            sync();
            return;
        }

        started = true;

        observer = new MutationObserver(sync);
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        window.addEventListener("hashchange", () => {
            window.setTimeout(sync, 150);
        });

        sync();
        scheduleRetry();
    }

    function stop() {
        clearRetry();
        observer?.disconnect();
        observer = null;
        started = false;
        remove();
    }

    window.ThreeTideHome = {
        start,
        stop,
        sync,
        refresh() {
            remove();
            sync();
        }
    };
})();