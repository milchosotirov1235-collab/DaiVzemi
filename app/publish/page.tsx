"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import UnverifiedBanner from "@/components/UnverifiedBanner";
import { AlertTriangle, CheckCircle2, ChevronDown, ImagePlus, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import SearchableSelect from "@/components/SearchableSelect";
import { BG_CITIES } from "@/lib/data/cities";
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

// ---------------------------------------------------------------------------
// Category details config
// ---------------------------------------------------------------------------

type FieldType = "text" | "number" | "select";

type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: string[];
  // For dropdowns whose options depend on another field's value
  dependsOn?: string;
  getOptions?: (dependValue: string) => string[];
  required?: boolean;
};

const CATEGORY_DETAILS: Record<string, FieldDef[]> = {
  Автомобили: [
    { key: "vehicle_type", label: "Тип превозно средство", type: "select", options: VEHICLE_TYPES },
    { key: "brand",        label: "Марка",                 type: "select", options: ORDERED_CAR_BRANDS, required: true },
    { key: "model",        label: "Модел",                 type: "select", dependsOn: "brand", getOptions: getModelsForBrand },
    { key: "year",         label: "Година",                type: "number", placeholder: "напр. 2018" },
    { key: "mileage",      label: "Пробег (км)",           type: "number", placeholder: "напр. 150000" },
    { key: "fuel",         label: "Гориво",                type: "select", options: FUEL_TYPES },
    { key: "gearbox",      label: "Скоростна кутия",       type: "select", options: TRANSMISSION_TYPES },
    { key: "engine_size",  label: "Кубатура (cc)",         type: "number", placeholder: "напр. 1968" },
    { key: "power",        label: "Мощност (к.с.)",        type: "number", placeholder: "напр. 140" },
    { key: "euro_standard",label: "Евро стандарт",         type: "select", options: EURO_STANDARDS },
    { key: "body_type",    label: "Купе",                  type: "select", options: CAR_BODY_TYPES },
    { key: "drive_type",   label: "Задвижване",            type: "select", options: DRIVE_TYPES },
    { key: "color",        label: "Цвят",                  type: "select", options: CAR_COLORS },
    { key: "condition",    label: "Състояние",             type: "select", options: CAR_CONDITIONS },
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
    { key: "car_brand",    label: "Марка автомобил",    type: "select", options: ORDERED_CAR_BRANDS },
    { key: "car_model",    label: "Модел автомобил",    type: "select", dependsOn: "car_brand", getOptions: getModelsForBrand },
    { key: "part_category",label: "Категория част",     type: "select", options: AUTO_PART_CATEGORIES, required: true },
    { key: "condition",    label: "Състояние",          type: "select", options: PART_CONDITIONS },
  ],
  Услуги: [
    { key: "service_category", label: "Категория услуга",   type: "select", options: SERVICE_CATEGORIES, required: true },
    { key: "online_service",   label: "Онлайн услуга",      type: "select", options: ["Да", "Не"] },
    { key: "provider_type",    label: "Фирма / Частно лице",type: "select", options: PROVIDER_TYPES },
    { key: "price_type",       label: "Тип на цената",      type: "select", options: PRICE_TYPES },
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
// CategoryDetailFields
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
          // Resolve options: static list or dynamic based on another field's value
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
// Page
// ---------------------------------------------------------------------------

export default function PublishPage() {
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
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Auth
  const [isEmailVerified, setIsEmailVerified] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data?.user ?? null;
      setIsEmailVerified(user ? !!user.email_confirmed_at : null);
    });
  }, []);

  // Dropdown states
  const [isListingTypeOpen, setIsListingTypeOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{
    type: "error" | "success";
    title: string;
    message: string;
  } | null>(null);

  const showError = (title: string, message: string) =>
    setNotice({ type: "error", title, message });

  const showSuccess = (title: string, message: string) =>
    setNotice({ type: "success", title, message });

  const resetNotice = () => setNotice(null);

  const handleDetailChange = (key: string, value: string) => {
    setDetails((prev) => {
      const next = { ...prev, [key]: value };
      // When brand changes, clear dependent model field
      const depField = CATEGORY_DETAILS[category]?.find(
        (f) => f.dependsOn === key
      );
      if (depField) next[depField.key] = "";
      return next;
    });
  };

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    setIsCategoryOpen(false);
    setDetails({});
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    resetNotice();
    const files = Array.from(e.target.files ?? []);

    if (files.length === 0) {
      setSelectedImages([]);
      setImagePreviewUrls([]);
      setUploadProgress(0);
      return;
    }

    if (files.length > 10) {
      showError("Твърде много снимки", "Можете да изберете максимум 10 снимки.");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxSize = 5 * 1024 * 1024;

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        showError("Невалиден формат", "Разрешени са само JPG, JPEG, PNG и WEBP файлове.");
        return;
      }
      if (file.size > maxSize) {
        showError("Снимката е твърде голяма", "Размерът на всяка снимка не трябва да надвишава 5MB.");
        return;
      }
    }

    imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    setSelectedImages(files);
    setImagePreviewUrls(files.map((file) => URL.createObjectURL(file)));
    setUploadProgress(0);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    resetNotice();

    if (!isEmailVerified) {
      showError("Имейлът не е потвърден", "Трябва да потвърдите имейла си, преди да публикувате обява.");
      return;
    }

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanCity = city.trim();
    const cleanPrice = price.trim();

    if (cleanTitle.length < 3) {
      showError("Кратко заглавие", "Заглавието трябва да съдържа поне 3 символа.");
      return;
    }
    if (cleanCity.length < 2) {
      showError("Липсва град", "Моля въведете град преди да публикувате обявата.");
      return;
    }
    if (cleanDescription.length < 10) {
      showError("Кратко описание", "Описанието трябва да съдържа поне 10 символа.");
      return;
    }
    if (selectedImages.length > 10) {
      showError("Твърде много снимки", "Можете да изберете максимум 10 снимки.");
      return;
    }

    // Validate required detail fields
    const requiredFields = CATEGORY_DETAILS[category]?.filter((f) => f.required) ?? [];
    for (const field of requiredFields) {
      if (!details[field.key]?.trim()) {
        showError(
          `Липсва ${field.label.toLowerCase()}`,
          `Полето "${field.label}" е задължително за категория ${category}.`
        );
        return;
      }
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user ?? null;

    if (!user) {
      showError("Не сте влезли в профила си", "Трябва да влезете в профила си, за да публикувате обява.");
      return;
    }

    setLoading(true);
    setUploadingImages(false);
    setUploadProgress(0);

    let uploadedUrls: string[] = [];

    if (selectedImages.length > 0) {
      setUploadingImages(true);
      const timestamp = Date.now();

      for (let index = 0; index < selectedImages.length; index += 1) {
        const file = selectedImages[index];
        const safeFileName = file.name.replace(/\s+/g, "_");
        const filePath = `${user.id}/${timestamp}_${index}_${safeFileName}`;

        const { error: uploadError } = await supabase.storage
          .from("listing-images")
          .upload(filePath, file, { cacheControl: "3600", upsert: false });

        if (uploadError) {
          setUploadingImages(false);
          setLoading(false);
          showError("Снимките не се качиха", "Моля опитайте отново или изберете други снимки.");
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from("listing-images")
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          uploadedUrls.push(publicUrlData.publicUrl);
        }

        setUploadProgress(Math.round(((index + 1) / selectedImages.length) * 100));
      }

      setUploadingImages(false);
    }

    // Build details object — strip empty values before saving
    const cleanDetails: Record<string, string> = {};
    for (const [key, value] of Object.entries(details)) {
      if (value.trim()) cleanDetails[key] = value.trim();
    }

    const { error: insertError } = await supabase.from("listings").insert([
      {
        title: cleanTitle,
        description: cleanDescription,
        price: cleanPrice,
        city: cleanCity,
        category,
        listing_type: listingType,
        user_id: user.id,
        image_url: uploadedUrls[0] ?? null,
        image_urls: uploadedUrls,
        details: cleanDetails,
      },
    ]);

    setLoading(false);
    setUploadingImages(false);
    setUploadProgress(0);

    if (insertError) {
      const message = insertError.message;
      if (message.includes("listings_city_min_length")) {
        showError("Липсва град", "Моля въведете град преди да публикувате обявата.");
      } else if (message.includes("listings_title_min_length")) {
        showError("Кратко заглавие", "Заглавието трябва да съдържа поне 3 символа.");
      } else if (message.includes("listings_description_min_length")) {
        showError("Кратко описание", "Описанието трябва да съдържа поне 10 символа.");
      } else if (message.includes("listings_category_not_empty")) {
        showError("Липсва категория", "Моля изберете категория за обявата.");
      } else if (message.includes("listings_listing_type_not_empty")) {
        showError("Липсва тип обява", "Моля изберете тип обява.");
      } else {
        showError("Обявата не беше публикувана", "Моля проверете въведените данни и опитайте отново.");
      }
      return;
    }

    showSuccess("Обявата е публикувана", "Вашата обява беше публикувана успешно.");

    setTitle("");
    setDescription("");
    setPrice("");
    setCity("");
    setCategory("Имоти");
    setListingType("Продавам");
    setDetails({});
    setSelectedImages([]);
    setImagePreviewUrls((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      {isEmailVerified === false && <UnverifiedBanner />}

      <section className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-slate-950 py-20 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_32%)]" />
        <div className="relative mx-auto max-w-6xl px-6 text-center">
          <p className="mb-3 text-sm uppercase tracking-[0.35em] text-blue-200">DaiVzemi</p>
          <h1 className="text-5xl font-black md:text-6xl">Публикувай обява</h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg text-blue-100">
            Създай своята обява безплатно за няколко минути.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-[36px] bg-white p-8 shadow-2xl ring-1 ring-slate-200 md:p-12">
          <div className="mb-10 flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-950 text-white shadow-lg">
              <ImagePlus className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-blue-950">Форма за публикуване</h2>
              <p className="mt-3 max-w-2xl text-base font-semibold text-slate-500">
                Попълнете данните ясно, за да може обявата да бъде лесно открита.
              </p>
            </div>
          </div>

          <form className="space-y-7" onSubmit={handleSubmit}>
            {notice ? (
              <div
                className={`rounded-[28px] border p-5 shadow-sm ${
                  notice.type === "error"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-green-200 bg-green-50 text-green-800"
                }`}
              >
                <div className="flex gap-3">
                  {notice.type === "error" ? (
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                  )}
                  <div>
                    <p className="font-black">{notice.title}</p>
                    <p className="mt-1 text-sm font-semibold opacity-90">{notice.message}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Title + Listing type */}
            <div className="grid gap-5 lg:grid-cols-2">
              <label className="space-y-2.5">
                <span className="block text-sm font-black text-blue-950">Заглавие *</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  type="text"
                  placeholder="Например: Модерен апартамент в центъра"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-bold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-950 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <div className="space-y-2.5">
                <span className="block text-sm font-black text-blue-950">Тип обява *</span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsListingTypeOpen((prev) => !prev)}
                    className="flex w-full cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-left shadow-sm transition hover:bg-white focus:border-blue-950 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  >
                    <span className="text-base font-bold text-slate-900">{listingType}</span>
                    <ChevronDown className={`h-5 w-5 text-blue-950 transition ${isListingTypeOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isListingTypeOpen ? (
                    <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                      {listingTypeOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => { setListingType(option); setIsListingTypeOpen(false); }}
                          className={`flex w-full cursor-pointer items-center rounded-xl px-4 py-3 text-left text-sm font-bold transition hover:bg-slate-100 ${
                            option === listingType ? "bg-slate-100 text-blue-950" : "text-slate-700"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Category + Price */}
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-2.5">
                <span className="block text-sm font-black text-blue-950">Категория *</span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCategoryOpen((prev) => !prev)}
                    className="flex w-full cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-left shadow-sm transition hover:bg-white focus:border-blue-950 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  >
                    <span className="text-base font-bold text-slate-900">{category}</span>
                    <ChevronDown className={`h-5 w-5 text-blue-950 transition ${isCategoryOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isCategoryOpen ? (
                    <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                      {categoryOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleCategoryChange(option)}
                          className={`flex w-full cursor-pointer items-center rounded-xl px-4 py-3 text-left text-sm font-bold transition hover:bg-slate-100 ${
                            option === category ? "bg-slate-100 text-blue-950" : "text-slate-700"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <label className="space-y-2.5">
                <span className="block text-sm font-black text-blue-950">Цена</span>
                <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 shadow-sm transition focus-within:border-blue-950 focus-within:ring-4 focus-within:ring-blue-100">
                  <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    type="text"
                    placeholder="500"
                    className="w-full rounded-2xl bg-transparent px-5 py-4 font-bold text-slate-900 outline-none placeholder:text-slate-400"
                  />
                  <span className="mr-3 inline-flex items-center rounded-xl bg-white px-3 py-1.5 text-sm font-black text-blue-950">€</span>
                </div>
              </label>
            </div>

            {/* City */}
            <div className="space-y-2.5">
              <span className="block text-sm font-black text-blue-950">Град *</span>
              <SearchableSelect
                value={city}
                onChange={setCity}
                options={BG_CITIES}
                placeholder="Например: София"
                size="md"
              />
            </div>

            {/* Category-specific details panel */}
            {CATEGORY_DETAILS[category] && (
              <CategoryDetailFields
                category={category}
                details={details}
                onChange={handleDetailChange}
              />
            )}

            {/* Description */}
            <label className="block space-y-2.5">
              <span className="block text-sm font-black text-blue-950">Описание *</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                placeholder="Опишете детайлно състоянието, характеристиките и допълнителните условия."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-bold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-950 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            {/* Images */}
            <div className="rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-6 text-center">
              <p className="text-base font-black text-blue-950">Снимки на обявата</p>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                JPG, JPEG, PNG, WEBP · максимум 5MB на файл · до 10 снимки
              </p>
              <label className="mt-5 inline-flex cursor-pointer rounded-2xl bg-blue-950 px-6 py-3 text-sm font-black text-white shadow-lg transition hover:bg-blue-900">
                Избери снимки
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>

              {imagePreviewUrls.length > 0 ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {imagePreviewUrls.map((url, index) => (
                    <div key={url} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <img src={url} alt={`Preview ${index + 1}`} className="h-32 w-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : null}

              {uploadingImages ? (
                <div className="mt-4 text-left">
                  <div className="flex items-center justify-between text-sm font-bold text-slate-600">
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
              ) : null}
            </div>

            <button
              type="submit"
              disabled={loading || uploadingImages}
              className="w-full rounded-2xl bg-blue-950 px-6 py-4 text-base font-black text-white shadow-lg transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Публикуване..." : "Публикувай"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
