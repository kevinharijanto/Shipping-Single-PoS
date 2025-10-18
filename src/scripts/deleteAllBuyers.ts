#!/usr/bin/env ts-node
import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function deleteAllBuyers() {
  console.log("Starting to delete all buyers...");
  
  // First, check if there are any orders referencing buyers
  const ordersCount = await prisma.order.count({
    where: { buyerId: { not: undefined } }
  });
  
  if (ordersCount > 0) {
    console.log(`Warning: Found ${ordersCount} orders referencing buyers. These orders will be affected.`);
    
    // Option 1: Delete all orders first (if you want to completely clean the database)
    const confirmDeleteOrders = process.argv.includes("--delete-orders");
    
    if (confirmDeleteOrders) {
      console.log("Deleting all orders first...");
      await prisma.order.deleteMany({});
      console.log("All orders deleted.");
    } else {
      console.log("Orders will remain but will reference non-existent buyers (causing foreign key constraint issues).");
      console.log("Use --delete-orders flag to delete orders as well.");
    }
  }
  
  // Delete all buyers
  const result = await prisma.buyer.deleteMany({});
  console.log(`Deleted ${result.count} buyers from the database.`);
  
  console.log("Buyer deletion completed.");
}

async function main() {
  await deleteAllBuyers();
}

main()
  .catch((e) => { 
    console.error("Error during buyer deletion:", e); 
    process.exit(1); 
  })
  .finally(async () => { 
    await prisma.$disconnect(); 
  });