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


## Nachbildung des gemeldeten Smissline-Projekts

Die nachgereichte Raster-PDF «Smissline - Schema und Dispo.pdf» enthält auf Blatt 10 einen 63-A-Hauptschalter, Eingangsklemmen und SPD; Blatt 11–16 jeweils drei FI/LS, Blatt 17/18 jeweils drei LS, Blatt 19/20 je einen LS. Im Screenshot: SBR, max. 1008 × 2000 mm, Durchgang 2000 × 2000 mm, keine Zählerreserve, Smissline, Gitterbahn 200. Die Test-Fixture bildet diese Geräte mit Originalmakros und dem 63-A-Schalter nach; sie ersetzt keine aus dem Editor exportierte Projektdatei und enthält keine aus der PDF nicht ersichtlichen Einstellungen.

Ursache: Unbenannte Abgänge erhielten bisher `bus:<page>` als Einspeisegruppe, also eine zusätzliche Bahn/Einspeisung je Schemaseite. Beim globalen Smissline-Aufbau mit genau einem Eingang und genau einem Hauptschalter auf derselben Seite, ohne Zähler- oder Sicherungsabgangsgruppen, wird nun eine gemeinsame Eingangsgruppe verwendet. Seitenkopien erzeugen damit keine künstlichen elektrischen Gruppen. Explizite Quellsicherungen, benannte Gruppen, mehrere Eingänge/Hauptschalter und Zähler-/Sicherungsgruppen werden nicht zusammengefasst. Das Schema selbst wird nicht umverdrahtet.

## Direktanschluss am Smissline-Hauptschalter

Erneut visuell geprüft: AU-00413/S-00413 Blatt 9 zeigt eine senkrechte Smissline-Bahn mit seitlicher Gitterbahn 200 im 508 mm breiten Rahmen. Die neue ausdrückliche Werkstattvorgabe ersetzt die bisherige Behandlung der Eingangsklemme: Bei einem eindeutig zugeordneten Hauptschalter direkt auf der Bahn bis einschliesslich 63 A wird direkt am Hauptschalter angeschlossen. In der Disposition entfällt die Eingangsklemme und auf seiner eigenen Bahn der zusätzliche Einspeiseblock. Der Hauptschalter steht zuerst. Weitere Bahnen behalten Einspeiseblöcke mit seiner BMK und deren PE zählen zur Reserveberechnung.

Über 63 A bleiben Eingangsklemmen und konventioneller Hauptschalter bestehen. Ein ausdrücklich konventioneller Hauptschalter, mehrere Eingänge oder unklare Zuordnungen lösen die automatische Entfernung nicht aus. Auch ein höher angegebener Eingangsstrom verhindert die Entfernung. Die Schemaelemente bleiben unverändert.

Ohne weitere konventionelle Geräte wird kein leerer konventioneller Bereich mit DIN-/Kupferschienen erzeugt. Die Nachbildung des gemeldeten Projekts passt nun in 508 × 1920 mm: 76-PE-Originalbahn mit 60 belegten und 16 freien PE, Hauptschalter, SPD, 18 FI/LS und 8 LS sowie Gitterbahn 200. Bei maximal 1520 mm Höhe werden zwei Bahnen verwendet; nur die zusätzliche Bahn erhält einen Einspeiseblock. Die geforderten 20 % bleiben erhalten. Die 2D-Ausgabe wurde gerastert und visuell geprüft. Die Nachbildung ist kein vollständiger Import der ursprünglichen Editor-Projektdatei.

## Kompakte Smissline-Rahmenhöhe

Bei ausschliesslich auf Smissline montierten Geräten übernimmt die Gitterbahn die Kabelführung; die zusätzlichen AS50/AS35-Galip-Profile entfallen. Die Bahnen beginnen 20 mm unter der Rahmenoberkante. Für automatische SBR-Abmessungen werden die Originalbahnlängen berücksichtigt und die Höhe bis 20 mm hinter der letzten Bahn begrenzt, statt eine pauschale obere Zone und 400-mm-Höhenschritte zu übernehmen. Die gespeicherte obere Zone für gemischte/konventionelle Aufbauten bleibt erhalten. Manuell vorgegebene Rahmenmasse und Schrank-Katalogmasse werden nicht gekürzt.

