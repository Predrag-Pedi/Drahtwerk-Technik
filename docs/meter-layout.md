# Disposition: Zähler und Messmodule

Referenzvergleich vom 14.11.2026:

- **2026-08-14 HV Forchstrasse 195, Zürich**, Dispo Blatt 9: untere Zählerreihe beginnt mit RSE, ZFA, Allgemein; weitere Zähler stehen rechts und darüber. Geräteplatten nutzen freie Bereiche neben der oberen Zählerreihe.
- **2026-10-31 HV Sihlhallenstrasse 5/7**, Blatt 2: RSE und Allgemein unten links; ZFA und E-Mobility darüber. Denner-Wandlerzähler steht unmittelbar über seinem Messmodul. Normale Zähler und Geräteplatten dürfen auf denselben Höhen nebeneinander stehen. Blatt 3 zeigt drei Zählerreihen.
- **2026-08-26 E-Mob. Forchstrasse, Uster**, Dispo Blatt 9: kompakter Aufbau mit Wandlern, Prüfklemmen und Spannungssicherung. Die Anordnung dieses Sonderaufbaus ist keine allgemeine Reihenfolgevorgabe.

## Werkstattstandard im Programm

1. Vorhandenen RSE zuerst, danach Allgemein, danach übrige Zähler in stabiler Schema-Reihenfolge anordnen. Ohne RSE wird kein Platz dafür erfunden. Die erste normale Zählerposition liegt unten links. Danach wird dieselbe Spalte von unten nach oben gefüllt, anschliessend die nächste Spalte und das nächste Feld. Reserveplätze folgen am Ende.
2. Höchstens drei Zählerreihen innerhalb der vorgegebenen Rahmenhöhe. Nur der Wandlerzähler und sein darunterliegendes 250 × 400 mm Messmodul werden gemeinsam reserviert und bewegt. Freie Zellen rechts nach den Zählern/Messmodulen bleiben Geräteplatten. Lücken davor erhalten eine Abdeckung und werden nicht mit Geräten gefüllt.
3. Prüfklemmen oben, drei originale kleine Stromwandler waagerecht nebeneinander in der Mitte, AP-Spannungssicherung unten. Die kleine Originalvorlage bleibt ungedreht und im ursprünglichen Massstab. Die rechts stehende BMK-Beschriftung wird über den Körper versetzt; jedes Exemplar benötigt damit rund 80 × 43,7 mm.
4. Innerhalb einer Einspeisegruppe zuerst die kleinen LS/FI-LS-Bänke, dann die mehrpoligen Geräte. Vierpolige Geräte behalten eigene Kammschienenreihen. Hager-Phasenzuordnung und die 54-mm-Reserve zwischen LS und zweipoligen FI-LS bleiben erhalten. Die Referenzen zeigen keine allgemeingültige Pflicht, vierpolige Geräte stets zuerst zu setzen.
5. Zwei zu einer Spalte gehörende Bezügersicherungen treffen sich weiterhin an der Spaltenmitte (unterer Zähler links, oberer rechts). Drei werden als zusammenhängende Bank um diese Mitte angeordnet. Tatsächlich zu breite Kombinationen werden weiterhin als Platzkonflikt gemeldet.

Das ist ein abgeleiteter Drahtwerk-Planungsstandard, **keine Prüfung von EW-Vorschriften**. Abweichende EW-Anordnungen müssen anhand des konkreten Werks geprüft werden; die vorhandenen Verschiebe- und Tauschfunktionen bleiben verfügbar. Schrankmasse werden nicht automatisch vergrössert.


## Einbau- und Transportmasse (15.11.2026)

Über **Einbaumasse / Reserve** werden die Seiteneinstellungen geöffnet. „Automatisch nach Einbau- und Durchgangsmassen“ aktiviert die Berechnung. Benötigt werden die maximale gesamte Einbaubreite und Einbauhöhe. Einbautiefe und freie Durchgangsbreite/-höhe können zusätzlich begrenzt werden (0 bedeutet dort keine zusätzliche Grenze). Die Eingabe beschreibt die nutzbaren Masse nach Abzug gewünschter Transportluft.

Die Referenz Forchstrasse zeigt 1508 + 2008 mm breite Felder, Sihlhallenstrasse 1758 mm. Deshalb gilt **250 mm × Plattenspalten + 8 mm je Feld**. Zwei 500er-Felder benötigen insgesamt 1016 mm. Bevorzugt werden wenige Felder, dann eine geringe Gesamtbreite. Geprüft werden dazu Standardhöhen aus den Platten-/Zonenhöhen und die angegebene Maximalhöhe. Alle gefundenen Kandidaten werden mit der echten Geräteplatzierung geprüft. Es ist eine begrenzte Layoutsuche, kein Beweis, dass jede denkbare manuelle Anordnung ausgeschlossen ist, wenn kein Aufbau gefunden wird.

Der Transport wird aufrecht geprüft; Kippen, Kurven und Treppen werden nicht aus zwei Durchgangsmassen abgeleitet. Jedes Feld hat seinen eigenen Rahmen und eigene Profile in 2D/3D. Zählerfolgen werden zusammenhängend aufgeteilt (keine wechselnde Rundumverteilung nach Gruppennamen). Messmodul und Bezügersicherungen bleiben beim zugehörigen Zähler. Kompatible Gerätebänke werden soweit möglich gemeinsam einem Feld zugeordnet.

**Reserve-Zählerplätze gesamt (inkl. Schema)** ist die gewünschte Mindestgesamtzahl. Bereits im Schema erkennbare Reserve-Zähler zählen mit. Nur die Differenz wird aus der vorhandenen Reserve-Zählerplattenvorlage ergänzt, ohne das Schema zu verändern oder Sicherungen für leere Plätze zu erfinden. Bestehende Schema-Reserven werden bei einer kleineren Eingabe nicht entfernt.

Nach Änderungen: **Dispo erzeugen**. Die berechneten Feldbreiten und die Gesamtgrösse erscheinen rechts. Wenn keine geprüfte Anordnung passt, bleibt die bestehende Dispo unverändert.
