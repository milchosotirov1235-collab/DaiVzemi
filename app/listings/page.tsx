"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { BookMarked, ChevronDown, Loader2, SlidersHorizontal, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { ORDERED_CAR_BRANDS, getModelsForBrand } from "@/lib/data/vehicles";
import {
  BG_CITIES,
  PROPERTY_PURPOSES, PROPERTY_TYPES, ROOM_OPTIONS, FURNISHING_OPTIONS, HEATING_OPTIONS,
  CONSTRUCTION_TYPES, PROPERTY_CONDITIONS, FLOOR_OPTIONS, PARKING_OPTIONS,
  FUEL_TYPES, TRANSMISSION_TYPES,
  CAR_BODY_TYPES, EURO_STANDARDS, DRIVE_TYPES, CAR_COLORS, CAR_CONDITIONS, VEHICLE_TYPES,
  AUTO_PART_CATEGORIES, PART_CONDITIONS,
  ELECTRONICS_DEVICE_TYPES, ELECTRONICS_BRANDS, ELECTRONICS_STORAGE_OPTIONS,
  ELECTRONICS_RAM_OPTIONS, ELECTRONICS_COLORS, ITEM_CONDITIONS,
  SERVICE_CATEGORIES, PROVIDER_TYPES, PRICE_TYPES,
  JOB_CATEGORIES, EMPLOYMENT_TYPES, EXPERIENCE_LEVELS,
  COMPUTER_TYPES, COMPUTER_BRANDS,
  KIDS_AGE_GROUPS, KIDS_ITEM_TYPES, KIDS_GENDERS,
  HOME_GARDEN_SUBCATEGORIES,
  FASHION_TYPES, FASHION_SIZES, FASHION_GENDERS,
  SPORT_CATEGORIES,
  BOOK_GENRES, BOOK_CONDITIONS, BOOK_LANGUAGES,
} from "@/lib/data/categoryData";
import SearchableSelect from "@/components/SearchableSelect";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Listing = {
  id: string;
  title: string;
  description?: string | null;
  price: string | number | null;
  city: string | null;
  category: string | null;
  listing_type: string | null;
  created_at: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  // Category-specific fields (populated once DB columns are added)
  property_type?: string | null;
  rooms?: string | null;
  area_sqm?: number | null;
  car_make?: string | null;
  car_model?: string | null;
  car_year?: number | null;
  fuel_type?: string | null;
  transmission?: string | null;
  mileage?: number | null;
  part_type?: string | null;
  electronics_subcategory?: string | null;
  condition?: string | null;
  service_type?: string | null;
  details?: Record<string, string> | null;
};

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const categories = [
  "Имоти",
  "Автомобили",
  "Авточасти",
  "Електроника",
  "Детски стоки",
  "Дом и градина",
  "Мода",
  "Спорт и хоби",
  "Услуги",
  "Работа",
  "Компютри",
  "Книги",
];

const listingTypes = ["Продавам", "Подарявам", "Разменям", "Търся"];

const fallbackImageByCategory: Record<string, string> = {
  Имоти: "🏙️",
  Автомобили: "🚗",
  Авточасти: "🔧",
  Електроника: "📺",
  "Детски стоки": "🧸",
  "Дом и градина": "🏡",
  Мода: "👗",
  "Спорт и хоби": "🏀",
  Услуги: "🛠️",
  Работа: "💼",
  Компютри: "💻",
  Книги: "📚",
};

// Categories that have their own dedicated filter panel
const CATEGORY_SPECIFIC = ["Имоти", "Автомобили", "Авточасти", "Електроника", "Услуги", "Работа", "Компютри", "Детски стоки", "Дом и градина", "Мода", "Спорт и хоби", "Книги"];

// ---------------------------------------------------------------------------
// CustomDropdown
// ---------------------------------------------------------------------------

