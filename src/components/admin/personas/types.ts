export interface Specialties {
  sports: string[];
  leagues: string[];
  teams: string[];
}

export interface Persona {
  id: string;
  name: string;
  style_prompt: string;
  description: string | null;
  is_active: boolean;
  writer_type: string;
  specialties: Specialties;
  max_articles: number;
  created_at: string;
}

export interface PersonaFormData {
  name: string;
  description: string;
  style_prompt: string;
  is_active: boolean;
  writer_type: string;
  specialties: Specialties;
  max_articles: number;
}

export const SPORT_OPTIONS = ["籃球", "棒球", "美式足球", "足球", "冰球", "網球", "綜合"];
export const LEAGUE_OPTIONS = ["NBA", "MLB", "NFL", "MLS", "英超", "西甲", "德甲", "義甲", "法甲", "歐冠", "NHL", "中職", "日職"];

export const TYPE_LABELS: Record<string, string> = {
  columnist: "專欄作家",
  official: "官方戰報",
};

export const emptyForm: PersonaFormData = {
  name: "",
  description: "",
  style_prompt: "",
  is_active: true,
  writer_type: "columnist",
  specialties: { sports: [], leagues: [], teams: [] },
  max_articles: 2,
};
