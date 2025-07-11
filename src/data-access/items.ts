import { eq } from "drizzle-orm";
import { database } from "@/db/database";
import { items } from "@/db/schema";

export async function getItem(itemId: number) {
  const item = await database.query.items.findFirst({
    where: eq(items.id, itemId),
  });
  return item;
}

export async function getAllItems() {
  return await database.query.items.findMany();
}

export async function getLiveItems() {
  return database.query.items.findMany({
    where: (item, { eq }) => eq(item.auctionType, "live"),
  });
}
