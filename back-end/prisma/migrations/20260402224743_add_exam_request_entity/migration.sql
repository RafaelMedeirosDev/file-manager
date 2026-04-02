-- CreateTable
CREATE TABLE "exam_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "indication" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "exam_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ExamToExamRequest" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_ExamToExamRequest_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ExamToExamRequest_B_index" ON "_ExamToExamRequest"("B");

-- AddForeignKey
ALTER TABLE "exam_requests" ADD CONSTRAINT "exam_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExamToExamRequest" ADD CONSTRAINT "_ExamToExamRequest_A_fkey" FOREIGN KEY ("A") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExamToExamRequest" ADD CONSTRAINT "_ExamToExamRequest_B_fkey" FOREIGN KEY ("B") REFERENCES "exam_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
