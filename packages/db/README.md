# StockOps DB Package

This package manages the Prisma ORM schema and database migrations for the StockOps project.

## Row Level Security (RLS) Trade-off

In Phase 0 of the implementation plan, we evaluated the use of `FORCE ROW LEVEL SECURITY`. 
We decided to proceed with **Option A**: dropping `FORCE ROW LEVEL SECURITY` across the application. 

### Rationale

- **App-layer Filtering**: The application layer already enforces tenant isolation by filtering by `organizationId` in every repository function.
- **Complexity vs Value**: Implementing `SET LOCAL app.current_organization_id` inside every transaction (Option B) adds significant complexity for Prisma middleware.
- **Current State**: Since the application uses a single connection pool and tenant context is securely managed via Vercel-side auth, RLS is currently redundant. 

### Future Considerations

If a second tenant, an external user with their own DB role, or a multi-org self-serve flow is introduced, we should revisit Option B and re-enable `FORCE ROW LEVEL SECURITY`. Until then, tenant isolation is maintained successfully at the application layer.