Die Nachbildung benötigt dadurch 508 × 1450 mm statt 508 × 1920 mm. 60 belegte PE plus 20 % benötigen 72 PE; die kleinste verfügbare geprüfte Originalbahn hat 76 PE. Es werden keine zusätzlichen Reserveprozente berechnet, aber die vier PE durch die Bibliotheksabstufung bleiben bestehen. Keine unbestätigte gekürzte Bahn wird erfunden. Tests prüfen diese Differenz, den Wegfall des Galip, die Rahmenränder und weiterhin die Zustimmung bei tatsächlicher Reserveunterschreitung.

## Smissline mit separater Einspeisung ohne feste Zonen

Auch separate Eingangsklemmen und konventionelle Hauptschalter aktivieren keine pauschalen Kopf-/Sicherungszonen mehr. Ihre Originalgeräte werden in einem seitlichen Bereich nach tatsächlichen Abmessungen mit 40 mm Abstand und örtlichen Montageschienen angeordnet. Die Smissline-Bahnen beginnen weiterhin bei 20 mm und nutzen die volle nutzbare Höhe. Die automatische SBR-Höhe berücksichtigt sowohl Bahnenden als auch die separaten Geräte. Zähler-/Sicherungsplatten werden weiterhin mit ihrem eigenen Montageaufbau behandelt, nicht als beliebig entfernbare Bauteile.

Regression: dieselbe 125-A-Verteilung ergibt bei Kopf-/Sicherungszone 200/200 und 500/1600 identische 758 × 1450 mm. Klemmen, konventioneller Hauptschalter und Bahneinspeisung bleiben erhalten; Galip entfällt. Gerasterte 2D-Zeichnung visuell geprüft.

## Präzisierte Reihenfolge nach Smissline-Referenzen

Erneut visuell geprüft wurden AU-00698 Blatt 2, die unter AU-00368 abgelegte UV-2-Disposition (S-00318 Blatt 9) und die unter AU-00595 abgelegte UV-A-Disposition (S-00925 Blatt 2). Sie zeigen die zusätzliche senkrechte Montageschiene links, einen schmalen Kabelkanal, die Smissline-Bahnen und die breite Gitterbahn. S-00318 bezeichnet den schmalen Kanal als 60 × 40; dort liegt der Anschlussbereich oberhalb der Bahn. Die folgenden Regeln ersetzen die seitlichen kurzen waagrechten Geräteschienen des vorigen Stands.

- Hauptschalter und unterstützte Zusatzgeräte ausserhalb Smissline (Schütze, konventionelle LS/FI/LS/SPD) werden mit ihren Originalgrafiken um 90 Grad gedreht auf einer senkrechten DIN-Schiene angeordnet.
- Rechts davon steht ein durchgehender Kabelkanal 60 × 40, anschliessend Smissline, danach die Gitterbahn. Kanal und Gitterbahn bleiben unterschiedliche Bauteile. 2D zeigt auch die senkrechte DIN-Schiene; 3D bildet die Seiten des schmalen Kanals entlang seiner Längsrichtung ab.
- Erforderliche Eingangsklemmen liegen oberhalb der ersten Smissline-Spalte. Ihr tatsächlicher Platzbedarf plus Abstand wird vor der Bahnauswahl von der nutzbaren Höhe abgezogen. Es werden passende Originalbahnen gewählt, keine gestreckten oder erfundenen gekürzten Gerätevorlagen. Reserve und Einspeiseblöcke werden weiterhin vollständig in PE gerechnet.
- Ohne Zusatzgeräte/Klemmen bleibt der direkte kompakte Smissline-Aufbau unverändert. Für Zähler- oder separate Sicherungssysteme gilt weiterhin deren eigener Montageaufbau.

