/**
 * Storage upload options interface
 */
export interface StorageUploadOptions {
  body: Buffer | Uint8Array;
  key: string;
  contentType?: string;
  bucket?: string;
  onProgress?: (progress: number) => void;
  disposition?: 'inline' | 'attachment';
}

/**
 * Storage download and upload options interface
 */
export interface StorageDownloadUploadOptions {
  url: string;
  key: string;
  bucket?: string;
  contentType?: string;
  disposition?: 'inline' | 'attachment';
}

/**
 * Storage upload result interface
 */
export interface StorageUploadResult {
  success: boolean;
  location?: string;
  bucket?: string;
  uploadPath?: string;
  key?: string;
  filename?: string;
  url?: string;
  error?: string;
  provider: string;
}

/**
 * Storage configs interface
 */
export interface StorageConfigs {
  [key: string]: any;
}

/**
 * Storage provider interface
 */
export interface StorageProvider {
  // provider name
  readonly name: string;

  // provider configs
  configs: StorageConfigs;

  // check if object exists (optional)
  exists?: (options: { key: string; bucket?: string }) => Promise<boolean>;

  getObjectInfo?: (options: {
    key: string;
  }) => Promise<{ size: number; type: string } | null>;
  getObjectHeader?: (key: string) => Promise<Uint8Array>;

  // get public url for key (optional)
  getPublicUrl?: (options: { key: string; bucket?: string }) => string;

  // get a short-lived signed URL for a private object (optional)
  getPresignedGetUrl?: (options: {
    key: string;
    bucket?: string;
    expiresIn?: number;
  }) => Promise<string>;

  getPresignedPutUrl?: (options: {
    key: string;
    type: string;
    size: number;
    expiresIn: number;
  }) => Promise<string>;

  // delete an object (optional)
  deleteFile?: (options: { key: string; bucket?: string }) => Promise<boolean>;

  // upload file
  uploadFile(options: StorageUploadOptions): Promise<StorageUploadResult>;

  // download and upload
  downloadAndUpload(
    options: StorageDownloadUploadOptions
  ): Promise<StorageUploadResult>;
}

/**
 * Storage manager to manage all storage providers
 */
export class StorageManager {
  // storage providers
  private providers: StorageProvider[] = [];
  private defaultProvider?: StorageProvider;

  private ensureDefaultProvider() {
    // set default provider if not set
    if (!this.defaultProvider && this.providers.length > 0) {
      this.defaultProvider = this.providers[0];
    }

    if (!this.defaultProvider) {
      throw new Error('No storage provider configured');
    }

    return this.defaultProvider;
  }

  // add storage provider
  addProvider(provider: StorageProvider, isDefault = false) {
    this.providers.push(provider);
    if (isDefault) {
      this.defaultProvider = provider;
    }
  }

  // get provider by name
  getProvider(name: string): StorageProvider | undefined {
    return this.providers.find((p) => p.name === name);
  }

  // upload file using default provider
  async uploadFile(
    options: StorageUploadOptions
  ): Promise<StorageUploadResult> {
    return this.ensureDefaultProvider().uploadFile(options);
  }

  // upload file using specific provider
  async uploadFileWithProvider(
    options: StorageUploadOptions,
    providerName: string
  ): Promise<StorageUploadResult> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      throw new Error(`Storage provider '${providerName}' not found`);
    }
    return provider.uploadFile(options);
  }

  // download and upload using default provider
  async downloadAndUpload(
    options: StorageDownloadUploadOptions
  ): Promise<StorageUploadResult> {
    return this.ensureDefaultProvider().downloadAndUpload(options);
  }

  // check if object exists using default provider (if supported)
  async exists(options: { key: string; bucket?: string }): Promise<boolean> {
    const provider = this.ensureDefaultProvider();
    if (!provider.exists) return false;
    return provider.exists(options);
  }

  async getObjectInfo(
    key: string
  ): Promise<{ size: number; type: string } | null> {
    return this.ensureDefaultProvider().getObjectInfo?.({ key }) ?? null;
  }

  async getObjectHeader(key: string): Promise<Uint8Array> {
    const getHeader = this.ensureDefaultProvider().getObjectHeader;
    if (!getHeader) throw new Error('R2 不支持读取文件头');
    return getHeader(key);
  }

  // get public url using default provider (if supported)
  getPublicUrl(options: { key: string; bucket?: string }): string | undefined {
    const provider = this.ensureDefaultProvider();
    if (!provider.getPublicUrl) return undefined;
    return provider.getPublicUrl(options);
  }

  // get a short-lived signed URL using default provider (if supported)
  async getPresignedGetUrl(options: {
    key: string;
    bucket?: string;
    expiresIn?: number;
  }): Promise<string | undefined> {
    const provider = this.ensureDefaultProvider();
    if (!provider.getPresignedGetUrl) return undefined;
    return provider.getPresignedGetUrl(options);
  }

  async getPresignedPutUrl(
    key: string,
    type: string,
    size: number
  ): Promise<string | undefined> {
    return this.ensureDefaultProvider().getPresignedPutUrl?.({
      key,
      type,
      size,
      expiresIn: 300,
    });
  }

  // delete an object using default provider (if supported)
  async deleteFile(options: {
    key: string;
    bucket?: string;
  }): Promise<boolean> {
    const provider = this.ensureDefaultProvider();
    if (!provider.deleteFile) return false;
    return provider.deleteFile(options);
  }

  // download and upload using specific provider
  async downloadAndUploadWithProvider(
    options: StorageDownloadUploadOptions,
    providerName: string
  ): Promise<StorageUploadResult> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      throw new Error(`Storage provider '${providerName}' not found`);
    }
    return provider.downloadAndUpload(options);
  }

  // get all provider names
  getProviderNames(): string[] {
    return this.providers.map((p) => p.name);
  }
}

// Global storage manager instance
export const storageManager = new StorageManager();

// Export all providers
export * from './s3';
export * from './r2';
