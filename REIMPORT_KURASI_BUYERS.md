# How to Remove Current DB Entries and Import Kurasi Buyers Again

This guide explains how to completely remove all buyer entries from your database and import fresh data from Kurasi.

## Prerequisites

Make sure you have the following environment variables set in your `.env` file:
- `KURASI_TOKEN` or `X_SHIP_AUTH_TOKEN` - Your Kurasi API token
- `KURASI_CLIENT_CODE` - Your client code (default: "K0016794")
- `DATABASE_URL` - Your database connection string

## Step 1: Delete All Existing Buyers

### Option A: Delete only buyers (if no orders reference them)
```bash
npx tsx src/scripts/deleteAllBuyers.ts
```

### Option B: Delete buyers and all orders that reference them
```bash
npx tsx src/scripts/deleteAllBuyers.ts --delete-orders
```

⚠️ **Warning**: Option B will permanently delete all orders in your database. Only use this if you want to completely reset your order data.

## Step 2: Import Fresh Kurasi Buyer Data

You have two ways to import buyers:

### Option 1: Using the Import Script (Recommended for Full Import)

The import script will fetch all buyers from Kurasi starting from the configured start date:

```bash
npx tsx src/scripts/importKurasiBuyer.ts
```

This will:
- Fetch buyers from `KURASI_START_DATE` (default: "2018-01-15") to today
- Process up to `KURASI_LIMIT` records per batch (default: 3000)
- Use `upsert` operation to create or update buyers based on `saleRecordNumber`

### Option 2: Using the API Endpoint (For Partial/Controlled Import)

You can also use the API endpoint to import buyers in smaller batches:

```bash
curl -X POST http://localhost:3888/api/kurasi/buyer \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2023-01-01",
    "endDate": "2023-12-31",
    "index": 0,
    "limit": 100,
    "clientCode": "K0016794"
  }'
```

## Step 3: Verify the Import

Check that buyers were imported correctly:

1. **Via Database Query**:
   ```bash
   npx prisma studio
   ```
   Then navigate to the Buyer table to see the imported data.

2. **Via Application**:
   Navigate to `/buyers` in your application to see the list of imported buyers.

## Customization Options

### Environment Variables

You can customize the import behavior with these environment variables:

- `KURASI_LIMIT`: Number of records to fetch per batch (default: 3000)
- `KURASI_CLIENT_CODE`: Your Kurasi client code (default: "K0016794")
- `KURASI_START_DATE`: Start date for fetching records (default: "2018-01-15")

### Test Import

To test with just one record before doing a full import:

```bash
npx tsx src/scripts/importKurasiBuyer.ts --test-one
```

This will fetch and import only the first record from Kurasi.

## Troubleshooting

### Common Issues

1. **Foreign Key Constraint Errors**: 
   - If you have orders referencing buyers, you must either delete the orders first or use the `--delete-orders` flag.

2. **API Authentication Errors**:
   - Ensure your `KURASI_TOKEN` or `X_SHIP_AUTH_TOKEN` is valid and properly set.

3. **Rate Limiting**:
   - If you hit rate limits, try reducing the `KURASI_LIMIT` value or adding delays between batches.

4. **Duplicate Records**:
   - The import script uses `upsert` based on `saleRecordNumber`, so duplicates shouldn't be an issue.

### Reset Everything

If you need to completely reset your database:

```bash
# Reset the database (this will delete ALL data)
npx prisma migrate reset

# Then re-run the import
npx tsx src/scripts/importKurasiBuyer.ts
```

## Automation

You can create a simple script to automate the entire process:

```bash
#!/bin/bash
echo "Deleting all buyers..."
npx tsx src/scripts/deleteAllBuyers.ts --delete-orders

echo "Importing fresh buyer data..."
npx tsx src/scripts/importKurasiBuyer.ts

echo "Done! Check your buyers at /buyers"
```

Save this as `reset-and-import.sh` and make it executable with `chmod +x reset-and-import.sh`.