import { db } from "../../../db";
import { locations, items } from "../../../db/schema";
import { and, eq, desc, isNull, count } from "drizzle-orm";

type LocationData = {
  room: string;
  rack: string;
  shelf: string;
};

class LocationService {
  async getAllLocations() {
    try {
      const result = await db.query.locations.findMany({
        where: isNull(locations.deletedAt),
        orderBy: desc(locations.id),
      });

      return {
        success: true,
        message: "Locations retrieved successfully",
        data: result,
      };
    } catch (err) {
      console.error("[LocationService] Error getting locations:", err);
      return {
        success: false,
        message: "Failed to get locations",
        data: null,
      };
    }
  }

  async getLocationById(id: number) {
    try {
      const result = await db.query.locations.findFirst({
        where: and(eq(locations.id, id), isNull(locations.deletedAt)),
      });

      if (!result) {
        return {
          success: false,
          message: "Location not found",
          data: null,
        };
      }

      return {
        success: true,
        message: "Location retrieved successfully",
        data: result,
      };
    } catch (err) {
      console.error("[LocationService] Error getting location by ID:", err);
      return {
        success: false,
        message: "Failed to get location by ID",
        data: null,
      };
    }
  }

  async createLocation(data: LocationData) {
    try {
      const existingLocation = await db.query.locations.findFirst({
        where: and(
          eq(locations.room, data.room),
          eq(locations.rack, data.rack),
          eq(locations.shelf, data.shelf),
          isNull(locations.deletedAt),
        ),
      });

      if (existingLocation) {
        return {
          success: false,
          message: "Location already exists",
          data: null,
        };
      }

      const [result] = await db.insert(locations).values(data).returning();

      if (!result) {
        return {
          success: false,
          message: "Failed to create location",
          data: null,
        };
      }

      return {
        success: true,
        message: "Location created successfully",
        data: result,
      };
    } catch (err) {
      console.error("[LocationService] Error creating location:", err);
      return {
        success: false,
        message: "Failed to create location",
        data: null,
      };
    }
  }

  async updateLocation(id: number, data: Partial<LocationData>) {
    try {
      const existingLocation = await db.query.locations.findFirst({
        where: and(eq(locations.id, id), isNull(locations.deletedAt)),
      });

      if (!existingLocation) {
        return {
          success: false,
          message: "Location not found",
          data: null,
        };
      }

      // Check unique constraint if room, rack, or shelf updated
      const nextRoom = data.room ?? existingLocation.room;
      const nextRack = data.rack ?? existingLocation.rack;
      const nextShelf = data.shelf ?? existingLocation.shelf;

      const duplicate = await db.query.locations.findFirst({
        where: and(
          eq(locations.room, nextRoom),
          eq(locations.rack, nextRack),
          eq(locations.shelf, nextShelf),
          isNull(locations.deletedAt)
        ),
      });

      if (duplicate && duplicate.id !== id) {
        return {
          success: false,
          message: "Location with the same room, rack, and shelf already exists",
          data: null,
        };
      }

      const [result] = await db
        .update(locations)
        .set(data)
        .where(and(eq(locations.id, id), isNull(locations.deletedAt)))
        .returning();

      if (!result) {
        return {
          success: false,
          message: "Failed to update location",
          data: null,
        };
      }

      return {
        success: true,
        message: "Location updated successfully",
        data: result,
      };
    } catch (err) {
      console.error("[LocationService] Error updating location:", err);
      return {
        success: false,
        message: "Failed to update location",
        data: null,
      };
    }
  }

  async deleteLocation(id: number) {
    try {
      const existingLocation = await db.query.locations.findFirst({
        where: and(eq(locations.id, id), isNull(locations.deletedAt)),
      });

      if (!existingLocation) {
        return {
          success: false,
          message: "Location not found",
          data: null,
        };
      }

      // Check if location still has active items
      const [itemCountResult] = await db
        .select({ value: count() })
        .from(items)
        .where(and(eq(items.locationId, id), isNull(items.deletedAt)));

      const activeItems = Number(itemCountResult?.value || 0);
      if (activeItems > 0) {
        return {
          success: false,
          conflict: true,
          message: `Lokasi tidak dapat dihapus karena masih digunakan oleh ${activeItems} eksemplar buku aktif`,
          data: null,
        };
      }

      const [result] = await db
        .update(locations)
        .set({ deletedAt: new Date() })
        .where(and(eq(locations.id, id), isNull(locations.deletedAt)))
        .returning();

      if (!result) {
        return {
          success: false,
          message: "Failed to delete location",
          data: null,
        };
      }

      return {
        success: true,
        message: "Location deleted successfully",
        data: result,
      };
    } catch (err) {
      console.error("[LocationService] Error deleting location:", err);
      return {
        success: false,
        message: "Failed to delete location",
        data: null,
      };
    }
  }
}

export default new LocationService();