Validierung: Reihenfolge links/rechts, gedrehte Geräte, Anschlussfreiraum, Reserve, Sichtbarkeit der DIN-Schienen in 2D und vertikale Kanalgeometrie in 3D getestet. Die gerasterte 125-A-Disposition wurde visuell geprüft.

## Montageabzüge unter der Smissline-Bahn

Neue ausdrückliche Werkstattvorgabe: je Ende 20 mm Eckwinkel + 25 mm Wandbefestigungswinkel. Die tragende senkrechte DIN-Schiene unter der Smissline beginnt daher 45 mm unter der Oberkante und endet 45 mm über der Unterkante; Länge = Rahmenhöhe minus 90 mm. Unter jeder Smissline-Bahn kommt ein 25-mm-Stützwinkel hinzu. Ohne weitere Einbauten beträgt die maximal verfügbare Bahnlänge damit Rahmenhöhe minus 115 mm. Der zusätzliche Platz für Einspeiseklemmen wird weiterhin abgezogen. Bei Schränken wird diese Regel auf den nutzbaren Innenrahmen angewendet, nicht nochmals auf den bereits abgezogenen Schrankkorpus.

Tragende DIN-Schienen und Stützwinkel gehören zur 2D-/3D-Struktur. Der Winkel wird als vereinfachte L-Geometrie dargestellt; Eck- und Wandbefestigungswinkel werden über die bestätigten Montageabstände berücksichtigt, ohne einen unbestätigten Detailartikel zu erfinden. Bei gestapelten Bahnen erhält jede Bahn einen eigenen Stützwinkel; der Zwischenraum bleibt mindestens 50 mm.

Diese Montageabzüge ersetzen die frühere pauschale 20-mm-Randannahme für die Smissline-Bahn. Sie zählen nicht als Geräte- oder PE-Reserve. Das Beispiel mit 76-PE-Bahn und 1410 mm Originalbahnlänge benötigt nun 1525 mm Rahmenhöhe statt 1450 mm. Grenztest: 20-PE-Bahn mit 401 mm Gesamtlänge passt ab 516 mm Rahmenhöhe; bei 515 mm bleibt die volle 20-%-Reserve unerfüllbar. Eine Reserveverkleinerung benötigt weiterhin Zustimmung.

## Senkrechte Einspeiseklemmen

Die Einspeiseklemmen oberhalb der Smissline werden ebenfalls um 90° gedreht und auf der vorhandenen senkrechten Trägerschiene ausgerichtet. Die bisherige waagrechte Zusatzschiene entfällt. Die gedrehte Originalbreite ist der neue vertikale Platzbedarf; genau dieser Wert plus Abstand geht in die Bahnauswahl ein. Die Klemmen beginnen bei 45 mm und sitzen unmittelbar auf der Trägerschiene, während die Smissline darunter auf derselben Schiene montiert bleibt. Die Abzüge von 90 mm und 25 mm sowie die PE-Reserve bleiben erhalten. Die neue 125-A-Ausgabe wurde gerastert und visuell geprüft; die gedrehte Originalgrafik und ihre Ausrichtung werden getestet.

## Standard-Unterverteilung ohne Zähler

Visuell erneut geprüft: AU-00556/S-00556 Blatt 9 (UV 2002-1) und AU-00608/S-00608 Blatt 9 (UV EG): Galip, obere Klemmen und Kanal, darunter Apparateplatten mit Gerätereihen; kein leerer unterer Zähler-/Kupferbereich. Die ebenfalls geprüfte AU-00592 enthält dagegen echte Messplätze und bleibt beim bisherigen Messaufbau.

