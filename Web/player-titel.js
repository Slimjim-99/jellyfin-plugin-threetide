(() => {
    "use strict";

    const LOG_PREFIX = "[3Tide Player Title]";
    let observer = null;
    let updateTimer = null;
    let lastTitle = "";

    function getApiClient() {
        if (
            typeof ApiClient !== "undefined" &&
            ApiClient
        ) {
            return ApiClient;
        }

        return window.ApiClient || null;
    }

    function getTitleElement() {
        return document.querySelector(
            "#videoOsdPage .osdTitle, .videoOsd .osdTitle"
        );
    }

    function getSecondaryElement() {
        return document.querySelector(
            "#videoOsdPage .osdSecondaryMediaInfo, " +
            ".videoOsd .osdSecondaryMediaInfo"
        );
    }

    async function getCurrentSession() {
        const client = getApiClient();

        if (!client) {
            return null;
        }

        try {
            const url = client.getUrl("Sessions");

            const sessions =
                typeof client.ajax === "function"
                    ? await client.ajax({
                        type: "GET",
                        url,
                        dataType: "json"
                    })
                    : await fetch(url, {
                        credentials: "same-origin"
                    }).then((response) => response.json());

            const deviceId =
                client.deviceId?.() ||
                client._deviceId ||
                "";

            return (
                sessions.find((session) =>
                    session.NowPlayingItem &&
                    (
                        !deviceId ||
                        session.DeviceId === deviceId
                    )
                ) ||
                sessions.find((session) =>
                    session.NowPlayingItem
                ) ||
                null
            );
        } catch (error) {
            console.warn(
                `${LOG_PREFIX} Session konnte nicht gelesen werden.`,
                error
            );

            return null;
        }
    }

    function buildPrimaryTitle(item) {
        if (!item) {
            return "";
        }

        if (item.Type === "Episode") {
            return (
                item.SeriesName ||
                item.Name ||
                ""
            );
        }

        return item.Name || "";
    }

    function buildSecondaryTitle(item) {
        if (!item) {
            return "";
        }

        if (item.Type === "Episode") {
            const episodeNumber =
                Number.isInteger(item.IndexNumber)
                    ? `E${String(item.IndexNumber).padStart(2, "0")}`
                    : "";

            const seasonNumber =
                Number.isInteger(item.ParentIndexNumber)
                    ? `S${String(item.ParentIndexNumber).padStart(2, "0")}`
                    : "";

            const prefix =
                `${seasonNumber}${episodeNumber}`;

            return [
                prefix,
                item.Name
            ]
                .filter(Boolean)
                .join(" · ");
        }

        return item.ProductionYear
            ? String(item.ProductionYear)
            : "";
    }

    async function updateTitle() {
        const titleElement = getTitleElement();

        if (!titleElement) {
            return;
        }

        const session = await getCurrentSession();
        const item = session?.NowPlayingItem;

        if (!item) {
            return;
        }

        const primaryTitle =
            buildPrimaryTitle(item);

        const secondaryTitle =
            buildSecondaryTitle(item);

        if (
            primaryTitle &&
            primaryTitle !== lastTitle
        ) {
            titleElement.textContent =
                primaryTitle;

            lastTitle = primaryTitle;

            console.info(
                `${LOG_PREFIX} Titel gesetzt:`,
                primaryTitle
            );
        }

        const secondaryElement =
            getSecondaryElement();

        if (
            secondaryElement &&
            secondaryTitle
        ) {
            secondaryElement.textContent =
                secondaryTitle;
        }
    }

    function scheduleUpdate() {
        window.clearTimeout(updateTimer);

        updateTimer =
            window.setTimeout(
                updateTitle,
                150
            );
    }

    function start() {
        if (observer) {
            scheduleUpdate();
            return;
        }

        observer =
            new MutationObserver(
                scheduleUpdate
            );

        observer.observe(
            document.documentElement,
            {
                childList: true,
                subtree: true
            }
        );

        document.addEventListener(
            "playbackstart",
            scheduleUpdate
        );

        document.addEventListener(
            "viewshow",
            scheduleUpdate
        );

        window.addEventListener(
            "hashchange",
            scheduleUpdate
        );

        window.setInterval(
            updateTitle,
            5000
        );

        scheduleUpdate();
    }

    window.ThreeTidePlayerTitle = {
        start,
        refresh: updateTitle
    };

    start();
})();