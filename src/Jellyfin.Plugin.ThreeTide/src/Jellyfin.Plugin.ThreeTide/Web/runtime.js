(() => {
    "use strict";

    const config = window.__THREETIDE_CONFIG__ || {};
    const brandName = config.brandName || "3Tide";
    const logoUrl = config.logoUrl || "/web/assets/logo/3tide.png";

    function escapeHtml(value) {
        const div = document.createElement("div");
        div.textContent = value;
        return div.innerHTML;
    }

    function applyBrandTitle() {
        const currentTitle = document.title || "";

        if (!currentTitle.includes(brandName)) {
            document.title =
                currentTitle.replace(/Jellyfin/gi, brandName).trim() ||
                brandName;
        }

        const applicationTitle = document.querySelector(
            'meta[name="application-name"]'
        );

        if (applicationTitle) {
            applicationTitle.setAttribute("content", brandName);
        }

        const appleTitle = document.querySelector(
            'meta[name="apple-mobile-web-app-title"]'
        );

        if (appleTitle) {
            appleTitle.setAttribute("content", brandName);
        }
    }

    function applyLogoToElement(element) {
        if (!element || element.dataset.threeTideLogoApplied === "true") {
            return;
        }

        element.dataset.threeTideLogoApplied = "true";
        element.setAttribute("aria-label", brandName);
        element.setAttribute("title", brandName);

        element.style.backgroundImage = `url("${logoUrl}")`;
        element.style.backgroundRepeat = "no-repeat";
        element.style.backgroundPosition = "center";
        element.style.backgroundSize = "contain";
        element.style.color = "transparent";
        element.style.fontSize = "0";

        element.querySelectorAll("img, svg").forEach((child) => {
            child.style.display = "none";
        });
    }

    function applyBrandLogos() {
        const selectors = [
            ".pageTitleWithLogo",
            ".headerLogo",
            ".loginPage .pageTitleWithLogo",
            ".loginPage .headerLogo",
            ".mainDrawer .pageTitleWithLogo",
            ".mainDrawer .headerLogo",
            ".mainDrawer .headerLogo img",
            ".skinHeader .pageTitleWithLogo"
        ];

        selectors.forEach((selector) => {
            document.querySelectorAll(selector).forEach((element) => {
                applyLogoToElement(element);
            });
        });

        document
            .querySelectorAll('img[src*="logo"], img[alt*="Jellyfin"]')
            .forEach((image) => {
                if (image.dataset.threeTideLogoApplied === "true") {
                    return;
                }

                image.dataset.threeTideLogoApplied = "true";
                image.src = logoUrl;
                image.alt = brandName;
            });
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
        } else {
            window.location.href = config.seerrUrl;
        }
    }

    function createButton(kind) {
        const button = document.createElement("button");

        button.id = `threetide-seerr-${kind}`;
        button.type = "button";
        button.className =
            kind === "sidebar"
                ? "navMenuOption"
                : "paper-icon-button-light";

        button.title = config.label || "Anfragen";
        button.setAttribute(
            "aria-label",
            config.label || "Anfragen"
        );

        button.innerHTML =
            '<span class="material-icons" aria-hidden="true">' +
            "add_circle" +
            "</span>" +
            (kind === "sidebar"
                ? '<span class="navMenuOptionText">' +
                escapeHtml(config.label || "Anfragen") +
                "</span>"
                : "");

        button.addEventListener("click", openSeerr);

        return button;
    }

    function ensureButtons() {
        if (!config.enableSeerrButton || !config.seerrUrl) {
            return;
        }

        if (
            (config.position === "sidebar" ||
                config.position === "both") &&
            !document.getElementById("threetide-seerr-sidebar")
        ) {
            document
                .querySelector(".mainDrawer-scrollContainer")
                ?.appendChild(createButton("sidebar"));
        }

        if (
            (config.position === "header" ||
                config.position === "both") &&
            !document.getElementById("threetide-seerr-header")
        ) {
            document
                .querySelector(".headerRight")
                ?.prepend(createButton("header"));
        }
    }

    function applyBranding() {
        applyBrandTitle();
        applyBrandLogos();
        ensureButtons();
    }

    let scheduled = false;

    const observer = new MutationObserver(() => {
        if (scheduled) {
            return;
        }

        scheduled = true;

        requestAnimationFrame(() => {
            scheduled = false;
            applyBranding();
        });
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    applyBranding();
})();