(() => {
    "use strict";

    const ROOT_ID = "threetide-catalog";
    const RETRY_MS = 900;

    let observer = null;
    let loading = false;
    let retryTimer = null;

    function getClient() {
        return window.ApiClient || (
            typeof ApiClient !== "undefined"
                ? ApiClient
                : null
        );
    }

    function getUserId() {
        return getClient()?.getCurrentUserId?.() || "";
    }

    function routeType() {
        const hash =
            String(window.location.hash || "")
                .toLowerCase();

        if (hash.includes("movies")) {
            return "movie";
        }

        if (
            hash.includes("/tv") ||
            hash.includes("series")
        ) {
            return "series";
        }

        return "";
    }

    function escapeHtml(value) {
        const element =
            document.createElement("div");

        element.textContent =
            String(value ?? "");

        return element.innerHTML;
    }

    function getImageUrl(item) {
        const client = getClient();

        if (!client || !item?.Id) {
            return "";
        }

        if (!item?.ImageTags?.Primary) {
            return "";
        }

        return client.getUrl(
            `Items/${item.Id}/Images/Primary`,
            {
                tag: item.ImageTags.Primary,
                maxWidth: 500,
                quality: 88
            }
        );
    }

    async function getItems(parameters) {
        const client = getClient();
        const userId = getUserId();

        if (!client || !userId) {
            return [];
        }

        const request = {
            Recursive: true,
            EnableImages: true,
            EnableUserData: true,
            ImageTypeLimit: 1,
            Fields:
                "ProductionYear,CommunityRating,ImageTags,Genres",
            ...parameters
        };

        if (typeof client.getItems === "function") {
            const response =
                await client.getItems(
                    userId,
                    request
                );

            return response?.Items || [];
        }

        return [];
    }

    async function loadRow(
        itemType,
        options
    ) {
        return getItems({
            IncludeItemTypes: itemType,
            SortBy:
                options.sortBy ||
                "DateCreated",
            SortOrder:
                options.sortOrder ||
                "Descending",
            Genres:
                options.genre ||
                undefined,
            Limit:
                options.limit ||
                20
        });
    }

    function createCard(item) {
        const card =
            document.createElement("article");

        card.className =
            "threetide-catalog-card";

        card.tabIndex = 0;

        const image =
            getImageUrl(item);

        const rating =
            Number.isFinite(
                Number(item.CommunityRating)
            )
                ? Number(
                    item.CommunityRating
                ).toFixed(1)
                : "";

        card.innerHTML = `
            <div class="threetide-catalog-poster">
                ${
                    image
                        ? `
                            <img
                                src="${escapeHtml(image)}"
                                alt="${escapeHtml(item.Name || "")}"
                                loading="lazy">
                          `
                        : `
                            <div class="threetide-catalog-placeholder">
                                ${escapeHtml(item.Name || "Titel")}
                            </div>
                          `
                }

                <div class="threetide-catalog-overlay">
                    <span class="material-icons">
                        play_arrow
                    </span>
                </div>
            </div>

            <h3>${escapeHtml(item.Name || "Unbekannter Titel")}</h3>

            <div class="threetide-catalog-meta">
                ${
                    item.ProductionYear
                        ? `<span>${item.ProductionYear}</span>`
                        : ""
                }

                ${
                    rating
                        ? `<span>&#9733; ${rating}</span>`
                        : ""
                }
            </div>
        `;

        const open = () => {
            window.location.hash =
                `/details?id=${encodeURIComponent(item.Id)}`;
        };

        card.addEventListener("click", open);

        card.addEventListener(
            "keydown",
            (event) => {
                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {
                    event.preventDefault();
                    open();
                }
            }
        );

        return card;
    }

    function createSection(
        title,
        items
    ) {
        if (!items.length) {
            return null;
        }

        const section =
            document.createElement("section");

        section.className =
            "threetide-catalog-section";

        section.innerHTML = `
            <header>
                <h2>${escapeHtml(title)}</h2>
            </header>
        `;

        const row =
            document.createElement("div");

        row.className =
            "threetide-catalog-row";

        items.forEach((item) => {
            row.appendChild(
                createCard(item)
            );
        });

        section.appendChild(row);

        return section;
    }

    function hideNativePage() {
        document
            .querySelectorAll(
                ".itemsContainer, .verticalSection, .pageTabContent"
            )
            .forEach((element) => {
                if (
                    element.closest(`#${ROOT_ID}`)
                ) {
                    return;
                }

                element.classList.add(
                    "threetide-native-catalog-hidden"
                );
            });
    }

    function showNativePage() {
        document
            .querySelectorAll(
                ".threetide-native-catalog-hidden"
            )
            .forEach((element) => {
                element.classList.remove(
                    "threetide-native-catalog-hidden"
                );
            });
    }

    async function render() {
        const type =
            routeType();

        if (!type) {
            document.getElementById(ROOT_ID)?.remove();
            showNativePage();
            return;
        }

        if (
            loading ||
            document.getElementById(ROOT_ID)
        ) {
            hideNativePage();
            return;
        }

        loading = true;

        try {
            const itemType =
                type === "movie"
                    ? "Movie"
                    : "Series";

            const rows =
                type === "movie"
                    ? [
                        ["Neu auf 3Tide", {}],
                        ["Top bewertet", {
                            sortBy: "CommunityRating"
                        }],
                        ["Action", {
                            genre: "Action"
                        }],
                        ["Thriller", {
                            genre: "Thriller"
                        }],
                        ["Science-Fiction", {
                            genre: "Science Fiction"
                        }],
                        ["Komödie", {
                            genre: "Comedy"
                        }],
                        ["Animation", {
                            genre: "Animation"
                        }]
                    ]
                    : [
                        ["Neue Serien", {}],
                        ["Top bewertet", {
                            sortBy: "CommunityRating"
                        }],
                        ["Drama", {
                            genre: "Drama"
                        }],
                        ["Krimi", {
                            genre: "Crime"
                        }],
                        ["Comedy", {
                            genre: "Comedy"
                        }],
                        ["Science-Fiction", {
                            genre: "Science Fiction"
                        }],
                        ["Dokumentationen", {
                            genre: "Documentary"
                        }]
                    ];

            const loaded =
                await Promise.all(
                    rows.map(
                        async ([title, options]) => [
                            title,
                            await loadRow(
                                itemType,
                                options
                            )
                        ]
                    )
                );

            const root =
                document.createElement("main");

            root.id = ROOT_ID;
            root.className =
                `threetide-catalog threetide-catalog-${type}`;

            root.innerHTML = `
                <section class="threetide-catalog-hero">
                    <span>
                        ${
                            type === "movie"
                                ? "3Tide Filme"
                                : "3Tide Serien"
                        }
                    </span>

                    <h1>
                        ${
                            type === "movie"
                                ? "Filme für jeden Abend."
                                : "Serien, die dich nicht loslassen."
                        }
                    </h1>
                </section>
            `;

            loaded.forEach(
                ([title, items]) => {
                    const section =
                        createSection(
                            title,
                            items
                        );

                    if (section) {
                        root.appendChild(section);
                    }
                }
            );

            const page =
                document.querySelector(
                    ".page:not(.hide), .mainAnimatedPage:not(.hide)"
                ) ||
                document.querySelector(
                    ".mainAnimatedPages"
                );

            if (page) {
                page.prepend(root);
                hideNativePage();
            }
        } catch (error) {
            console.error(
                "[3Tide Catalog] Fehler:",
                error
            );
        } finally {
            loading = false;
        }
    }

    function schedule() {
        if (retryTimer !== null) {
            return;
        }

        retryTimer =
            window.setTimeout(
                () => {
                    retryTimer = null;
                    render();
                },
                RETRY_MS
            );
    }

    function start() {
        if (observer) {
            render();
            return;
        }

        observer =
            new MutationObserver(() => {
                render();
                schedule();
            });

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
                document.getElementById(ROOT_ID)?.remove();
                showNativePage();
                schedule();
            }
        );

        render();
        schedule();
    }

    window.ThreeTideCatalog = {
        start,
        refresh() {
            document.getElementById(ROOT_ID)?.remove();
            showNativePage();
            render();
        }
    };

    start();
})();