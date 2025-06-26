# File Upload Options Documentation

## Overview

The `FileUploadOptions` interface provides comprehensive configuration for file uploads in the Style Studio AI application. This interface extends Cloudinary's upload options while adding application-specific metadata for database storage and organization.

## Interface Definition

```typescript
export interface FileUploadOptions
  extends Omit<CloudinaryUploadOptions, "folder"> {
  category: FileCategory;
  filename?: string;
  generationId?: Id<"generations">;
  isPrimary?: boolean;
  imageOrder?: number;
}
```

## Required Options

### `category: FileCategory`

**Type:** `"product_image" | "model_image" | "generated_image" | "profile_image"`

**Required:** ✅ Yes

**Description:** Defines the purpose and classification of the uploaded file. This affects storage organization, access patterns, and UI display.

**Usage:**

```typescript
await uploadFile(file, { category: "product_image" });
```

**Categories Explained:**

- **`product_image`**: Photos of clothing items, accessories, or products that will be used as input for AI generation

  - Use case: User uploads a shirt photo to see it on different models
  - Storage: `/style-studio-ai/uploads/product_image/`
  - Access: Available in product selection interfaces

- **`model_image`**: Photos of people/models that will be used as the base for trying on products

  - Use case: User uploads their own photo to try on different clothes
  - Storage: `/style-studio-ai/uploads/model_image/`
  - Access: Available in model selection interfaces

- **`generated_image`**: AI-generated results from the image generation process

  - Use case: Output images from Replicate API showing products on models
  - Storage: `/style-studio-ai/uploads/generated_image/`
  - Access: Available in generation history and results

- **`profile_image`**: User avatar/profile pictures
  - Use case: User's profile photo displayed in UI
  - Storage: `/style-studio-ai/uploads/profile_image/`
  - Access: Available in user profile and header components

## Optional Options

### `filename?: string`

**Type:** `string`

**Required:** ❌ No

**Default:** `"${category}_${Date.now()}"`

**Description:** Custom filename for the uploaded file. If not provided, a filename is automatically generated using the category and timestamp.

**Usage:**

```typescript
await uploadFile(file, {
  category: "product_image",
  filename: "blue-denim-jacket.jpg",
});
```

**Best Practices:**

- Use descriptive names that indicate the content
- Avoid special characters and spaces
- Include file extension for clarity
- Keep names under 100 characters

**Examples:**

```typescript
// Good examples
filename: "summer-dress-floral-2024.jpg";
filename: "user-profile-john-smith.png";
filename: "generated-outfit-casual-001.webp";

// Avoid
filename: "IMG_20240626_143052.jpg"; // Not descriptive
filename: "My Favorite Dress!!.jpg"; // Special characters and spaces
```

### `generationId?: Id<"generations">`

**Type:** `Id<"generations">`

**Required:** ❌ No

**Description:** Associates the uploaded file with a specific AI generation record. This creates a relationship between the file and the generation process that created or used it.

**Usage:**

```typescript
await uploadFile(file, {
  category: "generated_image",
  generationId: "k123456789abcdef", // ID from generations table
  isPrimary: true,
});
```

**When to Use:**

- **Generated Images**: Always link result images to their generation
- **Input Images**: Link uploaded inputs to the generation they're used in
- **Processing Steps**: Link intermediate images to their generation workflow

**Example Workflow:**

```typescript
// 1. Create generation record
const generationId = await createGeneration({
  userId,
  productImageUrl,
  modelImageUrl,
  status: "processing",
});

// 2. Upload result with generation link
const result = await uploadFile(resultImage, {
  category: "generated_image",
  generationId,
  isPrimary: true,
  imageOrder: 0,
});
```

### `isPrimary?: boolean`

**Type:** `boolean`

**Required:** ❌ No

**Default:** `false`

**Description:** Indicates whether this file is the primary/main image for its associated generation or collection. Only one file per generation should be marked as primary.

**Usage:**

```typescript
await uploadFile(file, {
  category: "generated_image",
  generationId: "k123456789abcdef",
  isPrimary: true, // This is the main result image
  imageOrder: 0,
});
```

**Use Cases:**

- **Generation Results**: Mark the best/main generated image as primary
- **Product Collections**: Identify the hero image for a product
- **User Profiles**: Mark the main profile picture
- **Gallery Display**: Determine which image to show in previews

**Example with Multiple Images:**

```typescript
// Upload multiple variations, mark one as primary
const images = [mainResult, variation1, variation2];

for (let i = 0; i < images.length; i++) {
  await uploadFile(images[i], {
    category: "generated_image",
    generationId,
    isPrimary: i === 0, // First image is primary
    imageOrder: i,
  });
}
```

### `imageOrder?: number`

**Type:** `number`

**Required:** ❌ No

**Default:** Index in batch upload or undefined for single uploads

**Description:** Defines the order/sequence of this image within a collection or generation. Used for sorting and display order in galleries and carousels.

**Usage:**

```typescript
await uploadFile(file, {
  category: "generated_image",
  generationId: "k123456789abcdef",
  imageOrder: 2, // Third image in the sequence (0-indexed)
});
```

**Use Cases:**

