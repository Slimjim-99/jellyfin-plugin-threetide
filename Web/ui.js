(() => {
    "use strict";

    const root =
        window.ThreeTide =
        window.ThreeTide || {};

    const TOAST_ROOT_ID =
        "threetide-toast-root";

    const MODAL_ROOT_ID =
        "threetide-modal-root";

    const LOADING_CLASS =
        "threetide-ui-loading";

    let initialized = false;

    function escapeHtml(value) {
        const element =
            document.createElement("div");

        element.textContent =
            String(value ?? "");

        return element.innerHTML;
    }

    function ensureToastRoot() {
        let toastRoot =
            document.getElementById(
                TOAST_ROOT_ID
            );

        if (toastRoot) {
            return toastRoot;
        }

        toastRoot =
            document.createElement("div");

        toastRoot.id =
            TOAST_ROOT_ID;

        toastRoot.className =
            "threetide-toast-root";

        toastRoot.setAttribute(
            "aria-live",
            "polite"
        );

        toastRoot.setAttribute(
            "aria-atomic",
            "true"
        );

        document.body.appendChild(
            toastRoot
        );

        return toastRoot;
    }

    function ensureModalRoot() {
        let modalRoot =
            document.getElementById(
                MODAL_ROOT_ID
            );

        if (modalRoot) {
            return modalRoot;
        }

        modalRoot =
            document.createElement("div");

        modalRoot.id =
            MODAL_ROOT_ID;

        modalRoot.className =
            "threetide-modal-root";

        document.body.appendChild(
            modalRoot
        );

        return modalRoot;
    }

    function createIcon(name) {
        const icon =
            document.createElement("span");

        icon.className =
            "material-icons threetide-ui-icon";

        icon.setAttribute(
            "aria-hidden",
            "true"
        );

        icon.textContent =
            name;

        return icon;
    }

    function getToastIcon(type) {
        switch (type) {
            case "success":
                return "check_circle";

            case "error":
                return "error";

            case "warning":
                return "warning";

            default:
                return "info";
        }
    }

    function toast(
        message,
        options = {}
    ) {
        const {
            type = "info",
            title = "",
            duration = 4000
        } = options;

        const toastRoot =
            ensureToastRoot();

        const toastElement =
            document.createElement("div");

        toastElement.className =
            `threetide-toast threetide-toast-${type}`;

        toastElement.setAttribute(
            "role",
            type === "error"
                ? "alert"
                : "status"
        );

        const content =
            document.createElement("div");

        content.className =
            "threetide-toast-content";

        const textContainer =
            document.createElement("div");

        textContainer.className =
            "threetide-toast-text";

        if (title) {
            const titleElement =
                document.createElement("strong");

            titleElement.textContent =
                title;

            textContainer.appendChild(
                titleElement
            );
        }

        const messageElement =
            document.createElement("span");

        messageElement.textContent =
            String(message || "");

        textContainer.appendChild(
            messageElement
        );

        const closeButton =
            document.createElement("button");

        closeButton.type =
            "button";

        closeButton.className =
            "threetide-toast-close";

        closeButton.setAttribute(
            "aria-label",
            "Benachrichtigung schließen"
        );

        closeButton.appendChild(
            createIcon("close")
        );

        content.append(
            createIcon(
                getToastIcon(type)
            ),
            textContainer,
            closeButton
        );

        toastElement.appendChild(
            content
        );

        function removeToast() {
            if (
                toastElement.dataset
                    .removing === "true"
            ) {
                return;
            }

            toastElement.dataset.removing =
                "true";

            toastElement.classList.add(
                "threetide-toast-out"
            );

            window.setTimeout(
                () => toastElement.remove(),
                220
            );
        }

        closeButton.addEventListener(
            "click",
            removeToast
        );

        toastRoot.appendChild(
            toastElement
        );

        window.requestAnimationFrame(
            () => {
                toastElement.classList.add(
                    "threetide-toast-visible"
                );
            }
        );

        if (
            Number.isFinite(duration) &&
            duration > 0
        ) {
            window.setTimeout(
                removeToast,
                duration
            );
        }

        return {
            element: toastElement,
            close: removeToast
        };
    }

    function success(
        message,
        title = "Erfolgreich"
    ) {
        return toast(
            message,
            {
                type: "success",
                title
            }
        );
    }

    function error(
        message,
        title = "Fehler"
    ) {
        return toast(
            message,
            {
                type: "error",
                title,
                duration: 6500
            }
        );
    }

    function warning(
        message,
        title = "Hinweis"
    ) {
        return toast(
            message,
            {
                type: "warning",
                title,
                duration: 5500
            }
        );
    }

    function info(
        message,
        title = ""
    ) {
        return toast(
            message,
            {
                type: "info",
                title
            }
        );
    }

    function createSpinner(
        label = "Wird geladen"
    ) {
        const spinner =
            document.createElement("div");

        spinner.className =
            "threetide-spinner";

        spinner.setAttribute(
            "role",
            "status"
        );

        spinner.setAttribute(
            "aria-label",
            label
        );

        spinner.innerHTML = `
            <span class="threetide-spinner-ring"></span>
            <span class="threetide-spinner-label">
                ${escapeHtml(label)}
            </span>
        `;

        return spinner;
    }

    function setLoading(
        element,
        isLoading,
        options = {}
    ) {
        if (!element) {
            return;
        }

        const {
            label = "Wird geladen",
            overlay = true
        } = options;

        const existing =
            element.querySelector(
                ":scope > .threetide-loading-overlay"
            );

        if (!isLoading) {
            element.classList.remove(
                LOADING_CLASS
            );

            existing?.remove();

            return;
        }

        element.classList.add(
            LOADING_CLASS
        );

        if (!overlay || existing) {
            return;
        }

        const loadingOverlay =
            document.createElement("div");

        loadingOverlay.className =
            "threetide-loading-overlay";

        loadingOverlay.appendChild(
            createSpinner(label)
        );

        element.appendChild(
            loadingOverlay
        );
    }

    function createSkeletonCard() {
        const card =
            document.createElement("div");

        card.className =
            "threetide-skeleton-card";

        card.innerHTML = `
            <div class="threetide-skeleton-image"></div>
            <div class="threetide-skeleton-line threetide-skeleton-line-wide"></div>
            <div class="threetide-skeleton-line threetide-skeleton-line-small"></div>
        `;

        return card;
    }

    function renderSkeletons(
        container,
        count = 8
    ) {
        if (!container) {
            return;
        }

        container.replaceChildren();

        const normalizedCount =
            Math.max(
                1,
                Math.min(
                    30,
                    Number(count) || 8
                )
            );

        const fragment =
            document.createDocumentFragment();

        for (
            let index = 0;
            index < normalizedCount;
            index += 1
        ) {
            fragment.appendChild(
                createSkeletonCard()
            );
        }

        container.appendChild(
            fragment
        );
    }

    function closeModal() {
        const modalRoot =
            document.getElementById(
                MODAL_ROOT_ID
            );

        const backdrop =
            modalRoot?.querySelector(
                ".threetide-modal-backdrop"
            );

        if (!backdrop) {
            return;
        }

        backdrop.classList.add(
            "threetide-modal-closing"
        );

        if (
            typeof backdrop._threetideOnClose === "function"
        ) {
            try {
                backdrop._threetideOnClose();
            } catch (error) {
                console.warn(
                    "[3Tide UI] Modal-onClose fehlgeschlagen.",
                    error
                );
            }
        }

        document.documentElement
            .classList
            .remove(
                "threetide-modal-open"
            );

        window.setTimeout(
            () => {
                modalRoot.replaceChildren();
            },
            220
        );
    }

    function openModal(options = {}) {
        const {
            title = "",
            content = "",
            contentElement = null,
            size = "large",
            closeOnBackdrop = true,
            showCloseButton = true,
            showBackButton = false,
            backLabel = "Zurück",
            onBack = null,
            onClose = null,
            className = ""
        } = options;

        closeModal();

        const modalRoot =
            ensureModalRoot();

        const backdrop =
            document.createElement("div");

        backdrop.className =
            "threetide-modal-backdrop";

        backdrop._threetideOnClose = onClose;

        const modal =
            document.createElement("section");

        modal.className =
            [
                "threetide-modal",
                `threetide-modal-${size}`,
                className
            ]
                .filter(Boolean)
                .join(" ");

        modal.setAttribute(
            "role",
            "dialog"
        );

        modal.setAttribute(
            "aria-modal",
            "true"
        );

        if (title) {
            modal.setAttribute(
                "aria-label",
                title
            );
        }

        const header =
            document.createElement("header");

        header.className =
            "threetide-modal-header";

        const titleElement =
            document.createElement("h2");

        titleElement.textContent =
            title;

        const headerStart =
            document.createElement("div");

        headerStart.className =
            "threetide-modal-header-start";

        if (showBackButton) {
            const backButton =
                document.createElement("button");

            backButton.type = "button";
            backButton.className =
                "threetide-modal-back";
            backButton.setAttribute(
                "aria-label",
                backLabel
            );
            backButton.appendChild(
                createIcon("arrow_back")
            );

            const backText =
                document.createElement("span");
            backText.textContent = backLabel;
            backButton.appendChild(backText);

            backButton.addEventListener(
                "click",
                () => {
                    if (typeof onBack === "function") {
                        onBack();
                    } else {
                        closeModal();
                    }
                }
            );

            headerStart.appendChild(backButton);
        }

        headerStart.appendChild(titleElement);
        header.appendChild(headerStart);

        if (showCloseButton) {
            const closeButton =
                document.createElement("button");

            closeButton.type =
                "button";

            closeButton.className =
                "threetide-modal-close";

            closeButton.setAttribute(
                "aria-label",
                "Dialog schließen"
            );

            closeButton.appendChild(
                createIcon("close")
            );

            closeButton.addEventListener(
                "click",
                closeModal
            );

            header.appendChild(
                closeButton
            );
        }

        const body =
            document.createElement("div");

        body.className =
            "threetide-modal-body";

        if (contentElement) {
            body.appendChild(
                contentElement
            );
        } else if (
            content instanceof Node
        ) {
            body.appendChild(
                content
            );
        } else {
            body.innerHTML =
                String(content || "");
        }

        modal.append(
            header,
            body
        );

        backdrop.appendChild(
            modal
        );

        if (closeOnBackdrop) {
            backdrop.addEventListener(
                "click",
                (event) => {
                    if (event.target === backdrop) {
                        closeModal();
                    }
                }
            );
        }

        modalRoot.replaceChildren(
            backdrop
        );

        document.documentElement
            .classList
            .add(
                "threetide-modal-open"
            );

        window.requestAnimationFrame(
            () => {
                backdrop.classList.add(
                    "threetide-modal-visible"
                );
            }
        );

        const focusTarget =
            modal.querySelector(
                "input, button, select, textarea, [tabindex]:not([tabindex='-1'])"
            );

        focusTarget?.focus();

        return {
            root: backdrop,
            modal,
            body,
            close: closeModal
        };
    }

    function confirm(options = {}) {
        const {
            title = "Bestätigen",
            message = "",
            confirmLabel = "Bestätigen",
            cancelLabel = "Abbrechen",
            destructive = false
        } = options;

        return new Promise(
            (resolve) => {
                const wrapper =
                    document.createElement("div");

                wrapper.className =
                    "threetide-confirm";

                const messageElement =
                    document.createElement("p");

                messageElement.textContent =
                    String(message || "");

                const actions =
                    document.createElement("div");

                actions.className =
                    "threetide-confirm-actions";

                const cancelButton =
                    document.createElement("button");

                cancelButton.type =
                    "button";

                cancelButton.className =
                    "threetide-button threetide-button-secondary";

                cancelButton.textContent =
                    cancelLabel;

                const confirmButton =
                    document.createElement("button");

                confirmButton.type =
                    "button";

                confirmButton.className =
                    destructive
                        ? "threetide-button threetide-button-danger"
                        : "threetide-button threetide-button-primary";

                confirmButton.textContent =
                    confirmLabel;

                actions.append(
                    cancelButton,
                    confirmButton
                );

                wrapper.append(
                    messageElement,
                    actions
                );

                const dialog =
                    openModal({
                        title,
                        contentElement: wrapper,
                        size: "small",
                        closeOnBackdrop: false
                    });

                cancelButton.addEventListener(
                    "click",
                    () => {
                        dialog.close();
                        resolve(false);
                    }
                );

                confirmButton.addEventListener(
                    "click",
                    () => {
                        dialog.close();
                        resolve(true);
                    }
                );
            }
        );
    }

    function handleError(
        caughtError,
        fallbackMessage =
            "Ein unbekannter Fehler ist aufgetreten."
    ) {
        console.error(
            "[3Tide]",
            caughtError
        );

        const message =
            caughtError?.message ||
            caughtError?.Message ||
            fallbackMessage;

        error(message);

        return message;
    }

    function onKeyDown(event) {
        if (
            event.key === "Escape" &&
            document.documentElement
                .classList
                .contains(
                    "threetide-modal-open"
                )
        ) {
            closeModal();
        }
    }

    const UI = {
        init() {
            if (initialized) {
                return this;
            }

            initialized = true;

            ensureToastRoot();
            ensureModalRoot();

            document.addEventListener(
                "keydown",
                onKeyDown
            );

            console.info(
                "[3Tide] UI-Modul initialisiert."
            );

            return this;
        },

        toast,
        success,
        error,
        warning,
        info,

        createSpinner,
        setLoading,

        createSkeletonCard,
        renderSkeletons,

        openModal,
        closeModal,
        confirm,

        handleError
    };

    root.UI = UI;
})();