Bei Standard mit Eingang und Hauptschalter, ohne Zähler/Reserve-Zähler oder Schmelzsicherungen, entfällt der synthetische untere Einspeiseblock. Die Eingangsklemmen kommen auf die obere Klemmenreihe, Hauptschalter und SPD in die erste Apparaterreihe. Es werden keine fiktive Sicherungszone und keine leeren Kupferreihen erzeugt. Die automatische Suche bevorzugt bei diesem Aufbau eine niedrige passende Reihenanordnung innerhalb der Breitenbegrenzung, statt zunächst die schmalste mögliche hohe Verteilung zu wählen. Reserve wird als Zuschlag auf den belegten Platz berücksichtigt.

Die konservative Erkennung eines gemeinsamen Eingangs/Hauptschalters auf derselben Schemaseite gilt nun sowohl für Smissline als auch Standard. Unbenannte Abgänge über mehrere Seiten teilen dieselbe Einspeisegruppe. Mehrere Eingänge, Zähler-/Sicherungsgruppen, explizite Quellen und benannte Gruppen werden nicht pauschal vereinigt. Hager behält Phasenreihen, mit gleicher Startposition der FI/LS auf den drei Phasen nach dem LS-Bereich. Schneider kann Geräte aus aufeinanderfolgenden Seiten zusammenhängend nebeneinander anordnen.

Nachbildung mit 18 FI/LS und 8 LS: Schneider 508 × 720 mm, Hager 758 × 720 mm, jeweils mit 20 % Reserve. Regressionen testen 63 A und 125 A, alle Gerätekennzeichen/-anzahlen, Geometrie innerhalb des Rahmens, gemeinsamen Hager-Reihenbeginn und den Wechsel Standard → Smissline → Standard einschliesslich Speichern/Laden, ohne Schemaänderung. Beide 2D-Ausgaben gerastert und visuell geprüft.


## Korrektur 18.11.2026: konventioneller Schrank nach UV1 / UV2

Referenz: der vom Benutzer bereitgestellte Auftrag, Ordner `1rJL7e3ppYYz6QNM6NLtml1BxrlKtmRnM`. Geprüft wurden die Dispositionsblätter (jeweils PDF-Seite 6 / Blatt 9) von «2026-10-15_UV 1.pdf» und «2026-10-06_UV 2.pdf» sowie acht ausgewählte Fotos aus den beiden Fotoordnern. Die privaten Pläne und Fotos werden nicht ins Repository übernommen.

- UV1: Alu-Reihenschrank 800 × 2100 × 400 mm, Korpus 2000 mm plus 100 mm Sockel, drei 250-mm-Apparatespalten. UV2: 1350 × 2100 × 400 mm, fünf Apparatespalten. Die Sonderbreite 1350 mm wird daraus nicht als AN-Kataloggrösse abgeleitet.
- Die bisherige SBR-Anordnung im vergrösserten Gehäuse wird für konventionelle Aufbauten ohne Zähler-/Mess-/Bezügersicherungsbereich ersetzt: eigener oberer Anschlussraum mit umlaufenden Verdrahtungskanälen, zwei Klemmenträgern und Galip; darunter eine eigene Hauptschalter-/SPD-Reihe und 250er-Apparateplatten. Die bisherigen phasenweisen Hager- bzw. fortlaufenden Schneider-Gruppen bleiben erhalten. Die Hauptschalterreihe blockiert keine darunterliegenden Abgangsplätze.
- Anschlussraum als Planungswert 800 mm, im Dialog «Einbaumasse / Reserve» zwischen 400 und 1000 mm einstellbar. Unabhängig von der bisherigen SBR-Zonenhöhe. Apparateplatten bleiben höchstens 400 mm hoch; die führende Schalterreihe verwendet 200 mm.
- Für diesen Aufbau gelten seitlich 20 mm Planungsabzug, damit die in UV1 belegten drei 250er-Spalten in 800 mm Aussenbreite Platz finden. Wenn die Einbaugrenzen es erlauben, wird ab 800 mm Breite gesucht; engere Grenzen bleiben mit schmaleren Varianten prüfbar. Andere Innenausbauten behalten 60 mm Seitenabzug. Das ersetzt keine herstellerspezifischen Befestigungs-/Fertigungsmasse. Die beiden 400-mm-Referenztiefen werden nicht als allgemeine Mindesttiefe für alle zählerlosen Schränke interpretiert.
- Die 2D-Front zeigt nun das vereinfachte Gehäuse mit umlaufender Zarge auch ohne Sockel. Die Apparateplatten und einzelnen Ausschnitte werden dargestellt; verdeckte DIN-/Kupfer-/Kammschienen übermalen die Plattenstege nicht mehr. Ihre vollständige Montagegeometrie bleibt in 3D erhalten. Das ist eine offene Frontansicht, keine exakte Scharnier- oder Tür-Fertigungszeichnung.
- Mit der nachgereichten Projektdatei: 37 Schemaquellen bleiben in Hager und Schneider erhalten, jeweils 800 × 2100 mm mit 100 mm Sockel, 1:10 und 20 % Geräte-Platzreserve. Smissline behält seine vorhandene Bahnaufteilung; die Unterscheidung zum SBR erfolgt durch das echte Gehäuse und seine separate Innenbestückung.

