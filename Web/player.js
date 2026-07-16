(() => {
    "use strict";

    const ACTIVE_CLASS =
        "threetide-player-active";

    const CONTROLS_CLASS =
        "threetide-player-controls-visible";

    let observer = null;
    let hideTimer = null;
    let syncTimer = null;
    let boundContainer = null;
    let boundVideo = null;

    function getVideo() {
        const videos =
            Array.from(
                document.querySelectorAll("video")
            );

        return (
            videos.find((video) => {
                if (
                    video.classList.contains(
                        "threetide-hero-preview-video"
                    )
                ) {
                    return false;
                }

                const rectangle =
                    video.getBoundingClientRect();

                return (
                    rectangle.width > 200 &&
                    rectangle.height > 150 &&
                    getComputedStyle(video).display !== "none"
                );
            }) ||
            null
        );
    }

    function getPlayerContainer(video) {
        if (!video) {
            return null;
        }

        return (
            video.closest(
                ".videoPlayerContainer, " +
                ".videoPlayerPage, " +
                ".videoPlayer"
            ) ||
            video.parentElement
        );
    }

    function isPlaybackActive(video) {
        if (!video) {
            return false;
        }

        const rectangle =
            video.getBoundingClientRect();

        return (
            rectangle.width > 200 &&
            rectangle.height > 150 &&
            getComputedStyle(video).visibility !== "hidden" &&
            getComputedStyle(video).display !== "none"
        );
    }

    function showControls() {
        if (
            !document.body?.classList.contains(
                ACTIVE_CLASS
            )
        ) {
            return;
        }

        document.body.classList.add(
            CONTROLS_CLASS
        );

        window.clearTimeout(
            hideTimer
        );

        hideTimer =
            window.setTimeout(() => {
                if (
                    boundVideo &&
                    !boundVideo.paused
                ) {
                    document.body?.classList.remove(
                        CONTROLS_CLASS
                    );
                }
            }, 3600);
    }

    function unbindPlayer() {
        if (boundContainer) {
            [
                "mousemove",
                "pointermove",
                "pointerdown",
                "touchstart",
                "click"
            ].forEach((eventName) => {
                boundContainer.removeEventListener(
                    eventName,
                    showControls
                );
            });
        }

        if (boundVideo) {
            boundVideo.removeEventListener(
                "pause",
                showControls
            );

            boundVideo.removeEventListener(
                "play",
                showControls
            );

            boundVideo.removeEventListener(
                "loadedmetadata",
                showControls
            );
        }

        boundContainer = null;
        boundVideo = null;
    }

    function bindPlayer(
        video,
        container
    ) {
        if (
            video === boundVideo &&
            container === boundContainer
        ) {
            return;
        }

        unbindPlayer();

        boundVideo = video;
        boundContainer = container;

        [
            "mousemove",
            "pointermove",
            "pointerdown",
            "touchstart",
            "click"
        ].forEach((eventName) => {
            container.addEventListener(
                eventName,
                showControls,
                {
                    passive: true
                }
            );
        });

        video.addEventListener(
            "pause",
            showControls
        );

        video.addEventListener(
            "play",
            showControls
        );

        video.addEventListener(
            "loadedmetadata",
            showControls
        );
    }

    function sync() {
        syncTimer = null;

        const video =
            getVideo();

        const active =
            isPlaybackActive(video);

        if (!active) {
            document.body?.classList.remove(
                ACTIVE_CLASS,
                CONTROLS_CLASS
            );

            unbindPlayer();

            window.clearTimeout(
                hideTimer
            );

            return;
        }

        const container =
            getPlayerContainer(video);

        if (!container) {
            return;
        }

        document.body?.classList.add(
            ACTIVE_CLASS
        );

        bindPlayer(
            video,
            container
        );

        showControls();
    }

    function scheduleSync() {
        if (syncTimer !== null) {
            return;
        }

        syncTimer =
            window.setTimeout(
                sync,
                120
            );
    }

    function start() {
        if (observer) {
            scheduleSync();
            return;
        }

        /*
         * Wichtig:
         * Nur hinzugefügte oder entfernte DOM-Elemente beobachten.
         * Keine class/style-Attribute beobachten, weil dieses Modul
         * selbst Klassen am body setzt.
         */
        observer =
            new MutationObserver(
                scheduleSync
            );

        observer.observe(
            document.body ||
            document.documentElement,
            {
                childList: true,
                subtree: true
            }
        );

        window.addEventListener(
            "hashchange",
            scheduleSync
        );

        window.addEventListener(
            "resize",
            scheduleSync
        );

        document.addEventListener(
            "visibilitychange",
            scheduleSync
        );

        scheduleSync();
    }

    function stop() {
        observer?.disconnect();
        observer = null;

        window.clearTimeout(
            syncTimer
        );

        window.clearTimeout(
            hideTimer
        );

        syncTimer = null;

        unbindPlayer();

        document.body?.classList.remove(
            ACTIVE_CLASS,
            CONTROLS_CLASS
        );
    }

    window.ThreeTidePlayer = {
        start,
        stop,
        sync: scheduleSync,
        showControls
    };

    start();
})();