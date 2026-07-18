/* =========================================================
   3Tide TV Layer (tv.js)
   Wird immer injiziert, beendet sich auf Desktop/Mobile sofort.
   Auf Tizen / webOS / SmartTV:
     - body.threetide-tv (+ threetide-tizen / threetide-webos)
     - window.TIDE_TV = true  (Module wie Hero.js fragen das ab
       und starten z.B. keine Hover-Preview-Trailer)
     - Fokus-Sicherung fuer D-Pad-Navigation

   ES5, kompatibel bis Tizen 3 / webOS 3 (Chromium ~38-47).
   Die Klasse threetide-has-video pflegt bereits player.js.
   ========================================================= */
(function () {
    "use strict";

    var ua = navigator.userAgent || "";
    var isTV = /Tizen|Web0S|WebOS|SmartTV|SMART-TV|NetCast/i.test(ua);
    if (!isTV) { return; }

    window.TIDE_TV = true;

    function addBodyClass(cls) {
        var body = document.body;
        if (body && (" " + body.className + " ").indexOf(" " + cls + " ") < 0) {
            body.className += " " + cls;
        }
    }

    function applyClasses() {
        addBodyClass("threetide-tv");
        if (/Tizen/i.test(ua)) { addBodyClass("threetide-tizen"); }
        if (/Web0S|WebOS/i.test(ua)) { addBodyClass("threetide-webos"); }
    }

    if (document.body) {
        applyClasses();
    } else {
        document.addEventListener("DOMContentLoaded", applyClasses);
    }

    /* -----------------------------------------------------
       Fokus-Sicherung: nach Seitenwechseln darf der Fokus
       nie "im Nichts" (body) haengen, sonst reagiert das
       D-Pad gefuehlt nicht.
       ----------------------------------------------------- */
    function ensureFocus() {
        var ae = document.activeElement;
        if (ae && ae !== document.body && ae.tagName !== "HTML") {
            return;
        }

        var el = document.querySelector(
            ".threetide-hero-play, " +
            ".threetide-poster-card, " +
            ".threetide-landscape-card, " +
            ".card, .emby-button, button, [tabindex]"
        );

        if (el && el.focus) {
            try { el.focus(); } catch (e) { /* ignore */ }
        }
    }

    document.addEventListener("viewshow", function () {
        window.setTimeout(ensureFocus, 300);
    });

    window.setTimeout(ensureFocus, 1500);

    /* -----------------------------------------------------
       Karten fokussierbar machen: 3Tide-Karten sind divs -
       ohne tabindex kann das D-Pad sie nicht erreichen.
       ----------------------------------------------------- */
    function makeFocusable() {
        var cards = document.querySelectorAll(
            ".threetide-poster-card:not([tabindex]), " +
            ".threetide-landscape-card:not([tabindex])"
        );
        for (var i = 0; i < cards.length; i++) {
            cards[i].setAttribute("tabindex", "0");
        }
    }

    if (typeof MutationObserver !== "undefined") {
        var mo = new MutationObserver(function () {
            makeFocusable();
        });

        function startMo() {
            makeFocusable();
            mo.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        if (document.body) { startMo(); }
        else { document.addEventListener("DOMContentLoaded", startMo); }
    } else {
        window.setInterval(makeFocusable, 2000);
    }

    /* Enter auf einer fokussierten Karte = Klick ausloesen */
    document.addEventListener("keydown", function (e) {
        if (e.keyCode !== 13) { return; }
        var ae = document.activeElement;
        if (!ae) { return; }
        var cls = " " + ae.className + " ";
        if (
            cls.indexOf(" threetide-poster-card ") >= 0 ||
            cls.indexOf(" threetide-landscape-card ") >= 0
        ) {
            try { ae.click(); } catch (err) { /* ignore */ }
        }
    });
})();
