/**
 * Client-side unsigned Cloudinary upload.
 *
 * Uploads the file straight from the browser to Cloudinary using an unsigned
 * upload preset, then returns the `secure_url` to store in the DB. No secrets
 * touch the client. Degrades gracefully: if the cloud name / preset aren't
 * configured, `isCloudinaryConfigured()` is false and the UI falls back to a
 * plain image-URL input.
 */

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUD && PRESET);
}

export async function uploadToCloudinary(file: File): Promise<string> {
  if (!CLOUD || !PRESET) {
    throw new Error("Cloudinary is not configured");
  }
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", PRESET);
  form.append("folder", "abd-restaurant/menu");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`,
    { method: "POST", body: form },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed: ${text.slice(0, 120)}`);
  }
  const data = (await res.json()) as { secure_url: string };
  return data.secure_url;
}
