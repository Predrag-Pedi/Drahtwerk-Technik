# Firmenportal: Test und Serverbetrieb

Diese Erweiterung ergänzt die vorhandenen Werkzeuge um eine echte Anmeldung und eine gemeinsame, nach Betrieben getrennte SQLite-Datenbank. Der Code bleibt in GitHub. Passwörter, Sitzungen, Logos, Projekte und die Datenbank gehören **nicht** ins Repository.

## Erster Test

Node.js 24 wird benötigt; es gibt keine zusätzlich zu installierenden npm-Pakete. Im Projektordner:

```sh
npm run admin:init
npm start
```

Das erste Kommando legt interaktiv dein persönliches Entwicklerkonto an. Es gibt kein voreingestelltes Passwort. Öffne danach `http://127.0.0.1:4173`. Die öffentliche SchaltBase-Startseite zeigt automatisch laufende, stumme Produktbeispiele für Schema mit Makros, eigenständige Dispo, Schema → Dispo und Offerten. Weitere Beispiele zeigen Schienenrechner, EW-Unterlagen, Aufbauabstände, Drahtfarben, technische Tabellen und Wärmeberechnung. Es sind animierte Beispieloberflächen mit Zeichnungen aus dem CAD-Werkzeug, keine Bildschirmaufnahmen. Die CAD-Bilder lassen sich mit `node tools/build-home-demos.mjs` aus öffentlichen Beispieldaten neu erzeugen. Die Demos verwenden keine Kundendaten oder Schreibzugriffe. Sie pausieren ausserhalb des sichtbaren Bereichs und in ausgeblendeten Tabs; bei reduzierter Bewegung ist Autoplay ausgeschaltet. Globale und einzelne Pausentasten sowie eine Schritt-/Zeitleistensteuerung bleiben verfügbar. Die vier Hauptanwendungen werden automatisch nacheinander gezeigt, bis eine manuell gewählt wird. App-Name und Icon sind unabhängig von den Firmenangaben auf Dokumenten. Oben über «Anmelden» anmelden; danach öffnet sich das bekannte Werkzeug-Dashboard. Das Entwicklerkonto hat einen eigenen, getrennten Arbeitsbereich mit Vollzugriff. Unter «Lizenzen & Berechtigungen» einen Betrieb samt Paket, Laufzeit und Benutzerplätzen anlegen, dann «Betrieb öffnen → Benutzer anlegen» verwenden. Beim Anlegen und Zurücksetzen eines Benutzers wählt der Plattformbetreiber zwischen «Selbst festlegen» (Startpasswort mit 8–256 Zeichen) und «Zufällig erzeugen» (43 Zeichen). Das Startpasswort wird einmal angezeigt und kann kopiert werden. Beim ersten Login muss der Benutzer es durch ein eigenes Passwort mit 12–256 Zeichen ersetzen; bis dahin bleiben Dashboard, Werkzeuge und Firmen-APIs gesperrt. Nach der Änderung meldet er sich mit dem neuen Passwort erneut an. Nur der Plattformbetreiber legt Benutzer an oder setzt Startpasswörter zurück.

Alternativ in GitHub unter **Code → Codespaces → Create codespace** öffnen. Die beiliegende Devcontainer-Konfiguration stellt Node 24 und Port 4173 bereit. Der Server startet dort automatisch. Nur einmal `npm run admin:init` ausführen und dann den weitergeleiteten Port öffnen. Die gemeinsame Nutzung mit Mitarbeitern ist in [GITHUB-TESTPHASE.md](GITHUB-TESTPHASE.md) beschrieben. Die öffentliche HTTPS-Adresse wird aus den Codespaces-Umgebungsvariablen ermittelt. Den Port für den eigenen Test **privat** lassen. Ein Codespace ist eine Testumgebung, kein dauerhafter Kundenserver. Vor dem Löschen eine Datenbanksicherung herunterladen.

