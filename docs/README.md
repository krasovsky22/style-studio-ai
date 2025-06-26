# Style Studio AI - Convex Backend Documentation

## Overview

Style Studio AI is an AI-powered image generation platform that allows users to create professional-quality images using AI models. The backend is built on Convex, providing real-time database functionality, file storage, and serverless functions.

## Architecture

The system consists of:

- **User Management**: Authentication, profiles, and token balance
- **Image Generation**: AI-powered image creation with multiple models
- **File Management**: Upload, storage, and metadata tracking
- **Token Economy**: Purchase, usage, and billing system
- **Analytics**: Usage tracking and performance monitoring

## Documentation Structure

### 📖 Core References

#### [Convex API Reference](./convex-api-reference.md)

Complete overview of the database schema, API methods, and data structures. Essential reading for understanding the system architecture.

#### [Database Schema Overview](./convex-schema-overview.md)

Detailed analysis of table relationships, indexes, and data flow patterns. Includes entity relationship diagrams and query optimization strategies.

#### [API Methods Reference](./convex-api-methods.md)

Comprehensive documentation of all Convex functions including parameters, return values, error handling, and usage examples.

#### [Configuration & Constants](./convex-configuration.md)

Application constants, environment variables, feature flags, and configuration patterns used throughout the system.

### 🤖 AI Agent Integration

#### [AI Agent Integration Guide](./ai-agent-integration-guide.md)

Practical patterns and workflows for AI agents to interact with the backend. Includes authentication, error handling, and common use cases.

## Quick Start for AI Agents

### 1. Authentication

```typescript
// Get current user context
const user = await getCurrentUserOrThrow(ctx);

// Validate token balance
const user = await requireTokens(ctx, estimatedCost);
```

### 2. File Upload

```typescript
// Store uploaded file metadata
const fileId = await ctx.runMutation(api.files.storeFileMetadata, {
  userId: user._id,
  filename: "product.jpg",
  contentType: "image/jpeg",
  size: 1024000,
  storageId: "convex_storage_id",
  category: "product_image",
});
```

### 3. Start Generation

```typescript
// Create new generation
const generationId = await ctx.runMutation(api.generations.startGeneration, {
  userId: user._id,
  productImageFiles: [fileId],
  prompt: "Professional model wearing the product",
  parameters: {
    model: "stable-diffusion-xl",
    style: "fashion",
    quality: "high",
    aspectRatio: "16:9",
  },
  estimatedTokenCost: 1,
});
```

### 4. Update Status

```typescript
// Update generation progress
await ctx.runMutation(api.generations.updateGenerationStatus, {
  generationId,
  status: "completed",
  resultImageFiles: [resultFileId],
});
```

## Key Features

### 🔐 Authentication System

- OAuth integration (Google, GitHub)
- Email-based authentication
- Session management and security

### 🎨 AI Image Generation

- Multiple AI models (Stable Diffusion, DALL-E, etc.)
- Style presets and quality settings
- Batch processing capabilities
- Progress tracking and status updates

### 💰 Token Economy

- Pay-per-use token system
- Multiple pricing tiers
- Stripe payment integration
- Automatic refunds for failed generations

### 📁 File Management

- Secure file upload and storage
- Image categorization and metadata
- Cloudinary integration for CDN
- Storage usage tracking

### 📊 Analytics & Monitoring

- Detailed usage tracking
- Performance metrics
- Error rate monitoring
- User behavior analytics

## Database Schema Summary

### Core Tables

| Table            | Purpose                         | Key Features                         |
| ---------------- | ------------------------------- | ------------------------------------ |
| `users`          | User accounts and profiles      | Token balance, OAuth integration     |
| `generations`    | AI image generation requests    | Status tracking, parameters, results |
| `files`          | File metadata and storage       | Categorization, image metadata       |
| `tokenPurchases` | Payment transactions            | Stripe integration, purchase history |
| `usage`          | Analytics and activity tracking | Detailed action logging              |

### Key Relationships

- Users → Generations (1:N)
- Users → Files (1:N)
- Users → Token Purchases (1:N)
- Generations → Files (N:M through references)
- Users → Usage Records (1:N)

## API Patterns

### Standard Response Format

All API methods follow consistent patterns:

- **Queries**: Return data or null
- **Mutations**: Return ID or updated document
- **Errors**: Use standardized error codes and messages

### Authentication Flow

1. Verify user identity with `getCurrentUser()`
2. Validate permissions with `requireTokens()`
3. Execute operation
4. Log action with `logUserAction()`

### Error Handling

- Standardized error codes (UNAUTHORIZED, INSUFFICIENT_TOKENS, etc.)
- Consistent error message format
- Automatic token refunds for failures
- Comprehensive logging for debugging

## Configuration

### Environment Variables

- **CONVEX_DEPLOYMENT**: Database deployment URL
- **OPENAI_API_KEY**: AI model access
- **STRIPE_SECRET_KEY**: Payment processing
- **CLOUDINARY_API_KEY**: Image storage CDN

### Feature Flags

- Batch processing (Pro+ users)
- API access (Pro+ users)
- Advanced analytics (Enterprise users)

### Rate Limits

- Free: 5 generations/hour
- Basic: 10 generations/hour
- Pro: 30 generations/hour
- Enterprise: 100 generations/hour

## Common Use Cases

### User Onboarding

1. Create user account
2. Grant initial free tokens
3. Guide through first generation
4. Track usage and engagement

### Image Generation Workflow

1. Upload product/model images
2. Configure generation parameters
3. Validate token balance
4. Process with AI service
5. Store and deliver results

### Payment Processing

1. User selects token package
2. Create Stripe payment intent
3. Process payment
4. Add tokens to user balance
5. Send confirmation

### Analytics Dashboard

1. Fetch user statistics
2. Calculate success rates
3. Show recent activity
4. Display token usage trends

## Best Practices

### For AI Agents

1. **Always authenticate** before operations
2. **Validate tokens** before expensive operations
3. **Handle errors gracefully** with proper fallbacks
4. **Log all actions** for audit trails
5. **Use batch operations** for efficiency
6. **Implement retry logic** for transient failures

### Performance Optimization

1. **Use parallel queries** with Promise.all
2. **Leverage indexes** for efficient queries
3. **Implement pagination** for large result sets
4. **Cache frequently accessed data**
5. **Monitor query performance**

### Security Considerations

1. **Validate file ownership** before operations
2. **Check user permissions** for all actions
3. **Sanitize user inputs** to prevent injection
4. **Log security events** for monitoring
5. **Use HTTPS** for all communications

## Support and Troubleshooting

### Common Issues

1. **Insufficient Tokens**: Guide users to purchase more tokens
2. **File Upload Failures**: Check size limits and file types
3. **Generation Timeouts**: Implement retry mechanisms
4. **Authentication Errors**: Verify OAuth configuration

### Debugging Tools

1. **Usage logs**: Track all user actions
2. **Error logs**: Detailed error messages and stack traces
3. **Performance metrics**: Query timing and success rates
4. **System health**: Monitor external service availability

### Getting Help

- Check the API method documentation for parameter details
- Review error codes in the configuration reference
- Use the integration guide for common patterns
- Monitor usage analytics for system health

This documentation provides comprehensive coverage of the Style Studio AI Convex backend, enabling AI agents and developers to effectively integrate with and extend the system.
