"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

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

const carBrands = [
  "Audi", "BMW", "Dacia", "Fiat", "Ford", "Honda", "Hyundai",
  "Kia", "Mazda", "Mercedes-Benz", "Nissan", "Opel", "Peugeot",
  "Renault", "Seat", "Škoda", "Suzuki", "Toyota", "Volkswagen", "Volvo",
];

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
}: {
  value: string;
  placeholder: string;
  options: string[];
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-950 shadow-sm outline-none transition focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10"
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
            className="w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-500 transition hover:bg-slate-100"
          >
            {placeholder}
          </button>
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              className={`w-full rounded-xl px-3 py-2 text-left text-sm font-bold transition hover:bg-slate-100 ${
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
  openDropdown: string | null;
  onToggle: (key: string) => void;
  onClose: () => void;
  // Имоти
  propertyType: string; onPropertyType: (v: string) => void;
  rooms: string; onRooms: (v: string) => void;
  sqmMin: string; onSqmMin: (v: string) => void;
  sqmMax: string; onSqmMax: (v: string) => void;
  // Автомобили / Авточасти
  carMake: string; onCarMake: (v: string) => void;
  carModel: string; onCarModel: (v: string) => void;
  yearFrom: string; onYearFrom: (v: string) => void;
  yearTo: string; onYearTo: (v: string) => void;
  fuel: string; onFuel: (v: string) => void;
  transmission: string; onTransmission: (v: string) => void;
  mileageFrom: string; onMileageFrom: (v: string) => void;
  mileageTo: string; onMileageTo: (v: string) => void;
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
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CustomDropdown
          value={p.propertyType}
          placeholder="Тип имот"
          options={["Апартамент", "Къща", "Парцел", "Офис", "Вила", "Гараж", "Магазин", "Склад"]}
          isOpen={p.openDropdown === "propertyType"}
          onToggle={() => p.onToggle("propertyType")}
          onSelect={(v) => { p.onPropertyType(v); p.onClose(); }}
        />
        <CustomDropdown
          value={p.rooms}
          placeholder="Стаи"
          options={["1-стаен", "2-стаен", "3-стаен", "4-стаен", "Многостаен"]}
          isOpen={p.openDropdown === "rooms"}
          onToggle={() => p.onToggle("rooms")}
          onSelect={(v) => { p.onRooms(v); p.onClose(); }}
        />
        <input
          value={p.sqmMin}
          onChange={(e) => p.onSqmMin(e.target.value)}
          placeholder="Кв.м. от"
          type="number"
          min="0"
          className={field}
        />
        <input
          value={p.sqmMax}
          onChange={(e) => p.onSqmMax(e.target.value)}
          placeholder="Кв.м. до"
          type="number"
          min="0"
          className={field}
        />
      </div>
    );
  }

  if (p.category === "Автомобили") {
    return (
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CustomDropdown
          value={p.carMake}
          placeholder="Марка"
          options={carBrands}
          isOpen={p.openDropdown === "carMake"}
          onToggle={() => p.onToggle("carMake")}
          onSelect={(v) => { p.onCarMake(v); p.onClose(); }}
        />
        <input
          value={p.carModel}
          onChange={(e) => p.onCarModel(e.target.value)}
          placeholder="Модел"
          className={field}
        />
        <CustomDropdown
          value={p.fuel}
          placeholder="Гориво"
          options={["Бензин", "Дизел", "Електрически", "Хибрид", "Газ"]}
          isOpen={p.openDropdown === "fuel"}
          onToggle={() => p.onToggle("fuel")}
          onSelect={(v) => { p.onFuel(v); p.onClose(); }}
        />
        <CustomDropdown
          value={p.transmission}
          placeholder="Скоростна кутия"
          options={["Ръчна", "Автоматична"]}
          isOpen={p.openDropdown === "transmission"}
          onToggle={() => p.onToggle("transmission")}
          onSelect={(v) => { p.onTransmission(v); p.onClose(); }}
        />
        <input
          value={p.yearFrom}
          onChange={(e) => p.onYearFrom(e.target.value)}
          placeholder="Година от"
          type="number"
          min="1970"
          max="2026"
          className={field}
        />
        <input
          value={p.yearTo}
          onChange={(e) => p.onYearTo(e.target.value)}
          placeholder="Година до"
          type="number"
          min="1970"
          max="2026"
          className={field}
        />
        <input
          value={p.mileageFrom}
          onChange={(e) => p.onMileageFrom(e.target.value)}
          placeholder="Пробег от (км)"
          type="number"
          min="0"
          className={field}
        />
        <input
          value={p.mileageTo}
          onChange={(e) => p.onMileageTo(e.target.value)}
          placeholder="Пробег до (км)"
          type="number"
          min="0"
          className={field}
        />
      </div>
    );
  }

  if (p.category === "Авточасти") {
    return (
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CustomDropdown
          value={p.carMake}
          placeholder="Марка на автомобила"
          options={carBrands}
          isOpen={p.openDropdown === "carMake"}
          onToggle={() => p.onToggle("carMake")}
          onSelect={(v) => { p.onCarMake(v); p.onClose(); }}
        />
        <input
          value={p.carModel}
          onChange={(e) => p.onCarModel(e.target.value)}
          placeholder="Модел на автомобила"
          className={field}
        />
        <CustomDropdown
          value={p.partType}
          placeholder="Вид на частта"
          options={[
            "Двигател", "Купе", "Окачване", "Спирачки",
            "Електрика", "Интериор", "Гуми и джанти", "Друго",
          ]}
          isOpen={p.openDropdown === "partType"}
          onToggle={() => p.onToggle("partType")}
          onSelect={(v) => { p.onPartType(v); p.onClose(); }}
        />
        <CustomDropdown
          value={p.condition}
          placeholder="Състояние"
          options={["Ново", "Употребявано"]}
          isOpen={p.openDropdown === "condition"}
          onToggle={() => p.onToggle("condition")}
          onSelect={(v) => { p.onCondition(v); p.onClose(); }}
        />
      </div>
    );
  }

  if (p.category === "Електроника") {
    return (
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CustomDropdown
          value={p.electronicsSubcat}
          placeholder="Подкатегория"
          options={[
            "Телефони", "Таблети", "Лаптопи", "ТВ и аудио",
            "Камери", "Игри и конзоли", "Друго",
          ]}
          isOpen={p.openDropdown === "electronicsSubcat"}
          onToggle={() => p.onToggle("electronicsSubcat")}
          onSelect={(v) => { p.onElectronicsSubcat(v); p.onClose(); }}
        />
        <input
          value={p.brand}
          onChange={(e) => p.onBrand(e.target.value)}
          placeholder="Марка"
          className={field}
        />
        <CustomDropdown
          value={p.condition}
          placeholder="Състояние"
          options={["Ново", "Употребявано", "За части"]}
          isOpen={p.openDropdown === "condition"}
          onToggle={() => p.onToggle("condition")}
          onSelect={(v) => { p.onCondition(v); p.onClose(); }}
        />
      </div>
    );
  }

  if (p.category === "Услуги") {
    return (
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CustomDropdown
          value={p.serviceType}
          placeholder="Вид услуга"
          options={[
            "Ремонти", "Транспорт", "Почистване", "Уроци",
            "Красота", "IT услуги", "Строителство", "Друго",
          ]}
          isOpen={p.openDropdown === "serviceType"}
          onToggle={() => p.onToggle("serviceType")}
          onSelect={(v) => { p.onServiceType(v); p.onClose(); }}
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
  const [propertyType, setPropertyType] = useState(searchParams.get("propertyType") ?? "");
  const [rooms, setRooms] = useState(searchParams.get("rooms") ?? "");
  const [sqmMin, setSqmMin] = useState(searchParams.get("sqmMin") ?? "");
  const [sqmMax, setSqmMax] = useState(searchParams.get("sqmMax") ?? "");

  // Category-specific filters — Автомобили / Авточасти
  const [carMake, setCarMake] = useState(searchParams.get("carMake") ?? "");
  const [carModel, setCarModel] = useState(searchParams.get("carModel") ?? "");
  const [yearFrom, setYearFrom] = useState(searchParams.get("yearFrom") ?? "");
  const [yearTo, setYearTo] = useState(searchParams.get("yearTo") ?? "");
  const [fuel, setFuel] = useState(searchParams.get("fuel") ?? "");
  const [transmission, setTransmission] = useState(searchParams.get("transmission") ?? "");
  const [mileageFrom, setMileageFrom] = useState(searchParams.get("mileageFrom") ?? "");
  const [mileageTo, setMileageTo] = useState(searchParams.get("mileageTo") ?? "");
  const [partType, setPartType] = useState(searchParams.get("partType") ?? "");

  // Category-specific filters — Електроника
  const [electronicsSubcat, setElectronicsSubcat] = useState(searchParams.get("electronicsSubcat") ?? "");
  const [condition, setCondition] = useState(searchParams.get("condition") ?? "");
  const [brand, setBrand] = useState(searchParams.get("brand") ?? "");

  // Category-specific filters — Услуги
  const [serviceType, setServiceType] = useState(searchParams.get("serviceType") ?? "");

  // Dropdown open state (tracks which key is open)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // URL-committed values (used for actual queries)
  const search = searchParams.get("search") ?? "";
  const city = searchParams.get("city") ?? "";
  const category = searchParams.get("category") ?? "";
  const type = searchParams.get("type") ?? "";
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";

  const urlPropertyType = searchParams.get("propertyType") ?? "";
  const urlRooms = searchParams.get("rooms") ?? "";
  const urlSqmMin = searchParams.get("sqmMin") ?? "";
  const urlSqmMax = searchParams.get("sqmMax") ?? "";
  const urlCarMake = searchParams.get("carMake") ?? "";
  const urlCarModel = searchParams.get("carModel") ?? "";
  const urlYearFrom = searchParams.get("yearFrom") ?? "";
  const urlYearTo = searchParams.get("yearTo") ?? "";
  const urlFuel = searchParams.get("fuel") ?? "";
  const urlTransmission = searchParams.get("transmission") ?? "";
  const urlMileageFrom = searchParams.get("mileageFrom") ?? "";
  const urlMileageTo = searchParams.get("mileageTo") ?? "";
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
    urlPropertyType.length > 0 ||
    urlRooms.length > 0 ||
    urlSqmMin.length > 0 ||
    urlSqmMax.length > 0 ||
    urlCarMake.length > 0 ||
    urlCarModel.length > 0 ||
    urlYearFrom.length > 0 ||
    urlYearTo.length > 0 ||
    urlFuel.length > 0 ||
    urlTransmission.length > 0 ||
    urlMileageFrom.length > 0 ||
    urlMileageTo.length > 0 ||
    urlPartType.length > 0 ||
    urlElectronicsSubcat.length > 0 ||
    urlCondition.length > 0 ||
    urlBrand.length > 0 ||
    urlServiceType.length > 0;

  const hasSpecificFilters = CATEGORY_SPECIFIC.includes(category);

  // Sync local state when category changes (clear category-specific fields)
  useEffect(() => {
    setPropertyType(searchParams.get("propertyType") ?? "");
    setRooms(searchParams.get("rooms") ?? "");
    setSqmMin(searchParams.get("sqmMin") ?? "");
    setSqmMax(searchParams.get("sqmMax") ?? "");
    setCarMake(searchParams.get("carMake") ?? "");
    setCarModel(searchParams.get("carModel") ?? "");
    setYearFrom(searchParams.get("yearFrom") ?? "");
    setYearTo(searchParams.get("yearTo") ?? "");
    setFuel(searchParams.get("fuel") ?? "");
    setTransmission(searchParams.get("transmission") ?? "");
    setMileageFrom(searchParams.get("mileageFrom") ?? "");
    setMileageTo(searchParams.get("mileageTo") ?? "");
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
    if (propertyType) params.set("propertyType", propertyType);
    if (rooms) params.set("rooms", rooms);
    if (sqmMin.trim()) params.set("sqmMin", sqmMin.trim());
    if (sqmMax.trim()) params.set("sqmMax", sqmMax.trim());
    if (carMake) params.set("carMake", carMake);
    if (carModel.trim()) params.set("carModel", carModel.trim());
    if (yearFrom.trim()) params.set("yearFrom", yearFrom.trim());
    if (yearTo.trim()) params.set("yearTo", yearTo.trim());
    if (fuel) params.set("fuel", fuel);
    if (transmission) params.set("transmission", transmission);
    if (mileageFrom.trim()) params.set("mileageFrom", mileageFrom.trim());
    if (mileageTo.trim()) params.set("mileageTo", mileageTo.trim());
    if (partType) params.set("partType", partType);
    if (electronicsSubcat) params.set("electronicsSubcat", electronicsSubcat);
    if (condition) params.set("condition", condition);
    if (brand.trim()) params.set("brand", brand.trim());
    if (serviceType) params.set("serviceType", serviceType);

    router.push(`/listings${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const clearFilters = () => {
    setSearchInput(""); setCityInput(""); setCategoryInput("");
    setTypeInput(""); setMinPriceInput(""); setMaxPriceInput("");
    setPropertyType(""); setRooms(""); setSqmMin(""); setSqmMax("");
    setCarMake(""); setCarModel(""); setYearFrom(""); setYearTo("");
    setFuel(""); setTransmission(""); setMileageFrom(""); setMileageTo("");
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
          "id, title, description, price, city, category, listing_type, created_at, image_url, image_urls, property_type, rooms, area_sqm, car_make, car_model, car_year, fuel_type, transmission, mileage, part_type, electronics_subcategory, condition, service_type"
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

        // Имоти
        if (urlPropertyType && l.property_type !== urlPropertyType) return false;
        if (urlRooms && l.rooms !== urlRooms) return false;
        if (urlSqmMin && l.area_sqm !== null && l.area_sqm !== undefined) {
          if (l.area_sqm < Number(urlSqmMin)) return false;
        }
        if (urlSqmMax && l.area_sqm !== null && l.area_sqm !== undefined) {
          if (l.area_sqm > Number(urlSqmMax)) return false;
        }

        // Автомобили / Авточасти
        if (urlCarMake && l.car_make?.toLowerCase() !== urlCarMake.toLowerCase()) return false;
        if (urlCarModel && !l.car_model?.toLowerCase().includes(urlCarModel.toLowerCase())) return false;
        if (urlYearFrom && l.car_year !== null && l.car_year !== undefined) {
          if (l.car_year < Number(urlYearFrom)) return false;
        }
        if (urlYearTo && l.car_year !== null && l.car_year !== undefined) {
          if (l.car_year > Number(urlYearTo)) return false;
        }
        if (urlFuel && l.fuel_type !== urlFuel) return false;
        if (urlTransmission && l.transmission !== urlTransmission) return false;
        if (urlMileageFrom && l.mileage !== null && l.mileage !== undefined) {
          if (l.mileage < Number(urlMileageFrom)) return false;
        }
        if (urlMileageTo && l.mileage !== null && l.mileage !== undefined) {
          if (l.mileage > Number(urlMileageTo)) return false;
        }
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
    urlPropertyType, urlRooms, urlSqmMin, urlSqmMax,
    urlCarMake, urlCarModel, urlYearFrom, urlYearTo, urlFuel, urlTransmission, urlMileageFrom, urlMileageTo, urlPartType,
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
            <input
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              placeholder="Град"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10"
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
                openDropdown={openDropdown}
                onToggle={(key) => setOpenDropdown(openDropdown === key ? null : key)}
                onClose={() => setOpenDropdown(null)}
                propertyType={propertyType} onPropertyType={setPropertyType}
                rooms={rooms} onRooms={setRooms}
                sqmMin={sqmMin} onSqmMin={setSqmMin}
                sqmMax={sqmMax} onSqmMax={setSqmMax}
                carMake={carMake} onCarMake={setCarMake}
                carModel={carModel} onCarModel={setCarModel}
                yearFrom={yearFrom} onYearFrom={setYearFrom}
                yearTo={yearTo} onYearTo={setYearTo}
                fuel={fuel} onFuel={setFuel}
                transmission={transmission} onTransmission={setTransmission}
                mileageFrom={mileageFrom} onMileageFrom={setMileageFrom}
                mileageTo={mileageTo} onMileageTo={setMileageTo}
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
                { label: urlPropertyType, key: "propertyType" },
                { label: urlRooms, key: "rooms" },
                { label: urlSqmMin ? `от ${urlSqmMin} кв.м.` : "", key: "sqmMin" },
                { label: urlSqmMax ? `до ${urlSqmMax} кв.м.` : "", key: "sqmMax" },
                { label: urlCarMake, key: "carMake" },
                { label: urlCarModel, key: "carModel" },
                { label: urlYearFrom ? `от ${urlYearFrom}г.` : "", key: "yearFrom" },
                { label: urlYearTo ? `до ${urlYearTo}г.` : "", key: "yearTo" },
                { label: urlFuel, key: "fuel" },
                { label: urlTransmission, key: "transmission" },
                { label: urlMileageFrom ? `от ${urlMileageFrom} км` : "", key: "mileageFrom" },
                { label: urlMileageTo ? `до ${urlMileageTo} км` : "", key: "mileageTo" },
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
