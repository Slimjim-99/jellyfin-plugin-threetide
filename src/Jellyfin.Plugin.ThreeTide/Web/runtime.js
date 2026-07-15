const brandName = config.brandName || "3Tide";

function applyBrandTitle() {
    const currentTitle = document.title || "";

    if (!currentTitle.includes(brandName)) {
        document.title = currentTitle
            .replace(/Jellyfin/gi, brandName)
            .trim() || brandName;
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
(() => {
"use strict";
const config=window.__THREETIDE_CONFIG__||{};
const escapeHtml=(value)=>{const div=document.createElement("div");div.textContent=value;return div.innerHTML;};
const openSeerr=()=>{if(!config.seerrUrl)return;if(config.openInNewTab)window.open(config.seerrUrl,"_blank","noopener,noreferrer");else window.location.href=config.seerrUrl;};
const createButton=(kind)=>{
 const button=document.createElement("button");
 button.id="threetide-seerr-"+kind;
 button.type="button";
 button.className=kind==="sidebar"?"navMenuOption":"paper-icon-button-light";
 button.title=config.label||"Anfragen";
 button.setAttribute("aria-label",config.label||"Anfragen");
 button.innerHTML='<span class="material-icons" aria-hidden="true">add_circle</span>' +
  (kind==="sidebar"?'<span class="navMenuOptionText">'+escapeHtml(config.label||"Anfragen")+"</span>":"");
 button.addEventListener("click",openSeerr);
 return button;
};
const ensureButtons=()=>{
 if(!config.enableSeerrButton||!config.seerrUrl)return;
 if((config.position==="sidebar"||config.position==="both")&&!document.getElementById("threetide-seerr-sidebar")){
  document.querySelector(".mainDrawer-scrollContainer")?.appendChild(createButton("sidebar"));
 }
 if((config.position==="header"||config.position==="both")&&!document.getElementById("threetide-seerr-header")){
  document.querySelector(".headerRight")?.prepend(createButton("header"));
 }
};
new MutationObserver(ensureButtons).observe(document.documentElement,{childList:true,subtree:true});
    ensureButtons();
    applyBrandTitle();

    const titleObserver = new MutationObserver(applyBrandTitle);

    titleObserver.observe(
        document.querySelector("title") || document.documentElement,
        {
            childList: true,
            subtree: true,
            characterData: true
        }
    );
})();
