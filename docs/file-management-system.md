# File Management System Documentation

## Overview

The File Management System is a comprehensive wrapper around Cloudinary that automatically stores file metadata in the Convex database. This ensures consistency between file storage and the application database while providing a clean, type-safe interface for file operations.

## Architecture

### Components

1. **Cloudinary Service** (`/src/services/cloudinary.ts`)

   - Low-level Cloudinary operations
   - Image upload, transformation, and deletion
   - URL generation and optimization

2. **File Management Service** (`/src/services/file-management.ts`)

   - High-level wrapper around Cloudinary service
   - Automatic database record creation
   - User-based file management
   - Batch operations support

3. **File Management Hook** (`/src/hooks/use-file-management.ts`)

   - React hook for frontend components
   - Upload progress tracking
   - Error handling and state management

4. **Upload API Route** (`/src/app/api/upload/route.ts`)

   - Secure file upload endpoint
   - Authentication and validation
   - Integration with file management service

5. **Convex Database Schema**
   - File metadata storage
   - User associations
   - Usage tracking

## Usage Examples

### Basic File Upload

```typescript
import { useFileManagement } from '@/hooks/use-file-management';

function UploadComponent() {
  const { uploadFile, isUploading, error } = useFileManagement();

  const handleUpload = async (file: File) => {
    const result = await uploadFile(file, {
      category: 'product_image'
    });

    if (result) {
      console.log('Upload successful:', result);
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={(e) => handleUpload(e.target.files?.[0])}
        disabled={isUploading}
      />
      {error && <p>Error: {error}</p>}
    </div>
  );
}
```

### File Upload with Generation Association

```typescript
const handleGenerationUpload = async (file: File, generationId: string) => {
  const result = await uploadFile(file, {
    category: "generated_image",
    generationId: generationId as Id<"generations">,
    isPrimary: true,
    imageOrder: 0,
  });
};
```

### Batch File Upload

```typescript
const handleBatchUpload = async (files: File[]) => {
  const fileOptions = files.map((file, index) => ({
    file,
    options: {
      category: "product_image" as const,
      imageOrder: index,
    },
  }));

  const results = await uploadFiles(fileOptions);
  console.log("Uploaded files:", results);
};
```

### File Management with UI

```typescript
import { FileManager } from '@/components/examples/file-manager';

function MyComponent() {
  return (
    <FileManager
      category="product_image"
      maxFiles={5}
      onFileUploaded={(file) => console.log('File uploaded:', file)}
    />
  );
}
```

## File Categories

The system supports four file categories:

- **`product_image`**: Product photos for generation input
- **`model_image`**: Model photos for generation input
- **`generated_image`**: AI-generated results
- **`profile_image`**: User profile pictures

## API Endpoints

### POST /api/upload

Upload a new file to Cloudinary and store metadata in database.

**Parameters:**

- `file`: File to upload (form data)
- `category`: File category (optional, defaults to 'product_image')
- `generationId`: Associated generation ID (optional)
- `isPrimary`: Whether this is the primary image (optional)
- `imageOrder`: Order in sequence (optional)

**Response:**

```json
{
  "success": true,
  "url": "https://res.cloudinary.com/...",
  "publicId": "...",
  "fileId": "...",
  "metadata": {
    "width": 1024,
    "height": 768,
    "format": "jpg",
    "bytes": 123456,
    "category": "product_image",
    "filename": "image.jpg"
  }
}
```

### DELETE /api/upload

Delete a file from both Cloudinary and database.

**Parameters:**

- `fileId`: Database file ID (preferred)
- `publicId`: Cloudinary public ID (alternative)

**Response:**

```json
{
  "success": true
}
```

## Database Schema

### Files Table

```typescript
{
  _id: Id<"files">,
  userId: Id<"users">,
  filename: string,
  contentType: string,
  size: number,
  storageId: string, // Cloudinary public_id
  category: FileCategory,
  uploadedAt: number,
  metadata?: {
    width?: number,
    height?: number,
    format?: string,
    generationId?: Id<"generations">,
    originalUrl?: string,
    isPrimary?: boolean,
    imageOrder?: number
  }
}
```

## Environment Variables

Make sure these are configured in your `.env.local`:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
```

## Error Handling

The system provides comprehensive error handling:

```typescript
try {
  const result = await uploadFile(file, options);
} catch (error) {
  if (error instanceof FileManagementError) {
    console.error("File management error:", error.message);
    console.error("Error code:", error.code);
  }
}
```

## Image Transformations

Generate optimized URLs for different use cases:

```typescript
// Get optimized URL
const optimizedUrl = getFileUrl(file, {
  width: 400,
  height: 300,
  quality: "auto",
  format: "webp",
});

// Get responsive URLs
const responsiveUrls = fileManagementService.generateResponsiveUrls(
  file.storageId,
  [{ width: 400 }, { width: 800 }, { width: 1200 }]
);
```

## Security

- All uploads require user authentication
- Files are associated with user accounts
- Users can only access and delete their own files
- File type and size validation on upload
- Secure Cloudinary URLs with transformations

## Performance Considerations

- Images are automatically optimized by Cloudinary
- Lazy loading supported with `ImageWithLoader` component
- Progressive JPEG and WebP format support
- CDN delivery for fast global access
- Database queries are indexed for performance

## Migration from Direct Cloudinary

If you have existing direct Cloudinary usage, you can migrate by:

1. Replace direct Cloudinary calls with `fileManagementService` methods
2. Update upload endpoints to use the new API route
3. Store existing file metadata in the database using `storeFileMetadata`
4. Update frontend components to use the `useFileManagement` hook

## Testing

Use the `FileManager` component for testing file operations:

```typescript
import { FileManager } from '@/components/examples/file-manager';

function TestPage() {
  return (
    <div className="p-6">
      <h1>File Management Test</h1>
      <FileManager
        category="product_image"
        onFileUploaded={(file) => console.log('Test upload:', file)}
      />
    </div>
  );
}
```

## Future Enhancements

- File compression options
- Bulk file operations
- File sharing and permissions
- Advanced image editing integration
- Video file support
- File versioning system
- Cloud storage alternatives
