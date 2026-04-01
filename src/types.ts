export interface CheckinSection {
  title: string;
  questions: string[];
}

export interface CheckinSettings {
  sections: CheckinSection[];
  notesSubfolder: string;
}

export interface RegisterData {
  [group: string]: {
    [week: string]: boolean | string;
  };
}

export const DEFAULT_SETTINGS: CheckinSettings = {
  notesSubfolder: "Weekly notes",
  sections: [
    {
      title: "🗓️ Voortgang & planning",
      questions: [
        "Wat hebben jullie deze week bereikt, en loopt dat naar plan?",
        "Wat staat er voor de komende sprint/week op de planning?",
        "Zijn er taken die langer duren dan verwacht? Waardoor?",
      ],
    },
    {
      title: "🤝 Samenwerking & rolverdeling",
      questions: [
        "Wie doet wat, en is die verdeling nog eerlijk?",
        "Hoe verloopt de samenwerking binnen de groep?",
        "Is er iemand die ergens op vastloopt waar anderen bij kunnen helpen?",
      ],
    },
    {
      title: "🏢 Opdrachtgever & context",
      questions: [
        "Hoe is het contact met het bedrijf verlopen?",
        "Zijn de verwachtingen van de opdrachtgever nog helder, of zijn er nieuwe wensen bijgekomen?",
        "Wat heeft de opdrachtgever als laatste feedback gegeven?",
      ],
    },
    {
      title: "🛠️ Technisch & inhoudelijk",
      questions: [
        "Welke technische keuzes hebben jullie gemaakt, en waarom?",
        "Zijn er alternatieven overwogen?",
        "Waar ben je het meest onzeker over in jullie aanpak?",
      ],
    },
    {
      title: "💬 Reflectie & leren",
      questions: [
        "Wat ging er goed de afgelopen periode?",
        "Wat zouden jullie anders doen als je opnieuw mocht beginnen?",
        "Wat heb jij persoonlijk geleerd deze week?",
      ],
    },
    {
      title: "⚠️ Risico's & obstakels",
      questions: [
        "Wat kan er misgaan de komende tijd?",
        "Zijn er afhankelijkheden buiten jullie controle (bedrijf, tools, andere partijen)?",
        "Wat hebben jullie nodig van mij of van school?",
      ],
    },
  ],
};
