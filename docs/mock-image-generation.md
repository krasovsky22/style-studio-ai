# Mock Image Generation Documentation

## Overview

The mock image generation feature allows developers to test the image generation workflow without consuming OpenAI API credits or requiring an active internet connection to the DALL-E API. This is particularly useful for:

- **Development**: Testing the application flow without API costs
- **Testing**: Running automated tests without external dependencies
- **Debugging**: Isolating issues in the generation pipeline
- **Offline Development**: Working without internet connectivity

## Configuration

### Environment Variable

Add the following environment variable to enable mock mode:

```bash
MOCK_IMAGE_GENERATION=true
```

### Available Settings

- `true`: Enable mock generation (uses placeholder images)
- `false` or unset: Use real OpenAI DALL-E API (default)

## How It Works

When mock mode is enabled, the system:

1. **Intercepts** calls to the OpenAI service
2. **Generates** realistic placeholder images using the Picsum service
3. **Simulates** processing time based on quality settings
4. **Returns** the same response format as the real API

## Mock Image Sources

The mock system uses multiple sources for realistic placeholders:

### Primary Source: Picsum Photos

- **URL**: `https://picsum.photos/seed/{seed}/{width}/{height}`
- **Benefits**: Unique, high-quality images with consistent seeding
- **Fallback**: Local canvas generation if service is unavailable

### Seed Generation

Seeds are created based on:

- Model name
- Quality setting
- Aspect ratio
- Prompt hash
- Image index

This ensures **consistent** results for the same parameters.

## Features

### ✅ Full API Compatibility

- Same request/response format as real API
- Same error handling patterns
- Same processing time simulation

### ✅ Realistic Behavior

- Quality-based processing time simulation
- Multiple images generated (3 per request)
- Proper aspect ratio handling
- Unique images per request

### ✅ Development Features

- Detailed console logging with emojis
- Processing time tracking
- Image size reporting
- Error simulation capabilities

## Usage Examples

### Basic Usage

```typescript
import { generateImages } from "@/services/openai";

// Set MOCK_IMAGE_GENERATION=true in your .env.local

const result = await generateImages({
  prompt: "A stylish outfit worn by a professional model",
  model: "dall-e-3-standard",
  quality: "high",
  aspectRatio: "1:1",
  style: "realistic",
  productImages: ["https://example.com/product.jpg"],
  modelImages: ["https://example.com/model.jpg"],
});

if (result.success) {
  console.log(`Generated ${result.images.length} images`);
  console.log(`Processing time: ${result.metadata?.processingTime}ms`);
}
```

### Environment Detection

```typescript
import {
  isMockImageGenerationEnabled,
  getImageGenerationMode,
} from "@/lib/environment";

console.log("Mock mode:", isMockImageGenerationEnabled);
console.log("Generation mode:", getImageGenerationMode()); // 'mock' or 'real'
```

### Running Examples

```typescript
import { runAllExamples } from "@/examples/mock-generation-example";

// Run comprehensive examples
await runAllExamples();
```

## Processing Time Simulation

Mock mode simulates realistic processing times:

| Quality  | Simulated Time |
| -------- | -------------- |
| auto     | 1.0 seconds    |
| standard | 1.5 seconds    |
| high     | 2.0 seconds    |
| ultra    | 3.0 seconds    |

## Image Specifications

### Supported Aspect Ratios

- `1:1` → 1024×1024
- `16:9` → 1792×1024
- `9:16` → 1024×1792
- `4:3` → 1024×768
- `3:4` → 768×1024

### Image Format

- **Format**: PNG/JPEG (based on source)
- **Quality**: High-resolution placeholders
- **Size**: Realistic file sizes (100KB-2MB)

## Console Output

When mock mode is active, you'll see distinctive logging:

```
🎭 Mock Image Generation - Generating placeholder images...
🖼️  Generating mock image 1/3: https://picsum.photos/seed/...
🖼️  Generating mock image 2/3: https://picsum.photos/seed/...
🖼️  Generating mock image 3/3: https://picsum.photos/seed/...
✅ Mock Image Generation - Completed successfully
```

