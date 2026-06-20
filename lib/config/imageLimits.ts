const CATEGORY_IMAGE_LIMITS: Record<string, number> = {
  "Автомобили": 25,
  "Имоти": 25,
};

const DEFAULT_IMAGE_LIMIT = 15;

export function getImageLimit(category: string): number {
  return CATEGORY_IMAGE_LIMITS[category] ?? DEFAULT_IMAGE_LIMIT;
}
