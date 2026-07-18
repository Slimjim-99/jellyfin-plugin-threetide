(() => {
    "use strict";

    const ROOT_CLASS = "threetide-details-enhanced";
    const VIDEO_CLASS = "threetide-details-preview-video";
    const PREVIEW_DELAY_MS = 900;

    let observer = null;
    let timer = null;
    let activeItemId = "";
    let previewTimer = null;
    let activeVideo = null;

    function getApiClient() {
        try {
            if (typeof ApiClient !== "undefined" && ApiClient) {
                return ApiClient;
            }
        } catch {
            // API not ready yet.
        }

        return window.ApiClient || null;
    }

    function getItemId() {
        const hash = String(window.location.hash || "");
        const match = hash.match(/[?&]id=([^&]+)/i);
        return match ? decodeURIComponent(match[1]) : "";
    }

    function imageUrl(client, itemId, type, index = 0, options = {}) {
        return client.getUrl(
            `Items/${itemId}/Images/${type}/${index}`,
            options
        );
    }

    function shouldAutoplayPreview() {
        return !(
            window.matchMedia?.(
                "(prefers-reduced-motion: reduce)"
            )?.matches ||
            navigator.connection?.saveData === true
        );
    }

    async function requestJson(client, url) {
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

        const seconds = Number(item?.RunTimeTicks || 0) / 10000000;
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

    async function findPreview(client, userId, item) {
        const endpoints = [
            `Items/${item.Id}/LocalTrailers`,
            `Items/${item.Id}/SpecialFeatures`,
            `Items/${item.Id}/ThemeVideos`
        ];

        for (const endpoint of endpoints) {
            try {
                const result = await requestJson(
                    client,
                    client.getUrl(endpoint)
                );

                const selected = choosePreview(
                    result?.Items || result
                );

                if (selected) {
                    return selected;
                }
            } catch {
                // Optional endpoint.
            }
        }

        try {
            const result = await requestJson(
                client,
                client.getUrl(
                    `Users/${userId}/Items`,
                    {
                        ParentId: item.Id,
                        Recursive: true,
                        IncludeItemTypes: "Video,Movie,Episode",
                        Fields: "Path,RunTimeTicks",
                        Limit: 30
                    }
                )
            );

            return choosePreview(result?.Items);
        } catch {
            return null;
        }
    }

    function stopPreview() {
        window.clearTimeout(previewTimer);
        previewTimer = null;

        if (!activeVideo) {
            return;
        }

        activeVideo.classList.remove(
            "threetide-details-preview-video--active"
        );
        activeVideo.pause();
        activeVideo.removeAttribute("src");
        activeVideo.load();
        activeVideo.remove();
        activeVideo = null;
    }

    async function startPreview(page, client, userId, item) {
        if (!shouldAutoplayPreview() || !page.isConnected) {
            return;
        }

        const selected = await findPreview(
            client,
            userId,
            item
        );

        if (
            !selected?.Id ||
            !page.isConnected ||
            getItemId() !== item.Id
        ) {
            return;
        }

        stopPreview();

        const video = document.createElement("video");
        video.className = VIDEO_CLASS;
        video.muted = true;
        video.autoplay = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = "metadata";
        video.disablePictureInPicture = true;
        video.setAttribute("aria-hidden", "true");

        video.src = client.getUrl(
            `Videos/${selected.Id}/stream`,
            {
                Static: true,
                mediaSourceId: selected.Id
            }
        );

        page.prepend(video);
        activeVideo = video;

        try {
            await video.play();
            video.classList.add(
                "threetide-details-preview-video--active"
            );
            page.classList.add(
                "threetide-details-has-preview"
            );
        } catch {
            stopPreview();
        }
    }

    function addBackButton(page) {
        if (page.querySelector(".threetide-details-back")) {
            return;
        }

        const button = document.createElement("button");
        button.type = "button";
        button.className = "threetide-details-back";
        button.setAttribute("aria-label", "Zurück");
        button.innerHTML = `
            <span class="material-icons" aria-hidden="true">arrow_back</span>
        `;
        button.addEventListener("click", () => {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.hash = "/home.html";
            }
        });

        page.prepend(button);
    }

    async function enhance() {
        const page = document.querySelector(".itemDetailPage");
        const itemId = getItemId();
        const client = getApiClient();
        const userId = client?.getCurrentUserId?.() || "";

        if (!page || !itemId || !client || !userId) {
            return;
        }

        if (
            page.classList.contains(ROOT_CLASS) &&
            activeItemId === itemId
        ) {
            return;
        }

        stopPreview();

        try {
            const item = await client.getItem(userId, itemId);
            if (!page.isConnected || getItemId() !== itemId) {
                return;
            }

            activeItemId = itemId;
            page.classList.add(ROOT_CLASS);
            addBackButton(page);

            const backdropTag = item?.BackdropImageTags?.[0];
            if (backdropTag) {
                page.style.setProperty(
                    "--threetide-details-backdrop",
                    `url("${imageUrl(client, itemId, "Backdrop", 0, {
                        tag: backdropTag,
                        maxWidth: 1920,
                        quality: 90
                    }).replace(/"/g, "%22")}")`
                );
            }

            let imageContainer = page.querySelector(
                ".detailImageContainer"
            );

            if (!imageContainer) {
                const primary = page.querySelector(
                    ".detailPagePrimaryContainer"
                );
                if (primary) {
                    imageContainer = document.createElement("div");
                    imageContainer.className =
                        "detailImageContainer threetide-created-poster";
                    primary.prepend(imageContainer);
                }
            }

            if (
                imageContainer &&
                !imageContainer.querySelector("img") &&
                item?.ImageTags?.Primary
            ) {
                const poster = document.createElement("img");
                poster.className = "threetide-details-poster";
                poster.alt = item.Name || "Poster";
                poster.src = imageUrl(
                    client,
                    itemId,
                    "Primary",
                    0,
                    {
                        tag: item.ImageTags.Primary,
                        maxHeight: 900,
                        quality: 90
                    }
                );
                imageContainer.appendChild(poster);
            }

            previewTimer = window.setTimeout(
                () => startPreview(page, client, userId, item),
                PREVIEW_DELAY_MS
            );
        } catch (error) {
            console.warn(
                "[3Tide] Detailseite konnte nicht erweitert werden.",
                error
            );
        }
    }

    function schedule() {
        window.clearTimeout(timer);
        timer = window.setTimeout(enhance, 120);
    }

    function start() {
        if (observer) {
            schedule();
            return;
        }

        observer = new MutationObserver(schedule);
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        window.addEventListener("hashchange", () => {
            activeItemId = "";
            stopPreview();
            schedule();
        });

        document.addEventListener("visibilitychange", () => {
            if (document.hidden) {
                activeVideo?.pause();
            } else {
                activeVideo?.play?.().catch(() => {});
            }
        });

        schedule();
    }

    window.ThreeTideDetails = {
        start,
        refresh: schedule,
        stopPreview
    };

    start();
})();