GitHub Pages kann weiterhin die bisherige lokale Einzelplatzversion anzeigen. Ein Merge aktiviert dort **kein** Login und keine Datenbank. `login.html` weist auf die fehlende Servereinrichtung hin. GitHub Pages unterstützt kein Node-Backend und ist nicht als Hosting für kommerzielles SaaS vorgesehen. Für den Kundenbetrieb wird die gesamte Anwendung über den Backend-Server ausgeliefert.

## Rollen, Pakete und Daten

| Rolle | Rechte |
| --- | --- |
| Entwickler | Betriebe, Benutzer, Pakete, Laufzeiten und Änderungen verwalten; eigener Arbeitsbereich mit allen Werkzeugen; Firmenwerkzeuge nur nach ausdrücklicher Supportfreigabe öffnen |
| Firmenadministrator | Logo/Adresse und Werkzeugrechte der eigenen Mitarbeitenden verwalten; Administratorrollen bestimmt der Entwickler |
| Mitarbeiter | Werkzeuge gemäss Paket und persönlicher Freigabe verwenden |

Das Kontomenü unten links zeigt Name und Betrieb beziehungsweise «Entwickler». Firmenadministratoren öffnen dort Firmeneinstellungen und Mitarbeitende. Benutzer melden sich wahlweise mit einem vom Betreiber vergebenen Benutzernamen (3–64 Zeichen, Buchstaben/Ziffern/Punkt/Unterstrich/Bindestrich) oder einer E-Mail-Adresse an. Anmeldenamen werden ohne Beachtung der Gross-/Kleinschreibung eindeutig geprüft. Eine E-Mail ist bei Benutzername-Anmeldung nicht erforderlich. Aus einer E-Mail-Adresse allein werden niemals Entwicklerrechte abgeleitet. Aus Kompatibilitätsgründen speichert die bisherige SQLite-Spalte `users.email` den normalisierten Anmeldenamen; die API gibt `login`, `username` und gegebenenfalls `email` getrennt aus.

Pro Werkzeug sind **kein Zugriff**, **Lesen** oder **Lesen und bearbeiten** möglich. Lesen verhindert das Speichern und Löschen am Server; die bestehenden Zeichenoberflächen können weiterhin lokale Änderungen und Exporte erlauben. Lizenz und Rechte werden bei jedem Serverzugriff geprüft. Werkstattwerkzeuge sind einzeln freigebbar; die drei technischen Tabellen teilen eine Seite, deren Navigation nur freigegebene Tabellen anzeigt. Die Seite wird serverseitig nur bei mindestens einer Tabellenfreigabe ausgeliefert. Diese fachlichen Referenztabellen sind keine getrennten vertraulichen Datensätze. Ältere pauschale Werkstattrechte bleiben kompatibel. Abgelaufene/gesperrte Betriebe können ihre Projekte nicht öffnen; die Daten werden nicht gelöscht. Firmenadministratoren können weiterhin ihre Stammdaten und Benutzer sehen. Der Entwickler behält die Verwaltungsrechte für Benutzer und Lizenzverlängerungen. Werkzeugdaten benötigen eine gültige Supportfreigabe; gesperrte oder abgelaufene Betriebe können keine neue Freigabe erteilen.

Als anpassbare Vorgaben bestehen Basis (Werkstatt/EW und Regierapporte), Planung (zusätzlich Schema/Dispo) und Komplett (zusätzlich Offerten/Wärmeberechnung). Die Laufzeit gilt einschliesslich Enddatum in Schweizer Zeit. Benutzerplätze zählen aktive Firmenbenutzer. Unter «Alle Benutzer» oder im geöffneten Betrieb kann der Entwickler «Benutzer entfernen» wählen. Nach der Bestätigung endet der Zugang samt aller Sitzungen sofort und der Platz ist wieder frei. Offerten, Projekte, Vorlagen und Uploads bleiben beim Betrieb. Entfernte Konten verschwinden aus den Listen; der Anmeldename kann für ein neues Konto wiederverwendet werden. Entwicklerkonten und der letzte aktive Firmenadministrator sind geschützt. Ein anderer Firmenadministrator muss zuerst festgelegt werden. Deaktivieren bleibt als reversible Alternative verfügbar und gibt ebenfalls einen Platz frei. Preise, Bestellstrecke, Zahlungen und automatische Verlängerungen sind noch nicht angebunden; Pakete und Laufzeiten werden manuell verwaltet.

