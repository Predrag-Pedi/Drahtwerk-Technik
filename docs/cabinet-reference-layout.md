# Schrank- und Systemaufbau · Stand 16.11.2026

## Quellen und Prüfung

- Drahtwerk Referenzordner: https://drive.google.com/drive/folders/1bUDsqp2_l7fdaZBaxkOdhlVIHFuIlzA_
- 61 PDF-Dateien aus den Projektordnern lokal eingelesen; Dispositionsblätter visuell verglichen. 78 ausgewählte Fotos (Anfang/Mitte/Ende der Projekt-Fotoordner) ergänzend verglichen. Keine Behauptung einer vollständigen Prüfung aller Fotos oder sämtlicher Schaltplanseiten.
- ABB «Stromschienen 40 A und 100 A / Auswahltabelle für Stecksockel», bereitgestellte Smissline-Tabelle. Gesamtmass inklusive Endstücke, nicht einfach ME × 18 mm.
- https://almatec.3d-konfigurator.ch/an und https://almatec.3d-konfigurator.ch/apup; öffentliche Katalogauswahl und Geometrieparameter im ausgelieferten Konfigurator geprüft. Keine Bestellung oder Übernahme von Backend-Zugangsdaten.

## Wiederkehrende Aufbauten

| Referenzen | Beobachtung / Umsetzung |
|---|---|
| AU-00718, AU-00698, AU-00422 | Smissline überwiegend senkrecht, daneben Verdrahtungs-/Klemmenraum. Je Einspeisegruppe eigene Bahn. |
| AU-00413 | Auch horizontale Smissline-Anwendung vorhanden; automatische Variante zunächst senkrecht. |
| AU-00687, AU-00595, AU-00368 | Schrank mit bestücktem Innenrahmen, teils gemischt konventionell/Smissline, Sockel getrennt vom Korpus. |
| AU-00592, AU-00610, AU-00608 | Konventionelle DIN-Reihen, getrennte Zähler-/Messbereiche und untere Sicherungszone. Vorhandene SBR-Anordnung bleibt Grundlage des Innenrahmens. |
| AU-00605, AU-00550, AU-00679 | Vertigroup mit separater N-Schiene und Abstützungen; vorhandene Originalzuordnung und maximal 1000 mm Trägerabstand beibehalten. |
| AU-00612, AU-00406 | 60-mm-Aufbauten und ausreichend hohe untere Sicherungszone. Vorhandene mindestens 500-mm-Regel und N-Trenner bleiben aktiv. |

Kundenspezifische Breiten/Höhen wie 825/1125 mm oder 1800/2200 mm Korpus sind kein Beleg für ein Standardmodell im aktuellen AN-Konfigurator. Solche Sondergehäuse werden nicht automatisch als bestellbare Katalogvarianten angeboten.

## Automatische Schrankauswahl

- AN: Korpus 2000 mm; Sockel 0/100/200 mm. Konfiguratorbreiten 400–2000 mm gemäss expliziter Liste in `cabinet-layout.mjs`, Tiefen 300/350/400/450/500/600/700/800/900/1000 mm. Höchstens zehn Felder.
- AP/UP: Breite/Höhe 400–2000 mm, Tiefe 230 mm. Automatik sucht in 50-mm-Schritten und berücksichtigt zusätzlich die exakte obere Massgrenze. AP/UP wird gespeichert.
- Gesamtbreite begrenzt die Summe der Gehäuse. Durchgangsbreite begrenzt jedes einzelne Feld; Höhe inklusive Sockel und Tiefe werden ebenfalls geprüft. Kein stillschweigendes Kippen oder Demontieren.
- Innenrahmen auf 250-mm-Plattenraster. Aktuell **konservative Planungsabzüge von 60 mm umlaufend und 50 mm in der Tiefe**. Dies sind keine aus dem Hersteller abgeleiteten Fertigungs-/Einbaumasse. Sie sind zentral hinterlegt und müssen vor Fertigungsfreigabe gegen die konkrete Gehäuseausführung geprüft werden.
- 3D zeigt vereinfachte Gehäusewände, Rückwand, Sockel, geöffnete Türblätter und vorhandene Innenbestückung. Keine exakte Scharnier-, Schloss-, Dichtungs- oder IP-Konstruktion.