## Testing Integration

### Jest/Vitest Tests

```typescript
describe("Image Generation", () => {
  beforeAll(() => {
    process.env.MOCK_IMAGE_GENERATION = "true";
  });

  test("should generate mock images", async () => {
    const result = await generateImages({
      prompt: "Test prompt",
      model: "dall-e-3-standard",
      quality: "standard",
      aspectRatio: "1:1",
    });

    expect(result.success).toBe(true);
    expect(result.images).toHaveLength(3);
    expect(result.metadata?.processingTime).toBeGreaterThan(0);
  });
});
```

### Cypress E2E Tests

```typescript
describe("Generation Flow", () => {
  beforeEach(() => {
    // Mock mode should be enabled in test environment
    cy.visit("/generate");
  });

  it("should complete generation flow with mock images", () => {
    cy.get('[data-testid="generate-button"]').click();
    cy.get('[data-testid="generation-status"]').should("contain", "Processing");
    cy.get('[data-testid="generation-results"]').should("be.visible");
    cy.get('[data-testid="generated-image"]').should("have.length", 3);
  });
});
```

## Production Considerations

### ⚠️ Important Notes

1. **Never enable mock mode in production**
2. **Always validate environment variables**
3. **Use environment-specific configurations**

### Environment Configuration

```bash
# .env.local (development)
MOCK_IMAGE_GENERATION=true

# .env.production
MOCK_IMAGE_GENERATION=false
OPEN_AI_SECRET=your-real-api-key
```

### Validation

```typescript
import { validateEnvironment } from "@/lib/environment";

// Validates required variables based on mock mode
validateEnvironment();
```

## Troubleshooting

### Common Issues

#### 1. Mock Mode Not Working

```bash
# Check environment variable
echo $MOCK_IMAGE_GENERATION

# Restart development server
npm run dev
```

#### 2. Images Not Loading

- Check network connectivity to Picsum service
- Verify fallback to local generation
- Check console for error messages

#### 3. Processing Time Too Fast/Slow

```typescript
// Adjust simulation time in mock-image-generation.ts
function getSimulatedProcessingTime(quality: string): number {
  return timeMap[quality] || 1500; // Adjust default
}
```

### Debug Information

```typescript
import { getEnvironmentInfo } from "@/lib/environment";

console.log(getEnvironmentInfo());
// Output:
// {
//   nodeEnv: 'development',
//   imageGenerationMode: 'mock',
//   hasOpenAiKey: false,
//   hasCloudinaryConfig: true,
//   hasStripeConfig: false,
//   timestamp: '2025-06-20T...'
// }
```

## Advanced Usage

### Custom Mock Images

You can extend the mock system to use custom placeholder images:

```typescript
// In mock-image-generation.ts
const customPlaceholders = [
  "https://your-domain.com/placeholder1.jpg",
  "https://your-domain.com/placeholder2.jpg",
  "https://your-domain.com/placeholder3.jpg",
];

// Use in createSinglePlaceholderImage function
const placeholderUrl = customPlaceholders[index % customPlaceholders.length];
```

### Mock Error Simulation

```typescript
// Simulate API errors for testing
if (request.prompt.includes("error")) {
  return {
    success: false,
    images: [],
    error: "Simulated API error for testing",
  };
}
```

## Best Practices

### 1. Development Workflow

- Enable mock mode for daily development
- Use real API for final testing
- Test both modes in CI/CD pipeline

### 2. Testing Strategy

- Unit tests with mock mode
- Integration tests with real API (limited)
- E2E tests with mock mode

### 3. Performance

- Mock images are cached by browser
- Consistent seeds provide reproducible results
- Fallback ensures reliability

## Future Enhancements

Potential improvements to the mock system:

- **Local image generation** using Canvas API
- **Custom prompt analysis** for themed placeholders
- **Error scenario simulation** for robust testing
- **Performance benchmarking** tools
- **Visual regression testing** support

---

**Last Updated**: June 20, 2025  
**Version**: 1.0.0  
**Status**: Production Ready
