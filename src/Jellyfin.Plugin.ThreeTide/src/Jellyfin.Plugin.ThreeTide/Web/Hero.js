(() => {
    "use strict";

    const HERO_ID = "threetide-hero";

    function findHomeContainer() {
        return document.querySelector(
            ".homeSectionsContainer, .homeSections, #homeTab"
        );
    }

    function createHero() {
        const hero = document.createElement("section");

        hero.id = HERO_ID;
        hero.innerHTML = `
            <div class="threetide-hero-content">
                <span class="threetide-hero-eyebrow">3Tide Original</span>
                <h1>Willkommen bei 3Tide</h1>
                <p>
                    Der neue Hero-Bereich ist erfolgreich geladen.
                </p>

                <div class="threetide-hero-actions">
                    <button type="button"
                            class="threetide-hero-primary">
                        Abspielen
                    </button>

                    <button type="button"
                            class="threetide-hero-secondary">
                        Weitere Infos
                    </button>
                </div>
            </div>
        `;

        return hero;
    }

    function init() {
        if (document.getElementById(HERO_ID)) {
            return;
        }

        const container = findHomeContainer();

        if (!container) {
            return;
        }

        container.prepend(createHero());
        console.info("3Tide Hero initialized");
    }

    function destroy() {
        document.getElementById(HERO_ID)?.remove();
    }

    window.ThreeTideHero = {
        init,
        destroy
    };
})();