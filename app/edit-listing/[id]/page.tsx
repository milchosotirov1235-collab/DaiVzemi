"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { ChevronDown, SlidersHorizontal, Trash2, Upload } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import SearchableSelect from "@/components/SearchableSelect";
import { ORDERED_CAR_BRANDS, getModelsForBrand } from "@/lib/data/vehicles";
import {
  PROPERTY_PURPOSES, PROPERTY_TYPES, ROOM_OPTIONS, FURNISHING_OPTIONS, HEATING_OPTIONS,
  CONSTRUCTION_TYPES, PROPERTY_CONDITIONS, FLOOR_OPTIONS, PARKING_OPTIONS,
  FUEL_TYPES, TRANSMISSION_TYPES, CAR_BODY_TYPES, EURO_STANDARDS,
  DRIVE_TYPES, CAR_COLORS, CAR_CONDITIONS, VEHICLE_TYPES,
  AUTO_PART_CATEGORIES, PART_CONDITIONS,
  SERVICE_CATEGORIES, PROVIDER_TYPES, PRICE_TYPES,
  JOB_CATEGORIES, EMPLOYMENT_TYPES, EXPERIENCE_LEVELS,
  ELECTRONICS_DEVICE_TYPES, ELECTRONICS_BRANDS, ELECTRONICS_STORAGE_OPTIONS,
  ELECTRONICS_RAM_OPTIONS, ELECTRONICS_COLORS, ITEM_CONDITIONS,
} from "@/lib/data/categoryData";

// ---------------------------------------------------------------------------
// Static options
// ---------------------------------------------------------------------------

const listingTypeOptions = ["Продавам", "Подарявам", "Разменям", "Търся"];

const categoryOptions = [
  "Имоти", "Автомобили", "Авточасти", "Електроника",
  "Детски стоки", "Дом и градина", "Мода", "Спорт и хоби",
  "Услуги", "Работа", "Компютри", "Книги",
];

const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const maxImageSize = 5 * 1024 * 1024;
const maxImages = 10;

// ---------------------------------------------------------------------------
// Category details config (mirrors publish page exactly)
// ---------------------------------------------------------------------------

type FieldType = "text" | "number" | "select";

type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: string[];
  dependsOn?: string;
  getOptions?: (dependValue: string) => string[];
  required?: boolean;
};

const CATEGORY_DETAILS: Record<string, FieldDef[]> = {
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
    { key: "property_purpose",   label: "Предназначение",   type: "select", options: PROPERTY_PURPOSES, required: true },
    { key: "property_type",      label: "Тип имот",         type: "select", options: PROPERTY_TYPES, required: true },
    { key: "area",               label: "Площ (кв.м.)",     type: "number", placeholder: "напр. 80" },
    { key: "rooms",              label: "Стаи",             type: "select", options: ROOM_OPTIONS },
    { key: "floor",              label: "Етаж",             type: "select", options: FLOOR_OPTIONS },
    { key: "furnished",          label: "Обзавеждане",      type: "select", options: FURNISHING_OPTIONS },
    { key: "heating",            label: "Отопление",        type: "select", options: HEATING_OPTIONS },
    { key: "construction_type",  label: "Строителство",     type: "select", options: CONSTRUCTION_TYPES },
    { key: "property_condition", label: "Състояние",        type: "select", options: PROPERTY_CONDITIONS },
    { key: "elevator",           label: "Асансьор",         type: "select", options: ["Да", "Не"] },
    { key: "parking",            label: "Паркиране",        type: "select", options: PARKING_OPTIONS },
  ],
  Електроника: [
    { key: "device_type", label: "Тип устройство",  type: "select", options: ELECTRONICS_DEVICE_TYPES, required: true },
    { key: "brand",       label: "Марка",            type: "select", options: ELECTRONICS_BRANDS },
    { key: "model",       label: "Модел",            type: "text",   placeholder: "напр. Galaxy S24" },
    { key: "condition",   label: "Състояние",        type: "select", options: ITEM_CONDITIONS },
    { key: "storage",     label: "Памет",            type: "select", options: ELECTRONICS_STORAGE_OPTIONS },
    { key: "ram",         label: "RAM",              type: "select", options: ELECTRONICS_RAM_OPTIONS },
    { key: "color",       label: "Цвят",             type: "select", options: ELECTRONICS_COLORS },
  ],
  Авточасти: [
    { key: "car_brand",     label: "Марка автомобил",    type: "select", options: ORDERED_CAR_BRANDS },
    { key: "car_model",     label: "Модел автомобил",    type: "select", dependsOn: "car_brand", getOptions: getModelsForBrand },
    { key: "part_category", label: "Категория част",     type: "select", options: AUTO_PART_CATEGORIES, required: true },
    { key: "condition",     label: "Състояние",          type: "select", options: PART_CONDITIONS },
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
};

