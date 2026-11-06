// Photos are made small on the phone before they are sent. Drawing them again also drops hidden details, such as where
// a photo was taken. The server still checks the type and size of whatever arrives.

async function encode(canvas: HTMLCanvasElement, name: string): Promise<File> {
  const blob = (type: string, q: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, q));
  let out = await blob("image/webp", 0.85);
  if (!out || out.type !== "image/webp") out = await blob("image/jpeg", 0.88); // Safari can't write WebP
  if (!out) throw new Error("encode");
  return new File([out], `${name}.${out.type === "image/webp" ? "webp" : "jpg"}`, { type: out.type });
}

/** A square 512 px photo. Portraits are cropped a little above the middle, where faces usually are. */
export async function squarePhoto(file: File): Promise<File> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  canvas.getContext("2d")!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) * 0.3, side, side, 0, 0, 512, 512);
  return encode(canvas, "photo");
}

/** A readable copy of a document no larger than 1600 px on its long side. Not cropped. */
export async function shrinkDoc(file: File): Promise<File> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return encode(canvas, "doc");
}

/** Puts the shrunk file back into the input, so a normal form post sends it. Returns a preview URL. */
export async function prepareInput(input: HTMLInputElement, shrink: (f: File) => Promise<File>): Promise<string | null> {
  const file = input.files?.[0];
  if (!file) return null;
  try {
    const small = await shrink(file);
    const dt = new DataTransfer();
    dt.items.add(small);
    input.files = dt.files;
    return URL.createObjectURL(small);
  } catch {
    return URL.createObjectURL(file);
  }
}
