-- CreateEnum
CREATE TYPE "Fuel" AS ENUM ('GASOLINE', 'ETHANOL', 'FLEX', 'DIESEL', 'CNG', 'ELECTRIC', 'HYBRID', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "brand" VARCHAR(100) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "year" INTEGER NOT NULL,
    "fuel" "Fuel" NOT NULL,
    "plate" VARCHAR(10),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platforms" (
    "id" VARCHAR(20) NOT NULL,
    "name" VARCHAR(30) NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" VARCHAR(30) NOT NULL,
    "name" VARCHAR(30) NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "earnings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "platform_id" VARCHAR(20) NOT NULL,
    "amount" DECIMAL(65,2) NOT NULL,
    "rides" INTEGER NOT NULL,
    "hours" DECIMAL(4,2) NOT NULL,
    "kilometers" DECIMAL(65,2) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "category_id" VARCHAR(30) NOT NULL,
    "amount" DECIMAL(65,2) NOT NULL,
    "description" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "refresh_token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_user_id_key" ON "vehicles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "platforms_name_key" ON "platforms"("name");

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_name_key" ON "expense_categories"("name");

-- CreateIndex
CREATE INDEX "earnings_user_date_created_id_idx" ON "earnings"("user_id", "date" DESC, "created_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "earnings_platform_id_idx" ON "earnings"("platform_id");

-- CreateIndex
CREATE INDEX "expenses_user_date_created_id_idx" ON "expenses"("user_id", "date" DESC, "created_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "expenses_category_id_idx" ON "expenses"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_refresh_token_hash_key" ON "auth_sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");

-- CreateIndex
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "earnings" ADD CONSTRAINT "earnings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "earnings" ADD CONSTRAINT "earnings_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "platforms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Domain checks not expressible in the Prisma schema.
ALTER TABLE "users"
    ADD CONSTRAINT "users_name_not_blank_check" CHECK (length(btrim("name")) >= 1),
    ADD CONSTRAINT "users_email_canonical_check" CHECK ("email" = lower(btrim("email")));

ALTER TABLE "vehicles"
    ADD CONSTRAINT "vehicles_brand_not_blank_check" CHECK (length(btrim("brand")) >= 1),
    ADD CONSTRAINT "vehicles_model_not_blank_check" CHECK (length(btrim("model")) >= 1),
    ADD CONSTRAINT "vehicles_year_min_check" CHECK ("year" >= 1900);

ALTER TABLE "earnings"
    ADD CONSTRAINT "earnings_amount_check" CHECK ("amount" > 0 AND "amount" <> 'NaN'::numeric),
    ADD CONSTRAINT "earnings_rides_check" CHECK ("rides" >= 0),
    ADD CONSTRAINT "earnings_hours_check" CHECK ("hours" >= 0 AND "hours" <= 24 AND "hours" <> 'NaN'::numeric),
    ADD CONSTRAINT "earnings_kilometers_check" CHECK ("kilometers" >= 0 AND "kilometers" <> 'NaN'::numeric);

ALTER TABLE "expenses"
    ADD CONSTRAINT "expenses_amount_check" CHECK ("amount" > 0 AND "amount" <> 'NaN'::numeric);

ALTER TABLE "auth_sessions"
    ADD CONSTRAINT "auth_sessions_expires_after_created_check" CHECK ("expires_at" > "created_at");

ALTER TABLE "password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_expires_after_created_check" CHECK ("expires_at" > "created_at");

-- Fixed V1 catalog data. IDs and ordering are part of the public contract.
INSERT INTO "platforms" ("id", "name", "sort_order") VALUES
    ('UBER', 'Uber', 1),
    ('NINETY_NINE', '99', 2),
    ('INDRIVE', 'inDrive', 3),
    ('PRIVATE', 'Particular', 4),
    ('OTHER', 'Outro', 5);

INSERT INTO "expense_categories" ("id", "name", "sort_order") VALUES
    ('FUEL', 'Combustível', 1),
    ('MAINTENANCE', 'Manutenção', 2),
    ('INSURANCE', 'Seguro', 3),
    ('WASH', 'Lavagem', 4),
    ('TOLL', 'Pedágio', 5),
    ('PARKING', 'Estacionamento', 6),
    ('FOOD', 'Alimentação', 7),
    ('FINANCING', 'Financiamento', 8),
    ('OTHER', 'Outros', 9);