- **Image Sequences**: Order images in a logical sequence
- **Generation Variations**: Sort multiple results by preference/quality
- **Product Galleries**: Control display order in product carousels
- **Step-by-Step Processes**: Order images showing process steps

**Example with Ordered Upload:**

```typescript
const productImages = [
  { file: frontView, order: 0, description: "Front view" },
  { file: sideView, order: 1, description: "Side view" },
  { file: backView, order: 2, description: "Back view" },
  { file: detailView, order: 3, description: "Detail view" },
];

for (const { file, order, description } of productImages) {
  await uploadFile(file, {
    category: "product_image",
    filename: `product-${description.toLowerCase().replace(" ", "-")}.jpg`,
    imageOrder: order,
  });
}
```

## Inherited Cloudinary Options

The `FileUploadOptions` interface also inherits from `CloudinaryUploadOptions`, providing access to additional Cloudinary-specific settings:

### `public_id?: string`

**Description:** Custom public ID for the Cloudinary asset. If not provided, one is auto-generated.

**Note:** The system automatically generates public IDs in the format: `${userId}_${filename}_${timestamp}`

### `quality?: string | number`

**Description:** Image quality setting for compression.

**Options:** `"auto"`, `"best"`, `1-100`

**Default:** `"auto"`

```typescript
await uploadFile(file, {
  category: "product_image",
  quality: "auto", // Automatically optimize quality
});
```

### `format?: string`

**Description:** Force a specific output format.

**Options:** `"auto"`, `"jpg"`, `"png"`, `"webp"`, `"avif"`

**Default:** `"auto"`

```typescript
await uploadFile(file, {
  category: "generated_image",
  format: "webp", // Convert to WebP for better compression
});
```

### `tags?: string[]`

**Description:** Add tags to the Cloudinary asset for organization.

```typescript
await uploadFile(file, {
  category: "product_image",
  tags: ["summer", "dress", "casual", "2024"],
});
```

### `transformation?: object | string`

**Description:** Apply transformations during upload.

```typescript
await uploadFile(file, {
  category: "profile_image",
  transformation: [
    { width: 400, height: 400, crop: "fill" },
    { quality: "auto" },
    { format: "auto" },
  ],
});
```

### `use_filename?: boolean`

**Description:** Whether to use the original filename as part of the public ID.

**Default:** `true`

### `unique_filename?: boolean`

**Description:** Whether to add a unique identifier to prevent conflicts.

**Default:** `false`

### `overwrite?: boolean`

**Description:** Whether to overwrite existing files with the same public ID.

**Default:** `true`

## Complete Examples

### Basic Product Image Upload

```typescript
const result = await uploadFile(file, {
  category: "product_image",
  filename: "summer-dress-floral.jpg",
  quality: "auto",
  tags: ["summer", "dress", "floral"],
});
```

### AI Generation Result Upload

```typescript
const result = await uploadFile(generatedImage, {
  category: "generated_image",
  generationId: generationRecord._id,
  isPrimary: true,
  imageOrder: 0,
  filename: `generated-${generationRecord._id}-main.jpg`,
  quality: "auto",
  format: "webp",
});
```

### Profile Picture Upload with Transformation

```typescript
const result = await uploadFile(profilePic, {
  category: "profile_image",
  filename: `profile-${userId}.jpg`,
  transformation: [
    { width: 200, height: 200, crop: "fill", gravity: "face" },
    { quality: "auto" },
    { format: "auto" },
  ],
  overwrite: true,
});
```

### Batch Upload with Ordering

```typescript
const batchFiles = images.map((file, index) => ({
  file,
  options: {
    category: "product_image" as const,
    generationId: generationId,
    imageOrder: index,
    isPrimary: index === 0,
    filename: `product-variant-${index + 1}.jpg`,
    quality: "auto",
  },
}));

const results = await uploadFiles(batchFiles);
```

## Best Practices

### 1. Category Selection

- Choose the most specific category for your use case
- Be consistent with categorization across your application
- Consider access patterns when selecting categories

### 2. Filename Conventions

- Use descriptive, URL-safe filenames
- Include relevant keywords for searchability
- Maintain consistent naming patterns

### 3. Generation Association

- Always link generated images to their generation records
- Use `isPrimary` to identify the main result
- Implement proper ordering for multiple results

### 4. Performance Optimization

- Use `quality: 'auto'` for automatic optimization
- Consider `format: 'auto'` for best format selection
- Apply transformations during upload when possible

### 5. Organization

- Use `imageOrder` for consistent display sequences
- Implement proper tagging for asset organization
- Consider user experience when setting `isPrimary`

## Error Handling

```typescript
try {
  const result = await uploadFile(file, options);
  console.log("Upload successful:", result);
} catch (error) {
  if (error instanceof FileManagementError) {
    console.error("Upload failed:", error.message);
    // Handle specific error types based on error.code
  }
}
```

## Validation

The system automatically validates:

- File size (max 10MB)
- File type (images only)
- Category values
- User authentication
- Required parameters

## Database Impact

Each upload creates a record in the `files` table with:

- All metadata from the upload options
- Automatic timestamp and user association
- Indexed fields for efficient querying
- Usage tracking for analytics

This comprehensive option system ensures that files are properly organized, efficiently stored, and easily retrievable while maintaining the flexibility needed for various use cases in the Style Studio AI application.
