3Tide - Verbesserungspaket (Player + TV + Performance)
======================================================

NEU
---
Web/player.css
  Kompletter Neuaufbau des Player-Skins. Der alte player.css.disabled /
  player.js.disabled war durch den Chunk-Regex-Bug korrumpiert
  (ueberall "z - index", "linear - gradient(...) 0 %" -> totes CSS).
  Jetzt: Netflix-artige OSD-Verlaeufe, roter Fortschrittsbalken
  (#e0242e) mit Hover-Verdickung, runde Buttons mit sanften
  GPU-Transitions (nur transform/opacity), dunkle Blur-Menues fuer
  Audio/Untertitel/Qualitaet, Touch-Optimierung (min. 46px Targets),
  Safe-Area-Insets. Grundsatz beibehalten: display/position/inset/
  width/height werden NIE angefasst - Jellyfin verwaltet das selbst.

Web/player.js
  Zentrale, selbstheilende Zustandsverwaltung:
  - synchronisiert threetide-player-active auf <html> UND <body>
    dauerhaft mit dem echten Zustand von #videoOsdPage.
    Vorher setzte nur Hero.js die Klasse (nur beim Start ueber den
    Hero-Button) -> Klasse konnte haengen bleiben (schwarzer Screen).
    Entfernen mit 4s Gnadenfrist, damit Heros Vorab-Setzen beim
    Uebergang nicht flackert.
  - pflegt threetide-has-video als :has(video)-Ersatz fuer alte
    TV-Browser (Tizen/webOS-Chromium kann kein :has()).
  - stoppt Hero-Preview-Trailer, sobald der echte Player sichtbar
    wird (nie zwei Medien gleichzeitig).
  - MutationObserver mit requestAnimationFrame-Buendelung
    (max. 1 Update pro Frame statt pro Mutation).

Web/tv.js
  TV-Erkennung (Tizen/webOS/SmartTV per User-Agent), beendet sich
  auf Desktop/Mobile sofort. Am TV:
  - body-Klassen threetide-tv / threetide-tizen / threetide-webos
  - window.TIDE_TV = true (Hero.js startet damit keine Hover-Previews)
  - Fokus-Sicherung nach Seitenwechseln (D-Pad landet nie im Nichts)
  - macht threetide-poster-card / threetide-landscape-card per
    tabindex fokussierbar, Enter loest Klick aus.
  Wird als erstes Script injiziert, damit TIDE_TV vor Hero.js existiert.

Web/tv.css
  Komplett hinter body.threetide-tv gescoped (auf Desktop inaktiv,
  wird daher immer mitgeliefert). Fokus-Rahmen + Scale fuer Karten,
  Hero- und Header-Buttons, groessere OSD-Controls, Safe-Area,
  Scrollbars/Cursor aus, Hover-Overlays und Preview-Video versteckt.
  Bewusst ohne :has()/moderne Features (alte TV-Chromiums).

GEAENDERT
---------
Web/Hero.js
  startPreview(): Early-Return bei window.TIDE_TV - am TV wird der
  Trailer-Stream gar nicht erst angefordert (spart Bandbreite und
  verhindert Audio-Geister).

Transformations/IndexHtmlTransformation.cs
  - player.css + tv.css in die Style-Injektion aufgenommen
  - tv.js (direkt nach Bootstrap) und player.js (nach player-titel.js)
    in die Script-Injektion aufgenommen
  - PERFORMANCE: Injection-Block wird jetzt gecacht (Key: Config +
    Branding-CSS). Vorher wurden bei JEDEM index.html-Request ~20
    eingebettete Assets gelesen und mehrere hundert KB Strings
    zusammengebaut. Cache invalidiert sich automatisch bei
    Config-/Branding-Aenderung.

Plugin.cs
  ReadEmbeddedText cached jetzt (ConcurrentDictionary) - Assets sind
  fuer die Lebensdauer der Assembly unveraenderlich; Reflection ueber
  GetManifestResourceNames() + Stream-Lesen passiert nur noch einmal
  pro Datei statt pro Request.

ENTFERNT (tote/korrupte Dateien)
--------------------------------
  Web/player.css.disabled   (korrumpiert durch Regex-Bug)
  Web/player.js.disabled    (korrumpiert, enthielt ohnehin CSS)
  Web/player-overlayer.css  (leer)
  Web/player-overlayer.js   (leer)
  Web/seerr.js              (leer)
  Web/seerr.cs              (verirrte C#-Datei im Web-Ordner, wurde
                             als Embedded Resource mitgebaut)

BUILD
-----
Wie gewohnt: build.ps1 / dotnet build -c Release
Die neuen Web-Dateien werden ueber den bestehenden Wildcard
<EmbeddedResource Include="Web\**\*" /> automatisch eingebettet,
build.yaml brauchte keine Aenderung.

TESTEN
------
1. Desktop: Wiedergabe starten/beenden ueber verschiedene Wege
   (Hero-Play, Detailseite, Zurueck-Taste) -> Header kommt immer
   sauber zurueck, kein schwarzer Screen mehr.
2. TV-Modus ohne TV testen: DevTools -> Network Conditions ->
   User Agent z.B. "Mozilla/5.0 (SMART-TV; LINUX; Tizen 6.0)
   AppleWebKit/537.36" -> neu laden -> Fokus-Rahmen sichtbar,
   keine Hover-Previews.
3. Am Samsung (Wrapper-App): D-Pad-Navigation durch Home-Reihen,
   Enter auf Karte oeffnet Details.

NACHTRAG (Runde 2 - nach Screenshot-Feedback)
---------------------------------------------
Problem 1: Riesiger Titel + weisser Kreis ueberlappend, kein roter Balken
  Ursache: theme.css enthielt einen ZWEITEN kompletten Player-Block
  (osdTitle bis 3.5rem, absolute Positionierung auf Klassen, die es
  im 10.11-DOM teils nicht gibt) - der kollidierte mit player.css.
  Fix: Player-Block aus theme.css entfernt, player.css ist jetzt die
  einzige Quelle. Verlaeufe laufen DOM-unabhaengig ueber
  #videoOsdPage::before/::after, Titel normal gross in nativer
  Position, Play/Pause als dezenter 52px-Kreis, roter Balken ueber
  accent-color (deckt das native input[type=range] von 10.11 ab).

Problem 2: Keine Zurueck-Taste im Player
  Ursache: Der native Zurueck-Pfeil sitzt im .skinHeader, den
  header.css global per visibility:hidden versteckt.
  Fix: player.js erzeugt einen eigenen 3Tide-Zurueck-Button oben
  links (Glas-Look, blendet nach 3.2s Inaktivitaet aus wie das OSD,
  erscheint bei Mausbewegung/Touch/Taste). Klick = history.back(),
  Fallback #/home.

Problem 3: Hero "Abspielen" startet nichts
  Ursache: Der Code suchte window.PlaybackManager - jellyfin-web
  exportiert den PlaybackManager NICHT als Global (ES-Modul).
  Der Aufruf lief immer in den Fehler-Fallback.
  Fix: Play-Befehl per Sessions-API an die eigene Session
  (POST /Sessions/{id}/Playing?playCommand=PlayNow&itemIds=...).
  Der Client empfaengt den Befehl ueber seinen WebSocket und
  startet die native Wiedergabe selbst - inkl. Resume-Position.

Problem 4 (dabei gefunden): OSD konnte nie ausblenden
  theme.css erzwang opacity:1 auf .videoOsd/.videoOsdBottom -
  Jellyfins Auto-Hide war damit tot, Steuerung klebte dauerhaft
  ueber dem Film. Erzwungene Sichtbarkeit jetzt nur noch auf
  Video/Container, nicht auf OSD-Elementen.

WICHTIG BEIM TESTEN AM MAC/SAFARI
  Dein bekanntes Service-Worker-Caching kann die alte Version
  festhalten: Safari -> Entwickler -> Cache-Speicher leeren,
  oder privates Fenster. Pruefen ob die neue Version aktiv ist:
  Konsole -> document.getElementById('threetide-player-script')
  muss ein Element liefern.