Prüfung dieser Korrektur: 373 CAD-Tests bestanden. Im Browser mit der importierten Projektdatei Hager, Schneider und Smissline ohne Sockel verglichen; Schneider-Variante übernommen und nach Neuladen mit 800 × 2100 × 300 mm und 1:10 wieder geöffnet. Anschlussraum-Einstellung und die ausgeblendeten, hier nicht wirksamen SBR-Zonen-/Plattenregler kontrolliert.

## Ergänzung 18.11.2026: Konfiguration, Individualschränke und Beschriftung

Die ausdrückliche neue Benutzervorgabe erweitert die bisherige Katalogbeschränkung: **AN-Standard** und **Individualschrank** werden getrennt angeboten. Individualmasse sind Planungsvarianten, keine automatisch als Katalogartikel ausgewiesenen Produkte. Die frühere Aussage «Sondergehäuse nicht enthalten» gilt damit nicht mehr.

Die öffentliche AN-Oberfläche wurde erneut bedient: Felder 1–10, RAL-Auswahl, Rückwand roh/Schrankfarbe/keine, Seitenwände Standard/flach/keine, Stahl-/Aluminiumsockel, Dach-/Bodenbleche samt Füllung, Montageplatte, Türflügel, Bandung, 112°-/180°-Scharniere, Schliessung/Einsatz, Schematasche, IP54-Anforderung, dritte Gleiterebene und Zubehör. Ein Stahlsockel hat dort 100 mm, Aluminium bietet 50/80/100/200 mm. Die Tablar-Bearbeitung konnte im externen 3D-Bereich nicht visuell nachvollzogen werden; im CAD werden Tablare daher über ihre Höhenposition konfiguriert und auf Kollisionen geprüft. Keine Bestellung wurde ausgelöst.

**Korrektur der AN-Breite:** Die Breitenliste beschreibt Korpus-Feldbreiten. Bei 1000 mm und zwei Standardseitenwänden zeigt Almatec 1050 mm Gesamtbreite; flach + Standard ergibt 1030 mm, keine + Standard 1025 mm. Es werden somit 25 mm je Standard- bzw. 5 mm je flacher äusserer Seitenwand addiert. Bei mehreren Feldern zählen die beiden äusseren Seitenabschlüsse. Die Standardhöhe bleibt 2000 mm Korpus zuzüglich Sockel; die bisherigen Tiefenwerte bleiben bestehen. Bestehende Zeichnungselemente werden beim Laden nicht geometrisch verändert; Neuberechnung benutzt die korrigierte Katalogauswahl.

