"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { ChevronDown, Trash2, Upload } from "lucide-react";
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

const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const maxImageSize = 5 * 1024 * 1024;
const maxImages = 10;

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
};

export default function EditListingPage() {
  const params = useParams();
  const id = params?.id as string;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("Имоти");
  const [listingType, setListingType] = useState("Продавам");
  const [currentImages, setCurrentImages] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviewUrls, setNewImagePreviewUrls] = useState<string[]>([]);
  const [isListingTypeOpen, setIsListingTypeOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    return () => {
      newImagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [newImagePreviewUrls]);

  useEffect(() => {
    const loadListing = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        setIsOwner(false);
        return;
      }

      const { data, error } = await supabase
        .from("listings")
        .select(
          "id, title, description, price, city, category, listing_type, user_id, image_url, image_urls"
        )
        .eq("id", id)
        .single<Listing>();

      if (error || !data) {
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
      setLoading(false);
    };

    if (id) {
      loadListing();
    }
  }, [id]);

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

    if (!validateImageFiles(files)) {
      return;
    }

    setError("");
    const previewUrls = files.map((file) => URL.createObjectURL(file));
    setNewImageFiles((prev) => [...prev, ...files]);
    setNewImagePreviewUrls((prev) => [...prev, ...previewUrls]);
  };

  const handleRemoveExistingImage = (imageUrl: string) => {
    setCurrentImages((prev) => prev.filter((image) => image !== imageUrl));
  };

  const handleRemoveNewImage = (index: number) => {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
    setNewImagePreviewUrls((prev) => {
      const urlToRevoke = prev[index];
      if (urlToRevoke) {
        URL.revokeObjectURL(urlToRevoke);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Трябва да влезете в профила си, за да редактирате обява.");
      return;
    }

    const finalImageUrls = [...currentImages];

    if (finalImageUrls.length + newImageFiles.length > maxImages) {
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
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

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

        setUploadProgress(
          Math.round(((index + 1) / newImageFiles.length) * 100)
        );
      }

      setUploadingImages(false);
    }

    const updatedImageUrls = [...finalImageUrls, ...uploadedUrls];
    const firstImageUrl = updatedImageUrls[0] ?? null;

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

                {uploadingImages ? (
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
                ) : null}
              </div>

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
                      className="w-full rounded-2xl bg-transparent px-4 py-3.5 text-base text-slate-900 outline-none"
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
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 shadow-sm outline-none transition focus:border-blue-900 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <label className="space-y-2.5 block">
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
