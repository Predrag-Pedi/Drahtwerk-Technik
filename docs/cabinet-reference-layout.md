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

- LS 1–4-polig aus Originalvorlagen tl-0629 bis tl-0632. Originale `Schiene ..ME` werden um 90° gedreht, nicht auf eine erfundene Länge skaliert.
- Gesamtmass aus ABB-Tabelle; bei Differenzen bis 2 mm wird das grössere ABB-Mass für die Platzprüfung reserviert. 48/50-ME-Vorlagen sind wegen grösserer Abweichung ausgeschlossen. 110 ME ist nicht in der bereitgestellten Tabelle enthalten und wird nicht automatisch gewählt.
- Pro Bahn 250 mm Planungsbreite mit seitlichem 50-mm-Verdrahtungskanal. 72 mm Einspeiseplatz werden freigehalten; die konkrete Smissline-Einspeisebaugruppe und ihre Strombemessung sind noch nicht zugeordnet/gezeichnet. Dies ist eine Platzreservierung, kein elektrischer Nachweis.
- Die gewünschte Geräte-Platzreserve wird mitgerechnet. Die bestehende Rückfrage vor Reduktion bleibt bestehen. Reserve-Zählerplätze werden nicht reduziert.
- Explizite Geräte-Systeme im Schema haben Vorrang vor der globalen Vorgabe. Damit bleiben gemischte konventionelle, Silas-, Vertigroup- und Smissline-LS-Aufbauten möglich.
- **Smissline-FILS sind noch gesperrt:** Die ausdrücklich als Smissline bezeichnete Vorlage tl-0628 ist ein FI, kein FILS. Eine passende FILS-Vorlage/Artikelzuordnung ist noch zu bestätigen. Keine automatische Substitution eines FI für einen FILS.
- Bestehende Einspeisblock-Automatik ist weiterhin auf die eindeutig zugeordneten 100-/160-A-Vorlagen begrenzt. Für grössere Bemessungsströme fehlt eine bestätigte Einspeisebaugruppe.
- Feldverteiler und Uniway bleiben gesperrt. Sondergehäuse, horizontale Smissline und vollständige Hersteller-Innenausbausätze sind nicht enthalten.

## Prüfung

Automatisierte Fälle prüfen Katalogmasse, Einbau-/Transportgrenzen, Sockelhöhe, Mehrfeldaufteilung, nutzbaren Innenraum, gemischte Systeme, Originalvorlagen, Reserven, Speichern/Wiederladen, SVG-Ausgabe und 3D-Körper. 2D-Testzeichnung und projizierte 3D-Testgeometrie visuell kontrolliert. Ein interaktiver Browserlauf war in dieser Umgebung wegen der Chromium-Socketbeschränkung nicht möglich.