## Smissline und Grenzen

- LS/FILS mit den bestätigten LS-Automaten-I-Grafikkörpern, Zubehör und Einspeisung gemäss Werkstattregeln unten. Originale `Schiene ..ME` werden um 90° gedreht, nicht auf eine erfundene Länge skaliert.
- Gesamtmass aus ABB-Tabelle; bei Differenzen bis 2 mm wird das grössere ABB-Mass für die Platzprüfung reserviert. 48/50-ME-Vorlagen sind wegen grösserer Abweichung ausgeschlossen. 110 ME ist nicht in der bereitgestellten Tabelle enthalten und wird nicht automatisch gewählt.
- Jede Bahn erhält ihre Länge aus belegten ganzen PE einschliesslich Einspeisung und Zubehör plus aufgerundeter Geräte-Platzreserve. Es wird die kleinste passende Originalbahn gewählt. Kurze, separat eingespeiste Bahnen dürfen mit 50 mm Planungsabstand untereinander liegen. Pro Spalte sind 200 mm für die Bahn vorgesehen; je zwei Spalten teilen sich eine Gitterbahn (200 mm, alternativ 300 mm in Einbaumasse / Reserve). Das gesamte Paket bleibt auf dem 250-mm-Rahmenraster. Gittergeometrie: offenes Planungsmodell mit 60 mm Tiefe und 25/50-mm-Zeichenraster, keine herstellerspezifische Fertigungszeichnung.
- Die gewünschte Geräte-Platzreserve wird mitgerechnet. Die bestehende Rückfrage vor Reduktion bleibt bestehen. Reserve-Zählerplätze werden nicht reduziert.
- Explizite Geräte-Systeme im Schema haben Vorrang vor der globalen Vorgabe. Damit bleiben gemischte konventionelle, Silas-, Vertigroup- und Smissline-LS-Aufbauten möglich.
- FILS verwenden die vom Benutzer bestätigten LS-Automaten-I-Grafikkörper; die Gerätesemantik bleibt FILS. Die FI-Vorlage tl-0628 wird nicht dafür verwendet.
- Konventionelle Einspeisblöcke bleiben auf die eindeutig zugeordneten 100-/160-A-Vorlagen begrenzt. Smissline verwendet die unten bestätigten 4-PE- bzw. 2-PE-je-Phase-Baugruppen.
- Feldverteiler und Uniway bleiben gesperrt. Sondergehäuse, horizontale Smissline und vollständige Hersteller-Innenausbausätze sind nicht enthalten.

## Prüfung

Automatisierte Fälle prüfen Katalogmasse, Einbau-/Transportgrenzen, Sockelhöhe, Mehrfeldaufteilung, nutzbaren Innenraum, gemischte Systeme, Originalvorlagen, Reserven, Speichern/Wiederladen, SVG-Ausgabe und 3D-Körper. 2D-Testzeichnung und projizierte 3D-Testgeometrie visuell kontrolliert. Ein interaktiver Browserlauf war in dieser Umgebung wegen der Chromium-Socketbeschränkung nicht möglich.

## Aktualisierung anhand Werkstattangaben vom 16.11.2026

Die folgenden Angaben ersetzen die entsprechenden offenen Punkte oben:

