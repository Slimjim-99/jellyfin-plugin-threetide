/* =========================================================
   3Tide Player Runtime (player.js)
   Zentrale, selbstheilende Verwaltung des Wiedergabezustands.

   Setzt/entfernt auf <html> UND <body>:
     threetide-player-active  -> Video-OSD-Seite sichtbar
   Setzt/entfernt auf <body>:
     threetide-has-video      -> <video> existiert im DOM

   Warum: Hero.js setzt die Klasse nur beim Start ueber den
   Hero-Button. Wird der Player anders beendet/gestartet,
   blieb der Zustand haengen (schwarzer Screen / Header weg).
   Dieser Watcher synchronisiert die Klassen dauerhaft mit dem
   echten DOM-Zustand - und ersetzt gleichzeitig die
   :has()-Selektoren fuer alte TV-Browser.

   Entfernen passiert mit 4s Verzoegerung, damit Heros
   Vorab-Setzen waehrend des Uebergangs nicht flackert.
   ES5, kompatibel bis Tizen 3 / webOS 3.
   ========================================================= */
(function () {
    "use strict";

    var CLASS_ACTIVE = "threetide-player-active";
    var CLASS_VIDEO = "threetide-has-video";
    var REMOVE_GRACE_MS = 4000;

    var rafPending = false;
    var removeTimer = null;

    function hasClass(el, cls) {
        return (" " + el.className + " ").indexOf(" " + cls + " ") >= 0;
    }

    function addClass(el, cls) {
        if (el && !hasClass(el, cls)) {
            el.className += " " + cls;
        }
    }

    function removeClass(el, cls) {
        if (el && hasClass(el, cls)) {
            el.className = (" " + el.className + " ")
                .replace(" " + cls + " ", " ")
                .replace(/\s+/g, " ")
                .replace(/^\s+|\s+$/g, "");
        }
    }

    function isPlayerVisible() {
        var page = document.getElementById("videoOsdPage");
        if (!page) { return false; }
        return !hasClass(page, "hide");
    }

    function applyActive(on) {
        var html = document.documentElement;
        var body = document.body;

        if (on) {
            if (removeTimer !== null) {
                window.clearTimeout(removeTimer);
                removeTimer = null;
            }
            addClass(html, CLASS_ACTIVE);
            addClass(body, CLASS_ACTIVE);
            return;
        }

        /* Aus: nur mit Gnadenfrist entfernen. Hero.js setzt die
           Klasse VOR dem Erscheinen von #videoOsdPage, um den
           Uebergang abzudecken - das darf nicht sofort wieder
           zurueckgenommen werden. */
        if (
            removeTimer === null &&
            (hasClass(html, CLASS_ACTIVE) || hasClass(body, CLASS_ACTIVE))
        ) {
            removeTimer = window.setTimeout(function () {
                removeTimer = null;
                if (!isPlayerVisible()) {
                    removeClass(document.documentElement, CLASS_ACTIVE);
                    removeClass(document.body, CLASS_ACTIVE);
                }
            }, REMOVE_GRACE_MS);
        }
    }

    function stopHeroPreviews() {
        var previews = document.querySelectorAll(
            ".threetide-hero-preview-video"
        );
        for (var i = 0; i < previews.length; i++) {
            var v = previews[i];
            try {
                if (!v.paused || v.getAttribute("src")) {
                    v.pause();
                    v.removeAttribute("src");
                    v.load();
                }
            } catch (e) { /* ignore */ }
        }
    }

    /* -----------------------------------------------------
       3Tide Zurueck-Button:
       Der native Zurueck-Pfeil sitzt im skinHeader, den 3Tide
       versteckt - deshalb eigener Button. Sichtbarkeit haengt
       an Nutzeraktivitaet (wie das Jellyfin-OSD selbst).
       ----------------------------------------------------- */
    var OSD_VISIBLE_CLASS = "threetide-osd-visible";
    var OSD_IDLE_MS = 3200;
    var idleTimer = null;
    var backButton = null;

    function goBack() {
        try {
            if (window.history.length > 1) {
                window.history.back();
                return;
            }
        } catch (e) { /* ignore */ }
        window.location.hash = "#/home";
    }

    function ensureBackButton() {
        if (backButton) { return; }
        backButton = document.createElement("button");
        backButton.type = "button";
        backButton.className = "threetide-osd-back";
        backButton.setAttribute("aria-label", "Zur\u00fcck");
        backButton.innerHTML = "\u2039"; /* < */
        backButton.addEventListener("click", goBack);
        document.body.appendChild(backButton);
    }

    function removeBackButton() {
        if (!backButton) { return; }
        try {
            backButton.parentNode.removeChild(backButton);
        } catch (e) { /* ignore */ }
        backButton = null;
        removeClass(document.body, OSD_VISIBLE_CLASS);
    }

    function markActivity() {
        var body = document.body;
        if (!body || !hasClass(body, CLASS_ACTIVE)) { return; }

        addClass(body, OSD_VISIBLE_CLASS);

        if (idleTimer !== null) {
            window.clearTimeout(idleTimer);
        }
        idleTimer = window.setTimeout(function () {
            idleTimer = null;
            removeClass(document.body, OSD_VISIBLE_CLASS);
        }, OSD_IDLE_MS);
    }

    function update() {
        rafPending = false;

        var body = document.body;
        if (!body) { return; }

        var playerVisible = isPlayerVisible();
        var hasVideo = !!document.querySelector("video");

        applyActive(playerVisible);

        if (hasVideo) { addClass(body, CLASS_VIDEO); }
        else { removeClass(body, CLASS_VIDEO); }

        /* Nie zwei Medien gleichzeitig: Preview-Trailer stoppen,
           sobald der echte Player sichtbar wird. */
        if (playerVisible) {
            stopHeroPreviews();
            ensureBackButton();
            markActivity();
        } else if (removeTimer === null && !hasClass(body, CLASS_ACTIVE)) {
            removeBackButton();
        }
    }

    /* Updates buendeln: MutationObserver kann sehr oft feuern,
       wir verarbeiten pro Frame maximal einmal. */
    function scheduleUpdate() {
        if (rafPending) { return; }
        rafPending = true;
        if (typeof window.requestAnimationFrame === "function") {
            window.requestAnimationFrame(update);
        } else {
            window.setTimeout(update, 60);
        }
    }

    function start() {
        update();

        if (typeof MutationObserver !== "undefined") {
            var observer = new MutationObserver(scheduleUpdate);
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ["class"]
            });
        } else {
            window.setInterval(update, 1200);
        }

        document.addEventListener("viewshow", scheduleUpdate);
        window.addEventListener("hashchange", scheduleUpdate);

        /* Aktivitaet fuer den Zurueck-Button (passiv, billig) */
        document.addEventListener("mousemove", markActivity, true);
        document.addEventListener("touchstart", markActivity, true);
        document.addEventListener("keydown", markActivity, true);
    }

    if (document.body) {
        start();
    } else {
        document.addEventListener("DOMContentLoaded", start);
    }
})();
