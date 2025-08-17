import React, { useRef, useState } from "react";
import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { ChatImageAttachment } from "@shared/types";

interface ImageUploadProps {
  images: ChatImageAttachment[];
  onImagesChange: (images: ChatImageAttachment[]) => void;
  maxImages?: number;
  maxFileSize?: number; // in MB
  className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  images,
  onImagesChange,
  maxImages = 5,
  maxFileSize = 10,
  className = "",
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newImages: ChatImageAttachment[] = [];
    const maxSizeBytes = maxFileSize * 1024 * 1024;

    Array.from(files).forEach((file) => {
      // Check file type
      if (!file.type.startsWith("image/")) {
        alert(`${file.name} is not an image file`);
        return;
      }

      // Check file size
      if (file.size > maxSizeBytes) {
        alert(`${file.name} is too large. Maximum size is ${maxFileSize}MB`);
        return;
      }

      // Check total count
      if (images.length + newImages.length >= maxImages) {
        alert(`Maximum ${maxImages} images allowed`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Data = (e.target?.result as string)?.split(",")[1];
        if (base64Data) {
          const imageAttachment: ChatImageAttachment = {
            id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            type: file.type,
            data: base64Data,
            size: file.size,
          };

          // Get image dimensions
          const img = new Image();
          img.onload = () => {
            imageAttachment.width = img.width;
            imageAttachment.height = img.height;

            newImages.push(imageAttachment);
            if (newImages.length === Array.from(files).length) {
              onImagesChange([...images, ...newImages]);
            }
          };
          img.src = `data:${file.type};base64,${base64Data}`;
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const removeImage = (imageId: string) => {
    onImagesChange(images.filter((img) => img.id !== imageId));
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={className}>
      {/* Image Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer ${
          isDragOver
            ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        <div className="text-center">
          <PhotoIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {images.length === 0 ? (
              <>
                Drop images here or{" "}
                <span className="text-blue-500">click to upload</span>
              </>
            ) : (
              <>
                Add more images ({images.length}/{maxImages})
              </>
            )}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            PNG, JPG, GIF up to {maxFileSize}MB
          </p>
        </div>
      </div>

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative group rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800"
            >
              <img
                src={`data:${image.type};base64,${image.data}`}
                alt={image.name}
                className="w-full h-20 object-cover"
              />

              {/* Remove button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(image.id);
                }}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                title="Remove image"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>

              {/* Image info */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1">
                <div className="truncate">{image.name}</div>
                <div>{Math.round(image.size / 1024)}KB</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
