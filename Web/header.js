(() => {
    "use strict";

    const NAV_ID = "threetide-header-navigation";
    const RETRY_MS = 750;

    let observer = null;
    let timer = null;

    function getConfig() {
        return window.__THREETIDE_CONFIG__ || {};
    }

    function navigate(hash) {
        window.location.hash = hash;
    }

    function getHeader() {
        return document.querySelector(".skinHeader .headerTop, .skinHeader");
    }

    function createNavigation() {
        const nav = document.createElement("nav");
        nav.id = NAV_ID;
        nav.className = "threetide-header-navigation";
        nav.setAttribute("aria-label", "3Tide Hauptnavigation");

        const items = [
            ["Startseite", "/home.html"],
            ["Filme", "/movies.html"],
            ["Serien", "/tv.html"],
            ["Live TV", "/livetv?collectionType=livetv"],
            ["Musik", "/music.html"],
            ["Meine Liste", "/favorites"]
        ];

        items.forEach(([label, hash]) => {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = label;
            button.dataset.hash = hash;

            button.addEventListener("click", () => navigate(hash));
            nav.appendChild(button);
        });

        return nav;
    }

    function ensureLogo() {
        const logo =
            document.querySelector(
                ".skinHeader .pageTitleWithLogo, " +
                ".skinHeader .pageTitleWithDefaultLogo, " +
                ".skinHeader .headerLogo"
            );

        if (!logo) {
            return;
        }

        const configuredLogo = String(getConfig().logoUrl || "").trim();

        if (configuredLogo) {
            logo.style.setProperty(
                "--threetide-header-logo",
                `url("${configuredLogo.replace(/"/g, "%22")}")`
            );
        }

        logo.setAttribute("role", "button");
        logo.setAttribute("aria-label", "Zur 3Tide Startseite");
        logo.tabIndex = 0;

        if (logo.dataset.threetideBound === "true") {
            return;
        }

        logo.dataset.threetideBound = "true";

        logo.addEventListener("click", () => navigate("/home.html"));
        logo.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                navigate("/home.html");
            }
        });
    }

    function updateActiveNavigation() {
        const current = String(window.location.hash || "").toLowerCase();

        document
            .querySelectorAll(`#${NAV_ID} button`)
            .forEach((button) => {
                const target = String(button.dataset.hash || "").toLowerCase();
                const active =
                    current === target ||
                    (target === "/home.html" &&
                        (
                            current === "" ||
                            current.includes("home")
                        ));

                button.classList.toggle("is-active", active);
            });
    }

    function ensureNavigation() {
        const header = getHeader();

        if (!header) {
            schedule();
            return;
        }

        ensureLogo();

        if (!document.getElementById(NAV_ID)) {
            const nav = createNavigation();
            const left = header.querySelector(".headerLeft");

            if (left?.parentNode) {
                left.parentNode.insertBefore(nav, left.nextSibling);
            } else {
                header.appendChild(nav);
            }
        }

        updateActiveNavigation();
    }

    function schedule() {
        if (timer !== null) {
            return;
        }

        timer = window.setTimeout(() => {
            timer = null;
            ensureNavigation();
        }, RETRY_MS);
    }

    function start() {
        if (observer) {
            ensureNavigation();
            return;
        }

        observer = new MutationObserver(ensureNavigation);
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        window.addEventListener("hashchange", updateActiveNavigation);

        ensureNavigation();
        schedule();
    }

    function stop() {
        observer?.disconnect();
        observer = null;

        if (timer !== null) {
            window.clearTimeout(timer);
            timer = null;
        }

        document.getElementById(NAV_ID)?.remove();
    }

    window.ThreeTideHeader = {
        start,
        stop,
        refresh: ensureNavigation
    };

    start();
})();