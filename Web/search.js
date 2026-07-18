/*
 * 3Tide Search JS
 */


    (() => {
        "use strict";

        const OVERLAY_ID = "threetide-search-overlay";
        const TRIGGER_ID = "threetide-search-trigger";
        const DEBOUNCE_MS = 350;
        const MIN_QUERY_LENGTH = 2;

        let debounceTimer = null;
        let requestToken = 0;

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

        function getPosterUrl(item) {
            const client = getApiClient();
            const primaryTag = item?.ImageTags?.Primary;

            if (!client || !item?.Id || !primaryTag) {
                return "";
            }

            return client.getUrl(
                `Items/${item.Id}/Images/Primary`,
                {
                    tag: primaryTag,
                    maxWidth: 400,
                    quality: 85
                }
            );
        }

        async function searchLibrary(term) {
            const client = getApiClient();
            const userId = getCurrentUserId();

            if (!client || !userId) {
                return [];
            }

            const parameters = {
                Recursive: true,
                IncludeItemTypes: "Movie,Series",
                SearchTerm: term,
                Limit: 24,
                Fields: "ProductionYear,ImageTags",
                ImageTypeLimit: 1,
                EnableImages: true
            };

            let response;

            if (typeof client.getItems === "function") {
                response = await client.getItems(
                    userId,
                    parameters
                );
            } else {
                const url = client.getUrl(
                    `Users/${userId}/Items`,
                    parameters
                );

                response = await client.ajax({
                    type: "GET",
                    url,
                    dataType: "json"
                });
            }

            return response?.Items || [];
        }

        function openDetails(itemId) {
            closeOverlay();

            window.location.hash =
                `/details?id=${encodeURIComponent(itemId)}`;
        }

        function openSeerrSearch(term) {
            const config = getConfig();

            if (!config.seerrUrl) {
                return;
            }

            const url =
                `${config.seerrUrl}/search?query=` +
                encodeURIComponent(term);

            if (config.openInNewTab) {
                window.open(url, "_blank", "noopener,noreferrer");
            } else {
                window.location.assign(url);
            }
        }

        function renderResults(container, term, items) {
            if (!items.length) {
                const config = getConfig();

                container.innerHTML = `
                <div class="threetide-search-empty">
                    <p>
                        Keine Treffer in deiner Bibliothek für
                        „${escapeHtml(term)}“.
                    </p>
                </div>
            `;

                if (config.enableSeerrButton && config.seerrUrl) {
                    const seerrButton =
                        document.createElement("button");

                    seerrButton.type = "button";
                    seerrButton.className =
                        "threetide-search-seerr-button";

                    seerrButton.innerHTML =
                        '<span class="material-icons" ' +
                        'aria-hidden="true">add_circle</span>' +
                        `„${escapeHtml(term)}“ bei ` +
                        `${escapeHtml(
                            config.brandName || "Seerr"
                        )} anfragen`;

                    seerrButton.addEventListener(
                        "click",
                        () => openSeerrSearch(term)
                    );

                    container
                        .querySelector(
                            ".threetide-search-empty"
                        )
                        ?.appendChild(seerrButton);
                }

                return;
            }

            const grid = document.createElement("div");

            grid.className = "threetide-search-grid";

            items.forEach((item) => {
                const posterUrl = getPosterUrl(item);
                const year = item.ProductionYear || "";

                const card =
                    document.createElement("article");

                card.className = "threetide-search-card";
                card.tabIndex = 0;
                card.setAttribute("role", "link");
                card.setAttribute(
                    "aria-label",
                    item.Name || "Titel öffnen"
                );

                card.innerHTML = `
                <div class="threetide-search-poster">
                    ${posterUrl
                        ? `<img
                                src="${escapeHtml(posterUrl)}"
                                alt="${escapeHtml(item.Name)}"
                                loading="lazy">`
                        : `<div class="threetide-search-placeholder">
                                ${escapeHtml(item.Name)}
                               </div>`
                    }
                </div>
 
                <h4>${escapeHtml(item.Name)}</h4>
 
                ${year
                        ? `<span class="threetide-search-year">
                            ${escapeHtml(year)}
                           </span>`
                        : ""
                    }
            `;

                card.addEventListener("click", () => {
                    openDetails(item.Id);
                });

                card.addEventListener("keydown", (event) => {
                    if (
                        event.key === "Enter" ||
                        event.key === " "
                    ) {
                        event.preventDefault();
                        openDetails(item.Id);
                    }
                });

                grid.appendChild(card);
            });

            container.innerHTML = "";
            container.appendChild(grid);
        }

        async function runSearch(term, resultsEl, statusEl) {
            const token = ++requestToken;

            if (term.trim().length < MIN_QUERY_LENGTH) {
                resultsEl.innerHTML = "";
                statusEl.textContent = "";
                return;
            }

            statusEl.textContent = "Suche läuft …";

            try {
                const items = await searchLibrary(term.trim());

                if (token !== requestToken) {
                    return;
                }

                statusEl.textContent = "";
                renderResults(resultsEl, term.trim(), items);
            } catch (error) {
                if (token !== requestToken) {
                    return;
                }

                console.error(
                    "[3Tide] Suche fehlgeschlagen.",
                    error
                );

                statusEl.textContent =
                    "Suche momentan nicht verfügbar.";
            }
        }

        function closeOverlay() {
            document
                .getElementById(OVERLAY_ID)
                ?.remove();

            document.body.style.overflow = "";
        }

        function openOverlay() {
            if (document.getElementById(OVERLAY_ID)) {
                return;
            }

            const overlay =
                document.createElement("div");

            overlay.id = OVERLAY_ID;
            overlay.className =
                "threetide-search-overlay";

            overlay.innerHTML = `
            <div class="threetide-search-panel">
                <div class="threetide-search-inputRow">
                    <span
                        class="material-icons"
                        aria-hidden="true">
                        search
                    </span>
 
                    <input
                        type="text"
                        class="threetide-search-input"
                        placeholder="Filme, Serien suchen ..."
                        autocomplete="off"
                        spellcheck="false">
 
                    <button
                        type="button"
                        class="threetide-search-close"
                        aria-label="Suche schließen">
                        <span
                            class="material-icons"
                            aria-hidden="true">
                            close
                        </span>
                    </button>
                </div>
 
                <div class="threetide-search-status"></div>
                <div class="threetide-search-results"></div>
            </div>
        `;

            document.body.appendChild(overlay);
            document.body.style.overflow = "hidden";

            const input = overlay.querySelector(
                ".threetide-search-input"
            );

            const resultsEl = overlay.querySelector(
                ".threetide-search-results"
            );

            const statusEl = overlay.querySelector(
                ".threetide-search-status"
            );

            overlay
                .querySelector(".threetide-search-close")
                ?.addEventListener("click", closeOverlay);

            overlay.addEventListener("click", (event) => {
                if (event.target === overlay) {
                    closeOverlay();
                }
            });

            input.addEventListener("input", () => {
                window.clearTimeout(debounceTimer);

                debounceTimer = window.setTimeout(() => {
                    runSearch(input.value, resultsEl, statusEl);
                }, DEBOUNCE_MS);
            });

            window.setTimeout(() => input.focus(), 30);

            document.addEventListener(
                "keydown",
                function onKeydown(event) {
                    if (event.key === "Escape") {
                        closeOverlay();
                        document.removeEventListener(
                            "keydown",
                            onKeydown
                        );
                    }
                }
            );
        }

        async function ensureLibraryLinks() {
            if (document.getElementById("threetide-library-links")) {
                return;
            }

            const headerLeft = document.querySelector(
                ".skinHeader .headerLeft"
            );

            const client = getApiClient();
            const userId = getCurrentUserId();

            if (!headerLeft || !client || !userId) {
                return;
            }

            let views;

            try {
                if (typeof client.getUserViews === "function") {
                    const response =
                        await client.getUserViews(userId);
                    views = response?.Items || [];
                } else {
                    const url = client.getUrl(
                        `Users/${userId}/Views`
                    );

                    const response = await (
                        typeof client.ajax === "function"
                            ? client.ajax({
                                type: "GET",
                                url,
                                dataType: "json"
                            })
                            : fetch(url, {
                                credentials: "same-origin"
                            }).then((r) => r.json())
                    );

                    views = response?.Items || [];
                }
            } catch (error) {
                console.error(
                    "[3Tide] Bibliotheken konnten nicht " +
                    "geladen werden.",
                    error
                );

                return;
            }

            const relevant = views.filter((view) =>
                view.CollectionType === "movies" ||
                view.CollectionType === "tvshows"
            );

            if (!relevant.length) {
                return;
            }

            const nav = document.createElement("nav");

            nav.id = "threetide-library-links";
            nav.className = "threetide-library-links";

            relevant.forEach((view) => {
                const link = document.createElement("button");

                link.type = "button";
                link.className = "threetide-library-link";
                link.textContent = view.Name;

                link.addEventListener("click", () => {
                    window.location.hash =
                        `/list.html?parentId=${encodeURIComponent(
                            view.Id
                        )}`;
                });

                nav.appendChild(link);
            });

            headerLeft.appendChild(nav);
        }

        function ensureSearchTrigger() {
            if (document.getElementById(TRIGGER_ID)) {
                return;
            }

            const headerLeft = document.querySelector(
                ".skinHeader .headerLeft"
            );

            if (!headerLeft) {
                return;
            }

            const trigger =
                document.createElement("button");

            trigger.id = TRIGGER_ID;
            trigger.type = "button";
            trigger.className =
                "threetide-search-trigger";
            trigger.setAttribute(
                "aria-label",
                "Suche öffnen"
            );

            trigger.innerHTML =
                '<span class="material-icons" ' +
                'aria-hidden="true">search</span>';

            trigger.addEventListener("click", openOverlay);

            headerLeft.appendChild(trigger);
        }

        function start() {
            ensureSearchTrigger();

            const observer = new MutationObserver(() => {
                ensureSearchTrigger();
            });

            observer.observe(document.documentElement, {
                childList: true,
                subtree: true
            });
        }

        window.ThreeTideSearch = {
            start,
            open: openOverlay,
            close: closeOverlay
        };
    })();


































