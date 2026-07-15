(() => {
    "use strict";

    const HERO_ID = "threetide-hero";
    const MAX_OVERVIEW_LENGTH = 330;

    let currentItem = null;
    let loading = false;

    function findHomeContainer() {
        return document.querySelector(
            ".homeSectionsContainer, .homeSections, #homeTab"
        );
    }

    function isHomePage() {
        return Boolean(findHomeContainer());
    }

    function truncate(text, maxLength) {
        const value = String(text || "").trim();

        if (value.length <= maxLength) {
            return value;
        }

        return `${value.slice(0, maxLength).trim()}…`;
    }

    function escapeHtml(value) {
        const element = document.createElement("div");
        element.textContent = String(value || "");
        return element.innerHTML;
    }

    function getUserId() {
        return window.ApiClient?.getCurrentUserId?.() || "";
    }

    function getBackdropUrl(item) {
        if (!item?.Id) {
            return "";
        }

        const backdropTag =
            item.BackdropImageTags?.[0] ||
            item.ParentBackdropImageTags?.[0];

        const imageItemId =
            item.BackdropImageTags?.length
                ? item.Id
                : item.ParentBackdropItemId || item.Id;

        if (!backdropTag) {
            return "";
        }

        return ApiClient.getUrl(
            `Items/${imageItemId}/Images/Backdrop/0`,
            {
                tag: backdropTag,
                maxWidth: 1920,
                quality: 90
            }
        );
    }

    async function loadHeroItem() {
        const userId = getUserId();

        if (!userId) {
            throw new Error("Kein angemeldeter Jellyfin-Benutzer gefunden.");
        }

        const url = ApiClient.getUrl(
            `Users/${userId}/Items`,
            {
                recursive: true,
                includeItemTypes: "Movie,Series",
                sortBy: "DateCreated,PremiereDate",
                sortOrder: "Descending",
                limit: 20,
                fields:
                    "Overview,Taglines,Genres,ProductionYear," +
                    "CommunityRating,BackdropImageTags," +
                    "ParentBackdropImageTags,ParentBackdropItemId",
                imageTypeLimit: 1,
                enableImages: true,
                enableUserData: true
            }
        );

        const response = await ApiClient.ajax({
            type: "GET",
            url,
            dataType: "json"
        });

        const items = response?.Items || [];

        const candidates = items.filter((item) => {
            return (
                item?.Id &&
                item?.Name &&
                (
                    item.BackdropImageTags?.length ||
                    item.ParentBackdropImageTags?.length
                )
            );
        });

        if (!candidates.length) {
            throw new Error("Kein passender Film oder keine Serie gefunden.");
        }

        return candidates[
            Math.floor(Math.random() * Math.min(candidates.length, 8))
        ];
    }

    function openDetails(itemId) {
        window.location.hash =
            `#!/details?id=${encodeURIComponent(itemId)}`;
    }

    function playItem(itemId) {
        if (
            window.PlaybackManager &&
            typeof window.PlaybackManager.play === "function"
        ) {
            window.PlaybackManager.play({
                ids: [itemId]
            });

            return;
        }

        openDetails(itemId);
    }

    function createHero(item) {
        const hero = document.createElement("section");
        hero.id = HERO_ID;

        const backdropUrl = getBackdropUrl(item);
        const year = item.ProductionYear
            ? `<span>${escapeHtml(item.ProductionYear)}</span>`
            : "";

        const rating =
            typeof item.CommunityRating === "number"
                ? `<span>★ ${item.CommunityRating.toFixed(1)}</span>`
                : "";

        const type =
            item.Type === "Series"
                ? "<span>Serie</span>"
                : "<span>Film</span>";

        hero.innerHTML = `
            <div class="threetide-hero-backdrop"></div>
            <div class="threetide-hero-shade"></div>

            <div class="threetide-hero-content">
                <span class="threetide-hero-eyebrow">
                    Neu auf 3Tide
                </span>

                <h1>${escapeHtml(item.Name)}</h1>

                <div class="threetide-hero-meta">
                    ${type}
                    ${year}
                    ${rating}
                </div>

                <p>
                    ${escapeHtml(
            truncate(
                item.Overview ||
                item.Taglines?.[0] ||
                "Jetzt auf 3Tide ansehen.",
                MAX_OVERVIEW_LENGTH
            )
        )}
                </p>

                <div class="threetide-hero-actions">
                    <button type="button"
                            class="threetide-hero-primary"
                            data-action="play">
                        <span class="material-icons"
                              aria-hidden="true">play_arrow</span>
                        Abspielen
                    </button>

                    <button type="button"
                            class="threetide-hero-secondary"
                            data-action="details">
                        <span class="material-icons"
                              aria-hidden="true">info</span>
                        Weitere Infos
                    </button>
                </div>
            </div>
        `;

        if (backdropUrl) {
            const backdrop =
                hero.querySelector(".threetide-hero-backdrop");

            backdrop.style.backgroundImage =
                `url("${backdropUrl.replace(/"/g, "%22")}")`;
        }

        hero
            .querySelector('[data-action="play"]')
            .addEventListener("click", () => {
                playItem(item.Id);
            });

        hero
            .querySelector('[data-action="details"]')
            .addEventListener("click", () => {
                openDetails(item.Id);
            });

        return hero;
    }

    async function init() {
        if (!isHomePage()) {
            destroy();
            return;
        }

        if (document.getElementById(HERO_ID) || loading) {
            return;
        }

        const container = findHomeContainer();

        if (!container) {
            return;
        }

        loading = true;

        try {
            currentItem ||= await loadHeroItem();

            if (!isHomePage()) {
                return;
            }

            container.prepend(createHero(currentItem));
            console.info(
                `3Tide Hero loaded: ${currentItem.Name}`
            );
        } catch (error) {
            console.error("3Tide Hero konnte nicht geladen werden.", error);
        } finally {
            loading = false;
        }
    }

    function destroy() {
        document.getElementById(HERO_ID)?.remove();
    }

    function refresh() {
        currentItem = null;
        destroy();
        init();
    }

    window.ThreeTideHero = {
        init,
        destroy,
        refresh
    };
})();