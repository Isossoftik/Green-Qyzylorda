import { db, uploads } from "@/lib/db";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  if (
    !/^[0-9a-f-]{36}\.webp$/.test(name) ||
    !(
      (await db.reportPhoto.findUnique({ where: { filename: name } })) ||
      (await db.tree.findUnique({ where: { photo: name } })) ||
      (await db.serviceEvent.findUnique({ where: { photo: name } })) ||
      (await db.reviewDecision.findFirst({ where: { image: name }, select: { id: true } }))
    )
  )
    return new Response(null, { status: 404 });
  try {
    const file = path.join(uploads, name);
    if (await realpath(file) !== file) return new Response(null, { status: 404 });
    return new Response(
      new Uint8Array(await readFile(file)),
      {
        headers: {
          "Content-Type": "image/webp",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch {
    return new Response(null, { status: 404 });
  }
}
