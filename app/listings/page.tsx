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
  AUTO_PART_CATEGORIES, PART_CONDITIONS, ELECTRONICS_SUBCATEGORIES, ITEM_CONDITIONS, SERVICE_TYPES,
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
const CATEGORY_SPECIFIC = ["Имоти", "Автомобили", "Авточасти", "Електроника", "Услуги"];

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
  // Електроника
  electronicsSubcat: string; onElectronicsSubcat: (v: string) => void;
  condition: string; onCondition: (v: string) => void;
  brand: string; onBrand: (v: string) => void;
  // Услуги
  serviceType: string; onServiceType: (v: string) => void;
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
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SearchableSelect
          value={p.electronicsSubcat}
          onChange={p.onElectronicsSubcat}
          options={ELECTRONICS_SUBCATEGORIES}
          placeholder="Подкатегория"
        />
        <input
          value={p.brand}
          onChange={(e) => p.onBrand(e.target.value)}
          placeholder="Марка"
          className={field}
        />
        <SearchableSelect
          value={p.condition}
          onChange={p.onCondition}
          options={ITEM_CONDITIONS}
          placeholder="Състояние"
        />
      </div>
    );
  }

  if (p.category === "Услуги") {
    return (
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SearchableSelect
          value={p.serviceType}
          onChange={p.onServiceType}
          options={SERVICE_TYPES}
          placeholder="Вид услуга"
        />
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

// ---------------------------------------------------------------------------
// Main page content
// ---------------------------------------------------------------------------

function ListingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Category-specific filters — Електроника
  const [electronicsSubcat, setElectronicsSubcat] = useState(searchParams.get("electronicsSubcat") ?? "");
  const [condition, setCondition] = useState(searchParams.get("condition") ?? "");
  const [brand, setBrand] = useState(searchParams.get("brand") ?? "");

  // Category-specific filters — Услуги
  const [serviceType, setServiceType] = useState(searchParams.get("serviceType") ?? "");

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
  const urlElectronicsSubcat = searchParams.get("electronicsSubcat") ?? "";
  const urlCondition = searchParams.get("condition") ?? "";
  const urlBrand = searchParams.get("brand") ?? "";
  const urlServiceType = searchParams.get("serviceType") ?? "";

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
    urlElectronicsSubcat.length > 0 ||
    urlCondition.length > 0 ||
    urlBrand.length > 0 ||
    urlServiceType.length > 0;

  const hasSpecificFilters = CATEGORY_SPECIFIC.includes(category);

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
    setElectronicsSubcat(searchParams.get("electronicsSubcat") ?? "");
    setCondition(searchParams.get("condition") ?? "");
    setBrand(searchParams.get("brand") ?? "");
    setServiceType(searchParams.get("serviceType") ?? "");
    setCategoryInput(searchParams.get("category") ?? "");
    setTypeInput(searchParams.get("type") ?? "");
    setSearchInput(searchParams.get("search") ?? "");
    setCityInput(searchParams.get("city") ?? "");
    setMinPriceInput(searchParams.get("minPrice") ?? "");
    setMaxPriceInput(searchParams.get("maxPrice") ?? "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  const applyFilters = () => {
    const params = new URLSearchParams();

    if (searchInput.trim()) params.set("search", searchInput.trim());
    if (cityInput.trim()) params.set("city", cityInput.trim());
    if (categoryInput.trim()) params.set("category", categoryInput.trim());
    if (typeInput.trim()) params.set("type", typeInput.trim());
    if (minPriceInput.trim()) params.set("minPrice", minPriceInput.trim());
    if (maxPriceInput.trim()) params.set("maxPrice", maxPriceInput.trim());

    // Category-specific
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
    if (partType) params.set("partType", partType);
    if (electronicsSubcat) params.set("electronicsSubcat", electronicsSubcat);
    if (condition) params.set("condition", condition);
    if (brand.trim()) params.set("brand", brand.trim());
    if (serviceType) params.set("serviceType", serviceType);

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
    if (urlElectronicsSubcat) filters.electronicsSubcat = urlElectronicsSubcat;
    if (urlCondition) filters.condition = urlCondition;
    if (urlBrand) filters.brand = urlBrand;
    if (urlServiceType) filters.serviceType = urlServiceType;

    // Check for duplicate (same user + same key params)
    const { data: existing } = await supabase
      .from("saved_searches")
      .select("id")
      .eq("user_id", user.id)
      .eq("category", category || "")
      .eq("listing_type", type || "")
      .eq("city", city || "")
      .eq("search", search || "")
      .maybeSingle();

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
    setPartType(""); setElectronicsSubcat(""); setCondition(""); setBrand("");
    setServiceType("");
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
          "id, title, description, price, city, category, listing_type, created_at, image_url, image_urls, property_type, rooms, area_sqm, car_make, car_model, car_year, fuel_type, transmission, mileage, part_type, electronics_subcategory, condition, service_type, details"
        )
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
        if (urlPartType && l.part_type !== urlPartType) return false;

        // Електроника
        if (urlElectronicsSubcat && l.electronics_subcategory !== urlElectronicsSubcat) return false;
        if (urlCondition && l.condition !== urlCondition) return false;
        if (urlBrand && !l.car_make?.toLowerCase().includes(urlBrand.toLowerCase())) return false;

        // Услуги
        if (urlServiceType && l.service_type !== urlServiceType) return false;

        return true;
      });

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
    urlElectronicsSubcat, urlCondition, urlBrand,
    urlServiceType,
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
              onSelect={(v) => { setCategoryInput(v); setOpenDropdown(null); }}
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
                  Филтри за {category}
                </span>
              </div>
              <CategoryFilters
                category={category}
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
                electronicsSubcat={electronicsSubcat} onElectronicsSubcat={setElectronicsSubcat}
                condition={condition} onCondition={setCondition}
                brand={brand} onBrand={setBrand}
                serviceType={serviceType} onServiceType={setServiceType}
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
                { label: urlElectronicsSubcat, key: "electronicsSubcat" },
                { label: urlCondition, key: "condition" },
                { label: urlBrand, key: "brand" },
                { label: urlServiceType, key: "serviceType" },
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
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-950">
                        {listing.listing_type ?? "Обява"}
                      </span>

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
