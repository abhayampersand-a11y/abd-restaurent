"use client";

import * as React from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isCloudinaryConfigured, uploadToCloudinary } from "@/lib/cloudinary";

/**
 * Image field for menu items. Uploads to Cloudinary when configured, otherwise
 * accepts a pasted image URL. The current value is mirrored into a hidden input
 * named `imageUrl` so it flows through the surrounding <form> as FormData.
 */
export function ImageUpload({ defaultValue }: { defaultValue?: string | null }) {
  const [url, setUrl] = React.useState(defaultValue ?? "");
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const configured = isCloudinaryConfigured();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const secureUrl = await uploadToCloudinary(file);
      setUrl(secureUrl);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name="imageUrl" value={url} />
      <div className="flex items-center gap-3">
        <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
          {url ? (
            <>
              <Image
                src={url}
                alt="Preview"
                fill
                sizes="80px"
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => setUrl("")}
                className="absolute top-0.5 right-0.5 rounded-full bg-background/80 p-0.5 text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </>
          ) : (
            <ImagePlus className="size-6 text-muted-foreground" />
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2">
          {configured ? (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFile}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
              >
                {uploading ? (
                  <>
                    <Loader2 className="animate-spin" /> Uploading…
                  </>
                ) : (
                  <>
                    <ImagePlus /> Upload image
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                JPG/PNG, uploaded to Cloudinary.
              </p>
            </>
          ) : (
            <Input
              placeholder="Paste image URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
