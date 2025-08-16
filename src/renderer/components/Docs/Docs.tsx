import React, { useState, useRef } from "react";
import { useQuery } from "react-query";
import {
  DocumentIcon,
  CloudArrowUpIcon,
  TrashIcon,
  EyeIcon,
  PlusIcon,
  DocumentTextIcon,
  PencilIcon,
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
  const [showEditNote, setShowEditNote] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [viewerData, setViewerData] = useState({ title: "", content: "" });
  const [noteData, setNoteData] = useState({
    title: "",
    content: "",
  });
  const [editNoteData, setEditNoteData] = useState({
    id: "",
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
        const result = await window.electronAPI.docs.getDocuments();
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
      console.log(`Starting upload: ${file.name}, type: ${file.type}, size: ${file.size}`);
      
      // Convert File to ArrayBuffer for IPC transfer
      const arrayBuffer = await file.arrayBuffer();
      const fileData = {
        name: file.name,
        type: file.type,
        size: file.size,
        arrayBuffer: arrayBuffer
      };
      
      console.log("Uploading file data:", {
        name: fileData.name,
        type: fileData.type,
        size: fileData.size,
        arrayBufferSize: fileData.arrayBuffer.byteLength
      });
      
      const result = await window.electronAPI.docs.uploadDocument(fileData);
      console.log("File uploaded successfully:", result);
      
      // Force refetch to update the UI
      await refetch();
      console.log("Refetched documents after upload");
    } catch (error) {
      console.error("Failed to upload file:", error);
      console.error("Error details:", error);
    }
  };

  const createNote = async () => {
    if (!noteData.title.trim() || !noteData.content.trim()) return;
    
    try {
      const result = await window.electronAPI.docs.createNote({
        title: noteData.title,
        content: noteData.content
      });
      console.log("Note created successfully:", result);
      refetch();
      setNoteData({ title: "", content: "" });
      setShowAddNote(false);
    } catch (error) {
      console.error("Failed to create note:", error);
    }
  };

  const updateNote = async () => {
    if (!editNoteData.title.trim() || !editNoteData.content.trim()) return;
    
    try {
      const result = await window.electronAPI.docs.updateNote({
        id: editNoteData.id,
        title: editNoteData.title,
        content: editNoteData.content
      });
      console.log("Note updated successfully:", result);
      refetch();
      setEditNoteData({ id: "", title: "", content: "" });
      setShowEditNote(false);
    } catch (error) {
      console.error("Failed to update note:", error);
    }
  };

  const startEditNote = (doc: Document) => {
    if (doc.type === "note") {
      setEditNoteData({
        id: doc.id,
        title: doc.name,
        content: doc.content || ""
      });
      setShowEditNote(true);
    }
  };

  const deleteDocument = async (docId: string) => {
    try {
      await window.electronAPI.docs.deleteDocument(docId);
      console.log("Document deleted successfully");
      refetch();
    } catch (error) {
      console.error("Failed to delete document:", error);
    }
  };

  const viewDocument = async (doc: Document) => {
    try {
      const result = await window.electronAPI.docs.viewDocument(doc.id);
      if (result.success) {
        if (result.content) {
          // For text notes and text files, show content in a modal
          setViewerData({ title: doc.name, content: result.content });
          setShowViewer(true);
        } else if (result.path) {
          // For PDFs, open with system default app
          await window.electronAPI.system.openExternal(`file://${result.path}`);
        }
      }
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

       {/* Edit Note Modal */}
       {showEditNote && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
           <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
             <div className="p-6">
               <div className="flex justify-between items-center mb-4">
                 <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                   Edit Note
                 </h2>
                 <button
                   onClick={() => {
                     setShowEditNote(false);
                     setEditNoteData({ id: "", title: "", content: "" });
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
                     value={editNoteData.title}
                     onChange={(e) => setEditNoteData({ ...editNoteData, title: e.target.value })}
                     placeholder="e.g., Grafana Setup Guide, VPN Configuration, etc."
                     className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                   />
                 </div>
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                     Content
                   </label>
                   <textarea
                     value={editNoteData.content}
                     onChange={(e) => setEditNoteData({ ...editNoteData, content: e.target.value })}
                     onKeyDown={(e) => {
                       if (e.key === "Escape") {
                         setShowEditNote(false);
                         setEditNoteData({ id: "", title: "", content: "" });
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
                     setShowEditNote(false);
                     setEditNoteData({ id: "", title: "", content: "" });
                   }}
                   className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                 >
                   Cancel
                 </button>
                 <button
                   onClick={updateNote}
                   disabled={!editNoteData.title.trim() || !editNoteData.content.trim()}
                   className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                 >
                   Update Note
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}

       {/* Document Viewer Modal */}
       {showViewer && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
           <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
             <div className="p-6">
               <div className="flex justify-between items-center mb-4">
                 <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                   {viewerData.title}
                 </h2>
                 <button
                   onClick={() => setShowViewer(false)}
                   className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                 >
                   ×
                 </button>
               </div>
               
               <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                 <pre className="whitespace-pre-wrap text-sm text-gray-900 dark:text-white font-mono">
                   {viewerData.content}
                 </pre>
               </div>
               
               <div className="flex justify-end mt-6">
                 <button
                   onClick={() => setShowViewer(false)}
                   className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                 >
                   Close
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
                    {doc.type === "note" && (
                      <button
                        onClick={() => startEditNote(doc)}
                        className="btn btn-sm btn-secondary"
                        title="Edit note"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    )}
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