CAD-Projekte, Offerten, eigene Artikel, Regierapporte und Wärmeprojekte/Vorlagen werden im Serverbetrieb je Betrieb gespeichert. Versionsprüfungen verhindern stilles Überschreiben gleichzeitiger Änderungen. Die Offertenliste wird aktuell als gemeinsamer Datensatz gespeichert: Bei gleichzeitiger Bearbeitung erscheint ein Konflikt statt eines Datenverlusts. Pro Betrieb gelten vorerst 500 MB, pro Anfrage 64 MB. Die Entwicklungsversion verwendet eine einzelne Node-Instanz mit SQLite.

Bestehende Browserprojekte werden nicht automatisch einem neuen Betrieb zugeordnet. Vorhandene Export-/Importfunktionen können zur bewussten Übernahme verwendet werden. Im Serverbetrieb gibt es keinen automatischen Rückfall auf den alten lokalen Projektspeicher. Browsercache und Offline-Serviceworker werden für diese Betriebsart deaktiviert.

Firmendaten gelten für alle Benutzer des Betriebs. Neue Betriebe starten ohne Logo und Absender. Schema-/Dispositionsrahmen und Offerten übernehmen die hinterlegten Daten; leere Felder bleiben leer. Importierte freie Texte und eigene Excel-/PDF-Vorlagen werden nicht pauschal umgeschrieben. Für kundenspezifische Wärmeberechnungsformulare die passende eigene Excel-Vorlage hinterlegen. Interne Importkennungen und ursprüngliche Quelldaten bleiben aus Kompatibilitätsgründen bestehen; sie sind kein sichtbarer Herstelleraufdruck.

## Supportzugriff auf einen Betrieb

«Betrieb öffnen» öffnet die Verwaltung und gibt keinen Zugriff auf die Werkzeugdaten. Oben kann der Entwickler «Supportzugriff anfordern» wählen und eine angemeldete Person des Betriebs auswählen. Sie erhält ein Live-Popup und kann den zeitlich begrenzten Zugriff auf alle Werkzeuge ausdrücklich bewilligen oder ablehnen. Auch ein ausgewählter Mitarbeiter mit eingeschränkten Rechten kann die ganze Firmenplattform für den Support freigeben; seine eigenen Rechte bleiben unverändert. Nach Zustimmung öffnet der Entwickler die Firmenplattform. Ein sichtbarer Hinweis zeigt den aktiven Zugriff und erlaubt dessen Beendigung bzw. Widerruf. Details zu Umfang, Laufzeit, Protokollierung und Prüfung stehen in [Supportfreigabe](qa/support-access-2026-11-24.md).

## Werkstattvorlagen pro Firma

Unter dem Kontomenü → **Werkstattvorlagen** stehen Schienenregeln, Drahtfarben, EW-Unterlagen und Aufbauabstände zur Verfügung. Jeder Benutzer mit dem Schreibrecht für das jeweilige Werkzeug kann dessen Firmenvorlage bearbeiten, speichern und zurücksetzen – auch mit der Rolle Mitarbeiter. Für EW und Aufbauabstände umfasst dies die Verwaltung eigener Dateien. Leserechte erlauben das Verwenden der gemeinsamen Vorgaben, aber keine Änderungen. Benutzerverwaltung und Firmendaten bleiben den dafür zuständigen Rollen vorbehalten.

