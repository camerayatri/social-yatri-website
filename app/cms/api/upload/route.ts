import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getMaintainer } from "@/lib/cms/auth/dal";
import { UPLOAD_RULES } from "@/lib/cms/media";

/**
 * Hands the browser a short-lived token to upload one file straight to Blob.
 *
 * The proxy lets this path through without its cookie check, because Blob's
 * completion callback (when one is configured) arrives from Vercel's servers
 * with no cookie. So this handler authorizes itself: a token is only issued to
 * a signed-in maintainer, only for the allowed types, and only up to the size
 * limit for the kind of file asked for. Registering the file in the library is
 * a separate Server Action (`registerUpload`) that checks the stored file.
 */

type Payload = { kind?: string };

export async function POST(request: Request) {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const maintainer = await getMaintainer();
        if (!maintainer) throw new Error("Sign in again to upload.");
        let payload: Payload = {};
        try {
          payload = JSON.parse(clientPayload ?? "{}") as Payload;
        } catch {}
        const kind = payload.kind === "video" ? "video" : "image";
        if (!/^media\/[A-Za-z0-9._-]+$/.test(pathname)) throw new Error("Bad file name.");
        const rules = UPLOAD_RULES[kind];
        return {
          allowedContentTypes: [...rules.types],
          maximumSizeInBytes: rules.maxBytes,
          addRandomSuffix: true,
          validUntil: Date.now() + 60 * 60 * 1000,
          tokenPayload: JSON.stringify({ maintainer: maintainer.id, kind }),
        };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