// ---------------------------------------------------------------------------
// CategoryDetailFields (same design as publish page)
// ---------------------------------------------------------------------------

function CategoryDetailFields({
  category,
  details,
  onChange,
}: {
  category: string;
  details: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const fields = CATEGORY_DETAILS[category];
  if (!fields) return null;

  return (
    <div className="rounded-[28px] border border-blue-100 bg-blue-50/40 p-6">
      <div className="mb-5 flex items-center gap-2">
        <SlidersHorizontal className="h-5 w-5 text-blue-950" />
        <span className="text-base font-black text-blue-950">Детайли за {category}</span>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map((field) => {
          const dependValue = field.dependsOn ? (details[field.dependsOn] ?? "") : "";
          const resolvedOptions = field.getOptions
            ? field.getOptions(dependValue)
            : (field.options ?? []);
          const isDisabledByDep = !!field.dependsOn && !dependValue;

          return (
            <label key={field.key} className="space-y-2">
              <span className="block text-sm font-black text-blue-950">
                {field.label}
                {field.required && <span className="ml-1 text-red-500">*</span>}
              </span>

              {field.type === "select" ? (
                <SearchableSelect
                  value={details[field.key] ?? ""}
                  onChange={(v) => onChange(field.key, v)}
                  options={resolvedOptions}
                  placeholder={`Избери ${field.label.toLowerCase()}`}
                  disabled={isDisabledByDep}
                  disabledPlaceholder="Първо изберете марка"
                  size="md"
                />
              ) : (
                <input
                  value={details[field.key] ?? ""}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  type={field.type}
                  placeholder={field.placeholder ?? ""}
                  min={field.type === "number" ? "0" : undefined}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-bold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-950 focus:ring-4 focus:ring-blue-100"
                />
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Listing type
// ---------------------------------------------------------------------------

type Listing = {
  id: string;
  title: string;
  description: string | null;
  price: string | number | null;
  city: string | null;
  category: string | null;
  listing_type: string | null;
  user_id: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  details: Record<string, string> | null;
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EditListingPage() {
  const params = useParams();
  const id = params?.id as string;

  // Core fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("Имоти");
  const [listingType, setListingType] = useState("Продавам");

  // Category-specific details
  const [details, setDetails] = useState<Record<string, string>>({});

  // Images
  const [currentImages, setCurrentImages] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviewUrls, setNewImagePreviewUrls] = useState<string[]>([]);

  // UI
  const [isListingTypeOpen, setIsListingTypeOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isOwner, setIsOwner] = useState(false);

  // ---------------------------------------------------------------------------
  // Cleanup preview URLs on unmount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      newImagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [newImagePreviewUrls]);

  // ---------------------------------------------------------------------------
  // Load listing
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const loadListing = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        setIsOwner(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("listings")
        .select("id, title, description, price, city, category, listing_type, user_id, image_url, image_urls, details")
        .eq("id", id)
        .single<Listing>();

      if (fetchError || !data) {
        setLoading(false);
        setIsOwner(false);
        return;
      }

      if (data.user_id !== user.id) {
        setIsOwner(false);
        setLoading(false);
        return;
      }

      const storedImages = (data.image_urls ?? []).filter(Boolean) as string[];
      const fallbackImage = data.image_url ? [data.image_url] : [];
      const initialImages = storedImages.length > 0 ? storedImages : fallbackImage;

      setIsOwner(true);
      setTitle(data.title ?? "");
      setDescription(data.description ?? "");
      setPrice(data.price ? String(data.price) : "");
      setCity(data.city ?? "");
      setCategory(data.category ?? "Имоти");
      setListingType(data.listing_type ?? "Продавам");
      setCurrentImages(initialImages);

      // Pre-fill details JSONB — convert all values to strings for form fields
      const rawDetails = data.details ?? {};
      const stringDetails: Record<string, string> = {};
      for (const [k, v] of Object.entries(rawDetails)) {
        stringDetails[k] = v != null ? String(v) : "";
      }
      setDetails(stringDetails);

      setLoading(false);
    };

    if (id) {
      loadListing();
    }
  }, [id]);

  // ---------------------------------------------------------------------------
  // Detail field handlers
  // ---------------------------------------------------------------------------

  const handleDetailChange = (key: string, value: string) => {
    setDetails((prev) => {
      const next = { ...prev, [key]: value };
      // Clear dependent field when parent changes (e.g. brand → model)
      const depField = CATEGORY_DETAILS[category]?.find((f) => f.dependsOn === key);
      if (depField) next[depField.key] = "";
      return next;
    });
  };

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    setIsCategoryOpen(false);
    // Do NOT clear details — user may switch back. Details are filtered on save.
  };

  // ---------------------------------------------------------------------------
  // Image handlers
  // ---------------------------------------------------------------------------

  const validateImageFiles = (files: File[]) => {
    for (const file of files) {
      if (!allowedImageTypes.includes(file.type)) {
        setError("Разрешени са само JPG, JPEG, PNG и WEBP файлове.");
        return false;
      }
      if (file.size > maxImageSize) {
        setError("Размерът на всяка снимка не трябва да надвишава 5MB.");
        return false;
      }
    }
    return true;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    if (currentImages.length + newImageFiles.length + files.length > maxImages) {
      setError(`Можете да имате максимум ${maxImages} снимки.`);
      return;
    }

    if (!validateImageFiles(files)) return;

    setError("");
    const previewUrls = files.map((file) => URL.createObjectURL(file));
    setNewImageFiles((prev) => [...prev, ...files]);
    setNewImagePreviewUrls((prev) => [...prev, ...previewUrls]);
  };

  const handleRemoveExistingImage = (imageUrl: string) => {
    setCurrentImages((prev) => prev.filter((img) => img !== imageUrl));
  };

  const handleRemoveNewImage = (index: number) => {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
    setNewImagePreviewUrls((prev) => {
      const urlToRevoke = prev[index];
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
      return prev.filter((_, i) => i !== index);
    });
  };

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError("Трябва да влезете в профила си, за да редактирате обява.");
      return;
    }

    if (currentImages.length + newImageFiles.length > maxImages) {
      setError(`Можете да имате максимум ${maxImages} снимки.`);
      return;
    }

    setSaving(true);
    setUploadingImages(false);
    setUploadProgress(0);

    let uploadedUrls: string[] = [];

    if (newImageFiles.length > 0) {
      setUploadingImages(true);
      const timestamp = Date.now();

      for (let index = 0; index < newImageFiles.length; index += 1) {
        const file = newImageFiles[index];
        const safeFileName = file.name.replace(/\s+/g, "_");
        const filePath = `${user.id}/${timestamp}_${index}_${safeFileName}`;

        const { error: uploadError } = await supabase.storage
          .from("listing-images")
          .upload(filePath, file, { cacheControl: "3600", upsert: false });

        if (uploadError) {
          setUploadingImages(false);
          setSaving(false);
          setError(uploadError.message);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from("listing-images")
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          uploadedUrls.push(publicUrlData.publicUrl);
        }

        setUploadProgress(Math.round(((index + 1) / newImageFiles.length) * 100));
      }

      setUploadingImages(false);
    }

    const updatedImageUrls = [...currentImages, ...uploadedUrls];
    const firstImageUrl = updatedImageUrls[0] ?? null;

    // Only save details keys that belong to the current category
    const categoryFields = CATEGORY_DETAILS[category] ?? [];
    const cleanDetails: Record<string, string> = {};
    for (const field of categoryFields) {
      const val = (details[field.key] ?? "").trim();
      if (val) cleanDetails[field.key] = val;
    }

    const { error: updateError } = await supabase
      .from("listings")
      .update({
        title,
        description,
        price,
        city,
        category,
        listing_type: listingType,
        image_url: firstImageUrl,
        image_urls: updatedImageUrls,
        details: cleanDetails,
      })
      .eq("id", id)
      .eq("user_id", user.id);

    setSaving(false);
    setUploadProgress(0);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setCurrentImages(updatedImageUrls);
    setNewImageFiles([]);
    setNewImagePreviewUrls((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });
    setSuccess("Обявата е обновена успешно.");
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const hasDetailFields = Boolean(CATEGORY_DETAILS[category]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Header />

      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 py-20 text-white">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <p className="mb-3 text-sm uppercase tracking-[0.3em] text-blue-200">DaiVzemi</p>
          <h1 className="text-5xl font-black md:text-6xl">Редактирай обява</h1>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-[32px] bg-white p-8 shadow-2xl ring-1 ring-slate-200 md:p-12">
          {loading ? (
            <p className="text-base font-semibold text-slate-600">Зареждане...</p>
          ) : !isOwner ? (
            <div className="text-center">
              <p className="text-xl font-black text-slate-900">
                Нямате право да редактирате тази обява.
              </p>
              <Link
                href="/my-listings"
                className="mt-6 inline-flex items-center justify-center rounded-2xl bg-blue-950 px-6 py-3 text-sm font-black text-white transition hover:bg-blue-900"
              >
                Моите обяви
              </Link>
            </div>
          ) : (
            <form className="space-y-7" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {success}
                </div>
              )}

              {/* ── Images ── */}
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-800">Снимки</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {currentImages.length + newImageFiles.length} / {maxImages} снимки
                    </p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-blue-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-900">
                    <Upload className="h-4 w-4" />
                    Добави снимки
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </label>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {currentImages.map((imageUrl) => (
                    <div key={imageUrl} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <img src={imageUrl} alt="Listing image" className="h-40 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingImage(imageUrl)}
                        className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-red-600 shadow-sm"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Премахни
                      </button>
                    </div>
                  ))}

                  {newImagePreviewUrls.map((url, index) => (
                    <div key={url} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <img src={url} alt={`New preview ${index + 1}`} className="h-40 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveNewImage(index)}
                        className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-red-600 shadow-sm"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Премахни
                      </button>
                    </div>
                  ))}
                </div>

                {uploadingImages && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>Качване на снимки</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-blue-950 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ── Title + Listing type ── */}
              <div className="grid gap-5 lg:grid-cols-2">
                <label className="space-y-2.5">
                  <span className="block text-sm font-semibold text-slate-800">Заглавие</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    type="text"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 shadow-sm outline-none transition focus:border-blue-900 focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <div className="space-y-2.5">
                  <span className="block text-sm font-semibold text-slate-800">Тип обява</span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsListingTypeOpen((v) => !v)}
                      className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-left shadow-sm transition hover:bg-slate-50 focus:border-blue-900 focus:outline-none focus:ring-4 focus:ring-blue-100"
                    >
                      <span className="text-base font-medium text-slate-900">{listingType}</span>
                      <ChevronDown className={`h-5 w-5 text-slate-500 transition ${isListingTypeOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isListingTypeOpen && (
                      <div className="absolute z-20 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
                        {listingTypeOptions.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => { setListingType(opt); setIsListingTypeOpen(false); }}
                            className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 ${opt === listingType ? "bg-slate-100 text-slate-900" : ""}`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Category + Price ── */}
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="space-y-2.5">
                  <span className="block text-sm font-semibold text-slate-800">Категория</span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsCategoryOpen((v) => !v)}
                      className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-left shadow-sm transition hover:bg-slate-50 focus:border-blue-900 focus:outline-none focus:ring-4 focus:ring-blue-100"
                    >
                      <span className="text-base font-medium text-slate-900">{category}</span>
                      <ChevronDown className={`h-5 w-5 text-slate-500 transition ${isCategoryOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isCategoryOpen && (
                      <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
                        {categoryOptions.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleCategoryChange(opt)}
                            className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 ${opt === category ? "bg-slate-100 text-slate-900" : ""}`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <label className="space-y-2.5">
                  <span className="block text-sm font-semibold text-slate-800">Цена</span>
                  <div className="flex items-center rounded-2xl border border-slate-200 bg-white shadow-sm transition focus-within:border-blue-900 focus-within:ring-4 focus-within:ring-blue-100">
                    <input
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      type="text"
                      className="w-full rounded-2xl bg-transparent px-4 py-3.5 text-base text-slate-900 outline-none"
                    />
                    <span className="mr-3 inline-flex items-center rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">€</span>
                  </div>
                </label>
              </div>

              {/* ── City ── */}
              <label className="block space-y-2.5">
                <span className="block text-sm font-semibold text-slate-800">Град</span>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  type="text"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 shadow-sm outline-none transition focus:border-blue-900 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              {/* ── Category-specific detail fields ── */}
              {hasDetailFields && (
                <CategoryDetailFields
                  category={category}
                  details={details}
                  onChange={handleDetailChange}
                />
              )}

              {/* ── Description ── */}
              <label className="block space-y-2.5">
                <span className="block text-sm font-semibold text-slate-800">Описание</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 shadow-sm outline-none transition focus:border-blue-900 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <button
                type="submit"
                disabled={saving || uploadingImages}
                className="w-full rounded-2xl bg-blue-950 px-6 py-4 text-base font-black text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Запазване..." : "Запази промените"}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