- **Schienenregeln:** Pro Verteilungstiefe eine eigene Liste mit Bezeichnung, Reihenfolge, Bezugsmasse (Breite/Höhe/Tiefe) und Abzug in mm. Der bisherige Standard und bestehende Firmenlisten gelten ausschliesslich für **165 mm**. Unter «Weitere Tiefe» z. B. **110 mm** eingeben und «Tiefe hinzufügen» wählen; optional die aktuell ausgewählte Liste als Ausgangspunkt kopieren. Die Schienen bearbeiten und **Firmenvorlage speichern**. Alle berechtigten Mitarbeitenden erhalten diese Tiefenlisten beim nächsten Öffnen/Neuladen. Der Rechner zeigt nur die Liste zur exakt eingegebenen Tiefe. Ohne passende Vorlage bleiben Berechnung, Druck und CSV gesperrt, statt unpassende Standardabzüge anzuwenden. Stückzahlen bleiben pro Tiefenliste persönlich im Browser, getrennt nach Betrieb und Benutzer. Die Rahmenmasse sind ebenfalls persönliche Eingaben. Bestehende persönliche Stückzahlen werden nur der bisherigen 165-mm-Liste zugeordnet. Maximal 50 Tiefen (1–2000 mm) und 100 Schienen pro Tiefe. Mindestens eine Tiefe mit einer Schiene bleibt erforderlich. Es findet keine automatische Übernahme fremder alter Browserdaten statt.
- **Drahtfarben:** Kategorien, Anwendungen, Querschnitte/Kabel, Leiter und Farbbezeichnungen bearbeiten.
- **EW-Unterlagen:** Ordner, Hinweise und PDF-Zuordnungen verwalten; eigene PDFs ergänzen.
- **Aufbauabstände:** Kategorien und Hinweise verwalten; eigene PNG-, JPEG- oder WebP-Zeichnungen ergänzen. Die Abstände werden in dieser Version weiterhin als Zeichnungen angezeigt, nicht als parametrischer Aufbaueditor.

Neue Betriebe verwenden den gemeinsamen Standard aus den bisherigen Vorgaben. Erst «Firmenvorlage speichern» legt eine eigene Kopie des betreffenden Bereichs an. Eine gespeicherte Firmenvorlage bleibt unabhängig von späteren Standardänderungen. «Auf Standard zurücksetzen» aktiviert wieder den jeweils aktuellen Standard. Die anderen Bereiche und Firmen werden dadurch nicht verändert. Geöffnete Werkzeuge müssen neu geladen werden, um Änderungen zu übernehmen. Gleichzeitige Änderungen werden durch Versionsprüfungen geschützt; bei einem Konflikt bleiben die Eingaben im Editor erhalten.

Uploads werden sofort im Betriebsspeicher abgelegt; die Zuordnung zu einem Ordner wird mit der Vorlage gespeichert. Unter «Eigene Dateien verwalten» lassen sich bereits hochgeladene Dateien wiederverwenden oder nach dem Entfernen aller gespeicherten Verweise löschen. Ein Zurücksetzen der Vorlage löscht keine Uploads. Maximal 10 MB pro Datei und 250 eigene Dateien pro Werkzeug. Die vorläufige Grenze von 500 MB pro Betrieb umfasst Projekte, Vorlagen und Werkstattdateien gemeinsam; sie ist ein App-Limit und keine Aussage zum Speicherangebot eines Hosters.

Die Tabellen `workshop_templates` und `workshop_files` werden beim Serverstart ergänzend angelegt (Datenbankschema 2). Eigene Dateien sind als BLOBs in SQLite gespeichert und werden durch `npm run db:backup` mitgesichert. Dateizugriffe prüfen Betrieb, Benutzer, Werkzeugrecht und Lizenz. Dateilinks sind an den aktuellen Benutzer gebunden; Mitarbeitende öffnen die Unterlagen über ihr Werkzeug. Die Standarddateien bleiben im Repository, firmenspezifische Dateien und Vorlagen ausschliesslich in der privaten Datenbank. Auf GitHub Pages ohne Backend bleiben die Standardwerkzeuge verfügbar, ohne Firmenbearbeitung.

