import { ORDERED_CAR_BRANDS, getModelsForBrand } from "@/lib/data/vehicles";
import {
  PROPERTY_PURPOSES, PROPERTY_TYPES, ROOM_OPTIONS, FURNISHING_OPTIONS, HEATING_OPTIONS,
  CONSTRUCTION_TYPES, PROPERTY_CONDITIONS, FLOOR_OPTIONS, PARKING_OPTIONS, TOTAL_FLOORS_OPTIONS,
  FUEL_TYPES, TRANSMISSION_TYPES, CAR_BODY_TYPES, EURO_STANDARDS,
  DRIVE_TYPES, CAR_COLORS, CAR_CONDITIONS, VEHICLE_TYPES,
  AUTO_PART_CATEGORIES, PART_CONDITIONS,
  SERVICE_CATEGORIES, PROVIDER_TYPES, PRICE_TYPES,
  JOB_CATEGORIES, EMPLOYMENT_TYPES, EXPERIENCE_LEVELS,
  ELECTRONICS_DEVICE_TYPES, ELECTRONICS_BRANDS, ELECTRONICS_STORAGE_OPTIONS,
  ELECTRONICS_RAM_OPTIONS, ELECTRONICS_COLORS, ITEM_CONDITIONS,
  COMPUTER_TYPES, COMPUTER_BRANDS, COMPUTER_OS_OPTIONS,
  KIDS_AGE_GROUPS, KIDS_ITEM_TYPES, KIDS_GENDERS,
  HOME_GARDEN_SUBCATEGORIES,
  FASHION_TYPES, FASHION_SIZES, FASHION_GENDERS,
  SPORT_CATEGORIES,
  BOOK_GENRES, BOOK_CONDITIONS, BOOK_LANGUAGES,
  ANIMAL_TYPES, ANIMAL_GENDERS,
} from "@/lib/data/categoryData";

export type FieldType = "text" | "number" | "select";

export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: string[];
  dependsOn?: string;
  getOptions?: (dependValue: string) => string[];
  required?: boolean;
};

export const listingTypeOptions = ["Продавам", "Подарявам", "Разменям", "Търся"];

export const categoryOptions = [
  "Електроника",
  "Автомобили",
  "Имоти",
  "Мода",
  "Авточасти",
  "Детски стоки",
  "Дом и градина",
  "Спорт и хоби",
  "Животни",
  "Услуги",
  "Работа",
  "Компютри",
  "Книги",
];

