-- CreateEnum
CREATE TYPE "ExamCategory" AS ENUM ('THROMBOPHILIA', 'MICROBIOLOGY', 'ENDOCRINE_METABOLIC', 'IMMUNOLOGY', 'OBSTETRIC_MARKERS', 'IMAGING', 'BIOCHEMISTRY', 'HEMATOLOGY');

-- CreateTable
CREATE TABLE "exams" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "category" "ExamCategory" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exams_code_key" ON "exams"("code");