- Sieben Fotos eines 400 mm tiefen Standschranks erhalten. Die oberen/unteren Messungen zeigen ungefähr 75–80 mm; für die Höhenplanung sind nun je 80 mm vorgesehen. Seitlich bleibt der bisherige 60-mm-Planungsabzug bestehen, da die fotografischen Bezugskanten keinen präzisen universellen Fertigungsabzug belegen.
- Verbindliche Benutzervorgabe: Tür bis Vorderseite der Zählerplatte mindestens 190 mm. Automatische Tiefenwahl berücksichtigt dazu den 165-mm-Innenrahmen und 20 mm Rückraum. Daraus ergibt sich bei den Katalogtiefen mindestens 400 mm für Schränke mit Zählerplatten. Auch das 3D-Modell hält die Plattenvorderseite 190 mm hinter der Tür-Ebene.
- Wandschränke sind bis zur Vermessung wieder gesperrt, vorhandene Auswahlwerte bleiben gespeichert.
- LS und FILS verwenden auf ausdrückliche Vorgabe die einfachen Körper aus «21LS-Automaten I»; die elektrische Geräteart bleibt dabei erhalten. FILS 1-phasig verwenden einen 2-PE-Körper, 3-phasig einen 4-PE-Körper. Externe N-Trenner werden für LS separat dargestellt; HK links mit 9 mm, N rechts mit 9/18 mm, aus «Füllstück 9mm». Der 18-mm-N-Körper wird aus diesem Füllstück auf 18 mm Breite dargestellt.
- Ein N9 + direkt folgender HK9 teilt eine PE. Zusammengehörige Halb-PE-Paare werden beim Aufteilen auf Bahnen nie getrennt. Ohne passenden Nachbarn wird N18 bzw. HK9 + Füllstück9 verwendet. Die Gerätekörper starten auf ganzen PE; jede fertige Bahn hat eine ganzzahlige PE-Belegung.
- Smissline-Einspeiseblock bis einschliesslich 160 A: 4 PE, Vorlage «LS 4P Smissline-S vertikal». Darüber: je 2 PE für L1/L2/L3/N, viermal «LS 2P Smissline-S vertikal». Die Zuordnung dieser grafischen Ersatzkörper wurde ausdrücklich vom Benutzer vorgegeben. Quellsicherung wird beschriftet; bei uneindeutiger Herkunft kann ihre BMK und der Einspeisestrom im Schema angegeben werden. Keine Stromsummierung der Abgänge.
- SPD wird bei globalem Smissline-Aufbau aus der normalen SPD-Vorlage auf der Bahn angeordnet. Hauptschalter bis 63 A nutzt den vorgegebenen 4-poligen Grafikkörper, bleibt semantisch ein Schalter. Oberhalb 63 A wird die passende konventionelle Lasttrenner-Vorlage gewählt; dieselbe Zuordnung gilt für konventionelle Hauptschalter.
- Die Regel ist eine Umsetzung der genannten Drahtwerk-Aufbauvorgaben; keine neue pauschale Herstellerfreigabe beliebiger Artikelkombinationen.


## Ergänzung 16.11.2026: PE-Reserve und Gitterbahn

- Referenz AU-00698/S-00698, Blatt 2: senkrechte Bahnen, mehrere Bahnen untereinander und zentrale Gitterbahn 300. Weitere Vorlagen enthalten Gitterbahn 200. Die Auswahl 200/300 zählt vollständig zur benötigten Einbaubreite.
- Beispiel: 6 Geräte à 2 PE + Einspeisung 4 PE = 16 belegte PE. 20 % ergeben aufgerundet 4 Reserve-PE; gewählt wird eine 20-PE-Bahn (401 mm inklusive Endstücke).
- Die Beschriftung zeigt Gesamt-PE, belegte PE und tatsächlich freie PE. Bibliotheksstufen können mehr freie PE ergeben als verlangt.
- Regression: vier kurze getrennte Einspeisegruppen passen mit gemeinsamer Gitterbahn in 758 × 1520 mm, statt vier ganze Spalten zu verlangen. Gruppen werden elektrisch nicht verbunden.
- Eine getestete echte Kapazitätsgrenze (16 belegte PE, 508 × 700 mm) bietet eine Reduktion von 20 auf 12 % erst nach Zustimmung an. Ablehnen verändert weder Dispo noch Reserve.
- 2D-SVG gerastert und visuell geprüft; Gitter und PE-Metadaten sowie offene 3D-Geometrie über Speichern/Laden getestet. Der Screenshot des Benutzers enthält keine Geräte-/Projektdatei; genau dieses konkrete Projekt konnte daher nicht reproduziert werden.