Individualschränke erlauben feste Aussenmasse oder eine automatische Suche. Die automatische Suche prüft die vollständige Bestückung mit unveränderter Reserve, Körperhöhe inklusive Sockel, Gesamtbreite, Feldbreite für den Durchgang und Tiefe. Sie bevorzugt niedrige passende Aufbauten; die 250-mm-Innenrastergrenzen begrenzen unnötige Suchläufe. Bei automatisch berechneten konventionellen Individualschränken kann der Anschlussraum bis auf 400 mm verkürzt werden. Diese Regel wird im Dialog angezeigt; bei festen Massen bleibt die eingegebene Höhe des Anschlussraums massgebend. Berechnete und gewünschte Anschlussraumhöhe werden getrennt gespeichert, damit der Wechsel zurück zu Standard den bevorzugten Wert erhält. Die vorhandenen Montageabzüge und Gerätehüllmasse bleiben Planungswerte.

Der Konfigurationsdialog öffnet vor Erzeugen und Vergleichen eines Standschranks; jede Schrankvariante kann zusätzlich direkt im Vergleich konfiguriert und neu berechnet werden. Abbrechen lässt die gespeicherte Dispo unverändert. Feldoptionen können separat oder gemeinsam gewählt werden. «Aufbau prüfen» zeigt den tatsächlich berechneten Entwurf. Der Blattmassstab wird nicht geändert.

Die Sockel sind in 2D/SVG/PDF und 3D schwarz. 3D verwendet schwenkbare Türblätter mit dem gewählten Anschlag, ein- oder zweiflüglig; alle Felder oder ein einzelnes Feld lassen sich öffnen, schliessen bzw. bis zum gewählten Scharnierwinkel einstellen. Griff und Schemafach bewegen sich mit dem Blatt. Die Stellung ist ein Ansichtsparameter und verändert die gespeicherte Ausstattung nicht. Rückwand, Seitenwände, Montageplatte, Tablare, Farbe und Boden werden als vereinfachte Planungsgeometrie dargestellt; Profilierungen, Schlösser, Dichtungen, Dachfüllungen und Zubehör sind keine detailgetreuen Hersteller-Fertigungsmodelle. Die IP54-Auswahl ist eine angeforderte Gehäuseausführung, kein Nachweis der gesamten Anlage.

Die Beschreibung orientiert sich am Textaufbau der vom Benutzer gelieferten UV1-/UV2-Dispositionen, PDF-Seite 6 / Blatt 9: Bauart, B/H/T, Bandung/Doppeltüren, Schloss, Schemafach, obere/untere Einführung, Farbe, Seitenwände und schwarzer Sockel. Sie enthält ausschliesslich abgeleitete Konstruktionsangaben. Prüf-, Liefer- und Vertragsaussagen aus den Referenzaufträgen werden nicht als bereits erbrachte Leistungen übernommen. SBR wird als Selbstbaurahmen mit seinen eigenen Massen und seiner Rückwandausführung beschrieben. Der automatisch erzeugte Textblock ist verschiebbar, bearbeitbar und Bestandteil des SVG-/PDF-Exports. Der Aufbau wird bei Bedarf gemeinsam seitlich verschoben, damit der Text rechts Platz findet; bei übergrossen Anordnungen wird auf einen Text ausserhalb des Zeichenbereichs hingewiesen.

Validierung: 382 CAD-Tests bestanden, darunter Originalgeräte/Reserve, niedrigere individuelle Hager-/Schneider-/Smissline-Aufbauten, feste freie Masse, Katalog-/Seitenwandabgrenzung, Speichern/Laden, Beschreibung, schwarzer Sockel und identische Türtransformation in WebGL und Softwaredarstellung. Browserprüfung mit der importierten Smissline-Projektdatei: 800 × 2100 × 300 mm Standard und 800 × 1300 × 220 mm Individual bei 1:10; Linksanschlag, 180°-Scharnier und Schemafach gespeichert; geschlossene Tür verdeckt den Innenausbau. Die zusätzliche, unveränderte Wärme-Assetprüfung scheitert bereits auf dem Basisstand an dessen älterer Service-Worker-Versionszuordnung und ist nicht Teil dieser CAD-Änderung.
