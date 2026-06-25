"use client";

import { useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import UnverifiedBanner from "@/components/UnverifiedBanner";
import { AlertTriangle, CheckCircle2, ChevronDown, ImagePlus, SlidersHorizontal, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { checkListingRateLimit, checkDuplicateListing } from "@/lib/security/rateLimit";
import { getImageLimit } from "@/lib/config/imageLimits";
import SearchableSelect from "@/components/SearchableSelect";
import ListingAssistant from "@/components/ListingAssistant";
import { BG_CITIES } from "@/lib/data/cities";
import { CATEGORY_DETAILS, categoryOptions, listingTypeOptions, type FieldDef } from "@/lib/categories";


// ---------------------------------------------------------------------------
// CategoryDetailFields
// ---------------------------------------------------------------------------

function CategoryDetailFields({
  category,
  details,
  onChange,
  errorKeys = new Set(),
  onFieldChange,
}: {
  category: string;
  details: Record<string, string>;
  onChange: (key: string, value: string) => void;
  errorKeys?: Set<string>;
  onFieldChange?: (key: string) => void;
}) {
  const fields = CATEGORY_DETAILS[category];
  if (!fields) return null;

  const handleChange = (key: string, value: string) => {
    onChange(key, value);
    onFieldChange?.(key);
  };

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
          const hasError = errorKeys.has(field.key);

          return (
          <label key={field.key} className="space-y-2">
            <span className={`block text-sm font-black ${hasError ? "text-red-600" : "text-blue-950"}`}>
              {field.label}
              {field.required && <span className="ml-1 text-red-500">*</span>}
            </span>

            {field.type === "select" ? (
              <div className={hasError ? "rounded-2xl ring-2 ring-red-400" : ""}>
                <SearchableSelect
                  value={details[field.key] ?? ""}
                  onChange={(v) => handleChange(field.key, v)}
                  options={resolvedOptions}
                  placeholder={`Избери ${field.label.toLowerCase()}`}
                  disabled={isDisabledByDep}
                  disabledPlaceholder="Първо изберете марка"
                  size="md"
                />
              </div>
            ) : (
              <input
                value={details[field.key] ?? ""}
                onChange={(e) => handleChange(field.key, e.target.value)}
                type={field.type}
                placeholder={field.placeholder ?? ""}
                min={field.type === "number" ? "0" : undefined}
                className={`w-full rounded-2xl border px-5 py-4 font-bold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                  hasError
                    ? "border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-100"
                    : "border-slate-200 bg-slate-50 focus:border-blue-950 focus:ring-blue-100"
                }`}
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
  // Published listing — set after successful submit to show assistant
  const [publishedListing, setPublishedListing] = useState<{
    id: number;
    title: string;
    description: string;
    category: string;
    details: Record<string, string>;
  } | null>(null);

  // Core fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [negotiable, setNegotiable] = useState(false);
  const [urgent, setUrgent] = useState(false);
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("Имоти");
  const [listingType, setListingType] = useState("Продавам");

  // Category-specific details
  const [details, setDetails] = useState<Record<string, string>>({});

  // Derived image limit — updates whenever category changes
  const imageLimit = getImageLimit(category);

  // Images
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Validation error state — keys that failed validation
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set());

  // Refs for scroll-to-error
  const titleRef = useRef<HTMLLabelElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLLabelElement>(null);
  const categoryDetailsRef = useRef<HTMLDivElement>(null);

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
    const newFiles = Array.from(e.target.files ?? []);
    // Reset input so the same file can be picked again later
    e.target.value = "";

    if (newFiles.length === 0) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxSize = 5 * 1024 * 1024;

    for (const file of newFiles) {
      if (!allowedTypes.includes(file.type)) {
        showError("Невалиден формат", "Разрешени са само JPG, JPEG, PNG и WEBP файлове.");
        return;
      }
      if (file.size > maxSize) {
        showError("Снимката е твърде голяма", "Размерът на всяка снимка не трябва да надвишава 5MB.");
        return;
      }
    }

    // Append to existing selection, skip exact duplicates (same name+size+lastModified)
    const combined = [...selectedImages];
    const combinedPreviews = [...imagePreviewUrls];

    for (const file of newFiles) {
      const isDupe = combined.some(
        (f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified
      );
      if (!isDupe) {
        combined.push(file);
        combinedPreviews.push(URL.createObjectURL(file));
      }
    }

    if (combined.length > imageLimit) {
      // Revoke the URLs we just created for the new files before bailing
      combinedPreviews.slice(selectedImages.length).forEach((url) => URL.revokeObjectURL(url));
      showError("Твърде много снимки", `Можете да изберете максимум ${imageLimit} снимки за тази категория.`);
      return;
    }

    setSelectedImages(combined);
    setImagePreviewUrls(combinedPreviews);
    setUploadProgress(0);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviewUrls[index]);
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviewUrls((prev) => prev.filter((_, i) => i !== index));
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

    // Collect ALL validation errors before showing anything
    const errors = new Set<string>();
    const errorRefs: Array<React.RefObject<HTMLElement | null>> = [];

    if (cleanTitle.length < 3) {
      errors.add("title");
      errorRefs.push(titleRef as React.RefObject<HTMLElement | null>);
    }
    if (cleanCity.length < 2) {
      errors.add("city");
      errorRefs.push(cityRef as React.RefObject<HTMLElement | null>);
    }
    if (cleanDescription.length < 10) {
      errors.add("description");
      errorRefs.push(descriptionRef as React.RefObject<HTMLElement | null>);
    }
    if (selectedImages.length > imageLimit) {
      errors.add("images");
    }

    // Validate required detail fields
    const requiredFields = CATEGORY_DETAILS[category]?.filter((f) => f.required) ?? [];
    for (const field of requiredFields) {
      if (!details[field.key]?.trim()) {
        errors.add(field.key);
        if (!errorRefs.includes(categoryDetailsRef as React.RefObject<HTMLElement | null>)) {
          errorRefs.push(categoryDetailsRef as React.RefObject<HTMLElement | null>);
        }
      }
    }

    if (errors.size > 0) {
      setFieldErrors(errors);
      errorRefs[0]?.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      showError("Попълнете задължителните полета", "Маркираните в червено полета са задължителни.");
      return;
    }
    setFieldErrors(new Set());

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user ?? null;

    if (!user) {
      showError("Не сте влезли в профила си", "Трябва да влезете в профила си, за да публикувате обява.");
      return;
    }

    // ── Rate limit + duplicate checks ─────────────────────────────────────
    const [rateResult, dupResult] = await Promise.all([
      checkListingRateLimit(user.id),
      checkDuplicateListing(user.id, cleanTitle, cleanDescription),
    ]);
    if (!rateResult.allowed) {
      showError("Лимит за обяви", rateResult.reason);
      return;
    }
    if (!dupResult.allowed) {
      showError("Дублирана обява", dupResult.reason);
      return;
    }

    setLoading(true);
    setUploadingImages(false);
    setUploadProgress(0);

    let uploadedUrls: string[] = [];

    if (selectedImages.length > 0) {
      setUploadingImages(true);
      setUploadProgress(0);
      const timestamp = Date.now();

      for (let index = 0; index < selectedImages.length; index++) {
        const file = selectedImages[index];
        const rawExt = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const safeExt = ["jpg", "jpeg", "png", "webp"].includes(rawExt) ? rawExt : "jpg";
        const filePath = `${user.id}/${timestamp}_${index}.${safeExt}`;

        const { error: uploadError } = await supabase.storage
          .from("listing-images")
          .upload(filePath, file, { cacheControl: "3600", upsert: true });

        if (uploadError) {
          console.error("Storage upload error:", uploadError);
          setUploadingImages(false);
          setLoading(false);
          showError("Снимките не се качиха", `Грешка: ${uploadError.message}`);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from("listing-images")
          .getPublicUrl(filePath);

        const url = publicUrlData?.publicUrl ?? null;
        if (!url) {
          setUploadingImages(false);
          setLoading(false);
          showError("Снимките не се качиха", "Моля опитайте отново или изберете други снимки.");
          return;
        }

        uploadedUrls.push(url);
        setUploadProgress(Math.round(((index + 1) / selectedImages.length) * 100));
      }

      setUploadingImages(false);
    }

    // Build details object — strip empty values before saving
    const cleanDetails: Record<string, string> = {};
    for (const [key, value] of Object.entries(details)) {
      if (value.trim()) cleanDetails[key] = value.trim();
    }
    if (negotiable) cleanDetails.negotiable = "yes";
    if (urgent) cleanDetails.urgent = "yes";

    const { data: insertData, error: insertError } = await supabase.from("listings").insert([
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
        moderation_status: "pending",
      },
    ]).select("id").single();

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

    // Show assistant panel — capture current form values before reset
    if (insertData?.id) {
      setPublishedListing({
        id: insertData.id,
        title: cleanTitle,
        description: cleanDescription,
        category,
        details: cleanDetails,
      });
    }

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
        {publishedListing ? (
          <div className="mx-auto max-w-2xl">
            <ListingAssistant
              listingId={publishedListing.id}
              title={publishedListing.title}
              description={publishedListing.description}
              category={publishedListing.category}
              details={publishedListing.details}
            />
          </div>
        ) : null}
        <div className={publishedListing ? "hidden" : "rounded-[36px] bg-white p-8 shadow-2xl ring-1 ring-slate-200 md:p-12"}>
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
              <label ref={titleRef} className="space-y-2.5">
                <span className={`block text-sm font-black ${fieldErrors.has("title") ? "text-red-600" : "text-blue-950"}`}>Заглавие *</span>
                <input
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setFieldErrors((prev) => { const n = new Set(prev); n.delete("title"); return n; }); }}
                  type="text"
                  placeholder="Например: Модерен апартамент в центъра"
                  className={`w-full rounded-2xl border px-5 py-4 font-bold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-4 ${fieldErrors.has("title") ? "border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-100" : "border-slate-200 bg-slate-50 focus:border-blue-950 focus:ring-blue-100"}`}
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

              <div className="space-y-2.5">
                <span className="block text-sm font-black text-blue-950">Цена</span>
                <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 shadow-sm transition focus-within:border-blue-950 focus-within:ring-4 focus-within:ring-blue-100">
                  <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    type="text"
                    placeholder="500"
                    disabled={negotiable}
                    className="w-full rounded-2xl bg-transparent px-5 py-4 font-bold text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-40"
                  />
                  <span className="mr-3 inline-flex items-center rounded-xl bg-white px-3 py-1.5 text-sm font-black text-blue-950">€</span>
                </div>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={negotiable}
                    onChange={(e) => { setNegotiable(e.target.checked); if (e.target.checked) setPrice(""); }}
                    className="h-4 w-4 rounded accent-blue-950"
                  />
                  <span className="text-sm font-semibold text-slate-700">Цената е договаряема</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={urgent}
                    onChange={(e) => setUrgent(e.target.checked)}
                    className="h-4 w-4 rounded accent-red-600"
                  />
                  <span className="text-sm font-semibold text-slate-700">Спешна продажба</span>
                </label>
              </div>
            </div>

            {/* City */}
            <div ref={cityRef} className="space-y-2.5">
              <span className={`block text-sm font-black ${fieldErrors.has("city") ? "text-red-600" : "text-blue-950"}`}>Град *</span>
              <div className={fieldErrors.has("city") ? "rounded-2xl ring-2 ring-red-400" : ""}>
                <SearchableSelect
                  value={city}
                  onChange={(v) => { setCity(v); setFieldErrors((prev) => { const n = new Set(prev); n.delete("city"); return n; }); }}
                  options={BG_CITIES}
                  placeholder="Например: София"
                  size="md"
                />
              </div>
            </div>

            {/* Category-specific details panel */}
            {CATEGORY_DETAILS[category] && (
              <div ref={categoryDetailsRef}>
                <CategoryDetailFields
                  category={category}
                  details={details}
                  onChange={handleDetailChange}
                  errorKeys={fieldErrors}
                  onFieldChange={(key) => setFieldErrors((prev) => { const n = new Set(prev); n.delete(key); return n; })}
                />
              </div>
            )}

            {/* Description */}
            <label ref={descriptionRef} className="block space-y-2.5">
              <span className={`block text-sm font-black ${fieldErrors.has("description") ? "text-red-600" : "text-blue-950"}`}>Описание *</span>
              <textarea
                value={description}
                onChange={(e) => { setDescription(e.target.value); setFieldErrors((prev) => { const n = new Set(prev); n.delete("description"); return n; }); }}
                rows={6}
                placeholder="Опишете детайлно състоянието, характеристиките и допълнителните условия."
                className={`w-full rounded-2xl border px-5 py-4 font-bold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-4 ${fieldErrors.has("description") ? "border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-100" : "border-slate-200 bg-slate-50 focus:border-blue-950 focus:ring-blue-100"}`}
              />
            </label>

            {/* Images */}
            <div className="rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-6 text-center">
              <p className="text-base font-black text-blue-950">Снимки на обявата</p>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                JPG, JPEG, PNG, WEBP · максимум 5MB на файл · до {imageLimit} снимки
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
                <>
                  <p className={`mt-4 text-sm font-black ${selectedImages.length >= imageLimit ? "text-red-600" : "text-slate-500"}`}>
                    {selectedImages.length} / {imageLimit} снимки
                  </p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-3">
                    {imagePreviewUrls.map((url, index) => (
                      <div key={url} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <img src={url} alt={`Preview ${index + 1}`} className="h-32 w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition hover:bg-black/70 group-hover:opacity-100"
                          aria-label="Изтрий снимка"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
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
