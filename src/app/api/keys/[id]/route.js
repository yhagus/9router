import { NextResponse } from "next/server";
import { deleteApiKey, getApiKeyById, setApiKeyDefault, updateApiKey } from "@/lib/localDb";

// GET /api/keys/[id] - Get single key
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const key = await getApiKeyById(id);
    if (!key) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }
    return NextResponse.json({ key });
  } catch (error) {
    console.log("Error fetching key:", error);
    return NextResponse.json({ error: "Failed to fetch key" }, { status: 500 });
  }
}

// PUT /api/keys/[id] - Update key
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      isActive,
      comboAccessMode,
      comboAccessList,
      modelAccessMode,
      modelAccessList,
      isDefault,
      limitMode,
      limitValue,
      resetUsage,
    } = body;

    const existing = await getApiKeyById(id);
    if (!existing) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    if (isDefault === true) {
      try {
        const updated = await setApiKeyDefault(id);
        if (!updated) {
          return NextResponse.json({ error: "Key not found" }, { status: 404 });
        }
        const extra = {};
        if (isActive !== undefined) extra.isActive = isActive;
        if (comboAccessMode !== undefined) extra.comboAccessMode = comboAccessMode;
        if (comboAccessList !== undefined) extra.comboAccessList = comboAccessList;
        if (modelAccessMode !== undefined) extra.modelAccessMode = modelAccessMode;
        if (modelAccessList !== undefined) extra.modelAccessList = modelAccessList;
        if (limitMode !== undefined) extra.limitMode = limitMode;
        if (limitValue !== undefined) extra.limitValue = limitValue;
        if (resetUsage === true) extra.resetUsage = true;
        if (Object.keys(extra).length > 0) {
          const merged = await updateApiKey(id, extra);
          return NextResponse.json({ key: merged });
        }
        return NextResponse.json({ key: updated });
      } catch (e) {
        return NextResponse.json({ error: e.message || "Failed to set default" }, { status: 400 });
      }
    }

    const updateData = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (comboAccessMode !== undefined) updateData.comboAccessMode = comboAccessMode;
    if (comboAccessList !== undefined) updateData.comboAccessList = comboAccessList;
    if (modelAccessMode !== undefined) updateData.modelAccessMode = modelAccessMode;
    if (modelAccessList !== undefined) updateData.modelAccessList = modelAccessList;
    if (isDefault === false) updateData.isDefault = false;
    if (limitMode !== undefined) updateData.limitMode = limitMode;
    if (limitValue !== undefined) updateData.limitValue = limitValue;
    if (resetUsage === true) updateData.resetUsage = true;

    const updated = await updateApiKey(id, updateData);

    return NextResponse.json({ key: updated });
  } catch (error) {
    console.log("Error updating key:", error);
    return NextResponse.json({ error: "Failed to update key" }, { status: 500 });
  }
}

// DELETE /api/keys/[id] - Delete API key
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const deleted = await deleteApiKey(id);
    if (!deleted) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Key deleted successfully" });
  } catch (error) {
    console.log("Error deleting key:", error);
    return NextResponse.json({ error: "Failed to delete key" }, { status: 500 });
  }
}
