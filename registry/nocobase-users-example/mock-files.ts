import type { NocoBaseFileRecord } from "@/extensions/nocobase-file-upload";

export const mockUserAvatar: NocoBaseFileRecord = {
  id: "mock-user-avatar",
  title: "Sample avatar",
  filename: "sample-avatar.jpg",
  extname: ".jpg",
  mimetype: "image/jpeg",
  url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=80",
  preview:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=320&q=80",
};

export const mockUserFiles: NocoBaseFileRecord[] = [
  {
    id: "mock-workspace-photo",
    title: "Workspace photo",
    filename: "workspace.jpg",
    extname: ".jpg",
    mimetype: "image/jpeg",
    url: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=80",
    preview:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=320&q=80",
  },
  {
    id: "mock-sample-pdf",
    title: "Sample PDF",
    filename: "sample.pdf",
    extname: ".pdf",
    mimetype: "application/pdf",
    size: 13264,
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  },
  {
    id: "mock-readme",
    title: "NocoBase README",
    filename: "README.md",
    extname: ".md",
    mimetype: "text/markdown",
    url: "https://raw.githubusercontent.com/nocobase/nocobase/main/README.md",
  },
  {
    id: "mock-flower-video",
    title: "Flower video",
    filename: "flower.mp4",
    extname: ".mp4",
    mimetype: "video/mp4",
    url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  },
];