export const CATEGORY_DETAILS: Record<string, FieldDef[]> = {
  Автомобили: [
    { key: "vehicle_type",  label: "Тип превозно средство", type: "select", options: VEHICLE_TYPES },
    { key: "brand",         label: "Марка",                 type: "select", options: ORDERED_CAR_BRANDS, required: true },
    { key: "model",         label: "Модел",                 type: "select", dependsOn: "brand", getOptions: getModelsForBrand },
    { key: "year",          label: "Година",                type: "number", placeholder: "напр. 2018" },
    { key: "mileage",       label: "Пробег (км)",           type: "number", placeholder: "напр. 150000" },
    { key: "fuel",          label: "Гориво",                type: "select", options: FUEL_TYPES },
    { key: "gearbox",       label: "Скоростна кутия",       type: "select", options: TRANSMISSION_TYPES },
    { key: "engine_size",   label: "Кубатура (cc)",         type: "number", placeholder: "напр. 1968" },
    { key: "power",         label: "Мощност (к.с.)",        type: "number", placeholder: "напр. 140" },
    { key: "euro_standard", label: "Евро стандарт",         type: "select", options: EURO_STANDARDS },
    { key: "body_type",     label: "Купе",                  type: "select", options: CAR_BODY_TYPES },
    { key: "drive_type",    label: "Задвижване",            type: "select", options: DRIVE_TYPES },
    { key: "color",         label: "Цвят",                  type: "select", options: CAR_COLORS },
    { key: "condition",     label: "Състояние",             type: "select", options: CAR_CONDITIONS },
  ],
  Имоти: [
    { key: "property_purpose",   label: "Предназначение",        type: "select", options: PROPERTY_PURPOSES, required: true },
    { key: "property_type",      label: "Тип имот",              type: "select", options: PROPERTY_TYPES, required: true },
    { key: "area",               label: "Площ (кв.м.)",          type: "number", placeholder: "напр. 80" },
    { key: "rooms",              label: "Стаи",                  type: "select", options: ROOM_OPTIONS },
    { key: "floor",              label: "Етаж",                  type: "select", options: FLOOR_OPTIONS },
    { key: "total_floors",       label: "Общо етажи в сградата", type: "select", options: TOTAL_FLOORS_OPTIONS },
    { key: "furnished",          label: "Обзавеждане",           type: "select", options: FURNISHING_OPTIONS },
    { key: "heating",            label: "Отопление",             type: "select", options: HEATING_OPTIONS },
    { key: "construction_type",  label: "Строителство",          type: "select", options: CONSTRUCTION_TYPES },
    { key: "property_condition", label: "Състояние",             type: "select", options: PROPERTY_CONDITIONS },
    { key: "elevator",           label: "Асансьор",              type: "select", options: ["Да", "Не"] },
    { key: "parking",            label: "Паркиране",             type: "select", options: PARKING_OPTIONS },
  ],
  Електроника: [
    { key: "device_type", label: "Тип устройство", type: "select", options: ELECTRONICS_DEVICE_TYPES, required: true },
    { key: "brand",       label: "Марка",           type: "select", options: ELECTRONICS_BRANDS },
    { key: "model",       label: "Модел",           type: "text",   placeholder: "напр. Galaxy S24" },
    { key: "condition",   label: "Състояние",       type: "select", options: ITEM_CONDITIONS },
    { key: "storage",     label: "Памет",           type: "select", options: ELECTRONICS_STORAGE_OPTIONS },
    { key: "ram",         label: "RAM",             type: "select", options: ELECTRONICS_RAM_OPTIONS },
    { key: "color",       label: "Цвят",            type: "select", options: ELECTRONICS_COLORS },
  ],
  Авточасти: [
    { key: "car_brand",     label: "Марка автомобил", type: "select", options: ORDERED_CAR_BRANDS },
    { key: "car_model",     label: "Модел автомобил", type: "select", dependsOn: "car_brand", getOptions: getModelsForBrand },
    { key: "part_category", label: "Категория част",  type: "select", options: AUTO_PART_CATEGORIES, required: true },
    { key: "condition",     label: "Състояние",       type: "select", options: PART_CONDITIONS },
  ],
  Услуги: [
    { key: "service_category", label: "Категория услуга",    type: "select", options: SERVICE_CATEGORIES, required: true },
    { key: "online_service",   label: "Онлайн услуга",       type: "select", options: ["Да", "Не"] },
    { key: "provider_type",    label: "Фирма / Частно лице", type: "select", options: PROVIDER_TYPES },
    { key: "price_type",       label: "Тип на цената",       type: "select", options: PRICE_TYPES },
  ],
  Работа: [
    { key: "job_category",    label: "Категория работа", type: "select", options: JOB_CATEGORIES, required: true },
    { key: "employment_type", label: "Тип заетост",      type: "select", options: EMPLOYMENT_TYPES },
    { key: "experience",      label: "Опит",             type: "select", options: EXPERIENCE_LEVELS },
    { key: "remote",          label: "Дистанционна",     type: "select", options: ["Да", "Не"] },
    { key: "salary_from",     label: "Заплата от (лв.)", type: "number", placeholder: "напр. 1500" },
    { key: "salary_to",       label: "Заплата до (лв.)", type: "number", placeholder: "напр. 3000" },
  ],
  Компютри: [
    { key: "computer_type", label: "Тип",                 type: "select", options: COMPUTER_TYPES, required: true },
    { key: "brand",         label: "Марка",               type: "select", options: COMPUTER_BRANDS },
    { key: "model",         label: "Модел",               type: "text",   placeholder: "напр. MacBook Pro 14" },
    { key: "condition",     label: "Състояние",           type: "select", options: ITEM_CONDITIONS },
    { key: "storage",       label: "Памет",               type: "select", options: ELECTRONICS_STORAGE_OPTIONS },
    { key: "ram",           label: "RAM",                 type: "select", options: ELECTRONICS_RAM_OPTIONS },
    { key: "os",            label: "Операционна система", type: "select", options: COMPUTER_OS_OPTIONS },
  ],
  "Детски стоки": [
    { key: "item_type",  label: "Вид",              type: "select", options: KIDS_ITEM_TYPES, required: true },
    { key: "age_group",  label: "Възрастова група", type: "select", options: KIDS_AGE_GROUPS },
    { key: "gender",     label: "За",               type: "select", options: KIDS_GENDERS },
    { key: "condition",  label: "Състояние",        type: "select", options: ITEM_CONDITIONS },
  ],
  "Дом и градина": [
    { key: "subcategory", label: "Подкатегория", type: "select", options: HOME_GARDEN_SUBCATEGORIES, required: true },
    { key: "condition",   label: "Състояние",    type: "select", options: ITEM_CONDITIONS },
  ],
  Мода: [
    { key: "clothing_type", label: "Вид",       type: "select", options: FASHION_TYPES, required: true },
    { key: "gender",        label: "За",        type: "select", options: FASHION_GENDERS },
    { key: "size",          label: "Размер",    type: "select", options: FASHION_SIZES },
    { key: "condition",     label: "Състояние", type: "select", options: ITEM_CONDITIONS },
  ],
  "Спорт и хоби": [
    { key: "sport_category", label: "Категория", type: "select", options: SPORT_CATEGORIES, required: true },
    { key: "condition",      label: "Състояние", type: "select", options: ITEM_CONDITIONS },
  ],
  Книги: [
    { key: "genre",     label: "Жанр",      type: "select", options: BOOK_GENRES },
    { key: "language",  label: "Език",      type: "select", options: BOOK_LANGUAGES },
    { key: "condition", label: "Състояние", type: "select", options: BOOK_CONDITIONS },
  ],
  Животни: [
    { key: "animal_type", label: "Вид животно", type: "select", options: ANIMAL_TYPES, required: true },
    { key: "breed",       label: "Порода",      type: "text",   placeholder: "напр. Лабрадор" },
    { key: "age",         label: "Възраст",     type: "text",   placeholder: "напр. 6 месеца" },
    { key: "gender",      label: "Пол",         type: "select", options: ANIMAL_GENDERS },
    { key: "vaccinated",  label: "Ваксинирано", type: "select", options: ["Да", "Не", "Частично"] },
    { key: "pedigree",    label: "С родословие", type: "select", options: ["Да", "Не"] },
  ],
};