## Aktualisierung der Benutzerverwaltung

Die Migration auf Schema 3 ergänzt `users.deleted_at`. Bestehende Konten und Daten bleiben erhalten; `admin:init` muss nicht erneut ausgeführt werden. Vor dem Update eine Datenbanksicherung erstellen. Beim Entfernen eines Kontos werden Anmeldename, Name, Passwort-Hash und Berechtigungen verworfen. Nur eine deaktivierte Referenz mit interner ID, Betrieb und Zeitangaben bleibt erhalten, damit Fremdschlüssel für Projekte, Vorlagen und Uploads gültig bleiben. Diese Referenz kann weder angemeldet noch über die API reaktiviert werden. Die Entfernung wird ohne Passwort im Änderungsprotokoll festgehalten.

## Später auf einen Server umziehen

Repository auschecken, Node 24 installieren, einen privaten beschreibbaren Datenordner anlegen und einen HTTPS-Reverse-Proxy vorschalten. Beispielwerte:

```sh
export NODE_ENV=production
export HOST=127.0.0.1
export PORT=4173
export APP_ORIGIN=https://portal.example.ch
export DATABASE_PATH=/srv/firmenportal-data/platform.sqlite
npm start
```

Die Umgebungsvariablen in der Prozessverwaltung des Servers hinterlegen; eine `.env` wird nicht automatisch eingelesen. Der spätere eigene Proxy muss den öffentlichen `Host` unverändert weitergeben, mindestens 64 MB Request-Grösse erlauben und HTTPS terminieren. Node bleibt auf Loopback. `APP_ORIGIN` enthält nur Schema und Host, ohne abschliessenden Schrägstrich. Nur in einem anhand der GitHub-Umgebung erkannten Codespace wird zusätzlich dessen Loopback-Tunnel akzeptiert: interner Host mit passendem Port, exakt passender `X-Forwarded-Host` und `X-Forwarded-Proto: https`. Fremde Hosts, Proxyketten und entfernte Clients werden abgewiesen. Mit einer Prozessverwaltung starten; keine SQLite-Datei über mehrere Serverinstanzen oder ein Netzwerk-Dateisystem teilen. Bei späterem horizontalem Ausbau kann die Datenzugriffsschicht auf PostgreSQL umgestellt werden.

Sicherungen nutzen die SQLite-Backup-API und funktionieren auch während des Betriebs:

```sh
npm run db:backup
# oder einen privaten Zielpfad ausserhalb des Repositories angeben:
npm run db:backup -- /srv/backup/portal-2026-11-19.sqlite
```

Die erzeugte Sicherung geschützt aufbewahren: Sie enthält Kundendaten und Passwort-Hashes. Zum Umzug den Zielserver stoppen, die Sicherung als `DATABASE_PATH` einsetzen (Rechte 0600), bestehende Sitzungen löschen und den Server starten. Keine unvollständige Kopie einer laufenden WAL-Datenbank verwenden. Wiederherstellung und regelmässige Sicherungen vor echtem Kundenbetrieb einrichten.

Passwörter werden mit scrypt gespeichert; Sitzungen verwenden HttpOnly-/SameSite-Cookies und bei HTTPS das Secure-Attribut. Schreibzugriffe prüfen Origin und CSRF, die Datenzugriffe den Betrieb und das aktuelle Benutzerkonto. Ein Startpasswortwechsel ist Pflicht. Kein öffentliches Registrieren und kein automatischer E-Mail-Versand. Zwei-Faktor-Anmeldung, E-Mail-Wiederherstellung und Zahlungsanbieter sind noch nicht Bestandteil dieser Testversion. Vor bezahltem Produktivbetrieb sind ein Sicherheitsreview und der konkrete Hosting-/Backupbetrieb erforderlich.

## Prüfungen und Quellen

