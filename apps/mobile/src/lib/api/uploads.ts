import * as DocumentPicker from "expo-document-picker";
import { supabase } from "../supabase";
import type { SyllabusUpload } from "../schema";

const MAX_BYTE_SIZE = 10 * 1024 * 1024; // 10 MB

export type PickResult =
  | { ok: true; uri: string; name: string; mimeType: string; size: number }
  | { ok: false; error: string };

export async function pickPdf(): Promise<PickResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/pdf",
    copyToCacheDirectory: true,
  });

  if (result.canceled) return { ok: false, error: "cancelled" };

  const asset = result.assets[0];
  if (!asset) return { ok: false, error: "No file selected" };

  if (asset.mimeType !== "application/pdf") {
    return { ok: false, error: "Only PDF files are supported" };
  }

  const size = asset.size ?? 0;
  if (size > MAX_BYTE_SIZE) {
    return { ok: false, error: "File must be under 10 MB" };
  }
  if (size === 0) {
    return { ok: false, error: "File appears to be empty" };
  }

  return {
    ok: true,
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType,
    size,
  };
}

export async function uploadSyllabus(
  courseId: string,
  file: { uri: string; name: string; mimeType: string; size: number }
): Promise<SyllabusUpload> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const ext = file.name.split(".").pop() ?? "pdf";
  const storagePath = `${user.id}/${courseId}/${Date.now()}.${ext}`;

  // Read file as ArrayBuffer — fetch().blob() silently produces 0 bytes for
  // file:// URIs on React Native; XHR with responseType='arraybuffer' is reliable.
  const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.responseType = "arraybuffer";
    xhr.onload = () => resolve(xhr.response as ArrayBuffer);
    xhr.onerror = () => reject(new Error("Failed to read local file"));
    xhr.open("GET", file.uri);
    xhr.send();
  });

  const { error: storageError } = await supabase.storage
    .from("syllabi")
    .upload(storagePath, arrayBuffer, { contentType: file.mimeType, upsert: false });

  if (storageError) throw new Error(storageError.message);

  // Insert the metadata row
  const { data, error: dbError } = await supabase
    .from("syllabus_uploads")
    .insert({
      user_id: user.id,
      course_id: courseId,
      storage_path: storagePath,
      mime_type: file.mimeType,
      byte_size: file.size,
      status: "pending",
    })
    .select()
    .single();

  if (dbError) {
    // Best-effort cleanup: remove the stored file if we fail to insert the row
    await supabase.storage.from("syllabi").remove([storagePath]);
    throw new Error(dbError.message);
  }

  return data as SyllabusUpload;
}

export async function getUploadsByCourse(courseId: string): Promise<SyllabusUpload[]> {
  const { data, error } = await supabase
    .from("syllabus_uploads")
    .select("*")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as SyllabusUpload[]) ?? [];
}

export async function deleteUpload(upload: SyllabusUpload): Promise<void> {
  // Delete storage object first, then the row (cascade would leave orphan objects)
  const { error: storageError } = await supabase.storage
    .from("syllabi")
    .remove([upload.storage_path]);

  // Continue even if storage delete fails (object may already be gone)
  if (storageError) {
    console.warn("Storage delete warning:", storageError.message);
  }

  const { error: dbError } = await supabase
    .from("syllabus_uploads")
    .delete()
    .eq("id", upload.id);

  if (dbError) throw new Error(dbError.message);
}
