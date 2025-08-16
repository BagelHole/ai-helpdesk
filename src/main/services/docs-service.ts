import fs from "fs/promises";
import path from "path";
import { app } from "electron";
import os from "os";
import pdfParse from "pdf-parse";
import { Logger } from "./logger-service";

export interface Document {
  id: string;
  name: string;
  type: "pdf" | "text" | "note";
  size: number;
  uploadedAt: string;
  content?: string;
  filePath?: string;
}

export class DocsService {
  private logger: Logger;
  private docsDir: string;
  private metadataFile: string;

  constructor() {
    this.logger = new Logger();
    this.docsDir = path.join(app.getPath("userData"), "docs");
    this.metadataFile = path.join(this.docsDir, "metadata.json");
    this.logger.info(`Docs directory: ${this.docsDir}`);
    this.logger.info(`Metadata file: ${this.metadataFile}`);
    // Don't await here since constructor can't be async
    this.ensureDocsDirectory().catch((error) => {
      this.logger.error(
        "Failed to ensure docs directory during construction:",
        error
      );
    });
  }

  private async ensureDocsDirectory(): Promise<void> {
    try {
      await fs.access(this.docsDir);
    } catch {
      await fs.mkdir(this.docsDir, { recursive: true });
      this.logger.info("Created docs directory");
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async loadMetadata(): Promise<Document[]> {
    try {
      const data = await fs.readFile(this.metadataFile, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is corrupted, return empty array
      return [];
    }
  }

  private async saveMetadata(documents: Document[]): Promise<void> {
    await fs.writeFile(this.metadataFile, JSON.stringify(documents, null, 2));
  }

  public async getDocuments(): Promise<Document[]> {
    try {
      const documents = await this.loadMetadata();
      this.logger.info(`Retrieved ${documents.length} documents`);
      return documents;
    } catch (error) {
      this.logger.error("Failed to get documents:", error);
      return [];
    }
  }

  public async createNote(title: string, content: string): Promise<Document> {
    try {
      const id = Date.now().toString();
      const document: Document = {
        id,
        name: title,
        type: "note",
        size: content.length,
        uploadedAt: new Date().toISOString(),
        content,
      };

      const documents = await this.loadMetadata();
      documents.push(document);
      await this.saveMetadata(documents);

      this.logger.info(`Created note: ${title}`);
      return document;
    } catch (error) {
      this.logger.error("Failed to create note:", error);
      throw error;
    }
  }

  public async updateNote(
    id: string,
    title: string,
    content: string
  ): Promise<Document> {
    try {
      const documents = await this.loadMetadata();
      const documentIndex = documents.findIndex((doc) => doc.id === id);

      if (documentIndex === -1) {
        throw new Error("Note not found");
      }

      const document = documents[documentIndex];
      if (document.type !== "note") {
        throw new Error("Can only edit notes");
      }

      // Update the note
      document.name = title;
      document.content = content;
      document.size = content.length;
      // Keep original uploadedAt, could add updatedAt if desired

      documents[documentIndex] = document;
      await this.saveMetadata(documents);

      this.logger.info(`Updated note: ${title}`);
      return document;
    } catch (error) {
      this.logger.error("Failed to update note:", error);
      throw error;
    }
  }

  public async uploadDocument(
    fileBuffer: Buffer,
    fileName: string,
    fileType: string
  ): Promise<Document> {
    try {
      this.logger.info(
        `Starting upload: ${fileName}, type: ${fileType}, size: ${fileBuffer.length}`
      );

      const id = Date.now().toString();

      // Use the real filename, but ensure uniqueness by checking for conflicts
      let storedFileName = fileName;
      let filePath = path.join(this.docsDir, storedFileName);

      // Check if file already exists and create a unique name if needed
      let counter = 1;
      while (await this.fileExists(filePath)) {
        const fileExtension = path.extname(fileName);
        const baseName = path.basename(fileName, fileExtension);
        storedFileName = `${baseName} (${counter})${fileExtension}`;
        filePath = path.join(this.docsDir, storedFileName);
        counter++;
      }

      this.logger.info(`Saving file to: ${filePath}`);

      // Ensure docs directory exists
      await this.ensureDocsDirectory();

      // Save the file
      await fs.writeFile(filePath, fileBuffer);
      this.logger.info(`File saved successfully: ${storedFileName}`);

      // Extract content for text files
      let content: string | undefined;
      if (fileType === "text/plain") {
        content = fileBuffer.toString("utf-8");
        this.logger.info(
          `Extracted text content: ${content.length} characters`
        );
      }

      const document: Document = {
        id,
        name: fileName,
        type: fileType === "application/pdf" ? "pdf" : "text",
        size: fileBuffer.length,
        uploadedAt: new Date().toISOString(),
        content,
        filePath: storedFileName,
      };

      this.logger.info(
        `Created document object:`,
        JSON.stringify(document, null, 2)
      );

      const documents = await this.loadMetadata();
      this.logger.info(`Loaded existing documents: ${documents.length}`);

      documents.push(document);
      await this.saveMetadata(documents);
      this.logger.info(`Saved metadata with ${documents.length} documents`);

      this.logger.info(`Successfully uploaded document: ${fileName}`);
      return document;
    } catch (error) {
      this.logger.error("Failed to upload document:", error);
      throw error;
    }
  }

  public async deleteDocument(id: string): Promise<boolean> {
    try {
      const documents = await this.loadMetadata();
      const documentIndex = documents.findIndex((doc) => doc.id === id);

      if (documentIndex === -1) {
        throw new Error("Document not found");
      }

      const document = documents[documentIndex];

      // Delete the physical file if it exists
      if (document.filePath) {
        const fullPath = path.join(this.docsDir, document.filePath);
        try {
          await fs.unlink(fullPath);
        } catch (error) {
          this.logger.warn(`Failed to delete file ${fullPath}:`, error);
        }
      }

      // Remove from metadata
      documents.splice(documentIndex, 1);
      await this.saveMetadata(documents);

      this.logger.info(`Deleted document: ${document.name}`);
      return true;
    } catch (error) {
      this.logger.error("Failed to delete document:", error);
      throw error;
    }
  }

  public async getDocument(id: string): Promise<Document | null> {
    try {
      const documents = await this.loadMetadata();
      const document = documents.find((doc) => doc.id === id);

      if (!document) {
        return null;
      }

      // If it's a file-based document and content is not loaded, read it
      if (document.filePath && !document.content) {
        const fullPath = path.join(this.docsDir, document.filePath);
        try {
          if (document.type === "text") {
            document.content = await fs.readFile(fullPath, "utf-8");
          } else if (document.type === "pdf") {
            document.content = await this.extractPdfText(fullPath);
          }
        } catch (error) {
          this.logger.error(
            `Failed to read document content for ${document.name}:`,
            error
          );
        }
      }

      return document;
    } catch (error) {
      this.logger.error("Failed to get document:", error);
      return null;
    }
  }

  private async extractPdfText(filePath: string): Promise<string> {
    try {
      this.logger.info(`Extracting text from PDF: ${filePath}`);
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);
      this.logger.info(
        `Successfully extracted ${data.text.length} characters from PDF`
      );
      return data.text;
    } catch (error) {
      this.logger.error(`Failed to extract text from PDF ${filePath}:`, error);
      this.logger.error("PDF parsing error details:", error);
      return "";
    }
  }

  public async viewDocument(
    id: string
  ): Promise<{ success: boolean; content?: string; path?: string }> {
    try {
      const document = await this.getDocument(id);

      if (!document) {
        throw new Error("Document not found");
      }

      if (document.type === "note" || document.type === "text") {
        return {
          success: true,
          content: document.content,
        };
      } else if (document.type === "pdf" && document.filePath) {
        const fullPath = path.join(this.docsDir, document.filePath);

        // Open the PDF file using the system's default PDF viewer
        const { shell } = require("electron");
        await shell.openExternal(`file://${fullPath}`);

        return {
          success: true,
          path: fullPath,
        };
      }

      throw new Error("Unsupported document type");
    } catch (error) {
      this.logger.error("Failed to view document:", error);
      return { success: false };
    }
  }

  public async getAllDocumentContents(): Promise<
    Array<{ name: string; content: string; type: string }>
  > {
    try {
      const documents = await this.loadMetadata();
      const contents: Array<{ name: string; content: string; type: string }> =
        [];

      for (const doc of documents) {
        if (doc.type === "note") {
          contents.push({
            name: doc.name,
            content: doc.content || "",
            type: "note",
          });
        } else if (doc.type === "text" || doc.type === "pdf") {
          const fullDoc = await this.getDocument(doc.id);
          if (fullDoc?.content) {
            contents.push({
              name: doc.name,
              content: fullDoc.content,
              type: doc.type,
            });
          }
        }
      }

      return contents;
    } catch (error) {
      this.logger.error("Failed to get all document contents:", error);
      return [];
    }
  }

  public async getAllDocumentsWithMetadata(): Promise<
    Array<{
      name: string;
      content: string;
      type: string;
      id: string;
      filePath?: string;
      size: number;
    }>
  > {
    try {
      const documents = await this.loadMetadata();
      const documentsWithMetadata: Array<{
        name: string;
        content: string;
        type: string;
        id: string;
        filePath?: string;
        size: number;
      }> = [];

      for (const doc of documents) {
        if (doc.type === "note") {
          documentsWithMetadata.push({
            name: doc.name,
            content: doc.content || "",
            type: "note",
            id: doc.id,
            size: doc.size,
          });
        } else if (doc.type === "text" || doc.type === "pdf") {
          const fullDoc = await this.getDocument(doc.id);
          if (fullDoc?.content) {
            documentsWithMetadata.push({
              name: doc.name,
              content: fullDoc.content,
              type: doc.type,
              id: doc.id,
              filePath: doc.filePath,
              size: doc.size,
            });
          }
        }
      }

      return documentsWithMetadata;
    } catch (error) {
      this.logger.error("Failed to get all documents with metadata:", error);
      return [];
    }
  }

  public async getDocumentFile(
    id: string
  ): Promise<{ content: ArrayBuffer; name: string; type: string } | null> {
    try {
      const document = await this.getDocument(id);
      if (!document) {
        this.logger.error(`Document not found: ${id}`);
        return null;
      }

      // Read the actual file from the filesystem
      const fs = require("fs").promises;
      if (!document.filePath) {
        this.logger.error(`Document ${id} has no file path`);
        return null;
      }
      const fullPath = path.join(this.docsDir, document.filePath);
      const fileBuffer = await fs.readFile(fullPath);

      return {
        content: fileBuffer.buffer.slice(
          fileBuffer.byteOffset,
          fileBuffer.byteOffset + fileBuffer.byteLength
        ),
        name: document.name,
        type: document.type,
      };
    } catch (error) {
      this.logger.error(`Failed to get document file ${id}:`, error);
      return null;
    }
  }

  public async getDocumentPath(id: string): Promise<string | null> {
    try {
      const document = await this.getDocument(id);
      if (!document) {
        this.logger.error(`Document not found: ${id}`);
        return null;
      }

      if (document.filePath) {
        // Return the absolute path to the file
        return path.join(this.docsDir, document.filePath);
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get document path ${id}:`, error);
      return null;
    }
  }

  public async showInFolder(id: string): Promise<{ success: boolean }> {
    try {
      const document = await this.getDocument(id);
      if (!document) {
        this.logger.error(`Document not found: ${id}`);
        return { success: false };
      }

      if (document.filePath) {
        // Get the absolute path to the file
        const fullPath = path.join(this.docsDir, document.filePath);

        // Use shell.showItemInFolder to open the file manager and highlight the file
        const { shell } = require("electron");
        shell.showItemInFolder(fullPath);

        this.logger.info(`Showed ${document.name} in folder: ${fullPath}`);
        return { success: true };
      }

      return { success: false };
    } catch (error) {
      this.logger.error(`Failed to show document ${id} in folder:`, error);
      return { success: false };
    }
  }
}
