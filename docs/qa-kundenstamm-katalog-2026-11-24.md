# Kundenstamm, Katalogimport und Kontoverwaltung

Stand: 24. November 2026. Grundlage: `7cb7b97` (Hager Uniway).

## Verhalten

- `kunden.html` verwaltet Firmen und mehrere Kontaktpersonen mit abweichender Adresse, E-Mail, Telefon und Mobiltelefon. Archivierte Kunden bleiben gespeichert, werden aber nicht mehr vorgeschlagen.
- Kundendaten liegen in den bereits mandantengetrennten Server-Datensätzen. Lesen und Bearbeiten sind getrennte Rechte. Bei bestehenden Berechtigungen ohne eigenen Kundenstamm-Eintrag wird der Zugriff aus den freigeschalteten Bürowerkzeugen abgeleitet; ein ausdrücklich gesetztes «Kein Zugriff» bleibt wirksam.
- Offerten, Regierapporte, Wärmeberechnung und Schema & Dispo bieten Kunden- und Kontaktvorschläge. Die Auswahl kopiert die Daten ins Dokument. Spätere Adressänderungen verändern bestehende Dokumente nicht. Objektadresse, Einsatzort und Projektleiter bleiben separate Angaben.
- Der importierte Offertenkatalog wird in kleinen Anfragen übertragen. Erst ein vollständiger Import ersetzt den bisherigen Katalog innerhalb einer Datenbanktransaktion. Eigene Artikel bleiben im bisherigen separaten Bestand. Bestehende Kataloge werden weiterhin gelesen, bis sie ersetzt werden.
- Grenzen: 500 000 Artikel, bis zu 1 MiB je Client-Teil und 1 000 Artikel je Teil; serverseitig 2 MiB je Anfrage. Die bestehende Speichergrenze von 500 MiB pro Betrieb bleibt erhalten. Zwei unvollständige Importe pro Betrieb sind möglich; nach zwei Stunden werden abgelaufene, nicht aktive Uploads bei der nächsten Kataloganfrage entfernt.
- Gleichzeitige Importe prüfen die Revision; eine veraltete Bearbeitung überschreibt keinen neueren Katalog. Bereits aktive Katalogteile sind nur über den passenden Betrieb lesbar.
- Die Kontoverwaltung zeigt aktive Lizenzplätze, alle Konten und deaktivierte Konten getrennt. Aktivieren/Deaktivieren ist eine eigene Aktion. Rechteänderungen ohne Statusangabe behalten den Status bei. Das letzte aktive Firmenadministratorkonto bleibt geschützt; eine Reaktivierung prüft freie Plätze.
- Schema & Dispo hat ein Navigationssymbol. Der Entwicklerzugang bleibt in den Werkzeugen und im geöffneten CAD-Editor erreichbar.
- Öffentliche Start- und Produktseiten erhalten kanonische URLs und Indexierungsmetadaten. `/sitemap.xml` enthält nur öffentliche Seiten; `/robots.txt` verweist darauf. Private Seiten und APIs haben `noindex` und behalten ihre Zugriffskontrollen.

## Prüfung

- `npm test`: **721 Tests erfolgreich**, keine Fehler oder übersprungenen Tests.
- Neuer Integrationstest importiert **159 341 synthetische Artikel mit insgesamt mehr als 64 MiB**, liest sie wieder und prüft die Speicherabrechnung. Er testet ausserdem Abbruch/Unvollständigkeit, konkurrierende Importe, alte Kataloge, fremde Mandanten, Leserechte und den tatsächlichen Browser-Transport.
- Kunden-CRUD: Mandantentrennung, Schreibschutz, Versionskonflikte, Kontaktvalidierung, geschützte Seite und stabile Dokumentkopien.
- Konto-Tests: Status bleibt bei Rechteänderungen erhalten; Deaktivierung verhindert Anmeldung; Reaktivierung ermöglicht Anmeldung mit demselben Passwort. Fremde Betriebe und letzter Administrator sind geschützt.
- SEO-Tests: Sitemap, kanonische URLs, öffentliche Indexierung und private `noindex`-Antworten.
- Manuelle Browserprüfung mit ausschliesslich synthetischen Daten: Firma und Kontakt anlegen/speichern, Auswahl in allen vier Werkzeugen, gespeicherte Angaben in CAD und Wärmeberechnung erneut öffnen, Kundenstamm mit Leserechten, Navigation im CAD-Editor, Rechteformular und Benutzerzahlen. Kundenansicht bei 390 und 1 024 px geprüft.
- Keine Prüfung auf einem physischen iPad/Safari. Die konkrete VSAS-Datei wurde nicht bereitgestellt; der grosse Import wurde mit Testdaten geprüft. Produktivdaten und produktive Konten wurden nicht geändert.

## Bereitstellung und Betrieb

Nach dem Merge den bisherigen Infomaniak-Checkout aktualisieren und die Node.js-Anwendung neu starten. Die neuen SQLite-Tabellen werden beim Start ergänzend angelegt; vorhandene Datensätze bleiben erhalten. Der Benutzer muss einen zuvor fehlgeschlagenen Katalogimport erneut ausführen. Die Datenbank kann weiterhin vollständig mit dem bestehenden Backup-Befehl gesichert werden.

Der Screenshot zeigt Alen Tapalaga (`alen.tapalaga`) als deaktiviert: vier Konten, davon drei aktive Lizenzplätze. Nach der Bereitstellung kann ein berechtigter Administrator ihn unter Mitarbeitende gezielt aktivieren. Die Änderung aktiviert keine Konten automatisch und setzt keine Passwörter zurück.

Die technische Katalogablage erteilt keine VSAS-Nutzungsrechte. Die öffentlich zugänglichen VSAS-Vertragsinformationen enthalten keine allgemeine Erlaubnis, den Bestand an andere Firmen weiterzugeben. Jede Firma soll ihren eigenen berechtigten Bestand verwenden; eine kommerzielle SaaS-/Cloud-Nutzung und mögliche Weitergabe vorab schriftlich mit VSAS klären: https://www.vsas.ch/datenbank/

Die Google Search Console wurde nicht eingerichtet oder bedient. Nach Bereitstellung kann der verifizierte Domaininhaber `https://schaltbase.ch/sitemap.xml` dort einreichen. Crawling und Aufnahme in die Suche bleiben Entscheidungen von Google: https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl
