-- Drop old foreign keys before renaming columns/tables
ALTER TABLE "Folder" DROP CONSTRAINT IF EXISTS "Folder_userId_fkey";
ALTER TABLE "Folder" DROP CONSTRAINT IF EXISTS "Folder_folderId_fkey";
ALTER TABLE "File" DROP CONSTRAINT IF EXISTS "File_userId_fkey";

-- Rename tables to snake_case
ALTER TABLE "User" RENAME TO users;
ALTER TABLE "Folder" RENAME TO folders;
ALTER TABLE "File" RENAME TO files;

-- Rename columns to snake_case
ALTER TABLE users RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE users RENAME COLUMN "updatedAt" TO updated_at;
ALTER TABLE users RENAME COLUMN "deletedAt" TO deleted_at;

ALTER TABLE folders RENAME COLUMN "userId" TO user_id;
ALTER TABLE folders RENAME COLUMN "folderId" TO folder_id;
ALTER TABLE folders RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE folders RENAME COLUMN "updatedAt" TO updated_at;
ALTER TABLE folders RENAME COLUMN "deletedAt" TO deleted_at;

ALTER TABLE files RENAME COLUMN "userId" TO user_id;
ALTER TABLE files RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE files RENAME COLUMN "updatedAt" TO updated_at;
ALTER TABLE files RENAME COLUMN "deletedAt" TO deleted_at;

-- Add new file -> folder relation column
ALTER TABLE files ADD COLUMN folder_id UUID;

-- Rename constraints/indexes to match new table names
ALTER TABLE users RENAME CONSTRAINT "User_pkey" TO users_pkey;
ALTER TABLE folders RENAME CONSTRAINT "Folder_pkey" TO folders_pkey;
ALTER TABLE files RENAME CONSTRAINT "File_pkey" TO files_pkey;
ALTER INDEX "User_email_key" RENAME TO users_email_key;

-- Recreate foreign keys with snake_case names/columns
ALTER TABLE folders
  ADD CONSTRAINT folders_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE folders
  ADD CONSTRAINT folders_folder_id_fkey
  FOREIGN KEY (folder_id) REFERENCES folders(id)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE files
  ADD CONSTRAINT files_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE files
  ADD CONSTRAINT files_folder_id_fkey
  FOREIGN KEY (folder_id) REFERENCES folders(id)
  ON DELETE SET NULL ON UPDATE CASCADE;