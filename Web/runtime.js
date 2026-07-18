(() => {
    "use strict";

    const config =
        window.__THREETIDE_CONFIG__ || {};

    const brandName =
        config.brandName || "3Tide";

    const logoUrl =
        config.logoUrl ||
        "/web/assets/logo/3tide.png";

    let scheduled = false;

    function escapeHtml(value) {
        const element =
            document.createElement("div");

        element.textContent =
            String(value || "");

        return element.innerHTML;
    }

    function getBasePath() {
        const pathname =
            window.location.pathname || "/web/";

        if (pathname.endsWith("/")) {
            return pathname;
        }

        const lastSegment =
            pathname.split("/").pop() || "";

        if (lastSegment.includes(".")) {
            return pathname.substring(
                0,
                pathname.lastIndexOf("/") + 1
            );
        }

        return `${pathname}/`;
    }

    function navigateHome() {
        const basePath = getBasePath();
        const target = `${basePath}#/home`;

        if (
            window.location.hash === "#/home" ||
            window.location.hash === "#!/home"
        ) {
            window.location.reload();
            return;
        }

        window.location.assign(target);
    }

    function applyBrandTitle() {
        const currentTitle =
            document.title || "";

        if (
            !currentTitle
                .toLocaleLowerCase()
                .includes(
                    brandName.toLocaleLowerCase()
                )
        ) {
            document.title =
                currentTitle
                    .replace(
                        /Jellyfin/gi,
                        brandName
                    )
                    .trim() ||
                brandName;
        }

        document
            .querySelector(
                'meta[name="application-name"]'
            )
            ?.setAttribute(
                "content",
                brandName
            );

        document
            .querySelector(
                'meta[name="apple-mobile-web-app-title"]'
            )
            ?.setAttribute(
                "content",
                brandName
            );
    }

    function bindHomeNavigation(element) {
        if (
            !element ||
            element.dataset
                .threeTideHomeBound === "true"
        ) {
            return;
        }

        element.dataset.threeTideHomeBound =
            "true";

        element.style.cursor =
            "pointer";

        element.setAttribute(
            "role",
            "link"
        );

        element.setAttribute(
            "tabindex",
            "0"
        );

        element.addEventListener(
            "click",
            (event) => {
                event.preventDefault();
                event.stopPropagation();

                navigateHome();
            }
        );

        element.addEventListener(
            "keydown",
            (event) => {
                if (
                    event.key !== "Enter" &&
                    event.key !== " "
                ) {
                    return;
                }

                event.preventDefault();
                navigateHome();
            }
        );
    }

    function styleLogoContainer(element) {
        if (!element) {
            return;
        }

        if (
            element.dataset
                .threeTideLogoApplied !==
            "true"
        ) {
            element.dataset
                .threeTideLogoApplied =
                "true";

            element.setAttribute(
                "aria-label",
                brandName
            );

            element.setAttribute(
                "title",
                brandName
            );

            element.style.backgroundImage =
                `url("${logoUrl}")`;

            element.style.backgroundRepeat =
                "no-repeat";

            element.style.backgroundPosition =
                "center";

            element.style.backgroundSize =
                "contain";

            element.style.color =
                "transparent";

            element.style.fontSize =
                "0";

            element.style.minWidth =
                "72px";

            element.style.minHeight =
                "34px";

            element
                .querySelectorAll(
                    "img, svg"
                )
                .forEach((child) => {
                    child.style.display =
                        "none";
                });
        }

        bindHomeNavigation(element);
    }

    function styleLogoImage(image) {
        if (!image) {
            return;
        }

        if (
            image.dataset
                .threeTideLogoApplied !==
            "true"
        ) {
            image.dataset
                .threeTideLogoApplied =
                "true";

            image.src = logoUrl;
            image.alt = brandName;
            image.title = brandName;

            image.style.objectFit =
                "contain";

            image.style.maxWidth =
                "110px";

            image.style.maxHeight =
                "42px";
        }

        bindHomeNavigation(image);
    }

    function applyExistingLogos() {
        const containerSelectors = [
            ".pageTitleWithLogo",
            ".headerLogo",
            ".skinHeader .pageTitleWithLogo",
            ".skinHeader .headerLogo",
            ".loginPage .pageTitleWithLogo",
            ".loginPage .headerLogo",
            ".mainDrawer .pageTitleWithLogo",
            ".mainDrawer .headerLogo",
            ".headerLeft .pageTitleWithLogo",
            ".headerLeft .headerLogo"
        ];

        containerSelectors.forEach(
            (selector) => {
                document
                    .querySelectorAll(
                        selector
                    )
                    .forEach(
                        styleLogoContainer
                    );
            }
        );

        document
            .querySelectorAll(
                'img[src*="logo"], ' +
                'img[alt*="Jellyfin" i]'
            )
            .forEach(styleLogoImage);
    }

    function isOnHomePage() {
        return Boolean(
            document.querySelector(
                ".homeSectionsContainer, .homeSections, " +
                "#homeTab, .homePage, .view-home, " +
                "[data-type='home'], .page.homePage"
            )
        );
    }

    function findSecondaryHeader() {
        // .headerLeft gehoert zum globalen .skinHeader, nicht zum
        // Seiteninhalt - deshalb hier direkt auf document suchen,
        // nicht innerhalb eines Seiten-Containers.
        if (isOnHomePage()) {
            return null;
        }

        return document.querySelector(
            ".skinHeader .headerLeft"
        );
    }

    function removeSecondaryLogo() {
        document
            .getElementById("threetide-secondary-logo")
            ?.remove();
    }

    function ensureSecondaryLogo() {
        if (isOnHomePage()) {
            removeSecondaryLogo();
            return;
        }

        if (
            document.getElementById(
                "threetide-secondary-logo"
            )
        ) {
            return;
        }

        const toolbar =
            findSecondaryHeader();

        if (!toolbar) {
            return;
        }

        const logo =
            document.createElement("button");

        logo.id =
            "threetide-secondary-logo";

        logo.type =
            "button";

        logo.className =
            "threetide-secondary-logo";

        logo.setAttribute(
            "aria-label",
            `${brandName} Startseite`
        );

        logo.setAttribute(
            "title",
            `${brandName} Startseite`
        );

        logo.style.width =
            "88px";

        logo.style.height =
            "40px";

        logo.style.margin =
            "0 0.4rem";

        logo.style.padding =
            "0";

        logo.style.border =
            "0";

        logo.style.backgroundColor =
            "transparent";

        logo.style.backgroundImage =
            `url("${logoUrl}")`;

        logo.style.backgroundRepeat =
            "no-repeat";

        logo.style.backgroundPosition =
            "center";

        logo.style.backgroundSize =
            "contain";

        logo.style.cursor =
            "pointer";

        logo.addEventListener(
            "click",
            (event) => {
                event.preventDefault();
                event.stopPropagation();

                navigateHome();
            }
        );

        const menuButton =
            toolbar.querySelector(
                ".headerButton, " +
                ".navMenuButton, " +
                '[data-action="menu"]'
            );

        if (
            menuButton &&
            menuButton.parentNode ===
            toolbar
        ) {
            menuButton.insertAdjacentElement(
                "afterend",
                logo
            );
        } else {
            toolbar.appendChild(logo);
        }
    }

    function openSeerr() {
        if (!config.seerrUrl) {
            return;
        }

        if (config.openInNewTab) {
            window.open(
                config.seerrUrl,
                "_blank",
                "noopener,noreferrer"
            );

            return;
        }

        window.location.assign(
            config.seerrUrl
        );
    }

    function createRequestButton(kind) {
        const button =
            document.createElement("button");

        button.id =
            `threetide-seerr-${kind}`;

        button.type =
            "button";

        button.className =
            kind === "sidebar"
                ? "navMenuOption"
                : "paper-icon-button-light";

        button.title =
            config.label || "Anfragen";

        button.setAttribute(
            "aria-label",
            config.label || "Anfragen"
        );

        button.innerHTML =
            '<span class="material-icons" ' +
            'aria-hidden="true">' +
            "add_circle" +
            "</span>" +
            (
                kind === "sidebar"
                    ? '<span class="' +
                    'navMenuOptionText">' +
                    escapeHtml(
                        config.label ||
                        "Anfragen"
                    ) +
                    "</span>"
                    : ""
            );

        button.addEventListener(
            "click",
            openSeerr
        );

        return button;
    }

    function ensureRequestButtons() {
        if (
            !config.enableSeerrButton ||
            !config.seerrUrl
        ) {
            return;
        }

        const position =
            String(
                config.position ||
                "sidebar"
            ).toLocaleLowerCase();

        if (
            (
                position ===
                "sidebar" ||
                position === "both"
            ) &&
            !document.getElementById(
                "threetide-seerr-sidebar"
            )
        ) {
            document
                .querySelector(
                    ".mainDrawer-scrollContainer"
                )
                ?.appendChild(
                    createRequestButton(
                        "sidebar"
                    )
                );
        }

        if (
            (
                position === "header" ||
                position === "both"
            ) &&
            !document.getElementById(
                "threetide-seerr-header"
            )
        ) {
            document
                .querySelector(
                    ".headerRight"
                )
                ?.prepend(
                    createRequestButton(
                        "header"
                    )
                );
        }
    }

    function applyFrontend() {
        applyBrandTitle();
        applyExistingLogos();
        ensureSecondaryLogo();
        ensureRequestButtons();
    }

    function scheduleFrontend() {
        if (scheduled) {
            return;
        }

        scheduled = true;

        window.requestAnimationFrame(
            () => {
                scheduled = false;
                applyFrontend();
            }
        );
    }

    const observer =
        new MutationObserver(
            scheduleFrontend
        );

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
            window.setTimeout(
                scheduleFrontend,
                100
            );
        }
    );

    document.addEventListener(
        "visibilitychange",
        () => {
            if (!document.hidden) {
                scheduleFrontend();
            }
        }
    );

    applyFrontend();

    // ------------------------------------------------------------
    // Hero-Banner und Custom-Home starten
    // ------------------------------------------------------------
    //
    // hero.js und home.js muessen VOR runtime.js in den
    // <script>-Block injiziert werden (siehe
    // IndexHtmlTransformation.cs), sonst existieren
    // window.ThreeTideHero / window.ThreeTideHome hier noch nicht.
    //
    // Beide .start() kuemmern sich intern schon selbst um:
    //  - eigenen MutationObserver (SPA-Navigation)
    //  - hashchange-Listener
    //  - Retry, falls Home-Container/ApiClient noch nicht bereit
    //
    // Hier reicht jeweils ein einmaliger start()-Aufruf. Falls
    // window.ThreeTideHero/-Home (noch) nicht existieren, wird
    // kurz retried, aber nur begrenzt oft, damit im Fehlerfall
    // eine klare Diagnosemeldung in der Konsole steht statt
    // endlosem stillem Retry.

    const MODULE_START_MAX_ATTEMPTS = 20;
    const MODULE_START_RETRY_MS = 250;

    function resolveModule(globalName) {
        if (window[globalName]) {
            return window[globalName];
        }

        const aliases = {
            ThreeTideHero:
                window.ThreeTide?.Hero ||
                window.ThreeTide?.hero,

            ThreeTideHome:
                window.ThreeTide?.Home ||
                window.ThreeTide?.home,

            ThreeTideSearch:
                window.ThreeTide?.Search ||
                window.ThreeTide?.search
        };

        return aliases[globalName] || null;
    }

    function startModule(
        globalName,
        scriptHint,
        attempt = 0
    ) {
        const moduleApi = resolveModule(globalName);

        if (
            moduleApi &&
            typeof moduleApi.start === "function"
        ) {
            moduleApi.start();

            console.info(
                `[3Tide] ${globalName} gestartet.`
            );

            return;
        }

        if (attempt >= MODULE_START_MAX_ATTEMPTS) {
            console.error(
                `[3Tide] ${globalName} wurde nach mehreren ` +
                `Versuchen nicht gefunden. Prüfe, ob ${scriptHint} ` +
                `vor runtime.js injiziert wird oder einen ` +
                `JavaScript-Syntaxfehler enthält.`
            );

            return;
        }

        window.setTimeout(
            () => startModule(
                globalName,
                scriptHint,
                attempt + 1
            ),
            MODULE_START_RETRY_MS
        );
    }

    window.ThreeTide?.Api?.init?.();
    window.ThreeTide?.UI?.init?.();
    window.ThreeTide?.Discover?.init?.();

    startModule("ThreeTideHero", "Hero.js");
    startModule("ThreeTideHome", "home.js");
    startModule("ThreeTideSearch", "search.js");
})();