`npm test` führt bestehende Werkzeugtests sowie neue Tests für Mandantentrennung, Lizenz-/Rollenprüfung, Sitzungen, Versionskonflikte, Firmenbranding und binäre Excel-Daten aus.

- [GitHub Pages: Limits und SaaS](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [Codespaces: Umgebungsvariablen](https://docs.github.com/en/codespaces/developing-in-a-codespace/default-environment-variables-for-your-codespace)
- [Codespaces: Portfreigaben](https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace)
- [Node 24: SQLite-Backup](https://nodejs.org/docs/latest-v24.x/api/sqlite.html#sqlitebackupsourceDb-path-options)

## Regierapporte und Update auf Schema 4

Unter **Büro → Regierapporte** werden Kunde/Adresse, Kontaktperson, Einsatzort, Auftrag, Datum, Mitarbeiter, Tätigkeiten mit Stunden, Material mit Artikelnummer/Menge/Einheit, Kilometer, Fahrzeit, Spesen und offene Arbeiten erfasst. Entwürfe lassen sich gemeinsam bearbeiten und entfernen. Jeder Rapport ist ein eigener Datensatz; parallele Änderungen werden über Revisionen abgefangen.

Die neue Berechtigung **Regierapporte** wird separat vergeben. **Lesen** erlaubt Öffnen und Drucken/PDF; **Lesen und bearbeiten** erlaubt Entwürfe, Kundenunterschriften, Kopien und den Abrechnungsstatus. Die Daten bleiben in der bestehenden privaten SQLite-Datenbank je Firma, einschliesslich der Unterschrift. Sie sind Bestandteil der vorhandenen Datenbanksicherung.

Der Kunde zeichnet mit Finger, Stift oder Maus. Nach dem Speichern bleiben Inhalt, Unterschrift, Firmenkopf und der vom Server gesetzte Zeitpunkt erhalten. Unterschriebene Rapporte können nicht überschrieben oder gelöscht werden; der Status darf zwischen «Unterschrieben» und «Abgerechnet» wechseln. Für Korrekturen wird eine neue, nicht unterschriebene Kopie angelegt. Die erfasste Bildschirmunterschrift ist eine Kundenbestätigung; es wird keine qualifizierte elektronische Signatur behauptet. «Drucken / PDF» verwendet den Druckdialog des Browsers; dort «Als PDF speichern» wählen.

Beim ersten Start nach dem Update ergänzt Schema 4 das Modul `reports` einmalig in den Standardpaketen `basis`, `planung`, `komplett`. Individuelle Pakete bleiben unverändert. Bestehende Benutzer erhalten **keine automatischen Rapportrechte**; diese muss der Entwickler oder Firmenadministrator vergeben. Individuelle Pakete können vom Entwickler um Regierapporte erweitert werden. Die Datenbank wird nicht neu angelegt, `admin:init` ist nicht nötig.

## Öffentliche Produktseiten und Arbeitsplatz

Die Homepage hat ein Menü «Werkzeuge» mit zwölf öffentlich erreichbaren Detailseiten unter `/produkte/`. Schema und Disposition werden getrennt vorgestellt; die gemeinsame Anwendung bleibt unter `cad.html`. Jede Seite enthält Funktionen, einen schrittweisen Ablauf und eine pausierbare Beispielvorführung. Die Vorführungen sind illustrative Beispiele; technische Referenzwerte werden dadurch nicht ergänzt oder verändert.

Das Dashboard bietet eine Werkzeugsuche und zeigt nur freigegebene Werkzeuge. Leere Gruppen werden sowohl dort als auch in der Seitenleiste ausgeblendet. Die aktualisierten Oberflächen gestalten die Navigation, Karten und Eingabeflächen neu; CAD-Zeichenflächen und fachliche Berechnungen bleiben unverändert.

Die statischen Detailseiten können mit `node tools/build-product-pages.mjs`, das Dashboard mit `node tools/build-dashboard.mjs` aus dem Repository-Hauptverzeichnis neu erzeugt werden.
