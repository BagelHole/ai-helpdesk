import React, { useState, useEffect } from "react";
import { CategoryKeywords, MessageCategory } from "@shared/types";

interface CategoriesSettingsProps {
  categoryKeywords: CategoryKeywords[];
  onUpdate: (categories: CategoryKeywords[]) => void;
}

export const CategoriesSettings: React.FC<CategoriesSettingsProps> = ({
  categoryKeywords,
  onUpdate,
}) => {
  const [categories, setCategories] = useState<CategoryKeywords[]>(
    categoryKeywords || []
  );
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newKeyword, setNewKeyword] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    keywords: [] as string[],
  });

  useEffect(() => {
    setCategories(categoryKeywords || []);
  }, [categoryKeywords]);

  const handleAddKeyword = (categoryId: string) => {
    if (!newKeyword.trim()) return;

    const updatedCategories = categories.map((cat) => {
      if (cat.category === categoryId) {
        return {
          ...cat,
          keywords: [...cat.keywords, newKeyword.trim()],
        };
      }
      return cat;
    });

    setCategories(updatedCategories);
    onUpdate(updatedCategories);
    setNewKeyword("");
  };

  const handleRemoveKeyword = (categoryId: string, keywordIndex: number) => {
    const updatedCategories = categories.map((cat) => {
      if (cat.category === categoryId) {
        return {
          ...cat,
          keywords: cat.keywords.filter((_, index) => index !== keywordIndex),
        };
      }
      return cat;
    });

    setCategories(updatedCategories);
    onUpdate(updatedCategories);
  };

  const handleEditKeyword = (
    categoryId: string,
    keywordIndex: number,
    newValue: string
  ) => {
    const updatedCategories = categories.map((cat) => {
      if (cat.category === categoryId) {
        const newKeywords = [...cat.keywords];
        newKeywords[keywordIndex] = newValue;
        return {
          ...cat,
          keywords: newKeywords,
        };
      }
      return cat;
    });

    setCategories(updatedCategories);
    onUpdate(updatedCategories);
  };

  const handleAddCategory = () => {
    if (!newCategory.name.trim()) return;

    const categoryId = newCategory.name.toLowerCase().replace(/\s+/g, "_");
    const category: CategoryKeywords = {
      category: categoryId as MessageCategory,
      keywords: newCategory.keywords,
      displayName: newCategory.name.trim(),
      description: newCategory.description.trim(),
    };

    const updatedCategories = [...categories, category];
    setCategories(updatedCategories);
    onUpdate(updatedCategories);
    setNewCategory({ name: "", description: "", keywords: [] });
    setShowAddCategory(false);
  };

  const handleDeleteCategory = (categoryId: string) => {
    const updatedCategories = categories.filter(
      (cat) => cat.category !== categoryId
    );
    setCategories(updatedCategories);
    onUpdate(updatedCategories);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case MessageCategory.PASSWORD_RESET:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case MessageCategory.SOFTWARE_INSTALL:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case MessageCategory.VPN_SUPPORT:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case MessageCategory.HARDWARE_ISSUE:
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case MessageCategory.ACCESS_REQUEST:
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Message Categories & Keywords
          </h3>
          <button
            onClick={() => setShowAddCategory(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            Add Category
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Configure keywords that determine how incoming messages are
          categorized. Messages containing these keywords will be automatically
          assigned to the corresponding category.
        </p>
      </div>

      {showAddCategory && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
            Add New Category
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category Name
              </label>
              <input
                type="text"
                value={newCategory.name}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, name: e.target.value })
                }
                placeholder="e.g., Equipment Request"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <input
                type="text"
                value={newCategory.description}
                onChange={(e) =>
                  setNewCategory({
                    ...newCategory,
                    description: e.target.value,
                  })
                }
                placeholder="Description of what this category covers"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowAddCategory(false);
                  setNewCategory({ name: "", description: "", keywords: [] });
                }}
                className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCategory}
                disabled={!newCategory.name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {categories.map((category) => (
          <div
            key={category.category}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(
                    category.category
                  )}`}
                >
                  {category.displayName}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {category.description}
                </span>
              </div>
              <button
                onClick={() => handleDeleteCategory(category.category)}
                className="px-3 py-1 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                title="Delete category"
              >
                Delete
              </button>
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Keywords
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {category.keywords.map((keyword, index) => (
                  <div
                    key={index}
                    className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-md px-2 py-1"
                  >
                    {editingCategory === `${category.category}-${index}` ? (
                      <input
                        type="text"
                        value={keyword}
                        onChange={(e) =>
                          handleEditKeyword(
                            category.category,
                            index,
                            e.target.value
                          )
                        }
                        onBlur={() => setEditingCategory(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setEditingCategory(null);
                          }
                        }}
                        className="bg-transparent border-none outline-none text-sm"
                        autoFocus
                      />
                    ) : (
                      <span
                        className="text-sm cursor-pointer"
                        onClick={() =>
                          setEditingCategory(`${category.category}-${index}`)
                        }
                      >
                        {keyword}
                      </span>
                    )}
                    <button
                      onClick={() =>
                        handleRemoveKeyword(category.category, index)
                      }
                      className="ml-2 text-gray-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddKeyword(category.category);
                    }
                  }}
                  placeholder="Add new keyword..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                />
                <button
                  onClick={() => handleAddKeyword(category.category)}
                  disabled={!newKeyword.trim()}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1 md:flex md:justify-between">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>How it works:</strong> When a new message arrives, the
              system checks if any of these keywords appear in the message text.
              The first matching category will be assigned to the message.
              Keywords are case-insensitive and matched using "contains" logic.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
