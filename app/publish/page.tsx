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
    <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 lg:rounded-[28px] lg:p-6">
      <div className="mb-4 flex items-center gap-2 lg:mb-5">
        <SlidersHorizontal className="h-4 w-4 text-blue-950 lg:h-5 lg:w-5" />
        <span className="text-sm font-black text-blue-950 lg:text-base">Детайли за {category}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:gap-5">
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

  // ── Progress (computed — no extra state needed) ───────────────────────────
  const requiredDetailFields = CATEGORY_DETAILS[category]?.filter((f) => f.required) ?? [];
  const progressFilled = [
    title.trim().length >= 3,
    city.trim().length >= 2,
    description.trim().length >= 10,
    ...requiredDetailFields.map((f) => !!details[f.key]?.trim()),
  ].filter(Boolean).length;
  const progressTotal = 3 + requiredDetailFields.length;
  const progressPct = Math.round((progressFilled / progressTotal) * 100);

  return (
    <main className="min-h-screen bg-white text-slate-900 lg:bg-slate-50">
      <Header />
      {isEmailVerified === false && <UnverifiedBanner />}

      {/* Desktop hero — hidden on mobile */}
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-slate-950 py-20 text-white lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_32%)]" />
        <div className="relative mx-auto max-w-6xl px-6 text-center">
          <p className="mb-3 text-sm uppercase tracking-[0.35em] text-blue-200">DaiVzemi</p>
          <h1 className="text-5xl font-black md:text-6xl">Публикувай обява</h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg text-blue-100">
            Създай своята обява безплатно за няколко минути.
          </p>
        </div>
      </section>

      {/* Mobile compact header + progress bar */}
      <div className="border-b border-slate-100 px-4 pb-4 pt-5 lg:hidden">
        <h1 className="text-2xl font-black text-slate-900">Нова обява</h1>
        <p className="mt-0.5 text-sm text-slate-500">Безплатно · под 2 минути</p>
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Напредък</span>
            <span className={`text-xs font-black transition-colors ${progressPct === 100 ? "text-green-600" : "text-blue-950"}`}>
              {progressPct}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${progressPct === 100 ? "bg-green-500" : "bg-blue-950"}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-4 py-5 lg:px-6 lg:py-16" onClick={(e) => e.stopPropagation()}>
        {publishedListing && (
          <div className="mx-auto max-w-2xl">
            <ListingAssistant
              listingId={publishedListing.id}
              title={publishedListing.title}
              description={publishedListing.description}
              category={publishedListing.category}
              details={publishedListing.details}
            />
          </div>
        )}

        <div className={publishedListing ? "hidden" : "lg:rounded-[36px] lg:bg-white lg:p-8 lg:shadow-2xl lg:ring-1 lg:ring-slate-200 xl:p-12"}>

          {/* Desktop form header */}
          <div className="mb-10 hidden items-start gap-4 lg:flex">
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

          <form id="publish-form" className="space-y-6 pb-28 lg:space-y-7 lg:pb-0" onSubmit={handleSubmit}>

            {/* Notice banner */}
            {notice && (
              <div className={`rounded-2xl border p-4 lg:rounded-[28px] lg:p-5 ${
                notice.type === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-green-200 bg-green-50 text-green-800"
              }`}>
                <div className="flex gap-3">
                  {notice.type === "error"
                    ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                    : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />}
                  <div>
                    <p className="text-sm font-black lg:text-base">{notice.title}</p>
                    <p className="mt-0.5 text-xs font-semibold opacity-90 lg:mt-1 lg:text-sm">{notice.message}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Тип и категория ── */}
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 lg:hidden">Тип и категория</p>

              {/* Listing type */}
              <div className="grid gap-5 lg:grid-cols-2">
                {/* Title — left col on desktop */}
                <label ref={titleRef} className="block space-y-2">
                  <span className={`text-sm font-black ${fieldErrors.has("title") ? "text-red-600" : "text-blue-950"}`}>
                    Заглавие *
                  </span>
                  <input
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); setFieldErrors((prev) => { const n = new Set(prev); n.delete("title"); return n; }); }}
                    type="text"
                    inputMode="text"
                    placeholder="Например: Модерен апартамент в центъра"
                    className={`w-full rounded-2xl border px-4 py-3.5 text-base font-bold text-slate-900 shadow-sm outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:ring-4 lg:px-5 lg:py-4 ${
                      fieldErrors.has("title")
                        ? "border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-100"
                        : "border-slate-200 bg-slate-50 focus:border-blue-950 focus:ring-blue-100"
                    }`}
                  />
                  {fieldErrors.has("title") && (
                    <p className="text-xs font-semibold text-red-500">Минимум 3 символа.</p>
                  )}
                </label>

                {/* Listing type — right col on desktop */}
                <div className="space-y-2">
                  <span className="block text-sm font-black text-blue-950">Тип обява *</span>
                  {/* Mobile: segmented control */}
                  <div className="grid gap-1 rounded-2xl bg-slate-100 p-1 lg:hidden" style={{ gridTemplateColumns: `repeat(${listingTypeOptions.length}, 1fr)` }}>
                    {listingTypeOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setListingType(opt)}
                        className={`rounded-xl py-3 text-[11px] font-black transition ${
                          listingType === opt ? "bg-white text-blue-950 shadow-sm" : "text-slate-500 active:bg-white/60"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  {/* Desktop: dropdown */}
                  <div className="relative hidden lg:block">
                    <button
                      type="button"
                      onClick={() => setIsListingTypeOpen((prev) => !prev)}
                      className="flex w-full cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-left shadow-sm transition hover:bg-white focus:border-blue-950 focus:outline-none focus:ring-4 focus:ring-blue-100"
                    >
                      <span className="text-base font-bold text-slate-900">{listingType}</span>
                      <ChevronDown className={`h-5 w-5 text-blue-950 transition ${isListingTypeOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isListingTypeOpen && (
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
                    )}
                  </div>
                </div>
              </div>

              {/* Category */}
              <div className="grid gap-5 lg:hidden">
                <div className="space-y-2">
                  <span className="block text-sm font-black text-blue-950">Категория *</span>
                  {/* Mobile: horizontal scrollable chips */}
                  <div
                    className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
                    style={{ scrollbarWidth: "none" }}
                  >
                    {categoryOptions.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleCategoryChange(cat)}
                        className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                          category === cat
                            ? "bg-blue-950 text-white shadow-sm"
                            : "bg-slate-100 text-slate-700 active:bg-slate-200"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Desktop: Category + Price row (grid) ── */}
            <div className="hidden gap-5 lg:grid lg:grid-cols-2">
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
                  {isCategoryOpen && (
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
                  )}
                </div>
              </div>

              <div className="space-y-2.5">
                <span className="block text-sm font-black text-blue-950">Цена</span>
                <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 shadow-sm transition focus-within:border-blue-950 focus-within:ring-4 focus-within:ring-blue-100">
                  <input
                    value={price}
                    onChange={(e) => { const v = e.target.value; if (/^\d*\.?\d*$/.test(v)) setPrice(v); }}
                    type="text"
                    inputMode="decimal"
                    placeholder="500"
                    disabled={negotiable}
                    className="w-full rounded-2xl bg-transparent px-5 py-4 font-bold text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-40"
                  />
                  <span className="mr-3 inline-flex items-center rounded-xl bg-white px-3 py-1.5 text-sm font-black text-blue-950">€</span>
                </div>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input type="checkbox" checked={negotiable} onChange={(e) => { setNegotiable(e.target.checked); if (e.target.checked) setPrice(""); }} className="h-4 w-4 rounded accent-blue-950" />
                  <span className="text-sm font-semibold text-slate-700">Цената е договаряема</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} className="h-4 w-4 rounded accent-red-600" />
                  <span className="text-sm font-semibold text-slate-700">Спешна продажба</span>
                </label>
              </div>
            </div>

            {/* ── Местоположение ── */}
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 lg:hidden">Местоположение</p>
              <div ref={cityRef} className="space-y-2">
                <span className={`block text-sm font-black ${fieldErrors.has("city") ? "text-red-600" : "text-blue-950"}`}>
                  Град *
                </span>
                <div className={fieldErrors.has("city") ? "rounded-2xl ring-2 ring-red-400" : ""}>
                  <SearchableSelect
                    value={city}
                    onChange={(v) => { setCity(v); setFieldErrors((prev) => { const n = new Set(prev); n.delete("city"); return n; }); }}
                    options={BG_CITIES}
                    placeholder="Избери град..."
                    size="md"
                  />
                </div>
                {fieldErrors.has("city") && (
                  <p className="text-xs font-semibold text-red-500">Моля изберете град.</p>
                )}
              </div>
            </div>

            {/* ── Цена (mobile only) ── */}
            <div className="space-y-3 lg:hidden">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Цена</p>
              <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 shadow-sm transition focus-within:border-blue-950 focus-within:ring-4 focus-within:ring-blue-100">
                <input
                  value={price}
                  onChange={(e) => { const v = e.target.value; if (/^\d*\.?\d*$/.test(v)) setPrice(v); }}
                  type="text"
                  inputMode="decimal"
                  placeholder="500"
                  disabled={negotiable}
                  className="w-full rounded-2xl bg-transparent px-4 py-3.5 text-base font-bold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 disabled:opacity-40"
                />
                <span className="mr-3 inline-flex items-center rounded-xl bg-white px-3 py-1.5 text-sm font-black text-blue-950 shadow-sm">€</span>
              </div>
              {/* Mobile toggle pills */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setNegotiable(!negotiable); if (!negotiable) setPrice(""); }}
                  className={`flex-1 rounded-2xl border py-3 text-xs font-black transition ${
                    negotiable
                      ? "border-blue-950 bg-blue-950 text-white"
                      : "border-slate-200 bg-white text-slate-600 active:bg-slate-50"
                  }`}
                >
                  По договаряне
                </button>
                <button
                  type="button"
                  onClick={() => setUrgent(!urgent)}
                  className={`flex-1 rounded-2xl border py-3 text-xs font-black transition ${
                    urgent
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-slate-200 bg-white text-slate-600 active:bg-slate-50"
                  }`}
                >
                  🔥 Спешна
                </button>
              </div>
            </div>

            {/* ── Детайли ── */}
            {CATEGORY_DETAILS[category] && (
              <div ref={categoryDetailsRef} className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 lg:hidden">Детайли</p>
                <CategoryDetailFields
                  category={category}
                  details={details}
                  onChange={handleDetailChange}
                  errorKeys={fieldErrors}
                  onFieldChange={(key) => setFieldErrors((prev) => { const n = new Set(prev); n.delete(key); return n; })}
                />
              </div>
            )}

            {/* ── Описание ── */}
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 lg:hidden">Описание</p>
              <label ref={descriptionRef} className="block space-y-2">
                <span className={`text-sm font-black ${fieldErrors.has("description") ? "text-red-600" : "text-blue-950"}`}>
                  Описание *
                </span>
                <textarea
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); setFieldErrors((prev) => { const n = new Set(prev); n.delete("description"); return n; }); }}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = `${el.scrollHeight}px`;
                  }}
                  rows={4}
                  placeholder="Опишете детайлно: за какво служи, в какво състояние е, защо продавате..."
                  className={`w-full resize-none rounded-2xl border px-4 py-3.5 text-base font-bold text-slate-900 shadow-sm outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:ring-4 lg:px-5 lg:py-4 lg:text-sm ${
                    fieldErrors.has("description")
                      ? "border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-100"
                      : "border-slate-200 bg-slate-50 focus:border-blue-950 focus:ring-blue-100"
                  }`}
                />
                {fieldErrors.has("description") && (
                  <p className="text-xs font-semibold text-red-500">Минимум 10 символа.</p>
                )}
              </label>
            </div>

            {/* ── Снимки ── */}
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 lg:hidden">Снимки</p>
              <div className={`rounded-2xl border-2 border-dashed p-4 lg:rounded-[28px] lg:p-6 ${
                fieldErrors.has("images") ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50 lg:border-blue-200 lg:bg-blue-50/40"
              }`}>
                {imagePreviewUrls.length === 0 ? (
                  /* Empty state — whole area is tappable */
                  <label className="block cursor-pointer">
                    <div className="flex flex-col items-center justify-center gap-3 py-5 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-950/10 text-blue-950">
                        <ImagePlus className="h-7 w-7" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-blue-950">Добави снимки</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">JPG, PNG, WEBP · до 5MB · до {imageLimit} бр.</p>
                      </div>
                      <span className="rounded-2xl bg-blue-950 px-6 py-2.5 text-sm font-black text-white shadow-sm transition active:bg-blue-900 hover:bg-blue-900">
                        Избери снимки
                      </span>
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </label>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className={`text-xs font-black ${selectedImages.length >= imageLimit ? "text-red-600" : "text-slate-500"}`}>
                        {selectedImages.length} / {imageLimit} снимки
                      </p>
                      {selectedImages.length < imageLimit && (
                        <label className="cursor-pointer rounded-xl bg-blue-950 px-3 py-1.5 text-xs font-black text-white transition active:bg-blue-900 hover:bg-blue-900">
                          + Добави
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            className="hidden"
                            onChange={handleImageChange}
                          />
                        </label>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 lg:gap-3">
                      {imagePreviewUrls.map((url, index) => (
                        <div key={url} className="relative overflow-hidden rounded-xl bg-white shadow-sm">
                          <img src={url} alt={`Снимка ${index + 1}`} className="aspect-square w-full object-cover" />
                          {/* Delete button — always visible on mobile (no hover dependency) */}
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition active:bg-black/80 lg:opacity-0 lg:group-hover:opacity-100"
                            aria-label="Изтрий снимка"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          {index === 0 && (
                            <span className="absolute bottom-1.5 left-1.5 rounded-full bg-blue-950/75 px-1.5 py-0.5 text-[9px] font-black text-white">
                              Главна
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {uploadingImages && (
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                      <span>Качване...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-blue-950 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Desktop submit */}
            <button
              type="submit"
              disabled={loading || uploadingImages}
              className="hidden w-full rounded-2xl bg-blue-950 px-6 py-4 text-base font-black text-white shadow-lg transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60 lg:block"
            >
              {loading ? "Публикуване..." : "Публикувай"}
            </button>
          </form>
        </div>
      </section>

      {/* Mobile sticky submit — uses form= to submit the form from outside */}
      {!publishedListing && (
        <div
          className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-100 bg-white/96 px-4 pt-3 backdrop-blur-md lg:hidden"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
        >
          <button
            form="publish-form"
            type="submit"
            disabled={loading || uploadingImages}
            className="w-full rounded-2xl bg-blue-950 py-4 text-base font-black text-white shadow-lg transition active:bg-blue-900 disabled:opacity-60"
          >
            {loading
              ? "Публикуване..."
              : uploadingImages
              ? `Качване ${uploadProgress}%`
              : "Публикувай обявата →"}
          </button>
        </div>
      )}
    </main>
  );
}
