export const SUPPORTED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
export type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number];

export function parseImageData(imageBase64: string): { mediaType: SupportedMediaType; data: string } | null {
  const dataUrlMatch = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(imageBase64);
  if (dataUrlMatch) {
    const mediaType = dataUrlMatch[1];
    if (!(SUPPORTED_MEDIA_TYPES as readonly string[]).includes(mediaType)) return null;
    return { mediaType: mediaType as SupportedMediaType, data: dataUrlMatch[2] };
  }

  return { mediaType: 'image/jpeg', data: imageBase64 };
}
