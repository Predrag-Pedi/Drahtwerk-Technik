# Gemeinsame Drahtwerk-Oberfläche

Alle acht HTML-Seiten laden `design.css?v=20261110-2` nach ihren eigenen Styles. Die gemeinsame Gestaltung umfasst Navigation, Header, Typografie, Karten, Eingaben und Tabellen. Die technische Register-Navigation bleibt über dem Inhalt; ihre Selektoren bleiben unverändert.

Die Seitennavigation zeigt Produktion und Büro. Unter 760 px wird sie horizontal bedienbar. Bewegungen beachten `prefers-reduced-motion`; bei Druck wird die zusätzliche Navigation ausgeblendet. Fachliche Zustandsfarben, Gerätewerte, Berechnungen und Speicherformate bleiben in den bisherigen Modulen.

Neue Werkzeuge in allen Navigationslisten sowie der Startseite ergänzen. Bei Änderungen Cache-Version in `sw.js` und Stylesheet-Version gemeinsam aktualisieren. Keine externen Schrift- oder Design-Abhängigkeiten.

Validierung: 122 bestehende Tests erfolgreich. Alle acht Seiten im Browser visuell kontrolliert; Schienenberechnung mit 800 × 1800 mm und zwei Seitenprofilen ergibt 3520 mm. Litzenvergleich für 63 A sowie Wechsel zu Kupfer und ABB geprüft. Ordner- und Farbtabellen laden. PDF-/Excel-Export in diesem Design-Update nicht erneut mit vollständigen Projektdateien geprüft.
