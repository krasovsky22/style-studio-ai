# Mock Image Generation Test

This script demonstrates the mock image generation feature.

## Quick Test

To test the mock image generation:

1. **Ensure mock mode is enabled** in `.env.local`:

   ```bash
   MOCK_IMAGE_GENERATION=true
   ```

2. **Start the development server**:

   ```bash
   npm run dev
   ```

3. **Navigate to the generation page**:

   - Open http://localhost:3000/generate
   - Upload some images or fill out the form
   - Click "Generate Images"

4. **Observe the console output**:
   - Look for 🎭 emoji indicating mock mode
   - Check for placeholder image URLs
   - Verify the generation completes quickly

## Expected Console Output

When mock mode is active, you should see:

```
🎭 Mock mode enabled - using placeholder images
🎭 Mock Image Generation - Generating placeholder images...
🖼️  Generating mock image 1/3: https://picsum.photos/seed/...
🖼️  Generating mock image 2/3: https://picsum.photos/seed/...
🖼️  Generating mock image 3/3: https://picsum.photos/seed/...
✅ Mock Image Generation - Completed successfully
```

## Manual API Test

You can also test the API directly:

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A stylish outfit",
    "model": "dall-e-3-standard",
    "quality": "standard",
    "aspectRatio": "1:1"
  }'
```

## Switching Modes

To test with real OpenAI API:

1. Set `MOCK_IMAGE_GENERATION=false` in `.env.local`
2. Ensure you have a valid `OPEN_AI_SECRET`
3. Restart the development server
4. Test again - this time it will use the real API

## Troubleshooting

- **Images not showing**: Check browser network tab for image loading
- **Mock mode not working**: Verify environment variable and restart server
- **No console output**: Check browser console and server logs
