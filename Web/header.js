(() => {
    "use strict";

    const root = window.ThreeTide = window.ThreeTide || {};
    const HEADER_ID = "threetide-header";
    const DRAWER_ID = "threetide-drawer";
    const HOME_ROUTE = "/home.html";

    let observer = null;
    let refreshTimers = [];

    function clearRefreshTimers() {
        refreshTimers.forEach((timer) => window.clearTimeout(timer));
        refreshTimers = [];
    }

    function refreshThreeTideModules() {
        const refresh = () => {
            try {
                window.ThreeTideHome?.refresh?.();
                window.ThreeTideHome?.sync?.();
                window.ThreeTideHero?.refresh?.();
                window.ThreeTideHero?.sync?.();
                window.ThreeTideCatalog?.refresh?.();
            } catch (error) {
                console.warn(
                    "[3Tide] Modul-Aktualisierung nach Navigation fehlgeschlagen.",
                    error
                );
            }
        };

        clearRefreshTimers();

        [80, 280, 700].forEach((delay) => {
            refreshTimers.push(
                window.setTimeout(refresh, delay)
            );
        });
    }

    function normalizeRoute(route) {
        const value = String(route || "").trim();

        if (!value) {
            return HOME_ROUTE;
        }

        return value.startsWith("#")
            ? value.slice(1)
            : value;
    }

    function go(route) {
        const normalized = normalizeRoute(route);
        const targetHash = `#${normalized}`;

        closeDrawer();

        /*
         * Jellyfin ist eine SPA. Das Setzen des Hashes übernimmt die normale
         * Navigation. Wenn die Zielroute bereits aktiv ist, lösen wir das
         * Ereignis selbst aus, damit Hero und Startseite nicht erst nach einem
         * zweiten Klick aufgebaut werden.
         */
        if (window.location.hash !== targetHash) {
            window.location.hash = normalized;
        } else {
            window.dispatchEvent(
                new HashChangeEvent("hashchange", {
                    oldURL: window.location.href,
                    newURL: window.location.href
                })
            );
        }

        refreshThreeTideModules();
    }

    function openDiscover() {
        const discover = root.Discover;

        if (discover && typeof discover.open === "function") {
            discover.init?.();
            discover.open();
            closeDrawer();
            return;
        }

        console.error("[3Tide] Discover-Modul ist nicht verfügbar.");
    }

    function logout() {
        try {
            const client =
                window.ApiClient ||
                (
                    typeof ApiClient !== "undefined"
                        ? ApiClient
                        : null
                );

            client?.logout?.();
        } catch (error) {
            console.error("[3Tide] Abmelden fehlgeschlagen.", error);
        }
    }

    function isAdmin() {
        try {
            const client =
                window.ApiClient ||
                (
                    typeof ApiClient !== "undefined"
                        ? ApiClient
                        : null
                );

            return Boolean(
                client?.getCurrentUser?.()?.Policy?.IsAdministrator
            );
        } catch {
            return false;
        }
    }

    function createNavButton(label, route, icon = "") {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "threetide-nav-button";
        button.dataset.route = route;

        button.innerHTML = `
            ${icon ? `<span class="material-icons">${icon}</span>` : ""}
            <span>${label}</span>
        `;

        button.addEventListener("click", () => go(route));

        return button;
    }

    function createHeader() {
        const header = document.createElement("header");

        header.id = HEADER_ID;
        header.className = "threetide-header";

        const burger = document.createElement("button");

        burger.type = "button";
        burger.className = "threetide-burger";
        burger.setAttribute("aria-label", "Menü öffnen");

        burger.innerHTML = `
            <span></span>
            <span></span>
            <span></span>
        `;

        burger.addEventListener("click", toggleDrawer);

        const logo = document.createElement("button");

        logo.type = "button";
        logo.className = "threetide-header-logo";
        logo.setAttribute("aria-label", "3Tide Startseite");
        logo.innerHTML = "<span>3Tide</span>";
        logo.addEventListener("click", () => go(HOME_ROUTE));

        const nav = document.createElement("nav");

        nav.className = "threetide-header-nav";
        nav.setAttribute("aria-label", "3Tide Navigation");

        nav.append(
            createNavButton("Startseite", HOME_ROUTE),
            createNavButton("Filme", "/movies.html"),
            createNavButton("Serien", "/tv.html"),
            createNavButton("Live TV", "/livetv?collectionType=livetv")
        );

        const request = document.createElement("button");

        request.type = "button";
        request.className = "threetide-request-button";

        request.innerHTML = `
            <span class="material-icons">add_circle</span>
            <span>Anfragen</span>
        `;

        request.addEventListener("click", openDiscover);

        header.append(
            burger,
            logo,
            nav,
            request
        );

        return header;
    }

    function createDrawer() {
        const backdrop = document.createElement("div");

        backdrop.id = DRAWER_ID;
        backdrop.className = "threetide-drawer-backdrop";
        backdrop.hidden = true;

        const drawer = document.createElement("aside");

        drawer.className = "threetide-drawer";

        drawer.innerHTML = `
            <div class="threetide-drawer-header">
                <strong>3Tide</strong>

                <button type="button"
                        class="threetide-drawer-close"
                        aria-label="Menü schließen">
                    <span class="material-icons">close</span>
                </button>
            </div>
        `;

        drawer
            .querySelector(".threetide-drawer-close")
            ?.addEventListener("click", closeDrawer);

        const nav = document.createElement("nav");

        nav.className = "threetide-drawer-nav";

        nav.append(
            createNavButton("Startseite", HOME_ROUTE, "home"),
            createNavButton("Filme", "/movies.html", "movie"),
            createNavButton("Serien", "/tv.html", "tv"),
            createNavButton(
                "Live TV",
                "/livetv?collectionType=livetv",
                "live_tv"
            )
        );

        const request = document.createElement("button");

        request.type = "button";
        request.className = "threetide-drawer-request";

        request.innerHTML = `
            <span class="material-icons">search</span>
            <span>Anfragen</span>
        `;

        request.addEventListener("click", openDiscover);

        const footer = document.createElement("div");

        footer.className = "threetide-drawer-footer";

        if (isAdmin()) {
            const dashboard = document.createElement("button");

            dashboard.type = "button";
            dashboard.innerHTML = `
                <span class="material-icons">admin_panel_settings</span>
                <span>Dashboard</span>
            `;

            dashboard.addEventListener(
                "click",
                () => go("/dashboard.html")
            );

            footer.appendChild(dashboard);
        }

        const settings = document.createElement("button");

        settings.type = "button";
        settings.innerHTML = `
            <span class="material-icons">settings</span>
            <span>Einstellungen</span>
        `;

        settings.addEventListener(
            "click",
            () => go("/settings")
        );

        const signOut = document.createElement("button");

        signOut.type = "button";
        signOut.innerHTML = `
            <span class="material-icons">logout</span>
            <span>Abmelden</span>
        `;

        signOut.addEventListener("click", logout);

        footer.append(
            settings,
            signOut
        );

        drawer.append(
            nav,
            request,
            footer
        );

        backdrop.appendChild(drawer);

        backdrop.addEventListener(
            "click",
            (event) => {
                if (event.target === backdrop) {
                    closeDrawer();
                }
            }
        );

        return backdrop;
    }

    function openDrawer() {
        const drawer = document.getElementById(DRAWER_ID);

        if (!drawer) {
            return;
        }

        drawer.hidden = false;

        requestAnimationFrame(() => {
            drawer.classList.add("is-open");
            document.documentElement.classList.add(
                "threetide-drawer-open"
            );
        });
    }

    function closeDrawer() {
        const drawer = document.getElementById(DRAWER_ID);

        if (!drawer) {
            return;
        }

        drawer.classList.remove("is-open");

        document.documentElement.classList.remove(
            "threetide-drawer-open"
        );

        window.setTimeout(() => {
            if (!drawer.classList.contains("is-open")) {
                drawer.hidden = true;
            }
        }, 220);
    }

    function toggleDrawer() {
        const drawer = document.getElementById(DRAWER_ID);

        if (drawer?.classList.contains("is-open")) {
            closeDrawer();
        } else {
            openDrawer();
        }
    }

    function hideNativeHeader() {
        document
            .querySelectorAll(".skinHeader")
            .forEach((header) => {
                header.classList.add(
                    "threetide-native-header-hidden"
                );
            });
    }

    function updateActive() {
        const current =
            String(window.location.hash || "")
                .toLowerCase();

        document
            .querySelectorAll(
                ".threetide-nav-button[data-route]"
            )
            .forEach((button) => {
                const route =
                    String(button.dataset.route || "")
                        .toLowerCase();

                const active =
                    current === `#${route}` ||
                    (
                        route === HOME_ROUTE &&
                        (
                            current === "" ||
                            current.includes("home")
                        )
                    ) ||
                    (
                        route === "/movies.html" &&
                        current.includes("movies")
                    ) ||
                    (
                        route === "/tv.html" &&
                        current.includes("/tv")
                    ) ||
                    (
                        route.includes("livetv") &&
                        current.includes("livetv")
                    );

                button.classList.toggle(
                    "is-active",
                    active
                );
            });
    }

    function mount() {
        hideNativeHeader();

        if (!document.body) {
            return;
        }

        if (!document.getElementById(HEADER_ID)) {
            document.body.appendChild(
                createHeader()
            );
        }

        if (!document.getElementById(DRAWER_ID)) {
            document.body.appendChild(
                createDrawer()
            );
        }

        updateActive();
    }

    function start() {
        if (observer) {
            mount();
            return;
        }

        observer = new MutationObserver(mount);

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
                updateActive();
                refreshThreeTideModules();
            }
        );

        window.addEventListener(
            "keydown",
            (event) => {
                if (event.key === "Escape") {
                    closeDrawer();
                }
            }
        );

        mount();
    }

    root.Header = {
        start,
        go,
        openDrawer,
        closeDrawer,
        openDiscover
    };

    start();
})();