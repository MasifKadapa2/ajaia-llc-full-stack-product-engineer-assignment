export type Profile = {
  id: string;
  display_name: string;
  created_at: string;
  updated_at: string;
};

export type Document = {
  id: string;
  title: string;
  content: Record<string, unknown>;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

export type DocumentAccessRole = "owner" | "editor" | "viewer";

export type DocumentListItem = Document & {
  owner?: Pick<Profile, "id" | "display_name">;
  accessRole?: DocumentAccessRole;
  accessLabel?: string;
};
