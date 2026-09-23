-- CreateTable
CREATE TABLE "evaluation_questions" (
    "id" SERIAL NOT NULL,
    "cooperative_cycle_id" INTEGER NOT NULL,
    "evaluation_type" TEXT NOT NULL,
    "score_key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluation_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evaluation_questions_cooperative_cycle_id_evaluation_type_s_idx" ON "evaluation_questions"("cooperative_cycle_id", "evaluation_type", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_questions_cooperative_cycle_id_evaluation_type_s_key" ON "evaluation_questions"("cooperative_cycle_id", "evaluation_type", "score_key");

-- AddForeignKey
ALTER TABLE "evaluation_questions" ADD CONSTRAINT "evaluation_questions_cooperative_cycle_id_fkey" FOREIGN KEY ("cooperative_cycle_id") REFERENCES "cooperative_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
