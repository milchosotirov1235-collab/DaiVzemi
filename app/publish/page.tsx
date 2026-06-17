"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

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

export default function PublishPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("Имоти");
  const [listingType, setListingType] = useState("Продавам");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isListingTypeOpen, setIsListingTypeOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);

    if (files.length === 0) {
      setSelectedImages([]);
      setImagePreviewUrls([]);
      setUploadProgress(0);
      return;
    }

    if (files.length > 10) {
      setError("Можете да изберете максимум 10 снимки.");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxSize = 5 * 1024 * 1024;

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        setError("Разрешени са само JPG, JPEG, PNG и WEBP файлове.");
        return;
      }

      if (file.size > maxSize) {
        setError("Размерът на всяка снимка не трябва да надвишава 5MB.");
        return;
      }
    }

    setError("");
    setSelectedImages(files);
    setImagePreviewUrls(files.map((file) => URL.createObjectURL(file)));
    setUploadProgress(0);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user ?? null;
    if (!user) {
      setError("Трябва да влезете в профила си, за да публикувате обява.");
      return;
    }

    if (selectedImages.length > 10) {
      setError("Можете да изберете максимум 10 снимки.");
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
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          setUploadingImages(false);
          setLoading(false);
          setError(uploadError.message);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from("listing-images")
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          uploadedUrls.push(publicUrlData.publicUrl);
        }

        setUploadProgress(
          Math.round(((index + 1) / selectedImages.length) * 100)
        );
      }

      setUploadingImages(false);
    }

    const { error: insertError } = await supabase.from("listings").insert([
      {
        title,
        description,
        price,
        city,
        category,
        listing_type: listingType,
        user_id: user.id,
        image_url: uploadedUrls[0] ?? null,
        image_urls: uploadedUrls,
      },
    ]);

    setLoading(false);
    setUploadingImages(false);
    setUploadProgress(0);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setSuccess("Обявата е публикувана успешно.");
    setTitle("");
    setDescription("");
    setPrice("");
    setCity("");
    setCategory("Имоти");
    setListingType("Продавам");
    setSelectedImages([]);
    setImagePreviewUrls((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Header />

      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 py-20 text-white">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <p className="mb-3 text-sm uppercase tracking-[0.3em] text-blue-200">DaiVzemi</p>
          <h1 className="text-5xl font-black md:text-6xl">Публикувай обява</h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg text-blue-100">
            Създай своята обява безплатно за няколко минути.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-[32px] bg-white p-8 shadow-2xl ring-1 ring-slate-200 md:p-12">
          <div className="mb-10">
            <h2 className="text-3xl font-black text-blue-950">Форма за публикуване</h2>
            <p className="mt-3 max-w-2xl text-base text-slate-600">
              Попълнете полетата, за да публикувате бързо и лесно обявата си.
            </p>
          </div>

          <form className="space-y-7" onSubmit={handleSubmit}>
            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {success}
              </div>
            ) : null}

            <div className="grid gap-5 lg:grid-cols-2">
              <label className="space-y-2.5">
                <span className="block text-sm font-semibold text-slate-800">Заглавие</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  type="text"
                  placeholder="Например: Модерен апартамент в центъра"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-900 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <div className="space-y-2.5">
                <span className="block text-sm font-semibold text-slate-800">Тип обява</span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsListingTypeOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-left shadow-sm transition hover:bg-slate-50 focus:border-blue-900 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  >
                    <span className="text-base font-medium text-slate-900">{listingType}</span>
                    <ChevronDown className={`h-5 w-5 text-slate-500 transition ${isListingTypeOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isListingTypeOpen ? (
                    <div className="absolute z-20 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
                      {listingTypeOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setListingType(option);
                            setIsListingTypeOpen(false);
                          }}
                          className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 ${option === listingType ? "bg-slate-100 text-slate-900" : ""}`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-2.5">
                <span className="block text-sm font-semibold text-slate-800">Категория</span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCategoryOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-left shadow-sm transition hover:bg-slate-50 focus:border-blue-900 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  >
                    <span className="text-base font-medium text-slate-900">{category}</span>
                    <ChevronDown className={`h-5 w-5 text-slate-500 transition ${isCategoryOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isCategoryOpen ? (
                    <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
                      {categoryOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setCategory(option);
                            setIsCategoryOpen(false);
                          }}
                          className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 ${option === category ? "bg-slate-100 text-slate-900" : ""}`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <label className="space-y-2.5">
                <span className="block text-sm font-semibold text-slate-800">Цена</span>
                <div className="flex items-center rounded-2xl border border-slate-200 bg-white shadow-sm transition focus-within:border-blue-900 focus-within:ring-4 focus-within:ring-blue-100">
                  <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    type="text"
                    placeholder="500"
                    className="w-full rounded-2xl bg-transparent px-4 py-3.5 text-base text-slate-900 outline-none placeholder:text-slate-400"
                  />
                  <span className="mr-3 inline-flex items-center rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">
                    €
                  </span>
                </div>
              </label>
            </div>

            <label className="space-y-2.5 block">
              <span className="block text-sm font-semibold text-slate-800">Град</span>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                type="text"
                placeholder="Например: София"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-900 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label className="space-y-2.5 block">
              <span className="block text-sm font-semibold text-slate-800">Описание</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                placeholder="Опишете детайлно състоянието, характеристики и допълнителни условия."
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-900 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <p className="text-base font-semibold text-slate-700">Снимки на обявата</p>
              <p className="mt-2 text-sm text-slate-500">
                Разрешени формати: JPG, JPEG, PNG, WEBP (макс. 5MB на файл, до 10 снимки)
              </p>

              <label className="mt-5 inline-flex cursor-pointer rounded-2xl border border-blue-950 bg-blue-950 px-6 py-3 text-sm font-black text-white transition hover:bg-blue-900">
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
                    <div key={url} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="h-32 w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : null}

              {uploadingImages ? (
                <div className="mt-4 text-left">
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
              ) : null}
            </div>

            <button
              type="submit"
              disabled={loading || uploadingImages}
              className="w-full rounded-2xl bg-blue-950 px-6 py-4 text-base font-black text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Публикуване..." : "Публикувай"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
