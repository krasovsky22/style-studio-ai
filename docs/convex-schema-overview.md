# Convex Database Schema Overview - Style Studio AI

## Entity Relationship Diagram

```
┌─────────────┐    1:N    ┌──────────────┐    1:N    ┌─────────────┐
│    Users    │ ────────→ │ Generations  │ ────────→ │    Files    │
│             │           │              │           │             │
│ - email     │           │ - userId     │           │ - userId    │
│ - name      │           │ - status     │           │ - category  │
│ - tokens    │           │ - prompt     │           │ - storageId │
└─────────────┘           │ - parameters │           └─────────────┘
       │                  └──────────────┘                   │
       │ 1:N                      │ 1:N                      │
       │                          │                          │
       ▼                          ▼                          │
┌─────────────┐           ┌──────────────┐                   │
│ TokenPurch. │           │    Usage     │                   │
│             │           │              │                   │
│ - amount    │           │ - action     │                   │
│ - tokens    │           │ - timestamp  │                   │
│ - status    │           │ - metadata   │                   │
└─────────────┘           └──────────────┘                   │
                                 │                           │
                                 │ N:1                       │
                                 └───────────────────────────┘
```

## Table Relationships

### Users (Central Entity)

- **Primary Key**: `_id`
- **Unique Constraints**: `email`, `externalId`
- **Relationships**:
  - Has many `generations` (1:N)
  - Has many `files` (1:N)
  - Has many `tokenPurchases` (1:N)
  - Has many `usage` records (1:N)

### Generations (Core Business Logic)

- **Primary Key**: `_id`
- **Foreign Keys**: `userId` → `users._id`
- **File References**:
  - `productImageFiles[]` → `files._id[]`
  - `modelImageFiles[]` → `files._id[]`
  - `resultImageFiles[]` → `files._id[]`
- **Status Flow**: `pending → uploading → processing → completed/failed/cancelled`

### Files (Asset Management)

- **Primary Key**: `_id`
- **Foreign Keys**: `userId` → `users._id`
- **Categories**: `product_image`, `model_image`, `generated_image`, `profile_image`
- **Storage**: Uses Convex built-in file storage via `storageId`

### TokenPurchases (Billing)

- **Primary Key**: `_id`
- **Foreign Keys**: `userId` → `users._id`
- **External References**: `stripePaymentIntentId` (Stripe integration)
- **Status Flow**: `pending → completed/failed/refunded`

### Usage (Analytics)

- **Primary Key**: `_id`
- **Foreign Keys**: `userId` → `users._id`
- **Optional References**: `generationId`, `tokenPurchaseId`, `fileId` via metadata
- **Actions**: Track all user interactions and system events

## Data Flow Patterns

### Image Generation Workflow

```
1. User Authentication
   ├─ getCurrentUser() → users table
   └─ requireTokens() → validate balance

2. File Upload
   ├─ Upload to Convex storage
   ├─ storeFileMetadata() → files table
   └─ Category: "product_image" | "model_image"

3. Generation Request
   ├─ startGeneration() → generations table
   ├─ deductTokens() → update users.tokenBalance
   └─ logUserAction() → usage table

4. Processing Updates
   ├─ updateGenerationStatus() → "processing"
   └─ External AI service integration

5. Completion
   ├─ Store result images → files table
   ├─ updateGenerationStatus() → "completed"
   └─ logUserAction() → usage table
```

### Token Purchase Flow

```
1. Purchase Initiation
   ├─ createTokenPurchase() → tokenPurchases table
   └─ Status: "pending"

2. Payment Processing
   ├─ Stripe integration
   └─ stripePaymentIntentId stored

3. Completion
   ├─ completeTokenPurchase() → Status: "completed"
   ├─ Update users.tokenBalance
   ├─ Update users.totalTokensPurchased
   └─ logUserAction() → usage table
```

## Index Strategy

### Performance Optimization

#### Users Table

- `by_email`: Fast login/authentication
- `by_external_id`: OAuth provider lookups

#### Generations Table

- `by_user`: User's generation history
- `by_status`: Monitor processing status
- `by_user_and_created_at`: Paginated user history
- `by_user_and_status`: Filter user generations by status

#### Files Table

- `by_user`: User's file management
- `by_category`: File type filtering
- `by_storage_id`: Convex storage integration

#### Usage Table

- `by_user_and_timestamp`: User analytics timeline
- `by_action`: System-wide action analytics
- `by_user_and_action`: User-specific action analysis

#### TokenPurchases Table

- `by_user`: User purchase history
- `by_stripe_payment_intent`: Payment reconciliation
- `by_transaction_id`: Internal transaction tracking

## Data Consistency Rules

### Atomicity Requirements

1. **Token Deduction**: Must be atomic with generation creation
2. **Purchase Completion**: Token addition must be atomic with purchase completion
3. **File References**: Generation must maintain valid file references

### Referential Integrity

1. **Cascade Deletes**: Consider user deletion impact on related data
2. **File Cleanup**: Remove storage files when metadata is deleted
3. **Generation Dependencies**: Validate file ownership before generation

### Business Rules

1. **Token Balance**: Never allow negative token balances
2. **Generation Status**: Enforce valid status transitions
3. **File Categories**: Validate file categories match usage context
4. **User Uniqueness**: Enforce unique email addresses

## Query Patterns

### Common Queries

```typescript
// User Dashboard Data
const [user, generations, tokenBalance] = await Promise.all([
  ctx.runQuery(api.users.getUserById, { userId }),
  ctx.runQuery(api.generations.getUserGenerations, { userId, limit: 10 }),
  ctx.runQuery(api.users.getUserById, { userId }), // for token balance
]);

// Generation with Images
const generation = await ctx.runQuery(api.generations.getGeneration, { id });
const images = await ctx.runQuery(api.files.getGenerationImages, {
  generationId: generation._id,
});

// Analytics Dashboard
const usage = await ctx.runQuery(api.usage.getUserUsageHistory, {
  userId,
  action: "generation_completed",
  limit: 30,
});
```

### Performance Considerations

1. **Pagination**: Always use limits for large result sets
2. **Index Usage**: Structure queries to leverage existing indexes
3. **Batch Operations**: Use Promise.all for parallel data fetching
4. **Selective Fields**: Consider projection for large documents

## Migration Considerations

### Schema Evolution

1. **Adding Fields**: Use optional fields for backward compatibility
2. **Changing Types**: Plan migration scripts for type changes
3. **Index Changes**: Monitor performance impact of index modifications
4. **Data Relationships**: Careful planning for relationship changes

### Backup Strategy

1. **Regular Exports**: Export critical data regularly
2. **Point-in-Time Recovery**: Leverage Convex backup features
3. **Cross-Environment Sync**: Maintain dev/staging/prod consistency

This schema overview provides the structural foundation for understanding data relationships and query patterns in the Style Studio AI application.
