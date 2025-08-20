"use client";

import React, { useState, useEffect } from "react";
import { Course, Category, Tag } from "../../types";
import {
  CreateCourseDto,
  UpdateCourseDto,
  courseService,
} from "../../services/api-course";
import { uploadService } from "../../services/api-upload";

interface CourseFormProps {
  course?: Course;
  onSubmit: (data: CreateCourseDto | UpdateCourseDto) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
}

export const CourseForm: React.FC<CourseFormProps> = ({
  course,
  onSubmit,
  onCancel,
  isEditing = false,
}) => {
  const [formData, setFormData] = useState<CreateCourseDto | UpdateCourseDto>({
    title: course?.title || "",
    description: course?.description || "",
    thumbnail_url: course?.thumbnail_url || "",
    price: course?.price || 0,
    original_price: course?.original_price || 0,
    duration_hours: course?.duration_hours || 0,
    level: course?.level || "BEGINNER",
    category_id: course?.category_id || 0,
    tag_ids: course?.tags?.map((t) => t.id) || [],
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>(course?.tags || []);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [thumbBusy, setThumbBusy] = useState(false);

  useEffect(() => {
    const loadCategoriesAndTags = async () => {
      try {
        const [categoriesRes, tagsRes] = await Promise.all([
          courseService.getCategories(),
          courseService.getTags(),
        ]);
        const cats = (categoriesRes as any)?.data ?? categoriesRes ?? [];
        const tgs = (tagsRes as any)?.data ?? tagsRes ?? [];
        setCategories(cats as any);
        setTags(tgs as any);
      } catch (error) {
        console.error("Error loading categories and tags:", error);
      }
    };
    loadCategoriesAndTags();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleTagToggle = (tag: Tag) => {
    const isSelected = selectedTags.some((t) => t.id === tag.id);
    let newSelectedTags: Tag[];

    if (isSelected) {
      newSelectedTags = selectedTags.filter((t) => t.id !== tag.id);
    } else {
      newSelectedTags = [...selectedTags, tag];
    }

    setSelectedTags(newSelectedTags);
    setFormData((prev) => ({
      ...prev,
      tag_ids: newSelectedTags.map((t) => t.id),
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = "Title is required";
    }

    if (!formData.description?.trim()) {
      newErrors.description = "Description is required";
    }

    if (!formData.category_id || formData.category_id === 0) {
      newErrors.category_id = "Category is required";
    }

    if (formData.price && formData.price < 0) {
      newErrors.price = "Price cannot be negative";
    }

    if (formData.duration_hours && formData.duration_hours < 0) {
      newErrors.duration_hours = "Duration cannot be negative";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {isEditing ? "Edit Course" : "Create New Course"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Course Title *
          </label>
          <input
            type="text"
            name="title"
            value={formData.title || ""}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.title ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Enter course title"
          />
          {errors.title && (
            <p className="text-red-500 text-sm mt-1">{errors.title}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            name="description"
            value={formData.description || ""}
            onChange={handleInputChange}
            rows={4}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.description ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Enter course description"
          />
          {errors.description && (
            <p className="text-red-500 text-sm mt-1">{errors.description}</p>
          )}
        </div>

        {/* Thumbnail URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Thumbnail URL
          </label>
          <input
            type="url"
            name="thumbnail_url"
            value={formData.thumbnail_url || ""}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://example.com/image.jpg"
          />
          <div className="mt-2">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    setThumbBusy(true);
                    const r = await uploadService.uploadCourseThumbnail(
                      f,
                      course?.id
                    );
                    setFormData((prev) => ({ ...prev, thumbnail_url: r.url }));
                  } catch (err) {
                    console.error("Thumbnail upload failed", err);
                    alert("Thumbnail upload failed");
                  } finally {
                    setThumbBusy(false);
                    (e.target as HTMLInputElement).value = "";
                  }
                }}
              />
              <span className="px-3 py-1 border rounded">
                {thumbBusy ? "Uploading..." : "Upload Thumbnail"}
              </span>
            </label>
          </div>
        </div>

        {/* Price and Original Price */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price ($)
            </label>
            <input
              type="number"
              name="price"
              value={formData.price || 0}
              onChange={handleInputChange}
              min="0"
              step="0.01"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.price ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.price && (
              <p className="text-red-500 text-sm mt-1">{errors.price}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Original Price ($)
            </label>
            <input
              type="number"
              name="original_price"
              value={formData.original_price || 0}
              onChange={handleInputChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Duration and Level */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration (hours)
            </label>
            <input
              type="number"
              name="duration_hours"
              value={formData.duration_hours || 0}
              onChange={handleInputChange}
              min="0"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.duration_hours ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.duration_hours && (
              <p className="text-red-500 text-sm mt-1">
                {errors.duration_hours}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Level
            </label>
            <select
              name="level"
              value={formData.level || "BEGINNER"}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <select
            name="category_id"
            value={formData.category_id || 0}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.category_id ? "border-red-500" : "border-gray-300"
            }`}
          >
            <option value={0}>Select a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.category_id && (
            <p className="text-red-500 text-sm mt-1">{errors.category_id}</p>
          )}
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const isSelected = selectedTags.some((t) => t.id === tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    isSelected
                      ? "bg-blue-500 text-white border-blue-500"
                      : "bg-white text-gray-700 border-gray-300 hover:border-blue-500"
                  }`}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
          {selectedTags.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-gray-600">Selected tags:</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {selectedTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading
              ? "Saving..."
              : isEditing
              ? "Update Course"
              : "Create Course"}
          </button>
        </div>
      </form>
    </div>
  );
};