function CustomDropdown({
  value,
  placeholder,
  options,
  isOpen,
  onToggle,
  onSelect,
  disabled = false,
  disabledPlaceholder,
}: {
  value: string;
  placeholder: string;
  options: string[];
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
  disabled?: boolean;
  disabledPlaceholder?: string;
}) {
  if (disabled) {
    return (
      <div className="flex w-full cursor-not-allowed items-center justify-between rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-400 shadow-sm">
        <span>{disabledPlaceholder ?? placeholder}</span>
        <ChevronDown className="h-4 w-4 opacity-40" />
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-950 shadow-sm outline-none transition focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10"
      >
        <span className={value ? "text-slate-950" : "text-slate-400"}>
          {value || placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-blue-950 transition ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-[110%] z-50 max-h-60 overflow-y-auto overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
          <button
            type="button"
            onClick={() => onSelect("")}
            className="w-full cursor-pointer rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-500 transition hover:bg-slate-100"
          >
            {placeholder}
          </button>
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              className={`w-full cursor-pointer rounded-xl px-3 py-2 text-left text-sm font-bold transition hover:bg-slate-100 ${
                option === value ? "bg-blue-50 text-blue-950" : "text-slate-950"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CategoryFilters — renders the appropriate panel per active category
// ---------------------------------------------------------------------------

type CategoryFilterProps = {
  category: string;
  // Имоти
  propertyPurpose: string; onPropertyPurpose: (v: string) => void;
  propertyType: string; onPropertyType: (v: string) => void;
  rooms: string; onRooms: (v: string) => void;
  floor: string; onFloor: (v: string) => void;
  sqmMin: string; onSqmMin: (v: string) => void;
  sqmMax: string; onSqmMax: (v: string) => void;
  furnished: string; onFurnished: (v: string) => void;
  heating: string; onHeating: (v: string) => void;
  constructionType: string; onConstructionType: (v: string) => void;
  propertyCondition: string; onPropertyCondition: (v: string) => void;
  elevator: string; onElevator: (v: string) => void;
  parking: string; onParking: (v: string) => void;
  // Автомобили / Авточасти
  vehicleType: string; onVehicleType: (v: string) => void;
  carMake: string; onCarMake: (v: string) => void;
  carModel: string; onCarModel: (v: string) => void;
  yearFrom: string; onYearFrom: (v: string) => void;
  yearTo: string; onYearTo: (v: string) => void;
  fuel: string; onFuel: (v: string) => void;
  transmission: string; onTransmission: (v: string) => void;
  mileageFrom: string; onMileageFrom: (v: string) => void;
  mileageTo: string; onMileageTo: (v: string) => void;
  engineSizeFrom: string; onEngineSizeFrom: (v: string) => void;
  engineSizeTo: string; onEngineSizeTo: (v: string) => void;
  powerFrom: string; onPowerFrom: (v: string) => void;
  powerTo: string; onPowerTo: (v: string) => void;
  euroStandard: string; onEuroStandard: (v: string) => void;
  bodyType: string; onBodyType: (v: string) => void;
  driveType: string; onDriveType: (v: string) => void;
  carColor: string; onCarColor: (v: string) => void;
  carCondition: string; onCarCondition: (v: string) => void;
  partType: string; onPartType: (v: string) => void;
  // Електроника (new props)
  elDeviceType: string; onElDeviceType: (v: string) => void;
  elBrand: string; onElBrand: (v: string) => void;
  elModel: string; onElModel: (v: string) => void;
  elCondition: string; onElCondition: (v: string) => void;
  elStorage: string; onElStorage: (v: string) => void;
  elRam: string; onElRam: (v: string) => void;
  elColor: string; onElColor: (v: string) => void;
  // Авточасти (condition still shared)
  electronicsSubcat: string; onElectronicsSubcat: (v: string) => void;
  condition: string; onCondition: (v: string) => void;
  brand: string; onBrand: (v: string) => void;
  // Услуги
  serviceType: string; onServiceType: (v: string) => void;
  serviceCategory: string; onServiceCategory: (v: string) => void;
  onlineService: string; onOnlineService: (v: string) => void;
  providerType: string; onProviderType: (v: string) => void;
  // Работа
  jobCategory: string; onJobCategory: (v: string) => void;
  employmentType: string; onEmploymentType: (v: string) => void;
  experience: string; onExperience: (v: string) => void;
  remote: string; onRemote: (v: string) => void;
  salaryFrom: string; onSalaryFrom: (v: string) => void;
  salaryTo: string; onSalaryTo: (v: string) => void;
  // Компютри
  compType: string; onCompType: (v: string) => void;
  compBrand: string; onCompBrand: (v: string) => void;
  compCondition: string; onCompCondition: (v: string) => void;
  // Детски стоки
  kidsItemType: string; onKidsItemType: (v: string) => void;
  kidsAgeGroup: string; onKidsAgeGroup: (v: string) => void;
  kidsGender: string; onKidsGender: (v: string) => void;
  kidsCondition: string; onKidsCondition: (v: string) => void;
  // Дом и градина
  homeSubcategory: string; onHomeSubcategory: (v: string) => void;
  homeCondition: string; onHomeCondition: (v: string) => void;
  // Мода
  fashionType: string; onFashionType: (v: string) => void;
  fashionGender: string; onFashionGender: (v: string) => void;
  fashionSize: string; onFashionSize: (v: string) => void;
  fashionCondition: string; onFashionCondition: (v: string) => void;
  // Спорт и хоби
  sportCategory: string; onSportCategory: (v: string) => void;
  sportCondition: string; onSportCondition: (v: string) => void;
  // Книги
  bookGenre: string; onBookGenre: (v: string) => void;
  bookCondition: string; onBookCondition: (v: string) => void;
  bookLanguage: string; onBookLanguage: (v: string) => void;
};

function CategoryFilters(p: CategoryFilterProps) {
  const field =
    "rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10 w-full";

  if (p.category === "Имоти") {
    return (
      <div className="mt-4 space-y-3">
        {/* Row 1 — Purpose + Type + Rooms + Floor */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SearchableSelect value={p.propertyPurpose} onChange={p.onPropertyPurpose}
            options={PROPERTY_PURPOSES} placeholder="Предназначение" />
          <SearchableSelect value={p.propertyType} onChange={p.onPropertyType}
            options={PROPERTY_TYPES} placeholder="Тип имот" />
          <SearchableSelect value={p.rooms} onChange={p.onRooms}
            options={ROOM_OPTIONS} placeholder="Стаи" />
          <SearchableSelect value={p.floor} onChange={p.onFloor}
            options={FLOOR_OPTIONS} placeholder="Етаж" />
        </div>

        {/* Row 2 — Sqm range */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <input value={p.sqmMin} onChange={(e) => p.onSqmMin(e.target.value)}
            placeholder="Кв.м. от" type="number" min="0" className={field} />
          <input value={p.sqmMax} onChange={(e) => p.onSqmMax(e.target.value)}
            placeholder="Кв.м. до" type="number" min="0" className={field} />
        </div>

        {/* Row 3 — Furnished + Heating + Construction + Condition */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SearchableSelect value={p.furnished} onChange={p.onFurnished}
            options={FURNISHING_OPTIONS} placeholder="Обзавеждане" />
          <SearchableSelect value={p.heating} onChange={p.onHeating}
            options={HEATING_OPTIONS} placeholder="Отопление" />
          <SearchableSelect value={p.constructionType} onChange={p.onConstructionType}
            options={CONSTRUCTION_TYPES} placeholder="Строителство" />
          <SearchableSelect value={p.propertyCondition} onChange={p.onPropertyCondition}
            options={PROPERTY_CONDITIONS} placeholder="Състояние" />
        </div>

        {/* Row 4 — Elevator + Parking */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SearchableSelect value={p.elevator} onChange={p.onElevator}
            options={["Да", "Не"]} placeholder="Асансьор" />
          <SearchableSelect value={p.parking} onChange={p.onParking}
            options={PARKING_OPTIONS} placeholder="Паркиране" />
        </div>
      </div>
    );
  }

  if (p.category === "Автомобили") {
    return (
      <div className="mt-4 space-y-3">
        {/* Row 1 — Vehicle type (full width) */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SearchableSelect
            value={p.vehicleType}
            onChange={p.onVehicleType}
            options={VEHICLE_TYPES}
            placeholder="Тип превозно средство"
          />
          <SearchableSelect
            value={p.carMake}
            onChange={(v) => { p.onCarMake(v); p.onCarModel(""); }}
            options={ORDERED_CAR_BRANDS}
            placeholder="Марка"
          />
          <SearchableSelect
            value={p.carModel}
            onChange={p.onCarModel}
            options={getModelsForBrand(p.carMake)}
            placeholder="Модел"
            disabled={!p.carMake}
            disabledPlaceholder="Първо изберете марка"
          />
        </div>

        {/* Row 2 — Year + Mileage */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <input value={p.yearFrom} onChange={(e) => p.onYearFrom(e.target.value)}
            placeholder="Година от" type="number" min="1970" max="2030" className={field} />
          <input value={p.yearTo} onChange={(e) => p.onYearTo(e.target.value)}
            placeholder="Година до" type="number" min="1970" max="2030" className={field} />
          <input value={p.mileageFrom} onChange={(e) => p.onMileageFrom(e.target.value)}
            placeholder="Пробег от (км)" type="number" min="0" className={field} />
          <input value={p.mileageTo} onChange={(e) => p.onMileageTo(e.target.value)}
            placeholder="Пробег до (км)" type="number" min="0" className={field} />
        </div>

        {/* Row 3 — Fuel + Gearbox + Body + Drive */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SearchableSelect value={p.fuel} onChange={p.onFuel}
            options={FUEL_TYPES} placeholder="Гориво" />
          <SearchableSelect value={p.transmission} onChange={p.onTransmission}
            options={TRANSMISSION_TYPES} placeholder="Скоростна кутия" />
          <SearchableSelect value={p.bodyType} onChange={p.onBodyType}
            options={CAR_BODY_TYPES} placeholder="Купе" />
          <SearchableSelect value={p.driveType} onChange={p.onDriveType}
            options={DRIVE_TYPES} placeholder="Задвижване" />
        </div>

        {/* Row 4 — Engine + Power + Euro + Condition */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <input value={p.engineSizeFrom} onChange={(e) => p.onEngineSizeFrom(e.target.value)}
            placeholder="Кубатура от (cc)" type="number" min="0" className={field} />
          <input value={p.engineSizeTo} onChange={(e) => p.onEngineSizeTo(e.target.value)}
            placeholder="Кубатура до (cc)" type="number" min="0" className={field} />
          <input value={p.powerFrom} onChange={(e) => p.onPowerFrom(e.target.value)}
            placeholder="Мощност от (к.с.)" type="number" min="0" className={field} />
          <input value={p.powerTo} onChange={(e) => p.onPowerTo(e.target.value)}
            placeholder="Мощност до (к.с.)" type="number" min="0" className={field} />
        </div>

        {/* Row 5 — Euro standard + Color + Condition */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SearchableSelect value={p.euroStandard} onChange={p.onEuroStandard}
            options={EURO_STANDARDS} placeholder="Евро стандарт" />
          <SearchableSelect value={p.carColor} onChange={p.onCarColor}
            options={CAR_COLORS} placeholder="Цвят" />
          <SearchableSelect value={p.carCondition} onChange={p.onCarCondition}
            options={CAR_CONDITIONS} placeholder="Състояние" />
        </div>
      </div>
    );
  }

  if (p.category === "Авточасти") {
    return (
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SearchableSelect
          value={p.carMake}
          onChange={(v) => { p.onCarMake(v); p.onCarModel(""); }}
          options={ORDERED_CAR_BRANDS}
          placeholder="Марка на автомобила"
        />
        <SearchableSelect
          value={p.carModel}
          onChange={p.onCarModel}
          options={getModelsForBrand(p.carMake)}
          placeholder="Модел на автомобила"
          disabled={!p.carMake}
          disabledPlaceholder="Първо изберете марка"
        />
        <SearchableSelect
          value={p.partType}
          onChange={p.onPartType}
          options={AUTO_PART_CATEGORIES}
          placeholder="Вид на частта"
        />
        <SearchableSelect
          value={p.condition}
          onChange={p.onCondition}
          options={PART_CONDITIONS}
          placeholder="Състояние"
        />
      </div>
    );
  }

  if (p.category === "Електроника") {
    return (
      <div className="mt-4 space-y-3">
        {/* Row 1 — Device type + Brand + Model + Condition */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SearchableSelect value={p.elDeviceType} onChange={p.onElDeviceType}
            options={ELECTRONICS_DEVICE_TYPES} placeholder="Тип устройство" />
          <SearchableSelect value={p.elBrand} onChange={p.onElBrand}
            options={ELECTRONICS_BRANDS} placeholder="Марка" />
          <input value={p.elModel} onChange={(e) => p.onElModel(e.target.value)}
            placeholder="Модел (напр. Galaxy S24)" className={field} />
          <SearchableSelect value={p.elCondition} onChange={p.onElCondition}
            options={ITEM_CONDITIONS} placeholder="Състояние" />
        </div>

        {/* Row 2 — Storage + RAM + Color */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SearchableSelect value={p.elStorage} onChange={p.onElStorage}
            options={ELECTRONICS_STORAGE_OPTIONS} placeholder="Памет" />
          <SearchableSelect value={p.elRam} onChange={p.onElRam}
            options={ELECTRONICS_RAM_OPTIONS} placeholder="RAM" />
          <SearchableSelect value={p.elColor} onChange={p.onElColor}
            options={ELECTRONICS_COLORS} placeholder="Цвят" />
        </div>
      </div>
    );
  }

  if (p.category === "Услуги") {
    return (
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SearchableSelect value={p.serviceCategory} onChange={p.onServiceCategory}
          options={SERVICE_CATEGORIES} placeholder="Категория услуга" />
        <SearchableSelect value={p.onlineService} onChange={p.onOnlineService}
          options={["Да", "Не"]} placeholder="Онлайн услуга" />
        <SearchableSelect value={p.providerType} onChange={p.onProviderType}
          options={PROVIDER_TYPES} placeholder="Фирма / Частно лице" />
      </div>
    );
  }

  if (p.category === "Работа") {
    return (
      <div className="mt-4 space-y-3">
        {/* Row 1 — Category + Employment type + Experience + Remote */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SearchableSelect value={p.jobCategory} onChange={p.onJobCategory}
            options={JOB_CATEGORIES} placeholder="Категория работа" />
          <SearchableSelect value={p.employmentType} onChange={p.onEmploymentType}
            options={EMPLOYMENT_TYPES} placeholder="Тип заетост" />
          <SearchableSelect value={p.experience} onChange={p.onExperience}
            options={EXPERIENCE_LEVELS} placeholder="Опит" />
          <SearchableSelect value={p.remote} onChange={p.onRemote}
            options={["Да", "Не"]} placeholder="Дистанционна" />
        </div>

        {/* Row 2 — Salary range */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <input value={p.salaryFrom} onChange={(e) => p.onSalaryFrom(e.target.value)}
            placeholder="Заплата от (лв.)" type="number" min="0" className={field} />
          <input value={p.salaryTo} onChange={(e) => p.onSalaryTo(e.target.value)}
            placeholder="Заплата до (лв.)" type="number" min="0" className={field} />
        </div>
      </div>
    );
  }

  if (p.category === "Компютри") {
    return (
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SearchableSelect value={p.compType} onChange={p.onCompType}
          options={COMPUTER_TYPES} placeholder="Тип" />
        <SearchableSelect value={p.compBrand} onChange={p.onCompBrand}
          options={COMPUTER_BRANDS} placeholder="Марка" />
        <SearchableSelect value={p.compCondition} onChange={p.onCompCondition}
          options={ITEM_CONDITIONS} placeholder="Състояние" />
      </div>
    );
  }

  if (p.category === "Детски стоки") {
    return (
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SearchableSelect value={p.kidsItemType} onChange={p.onKidsItemType}
          options={KIDS_ITEM_TYPES} placeholder="Вид" />
        <SearchableSelect value={p.kidsAgeGroup} onChange={p.onKidsAgeGroup}
          options={KIDS_AGE_GROUPS} placeholder="Възрастова група" />
        <SearchableSelect value={p.kidsGender} onChange={p.onKidsGender}
          options={KIDS_GENDERS} placeholder="За" />
        <SearchableSelect value={p.kidsCondition} onChange={p.onKidsCondition}
          options={ITEM_CONDITIONS} placeholder="Състояние" />
      </div>
    );
  }

  if (p.category === "Дом и градина") {
    return (
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SearchableSelect value={p.homeSubcategory} onChange={p.onHomeSubcategory}
          options={HOME_GARDEN_SUBCATEGORIES} placeholder="Подкатегория" />
        <SearchableSelect value={p.homeCondition} onChange={p.onHomeCondition}
          options={ITEM_CONDITIONS} placeholder="Състояние" />
      </div>
    );
  }

  if (p.category === "Мода") {
    return (
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SearchableSelect value={p.fashionType} onChange={p.onFashionType}
          options={FASHION_TYPES} placeholder="Вид" />
        <SearchableSelect value={p.fashionGender} onChange={p.onFashionGender}
          options={FASHION_GENDERS} placeholder="За" />
        <SearchableSelect value={p.fashionSize} onChange={p.onFashionSize}
          options={FASHION_SIZES} placeholder="Размер" />
        <SearchableSelect value={p.fashionCondition} onChange={p.onFashionCondition}
          options={ITEM_CONDITIONS} placeholder="Състояние" />
      </div>
    );
  }

  if (p.category === "Спорт и хоби") {
    return (
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SearchableSelect value={p.sportCategory} onChange={p.onSportCategory}
          options={SPORT_CATEGORIES} placeholder="Категория" />
        <SearchableSelect value={p.sportCondition} onChange={p.onSportCondition}
          options={ITEM_CONDITIONS} placeholder="Състояние" />
      </div>
    );
  }

  if (p.category === "Книги") {
    return (
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SearchableSelect value={p.bookGenre} onChange={p.onBookGenre}
          options={BOOK_GENRES} placeholder="Жанр" />
        <SearchableSelect value={p.bookLanguage} onChange={p.onBookLanguage}
          options={BOOK_LANGUAGES} placeholder="Език" />
        <SearchableSelect value={p.bookCondition} onChange={p.onBookCondition}
          options={BOOK_CONDITIONS} placeholder="Състояние" />
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatPrice = (value: string | number | null) => {
  if (value === null || value === undefined || value === "") return "По договаряне";
  const formatted = String(value).trim();
  if (/€|EUR|\$|USD|лв|BGN/i.test(formatted)) return formatted;
  return `${formatted} €`;
};

const getNumericPrice = (value: string | number | null) => {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).replace(",", ".").replace(/[^\d.]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatDate = (value: string | null) => {
  if (!value) return "Няма дата";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Няма дата";
  return new Intl.DateTimeFormat("bg-BG", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
};

const conditionBadge = (condition: string | null | undefined) => {
  if (!condition) return null;
  const c = condition.trim();
  if (c.startsWith("Ново")) return { label: c, cls: "bg-green-50 text-green-700 ring-green-200" };
  if (c === "Като ново" || c === "Отлично") return { label: c, cls: "bg-teal-50 text-teal-700 ring-teal-200" };
  if (c === "Добро" || c === "Употребявано") return { label: c, cls: "bg-slate-100 text-slate-600 ring-slate-200" };
  if (c.startsWith("За ремонт")) return { label: c, cls: "bg-amber-50 text-amber-700 ring-amber-200" };
  return { label: c, cls: "bg-slate-100 text-slate-600 ring-slate-200" };
};

// ---------------------------------------------------------------------------
// Main page content
// ---------------------------------------------------------------------------

function ListingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  // Sort
  const [sort, setSort] = useState(searchParams.get("sort") ?? "newest");

  // Generic filters
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");
  const [cityInput, setCityInput] = useState(searchParams.get("city") ?? "");
  const [categoryInput, setCategoryInput] = useState(searchParams.get("category") ?? "");
  const [typeInput, setTypeInput] = useState(searchParams.get("type") ?? "");
  const [minPriceInput, setMinPriceInput] = useState(searchParams.get("minPrice") ?? "");
  const [maxPriceInput, setMaxPriceInput] = useState(searchParams.get("maxPrice") ?? "");

  // Category-specific filters — Имоти
  const [propertyPurpose, setPropertyPurpose] = useState(searchParams.get("propertyPurpose") ?? "");
  const [propertyType, setPropertyType] = useState(searchParams.get("propertyType") ?? "");
  const [rooms, setRooms] = useState(searchParams.get("rooms") ?? "");
  const [floor, setFloor] = useState(searchParams.get("floor") ?? "");
  const [sqmMin, setSqmMin] = useState(searchParams.get("sqmMin") ?? "");
  const [sqmMax, setSqmMax] = useState(searchParams.get("sqmMax") ?? "");
  const [furnished, setFurnished] = useState(searchParams.get("furnished") ?? "");
  const [heating, setHeating] = useState(searchParams.get("heating") ?? "");
  const [constructionType, setConstructionType] = useState(searchParams.get("constructionType") ?? "");
  const [propertyCondition, setPropertyCondition] = useState(searchParams.get("propertyCondition") ?? "");
  const [elevator, setElevator] = useState(searchParams.get("elevator") ?? "");
  const [parking, setParking] = useState(searchParams.get("parking") ?? "");

  // Category-specific filters — Автомобили / Авточасти
  const [vehicleType, setVehicleType] = useState(searchParams.get("vehicleType") ?? "");
  const [carMake, setCarMake] = useState(searchParams.get("carMake") ?? "");
  const [carModel, setCarModel] = useState(searchParams.get("carModel") ?? "");
  const [yearFrom, setYearFrom] = useState(searchParams.get("yearFrom") ?? "");
  const [yearTo, setYearTo] = useState(searchParams.get("yearTo") ?? "");
  const [fuel, setFuel] = useState(searchParams.get("fuel") ?? "");
  const [transmission, setTransmission] = useState(searchParams.get("transmission") ?? "");
  const [mileageFrom, setMileageFrom] = useState(searchParams.get("mileageFrom") ?? "");
  const [mileageTo, setMileageTo] = useState(searchParams.get("mileageTo") ?? "");
  const [engineSizeFrom, setEngineSizeFrom] = useState(searchParams.get("engineSizeFrom") ?? "");
  const [engineSizeTo, setEngineSizeTo] = useState(searchParams.get("engineSizeTo") ?? "");
  const [powerFrom, setPowerFrom] = useState(searchParams.get("powerFrom") ?? "");
  const [powerTo, setPowerTo] = useState(searchParams.get("powerTo") ?? "");
  const [euroStandard, setEuroStandard] = useState(searchParams.get("euroStandard") ?? "");
  const [bodyType, setBodyType] = useState(searchParams.get("bodyType") ?? "");
  const [driveType, setDriveType] = useState(searchParams.get("driveType") ?? "");
  const [carColor, setCarColor] = useState(searchParams.get("carColor") ?? "");
  const [carCondition, setCarCondition] = useState(searchParams.get("carCondition") ?? "");
  const [partType, setPartType] = useState(searchParams.get("partType") ?? "");

  // Category-specific filters — Електроника (new)
  const [elDeviceType, setElDeviceType] = useState(searchParams.get("elDeviceType") ?? "");
  const [elBrand, setElBrand] = useState(searchParams.get("elBrand") ?? "");
  const [elModel, setElModel] = useState(searchParams.get("elModel") ?? "");
  const [elCondition, setElCondition] = useState(searchParams.get("elCondition") ?? "");
  const [elStorage, setElStorage] = useState(searchParams.get("elStorage") ?? "");
  const [elRam, setElRam] = useState(searchParams.get("elRam") ?? "");
  const [elColor, setElColor] = useState(searchParams.get("elColor") ?? "");
  // Legacy — kept for backward compat with old saved searches and Авточасти
  const [electronicsSubcat, setElectronicsSubcat] = useState(searchParams.get("electronicsSubcat") ?? "");
  const [condition, setCondition] = useState(searchParams.get("condition") ?? "");
  const [brand, setBrand] = useState(searchParams.get("brand") ?? "");

  // Category-specific filters — Услуги
  const [serviceType, setServiceType] = useState(searchParams.get("serviceType") ?? "");
  const [serviceCategory, setServiceCategory] = useState(searchParams.get("serviceCategory") ?? "");
  const [onlineService, setOnlineService] = useState(searchParams.get("onlineService") ?? "");
  const [providerType, setProviderType] = useState(searchParams.get("providerType") ?? "");

  // Category-specific filters — Работа
  const [jobCategory, setJobCategory] = useState(searchParams.get("jobCategory") ?? "");
  const [employmentType, setEmploymentType] = useState(searchParams.get("employmentType") ?? "");
  const [experience, setExperience] = useState(searchParams.get("experience") ?? "");
  const [remote, setRemote] = useState(searchParams.get("remote") ?? "");
  const [salaryFrom, setSalaryFrom] = useState(searchParams.get("salaryFrom") ?? "");
  const [salaryTo, setSalaryTo] = useState(searchParams.get("salaryTo") ?? "");

  // Category-specific filters — Компютри
  const [compType, setCompType] = useState(searchParams.get("compType") ?? "");
  const [compBrand, setCompBrand] = useState(searchParams.get("compBrand") ?? "");
  const [compCondition, setCompCondition] = useState(searchParams.get("compCondition") ?? "");

  // Category-specific filters — Детски стоки
  const [kidsItemType, setKidsItemType] = useState(searchParams.get("kidsItemType") ?? "");
  const [kidsAgeGroup, setKidsAgeGroup] = useState(searchParams.get("kidsAgeGroup") ?? "");
  const [kidsGender, setKidsGender] = useState(searchParams.get("kidsGender") ?? "");
  const [kidsCondition, setKidsCondition] = useState(searchParams.get("kidsCondition") ?? "");

  // Category-specific filters — Дом и градина
  const [homeSubcategory, setHomeSubcategory] = useState(searchParams.get("homeSubcategory") ?? "");
  const [homeCondition, setHomeCondition] = useState(searchParams.get("homeCondition") ?? "");

  // Category-specific filters — Мода
  const [fashionType, setFashionType] = useState(searchParams.get("fashionType") ?? "");
  const [fashionGender, setFashionGender] = useState(searchParams.get("fashionGender") ?? "");
  const [fashionSize, setFashionSize] = useState(searchParams.get("fashionSize") ?? "");
  const [fashionCondition, setFashionCondition] = useState(searchParams.get("fashionCondition") ?? "");

  // Category-specific filters — Спорт и хоби
  const [sportCategory, setSportCategory] = useState(searchParams.get("sportCategory") ?? "");
  const [sportCondition, setSportCondition] = useState(searchParams.get("sportCondition") ?? "");

  // Category-specific filters — Книги
  const [bookGenre, setBookGenre] = useState(searchParams.get("bookGenre") ?? "");
  const [bookCondition, setBookCondition] = useState(searchParams.get("bookCondition") ?? "");
  const [bookLanguage, setBookLanguage] = useState(searchParams.get("bookLanguage") ?? "");

  // Dropdown open state (tracks which key is open)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Save search state
  const [savingSearch, setSavingSearch] = useState(false);
  const [saveNotice, setSaveNotice] = useState<"saved" | "duplicate" | "error" | null>(null);

  // URL-committed values (used for actual queries)
  const search = searchParams.get("search") ?? "";
  const city = searchParams.get("city") ?? "";
  const category = searchParams.get("category") ?? "";
  const type = searchParams.get("type") ?? "";
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";

  const urlPropertyPurpose = searchParams.get("propertyPurpose") ?? "";
  const urlPropertyType = searchParams.get("propertyType") ?? "";
  const urlRooms = searchParams.get("rooms") ?? "";
  const urlFloor = searchParams.get("floor") ?? "";
  const urlSqmMin = searchParams.get("sqmMin") ?? "";
  const urlSqmMax = searchParams.get("sqmMax") ?? "";
  const urlFurnished = searchParams.get("furnished") ?? "";
  const urlHeating = searchParams.get("heating") ?? "";
  const urlConstructionType = searchParams.get("constructionType") ?? "";
  const urlPropertyCondition = searchParams.get("propertyCondition") ?? "";
  const urlElevator = searchParams.get("elevator") ?? "";
  const urlParking = searchParams.get("parking") ?? "";
  const urlVehicleType = searchParams.get("vehicleType") ?? "";
  const urlCarMake = searchParams.get("carMake") ?? "";
  const urlCarModel = searchParams.get("carModel") ?? "";
  const urlYearFrom = searchParams.get("yearFrom") ?? "";
  const urlYearTo = searchParams.get("yearTo") ?? "";
  const urlFuel = searchParams.get("fuel") ?? "";
  const urlTransmission = searchParams.get("transmission") ?? "";
  const urlMileageFrom = searchParams.get("mileageFrom") ?? "";
  const urlMileageTo = searchParams.get("mileageTo") ?? "";
  const urlEngineSizeFrom = searchParams.get("engineSizeFrom") ?? "";
  const urlEngineSizeTo = searchParams.get("engineSizeTo") ?? "";
  const urlPowerFrom = searchParams.get("powerFrom") ?? "";
  const urlPowerTo = searchParams.get("powerTo") ?? "";
  const urlEuroStandard = searchParams.get("euroStandard") ?? "";
  const urlBodyType = searchParams.get("bodyType") ?? "";
  const urlDriveType = searchParams.get("driveType") ?? "";
  const urlCarColor = searchParams.get("carColor") ?? "";
  const urlCarCondition = searchParams.get("carCondition") ?? "";
  const urlPartType = searchParams.get("partType") ?? "";
  const urlElDeviceType = searchParams.get("elDeviceType") ?? "";
  const urlElBrand = searchParams.get("elBrand") ?? "";
  const urlElModel = searchParams.get("elModel") ?? "";
  const urlElCondition = searchParams.get("elCondition") ?? "";
  const urlElStorage = searchParams.get("elStorage") ?? "";
  const urlElRam = searchParams.get("elRam") ?? "";
  const urlElColor = searchParams.get("elColor") ?? "";
  // Legacy params (still read for backward compat)
  const urlElectronicsSubcat = searchParams.get("electronicsSubcat") ?? "";
  const urlCondition = searchParams.get("condition") ?? "";
  const urlBrand = searchParams.get("brand") ?? "";
  const urlServiceType = searchParams.get("serviceType") ?? "";
  const urlServiceCategory = searchParams.get("serviceCategory") ?? "";
  const urlOnlineService = searchParams.get("onlineService") ?? "";
  const urlProviderType = searchParams.get("providerType") ?? "";
  const urlJobCategory = searchParams.get("jobCategory") ?? "";
  const urlEmploymentType = searchParams.get("employmentType") ?? "";
  const urlExperience = searchParams.get("experience") ?? "";
  const urlRemote = searchParams.get("remote") ?? "";
  const urlSalaryFrom = searchParams.get("salaryFrom") ?? "";
  const urlSalaryTo = searchParams.get("salaryTo") ?? "";
  const urlCompType = searchParams.get("compType") ?? "";
  const urlCompBrand = searchParams.get("compBrand") ?? "";
  const urlCompCondition = searchParams.get("compCondition") ?? "";
  const urlKidsItemType = searchParams.get("kidsItemType") ?? "";
  const urlKidsAgeGroup = searchParams.get("kidsAgeGroup") ?? "";
  const urlKidsGender = searchParams.get("kidsGender") ?? "";
  const urlKidsCondition = searchParams.get("kidsCondition") ?? "";
  const urlHomeSubcategory = searchParams.get("homeSubcategory") ?? "";
  const urlHomeCondition = searchParams.get("homeCondition") ?? "";
  const urlFashionType = searchParams.get("fashionType") ?? "";
  const urlFashionGender = searchParams.get("fashionGender") ?? "";
  const urlFashionSize = searchParams.get("fashionSize") ?? "";
  const urlFashionCondition = searchParams.get("fashionCondition") ?? "";
  const urlSportCategory = searchParams.get("sportCategory") ?? "";
  const urlSportCondition = searchParams.get("sportCondition") ?? "";
  const urlBookGenre = searchParams.get("bookGenre") ?? "";
  const urlBookCondition = searchParams.get("bookCondition") ?? "";
  const urlBookLanguage = searchParams.get("bookLanguage") ?? "";

  const hasFilters =
    search.trim().length > 0 ||
    city.trim().length > 0 ||
    category.trim().length > 0 ||
    type.trim().length > 0 ||
    minPrice.trim().length > 0 ||
    maxPrice.trim().length > 0 ||
    urlPropertyPurpose.length > 0 ||
    urlPropertyType.length > 0 ||
    urlRooms.length > 0 ||
    urlFloor.length > 0 ||
    urlSqmMin.length > 0 ||
    urlSqmMax.length > 0 ||
    urlFurnished.length > 0 ||
    urlHeating.length > 0 ||
    urlConstructionType.length > 0 ||
    urlPropertyCondition.length > 0 ||
    urlElevator.length > 0 ||
    urlParking.length > 0 ||
    urlVehicleType.length > 0 ||
    urlCarMake.length > 0 ||
    urlCarModel.length > 0 ||
    urlYearFrom.length > 0 ||
    urlYearTo.length > 0 ||
    urlFuel.length > 0 ||
    urlTransmission.length > 0 ||
    urlMileageFrom.length > 0 ||
    urlMileageTo.length > 0 ||
    urlEngineSizeFrom.length > 0 ||
    urlEngineSizeTo.length > 0 ||
    urlPowerFrom.length > 0 ||
    urlPowerTo.length > 0 ||
    urlEuroStandard.length > 0 ||
    urlBodyType.length > 0 ||
    urlDriveType.length > 0 ||
    urlCarColor.length > 0 ||
    urlCarCondition.length > 0 ||
    urlPartType.length > 0 ||
    urlElDeviceType.length > 0 ||
    urlElBrand.length > 0 ||
    urlElModel.length > 0 ||
    urlElCondition.length > 0 ||
    urlElStorage.length > 0 ||
    urlElRam.length > 0 ||
    urlElColor.length > 0 ||
    urlElectronicsSubcat.length > 0 ||
    urlCondition.length > 0 ||
    urlBrand.length > 0 ||
    urlServiceType.length > 0 ||
    urlServiceCategory.length > 0 ||
    urlOnlineService.length > 0 ||
    urlProviderType.length > 0 ||
    urlJobCategory.length > 0 ||
    urlEmploymentType.length > 0 ||
    urlExperience.length > 0 ||
    urlRemote.length > 0 ||
    urlSalaryFrom.length > 0 ||
    urlSalaryTo.length > 0 ||
    urlCompType.length > 0 ||
    urlCompBrand.length > 0 ||
    urlCompCondition.length > 0 ||
    urlKidsItemType.length > 0 ||
    urlKidsAgeGroup.length > 0 ||
    urlKidsGender.length > 0 ||
    urlKidsCondition.length > 0 ||
    urlHomeSubcategory.length > 0 ||
    urlHomeCondition.length > 0 ||
    urlFashionType.length > 0 ||
    urlFashionGender.length > 0 ||
    urlFashionSize.length > 0 ||
    urlFashionCondition.length > 0 ||
    urlSportCategory.length > 0 ||
    urlSportCondition.length > 0 ||
    urlBookGenre.length > 0 ||
    urlBookCondition.length > 0 ||
    urlBookLanguage.length > 0;

  const hasSpecificFilters = CATEGORY_SPECIFIC.includes(categoryInput);

  // Sync local state when category changes (clear category-specific fields)
  useEffect(() => {
    setPropertyPurpose(searchParams.get("propertyPurpose") ?? "");
    setPropertyType(searchParams.get("propertyType") ?? "");
    setRooms(searchParams.get("rooms") ?? "");
    setFloor(searchParams.get("floor") ?? "");
    setSqmMin(searchParams.get("sqmMin") ?? "");
    setSqmMax(searchParams.get("sqmMax") ?? "");
    setFurnished(searchParams.get("furnished") ?? "");
    setHeating(searchParams.get("heating") ?? "");
    setConstructionType(searchParams.get("constructionType") ?? "");
    setPropertyCondition(searchParams.get("propertyCondition") ?? "");
    setElevator(searchParams.get("elevator") ?? "");
    setParking(searchParams.get("parking") ?? "");
    setVehicleType(searchParams.get("vehicleType") ?? "");
    setCarMake(searchParams.get("carMake") ?? "");
    setCarModel(searchParams.get("carModel") ?? "");
    setYearFrom(searchParams.get("yearFrom") ?? "");
    setYearTo(searchParams.get("yearTo") ?? "");
    setFuel(searchParams.get("fuel") ?? "");
    setTransmission(searchParams.get("transmission") ?? "");
    setMileageFrom(searchParams.get("mileageFrom") ?? "");
    setMileageTo(searchParams.get("mileageTo") ?? "");
    setEngineSizeFrom(searchParams.get("engineSizeFrom") ?? "");
    setEngineSizeTo(searchParams.get("engineSizeTo") ?? "");
    setPowerFrom(searchParams.get("powerFrom") ?? "");
    setPowerTo(searchParams.get("powerTo") ?? "");
    setEuroStandard(searchParams.get("euroStandard") ?? "");
    setBodyType(searchParams.get("bodyType") ?? "");
    setDriveType(searchParams.get("driveType") ?? "");
    setCarColor(searchParams.get("carColor") ?? "");
    setCarCondition(searchParams.get("carCondition") ?? "");
    setPartType(searchParams.get("partType") ?? "");
    setElDeviceType(searchParams.get("elDeviceType") ?? "");
    setElBrand(searchParams.get("elBrand") ?? "");
    setElModel(searchParams.get("elModel") ?? "");
    setElCondition(searchParams.get("elCondition") ?? "");
    setElStorage(searchParams.get("elStorage") ?? "");
    setElRam(searchParams.get("elRam") ?? "");
    setElColor(searchParams.get("elColor") ?? "");
    setElectronicsSubcat(searchParams.get("electronicsSubcat") ?? "");
    setCondition(searchParams.get("condition") ?? "");
    setBrand(searchParams.get("brand") ?? "");
    setServiceType(searchParams.get("serviceType") ?? "");
    setServiceCategory(searchParams.get("serviceCategory") ?? "");
    setOnlineService(searchParams.get("onlineService") ?? "");
    setProviderType(searchParams.get("providerType") ?? "");
    setJobCategory(searchParams.get("jobCategory") ?? "");
    setEmploymentType(searchParams.get("employmentType") ?? "");
    setExperience(searchParams.get("experience") ?? "");
    setRemote(searchParams.get("remote") ?? "");
    setSalaryFrom(searchParams.get("salaryFrom") ?? "");
    setSalaryTo(searchParams.get("salaryTo") ?? "");
    setCompType(searchParams.get("compType") ?? "");
    setCompBrand(searchParams.get("compBrand") ?? "");
    setCompCondition(searchParams.get("compCondition") ?? "");
    setKidsItemType(searchParams.get("kidsItemType") ?? "");
    setKidsAgeGroup(searchParams.get("kidsAgeGroup") ?? "");
    setKidsGender(searchParams.get("kidsGender") ?? "");
    setKidsCondition(searchParams.get("kidsCondition") ?? "");
    setHomeSubcategory(searchParams.get("homeSubcategory") ?? "");
    setHomeCondition(searchParams.get("homeCondition") ?? "");
    setFashionType(searchParams.get("fashionType") ?? "");
    setFashionGender(searchParams.get("fashionGender") ?? "");
    setFashionSize(searchParams.get("fashionSize") ?? "");
    setFashionCondition(searchParams.get("fashionCondition") ?? "");
    setSportCategory(searchParams.get("sportCategory") ?? "");
    setSportCondition(searchParams.get("sportCondition") ?? "");
    setBookGenre(searchParams.get("bookGenre") ?? "");
    setBookCondition(searchParams.get("bookCondition") ?? "");
    setBookLanguage(searchParams.get("bookLanguage") ?? "");
    setCategoryInput(searchParams.get("category") ?? "");
    setTypeInput(searchParams.get("type") ?? "");
    setSearchInput(searchParams.get("search") ?? "");
    setCityInput(searchParams.get("city") ?? "");
    setMinPriceInput(searchParams.get("minPrice") ?? "");
    setMaxPriceInput(searchParams.get("maxPrice") ?? "");
    setSort(searchParams.get("sort") ?? "newest");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  const applyFilters = () => {
    const params = new URLSearchParams();

    if (sort && sort !== "newest") params.set("sort", sort);
    if (searchInput.trim()) params.set("search", searchInput.trim());
    if (cityInput.trim()) params.set("city", cityInput.trim());
    if (categoryInput.trim()) params.set("category", categoryInput.trim());
    if (typeInput.trim()) params.set("type", typeInput.trim());
    if (minPriceInput.trim()) params.set("minPrice", minPriceInput.trim());
    if (maxPriceInput.trim()) params.set("maxPrice", maxPriceInput.trim());

    // Category-specific — only serialize params that belong to the selected category.
    // This prevents stale filters from a previous category contaminating results.
    const cat = categoryInput.trim();

    if (cat === "Имоти") {
      if (propertyPurpose) params.set("propertyPurpose", propertyPurpose);
      if (propertyType) params.set("propertyType", propertyType);
      if (rooms) params.set("rooms", rooms);
      if (floor) params.set("floor", floor);
      if (sqmMin.trim()) params.set("sqmMin", sqmMin.trim());
      if (sqmMax.trim()) params.set("sqmMax", sqmMax.trim());
      if (furnished) params.set("furnished", furnished);
      if (heating) params.set("heating", heating);
      if (constructionType) params.set("constructionType", constructionType);
      if (propertyCondition) params.set("propertyCondition", propertyCondition);
      if (elevator) params.set("elevator", elevator);
      if (parking) params.set("parking", parking);
    }

    if (cat === "Автомобили") {
      if (vehicleType) params.set("vehicleType", vehicleType);
      if (carMake) params.set("carMake", carMake);
      if (carModel.trim()) params.set("carModel", carModel.trim());
      if (yearFrom.trim()) params.set("yearFrom", yearFrom.trim());
      if (yearTo.trim()) params.set("yearTo", yearTo.trim());
      if (fuel) params.set("fuel", fuel);
      if (transmission) params.set("transmission", transmission);
      if (mileageFrom.trim()) params.set("mileageFrom", mileageFrom.trim());
      if (mileageTo.trim()) params.set("mileageTo", mileageTo.trim());
      if (engineSizeFrom.trim()) params.set("engineSizeFrom", engineSizeFrom.trim());
      if (engineSizeTo.trim()) params.set("engineSizeTo", engineSizeTo.trim());
      if (powerFrom.trim()) params.set("powerFrom", powerFrom.trim());
      if (powerTo.trim()) params.set("powerTo", powerTo.trim());
      if (euroStandard) params.set("euroStandard", euroStandard);
      if (bodyType) params.set("bodyType", bodyType);
      if (driveType) params.set("driveType", driveType);
      if (carColor) params.set("carColor", carColor);
      if (carCondition) params.set("carCondition", carCondition);
    }

    if (cat === "Авточасти") {
      if (carMake) params.set("carMake", carMake);
      if (carModel.trim()) params.set("carModel", carModel.trim());
      if (partType) params.set("partType", partType);
      if (condition) params.set("condition", condition);
    }

    if (cat === "Електроника") {
      if (elDeviceType) params.set("elDeviceType", elDeviceType);
      if (elBrand) params.set("elBrand", elBrand);
      if (elModel.trim()) params.set("elModel", elModel.trim());
      if (elCondition) params.set("elCondition", elCondition);
      if (elStorage) params.set("elStorage", elStorage);
      if (elRam) params.set("elRam", elRam);
      if (elColor) params.set("elColor", elColor);
    }

    if (cat === "Услуги") {
      if (serviceCategory) params.set("serviceCategory", serviceCategory);
      if (onlineService) params.set("onlineService", onlineService);
      if (providerType) params.set("providerType", providerType);
    }

    if (cat === "Работа") {
      if (jobCategory) params.set("jobCategory", jobCategory);
      if (employmentType) params.set("employmentType", employmentType);
      if (experience) params.set("experience", experience);
      if (remote) params.set("remote", remote);
      if (salaryFrom.trim()) params.set("salaryFrom", salaryFrom.trim());
      if (salaryTo.trim()) params.set("salaryTo", salaryTo.trim());
    }

    if (cat === "Компютри") {
      if (compType) params.set("compType", compType);
      if (compBrand) params.set("compBrand", compBrand);
      if (compCondition) params.set("compCondition", compCondition);
    }

    if (cat === "Детски стоки") {
      if (kidsItemType) params.set("kidsItemType", kidsItemType);
      if (kidsAgeGroup) params.set("kidsAgeGroup", kidsAgeGroup);
      if (kidsGender) params.set("kidsGender", kidsGender);
      if (kidsCondition) params.set("kidsCondition", kidsCondition);
    }

    if (cat === "Дом и градина") {
      if (homeSubcategory) params.set("homeSubcategory", homeSubcategory);
      if (homeCondition) params.set("homeCondition", homeCondition);
    }

    if (cat === "Мода") {
      if (fashionType) params.set("fashionType", fashionType);
      if (fashionGender) params.set("fashionGender", fashionGender);
      if (fashionSize) params.set("fashionSize", fashionSize);
      if (fashionCondition) params.set("fashionCondition", fashionCondition);
    }

    if (cat === "Спорт и хоби") {
      if (sportCategory) params.set("sportCategory", sportCategory);
      if (sportCondition) params.set("sportCondition", sportCondition);
    }

    if (cat === "Книги") {
      if (bookGenre) params.set("bookGenre", bookGenre);
      if (bookCondition) params.set("bookCondition", bookCondition);
      if (bookLanguage) params.set("bookLanguage", bookLanguage);
    }

    router.push(`/listings${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const saveSearch = async () => {
    setSavingSearch(true);
    setSaveNotice(null);

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user ?? null;

    if (!user) {
      setSavingSearch(false);
      setSaveNotice("error");
      return;
    }

    // Build filters object for extra params
    const filters: Record<string, string> = {};
    if (minPrice) filters.minPrice = minPrice;
    if (maxPrice) filters.maxPrice = maxPrice;
    if (urlPropertyPurpose) filters.propertyPurpose = urlPropertyPurpose;
    if (urlPropertyType) filters.propertyType = urlPropertyType;
    if (urlRooms) filters.rooms = urlRooms;
    if (urlFloor) filters.floor = urlFloor;
    if (urlSqmMin) filters.sqmMin = urlSqmMin;
    if (urlSqmMax) filters.sqmMax = urlSqmMax;
    if (urlFurnished) filters.furnished = urlFurnished;
    if (urlHeating) filters.heating = urlHeating;
    if (urlConstructionType) filters.constructionType = urlConstructionType;
    if (urlPropertyCondition) filters.propertyCondition = urlPropertyCondition;
    if (urlElevator) filters.elevator = urlElevator;
    if (urlParking) filters.parking = urlParking;
    if (urlVehicleType) filters.vehicleType = urlVehicleType;
    if (urlCarMake) filters.carMake = urlCarMake;
    if (urlCarModel) filters.carModel = urlCarModel;
    if (urlYearFrom) filters.yearFrom = urlYearFrom;
    if (urlYearTo) filters.yearTo = urlYearTo;
    if (urlFuel) filters.fuel = urlFuel;
    if (urlTransmission) filters.transmission = urlTransmission;
    if (urlMileageFrom) filters.mileageFrom = urlMileageFrom;
    if (urlMileageTo) filters.mileageTo = urlMileageTo;
    if (urlEngineSizeFrom) filters.engineSizeFrom = urlEngineSizeFrom;
    if (urlEngineSizeTo) filters.engineSizeTo = urlEngineSizeTo;
    if (urlPowerFrom) filters.powerFrom = urlPowerFrom;
    if (urlPowerTo) filters.powerTo = urlPowerTo;
    if (urlEuroStandard) filters.euroStandard = urlEuroStandard;
    if (urlBodyType) filters.bodyType = urlBodyType;
    if (urlDriveType) filters.driveType = urlDriveType;
    if (urlCarColor) filters.carColor = urlCarColor;
    if (urlCarCondition) filters.carCondition = urlCarCondition;
    if (urlPartType) filters.partType = urlPartType;
    if (urlElDeviceType) filters.elDeviceType = urlElDeviceType;
    if (urlElBrand) filters.elBrand = urlElBrand;
    if (urlElModel) filters.elModel = urlElModel;
    if (urlElCondition) filters.elCondition = urlElCondition;
    if (urlElStorage) filters.elStorage = urlElStorage;
    if (urlElRam) filters.elRam = urlElRam;
    if (urlElColor) filters.elColor = urlElColor;
    if (urlCondition) filters.condition = urlCondition;
    if (urlServiceCategory) filters.serviceCategory = urlServiceCategory;
    if (urlOnlineService) filters.onlineService = urlOnlineService;
    if (urlProviderType) filters.providerType = urlProviderType;
    if (urlJobCategory) filters.jobCategory = urlJobCategory;
    if (urlEmploymentType) filters.employmentType = urlEmploymentType;
    if (urlExperience) filters.experience = urlExperience;
    if (urlRemote) filters.remote = urlRemote;
    if (urlSalaryFrom) filters.salaryFrom = urlSalaryFrom;
    if (urlSalaryTo) filters.salaryTo = urlSalaryTo;
    if (urlCompType) filters.compType = urlCompType;
    if (urlCompBrand) filters.compBrand = urlCompBrand;
    if (urlCompCondition) filters.compCondition = urlCompCondition;
    if (urlKidsItemType) filters.kidsItemType = urlKidsItemType;
    if (urlKidsAgeGroup) filters.kidsAgeGroup = urlKidsAgeGroup;
    if (urlKidsGender) filters.kidsGender = urlKidsGender;
    if (urlKidsCondition) filters.kidsCondition = urlKidsCondition;
    if (urlHomeSubcategory) filters.homeSubcategory = urlHomeSubcategory;
    if (urlHomeCondition) filters.homeCondition = urlHomeCondition;
    if (urlFashionType) filters.fashionType = urlFashionType;
    if (urlFashionGender) filters.fashionGender = urlFashionGender;
    if (urlFashionSize) filters.fashionSize = urlFashionSize;
    if (urlFashionCondition) filters.fashionCondition = urlFashionCondition;
    if (urlSportCategory) filters.sportCategory = urlSportCategory;
    if (urlSportCondition) filters.sportCondition = urlSportCondition;
    if (urlBookGenre) filters.bookGenre = urlBookGenre;
    if (urlBookCondition) filters.bookCondition = urlBookCondition;
    if (urlBookLanguage) filters.bookLanguage = urlBookLanguage;

    // Check for duplicate (same user + same key params).
    // Fields are stored as null when empty, so we must use .is() for null
    // and .eq() for non-empty — .eq("category", "") never matches a null row.
    let dupQuery = supabase
      .from("saved_searches")
      .select("id")
      .eq("user_id", user.id);

    if (category) dupQuery = dupQuery.eq("category", category);
    else dupQuery = dupQuery.is("category", null);

    if (type) dupQuery = dupQuery.eq("listing_type", type);
    else dupQuery = dupQuery.is("listing_type", null);

    if (city) dupQuery = dupQuery.eq("city", city);
    else dupQuery = dupQuery.is("city", null);

    if (search) dupQuery = dupQuery.eq("search", search);
    else dupQuery = dupQuery.is("search", null);

    const { data: existing } = await dupQuery.maybeSingle();

    if (existing) {
      setSavingSearch(false);
      setSaveNotice("duplicate");
      setTimeout(() => setSaveNotice(null), 3000);
      return;
    }

    // Build a human-readable title
    const parts = [category, type, city, search].filter(Boolean);
    const title = parts.length > 0 ? parts.join(" · ") : "Търсене";

    const { error } = await supabase.from("saved_searches").insert({
      user_id: user.id,
      title,
      category: category || null,
      listing_type: type || null,
      city: city || null,
      search: search || null,
      filters,
    });

    setSavingSearch(false);
    setSaveNotice(error ? "error" : "saved");
    setTimeout(() => setSaveNotice(null), 3000);
  };

  const clearFilters = () => {
    setSearchInput(""); setCityInput(""); setCategoryInput("");
    setTypeInput(""); setMinPriceInput(""); setMaxPriceInput("");
    setPropertyPurpose(""); setPropertyType(""); setRooms(""); setFloor("");
    setSqmMin(""); setSqmMax("");
    setFurnished(""); setHeating(""); setConstructionType(""); setPropertyCondition("");
    setElevator(""); setParking("");
    setVehicleType("");
    setCarMake(""); setCarModel(""); setYearFrom(""); setYearTo("");
    setFuel(""); setTransmission(""); setMileageFrom(""); setMileageTo("");
    setEngineSizeFrom(""); setEngineSizeTo(""); setPowerFrom(""); setPowerTo("");
    setEuroStandard(""); setBodyType(""); setDriveType(""); setCarColor(""); setCarCondition("");
    setPartType("");
    setElDeviceType(""); setElBrand(""); setElModel(""); setElCondition("");
    setElStorage(""); setElRam(""); setElColor("");
    setElectronicsSubcat(""); setCondition(""); setBrand("");
    setServiceType(""); setServiceCategory(""); setOnlineService(""); setProviderType("");
    setJobCategory(""); setEmploymentType(""); setExperience(""); setRemote("");
    setSalaryFrom(""); setSalaryTo("");
    setCompType(""); setCompBrand(""); setCompCondition("");
    setKidsItemType(""); setKidsAgeGroup(""); setKidsGender(""); setKidsCondition("");
    setHomeSubcategory(""); setHomeCondition("");
    setFashionType(""); setFashionGender(""); setFashionSize(""); setFashionCondition("");
    setSportCategory(""); setSportCondition("");
    setBookGenre(""); setBookCondition(""); setBookLanguage("");
    setOpenDropdown(null);
    router.push("/listings");
  };

  // -------------------------------------------------------------------------
  // Load listings
  // -------------------------------------------------------------------------

  useEffect(() => {
    const loadListings = async () => {
      setLoading(true);

      let query = supabase
        .from("listings")
        .select(
          "id, title, description, price, city, category, listing_type, created_at, image_url, image_urls, details"
        )
        .or("hidden.is.null,hidden.eq.false")
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .or("moderation_status.is.null,moderation_status.eq.approved")
        .order("created_at", { ascending: false });

      if (search.trim()) {
        const sv = `%${search.trim()}%`;
        query = query.or(`title.ilike.${sv},description.ilike.${sv}`);
      }

      if (city.trim()) query = query.ilike("city", `%${city.trim()}%`);
      if (category.trim()) query = query.eq("category", category.trim());
      if (type.trim()) query = query.eq("listing_type", type.trim());

      const { data, error } = await query;

      if (error || !data) {
        setListings([]);
        setLoading(false);
        return;
      }

      // Client-side filtering (until DB columns are added and indexed)
      const filtered = (data as Listing[]).filter((l) => {
        // Price
        const numericPrice = getNumericPrice(l.price);
        if (minPrice.trim()) {
          const min = Number(minPrice.replace(",", "."));
          if (Number.isFinite(min) && (numericPrice === null || numericPrice < min)) return false;
        }
        if (maxPrice.trim()) {
          const max = Number(maxPrice.replace(",", "."));
          if (Number.isFinite(max) && (numericPrice === null || numericPrice > max)) return false;
        }

        // details JSONB (shared by all category checks below)
        const d = (l.details ?? {}) as Record<string, string>;

        // Имоти — check details JSONB first, fall back to old dedicated columns

        if (urlPropertyPurpose && d.property_purpose !== urlPropertyPurpose) return false;
        if (urlPropertyType) {
          if (d.property_type !== urlPropertyType && l.property_type !== urlPropertyType) return false;
        }
        if (urlRooms) {
          if (d.rooms !== urlRooms && l.rooms !== urlRooms) return false;
        }
        if (urlFloor && d.floor !== urlFloor) return false;
        if (urlSqmMin) {
          const area = Number(d.area ?? l.area_sqm);
          if (Number.isFinite(area) && area < Number(urlSqmMin)) return false;
        }
        if (urlSqmMax) {
          const area = Number(d.area ?? l.area_sqm);
          if (Number.isFinite(area) && area > Number(urlSqmMax)) return false;
        }
        if (urlFurnished && d.furnished !== urlFurnished) return false;
        if (urlHeating && d.heating !== urlHeating) return false;
        if (urlConstructionType && d.construction_type !== urlConstructionType) return false;
        if (urlPropertyCondition && d.property_condition !== urlPropertyCondition) return false;
        if (urlElevator && d.elevator !== urlElevator) return false;
        if (urlParking && d.parking !== urlParking) return false;

        // Автомобили / Авточасти
        // Check both old dedicated columns (legacy) and new details JSONB (current)

        if (urlVehicleType && d.vehicle_type !== urlVehicleType) return false;

        // carMake/carModel in vehicles context only (Авточасти has its own check below)
        if (category !== "Авточасти") {
          if (urlCarMake) {
            const makeNew = d.brand?.toLowerCase();
            const makeOld = l.car_make?.toLowerCase();
            if (makeNew !== urlCarMake.toLowerCase() && makeOld !== urlCarMake.toLowerCase()) return false;
          }
          if (urlCarModel) {
            const modelNew = d.model?.toLowerCase();
            const modelOld = l.car_model?.toLowerCase();
            const q = urlCarModel.toLowerCase();
            if (!modelNew?.includes(q) && !modelOld?.includes(q)) return false;
          }
        }
        if (urlYearFrom) {
          const yr = Number(d.year ?? l.car_year);
          if (Number.isFinite(yr) && yr < Number(urlYearFrom)) return false;
        }
        if (urlYearTo) {
          const yr = Number(d.year ?? l.car_year);
          if (Number.isFinite(yr) && yr > Number(urlYearTo)) return false;
        }
        if (urlFuel) {
          if (d.fuel !== urlFuel && l.fuel_type !== urlFuel) return false;
        }
        if (urlTransmission) {
          if (d.gearbox !== urlTransmission && l.transmission !== urlTransmission) return false;
        }
        if (urlMileageFrom) {
          const mi = Number(d.mileage ?? l.mileage);
          if (Number.isFinite(mi) && mi < Number(urlMileageFrom)) return false;
        }
        if (urlMileageTo) {
          const mi = Number(d.mileage ?? l.mileage);
          if (Number.isFinite(mi) && mi > Number(urlMileageTo)) return false;
        }
        if (urlEngineSizeFrom) {
          const es = Number(d.engine_size);
          if (Number.isFinite(es) && es < Number(urlEngineSizeFrom)) return false;
        }
        if (urlEngineSizeTo) {
          const es = Number(d.engine_size);
          if (Number.isFinite(es) && es > Number(urlEngineSizeTo)) return false;
        }
        if (urlPowerFrom) {
          const pw = Number(d.power);
          if (Number.isFinite(pw) && pw < Number(urlPowerFrom)) return false;
        }
        if (urlPowerTo) {
          const pw = Number(d.power);
          if (Number.isFinite(pw) && pw > Number(urlPowerTo)) return false;
        }
        if (urlEuroStandard && d.euro_standard !== urlEuroStandard) return false;
        if (urlBodyType && d.body_type !== urlBodyType) return false;
        if (urlDriveType && d.drive_type !== urlDriveType) return false;
        if (urlCarColor && d.color !== urlCarColor) return false;
        if (urlCarCondition && d.condition !== urlCarCondition) return false;
        // Авточасти — check details JSONB (new) and old DB columns (legacy)
        if (urlCarMake && category === "Авточасти") {
          if (d.car_brand?.toLowerCase() !== urlCarMake.toLowerCase() && l.car_make?.toLowerCase() !== urlCarMake.toLowerCase()) return false;
        }
        if (urlCarModel && category === "Авточасти") {
          const q = urlCarModel.toLowerCase();
          if (!d.car_model?.toLowerCase().includes(q) && !l.car_model?.toLowerCase().includes(q)) return false;
        }
        if (urlPartType) {
          if (d.part_category !== urlPartType && l.part_type !== urlPartType) return false;
        }
        if (urlCondition && category === "Авточасти") {
          if (d.condition !== urlCondition && l.condition !== urlCondition) return false;
        }

        // Електроника — check details JSONB for new listings, old columns for legacy
        if (urlElDeviceType) {
          if (d.device_type !== urlElDeviceType && l.electronics_subcategory !== urlElDeviceType) return false;
        }
        if (urlElBrand && d.brand !== urlElBrand) return false;
        if (urlElModel && !d.model?.toLowerCase().includes(urlElModel.toLowerCase())) return false;
        if (urlElCondition && d.condition !== urlElCondition) return false;
        if (urlElStorage && d.storage !== urlElStorage) return false;
        if (urlElRam && d.ram !== urlElRam) return false;
        if (urlElColor && d.color !== urlElColor) return false;
        // Legacy params (old saved searches)
        if (urlElectronicsSubcat && l.electronics_subcategory !== urlElectronicsSubcat) return false;
        if (urlCondition && l.condition !== urlCondition) return false;

        // Услуги — check details JSONB (new) and old column (legacy)
        if (urlServiceCategory) {
          if (d.service_category !== urlServiceCategory && l.service_type !== urlServiceCategory) return false;
        }
        if (urlOnlineService && d.online_service !== urlOnlineService) return false;
        if (urlProviderType && d.provider_type !== urlProviderType) return false;
        // Legacy: old serviceType URL param still works for old saved searches
        if (urlServiceType && l.service_type !== urlServiceType && d.service_category !== urlServiceType) return false;

        // Работа
        if (urlJobCategory && d.job_category !== urlJobCategory) return false;
        if (urlEmploymentType && d.employment_type !== urlEmploymentType) return false;
        if (urlExperience && d.experience !== urlExperience) return false;
        if (urlRemote && d.remote !== urlRemote) return false;
        if (urlSalaryFrom) {
          const sf = Number(d.salary_from);
          if (Number.isFinite(sf) && sf < Number(urlSalaryFrom)) return false;
        }
        if (urlSalaryTo) {
          const st = Number(d.salary_to);
          if (Number.isFinite(st) && st > Number(urlSalaryTo)) return false;
        }

        // Компютри
        if (urlCompType && d.computer_type !== urlCompType) return false;
        if (urlCompBrand && d.brand !== urlCompBrand) return false;
        if (urlCompCondition && d.condition !== urlCompCondition) return false;

        // Детски стоки
        if (urlKidsItemType && d.item_type !== urlKidsItemType) return false;
        if (urlKidsAgeGroup && d.age_group !== urlKidsAgeGroup) return false;
        if (urlKidsGender && d.gender !== urlKidsGender) return false;
        if (urlKidsCondition && d.condition !== urlKidsCondition) return false;

        // Дом и градина
        if (urlHomeSubcategory && d.subcategory !== urlHomeSubcategory) return false;
        if (urlHomeCondition && d.condition !== urlHomeCondition) return false;

        // Мода
        if (urlFashionType && d.clothing_type !== urlFashionType) return false;
        if (urlFashionGender && d.gender !== urlFashionGender) return false;
        if (urlFashionSize && d.size !== urlFashionSize) return false;
        if (urlFashionCondition && d.condition !== urlFashionCondition) return false;

        // Спорт и хоби
        if (urlSportCategory && d.sport_category !== urlSportCategory) return false;
        if (urlSportCondition && d.condition !== urlSportCondition) return false;

        // Книги
        if (urlBookGenre && d.genre !== urlBookGenre) return false;
        if (urlBookCondition && d.condition !== urlBookCondition) return false;
        if (urlBookLanguage && d.language !== urlBookLanguage) return false;

        return true;
      });

      const urlSort = searchParams.get("sort") ?? "newest";
      if (urlSort === "cheapest" || urlSort === "priciest") {
        const parsePrice = (v: string | number | null): number => {
          if (v === null || v === "") return -1;
          const n = parseFloat(String(v).replace(/[^\d.]/g, ""));
          return Number.isFinite(n) ? n : -1;
        };
        filtered.sort((a, b) => {
          const pa = parsePrice(a.price);
          const pb = parsePrice(b.price);
          // Push unpriceable listings (По договаряне / null) to the end
          if (pa < 0 && pb < 0) return 0;
          if (pa < 0) return 1;
          if (pb < 0) return -1;
          return urlSort === "cheapest" ? pa - pb : pb - pa;
        });
      }

      setListings(filtered);
      setLoading(false);
    };

    loadListings();
  }, [
    search, city, category, type, minPrice, maxPrice,
    urlPropertyPurpose, urlPropertyType, urlRooms, urlFloor, urlSqmMin, urlSqmMax,
    urlFurnished, urlHeating, urlConstructionType, urlPropertyCondition, urlElevator, urlParking,
    urlVehicleType, urlCarMake, urlCarModel, urlYearFrom, urlYearTo, urlFuel, urlTransmission,
    urlMileageFrom, urlMileageTo, urlEngineSizeFrom, urlEngineSizeTo, urlPowerFrom, urlPowerTo,
    urlEuroStandard, urlBodyType, urlDriveType, urlCarColor, urlCarCondition, urlPartType,
    urlElDeviceType, urlElBrand, urlElModel, urlElCondition, urlElStorage, urlElRam, urlElColor,
    urlElectronicsSubcat, urlCondition,
    urlServiceType, urlServiceCategory, urlOnlineService, urlProviderType,
    urlJobCategory, urlEmploymentType, urlExperience, urlRemote, urlSalaryFrom, urlSalaryTo,
    urlCompType, urlCompBrand, urlCompCondition,
    urlKidsItemType, urlKidsAgeGroup, urlKidsGender, urlKidsCondition,
    urlHomeSubcategory, urlHomeCondition,
    urlFashionType, urlFashionGender, urlFashionSize, urlFashionCondition,
    urlSportCategory, urlSportCondition,
    urlBookGenre, urlBookCondition, urlBookLanguage,
  ]);

  // -------------------------------------------------------------------------
  // Hero text
  // -------------------------------------------------------------------------

  const heroTitle = () => {
    if (!hasFilters) return "Всички обяви";
    if (category && !hasFilters) return category;
    return category || "Резултати от търсенето";
  };

  const heroSubtitle = () => {
    if (!hasFilters) return "Разгледайте най-новите обяви в DaiVzemi.";
    return "Покажи резултатите според избраните критерии.";
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <main className="min-h-screen bg-slate-50" onClick={() => setOpenDropdown(null)}>
      <Header />

      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 px-6 py-20 text-white">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-200">DaiVzemi</p>
          <h1 className="mt-3 text-4xl font-black md:text-5xl">{heroTitle()}</h1>
          <p className="mt-4 text-base text-blue-100 md:text-lg">{heroSubtitle()}</p>
        </div>
      </section>

      {/* ── Filter bar ── */}
      <section className="mx-auto max-w-7xl px-6 py-8" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200">

          {/* Row 1: search, city, category, type, button */}
          <div className="grid gap-4 lg:grid-cols-6">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              placeholder="Търси обява"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10 lg:col-span-2"
            />
            <SearchableSelect
              value={cityInput}
              onChange={setCityInput}
              options={BG_CITIES}
              placeholder="Град"
            />
            <CustomDropdown
              value={categoryInput}
              placeholder="Всички категории"
              options={categories}
              isOpen={openDropdown === "category"}
              onToggle={() => setOpenDropdown(openDropdown === "category" ? null : "category")}
              onSelect={(v) => {
                if (v !== categoryInput) {
                  setCarMake("");
                  setCarModel("");
                  setPropertyType("");
                  setPartType("");
                  setCondition("");
                  setServiceType("");
                  setEmploymentType("");
                }
                setCategoryInput(v);
                setOpenDropdown(null);
              }}
            />
            <CustomDropdown
              value={typeInput}
              placeholder="Всички типове"
              options={listingTypes}
              isOpen={openDropdown === "type"}
              onToggle={() => setOpenDropdown(openDropdown === "type" ? null : "type")}
              onSelect={(v) => { setTypeInput(v); setOpenDropdown(null); }}
            />
            <button
              type="button"
              onClick={applyFilters}
              className="rounded-2xl bg-blue-950 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-900"
            >
              Филтрирай
            </button>
          </div>

          {/* Row 2: price range + clear */}
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <input
              value={minPriceInput}
              onChange={(e) => setMinPriceInput(e.target.value)}
              placeholder="Цена от"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10"
            />
            <input
              value={maxPriceInput}
              onChange={(e) => setMaxPriceInput(e.target.value)}
              placeholder="Цена до"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10"
            />
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 lg:col-span-2"
            >
              Изчисти филтрите
            </button>
          </div>

          {/* Save search row — only when filters are active */}
          {hasFilters && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={saveSearch}
                disabled={savingSearch}
                className="flex items-center gap-2 rounded-2xl border border-blue-950 px-4 py-2.5 text-sm font-black text-blue-950 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingSearch ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <BookMarked className="h-4 w-4" />
                )}
                Запази търсенето
              </button>

              {saveNotice === "saved" && (
                <span className="text-sm font-bold text-green-700">✓ Търсенето е запазено</span>
              )}
              {saveNotice === "duplicate" && (
                <span className="text-sm font-bold text-amber-700">Това търсене вече е запазено</span>
              )}
              {saveNotice === "error" && (
                <span className="text-sm font-bold text-red-600">Влезте в профила си, за да запазите търсенето</span>
              )}
            </div>
          )}

          {/* Row 3: category-specific filters */}
          {hasSpecificFilters && (
            <>
              <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-5">
                <SlidersHorizontal className="h-4 w-4 text-blue-950" />
                <span className="text-sm font-black text-blue-950">
                  Филтри за {categoryInput}
                </span>
              </div>
              <CategoryFilters
                category={categoryInput}
                propertyPurpose={propertyPurpose} onPropertyPurpose={setPropertyPurpose}
                propertyType={propertyType} onPropertyType={setPropertyType}
                rooms={rooms} onRooms={setRooms}
                floor={floor} onFloor={setFloor}
                sqmMin={sqmMin} onSqmMin={setSqmMin}
                sqmMax={sqmMax} onSqmMax={setSqmMax}
                furnished={furnished} onFurnished={setFurnished}
                heating={heating} onHeating={setHeating}
                constructionType={constructionType} onConstructionType={setConstructionType}
                propertyCondition={propertyCondition} onPropertyCondition={setPropertyCondition}
                elevator={elevator} onElevator={setElevator}
                parking={parking} onParking={setParking}
                vehicleType={vehicleType} onVehicleType={setVehicleType}
                carMake={carMake} onCarMake={setCarMake}
                carModel={carModel} onCarModel={setCarModel}
                yearFrom={yearFrom} onYearFrom={setYearFrom}
                yearTo={yearTo} onYearTo={setYearTo}
                fuel={fuel} onFuel={setFuel}
                transmission={transmission} onTransmission={setTransmission}
                mileageFrom={mileageFrom} onMileageFrom={setMileageFrom}
                mileageTo={mileageTo} onMileageTo={setMileageTo}
                engineSizeFrom={engineSizeFrom} onEngineSizeFrom={setEngineSizeFrom}
                engineSizeTo={engineSizeTo} onEngineSizeTo={setEngineSizeTo}
                powerFrom={powerFrom} onPowerFrom={setPowerFrom}
                powerTo={powerTo} onPowerTo={setPowerTo}
                euroStandard={euroStandard} onEuroStandard={setEuroStandard}
                bodyType={bodyType} onBodyType={setBodyType}
                driveType={driveType} onDriveType={setDriveType}
                carColor={carColor} onCarColor={setCarColor}
                carCondition={carCondition} onCarCondition={setCarCondition}
                partType={partType} onPartType={setPartType}
                elDeviceType={elDeviceType} onElDeviceType={setElDeviceType}
                elBrand={elBrand} onElBrand={setElBrand}
                elModel={elModel} onElModel={setElModel}
                elCondition={elCondition} onElCondition={setElCondition}
                elStorage={elStorage} onElStorage={setElStorage}
                elRam={elRam} onElRam={setElRam}
                elColor={elColor} onElColor={setElColor}
                electronicsSubcat={electronicsSubcat} onElectronicsSubcat={setElectronicsSubcat}
                condition={condition} onCondition={setCondition}
                brand={brand} onBrand={setBrand}
                serviceType={serviceType} onServiceType={setServiceType}
                serviceCategory={serviceCategory} onServiceCategory={setServiceCategory}
                onlineService={onlineService} onOnlineService={setOnlineService}
                providerType={providerType} onProviderType={setProviderType}
                jobCategory={jobCategory} onJobCategory={setJobCategory}
                employmentType={employmentType} onEmploymentType={setEmploymentType}
                experience={experience} onExperience={setExperience}
                remote={remote} onRemote={setRemote}
                salaryFrom={salaryFrom} onSalaryFrom={setSalaryFrom}
                salaryTo={salaryTo} onSalaryTo={setSalaryTo}
                compType={compType} onCompType={setCompType}
                compBrand={compBrand} onCompBrand={setCompBrand}
                compCondition={compCondition} onCompCondition={setCompCondition}
                kidsItemType={kidsItemType} onKidsItemType={setKidsItemType}
                kidsAgeGroup={kidsAgeGroup} onKidsAgeGroup={setKidsAgeGroup}
                kidsGender={kidsGender} onKidsGender={setKidsGender}
                kidsCondition={kidsCondition} onKidsCondition={setKidsCondition}
                homeSubcategory={homeSubcategory} onHomeSubcategory={setHomeSubcategory}
                homeCondition={homeCondition} onHomeCondition={setHomeCondition}
                fashionType={fashionType} onFashionType={setFashionType}
                fashionGender={fashionGender} onFashionGender={setFashionGender}
                fashionSize={fashionSize} onFashionSize={setFashionSize}
                fashionCondition={fashionCondition} onFashionCondition={setFashionCondition}
                sportCategory={sportCategory} onSportCategory={setSportCategory}
                sportCondition={sportCondition} onSportCondition={setSportCondition}
                bookGenre={bookGenre} onBookGenre={setBookGenre}
                bookCondition={bookCondition} onBookCondition={setBookCondition}
                bookLanguage={bookLanguage} onBookLanguage={setBookLanguage}
              />
            </>
          )}

          {/* Active filter chips */}
          {hasFilters && (
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { label: search, key: "search" },
                { label: city, key: "city" },
                { label: category, key: "category" },
                { label: type, key: "type" },
                { label: minPrice ? `от ${minPrice} €` : "", key: "minPrice" },
                { label: maxPrice ? `до ${maxPrice} €` : "", key: "maxPrice" },
                { label: urlPropertyPurpose, key: "propertyPurpose" },
                { label: urlPropertyType, key: "propertyType" },
                { label: urlRooms, key: "rooms" },
                { label: urlFloor ? `Ет. ${urlFloor}` : "", key: "floor" },
                { label: urlSqmMin ? `от ${urlSqmMin} кв.м.` : "", key: "sqmMin" },
                { label: urlSqmMax ? `до ${urlSqmMax} кв.м.` : "", key: "sqmMax" },
                { label: urlFurnished, key: "furnished" },
                { label: urlHeating, key: "heating" },
                { label: urlConstructionType, key: "constructionType" },
                { label: urlPropertyCondition, key: "propertyCondition" },
                { label: urlElevator ? `Асансьор: ${urlElevator}` : "", key: "elevator" },
                { label: urlParking, key: "parking" },
                { label: urlVehicleType, key: "vehicleType" },
                { label: urlCarMake, key: "carMake" },
                { label: urlCarModel, key: "carModel" },
                { label: urlYearFrom ? `от ${urlYearFrom}г.` : "", key: "yearFrom" },
                { label: urlYearTo ? `до ${urlYearTo}г.` : "", key: "yearTo" },
                { label: urlFuel, key: "fuel" },
                { label: urlTransmission, key: "transmission" },
                { label: urlMileageFrom ? `от ${urlMileageFrom} км` : "", key: "mileageFrom" },
                { label: urlMileageTo ? `до ${urlMileageTo} км` : "", key: "mileageTo" },
                { label: urlEngineSizeFrom ? `куб. от ${urlEngineSizeFrom}` : "", key: "engineSizeFrom" },
                { label: urlEngineSizeTo ? `куб. до ${urlEngineSizeTo}` : "", key: "engineSizeTo" },
                { label: urlPowerFrom ? `от ${urlPowerFrom} к.с.` : "", key: "powerFrom" },
                { label: urlPowerTo ? `до ${urlPowerTo} к.с.` : "", key: "powerTo" },
                { label: urlEuroStandard, key: "euroStandard" },
                { label: urlBodyType, key: "bodyType" },
                { label: urlDriveType, key: "driveType" },
                { label: urlCarColor, key: "carColor" },
                { label: urlCarCondition, key: "carCondition" },
                { label: urlPartType, key: "partType" },
                { label: urlElDeviceType, key: "elDeviceType" },
                { label: urlElBrand, key: "elBrand" },
                { label: urlElModel, key: "elModel" },
                { label: urlElCondition, key: "elCondition" },
                { label: urlElStorage, key: "elStorage" },
                { label: urlElRam ? `RAM: ${urlElRam}` : "", key: "elRam" },
                { label: urlElColor, key: "elColor" },
                { label: urlCondition, key: "condition" },
                { label: urlServiceCategory, key: "serviceCategory" },
                { label: urlOnlineService ? `Онлайн: ${urlOnlineService}` : "", key: "onlineService" },
                { label: urlProviderType, key: "providerType" },
                { label: urlJobCategory, key: "jobCategory" },
                { label: urlEmploymentType, key: "employmentType" },
                { label: urlExperience, key: "experience" },
                { label: urlRemote ? `Дистанционна: ${urlRemote}` : "", key: "remote" },
                { label: urlSalaryFrom ? `от ${urlSalaryFrom} лв.` : "", key: "salaryFrom" },
                { label: urlSalaryTo ? `до ${urlSalaryTo} лв.` : "", key: "salaryTo" },
                { label: urlCompType, key: "compType" },
                { label: urlCompBrand, key: "compBrand" },
                { label: urlCompCondition, key: "compCondition" },
                { label: urlKidsItemType, key: "kidsItemType" },
                { label: urlKidsAgeGroup, key: "kidsAgeGroup" },
                { label: urlKidsGender, key: "kidsGender" },
                { label: urlKidsCondition, key: "kidsCondition" },
                { label: urlHomeSubcategory, key: "homeSubcategory" },
                { label: urlHomeCondition, key: "homeCondition" },
                { label: urlFashionType, key: "fashionType" },
                { label: urlFashionGender, key: "fashionGender" },
                { label: urlFashionSize ? `Размер: ${urlFashionSize}` : "", key: "fashionSize" },
                { label: urlFashionCondition, key: "fashionCondition" },
                { label: urlSportCategory, key: "sportCategory" },
                { label: urlSportCondition, key: "sportCondition" },
                { label: urlBookGenre, key: "bookGenre" },
                { label: urlBookCondition, key: "bookCondition" },
                { label: urlBookLanguage, key: "bookLanguage" },
              ]
                .filter((chip) => chip.label.trim().length > 0)
                .map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => {
                      const params = new URLSearchParams(searchParams.toString());
                      params.delete(chip.key);
                      router.push(`/listings${params.toString() ? `?${params.toString()}` : ""}`);
                    }}
                    className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-950 transition hover:bg-blue-100"
                  >
                    {chip.label}
                    <X className="h-3 w-3" />
                  </button>
                ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Sort bar ── */}
      <section className="mx-auto max-w-7xl px-6 pb-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-slate-500">
            {listings.length > 0 && !loading ? `${listings.length} обяви` : ""}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-500">Сортиране:</span>
            <select
              value={sort}
              onChange={(e) => {
                const newSort = e.target.value;
                setSort(newSort);
                const params = new URLSearchParams(searchParams.toString());
                if (newSort === "newest") params.delete("sort");
                else params.set("sort", newSort);
                router.push(`/listings${params.toString() ? `?${params.toString()}` : ""}`);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10"
            >
              <option value="newest">Най-нови</option>
              <option value="cheapest">Най-евтини</option>
              <option value="priciest">Най-скъпи</option>
            </select>
          </div>
        </div>
      </section>

      {/* ── Listings grid ── */}
      <section className="mx-auto max-w-7xl px-6 pb-12">
        {loading ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-base font-semibold text-slate-600">Зареждане...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-xl font-black text-slate-900">
              Няма намерени обяви по това търсене.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Опитайте с по-широки критерии или публикувайте нова обява.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                Изчисти филтрите
              </button>
              <Link
                href="/publish"
                className="inline-flex items-center justify-center rounded-2xl bg-blue-950 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-900"
              >
                Публикувай обява
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {listings.map((listing) => {
              const cardImage = listing.image_urls?.find(Boolean) ?? listing.image_url;

              return (
                <article
                  key={listing.id}
                  className="group cursor-pointer overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <Link href={`/listing/${listing.id}`} className="block">
                    {cardImage ? (
                      <img
                        src={cardImage}
                        alt={listing.title}
                        className="h-52 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-52 items-center justify-center bg-blue-950 text-5xl text-white transition duration-300 group-hover:bg-blue-900">
                        {listing.category ? fallbackImageByCategory[listing.category] ?? "📦" : "📦"}
                      </div>
                    )}

                    <div className="space-y-4 p-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-950">
                          {listing.listing_type ?? "Обява"}
                        </span>
                        {(() => {
                          const badge = conditionBadge(listing.condition);
                          if (!badge) return null;
                          return (
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${badge.cls}`}>
                              {badge.label}
                            </span>
                          );
                        })()}
                      </div>

                      <div>
                        <h2 className="text-2xl font-black text-slate-950">{listing.title}</h2>
                        <p className="mt-2 text-2xl font-black text-blue-950">
                          {formatPrice(listing.price)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                        <span className="rounded-full bg-slate-100 px-3 py-1">
                          {listing.city ?? "Без град"}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1">
                          {listing.category ?? "Без категория"}
                        </span>
                      </div>

                      <p className="text-sm text-slate-500">{formatDate(listing.created_at)}</p>
                    </div>
                  </Link>

                  <div className="px-6 pb-6">
                    <Link
                      href={`/listing/${listing.id}`}
                      className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-950 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-900"
                    >
                      Виж обявата
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

export default function ListingsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50">
          <Header />
          <div className="flex min-h-[40vh] items-center justify-center">
            <p className="text-base font-semibold text-slate-600">Зареждане...</p>
          </div>
        </main>
      }
    >
      <ListingsPageContent />
    </Suspense>
  );
}
