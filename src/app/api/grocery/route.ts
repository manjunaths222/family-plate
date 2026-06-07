/**
 * GET  /api/grocery?weekId=2026-W24   — fetch grocery list
 * PATCH /api/grocery                  — check off / "already have" an item
 *
 * PATCH body: { weekId: string, itemId: string, have: boolean }
 */
import { NextResponse } from 'next/server';
import { verifyIdToken, adminDb } from '@/lib/firebase/admin';
import type { GroceryItem } from '@/types';

// ── GET ───────────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  let uid: string;
  try {
    const token = await verifyIdToken(request);
    uid = token.uid;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const weekId = searchParams.get('weekId');
  if (!weekId) {
    return NextResponse.json({ error: 'weekId query param required' }, { status: 400 });
  }

  const snap = await adminDb.doc(`users/${uid}/plans/${weekId}/grocery/list`).get();
  if (!snap.exists) {
    return NextResponse.json({ items: [] });
  }

  return NextResponse.json(snap.data());
}

// ── PATCH ─────────────────────────────────────────────────────────────────
export async function PATCH(request: Request) {
  let uid: string;
  try {
    const token = await verifyIdToken(request);
    uid = token.uid;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { weekId: string; itemId: string; have: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { weekId, itemId, have } = body;
  if (!weekId || !itemId || have === undefined) {
    return NextResponse.json({ error: 'weekId, itemId, and have are required' }, { status: 400 });
  }

  const ref  = adminDb.doc(`users/${uid}/plans/${weekId}/grocery/list`);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: 'Grocery list not found' }, { status: 404 });
  }

  const { items } = snap.data() as { items: GroceryItem[] };
  const updated = items.map((item: GroceryItem) =>
    item.id === itemId ? { ...item, have } : item
  );

  await ref.update({ items: updated });
  return NextResponse.json({ items: updated });
}
