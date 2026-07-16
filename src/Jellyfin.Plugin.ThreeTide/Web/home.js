(() => {
    "use strict";

    const ROOT_ID = "threetide-home-content";
    const RETRY_DELAY_MS = 1000;

    let started = false;
    let loading = false;
    let observer = null;
    let retryTimer = null;

    function getConfig() {
        return window.__THREETIDE_CONFIG__ || {};
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

    function escapeHtml(value) {
        const element = document.createElement("div");

        element.textContent = String(value || "");

        return element.innerHTML;
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

    function getPosterUrl(item) {
        const client = getApiClient();
        const primaryTag = item?.ImageTags?.Primary;

        if (
            !client ||
            !item?.Id ||
            !primaryTag
        ) {
            return "";
        }

        return client.getUrl(
            `Items/${item.Id}/Images/Primary`,
            {
                tag: primaryTag,
                maxWidth: 500,
                quality: 88
            }
        );
    }

    function getBackdropUrl(item) {
        const client = getApiClient();

        if (
            !client ||
            !item?.Id ||
            !item.BackdropImageTags?.length
        ) {
            return "";
        }

        return client.getUrl(
            `Items/${item.Id}/Images/Backdrop/0`,
            {
                tag: item.BackdropImageTags[0],
                maxWidth: 1600,
                quality: 86
            }
        );
    }

    async function loadItems(type, limit = 12) {
        const client = getApiClient();
        const userId = getCurrentUserId();

        if (!client || !userId) {
            throw new Error(
                "Jellyfin ApiClient oder Benutzer ist nicht verfügbar."
            );
        }

        const parameters = {
            Recursive: true,
            IncludeItemTypes: type,
            SortBy: "DateCreated,PremiereDate",
            SortOrder: "Descending",
            Limit: limit,
            Fields:
                "Overview,ProductionYear,CommunityRating," +
                "PrimaryImageAspectRatio," +
                "BackdropImageTags",
            ImageTypeLimit: 1,
            EnableImages: true,
            EnableUserData: true
        };

        if (typeof client.getItems === "function") {
            const response =
                await client.getItems(
                    userId,
                    parameters
                );

            return response?.Items || [];
        }

        const url = client.getUrl(
            `Users/${userId}/Items`,
            {
                recursive: true,
                includeItemTypes: type,
                sortBy: "DateCreated,PremiereDate",
                sortOrder: "Descending",
                limit,
                fields:
                    "Overview,ProductionYear,CommunityRating," +
                    "PrimaryImageAspectRatio," +
                    "BackdropImageTags",
                imageTypeLimit: 1,
                enableImages: true,
                enableUserData: true
            }
        );

        const response = await client.ajax({
            type: "GET",
            url,
            dataType: "json"
        });

        return response?.Items || [];
    }

    function openDetails(itemId) {
        window.location.hash =
            `/details?id=${encodeURIComponent(itemId)}`;
    }

    function createPosterCard(item) {
        const card = document.createElement("article");

        card.className = "threetide-poster-card";
        card.tabIndex = 0;
        card.setAttribute("role", "link");
        card.setAttribute(
            "aria-label",
            item.Name || "Titel öffnen"
        );

        const posterUrl = getPosterUrl(item);

        const rating =
            typeof item.CommunityRating === "number"
                ? item.CommunityRating.toFixed(1)
                : "";

        const year =
            item.ProductionYear || "";

        card.innerHTML = `
            <div class="threetide-poster-image">
                ${posterUrl
                ? `<img
                            src="${escapeHtml(posterUrl)}"
                            alt="${escapeHtml(item.Name)}"
                            loading="lazy">`
                : `<div class="threetide-poster-placeholder">
                            ${escapeHtml(item.Name)}
                           </div>`
            }

                <div class="threetide-poster-hover">
                    <button
                        type="button"
                        class="threetide-poster-open"
                        aria-label="Weitere Infos">
                        <span
                            class="material-icons"
                            aria-hidden="true">
                            play_arrow
                        </span>
                    </button>

                    <div class="threetide-poster-hover-meta">
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
            </div>

            <h3>${escapeHtml(item.Name)}</h3>
        `;

        function activate() {
            openDetails(item.Id);
        }

        card.addEventListener("click", activate);

        card.addEventListener("keydown", (event) => {
            if (
                event.key === "Enter" ||
                event.key === " "
            ) {
                event.preventDefault();
                activate();
            }
        });

        return card;
    }

    function createContentSection(title, items) {
        const section = document.createElement("section");

        section.className =
            "threetide-home-section";

        const header =
            document.createElement("header");

        header.className =
            "threetide-section-header";

        header.innerHTML = `
            <h2>${escapeHtml(title)}</h2>

            <div class="threetide-row-controls">
                <button
                    type="button"
                    data-direction="previous"
                    aria-label="Nach links">
                    ‹
                </button>

                <button
                    type="button"
                    data-direction="next"
                    aria-label="Nach rechts">
                    ›
                </button>
            </div>
        `;

        const row = document.createElement("div");

        row.className = "threetide-poster-row";

        items.forEach((item) => {
            row.appendChild(
                createPosterCard(item)
            );
        });

        header
            .querySelector(
                '[data-direction="previous"]'
            )
            ?.addEventListener("click", () => {
                row.scrollBy({
                    left: -row.clientWidth * 0.82,
                    behavior: "smooth"
                });
            });

        header
            .querySelector(
                '[data-direction="next"]'
            )
            ?.addEventListener("click", () => {
                row.scrollBy({
                    left: row.clientWidth * 0.82,
                    behavior: "smooth"
                });
            });

        section.append(header, row);

        return section;
    }

    function createFeatureCard(options) {
        const card = document.createElement("button");

        card.type = "button";
        card.className =
            `threetide-feature-card ${options.className || ""}`;

        if (options.backgroundUrl) {
            card.style.setProperty(
                "--threetide-feature-image",
                `url("${options.backgroundUrl.replace(
                    /"/g,
                    "%22"
                )}")`
            );
        }

        card.innerHTML = `
            <div class="threetide-feature-shade"></div>

            <div class="threetide-feature-content">
                <span class="threetide-feature-eyebrow">
                    ${escapeHtml(options.eyebrow)}
                </span>

                <h2>${escapeHtml(options.title)}</h2>

                <p>${escapeHtml(options.description)}</p>

                <span class="threetide-feature-action">
                    <span
                        class="material-icons"
                        aria-hidden="true">
                        ${escapeHtml(options.icon)}
                    </span>

                    ${escapeHtml(options.actionLabel)}
                </span>
            </div>
        `;

        card.addEventListener(
            "click",
            options.onClick
        );

        return card;
    }

    function openLiveTv() {
        window.location.hash =
            "/livetv?collectionType=livetv";
    }

    function openSeerr() {
        const discover =
            window.ThreeTide?.Discover;

        if (
            discover &&
            typeof discover.open === "function"
        ) {
            discover.open();
            return;
        }

        window.ThreeTide?.UI?.error(
            "Das Discover-Modul wurde nicht geladen.",
            "3Tide"
        );

        console.error(
            "[3Tide] ThreeTide.Discover.open ist nicht verfügbar."
        );
    }

    function createFeatureSection(
        movieItems,
        seriesItems
    ) {
        const section =
            document.createElement("section");

        section.className =
            "threetide-feature-grid";

        const liveBackground =
            getBackdropUrl(
                movieItems[1] ||
                movieItems[0]
            );

        const requestBackground =
            getBackdropUrl(
                seriesItems[1] ||
                seriesItems[0]
            );

        section.append(
            createFeatureCard({
                className:
                    "threetide-live-card",

                eyebrow:
                    "3Tide Live",

                title:
                    "Live TV",

                description:
                    "Sender, laufende Sendungen und Live-Programm direkt öffnen.",

                actionLabel:
                    "Live ansehen",

                icon:
                    "live_tv",

                backgroundUrl:
                    liveBackground,

                onClick:
                    openLiveTv
            })
        );

        const config = getConfig();

        if (
            config.enableSeerrButton &&
            config.seerrUrl
        ) {
            section.append(
                createFeatureCard({
                    className:
                        "threetide-request-card",

                    eyebrow:
                        "Fehlt dir etwas?",

                    title:
                        "Film oder Serie anfragen",

                    description:
                        "Neue Inhalte bequem über Seerr wünschen.",

                    actionLabel:
                        config.label || "Anfragen",

                    icon:
                        "add_circle",

                    backgroundUrl:
                        requestBackground,

                    onClick:
                        openSeerr
                })
            );
        }

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

                section.classList.add(
                    "threetide-default-libraries-hidden"
                );
            });
    }

    function insertCustomHome(root) {
        const container = findHomeContainer();
        const hero =
            document.getElementById("threetide-hero");

        if (hero?.parentNode) {
            hero.parentNode.insertBefore(
                root,
                hero.nextSibling
            );
            return true;
        }

        if (container) {
            container.prepend(root);
            return true;
        }

        return false;
    }

    async function render() {
        if (
            loading ||
            document.getElementById(ROOT_ID)
        ) {
            return;
        }

        if (
            !isHomePage() ||
            !getApiClient() ||
            !getCurrentUserId()
        ) {
            scheduleRetry();
            return;
        }

        loading = true;

        try {
            const [
                movies,
                series
            ] = await Promise.all([
                loadItems("Movie", 14),
                loadItems("Series", 14)
            ]);

            if (!isHomePage()) {
                return;
            }

            const root =
                document.createElement("div");

            root.id = ROOT_ID;
            root.className =
                "threetide-home-content";

            if (movies.length || series.length) {
                root.appendChild(
                    createFeatureSection(
                        movies,
                        series
                    )
                );
            }

            if (movies.length) {
                root.appendChild(
                    createContentSection(
                        "Neueste Filme",
                        movies
                    )
                );
            }

            if (series.length) {
                root.appendChild(
                    createContentSection(
                        "Neueste Serien",
                        series
                    )
                );
            }

            if (!insertCustomHome(root)) {
                root.remove();
                scheduleRetry();
                return;
            }

            clearRetry();

            console.info(
                `[3Tide] Startseite geladen: ` +
                `${movies.length} Filme, ` +
                `${series.length} Serien`
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
        document
            .getElementById(ROOT_ID)
            ?.remove();

        document
            .querySelectorAll(
                ".threetide-default-libraries-hidden"
            )
            .forEach((element) => {
                element.classList.remove(
                    "threetide-default-libraries-hidden"
                );
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
        if (retryTimer !== null) {
            return;
        }

        retryTimer =
            window.setTimeout(() => {
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

        observer =
            new MutationObserver(sync);

        observer.observe(
            document.documentElement,
            {
                childList: true,
                subtree: true
            }
        );

        window.addEventListener(
            "hashchange",
            () => {
                window.setTimeout(
                    sync,
                    150
                );
            }
        );

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