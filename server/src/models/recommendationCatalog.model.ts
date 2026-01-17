export type RecommendationCatalog = {
  recommendation_id: string;

  title: string;
  description: string | null;

  recommendation_type: "activity" | "event";
  default_location: string | null;
  category: string | null;

  is_predefined: boolean;
  created_by: string | null;

  is_active: boolean;
  created_at: string;
};
