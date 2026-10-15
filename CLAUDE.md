# Tweede brein (ADHD-app)

## Wie ik ben
Ik ben Didi, beginner met coderen (ken een beetje HTML). Leg altijd in
simpel Nederlands uit wat je doet en waarom. Geef één stap tegelijk.

## Doel van de app
Een tweede brein voor iemand met ADHD-verlamming. Hoofdzakelijk gebruikt
op een iPhone.

## Ontwerpregels
- Zo min mogelijk keuzes en stappen per scherm
- Groot, visueel, weinig tekst, grote knoppen (makkelijk met duim)
- Elke afgeronde taak geeft een kleine beloning (animatie, streak)
- Eén hoofdscherm: een groot dumpveld om gedachten in te typen of
  in te spreken
- Herinneringen mogen niet makkelijk weggeveegd kunnen worden

## Techniek
- Begin met gewone HTML, CSS en JavaScript, zonder zware frameworks
- Moet als app op het beginscherm van een iPhone kunnen (PWA)
- Gegevens worden voorlopig lokaal op de telefoon bewaard

## Fases
1. Dumpscherm + lijst "vandaag" met knoppen Gedaan / Morgen + beloning
2. Herinneringen met een datum in de toekomst
3. Terugkerende, niet-negeerbare meldingen
4. AI die de dump automatisch sorteert

## Look & feel
- Platform: iPhone (Safari), als PWA op het beginscherm
- Sfeer: volwassen, chic en een beetje girly. Rustig, overzichtelijk,
  niet kinderlijk of speels. Denk aan een mooi notitieboekje of een
  stijlvolle planner-app.
- Kleurenpalet (gedempt, roze als hoofdkleur):
  - Achtergrond: #FBF4F2 (warm crème)
  - Kaarten: #FFFFFF met zachte schaduw
  - Hoofdkleur stofroze: #E3A5B5
  - Donkerder roze (accenten, knoppen): #C9778F
  - Mauve: #B9A3C4
  - Salie (voor "Gedaan"): #A9C2AE
  - Zand (voor "Morgen"): #E8D5C4
  - Tekst: #3F3340 (diep aubergine)
- Lettertypen: een elegante serif voor titels (bijvoorbeeld Playfair
  Display of DM Serif Display), een rustig schreefloos lettertype voor
  de rest (bijvoorbeeld DM Sans of Inter). Laad ze via Google Fonts.
- Afgeronde hoeken, dunne lijntjes, zachte schaduwen, veel witruimte
- Grote knoppen (minstens 56px hoog) voor makkelijk duimgebruik
- Gebruik subtiele lijniconen, geen cartoon-emoji
- Tekst in het Nederlands, kort, warm en volwassen van toon

## Puntensysteem
- 1 punt voor starten aan een taak, 3 punten voor afronden
- Belangrijk = dubbele punten
- Een taak die al eerder uitgesteld is, geeft bonuspunten bij afronden
- Streak is vergevingsgezind: een gemiste dag pauzeert de streak,
  hij start niet opnieuw op nul
- Beloning bij afronden: kleine, subtiele animatie en een kort woord,
  geen confetti
- Toon punten en niveau rustig bovenaan, niet opdringerig
- Later (fase 6): beloningslijst die ik zelf instel. De app trekt bij
  een puntendrempel willekeurig één beloning uit mijn lijst.

## Extra wensen (latere fases)
- Prioriteit per item: Belangrijk of Gewoon. Belangrijk staat bovenaan.
- Uitstelbeveiliging: na 2x "Morgen" op hetzelfde item verschijnt een
  scherm met 3 keuzes: Nu doen (5 min), Vast tijdstip kiezen, Schrappen.
  Verder uitstellen kan dan niet.
- Overzicht "Binnenkort" met alles van de komende 7 dagen
- Items met een datum ver in de toekomst (bv. over 2 jaar) worden
  bewaard en komen vanzelf terug in het overzicht
- Koppeling met Google Agenda (via Google Apps Script), zodat de app
  mijn afspraken kan tonen en alarmen in mijn agenda kan aanmaken
- Elke ochtend een melding met: afspraken van vandaag, taken van
  vandaag, en wat er de komende week aankomt
- Onmisbare dingen (facturen, pakketjes terugsturen) moeten
  moeilijk te negeren zijn

## Werkwijze
- Laat me altijd eerst een preview zien voordat je commit of pusht
- Bouw één fase tegelijk en leg uit wat je gedaan hebt
