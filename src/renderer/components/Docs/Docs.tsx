import React, { useState, useRef } from "react";
import { useQuery } from "react-query";
import {
  DocumentIcon,
  CloudArrowUpIcon,
  TrashIcon,
  EyeIcon,
  PlusIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

interface Document {
  id: string;
  name: string;
  type: "pdf" | "text" | "note";
  size: number;
  uploadedAt: string;
  content?: string;
}

export const Docs: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteData, setNoteData] = useState({
    title: "",
    content: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch documents
  const {
    data: documents = [],
    isLoading,
    refetch,
  } = useQuery<Document[]>(
    "documents",
    async () => {
      try {
        // Document API not yet implemented - returning empty array
        const result = await window.electronAPI.docs?.getDocuments();
        return result || [];
      } catch (error) {
        console.error("Failed to fetch documents:", error);
        return [];
      }
    },
    {
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  const handleFileSelect = (files: FileList) => {
    Array.from(files).forEach((file) => {
      if (file.type === "application/pdf" || file.type === "text/plain") {
        uploadFile(file);
      } else {
        console.warn(`Unsupported file type: ${file.type}`);
      }
    });
  };

  const uploadFile = async (file: File) => {
    try {
      console.log("File upload feature coming soon:", file.name);
      // File upload API will be implemented in future version
      // const result = await window.electronAPI.docs.uploadDocument(file);
      // refetch();
    } catch (error) {
      console.error("Failed to upload file:", error);
    }
  };

  const createNote = async () => {
    if (!noteData.title.trim() || !noteData.content.trim()) return;
    
    try {
      console.log("Text note creation feature coming soon:", noteData.title);
      // Note creation API will be implemented in future version
      // const result = await window.electronAPI.docs.createNote({
      //   title: noteData.title,
      //   content: noteData.content
      // });
      // refetch();
      setNoteData({ title: "", content: "" });
      setShowAddNote(false);
    } catch (error) {
      console.error("Failed to create note:", error);
    }
  };

  const deleteDocument = async (docId: string) => {
    try {
      console.log("Document deletion feature coming soon:", docId);
      // Delete API will be implemented in future version
      // await window.electronAPI.docs.deleteDocument(docId);
      // refetch();
    } catch (error) {
      console.error("Failed to delete document:", error);
    }
  };

  const viewDocument = async (doc: Document) => {
    try {
      console.log("Document viewer feature coming soon:", doc.name);
      // Document viewer will be implemented in future version
      // await window.electronAPI.docs.viewDocument(doc.id);
    } catch (error) {
      console.error("Failed to view document:", error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          IT Documentation
        </h1>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowAddNote(true)}
            className="btn btn-secondary"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Note
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-primary"
          >
            <CloudArrowUpIcon className="w-4 h-4 mr-2" />
            Upload Document
          </button>
        </div>
      </div>

      {/* File Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 mb-6 transition-colors ${
          isDragging
            ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-300 dark:border-gray-600"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="text-center cursor-pointer">
          <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
          <div className="mt-4">
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              Drop files here or click to upload
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Supports PDF and text files up to 10MB
            </p>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.txt"
        onChange={(e) => {
          if (e.target.files) {
            handleFileSelect(e.target.files);
          }
        }}
        className="hidden"
      />

      {/* Add Note Modal */}
      {showAddNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Add Text Note
                </h2>
                <button
                  onClick={() => {
                    setShowAddNote(false);
                    setNoteData({ title: "", content: "" });
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={noteData.title}
                    onChange={(e) => setNoteData({ ...noteData, title: e.target.value })}
                    placeholder="e.g., Grafana Setup Guide, VPN Configuration, etc."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Content
                  </label>
                  <textarea
                    value={noteData.content}
                    onChange={(e) => setNoteData({ ...noteData, content: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setShowAddNote(false);
                        setNoteData({ title: "", content: "" });
                      }
                    }}
                    placeholder="Enter your documentation content here. This will be available to the AI assistant for reference when answering related questions."
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-vertical"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddNote(false);
                    setNoteData({ title: "", content: "" });
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={createNote}
                  disabled={!noteData.title.trim() || !noteData.content.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Create Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Documents List */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Uploaded Documents
          </h2>
          <p className="text-sm text-gray-500">
            {documents.length} document{documents.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="card-body">
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">
                Loading documents...
              </p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8">
              <DocumentIcon className="mx-auto h-16 w-16 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400 mt-4">
                No documents or notes created yet
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Create text notes or upload PDF/text files containing IT documentation,
                procedures, and setup guides
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    {doc.type === "note" ? (
                      <DocumentTextIcon className="w-8 h-8 text-green-600" />
                    ) : (
                      <DocumentIcon className="w-8 h-8 text-blue-600" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {doc.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {doc.type === "note" ? "Text Note" : formatFileSize(doc.size)} •{" "}
                        {formatDate(doc.uploadedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => viewDocument(doc)}
                      className="btn btn-sm btn-secondary"
                      title="View document"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteDocument(doc.id)}
                      className="btn btn-sm btn-danger"
                      title="Delete document"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="mt-6 card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            How to Use IT Documentation
          </h3>
        </div>
        <div className="card-body">
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <p>
              • Create text notes or upload IT procedures, setup guides, and troubleshooting
              documentation
            </p>
            <p>
              • The AI assistant will reference these documents and notes when helping
              with IT requests
            </p>
            <p>• Text notes: Create quick reference guides directly in the app</p>
            <p>• File uploads: PDF and plain text files (max 10MB each)</p>
            <p>• All content is stored locally and processed for AI context</p>
          </div>
        </div>
      </div>
    </div>
  );
};
