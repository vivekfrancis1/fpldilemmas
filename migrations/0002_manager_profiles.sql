CREATE TABLE IF NOT EXISTS "manager_profiles" (
  "manager_id" integer PRIMARY KEY NOT NULL,
  "entry_name" varchar(150),
  "player_first_name" varchar(100),
  "player_last_name" varchar(100),
  "overall_rank" integer,
  "updated_at" timestamp DEFAULT now()
);
